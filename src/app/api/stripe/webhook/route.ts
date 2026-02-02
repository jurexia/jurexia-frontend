import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, getPlanFromSubscription } from '@/lib/stripe';

// Disable body parsing, we need the raw body for webhook verification
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json(
            { error: 'Webhook signature verification failed' },
            { status: 400 }
        );
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentSucceeded(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}

// Handler functions
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ Checkout completed:', {
        sessionId: session.id,
        customerEmail: session.customer_email || session.metadata?.userEmail,
        subscriptionId: session.subscription,
    });

    // Get customer email
    const email = session.customer_email || session.metadata?.userEmail;

    if (!email) {
        console.error('No email found in checkout session');
        return;
    }

    // Get subscription details
    if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        );

        const planId = getPlanFromSubscription(subscription);

        console.log(`📧 User ${email} subscribed to plan: ${planId}`);

        // TODO: Update your database here
        // await updateUserSubscription(email, planId, subscription.id);
    }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    console.log('🔄 Subscription updated:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId: subscription.customer,
    });

    const planId = getPlanFromSubscription(subscription);

    // Get customer email
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = (customer as Stripe.Customer).email;

    if (email) {
        console.log(`📧 User ${email} subscription updated to: ${planId}, status: ${subscription.status}`);

        // TODO: Update your database here
        // await updateUserSubscription(email, planId, subscription.id, subscription.status);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('❌ Subscription deleted:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
    });

    // Get customer email
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = (customer as Stripe.Customer).email;

    if (email) {
        console.log(`📧 User ${email} subscription canceled`);

        // TODO: Downgrade user to free plan in your database
        // await updateUserSubscription(email, 'gratuito', null, 'canceled');
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log('💰 Payment succeeded:', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        customerEmail: invoice.customer_email,
    });

    // Reset monthly query count on successful payment
    const email = invoice.customer_email;
    if (email) {
        console.log(`📧 Resetting query count for ${email}`);

        // TODO: Reset query count in your database
        // await resetUserQueryCount(email);
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('⚠️ Payment failed:', {
        invoiceId: invoice.id,
        customerEmail: invoice.customer_email,
    });

    // TODO: Send notification to user about failed payment
    // await sendPaymentFailedEmail(invoice.customer_email);
}
