'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, streamChat, SearchResult } from '@/lib/api';

interface UseChatOptions {
    estado?: string;
    topK?: number;  // Default: 20 for better document retrieval
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    clearMessages: () => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        setError(null);
        setIsLoading(true);

        // Add user message
        const userMessage: Message = { role: 'user', content };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        // Prepare assistant message placeholder
        const assistantMessage: Message = { role: 'assistant', content: '' };
        setMessages([...updatedMessages, assistantMessage]);

        try {
            let fullResponse = '';
            let reasoningBuffer = '';  // Accumulates all reasoning
            let finalContent = '';      // Accumulates final analysis
            let reasoningCleared = false;

            // Markers for reasoning phase - handles both document analysis and normal queries
            const reasoningHeader = '💭 *Proceso de razonamiento:*\n\n> ';
            // Match either:
            // - "## ⚖️ Análisis Legal" or "## ⚖️ Respuesta Legal" (DeepSeek Reasoner format)
            // - "## 1. Conceptualización" or similar numbered header (old format)
            // - "---" followed by content transition
            const analysisMarkerRegex = /## ⚖️ (Análisis|Respuesta) Legal|## \d+\. Conceptualización|---\s*\n\n## /;

            for await (const chunk of streamChat(
                updatedMessages,
                options.estado,
                options.topK
            )) {
                fullResponse += chunk;

                // Check if we've hit the transition to final analysis/response
                const markerMatch = fullResponse.match(analysisMarkerRegex);
                if (!reasoningCleared && markerMatch) {
                    // Clear the reasoning, keep only final analysis
                    const markerIndex = fullResponse.indexOf(markerMatch[0]);
                    finalContent = fullResponse.substring(markerIndex);
                    reasoningCleared = true;
                } else if (reasoningCleared) {
                    // Already in final content phase - keep accumulating
                    finalContent += chunk;
                } else if (fullResponse.includes('> ')) {
                    // Still in reasoning phase - show only last ~2 paragraphs
                    reasoningBuffer = fullResponse;

                    // Extract just the reasoning part (after the header)
                    const headerEnd = reasoningBuffer.indexOf('> ');
                    if (headerEnd !== -1) {
                        const reasoningText = reasoningBuffer.substring(headerEnd);
                        // Split by paragraph breaks and keep only last 2
                        const paragraphs = reasoningText.split('\n> \n> ');
                        const lastParagraphs = paragraphs.slice(-2).join('\n> \n> ');
                        fullResponse = reasoningHeader.slice(0, -2) + lastParagraphs;
                    }
                }

                // If we've transitioned to final content, only show that
                const displayContent = reasoningCleared ? finalContent : fullResponse;

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: displayContent,
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
