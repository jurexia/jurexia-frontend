'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, streamChat, SearchResult, fuentesWebActivas } from '@/lib/api';
import { getSession } from '@/lib/supabase';
import { checkCanQuery, getSubscriptionInfo } from '@/lib/supabase';
import { isAdmin } from '@/app/leyesestatales/adminGuard';

interface UseChatOptions {
    estado?: string;
    topK?: number;
    fuero?: string[];  // Filtro por fuero: multi-select ['constitucional', 'federal', 'estatal']
    materia?: string; // Filtro por materia: civil, penal, familiar, administrativo
    onQuotaExceeded?: (remaining: number) => void;
    onQueryCompleted?: (used: number, limit: number) => void;  // Sync counter with DB after each query
    genioIds?: string[];  // IDs de los genios activos: ['amparo', 'mercantil'], etc.
    onCacheActive?: () => void;  // Fired when backend confirms cache is serving
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string, enableReasoning?: boolean) => Promise<void>;
    stopGeneration: () => void;
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

    const stopGeneration = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const sendMessage = useCallback(async (content: string, _enableReasoning = true) => {
        const enableReasoning = false; // Disabled: Query Expansion was diluting BM25 precision
        if (!content.trim() || isLoading || sendingRef.current) return;
        sendingRef.current = true;

        // Cancel any in-flight request before starting a new one
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setError(null);
        setIsLoading(true);
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
        try {
            // Get Supabase session for auth token
            const session = await getSession();
            const accessToken = session?.access_token;
            const userId = session?.user?.id;

            // ── Quota enforcement ──
            const isAdminUser = isAdmin(session?.user?.email);
            if (userId && !isAdminUser) {
                const { canQuery, remaining } = await checkCanQuery(userId);
                if (!canQuery) {
                    // Remove the user message we just added
                    setMessages(messages);
                    setIsLoading(false);
                    options.onQuotaExceeded?.(remaining);
                    return;
                }
            }

            const parser = new ThinkingParser();
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

            for await (let chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK,
                accessToken,
                enableReasoning,
                userId,
                options.fuero?.length ? options.fuero.join(',') : undefined,
                options.genioIds,
                options.materia,
                signal,
            )) {
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
                        // su detalle es el bueno.
                        setPasos((prev) => {
                            const mapa = new Map(prev.map((x) => [x.nombre, x]));
                            nuevos.forEach((x) => mapa.set(x.nombre, x));
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
                    setRetryMessage(`Intento ${attempt + 1}/3 — esperando ${delay / 1000} segundos...`);
                    setRetryType(retryType);
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

            if (assistantMessageAdded) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: finalDisplay,
                    };
                    return newMessages;
                });
            }

            // Clear retry message after successful response
            setRetryMessage(null);

            // ── Sync UI counter with real DB values (backend already consumed the query) ──
            if (userId && !isAdminUser) {
                try {
                    const info = await getSubscriptionInfo(userId);
                    if (info) {
                        options.onQueryCompleted?.(info.queriesUsed, info.queriesLimit);
                    }
                } catch (err) {
                    console.error('Failed to sync query counter:', err);
                }
            }
        } catch (err) {
            // User stopped the generation — clean exit, no error shown
            if ((err as Error)?.name === 'AbortError') {
                setRetryMessage(null);
                return;
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
            setIsLoading(false);
            sendingRef.current = false;
        }
    }, [messages, isLoading, options.estado, options.topK, options.fuero?.join(','), options.materia, options.onQuotaExceeded, options.onQueryCompleted, options.genioIds, options.onCacheActive]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
        setRetryMessage(null);
        setRetryType(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        stopGeneration,
        clearMessages,
        setMessages,
        retryMessage,
        retryType,
        sourcesCount,
        pasos,
    };
}
