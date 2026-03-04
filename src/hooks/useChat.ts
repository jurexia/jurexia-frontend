'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, streamChat, SearchResult } from '@/lib/api';
import { getSession } from '@/lib/supabase';
import { checkCanQuery, incrementQueryCount } from '@/lib/supabase';
import { isAdmin } from '@/app/leyesestatales/adminGuard';

interface UseChatOptions {
    estado?: string;
    topK?: number;
    fuero?: string;  // Filtro por fuero: constitucional, federal, estatal
    onQuotaExceeded?: (remaining: number) => void;
    enableGenioJuridico?: boolean;
    onCacheActive?: () => void;  // Fired when backend confirms cache is serving
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string, enableReasoning?: boolean) => Promise<void>;
    clearMessages: () => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    retryMessage: string | null;  // New field for retry status
}

// Thinking marker used by the backend to separate reasoning from content.
// This marker can be SPLIT across TCP chunk boundaries, so we use a
// buffer-based parser to handle partial markers safely.
const THINKING_MARKER = '<!--thinking-->';

// The longest possible partial marker prefix is len(THINKING_MARKER) - 1
const MARKER_LEN = THINKING_MARKER.length;

/**
 * Buffer-based parser that handles <!--thinking--> markers even when
 * they are split across multiple TCP chunks.
 *
 * Backend protocol:
 * - Each reasoning token is sent as: <!--thinking-->TOKEN
 * - Each content token is sent as: TOKEN (no prefix)
 * - The transition from reasoning→content happens when tokens stop
 *   being prefixed with <!--thinking-->
 *
 * Strategy:
 * - We maintain a `pending` buffer of unprocessed text.
 * - We scan for complete markers. Text BEFORE a marker = content,
 *   text AFTER a marker (until next marker or non-marker text) = thinking.
 * - When no marker is found and we've been in thinking mode, we check:
 *   if the text has no marker prefix, it must be content → switch back.
 * - We hold partial markers at the tail until the next chunk confirms.
 */
