'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, File, Loader2, AlertCircle, Gavel, MapPin } from 'lucide-react';

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

interface SentenciaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (message: string) => void;
    estado?: string;
}

export default function SentenciaModal({ isOpen, onClose, onSubmit, estado }: SentenciaModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEstado, setSelectedEstado] = useState(estado || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];

    const validateFile = (file: File): boolean => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            setError(`Formato no soportado. Usa: ${allowedExtensions.join(', ')}`);
            return false;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('El archivo es muy grande. Máximo 10MB.');
            return false;
        }
        return true;
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);
        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            setPastedText('');
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            setPastedText('');
        }
    };

    const extractTextFromPDF = async (file: File): Promise<string> => {
        const pdfjsLib = await import('pdfjs-dist');
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        } catch {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
        }
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText.trim();
    };

    const extractTextFromDOCX = async (file: File): Promise<string> => {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    };

    const extractTextFromDOCServer = async (file: File): Promise<string> => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Iurexia-api.onrender.com';
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/extract-text`, { method: 'POST', body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
            throw new Error(errorData.detail || `Error del servidor: ${response.status}`);
        }
        const data = await response.json();
        return data.text;
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            let documentText = '';

            if (selectedFile) {
                const extension = selectedFile.name.split('.').pop()?.toLowerCase();
                if (extension === 'pdf') {
                    documentText = await extractTextFromPDF(selectedFile);
                } else if (extension === 'docx') {
                    documentText = await extractTextFromDOCX(selectedFile);
                } else if (extension === 'doc') {
                    documentText = await extractTextFromDOCServer(selectedFile);
                } else if (extension === 'txt') {
                    documentText = await selectedFile.text();
                }
            } else if (pastedText.trim()) {
                documentText = pastedText.trim();
            }

            if (!documentText || documentText.length < 100) {
                throw new Error('El documento debe tener al menos 100 caracteres para ser auditado.');
            }

            // Limit to 120k chars
            const docContent = documentText.slice(0, 120000);
            const truncNote = documentText.length > 120000
                ? `\n\n[NOTA: Documento truncado. ${Math.round(120000 / documentText.length * 100)}% del contenido]`
                : '';

            const fileName = selectedFile?.name || 'Texto pegado';
            const estadoParam = selectedEstado || estado || '';

            // Format as special message for the backend
            const message = `[AUDITAR_SENTENCIA]
Archivo: ${fileName}
Estado: ${estadoParam}

<!-- SENTENCIA_INICIO -->${truncNote}
${docContent}
<!-- SENTENCIA_FIN -->`;

            onSubmit(message);
            handleClose();
        } catch (err) {
            console.error('Error processing sentencia:', err);
            setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPastedText('');
        setError(null);
        setIsDragging(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-cream-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300">
                    <div className="flex items-center gap-3">
                        <Gavel className="w-6 h-6 text-accent-gold" />
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-charcoal-900">
                                Revisar Sentencia
                            </h2>
                            <p className="text-xs text-charcoal-500">Auditoría jerárquica con IA</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                            transition-all duration-200
                            ${isDragging
                                ? 'border-accent-gold bg-accent-gold/10'
                                : 'border-cream-400 hover:border-accent-brown hover:bg-cream-200'
                            }
                            ${selectedFile ? 'border-green-400 bg-green-50' : ''}
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-green-600" />
                                </div>
                                <p className="font-medium text-charcoal-900">{selectedFile.name}</p>
                                <p className="text-xs text-charcoal-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                    className="text-xs text-red-600 hover:text-red-700"
                                >
                                    Cambiar archivo
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center">
                                    <File className="w-6 h-6 text-accent-brown" />
                                </div>
                                <p className="font-medium text-charcoal-900 text-sm">
                                    Arrastra la sentencia aquí
                                </p>
                                <p className="text-xs text-charcoal-500">o haz clic para seleccionar</p>
                                <div className="flex gap-1.5 mt-1">
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">.pdf</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">.docx</span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">.txt</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Or paste text */}
                    {!selectedFile && (
                        <div className="mt-4">
                            <label className="block text-xs font-medium text-charcoal-600 mb-1.5">
                                O pega el texto directamente:
                            </label>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="Pega aquí el texto completo de la sentencia..."
                                rows={4}
                                className="w-full rounded-lg border border-cream-400 bg-white px-3 py-2 text-sm text-charcoal-900 
                                     placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 
                                     focus:border-accent-gold resize-y"
                            />
                        </div>
                    )}

                    {/* Jurisdiction selector */}
                    <div className="mt-4">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-charcoal-600 mb-1.5">
                            <MapPin className="w-3 h-3" />
                            Jurisdicción (opcional):
                        </label>
                        <select
                            value={selectedEstado}
                            onChange={(e) => setSelectedEstado(e.target.value)}
                            className="w-full rounded-lg border border-cream-400 bg-white px-3 py-2 text-sm text-charcoal-900 
                                 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold"
                        >
                            {ESTADOS_MEXICO.map(e => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Protocols info */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {['Art. 217', 'CT 293/2011', 'Motor Radilla', 'Suplencia'].map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 rounded-full bg-charcoal-900/5 text-charcoal-500 font-medium">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-cream-300 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-charcoal-600 hover:text-charcoal-900 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={(!selectedFile && pastedText.length < 100) || isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-brown text-white rounded-lg
                                   hover:bg-accent-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Gavel className="w-4 h-4" />
                                Auditar Sentencia
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
