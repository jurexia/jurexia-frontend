'use client';

import { useState, useRef, KeyboardEvent } from 'react';
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
    Lock
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
    isLoading?: boolean;
    placeholder?: string;
    estado?: string;
    enableGenioJuridico?: boolean;
    setEnableGenioJuridico?: (value: boolean) => void;
    isCacheActive?: boolean;
    isCacheLoading?: boolean;
    genioError?: string | null;
    isPro?: boolean;
}

export default function ChatInput({
    onSubmit,
    isLoading = false,
    placeholder = "Escribe tu consulta legal o sube tu documento para análisis",
    estado,
    enableGenioJuridico = false,
    setEnableGenioJuridico,
    isCacheActive = false,
    isCacheLoading = false,
    genioError = null,
    isPro = false,
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [activeMode, setActiveMode] = useState<'search' | 'files' | 'enhance' | 'draft' | 'sentencia'>('search');
    const [chatMode, setChatMode] = useState<'buscar' | 'redactar'>('buscar');
    const [showFileModal, setShowFileModal] = useState(false);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showSentenciaModal, setShowSentenciaModal] = useState(false);
    const [attachedDocument, setAttachedDocument] = useState<{ text: string; fileName: string } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { user, profile } = useAuth();
    const canAccessRedactor = isAdmin(user?.email) || profile?.subscription_type === 'ultra_secretarios' || profile?.can_access_sentencia === true;
    const isFreeUser = !profile?.subscription_type || profile?.subscription_type === 'gratuito';
    const isGenioLocked = isFreeUser && !isAdmin(user?.email);

    const handleSubmit = () => {
        if (!isLoading && (message.trim() || attachedDocument)) {
            let finalMessage = message.trim();
            let displayMessage = message.trim(); // What user sees in chat

            // If there's an attached document, format differently for display vs AI
            if (attachedDocument) {
                const userPrompt = finalMessage || 'Analiza este documento';
                displayMessage = `📄 **Documento adjunto:** ${attachedDocument.fileName}\n\n${userPrompt}`;

                // Full message for AI includes document content (hidden from user)
                // Limit: 120,000 chars (~30 pages full text, ~20K words)
                // For longer documents, only the first portion is analyzed
                const docContent = attachedDocument.text.slice(0, 120000);
                const truncationNote = attachedDocument.text.length > 120000
                    ? `\n\n[NOTA: Documento truncado. Mostrando ${Math.round(120000 / attachedDocument.text.length * 100)}% del contenido original (${attachedDocument.text.length.toLocaleString()} caracteres totales)]`
                    : '';
                finalMessage = `[DOCUMENTO ADJUNTO: "${attachedDocument.fileName}"]${truncationNote}\n\n${userPrompt}\n\n<!-- DOCUMENTO_INICIO -->\n${docContent}\n<!-- DOCUMENTO_FIN -->`;

                setAttachedDocument(null); // Clear after sending
            }

            // Prepend [MODO_REDACCION] marker when in Redactar mode
            if (chatMode === 'redactar' && !attachedDocument) {
                finalMessage = `[MODO_REDACCION] ${finalMessage}`;
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

    const handleFileExtracted = (text: string, fileName: string) => {
        // Attach document instead of sending immediately
        setAttachedDocument({ text, fileName });
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
            <div className="w-full max-w-3xl mx-auto">
                {/* Main Input Container - Harvey Style */}
                <div className="chat-input-container p-4">
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

                            {/* Paperclip Button */}
                            <button
                                data-guide="adjuntar"
                                onClick={() => handleModeClick('files')}
                                className={`p-2 rounded-full transition-all duration-200 ${attachedDocument
                                    ? 'bg-blue-100 text-blue-600 border border-blue-200'
                                    : 'text-gray-400 hover:text-charcoal-700 hover:bg-gray-100'
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
                                    onClick={() => setChatMode('redactar')}
                                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all duration-200 ${chatMode === 'redactar'
                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                                        : 'bg-white text-gray-500 hover:text-gray-700'
                                        }`}
                                    title="Modo redacción — genera argumentos jurídicos"
                                >
                                    <PenTool className="w-3 h-3" />
                                    Redactar
                                </button>
                            </div>

                            {/* GENIO AMPARO Toggle */}
                            <button
                                data-guide="genio-juridico"
                                onClick={() => {
                                    if (isGenioLocked && !isPro) return; // Gate: solo Pro/Platinum o Admin
                                    setEnableGenioJuridico?.(!enableGenioJuridico);
                                }}
                                disabled={isCacheLoading || (isGenioLocked && !isPro)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-300 border flex-shrink-0
                                    ${(isGenioLocked && !isPro)
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70'
                                        : isCacheLoading
                                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-300 cursor-wait'
                                            : genioError
                                                ? 'bg-red-50 text-red-600 border-red-400'
                                                : enableGenioJuridico
                                                    ? isCacheActive
                                                        ? 'bg-white text-red-600 border-red-500 animate-[pulseRedGlow_2s_infinite]'
                                                        : 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white border-purple-400'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                                    }`}
                                title={(isGenioLocked && !isPro) ? 'Función exclusiva para plan Pro — Actualiza tu plan' : genioError ? genioError : isCacheLoading ? 'Activando Genio Amparo...' : 'Activar Genio Amparo'}
                            >
                                {(isGenioLocked && !isPro) ? (
                                    <>
                                        <Lock className="w-3.5 h-3.5" />
                                        Genio Amparo <span className="text-[9px] ml-0.5 font-normal">PRO</span>
                                    </>
                                ) : isCacheLoading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                        Activando Genio Amparo...
                                    </>
                                ) : genioError ? (
                                    <>
                                        <span className="text-red-500">&#x26A0;</span>
                                        Error al activar
                                    </>
                                ) : (
                                    <>
                                        <Brain className={`w-3.5 h-3.5 ${isCacheActive ? 'text-red-500' : ''}`} />
                                        {isCacheActive ? 'Genio Amparo Activo' : 'Genio Amparo'}
                                    </>
                                )}
                            </button>

                            <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

                            {/* Remaining Actions */}
                            <ActionButton
                                icon={FileEdit}
                                label="Escrito"
                                active={activeMode === 'draft'}
                                onClick={() => handleModeClick('draft')}
                                guideId="escrito"
                            />
                            <ActionButton
                                icon={Gavel}
                                label="Sentencia"
                                active={activeMode === 'sentencia'}
                                onClick={() => handleModeClick('sentencia')}
                                guideId="sentencia"
                            />
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
            </div >

            {/* Modals */}
            < FileUploadModal
                isOpen={showFileModal}
                onClose={() => {
                    setShowFileModal(false);
                    setActiveMode('search');
                }
                }
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
