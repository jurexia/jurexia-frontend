'use client';

import { useEffect, useRef, useState } from 'react';
import type { CriterioRepartido, RespuestaRecalificar } from './api';
import type { ProblemaJuridico } from './tipos';

/* ═══════════════════════════════════════════════════════════════════════════
   RECALIFICAR CON LA PREMISA DEL CAMBIO DE SENTIDO (26-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   David: «si cambio sentido hay que tumbar y regenerar con la premisa del
   cambio de sentido». Contrato: diag/contrato_recalificar.md.

   Cuando el secretario resuelve el principal por la vía CONTRARIA a la que
   propuso el motor, /taller/reparto devuelve tumbados —`recalificar: true`,
   `de: "por_recalificar"`— los accesorios que él no tocó y cuya calificación
   era la de la otra vía. Esta pantalla:

     · los enseña «Recalificando con tu premisa…», sin la calificación vieja;
     · pide POST /taller/recalificar cuando la razón del principal está quieta
       (3 s tras la última tecla; enseguida si eligió sentido y no hay razón
       ni se está redactando una);
     · pinta lo que vuelve con la marca «recalificado con tu premisa» y su
       por qué; el secretario lo pisa con un clic y queda suyo (`tocado`);
     · si el servidor dice que falló, lo dice: sin calificar, califícalo tú o
       el estudio lo desarrolla con el material y lo pone primero en las
       ADVERTENCIAS.

   LA BASE NO SE TOCA. La calificación recalificada vive aquí, encima de la
   del problema, y NO se escribe en `problemas`: el formulario del proyecto
   sigue mandando lo que el árbol tumbó, con `tocado: false`. Así el árbol del
   servidor vuelve a encontrar los MISMOS pendientes al generar y al pedir el
   plan, la clave de la premisa casa con la que se calculó aquí y la
   recalificación guardada se usa en vez de rehacerse —otra llamada al modelo
   y hasta minuto y medio más—. Escribirla encima haría que el árbol la
   leyera como calificación «propia de esta vía», con otros pendientes y otra
   clave; y si el principal volviera a la vía del motor, ya no quedaría la
   propuesta del motor que el contrato manda recuperar. */

/** Quietud de la razón del principal antes de pedir. */
export const ANTIRREBOTE_MS = 3_000;
/** Si el servidor contesta «en curso» (otra petición la está calculando y ya
 *  esperó 90 s), se le vuelve a preguntar tras esta pausa, pocas veces: la
 *  misma clave en curso se espera allá, no se duplica. */
export const PAUSA_EN_CURSO_MS = 3_000;
export const REINTENTOS_EN_CURSO = 2;
/** El servidor espera como mucho 90 s; aquí se corta a los 120 s por petición. */
export const ESPERA_CLIENTE_MS = 120_000;

/** Lo que se dice cuando el motor no pudo recalificarlo (contrato: fallo). */
export const MENSAJE_SIN_CALIFICAR =
    'Sin calificar: califícalo tú; si no, el estudio lo desarrollará con el material y lo pondrá primero en ADVERTENCIAS.';

/* Las calificaciones que una pastilla puede llevar (las diez del catálogo y
   «innecesario»). Lo que venga de fuera se valida antes de pintarse. */
const SENTIDOS = ['fundado', 'esencialmente_fundado', 'sustancialmente_fundado',
    'parcialmente_fundado', 'fundado_insuficiente', 'infundado', 'inoperante',
    'inatendible', 'ineficaz', 'sin_materia', 'innecesario'] as const;
export type SentidoDePastilla = typeof SENTIDOS[number];
export function sentidoValido(s: string | undefined | null): SentidoDePastilla | '' {
    const t = String(s ?? '').trim().toLowerCase();
    return (SENTIDOS as readonly string[]).includes(t) ? t as SentidoDePastilla : '';
}

/** ¿Este criterio del reparto quedó tumbado para recalificarse? «recalificada»
 *  cuenta: el reparto puede traer ya aplicada una recalificación guardada con
 *  la misma premisa, y sigue siendo de la premisa, no de la base. */
export function esPorRecalificar(c: CriterioRepartido | null | undefined): boolean {
    return !!c && (c.recalificar === true || c.de === 'por_recalificar' || c.de === 'recalificada');
}

