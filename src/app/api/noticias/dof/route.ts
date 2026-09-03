/**
 * Acopio diario del Diario Oficial de la Federación.
 *
 * Lo dispara el cron de Vercel entre semana, ya publicada la matutina. Mira
 * varios días hacia atrás en cada pasada para curarse solo si un día falla.
 *
 * ENSAYO, sin escribir en la base:
 *   GET /api/noticias/dof?dry=1        con la cabecera `x-admin-key`
 * Cuántos días mirar:
 *   GET /api/noticias/dof?dias=30      con la cabecera `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { traerDOF } from '@/lib/noticias-dof';

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

    const ensayo = quien === 'admin' && req.nextUrl.searchParams.get('dry') === '1';
    // El cron mira una semana; a mano se puede pedir más para rellenar el hueco
    // de una temporada. El tope evita una pasada de meses por un dedazo.
    const pedidos = Number(req.nextUrl.searchParams.get('dias') || 8);
    const dias = Math.min(Math.max(Number.isFinite(pedidos) ? pedidos : 8, 1), 120);

    try {
        const { filas, fallos } = await traerDOF(dias);

        if (ensayo) {
            return NextResponse.json({
                ensayo: true, dias, encontradas: filas.length, fallos,
                muestra: filas.slice(0, 5),
            });
        }

        if (filas.length === 0) {
            // Sin notas y con fallos es un problema; sin notas y sin fallos es
            // un puente festivo. Se distinguen para no gritar en vano.
            return NextResponse.json({ ok: fallos.length === 0, dias, guardadas: 0, fallos });
        }

        const db = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const { error } = await db
            .from('noticias')
            .upsert(filas.map(f => ({ ...f, updated_at: new Date().toISOString() })),
                    { onConflict: 'id' });

        if (error) throw new Error(error.message);

        console.log(`📰 DOF: ${filas.length} notas guardadas de ${dias} días`
            + (fallos.length ? ` · ${fallos.length} días fallaron` : ''));

        return NextResponse.json({ ok: true, dias, guardadas: filas.length, fallos });
    } catch (e) {
        console.error('acopio del DOF: falló', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error desconocido' },
            { status: 500 },
        );
    }
}
