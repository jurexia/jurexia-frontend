'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight, Shield, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

const NUDGE_VARIANTS = [
    {
        icon: <Sparkles className="w-4 h-4 text-accent-gold" />,
        text: '¿Sabías que los usuarios Pro pueden activar Genios Especializados que analizan hasta 3 materias simultáneamente?',
    },
    {
        icon: <Zap className="w-4 h-4 text-accent-gold" />,
        text: 'Esta consulta se beneficiaría de un análisis con IA avanzada. Disponible en Plan Pro.',
    },
    {
        icon: <Shield className="w-4 h-4 text-accent-gold" />,
        text: 'Tu historial se conserva al suscribirte. Continúa tu investigación sin interrupciones.',
    },
];

export default function UpgradeNudge({ messageIndex }: { messageIndex: number }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in after a short delay
        const timer = setTimeout(() => setIsVisible(true), 600);
        return () => clearTimeout(timer);
    }, []);

    const variant = NUDGE_VARIANTS[messageIndex % NUDGE_VARIANTS.length];

    return (
        <div
            className={`transition-all duration-700 ease-out ${
                isVisible
                    ? 'opacity-100 translate-y-0 max-h-40'
                    : 'opacity-0 translate-y-2 max-h-0'
            }`}
        >
            <div className="mx-auto max-w-2xl my-4">
                <Link
                    href="/precios"
                    className="group flex items-start gap-3 px-5 py-3.5 rounded-2xl border border-accent-gold/20 bg-gradient-to-r from-cream-100 to-amber-50/40 hover:border-accent-gold/40 hover:shadow-md hover:shadow-accent-gold/5 transition-all duration-300"
                >
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-accent-gold/10 flex items-center justify-center mt-0.5">
                        {variant.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-charcoal-700 leading-relaxed">
                            {variant.text}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-accent-gold group-hover:gap-2 transition-all">
                            Conocer Plan Pro
                            <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
