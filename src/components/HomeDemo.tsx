'use client';

import { useState, useEffect } from 'react';
import { Search, FileText, UserCheck, Shield, ChevronRight, CheckCircle2 } from 'lucide-react';

type Step = 'chat' | 'audit' | 'connect';

export default function HomeDemo() {
    const [step, setStep] = useState<Step>('chat');
    const [text, setText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [progress, setProgress] = useState(0);

    // Sequence configuration
    useEffect(() => {
        let isMounted = true;

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const typeText = async (fullText: string, setter: (s: string) => void) => {
            for (let i = 0; i <= fullText.length; i++) {
                if (!isMounted) return;
                setter(fullText.slice(0, i));
                await wait(50 + Math.random() * 30);
            }
        };

        const runSequence = async () => {
            if (!isMounted) return;

            // --- STEP 1: CHAT ---
            setStep('chat');
            setText('');
            setShowResult(false);
            setProgress(0);

            // Type question
            await wait(1000);
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Fundamento del despido injustificado", setText);
            if (!isMounted) return;
            setIsTyping(false);

            // Show "Searching"
            await wait(500);
            if (!isMounted) return;
            setProgress(30);
            await wait(500);
            if (!isMounted) return;
            setProgress(100);

            // Show Result
            setShowResult(true);
            await wait(3500); // Read time
            if (!isMounted) return;

            // --- STEP 2: AUDIT ---
            setStep('audit');
            setText('');
            setShowResult(false);
            setProgress(0);

            // Upload simulation
            await wait(1000);
            if (!isMounted) return;
            setText('Subiendo demanda_laboral.pdf...');
            for (let i = 0; i <= 100; i += 10) {
                if (!isMounted) return;
                setProgress(i);
                await wait(100);
            }

            // Analyze
            setText('Analizando riesgos procesales...');
            await wait(1500);
            if (!isMounted) return;

            // Show Result
            setShowResult(true);
            await wait(3500);
            if (!isMounted) return;

            // --- STEP 3: CONNECT ---
            setStep('connect');
            setText('');
            setShowResult(false);
            setProgress(0);

            // Search simulation
            await wait(1000);
            if (!isMounted) return;
            setIsTyping(true);
            await typeText("Abogado laboralista en CDMX", setText);
            if (!isMounted) return;
            setIsTyping(false);

            // Searching
            await wait(500);
            if (!isMounted) return;
            setProgress(50);
            await wait(500);
            if (!isMounted) return;
            setProgress(100);

            // Show Result
            setShowResult(true);
            await wait(3500);
            if (!isMounted) return;

            // Loop
            if (isMounted) runSequence();
        };

        runSequence();

        return () => { isMounted = false; };
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto bg-charcoal-900 rounded-xl overflow-hidden shadow-2xl border border-charcoal-700">
            {/* Window Header */}
            <div className="bg-charcoal-950 px-4 py-3 flex items-center justify-between border-b border-charcoal-800">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex gap-4 text-xs font-medium text-charcoal-400">
                    <span className={step === 'chat' ? 'text-accent-gold' : ''}>1. Investigación</span>
                    <span className={step === 'audit' ? 'text-accent-gold' : ''}>2. Análisis</span>
                    <span className={step === 'connect' ? 'text-accent-gold' : ''}>3. Conexión</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6 h-[400px] relative font-sans text-sm md:text-base">

                {/* --- SCENARIO 1: CHAT --- */}
                <div className={`transition-opacity duration-500 absolute inset-0 p-6 ${step === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    {/* User Message */}
                    <div className="flex justify-end mb-6">
                        <div className="bg-charcoal-700 text-cream-100 px-4 py-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-lg">
                            <p className="font-medium text-white mb-1">Consulta</p>
                            <p>{text}<span className="animate-pulse">|</span></p>
                        </div>
                    </div>

                    {/* AI Response */}
                    <div className={`flex gap-4 transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center flex-shrink-0 text-charcoal-900 font-bold">
                            I
                        </div>
                        <div className="bg-charcoal-800 border border-charcoal-600 px-5 py-4 rounded-2xl rounded-tl-none max-w-[90%] shadow-lg">
                            <p className="text-accent-gold font-semibold mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Respuesta Verificada
                            </p>
                            <p className="text-cream-100 mb-3 leading-relaxed">
                                El despido injustificado se fundamenta en el <strong>Artículo 47</strong> de la Ley Federal del Trabajo.
                            </p>
                            <div className="bg-charcoal-900/50 p-3 rounded border border-charcoal-600 text-xs text-charcoal-300 font-mono mb-3">
                                "El patrón que despida a un trabajador deberá darle aviso escrito en el que refiera claramente la conducta..." — LFT
                            </div>
                            <p className="text-cream-200 text-sm">
                                <strong>Derechos:</strong> Tienes derecho a indemnización constitucional (3 meses) + 20 días por año + prima de antigüedad.
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- SCENARIO 2: AUDIT --- */}
                <div className={`transition-opacity duration-500 absolute inset-0 p-6 flex flex-col items-center justify-center ${step === 'audit' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>

                    {/* Upload State */}
                    <div className={`w-full max-w-md bg-charcoal-800 rounded-xl p-6 border border-charcoal-600 mb-6 transition-all duration-300 ${!showResult ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-cream-100 font-medium">demanda_laboral.pdf</p>
                                <p className="text-charcoal-400 text-xs">2.4 MB</p>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 bg-charcoal-950 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-200"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-right text-xs text-charcoal-400 mt-2">{text}</p>
                    </div>

                    {/* Result Card */}
                    <div className={`w-full max-w-md bg-charcoal-800 border border-red-500/30 rounded-xl p-0 overflow-hidden shadow-2xl transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="bg-red-500/10 px-6 py-3 border-b border-red-500/30 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 font-semibold text-sm">Riesgo Detectado</span>
                        </div>
                        <div className="p-6">
                            <h3 className="text-cream-100 font-medium text-lg mb-2">Falta acreditar relación laboral</h3>
                            <p className="text-charcoal-300 text-sm mb-4">
                                El documento no presenta pruebas documentales (contrato, recibos de nómina) que acrediten la subordinación.
                            </p>
                            <button className="text-accent-gold text-sm font-medium hover:underline flex items-center gap-1">
                                Ver sugerencia de redacción <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- SCENARIO 3: CONNECT --- */}
                <div className={`transition-opacity duration-500 absolute inset-0 p-6 flex flex-col items-center justify-center ${step === 'connect' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>

                    {/* Search Bar */}
                    <div className="w-full max-w-lg mb-8 relative">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-charcoal-400" />
                        <div className="w-full bg-charcoal-800 border border-charcoal-600 rounded-full py-3 pl-12 pr-6 text-cream-100 shadow-lg">
                            {text}<span className="animate-pulse">|</span>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className={`w-full max-w-md bg-cream-100 rounded-xl p-0 overflow-hidden shadow-2xl transition-all duration-500 transform ${showResult ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between">
                            <span className="text-white font-medium text-sm flex items-center gap-1">
                                <Search className="w-4 h-4" /> Mejor Coincidencia
                            </span>
                            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                98% Match
                            </span>
                        </div>
                        <div className="p-6 flex gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0">
                                RM
                            </div>
                            <div>
                                <h3 className="text-charcoal-900 font-bold text-lg flex items-center gap-2">
                                    Lic. Roberto Méndez
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                </h3>
                                <p className="text-charcoal-600 text-sm mb-2">Especialista en Derecho Laboral</p>
                                <div className="flex gap-2 text-xs">
                                    <span className="bg-charcoal-100 text-charcoal-600 px-2 py-1 rounded">CDMX</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> Cédula Verificada
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 pt-0">
                            <button className="w-full bg-charcoal-900 text-white py-2 rounded-lg font-medium text-sm hover:bg-charcoal-800 transition-colors">
                                Contactar Abogado
                            </button>
                        </div>
                    </div>

                </div>

            </div>

            {/* Footer Progress Bar */}
            <div className="h-1 bg-charcoal-800 w-full relative">
                <div
                    className="h-full bg-accent-gold transition-all duration-[5000ms] ease-linear"
                    style={{
                        width: step === 'chat' ? '33%' : step === 'audit' ? '66%' : '100%',
                        transitionDuration: '5000ms'
                    }}
                />
            </div>
        </div>
    );
}
