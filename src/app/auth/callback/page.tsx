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
                // Check for error in URL
                const params = new URLSearchParams(window.location.search);
                const errorParam = params.get('error');
                const errorDesc = params.get('error_description');

                if (errorParam) {
                    setError(errorDesc || errorParam);
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                // PKCE Flow: Supabase automatically handles the hash fragment
                // The URL contains #access_token=... which Supabase reads and stores

                setStatus('Verificando sesión...');

                // Wait a moment for Supabase to process the hash
                await new Promise(resolve => setTimeout(resolve, 500));

                // Now check if we have a session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError('Error al obtener sesión');
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                if (session) {
                    setStatus('¡Autenticación exitosa! Redirigiendo...');
                    // Use router.push for client-side navigation
                    // This preserves the auth state
                    router.push('/chat');
                } else {
                    // No session found - might need to wait for onAuthStateChange
                    setStatus('Esperando confirmación...');

                    // Set up a listener for auth state change
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        (event, newSession) => {
                            if (event === 'SIGNED_IN' && newSession) {
                                setStatus('¡Sesión confirmada! Redirigiendo...');
                                router.push('/chat');
                                subscription.unsubscribe();
                            }
                        }
                    );

                    // Timeout after 10 seconds
                    setTimeout(() => {
                        subscription.unsubscribe();
                        setError('Tiempo de espera agotado. Por favor intenta de nuevo.');
                        setTimeout(() => router.push('/login'), 3000);
                    }, 10000);
                }
            } catch (err: any) {
                console.error('Callback error:', err);
                const errorMessage = err?.message || err?.toString() || 'Error desconocido';
                setError(`Error inesperado: ${errorMessage}`);
                setTimeout(() => router.push('/login'), 5000);
            }
        };

        handleCallback();
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
