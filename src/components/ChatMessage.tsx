'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { User, FileText, FileDown, Printer, Loader2, Copy, Check, Sparkles, Gem, FolderPlus, PenTool, FileSignature, Wand2, CornerDownLeft, X } from 'lucide-react';
import { AvatarIurexia } from '@/components/AvatarIurexia';
import { citasSinFuente, conFichas, resumenDeCitas, useFichasDeCitas } from '@/lib/documento/fichas';
import { GuardarEnCarpetaModal, type ContenidoParaCarpeta } from '@/components/GuardarEnCarpeta';
import { SelloCitas, registrosDeLaRespuesta, rubrosPorRegistro, citasSinRegistro } from '@/components/SelloCitas';
import type { Message } from '@/lib/api';
import { recortarABloque, useRevelado } from '@/lib/documento/revelado';
import { type MetaCitas, fuenteDeCita, referenciaAPA } from '@/lib/documento/citas';
import { enlaceOficialCoidh, esCoidh } from '@/lib/coidh';
import { enlaceBJV, esDoctrina } from '@/lib/doctrina';
import { FuentesPorInstitucion } from '@/components/documento/FuentesPorInstitucion';
import { type FuenteMarcador, type MetaDelServidor, type PrecedenteMeta, filterDocumentContent, formatMarkdown, limpiarMarcadoresInternos, limpiarParaExportar, procesarRespuesta, textoParaCopiar } from '@/lib/respuestaDelChat';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    /** Para la tarjeta del consultante: nombre, foto y tratamiento del perfil. */
    nombre?: string | null;
    avatarUrl?: string | null;
    tratamiento?: string | null;
    onCitationClick?: (source: { docId: string } & FuenteMarcador) => void;
    /** Lleva esta respuesta al documento: al constructor si está abierto, o al panel Documento. */
    onLlevarAlDocumento?: (markdown: string) => void;
    /** «Desarrollar a partir de este fundamento»: el abogado escribe qué quiere
     *  y Iurexia lo redacta apoyada en las fuentes que esta respuesta ya trae
     *  firmadas. Ver `fijarFuentesVerificadas` en `@/lib/api`. */
    onDesarrollar?: (instruccion: string) => void;
    /** La respuesta vive en el panel Documento: aquí sólo se resume y se enlaza. */
    enDocumento?: boolean;
    onVerDocumento?: () => void;
    /** MODO BÁSICO (18-sep-2026): la respuesta se lee EN EL HILO y nada más.
     *  Sin hoja de Word, sin exportar, sin carpeta y sin sello de citas: aquí
     *  no hay verificación contra el acervo que sellar, y las fuentes ya van
     *  escritas con su registro al pie de la respuesta. Ver `@/lib/gratis`. */
    basico?: boolean;
}

// UUID regex for document IDs
const UUID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;

const TRATAMIENTOS_CHAT: Record<string, string> = {
    licenciado: 'El abogado',
    licenciada: 'La abogada',
    lic: 'Lic.',
};





