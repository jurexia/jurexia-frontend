import { Resend } from 'resend';
import { boton, envolver, esc, fuerte, parrafo, PIE_SOPORTE, rotulo } from './plantilla';
import { cabecerasBaja, urlBaja } from './baja';

/**
 * EL RECORDATORIO DE PAGO PENDIENTE (9-nov-2026).
 *
 * Del 4 al 9-nov, 33 personas abrieron la página de pago y 16 se fueron sin
 * pagar; nadie les escribía. Este correo sale una hora después, si la sesión
 * de Stripe sigue abierta, y lleva a ESA MISMA sesión: el plan ya elegido y,
 * si traía código, el descuento ya aplicado.
 *
 * Texto para el visto bueno de David. Firma Soporte de Iurexia, en plural.
 */
export interface DatosPagoPendiente {
    email: string;
    nombre: string;
    tratamiento?: string | null;
    /** «Plan Pro» */
    plan: string;
    /** «$149 MXN al mes» */
    precio: string;
    /** La URL de la sesión de Checkout, todavía abierta. */
    url: string;
    /** Cuándo expira la sesión. */
    vence: Date;
}

function saludo(d: DatosPagoPendiente): string {
    if (d.tratamiento === 'licenciada') return `Estimada licenciada ${esc(d.nombre)}:`;
    if (d.tratamiento === 'licenciado') return `Estimado licenciado ${esc(d.nombre)}:`;
    return `Apreciable Lic. ${esc(d.nombre)}:`;
}

const firma = `<p style="margin:0;">Atentamente,<br>${fuerte('Soporte de Iurexia')}</p>`;

/** «martes 10 de noviembre a las 15:14», en hora de la Ciudad de México. */
export function venceEnLetra(d: Date): string {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('es-MX', {
            timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(d).map((p) => [p.type, p.value]),
    );
    return `${partes.weekday} ${partes.day} de ${partes.month} a las ${partes.hour}:${partes.minute}`;
}

export function correoDePagoPendiente(d: DatosPagoPendiente) {
    const cuerpo = [
        rotulo('Pago pendiente'),
        parrafo(saludo(d), '0 0 22px 0'),
        parrafo(`Vimos que empezó a contratar el ${fuerte(`${esc(d.plan)} (${esc(d.precio)})`)} y el pago `
            + 'quedó sin terminar.'),
        parrafo('Si fue una interrupción, puede retomarlo aquí mismo: el enlace lo lleva al mismo '
            + 'formulario, con su plan ya elegido.'),
        boton('Terminar mi pago', d.url),
        parrafo(`El enlace vale hasta el ${esc(venceEnLetra(d.vence))}. Después, puede contratar cuando `
            + 'quiera desde la página de planes.', '16px 0 20px 0'),
        parrafo('Si algo le impidió pagar —la tarjeta, el formulario o una duda sobre el plan—, responda '
            + 'a este correo y lo resolvemos con usted.'),
        firma,
    ].join('\n');

    return {
        asunto: `Su pago del ${d.plan} quedó pendiente`,
        html: envolver({
            cuerpo,
            logo: true,
            preencabezado: 'Puede terminarlo en el mismo formulario, con su plan ya elegido.',
            pie: PIE_SOPORTE,
            urlBaja: urlBaja(d.email),
        }),
    };
}

/** Lo envía desde soporte@. Devuelve el id de Resend; lanza si falla. */
export async function enviarPagoPendiente(email: string, correo: { asunto: string; html: string }): Promise<string | null> {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) throw new Error('RESEND_API_KEY sin configurar');
    const { data, error } = await new Resend(clave).emails.send({
        from: 'Soporte de Iurexia <soporte@iurexia.com>',
        replyTo: 'soporte@iurexia.com',
        to: email,
        subject: correo.asunto,
        html: correo.html,
        headers: cabecerasBaja(email),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return data?.id ?? null;
}
