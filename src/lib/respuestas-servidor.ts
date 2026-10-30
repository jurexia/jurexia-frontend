'use client';

import { API_URL, type Message } from './api';
import { supabase } from './supabase';
import { addMessageBatch, addMessageToConversation, generateTitle, unMsDespues } from './conversations';
import type { CopiaDeRespuesta, EstadoCopia, FuenteDeCopias } from './analisis-documento';

/**
 * LA RESPUESTA QUE EL SERVIDOR YA ESCRIBIÓ NO SE PIERDE (14-oct-2026).
 *
 * Hasta hoy el historial lo guardaba sólo esta página y sólo al terminar el
 * stream. Roberto perdió el 13/14-oct tres respuestas que el servidor terminó
 * sin error: su navegador las leyó hasta el final (pidió el contador de
 * consultas en el mismo segundo en que Render cerró cada respuesta) y no
 * guardó nada. Las conversaciones se quedaron vacías y la consulta siguiente
 * las borró por vacías.
 *
 * Ahora la API guarda su propia copia en `respuestas_chat` (ver
 * respuesta_guardada.py en la API) y aquí se usa de dos maneras:
 *
 *  · `reclamarRespuesta`: antes de guardar, la pestaña que terminó bien
 *    marca la copia como suya. Sólo un reclamo gana, así que si la
 *    recuperación ya la pasó al historial, la pestaña no la duplica.
 *  · `recuperarRespuestas`: al abrir el chat y al volver a la pestaña, lo
 *    terminado que nadie reclamó pasa al historial —recreando la
 *    conversación si hace falta—.
 *
 * Si la tabla aún no existe (la migración va aparte) o Supabase falla, todo
 * esto se aparta en silencio y el guardado sigue como antes.
 *
 * SIN TEXTO NO SE RECLAMA (28-oct-2026). La pestaña reclamaba aunque su
 * stream no hubiera traído nada —el abogado detuvo la consulta, cambió de
 * conversación o la red retuvo el flujo—, y la copia que el servidor terminaba
 * después ya no la recuperaba nadie. Así se perdieron en catorce días cuatro
 * respuestas de entre 29 y 74 mil caracteres; la del 26-oct a las 16:14 UTC,
 * tras Cisco Umbrella, se reclamó 38 s antes de que el servidor la terminara.
 * Ahora esa pestaña guarda sólo la pregunta, y la recuperación pone la
 * respuesta justo detrás, sin repetir la pregunta.
 */

/** Lo que la pestaña debe hacer con su respuesta. */
export type Reclamo =
    | 'mia'          // la copia es nuestra: guardar
    | 'ajena'        // ya la guardó otra pestaña o la recuperación: NO guardar
    | 'desconocida'; // sin copia en el servidor (o sin respuesta): guardar, como siempre

const ESPERA_RECLAMO_MS = 6_000;
/** Lo terminado hace menos de esto puede estar guardándolo su pestaña. */
const GRACIA_MS = 60_000;
const VENTANA_DIAS = 7;

export function nuevoId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Navegadores sin randomUUID (Safari < 15.4): v4 a mano.
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function conLimite<T>(promesa: PromiseLike<T>, ms: number, siVence: T): Promise<T> {
    return new Promise<T>((resolve) => {
        const reloj = setTimeout(() => resolve(siVence), ms);
        Promise.resolve(promesa).then(
            (v) => { clearTimeout(reloj); resolve(v); },
            () => { clearTimeout(reloj); resolve(siVence); },
        );
    });
}

export async function reclamarRespuesta(peticionId: string): Promise<Reclamo> {
    const intento = (async (): Promise<Reclamo> => {
        const { data, error } = await supabase
            .from('respuestas_chat')
            .update({ guardada_at: new Date().toISOString() })
            .eq('peticion_id', peticionId)
            .is('guardada_at', null)
            .select('peticion_id');
        if (error) return 'desconocida';
        if (data && data.length > 0) return 'mia';
        // Nadie la reclamó porque ya estaba reclamada… o porque no existe.
        const { data: fila, error: e2 } = await supabase
            .from('respuestas_chat')
            .select('guardada_at')
            .eq('peticion_id', peticionId)
            .maybeSingle();
        if (e2 || !fila) return 'desconocida';
        return fila.guardada_at ? 'ajena' : 'desconocida';
    })();
    return conLimite(intento, ESPERA_RECLAMO_MS, 'desconocida');
}

