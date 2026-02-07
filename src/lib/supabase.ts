import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'iurexia-auth', // Consistent storage key
        flowType: 'pkce', // More secure auth flow
    }
})

// Auth helper functions
export async function signUpWithEmail(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                plan: 'gratuito',
            }
        }
    })

    if (error) throw error
    return data
}

export async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) throw error
    return data
}

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            }
        }
    })

    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

// Profile types
export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    subscription_type: 'gratuito' | 'pro_monthly' | 'pro_annual' | 'platinum_monthly' | 'platinum_annual';
    queries_used: number;
    queries_limit: number;
    subscription_start: string;
    subscription_end: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Profile management functions
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) {
        console.error('Error fetching profile:', error)
        return null
    }
    return data
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function incrementQueryCount(userId: string) {
    const { data, error } = await supabase.rpc('increment_query_count', { p_user_id: userId })

    // Fallback if RPC doesn't exist
    if (error) {
        const profile = await getUserProfile(userId)
        if (profile) {
            return updateUserProfile(userId, { queries_used: profile.queries_used + 1 })
        }
    }
    return data
}

export async function checkCanQuery(userId: string): Promise<{ canQuery: boolean; remaining: number }> {
    const profile = await getUserProfile(userId)

    if (!profile) {
        return { canQuery: false, remaining: 0 }
    }

    if (!profile.is_active) {
        return { canQuery: false, remaining: 0 }
    }

    // Platinum plans have unlimited queries
    if (profile.subscription_type === 'platinum_monthly' || profile.subscription_type === 'platinum_annual') {
        return { canQuery: true, remaining: -1 } // -1 = unlimited
    }

    const remaining = profile.queries_limit - profile.queries_used
    return {
        canQuery: remaining > 0,
        remaining: Math.max(0, remaining)
    }
}

export async function getSubscriptionInfo(userId: string) {
    const profile = await getUserProfile(userId)

    if (!profile) return null

    return {
        type: profile.subscription_type,
        queriesUsed: profile.queries_used,
        queriesLimit: profile.queries_limit,
        isUnlimited: profile.subscription_type === 'platinum_monthly' || profile.subscription_type === 'platinum_annual',
        isActive: profile.is_active,
        startDate: profile.subscription_start,
        endDate: profile.subscription_end
    }
}

// Helper to check if a plan type is unlimited
export function isUnlimitedPlan(subscriptionType: string): boolean {
    return subscriptionType === 'platinum_monthly' || subscriptionType === 'platinum_annual';
}
