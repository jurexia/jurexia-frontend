'use client';

import React, { useState } from 'react';
import { X, FileEdit, Scale, Gavel, Users, Briefcase, Home, ShoppingCart, FileText, Shield, Mail, Building, UserCheck, Scroll, Landmark, BookOpen, AlertTriangle, ArrowUpDown, RotateCcw, HelpCircle, Eye, Wheat } from 'lucide-react';

interface DraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDraft: (draftRequest: DraftRequest) => void;
    estado?: string;
}

export interface DraftRequest {
    tipo: 'contrato' | 'demanda' | 'amparo' | 'impugnacion' | 'peticion_oficio';
    subtipo: string;
    estado: string;
    descripcion: string;
}

const DOCUMENT_TYPES = {
    contrato: {
        icon: FileEdit,
        label: 'Contrato',
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
        subtipos: [
            { value: 'civil', label: 'Civil', icon: Scale },
            { value: 'familiar', label: 'Familiar', icon: Users },
            { value: 'laboral', label: 'Laboral', icon: Briefcase },
            { value: 'mercantil', label: 'Oral Mercantil', icon: ShoppingCart },
            { value: 'agrario', label: 'Agrario', icon: Wheat },
        ]
    },
    amparo: {
        icon: Shield,
        label: 'Amparo',
        subtipos: [
            { value: 'amparo_indirecto', label: 'Amparo Indirecto', icon: Shield },
            { value: 'amparo_directo', label: 'Amparo Directo', icon: Landmark },
        ]
    },
    impugnacion: {
        icon: Gavel,
        label: 'Impugnación',
        subtipos: [
            { value: 'apelacion', label: 'Recurso de Apelación', icon: ArrowUpDown },
            { value: 'revocacion', label: 'Recurso de Revocación', icon: RotateCcw },
            { value: 'queja', label: 'Recurso de Queja', icon: HelpCircle },
            { value: 'revision', label: 'Recurso de Revisión', icon: Eye },
            { value: 'agravio', label: 'Concepto de Violación / Agravio', icon: AlertTriangle },
        ]
    },
    peticion_oficio: {
        icon: Mail,
        label: 'Petición u Oficio',
        subtipos: [
            { value: 'peticion_ciudadana', label: 'Petición de ciudadano', icon: UserCheck },
            { value: 'oficio_autoridad', label: 'Oficio entre autoridades', icon: Building },
            { value: 'respuesta_peticion', label: 'Respuesta a petición', icon: Mail },
        ]
    }
};

