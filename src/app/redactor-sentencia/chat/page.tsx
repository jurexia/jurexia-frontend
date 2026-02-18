'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import {
    ArrowLeft,
    Send,
    Paperclip,
    Trash2,
    Database,
    DatabaseZap,
    AlertTriangle,
    Loader2,
    FileText,
    X,
    Sparkles,
    Gavel,
    Copy,
    Check,
} from 'lucide-react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import { useRequireAuth } from '@/lib/useAuth';
import { UserAvatar } from '@/components/UserAvatar';
import type { Message } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Iurexia-api.onrender.com';

// ═══════════════════════════════════════════════════════════════════════════════
// PDF / DOCX Text Extraction Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function extractTextFromFile(file: File): Promise<string> {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        return extractPdfText(file);
    }
    if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
    ) {
        return extractDocxText(file);
    }
    // Plain text fallback
    return file.text();
}

async function extractPdfText(file: File): Promise<string> {
    // Use pdf.js via CDN for browser-side extraction
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(' ');
        pages.push(text);
    }
    return pages.join('\n\n');
}

async function extractDocxText(file: File): Promise<string> {
    const mammoth = (await import('mammoth')).default;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChatSentenciaPage() {
    const { loading: authLoading, isAuthenticated, user, profile } = useRequireAuth();

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Feature toggles
    const [useRag, setUseRag] = useState(true);
    const [showRagWarning, setShowRagWarning] = useState(false);

    // File attachment
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachedText, setAttachedText] = useState<string | null>(null);
    const [extractingFile, setExtractingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── File Handling ────────────────────────────────────────────────────────
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setError('El archivo excede 50MB');
            return;
        }

        setExtractingFile(true);
        setError(null);
        try {
            const text = await extractTextFromFile(file);
            setAttachedFile(file);
            setAttachedText(text);
        } catch (err) {
            console.error('Error extracting text:', err);
            setError('Error al extraer texto del archivo. Asegúrate de que sea un PDF o DOCX válido.');
        } finally {
            setExtractingFile(false);
        }
    }, []);

    const removeAttachment = useCallback(() => {
        setAttachedFile(null);
        setAttachedText(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // ── RAG Toggle ──────────────────────────────────────────────────────────
    const toggleRag = useCallback(() => {
        if (useRag) {
            // Turning OFF → show warning
            setShowRagWarning(true);
        } else {
            setUseRag(true);
            setShowRagWarning(false);
        }
    }, [useRag]);

    const confirmRagOff = useCallback(() => {
        setUseRag(false);
        setShowRagWarning(false);
    }, []);

    // ── Send Message ────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        const content = inputValue.trim();
        if (!content || isLoading) return;

        // Add user message
        const userMsg: Message = { role: 'user', content };
        const addAssistantMsg: Message = { role: 'assistant', content: '' };
        setMessages(prev => [...prev, userMsg, addAssistantMsg]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            // Build request body
            const allMessages = [...messages, userMsg];
            const body: any = {
                messages: allMessages.map(m => ({ role: m.role, content: m.content })),
                use_rag: useRag,
                user_id: user?.id || null,
                user_email: user?.email || null,
            };
            if (attachedText) {
                body.attached_document = attachedText;
            }

            const response = await fetch(`${API_URL}/chat-sentencia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `Error ${response.status}`);
            }

            if (!response.body) throw new Error('No response body');

            // Stream response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullContent += chunk;

                // Update the last assistant message
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                        updated[lastIdx] = { ...updated[lastIdx], content: fullContent };
                    }
                    return updated;
                });
            }

            // Clear attachment after successful send
            removeAttachment();

        } catch (err: any) {
            console.error('Chat sentencia error:', err);
            setError(err.message || 'Error al enviar mensaje');
            // Remove the empty assistant message on error
            setMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
                    updated.pop();
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, messages, useRag, user, attachedText, removeAttachment]);

    // ── Keyboard handling ───────────────────────────────────────────────────
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // Auto-resize textarea
    const handleTextareaInput = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, []);

    // Clear chat
    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
        removeAttachment();
    }, [removeAttachment]);

    // ── Loading state ───────────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#c9a962]" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const hasMessages = messages.length > 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#0a0e1a] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 border-b border-[#c9a962]/20 bg-[#0a0e1a]/95 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/redactor-sentencia"
                            className="p-2 rounded-lg hover:bg-[#c9a962]/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#c9a962]" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a962] to-[#8b7355] flex items-center justify-center">
                                <Gavel className="w-4 h-4 text-[#0a0e1a]" />
                            </div>
                            <div>
                                <h1 className="text-sm font-semibold text-white leading-tight">Chat de Redacción</h1>
                                <p className="text-[10px] text-[#c9a962]/60 leading-tight">Gemini 2.5 Pro</p>
                            </div>
                        </div>
                    </div>

                    {/* Center: RAG toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleRag}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${useRag
                                ? 'bg-[#c9a962]/20 text-[#c9a962] border border-[#c9a962]/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                }`}
                            title={useRag ? 'Base de datos verificada activa' : 'Sin base de datos — riesgo de alucinaciones'}
                        >
                            {useRag ? (
                                <DatabaseZap className="w-3.5 h-3.5" />
                            ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            {useRag ? 'BD Verificada' : 'Sin BD'}
                        </button>
                    </div>

                    {/* Right: Clear + Avatar */}
                    <div className="flex items-center gap-2">
                        {hasMessages && (
                            <button
                                onClick={clearChat}
                                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-white/40 hover:text-red-400"
                                title="Limpiar chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <UserAvatar />
                    </div>
                </div>
            </header>

            {/* ── RAG Warning Modal ──────────────────────────────────────────── */}
            {showRagWarning && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Desactivar Base de Datos</h3>
                        </div>
                        <p className="text-sm text-white/70 mb-4 leading-relaxed">
                            Al desactivar la base de datos verificada, las respuestas se basarán únicamente en el
                            conocimiento del modelo de IA. Esto puede resultar en:
                        </p>
                        <ul className="text-sm text-red-300/80 space-y-2 mb-6 pl-4">
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>Alucinaciones en citas de tesis y jurisprudencia</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>Registros digitales inventados</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>Artículos citados con contenido impreciso</span>
                            </li>
                        </ul>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRagWarning(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmRagOff}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium border border-red-500/30 transition-colors"
                            >
                                Desactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Content ───────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full relative">
                {/* Empty state — Welcome */}
                {!hasMessages && (
                    <div className="flex-1 flex items-center justify-center p-6 pb-32">
                        <div className="text-center w-full max-w-2xl mx-auto">
                            {/* Animated icon */}
                            <div className="relative mx-auto w-16 h-16 mb-8 group">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#c9a962]/30 to-[#8b7355]/20 blur-xl group-hover:blur-2xl transition-all duration-700" />
                                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#c9a962]/10 to-[#8b7355]/5 border border-[#c9a962]/20 flex items-center justify-center backdrop-blur-sm">
                                    <Sparkles className="w-8 h-8 text-[#c9a962]" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-3 tracking-tight">
                                ¿En qué puedo ayudarte hoy?
                            </h2>
                            <p className="text-white/40 text-base mb-12 max-w-lg mx-auto font-light">
                                Asistente jurídico especializado en redacción de sentencias.
                            </p>

                            {/* Quick action suggestions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                {[
                                    {
                                        title: 'Continuar redacción',
                                        desc: 'Retomar escritura',
                                        icon: '✍️',
                                    },
                                    {
                                        title: 'Cambiar sentido',
                                        desc: 'Fundado ↔ Infundado',
                                        icon: '🔄',
                                    },
                                    {
                                        title: 'Buscar jurisprudencia',
                                        desc: 'Tesis y precedentes',
                                        icon: '⚖️',
                                    },
                                    {
                                        title: 'Analizar documento',
                                        desc: 'Subir PDF/DOCX',
                                        icon: '📄',
                                    },
                                ].map((item) => (
                                    <button
                                        key={item.title}
                                        onClick={() => {
                                            setInputValue(item.title === 'Analizar documento' ? '' : `${item.title}: `);
                                            if (item.title === 'Analizar documento') {
                                                fileInputRef.current?.click();
                                            } else {
                                                textareaRef.current?.focus();
                                            }
                                        }}
                                        className="p-4 rounded-2xl bg-[#1a1f2e]/50 border border-white/5 hover:border-[#c9a962]/30 hover:bg-[#1a1f2e] transition-all duration-300 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                                            <div>
                                                <p className="text-sm font-medium text-white/80 group-hover:text-[#c9a962] transition-colors">
                                                    {item.title}
                                                </p>
                                                <p className="text-xs text-white/30 group-hover:text-white/50">{item.desc}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages area */}
                {hasMessages && (
                    <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth">
                        {messages.map((msg, idx) => (
                            <ChatMessage
                                key={idx}
                                message={msg}
                                isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
                            />
                        ))}
                        {isLoading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
                            <div className="flex items-start gap-4 px-4 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a962] to-[#8b7355] flex items-center justify-center shrink-0 shadow-lg shadow-[#c9a962]/10">
                                    <Sparkles className="w-4 h-4 text-[#0a0e1a]" />
                                </div>
                                <div className="space-y-2 pt-1.5">
                                    <div className="h-4 w-32 bg-white/10 rounded overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-transparent via-white/10 to-transparent w-full animate-shimmer" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}

                {/* ── Error bar ──────────────────────────────────────────────── */}
                {error && (
                    <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3 backdrop-blur-md">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/10 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── Floating Input Area ────────────────────────────────────── */}
                <div className="sticky bottom-0 px-4 pb-6 pt-10 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/95 to-transparent z-10">
                    <div className="relative max-w-3xl mx-auto">
                        {/* Attached file indicator */}
                        {(attachedFile || extractingFile) && (
                            <div className="absolute -top-12 left-0 right-0 flex justify-center">
                                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#1a1f2e] border border-[#c9a962]/20 shadow-lg shadow-black/20 backdrop-blur-md">
                                    {extractingFile ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a962]" />
                                            <span className="text-xs text-[#c9a962]">Procesando documento...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-3.5 h-3.5 text-[#c9a962]" />
                                            <span className="text-xs text-white/90 font-medium max-w-[200px] truncate">{attachedFile?.name}</span>
                                            <button
                                                onClick={removeAttachment}
                                                className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`
                            relative bg-[#1a1f2e] border transition-all duration-300 rounded-[24px] shadow-2xl overflow-hidden
                            ${isLoading ? 'border-[#c9a962]/10 opacity-80' : 'border-[#c9a962]/20 hover:border-[#c9a962]/40 focus-within:border-[#c9a962]/60 focus-within:ring-1 focus-within:ring-[#c9a962]/30'}
                        `}>
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onInput={handleTextareaInput}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu instrucción o describe el documento..."
                                rows={1}
                                className="w-full bg-transparent text-white/90 placeholder-white/30 px-6 py-4 pr-32 resize-none outline-none text-[15px] leading-relaxed max-h-[200px] scrollbar-thin scrollbar-thumb-white/10"
                                disabled={isLoading}
                                autoFocus
                            />

                            <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
                                {/* File upload button */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading || extractingFile}
                                    className="p-2.5 rounded-xl text-white/40 hover:text-[#c9a962] hover:bg-[#c9a962]/10 transition-colors disabled:opacity-30 tooltip-trigger"
                                    title="Adjuntar documento"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>

                                {/* Send button */}
                                <button
                                    onClick={sendMessage}
                                    disabled={!inputValue.trim() || isLoading}
                                    className={`
                                        p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center
                                        ${inputValue.trim() && !isLoading
                                            ? 'bg-[#c9a962] text-[#0a0e1a] hover:bg-[#d4b46a] shadow-[0_0_15px_rgba(201,169,98,0.3)] hover:shadow-[0_0_20px_rgba(201,169,98,0.5)] transform hover:scale-105'
                                            : 'bg-white/5 text-white/20 cursor-not-allowed'}
                                    `}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer hint */}
                        <div className="flex justify-center items-center mt-3 gap-2 opacity-0 hover:opacity-100 transition-opacity duration-500">
                            <p className="text-[10px] text-white/20 select-none">
                                Gemini 2.5 Pro · {useRag ? 'Verificado' : 'Sin verificar'}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Add strict style for scrollbar hiding if needed
const css = `
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }
`;
