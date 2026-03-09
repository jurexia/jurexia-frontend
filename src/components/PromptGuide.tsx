'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Scale, Briefcase, Users, Zap } from 'lucide-react';

interface PromptGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROMPT_TIPS = [
    {
        icon: Zap,
        category: '✨ Genios Especializados',
        title: 'Actívalos para análisis profundos y combinados',
        description: 'Los Genios (Amparo, CIDH, Civil, Penal, etc.) activan un modelo avanzado con acceso a corpus por materia. Puedes activar hasta 2 simultáneamente. La calidad y precisión aumenta considerablemente: razona mejor, cruza información y analiza con mayor detalle interdisciplinario.',
        tips: [
            'Úsalos cuando quieras entender a fondo un tema legal, cruzar leyes o sus implicaciones',
            'Ideal para redactar, analizar o interpretar textos jurídicos complejos desde múltiples ópticas',
            '⚠️ Advertencia: al activar genios, el razonamiento prima sobre la cita textual corta. Si necesitas citas directas y exactas de artículos para fundar un escrito, prueba buscar con los genios desactivados',
            'Regla de oro — Genio activo: comprensión y análisis profundo. Genio desactivado: fuentes citadas y directas',
        ],
    },
    {
        icon: Scale,
        category: '⚖️ Filtro de Fuero',
        title: 'Enfoca tu búsqueda por ámbito legal',
        description: 'El selector de fuero prioriza el tipo de normatividad que Iurexia revisa al responder tu consulta.',
        tips: [
            'Todos — búsqueda amplia en todo el corpus (recomendado por defecto)',
            'Constitucional — prioriza CPEUM, tratados internacionales y derechos humanos',
            'Federal — leyes federales: LGTOC, LFT, Código Civil Federal, etc.',
            'Estatal — legislación del estado que seleccionaste al iniciar sesión',
        ],
    },
    {
        icon: Scale,
        category: '⚖️ Para profesionales',
        title: 'Consultas técnicas y jurisprudencia',
        description: 'Iurexia contiene criterios jurisprudenciales, legislación federal y estatal actualizada. Aprovecha su profundidad con preguntas técnicas y específicas.',
        examples: [
            '¿Qué jurisprudencia define los elementos del delito de abuso de confianza equiparado?',
            '¿Existe tesis sobre la procedencia del amparo contra resoluciones del IMSS que niegan pensión?',
            '¿Cuáles son los criterios para determinar la competencia en conflictos de arrendamiento inmobiliario?',
        ],
    },
    {
        icon: Briefcase,
        category: '📁 Para litigantes',
        title: 'Consulta fuentes para fundar escritos',
        description: 'Si necesitas citas concretas de artículos o tesis para fundar una demanda, deja el Genio desactivado — obtendrás las referencias exactas del corpus verificado.',
        examples: [
            '¿Qué dicen los artículos 14 y 16 de la CPEUM sobre el principio de legalidad?',
            '¿Cuándo procede la suspensión provisional contra el cierre de un establecimiento mercantil?',
            '¿Qué dice la jurisprudencia sobre la suplencia de la queja deficiente en amparo laboral?',
        ],
    },
    {
        icon: Users,
        category: '👥 Para ciudadanos',
        title: 'Describe tu situación con detalle',
        description: 'No necesitas ser abogado. Cuéntale a Iurexia qué te pasó, en qué estado, y obtendrás orientación legal clara y fundamentada.',
        examples: [
            'En Querétaro, ¿qué derechos tengo si mi patrón me despidió sin darme liquidación?',
            'Un vecino construyó en mi terreno sin permiso. ¿Qué puedo hacer legalmente en Jalisco?',
            '¿Qué riesgos legales tiene firmar un contrato de compraventa sin escritura?',
        ],
    },
];

