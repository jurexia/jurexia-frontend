'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Procesando autenticación...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const handleCallback = async () => {
            try {
                // Check for error in URL
                const params = new URLSearchParams(window.location.search);
                const errorParam = params.get('error');
                const errorDesc = params.get('error_description');

                if (errorParam) {
                    if (isMounted) {
                        setError(errorDesc || errorParam);
                        setTimeout(() => router.push('/login'), 3000);
                    }
                    return;
                }

                // PKCE Flow: Supabase automatically handles the hash fragment
                if (isMounted) setStatus('Verificando sesión...');

                // Wait a moment for Supabase to process the hash
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (!isMounted) return;

                // Now check if we have a session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError('Error al obtener sesión: ' + sessionError.message);
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                if (session) {
                    setStatus('¡Autenticación exitosa! Redirigiendo...');
                    router.push('/chat');
                } else {
                    // No session found - might need to wait for onAuthStateChange
                    setStatus('Esperando confirmación...');

                    // Set up a listener for auth state change
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        (event, newSession) => {
                            if (!isMounted) return;
                            if (event === 'SIGNED_IN' && newSession) {
                                setStatus('¡Sesión confirmada! Redirigiendo...');
                                router.push('/chat');
                                subscription.unsubscribe();
                            }
                        }
                    );

                    // Timeout after 10 seconds
                    setTimeout(() => {
                        if (!isMounted) return;
                        subscription.unsubscribe();
                        setError('Tiempo de espera agotado. Por favor intenta de nuevo.');
                        setTimeout(() => router.push('/login'), 3000);
                    }, 10000);
                }
            } catch (err: any) {
                if (!isMounted) return;
                // Ignore abort errors (from React Strict Mode double-execution)
                if (err?.message?.includes('abort') || err?.name === 'AbortError') {
                    console.log('Request aborted (likely React Strict Mode), ignoring...');
                    return;
                }
                console.error('Callback error:', err);
                const errorMessage = err?.message || err?.toString() || 'Error desconocido';
                setError(`Error inesperado: ${errorMessage}`);
                setTimeout(() => router.push('/login'), 5000);
            }
        };

        handleCallback();

        return () => {
            isMounted = false;
        };
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
