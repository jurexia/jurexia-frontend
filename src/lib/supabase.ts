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
    const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'https://iurexia.com/auth/callback';

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                plan: 'gratuito',
            },
            emailRedirectTo: redirectUrl,
        }
    })

    if (error) throw error
    return data
}

export async function resendConfirmationEmail(email: string) {
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
            emailRedirectTo: typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback`
                : 'https://iurexia.com/auth/callback',
        }
    })

    if (error) throw error
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
    const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'https://www.iurexia.com/auth/callback';

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            }
        }
    })

    if (error) throw error
    return data
}

export async function signInWithApple() {
    const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'https://www.iurexia.com/auth/callback';

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
            redirectTo: redirectUrl,
        }
    })

    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function resetPassword(email: string) {
    const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : 'https://iurexia.com/auth/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    })

    if (error) throw error
}

export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    })

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
    estado: string | null;
    subscription_type: 'gratuito' | 'basico_monthly' | 'pro_monthly' | 'pro_annual' | 'platinum_monthly' | 'platinum_annual' | 'ultra_secretarios';
    queries_used: number;
    queries_limit: number;
    drafts_used: number;
    drafts_limit: number;
    sentencia_queries_used: number;
    sentencia_queries_limit: number;
    subscription_start: string;
    subscription_end: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    is_active: boolean;
    can_access_sentencia: boolean;
    has_seen_welcome_video: boolean;
    /** Parte del grupo fundador que probó la app de Android antes del lanzamiento. */
    beta_android_invitado: boolean;
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

export async function updateUserEstado(userId: string, estado: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .update({ estado })
        .eq('id', userId)
        .select()
        .single()

    if (error) {
        console.error('Error updating estado:', error)
        throw error
    }
    return data
}

export async function markWelcomeVideoSeen(userId: string) {
    const { error } = await supabase
        .from('user_profiles')
        .update({ has_seen_welcome_video: true })
        .eq('id', userId)
    if (error) console.error('Error marking welcome video seen:', error)
}

export async function incrementQueryCount(userId: string) {
    // Now uses transactional consume_query RPC (SELECT ... FOR UPDATE)
    const { data, error } = await supabase.rpc('consume_query', { p_user_id: userId })

    if (error) {
        console.error('Error calling consume_query RPC:', error)
        // Fallback to direct update if RPC doesn't exist
        const profile = await getUserProfile(userId)
        if (profile) {
            return updateUserProfile(userId, { queries_used: profile.queries_used + 1 })
        }
    }
    return data
}

export async function checkCanQuery(userId: string): Promise<{ canQuery: boolean; remaining: number }> {
    // Use read-only get_quota_status RPC
    const { data, error } = await supabase.rpc('get_quota_status', { p_user_id: userId })

    if (error || !data) {
        // Fallback to profile-based check
        const profile = await getUserProfile(userId)
        if (!profile || !profile.is_active) {
            return { canQuery: false, remaining: 0 }
        }
        const remaining = profile.queries_limit - profile.queries_used
        return { canQuery: remaining > 0, remaining: Math.max(0, remaining) }
    }

    const canQuery = data.can_query ?? false
    const limit = data.limit ?? 0
    const used = data.used ?? 0
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used)

    return { canQuery, remaining }
}

export async function getSubscriptionInfo(userId: string) {
    const profile = await getUserProfile(userId)

    if (!profile) return null

    return {
        type: profile.subscription_type,
        queriesUsed: profile.queries_used,
        queriesLimit: profile.queries_limit,
        isUnlimited: false,
        isActive: profile.is_active,
        startDate: profile.subscription_start,
        endDate: profile.subscription_end
    }
}

// Helper to check if a plan type is unlimited (no plans are unlimited now)
export function isUnlimitedPlan(subscriptionType: string): boolean {
    return false;
}

// Helper to check if a plan is the Ultra Secretarios plan
export function isUltraPlan(subscriptionType: string): boolean {
    return subscriptionType === 'ultra_secretarios';
}

// Draft management for Ultra Secretarios
export async function incrementDraftCount(userId: string) {
    const { data, error } = await supabase.rpc('consume_draft', { p_user_id: userId })

    if (error) {
        console.error('Error calling consume_draft RPC:', error)
        // Fallback to direct update
        const profile = await getUserProfile(userId)
        if (profile) {
            return updateUserProfile(userId, { drafts_used: profile.drafts_used + 1 })
        }
    }
    return data
}

export async function checkCanDraft(userId: string): Promise<{ canDraft: boolean; remaining: number }> {
    const profile = await getUserProfile(userId)
    if (!profile || !profile.is_active) {
        return { canDraft: false, remaining: 0 }
    }

    if (profile.drafts_limit <= 0) {
        // No draft limit (non-ultra plans don't have draft access by default)
        return { canDraft: false, remaining: 0 }
    }

    const remaining = profile.drafts_limit - profile.drafts_used
    return { canDraft: remaining > 0, remaining: Math.max(0, remaining) }
}

// Sentencia query management (separate counter for redactor-sentencia chat)
export async function incrementSentenciaQueryCount(userId: string) {
    const { data, error } = await supabase.rpc('consume_sentencia_query', { p_user_id: userId })

    if (error) {
        console.error('Error calling consume_sentencia_query RPC:', error)
        // Fallback to direct update
        const profile = await getUserProfile(userId)
        if (profile) {
            return updateUserProfile(userId, { sentencia_queries_used: profile.sentencia_queries_used + 1 })
        }
    }
    return data
}

export async function checkCanSentenciaQuery(userId: string): Promise<{ canQuery: boolean; remaining: number }> {
    const { data, error } = await supabase.rpc('get_sentencia_quota_status', { p_user_id: userId })

    if (error || !data) {
        // Fallback to profile-based check
        const profile = await getUserProfile(userId)
        if (!profile || !profile.is_active) {
            return { canQuery: false, remaining: 0 }
        }
        if (profile.sentencia_queries_limit <= 0) {
            return { canQuery: false, remaining: 0 }
        }
        const remaining = profile.sentencia_queries_limit - profile.sentencia_queries_used
        return { canQuery: remaining > 0, remaining: Math.max(0, remaining) }
    }

    const canQuery = data.can_query ?? false
    const limit = data.limit ?? 0
    const used = data.used ?? 0
    const remaining = limit <= 0 ? 0 : Math.max(0, limit - used)

    return { canQuery, remaining }
}

// ── Redactor TCC Beta — Estudios storage ──────────────────────────────────

export interface RedactorEstudio {
    id: string;
    user_id: string;
    tipo_asunto: string;
    materia: string;
    circuito: number;
    estudio_markdown: string;
    n_palabras: number;
    total_elapsed_s: number;
    precedentes_utiles: any[];
    created_at: string;
}

export async function getRedactorEstudios(): Promise<RedactorEstudio[]> {
    // Defensa en profundidad: filtramos explícitamente por user_id además de
    // depender de RLS. Si la sesión no está lista o no hay usuario, devolvemos
    // [] sin hacer la query.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('redactor_estudios')
        .select('id, tipo_asunto, materia, circuito, n_palabras, total_elapsed_s, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) {
        console.error('Error loading estudios:', error);
        return [];
    }
    return (data || []) as RedactorEstudio[];
}

export async function getRedactorEstudio(id: string): Promise<RedactorEstudio | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('redactor_estudios')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
    if (error) {
        console.error('Error loading estudio:', error);
        return null;
    }
    return data as RedactorEstudio;
}
