'use client';

import { TesisVerificada } from '@/components/TesisVerificada';
import { VisorArticulo } from '@/components/VisorArticulo';
import { AccionesPdf } from '@/components/documento/AccionesPdf';

import { useEffect, useRef, useMemo, useState } from 'react';
import { X, ExternalLink, FileText, BookOpen, ChevronRight, Scale, Gavel, ChevronDown, Copy, Check } from 'lucide-react';
import { findLawPdfUrl } from '@/lib/lawPdfLookup';
import { urlProxyPdf } from '@/lib/proxyPdf';
import {
    type CamposCoidh, autorVoto, enlaceOficialCoidh, esCoidh, fechaLarga, lugarConVoto, rotuloCoidh,
    serieCoidh, textoCoidh, textoEstaCompleto, urlOficialCoidh,
} from '@/lib/coidh';

/** La fuente que abre el panel. Las de la Corte IDH (`silo: "coidh"`) traen
 *  caso, párrafo, página y ancla: ver `@/lib/coidh`. */
interface PdfSource extends CamposCoidh {
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

    // El buscador antepone marcadores suyos —«[MATERIA: constitucional]»— que
    // esta función tomaba por la cabecera de la ley y pintaba como si fueran
    // la sección del precepto. Al abogado le aparecía una caja que decía
    // «MATERIA: constitucional» encima del artículo 7 de la Convención.
    // Se quitan antes de leer nada.
    texto = sinMarcadores(texto);
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

// ── EL ARTÍCULO, MAQUETADO Y PLEGADO (19-sep-2026) ───────────────────────────
// David: «La ficha de la cita arriba del visor pdf está muy mal presentada,
// sin formato, toda amontonada. Debe verse profesional, tal cual aparece en el
// pdf de su fuente y solo visible si se da click […] ya que el pdf inferior es
// superior».
//
// Tenía razón en las dos cosas. El texto guardado viene impecable —«Artículo
// 7. Derecho a la Libertad Personal\n1. Toda persona tiene derecho…\n2. Nadie
// puede ser privado…»— y la ficha lo metía entero en un solo <p>, donde los
// saltos de línea se colapsan a espacios. Los siete numerales del art. 7 CADH
// salían como un párrafo de trece renglones: ilegible justo en el sitio donde
// el abogado comprueba si la cita dice lo que la respuesta afirma.
//
// Y sobra por encima del PDF: el documento oficial está abajo, es la fuente
// auténtica y ocupa el espacio. Así que el artículo va plegado, y quien lo
// quiera lo despliega o lo copia al escrito sin salir del visor.

/** Una pieza del artículo, ya reconocida: el título, un numeral o un párrafo. */
type PiezaArticulo =
    | { clase: 'titulo'; texto: string }
    | { clase: 'encabezado'; marca: string; texto: string }
    | { clase: 'numeral'; marca: string; texto: string }
    | { clase: 'parrafo'; texto: string };

/** Marcadores que el buscador antepone al texto y que el abogado no debe ver. */
function sinMarcadores(t: string): string {
    return (t || '')
        .replace(/\[(?:MATERIA|TIPO|INSTANCIA|TESIS|REGISTRO|ÉPOCA|EPOCA|SILO|ENTIDAD)\s*:[^\]]*\]/gi, '')
        // La cabecera de las leyes: «[Ley Sobre el Contrato de Seguro | TITULO III …]».
        // Su contenido ya se pinta arriba en las pastillas y la sección.
        .replace(/^\s*\[[^\]]*\|[^\]]*\]/, '')
        .replace(/^\s+/, '');
}

/**
 * Del texto corrido a la estructura que tiene el documento oficial.
 *
 * Se reconocen las tres formas en que se numera un precepto en español:
 * arábigos de los tratados («1.», «2.»), romanos de las fracciones mexicanas
 * («I.», «II.») y literales de los incisos («a)», «b)»). Un renglón que no
 * abre marca y viene detrás de uno que sí, es su continuación: así no se parte
 * una fracción larga en dos bloques sueltos.
 */
