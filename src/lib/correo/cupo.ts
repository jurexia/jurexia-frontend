/**
 * EL CUPO DE RESEND, REPARTIDO ENTRE CAMPAÑAS Y ESCRITOS (16-oct-2026).
 *
 * La cuenta de Resend es gratuita: 100 correos al día y 3,000 al mes. Dos
 * reglas de Resend que deciden las cuentas (documentación «Account quotas
 * and limits», leída el 16-oct-2026):
 *   · el día es el día UTC, de 00:00 a 24:00 —en México, de las 18:00 a las
 *     18:00—, no una ventana móvil de 24 horas;
 *   · CADA DESTINATARIO cuenta como un correo: uno con «para» y «con copia»
 *     gasta dos.
 *
 * Tres bolsas dentro de los 100 diarios:
 *   1. RESERVA_TRANSACCIONAL (30): alta de cuenta, recuperación de contraseña
 *      y los avisos que no se cuentan en ninguna bitácora (agenda,
 *      seguimiento, recibos). Nadie más la toca; ver `enviar.ts`.
 *   2. RESERVA_ESCRITOS (20 por omisión, `RESEND_RESERVA_ESCRITOS`): los
 *      escritos que los abogados envían a sus clientes. Las campañas no
 *      pueden usarla. Sin ella el envío no serviría en días hábiles: el
 *      bloque diario sale a las 7:00 de México y se lleva todo lo que haya, y
 *      el abogado que quisiera enviar a mediodía se toparía con «sin cupo».
 *   3. Lo que queda (50) es de las campañas. Si los abogados pasan de su
 *      reserva, lo que sigue sale de aquí — nunca de la transaccional.
 *
 * El mes se comparte sin bolsas propias: con los topes diarios no se alcanza,
 * pero se respeta igual.
 *
 * Si la tabla `correos_abogado` no existe (la migración sin aplicar), no hay
 * escritos que contar ni que reservar, y las campañas siguen como antes.
 *
 * CON EL PLAN DE PAGO DE RESEND (50,000 al mes, sin tope diario) basta con
 * subir `RESEND_LIMITE_DIARIO` y `RESEND_LIMITE_MENSUAL` en Vercel: las
 * cuentas de aquí abajo no cambian.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

function numero(valor: string | undefined, porOmision: number): number {
    if (valor === undefined || valor.trim() === '') return porOmision;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 ? n : porOmision;
}

export const LIMITE_DIARIO = Number(process.env.RESEND_LIMITE_DIARIO || 100);
export const LIMITE_MENSUAL = Number(process.env.RESEND_LIMITE_MENSUAL || 3000);
export const RESERVA_TRANSACCIONAL = 30;
export const RESERVA_ESCRITOS = numero(process.env.RESEND_RESERVA_ESCRITOS, 20);

export interface Limites {
    diario: number;
    mensual: number;
    reservaTransaccional: number;
    reservaEscritos: number;
}

export const LIMITES_RESEND: Limites = {
    diario: LIMITE_DIARIO,
    mensual: LIMITE_MENSUAL,
    reservaTransaccional: RESERVA_TRANSACCIONAL,
    reservaEscritos: RESERVA_ESCRITOS,
};

/** Lo que ya se gastó del cupo, en correos (destinatarios), no en envíos. */
export interface Consumo {
    campaniasHoy: number;
    campaniasMes: number;
    escritosHoy: number;
    escritosMes: number;
    /** La tabla de escritos existe; sin ella no hay escritos ni reserva para ellos. */
    escritosActivos: boolean;
    /** Si alguna cuenta no se pudo leer. Las campañas siguen; un escrito no sale. */
    fallo: string | null;
}

export function inicioDelDiaUTC(ahora = new Date()): string {
    return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())).toISOString();
}

export function inicioDelMesUTC(ahora = new Date()): string {
    return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)).toISOString();
}

/** Cuántos correos gasta un envío: uno por destinatario, «para» más «con copia». */
export function unidadesDe(fila: { para?: readonly string[] | null; cc?: readonly string[] | null }): number {
    return (fila.para?.length ?? 0) + (fila.cc?.length ?? 0);
}

