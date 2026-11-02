import { NextRequest, NextResponse } from 'next/server';
import { correoDeLaSesion, reintentarCobro } from '@/lib/cobro-pendiente';

/**
 * Cobrar al volver del portal con la tarjeta nueva (28-sep-2026).
 *
 * Sin esto, quien actualiza su tarjeta seguiría suspendido hasta el siguiente
 * reintento de Stripe —días— y además con la tarjeta VIEJA, porque la
 * suscripción conserva la suya. Ver `@/lib/cobro-pendiente`.
 *
 * Desde el 2-nov-2026 el muro también llama al pintarse, con
 * `{ automatico: true }`: cobra sólo si hay una tarjeta dada de alta después
 * de la deuda que aún no se haya probado. Sin cuerpo es el regreso del portal.
 *
 * Sólo cobra el adeudo de la propia sesión: el correo sale del token.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const email = await correoDeLaSesion(req);
    if (!email) {
        return NextResponse.json({ error: 'Inicie sesión para completar el pago' }, { status: 401 });
    }
    const cuerpo = (await req.json().catch(() => null)) as { automatico?: unknown } | null;
    const automatico = cuerpo?.automatico === true;
    try {
        return NextResponse.json(await reintentarCobro(email, { automatico }));
    } catch (e) {
        console.error(`reintento de cobro de ${email}${automatico ? ' (al entrar)' : ''}: falló`, e);
        return NextResponse.json({ error: 'No pudimos completar el cobro' }, { status: 500 });
    }
}
