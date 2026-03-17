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
import { Resend } from 'resend';

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
        basico_monthly: 'basico_monthly',
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
        // FIX #1: SIEMPRE retornar 200 para que Stripe NO reenvíe el evento.
        // Un 500 causa que Stripe reintente durante 3 días, creando un loop
        // infinito de errores. Los errores se investigan con logs.
        return NextResponse.json(
            { error: 'Webhook handler failed', eventType: event.type },
            { status: 200 }
        );
    }
}

// ─── Handler Functions ──────────────────────────────────────────────

function buildPaymentFailedEmail(name: string, attemptCount: number) {
    const firstName = name.split(' ')[0] || 'Estimado/a';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">
                    <!-- Header con gradiente -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#1a1a1a 0%,#1f1f1f 100%);padding:32px 40px;border-bottom:1px solid #333;">
                            <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                                IUREX<span style="color:#c9a84c;">IA</span>
                            </span>
                        </td>
                    </tr>
                    <!-- Cuerpo principal -->
                    <tr>
                        <td style="padding:40px;">
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                Acción Requerida en tu Suscripción ⚠️
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Hola ${firstName},
                            </p>
                            
                            <div style="background-color:#1a1a1a;border:1px solid #dc262640;border-left:4px solid #dc2626;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0;font-size:15px;color:#fca5a5;line-height:1.7;">
                                    <strong>No hemos podido procesar el cargo de tu mensualidad.</strong><br/>
                                    Esto suele ocurrir porque los fondos son insuficientes o la tarjeta ha caducado.
                                </p>
                            </div>

                            <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6;">
                                Para seguir disfrutando del Genio Jurídico y acceso ilimitado a nuestros modelos de IA, por favor <strong>actualiza tu método de pago</strong> en la plataforma.
                            </p>
                            
                            <div style="background-color:#0d1b0d;border:1px solid #1a3a1a;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0;font-size:14px;color:#86efac;line-height:1.6;">
                                    🔄 Realizaremos intentos de cobro automáticos (intento ${attemptCount} de 3) en los próximos días. <strong>Si el último intento falla, tu suscripción pasará de forma automática al plan Gratuito.</strong>
                                </p>
                            </div>

                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/plataforma"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                                            Actualizar Método de Pago →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;">
                            <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;">
                                Si tienes dudas sobre tu facturación contáctanos a <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

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

    // FIX #6: Validar que el pago fue exitoso antes de actualizar
    if (session.payment_status !== 'paid') {
        console.warn(`⚠️ Checkout completed but payment_status is "${session.payment_status}" (not "paid") for ${email} — deferring until payment confirms`);
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
            basico_monthly: PLANS.basico_monthly.priceId,
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
        true
    );

    // ── AUTO-CANCEL previous subscriptions on upgrade ────────────────
    // When a user upgrades (e.g., Básico→Pro, Pro→Platinum), they go through
    // a new checkout which creates a NEW subscription. The old one stays active,
    // causing double billing. Here we cancel all other active subscriptions
    // for this customer except the one just created.
    try {
        const customerId = session.customer as string;
        const newSubscriptionId = session.subscription as string;

        const customerSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 10,
        });

        const oldSubscriptions = customerSubscriptions.data.filter(
            (sub) => sub.id !== newSubscriptionId
        );

        if (oldSubscriptions.length > 0) {
            console.log(`🔄 Found ${oldSubscriptions.length} old subscription(s) for ${email} — cancelling to prevent double billing`);

            for (const oldSub of oldSubscriptions) {
                try {
                    await stripe.subscriptions.cancel(oldSub.id);
                    console.log(`✅ Cancelled old subscription ${oldSub.id} (price: ${oldSub.items.data[0]?.price.id})`);
                } catch (cancelErr) {
                    console.error(`❌ Failed to cancel old subscription ${oldSub.id}:`, cancelErr);
                }
            }
        } else {
            console.log(`ℹ️ No old subscriptions to cancel for ${email} — this is a new subscription`);
        }
    } catch (err) {
        // Don't fail the checkout completion if auto-cancel fails
        console.error(`⚠️ Auto-cancel of old subscriptions failed for ${email}:`, err);
    }

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

    // FIX #3: Handle cancel_at_period_end — but DON'T block if the plan changed (upgrade)
    if (subscription.cancel_at_period_end) {
        const periodEnd = new Date((subscription as any).current_period_end * 1000);
        console.log(`⏳ User ${email} scheduled cancellation — access until ${periodEnd.toISOString()}`);
        // Only skip further processing if the plan hasn't changed.
        // If the user upgraded (different price), we need to process the update.
        if (subscription.status !== 'active') {
            return;
        }
        // If status is active + cancel_at_period_end, log and let it through so
        // any plan changes still get processed below.
        console.log(`   ↳ Subscription is active with cancel-at-period-end — processing update anyway`);
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
    const attemptCount = invoice.attempt_count ?? 1;

    console.log('⚠️ Payment failed:', {
        invoiceId: invoice.id,
        customerEmail: email,
        attemptCount,
    });

    if (!email) {
        console.warn('⚠️ No email to send payment failed notification to');
        return;
    }

    if (attemptCount >= 4) {
        // After final failed attempts, proactively downgrade to prevent continued usage
        // Stripe will eventually cancel the subscription, but this is a safety net
        console.warn(`🚨 Payment failed ${attemptCount} times for ${email} — proactive downgrade`);
        await downgradeToFree(email);
    } else {
        console.log(`⚠️ Payment failed for ${email} (attempt ${attemptCount}) — awaiting retry and sending email`);

        try {
            // Get user's name for personalization
            const supabase = getSupabaseAdmin();
            const { data: user } = await supabase
                .from('users')
                .select('full_name')
                .eq('email', email)
                .single();

            const fullName = user?.full_name || 'Usuario';

            // Send warning email
            const apiKey = process.env.RESEND_API_KEY;
            if (apiKey) {
                const resend = new Resend(apiKey);
                const fromEmail = process.env.FROM_EMAIL || 'Iurexia Facturación <noreply@iurexia.com>';

                await resend.emails.send({
                    from: fromEmail,
                    to: email,
                    subject: '⚠️ Error al procesar tu pago de Iurexia',
                    html: buildPaymentFailedEmail(fullName, attemptCount),
                });
                console.log(`📧 Failed payment notification sent to ${email}`);
            } else {
                console.warn('⚠️ RESEND_API_KEY not set - skipping failed payment email');
            }
        } catch (err) {
            console.error(`❌ Failed to send payment failed email to ${email}:`, err);
        }
    }
}

