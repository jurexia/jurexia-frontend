/**
 * El parte semanal de salud. Lo dispara el cron de Vercel los domingos a las
 * 21:00 de Ciudad de México — que en el `vercel.json` se escribe como lunes a
 * las 03:00 UTC, porque los crones de Vercel corren en UTC y México va seis
 * horas por detrás todo el año.
 *
 * La lógica entera vive en `@/lib/correo/salud-financiera`. Aquí sólo está la
 * puerta: quién puede llamar y qué se le contesta.
 *
 * PARA PROBARLO SIN MANDAR NADA:
 *   GET /api/correo/salud?dry=1   con la cabecera `x-admin-key`
 * Devuelve las cifras y el HTML sin escribir en la tabla ni tocar Resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generarReporteSalud } from '@/lib/correo/salud-financiera';

export const dynamic = 'force-dynamic';
/** Stripe se pagina entero: con 69 suscripciones sobra, pero no hay prisa. */
export const maxDuration = 300;

/**
 * Vercel firma sus crones con CRON_SECRET. Se acepta también la clave de
 * administración para poder dispararlo a mano, igual que el parte diario.
 */
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

    // El ensayo es SÓLO para el administrador: un cron que no manda el parte
    // es un cron que no sirve, y no se le va a dar la opción de equivocarse.
    const ensayo = quien === 'admin' && req.nextUrl.searchParams.get('dry') === '1';
    const conHtml = req.nextUrl.searchParams.get('html') === '1';

    try {
        const r = await generarReporteSalud({ enviar: !ensayo });
        if (!r.ok) console.error('salud: el parte no salió limpio', r.error);
        return NextResponse.json(conHtml ? r : { ...r, html: undefined }, { status: r.ok ? 200 : 500 });
    } catch (e) {
        console.error('salud: falló el parte semanal', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error desconocido' },
            { status: 500 },
        );
    }
}
