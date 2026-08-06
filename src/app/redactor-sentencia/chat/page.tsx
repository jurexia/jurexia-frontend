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
    Scale,
    Gavel,
    Copy,
    Check,
} from 'lucide-react';
import { checkCanSentenciaQuery, incrementSentenciaQueryCount, getSession } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatMessage from '@/components/ChatMessage';
import DocumentModal from '@/components/DocumentModal';
import PdfViewerPanel from '@/components/PdfViewerPanel';
import { useRequireAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { UserAvatar } from '@/components/UserAvatar';
import type { Message } from '@/lib/api';
import ChatSidebar from '@/components/ChatSidebar';
import {
    Conversation,
    getConversations,
    getConversation,
    deleteConversation,
    createConversation,
    addMessageToConversation,
    setActiveConversationId
} from '@/lib/conversations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

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
    const router = useRouter();

    // Access gate: only admin or ultra_secretarios can use this page
    const canAccess = isAdmin(user?.email) || profile?.subscription_type === 'ultra_secretarios';

    useEffect(() => {
        // Wait until profile is loaded before checking access
        if (!authLoading && isAuthenticated && profile && !canAccess) {
            router.replace('/secretarios');
        }
    }, [authLoading, isAuthenticated, profile, canAccess, router]);

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConvId] = useState<string | null>(null);
    const [conversationsLoading, setConversationsLoading] = useState(true);

    // Track previous loading state for detecting when response completes
    const wasLoadingRef = useRef(false);

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sentencia quota exceeded state
    const [quotaExceeded, setQuotaExceeded] = useState(false);

    // Feature toggles
    const [useRag, setUseRag] = useState(true);
    const [showRagWarning, setShowRagWarning] = useState(false);

    // Citation Panel State
    const [activePdfSource, setActivePdfSource] = useState<{
        docId: string; origen: string; ref: string; texto: string;
        pdf_url?: string | null; silo?: string; entidad?: string | null;
    } | null>(null);

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

    // ── Access Gate (after all hooks) ─────────────────────────────────────
    if (authLoading || (isAuthenticated && !profile)) {
        return (
            <div className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal-900"></div>
            </div>
        );
    }

    if (!canAccess) {
        return (
            <div className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal-900"></div>
            </div>
        );
    }


    // ── Conversations Logic ───────────────────────────────────────────────

    // Load conversations on mount
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

    // Save messages to database when assistant finishes responding
    useEffect(() => {
        const saveMessagesAfterResponse = async () => {
            // Detect transition from loading=true to loading=false
            if (wasLoadingRef.current && !isLoading && activeConversationId && messages.length >= 2) {
                // Get the last two messages (user + assistant)
                const lastMessages = messages.slice(-2);
                const userMsg = lastMessages.find(m => m.role === 'user');
                const assistantMsg = lastMessages.find(m => m.role === 'assistant');

                if (userMsg && assistantMsg && assistantMsg.content.trim().length > 0) {
                    // Save user message
                    await addMessageToConversation(activeConversationId, userMsg);
                    // Save assistant message
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
        // Optimistic UI update
        setActiveConvId(null);
        setActiveConversationId(null);
        setMessages([]);
        setAttachedFile(null);
        setAttachedText(null);

        // Ensure backend creates one if needed later, but for now just clear state
        const updatedConvs = await getConversations();
        setConversations(updatedConvs);
    }, []);

    // Handle select conversation
    const handleSelectConversation = useCallback(async (id: string) => {
        const conv = await getConversation(id);
        if (conv) {
            setActiveConvId(id);
            setActiveConversationId(id);
            setMessages(conv.messages);
            setAttachedFile(null); // Clear attachments when switching
            setAttachedText(null);
        }
    }, []);

    // Handle delete conversation
    const handleDeleteConversation = useCallback(async (id: string) => {
        await deleteConversation(id);
        const remaining = await getConversations();
        setConversations(remaining);

        if (id === activeConversationId) {
            handleNewConversation();
        }
    }, [activeConversationId, handleNewConversation]);

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

    // ── Document Modal Handlers ─────────────────────────────────────────────
    const handleCitationClick = useCallback((source: { docId: string; origen: string; ref: string; texto: string; pdf_url?: string | null; silo?: string; entidad?: string | null }) => {
        setActivePdfSource(source);
    }, []);

    const handleCloseModal = useCallback(() => {
        setActivePdfSource(null);
    }, []);

    // ── Send Message ────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        const content = inputValue.trim();
        if (!content || isLoading) return;

        // Add user message
        const userMsg: Message = { role: 'user', content };
        const addAssistantMsg: Message = { role: 'assistant', content: '' };
        const currentMessages = [...messages, userMsg, addAssistantMsg];
        setMessages(currentMessages);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        // ── Sentencia quota enforcement ──
        if (user?.id) {
            try {
                const { canQuery, remaining } = await checkCanSentenciaQuery(user.id);
                if (!canQuery) {
                    // Remove user + assistant messages we just added
                    setMessages(messages);
                    setIsLoading(false);
                    setQuotaExceeded(true);
                    return;
                }
            } catch (err) {
                console.error('Quota check failed (allowing query):', err);
            }
        }

        // Ensure we have an active conversation ID before sending
        let currentConvId = activeConversationId;
        if (!currentConvId) {
            try {
                const newConv = await createConversation();
                if (newConv) {
                    currentConvId = newConv.id;
                    setActiveConvId(newConv.id);
                    setActiveConversationId(newConv.id);
                    // Refresh sidebar
                    const updatedConvs = await getConversations();
                    setConversations(updatedConvs);
                }
            } catch (err) {
                console.error('Error creating conversation:', err);
            }
        }

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

            // ── Increment sentencia query counter ──
            if (user?.id) {
                try {
                    await incrementSentenciaQueryCount(user.id);
                } catch (err) {
                    console.error('Failed to increment sentencia query count:', err);
                }
            }

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
        handleNewConversation();
    }, [handleNewConversation]);

    // ── Loading state ───────────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#c9a962]" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const hasMessages = messages.length > 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    const renderInputArea = (centered: boolean = false) => (
        <div className={`relative transition-all duration-500 ${centered ? 'w-full max-w-3xl' : 'w-full max-w-3xl mx-auto'}`}>
            {/* Attached file indicator */}
            {(attachedFile || extractingFile) && (
                <div className="absolute -top-12 left-0 right-0 flex justify-center">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#c9a962]/20 shadow-lg shadow-black/20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
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

            {/* BD Verificada toggle — just above the prompt */}
            <div className="flex justify-center mb-2">
                <button
                    onClick={toggleRag}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${useRag
                        ? 'bg-red-600/15 text-red-400 border border-red-500/30 hover:bg-red-600/25'
                        : 'bg-red-600/10 text-red-500/80 border border-red-500/20 hover:bg-red-600/20'
                        }`}
                >
                    {useRag ? (
                        <>
                            <DatabaseZap className="w-3.5 h-3.5" />
                            Consulta con datos verificados activa
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Consulta de datos verificados desactivada
                        </>
                    )}
                </button>
            </div>

            <div className={`
                relative bg-[#1a1a1a] border transition-all duration-300 shadow-2xl overflow-hidden group
                ${centered ? 'rounded-[32px] py-1' : 'rounded-[32px]'}
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
                    className="w-full bg-transparent text-white/90 placeholder-white/30 px-6 py-4 pr-32 resize-none outline-none text-[16px] leading-relaxed max-h-[200px] scrollbar-thin scrollbar-thumb-white/10"
                    disabled={isLoading}
                    autoFocus
                />

                <div className="absolute right-3 bottom-3 flex items-center gap-2">
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
                        className="p-2 rounded-full text-white/40 hover:text-[#c9a962] hover:bg-[#c9a962]/10 transition-colors disabled:opacity-30"
                        title="Adjuntar documento"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Send button */}
                    <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className={`
                            p-2 rounded-full transition-all duration-300 flex items-center justify-center
                            ${inputValue.trim() && !isLoading
                                ? 'bg-[#c9a962] text-[#0f0f0f] hover:bg-[#d4b46a] shadow-[0_0_15px_rgba(201,169,98,0.3)] hover:shadow-[0_0_20px_rgba(201,169,98,0.5)] transform hover:scale-105'
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

            {/* Footer hint (only if centered) */}
            {centered && (
                <div className="flex justify-center items-center mt-4 gap-2 opacity-60">
                    <p className="text-[11px] text-white/30 select-none flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#c9a962]/50" />
                        Iurexia Legal AI · Redactor de Sentencias
                    </p>
                </div>
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER MAIN
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#0f0f0f] flex font-sans">
            {/* Sidebar */}
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
            />

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 md:ml-[var(--sidebar-w,18rem)] transition-all duration-300">
                {/* ── Header ─────────────────────────────────────────────────────── */}
                <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0f0f0f]/60">
                    <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
                        {/* Left: Navigation Pills */}
                        <div className="flex items-center gap-2">
                            <Link
                                href="/chat"
                                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90"
                                style={{
                                    background: '#1a1a1a',
                                    color: 'rgba(255,255,255,0.9)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                }}
                            >
                                Chat Iurex<span style={{ color: '#c9a962' }}>ia</span>
                            </Link>
                            <Link
                                href="/redactor-sentencia"
                                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90"
                                style={{
                                    background: '#1a1a1a',
                                    color: '#c9a962',
                                    border: '1px solid rgba(201, 169, 98, 0.3)',
                                }}
                            >
                                Redactor
                            </Link>
                        </div>

                        {/* Right: Clear + Avatar */}
                        <div className="flex items-center gap-3">
                            {hasMessages && (
                                <button
                                    onClick={clearChat}
                                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                                    title="Limpiar chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <UserAvatar />
                        </div>
                    </div>
                </header>

                {/* ── RAG Warning Modal (Same as before) ─────────────────────────── */}
                {showRagWarning && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
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
                <main className="flex-1 flex flex-col relative overflow-hidden">

                    {/* 1. WELCOME VIEW (Empty State) */}
                    {!hasMessages && (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="w-full max-w-3xl flex flex-col gap-10">

                                {/* Greeting */}
                                <div className="text-center">
                                    <h2 className="text-4xl md:text-5xl font-medium text-transparent bg-clip-text bg-gradient-to-br from-[#c9a962] via-white to-white/60 tracking-tight mb-3">
                                        Hola{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}.
                                    </h2>
                                    <p className="text-2xl md:text-3xl text-white/40 font-light">
                                        ¿En qué puedo ayudarte hoy?
                                    </p>
                                    <p className="text-sm text-white/30 mt-4 max-w-lg mx-auto leading-relaxed">
                                        Recuerda que esta herramienta está diseñada especialmente para la redacción judicial. Por favor, formula tus consultas de forma estratégica.
                                    </p>
                                </div>

                                {/* Centered Input */}
                                <div className="w-full">
                                    {renderInputArea(true)}
                                </div>

                                {/* Suggestion Chips (Below Input) */}
                                <div className="flex flex-wrap justify-center gap-3 mt-2">
                                    {[
                                        { label: 'Continuar redacción', desc: 'Retomar escritura' },
                                        { label: 'Cambiar sentido', desc: 'Fundado ↔ Infundado' },
                                        { label: 'Analizar documento', desc: 'Subir PDF/DOCX' },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                if (item.label === 'Analizar documento') {
                                                    fileInputRef.current?.click();
                                                } else {
                                                    setInputValue(`${item.label}: `);
                                                    textareaRef.current?.focus();
                                                }
                                            }}
                                            className="group px-5 py-3 rounded-xl transition-all duration-300"
                                            style={{
                                                background: 'linear-gradient(135deg, #141414 0%, #1e1e1e 100%)',
                                                border: '1px solid rgba(201, 169, 98, 0.15)',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.border = '1px solid rgba(201, 169, 98, 0.4)';
                                                e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 169, 98, 0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.border = '1px solid rgba(201, 169, 98, 0.15)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <span className="block text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                                                {item.label}
                                            </span>
                                            <span className="block text-[11px] mt-0.5" style={{ color: '#c9a962' }}>
                                                {item.desc}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                            </div>
                        </div>
                    )}

                    {/* 2. CHAT VIEW (Active State) */}
                    {hasMessages && (
                        <div className="flex-1 flex flex-col h-full">
                            {/* Messages List - Scrollable */}
                            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-[500px] scroll-smooth">
                                <div className="max-w-3xl mx-auto space-y-8">
                                    {messages.map((msg, idx) => {
                                        // Skip the empty assistant message placeholder — we show the shimmer instead
                                        if (isLoading && idx === messages.length - 1 && msg.role === 'assistant' && !msg.content) {
                                            return null;
                                        }
                                        return (
                                            <ChatMessage
                                                key={idx}
                                                message={msg}
                                                isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
                                                onCitationClick={handleCitationClick}
                                            />
                                        );
                                    })}
                                    {isLoading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
                                        <div className="flex items-start gap-4 px-4">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a962] to-[#8b7355] flex items-center justify-center shrink-0 shadow-lg shadow-[#c9a962]/20 animate-pulse">
                                                <Sparkles className="w-4 h-4 text-[#0f0f0f] animate-spin" style={{ animationDuration: '3s' }} />
                                            </div>
                                            <div className="pt-1.5 flex items-center gap-2">
                                                <span
                                                    className="text-sm font-medium animate-pulse"
                                                    style={{ color: '#c9a962', animationDuration: '2s' }}
                                                >
                                                    Generando respuesta jurídica especializada
                                                </span>
                                                <span className="flex gap-0.5">
                                                    {[0, 1, 2].map((i) => (
                                                        <span
                                                            key={i}
                                                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                                                            style={{
                                                                backgroundColor: '#c9a962',
                                                                animationDelay: `${i * 0.2}s`,
                                                                animationDuration: '1s',
                                                            }}
                                                        />
                                                    ))}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} className="h-4" />
                                </div>
                            </div>

                            {/* Error Bar */}
                            {error && (
                                <div className="max-w-3xl mx-auto w-full px-4 mb-2">
                                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3 backdrop-blur-md">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span>{error}</span>
                                        <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/10 rounded-full transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sticky Bottom Input */}
                            <div className="px-4 pb-6 pt-4 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f] to-transparent z-10">
                                {renderInputArea(false)}
                                <p className="text-center text-[10px] text-white/20 mt-3">
                                    Iurexia Legal AI · Redactor de Sentencias
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Citation viewer is handled by PdfViewerPanel below */}
                </main>

                {/* ══ Sentencia Quota Exceeded Modal ══ */}
                {quotaExceeded && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-[#1a1a1a] border border-[#c9a962]/30 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Scale className="w-8 h-8 text-[#c9a962]" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-white mb-2">
                                    Consultas de Sentencia agotadas
                                </h3>
                                <p className="text-white/60 mb-2">
                                    Has utilizado todas tus consultas del Redactor de Sentencias este mes
                                    ({profile?.sentencia_queries_used}/{profile?.sentencia_queries_limit}).
                                </p>
                                <p className="text-white/40 text-sm mb-6">
                                    Tu cuota se renovará automáticamente cuando se procese tu próximo pago.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setQuotaExceeded(false)}
                                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                    <Link
                                        href="/precios"
                                        className="px-4 py-2 rounded-lg bg-[#c9a962] text-[#0f0f0f] font-medium hover:bg-[#d4b06e] transition-colors"
                                    >
                                        Mejorar plan
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div> {/* End Main Content Wrapper */}

            {/* ══ Citation Source Viewer (PdfViewerPanel) ══ */}
            <PdfViewerPanel
                isOpen={activePdfSource !== null}
                onClose={() => setActivePdfSource(null)}
                source={activePdfSource}
            />
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

