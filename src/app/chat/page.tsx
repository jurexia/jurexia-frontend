'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, MapPin, Scale, Building2, HelpCircle, Settings, ChevronDown, BookOpen } from 'lucide-react';
import Link from 'next/link';
import ChatInput from '@/components/ChatInput';
import ChatMessage, { TypingIndicator } from '@/components/ChatMessage';
import DocumentModal from '@/components/DocumentModal';
import ChatSidebar from '@/components/ChatSidebar';
import VisualGuideOverlay from '@/components/VisualGuideOverlay';
import PromptGuide from '@/components/PromptGuide';
import StateSelectorModal from '@/components/StateSelectorModal';
import PdfViewerPanel from '@/components/PdfViewerPanel';
import { useChat } from '@/hooks/useChat';
import { UserAvatar } from '@/components/UserAvatar';
import { useRequireAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import { getEstadoLabel } from '@/lib/estados';
import {
    Conversation,
    getConversations,
    getConversation,
    deleteConversation,
    createConversation,
    addMessageToConversation,
    setActiveConversationId,
    generateTitle
} from '@/lib/conversations';

export default function ChatPage() {
    // Auth protection - redirects to login if not authenticated
    const { loading: authLoading, isAuthenticated, user, profile } = useRequireAuth();
    const router = useRouter();

    // Quota exceeded state
    const [quotaExceeded, setQuotaExceeded] = useState(false);

    const [selectedEstado, setSelectedEstado] = useState<string>('');
    const [showStateModal, setShowStateModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const estadoInitializedRef = useRef(false);
    const [showPromptGuide, setShowPromptGuide] = useState(false);
    const [showVisualGuide, setShowVisualGuide] = useState(false);
    const [selectedMateria, setSelectedMateria] = useState<string>('');  // '' = Auto
    const [showMateriaDropdown, setShowMateriaDropdown] = useState(false);
    const materiaDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedFuero, setSelectedFuero] = useState<string>('');  // '' = Todos
    const [activePdfSource, setActivePdfSource] = useState<{
        docId: string; origen: string; ref: string; texto: string;
        pdf_url?: string | null; silo?: string;
    } | null>(null);

    const MATERIAS = [
        { key: '', label: 'Automático' },
        { key: 'PENAL', label: 'Penal' },
        { key: 'CIVIL', label: 'Civil' },
        { key: 'FAMILIAR', label: 'Familiar' },
        { key: 'LABORAL', label: 'Laboral' },
        { key: 'MERCANTIL', label: 'Mercantil' },
        { key: 'ADMINISTRATIVO', label: 'Administrativo' },
        { key: 'FISCAL', label: 'Fiscal' },
        { key: 'AGRARIO', label: 'Agrario' },
        { key: 'CONSTITUCIONAL', label: 'Constitucional' },
    ];

    const FUEROS = [
        { key: '', label: 'Todos' },
        { key: 'constitucional', label: 'Constitucional' },
        { key: 'federal', label: 'Federal' },
        { key: 'estatal', label: 'Estatal' },
    ];

    // Close materia dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (materiaDropdownRef.current && !materiaDropdownRef.current.contains(event.target as Node)) {
                setShowMateriaDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Conversation history state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConvId] = useState<string | null>(null);
    const [conversationsLoading, setConversationsLoading] = useState(true);

    const handleQuotaExceeded = useCallback(() => {
        setQuotaExceeded(true);
    }, []);

    const { messages, isLoading, error, sendMessage, clearMessages, setMessages, retryMessage } = useChat({
        estado: selectedEstado || undefined,
        topK: 30,
        materia: selectedMateria || undefined,
        fuero: selectedFuero || undefined,
        onQuotaExceeded: handleQuotaExceeded,
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    // Query limits state
    const [queriesUsed, setQueriesUsed] = useState<number>(0);
    const [queriesLimit, setQueriesLimit] = useState<number>(3);
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Track if we should scroll - only scroll for new messages, not conversation switches
    const prevMessagesLengthRef = useRef(messages.length);

    // Sync query counts and estado from profile
    useEffect(() => {
        if (profile) {
            setQueriesUsed(profile.queries_used || 0);
            setQueriesLimit(profile.queries_limit || 3);

            // Initialize selectedEstado from profile (only once)
            if (!estadoInitializedRef.current) {
                estadoInitializedRef.current = true;
                if (profile.estado) {
                    setSelectedEstado(profile.estado);
                } else {
                    // No estado in profile → show selector modal
                    setShowStateModal(true);
                }
            }
        }
    }, [profile]);

    // Load conversations on mount — always start with a fresh blank chat
    useEffect(() => {
        if (authLoading || !isAuthenticated) return; // Don't load until auth is ready

        const loadConversations = async () => {
            setConversationsLoading(true);
            try {
                const loadedConversations = await getConversations();
                setConversations(loadedConversations);
                // Don't restore any previous conversation — start fresh
            } catch (err) {
                console.error('Error loading conversations:', err);
            } finally {
                setConversationsLoading(false);
            }
        };

        loadConversations();
    }, [setMessages, authLoading, isAuthenticated]);

    // Messages are now saved directly to database in addMessageToConversation
    // This effect only handles creating new conversations when needed
    useEffect(() => {
        const ensureConversation = async () => {
            if (messages.length > 0 && !activeConversationId) {
                // If no active conversation exists, create one automatically
                const newConv = await createConversation(selectedEstado || undefined);
                if (newConv) {
                    setActiveConvId(newConv.id);
                    const updatedConvs = await getConversations();
                    setConversations(updatedConvs);
                }
            }
        };

        ensureConversation();
    }, [messages.length, activeConversationId, selectedEstado]);

    // Auto-scroll to bottom only when NEW messages are added (not on conversation switch)
    useEffect(() => {
        // Only scroll if messages increased (new message added), not decreased or changed completely
        if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    // Track previous loading state for detecting when response completes
    const wasLoadingRef = useRef(false);

    // Save messages to database when assistant finishes responding
    // IMPORTANT: Save both user message and assistant response as atomic pair
    useEffect(() => {
        const saveMessagesAfterResponse = async () => {
            // Detect transition from loading=true to loading=false
            if (wasLoadingRef.current && !isLoading && activeConversationId && messages.length >= 2) {
                // Get the last two messages (user question + assistant response)
                const lastMessages = messages.slice(-2);
                const userMsg = lastMessages.find(m => m.role === 'user');
                const assistantMsg = lastMessages.find(m => m.role === 'assistant');

                // Save BOTH messages as atomic pair if we have both
                if (userMsg && assistantMsg && assistantMsg.content.trim().length > 0) {
                    // Save user message first
                    await addMessageToConversation(activeConversationId, userMsg);
                    // Then save assistant response
                    await addMessageToConversation(activeConversationId, assistantMsg);
                    // Refresh conversations to update title/timestamp
                    const updatedConvs = await getConversations();
                    setConversations(updatedConvs);
                }
            }
            wasLoadingRef.current = isLoading;
        };

        saveMessagesAfterResponse();
    }, [isLoading, activeConversationId, messages]);

    // Handle new conversation
    const handleNewConversation = useCallback(async () => {
        const newConv = await createConversation(selectedEstado || undefined);
        if (newConv) {
            setActiveConvId(newConv.id);
            clearMessages();
            const updatedConvs = await getConversations();
            setConversations(updatedConvs);
        }
    }, [selectedEstado, clearMessages]);

    // Handle select conversation
    const handleSelectConversation = useCallback(async (id: string) => {
        const conv = await getConversation(id);
        if (conv) {
            setActiveConvId(id);
            setActiveConversationId(id);
            setMessages(conv.messages);
            if (conv.estado) {
                setSelectedEstado(conv.estado);
            }
        }
    }, [setMessages]);

    // Handle delete conversation — always go to blank state after
    const handleDeleteConversation = useCallback(async (id: string) => {
        await deleteConversation(id);
        const remaining = await getConversations();
        setConversations(remaining);

        if (id === activeConversationId) {
            // Go to blank chat state
            setActiveConvId(null);
            setActiveConversationId(null);
            clearMessages();
        }
    }, [activeConversationId, clearMessages]);

    // Handle citation click
    const handleCitationClick = useCallback((source: { docId: string; origen: string; ref: string; texto: string; pdf_url?: string | null; silo?: string; entidad?: string | null }) => {
        setActivePdfSource(source);
    }, []);

    // Wrapped send function with limit check and increment
    // Optimized: fires sendMessage IMMEDIATELY, creates conversation in background
    const handleSendMessage = useCallback(async (content: string, enableReasoning = false) => {
        if (!user) return;

        // Check limit from local state (no network call)
        const remaining = queriesLimit - queriesUsed;
        if (remaining <= 0) {
            setShowLimitModal(true);
            return;
        }

        // 1) Fire the AI message IMMEDIATELY — no blocking I/O before this
        const sendPromise = sendMessage(content, enableReasoning);

        // 2) Optimistically increment the local counter
        setQueriesUsed(prev => prev + 1);

        // 3) Ensure conversation exists in the background (non-blocking)
        // DO NOT save user message here - it will be saved atomically with response in useEffect
        (async () => {
            try {
                let convId = activeConversationId;
                if (!convId) {
                    const newConv = await createConversation(selectedEstado || undefined);
                    if (newConv) {
                        convId = newConv.id;
                        setActiveConvId(convId);
                        setActiveConversationId(convId);
                    }
                }
            } catch (err) {
                console.error('Error creating conversation:', err);
            }
        })();

        // 4) Wait for the AI response to finish streaming
        await sendPromise;

        // 5) Quota consumption is now handled server-side by the backend's consume_query RPC
    }, [user, sendMessage, activeConversationId, selectedEstado, queriesLimit, queriesUsed]);

    const hasMessages = messages.length > 0;
    const selectedEstadoLabel = getEstadoLabel(selectedEstado);
    const queriesRemaining = Math.max(0, queriesLimit - queriesUsed);

    // While auth loads, render nothing (bg matches body, no flash)
    // useRequireAuth will redirect if not authenticated
    if (authLoading || !isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-cream-300">
            {/* Sidebar */}
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onToggleGuide={() => {
                    // If there's an active conversation with messages, start fresh so guide elements are visible
                    if (messages.length > 0) {
                        handleNewConversation();
                    }
                    setShowVisualGuide(true);
                }}
            />

            {/* Main Content - offset for fixed sidebar */}
            <div className="flex flex-col h-screen md:ml-72">
                {/* Header - Minimal, only shows counter and user */}
                <header className="fixed top-0 left-0 right-0 md:left-72 z-30 bg-cream-300/80 backdrop-blur-md border-b border-black/5 transition-all duration-300">
                    <div className="max-w-4xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-end gap-1 sm:gap-2">

                        {/* Normativa Nacional link button — desktop: text, mobile: icon only */}
                        <Link
                            href="/normativa"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                            title="Repositorio de Normativa Nacional"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Normativa</span>
                        </Link>

                        {/* Jurisdicción button — mobile: compact (icon+state only), desktop: full label */}
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 max-w-[120px] sm:max-w-none"
                            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #8B6914 100%)' }}
                            title={`Jurisdicción: ${selectedEstado ? selectedEstadoLabel : 'Todas'}`}
                        >
                            {/* Hide "Jurisdicción:" label on mobile */}
                            <span className="hidden sm:inline text-white/70">Jurisdicción:</span>
                            <span className="truncate">{selectedEstado ? selectedEstadoLabel : 'Todas'}</span>
                        </button>

                        {/* Fuero badge — mobile: icon only, desktop: icon + text */}
                        {selectedFuero && (
                            <button
                                onClick={() => setSelectedFuero('')}
                                className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium bg-accent-brown/10 text-accent-brown border border-accent-brown/20 hover:bg-accent-brown/20 transition-all duration-200"
                                title="Click para quitar filtro de fuero"
                            >
                                <Scale className="w-3 h-3 flex-shrink-0" />
                                <span className="hidden sm:inline">{FUEROS.find(f => f.key === selectedFuero)?.label}</span>
                                <span className="text-accent-brown/50">×</span>
                            </button>
                        )}

                        {hasMessages && activeConversationId && (
                            <button
                                onClick={async () => {
                                    if (activeConversationId) {
                                        await handleDeleteConversation(activeConversationId);
                                    }
                                }}
                                className="p-1.5 sm:p-2 hover:bg-black/5 rounded-lg transition-colors text-charcoal-600 hover:text-red-600 flex-shrink-0"
                                title="Eliminar conversación"
                            >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        )}

                        {/* Query Counter — mobile: numbers only, desktop: label + numbers */}
                        <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 bg-cream-100 rounded-lg text-xs font-medium flex-shrink-0">
                            <span className="hidden sm:inline text-charcoal-600">Consultas:</span>
                            <span className={queriesRemaining <= 1 ? 'text-red-600' : 'text-accent-brown'}>
                                {queriesRemaining}/{queriesLimit}
                            </span>
                        </div>
                        <div className="flex-shrink-0">
                            <UserAvatar />
                        </div>
                    </div>

                </header>



                {/* Main Content Area - Scrollable */}
                <main className="flex-1 pt-12 sm:pt-14 overflow-y-auto">
                    {!hasMessages ? (
                        // Empty State - Welcome Screen
                        <div className="h-full flex flex-col items-center justify-center px-4 -mt-8">
                            <div className="max-w-2xl w-full text-center">
                                <div className="mb-4">
                                    <span className="font-serif text-5xl font-semibold text-charcoal-900">
                                        Iurex<span className="text-accent-gold">ia</span>
                                    </span>
                                </div>
                                <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-3">
                                    ¿En qué te puedo ayudar?
                                </h2>
                                <p className="text-charcoal-600 text-sm mb-4">
                                    Consulta leyes, analiza documentos o busca jurisprudencia en la normativa mexicana.
                                </p>

                                {/* Materia Selector — Centered */}
                                <div className="mb-6 flex justify-center" data-guide="jurisdiction" ref={materiaDropdownRef}>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowMateriaDropdown(!showMateriaDropdown)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-charcoal-800 hover:bg-charcoal-900 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
                                        >
                                            <span className="text-white/60 text-xs">Materia:</span>
                                            <span>{selectedMateria ? MATERIAS.find(m => m.key === selectedMateria)?.label : 'Automático'}</span>
                                            <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${showMateriaDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showMateriaDropdown && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-charcoal-800 rounded-xl shadow-xl border border-white/10 py-1 z-50">
                                                {MATERIAS.map((m) => (
                                                    <button
                                                        key={m.key}
                                                        onClick={() => {
                                                            setSelectedMateria(m.key);
                                                            setShowMateriaDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm transition-colors duration-100 ${selectedMateria === m.key
                                                            ? 'text-accent-gold bg-white/10 font-medium'
                                                            : 'text-white/80 hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Fuero Selector — Pill Buttons */}
                                <div className="mb-6 flex justify-center">
                                    <div className="inline-flex items-center gap-1 p-1 bg-charcoal-800/50 rounded-xl">
                                        {FUEROS.map((f) => (
                                            <button
                                                key={f.key}
                                                onClick={() => setSelectedFuero(f.key)}
                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${selectedFuero === f.key
                                                    ? 'bg-accent-brown text-white shadow-sm'
                                                    : 'text-charcoal-500 hover:text-charcoal-800 hover:bg-charcoal-100'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Inline Chat Input */}
                                <div className="mb-4">
                                    <ChatInput
                                        onSubmit={handleSendMessage}
                                        isLoading={isLoading}
                                        placeholder="Escribe tu consulta legal..."
                                        estado={selectedEstado || undefined}
                                    />
                                </div>

                                {/* Disclaimer below input */}
                                <div className="max-w-md mx-auto text-center">
                                    <p className="text-xs text-charcoal-400 mb-1">
                                        Iurexia minimiza al máximo las alucinaciones mediante verificación con fuentes.
                                    </p>
                                    <p className="text-xs text-charcoal-500 font-medium mb-2">
                                        Mejor pregunta = mejor resultado.
                                    </p>
                                    <button
                                        onClick={() => setShowPromptGuide(true)}
                                        className="inline-flex items-center gap-1 text-xs text-accent-brown hover:text-accent-gold transition-colors font-medium"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        ¿Cómo hacer mejores consultas?
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Messages Container
                        <div className="max-w-3xl mx-auto px-4 py-6 pb-64 space-y-4">


                            {messages.map((message, index) => (
                                <ChatMessage
                                    key={index}
                                    message={message}
                                    isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                                    onCitationClick={handleCitationClick}
                                />
                            ))}

                            {/* Typing indicator when loading and waiting for assistant response */}
                            {isLoading && messages[messages.length - 1]?.role === 'user' && (
                                <TypingIndicator retryMessage={retryMessage || undefined} />
                            )}

                            {/* Error display */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    <strong>Error:</strong> {error}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </main>

                {/* Fixed Input at Bottom - Only when there are messages */}
                {hasMessages && (
                    <div className="fixed bottom-0 left-0 right-0 md:left-72 bg-gradient-to-t from-cream-300 via-cream-300 to-transparent pt-8 pb-6 px-4 transition-all duration-300">
                        {/* Chat Input */}
                        <ChatInput
                            onSubmit={handleSendMessage}
                            isLoading={isLoading}
                            placeholder="Escribe tu siguiente pregunta..."
                            estado={selectedEstado || undefined}
                        />
                    </div>
                )}

                {/* Document Modal */}
                <DocumentModal
                    docId={selectedDocId}
                    onClose={() => setSelectedDocId(null)}
                />

                {/* Prompt Guide Modal */}
                <PromptGuide
                    isOpen={showPromptGuide}
                    onClose={() => setShowPromptGuide(false)}
                />

                {/* Visual Guide Overlay */}
                <VisualGuideOverlay
                    isOpen={showVisualGuide}
                    onClose={() => setShowVisualGuide(false)}
                />
            </div>

            {/* State Selector Modal — shown when profile.estado is null (first login) */}
            {showStateModal && user && (
                <StateSelectorModal
                    userId={user.id}
                    onSelectEstado={(estado) => {
                        setSelectedEstado(estado);
                        setShowStateModal(false);
                    }}
                />
            )}

            {/* Config Modal — change default state */}
            {showConfigModal && user && (
                <StateSelectorModal
                    userId={user.id}
                    isConfig={true}
                    currentEstado={selectedEstado}
                    onClose={() => setShowConfigModal(false)}
                    onSelectEstado={(estado) => {
                        setSelectedEstado(estado);
                        setShowConfigModal(false);
                    }}
                />
            )}

            {/* Limit Reached Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md mx-4 p-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Scale className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-serif font-semibold text-charcoal-900 mb-2">
                                Límite de consultas alcanzado
                            </h3>
                            <p className="text-charcoal-600 mb-6">
                                Has utilizado todas tus consultas gratuitas este mes.
                                Actualiza tu plan para continuar usando Iurexia.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowLimitModal(false)}
                                    className="px-4 py-2 rounded-lg border border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50 transition-colors"
                                >
                                    Cerrar
                                </button>
                                <Link
                                    href="/precios"
                                    className="px-4 py-2 rounded-lg bg-accent-brown text-white hover:bg-accent-brown/90 transition-colors"
                                >
                                    Ver planes
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Quota Exceeded Modal ══ */}
            {quotaExceeded && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-charcoal-800 border border-charcoal-600 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                <Scale className="w-8 h-8 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-white mb-2">
                                Consultas agotadas
                            </h3>
                            <p className="text-charcoal-300 mb-2">
                                Has utilizado todas tus consultas de este mes
                                ({profile?.queries_used}/{profile?.queries_limit}).
                            </p>
                            <p className="text-charcoal-400 text-sm mb-6">
                                Tu cuota se renovará automáticamente cuando se procese tu próximo pago en Stripe.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setQuotaExceeded(false)}
                                    className="px-4 py-2 rounded-lg bg-charcoal-700 text-charcoal-300 hover:bg-charcoal-600 transition-colors"
                                >
                                    Cerrar
                                </button>
                                <Link
                                    href="/precios"
                                    className="px-4 py-2 rounded-lg bg-accent-brown text-white hover:bg-accent-brown/90 transition-colors"
                                >
                                    Mejorar plan
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Citation Source Viewer (from CITATION_META click) ══ */}
            <PdfViewerPanel
                isOpen={activePdfSource !== null}
                onClose={() => setActivePdfSource(null)}
                source={activePdfSource}
            />
        </div>
    );
}
