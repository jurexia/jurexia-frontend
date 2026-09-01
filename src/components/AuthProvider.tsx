'use client';

import { createContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase, getUserProfile, UserProfile } from '@/lib/supabase';
import { CuentaSuspendida } from '@/components/CuentaSuspendida';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Las rutas que un suspendido SÍ puede ver. Son las que llevan a la caja y
 * las que le permiten salir: encerrarlo sin dejarle pagar sería cobrarle a
 * puerta cerrada. Todo lo demás queda detrás del muro.
 */
const RUTAS_ABIERTAS_EN_SUSPENSION = [
    '/cuenta/suscripcion',
    '/checkout',
    '/precios',
    '/entrar',
    '/login',
    '/registro',
    '/auth',
    '/terminos',
    '/privacidad',
];

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthContextType>({
        user: null,
        session: null,
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
                        session: session,
                        profile: null,
                        loading: false,
                        isAuthenticated: true,
                    });
                    // Load profile in background
                    loadProfile(session.user);
                } else {
                    setAuthState({
                        user: null,
                        session: null,
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
                        session: null,
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
                        session: null,
                        profile: null,
                        loading: false,
                        isAuthenticated: false,
                    });
                    return;
                }

                if (session?.user) {
                    setAuthState(prev => ({
                        user: session.user,
                        session: session,
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
                        session: null,
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

    // ── EL MURO DE LA SUSPENSIÓN (31-ago-2026) ───────────────────────────
    //
    // `consume_query` ya impedía preguntar, pero no impedía ENTRAR: el moroso
    // navegaba su cuenta y sólo chocaba con el freno al escribir. Aquí se
    // corta la sesión entera en cuanto el perfil trae `suspendido_at`.
    //
    // El muro se pinta ENCIMA de `children`, no en su lugar: la aplicación
    // sigue montada detrás, así que al levantar la suspensión el usuario
    // vuelve a lo que estaba haciendo sin recargar ni perder el hilo.
    const rutaActual = usePathname() || '';
    const enRutaDePago = RUTAS_ABIERTAS_EN_SUSPENSION.some((r) => rutaActual.startsWith(r));
    const suspendido = !!authState.profile?.suspendido_at && !enRutaDePago;

    return (
        <AuthContext.Provider value={authState}>
            {children}
            {suspendido && <CuentaSuspendida email={authState.profile?.email} />}
        </AuthContext.Provider>
    );
}
