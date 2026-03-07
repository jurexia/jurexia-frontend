'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Users, Shield, BarChart3, AlertTriangle, Ban, CheckCircle,
    Eye, RefreshCw, Search, ChevronDown, X, Lock, Unlock, CreditCard, Mail, Bell,
    MoreVertical, ChevronLeft, ChevronRight, Filter, Scale
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Navbar from '@/components/Navbar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.iurexia.com';
const ADMIN_EMAIL = 'administracion@iurexia.com';

type Tab = 'usuarios' | 'alertas' | 'estadisticas';

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    subscription_type: string;
    queries_used: number;
    queries_limit: number;
    drafts_used: number;
    drafts_limit: number;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    estado: string | null;
    is_active: boolean;
    is_blocked: boolean;
    can_access_sentencia: boolean;
    created_at: string;
    updated_at: string;
    last_query_at: string | null;
}

interface StripeSubData {
    status: string;
    created: string;
    current_period_end: string;
    current_period_start: string;
    cancel_at_period_end: boolean;
    amount: number;
    currency: string;
    interval: string;
}

interface SecurityAlert {
    id: number;
    user_id: string | null;
    user_email: string;
    query_text: string;
    alert_type: string;
    severity: string;
    reviewed: boolean;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
}

interface Stats {
    total_users: number;
    active_7d: number;
    blocked_users: number;
    pending_alerts: number;
    plans: Record<string, number>;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'rgba(220, 38, 38, 0.15)', text: '#fca5a5', border: '#dc2626' },
    high: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: '#f59e0b' },
    medium: { bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', border: '#3b82f6' },
    low: { bg: 'rgba(34, 197, 94, 0.15)', text: '#86efac', border: '#22c55e' },
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    gratuito: { label: 'Gratuito', color: '#888' },
    pro_mensual: { label: 'Pro Mensual', color: '#3b82f6' },
    pro_anual: { label: 'Pro Anual', color: '#2563eb' },
    platinum_mensual: { label: 'Platinum', color: '#d4af37' },
    platinum_anual: { label: 'Platinum Anual', color: '#b8860b' },
    ultra_secretarios: { label: 'Ultra Secretarios', color: '#8b5cf6' },
};

// Estados con legislación ya ingestada en Qdrant
const INGESTED_STATES = ['QUERETARO', 'CDMX', 'CIUDAD_DE_MEXICO', 'GUANAJUATO'];

function formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function timeAgo(d: string | null): string {
    if (!d) return 'Nunca';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
}

