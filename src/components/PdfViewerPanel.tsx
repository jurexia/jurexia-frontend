'use client';

import { TesisVerificada } from '@/components/TesisVerificada';
import { VisorArticulo } from '@/components/VisorArticulo';

import { useEffect, useRef, useMemo } from 'react';
import { X, ExternalLink, FileText, BookOpen, ChevronRight, Scale, Gavel } from 'lucide-react';
import { findLawPdfUrl } from '@/lib/lawPdfLookup';

interface PdfSource {
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
}

interface PdfViewerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    source: PdfSource | null;
    citationNumber?: number;
}

// ── Tesis metadata parser ────────────────────────────────────────────────
interface TesisMetadata {
    tipo?: string;      // JURISPRUDENCIA | TESIS AISLADA
    materia?: string;   // CONSTITUCIONAL, ADMINISTRATIVA, etc.
    instancia?: string; // Pleno, Primera Sala, TCC, etc.
    tesis?: string;     // P./J. 81/2011 (9a.)
    registro?: string;  // 160596
    rubro?: string;     // The title in caps
    textoBody?: string; // The actual body text
}

/**
 * Extract rubro (ALL CAPS title) and body from raw tesis text.
 * Works with or without bracketed metadata.
 */
function extractRubroAndBody(rawText: string): { rubro: string | null; body: string } {
    const lines = rawText.split('\n').filter(l => l.trim());
    const rubroLines: string[] = [];
    let bodyStartIdx = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Rubro: ALL-CAPS, at least 10 chars, contains Spanish letters
        if (line.length > 10 && line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line)) {
            rubroLines.push(line);
        } else {
            bodyStartIdx = i;
            break;
        }
    }

    if (rubroLines.length > 0) {
        return {
            rubro: rubroLines.join(' '),
            body: lines.slice(bodyStartIdx).join('\n').trim(),
        };
    }
    return { rubro: null, body: rawText };
}

/**
 * Try to infer tesis type from the tesis identifier string.
 * /J. = Jurisprudencia, otherwise Tesis Aislada.
 */
function inferTipoFromIdentifier(id: string): string {
    if (/\/J\./i.test(id)) return 'JURISPRUDENCIA';
    return 'TESIS AISLADA';
}

/**
 * Try to infer instancia from a tesis identifier.
 * P. = Pleno; 1a. = Primera Sala; 2a. = Segunda Sala; I.Xo = TCC
 */
function inferInstancia(id: string): string | undefined {
    if (/^P\.\/?/i.test(id)) return 'Pleno';
    if (/^1a\./i.test(id)) return 'Primera Sala';
    if (/^2a\./i.test(id)) return 'Segunda Sala';
    if (/^[IVX]+\.\d+[oa]\./i.test(id)) return 'Tribunal Colegiado';
    return undefined;
}

/**
 * Clean and humanize an origen that looks like "2027232_I.3o.C.67 C (11a.)"
 * → extracts registro "2027232" and tesis id "I.3o.C.67 C (11a.)"
 */
function parseOrigenFallback(origen: string): { registro?: string; tesisId?: string } {
    // Pattern: "NNNNNN_TesisId" or "NNNNNNN_TesisId"
    const m = origen.match(/^(\d{5,7})[_\s]+(.+)/);
    if (m) return { registro: m[1], tesisId: m[2].trim() };
    // Just a registro number
    const regOnly = origen.match(/^(\d{5,7})$/);
    if (regOnly) return { registro: regOnly[1] };
    return {};
}

