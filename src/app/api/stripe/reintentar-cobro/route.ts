import { NextRequest, NextResponse } from 'next/server';
import { correoDeLaSesion, reintentarCobro } from '@/lib/cobro-pendiente';

/**
 * Cobrar al volver del portal con la tarjeta nueva (28-sep-2026).
 *
 * Sin esto, quien actualiza su tarjeta seguiría suspendido hasta el siguiente
 * reintento de Stripe —días— y además con la tarjeta VIEJA, porque la
 * suscripción conserva la suya. Ver `@/lib/cobro-pendiente`.
 *
 * Sólo cobra el adeudo de la propia sesión: el correo sale del token.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const email = await correoDeLaSesion(req);
    if (!email) {
        return NextResponse.json({ error: 'Inicie sesión para completar el pago' }, { status: 401 });
    }
    try {
        return NextResponse.json(await reintentarCobro(email));
    } catch (e) {
        console.error(`reintento de cobro de ${email}: falló`, e);
        return NextResponse.json({ error: 'No pudimos completar el cobro' }, { status: 500 });
    }
}
