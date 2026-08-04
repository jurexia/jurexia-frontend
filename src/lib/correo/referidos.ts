/**
 * Programa de referidos: «Invite y ascienda».
 *
 * Un usuario Pro que consiga que TRES personas se suscriban a un plan Pro o
 * superior recibe una cuenta Platinum durante tres meses.
 *
 * El plazo de tres meses va DECLARADO en el propio correo y en la página, al
 * mismo tamaño que el resto. No en letra chica.
 *
 * La razón no es sólo de estilo. Ocultar un término material de una promoción
 * es publicidad engañosa conforme al artículo 32 de la Ley Federal de
 * Protección al Consumidor, y aquí el público destinatario son abogados: el
 * único gremio que sí lee las condiciones y que litiga por oficio. Un ascenso
 * que se apaga sin aviso a los tres meses genera exactamente la conversación
 * que no se quiere tener con el cliente que más nos ha ayudado a crecer.
 */

import crypto from 'crypto';

export const REFERIDOS_NECESARIOS = 3;
export const MESES_DE_PREMIO = 3;

/** Planes que cuentan como «suscripción válida» del referido. */
export const PLANES_QUE_CUENTAN = [
    'pro_monthly', 'pro_annual',
    'platinum_monthly', 'platinum_annual',
    'ultra_secretarios',
];

/**
 * Código de invitación, derivado del id del usuario.
 *
 * Determinista, así que el mismo usuario siempre obtiene el mismo código
 * aunque se regenere: puede compartirlo por WhatsApp hoy y seguirá sirviendo
 * el mes que viene. Se omiten I, O, 0 y 1 porque se confunden al dictarlos
 * por teléfono, que es como los abogados van a pasárselos.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function codigoReferido(usuarioId: string): string {
    const h = crypto.createHash('sha256').update(`iurexia:ref:${usuarioId}`).digest();
    let codigo = '';
    for (let i = 0; i < 8; i++) codigo += ALFABETO[h[i] % ALFABETO.length];
    return codigo;
}

export function enlaceInvitacion(usuarioId: string): string {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    return `${sitio}/registro?ref=${codigoReferido(usuarioId)}`;
}

/** Fecha en que vence un ascenso otorgado hoy. */
export function vencimientoDelPremio(desde = new Date()): Date {
    const v = new Date(desde);
    v.setMonth(v.getMonth() + MESES_DE_PREMIO);
    return v;
}

/** «12 de noviembre de 2026» — para escribirla en el correo sin ambigüedad. */
export function fechaLarga(d: Date): string {
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
