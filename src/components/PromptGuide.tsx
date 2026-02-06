'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb, MapPin, FileText, MessageSquare, Scale } from 'lucide-react';

interface PromptGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROMPT_TIPS = [
    {
        icon: MapPin,
        title: "Sé específico con la jurisdicción",
        example: {
            bad: "¿Cuál es la pena por robo?",
            good: "¿Cuál es la pena por robo con violencia en Jalisco?"
        },
        tip: "Selecciona tu estado en el menú de jurisdicción para obtener leyes estatales precisas."
    },
    {
        icon: FileText,
        title: "Menciona el tipo de fuente que buscas",
        example: {
            bad: "¿Qué dice sobre el amparo?",
            good: "¿Qué jurisprudencia existe sobre la suspensión provisional en amparo?"
        },
        tip: "Especifica si necesitas artículos de ley, tesis, jurisprudencia o criterios de tribunales."
    },
    {
        icon: MessageSquare,
        title: "Incluye el contexto de tu caso",
        example: {
            bad: "¿Procede el amparo?",
            good: "¿Procede el amparo contra una multa de tránsito impuesta sin audiencia previa?"
        },
        tip: "Describe brevemente los hechos relevantes para respuestas más precisas."
    },
    {
        icon: Scale,
        title: "Usa términos técnicos cuando los conozcas",
        example: {
            bad: "¿Cómo hago que paren el acto?",
            good: "¿Cómo solicito la suspensión provisional del acto reclamado?"
        },
        tip: "Los términos jurídicos precisos mejoran significativamente la búsqueda en nuestra base documental."
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
                    <div className="p-6">
                        {/* Slide Counter */}
                        <div className="text-center mb-4">
                            <span className="text-xs font-medium text-charcoal-500 bg-cream-200 px-3 py-1 rounded-full">
                                {currentSlide + 1} de {PROMPT_TIPS.length}
                            </span>
                        </div>

                        {/* Tip Content */}
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-accent-brown/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon className="w-7 h-7 text-accent-brown" />
                            </div>
                            <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-4">
                                {currentTip.title}
                            </h3>
                        </div>

                        {/* Example Box */}
                        <div className="bg-cream-200 rounded-xl p-4 mb-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">✗</span>
                                <p className="text-sm text-charcoal-600 italic">"{currentTip.example.bad}"</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
                                <p className="text-sm text-charcoal-800 font-medium">"{currentTip.example.good}"</p>
                            </div>
                        </div>

                        {/* Tip */}
                        <p className="text-sm text-charcoal-600 text-center">
                            💡 {currentTip.tip}
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="px-6 pb-6">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={goToPrevious}
                                className="p-2 rounded-full hover:bg-cream-200 transition-colors text-charcoal-600"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            {/* Dots */}
                            <div className="flex gap-2">
                                {PROMPT_TIPS.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentSlide
                                                ? 'bg-accent-brown w-6'
                                                : 'bg-cream-400 hover:bg-cream-500'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={goToNext}
                                className="p-2 rounded-full hover:bg-cream-200 transition-colors text-charcoal-600"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-accent-brown text-white font-medium rounded-xl hover:bg-accent-brown/90 transition-colors"
                        >
                            ¡Entendido!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
