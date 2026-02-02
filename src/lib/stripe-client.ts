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

        const { url, error } = await response.json();

        if (error) {
            throw new Error(error);
        }

        // Redirect to Stripe Checkout
        window.location.href = url;
    } catch (err) {
        console.error('Error redirecting to checkout:', err);
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