export default function AdminPage() {
    const { user, loading, session } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('usuarios');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [showReviewed, setShowReviewed] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [stripeData, setStripeData] = useState<Record<string, StripeSubData>>({});
    const [welcomeSent, setWelcomeSent] = useState<Set<string>>(new Set());
    const [updateSent, setUpdateSent] = useState<Set<string>>(new Set());

    const getToken = useCallback(() => {
        return session?.access_token || '';
    }, [session]);

    // Auth guard
    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Fetch data when tab changes
    useEffect(() => {
        if (!user || user.email !== ADMIN_EMAIL || !session) return;

        const fetchData = async () => {
            setLoadingData(true);
            setError('');
            const token = getToken();

            try {
                if (tab === 'usuarios') {
                    const res = await fetch(`${API_URL}/admin/users`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    const data = await res.json();
                    const userList: UserProfile[] = Array.isArray(data.users) ? data.users : [];
                    setUsers(userList);

                    // Fetch Stripe subscription data for users with stripe_subscription_id
                    const subIds = userList
                        .map(u => u.stripe_subscription_id)
                        .filter((id): id is string => !!id);
                    if (subIds.length > 0) {
                        try {
                            const stripeRes = await fetch(`/api/admin/subscriptions?ids=${subIds.join(',')}`);
                            if (stripeRes.ok) {
                                const stripeJson = await stripeRes.json();
                                setStripeData(stripeJson.subscriptions || {});
                            }
                        } catch (e) {
                            console.warn('Could not fetch Stripe data:', e);
                        }
                    }
                } else if (tab === 'alertas') {
                    const res = await fetch(`${API_URL}/admin/alerts?reviewed=${showReviewed}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    const data = await res.json();
                    setAlerts(data.alerts || []);
                } else if (tab === 'estadisticas') {
                    const res = await fetch(`${API_URL}/admin/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e: any) {
                setError(e.message || 'Error al cargar datos');
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [tab, showReviewed, user, session, getToken]);

    const blockUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/block`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error('Error al bloquear');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: true } : u));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const unblockUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/unblock`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error('Error al desbloquear');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: false } : u));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSentencia = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/toggle-sentencia`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error('Error al cambiar acceso');
            const data = await res.json();
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, can_access_sentencia: data.can_access_sentencia } : u));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const reviewAlert = async (alertId: number) => {
        setActionLoading(String(alertId));
        try {
            const res = await fetch(`${API_URL}/admin/alerts/${alertId}/review`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error('Error al revisar');
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = (u.email || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
            (u.full_name || '').toLowerCase().includes(searchFilter.toLowerCase());

        let matchPlan = true;
        if (filterPlan !== 'all') {
            if (filterPlan === 'pagados') matchPlan = u.subscription_type !== 'gratuito';
            else if (filterPlan === 'gratuitos') matchPlan = u.subscription_type === 'gratuito';
            else matchPlan = u.subscription_type === filterPlan;
        }

        let matchStatus = true;
        if (filterStatus !== 'all') {
            if (filterStatus === 'activos') matchStatus = !u.is_blocked;
            else if (filterStatus === 'bloqueados') matchStatus = u.is_blocked;
        }

        return matchSearch && matchPlan && matchStatus;
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilter, filterPlan, filterStatus]);

    if (loading || !user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="flex bg-[#0a0a0a] min-h-screen items-center justify-center">
                <div className="text-gray-500 font-medium tracking-wide">Verificando acceso administrativo...</div>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'usuarios', label: 'Usuarios', icon: Users },
        { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
        { key: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
    ];

    return (
        <div className="bg-[#050505] min-h-screen text-gray-200 font-sans selection:bg-accent-gold/20 selection:text-accent-gold">
            <Navbar />

            <div className="max-w-[1400px] mx-auto pt-24 pb-16 px-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-7 h-7 text-red-500" />
                            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Panel de Administración</h1>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Iurexia Technologies — Gestión de usuarios y seguridad</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl shadow-sm">
                        <Lock className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-400">Acceso restringido</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 mb-8 bg-[#111] rounded-xl p-1.5 border border-[#222] shadow-sm max-w-2xl">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all focus:outline-none ${tab === t.key ? 'bg-[#1a1a1a] text-white font-semibold shadow-md border border-[#333]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#151515] font-medium border border-transparent'}`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Error banner */}
                {error && (
                    <div className="flex justify-between items-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6 shadow-sm">
                        <span className="text-red-400 text-sm font-medium">{error}</span>
                        <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 transition-colors focus:outline-none">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Loading */}
                {loadingData && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#333] mb-4" />
                        <span className="font-medium text-sm text-gray-400">Cargando datos...</span>
                    </div>
                )}

                {/* ═══ TAB: USUARIOS ═══ */}
                {!loadingData && tab === 'usuarios' && (
                    <div>
                        {/* Search and Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10 w-full lg:max-w-4xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por email o nombre..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-[#333] rounded-xl text-white text-sm focus:outline-none focus:border-accent-gold/50 transition-colors placeholder:text-gray-500 shadow-sm"
                                />
                            </div>

                            <div className="flex gap-3">
                                <div className="relative rounded-xl border border-[#333] bg-[#111] flex items-center px-3 hover:border-accent-gold/50 transition-colors shadow-sm">
                                    <Filter className="w-3.5 h-3.5 text-charcoal-400 mr-2 shrink-0" />
                                    <select
                                        value={filterPlan}
                                        onChange={(e) => setFilterPlan(e.target.value)}
                                        className="bg-transparent text-gray-300 text-sm focus:outline-none appearance-none py-2 pr-8 cursor-pointer font-medium"
                                    >
                                        <option value="all">Todos los Planes</option>
                                        <option value="pagados">Solo Premium</option>
                                        <option value="gratuitos">Gratuitos</option>
                                        <option value="pro_monthly">Pro Mensual</option>
                                        <option value="pro_annual">Pro Anual</option>
                                        <option value="platinum_monthly">Platinum Mensual</option>
                                        <option value="ultra_secretarios">Ultra Secretarios</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-charcoal-500 absolute right-3 pointer-events-none" />
                                </div>

                                <div className="relative rounded-xl border border-[#333] bg-[#111] flex items-center px-3 hover:border-accent-gold/50 transition-colors shadow-sm">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="bg-transparent text-gray-300 text-sm focus:outline-none appearance-none py-2 pr-8 cursor-pointer font-medium"
                                    >
                                        <option value="all">Cualquier Estado</option>
                                        <option value="activos">Activos</option>
                                        <option value="bloqueados">Bloqueados</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-charcoal-500 absolute right-3 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#0d0d0d] pb-1 shadow-2xl">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-[#131313] border-b border-[#222] text-gray-500 font-medium">
                                    <tr>
                                        {['Email', 'Plan', 'Suscripción', 'Renovación', 'Estado de Pago', 'Prompts', 'Entidad', 'Fecha Reg.', 'Acciones'].map(h => (
                                            <th key={h} className="px-5 py-4 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]">
                                    {currentUsers.map(u => {
                                        const plan = PLAN_LABELS[u.subscription_type] || { label: u.subscription_type, color: '#888' };
                                        const sub = u.stripe_subscription_id ? stripeData[u.stripe_subscription_id] : null;
                                        const isActiveSub = sub?.status === 'active' || sub?.status === 'trialing';
                                        const isPaid = u.subscription_type !== 'gratuito';

                                        return (
                                            <tr key={u.id} className={`transition-colors hover:bg-[#151515] ${u.is_blocked ? 'opacity-50 grayscale' : ''} ${isPaid && isActiveSub && !u.is_blocked ? 'border-l-[3px] border-l-blue-500 bg-blue-500/5' : ''}`}>

                                                <td className="px-5 py-4 min-w-[220px]">
                                                    <div className="flex items-center gap-3">
                                                        {u.is_blocked && <Ban className="w-4 h-4 text-red-500 shrink-0" />}
                                                        {isPaid && isActiveSub && !u.is_blocked && <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />}
                                                        <div className="flex flex-col">
                                                            <span className={`font-medium ${u.is_blocked ? 'text-red-400' : isPaid && isActiveSub ? 'text-blue-300' : 'text-gray-200'}`}>{u.email}</span>
                                                            {u.full_name && <span className="text-xs text-gray-500 truncate max-w-[180px]">{u.full_name}</span>}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border" style={{ backgroundColor: `${plan.color}15`, color: plan.color, borderColor: `${plan.color}25` }}>
                                                        {plan.label}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                                                    {sub ? formatDate(sub.created) : '—'}
                                                </td>

                                                <td className={`px-5 py-4 text-xs whitespace-nowrap ${isActiveSub ? 'text-blue-300 font-medium' : 'text-gray-500'}`}>
                                                    {sub ? formatDate(sub.current_period_end) : '—'}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {sub ? (
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${sub.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                            sub.status === 'past_due' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                                sub.status === 'canceled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                                    'bg-[#222] text-gray-400'
                                                            }`}>
                                                            {sub.status === 'active' ? '✅ Pagado' : sub.status === 'past_due' ? '⚠️ Vencido' : sub.status === 'canceled' ? '❌ Cancelado' : sub.status}
                                                            {sub.cancel_at_period_end && sub.status === 'active' && <span className="text-gray-500 ml-1 lowercase text-[9px] font-normal">(no renueva)</span>}
                                                        </span>
                                                    ) : <span className="text-gray-600">—</span>}
                                                </td>

                                                <td className="px-5 py-4 whitespace-nowrap text-xs">
                                                    <span className="text-gray-300 font-medium">{u.queries_used}</span>
                                                    <span className="text-gray-600"> / {u.queries_limit === -1 ? '∞' : u.queries_limit}</span>
                                                </td>

                                                <td className="px-5 py-4 text-gray-400 text-xs font-medium">
                                                    {u.estado ? u.estado.replace(/_/g, ' ') : '—'}
                                                </td>

                                                <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                                                    {formatDate(u.created_at)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {u.email !== ADMIN_EMAIL && (
                                                            <button
                                                                onClick={() => u.is_blocked ? unblockUser(u.id) : blockUser(u.id)}
                                                                disabled={actionLoading === u.id}
                                                                className={`p-2 rounded-lg transition-colors focus:outline-none ${u.is_blocked ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'} ${actionLoading === u.id ? 'opacity-50' : ''}`}
                                                                title={u.is_blocked ? "Desbloquear usuario" : "Bloquear usuario"}
                                                            >
                                                                {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        {u.email !== ADMIN_EMAIL && (
                                                            <button
                                                                onClick={() => toggleSentencia(u.id)}
                                                                disabled={actionLoading === u.id}
                                                                className={`p-2 rounded-lg transition-colors focus:outline-none flex items-center gap-1 ${u.can_access_sentencia ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:bg-[#222]'} ${actionLoading === u.id ? 'opacity-50' : ''}`}
                                                                title={u.can_access_sentencia ? "Deshabilitar Auditor de Sentencias" : "Habilitar Auditor de Sentencias"}
                                                            >
                                                                <Scale className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isPaid && !welcomeSent.has(u.email) && (
                                                            <button
                                                                onClick={async () => {
                                                                    setActionLoading(u.id);
                                                                    try {
                                                                        const res = await fetch('/api/admin/welcome-email', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({
                                                                                email: u.email,
                                                                                name: u.full_name || u.email.split('@')[0],
                                                                                estado: u.estado || 'tu entidad',
                                                                                planLabel: plan.label,
                                                                                isIngested: u.estado ? INGESTED_STATES.includes(u.estado) : false,
                                                                            }),
                                                                        });
                                                                        if (res.ok) {
                                                                            setWelcomeSent(prev => new Set(Array.from(prev).concat(u.email)));
                                                                        } else {
                                                                            const err = await res.json();
                                                                            alert(`Error: ${err.error}`);
                                                                        }
                                                                    } catch { alert('Error al enviar email'); }
                                                                    setActionLoading(null);
                                                                }}
                                                                disabled={actionLoading === u.id}
                                                                className={`p-2 rounded-lg transition-colors bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 focus:outline-none ${actionLoading === u.id ? 'opacity-50' : ''}`}
                                                                title="Enviar email de bienvenida"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isPaid && welcomeSent.has(u.email) && (
                                                            <span title="Email Welcome Enviado" className="text-green-400"><CheckCircle className="w-4 h-4" /></span>
                                                        )}
                                                        {isPaid && u.estado === 'GUANAJUATO' && !updateSent.has(u.email) && (
                                                            <button
                                                                onClick={async () => {
                                                                    setActionLoading(u.id);
                                                                    try {
                                                                        const res = await fetch('/api/admin/state-update', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({
                                                                                email: u.email,
                                                                                name: u.full_name || u.email.split('@')[0],
                                                                                estado: u.estado,
                                                                            }),
                                                                        });
                                                                        if (res.ok) {
                                                                            setUpdateSent(prev => new Set(Array.from(prev).concat(u.email)));
                                                                        } else {
                                                                            const err = await res.json();
                                                                            alert(`Error: ${err.error}`);
                                                                        }
                                                                    } catch { alert('Error al enviar notificación'); }
                                                                    setActionLoading(null);
                                                                }}
                                                                disabled={actionLoading === u.id}
                                                                className={`p-2 rounded-lg transition-colors bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 focus:outline-none ${actionLoading === u.id ? 'opacity-50' : ''}`}
                                                                title="Notificar Ingesta Guanajuato"
                                                            >
                                                                <Bell className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isPaid && u.estado === 'GUANAJUATO' && updateSent.has(u.email) && (
                                                            <span title="Notificación de Estado enviada" className="text-green-400"><CheckCircle className="w-4 h-4" /></span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {currentUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center py-20 text-gray-500">
                                                <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                                <p className="font-medium text-sm">No se encontraron usuarios</p>
                                                <p className="text-xs mt-1 text-gray-600">Intenta ajustar tus filtros de búsqueda.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 bg-[#111] border border-[#222] rounded-xl px-5 py-3 shadow-md gap-4">
                            <span className="text-xs text-gray-400 font-medium">
                                Mostrando <strong className="text-gray-200">{filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a <strong className="text-gray-200">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</strong> de <strong className="text-gray-200">{filteredUsers.length}</strong> usuarios
                            </span>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || filteredUsers.length === 0}
                                    className="p-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="flex items-center px-3 text-xs font-semibold text-gray-300">
                                    Página {currentPage} de {totalPages || 1}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ TAB: ALERTAS ═══ */}
                {!loadingData && tab === 'alertas' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <button
                                onClick={() => setShowReviewed(false)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: !showReviewed ? 600 : 400, background: !showReviewed ? '#1a1a1a' : 'transparent', color: !showReviewed ? '#fff' : '#888' }}
                            >
                                Pendientes
                            </button>
                            <button
                                onClick={() => setShowReviewed(true)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: showReviewed ? 600 : 400, background: showReviewed ? '#1a1a1a' : 'transparent', color: showReviewed ? '#fff' : '#888' }}
                            >
                                Todas
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {alerts.map(alert => {
                                const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                                return (
                                    <div key={alert.id} style={{ background: '#111', border: `1px solid ${sev.border}30`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${sev.border}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: sev.bg, color: sev.text, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{alert.severity}</span>
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: '#1a1a1a', color: '#aaa', fontSize: '0.7rem' }}>{alert.alert_type.replace(/_/g, ' ')}</span>
                                                <span style={{ color: '#666', fontSize: '0.75rem' }}>{formatDate(alert.created_at)}</span>
                                            </div>
                                            {!alert.reviewed && (
                                                <button
                                                    onClick={() => reviewAlert(alert.id)}
                                                    disabled={actionLoading === String(alert.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', transition: 'all 0.2s', opacity: actionLoading === String(alert.id) ? 0.5 : 1 }}
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> Marcar revisada
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px' }}>
                                            <strong style={{ color: '#e5e5e5' }}>{alert.user_email || 'Anónimo'}</strong>
                                        </div>
                                        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '12px 16px', color: '#aaa', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.6, wordBreak: 'break-word' }}>
                                            &ldquo;{alert.query_text}&rdquo;
                                        </div>
                                        {alert.reviewed && (
                                            <div style={{ marginTop: '8px', color: '#555', fontSize: '0.75rem' }}>
                                                ✓ Revisada por {alert.reviewed_by} — {formatDate(alert.reviewed_at)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {alerts.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
                                    <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: '#333' }} />
                                    <p>No hay alertas {showReviewed ? '' : 'pendientes'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ TAB: ESTADÍSTICAS ═══ */}
                {!loadingData && tab === 'estadisticas' && stats && (
                    <div>
                        {/* Stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                            {[
                                { label: 'Total Usuarios', value: stats.total_users, icon: Users, color: '#3b82f6' },
                                { label: 'Activos (7d)', value: stats.active_7d, icon: BarChart3, color: '#22c55e' },
                                { label: 'Bloqueados', value: stats.blocked_users, icon: Ban, color: '#ef4444' },
                                { label: 'Alertas Pendientes', value: stats.pending_alerts, icon: AlertTriangle, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.color + '1a' }}>
                                            <s.icon className="w-5 h-5" style={{ color: s.color }} />
                                        </div>
                                        <span style={{ color: '#888', fontSize: '0.8rem' }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e5e5e5' }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Plan distribution */}
                        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '24px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e5e5e5', marginBottom: '20px' }}>Distribución por Plan</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(stats.plans).sort((a, b) => b[1] - a[1]).map(([plan, count]) => {
                                    const planInfo = PLAN_LABELS[plan] || { label: plan, color: '#888' };
                                    const pct = stats.total_users > 0 ? Math.round((count / stats.total_users) * 100) : 0;
                                    return (
                                        <div key={plan}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span style={{ color: planInfo.color, fontWeight: 500, fontSize: '0.9rem' }}>{planInfo.label}</span>
                                                <span style={{ color: '#888', fontSize: '0.85rem' }}>{count} ({pct}%)</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: planInfo.color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
