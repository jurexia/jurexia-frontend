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

    // States
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    const [selectedEstado, setSelectedEstado] = useState<string>('');
    const [showStateModal, setShowStateModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const estadoInitializedRef = useRef(false);
    const [showPromptGuide, setShowPromptGuide] = useState(false);
    const [showVisualGuide, setShowVisualGuide] = useState(false);
    const [selectedMateria, setSelectedMateria] = useState<string>('');
    const [showMateriaDropdown, setShowMateriaDropdown] = useState(false);
    const materiaDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedFuero, setSelectedFuero] = useState<string>('');
    const [activePdfSource, setActivePdfSource] = useState<{
        docId: string; origen: string; ref: string; texto: string;
        pdf_url?: string | null; silo?: string;
    } | null>(null);

    // Genio Juridico states
    const [enableGenioJuridico, setEnableGenioJuridico] = useState(false);
    const [isCacheActive, setIsCacheActive] = useState(false);

    // Selection matrices
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

    const handleQuotaExceeded = useCallback(() => {
        setQuotaExceeded(true);
    }, []);

    // Chat Hook
    const { messages, isLoading, error, sendMessage, clearMessages, setMessages, retryMessage } = useChat({
        estado: selectedEstado || undefined,
        topK: 30,
        materia: selectedMateria || undefined,
        fuero: selectedFuero || undefined,
        onQuotaExceeded: handleQuotaExceeded,
        enableGenioJuridico,
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [queriesUsed, setQueriesUsed] = useState<number>(0);
    const [queriesLimit, setQueriesLimit] = useState<number>(3);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConvId] = useState<string | null>(null);
    const [conversationsLoading, setConversationsLoading] = useState(true);

    // Sync query counts and estado from profile
    useEffect(() => {
        if (profile) {
            setQueriesUsed(profile.queries_used || 0);
            setQueriesLimit(profile.queries_limit || 3);
            if (!estadoInitializedRef.current) {
                estadoInitializedRef.current = true;
                if (profile.estado) {
                    setSelectedEstado(profile.estado);
                } else {
                    setShowStateModal(true);
                }
            }
        }
    }, [profile]);

    // Polling for cache status
    useEffect(() => {
        const checkCacheStatus = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390'}/cache-status`);
                if (response.ok) {
                    const data = await response.json();
                    setIsCacheActive(data.cache_available);
                }
            } catch (err) {
                console.error('Error checking cache status:', err);
            }
        };
        checkCacheStatus();
        const interval = setInterval(checkCacheStatus, 15000); // Poll every 15s for "Genio" light
        return () => clearInterval(interval);
    }, []);

    // Load conversations
    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        const loadConversations = async () => {
            setConversationsLoading(true);
            try {
                const loadedConversations = await getConversations();
                setConversations(loadedConversations);
            } catch (err) {
                console.error('Error loading conversations:', err);
            } finally {
                setConversationsLoading(false);
            }
        };
        loadConversations();
    }, [authLoading, isAuthenticated]);

    // Ensure conversation exists
    useEffect(() => {
        const ensureConversation = async () => {
            if (messages.length > 0 && !activeConversationId) {
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

    // Auto-scroll
    const prevMessagesLengthRef = useRef(messages.length);
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    // Save messages
    const wasLoadingRef = useRef(false);
    useEffect(() => {
        const saveMessagesAfterResponse = async () => {
            if (wasLoadingRef.current && !isLoading && activeConversationId && messages.length >= 2) {
                const lastMessages = messages.slice(-2);
                const userMsg = lastMessages.find(m => m.role === 'user');
                const assistantMsg = lastMessages.find(m => m.role === 'assistant');
                if (userMsg && assistantMsg && assistantMsg.content.trim().length > 0) {
                    await addMessageToConversation(activeConversationId, userMsg);
                    await addMessageToConversation(activeConversationId, assistantMsg);
                    const updatedConvs = await getConversations();
                    setConversations(updatedConvs);
                }
            }
            wasLoadingRef.current = isLoading;
        };
        saveMessagesAfterResponse();
    }, [isLoading, activeConversationId, messages]);

    const handleNewConversation = useCallback(async () => {
        const newConv = await createConversation(selectedEstado || undefined);
        if (newConv) {
            setActiveConvId(newConv.id);
            clearMessages();
            const updatedConvs = await getConversations();
            setConversations(updatedConvs);
        }
    }, [selectedEstado, clearMessages]);

    const handleSelectConversation = useCallback(async (id: string) => {
        const conv = await getConversation(id);
        if (conv) {
            setActiveConvId(id);
            setActiveConversationId(id);
            setMessages(conv.messages);
            if (conv.estado) setSelectedEstado(conv.estado);
        }
    }, [setMessages]);

    const handleDeleteConversation = useCallback(async (id: string) => {
        await deleteConversation(id);
        const remaining = await getConversations();
        setConversations(remaining);
        if (id === activeConversationId) {
            setActiveConvId(null);
            setActiveConversationId(null);
            clearMessages();
        }
    }, [activeConversationId, clearMessages]);

    const handleCitationClick = useCallback((source: any) => {
        setActivePdfSource(source);
    }, []);

    const handleSendMessage = useCallback(async (content: string, enableReasoning = false) => {
        if (!user) return;
        const remaining = queriesLimit - queriesUsed;
        if (remaining <= 0) {
            setShowLimitModal(true);
            return;
        }
        const sendPromise = sendMessage(content, enableReasoning);
        setQueriesUsed(prev => prev + 1);

        (async () => {
            try {
                if (!activeConversationId) {
                    const newConv = await createConversation(selectedEstado || undefined);
                    if (newConv) {
                        setActiveConvId(newConv.id);
                        setActiveConversationId(newConv.id);
                    }
                }
            } catch (err) { }
        })();

        await sendPromise;
    }, [user, sendMessage, activeConversationId, selectedEstado, queriesLimit, queriesUsed]);

    const hasMessages = messages.length > 0;
    const selectedEstadoLabel = getEstadoLabel(selectedEstado);
    const queriesRemaining = Math.max(0, queriesLimit - queriesUsed);

    if (authLoading || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-cream-300">
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onToggleGuide={() => {
                    if (messages.length > 0) handleNewConversation();
                    setShowVisualGuide(true);
                }}
            />

            <div className="flex flex-col h-screen md:ml-72">
                <header className="fixed top-0 left-0 right-0 md:left-72 z-30 bg-cream-300/80 backdrop-blur-md border-b border-black/5 h-14">
                    <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-end gap-2">
                        <Link href="/normativa" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 shadow-sm">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Normativa</span>
                        </Link>

                        <button onClick={() => setShowConfigModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #8B6914 100%)' }}>
                            <span className="hidden sm:inline text-white/70">Jurisdicción:</span>
                            <span className="truncate">{selectedEstado ? selectedEstadoLabel : 'Todas'}</span>
                        </button>

                        <div className="px-3 py-1.5 bg-cream-100 rounded-lg text-xs font-medium">
                            <span className="hidden sm:inline text-charcoal-600">Consultas:</span>
                            <span className={queriesRemaining <= 1 ? 'text-red-600' : 'text-accent-brown'}>
                                {queriesRemaining}/{queriesLimit}
                            </span>
                        </div>
                        <UserAvatar />
                    </div>
                </header>

                <main className="flex-1 pt-14 overflow-y-auto">
                    {!hasMessages ? (
                        <div className="h-full flex flex-col items-center justify-center px-4 -mt-8">
                            <div className="max-w-2xl w-full text-center">
                                <div className="mb-4">
                                    <span className="font-serif text-5xl font-semibold text-charcoal-900">
                                        Iurex<span className="text-accent-gold">ia</span>
                                    </span>
                                </div>
                                <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-6">¿En qué te puedo ayudar?</h2>

                                <div className="mb-8 flex justify-center gap-4">
                                    <div className="relative" ref={materiaDropdownRef}>
                                        <button onClick={() => setShowMateriaDropdown(!showMateriaDropdown)} className="px-5 py-2.5 bg-charcoal-800 hover:bg-charcoal-900 text-white text-sm font-medium rounded-xl flex items-center gap-2">
                                            <span>Materia: {selectedMateria ? MATERIAS.find(m => m.key === selectedMateria)?.label : 'Automático'}</span>
                                            <ChevronDown className="w-4 h-4 text-white/50" />
                                        </button>
                                        {showMateriaDropdown && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-charcoal-800 rounded-xl shadow-xl border border-white/10 py-1 z-50">
                                                {MATERIAS.map((m) => (
                                                    <button key={m.key} onClick={() => { setSelectedMateria(m.key); setShowMateriaDropdown(false); }} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5">{m.label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex bg-charcoal-800/50 p-1 rounded-xl">
                                        {FUEROS.map((f) => (
                                            <button key={f.key} onClick={() => setSelectedFuero(f.key)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedFuero === f.key ? 'bg-accent-brown text-white' : 'text-charcoal-500 hover:text-charcoal-300'}`}>{f.label}</button>
                                        ))}
                                    </div>
                                </div>

                                <ChatInput
                                    onSubmit={handleSendMessage}
                                    placeholder="Escribe tu consulta legal..."
                                    estado={selectedEstado}
                                    enableGenioJuridico={enableGenioJuridico}
                                    setEnableGenioJuridico={setEnableGenioJuridico}
                                    isCacheActive={isCacheActive}
                                />

                                <div className="mt-4 text-center">
                                    <p className="text-xs text-charcoal-500 mb-2">Mejor pregunta = mejor resultado.</p>
                                    <button onClick={() => setShowPromptGuide(true)} className="text-xs text-accent-brown hover:text-accent-gold font-medium flex items-center gap-1 mx-auto">
                                        <HelpCircle className="w-3.5 h-3.5" /> ¿Cómo hacer mejores consultas?
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-6 pb-64 space-y-4">
                            {messages.map((message, index) => (
                                <ChatMessage key={index} message={message} isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'} onCitationClick={handleCitationClick} />
                            ))}
                            {isLoading && messages[messages.length - 1]?.role === 'user' && <TypingIndicator retryMessage={retryMessage || undefined} />}
                            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">Error: {error}</div>}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </main>

                {hasMessages && (
                    <div className="fixed bottom-0 left-0 right-0 md:left-72 bg-gradient-to-t from-cream-300 via-cream-300 pt-8 pb-6 px-4 z-20">
                        <ChatInput
                            onSubmit={handleSendMessage}
                            isLoading={isLoading}
                            estado={selectedEstado}
                            enableGenioJuridico={enableGenioJuridico}
                            setEnableGenioJuridico={setEnableGenioJuridico}
                            isCacheActive={isCacheActive}
                        />
                    </div>
                )}
            </div>

            {showStateModal && user && <StateSelectorModal userId={user.id} onSelectEstado={(e) => { setSelectedEstado(e); setShowStateModal(false); }} />}
            {showConfigModal && user && <StateSelectorModal userId={user.id} isConfig={true} currentEstado={selectedEstado} onClose={() => setShowConfigModal(false)} onSelectEstado={(e) => { setSelectedEstado(e); setShowConfigModal(false); }} />}

            {showLimitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-sm mx-auto text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Scale className="w-8 h-8 text-red-600" /></div>
                        <h3 className="text-xl font-bold mb-2">Límite alcanzado</h3>
                        <p className="text-charcoal-600 mb-6">Suscripción requerida para continuar.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowLimitModal(false)} className="px-6 py-2 rounded-xl bg-gray-100 font-medium">Cerrar</button>
                            <Link href="/precios" className="px-6 py-2 rounded-xl bg-accent-brown text-white font-medium">Ver planes</Link>
                        </div>
                    </div>
                </div>
            )}

            {quotaExceeded && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-charcoal-800 border border-charcoal-600 rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center">
                        <Scale className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Consultas agotadas</h3>
                        <p className="text-charcoal-300 mb-6">Cuota mensual completada. Actualiza para acceso ilimitado.</p>
                        <Link href="/precios" className="inline-block w-full py-3 bg-accent-brown text-white rounded-xl font-bold">Mejorar Plan</Link>
                    </div>
                </div>
            )}

            <PdfViewerPanel isOpen={activePdfSource !== null} onClose={() => setActivePdfSource(null)} source={activePdfSource} />
        </div>
    );
}
