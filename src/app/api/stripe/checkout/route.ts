import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isUpgrade, getPlanIdFromPriceId } from '@/lib/stripe';
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

            // ═══ DUPLICATE SUBSCRIPTION GUARD ═══
            // Prevent double charges while allowing plan upgrades/changes
            const existingSubs = await stripe.subscriptions.list({
                customer: customerId,
                limit: 5,
            });

            const activeSub = existingSubs.data.find(
                (s) => s.status === 'active' || s.status === 'trialing'
            );
            const pastDueSub = existingSubs.data.find(
                (s) => s.status === 'past_due'
            );

            if (activeSub) {
                const currentPriceId = activeSub.items.data[0]?.price.id;

                if (currentPriceId === priceId) {
                    // SAME plan → true duplicate → block
                    console.log(`⚠️ DUPLICATE GUARD: ${customerEmail} already on same plan (${currentPriceId}) — blocking`);
                    return NextResponse.json(
                        {
                            error: 'Ya tienes este plan activo. Si deseas gestionar tu suscripción, visita tu perfil.',
                            code: 'SUBSCRIPTION_EXISTS',
                        },
                        { status: 409 }
                    );
                } else {
                    // DIFFERENT plan → check if upgrade or downgrade
                    const currentPlanId = getPlanIdFromPriceId(currentPriceId);
                    const newPlanId = getPlanIdFromPriceId(priceId);

                    if (isUpgrade(currentPlanId, newPlanId)) {
                        // UPGRADE → cancel old, proceed with new checkout
                        console.log(`🔄 UPGRADE: ${customerEmail} from ${currentPlanId} to ${newPlanId} — canceling old sub ${activeSub.id}`);
                        await stripe.subscriptions.cancel(activeSub.id, {
                            prorate: true,
                        });
                    } else {
                        // DOWNGRADE → block checkout, redirect to billing portal
                        console.log(`⚠️ DOWNGRADE BLOCKED: ${customerEmail} trying to go from ${currentPlanId} to ${newPlanId} — redirecting to portal`);
                        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://iurexia.com';
                        const portalSession = await stripe.billingPortal.sessions.create({
                            customer: customerId!,
                            return_url: `${origin}/chat`,
                        });
                        return NextResponse.json({
                            url: portalSession.url,
                            code: 'DOWNGRADE_REDIRECT',
                            message: 'Para cambiar a un plan inferior, administra tu suscripción desde el portal de facturación.',
                        });
                    }
                }
            }

            if (pastDueSub) {
                const currentPriceId = pastDueSub.items.data[0]?.price.id;

                if (currentPriceId === priceId) {
                    // Same plan but past_due → redirect to fix payment
                    console.log(`⚠️ PAST_DUE GUARD: ${customerEmail} has past_due sub for same plan — redirecting to portal`);
                    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://iurexia.com';
                    const portalSession = await stripe.billingPortal.sessions.create({
                        customer: customerId,
                        return_url: `${origin}/chat`,
                    });
                    return NextResponse.json({
                        url: portalSession.url,
                        code: 'PAST_DUE_REDIRECT',
                        message: 'Tu suscripción tiene un pago pendiente. Te redirigimos para actualizar tu método de pago.'
                    });
                } else {
                    // Different plan + past_due → cancel old, proceed with upgrade
                    console.log(`🔄 PLAN CHANGE: ${customerEmail} past_due on ${currentPriceId}, upgrading to ${priceId} — canceling old`);
                    await stripe.subscriptions.cancel(pastDueSub.id);
                }
            }
        }

        // Determine the base URL for redirects
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://iurexia.com';

        // Log checkout session parameters for debugging
        console.log('📦 Creating Stripe Checkout Session:', {
            priceId,
            customerEmail,
            customerId: customerId || 'new customer',
            origin
        });

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
            // Tax ID collection (RFC for Mexico)
            tax_id_collection: {
                enabled: true,
            },
            // CRITICAL FIX: When customer exists, Stripe needs permission to update their name
            // This is required when tax_id_collection is enabled for existing customers
            ...(customerId && {
                customer_update: {
                    name: 'auto',  // Allow Stripe to update customer name from billing details
                    address: 'auto', // Also update address for consistency
                }
            }),
            // Locale
            locale: 'es',
        });

        console.log('✅ Checkout Session created successfully:', checkoutSession.id);
        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Checkout session error:', error);

        // Extract specific error message for debugging
        let errorMessage = 'Failed to create checkout session';
        if (error instanceof Error) {
            errorMessage = error.message;
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }

        return NextResponse.json(
            {
                error: 'Failed to create checkout session',
                details: errorMessage  // Include specific error for debugging
            },
            { status: 500 }
        );
    }
}
