'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Verificando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let redirected = false;

        // Check for errors first
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');

        if (errorParam) {
            setError(errorDesc || errorParam);
            setTimeout(() => router.replace('/login'), 2000);
            return;
        }

        // Set up the auth state listener FIRST before anything else
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('Auth state change:', event, session ? 'has session' : 'no session');

                if (!redirected && session) {
                    redirected = true;
                    setStatus('¡Autenticación exitosa!');
                    // Use replace to avoid back button issues
                    setTimeout(() => router.replace('/chat'), 300);
                }
            }
        );

        // Give Supabase time to process the URL and trigger auth state change
        // The Supabase client automatically detects auth params in the URL
        const timeout = setTimeout(() => {
            if (!redirected) {
                // After 5 seconds, manually check for session
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!redirected && session) {
                        redirected = true;
                        router.replace('/chat');
                    } else if (!redirected) {
                        setError('No se pudo completar la autenticación');
                        setTimeout(() => router.replace('/login'), 2000);
                    }
                });
            }
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
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
