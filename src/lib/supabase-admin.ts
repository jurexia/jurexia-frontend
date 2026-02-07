import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service_role key
// This client bypasses Row Level Security (RLS) - use ONLY in server-side code (API routes, webhooks)

let adminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
    if (!adminInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured');
        }

        adminInstance = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return adminInstance;
}

// Plan configuration mapping
export const PLAN_CONFIG = {
    gratuito: { queriesLimit: 5, isUnlimited: false },
    pro_monthly: { queriesLimit: 170, isUnlimited: false },
    pro_annual: { queriesLimit: 170, isUnlimited: false },
    platinum_monthly: { queriesLimit: -1, isUnlimited: true },
    platinum_annual: { queriesLimit: -1, isUnlimited: true },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;

/**
 * Update a user's subscription in Supabase based on Stripe events
 */
export async function updateUserSubscription(
    email: string,
    subscriptionType: PlanType,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string,
) {
    const config = PLAN_CONFIG[subscriptionType];

    const { error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            subscription_type: subscriptionType,
            queries_limit: config.queriesLimit,
            queries_used: 0,
            stripe_customer_id: stripeCustomerId || undefined,
            stripe_subscription_id: stripeSubscriptionId || undefined,
            is_active: true,
            updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('email', email);

    if (error) {
        console.error(`Failed to update subscription for ${email}:`, error);
        throw error;
    }

    console.log(`✅ Updated subscription for ${email}: ${subscriptionType} (limit: ${config.queriesLimit})`);
}

/**
 * Downgrade a user to the free plan
 */
export async function downgradeToFree(email: string) {
    const { error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            subscription_type: 'gratuito',
            queries_limit: 5,
            queries_used: 0,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('email', email);

    if (error) {
        console.error(`Failed to downgrade ${email}:`, error);
        throw error;
    }

    console.log(`✅ Downgraded ${email} to free plan`);
}

/**
 * Reset the query count for a user (called on successful payment renewal)
 */
export async function resetUserQueries(email: string) {
    const { error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            queries_used: 0,
            updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('email', email);

    if (error) {
        console.error(`Failed to reset queries for ${email}:`, error);
        throw error;
    }

    console.log(`✅ Reset query count for ${email}`);
}

/**
 * Get user profile by email (server-side, bypasses RLS)
 */
export async function getUserByEmail(email: string) {
    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error(`Failed to get user by email ${email}:`, error);
        return null;
    }

    return data;
}
