'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, ChevronRight, BookOpen, Sparkles } from 'lucide-react';

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
    const [hasListened, setHasListened] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationRef = useRef<number>(0);

    // Initialize audio
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
            setHasListened(true);
            cancelAnimationFrame(animationRef.current);
        });

        // Auto-play after a short delay
        const autoPlayTimer = setTimeout(() => {
            audio.play().then(() => {
                setIsPlaying(true);
                updateProgress();
            }).catch(() => {
                // Autoplay blocked — user will need to click play
                setAudioReady(true);
            });
        }, 800);

        return () => {
            clearTimeout(autoPlayTimer);
            cancelAnimationFrame(animationRef.current);
            audio.pause();
            audio.src = '';
        };
    }, [isOpen]);

    const updateProgress = useCallback(() => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            if (!audioRef.current.paused) {
                // Mark as "listened" after 50% of the audio
                if (audioRef.current.currentTime / audioRef.current.duration > 0.5) {
                    setHasListened(true);
                }
                animationRef.current = requestAnimationFrame(updateProgress);
            }
        }
    }, []);

    const togglePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            cancelAnimationFrame(animationRef.current);
        } else {
            audioRef.current.play();
            updateProgress();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = ratio * duration;
        setProgress(ratio * duration);
    };

    const handleStartTour = () => {
        // Pause audio when starting tour
        if (audioRef.current) {
            audioRef.current.pause();
            cancelAnimationFrame(animationRef.current);
        }
        markOnboardingSeen();
        onStartTour();
    };

    const handleSkip = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            cancelAnimationFrame(animationRef.current);
        }
        markOnboardingSeen();
        onComplete();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    const firstName = userName?.split(' ')[0] || '';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div
                className="relative w-full max-w-lg overflow-hidden"
                style={{
                    background: 'linear-gradient(165deg, #1e1e20 0%, #121214 50%, #0d0d0f 100%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(201, 169, 98, 0.2)',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 120px rgba(201,169,98,0.05)',
                }}
            >
                {/* Decorative top accent */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg, transparent 0%, #c9a84c 50%, transparent 100%)',
                }} />

                {/* Close (skip) button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-white/25 hover:text-white/60 transition-colors z-10"
                    title="Omitir"
                >
                    <X size={18} />
                </button>

                <div className="px-8 pt-8 pb-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 mb-4">
                            <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                            <span className="text-[10px] font-bold text-[#c9a84c] tracking-wider uppercase">Bienvenida</span>
                        </div>

                        <h2 style={{
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontSize: '22px',
                            fontWeight: 600,
                            color: '#f5f5f5',
                            lineHeight: 1.3,
                            marginBottom: '8px',
                        }}>
                            {firstName ? `¡${firstName}, bienvenido a Iurexia!` : '¡Bienvenido a Iurexia!'}
                        </h2>

                        <p style={{
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.45)',
                            lineHeight: 1.5,
                            maxWidth: '380px',
                            margin: '0 auto',
                        }}>
                            Antes de comenzar, escucha este breve audio y recorre la guía rápida para sacarle el máximo provecho a tu asistente jurídico.
                        </p>
                    </div>

                    {/* Audio Player */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)',
                        border: '1px solid rgba(201,168,76,0.15)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        marginBottom: '20px',
                    }}>
                        <div className="flex items-center gap-3 mb-3">
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlayPause}
                                disabled={!audioReady}
                                style={{
                                    width: 44, height: 44,
                                    borderRadius: '50%',
                                    background: audioReady
                                        ? 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)'
                                        : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    cursor: audioReady ? 'pointer' : 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    boxShadow: isPlaying ? '0 0 20px rgba(201,168,76,0.3)' : 'none',
                                }}
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5 text-white" />
                                ) : (
                                    <Play className="w-5 h-5 text-white" style={{ marginLeft: 2 }} />
                                )}
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#e8e8e8',
                                    margin: 0,
                                    lineHeight: 1.2,
                                }}>Audio de bienvenida</p>
                                <p style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.35)',
                                    margin: '2px 0 0',
                                }}>
                                    {audioReady ? `${formatTime(progress)} / ${formatTime(duration)}` : 'Cargando...'}
                                </p>
                            </div>

                            {/* Volume */}
                            <button onClick={toggleMute} style={{
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                                padding: 4, lineHeight: 0,
                            }}>
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div
                            onClick={handleSeek}
                            style={{
                                height: 4,
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: 99,
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{
                                height: '100%',
                                width: duration > 0 ? `${(progress / duration) * 100}%` : '0%',
                                background: 'linear-gradient(90deg, #c9a84c, #e8c56d)',
                                borderRadius: 99,
                                transition: 'width 0.1s linear',
                            }} />
                        </div>

                        {/* Waveform decoration */}
                        {isPlaying && (
                            <div className="flex items-end justify-center gap-[3px] mt-3 h-5">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: 3,
                                            borderRadius: 99,
                                            background: 'rgba(201,168,76,0.25)',
                                            animation: `waveBar 0.8s ease-in-out ${i * 0.05}s infinite alternate`,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        {/* Primary: Start Guide Tour */}
                        <button
                            onClick={handleStartTour}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                letterSpacing: '0.02em',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,168,76,0.35)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.25)';
                            }}
                        >
                            <BookOpen className="w-4 h-4" />
                            Iniciar Guía Rápida
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Secondary: Skip */}
                        <button
                            onClick={handleSkip}
                            style={{
                                width: '100%',
                                padding: '10px 24px',
                                borderRadius: '12px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.35)',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                            }}
                        >
                            Ya conozco la plataforma, omitir
                        </button>
                    </div>
                </div>

                {/* Waveform animation keyframes */}
                <style>{`
                    @keyframes waveBar {
                        0% { height: 4px; }
                        100% { height: 18px; }
                    }
                `}</style>
            </div>
        </div>
    );
}
