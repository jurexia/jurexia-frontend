import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { finDelAcceso, getStripe, getPlanFromSubscription, PLANS, PlanId, isUpgrade, getPlanIdFromPriceId } from '@/lib/stripe';
import {
    updateUserSubscription,
    downgradeToFree,
    resetUserQueries,
    suspenderPorImpago,
    levantarSuspension,
    levantarCierreSolicitado,
    marcarImpago,
    bloquearPorDisputa,
    PlanType,
    PLAN_CONFIG,
} from '@/lib/supabase-admin';
import { guardarTarjetaQuePague, suscripcionDeLaFactura } from '@/lib/cobro-pendiente';
import { avisarSuspension } from '@/lib/correo/suspension';
import { conTope, medirCompraMeta } from '@/lib/meta-capi';
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    /* `customer_details.email` ES EL TERCERO Y HACE FALTA (14-sep-2026).
       Los dos primeros bastan cuando la sesión nace en nuestra web, que ya sabe
       quién compra. Pero un ENLACE DE PAGO de Stripe —el que se manda por
       correo— no lleva `customer_email` ni metadatos de usuario: el correo lo
       teclea el cliente en la pantalla de cobro y aterriza aquí. Sin este
       tercer intento, la función se iba por el `return` de abajo con el dinero
       ya cobrado y sin abonar nada, y el fallo no se vería hasta que el cliente
       reclamara. */
    const email = (session.customer_email
        || session.customer_details?.email
        || session.metadata?.userEmail || '').toLowerCase().trim();

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

    /* ═══════════════════════════════════════════════════════════════════════
       UNA RECARGA NO ES UNA SUSCRIPCIÓN
       ═══════════════════════════════════════════════════════════════════════
       El taller vende recargas de diez proyectos por 250 MXN, pago único y sin
       caducidad. Llegan por este mismo evento, así que hay que apartarlas ANTES
       de que el flujo de suscripciones las tome por un cambio de plan: si no,
       quien recarga vería su plan recalculado a partir de un precio que no es
       de ningún plan, y el guardián de más abajo lo dejaría en «gratuito».

       SE ACREDITA CON LA FUNCIÓN DE LA BASE, no con un `update` desde aquí, y
       por dos motivos: suma y escribe el asiento en una sola transacción, y es
       IDEMPOTENTE. Stripe reintenta los webhooks —es su diseño, no un fallo—, y
       sin esa garantía un reintento regala diez proyectos. El seguro es la
       unicidad de `stripe_session_id` en `taller_recargas`. */
    if (session.metadata?.ruta === 'recarga_taller') {
        const proyectos = parseInt(session.metadata?.proyectos || '0', 10);
        if (!proyectos || proyectos < 0) {
            console.error(`❌ Recarga sin proyectos en metadata para ${email}:`, session.metadata);
            return;
        }
        const admin = getSupabaseAdmin();
        const { data: perfil } = await admin
            .from('user_profiles').select('id').eq('email', email).limit(1).maybeSingle();
        if (!perfil?.id) {
            // NO SE TRAGA EL FALLO EN SILENCIO: hay dinero cobrado y sin abonar.
            console.error(`🚨 RECARGA PAGADA SIN PERFIL — ${email} pagó ${session.amount_total} y no hay a quién abonarle. Sesión ${session.id}`);
            return;
        }
        const { data: res, error: errRec } = await admin.rpc('acreditar_recarga_taller', {
            p_user_id: perfil.id,
            p_email: email,
            p_proyectos: proyectos,
            p_importe_centavos: session.amount_total ?? 0,
            p_session_id: session.id,
            p_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        });
        if (errRec) {
            console.error(`🚨 No se pudo acreditar la recarga de ${email} (sesión ${session.id}):`, errRec);
            throw errRec;   // que Stripe reintente: el abono es idempotente
        }
        console.log(`🔋 Recarga acreditada: ${email} +${proyectos} proyectos`,
                    (res as { duplicada?: boolean })?.duplicada ? '(reintento, ya estaba)' : '');
        return;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       RECARGA DE CONSULTAS — 200 MXN, 187 consultas, sin caducidad
       ═══════════════════════════════════════════════════════════════════════
       Misma forma que la del taller y por las mismas razones: se aparta ANTES
       del flujo de suscripciones y se abona con una función de la base que es
       idempotente, porque Stripe reintenta y un reintento regalaría 187.

       LA CANTIDAD SE LEE DE LA SESIÓN, NO DE LOS METADATOS. El enlace de pago
       permite ajustar cuántas recargas se llevan (de 1 a 10), así que el
       `consultas` del metadato es el tamaño de UNA y hay que multiplicarlo por
       lo que realmente compró. Confiar sólo en el metadato le cobraría cinco
       recargas y le abonaría una. */
    if (session.metadata?.ruta === 'recarga_consultas') {
        const porPaquete = parseInt(session.metadata?.consultas || '0', 10);
        if (!porPaquete || porPaquete <= 0) {
            console.error(`❌ Recarga de consultas sin cantidad en metadata para ${email}:`, session.metadata);
            return;
        }

        let cantidad = 1;
        try {
            const lineas = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 10 });
            cantidad = lineas.data.reduce((n, l) => n + (l.quantity ?? 1), 0) || 1;
        } catch (e) {
            // Se sigue con una: abonar de menos se corrige a mano y deja al
            // cliente servido; abonar de más regala consultas sin control.
            console.error(`⚠️ No pude leer las líneas de ${session.id}; abono una recarga:`, e);
        }
        const consultas = porPaquete * cantidad;

        const admin = getSupabaseAdmin();
        const { data: perfil } = await admin
            .from('user_profiles').select('id').eq('email', email).limit(1).maybeSingle();
        if (!perfil?.id) {
            console.error(`🚨 RECARGA DE CONSULTAS PAGADA SIN PERFIL — ${email} pagó ${session.amount_total} y no hay a quién abonarle. Sesión ${session.id}`);
            return;
        }

        const { data: res, error: errRec } = await admin.rpc('acreditar_recarga_consultas', {
            p_user_id: perfil.id,
            p_email: email,
            p_consultas: consultas,
            p_importe_centavos: session.amount_total ?? 0,
            p_session_id: session.id,
            p_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        });
        if (errRec) {
            console.error(`🚨 No se pudo acreditar la recarga de consultas de ${email} (sesión ${session.id}):`, errRec);
            throw errRec;   // que Stripe reintente: el abono es idempotente
        }
        const info = res as { duplicada?: boolean; disponibles?: number } | null;
        console.log(`🔋 Consultas acreditadas: ${email} +${consultas} (quedan ${info?.disponibles ?? '?'})`,
                    info?.duplicada ? '(reintento, ya estaba)' : '');
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

        /* LAS VIGENTES Y LAS VENCIDAS (29-sep-2026). Desde que el checkout ya no
           cancela nada antes de cobrar, ESTE es el único sitio donde se retira la
           suscripción anterior, así que también tiene que ver las que están en
           `past_due`/`unpaid` (antes sólo miraba las activas). */
        const customerSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 20,
        });

        const otherSubscriptions = customerSubscriptions.data.filter(
            (sub) => sub.id !== newSubscriptionId
                && ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)
        );

        if (otherSubscriptions.length > 0) {
            // Determine new plan tier
            const newPriceId = subscription.items.data[0]?.price.id;
            const newPlanId = getPlanIdFromPriceId(newPriceId || '');

            for (const oldSub of otherSubscriptions) {
                const oldPriceId = oldSub.items.data[0]?.price.id;
                const oldPlanId = getPlanIdFromPriceId(oldPriceId || '');

                const vencida = oldSub.status === 'past_due' || oldSub.status === 'unpaid';
                if (vencida || isUpgrade(oldPlanId, newPlanId)) {
                    // New plan is higher (o la vieja no se estaba pagando) → cancel old ✅
                    try {
                        /* CON PRORRATEO Y FACTURA INMEDIATA la que estaba al
                           corriente (29-sep-2026): el tiempo pagado y no usado
                           vuelve como saldo del cliente y se descuenta de su
                           siguiente cobro. Sin prorrateo lo perdía entero (pagaba
                           dos veces el mismo tramo). La vencida no se prorratea:
                           ese periodo no se pagó. */
                        if (vencida) {
                            await stripe.subscriptions.cancel(oldSub.id);
                        } else {
                            await stripe.subscriptions.cancel(oldSub.id, { prorate: true, invoice_now: true });
                        }
                        console.log(`✅ Cancelled old subscription ${oldSub.id} (${oldPlanId} → ${newPlanId}${vencida ? ', vencida' : ', con prorrateo'})`);
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

    // ── META: Purchase + Subscribe por la API de Conversiones ───────
    // Después de retirar la suscripción anterior, para no contar como compra
    // un «downgrade» que se acaba de revertir (ese camino sale con `return`
    // arriba). NUNCA rompe ni retrasa el webhook: `medirCompraMeta` no lanza,
    // su fetch se corta a los 3 s, y `conTope` suelta todo a los 4 s aunque la
    // consulta a Supabase se quede colgada. Sin `META_CAPI_TOKEN` no hace nada.
    try {
        await conTope(medirCompraMeta({
            admin: getSupabaseAdmin(),
            sesion: session,
            email,
            plan: subscriptionType,
        }), 4000);
    } catch {
        // inalcanzable: medirCompraMeta y conTope no lanzan
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
        // `finDelAcceso` y no `current_period_end`, que ya no viene en la
        // suscripción: leerlo aquí lanzaba y el aviso de Stripe fallaba entero
        // (26-sep-2026, ver lib/stripe.ts).
        const periodEnd = finDelAcceso(subscription);
        console.log(`⏳ User ${email} scheduled cancellation — access until ${periodEnd?.toISOString() ?? '(sin fecha)'}`);
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
        // El plan se conserva; el acceso lo corta `invoice.payment_failed`,
        // que suspende al primer rechazo y manda el aviso con la factura. No
        // se suspende aquí: si este evento llegara primero, el de la factura
        // encontraría la cuenta ya suspendida y el aviso no saldría nunca.
        console.warn(`⚠️ Subscription past_due for ${email} — la suspensión la hace invoice.payment_failed`);
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
            // Y se borra la marca del adeudo aunque NO estuviera suspendido:
            // pagó, así que ya no debe nada.
            await marcarImpago(email, null);
        } catch (e) {
            console.error(`⚠️ Entró el pago de ${email} pero no pude levantar su suspensión:`, e);
        }

        // Y quien cerró su cuenta a petición propia vuelve pagando (28-sep-2026).
        // Sólo con el pago de una suscripción: es lo que se le ofrece en el muro,
        // y una recarga suelta no es volver a contratar.
        if ((invoice.billing_reason || '').startsWith('subscription')) {
            try {
                await levantarCierreSolicitado(email);
            } catch (e) {
                console.error(`⚠️ Entró el pago de ${email} pero no pude reabrir su cuenta cerrada:`, e);
            }
        }

        /* EL RECIBO, CON EL NOMBRE QUE VERÁ EN SU BANCO (23-sep-2026).
           Un cliente dejó de pagar porque en su estado de cuenta el cargo salió
           como «STR*AGREGADOR …» y no encontró prueba de que fuera nuestro.
           Stripe mandó bien el descriptor —se comprobaron sus cinco cargos—,
           pero el banco imprimió otra cosa, y eso no lo decide el comercio. Lo
           que sí podemos es avisar del cobro y decir cómo se verá. Va después
           de todo lo que toca la cuenta: un correo que falle no puede
           estropear el registro de un pago que entró. */
        try {
            const { enviarReciboDeCobro } = await import('@/lib/correo/recibo');
            await enviarReciboDeCobro(invoice, invoice.customer_name ?? null);
        } catch (e) {
            console.error(`⚠️ No salió el recibo de ${email}:`, e);
        }
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const email = (invoice.customer_email || '').toLowerCase().trim();
    const attemptCount = invoice.attempt_count ?? 1;
    const motivo = invoice.billing_reason || '';

    console.log('⚠️ Payment failed:', {
        invoiceId: invoice.id,
        customerEmail: email,
        attemptCount,
        billingReason: motivo,
    });

    if (!email) {
        console.warn('⚠️ Cobro rechazado sin correo en la factura — no se puede suspender a nadie');
        return;
    }

    // SÓLO LAS RENOVACIONES DE UNA SUSCRIPCIÓN. El primer cobro de un alta
    // (`subscription_create`) que falla deja la suscripción `incomplete`: esa
    // persona nunca tuvo el plan, así que no hay acceso de pago que cortar, y
    // suspenderla le cerraría hasta el nivel gratuito. Las facturas sueltas
    // tampoco son una mensualidad.
    if (motivo === 'subscription_create' || !motivo.startsWith('subscription')) {
        console.log(`ℹ️ Cobro rechazado de ${email} (${motivo || 'sin motivo'}): no es una renovación — no se suspende`);
        return;
    }

    try {
        await marcarImpago(email, new Date((invoice.created ?? Math.floor(Date.now() / 1000)) * 1000));
    } catch (e) {
        console.error(`⚠️ No pude marcar el impago de ${email}:`, e);
    }

    // Que la tarjeta con la que pague desde el enlace del correo se quede para
    // los cobros siguientes; si no, el mes que viene volvería a caer.
    const subId = suscripcionDeLaFactura(invoice);
    if (subId) {
        try {
            await guardarTarjetaQuePague(getStripe(), subId);
        } catch (e) {
            console.error(`⚠️ No pude ajustar la tarjeta de ${subId} (${email}):`, e);
        }
    } else {
        console.warn(`⚠️ Sin id de suscripción en la factura de ${email}`);
    }

    // SUSPENSIÓN AL PRIMER RECHAZO (28-sep-2026). Del 31-ago al 28-sep aquí se
    // esperaban 14 días desde la factura impagada; mientras tanto se seguía
    // consultando sin pagar —el 28-sep, 7 de los 21 en mora, con 58 preguntas
    // hechas después del rechazo—. Ahora
    // el primer rechazo suspende, y el muro sólo deja actualizar la tarjeta.
    //
    // SUSPENDER, NO DEGRADAR: la suscripción de Stripe sigue viva y cobrable y
    // el plan del cliente también. Ver `suspenderPorImpago`.
    const recienSuspendido = await suspenderPorImpago(email, `cobro rechazado (intento ${attemptCount})`);

    // El aviso sale UNA vez: cuando la cuenta acaba de pasar a suspendida. Los
    // reintentos de Stripe que vuelvan a fallar no mandan otro correo.
    if (recienSuspendido) {
        try {
            await avisarSuspension(email, invoice);
        } catch (e) {
            console.error(`⚠️ Suspendido ${email} pero no salió el aviso:`, e);
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
/**
 * QUIEN DISPUTA, CANCELACIÓN Y BLOQUEO (15-sep-2026, política de David).
 *
 * Cancela la suscripción viva del cliente y cierra su cuenta. Se aplica a
 * cualquier señal de que el titular desconoció un cargo: la consulta previa,
 * el contracargo formal y el aviso temprano de fraude, que es el propio
 * emisor diciendo que la tarjeta se usó sin autorización.
 *
 * La finalidad es evitar el uso indebido de una tarjeta que ya está en duda.
 * Si el cargo lo desconoció quien no es el titular, seguir cobrando sería
 * seguir el fraude; si lo desconoció el titular por error, la cuenta se
 * restablece escribiendo a soporte y todo su contenido sigue ahí.
 *
 * Nunca lanza: un fallo aquí no puede tumbar el webhook y provocar que
 * Stripe reintente el evento entero.
 */
async function cancelarYBloquearPorDisputa(chargeId: string | undefined, motivo: string): Promise<string> {
    if (!chargeId) return 'sin cargo: no se pudo identificar al cliente';
    const stripe = getStripe();
    const partes: string[] = [];
    let correo = '';

    try {
        const cargo = await stripe.charges.retrieve(chargeId);
        correo = (cargo.billing_details?.email || cargo.receipt_email || '').toLowerCase().trim();
        const clienteId = typeof cargo.customer === 'string' ? cargo.customer : cargo.customer?.id;

        // 1. Cancelar toda suscripción viva. Si no se cancela, Stripe sigue
        //    intentando cobrar al mes siguiente y eso es la vía más rápida a
        //    la segunda disputa del mismo cliente. Pasó: una suscripción
        //    disputada y ganada por el cliente seguía en `past_due`
        //    reintentando cuatro meses después.
        if (clienteId) {
            const subs = await stripe.subscriptions.list({ customer: clienteId, status: 'all', limit: 10 });
            const vivas = subs.data.filter(x => ['active', 'past_due', 'trialing', 'unpaid'].includes(x.status));
            for (const s of vivas) {
                try {
                    await stripe.subscriptions.cancel(s.id);
                    partes.push(`suscripción ${s.id} cancelada`);
                } catch (e) {
                    partes.push(`no pude cancelar ${s.id}`);
                }
            }
            if (!vivas.length) partes.push('sin suscripción viva que cancelar');

            // El correo de la cuenta puede no estar en el cargo (los enlaces
            // de pago no lo llevan): el cliente de Stripe sí lo tiene.
            if (!correo) {
                const cli = await stripe.customers.retrieve(clienteId);
                if (!('deleted' in cli && cli.deleted)) correo = (cli.email || '').toLowerCase().trim();
            }
        }

        // 2. Cerrar la cuenta.
        if (correo) {
            const r = await bloquearPorDisputa(correo, motivo, 'webhook-stripe');
            partes.push(r.ok ? (r.yaEstaba ? 'cuenta ya bloqueada' : 'cuenta bloqueada') : 'NO pude bloquear la cuenta');
        } else {
            partes.push('sin correo: la cuenta NO se bloqueó');
        }
    } catch (e) {
        partes.push(`error: ${e instanceof Error ? e.message : String(e)}`);
    }

    const resumen = partes.join(' · ');
    console.log(`🔒 DISPUTA — ${chargeId} (${correo || 'correo desconocido'}): ${resumen}`);
    try {
        await getSupabaseAdmin().from('avisos_infraestructura').insert({
            asunto: 'disputa-cuenta-bloqueada',
            detalle: { charge: chargeId, correo, motivo, resumen },
        });
    } catch { /* la bitácora no bloquea nada */ }
    return resumen;
}

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
    // Un aviso temprano es el EMISOR diciendo que la tarjeta se usó sin
    // autorización. Es la señal más fuerte de uso indebido que existe, así
    // que la cuenta se cierra aunque el aviso ya no sea accionable para la
    // devolución.
    await cancelarYBloquearPorDisputa(chargeId, `aviso_temprano_${aviso.fraud_type}`);

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

    // La cuenta se cierra en los DOS casos —consulta y contracargo—, porque
    // en los dos el titular ya le dijo a su banco que no reconoce el cargo.
    // Va antes que la devolución: si devolver falla, el bloqueo ya está hecho.
    await cancelarYBloquearPorDisputa(chargeId, `disputa_${disputa.reason}`);

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

