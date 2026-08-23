import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exigirAdmin } from '@/lib/guardia-admin';

/**
 * Editar y dar de baja fichas del directorio de abogados.
 *
 * POR QUÉ EXISTE (23-ago-2026)
 * ----------------------------
 * El panel de administración editaba y BORRABA fichas llamando a Supabase
 * directamente desde el navegador con la llave pública. Funcionaba por una
 * razón incómoda: la tabla tenía una política llamada `service_role_full_access`
 * que estaba concedida al rol `public` con `USING true`. O sea, el nombre decía
 * «sólo el servidor» y el contenido decía «todo el mundo».
 *
 * El panel sólo se ocultaba comprobando el correo EN EL NAVEGADOR
 * (perfil/page.tsx: `user.email === ADMIN_EMAIL`). Esconder un botón no es
 * cerrar una puerta: cualquiera podía llamar a la tabla por su cuenta y
 * modificar o vaciar las fichas de los catorce abogados.
 *
 * Al cerrar la política, esas escrituras dejan de funcionar desde el cliente —a
 * propósito— y pasan por aquí, donde el token se verifica CONTRA Supabase y se
 * comprueba que su dueño es administrador de verdad.
 *
 * La LECTURA no pasa por aquí: el directorio es público a propósito, porque la
 * app y la web muestran los abogados a quien busca uno. Eso no cambia.
 */

function servicio() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

/** Sólo estos campos. Una lista blanca, para que el cliente no elija columnas. */
const EDITABLES = [
    'full_name', 'specialties', 'bio', 'estado',
    'municipio', 'cp', 'phone', 'phone_visible',
] as const;

export async function PATCH(req: NextRequest) {
    const yo = await exigirAdmin(req);
    if (yo instanceof NextResponse) return yo;

    let cuerpo: Record<string, unknown>;
    try {
        cuerpo = await req.json();
    } catch {
        return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
    }

    const id = typeof cuerpo.id === 'string' ? cuerpo.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

    // Se copia campo a campo desde la lista blanca. Volcar el cuerpo entero
    // dejaría que el cliente escribiera columnas que no le tocan.
    const cambios: Record<string, unknown> = {};
    for (const campo of EDITABLES) {
        if (campo in cuerpo) cambios[campo] = cuerpo[campo];
    }
    if (Object.keys(cambios).length === 0) {
        return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { data, error } = await servicio()
        .from('lawyer_profiles')
        .update(cambios)
        .eq('id', id)
        .select('id');

    if (error) {
        console.error('abogados PATCH:', error.message);
        return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
    }
    if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No existe esa ficha' }, { status: 404 });
    }

    console.log(`⚖️ ${yo.email} editó la ficha de abogado ${id}`);
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    const yo = await exigirAdmin(req);
    if (yo instanceof NextResponse) return yo;

    const id = (req.nextUrl.searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

    const { data, error } = await servicio()
        .from('lawyer_profiles')
        .delete()
        .eq('id', id)
        .select('id');

    if (error) {
        console.error('abogados DELETE:', error.message);
        return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 });
    }
    if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No existe esa ficha' }, { status: 404 });
    }

    console.log(`⚖️ ${yo.email} dio de baja la ficha de abogado ${id}`);
    return NextResponse.json({ ok: true });
}
