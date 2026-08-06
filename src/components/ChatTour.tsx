'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TourStep {
    id: string;
    selector: string;
    title: string;
    description: string;
    preferBelow?: boolean; // fuerza el globo por debajo del elemento
    padding?: number;
}

/* Recorrido de la interfaz, revisado el 6-ago-2026 contra los controles que
   existen de verdad. La versión anterior se quedó corta: no mencionaba el
   rayo de respuesta rápida, el globo de fuentes de internet, Jurimetría,
   Mi trabajo ni el Secretario del PJF, que son justo lo que el abogado no
   sabe para qué sirve. El orden sigue el recorrido visual: primero la barra
   superior, después la caja de consulta de arriba abajo. */
const TOUR_STEPS: TourStep[] = [
    // ── Barra superior ────────────────────────────────────────────────
    {
        id: 'jurisdiccion',
        selector: '[data-guide="jurisdiccion"]',
        title: '📍 Tu jurisdicción',
        description: 'Marca el estado con el que trabajas. Toda consulta se filtra hacia la legislación de esa entidad, para que no se te cuele un artículo de otro código local.\n\nSe cambia con un clic, y puedes citar leyes de otro estado mencionándolo en la propia pregunta.',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'tcc-beta',
        selector: '[data-guide="tcc-beta"]',
        title: '⚖️ Sentencia — Secretario del PJF',
        description: 'Redacta un borrador de sentencia completo a partir del expediente: antecedentes, considerandos y puntos resolutivos, con la estructura que usa un tribunal.\n\nAbre su propia pantalla de trabajo, porque no es una consulta: es un documento largo.\n\nExclusivo del plan Platinum.',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'mi-trabajo',
        selector: '[data-guide="mi-trabajo"]',
        title: '📁 Mi trabajo',
        description: 'Tus carpetas. Aquí se guarda lo que produces —consultas, escritos, documentos analizados— organizado por asunto en lugar de perderse en el historial.\n\nEs el puente entre el chat y tu expediente real.',
        padding: 10,
        preferBelow: true,
    },

    // ── Filtros de la consulta ────────────────────────────────────────
    {
        id: 'fuero-filter',
        selector: '[data-guide="fuero-filter"]',
        title: '⚖️ Fuero',
        description: 'Define el ámbito normativo de la búsqueda:\n\n• Const. — CPEUM y tratados de derechos humanos.\n• Federal — leyes federales: LFT, CFF, LGTOC, Código Civil Federal.\n• Estatal — la legislación local de tu estado.\n\nSin nada marcado, Iurexia busca en todos los ámbitos y decide sola. Marcar fuero y materia juntos es la forma más rápida de afinar un resultado sin gastar un Genio.',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'materia-filter',
        selector: '[data-guide="materia-filter"]',
        title: '📚 Materia',
        description: 'Enfoca la consulta a una rama: Civil, Penal, Familiar o Administrativa.\n\nEn Auto, Iurexia detecta la materia por el texto de tu pregunta. Fíjala a mano cuando la consulta sea ambigua —«prescripción», por ejemplo, existe en casi todas las materias y significa cosas distintas en cada una.',
        padding: 10,
        preferBelow: true,
    },

    // ── Modificadores de la consulta ──────────────────────────────────
    {
        id: 'flash',
        selector: '[data-guide="flash"]',
        title: '⚡ Respuesta rápida',
        description: 'Enciende el rayo cuando quieres el artículo y nada más: la cita al grano, sin análisis ni desarrollo.\n\nÚsalo para verificar un plazo, un requisito o el texto exacto de una norma cuando ya sabes lo que buscas. Apágalo cuando quieras el razonamiento completo.',
        padding: 8,
    },
    {
        id: 'fuentes-web',
        selector: '[data-guide="fuentes-web"]',
        title: '🌐 Fuentes de internet',
        description: 'El globo azul añade una búsqueda en internet a tu consulta, restringida a dominios oficiales: poderes judiciales, congresos, diarios oficiales, portales de gobierno.\n\nSirve para reformas recientes o criterios que aún no están en el acervo. Verás en el flujo qué sitios se van consultando, y la respuesta termina con la lista de fuentes enlazadas.\n\nTarda unos segundos más, por eso lo enciendes tú. Lo que encuentre complementa la ley: nunca la sustituye.',
        padding: 8,
    },
    {
        id: 'buscar-redactar',
        selector: '[data-guide="buscar-redactar"]',
        title: '🔍 Buscar / ✍️ Redactar',
        description: 'Buscar — encuentra leyes, artículos y jurisprudencia con cita textual y referencia verificable.\n\nRedactar — construye el argumento jurídico ya articulado: considerandos, alegatos, fundamentos listos para un escrito.\n\nAl elegir Redactar aparecen tres escalones de calidad: Profesional (en todos los planes), Pro y Platinum, cada uno con un motor de razonamiento más profundo.',
        padding: 8,
    },

    // ── Modos de trabajo ──────────────────────────────────────────────
    {
        id: 'escrito',
        selector: '[data-guide="escrito"]',
        title: '📄 Escrito legal',
        description: 'Genera el documento formal completo: demanda, contestación, amparo, denuncia, recurso. Describe el caso y Iurexia arma la estructura con sus fundamentos.\n\nDisponible en todos los planes.',
        padding: 8,
    },
    {
        id: 'sentencia',
        selector: '[data-guide="sentencia"]',
        title: '🔨 Revisa una sentencia',
        description: 'Pega o sube una sentencia o resolución y Iurexia la audita: incoherencias en el razonamiento, apego a los principios constitucionales, vicios de forma y de fondo.\n\nEs el análisis crítico de una resolución ajena. Para redactar una propia, usa el Secretario del PJF de la barra superior.\n\nDesde el plan Pro.',
        padding: 8,
    },
    {
        id: 'precedentes',
        selector: '[data-guide="precedentes"]',
        title: '⚖️ Precedentes',
        description: 'Busca directamente en la jurisprudencia y las tesis del Poder Judicial de la Federación.\n\nAl activarlo eliges la corte —SCJN o Tribunales Colegiados— y, si quieres, la sala, el circuito o el tribunal concreto. La respuesta trae la ficha de cada criterio con su registro digital verificado.\n\nDesde el plan Pro.',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'jurimetria',
        selector: '[data-guide="jurimetria"]',
        title: '📊 Jurimetría',
        description: 'Estadística judicial: cómo han resuelto en la práctica los tribunales asuntos como el tuyo, en qué sentido y con qué frecuencia.\n\nSirve para calibrar expectativas antes de litigar y para sustentar una estrategia con números, no con intuición.\n\nExclusivo del plan Platinum.',
        padding: 8,
    },
    {
        id: 'genios',
        selector: '[data-guide="genios-container"]',
        title: '🧠 Genios — especialistas por materia',
        description: 'Cada Genio lleva en memoria el corpus completo de su materia —códigos, leyes orgánicas, reglamentos—, así que cita artículos textuales y conecta normas como un especialista.\n\nActívalo cuando la consulta pide profundidad real:\n• «¿Se puede revocar el aval de un pagaré?» → Mercantil\n• «Prescripción en delitos culposos» → Penal\n• «Competencia en amparo indirecto contra actos de tribunales» → Amparo\n\nSi no necesitas tanto, los filtros de fuero y materia ya te dan respuestas muy completas sin consumir una sesión.\n\nDesde el plan Pro. Hasta 2 a la vez; la sesión dura 3 minutos.',
        padding: 6,
    },

    // ── Entrada ───────────────────────────────────────────────────────
    {
        id: 'adjuntar',
        selector: '[data-guide="adjuntar"]',
        title: '📎 Adjuntar documento',
        description: 'Sube un PDF, Word o TXT y Iurexia lo lee completo para responder sobre él: contratos, actas, resoluciones, escritos de la contraparte.\n\nEl límite de páginas crece con tu plan. Si tienes el globo encendido, también contrasta el documento con fuentes oficiales en línea.',
        padding: 8,
    },
    {
        id: 'dictado',
        selector: '[data-guide="dictado"]',
        title: '🎙️ Dictado por voz',
        description: 'Dicta la consulta en vez de escribirla; se transcribe en tiempo real. Cómodo para describir un caso largo o mientras revisas el expediente en papel.\n\nFunciona en Chrome y Safari.',
        padding: 8,
    },
];

