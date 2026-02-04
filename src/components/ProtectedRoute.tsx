'use client';

import { useRequireAuth } from '@/lib/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
    const { loading, isAuthenticated } = useRequireAuth();

    if (loading) {
        return (
            fallback || (
                <div className="min-h-screen bg-cream-300 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal-900 mx-auto mb-4"></div>
                        <p className="text-charcoal-600">Verificando sesión...</p>
                    </div>
                </div>
            )
        );
    }

    if (!isAuthenticated) {
        return null; // useRequireAuth will redirect
    }

    return <>{children}</>;
}
