'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const [status, setStatus] = useState('Procesando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Handle potential errors directly from URL
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');

        if (errorParam) {
            setError(errorDesc || errorParam);
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
            return;
        }

        // Standard Flow (v4.0):
        // 1. We enabled detectSessionInUrl: true in supabase.ts
        // 2. Supabase client will auto-detect the code and exchange it
        // 3. We just listen for the result
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    setStatus('¡Autenticación exitosa! Entrando...');
                    window.history.replaceState({}, '', '/auth/callback'); // Clean URL

                    // Force hard redirect to ensure clean state
                    setTimeout(() => {
                        window.location.href = '/chat';
                    }, 500);
                } else if (event === 'SIGNED_OUT') {
                    // Sometimes happens during exchange? Ignore.
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
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
                    Si no redirige automáticamente, haz clic aquí (v4.0 Standard Flow)
                </button>
            </div>
        </main>
    );
}
