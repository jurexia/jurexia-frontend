'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, streamChat, SearchResult, fuentesWebActivas, CorteDeRed } from '@/lib/api';
import { unirRecorrido } from '@/lib/fuentes';
import { getSession } from '@/lib/supabase';
import { checkCanQuery, getSubscriptionInfo } from '@/lib/supabase';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import {
    avisarTraba, esperaConAviso, sesionDelAlmacen,
    copiasDelServidor, detenerEnServidor, existeCopia, textoDeCopia,
} from '@/lib/respuestas-servidor';
import { esFalloDeRed, esperarCopia, TIEMPOS } from '@/lib/analisis-documento';

/** Lo que identifica un envío ante la API, que guarda su propia copia de la
 *  respuesta con esto (14-oct-2026). Ver `@/lib/respuestas-servidor`. */
export interface DatosEnvio {
    peticionId: string;
    conversationId?: string | null;
    expedienteId?: string | null;
}

/* CUÁNTO SE ESPERA ANTES DE SALIR SIN ESO (14-oct-2026). Antes del fetch hay
   tres esperas y ninguna tenía tope: si una se colgaba, la consulta no salía
   nunca y la pantalla se quedaba en «Leyendo la consulta…» (Roberto, 05:10 y
   05:16 UTC: conversación creada, cero peticiones a la API). Ahora, pasado el
   tope, se avisa a la API dónde se atoró y la consulta sale igual: sin la
   sesión del candado (se lee la guardada), sin la comprobación de cuota (el
   servidor la vuelve a hacer y es el que cobra) o sin la carpeta (como cuando
   armarla falla). */
const TOPE_SESION_MS = 8_000;
const TOPE_CUOTA_MS = 8_000;
const TOPE_CONTEXTO_MS = 15_000;
/** Sin un solo trozo durante esto, la lectura se da por atorada (sólo se avisa). */
const TOPE_LECTURA_MS = 120_000;

interface UseChatOptions {
    estado?: string;
    topK?: number;
    fuero?: string[];  // Filtro por fuero: multi-select ['constitucional', 'federal', 'estatal']
    onQuotaExceeded?: (remaining: number) => void;
    onQueryCompleted?: (used: number, limit: number) => void;  // Sync counter with DB after each query
    genioIds?: string[];  // IDs de los genios activos: ['amparo', 'mercantil'], etc.
    onCacheActive?: () => void;  // Fired when backend confirms cache is serving
    /** La carpeta y el flujo de la consulta, como mensaje de sistema (25-sep-2026).
     *  Se pide en cada envío y se antepone SÓLO a lo que viaja al servidor: no
     *  entra al estado, así que ni se pinta en el hilo ni se guarda en el
     *  historial. `primerTurno` es verdadero si aún no hay ninguna respuesta. */
    contextoSistema?: (primerTurno: boolean) => Promise<string | null>;
    /** Si devuelve verdadero, el envío lee TODO el acervo aunque el selector
     *  «Fuentes» tenga algo apagado (lo usan los flujos de trabajo). */
    todoElAcervo?: () => boolean;
    /** Si devuelve verdadero, el envío no descuenta consultas: va sin
     *  `user_id` (el servidor sólo cobra cuando lo recibe). Lo usan las partes
     *  de un flujo, que ya se pagó con UN flujo del mes al empezar. */
    sinCobro?: () => boolean;
    /** La red retuvo la respuesta y la soltó entera al final (28-oct-2026):
     *  el primer trozo —el servidor manda uno al instante— tardó medio minuto
     *  y lo demás llegó de golpe. Ver `AvisoRedRetiene`. */
    onRedRetuvo?: () => void;
}

/* Lo que delata a una red que retiene: el primer trozo tarde, y el resto
   enseguida detrás de él. */
const RETENCION_PRIMER_TROZO_MS = 30_000;
const RETENCION_RAFAGA_MS = 3_000;

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    /** Devuelve el texto FINAL de la respuesta, o null si no llegó ninguna.
     *  Quien guarda el historial usa este valor y no el estado de React: leer
     *  el estado después del stream dependía de que el último mensaje fuera
     *  exactamente el del asistente, y cuando no lo era el historial se
     *  quedaba con la pregunta y sin la respuesta. */
    sendMessage: (content: string, enableReasoning?: boolean, envio?: DatosEnvio) => Promise<string | null>;
    stopGeneration: () => void;
    /** ¿La red cortó esa respuesta y quedó para la recuperación? Ver `sendMessage`. */
    seCortoLaRed: (peticionId: string) => boolean;
    clearMessages: () => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    retryMessage: string | null;  // New field for retry status
    retryType: string | null;     // 'cold' | 'busy' | null
    /** Fuentes halladas por el RAG en la consulta EN CURSO — viene del marcador
     *  <!--SOURCES:n--> del backend. null mientras la búsqueda no termina;
     *  se resetea a null al enviar la siguiente consulta. */
    sourcesCount: number | null;
    /** Etapas reales del pipeline, en orden de llegada (<!--PASO:nombre|detalle-->). */
    pasos: Paso[];
    /** Vacía los pasos de la ramificación (el análisis de documento no pasa por sendMessage). */
    limpiarPasos: () => void;
}

