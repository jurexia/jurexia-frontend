/**
 * EL PDF SIEMPRE EN EL VISOR (26-sep-2026).
 *
 * David: «Siempre debemos asegurar el PDF en el visor».
 *
 * La ficha de cada cita —origen, referencia, texto y la dirección del PDF—
 * viaja en `CITATION_META.sources`. Cuando una cita no está ahí, el panel de
 * fuentes la ponía en ámbar como «Cita 25 sin ficha de origen» y el visor se
 * abría vacío, aunque el documento existiera. Pasó con las siete citas que el
 * modelo escribió agrupadas en la consulta del control de convencionalidad:
 * el validador del servidor sólo reconocía la forma singular y no las metió
 * en el mapa, y así quedaron también los mensajes ya guardados.
 *
 * El servidor ya tenía la respuesta: `GET /cita/{id}` es un retrieve exacto
 * por identificador sobre las colecciones citables y devuelve el MISMO
 * contrato que las entradas de `CITATION_META.sources` —con página, párrafo y
 * ancla para la Corte IDH y la doctrina, y el sello de vigencia de las tesis—.
 * Aquí se le pregunta por lo que falte, una sola vez por identificador (caché
 * de módulo, compartida por la burbuja, la hoja y el visor) y con pocas
 * peticiones a la vez, para que abrir una conversación larga sin mapa no
 * dispare cien consultas de golpe.
 *
 * Una cita sólo se da por «sin ficha» después de haberlo intentado: si
 * `/cita` contesta 404 no está en el acervo; si falla la red, se reintenta
 * sola dos veces, a los 5 y a los 20 segundos —Render dormido tarda en
 * despertar—, y sólo entonces se dice que no se pudo consultar: tocarla lo
 * vuelve a intentar, y cambiar de conversación olvida los fallos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { metaDeCitas } from './citas';
import { idsCitados, partirComentarios, sinMarcadorAbiertoAlFinal } from '@/lib/idsDeCita';

/** Lo que devuelve `GET /cita/{id}`: el contrato de `CITATION_META.sources`. */
export type FichaCita = {
    origen: string;
    ref: string;
    texto: string;
    pdf_url?: string | null;
    silo?: string;
    [campo: string]: unknown;
};

/** `buscando`: se está pidiendo, o se volverá a pedir sola en unos segundos
 *  (o se pedirá en cuanto termine la respuesta). `lista`: hay ficha.
 *  `no_existe`: `/cita` dijo 404. `fallo`: no se pudo consultar (red,
 *  servidor) ni reintentándolo: tocarla lo vuelve a intentar. */
export type EstadoFicha = 'buscando' | 'lista' | 'no_existe' | 'fallo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';
const SIMULTANEAS = 4;
const ESPERA_MS = 30_000;
/** Las esperas antes de cada reintento automático de un fallo pasajero (un
 *  503, la red, los 30 s sin respuesta de un servidor que despierta). Se
 *  exporta para que la comprobación las acorte; la pantalla no las toca. */
export const ESPERAS_REINTENTO_MS: number[] = [5_000, 20_000];

const fichas = new Map<string, FichaCita>();
const inexistentes = new Set<string>();
/** Falló y ya no quedan reintentos automáticos. */
const fallos = new Set<string>();
const enVuelo = new Map<string, Promise<FichaCita | null>>();
/** Falló y tiene un reintento automático en espera. */
const reintentos = new Map<string, ReturnType<typeof setTimeout>>();
/** Cuántos reintentos automáticos lleva cada identificador. */
const intentos = new Map<string, number>();
const oyentes = new Set<(id: string) => void>();

const avisar = (id: string) => oyentes.forEach((f) => f(id));
const normalizar = (id: string) => String(id || '').trim().toLowerCase();

/* Pocas a la vez: quien espera recibe el turno de quien termina. */
let activas = 0;
const cola: Array<() => void> = [];
async function conTurno<T>(fn: () => Promise<T>): Promise<T> {
    if (activas >= SIMULTANEAS) await new Promise<void>((r) => cola.push(r));
    else activas++;
    try {
        return await fn();
    } finally {
        const siguiente = cola.shift();
        if (siguiente) siguiente();
        else activas--;
    }
}

/** Lo que ya se sabe de una cita, sin pedir nada. */
export function estadoDeFicha(docId: string): EstadoFicha | null {
    const id = normalizar(docId);
    if (fichas.has(id)) return 'lista';
    if (inexistentes.has(id)) return 'no_existe';
    if (enVuelo.has(id) || reintentos.has(id)) return 'buscando';
    if (fallos.has(id)) return 'fallo';
    return null;
}

