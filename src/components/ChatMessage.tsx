'use client';

import { useMemo, useRef, useCallback } from 'react';
import { User, Scale, FileText, FileDown, Printer } from 'lucide-react';
import type { Message } from '@/lib/api';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    onCitationClick?: (docId: string) => void;
}

// UUID regex for document IDs
const UUID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;

export default function ChatMessage({ message, isStreaming = false, onCitationClick }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const contentRef = useRef<HTMLDivElement>(null);

    // Extract unique document IDs and create numbered references
    const { processedContent, docIdMap } = useMemo(() => {
        if (isUser) return { processedContent: message.content, docIdMap: new Map<string, number>() };

        let content = message.content;

        // Find all unique document IDs in the content
        const foundIds = content.match(UUID_REGEX) || [];
        const uniqueIds = Array.from(new Set(foundIds.map(id => id.toLowerCase())));

        // Create a map of unique IDs to citation numbers
        const docIdMap = new Map<string, number>();
        uniqueIds.forEach((id, index) => {
            docIdMap.set(id, index + 1);
        });

        // Replace citation patterns with numbered badges
        // Pattern 1: [Doc ID: uuid]
        content = content.replace(
            /\[Doc ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/gi,
            (_, uuid) => {
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<sup class="citation-badge" data-doc-id="${uuid}">[${num}]</sup>`;
            }
        );

        // Pattern 2: Doc uuid (standalone)
        content = content.replace(
            /(?<![a-f0-9-])Doc\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?![a-f0-9-])/gi,
            (_, uuid) => {
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<sup class="citation-badge" data-doc-id="${uuid}">[${num}]</sup>`;
            }
        );

        // Pattern 3: Lone UUID not already in a citation-badge
        content = content.replace(
            /(?<!data-doc-id=")(?!\/document\/)([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?!")/gi,
            (uuid) => {
                // Check if this UUID is already wrapped
                if (content.includes(`data-doc-id="${uuid}"`)) {
                    return uuid;
                }
                const num = docIdMap.get(uuid.toLowerCase()) || 1;
                return `<sup class="citation-badge" data-doc-id="${uuid}">[${num}]</sup>`;
            }
        );

        return { processedContent: content, docIdMap };
    }, [message.content, isUser]);

    // Generate document header with logo
    const generateHeader = () => {
        const date = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return `
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #8B5E3C;">
                <img src="/logo-jurexia.png" alt="Jurexia" style="height: 48px; width: auto;" />
                <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; font-family: serif;">Jurexia</h1>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Consulta Legal - ${date}</p>
                </div>
            </div>
        `;
    };

    // Export to PDF
    const handleExportPDF = useCallback(async () => {
        if (!contentRef.current) return;

        // Dynamic import of html2pdf
        const html2pdf = (await import('html2pdf.js')).default;

        const content = contentRef.current.innerHTML;
        const fullHtml = `
            <div style="font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px;">
                ${generateHeader()}
                <div style="line-height: 1.6; color: #333;">
                    ${content}
                </div>
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center;">
                    Documento generado por Jurexia - IA Jurídica Mexicana | jurexiagtp.com
                </div>
            </div>
        `;

        const element = document.createElement('div');
        element.innerHTML = fullHtml;

        html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                filename: `jurexia-consulta-${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(element)
            .save();
    }, []);

    // Export to DOCX
    const handleExportDOCX = useCallback(async () => {
        if (!contentRef.current) return;

        const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } = await import('docx');

        const date = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Convert HTML content to plain text with basic formatting
        const plainText = contentRef.current.innerText || '';
        const paragraphs = plainText.split('\n\n').filter(p => p.trim());

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Jurexia",
                                bold: true,
                                size: 48,
                                font: "Times New Roman"
                            })
                        ],
                        heading: HeadingLevel.TITLE
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Consulta Legal - ${date}`,
                                size: 22,
                                color: "666666"
                            })
                        ],
                        spacing: { after: 400 }
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "─".repeat(60) })],
                        spacing: { after: 400 }
                    }),
                    ...paragraphs.map(p => new Paragraph({
                        children: [
                            new TextRun({
                                text: p.trim(),
                                size: 24,
                                font: "Times New Roman"
                            })
                        ],
                        spacing: { after: 200 }
                    })),
                    new Paragraph({
                        children: [new TextRun({ text: "─".repeat(60) })],
                        spacing: { before: 400, after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Documento generado por Jurexia - IA Jurídica Mexicana | jurexiagtp.com",
                                size: 18,
                                color: "999999",
                                italics: true
                            })
                        ],
                        alignment: 'center' as const
                    })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jurexia-consulta-${Date.now()}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // Print with header
    const handlePrint = useCallback(() => {
        if (!contentRef.current) return;

        const content = contentRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Jurexia - Consulta Legal</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 40px; }
                    }
                    body {
                        font-family: 'Times New Roman', Georgia, serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 2px solid #8B5E3C;
                    }
                    .header img { height: 48px; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
                    h1, h2, h3 { font-family: Georgia, serif; }
                    blockquote { 
                        border-left: 4px solid #8B5E3C; 
                        padding-left: 16px; 
                        margin: 16px 0;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 32px;
                        padding-top: 16px;
                        border-top: 1px solid #ddd;
                        font-size: 10px;
                        color: #999;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="/logo-jurexia.png" alt="Jurexia" />
                    <div>
                        <h1>Jurexia</h1>
                        <p>Consulta Legal - ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    Documento generado por Jurexia - IA Jurídica Mexicana | jurexiagtp.com
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    }, []);

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
                className={`max-w-[80%] ${isUser
                    ? 'message-user px-4 py-3'
                    : 'message-assistant'
                    }`}
            >
                {isUser ? (
                    <p className="text-sm sm:text-base whitespace-pre-wrap px-4 py-3">
                        {message.content}
                    </p>
                ) : (
                    <>
                        <div
                            ref={contentRef}
                            className={`prose-legal text-sm sm:text-base px-4 py-3 ${isStreaming ? 'streaming-cursor' : ''}`}
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(processedContent) }}
                            onClick={(e) => {
                                const target = e.target as HTMLElement;
                                // Check for citation badge click
                                if (target.classList.contains('citation-badge') && target.dataset.docId) {
                                    e.preventDefault();
                                    onCitationClick?.(target.dataset.docId);
                                }
                            }}
                        />
                        {/* Export Buttons - Only show when not streaming and has content */}
                        {!isStreaming && message.content.length > 50 && (
                            <div className="flex items-center gap-2 px-4 py-2 border-t border-cream-300 bg-cream-100/50">
                                <span className="text-xs text-charcoal-500 mr-2">Exportar:</span>
                                <button
                                    onClick={handleExportPDF}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-700 bg-cream-200 hover:bg-cream-300 rounded-md transition-colors"
                                    title="Exportar a PDF"
                                >
                                    <FileDown className="w-3.5 h-3.5" />
                                    PDF
                                </button>
                                <button
                                    onClick={handleExportDOCX}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-700 bg-cream-200 hover:bg-cream-300 rounded-md transition-colors"
                                    title="Exportar a Word"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    DOCX
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-700 bg-cream-200 hover:bg-cream-300 rounded-md transition-colors"
                                    title="Imprimir"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                </button>
                            </div>
                        )}
                    </>
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
        // Blockquotes - special handling for "Fuente:" lines (add extra margin)
        .replace(/^> \*?Fuente:(.*$)/gmi, '<div class="pl-4 border-l-4 border-accent-gold text-sm text-charcoal-600 mb-6"><em>Fuente:$1</em></div>')
        // Regular blockquotes
        .replace(/^> (.*$)/gm, '<blockquote class="pl-4 border-l-4 border-accent-brown italic text-charcoal-700 my-1">$1</blockquote>')
        // Unordered lists
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-3">$&</ul>')
        // Ordered lists
        .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p class="mb-3">')
        .replace(/\n/g, '<br/>')
        // Wrap in paragraph (but not elements that start with HTML tags)
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
