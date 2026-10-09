'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { recogerDestino } from '@/lib/destino-tras-entrar';
import { medirAltaIurexia } from '@/components/MetaPixel';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for error in URL params
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');

        if (errorParam) {
            setError(errorDesc || errorParam);
            setTimeout(() => router.push('/login'), 3000);
            return;
        }

        // Listen for the SIGNED_IN event — Supabase handles the hash/code exchange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    // Alta con Google/Apple (6-oct-2026): si la cuenta se creó
                    // hace minutos, se mide para Meta. Sin esperar; ver
                    // `medirAlta` en @/lib/origen-alta.
                    void medirAltaIurexia({ sesion: session, conversionGoogle: true });
                    router.push(recogerDestino());
                    subscription.unsubscribe();
                }
            }
        );

        /* LA ESPERA, MÁS LARGA QUE LA DEL CANDADO (9-oct-2026). El canje del
           código ocurre al arrancar el cliente, y si otra pestaña retiene el
           candado de sesión el arranque espera 10 s antes de tomarlo
           (`@/lib/candado-sesion`). Con 8 s aquí la página se rendía antes:
           «Tiempo de espera agotado» y vuelta al login, aunque el canje
           llegara un instante después. El 8-oct un abogado lo intentó con
           Google dieciséis veces seguidas. */
        const timeout = setTimeout(() => {
            subscription.unsubscribe();
            setError('Tiempo de espera agotado. Intenta de nuevo.');
            setTimeout(() => router.push('/login'), 2000);
        }, 25000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-brown mx-auto mb-4"></div>
                <p className="text-charcoal-500 text-sm">Procesando...</p>
            </div>
        </main>
    );
}
