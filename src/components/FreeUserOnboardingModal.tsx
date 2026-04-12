'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, ChevronRight, Scale } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Audio-synced tour steps — matched to audio-bienvenida.mp3          */
/*  Each step fires when audio.currentTime crosses the timestamp.     */
/* ------------------------------------------------------------------ */
interface TourStep {
    selector: string;
    title: string;
    description: string;
    timestamp: number; // seconds into audio when this step activates
    preferBelow?: boolean;
    padding?: number;
}

const TOUR_STEPS: TourStep[] = [
    {
        selector: '[data-guide="jurisdiccion"]',
        title: '🗺️ Tu jurisdicción',
        description:
            'Al registrarte elegiste tu estado. Toda consulta se filtra automáticamente hacia la legislación de esa entidad federativa.',
        timestamp: 0,
        padding: 10,
        preferBelow: true,
    },
    {
        selector: '[data-guide="fuero-filter"]',
        title: '⚖️ Filtro de Fuero',
        description:
            'Define el ámbito normativo: Constitucional, Federal o Estatal. Si no estás seguro, déjalo en Automático.',
        timestamp: 15,
        padding: 10,
        preferBelow: true,
    },
    {
        selector: '[data-guide="materia-filter"]',
        title: '📚 Filtro de Materia',
        description:
            'Enfoca la búsqueda a una rama jurídica específica: Civil, Penal, Familiar, Laboral, Mercantil y más. Combínalo con el fuero para resultados precisos.',
        timestamp: 30,
        padding: 10,
        preferBelow: true,
    },
    {
        selector: '[data-guide="buscar-redactar"]',
        title: '🔍 Modo Consulta',
        description:
            'Tu investigador privado. Rastrea leyes específicas, localiza jurisprudencia exacta y fundamenta tu estrategia antes de escribir.',
        timestamp: 55,
        padding: 8,
    },
    {
        selector: '[data-guide="buscar-redactar"]',
        title: '✍️ Modo Redacción',
        description:
            'Tu pluma de alta precisión. Genera agravios, conceptos de violación, argumentos para sentencias — transforma la información en argumentos sólidos y fundados.',
        timestamp: 85,
        padding: 8,
    },
];

/* ------------------------------------------------------------------ */

interface FreeUserOnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
    userName?: string;
    userId?: string;
}

const STORAGE_KEY_PREFIX = 'iurexia_onboarding_v2_';

function hasSeenOnboardingForUser(userId?: string): boolean {
    if (typeof window === 'undefined') return true;
    if (!userId) return localStorage.getItem('iurexia_free_onboarding_seen') === 'true';
    return localStorage.getItem(STORAGE_KEY_PREFIX + userId) === 'true';
}

function markOnboardingSeenForUser(userId?: string): void {
    if (typeof window === 'undefined') return;
    // Mark both the user-specific and legacy keys
    if (userId) localStorage.setItem(STORAGE_KEY_PREFIX + userId, 'true');
    localStorage.setItem('iurexia_free_onboarding_seen', 'true');
}

// Export for external use (chat page)
export { hasSeenOnboardingForUser as hasSeenOnboarding };

interface Rect { top: number; left: number; width: number; height: number; }

