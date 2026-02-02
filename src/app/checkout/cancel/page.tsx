'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

export default function CheckoutCancelPage() {
    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-8 h-8 text-gray-500" />
                </div>

                {/* Title */}
                <h1 className="font-serif text-3xl font-medium text-charcoal-900 mb-4">
                    Pago cancelado
                </h1>

                {/* Description */}
                <p className="text-charcoal-600 mb-8">
                    Tu proceso de pago fue cancelado. No se realizó ningún cargo a tu tarjeta.
                    Puedes intentarlo de nuevo cuando estés listo.
                </p>

                {/* Reasons to subscribe */}
                <div className="bg-white rounded-2xl p-6 mb-8 text-left">
                    <h3 className="font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-accent-brown" />
                        ¿Por qué elegir Jurexia Pro?
                    </h3>
                    <ul className="space-y-2 text-sm text-charcoal-600">
                        <li>• Hasta 170 consultas mensuales (vs 5 en plan gratuito)</li>
                        <li>• Análisis inteligente de documentos legales</li>
                        <li>• Búsqueda en más de 100,000 documentos</li>
                        <li>• Soporte prioritario por email</li>
                        <li>• 14 días de garantía de devolución</li>
                    </ul>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/precios"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-brown text-white rounded-full font-medium hover:bg-accent-brown/90 transition-colors"
                    >
                        Ver planes disponibles
                    </Link>
                    <Link
                        href="/chat"
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-charcoal-700 rounded-full font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Continuar con plan gratuito
                    </Link>
                </div>

                {/* Support link */}
                <p className="mt-8 text-sm text-charcoal-500">
                    ¿Tienes problemas con el pago?{' '}
                    <a href="mailto:soporte@jurexiagtp.com" className="text-accent-brown hover:underline">
                        Contáctanos
                    </a>
                </p>
            </div>
        </main>
    );
}
