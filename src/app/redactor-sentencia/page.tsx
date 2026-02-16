'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Gavel, Scale, Shield, AlertTriangle, Loader2, Copy, Download, ArrowLeft, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/useAuth';
import { UserAvatar } from '@/components/UserAvatar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Iurexia-api.onrender.com';

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════════

type TipoSentencia = 'amparo_directo' | 'amparo_revision' | 'revision_fiscal' | 'recurso_queja';

interface TipoConfig {
    id: TipoSentencia;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ReactNode;
    docs: [string, string, string]; // Labels for the 3 required documents
    color: string; // accent color class
}

const TIPOS: TipoConfig[] = [
    {
        id: 'amparo_directo',
        label: 'Amparo Directo',
        shortLabel: 'Directo',
        description: 'Contra sentencias definitivas o laudos de tribunales ordinarios',
        icon: <Gavel className="w-6 h-6" />,
        docs: ['Demanda de Amparo', 'Acto Reclamado', 'Auto de Trámite'],
        color: 'from-amber-500/20 to-amber-600/5',
    },
    {
        id: 'amparo_revision',
        label: 'Amparo en Revisión',
        shortLabel: 'Revisión',
        description: 'Recurso contra sentencias de Juzgado de Distrito en amparo indirecto',
        icon: <Scale className="w-6 h-6" />,
        docs: ['Recurso de Revisión', 'Sentencia Recurrida', 'Auto de Trámite'],
        color: 'from-blue-500/20 to-blue-600/5',
    },
    {
        id: 'revision_fiscal',
        label: 'Revisión Fiscal',
        shortLabel: 'R. Fiscal',
        description: 'Recurso contra sentencias del TFJA en materia fiscal/administrativa',
        icon: <Shield className="w-6 h-6" />,
        docs: ['Recurso de Revisión Fiscal', 'Sentencia Recurrida', 'Auto de Trámite'],
        color: 'from-emerald-500/20 to-emerald-600/5',
    },
    {
        id: 'recurso_queja',
        label: 'Recurso de Queja',
        shortLabel: 'Queja',
        description: 'Recurso contra autos o resoluciones que no admiten apelación',
        icon: <AlertTriangle className="w-6 h-6" />,
        docs: ['Recurso de Queja', 'Determinación Recurrida', 'Admisión del Recurso'],
        color: 'from-purple-500/20 to-purple-600/5',
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function DocumentDropZone({
    label,
    index,
    file,
    onFile,
    onRemove,
}: {
    label: string;
    index: number;
    file: File | null;
    onFile: (f: File) => void;
    onRemove: () => void;
}) {
    const [dragActive, setDragActive] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            const f = e.dataTransfer.files[0];
            if (f && f.type === 'application/pdf') onFile(f);
        },
        [onFile]
    );

    return (
        <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${dragActive
                ? 'border-amber-500/60 bg-amber-500/5'
                : file
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
        >
            {file ? (
                <div className="flex items-center gap-4 p-5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{file.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB • PDF
                        </p>
                    </div>
                    <button
                        onClick={onRemove}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4 text-white/40" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center gap-3 p-6 cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white/30" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-white/60 mb-0.5">
                            <span className="text-amber-500 font-medium">Doc {index + 1}</span> — {label}
                        </p>
                        <p className="text-xs text-white/30">Arrastra o selecciona PDF (máx 50MB)</p>
                    </div>
                    <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onFile(f);
                        }}
                    />
                </label>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Progress Steps
// ═══════════════════════════════════════════════════════════════════════════════

const PROGRESS_STEPS = [
    { label: 'Leyendo documentos del expediente...', emoji: '📄' },
    { label: 'Analizando conceptos de violación...', emoji: '🔍' },
    { label: 'Investigando jurisprudencia aplicable...', emoji: '⚖️' },
    { label: 'Construyendo estructura de la sentencia...', emoji: '🏛️' },
    { label: 'Redactando considerandos...', emoji: '✍️' },
    { label: 'Verificando fundamentación legal...', emoji: '📋' },
    { label: 'Finalizando proyecto de sentencia...', emoji: '✅' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function RedactorSentenciaPage() {
    const { user, loading: authLoading } = useRequireAuth();

    // State Machine: 'select' → 'upload' → 'generating' → 'result'
    const [phase, setPhase] = useState<'select' | 'upload' | 'generating' | 'result'>('select');
    const [selectedTipo, setSelectedTipo] = useState<TipoConfig | null>(null);
    const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [progressStep, setProgressStep] = useState(0);
    const [tokensInfo, setTokensInfo] = useState<{ input: number; output: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    // ── DOCX Metadata ─────────────────────────────────────────────────────
    const [metaExpediente, setMetaExpediente] = useState('');
    const [metaMateria, setMetaMateria] = useState('CIVIL');
    const [metaQuejoso, setMetaQuejoso] = useState('');
    const [metaMagistrado, setMetaMagistrado] = useState('');
    const [metaSecretario, setMetaSecretario] = useState('');

    const allFilesUploaded = files.every((f) => f !== null);

    // ── Select Type ───────────────────────────────────────────────────────
    const handleSelectTipo = (tipo: TipoConfig) => {
        setSelectedTipo(tipo);
        setFiles([null, null, null]);
        setError('');
        setResult('');
        setPhase('upload');
    };

    // ── Generate ──────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!selectedTipo || !allFilesUploaded || !user?.email) return;

        setPhase('generating');
        setError('');
        setProgressStep(0);

        // Animate progress steps
        const interval = setInterval(() => {
            setProgressStep((prev) => {
                if (prev >= PROGRESS_STEPS.length - 1) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 8000); // ~8s per step for a ~60s total generation time

        try {
            const formData = new FormData();
            formData.append('tipo', selectedTipo.id);
            formData.append('user_email', user.email);
            formData.append('doc1', files[0]!);
            formData.append('doc2', files[1]!);
            formData.append('doc3', files[2]!);

            const response = await fetch(`${API_URL}/draft-sentencia`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            const data = await response.json();
            setResult(data.sentencia_text);
            if (data.tokens_input && data.tokens_output) {
                setTokensInfo({ input: data.tokens_input, output: data.tokens_output });
            }
            setPhase('result');
        } catch (err: any) {
            clearInterval(interval);
            setError(err.message || 'Error al generar la sentencia');
            setPhase('upload');
        }
    };

    // ── Copy to Clipboard ─────────────────────────────────────────────────
    const handleCopy = async () => {
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Download as DOCX (official TCC format with seals) ─────────────────
    const handleDownloadDocx = async () => {
        if (!result || exportLoading) return;
        setExportLoading(true);
        try {
            const res = await fetch(`${API_URL}/export-sentencia-docx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sentencia_text: result,
                    tipo: selectedTipo?.id || 'amparo_directo',
                    numero_expediente: metaExpediente,
                    materia: metaMateria,
                    quejoso: metaQuejoso,
                    magistrado: metaMagistrado,
                    secretario: metaSecretario,
                    user_email: user?.email || '',
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Error al exportar' }));
                throw new Error(err.detail || 'Error al exportar DOCX');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const disposition = res.headers.get('Content-Disposition');
            const filename = disposition?.match(/filename="(.+)"/)?.[1]
                || `Sentencia_${selectedTipo?.id || 'TCC'}_${metaExpediente || 'borrador'}.docx`;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || 'Error al descargar DOCX');
        } finally {
            setExportLoading(false);
        }
    };

    // ── Download as TXT (fallback) ────────────────────────────────────────
    const handleDownloadTxt = () => {
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Proyecto_Sentencia_${selectedTipo?.shortLabel || 'TCC'}_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Reset ─────────────────────────────────────────────────────────────
    const handleReset = () => {
        setPhase('select');
        setSelectedTipo(null);
        setFiles([null, null, null]);
        setResult('');
        setError('');
        setTokensInfo(null);
    };

    // ── Auth Loading ──────────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white/90">
            {/* ═══ Top Bar ═══ */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                        <Link href="/chat" className="flex items-center gap-2 group">
                            <span className="font-serif text-xl font-semibold text-white">
                                Iurex<span className="text-amber-500">ia</span>
                            </span>
                        </Link>
                        <div className="h-5 w-px bg-white/10" />
                        <span className="text-xs text-white/40 tracking-wider uppercase font-medium">
                            Redactor de Sentencias
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/chat" className="text-sm text-white/40 hover:text-white/70 transition-colors">
                            ← Chat
                        </Link>
                        <UserAvatar />
                    </div>
                </div>
            </div>

            {/* ═══ Main Content ═══ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 1: SELECT TYPE                                       */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'select' && (
                    <div className="max-w-4xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-full text-sm font-medium mb-5">
                                <Gavel className="w-4 h-4" />
                                Tribunal Colegiado de Circuito
                            </div>
                            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-4">
                                Redactor de Sentencias
                            </h1>
                            <p className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
                                Genera proyectos de sentencia completos con la potencia de Gemini 2.5 Pro.
                                Sube los expedientes y la IA construirá el proyecto desde cero.
                            </p>
                        </div>

                        {/* Type Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {TIPOS.map((tipo) => (
                                <button
                                    key={tipo.id}
                                    onClick={() => handleSelectTipo(tipo)}
                                    className={`group relative rounded-2xl border border-white/[0.08] bg-gradient-to-br ${tipo.color} p-6 text-left transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/5`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                            {tipo.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-serif text-lg font-medium text-white mb-1">
                                                {tipo.label}
                                            </h3>
                                            <p className="text-sm text-white/40 leading-relaxed">
                                                {tipo.description}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Bottom doc preview */}
                                    <div className="flex gap-2 mt-4 pl-16">
                                        {tipo.docs.map((doc, i) => (
                                            <span
                                                key={i}
                                                className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/30 truncate"
                                            >
                                                {doc}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Admin note */}
                        <p className="text-center text-xs text-white/20 mt-8">
                            Función exclusiva para administradores • Powered by Gemini 2.5 Pro
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 2: UPLOAD DOCUMENTS                                  */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'upload' && selectedTipo && (
                    <div className="max-w-3xl mx-auto">
                        {/* Back button */}
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
                        >
                            <ArrowLeft className="w-4 h-4" /> Cambiar tipo
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                                {selectedTipo.icon}
                            </div>
                            <div>
                                <h2 className="font-serif text-2xl font-medium text-white">
                                    {selectedTipo.label}
                                </h2>
                                <p className="text-sm text-white/40 mt-0.5">
                                    Adjunta los 3 documentos del expediente
                                </p>
                            </div>
                        </div>

                        {/* Document Upload Zones */}
                        <div className="space-y-4 mb-8">
                            {selectedTipo.docs.map((docLabel, i) => (
                                <DocumentDropZone
                                    key={i}
                                    label={docLabel}
                                    index={i}
                                    file={files[i]}
                                    onFile={(f) => {
                                        const newFiles = [...files];
                                        newFiles[i] = f;
                                        setFiles(newFiles);
                                    }}
                                    onRemove={() => {
                                        const newFiles = [...files];
                                        newFiles[i] = null;
                                        setFiles(newFiles);
                                    }}
                                />
                            ))}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={!allFilesUploaded}
                            className={`w-full py-4 rounded-2xl text-base font-medium transition-all duration-300 ${allFilesUploaded
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-500/20'
                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Gavel className="w-5 h-5" />
                                Generar Proyecto de Sentencia
                            </span>
                        </button>

                        <p className="text-center text-xs text-white/20 mt-4">
                            El proceso puede tomar entre 1 y 3 minutos dependiendo de la extensión de los documentos
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 3: GENERATING                                        */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'generating' && (
                    <div className="max-w-2xl mx-auto text-center py-16">
                        {/* Animated gavel */}
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-amber-500/5 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Gavel className="w-10 h-10 text-amber-500 animate-pulse" />
                            </div>
                        </div>

                        <h2 className="font-serif text-2xl font-medium text-white mb-2">
                            Redactando proyecto de sentencia...
                        </h2>
                        <p className="text-sm text-white/40 mb-10">
                            Gemini 2.5 Pro está analizando los documentos
                        </p>

                        {/* Progress Steps */}
                        <div className="space-y-3 text-left max-w-sm mx-auto">
                            {PROGRESS_STEPS.map((step, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 transition-all duration-500 ${i < progressStep
                                        ? 'opacity-100'
                                        : i === progressStep
                                            ? 'opacity-100'
                                            : 'opacity-20'
                                        }`}
                                >
                                    {i < progressStep ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    ) : i === progressStep ? (
                                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin flex-shrink-0" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm ${i <= progressStep ? 'text-white/70' : 'text-white/30'
                                        }`}>
                                        {step.emoji} {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 4: RESULT                                            */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'result' && (
                    <div className="max-w-4xl mx-auto">
                        {/* Top bar */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Nueva redacción
                            </button>
                            <div className="flex items-center gap-3">
                                {tokensInfo && (
                                    <span className="text-xs text-white/20">
                                        {tokensInfo.input.toLocaleString()} → {tokensInfo.output.toLocaleString()} tokens
                                    </span>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/60 hover:text-white/90 transition-all"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copiar
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleDownloadTxt}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/40 hover:text-white/60 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    TXT
                                </button>
                            </div>
                        </div>

                        {/* Success badge */}
                        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-6">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <div>
                                <p className="text-sm font-medium text-emerald-300">
                                    Proyecto de Sentencia generado — {selectedTipo?.label}
                                </p>
                                <p className="text-xs text-white/30 mt-0.5">
                                    {result.length.toLocaleString()} caracteres • Revisa y ajusta antes de presentar
                                </p>
                            </div>
                        </div>

                        {/* ── DOCX Export Panel ── */}
                        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white/90">Exportar con Formato Oficial TCC</h3>
                                    <p className="text-xs text-white/40">DOCX con sellos, membrete y formato del tribunal</p>
                                </div>
                            </div>

                            {/* Metadata grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">Nº Expediente</label>
                                    <input
                                        type="text"
                                        value={metaExpediente}
                                        onChange={e => setMetaExpediente(e.target.value)}
                                        placeholder="365/2024"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">Materia</label>
                                    <select
                                        value={metaMateria}
                                        onChange={e => setMetaMateria(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-amber-500/40 transition-colors"
                                    >
                                        <option value="CIVIL">Civil</option>
                                        <option value="PENAL">Penal</option>
                                        <option value="ADMINISTRATIVA">Administrativa</option>
                                        <option value="LABORAL">Laboral</option>
                                        <option value="FISCAL">Fiscal</option>
                                        <option value="MERCANTIL">Mercantil</option>
                                        <option value="FAMILIAR">Familiar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">Quejoso(a)</label>
                                    <input
                                        type="text"
                                        value={metaQuejoso}
                                        onChange={e => setMetaQuejoso(e.target.value)}
                                        placeholder="Nombre del quejoso"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">Magistrado Ponente</label>
                                    <input
                                        type="text"
                                        value={metaMagistrado}
                                        onChange={e => setMetaMagistrado(e.target.value)}
                                        placeholder="Nombre del magistrado"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-white/40 mb-1">Secretario</label>
                                    <input
                                        type="text"
                                        value={metaSecretario}
                                        onChange={e => setMetaSecretario(e.target.value)}
                                        placeholder="Nombre del secretario"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* DOCX Download button */}
                            <button
                                onClick={handleDownloadDocx}
                                disabled={exportLoading}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${exportLoading
                                        ? 'bg-amber-500/10 text-amber-400/50 cursor-wait'
                                        : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-500/20'
                                    }`}
                            >
                                {exportLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generando DOCX...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Descargar DOCX con Formato Oficial
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Sentencia content */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#111111] overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                                <span className="text-sm font-medium text-white/50">Proyecto de Sentencia</span>
                                <span className="text-xs text-white/20 font-mono">{selectedTipo?.id}</span>
                            </div>
                            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-serif">
                                    {result}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