export default function FreeUserOnboardingModal({
    isOpen,
    onComplete,
    userName,
    userId,
}: FreeUserOnboardingModalProps) {
    const [phase, setPhase] = useState<'play' | 'tour' | 'done'>('play');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [tourStep, setTourStep] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationRef = useRef<number>(0);

    // Initialize audio element
    useEffect(() => {
        if (!isOpen) return;
        setPhase('play');
        setTourStep(0);
        setProgress(0);
        setIsPlaying(false);

        const audio = new Audio('/audio-bienvenida.mp3');
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setPhase('done');
            cancelAnimationFrame(animationRef.current);
        });

        return () => {
            cancelAnimationFrame(animationRef.current);
            audio.pause();
            audio.src = '';
        };
    }, [isOpen]);

    // Measure target element for spotlight
    const measureElement = useCallback((selector: string, padding = 4) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) { setRect(null); return; }
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setTimeout(() => {
            const r = el.getBoundingClientRect();
            setRect({
                top: r.top - padding,
                left: r.left - padding,
                width: r.width + padding * 2,
                height: r.height + padding * 2,
            });
        }, 300);
    }, []);

    // When tourStep changes, measure the target element
    useEffect(() => {
        if (phase !== 'tour') return;
        const current = TOUR_STEPS[tourStep];
        if (current) {
            const t = setTimeout(() => measureElement(current.selector, current.padding ?? 4), 150);
            return () => clearTimeout(t);
        }
    }, [phase, tourStep, measureElement]);

    // Audio progress tracker + auto-advance tour steps
    const updateProgress = useCallback(() => {
        if (!audioRef.current) return;
        const currentTime = audioRef.current.currentTime;
        setProgress(currentTime);

        // Auto-advance: find the highest step whose timestamp <= currentTime
        let targetStep = 0;
        for (let i = TOUR_STEPS.length - 1; i >= 0; i--) {
            if (currentTime >= TOUR_STEPS[i].timestamp) {
                targetStep = i;
                break;
            }
        }
        setTourStep(prev => {
            if (targetStep !== prev) return targetStep;
            return prev;
        });

        if (!audioRef.current.paused) {
            animationRef.current = requestAnimationFrame(updateProgress);
        }
    }, []);

    // Handle PLAY button click (user gesture — bypasses autoplay)
    const handlePlay = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.play().then(() => {
            setIsPlaying(true);
            setPhase('tour');
            updateProgress();
        }).catch(err => {
            console.error('Audio play error:', err);
        });
    }, [updateProgress]);

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleFinish = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            cancelAnimationFrame(animationRef.current);
        }
        setIsClosing(true);
        setTimeout(() => {
            markOnboardingSeenForUser(userId);
            setIsClosing(false);
            onComplete();
        }, 400);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (phase === 'tour' && TOUR_STEPS[tourStep]) {
                measureElement(TOUR_STEPS[tourStep].selector, TOUR_STEPS[tourStep].padding ?? 4);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [phase, tourStep, measureElement]);

    if (!isOpen) return null;

    const firstName = userName?.split(' ')[0] || '';
    const WH = typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1024, h: 768 };

    // ===== PHASE 1: PLAY SCREEN =====
    if (phase === 'play') {
        return (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center"
                style={{ animation: 'onboardFadeIn 0.6s ease-out' }}
            >
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

                <div
                    className="relative z-10 text-center px-6"
                    style={{ animation: 'onboardSlideUp 0.7s ease-out 0.15s both' }}
                >
                    {/* Logo */}
                    <div className="mb-6">
                        <span
                            className="text-5xl font-semibold"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            <span className="text-white">Iurex</span>
                            <span style={{ color: '#c9a962' }}>ia</span>
                        </span>
                    </div>

                    {/* Welcome text */}
                    <h1
                        className="text-3xl font-semibold text-white mb-2"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        {firstName ? `¡Bienvenido, ${firstName}!` : '¡Bienvenido!'}
                    </h1>
                    <p className="text-white/40 text-base mb-10 max-w-sm mx-auto">
                        Antes de comenzar, escucha esta breve guía para conocer tus herramientas
                    </p>

                    {/* Big Play Button */}
                    <button
                        onClick={handlePlay}
                        className="group relative mx-auto"
                        style={{
                            width: 100, height: 100, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 0 0 rgba(201,168,76,0.4)',
                            animation: 'playPulse 2s ease-in-out infinite',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <Play
                            className="text-white ml-1"
                            style={{ width: 40, height: 40, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                        />
                    </button>

                    <p className="text-white/30 text-sm mt-6 tracking-wide mb-8">
                        Presiona para iniciar la guía
                    </p>

                    {/* Skip button phase 1 */}
                    <button
                        onClick={handleFinish}
                        className="bg-transparent border-none text-white/40 hover:text-white/80 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                        Omitir y empezar a usar iurexia
                    </button>
                </div>

                <style>{`
                    @keyframes onboardFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes onboardSlideUp {
                        from { opacity: 0; transform: translateY(30px) scale(0.96); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes playPulse {
                        0% { box-shadow: 0 0 0 0 rgba(201,168,76,0.5); }
                        70% { box-shadow: 0 0 0 25px rgba(201,168,76,0); }
                        100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
                    }
                `}</style>
            </div>
        );
    }

    // ===== PHASE 2: AUDIO-SYNCED TOUR =====
    const current = TOUR_STEPS[tourStep];
    const tooltipW = 340;
    const GAP = 20;

    let tooltipStyle: React.CSSProperties = {};
    if (rect) {
        const centerX = Math.min(Math.max(rect.left + rect.width / 2 - tooltipW / 2, 16), WH.w - tooltipW - 16);
        const spaceAbove = rect.top - GAP;
        if (current?.preferBelow || spaceAbove < 180) {
            tooltipStyle = { top: rect.top + rect.height + GAP, left: centerX };
        } else {
            tooltipStyle = { bottom: WH.h - rect.top + GAP, left: centerX };
        }
    } else {
        tooltipStyle = { top: WH.h / 2 - 80, left: WH.w / 2 - tooltipW / 2 };
    }

    const descParts = current?.description.split('\n\n') || [''];

    return (
        <div className={`fixed inset-0 z-[200] transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            {/* Spotlight SVG overlay */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <defs>
                    <mask id="onboard-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {rect && (
                            <rect
                                x={rect.left} y={rect.top}
                                width={rect.width} height={rect.height}
                                rx="10" fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.82)" mask="url(#onboard-mask)" />
                {rect && (
                    <rect
                        x={rect.left - 2} y={rect.top - 2}
                        width={rect.width + 4} height={rect.height + 4}
                        rx="11" fill="none"
                        stroke="#c9a962" strokeWidth="2"
                        strokeDasharray="6 3"
                        style={{ animation: 'tourDash 1.2s linear infinite' }}
                    />
                )}
            </svg>

            {/* Skip Button Phase 2 */}
            <button
                onClick={handleFinish}
                className="absolute top-6 right-6 z-[220] px-4 py-2 bg-[rgba(20,20,20,0.6)] hover:bg-[rgba(40,40,40,0.8)] border border-white/10 rounded-full text-white/60 hover:text-white text-sm font-medium cursor-pointer backdrop-blur transition-all"
            >
                Omitir tutorial
            </button>

            {/* Tooltip Card */}
            {current && (
                <div
                    className="absolute shadow-2xl"
                    key={tourStep}
                    style={{
                        ...tooltipStyle, width: tooltipW,
                        pointerEvents: 'auto', zIndex: 210,
                        animation: 'tooltipFadeIn 0.4s ease-out',
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(160deg, #1c1c1e 0%, #111111 100%)',
                        border: '1px solid rgba(201,169,98,0.4)',
                        borderRadius: '18px',
                        padding: '22px 22px 18px',
                        position: 'relative',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                    }}>
                        {/* Step badge */}
                        <span style={{
                            fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
                            color: '#c9a962', textTransform: 'uppercase',
                            display: 'inline-block', marginBottom: 10,
                            background: 'rgba(201,169,98,0.10)',
                            padding: '3px 8px', borderRadius: 99,
                            border: '1px solid rgba(201,169,98,0.2)',
                        }}>
                            Paso {tourStep + 1} / {TOUR_STEPS.length}
                        </span>

                        {/* Title */}
                        <h3 style={{
                            fontSize: '15px', fontWeight: 700, color: '#f0f0f0',
                            marginBottom: 10, lineHeight: 1.35,
                            fontFamily: 'Georgia, "Times New Roman", serif',
                        }}>
                            {current.title}
                        </h3>

                        {/* Description */}
                        <div style={{ marginBottom: 14 }}>
                            {descParts.map((part, i) => (
                                <p key={i} style={{
                                    fontSize: '12.5px', color: 'rgba(255,255,255,0.62)',
                                    lineHeight: 1.65, marginBottom: i < descParts.length - 1 ? 10 : 0,
                                }}>
                                    {part}
                                </p>
                            ))}
                        </div>

                        {/* Progress dots */}
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {TOUR_STEPS.map((_, i) => (
                                <div key={i} style={{
                                    width: i === tourStep ? 20 : 6, height: 6,
                                    borderRadius: 9999,
                                    background: i === tourStep ? '#c9a962'
                                        : i < tourStep ? 'rgba(201,169,98,0.5)'
                                        : 'rgba(255,255,255,0.18)',
                                    transition: 'all 0.3s ease',
                                }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Audio Bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                zIndex: 220, pointerEvents: 'auto',
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.95) 40%)',
                padding: '30px 20px 24px',
            }}>
                <div style={{
                    maxWidth: 480, margin: '0 auto',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    {/* Waveform bars */}
                    {isPlaying && (
                        <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 20, flexShrink: 0 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 3, borderRadius: 99,
                                        background: '#c9a84c',
                                        animation: `waveBar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Progress bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            height: 4, borderRadius: 99,
                            background: 'rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: 99,
                                width: duration > 0 ? `${(progress / duration) * 100}%` : '0%',
                                background: 'linear-gradient(90deg, #c9a84c, #e0c070)',
                                transition: 'width 0.1s linear',
                            }} />
                        </div>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            marginTop: 4,
                        }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                {formatTime(progress)}
                            </span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                {duration > 0 ? formatTime(duration) : '--:--'}
                            </span>
                        </div>
                    </div>

                    {/* Mute */}
                    <button onClick={toggleMute} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isMuted ? 'rgba(255,255,255,0.2)' : '#c9a84c',
                        padding: 4, lineHeight: 0, flexShrink: 0,
                    }}>
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Done overlay */}
            {phase === 'done' && (
                <div
                    className="fixed inset-0 z-[230] flex items-center justify-center"
                    style={{ animation: 'onboardFadeIn 0.5s ease-out' }}
                >
                    <div className="absolute inset-0 bg-black/80" />
                    <div className="relative z-10 text-center px-6" style={{ animation: 'onboardSlideUp 0.5s ease-out' }}>
                        <div className="mb-5">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(201,169,98,0.2), rgba(201,169,98,0.05))',
                                    border: '2px solid rgba(201,169,98,0.4)',
                                }}
                            >
                                <Scale className="w-8 h-8 text-[#c9a962]" />
                            </div>
                        </div>
                        <h2
                            className="text-2xl font-semibold text-white mb-2"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            ¡Estás listo!
                        </h2>
                        <p className="text-white/40 text-sm mb-8 max-w-xs mx-auto">
                            Ya conoces las herramientas clave. Haz tu primera consulta y comprueba el poder de Iurexia.
                        </p>
                        <button
                            onClick={handleFinish}
                            className="px-8 py-3.5 rounded-xl font-bold text-base tracking-wide transition-all duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                                color: '#0f0f0f', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(201,169,98,0.35)',
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(201,169,98,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,169,98,0.35)'; }}
                        >
                            Comenzar a usar Iurexia
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes tourDash { to { stroke-dashoffset: -18; } }
                @keyframes waveBar {
                    0% { height: 4px; }
                    100% { height: 16px; }
                }
                @keyframes tooltipFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes onboardFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes onboardSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes playPulse {
                    0% { box-shadow: 0 0 0 0 rgba(201,168,76,0.5); }
                    70% { box-shadow: 0 0 0 25px rgba(201,168,76,0); }
                    100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
                }
            `}</style>
        </div>
    );
}
