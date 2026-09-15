'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, PenLine, Sparkles, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn, Pastilla } from './primitivas';
import type { ProblemaJuridico } from './tipos';
import type { RespuestaPropuesta } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   LA PANTALLA DE DECISIÓN: UNA FRASE, DOS BOTONES, Y LA TARJETA FINAL
   ═══════════════════════════════════════════════════════════════════════════
   David (15-sep-2026): «es un cuadro muy complejo; podemos reducirlo a botones
   y entonces sí desplegar». Y después de probarlo con una revisión fiscal:
   «cuando quiero cambiar de sentido no es claro cómo funcionará. Ya no existe
   la tarjeta final y me diste tres opciones generales, pero no hay forma de
   modificar tema por tema. (…) Debo ver en la tarjeta final lo que refleje mi
   decisión en la selección de la calificación global, o por problema
   jurídico. Esto ya funcionaba: sólo ajústalo al nuevo pipeline».

   Así que el orden es:
     1. LA FRASE del motor, con su razón y su confianza.
     2. DOS BOTONES: aceptar y generar, o cambiar el sentido.
     3. Al cambiar, LAS DOS VÍAS DE SIEMPRE, explícitas: todo el asunto —una
        calificación gobierna el proyecto— o problema por problema, cada uno
        con SUS calificaciones a la vista (las diez, no tres genéricas), su
        razón y la jurimetría del acervo al lado.
     4. LA TARJETA FINAL, siempre visible: con qué va a salir el proyecto
        —la calificación global o la de cada problema, y de quién es cada
        una: tuya o del motor— y el botón de generar.

   NADA DE LO QUE VIAJA AL SERVIDOR CAMBIA. Los mismos `problemas`, el mismo
   `onCambiar`, el mismo `modo`, el mismo `onGenerar`; la precedencia —lo que
   marcó el secretario gana a lo que propuso el motor— la sigue aplicando
   `modos_decision.repartir`. */

type Modo = 'acervo' | 'global' | 'por_problema';
type Grupo = 'si' | 'no' | 'sm';

/* Las calificaciones que puede escribir un proyecto, en el orden en que un
   secretario las piensa. Las cuatro de arriba prosperan; las demás no. */
const FINAS: { id: string; etiqueta: string; grupo: Grupo }[] = [
    { id: 'fundado', etiqueta: 'Fundado', grupo: 'si' },
    { id: 'esencialmente_fundado', etiqueta: 'Esencialmente fundado', grupo: 'si' },
    { id: 'sustancialmente_fundado', etiqueta: 'Sustancialmente fundado', grupo: 'si' },
    { id: 'parcialmente_fundado', etiqueta: 'Parcialmente fundado', grupo: 'si' },
    { id: 'fundado_insuficiente', etiqueta: 'Fundado pero insuficiente', grupo: 'no' },
    { id: 'infundado', etiqueta: 'Infundado', grupo: 'no' },
    { id: 'inoperante', etiqueta: 'Inoperante', grupo: 'no' },
    { id: 'inatendible', etiqueta: 'Inatendible', grupo: 'no' },
    { id: 'ineficaz', etiqueta: 'Ineficaz', grupo: 'no' },
    { id: 'sin_materia', etiqueta: 'Sin materia', grupo: 'sm' },
];

function grupoDe(sentido: string | undefined): Grupo | '' {
    const f = FINAS.find((x) => x.id === (sentido || '').toLowerCase());
    return f ? f.grupo : (sentido || '').toLowerCase() === 'innecesario' ? 'sm' : '';
}

function legible(sentido: string | undefined): string {
    const f = FINAS.find((x) => x.id === (sentido || '').toLowerCase());
    return f ? f.etiqueta : (sentido || '').replace(/_/g, ' ');
}

/* La frase grande: lo que el resolutivo va a hacer, no la etiqueta. */
function fraseDe(sentido: string, esRecurso: boolean): string {
    const g = grupoDe(sentido);
    const que = legible(sentido).toLowerCase();
    if (g === 'si') return esRecurso ? `Prospera el recurso: ${que}` : `Se concede: ${que}`;
    if (g === 'no') return esRecurso ? `No prospera: agravios ${que}s` : `Se niega: conceptos ${que}s`;
    if (g === 'sm') return 'Queda sin materia';
    return legible(sentido) || 'Sin sentido propuesto';
}

