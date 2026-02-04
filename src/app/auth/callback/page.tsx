'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Verificando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for auth state changes - Supabase will auto-process the URL
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);

                if (event === 'SIGNED_IN' && session) {
                    console.log('User signed in, redirecting to chat...');
                    setStatus('¡Autenticación exitosa! Redirigiendo...');
                    // Small delay to show success message
                    setTimeout(() => {
                        router.replace('/chat');
                    }, 500);
                } else if (event === 'TOKEN_REFRESHED') {
                    // Token was refreshed, check if we have a session
                    if (session) {
                        router.replace('/chat');
                    }
                }
            }
        );

        // Also check for existing session after a moment
        // (in case auth state change already happened before listener was set up)
        const checkSession = async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('Session check error:', sessionError);
                setError(sessionError.message);
                setTimeout(() => router.replace('/login'), 2000);
                return;
            }

            if (session) {
                console.log('Session found on check, redirecting...');
                router.replace('/chat');
            } else {
                // No session after 1 second, might be an error
                console.log('No session found, checking URL for errors...');
                const params = new URLSearchParams(window.location.search);
                const errorParam = params.get('error');
                const errorDesc = params.get('error_description');

                if (errorParam) {
                    setError(errorDesc || errorParam);
                    setTimeout(() => router.replace('/login'), 2000);
                } else {
                    // Give more time for the auth state to settle
                    setStatus('Procesando autenticación...');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Check one more time
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession) {
                        router.replace('/chat');
                    } else {
                        setError('No se pudo completar la autenticación');
                        setTimeout(() => router.replace('/login'), 2000);
                    }
                }
            }
        };

        checkSession();

        return () => {
            subscription.unsubscribe();
        };
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
