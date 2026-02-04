'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the session from URL hash (Supabase OAuth puts tokens here)
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    router.push('/login?error=auth_failed');
                    return;
                }

                if (data.session) {
                    // Session exists, redirect to chat
                    router.push('/chat');
                } else {
                    // No session, try to exchange code from URL
                    const params = new URLSearchParams(window.location.search);
                    const code = params.get('code');

                    if (code) {
                        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                        if (exchangeError) {
                            console.error('Code exchange error:', exchangeError);
                            router.push('/login?error=exchange_failed');
                            return;
                        }
                        router.push('/chat');
                    } else {
                        router.push('/login');
                    }
                }
            } catch (err) {
                console.error('Callback error:', err);
                router.push('/login?error=unknown');
            }
        };

        handleCallback();
    }, [router]);

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-brown mx-auto mb-4"></div>
                <p className="text-charcoal-600">Verificando autenticación...</p>
            </div>
        </main>
    );
}
