'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext, AuthContextType } from '@/components/AuthProvider';

// Shared auth hook — consumes the single AuthContext (no duplicate network calls)
export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}

/**
 * Como `useRequireAuth`, pero deja pasar a quien viene en MODO BÁSICO.
 *
 * El botón «Probar Iurexia» abre una visita sin cuenta (ver `@/lib/gratis`), y
 * esa visita tiene que poder entrar al chat. Cuando no hay testigo, se
 * comporta exactamente como antes: al acceso.
 */
export function useAuthOBasico(hayTestigo: boolean, redirectTo: string = '/login') {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!auth.loading && !auth.isAuthenticated && !hayTestigo) {
            router.push(redirectTo);
        }
    }, [auth.loading, auth.isAuthenticated, hayTestigo, router, redirectTo]);

    return auth;
}

// Hook to require authentication — redirects to login if not authenticated
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
