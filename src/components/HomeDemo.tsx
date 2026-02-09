'use client';

import { useState, useEffect } from 'react';
import { MapPin, Paperclip, Search, FileEdit, Gavel, ArrowRight, ChevronDown, Users, Scale, Shield, CheckCircle2, AlertTriangle, Star, ChevronRight, Loader2 } from 'lucide-react';

type Step = 'chat' | 'upload' | 'draft' | 'connect' | 'sentencia';
type ConnectSubStep = 'idle' | 'searching' | 'validating' | 'results';

export default function HomeDemo() {
    const [step, setStep] = useState<Step>('chat');
    const [query, setQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedState, setSelectedState] = useState('CIUDAD_DE_MEXICO');
    const [isTyping, setIsTyping] = useState(false);
    const [showResponse, setShowResponse] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeButton, setActiveButton] = useState<'upload' | 'search' | 'draft' | 'sentencia' | 'connect'>('search');
    const [connectSubStep, setConnectSubStep] = useState<ConnectSubStep>('idle');
    const [selectedLawyer, setSelectedLawyer] = useState(0);
    const [isSearching, setIsSearching] = useState(false);

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
            // ESCENARIO 1: CHAT COMPLEJO - CONCUBINATO
            // Pregunta compleja con respuesta fundada en jurisprudencia
            // ====================================
            setStep('chat');
            setQuery('');
            setShowResponse(false);
            setActiveButton('search');
            setShowDropdown(false);
            setIsSearching(false);

            await wait(1500);

            // Usuario escribe consulta compleja
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Si no me casé pero viví 3 años con mi pareja dedicada a las labores del hogar, ¿qué me corresponde reclamar del patrimonio común?", setQuery, 40);
            setIsTyping(false);
            await wait(800);

            // Mostrar "Searching..."
            if (!isMounted) return;
            setIsSearching(true);
            await wait(2000);

            // Mostrar respuesta fundada
            if (!isMounted) return;
            setIsSearching(false);
            setShowResponse(true);
            await wait(8000); // Más tiempo para leer contenido complejo

            // ====================================
            // ESCENARIO 2: ANÁLISIS DE DOCUMENTO
            // ====================================
            if (!isMounted) return;
            setStep('upload');
            setQuery('');
            setShowResponse(false);
            setActiveButton('upload');
            setUploadProgress(0);

            await wait(1000);

            // Simular carga de archivo
            if (!isMounted) return;
            for (let i = 0; i <= 100; i += 10) {
                if (!isMounted) return;
                setUploadProgress(i);
                await wait(120);
            }

            await wait(1000);

            // Mostrar análisis completo
            if (!isMounted) return;
            setShowResponse(true);
            await wait(6000);

            // ====================================
            // ESCENARIO 3: REDACCIÓN DE DOCUMENTO
            // ====================================
            if (!isMounted) return;
            setStep('draft');
            setQuery('');
            setShowResponse(false);
            setActiveButton('draft');

            await wait(1000);

            // Usuario escribe solicitud
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Redactar contestación de demanda laboral por despido injustificado", setQuery, 45);
            setIsTyping(false);
            await wait(1000);

            // Mostrar documento generado
            if (!isMounted) return;
            setShowResponse(true);
            await wait(7000);

            // ====================================
            // ESCENARIO 4: CONNECT - PROTAGONISTA ⭐
            // Este es el escenario más importante y llamativo
            // ====================================
            if (!isMounted) return;
            setStep('connect');
            setQuery('');
            setShowResponse(false);
            setActiveButton('connect');
            setConnectSubStep('idle');
            setSelectedLawyer(0);

            await wait(1500);

            // Usuario escribe búsqueda de abogado
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Necesito abogado experto en amparo contra resoluciones fiscales en Querétaro", setQuery, 45);
            setIsTyping(false);
            await wait(800);

            // Paso 1: Analizando consulta
            if (!isMounted) return;
            setConnectSubStep('searching');
            await wait(2500);

            // Paso 2: Validando cédulas SEP
            if (!isMounted) return;
            setConnectSubStep('validating');
            await wait(2500);

            // Paso 3: Mostrar resultados (3 abogados)
            if (!isMounted) return;
            setConnectSubStep('results');
            setShowResponse(true);
            await wait(3000);

            // Rotar entre abogados
            for (let i = 0; i < 3; i++) {
                if (!isMounted) return;
                setSelectedLawyer(i);
                await wait(3000);
            }

            // ====================================
            // ESCENARIO 5: REVISIÓN DE SENTENCIA
            // ====================================
            if (!isMounted) return;
            setStep('sentencia');
            setQuery('');
            setShowResponse(false);
            setActiveButton('sentencia');
            setUploadProgress(0);

            await wait(1000);

            // Simular carga
            if (!isMounted) return;
            for (let i = 0; i <= 100; i += 15) {
                if (!isMounted) return;
                setUploadProgress(i);
                await wait(100);
            }

            await wait(1000);

            // Mostrar análisis de sentencia
            if (!isMounted) return;
            setShowResponse(true);
            await wait(5000);

            // Loop
            if (isMounted) runSequence();
        };

        runSequence();
        return () => { isMounted = false; };
    }, []);

    // Progreso visual (1/5, 2/5, etc.)
    const stepNumber = { chat: 1, upload: 2, draft: 3, connect: 4, sentencia: 5 }[step];
    const stepName = { chat: 'Investigación', upload: 'Análisis', draft: 'Redacción', connect: 'Connect', sentencia: 'Revisión' }[step];

    return (
        <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header - Logo, Estado y Progress */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-cream-50 to-white">
                <div className="flex items-center gap-4">
                    <h3 className="font-serif text-xl font-bold">Iurex<span className="text-accent-gold">ia</span></h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-charcoal-600">
                        <span className="font-bold text-accent-gold">{stepNumber}/5</span>
                        <span className="text-gray-300">|</span>
                        <span>{stepName}</span>
                    </div>
                </div>

                {/* Jurisdiction Selector */}
                <div className="relative">
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-sm font-medium text-charcoal-700"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <MapPin className="w-4 h-4 text-accent-gold" />
                        <span>{selectedState === 'CIUDAD_DE_MEXICO' ? 'Ciudad de México' : selectedState === 'QUERETARO' ? 'Querétaro' : 'Nuevo León'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2 space-y-1">
                                <DropdownItem label="Ciudad de México" active={selectedState === 'CIUDAD_DE_MEXICO'} />
                                <DropdownItem label="Querétaro" active={selectedState === 'QUERETARO'} />
                                <DropdownItem label="Jalisco" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="h-[500px] relative bg-white">

                {/* === CHAT SCENARIO === */}
                <div className={`absolute inset-0 p-6 transition-opacity duration-700 ${step === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="max-w-3xl mx-auto space-y-6">

                        {/* User Query */}
                        {query && (
                            <div className="flex justify-end animate-in fade-in slide-in-from-right duration-500">
                                <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                    <p className="text-charcoal-900 leading-relaxed">{query}</p>
                                    {isTyping && <span className="inline-block w-0.5 h-4 ml-1 bg-charcoal-400 animate-pulse"></span>}
                                </div>
                            </div>
                        )}

                        {/* Searching Indicator */}
                        {isSearching && !showResponse && (
                            <div className="flex items-center gap-3 text-sm text-charcoal-500 animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin text-accent-gold" />
                                <span>Buscando en Código Civil, jurisprudencia y tesis aplicables...</span>
                            </div>
                        )}

                        {/* AI Response - Fundada en Jurisprudencia */}
                        {showResponse && (
                            <div className="animate-in fade-in slide-in-from-left duration-700">
                                <div className="bg-gradient-to-br from-cream-100 to-cream-50 border border-cream-300 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-300">
                                        <div className="flex items-center gap-2">
                                            <Scale className="w-4 h-4 text-accent-gold" />
                                            <span className="text-xs font-bold text-accent-gold uppercase tracking-wider">Iurexia AI</span>
                                        </div>
                                        <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> FUENTES VERIFICADAS
                                        </span>
                                    </div>

                                    <p className="text-charcoal-800 mb-4 leading-relaxed">
                                        <strong>De acuerdo con la jurisprudencia de la SCJN</strong>, el concubinato genera derechos patrimoniales equiparables al matrimonio cuando se cumplen ciertos requisitos.
                                    </p>

                                    {/* Cita del Código Civil CDMX */}
                                    <div className="bg-white border-l-4 border-accent-gold p-4 rounded-r-lg mb-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-charcoal-900">Artículo 291 Bis</span>
                                            <span className="text-[10px] text-charcoal-400 font-mono">[Doc ID: CC-CDMX-2024]</span>
                                        </div>
                                        <p className="text-charcoal-700 text-sm italic mb-2">
                                            "La concubina o el concubinario que haya vivido en común durante más de dos años, tendrán derecho a una pensión alimenticia y a heredar..."
                                        </p>
                                    </div>

                                    {/* Jurisprudencia */}
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-blue-900 text-sm">CONCUBINATO. DERECHOS PATRIMONIALES</span>
                                            <span className="text-[10px] text-blue-500 font-mono">[Tesis 1a. CCXVIII/2019]</span>
                                        </div>
                                        <p className="text-blue-800 text-xs leading-relaxed">
                                            La persona que dedicó su tiempo al hogar durante el concubinato tiene derecho a reclamar la mitad del patrimonio adquirido en común, aunque los bienes estén a nombre de una sola parte...
                                        </p>
                                    </div>

                                    <p className="text-charcoal-700 text-sm mt-4">
                                        En tu caso, podrías reclamar: <strong>50% de bienes muebles e inmuebles adquiridos</strong>, pensión alimenticia, y compensación por trabajo no remunerado en el hogar.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* === UPLOAD SCENARIO === */}
                <div className={`absolute inset-0 p-6 flex items-center justify-center transition-opacity duration-700 ${step === 'upload' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="w-full max-w-md">
                        {!showResponse ? (
                            <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                                    <Paperclip className="w-8 h-8 text-blue-500" />
                                </div>
                                <p className="font-medium text-charcoal-900 mb-2">Demanda_Pension_Alimenticia.pdf</p>
                                <p className="text-sm text-charcoal-500 mb-4">Analizando fortalezas y debilidades...</p>

                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 shadow-lg"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-charcoal-400 mt-2 font-mono">{uploadProgress}%</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-6 h-6 text-green-600" />
                                        <div>
                                            <h4 className="font-bold text-charcoal-900">Análisis Completado</h4>
                                            <p className="text-xs text-charcoal-500">3 fortalezas · 2 debilidades detectadas</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-green-600">7.5/10</span>
                                </div>

                                <div className="space-y-3">
                                    {/* Fortaleza */}
                                    <AnalysisItem
                                        type="success"
                                        title="Fundamentación Correcta"
                                        description="Cita adecuada del Artículo 308 del Código Civil"
                                    />
                                    <AnalysisItem
                                        type="success"
                                        title="Pruebas Suficientes"
                                        description="Ofrece documentales públicas y testimoniales pertinentes"
                                    />
                                    <AnalysisItem
                                        type="success"
                                        title="Cuantificación Adecuada"
                                        description="Monto solicitado acorde a jurisprudencia vigente"
                                    />

                                    {/* Debilidades */}
                                    <AnalysisItem
                                        type="warning"
                                        title="Falta Acreditar Necesidad de Menores"
                                        description="Se recomienda anexar prueba pericial médica o psicológica"
                                    />
                                    <AnalysisItem
                                        type="warning"
                                        title="Prueba Pericial Contable Ausente"
                                        description="Para acreditar capacidad económica del deudor alimentario"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* === DRAFT SCENARIO === */}
                <div className={`absolute inset-0 p-6 flex items-center justify-center transition-opacity duration-700 ${step === 'draft' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="w-full max-w-2xl">
                        {!showResponse ? (
                            <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-right duration-500">
                                <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                    <p className="text-charcoal-900">{query}</p>
                                    {isTyping && <span className="inline-block w-0.5 h-4 ml-1 bg-charcoal-400 animate-pulse"></span>}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-cream-100 to-white border border-cream-300 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-400">
                                    <div className="flex items-center gap-2">
                                        <FileEdit className="w-4 h-4 text-accent-gold" />
                                        <span className="text-xs font-bold text-accent-gold uppercase tracking-wider">Contestación Generada</span>
                                    </div>
                                    <span className="text-xs text-charcoal-500 font-medium">6 páginas</span>
                                </div>

                                <div className="space-y-4 text-sm text-charcoal-800">
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <p className="font-bold text-charcoal-900 mb-1">C. JUEZ LABORAL EN TURNO</p>
                                        <p className="text-charcoal-700 text-xs">EN LA CIUDAD DE MÉXICO</p>
                                        <p className="text-charcoal-700 text-xs mt-2">PRESENTE</p>
                                    </div>

                                    <p className="leading-relaxed">
                                        <strong>JUAN PÉREZ LÓPEZ</strong>, en mi carácter de demandado, vengo a dar <strong>CONTESTACIÓN A LA DEMANDA LABORAL</strong> presentada en mi contra...
                                    </p>

                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r text-xs">
                                        <p className="font-semibold mb-2 text-blue-900">EXCEPCIONES Y DEFENSAS</p>
                                        <p className="text-blue-800 mb-2">
                                            Niego la existencia de despido injustificado. El actor incurrió en causales del <strong>Artículo 47 fracción XV de la LFT</strong> (inasistencias reiteradas).
                                        </p>
                                        <p className="text-blue-700 italic text-[10px]">
                                            Fundamento en Jurisprudencia 2a./J. 48/2019: "DESPIDO JUSTIFICADO. CARGA DE LA PRUEBA..."
                                        </p>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                                        <p className="font-semibold text-xs mb-1">PRUEBAS OFRECIDAS</p>
                                        <ul className="list-disc list-inside space-y-1 text-charcoal-600 text-xs">
                                            <li>Registros de asistencia (documentales privadas)</li>
                                            <li>Actas administrativas (documentales públicas)</li>
                                            <li>Testimonial del jefe de recursos humanos</li>
                                        </ul>
                                    </div>

                                    <button className="w-full py-2.5 bg-charcoal-900 text-white rounded-lg text-xs font-bold hover:bg-charcoal-800 transition-colors shadow-md">
                                        Descargar Documento Completo (PDF)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* === CONNECT SCENARIO - PROTAGONISTA === */}
                <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center transition-opacity duration-700 ${step === 'connect' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="w-full max-w-3xl">

                        {/* Badge Connect con animación de pulso */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg animate-pulse-subtle">
                                <Users className="w-5 h-5" />
                                <span className="font-bold text-sm">Iurexia Connect</span>
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">NUEVO</span>
                            </div>
                        </div>

                        {/* User Query */}
                        {query && !showResponse && (
                            <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-right duration-500">
                                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md">
                                    <p className="text-charcoal-900 font-medium">{query}</p>
                                    {isTyping && <span className="inline-block w-0.5 h-4 ml-1 bg-blue-500 animate-pulse"></span>}
                                </div>
                            </div>
                        )}

                        {/* Loading Steps */}
                        {connectSubStep === 'searching' && (
                            <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-lg animate-in fade-in duration-500">
                                <div className="flex items-center gap-4">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <div>
                                        <p className="font-bold text-charcoal-900">Analizando tu consulta...</p>
                                        <p className="text-sm text-charcoal-500">Identificando: Amparo, Fiscal, Querétaro</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {connectSubStep === 'validating' && (
                            <div className="bg-white border border-green-200 rounded-xl p-6 shadow-lg animate-in fade-in duration-500">
                                <div className="flex items-center gap-4">
                                    <Shield className="w-8 h-8 text-green-500 animate-pulse" />
                                    <div>
                                        <p className="font-bold text-charcoal-900">Validando cédulas SEP en tiempo real...</p>
                                        <p className="text-sm text-charcoal-500">Verificando especialistas certificados en tu zona</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results - Carrusel de Abogados */}
                        {showResponse && connectSubStep === 'results' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="text-center mb-4">
                                    <p className="text-sm text-charcoal-600">
                                        <strong className="text-accent-gold">3 especialistas encontrados</strong> · Ordenados por relevancia
                                    </p>
                                </div>

                                {/* Lawyer Cards Carousel */}
                                <LawyerCard
                                    name="Lic. Yair Israel Alcantar"
                                    cedula="12994266"
                                    location="Querétaro, Qro."
                                    specialties={["Amparo", "Fiscal", "Civil"]}
                                    match={98}
                                    active={selectedLawyer === 0}
                                    description="Experto en amparos fiscales. 15 años de experiencia litigando en tribunales federales."
                                />

                                {selectedLawyer === 1 && (
                                    <LawyerCard
                                        name="Lic. María Elena Ramírez"
                                        cedula="8765432"
                                        location="Querétaro, Qro."
                                        specialties={["Fiscal", "Administrativo", "Amparo"]}
                                        match={85}
                                        active={true}
                                        description="Especializada en defensa fiscal y juicio contencioso administrativo."
                                    />
                                )}

                                {selectedLawyer === 2 && (
                                    <LawyerCard
                                        name="Lic. Roberto Sánchez Torres"
                                        cedula="9123456"
                                        location="Querétaro, Qro."
                                        specialties={["Amparo", "Laboral", "Mercantil"]}
                                        match={78}
                                        active={true}
                                        description="Amplia trayectoria en litigio constitucional y derecho laboral."
                                    />
                                )}

                                {/* Pagination Dots */}
                                <div className="flex justify-center gap-2 mt-4">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedLawyer === i ? 'bg-accent-gold w-6' : 'bg-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Expediente IA Badge */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-sm text-green-800">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="font-semibold">Expediente IA generado automáticamente</span>
                                    </div>
                                    <p className="text-xs text-green-600 mt-1">El abogado recibirá tu consulta con contexto legal completo</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* === SENTENCIA SCENARIO === */}
                <div className={`absolute inset-0 p-6 flex items-center justify-center transition-opacity duration-700 ${step === 'sentencia' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="w-full max-w-md">
                        {!showResponse ? (
                            <div className="bg-white border-2 border-dashed border-purple-300 rounded-xl p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 rounded-full flex items-center justify-center">
                                    <Gavel className="w-8 h-8 text-purple-500" />
                                </div>
                                <p className="font-medium text-charcoal-900 mb-2">Sentencia_Civil_123_2025.pdf</p>
                                <p className="text-sm text-charcoal-500 mb-4">Analizando fundamentación y valoración de pruebas...</p>

                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-200"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-charcoal-400 mt-2 font-mono">{uploadProgress}%</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Gavel className="w-6 h-6 text-purple-600" />
                                        <div>
                                            <h4 className="font-bold text-charcoal-900">Análisis de Sentencia</h4>
                                            <p className="text-xs text-charcoal-500">Fundamentación y Valoración</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-purple-600">7.5</p>
                                        <p className="text-xs text-charcoal-400">/ 10</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <SentenciaItem
                                        type="success"
                                        title="Bien Fundada en Derecho"
                                        description="Correcta aplicación de los artículos del Código Civil"
                                    />
                                    <SentenciaItem
                                        type="success"
                                        title="Congruencia Adecuada"
                                        description="La sentencia responde a todas las prestaciones reclamadas"
                                    />
                                    <SentenciaItem
                                        type="warning"
                                        title="Valoración de Prueba Testimonial Deficiente"
                                        description="No se analizaron adecuadamente las declaraciones de testigos"
                                    />

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                        <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                                            <Scale className="w-4 h-4" />
                                            Recomendación Legal
                                        </p>
                                        <p className="text-xs text-blue-800">
                                            Se recomienda <strong>apelar</strong> citando la Jurisprudencia <strong>1a./J. 12/2022</strong> sobre la valoración integral de pruebas testimoniales en juicios civiles.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ChatInput Footer */}
            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                        <p className="text-gray-400 text-sm">Escribe tu consulta legal o sube tu documento para análisis</p>
                    </div>
                    <button className="bg-charcoal-900 text-white p-3 rounded-lg hover:bg-charcoal-800 transition-colors flex-shrink-0">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 flex-wrap">
                        <ActionButton icon={Paperclip} label="Subir documento" active={activeButton === 'upload'} />
                        <ActionButton icon={Search} label="Buscar" active={activeButton === 'search'} />
                        <ActionButton icon={FileEdit} label="Redactar" active={activeButton === 'draft'} />
                        <ActionButton icon={Gavel} label="Revisar Sentencia" active={activeButton === 'sentencia'} />
                    </div>
                </div>

                {/* Connect Badge with pulse */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 cursor-pointer hover:border-blue-200 transition-all ${activeButton === 'connect' ? 'ring-2 ring-blue-300 shadow-lg' : ''
                        }`}>
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-charcoal-600">
                            Busca un abogado especializado en tu zona
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide ml-auto animate-pulse-subtle">
                            Nuevo
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-gray-100 relative overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-gold via-yellow-500 to-accent-gold transition-all duration-[8000ms] ease-linear shadow-lg"
                    style={{ width: `${(stepNumber / 5) * 100}%` }}
                />
            </div>
        </div>
    );
}

// Helper Components
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

function AnalysisItem({ type, title, description }: { type: 'success' | 'warning', title: string, description: string }) {
    const isSuccess = type === 'success';
    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg ${isSuccess ? 'bg-green-50 border border-green-100' : 'bg-yellow-50 border border-yellow-100'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isSuccess ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {isSuccess ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
            </div>
            <div>
                <p className={`font-semibold text-sm ${isSuccess ? 'text-green-900' : 'text-yellow-900'}`}>{title}</p>
                <p className={`text-xs ${isSuccess ? 'text-green-700' : 'text-yellow-700'}`}>{description}</p>
            </div>
        </div>
    );
}

function SentenciaItem({ type, title, description }: { type: 'success' | 'warning', title: string, description: string }) {
    const isSuccess = type === 'success';
    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg ${isSuccess ? 'bg-green-50 border border-green-100' : 'bg-yellow-50 border border-yellow-100'}`}>
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isSuccess ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
                <p className={`font-semibold text-sm ${isSuccess ? 'text-green-900' : 'text-yellow-900'}`}>{title}</p>
                <p className={`text-xs ${isSuccess ? 'text-green-700' : 'text-yellow-700'}`}>{description}</p>
            </div>
        </div>
    );
}

function LawyerCard({ name, cedula, location, specialties, match, active, description }: {
    name: string,
    cedula: string,
    location: string,
    specialties: string[],
    match: number,
    active: boolean,
    description: string
}) {
    return (
        <div className={`bg-white border rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${active ? 'border-blue-200 scale-100 opacity-100' : 'scale-95 opacity-0 absolute'
            }`}>
            {/* Header with Verification Badge */}
            <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 border-b border-blue-100 flex justify-between items-center">
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <Shield className="w-3 h-3" /> Verificado SEP
                </span>
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent-gold fill-accent-gold" />
                    <span className="text-sm font-bold text-accent-gold">{match}% Match</span>
                </div>
            </div>

            <div className="p-6">
                <div className="flex gap-5 mb-4">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-charcoal-900 to-charcoal-700 text-white flex items-center justify-center font-serif text-2xl shadow-xl flex-shrink-0 ring-4 ring-white">
                        {name.split(' ').slice(1, 3).map(n => n[0]).join('')}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h4 className="font-serif text-lg font-bold text-charcoal-900 flex items-center gap-2 mb-1">
                            {name}
                            <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50" />
                        </h4>
                        <p className="text-xs text-charcoal-500 font-mono mb-2">Cédula Prof: {cedula}</p>
                        <div className="flex items-center gap-1.5 text-xs text-charcoal-600 mb-3">
                            <MapPin className="w-3 h-3 text-accent-gold" />
                            <span>{location}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {specialties.map((s, i) => (
                                <span key={i} className="px-2.5 py-1 bg-charcoal-50 border border-charcoal-100 rounded-md text-[10px] uppercase font-bold text-charcoal-700">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-xs text-charcoal-600 leading-relaxed mb-4 border-t border-gray-100 pt-4">
                    {description}
                </p>

                <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2.5 text-charcoal-600 text-xs font-semibold hover:bg-charcoal-50 rounded-lg transition-colors border border-charcoal-200">
                        Ver Perfil Completo
                    </button>
                    <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-charcoal-900 to-charcoal-800 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2 group">
                        Contactar
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
