'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Square,
    Paperclip,
    Search,
    Sparkles,
    Shield,
    FileEdit,
    Gavel,
    Brain,
    Scale,
    PenTool,
    Lock,
    Mic,
    BookOpen,
    BarChart2
} from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import { FileText, X } from 'lucide-react';
import TextEnhanceModal from './TextEnhanceModal';
import DraftModal, { DraftRequest } from './DraftModal';
import SentenciaModal from './SentenciaModal';
import JurimetriaModal from './JurimetriaModal';
import { enhanceText } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';

interface ChatInputProps {
    onSubmit: (message: string, enableReasoning?: boolean) => void;
    onDocumentSubmit?: (file: File, prompt: string, displayMessage: string) => void;
    onStop?: () => void;
    isLoading?: boolean;
    placeholder?: string;
    estado?: string;
    activeGenios?: string[];
    setActiveGenios?: (genios: string[]) => void;
    isCacheActive?: boolean;
    isCacheLoading?: boolean;
    genioError?: string | null;
    isPro?: boolean;
    selectedFuero?: string[];
    onFueroChange?: (fueros: string[]) => void;
    selectedMateria?: string;
    onMateriaChange?: (materia: string) => void;
}

export default function ChatInput({
    onSubmit,
    onDocumentSubmit,
    onStop,
    isLoading = false,
    placeholder = "Escribe tu consulta legal o sube tu documento para análisis",
    estado,
    activeGenios = [],
    setActiveGenios,
    isCacheActive = false,
    isCacheLoading = false,
    genioError = null,
    isPro = false,
    selectedFuero = [],
    onFueroChange,
    selectedMateria = '',
    onMateriaChange,
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [activeMode, setActiveMode] = useState<'search' | 'files' | 'enhance' | 'draft' | 'sentencia' | 'precedentes'>('search');
    const [chatMode, setChatMode] = useState<'buscar' | 'redactar'>('buscar');
    const [redactarPro, setRedactarPro] = useState(false);
    const [selectedCircuit, setSelectedCircuit] = useState<number | 'ALL' | null>(null);
    const [tribunalFilter, setTribunalFilter] = useState<string | null>(null);
    // Precedentes: corte (SCJN | TCC | ALL) y sala SCJN (PLENO | PRIMERA_SALA | SEGUNDA_SALA | null=todas)
    const [selectedCorte, setSelectedCorte] = useState<'SCJN' | 'TCC' | 'ALL'>('SCJN');
    const [selectedSala, setSelectedSala] = useState<'PLENO' | 'PRIMERA_SALA' | 'SEGUNDA_SALA' | null>(null);
    const [showFileModal, setShowFileModal] = useState(false);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showSentenciaModal, setShowSentenciaModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState<'pro' | 'platinum' | null>(null);
    const [showJurimetriaModal, setShowJurimetriaModal] = useState(false);
    const [attachedDocument, setAttachedDocument] = useState<{ file: File; fileName: string } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);
    const baseMessageRef = useRef('');
    const { user, profile } = useAuth();

    // ── Datos de circuitos y tribunales ──────────────────────────────────
    const AVAILABLE_CIRCUITS = [1, 2, 3, 4, 6, 16, 22];

    const CIRCUIT_TRIBUNALS: Record<number, { id: string; label: string; available: boolean; grupo?: string }[]> = {
        1: [
            // Materia Administrativa (1–24)
            ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,18,20,21,22,23,24] as number[]).map(n => ({
                id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM'
            })),
            // Materia Civil (1–15)
            ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] as number[]).map(n => ({
                id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV'
            })),
            // Materia Laboral (1–15)
            ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] as number[]).map(n => ({
                id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB'
            })),
            // Materia Penal (1–9)
            ...([1,2,3,4,5,6,7,8,9] as number[]).map(n => ({
                id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN'
            })),
        ],
        2: [
            // Materia Administrativa (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        4: [
            // Materia Administrativa (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–5)
            ...([1,2,3,4,5] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        3: [
            // Materia Administrativa (1–7)
            ...([1,2,3,4,5,6,7] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–6)
            ...([1,2,3,4,5,6] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–6)
            ...([1,2,3,4,5,6] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        6: [
            // Materia Administrativa (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        16: [
            // Materia Administrativa (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        22: [
            { id: '1TCC',      label: '1° ADM/CIV', available: true },
            { id: '2TCC',      label: '2° ADM/CIV', available: true },
            { id: '3TCC',      label: '3° ADM/CIV', available: true },
            { id: 'TCC_PENAL', label: 'PEN·ADM',    available: true },
            { id: 'TCC_ADM',   label: 'ADM·TRAB',   available: true },
        ],
    };

    const ORDINAL_ES = [
        '', '1°','2°','3°','4°','5°','6°','7°','8°','9°','10°',
        '11°','12°','13°','14°','15°','16°','17°','18°','19°','20°',
        '21°','22°','23°','24°','25°','26°','27°','28°','29°','30°',
        '31°','32°',
    ];
    const canAccessRedactor = isAdmin(user?.email) || profile?.subscription_type === 'ultra_secretarios' || profile?.can_access_sentencia === true;
    const canAccessSentencia = profile?.subscription_type && !['gratuito', 'basico_monthly'].includes(profile.subscription_type);
    const isFreeUser = !profile?.subscription_type || ['gratuito', 'basico_monthly'].includes(profile.subscription_type);
    const isGenioLocked = isFreeUser && !isAdmin(user?.email);
    const _PRO_PLUS = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual', 'ultra_secretarios'];
    const canAccessPrecedentes = isAdmin(user?.email) || _PRO_PLUS.includes(profile?.subscription_type ?? '');
    const canAccessJurimetria  = isAdmin(user?.email) || ['platinum_monthly', 'platinum_annual', 'ultra_secretarios'].includes(profile?.subscription_type ?? '');
    const canAccessTccBeta     = isAdmin(user?.email) || ['platinum_monthly', 'platinum_annual', 'ultra_secretarios'].includes(profile?.subscription_type ?? '');
    const canAccessRedactarPro = isAdmin(user?.email) || _PRO_PLUS.includes(profile?.subscription_type ?? '');

    const geniosList = [
        {
            id: 'cidh', label: 'CIDH', dot: 'bg-cyan-500',
            activeOn: 'bg-gradient-to-r from-cyan-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white border-cyan-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-cyan-600'
        },
        {
            id: 'amparo', label: 'Amparo', dot: 'bg-purple-500',
            activeOn: 'bg-gradient-to-r from-purple-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-purple-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-purple-600'
        },
        {
            id: 'civil', label: 'Civil', dot: 'bg-blue-500',
            activeOn: 'bg-gradient-to-r from-blue-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white border-blue-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-blue-600'
        },
        {
            id: 'penal', label: 'Penal', dot: 'bg-rose-500',
            activeOn: 'bg-gradient-to-r from-rose-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-rose-600'
        },
        {
            id: 'laboral', label: 'Laboral', dot: 'bg-amber-500',
            activeOn: 'bg-gradient-to-r from-amber-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-amber-600 to-orange-700 text-white border-amber-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-amber-600'
        },
        {
            id: 'agrario', label: 'Agrario', dot: 'bg-lime-500',
            activeOn: 'bg-gradient-to-r from-lime-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-lime-600 to-green-700 text-white border-lime-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-lime-600'
        },
        {
            id: 'fiscal', label: 'Fiscal', dot: 'bg-violet-500',
            activeOn: 'bg-gradient-to-r from-violet-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-violet-600 to-purple-700 text-white border-violet-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-violet-600'
        },
        {
            id: 'mercantil', label: 'Mercantil', dot: 'bg-amber-500',
            activeOn: 'bg-gradient-to-r from-amber-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-amber-600 to-yellow-700 text-white border-amber-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-amber-600'
        },
        {
            id: 'administrativo', label: 'Adtvo', dot: 'bg-teal-500',
            activeOn: 'bg-gradient-to-r from-teal-50 to-white border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.2)]',
            activating: 'bg-gradient-to-r from-teal-600 to-cyan-700 text-white border-teal-400',
            idle: 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a962]/40 hover:bg-gray-50',
            spinnerBorder: 'border-[#c9a962]', iconOn: 'text-teal-600'
        },
    ];

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'es-MX';

                recognition.onstart = () => setIsListening(true);

                recognition.onresult = (event: any) => {
                    let fullSessionTranscript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        fullSessionTranscript += event.results[i][0].transcript;
                    }

                    const newMsg = baseMessageRef.current + (baseMessageRef.current && fullSessionTranscript ? ' ' : '') + fullSessionTranscript;
                    setMessage(newMsg);

                    if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    // Default to global search when entering Precedentes mode; reset tribunal on exit
    useEffect(() => {
        if (activeMode === 'precedentes' && selectedCircuit === null) {
            setSelectedCircuit('ALL');
        }
        if (activeMode !== 'precedentes') {
            setTribunalFilter(null);
        }
    }, [activeMode]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('El dictado por voz no es compatible con este navegador. Te recomendamos usar Google Chrome o Safari.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            baseMessageRef.current = message;
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Error starting recognition", e);
            }
        }
    };


    const handleSubmit = () => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (!isLoading && (message.trim() || attachedDocument)) {
            let finalMessage = message.trim();

            // If there's an attached document, use dedicated document analysis endpoint
            if (attachedDocument) {
                const userPrompt = finalMessage || 'Analiza este documento y genera un resumen ejecutivo completo';
                const displayMessage = `📄 **Documento adjunto:** ${attachedDocument.fileName}\n\n${userPrompt}`;

                if (onDocumentSubmit) {
                    // New flow: send raw file to /analyze-document for full analysis
                    onDocumentSubmit(attachedDocument.file, userPrompt, displayMessage);
                } else {
                    // Fallback: send as text message (legacy)
                    onSubmit(displayMessage, true);
                }

                setAttachedDocument(null);
                setMessage('');
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
                return;
            }

            // Prepend [MODO_REDACCION] or [MODO_REDACCION_PRO] marker when in Redactar mode
            if (chatMode === 'redactar') {
                finalMessage = redactarPro
                    ? `[MODO_REDACCION_PRO] ${finalMessage}`
                    : `[MODO_REDACCION] ${finalMessage}`;
            }

            // Prepend [MODO_PRECEDENTES] marker when in Precedentes mode
            if (activeMode === 'precedentes') {
                const corteTag = ` [CORTE:${selectedCorte}]`;
                let extraTags = '';
                if (selectedCorte === 'SCJN') {
                    if (selectedSala) extraTags += ` [SALA:${selectedSala}]`;
                } else if (selectedCorte === 'TCC') {
                    if (selectedCircuit && selectedCircuit !== 'ALL') extraTags += ` [CIRCUITO:${selectedCircuit}]`;
                    if (tribunalFilter) extraTags += ` [TRIBUNAL:${tribunalFilter}]`;
                }
                finalMessage = `[MODO_PRECEDENTES]${corteTag}${extraTags} ${finalMessage}`;
            }

            // Always use reasoning for maximum quality
            onSubmit(finalMessage, true);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends — Shift+Enter inserts newline
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    const handleFileExtracted = (file: File, fileName: string) => {
        // Attach raw file for backend-side analysis (Gemini Flash 1M context)
        setAttachedDocument({ file, fileName });
        setActiveMode('search');
    };

    const handleEnhanceText = async (text: string, docType: string): Promise<string> => {
        const response = await enhanceText(text, docType, estado);
        return response.texto_mejorado;
    };

    const handleModeClick = (mode: 'search' | 'files' | 'enhance' | 'draft' | 'sentencia') => {
        setActiveMode(mode);
        if (mode === 'files') {
            setShowFileModal(true);
        } else if (mode === 'enhance') {
            setShowEnhanceModal(true);
        } else if (mode === 'draft') {
            setShowDraftModal(true);
        } else if (mode === 'sentencia') {
            setShowSentenciaModal(true);
        }
    };

    const handleDraft = (draftRequest: DraftRequest) => {
        // Create a special message that triggers draft mode in the backend
        let draftMessage: string;

        if (draftRequest.tipo === 'denuncia_administrativa') {
            // Formato enriquecido para denuncia administrativa
            draftMessage = `[REDACTAR_DOCUMENTO]
Tipo: ${draftRequest.tipo}
Subtipo: ${draftRequest.subtipo}
Nivel: ${draftRequest.nivel_autoridad === 'estatal' ? `Estatal (${draftRequest.estado})` : 'Federal'}
Cargo: ${draftRequest.cargo_denunciado || 'Juez'}
Materia: ${draftRequest.materia_denuncia || 'Civil'}
Jurisdicción: ${draftRequest.estado}

Descripción del caso:
${draftRequest.descripcion}`;
        } else {
            draftMessage = `[REDACTAR_DOCUMENTO]
Tipo: ${draftRequest.tipo}
Subtipo: ${draftRequest.subtipo}
Jurisdicción: ${draftRequest.estado}

Descripción del caso:
${draftRequest.descripcion}`;
        }

        onSubmit(draftMessage);
        setActiveMode('search');
    };

    const handleSentenciaSubmit = (sentenciaMessage: string) => {
        onSubmit(sentenciaMessage);
        setActiveMode('search');
    };

    return (
        <>
            <style>{`
                @keyframes textMirror {
                    0% { background-position: -150% center; }
                    100% { background-position: 150% center; }
                }
                @keyframes iconMirror {
                    0% { color: #111111; }
                    40% { color: #111111; }
                    50% { color: #c9a962; }
                    60% { color: #111111; }
                    100% { color: #111111; }
                }
                .mirror-genios-text {
                    background: linear-gradient(
                        110deg,
                        #111111 40%,
                        #c9a962 50%,
                        #111111 60%
                    );
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: textMirror 3s ease-in-out infinite alternate;
                }
            `}</style>
            <div className="w-full max-w-3xl mx-auto relative z-20">



                {/* Main Input Container - Harvey Style */}
                <div className="chat-input-container p-4">
                    {/* Fuero + Materia Toggle — Same row, compact pills above textarea */}
                    {(onFueroChange || onMateriaChange) && (
                        <div data-guide="fuero-materia-filter" className="flex items-center gap-1 sm:gap-1.5 mb-3 pb-2 border-b border-gray-100/60 flex-nowrap overflow-x-auto">
                            {/* Fuero section */}
                            {onFueroChange && (
                                <div data-guide="fuero-filter" className="flex items-center gap-1.5 flex-shrink-0">
                                    <Scale className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="hidden sm:inline text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0 mr-0.5">Fuero</span>
                                    <div className="flex bg-gray-100/80 p-0.5 rounded-lg gap-px sm:gap-0.5">
                                        {[
                                            { key: 'constitucional', label: 'Const.' },
                                            { key: 'federal', label: 'Federal' },
                                            { key: 'estatal', label: 'Estatal' },
                                        ].map((f) => {
                                            const isActive = selectedFuero.includes(f.key);
                                            return (
                                            <button
                                                key={f.key}
                                                onClick={() => {
                                                    if (isActive) {
                                                        onFueroChange(selectedFuero.filter(k => k !== f.key));
                                                    } else {
                                                        onFueroChange([...selectedFuero, f.key]);
                                                    }
                                                }}
                                                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${isActive
                                                    ? 'bg-charcoal-900 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-charcoal-700 hover:bg-white/60'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            {onFueroChange && onMateriaChange && (
                                <div className="w-px h-4 sm:h-5 bg-gray-200 mx-0.5 sm:mx-1 flex-shrink-0" />
                            )}

                            {/* Materia section */}
                            {onMateriaChange && (
                                <div data-guide="materia-filter" className="flex items-center gap-1.5 flex-shrink-0">
                                    <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="hidden sm:inline text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0 mr-0.5">Materia</span>
                                    <div className="flex bg-gray-100/80 p-0.5 rounded-lg gap-px sm:gap-0.5">
                                        {[
                                            { key: '', label: 'Auto' },
                                            { key: 'civil', label: 'Civil' },
                                            { key: 'penal', label: 'Penal' },
                                            { key: 'familiar', label: 'Familiar' },
                                            { key: 'administrativo', label: 'Admin' },
                                        ].map((m) => (
                                            <button
                                                key={m.key}
                                                onClick={() => onMateriaChange(m.key)}
                                                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${selectedMateria === m.key
                                                    ? 'bg-charcoal-900 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-charcoal-700 hover:bg-white/60'
                                                    }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attached Document Chip (Legacy location - removing this as it's handled in the input now) */}

                    {/* Text Input */}
                    <div className="flex items-end gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onInput={handleInput}
                                placeholder={attachedDocument
                                    ? "Escribe qué quieres hacer con el documento..."
                                    : chatMode === 'redactar'
                                        ? "Describe qué argumento jurídico necesitas..."
                                        : placeholder
                                }
                                disabled={isLoading}
                                rows={1}
                                className="w-full resize-none bg-transparent text-charcoal-900 placeholder:text-gray-400 
                             focus:outline-none text-base leading-relaxed py-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ minHeight: '24px', maxHeight: '200px' }}
                            />
                        </div>

                        {/* Attach/Submit Row */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Attached Document Indicator (Condensed) */}
                            {attachedDocument && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md animate-in fade-in zoom-in duration-300">
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[10px] text-blue-800 font-bold uppercase tracking-tight max-w-[60px] truncate">
                                        DOC LISTO
                                    </span>
                                    <button onClick={() => setAttachedDocument(null)} className="hover:text-red-500 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Mic Button */}
                            <button
                                type="button"
                                data-guide="dictado"
                                onClick={toggleListening}
                                disabled={isLoading}
                                className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 ${isListening
                                    ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                                    : 'text-gray-400 hover:text-charcoal-700 hover:bg-gray-100 border border-transparent disabled:opacity-50'
                                    }`}
                                title={isListening ? "Detener dictado" : "Dictado por voz"}
                            >
                                <Mic className="w-5 h-5" />
                            </button>

                            {/* Paperclip Button */}
                            <button
                                type="button"
                                disabled={isLoading}
                                data-guide="adjuntar"
                                onClick={() => handleModeClick('files')}
                                className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 ${attachedDocument
                                    ? 'bg-blue-100 text-blue-600 border border-blue-200'
                                    : 'text-gray-400 hover:text-charcoal-700 hover:bg-gray-100 border border-transparent disabled:opacity-50'
                                    }`}
                                title="Adjuntar documento"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>

                            {/* Submit / Stop Button */}
                            {isLoading ? (
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); onStop?.(); }}
                                    className="btn-submit flex-shrink-0 bg-red-500 hover:bg-red-600"
                                    aria-label="Detener respuesta"
                                >
                                    <Square className="w-4 h-4 fill-white" />
                                </button>
                            ) : (
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleSubmit(); }}
                                    disabled={!message.trim() && !attachedDocument}
                                    className="btn-submit flex-shrink-0"
                                    aria-label="Enviar mensaje"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Action Cards Row — Blue Cards */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        {/* Buscar / Redactar toggle + Pro — stays compact */}
                        <div className="flex items-center gap-1 mb-3">
                            <div
                                data-guide="buscar-redactar"
                                className="inline-flex items-center rounded-md border border-gray-200 overflow-hidden flex-shrink-0 mr-1"
                            >
                                <button
                                    onClick={() => { setChatMode('buscar'); setRedactarPro(false); }}
                                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all duration-200 ${chatMode === 'buscar'
                                        ? 'bg-charcoal-900 text-white'
                                        : 'bg-white text-gray-500 hover:text-gray-700'
                                        }`}
                                    title="Modo búsqueda"
                                >
                                    <Search className="w-3 h-3" />
                                    Buscar
                                </button>
                                <button
                                    onClick={() => {
                                        if (activeGenios.length >= 2) {
                                            alert("Modo redacción no disponible con 2 genios activos, desactiva al menos uno.");
                                            return;
                                        }
                                        setChatMode('redactar');
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all duration-200 ${chatMode === 'redactar'
                                        ? 'bg-charcoal-900 text-white'
                                        : 'bg-white text-gray-500 hover:text-gray-700'
                                        }`}
                                    title="Modo redacción — genera argumentos jurídicos"
                                >
                                    <PenTool className="w-3 h-3" />
                                    Redactar
                                </button>
                            </div>

                            {/* Pro toggle — contextual, only visible when Redactar mode is active */}
                            {chatMode === 'redactar' && (
                                <button
                                    onClick={() => {
                                        if (!canAccessRedactarPro) {
                                            setShowUpgradeModal('pro');
                                            return;
                                        }
                                        setRedactarPro(prev => !prev);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full border transition-all duration-300 flex-shrink-0 mr-1 ${redactarPro
                                        ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50 text-[#8a6d2e] border-[#c9a962] shadow-[0_0_8px_rgba(201,169,98,0.35)]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#c9a962]/50 hover:text-[#8a6d2e]'
                                        }`}
                                    title={canAccessRedactarPro
                                        ? (redactarPro
                                            ? "Redacción Pro activa — razonamiento profundo con motor avanzado"
                                            : "Activar Redacción Pro — mayor calidad jurídica (más lento)")
                                        : "Redacción Pro disponible en plan Pro"}
                                >
                                    <Sparkles className={`w-3 h-3 ${redactarPro ? 'text-[#c9a962]' : ''}`} />
                                    <span>Pro</span>
                                    {redactarPro && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#c9a962] animate-pulse" />
                                    )}
                                    {!canAccessRedactarPro && (
                                        <Lock className="w-2.5 h-2.5 ml-0.5" />
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Action Buttons — Elegant Black Pills */}
                        <div className="grid grid-cols-4 gap-1.5 w-full">
                            <button
                                data-guide="escrito"
                                onClick={() => handleModeClick('draft')}
                                className={`flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${activeMode === 'draft'
                                        ? 'bg-charcoal-900 text-white shadow-sm ring-1 ring-charcoal-900'
                                        : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <FileEdit className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Escrito legal</span>
                            </button>

                            <button
                                data-guide="sentencia"
                                onClick={() => canAccessSentencia ? handleModeClick('sentencia') : setShowUpgradeModal('pro')}
                                title={!canAccessSentencia ? 'Plan Pro' : 'Revisa una sentencia'}
                                className={`flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${!canAccessSentencia
                                        ? 'bg-gray-200 text-gray-400 cursor-pointer'
                                        : activeMode === 'sentencia'
                                            ? 'bg-charcoal-900 text-white shadow-sm ring-1 ring-charcoal-900'
                                            : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <Gavel className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Sentencia</span>
                                {!canAccessSentencia && <Lock className="w-2 h-2 flex-shrink-0 opacity-60" />}
                            </button>

                            <button
                                data-guide="precedentes"
                                onClick={() => {
                                    if (!canAccessPrecedentes) { setShowUpgradeModal('pro'); return; }
                                    const next = activeMode !== 'precedentes';
                                    setActiveMode(next ? 'precedentes' : 'search');
                                    if (!next) { setSelectedCircuit(null); setTribunalFilter(null); }
                                }}
                                title={!canAccessPrecedentes ? 'Plan Pro' : 'Precedentes federales'}
                                className={`flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${!canAccessPrecedentes
                                        ? 'bg-gray-200 text-gray-400 cursor-pointer'
                                        : activeMode === 'precedentes'
                                            ? 'bg-charcoal-900 text-white shadow-sm ring-1 ring-charcoal-900'
                                            : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <BookOpen className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Precedentes</span>
                                {!canAccessPrecedentes && <Lock className="w-2 h-2 flex-shrink-0 opacity-60" />}
                            </button>

                            <button
                                data-guide="jurimetria"
                                onClick={() => {
                                    if (!canAccessJurimetria) { setShowUpgradeModal('platinum'); return; }
                                    setShowJurimetriaModal(true);
                                }}
                                title={!canAccessJurimetria ? 'Plan Platinum' : 'Jurimetría'}
                                className={`flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${!canAccessJurimetria
                                        ? 'bg-gray-200 text-gray-400 cursor-pointer'
                                        : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <BarChart2 className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Jurimetría</span>
                                {!canAccessJurimetria && <Lock className="w-2 h-2 flex-shrink-0 opacity-60" />}
                            </button>
                        </div>
                    </div>

                    {/* ── MODO PRECEDENTES: corte (SCJN/TCC/Ambas) → filtros ────────── */}
                    {activeMode === 'precedentes' && (
                        <div className="mt-2 pt-2 border-t border-[#c9a962]/20 space-y-2">

                            {/* Fila 0: Selector de Corte (SCJN | TCC | Ambas) */}
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0">Corte</span>
                                <div className="inline-flex items-center rounded-md border border-[#c9a962]/40 overflow-hidden bg-white">
                                    <button
                                        onClick={() => { setSelectedCorte('SCJN'); setSelectedSala(null); setSelectedCircuit(null); setTribunalFilter(null); }}
                                        title="Suprema Corte de Justicia de la Nación"
                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-all duration-150 ${
                                            selectedCorte === 'SCJN'
                                                ? 'bg-[#c9a962] text-white'
                                                : 'bg-white text-gray-600 hover:text-[#c9a962]'
                                        }`}
                                    >
                                        <Scale className="w-3 h-3" />
                                        SCJN
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCorte('TCC'); setSelectedSala(null); setSelectedCircuit('ALL'); setTribunalFilter(null); }}
                                        title="Tribunales Colegiados de Circuito"
                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-all duration-150 border-l border-[#c9a962]/30 ${
                                            selectedCorte === 'TCC'
                                                ? 'bg-[#c9a962] text-white'
                                                : 'bg-white text-gray-600 hover:text-[#c9a962]'
                                        }`}
                                    >
                                        <Gavel className="w-3 h-3" />
                                        TCC
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCorte('ALL'); setSelectedSala(null); setSelectedCircuit(null); setTribunalFilter(null); }}
                                        title="Búsqueda unificada (SCJN + TCC)"
                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-all duration-150 border-l border-[#c9a962]/30 ${
                                            selectedCorte === 'ALL'
                                                ? 'bg-[#c9a962] text-white'
                                                : 'bg-white text-gray-600 hover:text-[#c9a962]'
                                        }`}
                                    >
                                        <BookOpen className="w-3 h-3" />
                                        Ambas
                                    </button>
                                </div>
                                {selectedCorte === 'ALL' && (
                                    <span className="text-[9px] text-gray-400 italic">SCJN al frente + TCC</span>
                                )}
                            </div>

                            {/* Selector de Sala — solo cuando Corte = SCJN */}
                            {selectedCorte === 'SCJN' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0">Sala</span>
                                    {([
                                        { id: null, label: 'Todas' },
                                        { id: 'PLENO', label: 'Pleno' },
                                        { id: 'PRIMERA_SALA', label: '1ª Sala' },
                                        { id: 'SEGUNDA_SALA', label: '2ª Sala' },
                                    ] as const).map(s => (
                                        <button
                                            key={s.label}
                                            onClick={() => setSelectedSala(s.id)}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-150 border ${
                                                selectedSala === s.id
                                                    ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#c9a962] hover:text-[#c9a962]'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selector de Circuito + Tribunal — solo cuando Corte = TCC */}
                            {selectedCorte === 'TCC' && (
                            <>

                            {/* Fila 1: Circuito */}
                            <div className="flex items-start gap-2">
                                <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0 mt-0.5">Circ.</span>
                                <div className="flex flex-wrap gap-[3px]">
                                    {/* Botón "Todos" — búsqueda global */}
                                    <button
                                        onClick={() => { setSelectedCircuit('ALL'); setTribunalFilter(null); }}
                                        title="Buscar en todos los circuitos disponibles"
                                        className={`h-[18px] px-1.5 rounded text-[9px] font-bold transition-all duration-150 border leading-none ${
                                            selectedCircuit === 'ALL'
                                                ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-[#c9a962] hover:text-[#c9a962]'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => {
                                        const avail  = AVAILABLE_CIRCUITS.includes(n);
                                        const active = selectedCircuit === n;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    if (!avail) return;
                                                    setSelectedCircuit(active ? 'ALL' : n);
                                                    setTribunalFilter(null);
                                                }}
                                                title={avail ? `${ORDINAL_ES[n]} Circuito` : `${ORDINAL_ES[n]} Circuito — próximamente`}
                                                className={`w-[18px] h-[18px] rounded text-[9px] font-bold transition-all duration-150 border leading-none ${
                                                    active
                                                        ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                        : avail
                                                            ? 'bg-white text-gray-600 border-gray-300 hover:border-[#c9a962] hover:text-[#c9a962]'
                                                            : 'bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Fila 2: Tribunal — solo cuando hay circuito numérico seleccionado */}
                            {typeof selectedCircuit === 'number' && CIRCUIT_TRIBUNALS[selectedCircuit] ? (
                                <div className="space-y-1">
                                    {/* "Todos" los tribunales del circuito */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest shrink-0 w-[22px]">Trib.</span>
                                        <button
                                            onClick={() => setTribunalFilter(null)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border ${
                                                tribunalFilter === null
                                                    ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#c9a962] hover:text-[#c9a962]'
                                            }`}
                                        >
                                            Todos
                                        </button>
                                    </div>
                                    {/* Circuits 1 & 4: agrupar por materia (ADM / CIV / LAB / PEN) */}
                                    {(selectedCircuit === 1 || selectedCircuit === 2 || selectedCircuit === 3 || selectedCircuit === 4 || selectedCircuit === 6 || selectedCircuit === 16) ? (
                                        (['ADM','CIV','LAB','PEN'] as const).map((grupo) => {
                                            const tribunalesGrupo = CIRCUIT_TRIBUNALS[selectedCircuit as number].filter(t => t.grupo === grupo);
                                            if (tribunalesGrupo.length === 0) return null;
                                            const GRUPO_FULL: Record<string, string> = { ADM: 'Administrativa', CIV: 'Civil', LAB: 'Laboral', PEN: 'Penal' };
                                            const GRUPO_COLOR: Record<string, string> = {
                                                ADM: 'text-teal-700 bg-teal-50 border-teal-200',
                                                CIV: 'text-blue-700 bg-blue-50 border-blue-200',
                                                LAB: 'text-amber-700 bg-amber-50 border-amber-200',
                                                PEN: 'text-rose-700 bg-rose-50 border-rose-200',
                                            };
                                            return (
                                                <div key={grupo} className="flex items-center gap-1 flex-wrap">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded border ${GRUPO_COLOR[grupo]}`} style={{minWidth: '3.5rem', textAlign: 'center'}}>
                                                        {GRUPO_FULL[grupo]}
                                                    </span>
                                                    {tribunalesGrupo.map((t) => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => setTribunalFilter(tribunalFilter === t.id ? null : t.id)}
                                                            title={`${t.label} TCC en Materia ${GRUPO_FULL[grupo]} — ${t.id}`}
                                                            className={`h-[18px] px-1.5 rounded text-[9px] font-bold transition-all duration-150 border leading-none ${
                                                                tribunalFilter === t.id
                                                                    ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#c9a962] hover:text-[#c9a962]'
                                                            }`}
                                                        >
                                                            {t.label.replace('°', '')}°
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        /* Otros circuitos: lista horizontal simple */
                                        <div className="flex items-center gap-1.5 flex-wrap pl-[26px]">
                                            {CIRCUIT_TRIBUNALS[selectedCircuit as number].map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => t.available && setTribunalFilter(tribunalFilter === t.id ? null : t.id)}
                                                    title={t.available ? t.label : `${t.label} — próximamente`}
                                                    className={`relative px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border ${
                                                        !t.available
                                                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                            : tribunalFilter === t.id
                                                                ? 'bg-charcoal-900 text-white border-charcoal-900'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {t.label}
                                                    {!t.available && (
                                                        <span className="absolute -top-[5px] -right-[3px] text-[6px] bg-[#c9a962] text-white px-[3px] py-px rounded-sm leading-tight font-bold tracking-tight">
                                                            pronto
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : typeof selectedCircuit === 'number' ? (
                                <p className="text-[9px] text-[#c9a962] italic pl-1">
                                    {ORDINAL_ES[selectedCircuit]} Circuito — próximamente disponible
                                </p>
                            ) : selectedCircuit === 'ALL' ? (
                                <p className="text-[9px] text-gray-400 italic pl-1">
                                    Buscando en todos los circuitos disponibles
                                </p>
                            ) : null}
                            </>
                            )}
                        </div>
                    )}

                    {/* ── Genio Premium Horizontal Row ───────────────────────────── */}
                    <div
                        data-guide="genios-container"
                        className="
                            flex flex-nowrap items-center justify-between
                            w-full mt-2 pt-2 pb-1 border-t border-gray-100/60
                            gap-0.5 sm:gap-1 overflow-hidden
                        "
                    >
                        <div
                            className="flex items-center flex-shrink-0 gap-0.5 pr-1 sm:pr-1.5 border-r border-gray-200/40"
                        >
                            <Brain className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ animation: 'iconMirror 3s ease-in-out infinite alternate' }} />
                            <span className="hidden sm:inline text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider mirror-genios-text">
                                Genios
                            </span>
                            {(isGenioLocked && !isPro) && (
                                <span className="text-[7px] font-bold text-charcoal-900 bg-[#c9a962]/20 px-1 py-0.5 rounded ml-0.5" style={{ animation: 'iconMirror 3s ease-in-out infinite alternate' }}>PRO</span>
                            )}
                        </div>

                        {geniosList.map((g, index) => [
                            <button
                                key={g.id}
                                onClick={() => {
                                    if (isGenioLocked && !isPro) { setShowUpgradeModal('pro'); return; }
                                    if (!setActiveGenios) return;

                                    if (activeGenios.includes(g.id)) {
                                        // Ya está activo → desactivar
                                        setActiveGenios(activeGenios.filter(id => id !== g.id));
                                    } else if (activeGenios.length < 2) {
                                        // Hay espacio → agregar
                                        setActiveGenios([...activeGenios, g.id]);
                                    } else {
                                        // Ya hay 2 → reemplazar el más antiguo
                                        setActiveGenios([activeGenios[1], g.id]);
                                    }
                                }}
                                disabled={isCacheLoading || (isGenioLocked && !isPro)}
                                className={`group flex items-center justify-center gap-0.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] transition-all duration-300 flex-shrink min-w-0 bg-transparent outline-none
                                    ${(isGenioLocked && !isPro)
                                        ? 'text-gray-400 cursor-not-allowed opacity-70 font-medium'
                                        : (isCacheLoading && activeGenios.includes(g.id))
                                            ? 'text-amber-600 cursor-wait font-medium'
                                            : genioError && activeGenios.includes(g.id)
                                                ? 'text-red-500 font-medium'
                                                : activeGenios.includes(g.id)
                                                    ? isCacheActive
                                                        ? `text-[#c9a962] font-bold drop-shadow-sm`
                                                        : `text-[#c9a962] font-bold opacity-80 animate-pulse`
                                                    : `text-gray-500 font-medium hover:text-charcoal-900`
                                    }`}
                                style={(activeGenios.includes(g.id) && isCacheActive && !(isGenioLocked && !isPro))
                                    ? { animation: 'genioActiveGlow 2.5s ease-in-out infinite' }
                                    : undefined}
                                title={(isGenioLocked && !isPro) ? 'Función exclusiva para plan Pro' : activeGenios.includes(g.id) ? `Desactivar Genio ${g.label}` : `Activar Genio ${g.label}`}
                            >
                                {(isGenioLocked && !isPro) ? (
                                    <>
                                        <Lock className="w-2 h-2 flex-shrink-0 text-gray-400" />
                                        <span className="truncate">{g.label}</span>
                                    </>
                                ) : (isCacheLoading && activeGenios.includes(g.id)) ? (
                                    <>
                                        <div className={`w-2 h-2 border-[1.5px] ${g.spinnerBorder} border-t-transparent rounded-full animate-spin`} />
                                        <span>...</span>
                                    </>
                                ) : (genioError && activeGenios.includes(g.id)) ? (
                                    <>
                                        <span className="text-[10px]">&#x26A0;</span>
                                        <span>Err</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="truncate">
                                            {g.label}
                                        </span>
                                    </>
                                )}
                            </button>,
                            index < geniosList.length - 1 && (
                                <span key={`${g.id}-sep`} className="text-gray-300 mx-0.5 sm:mx-1 select-none text-[10px] font-light flex-shrink-0">|</span>
                            )
                        ])}
                        {genioError && (
                            <p className="text-[8px] text-red-500 ml-1 whitespace-nowrap">{genioError}</p>
                        )}
                    </div>

                    {/* Secretario PJF — Compact CTA */}
                    <a
                        href={canAccessTccBeta ? '/tcc-beta' : '#'}
                        data-guide="tcc-beta"
                        onClick={(e) => {
                            if (!canAccessTccBeta) {
                                e.preventDefault();
                                setShowUpgradeModal('platinum');
                            }
                        }}
                        className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-md bg-[#1a1a1a] border border-[#c9a962]/20 hover:border-[#c9a962]/40 transition-all duration-200 group"
                    >
                        <Gavel className="w-3 h-3 text-[#c9a962]/70 flex-shrink-0" />
                        <span className="text-[10px] text-white/60 group-hover:text-white/80 transition-colors flex-1">
                            Secretario del PJF — <span className="font-semibold text-[#c9a962]/80">Crea un borrador de sentencia</span>
                        </span>
                        {!canAccessTccBeta && <Lock className="w-2.5 h-2.5 text-[#c9a962]/40 flex-shrink-0" />}
                        <span className="text-[7px] font-bold text-[#c9a962]/60 uppercase tracking-wider flex-shrink-0">Beta</span>
                    </a>

                </div>
            </div>

            {/* Modals */}
            <FileUploadModal
                isOpen={showFileModal}
                onClose={() => {
                    setShowFileModal(false);
                    setActiveMode('search');
                }}
                onTextExtracted={handleFileExtracted}
            />

            <TextEnhanceModal
                isOpen={showEnhanceModal}
                onClose={() => {
                    setShowEnhanceModal(false);
                    setActiveMode('search');
                }}
                onEnhance={handleEnhanceText}
            />

            <DraftModal
                isOpen={showDraftModal}
                onClose={() => {
                    setShowDraftModal(false);
                    setActiveMode('search');
                }}
                onDraft={handleDraft}
                estado={estado}
            />

            <SentenciaModal
                isOpen={showSentenciaModal}
                onClose={() => {
                    setShowSentenciaModal(false);
                    setActiveMode('search');
                }}
                onSubmit={handleSentenciaSubmit}
                estado={estado}
            />

            <JurimetriaModal
                isOpen={showJurimetriaModal}
                onClose={() => setShowJurimetriaModal(false)}
                userEmail={user?.email ?? ''}
            />

            {/* Modal de upgrade — aparece al tocar funciones bloqueadas */}
            {showUpgradeModal !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowUpgradeModal(null)}
                >
                    <div
                        className="relative w-full max-w-sm bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl px-7 py-8 text-center animate-in zoom-in-95 fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                            style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                        <div className="mx-auto mb-4 w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-[#c9a962]" />
                        </div>
                        {showUpgradeModal === 'platinum' ? (
                            <>
                                <p className="text-[10px] font-bold tracking-[0.18em] text-[#c9a962] uppercase mb-2">
                                    Función exclusiva Platinum
                                </p>
                                <p className="text-white/80 text-sm leading-relaxed mb-6">
                                    Esta función está disponible en el plan <span className="text-white font-semibold">Platinum</span> de Iurexia — incluye Jurimetría predictiva y Redactor TCC Beta con IA de razonamiento profundo.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-bold tracking-[0.18em] text-[#c9a962] uppercase mb-2">
                                    Función exclusiva Pro
                                </p>
                                <p className="text-white/80 text-sm leading-relaxed mb-6">
                                    Únete al plan <span className="text-white font-semibold">Pro o superior</span> de Iurexia para utilizar las mejores y más potentes funciones de la plataforma.
                                </p>
                            </>
                        )}
                        <div className="flex flex-col gap-2">
                            <a
                                href="/precios"
                                className="block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)', color: '#1a1a1a' }}
                            >
                                {showUpgradeModal === 'platinum' ? 'Ver plan Platinum' : 'Ver planes Pro'}
                            </a>
                            <button
                                onClick={() => setShowUpgradeModal(null)}
                                className="text-white/30 hover:text-white/60 text-xs transition-colors py-1"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function ActionButton({
    icon: Icon,
    label,
    active = false,
    locked = false,
    onClick,
    guideId,
    activeClassName = 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    lockedTitle,
}: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    locked?: boolean;
    onClick?: () => void;
    guideId?: string;
    activeClassName?: string;
    lockedTitle?: string;
}) {
    return (
        <button
            onClick={onClick}
            data-guide={guideId}
            title={locked ? (lockedTitle ?? `${label} — exclusivo Plan Pro`) : label}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${locked
                    ? 'text-gray-300 hover:text-gray-400 hover:bg-gray-50 cursor-pointer'
                    : active
                        ? activeClassName
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {locked && <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />}
        </button>
    );
}

