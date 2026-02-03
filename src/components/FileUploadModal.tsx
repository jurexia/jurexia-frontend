'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, File, Loader2, AlertCircle } from 'lucide-react';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTextExtracted: (text: string, fileName: string) => void;
}

export default function FileUploadModal({ isOpen, onClose, onTextExtracted }: FileUploadModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];

    const validateFile = (file: File): boolean => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            setError(`Formato no soportado. Usa: ${allowedExtensions.join(', ')}`);
            return false;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
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
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
        }
    };

    const extractTextFromPDF = async (file: File): Promise<string> => {
        const pdfjsLib = await import('pdfjs-dist');

        // Use unpkg CDN which is more reliable, pin to a specific version
        // that matches the installed pdfjs-dist version
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        } catch {
            // Fallback: try legacy worker path
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
        }

        const arrayBuffer = await file.arrayBuffer();

        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n\n';
            }

            return fullText.trim();
        } catch (pdfError: any) {
            // If worker fails, try without worker (slower but works)
            console.warn('PDF worker failed, trying without worker:', pdfError);
            throw new Error(`Error al procesar PDF: ${pdfError.message || 'Formato no soportado'}`);
        }
    };

    const extractTextFromDOCX = async (file: File): Promise<string> => {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    };

    const processFile = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            let extractedText = '';
            const extension = selectedFile.name.split('.').pop()?.toLowerCase();

            if (extension === 'pdf') {
                extractedText = await extractTextFromPDF(selectedFile);
            } else if (extension === 'docx') {
                extractedText = await extractTextFromDOCX(selectedFile);
            } else if (extension === 'doc') {
                // Old .doc format is not supported - mammoth only works with .docx
                throw new Error(
                    'El formato .doc (Word 97-2003) no es compatible. ' +
                    'Por favor, abre el archivo en Word y guárdalo como .docx (Word moderno).'
                );
            }

            if (!extractedText.trim()) {
                throw new Error('No se pudo extraer texto del documento');
            }

            onTextExtracted(extractedText, selectedFile.name);
            handleClose();
        } catch (err) {
            console.error('Error processing file:', err);
            setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setError(null);
        setIsDragging(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-cream-100 rounded-xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300">
                    <div className="flex items-center gap-3">
                        <Upload className="w-6 h-6 text-accent-brown" />
                        <h2 className="font-serif text-xl font-semibold text-charcoal-900">
                            Subir Documento
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
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
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-charcoal-900">{selectedFile.name}</p>
                                    <p className="text-sm text-charcoal-500">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center">
                                    <File className="w-8 h-8 text-accent-brown" />
                                </div>
                                <div>
                                    <p className="font-medium text-charcoal-900">
                                        Arrastra tu archivo PDF o Word
                                    </p>
                                    <p className="text-sm text-charcoal-500 mt-1">
                                        o haz clic para seleccionar
                                    </p>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">.pdf</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">.docx</span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded line-through">.doc</span>
                                </div>
                                <p className="text-xs text-charcoal-400 mt-1">
                                    Word 97-2003 (.doc) requiere conversión a .docx
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Info */}
                    <p className="mt-4 text-xs text-charcoal-500 text-center">
                        El contenido del documento será analizado por la IA para responder tu consulta
                    </p>
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
                        onClick={processFile}
                        disabled={!selectedFile || isProcessing}
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
                                <Upload className="w-4 h-4" />
                                Adjuntar Documento
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
