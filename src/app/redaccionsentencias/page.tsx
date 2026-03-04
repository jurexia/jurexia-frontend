'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type Fuero = 'federal' | 'estatal';
type Instancia = 'primera' | 'segunda';
type TipoSentencia = 'amparo_directo' | 'amparo_revision' | 'revision_fiscal' | 'recurso_queja';
type Phase =
    | 'fuero'
    | 'tipo'          // federal case type selection
    | 'instancia'     // state instance selection
    | 'upload'        // federal upload
    | 'upload_estatal'// state upload
    | 'generating'
    | 'result';

interface TipoConfig {
    id: TipoSentencia;
    label: string;
    shortLabel: string;
    description: string;
    docs: [string, string];
}

interface DefendantEntry {
    name: string;
    file: File | null;
    enRebeldia: boolean;
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
    'Extrayendo datos procesales y argumentos...',
    'Analizando excepciones y defensas...',
    'Redactando estudio de fondo...',
    'Fundamentando con legislación y jurisprudencia...',
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
    const [phase, setPhase] = useState<Phase>('fuero');
    const [fuero, setFuero] = useState<Fuero | null>(null);
    const [instancia, setInstancia] = useState<Instancia | null>(null);
    const [selectedTipo, setSelectedTipo] = useState<TipoConfig | null>(null);

    // Federal upload
    const [files, setFiles] = useState<(File | null)[]>([null, null]);

    // State upload
    const [demandaFile, setDemandaFile] = useState<File | null>(null);
    const [defendants, setDefendants] = useState<DefendantEntry[]>([
        { name: '', file: null, enRebeldia: false },
    ]);
    const [decisionRazonamiento, setDecisionRazonamiento] = useState('');
    const [pruebasConsideradas, setPruebasConsideradas] = useState('');

    // Shared
    const [instrucciones, setInstrucciones] = useState('');
    const [generatedText, setGeneratedText] = useState('');
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

    const allFederalFilesUploaded = files[0] !== null && files[1] !== null;

    const statalReady =
        demandaFile !== null &&
        defendants.length > 0 &&
        defendants.every(d => d.name.trim() !== '' && (d.enRebeldia || d.file !== null)) &&
        decisionRazonamiento.trim().length > 10 &&
        pruebasConsideradas.trim().length > 10;

    // ── Defendant helpers ──────────────────────────────────────────────────
    const addDefendant = () => {
        setDefendants(prev => [...prev, { name: '', file: null, enRebeldia: false }]);
    };
    const removeDefendant = (idx: number) => {
        if (defendants.length <= 1) return;
        setDefendants(prev => prev.filter((_, i) => i !== idx));
    };
    const updateDefendant = (idx: number, updates: Partial<DefendantEntry>) => {
        setDefendants(prev => prev.map((d, i) => i === idx ? { ...d, ...updates } : d));
    };

