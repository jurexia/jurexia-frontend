'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { User, Scale, FileText, FileDown, Printer, Loader2, Copy, Check, Sparkles, Gem, FolderPlus, PenTool } from 'lucide-react';
import { GuardarEnCarpetaModal, type ContenidoParaCarpeta } from '@/components/GuardarEnCarpeta';
import { SelloCitas, registrosDeLaRespuesta, rubrosPorRegistro } from '@/components/SelloCitas';
import type { Message } from '@/lib/api';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    /** Para la tarjeta del consultante: nombre, foto y tratamiento del perfil. */
    nombre?: string | null;
    avatarUrl?: string | null;
    tratamiento?: string | null;
    onCitationClick?: (source: { docId: string; origen: string; ref: string; texto: string; pdf_url?: string | null; silo?: string; entidad?: string | null; registro?: string | null; tesis_num?: string | null; tipo_criterio?: string | null; instancia?: string | null; materia?: string | null }) => void;
}

// UUID regex for document IDs
const UUID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;

// Filter out document content from user messages (content between markers is hidden)
// For AUDITAR_SENTENCIA, show a compact card with file info
/**
 * Marcadores internos que viajan DENTRO del mensaje del usuario y que jamás
 * deben verse en pantalla: [MODO_FLASH], [MODO_REDACCION_*],
 * [MODO_PRECEDENTES] con sus [CORTE:]/[SALA:]/[CIRCUITO:]/[TRIBUNAL:].
 * En producción se llegó a ver «[MODO_FLASH] ¿qué artículos…» en el historial.
 */
function limpiarMarcadoresInternos(content: string): string {
    return content.replace(/^(?:\s*\[[A-Z_]+(?::[^\]]*)?\])+\s*/g, '').trim();
}

const TRATAMIENTOS_CHAT: Record<string, string> = {
    licenciado: 'El abogado',
    licenciada: 'La abogada',
    lic: 'Lic.',
};

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




