'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type TipoSentencia = 'amparo_directo' | 'amparo_revision' | 'revision_fiscal' | 'recurso_queja';
type Phase = 'tipo' | 'upload' | 'generating' | 'result';

interface TipoConfig {
    id: TipoSentencia;
    label: string;
    shortLabel: string;
    description: string;
    docs: [string, string];
}

const TIPOS: TipoConfig[] = [
    {
        id: 'amparo_directo',
        label: 'Amparo Directo',
        shortLabel: 'Directo',
        description: 'Contra sentencias definitivas o laudos de tribunales ordinarios',
        docs: ['Demanda de Amparo', 'Acto Reclamado'],
    },
    {
        id: 'amparo_revision',
        label: 'Amparo en Revisión',
        shortLabel: 'Revisión',
        description: 'Recurso contra sentencias de Juzgado de Distrito en amparo indirecto',
        docs: ['Recurso de Revisión', 'Sentencia Recurrida'],
    },
    {
        id: 'revision_fiscal',
        label: 'Revisión Fiscal',
        shortLabel: 'R. Fiscal',
        description: 'Recurso contra sentencias del TFJA en materia fiscal/administrativa',
        docs: ['Recurso de Revisión Fiscal', 'Sentencia Recurrida'],
    },
    {
        id: 'recurso_queja',
        label: 'Recurso de Queja',
        shortLabel: 'Queja',
        description: 'Recurso contra autos o resoluciones que no admiten apelación',
        docs: ['Recurso de Queja', 'Determinación Recurrida'],
    },
];

