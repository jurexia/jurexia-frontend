'use client';

import React from 'react';
import { AlertTriangle, Check, ChevronRight, Loader2, PenLine } from 'lucide-react';
import { cn } from './primitivas';
import { FilaDelEspejo } from './FilaDelEspejo';
import { SolucionesPosibles } from './SolucionesPosibles';
import type { TesisDelAcervo } from './api';
import type { ApoyoDeLaVia, FilaDeTuTribunal, TarjetaDecision, ViaDeLaTarjeta } from './tipos';
import { fraseDe, legible } from './calificaciones';
import {
    apoyosParaCitar, contrasteParaVia, decisivaYaEsElPrincipal, hayAlternativaReal, lineaDeLaFicha,
    preguntaRecurridaAparte, propuestaDelJuez, ladoQueRevoca, prosperaDeLaVia, rotuloDeSuerte, sinRecomendar, textoDeFuerza, tribunalPorLado, vigenciaDudosa, comoFilaDelEspejo,
} from './tarjetaDelPrincipal';
import type { LadoDeLaTarjeta, ViaActiva } from './tarjetaDelPrincipal';

/* ═══════════════════════════════════════════════════════════════════════════
   EL PROBLEMA PRINCIPAL Y SU SOLUCIÓN (28-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   David, tras el AR 631/2025: «lo más importante es plantearle al secretario
   cuál es el problema principal y cuáles son los secundarios. Y preguntarle
   cómo resolverías tú este problema jurídico. Yo te propongo aplicar esta
   interpretación o esta jurisprudencia (…) ¿o quieres resolver en sentido
   opuesto? dándole la alternativa de solución sustentada también. (…) que haya
   nada más un botón que me permita ir a resolver con mi criterio».

   Sustituye en Decision «1 · La frase» y «El porqué». De arriba abajo:
     1. el principal —la pregunta, por qué es el principal y si el motor tomó
        otro como decisivo—;
     2. lo que se resuelve por consecuencia: cada secundario con su suerte EN
        LA VÍA ACTIVA, sin pedir nada;
     3. dos columnas del MISMO peso: la propuesta y la contraria, cada una con
        su desenlace, su razón, los criterios con que se aplicaría (con su
        fuerza para un colegiado y su vigencia), el propio tribunal, el
        contraste y por dónde se cae;
     4. tres botones: resolver así, en sentido opuesto, o con mi criterio (la
        ventana manual de siempre, sin cambiarla).

   EL MISMO PESO, A PROPÓSITO. El motor acierta el 50% contra los engroses de
   Kingston —«siempre niega» da 54%— y sobre-concede: una tarjeta que empuja
   a aceptar convierte ese 50% en el criterio del tribunal. Por eso las dos
   columnas llevan el mismo marco, ninguna es dorada antes de que él elija, y
   con el estado «reñido» o «no alcanza» ninguna se rotula «te propongo»:
   son la vía A y la vía B, y el botón dorado deja de ser el de aceptar.

   Pura: todo llega por props (la tarjeta ya elegida —la del servidor o la
   local—, la vía en pantalla y las acciones). La lógica vive en
   tarjetaDelPrincipal.ts y se prueba sin Next en
   comprobaciones/problema_principal.mjs. */

const TITULO_VIA = {
    propuesta: 'Te propongo',
    opuesta: '¿O resolverías en sentido opuesto?',
    a: 'Vía A',
    b: 'Vía B',
};

function Rotulito({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45', className)}>
            {children}
        </p>
    );
}

/* UN CRITERIO, CON SU FUERZA Y SU VIGENCIA. El clic abre la tesis aquí mismo
   (VentanaTesis), como en «Posible marco de resolución». Un precepto sin
   registro no se abre: se lee. */
function ChipApoyo({ a, tesis, onAbrirTesis }: {
    a: ApoyoDeLaVia; tesis?: TesisDelAcervo[]; onAbrirTesis?: (t: TesisDelAcervo) => void;
}) {
    if (a.norma && !a.registro) {
        return (
            <li className="border-l border-white/10 py-0.5 pl-2.5 text-[13px] leading-snug text-white/75">
                {a.norma}
            </li>
        );
    }
    const fuerza = textoDeFuerza(a);
    const abrir = () => {
        const t = tesis?.find((x) => x.registro === a.registro)
            ?? { registro: a.registro, rubro: a.rubro, instancia: a.instancia,
                 obligatoria: a.fuerza === 'obliga', localizacion: '', texto: '' };
        onAbrirTesis?.(t);
    };
    const cuerpo = (
        <>
            <span className="mb-1 flex flex-wrap items-center gap-1.5">
                {fuerza && (
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                        a.fuerza === 'obliga' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                              : 'border-white/10 bg-white/[0.05] text-white/60')}>
                        {fuerza}
                    </span>
                )}
                {a.vigencia && (
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                        vigenciaDudosa(a.vigencia) ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                                                   : 'border-white/10 text-white/60')}>
                        {a.vigencia}
                    </span>
                )}
                {a.de_internet && (
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                        línea de la Corte · internet
                    </span>
                )}
                <span className="text-[12px] text-accent-gold/80">
                    Reg. {a.registro}{a.instancia ? ` · ${a.instancia}` : ''}
                </span>
            </span>
            {a.rubro && <span className="line-clamp-2 text-[13px] leading-snug text-white/75">{a.rubro}</span>}
        </>
    );
    return (
        <li>
            {onAbrirTesis ? (
                <button type="button" onClick={abrir} title="Abrir la tesis"
                        className="w-full rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-left
                                   transition hover:border-accent-gold/30">
                    {cuerpo}
                </button>
            ) : (
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">{cuerpo}</div>
            )}
        </li>
    );
}

