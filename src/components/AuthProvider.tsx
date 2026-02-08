'use client';

import { createContext, useEffect, useState, useCallback } from 'react';
import { supabase, getUserProfile, UserProfile } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthContextType>({
        user: null,
        profile: null,
        loading: true,
        isAuthenticated: false,
    });

    // Fetch profile without blocking — fire-and-forget update
    const loadProfile = useCallback(async (user: User) => {
        try {
            const profile = await getUserProfile(user.id);
            setAuthState(prev => {
                // Only update if still the same user
                if (prev.user?.id === user.id) {
                    return { ...prev, profile };
                }
                return prev;
            });
        } catch (err) {
            console.warn('Profile fetch failed (non-fatal):', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        // 1) Initialize auth from stored session — fast, local-first
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (session?.user) {
                    // Set authenticated immediately (profile loads in background)
                    setAuthState({
                        user: session.user,
                        profile: null,
                        loading: false,
                        isAuthenticated: true,
                    });
                    // Load profile in background
                    loadProfile(session.user);
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

        // 2) Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!isMounted) return;

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
                    setAuthState(prev => ({
                        user: session.user,
                        profile: prev.profile, // Keep existing profile until refreshed
                        loading: false,
                        isAuthenticated: true,
                    }));
                    // Refresh profile in background
                    loadProfile(session.user);
                } else if (event !== 'TOKEN_REFRESHED') {
                    // Don't clear state on TOKEN_REFRESHED without session
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
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    return (
        <AuthContext.Provider value={authState}>
            {children}
        </AuthContext.Provider>
    );
}
