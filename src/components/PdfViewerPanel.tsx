'use client';

import { useEffect, useRef, useMemo } from 'react';
import { X, ExternalLink, FileText, BookOpen, ChevronRight, Scale, Gavel } from 'lucide-react';

interface PdfSource {
    origen: string;
    ref: string;
    texto: string;
    pdf_url?: string | null;
    silo?: string;
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

function parseTesisTexto(texto: string): TesisMetadata | null {
    // Check if it looks like a tesis (has bracketed metadata)
    if (!texto.includes('[TIPO:') && !texto.includes('[REGISTRO:')) return null;

    const meta: TesisMetadata = {};

    // Extract bracketed fields
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
    let body = texto
        .replace(/\[(?:TIPO|MATERIA|INSTANCIA|TESIS|REGISTRO|ÉPOCA|FUENTE|LOCALIZACIÓN|PÁGINA):\s*[^\]]*\]/gi, '')
        .replace(/^[-─]{3,}$/gm, '')  // Remove dash lines
        .trim();

    // Split rubro (ALL CAPS paragraph) from body text
    const lines = body.split('\n').filter(l => l.trim());
    const rubroLines: string[] = [];
    let bodyStartIdx = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Rubro is typically all-caps or mostly uppercase
        if (line.length > 10 && line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line)) {
            rubroLines.push(line);
        } else {
            bodyStartIdx = i;
            break;
        }
    }

    if (rubroLines.length > 0) {
        meta.rubro = rubroLines.join(' ');
        meta.textoBody = lines.slice(bodyStartIdx).join('\n').trim();
    } else {
        meta.textoBody = body;
    }

    return meta;
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
            || source.silo === 'jurisprudencia'
            || source.silo === 'tesis_aisladas'
            || source.silo === 'jurisprudencia_tcc';
        const looksLikeTesis = (source.texto || '').includes('[TIPO:') || (source.texto || '').includes('[REGISTRO:');
        if (!isTesisSilo && !looksLikeTesis) return null;
        return parseTesisTexto(source.texto || '');
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

    const hasPdf = Boolean(source.pdf_url);

    // Header icon & label for tesis vs ley
    const headerIcon = isTesis
        ? <Scale className="w-4.5 h-4.5 text-accent-gold" />
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
                style={{ animation: 'slideInRight 0.25s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-cream-400 bg-charcoal-900">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-accent-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                            {headerIcon}
                        </div>
                        <div className="min-w-0">
                            {citationNumber !== undefined && (
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-accent-gold/70 mb-1">
                                    Cita [{citationNumber}]
                                </span>
                            )}
                            {headerSubLabel && (
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-accent-gold/70 mb-1 ml-2">
                                    · {headerSubLabel}
                                </span>
                            )}
                            <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                                {leyLabel}
                            </h2>
                            {source.ref && (
                                <p className="text-xs text-accent-gold mt-0.5 font-medium">{source.ref}</p>
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
                        <div className="p-5">
                            {/* Metadata badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {tesisMeta.tipo && (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tesisMeta.tipo === 'JURISPRUDENCIA'
                                        ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                        <Gavel className="w-3 h-3" />
                                        {tesisMeta.tipo}
                                    </span>
                                )}
                                {tesisMeta.materia && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {tesisMeta.materia}
                                    </span>
                                )}
                                {tesisMeta.instancia && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                        {tesisMeta.instancia}
                                    </span>
                                )}
                                {tesisMeta.registro && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-charcoal-100 text-charcoal-700 border border-charcoal-300">
                                        Reg. {tesisMeta.registro}
                                    </span>
                                )}
                            </div>

                            {/* Rubro (title) */}
                            {tesisMeta.rubro && (
                                <div className="mb-4 bg-charcoal-900 rounded-xl p-4">
                                    <p className="text-xs font-bold text-white leading-relaxed tracking-wide">
                                        {tesisMeta.rubro}
                                    </p>
                                </div>
                            )}

                            {/* Tesis identifier */}
                            {tesisMeta.tesis && (
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-0.5 h-4 bg-accent-gold rounded-full" />
                                    <span className="text-xs font-semibold text-accent-gold">
                                        {tesisMeta.tesis}
                                    </span>
                                </div>
                            )}

                            {/* Body text */}
                            <div className="bg-white border border-cream-400 rounded-2xl p-5 shadow-sm">
                                <p className="text-sm text-charcoal-800 leading-relaxed font-serif text-justify">
                                    {tesisMeta.textoBody || source.texto || 'Sin texto disponible.'}
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="my-5 border-t border-cream-400" />

                            {/* SCJN Link */}
                            {scjnUrl ? (
                                <a
                                    href={scjnUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 bg-white border border-cream-400 rounded-2xl shadow-sm hover:border-accent-gold/50 hover:shadow-md transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-charcoal-900 to-charcoal-700 flex items-center justify-center shrink-0">
                                        <Scale className="w-6 h-6 text-accent-gold" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-charcoal-900 group-hover:text-accent-gold transition-colors">
                                            Ver en Semanario Judicial
                                        </p>
                                        <p className="text-[11px] text-charcoal-500 mt-0.5">
                                            Suprema Corte de Justicia de la Nación · sjf2.scjn.gob.mx
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-charcoal-400 group-hover:text-accent-gold transition-colors shrink-0" />
                                </a>
                            ) : (
                                <div className="bg-cream-200 rounded-2xl p-4 text-xs text-charcoal-600 text-center">
                                    <Scale className="w-5 h-5 mx-auto mb-2 text-charcoal-400" />
                                    Enlace al Semanario Judicial no disponible para esta tesis.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ════════════════ STANDARD LEY VIEW ════════════════ */
                        <>
                            {/* Article text section */}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-0.5 h-4 bg-accent-gold rounded-full" />
                                    <span className="text-xs font-semibold text-charcoal-900 uppercase tracking-widest">
                                        Texto recuperado del contexto legal
                                    </span>
                                </div>

                                <div className="bg-white border border-cream-400 rounded-2xl p-5 text-sm text-charcoal-800 leading-relaxed font-serif whitespace-pre-wrap shadow-sm">
                                    {source.texto || 'Sin texto disponible.'}
                                </div>

                                {/* Source attribution */}
                                <div className="mt-3 flex items-center gap-2 text-xs text-charcoal-600">
                                    <ChevronRight className="w-3 h-3 text-charcoal-400" />
                                    <span className="font-medium">{source.origen}</span>
                                    {source.ref && (
                                        <>
                                            <span className="text-charcoal-400">·</span>
                                            <span className="text-accent-gold font-medium">{source.ref}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            {hasPdf && (
                                <div className="mx-5 border-t border-cream-400" />
                            )}

                            {/* PDF Viewer section */}
                            {hasPdf && (
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-0.5 h-4 bg-accent-gold rounded-full" />
                                            <span className="text-xs font-semibold text-charcoal-900 uppercase tracking-widest">
                                                Ley completa
                                            </span>
                                        </div>
                                        <a
                                            href={source.pdf_url!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-accent-gold hover:text-accent-brown transition-colors font-medium"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Abrir en nueva pestaña
                                        </a>
                                    </div>

                                    {/* CTA button */}
                                    <div className="bg-white border border-cream-400 rounded-2xl p-4 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5 text-accent-gold" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-charcoal-900">{leyLabel}</p>
                                                <p className="text-xs text-charcoal-600">PDF oficial · Fuente gubernamental</p>
                                            </div>
                                        </div>

                                        {/* ── Mobile: CTA button (iframes don't work on mobile) ── */}
                                        <div className="md:hidden">
                                            <a
                                                href={source.pdf_url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-gradient-to-r from-accent-gold to-accent-brown text-charcoal-900 font-semibold text-sm shadow-lg active:scale-[0.98] transition-transform"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                                Abrir PDF completo
                                            </a>
                                            <p className="mt-2 text-[10px] text-charcoal-500 text-center">
                                                Se abrirá en el visor PDF de tu dispositivo
                                            </p>
                                        </div>

                                        {/* ── Desktop: embedded iframe ── */}
                                        <div className="hidden md:block rounded-xl overflow-hidden border border-cream-400 bg-cream-200" style={{ height: '480px' }}>
                                            <iframe
                                                src={`${source.pdf_url}#toolbar=1&navpanes=0&scrollbar=1`}
                                                className="w-full h-full"
                                                title={`PDF: ${leyLabel}`}
                                                loading="lazy"
                                            />
                                        </div>

                                        <p className="mt-2 text-[10px] text-charcoal-500 text-center">
                                            Fuente oficial verificada · iurexia.com
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* No PDF fallback (only for non-tesis) */}
                            {!hasPdf && (
                                <div className="p-5">
                                    <div className="bg-cream-200 rounded-2xl p-4 text-xs text-charcoal-600 text-center">
                                        <BookOpen className="w-5 h-5 mx-auto mb-2 text-charcoal-400" />
                                        PDF oficial en preparación.<br />
                                        Pronto disponible en el repositorio de Normativa Nacional.
                                    </div>
                                </div>
                            )}
                        </>
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
