import { Resend } from 'resend';
import type Stripe from 'stripe';
import { boton, envolver, esc, fuerte, parrafo, rotulo, SITIO } from './plantilla';

/**
 * EL AVISO DE SUSPENSIÓN (31-ago-2026; al primer rechazo desde el 28-sep-2026).
 *
 * Lo que no puede pasar es que el cliente descubra por su cuenta que ya no
 * puede entrar: así se pierde a alguien que sólo tenía la tarjeta vencida.
 *
 * El botón lleva a la factura alojada de Stripe, que se paga sin iniciar
 * sesión y sin que nosotros toquemos una tarjeta. Pagar ahí dispara
 * `invoice.payment_succeeded`, y ese webhook levanta la suspensión solo. Antes
 * de mandarlo, la suscripción queda con `save_default_payment_method`, así
 * que la tarjeta con la que pague ahí se queda para los cobros siguientes.
 *
 * Sale UNA vez por suspensión: quien lo llama sólo lo hace cuando la cuenta
 * acaba de pasar a suspendida, no en cada reintento de Stripe.
 */
export async function avisarSuspension(email: string, invoice: Stripe.Invoice) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) {
        console.warn('⚠️ RESEND_API_KEY sin configurar — no sale el aviso de suspensión');
        return;
    }

    const { asunto, html } = correoDeSuspension(invoice);
    const { error } = await new Resend(clave).emails.send({
        from: 'Equipo de Desarrollo de Iurexia <soporte@iurexia.com>',
        replyTo: 'soporte@iurexia.com',
        to: email,
        subject: asunto,
        html,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    console.log(`📧 Aviso de suspensión enviado a ${email}`);
}

/** El correo armado, sin enviarlo: así se puede revisar tal como saldrá. */
export function correoDeSuspension(invoice: Pick<Stripe.Invoice, 'hosted_invoice_url' | 'amount_due'>) {
    const url = invoice.hosted_invoice_url || `${SITIO}/chat`;
    const monto = ((invoice.amount_due ?? 0) / 100)
        .toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

    const cuerpo = [
        rotulo('Su cuenta está suspendida'),
        parrafo(`Le escribimos porque su banco ${fuerte('rechazó el cobro de su mensualidad')} de `
            + `${esc(monto)} MXN. Suele deberse a una tarjeta vencida, a un límite o a fondos `
            + 'insuficientes en ese momento.'),
        parrafo(`Mientras el pago no se complete, ${fuerte('su cuenta queda suspendida')}: no permite `
            + `consultar ni usar las herramientas de la plataforma. ${fuerte('No ha perdido nada')}: su `
            + 'plan, sus conversaciones, sus carpetas y sus documentos siguen intactos.'),
        boton('Pagar y reactivar ahora', url),
        parrafo('Puede pagar ahí mismo con otra tarjeta, sin iniciar sesión. También puede entrar a '
            + 'Iurexia y actualizar su método de pago desde la pantalla de su cuenta. En cuanto el pago '
            + `se confirme, ${fuerte('su acceso vuelve de inmediato')}, sin que tenga que avisarnos.`,
        '16px 0 20px 0'),
        parrafo('Si esto es un error, o si prefiere cancelar su suscripción, respóndanos a este correo: '
            + 'lo revisa una persona.'),
        `<p style="margin:0;">Atentamente,<br>${fuerte('Equipo de Desarrollo de Iurexia')}</p>`,
    ].join('\n');

    return {
        asunto: 'Su cuenta de Iurexia está suspendida: no pudimos cobrar su mensualidad',
        html: envolver({
            cuerpo,
            pie: 'Este aviso se envía una sola vez, cuando la cuenta se suspende por un cobro rechazado.',
        }),
    };
}
