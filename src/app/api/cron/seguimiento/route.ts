/**
 * El disparador del seguimiento de expedientes.
 *
 * LA HORA. México suprimió el horario de verano en octubre de 2022, así que la
 * Ciudad de México es UTC−6 todo el año y las 9:10 locales son las 15:10 UTC.
 * Los crons de Vercel van en UTC y no saben de husos, así que la conversión se
 * hace aquí — y el backend la vuelve a comprobar contra la hora local antes de
 * tocar nada: si el país cambiara de huso, prefiere negarse a mandar avisos con
 * una hora falsa en el cuerpo.
 *
 * QUIÉN HACE EL TRABAJO. Render, no Vercel. Un cron de Vercel tiene los minutos
 * contados y barrer una cartera grande dura más; esta ruta sólo abre la puerta
 * y devuelve. Si el pod de Render estaba dormido, la propia llamada lo despierta
 * y el pase de las 9:40 cubre el arranque en frío.
 *
 * LOS CUATRO PASES:
 *   1 · 9:10  el barrido de verdad
 *   2 · 9:40  reintenta sólo lo que falló
 *   3 · 10:20 último reintento
 *   4 · 11:00 cierre: manda los correos de «no se pudo» y escala al tercer día
 *
 * A mano:  GET /api/cron/seguimiento?pase=1  con la cabecera `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';

    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';

    return null;
}

/** Qué pase toca, según la hora UTC en que Vercel nos despertó. */
function paseDeLaHora(req: NextRequest): number {
    const pedido = Number(req.nextUrl.searchParams.get('pase'));
    if (pedido >= 1 && pedido <= 4) return pedido;

    const h = new Date().getUTCHours();
    const m = new Date().getUTCMinutes();
    if (h === 15 && m < 30) return 1;      // 09:10 CDMX
    if (h === 15) return 2;                // 09:40 CDMX
    if (h === 16) return 3;                // 10:20 CDMX
    return 4;                              // 11:00 CDMX — cierre
}

export async function GET(req: NextRequest) {
    const quien = quienLlama(req);
    if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const pase = paseDeLaHora(req);
    const forzar = quien === 'admin' && req.nextUrl.searchParams.get('forzar') === '1';

    try {
        const r = await fetch(`${API}/seguimiento/barrer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-iurexia-cron': process.env.CRON_SECRET || '',
            },
            body: JSON.stringify({ pase, forzar }),
            // El barrido puede tardar; Vercel corta a los 60 s de esta ruta,
            // pero Render sigue trabajando por su cuenta aunque se corte aquí.
            signal: AbortSignal.timeout(55_000),
        });

        const datos = await r.json().catch(() => ({}));
        console.log(`⚖️ Seguimiento pase ${pase}: ${r.status}`, datos);
        return NextResponse.json({ pase, ...datos }, { status: r.ok ? 200 : 502 });
    } catch (e) {
        // Que se corte aquí NO significa que el barrido fallara: Render sigue.
        // Se registra y se deja que el pase de cierre diga la última palabra.
        const motivo = e instanceof Error ? e.message : 'error desconocido';
        console.warn(`⚖️ Seguimiento pase ${pase}: la llamada se cortó (${motivo}). `
            + 'Render puede seguir trabajando; el cierre lo confirmará.');
        return NextResponse.json({ pase, ok: false, aviso: motivo }, { status: 202 });
    }
}
