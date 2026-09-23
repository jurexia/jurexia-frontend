import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * El portal de facturación de Stripe: cambiar la tarjeta, ver los recibos,
 * liquidar lo que quedó abierto.
 *
 * DOS COSAS ESTABAN MAL (23-sep-2026), y se notaron el día que un cliente
 * pidió por correo un enlace para actualizar su pago:
 *
 * 1. NADIE PODÍA ABRIRLO. La ruta leía el correo de `body.email`, y ninguna de
 *    las tres pantallas que la llaman manda eso: `/perfil` manda `customerId`,
 *    y la pantalla de cuenta suspendida y `stripe-client` no mandan cuerpo
 *    ninguno. Las tres recibían 401 y caían al respaldo. El botón de «actualizar
 *    mi tarjeta» llevaba meses sin funcionar en ningún sitio.
 *
 * 2. Y AL MISMO TIEMPO ESTABA ABIERTA. Quien sí mandara `{email: "otro@..."}`
 *    —desde fuera, sin sesión— recibía un portal con los recibos de ese tercero,
 *    los últimos cuatro dígitos de su tarjeta y el botón de cancelar. Facturación
 *    ajena a un POST de distancia.
 *
 * Ahora manda la sesión y nada más: el correo sale del token de Supabase, el
 * cuerpo de la petición no se lee. Quien no tenga sesión, no entra.
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Inicie sesión para abrir su facturación' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        const userEmail = (user?.email || '').toLowerCase().trim();

        if (!userEmail) {
            return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
        }

        const stripe = getStripe();

        // Find customer by email
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            // Nunca pagó: no hay portal que abrir, pero sí una página de alta.
            return NextResponse.json(
                { error: 'No encontramos una suscripción a su nombre', alta: '/cuenta/suscripcion' },
                { status: 404 },
            );
        }

        const customerId = customers.data[0].id;
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://iurexia.com';

        // Create billing portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/cuenta/suscripcion`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('Portal session error:', error);
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
