'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    MapPin,
    Paperclip,
    Search,
    FileEdit,
    Gavel,
    Users,
    X,
    ChevronLeft,
    ChevronRight,
    BookOpen
} from 'lucide-react';

interface GuideStep {
    guideId: string;
    icon: React.ElementType;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

const GUIDE_STEPS: GuideStep[] = [
    {
        guideId: 'jurisdiction',
        icon: MapPin,
        title: 'Seleccionar Jurisdicción',
        description: 'Filtra resultados por estado. Incluye leyes federales y jurisprudencia por defecto.',
        position: 'bottom',
    },
    {
        guideId: 'upload',
        icon: Paperclip,
        title: 'Subir Documento',
        description: 'Sube sentencias, contratos o demandas para análisis profundo con IA.',
        position: 'top',
    },
    {
        guideId: 'search',
        icon: Search,
        title: 'Buscar',
        description: 'Modo predeterminado. Consulta leyes, artículos y jurisprudencia mexicana.',
        position: 'top',
    },
    {
        guideId: 'draft',
        icon: FileEdit,
        title: 'Redactar',
        description: 'Genera borradores de demandas, contratos y documentos legales fundamentados.',
        position: 'top',
    },
    {
        guideId: 'sentencia',
        icon: Gavel,
        title: 'Revisar Sentencia',
        description: 'Analiza sentencias para encontrar fortalezas, debilidades y argumentos clave.',
        position: 'top',
    },
    {
        guideId: 'lawyer',
        icon: Users,
        title: 'Buscar Abogado',
        description: 'Conecta con abogados especializados en tu zona y materia jurídica.',
        position: 'top',
    },
];

interface VisualGuideOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VisualGuideOverlay({ isOpen, onClose }: VisualGuideOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowPoints, setArrowPoints] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const step = GUIDE_STEPS[currentStep];

