'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TourStep {
    selector: string;
    title: string;
    description: string;
    preferBelow?: boolean; // force tooltip below element
    padding?: number;
}

const TOUR_STEPS: TourStep[] = [
    {
        selector: '[data-guide="jurisdiccion"]',
        title: '🗺️ Tu jurisdicción',
        description: 'Al registrarte elegiste tu estado. Toda consulta se filtra automáticamente hacia la legislación de esa entidad federativa. Puedes cambiarlo desde tu perfil cuando lo necesites.',
        padding: 10,
        preferBelow: true,
    },
    {
        selector: '[data-guide="fuero-filter"]',
        title: '⚖️ Filtro de Fuero',
        description: 'Define el ámbito normativo de tu consulta:\n\n• Auto: Iurexia decide automáticamente (recomendado para la mayoría).\n• Const.: Enfoque en la CPEUM y tratados internacionales de DDHH.\n• Federal: Leyes federales como LGTOC, LFT, CFF, Código Civil Federal.\n• Estatal: Legislación local de tu estado seleccionado.\n\nCombinar este filtro con el de Materia te da resultados muy precisos sin necesidad de activar un Genio.',
        padding: 10,
        preferBelow: true,
    },
    {
        selector: '[data-guide="materia-filter"]',
        title: '📚 Filtro de Materia',
        description: 'Enfoca tu consulta a una rama jurídica específica:\n\n• Auto: Búsqueda amplia en todas las materias.\n• Civil: Contratos, obligaciones, propiedad, sucesiones.\n• Penal: Delitos, penas, procedimiento penal.\n• Familiar: Divorcio, custodia, alimentos, adopción.\n• Admin: Procedimiento administrativo, responsabilidades.\n\nAl seleccionar una materia, Iurexia filtra los resultados para que cada artículo, tesis y ley recuperada sea relevante a esa rama.',
        padding: 10,
        preferBelow: true,
    },
    {
        selector: '[data-guide="buscar-redactar"]',
        title: '🔍 Buscar / Redactar',
        description: 'Dos modos de trabajo:\n\nBuscar: Encuentra leyes, artículos y jurisprudencia con citas textuales exactas y referencias verificables.\n\nRedactar: Genera argumentos jurídicos articulados con estructura profesional. Ideal para preparar considerandos, alegatos o fundamentos de un escrito.\n\nCombina estos modos con los filtros de Fuero y Materia para obtener el máximo rendimiento.',
        padding: 8,
    },
    {
        selector: '[data-guide="genios-container"]',
        title: '🧠 Genios — Especialistas por materia',
        description: '¿Cuándo activar un Genio? Cuando tu consulta requiere máxima especialización. Cada Genio tiene en su memoria el corpus completo de leyes de su materia (códigos, leyes orgánicas, reglamentos), lo que le permite citar artículos textuales y conectar normas como un especialista.\n\nEjemplos ideales para Genio:\n• "¿Se puede revocar un aval en un pagaré?" → Genio Mercantil\n• "Prescripción en delitos culposos" → Genio Penal\n• "Competencia en amparo indirecto contra actos de tribunales" → Genio Amparo\n\n¿Y si no necesitas tanta especialización? Usa los filtros de Fuero y Materia. Te darán respuestas muy completas, con jurisprudencia y capacidad de redacción, sin consumir una sesión de Genio.\n\nReglas de uso:\n• Exclusivo plan Pro. Hasta 2 Genios simultáneos.\n• La sesión dura 3 minutos tras activarse.',
        padding: 6,
        preferBelow: false,
    },
    {
        selector: '[data-guide="escrito"]',
        title: '📄 Escrito Jurídico',
        description: 'Genera escritos jurídicos formales: demandas, contestaciones, recursos de amparo, denuncias y más. Describe tu caso y Iurexia estructura el documento completo con los fundamentos legales correspondientes.',
        padding: 8,
    },
    {
        selector: '[data-guide="sentencia"]',
        title: '🔨 Auditor de Sentencias',
        description: 'Sube o describe una sentencia o resolución judicial. Iurexia la analiza a profundidad: identifica inconsistencias jurídicas, evalúa el apego a principios constitucionales y señala posibles vicios de forma o fondo.',
        padding: 8,
    },
    {
        selector: '[data-guide="adjuntar"]',
        title: '📎 Adjuntar Documento',
        description: 'Sube un PDF, Word o TXT para que Iurexia lo analice en el contexto de tu consulta. Ideal para contratos, actas, resoluciones o cualquier documento que quieras revisar con criterio jurídico.',
        padding: 8,
    },
    {
        selector: '[data-guide="dictado"]',
        title: '🎙️ Dictado por Voz',
        description: 'Dicta tu consulta legal en lugar de escribirla. Iurexia transcribe tu voz en tiempo real. Útil para describir casos extensos o cuando prefieres hablar. Compatible con Chrome y Safari.',
        padding: 8,
    },
    {
        selector: '[data-guide="lawyer"]',
        title: '👩‍⚖️ Buscar Abogado',
        description: 'Iurexia Connect te conecta con abogados verificados de tu estado. Si tu consulta requiere representación profesional, encuentra al especialista adecuado de forma gratuita.',
        padding: 12,
        preferBelow: false,
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
        // First scroll element into view
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        // Then measure AFTER scroll finishes (300ms delay for smooth scroll)
        setTimeout(() => {
            const r = el.getBoundingClientRect();
            setRect({
                top: r.top - padding,
                left: r.left - padding,
                width: r.width + padding * 2,
                height: r.height + padding * 2,
            });
        }, 300);
    }, []);

    useEffect(() => {
        if (!isOpen) { setStep(0); return; }
        const current = TOUR_STEPS[step];
        const t = setTimeout(() => measureElement(current.selector, current.padding ?? 4), 150);
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

    const WH = typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1024, h: 768 };
    const tooltipW = 340;
    const GAP = 20; // gap between element and tooltip — never overlaps

    let tooltipStyle: React.CSSProperties = {};
    if (rect) {
        const centerX = Math.min(Math.max(rect.left + rect.width / 2 - tooltipW / 2, 16), WH.w - tooltipW - 16);
        const spaceBelow = WH.h - (rect.top + rect.height) - GAP;
        const spaceAbove = rect.top - GAP;

        if (current.preferBelow || spaceAbove < 160) {
            // Place BELOW the element
            tooltipStyle = { top: rect.top + rect.height + GAP, left: centerX };
        } else {
            // Place ABOVE the element
            tooltipStyle = { bottom: WH.h - rect.top + GAP, left: centerX };
        }
        void spaceBelow; // suppress unused warning
    } else {
        tooltipStyle = { top: WH.h / 2 - 80, left: WH.w / 2 - tooltipW / 2 };
    }

    // Split description on \n\n for multi-paragraph support
    const descParts = current.description.split('\n\n');

    return (
        <div className="fixed inset-0 z-[200]" style={{ pointerEvents: 'auto' }}>
            {/* Spotlight SVG overlay */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <defs>
                    <mask id="tour-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {rect && (
                            <rect
                                x={rect.left} y={rect.top}
                                width={rect.width} height={rect.height}
                                rx="10" fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tour-mask)" />
                {rect && (
                    <rect
                        x={rect.left - 2} y={rect.top - 2}
                        width={rect.width + 4} height={rect.height + 4}
                        rx="11" fill="none"
                        stroke="#c9a962" strokeWidth="2"
                        strokeDasharray="6 3"
                        style={{ animation: 'tourDash 1.2s linear infinite' }}
                    />
                )}
            </svg>

            {/* Dismiss on backdrop click */}
            <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto' }} />

            {/* Tooltip Card */}
            <div
                className="absolute shadow-2xl"
                style={{ ...tooltipStyle, width: tooltipW, pointerEvents: 'auto', zIndex: 210 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    background: 'linear-gradient(160deg, #1c1c1e 0%, #111111 100%)',
                    border: '1px solid rgba(201,169,98,0.4)',
                    borderRadius: '18px',
                    padding: '22px 22px 18px',
                    position: 'relative',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                }}>
                    {/* Close */}
                    <button onClick={onClose} style={{
                        position: 'absolute', top: 14, right: 14,
                        color: 'rgba(255,255,255,0.35)', background: 'none',
                        border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0,
                    }}>
                        <X size={15} />
                    </button>

                    {/* Step badge */}
                    <span style={{
                        fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
                        color: '#c9a962', textTransform: 'uppercase',
                        display: 'inline-block', marginBottom: 10,
                        background: 'rgba(201,169,98,0.10)',
                        padding: '3px 8px', borderRadius: 99,
                        border: '1px solid rgba(201,169,98,0.2)',
                    }}>
                        Paso {step + 1} / {TOUR_STEPS.length}
                    </span>

                    {/* Title */}
                    <h3 style={{
                        fontSize: '15px', fontWeight: 700, color: '#f0f0f0',
                        marginBottom: 10, lineHeight: 1.35,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                    }}>
                        {current.title}
                    </h3>

                    {/* Description — multi-paragraph */}
                    <div style={{ marginBottom: 18 }}>
                        {descParts.map((part, i) => (
                            <p key={i} style={{
                                fontSize: '12.5px', color: 'rgba(255,255,255,0.62)',
                                lineHeight: 1.65, marginBottom: i < descParts.length - 1 ? 10 : 0,
                            }}>
                                {part}
                            </p>
                        ))}
                    </div>

                    {/* Navigation row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Progress dots */}
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {TOUR_STEPS.map((_, i) => (
                                <button key={i} onClick={() => setStep(i)} style={{
                                    width: i === step ? 20 : 6, height: 6,
                                    borderRadius: 9999, padding: 0, border: 'none', cursor: 'pointer',
                                    background: i === step ? '#c9a962' : 'rgba(255,255,255,0.18)',
                                    transition: 'all 0.25s ease',
                                }} />
                            ))}
                        </div>

                        {/* Prev / Next */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {!isFirst && (
                                <button onClick={() => setStep(s => s - 1)} style={{
                                    padding: '6px 14px', borderRadius: 10, fontSize: 12,
                                    fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'transparent', color: 'rgba(255,255,255,0.55)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <ChevronLeft size={13} /> Anterior
                                </button>
                            )}
                            <button onClick={() => isLast ? onClose() : setStep(s => s + 1)} style={{
                                padding: '6px 18px', borderRadius: 10, fontSize: 12,
                                fontWeight: 700, border: 'none', cursor: 'pointer',
                                background: isLast
                                    ? 'linear-gradient(135deg, #c9a962 0%, #a07830 100%)'
                                    : 'rgba(255,255,255,0.10)',
                                color: isLast ? '#fff' : 'rgba(255,255,255,0.85)',
                                display: 'flex', alignItems: 'center', gap: 4,
                                transition: 'all 0.2s ease',
                            }}>
                                {isLast ? '¡Listo!' : (<>Siguiente <ChevronRight size={13} /></>)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes tourDash { to { stroke-dashoffset: -18; } }
            `}</style>
        </div>
    );
}