/* LAS SENTENCIAS DEL PROPIO TRIBUNAL, con la MISMA fila que «Su propio
   tribunal» (FilaDelEspejo, 29-sep-2026): tipo y número, fecha, la
   probabilidad calibrada con su nivel («94% · mismo problema», «66% o más ·
   posible»), la pregunta del precedente, su calificación y razón, y el NEUN
   para copiarlo con el Buscador de la OAJ —la única forma de abrirla—. Antes
   aquí salían recortadas y no había cómo abrir ninguna. Tres a la vista; las
   demás se cuentan, no se esconden en silencio. */
function FilasTribunal({ filas, tope = 3 }: { filas: FilaDeTuTribunal[]; tope?: number }) {
    const [todas, setTodas] = React.useState(false);
    const vistas = todas ? filas : filas.slice(0, tope);
    return (
        <>
            <ul className="mt-1 space-y-1.5">
                {vistas.map((f, k) => (
                    <FilaDelEspejo key={`${f.neun || f.expediente}|${f.fecha}|${k}`} f={comoFilaDelEspejo(f)} />
                ))}
            </ul>
            {filas.length > tope && (
                <button type="button" onClick={() => setTodas(!todas)}
                        className="mt-1 text-[11px] text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/70">
                    {todas ? 'ver menos' : `y ${filas.length - tope} más`}
                </button>
            )}
        </>
    );
}

/** UNA COLUMNA: una vía entera. Las dos llevan el mismo marco; sólo la que él
 *  eligió se enmarca en oro, y sólo después de elegirla. */
