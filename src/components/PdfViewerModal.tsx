'use client';

import React from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';

interface PdfViewerModalProps {
    pdfUrl: string;
    lawName: string;
    estadoName?: string | null;
    onClose: () => void;
}

export default function PdfViewerModal({ pdfUrl, lawName, estadoName, onClose }: PdfViewerModalProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <div className="bg-cream-100 rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="w-5 h-5 text-accent-brown flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <h2 className="font-serif text-base font-semibold text-charcoal-900 truncate">
                                {lawName}
                            </h2>
                            {estadoName && (
                                <p className="text-xs text-charcoal-500">{estadoName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-brown text-white rounded-lg hover:bg-accent-gold transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir en nueva pestaña
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 overflow-hidden bg-gray-200 rounded-b-xl">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-0"
                        title={`PDF: ${lawName}`}
                    />
                </div>
            </div>
        </div>
    );
}
