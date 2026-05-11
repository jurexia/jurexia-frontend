'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2, Loader2, Download, Copy, FileText, Shield } from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

const TIPOS_ASUNTO = [
    { id: 'amparo_directo', label: 'Amparo Directo', docs: ['Acto Reclamado (sentencia impugnada)', 'Conceptos de Violación'] },
    { id: 'amparo_revision', label: 'Amparo en Revisión', docs: ['Sentencia Recurrida', 'Agravios'] },
    { id: 'revision_fiscal', label: 'Revisión Fiscal', docs: ['Sentencia del TFJA', 'Agravios'] },
    { id: 'recurso_queja', label: 'Recurso de Queja', docs: ['Determinación Recurrida', 'Agravios'] },
];

const MATERIAS = [
    { id: 'civil', label: 'Civil' },
    { id: 'penal', label: 'Penal' },
    { id: 'administrativa', label: 'Administrativa' },
    { id: 'laboral', label: 'Laboral' },
    { id: 'familiar', label: 'Familiar' },
    { id: 'mercantil', label: 'Mercantil' },
];

// Circuitos 1–32
const CIRCUITOS = Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    label: `${i + 1}° Circuito`,
}));

// Circuitos que tienen datos ingestados en Qdrant
const CIRCUITOS_DISPONIBLES = [1, 2, 3, 4, 6, 16, 22];

