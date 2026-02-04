'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // The middleware should have already handled the auth and redirected.
        // If we reach this page, it means something went wrong.
        // Wait a moment and redirect to login.
        const timeout = setTimeout(() => {
            router.replace('/login');
        }, 3000);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-brown mx-auto mb-4"></div>
                <p className="text-charcoal-600">Procesando autenticación...</p>
            </div>
        </main>
    );
}
