'use client';

import { useRequireAuth } from '@/lib/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { loading, isAuthenticated } = useRequireAuth();

    // Return nothing while loading — bg matches body, no flash
    if (loading || !isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
