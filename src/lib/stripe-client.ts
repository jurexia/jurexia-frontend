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
export async function redirectToCheckout(priceId: string, userEmail?: string) {
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

// Open Stripe Customer Portal
export async function openCustomerPortal() {
    try {
        const response = await fetch('/api/stripe/portal', {
            method: 'POST',
        });

        const { url, error } = await response.json();

        if (error) {
            throw new Error(error);
        }

        window.location.href = url;
    } catch (err) {
        console.error('Error opening customer portal:', err);
        throw err;
    }
}
