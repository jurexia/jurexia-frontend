import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
    typescript: true,
});

// Plan definitions with Stripe Price IDs
export const PLANS = {
    gratuito: {
        name: 'Plan Gratuito',
        priceId: null, // No Stripe price for free plan
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
        priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
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
        priceId: process.env.STRIPE_PRICE_PRO_ANNUAL,
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
        priceId: process.env.STRIPE_PRICE_PLATINUM_MONTHLY,
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
        priceId: process.env.STRIPE_PRICE_PLATINUM_ANNUAL,
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
} as const;

export type PlanId = keyof typeof PLANS;

// Get plan type from Stripe subscription
export function getPlanFromSubscription(subscription: Stripe.Subscription | null): PlanId {
    if (!subscription || subscription.status !== 'active') {
        return 'gratuito';
    }

    const priceId = subscription.items.data[0]?.price.id;

    for (const [planId, plan] of Object.entries(PLANS)) {
        if (plan.priceId === priceId) {
            return planId as PlanId;
        }
    }

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
