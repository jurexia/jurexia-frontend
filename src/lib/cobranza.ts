/**
 * LA COBRANZA DE QUINCENA (29-oct-2026).
 *
 * LO MEDIDO ANTES DE ESCRIBIR ESTO. Rechazos del 15-sep al 29-oct: 300 intentos
 * de 91 clientes. El 60% fue «fondos insuficientes», dos de cada tres eran
 * tarjetas de DÉBITO y en tres de cada cuatro el banco aconsejó «intentar más
 * tarde». Casi siempre la tarjeta sirve; lo que falta es que llegue la nómina.
 *
 * Stripe reintenta a ciegas durante 14 días y luego cancela (medido: las 68
 * cancelaciones por impago caen a 14.0 días del inicio del periodo). En México
 * la nómina llega el 15 y el último día del mes, y esos reintentos no lo saben.
 * El 40% de todas las bajas es por pago rechazado.
 *
 * Aquí se añade, el día de nómina y el siguiente, UN intento más sobre cada
 * factura de renovación rechazada por algo pasajero, y dos correos: un
 * recordatorio y el último aviso antes de que Stripe cancele (ver
 * `@/lib/correo/cobranza`).
 *
 * LO QUE NO SE REINTENTA NUNCA: lo que el banco dio por definitivo (tarjeta
 * vencida, perdida, dada de baja, «no volver a intentar») ni lo que bloqueó el
 * antifraude. Reintentarlo no cobra, y las redes lo castigan: Visa prohíbe
 * repetir los rechazos de la categoría «el emisor nunca lo aprobará» y limita
 * los demás a 15 reintentos en 30 días. Por eso la lista es de lo que SÍ se
 * reintenta. Y el tope propio —3 intentos nuestros más los 8 de Stripe— queda
 * por debajo de ese límite.
 *
 * TODO SE ANOTA EN LA FACTURA DE STRIPE (`metadata.cobranza_*`): cuántos
 * reintentos van, el último día, y qué correos salieron. Un cron que corra dos
 * veces el mismo día no cobra ni escribe dos veces.
 */

import type Stripe from 'stripe';
import { Resend } from 'resend';
import { getStripe, getPlanIdFromPriceId, PLANS } from '@/lib/stripe';
import {
    correoDeAvisoFinal, correoDeRecordatorio, enviarCorreoDeCobranza, type DatosCobranza,
} from '@/lib/correo/cobranza';

/** Días que Stripe sigue reintentando antes de cancelar (Facturación →
 *  Recuperación de ingresos → Reintentos). Si se amplía allá, se cambia aquí. */
const DIAS_REINTENTO_STRIPE = Number(process.env.DIAS_REINTENTO_STRIPE || 14);
/** Reintentos propios por factura, como mucho. */
const MAX_REINTENTOS = 3;
/** El último aviso sale cuando faltan estos días o menos para el corte. */
const DIAS_AVISO_FINAL = 3;
/** Con un rechazo definitivo, el recordatorio espera estos días: el aviso de
 *  suspensión acaba de salir y dos correos seguidos no ayudan. */
const DIAS_RECORDATORIO_DEFINITIVO = 3;

const DIA = 86_400_000;
const HORA = 3_600_000;

/** Rechazos pasajeros: con fondos o con otro intento, entran. */
const REINTENTABLES = new Set([
    'insufficient_funds',
    'try_again_later',
    'processing_error',
    'issuer_not_available',
    'reenter_transaction',
    'card_velocity_exceeded',
    'withdrawal_count_limit_exceeded',
]);

/** Rechazos que no se repiten aunque el consejo diga «más tarde»: la tarjeta o
 *  la cuenta ya no existen para ese cargo (Visa los pone en la categoría «el
 *  emisor nunca lo aprobará»). Medido el 29-oct: de las renovaciones
 *  rechazadas por `invalid_account` desde el 24-sep no se cobró ninguna (0 de
 *  3), y en la mora de ese día había tres que llegaban con
 *  `advice_code: try_again_later`. */
const DEFINITIVOS = new Set([
    'invalid_account',
    'lost_card',
    'stolen_card',
    'pickup_card',
    'expired_card',
    'restricted_card',
    'incorrect_number',
    'invalid_number',
    'card_not_supported',
    'transaction_not_allowed',
    'previously_declined_do_not_retry',
    'fraudulent',
    'security_violation',
    'stop_payment_order',
    'revocation_of_authorization',
    'revocation_of_all_authorizations',
]);

