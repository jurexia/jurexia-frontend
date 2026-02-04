'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Procesando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Handle potential errors directly from URL
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');

        if (errorParam) {
            setError(errorDesc || errorParam);
            setTimeout(() => router.replace('/login'), 3000);
            return;
        }

        // Listen for auth state changes from the Supabase client
        // The client automatically handles the code exchange if detectSessionInUrl is true (default)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    setStatus('¡Autenticación exitosa!');
                    window.history.replaceState({}, '', '/auth/callback'); // Clean URL
                    setTimeout(() => router.replace('/chat'), 500);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    if (error) {
        return (
            <main className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
                    <p className="text-red-600 mb-4 font-medium">Error de autenticación</p>
                    <p className="text-gray-600 mb-4 text-sm">{error}</p>
                    <p className="text-charcoal-500 text-sm">Redirigiendo al login...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-brown mx-auto mb-4"></div>
                <p className="text-charcoal-600">{status}</p>
            </div>
        </main>
    );
}
