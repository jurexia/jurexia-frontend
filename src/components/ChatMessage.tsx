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
// For AUDITAR_SENTENCIA, show a compact card with file info
function filterDocumentContent(content: string): string {
    // Check if this is a sentencia audit message
    if (content.includes('[AUDITAR_SENTENCIA]')) {
        // Extract file name from the header
        const fileNameMatch = content.match(/Archivo:\s*(.+)/);
        const fileName = fileNameMatch ? fileNameMatch[1].trim() : 'Sentencia';

        // Determine file type from extension
        const extension = fileName.split('.').pop()?.toLowerCase() || 'txt';
        const typeLabel = extension === 'pdf' ? 'PDF' :
            extension === 'docx' ? 'DOCX' :
                extension === 'doc' ? 'DOC' : 'TXT';

        // Return a compact card HTML instead of the full text
        return `📄 Documento adjunto: ${fileName} (${typeLabel})`;
    }

    // Remove content between <!-- DOCUMENTO_INICIO --> and <!-- DOCUMENTO_FIN -->
    const filtered = content.replace(/<!-- DOCUMENTO_INICIO -->[\s\S]*?<!-- DOCUMENTO_FIN -->/g, '');

    // Remove content between <!-- SENTENCIA_INICIO --> and <!-- SENTENCIA_FIN -->
    const sentenciaFiltered = filtered.replace(/<!-- SENTENCIA_INICIO -->[\s\S]*?<!-- SENTENCIA_FIN -->/g, '');

    // Also handle the legacy format
    const legacyFiltered = sentenciaFiltered.replace(/---CONTENIDO DEL DOCUMENTO---[\s\S]*/g, '');

    // Clean up the [AUDITAR_SENTENCIA] header and metadata lines
    const cleanedContent = legacyFiltered
        .replace(/\[AUDITAR_SENTENCIA\]/g, '')
        .replace(/Archivo:.*$/gm, '')
        .replace(/Estado:.*$/gm, '');

    // Clean up any extra whitespace
    return cleanedContent.trim();
}




