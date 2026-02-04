'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for error in URL params
                const params = new URLSearchParams(window.location.search);
                const errorParam = params.get('error');
                const errorDescription = params.get('error_description');

                if (errorParam) {
                    console.error('OAuth error:', errorParam, errorDescription);
                    setError(errorDescription || errorParam);
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                // For PKCE flow, Supabase stores the session in localStorage automatically
                // after the redirect. We need to detect the auth state change.

                // First, check if we have a code in the URL (code exchange flow)
                const code = params.get('code');

                if (code) {
                    console.log('Exchanging code for session...');
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        console.error('Code exchange error:', exchangeError);
                        setError(exchangeError.message);
                        setTimeout(() => router.push('/login'), 3000);
                        return;
                    }
                }

                // Now check if we have a valid session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError(sessionError.message);
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                if (session) {
                    console.log('Session found, redirecting to chat...');
                    // Use replace to avoid back button issues
                    router.replace('/chat');
                } else {
                    console.log('No session found, redirecting to login...');
                    router.replace('/login');
                }
            } catch (err) {
                console.error('Callback error:', err);
                setError('Error de autenticación');
                setTimeout(() => router.push('/login'), 3000);
            }
        };

        // Small delay to ensure Supabase has processed any hash fragments
        const timer = setTimeout(handleCallback, 100);
        return () => clearTimeout(timer);
    }, [router]);

    if (error) {
        return (
            <main className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
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
                <p className="text-charcoal-600">Verificando autenticación...</p>
            </div>
        </main>
    );
}
