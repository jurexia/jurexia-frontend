/**
 * Avance del programa de referidos del usuario que consulta.
 *
 * La identidad NO se toma del cuerpo ni de la query: se resuelve desde el
 * token de sesión. Si se aceptara un `usuario_id` por parámetro, cualquiera
 * podría leer los referidos y el plan de otro abogado cambiando un número.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { estadoDeReferidos } from '@/lib/referidos-backend';

export async function GET(req: NextRequest) {
    const cabecera = req.headers.get('authorization') ?? '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : '';
    if (!token) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) {
        return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
    }

    try {
        return NextResponse.json(await estadoDeReferidos(data.user.id));
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
        );
    }
}
