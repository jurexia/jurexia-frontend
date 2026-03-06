'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Gavel, Scale, Shield, AlertTriangle, Loader2, Copy, Download, ArrowLeft, CheckCircle, X, Search, ChevronDown, ChevronUp, Edit3, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { UserAvatar } from '@/components/UserAvatar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

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

    // State Machine: 'select' → 'upload' → 'analyzing' → 'estrategia' → 'solving' → 'prompt_review' → 'generating' → 'result'
    const [phase, setPhase] = useState<'select' | 'upload' | 'analyzing' | 'estrategia' | 'solving' | 'prompt_review' | 'generating' | 'result'>('select');

    // New Navigation State
    const [viewState, setViewState] = useState<'tools' | 'jurisdiction' | 'tipos'>('tools');
    const [jurisdiction, setJurisdiction] = useState<'tcc' | 'juzgado' | null>(null); // Keep for data context if needed

    const [showJuzgadoAlert, setShowJuzgadoAlert] = useState(false);
    const [selectedTipo, setSelectedTipo] = useState<TipoConfig | null>(null);
    const [files, setFiles] = useState<(File | null)[]>([null, null]);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [progressStep, setProgressStep] = useState(0);
    const [streamingText, setStreamingText] = useState('');
    const [streamingPhase, setStreamingPhase] = useState<{ step: string; progress: number; group?: number; totalGroups?: number } | null>(null);
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

    // ── V2 state: Genio + RAG solve results ──
    const [genioSolution, setGenioSolution] = useState('');
    const [ragResults, setRagResults] = useState<Array<{ id: string; fuente: string; texto: string; score: number; silo: string }>>([]);
    const [ftPrompt, setFtPrompt] = useState('');
    const [selectedGenio, setSelectedGenio] = useState('amparo');
    const [solveError, setSolveError] = useState('');

    // ── Genio Cache Activation (same pattern as chat) ──
    const [isCacheActive, setIsCacheActive] = useState(false);
    const [isCacheLoading, setIsCacheLoading] = useState(false);
    const [genioError, setGenioError] = useState<string | null>(null);
    const [cacheActivatedAt, setCacheActivatedAt] = useState<number | null>(null);
    const [cacheTimeLeft, setCacheTimeLeft] = useState(0);
    const cacheTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const genioErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    // Countdown ticker — updates every second
    useEffect(() => {
        if (isCacheActive && cacheActivatedAt) {
            countdownRef.current = setInterval(() => {
                const elapsed = Date.now() - cacheActivatedAt;
                const remaining = Math.max(0, CACHE_TTL_MS - elapsed);
                setCacheTimeLeft(remaining);
                if (remaining <= 0) {
                    setIsCacheActive(false);
                    setIsCacheLoading(false);
                    setCacheActivatedAt(null);
                    setCacheTimeLeft(0);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                }
            }, 1000);
            return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
        }
    }, [isCacheActive, cacheActivatedAt]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (genioErrorTimerRef.current) clearTimeout(genioErrorTimerRef.current);
        };
    }, []);

    const handleToggleGenio = useCallback(async (genioId: string) => {
        // If same genio clicked and already active, deactivate
        if (genioId === selectedGenio && isCacheActive) {
            setIsCacheActive(false);
            setIsCacheLoading(false);
            setCacheActivatedAt(null);
            setCacheTimeLeft(0);
            if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
            return;
        }

        setSelectedGenio(genioId);
        setGenioError(null);
        setIsCacheLoading(true);

        try {
            const res = await fetch(`${API_URL}/genio/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genio_id: genioId }),
            });
            const data = await res.json();
            if (data.success) {
                setIsCacheActive(true);
                setIsCacheLoading(false);
                setCacheActivatedAt(Date.now());
                setCacheTimeLeft(CACHE_TTL_MS);
                // Auto-deactivate after TTL
                if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
                cacheTimerRef.current = setTimeout(() => {
                    setIsCacheActive(false);
                    setIsCacheLoading(false);
                    setCacheActivatedAt(null);
                    setCacheTimeLeft(0);
                }, CACHE_TTL_MS);
            } else {
                const errorMsg = data.last_error || `No se pudo activar el Genio ${genioId}`;
                setGenioError(errorMsg);
                setIsCacheLoading(false);
                if (genioErrorTimerRef.current) clearTimeout(genioErrorTimerRef.current);
                genioErrorTimerRef.current = setTimeout(() => setGenioError(null), 5000);
            }
        } catch (err) {
            setGenioError(`Error de conexión al activar Genio ${genioId}`);
            setIsCacheLoading(false);
            if (genioErrorTimerRef.current) clearTimeout(genioErrorTimerRef.current);
            genioErrorTimerRef.current = setTimeout(() => setGenioError(null), 5000);
        }
    }, [selectedGenio, isCacheActive]);

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

    // ── Analyze (v2 — extracts problemas jurídicos) ──────────────────────
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

            const response = await fetch(`${API_URL}/redactor/v2/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            const data = await response.json();

            // Map v2 response to existing AnalysisData format
            const analysisCompat: AnalysisData = {
                resumen_caso: data.resumen_caso || '',
                resumen_acto_reclamado: data.resumen_acto_reclamado || '',
                datos_expediente: {
                    numero: data.expediente?.numero || '?',
                    tipo_asunto: data.tipo || '',
                    quejoso_recurrente: data.expediente?.quejoso || '',
                    autoridades_responsables: data.expediente?.autoridades || [],
                    materia: data.materia || '',
                    tribunal: data.expediente?.tribunal || '',
                },
                agravios: (data.problemas_juridicos || []).map((p: any) => ({
                    numero: p.numero,
                    titulo: p.titulo,
                    resumen: p.descripcion,
                    interrogante: p.interrogante || '',
                    texto_integro: '',
                    articulos_mencionados: p.articulos_mencionados || [],
                    derechos_invocados: [],
                })),
                observaciones_preliminares: data.observaciones || '',
                analysis_time_seconds: 0,
            };
            setAnalysisData(analysisCompat);

            // Auto-fill metadata
            if (data.expediente?.numero) setMetaExpediente(data.expediente.numero);
            if (data.materia) setMetaMateria(data.materia.toUpperCase());
            if (data.expediente?.quejoso) setMetaQuejoso(data.expediente.quejoso);

            // Set default genio from first problema's suggestion
            if (data.problemas_juridicos?.[0]?.genio_sugerido) {
                setSelectedGenio(data.problemas_juridicos[0].genio_sugerido);
            }

            // Build calificaciones from problemas
            const califs: CalificacionEntry[] = (data.problemas_juridicos || []).map((p: any) => ({
                numero: p.numero,
                titulo: p.titulo,
                resumen: p.descripcion,
                calificacion: 'sin_calificar' as const,
                notas: '',
                expanded: false,
                dispositivo: false,
            }));
            setCalificaciones(califs);

            setPhase('estrategia');
        } catch (err: any) {
            setError(err.message || 'Error al analizar el expediente');
            setPhase('upload');
        }
    };

    // ── Solve (v2 — Genio + RAG in parallel) ─────────────────────────────
    const handleSolve = async () => {
        if (!selectedTipo || !user?.email) return;

        setPhase('solving');
        setSolveError('');

        try {
            // Build combined problema text from all calificaciones
            const problemaText = calificaciones.map(c =>
                `${c.titulo}: ${c.resumen} [Calificación: ${c.calificacion}]`
            ).join('\n\n');

            const formData = new FormData();
            formData.append('problema', problemaText);
            formData.append('genio_id', selectedGenio);
            formData.append('tipo', selectedTipo.id);
            formData.append('sentido', sentido || '');
            formData.append('user_email', user.email);

            const response = await fetch(`${API_URL}/redactor/v2/solve`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            const data = await response.json();
            setGenioSolution(data.genio_solution || '');
            setRagResults(data.rag_results || []);
            setFtPrompt(data.prompt || '');
            setRagCount(data.rag_results?.length || 0);

            setPhase('prompt_review');
        } catch (err: any) {
            setSolveError(err.message || 'Error al consultar Genio/RAG');
            setPhase('estrategia');
        }
    };

    // ── Generate (v2 — fine-tuned model with SSE) ──────────────────────────
    const handleGenerate = async () => {
        if (!selectedTipo || !user?.email || !ftPrompt) return;

        setPhase('generating');
        setError('');
        setProgressStep(0);
        setStreamingText('');
        setStreamingPhase(null);

        try {
            const formData = new FormData();
            formData.append('tipo', selectedTipo.id);
            formData.append('user_email', user.email);

            // Build groups from gruposTematicos if available
            if (gruposTematicos.length > 1) {
                const groups = gruposTematicos.map(g => ({
                    titulo: g.tema,
                    numeros: g.agravios_nums,
                    prompt: ftPrompt.replace(
                        /PROBLEMA JURÍDICO:[\s\S]*?(?=FUNDAMENTACIÓN)/,
                        `PROBLEMA JURÍDICO (${term.pluralLower} ${g.agravios_nums.join(', ')}: ${g.tema}):\n${g.agravios_nums.map(n => analysisData?.agravios?.find(a => a.numero === n)?.resumen || '').join('\n')}\n\n`
                    ),
                }));
                formData.append('groups', JSON.stringify(groups));
            } else {
                formData.append('prompt', ftPrompt);
            }

            const response = await fetch(`${API_URL}/redactor/v2/generate`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            // ── SSE streaming (event: text / phase / done / error) ────
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No se pudo iniciar el stream');

            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                let eventType = '';
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.slice(7).trim();
                    } else if (line.startsWith('data: ') && eventType) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (eventType === 'text' && data.chunk) {
                                fullText += data.chunk;
                                setStreamingText(fullText);
                            } else if (eventType === 'phase') {
                                setStreamingPhase({
                                    step: data.step,
                                    progress: data.progress,
                                    group: data.group,
                                    totalGroups: data.total_groups,
                                });
                            } else if (eventType === 'done') {
                                setGenerationInfo({
                                    phasesCompleted: data.groups_completed || 1,
                                    totalChars: data.total_chars || fullText.length,
                                    generationTime: data.elapsed || 0,
                                });
                            } else if (eventType === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (parseErr: any) {
                            if (parseErr.message && !parseErr.message.includes('JSON')) {
                                throw parseErr;
                            }
                        }
                        eventType = '';
                    }
                }
            }

            setResult(fullText);
            if (!generationInfo) {
                setGenerationInfo({
                    phasesCompleted: 1,
                    totalChars: fullText.length,
                    generationTime: 0,
                });
            }
            setPhase('result');
        } catch (err: any) {
            setError(err.message || 'Error al generar la sentencia');
            setPhase('prompt_review');
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
                            className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-10 font-light"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </button>

                        {/* Header */}
                        <div className="mb-10">
                            <p className="text-[#c9a962]/50 text-[11px] tracking-[0.3em] uppercase mb-3 font-light">
                                Estudio de Fondo
                            </p>
                            <h2 className="font-serif text-3xl font-light text-white tracking-tight mb-2">
                                {selectedTipo.label}
                            </h2>
                            <div className="w-12 h-px bg-gradient-to-r from-[#c9a962]/40 to-transparent mb-3" />
                            <p className="text-[13px] text-white/30 font-light">
                                Adjunta los 2 documentos del expediente
                            </p>
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
                            className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${allFilesUploaded
                                ? 'bg-gradient-to-r from-[#c9a962] to-[#b8943f] text-[#0f0f0f] hover:from-[#d4b470] hover:to-[#c9a962] shadow-lg shadow-[#c9a962]/20 hover:shadow-xl hover:shadow-[#c9a962]/30'
                                : 'bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/[0.08]'
                                }`}
                        >
                            Analizar Expediente
                        </button>

                        <p className="text-center text-[11px] text-white/20 mt-4 font-light">
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
                            Iurexia está leyendo tus documentos e identificando los problemas jurídicos
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
                            <div className="mb-5">
                                <p className="text-[#c9a962]/40 text-[11px] tracking-[0.25em] uppercase font-light mb-2">
                                    Expediente
                                </p>
                                <h3 className="font-serif text-xl font-light text-white/90 tracking-tight">Resumen del Expediente</h3>
                                <p className="text-[11px] text-white/25 mt-1 font-light">
                                    Analizado en {analysisData.analysis_time_seconds}s · {analysisData.agravios.length} {term.pluralLower} identificados
                                </p>
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

                        </div>

                        {/* ══ Problemas Jurídicos Identificados ══ */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a]/60 backdrop-blur-sm p-6 mb-6">
                            <div className="mb-5">
                                <p className="text-[#c9a962]/40 text-[11px] tracking-[0.25em] uppercase font-light mb-2">
                                    Problemas Jurídicos
                                </p>
                                <h3 className="font-serif text-xl font-light text-white/90 tracking-tight">
                                    {term.plural} Identificados
                                </h3>
                                <p className="text-[11px] text-white/25 mt-1 font-light">
                                    {analysisData.agravios.length} {term.pluralLower} extraídos de los documentos — revísalos antes de consultar al Genio
                                </p>
                            </div>

                            {analysisData.agravios.length === 0 ? (
                                <div className="p-4 bg-amber-500/[0.06] rounded-xl border border-amber-500/20">
                                    <p className="text-sm text-amber-300/80">⚠️ No se identificaron {term.pluralLower}. Verifica los documentos subidos.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {analysisData.agravios.map((agravio, i) => (
                                        <div key={agravio.numero || i} className="border border-white/[0.06] rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setExpandedAgravio(expandedAgravio === agravio.numero ? null : agravio.numero)}
                                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                                            >
                                                <span className="text-[10px] px-2 py-1 rounded-full bg-[#c9a962]/10 text-[#c9a962] font-semibold flex-shrink-0">
                                                    {term.singular} {agravio.numero || i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white/80 font-medium truncate">{agravio.titulo}</p>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform flex-shrink-0 ${expandedAgravio === agravio.numero ? 'rotate-180' : ''}`} />
                                            </button>
                                            {expandedAgravio === agravio.numero && (
                                                <div className="px-4 pb-4 border-t border-white/[0.04]">
                                                    <p className="text-sm text-white/50 leading-relaxed mt-3">{agravio.resumen}</p>
                                                    {agravio.articulos_mencionados && agravio.articulos_mencionados.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-1">
                                                            {agravio.articulos_mencionados.map((art: string, ai: number) => (
                                                                <span key={ai} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70 border border-blue-500/20">
                                                                    {art}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ══ Problemas Jurídicos Detectados ══ */}
                        <div className="rounded-2xl border border-amber-500/[0.15] bg-[#1a1a1a]/60 backdrop-blur-sm p-6 mb-6">
                            <div className="mb-5">
                                <p className="text-amber-400/40 text-[11px] tracking-[0.25em] uppercase font-light mb-2">
                                    Análisis
                                </p>
                                <h3 className="font-serif text-xl font-light text-white/90 tracking-tight">
                                    Problemas Jurídicos Detectados
                                </h3>
                                <p className="text-[11px] text-white/25 mt-1 font-light">
                                    Síntesis de los problemas que debe resolver la sentencia — activa el Genio y RAG para fundamentar
                                </p>
                            </div>

                            <div className="space-y-3">
                                {analysisData.agravios.map((agravio: any, i: number) => (
                                    <div key={`prob-${agravio.numero || i}`} className="p-4 bg-white/[0.02] rounded-xl border border-amber-500/[0.08]">
                                        <div className="flex items-start gap-3">
                                            <span className="flex-shrink-0 mt-0.5 text-amber-400/70 text-xl">❓</span>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-amber-400/40 uppercase tracking-wider mb-1">
                                                    Problema jurídico {agravio.numero || i + 1}
                                                </p>
                                                <p className="text-sm font-medium text-white/80 italic leading-relaxed mb-2">
                                                    {agravio.interrogante || `¿${agravio.titulo}?`}
                                                </p>
                                                <p className="text-[11px] text-white/30">
                                                    Derivado de: {agravio.titulo}
                                                </p>
                                                {agravio.articulos_mencionados && agravio.articulos_mencionados.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {agravio.articulos_mencionados.map((art: string, ai: number) => (
                                                            <span key={ai} className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/60 border border-amber-500/15">
                                                                {art}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 p-3 bg-amber-500/[0.04] rounded-xl border border-amber-500/10">
                                <p className="text-[11px] text-amber-400/50 text-center leading-relaxed">
                                    👇 Activa el Genio Jurídico correspondiente para obtener la fundamentación legal y determinar el sentido de la resolución
                                </p>
                            </div>
                        </div>

                        {/* ══ Activar y Seleccionar Genio ══ */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a]/60 backdrop-blur-sm p-6 mb-6">
                            <div className="mb-4">
                                <p className="text-[#c9a962]/40 text-[11px] tracking-[0.25em] uppercase font-light mb-2">
                                    Fundamentación
                                </p>
                                <h3 className="font-serif text-xl font-light text-white/90 tracking-tight">
                                    Activar Genio para Fundamentación
                                </h3>
                                <p className="text-[11px] text-white/25 mt-1 font-light">
                                    Selecciona y activa el Genio — se encenderá por 5 minutos máximo
                                </p>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {['amparo', 'civil', 'mercantil', 'penal', 'laboral', 'fiscal', 'administrativo', 'agrario'].map(g => {
                                    const isSelected = selectedGenio === g;
                                    const isActive = isSelected && isCacheActive;
                                    const isLoading = isSelected && isCacheLoading;
                                    return (
                                        <button
                                            key={g}
                                            onClick={() => handleToggleGenio(g)}
                                            disabled={isCacheLoading && !isSelected}
                                            className={`relative px-3 py-2.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 overflow-hidden ${isActive
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-lg shadow-green-500/10'
                                                : isLoading
                                                    ? 'bg-[#c9a962]/10 text-[#c9a962] border border-[#c9a962]/30'
                                                    : isSelected
                                                        ? 'bg-[#c9a962] text-[#0f0f0f] shadow-lg shadow-[#c9a962]/20'
                                                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 border border-white/[0.06]'
                                                } ${isCacheLoading && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="flex items-center justify-center gap-1.5">
                                                {isLoading && (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                )}
                                                {isActive && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                                    </span>
                                                )}
                                                {g}
                                            </span>
                                            {/* TTL countdown bar */}
                                            {isActive && cacheTimeLeft > 0 && (
                                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-500/20">
                                                    <div
                                                        className="h-full bg-green-400 transition-all duration-1000 ease-linear"
                                                        style={{ width: `${(cacheTimeLeft / CACHE_TTL_MS) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Status indicator */}
                            {isCacheActive && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/[0.06] border border-green-500/[0.12] mb-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                    </span>
                                    <span className="text-[11px] text-green-400/80">
                                        Genio {selectedGenio.charAt(0).toUpperCase() + selectedGenio.slice(1)} activo — {Math.ceil(cacheTimeLeft / 60000)}:{String(Math.floor((cacheTimeLeft % 60000) / 1000)).padStart(2, '0')} restantes
                                    </span>
                                </div>
                            )}
                            {isCacheLoading && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#c9a962]/[0.06] border border-[#c9a962]/[0.12] mb-1">
                                    <Loader2 className="w-3 h-3 text-[#c9a962] animate-spin" />
                                    <span className="text-[11px] text-[#c9a962]/80">Activando Genio {selectedGenio.charAt(0).toUpperCase() + selectedGenio.slice(1)}...</span>
                                </div>
                            )}
                            {genioError && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/[0.15] mb-1">
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span className="text-[11px] text-red-400/80">{genioError}</span>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Solve Button */}
                        <button
                            onClick={handleSolve}
                            disabled={!isCacheActive}
                            className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${isCacheActive
                                ? 'bg-gradient-to-r from-[#c9a962] to-[#b8943f] text-[#0f0f0f] hover:from-[#d4b470] hover:to-[#c9a962] shadow-lg shadow-[#c9a962]/20 hover:shadow-xl hover:shadow-[#c9a962]/30'
                                : 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.08]'
                                }`}
                        >
                            {isCacheActive
                                ? `⚖️ Consultar Genio ${selectedGenio.charAt(0).toUpperCase() + selectedGenio.slice(1)} + RAG`
                                : '🔒 Activa un Genio para consultar'
                            }
                        </button>

                        <p className="text-center text-xs text-gray-500 mt-4">
                            {isCacheActive
                                ? 'Tras la consulta configurarás el sentido, calificación e instrucciones de redacción'
                                : 'Selecciona un Genio arriba para encenderlo — se activará por máximo 5 minutos'
                            }
                        </p>
                    </div>
                )}


                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE: SOLVING (Genio + RAG loading)                       */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'solving' && (
                    <div className="max-w-4xl mx-auto py-8">
                        <div className="text-center mb-8">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full bg-[#c9a962]/10 animate-ping" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Search className="w-9 h-9 text-[#c9a962] animate-pulse" />
                                </div>
                            </div>
                            <h2 className="font-serif text-2xl font-medium text-white mb-2">
                                Consultando Genio + RAG
                            </h2>
                            <p className="text-white/40 text-sm">
                                Buscando fundamentación legal y jurisprudencias aplicables...
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <Loader2 className="w-5 h-5 text-[#c9a962] animate-spin" />
                                <span className="text-sm text-white/60">Consultando Genio {selectedGenio.charAt(0).toUpperCase() + selectedGenio.slice(1)}...</span>
                            </div>
                            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <Loader2 className="w-5 h-5 text-[#c9a962] animate-spin" />
                                <span className="text-sm text-white/60">Buscando tesis y jurisprudencias en Qdrant RAG...</span>
                            </div>
                        </div>
                    </div>
                )}


                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE: PROMPT REVIEW (review Genio + RAG, edit prompt)     */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'prompt_review' && (
                    <div className="max-w-4xl mx-auto py-8">
                        <button
                            onClick={() => setPhase('estrategia')}
                            className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-6 font-light"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver a Estrategia
                        </button>

                        <h2 className="font-serif text-2xl font-medium text-white mb-8">
                            Revisión del Prompt
                        </h2>

                        {/* Genio Solution */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 text-sm font-medium text-[#c9a962] mb-3">
                                <Sparkles className="w-4 h-4" />
                                Fundamentación del Genio {selectedGenio.charAt(0).toUpperCase() + selectedGenio.slice(1)}
                            </h3>
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 max-h-60 overflow-y-auto">
                                <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">{genioSolution || 'Sin resultados'}</p>
                            </div>
                        </div>

                        {/* RAG Results */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 text-sm font-medium text-[#c9a962] mb-3">
                                <Search className="w-4 h-4" />
                                Tesis y Jurisprudencias ({ragResults.length} encontradas)
                            </h3>
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.04] max-h-60 overflow-y-auto">
                                {ragResults.length > 0 ? ragResults.slice(0, 10).map((r, i) => (
                                    <div key={r.id || i} className="px-5 py-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-[#c9a962]/70">{r.fuente || 'Sin fuente'}</span>
                                            <span className="text-[10px] text-white/20 px-2 py-0.5 rounded-full bg-white/[0.04]">
                                                {r.silo} • {r.score}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/40 line-clamp-2">{r.texto}</p>
                                    </div>
                                )) : (
                                    <div className="px-5 py-4 text-sm text-white/30">No se encontraron tesis relevantes</div>
                                )}
                            </div>
                        </div>

                        {/* Editable Prompt */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 text-sm font-medium text-[#c9a962] mb-3">
                                <Edit3 className="w-4 h-4" />
                                Prompt para el Modelo Fine-tuned
                                <span className="text-[10px] text-white/20 ml-auto">~{Math.round(ftPrompt.length / 4).toLocaleString()} tokens est.</span>
                            </h3>
                            <textarea
                                value={ftPrompt}
                                onChange={(e) => setFtPrompt(e.target.value)}
                                rows={12}
                                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 text-sm text-white/70 font-mono leading-relaxed resize-y focus:outline-none focus:border-[#c9a962]/30 transition-colors"
                            />
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            className="w-full py-4 rounded-full text-sm font-medium tracking-wide bg-gradient-to-r from-[#c9a962] to-[#b8943f] text-[#0f0f0f] hover:from-[#d4b470] hover:to-[#c9a962] shadow-lg shadow-[#c9a962]/20 hover:shadow-xl hover:shadow-[#c9a962]/30 transition-all duration-300"
                        >
                            ✨ Generar Estudio de Fondo
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-3">
                            Solo se genera el estudio de fondo — después podrás unirlo con tu adelanto (consideraciones previas) para la sentencia completa
                        </p>
                    </div>
                )}


                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PHASE 3: GENERATING                                        */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'generating' && (
                    <div className="max-w-4xl mx-auto py-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full bg-[#c9a962]/10 animate-ping" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Gavel className="w-9 h-9 text-[#c9a962] animate-pulse" />
                                </div>
                            </div>
                            <h2 className="font-serif text-2xl font-medium text-white mb-2">
                                Redactando Estudio de Fondo
                            </h2>
                        </div>

                        {/* Real Progress Bar */}
                        {streamingPhase && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">{streamingPhase.step}</span>
                                    <div className="flex items-center gap-2">
                                        {streamingPhase.totalGroups && streamingPhase.totalGroups > 1 && (
                                            <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/[0.04]">
                                                Grupo {streamingPhase.group}/{streamingPhase.totalGroups}
                                            </span>
                                        )}
                                        <span className="text-xs text-[#c9a962] font-medium">{streamingPhase.progress}%</span>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#c9a962] to-[#8b7355] rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${streamingPhase.progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Streaming Text Preview */}
                        {streamingText ? (
                            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#111]">
                                    <span className="text-xs text-[#c9a962]/70 tracking-wider uppercase font-medium">
                                        Vista previa — Generando...
                                    </span>
                                    <span className="text-xs text-white/30">
                                        {streamingText.length.toLocaleString()} caracteres
                                    </span>
                                </div>
                                <div className="p-6 max-h-[60vh] overflow-y-auto">
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <pre className="whitespace-pre-wrap text-sm text-white/70 font-sans leading-relaxed">
                                            {streamingText}
                                            <span className="inline-block w-2 h-4 bg-[#c9a962] animate-pulse ml-0.5" />
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Loader2 className="w-6 h-6 text-[#c9a962] animate-spin mx-auto mb-3" />
                                <p className="text-sm text-white/30">Preparando pipeline...</p>
                            </div>
                        )}
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
                                    <p className="text-xs text-gray-400">Suba su adelanto (consideraciones previas) para integrar la sentencia completa</p>
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

