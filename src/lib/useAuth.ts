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
                // First, check for cookie fallback tokens
                const getCookie = (name: string) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(';').shift();
                };

                const cookieAccessToken = getCookie('sb-access-token');
                const cookieRefreshToken = getCookie('sb-refresh-token');

                // If we have cookie tokens but no localStorage session, restore from cookie
                if (cookieAccessToken && cookieRefreshToken) {
                    const { data: { session: currentSession } } = await supabase.auth.getSession();

                    if (!currentSession) {
                        // Try to restore session using refresh token
                        await supabase.auth.setSession({
                            access_token: cookieAccessToken,
                            refresh_token: cookieRefreshToken,
                        });
                    }
                }

                // Use getSession() which is more reliable for detecting auth state
                const { data: { session } } = await supabase.auth.getSession();

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
