/**
 * LA ATENCIÓN AUTOMÁTICA DE SOPORTE (2-nov-2026) · cada 10 minutos.
 *
 * Diagnostica los reportes pendientes y, sólo cuando David lo encienda, les
 * contesta con una plantilla aprobada. Toda la lógica y el porqué están en
 * `@/lib/soporte/atencion-automatica`; aquí sólo se arman los clientes.
 *
 * EL MODO lo decide ATENCION_MODO:
 *   · sin definir, o cualquier otra cosa → `simulacro`: diagnostica, anota en
 *     `atencion_casos` y arma el parte para David. No le escribe a ningún
 *     usuario: ni siquiera se crea el cliente de correo para usuarios.
 *   · `enviar` → además manda las plantillas cuyo sha256 esté aprobado en
 *     `plantillas_soporte`. Sin aprobación, tampoco sale nada.
 *   · `apagado` → no hace nada.
 *
 * A mano (con `x-admin-key`):
 *   GET /api/cron/atencion?simulacro=1         una vuelta en simulacro, aunque ATENCION_MODO=enviar
 *   GET /api/cron/atencion?parte=1             manda el parte ahora, aunque el último sea reciente
 *   GET /api/cron/atencion?ver=parte           el parte pendiente en HTML; no manda ni marca nada
 *   GET /api/cron/atencion?folio=4126-02       diagnostica un folio y pinta su correo; no escribe nada
 *
 * Ninguna llamada a modelos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { lectorStripeReal } from '@/lib/soporte/diagnostico';
import { atenderPendientes, diagnosticarFolio, vistaDelParte, modoAtencion } from '@/lib/soporte/atencion-automatica';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Sin caché de datos de Next en esta ruta GET (2-nov-2026). En Next 14.2 una
   ruta que sólo tiene GET guarda para siempre cada fetch —y supabase-js lee
   con fetch— aunque sea force-dynamic: la recogida del circuito de incidencias
   leyó la misma lista desde el 30-oct y el resumen diario salía en cada vuelta
   (rama atencion-reparar, 8f8f7c5). Aquí sería peor: se diagnosticarían los
   mismos reportes de ayer, con su perfil y su cobro de ayer. */
export const fetchCache = 'force-no-store';
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
    const p = req.nextUrl.searchParams;
    const admin = quien === 'admin';

    const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const stripe = process.env.STRIPE_SECRET_KEY ? lectorStripeReal() : null;
    const modo = admin && p.get('simulacro') === '1' ? 'simulacro' : modoAtencion();

    try {
        if (admin && p.get('folio')) {
            return NextResponse.json(await diagnosticarFolio(sb, stripe, p.get('folio')!));
        }
        if (admin && p.get('ver') === 'parte') {
            const parte = await vistaDelParte(sb, modo);
            if ('error' in parte) return NextResponse.json(parte, { status: 500 });
            return new NextResponse(parte.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
        }

        const clave = process.env.RESEND_API_KEY;
        const resultado = await atenderPendientes({
            sb,
            stripe,
            // El cliente para escribirle a usuarios sólo existe en modo «enviar».
            correoUsuarios: modo === 'enviar' && clave ? new Resend(clave) : null,
            correoInterno: clave ? new Resend(clave) : null,
            modo,
            forzarParte: admin && p.get('parte') === '1',
        });
        console.log('[atencion]', JSON.stringify(resultado).slice(0, 2000));
        return NextResponse.json(resultado);
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error('[atencion] la vuelta falló:', error);
        return NextResponse.json({ modo, error }, { status: 500 });
    }
}
