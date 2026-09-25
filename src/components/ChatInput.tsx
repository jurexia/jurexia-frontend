'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Square,
    Paperclip,
    Shield,
    FileEdit,
    Gavel,
    Landmark,
    Lock,
    Mic,
    BookOpen,
    BarChart2,
} from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import SelectorFuentes from './SelectorFuentes';
import SelectorEsfuerzo from './SelectorEsfuerzo';
import { FileText, X, Network, ChevronUp, ChevronDown, UploadCloud } from 'lucide-react';
import { validarAdjunto, EXTENSIONES_ADJUNTO, LIMITE_ADJUNTO_MB } from '@/lib/documento/adjuntos';
import TextEnhanceModal from './TextEnhanceModal';
import DraftModal, { DraftRequest } from './DraftModal';
import SentenciaModal from './SentenciaModal';
import JurimetriaModal from './JurimetriaModal';
import { enhanceText } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';

interface ChatInputProps {
    onSubmit: (message: string, enableReasoning?: boolean) => void;
    onDocumentSubmit?: (file: File, prompt: string, displayMessage: string) => void;
    onStop?: () => void;
    isLoading?: boolean;
    placeholder?: string;
    estado?: string;
    activeGenios?: string[];
    setActiveGenios?: (genios: string[]) => void;
    isCacheActive?: boolean;
    isCacheLoading?: boolean;
    genioError?: string | null;
    isPro?: boolean;
    selectedFuero?: string[];
    onFueroChange?: (fueros: string[]) => void;
    /** Despliega o recoge el constructor de escritos —demanda o recurso— (editor Word + pasos + Toulmin). */
    onAbrirConstructor?: (paso: 'caso' | 'toulmin') => void;
    /** Si el constructor está desplegado: el botón Toulmin se ve pulsado. */
    constructorAbierto?: boolean;
    /** MODO BÁSICO: sin cuenta, o cuenta gratuita ya agotada. Las herramientas
     *  no desaparecen, se ven con candado: el abogado tiene que VER lo que se
     *  está perdiendo, que es lo único que convierte una prueba en una
     *  suscripción. Ver `@/lib/gratis`. */
    basico?: boolean;
}