export type Paso = { nombre: string; detalle?: string };

// Thinking marker used by the backend to separate reasoning from content.
// This marker can be SPLIT across TCP chunk boundaries, so we use a
// buffer-based parser to handle partial markers safely.
const THINKING_MARKER = '<!--thinking-->';
// Centinela explícito de cierre. El backend lo emite exactamente una vez,
// cuando el razonamiento terminó y empieza la respuesta. Con él la transición
// deja de adivinarse: antes el parser suponía que «texto sin marcador» era ya
// la respuesta, y un corte del proxy en el lugar equivocado partía cada token
// de razonamiento en dos — mitad al panel, mitad al cuerpo (31-jul-2026).
const THINKING_END_MARKER = '<!--/thinking-->';

// The longest possible partial marker prefix is len(marker) - 1
const MARKER_LEN = Math.max(THINKING_MARKER.length, THINKING_END_MARKER.length);

/**
 * Parser determinista del protocolo de razonamiento en vivo.
 *
 * Protocolo del backend (cuando el cliente manda `X-Razonamiento-Vivo: 1`):
 * - Cada trozo de razonamiento llega como: <!--thinking-->TEXTO
 * - Al terminar el razonamiento llega UNA vez: <!--/thinking-->
 * - Todo lo posterior es la respuesta, sin prefijos.
 *
 * Reglas:
 * - Antes del primer <!--thinking-->: todo es respuesta (modo bloque clásico,
 *   incluidos los bloques <!--THINKING_START-->…<!--THINKING_END--> que pinta
 *   ChatMessage; este parser no los toca).
 * - Entre <!--thinking--> y <!--/thinking-->: TODO es razonamiento; los
 *   marcadores <!--thinking--> intermedios sólo se descartan. Nada de
 *   adivinar transiciones.
 * - Después de <!--/thinking-->: todo es respuesta.
 * - Una posible cola de marcador partido se retiene hasta el siguiente chunk.
 */
class ThinkingParser {
    thinking = '';
    content = '';
    private pending = '';
    private reasoningPhase = false;

    /** Feed a new chunk from the stream. */
    feed(chunk: string): void {
        this.pending += chunk;
        this.drain(false);
    }

    /** Call when the stream is done to flush any remaining buffered text. */
    finish(): void {
        this.drain(true);
    }

    private drain(isFinal: boolean): void {
        while (this.pending) {
            if (!this.reasoningPhase) {
                const idx = this.pending.indexOf(THINKING_MARKER);
                if (idx !== -1) {
                    // Todo lo anterior al primer marcador es respuesta.
                    this.content += this.pending.slice(0, idx);
                    this.pending = this.pending.slice(idx + THINKING_MARKER.length);
                    this.reasoningPhase = true;
                    continue;
                }
                // Sin marcador: retener sólo una posible cola partida.
                const hold = isFinal ? this.pending.length : this.holdFrom();
                this.content += this.pending.slice(0, hold);
                this.pending = this.pending.slice(hold);
                return;
            }

            // Fase de razonamiento: buscar el cierre y descartar los prefijos.
            const fin = this.pending.indexOf(THINKING_END_MARKER);
            const sig = this.pending.indexOf(THINKING_MARKER);

            if (fin !== -1 && (sig === -1 || fin <= sig)) {
                this.thinking += this.pending.slice(0, fin);
                this.pending = this.pending.slice(fin + THINKING_END_MARKER.length);
                this.reasoningPhase = false;
                continue;
            }
            if (sig !== -1) {
                // Otro prefijo de token: lo anterior es razonamiento.
                this.thinking += this.pending.slice(0, sig);
                this.pending = this.pending.slice(sig + THINKING_MARKER.length);
                continue;
            }
            // Sin marcadores completos: todo es razonamiento salvo una posible
            // cola de marcador partido.
            const hold = isFinal ? this.pending.length : this.holdFrom();
            this.thinking += this.pending.slice(0, hold);
            this.pending = this.pending.slice(hold);
            return;
        }
    }