/** Cuántos correos de campaña caben hoy sin tocar ninguna de las dos reservas. */
export function cupoDeCampanias(c: Consumo, l: Limites = LIMITES_RESEND): { cupo: number; tope_diario: number } {
    const reserva = c.escritosActivos ? l.reservaEscritos : 0;
    const tope_diario = l.diario - l.reservaTransaccional - reserva;
    // Lo que los abogados gastaron por encima de su reserva sale de aquí.
    const dia = tope_diario - c.campaniasHoy - Math.max(0, c.escritosHoy - reserva);
    const mes = l.mensual - l.reservaTransaccional * 30 - c.campaniasMes - c.escritosMes;
    return { cupo: Math.max(0, Math.min(dia, mes)), tope_diario };
}

/**
 * Lo que queda para escritos, CONTANDO YA el envío en curso si su renglón está
 * escrito. Puede salir negativo: significa que ese envío no cabe.
 */
export function margenDeEscritos(c: Consumo, l: Limites = LIMITES_RESEND): number {
    const dia = l.diario - l.reservaTransaccional - c.campaniasHoy - c.escritosHoy;
    const mes = l.mensual - l.reservaTransaccional * 30 - c.campaniasMes - c.escritosMes;
    return Math.min(dia, mes);
}

function faltaLaTabla(e: { code?: string; message?: string } | null | undefined): boolean {
    if (!e) return false;
    return e.code === 'PGRST205' || e.code === '42P01' || /does not exist|schema cache/i.test(e.message || '');
}

/**
 * Los escritos que cuentan contra el cupo desde `desde`: los enviados y los
 * que están saliendo (su renglón se escribe ANTES de llamar a Resend, para
 * que dos envíos simultáneos se vean el uno al otro).
 */
async function escritosDesde(db: SupabaseClient, desde: string, inicioDia: string) {
    const tDia = Date.parse(inicioDia);
    let hoy = 0, mes = 0, pagina = 0;
    for (;;) {
        const { data, error } = await db
            .from('correos_abogado')
            .select('id, para, cc, created_at')
            .in('estado', ['enviado', 'enviando'])
            .gte('created_at', desde)
            // Orden estable OBLIGATORIO al paginar (ver `leerYaEnviados`).
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(pagina, pagina + 999);
        if (error) return { hoy: 0, mes: 0, activos: !faltaLaTabla(error), error: faltaLaTabla(error) ? null : error.message };
        for (const f of (data ?? []) as { para: string[] | null; cc: string[] | null; created_at: string }[]) {
            const u = unidadesDe(f);
            mes += u;
            if (Date.parse(f.created_at) >= tDia) hoy += u;
        }
        if (!data || data.length < 1000) break;
        pagina += 1000;
    }
    return { hoy, mes, activos: true, error: null as string | null };
}

/** Lo gastado hoy y este mes (UTC, como Resend), de campañas y de escritos. */
export async function consumoDelCupo(db: SupabaseClient, ahora = new Date()): Promise<Consumo> {
    const inicioDia = inicioDelDiaUTC(ahora);
    const inicioMes = inicioDelMesUTC(ahora);
    const [dia, mes, escritos] = await Promise.all([
        db.from('correo_envios').select('id', { count: 'exact', head: true })
            .eq('estado', 'enviado').gte('enviado_at', inicioDia),
        db.from('correo_envios').select('id', { count: 'exact', head: true })
            .eq('estado', 'enviado').gte('enviado_at', inicioMes),
        escritosDesde(db, inicioMes, inicioDia),
    ]);
    const fallos = [dia.error?.message, mes.error?.message, escritos.error].filter(Boolean);
    return {
        campaniasHoy: dia.count ?? 0,
        campaniasMes: mes.count ?? 0,
        escritosHoy: escritos.hoy,
        escritosMes: escritos.mes,
        escritosActivos: escritos.activos,
        fallo: fallos.length ? fallos.join(' · ') : null,
    };
}
