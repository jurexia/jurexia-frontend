'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Loader2, Diamond } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

// ═══════════════════════════════════════════════════════════════════════════════
// Plan-specific theme configuration
// ═══════════════════════════════════════════════════════════════════════════════

interface PlanTheme {
    title: string;
    subtitle: string;
    description: string;
    icon: 'check' | 'diamond';
    iconBg: string;
    iconColor: string;
    pageBg: string;
    titleColor: string;
    buttonBg: string;
    buttonHover: string;
    features: string[];
    ctaText: string;
    ctaHref: string;
}

const ULTRA_THEME: PlanTheme = {
    title: '¡Bienvenido a Iurexia Ultra!',
    subtitle: 'Tu suscripción Ultra para Secretarios ha sido activada.',
    description: 'Ahora tienes acceso al Redactor de Sentencias TCC impulsado por IA, además de todas las funciones premium de Iurexia.',
    icon: 'diamond',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    pageBg: 'bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900',
    titleColor: 'text-white',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-500',
    features: [
        'Redactor de Sentencias TCC con IA',
        'Análisis automático de agravios y conceptos de violación',
        'Búsqueda inteligente de jurisprudencia y legislación',
        'Hasta 700 consultas legales por mes',
        'Soporte prioritario',
    ],
    ctaText: 'Ir al Redactor TCC',
    ctaHref: '/redactor-sentencia',
};

const PRO_THEME: PlanTheme = {
    title: '¡Bienvenido a Iurexia Pro!',
    subtitle: 'Tu suscripción ha sido activada exitosamente.',
    description: 'Ahora tienes acceso completo a todas las funciones premium de Iurexia. Recibirás un correo de confirmación con los detalles de tu suscripción.',
    icon: 'check',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    pageBg: 'bg-cream-300',
    titleColor: 'text-charcoal-900',
    buttonBg: 'bg-accent-brown',
    buttonHover: 'hover:bg-accent-brown/90',
    features: [
        'Realizar hasta 170 o 700 consultas/mes según tu plan',
        'Analizar documentos legales con IA',
        'Acceder a soporte prioritario',
    ],
    ctaText: 'Comenzar a usar Iurexia',
    ctaHref: '/chat',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Diamond animation component (Ultra only)
// ═══════════════════════════════════════════════════════════════════════════════

function ShiningDiamond() {
    return (
        <div className="relative w-20 h-20 flex items-center justify-center mx-auto mb-6">
            {/* Outer glow pulse */}
            <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
            {/* Inner glow */}
            <div className="absolute inset-2 rounded-full bg-blue-400/10 animate-pulse" />
            {/* Diamond icon */}
            <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-2xl rotate-0 flex items-center justify-center shadow-lg shadow-blue-500/40"
                style={{ animation: 'diamondShine 3s ease-in-out infinite' }}>
                <Diamond className="w-10 h-10 text-white drop-shadow-lg" strokeWidth={1.5} />
            </div>
            {/* Sparkle particles */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-300 rounded-full"
                style={{ animation: 'sparkle 2s ease-in-out infinite' }} />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-indigo-300 rounded-full"
                style={{ animation: 'sparkle 2s ease-in-out infinite 0.5s' }} />
            <div className="absolute top-0 left-0 w-2 h-2 bg-sky-300 rounded-full"
                style={{ animation: 'sparkle 2s ease-in-out infinite 1s' }} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main content component
// ═══════════════════════════════════════════════════════════════════════════════

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const { profile, loading: authLoading } = useAuth();

    // Determine plan type from profile
    const isUltra = profile?.subscription_type === 'ultra_secretarios';
    const theme = isUltra ? ULTRA_THEME : PRO_THEME;

    useEffect(() => {
        if (sessionId) {
            setStatus('success');
        } else {
            setStatus('error');
        }
    }, [sessionId]);

    if (status === 'loading' || authLoading) {
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

    // ── Ultra Secretarios Success ──────────────────────────────────────────
    if (isUltra) {
        return (
            <div className="max-w-md text-center">
                {/* Shining Diamond Animation */}
                <ShiningDiamond />

                {/* Title */}
                <h1 className="font-serif text-4xl font-medium text-white mb-4">
                    {theme.title}
                </h1>

                {/* Description */}
                <p className="text-lg text-blue-200 mb-4">
                    {theme.subtitle}
                </p>
                <p className="text-blue-300/80 mb-8">
                    {theme.description}
                </p>

                {/* Features unlocked */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8 text-left">
                    <h3 className="font-medium text-white mb-4">Ahora puedes:</h3>
                    <ul className="space-y-3">
                        {theme.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <Diamond className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <span className="text-blue-100">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href={theme.ctaHref}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
                    >
                        {theme.ctaText}
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/cuenta/suscripcion"
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors border border-white/20"
                    >
                        Ver mi suscripción
                    </Link>
                </div>
            </div>
        );
    }

    // ── Pro/Standard Success ──────────────────────────────────────────────
    return (
        <div className="max-w-md text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once">
                <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl font-medium text-charcoal-900 mb-4">
                {theme.title}
            </h1>

            {/* Description */}
            <p className="text-lg text-charcoal-600 mb-4">
                {theme.subtitle}
            </p>
            <p className="text-charcoal-500 mb-8">
                {theme.description}
            </p>

            {/* Features unlocked */}
            <div className="bg-white rounded-2xl p-6 mb-8 text-left">
                <h3 className="font-medium text-charcoal-900 mb-4">Ahora puedes:</h3>
                <ul className="space-y-3">
                    {theme.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-charcoal-700">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href={theme.ctaHref}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-brown text-white rounded-full font-medium hover:bg-accent-brown/90 transition-colors"
                >
                    {theme.ctaText}
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
    const { profile } = useAuth();
    const isUltra = profile?.subscription_type === 'ultra_secretarios';

    return (
        <>
            {/* Inline keyframes for diamond animation */}
            <style jsx global>{`
                @keyframes diamondShine {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(59, 130, 246, 0.4),
                                    0 0 40px rgba(59, 130, 246, 0.2);
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(59, 130, 246, 0.6),
                                    0 0 60px rgba(59, 130, 246, 0.3),
                                    0 0 80px rgba(99, 102, 241, 0.2);
                        transform: scale(1.05);
                    }
                }
                @keyframes sparkle {
                    0%, 100% {
                        opacity: 0;
                        transform: scale(0);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
            <main className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-500 ${isUltra
                    ? 'bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900'
                    : 'bg-cream-300'
                }`}>
                <Suspense fallback={<LoadingFallback />}>
                    <CheckoutSuccessContent />
                </Suspense>
            </main>
        </>
    );
}
