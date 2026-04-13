'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Paperclip,
    Search,
    Sparkles,
    Shield,
    FileEdit,
    Gavel,
    Users,
    Brain,
    Scale,
    PenTool,
    Lock,
    Mic,
    BookOpen
} from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import { FileText, X } from 'lucide-react';
import TextEnhanceModal from './TextEnhanceModal';
import DraftModal, { DraftRequest } from './DraftModal';
import SentenciaModal from './SentenciaModal';
import { enhanceText } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';

interface ChatInputProps {
    onSubmit: (message: string, enableReasoning?: boolean) => void;
    onDocumentSubmit?: (file: File, prompt: string, displayMessage: string) => void;
    isLoading?: boolean;
    placeholder?: string;
    estado?: string;
    activeGenios?: string[];
    setActiveGenios?: (genios: string[]) => void;
    isCacheActive?: boolean;
    isCacheLoading?: boolean;
    genioError?: string | null;
    isPro?: boolean;
    selectedFuero?: string;
    onFueroChange?: (fuero: string) => void;
    selectedMateria?: string;
    onMateriaChange?: (materia: string) => void;
}

export default function ChatInput({
    onSubmit,
    onDocumentSubmit,
    isLoading = false,
    placeholder = "Escribe tu consulta legal o sube tu documento para análisis",
    estado,
    activeGenios = [],
    setActiveGenios,
    isCacheActive = false,
    isCacheLoading = false,
    genioError = null,
    isPro = false,
    selectedFuero = '',
    onFueroChange,
    selectedMateria = '',
    onMateriaChange,
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [activeMode, setActiveMode] = useState<'search' | 'files' | 'enhance' | 'draft' | 'sentencia' | 'precedentes'>('search');
    const [chatMode, setChatMode] = useState<'buscar' | 'redactar'>('buscar');
    const [selectedCircuit, setSelectedCircuit] = useState<number | null>(null);
    const [tribunalFilter, setTribunalFilter] = useState<string | null>(null);
    const [showFileModal, setShowFileModal] = useState(false);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showSentenciaModal, setShowSentenciaModal] = useState(false);
    const [attachedDocument, setAttachedDocument] = useState<{ file: File; fileName: string } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);
    const baseMessageRef = useRef('');
    const { user, profile } = useAuth();

    // ── Datos de circuitos y tribunales ──────────────────────────────────
    const AVAILABLE_CIRCUITS = [22];

    const CIRCUIT_TRIBUNALS: Record<number, { id: string; label: string; available: boolean }[]> = {
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
    const canAccessPrecedentes = isAdmin(user?.email) || (
        (profile?.subscription_type === 'pro_monthly' || profile?.subscription_type === 'pro_annual') &&
        profile?.estado === 'QUERETARO'
    );

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

            // Prepend [MODO_REDACCION] marker when in Redactar mode
            if (chatMode === 'redactar') {
                finalMessage = `[MODO_REDACCION] ${finalMessage}`;
            }

            // Prepend [MODO_PRECEDENTES] marker when in Precedentes mode
            if (activeMode === 'precedentes') {
                const circuitTag  = selectedCircuit  ? ` [CIRCUITO:${selectedCircuit}]`  : ' [CIRCUITO:22]';
                const tribunalTag = tribunalFilter    ? ` [TRIBUNAL:${tribunalFilter}]`   : '';
                finalMessage = `[MODO_PRECEDENTES]${circuitTag}${tribunalTag} ${finalMessage}`;
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
                                            { key: '', label: 'Auto' },
                                            { key: 'constitucional', label: 'Const.' },
                                            { key: 'federal', label: 'Federal' },
                                            { key: 'estatal', label: 'Estatal' },
                                        ].map((f) => (
                                            <button
                                                key={f.key}
                                                onClick={() => onFueroChange(f.key)}
                                                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${selectedFuero === f.key
                                                    ? 'bg-charcoal-900 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-charcoal-700 hover:bg-white/60'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
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

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!message.trim() || isLoading}
                                className="btn-submit flex-shrink-0"
                                aria-label="Enviar mensaje"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <ArrowRight className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                            <div
                                data-guide="buscar-redactar"
                                className="inline-flex items-center rounded-md border border-gray-200 overflow-hidden flex-shrink-0 mr-1"
                            >
                                <button
                                    onClick={() => setChatMode('buscar')}
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

                            <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

                            <ActionButton
                                icon={FileEdit}
                                label="Escrito"
                                active={activeMode === 'draft'}
                                onClick={() => handleModeClick('draft')}
                                guideId="escrito"
                            />
                            {canAccessSentencia && (
                                <ActionButton
                                    icon={Gavel}
                                    label="Sentencia"
                                    active={activeMode === 'sentencia'}
                                    onClick={() => handleModeClick('sentencia')}
                                    guideId="sentencia"
                                />
                            )}
                            {canAccessPrecedentes && (
                                <ActionButton
                                    icon={BookOpen}
                                    label="Precedentes"
                                    active={activeMode === 'precedentes'}
                                    onClick={() => {
                                        const next = activeMode !== 'precedentes';
                                        setActiveMode(next ? 'precedentes' : 'search');
                                        if (!next) { setSelectedCircuit(null); setTribunalFilter(null); }
                                    }}
                                    guideId="precedentes"
                                />
                            )}
                            {canAccessRedactor && (
                                <Link
                                    href="/redactor-sentencia"
                                    className="shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap
                                              transition-all duration-200 hover:opacity-90"
                                    style={{
                                        background: '#1a1a1a',
                                        color: '#c9a962',
                                    }}
                                    title="Acceder al Redactor de Sentencias TCC"
                                >
                                    Secretario PJF
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ── MODO PRECEDENTES: selector circuito → tribunal ────────── */}
                    {activeMode === 'precedentes' && (
                        <div className="mt-2 pt-2 border-t border-[#c9a962]/20 space-y-2">

                            {/* Fila 1: Circuito */}
                            <div className="flex items-start gap-2">
                                <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0 mt-0.5">Circ.</span>
                                <div className="flex flex-wrap gap-[3px]">
                                    {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => {
                                        const avail   = AVAILABLE_CIRCUITS.includes(n);
                                        const active  = selectedCircuit === n;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    if (!avail) return;
                                                    setSelectedCircuit(active ? null : n);
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

                            {/* Fila 2: Tribunal (visible cuando hay circuito seleccionado) */}
                            {selectedCircuit && CIRCUIT_TRIBUNALS[selectedCircuit] ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Trib.</span>
                                    <button
                                        onClick={() => setTribunalFilter(null)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border ${
                                            tribunalFilter === null
                                                ? 'bg-charcoal-900 text-white border-charcoal-900'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                        }`}
                                    >
                                        Todos
                                    </button>
                                    {CIRCUIT_TRIBUNALS[selectedCircuit].map((t) => (
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
                            ) : selectedCircuit ? (
                                <p className="text-[9px] text-[#c9a962] italic pl-1">
                                    {ORDINAL_ES[selectedCircuit]} Circuito — próximamente disponible
                                </p>
                            ) : (
                                <p className="text-[9px] text-gray-400 italic pl-1">
                                    Selecciona un circuito para filtrar por tribunal
                                </p>
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
                                    if (isGenioLocked && !isPro) return;
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

                    {/* Connect Badge — Free Plan CTA */}
                    <div className="mt-3 pt-3 border-t border-gray-50">
                        <a
                            href="/connect"
                            data-guide="lawyer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-all group"
                        >
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-charcoal-600">
                                Busca un abogado especializado en tu zona
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide ml-auto">
                                Nuevo
                            </span>
                        </a>
                    </div>
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
        </>
    );
}

function ActionButton({
    icon: Icon,
    label,
    active = false,
    onClick,
    guideId
}: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
    guideId?: string;
}) {
    return (
        <button
            onClick={onClick}
            data-guide={guideId}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${active
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            title={label}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

