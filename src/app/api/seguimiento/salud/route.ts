/**
 * ¿Puede Iurexia ver el portal del Consejo desde donde corre?
 *
 * POR QUÉ EXISTE. Cuando el alta falla, el abogado ve «no se pudo consultar» y
 * no hay forma de saber si el portal está caído, si cambió el formato, si el
 * certificado no valida en el entorno de Vercel o si el número que escribió no
 * existe. Esta ruta lo separa: pide SIEMPRE el mismo expediente público, uno
 * que existe y no va a desaparecer, y cuenta exactamente qué pasó.
 *
 * NO ACEPTA PARÁMETROS a propósito. Si aceptara órgano y expediente sería un
 * proxy abierto contra el portal del Consejo a nombre de Iurexia. Así sólo
 * puede hacer una petición, siempre la misma.
 */

import { NextResponse } from 'next/server';
import { leer, urlDe, ErrorFormato, ErrorNoEncontrado } from '@/lib/seguimiento/pjf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Juzgado Primero de Distrito en Baja California, amparo indirecto 71/2026.
 *  Elegido porque tiene historia larga —más de treinta acuerdos— y por tanto
 *  ejercita el parseo de la tabla entera, no sólo la carátula. */
const TESTIGO = { organismo: 293, expediente: '71/2026', tipoAsunto: 1 };

export async function GET() {
    const t0 = Date.now();
    const url = urlDe(TESTIGO.organismo, TESTIGO.expediente, TESTIGO.tipoAsunto, 0);

    try {
        const l = await leer(TESTIGO.organismo, TESTIGO.expediente, TESTIGO.tipoAsunto, 0);
        return NextResponse.json({
            ok: true,
            ms: Date.now() - t0,
            http: l.http,
            bytes: l.bytes,
            organo: l.caratula.organo,
            neun: l.caratula.neun,
            expediente: l.caratula.expediente,
            acuerdos: l.acuerdos.length,
            ultimo: l.acuerdos.length
                ? { fecha: l.acuerdos[l.acuerdos.length - 1].fecha_auto,
                    resumen: l.acuerdos[l.acuerdos.length - 1].resumen.slice(0, 120) }
                : null,
            url,
        });
    } catch (e) {
        const err = e as Error & { code?: string };
        return NextResponse.json({
            ok: false,
            ms: Date.now() - t0,
            // El nombre de la clase es lo que distingue «dato malo» de «no veo».
            clase: err.constructor?.name || 'Error',
            tipo: e instanceof ErrorNoEncontrado ? 'no_encontrado'
                : e instanceof ErrorFormato ? 'formato' : 'red',
            mensaje: err.message,
            codigo: err.code ?? null,
            url,
        }, { status: 503 });
    }
}