function piezasDelArticulo(texto: string): PiezaArticulo[] {
    const limpio = sinMarcadores(texto);
    if (!limpio.trim()) return [];

    const piezas: PiezaArticulo[] = [];
    const renglones = limpio.split(/\n+/).map(l => l.trim()).filter(Boolean);

    renglones.forEach((linea, i) => {
        if (i === 0) {
            // «Artículo 7. Derecho a la Libertad Personal» lleva título; el
            // «Artículo 335.- Cuando la materia objeto de la patente…» NO: eso
            // es el encabezado del precepto, la frase que abre y a la que se
            // cuelgan las fracciones. Centrar en negrita seis renglones de
            // texto normativo, como pasaba al principio, no lo hace ningún
            // documento oficial. Se distinguen por el largo y por si la frase
            // se cierra: un título ni pasa de setenta caracteres ni lleva
            // punto ni dos puntos dentro.
            const cabeza = linea.match(
                /^(Art[íi]culo\s+\d+[\wºo°]*(?:\s+(?:[Bb]is|[Tt]er|[Qq]u[áa]ter))?)\s*[.\-–—]*\s*(.*)$/i);
            if (cabeza) {
                const resto = cabeza[2].trim();
                const esTitulo = resto.length > 0 && resto.length <= 70 && !/[.;:]/.test(resto);
                if (esTitulo || !resto) {
                    piezas.push({ clase: 'titulo', texto: linea });
                } else {
                    piezas.push({ clase: 'encabezado', marca: cabeza[1], texto: resto });
                }
                return;
            }
        }
        // El guion tras el punto es de uso corriente en la ley mexicana
        // —«I.- El producto obtenido…»— y sin contemplarlo las fracciones
        // caían a párrafo suelto, sin sangría y sin su número destacado.
        const arabigo = linea.match(/^(\d{1,3})\s*[.)]\s*[-–—]?\s*(.+)$/);
        const romano = linea.match(/^([IVXLCDM]{1,7})\s*[.)]\s*[-–—]?\s*(.+)$/);
        const literal = linea.match(/^([a-zñ])\s*\)\s*[-–—]?\s*(.+)$/);
        const m = arabigo || romano || literal;
        if (m) {
            piezas.push({ clase: 'numeral', marca: `${m[1]}${literal ? ')' : '.'}`, texto: m[2] });
            return;
        }
        const ultima = piezas[piezas.length - 1];
        if (ultima && ultima.clase === 'numeral') {
            ultima.texto = `${ultima.texto} ${linea}`;
            return;
        }
        piezas.push({ clase: 'parrafo', texto: linea });
    });

    return piezas;
}

/** El artículo tal cual, para pegarlo en un escrito con su fuente al pie. */
function paraElPortapapeles(texto: string, ley: string | null, ref: string | null): string {
    const cuerpo = sinMarcadores(texto).trim();
    const pie = [ley, ref].filter(Boolean).join(' — ');
    return pie ? `${cuerpo}\n\n${pie}` : cuerpo;
}

