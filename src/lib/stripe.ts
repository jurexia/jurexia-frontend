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

const PROMOTION_PRICE_IDS: Record<string, string> = {
    STRIPE_PRICE_BASICO_MONTHLY: 'price_1T8IMF3uD85CqvjMM49lRfxI', // $79 MXN
    STRIPE_PRICE_BASICO_ANNUAL: 'price_1Tx9m23uD85CqvjM9OPUDdQg', // $790 MXN
    STRIPE_PRICE_PRO_MONTHLY: 'price_1Sy2l63uD85CqvjMku0MM4k3', // $149 MXN
    STRIPE_PRICE_PRO_ANNUAL: 'price_1Sy2l23uD85CqvjMOwcGmC1N', // $1,490 MXN
    STRIPE_PRICE_PLATINUM_MONTHLY: 'price_1Sy2l03uD85CqvjMMJ4mFqhw', // $599 MXN
    STRIPE_PRICE_PLATINUM_ANNUAL: 'price_1Sy2kw3uD85CqvjM45ZABmfE', // $5,990 MXN
    STRIPE_PRICE_ULTRA_SECRETARIOS: 'price_1T2MzR3uD85CqvjMW6MK8OyG', // $999 MXN
};

// Resolve price IDs at runtime (NOT at module load/build time)
function getPriceId(envVar: string): string | null {
    const cleanVar = envVar.replace('NEXT_PUBLIC_', '');
    const envValue = process.env[envVar] || process.env[cleanVar] || process.env[`NEXT_PUBLIC_${cleanVar}`] || null;

    // List of expensive (non-promotional) price IDs to override
    const expensiveIds = [
        'price_1Tqpju3uD85CqvjMUyT7T5Z1', // Básico $129 MXN
        'price_1Tqpjw3uD85CqvjMJ9OdNpqZ', // Pro $249 MXN
        'price_1Tqpjz3uD85CqvjMjf2D3adz', // Pro Anual $2,490 MXN
    ];

    if (envValue && !expensiveIds.includes(envValue)) {
        return envValue;
    }

    return PROMOTION_PRICE_IDS[cleanVar] || null;
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
            'Acceso a Leyes del Estado',
            'Búsqueda inteligente en la base de datos legal de Iurexia',
            'Filtros de jurisdicción',
            'Acceso a base documental completa'
        ]
    },
    basico_monthly: {
        name: 'Plan Básico',
        get priceId() { return getPriceId('STRIPE_PRICE_BASICO_MONTHLY'); },
        price: 79,
        currency: 'MXN',
        interval: 'month' as const,
        queryLimit: 70,
        features: [
            '70 consultas/mes',
            'Búsqueda inteligente en la base de datos legal de Iurexia',
            'Soporte estándar',
        ]
    },
    basico_annual: {
        name: 'Plan Básico Anual',
        get priceId() { return getPriceId('STRIPE_PRICE_BASICO_ANNUAL'); },
        price: 790, // Precio con descuento sugerido (10 meses)
        currency: 'MXN',
        interval: 'year' as const,
        queryLimit: 70, // por mes
        features: [
            '70 consultas/mes (840/año)',
            'Búsqueda inteligente en la base de datos legal de Iurexia',
            'Ahorro de $158 MXN al año',
            'Soporte estándar',
        ]
    },
    pro_monthly: {
        name: 'Plan Pro',
        get priceId() { return getPriceId('STRIPE_PRICE_PRO_MONTHLY'); },
        price: 149,
        currency: 'MXN',
        interval: 'month' as const,
        queryLimit: 140,
        features: [
            '140 consultas/mes',
            'Búsqueda jurídica precisa y fundamentada',
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
        queryLimit: 140, // per month
        features: [
            '140 consultas/mes (1,680/año)',
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
        queryLimit: 560,
        features: [
            '560 consultas/mes — ideal para despachos',
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
        queryLimit: 560,
        features: [
            '560 consultas/mes (6,720/año)',
            'Todo lo del Plan Platinum incluido',
            'Ahorro de $4,810 MXN al año',
            'Precio fijo garantizado',
            'Soporte VIP dedicado'
        ]
    },
    ultra_secretarios: {
        name: 'Plan Ultra Secretarios',
        get priceId() { return getPriceId('STRIPE_PRICE_ULTRA_SECRETARIOS'); },
        price: 999,
        currency: 'MXN',
        interval: 'month' as const,
        queryLimit: 140,
        sentenciaQueryLimit: 50,
        draftLimit: 20,
        features: [
            '140 consultas/mes al chat principal',
            '50 consultas/mes al Redactor de Sentencias',
            '20 redacciones de sentencia/mes',
            'Acceso exclusivo al Redactor TCC',
            'Soporte dedicado'
        ]
    }
};

export type PlanId = keyof typeof PLANS;

// ─── Plan Hierarchy (higher rank = higher tier) ───────────────────
export const PLAN_RANK: Record<PlanId, number> = {
    gratuito: 0,
    basico_monthly: 1,
    basico_annual: 2,
    pro_monthly: 3,
    pro_annual: 4,
    platinum_monthly: 5,
    platinum_annual: 6,
    ultra_secretarios: 7,
};

/** Returns true if newPlan is strictly higher tier than currentPlan */
export function isUpgrade(currentPlan: PlanId, newPlan: PlanId): boolean {
    return PLAN_RANK[newPlan] > PLAN_RANK[currentPlan];
}

/** Get the PlanId from a Stripe priceId (env var lookup) */
export function getPlanIdFromPriceId(priceId: string): PlanId {
    for (const [planId, plan] of Object.entries(PLANS)) {
        if (plan.priceId && plan.priceId === priceId) {
            return planId as PlanId;
        }
    }
    return 'gratuito';
}

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
