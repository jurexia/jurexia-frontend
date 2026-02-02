'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    Crown,
    Loader2,
    ExternalLink,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { openCustomerPortal } from '@/lib/stripe-client';

interface SubscriptionInfo {
    plan: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
}

export default function SubscriptionPage() {
    const { data: session, status } = useSession();
    const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchSubscriptionInfo();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [status]);

    const fetchSubscriptionInfo = async () => {
        try {
            const response = await fetch('/api/stripe/subscription');
            if (response.ok) {
                const data = await response.json();
                setSubscriptionInfo(data);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            await openCustomerPortal();
        } catch (error) {
            console.error('Error opening portal:', error);
            alert('No se pudo abrir el portal de facturación. Inténtalo de nuevo.');
        } finally {
            setPortalLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <main className="min-h-screen bg-cream-300 pt-20">
                <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent-brown" />
                    <p className="mt-4 text-charcoal-600">Cargando información...</p>
                </div>
            </main>
        );
    }

    if (!session) {
        return (
            <main className="min-h-screen bg-cream-300 pt-20">
                <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                    <h1 className="font-serif text-3xl font-medium text-charcoal-900 mb-4">
                        Inicia sesión
                    </h1>
                    <p className="text-charcoal-600 mb-8">
                        Necesitas iniciar sesión para ver tu suscripción.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent-brown text-white rounded-full hover:bg-accent-brown/90 transition-colors"
                    >
                        Iniciar Sesión
                    </Link>
                </div>
            </main>
        );
    }

    const userPlan = (session.user as any)?.plan || 'gratuito';
    const isPaidPlan = userPlan !== 'gratuito';

    return (
        <main className="min-h-screen bg-cream-300">
            {/* Header */}
            <header className="bg-cream-300 border-b border-black/5 py-4">
                <div className="max-w-4xl mx-auto px-4">
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 text-charcoal-600 hover:text-charcoal-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al chat
                    </Link>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-12">
                <h1 className="font-serif text-4xl font-medium text-charcoal-900 mb-2">
                    Mi Suscripción
                </h1>
                <p className="text-charcoal-600 mb-8">
                    Gestiona tu plan y facturación
                </p>

                {/* Current Plan Card */}
                <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-sm text-charcoal-500 mb-1">Plan actual</p>
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 flex items-center gap-2">
                                {isPaidPlan && <Crown className="w-6 h-6 text-accent-gold" />}
                                Plan {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}
                            </h2>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isPaidPlan
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                            {isPaidPlan ? 'Activo' : 'Gratuito'}
                        </div>
                    </div>

                    {subscriptionInfo && (
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-charcoal-400" />
                                <span className="text-charcoal-600">
                                    Próxima facturación: {' '}
                                    <span className="text-charcoal-900">
                                        {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('es-MX', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </span>
                            </div>
                            {subscriptionInfo.cancelAtPeriodEnd && (
                                <div className="flex items-center gap-3 text-sm">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    <span className="text-orange-600">
                                        Tu suscripción se cancelará al final del período actual
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Usage Card */}
                <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
                    <h3 className="font-medium text-charcoal-900 mb-4">Uso del mes</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-charcoal-600">Consultas realizadas</span>
                                <span className="font-medium text-charcoal-900">
                                    {userPlan.includes('platinum') ? '∞' : '12 / 170'}
                                </span>
                            </div>
                            {!userPlan.includes('platinum') && (
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent-brown rounded-full transition-all"
                                        style={{ width: '7%' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    {isPaidPlan ? (
                        <button
                            onClick={handleManageSubscription}
                            disabled={portalLoading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-charcoal-900 text-white rounded-xl font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-50"
                        >
                            {portalLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" />
                                    Gestionar suscripción
                                    <ExternalLink className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    ) : (
                        <Link
                            href="/precios"
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent-brown text-white rounded-xl font-medium hover:bg-accent-brown/90 transition-colors"
                        >
                            <Crown className="w-5 h-5" />
                            Actualizar a Pro
                        </Link>
                    )}

                    <p className="text-center text-sm text-charcoal-500">
                        {isPaidPlan
                            ? 'Puedes cambiar de plan, actualizar tu método de pago o cancelar tu suscripción desde el portal de facturación.'
                            : 'Actualiza a Pro para obtener más consultas y funciones premium.'}
                    </p>
                </div>

                {/* FAQ */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="font-medium text-charcoal-900 mb-4">Preguntas frecuentes</h3>
                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="font-medium text-charcoal-800">¿Cómo cancelo mi suscripción?</p>
                            <p className="text-charcoal-600 mt-1">
                                Puedes cancelar en cualquier momento desde el portal de facturación.
                                Tu acceso continuará hasta el final del período pagado.
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-charcoal-800">¿Qué pasa si cambio de plan?</p>
                            <p className="text-charcoal-600 mt-1">
                                Los cambios se aplican inmediatamente. Si subes de plan, se te cobrará
                                la diferencia prorrateada.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
