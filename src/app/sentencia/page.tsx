'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Shield, Scale, Gavel, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/useAuth';
import { UserAvatar } from '@/components/UserAvatar';
import { auditSentencia, SentenciaAuditResponse, SentenciaHallazgo } from '@/lib/api';

// Mexican states for jurisdiction selector (same as chat)
const ESTADOS_MEXICO = [
    { value: '', label: 'Sin seleccionar' },
    { value: 'AGUASCALIENTES', label: 'Aguascalientes' },
    { value: 'BAJA_CALIFORNIA', label: 'Baja California' },
    { value: 'BAJA_CALIFORNIA_SUR', label: 'Baja California Sur' },
    { value: 'CAMPECHE', label: 'Campeche' },
    { value: 'CHIAPAS', label: 'Chiapas' },
    { value: 'CHIHUAHUA', label: 'Chihuahua' },
    { value: 'CIUDAD_DE_MEXICO', label: 'Ciudad de México' },
    { value: 'COAHUILA_DE_ZARAGOZA', label: 'Coahuila' },
    { value: 'COLIMA', label: 'Colima' },
    { value: 'DURANGO', label: 'Durango' },
    { value: 'GUANAJUATO', label: 'Guanajuato' },
    { value: 'GUERRERO', label: 'Guerrero' },
    { value: 'HIDALGO', label: 'Hidalgo' },
    { value: 'JALISCO', label: 'Jalisco' },
    { value: 'ESTADO_DE_MEXICO', label: 'Estado de México' },
    { value: 'MICHOACAN', label: 'Michoacán' },
    { value: 'MORELOS', label: 'Morelos' },
    { value: 'NAYARIT', label: 'Nayarit' },
    { value: 'NUEVO_LEON', label: 'Nuevo León' },
    { value: 'OAXACA', label: 'Oaxaca' },
    { value: 'PUEBLA', label: 'Puebla' },
    { value: 'QUERETARO', label: 'Querétaro' },
    { value: 'QUINTANA_ROO', label: 'Quintana Roo' },
    { value: 'SAN_LUIS_POTOSI', label: 'San Luis Potosí' },
    { value: 'SINALOA', label: 'Sinaloa' },
    { value: 'SONORA', label: 'Sonora' },
    { value: 'TABASCO', label: 'Tabasco' },
    { value: 'TAMAULIPAS', label: 'Tamaulipas' },
    { value: 'TLAXCALA', label: 'Tlaxcala' },
    { value: 'VERACRUZ', label: 'Veracruz' },
    { value: 'YUCATAN', label: 'Yucatán' },
    { value: 'ZACATECAS', label: 'Zacatecas' },
];

function SeveridadBadge({ severidad }: { severidad: string }) {
    const colors: Record<string, string> = {
        'CRITICA': 'bg-red-100 text-red-800 border-red-200',
        'ALTA': 'bg-orange-100 text-orange-800 border-orange-200',
        'MEDIA': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'BAJA': 'bg-green-100 text-green-800 border-green-200',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[severidad] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {severidad}
        </span>
    );
}

function TipoBadge({ tipo }: { tipo: string }) {
    const icons: Record<string, React.ReactNode> = {
        'VIOLACION_JURISPRUDENCIA': <Gavel className="w-3.5 h-3.5" />,
        'CONTROL_CONVENCIONALIDAD': <Shield className="w-3.5 h-3.5" />,
        'ERROR_METODOLOGICO': <AlertTriangle className="w-3.5 h-3.5" />,
        'VIOLACION_PROCESAL': <XCircle className="w-3.5 h-3.5" />,
        'INCONGRUENCIA': <Scale className="w-3.5 h-3.5" />,
    };
    const labels: Record<string, string> = {
        'VIOLACION_JURISPRUDENCIA': 'Violación Jurisprudencial',
        'CONTROL_CONVENCIONALIDAD': 'Control Convencional',
        'ERROR_METODOLOGICO': 'Error Metodológico',
        'VIOLACION_PROCESAL': 'Violación Procesal',
        'INCONGRUENCIA': 'Incongruencia',
    };
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-charcoal-900/5 text-charcoal-700 text-xs font-medium">
            {icons[tipo] || <AlertTriangle className="w-3.5 h-3.5" />}
            {labels[tipo] || tipo}
        </span>
    );
}

