/**
 * QUE NINGÚN REPORTE SE QUEDE SIN ATENDER (29-oct-2026) · cada 15 minutos.
 *
 * Tres pasos, independientes —si uno falla, los otros corren igual—:
 *
 *   1. AVISOS. Toda conversación de soporte llega a soporte@ una vez: la que
 *      no se escaló, cuando lleva veinte minutos quieta; la escalada cuyo
 *      aviso falló en el chat, en cuanto se pueda. Lo que no sale se reintenta
 *      en la vuelta siguiente (hasta 20 veces) y queda en el resumen.
 *   2. CIERRES. Lo respondido se cierra solo a las 72 h si el abogado no
 *      vuelve a escribir; también lo que el circuito de incidencias cerró o
 *      se marcó resuelto en el panel. Lo NO respondido nunca se cierra solo.
 *   3. RESUMEN. Una vez al día, a partir de las 8:00 de México, a soporte@ y
 *      a jdm.juridico@gmail.com: los reportes con más de 24 h sin respuesta.
 *      Si esa vuelta no logra mandarlo, lo intenta la siguiente.
 *
 * El paso a «respondido» no lo da este cron: lo da el Apps Script de soporte@
 * llamando a /api/soporte/atencion cuando ve salir una respuesta.
 *
 * Una sola entrada en vercel.json (cada 15 min). Ninguna llamada a modelos.
 *
 * A mano (con `x-admin-key`):
 *   GET /api/cron/reportes?simulacro=1     qué haría, sin mandar ni marcar
 *   GET /api/cron/reportes?resumen=1       manda el resumen ahora, aunque ya haya salido hoy
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { barrerAvisos, cerrarSolos, resumenDelDia } from '@/lib/soporte/reportes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    const clave = process.env.ADMIN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';
    return null;
}

export async function GET(req: NextRequest) {
    const quien = quienLlama(req);
    if (!quien) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });

    const simulacro = quien === 'admin' && req.nextUrl.searchParams.get('simulacro') === '1';
    const forzarResumen = quien === 'admin' && req.nextUrl.searchParams.get('resumen') === '1';

    const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
    const clave = process.env.RESEND_API_KEY;
    const resend = clave ? new Resend(clave) : null;

    // En orden y cada uno en su red: el resumen tiene que ver los avisos y
    // cierres de esta misma vuelta, y un paso que revienta no tumba al siguiente.
    const paso = async <T,>(f: () => Promise<T>) => {
        try { return await f(); } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
    };
    const avisos = await paso(() => barrerAvisos(sb, resend, simulacro));
    const cierres = await paso(() => cerrarSolos(sb, simulacro));
    const resumen = await paso(() => resumenDelDia(sb, resend, { simulacro, forzar: forzarResumen }));

    const parte = { simulacro, avisos, cierres, resumen };
    console.log('[reportes]', JSON.stringify(parte).slice(0, 2000));
    return NextResponse.json(parte);
}
