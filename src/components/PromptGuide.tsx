'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb, Scale, Briefcase, Users } from 'lucide-react';

interface PromptGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROMPT_TIPS = [
    {
        icon: Scale,
        category: "Para profesionales",
        title: "Pregunta sobre problemas jurídicos complejos",
        description: "Iurexia contiene criterios jurisprudenciales que resuelven controversias profundas del derecho mexicano.",
        examples: [
            "¿Qué jurisprudencia define los elementos del delito de abuso de confianza equiparado?",
            "¿Existe tesis sobre la procedencia del amparo contra resoluciones del IMSS que niegan pensión?",
            "¿Cuáles son los criterios para determinar la competencia en conflictos de arrendamiento inmobiliario?"
        ]
    },
    {
        icon: Briefcase,
        category: "Para litigantes",
        title: "Consulta estrategias procesales",
        description: "Encuentra criterios sobre procedimientos, plazos, excepciones y recursos que fortalezcan tu estrategia.",
        examples: [
            "¿Qué dice la jurisprudencia sobre la suplencia de la queja deficiente en amparo laboral?",
            "¿Cuándo procede la suspensión provisional contra el cierre de un establecimiento mercantil?",
            "¿Qué criterios existen sobre la caducidad de la instancia en juicios civiles?"
        ]
    },
    {
        icon: Users,
        category: "Para ciudadanos",
        title: "Consultas claras y específicas",
        description: "No necesitas ser abogado. Describe tu situación con detalle y Iurexia encontrará la información relevante.",
        examples: [
            "En Guanajuato, ¿qué requisitos necesito para tramitar un divorcio y cuál es el procedimiento?",
            "¿En qué delito incurre una persona que, abusando de mi confianza, robó dinero de mi negocio?",
            "¿Qué derechos tengo si mi arrendador quiere desalojarme sin previo aviso en Jalisco?"
        ]
    },
    {
        icon: Lightbulb,
        category: "Consejos generales",
        title: "Maximiza la precisión de tus resultados",
        description: "Pequeños ajustes en tu pregunta pueden mejorar significativamente la calidad de la respuesta.",
        tips: [
            "Menciona el estado si tu consulta involucra leyes estatales",
            "Especifica si buscas leyes, jurisprudencia o ambas",
            "Incluye hechos relevantes de tu caso para respuestas más precisas",
            "Usa términos técnicos si los conoces (ej. 'suspensión provisional' vs 'que paren el acto')"
        ]
    }
];

export default function PromptGuide({ isOpen, onClose }: PromptGuideProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const goToPrevious = () => {
        setCurrentSlide(prev => (prev === 0 ? PROMPT_TIPS.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentSlide(prev => (prev === PROMPT_TIPS.length - 1 ? 0 : prev + 1));
    };

    const currentTip = PROMPT_TIPS[currentSlide];
    const Icon = currentTip.icon;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-cream-100 rounded-2xl shadow-2xl max-w-lg w-full pointer-events-auto overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-accent-brown to-accent-gold p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Lightbulb className="w-5 h-5" />
                            <h2 className="font-serif text-lg font-semibold">Guía para mejores consultas</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {/* Category & Counter */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-accent-brown bg-accent-brown/10 px-2.5 py-1 rounded-full">
                                {currentTip.category}
                            </span>
                            <span className="text-xs text-charcoal-400">
                                {currentSlide + 1} / {PROMPT_TIPS.length}
                            </span>
                        </div>

                        {/* Tip Content */}
                        <div className="mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-accent-brown/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-5 h-5 text-accent-brown" />
                                </div>
                                <h3 className="font-serif text-lg font-semibold text-charcoal-900">
                                    {currentTip.title}
                                </h3>
                            </div>
                            <p className="text-sm text-charcoal-600 mb-4">
                                {currentTip.description}
                            </p>
                        </div>

                        {/* Examples or Tips */}
                        <div className="bg-cream-200 rounded-xl p-4 space-y-2.5 min-h-[140px]">
                            {'examples' in currentTip ? (
                                <>
                                    <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wide mb-2">
                                        Ejemplos de consultas:
                                    </p>
                                    {currentTip.examples.map((example, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="text-accent-gold mt-0.5">→</span>
                                            <p className="text-sm text-charcoal-700 italic">"{example}"</p>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wide mb-2">
                                        Consejos:
                                    </p>
                                    {currentTip.tips?.map((tip, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="text-green-600 font-bold">✓</span>
                                            <p className="text-sm text-charcoal-700">{tip}</p>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="px-5 pb-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={goToPrevious}
                                className="p-2 rounded-full hover:bg-cream-200 transition-colors text-charcoal-600"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            {/* Dots */}
                            <div className="flex gap-1.5">
                                {PROMPT_TIPS.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`h-2 rounded-full transition-all ${index === currentSlide
                                                ? 'bg-accent-brown w-5'
                                                : 'bg-cream-400 hover:bg-cream-500 w-2'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={goToNext}
                                className="p-2 rounded-full hover:bg-cream-200 transition-colors text-charcoal-600"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-5">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-accent-brown text-white font-medium rounded-xl hover:bg-accent-brown/90 transition-colors text-sm"
                        >
                            ¡Entendido!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
