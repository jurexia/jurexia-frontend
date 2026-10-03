'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from './primitivas';
import type { PreguntaAlSecretario, RespuestaAPregunta } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   PREGUNTAS PARA TI (2-oct-2026)
   ═══════════════════════════════════════════════════════════════════════════
   David: «el motor siempre pide constancias, creo que pudiéramos simplificarlo
   a preguntas como ¿El emplazamiento carece de cercioramiento? o ¿En el
   contrato base la cláusula sexta qué dice su texto expreso? (…) no ser tan
   exigentes». Y: «nunca dar por hecho que lo que se dice en los recursos o
   conceptos de violación es cierto (…) sólo si no se dice [en la sentencia]
   se le pregunta al abogado, pero no se genera ninguna propuesta hasta que no
   se respondan esas preguntas, sólo si se consideran indispensables».

   Sustituye al pliegue «Constancias del juicio de origen que el motor necesita
   ver», que pedía pegar o adjuntar un documento por constancia y volvía a
   proponer con cada uno. Aquí: una pregunta cerrada, lo que afirma la parte
   (que es justo lo que no se da por cierto), para qué sirve, y Sí / No / No
   consta. Todas se mandan en UN envío (CONTRATO C) y el servidor propone una
   sola vez.

   Las indispensables (las marca el servidor por código: el principal, las dos
   respuestas llevan a desenlaces distintos y el acto no se pronuncia) van
   abiertas y bloquean el botón; las demás van plegadas y no bloquean. Cada
   pregunta se identifica por el id del servidor, nunca por su texto. */

/** Lo que el secretario contestó en pantalla, por id. Arranca con lo que el
 *  servidor ya tenía guardado. */
export function respuestasIniciales(preguntas: PreguntaAlSecretario[]): Record<string, string> {
    const r: Record<string, string> = {};
    for (const p of preguntas) if (p.respuesta) r[p.id] = p.respuesta;
    return r;
}

/** Las indispensables que siguen sin respuesta (ni en pantalla ni guardada). */
export function indispensablesSinContestar(preguntas: PreguntaAlSecretario[],
                                           respuestas: Record<string, string>): PreguntaAlSecretario[] {
    return preguntas.filter((p) => p.indispensable && !(respuestas[p.id] || p.respuesta || '').trim());
}

/** Lo que viaja: sólo lo contestado y que cambió respecto de lo guardado (lo
 *  ya guardado no hace falta repetirlo; el servidor lo tiene). Si nada cambió
 *  pero falta proponer, se manda lo contestado entero. */
export function respuestasQueViajan(preguntas: PreguntaAlSecretario[],
                                    respuestas: Record<string, string>): RespuestaAPregunta[] {
    const contestadas = preguntas
        .map((p) => ({ id: p.id, respuesta: (respuestas[p.id] ?? p.respuesta ?? '').trim(), antes: (p.respuesta ?? '').trim() }))
        .filter((x) => x.respuesta);
    const nuevas = contestadas.filter((x) => x.respuesta !== x.antes);
    return (nuevas.length ? nuevas : contestadas).map(({ id, respuesta }) => ({ id, respuesta }));
}

const ROTULO_RESPUESTA: Record<string, string> = { si: 'Sí', no: 'No', no_consta: 'No consta' };