    /** Posición desde la cual la cola podría ser el inicio de un marcador. */
    private holdFrom(): number {
        const start = Math.max(0, this.pending.length - (MARKER_LEN - 1));
        for (let i = start; i < this.pending.length; i++) {
            const tail = this.pending.slice(i);
            if (THINKING_MARKER.startsWith(tail) || THINKING_END_MARKER.startsWith(tail)) {
                return i;
            }
        }
        return this.pending.length;
    }

    /** Build the display string for the assistant message. */
    getDisplayContent(): string {
        let display = '';
        if (this.thinking) {
            display += `<!--THINKING_START-->${this.thinking}<!--THINKING_END-->`;
        }
        display += this.content;
        return display;
    }
}


/**
 * Quita el mapa de fuentes que el backend adelanta durante el stream.
 *
 * `CITATION_META` SÍ se conserva: es el mapa definitivo y sin él, al reabrir
 * una conversación vieja, las citas se quedan sin panel.
 */
function quitarFuentesPrevias(texto: string): string {
    if (!texto.includes('<!-- FUENTES_PREVIAS:')) return texto;
    return texto.replace(/\n*<!-- FUENTES_PREVIAS:[\s\S]*?-->\n*/g, '\n\n').trim();
}

/* Las notas que lleva la burbuja cuando la red corta la respuesta (30-oct-2026).
   Van en cursiva al final, como la de siempre, y se sustituyen unas a otras. */
const NOTA_INCOMPLETA = '\n\n*[Respuesta incompleta — por favor intenta de nuevo]*';
const AVISO_CORTE_ESPERANDO = '\n\n*Se cortó la conexión. Iurexia sigue escribiendo tu respuesta en el servidor; '
    + 'la traemos en cuanto termine.*';
const AVISO_CORTE_SIGUE = '\n\n*Se cortó la conexión, pero tu respuesta se sigue escribiendo en el servidor. '
    + 'Aparecerá en esta conversación en cuanto termine: no hace falta volver a pedirla.*';
const NOTAS_DE_CORTE = [NOTA_INCOMPLETA, AVISO_CORTE_ESPERANDO, AVISO_CORTE_SIGUE];