/**
 * ¿Ya pasó alguien esta copia al historial? Sin reclamarla: lo pregunta la
 * pestaña que terminó sin texto antes de guardar la pregunta sola, por si la
 * recuperación —en otra pestaña— ya guardó la pregunta con su respuesta.
 * Ante la duda, no: guardar la pregunta es lo de siempre.
 */
export async function copiaYaGuardada(peticionId: string): Promise<boolean> {
    const intento = (async () => {
        const { data, error } = await supabase
            .from('respuestas_chat')
            .select('guardada_at')
            .eq('peticion_id', peticionId)
            .maybeSingle();
        return !error && !!data?.guardada_at;
    })();
    return conLimite(intento, ESPERA_RECLAMO_MS, false);
}

const COLUMNAS_COPIA = 'peticion_id, conversation_id, expediente_id, estado_mx, pregunta, respuesta, estado, guardada_at';

/** Las copias de `respuestas_chat`, para la espera de `analizarDocumento`. */
export const copiasDelServidor: FuenteDeCopias = {
    async estado(peticionId) {
        const intento = (async () => {
            const { data, error } = await supabase
                .from('respuestas_chat')
                .select('estado')
                .eq('peticion_id', peticionId)
                .maybeSingle();
            return { estado: error ? null : ((data?.estado as EstadoCopia | undefined) ?? null), error: !!error };
        })();
        return conLimite(intento, ESPERA_RECLAMO_MS, { estado: null, error: true });
    },
    async completa(peticionId) {
        const intento = (async () => {
            const { data, error } = await supabase
                .from('respuestas_chat')
                .select(COLUMNAS_COPIA)
                .eq('peticion_id', peticionId)
                .maybeSingle();
            return error ? null : ((data as CopiaDeRespuesta | null) ?? null);
        })();
        return conLimite(intento, 20_000, null);
    },
};

interface FilaRespaldo {
    peticion_id: string;
    conversation_id: string | null;
    expediente_id: string | null;
    estado_mx: string | null;
    pregunta: string;
    respuesta: string | null;
    estado: 'terminada' | 'interrumpida';
    creada_at: string;
}

const NOTA_INCOMPLETA = '\n\n*[Respuesta incompleta — por favor intenta de nuevo]*';

/** El texto de una copia tal como se enseña y se guarda: si el servidor la
 *  dejó a medias, con la nota de siempre. Vacío si no hay nada que salvar. */
export function textoDeCopia(fila: Pick<CopiaDeRespuesta, 'respuesta' | 'estado'>): string {
    const texto = (fila.respuesta || '').trim();
    if (!texto) return '';
    return fila.estado === 'interrumpida' ? texto + NOTA_INCOMPLETA : texto;
}

/* LA PREGUNTA QUE LA PÁGINA YA GUARDÓ SOLA. Sin texto la página no reclama:
   guarda la pregunta y deja la respuesta a la recuperación. Para no repetirla,
   aquí se busca esa pregunta —la misma, guardada desde poco antes de que
   empezara la consulta— sin respuesta pegada. La de un par guardado de una vez
   comparte EXACTAMENTE su `created_at`, y la que pone la recuperación va
   EXACTAMENTE 1 ms detrás: no basta «cerca», porque lo siguiente que pregunta
   el abogado puede guardarse en el mismo milisegundo. */
const MARGEN_PREGUNTA_MS = 5_000;
/** El tope con que la API guarda la pregunta (TOPE_PREGUNTA, respuesta_guardada.py). */
const TOPE_PREGUNTA_SERVIDOR = 200_000;

function esLaMismaPregunta(guardada: string, delServidor: string): boolean {
    return guardada === delServidor
        || (delServidor.length >= TOPE_PREGUNTA_SERVIDOR && guardada.startsWith(delServidor));
}

