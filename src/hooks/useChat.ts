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

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string, enableReasoning = false) => {
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

            let fullResponse = '';
            let finalContent = '';
            let isReasonerMode = false; // Only true if API sends reasoning markers
            let reasoningCleared = false;
            let modeDetected = false; // Whether we've determined the streaming mode
            let assistantMessageAdded = false; // Track if we've added the assistant message yet

            // Markers that indicate we're in reasoner mode (document analysis)
            const reasoningHeader = '💭 *Proceso de razonamiento:*\n\n> ';
            const analysisMarkerRegex = /## ⚖️ (Análisis|Respuesta) Legal/;

            for await (const chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK,
                accessToken,  // Pass auth token for backend validation
                enableReasoning  // Pass reasoning flag
            )) {
                fullResponse += chunk;

                // Detect mode from the first meaningful content
                if (!modeDetected && fullResponse.length > 10) {
                    isReasonerMode = fullResponse.includes('🧠') || fullResponse.includes('💭');
                    modeDetected = true;
                }

                if (isReasonerMode) {
                    // ── REASONER MODE: Show reasoning, then clear for final content ──
                    const markerMatch = fullResponse.match(analysisMarkerRegex);
                    if (!reasoningCleared && markerMatch) {
                        const markerIndex = fullResponse.indexOf(markerMatch[0]);
                        finalContent = fullResponse.substring(markerIndex);
                        reasoningCleared = true;
                    } else if (reasoningCleared) {
                        finalContent += chunk;
                    } else if (fullResponse.includes('> ')) {
                        // Still in reasoning phase - show last ~2 paragraphs
                        const headerEnd = fullResponse.indexOf('> ');
                        if (headerEnd !== -1) {
                            const reasoningText = fullResponse.substring(headerEnd);
                            const paragraphs = reasoningText.split('\n> \n> ');
                            const lastParagraphs = paragraphs.slice(-2).join('\n> \n> ');
                            fullResponse = reasoningHeader.slice(0, -2) + lastParagraphs;
                        }
                    }
                }
                // In CHAT MODE (no reasoning), fullResponse is used as-is

                const displayContent = isReasonerMode
                    ? (reasoningCleared ? finalContent : fullResponse)
                    : fullResponse;

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
