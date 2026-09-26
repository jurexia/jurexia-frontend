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
 * `/cita` contesta 404 no está en el acervo; si falla la red, se dice así y
 * se puede reintentar tocándola.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

/** Lo que devuelve `GET /cita/{id}`: el contrato de `CITATION_META.sources`. */
export type FichaCita = {
    origen: string;
    ref: string;
    texto: string;
    pdf_url?: string | null;
    silo?: string;
    [campo: string]: unknown;
};

/** `buscando`: se está pidiendo (o se pedirá en cuanto termine la respuesta).
 *  `lista`: hay ficha. `no_existe`: `/cita` dijo 404. `fallo`: no se pudo
 *  consultar (red, servidor): tocarla lo vuelve a intentar. */
export type EstadoFicha = 'buscando' | 'lista' | 'no_existe' | 'fallo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';
const SIMULTANEAS = 4;
const ESPERA_MS = 30_000;

const fichas = new Map<string, FichaCita>();
const inexistentes = new Set<string>();
const fallos = new Set<string>();
const enVuelo = new Map<string, Promise<FichaCita | null>>();
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
    if (enVuelo.has(id)) return 'buscando';
    if (fallos.has(id)) return 'fallo';
    return null;
}

export function fichaEnCache(docId: string): FichaCita | null {
    return fichas.get(normalizar(docId)) ?? null;
}

/**
 * La ficha de una cita según `GET /cita/{id}`. Nunca lanza: devuelve `null`
 * si no existe o no se pudo consultar, y `estadoDeFicha` dice cuál de las dos.
 * `base` sólo lo usa la comprobación, para apuntar a producción desde Node.
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
            fichas.set(id, f);
            return f;
        } catch {
            fallos.add(id);
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
 * aún puede traerlas). Se vuelve a pintar cuando llega cualquiera de ellas.
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
            // Lo que ya falló no se repite solo (sería un bucle contra un
            // servidor caído): se reintenta al tocar la cita.
            if (!fichas.has(id) && !inexistentes.has(id) && !fallos.has(id)) void obtenerFicha(id);
        }
    }, [clave, activo]);

    return useMemo(() => {
        const salida: Record<string, FichaCita> = {};
        const estado: Record<string, EstadoFicha> = {};
        for (const id of clave ? clave.split(',') : []) {
            const f = fichas.get(id);
            if (f) { salida[id] = f; estado[id] = 'lista'; }
            else if (inexistentes.has(id)) estado[id] = 'no_existe';
            else if (fallos.has(id) && !enVuelo.has(id)) estado[id] = 'fallo';
            else estado[id] = 'buscando';
        }
        return { fichas: salida, estado };
    }, [clave, version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Lo mínimo que el visor recibe al tocar una cita. */
type FuenteAbrible = { origen: string; ref: string; texto: string; pdf_url?: string | null };

/**
 * ABRIR UNA CITA EN EL VISOR, CON SU FICHA. Lo usan las tres pantallas que
 * abren el visor (chat, agente y redactor de sentencias) con su propio
 * `setState`. Si la fuente llega vacía —sin texto ni PDF: su ficha no venía en
 * el mapa del mensaje—, el visor se abre diciendo que busca, se pide a
 * `/cita` y se rellena al llegar. Si no existe o no responde, lo dice; volver a
 * tocar la cita lo reintenta. Si entretanto se cerró el visor o se abrió otra
 * cita, la respuesta no pisa nada.
 */
export function abrirCitaConFicha<S extends FuenteAbrible>(
    fuente: S & { docId?: string; url_oficial?: unknown },
    fijar: (valor: S | null | ((previo: S | null) => S | null)) => void,
): void {
    const docId = fuente?.docId;
    const vacia = Boolean(docId) && !fuente.texto && !fuente.pdf_url && !fuente.url_oficial;
    if (!docId || !vacia) { fijar(fuente); return; }
    const guardada = fichaEnCache(docId);
    if (guardada) { fijar({ ...guardada, docId } as unknown as S); return; }
    fijar({ ...fuente, origen: 'Buscando la fuente…', ref: '', texto: '' });
    void obtenerFicha(docId).then((ficha) => {
        fijar((actual) => {
            if (!actual || (actual as { docId?: string }).docId !== docId) return actual;
            if (ficha) return { ...ficha, docId } as unknown as S;
            const fallo = estadoDeFicha(docId) === 'fallo';
            return {
                ...fuente,
                origen: fallo ? 'No se pudo consultar la fuente' : 'Cita sin ficha de origen',
                ref: '',
                texto: fallo
                    ? 'El servidor no respondió al pedir esta fuente. Cierra el visor y vuelve a tocar la cita para reintentarlo.'
                    : 'Este identificador no corresponde a ningún documento del acervo. No des la cita por buena sin comprobarla.',
            };
        });
    });
}

type ConFuentes = { sources?: Record<string, unknown>; invalid?: number; invalid_ids?: string[] };

/** ¿Trae el mapa del mensaje la ficha de esta cita? (sin distinguir mayúsculas) */
export function tieneFuente(meta: ConFuentes | null | undefined, docId: string): boolean {
    const fuentes = meta?.sources;
    if (!fuentes) return false;
    if (fuentes[docId] || fuentes[docId.toLowerCase()]) return true;
    const id = docId.toLowerCase();
    return Object.keys(fuentes).some((k) => k.toLowerCase() === id);
}

/** Las citas del texto que el mapa del mensaje no trae. */
export function citasSinFuente(ids: Iterable<string>, meta: ConFuentes | null | undefined): string[] {
    return Array.from(ids).filter((id) => !tieneFuente(meta, id));
}

/** El mapa del mensaje con las fichas de `/cita` añadidas. Lo del servidor
 *  manda: una ficha resuelta nunca pisa una del mapa. */
export function conFichas<M extends ConFuentes>(meta: M | null, extra: Record<string, FichaCita>): M | null {
    if (!Object.keys(extra).length) return meta;
    const base = (meta ?? { valid: 0, invalid: 0, total: 0, invalid_ids: [] }) as M;
    return { ...base, sources: { ...extra, ...(base.sources || {}) } };
}

/**
 * Cuántas citas del texto están verificadas: las que tienen ficha —del mapa
 * o de `/cita`— y el servidor no marcó como fuera del contexto. Antes el pie
 * de la hoja contaba las entradas del mapa entero («33 citas · 60
 * verificadas») y la tarjeta del hilo sólo las singulares.
 */
export function resumenDeCitas(
    ids: Iterable<string>,
    meta: ConFuentes | null | undefined,
    estado: Record<string, EstadoFicha> = {},
): { verificadas: number; noTrazadas: number } {
    const invalidas = new Set((meta?.invalid_ids || []).map((x) => String(x).toLowerCase()));
    let verificadas = 0;
    let inexistentesEnTexto = 0;
    for (const bruto of Array.from(ids)) {
        const id = bruto.toLowerCase();
        if (invalidas.has(id)) continue;
        if (tieneFuente(meta, id)) verificadas++;
        else if (estado[id] === 'no_existe') inexistentesEnTexto++;
    }
    return { verificadas, noTrazadas: Math.max(meta?.invalid ?? 0, invalidas.size) + inexistentesEnTexto };
}
