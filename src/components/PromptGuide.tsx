'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb, Scale, Briefcase, Users, Zap } from 'lucide-react';

interface PromptGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROMPT_TIPS = [
    {
        icon: Zap,
        category: "✨ Genio Jurídico",
        title: "Actívalo para análisis profundos",
        description: "El botón ⚡ Genio Jurídico activa un modelo avanzado con acceso al corpus legal completo. La calidad y precisión de las respuestas aumenta considerablemente: razona mejor, estructura más y explica con mayor detalle.",
        tips: [
            "Úsalo cuando quieras entender a fondo un tema legal, una ley o sus implicaciones",
            "Úsalo para redactar, analizar o interpretar textos jurídicos complejos",
            "⚠️ Advertencia: al activarlo, pueden no aparecer las citas directas de fuentes. Si necesitas referencias de artículos para fundar un escrito, déjalo desactivado",
            "Regla de oro: Genio = comprensión y análisis. Sin Genio = fuentes citadas y exactas"
        ]
    },
    {
        icon: Scale,
        category: "⚖️ Filtro de Fuero",
        title: "Enfoca tu búsqueda por ámbito legal",
        description: "El selector de fuero (Todos / Constitucional / Federal / Estatal) prioriza el tipo de normatividad que Iurexia revisa al responder tu consulta.",
        tips: [
            "Todos — búsqueda amplia en todo el corpus (recomendado por defecto)",
            "Constitucional — prioriza CPEUM, tratados internacionales y derechos humanos",
            "Federal — leyes federales: LGTOC, LFT, Código Civil Federal, etc.",
            "Estatal — legislación del estado que seleccionaste al iniciar sesión"
        ]
    },
    {
        icon: Scale,
        category: "Para profesionales",
        title: "Consultas técnicas y jurisprudencia",
        description: "Iurexia contiene criterios jurisprudenciales, legislación federal y estatal actualizada. Aprovecha su profundidad con preguntas técnicas.",
        examples: [
            "¿Qué jurisprudencia define los elementos del delito de abuso de confianza equiparado?",
            "¿Existe tesis sobre la procedencia del amparo contra resoluciones del IMSS que niegan pensión?",
            "¿Cuáles son los criterios para determinar la competencia en conflictos de arrendamiento inmobiliario?"
        ]
    },
    {
        icon: Briefcase,
        category: "Para litigantes",
        title: "Consulta fuentes para fundar escritos",
        description: "Si necesitas citas concretas de artículos o tesis para fundar una demanda, deja el Genio desactivado — obtendrás las referencias exactas del corpus.",
        examples: [
            "¿Qué dicen los artículos 14 y 16 de la CPEUM sobre el principio de legalidad?",
            "¿Cuándo procede la suspensión provisional contra el cierre de un establecimiento mercantil?",
            "¿Qué dice la jurisprudencia sobre la suplencia de la queja deficiente en amparo laboral?"
        ]
    },
    {
        icon: Users,
        category: "Para ciudadanos",
        title: "Describe tu situación con detalle",
        description: "No necesitas ser abogado. Cuéntale a Iurexia qué te pasó, en qué estado, y obtendrás orientación legal clara y fundamentada.",
        examples: [
            "En Querétaro, ¿qué derechos tengo si mi patrón me despidió sin darme liquidación?",
            "Un vecino construyó en mi terreno sin permiso. ¿Qué puedo hacer legalmente en Jalisco?",
            "¿Qué riesgos legales tiene firmar un contrato de compraventa sin escritura?"
        ]
    },
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
                            <h2 className="font-serif text-lg font-semibold">Guía de uso — Iurexia</h2>
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
                                    {currentTip.examples?.map((example, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="text-accent-gold mt-0.5">→</span>
                                            <p className="text-sm text-charcoal-700 italic">&ldquo;{example}&rdquo;</p>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wide mb-2">
                                        Cómo funciona:
                                    </p>
                                    {currentTip.tips?.map((tip, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="text-accent-brown font-bold mt-0.5">•</span>
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
