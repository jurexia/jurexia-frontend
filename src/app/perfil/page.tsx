'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { User, CreditCard, Shield, AlertTriangle, Check, X } from 'lucide-react';

const planColors: Record<string, { bg: string; text: string; label: string }> = {
    gratuito: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Gratuito' },
    pro_monthly: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Mensual' },
    pro_annual: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Anual' },
    platinum_monthly: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Mensual' },
    platinum_annual: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Anual' },
};

export default function PerfilPage() {
    const { user, profile, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [loadingPortal, setLoadingPortal] = useState(false);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (profile?.full_name) {
            setNewName(profile.full_name);
        }
    }, [profile]);

    if (loading || !isAuthenticated || !user || !profile) {
        return (
            <div className="min-h-screen bg-cream-200">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    const planStyle = planColors[profile.subscription_type] || planColors.gratuito;
    const queryPercentage = profile.queries_limit === -1
        ? 0
        : (profile.queries_used / profile.queries_limit) * 100;

    const handleSaveName = async () => {
        if (!newName.trim()) return;

        setSaving(true);
        setSaveMessage('');

        const { error } = await supabase
            .from('user_profiles')
            .update({ full_name: newName.trim() })
            .eq('user_id', user.id);

        if (error) {
            setSaveMessage('Error al guardar');
            console.error('Error updating name:', error);
        } else {
            setSaveMessage('Guardado ✓');
            setEditingName(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }

        setSaving(false);
    };

    const handleOpenPortal = async () => {
        if (!profile.stripe_customer_id) {
            alert('No tienes una suscripción activa');
            return;
        }

        setLoadingPortal(true);

        try {
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: profile.stripe_customer_id }),
            });

            const { url } = await response.json();
            if (url) {
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Error opening portal:', error);
            alert('Error al abrir el portal de facturación');
        }

        setLoadingPortal(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'ELIMINAR') return;

        // TODO: Implement account deletion
        alert('Funcionalidad de eliminación de cuenta próximamente');
        setShowDeleteModal(false);
    };

    const getInitials = () => {
        if (profile.full_name) {
            const names = profile.full_name.split(' ');
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return profile.full_name.substring(0, 2).toUpperCase();
        }
        return user.email?.substring(0, 2).toUpperCase() || 'U';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-cream-200">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <h1 className="font-serif text-4xl font-medium text-charcoal-900 mb-8">
                    Mi Perfil
                </h1>

                {/* Información Personal */}
                <section className="bg-white rounded-2xl shadow-sm border border-cream-300 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5 text-charcoal-700" />
                        <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                            Información Personal
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-charcoal-900 flex items-center justify-center text-white font-medium text-2xl">
                                {user.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt={profile.full_name || 'Usuario'}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    getInitials()
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-charcoal-600">Avatar</p>
                                <p className="text-xs text-charcoal-400 mt-1">
                                    {user.user_metadata?.avatar_url ? 'Desde Google' : 'Iniciales'}
                                </p>
                            </div>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Nombre completo
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={!editingName || saving}
                                    className="flex-1 px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 disabled:bg-gray-50 disabled:text-charcoal-600"
                                />
                                {editingName ? (
                                    <>
                                        <button
                                            onClick={handleSaveName}
                                            disabled={saving}
                                            className="px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingName(false);
                                                setNewName(profile.full_name || '');
                                            }}
                                            className="px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setEditingName(true)}
                                        className="px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                                    >
                                        Editar
                                    </button>
                                )}
                            </div>
                            {saveMessage && (
                                <p className="text-sm text-green-600 mt-2">{saveMessage}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={user.email || ''}
                                disabled
                                className="w-full px-4 py-2 border border-cream-300 rounded-lg bg-gray-50 text-charcoal-600"
                            />
                            <p className="text-xs text-charcoal-400 mt-1">
                                El correo no puede modificarse
                            </p>
                        </div>
                    </div>
                </section>

                {/* Mi Suscripción */}
                <section className="bg-white rounded-2xl shadow-sm border border-cream-300 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <CreditCard className="w-5 h-5 text-charcoal-700" />
                        <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                            Mi Suscripción
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Plan actual */}
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${planStyle.bg} ${planStyle.text}`}>
                                Plan {planStyle.label}
                            </span>
                            <span className="text-sm text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Activo
                            </span>
                        </div>

                        {/* Uso de consultas */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-charcoal-700">
                                    Consultas este mes
                                </span>
                                <span className="text-sm text-charcoal-600">
                                    {profile.queries_used}/{profile.queries_limit === -1 ? '∞' : profile.queries_limit}
                                </span>
                            </div>

                            {profile.queries_limit !== -1 && (
                                <>
                                    <div className="w-full bg-cream-300 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-accent-gold h-3 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(queryPercentage, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-charcoal-500 mt-1">
                                        {queryPercentage.toFixed(0)}% utilizado
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Detalles de suscripción */}
                        {profile.stripe_subscription_id && (
                            <div className="pt-4 border-t border-cream-300 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-charcoal-600">ID de suscripción</span>
                                    <span className="text-charcoal-900 font-mono text-xs">
                                        {profile.stripe_subscription_id.substring(0, 20)}...
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => router.push('/precios')}
                                className="flex-1 px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors"
                            >
                                Actualizar Plan
                            </button>
                            {profile.stripe_customer_id && (
                                <button
                                    onClick={handleOpenPortal}
                                    disabled={loadingPortal}
                                    className="flex-1 px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50"
                                >
                                    {loadingPortal ? 'Cargando...' : 'Portal de Facturación'}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Detalles de Cuenta */}
                <section className="bg-white rounded-2xl shadow-sm border border-cream-300 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-5 h-5 text-charcoal-700" />
                        <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                            Detalles de Cuenta
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-charcoal-600">ID de usuario</span>
                            <span className="text-charcoal-900 font-mono text-xs">
                                {user.id.substring(0, 20)}...
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-charcoal-600">Cuenta creada</span>
                            <span className="text-charcoal-900">
                                {formatDate(user.created_at)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-charcoal-600">Email verificado</span>
                            <span className="text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Verificado
                            </span>
                        </div>
                    </div>
                </section>

                {/* Zona de Peligro */}
                <section className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h2 className="font-serif text-2xl font-medium text-red-600">
                            Zona de Peligro
                        </h2>
                    </div>

                    <p className="text-sm text-charcoal-600 mb-4">
                        Esta acción es irreversible. Todos tus datos, conversaciones y configuraciones se eliminarán permanentemente.
                    </p>

                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Eliminar mi cuenta
                    </button>
                </section>
            </main>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900">
                                ¿Estás seguro?
                            </h3>
                        </div>

                        <p className="text-charcoal-600 mb-4">
                            Esta acción eliminará permanentemente tu cuenta y todos tus datos. No podrás recuperar tu información.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Escribe <span className="font-mono bg-red-100 px-1">ELIMINAR</span> para confirmar
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                                placeholder="ELIMINAR"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmation('');
                                }}
                                className="flex-1 px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== 'ELIMINAR'}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Eliminar Cuenta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
