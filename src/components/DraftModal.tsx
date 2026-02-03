'use client';

import React, { useState } from 'react';
import { X, FileEdit, Scale, Gavel, Users, Briefcase, Home, ShoppingCart, FileText, MessageSquare, Shield, Globe, Sparkles, AlertTriangle, Mail, Building, UserCheck } from 'lucide-react';

interface DraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDraft: (draftRequest: DraftRequest) => void;
    estado?: string;
}

export interface DraftRequest {
    tipo: 'contrato' | 'demanda' | 'argumentacion' | 'peticion_oficio';
    subtipo: string;
    estado: string;
    descripcion: string;
}

const DOCUMENT_TYPES = {
    contrato: {
        icon: FileEdit,
        label: 'Contrato',
        color: 'blue',
        subtipos: [
            { value: 'arrendamiento', label: 'Arrendamiento', icon: Home },
            { value: 'compraventa', label: 'Compraventa', icon: ShoppingCart },
            { value: 'prestacion_servicios', label: 'Prestación de Servicios', icon: Briefcase },
            { value: 'comodato', label: 'Comodato', icon: Home },
            { value: 'mutuo', label: 'Mutuo (Préstamo)', icon: FileText },
        ]
    },
    demanda: {
        icon: Scale,
        label: 'Demanda',
        color: 'amber',
        subtipos: [
            { value: 'civil', label: 'Civil', icon: Scale },
            { value: 'familiar', label: 'Familiar', icon: Users },
            { value: 'laboral', label: 'Laboral', icon: Briefcase },
            { value: 'amparo', label: 'Demanda de Amparo', icon: Gavel },
            { value: 'mercantil', label: 'Mercantil', icon: ShoppingCart },
        ]
    },
    argumentacion: {
        icon: MessageSquare,
        label: 'Argumentación Jurídica',
        color: 'purple',
        subtipos: [
            { value: 'ilegalidad', label: 'Ilegalidad de acto', icon: AlertTriangle },
            { value: 'inconstitucionalidad', label: 'Inconstitucionalidad', icon: Shield },
            { value: 'inconvencionalidad', label: 'Inconvencionalidad', icon: Globe },
            { value: 'fortalecer_posicion', label: 'Fortalecer posición', icon: Sparkles },
            { value: 'agravio', label: 'Construir agravio', icon: Gavel },
        ]
    },
    peticion_oficio: {
        icon: Mail,
        label: 'Petición u Oficio',
        color: 'green',
        subtipos: [
            { value: 'peticion_ciudadana', label: 'Petición de ciudadano', icon: UserCheck },
            { value: 'oficio_autoridad', label: 'Oficio entre autoridades', icon: Building },
            { value: 'respuesta_peticion', label: 'Respuesta a petición', icon: Mail },
        ]
    }
};

