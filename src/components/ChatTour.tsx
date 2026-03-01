'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TourStep {
    selector: string;          // CSS selector of element to highlight
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    padding?: number;          // extra padding around highlighted element
}

const TOUR_STEPS: TourStep[] = [
    {
        selector: '[data-guide="buscar-redactar"]',
        title: '🔍 Buscar / Redactar',
        description: 'Elige el modo de tu consulta. Buscar: encuentra leyes, artículos y jurisprudencia. Redactar: genera argumentos jurídicos articulados para tu caso.',
        position: 'top',
        padding: 8,
    },
    {
        selector: '[data-guide="genio-juridico"]',
        title: '⚡ Genio Jurídico',
        description: 'Activa el modelo avanzado con acceso al corpus legal completo. Respuestas más profundas y analíticas. Úsalo para comprender — sin él obtienes citas exactas de artículos.',
        position: 'top',
        padding: 8,
    },
    {
        selector: '[data-guide="escrito"]',
        title: '📄 Escrito',
        description: 'Redacta automáticamente escritos jurídicos formales: demandas, contestaciones, amparos y más. Solo describe tu caso y Iurexia estructura el documento.',
        position: 'top',
        padding: 8,
    },
    {
        selector: '[data-guide="sentencia"]',
        title: '⚖️ Sentencia / Auditor',
        description: 'Sube una sentencia o resolución judicial para que Iurexia la analice, detecte inconsistencias y evalúe su apego a derecho.',
        position: 'top',
        padding: 8,
    },
    {
        selector: '[data-guide="adjuntar"]',
        title: '📎 Adjuntar Documento',
        description: 'Sube un PDF, Word o TXT para que Iurexia lo analice en el contexto de tu consulta. Ideal para contratos, resoluciones o cualquier documento legal.',
        position: 'top',
        padding: 8,
    },
    {
        selector: '[data-guide="lawyer"]',
        title: '👩‍⚖️ Buscar Abogado',
        description: 'Iurexia Connect te conecta con abogados verificados de tu estado. Si tu consulta requiere representación real, encuentra al especialista adecuado sin costo.',
        position: 'top',
        padding: 12,
    },
];

interface Rect { top: number; left: number; width: number; height: number; }

interface ChatTourProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatTour({ isOpen, onClose }: ChatTourProps) {
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);

    const measureElement = useCallback((selector: string, padding = 4) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) { setRect(null); return; }
        const r = el.getBoundingClientRect();
        setRect({
            top: r.top - padding,
            left: r.left - padding,
            width: r.width + padding * 2,
            height: r.height + padding * 2,
        });
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (!isOpen) { setStep(0); return; }
        const current = TOUR_STEPS[step];
        // slight delay for scroll settling
        const t = setTimeout(() => measureElement(current.selector, current.padding ?? 4), 120);
        return () => clearTimeout(t);
    }, [isOpen, step, measureElement]);

    useEffect(() => {
        const handleResize = () => {
            if (isOpen) measureElement(TOUR_STEPS[step].selector, TOUR_STEPS[step].padding ?? 4);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, step, measureElement]);

    if (!isOpen) return null;

    const current = TOUR_STEPS[step];
    const isLast = step === TOUR_STEPS.length - 1;
    const isFirst = step === 0;

    // Tooltip placement
    const WH = typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1024, h: 768 };
    const tooltipW = 320;
    const tooltipH = 160;

    let tooltipStyle: React.CSSProperties = {};
    if (rect) {
        const below = rect.top + rect.height + 16;
        const above = rect.top - tooltipH - 16;
        const centerX = Math.min(Math.max(rect.left + rect.width / 2 - tooltipW / 2, 16), WH.w - tooltipW - 16);

        if (current.position === 'bottom' || above < 60) {
            tooltipStyle = { top: below, left: centerX };
        } else {
            tooltipStyle = { top: above, left: centerX };
        }
    } else {
        // Fallback — center of screen
        tooltipStyle = { top: WH.h / 2 - tooltipH / 2, left: WH.w / 2 - tooltipW / 2 };
    }

    return (
        <div className="fixed inset-0 z-[200]" style={{ pointerEvents: 'auto' }}>
            {/* Dark overlay with cutout */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
            >
                <defs>
                    <mask id="tour-mask">
                        {/* White = visible (dark overlay) */}
                        <rect width="100%" height="100%" fill="white" />
                        {/* Black = cutout (transparent spotlight) */}
                        {rect && (
                            <rect
                                x={rect.left}
                                y={rect.top}
                                width={rect.width}
                                height={rect.height}
                                rx="10"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.70)"
                    mask="url(#tour-mask)"
                />
                {/* Glow ring around highlighted element */}
                {rect && (
                    <rect
                        x={rect.left - 2}
                        y={rect.top - 2}
                        width={rect.width + 4}
                        height={rect.height + 4}
                        rx="11"
                        fill="none"
                        stroke="#c9a962"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        style={{ animation: 'dash 1.2s linear infinite' }}
                    />
                )}
            </svg>

            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto' }} />

            {/* Tooltip Card */}
            <div
                className="absolute shadow-2xl"
                style={{
                    ...tooltipStyle,
                    width: tooltipW,
                    pointerEvents: 'auto',
                    zIndex: 210,
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)',
                    border: '1px solid rgba(201,169,98,0.35)',
                    borderRadius: '16px',
                    padding: '20px',
                    position: 'relative',
                }}>
                    {/* Close */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 12, right: 12,
                            color: 'rgba(255,255,255,0.4)',
                            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        }}
                    >
                        <X size={16} />
                    </button>

                    {/* Step counter */}
                    <span style={{
                        fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
                        color: '#c9a962', textTransform: 'uppercase', display: 'block', marginBottom: 8,
                    }}>
                        Paso {step + 1} de {TOUR_STEPS.length}
                    </span>

                    {/* Title */}
                    <h3 style={{
                        fontSize: '15px', fontWeight: 700, color: '#f5f5f5',
                        marginBottom: 8, lineHeight: 1.3,
                        fontFamily: 'Georgia, serif',
                    }}>
                        {current.title}
                    </h3>

                    {/* Description */}
                    <p style={{
                        fontSize: '13px', color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.6, marginBottom: 16,
                    }}>
                        {current.description}
                    </p>

                    {/* Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Dots */}
                        <div style={{ display: 'flex', gap: 5 }}>
                            {TOUR_STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setStep(i)}
                                    style={{
                                        width: i === step ? 18 : 6,
                                        height: 6,
                                        borderRadius: 9999,
                                        background: i === step ? '#c9a962' : 'rgba(255,255,255,0.2)',
                                        border: 'none', cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        padding: 0,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Prev / Next */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {!isFirst && (
                                <button
                                    onClick={() => setStep(s => s - 1)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 10, fontSize: 12,
                                        fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'transparent', color: 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    }}
                                >
                                    <ChevronLeft size={13} /> Anterior
                                </button>
                            )}
                            <button
                                onClick={() => isLast ? onClose() : setStep(s => s + 1)}
                                style={{
                                    padding: '6px 16px', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, border: 'none',
                                    background: isLast
                                        ? 'linear-gradient(135deg, #c9a962, #a0813d)'
                                        : 'linear-gradient(135deg, #3b3b3b, #252525)',
                                    color: isLast ? '#fff' : 'rgba(255,255,255,0.85)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}
                            >
                                {isLast ? '¡Listo!' : (<>Siguiente <ChevronRight size={13} /></>)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes dash { to { stroke-dashoffset: -18; } }
            `}</style>
        </div>
    );
}
