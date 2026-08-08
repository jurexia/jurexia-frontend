'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, User, CreditCard, Settings, AlertTriangle, CheckCircle, Heart, Shield } from 'lucide-react';
import DialogoRetencion from '@/components/DialogoRetencion';
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

export function UserAvatar() {
    const { user, profile, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
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

    // La cancelación completa —confirmación, retención, pausa y errores—
    // vive en DialogoRetencion. Aquí sólo se abre y se cierra.
    const closeCancelModal = () => setShowCancelModal(false);


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
                {/* Platinum no lleva óvalo: sólo el diamante, brillando. Es el
                    plan máximo y se distingue por ausencia de adorno, no por
                    más adorno — la píldora lo igualaba con los demás. El nombre
                    del plan sigue en el menú desplegable. */}
                {nivelDePlan(plan) === 'platinum' ? (
                    <span
                        className="hidden md:inline-flex items-center justify-center shrink-0"
                        title={`Plan ${planStyle.label}`}
                    >
                        <Insignia nivel="platinum" tam={26} animada />
                    </span>
                ) : (
                    <span className="hidden md:inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold bg-charcoal-900/5 text-charcoal-900 border border-cream-400">
                        <Insignia nivel={nivelDePlan(plan)} tam={18} />
                        {planStyle.label}
                    </span>
                )}
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

            {/* Un solo diálogo de cancelación para toda la app.
                Antes había DOS —éste y el de perfil/page.tsx— y divergieron:
                se construyó la retención en el otro y desde aquí no se veía.
                Ver DialogoRetencion.tsx. */}
            <DialogoRetencion
                abierto={showCancelModal}
                onCerrar={closeCancelModal}
                subscriptionId={profile?.stripe_subscription_id}
                nombrePlan={planStyle.label}
            />

        </div>
    );
}
