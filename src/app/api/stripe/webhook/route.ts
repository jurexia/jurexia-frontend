import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripe, getPlanFromSubscription, PLANS, PlanId, isUpgrade, getPlanIdFromPriceId } from '@/lib/stripe';
import {
    updateUserSubscription,
    downgradeToFree,
    resetUserQueries,
    suspenderPorImpago,
    levantarSuspension,
    DIAS_HASTA_SUSPENDER,
    PlanType,
    PLAN_CONFIG,
} from '@/lib/supabase-admin';
import { PALETA, envolver, rotulo, esc, boton } from '@/lib/correo/plantilla';
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
    // OJO: este mapa debe cubrir TODOS los planes vendibles. Cuando falta uno,
    // `mapping[planId]` da undefined y el `|| 'gratuito'` de abajo convierte a
    // un cliente que acaba de pagar en usuario gratuito de cinco consultas.
    //
    // Le faltaba `basico_annual` (790 MXN al año), que sí se vende desde la
    // pestaña «Anual» de la página de precios. Nadie lo había comprado todavía
    // —comprobado en Stripe el 22-ago-2026, cero suscripciones en ese precio—
    // así que era una mina sin pisar, no un daño hecho. El tipo Record<PlanId,…>
    // ya obligaba a declararlo: el error existía desde hace meses y no frenó un
    // solo despliegue porque next.config lleva `ignoreBuildErrors: true`.
    const mapping: Record<PlanId, PlanType> = {
        gratuito: 'gratuito',
        basico_monthly: 'basico_monthly',
        basico_annual: 'basico_annual',
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

            // ── ANTES DE QUE SEA CONTRACARGO ─────────────────────
            // Medido el 22-ago-2026: CUATRO disputas, CUATRO perdidas — una de
            // ellas con evidencia extraordinaria (bitácora de uso, historial de
            // tres pagos, la cancelación posterior del propio usuario). Cada una
            // cuesta 149 MXN del cargo MÁS 174 MXN de comisión: 323 pesos.
            //
            // Pelear no funciona. Devolver a tiempo sí: si el dinero vuelve
            // ANTES de que la disputa se formalice, no hay comisión de disputa
            // y no cuenta para la tasa —que es lo que mira Stripe para meter a
            // un negocio en programas de vigilancia—.
            case 'radar.early_fraud_warning.created': {
                await manejarAvisoTempranoDeFraude(event.data.object as Stripe.Radar.EarlyFraudWarning);
                break;
            }

            case 'charge.dispute.created': {
                await manejarDisputaNueva(event.data.object as Stripe.Dispute);
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
    // Accept both 'paid' (normal checkout) and 'no_payment_required' (100% coupon/trial)
    const validPaymentStatuses = ['paid', 'no_payment_required'];
    if (!validPaymentStatuses.includes(session.payment_status)) {
        console.warn(`⚠️ Checkout completed but payment_status is "${session.payment_status}" (not paid/no_payment_required) for ${email} — deferring until payment confirms`);
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

    // ── PROGRAMA DE REFERIDOS ────────────────────────────────────────
    // Éste es el único momento en que se puede contar una conversión: alguien
    // que llegó por invitación acaba de contratar. Si con él su padrino junta
    // tres, se le otorga aquí mismo el ascenso a Platinum por tres meses.
    //
    // Va envuelto en try/catch y después de actualizar la suscripción: un
    // fallo del programa de referidos no puede impedir que se registre un
    // cobro que Stripe ya hizo.
    try {
        const { alSuscribirseUnReferido } = await import('@/lib/referidos-backend');
        const r = await alSuscribirseUnReferido(email, subscriptionType);
        if (r.premio?.otorgado) {
            console.log(`🎁 Peldaño ${r.premio.nivel} otorgado al padrino — ${r.premio.dias} días, vence ${r.premio.vence_at}`);
        }
    } catch (refErr) {
        console.error('⚠️ Programa de referidos falló (la suscripción sí se registró):', refErr);
    }

    // ── AUTO-CANCEL previous subscriptions on upgrade ────────────────
    // When a user upgrades (e.g., Básico→Pro, Pro→Platinum), they go through
    // a new checkout which creates a NEW subscription. The old one stays active,
    // causing double billing. Here we cancel the LOWER-tier subscription.
    // CRITICAL: Only cancel old subs if the new plan is actually HIGHER tier.
    try {
        const customerId = session.customer as string;
        const newSubscriptionId = session.subscription as string;

        const customerSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 10,
        });

        const otherSubscriptions = customerSubscriptions.data.filter(
            (sub) => sub.id !== newSubscriptionId
        );

        if (otherSubscriptions.length > 0) {
            // Determine new plan tier
            const newPriceId = subscription.items.data[0]?.price.id;
            const newPlanId = getPlanIdFromPriceId(newPriceId || '');

            for (const oldSub of otherSubscriptions) {
                const oldPriceId = oldSub.items.data[0]?.price.id;
                const oldPlanId = getPlanIdFromPriceId(oldPriceId || '');

                if (isUpgrade(oldPlanId, newPlanId)) {
                    // New plan is higher → cancel old (lower) subscription ✅
                    try {
                        await stripe.subscriptions.cancel(oldSub.id);
                        console.log(`✅ Cancelled old subscription ${oldSub.id} (${oldPlanId} → ${newPlanId})`);
                    } catch (cancelErr) {
                        console.error(`❌ Failed to cancel old subscription ${oldSub.id}:`, cancelErr);
                    }
                } else {
                    // New plan is LOWER → cancel the NEW subscription instead 🛡️
                    console.warn(`🛡️ DOWNGRADE PREVENTED: ${email} tried ${oldPlanId} → ${newPlanId}`);
                    console.warn(`   Keeping higher-tier sub ${oldSub.id} (${oldPlanId}), cancelling new sub ${newSubscriptionId} (${newPlanId})`);
                    try {
                        await stripe.subscriptions.cancel(newSubscriptionId);
                        // Re-update profile to the HIGHER plan
                        const higherPlanType = mapPlanIdToSubscriptionType(oldPlanId);
                        const higherConfig = PLAN_CONFIG[higherPlanType];
                        await updateUserSubscription(
                            email,
                            higherPlanType,
                            customerId,
                            oldSub.id,
                        );
                        console.log(`✅ Restored user ${email} to ${higherPlanType} (${higherConfig.queriesLimit} queries)`);
                    } catch (revertErr) {
                        console.error(`❌ Failed to revert downgrade for ${email}:`, revertErr);
                    }
                    return; // Stop processing — we've reverted
                }
            }
        } else {
            console.log(`ℹ️ No old subscriptions to cancel for ${email} — this is a new subscription`);
        }
    } catch (err) {
        // Don't fail the checkout completion if auto-cancel fails
        console.error(`⚠️ Auto-cancel of old subscriptions failed for ${email}:`, err);
    }

    // ── AUTO-SEND Welcome Email ─────────────────────────────────
    try {
        const INGESTED_STATES = ['QUERETARO', 'CDMX', 'CIUDAD_DE_MEXICO', 'GUANAJUATO', 'JALISCO', 'MICHOACAN', 'VERACRUZ', 'MORELOS', 'PUEBLA', 'SINALOA', 'COAHUILA'];

        const supabase = getSupabaseAdmin();
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('full_name, estado')
            .eq('email', email)
            .single();

        const userName = userProfile?.full_name || email.split('@')[0];
        const userEstado = userProfile?.estado || 'tu entidad';
        const isIngested = userEstado ? INGESTED_STATES.includes(userEstado) : false;

        // Plan label mapping
        const PLAN_LABELS: Record<string, string> = {
            basico_monthly: 'Básico',
            pro_monthly: 'Pro',
            pro_annual: 'Pro Anual',
            platinum_monthly: 'Platinum',
            platinum_annual: 'Platinum Anual',
            ultra_secretarios: 'Ultra Secretarios',
        };

        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
            const { buildWelcomeEmail } = await import('@/lib/welcome-email');
            const resend = new Resend(apiKey);
            const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

            await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: `¡Bienvenido/a a Iurexia, ${userName.split(' ')[0]}! 🎉`,
                html: buildWelcomeEmail({
                    name: userName,
                    estado: userEstado,
                    planType: subscriptionType,
                    planLabel: PLAN_LABELS[subscriptionType] || 'Pro',
                    isIngested,
                }),
            });
            console.log(`📧 Welcome email auto-sent to ${email} (plan: ${subscriptionType})`);
        } else {
            console.warn('⚠️ RESEND_API_KEY not set — skipping welcome email');
        }
    } catch (emailErr) {
        // Don't fail the checkout if email sending fails
        console.error(`⚠️ Welcome email failed for ${email} (non-blocking):`, emailErr);
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
        await downgradeToFree(email, subscription.id);
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
        await downgradeToFree(email, subscription.id);
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

    // Y si estaba suspendido por impago, el pago lo reactiva EN EL ACTO. No se
    // le hace esperar al barrido diario: acaba de pagar y está delante de la
    // pantalla que le pidió actualizar su tarjeta.
    if (email) {
        try {
            await levantarSuspension(email);
        } catch (e) {
            console.error(`⚠️ Entró el pago de ${email} pero no pude levantar su suspensión:`, e);
        }
    }
}