/** Los ids de los accesorios que el reparto tumbó: ni el principal ni lo que
 *  él marcó a mano (su palabra manda y nunca se sustituye). */
export function idsPorRecalificar(
    problemas: ProblemaJuridico[], criterios: CriterioRepartido[],
    principalId: string, tocados: Set<string>,
): string[] {
    const porTexto = new Map(problemas.map((p) => [p.pregunta, p.id] as const));
    const ids: string[] = [];
    criterios.forEach((c) => {
        if (!esPorRecalificar(c)) return;
        const id = porTexto.get(c.problema);
        if (id && id !== principalId && !tocados.has(id) && !ids.includes(id)) ids.push(id);
    });
    return ids;
}

/** Lo que el reparto escribe en los problemas: el sentido ya ajustado a la
 *  suerte del principal, de quién es y por qué. Lo marcado a mano no se toca
 *  —ni el principal que se acaba de cambiar—, y LOS TUMBADOS TAMPOCO: su
 *  calificación nueva llega por la recalificación, encima (ver arriba). */
export function aplicarReparto(
    problemas: ProblemaJuridico[], criterios: CriterioRepartido[],
    o: { excluir: string; tocados: Set<string>; pendientes: Set<string> },
): ProblemaJuridico[] {
    return problemas.map((p) => {
        const c = criterios.find((x) => x.problema === p.pregunta);
        if (!c || p.id === o.excluir || o.tocados.has(p.id)) return p;
        if (o.pendientes.has(p.id) || esPorRecalificar(c)) return p;
        if (!c.sentido) return p;
        const valido = sentidoValido(c.sentido);
        if (!valido) return p;
        const cambia = valido !== p.sentido;
        return { ...p, sentido: valido,
                 criterio: cambia ? (c.razonamiento || '') : (p.criterio || c.razonamiento || ''),
                 razonDe: cambia ? { sentido: valido, delMotor: true } : p.razonDe,
                 de: (c.de || 'motor') as ProblemaJuridico['de'], porQue: c.por_que || '' };
    });
}

/** Los accesorios que HOY esperan la recalificación: los que el reparto tumbó,
 *  menos los que él pisó después, y sólo los que viajan en el formulario —en
 *  «problema por problema» un problema sin sentido no viaja; ése lo califica
 *  él antes de generar, como siempre—. */
export function pendientesVivos(
    problemas: ProblemaJuridico[], pendientes: string[],
    tocados: Set<string>, principalId: string,
): ProblemaJuridico[] {
    return problemas.filter((p) => pendientes.includes(p.id) && p.id !== principalId
        && !tocados.has(p.id) && !!p.sentido);
}

/** LA CLAVE DE LA PREMISA, como la calcula el servidor salvo lo que no cambia
 *  en la sesión (la huella del adelanto y el tipo): el principal, su sentido,
 *  su razón TAL COMO VIAJA y qué accesorios se recalifican. Si cambia, lo
 *  recalificado ya no es de esta premisa. Vacía = no hay nada que pedir. */
export function claveRecalificacion(
    principal: ProblemaJuridico | undefined, vivos: ProblemaJuridico[],
): string {
    if (!principal || !principal.sentido || !vivos.length) return '';
    return JSON.stringify([principal.pregunta, principal.sentido, principal.criterio ?? '',
                           vivos.map((p) => p.pregunta).sort()]);
}

/* ── EL PEDIDO, CON ANTIRREBOTE Y CON CLAVE ──────────────────────────────── */

export interface EnlaceRecalificacion {
    /** Hay accesorios tumbados, el principal tiene sentido y el reparto no
     *  está en camino. Sin esto no se pide nada. */
    activo: boolean;
    /** `claveRecalificacion` de lo que está AHORA en pantalla. */
    clave: string;
    /** Eligió sentido y no hay razón: se pide enseguida, sin antirrebote. */
    inmediato: boolean;
    /** POST /taller/recalificar con el formulario de AHORA. */
    pedir: (signal: AbortSignal) => Promise<RespuestaRecalificar>;
}

export type FaseRecalificacion = 'inactivo' | 'esperando' | 'pidiendo' | 'listo' | 'fallo' | 'error';

