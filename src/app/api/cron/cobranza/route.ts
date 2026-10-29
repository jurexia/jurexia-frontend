/**
 * La cobranza de quincena. El cron de Vercel la dispara cada día a las 10:00
 * de la Ciudad de México (16:00 UTC): los días de nómina reintenta los cobros
 * rechazados por fondos, y todos los días manda el recordatorio o el último
 * aviso que toque. La lógica vive en `@/lib/cobranza`; aquí sólo está la puerta.
 *
 * ENSAYO, sin cobrar ni escribir a nadie:
 *   GET /api/cron/cobranza?dry=1               con la cabecera `x-admin-key`
 *   GET /api/cron/cobranza?dry=1&hoy=2026-10-30   como si hoy fuera ese día
 */

import { NextRequest, NextResponse } from 'next/server';
import { avisarParteDeCobranza, cobranzaDelDia } from '@/lib/cobranza';

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

    // El ensayo, y fingir otra fecha, son sólo del administrador; y fingir la
    // fecha sólo en ensayo: cobrar «como si fuera quincena» no es un ensayo.
    const ensayo = quien === 'admin' && req.nextUrl.searchParams.get('dry') === '1';
    const hoy = ensayo && /^\d{4}-\d{2}-\d{2}$/.test(req.nextUrl.searchParams.get('hoy') || '')
        ? req.nextUrl.searchParams.get('hoy')!
        : undefined;

    try {
        const r = await cobranzaDelDia({ ensayo, ...(hoy ? { hoy } : {}) });
        console.log(`💳 Cobranza ${r.hoy}${ensayo ? ' (ENSAYO)' : ''}${r.diaDeCobro ? ' · día de quincena' : ''}: `
            + `${r.revisadas} facturas · ${r.cobradas.length} cobradas · ${r.rechazadas.length} rechazadas · `
            + `${r.recordatorios.length} recordatorios · ${r.avisosFinales.length} últimos avisos · ${r.errores.length} errores`);
        await avisarParteDeCobranza(r);
        return NextResponse.json(r, { status: r.ok ? 200 : 500 });
    } catch (e) {
        console.error('cobranza: falló', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error desconocido' },
            { status: 500 },
        );
    }
}