export default function ChatMessage({ message, isStreaming = false, onCitationClick, nombre, avatarUrl, tratamiento }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const contentRef = useRef<HTMLDivElement>(null);

    // Extract unique document IDs, thinking content, and create numbered references
    const { processedContent, docIdMap, thinkingContent, citationMeta, isSynthesizing, precedentesMeta } = useMemo(() => {
        if (isUser) return { processedContent: message.content, docIdMap: new Map<string, number>(), thinkingContent: '', citationMeta: null as { valid: number; invalid: number; total: number; invalid_ids: string[]; sources?: Record<string, { origen: string; ref: string; texto: string; pdf_url?: string | null; silo?: string; entidad?: string | null; registro?: string | null; tesis_num?: string | null; tipo_criterio?: string | null; instancia?: string | null; materia?: string | null }> } | null, isSynthesizing: false, precedentesMeta: null as Array<{id:string; holding:string; ref:string; origen:string; score:number; silo:string; pdf_url?:string|null}> | null };

        let content = message.content || '';

        // Extract thinking content (chain-of-thought from thinking mode)
        let thinking = '';
        const thinkingMatch = content.match(/<!--THINKING_START-->([\s\S]*?)<!--THINKING_END-->/);
        if (thinkingMatch) {
            thinking = thinkingMatch[1];
            content = content.replace(/<!--THINKING_START-->[\s\S]*?<!--THINKING_END-->/, '').trim();
        } else if (content.includes('<!--THINKING_START-->')) {
            // El razonamiento aún está llegando y su marcador de cierre no ha
            // aparecido. Sin esto, el texto del razonamiento —y el marcador—
            // se pintarían crudos en la burbuja mientras dura la espera.
            const inicio = content.indexOf('<!--THINKING_START-->');
            thinking = content.slice(inicio + '<!--THINKING_START-->'.length);
            content = content.slice(0, inicio).trim();
        }

        // Determine if DeepSeek synthesis is happening
        let isSynthesizing = false;
        if (content.includes('<!--SYNTHESIS:START-->')) {
            isSynthesizing = !content.includes('<!--SYNTHESIS:END-->');
            // Clean up synthesis markers AND the "Consultando a los genios..." text that might be inside
            content = content.replace(/<!--SYNTHESIS:START-->[\s\S]*?<!--SYNTHESIS:END-->/g, '');
            // Also clean up dangling start markers if it's still streaming
            content = content.replace(/<!--SYNTHESIS:START-->[\s\S]*/, '');
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
        // Remove plural "Doc IDs" patterns like [Doc IDs: ; ] or [Doc IDs: xxx; yyy]
        content = content.replace(/\[Doc IDs?:[^\]]*\]/gi, '');

        // Remove any remaining raw "Doc ID:" text that wasn't properly formatted
        content = content.replace(/Doc ID:\s*[a-f0-9-]+/gi, '');

        // Remove any "## ⚖️ Análisis Legal" or "## ⚖️ Respuesta Legal" headers completely
        // (These are redundant - the user already knows this is a legal response from Iurexia)
        content = content.replace(/^---\s*$/gm, ''); // Remove standalone dashes
        content = content.replace(/##\s*⚖️?\s*(Análisis|Respuesta) Legal/gi, '');

        // Clean up leading whitespace/newlines left after removing headers
        content = content.replace(/^\s+/, '').trim();

        // Parse and strip <!-- CITATION_META:{...} --> from content
        let citationMeta: { valid: number; invalid: number; total: number; invalid_ids: string[]; sources?: Record<string, { origen: string; ref: string; texto: string; pdf_url?: string | null; silo?: string; entidad?: string | null; registro?: string | null; tesis_num?: string | null; tipo_criterio?: string | null; instancia?: string | null; materia?: string | null }> } | null = null;
        const metaMatch = content.match(/<!-- CITATION_META:(\{[\s\S]*?\}) -->/);
        if (metaMatch) {
            try {
                citationMeta = JSON.parse(metaMatch[1]);
            } catch { /* ignore parse errors */ }
            content = content.replace(/\n*<!-- CITATION_META:\{[\s\S]*?\} -->/g, '').trim();
        }

        // LAS FUENTES QUE LLEGAN ANTES DE ESCRIBIR (3-sep-2026).
        //
        // `CITATION_META` viaja al final del stream. Durante los treinta o
        // cuarenta segundos que tarda la respuesta, las citas estaban pintadas
        // pero vacías por dentro: el abogado pulsaba [4] y se abría un panel
        // sin nada. Tenía que esperar a que terminara todo para cotejar la
        // primera línea, que es justo cuando ya no le hace falta.
        //
        // El backend manda ahora `FUENTES_PREVIAS` en cuanto recupera, antes de
        // generar. Sirve de respaldo mientras dura el stream y el mapa final lo
        // sustituye al cerrar, porque ése trae el texto íntegro y los alias de
        // las citas reparadas.
        const previasMatch = content.match(/<!-- FUENTES_PREVIAS:(\{[\s\S]*?\}) -->/);
        if (previasMatch) {
            try {
                const previas = JSON.parse(previasMatch[1]);
                citationMeta = citationMeta
                    ? { ...citationMeta, sources: { ...previas, ...(citationMeta.sources || {}) } }
                    : { valid: 0, invalid: 0, total: 0, invalid_ids: [], sources: previas };
            } catch { /* si no parsea, se sigue esperando al mapa final */ }
            content = content.replace(/\n*<!-- FUENTES_PREVIAS:\{[\s\S]*?\} -->\n*/g, '').trim();
        }

        // La marca de cuenta en pausa se quita aquí para que nunca se vea como
        // texto; quien la pinta es el propio componente, más abajo.
        content = content.replace(/\n*<!--\s*SUSCRIPCION_SUSPENDIDA\s*-->/g, '').trim();

        // Parse and strip <!-- PRECEDENTES_META:[...] --> from content
        let precedentesMeta: Array<{id:string; holding:string; ref:string; origen:string; score:number; silo:string; pdf_url?:string|null}> | null = null;
        const precMatch = content.match(/<!-- PRECEDENTES_META:(\[[\s\S]*?\]) -->/);
        if (precMatch) {
            try {
                precedentesMeta = JSON.parse(precMatch[1]);
            } catch { /* ignore parse errors */ }
            content = content.replace(/\n*<!-- PRECEDENTES_META:\[[\s\S]*?\] -->/g, '').trim();
        }

        // ── Inject precedentes as clickable HTML into response content (before CONCLUSIÓN) ──
        if (precedentesMeta && precedentesMeta.length > 0) {
            const cards: string[] = [];
            for (let pi = 0; pi < precedentesMeta.length; pi++) {
                const prec = precedentesMeta[pi];
                // Clean ref: filter out "Null" parts from "3TCC · AD-892/2022 · Null · 2022"
                // Fallback: if ref is empty, use origen for a readable label
                let rawRef = prec.ref || '';
                if (!rawRef || rawRef === prec.id) {
                    // Use origen as fallback — e.g. "TCC_PENAL — 22° Circuito — Penal"
                    rawRef = prec.origen || 'Sentencia';
                }
                const cleanRef = rawRef.split(' · ').filter(p => p && p !== 'Null' && p !== 'null').join(' · ');
                // Parse materia from origen
                const materiaMatch = prec.origen?.match(/—\s*([A-ZÁÉÍÓÚ]+)\s*$/);
                const materia = materiaMatch?.[1] || '';
                const holdingPreview = prec.holding
                    ? (prec.holding.length > 250 ? prec.holding.slice(0, 250) + '...' : prec.holding)
                    : '';
                cards.push(
                    '<div class="precedente-card" data-prec-idx="' + pi + '" style="cursor:pointer;margin:8px 0;padding:12px 16px;border-left:3px solid #b8860b;background:linear-gradient(135deg,#faf6ee 0%,#fdf8f0 100%);border-radius:6px;transition:all 0.2s">' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
                    '<strong style="font-size:13px;color:#1a1a1a">' + cleanRef + '</strong>' +
                    (materia ? '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#e8e0d0;color:#5a4a2a;font-weight:600">' + materia + '</span>' : '') +
                    '</div>' +
                    (holdingPreview ? '<p style="font-size:12px;color:#4a4a4a;line-height:1.5;margin:0;font-style:italic">"' + holdingPreview.replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"</p>' : '') +
                    '<span style="display:block;text-align:right;font-size:10px;color:#b8860b;margin-top:4px;font-weight:600">Ver sentencia completa →</span>' +
                    '</div>'
                );
            }

            const section = '\n\n<hr style="border:none;border-top:1px solid #e0d8c8;margin:24px 0 16px"/>\n' +
                '<h3 style="color:#1a1a1a;font-size:16px;font-weight:700;margin-bottom:4px">Precedentes SCJN y de Colegiados de Circuito</h3>\n' +
                '<p style="font-size:13px;color:#666;margin-bottom:12px">Los siguientes precedentes de la Suprema Corte y Tribunales Colegiados de Circuito están relacionados con su consulta:</p>\n' +
                cards.join('\n') + '\n';

            // Try to insert before ### CONCLUSIÓN (case-insensitive)
            const conclusionRegex = /\n(#{1,3}\s*(CONCLUSI[ÓO]N|Conclusi[óo]n))/i;
            const conclusionMatch = content.match(conclusionRegex);
            if (conclusionMatch && conclusionMatch.index !== undefined) {
                content = content.slice(0, conclusionMatch.index) + section + content.slice(conclusionMatch.index);
            } else {
                content = content + section;
            }
        }

        return { processedContent: content, docIdMap, thinkingContent: thinking, citationMeta, isSynthesizing, precedentesMeta };
    }, [message.content, isUser]);

    // El HTML se rehacía en CADA render, y durante el stream eso son cientos:
    // todo el árbol del mensaje se destruía y se volvía a crear con cada trozo,
    // así que un clic podía caer sobre un nodo que dejaba de existir a mitad de
    // camino. Memorizado, sólo se recalcula cuando el texto cambia de verdad.
    const htmlFormateado = useMemo(() => formatMarkdown(processedContent), [processedContent]);

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
    const cleanContentForExport = useCallback((raw: string): string => {
        let clean = raw;

        // 1. Remove <!-- CITATION_META:{...} --> blocks (including multiline)
        clean = clean.replace(/\n*<!--\s*CITATION_META:\{[\s\S]*?\}\s*-->/g, '');

        // 1b. Remove <!-- PRECEDENTES_META:[...] --> blocks
        clean = clean.replace(/\n*<!--\s*PRECEDENTES_META:\[[\s\S]*?\]\s*-->/g, '');

        // 2. Replace [Doc ID: uuid] with bracketed citation number ⟦N⟧ using docIdMap.
        // Using ⟦⟧ as sentinel so downstream cleanup doesn't strip them.
        const replaceWithCitNum = (uuid: string): string => {
            const num = docIdMap.get(uuid.toLowerCase());
            return num ? `⟦${num}⟧` : '';
        };
        clean = clean.replace(/\[Doc ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/gi, (_, u) => replaceWithCitNum(u));
        clean = clean.replace(/\[\s*,?\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\]/gi, (_, u) => replaceWithCitNum(u));
        clean = clean.replace(/\[[^\]]*,\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\]/gi, (_, u) => replaceWithCitNum(u));
        clean = clean.replace(/Doc\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (_, u) => replaceWithCitNum(u));
        clean = clean.replace(/\(Doc ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\)/gi, (_, u) => replaceWithCitNum(u));

        // 2b. Remove any remaining Doc ID variants that didn't match a known UUID
        clean = clean.replace(/\[Doc ID:\s*[a-f0-9-]+\]/gi, '');
        clean = clean.replace(/\[Doc IDs?:[^\]]*\]/gi, '');

        // 4. Remove standalone Doc uuid references
        clean = clean.replace(/Doc\s+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '');

        // 5. Remove parenthetical (Doc ID: xxx) references
        clean = clean.replace(/\(Doc ID:\s*[a-f0-9-]+\)/gi, '');

        // 6. Remove standalone UUIDs (36-char hex with dashes) that aren't part of URLs
        clean = clean.replace(/(?<![\/a-f0-9])[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\/a-f0-9])/gi, '');

        // 7. Remove partial UUID fragments like [-985d-5043-8e4e-b43aaee99c66]
        clean = clean.replace(/\[-[a-f0-9-]{10,35}\]/gi, '');

        // 8. Remove leftover "Doc ID:" text
        clean = clean.replace(/Doc ID:\s*[a-f0-9-]*/gi, '');

        // 9. Remove <!-- THINKING_START/END --> blocks
        clean = clean.replace(/<!--THINKING_START-->[\s\S]*?<!--THINKING_END-->/g, '');

        // 10. Remove <!--PING--> and <!--CACHE:ACTIVE--> markers
        clean = clean.replace(/<!--\s*PING\s*-->/g, '');
        clean = clean.replace(/<!--\s*CACHE:\w+\s*-->/g, '');

        // 11. Remove <!-- SYNTHESIS --> markers
        clean = clean.replace(/<!--SYNTHESIS:\w+-->/g, '');

        // 12. Clean up double spaces and excessive blank lines left by removals
        clean = clean.replace(/  +/g, ' ');
        clean = clean.replace(/\n{3,}/g, '\n\n');
        clean = clean.replace(/\(\s*\)/g, ''); // empty parentheses
        clean = clean.replace(/\[\s*\]/g, '');  // empty brackets

        return clean.trim();
    }, [docIdMap]);

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
    // Constructs a properly formatted APA reference from CitationMeta source.
    // Returns plain-text reference suitable for both PDF (HTML) and DOCX (text).
    type CitSource = {
        origen: string;
        ref: string;
        texto: string;
        pdf_url?: string | null;
        silo?: string;
        entidad?: string | null;
        registro?: string | null;
        tesis_num?: string | null;
        tipo_criterio?: string | null;
        instancia?: string | null;
        materia?: string | null;
    };

    const buildAPAReference = useCallback((src: CitSource): string => {
        const origen = (src.origen || '').trim();
        const ref = (src.ref || '').trim();
        const silo = (src.silo || '').toLowerCase();
        const entidad = (src.entidad || '').trim();
        const instancia = (src.instancia || '').trim();
        const registro = (src.registro || '').trim();
        const tesisNum = (src.tesis_num || '').trim();
        const year = new Date().getFullYear();

        // Jurisprudencia / Tesis (SCJN, TCC, plenos)
        if (silo.includes('jurisprudencia') || tesisNum || registro) {
            const corte = instancia || 'Suprema Corte de Justicia de la Nación';
            const titulo = origen || ref || 'Tesis sin rubro';
            const tesisLabel = tesisNum ? ` Tesis ${tesisNum}.` : '';
            const regLabel = registro ? ` Registro digital: ${registro}.` : '';
            return `${corte}. (s.f.). ${titulo}.${tesisLabel}${regLabel} Semanario Judicial de la Federación.`;
        }

        // Sentencias de TCC (precedentes)
        if (silo.includes('sentencia') || silo.includes('precedente') || silo.includes('holding')) {
            const tribunal = origen || 'Tribunal Colegiado de Circuito';
            const expediente = ref ? `, Expediente ${ref}` : '';
            return `${tribunal}${expediente}. Poder Judicial de la Federación.`;
        }

        // Constitución
        if (silo.includes('constitu') || /CPEUM|Constituci[oó]n/i.test(origen)) {
            const articulo = ref ? `, art. ${ref}` : '';
            return `Constitución Política de los Estados Unidos Mexicanos${articulo}. (${year}). Cámara de Diputados del H. Congreso de la Unión.`;
        }

        // Tratados internacionales / DDHH
        if (silo.includes('bloque') || /tratado|convenci[oó]n|pacto|protocolo|declaraci[oó]n/i.test(origen)) {
            const articulo = ref ? `, art. ${ref}` : '';
            return `${origen}${articulo}. Tratado internacional ratificado por México.`;
        }

        // Leyes federales / código nacional
        if (silo.includes('federal') || silo.includes('codigo_nacional')) {
            const articulo = ref ? `, art. ${ref}` : '';
            return `${origen}${articulo}. (${year}). Cámara de Diputados del H. Congreso de la Unión.`;
        }

        // Leyes estatales
        if (silo.includes('estatal') || silo.startsWith('leyes_')) {
            const articulo = ref ? `, art. ${ref}` : '';
            const lugar = entidad ? ` Congreso del Estado de ${entidad}.` : '';
            return `${origen}${articulo}. (${year}).${lugar}`;
        }

        // Fallback genérico
        const articulo = ref ? `, art. ${ref}` : '';
        return `${origen || 'Fuente legal'}${articulo}. (${year}).`;
    }, []);

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
                pdfUrl: src.pdf_url || null,
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
    const handleCopy = useCallback(() => {
        // Clean up internal tags, metadata, and HTML comments before copying
        let cleanContent = message.content
            .replace(/<!--[\s\S]*?-->/g, '') // Remove ALL HTML comments (including CITATION_META)
            .replace(/---CONTENIDO DEL DOCUMENTO---[\s\S]*/g, '')
            .replace(/\[AUDITAR_SENTENCIA\]/g, '')
            .replace(/\[Doc\s*ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi, '')
            .replace(/(?<!")([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?!")/gi, '')
            .replace(/\[SCJN_BUSCAR:\s*[^\]]*\]/g, '')
            .trim();

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
                        {message.isPlatinum ? (
                            <div className="mx-4 mt-3 mb-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-[#e8e4dd] border border-slate-600 shadow-[0_0_6px_rgba(100,116,139,0.4)]">
                                <Gem className="w-3 h-3 text-[#e8e4dd]" />
                                <span>REDACCIÓN PLATINUM</span>
                            </div>
                        ) : message.isPro ? (
                            <div className="mx-4 mt-3 mb-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full bg-gradient-to-r from-amber-50 via-white to-amber-50 text-[#8a6d2e] border border-[#c9a962] shadow-[0_0_6px_rgba(201,169,98,0.3)]">
                                <Sparkles className="w-3 h-3 text-[#c9a962]" />
                                <span>REDACCIÓN PRO</span>
                            </div>
                        ) : message.isProfesional ? (
                            /* El escalón base también se declara. Antes salía sin
                               insignia: el abogado no tenía cómo saber qué motor
                               escribió su documento, y al ver PLATINUM en otra
                               respuesta parecía que las funciones se mezclaban. */
                            <div className="mx-4 mt-3 mb-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full bg-cream-100 text-charcoal-700 border border-cream-400">
                                <PenTool className="w-3 h-3 text-charcoal-500" />
                                <span>REDACCIÓN PROFESIONAL</span>
                            </div>
                        ) : null}
                        {/* Thinking/Reasoning section (collapsible) */}
                        {thinkingContent && (
                            <details className="mx-4 mt-3 mb-1 rounded-lg border border-cream-400/60 bg-cream-50/50 overflow-hidden">
                                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-charcoal-500 hover:bg-cream-100/50 transition-colors select-none flex items-center gap-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin text-charcoal-400" />
                                    <span>Ver razonamiento jurídico</span>
                                    <span className="text-charcoal-400/50 ml-auto text-[10px]">{Math.round(thinkingContent.length / 4)} tokens</span>
                                </summary>
                                <div
                                    className="px-3 py-2 text-xs text-charcoal-600 leading-relaxed border-t border-cream-200/40 max-h-64 overflow-y-auto prose-thinking bg-white"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(thinkingContent) }}
                                />
                            </details>
                        )}
                        {/* Synthesis indicator (while DeepSeek is working) */}
                        {isSynthesizing && isStreaming && (
                            <div className="mx-4 mt-3 mb-1 px-3 py-2 text-xs font-medium text-blue-800/80 bg-blue-50/50 rounded-lg border border-blue-200/60 flex items-center gap-2 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600/60" />
                                <span>Los Genios están deliberando. Sintetizando respuesta final...</span>
                            </div>
                        )}
                        <div
                            ref={contentRef}
                            className="prose-legal text-sm sm:text-base px-4 py-3"
                            dangerouslySetInnerHTML={{ __html: htmlFormateado }}
                            onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.classList.contains('citation-badge') && target.dataset.docId) {
                                    e.preventDefault();
                                    const docId = target.dataset.docId;
                                    // 🔒 Case-insensitive lookup: data-doc-id is always lowercase,
                                    // but sources_map may have mixed case from UUID repair aliases
                                    const src = citationMeta?.sources?.[docId] 
                                        || citationMeta?.sources?.[docId.toLowerCase()]
                                        || (citationMeta?.sources ? Object.entries(citationMeta.sources).find(([k]) => k.toLowerCase() === docId.toLowerCase())?.[1] : undefined);
                                    onCitationClick?.({
                                        docId,
                                        origen: src?.origen || 'Fuente legal',
                                        ref: src?.ref || '',
                                        texto: src?.texto || '',
                                        pdf_url: src?.pdf_url,
                                        silo: src?.silo,
                                        entidad: src?.entidad,
                                        registro: src?.registro,
                                        tesis_num: src?.tesis_num,
                                        tipo_criterio: src?.tipo_criterio,
                                        instancia: src?.instancia,
                                        materia: src?.materia,
                                    });
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
                        {/* ── El sello de verificación ──────────────────────────
                            Hasta ahora, que el backend comprobara cada cita
                            contra el acervo sólo se veía en un log del
                            servidor. Aquí se le dice al abogado, y además se
                            comprueba contra el Semanario cada registro de
                            tesis citado en la prosa —lo único que el
                            validador del backend NO miraba. (7-ago-2026) */}
                        {!isStreaming && (
                            <SelloCitas
                                trazadas={citationMeta?.valid ?? 0}
                                noTrazadas={citationMeta?.invalid ?? 0}
                                registros={registrosDeLaRespuesta(processedContent)}
                                rubros={rubrosPorRegistro(processedContent)}
                                fueraDelAcervo={message.registrosFuera}
                            />
                        )}

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
                                                    onClick={() => {
                                                        const src = citationMeta?.sources?.[uuid]
                                                            || citationMeta?.sources?.[uuid.toLowerCase()]
                                                            || (citationMeta?.sources ? Object.entries(citationMeta.sources).find(([k]) => k.toLowerCase() === uuid.toLowerCase())?.[1] : undefined);
                                                        onCitationClick?.({
                                                            docId: uuid,
                                                            origen: src?.origen || 'Fuente legal',
                                                            ref: src?.ref || '',
                                                            texto: src?.texto || '',
                                                            pdf_url: src?.pdf_url,
                                                            silo: src?.silo,
                                                            entidad: src?.entidad,
                                                            registro: src?.registro,
                                                            tesis_num: src?.tesis_num,
                                                            tipo_criterio: src?.tipo_criterio,
                                                            instancia: src?.instancia,
                                                            materia: src?.materia,
                                                        });
                                                    }}
                                                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-bold flex-shrink-0 hover:bg-blue-700 transition-colors cursor-pointer"
                                                    title="Ver documento y PDF completo"
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
                        {/* Botones de acción. `flex-wrap` (7-ago-2026): sin él, los
                            cinco botones y la etiqueta medían 507 px dentro de una
                            fila de 272 en móvil, y «A mi carpeta» terminaba 197 px
                            fuera de la pantalla. La etiqueta se oculta en pantallas
                            estrechas porque los iconos ya dicen qué hace cada uno. */}
                        {!isStreaming && message.content.length > 50 && (
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border-t border-cream-300 bg-cream-100/50">
                                <span className="hidden sm:inline text-xs text-charcoal-500 mr-2">Exportar:</span>
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
                                <button
                                    onClick={handleCopy}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        copied
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-cream-200 text-charcoal-700 hover:bg-cream-300'
                                    }`}
                                    title="Copiar texto de la respuesta"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? '¡Copiado!' : 'Copiar'}
                                </button>

                                {/* La consulta entra al expediente donde sirve, como en la
                                    app. El título sale del arranque de la respuesta limpia. */}
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
    // Se excluyen también `/`, `=` y `-`: un UUID dentro de una URL (ruta o
    // parámetro) se estaba borrando y dejaba el enlace roto.
    processed = processed.replace(/(?<!["/=-])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?!["-])/gi, '');
    // Clean up leftover Doc ID labels without UUIDs
    processed = processed.replace(/\[Doc\s*ID:\s*\]/gi, '');
    // Clean up parentheses or brackets that now only contain whitespace
    processed = processed.replace(/\(\s*\)/g, '');
    processed = processed.replace(/\[\s*\]/g, '');

    // STEP 3: Convert separator lines (═══, ─────) to styled HRs
    processed = processed.replace(/^[═]{5,}.*$/gm, '<hr class="section-divider" />');
    processed = processed.replace(/^[─]{5,}.*$/gm, '<hr class="section-divider-light" />');

    // STEP 5: Style "Fuentes citadas" or "FUENTES" headers
    processed = processed.replace(
        /^##\s*(Fuentes\s+citadas|FUENTES\s+CITADAS|Referencias)$/gim,
        '<div class="fuentes-header"><span>📚</span> <span>$1</span></div>'
    );

    // STEP 6: Style Iurexia main section headers — two-tone color split at " Y "
    processed = processed.replace(
        /^(?:##|###)\s*(RESPUESTA DIRECTA|MARCO CONSTITUCIONAL.*?|FUNDAMENTO LEGAL.*?|LEGISLACI\u00d3N FEDERAL.*?|JURISPRUDENCIA Y TESIS.*?|JURISPRUDENCIA.*?|LEGISLACI\u00d3N ESTATAL.*?|AN\u00c1LISIS INTEGRADO.*?|CONCLUSI\u00d3N.*?|FUERO APLICABLE.*?)$/gim,
        (_, title: string) => {
            const yIdx = title.indexOf(' Y ');
            if (yIdx !== -1) {
                const primary = title.slice(0, yIdx);
                const secondary = title.slice(yIdx); // includes ' Y ...'
                return `<div class="iurexia-section-header"><span class="section-primary">${primary}</span><span class="section-secondary">${secondary}</span></div>`;
            }
            return `<div class="iurexia-section-header"><span class="section-primary">${title}</span></div>`;
        }
    );

    return processed
        // Skip headers that contain "Iurexia" or already processed branded headers
        // H4 headers (#### text) → bold text paragraph
        .replace(/^#### (.*$)/gm, '<p class="mb-2"><strong class="font-semibold">$1</strong></p>')
        // H3, H2, H1 headers
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
        // Enlaces [texto](url) — NUNCA existió esta regla. Cualquier enlace que
        // el modelo escribiera salía crudo como «[Ficha](https://…)», estirado
        // además por el `text-align: justify` de .prose-legal (6-ago-2026).
        // Exige el paréntesis con esquema http(s), así que las referencias
        // sueltas tipo «[1]» y las citas internas siguen intactas.
        .replace(
            /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="enlace-externo">$1</a>'
        )
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white animate-pulse" />
                </div>
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
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
            </div>
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
