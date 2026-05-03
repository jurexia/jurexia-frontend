/**
 * Email verification utilities for deferred verification flow.
 * Users can register and use the app immediately, but unverified
 * email accounts are limited to prevent abuse (unlimited free accounts).
 */

import { supabase } from './supabase';

// Maximum queries allowed for accounts with unverified email
export const UNVERIFIED_QUERY_LIMIT = 2;

/**
 * Check if the current user's email is verified.
 * Google OAuth users are always considered verified.
 * Email/password users need to confirm their email.
 */
export async function isEmailVerified(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Google OAuth users are always verified
    if (user.app_metadata?.provider === 'google') return true;

    // Check email_confirmed_at from Supabase auth
    return !!user.email_confirmed_at;
}

/**
 * Get verification status with details for UI display.
 */
export async function getVerificationStatus(): Promise<{
    isVerified: boolean;
    provider: string;
    email: string | undefined;
}> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isVerified: false, provider: 'unknown', email: undefined };

    const provider = user.app_metadata?.provider || 'email';
    const isVerified = provider === 'google' || !!user.email_confirmed_at;

    return { isVerified, provider, email: user.email };
}

/**
 * Send a verification email to the current user.
 * Uses Supabase's built-in email verification.
 */
export async function sendVerificationEmail(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('No user email found');

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
            emailRedirectTo: typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback`
                : 'https://iurexia.com/auth/callback',
        }
    });

    if (error) throw error;
}
