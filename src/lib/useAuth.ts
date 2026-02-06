'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUserProfile, UserProfile } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
}

// Timeout wrapper for async operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
        )
    ]);
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
        isAuthenticated: false,
    });

    const refreshSession = useCallback(async () => {
        try {
            const { data: { session }, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Session refresh failed:', error);
            return null;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                // Try to get session with timeout (5 seconds max)
                const { data: { session } } = await withTimeout(
                    supabase.auth.getSession(),
                    5000
                );

                if (!isMounted) return;

                if (session?.user) {
                    // Check if token is expired or about to expire (within 5 minutes)
                    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
                    const now = Date.now();
                    const fiveMinutes = 5 * 60 * 1000;

                    let validSession: Session | null = session;

                    if (expiresAt && expiresAt - now < fiveMinutes) {
                        // Token expiring soon, try to refresh
                        console.log('Token expiring soon, refreshing...');
                        validSession = await refreshSession();
                    }

                    if (validSession?.user) {
                        // Get user profile with timeout
                        const profile = await withTimeout(
                            getUserProfile(validSession.user.id),
                            5000
                        );

                        if (isMounted) {
                            setAuthState({
                                user: validSession.user,
                                profile,
                                loading: false,
                                isAuthenticated: true,
                            });
                        }
                    } else {
                        // Session invalid, clear state
                        if (isMounted) {
                            setAuthState({
                                user: null,
                                profile: null,
                                loading: false,
                                isAuthenticated: false,
                            });
                        }
                    }
                } else {
                    // No session
                    if (isMounted) {
                        setAuthState({
                            user: null,
                            profile: null,
                            loading: false,
                            isAuthenticated: false,
                        });
                    }
                }
            } catch (error) {
                console.error('Auth init error:', error);

                // On timeout or error, try to clear potentially corrupted session
                try {
                    await supabase.auth.signOut({ scope: 'local' });
                } catch (signOutError) {
                    console.error('Sign out error:', signOutError);
                }

                if (isMounted) {
                    setAuthState({
                        user: null,
                        profile: null,
                        loading: false,
                        isAuthenticated: false,
                    });
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                console.log('Auth state changed:', event);

                if (event === 'TOKEN_REFRESHED') {
                    console.log('Token refreshed successfully');
                }

                if (event === 'SIGNED_OUT') {
                    setAuthState({
                        user: null,
                        profile: null,
                        loading: false,
                        isAuthenticated: false,
                    });
                    return;
                }

                if (session?.user) {
                    try {
                        const profile = await withTimeout(
                            getUserProfile(session.user.id),
                            5000
                        );
                        if (isMounted) {
                            setAuthState({
                                user: session.user,
                                profile,
                                loading: false,
                                isAuthenticated: true,
                            });
                        }
                    } catch (error) {
                        console.error('Profile fetch error:', error);
                        if (isMounted) {
                            setAuthState({
                                user: session.user,
                                profile: null,
                                loading: false,
                                isAuthenticated: true,
                            });
                        }
                    }
                } else {
                    if (isMounted) {
                        setAuthState({
                            user: null,
                            profile: null,
                            loading: false,
                            isAuthenticated: false,
                        });
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [refreshSession]);

    return authState;
}

// Hook to require authentication
export function useRequireAuth(redirectTo: string = '/login') {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Only redirect after loading completes and user is not authenticated
        if (!auth.loading && !auth.isAuthenticated) {
            router.push(redirectTo);
        }
    }, [auth.loading, auth.isAuthenticated, router, redirectTo]);

    return auth;
}