async function preguntaGuardadaSola(convId: string, fila: FilaRespaldo): Promise<string | null> {
    const desde = new Date(Date.parse(fila.creada_at) - MARGEN_PREGUNTA_MS).toISOString();
    const { data, error } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', convId)
        .eq('role', 'user')
        .gte('created_at', desde)
        .order('created_at', { ascending: true })
        .limit(10);
    if (error || !data) return null;
    for (const m of data as { content: string; created_at: string }[]) {
        if (!esLaMismaPregunta(m.content, fila.pregunta)) continue;
        const { count, error: e2 } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('role', 'assistant')
            .in('created_at', [m.created_at, unMsDespues(m.created_at)]);
        if (!e2 && !count) return m.created_at;
    }
    return null;
}

/** La conversación de la copia, o una nueva con su mismo id si ya no existe. */
async function conversacionPara(fila: FilaRespaldo, userId: string): Promise<string | null> {
    if (fila.conversation_id) {
        const { data } = await supabase.from('conversations').select('id')
            .eq('id', fila.conversation_id).maybeSingle();
        if (data?.id) return data.id;
    }
    const { data, error } = await supabase.from('conversations').insert({
        ...(fila.conversation_id ? { id: fila.conversation_id } : {}),
        user_id: userId,
        title: generateTitle(fila.pregunta),
        estado: fila.estado_mx,
        expediente_id: fila.expediente_id,
    }).select('id').single();
    if (!error && data?.id) return data.id;
    // Sin la columna de carpeta (o con una carpeta que ya no existe), sin ella.
    const sinCarpeta = await supabase.from('conversations').insert({
        ...(fila.conversation_id ? { id: fila.conversation_id } : {}),
        user_id: userId,
        title: generateTitle(fila.pregunta),
        estado: fila.estado_mx,
    }).select('id').single();
    return sinCarpeta.data?.id ?? null;
}

let recuperando: Promise<string[]> | null = null;

/**
 * Pasa al historial lo que el servidor terminó y ninguna pestaña guardó.
 * Devuelve las conversaciones tocadas (para refrescar la barra y, si es la
 * abierta, recargarla). Nunca lanza.
 */
export function recuperarRespuestas(): Promise<string[]> {
    if (recuperando) return recuperando;
    recuperando = (async () => {
        const tocadas = new Set<string>();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) return [];
            const hasta = new Date(Date.now() - GRACIA_MS).toISOString();
            const desde = new Date(Date.now() - VENTANA_DIAS * 86_400_000).toISOString();
            const { data, error } = await supabase
                .from('respuestas_chat')
                .select('peticion_id, conversation_id, expediente_id, estado_mx, pregunta, respuesta, estado, creada_at')
                .eq('user_id', userId)
                .is('guardada_at', null)
                .in('estado', ['terminada', 'interrumpida'])
                .lt('terminada_at', hasta)
                .gt('creada_at', desde)
                .order('creada_at', { ascending: true })
                .limit(20);
            if (error || !data?.length) return [];

            for (const fila of data as FilaRespaldo[]) {
                const texto = textoDeCopia(fila);
                /* Sin nada escrito no hay nada que salvar, y se reclama igual:
                   desde que la pestaña sin texto ya no reclama, estas copias se
                   quedarían para siempre entre las 20 que se miran aquí, por
                   delante de las que sí tienen respuesta. */
                if (!texto) {
                    await reclamarRespuesta(fila.peticion_id);
                    continue;
                }
                if ((await reclamarRespuesta(fila.peticion_id)) !== 'mia') continue;
                const convId = await conversacionPara(fila, userId);
                if (!convId) continue;
                const respuesta: Message = { role: 'assistant', content: texto };
                // Si esto falla, addMessage* lo deja en localStorage y
                // `recoverPendingMessages` lo reintenta: la copia ya está
                // reclamada y no se vuelve a intentar desde aquí.
                const sola = await preguntaGuardadaSola(convId, fila);
                if (sola) {
                    // La pregunta ya está: la respuesta, justo detrás de ella.
                    await addMessageToConversation(convId, respuesta, { creadaEn: unMsDespues(sola) });
                } else {
                    // El par entero, en el sitio de la conversación en que se preguntó.
                    await addMessageBatch(convId, { role: 'user', content: fila.pregunta }, respuesta,
                        { creadaEn: fila.creada_at });
                }
                tocadas.add(convId);
                console.info(`[respaldo] respuesta recuperada del servidor → ${convId.slice(0, 8)}…`);
            }
        } catch (err) {
            console.warn('[respaldo] no se pudo recuperar:', err);
        }
        return Array.from(tocadas);
    })().finally(() => { recuperando = null; });
    return recuperando;
}

