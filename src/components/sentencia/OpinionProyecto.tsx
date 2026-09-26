'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, MessageSquareText, Star, X } from 'lucide-react';
import { cn } from './primitivas';
import { guardarOpinion, leerOpinion } from './api';
import type { AspectoCalificable, Correccion, OpinionProyecto as Opinion } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   LA OPINIÓN DEL SECRETARIO, AL TERMINAR CADA PROYECTO
   ═══════════════════════════════════════════════════════════════════════════
   David (24-sep-2026): «al término de cada proyecto abrir un cuadro de texto
   con formato visual profesional para que el usuario escriba sus puntos de
   vista y aspectos a mejorar en el taller y, particularmente, en la calidad
   de las sentencias que entrega».

   Un cuadro de texto solo se contesta poco y no se puede sumar. Por eso la
   prosa va acompañada de tres cosas que sí se suman en el auditor del panel:
   la calificación, CUÁNTO tuvo que corregir para firmar —la cifra que de verdad
   mide a un redactor— y los aspectos de la sentencia uno por uno. Todo es
   opcional salvo que algo haya que decir: se puede mandar sólo la nota, o
   sólo el texto.

   Se guarda contra la VERSIÓN del proyecto: si el secretario cambia de sentido
   y genera otra, opina sobre la otra por separado. */

// Respaldo por si la lista del servidor no llega: la pantalla no se queda sin
// aspectos que calificar. La fuente es `opiniones_taller.ASPECTOS` del API.
// «Contesta cada argumento» y «No repite lo ya razonado»: Decisión 5 de David
// (26-sep-2026), para todos los usuarios. Mismo orden y claves que el API.
const ASPECTOS_RESPALDO: AspectoCalificable[] = [
    { clave: 'sentido', etiqueta: 'El sentido de la resolución' },
    { clave: 'fundamentacion', etiqueta: 'Fundamentación y argumentación' },
    { clave: 'exhaustividad', etiqueta: 'Contesta cada argumento' },
    { clave: 'sin_repeticion', etiqueta: 'No repite lo ya razonado' },
    { clave: 'citas', etiqueta: 'Citas de ley y jurisprudencia' },
    { clave: 'redaccion', etiqueta: 'Redacción y estilo' },
    { clave: 'estructura', etiqueta: 'Estructura y forma del proyecto' },
    { clave: 'efectos', etiqueta: 'Efectos y puntos resolutivos' },
    { clave: 'computo', etiqueta: 'Cómputo del plazo y procedencia' },
];

const NOTAS = ['', 'Inservible', 'Deficiente', 'Aceptable', 'Buena', 'Excelente'];

const CORRECCIONES: { v: Correccion; t: string; d: string }[] = [
    { v: 'nada', t: 'Nada', d: 'La firmaría como está' },
    { v: 'poco', t: 'Poco', d: 'Retoques de forma' },
    { v: 'mucho', t: 'Mucho', d: 'Rehice partes del estudio' },
    { v: 'rehecho', t: 'La rehíce', d: 'No me sirvió de base' },
];

const VACIA: Opinion = { calificacion: null, correccion: null, aspectos: {}, sobre_sentencia: '', sobre_taller: '' };

