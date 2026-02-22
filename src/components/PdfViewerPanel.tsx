'use client';

import { useEffect, useRef } from 'react';
import { X, ExternalLink, FileText, BookOpen, ChevronRight } from 'lucide-react';

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

/**
 * Panel lateral que muestra el texto de un artículo citado y permite
 * abrir el PDF oficial de la ley completa en un iframe inline.
 */
export default function PdfViewerPanel({ isOpen, onClose, source, citationNumber }: PdfViewerPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

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

    if (!isOpen || !source) return null;

    // Derive the ley name from silo for the PDF header
    const leyLabel = source.silo === 'bloque_constitucional'
        ? 'Constitución Política de los Estados Unidos Mexicanos'
        : source.origen || 'Fuente legal';

    const hasPdf = Boolean(source.pdf_url);

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
                            <FileText className="w-4.5 h-4.5 text-accent-gold" />
                        </div>
                        <div className="min-w-0">
                            {citationNumber !== undefined && (
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-accent-gold/70 mb-1">
                                    Cita [{citationNumber}]
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

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">
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

                                {/* Embedded PDF iframe */}
                                <div className="rounded-xl overflow-hidden border border-cream-400 bg-cream-200" style={{ height: '480px' }}>
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

                    {/* No PDF fallback */}
                    {!hasPdf && (
                        <div className="p-5">
                            <div className="bg-cream-200 rounded-2xl p-4 text-xs text-charcoal-600 text-center">
                                <BookOpen className="w-5 h-5 mx-auto mb-2 text-charcoal-400" />
                                PDF oficial en preparación.<br />
                                Pronto disponible en el repositorio de Normativa Nacional.
                            </div>
                        </div>
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
