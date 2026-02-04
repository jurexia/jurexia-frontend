'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Create a separate Supabase client for callback that doesn't auto-detect session in URL
const callbackSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            detectSessionInUrl: false, // Don't auto-detect - we'll handle it manually
            persistSession: true,
            autoRefreshToken: true,
        }
    }
);

export default function AuthCallbackPage() {
    const router = useRouter();
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
                    setTimeout(() => router.replace('/login'), 2000);
                    return;
                }

                // Get the code from URL
                const code = params.get('code');

                if (code) {
                    setStatus('Verificando código...');

                    // Exchange code for session using our non-auto-detecting client
                    const { data, error: exchangeError } = await callbackSupabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error('Exchange error:', exchangeError);
                        setError(exchangeError.message);
                        setTimeout(() => router.replace('/login'), 2000);
                        return;
                    }

                    if (data.session) {
                        setStatus('¡Éxito! Redirigiendo...');
                        // Clean URL and redirect
                        window.history.replaceState({}, '', '/auth/callback');
                        setTimeout(() => {
                            router.replace('/chat');
                        }, 300);
                        return;
                    }
                }

                // No code in URL, check for existing session
                const { data: { session } } = await callbackSupabase.auth.getSession();

                if (session) {
                    router.replace('/chat');
                } else {
                    setError('No se encontró sesión válida');
                    setTimeout(() => router.replace('/login'), 2000);
                }
            } catch (err) {
                console.error('Callback error:', err);
                setError('Error procesando autenticación');
                setTimeout(() => router.replace('/login'), 2000);
            }
        };

        // Execute immediately
        handleCallback();
    }, [router]);

    if (error) {
        return (
            <main className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
                    <p className="text-red-600 mb-4">{error}</p>
                    <p className="text-charcoal-500">Redirigiendo al login...</p>
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