export default function PromptGuide({ isOpen, onClose }: PromptGuideProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const tip = PROMPT_TIPS[currentSlide];
    const Icon = tip.icon;
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === PROMPT_TIPS.length - 1;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[180] bg-black/65 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full max-w-md"
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'linear-gradient(160deg, #1c1c1e 0%, #111111 100%)',
                        border: '1px solid rgba(201,169,98,0.4)',
                        borderRadius: '20px',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(201,169,98,0.18) 0%, rgba(160,129,61,0.08) 100%)',
                        borderBottom: '1px solid rgba(201,169,98,0.2)',
                        padding: '18px 20px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>💡</span>
                            <div>
                                <h2 style={{
                                    fontFamily: 'Georgia, serif',
                                    fontSize: '15px', fontWeight: 700,
                                    color: '#f0f0f0', margin: 0, lineHeight: 1.2,
                                }}>
                                    Cómo hacer mejores consultas
                                </h2>
                                <p style={{ fontSize: '11px', color: '#c9a962', margin: '2px 0 0', opacity: 0.85 }}>
                                    Guía de uso · Iurexia
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                            lineHeight: 0, transition: 'all 0.2s',
                        }}>
                            <X size={15} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px 20px 6px' }}>
                        {/* Category badge + counter */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                                color: '#c9a962', background: 'rgba(201,169,98,0.12)',
                                border: '1px solid rgba(201,169,98,0.25)',
                                padding: '3px 9px', borderRadius: 99, textTransform: 'uppercase',
                            }}>
                                {tip.category}
                            </span>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                                {currentSlide + 1} / {PROMPT_TIPS.length}
                            </span>
                        </div>

                        {/* Icon + Title */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 38, height: 38,
                                background: 'rgba(201,169,98,0.12)',
                                border: '1px solid rgba(201,169,98,0.2)',
                                borderRadius: 10, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Icon size={18} color="#c9a962" />
                            </div>
                            <h3 style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: '16px', fontWeight: 700,
                                color: '#f0f0f0', margin: 0, lineHeight: 1.3,
                                paddingTop: 2,
                            }}>
                                {tip.title}
                            </h3>
                        </div>

                        {/* Description */}
                        <p style={{
                            fontSize: '13px', color: 'rgba(255,255,255,0.60)',
                            lineHeight: 1.65, marginBottom: 14,
                        }}>
                            {tip.description}
                        </p>

                        {/* Examples / Tips */}
                        <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 12, padding: '14px 16px',
                            minHeight: 120,
                        }}>
                            <p style={{
                                fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                                marginBottom: 10,
                            }}>
                                {'examples' in tip ? 'Ejemplos de consultas' : 'Cómo funciona'}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {'examples' in tip
                                    ? tip.examples?.map((ex, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#c9a962', fontSize: 13, marginTop: 1, flexShrink: 0 }}>→</span>
                                            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                                                &ldquo;{ex}&rdquo;
                                            </p>
                                        </div>
                                    ))
                                    : tip.tips?.map((t, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#c9a962', fontSize: 13, marginTop: 1, flexShrink: 0 }}>•</span>
                                            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.60)', margin: 0, lineHeight: 1.55 }}>{t}</p>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div style={{ padding: '16px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Dots */}
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {PROMPT_TIPS.map((_, i) => (
                                <button key={i} onClick={() => setCurrentSlide(i)} style={{
                                    width: i === currentSlide ? 20 : 6, height: 6,
                                    borderRadius: 9999, padding: 0, border: 'none', cursor: 'pointer',
                                    background: i === currentSlide ? '#c9a962' : 'rgba(255,255,255,0.18)',
                                    transition: 'all 0.25s ease',
                                }} />
                            ))}
                        </div>

                        {/* Prev / Next / Close */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {!isFirst && (
                                <button onClick={() => setCurrentSlide(s => s - 1)} style={{
                                    padding: '7px 14px', borderRadius: 10, fontSize: 12,
                                    fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'transparent', color: 'rgba(255,255,255,0.55)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <ChevronLeft size={13} /> Anterior
                                </button>
                            )}
                            <button
                                onClick={() => isLast ? onClose() : setCurrentSlide(s => s + 1)}
                                style={{
                                    padding: '7px 18px', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, border: 'none', cursor: 'pointer',
                                    background: isLast
                                        ? 'linear-gradient(135deg, #c9a962 0%, #a07830 100%)'
                                        : 'rgba(255,255,255,0.10)',
                                    color: isLast ? '#fff' : 'rgba(255,255,255,0.85)',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isLast ? '¡Entendido!' : (<>Siguiente <ChevronRight size={13} /></>)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
