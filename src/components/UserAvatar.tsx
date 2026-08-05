'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, User, CreditCard, Settings, AlertTriangle, CheckCircle, Heart, Shield } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { Insignia, nivelDePlan } from '@/components/Insignia';
import { signOut, supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const planColors: Record<string, { bg: string; text: string; label: string }> = {
    gratuito: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Gratuito' },
    basico_monthly: { bg: 'bg-stone-100', text: 'text-stone-700', label: 'Básico' },
    pro_monthly: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro' },
    pro_annual: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Anual' },
    platinum_monthly: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum' },
    platinum_annual: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Anual' },
    ultra_secretarios: { bg: 'bg-gradient-to-r from-purple-100 to-indigo-100', text: 'text-purple-700', label: 'Ultra' },
};

type CancelState = 'confirm' | 'processing' | 'success' | 'error';

export function UserAvatar() {
    const { user, profile, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelState, setCancelState] = useState<CancelState>('confirm');
    const [cancelDate, setCancelDate] = useState<string>('');
    const [cancelError, setCancelError] = useState<string>('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleCancelSubscription = async () => {
        if (!profile?.stripe_subscription_id) {
            setCancelError('No se encontró una suscripción activa');
            setCancelState('error');
            return;
        }

        setCancelState('processing');

        try {
            // Get auth token for the API call
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setCancelError('Sesión expirada. Por favor, inicia sesión de nuevo.');
                setCancelState('error');
                return;
            }

            const response = await fetch('/api/stripe/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ subscriptionId: profile.stripe_subscription_id }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setCancelError(data.error || 'Error al cancelar la suscripción');
                setCancelState('error');
                return;
            }

            // Format the cancellation date
            const endDate = new Date(data.cancelAt);
            setCancelDate(endDate.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }));
            setCancelState('success');
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            setCancelError('Error de conexión. Intenta de nuevo.');
            setCancelState('error');
        }
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
        // Reset state after animation
        setTimeout(() => {
            setCancelState('confirm');
            setCancelDate('');
            setCancelError('');
        }, 300);
    };

    if (loading) {
        return (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
        );
    }

    if (!isAuthenticated || !user) {
        return null;
    }

    const plan = profile?.subscription_type || 'gratuito';
    const planStyle = planColors[plan] || planColors.gratuito;
    const userName = profile?.full_name || user.user_metadata?.full_name || 'Usuario';
    const userEmail = user.email || '';
    const firstName = userName.split(' ')[0] || 'Usuario';

    // Get initials from name or email
    const getInitials = () => {
        if (userName && userName !== 'Usuario') {
            const names = userName.split(' ');
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return userName.substring(0, 2).toUpperCase();
        }
        if (userEmail) {
            return userEmail.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    // Get user avatar image (from Google OAuth or other providers)
    const userImage = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 focus:outline-none"
            >
                {/* Avatar Circle */}
                <div className="w-10 h-10 rounded-full bg-charcoal-900 flex items-center justify-center text-white font-medium text-sm hover:bg-charcoal-800 transition-colors">
                    {userImage ? (
                        <img
                            src={userImage}
                            alt={userName}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        getInitials()
                    )}
                </div>

                {/* Plan Badge */}
                {/* La insignia sustituye a la píldora de texto: se reconoce de
                    un vistazo y da algo que subir de nivel, cosa que «Platinum
                    Anual» sobre crema no hacía. El nombre del plan sigue ahí
                    como texto, para que nadie tenga que adivinar. */}
                <span className="hidden md:inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold bg-charcoal-900/5 text-charcoal-900 border border-cream-400">
                    <Insignia nivel={nivelDePlan(plan)} tam={18} />
                    {planStyle.label}
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-black/5 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-charcoal-900 truncate">
                            {userName}
                        </p>
                        <p className="text-sm text-charcoal-500 truncate">
                            {userEmail}
                        </p>
                        <div className="inline-flex items-center gap-1.5 mt-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold bg-charcoal-900/5 text-charcoal-900 border border-cream-400">
                            <Insignia nivel={nivelDePlan(plan)} tam={18} />
                            Plan {planStyle.label}
                        </div>
                        {profile && (
                            <div className="mt-1">
                                <p className="text-xs text-charcoal-400">
                                    {profile.queries_used}/{profile.queries_limit === -1 ? '∞' : profile.queries_limit} consultas
                                </p>
                                {profile.subscription_type === 'ultra_secretarios' && (
                                    <p className="text-xs text-charcoal-400">
                                        {profile.sentencia_queries_used}/{profile.sentencia_queries_limit} sentencias
                                        · {profile.drafts_used}/{profile.drafts_limit} redacciones
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <Link
                            href="/perfil"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-charcoal-700 hover:bg-gray-50 transition-colors"
                        >
                            <User className="w-4 h-4" />
                            <span>Mi perfil</span>
                        </Link>
                        <Link
                            href="/precios"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-charcoal-700 hover:bg-gray-50 transition-colors"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Planes</span>
                        </Link>
                        {profile?.subscription_type && profile.subscription_type !== 'gratuito' && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowCancelModal(true);
                                    setCancelState('confirm');
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="text-left">Cancelar Suscripción</span>
                            </button>
                        )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Modal de Cancelación — 3 estados: confirm | processing | success */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        style={{ animation: 'cancelModalIn 0.3s ease-out' }}
                    >
                        {/* ── ESTADO: CONFIRMAR ── */}
                        {cancelState === 'confirm' && (
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                    Cancelar Suscripción
                                </h3>
                                <p className="text-charcoal-600 mb-6 text-sm leading-relaxed">
                                    Si cancelas, perderás los beneficios de tu{' '}
                                    <strong>Plan {planStyle.label}</strong> y las consultas restantes
                                    una vez que termine tu periodo actual.
                                    <br /><br />
                                    ¿Estás seguro que deseas continuar?
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCancelSubscription}
                                        className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                                    >
                                        Sí, cancelar mi suscripción
                                    </button>
                                    <button
                                        onClick={closeCancelModal}
                                        className="w-full px-4 py-3 border border-charcoal-200 text-charcoal-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        No, mantener mi plan
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── ESTADO: PROCESANDO ── */}
                        {cancelState === 'processing' && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                    <div className="w-10 h-10 border-3 border-charcoal-200 border-t-charcoal-700 rounded-full"
                                        style={{ animation: 'spin 0.8s linear infinite', borderWidth: 3 }}
                                    />
                                </div>
                                <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-2">
                                    Procesando cancelación...
                                </h3>
                                <p className="text-charcoal-500 text-sm">
                                    Estamos gestionando tu solicitud con Stripe.
                                </p>
                            </div>
                        )}

                        {/* ── ESTADO: ÉXITO ── */}
                        {cancelState === 'success' && (
                            <div className="text-center">
                                {/* Banner dorado superior */}
                                <div
                                    className="px-6 py-4"
                                    style={{
                                        background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <CheckCircle className="w-5 h-5 text-white" />
                                        <h3 className="text-lg font-semibold text-white">
                                            Cancelación Exitosa
                                        </h3>
                                    </div>
                                    <p className="text-white/80 text-xs">
                                        Tu solicitud ha sido procesada correctamente
                                    </p>
                                </div>

                                <div className="p-6">
                                    {/* Confirmation details */}
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-green-900 font-medium text-sm">
                                                    No se te realizarán más cobros
                                                </p>
                                                <p className="text-green-700 text-xs mt-1">
                                                    Tu suscripción <strong>Plan {planStyle.label}</strong> permanecerá
                                                    activa hasta el <strong>{cancelDate}</strong>.
                                                    Después de esa fecha, tu cuenta pasará al plan gratuito.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Founder pricing guarantee */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
                                        <div className="flex items-start gap-3">
                                            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-amber-900 font-medium text-sm">
                                                    Precio de suscriptor fundador garantizado
                                                </p>
                                                <p className="text-amber-700 text-xs mt-1">
                                                    Si en un futuro decides regresar, por ser suscriptor fundador
                                                    se te respetará el precio con el que contrataste originalmente,
                                                    sin importar los ajustes de precio que pudieran existir.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thank you message */}
                                    <div className="flex items-center justify-center gap-2 mb-5">
                                        <Heart className="w-4 h-4 text-red-400" />
                                        <p className="text-charcoal-500 text-sm">
                                            {firstName}, gracias por haber confiado en Iurexia.
                                            Esperamos que tu experiencia haya sido valiosa y
                                            que vuelvas pronto.
                                        </p>
                                    </div>

                                    <button
                                        onClick={closeCancelModal}
                                        className="w-full px-4 py-3 rounded-xl font-medium text-sm transition-all"
                                        style={{
                                            background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                                            color: '#0f0f0f',
                                        }}
                                    >
                                        Entendido
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── ESTADO: ERROR ── */}
                        {cancelState === 'error' && (
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                </div>
                                <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-2">
                                    Hubo un inconveniente
                                </h3>
                                <p className="text-charcoal-600 mb-2 text-sm">
                                    {cancelError}
                                </p>
                                <p className="text-charcoal-500 mb-6 text-xs">
                                    Si ya solicitaste la cancelación, es posible que se haya procesado correctamente.
                                    Puedes verificar el estado de tu suscripción en tu perfil.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            closeCancelModal();
                                            window.location.href = '/perfil';
                                        }}
                                        className="w-full px-4 py-3 font-medium text-sm transition-all rounded-xl"
                                        style={{
                                            background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                                            color: '#0f0f0f',
                                        }}
                                    >
                                        Verificar en mi perfil
                                    </button>
                                    <button
                                        onClick={closeCancelModal}
                                        className="w-full px-4 py-3 border border-charcoal-200 text-charcoal-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Keyframes */}
                    <style>{`
                        @keyframes cancelModalIn {
                            from { opacity: 0; transform: scale(0.95) translateY(10px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