/** ¿Ya no va a cambiar nunca? Sólo la ficha y el 404: un «fallo» vuelve a
 *  pedirse al tocar la cita o al olvidarse (`olvidarFallos`). */
function paraSiempre(id: string): boolean {
    const e = estadoDeFicha(id);
    return e === 'lista' || e === 'no_existe';
}

/** Una entrada del mapa sin nada que enseñar: ni texto ni PDF. Es la que el
 *  servidor pone a una cita que no estaba en el contexto —«Fuente no
 *  verificada», vacía— y la que llega al visor cuando el mapa no la traía. */
export function fichaVacia(s: unknown): boolean {
    if (!s || typeof s !== 'object') return true;
    const f = s as { texto?: unknown; pdf_url?: unknown; url_oficial?: unknown };
    return !f.texto && !f.pdf_url && !f.url_oficial;
}

/** Lo que `/cita` devuelve, como lo pinta la pantalla. Las tesis traen el
 *  nombre del archivo en `origen` —«2005115_1a. CCCLIX/2013 (10a.).txt»— y el
 *  «.txt» salía en la lista por institución y en la referencia APA del Word;
 *  las del mapa del mensaje ya llegan sin él (`humanize_origen`). */
function limpiarFicha(f: FichaCita): FichaCita {
    return { ...f, origen: f.origen.replace(/\.(?:txt|json)\s*$/i, '').trim() };
}

/** Programa el siguiente reintento automático, si quedan. */
function programarReintento(id: string, base: string): boolean {
    const n = intentos.get(id) ?? 0;
    if (n >= ESPERAS_REINTENTO_MS.length) return false;
    intentos.set(id, n + 1);
    reintentos.set(id, setTimeout(() => {
        reintentos.delete(id);
        void obtenerFicha(id, base);
    }, ESPERAS_REINTENTO_MS[n]));
    return true;
}

/**
 * Olvida lo que falló —y los reintentos en espera—, para que se vuelva a
 * pedir. Lo llama el chat al cambiar de conversación: un fallo pasajero no
 * debe dejar las citas en ámbar toda la sesión. Lo que `/cita` dijo que no
 * existe no se olvida: un 404 no es pasajero.
 */
export function olvidarFallos(): void {
    const olvidados = new Set<string>(fallos);
    reintentos.forEach((t, id) => { clearTimeout(t); olvidados.add(id); });
    reintentos.clear();
    fallos.clear();
    intentos.clear();
    olvidados.forEach(avisar);
}

export function fichaEnCache(docId: string): FichaCita | null {
    return fichas.get(normalizar(docId)) ?? null;
}

/**
 * La ficha de una cita según `GET /cita/{id}`. Nunca lanza: devuelve `null`
 * si no existe o no se pudo consultar, y `estadoDeFicha` dice cuál de las dos
 * (`buscando` si falló pero se reintentará sola). Llamarla mientras espera un
 * reintento lo adelanta. `base` sólo lo usa la comprobación, para apuntar a
 * producción desde Node.
 */
export function obtenerFicha(docId: string, base: string = API_URL): Promise<FichaCita | null> {
    const id = normalizar(docId);
    const hecha = fichas.get(id);
    if (hecha) return Promise.resolve(hecha);
    if (inexistentes.has(id)) return Promise.resolve(null);
    // La misma validación que el servidor: esto entra en una URL.
    if (!/^[a-f0-9-]{32,36}$/.test(id)) {
        inexistentes.add(id);
        return Promise.resolve(null);
    }
    const previa = enVuelo.get(id);
    if (previa) return previa;

    const esperando = reintentos.get(id);
    if (esperando) { clearTimeout(esperando); reintentos.delete(id); }
    fallos.delete(id);
    const pedido = conTurno(async (): Promise<FichaCita | null> => {
        const reloj = new AbortController();
        const alarma = setTimeout(() => reloj.abort(), ESPERA_MS);
        try {
            const r = await fetch(`${base}/cita/${encodeURIComponent(id)}`, { signal: reloj.signal });
            if (r.status === 404 || r.status === 400) {
                inexistentes.add(id);
                return null;
            }
            if (!r.ok) throw new Error(`/cita ${r.status}`);
            const f = (await r.json()) as FichaCita | null;
            if (!f || typeof f !== 'object' || typeof f.origen !== 'string') throw new Error('/cita sin ficha');
            const limpia = limpiarFicha(f);
            fichas.set(id, limpia);
            intentos.delete(id);
            return limpia;
        } catch {
            // Pasajero hasta que se demuestre lo contrario: se reintenta sola
            // con espera creciente, y sólo al agotar los intentos es «fallo».
            if (!programarReintento(id, base)) fallos.add(id);
            return null;
        } finally {
            clearTimeout(alarma);
        }
    }).finally(() => {
        enVuelo.delete(id);
        avisar(id);
    });
    enVuelo.set(id, pedido);
    avisar(id);
    return pedido;
}

