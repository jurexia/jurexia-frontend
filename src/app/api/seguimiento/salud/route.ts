/**
 * ¿Puede Iurexia ver las fuentes desde donde corre?
 *
 * POR QUÉ EXISTE. Cuando el alta de un expediente falla, el abogado ve «no se
 * pudo consultar» y no hay forma de saber si el portal está caído, si cambió el
 * formato, si el certificado no valida en el entorno de Vercel o si el número
 * que escribió no existe. Esta ruta lo separa.
 *
 * Y HAY UN PRECEDENTE QUE LA JUSTIFICA. El lector del Boletín de la Ciudad de
 * México llevaba desde el primer día fallando en producción —los cuatro pases
 * de cada día, siempre, «DOMMatrix is not defined»— y funcionaba perfectamente
 * en la máquina de desarrollo, porque allí hay un paquete de lienzo nativo que
 * en el servidor no está. Sin una ruta que lo pruebe en el servidor, eso sólo
 * se descubre leyendo la tabla de revisiones a mano.
 *
 * NO ACEPTA PARÁMETROS a propósito. Si aceptara órgano y expediente sería un
 * proxy abierto contra el portal del Consejo a nombre de Iurexia. Así sólo
 * puede hacer dos peticiones, siempre las mismas.
 */

import { NextResponse } from 'next/server';
import { leer, urlDe, ErrorFormato, ErrorNoEncontrado } from '@/lib/seguimiento/pjf';
import { sondeo } from '@/lib/seguimiento/cdmx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/** Juzgado Primero de Distrito en Baja California, amparo indirecto 71/2026.
 *  Elegido porque tiene historia larga —más de treinta acuerdos— y por tanto
 *  ejercita el parseo de la tabla entera, no sólo la carátula. */
const TESTIGO = { organismo: 293, expediente: '71/2026', tipoAsunto: 1 };

async function pjf() {
    const t0 = Date.now();
    const url = urlDe(TESTIGO.organismo, TESTIGO.expediente, TESTIGO.tipoAsunto, 0);
    try {
        const l = await leer(TESTIGO.organismo, TESTIGO.expediente, TESTIGO.tipoAsunto, 0);
        return {
            ok: true, ms: Date.now() - t0, http: l.http, bytes: l.bytes,
            organo: l.caratula.organo, neun: l.caratula.neun,
            expediente: l.caratula.expediente, acuerdos: l.acuerdos.length,
            ultimo: l.acuerdos.length
                ? { fecha: l.acuerdos[l.acuerdos.length - 1].fecha_auto,
                    resumen: l.acuerdos[l.acuerdos.length - 1].resumen.slice(0, 120) }
                : null,
            url,
        };
    } catch (e) {
        const err = e as Error & { code?: string };
        return {
            ok: false, ms: Date.now() - t0,
            // El nombre de la clase es lo que distingue «dato malo» de «no veo».
            clase: err.constructor?.name || 'Error',
            tipo: e instanceof ErrorNoEncontrado ? 'no_encontrado'
                : e instanceof ErrorFormato ? 'formato' : 'red',
            mensaje: err.message, codigo: err.code ?? null, url,
        };
    }
}

async function cdmx() {
    const t0 = Date.now();
    try {
        return { ok: true, ...(await sondeo()) };
    } catch (e) {
        const err = e as Error;
        return {
            ok: false, ms: Date.now() - t0,
            clase: err.constructor?.name || 'Error',
            mensaje: err.message,
        };
    }
}

export async function GET() {
    // En paralelo: son dos servidores distintos y no se estorban.
    const [a, b] = await Promise.all([pjf(), cdmx()]);
    const ok = a.ok && b.ok;
    return NextResponse.json({ ok, pjf: a, cdmx: b }, { status: ok ? 200 : 503 });
}
