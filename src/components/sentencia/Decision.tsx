'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, PenLine, Sparkles, ChevronRight, AlertTriangle, Zap } from 'lucide-react';
import { cn, Pastilla } from './primitivas';
import type { ProblemaJuridico, TarjetaDecision } from './tipos';
import type { RespuestaPropuesta, ViaProtectora, FormatoSentencia,
              PropuestaSuplencia, DecisionSuplencia, TesisDelAcervo } from './api';
import { FINAS, grupoDe, legible } from './calificaciones';
import ProblemaPrincipal from './ProblemaPrincipal';
import type { MarcaDeSecundario } from './ProblemaPrincipal';
import { conceptosQueFaltan, elegirTarjeta, ladoDelSentido, prosperaDeLaVia, resolverAsiDicta, rotuloDeSuerte,
         suerteDe, tarjetaDeLaPropuesta, viaActivaDe } from './tarjetaDelPrincipal';
import type { LadoDeLaTarjeta, ViaActiva } from './tarjetaDelPrincipal';
import EstudiarJuntos from './EstudiarJuntos';
import ComoSeEstudiara, { usePlanDelEstudio, jerarquiaDelPlan } from './ComoSeEstudiara';
import type { EnlacePlan, JerarquiaDelPlan } from './ComoSeEstudiara';
import { MENSAJE_SIN_CALIFICAR, porQueLegible, pendientesAlGenerar, firmaPendientes } from './recalificacion';
import type { Superpuesta } from './recalificacion';

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
     1. EL PROBLEMA PRINCIPAL Y SU SOLUCIÓN (28-sep-2026, tras el AR
        631/2025; antes, «la frase» del motor y un «ver por qué» que escondía
        la vía contraria): el principal, los secundarios con su suerte, las
        dos vías del mismo peso y tres botones. Ver ProblemaPrincipal.tsx.
     2. «RESOLVER CON MI CRITERIO» abre la ventana de siempre, sin cambiarla.
     3. En esa ventana, LAS DOS VÍAS DE SIEMPRE, explícitas: todo el asunto —una
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

/* FINAS, grupoDe, legible y fraseDe viven desde el 28-sep-2026 en
   calificaciones.ts: la tarjeta del problema principal las lee igual. */

/* ═══ LA VÍA PROTECTORA (24-sep-2026) ═══
   David, sobre el 711/2025: «sólo operan ese tipo de interpretaciones en
   favor de la persona y en supuestos de alternativas para mayor acceso… si
   cambio de alternativa, señalar cuándo sería posible una interpretación
   conforme o pro persona». La propuesta dice qué calificación favorece a
   quien reclama el derecho y si en ella cabe esa lectura; aquí se enseña al
   elegir. Coincide por GRUPO, no por palabra: si la vía protectora es «no
   prospera», lo es también «inoperante». */
