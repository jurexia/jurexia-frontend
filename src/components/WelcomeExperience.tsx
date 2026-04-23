'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Check, Search, FileText, Brain, ArrowRight, Sparkles, Shield, Scale } from 'lucide-react';
import { ESTADOS_SOLO, getEstadoLabel } from '@/lib/estados';
import { updateUserEstado } from '@/lib/supabase';

interface WelcomeExperienceProps {
    userId: string;
    userName?: string;
    onComplete: (estado: string) => void;
    onStartTour: () => void;
}

const FEATURES = [
    {
        icon: Search,
        title: 'Consulta Inteligente',
        desc: 'Busca en toda la legislaci\u00f3n mexicana, jurisprudencia y tratados internacionales con IA de \u00faltima generaci\u00f3n.',
        color: '#c9a962',
    },
    {
        icon: FileText,
        title: 'Redactor Judicial',
        desc: 'Genera argumentos de nivel Secretario de Estudio y Cuenta de la SCJN en segundos. Prosa forense lista para imprimir.',
        color: '#7B9EDB',
    },
    {
        icon: Brain,
        title: 'Genios Especializados',
        desc: 'IA entrenada por materia con el corpus completo de leyes en memoria. Amparo, Mercantil, Penal, Civil y m\u00e1s.',
        color: '#9B7EDE',
    },
];

const STATS = [
    { value: '1,500+', label: 'profesionales activos' },
    { value: '22', label: 'estados disponibles' },
    { value: '970K+', label: 'sentencias analizadas' },
];