function ViabilidadIndicator({ viabilidad }: { viabilidad: string }) {
    const isNula = viabilidad.toUpperCase().includes('NULA');
    const isAlta = viabilidad.toUpperCase().includes('ALTA');
    const isMuerta = viabilidad.toUpperCase().includes('MEDIA');

    let bgColor = 'bg-yellow-50 border-yellow-200';
    let textColor = 'text-yellow-800';
    let icon = <AlertTriangle className="w-6 h-6 text-yellow-600" />;

    if (isNula) {
        bgColor = 'bg-red-50 border-red-200';
        textColor = 'text-red-800';
        icon = <XCircle className="w-6 h-6 text-red-600" />;
    } else if (isAlta) {
        bgColor = 'bg-green-50 border-green-200';
        textColor = 'text-green-800';
        icon = <CheckCircle className="w-6 h-6 text-green-600" />;
    }

    return (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 ${bgColor}`}>
            {icon}
            <div>
                <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Viabilidad</p>
                <p className={`text-lg font-bold ${textColor}`}>{viabilidad}</p>
            </div>
        </div>
    );
}

function HallazgoCard({ hallazgo, index }: { hallazgo: SentenciaHallazgo; index: number }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-start gap-3 p-4 text-left"
            >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-charcoal-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <TipoBadge tipo={hallazgo.tipo} />
                        <SeveridadBadge severidad={hallazgo.severidad} />
                        <span className="text-xs text-charcoal-400">Protocolo {hallazgo.protocolo_origen}</span>
                    </div>
                    <p className="text-sm text-charcoal-800 line-clamp-2">{hallazgo.descripcion}</p>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-charcoal-400 flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal-400 flex-shrink-0" />
                )}
            </button>
            {expanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="pl-10 space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Descripción Completa</p>
                            <p className="text-sm text-charcoal-700 leading-relaxed">{hallazgo.descripcion}</p>
                        </div>
                        {hallazgo.fundamento && (
                            <div>
                                <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Fundamento</p>
                                <p className="text-sm text-charcoal-600 bg-cream-300/50 rounded-lg p-3 font-mono text-xs leading-relaxed">{hallazgo.fundamento}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
            >
                {icon}
                <span className="font-serif text-base font-medium text-charcoal-900 flex-1">{title}</span>
                {open ? (
                    <ChevronUp className="w-5 h-5 text-charcoal-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal-400" />
                )}
            </button>
            {open && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {children}
                </div>
            )}
        </div>
    );
}


export default function SentenciaPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const [documentText, setDocumentText] = useState('');
    const [fileName, setFileName] = useState('');
    const [estado, setEstado] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<SentenciaAuditResponse | null>(null);
    const [analysisStep, setAnalysisStep] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const handleFile = useCallback(async (file: File) => {
        setError('');
        setResult(null);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'txt') {
            const text = await file.text();
            setDocumentText(text);
            setFileName(file.name);
        } else if (extension === 'pdf') {
            // Use pdf.js to extract text
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                setDocumentText(fullText.trim());
                setFileName(file.name);
            } catch {
                setError('Error al extraer texto del PDF. Intenta con un archivo .txt o .docx.');
            }
        } else if (extension === 'docx' || extension === 'doc') {
            // Send to backend for extraction
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Iurexia-api.onrender.com';
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch(`${API_URL}/extract-text`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error('Failed to extract text');
                const data = await response.json();
                setDocumentText(data.text);
                setFileName(file.name);
            } catch {
                setError('Error al procesar archivo. Intenta con un formato diferente.');
            }
        } else {
            setError('Formato no soportado. Usa PDF, DOCX, DOC o TXT.');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const handleAnalyze = async () => {
        if (!documentText || documentText.length < 100) {
            setError('El documento debe tener al menos 100 caracteres.');
            return;
        }

        setIsAnalyzing(true);
        setError('');
        setResult(null);

        try {
            setAnalysisStep('Perfilando el asunto...');
            // Small delay to show the step visually
            await new Promise(r => setTimeout(r, 600));
            setAnalysisStep('Buscando jurisprudencia contradictoria...');
            await new Promise(r => setTimeout(r, 400));
            setAnalysisStep('Evaluando bloque de convencionalidad...');
            await new Promise(r => setTimeout(r, 400));
            setAnalysisStep('Generando dictamen con DeepSeek Reasoner...');

            const response = await auditSentencia(documentText, estado || undefined);
            setResult(response);
        } catch (err: any) {
            setError(err.message || 'Error al auditar la sentencia. Intenta de nuevo.');
        } finally {
            setIsAnalyzing(false);
            setAnalysisStep('');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-cream-300 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-300">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-cream-300/90 backdrop-blur-md border-b border-black/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
                    <Link href="/chat" className="flex items-center gap-2 group">
                        <span className="font-serif text-xl font-semibold text-charcoal-900">
                            Iurex<span className="text-accent-gold">ia</span>
                        </span>
                        <span className="text-xs text-charcoal-400 border-l border-charcoal-200 pl-2 ml-1">Centinela de Sentencias</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/chat" className="text-sm text-charcoal-600 hover:text-charcoal-900 transition-colors">
                            ← Volver al Chat
                        </Link>
                        <UserAvatar />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12">
                {!result ? (
                    /* ═══════════════════════════ UPLOAD STATE ═══════════════════════════ */
                    <div className="max-w-2xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-accent-gold/10 text-accent-gold px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                                <Shield className="w-4 h-4" />
                                Auditoría Jerárquica
                            </div>
                            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-charcoal-900 mb-3">
                                Revisión de Sentencias
                            </h1>
                            <p className="text-charcoal-600 text-base max-w-lg mx-auto">
                                Sube una sentencia y el sistema la auditará con el rigor de un Secretario
                                Proyectista de Tribunal Colegiado.
                            </p>
                        </div>

                        {/* Upload Zone */}
                        <div
                            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 mb-6 ${dragActive
                                    ? 'border-accent-gold bg-accent-gold/5'
                                    : fileName
                                        ? 'border-green-300 bg-green-50/50'
                                        : 'border-charcoal-200 bg-white/50 hover:border-charcoal-300'
                                }`}
                        >
                            {fileName ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
                                        <FileText className="w-7 h-7 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-charcoal-900">{fileName}</p>
                                        <p className="text-sm text-charcoal-500">{documentText.length.toLocaleString()} caracteres cargados</p>
                                    </div>
                                    <button
                                        onClick={() => { setFileName(''); setDocumentText(''); setResult(null); }}
                                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        Cambiar archivo
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-charcoal-900/5 flex items-center justify-center">
                                        <Upload className="w-7 h-7 text-charcoal-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-charcoal-900 mb-1">Arrastra tu sentencia aquí</p>
                                        <p className="text-sm text-charcoal-500">PDF, DOCX, DOC o TXT</p>
                                    </div>
                                    <label className="btn-secondary text-sm cursor-pointer">
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.txt"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                        />
                                        Seleccionar archivo
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Or paste text */}
                        {!fileName && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                    O pega el texto directamente:
                                </label>
                                <textarea
                                    value={documentText}
                                    onChange={(e) => setDocumentText(e.target.value)}
                                    placeholder="Pega aquí el texto completo de la sentencia..."
                                    rows={8}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold resize-y"
                                />
                            </div>
                        )}

                        {/* Estado selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Jurisdicción (opcional):
                            </label>
                            <select
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold"
                            >
                                {ESTADOS_MEXICO.map(e => (
                                    <option key={e.value} value={e.value}>{e.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Analyze button */}
                        <button
                            onClick={handleAnalyze}
                            disabled={!documentText || documentText.length < 100 || isAnalyzing}
                            className="w-full btn-primary text-base py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {analysisStep}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Gavel className="w-5 h-5" />
                                    Auditar Sentencia
                                </span>
                            )}
                        </button>

                        {/* Info pills */}
                        <div className="flex flex-wrap gap-2 justify-center mt-6">
                            {['Art. 217 Ley de Amparo', 'CT 293/2011', 'Motor Radilla', 'Suplencia de Queja'].map(tag => (
                                <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-charcoal-900/5 text-charcoal-500 font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ═══════════════════════════ RESULTS STATE ═══════════════════════════ */
                    <div className="space-y-6">
                        {/* Back / New Analysis */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => { setResult(null); setDocumentText(''); setFileName(''); }}
                                className="text-sm text-charcoal-600 hover:text-charcoal-900 transition-colors flex items-center gap-1"
                            >
                                ← Nueva auditoría
                            </button>
                            <span className="text-xs text-charcoal-400">{fileName || 'Texto pegado'}</span>
                        </div>

                        {/* Top Summary Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ViabilidadIndicator viabilidad={result.viabilidad_sentencia} />
                            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                                <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Materia</p>
                                <p className="text-lg font-bold text-charcoal-900">{result.perfil_sentencia.materia}</p>
                                <p className="text-xs text-charcoal-500">{result.perfil_sentencia.modo_revision === 'SUPLENCIA' ? '🔍 Modo Suplencia' : '📋 Estricto Derecho'}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                                <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Hallazgos</p>
                                <p className="text-lg font-bold text-charcoal-900">{result.hallazgos_criticos.length}</p>
                                <p className="text-xs text-charcoal-500">
                                    {result.hallazgos_criticos.filter(h => h.severidad === 'CRITICA').length} críticos
                                </p>
                            </div>
                        </div>

                        {/* Resumen Ejecutivo */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h2 className="font-serif text-lg font-medium text-charcoal-900 mb-3 flex items-center gap-2">
                                <Scale className="w-5 h-5 text-accent-gold" />
                                Resumen Ejecutivo
                            </h2>
                            <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-wrap">{result.resumen_ejecutivo}</p>
                        </div>

                        {/* Sugerencia del Proyectista */}
                        {result.sugerencia_proyectista && (
                            <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-xl p-5">
                                <h3 className="font-serif text-base font-medium text-charcoal-900 mb-2 flex items-center gap-2">
                                    <Gavel className="w-4 h-4 text-accent-gold" />
                                    Sugerencia del Proyectista
                                </h3>
                                <p className="text-sm text-charcoal-700 leading-relaxed">{result.sugerencia_proyectista}</p>
                            </div>
                        )}

                        {/* Hallazgos Críticos */}
                        {result.hallazgos_criticos.length > 0 && (
                            <div>
                                <h2 className="font-serif text-lg font-medium text-charcoal-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Hallazgos Críticos ({result.hallazgos_criticos.length})
                                </h2>
                                <div className="space-y-3">
                                    {result.hallazgos_criticos.map((h, i) => (
                                        <HallazgoCard key={i} hallazgo={h} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Collapsible Analysis Sections */}
                        <div className="space-y-3">
                            <CollapsibleSection
                                title="Análisis Jurisprudencial"
                                icon={<Gavel className="w-5 h-5 text-charcoal-500" />}
                                defaultOpen={result.analisis_jurisprudencial.jurisprudencia_contradictoria_encontrada}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        {result.analisis_jurisprudencial.jurisprudencia_contradictoria_encontrada ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                                                <XCircle className="w-4 h-4" /> Contradicción Encontrada
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                                                <CheckCircle className="w-4 h-4" /> Sin Contradicción
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-wrap">{result.analisis_jurisprudencial.detalle}</p>
                                </div>
                            </CollapsibleSection>

                            <CollapsibleSection
                                title="Control de Convencionalidad (CT 293/2011)"
                                icon={<Shield className="w-5 h-5 text-charcoal-500" />}
                            >
                                <div className="space-y-3">
                                    {result.analisis_convencional.derechos_en_juego.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-1.5">Derechos en Juego</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.analisis_convencional.derechos_en_juego.map((d, i) => (
                                                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {result.analisis_convencional.tratados_aplicables.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-1.5">Tratados Aplicables</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.analisis_convencional.tratados_aplicables.map((t, i) => (
                                                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-wrap">{result.analisis_convencional.detalle}</p>
                                </div>
                            </CollapsibleSection>

                            <CollapsibleSection
                                title="Análisis Metodológico (Motor Radilla)"
                                icon={<Scale className="w-5 h-5 text-charcoal-500" />}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        {result.analisis_metodologico.interpretacion_conforme_aplicada ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                                                <CheckCircle className="w-4 h-4" /> Interpretación Conforme Aplicada
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                                                <AlertTriangle className="w-4 h-4" /> Interpretación Conforme No Identificada
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-wrap">{result.analisis_metodologico.detalle}</p>
                                </div>
                            </CollapsibleSection>

                            {/* Perfil de la Sentencia */}
                            <CollapsibleSection
                                title="Perfil de la Sentencia"
                                icon={<FileText className="w-5 h-5 text-charcoal-500" />}
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Acto Reclamado</p>
                                        <p className="text-sm text-charcoal-800 mt-1">{result.perfil_sentencia.acto_reclamado}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Sentido del Fallo</p>
                                        <p className="text-sm text-charcoal-800 mt-1">{result.perfil_sentencia.sentido_fallo}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Materia</p>
                                        <p className="text-sm text-charcoal-800 mt-1">{result.perfil_sentencia.materia}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Modo de Revisión</p>
                                        <p className="text-sm text-charcoal-800 mt-1">{result.perfil_sentencia.modo_revision}</p>
                                    </div>
                                </div>
                            </CollapsibleSection>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
