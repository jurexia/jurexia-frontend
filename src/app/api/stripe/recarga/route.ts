/**
 * COMPRAR UNA RECARGA DE PROYECTOS DEL TALLER.
 *
 * David, 13-sep-2026: «implementa recargas en Stripe de 250 pesos que serán
 * útiles para generar 10 proyectos adicionales sin fecha de caducidad».
 *
 * VA EN SU PROPIA RUTA Y NO EN `/api/stripe/checkout`, que es la de los planes.
 * Aquélla lleva un guardián de suscripciones duplicadas —mira si ya hay una
 * activa y decide si es alta, mejora o rebaja— y una recarga no es nada de eso:
 * es un pago único que se suma a lo que ya se tiene. Pasarla por ahí sería
 * pedirle a ese guardián que juzgue algo para lo que no fue escrito, y el
 * resultado más probable es que bloquee la compra de quien ya paga un plan, que
 * es justo quien recarga.
 *
 * Lo que hace que el abono sea seguro está en el webhook y en la base: la
 * sesión viaja marcada con `ruta=recarga_taller` y el número de proyectos, y el
 * abono es idempotente porque Stripe reintenta.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

/** Diez proyectos por 250 MXN. El precio vive en Stripe; esto es su nombre. */
const PRECIO_RECARGA = process.env.STRIPE_PRICE_RECARGA_TALLER
    || 'price_1UFO9F3uD85CqvjMNDK3Kqg7';
const PROYECTOS_POR_RECARGA = 10;

export async function POST(request: NextRequest) {
    try {
        const cuerpo = await request.json().catch(() => ({}));
        let correo: string | undefined = cuerpo?.email;

        /* EL CORREO SALE DEL TOKEN, NO DEL CUERPO, cuando hay sesión. Si se
           aceptara el del cuerpo sin más, cualquiera podría recargarle la
           cuenta a otro —o, peor, hacer que el abono caiga en una cuenta ajena
           pagando él—. El del cuerpo queda sólo como respaldo para quien compra
           sin haber entrado. */
        const auth = request.headers.get('authorization');
        if (auth?.startsWith('Bearer ')) {
            try {
                const sb = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                );
                const { data: { user } } = await sb.auth.getUser(auth.replace('Bearer ', ''));
                if (user?.email) correo = user.email;
            } catch { /* se queda el del cuerpo */ }
        }

        if (!correo) {
            return NextResponse.json(
                { error: 'Necesitas haber entrado para recargar proyectos.' },
                { status: 401 },
            );
        }
        correo = correo.toLowerCase().trim();

        const stripe = getStripe();
        const origen = request.headers.get('origin')
            || process.env.NEXT_PUBLIC_SITE_URL
            || 'https://iurexia.com';

        // Se reutiliza el cliente de Stripe si ya existe, para que la recarga
        // salga en la misma factura y el mismo historial que su plan.
        const previos = await stripe.customers.list({ email: correo, limit: 1 });
        const cliente = previos.data[0]?.id;

        const sesion = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: PRECIO_RECARGA, quantity: 1 }],
            ...(cliente ? { customer: cliente } : { customer_email: correo }),
            // EL WEBHOOK LEE DE AQUÍ. Sin estas dos marcas la sesión entra por
            // el camino de las suscripciones y acaba recalculando el plan a
            // partir de un precio que no es de ningún plan.
            metadata: {
                ruta: 'recarga_taller',
                proyectos: String(PROYECTOS_POR_RECARGA),
                userEmail: correo,
            },
            payment_intent_data: {
                metadata: { ruta: 'recarga_taller', userEmail: correo },
            },
            // ACEPTAR LOS TÉRMINOS ES PARTE DEL PAGO, no una casilla que se
            // pueda saltar: Stripe exige la aceptación en la propia pantalla de
            // cobro y guarda constancia de cuándo se dio.
            consent_collection: { terms_of_service: 'required' },
            custom_text: {
                terms_of_service_acceptance: {
                    message: 'Acepto los [términos y condiciones](https://iurexia.com/terminos) '
                           + 'de Iurexia, incluida la cláusula sobre el uso del redactor de '
                           + 'sentencias como herramienta de apoyo.',
                },
            },
            success_url: `${origen}/tcc-beta?recarga=ok&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origen}/tcc-beta?recarga=cancelada`,
        });

        return NextResponse.json({ url: sesion.url, sessionId: sesion.id });
    } catch (e) {
        console.error('❌ No se pudo abrir el cobro de la recarga:', e);
        return NextResponse.json(
            { error: 'No se pudo abrir el cobro. Inténtalo de nuevo.' },
            { status: 500 },
        );
    }
}
