'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, BookOpen, ChevronRight, Sparkles } from 'lucide-react';

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
    const [showGuidePrompt, setShowGuidePrompt] = useState(false);
    const [guidePromptVisible, setGuidePromptVisible] = useState(false);
    const [audioEnded, setAudioEnded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationRef = useRef<number>(0);
    const guideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize audio — auto-play in background
    useEffect(() => {
        if (!isOpen) return;
        const audio = new Audio('/audio-bienvenida.mp3');
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setAudioEnded(true);
            cancelAnimationFrame(animationRef.current);
        });

        // Auto-play after a short delay
        const autoPlayTimer = setTimeout(() => {
            audio.play().then(() => {
                setIsPlaying(true);
                updateProgress();
            }).catch(() => {
                // Autoplay blocked — mark as ended so guide shows
                setAudioEnded(true);
            });
        }, 500);

        // Show the guide prompt after a delay (similar to audio duration, ~30s or when audio ends)
        guideTimerRef.current = setTimeout(() => {
            setShowGuidePrompt(true);
            // Trigger fade-in after a tick
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setGuidePromptVisible(true));
            });
        }, 25000); // 25 seconds — gives audio time to finish

        return () => {
            clearTimeout(autoPlayTimer);
            if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
            cancelAnimationFrame(animationRef.current);
            audio.pause();
            audio.src = '';
        };
    }, [isOpen]);

    // When audio ends, show guide prompt immediately if not already shown
    useEffect(() => {
        if (audioEnded && !showGuidePrompt) {
            setShowGuidePrompt(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setGuidePromptVisible(true));
            });
        }
    }, [audioEnded, showGuidePrompt]);

    const updateProgress = useCallback(() => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            if (!audioRef.current.paused) {
                animationRef.current = requestAnimationFrame(updateProgress);
            }
        }
    }, []);

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
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

    const handleDismiss = () => {
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
        <>
            {/* Subtle floating audio indicator — bottom-right corner, NON-blocking */}
            {isPlaying && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 100,
                        right: 20,
                        zIndex: 90,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'linear-gradient(135deg, #1e1e20 0%, #121214 100%)',
                        border: '1px solid rgba(201,169,98,0.25)',
                        borderRadius: 16,
                        padding: '10px 16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        animation: 'audioFloatIn 0.6s ease-out',
                    }}
                >
                    {/* Waveform bars */}
                    <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 18 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 3,
                                    borderRadius: 99,
                                    background: '#c9a84c',
                                    animation: `waveBar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <p style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#e8e8e8',
                            margin: 0,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                        }}>
                            {firstName ? `${firstName}, escucha...` : 'Audio de bienvenida'}
                        </p>
                        <p style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.35)',
                            margin: '1px 0 0',
                        }}>
                            {formatTime(progress)} / {formatTime(duration)}
                        </p>
                    </div>

                    {/* Mute toggle */}
                    <button onClick={toggleMute} style={{
                        background: 'none', border: 'none',
                        color: isMuted ? 'rgba(255,255,255,0.2)' : '#c9a84c',
                        cursor: 'pointer', padding: 2, lineHeight: 0,
                    }}>
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                </div>
            )}

            {/* Guide prompt — appears after audio delay, as a non-blocking floating card */}
            {showGuidePrompt && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 100,
                        right: 20,
                        zIndex: 91,
                        width: 320,
                        background: 'linear-gradient(165deg, #1e1e20 0%, #121214 50%, #0d0d0f 100%)',
                        border: '1px solid rgba(201,169,98,0.3)',
                        borderRadius: 20,
                        padding: '22px 20px 18px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(201,169,98,0.05)',
                        opacity: guidePromptVisible ? 1 : 0,
                        transform: guidePromptVisible ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 0.5s ease, transform 0.5s ease',
                    }}
                >
                    {/* Gold accent line */}
                    <div style={{
                        position: 'absolute', top: 0, left: 20, right: 20, height: 2,
                        background: 'linear-gradient(90deg, transparent 0%, #c9a84c 50%, transparent 100%)',
                        borderRadius: 2,
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(201,168,76,0.2)',
                        }}>
                            <Sparkles className="w-4 h-4" style={{ color: '#c9a84c' }} />
                        </div>
                        <div>
                            <p style={{
                                fontSize: 14, fontWeight: 700, color: '#f0f0f0',
                                margin: 0, fontFamily: 'Georgia, "Times New Roman", serif',
                            }}>
                                ¿Quieres un recorrido?
                            </p>
                            <p style={{
                                fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0',
                            }}>
                                Conoce todas las herramientas
                            </p>
                        </div>
                    </div>

                    <p style={{
                        fontSize: 12, color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.55, margin: '0 0 14px',
                    }}>
                        Te mostramos cada función para que le saques el máximo provecho a Iurexia desde tu primera consulta.
                    </p>

                    {/* CTA: Start Guide */}
                    <button
                        onClick={handleStartTour}
                        style={{
                            width: '100%',
                            padding: '11px 20px',
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
                            border: 'none',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            boxShadow: '0 4px 16px rgba(201,168,76,0.25)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,168,76,0.35)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,168,76,0.25)';
                        }}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        Iniciar Guía Rápida
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Skip */}
                    <button
                        onClick={handleDismiss}
                        style={{
                            width: '100%',
                            padding: '8px',
                            marginTop: 8,
                            borderRadius: 10,
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.3)',
                            fontSize: 11,
                            cursor: 'pointer',
                            transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                    >
                        Omitir
                    </button>
                </div>
            )}

            {/* Keyframes */}
            <style>{`
                @keyframes waveBar {
                    0% { height: 4px; }
                    100% { height: 16px; }
                }
                @keyframes audioFloatIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
