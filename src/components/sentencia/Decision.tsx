'use client';

import React, { useMemo, useState } from 'react';
import { Check, Loader2, PenLine, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from './primitivas';
import type { ProblemaJuridico } from './tipos';
import type { RespuestaPropuesta } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   LA PANTALLA DE DECISIÓN, EN UNA FRASE Y DOS BOTONES
   ═══════════════════════════════════════════════════════════════════════════
   David (15-sep-2026): «es un cuadro muy complejo; podemos reducirlo a botones
   y entonces sí desplegar. Esto hará la labor más sencilla del secretario».

   Lo que había —`VentanaCriterio`— ponía a la vez: el medidor de fuerza, los
   dos modos de resolver, la propuesta global con su alternativa, la razón
   global, cada problema con sus siete calificaciones y su razón, el contexto
   que aportar y los conceptos de violación. Todo correcto y todo abierto: el
   secretario llegaba y no sabía por dónde empezar.

   Aquí el orden es el de la decisión de verdad:
     1. UNA FRASE: lo que el motor propone, con su razón y su confianza.
     2. DOS BOTONES: aceptar y generar, o corregir algo.
     3. Sólo al corregir se despliegan los problemas, como renglones con un
        interruptor de tres posiciones —prospera, no prospera, sin materia—.
        Las siete calificaciones finas quedan detrás de un pliegue por
        problema, para cuando la fina cambia el efecto.
     4. La razón se pide sólo donde el secretario se aparta de la propuesta:
        ahí sí, en dos líneas, porque el estudio se alinea a lo que escriba.

   NO CAMBIA NADA DEL MOTOR NI DE LO QUE VIAJA AL SERVIDOR: los mismos
   `problemas`, el mismo `onCambiar`, el mismo `onGenerar`. La precedencia
   —lo que marcó el secretario gana a lo que propuso el motor— la sigue
   aplicando `modos_decision.repartir` en el servidor. Ésta es sólo la
   pantalla. */

const PROSPERAN = new Set(['fundado', 'esencialmente_fundado',
                           'sustancialmente_fundado', 'parcialmente_fundado']);
const NO_PROSPERAN = new Set(['fundado_insuficiente', 'infundado', 'inoperante',
                              'inatendible', 'ineficaz']);

type Posicion = 'si' | 'no' | 'sm' | '';

function posicionDe(sentido: string | undefined): Posicion {
    const s = (sentido || '').toLowerCase();
    if (!s) return '';
    if (s === 'sin_materia' || s === 'innecesario') return 'sm';
    if (PROSPERAN.has(s)) return 'si';
    if (NO_PROSPERAN.has(s)) return 'no';
    return '';
}

/* Las calificaciones que puede escribir un proyecto, en el orden en que un
   secretario las piensa. Las cuatro de arriba prosperan; las de abajo no. */
const FINAS: { id: string; etiqueta: string; grupo: Posicion }[] = [
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

function legible(sentido: string): string {
    const f = FINAS.find((x) => x.id === (sentido || '').toLowerCase());
    return f ? f.etiqueta : (sentido || '').replace(/_/g, ' ');
}

/* La frase grande. Dice lo que el resolutivo va a hacer, no la etiqueta. */
function fraseDe(sentido: string, esRecurso: boolean): string {
    const p = posicionDe(sentido);
    const que = legible(sentido).toLowerCase();
    if (p === 'si') return esRecurso ? `Prospera el recurso: ${que}` : `Se concede: ${que}`;
    if (p === 'no') return esRecurso ? `No prospera: agravios ${que}s` : `Se niega: conceptos ${que}s`;
    if (p === 'sm') return 'Queda sin materia';
    return legible(sentido) || 'Sin sentido propuesto';
}

function Confianza({ nivel }: { nivel: string }) {
    const n = (nivel || '').toLowerCase();
    const on = n === 'alta' ? 3 : n === 'media' ? 2 : n ? 1 : 0;
    return (
        <span className="inline-flex items-center gap-1 align-middle" title={`Confianza ${n || 'sin dato'}`}>
            {[0, 1, 2].map((i) => (
                <i key={i} className={cn('h-[5px] w-3.5 rounded-full',
                    i < on ? 'bg-accent-gold' : 'bg-white/10')} />
            ))}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-white/45">
                {n ? `confianza ${n}` : ''}
            </span>
        </span>
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
    sentidoGlobal = '', onSentidoGlobal, onRazonGlobal,
    tocados, onRazonar, razonando,
    conceptosViolacion = '', onConceptosViolacion,
    onAportar, aportando, contextoAportado = 0,
    esRecurso = false,
}: {
    problemas: ProblemaJuridico[];
    onCambiar: (id: string, campo: 'criterio' | 'sentido', valor: string) => void;
    onGenerar: () => void;
    generando?: boolean;
    propuesta: RespuestaPropuesta | null;
    proponiendo?: boolean;
    onProponer?: () => void;
    sentidoGlobal?: string;
    onSentidoGlobal?: (s: string) => void;
    onRazonGlobal?: (t: string) => void;
    tocados?: Set<string>;
    onRazonar?: (id: string, pregunta: string, sentido: string) => void;
    razonando?: Set<string>;
    conceptosViolacion?: string;
    onConceptosViolacion?: (t: string) => void;
    onAportar?: (documento: File | null, texto: string) => void;
    aportando?: boolean;
    contextoAportado?: number;
    esRecurso?: boolean;
}) {
    const [corrigiendo, setCorrigiendo] = useState(false);
    const [porQue, setPorQue] = useState(false);
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
    const [textoAporte, setTextoAporte] = useState('');
    const [ficheroAporte, setFicheroAporte] = useState<File | null>(null);

    const global = propuesta?.global ?? null;
    const principal = useMemo(
        () => problemas.find((p) => (p.jerarquia ?? '') === 'principal') ?? problemas[0],
        [problemas]);

    /* Lo que el motor propuso para cada problema, por su posición. */
    const propuestaDe = (i: number) => propuesta?.propuestas?.[i];
    const contrasteDe = (i: number) =>
        (propuesta?.contraste ?? []).find((c) => c.numero === i + 1);

    /* ¿Se aparta el secretario de la propuesta en algún problema? Sólo ahí se
       le pide el porqué. */
    const seAparta = useMemo(() => problemas.map((p, i) => {
        const suya = tocados?.has(p.id) && !!p.sentido;
        const motor = propuestaDe(i)?.sentido || '';
        return suya && motor && posicionDe(p.sentido) !== posicionDe(motor);
    }), [problemas, tocados, propuesta]); // eslint-disable-line react-hooks/exhaustive-deps

    const faltaRazon = problemas.some((p, i) => seAparta[i] && !(p.criterio || '').trim());
    const todosConSentido = problemas.length > 0 && problemas.every((p) => !!p.sentido);
    const puedeGenerar = !generando && !proponiendo && (global?.alcanza || todosConSentido) && !faltaRazon;
    const necesitaConceptos = !!propuesta?.necesitaConceptos && !(conceptosViolacion || '').trim();

    const elegir = (p: ProblemaJuridico, i: number, pos: Posicion) => {
        const actual = (p.sentido || '').toLowerCase();
        const motor = (propuestaDe(i)?.sentido || '').toLowerCase();
        let fino = '';
        if (pos === 'sm') fino = 'sin_materia';
        else if (posicionDe(actual) === pos) fino = actual;
        else if (posicionDe(motor) === pos) fino = motor;
        else fino = pos === 'si' ? 'fundado' : 'infundado';
        onCambiar(p.id, 'sentido', fino);
        /* El principal manda el sentido de todo el asunto: si el secretario
           lo cambia, el global le sigue —y queda dictado por él—. */
        if (principal && p.id === principal.id) {
            onSentidoGlobal?.(fino);
            onRazonGlobal?.('');
        }
    };

    const abrir = (id: string) => setAbiertos((prev) => {
        const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
    });

    /* ── SIN PROPUESTA TODAVÍA ── */
    if (proponiendo) {
        return (
            <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/[0.04] p-6">
                <p className="text-[12px] uppercase tracking-[0.14em] text-accent-gold/80">
                    Paso 3 · decidir
                </p>
                <div className="mt-3 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
                    <p className="text-[16px] font-medium text-white/90">
                        El motor está leyendo el acervo y contrastando cada planteamiento
                        con la razón toral de la sentencia…
                    </p>
                </div>
                <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-3 animate-pulse rounded-full bg-white/[0.06]"
                             style={{ width: `${86 - i * 18}%` }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ═══ LA FRASE ═══ */}
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
                            {posicionDe(global.sentido) === 'si' ? 'P' : posicionDe(global.sentido) === 'no' ? 'N' : '—'}
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-serif text-xl font-medium leading-tight text-white sm:text-2xl">
                                {fraseDe(global.sentido, esRecurso)}
                            </h2>
                            <div className="mt-1.5"><Confianza nivel={global.confianza} /></div>
                            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/75">
                                {global.razon}
                            </p>
                            {global.apoyos?.length > 0 && (
                                <p className="mt-1.5 text-[12px] text-white/45">
                                    {global.apoyos.length} {global.apoyos.length === 1 ? 'criterio' : 'criterios'} de
                                    apoyo con registro verificado
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
                                ? 'Propuso problema por problema. Revísalos abajo y decide; el proyecto sale con lo que marques.'
                                : 'Con el material de este asunto no propuso ningún sentido. Decide tú, problema por problema.'}
                        </p>
                    </div>
                )}

                {/* ═══ LOS DOS BOTONES ═══ */}
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <button type="button" onClick={onGenerar} disabled={!puedeGenerar || necesitaConceptos}
                            className={cn(
                                'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5',
                                'text-[14px] font-semibold text-charcoal-900 transition',
                                'bg-gradient-to-b from-[#e3c98a] to-accent-gold',
                                'shadow-[0_10px_30px_-12px_rgba(201,169,98,0.7)]',
                                'hover:-translate-y-px hover:shadow-[0_16px_40px_-14px_rgba(201,169,98,0.9)]',
                                'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none')}>
                        {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {generando ? 'Escribiendo el proyecto…'
                            : seAparta.some(Boolean) ? 'Generar con mi criterio'
                            : global ? 'Aceptar y generar el proyecto' : 'Generar el proyecto'}
                    </button>
                    {problemas.length > 0 && (
                        <button type="button" onClick={() => setCorrigiendo((v) => !v)}
                                className={cn(
                                    'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[14px] font-medium transition',
                                    corrigiendo ? 'border-accent-gold/45 bg-accent-gold/10 text-white'
                                                : 'border-white/15 bg-white/[0.05] text-white/90 hover:bg-white/[0.08]')}>
                            <PenLine className="h-4 w-4" />
                            {corrigiendo ? 'Ocultar los problemas' : global ? 'Corregir algo' : 'Decidir por problema'}
                        </button>
                    )}
                    {global && (
                        <button type="button"
                                onClick={() => { setPorQue((v) => !v); if (!porQue) setCorrigiendo(true); }}
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
                {faltaRazon && (
                    <p className="mt-2.5 text-[12px] text-amber-300/90">
                        Te apartas de la propuesta en algún problema: escribe el porqué en dos líneas
                        antes de generar. El estudio se alinea a lo que escribas.
                    </p>
                )}
                {necesitaConceptos && (
                    <p className="mt-2.5 text-[12px] text-amber-300/90">
                        Este recurso levanta un sobreseimiento y el tribunal tiene que estudiar los
                        conceptos de violación por primera vez. Pégalos abajo antes de generar.
                    </p>
                )}
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
                        <div className="sm:col-span-2 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                                La otra salida · {legible(global.alternativa.sentido)}
                            </p>
                            <p className="text-[13px] leading-relaxed text-white/60">{global.alternativa.razon}</p>
                            <button type="button"
                                    onClick={() => {
                                        onSentidoGlobal?.(global.alternativa.sentido);
                                        onRazonGlobal?.(global.alternativa.razon || '');
                                        if (principal) onCambiar(principal.id, 'sentido', global.alternativa.sentido);
                                        setCorrigiendo(true);
                                    }}
                                    className="mt-2 text-[12px] font-medium text-accent-gold/90 hover:text-accent-gold">
                                Resolver así, en vez de como propone el motor
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ LOS PROBLEMAS, COMO RENGLONES ═══ */}
            {corrigiendo && problemas.length > 0 && (
                <div className="space-y-2">
                    {problemas.map((p, i) => {
                        const pos = posicionDe(p.sentido);
                        const motor = propuestaDe(i);
                        const con = contrasteDe(i);
                        const abierto = abiertos.has(p.id) || porQue;
                        const razonEnCurso = razonando?.has(p.id);
                        return (
                            <div key={p.id}
                                 className={cn('rounded-2xl border bg-black/20 p-3.5 transition-colors',
                                     seAparta[i] ? 'border-accent-gold/35' : 'border-white/[0.07] hover:border-white/15')}>
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                                    <button type="button" onClick={() => abrir(p.id)}
                                            className="min-w-0 text-left">
                                        <span className="block text-[14px] leading-snug text-white/90">
                                            <span className="mr-1.5 text-white/45">{i + 1}.</span>{p.pregunta}
                                        </span>
                                        <span className="mt-0.5 block text-[12px] text-white/45">
                                            {(p.jerarquia ?? '') === 'principal' && 'De este problema cuelga el resultado · '}
                                            {motor?.sentido
                                                ? `el motor propone ${legible(motor.sentido).toLowerCase()}`
                                                : 'sin propuesta del motor'}
                                            {p.sentido && ` · ahora: ${legible(p.sentido).toLowerCase()}`}
                                        </span>
                                    </button>
                                    <div role="group" aria-label={`Sentido del problema ${i + 1}`}
                                         className="inline-grid grid-flow-col overflow-hidden rounded-xl border border-white/15 bg-black/30">
                                        {([['no', 'No prospera'], ['si', 'Prospera'], ['sm', 'Sin materia']] as const).map(([v, t], k) => (
                                            <button key={v} type="button" onClick={() => elegir(p, i, v)}
                                                    className={cn(
                                                        'px-3 py-2 text-[12px] font-medium transition-colors',
                                                        k > 0 && 'border-l border-white/[0.07]',
                                                        pos === v
                                                            ? (v === 'si' ? 'bg-accent-gold text-charcoal-900'
                                                               : v === 'no' ? 'bg-white/85 text-charcoal-900'
                                                               : 'bg-white/45 text-charcoal-900')
                                                            : 'text-white/60 hover:text-white')}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* el porqué del motor y el contraste, plegados */}
                                {abierto && (
                                    <div className="mt-3 border-t border-white/[0.07] pt-3 text-[13px] leading-relaxed text-white/75">
                                        {motor?.razon && <p><span className="font-medium text-white">Por qué lo propone.</span> {motor.razon}</p>}
                                        {con && (
                                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                                <div className="rounded-xl border border-white/[0.07] p-2.5">
                                                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-white/45">Razón toral</p>
                                                    <p className="text-[12px] leading-snug text-white/75">{con.razon_toral || '—'}</p>
                                                </div>
                                                <div className="rounded-xl border border-white/[0.07] p-2.5">
                                                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-white/45">¿La combate?</p>
                                                    <p className="text-[12px] leading-snug text-white/75">
                                                        {con.la_combate ? 'Sí' : 'No'}{con.por_que ? ` · ${con.por_que}` : ''}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-white/[0.07] p-2.5">
                                                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-white/45">¿Sobrevive por otra razón?</p>
                                                    <p className="text-[12px] leading-snug text-white/75">
                                                        {con.sobrevive ? 'Sí' : 'No'} · {con.veredicto_previo.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {motor?.apoyos?.length ? (
                                            <p className="mt-2 text-[12px] text-white/45">
                                                Apoyos: registros {motor.apoyos.slice(0, 4).join(', ')}{motor.apoyos.length > 4 ? '…' : ''}
                                            </p>
                                        ) : null}
                                    </div>
                                )}

                                {/* la calificación fina, sólo cuando cambia el efecto */}
                                <div className="mt-3">
                                    <Pliegue titulo={`Calificación exacta · ${p.sentido ? legible(p.sentido) : 'sin elegir'}`}>
                                        <div className="flex flex-wrap gap-1.5">
                                            {FINAS.map((f) => (
                                                <button key={f.id} type="button"
                                                        onClick={() => {
                                                            onCambiar(p.id, 'sentido', f.id);
                                                            if (principal && p.id === principal.id) onSentidoGlobal?.(f.id);
                                                        }}
                                                        className={cn(
                                                            'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                                                            (p.sentido || '') === f.id
                                                                ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                                                                : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white')}>
                                                    {f.etiqueta}
                                                </button>
                                            ))}
                                        </div>
                                    </Pliegue>
                                </div>

                                {/* la razón, sólo donde se aparta */}
                                {seAparta[i] && (
                                    <div className="mt-3 rounded-xl border border-accent-gold/30 bg-accent-gold/[0.04] p-3">
                                        <label htmlFor={`razon-${p.id}`} className="block text-[12px] font-medium text-accent-gold/90">
                                            Te apartas de la propuesta. Di por qué en dos líneas: el estudio se alinea a tu criterio.
                                        </label>
                                        <textarea id={`razon-${p.id}`} rows={3} value={p.criterio || ''}
                                                  onChange={(e) => onCambiar(p.id, 'criterio', e.target.value)}
                                                  placeholder="p. ej.: la deficiencia de motivación no es subsanable porque la medida incide en la libertad y el domicilio de un menor"
                                                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5
                                                             text-[14px] leading-relaxed text-white/90 placeholder:text-white/45
                                                             outline-none focus:border-accent-gold/45" />
                                        {onRazonar && p.sentido && (
                                            <button type="button" disabled={razonEnCurso}
                                                    onClick={() => onRazonar(p.id, p.pregunta, p.sentido!)}
                                                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-white/60 transition-colors hover:text-white disabled:opacity-50">
                                                {razonEnCurso ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                Que el motor la redacte con este sentido y la corrijo
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ LO QUE CASI NUNCA HACE FALTA, PLEGADO ═══ */}
            {(propuesta?.necesitaConceptos || onAportar) && (
                <div className="space-y-2">
                    {propuesta?.necesitaConceptos && onConceptosViolacion && (
                        <Pliegue titulo="Los conceptos de violación del amparo" abierto={necesitaConceptos}>
                            <p className="mb-2 text-[12px] leading-relaxed text-white/45">
                                Se levanta un sobreseimiento y el tribunal asume jurisdicción: hay que estudiar
                                los conceptos por primera vez, y no constan en el expediente del recurso.
                            </p>
                            <textarea rows={5} value={conceptosViolacion}
                                      onChange={(e) => onConceptosViolacion(e.target.value)}
                                      placeholder="Pega aquí los conceptos de violación de la demanda de amparo"
                                      className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5
                                                 text-[14px] leading-relaxed text-white/90 placeholder:text-white/45
                                                 outline-none focus:border-accent-gold/45" />
                        </Pliegue>
                    )}
                    {onAportar && (
                        <Pliegue titulo={`Lo que sabes y los papeles no dicen${contextoAportado ? ` · ${contextoAportado.toLocaleString('es-MX')} caracteres aportados` : ''}`}>
                            <p className="mb-2 text-[12px] leading-relaxed text-white/45">
                                Opcional. Un dato del expediente, una constancia, o el hecho que cambia el
                                análisis. El motor vuelve a proponer con eso delante.
                            </p>
                            <textarea rows={3} value={textoAporte} onChange={(e) => setTextoAporte(e.target.value)}
                                      className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5
                                                 text-[14px] leading-relaxed text-white/90 outline-none focus:border-accent-gold/45" />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20
                                                  px-3 py-2 text-[12px] text-white/60 transition hover:border-accent-gold/35 hover:text-white">
                                    <input type="file" accept=".pdf,.docx" className="hidden"
                                           onChange={(e) => setFicheroAporte(e.target.files?.[0] ?? null)} />
                                    {ficheroAporte ? ficheroAporte.name : 'o un documento'}
                                </label>
                                <button type="button" disabled={aportando || (!textoAporte.trim() && !ficheroAporte)}
                                        onClick={() => { onAportar(ficheroAporte, textoAporte); }}
                                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3.5
                                                   text-[13px] font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-40">
                                    {aportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    Aportar y volver a proponer
                                </button>
                            </div>
                        </Pliegue>
                    )}
                </div>
            )}
        </div>
    );
}