export default function ChatInput({
    onSubmit,
    onDocumentSubmit,
    onStop,
    isLoading = false,
    placeholder = "Consulta o pide un escrito…",
    estado,
    activeGenios = [],
    setActiveGenios,
    isCacheActive = false,
    isCacheLoading = false,
    genioError = null,
    isPro = false,
    selectedFuero = [],
    onFueroChange,
    onAbrirConstructor,
    constructorAbierto = false,
    basico = false,
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [activeMode, setActiveMode] = useState<'search' | 'files' | 'enhance' | 'draft' | 'sentencia' | 'precedentes'>('search');
    const [selectedCircuit, setSelectedCircuit] = useState<number | 'ALL' | null>(null);
    const [tribunalFilter, setTribunalFilter] = useState<string | null>(null);
    // Precedentes: corte (SCJN | TCC | ALL) y sala SCJN (PLENO | PRIMERA_SALA | SEGUNDA_SALA | null=todas)
    const [selectedCorte, setSelectedCorte] = useState<'SCJN' | 'TCC' | 'ALL'>('SCJN');
    const [selectedSala, setSelectedSala] = useState<'PLENO' | 'PRIMERA_SALA' | 'SEGUNDA_SALA' | null>(null);
    const [showFileModal, setShowFileModal] = useState(false);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showSentenciaModal, setShowSentenciaModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState<'pro' | 'platinum' | null>(null);
    const [showJurimetriaModal, setShowJurimetriaModal] = useState(false);
    const [attachedDocument, setAttachedDocument] = useState<{ file: File; fileName: string } | null>(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [avisoAdjunto, setAvisoAdjunto] = useState('');

    /* LA CAJA SENCILLA ES LA PREDETERMINADA (18-sep-2026).
       Antes (17-sep) el compositor arrancaba desplegado y se recogía solo al
       empezar a responder: seis filas de herramientas medían ≈320px al pie y
       en un portátil de 800px quedaban 424 para leer. David lo cerró del todo:
       «que la ventana de chat que queda en la izquierda permanezca así salvo
       que el usuario clickee desplegar herramientas […] esa ventana sencilla
       será la predeterminada». Así que se arranca plegado, no se despliega
       solo al tocar el texto, y el MISMO botón abre y cierra. Nada
       desaparece: se pliega. */
    const [plegado, setPlegado] = useState(true);
    useEffect(() => { if (isLoading) setPlegado(true); }, [isLoading]);
    useEffect(() => {
        const desplegar = () => setPlegado(false);
        window.addEventListener('iurexia:desplegar-compositor', desplegar);
        return () => window.removeEventListener('iurexia:desplegar-compositor', desplegar);
    }, []);
    // Las fuentes (Internet incluida) y el esfuerzo ya no se resumen aquí: los
    // dicen sus botones, a la vista. Sólo lo encendido dentro del panel plegado.
    const resumenPlegado = [
        activeMode === 'precedentes' ? 'Precedentes' : null,
    ].filter(Boolean).join(' · ');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);
    const baseMessageRef = useRef('');
    const { user, profile } = useAuth();

    // ── Datos de circuitos y tribunales ──────────────────────────────────
    const AVAILABLE_CIRCUITS = [1, 2, 3, 4, 6, 16, 22];

    const CIRCUIT_TRIBUNALS: Record<number, { id: string; label: string; available: boolean; grupo?: string }[]> = {
        1: [
            // Materia Administrativa (1–24)
            ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,18,20,21,22,23,24] as number[]).map(n => ({
                id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM'
            })),
            // Materia Civil (1–15)
            ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] as number[]).map(n => ({
                id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV'
            })),
            // Materia Laboral (1–15)
            ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] as number[]).map(n => ({
                id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB'
            })),
            // Materia Penal (1–9)
            ...([1,2,3,4,5,6,7,8,9] as number[]).map(n => ({
                id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN'
            })),
        ],
        2: [
            // Materia Administrativa (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        4: [
            // Materia Administrativa (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–5)
            ...([1,2,3,4,5] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        3: [
            // Materia Administrativa (1–7)
            ...([1,2,3,4,5,6,7] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–6)
            ...([1,2,3,4,5,6] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–6)
            ...([1,2,3,4,5,6] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–4)
            ...([1,2,3,4] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        6: [
            // Materia Administrativa (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–3)
            ...([1,2,3] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        16: [
            // Materia Administrativa (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_ADM`, label: `${n}°`, available: true, grupo: 'ADM' })),
            // Materia Civil (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_CIV`, label: `${n}°`, available: true, grupo: 'CIV' })),
            // Materia Laboral (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_LAB`, label: `${n}°`, available: true, grupo: 'LAB' })),
            // Materia Penal (1–2)
            ...([1,2] as number[]).map(n => ({ id: `${n}TCC_PEN`, label: `${n}°`, available: true, grupo: 'PEN' })),
        ],
        22: [
            { id: '1TCC',      label: '1° ADM/CIV', available: true },
            { id: '2TCC',      label: '2° ADM/CIV', available: true },
            { id: '3TCC',      label: '3° ADM/CIV', available: true },
            { id: 'TCC_PENAL', label: 'PEN·ADM',    available: true },
            { id: 'TCC_ADM',   label: 'ADM·TRAB',   available: true },
        ],
    };

    const ORDINAL_ES = [
        '', '1°','2°','3°','4°','5°','6°','7°','8°','9°','10°',
        '11°','12°','13°','14°','15°','16°','17°','18°','19°','20°',
        '21°','22°','23°','24°','25°','26°','27°','28°','29°','30°',
        '31°','32°',
    ];
    const canAccessRedactor = isAdmin(user?.email) || profile?.subscription_type === 'ultra_secretarios' || profile?.can_access_sentencia === true;
    const canAccessSentencia = profile?.subscription_type && !['gratuito', 'basico_monthly'].includes(profile.subscription_type);
    const isFreeUser = !profile?.subscription_type || ['gratuito', 'basico_monthly'].includes(profile.subscription_type);
    const _PRO_PLUS = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual', 'ultra_secretarios'];
    const canAccessPrecedentes = isAdmin(user?.email) || _PRO_PLUS.includes(profile?.subscription_type ?? '');
    const canAccessJurimetria  = isAdmin(user?.email) || ['platinum_monthly', 'platinum_annual', 'ultra_secretarios'].includes(profile?.subscription_type ?? '');
    // (El Secretario del PJF se mudó a la barra superior del chat; su
    //  comprobación de plan vive ahora en app/chat/page.tsx.)


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'es-MX';

                recognition.onstart = () => setIsListening(true);

                recognition.onresult = (event: any) => {
                    let fullSessionTranscript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        fullSessionTranscript += event.results[i][0].transcript;
                    }

                    const newMsg = baseMessageRef.current + (baseMessageRef.current && fullSessionTranscript ? ' ' : '') + fullSessionTranscript;
                    setMessage(newMsg);

                    if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    // Default to global search when entering Precedentes mode; reset tribunal on exit
    useEffect(() => {
        if (activeMode === 'precedentes' && selectedCircuit === null) {
            setSelectedCircuit('ALL');
        }
        if (activeMode !== 'precedentes') {
            setTribunalFilter(null);
        }
    }, [activeMode]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('El dictado por voz no es compatible con este navegador. Te recomendamos usar Google Chrome o Safari.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            baseMessageRef.current = message;
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Error starting recognition", e);
            }
        }
    };


    /* En básico, cualquier herramienta lleva al mismo sitio: los planes. No se
       esconde el botón —verlo es el punto—, pero no hace su trabajo. */
    const tocoCandado = () => {
        if (typeof window !== 'undefined') window.location.href = '/precios';
    };

    const handleSubmit = () => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (!isLoading && (message.trim() || attachedDocument)) {
            let finalMessage = message.trim();

            // If there's an attached document, use dedicated document analysis endpoint
            if (attachedDocument) {
                const userPrompt = finalMessage || 'Analiza este documento y genera un resumen ejecutivo completo';
                const displayMessage = `📄 **Documento adjunto:** ${attachedDocument.fileName}\n\n${userPrompt}`;

                if (onDocumentSubmit) {
                    // New flow: send raw file to /analyze-document for full analysis
                    onDocumentSubmit(attachedDocument.file, userPrompt, displayMessage);
                } else {
                    // Fallback: send as text message (legacy)
                    onSubmit(displayMessage, true);
                }

                setAttachedDocument(null);
                setMessage('');
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
                return;
            }

            // La consulta rápida (el rayo, `[MODO_FLASH]`) salió el 25-sep-2026
            // por minimalismo; el servidor aún entiende el marcador de los
            // bundles viejos.

            // Internet: ya NO se antepone «[FUENTES_WEB]» al texto. Se enciende
            // en «Fuentes» y viaja como campo `fuentes_web` del request (api.ts
            // lo lee al enviar). El marcador en el texto se perdía en los
            // caminos que no pasaban por aquí —documentos, sugerencias— y
            // además se colaba en los títulos del historial.

            // Sin marcador de redacción (25-sep-2026): el servidor reconoce el
            // encargo en el propio mensaje y el esfuerzo viaja como campo
            // `esfuerzo` del request. Ver `@/lib/esfuerzo`.

            // Prepend [MODO_PRECEDENTES] marker when in Precedentes mode
            if (activeMode === 'precedentes') {
                const corteTag = ` [CORTE:${selectedCorte}]`;
                let extraTags = '';
                if (selectedCorte === 'SCJN') {
                    if (selectedSala) extraTags += ` [SALA:${selectedSala}]`;
                } else if (selectedCorte === 'TCC') {
                    if (selectedCircuit && selectedCircuit !== 'ALL') extraTags += ` [CIRCUITO:${selectedCircuit}]`;
                    if (tribunalFilter) extraTags += ` [TRIBUNAL:${tribunalFilter}]`;
                }
                finalMessage = `[MODO_PRECEDENTES]${corteTag}${extraTags} ${finalMessage}`;
            }

            // Always use reasoning for maximum quality
            onSubmit(finalMessage, true);
            setMessage('');
            
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends — Shift+Enter inserts newline
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    /* ── ARRASTRAR EL DOCUMENTO A LA VENTANA (18-sep-2026) ───────────────
       David: «necesitamos que la ventana de texto nos permita recibir
       documentos que el usuario arrastre a la ventana y no solo con la
       función del clip».

       SE ESCUCHA EN LA VENTANA ENTERA, no sólo sobre el cuadro de texto:
       quien arrastra un PDF lo suelta donde está mirando —la respuesta, la
       hoja de la derecha— y errar el blanco no puede costar el archivo.

       HAY QUE CANCELAR TAMBIÉN `dragover`. Sin eso el navegador hace lo suyo
       por omisión: abre el PDF en la pestaña, y la consulta a medio escribir
       se pierde. Esa es la razón de que un fallo aquí sea caro.

       La cuenta de entradas y salidas es lo que evita el parpadeo del aviso
       al pasar por encima de los elementos anidados. Y mientras la ventana de
       subida está abierta esto no se mete: allí hay su propia zona. */
    const arrastres = useRef(0);
    const relojAdjunto = useRef<number | null>(null);
    const anunciarAdjunto = (texto: string) => {
        setAvisoAdjunto(texto);
        if (relojAdjunto.current) window.clearTimeout(relojAdjunto.current);
        relojAdjunto.current = window.setTimeout(() => setAvisoAdjunto(''), 7000);
    };
    useEffect(() => () => { if (relojAdjunto.current) window.clearTimeout(relojAdjunto.current); }, []);
    useEffect(() => {
        const traeArchivos = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
        const entrar = (e: DragEvent) => {
            if (!traeArchivos(e) || showFileModal) return;
            e.preventDefault();
            arrastres.current += 1;
            setArrastrando(true);
        };
        const encima = (e: DragEvent) => {
            if (!traeArchivos(e) || showFileModal) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        };
        const salir = (e: DragEvent) => {
            if (!traeArchivos(e)) return;
            arrastres.current = Math.max(0, arrastres.current - 1);
            if (arrastres.current === 0) setArrastrando(false);
        };
        const terminar = () => { arrastres.current = 0; setArrastrando(false); };
        const soltar = (e: DragEvent) => {
            if (!traeArchivos(e)) return;
            terminar();
            if (showFileModal) return;
            e.preventDefault();
            const archivos = Array.from(e.dataTransfer?.files || []);
            if (!archivos.length) return;
            const fallo = validarAdjunto(archivos[0]);
            if (fallo) { anunciarAdjunto(fallo); return; }
            setAttachedDocument({ file: archivos[0], fileName: archivos[0].name });
            setActiveMode('search');
            /* SE DICE QUÉ ENTRÓ Y QUÉ NO. Aquí se revisa un documento por
               consulta; callarse los que sobran produce un análisis seguro de
               sí mismo sobre un expediente incompleto. */
            anunciarAdjunto(archivos.length > 1
                ? `Se adjuntó «${archivos[0].name}». Aquí se revisa un documento por consulta: `
                  + `${archivos.length - 1} ${archivos.length - 1 === 1 ? 'archivo no se envió' : 'archivos no se enviaron'}.`
                : `«${archivos[0].name}» adjuntado. Escriba qué quiere que se haga con él.`);
            window.setTimeout(() => textareaRef.current?.focus(), 0);
        };
        window.addEventListener('dragenter', entrar);
        window.addEventListener('dragover', encima);
        window.addEventListener('dragleave', salir);
        window.addEventListener('dragend', terminar);
        window.addEventListener('drop', soltar);
        return () => {
            window.removeEventListener('dragenter', entrar);
            window.removeEventListener('dragover', encima);
            window.removeEventListener('dragleave', salir);
            window.removeEventListener('dragend', terminar);
            window.removeEventListener('drop', soltar);
        };
    }, [showFileModal]);

    const handleFileExtracted = (file: File, fileName: string) => {
        // Attach raw file for backend-side analysis (Gemini Flash 1M context)
        setAttachedDocument({ file, fileName });
        setActiveMode('search');
    };

    const handleEnhanceText = async (text: string, docType: string): Promise<string> => {
        const response = await enhanceText(text, docType, estado);
        return response.texto_mejorado;
    };

    const handleModeClick = (mode: 'search' | 'files' | 'enhance' | 'draft' | 'sentencia') => {
        setActiveMode(mode);
        if (mode === 'files') {
            setShowFileModal(true);
        } else if (mode === 'enhance') {
            setShowEnhanceModal(true);
        } else if (mode === 'draft') {
            setShowDraftModal(true);
        } else if (mode === 'sentencia') {
            setShowSentenciaModal(true);
        }
    };

    const handleDraft = (draftRequest: DraftRequest) => {
        /* ═══ EL ESCRITO SE REDACTA CON EL MOTOR DE REDACCIÓN (19-sep-2026) ═══
           Esta tarjeta mandaba sólo `[REDACTAR_DOCUMENTO]`, que enciende el
           PROMPT de redacción pero no el MOTOR: sin marcador de escalón, el
           servidor cae al modelo de chat de siempre. O sea que el mismo
           abogado, pidiendo la misma demanda, recibía un escrito peor por
           usar el botón que por escribirlo a mano con «Redactar» encendido.
           Ahora viaja el escalón que le toca por su plan, igual que el
           compositor. */
        const escalon = draftRequest.nivel === 'platinum'
            ? '[MODO_REDACCION_PLATINUM] '
            : draftRequest.nivel === 'pro'
                ? '[MODO_REDACCION_PRO] '
                : '[MODO_REDACCION] ';
        // Create a special message that triggers draft mode in the backend
        let draftMessage: string;

        if (draftRequest.tipo === 'denuncia_administrativa') {
            // Formato enriquecido para denuncia administrativa
            draftMessage = `${escalon}[REDACTAR_DOCUMENTO]
Tipo: ${draftRequest.tipo}
Subtipo: ${draftRequest.subtipo}
Nivel: ${draftRequest.nivel_autoridad === 'estatal' ? `Estatal (${draftRequest.estado})` : 'Federal'}
Cargo: ${draftRequest.cargo_denunciado || 'Juez'}
Materia: ${draftRequest.materia_denuncia || 'Civil'}
Jurisdicción: ${draftRequest.estado}

Descripción del caso:
${draftRequest.descripcion}`;
        } else {
            draftMessage = `${escalon}[REDACTAR_DOCUMENTO]
Tipo: ${draftRequest.tipo}
Subtipo: ${draftRequest.subtipo}${draftRequest.via ? `\nVía: ${draftRequest.via}` : ''}
Jurisdicción: ${draftRequest.estado}

Descripción del caso:
${draftRequest.descripcion}`;
        }

        onSubmit(draftMessage);
        setActiveMode('search');
    };

    const handleSentenciaSubmit = (sentenciaMessage: string) => {
        onSubmit(sentenciaMessage);
        setActiveMode('search');
    };

    return (
        <>
            <style>{`
                @keyframes textMirror {
                    0% { background-position: -150% center; }
                    100% { background-position: 150% center; }
                }
                @keyframes iconMirror {
                    0% { color: #111111; }
                    40% { color: #111111; }
                    50% { color: #c9a962; }
                    60% { color: #111111; }
                    100% { color: #111111; }
                }
                .mirror-genios-text {
                    background: linear-gradient(
                        110deg,
                        #111111 40%,
                        #c9a962 50%,
                        #111111 60%
                    );
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: textMirror 3s ease-in-out infinite alternate;
                }
            `}</style>
            {/* LA SEÑAL DE QUE SE PUEDE SOLTAR. Sin puntero: si el aviso
                recibiera los eventos del ratón se metería en medio del propio
                arrastre y la cuenta de entradas se descuadraría. */}
            {arrastrando && (
                <div aria-hidden="true"
                     className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-charcoal-900/45 p-6 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed border-[#c9a962] bg-cream-100 px-10 py-8 text-center shadow-2xl">
                        <UploadCloud className="h-9 w-9 text-accent-brown" />
                        <p className="font-serif text-lg text-charcoal-900">Suelte aquí su documento</p>
                        <p className="text-[12px] text-charcoal-600">
                            {EXTENSIONES_ADJUNTO.join(' · ')} — hasta {LIMITE_ADJUNTO_MB} MB, uno por consulta
                        </p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[var(--chat-max)] mx-auto relative z-20">

                {avisoAdjunto && (
                    <div role="status"
                         className="mb-2 flex items-start gap-2 rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[12px] text-charcoal-700">
                        <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-brown" />
                        <span className="min-w-0 flex-1">{avisoAdjunto}</span>
                        <button type="button" onClick={() => setAvisoAdjunto('')} aria-label="Cerrar aviso"
                                className="flex-shrink-0 text-charcoal-400 transition-colors hover:text-charcoal-900">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Main Input Container - Harvey Style */}
                <div className="chat-input-container p-3">
                    {/* La materia ya no se elige aquí (25-sep-2026): se deduce de la
                        consulta. El selector Auto·Civil·Penal·Familiar·Admin salió a
                        petición de David — «que la selección de la materia vaya implícita». */}

                    {/* Attached Document Chip (Legacy location - removing this as it's handled in the input now) */}

                    {/* Text Input — EL TEXTO A TODO LO ANCHO (23-sep-2026). El botón
                        «Fuentes» estuvo aquí unas horas y en el panel estrecho
                        dejaba escribir en una columna de una palabra; David: «hay
                        que guardar simetría y organización, la ventana ya de por
                        sí está limitada». Vive en la fila de herramientas.
                        `min-w-0`: sin él, el cuadro de texto no encoge por debajo
                        de su ancho natural y empuja los botones fuera del borde. */}
                    <div className="flex items-end gap-3">
                        <div className="relative min-w-0 flex-1">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onInput={handleInput}
                                placeholder={attachedDocument
                                    ? "Escribe qué quieres hacer con el documento..."
                                    : placeholder
                                }
                                disabled={isLoading}
                                rows={1}
                                className="w-full resize-none bg-transparent text-charcoal-900 placeholder:text-gray-400 
                             focus:outline-none text-base leading-relaxed py-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ minHeight: '22px', maxHeight: '160px' }}
                            />
                        </div>

                        {/* Attach/Submit Row */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Attached Document Indicator (Condensed) */}
                            {attachedDocument && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md animate-in fade-in zoom-in duration-300">
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[10px] text-blue-800 font-bold uppercase tracking-tight max-w-[60px] truncate">
                                        DOC LISTO
                                    </span>
                                    <button onClick={() => setAttachedDocument(null)} className="hover:text-red-500 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Micrófono y clip sólo en reposo: consultando están
                                deshabilitados, y su hueco lo ocupa la ruedita. Así
                                el grupo de la derecha mide lo mismo en los dos
                                estados y nada se sale del cuadro (antes, en el
                                panel estrecho, el botón de detener quedaba medio
                                fuera del borde). */}
                            {!isLoading && (
                            <button
                                type="button"
                                data-guide="dictado"
                                onClick={toggleListening}
                                className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 ${isListening
                                    ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                                    : 'text-gray-400 hover:text-charcoal-700 hover:bg-gray-100 border border-transparent disabled:opacity-50'
                                    }`}
                                title={isListening ? "Detener dictado" : "Dictado por voz"}
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                            )}

                            {!isLoading && (
                            <button
                                type="button"
                                data-guide="adjuntar"
                                onClick={() => (basico ? tocoCandado() : handleModeClick('files'))}
                                className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 ${attachedDocument
                                    ? 'bg-blue-100 text-blue-600 border border-blue-200'
                                    : 'text-gray-400 hover:text-charcoal-700 hover:bg-gray-100 border border-transparent disabled:opacity-50'
                                    }`}
                                title="Adjuntar documento"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            )}

                            {/* LA RUEDITA QUE NO DEPENDE DE NADA: ni de la
                                ramificación ni de que llegue un solo byte. Un
                                anillo CSS y una palabra, en cualquier navegador.
                                La palabra se pliega en el teléfono; la ruedita,
                                nunca. */}
                            {isLoading && (
                                <span className="inline-flex items-center text-[11px] font-medium text-charcoal-700">
                                    <span className="w-3.5 h-3.5 rounded-full border-2 border-charcoal-900 border-t-transparent animate-spin sm:mr-1.5" />
                                    <span className="hidden sm:inline">Consultando…</span>
                                </span>
                            )}
                            {/* Submit / Stop Button */}
                            {isLoading ? (
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); onStop?.(); }}
                                    className="btn-submit flex-shrink-0 bg-red-500 hover:bg-red-600"
                                    aria-label="Detener respuesta"
                                >
                                    <Square className="w-4 h-4 fill-white" />
                                </button>
                            ) : (
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleSubmit(); }}
                                    disabled={!message.trim() && !attachedDocument}
                                    className="btn-submit flex-shrink-0"
                                    aria-label="Enviar mensaje"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DESPLEGAR / PLEGAR HERRAMIENTAS. El mismo botón en el
                        mismo sitio hace las dos cosas, para que no haya que
                        buscar dónde se cierra lo que se acaba de abrir. Plegado
                        lleva además el resumen de lo elegido —fuero, materia,
                        modo—, que si no queda invisible. */}
                    {basico && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                Con un plan
                            </span>
                            {['Flujos', 'Toulmin', 'Redacción', 'Jurimetría', 'Precedentes', 'Expedientes', 'Carpetas'].map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={tocoCandado}
                                    title={`${h} está disponible en los planes de Iurexia`}
                                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10.5px] font-medium text-gray-400 transition-colors hover:border-[#c9a962]/60 hover:text-charcoal-700"
                                >
                                    <Lock className="h-2.5 w-2.5" />
                                    {h}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* LA FILA DE HERRAMIENTAS: «Fuentes» a la izquierda —donde
                        David lo pidió— y a su lado el mismo interruptor de
                        siempre. En la fila del texto le robaba el ancho a lo que
                        el abogado escribe; aquí ocupa un hueco que ya existía. */}
                    {!basico && (
                    <div className="fila-fuentes mt-2 flex items-center gap-2 border-t border-gray-100 pt-2">
                        <SelectorFuentes estado={estado} disabled={isLoading} />
                        <SelectorEsfuerzo disabled={isLoading} />
                        <button
                            type="button"
                            data-guide="herramientas"
                            onClick={() => setPlegado((v) => !v)}
                            aria-expanded={!plegado}
                            title={plegado
                                ? 'Mostrar las herramientas'
                                : 'Ocultar las herramientas y dejar la caja sencilla'}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[11px] text-gray-500 transition-colors hover:text-charcoal-900"
                        >
                            {plegado
                                ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
                                : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />}
                            {/* En un compositor estrecho basta «Herramientas»: la
                                flecha ya dice hacia dónde, y con el desplegable del
                                esfuerzo al lado la frase entera se salía del cuadro
                                —en el teléfono y en el chat de 420 px junto al
                                documento—. Ver `.fila-fuentes` en globals.css. */}
                            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider">
                                <span className="prefijo-plegar">{plegado ? 'Desplegar ' : 'Plegar '}</span>herramientas
                            </span>
                            {plegado && <span className="hidden min-w-0 truncate sm:inline">{resumenPlegado}</span>}
                        </button>
                    </div>
                    )}

                    {/* Action Cards Row — Blue Cards */}
                    {!basico && !plegado && (
                    <div className="herramientas mt-2 pt-2 border-t border-gray-100">
                        {/* LAS HERRAMIENTAS, EN UNA SOLA FILA (25-sep-2026). El rayo
                            y el globo salieron —la consulta rápida se fue e
                            Internet es ahora una fuente más, en «Fuentes»— y la
                            fila del modo se quedó con Toulmin solo. David: «podemos
                            incorporarlo simétricamente del lado de jurimetría».
                            Cinco columnas iguales cuando hay constructor; cuatro
                            donde no lo hay. Cuando el compositor es estrecho —el
                            teléfono, o el chat reducido a 420 px junto al
                            documento— cada mosaico pone el icono encima de la
                            palabra: ver `.herramientas` en globals.css. */}
                        <div className={`grid ${onAbrirConstructor ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5 w-full`}>

                            <button
                                data-guide="escrito"
                                onClick={() => handleModeClick('draft')}
                                className={`mosaico flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${activeMode === 'draft'
                                        ? 'bg-charcoal-900 text-white shadow-sm ring-1 ring-charcoal-900'
                                        : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <FileEdit className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate"><span className="mosaico-corto">Escrito</span><span className="mosaico-largo">Escrito legal</span></span>
                            </button>

                            <button
                                data-guide="sentencia"
                                onClick={() => canAccessSentencia ? handleModeClick('sentencia') : setShowUpgradeModal('pro')}
                                title={!canAccessSentencia ? 'Plan Pro' : 'Revisa una sentencia'}
                                className={`mosaico flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${!canAccessSentencia
                                        ? 'bg-gray-200 text-gray-400 cursor-pointer'
                                        : activeMode === 'sentencia'
                                            ? 'bg-charcoal-900 text-white shadow-sm ring-1 ring-charcoal-900'
                                            : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <Gavel className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Sentencia</span>
                                {!canAccessSentencia && <Lock className="mosaico-candado w-2 h-2 flex-shrink-0 opacity-60" />}
                            </button>

                            <button
                                data-guide="precedentes"
                                onClick={() => {
                                    if (!canAccessPrecedentes) { setShowUpgradeModal('pro'); return; }
                                    const next = activeMode !== 'precedentes';
                                    setActiveMode(next ? 'precedentes' : 'search');
                                    if (!next) { setSelectedCircuit(null); setTribunalFilter(null); }
                                }}
                                title={!canAccessPrecedentes ? 'Plan Pro' : 'Precedentes federales'}
                                className={`mosaico flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${!canAccessPrecedentes
                                        ? 'bg-gray-200 text-gray-400 cursor-pointer'
                                        : activeMode === 'precedentes'
                                            ? 'bg-charcoal-900 text-white shadow-sm ring-1 ring-charcoal-900'
                                            : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <BookOpen className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Precedentes</span>
                                {!canAccessPrecedentes && <Lock className="mosaico-candado w-2 h-2 flex-shrink-0 opacity-60" />}
                            </button>

                            <button
                                data-guide="jurimetria"
                                onClick={() => {
                                    if (!canAccessJurimetria) { setShowUpgradeModal('platinum'); return; }
                                    setShowJurimetriaModal(true);
                                }}
                                title={!canAccessJurimetria ? 'Plan Platinum' : 'Jurimetría'}
                                className={`mosaico flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                    transition-all duration-200
                                    ${!canAccessJurimetria
                                        ? 'bg-gray-200 text-gray-400 cursor-pointer'
                                        : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                    }`}
                            >
                                <BarChart2 className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">Jurimetría</span>
                                {!canAccessJurimetria && <Lock className="mosaico-candado w-2 h-2 flex-shrink-0 opacity-60" />}
                            </button>

                            {onAbrirConstructor && (
                                <button
                                    type="button"
                                    data-guide="toulmin"
                                    onClick={() => onAbrirConstructor('toulmin')}
                                    aria-pressed={constructorAbierto}
                                    title={constructorAbierto
                                        ? 'Recoger el constructor'
                                        : 'Toulmin: construir una demanda o un recurso con argumentos citados y llevarlo a Word'}
                                    className={`mosaico flex items-center justify-center gap-1 px-1 py-[6px] rounded-md text-[9px] sm:text-[10px] font-medium whitespace-nowrap
                                        transition-all duration-200
                                        ${constructorAbierto
                                            ? 'bg-charcoal-900 text-white shadow-sm ring-2 ring-accent-gold/70'
                                            : 'bg-charcoal-900/90 text-white/90 hover:bg-charcoal-900 hover:text-white'
                                        }`}
                                >
                                    <Network className="w-2.5 h-2.5 flex-shrink-0 text-accent-gold" />
                                    <span className="truncate">Toulmin</span>
                                </button>
                            )}

                        </div>
                    </div>
                    )}

                    {/* ── MODO PRECEDENTES: corte (SCJN/TCC/Ambas) → filtros ────────── */}
                    {!basico && !plegado && activeMode === 'precedentes' && (
                        <div className="mt-2 pt-2 border-t border-[#c9a962]/20 space-y-2">

                            {/* Fila 0: Selector de Corte (SCJN | TCC | Ambas) */}
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0">Corte</span>
                                <div className="inline-flex items-center rounded-md border border-[#c9a962]/40 overflow-hidden bg-white">
                                    <button
                                        onClick={() => { setSelectedCorte('SCJN'); setSelectedSala(null); setSelectedCircuit(null); setTribunalFilter(null); }}
                                        title="Suprema Corte de Justicia de la Nación"
                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-all duration-150 ${
                                            selectedCorte === 'SCJN'
                                                ? 'bg-[#c9a962] text-white'
                                                : 'bg-white text-gray-600 hover:text-[#c9a962]'
                                        }`}
                                    >
                                        <Landmark className="w-3 h-3" />
                                        SCJN
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCorte('TCC'); setSelectedSala(null); setSelectedCircuit('ALL'); setTribunalFilter(null); }}
                                        title="Tribunales Colegiados de Circuito"
                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-all duration-150 border-l border-[#c9a962]/30 ${
                                            selectedCorte === 'TCC'
                                                ? 'bg-[#c9a962] text-white'
                                                : 'bg-white text-gray-600 hover:text-[#c9a962]'
                                        }`}
                                    >
                                        <Gavel className="w-3 h-3" />
                                        TCC
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCorte('ALL'); setSelectedSala(null); setSelectedCircuit(null); setTribunalFilter(null); }}
                                        title="Búsqueda unificada (SCJN + TCC)"
                                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-all duration-150 border-l border-[#c9a962]/30 ${
                                            selectedCorte === 'ALL'
                                                ? 'bg-[#c9a962] text-white'
                                                : 'bg-white text-gray-600 hover:text-[#c9a962]'
                                        }`}
                                    >
                                        <BookOpen className="w-3 h-3" />
                                        Ambas
                                    </button>
                                </div>
                                {selectedCorte === 'ALL' && (
                                    <span className="text-[9px] text-gray-400 italic">SCJN al frente + TCC</span>
                                )}
                            </div>

                            {/* Selector de Sala — solo cuando Corte = SCJN */}
                            {selectedCorte === 'SCJN' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0">Sala</span>
                                    {([
                                        { id: null, label: 'Todas' },
                                        { id: 'PLENO', label: 'Pleno' },
                                        { id: 'PRIMERA_SALA', label: '1ª Sala' },
                                        { id: 'SEGUNDA_SALA', label: '2ª Sala' },
                                    ] as const).map(s => (
                                        <button
                                            key={s.label}
                                            onClick={() => setSelectedSala(s.id)}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-150 border ${
                                                selectedSala === s.id
                                                    ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#c9a962] hover:text-[#c9a962]'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selector de Circuito + Tribunal — solo cuando Corte = TCC */}
                            {selectedCorte === 'TCC' && (
                            <>

                            {/* Fila 1: Circuito */}
                            <div className="flex items-start gap-2">
                                <span className="text-[9px] font-bold text-[#c9a962] uppercase tracking-widest shrink-0 mt-0.5">Circ.</span>
                                <div className="flex flex-wrap gap-[3px]">
                                    {/* Botón "Todos" — búsqueda global */}
                                    <button
                                        onClick={() => { setSelectedCircuit('ALL'); setTribunalFilter(null); }}
                                        title="Buscar en todos los circuitos disponibles"
                                        className={`h-[18px] px-1.5 rounded text-[9px] font-bold transition-all duration-150 border leading-none ${
                                            selectedCircuit === 'ALL'
                                                ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-[#c9a962] hover:text-[#c9a962]'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => {
                                        const avail  = AVAILABLE_CIRCUITS.includes(n);
                                        const active = selectedCircuit === n;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    if (!avail) return;
                                                    setSelectedCircuit(active ? 'ALL' : n);
                                                    setTribunalFilter(null);
                                                }}
                                                title={avail ? `${ORDINAL_ES[n]} Circuito` : `${ORDINAL_ES[n]} Circuito — próximamente`}
                                                className={`w-[18px] h-[18px] rounded text-[9px] font-bold transition-all duration-150 border leading-none ${
                                                    active
                                                        ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                        : avail
                                                            ? 'bg-white text-gray-600 border-gray-300 hover:border-[#c9a962] hover:text-[#c9a962]'
                                                            : 'bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Fila 2: Tribunal — solo cuando hay circuito numérico seleccionado */}
                            {typeof selectedCircuit === 'number' && CIRCUIT_TRIBUNALS[selectedCircuit] ? (
                                <div className="space-y-1">
                                    {/* "Todos" los tribunales del circuito */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest shrink-0 w-[22px]">Trib.</span>
                                        <button
                                            onClick={() => setTribunalFilter(null)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border ${
                                                tribunalFilter === null
                                                    ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#c9a962] hover:text-[#c9a962]'
                                            }`}
                                        >
                                            Todos
                                        </button>
                                    </div>
                                    {/* Circuits 1 & 4: agrupar por materia (ADM / CIV / LAB / PEN) */}
                                    {(selectedCircuit === 1 || selectedCircuit === 2 || selectedCircuit === 3 || selectedCircuit === 4 || selectedCircuit === 6 || selectedCircuit === 16) ? (
                                        (['ADM','CIV','LAB','PEN'] as const).map((grupo) => {
                                            const tribunalesGrupo = CIRCUIT_TRIBUNALS[selectedCircuit as number].filter(t => t.grupo === grupo);
                                            if (tribunalesGrupo.length === 0) return null;
                                            const GRUPO_FULL: Record<string, string> = { ADM: 'Administrativa', CIV: 'Civil', LAB: 'Laboral', PEN: 'Penal' };
                                            const GRUPO_COLOR: Record<string, string> = {
                                                ADM: 'text-teal-700 bg-teal-50 border-teal-200',
                                                CIV: 'text-blue-700 bg-blue-50 border-blue-200',
                                                LAB: 'text-amber-700 bg-amber-50 border-amber-200',
                                                PEN: 'text-rose-700 bg-rose-50 border-rose-200',
                                            };
                                            return (
                                                <div key={grupo} className="flex items-center gap-1 flex-wrap">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded border ${GRUPO_COLOR[grupo]}`} style={{minWidth: '3.5rem', textAlign: 'center'}}>
                                                        {GRUPO_FULL[grupo]}
                                                    </span>
                                                    {tribunalesGrupo.map((t) => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => setTribunalFilter(tribunalFilter === t.id ? null : t.id)}
                                                            title={`${t.label} TCC en Materia ${GRUPO_FULL[grupo]} — ${t.id}`}
                                                            className={`h-[18px] px-1.5 rounded text-[9px] font-bold transition-all duration-150 border leading-none ${
                                                                tribunalFilter === t.id
                                                                    ? 'bg-[#c9a962] text-white border-[#c9a962] shadow-sm'
                                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#c9a962] hover:text-[#c9a962]'
                                                            }`}
                                                        >
                                                            {t.label.replace('°', '')}°
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        /* Otros circuitos: lista horizontal simple */
                                        <div className="flex items-center gap-1.5 flex-wrap pl-[26px]">
                                            {CIRCUIT_TRIBUNALS[selectedCircuit as number].map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => t.available && setTribunalFilter(tribunalFilter === t.id ? null : t.id)}
                                                    title={t.available ? t.label : `${t.label} — próximamente`}
                                                    className={`relative px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border ${
                                                        !t.available
                                                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                            : tribunalFilter === t.id
                                                                ? 'bg-charcoal-900 text-white border-charcoal-900'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {t.label}
                                                    {!t.available && (
                                                        <span className="absolute -top-[5px] -right-[3px] text-[6px] bg-[#c9a962] text-white px-[3px] py-px rounded-sm leading-tight font-bold tracking-tight">
                                                            pronto
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : typeof selectedCircuit === 'number' ? (
                                <p className="text-[9px] text-[#c9a962] italic pl-1">
                                    {ORDINAL_ES[selectedCircuit]} Circuito — próximamente disponible
                                </p>
                            ) : selectedCircuit === 'ALL' ? (
                                <p className="text-[9px] text-gray-400 italic pl-1">
                                    Buscando en todos los circuitos disponibles
                                </p>
                            ) : null}
                            </>
                            )}
                        </div>
                    )}

                    {/* SIN GENIOS NI «AGENTE — DEMANDA DE AMPARO» (25-sep-2026).
                        David: los Genios ya no son rentables —el RAG con
                        gpt-6-luna y la búsqueda en internet los supera— y el
                        agente de demanda lo sustituyen los flujos de trabajo,
                        que viven en la barra lateral. La caja queda en lo
                        esencial. */}

                    {/* El Secretario del PJF ya NO vive aquí (6-ago-2026). Es
                        una función exclusiva de Platinum y trabajo largo, no
                        una opción más de la caja de consulta: se movió a la
                        barra superior, entre Sálvame y Mi trabajo. */}

                </div>
            </div>

            {/* Modals */}
            <FileUploadModal
                isOpen={showFileModal}
                onClose={() => {
                    setShowFileModal(false);
                    setActiveMode('search');
                }}
                onTextExtracted={handleFileExtracted}
            />

            <TextEnhanceModal
                isOpen={showEnhanceModal}
                onClose={() => {
                    setShowEnhanceModal(false);
                    setActiveMode('search');
                }}
                onEnhance={handleEnhanceText}
            />

            <DraftModal
                isPro={isPro}
                isOpen={showDraftModal}
                onClose={() => {
                    setShowDraftModal(false);
                    setActiveMode('search');
                }}
                onDraft={handleDraft}
                estado={estado}
            />

            <SentenciaModal
                isOpen={showSentenciaModal}
                onClose={() => {
                    setShowSentenciaModal(false);
                    setActiveMode('search');
                }}
                onSubmit={handleSentenciaSubmit}
                estado={estado}
            />

            <JurimetriaModal
                isOpen={showJurimetriaModal}
                onClose={() => setShowJurimetriaModal(false)}
                userEmail={user?.email ?? ''}
            />

            {/* Modal de upgrade — aparece al tocar funciones bloqueadas */}
            {showUpgradeModal !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowUpgradeModal(null)}
                >
                    <div
                        className="relative w-full max-w-sm bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl px-7 py-8 text-center animate-in zoom-in-95 fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                            style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                        <div className="mx-auto mb-4 w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-[#c9a962]" />
                        </div>
                        {showUpgradeModal === 'platinum' ? (
                            <>
                                <p className="text-[10px] font-bold tracking-[0.18em] text-[#c9a962] uppercase mb-2">
                                    Función exclusiva Platinum
                                </p>
                                <p className="text-white/80 text-sm leading-relaxed mb-6">
                                    Esta función está disponible en el plan <span className="text-white font-semibold">Platinum</span> de Iurexia — incluye Jurimetría predictiva y Redactor TCC Beta con IA de razonamiento profundo.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-bold tracking-[0.18em] text-[#c9a962] uppercase mb-2">
                                    Función exclusiva Pro
                                </p>
                                <p className="text-white/80 text-sm leading-relaxed mb-6">
                                    Únete al plan <span className="text-white font-semibold">Pro o superior</span> de Iurexia para utilizar las mejores y más potentes funciones de la plataforma.
                                </p>
                            </>
                        )}
                        <div className="flex flex-col gap-2">
                            <a
                                href="/precios"
                                className="block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)', color: '#1a1a1a' }}
                            >
                                {showUpgradeModal === 'platinum' ? 'Ver plan Platinum' : 'Ver planes Pro'}
                            </a>
                            <button
                                onClick={() => setShowUpgradeModal(null)}
                                className="text-white/30 hover:text-white/60 text-xs transition-colors py-1"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function ActionButton({
    icon: Icon,
    label,
    active = false,
    locked = false,
    onClick,
    guideId,
    activeClassName = 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    lockedTitle,
}: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    locked?: boolean;
    onClick?: () => void;
    guideId?: string;
    activeClassName?: string;
    lockedTitle?: string;
}) {
    return (
        <button
            onClick={onClick}
            data-guide={guideId}
            title={locked ? (lockedTitle ?? `${label} — exclusivo Plan Pro`) : label}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${locked
                    ? 'text-gray-300 hover:text-gray-400 hover:bg-gray-50 cursor-pointer'
                    : active
                        ? activeClassName
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {locked && <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />}
        </button>
    );
}

