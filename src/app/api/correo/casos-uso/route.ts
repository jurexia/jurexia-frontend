/**
 * El goteo del correo de casos de uso (16-oct-2026).
 *
 * David: «da por lote los mensajes, 200 hoy, 200 mañana y así sucesivamente, y
 * con intervalos. Intenta que no se detecte como spam o publicidad».
 *
 * Por eso no sale de golpe ni en el bloque diario de las 7:00:
 *   · siete corridas al día (vercel.json: 9:00, 10:30, 12:00, 13:30, 15:00,
 *     16:30 y 18:00 de México), cada una con hasta POR_CORRIDA correos;
 *   · un tope DIARIO (TOPE_DIARIO, 200) contado en la bitácora con el día de
 *     México: en un día normal se cubre antes del mediodía y las corridas de
 *     la tarde no mandan nada; si una corrida falla, la siguiente recupera;
 *   · uno a uno, con pausa entre correos: un goteo parejo no tiene la forma
 *     de ráfaga que Gmail lee como envío masivo;
 *   · los frenos del motor siguen valiendo: nadie lo recibe dos veces, quien
 *     se dio de baja no lo recibe, y quien recibió otra campaña hace menos de
 *     tres días espera a que pasen.
 *
 * Interruptor: `CORREO_CASOS_USO_PAUSA=1` en Vercel lo detiene sin desplegar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { correoCasosUso } from '@/lib/correo/campanias';
import { INCLUIDOS_CASOS_USO, segmento } from '@/lib/correo/segmentos';
import { enviarCampania } from '@/lib/correo/enviar';

export const maxDuration = 300;

const CAMPANIA = 'casos_uso';
const TOPE_DIARIO = Number(process.env.CORREO_CASOS_USO_DIARIO ?? 200);
const POR_CORRIDA = Number(process.env.CORREO_CASOS_USO_CORRIDA ?? 50);
const PAUSA_MS = 2500;

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';
    return null;
}

/** Las 0:00 de hoy en la Ciudad de México (UTC-6 todo el año desde 2022), en UTC. */
function inicioDelDiaMexico(ahora = new Date()): string {
    const mx = new Date(ahora.getTime() - 6 * 3600_000);
    return new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), mx.getUTCDate(), 6, 0, 0)).toISOString();
}

async function enviadosHoy(): Promise<number> {
    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { count, error } = await db.from('correo_envios').select('id', { count: 'exact', head: true })
        .eq('campania', CAMPANIA).eq('estado', 'enviado').gte('enviado_at', inicioDelDiaMexico());
    if (error) throw new Error(`No pude contar los envíos de hoy: ${error.message}`);
    return count ?? 0;
}

export async function GET(req: NextRequest) {
    const arranque = Date.now();
    const llamante = quienLlama(req);
    if (!llamante) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (process.env.CORREO_CASOS_USO_PAUSA === '1') {
        return NextResponse.json({ campania: CAMPANIA, pausado: true });
    }

    // El cron envía de verdad; a mano es simulacro salvo `?modo=real`.
    const simulacro = llamante === 'cron' ? false : req.nextUrl.searchParams.get('modo') !== 'real';

    try {
        const hoy = await enviadosHoy();
        const maximo = Math.max(0, Math.min(POR_CORRIDA, TOPE_DIARIO - hoy));
        if (maximo === 0) {
            return NextResponse.json({ campania: CAMPANIA, simulacro, enviados_hoy: hoy, tope_diario: TOPE_DIARIO, nota: 'Tope del día cubierto' });
        }
        const destinatarios = await segmento(CAMPANIA);
        const r = await enviarCampania({
            campania: CAMPANIA,
            destinatarios,
            construir: correoCasosUso,
            simulacro,
            maximo,
            lote: 1,
            pausaMs: PAUSA_MS,
            plazoHasta: arranque + 240_000,
            incluir: INCLUIDOS_CASOS_USO,
        });
        return NextResponse.json({ ...r, enviados_hoy_antes: hoy, tope_diario: TOPE_DIARIO, por_corrida: POR_CORRIDA });
    } catch (e) {
        const mensaje = e instanceof Error ? e.message : String(e);
        console.error('❌ casos_uso:', mensaje);
        return NextResponse.json({ campania: CAMPANIA, error: mensaje }, { status: 500 });
    }
}