/**
 * Las fichas de las citas que falten, pedidas a `/cita` mientras `activo`
 * (en la burbuja, al terminar la respuesta: durante el stream el mapa final
 * aún puede traerlas). Se vuelve a pintar cuando cambia cualquiera de ellas,
 * y lo que se olvidó (`olvidarFallos`) se vuelve a pedir.
 */
export function useFichasDeCitas(ids: string[], activo = true): {
    fichas: Record<string, FichaCita>;
    estado: Record<string, EstadoFicha>;
} {
    const clave = Array.from(new Set(ids.map(normalizar).filter(Boolean))).sort().join(',');
    const [version, setVersion] = useState(0);
    const claveRef = useRef(clave);
    claveRef.current = clave;

    useEffect(() => {
        const oir = (id: string) => {
            if (claveRef.current.split(',').includes(id)) setVersion((v) => v + 1);
        };
        oyentes.add(oir);
        return () => { oyentes.delete(oir); };
    }, []);

    useEffect(() => {
        if (!activo || !clave) return;
        for (const id of clave.split(',')) {
            // Sólo lo que no se ha pedido nunca (o se olvidó): lo que espera
            // su reintento lo hace solo, y lo que agotó los reintentos no se
            // repite en bucle contra un servidor caído —se reintenta al
            // tocar la cita o al cambiar de conversación—.
            if (estadoDeFicha(id) === null) void obtenerFicha(id);
        }
    }, [clave, activo, version]);

    return useMemo(() => {
        const salida: Record<string, FichaCita> = {};
        const estado: Record<string, EstadoFicha> = {};
        for (const id of clave ? clave.split(',') : []) {
            const f = fichas.get(id);
            if (f) salida[id] = f;
            estado[id] = estadoDeFicha(id) ?? 'buscando';
        }
        return { fichas: salida, estado };
    }, [clave, version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Lo mínimo que el visor recibe al tocar una cita. */
type FuenteAbrible = { origen: string; ref: string; texto: string; pdf_url?: string | null };

/** Lo que escucha cada visor (cada `fijar`): abrir otra cita en el mismo
 *  visor suelta lo de la anterior, así que hay uno como mucho por visor. */
const oyentesDelVisor = new WeakMap<object, (id: string) => void>();

/**
 * ABRIR UNA CITA EN EL VISOR, CON SU FICHA. Lo usan las tres pantallas que
 * abren el visor (chat, agente y redactor de sentencias) con su propio
 * `setState`. Si la fuente llega vacía —sin texto ni PDF: su ficha no venía en
 * el mapa del mensaje, o venía la «Fuente no verificada» del servidor—, el
 * visor se abre diciendo que busca, se pide a `/cita` y se rellena al llegar.
 * Si el servidor no responde, lo dice y sigue esperando el reintento
 * automático: si ése llega, el visor se rellena solo. Si no existe, lo dice;
 * volver a tocar la cita lo reintenta. Si entretanto se cerró el visor o se
 * abrió otra cita, la respuesta no pisa nada.
 *
 * Se escucha la cita mientras el visor la enseñe y hasta que tenga ficha o
 * `/cita` diga 404 (26-sep-2026). Antes se dejaba de escuchar también al
 * llegar a «fallo»: si después se olvidaba el fallo (cambio de conversación)
 * y el nuevo intento salía bien, el visor seguía diciendo «No se pudo
 * consultar la fuente». Ahora un fallo olvidado lo vuelve a pedir el propio
 * visor que la enseña, y lo que llegue lo rellena.
 */
export function abrirCitaConFicha<S extends FuenteAbrible>(
    fuente: S & { docId?: string; url_oficial?: unknown },
    fijar: (valor: S | null | ((previo: S | null) => S | null)) => void,
): void {
    const previo = oyentesDelVisor.get(fijar);
    if (previo) { oyentes.delete(previo); oyentesDelVisor.delete(fijar); }

    const docId = fuente?.docId;
    if (!docId || !fichaVacia(fuente)) { fijar(fuente); return; }
    const id = normalizar(docId);
    const guardada = fichas.get(id);
    if (guardada) { fijar({ ...guardada, docId } as unknown as S); return; }
    const buscando = (texto = ''): S => ({ ...fuente, origen: 'Buscando la fuente…', ref: '', texto });
    fijar(buscando());

    const soltar = () => {
        oyentes.delete(oir);
        if (oyentesDelVisor.get(fijar) === oir) oyentesDelVisor.delete(fijar);
    };
    const pintar = () => fijar((actual) => {
        // Se cerró el visor o enseña otra cita: ya no se escucha.
        if (!actual || (actual as { docId?: string }).docId !== docId) { soltar(); return actual; }
        const ficha = fichas.get(id);
        if (ficha) return { ...ficha, docId } as unknown as S;
        const estado = estadoDeFicha(id);
        if (estado === 'no_existe') {
            return {
                ...fuente, origen: 'Cita sin ficha de origen', ref: '',
                texto: 'Este identificador no corresponde a ningún documento del acervo. No des la cita por buena sin comprobarla.',
            };
        }
        if (estado === 'fallo') {
            return {
                ...fuente, origen: 'No se pudo consultar la fuente', ref: '',
                texto: 'El servidor no respondió al pedir esta fuente. Cierra el visor y vuelve a tocar la cita para reintentarlo.',
            };
        }
        if (estado === null) {
            // Se olvidó el fallo al cambiar de conversación: el visor que la
            // enseña la vuelve a pedir. Pedirla dos veces no hace dos
            // peticiones (`enVuelo`), así que da igual si React repite esto.
            queueMicrotask(() => { void obtenerFicha(id); });
            return buscando();
        }
        if (reintentos.has(id)) return buscando('El servidor tarda en responder. Se vuelve a intentar solo en unos segundos.');
        return buscando();
    });
    const oir = (x: string) => {
        if (x !== id) return;
        pintar();
        if (paraSiempre(id)) soltar();
    };
    oyentes.add(oir);
    oyentesDelVisor.set(fijar, oir);
    void obtenerFicha(id);
    // Lo que se resuelve sin pedir nada (un 404 ya sabido) no avisa.
    if (paraSiempre(id)) { soltar(); pintar(); }
}

type ConFuentes = { sources?: Record<string, unknown>; invalid?: number; invalid_ids?: string[] };

/** La entrada del mapa del mensaje para esta cita (sin distinguir mayúsculas). */
function entradaDe(meta: ConFuentes | null | undefined, docId: string): unknown {
    const fuentes = meta?.sources;
    if (!fuentes) return undefined;
    if (fuentes[docId]) return fuentes[docId];
    const id = docId.toLowerCase();
    if (fuentes[id]) return fuentes[id];
    const clave = Object.keys(fuentes).find((k) => k.toLowerCase() === id);
    return clave ? fuentes[clave] : undefined;
}

/** ¿Trae el mapa del mensaje la ficha de esta cita? Una entrada vacía —la
 *  «Fuente no verificada» que el servidor pone a lo que no estaba en el
 *  contexto— no cuenta: no abre ningún PDF, y hay que pedirla a `/cita`. */
export function tieneFuente(meta: ConFuentes | null | undefined, docId: string): boolean {
    return !fichaVacia(entradaDe(meta, docId));
}

/** Las citas del texto que el mapa del mensaje no trae. */
export function citasSinFuente(ids: Iterable<string>, meta: ConFuentes | null | undefined): string[] {
    return Array.from(ids).filter((id) => !tieneFuente(meta, id));
}

/** El mapa del mensaje con las fichas de `/cita` añadidas. Lo del servidor
 *  manda: una ficha resuelta nunca pisa una del mapa… salvo que la del mapa
 *  esté vacía. Las vacías que `/cita` no resolvió se quitan: agrupadas,
 *  salían como «Fuente no verificada» en «Otras fuentes» y en el Word. */
export function conFichas<M extends ConFuentes>(meta: M | null, extra: Record<string, FichaCita>): M | null {
    const propias = meta?.sources || {};
    const hayVacias = Object.values(propias).some(fichaVacia);
    if (!Object.keys(extra).length && !hayVacias) return meta;
    const base = (meta ?? { valid: 0, invalid: 0, total: 0, invalid_ids: [] }) as M;
    const sources: Record<string, unknown> = {};
    const vistas = new Set<string>();
    for (const [k, s] of Object.entries(propias)) {
        const kk = k.toLowerCase();
        vistas.add(kk);
        if (!fichaVacia(s)) sources[k] = s;
        else if (extra[kk]) sources[k] = extra[kk];
    }
    for (const [k, f] of Object.entries(extra)) if (!vistas.has(k.toLowerCase())) sources[k] = f;
    return { ...base, sources };
}

/** ¿El servidor la marcó como fuera del contexto recuperado? */
export function fueraDelContexto(meta: ConFuentes | null | undefined, docId: string): boolean {
    const id = docId.toLowerCase();
    return (meta?.invalid_ids || []).some((x) => String(x).toLowerCase() === id);
}

/** Cómo quedan las citas de una respuesta, para la tarjeta, el sello y la hoja. */
export type ResumenCitas = {
    /** Del texto, con ficha, y el servidor no las marcó. */
    verificadas: number;
    /** El servidor dijo que no estaban en el contexto recuperado, pero existen
     *  —`/cita` las encontró— o no se pudo comprobar si existen. No es lo mismo
     *  que no existir: en una conversación de varias vueltas el modelo cita de
     *  la respuesta anterior, y el validador sólo mira el contexto de ésta. */
    fueraDeContexto: number;
    /** No corresponden a ningún documento del acervo: `/cita` dijo 404 (o el
     *  servidor las contó sin decir cuáles, y no hay a quién preguntar). */
    noTrazadas: number;
    /** No marcadas por el servidor, pero `/cita` no respondió ni reintentando. */
    sinComprobar: number;
    /** Todavía se están pidiendo a `/cita`. */
    pendientes: number;
};

/**
 * Cuántas citas del texto están verificadas: las que tienen ficha —del mapa
 * o de `/cita`— y el servidor no marcó como fuera del contexto. Antes el pie
 * de la hoja contaba las entradas del mapa entero («33 citas · 60
 * verificadas») y la tarjeta del hilo sólo las singulares.
 *
 * Las marcadas por el servidor se separan según lo que contestó `/cita`: si
 * el documento existe, estaba fuera del contexto; si `/cita` dijo 404, no
 * existe en el acervo. Antes las dos cosas se decían igual —«no corresponde
 * a ningún documento del acervo»— y la primera no es verdad.
 */
export function resumenDeCitas(
    ids: Iterable<string>,
    meta: ConFuentes | null | undefined,
    estado: Record<string, EstadoFicha> = {},
): ResumenCitas {
    const invalidas = new Set((meta?.invalid_ids || []).map((x) => String(x).toLowerCase()));
    const r: ResumenCitas = { verificadas: 0, fueraDeContexto: 0, noTrazadas: 0, sinComprobar: 0, pendientes: 0 };
    const vistas = new Set<string>();
    const contar = (id: string) => {
        if (vistas.has(id)) return;
        vistas.add(id);
        const marcada = invalidas.has(id);
        const e = tieneFuente(meta, id) ? 'lista' : estado[id];
        if (e === 'buscando') r.pendientes++;
        else if (e === 'no_existe') r.noTrazadas++;
        else if (marcada) r.fueraDeContexto++;
        else if (e === 'lista') r.verificadas++;
        else if (e === 'fallo') r.sinComprobar++;
    };
    for (const bruto of Array.from(ids)) contar(bruto.toLowerCase());
    // Las marcadas que el texto no deja ver cuentan igual, como antes.
    invalidas.forEach(contar);
    // La vía que cuenta las inválidas sin decir cuáles.
    r.noTrazadas += Math.max(0, (meta?.invalid ?? 0) - invalidas.size);
    return r;
}

/**
 * CUÁNTO SE LEE DE CADA RESPUESTA DEL HISTORIAL (26-sep-2026). El registro
 * se rehace con el historial entero cada vez que termina una respuesta o
 * llega una ficha, así que su costo no puede depender de una respuesta
 * desmesurada. De cada una se leen como mucho estos caracteres de TEXTO —lo
 * que el modelo escribió, donde están las citas—. Los comentarios no cuentan
 * contra el tope: el mapa del servidor (CITATION_META, que en la consulta del
 * control de convencionalidad ocupa 124.000 de sus 157.000 caracteres) se lee
 * aparte y entero, con un escáner, y las fuentes previas no son citas. Las
 * respuestas más largas de Platinum rondan los 64k tokens, unos 250.000
 * caracteres: el tope no corta ninguna real. Lo que pase de él no se registra
 * —el registro, además, sólo envía 40 identificadores— y nada se rompe: esas
 * citas se validan igual en el servidor la vuelta siguiente.
 */
export const TOPE_TEXTO_POR_MENSAJE = 300_000;

/** El texto de una respuesta del historial, sin sus comentarios y hasta el
 *  tope. Sin tocar la que no llega al tope. */
function textoParaRegistro(md: string): string {
    if (md.length <= TOPE_TEXTO_POR_MENSAJE) return md;
    const trozos = partirComentarios(md);
    let texto = '';
    for (let i = 0; i < trozos.length && texto.length < TOPE_TEXTO_POR_MENSAJE; i += 2) texto += trozos[i];
    texto = texto.slice(0, TOPE_TEXTO_POR_MENSAJE);
    // Un marcador que se quedó sin cerrar no es texto del modelo; un «<!--»
    // que el modelo escribió, sí.
    return sinMarcadorAbiertoAlFinal(texto);
}

/**
 * LO QUE LA CONVERSACIÓN YA VERIFICÓ, para `fijarFuentesVerificadas`: cada
 * cita que el sello de ALGUNA respuesta terminada contó como verificada. Es
 * decir, citada en esa respuesta, no marcada por el servidor en ESA respuesta
 * y con ficha —del mapa de cualquier respuesta o resuelta por `/cita`—. Lo que
 * el sello sólo marcó como fuera del contexto no se da por hecho.
 *
 * Antes sólo contaban las claves de `CITATION_META.sources`: las siete citas
 * agrupadas del caso del control de convencionalidad —Radilla, García
 * Rodríguez, dos tesis— no viajaban a la vuelta siguiente, el validador las
 * acusaba si el modelo las repetía y el sello decía 33 trazadas cuando se
 * enviaban 26.
 *
 * Y la marca se mira respuesta por respuesta (26-sep-2026). Antes, que OTRA
 * respuesta la marcara quitaba la cita del registro salvo que alguna la
 * trajera en su mapa: lo que había resuelto `/cita` no la salvaba. Con el
 * caso real y una segunda respuesta que marca Radilla ¶340, el registro
 * bajaba de 33 a 32 aunque el sello de la primera la contó trazada —y
 * justo entonces, sin viajar como fuente previa, es más probable que el
 * servidor la vuelva a marcar—. Si hubiera venido singular, en el mapa, se
 * habría quedado. Ahora da igual de dónde salió la ficha.
 *
 * `resuelta` es la caché de `/cita` (`fichaEnCache`); `faltan` son las que
 * habría que pedir para poder contarlas. De cada respuesta se leen como
 * mucho `TOPE_TEXTO_POR_MENSAJE` caracteres de texto.
 */
export function fuentesDeLaConversacion(
    markdowns: string[],
    resuelta: (id: string) => unknown = fichaEnCache,
): { verificadas: string[]; faltan: string[] } {
    /** Por orden de primera cita en la conversación. */
    const citados: string[] = [];
    const vistos = new Set<string>();
    /** Con ficha en el mapa de alguna respuesta. */
    const delServidor = new Set<string>();
    /** Citadas sin marca en alguna respuesta: su sello las contaría si hay ficha. */
    const sinMarcaEnAlguna = new Set<string>();
    for (const md of markdowns) {
        const meta = metaDeCitas(md || '');
        for (const [k, s] of Object.entries(meta?.sources ?? {})) {
            if (!fichaVacia(s)) delServidor.add(k.toLowerCase());
        }
        const marcadas = new Set((meta?.invalid_ids ?? []).map((x) => String(x).toLowerCase()));
        // También las agrupadas —«[Doc IDs: a; b]»—: ver `@/lib/idsDeCita`.
        for (const id of idsCitados(textoParaRegistro(md || ''))) {
            if (!vistos.has(id)) { vistos.add(id); citados.push(id); }
            if (!marcadas.has(id)) sinMarcaEnAlguna.add(id);
        }
    }
    // Lo que el mapa de alguna respuesta trae con ficha cuenta como siempre
    // (aunque otra la marcara); lo demás, si alguna respuesta la citó sin
    // marca y tiene ficha de `/cita`.
    const candidatas = citados.filter((id) => delServidor.has(id) || sinMarcaEnAlguna.has(id));
    return {
        verificadas: candidatas.filter((id) => delServidor.has(id) || !fichaVacia(resuelta(id))),
        faltan: candidatas.filter((id) => !delServidor.has(id)),
    };
}
