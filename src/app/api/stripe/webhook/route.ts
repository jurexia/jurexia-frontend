import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
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

// ─── Supabase Admin (for idempotency table) ──────────────────

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// ─── Helpers ─────────────────────────────────────────────────

// Map Stripe PlanId to Supabase PlanType
function mapPlanIdToSubscriptionType(planId: PlanId): PlanType {
    const mapping: Record<PlanId, PlanType> = {
        gratuito: 'gratuito',
        pro_monthly: 'pro_monthly',
        pro_annual: 'pro_annual',
        platinum_monthly: 'platinum_monthly',
        platinum_annual: 'platinum_annual',
        ultra_secretarios: 'ultra_secretarios',
    };
    return mapping[planId] || 'gratuito';
}

/**
 * Check if this event has already been processed (idempotency guard).
 * Returns true if event was already handled.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('stripe_events_processed')
        .select('event_id')
        .eq('event_id', eventId)
        .single();
    return !!data;
}

/**
 * Mark an event as processed.
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    await supabase
        .from('stripe_events_processed')
        .insert({ event_id: eventId, event_type: eventType });
}

// ─── Main Handler ────────────────────────────────────────────

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

    console.log(`📨 Webhook received: ${event.type} (id: ${event.id})`);

    // ── Idempotency Guard ────────────────────────────────────
    try {
        const alreadyProcessed = await isEventProcessed(event.id);
        if (alreadyProcessed) {
            console.log(`⏭️ Event ${event.id} already processed — skipping`);
            return NextResponse.json({ received: true, duplicate: true });
        }
    } catch (err) {
        // Don't block on idempotency check failure — log and continue
        console.error(`⚠️ Idempotency check failed (proceeding anyway):`, err);
    }

    // ── Handle the event ─────────────────────────────────────
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

        // ── Mark event as processed ──────────────────────────
        try {
            await markEventProcessed(event.id, event.type);
        } catch (err) {
            console.error(`⚠️ Failed to mark event ${event.id} as processed:`, err);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error(`❌ Webhook handler error for event ${event.type}:`, error);
        // Return 200 to acknowledge receipt even on error — Stripe will retry otherwise
        // and the same error will repeat. Log the error for manual investigation.
        return NextResponse.json(
            { error: 'Webhook handler failed', eventType: event.type },
            { status: 500 }
        );
    }
}

// ─── Handler Functions ──────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const email = (session.customer_email || session.metadata?.userEmail || '').toLowerCase().trim();

    console.log('✅ Checkout completed:', {
        sessionId: session.id,
        customerEmail: email,
        customerId: session.customer,
        subscriptionId: session.subscription,
        paymentStatus: session.payment_status,
    });

    if (!email) {
        console.error('❌ No email found in checkout session — cannot update profile');
        console.error('   session.customer_email:', session.customer_email);
        console.error('   session.metadata:', session.metadata);
        return;
    }

    if (!session.subscription) {
        console.error('❌ No subscription ID in checkout session — this might be a one-time payment');
        return;
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
    );

    console.log('🔍 Retrieved subscription:', {
        id: subscription.id,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
    });

    const planId = getPlanFromSubscription(subscription);
    const subscriptionType = mapPlanIdToSubscriptionType(planId);
    const config = PLAN_CONFIG[subscriptionType];

    // GUARD: If the matched plan is 'gratuito' after a checkout, something is wrong
    if (planId === 'gratuito') {
        console.error(`🚨 WARNING: Checkout completed but plan resolved to "gratuito"!`);
        console.error(`   This likely means STRIPE_PRICE_* env vars are not set or don't match.`);
        console.error(`   Subscription priceId: ${subscription.items.data[0]?.price.id}`);
        console.error(`   Configured price IDs:`, {
            pro_monthly: PLANS.pro_monthly.priceId,
            pro_annual: PLANS.pro_annual.priceId,
            platinum_monthly: PLANS.platinum_monthly.priceId,
            platinum_annual: PLANS.platinum_annual.priceId,
            ultra_secretarios: PLANS.ultra_secretarios.priceId,
        });
        // Don't return — still try to update with whatever we have, but the warning is logged
    }

    console.log(`📧 Updating user ${email}: plan=${planId} → subscriptionType=${subscriptionType}, limit=${config.queriesLimit}`);

    await updateUserSubscription(
        email,
        subscriptionType,
        session.customer as string,
        session.subscription as string,
    );

    console.log(`🎉 handleCheckoutCompleted finished successfully for ${email}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    console.log('🔄 Subscription updated:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId: subscription.customer,
        priceId: subscription.items.data[0]?.price.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    const planId = getPlanFromSubscription(subscription);
    const subscriptionType = mapPlanIdToSubscriptionType(planId);

    // Get customer email
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = ((customer as Stripe.Customer).email || '').toLowerCase().trim();

    if (!email) {
        console.error('❌ No email on Stripe customer:', subscription.customer);
        return;
    }

    // Handle cancel_at_period_end — user keeps access until period ends
    if (subscription.cancel_at_period_end) {
        const periodEnd = new Date((subscription as any).current_period_end * 1000);
        console.log(`⏳ User ${email} scheduled cancellation — access until ${periodEnd.toISOString()}`);
        // Don't downgrade yet; Stripe will send subscription.deleted when period actually ends
        return;
    }

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
    } else if (subscription.status === 'past_due') {
        // Payment is past due but subscription hasn't been canceled yet
        // Keep current plan but log the warning
        console.warn(`⚠️ Subscription past_due for ${email} — user retains access for now`);
    } else {
        console.log(`ℹ️ Subscription status is "${subscription.status}" — no action taken`);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('❌ Subscription deleted:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
    });

    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = ((customer as Stripe.Customer).email || '').toLowerCase().trim();

    if (email) {
        console.log(`📧 User ${email} subscription canceled → downgrading to free`);
        await downgradeToFree(email);
    } else {
        console.error('❌ No email on customer for subscription deletion:', subscription.customer);
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log('💰 Payment succeeded:', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        customerEmail: invoice.customer_email,
        billingReason: invoice.billing_reason,
    });

    // Reset monthly query + draft count on successful renewal payment
    const email = (invoice.customer_email || '').toLowerCase().trim();
    if (email && invoice.billing_reason === 'subscription_cycle') {
        console.log(`📧 Resetting query + draft count for ${email} (subscription renewal)`);
        await resetUserQueries(email);
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const email = (invoice.customer_email || '').toLowerCase().trim();
    const attemptCount = invoice.attempt_count ?? 0;

    console.log('⚠️ Payment failed:', {
        invoiceId: invoice.id,
        customerEmail: email,
        attemptCount,
    });

    if (attemptCount >= 3 && email) {
        // After 3+ failed attempts, proactively downgrade to prevent continued usage
        // Stripe will eventually cancel the subscription, but this is a safety net
        console.warn(`🚨 Payment failed ${attemptCount} times for ${email} — proactive downgrade`);
        await downgradeToFree(email);
    } else {
        // Just log; Stripe's dunning process will handle retries
        console.log(`⚠️ Payment failed for ${email} (attempt ${attemptCount}) — awaiting retry`);
    }
}
