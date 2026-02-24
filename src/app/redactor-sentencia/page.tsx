'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Gavel, Scale, Shield, AlertTriangle, Loader2, Copy, Download, ArrowLeft, CheckCircle, X, Search, ChevronDown, ChevronUp, Edit3, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { UserAvatar } from '@/components/UserAvatar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api-634779006258.us-central1.run.app';

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
    docs: [string, string]; // Labels for the 3 required documents
    color: string; // accent color class
}

const TIPOS: TipoConfig[] = [
    {
        id: 'amparo_directo',
        label: 'Amparo Directo',
        shortLabel: 'Directo',
        description: 'Contra sentencias definitivas o laudos de tribunales ordinarios',
        icon: <Gavel className="w-6 h-6" />,
        docs: ['Demanda de Amparo', 'Acto Reclamado'],
        color: 'from-[#c9a962]/10 to-[#8b7355]/5',
    },
    {
        id: 'amparo_revision',
        label: 'Amparo en Revisión',
        shortLabel: 'Revisión',
        description: 'Recurso contra sentencias de Juzgado de Distrito en amparo indirecto',
        icon: <Scale className="w-6 h-6" />,
        docs: ['Recurso de Revisión', 'Sentencia Recurrida'],
        color: 'from-[#c9a962]/10 to-[#8b7355]/5',
    },
    {
        id: 'revision_fiscal',
        label: 'Revisión Fiscal',
        shortLabel: 'R. Fiscal',
        description: 'Recurso contra sentencias del TFJA en materia fiscal/administrativa',
        icon: <Shield className="w-6 h-6" />,
        docs: ['Recurso de Revisión Fiscal', 'Sentencia Recurrida'],
        color: 'from-[#c9a962]/10 to-[#8b7355]/5',
    },
    {
        id: 'recurso_queja',
        label: 'Recurso de Queja',
        shortLabel: 'Queja',
        description: 'Recurso contra autos o resoluciones que no admiten apelación',
        icon: <AlertTriangle className="w-6 h-6" />,
        docs: ['Recurso de Queja', 'Determinación Recurrida'],
        color: 'from-[#c9a962]/10 to-[#8b7355]/5',
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Dynamic Terminology based on tipo
// ═══════════════════════════════════════════════════════════════════════════════

function getTerminology(tipoId?: TipoSentencia) {
    if (tipoId === 'amparo_directo') {
        return { singular: 'Concepto de Violación', plural: 'Conceptos de Violación', singularLower: 'concepto de violación', pluralLower: 'conceptos de violación' };
    }
    return { singular: 'Agravio', plural: 'Agravios', singularLower: 'agravio', pluralLower: 'agravios' };
}

interface GrupoTematico {
    tema: string;
    agravios_nums: number[];
    descripcion: string;
}

type SentidoPropuesto = string | null;

// Type-specific sentido options
const SENTIDO_OPTIONS: Record<TipoSentencia, { value: string; label: string; icon: string; desc: string }[]> = {
    amparo_directo: [
        { value: 'conceder', label: 'Conceder amparo', icon: '✅', desc: 'El amparo es procedente y fundado' },
        { value: 'negar', label: 'Negar amparo', icon: '❌', desc: 'Los conceptos son infundados/inoperantes' },
        { value: 'sobreseer', label: 'Sobreseer', icon: '⚠️', desc: 'Existe causa de improcedencia' },
    ],
    amparo_revision: [
        { value: 'confirmar', label: 'Confirmar sentencia', icon: '✅', desc: 'Los agravios son infundados' },
        { value: 'revocar', label: 'Revocar sentencia', icon: '🔄', desc: 'Los agravios son fundados' },
        { value: 'modificar', label: 'Modificar sentencia', icon: '✏️', desc: 'Parcialmente fundados' },
    ],
    revision_fiscal: [
        { value: 'confirmar', label: 'Confirmar sentencia', icon: '✅', desc: 'Los agravios son infundados' },
        { value: 'revocar', label: 'Revocar sentencia', icon: '🔄', desc: 'Los agravios son fundados' },
        { value: 'desechar', label: 'Desechar recurso', icon: '🚫', desc: 'El recurso es improcedente' },
    ],
    recurso_queja: [
        { value: 'fundada', label: 'Declarar fundada', icon: '✅', desc: 'Los agravios prosperan' },
        { value: 'infundada', label: 'Declarar infundada', icon: '❌', desc: 'Los agravios no prosperan' },
    ],
};

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
                ? 'border-[#c9a962]/60 bg-[#c9a962]/10'
                : file
                    ? 'border-[#8b7355]/40 bg-white/[0.04]'
                    : 'border-white/10 bg-white/[0.02] hover:border-[#c9a962]/30 hover:bg-white/[0.04]'
                }`}
        >
            {file ? (
                <div className="flex items-center gap-4 p-5">
                    <div className="w-12 h-12 rounded-xl bg-[#8b7355]/15 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-[#8b7355]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{file.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB • PDF
                        </p>
                    </div>
                    <button
                        onClick={onRemove}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4 text-white/30" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center gap-3 p-6 cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-[#c9a962]/10 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-[#c9a962]" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-white/50 mb-0.5">
                            <span className="text-[#c9a962] font-medium">Doc {index + 1}</span> — {label}
                        </p>
                        <p className="text-xs text-white/25">Arrastra o selecciona PDF (máx 50MB)</p>
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
    { label: 'Extrayendo datos estructurados de los PDFs...', emoji: '🔬' },
    { label: 'RAG multi-silo por agravio (jurisprudencia + legislación + constitución)...', emoji: '🔍' },
    { label: 'Gemini redacta análisis profundo de cada agravio...', emoji: '✍️' },
    { label: 'RAG de enriquecimiento (buscando citas adicionales)...', emoji: '📚' },
    { label: 'Gemini enriquece las citas verificadas...', emoji: '✨' },
    { label: 'Redactando efectos de la sentencia y puntos resolutivos...', emoji: '⚖️' },
    { label: 'Verificando coherencia del estudio de fondo...', emoji: '✅' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function RedactorSentenciaPage() {
    const { user, profile, loading: authLoading, isAuthenticated } = useRequireAuth();
    const router = useRouter();

    // Access gate: only admin or ultra_secretarios
    const canAccess = isAdmin(user?.email) || profile?.subscription_type === 'ultra_secretarios';

    // State Machine: 'select' → 'upload' → 'analyzing' → 'estrategia' → 'generating' → 'result'
    const [phase, setPhase] = useState<'select' | 'upload' | 'analyzing' | 'estrategia' | 'generating' | 'result'>('select');

    // New Navigation State
    const [viewState, setViewState] = useState<'tools' | 'jurisdiction' | 'tipos'>('tools');
    const [jurisdiction, setJurisdiction] = useState<'tcc' | 'juzgado' | null>(null); // Keep for data context if needed

    const [showJuzgadoAlert, setShowJuzgadoAlert] = useState(false);
    const [selectedTipo, setSelectedTipo] = useState<TipoConfig | null>(null);
    const [files, setFiles] = useState<(File | null)[]>([null, null]);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [progressStep, setProgressStep] = useState(0);
    const [tokensInfo, setTokensInfo] = useState<{ input: number; output: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [adelantoFile, setAdelantoFile] = useState<File | null>(null);

    // ── DOCX Metadata ─────────────────────────────────────────────────────
    const [metaExpediente, setMetaExpediente] = useState('');
    const [metaMateria, setMetaMateria] = useState('CIVIL');
    const [metaQuejoso, setMetaQuejoso] = useState(''); // kept for analysis display, not exported
    // Note: metaMagistrado and metaSecretario removed — not needed for estudio de fondo

    // ── Secretary Instructions & Strategy ──────────────────────────────────
    const [instrucciones, setInstrucciones] = useState('');
    const [sentido, setSentido] = useState<SentidoPropuesto>(null);
    const [autoMode, setAutoMode] = useState(false);
    const [expandedSummary, setExpandedSummary] = useState<'caso' | 'acto' | null>(null);
    const [dispositivoIndex, setDispositivoIndex] = useState<number | null>(null);
    const [gruposTematicos, setGruposTematicos] = useState<GrupoTematico[]>([]);
    const [ragCount, setRagCount] = useState(0);
    const [generationInfo, setGenerationInfo] = useState<{
        phasesCompleted: number;
        totalChars: number;
        generationTime: number;
    } | null>(null);

    // Dynamic terminology
    const term = getTerminology(selectedTipo?.id);

    // ── Phase 0.5: Analysis & Calificación ─────────────────────────────────
    interface AgravioData {
        numero: number;
        titulo: string;
        resumen: string;
        texto_integro: string;
        articulos_mencionados: string[];
        derechos_invocados: string[];
    }
    interface AnalysisData {
        resumen_caso: string;
        resumen_acto_reclamado: string;
        datos_expediente: {
            numero: string;
            tipo_asunto: string;
            quejoso_recurrente: string;
            autoridades_responsables: string[];
            materia: string;
            tribunal: string;
        };
        agravios: AgravioData[];
        grupos_tematicos?: GrupoTematico[];
        observaciones_preliminares: string;
        analysis_time_seconds: number;
    }
    interface CalificacionEntry {
        numero: number;
        titulo: string;
        resumen: string;
        calificacion: 'fundado' | 'infundado' | 'inoperante' | 'innecesario' | 'sin_calificar';
        notas: string;
        expanded: boolean;
        dispositivo: boolean;
    }
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [calificaciones, setCalificaciones] = useState<CalificacionEntry[]>([]);
    const [expandedAgravio, setExpandedAgravio] = useState<number | null>(null);

    const allFilesUploaded = files.every((f) => f !== null);

    // ── Access Gate (redirect unauthorized, after all hooks) ──────────────
    useEffect(() => {
        if (!authLoading && isAuthenticated && profile && !canAccess) {
            router.replace('/secretarios');
        }
    }, [authLoading, isAuthenticated, profile, canAccess, router]);

    if (authLoading || (isAuthenticated && !profile)) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a962]"></div>
            </div>
        );
    }

    if (!canAccess) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a962]"></div>
            </div>
        );
    }

    // ── Select Type ───────────────────────────────────────────────────────
    const handleSelectTipo = (tipo: TipoConfig) => {
        setSelectedTipo(tipo);
        setFiles([null, null]);
        setError('');
        setResult('');
        setPhase('upload');
    };

    // ── Analyze (Phase 0.5) ─────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!selectedTipo || !allFilesUploaded || !user?.email) return;

        setPhase('analyzing');
        setError('');

        try {
            const formData = new FormData();
            formData.append('tipo', selectedTipo.id);
            formData.append('user_email', user.email);
            formData.append('doc1', files[0]!);
            formData.append('doc2', files[1]!);

            const response = await fetch(`${API_URL}/analyze-expediente`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            const data: AnalysisData = await response.json();
            setAnalysisData(data);

            // Auto-fill metadata from analysis
            if (data.datos_expediente.numero) setMetaExpediente(data.datos_expediente.numero);
            if (data.datos_expediente.materia) setMetaMateria(data.datos_expediente.materia.toUpperCase());
            if (data.datos_expediente.quejoso_recurrente) setMetaQuejoso(data.datos_expediente.quejoso_recurrente);

            // Build calificaciones from agravios
            const califs: CalificacionEntry[] = data.agravios.map(a => ({
                numero: a.numero,
                titulo: a.titulo,
                resumen: a.resumen,
                calificacion: 'sin_calificar' as const,
                notas: '',
                expanded: false,
                dispositivo: false,
            }));
            setCalificaciones(califs);

            // Store thematic groups from analysis
            if (data.grupos_tematicos && data.grupos_tematicos.length > 0) {
                setGruposTematicos(data.grupos_tematicos);
            }

            // Go to strategy phase first
            setPhase('estrategia');
        } catch (err: any) {
            setError(err.message || 'Error al analizar el expediente');
            setPhase('upload');
        }
    };

    // ── Generate (with calificaciones) ────────────────────────────────────
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
        }, 40000);

        try {
            const formData = new FormData();
            formData.append('tipo', selectedTipo.id);
            formData.append('user_email', user.email);
            formData.append('instrucciones', instrucciones);
            formData.append('sentido', sentido || '');
            formData.append('auto_mode', autoMode ? 'true' : 'false');
            formData.append('doc1', files[0]!);
            formData.append('doc2', files[1]!);

            // Send calificaciones JSON if we have them from Phase 0.5
            if (calificaciones.length > 0) {
                const califJson = calificaciones.map(c => ({
                    numero: c.numero,
                    titulo: c.titulo,
                    resumen: c.resumen,
                    calificacion: c.calificacion,
                    notas: c.notas,
                    dispositivo: c.dispositivo,
                }));
                formData.append('calificaciones', JSON.stringify(califJson));
            }

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
            if (data.rag_results_count) {
                setRagCount(data.rag_results_count);
            }
            if (data.phases_completed) {
                setGenerationInfo({
                    phasesCompleted: data.phases_completed,
                    totalChars: data.total_chars || data.sentencia_text.length,
                    generationTime: data.generation_time_seconds || 0,
                });
            }
            setPhase('result');
        } catch (err: any) {
            clearInterval(interval);
            setError(err.message || 'Error al generar la sentencia');
            setPhase('estrategia');
        }
    };

    // ── Update calificacion for a single agravio ────────────────────────
    const updateCalificacion = (index: number, field: keyof CalificacionEntry, value: any) => {
        setCalificaciones(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const allCalificadas = calificaciones.length > 0 && calificaciones.every(c => c.calificacion !== 'sin_calificar');

    // ── Apply dispositivo auto-calificación ──────────────────────────────
    const applyDispositivo = (agravioNum: number) => {
        setDispositivoIndex(agravioNum);
        setCalificaciones(prev => prev.map(c => {
            if (c.numero === agravioNum) {
                return { ...c, calificacion: 'fundado', dispositivo: true };
            }
            return { ...c, calificacion: 'innecesario', dispositivo: false };
        }));
    };

    const clearDispositivo = () => {
        setDispositivoIndex(null);
        setCalificaciones(prev => prev.map(c => ({
            ...c,
            calificacion: 'sin_calificar',
            dispositivo: false,
        })));
    };

    // ── Group-level qualification ─────────────────────────────────────────
    const updateGroupCalificacion = (grupoIndex: number, calificacion: 'fundado' | 'infundado' | 'inoperante') => {
        const grupo = gruposTematicos[grupoIndex];
        if (!grupo) return;
        setCalificaciones(prev => prev.map(c => {
            if (grupo.agravios_nums.includes(c.numero)) {
                return { ...c, calificacion, dispositivo: false };
            }
            return c;
        }));
    };

    // ── Copy to Clipboard ─────────────────────────────────────────────────
    const handleCopy = async () => {
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Merge adelanto DOCX with estudio de fondo ─────────────────────────
    const handleMergeDownload = async () => {
        if (!result || !adelantoFile || exportLoading) return;
        setExportLoading(true);
        try {
            const formData = new FormData();
            formData.append('adelanto_file', adelantoFile);
            formData.append('estudio_text', result);
            formData.append('tipo', selectedTipo?.id || 'amparo_directo');
            formData.append('user_email', user?.email || '');

            const res = await fetch(`${API_URL}/merge-sentencia-docx`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Error al combinar documentos' }));
                throw new Error(err.detail || 'Error al combinar DOCX');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const disposition = res.headers.get('Content-Disposition');
            const filename = disposition?.match(/filename="(.+)"/)?.[1]
                || `Sentencia_Combinada_${metaExpediente || 'borrador'}.docx`;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || 'Error al combinar documentos');
        } finally {
            setExportLoading(false);
        }
    };

    // ── Download as DOCX (official TCC format — fallback) ─────────────────
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
        setViewState('tools');
        setJurisdiction(null);
        // If we are in 'upload' or later, we go back to 'select' (which now means TCC tool selector if jurisdiction is set)
        // If we want to fully reset to jurisdiction selector, we should do:
        // setJurisdiction(null); 
        // But typical "Cambiar tipo" behavior inside TCC flow usually implies staying in TCC. 
        // However, if the user clicks "Cambiar tipo" from upload, maybe they want to go back to the top?
        // Let's keep jurisdiction if we are just resetting the process within TCC.
        // But if we want a full reset, we set it to null. 
        // For 'Cambiar tipo' button (line 746), it calls handleReset. 
        // Let's make handleReset keep jurisdiction, but add a explicit 'handleFullReset' for the top back button.
        setSelectedTipo(null);
        setFiles([null, null]);
        setResult('');
        setError('');
        setTokensInfo(null);
    };

    // ── Auth Loading ──────────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a962]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white relative overflow-hidden">

            {/* ═══ Top Bar ═══ */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f]/90 backdrop-blur-xl border-b border-white/[0.08]">
                {/* Diagonal gold grid accent */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #c9a962 1px, transparent 1px), linear-gradient(-45deg, #c9a962 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                        <Link href="/chat" className="flex items-center gap-2 group">
                            <span className="font-serif text-xl font-semibold text-white">
                                Iurex<span className="text-[#c9a962]">ia</span>
                            </span>
                        </Link>
                        <div className="h-5 w-px bg-white/10" />
                        <span className="text-xs text-[#c9a962]/70 tracking-wider uppercase font-medium">
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16 relative z-10">

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 1: SELECT TYPE                                       */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'select' && (
                    <div className="max-w-4xl mx-auto">

                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* STEP 1: JURISDICTION SELECTION                          */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* VIEW 1: TOOL SELECTION                                  */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {viewState === 'tools' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Header */}
                                <div className="text-center mb-16">
                                    <p className="text-[#c9a962]/60 text-xs tracking-[0.3em] uppercase mb-6 font-light">
                                        Herramientas de Redacción
                                    </p>
                                    <h1 className="font-serif text-4xl md:text-5xl font-light text-white mb-5 tracking-tight">
                                        Redactor de Sentencias
                                    </h1>
                                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a962]/50 to-transparent mx-auto mb-5" />
                                    <p className="text-white/35 text-base max-w-lg mx-auto leading-relaxed font-light">
                                        Selecciona la herramienta que mejor se adapte a tu flujo de trabajo.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Card 1: Estudio de Fondo (Goes to Jurisdiction) */}
                                    <button
                                        onClick={() => setViewState('jurisdiction')}
                                        className="group relative rounded-xl border border-white/[0.06] bg-[#141414] p-10 text-left transition-all duration-500 hover:border-[#c9a962]/30 hover:bg-[#161616] overflow-hidden"
                                    >
                                        {/* Subtle top accent line */}
                                        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#c9a962]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative z-10">
                                            <span className="text-[#c9a962]/40 text-[11px] tracking-[0.25em] uppercase font-light">
                                                01
                                            </span>
                                            <h3 className="font-serif text-2xl font-light text-white mt-4 mb-3 tracking-tight group-hover:text-[#c9a962]/90 transition-colors duration-500">
                                                Redactar Estudio de Fondo
                                            </h3>
                                            <p className="text-[13px] text-white/30 leading-relaxed font-light">
                                                Genera un proyecto de sentencia completo desde cero.
                                                Sube los expedientes y la IA construirá el estudio de fondo.
                                            </p>
                                            <div className="mt-6 flex items-center gap-3 text-[11px] text-white/20 font-light">
                                                <span>Multi-fase</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span>RAG integrado</span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Card 2: Chat (Direct Link) */}
                                    <Link
                                        href="/redactor-sentencia/chat"
                                        className="group relative rounded-xl border border-white/[0.06] bg-[#141414] p-10 text-left transition-all duration-500 hover:border-[#c9a962]/30 hover:bg-[#161616] overflow-hidden"
                                    >
                                        {/* Subtle top accent line */}
                                        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#c9a962]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative z-10">
                                            <span className="text-[#c9a962]/40 text-[11px] tracking-[0.25em] uppercase font-light">
                                                02
                                            </span>
                                            <h3 className="font-serif text-2xl font-light text-white mt-4 mb-3 tracking-tight group-hover:text-[#c9a962]/90 transition-colors duration-500">
                                                Chat de Asistencia
                                            </h3>
                                            <p className="text-[13px] text-white/30 leading-relaxed font-light">
                                                Modifica, ajusta o continúa sentencias en diálogo abierto.
                                                Sube un borrador o pega tu texto.
                                            </p>
                                            <div className="mt-6 flex items-center gap-3 text-[11px] text-white/20 font-light">
                                                <span>Chat en tiempo real</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span>PDF / DOCX</span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* STEP 2: TOOL SELECTION (TCC ONLY)                       */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* VIEW 2: JURISDICTION SELECTION                          */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {viewState === 'jurisdiction' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <button
                                    onClick={() => setViewState('tools')}
                                    className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-10 font-light"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Volver
                                </button>

                                <div className="text-center mb-16">
                                    <p className="text-[#c9a962]/60 text-xs tracking-[0.3em] uppercase mb-6 font-light">
                                        Estudio de Fondo
                                    </p>
                                    <h1 className="font-serif text-4xl md:text-5xl font-light text-white mb-5 tracking-tight">
                                        Selecciona la Instancia
                                    </h1>
                                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a962]/50 to-transparent mx-auto" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Card 1: TCC (Goes to Tipos) */}
                                    <button
                                        onClick={() => {
                                            setJurisdiction('tcc');
                                            setViewState('tipos');
                                        }}
                                        className="group relative rounded-xl border border-white/[0.06] bg-[#141414] p-10 text-left transition-all duration-500 hover:border-[#c9a962]/30 hover:bg-[#161616] overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#c9a962]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative z-10">
                                            <span className="text-[#c9a962]/40 text-[11px] tracking-[0.25em] uppercase font-light">
                                                01
                                            </span>
                                            <h3 className="font-serif text-2xl font-light text-white mt-4 mb-3 tracking-tight group-hover:text-[#c9a962]/90 transition-colors duration-500">
                                                Tribunales Colegiados
                                            </h3>
                                            <p className="text-[13px] text-white/30 leading-relaxed font-light">
                                                Sentencias de Amparo Directo, en Revisión, Queja y Revisión Fiscal.
                                            </p>
                                        </div>
                                    </button>

                                    {/* Card 2: Juzgado (Alert) */}
                                    <button
                                        onClick={() => setShowJuzgadoAlert(true)}
                                        className="group relative rounded-xl border border-white/[0.04] bg-[#121212] p-10 text-left transition-all duration-300 hover:border-white/[0.1] hover:bg-[#141414]"
                                    >
                                        <div className="relative z-10">
                                            <span className="text-white/15 text-[11px] tracking-[0.25em] uppercase font-light">
                                                02
                                            </span>
                                            <h3 className="font-serif text-2xl font-light text-white/50 mt-4 mb-3 tracking-tight">
                                                Juzgados de Distrito
                                            </h3>
                                            <p className="text-[13px] text-white/20 leading-relaxed font-light mb-4">
                                                Sentencias de Amparo Indirecto y procesos penales federales.
                                            </p>
                                            <span className="text-[11px] text-white/25 font-light tracking-wider uppercase">
                                                Próximamente
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════ */}
                        {/* VIEW 3: TIPO SELECTION (TCC)                            */}
                        {/* ═══════════════════════════════════════════════════════ */}
                        {viewState === 'tipos' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <button
                                    onClick={() => setViewState('jurisdiction')}
                                    className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-10 font-light"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Volver
                                </button>

                                <div className="text-center mb-16">
                                    <p className="text-[#c9a962]/60 text-xs tracking-[0.3em] uppercase mb-6 font-light">
                                        Tribunal Colegiado de Circuito
                                    </p>
                                    <h1 className="font-serif text-4xl md:text-5xl font-light text-white mb-5 tracking-tight">
                                        Tipo de Sentencia
                                    </h1>
                                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a962]/50 to-transparent mx-auto" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {TIPOS.map((tipo, index) => (
                                        <button
                                            key={tipo.id}
                                            onClick={() => handleSelectTipo(tipo)}
                                            className="group relative rounded-xl border border-white/[0.06] bg-[#141414] p-8 text-left transition-all duration-400 hover:border-[#c9a962]/30 hover:bg-[#161616]"
                                        >
                                            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#c9a962]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div>
                                                <span className="text-[#c9a962]/30 text-[11px] tracking-[0.25em] uppercase font-light">
                                                    0{index + 1}
                                                </span>
                                                <h3 className="font-serif text-xl font-light text-white mt-3 mb-2 tracking-tight group-hover:text-[#c9a962]/90 transition-colors duration-500">
                                                    {tipo.label}
                                                </h3>
                                                <p className="text-[13px] text-white/25 leading-relaxed font-light mb-4">
                                                    {tipo.description}
                                                </p>
                                                <div className="flex gap-3 text-[11px] text-white/15 font-light">
                                                    {tipo.docs.map((doc, i) => (
                                                        <span key={i} className="flex items-center gap-2">
                                                            {i > 0 && <span className="w-1 h-1 rounded-full bg-white/10" />}
                                                            {doc}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Juzgado Alert Modal */}
                        {showJuzgadoAlert && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-[#c9a962]/10 flex items-center justify-center mx-auto mb-4">
                                            <Sparkles className="w-8 h-8 text-[#c9a962]" />
                                        </div>
                                        <h3 className="font-serif text-2xl font-medium text-white mb-2">
                                            Próximamente
                                        </h3>
                                        <p className="text-gray-400 mb-6 leading-relaxed">
                                            Estamos trabajando en el módulo especializado para <strong>Juzgados de Distrito</strong>.
                                            Estará disponible en la próxima actualización.
                                        </p>
                                        <button
                                            onClick={() => setShowJuzgadoAlert(false)}
                                            className="bg-white text-black px-6 py-2.5 rounded-full font-medium hover:bg-white/90 transition-colors"
                                        >
                                            Entendido
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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
                            <div className="w-14 h-14 rounded-xl bg-[#c9a962]/10 flex items-center justify-center text-[#c9a962]">
                                {selectedTipo.icon}
                            </div>
                            <div>
                                <h2 className="font-serif text-2xl font-medium text-white">
                                    {selectedTipo.label}
                                </h2>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    Adjunta los 2 documentos del expediente
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

                        {/* Analyze Expediente Button */}
                        <button
                            onClick={handleAnalyze}
                            disabled={!allFilesUploaded}
                            className={`w-full py-4 rounded-full text-base font-bold transition-all duration-300 ${allFilesUploaded
                                ? 'bg-gradient-to-r from-[#c9a962] to-[#b8943f] text-[#0f0f0f] hover:from-[#d4b470] hover:to-[#c9a962] shadow-lg shadow-[#c9a962]/20 hover:shadow-xl hover:shadow-[#c9a962]/30'
                                : 'bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/[0.08]'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Search className="w-5 h-5" />
                                Analizar Expediente
                            </span>
                        </button>

                        <p className="text-center text-xs text-gray-500 mt-4">
                            El análisis identifica automáticamente los {term.pluralLower} para que usted los califique antes de generar
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 2.5: ANALYZING                                        */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'analyzing' && (
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full bg-[#c9a962]/10 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-[#c9a962]/5 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Search className="w-10 h-10 text-[#c9a962] animate-pulse" />
                            </div>
                        </div>
                        <h2 className="font-serif text-2xl font-medium text-white mb-2">
                            Analizando expediente...
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Gemini 2.5 Pro está leyendo los 3 documentos e identificando agravios
                        </p>
                        <div className="space-y-2 text-left max-w-sm mx-auto">
                            <div className="flex items-center gap-3 opacity-100">
                                <Loader2 className="w-5 h-5 text-[#c9a962] animate-spin flex-shrink-0" />
                                <span className="text-sm text-white/70">🔬 Extrayendo datos estructurados...</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-40">
                                <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0" />
                                <span className="text-sm text-white/25">📋 Identificando {term.pluralLower} individuales...</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-40">
                                <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0" />
                                <span className="text-sm text-white/25">⚖️ Generando resumen del caso...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 2.6: ESTRATEGIA DEL PROYECTO                          */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'estrategia' && analysisData && (
                    <div className="max-w-4xl mx-auto">
                        <button
                            onClick={() => setPhase('upload')}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white/70 transition-colors mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </button>

                        {/* Analysis Summary (expandable) */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a]/60 backdrop-blur-sm p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#c9a962]/10 flex items-center justify-center">
                                        <Search className="w-5 h-5 text-[#c9a962]" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-medium text-white/90">Resumen del Expediente</h3>
                                        <p className="text-xs text-gray-400">
                                            Analizado en {analysisData.analysis_time_seconds}s • {analysisData.agravios.length} {term.pluralLower} identificados
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Expediente Data Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-[#1a1a1a]/40 rounded-lg p-3">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Expediente</p>
                                    <p className="text-sm text-white/80 mt-1">{analysisData.datos_expediente.numero || 'No identificado'}</p>
                                </div>
                                <div className="bg-[#1a1a1a]/40 rounded-lg p-3">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Quejoso/Recurrente</p>
                                    <p className="text-sm text-white/80 mt-1">{analysisData.datos_expediente.quejoso_recurrente || 'No identificado'}</p>
                                </div>
                                <div className="bg-[#1a1a1a]/40 rounded-lg p-3">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Materia</p>
                                    <p className="text-sm text-white/80 mt-1">{analysisData.datos_expediente.materia || 'No identificada'}</p>
                                </div>
                                <div className="bg-[#1a1a1a]/40 rounded-lg p-3">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Tribunal</p>
                                    <p className="text-sm text-white/80 mt-1">{analysisData.datos_expediente.tribunal || 'No identificado'}</p>
                                </div>
                            </div>

                            {/* Expandable: Resumen del Caso */}
                            <button
                                onClick={() => setExpandedSummary(expandedSummary === 'caso' ? null : 'caso')}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors mb-2"
                            >
                                <span className="text-xs text-white/40 uppercase tracking-wider">Resumen del Caso</span>
                                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expandedSummary === 'caso' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedSummary === 'caso' && (
                                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] mb-2">
                                    <p className="text-sm text-white/60 leading-relaxed">{analysisData.resumen_caso}</p>
                                </div>
                            )}

                            {/* Expandable: Acto Reclamado */}
                            {analysisData.resumen_acto_reclamado && (
                                <>
                                    <button
                                        onClick={() => setExpandedSummary(expandedSummary === 'acto' ? null : 'acto')}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                                    >
                                        <span className="text-xs text-white/40 uppercase tracking-wider">Acto Reclamado</span>
                                        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expandedSummary === 'acto' ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedSummary === 'acto' && (
                                        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] mt-2">
                                            <p className="text-sm text-white/60 leading-relaxed">{analysisData.resumen_acto_reclamado}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Sentido Propuesto */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a]/60 backdrop-blur-sm p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#c9a962]/10 flex items-center justify-center">
                                    <Gavel className="w-5 h-5 text-[#c9a962]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-medium text-white/90">Sentido del Proyecto</h3>
                                    <p className="text-xs text-gray-400">¿Cuál es la línea que desea para este proyecto de sentencia?</p>
                                </div>
                            </div>
                            <div className={`grid gap-3 ${(selectedTipo && SENTIDO_OPTIONS[selectedTipo.id as TipoSentencia]?.length === 2) ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {selectedTipo && SENTIDO_OPTIONS[selectedTipo.id as TipoSentencia]?.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSentido(sentido === opt.value ? null : opt.value)}
                                        className={`p-4 rounded-xl border text-left transition-all duration-200 ${sentido === opt.value
                                            ? 'border-[#c9a962]/50 bg-[#c9a962]/10 shadow-sm shadow-[#c9a962]/10'
                                            : 'border-white/[0.08] bg-[#1a1a1a]/40 hover:border-white/[0.15] hover:bg-[#1a1a1a]/70'
                                            }`}
                                    >
                                        <span className="text-lg mb-1 block">{opt.icon}</span>
                                        <span className={`text-sm font-medium block mb-1 ${sentido === opt.value ? 'text-[#c9a962]' : 'text-white/80'}`}>
                                            {opt.label}
                                        </span>
                                        <span className="text-[10px] text-white/30">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dispositivo Selector — only when Conceder */}
                        {sentido === 'conceder' && (
                            <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.03] backdrop-blur-sm p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-medium text-white/90">{term.singular} Dispositivo</h3>
                                        <p className="text-xs text-gray-400">
                                            ¿Hay un {term.singularLower} que por sí solo resuelve el caso al mayor beneficio?
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-green-400/60 mb-4 flex items-center gap-2">
                                    <span className="text-base">💡</span>
                                    Si selecciona un {term.singularLower} como dispositivo, los demás se omitirán con un párrafo formulaico — ahorrando ~60% en tiempo y costo.
                                </p>
                                <div className="space-y-2">
                                    {calificaciones.map(c => (
                                        <button
                                            key={c.numero}
                                            onClick={() => dispositivoIndex === c.numero ? clearDispositivo() : applyDispositivo(c.numero)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${dispositivoIndex === c.numero
                                                ? 'border-green-500/40 bg-green-500/10'
                                                : dispositivoIndex !== null
                                                    ? 'border-white/[0.04] bg-white/[0.01] opacity-50'
                                                    : 'border-white/[0.08] bg-[#1a1a1a]/40 hover:border-green-500/20 hover:bg-green-500/[0.03]'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dispositivoIndex === c.numero
                                                ? 'border-green-400 bg-green-400'
                                                : 'border-white/20'
                                                }`}>
                                                {dispositivoIndex === c.numero && (
                                                    <CheckCircle className="w-3 h-3 text-[#0f0f0f]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs text-[#c9a962]/70 font-medium">{term.singular} {c.numero}</span>
                                                <p className="text-sm text-white/80 font-medium truncate">{c.titulo}</p>
                                            </div>
                                            {dispositivoIndex === c.numero && (
                                                <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium flex-shrink-0">DISPOSITIVO</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {dispositivoIndex !== null && (
                                    <div className="mt-4 p-3 rounded-xl bg-green-500/[0.06] border border-green-500/[0.12]">
                                        <p className="text-xs text-green-400/80">
                                            ✅ Solo se redactará el estudio de fondo del {term.singularLower} {dispositivoIndex}. Los demás {calificaciones.length - 1} {term.pluralLower} se declararán innecesarios de estudio.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Thematic Groups with Qualification */}
                        {gruposTematicos.length > 0 && sentido !== 'conceder' && (
                            <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a]/60 backdrop-blur-sm p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#c9a962]/10 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-[#c9a962]" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-medium text-white/90">Agrupación Temática</h3>
                                        <p className="text-xs text-gray-400">{gruposTematicos.length} grupos identificados — califique por grupo</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {gruposTematicos.map((g, gi) => {
                                        const colors = ['border-l-blue-500/40', 'border-l-purple-500/40', 'border-l-emerald-500/40', 'border-l-amber-500/40', 'border-l-pink-500/40'];
                                        const groupCalif = calificaciones.filter(c => g.agravios_nums.includes(c.numero));
                                        const currentCalif = groupCalif.length > 0 && groupCalif.every(c => c.calificacion === groupCalif[0].calificacion && c.calificacion !== 'sin_calificar')
                                            ? groupCalif[0].calificacion : null;
                                        return (
                                            <div key={gi} className={`border-l-2 ${colors[gi % colors.length]} rounded-r-xl overflow-hidden transition-all duration-300 ${currentCalif === 'fundado' ? 'bg-green-500/[0.04]' :
                                                currentCalif === 'infundado' ? 'bg-red-500/[0.04]' :
                                                    currentCalif === 'inoperante' ? 'bg-amber-500/[0.04]' : 'bg-white/[0.02]'
                                                }`}>
                                                {/* Group header */}
                                                <div className="px-4 py-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white/80 font-medium">{g.tema}</p>
                                                            <p className="text-[10px] text-white/30 mt-0.5">
                                                                {term.plural}: {g.agravios_nums.join(', ')} {g.descripcion ? `— ${g.descripcion}` : ''}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setExpandedAgravio(expandedAgravio === gi + 9000 ? null : gi + 9000)}
                                                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                                        >
                                                            <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expandedAgravio === gi + 9000 ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>

                                                    {/* Per-group qualification buttons */}
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {(['fundado', 'infundado', 'inoperante'] as const).map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => updateGroupCalificacion(gi, opt)}
                                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${currentCalif === opt
                                                                    ? opt === 'fundado'
                                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                                                        : opt === 'infundado'
                                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                                                    : 'bg-[#1a1a1a]/40 text-gray-400 border border-white/[0.06] hover:bg-[#1a1a1a]/70 hover:text-white/60'
                                                                    }`}
                                                            >
                                                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                            </button>
                                                        ))}
                                                        {currentCalif && (
                                                            <span className="text-[10px] text-white/20 self-center ml-1">✓ {g.agravios_nums.length} {term.pluralLower}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expandable: individual agravios in this group */}
                                                {expandedAgravio === gi + 9000 && (
                                                    <div className="px-4 pb-3 space-y-2">
                                                        {g.agravios_nums.map(num => {
                                                            const agravio = analysisData.agravios.find(a => a.numero === num);
                                                            const calif = calificaciones.find(c => c.numero === num);
                                                            if (!agravio) return null;
                                                            return (
                                                                <div key={num} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c9a962]/10 text-[#c9a962] font-medium">{term.singular} {num}</span>
                                                                        {calif && calif.calificacion !== 'sin_calificar' && (
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${calif.calificacion === 'fundado' ? 'bg-green-500/15 text-green-400' :
                                                                                calif.calificacion === 'infundado' ? 'bg-red-500/15 text-red-400' :
                                                                                    'bg-amber-500/15 text-amber-400'
                                                                                }`}>{calif.calificacion.toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-white/70 font-medium">{agravio.titulo}</p>
                                                                    <p className="text-[11px] text-white/40 mt-1">{agravio.resumen}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Instructions for Drafting */}
                        <div className="rounded-2xl border border-[#c9a962]/15 bg-[#c9a962]/[0.03] backdrop-blur-sm p-6 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-[#c9a962]/15 flex items-center justify-center">
                                    <Edit3 className="w-5 h-5 text-[#c9a962]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-medium text-white/90">Instrucciones para la Redacción</h3>
                                    <p className="text-xs text-[#c9a962]/60">Dictele la línea argumental al sistema — este es el paso más importante</p>
                                </div>
                            </div>
                            <textarea
                                value={instrucciones}
                                onChange={e => { setInstrucciones(e.target.value); setAutoMode(false); }}
                                rows={5}
                                placeholder={selectedTipo?.id === 'amparo_directo'
                                    ? 'Ej: El concepto de violación primero es fundado por violación al debido proceso. Aplicar suplencia de la queja por materia laboral. Los conceptos 2 y 3 son inoperantes por no combatir las consideraciones...'
                                    : selectedTipo?.id === 'amparo_revision'
                                        ? 'Ej: Los agravios son infundados, la sentencia del juez de distrito está correctamente fundada. El agravio 1 no controvierte las consideraciones del a quo...'
                                        : selectedTipo?.id === 'revision_fiscal'
                                            ? 'Ej: Desechar por improcedente. No reúne los requisitos de importancia y trascendencia del Art. 63 LFPCA...'
                                            : 'Ej: La queja es fundada. El juez de distrito aplicó incorrectamente el artículo 97 fracción I de la Ley de Amparo...'
                                }
                                className="w-full bg-white/[0.04] border border-[#c9a962]/20 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#c9a962]/40 focus:ring-1 focus:ring-[#c9a962]/10 transition-colors resize-none"
                            />

                            {/* Auto-draft toggle */}
                            <div className="mt-3 flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setAutoMode(!autoMode);
                                        if (!autoMode) setInstrucciones('');
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all duration-200 border ${autoMode
                                        ? 'bg-[#c9a962]/10 border-[#c9a962]/30 text-[#c9a962]'
                                        : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white/60 hover:border-white/[0.12]'
                                        }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Borrador automático a raíz de precedentes
                                    <span className="text-[10px] text-white/20">(no sugerido)</span>
                                </button>
                            </div>
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
                            disabled={!sentido}
                            className={`w-full py-4 rounded-full text-base font-bold transition-all duration-300 ${sentido
                                ? 'bg-gradient-to-r from-[#c9a962] to-[#b8943f] text-[#0f0f0f] hover:from-[#d4b470] hover:to-[#c9a962] shadow-lg shadow-[#c9a962]/20 hover:shadow-xl hover:shadow-[#c9a962]/30'
                                : 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.08]'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                {sentido
                                    ? `Generar Estudio de Fondo${dispositivoIndex !== null ? ` (solo ${term.singularLower} ${dispositivoIndex})` : ''}`
                                    : 'Seleccione un sentido para continuar'
                                }
                            </span>
                        </button>

                        <p className="text-center text-xs text-gray-500 mt-4">
                            {autoMode
                                ? 'El sistema generará basándose exclusivamente en precedentes y jurisprudencia'
                                : instrucciones
                                    ? 'Se aplicarán sus instrucciones y se enriquecerá con RAG automático'
                                    : 'Agregue instrucciones para guiar la redacción o use el borrador automático'
                            }
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
                            <div className="absolute inset-0 rounded-full bg-[#c9a962]/10 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-[#c9a962]/5 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Gavel className="w-10 h-10 text-[#c9a962] animate-pulse" />
                            </div>
                        </div>

                        <h2 className="font-serif text-2xl font-medium text-white mb-2">
                            Redactando Estudio de Fondo profundo...
                        </h2>
                        <p className="text-sm text-gray-400 mb-10">
                            Pipeline enfocado con RAG intensivo por agravio — Tiempo estimado: 5-15 minutos
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
                                        <CheckCircle className="w-5 h-5 text-[#8b7355] flex-shrink-0" />
                                    ) : i === progressStep ? (
                                        <Loader2 className="w-5 h-5 text-[#c9a962] animate-spin flex-shrink-0" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm ${i <= progressStep ? 'text-white/70' : 'text-white/25'
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
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white/70 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Nueva redacción
                            </button>
                            <div className="flex items-center gap-3">
                                {tokensInfo && (
                                    <span className="text-xs text-gray-500">
                                        {tokensInfo.input.toLocaleString()} → {tokensInfo.output.toLocaleString()} tokens
                                    </span>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a]/60 border border-white/10 hover:border-[#c9a962]/40 text-sm text-gray-300 hover:text-white transition-all"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-[#c9a962]" />
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
                                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#1a1a1a]/60 border border-white/10 hover:border-white/20 text-sm text-gray-400 hover:text-gray-200 transition-all"
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
                                    Estudio de Fondo generado — {selectedTipo?.label}
                                </p>
                                <p className="text-xs text-white/30 mt-0.5">
                                    {result.length.toLocaleString()} caracteres
                                    {generationInfo && <> • {generationInfo.phasesCompleted} fases completadas</>}
                                    {generationInfo && generationInfo.generationTime > 0 && <> • {Math.round(generationInfo.generationTime)}s</>}
                                    {ragCount > 0 && <> • {ragCount} fuentes RAG</>}
                                    {' '}• Revisa y ajusta antes de presentar
                                </p>
                            </div>
                        </div>

                        {/* ── Merge with Adelanto Panel (Primary Export) ── */}
                        <div className="rounded-2xl border border-[#c9a962]/20 bg-gradient-to-br from-[#c9a962]/5 to-transparent p-6 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-[#c9a962]/10 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-[#c9a962]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white/90">Exportar Sentencia Completa</h3>
                                    <p className="text-xs text-gray-400">Combine su adelanto con el estudio de fondo</p>
                                </div>
                            </div>
                            <p className="text-xs text-white/30 mb-4 ml-[52px]">
                                Suba su formato de consideraciones previas (DOCX) y el sistema insertará automáticamente el estudio de fondo en el punto correcto del documento.
                            </p>

                            {/* Upload zone */}
                            {!adelantoFile ? (
                                <label className="group flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-white/10 hover:border-[#c9a962]/30 bg-white/[0.02] hover:bg-[#c9a962]/[0.03] transition-all cursor-pointer mb-4">
                                    <Upload className="w-8 h-8 text-white/20 group-hover:text-[#c9a962]/60 transition-colors" />
                                    <div className="text-center">
                                        <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">Arrastre o seleccione su adelanto</span>
                                        <p className="text-[10px] text-white/20 mt-1">Formato .docx — Consideraciones previas al estudio de fondo</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) setAdelantoFile(f);
                                        }}
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-4">
                                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white/80 truncate">{adelantoFile.name}</p>
                                        <p className="text-[10px] text-white/30">{(adelantoFile.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => setAdelantoFile(null)}
                                        className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Merge Download button */}
                            <button
                                onClick={handleMergeDownload}
                                disabled={!adelantoFile || exportLoading}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all duration-300 ${!adelantoFile || exportLoading
                                    ? 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.08]'
                                    : 'bg-gradient-to-r from-[#c9a962] to-[#b8943f] text-[#0f0f0f] hover:from-[#d4b470] hover:to-[#c9a962] shadow-lg shadow-[#c9a962]/20 hover:shadow-xl hover:shadow-[#c9a962]/30'
                                    }`}
                            >
                                {exportLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Combinando documentos...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        {adelantoFile ? 'Descargar Sentencia Combinada' : 'Suba su adelanto para combinar'}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* ── Fallback: Formato Oficial (secondary) ── */}
                        <details className="group rounded-2xl border border-white/[0.08] bg-[#1a1a1a]/30 mb-6">
                            <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer text-gray-400 hover:text-gray-200 transition-colors">
                                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                                <span className="text-xs">O exportar solo el estudio de fondo con formato genérico</span>
                            </summary>
                            <div className="px-5 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-xs text-white/30 mb-1">Nº Expediente</label>
                                        <input
                                            type="text"
                                            value={metaExpediente}
                                            onChange={e => setMetaExpediente(e.target.value)}
                                            placeholder="365/2024"
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#c9a962]/40 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/30 mb-1">Materia</label>
                                        <select
                                            value={metaMateria}
                                            onChange={e => setMetaMateria(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#c9a962]/40 transition-colors"
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
                                </div>
                                <button
                                    onClick={handleDownloadDocx}
                                    disabled={exportLoading}
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${exportLoading
                                        ? 'bg-white/[0.04] text-white/20 cursor-wait'
                                        : 'bg-[#1a1a1a]/60 text-gray-400 hover:text-white hover:bg-[#1a1a1a] border border-white/[0.08]'
                                        }`}
                                >
                                    {exportLoading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Generando DOCX...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-3.5 h-3.5" />
                                            Descargar Estudio de Fondo (Formato Genérico)
                                        </>
                                    )}
                                </button>
                            </div>
                        </details>

                        {/* Sentencia content */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
                                <span className="text-sm font-medium text-[#c9a962]/70">Proyecto de Sentencia</span>
                                <span className="text-xs text-gray-500 font-mono">{selectedTipo?.id}</span>
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
