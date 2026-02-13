'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Scale, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-cream-300 flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
                {/* Logo */}
                <Link href="/" className="inline-flex items-center gap-2 mb-8">
                    <Scale className="w-8 h-8 text-accent-brown" />
                    <span className="text-2xl font-serif font-bold">
                        Iurex<span className="text-accent-gold">ia</span>
                    </span>
                </Link>

                {/* Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-2xl font-serif font-semibold text-charcoal-900 mb-3">
                    Algo salió mal
                </h1>
                <p className="text-charcoal-600 mb-8 leading-relaxed">
                    Ocurrió un error inesperado. Puedes intentar de nuevo
                    o volver al inicio.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-charcoal-900 text-white rounded-xl font-medium hover:bg-charcoal-800 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Intentar de nuevo
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-charcoal-300 text-charcoal-700 rounded-xl font-medium hover:bg-cream-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
