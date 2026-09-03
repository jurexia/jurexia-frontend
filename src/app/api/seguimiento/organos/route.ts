/**
 * Buscador de órganos jurisdiccionales para el alta.
 *
 * Lee el catálogo con la clave de SERVICIO, no con la anónima. La política de
 * `seg_organos` es «for select to authenticated», y la clave anónima no lo
 * está: devolvía cero filas aunque el catálogo tuviera los 949 órganos. Como
 * esto corre en el servidor y el directorio de juzgados es información pública
 * —lo publica el propio Consejo—, no hay nada que proteger aquí.
 *
 * El buscador va por palabras sueltas y no por frase: el abogado escribe
 * «primero distrito baja california» y el nombre real es «Juzgado Primero de
 * Distrito en el Estado de Baja California». Buscar la frase entera no
 * encontraría nada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const q = (req.nextUrl.searchParams.get('q') || '').trim();
    const jurisdiccion = req.nextUrl.searchParams.get('jurisdiccion') || '';
    if (q.length < 3) return NextResponse.json({ organos: [] });

    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let sel = db.from('seg_organos')
        .select('id,jurisdiccion,clave_externa,nombre,entidad,materia,familia')
        .eq('activo', true)
        .limit(25);

    if (jurisdiccion) sel = sel.eq('jurisdiccion', jurisdiccion);
    // Una condición ilike por palabra: todas tienen que aparecer.
    for (const palabra of q.split(/\s+/).slice(0, 6)) {
        sel = sel.ilike('nombre', `%${palabra}%`);
    }

    const { data, error } = await sel;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ organos: data ?? [] });
}
