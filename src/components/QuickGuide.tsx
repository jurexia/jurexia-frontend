'use client';

import { useState } from 'react';
import { Zap, Brain, FileText, Target, ChevronRight, BookOpen, X } from 'lucide-react';

interface GuideCard {
    icon: React.ElementType;
    title: string;
    badge?: string;
    badgeColor: string;
    description: string;
    tips: string[];
    example?: string;
}

const guideCards: GuideCard[] = [
    {
        icon: Zap,
        title: 'Modo Rápido',
        badge: '~2s',
        badgeColor: 'bg-green-100 text-green-700',
        description: 'Para consultas directas y simples',
        tips: [
            'Definiciones legales básicas',
            'Plazos y procedimientos',
            'Preguntas generales sobre leyes'
        ],
        example: '¿Qué es un amparo indirecto?'
    },
    {
        icon: Brain,
        title: 'Con Razonamiento',
        badge: '~10s',
        badgeColor: 'bg-accent-brown text-white',
        description: 'Para análisis jurídicos profundos',
        tips: [
            'Análisis constitucionales complejos',
            'Casos que requieren fundamentación detallada',
            'Comparación de jurisprudencia'
        ],
        example: '¿Es constitucional que el Código Penal criminalice el aborto?'
    },
    {
        icon: FileText,
        title: 'Análisis de Documentos',
        badge: 'Auto',
        badgeColor: 'bg-blue-100 text-blue-700',
        description: 'Usa razonamiento automáticamente',
        tips: [
            'Click en "Subir documento"',
            'Sube tu sentencia, demanda o contrato',
            'El sistema analiza profundamente'
        ],
        example: 'Revisar fortalezas de una sentencia'
    },
    {
        icon: Target,
        title: 'Mejores Prácticas',
        badge: 'Tips',
        badgeColor: 'bg-purple-100 text-purple-700',
        description: 'Consejos para mejores resultados',
        tips: [
            'Sé específico en tu consulta',
            'Menciona la materia legal (penal, civil, etc.)',
            'Usa el filtro de jurisdicción estatal',
            'Incluye contexto relevante del caso'
        ]
    }
];

export default function QuickGuide() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="w-full max-w-3xl mx-auto mb-3">
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5
                         rounded-lg transition-all duration-200 group"
                style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(201, 169, 98, 0.15)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" style={{ color: '#c9a962' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        Guía Rápida
                    </span>
                </div>
                {isExpanded ? (
                    <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                ) : (
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'rgba(255,255,255,0.4)' }} />
                )}
            </button>

            {/* Expandable Guide Cards */}
            {isExpanded && (
                <div className="mt-3 animate-slide-down">
                    {/* Horizontal Scrollable Container */}
                    <div className="relative">
                        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin 
                                      scrollbar-thumb-charcoal-200 scrollbar-track-transparent">
                            {guideCards.map((card, index) => (
                                <GuideCardComponent key={index} card={card} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function GuideCardComponent({ card }: { card: GuideCard }) {
    const Icon = card.icon;

    return (
        <div className="flex-shrink-0 w-72 snap-start">
            <div className="h-full bg-white rounded-xl border border-charcoal-100 p-4 
                          hover:shadow-lg transition-all duration-200 hover:border-accent-brown/30">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cream-200 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-accent-brown" />
                        </div>
                        <h3 className="font-semibold text-charcoal-900 text-sm">
                            {card.title}
                        </h3>
                    </div>
                    {card.badge && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                            {card.badge}
                        </span>
                    )}
                </div>

                {/* Description */}
                <p className="text-xs text-charcoal-600 mb-3">
                    {card.description}
                </p>

                {/* Tips */}
                <div className="space-y-1.5 mb-3">
                    {card.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-accent-brown mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-charcoal-700 leading-relaxed">
                                {tip}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Example */}
                {card.example && (
                    <div className="mt-3 pt-3 border-t border-charcoal-50">
                        <div className="bg-cream-100 rounded-lg px-3 py-2">
                            <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wide">
                                Ejemplo:
                            </span>
                            <p className="text-xs text-charcoal-700 mt-1 italic">
                                "{card.example}"
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
