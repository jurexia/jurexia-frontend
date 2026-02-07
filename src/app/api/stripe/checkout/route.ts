import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { priceId, email: providedEmail } = await request.json();

        if (!priceId) {
            return NextResponse.json(
                { error: 'Price ID is required' },
                { status: 400 }
            );
        }

        // Try to get email from Supabase Auth token
        let customerEmail = providedEmail;

        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
                if (user?.email) {
                    customerEmail = user.email;
                }
            } catch {
                // Fall back to provided email
            }
        }

        if (!customerEmail) {
            return NextResponse.json(
                { error: 'Email is required. Please log in or provide an email.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();

        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({
            email: customerEmail,
            limit: 1,
        });

        let customerId: string | undefined;

        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        }

        // Determine the base URL for redirects
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://iurexia.com';

        // Create Stripe Checkout Session
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: customerId,
            customer_email: customerId ? undefined : customerEmail,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout/cancel`,
            metadata: {
                userEmail: customerEmail,
            },
            subscription_data: {
                metadata: {
                    userEmail: customerEmail,
                },
            },
            // Allow promotion codes
            allow_promotion_codes: true,
            // Billing address collection
            billing_address_collection: 'required',
            // Locale
            locale: 'es',
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
