'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Procesando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // For implicit flow, tokens are in the URL hash fragment
                // Supabase client with detectSessionInUrl:true should auto-process them

                // Check for errors in URL (both search params and hash)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const searchParams = new URLSearchParams(window.location.search);

                const errorParam = hashParams.get('error') || searchParams.get('error');
                const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

                if (errorParam) {
                    setError(errorDesc || errorParam);
                    setTimeout(() => router.replace('/login'), 2000);
                    return;
                }

                // Give Supabase time to process the hash params
                setStatus('Verificando sesión...');

                // Wait a moment for Supabase to process
                await new Promise(resolve => setTimeout(resolve, 500));

                // Now check for session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError(sessionError.message);
                    setTimeout(() => router.replace('/login'), 2000);
                    return;
                }

                if (session) {
                    setStatus('¡Éxito! Redirigiendo...');
                    // Clean URL and redirect
                    window.history.replaceState({}, '', '/auth/callback');
                    setTimeout(() => {
                        router.replace('/chat');
                    }, 300);
                    return;
                }

                // If no session yet, wait a bit more and try again
                setStatus('Esperando confirmación...');
                await new Promise(resolve => setTimeout(resolve, 1500));

                const { data: { session: retrySession } } = await supabase.auth.getSession();

                if (retrySession) {
                    setStatus('¡Éxito! Redirigiendo...');
                    setTimeout(() => router.replace('/chat'), 300);
                } else {
                    setError('No se pudo completar la autenticación');
                    setTimeout(() => router.replace('/login'), 2000);
                }
            } catch (err) {
                console.error('Callback error:', err);
                setError('Error procesando autenticación');
                setTimeout(() => router.replace('/login'), 2000);
            }
        };

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
