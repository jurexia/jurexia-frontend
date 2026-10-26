/**
 * LA FACTURA VIEJA DE UNA SUSCRIPCIÓN YA CANCELADA (26-oct-2026).
 *
 * Cuando una renovación no se cobra, Stripe reintenta y, al agotar los
 * intentos, CANCELA la suscripción (`cancellation_details.reason =
 * payment_failed`). La factura del mes queda abierta, y nuestro propio muro
 * de cobro manda a quien la debe a pagarla en la página de Stripe
 * (`salidaDelMuro`, en `cobro-pendiente.ts`).
 *
 * Pagar esa factura NO revive la suscripción: Stripe cobra, pero no hay
 * suscripción viva, y el webhook sólo levantaba la suspensión. La cuenta se
 * quedaba en gratuito con el dinero cobrado. Pasó dos veces seguidas:
 * consultoriajuridica007 (pagó el 24-oct) y stevesantos (pagó el 25-oct).
 *
 * Aquí se cierra el círculo: si entra el pago de una factura cuya suscripción
 * Stripe canceló por falta de pago, se crea una suscripción nueva del MISMO
 * precio, con la tarjeta con la que acaba de pagar, y su primer cargo cae un
 * periodo después del pago. El mes que pagó es el mes que usa; no se le cobra
 * dos veces. El alta dispara `customer.subscription.created`, que pone el plan
 * en su cuenta como cualquier contratación.
 *
 * Lo que NO hace: revivir una suscripción que la persona canceló por su cuenta.
 * Quien canceló y luego salda una deuda vieja puede no querer volver a pagar
 * cada mes; ese caso se avisa a soporte y lo decide una persona.
 */

import type Stripe from 'stripe';
import { suscripcionDeLaFactura } from '@/lib/cobro-pendiente';
import { getPlanIdFromPriceId } from '@/lib/stripe';

/** Las suscripciones que cuentan como «ya tiene una»: con cualquiera de éstas
 *  no se crea otra, porque le cobraríamos doble. */
const VIVAS: ReadonlyArray<Stripe.Subscription.Status> = [
    'active', 'trialing', 'past_due', 'unpaid', 'incomplete',
];

export type Reactivacion =
    | { resultado: 'no_aplica' }
    | { resultado: 'ya_tiene'; suscripcion: string }
    | { resultado: 'revisar'; motivo: string; suscripcionVieja: string }
    | { resultado: 'reactivada'; suscripcion: Stripe.Subscription; suscripcionVieja: string; primerCargo: Date };

/** `desde` más `n` intervalos de un precio recurrente, en UTC. Mismo día del
 *  mes y misma hora: es lo que Stripe usa como ancla de facturación. Un pago
 *  del 31 de enero cae el 28 de febrero, no el 3 de marzo (que es lo que haría
 *  `setUTCMonth` solo, desbordando los días que le sobran al mes). */
export function sumarIntervalo(
    desde: Date,
    intervalo: Stripe.Price.Recurring.Interval,
    n: number,
): Date {
    const d = new Date(desde.getTime());
    if (intervalo === 'month' || intervalo === 'year') {
        const meses = intervalo === 'year' ? 12 * n : n;
        const dia = d.getUTCDate();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + meses);
        const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        d.setUTCDate(Math.min(dia, ultimo));
    } else if (intervalo === 'week') d.setUTCDate(d.getUTCDate() + 7 * n);
    else d.setUTCDate(d.getUTCDate() + n);
    return d;
}

function idDe(ref: string | { id: string } | null | undefined): string | null {
    if (!ref) return null;
    return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Si `invoice` acaba de pagarse y su suscripción está cancelada por falta de
 * pago, crea la suscripción nueva. Es idempotente por factura: un reintento
 * del webhook no crea una segunda.
 */
export async function reactivarSiPagoFacturaVieja(
    stripe: Stripe,
    invoice: Stripe.Invoice,
    email: string,
): Promise<Reactivacion> {
    const subId = suscripcionDeLaFactura(invoice);
    if (!subId) return { resultado: 'no_aplica' };

    const vieja = await stripe.subscriptions.retrieve(subId);
    if (vieja.status !== 'canceled') return { resultado: 'no_aplica' };

    const motivo = vieja.cancellation_details?.reason || 'sin motivo';
    if (motivo !== 'payment_failed') {
        return { resultado: 'revisar', motivo: `la suscripción se canceló por «${motivo}», no por falta de pago`, suscripcionVieja: subId };
    }

    const customerId = idDe(invoice.customer as string | { id: string } | null)
        || idDe(vieja.customer as string | { id: string });
    if (!customerId) return { resultado: 'revisar', motivo: 'la factura no trae cliente', suscripcionVieja: subId };

    const todas = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const viva = todas.data.find((s) => s.id !== subId && VIVAS.includes(s.status));
    if (viva) return { resultado: 'ya_tiene', suscripcion: viva.id };

    const item = vieja.items.data[0];
    const precio = item?.price;
    const recurrente = precio?.recurring;
    if (!precio || !recurrente) {
        return { resultado: 'revisar', motivo: 'la suscripción vieja no tiene un precio recurrente', suscripcionVieja: subId };
    }
    // Un precio viejo que ya no corresponde a ningún plan vigente haría que el
    // webhook escribiera «gratuito»: el mismo daño que se quiere evitar.
    if (getPlanIdFromPriceId(precio.id) === 'gratuito') {
        return { resultado: 'revisar', motivo: `el precio ${precio.id} no corresponde a ningún plan vigente`, suscripcionVieja: subId };
    }

    // El periodo que pagó empieza el día que pagó, no el día de la factura:
    // estuvo sin servicio desde el rechazo hasta hoy.
    const pagadaEn = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date();
    let primerCargo = sumarIntervalo(pagadaEn, recurrente.interval, recurrente.interval_count || 1);
    // Por si el aviso llega muy tarde (un reenvío días después): el ancla
    // tiene que quedar en el futuro o Stripe rechaza el alta.
    const ahora = Date.now();
    if (primerCargo.getTime() < ahora + 60 * 60 * 1000) {
        primerCargo = sumarIntervalo(new Date(ahora), recurrente.interval, recurrente.interval_count || 1);
    }

    // La tarjeta con la que acaba de pagar. Al pagar la factura alojada, Stripe
    // la deja en la suscripción vieja (`save_default_payment_method:
    // on_subscription`); si no, la predeterminada del cliente.
    let tarjeta = idDe(vieja.default_payment_method as string | { id: string } | null);
    if (!tarjeta) {
        const cliente = await stripe.customers.retrieve(customerId);
        if (!('deleted' in cliente && cliente.deleted)) {
            tarjeta = idDe((cliente as Stripe.Customer).invoice_settings?.default_payment_method as string | { id: string } | null);
        }
    }

    const nueva = await stripe.subscriptions.create(
        {
            customer: customerId,
            items: [{ price: precio.id, quantity: item.quantity || 1 }],
            ...(tarjeta ? { default_payment_method: tarjeta } : {}),
            billing_cycle_anchor: Math.floor(primerCargo.getTime() / 1000),
            proration_behavior: 'none',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            metadata: {
                userEmail: email,
                reactivada_de: subId,
                factura_pagada: invoice.id || '',
                motivo: 'pago de la factura de una suscripción cancelada por falta de pago',
            },
        },
        { idempotencyKey: `reactivar-factura-vieja-${invoice.id}` },
    );

    return { resultado: 'reactivada', suscripcion: nueva, suscripcionVieja: subId, primerCargo };
}
