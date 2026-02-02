'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2, FileText, Scale, Gavel, BookOpen, Copy, Check } from 'lucide-react';

interface TextEnhanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEnhance: (text: string, docType: string) => Promise<string>;
}

const DOCUMENT_TYPES = [
    { value: 'demanda', label: 'Demanda', icon: FileText },
    { value: 'amparo', label: 'Amparo', icon: Scale },
    { value: 'impugnacion', label: 'Impugnación', icon: Gavel },
    { value: 'contestacion', label: 'Contestación', icon: BookOpen },
    { value: 'contrato', label: 'Contrato', icon: FileText },
    { value: 'otro', label: 'Otro', icon: FileText },
];

export default function TextEnhanceModal({ isOpen, onClose, onEnhance }: TextEnhanceModalProps) {
    const [inputText, setInputText] = useState('');
    const [docType, setDocType] = useState('demanda');
    const [enhancedText, setEnhancedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleEnhance = async () => {
        if (!inputText.trim()) return;

        setIsProcessing(true);
        setError(null);
        setEnhancedText('');

        try {
            const result = await onEnhance(inputText, docType);
            setEnhancedText(result);
        } catch (err) {
            console.error('Error enhancing text:', err);
            setError(err instanceof Error ? err.message : 'Error al mejorar el texto');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = async () => {
        if (!enhancedText) return;

        try {
            await navigator.clipboard.writeText(enhancedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error copying:', err);
        }
    };

    const handleClose = () => {
        setInputText('');
        setEnhancedText('');
        setError(null);
        setDocType('demanda');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-cream-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-accent-gold" />
                        <h2 className="font-serif text-xl font-semibold text-charcoal-900">
                            Mejorar Texto Legal
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
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Input Section */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                    Tipo de documento
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DOCUMENT_TYPES.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => setDocType(type.value)}
                                                className={`
                                                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                                                    transition-all duration-200
                                                    ${docType === type.value
                                                        ? 'bg-accent-brown text-white'
                                                        : 'bg-cream-200 text-charcoal-700 hover:bg-cream-300'
                                                    }
                                                `}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {type.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                    Copia aquí tu texto legal a mejorar
                                </label>
                                <p className="text-xs text-charcoal-500 mb-2">
                                    Demanda, impugnación, amparo, contestación, etc.
                                </p>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Pega aquí el texto de tu documento legal..."
                                    disabled={isProcessing}
                                    className="w-full h-64 p-4 bg-white border border-cream-300 rounded-lg
                                             text-charcoal-900 placeholder:text-gray-400 resize-none
                                             focus:outline-none focus:ring-2 focus:ring-accent-gold/50
                                             disabled:opacity-50"
                                />
                                <p className="text-xs text-charcoal-500 mt-2 text-right">
                                    {inputText.length} caracteres
                                </p>
                            </div>

                            <button
                                onClick={handleEnhance}
                                disabled={!inputText.trim() || isProcessing}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                         bg-gradient-to-r from-accent-brown to-accent-gold text-white 
                                         rounded-lg font-medium hover:opacity-90 transition-opacity
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Mejorando con IA...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Mejorar con IA
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Output Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-charcoal-700">
                                    Texto mejorado
                                </label>
                                {enhancedText && (
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1 text-sm text-accent-brown hover:text-accent-gold transition-colors"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copiar
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className={`
                                w-full h-80 p-4 bg-white border border-cream-300 rounded-lg overflow-y-auto
                                ${!enhancedText && !isProcessing && !error ? 'flex items-center justify-center' : ''}
                            `}>
                                {isProcessing ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-accent-brown" />
                                        <p className="text-charcoal-600">Buscando artículos y jurisprudencia relevante...</p>
                                    </div>
                                ) : error ? (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                        {error}
                                    </div>
                                ) : enhancedText ? (
                                    <div className="prose prose-sm max-w-none text-charcoal-800 whitespace-pre-wrap">
                                        {enhancedText}
                                    </div>
                                ) : (
                                    <p className="text-charcoal-400 text-center">
                                        El texto mejorado aparecerá aquí con artículos y jurisprudencia integrados
                                    </p>
                                )}
                            </div>

                            {enhancedText && (
                                <p className="text-xs text-charcoal-500">
                                    💡 El texto incluye referencias a artículos y jurisprudencia de la base de datos
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-cream-300 flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-charcoal-600 hover:text-charcoal-900 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
