'use client';

import Link from 'next/link';
import { Scale, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
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

                {/* 404 Number */}
                <div className="relative mb-6">
                    <p className="text-[120px] font-serif font-bold text-charcoal-200 leading-none select-none">
                        404
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Search className="w-16 h-16 text-accent-brown/40" />
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-2xl font-serif font-semibold text-charcoal-900 mb-3">
                    Página no encontrada
                </h1>
                <p className="text-charcoal-600 mb-8 leading-relaxed">
                    La página que buscas no existe o fue movida.
                    Verifica la dirección o regresa al inicio.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-charcoal-900 text-white rounded-xl font-medium hover:bg-charcoal-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al inicio
                    </Link>
                    <Link
                        href="/chat"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-charcoal-300 text-charcoal-700 rounded-xl font-medium hover:bg-cream-400 transition-colors"
                    >
                        Ir al chat
                    </Link>
                </div>
            </div>
        </div>
    );
}
