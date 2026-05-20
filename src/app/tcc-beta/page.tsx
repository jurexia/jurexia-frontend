'use client';

/**
 * Redactor TCC — Pipeline v4 con humano en el loop.
 *
 * Flujo:
 *   1) Formulario: tipo + materia + circuito + PDFs (con OCR Mistral) o textos.
 *   2) POST /redactor/tcc-v4/analyze (SSE multipart) → OCR + Pass 0/1/2 → plan + job_id.
 *   3) UI del secretario: lista lateral de problemas + detalle a la derecha.
 *      Atajos J/K navegar · Ctrl+Enter siguiente.
 *      Auto-save de edits en localStorage por job_id.
 *   4) POST /redactor/tcc-v4/finalize (JSON) → Pass 3 streaming del estudio.
 *
 * Reemplazó al v3 multipass full-auto que vivía en esta misma ruta.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, Check, X, Star, AlertTriangle, Copy, Upload, FileText, Shield,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

const TIPOS_ASUNTO = [
    { id: 'amparo_directo', label: 'Amparo Directo', actoLabel: 'Sentencia/laudo reclamado', cvLabel: 'Conceptos de violación' },
    { id: 'amparo_revision', label: 'Amparo en Revisión', actoLabel: 'Sentencia recurrida', cvLabel: 'Agravios' },
    { id: 'revision_fiscal', label: 'Revisión Fiscal', actoLabel: 'Sentencia del TFJA', cvLabel: 'Agravios' },
    { id: 'recurso_queja', label: 'Recurso de Queja', actoLabel: 'Determinación recurrida', cvLabel: 'Agravios' },
];
const MATERIAS = ['civil', 'penal', 'administrativa', 'laboral', 'familiar', 'mercantil'];
const CIRCUITOS = Array.from({ length: 32 }, (_, i) => i + 1);

const CALIFICACIONES = [
    'fundado', 'parcialmente_fundado', 'esencialmente_fundado',
    'infundado', 'inoperante', 'inatendible',
];
const ACCIONES = ['abordar_completo', 'abordar_complementario', 'omitir_por_innecesario'];

type TesisDecision = 'rector' | 'apoyo' | 'descartar' | null;

interface TesisItem {
    registro?: string;
    rubro_corto?: string; rubro_real?: string; rubro?: string;
    instancia?: string;
    como_se_aplica_al_caso?: string;
    verificable?: boolean;
    razon_no_verificable?: string;
}
interface ProblemaPlan {
    problema_id: string;
    pregunta_concreta: string;
    thesis_central_a_demostrar?: string;
    calificacion_propuesta_disidencia?: string;
    accion_redaccion?: string;
    tesis_clave_a_citar?: TesisItem[];
}
interface PlanData { plan_por_problema?: ProblemaPlan[]; }

interface EditState {
    calificacion: string;
    accion: string;
    tesisDecisions: Record<string, TesisDecision>;
    instruccion: string;
    estado: 'pendiente' | 'resuelto' | 'diferido' | 'inoperante_manual';
}

type Phase = 'form' | 'analyzing' | 'review' | 'finalizing' | 'done' | 'error';

export default function TccBetaPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const canAccess = isAdmin(user?.email);

    // ─── Form ───
    const [tipoAsunto, setTipoAsunto] = useState(TIPOS_ASUNTO[0].id);
    const [materia, setMateria] = useState('civil');
    const [circuito, setCircuito] = useState(1);
    const [fileActo, setFileActo] = useState<File | null>(null);
    const [fileConceptos, setFileConceptos] = useState<File | null>(null);
    const [textoActo, setTextoActo] = useState('');
    const [textoConceptos, setTextoConceptos] = useState('');
    const [inputMode, setInputMode] = useState<'files' | 'text'>('files');

    // ─── Pipeline ───
    const [phase, setPhase] = useState<Phase>('form');
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState('');

    // ─── Analyze result ───
    const [jobId, setJobId] = useState<string | null>(null);
    const [plan, setPlan] = useState<PlanData | null>(null);

    // ─── Edits ───
    const [edits, setEdits] = useState<Record<string, EditState>>({});
    const [activeIdx, setActiveIdx] = useState(0);

    // ─── Finalize ───
    const [estudioMd, setEstudioMd] = useState('');
    const [finalStats, setFinalStats] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!jobId) return;
        try {
            localStorage.setItem(`tcc-v4-edits-${jobId}`, JSON.stringify({ edits, activeIdx }));
        } catch {}
    }, [edits, activeIdx, jobId]);

    useEffect(() => {
        if (!plan || !jobId) return;
        const initial: Record<string, EditState> = {};
        for (const prob of plan.plan_por_problema || []) {
            const decisions: Record<string, TesisDecision> = {};
            for (const t of prob.tesis_clave_a_citar || []) {
                if (t.registro) decisions[t.registro] = null;
            }
            initial[prob.problema_id] = {
                calificacion: prob.calificacion_propuesta_disidencia || '',
                accion: prob.accion_redaccion || 'abordar_completo',
                tesisDecisions: decisions,
                instruccion: '',
                estado: 'pendiente',
            };
        }
        try {
            const raw = localStorage.getItem(`tcc-v4-edits-${jobId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.edits) {
                    Object.assign(initial, parsed.edits);
                    setActiveIdx(parsed.activeIdx ?? 0);
                }
            }
        } catch {}
        setEdits(initial);
    }, [plan, jobId]);

    const problemas = plan?.plan_por_problema || [];
    const activeProb = problemas[activeIdx];
    const activeEdit = activeProb ? edits[activeProb.problema_id] : null;

    const setTesisDecision = useCallback((registro: string, decision: TesisDecision) => {
        if (!activeProb) return;
        setEdits((prev) => ({
            ...prev,
            [activeProb.problema_id]: {
                ...prev[activeProb.problema_id],
                tesisDecisions: { ...prev[activeProb.problema_id].tesisDecisions, [registro]: decision },
            },
        }));
    }, [activeProb]);

    // J/K + Ctrl+Enter
    useEffect(() => {
        if (phase !== 'review') return;
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
            if (e.key === 'j' || e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, problemas.length - 1));
            } else if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, problemas.length - 1));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [phase, problemas.length]);

    // ─── SSE parser helper ───
    const parseSSE = (
        buf: string,
        onEvent: (evType: string, data: any) => void,
    ): string => {
        const events = buf.split('\n\n');
        const rest = events.pop() || '';
        for (const ev of events) {
            const lines = ev.split('\n');
            let evType = '';
            let evData = '';
            for (const ln of lines) {
                if (ln.startsWith('event: ')) evType = ln.slice(7).trim();
                else if (ln.startsWith('data: ')) evData = ln.slice(6);
            }
            if (!evData) continue;
            try { onEvent(evType, JSON.parse(evData)); } catch {}
        }
        return rest;
    };

    // ─── Analyze ───
    const startAnalyze = async () => {
        const hasFiles = inputMode === 'files' && (fileActo || fileConceptos);
        const hasText = inputMode === 'text' && (textoActo.trim() || textoConceptos.trim());
        if (!hasFiles && !hasText) {
            setError('Sube los PDFs o pega el texto de ambos documentos.');
            return;
        }
        if (inputMode === 'files' && (!fileActo || !fileConceptos)) {
            setError('Faltan ambos PDFs (acto reclamado y conceptos/agravios).');
            return;
        }
        if (inputMode === 'text' && (!textoActo.trim() || !textoConceptos.trim())) {
            setError('Faltan ambos textos.');
            return;
        }
        setError('');
        setPhase('analyzing');
        setProgress('Iniciando análisis...');

        const fd = new FormData();
        fd.append('tipo_asunto', tipoAsunto);
        fd.append('materia', materia);
        fd.append('circuito', String(circuito));
        fd.append('user_email', user?.email || '');
        if (inputMode === 'files') {
            if (fileActo) fd.append('doc_acto', fileActo);
            if (fileConceptos) fd.append('doc_conceptos', fileConceptos);
        } else {
            fd.append('texto_acto_reclamado', textoActo);
            fd.append('texto_conceptos_agravios', textoConceptos);
        }

        const ac = new AbortController();
        abortRef.current = ac;
        try {
            const resp = await fetch(`${API_URL}/redactor/tcc-v4/analyze`, {
                method: 'POST', body: fd, signal: ac.signal,
            });
            if (!resp.ok || !resp.body) {
                setError(`HTTP ${resp.status}`); setPhase('error'); return;
            }
            const reader = resp.body.getReader();
            const dec = new TextDecoder();
            let buf = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                buf = parseSSE(buf, (evType, data) => {
                    if (evType === 'phase') setProgress(data.detail || '');
                    else if (evType === 'pass_complete') setProgress(`Pass ${data.pass} listo (${data.elapsed_s}s).`);
                    else if (evType === 'plan_ready') {
                        setJobId(data.job_id);
                        setPlan(data.plan);
                        setPhase('review');
                    } else if (evType === 'error') {
                        setError(data.message || 'Error');
                        setPhase('error');
                    }
                });
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') { setError(String(e?.message || e)); setPhase('error'); }
        }
    };

    // ─── Finalize ───
    const startFinalize = async () => {
        if (!jobId || !plan) return;
        const editsPayload = {
            problemas: (plan.plan_por_problema || []).map((prob) => {
                const e = edits[prob.problema_id];
                if (!e) return { problema_id: prob.problema_id };
                const aprobadas: string[] = [];
                for (const [reg, dec] of Object.entries(e.tesisDecisions)) {
                    if (dec === 'rector' || dec === 'apoyo') aprobadas.push(reg);
                }
                const accionFinal = e.estado === 'inoperante_manual' ? 'omitir_por_innecesario' : e.accion;
                return {
                    problema_id: prob.problema_id,
                    calificacion_override: e.calificacion || undefined,
                    accion_redaccion_override: accionFinal || undefined,
                    tesis_aprobadas: aprobadas,
                    instruccion_secretario: e.instruccion || '',
                };
            }),
        };

        setPhase('finalizing');
        setProgress('Iniciando redacción...');
        setEstudioMd('');

        const ac = new AbortController();
        abortRef.current = ac;
        try {
            const resp = await fetch(`${API_URL}/redactor/tcc-v4/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId, user_email: user?.email,
                    tipo_asunto: tipoAsunto, materia, circuito: String(circuito),
                    edits: editsPayload,
                }),
                signal: ac.signal,
            });
            if (!resp.ok || !resp.body) { setError(`HTTP ${resp.status}`); setPhase('error'); return; }
            const reader = resp.body.getReader();
            const dec = new TextDecoder();
            let buf = '';
            let acc = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                buf = parseSSE(buf, (evType, data) => {
                    if (evType === 'token') { acc += data.text || ''; setEstudioMd(acc); }
                    else if (evType === 'phase') setProgress(data.detail || '');
                    else if (evType === 'pass_complete') setProgress(`Pass ${data.pass} listo (${data.elapsed_s}s).`);
                    else if (evType === 'complete') {
                        setEstudioMd(data.estudio_markdown || acc);
                        setFinalStats(data);
                        setPhase('done');
                        try { localStorage.removeItem(`tcc-v4-edits-${jobId}`); } catch {}
                    } else if (evType === 'error') { setError(data.message || 'Error'); setPhase('error'); }
                });
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') { setError(String(e?.message || e)); setPhase('error'); }
        }
    };

    if (authLoading) return null;
    if (!canAccess) {
        return (
            <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
                <div className="bg-white border border-amber-300 rounded-lg p-8 max-w-md text-center">
                    <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
                    <p className="text-gray-600 mb-4">Redactor TCC está en pruebas internas (solo admin).</p>
                    <Link href="/" className="text-blue-600 hover:underline">Volver al inicio</Link>
                </div>
            </div>
        );
    }

    const tipoMeta = TIPOS_ASUNTO.find((t) => t.id === tipoAsunto)!;
    const allResolved = problemas.length > 0 && problemas.every(
        (p) => edits[p.problema_id]?.estado !== 'pendiente'
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Link href="/" className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-semibold">
                        Redactor TCC <span className="text-xs font-normal text-gray-500">— humano en el loop</span>
                    </h1>
                    {phase === 'review' && (
                        <span className="ml-auto text-sm text-gray-500">
                            <kbd className="px-1 bg-gray-100 border rounded">J</kbd>/<kbd className="px-1 bg-gray-100 border rounded">K</kbd> navegar · <kbd className="px-1 bg-gray-100 border rounded">Ctrl+↵</kbd> siguiente
                        </span>
                    )}
                </div>
            </header>

            {/* FORM */}
            {phase === 'form' && (
                <div className="max-w-3xl mx-auto p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Nuevo proyecto</h2>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">Tipo de asunto</label>
                            <select className="w-full border rounded px-3 py-2" value={tipoAsunto} onChange={(e) => setTipoAsunto(e.target.value)}>
                                {TIPOS_ASUNTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Materia</label>
                            <select className="w-full border rounded px-3 py-2" value={materia} onChange={(e) => setMateria(e.target.value)}>
                                {MATERIAS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Circuito</label>
                            <select className="w-full border rounded px-3 py-2" value={circuito} onChange={(e) => setCircuito(Number(e.target.value))}>
                                {CIRCUITOS.map((c) => <option key={c} value={c}>{c}°</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => setInputMode('files')} className={`px-3 py-1.5 text-sm rounded ${inputMode === 'files' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>📎 Subir PDFs (con OCR)</button>
                            <button onClick={() => setInputMode('text')} className={`px-3 py-1.5 text-sm rounded ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>📝 Pegar texto</button>
                        </div>

                        {inputMode === 'files' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <FileDrop
                                    label={tipoMeta.actoLabel}
                                    file={fileActo}
                                    onChange={setFileActo}
                                />
                                <FileDrop
                                    label={tipoMeta.cvLabel}
                                    file={fileConceptos}
                                    onChange={setFileConceptos}
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium block mb-1">{tipoMeta.actoLabel}</label>
                                    <textarea className="w-full border rounded px-3 py-2 font-mono text-xs" rows={8} value={textoActo} onChange={(e) => setTextoActo(e.target.value)} placeholder="Pega el texto..." />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">{tipoMeta.cvLabel}</label>
                                    <textarea className="w-full border rounded px-3 py-2 font-mono text-xs" rows={8} value={textoConceptos} onChange={(e) => setTextoConceptos(e.target.value)} placeholder="Pega el texto..." />
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
                    )}
                    <button onClick={startAnalyze} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium">
                        Analizar
                    </button>
                </div>
            )}

            {/* ANALYZING */}
            {phase === 'analyzing' && (
                <div className="max-w-2xl mx-auto p-8 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
                    <p className="text-gray-700">{progress || 'Analizando...'}</p>
                    <p className="text-xs text-gray-500 mt-3">OCR (si aplica) + Pass 0 (Gemini) + Pass 1 (RAG) + Pass 2 — debería tomar 1-3 minutos.</p>
                    <button
                        onClick={() => {
                            abortRef.current?.abort();
                            setPhase('form');
                            setProgress('');
                        }}
                        className="mt-6 text-sm text-red-600 hover:text-red-700 underline"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* FINALIZING/FINALIZE — cancel button shared via the cancel pattern below */}

            {/* REVIEW */}
            {phase === 'review' && plan && activeProb && activeEdit && (
                <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 p-4">
                    <aside className="col-span-3 bg-white rounded border h-[calc(100vh-100px)] overflow-y-auto">
                        <div className="p-3 border-b font-medium text-sm">Problemas ({problemas.length})</div>
                        {problemas.map((p, i) => {
                            const e = edits[p.problema_id];
                            const isActive = i === activeIdx;
                            const isResolved = e && e.estado !== 'pendiente';
                            return (
                                <button key={p.problema_id} onClick={() => setActiveIdx(i)}
                                    className={`w-full text-left p-3 border-b text-sm hover:bg-gray-50 ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-medium">{p.problema_id}</span>
                                        {isResolved ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <span className="w-4 h-4 flex-shrink-0 text-gray-300">•</span>}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">{p.pregunta_concreta}</div>
                                    {e && (
                                        <div className="text-xs mt-1">
                                            <span className="text-gray-500">{e.calificacion || '(sin calificar)'}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        <div className="p-3 border-t">
                            <button onClick={startFinalize} disabled={!allResolved}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded font-medium text-sm">
                                {allResolved ? 'Generar estudio →' : `${problemas.filter((p) => edits[p.problema_id]?.estado === 'pendiente').length} pendientes`}
                            </button>
                        </div>
                    </aside>

                    <main className="col-span-9 bg-white rounded border p-5 h-[calc(100vh-100px)] overflow-y-auto">
                        <div className="text-xs text-gray-500 mb-1">{activeProb.problema_id}</div>
                        <h2 className="text-lg font-semibold mb-3">{activeProb.pregunta_concreta}</h2>

                        {activeProb.thesis_central_a_demostrar && (
                            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm">
                                <span className="font-medium">Tesis central a demostrar: </span>
                                {activeProb.thesis_central_a_demostrar}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Sentido propuesto (editable)</label>
                                <select className="w-full border rounded px-3 py-2 text-sm"
                                    value={activeEdit.calificacion}
                                    onChange={(e) => setEdits((prev) => ({ ...prev, [activeProb.problema_id]: { ...prev[activeProb.problema_id], calificacion: e.target.value } }))}>
                                    <option value="">— elige —</option>
                                    {CALIFICACIONES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Acción de redacción</label>
                                <select className="w-full border rounded px-3 py-2 text-sm"
                                    value={activeEdit.accion}
                                    onChange={(e) => setEdits((prev) => ({ ...prev, [activeProb.problema_id]: { ...prev[activeProb.problema_id], accion: e.target.value } }))}>
                                    {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="text-sm font-medium mb-2">Tesis recuperadas ({(activeProb.tesis_clave_a_citar || []).length})</div>
                            <div className="space-y-2">
                                {(activeProb.tesis_clave_a_citar || []).map((t, i) => {
                                    const reg = t.registro || `_${i}`;
                                    const dec = activeEdit.tesisDecisions[reg];
                                    const rubro = t.rubro_real || t.rubro_corto || t.rubro || '(sin rubro)';
                                    const isInvalid = t.verificable === false;
                                    return (
                                        <div key={reg}
                                            className={`border rounded p-3 ${dec === 'rector' ? 'border-green-400 bg-green-50' : dec === 'apoyo' ? 'border-blue-300 bg-blue-50' : dec === 'descartar' ? 'border-gray-200 bg-gray-100 opacity-60' : 'border-gray-200'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm uppercase">{rubro}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {t.registro} · {t.instancia}
                                                        {isInvalid && <span className="ml-2 text-red-600">⚠ {t.razon_no_verificable}</span>}
                                                    </div>
                                                    {t.como_se_aplica_al_caso && (
                                                        <div className="text-xs text-gray-700 mt-2">{t.como_se_aplica_al_caso}</div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <button onClick={() => setTesisDecision(reg, 'rector')} title="Rector" className={`p-1.5 rounded ${dec === 'rector' ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}><Star className="w-4 h-4" /></button>
                                                    <button onClick={() => setTesisDecision(reg, 'apoyo')} title="Apoyo" className={`p-1.5 rounded ${dec === 'apoyo' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setTesisDecision(reg, 'descartar')} title="Descartar" className={`p-1.5 rounded ${dec === 'descartar' ? 'bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}><X className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-medium text-gray-600 block mb-1">Instrucción al redactor (texto libre)</label>
                            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={4}
                                value={activeEdit.instruccion}
                                onChange={(e) => setEdits((prev) => ({ ...prev, [activeProb.problema_id]: { ...prev[activeProb.problema_id], instruccion: e.target.value } }))}
                                placeholder="Eje argumental, hechos clave, advertencias..." />
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t">
                            <span className="text-xs text-gray-500">Estado:</span>
                            {(['resuelto', 'diferido', 'inoperante_manual'] as const).map((s) => (
                                <button key={s}
                                    onClick={() => setEdits((prev) => ({ ...prev, [activeProb.problema_id]: { ...prev[activeProb.problema_id], estado: s } }))}
                                    className={`text-xs px-3 py-1 rounded border ${activeEdit.estado === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </main>
                </div>
            )}

            {/* FINALIZING / DONE */}
            {(phase === 'finalizing' || phase === 'done') && (
                <div className="max-w-4xl mx-auto p-6">
                    {phase === 'finalizing' && (
                        <div className="flex items-center gap-3 mb-4 text-sm text-gray-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{progress || 'Redactando...'}</span>
                        </div>
                    )}
                    {phase === 'done' && finalStats && (
                        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-600" />
                            <span>{finalStats.n_palabras} palabras · {finalStats.total_elapsed_s}s</span>
                            <button onClick={() => {
                                navigator.clipboard.writeText(estudioMd);
                                setCopied(true); setTimeout(() => setCopied(false), 1500);
                            }} className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:underline">
                                <Copy className="w-4 h-4" /> {copied ? '¡Copiado!' : 'Copiar markdown'}
                            </button>
                        </div>
                    )}
                    <div className="bg-white border rounded p-6 prose prose-sm max-w-none whitespace-pre-wrap font-serif">
                        {estudioMd || <span className="text-gray-400">Esperando texto…</span>}
                    </div>
                </div>
            )}

            {/* ERROR */}
            {phase === 'error' && (
                <div className="max-w-2xl mx-auto p-8">
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                        <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                            <AlertTriangle className="w-5 h-5" /> Error
                        </div>
                        <div className="text-sm text-red-600">{error}</div>
                        <button onClick={() => { setPhase('form'); setError(''); }} className="mt-3 text-sm text-blue-600 hover:underline">
                            Volver al formulario
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── FileDrop subcomponent ───
function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    return (
        <div>
            <label className="text-sm font-medium block mb-1">{label}</label>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) onChange(f);
                }}
                className={`border-2 border-dashed rounded-lg p-4 cursor-pointer text-center transition-colors ${dragging ? 'border-blue-500 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
            >
                {file ? (
                    <div className="flex items-center gap-2 justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); onChange(null); }} className="text-gray-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <div className="text-xs text-gray-600">PDF o DOCX (OCR si está escaneado)</div>
                    </>
                )}
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        </div>
    );
}
