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

            let fullResponse = '';
            let reasoningText = '';
            let responseText = '';
            let inResponsePhase = false;
            let assistantMessageAdded = false;

            for await (const chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK,
                accessToken,  // Pass auth token for backend validation
                enableReasoning  // Pass reasoning flag
            )) {
                fullResponse += chunk;

                // Detect transition from reasoning to response (marked by ---)
                if (!inResponsePhase) {
                    const separatorIdx = fullResponse.indexOf('\n\n---\n\n');
                    if (separatorIdx !== -1) {
                        // Found separator: everything before is reasoning, after is response
                        reasoningText = fullResponse.substring(0, separatorIdx);
                        responseText = fullResponse.substring(separatorIdx + 6); // skip \n\n---\n\n
                        inResponsePhase = true;
                    }
                } else {
                    // Already in response phase, append chunk directly
                    responseText += chunk;
                }

                // Build display content:
                // During reasoning phase: show typing indicator
                // During response phase: show response (+ hidden reasoning for collapsible)
                let displayContent: string;
                if (inResponsePhase) {
                    // Include reasoning as collapsible marker for ChatMessage component
                    if (reasoningText.trim()) {
                        displayContent = `<!--reasoning-start-->${reasoningText}<!--reasoning-end-->${responseText}`;
                    } else {
                        displayContent = responseText;
                    }
                } else {
                    // Still in reasoning phase - show brief indicator
                    displayContent = '🧠 *Analizando tu consulta con razonamiento profundo...*';
                }

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
