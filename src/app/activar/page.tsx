'use client';
/**
 * Activación de cuenta desde el correo de campaña (17-sep-2026).
 *
 * La página no hace nada al cargar: los antivirus y los prefetchers de Gmail
 * siguen los enlaces al recibirlos, y no pueden ser ellos quienes creen la
 * cuenta. Se crea al pulsar el botón. Ver `@/lib/correo/activar`.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Estado = 'listo' | 'activando' | 'existe' | 'error';

export default function ActivarPage() {
    const [testigo, setTestigo] = useState<string | null>(null);
    const [estado, setEstado] = useState<Estado>('listo');
    const [urlEntrar, setUrlEntrar] = useState<string>('/login');

    useEffect(() => {
        setTestigo(new URLSearchParams(window.location.search).get('u'));
    }, []);

    const activar = async () => {
        if (!testigo) return;
        setEstado('activando');
        try {
            const r = await fetch('/api/cuenta/activar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ u: testigo }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d?.estado === 'creada' && d.url) {
                window.location.href = d.url;
                return;
            }
            if (r.ok && d?.estado === 'existe') {
                setUrlEntrar(d.url || '/login');
                setEstado('existe');
                return;
            }
            setEstado('error');
        } catch {
            setEstado('error');
        }
    };

    return (
        <div className="min-h-screen bg-cream-200 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md bg-white border border-cream-300 rounded-2xl p-8">
                <div className="font-serif text-2xl font-semibold text-charcoal-900 tracking-wide">Iurexia</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-accent-brown mt-2 mb-8">Legal Tech</div>

                {!testigo ? (
                    <>
                        <h1 className="font-serif text-2xl text-charcoal-900 mb-3">Enlace incompleto</h1>
                        <p className="text-sm text-charcoal-700 mb-6">
                            Este enlace no trae la información necesaria. Abra el que le enviamos por correo,
                            o cree su cuenta desde el registro.
                        </p>
                        <Link href="/registro" className="inline-block px-5 py-2.5 rounded-lg bg-charcoal-900 text-cream-100 text-sm font-medium hover:bg-charcoal-800 transition-colors">
                            Ir al registro
                        </Link>
                    </>
                ) : estado === 'existe' ? (
                    <>
                        <h1 className="font-serif text-2xl text-charcoal-900 mb-3">Su cuenta ya está activa</h1>
                        <p className="text-sm text-charcoal-700 mb-6">
                            Esta dirección ya tiene cuenta en Iurexia. Le enviamos el acceso a su correo,
                            sin contraseña, desde la siguiente página.
                        </p>
                        <a href={urlEntrar} className="block w-full text-center px-5 py-3 rounded-lg bg-accent-gold text-charcoal-900 text-sm font-bold hover:opacity-90 transition-opacity">
                            Entrar a mi cuenta
                        </a>
                    </>
                ) : (
                    <>
                        <h1 className="font-serif text-2xl text-charcoal-900 mb-3">Active su cuenta</h1>
                        <p className="text-sm text-charcoal-700 mb-6">
                            Con este botón su correo queda verificado y entra directamente a Iurexia, sin
                            códigos ni contraseñas. Tendrá sus consultas gratuitas listas para usar.
                        </p>
                        <button
                            onClick={activar}
                            disabled={estado === 'activando'}
                            className="w-full px-5 py-3 rounded-lg bg-accent-gold text-charcoal-900 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {estado === 'activando' ? 'Activando su cuenta…' : 'Activar mi cuenta y entrar'}
                        </button>
                        {estado === 'error' && (
                            <p className="text-sm text-red-700 mt-4">
                                No pudimos activarla. Inténtelo de nuevo o escríbanos a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline">soporte@iurexia.com</a>.
                            </p>
                        )}
                        <p className="text-xs text-charcoal-500 mt-6 leading-relaxed">
                            Al activar su cuenta acepta los{' '}
                            <Link href="/terminos" className="underline">Términos y Condiciones</Link> y el{' '}
                            <Link href="/privacidad" className="underline">Aviso de Privacidad</Link> de Iurexia,
                            los mismos que aceptó al iniciar su registro.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
