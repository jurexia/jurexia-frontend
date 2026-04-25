'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FeedbackWidgetProps {
    userId?: string;
    userEmail?: string;
    userName?: string;
}

type FeedbackCategory = 'error' | 'mejora' | 'otro';

const CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; emoji: string; placeholder: string }> = {
    error: {
        label: 'Reportar un error',
        emoji: '🐛',
        placeholder: 'Describe el error que encontraste: qué estabas haciendo, qué esperabas y qué ocurrió...',
    },
    mejora: {
        label: 'Sugerir una mejora',
        emoji: '💡',
        placeholder: 'Cuéntanos qué funcionalidad te gustaría ver o qué podríamos mejorar...',
    },
    otro: {
        label: 'Otro comentario',
        emoji: '💬',
        placeholder: 'Escribe tu mensaje aquí...',
    },
};

export default function FeedbackWidget({ userId, userEmail, userName }: FeedbackWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [phase, setPhase] = useState<'form' | 'sending' | 'success'>('form');
    const [category, setCategory] = useState<FeedbackCategory>('error');
    const [message, setMessage] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Focus textarea when panel opens
    useEffect(() => {
        if (isOpen && phase === 'form') {
            setTimeout(() => textareaRef.current?.focus(), 300);
        }
    }, [isOpen, phase]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleClose = () => {
        setIsOpen(false);
        // Reset after animation
        setTimeout(() => {
            setPhase('form');
            setMessage('');
            setCategory('error');
        }, 300);
    };

    const handleSubmit = async () => {
        if (!message.trim() || !userId) return;

        setPhase('sending');

        try {
            const { error } = await supabase.from('user_feedback').insert({
                user_id: userId,
                user_email: userEmail || null,
                user_name: userName || null,
                category,
                message: message.trim(),
            });

            if (error) throw error;
            setPhase('success');
        } catch (err) {
            console.error('Error sending feedback:', err);
            // Still show success to user (graceful degradation)
            setPhase('success');
        }
    };

    const currentCategory = CATEGORY_CONFIG[category];

    return (
        <>
            {/* ═══ FLOATING BUTTON ═══ */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed z-40 transition-all duration-300 ease-out group ${
                    isOpen 
                        ? 'bottom-[420px] sm:bottom-[460px] right-4 sm:right-6 scale-90 opacity-70 hover:opacity-100' 
                        : 'bottom-24 sm:bottom-6 right-4 sm:right-6 hover:scale-110'
                }`}
                title="Enviar feedback o reportar un error"
                aria-label="Abrir widget de feedback"
            >
                <div className="relative">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300"
                        style={{
                            background: isOpen
                                ? '#374151'
                                : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '2px solid rgba(201, 168, 76, 0.4)',
                        }}
                    >
                        {isOpen ? (
                            <X className="w-5 h-5 text-white" />
                        ) : (
                            <MessageCircle className="w-5 h-5 text-accent-gold" />
                        )}
                    </div>
                    {/* Pulse ring — only when closed */}
                    {!isOpen && (
                        <span
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{
                                background: 'rgba(201, 168, 76, 0.15)',
                                animationDuration: '3s',
                            }}
                        />
                    )}
                </div>
            </button>

            {/* ═══ FEEDBACK PANEL ═══ */}
            <div
                ref={panelRef}
                className={`fixed z-50 right-4 sm:right-6 bottom-20 sm:bottom-6 w-[calc(100vw-2rem)] sm:w-[380px] transition-all duration-300 ease-out ${
                    isOpen
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                }`}
            >
                <div
                    className="rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                    style={{ background: '#0f0f0f' }}
                >
                    {/* ── Header ── */}
                    <div
                        className="relative px-6 pt-6 pb-5"
                        style={{
                            background: 'linear-gradient(135deg, #1a1510 0%, #0f0f0f 100%)',
                        }}
                    >
                        <div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{
                                background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)',
                            }}
                        />
                        {/* Close */}
                        <button
                            onClick={handleClose}
                            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white/50" />
                        </button>

                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #c9a84c 0%, #a88832 100%)',
                                }}
                            >
                                <span className="text-white font-serif font-bold text-lg">I</span>
                            </div>
                            <div>
                                <h3 className="font-serif text-lg font-semibold text-white leading-tight">
                                    Iurex<span style={{ color: '#c9a84c' }}>ia</span>
                                </h3>
                                <p className="text-white/40 text-[11px]">Soporte y Feedback</p>
                            </div>
                        </div>

                        {phase === 'form' && (
                            <p className="text-white/70 text-sm leading-relaxed">
                                Hola{userName ? `, ${userName.split(' ')[0]}` : ''} 👋<br />
                                <span className="text-white/50 text-xs">
                                    ¿Encontraste un error o tienes una sugerencia? Tu opinión nos ayuda a mejorar.
                                </span>
                            </p>
                        )}
                    </div>

                    {/* ── Body ── */}
                    <div className="px-6 py-5">
                        {phase === 'form' && (
                            <div className="space-y-4">
                                {/* Category selector */}
                                <div className="relative">
                                    <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                                        Tipo de mensaje
                                    </label>
                                    <button
                                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-left"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-white">
                                            <span>{currentCategory.emoji}</span>
                                            <span>{currentCategory.label}</span>
                                        </span>
                                        <ChevronDown
                                            className={`w-4 h-4 text-white/30 transition-transform duration-200 ${
                                                showCategoryDropdown ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {showCategoryDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden z-10 shadow-xl">
                                            {(Object.entries(CATEGORY_CONFIG) as [FeedbackCategory, typeof CATEGORY_CONFIG['error']][]).map(
                                                ([key, config]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            setCategory(key);
                                                            setShowCategoryDropdown(false);
                                                        }}
                                                        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                                                            key === category
                                                                ? 'bg-accent-gold/10 text-accent-gold'
                                                                : 'text-white/70 hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <span>{config.emoji}</span>
                                                        <span>{config.label}</span>
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Message textarea */}
                                <div>
                                    <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                                        Tu mensaje
                                    </label>
                                    <textarea
                                        ref={textareaRef}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder={currentCategory.placeholder}
                                        rows={4}
                                        maxLength={2000}
                                        className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 resize-none focus:outline-none focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 transition-all"
                                        style={{ scrollbarWidth: 'thin' }}
                                    />
                                    <div className="flex justify-end mt-1">
                                        <span className={`text-[10px] ${message.length > 1800 ? 'text-amber-400' : 'text-white/20'}`}>
                                            {message.length}/2000
                                        </span>
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={!message.trim()}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                                        message.trim()
                                            ? 'hover:scale-[1.02] active:scale-95 cursor-pointer'
                                            : 'opacity-40 cursor-not-allowed'
                                    }`}
                                    style={{
                                        background: message.trim()
                                            ? 'linear-gradient(135deg, #c9a84c, #e8c56d)'
                                            : 'rgba(255,255,255,0.05)',
                                        color: message.trim() ? '#1a1a1a' : 'rgba(255,255,255,0.3)',
                                    }}
                                >
                                    <Send className="w-4 h-4" />
                                    Enviar mensaje
                                </button>
                            </div>
                        )}

                        {phase === 'sending' && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="w-10 h-10 rounded-full border-2 border-accent-gold/30 border-t-accent-gold animate-spin mb-4" />
                                <p className="text-white/60 text-sm">Enviando tu mensaje...</p>
                            </div>
                        )}

                        {phase === 'success' && (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div
                                    className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                                    style={{ background: 'rgba(34, 197, 94, 0.1)', border: '2px solid rgba(34, 197, 94, 0.3)' }}
                                >
                                    <CheckCircle className="w-7 h-7 text-emerald-400" />
                                </div>
                                <h4 className="font-serif text-lg font-semibold text-white mb-2">
                                    ¡Gracias por tu mensaje!
                                </h4>
                                <p className="text-white/50 text-sm leading-relaxed mb-4 max-w-[280px]">
                                    Tu {category === 'error' ? 'reporte' : category === 'mejora' ? 'sugerencia' : 'mensaje'} será
                                    revisado por nuestro equipo de soporte de Iurexia. Nos comprometemos a mejorar tu experiencia.
                                </p>
                                <div className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <p className="text-white/40 text-[11px] mb-1">
                                        Para una atención más completa, escríbenos a:
                                    </p>
                                    <a
                                        href="mailto:soporte@iurexia.com"
                                        className="text-accent-gold text-sm font-semibold hover:underline"
                                    >
                                        soporte@iurexia.com
                                    </a>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="mt-5 text-white/40 hover:text-white/70 text-xs transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    {phase === 'form' && (
                        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-center gap-1.5">
                            <span className="text-white/20 text-[10px]">⚡</span>
                            <span className="text-white/20 text-[10px]">Powered by Iurexia</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
