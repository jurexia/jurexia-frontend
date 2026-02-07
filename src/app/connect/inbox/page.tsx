'use client';

import { useState, useEffect } from 'react';
import { Inbox, MessageSquare, Clock, MapPin, Scale, ArrowLeft, User, Loader2, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/UserAvatar';

interface ChatRoom {
    id: string;
    client_id: string;
    lawyer_id: string;
    dossier_summary: Record<string, unknown>;
    status: string;
    created_at: string;
    updated_at: string;
}

interface RoomWithPreview extends ChatRoom {
    last_message?: string;
    last_message_at?: string;
    client_name?: string;
}

export default function ConnectInboxPage() {
    const { user, profile, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<RoomWithPreview[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [lawyerProfile, setLawyerProfile] = useState<any>(null);

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
            loadChatRooms(user.id);
        } else {
            // Not a lawyer — redirect to profile
            router.push('/perfil');
        }
    };

    const loadChatRooms = async (lawyerId: string) => {
        setLoadingRooms(true);

        try {
            const { data: roomsData, error } = await supabase
                .from('connect_chat_rooms')
                .select('*')
                .eq('lawyer_id', lawyerId)
                .order('updated_at', { ascending: false });

            if (roomsData && !error) {
                // Enrich with last message preview
                const enriched: RoomWithPreview[] = [];

                for (const room of roomsData) {
                    const { data: lastMsg } = await supabase
                        .from('connect_messages')
                        .select('content, created_at')
                        .eq('room_id', room.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    enriched.push({
                        ...room,
                        last_message: lastMsg?.content,
                        last_message_at: lastMsg?.created_at,
                    });
                }

                setRooms(enriched);
            }
        } catch (err) {
            console.error('Error loading rooms:', err);
        } finally {
            setLoadingRooms(false);
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-serif text-3xl font-medium text-charcoal-900 flex items-center gap-3">
                            <Inbox className="w-8 h-8 text-blue-600" />
                            Bandeja de Solicitudes
                        </h1>
                        <p className="text-sm text-charcoal-500 mt-1">
                            Solicitudes de asesoría de usuarios en tu zona
                        </p>
                    </div>

                    {lawyerProfile && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                            <BadgeCheck className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">Verificado</span>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loadingRooms && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-charcoal-300 animate-spin mb-4" />
                        <p className="text-charcoal-500">Cargando solicitudes...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loadingRooms && rooms.length === 0 && (
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
                                <span>{lawyerProfile?.office_address?.estado?.replace(/_/g, ' ') || 'Sin ubicación'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Rooms List */}
                {!loadingRooms && rooms.length > 0 && (
                    <div className="space-y-3">
                        {rooms.map(room => (
                            <div
                                key={room.id}
                                className="bg-white rounded-xl border border-cream-300 p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Client Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                        <User className="w-6 h-6" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-charcoal-900">
                                                Cliente #{room.client_id.slice(0, 8)}
                                            </h3>
                                            <span className="text-xs text-charcoal-400">
                                                {formatTimeAgo(room.updated_at)}
                                            </span>
                                        </div>

                                        {/* Last message preview */}
                                        {room.last_message ? (
                                            <p className="text-sm text-charcoal-500 truncate mt-1">
                                                {room.last_message}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-charcoal-400 italic mt-1">
                                                Solicitud nueva — sin mensajes
                                            </p>
                                        )}

                                        {/* Dossier hint */}
                                        {room.dossier_summary && Object.keys(room.dossier_summary).length > 0 && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    📋 Expediente IA disponible
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${room.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                                        }`} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
