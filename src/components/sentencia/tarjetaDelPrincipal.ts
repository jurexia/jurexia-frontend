import { useEffect, useState } from 'react';
import type { FilaEspejo, ProbabilidadDelSentido, PropuestaDeSolucion, RespuestaPropuesta, TesisDelAcervo } from './api';
import { conSentido, leerTarjeta } from './api';
import type {
    ApoyoDeLaVia, ConceptosOmitidos, FichaProcesal, FilaDeTuTribunal, PrincipalDeLaTarjeta, ProblemaJuridico, SuerteDelSecundario, TarjetaDecision,
    ViaDeLaTarjeta,
} from './tipos';
import { grupoDe, legible } from './calificaciones';
import { sentidoValido } from './recalificacion';

/* ═══════════════════════════════════════════════════════════════════════════
   LA LÓGICA DE LA TARJETA «EL PROBLEMA PRINCIPAL Y SU SOLUCIÓN», SIN PINTAR
   ═══════════════════════════════════════════════════════════════════════════
   (28-sep-2026, tras el AR 631/2025). Lo que decide qué dice la tarjeta vive
   aquí, sin JSX, para probarlo sin Next (comprobaciones/problema_principal.mjs):
   qué vía está en pantalla, si la contraria es de verdad contraria, qué suerte
   lleva cada secundario, cómo se rotula, y la tarjeta que la pantalla arma
   sola con la propuesta mientras la del servidor no llega.

   Lo medido que manda (lector2_potencia.md): el motor acierta el 50% contra
   los engroses de Kingston —la regla «siempre niega» da 54%— y sobre-concede;
   su «confianza alta» no predice acierto. Por eso aquí nada rotula una vía
   como recomendada si el servidor no dijo «claro», y la tarjeta local no dice
   ningún estado: no lo sabe. */

export type ViaActiva = 'propuesta' | 'contraria' | 'criterio';
export type LadoDeLaTarjeta = 'propuesta' | 'opuesta';

/** true = el recurso o la demanda prosperan; null = no se sabe (sin materia,
 *  innecesario, vacío). */
export function prosperaDe(sentido: string | undefined | null): boolean | null {
    const g = grupoDe(sentido);
    return g === 'si' ? true : g === 'no' ? false : null;
}

export function prosperaDeLaVia(v: ViaDeLaTarjeta | null | undefined): boolean | null {
    if (!v) return null;
    return v.prospera ?? prosperaDe(v.sentido);
}

/** LA VÍA CONTRARIA SÓLO SI DE VERDAD ES CONTRARIA. Un botón que promete la
 *  alternativa y entrega la misma solución es peor que no tenerlo (el criterio
 *  de SolucionDelAsunto, sin montar desde el 14-sep). La razón puede faltar:
 *  entonces se ofrece redactarla, con un clic. */
export function hayAlternativaReal(t: TarjetaDecision | null | undefined): boolean {
    const a = t?.vias.propuesta, b = t?.vias.opuesta;
    if (!a || !b || !b.sentido) return false;
    const pa = prosperaDeLaVia(a), pb = prosperaDeLaVia(b);
    if (pa !== null && pb !== null) return pa !== pb;
    return grupoDe(a.sentido) !== grupoDe(b.sentido);
}

/** Reñido o no alcanza: las dos columnas pesan igual y ninguna se rotula «te
 *  propongo»; son «vía A» y «vía B» (contrato_tarjeta.md).
 *
 *  SALVO QUE EL SERVIDOR RECOMIENDE (2-oct-2026, CONTRATO E). David: «el motor
 *  nunca se atreve a proponer (…) si hay un 50.01% de probabilidad hacia un
 *  lado sea esa la propuesta». Con la propuesta por probabilidad el servidor
 *  manda `recomendada: «propuesta»` siempre que haya sentido, y el estado
 *  queda como grado de certeza: «reñido» ya no borra la recomendación. Un
 *  servidor anterior sólo recomienda con «claro», así que sin la bandera esto
 *  dice lo mismo que antes. */
export function sinRecomendar(t: TarjetaDecision | null | undefined): boolean {
    if (t?.recomendada === 'propuesta') return false;
    return t?.estado === 'reñido' || t?.estado === 'no_alcanza';
}

/* ═══ LA PROBABILIDAD DEL LADO QUE SE PROPONE (2-oct-2026) ═══
   La tarjeta del servidor la manda en `probabilidad` (CONTRATO E); la
   propuesta, en `global.probabilidad` (CONTRATO A, con `p_prospera`). Se pinta
   como el porcentaje del LADO QUE GANA, y ése es siempre el mayor de los dos:
   la regla del 50.01% propone el lado con más probabilidad. Así da igual que
   `p` venga como la del lado o como la de que prospere. */
export function pctDelLado(p: number | null | undefined): number | null {
    if (p === null || p === undefined || !Number.isFinite(p)) return null;
    const f = p > 1 ? p / 100 : p;
    return Math.round(Math.max(f, 1 - f) * 100);
}

export interface ProbabilidadVisible {
    /** Entero, del lado que se propone; null = hay probabilidad sin número
     *  (sin tasa para este tipo: manda el motor). */
    pct: number | null;
    lado: 'prospera' | 'no_prospera' | '';
    explicacion: string;
    /** El motor leía el otro lado y la probabilidad lo volteó. */
    volteada: boolean;
    sentidoMotor: string;
}

/** La que se enseña: la de la tarjeta del servidor si la trae; si no, la de la
 *  propuesta. null = ninguna de las dos la manda (bandera apagada): entonces
 *  nada lleva porcentaje, como antes. */