    // Find and measure the target element
    const measureTarget = useCallback(() => {
        if (!isOpen || !step) return;

        const el = document.querySelector(`[data-guide="${step.guideId}"]`);
        if (!el) {
            setTargetRect(null);
            return;
        }

        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate tooltip position
        const padding = 16;
        const tooltipWidth = 320;
        const tooltipHeight = 140;
        const arrowGap = 20;
        let top = 0;
        let left = 0;
        let arrowFrom = { x: 0, y: 0 };
        let arrowTo = { x: 0, y: 0 };

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Determine best position
        let pos = step.position;

        // Override if not enough space
        if (pos === 'top' && rect.top < tooltipHeight + arrowGap + padding) {
            pos = 'bottom';
        }
        if (pos === 'bottom' && window.innerHeight - rect.bottom < tooltipHeight + arrowGap + padding) {
            pos = 'top';
        }

        switch (pos) {
            case 'top':
                top = rect.top - tooltipHeight - arrowGap;
                left = Math.max(padding, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
                arrowFrom = { x: left + tooltipWidth / 2, y: top + tooltipHeight };
                arrowTo = { x: centerX, y: rect.top - 4 };
                break;
            case 'bottom':
                top = rect.bottom + arrowGap;
                left = Math.max(padding, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
                arrowFrom = { x: left + tooltipWidth / 2, y: top };
                arrowTo = { x: centerX, y: rect.bottom + 4 };
                break;
            case 'left':
                top = Math.max(padding, centerY - tooltipHeight / 2);
                left = rect.left - tooltipWidth - arrowGap;
                arrowFrom = { x: left + tooltipWidth, y: top + tooltipHeight / 2 };
                arrowTo = { x: rect.left - 4, y: centerY };
                break;
            case 'right':
                top = Math.max(padding, centerY - tooltipHeight / 2);
                left = rect.right + arrowGap;
                arrowFrom = { x: left, y: top + tooltipHeight / 2 };
                arrowTo = { x: rect.right + 4, y: centerY };
                break;
        }

        setTooltipStyle({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${tooltipWidth}px`,
            zIndex: 10002,
        });

        setArrowPoints({ from: arrowFrom, to: arrowTo });
    }, [isOpen, step]);

    // Measure on mount, step change, and window resize
    useEffect(() => {
        if (!isOpen) return;

        measureTarget();

        const handleResize = () => measureTarget();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [isOpen, currentStep, measureTarget]);

    // Reset step when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (currentStep < GUIDE_STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1);
                } else {
                    onClose();
                }
            } else if (e.key === 'ArrowLeft') {
                if (currentStep > 0) {
                    setCurrentStep(prev => prev - 1);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentStep, onClose]);

    if (!isOpen) return null;

    const Icon = step.icon;
    const isFirst = currentStep === 0;
    const isLast = currentStep === GUIDE_STEPS.length - 1;

    // Spotlight cutout dimensions
    const cutoutPadding = 8;
    const cutoutRadius = 12;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[10000]"
            onClick={(e) => {
                // Close only if clicking the backdrop, not the tooltip
                if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.guideBackdrop) {
                    onClose();
                }
            }}
        >
            {/* SVG Overlay with spotlight cutout */}
            <svg
                className="fixed inset-0 w-full h-full"
                style={{ zIndex: 10000 }}
                data-guide-backdrop="true"
                onClick={(e) => {
                    // Only close if clicking the dark area
                    if ((e.target as SVGElement).tagName === 'path') {
                        onClose();
                    }
                }}
            >
                <defs>
                    <mask id="guide-spotlight-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - cutoutPadding}
                                y={targetRect.top - cutoutPadding}
                                width={targetRect.width + cutoutPadding * 2}
                                height={targetRect.height + cutoutPadding * 2}
                                rx={cutoutRadius}
                                fill="black"
                            />
                        )}
                    </mask>

                    {/* Gold glow filter */}
                    <filter id="guide-glow">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feFlood floodColor="#c9a962" floodOpacity="0.6" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Dark overlay with spotlight cutout */}
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.78)"
                    mask="url(#guide-spotlight-mask)"
                    style={{ cursor: 'pointer' }}
                />

                {/* Gold glowing border around cutout */}
                {targetRect && (
                    <rect
                        x={targetRect.left - cutoutPadding}
                        y={targetRect.top - cutoutPadding}
                        width={targetRect.width + cutoutPadding * 2}
                        height={targetRect.height + cutoutPadding * 2}
                        rx={cutoutRadius}
                        fill="none"
                        stroke="#c9a962"
                        strokeWidth="2"
                        filter="url(#guide-glow)"
                        style={{ pointerEvents: 'none' }}
                    />
                )}

                {/* Connecting arrow */}
                {arrowPoints && (
                    <g style={{ pointerEvents: 'none' }}>
                        <defs>
                            <marker
                                id="guide-arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                                fill="#c9a962"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" />
                            </marker>
                        </defs>
                        <line
                            x1={arrowPoints.from.x}
                            y1={arrowPoints.from.y}
                            x2={arrowPoints.to.x}
                            y2={arrowPoints.to.y}
                            stroke="#c9a962"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                            markerEnd="url(#guide-arrowhead)"
                            opacity="0.85"
                        />
                    </g>
                )}
            </svg>

            {/* Tooltip Card */}
            <div
                style={tooltipStyle}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, rgba(26,26,26,0.97) 0%, rgba(45,45,45,0.97) 100%)',
                        border: '1px solid rgba(201, 169, 98, 0.4)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(201, 169, 98, 0.1)',
                        backdropFilter: 'blur(20px)',
                    }}
                    className="p-5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, rgba(201, 169, 98, 0.2) 0%, rgba(139, 115, 85, 0.2) 100%)',
                                border: '1px solid rgba(201, 169, 98, 0.3)',
                            }}
                        >
                            <Icon className="w-5 h-5" style={{ color: '#c9a962' }} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-white leading-tight">
                                {step.title}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                            onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                            }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Description */}
                    <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                        {step.description}
                    </p>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        {/* Step counter */}
                        <div className="flex items-center gap-1.5">
                            {GUIDE_STEPS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    className="transition-all duration-200"
                                    style={{
                                        width: idx === currentStep ? '20px' : '6px',
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: idx === currentStep
                                            ? '#c9a962'
                                            : idx < currentStep
                                                ? 'rgba(201, 169, 98, 0.4)'
                                                : 'rgba(255,255,255,0.2)',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Nav buttons */}
                        <div className="flex items-center gap-2">
                            {!isFirst && (
                                <button
                                    onClick={() => setCurrentStep(prev => prev - 1)}
                                    className="p-2 rounded-lg transition-colors"
                                    style={{
                                        color: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201, 169, 98, 0.4)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (isLast) {
                                        onClose();
                                    } else {
                                        setCurrentStep(prev => prev + 1);
                                    }
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: isLast
                                        ? 'linear-gradient(135deg, #c9a962 0%, #8b7355 100%)'
                                        : 'rgba(201, 169, 98, 0.15)',
                                    color: isLast ? '#fff' : '#c9a962',
                                    border: isLast ? 'none' : '1px solid rgba(201, 169, 98, 0.3)',
                                }}
                                onMouseEnter={e => {
                                    if (!isLast) e.currentTarget.style.background = 'rgba(201, 169, 98, 0.25)';
                                }}
                                onMouseLeave={e => {
                                    if (!isLast) e.currentTarget.style.background = 'rgba(201, 169, 98, 0.15)';
                                }}
                            >
                                {isLast ? (
                                    <span className="flex items-center gap-1.5">
                                        ¡Entendido!
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        Siguiente
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header badge */}
            <div
                className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                    zIndex: 10001,
                    background: 'rgba(26,26,26,0.9)',
                    border: '1px solid rgba(201, 169, 98, 0.3)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
            >
                <BookOpen className="w-4 h-4" style={{ color: '#c9a962' }} />
                <span className="text-sm font-medium text-white">
                    Guía Rápida
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {currentStep + 1} / {GUIDE_STEPS.length}
                </span>
            </div>
        </div>
    );
}
