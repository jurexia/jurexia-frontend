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

        // Standard Flow (v5.0):
        // Wait for BOTH the auth state change AND verify session is in storage
        let hasRedirected = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session && !hasRedirected) {
                    setStatus('¡Autenticación exitosa! Verificando...');
                    window.history.replaceState({}, '', '/auth/callback'); // Clean URL

                    // CRITICAL: Wait for session to be persisted in localStorage
                    // This prevents /chat from redirecting back to /login
                    let attempts = 0;
                    const maxAttempts = 10;

                    const checkSessionPersisted = async () => {
                        const { data: { session: storedSession } } = await supabase.auth.getSession();

                        if (storedSession) {
                            // Session is confirmed in storage!
                            hasRedirected = true;
                            setStatus('Sesión confirmada. Entrando...');
                            setTimeout(() => {
                                window.location.href = '/chat';
                            }, 300);
                        } else if (attempts < maxAttempts) {
                            // Not yet, try again
                            attempts++;
                            setTimeout(checkSessionPersisted, 200);
                        } else {
                            // Gave up after 2 seconds
                            setError('No se pudo confirmar la sesión');
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 2000);
                        }
                    };

                    // Start checking
                    checkSessionPersisted();
                } else if (event === 'SIGNED_OUT') {
                    // Ignore
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
                    Si no redirige automáticamente, haz clic aquí (v5.0 Session Check)
                </button>
            </div>
        </main>
    );
}
