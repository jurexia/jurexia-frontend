'use client';

import { useMemo } from 'react';
import { User, Scale } from 'lucide-react';
import type { Message } from '@/lib/api';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    onCitationClick?: (docId: string) => void;
}

export default function ChatMessage({ message, isStreaming = false, onCitationClick }: ChatMessageProps) {
    const isUser = message.role === 'user';

    // Extract unique document IDs and create numbered references
    const { processedContent, docIdMap } = useMemo(() => {
        if (isUser) return { processedContent: message.content, docIdMap: new Map<string, number>() };

        // Find all unique document IDs in the content
        const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
        const foundIds = message.content.match(uuidPattern) || [];

        // Create a map of unique IDs to citation numbers
        const uniqueIds = Array.from(new Set(foundIds.map(id => id.toLowerCase())));
        const docIdMap = new Map<string, number>();
        uniqueIds.forEach((id, index) => {
            docIdMap.set(id, index + 1);
        });

        // Replace all citation patterns with numbered badges
        let content = message.content;

        // Pattern 1: ≡ Doc UUID or = Doc UUID (from image)
        content = content.replace(
            /[≡=]\s*Doc\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,
            (_, uuid) => {
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<button class="citation-badge" data-doc-id="${uuid}" title="Ver documento completo">[${num}]</button>`;
            }
        );

        // Pattern 2: [Doc ID: uuid]
        content = content.replace(
            /\[Doc ID:\s*([a-f0-9-]+)\]/gi,
            (_, uuid) => {
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<button class="citation-badge" data-doc-id="${uuid}" title="Ver documento completo">[${num}]</button>`;
            }
        );

        // Pattern 3: Doc uuid (standalone without ≡)
        content = content.replace(
            /Doc\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,
            (_, uuid) => {
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<button class="citation-badge" data-doc-id="${uuid}" title="Ver documento completo">[${num}]</button>`;
            }
        );

        // Pattern 4: Just a lone UUID (cleanup any remaining)
        content = content.replace(
            /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,
            (uuid) => {
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<button class="citation-badge" data-doc-id="${uuid}" title="Ver documento completo">[${num}]</button>`;
            }
        );

        return { processedContent: content, docIdMap };
    }, [message.content, isUser]);


    return (
        <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {/* Avatar - Assistant */}
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Message Bubble */}
            <div
                className={`max-w-[80%] px-4 py-3 ${isUser
                    ? 'message-user'
                    : 'message-assistant'
                    }`}
            >
                {isUser ? (
                    <p className="text-sm sm:text-base whitespace-pre-wrap">
                        {message.content}
                    </p>
                ) : (
                    <div
                        className={`prose-legal text-sm sm:text-base ${isStreaming ? 'streaming-cursor' : ''}`}
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(processedContent) }}
                        onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.classList.contains('citation-badge') && target.dataset.docId) {
                                e.preventDefault();
                                onCitationClick?.(target.dataset.docId);
                            }
                        }}
                    />
                )}
            </div>

            {/* Avatar - User */}
            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-brown flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    );
}

/**
 * Simple markdown to HTML converter for legal responses
 */
function formatMarkdown(text: string): string {
    return text
        // Headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-serif font-medium mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-serif font-medium mt-5 mb-3">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-serif font-medium mt-6 mb-4">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="bg-cream-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        // Blockquotes
        .replace(/^> (.*$)/gm, '<blockquote class="pl-4 border-l-4 border-accent-brown italic text-charcoal-700 my-3">$1</blockquote>')
        // Unordered lists
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-3">$&</ul>')
        // Ordered lists
        .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p class="mb-3">')
        .replace(/\n/g, '<br/>')
        // Wrap in paragraph
        .replace(/^(.+)$/gm, (match) => {
            if (match.startsWith('<')) return match;
            return `<p class="mb-3">${match}</p>`;
        });
}

// Typing indicator component
export function TypingIndicator() {
    return (
        <div className="flex gap-4 justify-start animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="message-assistant px-4 py-3">
                <div className="typing-indicator flex gap-1">
                    <span className="w-2 h-2 bg-charcoal-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-charcoal-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-charcoal-400 rounded-full"></span>
                </div>
            </div>
        </div>
    );
}
