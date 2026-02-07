import Stripe from 'stripe';

// Lazy-initialized Stripe instance (prevents build errors when env vars are missing)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-01-28.clover',
            typescript: true,
        });
    }
    return stripeInstance;
}

// Legacy export for backward compatibility (use getStripe() in new code)
export const stripe = {
    get customers() { return getStripe().customers; },
    get checkout() { return getStripe().checkout; },
    get billingPortal() { return getStripe().billingPortal; },
    get subscriptions() { return getStripe().subscriptions; },
};

// Resolve price IDs at runtime (NOT at module load/build time)
function getPriceId(envVar: string): string | null {
    return process.env[envVar] || null;
}

// Plan definitions with Stripe Price IDs
// NOTE: priceId is a getter to ensure env vars are resolved at runtime, not build time
export const PLANS = {
    gratuito: {
        name: 'Plan Gratuito',
        get priceId() { return null; },
        price: 0,
        currency: 'MXN',
        interval: null,
        queryLimit: 5,
        features: [
            '5 consultas/mes',
            'Búsqueda jurídica con RAG',
            'Filtros de jurisdicción',
            'Acceso a base documental completa'
        ]
    },
    pro_monthly: {
        name: 'Plan Pro',
        get priceId() { return getPriceId('STRIPE_PRICE_PRO_MONTHLY'); },
        price: 149,
        currency: 'MXN',
        interval: 'month' as const,
        queryLimit: 170,
        features: [
            '170 consultas/mes',
            'RAG jurídico sin alucinaciones',
            'Análisis de documentos',
            'Filtros por entidad federativa',
            'Soporte prioritario'
        ]
    },
    pro_annual: {
        name: 'Plan Pro Anual',
        get priceId() { return getPriceId('STRIPE_PRICE_PRO_ANNUAL'); },
        price: 1490,
        currency: 'MXN',
        interval: 'year' as const,
        queryLimit: 170, // per month
        features: [
            '170 consultas/mes (2,040/año)',
            'Todo lo del Plan Pro incluido',
            'Ahorro de $910 MXN al año',
            'Precio fijo garantizado',
            'Soporte prioritario'
        ]
    },
    platinum_monthly: {
        name: 'Plan Platinum',
        get priceId() { return getPriceId('STRIPE_PRICE_PLATINUM_MONTHLY'); },
        price: 599,
        currency: 'MXN',
        interval: 'month' as const,
        queryLimit: -1, // Unlimited
        features: [
            'Consultas ilimitadas',
            'Todo lo del Plan Pro incluido',
            'Consulta con equipo legal',
            'Contrato de servicios profesionales',
            'Soporte VIP dedicado'
        ]
    },
    platinum_annual: {
        name: 'Plan Platinum Anual',
        get priceId() { return getPriceId('STRIPE_PRICE_PLATINUM_ANNUAL'); },
        price: 5990,
        currency: 'MXN',
        interval: 'year' as const,
        queryLimit: -1, // Unlimited
        features: [
            'Consultas ilimitadas todo el año',
            'Todo lo del Plan Platinum incluido',
            'Ahorro de $4,810 MXN al año',
            'Precio fijo garantizado',
            'Soporte VIP dedicado'
        ]
    }
};

export type PlanId = keyof typeof PLANS;

// Get plan type from Stripe subscription
export function getPlanFromSubscription(subscription: Stripe.Subscription | null): PlanId {
    if (!subscription) {
        console.log('⚠️ getPlanFromSubscription: subscription is null');
        return 'gratuito';
    }

    // Log the subscription status - don't reject non-active yet, as newly created subs
    // from checkout may briefly be in 'incomplete' or 'trialing' status
    console.log(`🔍 getPlanFromSubscription: status=${subscription.status}, id=${subscription.id}`);

    const priceId = subscription.items.data[0]?.price.id;
    console.log(`🔍 getPlanFromSubscription: subscription priceId = ${priceId}`);

    // Log all configured price IDs for comparison
    for (const [planId, plan] of Object.entries(PLANS)) {
        const configuredPriceId = plan.priceId;
        console.log(`🔍   ${planId}: configured priceId = ${configuredPriceId}`);
        if (configuredPriceId && configuredPriceId === priceId) {
            console.log(`✅ getPlanFromSubscription: matched plan = ${planId}`);
            return planId as PlanId;
        }
    }

    console.error(`❌ getPlanFromSubscription: no plan matched for priceId ${priceId}. Check STRIPE_PRICE_* env vars!`);
    return 'gratuito';
}

// Check if plan has unlimited queries
export function hasUnlimitedQueries(planId: PlanId): boolean {
    return PLANS[planId].queryLimit === -1;
}

// Get query limit for a plan
export function getQueryLimit(planId: PlanId): number {
    return PLANS[planId].queryLimit;
}

// Format price for display
export function formatPrice(price: number, currency: string = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(price);
}
