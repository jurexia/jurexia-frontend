import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, getPlanFromSubscription, PLANS, PlanId } from '@/lib/stripe';
import {
    updateUserSubscription,
    downgradeToFree,
    resetUserQueries,
    PlanType,
    PLAN_CONFIG,
} from '@/lib/supabase-admin';

// Disable body parsing, we need the raw body for webhook verification
export const dynamic = 'force-dynamic';

// Map Stripe PlanId to Supabase PlanType
function mapPlanIdToSubscriptionType(planId: PlanId): PlanType {
    const mapping: Record<PlanId, PlanType> = {
        gratuito: 'gratuito',
        pro_monthly: 'pro_monthly',
        pro_annual: 'pro_annual',
        platinum_monthly: 'platinum_monthly',
        platinum_annual: 'platinum_annual',
    };
    return mapping[planId] || 'gratuito';
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;
    const stripe = getStripe();

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

// ─── Handler Functions ──────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ Checkout completed:', {
        sessionId: session.id,
        customerEmail: session.customer_email || session.metadata?.userEmail,
        subscriptionId: session.subscription,
    });

    const email = session.customer_email || session.metadata?.userEmail;

    if (!email) {
        console.error('No email found in checkout session');
        return;
    }

    if (session.subscription) {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        );

        const planId = getPlanFromSubscription(subscription);
        const subscriptionType = mapPlanIdToSubscriptionType(planId);
        const config = PLAN_CONFIG[subscriptionType];

        console.log(`📧 User ${email} subscribed to plan: ${planId} → ${subscriptionType}`);

        await updateUserSubscription(
            email,
            subscriptionType,
            session.customer as string,
            session.subscription as string,
        );
    }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    console.log('🔄 Subscription updated:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId: subscription.customer,
    });

    const planId = getPlanFromSubscription(subscription);
    const subscriptionType = mapPlanIdToSubscriptionType(planId);

    // Get customer email
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = (customer as Stripe.Customer).email;

    if (email) {
        console.log(`📧 User ${email} subscription updated to: ${subscriptionType}, status: ${subscription.status}`);

        if (subscription.status === 'active') {
            await updateUserSubscription(
                email,
                subscriptionType,
                subscription.customer as string,
                subscription.id,
            );
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await downgradeToFree(email);
        }
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('❌ Subscription deleted:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
    });

    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = (customer as Stripe.Customer).email;

    if (email) {
        console.log(`📧 User ${email} subscription canceled → downgrading to free`);
        await downgradeToFree(email);
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log('💰 Payment succeeded:', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        customerEmail: invoice.customer_email,
    });

    // Reset monthly query count on successful renewal payment
    const email = invoice.customer_email;
    if (email && invoice.billing_reason === 'subscription_cycle') {
        console.log(`📧 Resetting query count for ${email} (subscription renewal)`);
        await resetUserQueries(email);
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('⚠️ Payment failed:', {
        invoiceId: invoice.id,
        customerEmail: invoice.customer_email,
        attemptCount: invoice.attempt_count,
    });

    // After multiple failed attempts, Stripe will cancel the subscription
    // which triggers handleSubscriptionDeleted → downgrade to free
    // For now we just log the failure
    console.log(`⚠️ Payment failed for ${invoice.customer_email} (attempt ${invoice.attempt_count})`);
}
