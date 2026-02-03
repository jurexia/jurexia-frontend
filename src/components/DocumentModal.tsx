'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, FileText, MapPin, Scale, Loader2, Gavel, BookOpen } from 'lucide-react';
import { getDocument, DocumentResponse } from '@/lib/api';

interface DocumentModalProps {
    docId: string | null;
    onClose: () => void;
}

// Parse jurisprudence metadata from text
function parseJurisprudenciaMetadata(texto: string): {
    tipo?: string;
    materia?: string;
    instancia?: string;
    tesis?: string;
    registro?: string;
    rubro?: string;
    contenido: string;
} {
    const result: {
        tipo?: string;
        materia?: string;
        instancia?: string;
        tesis?: string;
        registro?: string;
        rubro?: string;
        contenido: string;
    } = { contenido: texto };

    // Extract metadata from bracketed format: [TIPO: JURISPRUDENCIA] [MATERIA: ADMINISTRATIVA] etc.
    const tipoMatch = texto.match(/\[TIPO:\s*([^\]]+)\]/i);
    const materiaMatch = texto.match(/\[MATERIA:\s*([^\]]+)\]/i);
    const instanciaMatch = texto.match(/\[INSTANCIA:\s*([^\]]+)\]/i);
    const tesisMatch = texto.match(/\[TESIS:\s*([^\]]+)\]/i);
    const registroMatch = texto.match(/\[REGISTRO:\s*([^\]]+)\]/i);

    if (tipoMatch) result.tipo = tipoMatch[1].trim();
    if (materiaMatch) result.materia = materiaMatch[1].trim();
    if (instanciaMatch) result.instancia = instanciaMatch[1].trim();
    if (tesisMatch) result.tesis = tesisMatch[1].trim();
    if (registroMatch) result.registro = registroMatch[1].trim();

    // Remove metadata lines and dashes from content
    let contenido = texto
        .replace(/\[TIPO:[^\]]+\]/gi, '')
        .replace(/\[MATERIA:[^\]]+\]/gi, '')
        .replace(/\[INSTANCIA:[^\]]+\]/gi, '')
        .replace(/\[TESIS:[^\]]+\]/gi, '')
        .replace(/\[REGISTRO:[^\]]+\]/gi, '')
        .replace(/-{3,}/g, '')  // Remove dash lines
        .trim();

    // Extract rubro (title) - usually the first line after metadata
    const lines = contenido.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
        // The rubro is typically the first substantive line
        result.rubro = lines[0].trim();
        result.contenido = lines.slice(1).join('\n').trim();
    }

    return result;
}

