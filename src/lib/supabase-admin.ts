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
 * Update a user's subscription in Supabase based on Stripe events.
 * Includes row-count verification and fallback diagnostics.
 */
export async function updateUserSubscription(
    email: string,
    subscriptionType: PlanType,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string,
) {
    const normalizedEmail = email.toLowerCase().trim();
    const config = PLAN_CONFIG[subscriptionType];

    console.log(`🔄 updateUserSubscription called:`, {
        email: normalizedEmail,
        subscriptionType,
        queriesLimit: config.queriesLimit,
        stripeCustomerId,
        stripeSubscriptionId,
    });

    const updatePayload = {
        subscription_type: subscriptionType,
        queries_limit: config.queriesLimit,
        queries_used: 0,
        stripe_customer_id: stripeCustomerId || undefined,
        stripe_subscription_id: stripeSubscriptionId || undefined,
        is_active: true,
        updated_at: new Date().toISOString(),
    } as Record<string, unknown>;

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update(updatePayload)
        .eq('email', normalizedEmail)
        .select();

    if (error) {
        console.error(`❌ Supabase UPDATE error for ${normalizedEmail}:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });
        throw error;
    }

    // Check if any rows were actually updated
    if (!data || data.length === 0) {
        console.error(`⚠️ UPDATE affected 0 rows for email "${normalizedEmail}"`);

        // Diagnostic: check if the profile exists at all
        const { data: existing, error: lookupError } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('id, email, subscription_type')
            .ilike('email', normalizedEmail);

        if (lookupError) {
            console.error(`❌ Diagnostic lookup failed:`, lookupError);
        } else if (!existing || existing.length === 0) {
            console.error(`❌ No user_profiles row found for email "${normalizedEmail}" — profile may not have been created on signup`);
        } else {
            console.log(`🔍 Found ${existing.length} profile(s) for "${normalizedEmail}":`, existing);
            // The row exists but the update didn't match — could be case sensitivity
            // Retry with ilike match on the actual id
            const profileId = existing[0].id;
            console.log(`🔄 Retrying update using profile id: ${profileId}`);

            const { data: retryData, error: retryError } = await getSupabaseAdmin()
                .from('user_profiles')
                .update(updatePayload)
                .eq('id', profileId)
                .select();

            if (retryError) {
                console.error(`❌ Retry UPDATE by id failed:`, retryError);
                throw retryError;
            }

            if (retryData && retryData.length > 0) {
                console.log(`✅ Retry succeeded! Updated profile for ${normalizedEmail} via id:`, retryData[0]);
                return;
            }

            console.error(`❌ Retry also matched 0 rows — possible constraint violation`);
        }

        throw new Error(`Failed to update subscription: no rows matched for email "${normalizedEmail}"`);
    }

    console.log(`✅ Updated subscription for ${normalizedEmail}: ${subscriptionType} (limit: ${config.queriesLimit})`, {
        updatedRow: data[0],
    });
}

/**
 * Downgrade a user to the free plan
 */
export async function downgradeToFree(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            subscription_type: 'gratuito',
            queries_limit: 5,
            queries_used: 0,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('email', normalizedEmail)
        .select();

    if (error) {
        console.error(`❌ Failed to downgrade ${normalizedEmail}:`, error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.error(`⚠️ downgradeToFree: 0 rows updated for ${normalizedEmail}`);
    } else {
        console.log(`✅ Downgraded ${normalizedEmail} to free plan`, { updatedRow: data[0] });
    }
}

/**
 * Reset the query count for a user (called on successful payment renewal)
 */
export async function resetUserQueries(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            queries_used: 0,
            updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('email', normalizedEmail)
        .select();

    if (error) {
        console.error(`❌ Failed to reset queries for ${normalizedEmail}:`, error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.error(`⚠️ resetUserQueries: 0 rows updated for ${normalizedEmail}`);
    } else {
        console.log(`✅ Reset query count for ${normalizedEmail}`);
    }
}

/**
 * Get user profile by email (server-side, bypasses RLS)
 */
export async function getUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .ilike('email', normalizedEmail)
        .single();

    if (error) {
        console.error(`Failed to get user by email ${normalizedEmail}:`, error);
        return null;
    }

    return data;
}
