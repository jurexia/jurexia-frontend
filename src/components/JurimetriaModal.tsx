'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, BarChart2, AlertCircle, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConceptoAnalisis {
    n: number;
    tipo: string;
    prediccion: 'inoperante' | 'infundado' | 'fundado';
    razon: string;
}

interface Extraccion {
    acto_reclamado_tipo?: string;
    autoridad_responsable?: string;
    materia?: string;
    n_conceptos?: number;
    conceptos_analisis?: ConceptoAnalisis[];
    tema_juridico?: string;
    complejidad_estimada?: string;
}

interface Estadistica {
    sentido_probable: string;
    probabilidades: Record<string, number>;
    n_base: number;
    por_circuito: Record<string, Record<string, number>>;
    factor_dominante?: string;
    magistrados_frecuentes?: string[];
    ratio_inoperantes_historico?: number;
    confianza: 'alta' | 'media' | 'baja';
}

interface PrecedenteAnaogo {
    ref: string;
    circuito: string;
    holding: string;
    score: number;
    pdf_url?: string;
}

interface JurimetriaResult {
    modo: 'basico' | 'secretario';
    extraccion: Extraccion;
    estadistica: Estadistica;
    narrativa: string;
    precedentes_analogos: PrecedenteAnaogo[];
    tiempo_segundos: number;
}

interface JurimetriaModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SENTIDO_COLOR: Record<string, string> = {
    CONCEDE:  'bg-emerald-500',
    NIEGA:    'bg-rose-500',
    SOBRESEE: 'bg-amber-400',
    OTRO:     'bg-gray-400',
};

const SENTIDO_LABEL: Record<string, string> = {
    CONCEDE:  'Concede',
    NIEGA:    'Niega',
    SOBRESEE: 'Sobresee / Sin materia',
    OTRO:     'Otro',
};

const PREDICCION_COLOR: Record<string, string> = {
    fundado:    'text-emerald-700 bg-emerald-50 border-emerald-200',
    infundado:  'text-rose-700 bg-rose-50 border-rose-200',
    inoperante: 'text-amber-700 bg-amber-50 border-amber-200',
};

const CONFIANZA_COLOR: Record<string, string> = {
    alta:  'text-emerald-700 bg-emerald-50',
    media: 'text-amber-700 bg-amber-50',
    baja:  'text-rose-700 bg-rose-50',
};

const ACTO_TIPOS = [
    { value: '', label: 'Cualquier tipo (global)' },
    { value: 'jurisdiccional_laboral',       label: 'Jurisdiccional laboral' },
    { value: 'jurisdiccional_civil',         label: 'Jurisdiccional civil' },
    { value: 'jurisdiccional_penal',         label: 'Jurisdiccional penal' },
    { value: 'jurisdiccional_administrativo',label: 'Jurisdiccional administrativo' },
    { value: 'administrativo_federal',       label: 'Administrativo federal' },
    { value: 'administrativo_estatal',       label: 'Administrativo estatal' },
    { value: 'administrativo_municipal',     label: 'Administrativo municipal' },
    { value: 'omision',                      label: 'Omisión' },
    { value: 'legislativo',                  label: 'Legislativo' },
];

