'use client';

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
    if (!stripePromise) {
        stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    }
    return stripePromise;
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(priceId: string, userEmail?: string, promo?: string) {
    console.log('🔄 redirectToCheckout called with:', { priceId, userEmail });

    try {
        const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId,
                email: userEmail,
                ...(promo ? { promo } : {}),
            }),
        });

        console.log('📡 API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API error response:', errorText);

            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                throw new Error(`Server error: ${response.status}`);
            }

            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const { url, error } = await response.json();

        if (error) {
            console.error('❌ Checkout error from API:', error);
            throw new Error(error);
        }

        if (!url) {
            console.error('❌ No checkout URL received');
            throw new Error('No se recibió URL de pago');
        }

        console.log('✅ Redirecting to Stripe Checkout:', url);
        // Redirect to Stripe Checkout
        window.location.href = url;
    } catch (err: any) {
        console.error('❌ Error in redirectToCheckout:', err);
        throw err;
    }
}

/**
 * La dirección del portal de facturación del usuario CON SESIÓN.
 *
 * Va aquí y no repetida en cada pantalla porque la ruta exige el token de
 * Supabase: las tres llamadas que había —`/perfil` con `customerId`, la cuenta
 * suspendida y ésta, las dos sin cuerpo— mandaban lo que la ruta no leía y
 * recibían 401. Un solo sitio que sepa pedirlo bien.
 *
 * Devuelve null cuando no hay portal que abrir (sin sesión, o nunca pagó): el
 * que llama decide si manda a iniciar sesión o a la página de alta.
 */
export async function urlPortalFacturacion(): Promise<string | null> {
    try {
        const { getSession } = await import('@/lib/supabase');
        const sesion = await getSession();
        const token = sesion?.access_token;
        if (!token) return null;
        const r = await fetch('/api/stripe/portal', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json().catch(() => ({}));
        return d?.url || null;
    } catch (err) {
        console.error('portal de facturación:', err);
        return null;
    }
}

/** Abre el portal en esta misma pestaña. Devuelve false si no había portal. */
export async function openCustomerPortal(): Promise<boolean> {
    const url = await urlPortalFacturacion();
    if (!url) return false;
    window.location.href = url;
    return true;
}