export interface EstadoRecalificacion {
    /** La fase de la clave de AHORA (no la de la última respuesta). */
    fase: FaseRecalificacion;
    /** La clave de la última respuesta que llegó; puede ser de otra premisa. */
    clave: string;
    respuesta: RespuestaRecalificar | null;
    error: string;
    /** Tras un error de red, volver a pedir la misma premisa, ya. */
    reintentar: () => void;
}

interface Resultado {
    clave: string;
    fase: 'listo' | 'fallo' | 'error';
    respuesta: RespuestaRecalificar | null;
    error: string;
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** La recalificación de la premisa que está en pantalla. `listo` = nada está
 *  cambiando esa premisa ahora mismo (el motor no redacta la razón del
 *  principal, no se está generando ni proponiendo); si no, se espera. */
export function useRecalificacion(enlace: EnlaceRecalificacion, listo: boolean): EstadoRecalificacion {
    const [ultima, setUltima] = useState<Resultado | null>(null);
    const [enVuelo, setEnVuelo] = useState('');
    const [vuelta, setVuelta] = useState(0);
    const pedirRef = useRef(enlace.pedir);
    pedirRef.current = enlace.pedir;
    const inmediatoRef = useRef(enlace.inmediato);
    inmediatoRef.current = enlace.inmediato;
    /* Cada pedido lleva su turno: la respuesta de un turno viejo —de otra
       premisa— se tira aunque llegue, y su petición se corta. */
    const turno = useRef(0);
    const control = useRef<AbortController | null>(null);
    const vuelo = useRef('');
    /* La clave que ya tiene respuesta: la misma premisa no se pide dos veces. */
    const hecha = useRef('');
    const ya = useRef(false);

    const pedir = async (k: string) => {
        const mio = ++turno.current;
        const ctl = new AbortController();
        control.current = ctl;
        vuelo.current = k;
        setEnVuelo(k);
        let plazo: ReturnType<typeof setTimeout> | undefined;
        const llamar = () => {
            if (plazo) clearTimeout(plazo);
            plazo = setTimeout(() => ctl.abort(), ESPERA_CLIENTE_MS);
            return pedirRef.current(ctl.signal);
        };
        try {
            let r = await llamar();
            let n = 0;
            while (r.estado === 'en_curso' && n < REINTENTOS_EN_CURSO && mio === turno.current) {
                n += 1;
                await esperar(PAUSA_EN_CURSO_MS);
                if (mio !== turno.current) return;
                r = await llamar();
            }
            if (mio !== turno.current) return;
            hecha.current = k;
            if (r.estado === 'en_curso') {
                /* Ya no se espera más aquí; al generar, el servidor espera esa
                   misma clave o la calcula. Mientras, se dice como fallo: si
                   no termina, eso es lo que pasará. */
                setUltima({ clave: k, fase: 'fallo', respuesta: r,
                            error: 'el servidor sigue recalificándolo después de varios minutos' });
            } else if (r.estado === 'fallo') {
                setUltima({ clave: k, fase: 'fallo', respuesta: r, error: r.avisos.join(' · ') });
            } else {
                setUltima({ clave: k, fase: 'listo', respuesta: r, error: '' });
            }
        } catch (e) {
            if (mio !== turno.current) return;       // cancelado: otra premisa manda
            hecha.current = k;
            setUltima({ clave: k, fase: 'error', respuesta: null,
                        error: ctl.signal.aborted ? 'el servidor no contestó en dos minutos'
                             : (e instanceof Error ? e.message : 'error de red') });
        } finally {
            if (plazo) clearTimeout(plazo);
            if (mio === turno.current) {
                vuelo.current = '';
                control.current = null;
                setEnVuelo('');
            }
        }
    };

    const { activo, clave } = enlace;
    useEffect(() => {
        const cancelar = () => {
            turno.current += 1;
            control.current?.abort();
            control.current = null;
            vuelo.current = '';
            setEnVuelo('');
        };
        if (!activo || !clave) {
            if (vuelo.current) cancelar();
            return;
        }
        /* OTRA PREMISA: lo que iba en camino era para la anterior y se corta.
           Si llegara, pintaría la calificación de un sentido o de una razón
           que el secretario ya cambió. */
        if (vuelo.current && vuelo.current !== clave) cancelar();
        /* Mientras el motor redacta la razón del principal, o se genera, no se
           programa nada: la premisa está a punto de cambiar. Lo que ya va en
           camino con ESTA clave no se corta. */
        if (!listo) return;
        if (clave === hecha.current || clave === vuelo.current) return;
        const espera = ya.current || inmediatoRef.current ? 0 : ANTIRREBOTE_MS;
        ya.current = false;
        const t = setTimeout(() => { void pedir(clave); }, espera);
        return () => clearTimeout(t);
    }, [activo, clave, listo, vuelta]); // eslint-disable-line react-hooks/exhaustive-deps

    // Al desmontar, lo que esté en camino ya no tiene dónde pintarse.
    useEffect(() => () => { turno.current += 1; control.current?.abort(); }, []);

    const propia = activo && !!ultima && ultima.clave === clave;
    const fase: FaseRecalificacion = !activo ? 'inactivo'
        : propia ? ultima!.fase
        : enVuelo && enVuelo === clave ? 'pidiendo' : 'esperando';
    return {
        fase,
        clave: ultima?.clave ?? '',
        respuesta: ultima?.respuesta ?? null,
        error: propia ? ultima!.error : '',
        reintentar: () => {
            hecha.current = '';
            ya.current = true;
            setUltima(null);
            setVuelta((v) => v + 1);
        },
    };
}

/* ── LO QUE SE PINTA ENCIMA DE CADA ACCESORIO TUMBADO ─────────────────────── */

export type EstadoSuperpuesto = 'recalificando' | 'recalificada' | 'fallo' | 'error';

export interface Superpuesta {
    estado: EstadoSuperpuesto;
    /** La calificación recalificada; vacía mientras no hay (tumbado). */
    sentido: SentidoDePastilla | '';
    razon: string;
    /** El porqué del servidor, o el motivo del error. */
    porQue: string;
}

/** Por cada accesorio tumbado, qué se enseña. Sólo vale la respuesta de la
 *  clave de AHORA: la de otra premisa no se pinta. Lo que él pisó ya no está
 *  en `vivos` y no lleva nada encima: manda su marca. */
export function superposicion(
    vivos: ProblemaJuridico[], estado: EstadoRecalificacion, claveActual: string,
): Record<string, Superpuesta> {
    const out: Record<string, Superpuesta> = {};
    const nuestra = !!claveActual && estado.clave === claveActual
        && (estado.fase === 'listo' || estado.fase === 'fallo' || estado.fase === 'error');
    vivos.forEach((p) => {
        if (!nuestra) {
            out[p.id] = { estado: 'recalificando', sentido: '', razon: '', porQue: '' };
            return;
        }
        const r = estado.respuesta;
        const c = r?.criterios.find((x) => x.problema === p.pregunta);
        if (estado.fase === 'error') {
            out[p.id] = { estado: 'error', sentido: '', razon: '', porQue: estado.error };
            return;
        }
        // «sin_cambios»: el servidor no halló nada que recalificar; la página
        // aplica esos criterios como un reparto y los retira de los pendientes.
        if (estado.fase === 'listo' && r?.estado === 'sin_cambios') return;
        const s = sentidoValido(c?.sentido);
        if (estado.fase === 'listo' && c && c.de === 'recalificada' && s) {
            out[p.id] = { estado: 'recalificada', sentido: s, razon: c.razonamiento || '',
                          porQue: c.por_que || '' };
            return;
        }
        out[p.id] = { estado: 'fallo', sentido: '', razon: '', porQue: c?.por_que || estado.error || '' };
    });
    return out;
}

/** ¿Hay recalificación en curso? Mientras sí, el panel «Cómo se estudiará» no
 *  pide plan: el plan se ordena sobre el criterio YA recalificado, y pedirlo
 *  antes gastaría una corrida en una decisión que está por cambiar. El reparto
 *  en camino cuenta: todavía no se sabe qué se tumba. */
export function recalificacionEnCurso(sup: Record<string, Superpuesta>, repartiendo: boolean): boolean {
    return repartiendo || Object.values(sup).some((s) => s.estado === 'recalificando');
}

/** El porqué del servidor sin la fórmula de arriba, que la marca ya dice. */
export function porQueLegible(s: string): string {
    return (s || '').replace(/^\s*recalificad[ao]\s+por\s+el\s+motor\s+con\s+tu\s+premisa\s*[:·,—-]?\s*/i, '').trim();
}
