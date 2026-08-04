'use client';

/**
 * Entrada sin contraseña, para quien se registró y nunca llegó a iniciar sesión.
 *
 * El enlace mágico NO se genera aquí al cargar, sino al pulsar el botón, y por
 * dos razones: los antivirus de correo y los prefetchers de Gmail siguen los
 * enlaces al recibirlos —consumirían un enlace de un solo uso antes de que la
 * persona lo tocara—, y un enlace creado al abrir la página caduca contando
 * desde ese momento, no desde que se envió la campaña.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function EntrarPage() {
    const [testigo, setTestigo] = useState<string | null>(null);
    const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado' | 'error'>('listo');

    useEffect(() => {
        const u = new URLSearchParams(window.location.search).get('u');
        setTestigo(u);
    }, []);

    const pedirEnlace = async () => {
        if (!testigo) return;
        setEstado('enviando');
        try {
            const r = await fetch('/api/cuenta/enlace-acceso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ u: testigo }),
            });
            setEstado(r.ok ? 'enviado' : 'error');
        } catch {
            setEstado('error');
        }
    };

    return (
        <div className="min-h-screen bg-cream-200 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white border border-cream-300 rounded-2xl p-8">
                <div className="font-serif text-2xl font-semibold text-charcoal-900 tracking-wide">
                    Iurexia
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-accent-brown mt-2 mb-8">
                    Legal Tech
                </div>

                {!testigo ? (
                    <>
                        <h1 className="font-serif text-2xl text-charcoal-900 mb-3">
                            Enlace incompleto
                        </h1>
                        <p className="text-sm text-charcoal-700 mb-6">
                            Este enlace no trae la información necesaria. Abra el que le enviamos
                            por correo, o ingrese con su contraseña habitual.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-5 py-2.5 rounded-lg bg-charcoal-900 text-cream-100 text-sm font-medium hover:bg-charcoal-800 transition-colors"
                        >
                            Ir a iniciar sesión
                        </Link>
                    </>
                ) : estado === 'enviado' ? (
                    <>
                        <h1 className="font-serif text-2xl text-charcoal-900 mb-3">
                            Revise su correo
                        </h1>
                        <p className="text-sm text-charcoal-700 mb-2">
                            Le acabamos de enviar su enlace de acceso. Pulse el botón del mensaje
                            y entrará directamente, sin contraseña.
                        </p>
                        <p className="text-sm text-charcoal-700">
                            Si no lo ve en unos minutos, revise la carpeta de correo no deseado.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="font-serif text-2xl text-charcoal-900 mb-3">
                            Entre sin contraseña
                        </h1>
                        <p className="text-sm text-charcoal-700 mb-6">
                            Le enviaremos a su correo un enlace de acceso directo. No necesita
                            recordar ninguna contraseña.
                        </p>

                        <button
                            onClick={pedirEnlace}
                            disabled={estado === 'enviando'}
                            className="w-full px-5 py-3 rounded-lg bg-accent-gold text-charcoal-900 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {estado === 'enviando' ? 'Enviando…' : 'Enviarme mi enlace de acceso'}
                        </button>

                        {estado === 'error' && (
                            <p className="text-sm text-red-700 mt-4">
                                No pudimos enviarlo. Inténtelo de nuevo o escríbanos a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline">
                                    soporte@iurexia.com
                                </a>
                                .
                            </p>
                        )}

                        <p className="text-xs text-charcoal-700 mt-6">
                            ¿Prefiere su contraseña?{' '}
                            <Link href="/login" className="text-accent-brown underline">
                                Iniciar sesión
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
