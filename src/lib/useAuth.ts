'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser, getUserProfile, UserProfile } from './supabase';
import type { User } from '@supabase/supabase-js';

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
        // Get initial session
        const initAuth = async () => {
            try {
                console.log('[AUTH DEBUG] === Starting auth initialization ===');

                // First, check for cookie fallback tokens
                const getCookie = (name: string) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(';').shift();
                };

                const cookieAccessToken = getCookie('sb-access-token');
                const cookieRefreshToken = getCookie('sb-refresh-token');

                console.log('[AUTH DEBUG] Cookies found:', {
                    hasAccessToken: !!cookieAccessToken,
                    hasRefreshToken: !!cookieRefreshToken,
                    accessTokenPreview: cookieAccessToken?.slice(0, 20) + '...',
                });

                // If we have cookie tokens but no localStorage session, restore from cookie
                if (cookieAccessToken && cookieRefreshToken) {
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    console.log('[AUTH DEBUG] Current session before cookie restore:', !!currentSession);

                    if (!currentSession) {
                        console.log('[AUTH DEBUG] No session found, attempting cookie restore...');
                        // Try to restore session using refresh token
                        const { data, error: setError } = await supabase.auth.setSession({
                            access_token: cookieAccessToken,
                            refresh_token: cookieRefreshToken,
                        });
                        console.log('[AUTH DEBUG] setSession result:', {
                            success: !setError,
                            error: setError?.message,
                            hasSession: !!data?.session
                        });

                        if (!setError) {
                            // CRITICAL: Wait for session to be persisted to localStorage
                            // before calling getSession() below
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                } else {
                    console.log('[AUTH DEBUG] No cookies found, checking localStorage directly...');
                }

                // Use getSession() which is more reliable for detecting auth state
                const { data: { session } } = await supabase.auth.getSession();
                console.log('[AUTH DEBUG] Final session check:', {
                    hasSession: !!session,
                    userEmail: session?.user?.email
                });

                if (session?.user) {
                    const profile = await getUserProfile(session.user.id);
                    setAuthState({
                        user: session.user,
                        profile,
                        loading: false,
                        isAuthenticated: true,
                    });
                } else {
                    setAuthState({
                        user: null,
                        profile: null,
                        loading: false,
                        isAuthenticated: false,
                    });
                }
            } catch (error) {
                console.error('Auth error:', error);
                setAuthState({
                    user: null,
                    profile: null,
                    loading: false,
                    isAuthenticated: false,
                });
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    const profile = await getUserProfile(session.user.id);
                    setAuthState({
                        user: session.user,
                        profile,
                        loading: false,
                        isAuthenticated: true,
                    });
                } else {
                    setAuthState({
                        user: null,
                        profile: null,
                        loading: false,
                        isAuthenticated: false,
                    });
                }
            }
        );

        return () => {
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
