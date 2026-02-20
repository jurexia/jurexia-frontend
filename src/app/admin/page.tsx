'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Users, Shield, BarChart3, AlertTriangle, Ban, CheckCircle,
    Eye, RefreshCw, Search, ChevronDown, X, Lock, Unlock
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
    created_at: string;
    updated_at: string;
    last_query_at: string | null;
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
    const [showReviewed, setShowReviewed] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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
                    setUsers(Array.isArray(data.users) ? data.users : []);
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

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(searchFilter.toLowerCase())
    );

    if (loading || !user || user.email !== ADMIN_EMAIL) {
        return (
            <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#666' }}>Verificando acceso administrativo...</div>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'usuarios', label: 'Usuarios', icon: Users },
        { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
        { key: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
    ];

    return (
        <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f5f5f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <Navbar />

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 24px 60px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <Shield className="w-6 h-6" style={{ color: '#dc2626' }} />
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f5f5f5' }}>Panel de Administración</h1>
                        </div>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Iurexia Technologies — Gestión de usuarios y seguridad</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '12px' }}>
                        <Lock className="w-4 h-4" style={{ color: '#ef4444' }} />
                        <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>Acceso restringido</span>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: '#111', borderRadius: '12px', padding: '4px', border: '1px solid #222' }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                fontSize: '0.9rem', fontWeight: tab === t.key ? 600 : 400,
                                background: tab === t.key ? '#1a1a1a' : 'transparent',
                                color: tab === t.key ? '#fff' : '#888',
                                transition: 'all 0.2s',
                            }}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Error banner */}
                {error && (
                    <div style={{ padding: '12px 16px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{error}</span>
                        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }}><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Loading */}
                {loadingData && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#666' }}>
                        <RefreshCw className="w-5 h-5 animate-spin" style={{ marginRight: '12px' }} />
                        Cargando datos...
                    </div>
                )}

                {/* ═══ TAB: USUARIOS ═══ */}
                {!loadingData && tab === 'usuarios' && (
                    <div>
                        {/* Search bar */}
                        <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar por email o nombre..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', background: '#111', border: '1px solid #333', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            />
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333' }}>
                                        {['Email', 'Plan', 'Prompts', 'Redacciones', 'Estado', 'Última Actividad', 'Registrado', 'Acciones'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#888', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => {
                                        const plan = PLAN_LABELS[u.subscription_type] || { label: u.subscription_type, color: '#888' };
                                        return (
                                            <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a', opacity: u.is_blocked ? 0.5 : 1 }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {u.is_blocked && <Ban className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />}
                                                        <div>
                                                            <div style={{ color: u.is_blocked ? '#ef4444' : '#e5e5e5', fontWeight: 500 }}>{u.email}</div>
                                                            {u.full_name && <div style={{ color: '#666', fontSize: '0.75rem' }}>{u.full_name}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', background: plan.color + '22', color: plan.color, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{plan.label}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#ccc' }}>{u.queries_used}/{u.queries_limit === -1 ? '∞' : u.queries_limit}</td>
                                                <td style={{ padding: '12px 16px', color: '#ccc' }}>{u.drafts_used}/{u.drafts_limit === -1 ? '∞' : u.drafts_limit}</td>
                                                <td style={{ padding: '12px 16px', color: '#888' }}>{u.estado || '—'}</td>
                                                <td style={{ padding: '12px 16px', color: '#888', whiteSpace: 'nowrap' }}>{timeAgo(u.last_query_at)}</td>
                                                <td style={{ padding: '12px 16px', color: '#666', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {u.email !== ADMIN_EMAIL && (
                                                        <button
                                                            onClick={() => u.is_blocked ? unblockUser(u.id) : blockUser(u.id)}
                                                            disabled={actionLoading === u.id}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                                fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                                                                background: u.is_blocked ? 'rgba(34, 197, 94, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                                                                color: u.is_blocked ? '#86efac' : '#fca5a5',
                                                                opacity: actionLoading === u.id ? 0.5 : 1,
                                                            }}
                                                        >
                                                            {u.is_blocked ? <><Unlock className="w-3.5 h-3.5" /> Desbloquear</> : <><Ban className="w-3.5 h-3.5" /> Bloquear</>}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No se encontraron usuarios</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '16px', color: '#666', fontSize: '0.8rem' }}>
                            {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
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
