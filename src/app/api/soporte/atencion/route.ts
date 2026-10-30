/**
 * LO QUE PASA EN EL BUZÓN DE soporte@, contado por su Apps Script (29-oct-2026).
 *
 * El servidor no puede leer Gmail; el Apps Script que ya corre en soporte@
 * cada 10 minutos sí. Este endpoint recibe lo que vio —«salió una respuesta
 * a fulano», «fulano volvió a escribir»— y mueve el estado de cada reporte:
 * pendiente → respondido, o respondido → pendiente si el abogado insiste.
 * Nadie marca nada a mano: contestar desde soporte@ ES marcarlo.
 *
 * Por qué una clave propia (`SOPORTE_ATENCION_KEY`) y no ADMIN_KEY: el script
 * vive en otra cuenta y sólo debe poder hacer esto. Con esta clave no se
 * manda un correo ni se lee un dato: sólo se cambia el estado de atención.
 *
 * El script manda las mismas observaciones en varias vueltas; aplicarlas dos
 * veces no cambia nada (ver `aplicarObservacion`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aplicarObservaciones } from '@/lib/soporte/reportes';
import type { Observacion } from '@/lib/soporte/atencion-logica';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAXIMO = 500;

function limpia(o: unknown): Observacion | null {
    if (!o || typeof o !== 'object') return null;
    const x = o as Record<string, unknown>;
    if (x.tipo !== 'respuesta' && x.tipo !== 'usuario') return null;
    const fecha = typeof x.fecha === 'string' && !Number.isNaN(Date.parse(x.fecha)) ? new Date(x.fecha).toISOString() : null;
    if (!fecha) return null;
    const correos = (Array.isArray(x.correos) ? x.correos : [])
        .filter((c): c is string => typeof c === 'string' && /^[^\s@]+@[^\s@]+$/.test(c.trim()))
        .map(c => c.trim().toLowerCase()).slice(0, 20);
    const folios = (Array.isArray(x.folios) ? x.folios : [])
        .filter((f): f is string => typeof f === 'string' && /^\d{1,6}-\d{2}$/.test(f)).slice(0, 20);
    if (!correos.length && !folios.length) return null;
    return {
        tipo: x.tipo, fecha, correos, folios,
        hilo: typeof x.hilo === 'string' ? x.hilo.slice(0, 64) : null,
    };
}

export async function POST(req: NextRequest) {
    const clave = process.env.SOPORTE_ATENCION_KEY;
    if (!clave) return NextResponse.json({ error: 'sin configurar' }, { status: 503 });
    if (req.headers.get('x-atencion-key') !== clave) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });

    let cuerpo: { observaciones?: unknown[] };
    try { cuerpo = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const observaciones = (Array.isArray(cuerpo.observaciones) ? cuerpo.observaciones : [])
        .slice(0, MAXIMO).map(limpia).filter((o): o is Observacion => !!o);
    if (!observaciones.length) return NextResponse.json({ observaciones: 0, cambios: [] });

    const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
    const res = await aplicarObservaciones(sb, observaciones);
    if ('error' in res) return NextResponse.json(res, { status: 500 });
    return NextResponse.json(res);
}
