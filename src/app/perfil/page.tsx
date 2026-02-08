'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { User, CreditCard, Shield, AlertTriangle, Check, X, FileText, Building2 } from 'lucide-react';
import ConnectLawyerSection from '@/components/ConnectLawyerSection';

const planColors: Record<string, { bg: string; text: string; label: string }> = {
    gratuito: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Gratuito' },
    pro_monthly: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Mensual' },
    pro_annual: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Anual' },
    platinum_monthly: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Mensual' },
    platinum_annual: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Anual' },
};

const REGIMENES_FISCALES = [
    { clave: '601', nombre: 'General de Ley Personas Morales' },
    { clave: '603', nombre: 'Personas Morales con Fines no Lucrativos' },
    { clave: '605', nombre: 'Sueldos y Salarios' },
    { clave: '606', nombre: 'Arrendamiento' },
    { clave: '612', nombre: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { clave: '616', nombre: 'Sin obligaciones fiscales' },
    { clave: '620', nombre: 'Sociedades Cooperativas de Producción' },
    { clave: '621', nombre: 'Incorporación Fiscal' },
    { clave: '625', nombre: 'Régimen de las Actividades Empresariales (plataformas)' },
    { clave: '626', nombre: 'Régimen Simplificado de Confianza (RESICO)' },
];

const USOS_CFDI = [
    { clave: 'G01', nombre: 'Adquisición de mercancías' },
    { clave: 'G03', nombre: 'Gastos en general' },
    { clave: 'I04', nombre: 'Equipo de computo y accesorios' },
    { clave: 'P01', nombre: 'Por definir' },
    { clave: 'S01', nombre: 'Sin efectos fiscales' },
];

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

    // Fiscal data state
    const [showFiscalForm, setShowFiscalForm] = useState(false);
    const [fiscalData, setFiscalData] = useState({
        rfc: '',
        razon_social: '',
        regimen_fiscal: '',
        codigo_postal_fiscal: '',
        uso_cfdi: 'G03',
    });
    const [fiscalSaving, setFiscalSaving] = useState(false);
    const [fiscalMessage, setFiscalMessage] = useState('');
    const [fiscalLoaded, setFiscalLoaded] = useState(false);

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

    // Load existing fiscal data
    useEffect(() => {
        if (!user || fiscalLoaded) return;

        const loadFiscalData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;

                const response = await fetch('/api/fiscal/save', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });

                if (response.ok) {
                    const { data } = await response.json();
                    if (data?.rfc) {
                        setFiscalData({
                            rfc: data.rfc || '',
                            razon_social: data.razon_social || '',
                            regimen_fiscal: data.regimen_fiscal || '',
                            codigo_postal_fiscal: data.codigo_postal_fiscal || '',
                            uso_cfdi: data.uso_cfdi || 'G03',
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading fiscal data:', err);
            }
            setFiscalLoaded(true);
        };

        loadFiscalData();
    }, [user, fiscalLoaded]);

    // Show skeleton ONLY while auth is initializing
    if (loading) {
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

    // Not authenticated — useEffect redirect will fire, render nothing
    if (!isAuthenticated || !user) {
        return null;
    }

    // Authenticated but profile failed to load — show retry UI
    if (!profile) {
        return (
            <div className="min-h-screen bg-cream-200">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="bg-white rounded-2xl shadow-sm border border-cream-300 p-8 text-center">
                        <p className="text-charcoal-700 mb-4">
                            No se pudo cargar tu perfil. Esto puede ocurrir por una conexión lenta.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const planStyle = planColors[profile.subscription_type] || planColors.gratuito;
    const queryPercentage = profile.queries_limit === -1
        ? 0
        : (profile.queries_used / profile.queries_limit) * 100;
    const isPro = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual'].includes(profile.subscription_type);

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

    const handleSaveFiscal = async () => {
        setFiscalSaving(true);
        setFiscalMessage('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setFiscalMessage('Error: no hay sesión activa');
                setFiscalSaving(false);
                return;
            }

            const response = await fetch('/api/fiscal/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(fiscalData),
            });

            const result = await response.json();

            if (!response.ok) {
                setFiscalMessage(result.error || 'Error al guardar');
            } else {
                setFiscalMessage(result.synced_to_stripe
                    ? 'Datos fiscales guardados y sincronizados con Stripe ✓'
                    : 'Datos fiscales guardados ✓ (se sincronizarán con Stripe cuando tengas suscripción activa)');
                setTimeout(() => setFiscalMessage(''), 5000);
            }
        } catch (err) {
            console.error('Error saving fiscal data:', err);
            setFiscalMessage('Error de conexión');
        }

        setFiscalSaving(false);
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

                {/* Datos Fiscales */}
                <section className="bg-white rounded-2xl shadow-sm border border-cream-300 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-charcoal-700" />
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                                Datos Fiscales
                            </h2>
                        </div>
                        <button
                            onClick={() => setShowFiscalForm(!showFiscalForm)}
                            className="text-sm text-charcoal-600 hover:text-charcoal-900 transition-colors"
                        >
                            {showFiscalForm ? 'Ocultar' : (fiscalData.rfc ? 'Editar' : 'Agregar datos')}
                        </button>
                    </div>

                    {/* Summary when collapsed */}
                    {!showFiscalForm && fiscalData.rfc && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-charcoal-600">RFC</span>
                                <span className="text-charcoal-900 font-mono">{fiscalData.rfc}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-charcoal-600">Razón Social</span>
                                <span className="text-charcoal-900">{fiscalData.razon_social}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-charcoal-600">Régimen Fiscal</span>
                                <span className="text-charcoal-900">
                                    {REGIMENES_FISCALES.find(r => r.clave === fiscalData.regimen_fiscal)?.nombre || fiscalData.regimen_fiscal}
                                </span>
                            </div>
                            <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Datos fiscales configurados
                            </p>
                        </div>
                    )}

                    {!showFiscalForm && !fiscalData.rfc && (
                        <p className="text-sm text-charcoal-500">
                            Agrega tus datos fiscales para que tus facturas incluyan tu RFC y razón social.
                        </p>
                    )}

                    {/* Fiscal Data Form */}
                    {showFiscalForm && (
                        <div className="space-y-4">
                            {/* RFC */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    RFC <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.rfc}
                                    onChange={(e) => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}
                                    placeholder="XAXX010101000"
                                    maxLength={13}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 font-mono uppercase"
                                />
                                <p className="text-xs text-charcoal-400 mt-1">12 caracteres (persona moral) o 13 (persona física)</p>
                            </div>

                            {/* Razón Social */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    Razón Social / Nombre <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.razon_social}
                                    onChange={(e) => setFiscalData({ ...fiscalData, razon_social: e.target.value })}
                                    placeholder="Nombre como aparece en la Constancia de Situación Fiscal"
                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                                />
                            </div>

                            {/* Régimen Fiscal */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    Régimen Fiscal <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={fiscalData.regimen_fiscal}
                                    onChange={(e) => setFiscalData({ ...fiscalData, regimen_fiscal: e.target.value })}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 bg-white"
                                >
                                    <option value="">Selecciona un régimen</option>
                                    {REGIMENES_FISCALES.map((r) => (
                                        <option key={r.clave} value={r.clave}>
                                            {r.clave} — {r.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Código Postal Fiscal */}
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                        Código Postal Fiscal <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fiscalData.codigo_postal_fiscal}
                                        onChange={(e) => setFiscalData({ ...fiscalData, codigo_postal_fiscal: e.target.value.replace(/\D/g, '') })}
                                        placeholder="06600"
                                        maxLength={5}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 font-mono"
                                    />
                                </div>

                                {/* Uso del CFDI */}
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                        Uso del CFDI
                                    </label>
                                    <select
                                        value={fiscalData.uso_cfdi}
                                        onChange={(e) => setFiscalData({ ...fiscalData, uso_cfdi: e.target.value })}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 bg-white"
                                    >
                                        {USOS_CFDI.map((u) => (
                                            <option key={u.clave} value={u.clave}>
                                                {u.clave} — {u.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Save button */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={handleSaveFiscal}
                                    disabled={fiscalSaving || !fiscalData.rfc || !fiscalData.razon_social || !fiscalData.regimen_fiscal || !fiscalData.codigo_postal_fiscal}
                                    className="px-6 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {fiscalSaving ? 'Guardando...' : 'Guardar Datos Fiscales'}
                                </button>
                                <button
                                    onClick={() => setShowFiscalForm(false)}
                                    className="px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>

                            {fiscalMessage && (
                                <p className={`text-sm mt-2 ${fiscalMessage.includes('Error') || fiscalMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                                    {fiscalMessage}
                                </p>
                            )}

                            <p className="text-xs text-charcoal-400 mt-2">
                                Estos datos se usan para generar tus facturas. Asegúrate de que coincidan con tu Constancia de Situación Fiscal.
                            </p>
                        </div>
                    )}
                </section>

                {/* IUREXIA Connect — Solo para PRO/Platinum */}
                {isPro && (
                    <ConnectLawyerSection
                        userId={user.id}
                        userName={profile.full_name || user.email || ''}
                        avatarUrl={user.user_metadata?.avatar_url}
                    />
                )}

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
