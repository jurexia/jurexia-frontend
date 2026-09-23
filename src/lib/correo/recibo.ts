import { Resend } from 'resend';
import type Stripe from 'stripe';
import { caja, envolver, esc, fuerte, nombrePila, parrafo, rotulo, SITIO } from './plantilla';

/**
 * EL RECIBO DEL COBRO, Y CÓMO SE VERÁ EN SU BANCO (23-sep-2026).
 *
 * POR QUÉ EXISTE. El Lic. Sevilla dejó de pagar por esto, con sus palabras:
 * «al revisar el estado de cuenta no se reconoció el cargo ya que apareció
 * como STR*AGREGADOR AMEALCO DE BO y no había evidencia de que fuera de este
 * sitio».
 *
 * Y lo primero que hay que decir es que Stripe SÍ mandó el nombre correcto: se
 * comprobaron sus cinco cargos, incluido el de agosto que sí pagó, y los cinco
 * viajaron con `IUREXIAPAGOSUSCR`. Lo que imprimió su banco fue otra cosa —el
 * nombre del agregador y la ciudad del titular— y eso no lo decide el comercio.
 * Configurar el descriptor otra vez no lo arregla: ya está configurado.
 *
 * Lo que sí está en nuestra mano es que el cargo no le llegue por sorpresa. Por
 * eso este correo sale en cada cobro y dice, con todas sus letras, cómo puede
 * aparecer en el estado de cuenta. Un cliente que reconoce el cargo no lo
 * desconoce ante su banco: cada contracargo cuesta 149 del cobro MÁS 174 de
 * comisión, y de las cinco disputas que hemos tenido, cinco se han perdido.
 */

/** Lo que Stripe manda al banco. Vive en la cuenta (`settings.payments`). */
export const DESCRIPTOR = 'IUREXIAPAGOSUSCR';

const PESOS = (centavos: number) =>
    (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const FECHA = (segundos: number) =>
    new Date(segundos * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export function correoDeRecibo(datos: {
    email: string;
    nombre?: string | null;
    centavos: number;
    fecha: number;
    concepto?: string | null;
    periodoInicio?: number | null;
    periodoFin?: number | null;
    urlFactura?: string | null;
}) {
    const nombre = nombrePila(datos.nombre, datos.email);
    const periodo = datos.periodoInicio && datos.periodoFin
        ? `del ${FECHA(datos.periodoInicio)} al ${FECHA(datos.periodoFin)}`
        : '';

    const cuerpo =
        parrafo(`Apreciable Lic. ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            `Le confirmamos el cobro de su suscripción: ${fuerte(PESOS(datos.centavos))} el ` +
            `${FECHA(datos.fecha)}${periodo ? `, correspondiente al periodo ${periodo}` : ''}.` +
            (datos.concepto ? `<br><span style="color:#404040;">${esc(datos.concepto)}</span>` : ''),
        ) +
        caja(
            rotulo('Cómo se ve en su estado de cuenta') +
            `<p style="margin:0 0 12px;">El cargo sale a nombre de ` +
            `<strong style="color:#1a1a1a;letter-spacing:0.5px;">${DESCRIPTOR}</strong>.</p>` +
            `<p style="margin:0;font-size:13px;color:#404040;">Algunos bancos mexicanos lo imprimen de otra forma ` +
            `—por ejemplo <em>STR*</em> seguido del nombre del procesador y de una ciudad— porque el cobro se ` +
            `procesa a través de Stripe. Si ve un cargo así por este importe, es éste. Ante cualquier duda, ` +
            `respóndanos antes de desconocerlo con su banco: se lo aclaramos el mismo día.</p>`,
        ) +
        (datos.urlFactura
            ? parrafo(`Puede ver o descargar su comprobante aquí: ` +
                `<a href="${esc(datos.urlFactura)}" style="color:#8b7355;text-decoration:underline;">recibo de este cobro</a>.`)
            : '') +
        parrafo(
            `Para cambiar su tarjeta, consultar sus recibos o cancelar, entre a ` +
            `<a href="${SITIO}/perfil" style="color:#8b7355;text-decoration:underline;">su perfil</a>. ` +
            `Si necesita factura fiscal, respóndanos con sus datos y se la emitimos.`,
        ) +
        parrafo(
            `Gracias por seguir con nosotros.<br><span style="color:#8b7355;">Soporte de Iurexia &middot; soporte@iurexia.com</span>`,
            '0',
        );

    return {
        asunto: `Su recibo de Iurexia: ${PESOS(datos.centavos)}`,
        html: envolver({ cuerpo, pie: 'Este es un comprobante de un cobro recurrente que usted autorizó al suscribirse.' }),
        texto:
            `Apreciable Lic. ${nombre}:\n\n` +
            `Le confirmamos el cobro de su suscripción: ${PESOS(datos.centavos)} el ${FECHA(datos.fecha)}` +
            `${periodo ? `, correspondiente al periodo ${periodo}` : ''}.\n\n` +
            `CÓMO SE VE EN SU ESTADO DE CUENTA\n` +
            `El cargo sale a nombre de ${DESCRIPTOR}. Algunos bancos mexicanos lo imprimen de otra forma ` +
            `—por ejemplo STR* seguido del nombre del procesador y de una ciudad— porque el cobro se procesa ` +
            `a través de Stripe. Si ve un cargo así por este importe, es éste. Ante cualquier duda, respóndanos ` +
            `antes de desconocerlo con su banco.\n\n` +
            (datos.urlFactura ? `Su comprobante: ${datos.urlFactura}\n\n` : '') +
            `Para cambiar su tarjeta o cancelar: ${SITIO}/perfil\n\n` +
            `Soporte de Iurexia · soporte@iurexia.com`,
    };
}

/** Manda el recibo. Nunca revienta el webhook: un correo que falla no puede
 *  tumbar el registro de un pago que SÍ entró. */
export async function enviarReciboDeCobro(invoice: Stripe.Invoice, nombre?: string | null) {
    const email = (invoice.customer_email || '').toLowerCase().trim();
    const centavos = invoice.amount_paid ?? 0;
    if (!email || centavos <= 0) return false;

    const clave = process.env.RESEND_API_KEY;
    if (!clave) { console.warn('⚠️ Sin RESEND_API_KEY: no sale el recibo de', email); return false; }

    const linea = (invoice.lines?.data || [])[0] as unknown as
        { description?: string | null; period?: { start?: number; end?: number } } | undefined;

    const { asunto, html, texto } = correoDeRecibo({
        email,
        nombre,
        centavos,
        fecha: invoice.created ?? Math.floor(Date.now() / 1000),
        concepto: linea?.description ?? null,
        periodoInicio: linea?.period?.start ?? null,
        periodoFin: linea?.period?.end ?? null,
        urlFactura: invoice.hosted_invoice_url ?? null,
    });

    try {
        const { error } = await new Resend(clave).emails.send({
            from: 'Iurexia <soporte@iurexia.com>',
            to: email,
            replyTo: 'soporte@iurexia.com',
            subject: asunto,
            html,
            text: texto,
        });
        if (error) { console.error('⚠️ Recibo no enviado a', email, error.message); return false; }
        console.log(`🧾 Recibo enviado a ${email} por ${PESOS(centavos)}`);
        return true;
    } catch (e) {
        console.error('⚠️ Recibo no enviado a', email, e);
        return false;
    }
}
