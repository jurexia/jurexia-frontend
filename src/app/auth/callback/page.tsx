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

        // V7.0: Add cookie fallback for session persistence
        let redirected = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session && !redirected) {
                    redirected = true;
                    setStatus('¡Autenticación exitosa! Guardando sesión...');

                    // FALLBACK: Save access token to cookie in case localStorage fails
                    // This handles cross-domain issues (www vs non-www)
                    try {
                        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
                        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=2592000; SameSite=Lax`;
                    } catch (e) {
                        console.error('Could not set cookie:', e);
                    }

                    setStatus('Sesión guardada. Entrando...');

                    // Give time for both localStorage AND cookie to be set
                    setTimeout(() => {
                        window.location.href = '/chat';
                    }, 1000);
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
                    Entrar manualmente (v7.0 Cookie Fallback)
                </button>
            </div>
        </main>
    );
}
