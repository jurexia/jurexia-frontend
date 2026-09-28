import { useEffect, useState } from 'react';
import type { PropuestaDeSolucion, RespuestaPropuesta, TesisDelAcervo } from './api';
import { leerTarjeta } from './api';
import type {
    ApoyoDeLaVia, FilaDeTuTribunal, ProblemaJuridico, SuerteDelSecundario, TarjetaDecision,
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
 *  propongo»; son «vía A» y «vía B» (contrato_tarjeta.md). */
export function sinRecomendar(t: TarjetaDecision | null | undefined): boolean {
    return t?.estado === 'reñido' || t?.estado === 'no_alcanza';
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
 *     del motor; o, si la tarjeta propone otra cosa que el motor (con la
 *     deliberación), ese sentido dictado con SU razón;
 *   · la contraria = dictado, el sentido de la opuesta y SU razón (lección 1
 *     del 631: la razón de la otra vía nunca viaja con ésta). Si la opuesta no
 *     traía razón y él pidió redactarla tras elegirla, sigue siendo la
 *     contraria;
 *   · lo demás —por problema, otra calificación, otra razón, o algún
 *     planteamiento marcado a mano— es su criterio. */
export function viaActivaDe(e: {
    enGlobal: boolean; globalDictado: boolean; sentidoGlobal: string; razonGlobal: string;
    sentidoMotor: string; nTocados: number; tarjeta: TarjetaDecision | null;
    elegida: ViaActiva | null;
}): ViaActiva {
    if (!e.enGlobal || e.nTocados > 0 || !e.sentidoGlobal) return 'criterio';
    const razon = (e.razonGlobal || '').trim();
    if (!e.globalDictado && e.sentidoGlobal === e.sentidoMotor) return 'propuesta';
    const vp = e.tarjeta?.vias.propuesta;
    if (e.globalDictado && vp && vp.sentido === e.sentidoGlobal && vp.sentido !== e.sentidoMotor
        && razon === vp.razon.trim()) return 'propuesta';
    const vo = e.tarjeta?.vias.opuesta;
    if (e.globalDictado && vo && hayAlternativaReal(e.tarjeta) && e.sentidoGlobal === vo.sentido
        && (razon === vo.razon.trim() || (e.elegida === 'contraria' && !vo.razon.trim()))) return 'contraria';
    return 'criterio';
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
    if (rel === 'distinto' || rel === 'autonoma') {
        return { texto: `Se estudia aparte: tema distinto${cal}`, corto: 'se estudia aparte', tono: 'oro' };
    }
    if (rel === 'mayor_beneficio' || guarda === 'mayor_beneficio') {
        return { texto: `Pide más que el principal: se estudia${cal}`, corto: 'se estudia', tono: 'oro' };
    }
    if (s.recalificar && !s.previsto && !sent) {
        return { texto: 'Por recalificar con la premisa de esta vía', corto: 'por recalificar', tono: 'ambar' };
    }
    if (sent === 'innecesario' || sent === 'sin_materia') {
        return prosperaPrincipal === true && rel !== 'autonoma'
            ? { texto: 'Queda sin materia: lo absorbe el principal', corto: 'sigue al principal', tono: 'neutro' }
            : { texto: 'Innecesario por suficiencia', corto: 'innecesario', tono: 'neutro' };
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

/** EL PROPIO TRIBUNAL, POR VÍA. Una fila va a la columna cuya calificación
 *  casa con la suya (la de la OAJ: la de UN planteamiento, no la del
 *  resolutivo); la que no trae calificación legible va aparte, debajo de las
 *  dos. No se cuentan: se leen. */
export function tribunalPorLado(t: TarjetaDecision | null | undefined): Record<LadoDeLaTarjeta | 'sin_lado', FilaDeTuTribunal[]> {
    const r: Record<LadoDeLaTarjeta | 'sin_lado', FilaDeTuTribunal[]> = { propuesta: [], opuesta: [], sin_lado: [] };
    for (const f of t?.tu_tribunal ?? []) {
        const lado = f.calificacion ? ladoDelSentido(t, f.calificacion) : null;
        r[lado ?? 'sin_lado'].push(f);
    }
    return r;
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
        if (pp?.sentido && pp.alcanza) vp = _via(pp.sentido, pp.razon, '', pp.apoyos, tesis);
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
            numero: iP + 1, pregunta: pral.pregunta, clase: '',
            jerarquia_de: (pral.jerarquia ?? '') === 'principal' ? 'fase3' : 'por_omision',
            por_que_principal: g?.contexto?.tema_principal ?? '',
            discrepa_motor: null,
            contraste: con ? { razon_toral: con.razon_toral, la_combate: con.la_combate,
                               sobrevive: con.sobrevive, veredicto_previo: con.veredicto_previo } : null,
            prediccion: pral.prediccion?.frase ? { frase: pral.prediccion.frase, n: pral.prediccion.n } : null,
        } : null,
        vias: { propuesta: vp, opuesta: vo },
        recomendada: null,
        estado: '',
        estado_por_que: [],
        secundarios,
        independientes: [],
        que_la_cambiaria: g ? {
            en_contra: g.en_contra || '',
            crux: null,
            constancias_indispensables: (g.constancias ?? []).filter((c) => c.indispensable).map((c) => c.que),
            limite_protector: g.via_protectora?.limite || null,
        } : null,
        tu_tribunal: [],
        linea_corte: { confirmadas: [], pistas: [] },
        deliberacion: null,
        conceptos_omitidos: null,
        avisos: [],
        origen: 'local',
    };
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
export function soltarLoTocado(problemas: ProblemaJuridico[], propuestas: PropuestaDeSolucion[]): ProblemaJuridico[] {
    return problemas.map((q, i) => {
        const s = propuestas[i];
        const valido = sentidoValido(s?.sentido);
        const texto = (q.criterio || '').trim();
        const suya = !!texto && !!q.razonDe && !q.razonDe.delMotor;
        if (s && s.alcanza && valido && valido !== 'innecesario') {
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
   pantalla sigue con la tarjeta local. No llama a ningún modelo. */
export const REINTENTOS_TARJETA = 4;
export const PAUSA_TARJETA_MS = 3_000;

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
            }).catch(() => { /* sin la del servidor: la pantalla pinta la suya */ });
        };
        pedir();
        return () => { vivo = false; if (reloj) clearTimeout(reloj); };
    }, [propuesta, numero, correo, leer]);
    return hecha.de === propuesta ? hecha.tarjeta : null;
}