export default function ChatMessage({ message, isStreaming = false, onCitationClick }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const contentRef = useRef<HTMLDivElement>(null);

    // Extract unique document IDs, thinking content, and create numbered references
    const { processedContent, docIdMap, thinkingContent, citationMeta } = useMemo(() => {
        if (isUser) return { processedContent: message.content, docIdMap: new Map<string, number>(), thinkingContent: '', citationMeta: null as { valid: number; invalid: number; total: number; invalid_ids: string[]; sources?: Record<string, { origen: string; ref: string; texto: string }> } | null };

        let content = message.content;

        // Extract thinking content (chain-of-thought from thinking mode)
        let thinking = '';
        const thinkingMatch = content.match(/<!--THINKING_START-->(.*?)<!--THINKING_END-->/s);
        if (thinkingMatch) {
            thinking = thinkingMatch[1];
            content = content.replace(/<!--THINKING_START-->.*?<!--THINKING_END-->/s, '').trim();
        }

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

        // Pattern A2: [, uuid] or [,uuid] - AI sometimes outputs this format (comma before UUID)
        content = content.replace(
            /\[\s*,\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\]/gi,
            (_, uuid) => {
                const num = getCitationNumber(uuid);
                return `<sup class="citation-badge" data-doc-id="${uuid.toLowerCase()}">[${num}]</sup>`;
            }
        );

        // Pattern A3: [text, uuid] - AI sometimes outputs [nombre, uuid] format
        content = content.replace(
            /\[[^\]]*,\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\]/gi,
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
        // Clean up leftover bracket artifacts from citation processing: [, <sup>...</sup>] → <sup>...</sup>
        content = content.replace(/\[\s*,?\s*(<sup class="citation-badge"[^<]*<\/sup>)\s*\]/g, '$1');
        // Clean up double-bracketed citations: [<sup>...</sup>] → <sup>...</sup>
        content = content.replace(/\[(<sup class="citation-badge"[^<]*<\/sup>)\]/g, '$1');
        // Clean up [, [N]] patterns (nested brackets with numbers)
        content = content.replace(/\[\s*,?\s*\[(\d+)\]\s*\]/g, '<sup class="citation-badge">[$1]</sup>');

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

        // Parse and strip <!-- CITATION_META:{...} --> from content
        let citationMeta: { valid: number; invalid: number; total: number; invalid_ids: string[]; sources?: Record<string, { origen: string; ref: string; texto: string }> } | null = null;
        const metaMatch = content.match(/<!-- CITATION_META:(\{.*?\}) -->/);
        if (metaMatch) {
            try {
                citationMeta = JSON.parse(metaMatch[1]);
            } catch { /* ignore parse errors */ }
            content = content.replace(/\n*<!-- CITATION_META:\{.*?\} -->/g, '').trim();
        }

        return { processedContent: content, docIdMap, thinkingContent: thinking, citationMeta };
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
                        {/* Thinking/Reasoning section (collapsible) */}
                        {thinkingContent && (
                            <details className="mx-4 mt-3 mb-1 rounded-lg border border-amber-200/60 bg-amber-50/30 overflow-hidden">
                                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-amber-800/70 hover:bg-amber-50/50 transition-colors select-none flex items-center gap-1.5">
                                    <span>🧠</span>
                                    <span>Ver razonamiento jurídico</span>
                                    <span className="text-amber-600/50 ml-auto text-[10px]">{Math.round(thinkingContent.length / 4)} tokens</span>
                                </summary>
                                <div
                                    className="px-3 py-2 text-xs text-charcoal-600 leading-relaxed border-t border-amber-200/40 max-h-64 overflow-y-auto prose-thinking"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(thinkingContent) }}
                                />
                            </details>
                        )}
                        <div
                            ref={contentRef}
                            className="prose-legal text-sm sm:text-base px-4 py-3"
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(processedContent) }}
                            onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.classList.contains('citation-badge') && target.dataset.docId) {
                                    e.preventDefault();
                                    onCitationClick?.(target.dataset.docId);
                                }
                            }}
                        />
                        {/* Citation Legend — collapsible source list */}
                        {!isStreaming && docIdMap.size > 0 && (
                            <details className="mx-4 mb-2 mt-1 rounded-lg border border-cream-300 bg-cream-50/80 overflow-hidden group/sources">
                                <summary className="px-3 py-2.5 text-xs font-medium text-charcoal-600 flex items-center gap-2 cursor-pointer hover:bg-cream-100 transition-colors select-none">
                                    <span>📚</span>
                                    <span className="text-blue-600 font-semibold">{docIdMap.size} fuentes</span>
                                    {citationMeta && citationMeta.invalid > 0 && (
                                        <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                            ⚠ {citationMeta.invalid} sin verificar
                                        </span>
                                    )}
                                    <span className="ml-auto text-charcoal-400 text-[10px] group-open/sources:rotate-90 transition-transform duration-200">▶</span>
                                </summary>
                                <div className="divide-y divide-cream-200 border-t border-cream-200">
                                    {Array.from(docIdMap.entries()).map(([uuid, num]) => {
                                        const isInvalid = citationMeta?.invalid_ids?.includes(uuid);
                                        const source = citationMeta?.sources?.[uuid];
                                        return (
                                            <div
                                                key={uuid}
                                                className={`flex items-center gap-2.5 text-xs py-2 px-3 hover:bg-cream-100 transition-colors ${isInvalid ? 'opacity-60' : ''}`}
                                            >
                                                <button
                                                    onClick={() => onCitationClick?.(uuid)}
                                                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-bold flex-shrink-0 hover:bg-blue-700 transition-colors cursor-pointer"
                                                    title="Ver documento completo"
                                                >
                                                    {num}
                                                </button>
                                                <span className="text-charcoal-700 text-[11px] flex-1 min-w-0 truncate">
                                                    {source
                                                        ? `${source.origen}${source.ref ? ` — ${source.ref}` : ''}`
                                                        : `${uuid.slice(0, 8)}...${uuid.slice(-4)}`
                                                    }
                                                </span>
                                                {isInvalid && (
                                                    <span className="text-amber-500 text-[10px] flex-shrink-0" title="UUID no encontrado en el contexto recuperado">
                                                        ⚠
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        )}
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
    // STEP 0: Strip any [SCJN_BUSCAR: ...] markers (feature removed)
    let processed = text.replace(
        /\[SCJN_BUSCAR:\s*[^\]]*\]/g,
        ''
    );

    // STEP 1: Parse markdown tables BEFORE other transforms
    // Handles BOTH standard pipe tables (|) AND Unicode box-drawing tables (┌─┬─┐ │ ├ └)
    const lines = processed.split('\n');
    const outputLines: string[] = [];
    let i = 0;

    // Helper: detect if a line is part of a Unicode box-drawing table
    const isUnicodeTableLine = (line: string) =>
        /[┌┐└┘├┤┬┴┼─│║═╔╗╚╝╠╣╦╩╬]/.test(line);

    // Helper: detect if line is a box-drawing border (no data)
    const isUnicodeBorder = (line: string) =>
        /^[\s┌┐└┘├┤┬┴┼─═╔╗╚╝╠╣╦╩╬]+$/.test(line.trim());

    // Helper: extract cells from a Unicode table row (│ cell │ cell │)
    const parseUnicodeCells = (row: string): string[] => {
        // Split by │ or ║ and filter empty border pieces
        return row.split(/[│║]/)
            .map(c => c.trim())
            .filter(c => c.length > 0 && !/^[\s─═┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬]+$/.test(c));
    };

    while (i < lines.length) {
        const line = lines[i].trim();

        // === CASE A: Standard Markdown pipe table ===
        if (line.startsWith('|') && line.endsWith('|') && line.split('|').length >= 3) {
            const tableLines: string[] = [];
            while (i < lines.length) {
                const tl = lines[i].trim();
                if (tl.startsWith('|') && tl.includes('|')) {
                    tableLines.push(tl);
                    i++;
                } else {
                    break;
                }
            }

            if (tableLines.length >= 2) {
                const parseCells = (row: string) =>
                    row.split('|').slice(1, -1).map(c => c.trim());

                const headerCells = parseCells(tableLines[0]);
                const isSeparator = /^[\s|:-]+$/.test(tableLines[1]);
                const dataStart = isSeparator ? 2 : 1;

                let tableHtml = '<div class="table-wrapper"><table class="md-table">';
                tableHtml += '<thead><tr>';
                headerCells.forEach(cell => { tableHtml += `<th>${cell}</th>`; });
                tableHtml += '</tr></thead><tbody>';
                for (let r = dataStart; r < tableLines.length; r++) {
                    const cells = parseCells(tableLines[r]);
                    tableHtml += '<tr>';
                    cells.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table></div>';
                outputLines.push(tableHtml);
            } else {
                tableLines.forEach(l => outputLines.push(l));
            }

            // === CASE B: Unicode box-drawing table ===
        } else if (isUnicodeTableLine(line) && (line.includes('│') || line.includes('┌') || line.includes('╔'))) {
            const tableLines: string[] = [];
            while (i < lines.length) {
                const tl = lines[i].trim();
                if (isUnicodeTableLine(tl) || tl === '') {
                    if (tl === '' && tableLines.length > 0) {
                        // Empty line might end the table
                        break;
                    }
                    tableLines.push(tl);
                    i++;
                } else {
                    break;
                }
            }

            // Filter: separate data rows from border rows
            const dataRows = tableLines.filter(l => !isUnicodeBorder(l) && l.includes('│'));

            if (dataRows.length >= 2) {
                let tableHtml = '<div class="table-wrapper"><table class="md-table">';

                // First data row = header
                const headerCells = parseUnicodeCells(dataRows[0]);
                tableHtml += '<thead><tr>';
                headerCells.forEach(cell => { tableHtml += `<th>${cell}</th>`; });
                tableHtml += '</tr></thead><tbody>';

                // Rest = data
                for (let r = 1; r < dataRows.length; r++) {
                    const cells = parseUnicodeCells(dataRows[r]);
                    tableHtml += '<tr>';
                    cells.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table></div>';
                outputLines.push(tableHtml);
            } else {
                // Not enough data rows, push original lines
                tableLines.forEach(l => outputLines.push(l));
            }

            // === CASE C: Orgchart block (:::orgchart ... :::) ===
        } else if (line === ':::orgchart') {
            const blockLines: string[] = [];
            i++; // skip opening :::orgchart
            while (i < lines.length) {
                const bl = lines[i].trim();
                if (bl === ':::') { i++; break; }
                blockLines.push(bl);
                i++;
            }

            // Parse orgchart
            let titulo = '';
            const edges: { parent: string; children: string[] }[] = [];
            const allNodes = new Set<string>();
            const childNodes = new Set<string>();

            for (const bl of blockLines) {
                if (bl.toLowerCase().startsWith('titulo:')) {
                    titulo = bl.substring(bl.indexOf(':') + 1).trim();
                } else if (bl.includes('->')) {
                    const [parentPart, childrenPart] = bl.split('->').map(s => s.trim());
                    const parent = parentPart.replace(/^\[|\]$/g, '').trim();
                    const children = childrenPart.split(',').map(c => c.trim().replace(/^\[|\]$/g, '').trim()).filter(c => c);
                    if (parent && children.length > 0) {
                        edges.push({ parent, children });
                        allNodes.add(parent);
                        children.forEach(c => { allNodes.add(c); childNodes.add(c); });
                    }
                }
            }

            // Build tree HTML
            let html = `<div class="iurexia-orgchart">`;
            if (titulo) html += `<div class="orgchart-title">${titulo}</div>`;
            html += `<div class="orgchart-tree">`;

            // Find roots (nodes that are never children)
            const roots = Array.from(allNodes).filter(n => !childNodes.has(n));
            if (roots.length === 0 && allNodes.size > 0) roots.push(Array.from(allNodes)[0]);

            // Recursive HTML builder
            const buildNodeHtml = (nodeName: string, isRoot: boolean): string => {
                const edge = edges.find(e => e.parent === nodeName);
                let nodeHtml = `<div class="orgchart-node-group">`;
                nodeHtml += `<div class="orgchart-node${isRoot ? ' root-node' : ''}">${nodeName}</div>`;
                if (edge && edge.children.length > 0) {
                    nodeHtml += `<div class="orgchart-connector"></div>`;
                    nodeHtml += `<div class="orgchart-level">`;
                    edge.children.forEach(child => {
                        nodeHtml += `<div class="orgchart-node-group">`;
                        nodeHtml += `<div class="orgchart-vline"></div>`;
                        nodeHtml += buildNodeHtml(child, false);
                        nodeHtml += `</div>`;
                    });
                    nodeHtml += `</div>`;
                }
                nodeHtml += `</div>`;
                return nodeHtml;
            };

            roots.forEach(root => { html += buildNodeHtml(root, true); });
            html += `</div></div>`;
            outputLines.push(html);

            // === CASE D: Processflow block (:::processflow ... :::) ===
        } else if (line === ':::processflow') {
            const blockLines: string[] = [];
            i++; // skip opening :::processflow
            while (i < lines.length) {
                const bl = lines[i].trim();
                if (bl === ':::') { i++; break; }
                blockLines.push(bl);
                i++;
            }

            // Parse process flow
            let titulo = '';
            const steps: { num: string; title: string; desc: string; timing: string }[] = [];

            for (const bl of blockLines) {
                if (bl.toLowerCase().startsWith('titulo:')) {
                    titulo = bl.substring(bl.indexOf(':') + 1).trim();
                } else {
                    // Parse: "1. Title | Description | Timing"
                    const stepMatch = bl.match(/^(\d+)\.\s*(.+)/);
                    if (stepMatch) {
                        const num = stepMatch[1];
                        const parts = stepMatch[2].split('|').map(p => p.trim());
                        steps.push({
                            num,
                            title: parts[0] || '',
                            desc: parts[1] || '',
                            timing: parts[2] || ''
                        });
                    }
                }
            }

            // Build timeline HTML
            let html = `<div class="iurexia-processflow">`;
            if (titulo) html += `<div class="processflow-title">${titulo}</div>`;
            html += `<div class="processflow-timeline">`;

            steps.forEach(step => {
                html += `<div class="processflow-step">`;
                html += `<div class="processflow-circle">${step.num}</div>`;
                html += `<div class="processflow-card">`;
                html += `<div class="processflow-step-title">${step.title}</div>`;
                if (step.desc) html += `<div class="processflow-step-desc">${step.desc}</div>`;
                if (step.timing) html += `<div class="processflow-step-timing">${step.timing}</div>`;
                html += `</div></div>`;
            });

            html += `</div></div>`;
            outputLines.push(html);

        } else {
            outputLines.push(lines[i]);
            i++;
        }
    }

    processed = outputLines.join('\n');

    // STEP 2: Clean up raw UUIDs and Doc ID references
    // Remove [Doc ID: uuid] patterns - they're for internal linking, not display
    processed = processed.replace(/\[Doc\s*ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi, '');
    // Remove bare UUIDs that aren't inside HTML attributes
    processed = processed.replace(/(?<!")([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?!")/gi, '');
    // Clean up leftover Doc ID labels without UUIDs
    processed = processed.replace(/\[Doc\s*ID:\s*\]/gi, '');
    // Clean up parentheses or brackets that now only contain whitespace
    processed = processed.replace(/\(\s*\)/g, '');
    processed = processed.replace(/\[\s*\]/g, '');

    // STEP 3: Convert separator lines (═══, ─────) to styled HRs
    processed = processed.replace(/^[═]{5,}.*$/gm, '<hr class="section-divider" />');
    processed = processed.replace(/^[─]{5,}.*$/gm, '<hr class="section-divider-light" />');

    // STEP 4: Convert Roman numeral section headers to styled headings
    // Matches: I. TITLE, II. TITLE, III. TITLE, IV. TITLE, V. TITLE, VI. TITLE, VII. TITLE, VIII. TITLE, IX. TITLE, X. TITLE
    processed = processed.replace(
        /^((?:[IVX]{1,5}))\.\s+(.+)$/gm,
        '<div class="sentencia-section-header"><span class="section-numeral">$1.</span> <span class="section-title">$2</span></div>'
    );

    // STEP 5: Style "Fuentes citadas" or "FUENTES" headers
    processed = processed.replace(
        /^##\s*(Fuentes\s+citadas|FUENTES\s+CITADAS|Referencias)$/gim,
        '<div class="fuentes-header"><span>📚</span> <span>$1</span></div>'
    );

    return processed
        // Skip headers that contain "Iurexia" or already processed branded headers
        // Headers - but skip lines that already have HTML or branded headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-serif font-medium mt-3 mb-1">$1</h3>')
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
        .replace(/((<li.*<\/li>\n?)+)/g, '<ul class="my-3">$1</ul>')
        // Ordered lists
        .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br/>')
        // Wrap in paragraph (but not elements that start with HTML tags)
        .replace(/^(.+)$/gm, (match) => {
            if (match.startsWith('<')) return match;
            return `<p class="mb-2">${match}</p>`;
        });
}

// Typing indicator component with informative message
// Typing indicator component with animated progressive text
export function TypingIndicator({ retryMessage }: { retryMessage?: string } = {}) {
    const [textIndex, setTextIndex] = useState(0);
    const loadingTexts = [
        "Analizando tu consulta...",
        "Construyendo respuesta con datos verificados...",
        "Consultando legislación federal y estatal...",
        "Revisando jurisprudencia relevante...",
        "Preparando análisis legal..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    // If retry message is provided, show cold start indicator
    if (retryMessage) {
        return (
            <div className="flex gap-4 justify-start animate-slide-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="message-assistant px-4 py-4 border-l-4 border-amber-500">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-amber-900 font-semibold text-sm">
                            ⏳ Despertando el servidor...
                        </span>
                        <span className="text-amber-700 text-xs">
                            {retryMessage}
                        </span>
                        <span className="text-amber-600 text-xs mt-0.5 italic">
                            Esto sucede cuando el servidor ha estado inactivo. Solo llevará unos segundos.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 justify-start animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="message-assistant px-4 py-4">
                <div className="flex items-start gap-2">
                    {/* Animated Message */}
                    <div className="flex flex-col">
                        <span className="text-charcoal-700 font-medium text-sm transition-opacity duration-300">
                            🧠 {loadingTexts[textIndex]}
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