function parseTesisTexto(texto: string, source?: PdfSource | null): TesisMetadata | null {
    const hasBracketedMeta = texto.includes('[TIPO:') || texto.includes('[REGISTRO:');
    const meta: TesisMetadata = {};

    if (hasBracketedMeta) {
        // ── Path A: Bracketed metadata (newer ingestion) ──
        const tipoMatch = texto.match(/\[TIPO:\s*([^\]]+)\]/i);
        if (tipoMatch) meta.tipo = tipoMatch[1].trim();

        const materiaMatch = texto.match(/\[MATERIA:\s*([^\]]+)\]/i);
        if (materiaMatch) meta.materia = materiaMatch[1].trim();

        const instanciaMatch = texto.match(/\[INSTANCIA:\s*([^\]]+)\]/i);
        if (instanciaMatch) meta.instancia = instanciaMatch[1].trim();

        const tesisMatch = texto.match(/\[TESIS:\s*([^\]]+)\]/i);
        if (tesisMatch) meta.tesis = tesisMatch[1].trim();

        const registroMatch = texto.match(/\[REGISTRO:\s*([^\]]+)\]/i);
        if (registroMatch) meta.registro = registroMatch[1].trim();

        // Remove all bracketed metadata and dash separators
        const cleaned = texto
            .replace(/\[(?:TIPO|MATERIA|INSTANCIA|TESIS|REGISTRO|ÉPOCA|FUENTE|LOCALIZACIÓN|PÁGINA):\s*[^\]]*\]/gi, '')
            .replace(/^[-─]{3,}$/gm, '')
            .trim();

        const { rubro, body } = extractRubroAndBody(cleaned);
        meta.rubro = rubro || undefined;
        meta.textoBody = body;

    } else {
        // ── Path B: No bracketed metadata (older ingestion) ──
        // Try to extract rubro + body from the raw text
        const { rubro, body } = extractRubroAndBody(texto);
        meta.rubro = rubro || undefined;
        meta.textoBody = body;

        // Infer metadata from payload fields first, then from origen/ref
        if (source) {
            // Direct payload fields (new tesis have these)
            if (source.registro) meta.registro = source.registro;
            if (source.tipo_criterio) meta.tipo = source.tipo_criterio;
            if (source.tesis_num) meta.tesis = source.tesis_num;
            if (source.instancia) meta.instancia = source.instancia;
            if (source.materia) meta.materia = source.materia;

            // Fallback: extract registro and tesis ID from origen like "2027232_I.3o.C.67 C (11a.)"
            if (!meta.registro || !meta.tesis) {
                const origenParsed = parseOrigenFallback(source.origen || '');
                if (!meta.registro && origenParsed.registro) meta.registro = origenParsed.registro;
                if (!meta.tesis && origenParsed.tesisId) {
                    meta.tesis = origenParsed.tesisId;
                    if (!meta.tipo) meta.tipo = inferTipoFromIdentifier(origenParsed.tesisId);
                    if (!meta.instancia) meta.instancia = inferInstancia(origenParsed.tesisId);
                }
            }

            // Also try ref like "Tesis I.3o.C.67 C (11a.)" or "P./J. 81/2011 (9a.) | Registro 160596"
            if (!meta.tesis && source.ref) {
                const refTesis = source.ref.replace(/^Tesis\s+/i, '').replace(/\s*\|.*$/, '').trim();
                if (refTesis) {
                    meta.tesis = refTesis;
                    meta.tipo = meta.tipo || inferTipoFromIdentifier(refTesis);
                    meta.instancia = meta.instancia || inferInstancia(refTesis);
                }
            }
            if (!meta.registro && source.ref) {
                const regMatch = source.ref.match(/Registro\s+(\d+)/i);
                if (regMatch) meta.registro = regMatch[1];
            }

            // Fallback: try to get registro from origen start
            if (!meta.registro) {
                const origenReg = source.origen?.match(/^(\d{5,7})/);
                if (origenReg) meta.registro = origenReg[1];
            }
        }
    }

    // If we have at least a rubro or a registro or tesis identifier, consider it valid
    if (meta.rubro || meta.registro || meta.tesis) {
        return meta;
    }

    return null;
}

// ── Tesis body text component with section formatting ────────────────────
// Detects "Hechos:", "Criterio jurídico:", "Justificación:" sections and renders them
// with bold headers and visual separation.

const SECTION_HEADERS = [
    /^(Hechos)\s*:/i,
    /^(Criterio\s+jur[ií]dico)\s*:/i,
    /^(Justificaci[oó]n)\s*:/i,
    /^(Precedentes)\s*:/i,
    /^(Nota)\s*:/i,
];

