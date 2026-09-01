/**
 * El barrido diario de impagos: suspende a los 14 días y reactiva al pagar.
 *
 * POR QUÉ NO BASTA EL WEBHOOK (31-ago-2026)
 * -----------------------------------------
 * `invoice.payment_failed` sólo llega mientras Stripe reintenta. Cuando agota
 * su calendario deja de emitir eventos y la factura se queda ahí, abierta, para
 * siempre — hay 38 así, de suscripciones ya canceladas, por $8,914. Si el corte
 * dependiera sólo del webhook, quien deje de pagar justo cuando Stripe se rinde
 * no se suspende nunca.
 *
 * El barrido no depende de que llegue ningún evento: pregunta el estado y
 * decide. Es idempotente —suspender a un suspendido no hace nada— así que
 * puede correr todos los días sin miedo.
 *
 * LAS DOS DIRECCIONES, y las dos importan:
 *   · suspender al que lleva 14 días sin pagar, y
 *   · REACTIVAR al que ya pagó. Esto último es lo que evita el caso
 *     imperdonable: un cliente que pagó y sigue sin poder entrar porque un
 *     webhook se perdió.
 */

import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { suspenderPorImpago, levantarSuspension, DIAS_HASTA_SUSPENDER } from '@/lib/supabase-admin';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
}

export interface ResultadoBarrido {
    ok: boolean;
    revisadas: number;
    suspendidos: string[];
    reactivados: string[];
    /** Morosos que aún no llegan al umbral: se miran, no se tocan. */
    en_gracia: { email: string; dias: number }[];
    errores: string[];
}

function correoDe(sub: Stripe.Subscription): string {
    return String(sub.metadata?.userEmail || '').toLowerCase().trim();
}

/** Días desde la factura abierta más antigua de esa suscripción. -1 si no hay. */
async function diasDeImpago(stripe: Stripe, subId: string): Promise<number> {
    const facturas = await stripe.invoices.list({ subscription: subId, status: 'open', limit: 20 });
    if (!facturas.data.length) return -1;
    const masVieja = Math.min(...facturas.data.map(i => i.created ?? Math.floor(Date.now() / 1000)));
    return Math.floor((Date.now() / 1000 - masVieja) / 86400);
}

export async function revisarMorosos({ ensayo = false } = {}): Promise<ResultadoBarrido> {
    const stripe = getStripe();
    const r: ResultadoBarrido = {
        ok: true, revisadas: 0, suspendidos: [], reactivados: [], en_gracia: [], errores: [],
    };

    // ── 1. Los que deben: ¿ya pasaron los 14 días? ───────────────────────
    for (const estado of ['past_due', 'unpaid'] as const) {
        for await (const sub of stripe.subscriptions.list({ status: estado, limit: 100 })) {
            r.revisadas++;
            const email = correoDe(sub);
            if (!email) {
                r.errores.push(`${sub.id}: sin userEmail en metadata`);
                continue;
            }
            try {
                const dias = await diasDeImpago(stripe, sub.id);
                if (dias < 0) continue;                       // sin factura abierta: nada que cobrar
                if (dias < DIAS_HASTA_SUSPENDER) {
                    r.en_gracia.push({ email, dias });
                    continue;
                }
                if (ensayo) { r.suspendidos.push(`${email} (ensayo, ${dias} d)`); continue; }
                if (await suspenderPorImpago(email, `${dias} días de impago`)) {
                    r.suspendidos.push(`${email} (${dias} d)`);
                }
            } catch (e) {
                r.errores.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }

    // ── 2. Los suspendidos que YA pagaron ────────────────────────────────
    // Se mira al revés, desde nuestra tabla: si alguien está suspendido y su
    // suscripción vuelve a estar viva, se le abre sin esperar a nada. Un
    // cliente que pagó y sigue fuera es peor que un moroso dentro.
    const { data: suspendidos, error } = await admin()
        .from('user_profiles')
        .select('email, stripe_subscription_id, stripe_customer_id')
        .not('suspendido_at', 'is', null);

    if (error) {
        r.errores.push(`Supabase: ${error.message}`);
        r.ok = false;
        return r;
    }

    for (const u of suspendidos ?? []) {
        const correo = (u.email || '').toLowerCase().trim();
        try {
            if (!u.stripe_subscription_id) {
                // Sin suscripción que consultar NO significa sin deuda. Aquí
                // caen dos poblaciones muy distintas y confundirlas costaba
                // caro: el que nunca debió nada, y el que fue degradado por la
                // lógica vieja —que ponía `stripe_subscription_id` a null— o
                // canceló dejando facturas abiertas.
                //
                // Levantar la suspensión a ciegas, como se hacía, deshacía al
                // día siguiente cualquier suspensión de este segundo grupo: el
                // barrido corre a las 08:00 y los devolvía a la calle sin que
                // hubieran pagado un peso. La regla es que sólo se sale
                // pagando, así que aquí se pregunta por el adeudo, no por la
                // suscripción.
                if (!u.stripe_customer_id) {
                    if (!ensayo && await levantarSuspension(correo)) r.reactivados.push(`${correo} (sin cliente en Stripe)`);
                    continue;
                }
                const abiertas = await stripe.invoices.list({
                    customer: u.stripe_customer_id, status: 'open', limit: 1,
                });
                if (abiertas.data.length > 0) continue;   // debe: se queda fuera
                if (ensayo) { r.reactivados.push(`${correo} (ensayo, sin adeudo)`); continue; }
                if (await levantarSuspension(correo)) r.reactivados.push(`${correo} (sin adeudo)`);
                continue;
            }
            const sub = await stripe.subscriptions.retrieve(u.stripe_subscription_id);
            const alDia = sub.status === 'active' || sub.status === 'trialing';
            if (alDia) {
                if (ensayo) { r.reactivados.push(`${correo} (ensayo)`); continue; }
                if (await levantarSuspension(correo)) r.reactivados.push(correo);
            }
        } catch (e) {
            // Si la suscripción ya no existe en Stripe, el webhook de borrado
            // se encarga de degradar. Aquí no se decide nada a ciegas.
            r.errores.push(`${correo}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    r.ok = r.errores.length === 0;
    return r;
}