function ColumnaVia({
    rotulo, lado, via, apagada, activa, esRecurso, tarjeta, tribunal, revoca,
    tesis, onAbrirTesis, extra,
}: {
    rotulo: string;
    lado: LadoDeLaTarjeta;
    via: ViaDeLaTarjeta | null;
    /** La leyenda de la columna sin vía real: eso también informa. */
    apagada?: string;
    activa: boolean;
    esRecurso: boolean;
    tarjeta: TarjetaDecision;
    tribunal: FilaDeTuTribunal[];
    revoca: boolean;
    tesis?: TesisDelAcervo[];
    onAbrirTesis?: (t: TesisDelAcervo) => void;
    /** Lo que va al pie de la razón (redactar el criterio de esta vía). */
    extra?: React.ReactNode;
}) {
    if (!via || apagada) {
        return (
            <div data-via={lado} className="rounded-xl border border-dashed border-white/10 p-3.5 opacity-60">
                <Rotulito>{rotulo}</Rotulito>
                <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                    {apagada || 'El motor no escribió esta vía.'}
                </p>
            </div>
        );
    }
    const { citables, fuera } = apoyosParaCitar(via);
    const con = contrasteParaVia(tarjeta.principal?.contraste, prosperaDeLaVia(via), esRecurso);
    const qc = tarjeta.que_la_cambiaria;
    /* POR DÓNDE SE CAE: la mejor objeción de la otra vía, con su respuesta si
       la hay (deliberación); para la propuesta, a falta de ella, lo que el
       motor dijo que se diría en contra. */
    const cae = via.objecion?.de_la_otra_via || (lado === 'propuesta' ? qc?.en_contra || '' : '');
    const co = tarjeta.conceptos_omitidos;
    const vp = via.via_protectora;
    return (
        <div data-via={lado}
             className={cn('rounded-xl border bg-white/[0.02] p-3.5 transition-colors',
                 activa ? 'border-accent-gold/45' : 'border-white/10')}>
            <Rotulito className={activa ? 'text-accent-gold/90' : undefined}>
                {rotulo}{activa && ' · elegida'}
            </Rotulito>
            <h3 className="mt-2 font-serif text-[16px] font-medium leading-snug text-white">
                {fraseDe(via.sentido, esRecurso)}
            </h3>
            {via.desenlace.length > 0 && (
                <ol className="mt-2 space-y-0.5 text-[13px] leading-snug text-white/75">
                    {via.desenlace.map((d, k) => <li key={k}>{d}</li>)}
                </ol>
            )}
            {via.desenlace_nota && <p className="mt-1 text-[12px] leading-relaxed text-white/45">{via.desenlace_nota}</p>}
            {via.efecto && <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">{via.efecto}</p>}

            {co?.hacen_falta && revoca && (
                <p className="mt-2 flex gap-1.5 border-l-2 border-amber-400/40 py-1 pl-2 text-[12px] leading-relaxed text-amber-200/90">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" />
                    <span>
                        Por esta vía hay que estudiar los conceptos de violación que el juez no estudió
                        {co.por_que ? ` (${co.por_que})` : ''}.{' '}
                        {co.tenemos ? 'Constan en el expediente: el estudio los contesta.' : (
                            /* Y AHORA HAY DÓNDE (revisión del 28-sep-2026): el
                               aviso pedía aportarlos y la pantalla no daba el
                               cuadro ni bloqueaba «Generar» por esta vía. */
                            <>No constan en lo que se subió: <a href="#conceptos-violacion" className="underline underline-offset-2">pégalos</a> antes
                            de generar por esta vía.</>
                        )}
                    </span>
                </p>
            )}

            <Rotulito className="mt-3">La razón</Rotulito>
            {via.razon
                ? <p className="mt-1 text-[13px] leading-relaxed text-white/75">{via.razon}</p>
                : <p className="mt-1 text-[13px] leading-relaxed text-white/45">El motor no escribió la razón de esta vía.</p>}
            {extra}
            {via.interpretacion && (
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                    <span className="text-white/45">La interpretación: </span>{via.interpretacion}
                </p>
            )}
            {via.cadena && (
                <details className="group mt-2">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-accent-gold/80 hover:text-accent-gold">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        El razonamiento, paso a paso
                    </summary>
                    <div className="mt-1.5 space-y-1.5 text-[12px] leading-relaxed text-white/60">
                        {via.cadena.regla && <p><span className="text-white/45">Regla: </span>{via.cadena.regla}</p>}
                        {via.cadena.hechos.map((h, k) => (
                            <p key={k}>
                                <span className="text-white/45">Hecho: </span>{h.afirma}
                                {h.cita && <span className="text-white/45"> — «{h.cita}»{h.fuente ? ` (${h.fuente})` : ''}</span>}
                            </p>
                        ))}
                        {via.cadena.subsuncion && <p><span className="text-white/45">Subsunción: </span>{via.cadena.subsuncion}</p>}
                        {via.cadena.conclusion && <p><span className="text-white/45">Conclusión: </span>{via.cadena.conclusion}</p>}
                    </div>
                </details>
            )}

            <Rotulito className="mt-3">Lo aplicaría con</Rotulito>
            {citables.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                    {citables.map((a) => (
                        <ChipApoyo key={a.registro || a.norma || ''} a={a} tesis={tesis} onAbrirTesis={onAbrirTesis} />
                    ))}
                </ul>
            ) : (
                <p className="mt-1 text-[12px] text-white/45">Sin criterio con registro verificado para esta vía.</p>
            )}
            {fuera > 0 && (
                <p className="mt-1 text-[12px] text-white/45">
                    {fuera === 1 ? 'Un criterio más se quedó fuera' : `${fuera} criterios más se quedaron fuera`}:
                    {' '}no están verificados en el acervo o ya no están vigentes.
                </p>
            )}
            {vp?.posible && (
                <p className="mt-2 text-[12px] leading-relaxed text-accent-gold/85">
                    Cabe interpretación conforme o pro persona: {vp.norma}{vp.lectura ? ` — ${vp.lectura}` : ''}
                    {vp.limite && <span className="block text-white/45">Límite: {vp.limite}</span>}
                </p>
            )}

            {tribunal.length > 0 && (
                <>
                    <Rotulito className="mt-3">Tu tribunal</Rotulito>
                    <FilasTribunal filas={tribunal} />
                </>
            )}
            {con && (
                <p className={cn('mt-3 text-[12px] leading-relaxed',
                    con.tono === 'a_favor' ? 'text-white/75' : con.tono === 'en_contra' ? 'text-amber-200/80' : 'text-white/60')}>
                    {con.texto}
                </p>
            )}
            {cae && (
                <>
                    <Rotulito className="mt-3">Por dónde se cae</Rotulito>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/60">{cae}</p>
                    {via.objecion?.respuesta && (
                        <p className="mt-1 text-[12px] leading-relaxed text-white/45">Respuesta: {via.objecion.respuesta}</p>
                    )}
                </>
            )}
        </div>
    );
}

export interface MarcaDeSecundario {
    /** La calificación que tiene en pantalla. */
    sentido: string;
    /** Quién la puso, en dos o tres palabras. */
    quien: string;
}