const PIPELINE_PHASES = [
    { label: 'Análisis cognitivo', detail: 'Identificando problemas jurídicos...' },
    { label: 'Búsqueda RAG', detail: 'Recuperando precedentes y normas...' },
    { label: 'Plan de redacción', detail: 'Estructurando el estudio...' },
    { label: 'Redacción del estudio', detail: 'Generando el borrador de estudio de fondo...' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function TccBetaPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    // ── Auth + access ──
    const canAccess = isAdmin(user?.email); // BETA: solo admin para pruebas

    // ── Form state ──
    const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
    const [tipoAsunto, setTipoAsunto] = useState(TIPOS_ASUNTO[0].id);
    const [materia, setMateria] = useState('civil');
    const [circuito, setCircuito] = useState<number>(1);
    const [fileActo, setFileActo] = useState<File | null>(null);
    const [fileConceptos, setFileConceptos] = useState<File | null>(null);

    // ── Pipeline state ──
    const [phase, setPhase] = useState<'form' | 'generating' | 'result' | 'error'>('form');
    const [currentStep, setCurrentStep] = useState(0);
    const [stepStats, setStepStats] = useState<Record<number, { elapsed_s?: number; detail?: string }>>({});
    const [resultMarkdown, setResultMarkdown] = useState('');
    const [resultStats, setResultStats] = useState<any>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const resultRef = useRef<HTMLDivElement>(null);

    // ── Auth guard ──
    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    if (authLoading) return null;

    if (!canAccess) {
        return (
            <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
                <div className="max-w-md text-center bg-white rounded-3xl p-10 shadow-xl border border-cream-400">
                    <div className="w-16 h-16 rounded-2xl bg-charcoal-900 flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-8 h-8 text-accent-gold" />
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-charcoal-900 mb-3">Función exclusiva Platinum</h2>
                    <p className="text-charcoal-700 text-sm leading-relaxed mb-6">
                        El Redactor TCC Beta está disponible exclusivamente para usuarios del plan <strong>Platinum</strong>.
                        Genera borradores de estudio de fondo con IA de razonamiento profundo.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link href="/precios" className="w-full py-3 rounded-xl text-center text-sm font-bold text-charcoal-900 hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)' }}>
                            Ver plan Platinum
                        </Link>
                        <button onClick={() => router.push('/chat')} className="text-charcoal-700 text-sm hover:text-charcoal-900 transition-colors">
                            ← Volver al chat
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const selectedTipo = TIPOS_ASUNTO.find(t => t.id === tipoAsunto) || TIPOS_ASUNTO[0];
    const isCircuitoDisponible = CIRCUITOS_DISPONIBLES.includes(circuito);
    const allReady = fileActo !== null && fileConceptos !== null && acceptedDisclaimer;

    // ── Generate ──
    const handleGenerate = async () => {
        if (!allReady || !user?.email) return;
        setPhase('generating');
        setCurrentStep(0);
        setStepStats({});
        setResultMarkdown('');
        setError('');

        const formData = new FormData();
        formData.append('user_email', user.email);
        formData.append('tipo_asunto', tipoAsunto);
        formData.append('materia', materia);
        formData.append('circuito', String(circuito));
        formData.append('doc_acto', fileActo!);
        formData.append('doc_conceptos', fileConceptos!);

        try {
            const res = await fetch(`${API_URL}/redactor/tcc-beta/generate`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errData.detail || `Error ${res.status}`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No se pudo iniciar el streaming');
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        // Parse SSE event
                        const eventType = line.slice(7).trim();
                        continue;
                    }
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.step !== undefined && data.progress !== undefined) {
                                // Phase update
                                setCurrentStep(data.step);
                                setStepStats(prev => ({
                                    ...prev,
                                    [data.step]: { detail: data.detail || '' },
                                }));
                            }

                            if (data.pass !== undefined && data.elapsed_s !== undefined) {
                                // Pass complete
                                setStepStats(prev => ({
                                    ...prev,
                                    [data.pass]: {
                                        ...prev[data.pass],
                                        elapsed_s: data.elapsed_s,
                                        detail: data.n_problemas ? `${data.n_problemas} problemas` :
                                            data.n_tesis ? `${data.n_tesis} tesis` :
                                                data.n_palabras ? `${data.n_palabras} palabras` : '',
                                    },
                                }));
                            }

                            if (data.estudio_markdown) {
                                setResultMarkdown(data.estudio_markdown);
                                setResultStats(data);
                                setPhase('result');
                                setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
                            }

                            if (data.message && !data.estudio_markdown) {
                                // Error event
                                throw new Error(data.message);
                            }
                        } catch (e: any) {
                            if (e.message && !e.message.includes('JSON')) {
                                setError(e.message);
                                setPhase('error');
                            }
                        }
                    }
                }
            }

            // If we never got a result
            if (phase === 'generating' && !resultMarkdown) {
                setPhase('result');
            }
        } catch (err: any) {
            setError(err.message || 'Error al conectar con el servidor');
            setPhase('error');
        }
    };

    // ── DOCX Export ──
    const handleExportDocx = async () => {
        if (!resultMarkdown || !user?.email) return;
        setDownloading(true);
        try {
            const formData = new FormData();
            formData.append('user_email', user.email);
            formData.append('estudio_markdown', resultMarkdown);
            formData.append('tipo_asunto', tipoAsunto);
            formData.append('materia', materia);
            formData.append('circuito', String(circuito));

            const res = await fetch(`${API_URL}/redactor/tcc-beta/export-docx`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Error al generar DOCX');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estudio_fondo_${tipoAsunto}_${materia}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || 'Error al descargar DOCX');
        } finally {
            setDownloading(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(resultMarkdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setPhase('form');
        setFileActo(null);
        setFileConceptos(null);
        setResultMarkdown('');
        setError('');
        setCurrentStep(0);
        setStepStats({});
    };

    // ── Render helpers ──
    const PdfUploadZone = ({ label, file, onSelect, onClear }: {
        label: string; file: File | null;
        onSelect: (f: File) => void; onClear: () => void;
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
                input.accept = '.pdf,.docx';
                input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) onSelect(f);
                };
                input.click();
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) onSelect(f);
            }}
        >
            {file ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-accent-gold" />
                        </div>
                        <div>
                            <p className="text-charcoal-900 text-sm font-semibold">{file.name}</p>
                            <p className="text-charcoal-700 text-xs">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="w-8 h-8 rounded-full bg-cream-300 hover:bg-red-50 flex items-center justify-center text-charcoal-700 hover:text-red-500 transition-colors"
                    >×</button>
                </div>
            ) : (
                <div className="text-center py-3">
                    <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent-gold/10 transition-colors">
                        <Upload className="w-6 h-6 text-accent-brown group-hover:text-accent-gold transition-colors" />
                    </div>
                    <p className="text-accent-gold font-semibold text-sm">{label}</p>
                    <p className="text-charcoal-700 text-xs mt-1">Clic o arrastra un PDF/DOCX aquí</p>
                </div>
            )}
        </div>
    );

    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            const t = line.trim();
            if (t.startsWith('## ') || t.startsWith('# '))
                return <h3 key={i} className="font-serif text-lg font-bold text-accent-gold mt-6 mb-2 tracking-wide">{t.replace(/^#+\s*/, '')}</h3>;
            if (t.startsWith('### '))
                return <h4 key={i} className="font-serif text-base font-bold text-charcoal-900 mt-4 mb-1">{t.replace(/^#+\s*/, '')}</h4>;
            if (t.startsWith('> '))
                return <blockquote key={i} className="border-l-3 border-accent-gold/30 pl-4 italic text-charcoal-700 text-sm my-2 leading-relaxed">{t.slice(2)}</blockquote>;
            if (t.startsWith('**') && t.endsWith('**'))
                return <p key={i} className="font-semibold text-charcoal-900 mt-4 mb-1">{t.replace(/\*\*/g, '')}</p>;
            if (!t) return <br key={i} />;
            const parts = t.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} className="text-charcoal-700 leading-relaxed mb-1 text-justify">
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**'))
                            return <strong key={j} className="text-charcoal-900">{part.slice(2, -2)}</strong>;
                        return <span key={j}>{part}</span>;
                    })}
                </p>
            );
        });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-cream-100">
            {/* Header */}
            <header className="bg-charcoal-900 border-b border-accent-gold/10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-xl font-bold text-white tracking-wide">
                            Redactor <span className="text-accent-gold">TCC Beta</span>
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Pipeline v3 · Estudio de Fondo con IA de razonamiento profundo
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/chat')}
                        className="px-4 py-2 rounded-full border border-accent-gold/30 text-accent-gold text-sm font-medium hover:bg-accent-gold/10 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver al chat
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* ═══════════ DISCLAIMER ═══════════ */}
                {!acceptedDisclaimer && phase === 'form' && (
                    <div className="animate-fade-in">
                        <div className="bg-white rounded-3xl border border-cream-400 shadow-lg overflow-hidden">
                            {/* Gold top bar */}
                            <div className="h-1" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />

                            <div className="p-8 sm:p-10">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-accent-gold/20 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-6 h-6 text-accent-gold" />
                                    </div>
                                    <div>
                                        <h2 className="font-serif text-2xl font-bold text-charcoal-900 mb-1">
                                            Aviso importante
                                        </h2>
                                        <p className="text-xs font-bold tracking-[0.15em] text-accent-gold uppercase">
                                            Versión Beta · Uso responsable de IA
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 text-charcoal-700 text-sm leading-relaxed">
                                    <p>
                                        El <strong className="text-charcoal-900">Redactor TCC Beta</strong> es una herramienta de inteligencia artificial en fase de desarrollo que
                                        genera un <strong className="text-charcoal-900">borrador de estudio de fondo</strong> a
                                        partir de los documentos del expediente. Como toda herramienta en versión beta,
                                        <strong className="text-charcoal-900"> es susceptible de cometer errores</strong>.
                                    </p>

                                    <div className="bg-amber-50/60 border border-accent-gold/15 rounded-xl p-4">
                                        <p className="font-semibold text-charcoal-900 mb-2">
                                            🏛️ Responsabilidad del Secretario
                                        </p>
                                        <p>
                                            Como Secretario de Acuerdos, <strong className="text-charcoal-900">es su responsabilidad la revisión exhaustiva del expediente</strong>.
                                            El borrador generado deberá pasar por una <strong className="text-charcoal-900">revisión rigurosa</strong> antes
                                            de ser utilizado en cualquier función pública. Iurexia no se hace responsable del contenido
                                            final que se incorpore a una resolución judicial.
                                        </p>
                                    </div>

                                    <p>
                                        Iurexia apela al <strong className="text-charcoal-900">uso responsable de la inteligencia artificial</strong> y
                                        cree firmemente que la IA <strong className="text-charcoal-900">no reemplazará la labor del secretario</strong>,
                                        solo la hará más eficiente. El objetivo de esta herramienta es asistir en la
                                        estructuración del análisis jurídico, nunca sustituir el criterio profesional del juzgador.
                                    </p>
                                </div>

                                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setAcceptedDisclaimer(true)}
                                        className="flex-[2] py-3.5 rounded-xl font-bold text-sm text-white bg-charcoal-900 hover:bg-black transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
                                    >
                                        Acepto y comprendo · Continuar
                                    </button>
                                    <button
                                        onClick={() => router.push('/chat')}
                                        className="flex-1 py-3 rounded-xl border border-cream-400 text-charcoal-700 font-semibold text-sm hover:border-accent-gold/40 transition-all"
                                    >
                                        Volver al chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════ FORM ═══════════ */}
                {acceptedDisclaimer && phase === 'form' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <p className="text-xs font-bold tracking-[0.2em] uppercase text-accent-brown mb-2">Redactor TCC Beta</p>
                            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mb-2">
                                Genera un <span className="text-accent-gold">Estudio de Fondo</span>
                            </h2>
                            <p className="text-charcoal-700 text-base">
                                Sube los documentos del expediente y el pipeline generará un borrador estructurado.
                            </p>
                        </div>

                        {/* Config row */}
                        <div className="grid sm:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-charcoal-900 mb-1.5">Tipo de asunto</label>
                                <select
                                    value={tipoAsunto}
                                    onChange={e => setTipoAsunto(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-cream-400 text-charcoal-900 text-sm bg-white focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 outline-none transition-all"
                                >
                                    {TIPOS_ASUNTO.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-charcoal-900 mb-1.5">Materia</label>
                                <select
                                    value={materia}
                                    onChange={e => setMateria(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-cream-400 text-charcoal-900 text-sm bg-white focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 outline-none transition-all"
                                >
                                    {MATERIAS.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-charcoal-900 mb-1.5">Circuito</label>
                                <select
                                    value={circuito}
                                    onChange={e => setCircuito(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-cream-400 text-charcoal-900 text-sm bg-white focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 outline-none transition-all"
                                >
                                    {CIRCUITOS.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.label}{!CIRCUITOS_DISPONIBLES.includes(c.id) ? ' ⚠️' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Circuit warning */}
                        {!isCircuitoDisponible && (
                            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-amber-800 text-xs leading-relaxed">
                                    <strong>Nota:</strong> El {circuito}° Circuito aún no tiene precedentes ingestados en Iurexia.
                                    El borrador no estará respaldado con precedentes de su circuito, pero sí con tesis de la SCJN
                                    y legislación federal. Se recomienda complementar manualmente las citas de TCC locales.
                                </p>
                            </div>
                        )}

                        {/* Upload zones */}
                        <div className="space-y-4 mb-6">
                            <PdfUploadZone
                                label={selectedTipo.docs[0]}
                                file={fileActo}
                                onSelect={setFileActo}
                                onClear={() => setFileActo(null)}
                            />
                            <PdfUploadZone
                                label={selectedTipo.docs[1]}
                                file={fileConceptos}
                                onSelect={setFileConceptos}
                                onClear={() => setFileConceptos(null)}
                            />
                        </div>

                        {/* Quality tip */}
                        <div className="mb-6 p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-accent-gold" />
                            </div>
                            <p className="text-xs text-accent-brown leading-tight">
                                La calidad del resultado depende de la calidad de los PDFs. Asegúrate de que los documentos sean legibles y tengan texto seleccionable.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={!allReady}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${allReady
                                ? 'bg-charcoal-900 text-white hover:bg-black shadow-lg hover:shadow-xl'
                                : 'bg-cream-300 text-charcoal-700 cursor-not-allowed'
                                }`}
                        >
                            Generar Estudio de Fondo
                        </button>
                    </div>
                )}

                {/* ═══════════ GENERATING ═══════════ */}
                {phase === 'generating' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <p className="text-xs font-bold tracking-[0.2em] uppercase text-accent-gold mb-2">
                                {selectedTipo.label} · {materia}
                            </p>
                            <h2 className="font-serif text-2xl font-bold text-charcoal-900 mb-1">
                                Generando estudio de fondo...
                            </h2>
                            <p className="text-charcoal-700 text-sm">
                                Este proceso toma entre 3 y 15 minutos. No cierres esta pestaña.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-cream-400 p-6 space-y-4">
                            {PIPELINE_PHASES.map((p, i) => {
                                const stats = stepStats[i];
                                const isActive = i === currentStep;
                                const isDone = stats?.elapsed_s !== undefined;
                                const isPending = i > currentStep;

                                return (
                                    <div key={i} className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-300 ${isActive ? 'bg-accent-gold/5 border border-accent-gold/20' : isDone ? 'bg-green-50/50' : 'opacity-40'}`}>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                            {isDone ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            ) : isActive ? (
                                                <Loader2 className="w-5 h-5 text-accent-gold animate-spin" />
                                            ) : (
                                                <span className="w-5 h-5 rounded-full border-2 border-cream-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${isDone ? 'text-green-800' : isActive ? 'text-charcoal-900' : 'text-charcoal-700'}`}>
                                                {p.label}
                                            </p>
                                            <p className="text-xs text-charcoal-700 truncate">
                                                {isDone ? (stats.detail || 'Completado') : isActive ? p.detail : ''}
                                            </p>
                                        </div>
                                        {isDone && stats.elapsed_s !== undefined && (
                                            <span className="text-xs text-green-700 font-medium flex-shrink-0 tabular-nums">
                                                {Math.round(stats.elapsed_s)}s
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══════════ RESULT ═══════════ */}
                {phase === 'result' && resultMarkdown && (
                    <div className="animate-fade-in" ref={resultRef}>
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full mb-3">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-bold text-green-800">
                                    Estudio generado
                                    {resultStats?.n_palabras && ` · ${resultStats.n_palabras.toLocaleString()} palabras`}
                                    {resultStats?.total_elapsed_s && ` · ${Math.round(resultStats.total_elapsed_s / 60)} min`}
                                </span>
                            </div>
                            <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                                Borrador de Estudio de Fondo
                            </h2>
                        </div>

                        {/* Action bar */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={handleExportDocx}
                                disabled={downloading}
                                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-charcoal-900 hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {downloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Descargar DOCX (Formato PJF)
                            </button>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-3 rounded-xl border border-cream-400 text-charcoal-900 font-semibold text-sm hover:border-accent-gold/40 transition-all flex items-center gap-2"
                            >
                                <Copy className="w-4 h-4" />
                                {copied ? '¡Copiado!' : 'Copiar'}
                            </button>
                        </div>

                        {/* Reminder bar */}
                        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-800 text-xs leading-relaxed">
                                <strong>Recuerde:</strong> Este es un borrador generado por IA. Debe ser revisado exhaustivamente
                                antes de incorporarlo a cualquier resolución judicial.
                            </p>
                        </div>

                        {/* Content viewer */}
                        <div className="bg-white rounded-2xl border border-cream-400 p-6 sm:p-8 prose-sm max-w-none shadow-sm">
                            {renderMarkdown(resultMarkdown)}
                        </div>

                        {/* Bottom actions */}
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleReset}
                                className="flex-1 py-3 rounded-xl border border-cream-400 text-charcoal-900 font-semibold text-sm hover:border-accent-gold/40 transition-all"
                            >
                                Nuevo estudio
                            </button>
                            <button
                                onClick={() => router.push('/chat')}
                                className="flex-1 py-3 rounded-xl bg-cream-200 text-charcoal-700 font-semibold text-sm hover:bg-cream-300 transition-all"
                            >
                                Volver al chat
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════ ERROR ═══════════ */}
                {phase === 'error' && (
                    <div className="animate-fade-in text-center">
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="font-serif text-lg font-bold text-red-900 mb-2">Error en el pipeline</h3>
                            <p className="text-red-700 text-sm leading-relaxed mb-6">{error}</p>
                            <button
                                onClick={handleReset}
                                className="px-6 py-2.5 rounded-xl bg-charcoal-900 text-white font-bold text-sm hover:bg-black transition-all"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
