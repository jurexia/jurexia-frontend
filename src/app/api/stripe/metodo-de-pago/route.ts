import { NextRequest, NextResponse } from 'next/server';
import { correoDeLaSesion, origenDe, salidaDelMuro } from '@/lib/cobro-pendiente';

/**
 * El botón del muro de suspensión: «Actualizar mi método de pago» (28-sep-2026).
 *
 * Devuelve a dónde ir. Normalmente, el portal de Stripe abierto directamente
 * en el alta de una tarjeta nueva, que al terminar vuelve a
 * `/chat?pago=actualizado`; ahí el muro llama a `/api/stripe/reintentar-cobro`.
 * La lógica vive en `@/lib/cobro-pendiente`.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const email = await correoDeLaSesion(req);
    if (!email) {
        return NextResponse.json({ error: 'Inicie sesión para actualizar su método de pago' }, { status: 401 });
    }
    try {
        return NextResponse.json(await salidaDelMuro(email, origenDe(req)));
    } catch (e) {
        console.error(`método de pago de ${email}: falló`, e);
        return NextResponse.json({ error: 'No pudimos abrir su método de pago' }, { status: 500 });
    }
}
