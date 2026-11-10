/**
 * Recordatorio de pago pendiente (9-nov-2026). Ver `src/lib/pago-pendiente.ts`.
 *
 *   Cron de Vercel, cada hora a los :25 (envía de 8:00 a 21:59 de México).
 *   GET /api/cron/pago-pendiente   con la cabecera `x-admin-key`: ensayo, cuenta
 *                                  a quién le escribiría sin enviar nada.
 *                                  `?modo=real` para enviar a mano.
 */
import { NextRequest, NextResponse } from 'next/server';
import { recordarPagosPendientes } from '@/lib/pago-pendiente';

export const fetchCache = 'force-no-store';
export const maxDuration = 120;

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';
    return null;
}

export async function GET(req: NextRequest) {
    const quien = quienLlama(req);
    if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const ensayo = quien === 'admin' && req.nextUrl.searchParams.get('modo') !== 'real';

    try {
        const r = await recordarPagosPendientes({ ensayo });
        console.log(`🛒 Pago pendiente${ensayo ? ' (ENSAYO)' : ''}: ${r.abiertas} abiertas · ${r.enviados} enviados · `
            + `omitidos ${JSON.stringify(r.omitidos)} · ${r.errores.length} errores${r.fuera_de_horario ? ' · fuera de horario' : ''}`);
        return NextResponse.json(r, { status: r.ok ? 200 : 500 });
    } catch (e) {
        console.error('pago-pendiente: falló', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error desconocido' },
            { status: 500 },
        );
    }
}