// Format thesis content with bold sections and line breaks
function formatThesisContent(contenido: string): React.ReactNode {
    // Keywords to format as bold with line breaks before them
    const keywords = ['Hechos:', 'Criterio jurídico:', 'Justificación:'];

    // Split content by keywords while keeping the keywords
    let parts: { text: string; isBold: boolean }[] = [];
    let remaining = contenido;

    for (const keyword of keywords) {
        const index = remaining.indexOf(keyword);
        if (index !== -1) {
            // Add text before keyword
            if (index > 0) {
                parts.push({ text: remaining.slice(0, index).trim(), isBold: false });
            }
            // Add keyword as bold
            parts.push({ text: keyword, isBold: true });
            remaining = remaining.slice(index + keyword.length);
        }
    }

    // Add remaining text
    if (remaining.trim()) {
        parts.push({ text: remaining.trim(), isBold: false });
    }

    // If no keywords found, return original content
    if (parts.length === 0) {
        return contenido;
    }

    // Render parts with proper formatting
    return parts.map((part, index) => {
        if (part.isBold) {
            return (
                <span key={index}>
                    {index > 0 && <><br /><br /></>}
                    <strong className="text-charcoal-900">{part.text}</strong>{' '}
                </span>
            );
        }
        return <span key={index}>{part.text}</span>;
    });
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

    const isJurisprudencia = document?.silo === 'jurisprudencia_nacional';
    const jurisprudenciaData = document && isJurisprudencia ? parseJurisprudenciaMetadata(document.texto) : null;

    const handleDownloadPDF = () => {
        if (!document) return;

        // Generate different PDF content for jurisprudencia vs regular documents
        let metadataHTML = '';
        let contentHTML = '';

        if (isJurisprudencia && jurisprudenciaData) {
            metadataHTML = `
                <div class="metadata">
                    <div class="metadata-grid">
                        ${jurisprudenciaData.tipo ? `<p><strong>📋 Tipo:</strong> ${jurisprudenciaData.tipo}</p>` : ''}
                        ${jurisprudenciaData.materia ? `<p><strong>⚖️ Materia:</strong> ${jurisprudenciaData.materia}</p>` : ''}
                        ${jurisprudenciaData.instancia ? `<p><strong>🏛️ Instancia:</strong> ${jurisprudenciaData.instancia}</p>` : ''}
                        ${jurisprudenciaData.tesis ? `<p><strong>📑 Tesis:</strong> ${jurisprudenciaData.tesis}</p>` : ''}
                        ${jurisprudenciaData.registro ? `<p><strong>🔢 Registro:</strong> ${jurisprudenciaData.registro}</p>` : ''}
                    </div>
                </div>
            `;
            contentHTML = `
                ${jurisprudenciaData.rubro ? `<div class="rubro">${jurisprudenciaData.rubro}</div>` : ''}
                <div class="content">${jurisprudenciaData.contenido.replace(/\n/g, '<br/>')}</div>
            `;
        } else {
            metadataHTML = `
                <div class="metadata">
                    <div class="metadata-grid">
                        ${document.origen ? `<p><strong>📄 Origen:</strong> ${document.origen}</p>` : ''}
                        ${document.jurisdiccion ? `<p><strong>⚖️ Jurisdicción:</strong> ${document.jurisdiccion}</p>` : ''}
                        ${document.entidad && document.entidad !== 'NA' ? `<p><strong>📍 Entidad:</strong> ${document.entidad}</p>` : ''}
                        <p><strong>📁 Categoría:</strong> ${document.silo.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())}</p>
                    </div>
                </div>
            `;
            contentHTML = `
                <div class="content">${document.texto.replace(/#### /g, '<strong>').replace(/\n/g, '</strong><br/>')}</div>
            `;
        }

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${document.ref || 'Documento Legal'} - Jurexia</title>
                <style>
                    @page { 
                        margin: 2.5cm 2cm; 
                        @bottom-center { content: "Página " counter(page) " de " counter(pages); }
                    }
                    body { 
                        font-family: 'Georgia', 'Times New Roman', serif; 
                        line-height: 1.8; 
                        color: #1a1a1a;
                        max-width: 750px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header { 
                        border-bottom: 3px solid #B8860B;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .logo-text { 
                        font-size: 32px; 
                        font-weight: bold;
                        color: #1a1a1a;
                        margin: 0;
                    }
                    .logo-text .highlight { color: #B8860B; }
                    .subtitle {
                        font-size: 14px;
                        color: #666;
                        margin-top: 5px;
                    }
                    .metadata {
                        background: linear-gradient(135deg, #f8f6f0 0%, #f0ede5 100%);
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 30px;
                        border-left: 4px solid #B8860B;
                    }
                    .metadata-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                    }
                    .metadata p { margin: 5px 0; font-size: 14px; }
                    .metadata strong { color: #333; }
                    .document-title {
                        font-size: 20px;
                        font-weight: bold;
                        color: #1a1a1a;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #ddd;
                    }
                    .rubro {
                        font-size: 18px;
                        font-weight: bold;
                        color: #1a1a1a;
                        margin-bottom: 20px;
                        padding: 15px;
                        background: #f5f5f5;
                        border-left: 4px solid #B8860B;
                    }
                    .content { 
                        text-align: justify;
                        font-size: 15px;
                        line-height: 1.9;
                    }
                    .content p { margin-bottom: 15px; }
                    .footer {
                        margin-top: 50px;
                        padding-top: 20px;
                        border-top: 2px solid #B8860B;
                        font-size: 11px;
                        color: #666;
                        text-align: center;
                    }
                    .footer-logo {
                        font-weight: bold;
                        color: #1a1a1a;
                    }
                    .footer-logo .highlight { color: #B8860B; }
                    .timestamp { font-size: 10px; color: #999; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-text">Jurex<span class="highlight">ia</span></div>
                    <div class="subtitle">Plataforma de IA Legal para México</div>
                </div>
                
                <div class="document-title">${document.ref || 'Documento Legal'}</div>
                
                ${metadataHTML}
                
                ${contentHTML}
                
                <div class="footer">
                    <p class="footer-logo">Jurex<span class="highlight">ia</span> - Inteligencia Artificial Legal</p>
                    <p>Este documento fue recuperado de nuestra base de datos jurídica verificada.</p>
                    <p class="timestamp">ID: ${document.id} | Generado: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}</p>
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
                        <span className="font-serif text-xl font-semibold text-charcoal-900">
                            Jurex<span className="text-accent-gold">ia</span>
                        </span>
                        <span className="text-lg font-serif font-medium text-charcoal-600 ml-2">
                            | {isJurisprudencia ? 'Jurisprudencia' : 'Documento Legal'}
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
                            {/* Metadata - Different for Jurisprudencia */}
                            {isJurisprudencia && jurisprudenciaData ? (
                                <div className="bg-cream-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
                                    {jurisprudenciaData.tipo && (
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-accent-brown" />
                                            <span className="font-medium">Tipo:</span>
                                            <span className="text-charcoal-700">{jurisprudenciaData.tipo}</span>
                                        </div>
                                    )}
                                    {jurisprudenciaData.materia && (
                                        <div className="flex items-center gap-2">
                                            <Scale className="w-4 h-4 text-accent-brown" />
                                            <span className="font-medium">Materia:</span>
                                            <span className="text-charcoal-700">{jurisprudenciaData.materia}</span>
                                        </div>
                                    )}
                                    {jurisprudenciaData.instancia && (
                                        <div className="flex items-center gap-2">
                                            <Gavel className="w-4 h-4 text-accent-brown" />
                                            <span className="font-medium">Instancia:</span>
                                            <span className="text-charcoal-700">{jurisprudenciaData.instancia}</span>
                                        </div>
                                    )}
                                    {jurisprudenciaData.tesis && (
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-accent-brown" />
                                            <span className="font-medium">Tesis:</span>
                                            <span className="text-charcoal-700">{jurisprudenciaData.tesis}</span>
                                        </div>
                                    )}
                                    {jurisprudenciaData.registro && (
                                        <div className="flex items-center gap-2 col-span-2">
                                            <span className="font-medium">Registro:</span>
                                            <span className="px-2 py-0.5 bg-accent-brown/20 text-accent-brown text-xs rounded font-mono">
                                                {jurisprudenciaData.registro}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-cream-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
                                    {/* For state laws, show Ley name (origen) as primary */}
                                    {document.origen && (
                                        <div className="flex items-center gap-2 col-span-2">
                                            <Scale className="w-4 h-4 text-accent-brown" />
                                            <span className="font-medium">Ley:</span>
                                            <span className="text-charcoal-700">{document.origen.replace(/\.txt$/i, '')}</span>
                                        </div>
                                    )}
                                    {document.entidad && document.entidad !== 'NA' && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-accent-brown" />
                                            <span className="font-medium">Entidad:</span>
                                            <span className="text-charcoal-700">{document.entidad}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Document Text */}
                            {isJurisprudencia && jurisprudenciaData ? (
                                <div className="prose-legal text-charcoal-800 leading-relaxed text-justify">
                                    {jurisprudenciaData.rubro && (
                                        <div className="font-bold text-lg mb-4 p-3 bg-cream-200 border-l-4 border-accent-brown">
                                            {jurisprudenciaData.rubro}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap">
                                        {formatThesisContent(jurisprudenciaData.contenido)}
                                    </div>
                                </div>
                            ) : (
                                <div className="prose-legal text-charcoal-800 leading-relaxed whitespace-pre-wrap">
                                    {document.texto
                                        // Remove law name prefix like [Ley de Hacienda del Estado de Querétaro]
                                        .replace(/^\[[^\]]+\]\s*/gm, '')
                                        .replace(/^#{1,4}\s*/gm, '')  // Remove markdown headers
                                        .split(/\n/)
                                        .map((line, i) => {
                                            // Bold article references
                                            const articleMatch = line.match(/^(Art[ií]culo\s+\d+[\w.-]*)/i);
                                            if (articleMatch) {
                                                return (
                                                    <span key={i}>
                                                        <strong className="text-charcoal-900">{articleMatch[1]}</strong>
                                                        {line.slice(articleMatch[1].length)}
                                                        {'\n'}
                                                    </span>
                                                );
                                            }
                                            return line + '\n';
                                        })
                                    }
                                </div>
                            )}
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
