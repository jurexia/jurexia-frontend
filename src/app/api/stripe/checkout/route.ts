import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe, PLANS } from '@/lib/stripe';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const { priceId, email } = await request.json();

        if (!priceId) {
            return NextResponse.json(
                { error: 'Price ID is required' },
                { status: 400 }
            );
        }

        // Use session email or provided email
        const customerEmail = session?.user?.email || email;

        if (!customerEmail) {
            return NextResponse.json(
                { error: 'Email is required. Please log in or provide an email.' },
                { status: 400 }
            );
        }

        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({
            email: customerEmail,
            limit: 1,
        });

        let customerId: string | undefined;

        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        }

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
            success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/checkout/cancel`,
            metadata: {
                userEmail: customerEmail,
            },
            subscription_data: {
                metadata: {
                    userEmail: customerEmail,
                },
            },
            // Enable automatic tax calculation if needed
            // automatic_tax: { enabled: true },
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