export function probabilidadVisible(t: TarjetaDecision | null | undefined,
                                    g?: ProbabilidadDelSentido | null): ProbabilidadVisible | null {
    const pt = t?.probabilidad ?? null;
    if (!pt && !g) return null;
    const lado = pt?.lado || g?.lado || '';
    return {
        pct: pt ? pctDelLado(pt.p) : pctDelLado(g?.p_prospera),
        lado,
        explicacion: pt?.explicacion || g?.explicacion || '',
        volteada: !!g?.volteada,
        sentidoMotor: g?.sentido_motor || '',
    };
}

/** El porcentaje de UN sentido, con la probabilidad del lado que gana: el
 *  mismo si va del mismo lado, el complemento si va al contrario. null si no
 *  se sabe de qué lado es (sin materia, innecesario) o no hay número. */
export function pctDelSentido(pv: ProbabilidadVisible | null | undefined, sentido: string | undefined | null): number | null {
    if (!pv || pv.pct === null || !pv.lado) return null;
    const pr = prosperaDe(sentido);
    if (pr === null) return null;
    return pr === (pv.lado === 'prospera') ? pv.pct : 100 - pv.pct;
}

/** «El motor leía conceder; el examen de las dos vías se inclina por negar: 68 %».
 *  Vacío si no hubo volteo. En el amparo directo se dice conceder/negar; en
 *  un recurso, que prospere o no. */
export function fraseDelVolteo(pv: ProbabilidadVisible | null | undefined, esRecurso: boolean): string {
    if (!pv?.volteada || !pv.lado) return '';
    const prospera = pv.lado === 'prospera';
    const verbo = (si: boolean) => (esRecurso ? (si ? 'que el recurso prospere' : 'que no prospere') : (si ? 'conceder' : 'negar'));
    const motor = pv.sentidoMotor ? prosperaDe(pv.sentidoMotor) : !prospera;
    const leia = motor === null ? `«${legible(pv.sentidoMotor).toLowerCase()}»` : verbo(motor);
    return `El motor leía ${leia}; el examen de las dos vías se inclina por ${verbo(prospera)}`
        + (pv.pct !== null ? `: ${pv.pct} %` : '') + '.';
}

/** ¿De qué vía es esta calificación del principal? Por grupo: «inoperante» es
 *  de la vía que no prospera aunque el motor escribiera «infundado». */
export function ladoDelSentido(t: TarjetaDecision | null | undefined, sentido: string | undefined | null): LadoDeLaTarjeta | null {
    if (!t || !sentido) return null;
    const g = grupoDe(sentido), pr = prosperaDe(sentido);
    const casa = (v: ViaDeLaTarjeta | null) => !!v && (
        (g !== '' && grupoDe(v.sentido) === g) || (pr !== null && prosperaDeLaVia(v) === pr));
    if (casa(t.vias.propuesta)) return 'propuesta';
    if (hayAlternativaReal(t) && casa(t.vias.opuesta)) return 'opuesta';
    return null;
}

/** ═══ QUÉ VÍA ESTÁ EN PANTALLA, sin estado nuevo ═══
 *  (lector2_visor.md §B.4) Se deduce de lo que viajaría al generar:
 *   · la propuesta = todo el asunto, NO dictado (eco del motor) y el sentido
 *     del motor, SI la columna «propuesta» es la del motor; o esa columna
 *     dictada con SU sentido y SU razón;
 *   · la contraria = dictado, el sentido de la opuesta y SU razón (lección 1
 *     del 631: la razón de la otra vía nunca viaja con ésta). Si la opuesta no
 *     traía razón y él pidió redactarla tras elegirla, sigue siendo la
 *     contraria;
 *   · lo demás —por problema, otra calificación, otra razón, o algún
 *     planteamiento marcado a mano— es su criterio.
 *
 *  CON LA DELIBERACIÓN (revisión del 28-sep-2026, AR 631/2025) la columna
 *  «propuesta» es la vía del juez —en reñido, la de su `inclinacion`— y puede
 *  ser la CONTRARIA a la del motor, o la misma calificación con otra razón.
 *  Antes, el eco del motor contaba como «la propuesta» sin mirar la columna:
 *  el principal viajaba «infundado» mientras los secundarios y «Así va a
 *  salir» se pintaban con la suerte de la vía fundada, y el botón decía
 *  «Aceptar» de lo que no se enseñaba. Ahora el eco del motor sólo es «la
 *  propuesta» si la columna dice lo mismo (sentido y, con deliberación,
 *  razón); si no, se clasifica por la vía con la que casa. */
export function viaActivaDe(e: {
    enGlobal: boolean; globalDictado: boolean; sentidoGlobal: string; razonGlobal: string;
    sentidoMotor: string; nTocados: number; tarjeta: TarjetaDecision | null;
    elegida: ViaActiva | null;
}): ViaActiva {
    if (!e.enGlobal || e.nTocados > 0 || !e.sentidoGlobal) return 'criterio';
    const razon = (e.razonGlobal || '').trim();
    const vp = e.tarjeta?.vias.propuesta;
    const vo = e.tarjeta?.vias.opuesta;
    const delJuez = propuestaDelJuez(e.tarjeta);
    if (!e.globalDictado && mismoSentido(e.sentidoGlobal, e.sentidoMotor)) {
        if (!vp?.sentido || (mismoSentido(vp.sentido, e.sentidoMotor)
                             && (!delJuez || razon === vp.razon.trim()))) return 'propuesta';
        return ladoDelSentido(e.tarjeta, e.sentidoGlobal) === 'opuesta' ? 'contraria' : 'criterio';
    }
    /* La columna «propuesta» dictada con SU razón. Sin deliberación, dictar la
       misma calificación que el motor es su criterio (pulsó la pastilla); con
       ella, es «Resolver así» (ver `resolverAsi` en Decision). */
    if (e.globalDictado && vp && mismoSentido(vp.sentido, e.sentidoGlobal) && razon === vp.razon.trim()
        && (delJuez || !mismoSentido(vp.sentido, e.sentidoMotor))) return 'propuesta';
    if (e.globalDictado && vo && hayAlternativaReal(e.tarjeta) && e.sentidoGlobal === vo.sentido
        && (razon === vo.razon.trim() || (e.elegida === 'contraria' && !vo.razon.trim()))) return 'contraria';
    return 'criterio';
}

