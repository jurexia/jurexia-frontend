'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import {
    ArrowRight,
    Paperclip,
    Search,
    Sparkles,
    FileText,
    Building,
    Scale,
    BookOpen
} from 'lucide-react';

interface ChatInputProps {
    onSubmit: (message: string) => void;
    isLoading?: boolean;
    placeholder?: string;
}

export default function ChatInput({
    onSubmit,
    isLoading = false,
    placeholder = "Escribe tu consulta legal..."
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (message.trim() && !isLoading) {
            onSubmit(message.trim());
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

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* Main Input Container - Harvey Style */}
            <div className="chat-input-container p-4">
                {/* File attachment preview area (optional) */}
                {/* <div className="mb-3 flex gap-2">
          <FilePreview name="Demanda.pdf" size="2.4 MB" />
        </div> */}

                {/* Text Input */}
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            placeholder={placeholder}
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
                        <ActionButton icon={Paperclip} label="Archivos" />
                        <ActionButton icon={Search} label="Buscar" active />
                        <ActionButton icon={Sparkles} label="Mejorar" />
                    </div>

                    {/* Settings/Options */}
                    <div className="flex items-center gap-2 text-gray-400">
                        <button className="p-2 hover:text-gray-600 transition-colors" title="Configuración">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Access Chips - Harvey Style */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
                <QuickChip icon={Scale} label="Leyes Federales" />
                <QuickChip icon={BookOpen} label="Jurisprudencia" />
                <QuickChip icon={Building} label="Estatales" />
                <QuickChip icon={FileText} label="Mis Casos" />
            </div>
        </div>
    );
}

function ActionButton({
    icon: Icon,
    label,
    active = false
}: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}) {
    return (
        <button
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

function QuickChip({
    icon: Icon,
    label
}: {
    icon: React.ElementType;
    label: string;
}) {
    return (
        <button className="chip">
            <Icon className="w-4 h-4 text-gray-400" />
            <span>{label}</span>
        </button>
    );
}