const MATERIAS = [
    { value: '', label: 'Cualquier materia' },
    { value: 'laboral',         label: 'Laboral' },
    { value: 'civil',           label: 'Civil' },
    { value: 'penal',           label: 'Penal' },
    { value: 'administrativo',  label: 'Administrativo' },
    { value: 'constitucional',  label: 'Constitucional' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

// ── Sub-components ─────────────────────────────────────────────────────────────

function FileDropZone({
    label,
    hint,
    file,
    onChange,
}: {
    label: string;
    hint: string;
    file: File | null;
    onChange: (f: File | null) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div>
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
            <div
                onClick={() => ref.current?.click()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                    ${file ? 'border-[#c9a962] bg-amber-50' : 'border-gray-200 hover:border-[#c9a962]/50 bg-gray-50'}`}
            >
                {file ? (
                    <>
                        <FileText size={16} className="text-[#c9a962] shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                            onClick={e => { e.stopPropagation(); onChange(null); }}
                            className="text-gray-400 hover:text-gray-600 shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </>
                ) : (
                    <>
                        <Upload size={16} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500">{hint}</p>
                        </div>
                    </>
                )}
            </div>
            <input
                ref={ref}
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={e => onChange(e.target.files?.[0] ?? null)}
            />
        </div>
    );
}

function ProbabilityBar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-gray-600">{label}</span>
                <span className="font-bold text-gray-800">{Math.round(value * 100)}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
                    style={{ width: `${Math.round(value * 100)}%` }}
                />
            </div>
        </div>
    );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function JurimetriaModal({ isOpen, onClose, userEmail }: JurimetriaModalProps) {
    const [modo, setModo] = useState<'basico' | 'secretario'>('basico');
    const [descripcion, setDescripcion] = useState('');
    const [circuito, setCircuito] = useState('');
    const [materia, setMateria] = useState('');
    const [actoTipo, setActoTipo] = useState('');
    const [fileRD, setFileRD] = useState<File | null>(null);
    const [fileCP, setFileCP] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<JurimetriaResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const canSubmit = descripcion.trim().length > 10 || fileRD || fileCP;

    const handleReset = () => {
        setResult(null);
        setError(null);
        setDescripcion('');
        setFileRD(null);
        setFileCP(null);
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const form = new FormData();
            form.append('user_email', userEmail);
            if (descripcion.trim()) form.append('descripcion', descripcion.trim());
            if (circuito) form.append('circuito', circuito);
            if (materia) form.append('materia', materia);
            if (actoTipo) form.append('acto_tipo', actoTipo);
            if (fileRD) form.append('ratio_decidendi', fileRD);
            if (fileCP) form.append('causa_petendi', fileCP);

            const res = await fetch(`${API_URL}/api/jurimetria`, {
                method: 'POST',
                body: form,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || `Error ${res.status}`);
            }
            setResult(await res.json());
        } catch (e: any) {
            setError(e.message || 'Error inesperado');
        } finally {
            setLoading(false);
        }
    };

    const sentidoProbable = result?.estadistica.sentido_probable ?? '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#c9a962]/20">
                            <BarChart2 size={18} className="text-[#c9a962]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wide">Jurimetría</h2>
                            <p className="text-[10px] text-gray-400">Predicción de sentido basada en precedentes judiciales</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">
                    {!result ? (
                        <div className="p-5 space-y-4">
                            {/* Mode tabs */}
                            <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
                                {(['basico', 'secretario'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setModo(m)}
                                        className={`flex-1 py-1.5 rounded-md transition-all ${
                                            modo === m
                                                ? 'bg-white text-[#1a1a2e] shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {m === 'basico' ? 'Básico (descripción)' : 'Secretario (documentos)'}
                                    </button>
                                ))}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                    {modo === 'basico' ? 'Descripción del asunto *' : 'Descripción del asunto (opcional)'}
                                </label>
                                <textarea
                                    value={descripcion}
                                    onChange={e => setDescripcion(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: Amparo directo en materia laboral, despido injustificado de trabajador de confianza, la Junta declaró improcedente la acción..."
                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#c9a962]/40 focus:border-[#c9a962] placeholder-gray-400"
                                />
                            </div>

                            {/* Secretario: file uploads */}
                            {modo === 'secretario' && (
                                <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                                        Adjunta los documentos del caso
                                    </p>
                                    <FileDropZone
                                        label="Acto reclamado / Sentencia recurrida"
                                        hint="PDF o DOCX — ratio decidendi (acto que se impugna)"
                                        file={fileRD}
                                        onChange={setFileRD}
                                    />
                                    <FileDropZone
                                        label="Agravios / Conceptos de violación"
                                        hint="PDF o DOCX — causa petendi (argumentos del quejoso)"
                                        file={fileCP}
                                        onChange={setFileCP}
                                    />
                                </div>
                            )}

                            {/* Filters row */}
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Circuito</label>
                                    <input
                                        type="text"
                                        value={circuito}
                                        onChange={e => setCircuito(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Global"
                                        maxLength={2}
                                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a962]/40 focus:border-[#c9a962]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Materia</label>
                                    <select
                                        value={materia}
                                        onChange={e => setMateria(e.target.value)}
                                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a962]/40 bg-white"
                                    >
                                        {MATERIAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo de acto</label>
                                    <select
                                        value={actoTipo}
                                        onChange={e => setActoTipo(e.target.value)}
                                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a962]/40 bg-white"
                                    >
                                        {ACTO_TIPOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit || loading}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                                    ${canSubmit && !loading
                                        ? 'bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-[#c9a962] hover:opacity-90 shadow-md'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Analizando precedentes...
                                    </>
                                ) : (
                                    <>
                                        <BarChart2 size={15} />
                                        Predecir sentido probable
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[10px] text-gray-400">
                                Análisis global sobre {circuito ? `${circuito}° Circuito` : 'todos los circuitos disponibles'} · Exclusivo plan Platinum
                            </p>
                        </div>
                    ) : (
                        /* ── Results ── */
                        <div className="p-5 space-y-5">

                            {/* Prediction header */}
                            <div className={`rounded-xl p-4 text-white ${
                                sentidoProbable === 'CONCEDE' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' :
                                sentidoProbable === 'NIEGA'   ? 'bg-gradient-to-r from-rose-600 to-rose-700' :
                                'bg-gradient-to-r from-amber-500 to-amber-600'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Sentido más probable</p>
                                        <p className="text-2xl font-black tracking-wide mt-0.5">
                                            {SENTIDO_LABEL[sentidoProbable] ?? sentidoProbable}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CONFIANZA_COLOR[result.estadistica.confianza]} bg-white/20 text-white`}>
                                            Confianza {result.estadistica.confianza}
                                        </span>
                                        <p className="text-[11px] opacity-80 mt-1">{result.estadistica.n_base} precedentes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Probability bars */}
                            <div className="space-y-2.5">
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Distribución de sentidos</p>
                                {Object.entries(result.estadistica.probabilidades)
                                    .filter(([, v]) => v > 0)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([k, v]) => (
                                        <ProbabilityBar
                                            key={k}
                                            label={SENTIDO_LABEL[k] ?? k}
                                            value={v}
                                            colorClass={SENTIDO_COLOR[k] ?? 'bg-gray-400'}
                                        />
                                    ))}
                            </div>

                            {/* Per-circuit breakdown */}
                            {Object.keys(result.estadistica.por_circuito).length > 1 && (
                                <div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Por circuito</p>
                                    <div className="space-y-1">
                                        {Object.entries(result.estadistica.por_circuito)
                                            .sort(([a], [b]) => Number(a) - Number(b))
                                            .map(([circ, dist]) => (
                                                <div key={circ} className="flex items-center gap-2 text-xs">
                                                    <span className="text-gray-500 w-16 shrink-0">{circ}° Circ.</span>
                                                    <div className="flex gap-1 flex-1">
                                                        {Object.entries(dist).sort(([,a],[,b]) => b-a).map(([k, v]) => (
                                                            <span key={k} className={`px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${SENTIDO_COLOR[k] ?? 'bg-gray-400'}`}>
                                                                {SENTIDO_LABEL[k]?.split('/')[0] ?? k} {Math.round(v * 100)}%
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Concept analysis (secretario mode) */}
                            {result.extraccion?.conceptos_analisis && result.extraccion.conceptos_analisis.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                                        Análisis por {result.extraccion.n_conceptos && result.extraccion.n_conceptos > 1 ? 'conceptos / agravios' : 'concepto / agravio'}
                                    </p>
                                    <div className="space-y-2">
                                        {result.extraccion.conceptos_analisis.map(c => (
                                            <div key={c.n} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                                                <div className="w-5 h-5 rounded-full bg-[#1a1a2e] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                    {c.n}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] text-gray-500 capitalize">{c.tipo?.replace(/_/g, ' ')}</span>
                                                        <ChevronRight size={10} className="text-gray-300" />
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${PREDICCION_COLOR[c.prediccion] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                                                            {c.prediccion}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-0.5">{c.razon}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats chips */}
                            {(result.estadistica.factor_dominante || result.estadistica.ratio_inoperantes_historico) && (
                                <div className="flex flex-wrap gap-2">
                                    {result.estadistica.factor_dominante && (
                                        <div className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                            Factor: {result.estadistica.factor_dominante.replace(/_/g, ' ')}
                                        </div>
                                    )}
                                    {result.estadistica.ratio_inoperantes_historico !== null && result.estadistica.ratio_inoperantes_historico !== undefined && (
                                        <div className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                                            Ratio inoperantes histórico: {Math.round((result.estadistica.ratio_inoperantes_historico ?? 0) * 100)}%
                                        </div>
                                    )}
                                    {result.estadistica.magistrados_frecuentes?.slice(0, 2).map(m => (
                                        <div key={m} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded-full border border-gray-200">
                                            {m}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Narrative */}
                            {result.narrativa && (
                                <div className="p-3.5 bg-[#1a1a2e]/5 rounded-xl border border-[#1a1a2e]/10">
                                    <p className="text-[11px] font-bold text-[#1a1a2e] uppercase tracking-wide mb-2">Análisis predictivo</p>
                                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{result.narrativa}</p>
                                </div>
                            )}

                            {/* Analogous precedents */}
                            {result.precedentes_analogos.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Precedentes más análogos</p>
                                    <div className="space-y-2">
                                        {result.precedentes_analogos.map((p, i) => (
                                            <div key={i} className="p-2.5 rounded-lg border border-gray-100 bg-white text-xs">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="font-semibold text-gray-800">{p.ref}</span>
                                                    {p.pdf_url && (
                                                        <a
                                                            href={p.pdf_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="shrink-0 flex items-center gap-1 text-[#c9a962] hover:underline"
                                                        >
                                                            <ExternalLink size={11} />
                                                            PDF
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 line-clamp-2">{p.holding}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-center text-[10px] text-gray-400">
                                Análisis completado en {result.tiempo_segundos}s · {result.modo === 'secretario' ? 'Modo secretario' : 'Modo básico'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                {result && (
                    <div className="shrink-0 flex gap-2 px-5 py-3 border-t border-gray-100">
                        <button
                            onClick={handleReset}
                            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Nueva consulta
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 rounded-xl bg-[#1a1a2e] text-sm font-semibold text-[#c9a962] hover:opacity-90 transition-opacity"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
