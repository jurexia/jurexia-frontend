'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Trash2, Settings } from 'lucide-react';
import Link from 'next/link';
import ChatInput from '@/components/ChatInput';
import ChatMessage, { TypingIndicator } from '@/components/ChatMessage';
import DocumentModal from '@/components/DocumentModal';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
    const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    // Handle citation click
    const handleCitationClick = useCallback((docId: string) => {
        setSelectedDocId(docId);
    }, []);


    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const hasMessages = messages.length > 0;

    return (
        <div className="min-h-screen bg-cream-300 flex flex-col">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
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
                        <button
                            className="p-2 hover:bg-black/5 rounded-lg transition-colors text-charcoal-600"
                            title="Configuración"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pt-14 pb-32 overflow-hidden">
                {!hasMessages ? (
                    // Empty State - Welcome Screen
                    <div className="h-full flex flex-col items-center justify-center px-4">
                        <div className="max-w-2xl text-center">
                            <div className="text-6xl mb-6">⚖️</div>
                            <h2 className="font-serif text-3xl font-medium text-charcoal-900 mb-4">
                                ¿En qué te puedo ayudar?
                            </h2>
                            <p className="text-charcoal-600 mb-8">
                                Realiza consultas legales, analiza documentos o busca jurisprudencia
                                relevante en la normativa mexicana.
                            </p>

                            {/* Suggestion chips */}
                            <div className="flex flex-wrap justify-center gap-3">
                                <SuggestionChip
                                    onClick={() => sendMessage("¿Cuáles son los requisitos para un amparo indirecto?")}
                                >
                                    📜 Requisitos de amparo indirecto
                                </SuggestionChip>
                                <SuggestionChip
                                    onClick={() => sendMessage("Explica el artículo 123 constitucional sobre derechos laborales")}
                                >
                                    👷 Artículo 123 laboral
                                </SuggestionChip>
                                <SuggestionChip
                                    onClick={() => sendMessage("¿Cuál es la prescripción para delitos fiscales?")}
                                >
                                    💰 Prescripción fiscal
                                </SuggestionChip>
                                <SuggestionChip
                                    onClick={() => sendMessage("Busca jurisprudencia sobre pensión alimenticia")}
                                >
                                    👨‍👩‍👧 Pensión alimenticia
                                </SuggestionChip>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Messages Container
                    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-cream-300 via-cream-300 to-transparent pt-8 pb-6 px-4">
                <ChatInput
                    onSubmit={sendMessage}
                    isLoading={isLoading}
                    placeholder={hasMessages ? "Escribe tu siguiente pregunta..." : "Escribe tu consulta legal..."}
                />
            </div>

            {/* Document Modal */}
            <DocumentModal
                docId={selectedDocId}
                onClose={() => setSelectedDocId(null)}
            />
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