function ponerAviso(setMessages: React.Dispatch<React.SetStateAction<Message[]>>, nota: string) {
    setMessages(prev => {
        const nuevos = [...prev];
        const last = nuevos[nuevos.length - 1];
        if (last?.role === 'assistant') {
            let base = last.content;
            for (const n of NOTAS_DE_CORTE) if (base.endsWith(n)) base = base.slice(0, -n.length);
            nuevos[nuevos.length - 1] = { ...last, content: base + nota };
        } else {
            nuevos.push({ role: 'assistant', content: nota.trim() });
        }
        return nuevos;
    });
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryMessage, setRetryMessage] = useState<string | null>(null);
    const [retryType, setRetryType] = useState<string | null>(null);
    const [sourcesCount, setSourcesCount] = useState<number | null>(null);
    const [pasos, setPasos] = useState<Paso[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    // FIX 2026-05-22: Ref-based mutex to prevent duplicate simultaneous sends.
    // React batches state updates, so two rapid clicks can both see isLoading=false
    // before the first setIsLoading(true) executes. A ref check is synchronous.
    const sendingRef = useRef(false);

    /* La consulta que está saliendo, para que Detener se lo diga al servidor. */
    const peticionEnCursoRef = useRef<string | null>(null);
    /* Las respuestas que la red cortó y quedaron en el servidor. */
    const cortesDeRedRef = useRef<Set<string>>(new Set());
    const seCortoLaRed = useCallback((peticionId: string) => cortesDeRedRef.current.has(peticionId), []);

    const stopGeneration = useCallback(() => {
        /* DETENER SE LE DICE AL SERVIDOR (30-oct-2026). Desde ese día la API
           sigue escribiendo aunque la pantalla se desconecte: cortar la
           conexión ya no es pedirle que pare. Ver `detenerEnServidor`. */
        void detenerEnServidor(peticionEnCursoRef.current);
        abortControllerRef.current?.abort();
    }, []);

    const sendMessage = useCallback(async (content: string, _enableReasoning = true, envio?: DatosEnvio): Promise<string | null> => {
        // El texto que acabe teniendo la respuesta. Se devuelve al final pase
        // lo que pase: si el stream se corta a medias, quien guarda decide qué
        // hacer con lo que hubiera, en vez de perderlo.
        let respuestaFinal: string | null = null;
        const enableReasoning = false; // Disabled: Query Expansion was diluting BM25 precision
        if (!content.trim() || isLoading || sendingRef.current) return null;
        sendingRef.current = true;

        // Cancel any in-flight request before starting a new one
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setError(null);
        setIsLoading(true);
        peticionEnCursoRef.current = envio?.peticionId ?? null;
        setRetryMessage(null);  // Reset retry message
        setRetryType(null);
        setSourcesCount(null);
        // Nueva consulta: la cuenta de fuentes vuelve a cero. Si el globo está
        // encendido, la etapa de internet se siembra DESDE YA: el abogado ve
        // «Buscando en internet» al instante en la ramificación, y el backend
        // la va actualizando con los dominios reales conforme llegan. Antes la
        // etapa aparecía hasta el primer resultado (~5s) y con respuestas
        // rápidas nunca alcanzaba a verse.
        setPasos(fuentesWebActivas() ? [{ nombre: 'web', detalle: '__buscando__' }] : []);

        // Add user message
        const userMessage: Message = { role: 'user', content };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        let assistantMessageAdded = false;
        let vigilaLectura: ReturnType<typeof setInterval> | null = null;
        try {
            const aviso = { peticionId: envio?.peticionId };
            // Get Supabase session for auth token
            const session = (await esperaConAviso(getSession(), TOPE_SESION_MS, null, 'sesion', aviso))
                ?? sesionDelAlmacen();
            const accessToken = session?.access_token;
            const sinCobro = options.sinCobro?.() ?? false;
            const userId = sinCobro ? undefined : session?.user?.id;
            const avisoUsuario = { ...aviso, userId: session?.user?.id };

            // ── Quota enforcement ──
            const isAdminUser = isAdmin(session?.user?.email);
            if (userId && !isAdminUser) {
                const { canQuery, remaining } = await esperaConAviso(
                    checkCanQuery(userId), TOPE_CUOTA_MS, { canQuery: true, remaining: 1 }, 'cuota', avisoUsuario);
                if (!canQuery) {
                    // Remove the user message we just added
                    setMessages(messages);
                    setIsLoading(false);
                    options.onQuotaExceeded?.(remaining);
                    return null;
                }
            }

            let parser = new ThinkingParser();
            let isProMode = false;
            let isPlatinumMode = false;
            let isProfesionalMode = false;
            // Registros citados que NO venían en el acervo. El backend los
            // detecta comparando contra el contexto recuperado; aquí se
            // recogen para que el sello los señale.
            let registrosFuera: string[] = [];

            /* Cola para marcadores partidos entre trozos.
               El backend emite `<!--PASO:web|scjn.gob.mx-->` de una vez, pero la
               red no respeta esas fronteras: un trozo puede acabar en
               `<!--PASO:web|scjn.` y el siguiente empezar en `gob.mx-->`. Sin
               esta cola ninguna de las dos mitades casa con la expresión
               regular, así que la etapa se pierde Y sus restos se cuelan como
               texto en la respuesta. Pasó en las pruebas contra producción.

               Se retiene sólo lo que hay tras un `<!--` sin cerrar, y se limita
               a 200 caracteres para que un `<` suelto en el texto jurídico no
               congele el stream entero. */
            let colaMarcador = '';

            // La carpeta y el flujo viajan delante, como sistema. Si armarlos
            // falla, la consulta sale sin ellos: nunca se queda sin enviar.
            let paraEnviar: Message[] = updatedMessages;
            if (options.contextoSistema) {
                try {
                    const contexto = await esperaConAviso(
                        options.contextoSistema(!messages.some(m => m.role === 'assistant')),
                        TOPE_CONTEXTO_MS, null, 'contexto', avisoUsuario);
                    if (contexto) paraEnviar = [{ role: 'system', content: contexto }, ...updatedMessages];
                } catch (errCtx) {
                    console.warn('[useChat] contexto de carpeta omitido:', errCtx);
                }
            }

            /* La lectura atorada sólo se AVISA: cortarla perdería lo que aún
               pueda llegar. Si la página nunca la termina, la copia del
               servidor queda para la recuperación. */
            let ultimoTrozo = Date.now();
            let lecturaAvisada = false;
            let inicioFlujo = Date.now();
            let primerTrozo = 0;
            vigilaLectura = setInterval(() => {
                if (!lecturaAvisada && Date.now() - ultimoTrozo > TOPE_LECTURA_MS) {
                    lecturaAvisada = true;
                    avisarTraba('lectura', Date.now() - ultimoTrozo, avisoUsuario);
                }
            }, 30_000);

            const pidCopia = envio?.peticionId;
            for await (let chunk of streamChat(
                paraEnviar,
                options.estado,
                options.topK,
                accessToken,
                enableReasoning,
                userId,
                options.fuero?.length ? options.fuero.join(',') : undefined,
                options.genioIds,
                signal,
                {
                    todoElAcervo: options.todoElAcervo?.() ?? false,
                    peticionId: envio?.peticionId,
                    conversationId: envio?.conversationId,
                    expedienteId: envio?.expedienteId,
                    ...(pidCopia ? { copiaEnServidor: () => existeCopia(pidCopia) } : {}),
                },
            )) {
                ultimoTrozo = Date.now();
                // El marcador de reintento lo pone streamChat, no el servidor: el
                // reloj de la retención vuelve a empezar con el envío nuevo.
                if (chunk.startsWith('<!--RETRY:')) { inicioFlujo = ultimoTrozo; primerTrozo = 0; }
                else if (!primerTrozo) primerTrozo = ultimoTrozo;
                // Filter keepalive heartbeat from backend (<!--PING-->)
                // This is sent immediately to prevent mobile carriers from
                // closing the TCP connection when no data flows for >15s.
                if (chunk === '<!--PING-->' || chunk.trim() === '<!--PING-->') continue;

                // Se antepone lo retenido y se vuelve a retener la cola si el
                // trozo termina con un marcador a medio cerrar.
                if (colaMarcador) { chunk = colaMarcador + chunk; colaMarcador = ''; }
                const abre = chunk.lastIndexOf('<!--');
                if (abre !== -1 && chunk.indexOf('-->', abre) === -1) {
                    const cola = chunk.slice(abre);
                    if (cola.length <= 200) { colaMarcador = cola; chunk = chunk.slice(0, abre); }
                }
                if (!chunk) continue;

                // <!--SOURCES:n--> — el backend lo emite al terminar la búsqueda,
                // ANTES del primer token de respuesta. Antes de capturarlo aquí,
                // el marcador caía al parser como contenido: creaba el mensaje
                // del asistente con solo un comentario invisible y mataba el
                // indicador de espera antes de tiempo. Ahora alimenta la línea
                // del flujo del agente (FlujoAgente) y se retira del stream.
                const sourcesMatch = chunk.match(/<!--SOURCES:(\d+)-->/);
                if (sourcesMatch) {
                    setSourcesCount(parseInt(sourcesMatch[1], 10));
                    const remaining = chunk.replace(sourcesMatch[0], '');
                    if (!remaining.trim()) continue;
                    chunk = remaining;
                }

                // <!--PASO:nombre--> o <!--PASO:nombre|detalle--> — cada etapa
                // real del pipeline, emitida desde el punto exacto donde ocurre.
                // Pueden venir VARIOS en un mismo chunk (el backend vacía su cola
                // de golpe), así que se recorren todos en vez de tomar el primero.
                if (chunk.includes('<!--PASO:')) {
                    const nuevos: Paso[] = [];
                    chunk = chunk.replace(/<!--PASO:([^|>]+)(?:\|([^>]*))?-->/g, (_m, nombre, detalle) => {
                        nuevos.push({ nombre: String(nombre).trim(), detalle: detalle || undefined });
                        return '';
                    });
                    if (nuevos.length) {
                        // Si una etapa se repite (reintento), se queda la última:
                        // su detalle es el bueno. Salvo «buscar»: llega una vez
                        // por cada búsqueda de la consulta —la principal y las
                        // secundarias— y lo recorrido es la UNIÓN de todas. Con
                        // la última, una búsqueda constitucional secundaria
                        // borraba de la pantalla la federal principal.
                        setPasos((prev) => {
                            const mapa = new Map(prev.map((x) => [x.nombre, x]));
                            nuevos.forEach((x) => {
                                const antes = mapa.get(x.nombre);
                                mapa.set(x.nombre, x.nombre === 'buscar' && antes?.detalle && x.detalle
                                    ? { ...x, detalle: unirRecorrido(antes.detalle, x.detalle) }
                                    : x);
                            });
                            return Array.from(mapa.values());
                        });
                    }
                    if (!chunk.trim()) continue;
                }

                // Check for cache active marker: <!--CACHE:ACTIVE-->
                const cacheMatch = chunk.match(/<!--CACHE:ACTIVE-->/);
                if (cacheMatch) {
                    options.onCacheActive?.();
                    // Strip the marker and continue with remaining content
                    const remaining = chunk.replace('<!--CACHE:ACTIVE-->', '');
                    if (!remaining.trim()) continue;
                    // If there's content after the marker, process it below
                }

                // Escalón de redacción: <!--MODE:PRO--> o <!--MODE:PLATINUM-->
                // Platinum también marca Pro para que el resto del código que ya
                // distingue "respuesta de redacción avanzada" siga funcionando.
                if (chunk.includes('<!--MODE:PLATINUM-->')) {
                    isProMode = true;
                    isPlatinumMode = true;
                    const remaining = chunk.replace('<!--MODE:PLATINUM-->', '');
                    if (!remaining.trim()) continue;
                }

                if (chunk.includes('<!--MODE:PRO-->')) {
                    isProMode = true;
                    const remaining = chunk.replace('<!--MODE:PRO-->', '');
                    if (!remaining.trim()) continue;
                }

                // Escalón base. Se captura para que TODA respuesta de redacción
                // diga con qué motor se escribió, no sólo las de pago.
                if (chunk.includes('<!--MODE:PROFESIONAL-->')) {
                    isProfesionalMode = true;
                    const remaining = chunk.replace('<!--MODE:PROFESIONAL-->', '');
                    if (!remaining.trim()) continue;
                }

                const fuera = chunk.match(/<!--REGISTROS_FUERA:([^>]*)-->/);
                if (fuera) {
                    registrosFuera = fuera[1].split(',').map(x => x.trim()).filter(Boolean);
                    const resto = chunk.replace(/<!--REGISTROS_FUERA:[^>]*-->/, '');
                    if (!resto.trim()) continue;
                }

                // Check if this is a retry marker: <!--RETRY:1:2000:cold--> or <!--RETRY:1:2000-->
                const retryMatch = chunk.match(/<!--RETRY:(\d+):(\d+)(?::(\w+))?-->/);
                if (retryMatch) {
                    const attempt = parseInt(retryMatch[1]);
                    const delay = parseInt(retryMatch[2]);
                    const retryType = retryMatch[3] || 'cold'; // backward compat
                    setRetryMessage(`Intento ${attempt + 1}/3 — se reenvía en ${delay / 1000} s`);
                    setRetryType(retryType);
                    /* EL REINTENTO EMPIEZA DE CERO (30-sep-2026). Si la conexión se
                       cortó a media respuesta, el reintento trae la respuesta
                       ENTERA otra vez, y con el analizador lleno se pegaba detrás
                       de la mitad que ya se veía. Además, con esa burbuja a medias
                       en pantalla el aviso de reintento ni se mostraba: la página
                       sólo lo pinta mientras no hay respuesta. */
                    parser = new ThinkingParser();
                    colaMarcador = '';
                    registrosFuera = [];
                    if (assistantMessageAdded) {
                        setMessages(prev => (prev.length && prev[prev.length - 1].role === 'assistant')
                            ? prev.slice(0, -1) : prev);
                        assistantMessageAdded = false;
                    }
                    continue;  // Don't feed retry markers to the parser
                }

                // Feed chunk to the buffer-based parser (handles split markers)
                parser.feed(chunk);

                const displayContent = parser.getDisplayContent();

                // El mensaje del asistente se crea con el primer contenido REAL,
                // no con el primer trozo.
                //
                // Antes bastaba con que llegara un trozo —aunque sólo trajera
                // marcadores— para insertar una burbuja VACÍA. Eso causaba las
                // dos cosas que David reportaba a la vez: se veía un óvalo
                // blanco junto al icono («el globito»), y como el último
                // mensaje pasaba a ser del asistente, el flujo ramificado se
                // ocultaba de golpe — antes incluso de que llegaran las etapas
                // de internet. Por eso «no veo el flujo ni las fuentes».
                if (!displayContent.trim() && !assistantMessageAdded) continue;

                // Add assistant message on first chunk
                if (!assistantMessageAdded) {
                    setMessages(prev => [...prev, { role: 'assistant', content: displayContent, isPro: isProMode, isPlatinum: isPlatinumMode, isProfesional: isProfesionalMode, registrosFuera }]);
                    assistantMessageAdded = true;
                } else {
                    // Update existing assistant message
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = {
                            role: 'assistant',
                            content: displayContent,
                            isPro: isProMode,
                            isPlatinum: isPlatinumMode,
                            isProfesional: isProfesionalMode,
                            registrosFuera,
                        };
                        return newMessages;
                    });
                }
            }

            // Flush any remaining buffered text
            parser.finish();

            if (primerTrozo && primerTrozo - inicioFlujo >= RETENCION_PRIMER_TROZO_MS
                && ultimoTrozo - primerTrozo <= RETENCION_RAFAGA_MS) {
                options.onRedRetuvo?.();
            }

            // Final update — also handle edge case where thinking produced
            // reasoning but ZERO content (model exhausted max_tokens in reasoning)
            let finalDisplay = parser.getDisplayContent();
            if (parser.thinking && !parser.content.trim()) {
                // The model used all tokens on reasoning with no answer.
                // Surface the reasoning as actual content so user isn't left empty.
                finalDisplay = parser.getDisplayContent();
                // Append a visible fallback so the user isn't left staring at nothing
                const fallback = '\n\n*El modelo agotó los tokens durante el razonamiento. ' +
                    'El análisis completo se encuentra en la pestaña "Ver razonamiento jurídico" arriba. ' +
                    'Puedes enviar un mensaje de seguimiento para obtener la respuesta final.*';
                finalDisplay += fallback;
            }

            // Se CONSERVA el resto del mensaje y sólo se sustituye el texto.
            //
            // Esta actualización reescribía el objeto entero con {role, content}
            // y borraba todo lo demás: `registrosFuera`, `isPro`, `isPlatinum` e
            // `isProfesional`. Como es la última que corre, ganaba siempre.
            //
            // Consecuencia real (detectada el 10-ago-2026): el backend detectaba
            // los registros citados que no venían en el contexto —28 respuestas
            // y 50 registros en dos días— y el sello estaba preparado para
            // marcarlos, pero el aviso moría aquí y el abogado no veía NADA.
            // Uno de ellos canceló tres minutos después de recibir dos de esas
            // respuestas. También se perdía la etiqueta del motor en cada
            // respuesta terminada.
            //
            // `registrosFuera` se pasa explícitamente porque su marcador llega
            // en un trozo propio al final del stream: la rama que lo lee hace
            // `continue` y nunca alcanza el setMessages de dentro del bucle.
            // El mapa previo de fuentes sale del mensaje EN CUANTO termina el
            // stream, y sale del ESTADO, no sólo de lo que se guarda.
            //
            // `FUENTES_PREVIAS` es el acervo que el backend adelanta para que
            // las citas se puedan abrir mientras la respuesta se escribe. Al
            // cerrar el stream llega `CITATION_META` con el texto íntegro y los
            // alias, y la pantalla ya prefiere ése: a partir de aquí el previo
            // es peso muerto por duplicado.
            //
            // Limpiarlo sólo al persistir no bastaba. Lo que se ENVÍA en el
            // turno siguiente se arma con `[...messages, userMessage]`, y
            // `messages` es este estado: dentro de una misma sesión el
            // navegador seguía subiendo el acervo entero en cada petición
            // —1.3 MB por turno— aunque en la base ya no quedara. Por eso se
            // limpia aquí, una sola vez, y de aquí salen las dos cosas.
            //
            // Durante el stream NO se toca: el contenido en vuelo conserva el
            // marcador y por eso las citas siguen abriéndose antes de que
            // termine la respuesta, que es para lo que se mandó.
            const finalLimpio = quitarFuentesPrevias(finalDisplay);

            if (assistantMessageAdded) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const ultimo = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = {
                        ...ultimo,
                        role: 'assistant',
                        content: finalLimpio,
                        registrosFuera,
                    };
                    return newMessages;
                });
            }

            // Clear retry message after successful response
            setRetryMessage(null);

            // Lo que de verdad se generó, para que el historial no tenga que
            // adivinarlo releyendo el estado de React.
            //
            // `FUENTES_PREVIAS` NO se guarda. Es el mapa de fuentes que el
            // backend adelanta para que las citas se puedan abrir mientras la
            // respuesta se escribe; cuando el stream termina llega
            // `CITATION_META` con el texto íntegro y los alias, y la pantalla
            // ya prefiere ése. Guardar los dos significaba arrastrar el mismo
            // acervo por duplicado: el mensaje medio del asistente pasó de
            // 10-70 mil caracteres a 201,655, y ese peso volvía al servidor
            // como historial en cada turno hasta reventar la ventana del
            // modelo (3-sep-2026, catorce abogados sin servicio en un día).
            //
            // `CITATION_META` SÍ se guarda: sin él, al reabrir una
            // conversación vieja las citas se quedan sin panel.
            respuestaFinal = assistantMessageAdded ? finalLimpio : null;

            // ── Sync UI counter with real DB values (backend already consumed the query) ──
            // SIN ESPERARLO (14-oct-2026): el contador no es motivo para
            // retrasar el guardado. En las tres respuestas que perdió Roberto,
            // esta lectura fue lo ÚLTIMO que hizo la página antes de no guardar.
            if (userId && !isAdminUser) {
                void getSubscriptionInfo(userId)
                    .then((info) => { if (info) options.onQueryCompleted?.(info.queriesUsed, info.queriesLimit); })
                    .catch((err) => console.error('Failed to sync query counter:', err));
            }
        } catch (err) {
            // User stopped the generation — clean exit, no error shown
            if ((err as Error)?.name === 'AbortError') {
                setRetryMessage(null);
                return null;
            }

            /* SE CORTÓ LA RED, NO LA RESPUESTA (30-oct-2026). Desde ese día el
               servidor termina lo pedido aunque la pantalla se vaya, y guarda su
               copia. Antes, aquí quedaba «[Respuesta incompleta — por favor
               intenta de nuevo]» y el abogado lo volvía a pedir (y a pagar): es
               lo que hizo Rubén Ávila el 29-oct con un análisis que el servidor
               sí había terminado. Ahora se espera la copia, como el análisis de
               documentos (`analizarDocumento`), sin soltar el «escribiendo»: si
               llega, es la respuesta; si el servidor sigue, queda para la
               recuperación, que la pone en su conversación al terminar. */
            const cortada = err instanceof CorteDeRed ? err.peticionId
                : (esFalloDeRed(err) && envio?.peticionId) ? envio.peticionId : null;
            if (cortada && !signal.aborted) {
                setRetryMessage(null);
                ponerAviso(setMessages, AVISO_CORTE_ESPERANDO);
                const r = await esperarCopia(cortada, copiasDelServidor, TIEMPOS,
                    Date.now() + TIEMPOS.topeCopia, signal);
                if (r.tipo === 'lista') {
                    const texto = textoDeCopia(r.fila);
                    if (texto) {
                        setMessages(prev => {
                            const nuevos = [...prev];
                            const last = nuevos[nuevos.length - 1];
                            if (last?.role === 'assistant') nuevos[nuevos.length - 1] = { ...last, content: texto };
                            else nuevos.push({ role: 'assistant', content: texto });
                            return nuevos;
                        });
                        setError(null);
                        respuestaFinal = texto;
                        return respuestaFinal;
                    }
                }
                if (r.tipo === 'en_curso') {
                    // Lo pasa al historial la recuperación (página del chat).
                    cortesDeRedRef.current.add(cortada);
                    ponerAviso(setMessages, AVISO_CORTE_SIGUE);
                    return null;
                }
                if (r.tipo === 'cancelada') {
                    // Detener durante la espera: ya se le dijo al servidor.
                    ponerAviso(setMessages, NOTA_INCOMPLETA);
                    return null;
                }
                // Sin copia: como antes.
                ponerAviso(setMessages, NOTA_INCOMPLETA);
                setError(err instanceof Error ? err.message : 'Error desconocido');
                return null;
            }

            const errMsg = err instanceof Error ? err.message : 'Error desconocido';
            setError(errMsg);
            setRetryMessage(null);
            // CRÍTICO: solo borrar mensajes si NO hubo respuesta parcial.
            // Si ya había texto generándose, preservarlo con nota.
            // Borrar siempre causaba el "reset de página" reportado por usuarios.
            if (!assistantMessageAdded) {
                setMessages(updatedMessages);
            } else {
                // Añadir nota discreta al final de la respuesta parcial
                setMessages(prev => {
                    const newMessages = [...prev];
                    const last = newMessages[newMessages.length - 1];
                    if (last?.role === 'assistant') {
                        newMessages[newMessages.length - 1] = {
                            ...last,
                            content: last.content + '\n\n*[Respuesta incompleta — por favor intenta de nuevo]*',
                        };
                    }
                    return newMessages;
                });
            }
        } finally {
            if (vigilaLectura) clearInterval(vigilaLectura);
            peticionEnCursoRef.current = null;
            setIsLoading(false);
            sendingRef.current = false;
        }
        return respuestaFinal;
    }, [messages, isLoading, options.estado, options.topK, options.fuero?.join(','), options.onQuotaExceeded, options.onQueryCompleted, options.genioIds, options.onCacheActive, options.contextoSistema, options.todoElAcervo, options.sinCobro, options.onRedRetuvo]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
        setRetryMessage(null);
        setRetryType(null);
    }, []);

    /* Los pasos de una consulta no valen para la siguiente por otro camino
       (el análisis de documento no pasa por sendMessage y heredaba la
       ramificación anterior entera). */
    const limpiarPasos = useCallback(() => setPasos([]), []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        stopGeneration,
        seCortoLaRed,
        clearMessages,
        setMessages,
        retryMessage,
        retryType,
        sourcesCount,
        pasos,
        limpiarPasos,
    };
}
