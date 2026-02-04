'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const [status, setStatus] = useState('Procesando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');

        if (errorParam) {
            setError(errorDesc || errorParam);
            setTimeout(() => window.location.href = '/login', 3000);
            return;
        }

        // V6.0: Simplified - trust Supabase auto-exchange and redirect after reasonable delay
        let redirected = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session && !redirected) {
                    redirected = true;
                    setStatus('¡Autenticación exitosa! Entrando al chat...');

                    // Give Supabase enough time to persist session to localStorage
                    // Then do a HARD redirect to ensure /chat gets fresh state
                    setTimeout(() => {
                        window.location.href = '/chat';
                    }, 1500); // Increased delay
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

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
                <p className="text-charcoal-600 mb-4">{status}</p>
                <button
                    onClick={() => window.location.href = '/chat'}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                    Entrar manualmente (v6.0)
                </button>
            </div>
        </main>
    );
}