/** Índice de un paso por su id. Antes se codificaba a mano (PRECEDENTES_TOUR_STEP = 9)
 *  y cualquier reordenamiento del recorrido apuntaba el foco al botón equivocado. */
export function pasoPorId(id: string): number {
    const i = TOUR_STEPS.findIndex(p => p.id === id);
    return i === -1 ? 0 : i;
}

interface Rect { top: number; left: number; width: number; height: number; }

interface ChatTourProps {
    isOpen: boolean;
    onClose: () => void;
    startStep?: number;
}

export default function ChatTour({ isOpen, onClose, startStep = 0 }: ChatTourProps) {
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    // Sólo los pasos cuyo control existe de verdad en la pantalla. Antes, un
    // paso huérfano dejaba el globo flotando en mitad de la pantalla sin
    // señalar nada, y el contador «Paso 7/10» mentía.
    const [pasos, setPasos] = useState<TourStep[]>(TOUR_STEPS);

    useEffect(() => {
        if (!isOpen) return;
        const presentes = TOUR_STEPS.filter(p => document.querySelector(p.selector));
        const lista = presentes.length ? presentes : TOUR_STEPS;
        setPasos(lista);
        // startStep viene indexado sobre TOUR_STEPS; se traduce por id para que
        // el filtrado no desplace el foco a otro botón.
        const idBuscado = TOUR_STEPS[startStep]?.id;
        const i = lista.findIndex(p => p.id === idBuscado);
        setStep(i === -1 ? 0 : i);
    }, [isOpen, startStep]);

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
        if (!isOpen) return;
        const current = pasos[step];
        if (!current) return;
        const t = setTimeout(() => measureElement(current.selector, current.padding ?? 4), 150);
        return () => clearTimeout(t);
    }, [isOpen, step, pasos, measureElement]);

    useEffect(() => {
        const handleResize = () => {
            const current = pasos[step];
            if (isOpen && current) measureElement(current.selector, current.padding ?? 4);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, step, pasos, measureElement]);

    // Escape cierra el recorrido, y las flechas lo navegan.
    useEffect(() => {
        if (!isOpen) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setStep(s => Math.min(s + 1, pasos.length - 1));
            if (e.key === 'ArrowLeft') setStep(s => Math.max(s - 1, 0));
        };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [isOpen, pasos.length, onClose]);

    if (!isOpen) return null;

    const current = pasos[step];
    if (!current) return null;
    const isLast = step === pasos.length - 1;
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
                        Paso {step + 1} / {pasos.length}
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
                            {pasos.map((_, i) => (
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
