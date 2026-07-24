'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Users, Shield, BarChart3, AlertTriangle, Ban, CheckCircle,
    Eye, RefreshCw, Search, ChevronDown, X, Lock, Unlock, CreditCard, Mail, Bell,
    MoreVertical, ChevronLeft, ChevronRight, Filter, Scale, Send, UserCheck, AlertCircle,
    MessageCircle, Bug, Lightbulb, MessageSquare, Clock, CheckCircle2, XCircle, Archive,
    DollarSign, TrendingUp, TrendingDown, Minus, Server, Database, Cloud, Brain, Megaphone, Scissors, Cpu, Globe, Wallet,
    MailX
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const ADMIN_EMAILS = ['administracion@iurexia.com', 'jdm.juridico@gmail.com', 'yair@iurexia.com'];
const isAdminEmail = (email?: string | null) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
const ADMIN_EMAIL = 'administracion@iurexia.com';

type Tab = 'usuarios' | 'alertas' | 'estadisticas' | 'feedback' | 'finanzas';

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

interface FeedbackItem {
    id: string;
    user_id: string;
    user_email: string | null;
    user_name: string | null;
    category: string;
    message: string;
    status: string;
    admin_notes: string | null;
    created_at: string;
    resolved_at: string | null;
}

const CATEGORY_ICONS: Record<string, { icon: any; color: string; label: string }> = {
    error: { icon: Bug, color: '#ef4444', label: 'Error' },
    mejora: { icon: Lightbulb, color: '#f59e0b', label: 'Mejora' },
    otro: { icon: MessageSquare, color: '#3b82f6', label: 'Otro' },
    general: { icon: MessageSquare, color: '#6b7280', label: 'General' },
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    pendiente: { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Pendiente' },
    en_revision: { icon: Eye, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'En revisión' },
    resuelto: { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: 'Resuelto' },
    descartado: { icon: XCircle, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'Descartado' },
};

interface FinancesData {
    totalSubscribers: number;
    totalMRR: number; // centavos MXN
    planBreakdown: { name: string; count: number; mrr: number }[];
    balance: { available: number; pending: number; currency: string };
    timestamp: string;
}

interface CostItem {
    name: string;
    amount: number; // MXN
    icon: any;
    type: 'fijo' | 'variable' | 'dev' | 'marketing';
    color: string;
    note?: string;
}

// ═══ COSTOS OPERATIVOS MENSUALES ═══
// Última actualización: 24 mayo 2026 (datos reales de facturación)
// TC referencia: $19.50 MXN/USD
const OPERATIONAL_COSTS: CostItem[] = [
    // Infraestructura — servicios fijos con fecha de cobro
    { name: 'Render (API Backend)', amount: 1482, icon: Server, type: 'fijo', color: '#6366f1', note: 'Proy. $76 USD · Factura: 30 de cada mes' },
    { name: 'Supabase (DB + Auth)', amount: 488, icon: Database, type: 'fijo', color: '#3ecf8e', note: '$25 USD · Factura: ~14 de cada mes' },
    { name: 'Qdrant Cloud (Vectores)', amount: 837, icon: Database, type: 'fijo', color: '#dc2626', note: '$42.90 USD · Factura: 1ero de cada mes' },
    { name: 'Google Workspace (2 lic)', amount: 437, icon: Globe, type: 'fijo', color: '#4285f4', note: 'Business Standard × 2' },
    { name: 'Google AI Ultra Access', amount: 640, icon: Brain, type: 'fijo', color: '#fbbc04', note: '⚠️ Sube a $2,010 el 19 jun' },
    { name: 'Google Workspace Archivado', amount: 50, icon: Globe, type: 'fijo', color: '#34a853', note: '1 usuario archivado' },
    { name: 'Dominio iurexia.com', amount: 12, icon: Globe, type: 'fijo', color: '#ea4335', note: 'Prorrateo mensual' },
    // APIs y Cloud — costos variables
    { name: 'Google Cloud (Bucket + APIs)', amount: 972, icon: Cloud, type: 'variable', color: '#4285f4', note: 'Proy. $972 MXN mayo · ↑25% vs abril' },
    { name: 'OpenRouter API', amount: 200, icon: Cpu, type: 'variable', color: '#8b5cf6', note: 'DeepSeek + modelos auxiliares' },
    { name: 'DeepSeek API', amount: 100, icon: Brain, type: 'variable', color: '#0ea5e9', note: 'Thinking mode directo' },
    // Desarrollo
    { name: 'Claude (Desarrollo)', amount: 4000, icon: Cpu, type: 'dev', color: '#d97706', note: '$200 USD/mes' },
    // Marketing
    { name: 'CapCut Pro', amount: 400, icon: Scissors, type: 'marketing', color: '#ec4899', note: 'Edición de video publicitario' },
    { name: 'Publicidad Digital', amount: 3000, icon: Megaphone, type: 'marketing', color: '#f97316', note: 'Meta Ads, Google Ads, etc.' },
];

const STRIPE_FEE_RATE = 0.036; // 3.6%
const STRIPE_FEE_FIXED = 300; // $3 MXN por transacción (en centavos)

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
const INGESTED_STATES = ['QUERETARO', 'CDMX', 'CIUDAD_DE_MEXICO', 'GUANAJUATO', 'JALISCO', 'MICHOACAN', 'VERACRUZ', 'MORELOS', 'PUEBLA', 'SINALOA', 'COAHUILA'];

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
    const [cancellationSent, setCancellationSent] = useState<Set<string>>(new Set());
    const [isSendingMails, setIsSendingMails] = useState(false);
    const [unconfirmedUsers, setUnconfirmedUsers] = useState<{id: string; email: string; created_at: string | null; full_name: string}[]>([]);
    const [showUnconfirmed, setShowUnconfirmed] = useState(false);
    const [loadingUnconfirmed, setLoadingUnconfirmed] = useState(false);
    const [reminderSent, setReminderSent] = useState<Set<string>>(new Set());
    const [isSendingAllReminders, setIsSendingAllReminders] = useState(false);
    // Feedback inbox state
    const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
    const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pendiente' | 'en_revision' | 'resuelto' | 'descartado'>('pendiente');
    const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<'all' | 'error' | 'mejora' | 'otro'>('all');
    const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
    const [feedbackCount, setFeedbackCount] = useState(0);
    // Finanzas state
    const [financesData, setFinancesData] = useState<FinancesData | null>(null);
    const [editingCosts, setEditingCosts] = useState<Record<string, number>>({});
    const [showCostEditor, setShowCostEditor] = useState(false);

    const getToken = useCallback(() => {
        return session?.access_token || '';
    }, [session]);

    // Auth guard
    useEffect(() => {
        if (!loading && (!user || !isAdminEmail(user.email))) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Fetch data when tab changes
    useEffect(() => {
        if (!user || !isAdminEmail(user.email) || !session) return;

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
                } else if (tab === 'feedback') {
                    // Fetch feedback directly from Supabase
                    let query = supabase
                        .from('user_feedback')
                        .select('*')
                        .order('created_at', { ascending: false });
                    if (feedbackFilter !== 'all') {
                        query = query.eq('status', feedbackFilter);
                    }
                    if (feedbackCategoryFilter !== 'all') {
                        query = query.eq('category', feedbackCategoryFilter);
                    }
                    const { data, error: fbErr } = await query.limit(100);
                    if (fbErr) throw new Error(fbErr.message);
                    setFeedbackItems(data || []);

                    // Get pending count for badge
                    const { count } = await supabase
                        .from('user_feedback')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'pendiente');
                    setFeedbackCount(count || 0);
                } else if (tab === 'finanzas') {
                    const res = await fetch('/api/admin/finances');
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    const data = await res.json();
                    setFinancesData(data);
                    // Load saved cost overrides from localStorage
                    try {
                        const saved = localStorage.getItem('iurexia_cost_overrides');
                        if (saved) setEditingCosts(JSON.parse(saved));
                    } catch {}
                }
            } catch (e: any) {
                setError(e.message || 'Error al cargar datos');
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [tab, showReviewed, feedbackFilter, feedbackCategoryFilter, user, session, getToken]);

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

    const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
        setActionLoading(feedbackId);
        try {
            const { error: updateErr } = await supabase
                .from('user_feedback')
                .update({
                    status: newStatus,
                    ...(newStatus === 'resuelto' ? { resolved_at: new Date().toISOString() } : {}),
                })
                .eq('id', feedbackId);
            if (updateErr) throw new Error(updateErr.message);
            setFeedbackItems(prev => prev.map(f => f.id === feedbackId ? {
                ...f,
                status: newStatus,
                ...(newStatus === 'resuelto' ? { resolved_at: new Date().toISOString() } : {})
            } : f));
            // Update count
            const { count } = await supabase
                .from('user_feedback')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pendiente');
            setFeedbackCount(count || 0);
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

    const triggerRetroactiveMails = async () => {
        if (!confirm('¿Estás seguro de enviar los correos de impago a todos los usuarios con facturas fallidas?')) return;
        setIsSendingMails(true);
        setError('');
        try {
            const res = await fetch('/api/admin/trigger-retroactive-failed-emails', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar correos');

            const sent = data.results?.filter((r: any) => r.status === 'sent') || [];
            const errors = data.results?.filter((r: any) => r.status === 'error') || [];
            const skipped = data.results?.filter((r: any) => r.status === 'skipped') || [];

            let msg = `Proceso finalizado. Se encontraron ${data.processedCount} facturas fallidas.\n\n`;
            msg += `✅ Correos enviados con éxito: ${sent.length}\n`;
            msg += `⏭️ Omitidas (sin email): ${skipped.length}\n`;

            if (errors.length > 0) {
                msg += `❌ Errores de envío en Resend: ${errors.length}\n`;
                msg += `Primer error detectado: ${errors[0].error}\n`;
                alert(msg + '\nPor favor comparte esta información con tu equipo técnico.');
            } else {
                alert(msg);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSendingMails(false);
        }
    };

    const fetchUnconfirmedUsers = async () => {
        setLoadingUnconfirmed(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/admin/unconfirmed-users`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data = await res.json();
            setUnconfirmedUsers(data.unconfirmed || []);
            setShowUnconfirmed(true);
        } catch (e: any) {
            setError(e.message || 'Error al cargar usuarios no confirmados');
        } finally {
            setLoadingUnconfirmed(false);
        }
    };

    const sendConfirmationReminder = async (userId: string, email: string, name: string) => {
        setActionLoading(email);
        try {
            // Step 1: Confirm email via backend (Supabase Admin API)
            const confirmRes = await fetch(`${API_URL}/admin/users/${userId}/confirm-email`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!confirmRes.ok) {
                const err = await confirmRes.json();
                alert(`Error al confirmar: ${err.detail || 'Error desconocido'}`);
                setActionLoading(null);
                return;
            }

            // Step 2: Send "account is ready" email via Resend
            const emailRes = await fetch('/api/admin/confirmation-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: name || email.split('@')[0] }),
            });
            if (emailRes.ok) {
                setReminderSent(prev => new Set(Array.from(prev).concat(email)));
            } else {
                // Email failed but account was confirmed — still mark as done
                setReminderSent(prev => new Set(Array.from(prev).concat(email)));
                alert('Cuenta confirmada ✅ pero el email no se pudo enviar (revisa Resend).');
            }
        } catch { alert('Error de conexión'); }
        setActionLoading(null);
    };

    const sendAllConfirmationReminders = async () => {
        const unsent = unconfirmedUsers.filter(u => !reminderSent.has(u.email));
        if (!confirm(`¿Confirmar cuenta y enviar email a ${unsent.length} usuarios?`)) return;
        setIsSendingAllReminders(true);
        let sent = 0, errors = 0;
        for (const u of unsent) {
            try {
                // Confirm email first
                const confirmRes = await fetch(`${API_URL}/admin/users/${u.id}/confirm-email`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                if (!confirmRes.ok) { errors++; continue; }

                // Then send email
                const emailRes = await fetch('/api/admin/confirmation-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: u.email, name: u.full_name || u.email.split('@')[0] }),
                });
                if (emailRes.ok || confirmRes.ok) {
                    setReminderSent(prev => new Set(Array.from(prev).concat(u.email)));
                    sent++;
                } else errors++;
            } catch { errors++; }
            await new Promise(r => setTimeout(r, 600)); // Rate limit
        }
        alert(`Confirmados y notificados: ${sent} ✅\nErrores: ${errors} ❌`);
        setIsSendingAllReminders(false);
    };

    if (loading || !user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="flex bg-[#0a0a0a] min-h-screen items-center justify-center">
                <div className="text-gray-500 font-medium tracking-wide">Verificando acceso administrativo...</div>
            </div>
        );
    }

    // Helper: get cost amount (with user overrides from localStorage)
    const getCostAmount = (costName: string, defaultAmount: number) => {
        return editingCosts[costName] ?? defaultAmount;
    };

    const saveCostOverrides = (overrides: Record<string, number>) => {
        setEditingCosts(overrides);
        localStorage.setItem('iurexia_cost_overrides', JSON.stringify(overrides));
    };

    // Calculate finances
    const totalCosts = OPERATIONAL_COSTS.reduce((sum, c) => sum + getCostAmount(c.name, c.amount), 0);
    const costsByType = {
        fijo: OPERATIONAL_COSTS.filter(c => c.type === 'fijo').reduce((s, c) => s + getCostAmount(c.name, c.amount), 0),
        variable: OPERATIONAL_COSTS.filter(c => c.type === 'variable').reduce((s, c) => s + getCostAmount(c.name, c.amount), 0),
        dev: OPERATIONAL_COSTS.filter(c => c.type === 'dev').reduce((s, c) => s + getCostAmount(c.name, c.amount), 0),
        marketing: OPERATIONAL_COSTS.filter(c => c.type === 'marketing').reduce((s, c) => s + getCostAmount(c.name, c.amount), 0),
    };

    const mrrCentavos = financesData?.totalMRR || 0;
    const mrrPesos = mrrCentavos / 100;
    const totalSubs = financesData?.totalSubscribers || 0;
    const stripeFees = totalSubs > 0 ? (mrrPesos * STRIPE_FEE_RATE) + (totalSubs * (STRIPE_FEE_FIXED / 100)) : 0;
    const netRevenue = mrrPesos - stripeFees;
    const grossProfit = netRevenue - totalCosts;
    const margin = mrrPesos > 0 ? (grossProfit / mrrPesos) * 100 : 0;
    const breakEvenSubs = Math.ceil((totalCosts * 100) / (14900 * (1 - STRIPE_FEE_RATE) - STRIPE_FEE_FIXED));

    const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
        { key: 'usuarios', label: 'Usuarios', icon: Users },
        { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
        { key: 'feedback', label: 'Feedback', icon: MessageCircle, badge: feedbackCount },
        { key: 'finanzas', label: 'Finanzas', icon: DollarSign },
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
                    <div className="flex items-center gap-4 flex-wrap">
                        <button
                            onClick={fetchUnconfirmedUsers}
                            disabled={loadingUnconfirmed}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl shadow-sm text-emerald-400 font-medium transition-colors disabled:opacity-50"
                        >
                            {loadingUnconfirmed ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <UserCheck className="w-4 h-4" />
                            )}
                            Recuperar No Confirmados
                            {unconfirmedUsers.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                    {unconfirmedUsers.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={triggerRetroactiveMails}
                            disabled={isSendingMails}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/30 rounded-xl shadow-sm text-accent-gold font-medium transition-colors disabled:opacity-50"
                        >
                            {isSendingMails ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Notificar Impagos
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl shadow-sm">
                            <Lock className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-400">Acceso restringido</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 mb-8 bg-[#111] rounded-xl p-1.5 border border-[#222] shadow-sm max-w-2xl">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all focus:outline-none relative ${tab === t.key ? 'bg-[#1a1a1a] text-white font-semibold shadow-md border border-[#333]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#151515] font-medium border border-transparent'}`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                            {t.badge && t.badge > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold min-w-[20px] text-center">
                                    {t.badge}
                                </span>
                            )}
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

                {/* Unconfirmed Users Section */}
                {showUnconfirmed && (
                    <div className="mb-8 bg-[#0d0d0d] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 bg-emerald-500/5 border-b border-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-white font-semibold">Usuarios sin confirmar email</h3>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                                    {unconfirmedUsers.length} usuario{unconfirmedUsers.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {unconfirmedUsers.length > 0 && (
                                    <button
                                        onClick={sendAllConfirmationReminders}
                                        disabled={isSendingAllReminders || unconfirmedUsers.every(u => reminderSent.has(u.email))}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-40"
                                    >
                                        {isSendingAllReminders ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        Confirmar todos + Notificar
                                    </button>
                                )}
                                <button onClick={() => setShowUnconfirmed(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {unconfirmedUsers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-500/30" />
                                <p className="font-medium text-sm">¡Todos los usuarios han confirmado su email!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1a1a1a]">
                                {unconfirmedUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between px-6 py-3 hover:bg-[#151515] transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-gray-200 font-medium text-sm">{u.email}</span>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {u.full_name && <span className="text-xs text-gray-500">{u.full_name}</span>}
                                                <span className="text-xs text-gray-600">Registrado {u.created_at ? formatDate(u.created_at) : '—'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {reminderSent.has(u.email) ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                                                    <CheckCircle className="w-4 h-4" /> Enviado
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => sendConfirmationReminder(u.id, u.email, u.full_name)}
                                                    disabled={actionLoading === u.email}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === u.email ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                    Confirmar + Notificar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                                                                planType: u.subscription_type,
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
                                                        {/* Cancellation email button — only for users with cancel_at_period_end */}
                                                        {sub && sub.cancel_at_period_end && sub.status === 'active' && !cancellationSent.has(u.email) && (
                                                            <button
                                                                onClick={async () => {
                                                                    setActionLoading(u.id);
                                                                    try {
                                                                        const { data: { session } } = await supabase.auth.getSession();
                                                                        const res = await fetch('/api/admin/cancellation-email', {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Content-Type': 'application/json',
                                                                                'Authorization': `Bearer ${session?.access_token}`,
                                                                            },
                                                                            body: JSON.stringify({
                                                                                email: u.email,
                                                                                name: u.full_name || u.email.split('@')[0],
                                                                                planLabel: plan.label,
                                                                            }),
                                                                        });
                                                                        if (res.ok) {
                                                                            setCancellationSent(prev => new Set(Array.from(prev).concat(u.email)));
                                                                        } else {
                                                                            const err = await res.json();
                                                                            alert(`Error: ${err.error}`);
                                                                        }
                                                                    } catch { alert('Error al enviar email de cancelación'); }
                                                                    setActionLoading(null);
                                                                }}
                                                                disabled={actionLoading === u.id}
                                                                className={`p-2 rounded-lg transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:outline-none ${actionLoading === u.id ? 'opacity-50' : ''}`}
                                                                title="Enviar email de cancelación (cupón 30%)"
                                                            >
                                                                <MailX className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {sub && sub.cancel_at_period_end && sub.status === 'active' && cancellationSent.has(u.email) && (
                                                            <span title="Email de cancelación enviado" className="text-red-400"><CheckCircle className="w-4 h-4" /></span>
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

                {/* ═══ TAB: FEEDBACK ═══ */}
                {!loadingData && tab === 'feedback' && (
                    <div>
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex gap-1 bg-[#111] rounded-xl p-1 border border-[#222]">
                                {(['all', 'pendiente', 'en_revision', 'resuelto', 'descartado'] as const).map(s => {
                                    const conf = s === 'all' ? { label: 'Todos', color: '#888' } : STATUS_CONFIG[s];
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setFeedbackFilter(s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                feedbackFilter === s
                                                    ? 'bg-[#1a1a1a] text-white shadow-md border border-[#333]'
                                                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                            }`}
                                        >
                                            {s === 'all' ? 'Todos' : conf?.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-1 bg-[#111] rounded-xl p-1 border border-[#222]">
                                {(['all', 'error', 'mejora', 'otro'] as const).map(c => {
                                    const conf = c === 'all' ? { label: 'Todas', icon: Filter, color: '#888' } : CATEGORY_ICONS[c];
                                    return (
                                        <button
                                            key={c}
                                            onClick={() => setFeedbackCategoryFilter(c)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                feedbackCategoryFilter === c
                                                    ? 'bg-[#1a1a1a] text-white shadow-md border border-[#333]'
                                                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                            }`}
                                        >
                                            {conf && <conf.icon className="w-3.5 h-3.5" style={{ color: conf.color }} />}
                                            {c === 'all' ? 'Todas' : conf?.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="ml-auto text-xs text-gray-500 flex items-center gap-2">
                                <span>{feedbackItems.length} mensaje{feedbackItems.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        {/* Feedback list */}
                        <div className="space-y-3">
                            {feedbackItems.map(fb => {
                                const cat = CATEGORY_ICONS[fb.category] || CATEGORY_ICONS.general;
                                const st = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pendiente;
                                const isExpanded = expandedFeedback === fb.id;
                                return (
                                    <div
                                        key={fb.id}
                                        className="bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden transition-all hover:border-[#333] shadow-lg"
                                        style={{ borderLeft: `3px solid ${cat.color}` }}
                                    >
                                        {/* Header row */}
                                        <div
                                            className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                                            onClick={() => setExpandedFeedback(isExpanded ? null : fb.id)}
                                        >
                                            {/* Category icon */}
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: `${cat.color}15` }}
                                            >
                                                <cat.icon className="w-4.5 h-4.5" style={{ color: cat.color }} />
                                            </div>

                                            {/* User info + preview */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-semibold text-gray-200 truncate">
                                                        {fb.user_name || fb.user_email || 'Usuario'}
                                                    </span>
                                                    {fb.user_name && fb.user_email && (
                                                        <span className="text-xs text-gray-600 truncate hidden sm:inline">
                                                            {fb.user_email}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {fb.message.slice(0, 120)}{fb.message.length > 120 ? '...' : ''}
                                                </p>
                                            </div>

                                            {/* Status + time */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}25` }}
                                                >
                                                    <st.icon className="w-3 h-3" />
                                                    {st.label}
                                                </span>
                                                <span className="text-xs text-gray-600 whitespace-nowrap hidden sm:block">
                                                    {timeAgo(fb.created_at)}
                                                </span>
                                                <ChevronDown
                                                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-1 border-t border-[#1a1a1a]">
                                                {/* Full message */}
                                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 mb-4">
                                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                        {fb.message}
                                                    </p>
                                                </div>

                                                {/* Meta info */}
                                                <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
                                                    <span>📅 {formatDate(fb.created_at)}</span>
                                                    <span>📧 {fb.user_email || '—'}</span>
                                                    <span>🏷️ {cat.label}</span>
                                                    {fb.resolved_at && <span>✅ Resuelto: {formatDate(fb.resolved_at)}</span>}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-wrap gap-2">
                                                    {fb.status === 'pendiente' && (
                                                        <>
                                                            <button
                                                                onClick={() => updateFeedbackStatus(fb.id, 'en_revision')}
                                                                disabled={actionLoading === fb.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                Marcar en revisión
                                                            </button>
                                                            <button
                                                                onClick={() => updateFeedbackStatus(fb.id, 'resuelto')}
                                                                disabled={actionLoading === fb.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Resolver
                                                            </button>
                                                            <button
                                                                onClick={() => updateFeedbackStatus(fb.id, 'descartado')}
                                                                disabled={actionLoading === fb.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs font-semibold hover:bg-gray-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                <Archive className="w-3.5 h-3.5" />
                                                                Descartar
                                                            </button>
                                                        </>
                                                    )}
                                                    {fb.status === 'en_revision' && (
                                                        <>
                                                            <button
                                                                onClick={() => updateFeedbackStatus(fb.id, 'resuelto')}
                                                                disabled={actionLoading === fb.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Marcar resuelto
                                                            </button>
                                                            <button
                                                                onClick={() => updateFeedbackStatus(fb.id, 'pendiente')}
                                                                disabled={actionLoading === fb.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Volver a pendiente
                                                            </button>
                                                        </>
                                                    )}
                                                    {(fb.status === 'resuelto' || fb.status === 'descartado') && (
                                                        <button
                                                            onClick={() => updateFeedbackStatus(fb.id, 'pendiente')}
                                                            disabled={actionLoading === fb.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                            Reabrir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {feedbackItems.length === 0 && (
                                <div className="text-center py-20">
                                    <MessageCircle className="w-10 h-10 mx-auto mb-4 text-gray-700" />
                                    <p className="text-gray-500 font-medium">No hay mensajes de feedback</p>
                                    <p className="text-gray-600 text-xs mt-1">
                                        {feedbackFilter !== 'all' ? 'Prueba cambiando el filtro de estado' : 'Los usuarios aún no han enviado comentarios'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ TAB: FINANZAS ═══ */}
                {!loadingData && tab === 'finanzas' && (
                    <div>
                        {/* ── Top KPI Cards ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                            {[
                                {
                                    label: 'Ingresos MRR',
                                    value: `$${mrrPesos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
                                    sub: `${totalSubs} suscriptores`,
                                    icon: TrendingUp,
                                    color: '#22c55e',
                                    borderColor: '#22c55e',
                                },
                                {
                                    label: 'Costos Totales',
                                    value: `$${totalCosts.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
                                    sub: `${OPERATIONAL_COSTS.length} servicios`,
                                    icon: TrendingDown,
                                    color: '#ef4444',
                                    borderColor: '#ef4444',
                                },
                                {
                                    label: grossProfit >= 0 ? 'Utilidad Bruta' : 'Pérdida Neta',
                                    value: `${grossProfit >= 0 ? '+' : '-'}$${Math.abs(grossProfit).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
                                    sub: `Margen: ${margin.toFixed(1)}%`,
                                    icon: grossProfit >= 0 ? TrendingUp : TrendingDown,
                                    color: grossProfit >= 0 ? '#d4af37' : '#ef4444',
                                    borderColor: grossProfit >= 0 ? '#d4af37' : '#ef4444',
                                },
                                {
                                    label: 'Balance Stripe',
                                    value: `$${((financesData?.balance?.pending || 0) / 100).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
                                    sub: `Disponible: $${((financesData?.balance?.available || 0) / 100).toLocaleString('es-MX')}`,
                                    icon: Wallet,
                                    color: '#3b82f6',
                                    borderColor: '#3b82f6',
                                },
                            ].map((kpi, i) => (
                                <div key={i} style={{
                                    background: '#0d0d0d',
                                    border: `1px solid #222`,
                                    borderLeft: `3px solid ${kpi.borderColor}`,
                                    borderRadius: '16px',
                                    padding: '24px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{ position: 'absolute', top: '16px', right: '16px', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${kpi.color}12` }}>
                                        <kpi.icon style={{ width: '20px', height: '20px', color: kpi.color }} />
                                    </div>
                                    <p style={{ color: '#888', fontSize: '0.78rem', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
                                    <p style={{ fontSize: '1.8rem', fontWeight: 800, color: kpi.color, lineHeight: 1.1, fontFeatureSettings: '"tnum"' }}>
                                        {kpi.value}
                                    </p>
                                    <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '6px' }}>{kpi.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Viability Banner ── */}
                        <div style={{
                            padding: '16px 24px',
                            borderRadius: '14px',
                            marginBottom: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            background: grossProfit >= 0
                                ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(212,175,55,0.06))'
                                : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.06))',
                            border: grossProfit >= 0 ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.25)',
                        }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: grossProfit >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                fontSize: '1.5rem',
                            }}>
                                {grossProfit >= 0 ? '🟢' : '🔴'}
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '1rem', color: grossProfit >= 0 ? '#86efac' : '#fca5a5' }}>
                                    {grossProfit >= 0 ? 'Iurexia es rentable operativamente' : 'Iurexia está en números rojos'}
                                </p>
                                <p style={{ color: '#999', fontSize: '0.82rem', marginTop: '2px' }}>
                                    {grossProfit >= 0
                                        ? `Utilidad de $${grossProfit.toLocaleString('es-MX')} MXN/mes. Para cubrir sueldo (~$25,000) necesitas ${Math.ceil(((25000 + totalCosts) * 100) / (14900 * (1 - STRIPE_FEE_RATE) - STRIPE_FEE_FIXED))} suscriptores Pro.`
                                        : `Pérdida de $${Math.abs(grossProfit).toLocaleString('es-MX')} MXN/mes. Necesitas ${breakEvenSubs} suscriptores Pro para break-even (tienes ${totalSubs}).`
                                    }
                                </p>
                            </div>
                        </div>

                        {/* ── Two-column layout ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

                            {/* LEFT: P&L Statement */}
                            <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '16px', padding: '24px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BarChart3 style={{ width: '18px', height: '18px', color: '#d4af37' }} />
                                    Estado de Resultados (Mensual)
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    {/* Revenue */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Ingresos Brutos (MRR)</span>
                                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.9rem', fontFeatureSettings: '"tnum"' }}>${mrrPesos.toLocaleString('es-MX')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                                        <span style={{ color: '#777', fontSize: '0.82rem', paddingLeft: '12px' }}>(-) Comisiones Stripe (3.6% + $3)</span>
                                        <span style={{ color: '#ef4444', fontSize: '0.82rem', fontFeatureSettings: '"tnum"' }}>-${stripeFees.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid #333', fontWeight: 700 }}>
                                        <span style={{ color: '#ccc', fontSize: '0.88rem' }}>= Ingreso Neto</span>
                                        <span style={{ color: '#22c55e', fontSize: '0.95rem', fontFeatureSettings: '"tnum"' }}>${netRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
                                    </div>

                                    {/* Cost categories */}
                                    {[
                                        { label: 'Infraestructura', amount: costsByType.fijo, color: '#6366f1' },
                                        { label: 'APIs Variables', amount: costsByType.variable, color: '#0ea5e9' },
                                        { label: 'Desarrollo (Claude)', amount: costsByType.dev, color: '#d97706' },
                                        { label: 'Marketing', amount: costsByType.marketing, color: '#f97316' },
                                    ].map(cat => (
                                        <div key={cat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #151515' }}>
                                            <span style={{ color: '#777', fontSize: '0.82rem', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: cat.color, display: 'inline-block' }} />
                                                (-) {cat.label}
                                            </span>
                                            <span style={{ color: '#ef4444', fontSize: '0.82rem', fontFeatureSettings: '"tnum"' }}>-${cat.amount.toLocaleString('es-MX')}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                                        <span style={{ color: '#888', fontSize: '0.82rem', paddingLeft: '12px' }}>(-) Total Costos</span>
                                        <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', fontFeatureSettings: '"tnum"' }}>-${totalCosts.toLocaleString('es-MX')}</span>
                                    </div>

                                    {/* Bottom line */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: '4px',
                                        borderTop: '2px solid #444',
                                        background: grossProfit >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                                        borderRadius: '0 0 8px 8px',
                                        paddingLeft: '8px', paddingRight: '4px',
                                    }}>
                                        <span style={{ color: '#e5e5e5', fontWeight: 800, fontSize: '1rem' }}>
                                            {grossProfit >= 0 ? '✅ UTILIDAD' : '🔴 PÉRDIDA NETA'}
                                        </span>
                                        <span style={{ color: grossProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 800, fontSize: '1.1rem', fontFeatureSettings: '"tnum"' }}>
                                            {grossProfit >= 0 ? '+' : '-'}${Math.abs(grossProfit).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                                            <span style={{ color: '#666', fontWeight: 400, fontSize: '0.7rem', marginLeft: '6px' }}>MXN/mes</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Revenue Breakdown from Stripe */}
                            <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '16px', padding: '24px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CreditCard style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                                    Ingresos por Plan (Live Stripe)
                                </h3>
                                {financesData?.planBreakdown && financesData.planBreakdown.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {financesData.planBreakdown.map((plan, i) => {
                                            const planMRR = plan.mrr / 100;
                                            const pctOfTotal = mrrPesos > 0 ? (planMRR / mrrPesos) * 100 : 0;
                                            const planColors = ['#3b82f6', '#8b5cf6', '#d4af37', '#22c55e', '#ef4444'];
                                            const color = planColors[i % planColors.length];
                                            return (
                                                <div key={plan.name}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'baseline' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, display: 'inline-block' }} />
                                                            <span style={{ color: '#ccc', fontWeight: 600, fontSize: '0.88rem' }}>{plan.name}</span>
                                                            <span style={{ color: '#555', fontSize: '0.75rem', background: '#1a1a1a', padding: '2px 8px', borderRadius: '6px' }}>{plan.count} subs</span>
                                                        </div>
                                                        <span style={{ color: color, fontWeight: 700, fontSize: '0.9rem', fontFeatureSettings: '"tnum"' }}>
                                                            ${planMRR.toLocaleString('es-MX')}/mes
                                                        </span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pctOfTotal}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                                    </div>
                                                    <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '3px', textAlign: 'right' }}>{pctOfTotal.toFixed(1)}% del ingreso</p>
                                                </div>
                                            );
                                        })}

                                        {/* Subscriber growth target */}
                                        <div style={{ marginTop: '8px', padding: '14px', background: '#111', border: '1px solid #222', borderRadius: '12px' }}>
                                            <p style={{ color: '#888', fontSize: '0.78rem', fontWeight: 600, marginBottom: '8px' }}>🎯 Meta para break-even completo</p>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#d4af37' }}>{breakEvenSubs}</span>
                                                <span style={{ color: '#888', fontSize: '0.82rem' }}>suscriptores Pro</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                                                <div style={{
                                                    width: `${Math.min(100, (totalSubs / breakEvenSubs) * 100)}%`,
                                                    height: '100%',
                                                    background: totalSubs >= breakEvenSubs ? '#22c55e' : 'linear-gradient(90deg, #ef4444, #f59e0b)',
                                                    borderRadius: '3px',
                                                    transition: 'width 0.6s ease',
                                                }} />
                                            </div>
                                            <p style={{ color: '#666', fontSize: '0.72rem', marginTop: '4px' }}>
                                                Progreso: {totalSubs}/{breakEvenSubs} ({((totalSubs / breakEvenSubs) * 100).toFixed(0)}%)
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                                        <RefreshCw style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} className="animate-spin" />
                                        <p>Cargando datos de Stripe...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Detailed Cost Breakdown ── */}
                        <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e5e5e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Server style={{ width: '18px', height: '18px', color: '#ef4444' }} />
                                    Desglose de Costos Mensuales
                                </h3>
                                <button
                                    onClick={() => setShowCostEditor(!showCostEditor)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '8px', border: '1px solid #333',
                                        background: showCostEditor ? '#1a1a1a' : 'transparent',
                                        color: showCostEditor ? '#fff' : '#888', cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                                    }}
                                >
                                    {showCostEditor ? '✓ Guardar cambios' : '✏️ Editar montos'}
                                </button>
                            </div>

                            {/* Category headers */}
                            {[
                                { label: '🏗️ Infraestructura Fija', type: 'fijo' as const, color: '#6366f1' },
                                { label: '⚡ APIs Variables', type: 'variable' as const, color: '#0ea5e9' },
                                { label: '🛠️ Desarrollo', type: 'dev' as const, color: '#d97706' },
                                { label: '📢 Marketing', type: 'marketing' as const, color: '#f97316' },
                            ].map(cat => (
                                <div key={cat.type} style={{ marginBottom: '20px' }}>
                                    <p style={{
                                        color: cat.color, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.06em', marginBottom: '10px', paddingLeft: '4px',
                                    }}>{cat.label}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {OPERATIONAL_COSTS.filter(c => c.type === cat.type).map(cost => {
                                            const currentAmount = getCostAmount(cost.name, cost.amount);
                                            return (
                                                <div key={cost.name} style={{
                                                    display: 'flex', alignItems: 'center', padding: '10px 14px',
                                                    borderRadius: '10px', transition: 'background 0.15s',
                                                    background: 'transparent',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cost.color}15`, marginRight: '12px', flexShrink: 0 }}>
                                                        <cost.icon style={{ width: '16px', height: '16px', color: cost.color }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>{cost.name}</p>
                                                        {cost.note && <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '1px' }}>{cost.note}</p>}
                                                    </div>
                                                    {showCostEditor ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ color: '#666', fontSize: '0.82rem' }}>$</span>
                                                            <input
                                                                type="number"
                                                                value={currentAmount}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    const updated = { ...editingCosts, [cost.name]: val };
                                                                    saveCostOverrides(updated);
                                                                }}
                                                                style={{
                                                                    width: '90px', padding: '4px 8px', borderRadius: '6px',
                                                                    border: '1px solid #333', background: '#111', color: '#fff',
                                                                    fontSize: '0.85rem', textAlign: 'right', fontFeatureSettings: '"tnum"',
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', fontFeatureSettings: '"tnum"', minWidth: '80px', textAlign: 'right' }}>
                                                            ${currentAmount.toLocaleString('es-MX')}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 14px 2px', borderTop: '1px solid #1a1a1a' }}>
                                            <span style={{ color: '#777', fontSize: '0.78rem', fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
                                                Subtotal: ${costsByType[cat.type].toLocaleString('es-MX')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Grand total bar */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '14px 18px', background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', marginTop: '8px',
                            }}>
                                <span style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.95rem' }}>COSTO TOTAL MENSUAL</span>
                                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.2rem', fontFeatureSettings: '"tnum"' }}>
                                    ${totalCosts.toLocaleString('es-MX')} MXN
                                    <span style={{ color: '#777', fontWeight: 400, fontSize: '0.72rem', marginLeft: '8px' }}>
                                        (~${(totalCosts / 20).toLocaleString('es-MX', { maximumFractionDigits: 0 })} USD)
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* ── Cost Distribution Visual ── */}
                        <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '16px', padding: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart3 style={{ width: '18px', height: '18px', color: '#8b5cf6' }} />
                                Distribución del Gasto
                            </h3>
                            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', gap: '2px', marginBottom: '16px' }}>
                                {[
                                    { label: 'Infra', amount: costsByType.fijo, color: '#6366f1' },
                                    { label: 'APIs', amount: costsByType.variable, color: '#0ea5e9' },
                                    { label: 'Dev', amount: costsByType.dev, color: '#d97706' },
                                    { label: 'Marketing', amount: costsByType.marketing, color: '#f97316' },
                                ].map(seg => (
                                    <div key={seg.label} style={{
                                        width: `${totalCosts > 0 ? (seg.amount / totalCosts) * 100 : 25}%`,
                                        height: '100%', background: seg.color, transition: 'width 0.6s ease',
                                        minWidth: '4px', borderRadius: '4px',
                                    }} title={`${seg.label}: $${seg.amount.toLocaleString('es-MX')} (${totalCosts > 0 ? ((seg.amount / totalCosts) * 100).toFixed(1) : 25}%)`} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                {[
                                    { label: 'Infraestructura', amount: costsByType.fijo, color: '#6366f1' },
                                    { label: 'APIs Variables', amount: costsByType.variable, color: '#0ea5e9' },
                                    { label: 'Desarrollo', amount: costsByType.dev, color: '#d97706' },
                                    { label: 'Marketing', amount: costsByType.marketing, color: '#f97316' },
                                ].map(seg => (
                                    <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: seg.color }} />
                                        <span style={{ color: '#999', fontSize: '0.78rem' }}>{seg.label}</span>
                                        <span style={{ color: '#ccc', fontSize: '0.78rem', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                                            ${seg.amount.toLocaleString('es-MX')} ({totalCosts > 0 ? ((seg.amount / totalCosts) * 100).toFixed(0) : 0}%)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