/** ¿Vale la pena volver a intentar con la misma tarjeta? Se decide con el
 *  resultado del último cargo. Un motivo definitivo manda siempre; si no lo
 *  es, manda lo que aconseja el banco. */
export function sePuedeReintentar(outcome: Stripe.Charge.Outcome | null | undefined): boolean {
    if (!outcome) return false;
    if (outcome.type === 'blocked') return false;   // lo paró el antifraude, no el banco
    if (DEFINITIVOS.has(outcome.reason || '')) return false;
    if (outcome.advice_code === 'do_not_try_again' || outcome.advice_code === 'confirm_card_data') return false;
    if (outcome.advice_code === 'try_again_later') return true;
    return REINTENTABLES.has(outcome.reason || '');
}

// ── Fechas, siempre en la Ciudad de México ────────────────────────────────

export function fechaMexico(d = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
}

const masDias = (iso: string, n: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/** Los dos días de nómina de un mes: el 15 y el último. Si caen en fin de
 *  semana, el viernes anterior, que es cuando se adelanta el pago. */
export function diasDeNomina(anio: number, mes: number): string[] {
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return [15, ultimo].map((dia) => {
        const d = new Date(Date.UTC(anio, mes - 1, dia, 12));
        const semana = d.getUTCDay();
        if (semana === 6) d.setUTCDate(d.getUTCDate() - 1);
        if (semana === 0) d.setUTCDate(d.getUTCDate() - 2);
        return d.toISOString().slice(0, 10);
    });
}

/** ¿Hoy toca reintentar? El día de nómina y el siguiente: el depósito llega a
 *  veces de madrugada y a veces por la tarde, y hay quien mueve el dinero al
 *  otro día. Se mira también el mes anterior: su último día de nómina puede
 *  hacer que el 1 sea día de cobro. */
export function esDiaDeCobro(hoy: string): boolean {
    const [anio, mes] = hoy.split('-').map(Number);
    const nominas = [
        ...diasDeNomina(anio, mes),
        ...(mes === 1 ? diasDeNomina(anio - 1, 12) : diasDeNomina(anio, mes - 1)),
    ];
    return nominas.some((n) => n === hoy || masDias(n, 1) === hoy);
}

// ── Lo que dice Stripe de cada factura ────────────────────────────────────

/** El último cargo de la factura, con su veredicto del banco. */
async function ultimoCargo(stripe: Stripe, factura: Stripe.Invoice): Promise<Stripe.Charge | null> {
    const pagos = await stripe.invoicePayments.list({
        invoice: factura.id!, limit: 10, expand: ['data.payment.payment_intent'],
    });
    let ultimo: Stripe.Charge | null = null;
    for (const p of pagos.data) {
        const pi = p.payment?.payment_intent;
        if (!pi || typeof pi === 'string' || !pi.latest_charge) continue;
        const cargo = typeof pi.latest_charge === 'string'
            ? await stripe.charges.retrieve(pi.latest_charge)
            : pi.latest_charge;
        if (!ultimo || cargo.created > ultimo.created) ultimo = cargo;
    }
    return ultimo;
}

function nombreDelPlan(sub: Stripe.Subscription): string | null {
    const precio = sub.items?.data?.[0]?.price?.id;
    if (!precio) return null;
    const id = getPlanIdFromPriceId(precio);
    return id === 'gratuito' ? null : PLANS[id].name;
}

function codigoDelError(e: unknown): string {
    const err = e as { decline_code?: string; code?: string; message?: string };
    return err.decline_code || err.code || (err.message ? err.message.slice(0, 60) : 'error');
}

// ── El barrido ────────────────────────────────────────────────────────────

export interface ResultadoCobranza {
    ok: boolean;
    ensayo: boolean;
    hoy: string;
    diaDeCobro: boolean;
    revisadas: number;
    /** Reintentos que entraron. */
    cobradas: string[];
    /** Reintentos que el banco volvió a rechazar. */
    rechazadas: string[];
    recordatorios: string[];
    avisosFinales: string[];
    /** Centavos que entraron por los reintentos. */
    recuperado: number;
    errores: string[];
}

export async function cobranzaDelDia(
    { ensayo = false, hoy = fechaMexico(), ahora = Date.now() }: { ensayo?: boolean; hoy?: string; ahora?: number } = {},
    stripe: Stripe = getStripe(),
    enviar: typeof enviarCorreoDeCobranza = enviarCorreoDeCobranza,
): Promise<ResultadoCobranza> {
    const diaDeCobro = esDiaDeCobro(hoy);
    const r: ResultadoCobranza = {
        ok: true, ensayo, hoy, diaDeCobro, revisadas: 0,
        cobradas: [], rechazadas: [], recordatorios: [], avisosFinales: [], recuperado: 0, errores: [],
    };
    const marca = (s: string) => (ensayo ? `${s} (ensayo)` : s);

    for (const estado of ['past_due', 'unpaid'] as const) {
        for await (const sub of stripe.subscriptions.list({ status: estado, limit: 100 })) {
            // Quien ya pidió irse no recibe más cargos ni más correos de cobro.
            if (sub.cancel_at_period_end || sub.cancel_at) continue;

            const facturas = await stripe.invoices.list({ subscription: sub.id, status: 'open', limit: 20 });
            const abiertas = [...facturas.data].sort((a, b) => (a.created ?? 0) - (b.created ?? 0));

            for (const factura of abiertas) {
                const motivo = factura.billing_reason || '';
                if (!motivo.startsWith('subscription') || motivo === 'subscription_create') continue;
                if (!factura.amount_due || factura.amount_due <= 0) continue;
                const email = (factura.customer_email || String(sub.metadata?.userEmail || '')).toLowerCase().trim();
                if (!email) { r.errores.push(`${factura.id}: sin correo`); continue; }
                r.revisadas++;

                try {
                    await atenderFactura({ stripe, enviar, sub, factura, email, hoy, ahora, diaDeCobro, ensayo, r, marca });
                } catch (e) {
                    r.errores.push(`${email} (${factura.id}): ${e instanceof Error ? e.message : String(e)}`);
                }
            }
        }
    }

    r.ok = r.errores.length === 0;
    return r;
}

async function atenderFactura(x: {
    stripe: Stripe; enviar: typeof enviarCorreoDeCobranza; sub: Stripe.Subscription; factura: Stripe.Invoice;
    email: string; hoy: string; ahora: number; diaDeCobro: boolean; ensayo: boolean;
    r: ResultadoCobranza; marca: (s: string) => string;
}) {
    const { stripe, enviar, sub, factura, email, hoy, ahora, diaDeCobro, ensayo, r, marca } = x;
    const meta = factura.metadata || {};
    const nuevaMeta: Record<string, string> = {};
    const creada = (factura.created ?? Math.floor(ahora / 1000)) * 1000;
    const corte = new Date(creada + DIAS_REINTENTO_STRIPE * DIA);
    const faltan = (corte.getTime() - ahora) / DIA;
    if (faltan <= 0) return;   // Stripe ya debió cancelarla: nada que avisar

    const cargo = await ultimoCargo(stripe, factura);
    const reintentable = sePuedeReintentar(cargo?.outcome);
    let codigo = cargo?.outcome?.reason || cargo?.failure_code || null;
    let reintentoFallido = false;

    // ── 1. El reintento de quincena ─────────────────────────────────────
    const reintentos = Number(meta.cobranza_reintentos || 0);
    const hayHueco = !cargo || ahora - cargo.created * 1000 > 12 * HORA;   // no encima del último intento
    const stripeVaATiempo = factura.next_payment_attempt != null
        && factura.next_payment_attempt * 1000 - ahora < 3 * HORA;         // ni justo antes del suyo
    const seReintenta = diaDeCobro && reintentable && reintentos < MAX_REINTENTOS
        && meta.cobranza_ultimo_reintento !== hoy && (factura.attempt_count ?? 0) < 12
        && hayHueco && !stripeVaATiempo;
    if (seReintenta) {
        if (ensayo) {
            r.cobradas.push(marca(`${email}: se reintentaría ${factura.id}`));
        } else {
            nuevaMeta.cobranza_reintentos = String(reintentos + 1);
            nuevaMeta.cobranza_ultimo_reintento = hoy;
            try {
                const pagada = await stripe.invoices.pay(factura.id!);
                if (pagada.status === 'paid') {
                    nuevaMeta.cobranza_resultado = 'pagada';
                    r.cobradas.push(`${email}: ${factura.id}`);
                    r.recuperado += pagada.amount_paid ?? factura.amount_due;
                    // El webhook `invoice.payment_succeeded` levanta la suspensión
                    // y manda el recibo. Aquí ya no hay nada que avisar.
                    await stripe.invoices.update(factura.id!, { metadata: nuevaMeta });
                    return;
                }
                nuevaMeta.cobranza_resultado = pagada.status || 'sin_pagar';
                reintentoFallido = true;
            } catch (e) {
                codigo = codigoDelError(e);
                nuevaMeta.cobranza_resultado = codigo;
                reintentoFallido = true;
            }
            r.rechazadas.push(`${email}: ${factura.id} (${nuevaMeta.cobranza_resultado})`);
        }
    }

    // ── 2. Los correos: uno de cada uno por factura ─────────────────────
    const datos: DatosCobranza = {
        email,
        nombre: factura.customer_name,
        centavos: factura.amount_due,
        url: factura.hosted_invoice_url || 'https://www.iurexia.com/chat',
        corte,
        plan: nombreDelPlan(sub),
    };
    const diasDesdeRechazo = (ahora - creada) / DIA;

    // Con menos de un día, el «último día para pagar» ya pasó: no se avisa.
    if (faltan > 1 && faltan <= DIAS_AVISO_FINAL && !meta.cobranza_aviso_final) {
        // El último aviso manda sobre el recordatorio: si los dos tocan el mismo
        // día, sale sólo éste, que trae la fecha.
        if (ensayo) r.avisosFinales.push(marca(email));
        else {
            await enviar(email, correoDeAvisoFinal(datos));
            nuevaMeta.cobranza_aviso_final = hoy;
            r.avisosFinales.push(email);
        }
    } else if (faltan > DIAS_AVISO_FINAL && !meta.cobranza_recordatorio) {
        // Con fondos, el recordatorio va tras el reintento de quincena que no
        // pasó. Con un rechazo definitivo no hay reintento que esperar.
        const conFondos = reintentoFallido || (ensayo && seReintenta);   // en ensayo se supone que falla
        const definitivo = !reintentable && diasDesdeRechazo >= DIAS_RECORDATORIO_DEFINITIVO;
        if (conFondos || definitivo) {
            if (ensayo) r.recordatorios.push(marca(`${email} (${conFondos ? 'tras reintento' : 'cambiar tarjeta'})`));
            else {
                await enviar(email, correoDeRecordatorio({ ...datos, reintentado: conFondos, motivo: codigo }));
                nuevaMeta.cobranza_recordatorio = hoy;
                r.recordatorios.push(`${email} (${conFondos ? 'tras reintento' : 'cambiar tarjeta'})`);
            }
        }
    }

    if (!ensayo && Object.keys(nuevaMeta).length) {
        await stripe.invoices.update(factura.id!, { metadata: nuevaMeta });
    }
}

/** El parte a soporte@ de un día con movimiento: cuánto entró en quincena y a
 *  quién se le escribió. Nunca rompe el barrido. */
export async function avisarParteDeCobranza(r: ResultadoCobranza) {
    const clave = process.env.RESEND_API_KEY;
    const huboAlgo = r.cobradas.length + r.rechazadas.length + r.recordatorios.length + r.avisosFinales.length > 0;
    if (!clave || r.ensayo || !huboAlgo) return;
    const pesos = (r.recuperado / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const lista = (titulo: string, xs: string[]) => (xs.length
        ? `<p style="margin:14px 0 4px"><strong>${titulo} (${xs.length})</strong></p><ul style="margin:0">${xs.map((x) => `<li>${x.replace(/</g, '&lt;')}</li>`).join('')}</ul>`
        : '');
    try {
        await new Resend(clave).emails.send({
            from: process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>',
            to: 'soporte@iurexia.com',
            subject: `[Soporte] Cobranza ${r.hoy}: ${r.cobradas.length} cobradas (${pesos}), ${r.rechazadas.length} rechazadas`,
            html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:14px;color:#1a1a1a">
<p>Barrido de cobranza del ${r.hoy}${r.diaDeCobro ? ' (día de quincena: hubo reintentos)' : ''}. Facturas revisadas: ${r.revisadas}.</p>
${lista('Reintentos cobrados', r.cobradas)}${lista('Reintentos rechazados', r.rechazadas)}${lista('Recordatorios enviados', r.recordatorios)}${lista('Últimos avisos enviados', r.avisosFinales)}${lista('Errores', r.errores)}
</div>`,
        });
    } catch (e) {
        console.error('⚠️ No salió el parte de cobranza:', e);
    }
}

