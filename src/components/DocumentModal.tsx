'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, FileText, MapPin, Scale, Loader2, Gavel, BookOpen, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import { getDocument, DocumentResponse } from '@/lib/api';
import { findLawPdfUrl, getEstadoDisplayName } from '@/lib/lawPdfLookup';
import PdfViewerModal from '@/components/PdfViewerModal';
import TextViewerModal from '@/components/TextViewerModal';

interface DocumentModalProps {
    docId: string | null;
    onClose: () => void;
}

// Parse jurisprudence metadata from text OR document payload
function parseJurisprudenciaMetadata(texto: string, doc?: DocumentResponse): {
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

    // Prefer text tags if present, otherwise fallback to payload fields (for TCC)
    result.tipo = tipoMatch ? tipoMatch[1].trim() : doc?.tipo_criterio;
    result.materia = materiaMatch ? materiaMatch[1].trim() : doc?.materia;
    result.instancia = instanciaMatch ? instanciaMatch[1].trim() : doc?.instancia;
    result.tesis = tesisMatch ? tesisMatch[1].trim() : doc?.tesis_num;
    result.registro = registroMatch ? registroMatch[1].trim() : doc?.registro;

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

// ── Humanize Origen: Converts raw filename-style origen to display names ─────
// Fallback for any cases the backend doesn't handle
const CODE_NAMES: Record<string, string> = {
    'CC': 'Código Civil', 'CP': 'Código Penal',
    'CPC': 'Código de Procedimientos Civiles', 'CPP': 'Código de Procedimientos Penales',
    'CNPP': 'Código Nacional de Procedimientos Penales',
    'CT': 'Código de Trabajo', 'CF': 'Código Fiscal',
    'CM': 'Código de Comercio', 'CA': 'Código Administrativo',
    'LF': 'Ley de la Familia', 'LP': 'Ley de Profesiones',
    'LA': 'Ley de Amparo', 'LFT': 'Ley Federal del Trabajo',
};
const STATE_DISPLAY: Record<string, string> = {
    'AGS': 'Aguascalientes', 'BC': 'Baja California', 'BCS': 'Baja California Sur',
    'CAMP': 'Campeche', 'CHIA': 'Chiapas', 'CHIH': 'Chihuahua',
    'CDMX': 'Ciudad de México', 'COAH': 'Coahuila', 'COL': 'Colima',
    'DGO': 'Durango', 'GTO': 'Guanajuato', 'GRO': 'Guerrero',
    'HGO': 'Hidalgo', 'JAL': 'Jalisco', 'MEX': 'Estado de México',
    'MICH': 'Michoacán', 'MOR': 'Morelos', 'NAY': 'Nayarit',
    'NL': 'Nuevo León', 'OAX': 'Oaxaca', 'PUE': 'Puebla',
    'QRO': 'Querétaro', 'QROO': 'Quintana Roo', 'SLP': 'San Luis Potosí',
    'SIN': 'Sinaloa', 'SON': 'Sonora', 'TAB': 'Tabasco',
    'TAMPS': 'Tamaulipas', 'TLAX': 'Tlaxcala', 'VER': 'Veracruz',
    'YUC': 'Yucatán', 'ZAC': 'Zacatecas',
};

function humanizeOrigen(origen: string | null | undefined): string {
    if (!origen) return '';
    let clean = origen.replace(/\.(txt|json)$/i, '').trim();
    // If already human-readable (has spaces, no JSON_ prefix), return as-is
    if (clean.includes(' ') && !clean.startsWith('JSON_')) return clean;
    // Try JSON_{STATE}_{CODE}_{STATE} pattern
    const m = clean.match(/^JSON_([A-Z]+)_([A-Z]+)_([A-Z]+)$/i);
    if (m) {
        const code = CODE_NAMES[m[2].toUpperCase()] || m[2];
        const state = STATE_DISPLAY[m[1].toUpperCase()] || m[1];
        return `${code} del Estado de ${state}`;
    }
    // Fallback: strip JSON_, replace underscores, title-case
    return clean.replace(/^JSON_/i, '').replace(/_/g, ' ');
}

export default function DocumentModal({ docId, onClose }: DocumentModalProps) {
    const [document, setDocument] = useState<DocumentResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [showTextViewer, setShowTextViewer] = useState(false);

    // Resolve PDF URL for "Ver ley completa" button
    // Priority: 1) url_pdf from Qdrant payload, 2) lawPdfLookup (estadosData)
    const pdfUrl = useMemo(() => {
        if (!document || !document.silo?.startsWith('leyes_')) return null;
        if (document.url_pdf) return document.url_pdf;
        return findLawPdfUrl(document.origen, document.entidad);
    }, [document]);

    // Build link to iurexia.com/leyesestatales for the document's state
    const leyesEstatalesUrl = useMemo(() => {
        if (!document?.entidad) return null;
        const slug = getEstadoDisplayName(document.entidad);
        if (!slug) return null;
        // Convert display name to URL slug
        const urlSlug = slug.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-');
        return `/leyesestatales/${urlSlug}`;
    }, [document?.entidad]);

    const isChunkContinuation = (document?.chunk_index ?? 0) > 0;

    const estadoDisplayName = useMemo(() => {
        return document?.entidad ? getEstadoDisplayName(document.entidad) : null;
    }, [document?.entidad]);

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
    const jurisprudenciaData = document && isJurisprudencia ? parseJurisprudenciaMetadata(document.texto, document) : null;

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
                        ${jurisprudenciaData.registro ? `<p><strong>🔢 Registro:</strong> <a href="https://sjf2.scjn.gob.mx/detalle/tesis/${jurisprudenciaData.registro}" target="_blank" rel="noopener" style="color: #B8860B; text-decoration: underline;">${jurisprudenciaData.registro} ↗ Verificar en SCJN</a></p>` : ''}
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
                        ${document.origen ? `<p><strong>📄 Fuente:</strong> ${humanizeOrigen(document.origen)}</p>` : (document.entidad === 'FEDERAL' ? `<p><strong>📄 Fuente:</strong> Legislación Federal</p>` : '')}
                        ${document.jurisdiccion ? `<p><strong>⚖️ Jurisdicción:</strong> ${document.jurisdiccion}</p>` : ''}
                        ${document.entidad && document.entidad !== 'NA' && document.entidad !== 'FEDERAL' ? `<p><strong>📍 Estado:</strong> ${document.entidad}</p>` : ''}
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
                <title>${document.ref || 'Documento Legal'} - Iurexia</title>
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
                    <div class="logo-text">Iurex<span class="highlight">ia</span></div>
                    <div class="subtitle">Plataforma de IA Legal para México</div>
                </div>
                
                <div class="document-title">${document.ref || 'Documento Legal'}</div>
                
                ${metadataHTML}
                
                ${contentHTML}
                
                <div class="footer">
                    <p class="footer-logo">Iurex<span class="highlight">ia</span> - Inteligencia Artificial Legal</p>
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
                            Iurex<span className="text-accent-gold">ia</span>
                        </span>
                        <span className="text-lg font-serif font-medium text-charcoal-600 ml-2">
                            | {isJurisprudencia ? 'Jurisprudencia' : 'Documento Legal'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {pdfUrl && (
                            <button
                                onClick={() => setShowPdfViewer(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Ver ley completa
                            </button>
                        )}
                        {document?.silo === 'bloque_constitucional' && document.origen && (
                            <button
                                onClick={() => setShowTextViewer(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition-colors"
                            >
                                <BookOpen className="w-4 h-4" />
                                Ver documento completo
                            </button>
                        )}
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
                                            <a
                                                href={`https://sjf2.scjn.gob.mx/detalle/tesis/${jurisprudenciaData.registro}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-brown/20 text-accent-brown text-xs rounded font-mono hover:bg-accent-brown/30 transition-colors cursor-pointer"
                                                title="Verificar en el Semanario Judicial de la Federación"
                                            >
                                                {jurisprudenciaData.registro}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                            <span className="text-[10px] text-charcoal-500 italic">Verificar en SCJN</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-cream-200 rounded-lg p-4 mb-6 space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Fuente: ley name or fallback to 'Legislación Federal' */}
                                        {document.origen ? (
                                            <div className="flex items-center gap-2 col-span-2">
                                                <Scale className="w-4 h-4 text-accent-brown" />
                                                <span className="font-medium">Fuente:</span>
                                                <span className="text-charcoal-700">{humanizeOrigen(document.origen)}</span>
                                            </div>
                                        ) : document.entidad === 'FEDERAL' ? (
                                            <div className="flex items-center gap-2 col-span-2">
                                                <Scale className="w-4 h-4 text-accent-brown" />
                                                <span className="font-medium">Fuente:</span>
                                                <span className="text-charcoal-700">Legislación Federal</span>
                                            </div>
                                        ) : null}
                                        {/* Show state only for state-level laws (not FEDERAL) */}
                                        {document.entidad && document.entidad !== 'NA' && document.entidad !== 'FEDERAL' && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-accent-brown" />
                                                <span className="font-medium">Estado:</span>
                                                <span className="text-charcoal-700">{estadoDisplayName ?? document.entidad}</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Hierarchy breadcrumb */}
                                    {document.jerarquia_txt && (
                                        <div className="flex items-center gap-1.5 text-xs text-charcoal-500 pt-1 border-t border-cream-300">
                                            <ChevronRight className="w-3 h-3" />
                                            <span>{document.jerarquia_txt}</span>
                                        </div>
                                    )}
                                    {/* Link to Leyes Estatales page */}
                                    {leyesEstatalesUrl && (
                                        <div className="pt-1 border-t border-cream-300">
                                            <a
                                                href={leyesEstatalesUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs text-accent-brown hover:text-accent-gold transition-colors"
                                            >
                                                <BookOpen className="w-3 h-3" />
                                                Ver todas las leyes de {estadoDisplayName ?? document.entidad}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
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
                                <div className="prose-legal text-charcoal-800 leading-relaxed">
                                    {/* Continuation indicator for multi-chunk articles */}
                                    {isChunkContinuation && (
                                        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>Este fragmento es una continuación del artículo. El texto puede iniciar a mitad de una fracción.</span>
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap">
                                        {document.texto
                                            // Remove law name prefix like [Ley de Hacienda del Estado de Querétaro]
                                            .replace(/^\[[^\]]+\]\s*/gm, '')
                                            .replace(/^#{1,4}\s*/gm, '')  // Remove markdown headers
                                            .split(/\n/)
                                            .map((line, i) => {
                                                const trimmed = line.trim();
                                                // Bold article references
                                                const articleMatch = trimmed.match(/^(Art[ií]culo\s+\d+[\w.-]*)/i);
                                                if (articleMatch) {
                                                    return (
                                                        <span key={i}>
                                                            <strong className="text-charcoal-900 text-base">{articleMatch[1]}</strong>
                                                            {trimmed.slice(articleMatch[1].length)}
                                                            {'\n'}
                                                        </span>
                                                    );
                                                }
                                                // Bold Roman numeral fractions (I., II., III., IV., V., etc.)
                                                const romanMatch = trimmed.match(/^([IVXLCDM]+\.)\s/);
                                                if (romanMatch) {
                                                    return (
                                                        <span key={i}>
                                                            {'\n'}
                                                            <strong className="text-charcoal-900">{romanMatch[1]}</strong>
                                                            {' '}{trimmed.slice(romanMatch[0].length)}
                                                            {'\n'}
                                                        </span>
                                                    );
                                                }
                                                return line + '\n';
                                            })
                                        }
                                    </div>
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

            {/* PDF Viewer Modal */}
            {showPdfViewer && pdfUrl && document && (
                <PdfViewerModal
                    pdfUrl={pdfUrl}
                    lawName={humanizeOrigen(document.origen)}
                    estadoName={estadoDisplayName}
                    onClose={() => setShowPdfViewer(false)}
                />
            )}

            {/* Text Viewer Modal (Bloque Constitucional) */}
            {showTextViewer && document?.origen && (
                <TextViewerModal
                    origen={document.origen}
                    highlightChunkId={docId || undefined}
                    onClose={() => setShowTextViewer(false)}
                />
            )}
        </div>
    );
}
