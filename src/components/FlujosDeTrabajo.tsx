'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FolderClosed, Loader2, Lock, Workflow, X } from 'lucide-react';
import { FLUJOS, esObligatorio, type FlujoTrabajo } from '@/lib/flujos';
import { nombreCarpeta, type Expediente } from '@/lib/expedientes';

/* ═══ FLUJOS DE TRABAJO (25-sep-2026) ══════════════════════════════════════
   El «Workflow Studio» de Astra for Law, hecho para el derecho mexicano y
   montado ENCIMA del chat: se elige el proceso, se ven sus pasos antes de
   gastar nada, se escribe el encargo, se elige la carpeta y arranca en una
   consulta nueva. No se sale del chat ni se pierde lo que se estaba haciendo.
   ═════════════════════════════════════════════════════════════════════════ */

const CATEGORIAS = ['Todos', 'Amparo', 'Litigio', 'Contratos', 'Penal', 'Investigación'] as const;

export interface InicioDeFlujo {
    flujo: FlujoTrabajo;
    encargo: string;
    expedienteId: string | null;
}

export default function FlujosDeTrabajo({
    abierto,
    onCerrar,
    carpetas,
    carpetaInicial,
    onIniciar,
    saldo,
}: {
    abierto: boolean;
    onCerrar: () => void;
    /** `null`: las carpetas aún no pueden vincularse a consultas. */
    carpetas: Expediente[] | null;
    carpetaInicial: string | null;
    /** Lanza el flujo; si el servidor lo rechaza (sin plan, sin saldo), lanza
     *  un error con el mensaje para el abogado. */
    onIniciar: (inicio: InicioDeFlujo) => Promise<void>;
    /** Flujos del mes. `ilimitado` para la casa; `limite` 0 = el plan no los trae. */
    saldo: { restantes: number; limite: number; ilimitado?: boolean };
}) {
    const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>('Todos');
    const [elegido, setElegido] = useState<string>(FLUJOS[0].id);
    const [encargo, setEncargo] = useState('');
    const [carpeta, setCarpeta] = useState<string>('');
    // En pantallas chicas se ve una cosa a la vez: la lista o el detalle.
    const [enDetalle, setEnDetalle] = useState(false);
    const campoRef = useRef<HTMLTextAreaElement>(null);
    const [iniciando, setIniciando] = useState(false);
    const [rechazo, setRechazo] = useState<string | null>(null);
    const conPlan = saldo.ilimitado || saldo.limite > 0;
    const sinSaldo = !saldo.ilimitado && saldo.limite > 0 && saldo.restantes <= 0;

    useEffect(() => {
        if (!abierto) return;
        setCarpeta(carpetaInicial ?? '');
        setEnDetalle(false);
        setRechazo(null);
    }, [abierto, carpetaInicial]);

    useEffect(() => {
        if (!abierto) return;
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, [abierto, onCerrar]);

    const visibles = useMemo(
        () => (categoria === 'Todos' ? FLUJOS : FLUJOS.filter((f) => f.categoria === categoria)),
        [categoria]
    );
    const flujo = FLUJOS.find((f) => f.id === elegido) ?? FLUJOS[0];
    const listo = encargo.trim().length >= 12;

    if (!abierto) return null;

    const iniciar = async () => {
        if (!listo) {
            campoRef.current?.focus();
            return;
        }
        if (iniciando) return;
        setIniciando(true);
        setRechazo(null);
        try {
            await onIniciar({ flujo, encargo: encargo.trim(), expedienteId: carpeta || null });
            setEncargo('');
        } catch (err) {
            setRechazo(err instanceof Error ? err.message : 'No se pudo iniciar el flujo.');
        } finally {
            setIniciando(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Flujos de trabajo"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        >
            <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-[#fbfaf7] shadow-2xl sm:h-[min(780px,92vh)] sm:rounded-2xl">
                {/* ── Encabezado ── */}
                <header className="flex-shrink-0 border-b border-charcoal-900/[0.08] px-5 pb-3 pt-4 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-charcoal-900 text-[#c9a962]">
                                <Workflow className="h-[18px] w-[18px]" />
                            </span>
                            <div>
                                <h2 className="flex flex-wrap items-center gap-2 font-serif text-[1.35rem] leading-tight text-charcoal-900">
                                    Flujos de trabajo
                                    {conPlan && !saldo.ilimitado && (
                                        <span className={`rounded-full px-2 py-0.5 font-sans text-[11.5px] font-semibold ${sinSaldo ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-charcoal-900/[0.06] text-charcoal-900/70'}`}>
                                            {saldo.restantes} de {saldo.limite} este mes
                                        </span>
                                    )}
                                </h2>
                                <p className="mt-0.5 text-[13px] text-charcoal-900/55">
                                    Iurexia construye el escrito contigo, parte por parte: propone lo que deduce, te pide lo que falta y redacta con todo el acervo.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onCerrar}
                            aria-label="Cerrar"
                            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-charcoal-900/50 hover:bg-charcoal-900/[0.06] hover:text-charcoal-900"
                        >
                            <X className="h-[18px] w-[18px]" />
                        </button>
                    </div>
                    <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Materia">
                        {CATEGORIAS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                role="tab"
                                aria-selected={categoria === c}
                                onClick={() => {
                                    setCategoria(c);
                                    const primero = c === 'Todos' ? FLUJOS[0] : FLUJOS.find((f) => f.categoria === c);
                                    if (primero && !(c === 'Todos' || flujo.categoria === c)) setElegido(primero.id);
                                }}
                                className={`h-7 flex-shrink-0 rounded-full px-3 text-[12.5px] font-medium transition-colors ${
                                    categoria === c
                                        ? 'bg-charcoal-900 text-white'
                                        : 'text-charcoal-900/60 hover:bg-charcoal-900/[0.06] hover:text-charcoal-900'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="flex min-h-0 flex-1">
                    {/* ── Biblioteca ── */}
                    <nav
                        aria-label="Biblioteca de flujos"
                        className={`${enDetalle ? 'hidden' : 'flex'} w-full flex-col gap-1 overflow-y-auto border-charcoal-900/[0.08] p-3 md:flex md:w-[300px] md:flex-shrink-0 md:border-r`}
                    >
                        {visibles.map((f) => {
                            const activo = f.id === flujo.id;
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => { setElegido(f.id); setEnDetalle(true); }}
                                    aria-current={activo ? 'true' : undefined}
                                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                                        activo
                                            ? 'border-[#c9a962]/60 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]'
                                            : 'border-transparent hover:bg-white/70'
                                    }`}
                                >
                                    <span className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8b7355]">
                                        {f.categoria}
                                    </span>
                                    <span className="mt-1 block text-[13.5px] font-semibold leading-snug text-charcoal-900">{f.nombre}</span>
                                    <span className="mt-1 block text-[12px] leading-snug text-charcoal-900/55">
                                        {f.entrega !== f.nombre ? `${f.entrega} · ` : ''}{f.partes.length} partes
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* ── Detalle y lanzador ── */}
                    <section
                        aria-label={flujo.nombre}
                        className={`${enDetalle ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col overflow-y-auto md:flex`}
                    >
                        <div className="px-5 pb-6 pt-5 sm:px-7">
                            <button
                                type="button"
                                onClick={() => setEnDetalle(false)}
                                className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-charcoal-900/55 hover:text-charcoal-900 md:hidden"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Todos los flujos
                            </button>

                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8b7355]">{flujo.categoria}</p>
                            <h3 className="mt-1 font-serif text-[1.5rem] leading-tight text-charcoal-900">{flujo.nombre}</h3>
                            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-charcoal-900/65">{flujo.descripcion}</p>
{flujo.entrega !== flujo.nombre && (
                            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-charcoal-900/70 ring-1 ring-charcoal-900/[0.08]">
                                <span className="font-semibold uppercase tracking-[0.08em] text-charcoal-900/45">Entrega</span>
                                <span className="font-medium text-charcoal-900">{flujo.entrega}</span>
                            </p>
                            )}

                            {/* Las partes del escrito y lo que pedirá cada una */}
                            <ol className="mt-5 overflow-hidden rounded-xl bg-white ring-1 ring-charcoal-900/[0.08]">
                                {flujo.partes.map((p, i) => (
                                    <li
                                        key={p.id}
                                        className="flex gap-3.5 border-b border-charcoal-900/[0.06] px-4 py-3 last:border-b-0"
                                    >
                                        <span className="mt-0.5 w-6 flex-shrink-0 font-mono text-[12px] text-charcoal-900/35">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13.5px] font-semibold text-charcoal-900">{p.titulo}</p>
                                            <p className="mt-0.5 text-[12.5px] leading-relaxed text-charcoal-900/60">{p.resumen}</p>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {p.campos.map((c) => (
                                                    <span
                                                        key={c.id}
                                                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                                                            esObligatorio(c)
                                                                ? 'bg-charcoal-900/[0.06] text-charcoal-900/70'
                                                                : 'bg-charcoal-900/[0.03] text-charcoal-900/45'
                                                        }`}
                                                    >
                                                        {c.etiqueta}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>

                            <div className="mt-4 grid gap-2 text-[12.5px] leading-snug text-charcoal-900/65 sm:grid-cols-3">
                                <p className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-charcoal-900/[0.06]">
                                    <span className="block font-semibold text-charcoal-900">1 · Deduce</span>
                                    Lee tu encargo, la carpeta y lo ya escrito, y te propone cada dato ya marcado.
                                </p>
                                <p className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-charcoal-900/[0.06]">
                                    <span className="block font-semibold text-charcoal-900">2 · Pregunta</span>
                                    Lo que no consta te lo pide; si falta un documento clave, te pide el documento o su texto.
                                </p>
                                <p className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-charcoal-900/[0.06]">
                                    <span className="block font-semibold text-charcoal-900">3 · Redacta</span>
                                    Escribe la parte con todo el acervo y la deja en el documento; luego sigue la siguiente.
                                </p>
                            </div>

                            {/* El encargo */}
                            <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-charcoal-900/[0.08] sm:p-5">
                                <label htmlFor="encargo-flujo" className="text-[13.5px] font-semibold text-charcoal-900">
                                    Tu encargo
                                </label>
                                <ul className="mt-1.5 space-y-0.5 text-[12.5px] leading-relaxed text-charcoal-900/60">
                                    {flujo.pide.map((x) => (
                                        <li key={x} className="flex gap-2">
                                            <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[#c9a962]" />
                                            {x}
                                        </li>
                                    ))}
                                </ul>
                                <textarea
                                    id="encargo-flujo"
                                    ref={campoRef}
                                    value={encargo}
                                    onChange={(e) => setEncargo(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            e.preventDefault();
                                            iniciar();
                                        }
                                    }}
                                    rows={5}
                                    placeholder={`Por ejemplo: ${flujo.ejemplo}`}
                                    className="mt-3 w-full resize-y rounded-lg border border-charcoal-900/[0.12] bg-[#fdfcf9] px-3 py-2.5 text-[16px] leading-relaxed text-charcoal-900 outline-none transition-colors placeholder:text-charcoal-900/35 focus:border-[#c9a962] sm:text-[14px]"
                                />

                                {carpetas && (
                                    <div className="mt-3">
                                        <label htmlFor="carpeta-flujo" className="text-[12.5px] font-medium text-charcoal-900/70">
                                            Carpeta
                                        </label>
                                        <div className="relative mt-1">
                                            <FolderClosed className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-900/40" />
                                            <select
                                                id="carpeta-flujo"
                                                value={carpeta}
                                                onChange={(e) => setCarpeta(e.target.value)}
                                                className="h-10 w-full appearance-none rounded-lg border border-charcoal-900/[0.12] bg-[#fdfcf9] pl-9 pr-8 text-[14px] text-charcoal-900 outline-none focus:border-[#c9a962]"
                                            >
                                                <option value="">Sin carpeta</option>
                                                {carpetas.map((c) => (
                                                    <option key={c.id} value={c.id}>{nombreCarpeta(c)}</option>
                                                ))}
                                            </select>
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-charcoal-900/40">▼</span>
                                        </div>
                                        <p className="mt-1.5 text-[12px] leading-snug text-charcoal-900/50">
                                            {carpeta
                                                ? 'Iurexia trabaja con la ficha, el análisis y los documentos leídos de la carpeta, y la consulta queda guardada en ella.'
                                                : 'Con una carpeta, Iurexia trabaja con su expediente, puedes subirle los documentos que te pida y el escrito queda guardado en ella.'}
                                        </p>
                                    </div>
                                )}

                                {rechazo && (
                                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-snug text-amber-900 ring-1 ring-amber-200">
                                        {rechazo}
                                    </p>
                                )}

                                {conPlan ? (
                                    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-[12px] leading-snug text-charcoal-900/50">
                                            {flujo.partes.length} partes · usa 1 flujo de tu mes, sin gastar consultas
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => void iniciar()}
                                            disabled={!listo || iniciando || sinSaldo}
                                            className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-charcoal-900 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {iniciando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                            {sinSaldo ? 'Sin flujos este mes' : 'Iniciar el flujo'}
                                            {!iniciando && <ArrowRight className="h-4 w-4 text-[#c9a962]" />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex flex-col gap-3 rounded-lg bg-cream-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="flex items-start gap-2 text-[13px] leading-snug text-charcoal-900/75">
                                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#a8863f]" />
                                            Los flujos de trabajo están en Pro (30 al mes) y Platinum (60 al mes).
                                        </p>
                                        <Link
                                            href="/precios"
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-charcoal-900 px-4 text-[13.5px] font-semibold text-white hover:bg-charcoal-800"
                                        >
                                            Ver planes <ArrowRight className="h-4 w-4 text-[#c9a962]" />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
