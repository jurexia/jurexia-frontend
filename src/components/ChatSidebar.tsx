'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    MessageSquarePlus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    Menu,
    X,
    Home,
    BookOpen,
    FileText
} from 'lucide-react';
import { Conversation } from '@/lib/conversations';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    onToggleGuide?: () => void;
}

export default function ChatSidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    onToggleGuide
}: ChatSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user, profile } = useAuth();
    const userIsAdmin = isAdmin(user?.email);
    const canAccessRedactor = userIsAdmin || profile?.subscription_type === 'ultra_secretarios' || profile?.can_access_sentencia === true;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    };

    // Group conversations by date category for better navigation
    const groupConversations = (convs: Conversation[]) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);
        const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
        const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

        const groups: { label: string; convs: Conversation[] }[] = [
            { label: 'Hoy', convs: [] },
            { label: 'Ayer', convs: [] },
            { label: 'Esta semana', convs: [] },
            { label: 'Este mes', convs: [] },
            { label: 'Anteriores', convs: [] },
        ];

        for (const conv of convs) {
            const d = new Date(conv.updatedAt);
            if (d >= todayStart) groups[0].convs.push(conv);
            else if (d >= yesterdayStart) groups[1].convs.push(conv);
            else if (d >= weekStart) groups[2].convs.push(conv);
            else if (d >= monthStart) groups[3].convs.push(conv);
            else groups[4].convs.push(conv);
        }

        return groups.filter(g => g.convs.length > 0);
    };

    const groupedConversations = groupConversations(conversations);

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* ── Brand Header ── */}
            <div className="p-4" style={{ borderBottom: '1px solid rgba(201, 169, 98, 0.15)' }}>
                {/* Brand Name - Links to Home */}
                <Link
                    href="/"
                    className={`block transition-colors ${isCollapsed ? 'text-center' : 'text-center'}`}
                    title="Ir al inicio"
                >
                    {!isCollapsed ? (
                        <span className="font-serif text-xl font-semibold text-white hover:opacity-80 transition-opacity">
                            Iurex<span style={{ color: '#c9a962' }}>ia</span>
                        </span>
                    ) : (
                        <Home className="w-4 h-4 mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }} />
                    )}
                </Link>
            </div>

            {/* ── Historial Header + Collapse ── */}
            <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <div>
                            <span
                                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                                style={{ color: 'rgba(201, 169, 98, 0.6)' }}
                            >
                                Historial
                            </span>
                            <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 rounded-lg transition-colors hidden md:flex"
                        title={isCollapsed ? 'Expandir' : 'Colapsar'}
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                    {/* Mobile close */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 rounded-lg transition-colors md:hidden"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── New Conversation Button ── */}
            <div className="px-3 pb-3">
                <button
                    onClick={() => {
                        onNewConversation();
                        setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                    title="Nueva conversación"
                    style={{
                        background: 'linear-gradient(135deg, #c9a962 0%, #8b7355 100%)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(201, 169, 98, 0.25)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(201, 169, 98, 0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(201, 169, 98, 0.25)')}
                >
                    <MessageSquarePlus className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>Nueva consulta</span>}
                </button>
            </div>

            {/* ── Conversations List ── */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
                {conversations.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {!isCollapsed && (
                            <>
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Sin conversaciones</p>
                                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    Inicia una nueva consulta
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {groupedConversations.map((group) => (
                            <div key={group.label}>
                                {/* Date group header */}
                                {!isCollapsed && (
                                    <p
                                        className="text-[9px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1"
                                        style={{ color: 'rgba(201, 169, 98, 0.4)' }}
                                    >
                                        {group.label}
                                    </p>
                                )}
                                <div className="space-y-0.5">
                        {group.convs.map((conv) => {
                            const isActive = activeConversationId === conv.id;
                            return (
                                <div
                                    key={conv.id}
                                    className="group relative rounded-lg transition-all duration-200 cursor-pointer"
                                    style={{
                                        background: isActive
                                            ? 'rgba(201, 169, 98, 0.12)'
                                            : 'transparent',
                                        borderLeft: isActive
                                            ? '3px solid #c9a962'
                                            : '3px solid transparent',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            onSelectConversation(conv.id);
                                            setIsMobileOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 ${isCollapsed ? 'flex justify-center' : ''}`}
                                    >
                                        {isCollapsed ? (
                                            <MessageCircle
                                                className="w-4 h-4"
                                                style={{ color: isActive ? '#c9a962' : 'rgba(255,255,255,0.4)' }}
                                            />
                                        ) : (
                                            <>
                                                <p
                                                    className="text-sm font-medium truncate pr-6"
                                                    style={{ color: isActive ? '#e8dcc8' : 'rgba(255,255,255,0.75)' }}
                                                >
                                                    {conv.title}
                                                </p>
                                                <p
                                                    className="text-xs mt-0.5"
                                                    style={{ color: isActive ? 'rgba(201, 169, 98, 0.7)' : 'rgba(255,255,255,0.3)' }}
                                                >
                                                    {formatDate(conv.updatedAt)} · {conv.messageCount ?? conv.messages.length} mensajes
                                                </p>
                                            </>
                                        )}
                                    </button>

                                    {/* Delete button */}
                                    {!isCollapsed && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteConversation(conv.id);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 
                                                     opacity-0 group-hover:opacity-100 rounded transition-all"
                                            title="Eliminar conversación"
                                            style={{ color: 'rgba(255,120,120,0.7)' }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255,80,80,0.15)';
                                                e.currentTarget.style.color = '#ff6b6b';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'rgba(255,120,120,0.7)';
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {/* ── Quick Guide Footer ── */}
            {!isCollapsed && (
                <div
                    className="p-3"
                    style={{
                        borderTop: '1px solid rgba(201, 169, 98, 0.12)',
                        background: 'rgba(0,0,0,0.15)',
                    }}
                >
                    <a
                        href="/guia-pro/Guia_Iurexia_Pro.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-4 py-2.5 mb-2
                                 rounded-lg transition-all duration-200 group"
                        style={{
                            background: 'rgba(201, 169, 98, 0.08)',
                            border: '1px solid rgba(201, 169, 98, 0.25)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201, 169, 98, 0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201, 169, 98, 0.08)')}
                    >
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" style={{ color: '#c9a962' }} />
                            <span className="text-sm font-medium" style={{ color: '#c9a962' }}>
                                Guía completa de uso
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'rgba(201, 169, 98, 0.6)' }} />
                    </a>
                    <button
                        onClick={() => {
                            onToggleGuide?.();
                            setIsMobileOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5
                                 rounded-lg transition-all duration-200 group animate-shine-gold"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(201, 169, 98, 0.15)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    >
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" style={{ color: '#c9a962' }} />
                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                Guía rápida de uso
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </button>
                    {/* Responsible Use Disclaimer */}
                    <p className="text-[10px] leading-relaxed mt-2 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)' }} className="font-medium">Nota:</span> Iurexia orienta y fortalece el análisis legal; no sustituye la asesoría profesional.
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 left-4 z-40 p-2 rounded-lg shadow-lg md:hidden"
                style={{ backgroundColor: '#1a1a1a', color: '#c9a962' }}
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar - Desktop */}
            <aside
                className={`hidden md:flex flex-col transition-all duration-300 fixed top-0 left-0 h-screen z-40 ${isCollapsed ? 'w-16' : 'w-72'}`}
                style={{
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #222222 50%, #1a1a1a 100%)',
                    borderRight: '1px solid rgba(201, 169, 98, 0.1)',
                }}
            >
                <SidebarContent />
            </aside>

            {/* Sidebar - Mobile (Drawer) */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #222222 50%, #1a1a1a 100%)',
                    borderRight: '1px solid rgba(201, 169, 98, 0.1)',
                }}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