export default function DraftModal({ isOpen, onClose, onDraft, estado = 'FEDERAL' }: DraftModalProps) {
    const [selectedType, setSelectedType] = useState<'contrato' | 'demanda' | 'argumentacion' | 'peticion_oficio' | null>(null);
    const [selectedSubtipo, setSelectedSubtipo] = useState<string>('');
    const [descripcion, setDescripcion] = useState('');
    const [selectedEstado, setSelectedEstado] = useState(estado);

    const handleSubmit = () => {
        if (!selectedType || !selectedSubtipo || !descripcion.trim()) return;

        onDraft({
            tipo: selectedType,
            subtipo: selectedSubtipo,
            estado: selectedEstado,
            descripcion: descripcion.trim()
        });

        // Reset state
        setSelectedType(null);
        setSelectedSubtipo('');
        setDescripcion('');
        onClose();
    };

    const handleClose = () => {
        setSelectedType(null);
        setSelectedSubtipo('');
        setDescripcion('');
        onClose();
    };

    if (!isOpen) return null;

    const currentTypeConfig = selectedType ? DOCUMENT_TYPES[selectedType] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-cream-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300 bg-cream-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-brown/10 flex items-center justify-center">
                            <FileEdit className="w-5 h-5 text-accent-brown" />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-charcoal-900">
                                Redactar Documento Legal
                            </h2>
                            <p className="text-sm text-charcoal-500">
                                Genera documentos legales completos con fundamento
                            </p>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Document Type */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-3">
                            1. Tipo de documento
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {(Object.keys(DOCUMENT_TYPES) as Array<keyof typeof DOCUMENT_TYPES>).map((type) => {
                                const config = DOCUMENT_TYPES[type];
                                const Icon = config.icon;
                                const isSelected = selectedType === type;

                                return (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setSelectedType(type);
                                            setSelectedSubtipo('');
                                        }}
                                        className={`p-4 rounded-lg border-2 transition-all text-center
                                            ${isSelected
                                                ? 'border-accent-brown bg-accent-brown/10 text-accent-brown'
                                                : 'border-cream-300 hover:border-charcoal-400 text-charcoal-600 hover:text-charcoal-900'
                                            }`}
                                    >
                                        <Icon className="w-8 h-8 mx-auto mb-2" />
                                        <span className="font-medium">{config.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Subtype */}
                    {selectedType && currentTypeConfig && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-medium text-charcoal-700 mb-3">
                                2. Subtipo de {currentTypeConfig.label.toLowerCase()}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {currentTypeConfig.subtipos.map((subtipo) => {
                                    const Icon = subtipo.icon;
                                    const isSelected = selectedSubtipo === subtipo.value;

                                    return (
                                        <button
                                            key={subtipo.value}
                                            onClick={() => setSelectedSubtipo(subtipo.value)}
                                            className={`p-3 rounded-lg border transition-all text-left flex items-center gap-3
                                                ${isSelected
                                                    ? 'border-accent-brown bg-accent-brown/10 text-accent-brown'
                                                    : 'border-cream-300 hover:border-charcoal-400 text-charcoal-600 hover:text-charcoal-900'
                                                }`}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span className="font-medium text-sm">{subtipo.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Jurisdicción */}
                    {selectedSubtipo && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-medium text-charcoal-700 mb-3">
                                3. Jurisdicción
                            </label>
                            <select
                                value={selectedEstado}
                                onChange={(e) => setSelectedEstado(e.target.value)}
                                className="w-full p-3 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-accent-brown focus:border-accent-brown"
                                size={1}
                            >
                                <option value="FEDERAL">Federal (Aplica en todo México)</option>
                                <option value="AGUASCALIENTES">Aguascalientes</option>
                                <option value="BAJA_CALIFORNIA">Baja California</option>
                                <option value="BAJA_CALIFORNIA_SUR">Baja California Sur</option>
                                <option value="CAMPECHE">Campeche</option>
                                <option value="CHIAPAS">Chiapas</option>
                                <option value="CHIHUAHUA">Chihuahua</option>
                                <option value="COAHUILA">Coahuila</option>
                                <option value="COLIMA">Colima</option>
                                <option value="CDMX">Ciudad de México</option>
                                <option value="DURANGO">Durango</option>
                                <option value="ESTADO_DE_MEXICO">Estado de México</option>
                                <option value="GUANAJUATO">Guanajuato</option>
                                <option value="GUERRERO">Guerrero</option>
                                <option value="HIDALGO">Hidalgo</option>
                                <option value="JALISCO">Jalisco</option>
                                <option value="MICHOACAN">Michoacán</option>
                                <option value="MORELOS">Morelos</option>
                                <option value="NAYARIT">Nayarit</option>
                                <option value="NUEVO_LEON">Nuevo León</option>
                                <option value="OAXACA">Oaxaca</option>
                                <option value="PUEBLA">Puebla</option>
                                <option value="QUERETARO">Querétaro</option>
                                <option value="QUINTANA_ROO">Quintana Roo</option>
                                <option value="SAN_LUIS_POTOSI">San Luis Potosí</option>
                                <option value="SINALOA">Sinaloa</option>
                                <option value="SONORA">Sonora</option>
                                <option value="TABASCO">Tabasco</option>
                                <option value="TAMAULIPAS">Tamaulipas</option>
                                <option value="TLAXCALA">Tlaxcala</option>
                                <option value="VERACRUZ">Veracruz</option>
                                <option value="YUCATAN">Yucatán</option>
                                <option value="ZACATECAS">Zacatecas</option>
                            </select>
                        </div>
                    )}

                    {/* Step 4: Descripción del caso */}
                    {selectedSubtipo && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-medium text-charcoal-700 mb-3">
                                4. Describe el caso o proporciona los datos
                            </label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder={getPlaceholder(selectedType, selectedSubtipo)}
                                rows={6}
                                className="w-full p-4 border border-cream-300 rounded-lg bg-white text-charcoal-900 placeholder:text-charcoal-400 focus:ring-2 focus:ring-accent-brown focus:border-accent-brown resize-none"
                            />
                            <p className="text-xs text-charcoal-500 mt-2">
                                💡 Entre más detalles proporciones, mejor será el documento generado.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-cream-300 bg-cream-50 flex items-center justify-between">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-charcoal-600 hover:text-charcoal-900 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedType || !selectedSubtipo || !descripcion.trim()}
                        className="px-6 py-2.5 bg-accent-brown text-white font-medium rounded-lg hover:bg-accent-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <FileEdit className="w-4 h-4" />
                        Generar Documento
                    </button>
                </div>
            </div>
        </div>
    );
}

function getPlaceholder(tipo: string | null, subtipo: string): string {
    const placeholders: Record<string, Record<string, string>> = {
        contrato: {
            arrendamiento: 'Ejemplo: Contrato de arrendamiento de un departamento ubicado en Calle Juárez #123, Querétaro. Arrendador: Juan Pérez. Arrendatario: María García. Renta mensual: $8,000. Plazo: 12 meses. Depósito: 2 meses.',
            compraventa: 'Ejemplo: Compraventa de vehículo Honda Civic 2020. Vendedor: Carlos López, RFC: LOCL800101. Comprador: Ana Martínez. Precio: $250,000.',
            prestacion_servicios: 'Ejemplo: Servicios de consultoría legal por 6 meses. Prestador: Despacho Legal S.C. Cliente: Empresa ABC S.A. de C.V. Honorarios: $15,000 mensuales.',
            comodato: 'Describe las partes, el bien prestado, plazo y condiciones de uso gratuito.',
            mutuo: 'Describe las partes, monto del préstamo, tasa de interés (si aplica), plazo y forma de pago.',
        },
        demanda: {
            civil: 'Ejemplo: Demanda civil por incumplimiento de contrato. Actor: Juan Pérez demanda a María García por falta de pago de renta acumulada de $24,000 correspondiente a 3 meses.',
            familiar: 'Ejemplo: Demanda de divorcio incausado. Actor: María García solicita disolución del vínculo matrimonial con Juan Pérez. Bienes a liquidar, hijos menores, pensión alimenticia.',
            laboral: 'Ejemplo: Demanda por despido injustificado. Actor: trabajador con 5 años de antigüedad, salario diario de $500. Fecha de despido: 15 de enero 2024.',
            amparo: 'Describe el acto reclamado (qué acto de autoridad te afecta), la autoridad responsable, los derechos fundamentales violados y por qué debe concederse el amparo. El sistema determinará si es amparo directo o indirecto según el tipo de acto.',
            mercantil: 'Ejemplo: Demanda ejecutiva mercantil por pagaré vencido. Monto: $150,000 más intereses moratorios.',
        },
        argumentacion: {
            ilegalidad: 'Describe el acto, resolución o situación que consideras ILEGAL. Explica qué norma crees que viola y cuál es el contexto. Ej: "La autoridad fiscal me embargó sin notificación previa, ¿por qué es ilegal?"',
            inconstitucionalidad: 'Describe el artículo, ley o acto que consideras INCONSTITUCIONAL. Explica qué derecho fundamental crees vulnerado. Ej: "El artículo X de la ley Y viola el derecho de audiencia porque..."',
            inconvencionalidad: 'Describe el acto o norma que viola TRATADOS INTERNACIONALES (CADH, PIDCP, etc). Ej: "La detención prolongada sin control judicial viola el artículo 7.5 de la CADH porque..."',
            fortalecer_posicion: 'Describe tu posición jurídica y qué quieres demostrar o defender. Ej: "Soy arrendador y el inquilino no paga desde hace 6 meses, quiero argumentar que procede el desahucio inmediato"',
            agravio: 'Describe la resolución impugnada y por qué te causa perjuicio. Ej: "El juez desechó mi demanda por falta de legitimación, pero sí tengo interés jurídico porque..."',
        },
        peticion_oficio: {
            peticion_ciudadana: 'Describe qué solicitas a la autoridad, con qué fundamento y qué resultado esperas. Ej: "Solicito al IMSS copia certificada de mi expediente clínico con fundamento en la Ley de Transparencia"',
            oficio_autoridad: 'Describe qué comunicación requieres entre autoridades, el contexto y el propósito. Ej: "Oficio del Juzgado al Registro Público solicitando inscripción de embargo"',
            respuesta_peticion: 'Describe la petición recibida, qué solicitó el ciudadano, y cuál será el sentido de la respuesta (procedente/improcedente y por qué)',
        }
    };

    return placeholders[tipo || '']?.[subtipo] || 'Describe los detalles del documento que deseas generar...';
}