export default function DraftModal({ isOpen, onClose, onDraft, estado = 'FEDERAL' }: DraftModalProps) {
    const [selectedType, setSelectedType] = useState<'contrato' | 'demanda' | 'amparo' | 'impugnacion' | 'peticion_oficio' | null>(null);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-charcoal-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-charcoal-700/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-700/50 bg-gradient-to-r from-charcoal-900 to-charcoal-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-gold/20 to-accent-brown/20 flex items-center justify-center border border-accent-gold/30">
                            <FileEdit className="w-5 h-5 text-accent-gold" />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-cream-100">
                                Redactar Documento Legal
                            </h2>
                            <p className="text-sm text-charcoal-400">
                                Genera documentos legales completos con fundamento
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-charcoal-400 hover:text-cream-100 hover:bg-charcoal-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-charcoal-900">
                    {/* Step 1: Document Type */}
                    <div>
                        <label className="block text-sm font-medium text-accent-gold/80 mb-3 tracking-wide uppercase">
                            1. Tipo de documento
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                                        className={`p-3 rounded-xl border transition-all text-center group
                                            ${isSelected
                                                ? 'border-accent-gold bg-gradient-to-br from-accent-gold/15 to-accent-brown/10 text-accent-gold shadow-lg shadow-accent-gold/10'
                                                : 'border-charcoal-600 hover:border-accent-gold/50 text-cream-300 hover:text-cream-100 bg-charcoal-700/60 hover:bg-charcoal-700'
                                            }`}
                                    >
                                        <Icon className={`w-7 h-7 mx-auto mb-1.5 transition-transform group-hover:scale-110 ${isSelected ? 'text-accent-gold' : 'text-cream-200'}`} />
                                        <span className="font-medium text-xs">{config.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Subtype */}
                    {selectedType && currentTypeConfig && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-medium text-accent-gold/80 mb-3 tracking-wide uppercase">
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
                                            className={`p-3 rounded-xl border transition-all text-left flex items-center gap-3 group
                                                ${isSelected
                                                    ? 'border-accent-gold bg-gradient-to-r from-accent-gold/15 to-accent-brown/10 text-accent-gold'
                                                    : 'border-charcoal-600 hover:border-accent-gold/50 text-cream-300 hover:text-cream-100 bg-charcoal-700/60 hover:bg-charcoal-700'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isSelected ? 'text-accent-gold' : 'text-cream-200'}`} />
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
                            <label className="block text-sm font-medium text-accent-gold/80 mb-3 tracking-wide uppercase">
                                3. Jurisdicción
                            </label>
                            <select
                                value={selectedEstado}
                                onChange={(e) => setSelectedEstado(e.target.value)}
                                className="w-full p-3 border border-charcoal-700 rounded-xl bg-charcoal-800 text-cream-100 focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold transition-colors"
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
                            <label className="block text-sm font-medium text-accent-gold/80 mb-3 tracking-wide uppercase">
                                4. Describe el caso o proporciona los datos
                            </label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder={getPlaceholder(selectedType, selectedSubtipo)}
                                rows={6}
                                className="w-full p-4 border border-charcoal-700 rounded-xl bg-charcoal-800 text-cream-100 placeholder:text-charcoal-500 focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold resize-none transition-colors"
                            />
                            <p className="text-xs text-charcoal-500 mt-2">
                                💡 Entre más detalles proporciones, mejor será el documento generado.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-charcoal-700/50 bg-charcoal-800/80 flex items-center justify-between">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-charcoal-400 hover:text-cream-100 font-medium transition-colors rounded-lg hover:bg-charcoal-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedType || !selectedSubtipo || !descripcion.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-charcoal-700 to-charcoal-800 text-accent-gold font-medium rounded-xl border border-accent-gold/30 hover:border-accent-gold hover:from-accent-gold/20 hover:to-accent-brown/20 hover:shadow-lg hover:shadow-accent-gold/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-accent-gold/30 disabled:hover:shadow-none flex items-center gap-2"
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
            familiar: 'Ejemplo: Demanda de divorcio incausado. Actor: María García solicita disolución del vínculo matrimonial. Bienes a liquidar, hijos menores, pensión alimenticia.',
            laboral: 'Ejemplo: Demanda por despido injustificado. Actor: trabajador con 5 años de antigüedad, salario diario de $500. Fecha de despido: 15 de enero 2024.',
            mercantil: 'Ejemplo: Demanda ejecutiva mercantil por pagaré vencido. Monto: $150,000 más intereses moratorios. O juicio oral mercantil por incumplimiento contractual.',
            agrario: 'Ejemplo: Demanda agraria ante Tribunal Unitario Agrario. Describe el ejido, parcela, conflicto de tierras o derechos agrarios en disputa.',
        },
        amparo: {
            amparo_indirecto: 'Describe el acto reclamado (ley, reglamento, acto de autoridad administrativa, auto judicial), la autoridad responsable, y los derechos fundamentales violados. Ejemplo: Amparo contra orden de clausura de negocio sin audiencia previa.',
            amparo_directo: 'Describe la sentencia definitiva o laudo que impugnas, el tribunal que la dictó, y los conceptos de violación (errores de fondo y/o procedimiento). Ejemplo: Amparo directo contra sentencia de segunda instancia que confirmó condena en juicio civil.',
        },
        impugnacion: {
            apelacion: 'Describe la resolución apelada (sentencia definitiva o interlocutoria), el juzgado que la dictó, y los agravios que te causa. Ejemplo: Apelación contra sentencia que desestimó la demanda por falta de pruebas.',
            revocacion: 'Describe el auto o decreto que impugnas y por qué debe revocarse. Ejemplo: Impugnar auto que negó admisión de prueba pericial.',
            queja: 'Describe el acto procesal contra el que se queja (exceso o defecto en ejecución, denegación de apelación). Ejemplo: Queja contra juez que no admitió recurso de apelación.',
            revision: 'Describe la resolución de amparo que se revisa y los agravios. Ejemplo: Revisión contra sentencia de Juzgado de Distrito que negó el amparo.',
            agravio: 'Describe la resolución impugnada y construye el agravio: qué se resolvió, qué norma se viola, cómo se viola, y qué perjuicio causa.',
        },
        peticion_oficio: {
            peticion_ciudadana: 'Describe qué solicitas a la autoridad, con qué fundamento y qué resultado esperas. Ej: "Solicito al IMSS copia certificada de mi expediente clínico con fundamento en la Ley de Transparencia"',
            oficio_autoridad: 'Describe qué comunicación requieres entre autoridades, el contexto y el propósito. Ej: "Oficio del Juzgado al Registro Público solicitando inscripción de embargo"',
            respuesta_peticion: 'Describe la petición recibida, qué solicitó el ciudadano, y cuál será el sentido de la respuesta (procedente/improcedente y por qué)',
        }
    };

    return placeholders[tipo || '']?.[subtipo] || 'Describe los detalles del documento que deseas generar...';
}
