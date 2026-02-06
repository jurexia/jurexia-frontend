'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { User, Scale, FileText, FileDown, Printer } from 'lucide-react';
import type { Message } from '@/lib/api';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    onCitationClick?: (docId: string) => void;
}

// UUID regex for document IDs
const UUID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;

// Filter out document content from user messages (content between markers is hidden)
function filterDocumentContent(content: string): string {
    // Remove content between <!-- DOCUMENTO_INICIO --> and <!-- DOCUMENTO_FIN -->
    const filtered = content.replace(/<!-- DOCUMENTO_INICIO -->[\s\S]*?<!-- DOCUMENTO_FIN -->/g, '');

    // Also handle the legacy format
    const legacyFiltered = filtered.replace(/---CONTENIDO DEL DOCUMENTO---[\s\S]*/g, '');

    // Clean up any extra whitespace
    return legacyFiltered.trim();
}

export default function ChatMessage({ message, isStreaming = false, onCitationClick }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const contentRef = useRef<HTMLDivElement>(null);

    // Extract unique document IDs and create numbered references
    const { processedContent, docIdMap } = useMemo(() => {
        if (isUser) return { processedContent: message.content, docIdMap: new Map<string, number>() };

        let content = message.content;

        // Create map to track citation numbers in order of FIRST APPEARANCE
        const docIdMap = new Map<string, number>();
        let citationCounter = 0;

        // Helper function to get or assign citation number
        const getCitationNumber = (uuid: string): number => {
            const normalizedUuid = uuid.toLowerCase();
            if (!docIdMap.has(normalizedUuid)) {
                citationCounter++;
                docIdMap.set(normalizedUuid, citationCounter);
            }
            return docIdMap.get(normalizedUuid)!;
        };

        // STEP 1: Process VALID Doc IDs first (before removing malformed ones)
        // Pattern A: [Doc ID: uuid] - most common format (36 char UUID)
        content = content.replace(
            /\[Doc ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/gi,
            (_, uuid) => {
                const num = getCitationNumber(uuid);
                return `<sup class="citation-badge" data-doc-id="${uuid.toLowerCase()}">[${num}]</sup>`;
            }
        );

        // Pattern B: Doc uuid (standalone)
        content = content.replace(
            /(?<![a-f0-9-])Doc\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?![a-f0-9-])/gi,
            (_, uuid) => {
                const num = getCitationNumber(uuid);
                return `<sup class="citation-badge" data-doc-id="${uuid.toLowerCase()}">[${num}]</sup>`;
            }
        );

        // Pattern C: Lone UUID not already in a citation-badge
        content = content.replace(
            /(?<!data-doc-id=")(?!\/document\/)([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?!")/gi,
            (match, uuid) => {
                // Skip if this UUID is already wrapped
                if (content.includes(`data-doc-id="${uuid.toLowerCase()}"`)) {
                    return match;
                }
                const num = getCitationNumber(uuid);
                return `<sup class="citation-badge" data-doc-id="${uuid.toLowerCase()}">[${num}]</sup>`;
            }
        );

        // STEP 2: Remove ALL malformed/leftover Doc IDs AFTER processing valid ones
        // Remove UUIDs missing first segment like [-53b4-5b76-b7ea-ef9db1b4ead8]
        content = content.replace(/\[-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\]/gi, '');

        // Remove short/partial Doc IDs like [Doc ID: 9396d0c8]
        content = content.replace(/\[Doc ID:\s*[a-f0-9]{1,35}\]/gi, '');

        // Remove parenthetical partial UUIDs like (Doc ID: xxxxx)
        content = content.replace(/\(Doc ID:\s*[a-f0-9-]+\)/gi, '');

        // Remove standalone partial refs like [-985d-5043-8e4e-b43aaee99c66]
        content = content.replace(/\[-[a-f0-9-]{10,35}\]/gi, '');

        // Remove multi-Doc ID brackets like [Doc ID: uuid; Doc ID: uuid]
        content = content.replace(/\[Doc ID:[^\]]*;[^\]]*\]/gi, '');

        // Remove any remaining raw "Doc ID:" text that wasn't properly formatted
        content = content.replace(/Doc ID:\s*[a-f0-9-]+/gi, '');

        // Remove any "## ⚖️ Análisis Legal" or "## ⚖️ Respuesta Legal" headers completely
        // (These are redundant - the user already knows this is a legal response from Iurexia)
        content = content.replace(/^---\s*$/gm, ''); // Remove standalone dashes
        content = content.replace(/##\s*⚖️?\s*(Análisis|Respuesta) Legal/gi, '');

        // Clean up leading whitespace/newlines left after removing headers
        content = content.replace(/^\s+/, '').trim();

        return { processedContent: content, docIdMap };
    }, [message.content, isUser]);

    // Generate document header with logo (text-based for reliable export)
    const generateHeader = () => {
        const date = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return `
            <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #C9A227;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 600; font-family: 'Georgia', serif;">
                    <span style="color: #1a1a1a;">Iurex</span><span style="color: #C9A227;">ia</span>
                </h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #666; font-family: 'Georgia', serif;">
                    Consulta Legal - ${date}
                </p>
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
                <div style="line-height: 1.6; color: #333; text-align: justify;">
                    ${content}
                </div>
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center;">
                    Documento generado por Iurexia - IA Jurídica Mexicana | Iurexia.com
                </div>
            </div>
        `;

        const element = document.createElement('div');
        element.innerHTML = fullHtml;

        html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                filename: `Iurexia-consulta-${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(element)
            .save();
    }, []);

    // Export to DOCX with proper formatting
    const handleExportDOCX = useCallback(async () => {
        if (!contentRef.current) return;

        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import('docx');

        const date = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Get the raw message content (with markdown)
        const rawContent = message.content;

        // Parse markdown content into structured paragraphs
        const lines = rawContent.split('\n');
        const docChildren: any[] = [];

        // Header
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Iurex",
                        bold: true,
                        size: 56,
                        font: "Georgia",
                        color: "1a1a1a"
                    }),
                    new TextRun({
                        text: "ia",
                        bold: true,
                        size: 56,
                        font: "Georgia",
                        color: "C9A227"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Plataforma de IA Legal para México",
                        size: 22,
                        color: "666666",
                        italics: true
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Documento generado el ${date}`,
                        size: 20,
                        color: "888888"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            }),
            new Paragraph({
                border: {
                    bottom: { color: "C9A227", size: 12, style: BorderStyle.SINGLE }
                },
                spacing: { after: 400 }
            })
        );

        // Process each line
        let currentParagraphLines: string[] = [];

        const flushParagraph = () => {
            if (currentParagraphLines.length > 0) {
                const text = currentParagraphLines.join(' ').trim();
                if (text) {
                    docChildren.push(createFormattedParagraph(text, Paragraph, TextRun, AlignmentType));
                }
                currentParagraphLines = [];
            }
        };

        // Patterns for legal document sections
        const mainSectionPattern = /^\*\*(PROEMIO|DECLARACIONES|CLÁUSULAS|CIERRE|ENCABEZADO|FIRMAS|PRESTACIONES|HECHOS|DERECHO|PRUEBAS|PUNTOS PETITORIOS|RESULTANDO|CONSIDERANDO|RESUELVE)\*\*$/i;
        const clausePattern = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|I\.|II\.|III\.|IV\.|V\.|VI\.|VII\.|VIII\.|IX\.|X\.)[\.\-\s]/i;
        const romanNumeralDeclaration = /^([IVX]+)\.\s*(DE|DEL)\s/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines - they mark paragraph breaks
            if (!trimmedLine) {
                flushParagraph();
                continue;
            }

            // Skip citation badges like [Doc ID: ...]
            if (trimmedLine.match(/^\[Doc ID:/)) {
                continue;
            }

            // Main section headers like **PROEMIO**, **CLÁUSULAS**, etc.
            if (mainSectionPattern.test(trimmedLine)) {
                flushParagraph();
                const headerText = trimmedLine.replace(/\*\*/g, '').toUpperCase();
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: headerText,
                                bold: true,
                                size: 26,
                                font: "Arial"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 200 }
                    })
                );
                continue;
            }

            // H2 Headers (## Section) - Main document title or sections
            if (trimmedLine.startsWith('## ')) {
                flushParagraph();
                const headerText = trimmedLine.replace(/^##\s*/, '').replace(/\*\*/g, '').toUpperCase();
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: headerText,
                                bold: true,
                                size: 28,
                                font: "Arial"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 300 }
                    })
                );
                continue;
            }

            // H3 Headers (### Subsection)
            if (trimmedLine.startsWith('### ')) {
                flushParagraph();
                const headerText = trimmedLine.replace(/^###\s*/, '').replace(/\*\*/g, '');
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: headerText,
                                bold: true,
                                size: 24,
                                font: "Arial"
                            })
                        ],
                        spacing: { before: 300, after: 150 }
                    })
                );
                continue;
            }

            // Roman numeral declarations (I. DE LA VENDEDORA, II. DEL COMPRADOR)
            if (romanNumeralDeclaration.test(trimmedLine)) {
                flushParagraph();
                const cleanText = trimmedLine.replace(/\*\*/g, '');
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: cleanText,
                                bold: true,
                                size: 24,
                                font: "Times New Roman"
                            })
                        ],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { before: 200, after: 100 }
                    })
                );
                continue;
            }

            // Numbered clauses (PRIMERA.-, SEGUNDA.-, etc.)
            if (clausePattern.test(trimmedLine)) {
                flushParagraph();
                const cleanText = trimmedLine.replace(/\*\*/g, '');
                // Find where the clause number ends
                const match = cleanText.match(clausePattern);
                if (match) {
                    const clauseNumber = match[0];
                    const restOfText = cleanText.slice(clauseNumber.length);
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: clauseNumber,
                                    bold: true,
                                    size: 24,
                                    font: "Times New Roman"
                                }),
                                new TextRun({
                                    text: restOfText,
                                    size: 24,
                                    font: "Times New Roman"
                                })
                            ],
                            alignment: AlignmentType.JUSTIFIED,
                            spacing: { before: 150, after: 100 }
                        })
                    );
                    continue;
                }
            }

            // Blockquotes (> "Artículo...")
            if (trimmedLine.startsWith('> ') || trimmedLine.startsWith('>')) {
                flushParagraph();
                const quoteText = trimmedLine.replace(/^>\s*/, '');
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: quoteText.replace(/\*\*/g, ''),
                                italics: true,
                                size: 22,
                                font: "Times New Roman",
                                color: "333333"
                            })
                        ],
                        indent: { left: 480 },  // Slight left indent
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { before: 100, after: 100 }
                    })
                );
                continue;
            }

            // Regular line - accumulate for paragraph
            currentParagraphLines.push(trimmedLine);
        }

        // Flush remaining paragraph
        flushParagraph();

        // Footer
        docChildren.push(
            new Paragraph({
                border: {
                    top: { color: "C9A227", size: 12, style: BorderStyle.SINGLE }
                },
                spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Iurex",
                        bold: true,
                        size: 18,
                        font: "Georgia",
                        color: "1a1a1a"
                    }),
                    new TextRun({
                        text: "ia",
                        bold: true,
                        size: 18,
                        font: "Georgia",
                        color: "C9A227"
                    }),
                    new TextRun({
                        text: " - Inteligencia Artificial Legal",
                        size: 18,
                        color: "666666"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Este documento fue generado con información de nuestra base jurídica verificada.",
                        size: 16,
                        color: "888888",
                        italics: true
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 50 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Iurexia.com",
                        size: 16,
                        color: "C9A227"
                    })
                ],
                alignment: AlignmentType.CENTER
            })
        );

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch
                            bottom: 1440,
                            left: 1440,
                            right: 1440
                        }
                    }
                },
                children: docChildren
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Iurexia-consulta-${Date.now()}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    }, [message.content]);

    // Helper function to create formatted paragraphs with bold text support
    function createFormattedParagraph(text: string, Paragraph: any, TextRun: any, AlignmentType: any) {
        // Parse **bold** patterns
        const parts: { text: string; bold: boolean }[] = [];
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(text)) !== null) {
            // Add text before bold
            if (match.index > lastIndex) {
                parts.push({ text: text.slice(lastIndex, match.index), bold: false });
            }
            // Add bold text
            parts.push({ text: match[1], bold: true });
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push({ text: text.slice(lastIndex), bold: false });
        }

        // If no bold patterns found, just use the whole text
        if (parts.length === 0) {
            parts.push({ text, bold: false });
        }

        return new Paragraph({
            children: parts.map(part => new TextRun({
                text: part.text,
                bold: part.bold,
                size: 24,
                font: "Times New Roman"
            })),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 360 }  // 1.5 line spacing
        });
    }

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
                <title>Iurexia - Consulta Legal</title>
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
                    <img src="/logo-Iurexia.png" alt="Iurexia" />
                    <div>
                        <h1>Iurexia</h1>
                        <p>Consulta Legal - ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    Documento generado por Iurexia - IA Jurídica Mexicana | Iurexia.com
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
                        {filterDocumentContent(message.content)}
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
        // Skip headers that contain "Iurexia" or already processed branded headers
        // Headers - but skip lines that already have HTML or branded headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-serif font-medium mt-4 mb-2">$1</h3>')
        // Skip "Respuesta Legal" or "Análisis Legal" H2s since they're already branded
        .replace(/^## (?!.*(Respuesta|Análisis) Legal)(.*$)/gm, '<h2 class="text-xl font-serif font-medium mt-5 mb-3">$2</h2>')
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

// Typing indicator component with informative message
// Typing indicator component with animated progressive text
export function TypingIndicator() {
    const [textIndex, setTextIndex] = useState(0);
    const loadingTexts = [
        "Analizando tu consulta...",
        "Buscando en nuestra base de datos jurídica...",
        "Consultando legislación federal y estatal...",
        "Revisando jurisprudencia relevante...",
        "Preparando respuesta legal..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex gap-4 justify-start animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="message-assistant px-4 py-4">
                <div className="flex items-center gap-3">
                    {/* Spinner */}
                    <div className="relative">
                        <div className="w-5 h-5 border-2 border-accent-brown/20 rounded-full"></div>
                        <div className="w-5 h-5 border-2 border-accent-brown border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
                    </div>
                    {/* Animated Message */}
                    <div className="flex flex-col min-w-[280px]">
                        <span className="text-charcoal-700 font-medium text-sm transition-opacity duration-300">
                            {loadingTexts[textIndex]}
                        </span>
                        <span className="text-charcoal-500 text-xs mt-0.5">
                            Esto puede tomar unos segundos
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
