/**
 * La alarma de servicio: vigila que el chat esté respondiendo.
 *
 * Corre cada media hora, todos los días, porque una caída no espera al parte
 * diario ni respeta el fin de semana. El 3-sep-2026 hubo 45 consultas sin
 * respuesta de 14 abogados y nos enteramos porque una de ellas lo reportó,
 * después de intentarlo siete veces.
 *
 * La lógica vive en `@/lib/correo/alerta-fallos-chat`. Aquí sólo está la
 * puerta: quién puede llamar y qué se le contesta.
 *
 * PARA VER CÓMO ESTÁ SIN MANDAR NADA:
 *   GET /api/correo/fallos?dry=1   con la cabecera `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';
import { revisarFallosDeChat, revisarSilencioDeChat } from '@/lib/correo/alerta-fallos-chat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    // El ensayo es sólo para el administrador: una alarma que no suena no es
    // una alarma, y al cron no se le da la opción de callarse.
    const ensayo = quien === 'admin' && req.nextUrl.searchParams.get('dry') === '1';

    try {
        // Las dos comprobaciones son independientes y ninguna puede tumbar a la
        // otra: si contar fallos revienta, el detector de silencio —que es el
        // que ve la caída total— tiene que seguir corriendo igual.
        const [fallos, silencio] = await Promise.allSettled([
            ensayo ? Promise.resolve('(ensayo: no se comprueba)') : revisarFallosDeChat(),
            ensayo ? Promise.resolve('(ensayo: no se comprueba)') : revisarSilencioDeChat(),
        ]);
        const leer = (r: PromiseSettledResult<string>) =>
            r.status === 'fulfilled' ? r.value : `error: ${r.reason}`;

        const salida = { ok: true, fallos: leer(fallos), silencio: leer(silencio) };
        console.log('alarma de servicio:', salida.fallos, '|', salida.silencio);
        return NextResponse.json(salida);
    } catch (e) {
        console.error('alarma de servicio: falló la revisión', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error desconocido' },
            { status: 500 },
        );
    }
}
