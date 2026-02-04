'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUserProfile, UserProfile } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
        isAuthenticated: false,
    });

    useEffect(() => {
        let isMounted = true;

        const setAuthenticatedState = async (session: Session) => {
            if (!isMounted) return;
            try {
                const profile = await getUserProfile(session.user.id);
                if (isMounted) {
                    setAuthState({
                        user: session.user,
                        profile,
                        loading: false,
                        isAuthenticated: true,
                    });
                }
            } catch (err) {
                console.error('[AUTH] Error getting profile:', err);
                if (isMounted) {
                    setAuthState({
                        user: session.user,
                        profile: null,
                        loading: false,
                        isAuthenticated: true,
                    });
                }
            }
        };

        const setUnauthenticatedState = () => {
            if (!isMounted) return;
            setAuthState({
                user: null,
                profile: null,
                loading: false,
                isAuthenticated: false,
            });
        };

        const initAuth = async () => {
            try {
                console.log('[AUTH] === Starting auth initialization ===');

                // Helper to get cookie value
                const getCookie = (name: string) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(';').shift();
                };

                const cookieAccessToken = getCookie('sb-access-token');
                const cookieRefreshToken = getCookie('sb-refresh-token');

                console.log('[AUTH] Cookies:', {
                    hasAccessToken: !!cookieAccessToken,
                    hasRefreshToken: !!cookieRefreshToken,
                });

                // First check if we already have a session
                const { data: { session: existingSession } } = await supabase.auth.getSession();
                console.log('[AUTH] Existing session:', !!existingSession);

                if (existingSession?.user) {
                    console.log('[AUTH] Using existing session');
                    await setAuthenticatedState(existingSession);
                    return;
                }

                // If we have cookies but no session, try to restore
                if (cookieAccessToken && cookieRefreshToken) {
                    console.log('[AUTH] Attempting to restore session from cookies...');
                    try {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: cookieAccessToken,
                            refresh_token: cookieRefreshToken,
                        });

                        if (error) {
                            console.error('[AUTH] setSession error:', error.message);
                            // Clear invalid cookies
                            document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.onrender.com';
                            document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.onrender.com';
                            setUnauthenticatedState();
                            return;
                        }

                        if (data?.session) {
                            console.log('[AUTH] Session restored from cookies successfully');
                            await setAuthenticatedState(data.session);
                            return;
                        }
                    } catch (err) {
                        console.error('[AUTH] Cookie restore failed:', err);
                        setUnauthenticatedState();
                        return;
                    }
                }

                // No session found
                console.log('[AUTH] No session available');
                setUnauthenticatedState();

            } catch (error) {
                console.error('[AUTH] Init error:', error);
                setUnauthenticatedState();
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AUTH] Auth state changed:', event, !!session);
                if (session?.user) {
                    await setAuthenticatedState(session);
                } else {
                    setUnauthenticatedState();
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return authState;
}

// Hook to require authentication
export function useRequireAuth(redirectTo: string = '/login') {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!auth.loading && !auth.isAuthenticated) {
            router.push(redirectTo);
        }
    }, [auth.loading, auth.isAuthenticated, router, redirectTo]);

    return auth;
}