export default function OpinionProyecto({
    abierto, numero, correo, version, onCerrar, onGuardada,
}: {
    abierto: boolean;
    numero: string;
    correo: string;
    /** La versión del proyecto sobre la que se opina. 0 = la última. */
    version: number;
    onCerrar: () => void;
    onGuardada?: () => void;
}) {
    const [op, setOp] = useState<Opinion>(VACIA);
    const [aspectos, setAspectos] = useState<AspectoCalificable[]>(ASPECTOS_RESPALDO);
    const [yaHabia, setYaHabia] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState('');
    const [sobre, setSobre] = useState(0);        // la estrella bajo el ratón

    useEffect(() => {
        if (!abierto || !numero || !correo) return;
        let vivo = true;
        setEnviado(false); setError(''); setCargando(true);
        leerOpinion(numero, correo, version)
            .then((r) => {
                if (!vivo) return;
                if (r.aspectos?.length) setAspectos(r.aspectos);
                if (r.opinion) {
                    setYaHabia(true);
                    setOp({
                        calificacion: r.opinion.calificacion ?? null,
                        correccion: (r.opinion.correccion as Correccion) ?? null,
                        aspectos: (r.opinion.aspectos ?? {}) as Opinion['aspectos'],
                        sobre_sentencia: r.opinion.sobre_sentencia ?? '',
                        sobre_taller: r.opinion.sobre_taller ?? '',
                    });
                } else { setYaHabia(false); setOp(VACIA); }
            })
            .catch(() => { if (vivo) { setYaHabia(false); setOp(VACIA); } })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, [abierto, numero, correo, version]);

    // Escape cierra, como cualquier diálogo.
    useEffect(() => {
        if (!abierto) return;
        const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', f);
        return () => window.removeEventListener('keydown', f);
    }, [abierto, onCerrar]);

    const hayAlgo = useMemo(() => !!(op.calificacion || op.correccion
        || Object.keys(op.aspectos).length || op.sobre_sentencia.trim() || op.sobre_taller.trim()), [op]);

    const alternarAspecto = (clave: string, v: 'bien' | 'mejorar') => setOp((o) => {
        const a = { ...o.aspectos };
        if (a[clave] === v) delete a[clave]; else a[clave] = v;
        return { ...o, aspectos: a };
    });

    const enviar = async () => {
        if (!hayAlgo || enviando) return;
        setEnviando(true); setError('');
        try {
            await guardarOpinion(numero, correo, version, op);
            setEnviado(true);
            onGuardada?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo enviar. Inténtalo de nuevo.');
        } finally { setEnviando(false); }
    };

    if (!abierto) return null;
    const nota = sobre || op.calificacion || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
             role="dialog" aria-modal="true" aria-labelledby="opinion-titulo" onClick={onCerrar}>
            <div className="flex max-h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl border border-white/12
                            bg-charcoal-900 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] sm:rounded-2xl"
                 onClick={(e) => e.stopPropagation()}>

                {/* ── Cabecera ── */}
                <div className="relative border-b border-white/[0.07] px-5 pb-4 pt-5 sm:px-7">
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24"
                         style={{ background: 'radial-gradient(70% 100% at 50% 0%, rgba(201,169,98,0.14) 0%, transparent 70%)' }} />
                    <button type="button" onClick={onCerrar} aria-label="Cerrar"
                            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                    <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold/80">
                        Tu opinión · {numero}{version ? ` · versión ${version}` : ''}
                    </p>
                    <h2 id="opinion-titulo" className="relative mt-1.5 font-serif text-[22px] leading-tight text-white">
                        {enviado ? 'Gracias. Ya la tenemos.' : yaHabia ? 'Tu opinión sobre este proyecto' : '¿Qué tal salió este proyecto?'}
                    </h2>
                    {!enviado && (
                        <p className="relative mt-1.5 text-[13px] leading-relaxed text-white/55">
                            Lo lee directamente el equipo que afina el redactor, y con ello se corrige lo que
                            falla. Un minuto: contesta sólo lo que quieras.
                        </p>
                    )}
                </div>

                {enviado ? (
                    <div className="px-5 py-8 text-center sm:px-7">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10">
                            <Check className="h-5 w-5 text-emerald-300" strokeWidth={3} />
                        </span>
                        <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-relaxed text-white/70">
                            Queda guardada contra esta versión del proyecto. Si vuelves a generarlo, podrás opinar
                            de la nueva por separado; si quieres cambiar algo de ésta, ábrela otra vez.
                        </p>
                        <button type="button" onClick={onCerrar}
                                className="mt-6 h-10 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-[14px] font-medium text-white hover:bg-white/[0.1]">
                            Cerrar
                        </button>
                    </div>
                ) : (
                <>
                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
                    {cargando && (
                        <p className="flex items-center gap-2 text-[12px] text-white/45">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando si ya opinaste…
                        </p>
                    )}

                    {/* ── 1 · La nota ── */}
                    <section>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/50">Calidad de la sentencia</p>
                        <div className="mt-2 flex items-center gap-3" onMouseLeave={() => setSobre(0)}>
                            <div className="flex gap-1" role="radiogroup" aria-label="Calificación de 1 a 5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <button key={i} type="button" role="radio" aria-checked={op.calificacion === i}
                                            aria-label={`${i} — ${NOTAS[i]}`}
                                            onMouseEnter={() => setSobre(i)}
                                            onClick={() => setOp((o) => ({ ...o, calificacion: o.calificacion === i ? null : i }))}
                                            className="rounded-md p-0.5 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60">
                                        <Star className={cn('h-7 w-7 transition-colors',
                                            i <= nota ? 'fill-accent-gold text-accent-gold' : 'text-white/20')} />
                                    </button>
                                ))}
                            </div>
                            <span className="text-[14px] text-white/75">{nota ? NOTAS[nota] : <span className="text-white/35">Sin calificar</span>}</span>
                        </div>
                    </section>

                    {/* ── 2 · Cuánto corrigió ── */}
                    <section>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/50">
                            ¿Cuánto tuviste que corregir para poder firmarla?
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {CORRECCIONES.map((c) => {
                                const on = op.correccion === c.v;
                                return (
                                    <button key={c.v} type="button" aria-pressed={on}
                                            onClick={() => setOp((o) => ({ ...o, correccion: on ? null : c.v }))}
                                            className={cn('rounded-xl border px-3 py-2.5 text-left transition',
                                                on ? 'border-accent-gold/60 bg-accent-gold/[0.1]'
                                                   : 'border-white/[0.09] bg-white/[0.03] hover:border-white/20')}>
                                        <span className={cn('block text-[14px] font-medium', on ? 'text-accent-gold' : 'text-white/90')}>{c.t}</span>
                                        <span className="block text-[11px] leading-snug text-white/45">{c.d}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── 3 · Aspecto por aspecto ── */}
                    <section>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/50">Aspecto por aspecto</p>
                        <p className="mt-0.5 text-[12px] text-white/40">Marca sólo los que quieras destacar.</p>
                        <div className="mt-2 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
                            {aspectos.map((a) => {
                                const v = op.aspectos[a.clave];
                                return (
                                    <div key={a.clave} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <span className="flex-1 text-[13px] text-white/80">{a.etiqueta}</span>
                                        <div className="flex shrink-0 gap-1.5">
                                            {(['bien', 'mejorar'] as const).map((x) => (
                                                <button key={x} type="button" aria-pressed={v === x}
                                                        onClick={() => alternarAspecto(a.clave, x)}
                                                        className={cn('h-7 rounded-lg border px-2.5 text-[12px] transition',
                                                            v === x
                                                                ? (x === 'bien' ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                                                                                : 'border-amber-400/50 bg-amber-400/15 text-amber-200')
                                                                : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/75')}>
                                                    {x === 'bien' ? 'Bien' : 'A mejorar'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── 4 · En sus palabras ── */}
                    <section className="space-y-4">
                        <label className="block">
                            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/50">
                                ¿Qué corregiste o corregirías de la sentencia?
                            </span>
                            <textarea rows={4} value={op.sobre_sentencia} maxLength={6000}
                                      onChange={(e) => setOp((o) => ({ ...o, sobre_sentencia: e.target.value }))}
                                      placeholder="Por ejemplo: el estudio no confrontó la razón toral; citó un artículo que no aplica; los efectos no ordenaban la reposición…"
                                      className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-[14px] leading-relaxed text-white/90 outline-none placeholder:text-white/30 focus:border-accent-gold/45" />
                        </label>
                        <label className="block">
                            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/50">
                                ¿Qué mejorarías del taller?
                            </span>
                            <textarea rows={3} value={op.sobre_taller} maxLength={6000}
                                      onChange={(e) => setOp((o) => ({ ...o, sobre_taller: e.target.value }))}
                                      placeholder="La pantalla, los pasos, los tiempos, lo que echaste en falta…"
                                      className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-[14px] leading-relaxed text-white/90 outline-none placeholder:text-white/30 focus:border-accent-gold/45" />
                        </label>
                    </section>

                    {error && (
                        <p className="rounded-xl border border-red-400/30 bg-red-400/[0.07] px-3 py-2 text-[13px] text-red-200">{error}</p>
                    )}
                </div>

                {/* ── Pie ── */}
                <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
                    <p className="text-[11px] leading-snug text-white/35 sm:mr-auto sm:max-w-[260px]">
                        La lee el equipo de Iurexia para mejorar el redactor. No se publica ni se comparte.
                    </p>
                    <button type="button" onClick={onCerrar}
                            className="h-10 rounded-xl border border-white/12 px-4 text-[14px] font-medium text-white/70 transition hover:border-white/25 hover:text-white">
                        Ahora no
                    </button>
                    <button type="button" onClick={enviar} disabled={!hayAlgo || enviando}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e3c98a] to-accent-gold
                                       px-5 text-[14px] font-semibold text-charcoal-900 transition hover:brightness-105
                                       disabled:cursor-not-allowed disabled:opacity-40">
                        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                        {yaHabia ? 'Actualizar mi opinión' : 'Enviar opinión'}
                    </button>
                </div>
                </>
                )}
            </div>
        </div>
    );
}