    // ── Render formatted text ──────────────────────────────────────────────
    const renderText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                return (
                    <h3 key={i} className="font-serif text-lg font-bold text-accent-gold mt-6 mb-2 tracking-wide">
                        {trimmed.replace(/^#+\s*/, '')}
                    </h3>
                );
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                return (
                    <p key={i} className="font-semibold text-charcoal-900 mt-4 mb-1">
                        {trimmed.replace(/\*\*/g, '')}
                    </p>
                );
            }
            if (!trimmed) return <br key={i} />;
            const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} className="text-charcoal-700 leading-relaxed mb-1 text-justify">
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className="text-charcoal-900">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={j}>{part}</span>;
                    })}
                </p>
            );
        });
    };

    // ═══════════════════════════════════════════════════════════════════════
    // GENERATE — Federal (existing pattern)
    // ═══════════════════════════════════════════════════════════════════════

    const handleGenerateFederal = async () => {
        if (!selectedTipo || !allFederalFilesUploaded || !user?.email) return;
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
    // GENERATE — State first instance
    // ═══════════════════════════════════════════════════════════════════════

    const handleGenerateEstatal = async () => {
        if (!statalReady || !user?.email) return;
        setPhase('generating');
        setError('');
        setGeneratedText('');
        setLoaderIdx(0);

        try {
            const formData = new FormData();
            formData.append('user_email', user.email);
            formData.append('demanda', demandaFile!);
            formData.append('num_demandados', String(defendants.length));
            formData.append('demandado_nombres', JSON.stringify(defendants.map(d => d.name)));
            formData.append('demandados_rebeldia', JSON.stringify(defendants.map(d => d.enRebeldia)));

            defendants.forEach((d, idx) => {
                if (!d.enRebeldia && d.file) {
                    formData.append(`contestacion_${idx}`, d.file);
                }
            });

            formData.append('decision_razonamiento', decisionRazonamiento.trim());
            formData.append('pruebas_consideradas', pruebasConsideradas.trim());

            if (instrucciones.trim()) {
                formData.append('instrucciones', instrucciones.trim());
            }

            const res = await fetch(`${API_URL}/redaccion-sentencias-estatal`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errData.detail || `Error ${res.status}`);
            }

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
            setPhase('upload_estatal');
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
        setPhase('fuero');
        setFuero(null);
        setInstancia(null);
        setSelectedTipo(null);
        setFiles([null, null]);
        setDemandaFile(null);
        setDefendants([{ name: '', file: null, enRebeldia: false }]);
        setDecisionRazonamiento('');
        setPruebasConsideradas('');
        setGeneratedText('');
        setInstrucciones('');
        setError('');
    };

    if (authLoading) return null;

    // ═══════════════════════════════════════════════════════════════════════
    // SHARED UI HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-accent-brown mb-2">{children}</p>
    );

    const PageTitle = ({ children }: { children: React.ReactNode }) => (
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mb-2">{children}</h2>
    );

    const PageSubtitle = ({ children }: { children: React.ReactNode }) => (
        <p className="text-charcoal-700 text-base sm:text-lg">{children}</p>
    );

    const PdfUploadZone = ({
        label,
        file,
        onSelect,
        onClear,
    }: {
        label: string;
        file: File | null;
        onSelect: (f: File) => void;
        onClear: () => void;
    }) => (
        <div
            className={`group relative rounded-2xl border-2 transition-all duration-300 cursor-pointer ${file
                ? 'border-accent-gold/40 bg-cream-100'
                : 'border-dashed border-cream-400 hover:border-accent-gold/50 hover:bg-cream-50'
                }`}
            style={{ padding: '1.25rem' }}
            onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) onSelect(f);
                };
                input.click();
            }}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f && f.type === 'application/pdf') onSelect(f);
            }}
        >
            {file ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-charcoal-900 text-sm font-semibold">{file.name}</p>
                            <p className="text-charcoal-700 text-xs">{(file.size / (1024 * 1024)).toFixed(1)} MB · PDF</p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="w-8 h-8 rounded-full bg-cream-300 hover:bg-red-50 flex items-center justify-center text-charcoal-700 hover:text-red-500 transition-colors"
                    >
                        ×
                    </button>
                </div>
            ) : (
                <div className="text-center py-3">
                    <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent-gold/10 transition-colors">
                        <svg className="w-6 h-6 text-accent-brown group-hover:text-accent-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-accent-gold font-semibold text-sm">{label}</p>
                    <p className="text-charcoal-700 text-xs mt-1">Clic o arrastra un PDF aquí</p>
                </div>
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-cream-100">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="bg-charcoal-900 border-b border-accent-gold/10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-xl font-bold text-white tracking-wide">
                            Redacción de <span className="text-accent-gold">Sentencias</span>
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {fuero === 'estatal' ? 'Fuero Estatal · Primera Instancia'
                                : fuero === 'federal' ? 'Tribunales Colegiados de Circuito'
                                    : 'Selecciona el fuero'}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/chat')}
                        className="px-4 py-2 rounded-full border border-accent-gold/30 text-accent-gold text-sm font-medium hover:bg-accent-gold/10 transition-all"
                    >
                        ← Volver al chat
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: FUERO SELECTION
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'fuero' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-10">
                            <SectionLabel>Paso 1</SectionLabel>
                            <PageTitle>Selecciona el <span className="text-accent-gold">fuero</span></PageTitle>
                            <PageSubtitle>¿Sobre qué jurisdicción redactarás la sentencia?</PageSubtitle>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Federal */}
                            <button
                                onClick={() => { setFuero('federal'); setPhase('tipo'); }}
                                className="group relative bg-charcoal-900 rounded-3xl p-8 text-left overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-accent-gold/5 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-accent-gold/20 flex items-center justify-center mb-5">
                                        <svg className="w-7 h-7 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h3 className="font-serif text-2xl font-bold text-white mb-2 group-hover:text-accent-gold transition-colors">
                                        Fuero Federal
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Tribunales Colegiados de Circuito — Amparo Directo, Revisión, Revisión Fiscal, Queja
                                    </p>
                                </div>
                            </button>

                            {/* Estatal */}
                            <button
                                onClick={() => { setFuero('estatal'); setPhase('instancia'); }}
                                className="group relative bg-white rounded-3xl p-8 text-left border border-cream-400 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-accent-brown/5 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-accent-brown/10 flex items-center justify-center mb-5">
                                        <svg className="w-7 h-7 text-accent-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                    </div>
                                    <h3 className="font-serif text-2xl font-bold text-charcoal-900 mb-2 group-hover:text-accent-brown transition-colors">
                                        Fuero Estatal
                                    </h3>
                                    <p className="text-charcoal-700 text-sm leading-relaxed">
                                        Juzgados de Primera Instancia — Juicios Civiles, Mercantiles, Familiares
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: INSTANCIA SELECTION (State only)
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'instancia' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-10">
                            <SectionLabel>Fuero Estatal · Paso 2</SectionLabel>
                            <PageTitle>Selecciona la <span className="text-accent-gold">instancia</span></PageTitle>
                            <PageSubtitle>¿En qué instancia se emitirá la sentencia?</PageSubtitle>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6 max-w-xl mx-auto">
                            <button
                                onClick={() => { setInstancia('primera'); setPhase('upload_estatal'); }}
                                className="group relative bg-white rounded-3xl p-8 text-left border border-cream-400 overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-accent-gold/40"
                            >
                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center mb-4">
                                        <span className="font-serif text-xl font-bold text-accent-gold">1ª</span>
                                    </div>
                                    <h3 className="font-serif text-xl font-bold text-charcoal-900 mb-2 group-hover:text-accent-gold transition-colors">
                                        Primera Instancia
                                    </h3>
                                    <p className="text-charcoal-700 text-sm leading-relaxed">
                                        Sentencia definitiva del Juzgado de Primera Instancia
                                    </p>
                                </div>
                            </button>

                            <div className="relative bg-cream-200 rounded-3xl p-8 text-left border border-cream-400 opacity-50 cursor-not-allowed">
                                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-charcoal-900 text-white text-[10px] font-bold tracking-wider uppercase">
                                    Próximamente
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-cream-300 flex items-center justify-center mb-4">
                                    <span className="font-serif text-xl font-bold text-charcoal-700">2ª</span>
                                </div>
                                <h3 className="font-serif text-xl font-bold text-charcoal-700 mb-2">
                                    Segunda Instancia
                                </h3>
                                <p className="text-charcoal-700 text-sm leading-relaxed">
                                    Sentencia de apelación del Tribunal Superior
                                </p>
                            </div>
                        </div>

                        <div className="text-center mt-6">
                            <button onClick={() => { setFuero(null); setPhase('fuero'); }} className="text-accent-brown text-sm font-medium hover:text-accent-gold transition-colors">
                                ← Cambiar fuero
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: FEDERAL TIPO SELECTION (unchanged logic)
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'tipo' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-10">
                            <SectionLabel>Fuero Federal · Estudio de Fondo</SectionLabel>
                            <PageTitle>Selecciona el tipo de <span className="text-accent-gold">asunto</span></PageTitle>
                            <PageSubtitle>El sistema generará el estudio de fondo a partir de los documentos del expediente</PageSubtitle>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {TIPOS.map(tipo => (
                                <button
                                    key={tipo.id}
                                    onClick={() => { setSelectedTipo(tipo); setPhase('upload'); }}
                                    className="group text-left bg-white rounded-2xl p-6 border border-cream-400 hover:border-accent-gold/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-1 group-hover:text-accent-gold transition-colors">
                                        {tipo.label}
                                    </h3>
                                    <p className="text-charcoal-700 text-xs leading-relaxed mb-3">{tipo.description}</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {tipo.docs.map(doc => (
                                            <span key={doc} className="text-[10px] px-2 py-1 rounded-md bg-cream-200 text-accent-brown font-medium">
                                                {doc}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="text-center mt-6">
                            <button onClick={() => { setFuero(null); setPhase('fuero'); }} className="text-accent-brown text-sm font-medium hover:text-accent-gold transition-colors">
                                ← Cambiar fuero
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: FEDERAL UPLOAD
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'upload' && selectedTipo && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <SectionLabel>Fuero Federal · Estudio de Fondo</SectionLabel>
                            <PageTitle>{selectedTipo.label}</PageTitle>
                            <PageSubtitle>Adjunta los 2 documentos del expediente</PageSubtitle>
                        </div>

                        <div className="space-y-4 mb-6">
                            {selectedTipo.docs.map((docLabel, idx) => (
                                <PdfUploadZone
                                    key={docLabel}
                                    label={docLabel}
                                    file={files[idx]}
                                    onSelect={(f) => {
                                        const newFiles = [...files];
                                        newFiles[idx] = f;
                                        setFiles(newFiles);
                                    }}
                                    onClear={() => {
                                        const newFiles = [...files];
                                        newFiles[idx] = null;
                                        setFiles(newFiles);
                                    }}
                                />
                            ))}
                        </div>

                        {/* Instructions textarea */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-charcoal-900 mb-2">
                                Directriz del Secretario <span className="text-charcoal-700 font-normal">(opcional)</span>
                            </label>
                            <textarea
                                value={instrucciones}
                                onChange={e => setInstrucciones(e.target.value)}
                                placeholder="Sentido de la resolución, calificación de los agravios, fundamentos legales, jurisprudencia aplicable..."
                                className="w-full min-h-[100px] p-4 rounded-2xl bg-white border border-cream-400 text-charcoal-900 text-sm leading-relaxed resize-vertical outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all placeholder:text-charcoal-700/40"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setPhase('tipo'); setSelectedTipo(null); setFiles([null, null]); }}
                                className="flex-1 py-3 rounded-full border border-cream-400 text-charcoal-900 font-semibold text-sm hover:border-accent-gold/40 transition-all"
                            >
                                Cambiar tipo
                            </button>
                            <button
                                onClick={handleGenerateFederal}
                                disabled={!allFederalFilesUploaded}
                                className={`flex-[2] py-3 rounded-full font-bold text-sm transition-all ${allFederalFilesUploaded
                                    ? 'bg-charcoal-900 text-white hover:bg-charcoal-800 shadow-lg'
                                    : 'bg-cream-300 text-charcoal-700 cursor-not-allowed'
                                    }`}
                            >
                                Generar Estudio de Fondo
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: STATE UPLOAD — First Instance
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'upload_estatal' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <SectionLabel>Primera Instancia · Estudio de Fondo</SectionLabel>
                            <PageTitle>Documentos del <span className="text-accent-gold">expediente</span></PageTitle>
                            <PageSubtitle>Carga la demanda, las contestaciones y define el sentido de tu resolución</PageSubtitle>

                            <div className="mt-4 p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-xl flex items-center gap-3 max-w-2xl mx-auto shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs text-accent-brown leading-tight text-left">
                                    Entre mejor sea la calidad de tus pdf a cargar, mejor resultado tendrás en su lectura. Asegurate de tener pdf limpios y legibles.
                                </p>
                            </div>
                        </div>

                        {/* ── 1. Demanda ──────────────────────────────────────── */}
                        <div className="mb-8">
                            <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold font-bold text-xs">1</span>
                                Demanda
                            </h3>
                            <PdfUploadZone
                                label="Escrito inicial de demanda"
                                file={demandaFile}
                                onSelect={setDemandaFile}
                                onClear={() => setDemandaFile(null)}
                            />
                        </div>

                        {/* ── 2. Defendants / Contestaciones ─────────────────── */}
                        <div className="mb-8">
                            <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold font-bold text-xs">2</span>
                                Contestaciones
                            </h3>

                            <div className="space-y-4">
                                {defendants.map((def, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl border border-cream-400 p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-accent-brown tracking-wider uppercase">
                                                Demandado {idx + 1}
                                            </span>
                                            {defendants.length > 1 && (
                                                <button
                                                    onClick={() => removeDefendant(idx)}
                                                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            type="text"
                                            value={def.name}
                                            onChange={e => updateDefendant(idx, { name: e.target.value })}
                                            placeholder="Nombre del demandado"
                                            className="w-full px-4 py-2.5 rounded-xl border border-cream-400 text-charcoal-900 text-sm outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all mb-3 placeholder:text-charcoal-700/40"
                                        />

                                        {/* Rebeldía toggle */}
                                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                                            <div
                                                className={`relative w-10 h-5 rounded-full transition-colors ${def.enRebeldia ? 'bg-accent-gold' : 'bg-cream-400'}`}
                                                onClick={() => updateDefendant(idx, { enRebeldia: !def.enRebeldia, file: null })}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${def.enRebeldia ? 'translate-x-5' : ''}`} />
                                            </div>
                                            <span className="text-sm text-charcoal-900 font-medium">
                                                Juicio en rebeldía <span className="text-charcoal-700 font-normal text-xs">(no contestó)</span>
                                            </span>
                                        </label>

                                        {!def.enRebeldia && (
                                            <PdfUploadZone
                                                label="Contestación de demanda"
                                                file={def.file}
                                                onSelect={(f) => updateDefendant(idx, { file: f })}
                                                onClear={() => updateDefendant(idx, { file: null })}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addDefendant}
                                className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-cream-400 text-accent-brown text-sm font-semibold hover:border-accent-gold/40 hover:text-accent-gold hover:bg-cream-50 transition-all"
                            >
                                + Agregar otro demandado
                            </button>
                        </div>

                        {/* ── 3. Secretary decision form ──────────────────────── */}
                        <div className="mb-8">
                            <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold font-bold text-xs">3</span>
                                Decisión del Secretario
                            </h3>

                            <div className="bg-white rounded-2xl border border-cream-400 p-5 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-charcoal-900 mb-2">
                                        Sentido de la resolución y razonamiento
                                        <span className="text-red-400 ml-1">*</span>
                                    </label>
                                    <textarea
                                        value={decisionRazonamiento}
                                        onChange={e => setDecisionRazonamiento(e.target.value)}
                                        placeholder="¿Cuál es el sentido de la resolución? ¿Qué argumentos te persuadieron? ¿Qué excepciones prosperan y cuáles no? Ejemplo: 'La acción procede porque la parte actora acreditó los elementos constitutivos del desahucio conforme al artículo 502 del CPCQ...'"
                                        className="w-full min-h-[120px] p-4 rounded-xl bg-cream-50 border border-cream-400 text-charcoal-900 text-sm leading-relaxed resize-vertical outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all placeholder:text-charcoal-700/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-charcoal-900 mb-2">
                                        Pruebas consideradas
                                        <span className="text-red-400 ml-1">*</span>
                                    </label>
                                    <textarea
                                        value={pruebasConsideradas}
                                        onChange={e => setPruebasConsideradas(e.target.value)}
                                        placeholder="¿Qué pruebas ponderaste y qué valor les otorgaste? Ejemplo: 'Las documentales privadas (contrato de arrendamiento) tienen pleno valor al no haber sido objetadas. La confesional ficta resultó desfavorable al demandado...'"
                                        className="w-full min-h-[120px] p-4 rounded-xl bg-cream-50 border border-cream-400 text-charcoal-900 text-sm leading-relaxed resize-vertical outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all placeholder:text-charcoal-700/30"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── 4. Optional instructions ────────────────────────── */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-charcoal-900 mb-2">
                                Instrucciones adicionales <span className="text-charcoal-700 font-normal">(opcional)</span>
                            </label>
                            <textarea
                                value={instrucciones}
                                onChange={e => setInstrucciones(e.target.value)}
                                placeholder="Jurisprudencia específica a citar, aspectos de estilo, extensión deseada..."
                                className="w-full min-h-[80px] p-4 rounded-2xl bg-white border border-cream-400 text-charcoal-900 text-sm leading-relaxed resize-vertical outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all placeholder:text-charcoal-700/40"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setPhase('instancia'); setDefendants([{ name: '', file: null, enRebeldia: false }]); setDemandaFile(null); }}
                                className="flex-1 py-3 rounded-full border border-cream-400 text-charcoal-900 font-semibold text-sm hover:border-accent-gold/40 transition-all"
                            >
                                ← Atrás
                            </button>
                            <button
                                onClick={handleGenerateEstatal}
                                disabled={!statalReady}
                                className={`flex-[2] py-3 rounded-full font-bold text-sm transition-all ${statalReady
                                    ? 'bg-charcoal-900 text-white hover:bg-charcoal-800 shadow-lg'
                                    : 'bg-cream-300 text-charcoal-700 cursor-not-allowed'
                                    }`}
                            >
                                Generar Estudio de Fondo
                            </button>
                        </div>

                        <p className="text-center text-charcoal-700 text-xs mt-4">
                            El sistema leerá los documentos y generará el estudio de fondo con al menos 3 pasadas de análisis
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: GENERATING (streaming live text)
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'generating' && (
                    <div className="animate-fade-in">
                        {!generatedText && (
                            <div className="text-center py-16">
                                <div className="w-14 h-14 mx-auto mb-6 border-3 border-cream-400 border-t-accent-gold rounded-full animate-spin" style={{ borderWidth: '3px' }} />
                                <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-2">
                                    Generando...
                                </h3>
                                <p className="text-accent-brown text-sm animate-pulse">
                                    {LOADER_MESSAGES[loaderIdx]}
                                </p>
                            </div>
                        )}

                        {generatedText && (
                            <div className="bg-white rounded-3xl border border-cream-400 p-6 sm:p-8 shadow-sm">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-cream-300">
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent-gold animate-pulse" />
                                    <span className="text-accent-gold text-xs font-bold tracking-wider uppercase">
                                        Redactando en vivo — {fuero === 'estatal' ? 'Primera Instancia' : selectedTipo?.label}
                                    </span>
                                </div>

                                <div className="max-h-[60vh] overflow-y-auto pr-2">
                                    {renderText(generatedText)}
                                    <div ref={textEndRef} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    PHASE: RESULT
                ═══════════════════════════════════════════════════════════ */}
                {phase === 'result' && (
                    <div ref={resultRef} className="animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <PageTitle>Estudio de Fondo <span className="text-accent-gold">Generado</span></PageTitle>
                            <p className="text-charcoal-700 text-sm">
                                {fuero === 'estatal' ? 'Primera Instancia' : selectedTipo?.label} · {generatedText.length.toLocaleString()} caracteres
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-center mb-6">
                            <button
                                onClick={handleCopy}
                                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${copied
                                    ? 'bg-green-50 border border-green-300 text-green-600'
                                    : 'bg-charcoal-900 text-white hover:bg-charcoal-800 shadow-lg'
                                    }`}
                            >
                                {copied ? '✓ Copiado' : 'Copiar texto'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-6 py-2.5 rounded-full border border-cream-400 text-charcoal-900 text-sm font-semibold hover:border-accent-gold/40 transition-all"
                            >
                                Nuevo expediente
                            </button>
                        </div>

                        {/* Generated text */}
                        <div className="bg-white rounded-3xl border border-cream-400 p-6 sm:p-8 shadow-sm">
                            {renderText(generatedText)}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
