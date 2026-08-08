/**
 * La retención antes de cancelar: el motivo y la pausa.
 *
 * LA REGLA QUE GOBIERNA ESTE ARCHIVO (acordada con David, 8-ago-2026)
 * -------------------------------------------------------------------
 * Esta ruta NUNCA cancela ni deja de cancelar: eso sigue siendo asunto de
 * /api/stripe/cancel, que el usuario alcanza con un clic en todo momento.
 * El art. 76 bis fr. VII de la LFPC exige que la baja sea tan sencilla como
 * el alta — y nuestro público es el único gremio que litiga eso por oficio.
 * Aquí sólo se hacen dos cosas que el usuario PIDE:
 *
 *   · guardar el motivo por el que se va (alimenta al clasificador de
 *     soporte y le dice a David qué arreglar), y
 *   · pausar la suscripción un mes sin cargo, la alternativa real a
 *     cancelar: el que pausa vuelve; el que cancela, casi nunca.
 *
 * LA PAUSA, en concreto: `pause_collection` con `behavior: 'void'` y
 * `resumes_at` a +30 días. Stripe no emite factura durante la pausa y el
 * acceso se conserva — cuesta un mes de servicio, que es barato contra
 * perder al suscriptor. Se otorga UNA vez por suscripción: el candado va en
 * `metadata.pausa_retencion` de la propia suscripción de Stripe, no en
 * Supabase, para que ni un borrón de base ni un webhook lo pierdan.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

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

export async function POST(req: NextRequest) {
    const user = await usuarioDelToken(req);
    if (!user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const cuerpo = await req.json().catch(() => ({}));
    const { accion } = cuerpo;

    // ── Guardar el motivo ────────────────────────────────────────────────
    // Va a user_feedback con categoría propia: es la materia prima del
    // clasificador y del tablero de soporte. Se guarda aunque después el
    // usuario decida quedarse — el motivo de casi-irse vale igual.
    if (accion === 'motivo') {
        const motivo = String(cuerpo.motivo || '').slice(0, 60);
        const texto = String(cuerpo.texto || '').trim().slice(0, 2000);
        if (!motivo) return NextResponse.json({ error: 'Falta el motivo' }, { status: 400 });

        // OJO con dos trampas ya pisadas aquí (8-ago-2026):
        //   1. user_feedback tiene un CHECK que sólo admite las categorías
        //      'error' | 'mejora' | 'otro'. «cancelacion» rebotaba con 23514,
        //      así que el motivo viaja como PREFIJO del mensaje.
        //   2. supabase-js NO rechaza la promesa cuando hay error: resuelve
        //      con {error}. Un .then(ok, fallo) jamás entra al fallo y el
        //      insert fallido pasa en silencio — la ruta contestaba ok:true
        //      sin haber guardado nada. Se comprueba {error} a mano.
        const { error: eMotivo } = await admin().from('user_feedback').insert({
            user_id: user.id,
            user_email: user.email,
            user_name: (user.user_metadata as any)?.full_name ?? null,
            category: 'otro',
            message: texto ? `[cancelación · ${motivo}] ${texto}` : `[cancelación · ${motivo}]`,
            status: 'pendiente',
        });
        if (eMotivo) console.error('retención: no pude guardar el motivo', eMotivo);

        return NextResponse.json({ ok: true });
    }

    // ── Pausar un mes ────────────────────────────────────────────────────
    if (accion === 'pausar') {
        const subscriptionId = String(cuerpo.subscriptionId || '');
        if (!subscriptionId.startsWith('sub_')) {
            return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
        }

        try {
        const stripe = getStripe();

        // La misma verificación de propiedad que la ruta de cancelación:
        // el correo del cliente de Stripe debe ser el del token. Sin esto,
        // cualquiera con un sub_id ajeno pausaría suscripciones de otros.
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const cliente = await stripe.customers.retrieve(sub.customer as string);
        const correoCliente = ((cliente as { email?: string }).email || '').toLowerCase().trim();
        if (correoCliente !== user.email.toLowerCase().trim()) {
            return NextResponse.json({ error: 'No tienes permiso sobre esta suscripción' }, { status: 403 });
        }

        if (sub.metadata?.pausa_retencion) {
            return NextResponse.json(
                { error: 'Esta suscripción ya usó su pausa. Si necesita otra, escríbanos a soporte@iurexia.com.' },
                { status: 409 },
            );
        }
        if (sub.pause_collection) {
            return NextResponse.json({ error: 'La suscripción ya está en pausa.' }, { status: 409 });
        }

        const reanuda = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
        await stripe.subscriptions.update(subscriptionId, {
            pause_collection: { behavior: 'void', resumes_at: reanuda },
            // Si venía con cancelación programada y eligió pausar, la pausa
            // la sustituye: pausar ES la decisión de quedarse.
            cancel_at_period_end: false,
            metadata: { ...sub.metadata, pausa_retencion: new Date().toISOString().slice(0, 10) },
        });

        // Constancia para el tablero.
        const { error: ePausa } = await admin().from('user_feedback').insert({
            user_id: user.id, user_email: user.email,
            user_name: (user.user_metadata as any)?.full_name ?? null,
            category: 'otro',
            message: '[cancelación · pausa_aceptada] Pausó un mes en lugar de cancelar.',
            status: 'resuelto', resolved_at: new Date().toISOString(),
        });
        if (ePausa) console.error('retención: no pude asentar la pausa', ePausa);

        console.log(`⏸️ Retención: ${user.email} pausó ${subscriptionId} hasta ${new Date(reanuda * 1000).toISOString().slice(0, 10)}`);
        return NextResponse.json({
            ok: true,
            reanuda: new Date(reanuda * 1000).toISOString(),
        });
        } catch (e) {
            // Un fallo aquí no puede dejar al usuario ante un 500 mudo: está
            // a un clic de irse y la pausa es nuestro último argumento.
            console.error('retención: la pausa falló', e);
            return NextResponse.json(
                { error: 'No se pudo pausar en este momento. Escríbanos a soporte@iurexia.com y lo hacemos nosotros.' },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ error: `Acción desconocida: ${accion}` }, { status: 400 });
}
