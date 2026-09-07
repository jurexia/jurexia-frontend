'use client';

import { Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from './primitivas';
import type { SolucionGlobal } from './api';

/* LA PANTALLA DE DECISIÓN DEL TALLER.
 *
 * QUÉ SUSTITUYE. Antes, al pulsar «Buscar solución jurídica» se volcaba lo que
 * el acervo devolvía —ocho tesis, treinta preceptos, la jurimetría, los
 * problemas, los avisos— y el secretario tenía que armar la decisión con todo
 * eso delante. Ahí se perdía. No porque el material sobre, sino porque no es
 * material de DECIDIR: es material de FUNDAR, y va después.
 *
 * CÓMO QUEDA. Se lee de arriba abajo y no hay más que dos caminos:
 *
 *   1. EL CONTEXTO, en cuatro párrafos. De qué va, qué resolvió el órgano, qué
 *      se dice en su contra, y cuál es el tema del que cuelga todo. Con eso el
 *      secretario forma criterio sin volver al expediente.
 *   2. LA PROPUESTA, con su razón, la suerte de los accesorios, y —lo que la
 *      convierte en una decisión y no en un botón— por dónde se cae.
 *   3. DOS VÍAS. Seguirla, o resolver al revés. La contraria viene ya escrita
 *      del motor, así que marcarla es instantáneo.
 *   4. LA RAZÓN, siempre editable. Es la del secretario la que gobierna el
 *      estudio; la del motor sólo la rellena.
 *   5. LA LISTA DE COMPROBACIÓN, tema por tema, con la suerte de cada uno en la
 *      vía elegida. La exhaustividad se revisa de oficio y un tema sin
 *      contestar es un amparo de vuelta: es el único defecto que no se ve
 *      leyendo el proyecto, porque lo que falta no se lee.
 */

type Via = 'propuesta' | 'alternativa';

function Parrafo({ rotulo, texto }: { rotulo: string; texto: string }) {
    if (!texto?.trim()) return null;
    return (
        <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                {rotulo}
            </p>
            <p className="text-[13px] leading-relaxed text-white/80">{texto}</p>
        </div>
    );
}

export default function SolucionDelAsunto({
    global, via, onVia, razon, onRazon,
}: {
    global: SolucionGlobal;
    via: Via;
    onVia: (v: Via) => void;
    razon: string;
    onRazon: (t: string) => void;
}) {
    const alt = global.alternativa;
    /* La vía contraria sólo se ofrece si el motor la escribió Y de verdad es
       contraria. Un botón que promete una alternativa y entrega la misma
       solución es peor que no tenerlo. */
    const hayAlternativa = Boolean(alt?.razon?.trim() && alt.sentido &&
                                   alt.sentido !== global.sentido);
    const elegida = via === 'alternativa' && hayAlternativa
        ? { sentido: alt.sentido, razon: alt.razon, efecto: alt.efecto, apoyos: alt.apoyos }
        : { sentido: global.sentido, razon: global.razon, efecto: global.efecto,
            apoyos: global.apoyos };

    const ctx = global.contexto || { hechos: '', resolvio: '', combate: '', tema_principal: '' };
    const hayContexto = Boolean(ctx.hechos || ctx.resolvio || ctx.combate || ctx.tema_principal);

    return (
        <div className="space-y-4">

            {/* ── 1 · EL CONTEXTO ─────────────────────────────────────────── */}
            {hayContexto && (
                <section className="rounded-2xl border border-white/[0.09] bg-white/[0.02] p-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                        El asunto, en cuatro párrafos
                    </p>
                    <div className="space-y-3">
                        <Parrafo rotulo="Los hechos" texto={ctx.hechos} />
                        <Parrafo rotulo="Qué se resolvió" texto={ctx.resolvio} />
                        <Parrafo rotulo="Qué se dice en contra" texto={ctx.combate} />
                    </div>
                    {ctx.tema_principal?.trim() && (
                        <div className="mt-3 rounded-xl border border-accent-gold/25 bg-accent-gold/[0.05] p-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-accent-gold/80">
                                El tema del que cuelga todo
                            </p>
                            <p className="text-[13px] leading-relaxed text-white/85">
                                {ctx.tema_principal}
                            </p>
                        </div>
                    )}
                </section>
            )}

            {/* ── 2 · LAS DOS VÍAS ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-white/[0.09] bg-white/[0.02] p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                    Cómo se resuelve
                </p>
                <p className="mb-3 text-[12px] leading-relaxed text-white/45">
                    El motor propone. Decides tú: puedes seguir su propuesta o
                    resolver al revés, y en cualquiera de los dos casos corregir
                    el texto antes de generar.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                    {/* LA PROPUESTA */}
                    <button type="button" onClick={() => onVia('propuesta')}
                            className={cn('rounded-xl border p-3 text-left transition-colors',
                                via === 'propuesta'
                                    ? 'border-accent-gold/50 bg-accent-gold/[0.07]'
                                    : 'border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.04]')}>
                        <div className="mb-1 flex items-center gap-2">
                            <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                via === 'propuesta'
                                    ? 'border-accent-gold bg-accent-gold text-charcoal-900'
                                    : 'border-white/25')}>
                                {via === 'propuesta' && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                                La propuesta
                            </span>
                            <span className="ml-auto rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium uppercase text-white/70">
                                {global.sentido}
                            </span>
                        </div>
                        <p className="text-[12px] leading-snug text-white/55">
                            {global.razon?.slice(0, 190)}
                            {(global.razon?.length ?? 0) > 190 ? '…' : ''}
                        </p>
                    </button>

                    {/* LA CONTRARIA */}
                    <button type="button" disabled={!hayAlternativa}
                            onClick={() => onVia('alternativa')}
                            className={cn('rounded-xl border p-3 text-left transition-colors',
                                !hayAlternativa && 'cursor-not-allowed opacity-40',
                                via === 'alternativa' && hayAlternativa
                                    ? 'border-accent-gold/50 bg-accent-gold/[0.07]'
                                    : 'border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.04]')}>
                        <div className="mb-1 flex items-center gap-2">
                            <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                via === 'alternativa' && hayAlternativa
                                    ? 'border-accent-gold bg-accent-gold text-charcoal-900'
                                    : 'border-white/25')}>
                                {via === 'alternativa' && hayAlternativa &&
                                    <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                                Resolver al revés
                            </span>
                            {hayAlternativa && (
                                <span className="ml-auto rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium uppercase text-white/70">
                                    {alt.sentido}
                                </span>
                            )}
                        </div>
                        <p className="text-[12px] leading-snug text-white/55">
                            {hayAlternativa
                                ? alt.razon.slice(0, 190) + (alt.razon.length > 190 ? '…' : '')
                                : 'El motor no escribió la vía contraria. Puedes razonarla tú abajo.'}
                        </p>
                    </button>
                </div>

                {hayAlternativa && (
                    <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
                        Cambiar de vía sustituye la razón de abajo: son
                        resoluciones opuestas y quedarse con la razón de la otra
                        es lo que produce un proyecto incongruente.
                    </p>
                )}

                {/* POR DÓNDE SE CAE. Sólo bajo la propuesta: es SU objeción. */}
                {via === 'propuesta' && global.en_contra?.trim() && (
                    <div className="mt-3 flex gap-2 rounded-lg border-l-2 border-amber-400/40 bg-amber-400/[0.04] py-2 pl-2.5 pr-3">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
                        <div>
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">
                                Por dónde se cae esta propuesta
                            </p>
                            <p className="text-[11.5px] leading-relaxed text-white/60">
                                {global.en_contra}
                            </p>
                        </div>
                    </div>
                )}

                {elegida.efecto?.trim() && (
                    <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[11.5px] leading-relaxed text-white/45">
                        <span className="text-white/30">Con los demás temas: </span>
                        {elegida.efecto}
                    </p>
                )}
                {elegida.apoyos?.length > 0 && (
                    <p className="mt-1 text-[11px] leading-relaxed text-white/30">
                        Se apoya en: {elegida.apoyos.join(' · ')}
                    </p>
                )}
            </section>

            {/* ── 3 · LA RAZÓN, QUE ES SUYA ───────────────────────────────── */}
            <section>
                <div className="mb-1.5 flex items-baseline gap-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-white/45">
                        La razón con la que se resuelve
                    </label>
                    {razon.trim() && razon.trim() !== elegida.razon?.trim() && (
                        <span className="text-[10px] text-accent-gold/70">editada por ti</span>
                    )}
                    <button type="button"
                            onClick={() => onRazon(elegida.razon || '')}
                            className="ml-auto flex items-center gap-1 text-[10.5px] text-white/35 transition-colors hover:text-white/60">
                        <RefreshCw className="h-3 w-3" />
                        Volver a la del motor
                    </button>
                </div>
                <textarea
                    value={razon}
                    onChange={(e) => onRazon(e.target.value)}
                    rows={5}
                    placeholder="La razón por la que el proyecto se resuelve así. El estudio entero se construye sobre esto."
                    className="w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-[12.5px] leading-relaxed text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-accent-gold/40" />
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/30">
                    Corrígela y hazla tuya. Quien firma eres tú, y es este texto
                    —no el del motor— el que alinea todo el estudio.
                </p>
            </section>

            {/* ── 4 · LA LISTA DE COMPROBACIÓN ────────────────────────────── */}
            {global.checklist?.length > 0 && (
                <section className="rounded-2xl border border-white/[0.09] bg-white/[0.02] p-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                        Qué pasa con cada tema
                    </p>
                    <p className="mb-3 text-[11.5px] leading-relaxed text-white/40">
                        Ninguno se queda sin contestar. Repásalo antes de generar.
                    </p>
                    <ul className="space-y-2">
                        {global.checklist.map((c, i) => {
                            const suerte = via === 'alternativa' && hayAlternativa
                                ? c.con_alternativa : c.con_propuesta;
                            const sinDeterminar = /SIN DETERMINAR/i.test(suerte || '');
                            return (
                                <li key={i}
                                    className={cn('rounded-lg border p-2.5',
                                        sinDeterminar
                                            ? 'border-amber-400/30 bg-amber-400/[0.04]'
                                            : 'border-white/[0.06] bg-white/[0.02]')}>
                                    <div className="mb-1 flex items-start gap-2">
                                        <span className="shrink-0 tabular-nums text-[11px] text-white/25">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span className="min-w-0 flex-1 text-[12px] leading-snug text-white/70">
                                            {c.tema}
                                        </span>
                                        <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase',
                                            c.papel === 'principal'
                                                ? 'bg-accent-gold/15 text-accent-gold'
                                                : 'bg-white/[0.06] text-white/40')}>
                                            {c.papel}
                                        </span>
                                    </div>
                                    <p className={cn('pl-6 text-[11.5px] leading-relaxed',
                                        sinDeterminar ? 'text-amber-200/70' : 'text-white/45')}>
                                        {suerte || '—'}
                                    </p>
                                    {c.tema_distinto && (
                                        <p className="mt-1 pl-6 text-[10.5px] text-white/30">
                                            Tema distinto: se estudia aparte, no sigue la
                                            suerte del principal.
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}
