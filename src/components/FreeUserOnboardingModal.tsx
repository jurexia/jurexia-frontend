'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, BookOpen, ChevronRight, Sparkles, Scale } from 'lucide-react';

interface FreeUserOnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
    onStartTour: () => void;
    userName?: string;
}

const STORAGE_KEY = 'iurexia_free_onboarding_seen';

export function hasSeenOnboarding(): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function markOnboardingSeen(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, 'true');
}

export default function FreeUserOnboardingModal({
    isOpen,
    onComplete,
    onStartTour,
    userName,
}: FreeUserOnboardingModalProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioReady, setAudioReady] = useState(false);
    const [audioEnded, setAudioEnded] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationRef = useRef<number>(0);

    // Initialize audio element — do NOT auto-play
    useEffect(() => {
        if (!isOpen) return;
        const audio = new Audio('/audio-bienvenida.mp3');
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
            setAudioReady(true);
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setAudioEnded(true);
            cancelAnimationFrame(animationRef.current);
        });

        // Fallback: if metadata loads fast, mark ready
        if (audio.readyState >= 1) {
            setDuration(audio.duration);
            setAudioReady(true);
        }

        return () => {
            cancelAnimationFrame(animationRef.current);
            audio.pause();
            audio.src = '';
        };
    }, [isOpen]);

    const updateProgress = useCallback(() => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            if (!audioRef.current.paused) {
                animationRef.current = requestAnimationFrame(updateProgress);
            }
        }
    }, []);

    // Play audio — triggered by user click (bypasses autoplay restrictions)
    const handlePlayAudio = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            cancelAnimationFrame(animationRef.current);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
                updateProgress();
            }).catch((err) => {
                console.error('Audio play failed:', err);
            });
        }
    }, [isPlaying, updateProgress]);

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleStartTour = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            cancelAnimationFrame(animationRef.current);
        }
        markOnboardingSeen();
        onStartTour();
    };

    const handleDismiss = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            cancelAnimationFrame(animationRef.current);
        }
        setIsClosing(true);
        setTimeout(() => {
            markOnboardingSeen();
            setIsClosing(false);
            onComplete();
        }, 400);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    const firstName = userName?.split(' ')[0] || '';

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
                isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{ animation: isClosing ? undefined : 'onboardFadeIn 0.6s ease-out' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

            {/* Content Card */}
            <div
                className={`relative z-10 w-full max-w-lg mx-4 rounded-2xl overflow-hidden transition-all duration-500 ${
                    isClosing ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
                }`}
                style={{
                    background: 'linear-gradient(165deg, #0f0f0f 0%, #1a1714 50%, #0f0f0f 100%)',
                    border: '1px solid rgba(201, 169, 98, 0.25)',
                    boxShadow: '0 0 60px rgba(201, 169, 98, 0.1), 0 25px 50px rgba(0,0,0,0.5)',
                    animation: isClosing ? undefined : 'onboardSlideUp 0.7s ease-out 0.1s both',
                }}
            >
                {/* Gold accent line */}
                <div style={{
                    position: 'absolute', top: 0, left: 20, right: 20, height: 2,
                    background: 'linear-gradient(90deg, transparent 0%, #c9a84c 50%, transparent 100%)',
                    borderRadius: 2,
                }} />

                {/* Header */}
                <div className="px-6 pt-6 pb-2 text-center">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(201,169,98,0.2), rgba(201,169,98,0.05))',
                            border: '1px solid rgba(201,169,98,0.35)',
                        }}
                    >
                        <Scale className="w-7 h-7 text-[#c9a962]" />
                    </div>
                    <h2
                        className="text-2xl font-semibold tracking-tight mb-1"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        <span className="text-white">
                            {firstName ? `¡Bienvenido, ${firstName}!` : '¡Bienvenido a Iurexia!'}
                        </span>
                    </h2>
                    <p className="text-white/40 text-sm">
                        Tu asistente jurídico con inteligencia artificial
                    </p>
                </div>

                {/* Audio Player Section */}
                <div className="px-6 py-5">
                    <div
                        className="rounded-xl p-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(201,169,98,0.08) 0%, rgba(201,169,98,0.02) 100%)',
                            border: '1px solid rgba(201,169,98,0.15)',
                        }}
                    >
                        <p className="text-white/60 text-xs font-medium mb-3 text-center tracking-wide uppercase">
                            Audio de Bienvenida
                        </p>

                        <div className="flex items-center gap-3">
                            {/* Play/Pause button */}
                            <button
                                onClick={handlePlayAudio}
                                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                                style={{
                                    background: isPlaying
                                        ? 'linear-gradient(135deg, #a07830 0%, #8a6828 100%)'
                                        : 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
                                    boxShadow: isPlaying
                                        ? '0 2px 8px rgba(201,168,76,0.2)'
                                        : '0 4px 16px rgba(201,168,76,0.35)',
                                    transform: isPlaying ? 'scale(0.95)' : 'scale(1)',
                                }}
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5 text-white" />
                                ) : (
                                    <Play className="w-5 h-5 text-white ml-0.5" />
                                )}
                            </button>

                            {/* Progress bar + time */}
                            <div className="flex-1 min-w-0">
                                {/* Progress bar */}
                                <div
                                    className="h-1.5 rounded-full overflow-hidden mb-1.5"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}
                                >
                                    <div
                                        className="h-full rounded-full transition-all duration-100"
                                        style={{
                                            width: duration > 0 ? `${(progress / duration) * 100}%` : '0%',
                                            background: 'linear-gradient(90deg, #c9a84c, #e0c070)',
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/30 text-[10px]">
                                        {formatTime(progress)}
                                    </span>
                                    <span className="text-white/30 text-[10px]">
                                        {duration > 0 ? formatTime(duration) : '--:--'}
                                    </span>
                                </div>
                            </div>

                            {/* Mute toggle */}
                            <button
                                onClick={toggleMute}
                                className="flex-shrink-0 p-2 rounded-lg transition-colors"
                                style={{
                                    color: isMuted ? 'rgba(255,255,255,0.2)' : '#c9a84c',
                                    background: 'rgba(255,255,255,0.03)',
                                }}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Waveform animation when playing */}
                        {isPlaying && (
                            <div className="flex items-end justify-center gap-[3px] h-5 mt-3">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: 3,
                                            borderRadius: 99,
                                            background: '#c9a84c',
                                            animation: `waveBar 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {!isPlaying && !audioEnded && (
                            <p className="text-white/25 text-[11px] text-center mt-2">
                                Presiona ▶ para escuchar una breve introducción
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 space-y-2.5">
                    {/* Start Guide button */}
                    <button
                        onClick={handleStartTour}
                        className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                        style={{
                            background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                            color: '#0f0f0f',
                            boxShadow: '0 4px 16px rgba(201, 169, 98, 0.3)',
                        }}
                    >
                        <BookOpen className="w-4 h-4" />
                        Iniciar Guía Rápida
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Skip */}
                    <button
                        onClick={handleDismiss}
                        className="w-full py-2.5 text-center text-white/30 text-xs hover:text-white/50 transition-colors"
                    >
                        Omitir y comenzar
                    </button>
                </div>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes waveBar {
                    0% { height: 4px; }
                    100% { height: 16px; }
                }
                @keyframes onboardFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes onboardSlideUp {
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
