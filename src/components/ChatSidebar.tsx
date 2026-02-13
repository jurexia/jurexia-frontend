'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    MessageSquarePlus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    Menu,
    X,
    Home,
    BookOpen
} from 'lucide-react';
import { Conversation } from '@/lib/conversations';
import QuickGuide from '@/components/QuickGuide';

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
}

export default function ChatSidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation
}: ChatSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* ── Brand Header ── */}
            <div className="p-4" style={{ borderBottom: '1px solid rgba(201, 169, 98, 0.15)' }}>
                {/* Back to Home */}
                <Link
                    href="/"
                    className={`flex items-center gap-2 mb-3 text-xs font-medium uppercase tracking-wider transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    title="Ir al inicio"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#c9a962')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                >
                    <Home className="w-3.5 h-3.5 flex-shrink-0" />
                    {!isCollapsed && <span>Inicio</span>}
                </Link>

                {/* Iurexia Logo */}
                <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                    <Image
                        src="/logo-iurexia.png"
                        alt="Iurexia"
                        width={36}
                        height={36}
                        className="flex-shrink-0"
                        style={{ filter: 'brightness(1.1)' }}
                    />
                    {!isCollapsed && (
                        <span className="font-serif text-xl font-semibold text-white">
                            Iurex<span style={{ color: '#c9a962' }}>ia</span>
                        </span>
                    )}
                </div>
            </div>

            {/* ── Historial Header + Collapse ── */}
            <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <span
                            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                            style={{ color: 'rgba(201, 169, 98, 0.6)' }}
                        >
                            Historial
                        </span>
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
                    <div className="space-y-0.5">
                        {conversations.map((conv) => {
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
                    <QuickGuide />
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
