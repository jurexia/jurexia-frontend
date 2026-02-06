'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, MapPin, ChevronDown, Check, Scale, Building2, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ChatInput from '@/components/ChatInput';
import ChatMessage, { TypingIndicator } from '@/components/ChatMessage';
import DocumentModal from '@/components/DocumentModal';
import ChatSidebar from '@/components/ChatSidebar';
import PromptGuide from '@/components/PromptGuide';
import { useChat } from '@/hooks/useChat';
import { UserAvatar } from '@/components/UserAvatar';
import { useRequireAuth } from '@/lib/useAuth';
import { incrementQueryCount, checkCanQuery } from '@/lib/supabase';
import {
    Conversation,
    getConversations,
    getConversation,
    deleteConversation,
    createConversation,
    addMessageToConversation,
    getActiveConversationId,
    setActiveConversationId,
    generateTitle
} from '@/lib/conversations';

// Mexican states for jurisdiction selector
const ESTADOS_MEXICO = [
    { value: '', label: 'Todos los estados', icon: '🇲🇽' },
    { value: 'AGUASCALIENTES', label: 'Aguascalientes', icon: '🏛️' },
    { value: 'BAJA_CALIFORNIA', label: 'Baja California', icon: '🏛️' },
    { value: 'BAJA_CALIFORNIA_SUR', label: 'Baja California Sur', icon: '🏛️' },
    { value: 'CAMPECHE', label: 'Campeche', icon: '🏛️' },
    { value: 'CHIAPAS', label: 'Chiapas', icon: '🏛️' },
    { value: 'CHIHUAHUA', label: 'Chihuahua', icon: '🏛️' },
    { value: 'CIUDAD_DE_MEXICO', label: 'Ciudad de México', icon: '🏛️' },
    { value: 'COAHUILA', label: 'Coahuila', icon: '🏛️' },
    { value: 'COLIMA', label: 'Colima', icon: '🏛️' },
    { value: 'DURANGO', label: 'Durango', icon: '🏛️' },
    { value: 'GUANAJUATO', label: 'Guanajuato', icon: '🏛️' },
    { value: 'GUERRERO', label: 'Guerrero', icon: '🏛️' },
    { value: 'HIDALGO', label: 'Hidalgo', icon: '🏛️' },
    { value: 'JALISCO', label: 'Jalisco', icon: '🏛️' },
    { value: 'MEXICO', label: 'Estado de México', icon: '🏛️' },
    { value: 'MICHOACAN', label: 'Michoacán', icon: '🏛️' },
    { value: 'MORELOS', label: 'Morelos', icon: '🏛️' },
    { value: 'NAYARIT', label: 'Nayarit', icon: '🏛️' },
    { value: 'NUEVO_LEON', label: 'Nuevo León', icon: '🏛️' },
    { value: 'OAXACA', label: 'Oaxaca', icon: '🏛️' },
    { value: 'PUEBLA', label: 'Puebla', icon: '🏛️' },
    { value: 'QUERETARO', label: 'Querétaro', icon: '🏛️' },
    { value: 'QUINTANA_ROO', label: 'Quintana Roo', icon: '🏛️' },
    { value: 'SAN_LUIS_POTOSI', label: 'San Luis Potosí', icon: '🏛️' },
    { value: 'SINALOA', label: 'Sinaloa', icon: '🏛️' },
    { value: 'SONORA', label: 'Sonora', icon: '🏛️' },
    { value: 'TABASCO', label: 'Tabasco', icon: '🏛️' },
    { value: 'TAMAULIPAS', label: 'Tamaulipas', icon: '🏛️' },
    { value: 'TLAXCALA', label: 'Tlaxcala', icon: '🏛️' },
    { value: 'VERACRUZ', label: 'Veracruz', icon: '🏛️' },
    { value: 'YUCATAN', label: 'Yucatán', icon: '🏛️' },
    { value: 'ZACATECAS', label: 'Zacatecas', icon: '🏛️' },
];