const LOADER_MESSAGES = [
    'Leyendo documentos del expediente...',
    'Extrayendo datos procesales y agravios...',
    'Analizando conceptos de violación...',
    'Redactando estudio de fondo...',
    'Fundamentando con jurisprudencia...',
    'Estructurando considerandos...',
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function RedaccionSentenciasPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // ── State ──────────────────────────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>('tipo');
    const [selectedTipo, setSelectedTipo] = useState<TipoConfig | null>(null);
    const [files, setFiles] = useState<(File | null)[]>([null, null]);
    const [generatedText, setGeneratedText] = useState('');
    const [instrucciones, setInstrucciones] = useState('');
    const [error, setError] = useState('');
    const [loaderIdx, setLoaderIdx] = useState(0);

    const resultRef = useRef<HTMLDivElement>(null);
    const textEndRef = useRef<HTMLDivElement>(null);

    // ── Auth guard ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    // ── Loader rotation ────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'generating') return;
        const timer = setInterval(() => {
            setLoaderIdx(prev => (prev + 1) % LOADER_MESSAGES.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [phase]);

    // ── Auto-scroll while streaming ────────────────────────────────────────
    useEffect(() => {
        if (phase === 'generating' && generatedText) {
            textEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [generatedText, phase]);

    const allFilesUploaded = files[0] !== null && files[1] !== null;

    // ── Render formatted text ──────────────────────────────────────────────
    const renderText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();

            // Headers (## or bold uppercase lines)
            if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                return (
                    <h3 key={i} style={{
                        fontSize: '1.1rem', fontWeight: 700,
                        color: '#c9a962', marginTop: '1.5rem', marginBottom: '0.5rem',
                        letterSpacing: '0.02em',
                    }}>
                        {trimmed.replace(/^#+\s*/, '')}
                    </h3>
                );
            }

            // Bold lines (all caps or starting with **)
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                return (
                    <p key={i} style={{
                        fontWeight: 700, color: '#e8dcc8',
                        marginTop: '1rem', marginBottom: '0.3rem',
                    }}>
                        {trimmed.replace(/\*\*/g, '')}
                    </p>
                );
            }

            // Empty lines
            if (!trimmed) return <br key={i} />;

            // Normal paragraph — parse inline bold
            const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} style={{
                    color: '#d4c9b0', lineHeight: 1.8,
                    marginBottom: '0.4rem', textAlign: 'justify',
                }}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} style={{ color: '#e8dcc8' }}>{part.slice(2, -2)}</strong>;
                        }
                        return <span key={j}>{part}</span>;
                    })}
                </p>
            );
        });
    };

    // ═══════════════════════════════════════════════════════════════════════
    // GENERATE — Sálvame pattern (text/plain streaming)
    // ═══════════════════════════════════════════════════════════════════════

    const handleGenerate = async () => {
        if (!selectedTipo || !allFilesUploaded || !user?.email) return;

        setPhase('generating');
        setError('');
        setGeneratedText('');
        setLoaderIdx(0);

        try {
            const formData = new FormData();
            formData.append('tipo', selectedTipo.id);
            formData.append('user_email', user.email);
            formData.append('doc1', files[0]!);
            formData.append('doc2', files[1]!);
            if (instrucciones.trim()) {
                formData.append('instrucciones', instrucciones.trim());
            }

            const res = await fetch(`${API_URL}/redaccion-sentencias`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errData.detail || `Error ${res.status}`);
            }

            // ── Streaming text/plain (identical to Sálvame) ──────────────
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;
                    setGeneratedText(fullText);
                }
            }

            setPhase('result');
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);

        } catch (err: any) {
            setError(err.message || 'Error al generar la sentencia');
            setPhase('upload');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // COPY / RESET
    // ═══════════════════════════════════════════════════════════════════════

    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setPhase('tipo');
        setSelectedTipo(null);
        setFiles([null, null]);
        setGeneratedText('');
        setInstrucciones('');
        setError('');
    };

    if (authLoading) return null;

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #141210 50%, #0a0a0a 100%)',
            color: '#e8dcc8',
            fontFamily: "'Arial Black', 'Arial', sans-serif",
        }}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <header style={{
                padding: '1.5rem 2rem',
                borderBottom: '1px solid rgba(201,169,98,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <h1 style={{
                        fontSize: '1.25rem', fontWeight: 900, color: '#c9a962',
                        letterSpacing: '0.06em', margin: 0,
                    }}>
                        REDACCIÓN DE SENTENCIAS
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: '#8b7355', margin: 0 }}>
                        Tribunales Colegiados de Circuito
                    </p>
                </div>
                <button
                    onClick={() => router.push('/chat')}
                    style={{
                        background: 'transparent', border: '1px solid rgba(201,169,98,0.3)',
                        color: '#c9a962', padding: '0.5rem 1rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.85rem',
                    }}
                >
                    ← Volver al chat
                </button>
            </header>

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>

                {/* ═══════════════════════════════════════════════════════════
                    PHASE 1: Select Tipo
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'tipo' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <p style={{ color: '#8b7355', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                ESTUDIO DE FONDO
                            </p>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#e8dcc8', margin: '0.5rem 0' }}>
                                Selecciona el tipo de asunto
                            </h2>
                            <p style={{ color: '#8b7355', fontSize: '0.9rem' }}>
                                El sistema generará el estudio de fondo a partir de los documentos del expediente
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {TIPOS.map(tipo => (
                                <button
                                    key={tipo.id}
                                    onClick={() => { setSelectedTipo(tipo); setPhase('upload'); }}
                                    style={{
                                        background: 'rgba(201,169,98,0.05)',
                                        border: '1px solid rgba(201,169,98,0.2)',
                                        borderRadius: '12px', padding: '1.5rem 1.25rem',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.borderColor = 'rgba(201,169,98,0.5)';
                                        e.currentTarget.style.background = 'rgba(201,169,98,0.1)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.borderColor = 'rgba(201,169,98,0.2)';
                                        e.currentTarget.style.background = 'rgba(201,169,98,0.05)';
                                    }}
                                >
                                    <h3 style={{ color: '#c9a962', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                                        {tipo.label}
                                    </h3>
                                    <p style={{ color: '#8b7355', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
                                        {tipo.description}
                                    </p>
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {tipo.docs.map(doc => (
                                            <span key={doc} style={{
                                                fontSize: '0.7rem', color: '#8b7355',
                                                background: 'rgba(201,169,98,0.08)',
                                                padding: '0.2rem 0.5rem', borderRadius: '4px',
                                            }}>
                                                {doc}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE 2: Upload Documents
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'upload' && selectedTipo && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <p style={{ color: '#8b7355', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                ESTUDIO DE FONDO
                            </p>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#e8dcc8', margin: '0.5rem 0' }}>
                                {selectedTipo.label}
                            </h2>
                            <p style={{ color: '#8b7355', fontSize: '0.9rem' }}>
                                Adjunta los 2 documentos del expediente
                            </p>
                        </div>

                        {/* Document uploads */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            {selectedTipo.docs.map((docLabel, idx) => (
                                <div
                                    key={docLabel}
                                    style={{
                                        border: files[idx]
                                            ? '1px solid rgba(201,169,98,0.4)'
                                            : '2px dashed rgba(201,169,98,0.2)',
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        background: files[idx] ? 'rgba(201,169,98,0.05)' : 'transparent',
                                        cursor: 'pointer',
                                        position: 'relative',
                                    }}
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.pdf';
                                        input.onchange = (e) => {
                                            const f = (e.target as HTMLInputElement).files?.[0];
                                            if (f) {
                                                const newFiles = [...files];
                                                newFiles[idx] = f;
                                                setFiles(newFiles);
                                            }
                                        };
                                        input.click();
                                    }}
                                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(201,169,98,0.6)'; }}
                                    onDragLeave={e => { e.currentTarget.style.borderColor = files[idx] ? 'rgba(201,169,98,0.4)' : 'rgba(201,169,98,0.2)'; }}
                                    onDrop={e => {
                                        e.preventDefault();
                                        const f = e.dataTransfer.files[0];
                                        if (f && f.type === 'application/pdf') {
                                            const newFiles = [...files];
                                            newFiles[idx] = f;
                                            setFiles(newFiles);
                                        }
                                    }}
                                >
                                    {files[idx] ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div>
                                                    <p style={{ color: '#e8dcc8', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                                                        {files[idx]!.name}
                                                    </p>
                                                    <p style={{ color: '#8b7355', fontSize: '0.75rem', margin: 0 }}>
                                                        {(files[idx]!.size / (1024 * 1024)).toFixed(1)} MB · PDF
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newFiles = [...files];
                                                    newFiles[idx] = null;
                                                    setFiles(newFiles);
                                                }}
                                                style={{
                                                    background: 'transparent', border: 'none',
                                                    color: '#8b7355', cursor: 'pointer', fontSize: '1.2rem',
                                                }}
                                            >×</button>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                            <p style={{ color: '#c9a962', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
                                                {docLabel}
                                            </p>
                                            <p style={{ color: '#8b7355', fontSize: '0.75rem', margin: 0 }}>
                                                Clic o arrastra un PDF aquí
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Instructions textarea */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block', color: '#c9a962', fontSize: '0.85rem',
                                fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em',
                            }}>
                                DIRECTRIZ DEL SECRETARIO (opcional)
                            </label>
                            <textarea
                                value={instrucciones}
                                onChange={e => setInstrucciones(e.target.value)}
                                placeholder="Escribe aquí la directriz para el proyecto: sentido de la resolución, calificación de los agravios, fundamentos legales, jurisprudencia aplicable..."
                                style={{
                                    width: '100%', minHeight: '120px', padding: '1rem',
                                    background: 'rgba(201,169,98,0.03)',
                                    border: '1px solid rgba(201,169,98,0.2)',
                                    borderRadius: '10px', color: '#e8dcc8',
                                    fontSize: '0.85rem', lineHeight: 1.6,
                                    fontFamily: "'Arial', sans-serif",
                                    resize: 'vertical', outline: 'none',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(201,169,98,0.5)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(201,169,98,0.2)'; }}
                            />
                            <p style={{ color: '#6b5c44', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                                Ejemplo: "Conceder el amparo. El primer concepto de violación es fundado porque..."
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                                borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                                color: '#fca5a5', fontSize: '0.85rem',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => { setPhase('tipo'); setSelectedTipo(null); setFiles([null, null]); }}
                                style={{
                                    flex: 1, padding: '0.9rem',
                                    background: 'transparent',
                                    border: '1px solid rgba(201,169,98,0.3)',
                                    borderRadius: '10px', color: '#c9a962',
                                    cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                                }}
                            >
                                Cambiar tipo
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={!allFilesUploaded}
                                style={{
                                    flex: 2, padding: '0.9rem',
                                    background: allFilesUploaded
                                        ? 'linear-gradient(135deg, #c9a962 0%, #8b7355 100%)'
                                        : 'rgba(201,169,98,0.15)',
                                    border: 'none', borderRadius: '10px',
                                    color: allFilesUploaded ? '#0a0a0a' : '#8b7355',
                                    cursor: allFilesUploaded ? 'pointer' : 'not-allowed',
                                    fontSize: '0.95rem', fontWeight: 900,
                                    letterSpacing: '0.02em',
                                }}
                            >
                                Generar Estudio de Fondo
                            </button>
                        </div>

                        <p style={{
                            textAlign: 'center', color: '#6b5c44', fontSize: '0.75rem',
                            marginTop: '1rem',
                        }}>
                            El sistema leerá los documentos y generará el estudio de fondo en tiempo real
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE 3: Generating (streaming live text)
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'generating' && (
                    <div>
                        {/* Loader header — shown while waiting for first token */}
                        {!generatedText && (
                            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                <div style={{
                                    width: '48px', height: '48px', margin: '0 auto 1.5rem',
                                    border: '3px solid rgba(201,169,98,0.2)',
                                    borderTop: '3px solid #c9a962',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                }} />
                                <h3 style={{ color: '#e8dcc8', fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                                    Generando...
                                </h3>
                                <p style={{ color: '#8b7355', fontSize: '0.85rem' }}>
                                    {LOADER_MESSAGES[loaderIdx]}
                                </p>
                            </div>
                        )}

                        {/* Live streaming text */}
                        {generatedText && (
                            <div style={{
                                background: 'rgba(201,169,98,0.03)',
                                border: '1px solid rgba(201,169,98,0.15)',
                                borderRadius: '12px', padding: '2rem',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    marginBottom: '1.5rem',
                                }}>
                                    <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: '#c9a962',
                                        animation: 'pulse 1.5s ease-in-out infinite',
                                    }} />
                                    <span style={{ color: '#c9a962', fontSize: '0.8rem', fontWeight: 600 }}>
                                        REDACTANDO EN VIVO — {selectedTipo?.label}
                                    </span>
                                </div>

                                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                    {renderText(generatedText)}
                                    <div ref={textEndRef} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE 4: Result
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'result' && (
                    <div ref={resultRef}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>

                            <h2 style={{ color: '#e8dcc8', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                                Estudio de Fondo Generado
                            </h2>
                            <p style={{ color: '#8b7355', fontSize: '0.85rem' }}>
                                {selectedTipo?.label} · {generatedText.length.toLocaleString()} caracteres
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                            <button
                                onClick={handleCopy}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.25rem',
                                    background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(201,169,98,0.1)',
                                    border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(201,169,98,0.3)'}`,
                                    borderRadius: '8px',
                                    color: copied ? '#22c55e' : '#c9a962',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {copied ? 'Copiado' : 'Copiar'}
                            </button>
                            <button
                                onClick={handleReset}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.25rem',
                                    background: 'transparent',
                                    border: '1px solid rgba(201,169,98,0.3)',
                                    borderRadius: '8px', color: '#c9a962',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                Nuevo expediente
                            </button>
                        </div>

                        {/* Generated text */}
                        <div style={{
                            background: 'rgba(201,169,98,0.03)',
                            border: '1px solid rgba(201,169,98,0.15)',
                            borderRadius: '12px', padding: '2rem',
                        }}>
                            {renderText(generatedText)}
                        </div>
                    </div>
                )}
            </main>

            {/* ── CSS Animations ─────────────────────────────────────────── */}
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}

