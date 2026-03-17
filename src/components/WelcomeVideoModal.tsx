'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Scale, BookOpen, AlertTriangle } from 'lucide-react';

interface WelcomeVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const VIDEO_URL = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/assets/welcome-video.mp4';

export default function WelcomeVideoModal({ isOpen, onClose }: WelcomeVideoModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [canDismiss, setCanDismiss] = useState(false);
    const [countdown, setCountdown] = useState(8);
    const [isClosing, setIsClosing] = useState(false);

    // Countdown timer — allow dismiss after 8 seconds
    useEffect(() => {
        if (!isOpen) return;
        setCanDismiss(false);
        setCountdown(8);

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setCanDismiss(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen]);

    // Also allow dismiss when video ends
    const handleVideoEnd = useCallback(() => {
        setCanDismiss(true);
        setCountdown(0);
    }, []);

    const handleClose = useCallback(() => {
        if (!canDismiss) return;
        setIsClosing(true);
        // Pause video
        if (videoRef.current) videoRef.current.pause();
        // Animate out, then call onClose
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 400);
    }, [canDismiss, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
                isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{ animation: isClosing ? undefined : 'welcomeFadeIn 0.6s ease-out' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

            {/* Content */}
            <div
                className={`relative z-10 w-full max-w-3xl mx-4 rounded-2xl overflow-hidden transition-all duration-500 ${
                    isClosing ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
                }`}
                style={{
                    background: 'linear-gradient(145deg, #0f0f0f 0%, #1a1714 50%, #0f0f0f 100%)',
                    border: '1px solid rgba(201, 169, 98, 0.25)',
                    boxShadow: '0 0 60px rgba(201, 169, 98, 0.1), 0 25px 50px rgba(0,0,0,0.5)',
                    animation: isClosing ? undefined : 'welcomeSlideUp 0.7s ease-out 0.1s both',
                }}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(201,169,98,0.2), rgba(201,169,98,0.05))',
                                border: '1px solid rgba(201,169,98,0.35)',
                            }}
                        >
                            <Scale className="w-5 h-5 text-[#c9a962]" />
                        </div>
                        <div>
                            <h2
                                className="text-xl font-semibold tracking-tight"
                                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                                <span className="text-white">Bienvenido a Iurex</span>
                                <span className="text-[#c9a962]">ia</span>
                                <span className="text-white/60 text-base ml-2">Pro</span>
                            </h2>
                            <p className="text-white/40 text-xs mt-0.5">
                                Información importante antes de comenzar
                            </p>
                        </div>
                    </div>
                    {canDismiss && (
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Video */}
                <div className="px-6 pb-4">
                    <div
                        className="relative rounded-xl overflow-hidden"
                        style={{
                            border: '1px solid rgba(201,169,98,0.15)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                        }}
                    >
                        <video
                            ref={videoRef}
                            src={VIDEO_URL}
                            controls
                            autoPlay
                            playsInline
                            onEnded={handleVideoEnd}
                            className="w-full aspect-video bg-black"
                            style={{ outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Important notices */}
                <div className="px-6 pb-4 space-y-2">
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-200/80 text-xs leading-relaxed">
                            <strong className="text-amber-300">Uso responsable:</strong> Iurexia es una herramienta de asistencia jurídica.
                            Verifica siempre la información con fuentes oficiales antes de tomar decisiones legales.
                        </p>
                    </div>
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-500/8 border border-blue-500/15">
                        <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-blue-200/80 text-xs leading-relaxed">
                            <strong className="text-blue-300">Guías:</strong> Consulta nuestra guía rápida dentro del chat para aprender
                            a obtener mejores resultados de tus consultas legales.
                        </p>
                    </div>
                </div>

                {/* Footer / CTA */}
                <div className="px-6 pb-6 pt-2">
                    <button
                        onClick={handleClose}
                        disabled={!canDismiss}
                        className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 relative overflow-hidden"
                        style={{
                            background: canDismiss
                                ? 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)'
                                : 'rgba(201, 169, 98, 0.15)',
                            color: canDismiss ? '#0f0f0f' : 'rgba(201, 169, 98, 0.4)',
                            cursor: canDismiss ? 'pointer' : 'not-allowed',
                            boxShadow: canDismiss ? '0 4px 16px rgba(201, 169, 98, 0.3)' : 'none',
                            transform: canDismiss ? 'scale(1)' : 'scale(0.98)',
                        }}
                    >
                        {canDismiss ? (
                            'Entendido, comenzar a usar Iurexia'
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <span>Por favor revisa el video</span>
                                <span
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                                    style={{ background: 'rgba(201, 169, 98, 0.2)' }}
                                >
                                    {countdown}
                                </span>
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Inline keyframes */}
            <style>{`
                @keyframes welcomeFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes welcomeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}
