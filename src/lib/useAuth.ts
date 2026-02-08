'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext, AuthContextType } from '@/components/AuthProvider';

// Shared auth hook — consumes the single AuthContext (no duplicate network calls)
export function useAuth(): AuthContextType {
    return useContext(AuthContext);
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
