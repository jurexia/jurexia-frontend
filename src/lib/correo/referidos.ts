/**
 * Programa de referidos: «Regale Iurexia».
 *
 * ─── POR QUÉ CAMBIÓ (medido el 7-ago-2026) ───────────────────────────────
 * El programa anterior —«Invite y ascienda»: tres colegas que CONTRATEN Pro
 * y el padrino sube a Platinum tres meses— produjo, en seis meses, cero
 * invitaciones. No pocas: CERO. Las tres causas, medidas en Supabase:
 *
 *   1. El 91% de los usuarios no podía invitar. De 1,798 gratuitos, sólo 2
 *      tenían código guardado; el resto no tenía nada que compartir.
 *   2. La valla era una venta, no una invitación: se le pedía al abogado
 *      generar TRES clientes de pago para cobrar un premio.
 *   3. Sólo ganaba quien invitaba. El mensaje que tenía que mandar era
 *      «regístrate para que yo suba a Platinum». Nadie manda eso a un colega.
 *
 * ─── EL MODELO NUEVO: EL REGALO, NO EL FAVOR ─────────────────────────────
 * Premio de los dos lados y el invitado cobra PRIMERO. El mensaje deja de ser
 * «hazme un favor» y pasa a ser «te regalo seis días de Iurexia Pro», que es
 * algo que un abogado sí manda a un colega porque lo hace quedar bien.
 *
 *   · el invitado, al registrarse ....... 6 días de Pro, sin tarjeta
 *   · quien invita, por escalera ........ 1 activado →  6 días de Pro
 *                                         3 activados → 15 días de Pro
 *                                         5 activados → 30 días de Pro
 *
 * La escalera paga desde el PRIMER invitado a propósito: con la valla en tres,
 * quien traía dos se quedaba sin nada y no volvía a intentarlo. Ese fue el
 * modo de fallo observado.
 *
 * ─── QUÉ CUENTA COMO «USUARIO REAL» ──────────────────────────────────────
 * Correo verificado —lo es por construcción: la cuenta sólo nace después del
 * OTP— Y al menos una consulta real. Un alta vacía no cuenta. La definición
 * es medible y se comprueba en el servidor, nunca con dato del navegador.
 *
 * ─── POR QUÉ TODO VA DECLARADO Y NADA EN LETRA CHICA ─────────────────────
 * Ocultar un término material de una promoción es publicidad engañosa
 * conforme al artículo 32 de la Ley Federal de Protección al Consumidor, y
 * aquí el público destinatario son abogados: el único gremio que sí lee las
 * condiciones y que litiga por oficio. Los días y su vencimiento se muestran
 * al mismo tamaño que el resto, en la página y en el correo.
 */

import crypto from 'crypto';

/** Días de Pro que recibe el INVITADO nada más registrarse. */
export const DIAS_DE_BIENVENIDA = 6;

/**
 * La escalera de quien invita. Cada peldaño se paga UNA vez —lo garantiza el
 * índice único (usuario_id, nivel)— y los días no se suman: se toma el
 * peldaño alcanzado y se cuenta desde hoy, que es lo que dice el texto.
 */
export const ESCALERA: { nivel: number; dias: number }[] = [
    { nivel: 1, dias: 6 },
    { nivel: 3, dias: 15 },
    { nivel: 5, dias: 30 },
];

/** El plan que se regala en todos los casos. */
export const PLAN_REGALO = 'pro_monthly';

/** Nivel reservado al regalo de bienvenida del invitado: no es peldaño. */
export const NIVEL_BIENVENIDA = 0;

/** Cuántos hacen falta para el último peldaño. Para pintar la barra. */
export const META_ESCALERA = ESCALERA[ESCALERA.length - 1].nivel;

/** Planes que ya son de pago: a un cliente Pro no se le regala Pro. */
export const PLANES_QUE_CUENTAN = [
    'pro_monthly', 'pro_annual',
    'platinum_monthly', 'platinum_annual',
    'ultra_secretarios',
];

/** El peldaño más alto alcanzado con N invitados activos, o null. */
export function peldanoAlcanzado(activos: number) {
    let alcanzado: { nivel: number; dias: number } | null = null;
    for (const p of ESCALERA) if (activos >= p.nivel) alcanzado = p;
    return alcanzado;
}

/** Cuántos faltan para el siguiente peldaño, y cuál es. */
export function siguientePeldano(activos: number) {
    for (const p of ESCALERA) if (activos < p.nivel) return { ...p, faltan: p.nivel - activos };
    return null;
}

/**
 * Código de invitación, derivado del id del usuario.
 *
 * Determinista, así que el mismo usuario siempre obtiene el mismo código
 * aunque se regenere: puede compartirlo por WhatsApp hoy y seguirá sirviendo
 * el mes que viene. Se omiten I, O, 0 y 1 porque se confunden al dictarlos
 * por teléfono, que es como los abogados van a pasárselos.
 *
 * OJO al tocar esto: el respaldo del 7-ago-2026 generó los 1,969 códigos en
 * SQL replicando este mismo cálculo (sha256 del id con el prefijo, byte % 32
 * sobre este alfabeto). Se verificaron 6/6 contra esta función. Cambiar el
 * prefijo o el alfabeto dejaría huérfanos todos los enlaces ya repartidos.
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

/** Fecha en que vence un premio de N días otorgado hoy. */
export function vencimientoEnDias(dias: number, desde = new Date()): Date {
    const v = new Date(desde);
    v.setDate(v.getDate() + dias);
    return v;
}

/** «12 de noviembre de 2026» — para escribirla en el correo sin ambigüedad. */
export function fechaLarga(d: Date): string {
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * El texto que el abogado manda por WhatsApp o correo.
 *
 * Escrito como lo escribiría él, no como lo escribiría una campaña: primero
 * el regalo, después el motivo, y el enlace al final. Sin signos de admiración
 * ni promesas: va dirigido a un colega, y el que lo manda pone su prestigio.
 */
export function mensajeDeInvitacion(nombre: string | null, enlace: string): string {
    const dequien = nombre?.trim() ? `${nombre.trim()} ` : '';
    return (
        `Colega, le comparto ${DIAS_DE_BIENVENIDA} días de Iurexia Pro sin costo ni tarjeta.\n\n` +
        `Es el asistente jurídico con el que trabajo: responde con la ley y la ` +
        `jurisprudencia mexicanas citadas y verificables, no de memoria.\n\n` +
        `Actívelos aquí: ${enlace}\n\n` +
        (dequien ? `— ${dequien}` : '')
    );
}
