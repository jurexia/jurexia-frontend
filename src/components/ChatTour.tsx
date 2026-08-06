'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import {
    X, ArrowLeft, ArrowRight, MapPin, Gavel, FolderClosed, Scale, Library,
    Zap, Globe, PenLine, FileText, ClipboardCheck, BookOpen, BarChart3,
    Brain, Paperclip, Mic,
} from 'lucide-react';

type Icono = typeof MapPin;

interface TourStep {
    id: string;
    selector: string;
    icono: Icono;
    title: string;
    /** Una idea por párrafo. Corto: la tarjeta es una guía, no un manual. */
    description: string;
    /** Plan mínimo, si la función está gatead. Se pinta como pastilla. */
    plan?: 'Pro' | 'Platinum';
    preferBelow?: boolean;
    padding?: number;
}

/* Recorrido de la interfaz, revisado el 6-ago-2026 contra los controles que
   existen de verdad, y reescrito en corto: la versión larga desbordaba la
   tarjeta y empujaba el botón «Siguiente» fuera de la pantalla. El orden
   sigue el recorrido visual: barra superior primero, después la caja de
   consulta de arriba abajo. */
const TOUR_STEPS: TourStep[] = [
    // ── Barra superior ────────────────────────────────────────────────
    {
        id: 'jurisdiccion',
        selector: '[data-guide="jurisdiccion"]',
        icono: MapPin,
        title: 'Tu jurisdicción',
        description: 'Fija el estado con el que trabajas. Toda consulta se filtra hacia esa legislación, para que no se cuele el código de otra entidad.\n\nPuedes citar leyes de otro estado mencionándolo en la pregunta.',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'tcc-beta',
        selector: '[data-guide="tcc-beta"]',
        icono: Gavel,
        title: 'Sentencia',
        description: 'El Secretario del PJF redacta un borrador completo desde el expediente: antecedentes, considerandos y resolutivos.\n\nAbre su propia pantalla: es un documento largo, no una consulta.',
        plan: 'Platinum',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'mi-trabajo',
        selector: '[data-guide="mi-trabajo"]',
        icono: FolderClosed,
        title: 'Mi trabajo',
        description: 'Tus carpetas. Lo que produces se guarda por asunto en lugar de perderse en el historial.\n\nEs el puente entre el chat y tu expediente real.',
        padding: 10,
        preferBelow: true,
    },

    // ── Filtros ───────────────────────────────────────────────────────
    {
        id: 'fuero-filter',
        selector: '[data-guide="fuero-filter"]',
        icono: Scale,
        title: 'Fuero',
        description: 'Acota el ámbito: Constitucional, Federal o Estatal.\n\nSin marcar nada, Iurexia busca en todos y decide. Fuero y materia juntos afinan un resultado sin gastar un Genio.',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'materia-filter',
        selector: '[data-guide="materia-filter"]',
        icono: Library,
        title: 'Materia',
        description: 'Enfoca la rama: Civil, Penal, Familiar o Administrativa.\n\nEn Auto se detecta sola. Fíjala cuando la palabra sea ambigua: «prescripción» significa algo distinto en cada materia.',
        padding: 10,
        preferBelow: true,
    },

    // ── Modificadores ─────────────────────────────────────────────────
    {
        id: 'flash',
        selector: '[data-guide="flash"]',
        icono: Zap,
        title: 'Respuesta rápida',
        description: 'El rayo entrega la cita al grano, sin desarrollo.\n\nPara verificar un plazo o el texto exacto de una norma cuando ya sabes qué buscas.',
        padding: 8,
    },
    {
        id: 'fuentes-web',
        selector: '[data-guide="fuentes-web"]',
        icono: Globe,
        title: 'Fuentes de internet',
        description: 'El globo añade una búsqueda en dominios oficiales: poderes judiciales, congresos, diarios oficiales.\n\nÚtil para reformas recientes. Verás los sitios consultados en el flujo y enlazados al final.\n\nComplementa la ley; nunca la sustituye.',
        padding: 8,
    },
    {
        id: 'buscar-redactar',
        selector: '[data-guide="buscar-redactar"]',
        icono: PenLine,
        title: 'Buscar y Redactar',
        description: 'Buscar encuentra la norma con cita textual verificable.\n\nRedactar construye el argumento ya articulado. Al elegirlo aparecen tres escalones: Profesional, Pro y Platinum.',
        padding: 8,
    },

    // ── Modos de trabajo ──────────────────────────────────────────────
    {
        id: 'escrito',
        selector: '[data-guide="escrito"]',
        icono: FileText,
        title: 'Escrito legal',
        description: 'El documento formal completo: demanda, contestación, amparo, denuncia o recurso, con sus fundamentos.',
        padding: 8,
    },
    {
        id: 'sentencia',
        selector: '[data-guide="sentencia"]',
        icono: ClipboardCheck,
        title: 'Revisa una sentencia',
        description: 'Audita una resolución ajena: incoherencias del razonamiento, apego constitucional, vicios de forma y fondo.\n\nPara redactar una propia, usa Sentencia en la barra superior.',
        plan: 'Pro',
        padding: 8,
    },
    {
        id: 'precedentes',
        selector: '[data-guide="precedentes"]',
        icono: BookOpen,
        title: 'Precedentes',
        description: 'Jurisprudencia y tesis del Poder Judicial de la Federación.\n\nEliges corte, sala, circuito o tribunal. Cada criterio llega con su registro digital verificado.',
        plan: 'Pro',
        padding: 10,
        preferBelow: true,
    },
    {
        id: 'jurimetria',
        selector: '[data-guide="jurimetria"]',
        icono: BarChart3,
        title: 'Jurimetría',
        description: 'Cómo han resuelto los tribunales asuntos como el tuyo, en qué sentido y con qué frecuencia.\n\nPara calibrar expectativas con números antes de litigar.',
        plan: 'Platinum',
        padding: 8,
    },
    {
        id: 'genios',
        selector: '[data-guide="genios-container"]',
        icono: Brain,
        title: 'Genios',
        description: 'Cada Genio lleva en memoria el corpus completo de su materia, así que cita artículos textuales como un especialista.\n\nActívalo cuando la consulta pida profundidad real. Si no, los filtros ya dan respuestas muy completas.\n\nHasta 2 a la vez; la sesión dura 3 minutos.',
        plan: 'Pro',
        padding: 6,
    },

    // ── Entrada ───────────────────────────────────────────────────────
    {
        id: 'adjuntar',
        selector: '[data-guide="adjuntar"]',
        icono: Paperclip,
        title: 'Adjuntar documento',
        description: 'Sube un PDF, Word o TXT y Iurexia lo lee completo para responder sobre él.\n\nEl límite de páginas crece con tu plan.',
        padding: 8,
    },
    {
        id: 'dictado',
        selector: '[data-guide="dictado"]',
        icono: Mic,
        title: 'Dictado por voz',
        description: 'Dicta la consulta en vez de escribirla; se transcribe en tiempo real.\n\nFunciona en Chrome y Safari.',
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

const MARGEN = 16;   // aire mínimo contra el borde de la ventana
const HUECO = 14;    // separación entre el control iluminado y la tarjeta

export default function ChatTour({ isOpen, onClose, startStep = 0 }: ChatTourProps) {
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    // Sólo los pasos cuyo control existe de verdad en la pantalla. Un paso
    // huérfano dejaba la tarjeta flotando sin señalar nada y el contador
    // «Paso 7/10» mentía.
    const [pasos, setPasos] = useState<TourStep[]>(TOUR_STEPS);
    const [ventana, setVentana] = useState({ w: 1024, h: 768 });
    const tarjetaRef = useRef<HTMLDivElement>(null);
    const [altoTarjeta, setAltoTarjeta] = useState(0);

    const esMovil = ventana.w < 640;

    useEffect(() => {
        const medir = () => setVentana({ w: window.innerWidth, h: window.innerHeight });
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, []);

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

    const medirElemento = useCallback((selector: string, padding = 4) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) { setRect(null); return; }
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
        const actual = pasos[step];
        if (!actual) return;
        const t = setTimeout(() => medirElemento(actual.selector, actual.padding ?? 4), 150);
        return () => clearTimeout(t);
    }, [isOpen, step, pasos, medirElemento]);

    useEffect(() => {
        const alRedimensionar = () => {
            const actual = pasos[step];
            if (isOpen && actual) medirElemento(actual.selector, actual.padding ?? 4);
        };
        window.addEventListener('resize', alRedimensionar);
        return () => window.removeEventListener('resize', alRedimensionar);
    }, [isOpen, step, pasos, medirElemento]);

    // La altura real de la tarjeta manda en la colocación: sin medirla no se
    // puede garantizar que el pie —y con él «Siguiente»— quede dentro.
    useLayoutEffect(() => {
        if (!isOpen) return;
        const el = tarjetaRef.current;
        if (!el) return;
        const medir = () => setAltoTarjeta(el.getBoundingClientRect().height);
        medir();
        const ro = new ResizeObserver(medir);
        ro.observe(el);
        return () => ro.disconnect();
    }, [isOpen, step, pasos]);

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

    const actual = pasos[step];
    if (!actual) return null;
    const esUltimo = step === pasos.length - 1;
    const esPrimero = step === 0;
    const Icono = actual.icono;

    /* ── Colocación ────────────────────────────────────────────────────
       En móvil la tarjeta se ancla abajo, ocupando el ancho: perseguir un
       control de 40px en 375px de pantalla no cabe.
       En escritorio se coloca debajo o encima del control y SIEMPRE se
       recorta contra la ventana con `alto` ya medido, así que el pie nunca
       se sale. Antes sólo se fijaba `top`/`bottom` sin mirar la altura, y
       con textos largos «Siguiente» quedaba fuera de la pantalla. */
    const anchoTarjeta = esMovil ? ventana.w - MARGEN * 2 : 360;
    const altoMax = Math.min(esMovil ? ventana.h * 0.55 : ventana.h * 0.72, 520);

    let estilo: React.CSSProperties;
    if (esMovil) {
        estilo = { left: MARGEN, bottom: MARGEN, width: anchoTarjeta };
    } else if (rect) {
        const alto = altoTarjeta || altoMax;
        const centroX = Math.min(
            Math.max(rect.left + rect.width / 2 - anchoTarjeta / 2, MARGEN),
            ventana.w - anchoTarjeta - MARGEN,
        );
        const espacioAbajo = ventana.h - (rect.top + rect.height) - HUECO;
        const espacioArriba = rect.top - HUECO;
        const debajo = actual.preferBelow
            ? espacioAbajo >= alto || espacioAbajo >= espacioArriba
            : espacioArriba < alto && espacioAbajo > espacioArriba;

        const deseado = debajo ? rect.top + rect.height + HUECO : rect.top - HUECO - alto;
        const arriba = Math.min(
            Math.max(deseado, MARGEN),
            Math.max(MARGEN, ventana.h - alto - MARGEN),
        );
        estilo = { top: arriba, left: centroX, width: anchoTarjeta };
    } else {
        estilo = {
            top: Math.max(MARGEN, ventana.h / 2 - (altoTarjeta || 240) / 2),
            left: Math.max(MARGEN, ventana.w / 2 - anchoTarjeta / 2),
            width: anchoTarjeta,
        };
    }

    const parrafos = actual.description.split('\n\n');
    const avance = ((step + 1) / pasos.length) * 100;

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Foco */}
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
                <rect width="100%" height="100%" fill="rgba(12,12,12,0.66)" mask="url(#tour-mask)" />
                {rect && (
                    <rect
                        x={rect.left} y={rect.top}
                        width={rect.width} height={rect.height}
                        rx="10" fill="none"
                        stroke="#c9a962" strokeWidth="1.5" strokeOpacity="0.9"
                    />
                )}
            </svg>

            <div className="absolute inset-0" onClick={onClose} />

            {/* Tarjeta */}
            <div
                ref={tarjetaRef}
                className="absolute flex flex-col overflow-hidden"
                style={{
                    ...estilo,
                    maxHeight: altoMax,
                    zIndex: 210,
                    background: '#fbfaf7',
                    border: '1px solid rgba(26,26,26,0.10)',
                    borderRadius: 16,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Barra de avance: sustituye a los puntos. Un solo trazo. */}
                <div style={{ height: 2, background: 'rgba(26,26,26,0.07)', flexShrink: 0 }}>
                    <div style={{
                        height: '100%', width: `${avance}%`, background: '#c9a962',
                        transition: 'width 0.3s ease',
                    }} />
                </div>

                {/* Cabecera */}
                <div className="flex items-start gap-3 px-5 pt-4 pb-3" style={{ flexShrink: 0 }}>
                    <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                            width: 30, height: 30, borderRadius: 9,
                            background: 'rgba(201,169,98,0.13)',
                        }}
                    >
                        <Icono size={15} color="#8a6d2e" strokeWidth={1.9} />
                    </span>

                    <div className="min-w-0 flex-1">
                        <h3 style={{
                            fontSize: 15, fontWeight: 600, color: '#1a1a1a',
                            lineHeight: 1.3, letterSpacing: '-0.01em',
                        }}>
                            {actual.title}
                        </h3>
                        {actual.plan && (
                            <span style={{
                                display: 'inline-block', marginTop: 5,
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                                textTransform: 'uppercase', color: '#8a6d2e',
                                background: 'rgba(201,169,98,0.13)',
                                padding: '2px 7px', borderRadius: 5,
                            }}>
                                Plan {actual.plan}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Cerrar guía"
                        className="flex-shrink-0 transition-colors"
                        style={{ color: 'rgba(26,26,26,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(26,26,26,0.65)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(26,26,26,0.3)')}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Cuerpo: es lo ÚNICO que se desplaza. El pie queda anclado,
                    así que «Siguiente» está siempre a la vista. */}
                <div className="px-5 pb-4 overflow-y-auto sidebar-scroll" style={{ flex: '1 1 auto', minHeight: 0 }}>
                    {parrafos.map((p, i) => (
                        <p key={i} style={{
                            fontSize: 13, lineHeight: 1.6, color: 'rgba(26,26,26,0.66)',
                            marginBottom: i < parrafos.length - 1 ? 9 : 0,
                        }}>
                            {p}
                        </p>
                    ))}
                </div>

                {/* Pie */}
                <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ flexShrink: 0, borderTop: '1px solid rgba(26,26,26,0.07)' }}
                >
                    <span style={{ fontSize: 11, color: 'rgba(26,26,26,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                        {step + 1} de {pasos.length}
                    </span>

                    <div className="flex items-center gap-1.5">
                        {!esPrimero && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                aria-label="Paso anterior"
                                className="flex items-center justify-center transition-colors"
                                style={{
                                    width: 30, height: 30, borderRadius: 9,
                                    border: '1px solid rgba(26,26,26,0.12)',
                                    background: 'transparent', color: 'rgba(26,26,26,0.5)', cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,26,26,0.04)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <ArrowLeft size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => (esUltimo ? onClose() : setStep(s => s + 1))}
                            className="flex items-center gap-1.5 transition-opacity hover:opacity-90"
                            style={{
                                height: 30, padding: '0 14px', borderRadius: 9,
                                fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: '#1a1a1a', color: '#fff',
                            }}
                        >
                            {esUltimo ? 'Entendido' : 'Siguiente'}
                            {!esUltimo && <ArrowRight size={13} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
