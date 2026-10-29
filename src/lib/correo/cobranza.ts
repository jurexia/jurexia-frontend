import { Resend } from 'resend';
import { boton, caja, envolver, esc, fuerte, nombrePila, parrafo, PIE_SOPORTE, rotulo } from './plantilla';

/**
 * LOS CORREOS DE LA COBRANZA (29-oct-2026).
 *
 * Hasta hoy, quien tenía un cobro rechazado recibía UN correo, el de la
 * suspensión, y luego nada: Stripe reintentaba dos semanas en silencio y
 * cancelaba. De 171 suscripciones canceladas al 29-oct, 68 murieron así.
 * Estos dos llenan el hueco:
 *
 *   · el RECORDATORIO, el día de quincena en que volvimos a intentar el cobro y
 *     no pasó (o, si la tarjeta ya no sirve, unos días después del rechazo), y
 *   · el ÚLTIMO AVISO, tres días antes de que Stripe cancele, con la fecha.
 *
 * Cada uno sale una sola vez por factura: quien los manda lo anota en la
 * propia factura de Stripe. Los dos llevan a la factura alojada, que se paga
 * sin iniciar sesión, y pagarla levanta la suspensión sola.
 *
 * Firma Soporte de Iurexia, en plural, con el logotipo arriba y el pie de
 * soporte: son avisos de una cuenta, no publicidad.
 */

export interface DatosCobranza {
    email: string;
    nombre?: string | null;
    /** Lo que se debe, en centavos. */
    centavos: number;
    /** La factura alojada de Stripe. */
    url: string;
    /** Cuándo cancelará Stripe la suscripción si no se paga. */
    corte: Date;
    /** «Plan Pro», «Plan Platinum»… o null si no se sabe. */
    plan?: string | null;
}

const PESOS = (centavos: number) =>
    (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) + ' MXN';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** La fecha tal como se lee en la Ciudad de México: «miércoles 11 de noviembre». */
export function fechaEnLetra(d: Date): string {
    const [a, m, dd] = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d).split('-').map(Number);
    const local = new Date(Date.UTC(a, m - 1, dd, 12));
    return `${DIAS[local.getUTCDay()]} ${dd} de ${MESES[m - 1]}`;
}

/** El último día para pagar: el anterior al corte. Decir «antes del 12» cuando
 *  Stripe cancela el 12 a media tarde invitaría a pagar el 12 por la noche. */
function ultimoDiaParaPagar(corte: Date): Date {
    return new Date(corte.getTime() - 86_400_000);
}

/**
 * El motivo del rechazo dicho para el cliente. Nunca el código crudo, y a una
 * tarjeta reportada no se le dice «robada»: el titular puede no saberlo y no
 * es asunto nuestro anunciárselo.
 */
export function motivoEnPalabras(codigo: string | null | undefined): string | null {
    switch (codigo) {
        case 'insufficient_funds':
            return 'por fondos insuficientes';
        case 'expired_card':
            return 'porque la tarjeta está vencida';
        case 'card_velocity_exceeded':
        case 'withdrawal_count_limit_exceeded':
            return 'porque la tarjeta alcanzó su límite de operaciones';
        case 'incorrect_cvc':
        case 'invalid_cvc':
            return 'porque el código de seguridad de la tarjeta no coincide';
        case 'transaction_not_allowed':
            return 'porque la tarjeta no admite este tipo de cargos';
        case 'invalid_account':
            return 'porque la cuenta de la tarjeta ya no está activa';
        case 'lost_card':
        case 'stolen_card':
        case 'pickup_card':
        case 'restricted_card':
            return 'porque la tarjeta ya no está habilitada para cargos';
        default:
            return null;
    }
}

const saludo = (d: DatosCobranza) =>
    parrafo(`Apreciable Lic. ${esc(nombrePila(d.nombre, d.email))}:`, '0 0 22px 0');

const firma = `<p style="margin:0;">Atentamente,<br>${fuerte('Soporte de Iurexia')}</p>`;

const delPlan = (plan?: string | null) => (plan ? ` del ${esc(plan)}` : '');

/**
 * El recordatorio. Dos versiones según la tarjeta:
 *   · `reintentado`: hoy, día de quincena, volvimos a intentar y no pasó. La
 *     tarjeta sirve; lo que faltaba eran fondos.
 *   · sin reintento: el banco dio el rechazo por definitivo (vencida, dada de
 *     baja…). Con esa tarjeta no hay cobro posible y hay que pedir otra.
 */