/**
 * El aviso de suspensión. Lo que NO puede pasar es que el cliente descubra por
 * su cuenta que no puede consultar: eso es como se pierde a alguien que sólo
 * tenía la tarjeta vencida.
 *
 * El botón lleva a la factura alojada de Stripe, que se paga sin iniciar
 * sesión y sin que nosotros toquemos una tarjeta. Pagar ahí dispara
 * `invoice.payment_succeeded`, y ese webhook levanta la suspensión solo.
 */
async function avisarSuspension(email: string, invoice: Stripe.Invoice) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) {
        console.warn('⚠️ RESEND_API_KEY sin configurar — no sale el aviso de suspensión');
        return;
    }

    const url = invoice.hosted_invoice_url || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com'}/cuenta/suscripcion`;
    const monto = `$${((invoice.amount_due ?? 0) / 100).toLocaleString('es-MX')} MXN`;

    const cuerpo = `
${rotulo('Su cuenta está en pausa')}
<p style="margin:0 0 20px 0;">Le escribimos porque <strong style="color:${PALETA.tinta};">no hemos podido cobrar su mensualidad</strong> de ${esc(monto)}. Lo intentamos varias veces durante ${DIAS_HASTA_SUSPENDER} días, casi siempre por una tarjeta vencida o sin fondos en ese momento.</p>
<p style="margin:0 0 20px 0;">Mientras tanto su acceso queda en pausa. <strong style="color:${PALETA.tinta};">No ha perdido nada</strong>: su plan, sus conversaciones, sus carpetas y sus documentos siguen intactos y le esperan.</p>
${boton('Pagar y reactivar ahora', url)}
<p style="margin:16px 0 20px 0;">El pago reactiva su cuenta <strong style="color:${PALETA.tinta};">de inmediato</strong>, sin que tenga que avisarnos ni esperar a nadie.</p>
<p style="margin:0 0 20px 0;">Si prefiere no continuar, puede cancelar cuando quiera desde su perfil y no se le cobrará nada más. Y si esto es un error o algo no cuadra, respóndanos a este correo: lo revisa una persona.</p>
<p style="margin:0;color:${PALETA.tinta};"><strong style="color:${PALETA.tinta};">Equipo de Iurexia</strong></p>
`;

    await new Resend(clave).emails.send({
        from: process.env.FROM_EMAIL_REPORTES || 'Iurexia <soporte@iurexia.com>',
        to: email,
        subject: 'Su cuenta de Iurexia está en pausa — no pudimos cobrar su mensualidad',
        html: envolver({ cuerpo, pie: 'Este aviso se envía una sola vez, cuando la cuenta entra en pausa por un cobro que no pudo completarse.' }),
    });
    console.log(`📧 Aviso de suspensión enviado a ${email}`);
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

    // ¿CUÁNTOS DÍAS LLEVA SIN PAGAR? (31-ago-2026)
    //
    // Antes se cortaba con `attemptCount >= 4`, y ese número engaña: el
    // contador es POR FACTURA y se reinicia cada ciclo, así que una factura
    // vieja puede llevar nueve intentos y la del mes en curso ir por el
    // primero. Medido ese día: los diez morosos llevaban de 1 a 7 días de
    // retraso, Stripe seguía reintentando en los diez, y una de las facturas
    // que se revisó acabó pagándose al octavo intento. Cortar por intentos
    // corta a quien iba a pagar.
    //
    // Ahora manda el calendario: catorce días desde que se emitió la factura
    // que no entró. Es la misma vara que usa el barrido diario.
    const diasDeImpago = Math.floor((Date.now() / 1000 - (invoice.created ?? 0)) / 86400);

    if (diasDeImpago >= DIAS_HASTA_SUSPENDER) {
        console.warn(`🚨 ${email} lleva ${diasDeImpago} días sin pagar (${attemptCount} intentos) — se suspende`);
        // `invoice.subscription` DESAPARECIÓ de la API en la versión que usamos
        // (2026-01-28.clover): Stripe lo movió a `parent.subscription_details`.
        // Leerlo del sitio viejo devolvía siempre undefined, y eso no fallaba
        // ruidosamente: apagaba el candado de `downgradeToFree`.
        //
        // Ese candado existe para no degradar a quien YA se cambió a otro plan.
        // Sin id, el candado se salta, y la secuencia real es ésta: un cliente
        // moroso mejora su plan (el propio checkout lo permite: «past_due +
        // plan distinto → cancelar el viejo y seguir»), Stripe sigue
        // reintentando la factura vieja, al cuarto intento entra aquí y se
        // degrada a gratuito a alguien que acaba de pagar más.
        //
        // Comprobado el 22-ago-2026: ningún suscriptor activo está hoy en
        // gratuito, así que tampoco había daño consumado. Se lee del sitio
        // nuevo y se deja el viejo como respaldo por si cambia la versión.
        const facturaConPadre = invoice as unknown as {
            parent?: { subscription_details?: { subscription?: string | { id: string } } };
            subscription?: string | { id: string };
        };
        const refSub = facturaConPadre.parent?.subscription_details?.subscription
            ?? facturaConPadre.subscription;
        const failedSubId = typeof refSub === 'string' ? refSub : refSub?.id;
        if (!failedSubId) {
            console.warn(`⚠️ Sin id de suscripción en la factura de ${email}`);
        }

        // SUSPENDER, NO DEGRADAR. La suscripción de Stripe se queda como está
        // —viva y cobrable— y el plan del cliente también: lo único que cambia
        // es que no puede consultar hasta que el pago entre. Ver
        // `suspenderPorImpago`, que explica por qué degradar era peor.
        await suspenderPorImpago(email, `${diasDeImpago} días de impago`);

        try {
            await avisarSuspension(email, invoice);
        } catch (e) {
            console.error(`⚠️ Suspendido ${email} pero no salió el aviso:`, e);
        }
    } else {
        console.log(`⚠️ Payment failed for ${email} (attempt ${attemptCount}, ${diasDeImpago} días) — awaiting retry and sending email`);

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

// ═══════════════════════════════════════════════════════════════════════════
// DISPUTAS: DEVOLVER A TIEMPO EN VEZ DE PELEAR Y PERDER
// ═══════════════════════════════════════════════════════════════════════════
//
// El historial al 22-ago-2026: cuatro disputas, CUATRO perdidas. En una se
// presentó bitácora de uso, tres meses de pagos limpios y la prueba de que el
// propio cliente canceló DESPUÉS de disputar. Se perdió igual.
//
// La aritmética manda: el cargo son 149 MXN y la comisión de disputa 174 MXN
// (150 + IVA). Devolver cuesta 149; que llegue a contracargo cuesta 323 y
// además ensucia la tasa de disputas, que es lo que Stripe vigila para meter a
// un negocio en sus programas de seguimiento.
//
// La propia documentación de Stripe sitúa el punto óptimo de devolución en
// cargos «menores o iguales a tu comisión de disputa». El nuestro es 149
// contra 150: cae justo dentro.

/** Techo de devolución automática. Por encima, se avisa y decide una persona. */
const TECHO_DEVOLUCION_MXN = Number(process.env.DEVOLUCION_AUTO_TOPE_MXN || 200);

/**
 * APAGADA POR OMISIÓN, por decisión de política (David, 22-ago-2026).
 *
 * La postura de Iurexia es que cancelar es responsabilidad enteramente del
 * usuario: la plataforma le da el botón, la renovación es automática y
 * anunciada, y el servicio queda disponible todo el periodo aunque no lo use
 * —como cualquier suscripción—. Por eso NO se devuelve por el mero hecho de
 * que alguien reclame a su banco.
 *
 * La vía de reembolso existe y está en los términos, pero es otra: que el
 * usuario escriba a soporte y lo pida. Devolver automáticamente ante una
 * consulta bancaria premiaría justo el camino que los términos piden evitar.
 *
 * Encenderla (DEVOLUCION_AUTO=true) cambia esa política a cambio de dinero:
 * ahorra los 174 MXN de comisión y mantiene la disputa fuera de la tasa. Es
 * una decisión de negocio, no técnica.
 */
function devolucionAutomaticaActiva(): boolean {
    return (process.env.DEVOLUCION_AUTO || 'false').toLowerCase() === 'true';
}

/**
 * Devuelve el cargo y corta la suscripción, dejando constancia.
 *
 * Se cancela de inmediato y no al final del periodo: si se devuelve el dinero
 * del mes, dejar el acceso abierto sería regalarlo.
 */
async function devolverYCortar(chargeId: string, motivo: string): Promise<string> {
    const stripe = getStripe();
    const cargo = await stripe.charges.retrieve(chargeId);

    if (cargo.refunded || cargo.amount_refunded > 0) {
        return `ya estaba devuelto (${chargeId})`;
    }
    const pesos = cargo.amount / 100;
    if (pesos > TECHO_DEVOLUCION_MXN) {
        // Un cargo grande no lo decide un webhook solo.
        console.warn(`⚠️ DISPUTA: ${chargeId} son ${pesos} MXN, por encima del techo `
            + `de ${TECHO_DEVOLUCION_MXN} — NO se devuelve automáticamente`);
        return `por encima del techo (${pesos} MXN)`;
    }

    await stripe.refunds.create({
        charge: chargeId,
        reason: 'requested_by_customer',
        metadata: { motivo, origen: 'prevencion_de_disputa' },
    });

    // Y cortar la suscripción: sin esto se devuelve el mes y al siguiente se
    // vuelve a cobrar, que es la forma más rápida de ganarse la segunda
    // disputa del mismo cliente.
    let suscripcion = 'sin suscripción asociada';
    try {
        const clienteId = typeof cargo.customer === 'string' ? cargo.customer : cargo.customer?.id;
        if (clienteId) {
            const subs = await stripe.subscriptions.list({ customer: clienteId, status: 'all', limit: 10 });
            const viva = subs.data.find(x => ['active', 'past_due', 'trialing'].includes(x.status));
            if (viva) {
                await stripe.subscriptions.cancel(viva.id);
                suscripcion = `suscripción ${viva.id} cancelada`;
            }
        }
    } catch (e) {
        suscripcion = `no pude cancelar la suscripción (${e instanceof Error ? e.message : e})`;
    }

    const resumen = `devuelto ${pesos} MXN · ${suscripcion}`;
    console.log(`💸 PREVENCIÓN DE DISPUTA: ${chargeId} — ${resumen} — motivo: ${motivo}`);
    try {
        await getSupabaseAdmin().from('avisos_infraestructura').insert({
            asunto: 'disputa-prevenida',
            detalle: { charge: chargeId, mxn: pesos, motivo, suscripcion },
        });
    } catch { /* la bitácora no bloquea la devolución */ }
    return resumen;
}

/**
 * Aviso temprano de fraude: el banco emisor marcó el cargo como sospechoso
 * ANTES de que el cliente dispute. Stripe mide que el 80% de estos avisos
 * acaba en disputa si no se hace nada.
 */
async function manejarAvisoTempranoDeFraude(aviso: Stripe.Radar.EarlyFraudWarning): Promise<void> {
    const chargeId = typeof aviso.charge === 'string' ? aviso.charge : aviso.charge?.id;
    console.log(`🚨 AVISO TEMPRANO DE FRAUDE: ${chargeId} (${aviso.fraud_type})`);
    if (!chargeId) return;
    if (!devolucionAutomaticaActiva()) {
        console.warn('   devolución automática APAGADA (DEVOLUCION_AUTO=false) — no se hace nada');
        return;
    }
    if (aviso.actionable === false) {
        // Stripe marca así los avisos que llegan cuando la disputa YA existe:
        // devolver entonces no evita la comisión y duplicaría la pérdida.
        console.log('   el aviso no es accionable (la disputa ya existe) — no se devuelve');
        return;
    }
    try {
        console.log(`   → ${await devolverYCortar(chargeId, `aviso_temprano_${aviso.fraud_type}`)}`);
    } catch (e) {
        console.error('   ❌ no se pudo devolver:', e);
    }
}

/**
 * Disputa nueva. Sólo se devuelve en la fase de CONSULTA (`warning_*`), que es
 * cuando devolver todavía evita la comisión.
 *
 * Esto pesa especialmente en México: Stripe documenta que los cargos
 * domésticos mexicanos pasan por consulta antes de volverse disputa formal, y
 * que en esa fase «puedes resolver el caso sin incurrir en comisión de disputa
 * emitiendo una devolución completa». No responder a una consulta se lee como
 * aceptación y escala a un contracargo casi imposible de ganar.
 *
 * En un contracargo ya formado NO se devuelve: el dinero ya está retenido y la
 * comisión ya se cobró, así que devolver sería pagar dos veces. Ésos se
 * registran para que los decida una persona.
 */
async function manejarDisputaNueva(disputa: Stripe.Dispute): Promise<void> {
    const chargeId = typeof disputa.charge === 'string' ? disputa.charge : disputa.charge?.id;
    const esConsulta = String(disputa.status).startsWith('warning');
    console.log(`⚖️ DISPUTA ${disputa.id} · ${disputa.status} · ${disputa.reason} · `
        + `${disputa.amount / 100} ${disputa.currency.toUpperCase()} · `
        + `${esConsulta ? 'CONSULTA (aún se puede evitar la comisión)' : 'CONTRACARGO FORMAL'}`);

    try {
        await getSupabaseAdmin().from('avisos_infraestructura').insert({
            asunto: esConsulta ? 'disputa-consulta' : 'disputa-formal',
            detalle: {
                disputa: disputa.id, charge: chargeId, motivo: disputa.reason,
                estado: disputa.status, mxn: disputa.amount / 100,
                vence: disputa.evidence_details?.due_by ?? null,
            },
        });
    } catch { /* la bitácora no bloquea nada */ }

    if (!esConsulta) {
        console.warn('   contracargo ya formado: la comisión ya se cobró. '
            + 'Devolver ahora sería pagar dos veces. Lo decide una persona.');
        return;
    }
    if (!chargeId || !devolucionAutomaticaActiva()) return;
    try {
        console.log(`   → ${await devolverYCortar(chargeId, `consulta_${disputa.reason}`)}`);
    } catch (e) {
        console.error('   ❌ no se pudo devolver:', e);
    }
}

