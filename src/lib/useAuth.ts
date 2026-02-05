'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUserProfile, UserProfile } from './supabase';
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
        let isMounted = true;

        // Initialize auth state
        const initAuth = async () => {
            try {
                // Get current session from Supabase (it handles localStorage)
                const { data: { session } } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (session?.user) {
                    // Get user profile
                    const profile = await getUserProfile(session.user.id);
                    if (isMounted) {
                        setAuthState({
                            user: session.user,
                            profile,
                            loading: false,
                            isAuthenticated: true,
                        });
                    }
                } else {
                    setAuthState({
                        user: null,
                        profile: null,
                        loading: false,
                        isAuthenticated: false,
                    });
                }
            } catch (error) {
                console.error('Auth init error:', error);
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

                if (session?.user) {
                    const profile = await getUserProfile(session.user.id);
                    if (isMounted) {
                        setAuthState({
                            user: session.user,
                            profile,
                            loading: false,
                            isAuthenticated: true,
                        });
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
