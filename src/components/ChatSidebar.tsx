'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    MessageSquarePlus,
    Trash2,
    PanelLeftClose,
    PanelLeftOpen,
    ChevronRight,
    MessageCircle,
    Menu,
    X,
    Home,
    BookOpen,
    FileText,
    Search
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

const GRUPOS = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Anteriores'] as const;

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

function ChatSidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    onToggleGuide
}: ChatSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [filtro, setFiltro] = useState('');
    // El borrado es inmediato y definitivo, y en pantallas táctiles el bote
    // ya es visible: se pide confirmación en la propia fila.
    const [porEliminar, setPorEliminar] = useState<string | null>(null);
    const { user, profile } = useAuth();
    const userIsAdmin = isAdmin(user?.email);
    const canAccessRedactor = userIsAdmin || profile?.subscription_type === 'ultra_secretarios' || profile?.can_access_sentencia === true;

    // El estado de colapso vive en localStorage y se publica como variable CSS
    // (--sidebar-w) para que el encabezado, el pie y el área de mensajes del
    // chat se recorran con la barra en lugar de dejar un hueco vacío.
    useEffect(() => {
        try {
            if (localStorage.getItem('iurexia-sidebar-colapsada') === '1') setIsCollapsed(true);
        } catch { }
    }, []);

    useEffect(() => {
        try { localStorage.setItem('iurexia-sidebar-colapsada', isCollapsed ? '1' : '0'); } catch { }
        const raiz = document.documentElement;
        raiz.style.setProperty('--sidebar-w', isCollapsed ? '4.5rem' : '18rem');
        return () => { raiz.style.setProperty('--sidebar-w', '18rem'); };
    }, [isCollapsed]);

    // Cerrar el cajón móvil con Escape.
    useEffect(() => {
        if (!isMobileOpen) return;
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileOpen(false); };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [isMobileOpen]);

    const grupos = useMemo(() => {
        const termino = filtro.trim().toLowerCase();
        const lista = termino
            ? conversations.filter(c => (c.title || '').toLowerCase().includes(termino))
            : conversations;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);
        const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
        const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

        const cubos: { label: string; convs: Conversation[] }[] = GRUPOS.map(label => ({ label, convs: [] }));

        for (const conv of lista) {
            const d = new Date(conv.updatedAt);
            if (d >= todayStart) cubos[0].convs.push(conv);
            else if (d >= yesterdayStart) cubos[1].convs.push(conv);
            else if (d >= weekStart) cubos[2].convs.push(conv);
            else if (d >= monthStart) cubos[3].convs.push(conv);
            else cubos[4].convs.push(conv);
        }

        return cubos.filter(g => g.convs.length > 0);
    }, [conversations, filtro]);

    const totalFiltrado = grupos.reduce((n, g) => n + g.convs.length, 0);

    /* ──────────────────────────────────────────────────────────────
       IMPORTANTE (6-ago-2026): esto es JSX, NO un componente.
       Antes era `const SidebarContent = () => (...)` declarado dentro
       del cuerpo de ChatSidebar y usado como <SidebarContent />. React
       veía un tipo de componente NUEVO en cada render del padre, así que
       desmontaba y volvía a montar toda la barra: el scroll regresaba a
       cero y los clics se perdían entre mousedown y mouseup (de ahí el
       "hay que hacer clic tres veces"). Mantener esto como elemento
       plano conserva el DOM y, con él, la posición de scroll.
       ────────────────────────────────────────────────────────────── */
    const contenido = (
        <div className="flex flex-col h-full min-h-0">
            {/* ── Marca ── */}
            <div className="px-4 pt-4 pb-3">
                <Link href="/" className="block text-center" title="Ir al inicio">
                    {!isCollapsed ? (
                        <span
                            className="text-xl font-semibold text-white transition-opacity hover:opacity-80"
                            style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600 }}
                        >
                            Iurex<span style={{ color: '#c9a962' }}>ia</span>
                        </span>
                    ) : (
                        <Home className="w-4 h-4 mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }} />
                    )}
                </Link>
            </div>

            {/* ── Nueva consulta ── */}
            <div className="px-3 pb-3">
                <button
                    type="button"
                    onClick={() => { onNewConversation(); setIsMobileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-shadow duration-200 ${isCollapsed ? 'justify-center' : ''}`}
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

            {/* ── Encabezado del historial ── */}
            <div className="px-3 pb-2">
                <div className="flex items-center justify-between gap-2 px-1">
                    {!isCollapsed && (
                        <span
                            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'rgba(201, 169, 98, 0.65)' }}
                        >
                            Historial
                            <span className="ml-1.5 font-normal tracking-normal" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                {conversations.length}
                            </span>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(v => !v)}
                        className="p-1.5 rounded-lg transition-colors hidden md:flex ml-auto"
                        title={isCollapsed ? 'Expandir historial' : 'Contraer historial'}
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                    {/* Cerrar en móvil */}
                    <button
                        type="button"
                        onClick={() => setIsMobileOpen(false)}
                        className="p-1.5 rounded-lg transition-colors md:hidden"
                        title="Cerrar"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Buscador: aparece cuando el historial ya es largo */}
                {!isCollapsed && conversations.length > 6 && (
                    <div className="relative mt-2">
                        <Search
                            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        />
                        <input
                            value={filtro}
                            onChange={e => setFiltro(e.target.value)}
                            placeholder="Buscar conversación"
                            className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs outline-none transition-colors"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(201, 169, 98, 0.14)',
                                color: 'rgba(255,255,255,0.85)',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201, 169, 98, 0.45)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201, 169, 98, 0.14)')}
                        />
                        {filtro && (
                            <button
                                type="button"
                                onClick={() => setFiltro('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
                                title="Limpiar"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Lista de conversaciones ── */}
            <div className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-4">
                {totalFiltrado === 0 ? (
                    <div className="text-center py-10 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {!isCollapsed && (
                            <>
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>{filtro ? 'Sin coincidencias' : 'Sin conversaciones'}</p>
                                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    {filtro ? 'Prueba con otra palabra' : 'Inicia una nueva consulta'}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    grupos.map(group => (
                        <div key={group.label} className="mb-1">
                            {!isCollapsed && (
                                <p
                                    className="sticky top-0 z-10 text-[9px] font-semibold uppercase tracking-[0.16em] px-2 py-1.5 backdrop-blur-sm"
                                    style={{
                                        color: 'rgba(201, 169, 98, 0.5)',
                                        background: 'linear-gradient(180deg, rgba(26,26,26,0.96) 60%, rgba(26,26,26,0))',
                                    }}
                                >
                                    {group.label}
                                </p>
                            )}
                            <div className="space-y-1">
                                {group.convs.map(conv => {
                                    const isActive = activeConversationId === conv.id;
                                    return (
                                        <div
                                            key={conv.id}
                                            className="group relative rounded-xl transition-colors duration-150"
                                            style={{
                                                background: isActive ? 'rgba(201, 169, 98, 0.13)' : 'transparent',
                                                border: isActive
                                                    ? '1px solid rgba(201, 169, 98, 0.35)'
                                                    : '1px solid transparent',
                                            }}
                                            onMouseEnter={e => {
                                                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.055)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isActive) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {isActive && (
                                                <span
                                                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                                                    style={{ background: '#c9a962' }}
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => { onSelectConversation(conv.id); setIsMobileOpen(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-xl ${isCollapsed ? 'flex justify-center' : ''}`}
                                                title={conv.title}
                                            >
                                                {isCollapsed ? (
                                                    <MessageCircle
                                                        className="w-4 h-4"
                                                        style={{ color: isActive ? '#c9a962' : 'rgba(255,255,255,0.4)' }}
                                                    />
                                                ) : (
                                                    <>
                                                        <p
                                                            className="text-[0.8125rem] font-medium truncate pr-6 leading-snug"
                                                            style={{ color: isActive ? '#e8dcc8' : 'rgba(255,255,255,0.78)' }}
                                                        >
                                                            {conv.title}
                                                        </p>
                                                        <p
                                                            className="text-[0.6875rem] mt-1"
                                                            style={{ color: isActive ? 'rgba(201, 169, 98, 0.75)' : 'rgba(255,255,255,0.3)' }}
                                                        >
                                                            {formatDate(conv.updatedAt)} · {conv.messageCount ?? conv.messages.length} mensajes
                                                        </p>
                                                    </>
                                                )}
                                            </button>

                                            {!isCollapsed && porEliminar !== conv.id && (
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); setPorEliminar(conv.id); }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                                                               transition-opacity opacity-0 group-hover:opacity-100
                                                               focus:opacity-100 max-md:opacity-60"
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

                                            {!isCollapsed && porEliminar === conv.id && (
                                                <div
                                                    className="absolute inset-0 flex items-center justify-end gap-1.5 pr-2 rounded-xl"
                                                    style={{ background: 'rgba(26,26,26,0.94)' }}
                                                >
                                                    <span className="mr-auto pl-3 text-[0.6875rem]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                                        ¿Eliminar?
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setPorEliminar(null); }}
                                                        className="px-2 py-1 rounded-lg text-[0.6875rem] font-medium"
                                                        style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.07)' }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setPorEliminar(null);
                                                            onDeleteConversation(conv.id);
                                                        }}
                                                        className="px-2 py-1 rounded-lg text-[0.6875rem] font-semibold"
                                                        style={{ color: '#ff6b6b', background: 'rgba(255,80,80,0.15)' }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Pie: guías ── */}
            {!isCollapsed && (
                <div
                    className="p-3 flex-shrink-0"
                    style={{
                        borderTop: '1px solid rgba(201, 169, 98, 0.12)',
                        background: 'rgba(0,0,0,0.18)',
                    }}
                >
                    <a
                        href="/guia-pro/Guia_Iurexia_Pro.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-3 py-2 mb-2 rounded-xl transition-colors duration-200 group"
                        style={{
                            background: 'rgba(201, 169, 98, 0.08)',
                            border: '1px solid rgba(201, 169, 98, 0.25)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201, 169, 98, 0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201, 169, 98, 0.08)')}
                    >
                        <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" style={{ color: '#c9a962' }} />
                            <span className="text-[0.8125rem] font-medium" style={{ color: '#c9a962' }}>
                                Guía completa de uso
                            </span>
                        </span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(201, 169, 98, 0.6)' }} />
                    </a>
                    <button
                        type="button"
                        onClick={() => { onToggleGuide?.(); setIsMobileOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors duration-200 group animate-shine-gold"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(201, 169, 98, 0.15)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    >
                        <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" style={{ color: '#c9a962' }} />
                            <span className="text-[0.8125rem] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                Guía rápida de uso
                            </span>
                        </span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </button>
                    <p className="text-[10px] leading-relaxed mt-2 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)' }} className="font-medium">Nota:</span> Iurexia orienta y fortalece el análisis legal; no sustituye la asesoría profesional.
                    </p>
                </div>
            )}
        </div>
    );

    const fondo = 'linear-gradient(180deg, #1a1a1a 0%, #222222 50%, #1a1a1a 100%)';

    return (
        <>
            {/* Botón de menú en móvil */}
            <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-3 left-3 z-40 p-2 rounded-xl shadow-lg md:hidden"
                title="Abrir historial"
                style={{ backgroundColor: '#1a1a1a', color: '#c9a962', border: '1px solid rgba(201,169,98,0.25)' }}
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Velo en móvil */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Barra de escritorio */}
            <aside
                className="hidden md:flex flex-col transition-[width] duration-300 fixed top-0 left-0 h-screen z-40"
                style={{
                    width: isCollapsed ? '4.5rem' : '18rem',
                    background: fondo,
                    borderRight: '1px solid rgba(201, 169, 98, 0.1)',
                }}
            >
                {contenido}
            </aside>

            {/* Cajón en móvil */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: fondo, borderRight: '1px solid rgba(201, 169, 98, 0.1)' }}
            >
                {contenido}
            </aside>
        </>
    );
}

export default memo(ChatSidebar);
