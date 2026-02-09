'use client';

import { useState, useEffect } from 'react';
import { MapPin, Paperclip, Search, FileEdit, Gavel, ArrowRight, ChevronDown, Users, Scale, Shield } from 'lucide-react';

type Step = 'chat' | 'upload' | 'draft';

export default function HomeDemo() {
    const [step, setStep] = useState<Step>('chat');
    const [query, setQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedState, setSelectedState] = useState('CIUDAD_DE_MEXICO');
    const [isTyping, setIsTyping] = useState(false);
    const [showResponse, setShowResponse] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeButton, setActiveButton] = useState<'upload' | 'search' | 'draft' | 'sentencia' | null>('search');

    useEffect(() => {
        let isMounted = true;
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const typeText = async (text: string, setter: (s: string) => void, speed = 50) => {
            setter('');
            for (let i = 0; i <= text.length; i++) {
                if (!isMounted) return;
                setter(text.slice(0, i));
                await wait(speed + Math.random() * 20);
            }
        };

        const runSequence = async () => {
            if (!isMounted) return;

            // ====================================
            // ESCENARIO 1: CHAT + JURISDICCIÓN
            // Simula una consulta básica con selector de estado
            // ====================================
            setStep('chat');
            setQuery('');
            setShowResponse(false);
            setActiveButton('search');
            setShowDropdown(false);

            await wait(1000);

            // Mostrar selector de jurisdicción
            if (!isMounted) return;
            setShowDropdown(true);
            await wait(1500);

            // Seleccionar estado
            if (!isMounted) return;
            setSelectedState('NUEVO_LEON');
            setActiveButton('search');
            setShowDropdown(false);
            await wait(800);

            // Usuario escribe consulta
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("¿Cuáles son las causales de divorcio en Nuevo León?", setQuery);
            setIsTyping(false);
            await wait(600);

            // Mostrar respuesta
            if (!isMounted) return;
            setShowResponse(true);
            await wait(5000);

            // ====================================
            // ESCENARIO 2: ANÁLISIS DE DOCUMENTO
            // Simula carga de archivo
            // ====================================
            if (!isMounted) return;
            setStep('upload');
            setQuery('');
            setShowResponse(false);
            setActiveButton('upload');
            setUploadProgress(0);

            await wait(1000);

            // Simular carga
            if (!isMounted) return;
            for (let i = 0; i <= 100; i += 10) {
                if (!isMounted) return;
                setUploadProgress(i);
                await wait(150);
            }

            await wait(800);

            // Análisis completado
            if (!isMounted) return;
            setShowResponse(true);
            await wait(5000);

            // ====================================
            // ESCENARIO 3: REDACCIÓN
            // Simula creación de demanda
            // ====================================
            if (!isMounted) return;
            setStep('draft');
            setQuery('');
            setShowResponse(false);
            setActiveButton('draft');
            setUploadProgress(0);

            await wait(1000);

            // Usuario escribe solicitud
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Redactar demanda de divorcio necesario", setQuery);
            setIsTyping(false);
            await wait(800);

            // Mostrar resultado
            if (!isMounted) return;
            setShowResponse(true);
            await wait(5000);

            // Loop
            if (isMounted) runSequence();
        };

        runSequence();
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header - Logo & Estado */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-cream-50">
                <h3 className="font-serif text-xl font-bold">Iurex<span className="text-accent-gold">ia</span></h3>

                {/* Jurisdiction Selector - Réplica exacta */}
                <div className="relative">
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-sm font-medium text-charcoal-700"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <MapPin className="w-4 h-4 text-accent-gold" />
                        <span>{selectedState === 'CIUDAD_DE_MEXICO' ? 'Ciudad de México' : 'Nuevo León'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2 space-y-1">
                                <DropdownItem label="Ciudad de México" active={selectedState === 'CIUDAD_DE_MEXICO'} />
                                <DropdownItem label="Nuevo León" active={selectedState === 'NUEVO_LEON'} />
                                <DropdownItem label="Jalisco" />
                            </div>
                        </div>
                    )
                    }
                </div >
            </div >

            {/* Main Chat Area */}
            < div className="h-[450px] relative bg-white" >

                {/* === CHAT SCENARIO === */}
                < div className={`absolute inset-0 p-6 transition-opacity duration-500 ${step === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="max-w-2xl mx-auto space-y-6">

                        {/* User Query (if typed) */}
                        {query && (
                            <div className="flex justify-end">
                                <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                    <p className="text-charcoal-900">{query}</p>
                                </div>
                            </div>
                        )}

                        {/* AI Response */}
                        {showResponse && (
                            <div className={`transition-all duration-700 ${showResponse ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <div className="bg-cream-100 border border-cream-300 rounded-2xl p-5 shadow-md">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Scale className="w-4 h-4 text-accent-gold" />
                                        <span className="text-xs font-bold text-accent-gold uppercase tracking-wider">Iurexia AI</span>
                                    </div>
                                    <p className="text-charcoal-800 mb-4 leading-relaxed">
                                        En <strong>Nuevo León</strong>, las causales de divorcio necesario están reguladas en el <strong>Código Civil del Estado</strong>.
                                    </p>
                                    <div className="bg-white border-l-4 border-accent-gold p-4 rounded text-sm">
                                        <p className="font-semibold text-charcoal-900 mb-1">Artículo 267</p>
                                        <p className="text-charcoal-600 italic">
                                            "Son causas de divorcio necesario: adulterio, violencia familiar, abandono del hogar conyugal..."
                                        </p>
                                        <span className="text-[10px] text-charcoal-400 font-mono mt-2 block">[Doc ID: CCE-NL-2024]</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div >

                {/* === UPLOAD SCENARIO === */}
                < div className={`absolute inset-0 p-6 flex items-center justify-center transition-opacity duration-500 ${step === 'upload' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="w-full max-w-md">
                        {!showResponse ? (
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                                    <Paperclip className="w-8 h-8 text-blue-500" />
                                </div>
                                <p className="font-medium text-charcoal-900 mb-2">Contestación_Demanda.pdf</p>
                                <p className="text-sm text-charcoal-500 mb-4">Subiendo y analizando documento...</p>

                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-charcoal-400 mt-2">{uploadProgress}%</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
                                    <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-charcoal-900">Análisis Completado</h4>
                                        <p className="text-xs text-charcoal-500">3 fortalezas · 2 debilidades detectadas</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                                        <div>
                                            <p className="text-sm font-semibold text-red-800">Falta Fundamentar Competencia</p>
                                            <p className="text-xs text-red-600">No se acredita la competencia territorial del juzgado.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                                        <div>
                                            <p className="text-sm font-semibold text-green-800">Bien Fundadas las Excepciones</p>
                                            <p className="text-xs text-green-600">Cita correcta de jurisprudencia aplicable.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div >

                {/* === DRAFT SCENARIO === */}
                < div className={`absolute inset-0 p-6 flex items-center justify-center transition-opacity duration-500 ${step === 'draft' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="w-full max-w-2xl">
                        {!showResponse ? (
                            <div className="flex justify-end mb-6">
                                <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                    <p className="text-charcoal-900">{query}</p>
                                    {isTyping && <span className="inline-block w-1 h-4 ml-1 bg-charcoal-400 animate-pulse"></span>}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-cream-100 border border-cream-300 rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-400">
                                    <div className="flex items-center gap-2">
                                        <FileEdit className="w-4 h-4 text-accent-gold" />
                                        <span className="text-xs font-bold text-accent-gold uppercase tracking-wider">Demanda Generada</span>
                                    </div>
                                    <span className="text-xs text-charcoal-500">4 páginas</span>
                                </div>

                                <div className="space-y-4 text-sm text-charcoal-800">
                                    <div>
                                        <p className="font-bold text-charcoal-900 mb-1">C. JUEZ FAMILIAR EN TURNO</p>
                                        <p className="text-charcoal-700">PRESENTE</p>
                                    </div>

                                    <p className="leading-relaxed">
                                        <strong>MARÍA GONZÁLEZ LÓPEZ</strong>, mexicana, mayor de edad, con domicilio en...
                                        vengo a promover <strong>JUICIO DE DIVORCIO NECESARIO</strong> en contra de...
                                    </p>

                                    <div className="bg-white border-l-4 border-accent-gold p-3 rounded text-xs">
                                        <p className="font-semibold mb-1">PRESTACIONES</p>
                                        <ul className="list-disc list-inside space-y-1 text-charcoal-600">
                                            <li>La disolución del vínculo matrimonial</li>
                                            <li>La custodia de los menores</li>
                                            <li>Pensión alimenticia</li>
                                        </ul>
                                    </div>

                                    <button className="w-full py-2 bg-charcoal-900 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-800 transition-colors">
                                        Descargar Documento Completo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </div >

            {/* ChatInput Footer - Réplica exacta de la interfaz real */}
            < div className="p-4 border-t border-gray-100 bg-white" >
                <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                        <p className="text-gray-400 text-sm">Escribe tu consulta legal o sube tu documento para análisis</p>
                    </div>
                    <button className="bg-charcoal-900 text-white p-3 rounded-lg hover:bg-charcoal-800 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Action Buttons Row - Réplica exacta */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 flex-wrap">
                        <ActionButton icon={Paperclip} label="Subir documento" active={activeButton === 'upload'} />
                        <ActionButton icon={Search} label="Buscar" active={activeButton === 'search'} />
                        <ActionButton icon={FileEdit} label="Redactar" active={activeButton === 'draft'} />
                        <ActionButton icon={Gavel} label="Revisar Sentencia" active={activeButton === 'sentencia'} />
                    </div>
                </div>

                {/* Connect Badge - Réplica exacta */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 cursor-pointer hover:border-blue-200 transition-all">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-charcoal-600">
                            Busca un abogado especializado en tu zona
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide ml-auto">
                            Nuevo
                        </span>
                    </div>
                </div>
            </div >

            {/* Progress Bar */}
            < div className="h-1 bg-gray-100 relative overflow-hidden" >
                <div
                    className="absolute top-0 left-0 h-full bg-accent-gold transition-all duration-[6000ms] ease-linear"
                    style={{ width: step === 'chat' ? '33%' : step === 'upload' ? '66%' : '100%' }}
                />
            </div >
        </div >
    );
}

function ActionButton({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
    return (
        <button
            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${active
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

function DropdownItem({ label, active = false }: { label: string, active?: boolean }) {
    return (
        <button
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${active
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-charcoal-700 hover:bg-gray-50'
                }`}
        >
            {label}
        </button>
    );
}