function TesisBodyText({ text }: { text: string }) {
    // Split text into segments: each segment is either a section or plain text
    const segments: Array<{ header?: string; content: string }> = [];
    const lines = text.split('\n');
    let currentHeader: string | undefined = undefined;
    let currentContent: string[] = [];

    for (const line of lines) {
        let matched = false;
        for (const pattern of SECTION_HEADERS) {
            const m = line.match(pattern);
            if (m) {
                // Flush previous segment
                if (currentContent.length > 0 || currentHeader) {
                    segments.push({ header: currentHeader, content: currentContent.join('\n').trim() });
                }
                currentHeader = m[1];
                // Rest of the line after "Header:"
                const rest = line.slice(line.indexOf(':') + 1).trim();
                currentContent = rest ? [rest] : [];
                matched = true;
                break;
            }
        }
        if (!matched) {
            currentContent.push(line);
        }
    }
    // Flush last segment
    if (currentContent.length > 0 || currentHeader) {
        segments.push({ header: currentHeader, content: currentContent.join('\n').trim() });
    }

    // If no sections were found, render as plain text
    const hasSections = segments.some(s => s.header);
    if (!hasSections) {
        return (
            <p className="text-sm text-charcoal-800 leading-relaxed text-justify" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                {text}
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {segments.map((seg, i) => (
                <div key={i}>
                    {seg.header && (
                        <>
                            {i > 0 && <div className="border-t border-cream-300 mb-3" />}
                            <p className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                {seg.header}:
                            </p>
                        </>
                    )}
                    {seg.content && (
                        <p className="text-sm text-charcoal-800 leading-relaxed text-justify" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                            {seg.content}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Legal article text parser ────────────────────────────────────────────────
// Parses texto like:
//   "[Ley Sobre el Contrato de Seguro | TITULO III\n\nDisposiciones especiales...\n\nArtículo | ...]\nArtículo 190.- Si el derecho..."
// Returns structured parts for premium rendering.

interface LeyArticuloParsed {
    leyName: string | null;
    seccionTitulo: string | null;       // e.g. "TITULO III"
    seccionDescripcion: string | null;  // e.g. "Disposiciones especiales del contrato..."
    articuloLabel: string | null;       // e.g. "Artículo 190"
    articuloTexto: string;              // The actual article text
}

function parseLeyArticuloTexto(texto: string, source: PdfSource): LeyArticuloParsed {
    let leyName: string | null = null;
    let seccionTitulo: string | null = null;
    let seccionDescripcion: string | null = null;
    let articuloLabel: string | null = null;
    let articuloTexto = texto;

    // Try to parse the bracketed header block: [Ley | TITULO\n\nDesc\n\nArtículo | ...]
    const bracketMatch = texto.match(/^\[([^\]]+)\]([\s\S]*)/);
    let mainText = texto;

    if (bracketMatch) {
        const header = bracketMatch[1]; // e.g. "Ley Sobre el Contrato de Seguro | TITULO III\n\nDisposiciones especiales del contrato de seguro sobre las personas\n\nArtículo | Disposiciones especiales del contrato de seguro sobre las personas"
        mainText = bracketMatch[2].trim();

        // Split header by newlines and parse pipe-delimited parts
        const headerLines = header.split(/\n+/).map(l => l.trim()).filter(Boolean);
        for (const line of headerLines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2) {
                const key = parts[0].toLowerCase();
                const val = parts[1];
                if (!leyName && (key.toLowerCase().startsWith('ley') || key.toLowerCase().startsWith('código') || key.toLowerCase().startsWith('constitución') || key.toLowerCase().startsWith('reglamento') || key.toLowerCase().startsWith('norma'))) {
                    leyName = parts[0].trim();
                    seccionTitulo = val || null;
                } else if (key.toLowerCase().startsWith('artículo') || key.toLowerCase().startsWith('articulo')) {
                    // This is the section description line — skip, covered by seccionDescripcion
                } else if (!leyName) {
                    leyName = parts[0].trim();
                    seccionTitulo = val || null;
                }
            } else if (!leyName) {
                // First non-pipe line could be ley name
            } else if (!seccionDescripcion) {
                seccionDescripcion = line;
            }
        }

        // Get seccionDescripcion from the first non-pipe line after ley line
        for (const line of headerLines) {
            if (!line.includes('|') && line.length > 5) {
                seccionDescripcion = line;
                break;
            }
        }
    }

    // Extract artículo label from mainText (first line like "Artículo 190.-")
    const articuloLineMatch = mainText.match(/^(Art[íi]culo\s+[\d\w°]+)[.\-–—]?\s*/i);
    if (articuloLineMatch) {
        articuloLabel = articuloLineMatch[1].trim();
        articuloTexto = mainText.slice(articuloLineMatch[0].length).trim();
    } else {
        articuloTexto = mainText;
    }

    // Fallback: use source.ref for articuloLabel if not found
    if (!articuloLabel && source.ref) {
        articuloLabel = source.ref.replace(/\s*\|.*$/, '').trim() || null;
    }

    // Fallback: use source.origen for leyName
    if (!leyName) {
        leyName = source.origen || null;
    }

    return { leyName, seccionTitulo, seccionDescripcion, articuloLabel, articuloTexto };
}

// ── LeyArticuloView component ─────────────────────────────────────────────────
interface LeyArticuloViewProps {
    source: PdfSource;
    leyLabel: string;
    resolvedPdfUrl: string | null;
    /** La misma, servida desde nuestro dominio, para incrustarla. */
    urlParaVisor: string | null;
    hasPdf: boolean;
}

function LeyArticuloView({ source, leyLabel, resolvedPdfUrl, urlParaVisor, hasPdf }: LeyArticuloViewProps) {
    const parsed = useMemo(
        () => parseLeyArticuloTexto(source.texto || '', source),
        [source]
    );

    const isCuadernillo = /cuadernillo|corte idh|corte interamericana/i.test(source.origen || '') || /cuadernillo|corte idh|corte interamericana/i.test(leyLabel);

    const displayLey = parsed.leyName || leyLabel;

    return (
        <>
            <div className="p-5 space-y-4">
                {/* ── Ley + Artículo badges row ── */}
                <div className="flex flex-wrap items-start gap-2">
                    {/* Ley chip */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-accent-gold/15 text-accent-gold border border-accent-gold/30 leading-tight">
                        <BookOpen className="w-3 h-3 shrink-0" />
                        {displayLey}
                    </span>
                    {/* Artículo badge */}
                    {parsed.articuloLabel && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-charcoal-900 text-white border border-charcoal-800 leading-tight">
                            <Scale className="w-3 h-3 shrink-0" />
                            {parsed.articuloLabel}
                        </span>
                    )}
                </div>

                {/* ── Sección / Título ── */}
                {(parsed.seccionTitulo || parsed.seccionDescripcion) && (
                    <div className="bg-cream-200 border border-cream-400 rounded-xl px-4 py-3">
                        {parsed.seccionTitulo && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500 mb-0.5">
                                {parsed.seccionTitulo}
                            </p>
                        )}
                        {parsed.seccionDescripcion && (
                            <p className="text-xs font-medium text-charcoal-700 leading-snug italic">
                                {parsed.seccionDescripcion}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Artículo body ── */}
                <div className="bg-white border border-cream-300 rounded-2xl shadow-sm overflow-hidden">
                    {/* Artículo header bar */}
                    {parsed.articuloLabel && (
                        <div className="bg-charcoal-900 px-5 py-3 flex items-center gap-2">
                            <Gavel className="w-3.5 h-3.5 text-accent-gold shrink-0" />
                            <span className="text-xs font-bold text-white tracking-wide">
                                {parsed.articuloLabel}
                            </span>
                        </div>
                    )}
                    {/* Article text */}
                    <div className="p-5">
                        <p
                            className="text-[13.5px] text-charcoal-800 leading-7 text-justify"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif', hyphens: 'auto' }}
                        >
                            {parsed.articuloTexto || source.texto || 'Sin texto disponible.'}
                        </p>
                    </div>
                </div>

                {/* ── Source attribution ── */}
                <div className="flex items-center gap-1.5 text-[11px] text-charcoal-500 pt-0.5">
                    <ChevronRight className="w-3 h-3 text-charcoal-400 shrink-0" />
                    <span className="font-medium truncate">{source.origen}</span>
                    {source.ref && (
                        <>
                            <span className="text-charcoal-300">·</span>
                            <span className="text-accent-gold font-semibold">{source.ref}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Divider */}
            {(hasPdf || isCuadernillo) && <div className="mx-5 border-t border-cream-400" />}

            {/* Con PDF oficial, SIEMPRE el visor — también para cuadernillos.
                Este desvío al repositorio se escribió cuando los cuadernillos
                de la CoIDH no tenían PDF en GCS; desde el 31-jul-2026 los 20
                están enlazados y verificados, así que la tarjeta del
                repositorio queda solo como respaldo para citas sin documento.
                La app ya se comportaba así; la web mandaba al repositorio
                aunque el PDF existiera. */}
            {isCuadernillo && !hasPdf ? (
                <div className="p-5">
                    <div className="bg-white border border-cream-400 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center mb-4">
                            <ExternalLink className="w-6 h-6 text-accent-gold" />
                        </div>
                        <h3 className="text-sm font-bold text-charcoal-900 mb-2">Cuadernillos de Jurisprudencia CoIDH</h3>
                        <p className="text-xs text-charcoal-600 mb-5 leading-relaxed">
                            Coteja esta fuente directamente en el repositorio oficial de la Corte Interamericana de Derechos Humanos.
                        </p>
                        <a
                            href="https://corteidh.or.cr/cdf/cuadernillos-jurisprudencia.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-3 bg-charcoal-900 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 transition-colors shadow-sm"
                        >
                            <ExternalLink className="w-4 h-4 text-accent-gold" />
                            Ir al Repositorio Oficial CIDH
                        </a>
                    </div>
                </div>
            ) : hasPdf ? (
                <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-0.5 h-4 bg-accent-gold rounded-full" />
                            <span className="text-xs font-semibold text-charcoal-900 uppercase tracking-widest">
                                Coteja la norma citada con su fuente
                            </span>
                        </div>
                        <a
                            href={resolvedPdfUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-charcoal-900 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-700 transition-colors shadow-sm"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir en nueva pestaña
                        </a>
                    </div>
                    <div className="bg-white border border-cream-400 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-accent-gold" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-charcoal-900">{displayLey}</p>
                                <p className="text-xs text-charcoal-600">PDF oficial · Fuente gubernamental verificada</p>
                            </div>
                        </div>
                        <div className="md:hidden">
                            <a
                                href={resolvedPdfUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-gradient-to-r from-accent-gold to-accent-brown text-charcoal-900 font-semibold text-sm shadow-lg active:scale-[0.98] transition-transform"
                            >
                                <ExternalLink className="w-5 h-5" />
                                Abrir PDF completo
                            </a>
                        </div>
                        {/* El visor nativo del navegador sólo entiende `#page=N`:
                            abría la ley en la página 1 y dejaba al abogado
                            bajando a mano hasta el artículo citado, en
                            documentos de cientos de páginas. `VisorArticulo`
                            dibuja el PDF con pdf.js, salta a la página del
                            artículo y lo pinta de amarillo. */}
                        <div className="hidden md:block rounded-xl overflow-hidden border border-cream-400 bg-cream-200" style={{ height: '440px' }}>
                            <VisorArticulo
                                url={urlParaVisor}
                                articulo={parsed.articuloLabel}
                                textoArticulo={parsed.articuloTexto}
                                alto={440}
                            />
                        </div>
                        <p className="mt-2 text-[10px] text-charcoal-500 text-center">
                            {parsed.articuloLabel
                                ? `Abierto en el ${parsed.articuloLabel} · fuente oficial verificada`
                                : 'Fuente oficial verificada · iurexia.com'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-5">
                    <div className="bg-cream-200 rounded-2xl p-4 text-xs text-charcoal-600 text-center">
                        <BookOpen className="w-5 h-5 mx-auto mb-2 text-charcoal-400" />
                        PDF oficial en preparación.<br />
                        Pronto disponible en el repositorio de Normativa Nacional.
                    </div>
                </div>
            )}
        </>
    );
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * Panel lateral que muestra el texto de un artículo citado y permite
 * abrir el PDF oficial de la ley completa en un iframe inline,
 * o ver la tesis en el Semanario Judicial de la Federación.
 */
export default function PdfViewerPanel({ isOpen, onClose, source, citationNumber }: PdfViewerPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Lock body scroll when panel is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        if (isOpen) {
            document.addEventListener('keydown', handleKey);
        }
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Parse tesis metadata if applicable
    const tesisMeta = useMemo(() => {
        if (!source) return null;
        // Match actual backend silo values + fallback text detection
        const isTesisSilo = source.silo === 'jurisprudencia_nacional'
            || source.silo === 'jurisprudencia_nacional_v2'
            || source.silo === 'jurisprudencia'
            || source.silo === 'tesis_aisladas'
            || source.silo === 'jurisprudencia_tcc';
        const looksLikeTesis = (source.texto || '').includes('[TIPO:') || (source.texto || '').includes('[REGISTRO:');
        // Also detect from origen pattern: "NNNNNNN_TesisId..."
        const origenLooksTesis = /^\d{5,7}[_\s]/.test(source.origen || '');
        if (!isTesisSilo && !looksLikeTesis && !origenLooksTesis) return null;
        return parseTesisTexto(source.texto || '', source);
    }, [source]);

    // Extract registro for SCJN link (from parsed meta or from ref/origen)
    const registroNumber = useMemo(() => {
        if (tesisMeta?.registro) return tesisMeta.registro;
        // Try to extract from ref like "P./J. 81/2011 (9a.) | Registro 160596"
        const refMatch = source?.ref?.match(/Registro\s+(\d+)/i);
        if (refMatch) return refMatch[1];
        // Try from origen like "160596_P.J. 812011 (9a.)"
        const origenMatch = source?.origen?.match(/^(\d{5,7})/);
        if (origenMatch) return origenMatch[1];
        return null;
    }, [source, tesisMeta]);

    /* Los PDF de leyes se sirven desde iurexia.com, no desde el dominio donde
       están alojados. No es que la fuente bloquee —se comprobó que no—: es que
       incrustar un archivo de otro dominio queda a merced del navegador del
       usuario, y un bloqueador o la opción de «descargar en vez de abrir» dejan
       el visor con el icono de documento roto. Mismo origen, y deja de pasar. */
    const porNuestroDominio = (u: string | null) =>
        u && /^https:\/\//.test(u) ? `/api/ley/pdf?u=${encodeURIComponent(u)}` : u;

    // Resolve PDF URL: direct from backend, or lookup from estadosData for state/federal laws
    const resolvedPdfUrl = useMemo(() => {
        if (!source) return null;
        if (source.pdf_url) return source.pdf_url;
        // Try lawPdfLookup for state laws (e.g. Querétaro codes)
        if (source.entidad && source.origen) {
            const found = findLawPdfUrl(source.origen, source.entidad);
            if (found) return found;
        }
        // Federal laws: silo='leyes_federales' but no entidad/pdf_url in Qdrant.
        // Try to extract ley name from the bracketed text header and look up in FEDERAL_LEYES.
        if (source.silo === 'leyes_federales') {
            // 1) Try ley name from bracketed header: [Código de Comercio | TITULO...]
            const bracketMatch = (source.texto || '').match(/^\[([^|\]]+)/);
            if (bracketMatch) {
                const leyFromText = bracketMatch[1].trim();
                const found = findLawPdfUrl(leyFromText, 'FEDERAL');
                if (found) return found;
            }
            // 2) Try origen as ley name
            if (source.origen) {
                const found = findLawPdfUrl(source.origen, 'FEDERAL');
                if (found) return found;
            }
        }
        return null;
    }, [source]);

    /* Lo que ve el visor. El enlace «abrir en otra pestaña» conserva la
       dirección original, que es la que el abogado querrá copiar o citar. */
    const urlParaVisor = useMemo(() => porNuestroDominio(resolvedPdfUrl), [resolvedPdfUrl]);

    if (!isOpen || !source) return null;

    const isTesis = Boolean(tesisMeta);
    const scjnUrl = registroNumber ? `https://sjf2.scjn.gob.mx/detalle/tesis/${registroNumber}` : null;

    // Derive the ley name from silo for the PDF header
    const isCpeum = source.silo === 'bloque_constitucional'
        && (
            !source.origen
            || /cpeum|constitución\s+pol[ií]tica/i.test(source.origen)
        );
    const leyLabel = isCpeum
        ? 'Constitución Política de los Estados Unidos Mexicanos'
        : isTesis
            ? (tesisMeta?.tesis || source.ref || source.origen || 'Tesis')
            : source.origen || 'Fuente legal';

    const hasPdf = Boolean(resolvedPdfUrl);

    // Header icon & label for tesis vs ley
    const headerIcon = isTesis
        ? <span className="font-serif text-base font-semibold text-white">Iurex<span className="text-accent-gold">ia</span></span>
        : <FileText className="w-4.5 h-4.5 text-accent-gold" />;

    const headerSubLabel = isTesis
        ? (tesisMeta?.tipo === 'JURISPRUDENCIA' ? 'Jurisprudencia' : 'Tesis Aislada')
        : undefined;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="fixed right-0 top-0 h-full w-full max-w-xl bg-cream-100 shadow-2xl z-50 flex flex-col overflow-hidden"
                style={{ animation: 'slideInRight 0.25s ease-out', fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-cream-400 bg-charcoal-900">
                    <div className="flex items-center gap-3 min-w-0">
                        {isTesis ? (
                            <div className="shrink-0">{headerIcon}</div>
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-accent-gold/20 flex items-center justify-center shrink-0">
                                {headerIcon}
                            </div>
                        )}
                        <div className="min-w-0">
                            {citationNumber !== undefined && (
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-accent-gold/70 mb-0.5">
                                    Cita [{citationNumber}]
                                </span>
                            )}
                            {headerSubLabel && (
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-accent-gold/70 mb-0.5 ml-2">
                                    · {headerSubLabel}
                                </span>
                            )}
                            {isTesis && scjnUrl ? (
                                <a
                                    href={scjnUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 group"
                                >
                                    <span className="text-sm font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                                        {registroNumber}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-blue-400/60 group-hover:text-blue-300 transition-colors" />
                                </a>
                            ) : (
                                <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                                    {leyLabel}
                                </h2>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-3"
                        aria-label="Cerrar panel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable body — touch fixes for mobile */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                        touchAction: 'pan-y',
                    }}
                >
                    {/* ════════════════ TESIS VIEW ════════════════ */}
                    {isTesis && tesisMeta ? (
                        <div className="p-5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                            {/* ── Compact metadata strip ── */}
                            <div className="mb-4 bg-charcoal-900 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                {tesisMeta.tipo && (
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                        tesisMeta.tipo === 'JURISPRUDENCIA'
                                            ? 'bg-accent-gold/20 text-accent-gold'
                                            : 'bg-white/10 text-cream-300'
                                    }`}>
                                        {tesisMeta.tipo}
                                    </span>
                                )}
                                {tesisMeta.materia && (
                                    <>
                                        <span className="text-charcoal-500 text-[10px]">·</span>
                                        <span className="text-[10px] font-semibold text-cream-400 uppercase tracking-wide">{tesisMeta.materia}</span>
                                    </>
                                )}
                                {tesisMeta.instancia && (
                                    <>
                                        <span className="text-charcoal-500 text-[10px]">·</span>
                                        <span className="text-[10px] text-cream-500">{tesisMeta.instancia}</span>
                                    </>
                                )}
                                {tesisMeta.registro && (
                                    <>
                                        <span className="text-charcoal-500 text-[10px]">·</span>
                                        <span className="text-[10px] font-mono text-cream-500">Reg. {tesisMeta.registro}</span>
                                    </>
                                )}
                                {tesisMeta.tesis && (
                                    <>
                                        <span className="text-charcoal-500 text-[10px]">·</span>
                                        <span className="text-[10px] font-bold text-white tracking-wide">{tesisMeta.tesis}</span>
                                    </>
                                )}
                            </div>

                            {/* El texto de la tesis que guardábamos en nuestra
                                base se retiró el 3-ago-2026: repetía lo que ya
                                muestran la ficha verificada y el PDF oficial de
                                abajo, que además vienen del Semanario y no de
                                nuestra copia. La franja de metadatos se queda
                                porque identifica la cita de un vistazo. */}

                            {/* Ficha oficial traída del Semanario en el momento.
                                Sustituye al enlace suelto que había aquí: el
                                abogado ya no tiene que salir a comprobar la
                                cita, la comprobación viene hecha — y si el
                                registro no existe, se dice. */}
                            {/* EL PDF OFICIAL, SERVIDO POR NOSOTROS (2-sep-2026)
                                
                                Hasta hoy esta rama no pintaba ningún PDF: el
                                visor sólo existía en la vista de leyes, y la
                                tesis se quedaba en la ficha del Semanario. Y
                                esa ficha lleva días diciendo «El Semanario no
                                respondió», porque la Corte puso Incapsula
                                delante y reta a las IP de centro de datos: ni
                                Vercel ni Render pueden preguntarle nada.

                                Las 63,172 tesis del corpus están ahora en
                                nuestro bucket y su dirección viaja en el
                                payload, así que `resolvedPdfUrl` ya la trae. El
                                documento oficial ES la comprobación: si el
                                registro no existiera, no habría PDF que
                                mostrar. Por eso cuando lo tenemos se enseña el
                                documento y se deja de interrogar al Semanario;
                                sólo cuando no lo tenemos se recurre a él. */}
                            {urlParaVisor ? (
                                <div className="rounded-2xl border border-cream-400 bg-white p-3 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal-700">
                                            Documento oficial del Semanario
                                        </span>
                                        {scjnUrl && (
                                            <a href={scjnUrl} target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 text-[11px] text-charcoal-600 underline">
                                                <ExternalLink className="h-3 w-3" />
                                                Ver en la Corte
                                            </a>
                                        )}
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-cream-400 bg-cream-200"
                                         style={{ height: '460px' }}>
                                        <VisorArticulo
                                            url={urlParaVisor}
                                            articulo={tesisMeta?.tesis || null}
                                            textoArticulo={tesisMeta?.rubro || null}
                                            alto={460}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-[10px] text-charcoal-500">
                                        Gaceta del Semanario Judicial de la Federación · Reg. {tesisMeta?.registro || registroNumber}
                                    </p>
                                </div>
                            ) : registroNumber && scjnUrl ? (
                                <TesisVerificada registro={registroNumber} urlSemanario={scjnUrl} />
                            ) : (
                                <div className="bg-cream-200 rounded-2xl p-4 text-xs text-charcoal-600 text-center">
                                    <Scale className="w-5 h-5 mx-auto mb-2 text-charcoal-400" />
                                    Esta cita no trae registro digital, así que no se pudo comprobar
                                    automáticamente en el Semanario.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ════════════════ STANDARD LEY VIEW ════════════════ */
                        <LeyArticuloView source={source} leyLabel={leyLabel} resolvedPdfUrl={resolvedPdfUrl} urlParaVisor={urlParaVisor} hasPdf={hasPdf} />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-cream-400 bg-cream-200">
                    <a
                        href="/normativa"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-charcoal-900 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 transition-colors"
                    >
                        <BookOpen className="w-4 h-4 text-accent-gold" />
                        Ver Repositorio de Normativa Nacional
                    </a>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </>
    );
}
