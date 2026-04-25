'use client';

import { useEffect, useState } from 'react';
import { Sparkles, BookOpen, X, ChevronRight, ChevronLeft, PenTool, Zap, Scale } from 'lucide-react';

interface NewFeaturesAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TOTAL_STEPS = 3;

export default function NewFeaturesAnnouncementModal({ isOpen, onClose }: NewFeaturesAnnouncementModalProps) {
    const [step, setStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            setStep(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(8px)' }}
        >
            <div className={`relative w-full max-w-xl bg-gradient-to-b from-[#0f0f12] via-[#15151a] to-[#0f0f12] rounded-2xl border border-[#c9a962]/30 shadow-[0_0_40px_rgba(201,169,98,0.15)] overflow-hidden transform transition-all duration-500 ${mounted ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Gold accent border glow */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a962] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#c9a962]/40 to-transparent" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Step indicator */}
                <div className="flex justify-center gap-1.5 pt-5">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-300 ${i === step
                                ? 'w-8 bg-[#c9a962]'
                                : i < step
                                    ? 'w-4 bg-[#c9a962]/40'
                                    : 'w-4 bg-white/10'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="px-8 pt-6 pb-8 min-h-[420px] flex flex-col">
                    {step === 0 && (
                        <div className="flex flex-col items-center text-center animate-fade-in">
                            <div className="relative mb-5">
                                <div className="absolute inset-0 bg-[#c9a962]/30 blur-2xl rounded-full" />
                                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#c9a962] via-[#d4b876] to-[#a88842] flex items-center justify-center shadow-lg">
                                    <Sparkles className="w-8 h-8 text-[#1a1a1f]" />
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold tracking-[0.2em] text-[#c9a962] mb-2">EXCLUSIVO PARA PLAN PRO</span>
                            <h2 className="text-2xl font-serif text-white mb-3">Nuevas funciones disponibles</h2>
                            <p className="text-white/60 text-sm leading-relaxed max-w-md mb-6">
                                Hemos liberado dos herramientas que elevan la calidad de tu trabajo jurídico. Te guiamos en 30 segundos para que las aproveches al máximo.
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#c9a962]/30 transition-colors">
                                    <Sparkles className="w-4 h-4 text-[#c9a962] mb-2" />
                                    <div className="text-white text-sm font-medium">Redacción Pro</div>
                                    <div className="text-white/40 text-[11px] mt-0.5">Motor de razonamiento avanzado</div>
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#c9a962]/30 transition-colors">
                                    <BookOpen className="w-4 h-4 text-[#c9a962] mb-2" />
                                    <div className="text-white text-sm font-medium">Precedentes TCC</div>
                                    <div className="text-white/40 text-[11px] mt-0.5">Sentencias por circuito</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="flex flex-col animate-fade-in">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#c9a962]/30 blur-xl rounded-full" />
                                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a962] via-[#d4b876] to-[#a88842] flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-[#1a1a1f]" />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold tracking-[0.2em] text-[#c9a962]">REDACCIÓN PRO</span>
                                    <h2 className="text-xl font-serif text-white">Calidad significativamente superior</h2>
                                </div>
                            </div>

                            <p className="text-white/70 text-sm leading-relaxed mb-5">
                                Redacción Pro utiliza un motor de razonamiento profundo de última generación.
                                La calidad del texto es <span className="text-[#c9a962] font-medium">considerablemente superior</span> al modo de Redacción normal:
                                argumentación más coherente, subsunción jurídica completa y prosa de nivel SCJN.
                            </p>

                            {/* Walkthrough */}
                            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-3">
                                <div className="text-[10px] font-semibold tracking-[0.15em] text-white/40 mb-3">CÓMO ACTIVARLA</div>
                                <ol className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9a962]/20 text-[#c9a962] text-[11px] font-semibold flex items-center justify-center mt-0.5">1</span>
                                        <div className="text-white/70 text-[13px] leading-snug">
                                            En la barra de chat, haz click en <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-charcoal-900 text-white text-[11px] align-middle"><PenTool className="w-2.5 h-2.5" />Redactar</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9a962]/20 text-[#c9a962] text-[11px] font-semibold flex items-center justify-center mt-0.5">2</span>
                                        <div className="text-white/70 text-[13px] leading-snug">
                                            Aparecerá a su derecha el toggle <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-full bg-gradient-to-r from-amber-50 via-white to-amber-50 text-[#8a6d2e] border border-[#c9a962] text-[11px] align-middle"><Sparkles className="w-2.5 h-2.5 text-[#c9a962]" />Pro</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9a962]/20 text-[#c9a962] text-[11px] font-semibold flex items-center justify-center mt-0.5">3</span>
                                        <div className="text-white/70 text-[13px] leading-snug">
                                            Actívalo y escribe tu consulta. Notarás que la respuesta tarda un poco más, pero la calidad es notable.
                                        </div>
                                    </li>
                                </ol>
                            </div>

                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#c9a962]/5 border border-[#c9a962]/20">
                                <Zap className="w-3.5 h-3.5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                <p className="text-white/60 text-[11px] leading-relaxed">
                                    Ideal para: demandas, amparos, considerandos de sentencia, agravios, recursos y argumentos que exigen máxima profundidad.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col animate-fade-in">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#c9a962]/30 blur-xl rounded-full" />
                                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a962] via-[#d4b876] to-[#a88842] flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-[#1a1a1f]" />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold tracking-[0.2em] text-[#c9a962]">PRECEDENTES TCC</span>
                                    <h2 className="text-xl font-serif text-white">Sentencias de tribunales colegiados</h2>
                                </div>
                            </div>

                            <p className="text-white/70 text-sm leading-relaxed mb-5">
                                Consulta y sintetiza sentencias reales de Tribunales Colegiados de Circuito sobre el tema que te interese.
                                Útil para identificar criterios uniformes, divergencias entre circuitos y tendencias jurisprudenciales recientes.
                            </p>

                            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-3">
                                <div className="text-[10px] font-semibold tracking-[0.15em] text-white/40 mb-3">QUÉ PUEDES HACER</div>
                                <ul className="space-y-2.5">
                                    <li className="flex items-start gap-3 text-white/70 text-[13px] leading-snug">
                                        <Scale className="w-3.5 h-3.5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                        Buscar sentencias de un circuito específico (1°, 2°, 4°, 22° y más en camino) o globalmente.
                                    </li>
                                    <li className="flex items-start gap-3 text-white/70 text-[13px] leading-snug">
                                        <Scale className="w-3.5 h-3.5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                        Filtrar por tribunal específico dentro del circuito.
                                    </li>
                                    <li className="flex items-start gap-3 text-white/70 text-[13px] leading-snug">
                                        <Scale className="w-3.5 h-3.5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                        Recibir una síntesis ejecutiva con la posición uniforme y las divergencias detectadas.
                                    </li>
                                    <li className="flex items-start gap-3 text-white/70 text-[13px] leading-snug">
                                        <Scale className="w-3.5 h-3.5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                        Acceder al PDF oficial de cada sentencia citada.
                                    </li>
                                </ul>
                            </div>

                            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                                <div className="text-[10px] font-semibold tracking-[0.15em] text-white/40 mb-2">CÓMO USARLA</div>
                                <p className="text-white/70 text-[13px] leading-snug">
                                    En la barra de acciones del chat, haz click en <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[#c9a962] bg-amber-50/10 border border-[#c9a962]/40 text-[11px] align-middle"><BookOpen className="w-2.5 h-2.5" />Precedentes</span> y escribe el tema de tu interés.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-auto pt-6">
                        <button
                            onClick={prev}
                            disabled={step === 0}
                            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${step === 0
                                ? 'opacity-0 pointer-events-none'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Atrás
                        </button>

                        {step < TOTAL_STEPS - 1 ? (
                            <button
                                onClick={next}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a962] to-[#a88842] text-[#1a1a1f] text-sm font-semibold hover:shadow-[0_0_16px_rgba(201,169,98,0.4)] transition-all"
                            >
                                Continuar
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a962] to-[#a88842] text-[#1a1a1f] text-sm font-semibold hover:shadow-[0_0_16px_rgba(201,169,98,0.4)] transition-all"
                            >
                                Empezar a usar
                                <Sparkles className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out;
                }
            `}</style>
        </div>
    );
}