class ThinkingParser {
    thinking = '';
    content = '';
    private pending = '';
    // reasoningPhase tracks whether we're still in the reasoning phase
    // (markers are still arriving). Once we see content without markers
    // after having been in reasoning, we switch to content mode permanently.
    private reasoningPhase = false;
    private seenAnyMarker = false;

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
        while (true) {
            const idx = this.pending.indexOf(THINKING_MARKER);

            if (idx !== -1) {
                this.seenAnyMarker = true;
                // Found a complete marker.
                // Text BEFORE the marker is CONTENT (not prefixed by thinking)
                const before = this.pending.slice(0, idx);
                if (before) {
                    this.content += before;
                }
                // After the marker: enter reasoning phase
                this.reasoningPhase = true;
                this.pending = this.pending.slice(idx + MARKER_LEN);

                // Now grab the text that follows this marker, up to the next marker.
                // This text is THINKING content.
                const nextIdx = this.pending.indexOf(THINKING_MARKER);
                if (nextIdx !== -1) {
                    // There's another marker — text before it is thinking
                    const thinkText = this.pending.slice(0, nextIdx);
                    if (thinkText) {
                        this.thinking += thinkText;
                    }
                    this.pending = this.pending.slice(nextIdx);
                    continue; // process next marker
                }

                // No next marker found. The remaining text COULD be:
                // a) More thinking text (next marker arrives in future chunk)
                // b) The start of content (markers have stopped)
                // c) A partial marker at the tail
                // We can't know yet, so we hold it in pending.
                if (!isFinal) {
                    // Hold everything — can't decide yet
                    break;
                } else {
                    // Stream is done. Everything remaining after the last marker
                    // is thinking content (since it was preceded by a marker).
                    if (this.pending) {
                        this.thinking += this.pending;
                        this.pending = '';
                    }
                    break;
                }
            }

            // No complete marker found in pending.
            if (isFinal) {
                // Stream is done — flush everything.
                if (this.pending) {
                    if (this.reasoningPhase) {
                        // We were in reasoning but stream ended without more markers.
                        // This remaining text is likely content (the answer).
                        // But it could also be leftover thinking if model stopped mid-reasoning.
                        // Since the backend sends content WITHOUT markers, treat as content.
                        this.content += this.pending;
                    } else {
                        this.content += this.pending;
                    }
                    this.pending = '';
                }
                break;
            }

            // Check if the END of `pending` could be the beginning of a marker.
            const holdFrom = this.findPartialMarkerTail();
            if (holdFrom < this.pending.length) {
                // Flush the safe portion
                const safe = this.pending.slice(0, holdFrom);
                if (safe) {
                    if (this.reasoningPhase && !this.seenAnyMarkerInText(safe)) {
                        // Text without markers while in reasoning phase = content
                        this.reasoningPhase = false;
                        this.content += safe;
                    } else if (this.reasoningPhase) {
                        this.thinking += safe;
                    } else {
                        this.content += safe;
                    }
                }
                this.pending = this.pending.slice(holdFrom);
            } else {
                // No partial marker — flush all
                if (this.pending) {
                    if (this.reasoningPhase) {
                        // No marker in this text but we were reasoning.
                        // This means markers have stopped → transition to content.
                        this.reasoningPhase = false;
                        this.content += this.pending;
                    } else {
                        this.content += this.pending;
                    }
                    this.pending = '';
                }
            }
            break;
        }
    }

    private seenAnyMarkerInText(text: string): boolean {
        return text.includes(THINKING_MARKER);
    }

    /** Find the earliest position in pending where a partial marker could start at the tail. */
    private findPartialMarkerTail(): number {
        const searchStart = Math.max(0, this.pending.length - (MARKER_LEN - 1));
        for (let i = searchStart; i < this.pending.length; i++) {
            const tail = this.pending.slice(i);
            if (THINKING_MARKER.startsWith(tail)) {
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
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string, _enableReasoning = true) => {
        const enableReasoning = false; // Disabled: Query Expansion was diluting BM25 precision
        if (!content.trim() || isLoading) return;

        setError(null);
        setIsLoading(true);
        setRetryMessage(null);  // Reset retry message

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

            for await (const chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK,
                accessToken,
                enableReasoning,
                userId,
                options.fuero,
                options.enableGenioJuridico,
            )) {
                // Filter keepalive heartbeat from backend (<!--PING-->)
                // This is sent immediately to prevent mobile carriers from
                // closing the TCP connection when no data flows for >15s.
                if (chunk === '<!--PING-->' || chunk.trim() === '<!--PING-->') continue;

                // Check for cache active marker: <!--CACHE:ACTIVE-->
                const cacheMatch = chunk.match(/<!--CACHE:ACTIVE-->/);
                if (cacheMatch) {
                    options.onCacheActive?.();
                    // Strip the marker and continue with remaining content
                    const remaining = chunk.replace('<!--CACHE:ACTIVE-->', '');
                    if (!remaining.trim()) continue;
                    // If there's content after the marker, process it below
                }

                // Check if this is a retry marker: <!--RETRY:1:2000-->
                const retryMatch = chunk.match(/<!--RETRY:(\d+):(\d+)-->/);
                if (retryMatch) {
                    const attempt = parseInt(retryMatch[1]);
                    const delay = parseInt(retryMatch[2]);
                    setRetryMessage(`Intento ${attempt + 1}/3 — esperando ${delay / 1000} segundos...`);
                    continue;  // Don't feed retry markers to the parser
                }

                // Feed chunk to the buffer-based parser (handles split markers)
                parser.feed(chunk);

                const displayContent = parser.getDisplayContent();

                // Add assistant message on first chunk
                if (!assistantMessageAdded) {
                    setMessages(prev => [...prev, { role: 'assistant', content: displayContent }]);
                    assistantMessageAdded = true;
                } else {
                    // Update existing assistant message
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = {
                            role: 'assistant',
                            content: displayContent,
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

            // ── Increment quota counter after successful response ──
            if (userId && !isAdminUser) {
                try {
                    await incrementQueryCount(userId);
                } catch (err) {
                    console.error('Failed to increment query count:', err);
                }
            }
        } catch (err) {
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
        }
    }, [messages, isLoading, options.estado, options.topK, options.fuero, options.onQuotaExceeded, options.enableGenioJuridico, options.onCacheActive]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
        setRetryMessage(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearMessages,
        setMessages,
        retryMessage,
    };
}
