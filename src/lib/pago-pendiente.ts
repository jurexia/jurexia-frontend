import { createClient } from '@supabase/supabase-js';
import { getStripe, getPlanIdFromPriceId, PLANS } from '@/lib/stripe';
import { leerBajas } from '@/lib/correo/enviar';
import { esPrueba } from '@/lib/correo/segmentos';
import { correoDePagoPendiente, enviarPagoPendiente } from '@/lib/correo/pago-pendiente';

/**
 * Quién recibe el recordatorio de pago pendiente (9-nov-2026).
 *
 * Corre cada hora. Toma las sesiones de Checkout que siguen ABIERTAS, creadas
 * hace entre una y 23 horas (Stripe las cierra a las 24), y le escribe a quien
 * las abrió, salvo que:
 *   · ya pagó por otra sesión en las últimas 26 horas, o ya tiene ese plan;
 *   · se dio de baja de los correos, o es una cuenta de prueba;
 *   · ya recibió este recordatorio este mes (uno por persona y por mes).
 *
 * Sólo se envía de 8:00 a 21:59 de la Ciudad de México. Lo que se abre de
 * noche espera a las 8:00, con el enlace todavía vigente.
 *
 * El turno se aparta ANTES de enviar con una fila en `correo_envios`: su
 * índice único (email, campaña) impide que dos corridas le escriban dos
 * veces. Si Resend falla, la fila pasa a «fallido» y la siguiente hora lo
 * vuelve a intentar.
 */
const HORA_INICIO = 8;
const HORA_FIN = 22;
const ESPERA_MIN = 60 * 60;
const VENTANA_MAX = 23 * 60 * 60;

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

function horaCDMX(d: Date): number {
    return Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City', hour: 'numeric', hourCycle: 'h23',
    }).format(d));
}

function campaniaDelMes(d: Date): string {
    const mes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit',
    }).format(d);
    return `pago_pendiente_${mes}`;
}

function precioEnLetra(planId: keyof typeof PLANS): string {
    const plan = PLANS[planId] as { price: number; interval?: string };
    const monto = `$${plan.price.toLocaleString('es-MX')} MXN`;
    return plan.interval === 'year' ? `${monto} al año` : `${monto} al mes`;
}

function nombrePila(nombre: string | null | undefined, correo: string): string {
    const limpio = (nombre ?? '').trim();
    const pila = limpio ? limpio.split(/\s+/)[0] : correo.split('@')[0];
    return pila.charAt(0).toUpperCase() + pila.slice(1).toLowerCase();
}

export interface ResultadoPagoPendiente {
    ok: boolean;
    ensayo: boolean;
    fuera_de_horario: boolean;
    abiertas: number;
    enviados: number;
    omitidos: Record<string, number>;
    errores: string[];
    /** Sin correos: plan y minutos desde que se abrió el pago. */
    detalle: { plan: string; minutos: number; resultado: string }[];
}

export async function recordarPagosPendientes({ ensayo = false, ahora = new Date() } = {}): Promise<ResultadoPagoPendiente> {
    const r: ResultadoPagoPendiente = {
        ok: true, ensayo, fuera_de_horario: false, abiertas: 0, enviados: 0, omitidos: {}, errores: [], detalle: [],
    };
    const omitir = (motivo: string) => { r.omitidos[motivo] = (r.omitidos[motivo] ?? 0) + 1; };

    const hora = horaCDMX(ahora);
    if (!ensayo && (hora < HORA_INICIO || hora >= HORA_FIN)) {
        r.fuera_de_horario = true;
        return r;
    }

    const stripe = getStripe();
    const t = Math.floor(ahora.getTime() / 1000);

    // Quién ya pagó por cualquier sesión en las últimas 26 horas.
    const pagaron = new Set<string>();
    for await (const s of stripe.checkout.sessions.list({ status: 'complete', created: { gte: t - 26 * 3600 }, limit: 100 })) {
        const e = (s.metadata?.userEmail || s.customer_details?.email || s.customer_email || '').toLowerCase();
        if (e) pagaron.add(e);
    }

    const bajas = await leerBajas();
    const db = admin();
    const campania = campaniaDelMes(ahora);
    const vistos = new Set<string>();

    for await (const s of stripe.checkout.sessions.list({
        status: 'open', created: { gte: t - VENTANA_MAX, lte: t - ESPERA_MIN }, limit: 100,
    })) {
        r.abiertas++;
        const minutos = Math.round((t - s.created) / 60);
        const email = (s.metadata?.userEmail || s.customer_email || s.customer_details?.email || '').toLowerCase();
        if (!email || !s.url || s.mode !== 'subscription') { omitir('sin_correo_o_enlace'); continue; }
        if (vistos.has(email)) { omitir('otra_sesion_misma_persona'); continue; }
        vistos.add(email);
        if (pagaron.has(email)) { omitir('ya_pago'); continue; }
        if (bajas.has(email)) { omitir('dado_de_baja'); continue; }
        if (esPrueba(email)) { omitir('cuenta_de_prueba'); continue; }

        let planId: keyof typeof PLANS = 'gratuito';
        try {
            const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 1 });
            const precio = items.data[0]?.price?.id;
            if (precio) planId = getPlanIdFromPriceId(precio);
        } catch (e) {
            r.errores.push(`partidas de ${s.id}: ${e instanceof Error ? e.message : e}`);
        }
        if (planId === 'gratuito' || !PLANS[planId]) { omitir('plan_desconocido'); continue; }
        const plan = PLANS[planId].name;

        const { data: perfil } = await db
            .from('user_profiles')
            .select('id, full_name, tratamiento, subscription_type')
            .eq('email', email)
            .limit(1)
            .maybeSingle();
        if (!perfil) { omitir('sin_perfil'); continue; }
        if (perfil.subscription_type === planId) { omitir('ya_tiene_el_plan'); continue; }

        if (ensayo) {
            r.detalle.push({ plan, minutos, resultado: 'se_enviaria' });
            continue;
        }

        // Apartar el turno: el índice único deja pasar una sola fila
        // «enviado» por persona y campaña del mes.
        const { data: fila, error: eTurno } = await db
            .from('correo_envios')
            .insert({ usuario_id: perfil.id, email, campania, estado: 'enviado' })
            .select('id')
            .single();
        if (eTurno || !fila) {
            if (eTurno?.code === '23505') { omitir('ya_recordado_este_mes'); continue; }
            r.errores.push(`turno: ${eTurno?.message ?? 'sin fila'}`);
            continue;
        }

        try {
            const correo = correoDePagoPendiente({
                email,
                nombre: nombrePila(perfil.full_name, email),
                tratamiento: perfil.tratamiento,
                plan,
                // Si la sesión ya trae descuento (Buen Fin, por ejemplo), se dice
                // lo que de verdad pagaría, no el precio de lista.
                precio: (s.total_details?.amount_discount ?? 0) > 0 && s.amount_total != null
                    ? `$${(s.amount_total / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN en su primer pago, con su descuento`
                    : precioEnLetra(planId),
                url: s.url,
                vence: new Date(s.expires_at * 1000),
            });
            const id = await enviarPagoPendiente(email, correo);
            await db.from('correo_envios').update({ resend_id: id }).eq('id', fila.id);
            r.enviados++;
            r.detalle.push({ plan, minutos, resultado: 'enviado' });
        } catch (e) {
            await db.from('correo_envios').update({ estado: 'fallido' }).eq('id', fila.id);
            r.errores.push(`envío: ${e instanceof Error ? e.message : e}`);
        }
    }

    r.ok = r.errores.length === 0;
    return r;
}