export default function WelcomeExperience({ userId, userName, onComplete, onStartTour }: WelcomeExperienceProps) {
    const [step, setStep] = useState(0);
    const [selectedEstado, setSelectedEstado] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [entering, setEntering] = useState(true);
    const [featureVisible, setFeatureVisible] = useState(-1);

    useEffect(() => {
        const t = setTimeout(() => setEntering(false), 100);
        return () => clearTimeout(t);
    }, []);

    // Stagger feature cards animation
    useEffect(() => {
        if (step === 2) {
            FEATURES.forEach((_, i) => {
                setTimeout(() => setFeatureVisible(i), 200 + i * 200);
            });
        }
    }, [step]);

    const firstName = userName?.split(' ')[0] || '';

    const filteredEstados = ESTADOS_SOLO.filter(e =>
        e.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectEstado = useCallback(async () => {
        if (!selectedEstado) return;
        setSaving(true);
        try {
            await updateUserEstado(userId, selectedEstado);
            setStep(2);
        } catch {
            console.error('Error saving estado');
        } finally {
            setSaving(false);
        }
    }, [selectedEstado, userId]);

    const handleFinish = useCallback((startTour: boolean) => {
        onComplete(selectedEstado);
        if (startTour) {
            setTimeout(() => onStartTour(), 400);
        }
    }, [selectedEstado, onComplete, onStartTour]);

    const nextStep = () => setStep(s => s + 1);

    return (
        <div
            className="fixed inset-0 z-[250] flex items-center justify-center"
            style={{
                opacity: entering ? 0 : 1,
                transition: 'opacity 0.6s ease-out',
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

            {/* Content */}
            <div className="relative z-10 w-full max-w-lg mx-4">

                {/* ── STEP 0: Grand Entrance ── */}
                {step === 0 && (
                    <div className="text-center" style={{ animation: 'welcomeSlideUp 0.7s ease-out' }}>
                        {/* Logo with glow */}
                        <div style={{ marginBottom: 32 }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '20px 32px',
                                borderRadius: 24,
                                background: 'radial-gradient(ellipse at center, rgba(201,169,98,0.08) 0%, transparent 70%)',
                            }}>
                                <span style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 600 }}>
                                    <span style={{ color: '#fff' }}>Iurex</span>
                                    <span style={{ color: '#c9a962' }}>ia</span>
                                </span>
                            </div>
                        </div>

                        {/* Personalized greeting */}
                        <h1 style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: 28,
                            fontWeight: 600,
                            color: '#fff',
                            marginBottom: 12,
                            lineHeight: 1.3,
                        }}>
                            {firstName
                                ? `Bienvenido, ${firstName}`
                                : 'Bienvenido'
                            }
                        </h1>

                        <p style={{
                            color: 'rgba(255,255,255,0.45)',
                            fontSize: 15,
                            lineHeight: 1.6,
                            marginBottom: 40,
                            maxWidth: 380,
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}>
                            Acabas de acceder a la herramienta de inteligencia jur\u00eddica
                            m\u00e1s avanzada de M\u00e9xico. Prep\u00e1rate para transformar
                            tu pr\u00e1ctica legal.
                        </p>

                        {/* Social proof stats */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 32,
                            marginBottom: 48,
                        }}>
                            {STATS.map((stat) => (
                                <div key={stat.label} style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 22,
                                        fontWeight: 700,
                                        color: '#c9a962',
                                        fontFamily: 'Georgia, serif',
                                    }}>
                                        {stat.value}
                                    </div>
                                    <div style={{
                                        fontSize: 11,
                                        color: 'rgba(255,255,255,0.35)',
                                        letterSpacing: '0.03em',
                                        marginTop: 4,
                                    }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={nextStep}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '16px 40px',
                                borderRadius: 14,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#0f0f0f',
                                background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                                boxShadow: '0 8px 32px rgba(201,169,98,0.35)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                letterSpacing: '0.02em',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,169,98,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,169,98,0.35)'; }}
                        >
                            Comenzar
                            <ArrowRight size={18} />
                        </button>

                        {/* Trust badges */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 24,
                            marginTop: 48,
                            color: 'rgba(255,255,255,0.18)',
                            fontSize: 10,
                            letterSpacing: '0.05em',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Shield size={10} /> Cifrado extremo a extremo
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Scale size={10} /> Legislaci\u00f3n verificada
                            </span>
                        </div>
                    </div>
                )}

                {/* ── STEP 1: State Selection ── */}
                {step === 1 && (
                    <div style={{ animation: 'welcomeSlideUp 0.5s ease-out' }}>
                        <div style={{
                            background: 'linear-gradient(160deg, #1c1c1e 0%, #111 100%)',
                            borderRadius: 20,
                            border: '1px solid rgba(201,169,98,0.15)',
                            padding: '32px 28px',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column' as const,
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: 'rgba(201,169,98,0.1)',
                                    border: '1px solid rgba(201,169,98,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px',
                                }}>
                                    <MapPin size={22} style={{ color: '#c9a962' }} />
                                </div>
                                <h2 style={{
                                    fontFamily: 'Georgia, serif',
                                    fontSize: 22, fontWeight: 600, color: '#fff',
                                    marginBottom: 8,
                                }}>
                                    \u00bfDesde qu\u00e9 estado ejerces?
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                                    Personalizaremos toda tu experiencia jur\u00eddica
                                </p>
                            </div>

                            {/* Search */}
                            <div style={{
                                position: 'relative' as const,
                                marginBottom: 16,
                            }}>
                                <MapPin size={14} style={{
                                    position: 'absolute', left: 12, top: '50%',
                                    transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)',
                                }} />
                                <input
                                    type="text"
                                    placeholder="Buscar estado..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px 10px 34px',
                                        borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)', color: '#fff',
                                        fontSize: 13, outline: 'none',
                                    }}
                                />
                            </div>

                            {/* States grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 6,
                                overflowY: 'auto' as const,
                                maxHeight: '35vh',
                                padding: '4px 0',
                            }}>
                                {filteredEstados.map(estado => (
                                    <button
                                        key={estado.value}
                                        onClick={() => setSelectedEstado(estado.value)}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 10,
                                            border: selectedEstado === estado.value
                                                ? '1px solid #c9a962'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            background: selectedEstado === estado.value
                                                ? 'rgba(201,169,98,0.12)'
                                                : 'rgba(255,255,255,0.03)',
                                            color: selectedEstado === estado.value ? '#c9a962' : 'rgba(255,255,255,0.7)',
                                            fontSize: 12,
                                            fontWeight: selectedEstado === estado.value ? 600 : 400,
                                            cursor: 'pointer',
                                            textAlign: 'left' as const,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <span style={{ flex: 1 }}>{estado.label}</span>
                                        {selectedEstado === estado.value && <Check size={13} />}
                                    </button>
                                ))}
                            </div>

                            {/* Confirm */}
                            <button
                                onClick={handleSelectEstado}
                                disabled={!selectedEstado || saving}
                                style={{
                                    marginTop: 20,
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: 12,
                                    border: 'none',
                                    cursor: selectedEstado ? 'pointer' : 'default',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: selectedEstado ? '#0f0f0f' : 'rgba(255,255,255,0.3)',
                                    background: selectedEstado
                                        ? 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)'
                                        : 'rgba(255,255,255,0.06)',
                                    boxShadow: selectedEstado ? '0 4px 20px rgba(201,169,98,0.3)' : 'none',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                {saving ? 'Guardando...' : selectedEstado
                                    ? `Continuar con ${getEstadoLabel(selectedEstado)}`
                                    : 'Selecciona un estado'}
                                {selectedEstado && !saving && <ArrowRight size={16} />}
                            </button>

                            <p style={{
                                textAlign: 'center', color: 'rgba(255,255,255,0.25)',
                                fontSize: 11, marginTop: 12,
                            }}>
                                Podr\u00e1s cambiar o consultar otras legislaciones en cualquier momento
                            </p>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Feature Showcase ── */}
                {step === 2 && (
                    <div style={{ animation: 'welcomeSlideUp 0.5s ease-out' }}>
                        <div style={{ textAlign: 'center', marginBottom: 32 }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 99,
                                background: 'rgba(201,169,98,0.1)',
                                border: '1px solid rgba(201,169,98,0.2)',
                                marginBottom: 20,
                            }}>
                                <Sparkles size={12} style={{ color: '#c9a962' }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#c9a962', letterSpacing: '0.05em' }}>
                                    TU ARSENAL JUR\u00cdDICO
                                </span>
                            </div>
                            <h2 style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: 24, fontWeight: 600, color: '#fff',
                                marginBottom: 8,
                            }}>
                                Todo lo que necesitas
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, maxWidth: 340, margin: '0 auto' }}>
                                Herramientas dise\u00f1adas por abogados, potenciadas por IA
                            </p>
                        </div>

                        {/* Feature cards */}
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, marginBottom: 32 }}>
                            {FEATURES.map((feat, i) => {
                                const Icon = feat.icon;
                                return (
                                    <div
                                        key={feat.title}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 16,
                                            padding: '18px 20px',
                                            borderRadius: 16,
                                            background: 'linear-gradient(160deg, #1c1c1e 0%, #131313 100%)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            opacity: featureVisible >= i ? 1 : 0,
                                            transform: featureVisible >= i ? 'translateX(0)' : 'translateX(-20px)',
                                            transition: 'all 0.5s ease-out',
                                        }}
                                    >
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                            background: `${feat.color}15`,
                                            border: `1px solid ${feat.color}30`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon size={20} style={{ color: feat.color }} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>
                                                {feat.title}
                                            </h3>
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                                                {feat.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CTAs */}
                        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => handleFinish(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '14px 36px',
                                    borderRadius: 12,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: '#0f0f0f',
                                    background: 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)',
                                    boxShadow: '0 6px 24px rgba(201,169,98,0.3)',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                Ver gu\u00eda r\u00e1pida (30 seg)
                                <ArrowRight size={16} />
                            </button>

                            <button
                                onClick={() => handleFinish(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.3)',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    padding: '8px 16px',
                                }}
                            >
                                Omitir \u2014 quiero explorar por mi cuenta
                            </button>
                        </div>

                        {/* Progress indicator */}
                        <div style={{
                            display: 'flex', justifyContent: 'center', gap: 6, marginTop: 32,
                        }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: i === 2 ? 24 : 8, height: 4,
                                    borderRadius: 99,
                                    background: i === 2 ? '#c9a962' : 'rgba(255,255,255,0.12)',
                                    transition: 'all 0.3s ease',
                                }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes welcomeSlideUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