export function correoDeRecordatorio(d: DatosCobranza & { reintentado: boolean; motivo?: string | null }) {
    const motivo = motivoEnPalabras(d.motivo);
    const conMotivo = motivo ? ` ${motivo}` : '';

    // Sin motivo no se le echa la culpa al banco: también puede haberlo parado
    // el antifraude, y eso no lo decidió su banco.
    const primero = d.reintentado
        ? `Hoy volvimos a intentar el cobro de su mensualidad${delPlan(d.plan)} por `
            + `${fuerte(PESOS(d.centavos))} y su banco lo rechazó de nuevo${esc(conMotivo)}.`
        : motivo
            ? `Su banco rechazó el cobro de su mensualidad${delPlan(d.plan)} por `
                + `${fuerte(PESOS(d.centavos))}${esc(conMotivo)}. Con esa tarjeta no podremos completar `
                + 'el pago, así que le pedimos hacerlo con otra.'
            : `No pudimos cobrar su mensualidad${delPlan(d.plan)} por ${fuerte(PESOS(d.centavos))} `
                + 'con la tarjeta que tiene registrada, y con ella no podremos completarlo. Le pedimos '
                + 'hacer el pago con otra.';

    const cuerpo = [
        rotulo('Recordatorio de pago'),
        saludo(d),
        parrafo(primero),
        parrafo(`Su cuenta sigue suspendida, pero ${fuerte('no ha perdido nada')}: su plan, sus `
            + 'conversaciones, sus carpetas y sus documentos siguen intactos.'),
        boton('Pagar y reactivar mi cuenta', d.url),
        parrafo('Puede pagar ahí mismo con otra tarjeta de crédito o débito, sin iniciar sesión. En '
            + `cuanto el pago se confirme, ${fuerte('su acceso vuelve de inmediato')}, sin que tenga que `
            + 'avisarnos.', '16px 0 20px 0'),
        caja(`Si el pago no se completa a más tardar el ${fuerte(fechaEnLetra(ultimoDiaParaPagar(d.corte)))}, `
            + 'su suscripción se cancelará automáticamente y no se le cobrará nada más.'),
        parrafo('Si prefiere cancelar, o si cree que se trata de un error, responda a este correo y lo '
            + 'atenderemos.', '20px 0 20px 0'),
        firma,
    ].join('\n');

    return {
        asunto: d.reintentado
            ? 'Iurexia: volvimos a intentar el cobro de su mensualidad'
            : 'Iurexia: su tarjeta no permite cobrar su mensualidad',
        html: envolver({
            cuerpo,
            logo: true,
            preencabezado: 'Su cuenta sigue suspendida. Puede reactivarla en un minuto pagando con otra tarjeta.',
            pie: PIE_SOPORTE,
        }),
    };
}

/** El último aviso: tres días antes de que Stripe cancele, con la fecha. */
export function correoDeAvisoFinal(d: DatosCobranza) {
    const cuerpo = [
        rotulo('Último aviso'),
        saludo(d),
        parrafo(`Todavía no hemos podido cobrar su mensualidad${delPlan(d.plan)} por `
            + `${fuerte(PESOS(d.centavos))}. Si el pago no se completa a más tardar el `
            + `${fuerte(fechaEnLetra(ultimoDiaParaPagar(d.corte)))}, su suscripción se cancelará `
            + 'automáticamente.'),
        parrafo('Al cancelarse no se le cobrará nada más, y su cuenta dejará de tener las funciones de '
            + 'su plan. Si quiere conservarlo, puede pagar ahora:'),
        boton('Pagar y conservar mi plan', d.url),
        parrafo('Puede pagar ahí mismo con otra tarjeta de crédito o débito, sin iniciar sesión, y su '
            + 'acceso vuelve de inmediato.', '16px 0 20px 0'),
        parrafo('Si prefiere no continuar, no tiene que hacer nada. Si cree que se trata de un error, '
            + 'responda a este correo y lo atenderemos.'),
        firma,
    ].join('\n');

    return {
        asunto: `Último aviso: su suscripción a Iurexia se cancelará el ${fechaEnLetra(d.corte)}`,
        html: envolver({
            cuerpo,
            logo: true,
            preencabezado: 'Todavía puede conservar su plan pagando con otra tarjeta.',
            pie: PIE_SOPORTE,
        }),
    };
}

/** Envía uno de los correos de arriba desde soporte@. Lanza si Resend falla:
 *  quien llama decide si eso se anota o no. */
export async function enviarCorreoDeCobranza(email: string, correo: { asunto: string; html: string }) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) throw new Error('RESEND_API_KEY sin configurar');
    const { error } = await new Resend(clave).emails.send({
        from: 'Soporte de Iurexia <soporte@iurexia.com>',
        replyTo: 'soporte@iurexia.com',
        to: email,
        subject: correo.asunto,
        html: correo.html,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
}
