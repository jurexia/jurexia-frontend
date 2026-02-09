'use client';

import { useState, useEffect } from 'react';
import { Search, FileText, Shield, ChevronRight, CheckCircle2, Scale, AlertTriangle, FileSearch, MapPin } from 'lucide-react';

type Step = 'chat' | 'audit' | 'connect';

export default function HomeDemo() {
    const [step, setStep] = useState<Step>('chat');
    const [text, setText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [subStep, setSubStep] = useState(0); // For multi-stage animations within a step

    // Sequence configuration
    useEffect(() => {
        let isMounted = true;
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const typeText = async (fullText: string, setter: (s: string) => void) => {
            setter("");
            for (let i = 0; i <= fullText.length; i++) {
                if (!isMounted) return;
                setter(fullText.slice(0, i));
                await wait(40 + Math.random() * 20);
            }
        };

        const runSequence = async () => {
            if (!isMounted) return;

            // ==========================================
            // ESCENARIO 1: CHAT / INVESTIGACIÓN JURÍDICA
            // "Conversa con una IA que recuerda tu caso..."
            // ==========================================
            setStep('chat');
            setText('');
            setShowResult(false);
            setSubStep(0);

            await wait(1000);
            if (!isMounted) return;

            // Typing query
            setIsTyping(true);
            await typeText("Me despidieron injustificadamente, ¿qué me corresponde?", setText);
            setIsTyping(false);
            await wait(500);

            // "Processing" animation
            setSubStep(1); // Searching indicators
            await wait(1500);

            // Show Result
            if (!isMounted) return;
            setShowResult(true);
            await wait(5000); // Allow time to read the verified response

            // ==========================================
            // ESCENARIO 2: AUDIT / AGENTE CENTINELA
            // "Diagnóstico legal instantáneo..."
            // ==========================================
            if (!isMounted) return;
            setStep('audit');
            setText('');
            setShowResult(false);
            setSubStep(0);

            await wait(1000);

            // Upload Simulation
            if (!isMounted) return;
            setText('Subiendo Contestación_Demanda.pdf...');
            setSubStep(1); // Uploading
            await wait(1500);

            // Analyzing
            if (!isMounted) return;
            setText('Analizando fortalezas y debilidades...');
            setSubStep(2); // Scanning
            await wait(1500);

            // Show Result
            if (!isMounted) return;
            setShowResult(true);
            await wait(5000);

            // ==========================================
            // ESCENARIO 3: CONNECT / ABOGADOS VERIFICADOS
            // "El abogado perfecto para tu caso y zona"
            // ==========================================
            if (!isMounted) return;
            setStep('connect');
            setText('');
            setShowResult(false);
            setSubStep(0);

            await wait(1000);

            // Typing query
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Necesito abogado civil experto en amparos en Querétaro", setText);
            setIsTyping(false);
            await wait(600);

            // Searching / Filtering
            if (!isMounted) return;
            setSubStep(1); // "Validando cédulas SEP..."
            await wait(1500);

            // Show Result
            if (!isMounted) return;
            setShowResult(true);
            await wait(5000);

            // Loop
            if (isMounted) runSequence();
        };

        runSequence();
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="w-full max-w-5xl mx-auto bg-white rounded-xl overflow-hidden shadow-2xl border border-charcoal-200 font-sans">
            {/* Browser/App Header */}
            <div className="bg-cream-100/50 px-4 py-3 flex items-center justify-between border-b border-charcoal-100 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                {/* Navigation Pills */}
                <div className="flex items-center gap-1 bg-charcoal-50/50 p-1 rounded-full">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 flex items-center gap-2 ${step === 'chat' ? 'bg-charcoal-900 text-white shadow-md' : 'text-charcoal-500'}`}>
                        <Scale className="w-3 h-3" /> Investigación
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 flex items-center gap-2 ${step === 'audit' ? 'bg-charcoal-900 text-white shadow-md' : 'text-charcoal-500'}`}>
                        <FileSearch className="w-3 h-3" /> Análisis
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 flex items-center gap-2 ${step === 'connect' ? 'bg-charcoal-900 text-white shadow-md' : 'text-charcoal-500'}`}>
                        <UserCheck className="w-3 h-3" /> Connect
                    </div>
                </div>
                <div className="w-16" /> {/* Spacer */}
            </div>

            {/* Main Canvas */}
            <div className="h-[480px] md:h-[520px] relative bg-cream-50/30">

                {/* =======================
                    SCENARIO 1: CHAT
                   ======================= */}
                <div className={`absolute inset-0 p-4 md:p-8 transition-all duration-700 flex flex-col ${step === 'chat' ? 'opacity-100 z-20 translate-y-0' : 'opacity-0 z-0 translate-y-4 pointer-events-none'}`}>

                    {/* Header / Context */}
                    <div className="text-center mb-8">
                        <h3 className="font-serif text-2xl md:text-3xl font-medium text-charcoal-900 mb-2">
                            Consultor Legal con Memoria
                        </h3>
                        <p className="text-charcoal-500 text-sm">
                            Respuestas fundamentadas. Cero alucinaciones.
                        </p>
                    </div>

                    {/* Chat Interface */}
                    <div className="max-w-2xl mx-auto w-full space-y-6">

                        {/* User Bubble */}
                        <div className="flex justify-end">
                            <div className="bg-charcoal-100 text-charcoal-900 px-6 py-4 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm border border-charcoal-50">
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-charcoal-400 uppercase tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    Tú
                                </div>
                                <p className="text-lg leading-relaxed">
                                    {text}
                                    <span className={`inline-block w-1.5 h-5 ml-1 bg-charcoal-400 align-middle ${isTyping ? 'animate-pulse' : 'hidden'}`}></span>
                                </p>
                            </div>
                        </div>

                        {/* Processing Indicator */}
                        <div className={`flex items-center gap-3 text-sm text-charcoal-400 transition-opacity duration-300 ${subStep === 1 && !showResult ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                            <div className="w-4 h-4 border-2 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
                            <span>Buscando en Ley Federal del Trabajo...</span>
                        </div>

                        {/* AI Response Bubble */}
                        <div className={`flex gap-4 transition-all duration-700 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <div className="w-10 h-10 rounded-full bg-charcoal-900 flex items-center justify-center flex-shrink-0 text-accent-gold font-serif font-bold text-xl shadow-lg ring-4 ring-white">
                                I
                            </div>
                            <div className="bg-white border border-charcoal-100 px-6 py-5 rounded-2xl rounded-tl-sm shadow-xl w-full">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-gold to-yellow-600 uppercase tracking-wider">
                                        Iurexia AI
                                    </span>
                                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> FUENTES VERIFICADAS
                                    </span>
                                </div>

                                <p className="text-charcoal-800 mb-4 leading-relaxed">
                                    Para el <strong>despido injustificado</strong>, la Ley Federal del Trabajo establece tus derechos constitucionales.
                                </p>

                                {/* Citation Card */}
                                <div className="bg-cream-100/50 border-l-4 border-accent-gold p-4 rounded-r-lg mb-4 text-sm relative group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-charcoal-900">Artículo 47 & 48</span>
                                        <span className="text-[10px] text-charcoal-400 font-mono">[Doc ID: LFT-2024]</span>
                                    </div>
                                    <p className="text-charcoal-600 italic">
                                        "El trabajador podrá solicitar... que se le reinstale en el trabajo que desempeñaba, o que se le indemnice con el importe de tres meses de salario..."
                                    </p>
                                </div>

                                <p className="text-charcoal-800 text-sm">
                                    Te corresponden <strong>3 meses de salario</strong> + 20 días por año laborado (si aplica) + prima de antigüedad.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =======================
                    SCENARIO 2: AUDIT
                   ======================= */}
                <div className={`absolute inset-0 p-4 md:p-8 flex flex-col items-center justify-center transition-all duration-700 ${step === 'audit' ? 'opacity-100 z-20 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'}`}>

                    <div className="text-center mb-8">
                        <h3 className="font-serif text-2xl md:text-3xl font-medium text-charcoal-900 mb-2">
                            Agente Centinela
                        </h3>
                        <p className="text-charcoal-500 text-sm">
                            Detecta debilidades y puntos de impugnación al instante.
                        </p>
                    </div>

                    {/* Document View */}
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-charcoal-100 overflow-hidden relative">

                        {/* Status Bar */}
                        <div className="bg-charcoal-50 px-4 py-2 border-b border-charcoal-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
                                <FileText className="w-4 h-4 text-blue-600" /> Contestación_Demanda.pdf
                            </div>
                            {subStep === 2 && (
                                <span className="text-xs text-blue-600 font-semibold animate-pulse">Analizando...</span>
                            )}
                        </div>

                        {/* Scan Effect Content */}
                        <div className="p-6 relative min-h-[200px] flex items-center justify-center bg-dots">

                            {/* Scanning Line */}
                            {subStep === 2 && !showResult && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-accent-gold/50 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-scan z-10"></div>
                            )}

                            {!showResult ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
                                        {subStep === 1 ? (
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Shield className="w-8 h-8 text-blue-600" />
                                        )}
                                    </div>
                                    <p className="text-charcoal-500 text-sm font-medium">{text}</p>
                                </div>
                            ) : (
                                <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Risk Card */}
                                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3 items-start">
                                        <div className="bg-white p-1.5 rounded-full shadow-sm text-red-500 mt-0.5">
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-red-800 font-bold text-sm">Debilidad Argumentativa Detectada</h4>
                                            <p className="text-red-700 text-xs mt-1 leading-snug">
                                                La excepción de prescripción opuesta carece del cómputo de plazos exacto (Jurisprudencia 2a./J. 48/2002).
                                            </p>
                                        </div>
                                    </div>

                                    {/* Suggestion Card */}
                                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex gap-3 items-start">
                                        <div className="bg-white p-1.5 rounded-full shadow-sm text-green-600 mt-0.5">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-green-800 font-bold text-sm">Sugerencia de Mejora</h4>
                                            <p className="text-green-700 text-xs mt-1 leading-snug">
                                                Se redactó un párrafo complementario citando la jurisprudencia aplicable para subsanar la omisión.
                                            </p>
                                        </div>
                                    </div>

                                    <button className="w-full py-2 bg-charcoal-900 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-800 transition-colors">
                                        Ver Documento Mejorado
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* =======================
                    SCENARIO 3: CONNECT
                   ======================= */}
                <div className={`absolute inset-0 p-4 md:p-8 flex flex-col items-center justify-center transition-all duration-700 ${step === 'connect' ? 'opacity-100 z-20 translate-x-0' : 'opacity-0 z-0 translate-x-8 pointer-events-none'}`}>

                    <div className="text-center mb-8">
                        <h3 className="font-serif text-2xl md:text-3xl font-medium text-charcoal-900 mb-2">
                            Iurexia Connect
                        </h3>
                        <p className="text-charcoal-500 text-sm">
                            Matching semántico con abogados verificados por la SEP.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full max-w-lg mb-6 relative">
                        <div className="absolute top-0 -left-4 w-full h-full bg-blue-500/10 blur-xl rounded-full transform scale-95"></div>
                        <div className="relative bg-white border border-charcoal-200 rounded-full shadow-lg flex items-center p-1.5 pl-5">
                            <Search className="w-5 h-5 text-charcoal-400 mr-3 flex-shrink-0" />
                            <div className="flex-1 text-charcoal-800 text-base overflow-hidden whitespace-nowrap">
                                {text}
                                <span className={`inline-block w-0.5 h-4 ml-0.5 bg-blue-500 align-middle ${isTyping ? 'animate-pulse' : 'hidden'}`}></span>
                            </div>
                            <button className="bg-charcoal-900 text-white p-2.5 rounded-full hover:bg-charcoal-800 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Validation tags below search */}
                        <div className="flex justify-center gap-4 mt-3 opacity-0 animate-in fade-in slide-in-from-top-2 fill-mode-forwards" style={{ animationDelay: '2s' }}>
                            <span className="flex items-center gap-1.5 text-xs text-charcoal-500 bg-white px-2 py-1 rounded-md border border-charcoal-100 shadow-sm">
                                <Shield className="w-3 h-3 text-green-600" /> Cédulas Verificadas
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-charcoal-500 bg-white px-2 py-1 rounded-md border border-charcoal-100 shadow-sm">
                                <MapPin className="w-3 h-3 text-blue-600" /> Geolocalización
                            </span>
                        </div>
                    </div>

                    {/* Result Profile */}
                    <div className={`w-full max-w-lg transition-all duration-700 transform ${showResult ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
                        <div className="bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden relative">
                            {/* Verified Badge Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-white p-3 border-b border-blue-50 flex justify-between items-center">
                                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                    <Shield className="w-3 h-3" /> Verificado SEP
                                </span>
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                    98% Coincidencia
                                </span>
                            </div>

                            <div className="p-5 flex gap-5">
                                {/* Avatar */}
                                <div className="w-16 h-16 rounded-xl bg-charcoal-900 text-white flex items-center justify-center font-serif text-2xl shadow-lg flex-shrink-0">
                                    YI
                                </div>
                                {/* Info */}
                                <div className="flex-1">
                                    <h4 className="font-serif text-lg font-bold text-charcoal-900 flex items-center gap-2">
                                        Lic. Yair Israel Alcantar
                                        <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50" />
                                    </h4>
                                    <p className="text-xs text-charcoal-500 mb-2 font-mono">Cédula Prof: 12994266</p>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <span className="px-2 py-0.5 bg-charcoal-50 border border-charcoal-100 rounded text-[10px] uppercase font-semibold text-charcoal-600">Amparo</span>
                                        <span className="px-2 py-0.5 bg-charcoal-50 border border-charcoal-100 rounded text-[10px] uppercase font-semibold text-charcoal-600">Civil</span>
                                        <span className="px-2 py-0.5 bg-charcoal-50 border border-charcoal-100 rounded text-[10px] uppercase font-semibold text-charcoal-600">Familiar</span>
                                    </div>

                                    <p className="text-xs text-charcoal-600 leading-snug line-clamp-2">
                                        Experto en derecho civil y de amparo. Amplia experiencia en litigio y redacción de sentencias en el Poder Judicial.
                                    </p>
                                </div>
                            </div>

                            <div className="px-4 py-3 bg-charcoal-50 border-t border-charcoal-100 flex justify-end gap-3">
                                <button className="px-4 py-2 text-charcoal-600 text-xs font-semibold hover:bg-charcoal-100 rounded-lg transition-colors">
                                    Ver Perfil Completo
                                </button>
                                <button className="px-6 py-2 bg-charcoal-900 text-white text-xs font-bold rounded-lg shadow-md hover:bg-charcoal-800 transition-colors">
                                    Contactar
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Footer Progress Bar */}
            <div className="h-1.5 bg-charcoal-100 w-full relative overflow-hidden">
                <div
                    className="h-full bg-accent-gold transition-all duration-[8000ms] ease-linear shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    style={{
                        width: step === 'chat' ? '33%' : step === 'audit' ? '66%' : '100%',
                        transitionDuration: '8000ms'
                    }}
                />
            </div>
        </div>
    );
}
