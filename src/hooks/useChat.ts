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

// Thinking marker used by the backend to separate reasoning from content
const THINKING_MARKER = '<!--thinking-->';

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

            let thinkingContent = '';
            let responseContent = '';
            let assistantMessageAdded = false;

            for await (const chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK,
                accessToken,
                enableReasoning
            )) {
                // Parse thinking markers from backend stream
                if (chunk.includes(THINKING_MARKER)) {
                    // Split chunk in case it contains mixed content
                    const parts = chunk.split(THINKING_MARKER);
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        if (!part) continue;
                        // Parts after the marker are thinking content
                        // (the marker prefixes thinking text)
                        if (i > 0 || chunk.startsWith(THINKING_MARKER)) {
                            thinkingContent += part;
                        } else {
                            responseContent += part;
                        }
                    }
                } else {
                    responseContent += chunk;
                }

                // Build display content: thinking section (collapsible) + response
                let displayContent = '';
                if (thinkingContent) {
                    displayContent += `<!--THINKING_START-->${thinkingContent}<!--THINKING_END-->`;
                }
                displayContent += responseContent;

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