export default function ProblemaPrincipal({
    tarjeta, esRecurso, hayGlobal, hayPropuestas,
    viaActiva, viaElegida, ladoSecundarios, marcados = {}, razonActiva = '',
    tesis, onAbrirTesis,
    onResolverAsi, onResolverOpuesta, onMiCriterio, onResolverSolucion,
    onRedactarOpuesta, redactando = false,
    onProponer, puedeVerComoSale = false,
}: {
    tarjeta: TarjetaDecision;
    esRecurso: boolean;
    /** El motor propuso un sentido para todo el asunto. Sin él, la tarjeta
     *  enseña el principal con su propuesta por problema, sin columna
     *  contraria, y la ventana manual se abre sola (como antes). */
    hayGlobal: boolean;
    /** El motor propuso algo, aunque sea problema por problema. */
    hayPropuestas: boolean;
    /** Qué vía está en pantalla (se deduce del estado: `viaActivaDe`). */
    viaActiva: ViaActiva;
    /** Si él ya eligió con uno de los tres botones (o abrió su ventana). */
    viaElegida: boolean;
    /** De qué vía es la suerte que se pinta en los secundarios. */
    ladoSecundarios: LadoDeLaTarjeta | null;
    /** Los secundarios cuya calificación en pantalla NO es la de la vía
     *  —la marcó él, o problema por problema la puso el reparto—: número →
     *  lo que tienen. */
    marcados?: Record<number, MarcaDeSecundario>;
    /** La razón que viajaría ahora en «todo el asunto»: se enseña en la
     *  contraria cuando ésta no traía la suya y se redactó a su pedido. */
    razonActiva?: string;
    tesis?: TesisDelAcervo[];
    onAbrirTesis?: (t: TesisDelAcervo) => void;
    onResolverAsi?: () => void;
    onResolverOpuesta?: () => void;
    /** Rediseño, etapa 3: resolver con una solución de la lista que no es
     *  ninguna de las dos columnas (su sentido y su razón). */
    onResolverSolucion?: (sentido: string, razon: string) => void;
    onMiCriterio: () => void;
    /** «Redactar el criterio de esta vía»: una llamada al motor, sólo con clic. */
    onRedactarOpuesta?: () => void;
    redactando?: boolean;
    onProponer?: () => void;
    puedeVerComoSale?: boolean;
}) {
    const t = tarjeta;
    const p = t.principal;
    const vp = t.vias.propuesta;
    const vo = t.vias.opuesta;
    const alt = hayGlobal && hayAlternativaReal(t);
    const neutras = sinRecomendar(t);
    const noAlcanza = t.estado === 'no_alcanza';
    const revoca = ladoQueRevoca(t, esRecurso);
    const trib = tribunalPorLado(t);
    const prosperaLado = ladoSecundarios === 'opuesta' ? prosperaDeLaVia(vo)
        : ladoSecundarios === 'propuesta' ? prosperaDeLaVia(vp) : null;
    const opuestaSinRazon = alt && !!vo && !vo.razon.trim();
    const qc = t.que_la_cambiaria;
    // SPEC E2/E3 (AR 631/2025): quién es quién, y la pregunta del a quo aparte.
    const ficha = lineaDeLaFicha(t.ficha);
    const recurrida = preguntaRecurridaAparte(p);
    const decisivaRepetida = decisivaYaEsElPrincipal(p, t.deliberacion?.pregunta_decisiva);
    const hayQueCambia = !!qc && (!!qc.crux || qc.constancias_indispensables.length > 0 || !!qc.limite_protector);

    /* LOS TRES BOTONES. Con «no alcanza», el de su criterio va primero y es el
       dorado; con «reñido», ninguno es dorado: dorar «resolver así» sería
       recomendar lo que el estado dice que no se puede recomendar. */
    const doradoAsi = hayGlobal && !neutras;
    const botonAsi = hayGlobal && vp ? (
        <button key="asi" type="button" onClick={onResolverAsi}
                aria-pressed={viaElegida && viaActiva === 'propuesta'}
                className={cn('inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[14px] transition',
                    doradoAsi ? 'border-accent-gold/45 bg-accent-gold/[0.08] font-semibold text-accent-gold hover:bg-accent-gold/[0.14]'
                              : 'border-white/15 bg-white/[0.05] font-medium text-white/90 hover:bg-white/[0.08]')}>
            {viaElegida && viaActiva === 'propuesta' && <Check className="h-4 w-4" />}
            {neutras ? 'Resolver por la vía A' : 'Resolver así'}
        </button>
    ) : null;
    const botonOpuesta = hayGlobal ? (
        <button key="opuesta" type="button" onClick={onResolverOpuesta} disabled={!alt}
                aria-pressed={viaElegida && viaActiva === 'contraria'}
                title={alt ? undefined : 'El motor no encontró cómo sostener la vía contraria con el acervo'}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4
                           text-[14px] font-medium text-white/90 transition hover:bg-white/[0.08]">
            {viaElegida && viaActiva === 'contraria' && <Check className="h-4 w-4" />}
            {neutras ? 'Resolver por la vía B' : 'Resolver en sentido opuesto'}
        </button>
    ) : null;
    const botonCriterio = (
        <button key="criterio" type="button" onClick={onMiCriterio}
                aria-pressed={viaElegida && viaActiva === 'criterio'}
                className={cn('inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[14px] transition',
                    noAlcanza ? 'border-accent-gold/45 bg-accent-gold/[0.08] font-semibold text-accent-gold hover:bg-accent-gold/[0.14]'
                              : 'border-white/15 bg-white/[0.05] font-medium text-white/90 hover:bg-white/[0.08]')}>
            <PenLine className="h-4 w-4" />
            Resolver con mi criterio
        </button>
    );
    const botones = noAlcanza ? [botonCriterio, botonAsi, botonOpuesta] : [botonAsi, botonOpuesta, botonCriterio];

    const rotuloVia = viaActiva === 'propuesta' ? 'la propuesta' : viaActiva === 'contraria' ? 'la contraria' : 'tu criterio';

    return (
        <section id="problema-principal" data-estado={t.estado || 'sin_estado'} data-origen={t.origen}
                 className="tarjeta-clave rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="rotulo-clave text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    El problema principal · decide el asunto
                </p>
                {hayGlobal && (
                    <span data-chip-via={viaActiva}
                          className={cn('rounded-full border px-2 py-0.5 text-[12px]',
                              viaElegida ? 'border-accent-gold/45 text-accent-gold' : 'border-white/15 text-white/60')}>
                        vía: {rotuloVia}{!viaElegida && ' · sin confirmar'}
                    </span>
                )}
            </div>

            {/* LA FICHA PROCESAL, en una línea (SPEC E2). En el 631 nadie decía
                en pantalla que recurría la tercera interesada contra una
                concesión y que el sobreseimiento del otro acto estaba firme. */}
            {ficha.length > 0 && (
                <p data-ficha className="mt-2 text-[12px] leading-relaxed text-white/60"
                   title={t.ficha?.avisos.length ? t.ficha.avisos.join(' · ') : undefined}>
                    {ficha.map((s, i) => (
                        <React.Fragment key={s.rotulo}>
                            {i > 0 && <span className="text-white/25"> · </span>}
                            <span className="text-white/40">{s.rotulo}: </span>{s.texto}
                        </React.Fragment>
                    ))}
                    {!!t.ficha?.avisos.length && (
                        <span className="text-amber-200/80"> · {t.ficha.avisos.length === 1 ? '1 aviso'
                            : `${t.ficha.avisos.length} avisos`}</span>
                    )}
                </p>
            )}

            {/* ── 1 · EL PRINCIPAL ── */}
            {p ? (
                <>
                    <h2 className="mt-3 font-serif text-[16px] font-medium leading-snug text-white">
                        <span className="mr-2 font-sans text-[12px] font-semibold text-accent-gold">
                            {String(p.numero || 1).padStart(2, '0')}
                        </span>
                        {p.pregunta}
                    </h2>
                    {/* La pregunta que decide va arriba; la del a quo, debajo y
                        como dato (SPEC E3): en el 631 el motor razonó con la de
                        la recurrida («¿alteró la cosa juzgada?») en lugar de la
                        figura que decide. */}
                    {recurrida && (
                        <p data-pregunta-recurrida className="mt-1 text-[13px] leading-relaxed text-white/60">
                            <span className="text-white/40">Así lo planteó la recurrida: </span>{recurrida}
                        </p>
                    )}
                    {/* LA FIGURA QUE DECIDE (revisión adversarial de la fase E):
                        el servidor ya la manda en `principal.figura`; si la
                        deliberación la enseña más abajo, no se repite. */}
                    {p.figura && !(t.deliberacion?.figura && t.deliberacion.figura.trim() === p.figura.trim()) && (
                        <p data-figura className="mt-1 text-[13px] leading-relaxed text-white/60">
                            <span className="text-white/40">La figura: </span>{p.figura}
                        </p>
                    )}
                    <p className="mt-1 text-[12px] text-white/45">
                        {p.jerarquia_de === 'secretario' ? 'Lo marcaste tú como principal'
                            : p.jerarquia_de === 'por_omision' ? 'Principal por ser el primero: ningún paso lo marcó'
                            : 'Principal según la lectura del expediente'}
                        {p.prediccion?.frase && <> · <span className="text-white/60">El acervo: {p.prediccion.frase}</span></>}
                    </p>
                    {p.discrepa_motor && (
                        <p className="mt-2 flex gap-1.5 border-l-2 border-amber-400/40 py-1 pl-2 text-[12px] leading-relaxed text-amber-200/90">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" />
                            <span>
                                El motor tomó como decisivo {p.discrepa_motor.numero_motor
                                    ? `el problema ${p.discrepa_motor.numero_motor}` : 'otro problema'}
                                {p.discrepa_motor.nota ? `: ${p.discrepa_motor.nota}` : '.'}
                            </span>
                        </p>
                    )}
                    {t.deliberacion && (t.deliberacion.pregunta_decisiva || t.deliberacion.figura) && (
                        <div className="mt-2 space-y-1 text-[13px] leading-relaxed text-white/75">
                            {t.deliberacion.pregunta_decisiva && !decisivaRepetida && (
                                <p><span className="text-white/45">Lo que decide: </span>{t.deliberacion.pregunta_decisiva}</p>
                            )}
                            {t.deliberacion.figura && <p><span className="text-white/45">La figura: </span>{t.deliberacion.figura}</p>}
                            {t.deliberacion.proposicion_toral && (
                                <p>
                                    <span className="text-white/45">La proposición toral: </span>{t.deliberacion.proposicion_toral.dice}
                                    {t.deliberacion.proposicion_toral.cita && (
                                        <span className="text-white/45"> — «{t.deliberacion.proposicion_toral.cita}»</span>
                                    )}
                                </p>
                            )}
                        </div>
                    )}
                    <SolucionesPosibles soluciones={t.deliberacion?.soluciones}
                        onResolver={onResolverSolucion ? (s) => onResolverSolucion(s.sentido, s.razon) : undefined} />
                    {p.por_que_principal && (
                        <details className="group mt-2">
                            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-accent-gold/80 hover:text-accent-gold">
                                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                                Por qué es el principal
                            </summary>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">{p.por_que_principal}</p>
                        </details>
                    )}
                    {p.contraste?.razon_toral && (
                        <p className="mt-2 text-[12px] leading-relaxed text-white/60">
                            <span className="text-white/45">La razón toral de la sentencia: </span>{p.contraste.razon_toral}
                            <span className="text-white/45">
                                {' '}· ¿{esRecurso ? 'el agravio' : 'el concepto'} la combate? {p.contraste.la_combate ? 'sí' : 'no'}
                                {' '}· ¿el fallo se sostiene por otra? {p.contraste.sobrevive ? 'sí' : 'no'}
                            </span>
                        </p>
                    )}
                </>
            ) : (
                <p className="mt-3 text-[13px] text-white/60">Sin problema principal todavía.</p>
            )}

            {/* ── 2 · LO QUE SE RESUELVE POR CONSECUENCIA ── */}
            {t.secundarios.length > 0 && (
                <div className="mt-4 border-t border-white/[0.07] pt-3">
                    <Rotulito>Lo que se resuelve por consecuencia</Rotulito>
                    <ul className="mt-1.5 divide-y divide-white/[0.05]">
                        {t.secundarios.map((s) => {
                            const m = marcados[s.numero];
                            const suerte = ladoSecundarios === 'opuesta' ? s.en_opuesta
                                : ladoSecundarios === 'propuesta' ? s.en_propuesta : null;
                            const r = rotuloDeSuerte(suerte, prosperaLado);
                            return (
                                <li key={s.numero || s.pregunta} data-secundario={s.numero}
                                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5">
                                    <span className="shrink-0 text-[12px] tabular-nums text-white/45">
                                        {String(s.numero).padStart(2, '0')}
                                    </span>
                                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug text-white/75" title={s.pregunta}>
                                        {s.pregunta}
                                    </span>
                                    {m ? (
                                        <span className="shrink-0 rounded-full border border-accent-gold/45 px-2 py-0.5 text-[12px] text-accent-gold">
                                            {m.quien}{m.sentido ? ` · ${legible(m.sentido).toLowerCase()}` : ''}
                                        </span>
                                    ) : ladoSecundarios ? (
                                        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[12px]',
                                            r.tono === 'ambar' ? 'border-amber-400/30 text-amber-300'
                                                : r.tono === 'oro' ? 'border-accent-gold/30 text-accent-gold/90'
                                                : 'border-white/15 text-white/75')}>
                                            {r.texto}
                                            {suerte?.previsto && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-white/45">previsto</span>}
                                        </span>
                                    ) : (
                                        <span className="shrink-0 text-[12px] text-white/45">según califiques el principal</span>
                                    )}
                                    {!m && suerte?.por_que && (
                                        <span className="basis-full truncate pl-7 text-[12px] text-white/45" title={suerte.por_que}>
                                            {suerte.por_que}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                        {hayGlobal
                            ? <>Se resuelven solos con el principal. Si alguno no te convence, «Resolver con mi criterio».</>
                            : <>Cada uno lleva la calificación que le propuso el motor; corrígela abajo si no la compartes.</>}
                        {t.origen === 'local' && t.secundarios.some((s) => s.en_propuesta?.previsto || s.en_opuesta?.previsto)
                            && ' «Previsto» es lo que escribió el motor para esa vía; el árbol de decisión lo confirma al generar.'}
                    </p>
                </div>
            )}
            {t.independientes.length > 0 && (
                <div className="mt-3">
                    <Rotulito>Se estudian aparte: no dependen del principal</Rotulito>
                    <ul className="mt-1.5 space-y-1">
                        {t.independientes.map((x) => (
                            <li key={x.numero || x.pregunta} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                                <span className="shrink-0 text-[12px] tabular-nums text-white/45">{String(x.numero).padStart(2, '0')}</span>
                                <span className="line-clamp-2 min-w-0 flex-1 leading-snug text-white/75" title={x.pregunta}>{x.pregunta}</span>
                                {x.propuesta?.sentido && (
                                    <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[12px] text-white/75">
                                        propuesta propia · {legible(x.propuesta.sentido).toLowerCase()}
                                    </span>
                                )}
                                {x.propuesta?.razon && (
                                    <span className="basis-full truncate pl-7 text-[12px] text-white/45" title={x.propuesta.razon}>
                                        {x.propuesta.razon}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── EL ESTADO: nunca un porcentaje ── */}
            {t.estado && (
                <div data-estado-banda={t.estado}
                     className={cn('mt-4 border-l-2 py-2 pl-2.5 pr-3',
                         t.estado === 'claro' ? 'border-white/15 bg-white/[0.02]' : 'border-amber-400/40 bg-amber-400/[0.04]')}>
                    <p className={cn('text-[13px] font-medium', t.estado === 'claro' ? 'text-white/75' : 'text-amber-200/90')}>
                        {t.estado === 'claro' ? 'Claro: el material sostiene la propuesta'
                            : t.estado === 'reñido' ? 'Reñido: las dos vías se sostienen. Ninguna se rotula como recomendada; decides tú.'
                            : 'No alcanza para recomendar una vía. Resuelve con tu criterio, o aporta lo que falta.'}
                    </p>
                    {t.estado_por_que.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-[12px] leading-relaxed text-white/60">
                            {t.estado_por_que.map((x, k) => <li key={k}>· {x}</li>)}
                        </ul>
                    )}
                </div>
            )}

            {/* ── 3 · LAS DOS VÍAS, DEL MISMO PESO ── */}
            {hayGlobal ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <ColumnaVia rotulo={neutras ? TITULO_VIA.a : TITULO_VIA.propuesta} lado="propuesta" via={vp}
                                activa={viaElegida && viaActiva === 'propuesta'} esRecurso={esRecurso} tarjeta={t}
                                tribunal={trib.propuesta} revoca={revoca === 'propuesta'}
                                tesis={tesis} onAbrirTesis={onAbrirTesis} />
                    <ColumnaVia rotulo={neutras ? TITULO_VIA.b : TITULO_VIA.opuesta} lado="opuesta" via={vo}
                                apagada={alt ? undefined : 'El motor no encontró cómo sostener la vía contraria con el acervo. Eso también cuenta al decidir.'}
                                activa={viaElegida && viaActiva === 'contraria'} esRecurso={esRecurso} tarjeta={t}
                                tribunal={trib.opuesta} revoca={revoca === 'opuesta'}
                                tesis={tesis} onAbrirTesis={onAbrirTesis}
                                extra={opuestaSinRazon ? (
                                    viaActiva === 'contraria' && razonActiva.trim() ? (
                                        <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                                            <span className="text-[10px] uppercase tracking-wide text-accent-gold/80">redactada a tu pedido · </span>
                                            {razonActiva}
                                        </p>
                                    ) : viaActiva === 'contraria' && onRedactarOpuesta ? (
                                        <button type="button" onClick={onRedactarOpuesta} disabled={redactando}
                                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent-gold/40 px-3 py-1.5
                                                           text-[12px] font-semibold text-accent-gold transition-colors hover:bg-accent-gold/10">
                                            {redactando && <Loader2 className="h-3 w-3 animate-spin" />}
                                            {redactando ? 'Redactando el criterio…' : 'Redactar el criterio de esta vía'}
                                        </button>
                                    ) : (
                                        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                                            Si eliges esta vía podrás pedir que se redacte (una llamada al motor, sólo con tu clic).
                                        </p>
                                    )
                                ) : undefined} />
                </div>
            ) : (
                <div className="mt-4">
                    {vp ? (
                        <ColumnaVia rotulo="El motor propone para este problema" lado="propuesta" via={vp}
                                    activa={false} esRecurso={esRecurso} tarjeta={t}
                                    tribunal={[...trib.propuesta, ...trib.opuesta]} revoca={false}
                                    tesis={tesis} onAbrirTesis={onAbrirTesis} />
                    ) : null}
                    <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                        {hayPropuestas
                            ? 'El motor no se atrevió con un sentido para todo el asunto: propuso problema por problema. Abajo, en tu ventana, corrige lo que no compartas y genera.'
                            : 'Con el material de este asunto el motor no propuso ningún sentido. Decide tú, problema por problema.'}
                    </p>
                </div>
            )}

            {/* LO QUE NO VA BAJO NINGUNA VÍA, en dos bloques. Arriba, las del
                nivel «mismo problema» cuya calificación no casa con una vía (o
                que coincidieron por el tema del asunto); debajo, los POSIBLES
                (50-84%), que no son el mismo problema y se revisan a mano. Con
                o sin propuesta global: antes, sin ella, no salían. */}
            {trib.sin_lado.some((f) => f.nivel !== 'posible') && (
                <div className="mt-3">
                    <Rotulito>Tu tribunal en este punto · para leer, no para contar</Rotulito>
                    <FilasTribunal filas={trib.sin_lado.filter((f) => f.nivel !== 'posible')} />
                </div>
            )}
            {trib.sin_lado.some((f) => f.nivel === 'posible') && (
                <div className="mt-3">
                    <Rotulito>Posibles precedentes · no son el mismo problema: revísalos tú</Rotulito>
                    <FilasTribunal filas={trib.sin_lado.filter((f) => f.nivel === 'posible')} />
                </div>
            )}
            {hayQueCambia && (
                <div className="mt-3 text-[12px] leading-relaxed text-white/60">
                    <Rotulito>Qué cambiaría la decisión</Rotulito>
                    {qc!.crux && (
                        <p className="mt-1">
                            {qc!.crux.que}{qc!.crux.si_cambia ? ` — ${qc!.crux.si_cambia}` : ''}
                            {qc!.crux.constancia && <span className="text-white/45"> ({qc!.crux.constancia})</span>}
                        </p>
                    )}
                    {qc!.constancias_indispensables.length > 0 && (
                        <p className="mt-1">
                            <span className="text-white/45">Constancias indispensables: </span>
                            {qc!.constancias_indispensables.join(' · ')}
                        </p>
                    )}
                    {qc!.limite_protector && (
                        <p className="mt-1"><span className="text-white/45">Límite de la vía protectora: </span>{qc!.limite_protector}</p>
                    )}
                </div>
            )}

            {/* ── 4 · LOS TRES BOTONES ── */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5" data-botones={noAlcanza ? 'criterio-primero' : 'normal'}>
                {hayGlobal ? botones : botonCriterio}
                {puedeVerComoSale && (
                    <a href="#asi-sale" className="inline-flex h-10 items-center px-1 text-[13px] font-medium text-accent-gold/85 transition hover:text-accent-gold">
                        Ver cómo va a salir ↓
                    </a>
                )}
                {onProponer && !hayGlobal && !hayPropuestas && (
                    <button type="button" onClick={onProponer}
                            className="inline-flex h-10 items-center rounded-xl border border-white/10 px-3.5 text-[13px] font-medium text-white/60 transition hover:text-white">
                        Volver a pedir la propuesta
                    </button>
                )}
            </div>
            {hayGlobal && !viaElegida && (
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                    {/* Con la deliberación, la primera columna es la vía del juez y
                        lo que viaja sin elegir es el eco del motor: decirlo, no
                        dejar que parezca la misma cosa. */}
                    {viaActiva !== 'propuesta' && propuestaDelJuez(t)
                        ? 'Mientras no elijas, viaja la propuesta del motor, que no es la de la primera columna: si generas así, sale con la del motor.'
                        : 'Mientras no elijas, en pantalla está la propuesta del motor: si generas así, sale con ella.'}
                </p>
            )}
            <div className="mt-3 flex gap-2 border-l-2 border-amber-400/40 bg-amber-400/[0.04] py-2 pl-2.5 pr-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
                <p className="text-[12px] leading-relaxed text-white/60">
                    El motor propone; <span className="text-white/90">el criterio es tuyo</span>. El proyecto
                    sale con tu nombre: lee las dos vías antes de generar.
                </p>
            </div>

            {(t.linea_corte.confirmadas.length > 0 || t.linea_corte.pistas.length > 0) && (
                <details className="group mt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-white/60 hover:text-white">
                        <ChevronRight className="h-3 w-3 text-accent-gold/70 transition-transform group-open:rotate-90" />
                        La línea de la Corte en internet
                        {t.linea_corte.confirmadas.length > 0 && ` · ${t.linea_corte.confirmadas.length} confirmada${t.linea_corte.confirmadas.length === 1 ? '' : 's'} en el acervo`}
                    </summary>
                    {t.linea_corte.confirmadas.length > 0 && (
                        <ul className="mt-1.5 space-y-1.5">
                            {t.linea_corte.confirmadas.map((a) => (
                                <ChipApoyo key={a.registro || a.norma || ''} a={a} tesis={tesis} onAbrirTesis={onAbrirTesis} />
                            ))}
                        </ul>
                    )}
                    {t.linea_corte.pistas.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[12px] text-white/45">Pistas sin confirmar en el acervo: no se citan.</p>
                            <ul className="mt-1 space-y-0.5 text-[12px] leading-relaxed text-white/45">
                                {t.linea_corte.pistas.map((x, k) => <li key={k}>· {x}</li>)}
                            </ul>
                        </div>
                    )}
                </details>
            )}
            {t.avisos.length > 0 && (
                <ul className="mt-3 space-y-1 text-[12px] leading-relaxed text-white/55">
                    {t.avisos.map((a, k) => (
                        <li key={k} className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold/70" /><span>{a}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
