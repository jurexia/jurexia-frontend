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
    X
} from 'lucide-react';
import { Conversation } from '@/lib/conversations';

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
            {/* Home Button with Logo */}
            <div className="p-4 border-b border-cream-300">
                <Link
                    href="/"
                    className={`flex items-center gap-2 p-2 -m-2 hover:bg-cream-300 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    title="Ir al inicio"
                >
                    <Image
                        src="/logo-iurexia.png"
                        alt="Iurexia"
                        width={32}
                        height={32}
                        className="flex-shrink-0"
                    />
                    {!isCollapsed && (
                        <span className="font-serif text-lg font-semibold text-charcoal-900">
                            Iurex<span className="text-accent-gold">ia</span>
                        </span>
                    )}
                </Link>
            </div>

            {/* Header with Historial title */}
            <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">
                            Historial
                        </span>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 hover:bg-cream-300 rounded-lg transition-colors hidden md:flex"
                        title={isCollapsed ? 'Expandir' : 'Colapsar'}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-charcoal-600" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 text-charcoal-600" />
                        )}
                    </button>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 hover:bg-cream-300 rounded-lg transition-colors md:hidden"
                    >
                        <X className="w-4 h-4 text-charcoal-600" />
                    </button>
                </div>
            </div>

            {/* New Conversation Button */}
            <div className="p-3">
                <button
                    onClick={() => {
                        onNewConversation();
                        setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 bg-accent-brown text-white 
                              rounded-lg hover:bg-accent-brown/90 transition-colors font-medium
                              ${isCollapsed ? 'justify-center' : ''}`}
                    title="Nueva conversación"
                >
                    <MessageSquarePlus className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>Nueva consulta</span>}
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
                {conversations.length === 0 ? (
                    <div className="text-center py-8 text-charcoal-500 text-sm">
                        {!isCollapsed && (
                            <>
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Sin conversaciones</p>
                                <p className="text-xs mt-1">Inicia una nueva consulta</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`group relative rounded-lg transition-all cursor-pointer
                                          ${activeConversationId === conv.id
                                        ? 'bg-accent-brown/10 border border-accent-brown/30'
                                        : 'hover:bg-cream-200'
                                    }`}
                            >
                                <button
                                    onClick={() => {
                                        onSelectConversation(conv.id);
                                        setIsMobileOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 ${isCollapsed ? 'flex justify-center' : ''}`}
                                    title={conv.title}
                                >
                                    {isCollapsed ? (
                                        <MessageCircle className="w-4 h-4 text-charcoal-600" />
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-charcoal-800 truncate pr-6">
                                                {conv.title}
                                            </p>
                                            <p className="text-xs text-charcoal-500 mt-0.5">
                                                {formatDate(conv.updatedAt)} · {conv.messages.length} mensajes
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
                                                 opacity-0 group-hover:opacity-100 hover:bg-red-100 
                                                 rounded transition-all"
                                        title="Eliminar conversación"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 left-4 z-40 p-2 bg-cream-200 rounded-lg shadow-md md:hidden"
            >
                <Menu className="w-5 h-5 text-charcoal-700" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar - Desktop */}
            <aside
                className={`hidden md:flex flex-col bg-cream-100 border-r border-cream-300 
                          transition-all duration-300 fixed top-0 left-0 h-screen z-40
                          ${isCollapsed ? 'w-16' : 'w-72'}`}
            >
                <SidebarContent />
            </aside>

            {/* Sidebar - Mobile (Drawer) */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-cream-100 border-r border-cream-300 
                          z-50 transform transition-transform duration-300 md:hidden
                          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