export default function ChatPage() {
    // Auth protection - redirects to login if not authenticated
    const { loading: authLoading, isAuthenticated, user, profile } = useRequireAuth();

    const [selectedEstado, setSelectedEstado] = useState<string>('');
    const [showEstadoSelector, setShowEstadoSelector] = useState(false);
    const [showPromptGuide, setShowPromptGuide] = useState(false);

    // Conversation history state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConvId] = useState<string | null>(null);
    const [conversationsLoading, setConversationsLoading] = useState(true);

    const { messages, isLoading, error, sendMessage, clearMessages, setMessages } = useChat({
        estado: selectedEstado || undefined,
        topK: 30  // Maximum allowed by API
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    // Query limits state
    const [queriesUsed, setQueriesUsed] = useState<number>(0);
    const [queriesLimit, setQueriesLimit] = useState<number>(5);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const isUnlimited = profile?.subscription_type === 'premium' || profile?.subscription_type === 'enterprise';

    // Track if we should scroll - only scroll for new messages, not conversation switches
    const prevMessagesLengthRef = useRef(messages.length);

    // Sync query counts from profile
    useEffect(() => {
        if (profile) {
            setQueriesUsed(profile.queries_used || 0);
            setQueriesLimit(profile.queries_limit || 5);
        }
    }, [profile]);

    // Load conversations on mount
    useEffect(() => {
        if (authLoading || !isAuthenticated) return; // Don't load until auth is ready

        const loadConversations = async () => {
            setConversationsLoading(true);
            try {
                const loadedConversations = await getConversations();
                setConversations(loadedConversations);

                const activeId = getActiveConversationId();
                if (activeId) {
                    const activeConv = await getConversation(activeId);
                    if (activeConv) {
                        setActiveConvId(activeId);
                        setMessages(activeConv.messages);
                        if (activeConv.estado) {
                            setSelectedEstado(activeConv.estado);
                        }
                    }
                }
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
    useEffect(() => {
        const saveMessagesAfterResponse = async () => {
            // Detect transition from loading=true to loading=false
            if (wasLoadingRef.current && !isLoading && activeConversationId && messages.length >= 2) {
                // Get the last two messages (user question + assistant response)
                const lastMessages = messages.slice(-2);
                const userMsg = lastMessages.find(m => m.role === 'user');
                const assistantMsg = lastMessages.find(m => m.role === 'assistant');

                // Save assistant response if we have one
                if (assistantMsg && assistantMsg.content.trim().length > 0) {
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

    // Handle delete conversation
    const handleDeleteConversation = useCallback(async (id: string) => {
        await deleteConversation(id);
        const remaining = await getConversations();
        setConversations(remaining);

        if (id === activeConversationId) {
            if (remaining.length > 0) {
                // Don't scroll when switching after delete - just load the conversation quietly
                const conv = await getConversation(remaining[0].id);
                if (conv) {
                    setMessages(conv.messages);
                    setActiveConvId(remaining[0].id);
                    if (conv.estado) {
                        setSelectedEstado(conv.estado);
                    }
                }
            } else {
                setActiveConvId(null);
                clearMessages();
            }
        }
    }, [activeConversationId, clearMessages, setMessages]);

    // Handle citation click
    const handleCitationClick = useCallback((docId: string) => {
        setSelectedDocId(docId);
    }, []);

    // Wrapped send function with limit check and increment
    const handleSendMessage = useCallback(async (content: string) => {
        if (!user) return;

        // Check limit before sending (skip for unlimited plans)
        if (!isUnlimited) {
            const { canQuery } = await checkCanQuery(user.id);
            if (!canQuery) {
                setShowLimitModal(true);
                return;
            }
        }

        // Ensure we have a conversation before sending
        let convId = activeConversationId;
        if (!convId) {
            const newConv = await createConversation(selectedEstado || undefined);
            if (newConv) {
                convId = newConv.id;
                setActiveConvId(convId);
                setActiveConversationId(convId);
            }
        }

        // Save user message to database
        if (convId) {
            await addMessageToConversation(convId, { role: 'user', content });
            // Refresh conversations to update message count
            const updatedConvs = await getConversations();
            setConversations(updatedConvs);
        }

        // Send the message (response will be saved by useEffect when isLoading changes)
        await sendMessage(content);

        // Increment counter after successful send (skip for unlimited)
        if (!isUnlimited && user) {
            await incrementQueryCount(user.id);
            setQueriesUsed(prev => prev + 1);
        }
    }, [user, isUnlimited, sendMessage, activeConversationId, selectedEstado]);

    const hasMessages = messages.length > 0;
    const selectedEstadoLabel = ESTADOS_MEXICO.find(e => e.value === selectedEstado)?.label || 'Seleccionar jurisdicción';
    const queriesRemaining = isUnlimited ? -1 : Math.max(0, queriesLimit - queriesUsed);

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal-900 mx-auto mb-4"></div>
                    <p className="text-charcoal-600">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    // If not authenticated, useRequireAuth will redirect
    if (!isAuthenticated) {
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
            />

            {/* Main Content - offset for fixed sidebar */}
            <div className="flex flex-col h-screen md:ml-72">
                {/* Header - Minimal, only shows counter and user */}
                <header className="fixed top-0 left-0 right-0 md:left-72 z-30 bg-cream-300/80 backdrop-blur-md border-b border-black/5 transition-all duration-300">
                    <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-end">

                        <div className="flex items-center gap-2">

                            {hasMessages && (
                                <button
                                    onClick={clearMessages}
                                    className="p-2 hover:bg-black/5 rounded-lg transition-colors text-charcoal-600 hover:text-red-600"
                                    title="Limpiar conversación"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            {/* Query Counter */}
                            <div className="flex items-center gap-1 px-2 py-1 bg-cream-100 rounded-lg text-xs font-medium">
                                <span className="text-charcoal-600">Consultas:</span>
                                {isUnlimited ? (
                                    <span className="text-accent-brown" title="Ilimitado">∞</span>
                                ) : (
                                    <span className={queriesRemaining <= 1 ? 'text-red-600' : 'text-accent-brown'}>
                                        {queriesRemaining}/{queriesLimit}
                                    </span>
                                )}
                            </div>
                            <UserAvatar />
                        </div>
                    </div>

                </header>

                {/* Jurisdiction Dropdown - Overlay */}
                {showEstadoSelector && (
                    <>
                        {/* Backdrop to close */}
                        <div
                            className="fixed inset-0 z-50 bg-black/20"
                            onClick={() => setShowEstadoSelector(false)}
                        />
                        {/* Dropdown Panel */}
                        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl mx-4 bg-cream-100 border border-cream-400 rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto">
                            <div className="p-4">
                                <div className="mb-4">
                                    <p className="text-xs text-charcoal-500 uppercase tracking-wide font-medium mb-2">
                                        Selecciona una jurisdicción
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                            <Building2 className="w-3 h-3" /> Leyes Federales ✓
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                            <Scale className="w-3 h-3" /> Jurisprudencia ✓
                                        </span>
                                        {selectedEstado && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent-brown/20 text-accent-brown rounded-full">
                                                <MapPin className="w-3 h-3" /> Leyes de {selectedEstadoLabel} ✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {ESTADOS_MEXICO.map((estado) => (
                                        <button
                                            key={estado.value}
                                            onClick={() => {
                                                setSelectedEstado(estado.value);
                                                setShowEstadoSelector(false);
                                            }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${selectedEstado === estado.value
                                                ? 'bg-accent-brown text-white'
                                                : 'bg-cream-200 hover:bg-cream-300 text-charcoal-700'
                                                }`}
                                        >
                                            <span>{estado.icon}</span>
                                            <span className="truncate">{estado.label}</span>
                                            {selectedEstado === estado.value && (
                                                <Check className="w-4 h-4 ml-auto flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Main Content Area - Scrollable */}
                <main className="flex-1 pt-14 overflow-y-auto">
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

                                {/* Jurisdiction Selector */}
                                <div className="mb-4">
                                    {!selectedEstado && (
                                        <p className="text-xs text-accent-brown mb-2">
                                            💡 Selecciona un estado para resultados más precisos
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setShowEstadoSelector(!showEstadoSelector)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedEstado
                                            ? 'bg-accent-brown text-white'
                                            : 'bg-cream-300 text-charcoal-700 hover:bg-cream-400 border border-cream-400'
                                            }`}
                                    >
                                        <MapPin className="w-4 h-4" />
                                        <span>{selectedEstado ? selectedEstadoLabel : 'Seleccionar Jurisdicción'}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showEstadoSelector ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {/* Jurisdiction Info */}
                                <div className="mb-6 p-3 bg-cream-200 rounded-xl inline-block">
                                    <p className="text-xs text-charcoal-600 mb-1.5">
                                        <strong>Buscando en:</strong>
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                            <Building2 className="w-3 h-3" /> Leyes Federales
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                            <Scale className="w-3 h-3" /> Jurisprudencia
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-brown/20 text-accent-brown rounded-full">
                                            <MapPin className="w-3 h-3" /> {selectedEstado ? selectedEstadoLabel : 'Todas las entidades'}
                                        </span>
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
                        <div className="max-w-3xl mx-auto px-4 py-6 pb-48 space-y-6">
                            {/* Active jurisdiction indicator */}
                            <div className="flex justify-center">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-cream-200 rounded-full text-xs text-charcoal-600">
                                    <MapPin className="w-3 h-3" />
                                    <span>Buscando en: {selectedEstado ? selectedEstadoLabel : 'Todas las entidades'} + Federal + Jurisprudencia</span>
                                </div>
                            </div>

                            {messages.map((message, index) => (
                                <ChatMessage
                                    key={index}
                                    message={message}
                                    isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                                    onCitationClick={handleCitationClick}
                                />
                            ))}

                            {/* Typing indicator when loading but no assistant message yet */}
                            {isLoading && messages[messages.length - 1]?.role === 'user' && (
                                <TypingIndicator />
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
            </div>

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
        </div>
    );
}
