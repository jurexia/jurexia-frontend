'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, MapPin, Scale, Building2, Settings, ChevronDown, BookOpen, FileText, Plus, Crown, ShieldCheck, ArrowRight, Lock, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import UpgradeNudge from '@/components/UpgradeNudge';
import ChatInput from '@/components/ChatInput';
import ChatMessage, { TypingIndicator } from '@/components/ChatMessage';
import DocumentModal from '@/components/DocumentModal';
import ChatSidebar from '@/components/ChatSidebar';
import VisualGuideOverlay from '@/components/VisualGuideOverlay';
import PromptGuide from '@/components/PromptGuide';
import ChatTour from '@/components/ChatTour';
import StateSelectorModal from '@/components/StateSelectorModal';
import WelcomeExperience from '@/components/WelcomeExperience';
import PdfViewerPanel from '@/components/PdfViewerPanel';
import WelcomeVideoModal from '@/components/WelcomeVideoModal';
import NewFeaturesAnnouncementModal from '@/components/NewFeaturesAnnouncementModal';
import FeedbackWidget from '@/components/FeedbackWidget';
// FreeUserOnboardingModal removed — was causing 43% user abandonment (audio-modal blocker)
import { markWelcomeVideoSeen } from '@/lib/supabase';
import { useChat } from '@/hooks/useChat';
import { UserAvatar } from '@/components/UserAvatar';
import { useRequireAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
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

// Suggestion questions — defined outside component for referential stability
const SUGGESTIONS = [
    { text: '¿Procede el amparo indirecto contra la negativa de acceso a un expediente judicial?', label: 'AMPARO' },
    { text: '¿Cuándo se actualiza la guarda y custodia compartida y qué criterios aplica el juez?', label: 'FAMILIAR' },
    { text: '¿Qué consecuencias tiene el despido injustificado durante una incapacidad médica?', label: 'LABORAL' },
    { text: '¿En qué casos es procedente la suspensión provisional en el juicio de amparo?', label: 'CONSTITUCIONAL' },
    { text: '¿Cómo se tramita un divorcio incausado y qué documentos necesito?', label: 'FAMILIAR' },
    { text: '¿Qué requisitos debe cumplir una pensión alimenticia y cómo se calcula?', label: 'FAMILIAR' },
    { text: '¿Cuál es el procedimiento para el reconocimiento de paternidad?', label: 'FAMILIAR' },
    { text: '¿Qué derechos tiene el padre no custodio respecto al régimen de convivencia?', label: 'FAMILIAR' },
    { text: '¿Cómo se impugna una resolución que niega la guarda y custodia?', label: 'FAMILIAR' },
    { text: '¿Qué pasa si me despiden sin liquidación estando embarazada?', label: 'LABORAL' },
    { text: '¿Qué es el derecho a la libertad de expresión y cuál es su fundamento constitucional?', label: 'CONSTITUCIONAL' },
    { text: '¿Cómo registro una marca en México y qué protección otorga?', label: 'MERCANTIL' },
    { text: '¿Qué recursos existen contra una sentencia de amparo directo?', label: 'AMPARO' },
    { text: '¿En qué consiste la adopción plena y cuáles son sus efectos jurídicos?', label: 'FAMILIAR' },
];

export default function ChatPage() {
    // Auth protection - redirects to login if not authenticated
    const { loading: authLoading, isAuthenticated, user, profile } = useRequireAuth();
    const router = useRouter();

    const _PRO_PLUS = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual', 'ultra_secretarios'];
    const isPro = _PRO_PLUS.includes(profile?.subscription_type || '');
    const isProPlus = isPro && !isAdmin(user?.email);
    const canAccessRedactor = isAdmin(user?.email) || profile?.subscription_type === 'ultra_secretarios' || user?.email === 'administracion@iurexia.com' || profile?.can_access_sentencia === true;

    // States
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    const [nudgeBannerDismissed, setNudgeBannerDismissed] = useState(false);
    const [showPrecedentesTour, setShowPrecedentesTour] = useState(false);
    // Index of the Precedentes step in ChatTour (0-based; adjust if TOUR_STEPS order changes)
    const PRECEDENTES_TOUR_STEP = 9;
    const [selectedEstado, setSelectedEstado] = useState<string>('');
    const [showStateModal, setShowStateModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const estadoInitializedRef = useRef(false);
    const [showPromptGuide, setShowPromptGuide] = useState(false);     // ChatTour (Guía Rápida)
    const [showPromptGuideModal, setShowPromptGuideModal] = useState(false); // PromptGuide (¿Cómo hacer mejores consultas?)
    const [showVisualGuide, setShowVisualGuide] = useState(false);
    const [selectedFuero, setSelectedFuero] = useState<string>('');
    const [selectedMateria, setSelectedMateria] = useState<string>('');
    const [activePdfSource, setActivePdfSource] = useState<{
        docId: string; origen: string; ref: string; texto: string;
        pdf_url?: string | null; silo?: string;
        registro?: string | null; tesis_num?: string | null;
        tipo_criterio?: string | null; instancia?: string | null;
        materia?: string | null;
    } | null>(null);

    // Genio Multi-Domain states
    const [activeGenios, setActiveGenios] = useState<string[]>([]);
    const [isCacheActive, setIsCacheActive] = useState(false);
    const [isCacheLoading, setIsCacheLoading] = useState(false);
    const [genioError, setGenioError] = useState<string | null>(null);
    const cacheTimerRef = useRef<NodeJS.Timeout | null>(null);
    const genioErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isDocumentAnalyzing, setIsDocumentAnalyzing] = useState(false);
    const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
    const [showNewFeaturesAnnouncement, setShowNewFeaturesAnnouncement] = useState(false);
    // showFreeOnboarding removed — onboarding now inline via Quick Start buttons
    const creatingConvRef = useRef(false); // Mutex to prevent duplicate conversation creation
    const [showWelcomeExperience, setShowWelcomeExperience] = useState(false);

    // Suggestion rotation state (SUGGESTIONS defined outside component for referential stability)
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [suggestionPhase, setSuggestionPhase] = useState<'typing' | 'visible' | 'fading'>('typing');
    const suggestionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-deactivate cache after 3 minutes of inactivity (safety: evita costos excesivos)
    const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

    const resetCacheTimer = useCallback(() => {
        if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
        cacheTimerRef.current = setTimeout(() => {
            setIsCacheActive(false);
            setIsCacheLoading(false);
            setActiveGenios([]);
        }, CACHE_TTL_MS);
    }, []);

    const handleCacheActive = useCallback(() => {
        setIsCacheActive(true);
        setIsCacheLoading(false);
        resetCacheTimer();
    }, [resetCacheTimer]);

    // When user toggles a Genio — calls /genio/activate for EACH selected genio
    const handleToggleGenios = useCallback(async (genios: string[]) => {
        setActiveGenios(genios);
        setGenioError(null);

        if (genios.length > 0) {
            setIsCacheLoading(true);
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';
                // Activate cache for ALL selected genios in parallel
                const results = await Promise.all(
                    genios.map(async (genioId) => {
                        const res = await fetch(`${API_URL}/genio/activate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ genio_id: genioId }),
                        });
                        return { genioId, ...(await res.json()) };
                    })
                );
                const failed = results.filter(r => !r.success);
                if (failed.length === 0) {
                    setIsCacheActive(true);
                    setIsCacheLoading(false);
                    resetCacheTimer();
                } else {
                    // Remove failed genios, keep successful ones
                    const successIds = results.filter(r => r.success).map(r => r.genioId);
                    const errorMsg = failed.map(f => f.last_error || `Genio ${f.genioId} falló`).join('; ');
                    setGenioError(errorMsg);
                    setActiveGenios(successIds);
                    setIsCacheActive(successIds.length > 0);
                    setIsCacheLoading(false);
                    if (genioErrorTimerRef.current) clearTimeout(genioErrorTimerRef.current);
                    genioErrorTimerRef.current = setTimeout(() => setGenioError(null), 5000);
                }
            } catch (err) {
                console.error('Failed to activate Genio:', err);
                setGenioError(`Error de conexión al activar Genio`);
                setIsCacheLoading(false);
                if (genioErrorTimerRef.current) clearTimeout(genioErrorTimerRef.current);
                genioErrorTimerRef.current = setTimeout(() => setGenioError(null), 5000);
            }
        } else {
            setIsCacheActive(false);
            setIsCacheLoading(false);
            if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
        }
    }, [resetCacheTimer]);

    // Typewriter animation engine
    useEffect(() => {
        const fullText = SUGGESTIONS[suggestionIndex].text;
        let charIndex = 0;

        if (suggestionPhase === 'typing') {
            setDisplayedText('');
            const typeChar = () => {
                charIndex++;
                setDisplayedText(fullText.slice(0, charIndex));
                if (charIndex < fullText.length) {
                    // Variable speed: fast start, slight pause on punctuation
                    const char = fullText[charIndex - 1];
                    const delay = char === '?' || char === ',' || char === '.' ? 80 : 28;
                    suggestionTimerRef.current = setTimeout(typeChar, delay);
                } else {
                    // Typing complete → hold visible
                    suggestionTimerRef.current = setTimeout(() => setSuggestionPhase('fading'), 2500);
                }
            };
            suggestionTimerRef.current = setTimeout(typeChar, 400);
        } else if (suggestionPhase === 'fading') {
            // After fade-out animation completes, move to next
            suggestionTimerRef.current = setTimeout(() => {
                setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
                setSuggestionPhase('typing');
            }, 700);
        }

        return () => {
            if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
        };
    }, [suggestionIndex, suggestionPhase]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
            if (genioErrorTimerRef.current) clearTimeout(genioErrorTimerRef.current);
        };
    }, []);


    const handleQuotaExceeded = useCallback(() => {
        setQuotaExceeded(true);
    }, []);

    // Counter pulse animation state
    const [counterPulse, setCounterPulse] = useState(false);

    // Sync counter with real DB values after each query
    const handleQueryCompleted = useCallback((used: number, limit: number) => {
        setQueriesUsed(used);
        setQueriesLimit(limit);
        // Trigger pulse animation
        setCounterPulse(true);
        setTimeout(() => setCounterPulse(false), 600);
    }, []);

    // Chat Hook
    const { messages, isLoading, error, sendMessage, stopGeneration, clearMessages, setMessages, retryMessage, retryType } = useChat({
        estado: selectedEstado || undefined,
        topK: 30,
        fuero: selectedFuero || undefined,
        materia: selectedMateria || undefined,
        onQuotaExceeded: handleQuotaExceeded,
        onQueryCompleted: handleQueryCompleted,
        genioIds: activeGenios,
        onCacheActive: handleCacheActive,
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
                    // First-time user → premium onboarding experience
                    setShowWelcomeExperience(true);
                }
            }
        }
    }, [profile]);

    // Welcome video — show once for Pro+ users who haven't seen it
    useEffect(() => {
        if (!profile || !user) return;
        const isProUser = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual', 'ultra_secretarios'].includes(profile.subscription_type || '');
        const isAdminUser = isAdmin(user.email);
        if (isProUser && !isAdminUser && !profile.has_seen_welcome_video) {
            setShowWelcomeVideo(true);
        }
    }, [profile, user]);

    // New features announcement (Redacción Pro + Precedentes) — show once for Pro/Platinum
    // Triggered after Welcome video to avoid stacking modals
    useEffect(() => {
        if (!profile || !user) return;
        const isProOrPlatinum = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual', 'ultra_secretarios'].includes(profile.subscription_type || '');
        if (!isProOrPlatinum) return;

        const dismissed = typeof window !== 'undefined'
            ? localStorage.getItem(`iurexia_pro_features_announcement_v1_${user.id}`) === '1'
            : true;
        if (dismissed) return;
        if (showWelcomeVideo) return; // wait until welcome video is closed

        // Small delay so it doesn't appear instantly on load
        const t = setTimeout(() => setShowNewFeaturesAnnouncement(true), 600);
        return () => clearTimeout(t);
    }, [profile, user, showWelcomeVideo]);

    const handleNewFeaturesAnnouncementClose = useCallback(() => {
        setShowNewFeaturesAnnouncement(false);
        if (user?.id && typeof window !== 'undefined') {
            localStorage.setItem(`iurexia_pro_features_announcement_v1_${user.id}`, '1');
        }
    }, [user]);

    // Free user onboarding removed — was causing 43% user abandonment
    // Now handled inline via Quick Start suggestion buttons in empty state

    const handleWelcomeVideoClose = useCallback(async () => {
        setShowWelcomeVideo(false);
        if (user?.id) {
            await markWelcomeVideoSeen(user.id);
        }
    }, [user]);



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

    // "Ensure conversation exists" useEffect REMOVED — was a race condition source
    // Conversations are now created lazily in handleSendMessage/handleDocumentSubmit only

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
        // Lazy creation: just reset the UI. The conversation row in DB
        // will be created when the user sends their first message.
        setActiveConvId(null);
        setActiveConversationId(null);
        clearMessages();
    }, [clearMessages]);

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
        // Reset document analyzing state in case it was stuck from a previous analysis
        setIsDocumentAnalyzing(false);
        const isAdminUser = isAdmin(user?.email);
        const remaining = queriesLimit - queriesUsed;
        if (remaining <= 0 && !isAdminUser) {
            setShowLimitModal(true);
            return;
        }

        // Ensure conversation exists BEFORE sending (sequential, no race condition)
        let convId = activeConversationId;
        if (!convId && !creatingConvRef.current) {
            creatingConvRef.current = true;
            try {
                const newConv = await createConversation(selectedEstado || undefined);
                if (newConv) {
                    convId = newConv.id;
                    setActiveConvId(newConv.id);
                    setActiveConversationId(newConv.id);
                }
            } finally {
                creatingConvRef.current = false;
            }
        }

        if (!isAdminUser) {
            setQueriesUsed(prev => prev + 1);
        }
        await sendMessage(content, enableReasoning);
    }, [user, sendMessage, activeConversationId, selectedEstado, queriesLimit, queriesUsed]);

    // Document analysis via Gemini Flash (streaming from /analyze-document)
    const handleDocumentSubmit = useCallback(async (file: File, prompt: string, displayMessage: string) => {
        if (!user) return;
        const isAdminUser = isAdmin(user?.email);
        const remaining = queriesLimit - queriesUsed;
        if (remaining <= 0 && !isAdminUser) {
            setShowLimitModal(true);
            return;
        }
        if (!isAdminUser) {
            setQueriesUsed(prev => prev + 1);
        }

        // Add user message to chat
        const userMsg = { role: 'user' as const, content: displayMessage };
        setMessages(prev => [...prev, userMsg]);
        setIsDocumentAnalyzing(true);

        // Ensure conversation exists
        if (!activeConversationId) {
            const newConv = await createConversation(selectedEstado || undefined);
            if (newConv) {
                setActiveConvId(newConv.id);
                setActiveConversationId(newConv.id);
            }
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prompt', prompt);
        if (user.id) formData.append('user_id', user.id);

        try {
            const response = await fetch(`${API_URL}/analyze-document`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error al analizar documento' }));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No se pudo iniciar la lectura del análisis');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.token) {
                                // On first token, hide typing indicator
                                setIsDocumentAnalyzing(false);
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.role === 'assistant') {
                                        updated[updated.length - 1] = {
                                            ...last,
                                            content: last.content + data.token
                                        };
                                    } else {
                                        // First token — create assistant message
                                        updated.push({ role: 'assistant' as const, content: data.token });
                                    }
                                    return updated;
                                });
                            } else if (data.error) {
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.role === 'assistant') {
                                        updated[updated.length - 1] = {
                                            ...last,
                                            content: `❌ Error al analizar documento: ${data.error}`
                                        };
                                    } else {
                                        updated.push({ role: 'assistant' as const, content: `❌ Error al analizar documento: ${data.error}` });
                                    }
                                    return updated;
                                });
                                setIsDocumentAnalyzing(false);
                            }
                        } catch {}
                    }
                }
            }
        } catch (err: any) {
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: `❌ Error: ${err.message || 'Error inesperado al analizar documento'}`
                    };
                } else {
                    updated.push({ role: 'assistant' as const, content: `❌ Error: ${err.message || 'Error inesperado al analizar documento'}` });
                }
                return updated;
            });
        } finally {
            // ALWAYS reset — guarantees export bar (PDF/DOCX/Print) appears after response
            setIsDocumentAnalyzing(false);
            // Sync counter with real DB values after document analysis
            if (user?.id && !isAdmin(user?.email)) {
                try {
                    const { getSubscriptionInfo } = await import('@/lib/supabase');
                    const info = await getSubscriptionInfo(user.id);
                    if (info) {
                        setQueriesUsed(info.queriesUsed);
                        setQueriesLimit(info.queriesLimit);
                        setCounterPulse(true);
                        setTimeout(() => setCounterPulse(false), 600);
                    }
                } catch {}
            }
        }
    }, [user, activeConversationId, selectedEstado, queriesLimit, queriesUsed, setMessages]);

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
                onToggleGuide={() => setShowPromptGuide(true)}
            />

            <div className="flex flex-col h-screen md:ml-72">
                <header className="fixed top-0 left-0 right-0 md:left-72 z-30 bg-cream-300/80 backdrop-blur-md border-b border-black/5 h-14">
                    <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-end gap-2">
                        <Link href="/salvame" className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-charcoal-900 text-white text-xs font-bold hover:bg-charcoal-800 shadow-sm tracking-wide">
                            <Plus className="w-4 h-4 text-red-600 stroke-[4]" />
                            <span className="hidden sm:inline">SALVAME</span>
                        </Link>

                        <Link href="/normativa" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 shadow-sm">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Normativa</span>
                        </Link>

                        <button data-guide="jurisdiccion" onClick={() => setShowConfigModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #8B6914 100%)' }}>
                            <span className="hidden sm:inline text-white/70">Jurisdicción:</span>
                            <span className="truncate">{selectedEstado ? selectedEstadoLabel : 'Todas'}</span>
                        </button>

                        <div className={`px-3 py-1.5 bg-cream-100 rounded-lg text-xs font-medium transition-all duration-300 ${counterPulse ? 'ring-2 ring-accent-gold/40 scale-105' : ''}`}>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="hidden sm:inline text-charcoal-500">Consultas</span>
                                    <span className={`font-bold tabular-nums ${queriesRemaining <= 1 ? 'text-red-600' : queriesRemaining <= 3 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                        {queriesUsed}<span className="text-charcoal-400 font-normal">/{queriesLimit}</span>
                                    </span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="hidden sm:block w-12 h-1.5 bg-charcoal-200/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                                            queriesRemaining <= 1 ? 'bg-red-500' : queriesRemaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (queriesUsed / Math.max(1, queriesLimit)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <UserAvatar />
                    </div>
                </header>

                {/* Progressive Nudge Banner — shows when queries running low */}
                {!isPro && !nudgeBannerDismissed && queriesRemaining > 0 && queriesRemaining <= 2 && hasMessages && (
                    <div className="fixed top-14 left-0 right-0 md:left-72 z-25 animate-in slide-in-from-top duration-500">
                        <div className="bg-gradient-to-r from-amber-50 via-amber-100/80 to-yellow-50 border-b border-accent-gold/20 px-4 py-2.5">
                            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-accent-gold/15 flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-3.5 h-3.5 text-accent-gold" />
                                    </div>
                                    <p className="text-sm text-charcoal-700 truncate">
                                        {queriesRemaining === 1
                                            ? <><strong>Última consulta</strong> — no pierdas el impulso de tu investigación</>
                                            : <>Te quedan <strong>{queriesRemaining} consultas</strong> este mes · Activa Pro para no quedarte sin respuestas</>
                                        }
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link href="/precios" className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-gold text-white text-xs font-bold hover:bg-accent-gold/90 transition-colors">
                                        Conocer planes <ArrowRight className="w-3 h-3" />
                                    </Link>
                                    <button onClick={() => setNudgeBannerDismissed(true)} className="text-charcoal-400 hover:text-charcoal-600 transition-colors text-lg leading-none">×</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Anuncio de Precedentes Judiciales removido — sustituido por NewFeaturesAnnouncementModal
                    que cubre Redacción Pro + Precedentes en un solo walkthrough. */}

                <main className="flex-1 pt-14 overflow-y-auto">
                    {!hasMessages ? (
                        <div className="h-full flex flex-col items-center justify-center px-3 sm:px-4 -mt-4 sm:-mt-8">
                            <div className="max-w-2xl w-full text-center">
                                <div className="mb-2 sm:mb-4">
                                    <Link href="/" className="cursor-pointer hover:opacity-90 transition-opacity">
                                        <span className="font-serif text-3xl sm:text-5xl font-semibold text-charcoal-900">
                                            Iurex<span className="text-accent-gold">ia</span>
                                        </span>
                                    </Link>
                                </div>
                                <h2 className="font-serif text-lg sm:text-2xl font-medium text-charcoal-900 mb-3 sm:mb-4">
                                    ¿En qué te puedo ayudar{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}?
                                </h2>

                                {/* Typewriter suggestion — fades in/out progressively */}
                                <div className="mb-6 sm:mb-10 max-w-lg mx-auto min-h-[3rem] flex items-center justify-center">
                                    <button
                                        onClick={() => handleSendMessage(SUGGESTIONS[suggestionIndex].text, true)}
                                        className="group cursor-pointer text-center px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-300"
                                    >
                                        <span
                                            className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-500 block mb-1 ${
                                                suggestionPhase === 'fading' ? 'opacity-0' : 'opacity-60'
                                            } text-accent-gold`}
                                        >
                                            {SUGGESTIONS[suggestionIndex].label}
                                        </span>
                                        <span
                                            className={`font-serif italic text-charcoal-900/50 group-hover:text-charcoal-900/80 text-sm sm:text-base leading-relaxed transition-opacity duration-700 ${
                                                suggestionPhase === 'fading' ? 'opacity-0' : 'opacity-100'
                                            }`}
                                        >
                                            &ldquo;{displayedText}
                                            {suggestionPhase === 'typing' && (
                                                <span className="inline-block w-[2px] h-[1em] bg-accent-gold/60 ml-[1px] align-text-bottom" style={{ animation: 'blink 0.8s step-end infinite' }} />
                                            )}
                                            {suggestionPhase !== 'typing' && '\u201D'}
                                        </span>
                                        <span className="block mt-1.5 text-[10px] text-charcoal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            Haz clic para consultar →
                                        </span>
                                    </button>
                                    <style>{`
                                        @keyframes blink {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0; }
                                        }
                                    `}</style>
                                </div>


                                <ChatInput
                                    onSubmit={handleSendMessage}
                                    onDocumentSubmit={handleDocumentSubmit}
                                    onStop={stopGeneration}
                                    isLoading={isLoading}
                                    placeholder="Escribe tu consulta legal..."
                                    estado={selectedEstado}
                                    activeGenios={activeGenios}
                                    setActiveGenios={handleToggleGenios}
                                    isCacheActive={isCacheActive}
                                    isCacheLoading={isCacheLoading}
                                    genioError={genioError}
                                    isPro={isPro}
                                    selectedFuero={selectedFuero}
                                    onFueroChange={setSelectedFuero}
                                    selectedMateria={selectedMateria}
                                    onMateriaChange={setSelectedMateria}
                                />

                                <div className="mt-4 text-center">
                                    <p className="text-xs text-charcoal-500 mb-2">Mejor pregunta = mejor resultado.</p>
                                    <button
                                        onClick={() => setShowPromptGuideModal(true)}
                                        className="flex items-center gap-1.5 mx-auto"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        <span style={{
                                            display: 'inline-block',
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: '#dc2626',
                                            animation: 'redPulse 1.4s ease-in-out infinite',
                                            flexShrink: 0,
                                        }} />
                                        <span style={{
                                            fontSize: '12px', fontWeight: 800,
                                            color: '#dc2626',
                                            letterSpacing: '0.01em',
                                            textDecoration: 'none',
                                        }}>
                                            ¿Cómo hacer mejores consultas?
                                        </span>
                                    </button>
                                    <style>{`
                                        @keyframes redPulse {
                                            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
                                            50% { opacity: 0.7; box-shadow: 0 0 0 5px rgba(220,38,38,0); }
                                        }
                                    `}</style>

                                    {/* Admin-only: Link to DeepSeek sentence drafting chat */}
                                    {canAccessRedactor && (
                                        <div className="mt-3">
                                            <Link
                                                href="/redaccionsentencias"
                                                className="inline-flex items-center justify-center px-8 py-3 rounded-full text-sm font-bold text-white bg-charcoal-900 shadow-md hover:bg-black transition-all duration-200 hover:scale-[1.02]"
                                            >
                                                Crea un borrador de sentencia
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-6 pb-[500px] space-y-4">
                            {messages.map((message, index) => {
                                // Count assistant messages up to this point
                                const assistantCount = messages.slice(0, index + 1).filter(m => m.role === 'assistant').length;
                                const showNudge = !isPro && message.role === 'assistant' && assistantCount > 0 && assistantCount % 3 === 0 && index !== messages.length - 1;
                                return (
                                    <div key={index}>
                                        <ChatMessage message={message} isStreaming={(isLoading || isDocumentAnalyzing) && index === messages.length - 1 && message.role === 'assistant'} onCitationClick={handleCitationClick} />
                                        {showNudge && <UpgradeNudge messageIndex={assistantCount} />}
                                    </div>
                                );
                            })}
                            {(isLoading || isDocumentAnalyzing) && messages[messages.length - 1]?.role === 'user' && <TypingIndicator retryMessage={retryMessage || undefined} retryType={retryType || undefined} />}
                            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">Error: {error}</div>}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </main>

                {hasMessages && (
                    <div className="fixed bottom-0 left-0 right-0 md:left-72 bg-gradient-to-t from-cream-300 via-cream-300 pt-8 pb-6 px-4 z-20">
                        <ChatInput
                            onSubmit={handleSendMessage}
                            onDocumentSubmit={handleDocumentSubmit}
                            onStop={stopGeneration}
                            isLoading={isLoading}
                            estado={selectedEstado}
                            activeGenios={activeGenios}
                            setActiveGenios={handleToggleGenios}
                            isCacheActive={isCacheActive}
                            isCacheLoading={isCacheLoading}
                            genioError={genioError}
                            isPro={isPro}
                            selectedFuero={selectedFuero}
                            onFueroChange={setSelectedFuero}
                            selectedMateria={selectedMateria}
                            onMateriaChange={setSelectedMateria}
                        />
                    </div>
                )}
            </div>

            {showWelcomeExperience && user && (
                <WelcomeExperience
                    userId={user.id}
                    userName={profile?.full_name ?? undefined}
                    onComplete={(estado) => {
                        setSelectedEstado(estado);
                        setShowWelcomeExperience(false);
                        if (user?.id) localStorage.setItem(`iurexia_welcome_guide_${user.id}`, 'true');
                    }}
                    onStartTour={() => setShowPromptGuide(true)}
                />
            )}
            {showStateModal && user && <StateSelectorModal userId={user.id} onSelectEstado={(e) => {
                setSelectedEstado(e);
                setShowStateModal(false);
            }} />}
            {showConfigModal && user && <StateSelectorModal userId={user.id} isConfig={true} currentEstado={selectedEstado} onClose={() => setShowConfigModal(false)} onSelectEstado={(e) => { setSelectedEstado(e); setShowConfigModal(false); }} />}

            {showLimitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                        {/* Header gradient */}
                        <div className="relative px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1a1510 0%, #0f0f0f 100%)' }}>
                            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Crown className="w-7 h-7 text-accent-gold" />
                            </div>
                            <h3 className="font-serif text-2xl font-semibold text-white text-center mb-2">Tu talento jurídico merece herramientas a su altura</h3>
                            <p className="text-white/50 text-xs text-center">Has agotado tus consultas gratuitas este mes</p>
                        </div>

                        {/* Plan comparison */}
                        <div className="px-8 py-5">
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {/* Current */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Tu plan actual</p>
                                    <p className="text-white font-bold text-sm">Gratuito</p>
                                    <p className="text-white/40 text-xs mt-1">5 consultas/mes</p>
                                    <p className="text-red-400/80 text-xs mt-2 font-medium">0 restantes</p>
                                </div>
                                {/* Pro - highlighted */}
                                <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-xl p-4 relative">
                                    <div className="absolute -top-2 right-3 px-2 py-0.5 bg-accent-gold rounded-full text-[9px] font-bold text-black uppercase">Popular</div>
                                    <p className="text-[10px] font-semibold text-accent-gold uppercase tracking-wider mb-2">Recomendado</p>
                                    <p className="text-white font-bold text-sm">Pro</p>
                                    <p className="text-accent-gold/80 text-xs mt-1">140 consultas/mes</p>
                                    <p className="text-accent-gold text-sm mt-2 font-bold">$149/mes</p>
                                </div>
                            </div>

                            {/* New features */}
                            <div className="space-y-2 mb-5">
                                <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                    <span className="text-accent-gold text-sm mt-0.5">⚡</span>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Genios Especializados de IA</p>
                                        <p className="text-white/40 text-[11px]">Amparo, Civil, Penal, CIDH — análisis que tomaría 3+ horas</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                    <span className="text-accent-gold text-sm mt-0.5">🏛️</span>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Nuevo: Consulta de Sentencias por Circuito</p>
                                        <p className="text-white/40 text-[11px]">Accede a precedentes judiciales de tribunales colegiados</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                    <span className="text-accent-gold text-sm mt-0.5">🔍</span>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Análisis y Auditoría de Documentos</p>
                                        <p className="text-white/40 text-[11px]">Sube contratos o sentencias para revisión con IA</p>
                                    </div>
                                </div>
                            </div>

                            {/* Social proof */}
                            <p className="text-center text-white/40 text-xs mb-5">
                                Únete a la comunidad de <span className="text-white font-semibold">más de 1,500 profesionales del derecho</span> con suscripción activa
                            </p>

                            {/* CTA */}
                            <Link
                                href="/precios"
                                className="block w-full py-3.5 rounded-xl text-center font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-95 mb-3"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)', color: '#1a1a1a' }}
                            >
                                Activar Plan Pro — $149/mes
                            </Link>
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <Link href="/precios" className="text-white/40 hover:text-white/70 text-xs transition-colors">Ver todos los planes →</Link>
                                <span className="text-white/20">·</span>
                                <button onClick={() => setShowLimitModal(false)} className="text-white/40 hover:text-white/70 text-xs transition-colors">Cerrar</button>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-1.5 text-white/30 text-xs">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Pago seguro con Stripe</span>
                                </div>
                                <span className="text-white/15">·</span>
                                <span className="text-white/30 text-xs">Cancela cuando quieras</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {quotaExceeded && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                        {/* Header gradient */}
                        <div className="relative px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1a1510 0%, #0f0f0f 100%)' }}>
                            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Crown className="w-7 h-7 text-accent-gold" />
                            </div>
                            <h3 className="font-serif text-2xl font-semibold text-white text-center mb-2">Tu talento jurídico merece herramientas a su altura</h3>
                            <p className="text-white/50 text-xs text-center">La consulta no pudo completarse — límite de plan alcanzado</p>
                        </div>

                        {/* Plan comparison */}
                        <div className="px-8 py-5">
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Tu plan actual</p>
                                    <p className="text-white font-bold text-sm">{profile?.subscription_type === 'gratuito' ? 'Gratuito' : 'Plan actual'}</p>
                                    <p className="text-white/40 text-xs mt-1">{queriesLimit} consultas/mes</p>
                                    <p className="text-red-400/80 text-xs mt-2 font-medium">0 restantes</p>
                                </div>
                                <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-xl p-4 relative">
                                    <div className="absolute -top-2 right-3 px-2 py-0.5 bg-accent-gold rounded-full text-[9px] font-bold text-black uppercase">Popular</div>
                                    <p className="text-[10px] font-semibold text-accent-gold uppercase tracking-wider mb-2">Recomendado</p>
                                    <p className="text-white font-bold text-sm">Pro</p>
                                    <p className="text-accent-gold/80 text-xs mt-1">140 consultas/mes</p>
                                    <p className="text-accent-gold text-sm mt-2 font-bold">$149/mes</p>
                                </div>
                            </div>

                            {/* New features */}
                            <div className="space-y-2 mb-5">
                                <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                    <span className="text-accent-gold text-sm mt-0.5">⚡</span>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Genios Especializados de IA</p>
                                        <p className="text-white/40 text-[11px]">Amparo, Civil, Penal, CIDH — análisis multi-genio avanzado</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                    <span className="text-accent-gold text-sm mt-0.5">🏛️</span>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Nuevo: Consulta de Sentencias por Circuito</p>
                                        <p className="text-white/40 text-[11px]">Precedentes judiciales de tribunales colegiados</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                    <span className="text-accent-gold text-sm mt-0.5">🔍</span>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Auditoría Inteligente de Documentos</p>
                                        <p className="text-white/40 text-[11px]">Sube documentos para revisión automatizada con IA</p>
                                    </div>
                                </div>
                            </div>

                            {/* Social proof */}
                            <p className="text-center text-white/40 text-xs mb-5">
                                Únete a <span className="text-white font-semibold">más de 1,500 profesionales del derecho</span> con suscripción activa — no te quedes atrás
                            </p>

                            {/* CTA */}
                            <Link
                                href="/precios"
                                className="block w-full py-3.5 rounded-xl text-center font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-95 mb-3"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)', color: '#1a1a1a' }}
                            >
                                Activar Plan Pro — $149/mes
                            </Link>
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <Link href="/precios" className="text-white/40 hover:text-white/70 text-xs transition-colors">Ver todos los planes →</Link>
                                <span className="text-white/20">·</span>
                                <button onClick={() => setQuotaExceeded(false)} className="text-white/40 hover:text-white/70 text-xs transition-colors">Cerrar</button>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-1.5 text-white/30 text-xs">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Pago seguro con Stripe</span>
                                </div>
                                <span className="text-white/15">·</span>
                                <span className="text-white/30 text-xs">Cancela cuando quieras</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PromptGuide isOpen={showPromptGuideModal} onClose={() => setShowPromptGuideModal(false)} />
            <ChatTour
                isOpen={showPromptGuide || showPrecedentesTour}
                onClose={() => { setShowPromptGuide(false); setShowPrecedentesTour(false); }}
                startStep={showPrecedentesTour ? PRECEDENTES_TOUR_STEP : 0}
            />

            <PdfViewerPanel isOpen={activePdfSource !== null} onClose={() => setActivePdfSource(null)} source={activePdfSource} />

            <WelcomeVideoModal isOpen={showWelcomeVideo} onClose={handleWelcomeVideoClose} />

            <NewFeaturesAnnouncementModal
                isOpen={showNewFeaturesAnnouncement}
                onClose={handleNewFeaturesAnnouncementClose}
            />

            {/* FreeUserOnboardingModal + old WelcomeGuidePrompt REMOVED — replaced by WelcomeExperience */}

            {/* ═══ FEEDBACK WIDGET — Botón flotante inferior derecho ═══ */}
            {user && (
                <FeedbackWidget
                    userId={user.id}
                    userEmail={user.email ?? undefined}
                    userName={profile?.full_name ?? undefined}
                />
            )}
        </div>
    );
}
