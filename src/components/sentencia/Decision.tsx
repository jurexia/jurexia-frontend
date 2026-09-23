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
    onRazonarGlobal, razonandoGlobal = false,
    tocados, onRazonar, razonando,
    conceptosViolacion = '', onConceptosViolacion,
    onAportar, aportando, contextoAportado = 0,
    esRecurso = false, abrirCorreccion = 0,
    extemporanea = false, oportunidadDecidida = true,
    claseContexto = null, onCorregirProblema, corrigiendoProblema = null,
    avisosReparto = [], constanciasAportadas,
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
    /** GENERAR EL CRITERIO EN PANTALLA, en modo global (23-sep-2026). David:
     *  «al introducir manual la solución no me da la opción para generar el
     *  criterio en pantalla y ver cómo va a salir». Por problema existía
     *  (`onRazonar`); en «todo el asunto» sólo había el cuadro en blanco. */
    onRazonarGlobal?: () => void;
    razonandoGlobal?: boolean;
    globalDictado?: boolean;
    tocados?: Set<string>;
    onRazonar?: (id: string, pregunta: string, sentido: string) => void;
    razonando?: Set<string>;
    conceptosViolacion?: string;
    onConceptosViolacion?: (t: string) => void;
    onAportar?: (documento: File | null, texto: string, etiqueta?: string) => void;
    /** Las constancias pedidas que ya se aportaron, por su nombre. */
    constanciasAportadas?: Set<string>;
    aportando?: boolean;
    contextoAportado?: number;
    esRecurso?: boolean;
    /** Sube cuando la página quiere abrir el panel de corrección —«Cambiar
     *  el sentido y regenerar» desde el proyecto terminado—. */
    abrirCorreccion?: number;
    /** El cómputo de oportunidad dio EXTEMPORÁNEA. No bloquea —el botón sigue
     *  activo, «nunca impedir el estudio de fondo»— pero si no se decidió
     *  nada arriba, generar ahora resuelve sólo la improcedencia, sin fondo.
     *  El secretario tiene que VER eso justo donde va a generar. */
    extemporanea?: boolean;
    /** false = el secretario no tocó la tarjeta de oportunidad de arriba
     *  («Dejarlo así» / «Fue oportuna» / «Estudio en reserva»); true en
     *  cualquiera de los tres casos, incluido dejarlo como está a propósito. */
    oportunidadDecidida?: boolean;
    /** Qué fue lo último que se aportó, según el servidor: si es la
     *  resolución que decidió una violación procesal, se dice —el motor la
     *  trata como la razón toral a confrontar—. */
    claseContexto?: { clase: string; rotulo: string } | null;
    /** EL PROBLEMA JURÍDICO SE CORRIGE ANTES DE DECIDIRLO. La pregunta se
     *  corrige en el servidor y la propuesta se vuelve a pedir. */
    onCorregirProblema?: (id: string, pregunta: string, jerarquia?: 'principal' | 'accesorio') => void;
    corrigiendoProblema?: string | null;
    /** Lo que dijo el servidor al repartir la suerte de los accesorios tras
     *  cambiar el principal. */
    avisosReparto?: string[];
}) {
    const [corrigiendo, setCorrigiendo] = useState(false);
    const [porQue, setPorQue] = useState(false);
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
    const [textoAporte, setTextoAporte] = useState('');
    const [ficheroAporte, setFicheroAporte] = useState<File | null>(null);
    /* El problema que se está corrigiendo y su texto en curso. */
    const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
    /* Lo que se está tecleando/adjuntando para cada constancia pedida. */
    const [aporteConstancia, setAporteConstancia] = useState<Record<string, { texto: string; fichero: File | null }>>({});
    const constancias = propuesta?.global?.constancias ?? [];
    const faltanIndispensables = constancias.filter((c) => c.indispensable && !constanciasAportadas?.has(c.que));
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
                {/* ═══ AQUÍ ARRIBA YA NO SE GENERA ═══
                    Recorrido del 16-sep-2026, con el proyecto ya hecho en
                    pantalla: el secretario veía TRES botones que generan
                    —éste, el de la tarjeta final y «cambiar el sentido y
                    regenerar»— y TRES que cambian el sentido. David: «no
                    múltiples botones que confundan, creo que quizá alguno
                    está de sobra».
                    Se genera en UN solo sitio: la tarjeta final, que es la
                    que enseña con qué va a salir el proyecto. Aquí arriba se
                    cuestiona la propuesta —«cambiar el sentido», «ver por
                    qué»— y se baja a ver el resultado. */}
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
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
                    {listoParaGenerar && (
                        <a href="#asi-sale"
                           className="inline-flex h-10 items-center rounded-xl px-1 text-[13px]
                                      font-medium text-accent-gold/85 transition hover:text-accent-gold">
                            Ver cómo va a salir ↓
                        </a>
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
                {/* EL AVISO DE EXTEMPORANEIDAD VIVE DONDE SE GENERA, y sólo
                    ahí: al quitar el botón dorado de aquí arriba, repetirlo
                    en los dos sitios era ruido. Está en la tarjeta final,
                    junto al único botón que escribe el proyecto. */}
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
                            {/* VER CÓMO VA A SALIR ANTES DE GENERAR. Con el sentido
                                marcado y lo que haya en el cuadro como base, el
                                motor redacta el criterio aquí mismo. Si el cuadro
                                trae dos líneas del secretario, construye sobre
                                ellas; si está vacío, propone. Lo que salga se puede
                                corregir antes de que llegue al proyecto. */}
                            {onRazonarGlobal && !!sentidoGlobal && (
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <button type="button"
                                            onClick={onRazonarGlobal}
                                            disabled={razonandoGlobal}
                                            className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                                                razonandoGlobal
                                                    ? 'cursor-wait border-white/10 text-white/40'
                                                    : 'border-accent-gold/40 text-accent-gold hover:bg-accent-gold/10')}>
                                        {razonandoGlobal
                                            ? 'Redactando el criterio…'
                                            : (razonGlobal || '').trim()
                                                ? 'Desarrollar mi criterio con el acervo'
                                                : 'Redactar un criterio para este sentido'}
                                    </button>
                                    <span className="text-[11.5px] text-white/40">
                                        {(razonGlobal || '').trim()
                                            ? 'Toma lo que escribiste como base y lo lleva hasta la calificación.'
                                            : 'Propone una razón que después puedes corregir.'}
                                    </span>
                                </div>
                            )}
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
                                        {editando?.id === p.id ? (
                                            /* ── CORREGIR LA PREGUNTA ── David: «fijar si el problema
                                               jurídico es el correcto y dar la opción de modificarlo». */
                                            <div>
                                                <textarea value={editando.texto} rows={2} autoFocus
                                                          onChange={(e) => setEditando({ id: p.id, texto: e.target.value })}
                                                          className="w-full resize-y rounded-xl border border-accent-gold/40 bg-black/30 px-3 py-2 text-[14px] leading-snug text-white/90 outline-none focus:border-accent-gold" />
                                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                                                    <button type="button"
                                                            disabled={!!corrigiendoProblema || editando.texto.trim().length < 15 || !editando.texto.trim().endsWith('?')}
                                                            onClick={() => { onCorregirProblema?.(p.id, editando.texto.trim()); setEditando(null); }}
                                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-gold px-3 font-medium text-charcoal-900 disabled:opacity-40">
                                                        <Check className="h-3.5 w-3.5" /> Corregir y volver a proponer
                                                    </button>
                                                    {(p.jerarquia ?? '') !== 'principal' && (
                                                        <button type="button" disabled={!!corrigiendoProblema}
                                                                onClick={() => { onCorregirProblema?.(p.id, editando.texto.trim(), 'principal'); setEditando(null); }}
                                                                className="h-8 rounded-lg border border-white/15 px-3 text-white/75 hover:text-white disabled:opacity-40">
                                                            …y hacerlo el principal
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => setEditando(null)} className="h-8 px-2 text-white/45 hover:text-white">cancelar</button>
                                                    <span className="text-white/35">Escríbelo como pregunta: empieza por «¿» y termina en «?». La propuesta se rehace sobre la pregunta corregida.</span>
                                                </div>
                                            </div>
                                        ) : (
                                        <p className="text-[14px] leading-snug text-white/90">
                                            <span className="mr-2 text-[12px] font-semibold text-accent-gold">{String(i + 1).padStart(2, '0')}</span>
                                            {(p.jerarquia ?? '') === 'principal' && (
                                                <span className="mr-2 rounded-lg border border-accent-gold/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-gold/90">principal</span>
                                            )}
                                            {p.pregunta}
                                            {p.editada && <span className="ml-2 text-[10px] uppercase tracking-wide text-white/40">corregida por ti</span>}
                                            {onCorregirProblema && (
                                                <button type="button" title="Corregir el problema jurídico"
                                                        disabled={!!corrigiendoProblema}
                                                        onClick={() => setEditando({ id: p.id, texto: p.pregunta })}
                                                        className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] text-white/40 hover:text-accent-gold disabled:opacity-40">
                                                    {corrigiendoProblema === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
                                                    {corrigiendoProblema === p.id ? 'corrigiendo…' : 'corregir'}
                                                </button>
                                            )}
                                        </p>
                                        )}
                                        {/* DE QUIÉN ES LA CALIFICACIÓN. Cuando el principal cambia, los
                                            accesorios que él no marcó siguen su suerte, y aquí se dice
                                            por qué: «sigue al principal · descansa en la premisa…». */}
                                        {p.sentido && p.de && p.de !== 'tuya' && p.de !== 'motor' && (
                                            <p className="mt-1 text-[12px] text-accent-gold/85">
                                                {p.de === 'principal' ? 'Sigue al principal' : p.de === 'distinto' ? 'Tema distinto: se estudia aparte'
                                                    : p.de === 'mayor_beneficio' ? 'Pide más que el principal: se estudia' : 'Se estudia por su cuenta'}
                                                {p.porQue ? <span className="text-white/55"> · {p.porQue}</span> : null}
                                                <span className="text-white/40"> · márcalo tú si no estás de acuerdo</span>
                                            </p>
                                        )}
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
                            {avisosReparto.length > 0 && (
                                <ul className="space-y-1 px-1 text-[12px] leading-relaxed text-white/55">
                                    {avisosReparto.map((a, k) => (
                                        <li key={k} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold/70" /><span>{a}</span></li>
                                    ))}
                                </ul>
                            )}
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
                    {/* ═══ LAS CONSTANCIAS QUE EL MOTOR NECESITA VER ═══
                        David: «es vital que el modelo detecte cuándo resulte
                        estrictamente indispensable, para dar solución,
                        información sobre alguna constancia —ya sea que la
                        detalle en un cuadro de texto o que adjunte el
                        documento faltante—». Las declara la propuesta; aquí
                        se piden una por una y cada aporte viaja rotulado. */}
                    {onAportar && constancias.length > 0 && (
                        <Pliegue titulo={`Constancias del juicio de origen que el motor necesita ver · ${constancias.length}${faltanIndispensables.length ? ` · faltan ${faltanIndispensables.length} indispensable${faltanIndispensables.length === 1 ? '' : 's'}` : ''}`}
                                 abierto={faltanIndispensables.length > 0}>
                            <p className="mb-3 text-[12px] leading-relaxed text-white/45">
                                Un tribunal terminal no resuelve sólo con la sentencia y el escrito. El motor dice qué constancia
                                haría falta ver y para qué; pégala como texto o adjunta el documento. Lo que no se aporte, el
                                estudio lo tratará como no acreditado —no lo supondrá—.
                            </p>
                            <div className="space-y-3">
                                {constancias.map((c) => {
                                    const hecha = !!constanciasAportadas?.has(c.que);
                                    const a = aporteConstancia[c.que] ?? { texto: '', fichero: null };
                                    return (
                                        <div key={c.que} className={cn('rounded-xl border p-3', hecha ? 'border-emerald-400/30 bg-emerald-400/[0.05]' : c.indispensable ? 'border-accent-gold/35 bg-accent-gold/[0.04]' : 'border-white/[0.08]')}>
                                            <p className="text-[13px] text-white/90">
                                                {hecha ? <Check className="mr-1.5 inline h-3.5 w-3.5 text-emerald-300" /> : null}
                                                {c.que}
                                                {c.indispensable && !hecha && <span className="ml-2 rounded-lg border border-accent-gold/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-gold">indispensable</span>}
                                                {c.problema ? <span className="ml-2 text-[11px] text-white/40">· problema {c.problema}</span> : null}
                                            </p>
                                            {c.para_que && <p className="mt-0.5 text-[12px] text-white/50">{c.para_que}</p>}
                                            {!hecha && (
                                                <div className="mt-2">
                                                    <textarea rows={2} value={a.texto}
                                                              onChange={(e) => setAporteConstancia((prev) => ({ ...prev, [c.que]: { ...a, texto: e.target.value } }))}
                                                              placeholder="Pega aquí lo que dice la constancia…"
                                                              className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] leading-relaxed text-white/90 placeholder:text-white/40 outline-none focus:border-accent-gold/45" />
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 px-2.5 py-1.5 text-[12px] text-white/60 transition hover:border-accent-gold/35 hover:text-white">
                                                            <input type="file" accept=".pdf,.docx" className="hidden"
                                                                   onChange={(e) => setAporteConstancia((prev) => ({ ...prev, [c.que]: { ...a, fichero: e.target.files?.[0] ?? null } }))} />
                                                            {a.fichero ? a.fichero.name : 'o adjuntar el documento'}
                                                        </label>
                                                        <button type="button" disabled={aportando || (!a.texto.trim() && !a.fichero)}
                                                                onClick={() => { onAportar(a.fichero, a.texto, c.que); }}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 text-[12px] font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-40">
                                                            {aportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                            Aportar y volver a proponer
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Pliegue>
                    )}
                    {onAportar && (
                        <Pliegue titulo={`Lo que sabes y los papeles no dicen${contextoAportado ? ` · ${contextoAportado.toLocaleString('es-MX')} caracteres aportados` : ''}`}>
                            <p className="mb-2 text-[12px] leading-relaxed text-white/45">
                                Opcional. Un dato del expediente, una constancia, o el hecho que cambia el análisis. El motor vuelve a proponer con eso delante.
                                Si es la resolución que decidió una violación procesal —la interlocutoria de la reclamación, el acuerdo de preclusión—,
                                el estudio confronta sus razones una por una: son la razón toral, no un papel más.
                            </p>
                            {claseContexto && contextoAportado > 0 && (
                                <p className={cn('mb-2 rounded-xl border px-3 py-2 text-[12px]',
                                    claseContexto.clase === 'resolucion_procesal'
                                        ? 'border-accent-gold/35 bg-accent-gold/[0.06] text-accent-gold/90'
                                        : 'border-white/10 text-white/60')}>
                                    {claseContexto.clase === 'resolucion_procesal'
                                        ? 'Lo aportado se leyó como la resolución que decidió la violación procesal: el motor confrontará sus razones.'
                                        : claseContexto.clase === 'constancia'
                                            ? 'Lo aportado se leyó como una constancia de autos.'
                                            : 'Lo aportado entra como material del expediente.'}
                                </p>
                            )}
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
                <div id="asi-sale" className={cn('rounded-2xl border p-4 sm:p-5',
                    alguienSeAparta ? 'border-accent-gold/45 bg-accent-gold/[0.06]' : 'border-white/10 bg-white/[0.03]')}>
                    {faltanIndispensables.length > 0 && (
                        <p className="mb-3 rounded-xl border border-accent-gold/35 bg-accent-gold/[0.06] px-3 py-2 text-[12px] leading-relaxed text-accent-gold/90">
                            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                            Faltan {faltanIndispensables.length} constancia{faltanIndispensables.length === 1 ? '' : 's'} que el motor considera
                            indispensable{faltanIndispensables.length === 1 ? '' : 's'}: el proyecto puede generarse, pero lo que dependa de
                            ellas irá como no acreditado.
                        </p>
                    )}
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
                    {/* ═══ EL CÓMPUTO DA EXTEMPORÁNEA Y NADIE LO DECIDIÓ ═══
                        David, 15-sep-2026: «a pesar del aviso de
                        extemporaneidad, si el secretario decide continuar con
                        el estudio, el redactor debe entregar el proyecto». El
                        botón sigue activo a propósito —nunca se bloquea el
                        fondo—, pero si nadie tocó la tarjeta de arriba y se
                        genera así, sale SÓLO la improcedencia, sin una letra
                        de fondo: eso tiene que verse aquí, no descubrirse al
                        abrir el .docx. */}
                    {extemporanea && !oportunidadDecidida && (
                        <p className="mt-2.5 flex items-start gap-1.5 text-[12px] text-amber-300/90">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                El cómputo dice extemporánea y no decidiste qué hacer con eso:
                                si generas así, sale SÓLO la improcedencia, sin el fondo. Sube
                                a «El cómputo da extemporánea» y elige «Fue oportuna» o
                                «Estudio en reserva» si quieres otra cosa.
                            </span>
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        {botonGenerar(true)}
                    </div>
                </div>
            )}
        </div>
    );
}
