'use client';

/**
 * La ventana de criterio — el único punto donde entra el humano.
 *
 * Aquí está la idea entera del redactor: la máquina lee, contrasta y busca; el
 * secretario decide. Por eso esta pantalla no pide un botón, pide un texto.
 *
 * Y pide el PORQUÉ, no sólo el qué. David lo dijo con precisión: «si el
 * secretario pone en dos líneas sólo que se declaren infundados los conceptos
 * por x razón, tendrá menor posibilidad de éxito de que se alinee la sentencia
 * a lo que él quiere». El medidor de abajo existe para que eso se vea ANTES de
 * mandar, no después de leer un proyecto que no se parece a lo que pensaba.
 *
 * El medidor no puntúa la calidad jurídica —eso no lo puede juzgar una
 * interfaz—: mide cobertura. Cuántos problemas tienen sentido elegido y cuántos
 * tienen razón escrita. Es una lista de comprobación, no una nota.
 */

import React, { useMemo, useState } from 'react';
import { PenLine, Lightbulb, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { Tarjeta, Pastilla, cn } from './primitivas';
import SolucionDelAsunto from './SolucionDelAsunto';
import type { ProblemaJuridico } from './tipos';
import type { SolucionGlobal } from './api';

/* ═══ LAS DIEZ CALIFICATIVAS, POR LO QUE HACEN ═══
   Estaban en una fila corrida de diez pastillas idénticas. Es la decisión más
   consecuente de toda la herramienta —de aquí sale el resolutivo— y se leía
   como una lista de palabras: «Fundado» y «Fundado pero insuficiente» a un
   centímetro una de otra, con el mismo borde y el mismo peso, llevando a
   resolutivos opuestos.

   El grupo no es adorno: es el dato. Lo único que el secretario necesita ver
   antes de leer la etiqueta es de qué lado cae. Y la línea depende del efecto,
   no de la palabra: «fundado pero insuficiente» le da la razón al quejoso y
   aun así NO prospera, que es justo la que se presta a confusión. */
const SENTIDOS: {
    id: NonNullable<ProblemaJuridico['sentido']>; etiqueta: string;
    grupo: 'prospera' | 'no_prospera';
}[] = [
    { id: 'fundado', etiqueta: 'Fundado', grupo: 'prospera' },
    { id: 'esencialmente_fundado', etiqueta: 'Esencialmente fundado', grupo: 'prospera' },
    { id: 'sustancialmente_fundado', etiqueta: 'Sustancialmente fundado', grupo: 'prospera' },
    { id: 'parcialmente_fundado', etiqueta: 'Parcialmente fundado', grupo: 'prospera' },
    /* TIENE RAZÓN Y NO ALCANZA. Medido: aparece en asuntos favorables el 12%
       de las veces, igual que el infundado. NO prospera, aunque lo parezca. */
    { id: 'fundado_insuficiente', etiqueta: 'Fundado pero insuficiente', grupo: 'no_prospera' },
    { id: 'infundado', etiqueta: 'Infundado', grupo: 'no_prospera' },
    { id: 'inoperante', etiqueta: 'Inoperante', grupo: 'no_prospera' },
    { id: 'inatendible', etiqueta: 'Inatendible', grupo: 'no_prospera' },
    { id: 'ineficaz', etiqueta: 'Ineficaz', grupo: 'no_prospera' },
    /* El recurso perdió su objeto por un hecho posterior. No prospera ni se
       desestima: no hay nada que estudiar. */
    { id: 'sin_materia', etiqueta: 'Sin materia', grupo: 'no_prospera' },
];

/** Las diez calificativas, partidas en los dos montones que importan.
 *  `nota` explica el caso tramposo, y se enseña UNA vez: repetida debajo de
 *  cada uno de diecisiete planteamientos deja de leerse. */
function Calificativas({ elegido, onElegir, nota }: {
    elegido?: string | null;
    onElegir: (id: NonNullable<ProblemaJuridico['sentido']>) => void;
    nota?: boolean;
}) {
    const grupos = [
        { id: 'prospera' as const, titulo: 'Prospera' },
        { id: 'no_prospera' as const, titulo: 'No prospera' },
    ];
    return (
        <div>
            <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                {grupos.map((g) => (
                    <div key={g.id} className="min-w-0">
                        <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/30">
                            {g.titulo}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {SENTIDOS.filter((s) => s.grupo === g.id).map((s) => (
                                <Pastilla key={s.id} activa={elegido === s.id}
                                          onClick={() => onElegir(s.id)}>
                                    {s.etiqueta}
                                </Pastilla>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {nota && (
                <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                    «Fundado pero insuficiente» le da la razón a quien promueve y aun
                    así no prospera: por eso está de ese lado. En los engroses medidos
                    acaba en resolutivo desfavorable tan seguido como el infundado.
                </p>
            )}
        </div>
    );
}

/** Palabras con las que un texto deja de ser un veredicto y pasa a ser una razón. */
const MARCAS_DE_RAZON = /\bporque\b|\bya que\b|\bpuesto que\b|\bdebido a\b|\btoda vez que\b|\ben virtud de\b|\bdado que\b|\bpues\b|\bal (?:haber|no|ser|resultar)\b/i;

/** A FAVOR o EN CONTRA de quien promueve, que es lo único comparable: el
 *  acervo habla del FALLO —concede, niega, confirma— y el criterio del
 *  PLANTEAMIENTO —fundado, infundado—. Comparándolos como cadenas, el aviso de
 *  «vas contra la corriente» saltaba siempre. Misma tabla que el servidor. */
const A_FAVOR = new Set(['CONCEDE', 'concede', 'revoca', 'fundado',
                         'esencialmente_fundado', 'sustancialmente_fundado',
                         'parcialmente_fundado']);
const EN_CONTRA = new Set(['NIEGA', 'niega', 'confirma', 'infundado',
                           'inoperante', 'ineficaz', 'SOBRESEE', 'sobresee']);

function mismaDireccion(a: string, b: string): boolean {
    if (!a || !b) return true;
    if (A_FAVOR.has(a) && A_FAVOR.has(b)) return true;
    if (EN_CONTRA.has(a) && EN_CONTRA.has(b)) return true;
    return !((A_FAVOR.has(a) && EN_CONTRA.has(b)) ||
             (EN_CONTRA.has(a) && A_FAVOR.has(b)));
}

/** ¿Es esto una razón —y no un veredicto de una línea? Mismo listón en los
 *  dos caminos: veinticinco palabras y una marca de causa. */
function esRazon(t: string): boolean {
    const x = (t || '').trim();
    return x.split(/\s+/).length >= 25 && MARCAS_DE_RAZON.test(x);
}

export function fuerzaDelCriterio(problemas: ProblemaJuridico[]) {
    const total = problemas.length || 1;
    const conSentido = problemas.filter((p) => !!p.sentido).length;
    const conRazon = problemas.filter((p) => esRazon(p.criterio)).length;
    // El sentido vale un tercio; la razón, dos. Decidir es la mitad del trabajo;
    // explicar por qué es la otra mitad y media.
    const pct = Math.round(((conSentido / total) * 33 + (conRazon / total) * 67));
    return { pct, conSentido, conRazon, total: problemas.length, via: 'tema' as const };
}

/* ═══ EL MEDIDOR MEDÍA EL CAMINO QUE NO SE ESTABA ANDANDO ═══
   Medido en el 93/2026: el secretario resolvió el asunto entero por la vía
   global, con su sentido y su razón escrita —y su consecuencia por tema—, y
   arriba seguía leyéndose «33% · 0/2 razonados». La cuenta sólo miraba
   `p.sentido` y `p.criterio`, que en esta vía están vacíos a propósito: en el
   camino global las pastillas por tema ni se enseñan.

   Un indicador que acusa al trabajo bien hecho es peor que no tenerlo: enseña
   a no hacerle caso, y entonces tampoco avisa el día que falta algo de verdad.
   Así que mide lo que gobierna: si la vía es la global, el sentido global y la
   razón global. */
export function fuerzaGlobal(sentido: string, razon: string, temas: number) {
    const hay = !!sentido;
    const razonada = esRazon(razon);
    const pct = Math.round((hay ? 33 : 0) + (razonada ? 67 : 0));
    return {
        pct,
        conSentido: hay ? temas : 0,
        conRazon: razonada ? temas : 0,
        total: temas,
        via: 'global' as const,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA SOLUCIÓN GLOBAL, EXPLICADA
   ═══════════════════════════════════════════════════════════════════════════
   David: «me gustaría que en la solución global permitas que el modelo proponga
   la solución global con un botón como "Inserta la solución propuesta" y que el
   secretario pueda editarla o agregar aspectos. Pero hay que hacerlo más
   ilustrativo para que el secretario entienda que está haciendo y pueda razonar
   con toda claridad lo que esta haciendo porque al final es él quien tomará la
   decisión».

   Lo que había eran cuatro pastillas —Fundado, Infundado, Inoperante,
   Ineficaz— y una frase explicando la sustracción de materia. Eso pide una
   decisión sin enseñar sus consecuencias: el secretario elige «fundado» y no
   ve hasta el .docx que con eso acaba de dejar sin estudio otros cuatro
   problemas.

   Ahora se ve ANTES: qué problema manda, qué dice el acervo de él, qué le pasa
   a cada uno de los demás con el sentido elegido, y cómo va a quedar el
   resolutivo. Y la propuesta del motor se INSERTA —no se aplica sola—, porque
   quien decide es él: el botón la trae, y a partir de ahí es suya para
   corregirla.
   ═══════════════════════════════════════════════════════════════════════════ */
function BloqueGlobal({ problemas, propuesta, sentidoGlobal, onSentidoGlobal,
                        razonGlobal, onRazonGlobal }: {
    problemas: ProblemaJuridico[];
    propuesta?: { propuestas: { sentido: string; razon: string;
        prediccion?: { frase: string; confianza: string; sentido: string };
        jerarquia?: string; problema?: string; alcanza: boolean }[];
        /* LA PROPUESTA DEL ASUNTO, que ahora sí existe. Ver abajo. */
        global?: { sentido: string; razon: string; problema_que_decide: string;
                   efecto: string; apoyos: string[]; confianza: string;
                   en_contra: string; alcanza: boolean } | null } | null;
    sentidoGlobal: string;
    onSentidoGlobal: (s: string) => void;
    razonGlobal?: string;
    onRazonGlobal?: (t: string) => void;
}) {
    /* EL PRINCIPAL ES EL QUE MANDA, y si nadie lo marcó, el primero. La
       sustracción de materia cuelga de él: sin saber cuál es, el secretario no
       puede prever qué deja fuera. */
    const iPrincipal = Math.max(0, problemas.findIndex((p) => p.jerarquia === 'principal'));
    const principal = problemas[iPrincipal];
    /* LA SOLUCIÓN GLOBAL VIENE DEL MOTOR, no de reciclar la de un problema.
       Antes esta línea era `propuesta?.propuestas?.[iPrincipal]`: se cogía la
       propuesta del problema principal y se enseñaba con la etiqueta «solución
       global». Con tres problemas, el secretario veía el sentido de uno solo.
       Ahora el modelo propone la del asunto entero —de qué problema cuelga,
       qué arrastra, y el mejor argumento en contra— en la misma llamada. */
    const global = propuesta?.global ?? null;
    /* La predicción del acervo sigue siendo la del problema principal: es una
       cifra por problema, no del asunto. */
    const predPrincipal = propuesta?.propuestas?.[iPrincipal]?.prediccion;
    /* PROSPERA NO ES «EMPIEZA POR FUNDAD». «esencialmente_fundado» empieza por
       «esencialmente» y devolvía false, así que la pantalla decía que los
       accesorios se estudian cuando en realidad quedan sin materia. En el
       servidor esto vive en `tipos_asunto.prospera`; aquí se replica la regla
       porque la pantalla decide antes de preguntar. */
    /* NO BASTA CON «LLEVA FUNDAD DENTRO». «fundado_insuficiente» lo lleva y no
       prospera: tiene razón y aun así no mueve el sentido, porque subsisten
       otras consideraciones. Medido: 12% de apariciones en asuntos
       favorables, contra el 11% del infundado. En el servidor esto vive en
       `tipos_asunto.prospera`. */
    const prospera = /fundad/.test(sentidoGlobal)
                  && !/insuficien/.test(sentidoGlobal);

    /* LO QUE PASA CON CADA UNO. Es la regla del servidor —`modos_decision`—
       dicha en pantalla: si el principal prospera, los accesorios quedan sin
       materia; si no, se estudian todos con el mismo sentido. */
    const consecuencia = (p: ProblemaJuridico, i: number) =>
        i === iPrincipal ? 'decide el proyecto'
            : prospera ? 'queda sin materia'
            : 'se estudia con el mismo sentido';

    return (
        <div className="mt-3 space-y-3">
            {/* 1 · DE QUÉ CUELGA TODO */}
            <div className="rounded-xl border border-accent-gold/25 bg-accent-gold/[0.05] p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-accent-gold/80">
                    El problema que decide el proyecto
                </p>
                <p className="text-[12.5px] leading-relaxed text-white/85">
                    {principal?.pregunta || '—'}
                </p>
                {predPrincipal?.frase && (
                    <p className="mt-2 text-[11.5px] text-white/45">
                        El acervo: {predPrincipal.frase}
                    </p>
                )}
            </div>

            {/* 1-bis · LO QUE PROPONE EL MOTOR, Y POR DÓNDE SE CAE.
                 Esto es lo que faltaba para que el secretario pueda RAZONAR en
                 vez de aceptar. No basta con enseñarle el sentido propuesto:
                 hay que enseñarle de qué cuelga, qué arrastra consigo, en qué
                 se apoya, y el mejor argumento de quien resolvería al revés.
                 Una propuesta sin su contra se acepta por inercia, y quien
                 firma es él. */}
            {global && (
                <div className="rounded-xl border border-white/[0.09] bg-white/[0.02] p-3">
                    <div className="mb-2 flex items-baseline gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                            Lo que propone el motor
                        </p>
                        <span className="rounded bg-accent-gold/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-gold">
                            {global.sentido}
                        </span>
                        {global.confianza && (
                            <span className="text-[10px] text-white/30">
                                confianza {global.confianza}
                            </span>
                        )}
                    </div>

                    <p className="text-[12.5px] leading-relaxed text-white/75">
                        {global.razon}
                    </p>

                    {global.problema_que_decide && (
                        <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">
                            <span className="text-white/30">Cuelga de: </span>
                            {global.problema_que_decide}
                        </p>
                    )}
                    {global.efecto && (
                        <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
                            <span className="text-white/30">Con los demás: </span>
                            {global.efecto}
                        </p>
                    )}

                    {/* LA OBJECIÓN. Es lo que convierte esto en una decisión
                        razonada y no en un botón que se pulsa. */}
                    {global.en_contra && (
                        <div className="mt-2.5 rounded-lg border-l-2 border-amber-400/40 bg-amber-400/[0.04] py-1.5 pl-2.5 pr-2">
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">
                                Por dónde se cae
                            </p>
                            <p className="text-[11.5px] leading-relaxed text-white/60">
                                {global.en_contra}
                            </p>
                        </div>
                    )}

                    {global.apoyos?.length > 0 && (
                        <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-white/35">
                            Se apoya en: {global.apoyos.join(' · ')}
                        </p>
                    )}
                </div>
            )}

            {/* 2 · LA DECISIÓN */}
            <div>
                <p className="mb-2 text-[12px] leading-relaxed text-white/55">
                    Elige el sentido. Debajo verás qué le pasa a cada problema
                    con esa elección, antes de generar nada.
                </p>
                <Calificativas elegido={sentidoGlobal} nota
                               onElegir={(id) => onSentidoGlobal(id)} />
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {/* EL BOTÓN QUE TRAE LA PROPUESTA. No decide: rellena. */}
                    {global?.sentido && (
                        <button type="button"
                                onClick={() => {
                                    onSentidoGlobal(global.sentido);
                                    if (onRazonGlobal && global.razon && !razonGlobal?.trim()) {
                                        onRazonGlobal(global.razon);
                                    }
                                }}
                                className="ml-auto rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 text-[11.5px] font-medium text-accent-gold transition-colors hover:bg-accent-gold/20">
                            Insertar la solución propuesta
                        </button>
                    )}
                </div>
            </div>

            {/* 3 · LA CONSECUENCIA, PROBLEMA A PROBLEMA */}
            {sentidoGlobal && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                        Con ese sentido, el proyecto queda así
                    </p>
                    <ul className="space-y-1.5">
                        {problemas.map((p, i) => (
                            <li key={p.id} className="flex gap-2 text-[11.5px] leading-snug">
                                <span className="shrink-0 tabular-nums text-white/30">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="min-w-0 flex-1 text-white/60">
                                    {p.pregunta.length > 92
                                        ? p.pregunta.slice(0, 92) + '…' : p.pregunta}
                                </span>
                                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px]',
                                    i === iPrincipal
                                        ? 'bg-accent-gold/15 text-accent-gold'
                                        : prospera
                                            ? 'bg-white/[0.06] text-white/40'
                                            : 'bg-white/[0.06] text-white/55')}>
                                    {consecuencia(p, i)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {prospera && problemas.length > 1 && (
                        <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-white/40">
                            Los accesorios no se contestan: el proyecto dirá que
                            quedaron sin materia. Si alguno pide algo que dé MÁS de
                            lo que concede el principal, ése se estudia igual —el
                            motor lo detecta y te lo dice—.
                        </p>
                    )}
                </div>
            )}

            {/* 4 · LA RAZÓN, QUE ES SUYA */}
            {onRazonGlobal && (
                <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/40">
                        Por qué. Esto alinea todo el estudio
                    </label>
                    <textarea
                        value={razonGlobal}
                        onChange={(e) => onRazonGlobal(e.target.value)}
                        rows={4}
                        placeholder="La razón por la que el proyecto se resuelve en ese sentido. Si insertaste la propuesta, corrígela y añade lo que falte: el estudio se construye sobre esto."
                        className="w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-[12.5px] leading-relaxed text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-accent-gold/40" />
                    {global?.razon && razonGlobal?.trim() === global.razon.trim() && (
                        <p className="mt-1.5 text-[11px] text-white/35">
                            Es la propuesta del motor, tal cual. Léela y hazla tuya:
                            quien firma eres tú.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}


export default function VentanaCriterio({
    problemas, onCambiar, onGenerar, generando, onProponer, propuesta,
    modo = 'por_problema', onModo, sentidoGlobal = '', onSentidoGlobal,
    razonGlobal = '', onRazonGlobal,
    onAportar, aportando, contextoAportado, proponiendo,
    conceptosViolacion = '', onConceptosViolacion,
    grupos = {}, onGrupos, tocados, globalDictado = false,
    onRazonar, razonando,
}: {
    problemas: ProblemaJuridico[];
    onCambiar: (id: string, campo: 'criterio' | 'sentido', valor: string) => void;
    onGenerar: () => void;
    generando?: boolean;
    /** EL MODO DE DECIDIR. «acervo» acepta lo que propone la máquina con los
     *  holdings y la jurimetría; «global» dicta un sentido para el proyecto
     *  entero y deja los accesorios sin materia; «por_problema» es uno a uno.
     *  Los tres llegan al mismo sitio: una lista de criterios. */
    modo?: 'acervo' | 'global' | 'por_problema';
    onModo?: (m: 'acervo' | 'global' | 'por_problema') => void;
    sentidoGlobal?: string;
    onSentidoGlobal?: (s: string) => void;
    /** La razón de la solución global, que el secretario escribe o edita
     *  después de insertar la que propone el motor. Es lo que alinea el
     *  estudio: sin ella el proyecto tiene un sentido y ninguna explicación. */
    razonGlobal?: string;
    onRazonGlobal?: (t: string) => void;
    /** LOS CONCEPTOS DE VIOLACIÓN que aporta el secretario cuando el recurso
     *  levanta un sobreseimiento: el tribunal asume jurisdicción y tiene que
     *  estudiarlos por primera vez, y no constan en el expediente del recurso.
     *  El servidor dice cuándo hacen falta (`necesitaConceptos`). */
    conceptosViolacion?: string;
    onConceptosViolacion?: (t: string) => void;
    /** Problemas que el secretario decidió estudiar juntos: id → letra. */
    grupos?: Record<string, string>;
    onGrupos?: (g: Record<string, string>) => void;
    /** Pide al motor que proponga el sentido de cada problema. */
    onProponer?: () => void;
    propuesta?: { propuestas: { sentido: string; razon: string; apoyos: string[];
        prediccion?: { frase: string; confianza: string; sentido: string };
        jerarquia?: string; problema?: string;
                                confianza: string; alcanza: boolean }[];
        /** El servidor detectó que el recurso levanta un sobreseimiento y los
         *  conceptos de violación no constan. */
        necesitaConceptos?: boolean;
        /* LA SOLUCIÓN DEL ASUNTO, con su contexto, su vía contraria y la lista
           de comprobación. Se declara con el tipo del cliente para no
           mantener dos copias de la misma forma. */
        global?: SolucionGlobal | null;
                  avisos: string[] } | null;
    /** Sube el documento que el motor echó en falta, o escribe el contexto. */
    onAportar?: (documento: File | null, texto: string) => void;
    aportando?: boolean;
    /** El motor está proponiendo —no generando—. Sin esto el botón de generar
     *  decía «Redactando la sentencia…» mientras corría la propuesta. */
    proponiendo?: boolean;
    contextoAportado?: number;
    /** Los problemas cuyo sentido marcó el secretario a mano. Sirve para
     *  distinguir en la tabla final lo que decidió él de lo que rellenó el
     *  motor: sin eso, las dos cosas se ven igual y no se sabe qué manda. */
    tocados?: Set<string>;
    /** Si el sentido global lo eligió el secretario a propósito. Decide si
     *  manda sobre las propuestas por problema, igual que en el servidor. */
    globalDictado?: boolean;
    /** Pide al motor una razón para el sentido que el secretario acaba de
     *  marcar. No propone otro: sostiene el que él eligió. */
    onRazonar?: (id: string, pregunta: string, sentido: string) => void;
    /** Los problemas cuya razón se está redactando ahora mismo. */
    razonando?: Set<string>;
}) {
    const fuerza = useMemo(
        () => (modo === 'global'
            ? fuerzaGlobal(sentidoGlobal, razonGlobal, problemas.length)
            : fuerzaDelCriterio(problemas)),
        [modo, sentidoGlobal, razonGlobal, problemas]);

    /* LA DECISIÓN, CALCULADA EN VIVO.
       Misma precedencia que `modos_decision.repartir` en el servidor: primero
       lo que marcó el secretario, luego lo que el motor propuso para ESE
       problema, y sólo al final el sentido global. Si las dos tablas no
       calculan igual, la pantalla miente sobre lo que va a salir. */
    const decision = useMemo(() => {
        const porProblema = new Map<string, string>();
        for (const q of (propuesta?.propuestas ?? [])) {
            if (q.problema && q.alcanza && q.sentido) porProblema.set(q.problema, q.sentido);
        }
        const principal = problemas.find((p) => (p.jerarquia ?? '') === 'principal') ?? problemas[0];
        /* LOS TEMAS QUE EL MOTOR MARCÓ AJENOS AL PRINCIPAL, emparejados por
           número —el `tema` de la lista viene resumido y no coincide con la
           pregunta—, con caída al texto cuando el número no venga. */
        const distintos = new Set<string>();
        for (const c of (propuesta?.global?.checklist ?? [])) {
            if (!c?.tema_distinto) continue;
            const n = Number(c.numero);
            if (Number.isInteger(n) && n >= 1 && n <= problemas.length) {
                distintos.add(problemas[n - 1].pregunta);
                continue;
            }
            const tema = String(c.tema ?? '').trim().toLowerCase().slice(0, 60);
            if (!tema) continue;
            const igual = problemas.find((p) => p.pregunta.toLowerCase().includes(tema));
            if (igual) distintos.add(igual.pregunta);
        }
        const prosperan = ['fundado', 'esencialmente_fundado', 'sustancialmente_fundado',
                           'parcialmente_fundado', 'fundado_insuficiente'];
        /* MISMO ORDEN QUE EL SERVIDOR. Si él dictó el global, éste manda sobre
           lo que el motor propuso por problema; si lo puso la pantalla al
           llegar la propuesta, es un eco del motor y vale menos que ella. */
        /* EL GLOBAL QUE DICTÓ ÉL VA POR DELANTE DE LAS MARCAS VIEJAS.
           En esta vía las pastillas por tema ni se enseñan, así que una marca
           por tema aquí es un resto de la otra: lo último que dijo es el
           global. Si el global lo puso la pantalla —eco del motor— la marca
           por tema conserva la preferencia, que es la lección del 536/2025. */
        const dictado = modo === 'global' && globalDictado && !!sentidoGlobal;
        const sentidoDe = (p: ProblemaJuridico) => {
            if (dictado) return sentidoGlobal;
            if (p.sentido) return p.sentido;
            return porProblema.get(p.pregunta)
                || (modo === 'global' ? sentidoGlobal : '');
        };
        const principalProspera = principal
            ? prosperan.includes(sentidoDe(principal) || '') : false;
        return problemas.map((p) => {
            const suyo = !dictado && tocados?.has(p.id) && p.sentido;
            let sentido = sentidoDe(p);
            let de: 'tuyo' | 'motor' | 'global' | 'sin_materia' =
                dictado ? 'global'
                : suyo ? 'tuyo'
                : porProblema.has(p.pregunta) ? 'motor' : 'global';
            // LA SUSTRACCIÓN DE MATERIA, como la aplica el servidor: si el
            // principal prospera, los accesorios que el secretario NO tocó
            // quedan sin materia. Enseñarlo aquí evita la sorpresa de abrir el
            // proyecto y encontrar «innecesario» donde se esperaba un estudio.
            /* SALVO EL TEMA DISTINTO. Mismo escape que aplica el servidor
               en `modos_decision.repartir`: si el propio motor marcó que ese
               planteamiento no cuelga del principal, declararlo innecesario
               contradice la suerte que él mismo le escribió dos renglones más
               arriba, en «qué pasa con cada tema». Se vio en el 93/2026. */
            if (modo === 'global' && !suyo && principalProspera
                && p !== principal && (p.jerarquia ?? 'accesorio') !== 'principal'
                && !distintos.has(p.pregunta)) {
                sentido = 'innecesario';
                de = 'sin_materia';
            }
            return { id: p.id, pregunta: p.pregunta, sentido, de };
        });
    }, [problemas, propuesta, modo, sentidoGlobal, tocados, globalDictado]);
    /* CUÁL DE LAS DOS VÍAS. Por omisión la propuesta del motor: ése es el
       caso frecuente y es lo que automatiza el trabajo. La contraria está a un
       clic. */
    const [via, setVia] = useState<'propuesta' | 'alternativa'>('propuesta');

    /* CAMBIAR DE VÍA SUSTITUYE LA RAZÓN, aunque el secretario la hubiera
       editado. No es un descuido: son resoluciones OPUESTAS, y quedarse con la
       razón de conceder en un proyecto que niega es exactamente la
       incongruencia que este utillaje existe para evitar —ya pasó, y costó un
       engrose con efectos de concesión y un resolutivo que negaba—.
       Se avisa en pantalla antes de que ocurra, y el texto del motor siempre
       está a un clic con «Volver a la del motor». */
    const elegirVia = React.useCallback((v: 'propuesta' | 'alternativa') => {
        setVia(v);
        const g = propuesta?.global;
        if (!g) return;
        const fuente = v === 'alternativa' ? g.alternativa : g;
        onSentidoGlobal?.(fuente?.sentido || '');
        onRazonGlobal?.(fuente?.razon || '');
    }, [propuesta, onSentidoGlobal, onRazonGlobal]);

    const [contexto, setContexto] = useState('');
    const [fichero, setFichero] = useState<File | null>(null);
    // BASTA UN SENTIDO PARA PODER GENERAR. Exigirlos todos dejaba al
    // secretario encerrado: cuando el motor no alcanza a proponer —«SIN
    // PROPUESTA» en cinco de seis, porque el acervo no lo sostiene— la puerta
    // no se abría nunca y no había forma de avanzar salvo teclear seis
    // criterios a mano. Yair se quedó ahí. Con uno se puede resolver: los
    // demás se estudian igual, y el aviso dice cuántos faltan por si prefiere
    // fijarlos antes.
    const listo = fuerza.conSentido > 0;
    const completo = fuerza.conSentido === fuerza.total && fuerza.total > 0;

    /* «CADA SENTIDO CON SU RAZÓN», Y ENTONCES LA TARJETA.
       David: «con cada calificación el LLM debe darle una posible razón. Sólo
       cuando llene todo eso, es decir, cada sentido con su razón, podrá ver el
       recuadro final».

       Estaba a medias: la tarjeta salía en cuanto todos los planteamientos
       tenían calificativa, aunque alguno tuviera el porqué en blanco. Se vio
       en el 91/2025 —el planteamiento 02 calificado y su recuadro vacío— y esa
       es justamente la puerta por la que el estudio acaba inventándose el
       motivo de una calificación que él sí decidió.

       Se pide que haya algo escrito, no que esté bien escrito: una razón de
       tres líneas suya vale, y la barra de fuerza sigue midiendo la calidad
       aparte. Exigir el listón de la barra habría encerrado al secretario. */
    const porque = (id: string) =>
        (problemas.find((p) => p.id === id)?.criterio || '').trim().length > 0;
    const sinPorque = modo === 'global'
        ? (sentidoGlobal && !razonGlobal.trim() ? ['el sentido global'] : [])
        : decision.filter((d) => d.sentido && !porque(d.id)).map((d) => d.pregunta);
    const todoDecidido = decision.length > 0
        && decision.every((d) => d.sentido) && sinPorque.length === 0;

    const tono = fuerza.pct >= 70 ? 'bg-emerald-400' : fuerza.pct >= 35 ? 'bg-accent-gold' : 'bg-amber-400';
    const dictamen =
        fuerza.pct >= 70 ? 'Criterio sólido: la sentencia se va a parecer a lo que piensas.'
            : fuerza.pct >= 35 ? 'Vas bien. Añade el porqué donde falte y ganarás alineación.'
                : 'Sólo con el sentido, la redacción tendrá que suponer tus razones.';

    return (
        <Tarjeta glow className="border-amber-400/20">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white/95">
                        <PenLine className="h-4 w-4 text-amber-300" />
                        Tu criterio
                    </h2>
                    <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/45">
                        Decide el sentido de cada problema y, sobre todo,{' '}
                        <span className="text-white/75">escribe por qué</span>. El estudio se
                        construye para demostrar tu razonamiento, no para sustituirlo.
                    </p>
                </div>
                <span className="shrink-0 text-right">
                    <span className="block text-2xl font-semibold tabular-nums text-white/90">{fuerza.pct}%</span>
                    <span className="block text-[10px] uppercase tracking-wider text-white/35">criterio dado</span>
                </span>
            </div>

            {/* Medidor */}
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                    className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tono)}
                    style={{ width: `${Math.max(fuerza.pct, 2)}%` }}
                />
            </div>
            <div className="mb-5 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-white/40">{dictamen}</span>
                <span className="shrink-0 tabular-nums text-white/30">
                    {fuerza.via === 'global'
                        ? `${fuerza.conSentido ? 'sentido dictado' : 'sin sentido'} · ${
                              fuerza.conRazon ? 'razón escrita' : 'falta el porqué'}`
                        : `${fuerza.conSentido}/${fuerza.total} con sentido · ${
                              fuerza.conRazon}/${fuerza.total} razonados`}
                </span>
            </div>

            {/* ═══ CÓMO SE DECIDE ═══
                Tres caminos al mismo sitio, y el secretario elige cuál. Antes
                sólo existía el de uno en uno, así que un asunto con una sola
                cuestión toral obligaba a contestar cinco preguntas para decir
                una cosa. */}
            {onModo && (
                <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/45">
                        Cómo vas a resolver
                    </p>
                    {/* SE QUITÓ EL PÁRRAFO DE ENTRADA. Decía «dos caminos, en
                        los dos puedes escribir tú el criterio o pedírselo al
                        motor», y las dos tarjetas de abajo ya lo explican cada
                        una en su sitio. Eran tres renglones que el secretario
                        lee una vez y recorre con la rueda cada día, empujando
                        la decisión —que es lo único que tiene que hacer aquí—
                        más abajo de la pantalla. */}

                    {/* DOS CAMINOS, NO TRES. Había un tercero —«Con el acervo»—
                        que no era una forma distinta de decidir sino la misma
                        decisión global tomada por la máquina: el secretario
                        tenía que distinguir entre «un sentido global» y «con el
                        acervo» sin que la diferencia estuviera en ninguna
                        parte. Ahora la máquina propone DENTRO de cada camino,
                        que es donde tiene sentido. */}
                    <div className="grid gap-2 sm:grid-cols-2">
                        {([
                            ['global', 'Resolver todo el asunto',
                             'Un solo sentido gobierna el proyecto. El tema principal decide y '
                             + 'los demás siguen su suerte, salvo los que sean tema distinto.',
                             'Es el camino corto y el más frecuente.'],
                            ['por_problema', 'Resolver problema por problema',
                             'Cada problema jurídico lleva su propia calificación y su propia '
                             + 'razón. El resolutivo sale mixto donde deba salir mixto.',
                             'Para cuando los temas no siguen la misma suerte.'],
                        ] as const).map(([id, titulo, que, cuando]) => (
                            <button key={id} type="button" onClick={() => onModo(id)}
                                    className={cn('rounded-xl border p-3 text-left transition-colors',
                                        modo === id
                                            ? 'border-accent-gold/50 bg-accent-gold/[0.07]'
                                            : 'border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.04]')}>
                                <div className="mb-1 flex items-center gap-2">
                                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                        modo === id ? 'border-accent-gold bg-accent-gold text-charcoal-900'
                                                    : 'border-white/25')}>
                                        {modo === id && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    <span className="text-[12.5px] font-medium text-white/85">{titulo}</span>
                                </div>
                                <p className="text-[11.5px] leading-snug text-white/50">{que}</p>
                                <p className="mt-1 text-[11px] leading-snug text-white/30">{cuando}</p>
                            </button>
                        ))}
                    </div>

                    {/* QUIEN FIRMA ES ÉL. No es un descargo legal: es lo que
                        impide que la propuesta se acepte por inercia. Va aquí,
                        antes de elegir, y no en un aviso al final que nadie
                        lee. */}
                    <div className="mt-3 flex gap-2 rounded-lg border-l-2 border-amber-400/40 bg-amber-400/[0.04] py-2 pl-2.5 pr-3">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
                        <p className="text-[11.5px] leading-relaxed text-white/60">
                            El motor propone; <span className="text-white/85">el criterio es
                            tuyo</span>. Lee la razón antes de generar y corrígela si no es la
                            que sostendrías: el proyecto sale con tu nombre y la
                            responsabilidad de que el sentido sea el correcto es tuya.
                        </p>
                    </div>

                    {modo === 'global' && onSentidoGlobal && (
                        propuesta?.global ? (
                            /* LA PANTALLA DE DECISIÓN. Sustituye a BloqueGlobal:
                               contexto en prosa, dos vías —la propuesta y la
                               contraria, ya escritas— y la lista de
                               comprobación de todos los temas.
                               BloqueGlobal se conserva abajo para cuando el
                               motor no alcanzó a proponer nada: entonces no hay
                               dos vías que ofrecer y el secretario fija el
                               sentido a mano, como siempre. */
                            <SolucionDelAsunto
                                global={propuesta.global} via={via}
                                onVia={elegirVia}
                                razon={razonGlobal ?? ''}
                                onRazon={(t) => onRazonGlobal?.(t)}
                                necesitaConceptos={propuesta.necesitaConceptos}
                                conceptos={conceptosViolacion}
                                onConceptos={onConceptosViolacion}
                                problemas={problemas.map((p) => ({
                                    id: p.id, pregunta: p.pregunta,
                                    jerarquia: p.jerarquia }))}
                                grupos={grupos}
                                onGrupos={onGrupos} />
                        ) : (
                            <BloqueGlobal problemas={problemas} propuesta={propuesta}
                                          sentidoGlobal={sentidoGlobal}
                                          onSentidoGlobal={onSentidoGlobal}
                                          razonGlobal={razonGlobal}
                                          onRazonGlobal={onRazonGlobal} />
                        )
                    )}
                </div>
            )}

            {/* ═══ EN GLOBAL, LOS PROBLEMAS DESAPARECEN ═══
                David: «si resuelve global no hay despliegue de problemas
                jurídicos ni de temas. El sistema da una solución única a todo
                que puede cambiar de un sentido a otro. Los accesorios son
                consecuencia de lo infundado del o los principales.»

                Tenía razón y era una incoherencia de bulto: en modo global las
                pastillas por problema seguían ahí, clicables, y su valor se
                descartaba. Se le pedía decidir dos veces cosas que se excluyen
                y sólo una contaba. */}
            {modo === 'global' ? (
                <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3
                              text-[12px] leading-relaxed text-white/45">
                    Estás resolviendo el asunto entero de una vez. Los{' '}
                    {problemas.length} planteamientos no se califican uno a uno: el
                    principal decide, y los accesorios quedan como consecuencia suya.
                    Si prefieres calificarlos por separado, cambia arriba a{' '}
                    <span className="text-white/70">tema por tema</span>.
                </p>
            ) : (
            <div className="space-y-4">
                {problemas.map((p, i) => {
                    const razonado = p.criterio.trim().split(/\s+/).length >= 25 && MARCAS_DE_RAZON.test(p.criterio);
                    return (
                        <div key={p.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                            <p className="mb-2 text-[13px] leading-relaxed text-white/80">
                                <span className="mr-2 text-[11px] font-semibold text-accent-gold">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {p.jerarquia === 'principal' && (
                                    <span className="mr-2 rounded border border-accent-gold/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-gold/90">
                                        principal
                                    </span>
                                )}
                                {p.pregunta}
                            </p>

                            {/* LA JURIMETRÍA, AL LADO DEL PROBLEMA. Es la columna que
                                faltaba: cómo resolvió el acervo esta misma cuestión.
                                No es un pronóstico de lo que hará este tribunal —por
                                eso la frase dice cuántas sentencias hay detrás— y no
                                se escribe en la sentencia: el criterio no se vota. */}
                            {p.prediccion?.frase && (
                                <p className={cn(
                                    'mb-3 flex items-center gap-1.5 text-[11.5px]',
                                    p.prediccion.confianza === 'baja'
                                        ? 'text-white/35' : 'text-white/55')}>
                                    <span className="text-white/30">El acervo:</span>
                                    <span className="text-white/75">{p.prediccion.frase}</span>
                                    {p.sentido && p.prediccion.sentido &&
                                     !mismaDireccion(p.prediccion.sentido, p.sentido) && (
                                        <span className="ml-1 rounded border border-amber-400/30 px-1.5 py-0.5 text-[10px] text-amber-300/80">
                                            vas contra la corriente
                                        </span>
                                    )}
                                </p>
                            )}

                            <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-2">
                                <Calificativas
                                    elegido={p.sentido}
                                    nota={i === 0}
                                    onElegir={(s) => {
                                        onCambiar(p.id, 'sentido', s);
                                        // Y CON LA CALIFICACIÓN, SU RAZÓN.
                                        // Antes quedaba un cuadro en blanco
                                        // y, si no se rellenaba, el estudio
                                        // se inventaba el porqué.
                                        onRazonar?.(p.id, p.pregunta, s);
                                    }}
                                />
                                {razonando?.has(p.id) && (
                                    <Pastilla tono="ambar">
                                        redactando la razón…
                                    </Pastilla>
                                )}
                                {p.impedimento && (
                                    <Pastilla tono="ambar" icono={Lightbulb}>
                                        se advierte {p.impedimento.motivo}
                                    </Pastilla>
                                )}
                            </div>

                            <textarea
                                value={p.criterio}
                                onChange={(e) => onCambiar(p.id, 'criterio', e.target.value)}
                                rows={3}
                                placeholder="Mi criterio es… porque…"
                                className={cn(
                                    'w-full resize-y rounded-xl border bg-black/20 px-3.5 py-2.5',
                                    'text-[13px] leading-relaxed text-white/90 placeholder:text-white/25',
                                    'transition-colors duration-200 outline-none',
                                    razonado
                                        ? 'border-emerald-400/25 focus:border-emerald-400/50'
                                        : 'border-white/[0.09] focus:border-accent-gold/45',
                                )}
                            />
                            {/* ═══ UNA RAZÓN TUYA, ESCRITA PARA OTRO SENTIDO ═══
                                Lo que redacta el motor se borra solo al cambiar
                                de pastilla. Lo que escribe él NO se destruye
                                nunca —es suyo—, pero tampoco puede quedarse
                                callando que argumenta lo contrario de lo que
                                ahora está marcado. Se dice, y se le da el botón
                                para reemplazarla si quiere. */}
                            {p.razonDe && !p.razonDe.delMotor && p.razonDe.sentido
                             && p.sentido && p.razonDe.sentido !== p.sentido
                             && p.criterio.trim().length > 0 && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg
                                                border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2">
                                    <span className="text-[11.5px] leading-relaxed text-amber-200/80">
                                        Esta razón la escribiste tú para{' '}
                                        <span className="font-medium">
                                            {p.razonDe.sentido.replace(/_/g, ' ')}
                                        </span>
                                        , y ahora el planteamiento está marcado{' '}
                                        <span className="font-medium">
                                            {p.sentido.replace(/_/g, ' ')}
                                        </span>. No se ha tocado: decide tú.
                                    </span>
                                    <button type="button"
                                            onClick={() => {
                                                onCambiar(p.id, 'criterio', '');
                                                onRazonar?.(p.id, p.pregunta, p.sentido || '');
                                            }}
                                            className="rounded-md border border-amber-400/30 px-2 py-1
                                                       text-[11px] text-amber-200/90 transition-colors
                                                       hover:bg-amber-400/10">
                                        Escribir la de «{p.sentido.replace(/_/g, ' ')}»
                                    </button>
                                </div>
                            )}
                            {!razonado && p.criterio.trim().length > 0 && (
                                <p className="mt-1.5 text-[11px] text-amber-300/70">
                                    Falta el porqué. Una razón explícita aquí vale más que tres
                                    párrafos de instrucciones después.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            )}

            {/* LA PROPUESTA VA ANTES DEL BOTÓN DE GENERAR, y se ve que es una
                sugerencia: el criterio sigue siendo del secretario. Sin este
                paso el proyecto salía con la calificación de la plantilla. */}
            {onProponer && (
                <button
                    onClick={onProponer}
                    disabled={generando}
                    className={cn(
                        'mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl',
                        'border border-white/[0.12] bg-white/[0.04] text-[12.5px] font-medium',
                        'text-white/75 transition-all duration-200',
                        generando ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/[0.08]',
                    )}
                >
                    {/* SIN «EL ACERVO» EN EL RÓTULO. Al secretario no le dice
                        nada de qué va a pasar: le dice de dónde sale el dato.
                        Lo que necesita saber es que el motor va a proponer una
                        solución y que él la va a poder cambiar. */}
                    {propuesta
                        ? 'Volver a proponer'
                        : modo === 'global'
                            ? 'Que el motor proponga la solución'
                            : 'Que el motor proponga cada calificación'}
                </button>
            )}
            {/* SI EL MOTOR DIJO QUÉ LE FALTA, QUE SE LE PUEDA DAR. Aparece
                sólo cuando hay problemas sin propuesta: es entonces cuando el
                diagnóstico —«el acervo no contiene la cláusula 64»— deja de
                ser un callejón sin salida. */}
            {propuesta && propuesta.propuestas.some((p) => !p.alcanza) && onAportar && (
                <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
                    <p className="text-[12px] font-medium text-amber-200/90">
                        Al motor le falta material para proponer en algunos puntos
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">
                        Sube el documento que echó en falta —el contrato colectivo, el
                        convenio, el acta— o escribe el contexto. Lo usará para proponer
                        y para redactar, citándolo como documento aportado.
                    </p>
                    <textarea
                        value={contexto}
                        onChange={(e) => setContexto(e.target.value)}
                        rows={3}
                        placeholder="Por ejemplo: «CLÁUSULA 64. El trabajador que acredite incapacidad…»"
                        className={cn(
                            'mt-2 w-full rounded-xl border border-white/[0.10] bg-white/[0.03]',
                            'px-3 py-2 text-[12.5px] text-white/85 placeholder:text-white/25',
                            'outline-none focus:border-white/25',
                        )}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className={cn(
                            'inline-flex h-9 cursor-pointer items-center rounded-xl border',
                            'border-white/[0.12] bg-white/[0.04] px-3 text-[12px] text-white/70',
                            'hover:bg-white/[0.08]',
                        )}>
                            {fichero ? fichero.name.slice(0, 30) : 'Elegir documento…'}
                            <input type="file" className="hidden"
                                   accept=".pdf,.docx,.doc,.txt"
                                   onChange={(e) => setFichero(e.target.files?.[0] ?? null)} />
                        </label>
                        <button
                            onClick={() => onAportar(fichero, contexto)}
                            disabled={aportando || (!fichero && !contexto.trim())}
                            className={cn(
                                'inline-flex h-9 items-center rounded-xl px-3 text-[12px] font-semibold',
                                aportando || (!fichero && !contexto.trim())
                                    ? 'cursor-not-allowed border border-white/[0.08] text-white/30'
                                    : 'bg-amber-400/90 text-charcoal-900 hover:brightness-110',
                            )}
                        >
                            {aportando ? 'Leyendo…' : 'Aportar y volver a proponer'}
                        </button>
                        {!!contextoAportado && (
                            <span className="text-[11px] text-emerald-300/70">
                                {contextoAportado.toLocaleString('es-MX')} caracteres aportados
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ LO QUE SE VA A RESOLVER ═══
                David: «cuando le digo que resuelva en otro sentido no cambia la
                propuesta que marca en la parte inferior. Tengo que volver a
                generar. Si yo hago cambios en el taller, estos deben reflejarse
                sin necesidad de volver a generar nada. Marca o destaca esa
                última tabla porque es la que decidirá el proyecto.»

                Tenía razón y la causa era literal: este bloque pintaba
                `propuesta.propuestas` —el objeto CRUDO del motor, que no cambia
                nunca— mientras sus marcas viven en `problemas`. Enseñaba una
                foto vieja encima del botón de generar.

                Ahora se calcula en vivo con la MISMA precedencia que aplica el
                servidor en `modos_decision.repartir`: lo que él marcó, si no lo
                que el motor propuso para ESE problema, y sólo al final el
                sentido global. Y se dice de dónde viene cada uno. */}
            {/* SÓLO CUANDO TODO ESTÁ RESUELTO.
                David: «solo cuando llene todo eso —ya sea automáticamente o
                porque él ingrese texto— podrá ver el recuadro final con la
                manera en que se resolverá».
                Enseñarlo a medias invita a generar a medias. */}
            {todoDecidido && (
                <div className="mt-4 space-y-2 rounded-2xl border-2 border-accent-gold/40
                                bg-accent-gold/[0.06] p-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-gold">
                            Así se va a resolver
                        </p>
                        <span className="text-[10.5px] text-white/40">
                            esto es lo que decide el proyecto
                        </span>
                    </div>
                    {decision.map((d) => (
                        <div key={d.id} className="border-t border-white/[0.07] pt-2 first:border-0 first:pt-0">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className={cn(
                                    'text-[12px] font-semibold',
                                    d.de === 'tuyo' ? 'text-accent-gold' : 'text-white/85')}>
                                    {d.sentido ? d.sentido.replace(/_/g, ' ').toUpperCase() : 'SIN DECIDIR'}
                                </span>
                                <span className={cn(
                                    'rounded px-1.5 py-0.5 text-[10px]',
                                    d.de === 'tuyo'
                                        ? 'bg-accent-gold/20 text-accent-gold'
                                        : 'bg-white/[0.07] text-white/45')}>
                                    {d.de === 'tuyo' ? 'tu criterio'
                                        : d.de === 'motor' ? 'del motor'
                                        : d.de === 'global' ? 'del sentido global'
                                        : 'sin materia'}
                                </span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/55">
                                {d.pregunta}
                            </p>
                        </div>
                    ))}
                    {propuesta?.avisos?.map((a, i) => (
                        <p key={i} className="text-[11px] text-amber-300/70">{a}</p>
                    ))}
                </div>
            )}

            {decision.length > 0 && !todoDecidido && (
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                    <p className="text-[11px] uppercase tracking-wide text-white/35">
                        Falta por decidir
                    </p>
                    {decision.some((d) => !d.sentido) ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-white/50">
                            {decision.filter((d) => !d.sentido).length} de {decision.length}{' '}
                            planteamientos sin calificar. Cuando estén todos —cada uno con
                            su porqué— verás aquí cómo va a resolverse el asunto.
                        </p>
                    ) : (
                        <p className="mt-1 text-[12px] leading-relaxed text-white/50">
                            Están todos calificados, pero {sinPorque.length === 1
                                ? 'uno se quedó sin el porqué'
                                : `${sinPorque.length} se quedaron sin el porqué`}. Un
                            recuadro en blanco lo rellena la redacción por su cuenta, y
                            entonces el motivo no es el tuyo. Escríbelo o pídeselo al
                            motor volviendo a marcar la calificativa.
                        </p>
                    )}
                </div>
            )}

            <button
                onClick={onGenerar}
                disabled={!listo || generando}
                className={cn(
                    'mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl',
                    'text-[13px] font-semibold transition-all duration-200',
                    listo && !generando
                        ? 'bg-accent-gold text-charcoal-900 hover:brightness-110 active:scale-[0.99]'
                        : 'cursor-not-allowed border border-white/[0.08] bg-white/[0.03] text-white/30',
                )}
            >
                {proponiendo ? 'El motor está proponiendo…'
                  : generando ? 'Redactando la sentencia…'
                  : 'Generar la sentencia completa'}
                {!generando && !proponiendo && <ArrowRight className="h-4 w-4" />}
            </button>
            {!listo && (
                <p className="mt-2 text-center text-[11px] text-white/30">
                    Elige el sentido de al menos un problema, o pide la propuesta al motor.
                </p>
            )}
            {listo && !completo && (
                <p className="mt-2 text-center text-[11px] text-white/40">
                    Quedan {fuerza.total - fuerza.conSentido} problema
                    {fuerza.total - fuerza.conSentido === 1 ? '' : 's'} sin sentido:
                    se estudiarán igual, pero fijarlos alinea mejor la sentencia.
                </p>
            )}
        </Tarjeta>
    );
}
