'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import {
    ArrowRight,
    Paperclip,
    Search,
    Sparkles,
    Shield,
    FileEdit
} from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import { FileText, X } from 'lucide-react';
import TextEnhanceModal from './TextEnhanceModal';
import DraftModal, { DraftRequest } from './DraftModal';
import { enhanceText } from '@/lib/api';

interface ChatInputProps {
    onSubmit: (message: string) => void;
    isLoading?: boolean;
    placeholder?: string;
    estado?: string;
}

export default function ChatInput({
    onSubmit,
    isLoading = false,
    placeholder = "Escribe tu consulta legal o sube tu documento para análisis",
    estado
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [activeMode, setActiveMode] = useState<'search' | 'files' | 'enhance' | 'draft'>('search');
    const [showFileModal, setShowFileModal] = useState(false);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [attachedDocument, setAttachedDocument] = useState<{ text: string; fileName: string } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

            // We pass the full message but the UI should filter out document content
            onSubmit(finalMessage);
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

    const handleModeClick = (mode: 'search' | 'files' | 'enhance' | 'draft') => {
        setActiveMode(mode);
        if (mode === 'files') {
            setShowFileModal(true);
        } else if (mode === 'enhance') {
            setShowEnhanceModal(true);
        } else if (mode === 'draft') {
            setShowDraftModal(true);
        }
    };

    const handleDraft = (draftRequest: DraftRequest) => {
        // Create a special message that triggers draft mode in the backend
        const draftMessage = `[REDACTAR_DOCUMENTO]
Tipo: ${draftRequest.tipo}
Subtipo: ${draftRequest.subtipo}
Jurisdicción: ${draftRequest.estado}

Descripción del caso:
${draftRequest.descripcion}`;

        onSubmit(draftMessage);
        setActiveMode('search');
    };

    return (
        <>
            <div className="w-full max-w-3xl mx-auto">
                {/* Main Input Container - Harvey Style */}
                <div className="chat-input-container p-4">
                    {/* Attached Document Chip */}
                    {attachedDocument && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-blue-800 font-medium truncate flex-1">
                                {attachedDocument.fileName}
                            </span>
                            <button
                                onClick={() => setAttachedDocument(null)}
                                className="p-1 hover:bg-blue-100 rounded transition-colors"
                                title="Quitar documento"
                            >
                                <X className="w-4 h-4 text-blue-600" />
                            </button>
                        </div>
                    )}

                    {/* Text Input */}
                    <div className="flex items-end gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onInput={handleInput}
                                placeholder={attachedDocument ? "Escribe qué quieres hacer con el documento..." : placeholder}
                                disabled={isLoading}
                                rows={1}
                                className="w-full resize-none bg-transparent text-charcoal-900 placeholder:text-gray-400 
                             focus:outline-none text-base leading-relaxed py-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ minHeight: '24px', maxHeight: '200px' }}
                            />
                        </div>

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

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            {/* Subir Documentos para Análisis */}
                            <ActionButton
                                icon={Paperclip}
                                label="Subir documento"
                                active={activeMode === 'files'}
                                onClick={() => handleModeClick('files')}
                            />
                            <ActionButton
                                icon={Search}
                                label="Buscar"
                                active={activeMode === 'search'}
                                onClick={() => handleModeClick('search')}
                            />
                            <ActionButton
                                icon={FileEdit}
                                label="Redactar"
                                active={activeMode === 'draft'}
                                onClick={() => handleModeClick('draft')}
                            />
                        </div>
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
        </>
    );
}

function ActionButton({
    icon: Icon,
    label,
    active = false,
    onClick
}: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${active
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );
}