function UnaPregunta({ p, valor, onValor, bloqueada }: {
    p: PreguntaAlSecretario; valor: string; onValor: (v: string) => void; bloqueada: boolean;
}) {
    const [texto, setTexto] = useState(p.tipo === 'texto' && valor !== 'no_consta' ? valor : '');
    const opciones = p.tipo === 'si_no' ? ['si', 'no', 'no_consta'] : ['no_consta'];
    return (
        <li data-pregunta={p.id} className={cn('rounded-xl border px-3.5 py-3',
            p.indispensable ? 'border-accent-gold/35 bg-accent-gold/[0.04]' : 'border-white/[0.08] bg-white/[0.02]')}>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] leading-snug text-white/90">
                <span className="min-w-0 flex-1">{p.pregunta}</span>
                {p.indispensable && (
                    <span className="shrink-0 rounded-lg border border-accent-gold/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-gold">
                        indispensable
                    </span>
                )}
                {p.problema > 0 && <span className="shrink-0 text-[12px] text-white/40">problema {p.problema}</span>}
            </p>
            {p.afirma_la_parte && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                    <span className="text-white/45">Lo que afirma la parte: </span>{p.afirma_la_parte}
                    {p.cita_escrito && <span className="text-white/45"> — «{p.cita_escrito}»</span>}
                </p>
            )}
            {p.para_que && (
                <p className="mt-1 text-[12px] leading-relaxed text-white/50">
                    <span className="text-white/40">Para qué: </span>{p.para_que}
                </p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {p.tipo === 'texto' && (
                    <input type="text" value={texto} disabled={bloqueada} maxLength={600}
                           onChange={(e) => { setTexto(e.target.value); onValor(e.target.value); }}
                           placeholder="Lo que dice, en una o dos líneas"
                           className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-[13px] text-white/90 placeholder:text-white/40 outline-none focus:border-accent-gold/45" />
                )}
                {opciones.map((o) => {
                    const puesta = valor === o;
                    return (
                        <button key={o} type="button" disabled={bloqueada} aria-pressed={puesta}
                                onClick={() => { if (p.tipo === 'texto') setTexto(''); onValor(puesta ? '' : o); }}
                                className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition disabled:opacity-40',
                                    puesta ? 'border-accent-gold/60 bg-accent-gold/[0.12] text-accent-gold'
                                           : 'border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]')}>
                            {puesta && <Check className="h-3.5 w-3.5" />}
                            {ROTULO_RESPUESTA[o]}
                        </button>
                    );
                })}
            </div>
            {/* Qué hace el motor con cada respuesta, y qué supone si nadie
                contesta: la carga de la prueba, dicha antes de pulsar. */}
            {(p.si_si || p.si_no || p.si_no_contesta) && (
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                    {p.tipo === 'si_no' && p.si_si && <>Si es sí: {p.si_si}. </>}
                    {p.tipo === 'si_no' && p.si_no && <>Si es no: {p.si_no}. </>}
                    {p.si_no_contesta && <>Sin respuesta: {p.si_no_contesta}.</>}
                </p>
            )}
        </li>
    );
}

