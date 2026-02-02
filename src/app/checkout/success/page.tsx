'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (sessionId) {
            // Verify the session (optional - webhook already handles this)
            setStatus('success');
        } else {
            setStatus('error');
        }
    }, [sessionId]);

    if (status === 'loading') {
        return (
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-accent-brown animate-spin mx-auto mb-4" />
                <p className="text-charcoal-600">Procesando tu pago...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="max-w-md text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h1 className="font-serif text-3xl font-medium text-charcoal-900 mb-4">
                    Algo salió mal
                </h1>
                <p className="text-charcoal-600 mb-8">
                    No pudimos verificar tu pago. Si crees que esto es un error,
                    por favor contacta a soporte.
                </p>
                <Link
                    href="/precios"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-white rounded-full hover:bg-charcoal-800 transition-colors"
                >
                    Volver a Precios
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-md text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once">
                <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl font-medium text-charcoal-900 mb-4">
                ¡Bienvenido a Jurexia Pro!
            </h1>

            {/* Description */}
            <p className="text-lg text-charcoal-600 mb-4">
                Tu suscripción ha sido activada exitosamente.
            </p>
            <p className="text-charcoal-500 mb-8">
                Ahora tienes acceso completo a todas las funciones premium de Jurexia.
                Recibirás un correo de confirmación con los detalles de tu suscripción.
            </p>

            {/* Features unlocked */}
            <div className="bg-white rounded-2xl p-6 mb-8 text-left">
                <h3 className="font-medium text-charcoal-900 mb-4">Ahora puedes:</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-charcoal-700">Realizar consultas ilimitadas o hasta 170/mes</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-charcoal-700">Analizar documentos legales con IA</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-charcoal-700">Acceder a soporte prioritario</span>
                    </li>
                </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href="/chat"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-brown text-white rounded-full font-medium hover:bg-accent-brown/90 transition-colors"
                >
                    Comenzar a usar Jurexia
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                    href="/cuenta/suscripcion"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-charcoal-700 rounded-full font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                >
                    Ver mi suscripción
                </Link>
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-accent-brown animate-spin mx-auto mb-4" />
            <p className="text-charcoal-600">Cargando...</p>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4">
            <Suspense fallback={<LoadingFallback />}>
                <CheckoutSuccessContent />
            </Suspense>
        </main>
    );
}
