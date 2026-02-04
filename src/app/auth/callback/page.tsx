'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const [status, setStatus] = useState('Procesando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for error in URL first
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

                // Get the code from URL for MANUAL exchange
                // (Since we disabled detectSessionInUrl in supabase.ts)
                const code = params.get('code');

                if (code) {
                    setStatus('Verificando código de seguridad...');

                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error('Exchange error:', exchangeError);
                        setError(exchangeError.message);
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 3000);
                        return;
                    }

                    if (data.session) {
                        setStatus('¡Autenticación exitosa! Entrando...');
                        // Clean URL
                        window.history.replaceState({}, '', '/auth/callback');
                        // Hard redirect
                        setTimeout(() => {
                            window.location.href = '/chat';
                        }, 500);
                        return;
                    }
                }

                // No code, check for existing session
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    setStatus('Sesión activa. Redirigiendo...');
                    setTimeout(() => {
                        window.location.href = '/chat';
                    }, 500);
                } else {
                    // Only show error if we also didn't have a code
                    if (!code) {
                        setError('No se encontró sesión válida');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    }
                }
            } catch (err) {
                console.error('Callback error:', err);
                setError('Error procesando autenticación');
            }
        };

        handleCallback();
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
                    Si no redirige automáticamente, haz clic aquí (v3.0 Manual Exchange)
                </button>
            </div>
        </main>
    );
}