export default function PreguntasParaTi({ preguntas, onResponder, enviando = false, esperando = true, compacta = false }: {
    preguntas: PreguntaAlSecretario[];
    /** Manda todas en lote. La página se encarga de volver a sondear hasta que
     *  la propuesta esté lista. */
    onResponder?: (respuestas: RespuestaAPregunta[]) => void | Promise<void>;
    enviando?: boolean;
    /** true = la propuesta espera estas respuestas (estado «preguntas»);
     *  false = ya hay propuesta y éstas sólo la afinarían. */
    esperando?: boolean;
    /** Con propuesta ya hecha la tarjeta va plegada entera: no estorba a la
     *  decisión. */
    compacta?: boolean;
}) {
    const [respuestas, setRespuestas] = useState<Record<string, string>>(() => respuestasIniciales(preguntas));
    /* Una lista nueva del servidor (otra vuelta) trae sus respuestas guardadas;
       lo tecleado de una pregunta que sigue ahí no se pierde. */
    const firma = preguntas.map((p) => `${p.id}:${p.respuesta ?? ''}`).join('|');
    useEffect(() => {
        setRespuestas((prev) => ({ ...respuestasIniciales(preguntas), ...Object.fromEntries(
            Object.entries(prev).filter(([id, v]) => v && preguntas.some((p) => p.id === id && !p.respuesta))) }));
    }, [firma]); // eslint-disable-line react-hooks/exhaustive-deps

    const indispensables = useMemo(() => preguntas.filter((p) => p.indispensable), [preguntas]);
    const otras = useMemo(() => preguntas.filter((p) => !p.indispensable), [preguntas]);
    const faltan = indispensablesSinContestar(preguntas, respuestas);
    const viajan = respuestasQueViajan(preguntas, respuestas);
    const hayNuevas = preguntas.some((p) => (respuestas[p.id] ?? '').trim() && (respuestas[p.id] ?? '').trim() !== (p.respuesta ?? '').trim());
    /* Con la propuesta esperando, el botón exige las indispensables («No
       consta» cuenta: es una respuesta). Con la propuesta hecha, sólo que haya
       algo nuevo que mandar. */
    const puede = !!onResponder && !enviando && viajan.length > 0
        && (esperando ? faltan.length === 0 : hayNuevas);
    const fijar = (id: string, v: string) => setRespuestas((prev) => ({ ...prev, [id]: v }));
    const nContestadas = preguntas.filter((p) => p.respuesta).length;

    if (!preguntas.length) return null;

    const cuerpo = (
        <>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                {esperando
                    ? 'Lo que afirma la parte no se da por cierto: se contrasta con lo acreditado en el juicio. Esto no lo dice la sentencia y sin ello no se puede proponer. Contesta lo que sepas; «No consta» también es una respuesta.'
                    : 'Ya hay propuesta. Si contestas alguna, se vuelve a proponer con tu respuesta delante.'}
            </p>
            {indispensables.length > 0 && (
                <ul className="mt-3 space-y-2.5">
                    {indispensables.map((p) => (
                        <UnaPregunta key={p.id} p={p} valor={respuestas[p.id] ?? ''} bloqueada={enviando}
                                     onValor={(v) => fijar(p.id, v)} />
                    ))}
                </ul>
            )}
            {otras.length > 0 && (
                <details className="group mt-3" open={!indispensables.length && !compacta ? true : undefined}>
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] text-white/60 hover:text-white">
                        <ChevronRight className="h-3.5 w-3.5 text-accent-gold/70 transition-transform group-open:rotate-90" />
                        {indispensables.length ? 'Otras preguntas · no bloquean' : 'Preguntas que afinarían la propuesta · no bloquean'}
                        <span className="text-white/40"> · {otras.length}</span>
                    </summary>
                    <ul className="mt-2.5 space-y-2.5">
                        {otras.map((p) => (
                            <UnaPregunta key={p.id} p={p} valor={respuestas[p.id] ?? ''} bloqueada={enviando}
                                         onValor={(v) => fijar(p.id, v)} />
                        ))}
                    </ul>
                </details>
            )}
            {onResponder && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" disabled={!puede} onClick={() => { void onResponder(viajan); }}
                            className={cn('inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[14px] font-semibold transition',
                                'bg-gradient-to-b from-[#e3c98a] to-accent-gold text-charcoal-900',
                                'disabled:cursor-not-allowed disabled:opacity-40')}>
                        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {enviando ? 'Proponiendo con tus respuestas…' : 'Responder y proponer'}
                    </button>
                    {esperando && faltan.length > 0 && (
                        <span className="text-[12px] text-white/45">
                            {faltan.length === 1 ? 'Falta 1 indispensable' : `Faltan ${faltan.length} indispensables`}
                        </span>
                    )}
                </div>
            )}
        </>
    );

    return (
        <section id="preguntas-para-ti" data-preguntas={esperando ? 'esperando' : 'afinar'}
                 className={cn('rounded-xl border p-4 sm:p-5',
                     esperando ? 'border-accent-gold/40 bg-accent-gold/[0.05]' : 'border-white/10 bg-white/[0.03]')}>
            {compacta && !esperando ? (
                <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45 hover:text-white/75">
                        <ChevronRight className="h-3.5 w-3.5 text-accent-gold/70 transition-transform group-open:rotate-90" />
                        Preguntas para ti
                        <span className="normal-case tracking-normal text-white/40">
                            · {nContestadas ? `${nContestadas} de ${preguntas.length} contestada${nContestadas === 1 ? '' : 's'}`
                                            : `${preguntas.length} sin contestar`}
                        </span>
                    </summary>
                    {cuerpo}
                </details>
            ) : (
                <>
                    <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-gold/90">
                        <HelpCircle className="h-4 w-4" />
                        Preguntas para ti
                        {indispensables.length > 0 && (
                            <span className="normal-case tracking-normal text-white/45">
                                · {indispensables.length} indispensable{indispensables.length === 1 ? '' : 's'}
                            </span>
                        )}
                    </p>
                    {cuerpo}
                </>
            )}
        </section>
    );
}
