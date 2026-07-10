import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service_role key
// This client bypasses Row Level Security (RLS) - use ONLY in server-side code (API routes, webhooks)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminInstance: any = null;

function getSupabaseAdmin(): any {
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
    gratuito: { queriesLimit: 5, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false },
    basico_monthly: { queriesLimit: 5, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false },
    pro_monthly: { queriesLimit: 200, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false },
    pro_annual: { queriesLimit: 200, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false },
    platinum_monthly: { queriesLimit: 700, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false },
    platinum_annual: { queriesLimit: 700, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false },
    ultra_secretarios: { queriesLimit: 140, draftsLimit: 20, sentenciaQueriesLimit: 50, isUnlimited: false },
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
    resetUsage: boolean = false
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

    const updatePayload: any = {
        subscription_type: subscriptionType,
        queries_limit: config.queriesLimit,
        drafts_limit: config.draftsLimit,
        sentencia_queries_limit: config.sentenciaQueriesLimit,
        stripe_customer_id: stripeCustomerId || undefined,
        stripe_subscription_id: stripeSubscriptionId || undefined,
        is_active: true,
        updated_at: new Date().toISOString(),
    };

    if (resetUsage) {
        updatePayload.queries_used = 0;
        updatePayload.drafts_used = 0;
        updatePayload.sentencia_queries_used = 0;
    }

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

    // Force queries_limit override to bypass the DB trigger auto_update_queries_limit
    try {
        console.log(`🔄 Overriding DB trigger queries_limit for ${normalizedEmail} to ${config.queriesLimit}`);
        await getSupabaseAdmin()
            .from('user_profiles')
            .update({ queries_limit: config.queriesLimit })
            .eq('email', normalizedEmail);
    } catch (triggerOverrideErr) {
        console.error(`⚠️ DB trigger override failed for ${normalizedEmail} (continuing):`, triggerOverrideErr);
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

            // Force queries_limit override on retry
            try {
                await getSupabaseAdmin()
                    .from('user_profiles')
                    .update({ queries_limit: config.queriesLimit })
                    .eq('id', profileId);
            } catch (triggerOverrideErr) {
                console.error(`⚠️ DB trigger override retry failed for ${profileId} (continuing):`, triggerOverrideErr);
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
 * Downgrade a user to the free plan.
 * @param canceledSubscriptionId - If provided, only downgrade if this matches the
 *   user's current stripe_subscription_id. This prevents incorrectly downgrading
 *   users who upgraded (old sub canceled, but new sub is already active).
 */
export async function downgradeToFree(email: string, canceledSubscriptionId?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // ─── Guard: only downgrade if the canceled subscription is the CURRENT one ───
    // When a user upgrades (e.g., Básico → Pro), Stripe cancels the old sub and
    // creates a new one. The webhook fires customer.subscription.deleted for the
    // OLD sub. If the user already has a NEW sub active, we must NOT downgrade.
    if (canceledSubscriptionId) {
        const { data: profile } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('stripe_subscription_id, subscription_type')
            .eq('email', normalizedEmail)
            .single();

        if (profile && profile.stripe_subscription_id && profile.stripe_subscription_id !== canceledSubscriptionId) {
            console.log(`⏭️ SKIP downgrade for ${normalizedEmail}: webhook sub=${canceledSubscriptionId}, current sub=${profile.stripe_subscription_id} (user has a newer subscription — likely an upgrade)`);
            return;
        }
    }

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            subscription_type: 'gratuito',
            queries_limit: PLAN_CONFIG.gratuito.queriesLimit,
            queries_used: 0,
            drafts_limit: 0,
            drafts_used: 0,
            sentencia_queries_limit: 0,
            sentencia_queries_used: 0,
            stripe_subscription_id: null,
            is_active: false,  // FIX #5: Marcar como inactivo al downgrade
            updated_at: new Date().toISOString(),
        } as any)
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
            drafts_used: 0,
            sentencia_queries_used: 0,
            updated_at: new Date().toISOString(),
        } as any)
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
