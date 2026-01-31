'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, MapPin, Scale, Loader2 } from 'lucide-react';
import { getDocument, DocumentResponse } from '@/lib/api';

interface DocumentModalProps {
    docId: string | null;
    onClose: () => void;
}

export default function DocumentModal({ docId, onClose }: DocumentModalProps) {
    const [document, setDocument] = useState<DocumentResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!docId) return;

        const fetchDocument = async () => {
            setLoading(true);
            setError(null);
            try {
                const doc = await getDocument(docId);
                setDocument(doc);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar documento');
            } finally {
                setLoading(false);
            }
        };

        fetchDocument();
    }, [docId]);

    if (!docId) return null;

    const handleDownloadPDF = () => {
        if (!document) return;

        // Create printable content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${document.ref || 'Documento Legal'} - Jurexia</title>
                <style>
                    @page { margin: 2cm; }
                    body { 
                        font-family: 'Georgia', serif; 
                        line-height: 1.8; 
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .header { 
                        border-bottom: 3px solid #B8860B;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .logo { 
                        font-size: 28px; 
                        font-weight: bold;
                        color: #333;
                    }
                    .logo span { color: #B8860B; }
                    .metadata {
                        background: #f5f5f0;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    }
                    .metadata p { margin: 5px 0; font-size: 14px; }
                    .content { 
                        text-align: justify;
                        font-size: 16px;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        font-size: 12px;
                        color: #666;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">Jurex<span>ia</span> GTP</div>
                </div>
                <div class="metadata">
                    ${document.ref ? `<p><strong>Referencia:</strong> ${document.ref}</p>` : ''}
                    ${document.origen ? `<p><strong>Origen:</strong> ${document.origen}</p>` : ''}
                    ${document.jurisdiccion ? `<p><strong>Jurisdicción:</strong> ${document.jurisdiccion}</p>` : ''}
                    ${document.entidad ? `<p><strong>Entidad:</strong> ${document.entidad}</p>` : ''}
                    <p><strong>Silo:</strong> ${document.silo}</p>
                </div>
                <div class="content">
                    ${document.texto.replace(/\n/g, '<br/>')}
                </div>
                <div class="footer">
                    <p>Documento generado por Jurexia GTP - Plataforma de IA Legal para México</p>
                    <p>ID: ${document.id}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-cream-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo-jurexia.png"
                            alt="Jurexia GTP"
                            className="h-8"
                        />
                        <span className="text-lg font-serif font-medium text-charcoal-900">
                            Documento Legal
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={!document}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-accent-brown text-white rounded-lg hover:bg-accent-gold transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Imprimir / PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accent-brown" />
                            <span className="ml-3 text-charcoal-600">Cargando documento...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {document && !loading && (
                        <>
                            {/* Metadata */}
                            <div className="bg-cream-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
                                {document.ref && (
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-accent-brown" />
                                        <span className="font-medium">Referencia:</span>
                                        <span className="text-charcoal-700">{document.ref}</span>
                                    </div>
                                )}
                                {document.origen && (
                                    <div className="flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-accent-brown" />
                                        <span className="font-medium">Origen:</span>
                                        <span className="text-charcoal-700">{document.origen}</span>
                                    </div>
                                )}
                                {document.entidad && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-accent-brown" />
                                        <span className="font-medium">Entidad:</span>
                                        <span className="text-charcoal-700">{document.entidad}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Silo:</span>
                                    <span className="px-2 py-0.5 bg-accent-brown/20 text-accent-brown text-xs rounded">
                                        {document.silo}
                                    </span>
                                </div>
                            </div>

                            {/* Document Text */}
                            <div className="prose-legal text-charcoal-800 leading-relaxed whitespace-pre-wrap">
                                {document.texto}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-cream-300 text-xs text-charcoal-500 text-center">
                    ID: {docId}
                </div>
            </div>
        </div>
    );
}