function mismoSentido(a: string | undefined | null, b: string | undefined | null): boolean {
    return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

/** ¿La columna «propuesta» es la del juez de la deliberación? El servidor
 *  sólo manda `deliberacion` cuando armó las vías con ella
 *  (tarjeta_decision.py, `delib_ctx`); sin ella, la columna es la global del
 *  motor, con su razón. */
export function propuestaDelJuez(t: TarjetaDecision | null | undefined): boolean {
    return !!t?.deliberacion && !!t.vias.propuesta?.sentido;
}

/** «RESOLVER ASÍ»: ¿se vuelve al eco del motor o se dicta la columna? Se
 *  dicta —sentido y razón— si la columna no es la propuesta del motor: otra
 *  calificación, o (con la deliberación) la misma con otra razón. En el 631
 *  con el juez encendido: vía A «fundado» por causahabiencia y el motor
 *  «fundado» por cosa juzgada; volver al eco hacía viajar la razón que la
 *  tarjeta no enseñaba. */
export function resolverAsiDicta(t: TarjetaDecision | null | undefined,
                                 motor: { sentido?: string; razon?: string } | null | undefined): boolean {
    const vp = t?.vias.propuesta;
    if (!vp?.sentido) return false;
    if (!mismoSentido(vp.sentido, motor?.sentido)) return true;
    return propuestaDelJuez(t) && vp.razon.trim() !== (motor?.razon || '').trim();
}

/** El secundario de la tarjeta que corresponde al problema `numero` (1-based,
 *  el de la fase 3). Por número primero; por la pregunta si el número no casa. */
export function secundarioDe(t: TarjetaDecision, numero: number, pregunta?: string) {
    return t.secundarios.find((s) => s.numero === numero)
        ?? (pregunta ? t.secundarios.find((s) => !!s.pregunta && s.pregunta === pregunta) : undefined)
        ?? null;
}

/** LA SUERTE DE UN PROBLEMA EN UNA VÍA. Un independiente lleva la suya propia
 *  en las dos. */
export function suerteDe(t: TarjetaDecision | null | undefined, numero: number, pregunta: string,
                         lado: LadoDeLaTarjeta | null): SuerteDelSecundario | null {
    if (!t) return null;
    const ind = t.independientes.find((x) => x.numero === numero)
        ?? t.independientes.find((x) => !!x.pregunta && x.pregunta === pregunta);
    if (ind?.propuesta) {
        return { sentido: ind.propuesta.sentido, de: 'motor', por_que: ind.propuesta.razon,
                 relacion: 'distinto', guarda: null, recalificar: false, previsto: false };
    }
    if (!lado) return null;
    const s = secundarioDe(t, numero, pregunta);
    if (!s) return null;
    return lado === 'opuesta' ? s.en_opuesta : s.en_propuesta;
}

/** ═══ CÓMO SE DICE LA SUERTE DE UN SECUNDARIO ═══
 *  Con los campos del árbol (de, relacion, guarda), no con la palabra sola:
 *  «innecesario» no dice si lo absorbió el principal o si sobraba por
 *  suficiencia, y la guarda procesal de los arts. 74-V, 174 y 189 cambia lo
 *  que se estudia. `texto` va en la fila de la tarjeta; `corto`, en la tarjeta
 *  final junto a la calificación. */
export function rotuloDeSuerte(s: SuerteDelSecundario | null | undefined, prosperaPrincipal: boolean | null): {
    texto: string; corto: string; tono: 'neutro' | 'oro' | 'ambar';
} {
    if (!s) return { texto: 'Sin suerte prevista', corto: '', tono: 'ambar' };
    const sent = (s.sentido || '').toLowerCase();
    const rel = (s.relacion || '').toLowerCase();
    const guarda = (s.guarda || '').toLowerCase();
    const cal = sent && sent !== 'innecesario' ? ` · ${legible(sent).toLowerCase()}` : '';
    if (guarda === 'mayor_beneficio_189') {
        return { texto: 'Innecesaria por mayor beneficio (art. 189)', corto: 'art. 189', tono: 'neutro' };
    }
    if (guarda === 'procesal') return { texto: `Violación procesal: se decide${cal}`, corto: 'se decide: procesal', tono: 'oro' };
    if (rel === 'distinto') {
        return { texto: `Se estudia aparte: tema distinto${cal}`, corto: 'se estudia aparte', tono: 'oro' };
    }
    if (rel === 'mayor_beneficio' || guarda === 'mayor_beneficio') {
        return { texto: `Pide más que el principal: se estudia${cal}`, corto: 'se estudia', tono: 'oro' };
    }
    if (s.recalificar && !s.previsto && !sent) {
        return { texto: 'Por recalificar con la premisa de esta vía', corto: 'por recalificar', tono: 'ambar' };
    }
    /* «autonoma» y «mixta» NO son «tema distinto» (revisión del 28-sep-2026):
       en el árbol (arbol_decision.py, `detalle[t]`) son lo contrario —LIGADO
       al principal, pero con causa de pedir propia— y se estudian con su
       calificación. En la 462 el problema 2 (exhaustividad sobre la misma
       sustitución) salía «Se estudia aparte: tema distinto» con el porqué del
       servidor diciendo «se relaciona con el principal» justo debajo. */
    const ligado = rel === 'autonoma' || rel === 'mixta';
    if (sent === 'innecesario' || sent === 'sin_materia') {
        return prosperaPrincipal === true && !ligado
            ? { texto: 'Queda sin materia: lo absorbe el principal', corto: 'sigue al principal', tono: 'neutro' }
            : { texto: 'Innecesario por suficiencia', corto: 'innecesario', tono: 'neutro' };
    }
    if (ligado) {
        return { texto: `Ligado al principal, con causa propia: se estudia${cal}`, corto: 'se estudia', tono: 'oro' };
    }
    if (rel === 'presupone' && prosperaPrincipal === false && sent) {
        return { texto: `Cae con lo desestimado${cal}`, corto: 'cae con el principal', tono: 'neutro' };
    }
    if (sent) {
        const l = legible(sent);
        return { texto: l.charAt(0).toUpperCase() + l.slice(1),
                 corto: s.de === 'motor' ? 'del motor' : 'sigue al principal', tono: 'neutro' };
    }
    return { texto: 'Sin determinar', corto: 'sin determinar', tono: 'ambar' };
}

/** Lo que pesa el criterio para ESTE tribunal, dicho como lo dice el servidor.
 *  Sin fuerza (la tarjeta local) no se dice nada: el «obligatoria» del acervo
 *  rotula así a jurisprudencias de colegiados que a otro colegiado no le
 *  obligan (art. 217, párr. tercero, LA). */
export function textoDeFuerza(a: ApoyoDeLaVia): string {
    if (a.fuerza_texto) return a.fuerza_texto;
    switch (a.fuerza) {
        case 'obliga': return 'obliga';
        case 'orienta': return 'orienta';
        case 'pleno_circuito': return 'Pleno de Circuito';
        case 'precedente_propio': return 'precedente propio';
        default: return '';
    }
}

const RX_VIGENCIA_DUDOSA = /abandon|sustitu|interrump|superad|no vigente/i;
export function vigenciaDudosa(v: string | null | undefined): boolean {
    return !!v && RX_VIGENCIA_DUDOSA.test(v);
}

/** «LO APLICARÍA CON»: sólo lo verificado en el acervo y vigente. El servidor
 *  ya lo filtra (una tesis abandonada no entra en «te propongo aplicar»); aquí
 *  se vuelve a mirar por si una tarjeta vieja lo trae, y se cuenta lo que se
 *  quedó fuera para decirlo. */
export function apoyosParaCitar(v: ViaDeLaTarjeta | null | undefined): { citables: ApoyoDeLaVia[]; fuera: number } {
    const todos = v?.apoyos ?? [];
    const citables = todos.filter((a) => (!!a.norma && !a.registro)
        || (!!a.registro && a.en_acervo && !vigenciaDudosa(a.vigencia)));
    return { citables, fuera: todos.length - citables.length };
}

/** LA VÍA QUE REVOCA, para el aviso de los conceptos que el juez no estudió
 *  (art. 93, fr. VI, LA): la que lo dice en su desenlace o, en un recurso, la
 *  que prospera. */
export function ladoQueRevoca(t: TarjetaDecision | null | undefined, esRecurso: boolean): LadoDeLaTarjeta | null {
    if (!t) return null;
    const lados: [LadoDeLaTarjeta, ViaDeLaTarjeta | null][] = [['propuesta', t.vias.propuesta], ['opuesta', t.vias.opuesta]];
    for (const [lado, v] of lados) {
        if (v && v.desenlace.some((d) => /\brevoca\b/i.test(d) && !/\bno se revoca\b/i.test(d))) return lado;
    }
    if (!esRecurso) return null;
    for (const [lado, v] of lados) if (v && prosperaDeLaVia(v) === true) return lado;
    return null;
}

/** ═══ LOS CONCEPTOS DE VIOLACIÓN, POR LO QUE VIAJA (SPEC B §1) ═══
 *  (revisión del 28-sep-2026, AR 631/2025) La pantalla bloqueaba «Generar» y
 *  el plan sólo con `necesitaConceptos`, que el servidor calcula con el
 *  sentido DEL MOTOR. En el 631 el motor propuso «infundado» (no hacían
 *  falta), el secretario resolvió en sentido opuesto —revoca una concesión—
 *  y se generaba y se pagaba un proyecto con el resolutivo del amparo en
 *  hueco, y el plan gastaba una corrida sin conceptos y otra al pegarlos.
 *  Ahora se mira `conceptos_omitidos` (calculado para la vía que prospera) y
 *  si LO QUE VIAJA prospera —el mismo predicado que el servidor al generar
 *  (redactor_adelanto: «fundado» si algún criterio prospera)—.
 *
 *  `co`: el de /taller/proponer (undefined = un servidor que no lo manda; null
 *  = si prospera, no hay nada que estudiar) o, si falta, el de la tarjeta.
 *  Devuelve `pueden` (la pantalla ofrece dónde pegarlos: alguna vía que
 *  prospera los necesita y no constan) y `faltan` (lo que viaja prospera, no
 *  constan y el cuadro está vacío: no se genera ni se pide el plan). */
export function conceptosQueFaltan(e: {
    co: ConceptosOmitidos | null | undefined;
    necesitaMotor: boolean;
    sentidosQueViajan: (string | undefined | null)[];
    conceptos: string;
}): { pueden: boolean; faltan: boolean; reasuncion: string } {
    const pegados = !!(e.conceptos || '').trim();
    if (!e.co) {
        /* Un servidor sin el contrato de B (undefined), o que dice que si
           prospera no hay nada que estudiar (null): lo que diga el motor, como
           antes. Con el contrato los dos datos casan: `necesita_conceptos`
           sólo es verdadero si la del motor prospera y faltan. */
        return { pueden: e.necesitaMotor, faltan: e.necesitaMotor && !pegados, reasuncion: 'sobreseimiento' };
    }
    /* Con el contrato, `necesitaMotor` no cuenta: si él resuelve por la vía
       que NO prospera, pedirle los conceptos que sólo necesita la otra
       bloquearía «Generar» sin motivo. */
    const pueden = e.co.hacen_falta && !e.co.tenemos;
    const prospera = e.sentidosQueViajan.some((x) => prosperaDe(x) === true);
    return { pueden, faltan: pueden && prospera && !pegados, reasuncion: e.co.reasuncion || 'sobreseimiento' };
}

/** EL PROPIO TRIBUNAL, POR VÍA. Una fila va a la columna cuya calificación
 *  casa con la suya (la de la OAJ: la de UN planteamiento, no la del
 *  resolutivo); la que no trae calificación legible va aparte, debajo de las
 *  dos. No se cuentan: se leen. */
export function tribunalPorLado(t: TarjetaDecision | null | undefined): Record<LadoDeLaTarjeta | 'sin_lado', FilaDeTuTribunal[]> {
    const r: Record<LadoDeLaTarjeta | 'sin_lado', FilaDeTuTribunal[]> = { propuesta: [], opuesta: [], sin_lado: [] };
    for (const f of t?.tu_tribunal ?? []) {
        // UN «POSIBLE» NO VA BAJO NINGUNA VÍA (29-sep-2026): del 50 al 84% no
        // es el mismo problema, y ponerlo en la columna de una vía lo lee como
        // respaldo de esa vía. Tampoco la que coincidió por el TEMA del asunto:
        // no trae calificación de un planteamiento, sólo el resolutivo entero.
        const aparte = f.nivel === 'posible' || f.fuente === 'tema';
        const lado = !aparte && f.calificacion ? ladoDelSentido(t, f.calificacion) : null;
        r[lado ?? 'sin_lado'].push(f);
    }
    return r;
}

/** La fila de la tarjeta en la forma de la fila del espejo, para pintarla con
 *  la MISMA FilaDelEspejo que «Su propio tribunal». La similitud viaja en
 *  fracción y la fila la pinta en por ciento entero (ya venía redondeada hacia
 *  abajo en el servidor: aquí sólo se deshace la división). */
export function comoFilaDelEspejo(f: FilaDeTuTribunal): FilaEspejo {
    const pct = f.similitud == null ? undefined : Math.round(f.similitud <= 1 ? f.similitud * 100 : f.similitud);
    const neun = /^\d+$/.test(f.neun || '') ? Number(f.neun) : undefined;
    return {
        tipo_asunto: f.tipo_asunto, expediente: f.expediente, fecha: f.fecha, sentido: f.sentido,
        tema: f.tema, score: 0, pdf_url: f.pdf_url,
        ...(pct != null ? { similitud: pct, cota_inferior: f.cota_inferior } : {}),
        ...(f.fuente === 'planteamiento' || f.fuente === 'tema' ? { fuente: f.fuente } : {}),
        ...(f.nivel === 'posible' || f.nivel === 'mismo_problema' ? { nivel: f.nivel } : {}),
        ...(f.pregunta ? { pregunta: f.pregunta } : {}),
        ...(f.razon ? { razon: f.razon } : {}),
        ...(f.calificacion ? { calificacion: legible(f.calificacion).toLowerCase() } : {}),
        ...(f.autoridad ? { autoridad: f.autoridad } : {}),
        ...(neun != null ? { neun } : {}),
        ...(f.enlace_oaj ? { enlace_oaj: f.enlace_oaj } : {}),
    };
}

/** Qué dice el contraste del principal a cada vía. El agravio que no combate
 *  la razón toral, o el fallo que se sostiene por otra, sostienen la vía que
 *  no prospera; si la combate y el fallo no se sostiene por otra, el contraste
 *  no descarta ninguna: se decide en el fondo. */
export function contrasteParaVia(
    con: { la_combate: boolean; sobrevive: boolean } | null | undefined,
    prospera: boolean | null, esRecurso: boolean,
): { tono: 'a_favor' | 'en_contra' | 'neutro'; texto: string } | null {
    if (!con || prospera === null) return null;
    const quien = esRecurso ? 'el agravio' : 'el concepto';
    const motivo = !con.la_combate ? `${quien} no combate la razón toral` : 'el fallo se sostiene por otra razón';
    if (!con.la_combate || con.sobrevive) {
        return prospera
            ? { tono: 'en_contra', texto: `El contraste va en contra: ${motivo}.` }
            : { tono: 'a_favor', texto: `El contraste la sostiene: ${motivo}.` };
    }
    return { tono: 'neutro', texto: `El contraste no la descarta: ${quien} combate la razón toral y el fallo no se sostiene por otra; se decide en el fondo.` };
}

/* ═══ LA TARJETA LOCAL: LA QUE ARMA LA PANTALLA CON LA PROPUESTA ═══
   Mientras la del servidor no llega —o si el servidor todavía no la sirve—,
   la pantalla no se queda sin decir qué propone el motor: arma la tarjeta con
   lo que ya tiene (la propuesta global, su alternativa, el contraste y la
   lista de comprobación). Sin estado —no lo sabe—, sin la fuerza de los
   apoyos —el «obligatoria» del acervo no sirve para un colegiado— y con la
   suerte de los secundarios como la previó el motor («previsto»): el árbol no
   la verificó. Un registro que no está en el material no se pinta como cita
   (las tesis de internet entran al material del servidor durante la
   propuesta; ésas sólo las trae la tarjeta del servidor). */
const RX_REGISTRO = /\b(\d{6,8})\b/;

function _hidratar(regs: string[] | undefined, tesis: TesisDelAcervo[]): ApoyoDeLaVia[] {
    const vistos = new Set<string>();
    const out: ApoyoDeLaVia[] = [];
    for (const r of regs ?? []) {
        const t = String(r ?? '').trim();
        if (!t) continue;
        const m = RX_REGISTRO.exec(t);
        if (m) {
            const ts = tesis.find((x) => x.registro === m[1]);
            if (!ts || vistos.has(ts.registro)) continue;
            vistos.add(ts.registro);
            out.push({ registro: ts.registro, rubro: ts.rubro, instancia: ts.instancia, tipo: '', fuerza: '',
                       fuerza_texto: '', vigencia: null, de_internet: false, en_acervo: true, norma: null });
        } else if (!vistos.has(t)) {
            vistos.add(t);
            out.push({ registro: '', rubro: '', instancia: '', tipo: '', fuerza: '', fuerza_texto: '',
                       vigencia: null, de_internet: false, en_acervo: false, norma: t });
        }
    }
    return out;
}

function _via(sentido: string, razon: string, efecto: string, apoyos: string[] | undefined,
              tesis: TesisDelAcervo[], protectora?: { sentido: string; posible: boolean; norma: string; lectura: string; limite: string } | null,
): ViaDeLaTarjeta {
    const s = (sentido || '').toLowerCase();
    return {
        sentido: s, prospera: prosperaDe(s), razon: razon || '', efecto: efecto || '',
        desenlace: [], desenlace_nota: null, interpretacion: null, cadena: null, objecion: null,
        apoyos: _hidratar(apoyos, tesis),
        // La vía protectora cae del lado cuyo grupo coincide (como la
        // enseñaba «El porqué»): del otro lado no se invocan.
        via_protectora: protectora?.sentido && grupoDe(protectora.sentido) === grupoDe(s)
            ? { ...protectora } : null,
    };
}

export function tarjetaDeLaPropuesta(
    propuesta: RespuestaPropuesta,
    problemas: Pick<ProblemaJuridico, 'id' | 'pregunta' | 'jerarquia' | 'prediccion'>[],
    tesis: TesisDelAcervo[] = [],
): TarjetaDecision {
    const iP = Math.max(0, problemas.findIndex((p) => (p.jerarquia ?? '') === 'principal'));
    const pral = problemas[iP];
    const g = propuesta.global ?? null;
    const con = (propuesta.contraste ?? []).find((c) => c.numero === iP + 1) ?? null;
    let vp: ViaDeLaTarjeta | null = null;
    let vo: ViaDeLaTarjeta | null = null;
    if (g) {
        vp = _via(g.sentido, g.razon, g.efecto, g.apoyos, tesis, g.via_protectora);
        if (g.alternativa?.sentido) {
            vo = _via(g.alternativa.sentido, g.alternativa.razon, g.alternativa.efecto,
                      g.alternativa.apoyos, tesis, g.via_protectora);
        }
    } else {
        const pp = propuesta.propuestas?.[iP];
        // El sentido va aunque `alcanza` venga falso (2-oct-2026), sólo con el
        // formato 3; con el 2, como ayer (3-oct-2026): ver `conSentido`.
        if (conSentido(pp, propuesta.formato)) vp = _via(pp!.sentido, pp!.razon, '', pp!.apoyos, tesis);
    }
    const prP = prosperaDeLaVia(vp), prO = prosperaDeLaVia(vo);
    const delMotor = (x: PropuestaDeSolucion | undefined, relacion: string): SuerteDelSecundario | null =>
        x?.sentido ? { sentido: x.sentido.toLowerCase(), de: 'motor', por_que: x.razon || '', relacion,
                       guarda: null, recalificar: false, previsto: !!g } : null;
    const secundarios = problemas.map((p, i) => {
        if (i === iP) return null;
        const numero = i + 1;
        const c = g?.checklist?.find((x) => x.numero === numero);
        const relacion = c?.tema_distinto ? 'distinto' : (c?.relacion ?? '');
        /* LA LISTA DEL MOTOR, POR VÍA: `si_prospera` / `si_no_prospera` según
           prospere el principal en esa vía; si no las trae (una propuesta
           anterior), el texto libre de la lista, sin calificación. */
        const deLista = (pr: boolean | null, texto: string): SuerteDelSecundario | null => {
            if (!c) return null;
            const x = pr === true ? c.si_prospera : pr === false ? c.si_no_prospera : undefined;
            if (x?.sentido) {
                return { sentido: x.sentido.toLowerCase(), de: 'motor', por_que: x.razon || '', relacion,
                         guarda: null, recalificar: false, previsto: true };
            }
            return texto ? { sentido: '', de: 'motor', por_que: texto, relacion, guarda: null,
                             recalificar: false, previsto: true } : null;
        };
        return {
            numero, pregunta: p.pregunta, clase: '', relacion,
            en_propuesta: deLista(prP, c?.con_propuesta ?? '') ?? delMotor(propuesta.propuestas?.[i], relacion),
            en_opuesta: vo ? deLista(prO, c?.con_alternativa ?? '') : null,
        };
    }).filter((s): s is NonNullable<typeof s> => !!s);
    return {
        formato: 1,
        estado_calculo: vp ? 'listo' : 'sin_propuesta',
        huella: '',
        principal: pral ? {
            numero: iP + 1, pregunta: pral.pregunta, pregunta_recurrida: '', figura: '', clase: '',
            jerarquia_de: (pral.jerarquia ?? '') === 'principal' ? 'fase3' : 'por_omision',
            por_que_principal: g?.contexto?.tema_principal ?? '',
            discrepa_motor: null,
            contraste: con ? { razon_toral: con.razon_toral, la_combate: con.la_combate,
                               sobrevive: con.sobrevive, veredicto_previo: con.veredicto_previo } : null,
            prediccion: pral.prediccion?.frase ? { frase: pral.prediccion.frase, n: pral.prediccion.n } : null,
        } : null,
        vias: { propuesta: vp, opuesta: vo },
        /* Con la probabilidad del sentido (CONTRATO A) la propuesta se
           recomienda también en la tarjeta local; sin ella, como antes: la
           local no recomienda nada. */
        recomendada: vp && g?.probabilidad ? 'propuesta' : null,
        estado: '',
        estado_por_que: [],
        secundarios,
        independientes: [],
        que_la_cambiaria: g ? {
            en_contra: g.en_contra || '',
            crux: null,
            // Con preguntas (2-oct-2026) las constancias ya no se piden: las
            // sustituyen las preguntas, que van arriba de la tarjeta.
            constancias_indispensables: propuesta.preguntas?.length ? []
                : (g.constancias ?? []).filter((c) => c.indispensable).map((c) => c.que),
            limite_protector: g.via_protectora?.limite || null,
        } : null,
        tu_tribunal: [],
        linea_corte: { confirmadas: [], pistas: [] },
        deliberacion: null,
        // El de /taller/proponer ya viene calculado para la vía que prospera.
        conceptos_omitidos: propuesta.conceptosOmitidos ?? null,
        // La ficha la arma el servidor por código; la pantalla no la adivina.
        ficha: null,
        deliberacion_estado: '',
        avisos: [],
        probabilidad: null,
        origen: 'local',
    };
}

/* ── LA PREGUNTA DECISIVA Y LA FICHA (SPEC E3 y E2, AR 631/2025) ─────────── */

const _comparable = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:«»"'()]/g, ' ').replace(/\s+/g, ' ').trim();

/** «Así lo planteó la recurrida», sólo si dice OTRA cosa que la pregunta que
 *  decide: en el 631 la recurrida preguntó por la cosa juzgada y lo que decide
 *  es si el adquirente puede sustituirse a la actora en la ejecución; si el
 *  servidor manda las dos iguales, repetirla sería ruido. */
export function preguntaRecurridaAparte(p: PrincipalDeLaTarjeta | null | undefined): string {
    const r = (p?.pregunta_recurrida ?? '').trim();
    if (!r) return '';
    return _comparable(r) === _comparable(p?.pregunta ?? '') ? '' : r;
}

/** La línea «Lo que decide» de la deliberación sobra cuando ya es el
 *  encabezado de la tarjeta (la E3 pone la decisiva en `principal.pregunta`). */
export function decisivaYaEsElPrincipal(p: PrincipalDeLaTarjeta | null | undefined, decisiva: string | null | undefined): boolean {
    return !!p && !!(decisiva ?? '').trim() && _comparable(decisiva ?? '') === _comparable(p.pregunta);
}

const _SENTIDO_DE_LA_RECURRIDA: Record<string, string> = {
    sobresee: 'sobresee', sobreseimiento: 'sobresee', sobreseyo: 'sobresee', 'sobreseyó': 'sobresee',
    concede: 'concede', concedio: 'concede', 'concedió': 'concede', concesion: 'concede', 'concesión': 'concede',
    niega: 'niega', nego: 'niega', 'negó': 'niega', negativa: 'niega',
};

/** LA FICHA PROCESAL EN UNA LÍNEA: rótulo y texto por segmento, en el orden en
 *  que se lee un asunto (quién pide amparo, contra quién y qué, quién más es
 *  parte, qué resolvió el a quo, quién recurre y qué se revisa). Sólo lo que
 *  consta: un segmento vacío no se pinta. En el 631 la línea dice de un vistazo
 *  que recurre la tercera interesada contra la concesión, y que el
 *  sobreseimiento del otro acto no es materia de la revisión. */
export function lineaDeLaFicha(f: FichaProcesal | null | undefined): { rotulo: string; texto: string }[] {
    if (!f) return [];
    const out: { rotulo: string; texto: string }[] = [];
    const pl = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
    if (f.quejosa) out.push({ rotulo: 'Quejosa', texto: f.quejosa });
    if (f.responsables.length) {
        out.push({
            rotulo: pl(f.responsables.length, 'Responsable', 'Responsables'),
            texto: f.responsables.map((r) => (r.autoridad && r.acto ? `${r.autoridad} (${r.acto})`
                : r.autoridad || r.acto)).join('; '),
        });
    }
    if (f.terceros.length) out.push({ rotulo: pl(f.terceros.length, 'Tercero', 'Terceros'), texto: f.terceros.join(', ') });
    if (f.recurrida) {
        const res = f.recurrida.resolvio.map((r) => {
            const s = _SENTIDO_DE_LA_RECURRIDA[r.sentido.toLowerCase()] ?? r.sentido;
            return s && r.acto ? `${s} (${r.acto})` : s || r.acto;
        }).filter(Boolean).join('; ');
        const texto = [f.recurrida.organo, res].filter(Boolean).join(': ');
        if (texto) out.push({ rotulo: 'Recurrida', texto });
    }
    if (f.recurrente) {
        const texto = [f.recurrente.quien, f.recurrente.caracter].filter(Boolean).join(', ');
        if (texto) out.push({ rotulo: 'Recurre', texto });
    }
    // En el amparo directo no hay revisión: la materia es la del juicio.
    if (f.materia) out.push({ rotulo: f.tipo.includes('directo') ? 'Materia' : 'Materia de la revisión', texto: f.materia });
    // LO FIRME CON SU PROPIO RÓTULO y LA FRACCIÓN QUE RIGE (revisión
    // adversarial de la fase E, AR 631/2025): el sobreseimiento del otro acto
    // salía bajo «Materia de la revisión», y nada decía «art. 93, fr. VI» ni
    // que, si prospera, se reasume jurisdicción.
    if (f.firme) out.push({ rotulo: 'Firme', texto: f.firme });
    if (f.art_93 && (f.art_93.fraccion || f.art_93.si_prospera)) {
        const partes = [f.art_93.fraccion ? `fr. ${f.art_93.fraccion}` : '',
                        f.art_93.si_prospera ? `si prospera: ${f.art_93.si_prospera.split(';').slice(0, 2).join(';').trim()}` : '']
            .filter(Boolean);
        out.push({ rotulo: 'Art. 93', texto: partes.join(' · ') });
    }
    return out;
}

/** La del servidor manda si está lista y trae la vía propuesta (o si la local
 *  tampoco la tiene); si no, la local. */
export function elegirTarjeta(servidor: TarjetaDecision | null | undefined,
                              local: TarjetaDecision | null): TarjetaDecision | null {
    if (servidor && servidor.estado_calculo === 'listo' && (servidor.vias.propuesta || !local?.vias.propuesta)) {
        return servidor;
    }
    return local;
}

/** ═══ «RESOLVER ASÍ» DEJA LA MESA COMO LA PUSO EL MOTOR ═══
 *  (SPEC_C §4, 28-sep-2026) Volver a una vía es volver a su paquete completo:
 *  el principal y la suerte que el árbol da a los secundarios. Lo que él marcó
 *  a mano en la ventana —y lo que el reparto movió por esas marcas— se suelta:
 *  cada problema vuelve a la calificación que le propuso el motor, o a
 *  ninguna. Lo que ÉL escribió no se destruye nunca: su texto se queda. */
export function soltarLoTocado(problemas: ProblemaJuridico[], propuestas: PropuestaDeSolucion[],
                               /** El de la respuesta (3-oct-2026): con el 2, sólo lo que «alcanza». */
                               formato?: number | null): ProblemaJuridico[] {
    return problemas.map((q, i) => {
        const s = propuestas[i];
        const valido = sentidoValido(s?.sentido);
        const texto = (q.criterio || '').trim();
        const suya = !!texto && !!q.razonDe && !q.razonDe.delMotor;
        if (s && conSentido(s, formato) && valido && valido !== 'innecesario') {
            const mismaRazon = q.razonDe?.sentido === valido && !!texto;
            return { ...q, sentido: valido,
                     criterio: suya || mismaRazon ? q.criterio : (s.razon || ''),
                     razonDe: suya || mismaRazon ? q.razonDe : { sentido: valido, delMotor: true },
                     de: 'motor', porQue: '' };
        }
        return { ...q, sentido: undefined, criterio: suya ? q.criterio : '',
                 razonDe: suya ? q.razonDe : undefined, de: undefined, porQue: '' };
    });
}

/* ═══ LA TARJETA DEL SERVIDOR, PEDIDA AL LLEGAR LA PROPUESTA ═══
   Se pide una vez por propuesta (cada propuesta nueva es otro objeto: tras
   aportar, corregir un problema o volver a estudiar). Si el servidor dice
   «calculando», se vuelve a preguntar unas pocas veces; lo que llega de una
   propuesta anterior no se pinta. Un fallo no es un error del asunto: la
   pantalla sigue con la tarjeta local. No llama a ningún modelo.

   Y SI LA DELIBERACIÓN VIENE EN CAMINO (revisión del 28-sep-2026): el juez
   se lanza en segundo plano DESPUÉS de la propuesta y tarda minutos; la
   tarjeta llegaba «lista» sin él y la pantalla no volvía a preguntar, así
   que sus vías, el crux y el estado no se veían hasta otra propuesta o una
   recarga. Con `deliberacion_estado: «en_curso»` se pinta lo que hay y se
   sigue preguntando con pausa larga y tope. (Un servidor que no manda el
   campo no hace preguntar de más.) Si llega después de que él eligiera, las
   columnas pueden cambiar bajo su vía: `viaActivaDe` clasifica por lo que
   VIAJA, así que el chip y los secundarios siguen diciendo la verdad. */
export const REINTENTOS_TARJETA = 4;
export const PAUSA_TARJETA_MS = 3_000;
export const REINTENTOS_DELIBERACION = 20;
export const PAUSA_DELIBERACION_MS = 15_000;

export function useTarjetaDelPrincipal(
    propuesta: RespuestaPropuesta | null, numero: string, correo: string,
    leer: (numero: string, correo: string) => Promise<TarjetaDecision | null> = leerTarjeta,
): TarjetaDecision | null {
    const [hecha, setHecha] = useState<{ de: RespuestaPropuesta | null; tarjeta: TarjetaDecision | null }>(
        { de: null, tarjeta: null });
    useEffect(() => {
        if (!propuesta || !numero) return;
        let vivo = true;
        let intentos = 0;
        let esperas = 0;
        let reloj: ReturnType<typeof setTimeout> | null = null;
        const pedir = () => {
            leer(numero, correo).then((t) => {
                if (!vivo) return;
                if (t && t.estado_calculo === 'calculando' && intentos < REINTENTOS_TARJETA) {
                    intentos += 1;
                    reloj = setTimeout(pedir, PAUSA_TARJETA_MS);
                    return;
                }
                setHecha({ de: propuesta, tarjeta: t });
                if (t && t.estado_calculo === 'listo' && t.deliberacion_estado === 'en_curso'
                    && esperas < REINTENTOS_DELIBERACION) {
                    esperas += 1;
                    reloj = setTimeout(pedir, PAUSA_DELIBERACION_MS);
                }
            }).catch(() => { /* sin la del servidor (o sin la de ahora): se queda lo que ya había */ });
        };
        pedir();
        return () => { vivo = false; if (reloj) clearTimeout(reloj); };
    }, [propuesta, numero, correo, leer]);
    return hecha.de === propuesta ? hecha.tarjeta : null;
}
