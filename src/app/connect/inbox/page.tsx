'use client';

import { useState, useEffect } from 'react';
import {
    Inbox, Clock, MapPin, Scale, ArrowLeft, Loader2, BadgeCheck,
    Mail, Phone, MessageSquare, CheckCircle2, XCircle, Eye,
    ChevronDown, User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/UserAvatar';
import { getConnectRequests, updateConnectRequestStatus, ConnectRequest } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: 'Pendiente',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="w-3.5 h-3.5" />,
    },
    read: {
        label: 'Leída',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <Eye className="w-3.5 h-3.5" />,
    },
    accepted: {
        label: 'Aceptada',
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    rejected: {
        label: 'Rechazada',
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="w-3.5 h-3.5" />,
    },
};

export default function ConnectInboxPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<ConnectRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [lawyerProfile, setLawyerProfile] = useState<Record<string, unknown> | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    // Check if user is a verified lawyer
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (user?.id) {
            loadLawyerProfile();
        }
    }, [loading, isAuthenticated, user]);

    const loadLawyerProfile = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('lawyer_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data && !error) {
            setLawyerProfile(data);
            loadRequests();
        } else {
            // Not a lawyer — redirect to profile
            router.push('/perfil');
        }
    };

    const loadRequests = async () => {
        setLoadingRequests(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const result = await getConnectRequests(session.access_token);
            setRequests(result.requests);
        } catch (err) {
            console.error('Error loading requests:', err);
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleStatusChange = async (requestId: string, newStatus: 'read' | 'accepted' | 'rejected') => {
        setUpdatingId(requestId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const { request: updated } = await updateConnectRequestStatus(requestId, newStatus, session.access_token);
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updated } : r));
        } catch (err) {
            console.error('Error updating request:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `hace ${minutes}m`;
        if (hours < 24) return `hace ${hours}h`;
        return `hace ${days}d`;
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter);

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    // Loading
    if (loading || !isAuthenticated || !user) {
        return (
            <div className="min-h-screen bg-cream-200 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-charcoal-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-200">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/perfil" className="text-charcoal-500 hover:text-charcoal-700 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Link href="/" className="flex items-center gap-2">
                            <span className="font-serif text-xl font-semibold text-charcoal-900">
                                Iurex<span className="text-accent-gold">ia</span>
                            </span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                                Connect
                            </span>
                        </Link>
                    </div>
                    <UserAvatar />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="font-serif text-3xl font-medium text-charcoal-900 flex items-center gap-3">
                            <Inbox className="w-8 h-8 text-blue-600" />
                            Bandeja de Solicitudes
                        </h1>
                        <p className="text-sm text-charcoal-500 mt-1">
                            Solicitudes de asesoría de usuarios en tu zona
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {pendingCount > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                                <span className="text-xs font-bold text-amber-700">{pendingCount}</span>
                                <span className="text-xs text-amber-600">pendiente{pendingCount !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {lawyerProfile && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                                <BadgeCheck className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700">Verificado</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                {requests.length > 0 && (
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto">
                        {[
                            { key: 'all', label: `Todas (${requests.length})` },
                            { key: 'pending', label: `Pendientes (${requests.filter(r => r.status === 'pending').length})` },
                            { key: 'read', label: `Leídas (${requests.filter(r => r.status === 'read').length})` },
                            { key: 'accepted', label: `Aceptadas (${requests.filter(r => r.status === 'accepted').length})` },
                            { key: 'rejected', label: `Rechazadas (${requests.filter(r => r.status === 'rejected').length})` },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === tab.key
                                        ? 'bg-charcoal-900 text-white'
                                        : 'bg-white text-charcoal-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading State */}
                {loadingRequests && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-charcoal-300 animate-spin mb-4" />
                        <p className="text-charcoal-500">Cargando solicitudes...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loadingRequests && requests.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Inbox className="w-10 h-10 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                            Sin solicitudes aún
                        </h3>
                        <p className="text-charcoal-500 max-w-md mx-auto mb-6">
                            Tu perfil está activo en el directorio de IUREXIA Connect.
                            Cuando un usuario te contacte, sus solicitudes aparecerán aquí.
                        </p>
                        <div className="flex items-center justify-center gap-6 text-sm text-charcoal-400">
                            <div className="flex items-center gap-2">
                                <Scale className="w-4 h-4" />
                                <span>Perfil activo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{(lawyerProfile as Record<string, Record<string, string>>)?.office_address?.estado?.replace(/_/g, ' ') || 'Sin ubicación'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* No results for filter */}
                {!loadingRequests && requests.length > 0 && filteredRequests.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-charcoal-500">No hay solicitudes con el filtro seleccionado.</p>
                    </div>
                )}

                {/* Requests List */}
                {!loadingRequests && filteredRequests.length > 0 && (
                    <div className="space-y-3">
                        {filteredRequests.map(request => {
                            const isExpanded = expandedId === request.id;
                            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                            const isUpdating = updatingId === request.id;

                            return (
                                <div
                                    key={request.id}
                                    className={`bg-white rounded-xl border transition-all ${request.status === 'pending'
                                            ? 'border-amber-200 shadow-sm'
                                            : 'border-cream-300'
                                        }`}
                                >
                                    {/* Summary Row */}
                                    <button
                                        onClick={() => {
                                            setExpandedId(isExpanded ? null : request.id);
                                            // Auto-mark as read when expanding a pending request
                                            if (!isExpanded && request.status === 'pending') {
                                                handleStatusChange(request.id, 'read');
                                            }
                                        }}
                                        className="w-full p-5 text-left"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Client Avatar */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${request.status === 'pending'
                                                    ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                                                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                                }`}>
                                                {request.client_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-medium text-charcoal-900">
                                                        {request.client_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                                            {statusConfig.icon}
                                                            {statusConfig.label}
                                                        </span>
                                                        <span className="text-xs text-charcoal-400">
                                                            {formatTimeAgo(request.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-charcoal-500 line-clamp-2 mt-1">
                                                    {request.message}
                                                </p>

                                                {request.search_query && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                            🔍 {request.search_query}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <ChevronDown className={`w-5 h-5 text-charcoal-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                                            {/* Full Message */}
                                            <div className="mb-4">
                                                <h4 className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide mb-2">
                                                    Mensaje completo
                                                </h4>
                                                <p className="text-sm text-charcoal-700 bg-gray-50 p-4 rounded-xl">
                                                    {request.message}
                                                </p>
                                            </div>

                                            {/* Contact Info */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                                                <a
                                                    href={`mailto:${request.client_email}`}
                                                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all group"
                                                >
                                                    <Mail className="w-4 h-4 text-charcoal-400 group-hover:text-blue-600" />
                                                    <span className="text-sm text-charcoal-700 group-hover:text-blue-700">{request.client_email}</span>
                                                </a>
                                                <a
                                                    href={`tel:${request.client_phone}`}
                                                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-green-50 hover:border-green-200 border border-transparent transition-all group"
                                                >
                                                    <Phone className="w-4 h-4 text-charcoal-400 group-hover:text-green-600" />
                                                    <span className="text-sm text-charcoal-700 group-hover:text-green-700">{request.client_phone}</span>
                                                </a>
                                            </div>

                                            {/* Action Buttons */}
                                            {request.status !== 'accepted' && request.status !== 'rejected' && (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleStatusChange(request.id, 'accepted')}
                                                        disabled={isUpdating}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isUpdating ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        )}
                                                        <span>Aceptar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(request.id, 'rejected')}
                                                        disabled={isUpdating}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        <span>Rechazar</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Status badge for already-handled requests */}
                                            {(request.status === 'accepted' || request.status === 'rejected') && (
                                                <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border ${statusConfig.color}`}>
                                                    {statusConfig.icon}
                                                    <span>Solicitud {statusConfig.label.toLowerCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
