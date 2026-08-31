/**
 * El barrido diario de impagos. Lo dispara el cron de Vercel cada día a las
 * 08:00 de Ciudad de México (14:00 UTC).
 *
 * Suspende a quien lleva 14 días sin pagar y reactiva a quien ya pagó. La
 * lógica vive en `@/lib/suscripciones-morosas`; aquí sólo está la puerta.
 *
 * ENSAYO, sin tocar a nadie:
 *   GET /api/suscripciones/revisar?dry=1   con la cabecera `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';
import { revisarMorosos } from '@/lib/suscripciones-morosas';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    // El ensayo es sólo para el administrador: un cron que no suspende no sirve.
    const ensayo = quien === 'admin' && req.nextUrl.searchParams.get('dry') === '1';

    try {
        const r = await revisarMorosos({ ensayo });
        console.log(`🧹 Barrido de impagos${ensayo ? ' (ENSAYO)' : ''}: `
            + `${r.revisadas} revisadas · ${r.suspendidos.length} suspendidos · `
            + `${r.reactivados.length} reactivados · ${r.en_gracia.length} en gracia`);
        return NextResponse.json({ ensayo, ...r }, { status: r.ok ? 200 : 500 });
    } catch (e) {
        console.error('barrido de impagos: falló', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error desconocido' },
            { status: 500 },
        );
    }
}
