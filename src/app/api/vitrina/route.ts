/**
 * La autorización para aparecer en la vitrina de la web.
 *
 * POR QUÉ ESTO NO ES UN FORMULARIO CUALQUIERA
 * -------------------------------------------
 * Publicar el nombre, la fotografía y el testimonio de un abogado es
 * tratamiento de datos personales (LFPDPPP), y su logo es marca de su
 * titular. El consentimiento tiene que ser EXPRESO, con alcance definido y
 * revocable — y sobre todo tiene que quedar ASENTADO, porque el día que
 * alguien pida que se le retire, la conversación se resuelve con la fecha y
 * el alcance que él mismo marcó, no con la memoria de nadie.
 *
 * Por eso cada casilla viaja por separado: se puede prestar el logo del
 * despacho sin prestar la cara, y decirlo sin renunciar a lo demás.
 *
 * NADA SE PUBLICA AUTOMÁTICAMENTE. La autorización nace `pendiente`; David
 * la aprueba. El beneficio, en cambio, se entrega en el acto: quien cumplió
 * su parte no debe esperar a que nosotros hagamos la nuestra.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

async function usuarioDelToken(req: NextRequest) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const { data } = await admin().auth.getUser(token);
    return data.user ?? null;
}

export async function GET(req: NextRequest) {
    const user = await usuarioDelToken(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data } = await admin()
        .from('vitrina_autorizaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .maybeSingle();

    return NextResponse.json({ autorizacion: data ?? null });
}

export async function POST(req: NextRequest) {
    const user = await usuarioDelToken(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const cuerpo = await req.json().catch(() => ({}));
    const {
        despacho, cargo, testimonio, enlace,
        logo_path, foto_path,
        consiente_nombre, consiente_logo, consiente_foto, consiente_testimonio,
    } = cuerpo;

    // Sin nombre no hay vitrina: es lo mínimo que se publica. El resto es
    // opcional a propósito.
    if (!consiente_nombre) {
        return NextResponse.json(
            { error: 'Hace falta autorizar al menos la publicación de su nombre.' },
            { status: 400 },
        );
    }

    // El testimonio lo escribe él. Ni se sugiere ni se corrige: un testimonio
    // redactado por nosotros no es un testimonio, es publicidad con su firma.
    const texto = String(testimonio || '').trim();
    if (consiente_testimonio && texto.length < 40) {
        return NextResponse.json(
            { error: 'El testimonio necesita al menos unas líneas para que sirva.' },
            { status: 400 },
        );
    }

    const ahora = new Date().toISOString();
    const fila = {
        usuario_id: user.id,
        despacho: (despacho || '').trim() || null,
        cargo: (cargo || '').trim() || null,
        testimonio: texto || null,
        enlace: (enlace || '').trim() || null,
        logo_path: logo_path || null,
        foto_path: foto_path || null,
        consiente_nombre: !!consiente_nombre,
        consiente_logo: !!consiente_logo,
        consiente_foto: !!consiente_foto,
        consiente_testimonio: !!consiente_testimonio,
        consentimiento_at: ahora,
        // Editar la autorización la devuelve a revisión: si cambió el
        // testimonio, lo publicado ya no es lo que autorizó.
        estado: 'pendiente',
        revocado_at: null,
        actualizado_at: ahora,
    };

    const { data, error } = await admin()
        .from('vitrina_autorizaciones')
        .upsert(fila, { onConflict: 'usuario_id' })
        .select()
        .single();

    if (error) {
        console.error('vitrina: no pude guardar la autorización', error);
        return NextResponse.json({ error: 'No se pudo guardar. Intente de nuevo.' }, { status: 500 });
    }

    // ── El beneficio, en el acto ────────────────────────────────────────
    // Quien ya cumplió su parte no espera a que aprobemos nada. Se entrega
    // una sola vez: `beneficio_at` es el candado, no la buena fe.
    let beneficio = null;
    if (!data.beneficio_at) {
        try {
            const { otorgarBeneficioVitrina } = await import('@/lib/referidos-backend');
            const r = await otorgarBeneficioVitrina(user.id);
            if (r.otorgado) {
                beneficio = { dias: r.dias, plan: r.plan, vence_at: r.vence_at };
                await admin().from('vitrina_autorizaciones')
                    .update({ beneficio_at: ahora }).eq('usuario_id', user.id);
            } else {
                // Ya estaba en Platinum: no hay nada que subirle, y decirle que
                // «se otorgó» sería mentira.
                beneficio = { yaLoTenia: true, motivo: r.motivo };
                await admin().from('vitrina_autorizaciones')
                    .update({ beneficio_at: ahora }).eq('usuario_id', user.id);
            }
        } catch (e) {
            // El beneficio puede reintentarse; la autorización YA quedó
            // asentada, que es lo que no se puede perder.
            console.error('vitrina: la autorización se guardó pero el beneficio falló', e);
        }
    }

    return NextResponse.json({ ok: true, autorizacion: data, beneficio });
}

/** Revocar. Sin preguntas ni fricción: es su derecho, no una concesión. */
export async function DELETE(req: NextRequest) {
    const user = await usuarioDelToken(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const ahora = new Date().toISOString();
    await admin()
        .from('vitrina_autorizaciones')
        .update({ revocado_at: ahora, estado: 'rechazada', actualizado_at: ahora })
        .eq('usuario_id', user.id);

    // El Platinum ya entregado NO se retira. Se ganó por autorizar en su
    // momento, y quitárselo al revocar convertiría el derecho a revocar en
    // una multa.
    return NextResponse.json({ ok: true });
}