function ArticuloPlegado({ texto, etiqueta, ley, cita, sustantivo = 'el artículo' }: {
    texto: string;
    etiqueta: string | null;
    ley: string | null;
    /** No se llama `ref`: React lo reservó y nunca llegaría como prop. */
    cita: string | null;
    /** «el artículo» o, para la Corte IDH, «el párrafo». */
    sustantivo?: string;
}) {
    const [abierto, setAbierto] = useState(false);
    const [copia, setCopia] = useState<'quieto' | 'hecho' | 'falló'>('quieto');
    const piezas = useMemo(() => piezasDelArticulo(texto), [texto]);

    // Hay navegadores y vistas incrustadas que niegan el portapapeles moderno
    // —medido aquí mismo: «Write permission denied»— y entonces el botón se
    // quedaba muerto sin decir nada. Se intenta la vía vieja, que no pide
    // permiso, y si tampoco se puede se dice, que es mejor que fingir.
    const copiar = async () => {
        const contenido = paraElPortapapeles(texto, ley, cita);
        const avisar = (r: 'hecho' | 'falló') => {
            setCopia(r);
            window.setTimeout(() => setCopia('quieto'), r === 'hecho' ? 2000 : 3500);
        };
        try {
            await navigator.clipboard.writeText(contenido);
            avisar('hecho');
            return;
        } catch {
            /* se sigue por la vía vieja */
        }
        try {
            const caja = document.createElement('textarea');
            caja.value = contenido;
            caja.setAttribute('readonly', '');
            caja.style.position = 'fixed';
            caja.style.opacity = '0';
            document.body.appendChild(caja);
            caja.select();
            const fue = document.execCommand('copy');
            document.body.removeChild(caja);
            avisar(fue ? 'hecho' : 'falló');
        } catch {
            avisar('falló');
        }
    };

    if (!piezas.length) return null;

    return (
        <div className="bg-white border border-cream-300 rounded-2xl shadow-sm overflow-hidden">
            {/* La barra ES el interruptor: toda ella responde al clic. */}
            <button
                type="button"
                onClick={() => setAbierto(v => !v)}
                aria-expanded={abierto}
                className="w-full bg-charcoal-900 px-4 sm:px-5 py-3 flex items-center gap-2.5 text-left transition-colors hover:bg-charcoal-800"
            >
                <Gavel className="w-3.5 h-3.5 text-accent-gold shrink-0" />
                {etiqueta && (
                    <span className="text-xs font-bold text-white tracking-wide shrink-0">
                        {etiqueta}
                    </span>
                )}
                <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-accent-gold">
                    {abierto ? `Ocultar ${sustantivo}` : `Desplegar y copiar ${sustantivo}`}
                    <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
                    />
                </span>
            </button>

            {abierto && (
                <div className="px-5 sm:px-7 pt-5 pb-4">
                    {piezas.map((pieza, i) => {
                        if (pieza.clase === 'titulo') {
                            return (
                                <h4
                                    key={i}
                                    className="mb-5 pb-3 border-b border-cream-300 text-center text-[15px] font-semibold leading-snug text-charcoal-900"
                                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                >
                                    {pieza.texto}
                                </h4>
                            );
                        }
                        if (pieza.clase === 'encabezado') {
                            return (
                                <p
                                    key={i}
                                    className="mb-4 text-[13.5px] leading-[1.75] text-justify text-charcoal-800"
                                    style={{ fontFamily: 'Georgia, "Times New Roman", serif', hyphens: 'auto' }}
                                >
                                    <strong className="text-charcoal-900">{pieza.marca}.</strong>{' '}{pieza.texto}
                                </p>
                            );
                        }
                        if (pieza.clase === 'numeral') {
                            return (
                                // Sangría francesa: el número fuera del bloque de texto,
                                // que es como se lee un precepto en el documento oficial.
                                <div key={i} className="flex gap-3 mb-3 last:mb-0">
                                    <span
                                        className="shrink-0 w-7 pt-[1px] text-right text-[13px] font-semibold text-accent-brown tabular-nums"
                                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                    >
                                        {pieza.marca}
                                    </span>
                                    <p
                                        className="flex-1 text-[13.5px] leading-[1.75] text-justify text-charcoal-800"
                                        style={{ fontFamily: 'Georgia, "Times New Roman", serif', hyphens: 'auto' }}
                                    >
                                        {pieza.texto}
                                    </p>
                                </div>
                            );
                        }
                        return (
                            <p
                                key={i}
                                className="mb-3 last:mb-0 text-[13.5px] leading-[1.75] text-justify text-charcoal-800"
                                style={{ fontFamily: 'Georgia, "Times New Roman", serif', hyphens: 'auto' }}
                            >
                                {pieza.texto}
                            </p>
                        );
                    })}

                    <div className="mt-5 pt-3 border-t border-cream-200 flex items-center justify-between gap-3">
                        <span className="text-[10.5px] text-charcoal-500 truncate">
                            Coteja el texto oficial en el documento de abajo.
                        </span>
                        <button
                            type="button"
                            onClick={copiar}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-100 px-3 py-1.5 text-[11.5px] font-semibold text-charcoal-700 transition-colors hover:bg-cream-200"
                        >
                            {copia === 'hecho' && <><Check className="w-3.5 h-3.5 text-green-700" /> Copiado</>}
                            {copia === 'falló' && <span className="text-accent-brown">Selecciona el texto y cópialo</span>}
                            {copia === 'quieto' && <><Copy className="w-3.5 h-3.5" /> Copiar {sustantivo}</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
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

                {/* ── El artículo, plegado tras su botón ── */}
                <ArticuloPlegado
                    texto={source.texto || parsed.articuloTexto || ''}
                    etiqueta={parsed.articuloLabel}
                    ley={displayLey}
                    cita={source.ref || null}
                />

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
                        <div className="flex items-center gap-2">
                            {urlParaVisor && <AccionesPdf url={urlParaVisor} nombre={displayLey || 'Documento oficial'} />}
                            <a
                                href={resolvedPdfUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-charcoal-900 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-700 transition-colors shadow-sm"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Abrir en nueva pestaña</span>
                                <span className="sm:hidden">Abrir</span>
                            </a>
                        </div>
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
                                urlOriginal={resolvedPdfUrl}
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

// ── LA SENTENCIA DE LA CORTE IDH, ABIERTA EN SU PÁRRAFO (25-sep-2026) ──────────
// Antes de `LeyArticuloView`, que la trataría como una ley: rótulo «Fuente
// gubernamental», un «Artículo» sacado del texto y el visor escondido en el
// teléfono. Aquí el rótulo es el caso y el párrafo; el visor abre la página
// que midió el troceador y resalta de «124.» a «125.»; y el visor va también
// en el teléfono, porque en iOS un PDF dentro de un iframe no se pinta y
// pdf.js es la única manera de enseñar el párrafo.

interface SentenciaCoidhViewProps {
    source: PdfSource;
    /** La dirección oficial de corteidh.or.cr, sin `#page`. */
    urlOficial: string | null;
    /** La misma, servida desde nuestro dominio para pdf.js. */
    urlParaVisor: string | null;
}

function SentenciaCoidhView({ source, urlOficial, urlParaVisor }: SentenciaCoidhViewProps) {
    const lugar = lugarConVoto(source);
    const autor = autorVoto(source);
    const serie = serieCoidh(source);
    const fecha = fechaLarga(source.fecha);
    const texto = textoCoidh(source.texto);
    const enlace = enlaceOficialCoidh(source);
    const caso = (source.caso || '').trim();
    const esOC = source.tipo === 'oc_coidh' || /^OC-\d/i.test(caso);
    const base = caso ? (esOC || /^caso\b/i.test(caso) ? caso : `Caso ${caso}`) : (source.origen || 'Corte Interamericana de Derechos Humanos');
    const nombre = source.tipo === 'supervision_coidh' ? `${base} · Supervisión de cumplimiento` : base;
    const lugarMayuscula = lugar.charAt(0).toUpperCase() + lugar.slice(1);

    return (
        <>
            <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-accent-gold/15 text-accent-gold border border-accent-gold/30 leading-tight">
                        <Gavel className="w-3 h-3 shrink-0" />
                        Corte IDH
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-charcoal-900 text-white border border-charcoal-800 leading-tight">
                        {lugarMayuscula}
                    </span>
                    {(serie || fecha) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-cream-200 text-charcoal-700 border border-cream-400 leading-tight">
                            {[serie, fecha].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>

                <p className="text-sm font-semibold text-charcoal-900 leading-snug" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                    {nombre}
                </p>

                {/* Plan de ingesta, §3.7: «un voto no es la Corte». Quien lee
                    un voto razonado tiene que saberlo antes de citarlo. */}
                {autor && (
                    <p className="rounded-xl border border-cream-400 bg-cream-200 px-4 py-2.5 text-[11.5px] leading-snug text-charcoal-700">
                        Es el voto de {autor}, no la decisión de la Corte.
                    </p>
                )}

                {texto && (
                    <ArticuloPlegado
                        texto={texto}
                        etiqueta={lugarMayuscula}
                        ley={null}
                        cita={source.cita_canonica || null}
                        sustantivo="el párrafo"
                    />
                )}

                {source.cita_canonica && (
                    <p className="text-[11px] leading-snug text-charcoal-500">
                        {source.cita_canonica}
                    </p>
                )}
            </div>

            <div className="mx-5 border-t border-cream-400" />

            {urlOficial ? (
                <div className="p-5">
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-0.5 h-4 bg-accent-gold rounded-full shrink-0" />
                            {/* En el teléfono no cabe junto a los tres botones: quedaba «COTE…». */}
                            <span className="hidden sm:inline text-xs font-semibold text-charcoal-900 uppercase tracking-widest truncate">
                                Coteja el párrafo en la sentencia
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {urlParaVisor && <AccionesPdf url={urlParaVisor} nombre={nombre} />}
                            {/* Directo a la Corte y en la página del párrafo: `#page`
                                va en el enlace, nunca dentro de `pdf_url`. */}
                            <a
                                href={enlace || urlOficial}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-charcoal-900 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-700 transition-colors shadow-sm"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Abrir en la Corte IDH</span>
                                <span className="sm:hidden">Abrir</span>
                            </a>
                        </div>
                    </div>
                    <div className="bg-white border border-cream-400 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center shrink-0">
                                <Gavel className="w-5 h-5 text-accent-gold" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-charcoal-900 truncate">{nombre}</p>
                                <p className="text-xs text-charcoal-600">
                                    PDF oficial · Corte Interamericana de Derechos Humanos
                                </p>
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-cream-400 bg-cream-200" style={{ height: '440px' }}>
                            <VisorArticulo
                                url={urlParaVisor}
                                articulo={null}
                                textoArticulo={source.texto || null}
                                textoCompleto={textoEstaCompleto(source.texto)}
                                parrafo={source.parrafo ?? null}
                                pagina={source.pagina ?? null}
                                ancla={source.ancla || null}
                                rotuloParrafo={lugar}
                                urlOriginal={urlOficial}
                                alto={440}
                            />
                        </div>
                        <p className="mt-2 text-[10px] text-charcoal-500 text-center">
                            {source.pagina
                                ? `Abierto en el ${lugar} · pág. ${source.pagina} del PDF de corteidh.or.cr`
                                : 'Fuente oficial · corteidh.or.cr'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-5">
                    <div className="bg-cream-200 rounded-2xl p-4 text-xs text-charcoal-600 text-center">
                        <Gavel className="w-5 h-5 mx-auto mb-2 text-charcoal-400" />
                        Esta cita de la Corte IDH no trae la dirección de su sentencia.
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
        // Una sentencia de la Corte IDH no es una tesis, aunque su `tipo`
        // viaje como `tipo_criterio` («sentencia_coidh»).
        if (esCoidh(source)) return null;
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
    /* La dirección la arma `urlProxyPdf` (`@/lib/proxyPdf`), la misma función
       con la que el proxy decide si redirige: para la Corte IDH, la forma
       canónica (https://www., con `&v=` si se conoce el sha1) y así una sola
       llave de CDN por archivo; para lo demás, lo de siempre. */

    // Resolve PDF URL: direct from backend, or lookup from estadosData for state/federal laws
    const resolvedPdfUrl = useMemo(() => {
        if (!source) return null;
        // La Corte IDH: la dirección oficial, sin `#page` (la página viaja aparte).
        if (esCoidh(source)) return urlOficialCoidh(source);
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
    const urlParaVisor = useMemo(() => urlProxyPdf(resolvedPdfUrl, source?.pdf_sha1), [resolvedPdfUrl, source?.pdf_sha1]);

    if (!isOpen || !source) return null;

    const isTesis = Boolean(tesisMeta);
    const scjnUrl = registroNumber ? `https://sjf2.scjn.gob.mx/detalle/tesis/${registroNumber}` : null;

    // Derive the ley name from silo for the PDF header
    const isCpeum = source.silo === 'bloque_constitucional'
        && (
            !source.origen
            || /cpeum|constitución\s+pol[ií]tica/i.test(source.origen)
        );
    const coidh = esCoidh(source);
    const leyLabel = coidh
        ? rotuloCoidh(source)
        : isCpeum
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
                                        <div className="flex items-center gap-2">
                                            {/* David, 18-sep-2026: «muchos usuarios guardan la
                                                tesis o la imprimen». */}
                                            <AccionesPdf url={urlParaVisor}
                                                nombre={`Tesis ${tesisMeta?.tesis || registroNumber || ''}`.trim()} />
                                            {scjnUrl && (
                                                <a href={scjnUrl} target="_blank" rel="noopener noreferrer"
                                                   className="inline-flex items-center gap-1 text-[11px] text-charcoal-600 underline">
                                                    <ExternalLink className="h-3 w-3" />
                                                    Ver en la Corte
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-cream-400 bg-cream-200"
                                         style={{ height: '460px' }}>
                                        <VisorArticulo
                                            url={urlParaVisor}
                                            articulo={tesisMeta?.tesis || null}
                                            textoArticulo={tesisMeta?.rubro || null}
                                            urlOriginal={resolvedPdfUrl}
                                            alto={460}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-[10px] text-charcoal-500">
                                        Gaceta del Semanario Judicial de la Federación · Reg. {tesisMeta?.registro || registroNumber}
                                    </p>
                                </div>
                            ) : (tesisMeta.rubro || tesisMeta.textoBody) ? (
                                /* SIN PDF, SE ENSEÑA LO QUE SÍ TENEMOS (3-sep-2026)
                                
                                   Aquí caen las 8,483 tesis que el cortafuegos de
                                   la Corte no nos dejó descargar. Antes esta rama
                                   llamaba al Semanario, que desde hace días
                                   rechaza a cualquier servidor, así que el abogado
                                   pedía una jurisprudencia y recibía un aviso de
                                   error: ni el PDF, ni los datos, ni el texto.
                                   Un fallo ajeno presentado como fallo nuestro.
                                
                                   Y era absurdo, porque el rubro y el texto de la
                                   tesis están en nuestro corpus —de ahí salió la
                                   cita— y sólo hacía falta pintarlos. El enlace al
                                   Semanario se conserva como lo que es: una
                                   comprobación opcional en la fuente oficial, no
                                   un requisito para leer lo que ya tenemos. */
                                <div className="rounded-2xl border border-cream-400 bg-white p-4 shadow-sm">
                                    {tesisMeta.rubro && (
                                        <h3 className="mb-3 font-serif text-[0.95rem] font-semibold leading-snug text-charcoal-900">
                                            {tesisMeta.rubro}
                                        </h3>
                                    )}
                                    {tesisMeta.textoBody && <TesisBodyText text={tesisMeta.textoBody} />}
                                    <div className="mt-4 flex items-center justify-between border-t border-cream-400 pt-3">
                                        <span className="text-[10px] uppercase tracking-widest text-charcoal-500">
                                            Texto del criterio · repositorio Iurexia
                                        </span>
                                        {scjnUrl && (
                                            <a href={scjnUrl} target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 text-[11px] text-charcoal-600 underline hover:text-charcoal-900">
                                                <ExternalLink className="h-3 w-3" />
                                                Ver en el Semanario
                                            </a>
                                        )}
                                    </div>
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
                    ) : coidh ? (
                        /* ════════════ CORTE IDH: LA SENTENCIA EN SU PÁRRAFO ════════════ */
                        <SentenciaCoidhView source={source} urlOficial={resolvedPdfUrl} urlParaVisor={urlParaVisor} />
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
