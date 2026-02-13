'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, streamChat, SearchResult } from '@/lib/api';
import { getSession } from '@/lib/supabase';

interface UseChatOptions {
    estado?: string;
    topK?: number;  // Default: 20 for better document retrieval
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string, enableReasoning?: boolean) => Promise<void>;
    clearMessages: () => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
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
 * Strategy:
 * - We maintain a `pending` buffer of unprocessed text.
 * - Each incoming chunk is appended to `pending`.
 * - We scan `pending` for complete markers and flush confirmed text.
 * - At the end of each chunk, if the tail of `pending` could be the START
 *   of a marker (e.g. "<!--th"), we hold it until the next chunk.
 * - On stream end, we flush everything remaining.
 */
class ThinkingParser {
    thinking = '';
    content = '';
    private pending = '';
    private inThinkingMode = false;

    /** Feed a new chunk from the stream. Call updateUI after. */
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
                // Found a complete marker — flush text before it, then switch mode
                const before = this.pending.slice(0, idx);
                if (before) {
                    this.appendText(before);
                }
                // Switch to thinking mode (marker always prefixes thinking text)
                this.inThinkingMode = true;
                this.pending = this.pending.slice(idx + MARKER_LEN);
                continue; // keep scanning
            }

            // No complete marker found.
            if (isFinal) {
                // Stream is done — flush everything remaining as-is
                if (this.pending) {
                    this.appendText(this.pending);
                    this.pending = '';
                }
                break;
            }

            // Check if the END of `pending` could be the beginning of a marker.
            // e.g. pending ends with "<!--" or "<!--thi" — we must hold it.
            const holdFrom = this.findPartialMarkerTail();
            if (holdFrom < this.pending.length) {
                // Flush the safe portion, hold the rest
                const safe = this.pending.slice(0, holdFrom);
                if (safe) {
                    this.appendText(safe);
                }
                this.pending = this.pending.slice(holdFrom);
            } else {
                // No partial marker possible — flush all
                if (this.pending) {
                    this.appendText(this.pending);
                    this.pending = '';
                }
            }
            break;
        }
    }

    /** Find the earliest position in pending where a partial marker could start at the tail. */
    private findPartialMarkerTail(): number {
        // Check if any suffix of `pending` matches a prefix of THINKING_MARKER.
        // We only need to check the last (MARKER_LEN - 1) characters.
        const searchStart = Math.max(0, this.pending.length - (MARKER_LEN - 1));
        for (let i = searchStart; i < this.pending.length; i++) {
            const tail = this.pending.slice(i);
            if (THINKING_MARKER.startsWith(tail)) {
                return i;
            }
        }
        return this.pending.length; // no partial match
    }

    private appendText(text: string): void {
        if (this.inThinkingMode) {
            this.thinking += text;
        } else {
            this.content += text;
        }
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
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string, _enableReasoning = true) => {
        const enableReasoning = true; // Always use reasoning for maximum quality
        if (!content.trim() || isLoading) return;

        setError(null);
        setIsLoading(true);

        // Add user message
        const userMessage: Message = { role: 'user', content };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        try {
            // Get Supabase session for auth token
            const session = await getSession();
            const accessToken = session?.access_token;

            const parser = new ThinkingParser();
            let assistantMessageAdded = false;

            for await (const chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK,
                accessToken,
                enableReasoning
            )) {
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            // Remove the empty assistant message on error
            setMessages(updatedMessages);
        } finally {
            setIsLoading(false);
        }
    }, [messages, isLoading, options.estado, options.topK]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearMessages,
        setMessages,
    };
}