export default function ChatMessage({ message, isStreaming = false, onCitationClick, nombre, avatarUrl, tratamiento, onLlevarAlDocumento, onDesarrollar, enDocumento = false, onVerDocumento , basico = false }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const contentRef = useRef<HTMLDivElement>(null);

    // Extract unique document IDs, thinking content, and create numbered references
    const { processedContent, docIdMap, thinkingContent, citationMeta: metaDelServidor, isSynthesizing, precedentesMeta } = useMemo(() => {
        if (isUser) return { processedContent: message.content, docIdMap: new Map<string, number>(), thinkingContent: '', citationMeta: null as MetaDelServidor | null, isSynthesizing: false, precedentesMeta: null as PrecedenteMeta[] | null };
        return procesarRespuesta(message.content || '');
    }, [message.content, isUser]);

    /* LA CITA QUE EL MAPA NO TRAE SE PIDE A `/cita` (26-sep-2026). David:
       «Siempre debemos asegurar el PDF en el visor». Al terminar la respuesta,
       lo que falte en `CITATION_META.sources` se resuelve por identificador y
       entra en el mismo mapa: así abren su PDF la ficha del texto, la lista por
       institución y las referencias del Word, también en los mensajes ya
       guardados. Durante el stream no se pide: el mapa final aún puede traerlas. */
    const idsSinFicha = useMemo(
        () => citasSinFuente(docIdMap.keys(), metaDelServidor),
        [docIdMap, metaDelServidor],
    );
    const { fichas: fichasResueltas, estado: estadoFichas } = useFichasDeCitas(idsSinFicha, !isStreaming && !isUser);
    const citationMeta = useMemo(() => conFichas(metaDelServidor, fichasResueltas), [metaDelServidor, fichasResueltas]);
    const cuentaCitas = useMemo(
        () => resumenDeCitas(docIdMap.keys(), citationMeta, estadoFichas),
        [docIdMap, citationMeta, estadoFichas],
    );

    // El HTML se rehacía en CADA render, y durante el stream eso son cientos:
    // todo el árbol del mensaje se destruía y se volvía a crear con cada trozo,
    // así que un clic podía caer sobre un nodo que dejaba de existir a mitad de
    // camino. Memorizado, sólo se recalcula cuando el texto cambia de verdad.
    /* MIENTRAS LLEGA, SÓLO LO TERMINADO (18-sep-2026). Del texto en vuelo se
       enseña hasta el último párrafo cerrado: así el bloque aparece entero,
       con su desvanecido, en vez de escribirse letra a letra. */
    const htmlFormateado = useMemo(
        () => formatMarkdown(isStreaming ? recortarABloque(processedContent) : processedContent),
        [processedContent, isStreaming],
    );
    useRevelado(contentRef, htmlFormateado, isStreaming);
    // El razonamiento y las lecturas del sello se hacían en CADA render, sin
    // memoria: durante el stream eso es una vez por trozo. Las del sello, sólo
    // cuando el sello se pinta (terminada la respuesta).
    const htmlRazonamiento = useMemo(() => (thinkingContent ? formatMarkdown(thinkingContent) : ''), [thinkingContent]);
    const conSello = !isStreaming && !basico;
    const lecturaDelSello = useMemo(() => (conSello ? {
        registros: registrosDeLaRespuesta(processedContent),
        rubros: rubrosPorRegistro(processedContent),
        sinRegistro: citasSinRegistro(processedContent),
    } : null), [processedContent, conSello]);

    // ── CUENTA EN PAUSA POR UN COBRO QUE NO ENTRÓ (31-ago-2026) ───────────
    //
    // El backend manda `<!-- SUSCRIPCION_SUSPENDIDA -->` cuando la mensualidad
    // no se pudo cobrar en catorce días. Aquí se cambia por un aviso con el
    // botón de pagar: decirle a un abogado que no pudimos cobrarle y no
    // enseñarle dónde arreglarlo es media respuesta, y acaba en soporte —o en
    // una cancelación— por algo que casi siempre es una tarjeta vencida.
    const enPausaPorImpago = !isUser
        && (message.content || '').includes('<!-- SUSCRIPCION_SUSPENDIDA -->');

    // ── CLEAN CONTENT FOR EXPORT ──────────────────────────────────────
    // Strips ALL citation artifacts so downloaded PDF/DOCX are clean legal prose
    const cleanContentForExport = useCallback((raw: string): string => limpiarParaExportar(raw, docIdMap), [docIdMap]);

    // Clean HTML content for PDF export. Preserves citation numbers as
    // superscripts so they correlate with the APA references list at the end.
    const cleanHtmlForExport = useCallback((html: string): string => {
        let clean = html;

        // Convert <sup class="citation-badge" ...>[N]</sup> → plain superscript [N]
        // (strips data-doc-id and event handlers but keeps the visible number)
        clean = clean.replace(
            /<sup class="citation-badge"[^>]*>\[?(\d+)\]?<\/sup>/gi,
            '<sup style="font-size:0.75em;color:#666;">[$1]</sup>'
        );

        // Remove <!-- CITATION_META --> that might be in rendered HTML
        clean = clean.replace(/<!--\s*CITATION_META:\{[\s\S]*?\}\s*-->/g, '');

        // Remove standalone UUIDs from rendered text
        clean = clean.replace(/(?<![\/a-f0-9])[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\/a-f0-9])/gi, '');

        // Clean up double spaces
        clean = clean.replace(/  +/g, ' ');

        return clean;
    }, []);


    // ── APA-style reference builder ──────────────────────────────────────────
    // UNA SOLA REFERENCIA APA (25-sep-2026). Ésta era una copia a mano de
    // `referenciaAPA` (`@/lib/documento/citas`), la de la hoja tipo Word, y
    // las dos arrastraban el mismo error: todo el bloque de constitucionalidad
    // —cuadernillos y tratados incluidos— salía como «Constitución Política…».
    // Se corrige en un solo sitio y aquí se usa ése, con la rama de la Corte
    // IDH delante.
    type CitSource = FuenteMarcador;

    const buildAPAReference = useCallback((src: CitSource): string => referenciaAPA(src), []);

    // Build ordered list of APA references from citationMeta + docIdMap.
    // Returns array of { num, reference, pdfUrl } sorted by citation number.
    // NOTE: docIdMap stores UUIDs as lowercase, but backend sources_map keys
    // preserve the original case from Qdrant. We must do case-insensitive lookup.
    const buildAPAReferenceList = useCallback((): Array<{ num: number; reference: string; pdfUrl?: string | null }> => {
        if (!citationMeta?.sources || docIdMap.size === 0) return [];
        const list: Array<{ num: number; reference: string; pdfUrl?: string | null }> = [];
        const sortedEntries = Array.from(docIdMap.entries()).sort((a, b) => a[1] - b[1]);

        // Build a lowercase→original key map for case-insensitive lookup
        const sourcesLowerMap: Record<string, string> = {};
        for (const key of Object.keys(citationMeta.sources)) {
            sourcesLowerMap[key.toLowerCase()] = key;
        }

        for (const [uuid, num] of sortedEntries) {
            // Try direct match first, then case-insensitive via the lower map
            const src = citationMeta.sources[uuid]
                || citationMeta.sources[sourcesLowerMap[uuid.toLowerCase()] || ''];
            if (!src) continue;
            list.push({
                num,
                reference: buildAPAReference(src),
                // La Corte IDH, en la página del párrafo (el enlace del escrito
                // sí lleva `#page`; el campo `pdf_url`, nunca). Y a la Corte,
                // no a la copia de legal-docs que ahora viaja en `pdf_url`.
                // La doctrina, a la obra en la BJV y en su página.
                pdfUrl: (esCoidh(src) ? enlaceOficialCoidh(src) : esDoctrina(src) ? enlaceBJV(src) : src.pdf_url) || null,
            });
        }
        return list;
    }, [citationMeta, docIdMap, buildAPAReference]);

    // Build HTML block for the APA references section (used in PDF export)
    const buildReferencesHtml = useCallback((): string => {
        const refs = buildAPAReferenceList();
        if (refs.length === 0) return '';
        const items = refs.map(r => {
            const link = r.pdfUrl
                ? ` <a href="${r.pdfUrl}" style="color:#8a6d2e;text-decoration:none;font-size:11px;">[Fuente]</a>`
                : '';
            return `<p style="margin:0 0 10px 0;padding-left:24px;text-indent:-24px;font-size:12px;line-height:1.5;color:#333;">[${r.num}] ${r.reference}${link}</p>`;
        }).join('');
        return `
            <div style="margin-top:36px;padding-top:18px;border-top:1.5px solid #C9A227;page-break-inside:avoid;">
                <h2 style="margin:0 0 14px 0;font-size:16px;font-weight:600;font-family:'Georgia',serif;color:#1a1a1a;">Referencias</h2>
                ${items}
            </div>
        `;
    }, [buildAPAReferenceList]);

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

        const rawHtml = contentRef.current.innerHTML;
        const content = cleanHtmlForExport(rawHtml);
        const referencesHtml = buildReferencesHtml();
        const fullHtml = `
            <div style="font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px;">
                ${generateHeader()}
                <div style="line-height: 1.6; color: #333; text-align: justify;">
                    ${content}
                </div>
                ${referencesHtml}
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
    }, [cleanHtmlForExport, buildReferencesHtml]);

    // Export to DOCX with proper formatting
    const handleExportDOCX = useCallback(async () => {
        if (!contentRef.current) return;

        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, FootnoteReferenceRun } = await import('docx');

        const date = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Get the raw message content and strip ALL citation artifacts
        const rawContent = cleanContentForExport(message.content);

        // ── Build footnotes map from APA references ──
        const apaRefs = buildAPAReferenceList();
        const footnotesConfig: Record<number, { children: any[] }> = {};
        for (const r of apaRefs) {
            footnotesConfig[r.num] = {
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: r.reference,
                                size: 20,
                                font: "Arial",
                                color: "333333"
                            })
                        ],
                        spacing: { after: 60 }
                    })
                ]
            };
        }

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
                        italics: true,
                        font: "Arial"
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
                        color: "888888",
                        font: "Arial"
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
                    docChildren.push(createFormattedParagraph(text, Paragraph, TextRun, AlignmentType, FootnoteReferenceRun, footnotesConfig));
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

            // Skip citation badges like [Doc ID: ...] / [Doc IDs: ...]
            if (trimmedLine.match(/^\[Doc IDs?:/)) {
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
                                size: 28,
                                font: "Arial"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 480, after: 240, line: 360 }
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
                                size: 30,
                                font: "Arial"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 480, after: 300, line: 360 }
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
                                size: 26,
                                font: "Arial"
                            })
                        ],
                        spacing: { before: 360, after: 200, line: 360 }
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
                                size: 26,
                                font: "Arial"
                            })
                        ],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { before: 240, after: 120, line: 360 }
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
                                    size: 26,
                                    font: "Arial"
                                }),
                                new TextRun({
                                    text: restOfText,
                                    size: 26,
                                    font: "Arial"
                                })
                            ],
                            alignment: AlignmentType.JUSTIFIED,
                            spacing: { before: 200, after: 120, line: 360 }
                        })
                    );
                    continue;
                }
            }

            // Blockquotes (> "Artículo...") — italic indented paragraph with footnote support
            if (trimmedLine.startsWith('> ') || trimmedLine.startsWith('>')) {
                flushParagraph();
                const quoteText = trimmedLine.replace(/^>\s*/, '');
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: quoteText,
                                italics: true,
                                size: 24,
                                font: "Arial",
                                color: "333333"
                            })
                        ],
                        indent: { left: 480 },
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { before: 120, after: 120, line: 360 }
                    })
                );
                continue;
            }

            // Regular line - accumulate for paragraph
            currentParagraphLines.push(trimmedLine);
        }

        // Flush remaining paragraph
        flushParagraph();

        // ── Footnotes are now rendered inline via FootnoteReferenceRun ──
        // No separate "References" section needed — they appear at page bottom.

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
            footnotes: footnotesConfig,
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
        const downloadBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(downloadBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Iurexia-consulta-${Date.now()}.docx`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [message.content, buildAPAReferenceList]);

    // Helper function to create formatted paragraphs with bold text support + footnotes.
    function createFormattedParagraph(text: string, Paragraph: any, TextRun: any, AlignmentType: any, FootnoteReferenceRun: any, footnotesConfig: Record<number, any>) {
        // Step 1: split by **bold** markers
        const boldParts: { text: string; bold: boolean }[] = [];
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                boldParts.push({ text: text.slice(lastIndex, match.index), bold: false });
            }
            boldParts.push({ text: match[1], bold: true });
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
            boldParts.push({ text: text.slice(lastIndex), bold: false });
        }
        if (boldParts.length === 0) {
            boldParts.push({ text, bold: false });
        }

        // Step 2: within each part, split out ⟦N⟧ citation tokens as superscript runs
        type Run = { text: string; bold: boolean; superscript?: boolean };
        const runs: Run[] = [];
        const citRegex = /⟦(\d+)⟧/g;
        for (const p of boldParts) {
            let li = 0;
            let m;
            while ((m = citRegex.exec(p.text)) !== null) {
                if (m.index > li) {
                    runs.push({ text: p.text.slice(li, m.index), bold: p.bold });
                }
                runs.push({ text: `[${m[1]}]`, bold: false, superscript: true });
                li = m.index + m[0].length;
            }
            if (li < p.text.length) {
                runs.push({ text: p.text.slice(li), bold: p.bold });
            }
            citRegex.lastIndex = 0;
        }

        // Build final children: replace ⟦N⟧ with FootnoteReferenceRun
        const children: any[] = [];
        for (const r of runs) {
            if (r.superscript) {
                // Extract the citation number from [N]
                const citNumMatch = r.text.match(/\[(\d+)\]/);
                const citNum = citNumMatch ? parseInt(citNumMatch[1]) : 0;
                if (citNum > 0 && footnotesConfig[citNum]) {
                    children.push(new FootnoteReferenceRun(citNum));
                } else {
                    // Fallback: keep as superscript text
                    children.push(new TextRun({
                        text: r.text,
                        bold: false,
                        superScript: true,
                        size: 20,
                        font: "Arial",
                        color: "666666",
                    }));
                }
            } else {
                children.push(new TextRun({
                    text: r.text,
                    bold: r.bold,
                    size: 26,
                    font: "Arial"
                }));
            }
        }

        return new Paragraph({
            children,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 240, line: 360 }
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

    // Handle copy to clipboard
    const [copied, setCopied] = useState(false);
    // Contenido listo para mandar a una carpeta inteligente; null = modal cerrado.
    const [paraCarpeta, setParaCarpeta] = useState<ContenidoParaCarpeta | null>(null);
    // ── DESARROLLAR A PARTIR DE ESTE FUNDAMENTO (19-sep-2026) ──────────────
    // David: «una ventana de texto en la que el usuario pueda ingresar su
    // prompt para generar el documento completo que quiere con ese fundamento».
    //
    // La gracia no es el botón, es lo que hay detrás: la consulta sale con los
    // identificadores de las fuentes que esta respuesta ya citó y el sello ya
    // firmó, así que el buscador no las busca otra vez. Sin eso, medido en
    // producción, la segunda vuelta salía con diez citas acusadas de no
    // corresponder al acervo. Con eso, cero.
    const [desarrollando, setDesarrollando] = useState(false);
    const [instruccion, setInstruccion] = useState('');
    const cajaInstruccion = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (desarrollando) cajaInstruccion.current?.focus();
    }, [desarrollando]);
    const handleCopy = useCallback(() => {
        // Clean up internal tags, metadata, and HTML comments before copying.
        // Lo agrupado —«[Doc IDs: a; b]»— se abre antes en singulares, que se
        // quitan abajo: si no, al portapapeles iba «[Doc IDs: ; ]».
        const cleanContent = textoParaCopiar(message.content);

        navigator.clipboard.writeText(cleanContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [message.content]);

    // La pausa no es una respuesta del asistente: es un aviso de la casa. Va
    // antes de todo lo demás y sin barra de acciones —copiar o descargar esto
    // no tiene sentido—.
    if (enPausaPorImpago) {
        return (
            <div className="flex gap-4 justify-start animate-slide-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
                    <span className="text-amber-800 text-sm font-serif">!</span>
                </div>
                <div className="max-w-[85%] rounded-xl border border-amber-300 bg-amber-50 p-5">
                    <h4 className="font-serif text-lg font-medium text-charcoal-900 mb-2">
                        Cuenta suspendida por falta de pago
                    </h4>
                    <p className="text-sm leading-relaxed text-charcoal-700 mb-3">
                        Para reactivar, actualiza tu método de pago. Tu cuenta permanecerá
                        suspendida hasta que se cubra el adeudo.
                    </p>
                    <p className="text-sm leading-relaxed text-charcoal-700 mb-4">
                        <strong className="text-charcoal-900">No has perdido nada:</strong> tu plan,
                        tus conversaciones, tus carpetas y tus documentos siguen intactos. En cuanto
                        entre el pago, tu acceso vuelve solo.
                    </p>
                    <a
                        href="/cuenta/suscripcion"
                        className="inline-block rounded-lg bg-charcoal-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-charcoal-800"
                    >
                        Actualizar mi método de pago
                    </a>
                    <p className="mt-3 text-xs text-charcoal-500">
                        ¿Crees que es un error? Escríbenos a{' '}
                        <a href="mailto:soporte@iurexia.com" className="underline">soporte@iurexia.com</a>{' '}
                        y lo revisamos el mismo día.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {/* Avatar - Assistant. Sólo desde sm: en un teléfono de 375px el
                circulito y su hueco se comían 48px de una columna de 240. */}
            {!isUser && (
                <AvatarIurexia className="hidden sm:flex w-8 h-8" />
            )}

            {/* Message Bubble */}
            <div
                className={isUser
                    ? 'max-w-[85%] sm:max-w-[80%] message-user px-4 py-3'
                    /* LA VENTANITA. La respuesta medía el 80% de una columna
                       de 736px: 555px de texto y 99px sin usar a la derecha.
                       Ahora ocupa la columna entera (el ancho lo fija el hilo)
                       y recorta sus esquinas para que la barra de acciones no
                       pinte cuadrado sobre el radio. */
                    : 'w-full min-w-0 message-assistant overflow-hidden'}
            >
                {isUser ? (
                    /* La tarjeta del consultante, permanente en el historial.
                       Es la misma identidad visual que encabeza el flujo del
                       agente: monograma o fotografía, tratamiento elegido y
                       «pregunta:». Los marcadores internos ([MODO_FLASH],
                       [MODO_REDACCION…]) se limpian — llegaron a verse crudos
                       en producción. */
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-accent-gold/60" />
                            ) : (
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-gold/20 ring-1 ring-accent-gold/60 font-serif text-xs font-semibold text-accent-gold">
                                    {((nombre ?? 'I').trim() || 'I').charAt(0).toUpperCase()}
                                </span>
                            )}
                            {(nombre ?? '').trim() ? (
                                <p className="min-w-0 truncate text-[12.5px] font-medium text-cream-100">
                                    {TRATAMIENTOS_CHAT[tratamiento ?? 'lic'] ?? 'Lic.'} {(nombre ?? '').trim()}{' '}
                                    <span className="text-cream-100/60">pregunta:</span>
                                </p>
                            ) : (
                                <p className="text-[12.5px] font-medium text-cream-100/80">Consulta:</p>
                            )}
                        </div>
                        <p className="text-sm sm:text-base whitespace-pre-wrap">
                            {limpiarMarcadoresInternos(filterDocumentContent(message.content))}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Insignia del escalón con el que se redactó la respuesta.
                            Platinum manda sobre Pro: el backend enciende ambas
                            banderas y aquí gana la que de verdad corrió. */}
                        {(message.isPlatinum || message.isPro || message.isProfesional) && (
                            /* Una sola pastilla para los tres escalones: antes cada
                               una traía su paleta (pizarra, ámbar, crema) y era el
                               primer «mezclado» de la burbuja. Cambia el icono, no
                               el estilo. Platinum manda sobre Pro: el backend
                               enciende ambas banderas y aquí gana la que corrió. */
                            <div className="mx-5 sm:mx-6 mt-4 inline-flex items-center gap-1.5 rounded-full border border-cream-400/70 bg-cream-100 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-charcoal-700">
                                {message.isPlatinum
                                    ? <Gem className="w-3 h-3 text-charcoal-900" />
                                    : message.isPro
                                        ? <Sparkles className="w-3 h-3 text-accent-gold" />
                                        : <PenTool className="w-3 h-3 text-charcoal-500" />}
                                <span>{message.isPlatinum ? 'Redacción Platinum' : message.isPro ? 'Redacción Pro' : 'Redacción Básica'}</span>
                            </div>
                        )}
                        {/* Thinking/Reasoning section (collapsible) */}
                        {thinkingContent && (
                            <details className="mx-5 sm:mx-6 mt-3 mb-1 rounded-lg border border-cream-400/60 bg-cream-50/50 overflow-hidden">
                                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-charcoal-500 hover:bg-cream-100/50 transition-colors select-none flex items-center gap-1.5">
                                    {/* Giraba también en las respuestas terminadas del
                                        historial, y una ruedita que gira siempre deja de
                                        significar «cargando». */}
                                    <Loader2 className={`w-3 h-3 text-charcoal-400 ${isStreaming ? 'animate-spin' : ''}`} />
                                    <span>Ver razonamiento jurídico</span>
                                    <span className="text-charcoal-400/50 ml-auto text-[10px]">{Math.round(thinkingContent.length / 4)} tokens</span>
                                </summary>
                                <div
                                    className="px-3 py-2 text-xs text-charcoal-600 leading-relaxed border-t border-cream-200/40 max-h-64 overflow-y-auto prose-thinking bg-white"
                                    dangerouslySetInnerHTML={{ __html: htmlRazonamiento }}
                                />
                            </details>
                        )}
                        {/* Synthesis indicator (while DeepSeek is working) */}
                        {isSynthesizing && isStreaming && (
                            <div className="mx-5 sm:mx-6 mt-3 mb-1 px-3 py-2 text-xs font-medium text-charcoal-700 bg-cream-100 rounded-lg border border-cream-400/60 flex items-center gap-2 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-brown" />
                                <span>Los Genios están deliberando. Sintetizando respuesta final...</span>
                            </div>
                        )}
                        {/* Sin texto todavía: que se vea que se está escribiendo. */}
                        {isStreaming && !enDocumento && !processedContent.trim() && (
                            <div className="flex items-center px-5 sm:px-6 py-4 text-sm text-charcoal-600">
                                <Loader2 className="w-4 h-4 animate-spin text-accent-brown mr-2.5" />
                                Redactando la respuesta…
                            </div>
                        )}
                        {/* EN EL DOCUMENTO, NO EN LA BURBUJA (18-sep-2026). Cuando la
                            respuesta es un escrito, el texto se está escribiendo en la
                            hoja de la derecha; aquí se dice cuánto va y se enlaza. El
                            sello, las fuentes y las acciones siguen abajo, que se
                            calculan del texto y no de lo que se pinte. */}
                        {enDocumento && (
                            <div className="px-5 py-4 sm:px-6">
                                {/* `flex-wrap` y el botón con `basis-full` en teléfono: con
                                    «Ver documento» en la misma fila, la columna de texto se
                                    quedaba en 195 px y los emblemas salían como «C.. 3». */}
                                <div className="flex flex-wrap items-start gap-3 rounded-xl border border-cream-300 bg-cream-50 px-4 py-3">
                                    {isStreaming
                                        ? <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin text-accent-brown" />
                                        : <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-brown" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-charcoal-900">
                                            {isStreaming ? 'Escribiendo en el documento…' : 'Escrito en el documento'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-charcoal-500">
                                            {processedContent.trim() ? processedContent.trim().split(/\s+/).length.toLocaleString('es-MX') : 0} palabras
                                            {docIdMap.size > 0 ? ` · ${docIdMap.size} ${docIdMap.size === 1 ? 'cita' : 'citas'}` : ''}
                                            {/* Verificadas = citas del texto con ficha (del mapa o de
                                                `/cita`) que el servidor no marcó: ver `resumenDeCitas`. */}
                                            {cuentaCitas.verificadas > 0
                                                ? ` · ${cuentaCitas.verificadas} ${cuentaCitas.verificadas === 1 ? 'verificada' : 'verificadas'}`
                                                : ''}
                                        </p>
                                        {/* DE DÓNDE VINO CADA FUENTE, bajo el emblema de quien la
                                            publica (David, 18-sep y 18-sep-2026): Cámara de Diputados
                                            para leyes federales y Constitución, Suprema Corte para las
                                            tesis del Semanario, Corte Interamericana cuando se cita.
                                            Cada emblema despliega SUS fuentes; ya no hay una lista
                                            revuelta al pie. */}
                                        <FuentesPorInstitucion
                                            meta={citationMeta as unknown as MetaCitas | null}
                                            docIdMap={docIdMap}
                                            onCita={onCitationClick}
                                            resolver={!isStreaming}
                                            className="mt-2.5"
                                        />
                                    </div>
                                    {onVerDocumento && (
                                        <button type="button" onClick={onVerDocumento}
                                            className="inline-flex h-8 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg bg-charcoal-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-charcoal-800 max-sm:order-last max-sm:mt-1 max-sm:basis-full">
                                            Ver documento
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div
                            ref={contentRef}
                            className={enDocumento ? 'hidden' : 'prose-legal respuesta px-5 py-4 sm:px-6'}
                            onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.classList.contains('citation-badge') && target.dataset.docId) {
                                    e.preventDefault();
                                    const docId = target.dataset.docId;
                                    // La misma fuente que abre la lista por institución y la
                                    // hoja: `fuenteDeCita` la busca sin distinguir mayúsculas
                                    // (data-doc-id siempre va en minúsculas y sources_map puede
                                    // traerlas de los alias de reparación de UUID) y copia de
                                    // una vez lo de la Corte IDH, la doctrina y el sello de
                                    // vigencia, con la que la reemplaza ya resuelta.
                                    onCitationClick?.(fuenteDeCita(citationMeta as unknown as MetaCitas | null, docId));
                                }
                                // Handle precedente card clicks
                                const precCard = target.closest('.precedente-card') as HTMLElement;
                                if (precCard?.dataset.precIdx && precedentesMeta) {
                                    e.preventDefault();
                                    const idx = parseInt(precCard.dataset.precIdx, 10);
                                    const prec = precedentesMeta[idx];
                                    if (prec) {
                                        onCitationClick?.({
                                            docId: prec.id,
                                            origen: prec.origen || 'Sentencia Judicial',
                                            ref: prec.ref || '',
                                            texto: prec.holding || '',
                                            silo: prec.silo,
                                            pdf_url: prec.pdf_url,
                                        });
                                    }
                                }
                            }}
                        />
                        {/* MIENTRAS LLEGA EL TEXTO: una ruedita al pie con la cuenta
                            de palabras, en el sitio exacto donde luego aparece la
                            barra de acciones, para que la burbuja no salte de alto
                            al terminar. Es la señal de carga que no depende de la
                            ramificación ni de ninguna animación avanzada. */}
                        {isStreaming && !enDocumento && processedContent.trim() && (
                            <div className="flex items-center px-5 sm:px-6 py-2 border-t border-cream-200 text-[12px] text-charcoal-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-brown mr-2" />
                                <span>Redactando…</span>
                                <span className="ml-auto tabular-nums">{processedContent.trim().split(/\s+/).length} palabras</span>
                            </div>
                        )}
                        {/* ── El sello de verificación ──────────────────────────
                            Hasta ahora, que el backend comprobara cada cita
                            contra el acervo sólo se veía en un log del
                            servidor. Aquí se le dice al abogado, y además se
                            comprueba contra el Semanario cada registro de
                            tesis citado en la prosa —lo único que el
                            validador del backend NO miraba. (7-ago-2026) */}
                        {lecturaDelSello && (
                            <SelloCitas
                                // Las mismas cuentas que la tarjeta y la hoja: una cita
                                // agrupada que `/cita` resolvió también está trazada.
                                trazadas={cuentaCitas.verificadas}
                                noTrazadas={cuentaCitas.noTrazadas}
                                // Lo que el servidor marcó pero existe: no es lo mismo
                                // que no existir (ver `resumenDeCitas`).
                                fueraDeContexto={cuentaCitas.fueraDeContexto}
                                sinComprobar={cuentaCitas.sinComprobar}
                                fichasPendientes={cuentaCitas.pendientes}
                                registros={lecturaDelSello.registros}
                                rubros={lecturaDelSello.rubros}
                                fueraDelAcervo={message.registrosFuera}
                                sinRegistro={lecturaDelSello.sinRegistro}
                            />
                        )}

                        {/* LAS FUENTES, POR INSTITUCIÓN (18-sep-2026). Donde antes
                            había una tira «N fuentes» que abría una lista revuelta
                            —la Constitución, una tesis y un cuadernillo de la Corte
                            Interamericana en el mismo renglón gris—, ahora manda el
                            emblema: cada institución con su cuenta, y sus fuentes al
                            oprimirla. En el hilo con documento esto ya sale dentro de
                            la tarjeta, así que aquí sólo se pinta cuando no lo hay. */}
                        {!isStreaming && !enDocumento && docIdMap.size > 0 && (
                            <FuentesPorInstitucion
                                meta={citationMeta as unknown as MetaCitas | null}
                                docIdMap={docIdMap}
                                onCita={onCitationClick}
                                resolver={!isStreaming}
                                className="mx-5 mb-3 mt-1 sm:mx-6"
                            />
                        )}
                        {/* Botones de acción. `flex-wrap` (7-ago-2026): sin él, los
                            cinco botones y la etiqueta medían 507 px dentro de una
                            fila de 272 en móvil, y «A mi carpeta» terminaba 197 px
                            fuera de la pantalla. La etiqueta se oculta en pantallas
                            estrechas porque los iconos ya dicen qué hace cada uno. */}
                        {!isStreaming && !basico && message.content.length > 50 && (
                            /* CON EL DOCUMENTO ABIERTO, SÓLO «A MI CARPETA» (David,
                                18-sep-2026: «todos esos botones dejan de tener sentido
                                excepto A mi carpeta»): descargar, copiar e ir al editor
                                son operaciones de la hoja, y la hoja las tiene en su
                                cabecera. Guardar en el expediente no: eso es del hilo. */
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 px-5 sm:px-6 py-2 border-t border-cream-200 bg-cream-50">
                                {!enDocumento && <span className="hidden sm:inline text-xs text-charcoal-500 mr-2">Exportar:</span>}
                                {!enDocumento && <button
                                    onClick={handleExportPDF}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-700 hover:bg-cream-200 rounded-md transition-colors"
                                    title="Exportar a PDF"
                                >
                                    <FileDown className="w-3.5 h-3.5" />
                                    PDF
                                </button>}
                                {!enDocumento && <button
                                    onClick={handleExportDOCX}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-700 hover:bg-cream-200 rounded-md transition-colors"
                                    title="Exportar a Word"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    DOCX
                                </button>}
                                {!enDocumento && <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-700 hover:bg-cream-200 rounded-md transition-colors"
                                    title="Imprimir"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                </button>}
                                {!enDocumento && <button
                                    onClick={handleCopy}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        copied
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'text-charcoal-700 hover:bg-cream-200'
                                    }`}
                                    title="Copiar texto de la respuesta"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? '¡Copiado!' : 'Copiar'}
                                </button>}

                                {/* La consulta entra al expediente donde sirve, como en la
                                    app. El título sale del arranque de la respuesta limpia. */}
                                {onDesarrollar && (
                                    <button
                                        onClick={() => setDesarrollando((v) => !v)}
                                        aria-expanded={desarrollando}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-charcoal-900 px-2.5 py-1.5 text-xs font-semibold text-cream-100 transition-colors hover:bg-charcoal-800"
                                        title="Redactar un escrito completo apoyado en las fuentes que esta respuesta ya verificó"
                                    >
                                        <Wand2 className="w-3.5 h-3.5" />
                                        Desarrollar a partir de este fundamento
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        const markdown = cleanContentForExport(message.content);
                                        const titulo = markdown
                                            .replace(/[#*_>`]/g, '')
                                            .trim()
                                            .split(/\s+/)
                                            .slice(0, 9)
                                            .join(' ')
                                            .slice(0, 80) || 'Consulta Iurexia';
                                        setParaCarpeta({ titulo, markdown });
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-1.5 text-xs font-medium text-charcoal-900 transition-colors hover:bg-accent-gold/20"
                                    title="Guardar esta respuesta en una carpeta de Mi trabajo"
                                >
                                    <FolderPlus className="w-3.5 h-3.5 text-accent-gold" />
                                    A mi carpeta
                                </button>

                                {/* AL EDITOR. La respuesta se abre como un documento de
                                    Word en esta misma ventana —sin marcadores ni
                                    identificadores— para darle forma antes de bajarla.
                                    Era «Al documento»; David lo quiso azul y con el
                                    nombre de lo que produce (15-sep-2026). El DOCX de al
                                    lado se queda tal cual: baja la respuesta con su
                                    membrete y las citas como notas al pie, que es lo que
                                    este camino no puede dar, porque una nota al pie no se
                                    puede ver en la hoja y lo que aquí se descarga es
                                    exactamente lo que se ve. */}
                                {onLlevarAlDocumento && !enDocumento && (
                                    <button
                                        onClick={() => onLlevarAlDocumento(message.content)}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                                        title="Abrir esta respuesta en el editor para darle forma y descargarla en Word"
                                    >
                                        <FileSignature className="w-3.5 h-3.5" />
                                        Word
                                    </button>
                                )}
                            </div>
                        )}

                        {/* LA VENTANITA. Se abre debajo de la barra, no encima de
                            la respuesta: el abogado tiene que poder LEER el
                            fundamento mientras escribe qué quiere hacer con él. */}
                        {onDesarrollar && desarrollando && !isStreaming && (
                            <div className="border-t border-cream-200 bg-cream-50 px-5 py-4 sm:px-6">
                                <div className="mb-2 flex items-start gap-2">
                                    <p className="flex-1 text-xs leading-relaxed text-charcoal-600">
                                        Dile qué escrito quieres. Se redactará sobre
                                        {/* Las mismas que cuentan la tarjeta y el sello, con las
                                            agrupadas que resolvió `/cita`: con `citationMeta.valid`
                                            decía 24 mientras la tarjeta decía 33. */}
                                        {cuentaCitas.verificadas === 1
                                            ? ' la fuente'
                                            : cuentaCitas.verificadas
                                                ? ` las ${cuentaCitas.verificadas} fuentes`
                                                : ' las fuentes'} que
                                        esta respuesta ya verificó, sin volver a buscarlas.
                                    </p>
                                    <button
                                        onClick={() => setDesarrollando(false)}
                                        className="rounded p-0.5 text-charcoal-400 transition-colors hover:bg-cream-200 hover:text-charcoal-700"
                                        aria-label="Cerrar"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div className="mb-2.5 flex flex-wrap gap-1.5">
                                    {[
                                        'Un amparo indirecto, con proemio, hechos, conceptos de violación y puntos petitorios',
                                        'Un escrito de agravios para la revisión',
                                        'Una demanda inicial con este fundamento',
                                    ].map((sug) => (
                                        <button
                                            key={sug}
                                            onClick={() => { setInstruccion(sug); cajaInstruccion.current?.focus(); }}
                                            className="rounded-full border border-cream-300 bg-white px-2.5 py-1 text-[11px] text-charcoal-600 transition-colors hover:border-accent-gold/50 hover:text-charcoal-900"
                                        >
                                            {sug.split(',')[0]}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
                                    <textarea
                                        id="caja-desarrollar"
                                        ref={cajaInstruccion}
                                        value={instruccion}
                                        onChange={(e) => setInstruccion(e.target.value)}
                                        onKeyDown={(e) => {
                                            // Enter envía; Mayús+Enter parte línea. Es lo que
                                            // hace el compositor de abajo, y una caja de texto
                                            // que se comporta distinto a la de al lado confunde.
                                            if (e.key === 'Enter' && !e.shiftKey && instruccion.trim()) {
                                                e.preventDefault();
                                                onDesarrollar(instruccion.trim());
                                                setInstruccion('');
                                                setDesarrollando(false);
                                            }
                                            if (e.key === 'Escape') setDesarrollando(false);
                                        }}
                                        rows={2}
                                        placeholder="Por ejemplo: redacta la demanda de amparo con estos criterios y transcribe los artículos"
                                        className="min-h-[2.75rem] w-full min-w-0 flex-1 resize-y rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold"
                                    />
                                    <button
                                        onClick={() => {
                                            if (!instruccion.trim()) return;
                                            onDesarrollar(instruccion.trim());
                                            setInstruccion('');
                                            setDesarrollando(false);
                                        }}
                                        disabled={!instruccion.trim()}
                                        className="inline-flex h-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent-gold px-3.5 text-sm font-semibold text-charcoal-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Redactar
                                        <CornerDownLeft className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <p className="mt-1.5 text-[11px] text-charcoal-500">Cuenta como una consulta.</p>
                            </div>
                        )}

                        <GuardarEnCarpetaModal
                            abierto={paraCarpeta !== null}
                            onCerrar={() => setParaCarpeta(null)}
                            contenido={paraCarpeta}
                        />
                    </>
                )}
            </div>

            {/* Sin avatar lateral para el usuario: la tarjeta del consultante
                ya lleva su fotografía o monograma dentro — el circulito
                genérico de al lado era redundante y desalineaba la burbuja. */}
        </div>
    );
}


// Typing indicator component with informative message
// Typing indicator component with animated progressive text
export function TypingIndicator({ retryMessage, retryType }: { retryMessage?: string; retryType?: string } = {}) {
    const [textIndex, setTextIndex] = useState(0);
    const loadingTexts = [
        "Analizando tu consulta...",
        "Buscando en la legislación...",
        "Consultando jurisprudencia...",
        "Preparando análisis legal..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    // If retry message is provided, show appropriate indicator based on type
    if (retryMessage) {
        const isColdStart = retryType === 'cold';
        return (
            <div className="flex gap-4 justify-start animate-slide-up">
                <AvatarIurexia latido />
                <div className="message-assistant px-4 py-4 border-l-4 border-amber-500">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-amber-900 font-semibold text-sm">
                            {isColdStart
                                ? '⏳ Despertando el servidor...'
                                : '⏳ Servidor procesando solicitudes, reintentando...'}
                        </span>
                        <span className="text-amber-700 text-xs">
                            {retryMessage}
                        </span>
                        <span className="text-amber-600 text-xs mt-0.5 italic">
                            {isColdStart
                                ? 'Esto sucede cuando el servidor ha estado inactivo. Solo llevará unos segundos.'
                                : 'El servidor está atendiendo varias solicitudes. Tu consulta se procesará en breve.'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 justify-start animate-slide-up">
            <AvatarIurexia />
            <div className="message-assistant px-4 py-4">
                <div className="flex items-start gap-2">
                    {/* Animated Message */}
                    <div className="flex flex-col">
                        <span className="text-charcoal-700 font-medium text-sm transition-opacity duration-300 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-brown" />
                            {loadingTexts[textIndex]}
                        </span>
                        <span className="text-charcoal-500 text-xs mt-0.5 ml-5.5">
                            Esto puede tomar unos segundos
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