function AvisoViaProtectora({ via, sentido }: { via?: ViaProtectora | null; sentido: string }) {
    if (!via?.sentido || !sentido || grupoDe(via.sentido) === '' || grupoDe(sentido) === 'sm') return null;
    if (grupoDe(sentido) === grupoDe(via.sentido)) {
        return via.posible ? (
            <div className="mt-2.5 rounded-xl border border-accent-gold/30 bg-accent-gold/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white/80">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-accent-gold/90">
                    Cabe interpretación conforme o pro persona
                </p>
                <p><span className="text-white/90">{via.norma}</span>{via.lectura ? ` — ${via.lectura}` : ''}</p>
                {via.limite && <p className="mt-1 text-white/55">Límite: {via.limite}</p>}
                <p className="mt-1 text-white/50">
                    Esta calificación favorece a quien reclama el derecho: el criterio que redacte el motor partirá de esa lectura.
                </p>
            </div>
        ) : (
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/50">
                Esta calificación favorece a quien reclama el derecho, pero ningún precepto admite aquí una lectura más favorable
                {via.lectura ? `: ${via.lectura}` : '.'}
            </p>
        );
    }
    return (
        <p className="mt-2.5 text-[12px] leading-relaxed text-white/50">
            Con esta calificación no se invocan el pro persona ni la interpretación conforme: operan sólo a favor de quien reclama el derecho.
            {via.posible && (
                <> Si resolvieras «{legible(via.sentido)}», cabría: <span className="text-white/70">{via.norma}</span>
                    {via.lectura ? ` — ${via.lectura}` : ''}</>
            )}
        </p>
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

/* ═══ LA SUPLENCIA DE LA QUEJA, UN PASO MÁS (David, 26-sep-2026) ═══
   «Sí de acuerdo»: la suplencia es una decisión de umbral y la toma el
   secretario, no un patrón. El motor propone la fracción del artículo 79, a
   favor de quién y por qué, y pone a la vista lo que conviene mirar también
   —la fracción que la parte pide, los indicios de la VII—. Él confirma,
   cambia la fracción o dice que no hay. Sólo la CONFIRMADA llega al estudio
   como decisión suya: con ella no cabe declarar inoperante por su
   formulación ningún planteamiento de esa parte —se suple y se estudia—, y la
   suplencia sólo se escribe en la sentencia si de ella deriva un beneficio.
   Vive fuera del condicional de modo: se ve igual en los tres. */
function PasoSuplencia({ propuesta, valor, onCambiar }: {
    propuesta: PropuestaSuplencia;
    valor: DecisionSuplencia | null;
    onCambiar?: (d: DecisionSuplencia | null) => void;
}) {
    const [cambiando, setCambiando] = useState(false);
    const confirmada = !!valor?.confirmada;
    const fraccion = valor?.fraccion ?? propuesta.fraccion;
    const sinSuplencia = fraccion === 'ninguna';
    const cat = propuesta.fracciones ?? [];
    const deCat = (id: string) => cat.find((f) => f.id === id);
    const rotuloDe = (id: string) => deCat(id)?.rotulo || id;
    const esLaPropuesta = !valor || valor.fraccion === propuesta.fraccion;
    /* A FAVOR DE QUIÉN, SEGÚN LA FRACCIÓN (revisión, 26-sep-2026). Se heredaba
       el de la propuesta a cualquier fracción: con la II propuesta —en favor
       del menor— y la V elegida, la V salía «a favor del menor»; y al revés, la
       II elegida a mano salía a favor del adulto que promovía. El beneficiario
       que fija la ley viene en el catálogo; si no, es quien promueve. */
    const aFavorDePara = (id: string) => id === 'ninguna' ? ''
        : (deCat(id)?.aFavorDe
           || (id === propuesta.fraccion ? propuesta.aFavorDe : '')
           || propuesta.parte);
    const aFavorDe = sinSuplencia ? '' : (valor?.aFavorDe || aFavorDePara(fraccion));
    const elegir = (id: string) => {
        onCambiar?.({ fraccion: id, aFavorDe: aFavorDePara(id), confirmada: true });
        setCambiando(false);
    };
    const alternativas = (propuesta.alternativas ?? []).filter((a) => a.fraccion !== fraccion);
    return (
        <div className={cn('rounded-2xl border p-4 sm:p-5',
            confirmada ? 'border-accent-gold/35 bg-accent-gold/[0.04]' : 'border-white/10 bg-white/[0.03]')}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Suplencia de la queja</p>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
                    confirmada ? 'border-accent-gold/45 text-accent-gold' : 'border-white/15 text-white/50')}>
                    {confirmada ? 'decisión tuya' : 'propuesta del motor'}
                </span>
            </div>
            <p className="mt-2 text-[15px] font-medium text-white">
                {sinSuplencia ? 'Sin suplencia: se estudia en estricto derecho'
                              : `Artículo 79 de la Ley de Amparo, ${rotuloDe(fraccion)}`}
            </p>
            {aFavorDe && <p className="mt-0.5 text-[13px] text-white/70">A favor de {aFavorDe}</p>}
            {!sinSuplencia && deCat(fraccion)?.texto && (
                <p className="mt-1 text-[12px] leading-relaxed text-white/45">{deCat(fraccion)?.texto}</p>
            )}
            {esLaPropuesta ? (
                propuesta.porque && <p className="mt-2 text-[12.5px] leading-relaxed text-white/65">{propuesta.porque}</p>
            ) : (
                <p className="mt-2 text-[12px] text-white/50">
                    El motor proponía: {propuesta.fraccion === 'ninguna' ? 'sin suplencia' : rotuloDe(propuesta.fraccion)}.
                </p>
            )}
            {alternativas.length > 0 && (
                <div className="mt-3 space-y-1.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">También a revisar</p>
                    {alternativas.map((a) => (
                        <div key={a.fraccion} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px]">
                            <button type="button" onClick={() => elegir(a.fraccion)}
                                    title="Elegir esta fracción"
                                    className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11.5px] font-medium
                                               text-white/75 transition-colors hover:border-accent-gold/45 hover:text-white">
                                {a.rotulo || rotuloDe(a.fraccion)}
                            </button>
                            <span className="min-w-0 flex-1 leading-relaxed text-white/55">{a.porque}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {!confirmada && (
                    <button type="button" onClick={() => elegir(propuesta.fraccion)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-gold/45 bg-accent-gold/[0.08]
                                       px-3.5 text-[13px] font-semibold text-accent-gold transition hover:bg-accent-gold/[0.14]">
                        <Check className="h-3.5 w-3.5" />
                        {propuesta.fraccion === 'ninguna' ? 'Confirmar: sin suplencia' : 'Confirmar la suplencia'}
                    </button>
                )}
                {/* Sólo si hay otra fracción que elegir (auditoría, 26-sep-2026). */}
                {cat.length > 1 && (
                <button type="button" onClick={() => setCambiando((v) => !v)} aria-expanded={cambiando}
                        className="inline-flex h-9 items-center rounded-xl border border-white/15 bg-white/[0.04] px-3.5
                                   text-[13px] font-medium text-white/80 transition hover:bg-white/[0.08]">
                    {cambiando ? 'Ocultar las fracciones' : 'Cambiar la fracción'}
                </button>
                )}
                {/* Si lo que está en pantalla ya es «sin suplencia», el botón de
                    confirmar lo cubre: dos botones para lo mismo confunden. */}
                {!sinSuplencia && (
                    <button type="button" onClick={() => elegir('ninguna')}
                            className="inline-flex h-9 items-center rounded-xl border border-white/10 px-3.5 text-[13px]
                                       font-medium text-white/60 transition hover:border-white/20 hover:text-white">
                        Sin suplencia
                    </button>
                )}
                {valor && (
                    <button type="button" onClick={() => { onCambiar?.(null); setCambiando(false); }}
                            className="inline-flex h-9 items-center rounded-xl px-2 text-[12.5px] font-medium
                                       text-accent-gold/80 transition hover:text-accent-gold">
                        Volver a la propuesta
                    </button>
                )}
            </div>
            {cambiando && (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {cat.map((f) => (
                        <button key={f.id} type="button" onClick={() => elegir(f.id)}
                                aria-pressed={f.id === fraccion && confirmada}
                                className={cn('rounded-xl border p-2.5 text-left transition-colors',
                                    f.id === fraccion ? 'border-accent-gold/50 bg-accent-gold/[0.07]'
                                                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]')}>
                            <span className="block text-[12.5px] font-medium text-white/90">
                                {f.id === 'ninguna' ? 'Sin suplencia' : f.rotulo}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-snug text-white/50">{f.texto}</span>
                        </button>
                    ))}
                </div>
            )}
            {/* LO QUE ESTA LÍNEA PROMETE ES LO QUE EL SERVIDOR HACE (revisión,
                26-sep-2026). La VI no es absoluta —el bloque del estudio sólo
                suple la violación evidente—, y «sin suplencia» no añade nada al
                encargo: el estudio se escribe como antes, con las reglas de
                la ley que ya traía. Decía «no la invoca», y en un asunto
                laboral esas reglas la siguen nombrando. */}
            <p className="mt-3 text-[11.5px] leading-relaxed text-white/45">
                {confirmada && fraccion === 'VI'
                    ? 'Confirmada: el estudio suple sólo la violación evidente que dejó sin defensa a esa parte —en lo demás, estricto derecho— y, si no la advierte, te lo dice en las advertencias.'
                    : confirmada && !sinSuplencia
                    ? 'Confirmada: el estudio no declara inoperante por su formulación ningún planteamiento de esa parte —lo suple y lo estudia— y sólo menciona la suplencia en la sentencia si de ella deriva un beneficio (art. 79).'
                    : confirmada
                        ? 'Decidiste que no hay suplencia: el estudio no recibe ninguna orden de suplir y se escribe como hasta ahora.'
                        : 'Mientras no la confirmes, el estudio no la trata como decisión tuya y se escribe como hasta ahora.'}
            </p>
        </div>
    );
}

/* ═══ LA MARCA DE UN ACCESORIO TUMBADO (26-sep-2026) ═══
   David: «si cambio sentido hay que tumbar y regenerar con la premisa del
   cambio de sentido». Lo que tenía era la calificación de la otra vía y ya no
   se enseña: o se está recalificando, o llegó recalificado con su porqué, o no
   salió y se dice qué pasará. En los cuatro casos, una pastilla lo pisa. */
function MarcaRecalificacion({ sup, onReintentar }: { sup: Superpuesta; onReintentar?: () => void }) {
    if (sup.estado === 'recalificando') {
        return (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-accent-gold/85">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Recalificando con tu premisa…</span>
                <span className="text-white/45">· el principal va por la vía contraria a la que propuso el motor; la calificación que tenía no se usa</span>
            </p>
        );
    }
    if (sup.estado === 'recalificada') {
        const pq = porQueLegible(sup.porQue);
        return (
            <p className="mt-1 text-[12px] text-accent-gold/85">
                Recalificado con tu premisa
                {pq ? <span className="text-white/55"> · {pq}</span> : null}
                <span className="text-white/40"> · márcalo tú si no estás de acuerdo</span>
            </p>
        );
    }
    return (
        <p className="mt-1 flex items-start gap-1.5 text-[12px] leading-relaxed text-amber-300/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
                {MENSAJE_SIN_CALIFICAR}
                {sup.estado === 'fallo' && porQueLegible(sup.porQue)
                    ? <span className="text-white/45"> · {porQueLegible(sup.porQue)}</span> : null}
                {sup.estado === 'error' && (
                    <span className="text-white/55"> No se pudo recalificar desde aquí{sup.porQue ? ` (${sup.porQue})` : ''}; al
                    generar, el servidor lo intentará otra vez con tu premisa y, si tampoco sale, no escribirá el proyecto.</span>
                )}
                {/* También tras un «fallo» (revisión adversarial, 26-sep-2026):
                    el servidor no rehace uno que ya falló la validación —lo
                    devuelve al momento— y sí reintenta el que cortó el
                    proveedor o el tiempo; sin el botón, eso sólo pasaba al
                    generar, sin que él viera antes con qué salía. */}
                {(sup.estado === 'error' || (sup.estado === 'fallo' && sup.reintentable !== false)) && onReintentar && (
                    <button type="button" onClick={onReintentar}
                            className="ml-1.5 font-medium text-accent-gold/90 hover:text-accent-gold">
                        volver a intentar
                    </button>
                )}
            </span>
        </p>
    );
}

/* Sin propuesta (la pidió y falló, o se está volviendo a pedir): la tarjeta
   dice que no hay y deja a mano «Resolver con mi criterio» y «Volver a pedir
   la propuesta», como hacía «la frase». */
const SIN_PROPUESTA: RespuestaPropuesta = {
    propuestas: [], global: null, contraste: [], resumen: '', avisos: [],
    criteriosJson: '', modelo: '', necesitaConceptos: false,
};

/* Sin enlace, el hook no pide nada: la cuenta no escribe con plan. */
const PLAN_APAGADO: EnlacePlan = {
    activo: false, firma: '',
    pedir: () => Promise.reject(new Error('sin plan')),
    leer: () => Promise.reject(new Error('sin plan')),
};

/** «CÓMO SE ESTUDIARÁ» EN LA TARJETA FINAL, con la jerarquía del plan. El
 *  denominador son los argumentos del PRINCIPAL sin el que decide ni los
 *  pendientes de sentido (revisión, 28-sep-2026): con todos los segmentos del
 *  plan, la captura del 462 decía «1 de 25 se resuelven por consecuencia»
 *  cuando el servidor había resuelto 23 de los 23 restantes. */
export function decideYSigue(j: JerarquiaDelPlan): string {
    const quien = `decide el problema ${j.principal.n}${j.decide ? ` (${j.decide})` : ''}`;
    if (!j.argumentos) return quien;
    const k = j.siguen + j.caen;
    return `${quien}; de ${j.argumentos === 1 ? 'su otro argumento' : `sus otros ${j.argumentos} argumentos`}, `
        + `${k === j.argumentos && k > 1 ? 'todos' : k} se ${k === 1 ? 'resuelve' : 'resuelven'} por consecuencia`;
}

/* LAS VARIANTES DEL PROMPT DEL ESTUDIO, sólo para cuentas de casa (26-sep-2026).
   Hasta hoy la variante sólo se podía pedir desde el banco de medición; para
   probar el plan en el montaje real —con clic, no con un guion— hace falta
   elegirla aquí. Al resto de cuentas el servidor les ignora el campo. */
const VARIANTES: { id: string; rotulo: string; que: string }[] = [
    { id: '', rotulo: 'por omisión', que: 'La que tenga el servidor (ESTUDIO_PROMPT).' },
    { id: 'v1', rotulo: 'v1', que: 'El prompt de producción, congelado.' },
    { id: 'v2', rotulo: 'v2', que: 'La limpieza del Paso 1.' },
    { id: 'v3', rotulo: 'v3', que: 'v2 con el inventario de argumentos y las marcas.' },
    { id: 'v4', rotulo: 'v4 · con plan', que: 'v3 con el plan del estudio: enciende «Cómo se estudiará».' },
];

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
    propuestaSuplencia = null, suplencia = null, onSuplencia,
    grupos = {}, onGrupos,
    plan,
    esCasa = false, varianteEstudio = '', onVarianteEstudio,
    recalificadas = {}, recalificacionEnCurso = false, avisosRecalificacion = [],
    onReintentarRecalificacion,
    tarjeta = null, tesisDelMaterial, onAbrirTesis,
    onVolverALaPropuesta, onResolverPorLaVia,
}: {
    problemas: ProblemaJuridico[];
    onCambiar: (id: string, campo: 'criterio' | 'sentido', valor: string) => void;
    /** 'estandar' es el botón de siempre; 'moderna', el segundo. */
    onGenerar: (formato: FormatoSentencia) => void;
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
    /** LA SUPLENCIA QUE PROPONE EL MOTOR (26-sep-2026), del asunto. */
    propuestaSuplencia?: PropuestaSuplencia | null;
    /** Lo que decidió el secretario; null = aún no decide. */
    suplencia?: DecisionSuplencia | null;
    onSuplencia?: (d: DecisionSuplencia | null) => void;
    /** «ESTUDIAR JUNTOS», en los tres modos (26-sep-2026): id del problema →
     *  letra del grupo. Ver EstudiarJuntos.tsx. */
    grupos?: Record<string, string>;
    onGrupos?: (g: Record<string, string>) => void;
    /** EL PLAN DEL ESTUDIO (Paso 2): cómo pedirlo y leerlo, y si esta cuenta
     *  escribe con él. Sin enlace activo, el panel no aparece. */
    plan?: EnlacePlan | null;
    /** Cuenta de casa: puede elegir la variante del prompt del estudio. */
    esCasa?: boolean;
    varianteEstudio?: string;
    onVarianteEstudio?: (v: string) => void;
    /** LOS ACCESORIOS TUMBADOS POR EL CAMBIO DE SENTIDO (26-sep-2026), por id:
     *  lo que se pinta ENCIMA de su calificación —recalificando, recalificado
     *  con su porqué, o sin calificar—. Ver recalificacion.ts. */
    recalificadas?: Record<string, Superpuesta>;
    /** Hay un reparto o una recalificación en camino: el plan espera. */
    recalificacionEnCurso?: boolean;
    avisosRecalificacion?: string[];
    onReintentarRecalificacion?: () => void;
    /** LA TARJETA DEL PROBLEMA PRINCIPAL que armó el servidor (GET
     *  /taller/tarjeta, 28-sep-2026). null mientras no llega o si el servidor
     *  aún no la sirve: entonces se pinta la que arma la pantalla con la
     *  propuesta (`tarjetaDeLaPropuesta`). */
    tarjeta?: TarjetaDecision | null;
    /** Las tesis del material: el clic en un criterio de la tarjeta abre la
     *  suya en VentanaTesis, con su texto. */
    tesisDelMaterial?: TesisDelAcervo[];
    onAbrirTesis?: (t: TesisDelAcervo) => void;
    /** «RESOLVER ASÍ»: vuelve a la propuesta del motor —todo el asunto, su
     *  sentido y su razón, NO dictado— y suelta lo tocado a mano. No es
     *  `onSentidoGlobal`, que dicta siempre (page.tsx `elegirGlobal`): con el
     *  global dictado el sentido se vuelve la brocha de todos los no tocados y
     *  el árbol deja de recalificar (lector2_visor.md, riesgo 2). */
    onVolverALaPropuesta?: () => void;
    /** Resolver por otra vía entera: todo el asunto, ESE sentido dictado y SU
     *  razón —siempre la sustituye: lección 1 del 631—, y lo tocado suelto. */
    onResolverPorLaVia?: (sentido: string, razon: string) => void;
}) {
    const [corrigiendo, setCorrigiendo] = useState(false);
    /* SIN PROPUESTA GLOBAL, LAS CALIFICACIONES A LA VISTA (auditoría,
       26-sep-2026): el texto decía «decide tú, problema por problema» pero las
       diez calificaciones sólo salían tras «Cambiar el sentido», y el botón de
       generar quedaba apagado sin salida visible. */
    /* Y CON PROPUESTA GLOBAL, CERRADA (revisión del 28-sep-2026): `corrigiendo`
       sólo subía y nunca bajaba; tras «Resolver con mi criterio» una
       propuesta nueva dejaba la ventana abierta sobre una elección que ya no
       existía. Cada propuesta global vuelve a la tarjeta. */
    useEffect(() => { if (propuesta) setCorrigiendo(!propuesta.global); }, [propuesta]);
    /* ═══ LA VÍA QUE ÉL ELIGIÓ (28-sep-2026) ═══
       null hasta que pulsa uno de los tres botones de la tarjeta. Cada
       propuesta nueva la olvida: la elección era sobre otra. Sin propuesta
       global no hay vías que elegir: decide en su ventana, que ya está
       abierta. El plan del estudio espera a que haya vía (ver
       `listoParaPlan`): alternar entre las dos vías antes de decidir gastaba
       las cuatro corridas de la sesión en firmas que nadie iba a usar. */
    const [viaElegida, setViaElegida] = useState<ViaActiva | null>(null);
    useEffect(() => { setViaElegida(propuesta && !propuesta.global ? 'criterio' : null); }, [propuesta]);
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
    const [textoAporte, setTextoAporte] = useState('');
    // Cuál de los dos botones se pulsó: el giro va en ése, no en los dos.
    const [formatoPulsado, setFormatoPulsado] = useState<FormatoSentencia>('estandar');
    /* ANTES DE GENERAR CON ACCESORIOS SIN CALIFICAR (26-sep-2026): lo que él
       ya vio (la firma de los pendientes cuando pulsó «generar así») y el
       pedido que se detuvo para enseñárselo. Ver `pendientesAlGenerar`. */
    const [pendientesVistos, setPendientesVistos] = useState('');
    const [pedidoDetenido, setPedidoDetenido] = useState<{ firma: string; formato: FormatoSentencia } | null>(null);
    const [ficheroAporte, setFicheroAporte] = useState<File | null>(null);
    /* El problema que se está corrigiendo y su texto en curso. */
    const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
    /* Lo que se está tecleando/adjuntando para cada constancia pedida. */
    const [aporteConstancia, setAporteConstancia] = useState<Record<string, { texto: string; fichero: File | null }>>({});
    const constancias = propuesta?.global?.constancias ?? [];
    const faltanIndispensables = constancias.filter((c) => c.indispensable && !constanciasAportadas?.has(c.que));
    /* «Quiero cambiar de sentido» desde el proyecto terminado es elegir su
       criterio a sabiendas: abre la ventana y cuenta como vía elegida. */
    useEffect(() => {
        if (abrirCorreccion > 0) { setCorrigiendo(true); setViaElegida('criterio'); }
    }, [abrirCorreccion]);

    const global = propuesta?.global ?? null;
    const principal = useMemo(
        () => problemas.find((p) => (p.jerarquia ?? '') === 'principal') ?? problemas[0],
        [problemas]);
    const propuestaDe = (i: number) => propuesta?.propuestas?.[i];
    const contrasteDe = (i: number) => (propuesta?.contraste ?? []).find((c) => c.numero === i + 1);
    const enGlobal = modo === 'global';

    /* ═══ LA TARJETA DEL PROBLEMA PRINCIPAL ═══
       La del servidor si llegó; si no, la que se arma aquí con la propuesta
       (sin estado y con la suerte de los secundarios «prevista»). */
    const tarjetaLocal = useMemo(
        () => tarjetaDeLaPropuesta(propuesta ?? SIN_PROPUESTA, problemas, tesisDelMaterial ?? []),
        [propuesta, problemas, tesisDelMaterial]);
    const tarjetaVista = elegirTarjeta(tarjeta, tarjetaLocal);
    /* Cualquier marca a mano cuenta, también la del principal: en «todo el
       asunto» viaja y gana a la calificación global (opcionesDelProyecto). */
    const nTocados = problemas.filter((p) => tocados?.has(p.id) && !!p.sentido).length;
    const viaActiva: ViaActiva = viaActivaDe({
        enGlobal, globalDictado, sentidoGlobal, razonGlobal,
        sentidoMotor: global?.sentido ?? '', nTocados, tarjeta: tarjetaVista, elegida: viaElegida,
    });
    /* Él eligió con un botón (o abrió su ventana, que también lo marca).
       SÓLO `viaElegida` (revisión del 28-sep-2026): con `|| corrigiendo`, una
       ventana abierta antes de pedir otra vez la propuesta hacía pedir el plan
       de la propuesta nueva sin que él eligiera nada, y elegir después gastaba
       otra corrida: dos de las cuatro de la sesión (TOPE_CORRIDAS) sobre un
       criterio que nadie eligió. */
    const viaConfirmada = !!viaElegida;
    /* De qué vía es la suerte que se pinta en los secundarios: la de la vía
       en pantalla; con su criterio, la de la vía cuyo grupo casa con cómo
       calificó el principal (en su ventana, lo que él marcó manda y se dice
       aparte, en `marcados`). */
    const sentidoDelPrincipal = enGlobal ? sentidoGlobal
        : principal ? (recalificadas[principal.id]?.sentido || principal.sentido || '') : '';
    const ladoSecundarios: LadoDeLaTarjeta | null = viaActiva === 'propuesta' ? 'propuesta'
        : viaActiva === 'contraria' ? 'opuesta'
        : ladoDelSentido(tarjetaVista, sentidoDelPrincipal);
    const prosperaDelLado = ladoSecundarios === 'opuesta' ? prosperaDeLaVia(tarjetaVista?.vias.opuesta)
        : ladoSecundarios === 'propuesta' ? prosperaDeLaVia(tarjetaVista?.vias.propuesta) : null;
    /* Los secundarios cuya calificación en pantalla NO es la de la vía: en
       «todo el asunto», los que él marcó a mano; problema por problema, lo que
       hay en la pantalla (su marca, el reparto o lo recalificado), que es lo
       que viaja. */
    const marcados = useMemo(() => {
        const m: Record<number, MarcaDeSecundario> = {};
        problemas.forEach((p, i) => {
            if (principal && p.id === principal.id) return;
            const suyo = !!tocados?.has(p.id) && !!p.sentido;
            if (enGlobal) {
                if (suyo) m[i + 1] = { sentido: p.sentido || '', quien: 'marcado por ti' };
                return;
            }
            const sup = recalificadas[p.id];
            if (suyo) m[i + 1] = { sentido: p.sentido || '', quien: 'marcado por ti' };
            else if (sup) m[i + 1] = { sentido: sup.sentido, quien: sup.estado === 'recalificada' ? 'recalificado' : 'por recalificar' };
            else if (p.sentido) {
                m[i + 1] = { sentido: p.sentido, quien: p.de === 'principal' ? 'sigue al principal'
                    : p.de === 'distinto' ? 'se estudia aparte' : p.de === 'mayor_beneficio' ? 'se estudia' : 'en pantalla' };
            }
        });
        return m;
    }, [problemas, principal, tocados, enGlobal, recalificadas]);

    /* LOS TRES BOTONES. Cada vía se elige entera; su criterio abre la ventana
       de siempre —global o problema por problema, las diez calificaciones, la
       razón y «Redactar un criterio»— SIN tocar nada de lo que hay en ella. */
    const bajarA = (id: string) => {
        if (typeof window === 'undefined') return;
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    };
    const resolverAsi = () => {
        const vp = tarjetaVista?.vias.propuesta;
        if (!global || !vp) return;
        setViaElegida('propuesta');
        setCorrigiendo(false);
        /* Con la deliberación, la vía propuesta puede no ser la del motor: se
           dicta con SU sentido y SU razón —también si la calificación coincide
           con la del motor y la razón no (revisión del 28-sep-2026: volver al
           eco hacía viajar la razón del motor, que la tarjeta no enseñaba)—.
           Sin ella es volver a la propuesta. */
        if (resolverAsiDicta(tarjetaVista, global)) onResolverPorLaVia?.(vp.sentido, vp.razon);
        else onVolverALaPropuesta?.();
        bajarA('asi-sale');
    };
    const resolverOpuesta = () => {
        const vo = tarjetaVista?.vias.opuesta;
        if (!vo?.sentido) return;
        setViaElegida('contraria');
        setCorrigiendo(false);
        onResolverPorLaVia?.(vo.sentido, vo.razon || '');
        bajarA('asi-sale');
    };
    /* UNA SOLUCIÓN DE LA LISTA (rediseño, etapa 3): viaja como la contraria
       —su sentido y SU razón—; para la pantalla es su criterio, porque no es
       ninguna de las dos columnas. */
    const resolverSolucion = (sentido: string, razon: string) => {
        if (!sentido) return;
        setViaElegida('criterio');
        setCorrigiendo(false);
        onResolverPorLaVia?.(sentido, razon || '');
        bajarA('asi-sale');
    };
    const miCriterio = () => {
        setViaElegida('criterio');
        setCorrigiendo(true);
        bajarA('mi-criterio');
    };

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
    /* LOS CONCEPTOS, POR LO QUE VIAJA (SPEC B §1; revisión del 28-sep-2026,
       AR 631/2025): ver `conceptosQueFaltan`. Antes sólo contaba
       `necesitaConceptos`, calculado con el sentido del motor: en el 631 el
       motor dijo «infundado», él resolvió en sentido opuesto (revoca una
       concesión) y «Generar» y el plan seguían abiertos sin los conceptos.
       Lo que viaja: en «todo el asunto», la global y lo que él marcó; problema
       por problema, lo que hay en pantalla (lo recalificado encima). */
    const sentidosQueViajan = enGlobal
        ? [sentidoGlobal, ...problemas.filter((p) => tocados?.has(p.id) && !!p.sentido).map((p) => p.sentido)]
        : problemas.map((p) => (recalificadas[p.id] ? recalificadas[p.id].sentido : p.sentido));
    /* El de /taller/proponer (calculado para «fundado»); si ese servidor no
       lo manda, el de la tarjeta del servidor (calculado para la vía que
       revoca). */
    const coVia = propuesta?.conceptosOmitidos !== undefined ? propuesta.conceptosOmitidos
        : tarjetaVista?.origen === 'servidor' && tarjetaVista.conceptos_omitidos ? tarjetaVista.conceptos_omitidos
        : undefined;
    const conceptos = conceptosQueFaltan({
        co: coVia, necesitaMotor: !!propuesta?.necesitaConceptos,
        sentidosQueViajan, conceptos: conceptosViolacion,
    });
    const necesitaConceptos = conceptos.faltan;
    const revocaConcesion = conceptos.reasuncion === 'concesion';
    /* AL REVOCAR UNA CONCESIÓN SE PIDEN, NO SE EXIGEN (David, 28-sep-2026, AR
       631/2025: «genéralo ya sin los conceptos, con el hueco, y esto da pauta
       para pedir al secretario los conceptos de violación cuando vaya por esa
       ruta»). El recuadro se abre solo y lo dice, pero «Generar» sigue activo:
       el servidor deja en HUECO el punto del amparo y lo advierte, sin afirmar
       «no ampara» sobre conceptos que nadie estudió. Al levantar un
       sobreseimiento sigue bloqueando, como antes. */
    const bloqueaConceptos = necesitaConceptos && !revocaConcesion;
    const puedeGenerar = !generando && !proponiendo && listoParaGenerar && !faltaRazon && !bloqueaConceptos;
    const alguienSeAparta = enGlobal ? globalSeAparta : seAparta.some(Boolean);

    /* EL PLAN SE PIDE CUANDO LA DECISIÓN ESTÁ COMPLETA Y QUIETA: cada problema
       con sentido, la razón escrita donde se aparta, los conceptos pegados si
       hacen falta, y el motor sin redactar ninguna razón —si no, se ordenaría
       sobre una razón que está a punto de cambiar—. El antirrebote vive en el
       hook. Y CON LA VÍA ELEGIDA (28-sep-2026): con la tarjeta del principal
       el secretario alterna entre la propuesta y la contraria antes de
       decidir, y cada alternancia es otra firma: pedir el plan de la que está
       en pantalla antes de que la elija gastaba corridas del tope de cuatro. */
    const listoParaPlan = !!plan?.activo && viaConfirmada && listoParaGenerar && !faltaRazon && !bloqueaConceptos
        && !generando && !proponiendo && !(razonando && razonando.size > 0) && !razonandoGlobal
        /* Ni mientras se recalifican los accesorios tumbados: el plan se ordena
           sobre el criterio YA recalificado (contrato_recalificar.md), y
           pedirlo antes gastaría una corrida en lo que está por cambiar. */
        && !recalificacionEnCurso;
    const estadoPlan = usePlanDelEstudio(plan ?? PLAN_APAGADO, listoParaPlan);
    const planHecho = estadoPlan.respuesta?.plan ?? null;
    const jer = jerarquiaDelPlan(planHecho, problemas);

    /* ACEPTAR UNA PROPUESTA DEL PLAN = PULSAR ESA CALIFICACIÓN A MANO. Mismo
       camino que las pastillas: en «todo el asunto», si es el principal, cambia
       la calificación global; si no, la del problema, que queda como suya y se
       le redacta la razón del sentido nuevo. */
    const aceptarPropuesta = (p: ProblemaJuridico, a: string) => {
        const s = (a || '').toLowerCase();
        if (!FINAS.some((f) => f.id === s)) return;
        if (enGlobal && principal && p.id === principal.id) {
            onSentidoGlobal?.(s);
            if (grupoDe(s) !== grupoDe(global?.sentido)) onRazonGlobal?.('');
            return;
        }
        onCambiar(p.id, 'sentido', s);
        onRazonar?.(p.id, p.pregunta, s);
    };
    /* LO QUE LA TARJETA FINAL DICE DE ESE PROBLEMA, y a qué alcanza aceptar
       (revisión, 26-sep-2026). En «todo el asunto» el principal lleva la
       calificación GLOBAL: aceptar una propuesta suya cambia el asunto
       entero, y el botón tiene que decirlo así, no «el problema 1». */
    const esPrincipalGlobal = (p: ProblemaJuridico) => enGlobal && !!principal && p.id === principal.id;
    const sentidoEnPantalla = (p: ProblemaJuridico) => (esPrincipalGlobal(p) ? (sentidoGlobal || '')
        : enGlobal ? (tocados?.has(p.id) && p.sentido ? p.sentido : '')
        // El tumbado enseña la recalificada, o nada: la de la otra vía no.
        : recalificadas[p.id] ? recalificadas[p.id].sentido : (p.sentido || ''));
    const alcanceDe = (p: ProblemaJuridico, n: number) => (esPrincipalGlobal(p) ? 'todo el asunto' : `el problema ${n}`);
    const nGrupos = new Set(Object.values(grupos)).size;

    const abrir = (id: string) => setAbiertos((prev) => {
        const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
    });

    /* La tarjeta final: con qué va a salir el proyecto y de quién es cada calificación. */
    const filasFinales = useMemo(() => problemas.map((p, i) => {
        const motor = propuestaDe(i);
        if (enGlobal) {
            const esPrincipal = principal && p.id === principal.id;
            const suyo = !!tocados?.has(p.id) && !!p.sentido;
            /* LA SUERTE DE CADA ACCESORIO, LA MISMA DE LA TARJETA DE ARRIBA
               (28-sep-2026). Decía «sigue al principal» en blanco: el
               secretario generaba sin ver qué le pasaba a cada uno. Ahora es
               la del reparto de la vía en pantalla —el árbol, o lo que el motor
               previó si el árbol lo dejaba por recalificar— y se dice cuál. */
            const suerte = !esPrincipal && !suyo
                ? suerteDe(tarjetaVista, i + 1, p.pregunta, ladoSecundarios) : null;
            const rs = suerte ? rotuloDeSuerte(suerte, prosperaDelLado) : null;
            return {
                id: p.id, pregunta: p.pregunta, grupo: grupos[p.id] ?? '',
                sentido: esPrincipal ? sentidoGlobal : suyo ? (p.sentido || '') : (suerte?.sentido || ''),
                de: esPrincipal ? (globalDictado ? 'tuya' : 'del motor')
                    : suyo ? 'tuya'
                    : rs ? `${rs.corto || 'sigue al principal'}${suerte?.previsto ? ' · previsto' : ''}`
                    : 'sigue al principal',
            };
        }
        const sup = recalificadas[p.id];
        if (sup) {
            /* TUMBADO: con qué sale es lo recalificado, o nada todavía. */
            return {
                id: p.id, pregunta: p.pregunta, sentido: sup.sentido, grupo: grupos[p.id] ?? '',
                de: sup.estado === 'recalificando' ? 'recalificando…'
                    : sup.estado === 'recalificada' ? 'recalificado con tu premisa' : 'sin calificar',
                vacio: sup.estado === 'recalificando' ? 'por recalificar' : 'sin calificar',
            };
        }
        return {
            id: p.id, pregunta: p.pregunta, sentido: p.sentido || '', grupo: grupos[p.id] ?? '',
            de: tocados?.has(p.id) && p.sentido ? 'tuya'
                : motor?.sentido && motor.alcanza ? 'del motor' : (p.sentido ? 'de la pantalla' : 'sin decidir'),
        };
    }), [problemas, enGlobal, sentidoGlobal, globalDictado, tocados, propuesta, principal, grupos, recalificadas,  // eslint-disable-line react-hooks/exhaustive-deps
        tarjetaVista, ladoSecundarios, prosperaDelLado]);
    /* LOS TUMBADOS QUE NO TIENEN CALIFICACIÓN AL PULSAR «GENERAR». El servidor
       ya no escribe el proyecto con un accesorio sin calificar tras el cambio
       de sentido (decisión del integrador, 26-sep-2026): se dice junto al
       botón y el primer clic no manda el pedido hasta que él lo ve. Lo que
       ya calificó no está aquí —manda su marca—, así que no se le bloquea. */
    const pendientesGen = enGlobal ? [] : pendientesAlGenerar(problemas, recalificadas);
    const firmaGen = firmaPendientes(pendientesGen);
    const nRecalificando = pendientesGen.filter((x) => x.estado === 'recalificando').length;
    const nSinCalificar = pendientesGen.filter((x) => x.estado === 'sin_calificar').length;
    const detenido = !!pedidoDetenido && !!firmaGen && pedidoDetenido.firma === firmaGen;
    const generar = (f: FormatoSentencia) => {
        if (firmaGen && pendientesVistos !== firmaGen) {
            setPedidoDetenido({ firma: firmaGen, formato: f });
            return;
        }
        setPedidoDetenido(null);
        setFormatoPulsado(f);
        onGenerar(f);
    };
    const generarAsi = () => {
        const f = pedidoDetenido?.formato ?? 'estandar';
        setPendientesVistos(firmaGen);
        setPedidoDetenido(null);
        setFormatoPulsado(f);
        onGenerar(f);
    };

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

    /* ═══ DOS FORMAS DE SENTENCIA (David, 25-sep-2026) ═══
       «Vamos a dar dos opciones de sentencia (la actual se queda como es) y
       "Generar sentencia en versión moderna"». El botón dorado de siempre es la
       estándar; el segundo, la moderna. Los dos consumen lo mismo: un proyecto.
       Se recuerda cuál se pulsó para que el giro lo lleve ése y no el otro. */
    const botonGenerar = (grande: boolean) => (
        <button type="button" onClick={() => generar('estandar')}
                disabled={!puedeGenerar}
                className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-charcoal-900 transition',
                    grande ? 'h-11' : 'h-10',
                    'bg-gradient-to-b from-[#e3c98a] to-accent-gold',
                    'shadow-[0_10px_30px_-12px_rgba(201,169,98,0.7)]',
                    'hover:-translate-y-px hover:shadow-[0_16px_40px_-14px_rgba(201,169,98,0.9)]',
                    'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none')}>
            {generando && formatoPulsado === 'estandar'
                ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generando && formatoPulsado === 'estandar' ? 'Escribiendo el proyecto…'
                : alguienSeAparta ? 'Generar con mi criterio'
                /* «Aceptar» sólo de lo que la tarjeta enseña como propuesta:
                   con la deliberación, el eco del motor puede ser otra vía. */
                : global && viaActiva === 'propuesta' ? 'Aceptar y generar el proyecto' : 'Generar el proyecto'}
        </button>
    );
    const botonModerna = (
        <button type="button" onClick={() => generar('moderna')}
                disabled={!puedeGenerar}
                className={cn(
                    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 py-2 text-center text-[14px] font-semibold leading-snug transition',
                    'border-accent-gold/45 bg-accent-gold/[0.06] text-accent-gold',
                    'hover:-translate-y-px hover:border-accent-gold/70 hover:bg-accent-gold/[0.1]',
                    'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40')}>
            {generando && formatoPulsado === 'moderna'
                ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {generando && formatoPulsado === 'moderna'
                ? 'Escribiendo la versión moderna…' : 'Generar sentencia en versión moderna'}
        </button>
    );

    return (
        <div className="space-y-4">
            {/* ═══ 1 · EL PROBLEMA PRINCIPAL Y SU SOLUCIÓN (28-sep-2026) ═══
                Sustituye a «la frase» del motor y a «el porqué», que escondía
                la vía contraria detrás de un clic. AQUÍ ARRIBA SIGUE SIN
                GENERARSE: se genera en un solo sitio, la tarjeta final (David,
                16-sep-2026: «no múltiples botones que confundan»). Aquí se
                elige la vía y se baja a ver con qué sale. El aviso de
                extemporaneidad vive junto al botón que genera. */}
            {tarjetaVista && problemas.length > 0 && (
                <ProblemaPrincipal
                    tarjeta={tarjetaVista}
                    esRecurso={esRecurso}
                    hayGlobal={!!global}
                    hayPropuestas={!!propuesta?.propuestas?.length}
                    viaActiva={viaActiva}
                    viaElegida={!!viaElegida}
                    ladoSecundarios={ladoSecundarios}
                    marcados={marcados}
                    razonActiva={enGlobal ? razonGlobal : ''}
                    tesis={tesisDelMaterial}
                    onAbrirTesis={onAbrirTesis}
                    onResolverAsi={resolverAsi}
                    onResolverOpuesta={resolverOpuesta}
                    onResolverSolucion={resolverSolucion}
                    onMiCriterio={miCriterio}
                    onRedactarOpuesta={onRazonarGlobal}
                    redactando={razonandoGlobal}
                    onProponer={onProponer}
                    puedeVerComoSale={listoParaGenerar} />
            )}

            {/* ═══ 3 · CAMBIAR EL SENTIDO: LAS DOS VÍAS DE SIEMPRE ═══ */}
            {corrigiendo && problemas.length > 0 && (
                <div id="mi-criterio" className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
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
                            <AvisoViaProtectora via={global?.via_protectora} sentido={sentidoGlobal} />
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
                                /* TUMBADO POR EL CAMBIO DE SENTIDO: lo que se pinta
                                   es lo recalificado (o nada), no la base. */
                                const sup = recalificadas[p.id];
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
                                        {sup && <MarcaRecalificacion sup={sup} onReintentar={onReintentarRecalificacion} />}
                                        {!sup && p.sentido && p.de && p.de !== 'tuya' && p.de !== 'motor' && (
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
                                            {/* PISARLO = MARCARLO: la pastilla lo deja suyo
                                                (`tocado`) y ya no se recalifica. */}
                                            <Calificativas elegido={sup ? sup.sentido : p.sentido}
                                                           onElegir={(s) => { onCambiar(p.id, 'sentido', s); onRazonar?.(p.id, p.pregunta, s); }} />
                                            {razonEnCurso && <Pastilla tono="ambar">redactando la razón…</Pastilla>}
                                        </div>
                                        {/* La razón del tumbado: mientras se recalifica o si no
                                            salió no hay razón que enseñar —la de la otra vía no se
                                            usa—. Recalificado, se enseña la suya; corregirla es
                                            hacerla tuya: se fija esa calificación como tuya y se
                                            guarda tu texto. */}
                                        {(!sup || sup.estado === 'recalificada') && (
                                        <textarea value={sup ? sup.razon : (p.criterio || '')} rows={3}
                                                  onChange={(e) => {
                                                      if (sup && sup.sentido) onCambiar(p.id, 'sentido', sup.sentido);
                                                      onCambiar(p.id, 'criterio', e.target.value);
                                                  }}
                                                  placeholder="Mi criterio es… porque…"
                                                  className={cn('mt-3 w-full resize-y rounded-xl border bg-black/30 px-3.5 py-2.5 text-[14px] leading-relaxed',
                                                      'text-white/90 placeholder:text-white/45 outline-none',
                                                      seAparta[i] ? 'border-accent-gold/40 focus:border-accent-gold' : 'border-white/10 focus:border-accent-gold/45')} />
                                        )}
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
                            {/* Lo que dijo el servidor al recalificar: una caída que
                                no se pudo verificar con su cita, un accesorio que no
                                salió… */}
                            {avisosRecalificacion.length > 0 && (
                                <ul className="space-y-1 px-1 text-[12px] leading-relaxed text-white/55">
                                    {avisosRecalificacion.map((a, k) => (
                                        <li key={k} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold/70" /><span>{a}</span></li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ LO QUE CASI NUNCA HACE FALTA, PLEGADO ═══ */}
            {(conceptos.pueden || onAportar) && (
                <div className="space-y-2">
                    {/* Se ofrece siempre que alguna vía que prospera los necesite
                        y no consten; se abre sola cuando es la vía que viaja
                        (`conceptosQueFaltan`, SPEC B §1). */}
                    {conceptos.pueden && onConceptosViolacion && (
                        <div id="conceptos-violacion">
                        <Pliegue titulo="Los conceptos de violación del amparo" abierto={necesitaConceptos}>
                            <p className="mb-2 text-[12px] leading-relaxed text-white/45">
                                {revocaConcesion
                                    ? 'Si el recurso prospera se revoca una concesión y el tribunal reasume jurisdicción: estudia los conceptos que el juez no estudió'
                                    : 'Se levanta un sobreseimiento y el tribunal asume jurisdicción: hay que estudiar los conceptos por primera vez'}
                                {coVia?.fundamento ? ` (${coVia.fundamento})` : ''}, y no constan en lo que se subió.
                            </p>
                            <textarea rows={5} value={conceptosViolacion} onChange={(e) => onConceptosViolacion(e.target.value)}
                                      placeholder="Pega aquí los conceptos de violación de la demanda de amparo"
                                      className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] leading-relaxed text-white/90 placeholder:text-white/45 outline-none focus:border-accent-gold/45" />
                        </Pliegue>
                        </div>
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

            {/* ═══ 3-bis · LA SUPLENCIA DE LA QUEJA ═══
                Fuera del condicional de modo y de «cambiar el sentido»: es un
                paso de la decisión en los tres modos, no una corrección. */}
            {propuestaSuplencia && (problemas.length > 0 || sentidoGlobal) && (
                <PasoSuplencia propuesta={propuestaSuplencia} valor={suplencia} onCambiar={onSuplencia} />
            )}

            {/* ═══ 3-ter · ESTUDIAR JUNTOS, EN LOS TRES MODOS ═══
                Fuera del condicional de modo y de «cambiar el sentido», como la
                suplencia: agrupar no es corregir la propuesta, es decir cómo se
                estudia. En «todo el asunto» también viaja (ver page.tsx).
                LO QUE SE PROMETE ES LO QUE RECIBE EL ESTUDIO (revisión
                adversarial, 26-sep-2026). Decía «si atacan consideraciones
                distintas, contesta cada una por separado dentro de él», y la
                v1 —la de todas las cuentas— recibía «no los contestes por
                separado dentro de él». Ahora las cuatro variantes reciben el
                mismo texto de grupo (fase6_estudio `_bloque_criterio`, el de la
                v2): un apartado que abre con qué los une, una calificación
                conjunta, la premisa común una vez y, dentro, una respuesta
                identificable por argumento y la suya al que trae un dato
                propio; la v4 además los separa por proposición en el plan.
                Ninguna condiciona eso a que ataquen consideraciones
                distintas, y la pantalla no decía lo de la calificación
                conjunta, que es lo que más cambia. Y el servidor saca del
                grupo al que el sentido del principal deja sin estudiar
                (innecesario, caído con él o sin calificar) y lo dice en los
                avisos («EL GRUPO X NO SE APLICÓ…», main.py
                `_grupos_tras_el_arbol`): también se promete. */}
            {onGrupos && problemas.length >= 2 && (
                <Pliegue titulo={`Problemas que se estudian juntos${nGrupos ? ` · ${nGrupos} ${nGrupos === 1 ? 'grupo' : 'grupos'}` : ''}`}
                         abierto={nGrupos > 0}>
                    <p className="mb-2.5 text-[12px] leading-relaxed text-white/45">
                        Marca dos o más si se resuelven con una sola línea argumentativa. El estudio los trata en un
                        apartado que abre diciendo qué los une, con una calificación conjunta; expone una vez la premisa
                        común y, dentro, cada argumento recibe su respuesta, y el que trae un dato propio, la suya. Si el
                        sentido del principal deja alguno sin estudiar, sale del grupo y se te avisa.
                    </p>
                    <EstudiarJuntos problemas={problemas} grupos={grupos} onGrupos={onGrupos} />
                </Pliegue>
            )}

            {/* ═══ 3-quater · CÓMO SE ESTUDIARÁ (Paso 2) ═══
                Fuera del condicional de modo: el orden del estudio depende de
                la decisión entera, se haya tomado como se haya tomado. */}
            {plan?.activo && (problemas.length > 0 || sentidoGlobal) && (
                <ComoSeEstudiara estado={estadoPlan} problemas={problemas}
                                 onAceptarPropuesta={aceptarPropuesta}
                                 puedeAceptar={(a) => FINAS.some((f) => f.id === (a || '').toLowerCase())}
                                 sentidoEnPantalla={sentidoEnPantalla}
                                 alcanceDe={alcanceDe}
                                 esRecurso={esRecurso} />
            )}

            {/* ═══ 4 · LA TARJETA FINAL: CON QUÉ SALE EL PROYECTO ═══ */}
            {(problemas.length > 0 || sentidoGlobal) && (
                <div id="asi-sale" className={cn('tarjeta-clave rounded-2xl border p-4 sm:p-5',
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
                        <p className="rotulo-clave text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Así va a salir el proyecto</p>
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
                                <span className="min-w-0 flex-1 text-white/75">
                                    {f.pregunta}
                                    {f.grupo && (
                                        <span className="ml-2 rounded-lg bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-gold/90">
                                            juntos · {f.grupo}
                                        </span>
                                    )}
                                </span>
                                <span className={cn('shrink-0 font-medium', f.sentido ? 'text-white' : 'text-white/45')}>
                                    {f.sentido ? legible(f.sentido) : (enGlobal ? '' : (f.vacio || 'sin decidir'))}
                                </span>
                                <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                                    f.de === 'tuya' ? 'border-accent-gold/45 text-accent-gold' : 'border-white/15 text-white/45')}>
                                    {f.de}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {/* LA SUPLENCIA, TAMBIÉN AQUÍ: la tarjeta dice con qué sale el
                        proyecto, y con qué suplencia es parte de eso. */}
                    {propuestaSuplencia && (
                        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                            <span className="text-white/45">Suplencia:</span>
                            <span className="min-w-0 flex-1 text-white/80">
                                {(() => {
                                    const f = suplencia?.fraccion ?? propuestaSuplencia.fraccion;
                                    if (f === 'ninguna') return 'sin suplencia';
                                    const r = propuestaSuplencia.fracciones.find((x) => x.id === f)?.rotulo || f;
                                    const q = suplencia?.aFavorDe || propuestaSuplencia.aFavorDe || propuestaSuplencia.parte;
                                    return `artículo 79, ${r}${q ? ` · a favor de ${q}` : ''}`;
                                })()}
                            </span>
                            <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                                suplencia?.confirmada ? 'border-accent-gold/45 text-accent-gold' : 'border-white/15 text-white/45')}>
                                {suplencia?.confirmada ? 'tuya' : 'sin confirmar'}
                            </span>
                        </p>
                    )}
                    {propuestaSuplencia && !suplencia?.confirmada && propuestaSuplencia.fraccion !== 'ninguna' && (
                        <p className="mt-1.5 text-[12px] text-amber-300/90">
                            El motor propone suplir la queja y no lo has confirmado: el estudio no la aplicará como decisión tuya.
                        </p>
                    )}
                    {/* EL PLAN, TAMBIÉN AQUÍ: con qué orden sale el estudio es
                        parte de «así va a salir». */}
                    {plan?.activo && (
                        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                            <span className="text-white/45">Cómo se estudiará:</span>
                            <span className="min-w-0 flex-1 text-white/80">
                                {!viaConfirmada ? 'se ordena cuando elijas la vía, arriba'
                                    : recalificacionEnCurso ? 'se ordena en cuanto terminen de recalificarse los accesorios'
                                    : estadoPlan.fase === 'pidiendo' || estadoPlan.fase === 'en_curso' ? 'ordenándose con tu decisión…'
                                    : planHecho && !estadoPlan.desactualizado
                                        ? (jer ? decideYSigue(jer)
                                               : `${planHecho.unidades.length} ${planHecho.unidades.length === 1 ? 'apartado' : 'apartados'} · ${planHecho.segmentos.length} argumentos`)
                                    : planHecho ? 'se reordenará con tu último cambio'
                                    : estadoPlan.fase === 'fallo' || estadoPlan.fase === 'sin_plan'
                                        ? 'sin plan por ahora: se intentará al generar'
                                        : 'se ordena cuando la decisión esté completa'}
                            </span>
                            <a href="#como-se-estudiara" className="shrink-0 text-[12px] text-accent-gold/85 hover:text-accent-gold">ver ↑</a>
                        </p>
                    )}
                    {faltaRazon && (
                        <p className="mt-2.5 text-[12px] text-amber-300/90">
                            Te apartas de la propuesta: escribe el porqué antes de generar. El estudio se alinea a lo que escribas.
                        </p>
                    )}
                    {necesitaConceptos && (
                        <p className="mt-2.5 text-[12px] text-amber-300/90">
                            {revocaConcesion ? (
                                <>
                                    Por esta vía se revoca una concesión: el tribunal reasume jurisdicción y estudia los conceptos
                                    de violación que el juez no estudió. Pégalos{' '}
                                    <a href="#conceptos-violacion" className="underline underline-offset-2">arriba</a>; si generas
                                    sin ellos, el punto del amparo sale en hueco y el proyecto lo advierte.
                                </>
                            ) : (
                                <>
                                    Este recurso levanta un sobreseimiento: pega los conceptos de violación{' '}
                                    <a href="#conceptos-violacion" className="underline underline-offset-2">arriba</a> antes de generar.
                                </>
                            )}
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
                    {/* ═══ JUNTO AL BOTÓN: LOS ACCESORIOS SIN CALIFICAR ═══
                        (26-sep-2026) Con uno sin calificar tras el cambio de
                        sentido el servidor no escribe el proyecto; con uno
                        recalificándose, lo termina antes —y si no sale, no
                        escribe—. Se dice aquí, pegado al botón, con la lista;
                        y si pulsa sin haberlo visto, el pedido se detiene y se
                        le pregunta. No se bloquea: «generar así» lo manda. */}
                    {pendientesGen.length > 0 && (
                        <div id="antes-de-generar" role={detenido ? 'alert' : undefined}
                             className={cn('mt-3 rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed',
                                 detenido ? 'border-amber-300/60 bg-amber-300/[0.08]' : 'border-amber-300/25 bg-amber-300/[0.04]')}>
                            {nSinCalificar > 0 && (
                                <p className="flex items-start gap-1.5 text-amber-300/90">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>
                                        {nSinCalificar === 1 ? 'Un accesorio quedó' : `${nSinCalificar} accesorios quedaron`} sin
                                        calificar tras tu cambio de sentido: {nSinCalificar === 1 ? 'califícalo' : 'califícalos'} tú
                                        antes de generar (un clic en su calificación), o vuelve a intentar. Si generas así y el
                                        motor tampoco {nSinCalificar === 1 ? 'lo' : 'los'} recalifica, el proyecto no se escribe: el
                                        servidor te devuelve la lista.
                                    </span>
                                </p>
                            )}
                            {nRecalificando > 0 && (
                                <p className={cn('flex items-start gap-1.5 text-amber-300/90', nSinCalificar > 0 && 'mt-1.5')}>
                                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                                    <span>
                                        {nRecalificando === 1 ? 'Un accesorio se está' : `${nRecalificando} accesorios se están`} recalificando
                                        con tu premisa. Si generas ahora, el servidor terminará esa recalificación antes de escribir el
                                        estudio —hasta minuto y medio más— y te lo dirá mientras tanto; si no sale, no escribe el
                                        proyecto y te dice {nRecalificando === 1 ? 'que quedó' : 'cuáles quedaron'} sin calificar.
                                    </span>
                                </p>
                            )}
                            <ul className="mt-1.5 grid gap-0.5 pl-5 text-white/70">
                                {pendientesGen.map((x) => (
                                    <li key={x.id} className="flex flex-wrap items-baseline gap-x-1.5">
                                        <span className="text-white/45">{x.numero}.</span>
                                        <span className="min-w-0 flex-1 truncate">{x.pregunta}</span>
                                        <span className="shrink-0 text-white/45">
                                            {x.estado === 'recalificando' ? 'recalificándose…' : 'sin calificar'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {detenido && (
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <span className="text-white/75">
                                        No se envió todavía: {nSinCalificar === 0 ? 'espera unos segundos o'
                                            : `${nSinCalificar === 1 ? 'califícalo' : 'califícalos'} arriba, vuelve a intentar o`} genera así.
                                    </span>
                                    <button type="button" onClick={generarAsi} disabled={!puedeGenerar}
                                            className="rounded-lg border border-amber-300/50 px-2.5 py-1 font-medium text-amber-200 hover:bg-amber-300/10 disabled:opacity-40">
                                        Generar así
                                    </button>
                                    {nSinCalificar > 0 && onReintentarRecalificacion && (
                                        <button type="button" onClick={() => { setPedidoDetenido(null); onReintentarRecalificacion(); }}
                                                className="rounded-lg border border-white/15 px-2.5 py-1 text-white/75 hover:bg-white/[0.06]">
                                            Volver a intentar la recalificación
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        {botonGenerar(true)}
                        {botonModerna}
                    </div>
                    {/* QUÉ ENTREGA CADA UNO, dicho antes de pulsar. */}
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
                            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">Formato estándar</dt>
                            <dd className="mt-1 text-[12px] leading-relaxed text-white/60">
                                Concepto por concepto, con la fórmula del oficio: «Sobre el primer
                                {esRecurso ? ' agravio' : ' concepto de violación'}, en el que
                                {esRecurso ? ' la parte recurrente' : ' la quejosa'} sostiene… Se considera
                                infundado. Lo anterior…». Extensión y resúmenes completos.
                            </dd>
                        </div>
                        <div className="rounded-xl border border-accent-gold/25 bg-accent-gold/[0.04] px-3.5 py-2.5">
                            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-gold/85">Versión moderna</dt>
                            <dd className="mt-1 text-[12px] leading-relaxed text-white/65">
                                Atiende el problema jurídico central de forma exhaustiva y con
                                argumentación de alto nivel, pero prescinde de lo irrelevante: cada
                                punto abre con su pregunta y enseguida se responde. Hechos, sentencia y
                                {esRecurso ? ' agravios' : ' conceptos'} se sintetizan a lo que es materia
                                de estudio. Contesta todos los planteamientos, con menos texto.
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-2 text-[12px] text-white/40">
                        Cualquiera de las dos consume un proyecto de tu contador.
                    </p>
                </div>
            )}
        </div>
    );
}
