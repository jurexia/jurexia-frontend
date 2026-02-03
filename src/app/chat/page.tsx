'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Trash2, MapPin, ChevronDown, Check, Scale, Building2 } from 'lucide-react';
import Link from 'next/link';
import ChatInput from '@/components/ChatInput';
import ChatMessage, { TypingIndicator } from '@/components/ChatMessage';
import DocumentModal from '@/components/DocumentModal';
import ChatSidebar from '@/components/ChatSidebar';
import { useChat } from '@/hooks/useChat';
import { UserAvatar } from '@/components/UserAvatar';
import { useSession } from 'next-auth/react';
import {
    Conversation,
    getConversations,
    getConversation,
    saveConversation,
    deleteConversation,
    createConversation,
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
    const [selectedEstado, setSelectedEstado] = useState<string>('');
    const [showEstadoSelector, setShowEstadoSelector] = useState(false);

    // Conversation history state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConvId] = useState<string | null>(null);

    const { messages, isLoading, error, sendMessage, clearMessages, setMessages } = useChat({
        estado: selectedEstado || undefined,
        topK: 30  // Maximum allowed by API
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    // Load conversations on mount
    useEffect(() => {
        const loadedConversations = getConversations();
        setConversations(loadedConversations);

        const activeId = getActiveConversationId();
        if (activeId) {
            const activeConv = getConversation(activeId);
            if (activeConv) {
                setActiveConvId(activeId);
                setMessages(activeConv.messages);
                if (activeConv.estado) {
                    setSelectedEstado(activeConv.estado);
                }
            }
        }
    }, [setMessages]);

    // Save messages to conversation when they change
    useEffect(() => {
        if (messages.length > 0) {
            let convId = activeConversationId;

            // If no active conversation exists, create one automatically
            if (!convId) {
                const newConv = createConversation(selectedEstado || undefined);
                convId = newConv.id;
                setActiveConvId(convId);
                setConversations(getConversations());
            }

            const conv = getConversation(convId);
            if (conv) {
                conv.messages = messages;
                conv.updatedAt = new Date().toISOString();
                if (conv.title === 'Nueva conversación') {
                    const firstUserMsg = messages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        conv.title = generateTitle(firstUserMsg.content);
                    }
                }
                saveConversation(conv);
                setConversations(getConversations());
            }
        }
    }, [messages, activeConversationId, selectedEstado]);

    // Handle new conversation
    const handleNewConversation = useCallback(() => {
        const newConv = createConversation(selectedEstado || undefined);
        setActiveConvId(newConv.id);
        clearMessages();
        setConversations(getConversations());
    }, [selectedEstado, clearMessages]);

    // Handle select conversation
    const handleSelectConversation = useCallback((id: string) => {
        const conv = getConversation(id);
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
    const handleDeleteConversation = useCallback((id: string) => {
        deleteConversation(id);
        const remaining = getConversations();
        setConversations(remaining);

        if (id === activeConversationId) {
            if (remaining.length > 0) {
                // Don't scroll when switching after delete - just load the conversation quietly
                const conv = getConversation(remaining[0].id);
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

    // Track if we should scroll - only scroll for new messages, not conversation switches
    const prevMessagesLengthRef = useRef(messages.length);

    // Auto-scroll to bottom only when NEW messages are added (not on conversation switch)
    useEffect(() => {
        // Only scroll if messages increased (new message added), not decreased or changed completely
        if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    const hasMessages = messages.length > 0;
    const selectedEstadoLabel = ESTADOS_MEXICO.find(e => e.value === selectedEstado)?.label || 'Seleccionar jurisdicción';

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
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 md:left-72 z-30 bg-cream-300/80 backdrop-blur-md border-b border-black/5 transition-all duration-300">
                    <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors"
                                title="Volver al inicio"
                            >
                                <ArrowLeft className="w-5 h-5 text-charcoal-700" />
                            </Link>
                            <h1 className="font-serif text-lg font-medium text-charcoal-900">
                                Nueva Consulta
                            </h1>
                        </div>

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
                <main className="flex-1 pt-14 pb-40 overflow-y-auto">
                    {!hasMessages ? (
                        // Empty State - Welcome Screen
                        <div className="h-full flex flex-col items-center justify-center px-4">
                            <div className="max-w-2xl text-center">
                                <div className="mb-6">
                                    <span className="font-serif text-5xl font-semibold text-charcoal-900">
                                        Jurex<span className="text-accent-gold">ia</span>
                                    </span>
                                </div>
                                <h2 className="font-serif text-3xl font-medium text-charcoal-900 mb-4">
                                    ¿En qué te puedo ayudar?
                                </h2>
                                <p className="text-charcoal-600 mb-4">
                                    Realiza consultas legales, analiza documentos o busca jurisprudencia
                                    relevante en la normativa mexicana.
                                </p>

                                {/* Jurisdiction Tip and Selector */}
                                <div className="mb-6">
                                    {!selectedEstado && (
                                        <p className="text-sm text-accent-brown mb-3">
                                            💡 Selecciona un estado para resultados más precisos
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setShowEstadoSelector(!showEstadoSelector)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedEstado
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
                                <div className="mb-8 p-4 bg-cream-200 rounded-xl inline-block">
                                    <p className="text-sm text-charcoal-600 mb-2">
                                        <strong>Buscando en:</strong>
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                            <Building2 className="w-3 h-3" /> Leyes Federales
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                            <Scale className="w-3 h-3" /> Jurisprudencia Nacional
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent-brown/20 text-accent-brown rounded-full">
                                            <MapPin className="w-3 h-3" /> {selectedEstado ? `Leyes de ${selectedEstadoLabel}` : 'Todas las entidades'}
                                        </span>
                                    </div>
                                </div>

                                {/* Specialized Suggestion chips */}
                                <div className="flex flex-wrap justify-center gap-3">
                                    <SuggestionChip
                                        onClick={() => sendMessage("¿Qué jurisprudencia resuelve si procede el juicio de amparo indirecto contra la clausura de mi negocio?")}
                                    >
                                        ⚖️ Amparo vs clausura de negocio
                                    </SuggestionChip>
                                    <SuggestionChip
                                        onClick={() => sendMessage("¿Cuáles son los requisitos de procedencia de una demanda de amparo para evitar el desechamiento o sobreseimiento?")}
                                    >
                                        📋 Requisitos para no desechen mi amparo
                                    </SuggestionChip>
                                    <SuggestionChip
                                        onClick={() => sendMessage("¿Qué criterios jurisprudenciales existen sobre la suspensión del acto reclamado en amparo?")}
                                    >
                                        ⏸️ Suspensión del acto en amparo
                                    </SuggestionChip>
                                    <SuggestionChip
                                        onClick={() => sendMessage("¿Cuál es el plazo para interponer amparo directo y cómo se computan los días?")}
                                    >
                                        ⏰ Plazos en amparo directo
                                    </SuggestionChip>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Messages Container
                        <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
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

                {/* Fixed Input at Bottom */}
                <div className="fixed bottom-0 left-0 right-0 md:left-72 bg-gradient-to-t from-cream-300 via-cream-300 to-transparent pt-8 pb-6 px-4 transition-all duration-300">
                    <ChatInput
                        onSubmit={sendMessage}
                        isLoading={isLoading}
                        placeholder={hasMessages ? "Escribe tu siguiente pregunta..." : "Escribe tu consulta legal..."}
                        estado={selectedEstado || undefined}
                    />
                </div>

                {/* Document Modal */}
                <DocumentModal
                    docId={selectedDocId}
                    onClose={() => setSelectedDocId(null)}
                />
            </div>
        </div>
    );
}

function SuggestionChip({
    children,
    onClick
}: {
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="chip hover:bg-charcoal-900 hover:text-white hover:border-charcoal-900 transition-all text-sm"
        >
            {children}
        </button>
    );
}