/* ═══ DÓNDE SE ATORA EL ENVÍO ═══
   El 14-oct a las 05:10 y a las 05:16 la página de Roberto creó la
   conversación, pintó «Leyendo la consulta…» y NUNCA mandó el /chat. Entre el
   clic y el fetch hay varias esperas —la sesión, la cuota, la carpeta— y desde
   fuera no se ve cuál se colgó. Cuando una se pasa de la raya, se avisa a la
   API, que lo deja en sus registros («⏳ ENVIO_TRABADO etapa=…»). Texto plano
   y `sendBeacon`: sin preflight, y sale aunque la pestaña se esté cerrando. */
export type EtapaEnvio = 'sesion' | 'cuota' | 'contexto' | 'fetch' | 'primer_trozo' | 'lectura' | 'guardado';

export function avisarTraba(etapa: EtapaEnvio, ms: number, datos: { peticionId?: string; userId?: string } = {}) {
    try {
        const cuerpo = JSON.stringify({
            etapa,
            ms: Math.round(ms),
            peticion_id: datos.peticionId,
            user_id: datos.userId,
            oculta: typeof document !== 'undefined' && document.visibilityState === 'hidden',
        });
        const url = `${API_URL}/chat/traba`;
        if (typeof navigator !== 'undefined' && navigator.sendBeacon
            && navigator.sendBeacon(url, new Blob([cuerpo], { type: 'text/plain' }))) return;
        void fetch(url, { method: 'POST', body: cuerpo, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
            .catch(() => { /* sólo es un aviso */ });
    } catch { /* sólo es un aviso */ }
    console.warn(`[envío] «${etapa}» lleva ${Math.round(ms / 1000)} s`);
}

/**
 * Espera `promesa`, pero no para siempre: si a los `ms` sigue sin resolver,
 * avisa la traba y sigue con `siVence`. La promesa original no se cancela;
 * si llega tarde, simplemente ya no se usa.
 */
export function esperaConAviso<T>(
    promesa: PromiseLike<T>, ms: number, siVence: T, etapa: EtapaEnvio,
    datos: { peticionId?: string; userId?: string } = {},
): Promise<T> {
    const inicio = Date.now();
    return new Promise<T>((resolve, reject) => {
        const reloj = setTimeout(() => {
            avisarTraba(etapa, Date.now() - inicio, datos);
            resolve(siVence);
        }, ms);
        Promise.resolve(promesa).then(
            (v) => { clearTimeout(reloj); resolve(v); },
            (e) => { clearTimeout(reloj); reject(e); },
        );
    });
}

/**
 * La sesión guardada por supabase-js, leída directo del almacenamiento: sin
 * pasar por el candado de la sesión, que es justo lo que puede estar colgado.
 * Sólo se usa si `getSession()` no contesta.
 */
export function sesionDelAlmacen(): { access_token: string; user: { id: string; email?: string } } | null {
    try {
        const crudo = localStorage.getItem('iurexia-auth');
        if (!crudo) return null;
        const s = JSON.parse(crudo);
        const sesion = s?.currentSession ?? s;
        if (!sesion?.access_token || !sesion?.user?.id) return null;
        if (typeof sesion.expires_at === 'number' && sesion.expires_at * 1000 < Date.now()) return null;
        return sesion;
    } catch {
        return null;
    }
}