function Confianza({ nivel }: { nivel: string }) {
    const n = (nivel || '').toLowerCase();
    const on = n === 'alta' ? 3 : n === 'media' ? 2 : n ? 1 : 0;
    return (
        <span className="inline-flex items-center gap-1 align-middle" title={`Confianza ${n || 'sin dato'}`}>
            {[0, 1, 2].map((i) => (
                <i key={i} className={cn('h-[5px] w-3.5 rounded-full', i < on ? 'bg-accent-gold' : 'bg-white/10')} />
            ))}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-white/45">
                {n ? `confianza ${n}` : ''}
            </span>
        </span>
    );
}

/* LAS DIEZ CALIFICACIONES, A LA VISTA. Como estaban antes del cambio: las que
   prosperan a la izquierda, las que no a la derecha, sin materia al final. */
function Calificativas({ elegido, onElegir, compacto }: {
    elegido?: string; onElegir: (s: string) => void; compacto?: boolean;
}) {
    return (
        <div className={cn('flex flex-wrap gap-1.5', compacto && 'gap-1')}>
            {FINAS.map((f) => {
                const on = (elegido || '').toLowerCase() === f.id;
                return (
                    <button key={f.id} type="button" onClick={() => onElegir(f.id)}
                            aria-pressed={on}
                            className={cn(
                                'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                                on
                                    ? (f.grupo === 'si' ? 'border-accent-gold bg-accent-gold text-charcoal-900'
                                       : f.grupo === 'no' ? 'border-white/60 bg-white/85 text-charcoal-900'
                                       : 'border-white/40 bg-white/45 text-charcoal-900')
                                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white')}>
                        {f.etiqueta}
                    </button>
                );
            })}
        </div>
    );
}

function Pliegue({ titulo, children, abierto }: {
    titulo: string; children: React.ReactNode; abierto?: boolean;
}) {
    return (
        <details className="group rounded-xl border border-white/[0.07] bg-white/[0.02]" open={abierto}>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2
                                text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.03]">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-accent-gold/70 transition-transform
                                         duration-200 group-open:rotate-90" />
                {titulo}
            </summary>
            <div className="px-3 pb-3 pt-1">{children}</div>
        </details>
    );
}

export default function Decision({
    problemas, onCambiar, onGenerar, generando,
    propuesta, proponiendo, onProponer,
    modo = 'por_problema', onModo,
    sentidoGlobal = '', onSentidoGlobal, razonGlobal = '', onRazonGlobal, globalDictado = false,
    tocados, onRazonar, razonando,
    conceptosViolacion = '', onConceptosViolacion,
    onAportar, aportando, contextoAportado = 0,
    esRecurso = false, abrirCorreccion = 0,
}: {
    problemas: ProblemaJuridico[];
    onCambiar: (id: string, campo: 'criterio' | 'sentido', valor: string) => void;
    onGenerar: () => void;
    generando?: boolean;
    propuesta: RespuestaPropuesta | null;
    proponiendo?: boolean;
    onProponer?: () => void;
    modo?: Modo;
    onModo?: (m: Modo) => void;
    sentidoGlobal?: string;
    onSentidoGlobal?: (s: string) => void;
    razonGlobal?: string;
    onRazonGlobal?: (t: string) => void;
    globalDictado?: boolean;
    tocados?: Set<string>;
    onRazonar?: (id: string, pregunta: string, sentido: string) => void;
    razonando?: Set<string>;
    conceptosViolacion?: string;
    onConceptosViolacion?: (t: string) => void;
    onAportar?: (documento: File | null, texto: string) => void;
    aportando?: boolean;
    contextoAportado?: number;
    esRecurso?: boolean;
    /** Sube cuando la página quiere abrir el panel de corrección —«Cambiar
     *  el sentido y regenerar» desde el proyecto terminado—. */
    abrirCorreccion?: number;
}) {
    const [corrigiendo, setCorrigiendo] = useState(false);
    const [porQue, setPorQue] = useState(false);
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
    const [textoAporte, setTextoAporte] = useState('');
    const [ficheroAporte, setFicheroAporte] = useState<File | null>(null);
    useEffect(() => { if (abrirCorreccion > 0) setCorrigiendo(true); }, [abrirCorreccion]);

    const global = propuesta?.global ?? null;
    const principal = useMemo(
        () => problemas.find((p) => (p.jerarquia ?? '') === 'principal') ?? problemas[0],
        [problemas]);
    const propuestaDe = (i: number) => propuesta?.propuestas?.[i];
    const contrasteDe = (i: number) => (propuesta?.contraste ?? []).find((c) => c.numero === i + 1);
    const enGlobal = modo === 'global';

    /* ¿Se aparta el secretario de la propuesta? Sólo ahí se le pide el porqué. */
    const seAparta = useMemo(() => problemas.map((p, i) => {
        const suya = tocados?.has(p.id) && !!p.sentido;
        const motor = propuestaDe(i)?.sentido || '';
        return !!suya && !!motor && grupoDe(p.sentido) !== grupoDe(motor);
    }), [problemas, tocados, propuesta]); // eslint-disable-line react-hooks/exhaustive-deps
    const globalSeAparta = enGlobal && globalDictado && !!global?.sentido && !!sentidoGlobal
        && grupoDe(sentidoGlobal) !== grupoDe(global.sentido);

    const faltaRazon = enGlobal
        ? (globalSeAparta && !(razonGlobal || '').trim())
        : problemas.some((p, i) => seAparta[i] && !(p.criterio || '').trim());
    const todosConSentido = problemas.length > 0 && problemas.every((p) => !!p.sentido);
    const listoParaGenerar = enGlobal ? !!sentidoGlobal : todosConSentido;
    const necesitaConceptos = !!propuesta?.necesitaConceptos && !(conceptosViolacion || '').trim();
    const puedeGenerar = !generando && !proponiendo && listoParaGenerar && !faltaRazon && !necesitaConceptos;
    const alguienSeAparta = enGlobal ? globalSeAparta : seAparta.some(Boolean);

    const abrir = (id: string) => setAbiertos((prev) => {
        const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
    });

    /* La tarjeta final: con qué va a salir el proyecto y de quién es cada calificación. */
    const filasFinales = useMemo(() => problemas.map((p, i) => {
        const motor = propuestaDe(i);
        if (enGlobal) {
            const esPrincipal = principal && p.id === principal.id;
            return {
                id: p.id, pregunta: p.pregunta,
                sentido: esPrincipal ? sentidoGlobal : (tocados?.has(p.id) && p.sentido ? p.sentido : ''),
                de: esPrincipal ? (globalDictado ? 'tuya' : 'del motor')
                    : (tocados?.has(p.id) && p.sentido ? 'tuya' : 'sigue al principal'),
            };
        }
        return {
            id: p.id, pregunta: p.pregunta, sentido: p.sentido || '',
            de: tocados?.has(p.id) && p.sentido ? 'tuya'
                : motor?.sentido && motor.alcanza ? 'del motor' : (p.sentido ? 'de la pantalla' : 'sin decidir'),
        };
    }), [problemas, enGlobal, sentidoGlobal, globalDictado, tocados, propuesta, principal]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── SIN PROPUESTA TODAVÍA ── */
    if (proponiendo) {
        return (
            <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/[0.04] p-6">
                <p className="text-[12px] uppercase tracking-[0.14em] text-accent-gold/80">Paso 3 · decidir</p>
                <div className="mt-3 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
                    <p className="text-[16px] font-medium text-white/90">
                        El motor está leyendo el acervo y contrastando cada planteamiento con la razón toral de la sentencia…
                    </p>
                </div>
                <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-3 animate-pulse rounded-full bg-white/[0.06]" style={{ width: `${86 - i * 18}%` }} />
                    ))}
                </div>
            </div>
        );
    }

    const botonGenerar = (grande: boolean) => (
        <button type="button" onClick={onGenerar} disabled={!puedeGenerar}
                className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-charcoal-900 transition',
                    grande ? 'h-11' : 'h-10',
                    'bg-gradient-to-b from-[#e3c98a] to-accent-gold',
                    'shadow-[0_10px_30px_-12px_rgba(201,169,98,0.7)]',
                    'hover:-translate-y-px hover:shadow-[0_16px_40px_-14px_rgba(201,169,98,0.9)]',
                    'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none')}>
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generando ? 'Escribiendo el proyecto…'
                : alguienSeAparta ? 'Generar con mi criterio'
                : global ? 'Aceptar y generar el proyecto' : 'Generar el proyecto'}
        </button>
    );

    return (
        <div className="space-y-4">
            {/* ═══ 1 · LA FRASE ═══ */}
            <div className={cn(
                'relative overflow-hidden rounded-2xl border p-5 sm:p-6',
                global ? 'border-accent-gold/35 bg-gradient-to-br from-accent-gold/[0.12] to-accent-gold/[0.03]'
                       : 'border-white/10 bg-white/[0.03]')}>
                <p className="text-[12px] uppercase tracking-[0.14em] text-accent-gold/80">
                    Paso 3 · el único que no se automatiza
                </p>
                {global ? (
                    <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full
                                                    bg-gradient-to-br from-[#e3c98a] to-[#8e7436]
                                                    font-serif text-2xl font-semibold text-charcoal-900
                                                    shadow-[0_12px_30px_-12px_rgba(201,169,98,0.9)]">
                            {grupoDe(global.sentido) === 'si' ? 'P' : grupoDe(global.sentido) === 'no' ? 'N' : '—'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] text-white/45">El motor propone</p>
                            <h2 className="font-serif text-xl font-medium leading-tight text-white sm:text-2xl">
                                {fraseDe(global.sentido, esRecurso)}
                            </h2>
                            <div className="mt-1.5"><Confianza nivel={global.confianza} /></div>
                            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/75">{global.razon}</p>
                            {global.apoyos?.length > 0 && (
                                <p className="mt-1.5 text-[12px] text-white/45">
                                    {global.apoyos.length} {global.apoyos.length === 1 ? 'criterio' : 'criterios'} de apoyo con registro verificado
                                    {problemas.length > 1 && ` · ${problemas.length} problemas jurídicos`}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mt-3">
                        <h2 className="font-serif text-xl font-medium leading-tight text-white">
                            El motor no se atrevió con un sentido para todo el asunto
                        </h2>
                        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/60">
                            {propuesta?.propuestas?.length
                                ? 'Propuso problema por problema. Abajo están, con su calificación; corrige lo que no compartas y genera.'
                                : 'Con el material de este asunto no propuso ningún sentido. Decide tú, problema por problema.'}
                        </p>
                    </div>
                )}

                {/* ═══ 2 · LOS DOS BOTONES ═══ */}
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    {botonGenerar(true)}
                    {problemas.length > 0 && (
                        <button type="button" onClick={() => setCorrigiendo((v) => !v)}
                                className={cn(
                                    'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[14px] font-medium transition',
                                    corrigiendo ? 'border-accent-gold/45 bg-accent-gold/10 text-white'
                                                : 'border-white/15 bg-white/[0.05] text-white/90 hover:bg-white/[0.08]')}>
                            <PenLine className="h-4 w-4" />
                            {corrigiendo ? 'Ocultar la corrección' : 'Cambiar el sentido'}
                        </button>
                    )}
                    {global && (
                        <button type="button" onClick={() => setPorQue((v) => !v)}
                                className="inline-flex h-10 items-center rounded-xl border border-white/10 px-3.5
                                           text-[13px] font-medium text-white/60 transition hover:border-white/20 hover:text-white">
                            {porQue ? 'Ocultar el porqué' : 'Ver por qué'}
                        </button>
                    )}
                    {onProponer && !global && !propuesta?.propuestas?.length && (
                        <button type="button" onClick={onProponer}
                                className="inline-flex h-10 items-center rounded-xl border border-white/10 px-3.5
                                           text-[13px] font-medium text-white/60 transition hover:text-white">
                            Volver a pedir la propuesta
                        </button>
                    )}
                </div>
                <div className="mt-3 flex gap-2 rounded-lg border-l-2 border-amber-400/40 bg-amber-400/[0.04] py-2 pl-2.5 pr-3">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
                    <p className="text-[12px] leading-relaxed text-white/60">
                        El motor propone; <span className="text-white/90">el criterio es tuyo</span>. El proyecto
                        sale con tu nombre: lee la razón antes de generar y corrígela si no es la que sostendrías.
                    </p>
                </div>
            </div>

            {/* ═══ EL PORQUÉ, SÓLO SI SE PIDE ═══ */}
            {porQue && global && (
                <div className="grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:grid-cols-2">
                    {global.problema_que_decide && (
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">De qué cuelga el resultado</p>
                            <p className="text-[13px] leading-relaxed text-white/75">{global.problema_que_decide}</p>
                        </div>
                    )}
                    {global.efecto && (
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Qué pasa con los demás temas</p>
                            <p className="text-[13px] leading-relaxed text-white/75">{global.efecto}</p>
                        </div>
                    )}
                    {global.en_contra && (
                        <div className="sm:col-span-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Lo que se diría en contra</p>
                            <p className="text-[13px] leading-relaxed text-white/75">{global.en_contra}</p>
                        </div>
                    )}
                    {global.alternativa?.sentido && (
                        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:col-span-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                                La otra salida · {legible(global.alternativa.sentido)}
                            </p>
                            <p className="text-[13px] leading-relaxed text-white/60">{global.alternativa.razon}</p>
                            <button type="button"
                                    onClick={() => {
                                        onModo?.('global');
                                        onSentidoGlobal?.(global.alternativa.sentido);
                                        onRazonGlobal?.(global.alternativa.razon || '');
                                        setCorrigiendo(true);
                                    }}
                                    className="mt-2 text-[12px] font-medium text-accent-gold/90 hover:text-accent-gold">
                                Resolver así, en vez de como propone el motor
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ 3 · CAMBIAR EL SENTIDO: LAS DOS VÍAS DE SIEMPRE ═══ */}
            {corrigiendo && problemas.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-[12px] font-medium uppercase tracking-wide text-white/45">Cómo vas a resolver</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {([
                            ['global', 'Todo el asunto',
                             'Una sola calificación gobierna el proyecto. El problema principal decide y los demás siguen su suerte.'],
                            ['por_problema', 'Problema por problema',
                             'Cada problema lleva su calificación y su razón. El resolutivo sale mixto donde deba salir mixto.'],
                        ] as const).map(([id, titulo, que]) => (
                            <button key={id} type="button" onClick={() => onModo?.(id)}
                                    className={cn('rounded-xl border p-3 text-left transition-colors',
                                        modo === id ? 'border-accent-gold/50 bg-accent-gold/[0.07]'
                                                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]')}>
                                <span className="mb-1 flex items-center gap-2">
                                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                        modo === id ? 'border-accent-gold bg-accent-gold text-charcoal-900' : 'border-white/20')}>
                                        {modo === id && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    <span className="text-[13px] font-medium text-white/90">{titulo}</span>
                                </span>
                                <span className="block text-[12px] leading-snug text-white/60">{que}</span>
                            </button>
                        ))}
                    </div>

                    {/* ── TODO EL ASUNTO: la calificación global ── */}
                    {enGlobal && (
                        <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                            <p className="mb-2 text-[13px] text-white/75">
                                La calificación del asunto entero
                                {principal && <span className="text-white/45"> · decide el problema principal: {principal.pregunta}</span>}
                            </p>
                            <Calificativas elegido={sentidoGlobal}
                                           onElegir={(s) => { onSentidoGlobal?.(s); if (grupoDe(s) !== grupoDe(global?.sentido)) onRazonGlobal?.(''); }} />
                            <label htmlFor="razon-global" className="mt-3 block text-[12px] font-medium text-white/60">
                                Por qué {globalSeAparta && <span className="text-accent-gold/90">· te apartas de la propuesta: escríbelo en dos líneas</span>}
                            </label>
                            <textarea id="razon-global" rows={3} value={razonGlobal}
                                      onChange={(e) => onRazonGlobal?.(e.target.value)}
                                      placeholder="Mi criterio es… porque…"
                                      className={cn('mt-1.5 w-full resize-y rounded-xl border bg-black/30 px-3.5 py-2.5 text-[14px] leading-relaxed',
                                          'text-white/90 placeholder:text-white/45 outline-none',
                                          globalSeAparta ? 'border-accent-gold/40 focus:border-accent-gold' : 'border-white/10 focus:border-accent-gold/45')} />
                            <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                                Los {problemas.length} planteamientos no se califican uno a uno: el principal decide y los
                                accesorios quedan como consecuencia suya. Si prefieres calificarlos por separado, elige arriba
                                «problema por problema».
                            </p>
                        </div>
                    )}

                    {/* ── PROBLEMA POR PROBLEMA: las diez calificaciones a la vista ── */}
                    {!enGlobal && (
                        <div className="space-y-2">
                            {problemas.map((p, i) => {
                                const motor = propuestaDe(i);
                                const con = contrasteDe(i);
                                const abierto = abiertos.has(p.id);
                                const razonEnCurso = razonando?.has(p.id);
                                return (
                                    <div key={p.id}
                                         className={cn('rounded-2xl border bg-black/20 p-4 transition-colors',
                                             seAparta[i] ? 'border-accent-gold/35' : 'border-white/[0.07]')}>
                                        <p className="text-[14px] leading-snug text-white/90">
                                            <span className="mr-2 text-[12px] font-semibold text-accent-gold">{String(i + 1).padStart(2, '0')}</span>
                                            {(p.jerarquia ?? '') === 'principal' && (
                                                <span className="mr-2 rounded-lg border border-accent-gold/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-gold/90">principal</span>
                                            )}
                                            {p.pregunta}
                                        </p>
                                        <p className="mt-1 text-[12px] text-white/45">
                                            {motor?.sentido ? `El motor propone ${legible(motor.sentido).toLowerCase()}` : 'Sin propuesta del motor'}
                                            {p.prediccion?.frase && <> · <span className="text-white/60">El acervo: {p.prediccion.frase}</span></>}
                                            {(motor?.razon || con) && (
                                                <> · <button type="button" onClick={() => abrir(p.id)} className="text-accent-gold/80 hover:text-accent-gold">
                                                    {abierto ? 'ocultar el porqué' : 'ver por qué'}
                                                </button></>
                                            )}
                                        </p>
                                        {abierto && (
                                            <div className="mt-2 rounded-xl border border-white/[0.07] p-3 text-[13px] leading-relaxed text-white/75">
                                                {motor?.razon && <p>{motor.razon}</p>}
                                                {con && (
                                                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                                        <div><p className="text-[10px] uppercase tracking-wide text-white/45">Razón toral</p><p className="text-[12px]">{con.razon_toral || '—'}</p></div>
                                                        <div><p className="text-[10px] uppercase tracking-wide text-white/45">¿La combate?</p><p className="text-[12px]">{con.la_combate ? 'Sí' : 'No'}{con.por_que ? ` · ${con.por_que}` : ''}</p></div>
                                                        <div><p className="text-[10px] uppercase tracking-wide text-white/45">¿Sobrevive por otra?</p><p className="text-[12px]">{con.sobrevive ? 'Sí' : 'No'} · {con.veredicto_previo.replace(/_/g, ' ')}</p></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <Calificativas elegido={p.sentido}
                                                           onElegir={(s) => { onCambiar(p.id, 'sentido', s); onRazonar?.(p.id, p.pregunta, s); }} />
                                            {razonEnCurso && <Pastilla tono="ambar">redactando la razón…</Pastilla>}
                                        </div>
                                        <textarea value={p.criterio || ''} rows={3}
                                                  onChange={(e) => onCambiar(p.id, 'criterio', e.target.value)}
                                                  placeholder="Mi criterio es… porque…"
                                                  className={cn('mt-3 w-full resize-y rounded-xl border bg-black/30 px-3.5 py-2.5 text-[14px] leading-relaxed',
                                                      'text-white/90 placeholder:text-white/45 outline-none',
                                                      seAparta[i] ? 'border-accent-gold/40 focus:border-accent-gold' : 'border-white/10 focus:border-accent-gold/45')} />
                                        {seAparta[i] && !(p.criterio || '').trim() && (
                                            <p className="mt-1.5 text-[12px] text-accent-gold/90">
                                                Te apartas de la propuesta: di por qué en dos líneas. El estudio se alinea a lo que escribas.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ LO QUE CASI NUNCA HACE FALTA, PLEGADO ═══ */}
            {(propuesta?.necesitaConceptos || onAportar) && (
                <div className="space-y-2">
                    {propuesta?.necesitaConceptos && onConceptosViolacion && (
                        <Pliegue titulo="Los conceptos de violación del amparo" abierto={necesitaConceptos}>
                            <p className="mb-2 text-[12px] leading-relaxed text-white/45">
                                Se levanta un sobreseimiento y el tribunal asume jurisdicción: hay que estudiar los conceptos por
                                primera vez, y no constan en el expediente del recurso.
                            </p>
                            <textarea rows={5} value={conceptosViolacion} onChange={(e) => onConceptosViolacion(e.target.value)}
                                      placeholder="Pega aquí los conceptos de violación de la demanda de amparo"
                                      className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] leading-relaxed text-white/90 placeholder:text-white/45 outline-none focus:border-accent-gold/45" />
                        </Pliegue>
                    )}
                    {onAportar && (
                        <Pliegue titulo={`Lo que sabes y los papeles no dicen${contextoAportado ? ` · ${contextoAportado.toLocaleString('es-MX')} caracteres aportados` : ''}`}>
                            <p className="mb-2 text-[12px] leading-relaxed text-white/45">
                                Opcional. Un dato del expediente, una constancia, o el hecho que cambia el análisis. El motor vuelve a proponer con eso delante.
                            </p>
                            <textarea rows={3} value={textoAporte} onChange={(e) => setTextoAporte(e.target.value)}
                                      className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] leading-relaxed text-white/90 outline-none focus:border-accent-gold/45" />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-2 text-[12px] text-white/60 transition hover:border-accent-gold/35 hover:text-white">
                                    <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFicheroAporte(e.target.files?.[0] ?? null)} />
                                    {ficheroAporte ? ficheroAporte.name : 'o un documento'}
                                </label>
                                <button type="button" disabled={aportando || (!textoAporte.trim() && !ficheroAporte)}
                                        onClick={() => { onAportar(ficheroAporte, textoAporte); }}
                                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3.5 text-[13px] font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-40">
                                    {aportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    Aportar y volver a proponer
                                </button>
                            </div>
                        </Pliegue>
                    )}
                </div>
            )}

            {/* ═══ 4 · LA TARJETA FINAL: CON QUÉ SALE EL PROYECTO ═══ */}
            {(problemas.length > 0 || sentidoGlobal) && (
                <div className={cn('rounded-2xl border p-4 sm:p-5',
                    alguienSeAparta ? 'border-accent-gold/45 bg-accent-gold/[0.06]' : 'border-white/10 bg-white/[0.03]')}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Así va a salir el proyecto</p>
                        <p className="text-[12px] text-white/45">
                            {enGlobal ? 'todo el asunto con una calificación' : 'problema por problema'}
                        </p>
                    </div>
                    {enGlobal && (
                        <p className="mt-2 text-[16px] font-medium text-white">
                            {sentidoGlobal ? legible(sentidoGlobal) : <span className="text-white/45">Sin calificación global todavía</span>}
                            {sentidoGlobal && (
                                <span className={cn('ml-2 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
                                    globalDictado ? 'border-accent-gold/45 text-accent-gold' : 'border-white/15 text-white/60')}>
                                    {globalDictado ? 'tu calificación' : 'la del motor'}
                                </span>
                            )}
                        </p>
                    )}
                    <ul className="mt-2 grid gap-1">
                        {filasFinales.map((f, i) => (
                            <li key={f.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                                <span className="shrink-0 text-white/45">{i + 1}.</span>
                                <span className="min-w-0 flex-1 text-white/75">{f.pregunta}</span>
                                <span className={cn('shrink-0 font-medium', f.sentido ? 'text-white' : 'text-white/45')}>
                                    {f.sentido ? legible(f.sentido) : (enGlobal ? '' : 'sin decidir')}
                                </span>
                                <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                                    f.de === 'tuya' ? 'border-accent-gold/45 text-accent-gold' : 'border-white/15 text-white/45')}>
                                    {f.de}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {faltaRazon && (
                        <p className="mt-2.5 text-[12px] text-amber-300/90">
                            Te apartas de la propuesta: escribe el porqué antes de generar. El estudio se alinea a lo que escribas.
                        </p>
                    )}
                    {necesitaConceptos && (
                        <p className="mt-2.5 text-[12px] text-amber-300/90">
                            Este recurso levanta un sobreseimiento: pega arriba los conceptos de violación antes de generar.
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        {botonGenerar(false)}
                        {!corrigiendo && (
                            <button type="button" onClick={() => setCorrigiendo(true)}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3.5 text-[13px] font-medium text-white/75 transition hover:text-white">
                                <PenLine className="h-3.5 w-3.5" /> Cambiar el sentido
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
