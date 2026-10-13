'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════
interface FormData {
    // Step 1 — Promovente
    promovente_nombre: string;
    promovente_telefono: string;
    promovente_correo: string;
    promovente_domicilio: string;
    promueve_por_paciente: boolean;
    parentesco: string;
    // Step 2 — Paciente
    paciente_nombre: string;
    paciente_edad: string;
    paciente_diagnostico: string;
    paciente_riesgo: string;
    // Step 3 — Autoridad
    institucion: string;
    hospital_nombre: string;
    hospital_ciudad: string;
    hospital_estado: string;
    hospital_direccion: string;
    director_nombre: string;
    // Step 4 — Situación
    situaciones: string[];
    descripcion_libre: string;
    detalles_medicos_adicionales: string;
    confirma_veracidad: boolean;
}

const INITIAL_FORM: FormData = {
    promovente_nombre: '',
    promovente_telefono: '',
    promovente_correo: '',
    promovente_domicilio: '',
    promueve_por_paciente: false,
    parentesco: '',
    paciente_nombre: '',
    paciente_edad: '',
    paciente_diagnostico: '',
    paciente_riesgo: '',
    institucion: '',
    hospital_nombre: '',
    hospital_ciudad: '',
    hospital_estado: '',
    hospital_direccion: '',
    director_nombre: '',
    situaciones: [],
    descripcion_libre: '',
    detalles_medicos_adicionales: '',
    confirma_veracidad: false,
};

const SITUACION_CHIPS = [
    'Negativa de atención',
    'Negativa de ingreso',
    'Falta de cirugía urgente',
    'Desabasto de medicamento vital',
    'Cancelación injustificada',
    'Demora crítica',
    'Falta de estudios diagnósticos',
    'Falta de ambulancia',
    'Otro',
];

const RIESGO_OPTIONS = [
    { value: 'muerte', label: 'Riesgo de muerte' },
    { value: 'deterioro', label: 'Deterioro grave' },
    { value: 'dolor', label: 'Dolor extremo' },
    { value: 'discapacidad', label: 'Discapacidad inminente' },
    { value: 'otro', label: 'Otro riesgo grave' },
];

const INSTITUCION_OPTIONS = [
    'IMSS',
    'ISSSTE',
    'Secretaría de Salud',
    'Hospital estatal',
    'IMSS-Bienestar',
    'Hospital municipal',
    'Institución privada',
    'Otro',
];

const ESTADOS_MEXICO = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
    'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

const LOADER_MESSAGES = [
    'Analizando la situación médica...',
    'Redactando proemio y datos del quejoso...',
    'Construyendo actos reclamados y hechos...',
    'Fundamentando con artículos constitucionales...',
    'Insertando jurisprudencia aplicable...',
    'Redactando solicitud de suspensión de oficio y de plano...',
    'Elaborando conceptos de violación...',
    'Finalizando puntos petitorios...',
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';


// ═══════════════════════════════════════════════════════════════════
// LA CARA DE SÁLVAME (12-oct-2026)
//
// David: llevar /salvame al diseño nuevo «con imágenes de arte y justicia»,
// donde «la temática de salud es fundamental» — SÓLO diseño: el formulario,
// los campos que viajan, las llamadas al API y el flujo quedan como estaban.
//
// Tres grabados propios en /web/arte, hechos con la técnica de la casa (tinta
// sepia sobre negro, luz dorada): `cabecera` (una anciana grave y la joven
// que la acompaña junto a la cama; David quitó a Themis de la portada),
// `asclepio` (la vara de Asclepio sobre el libro de la ley) y
// `espera` (el pasillo del hospital). Originales y prompts en
// IUREXIA-MAC/arte-web-originales/salvame.
//
// Fuera la cruz roja de los íconos: es un emblema protegido (Ley para el Uso
// y Protección de la Denominación y del Emblema de la Cruz Roja). La salud la
// dice la vara de Asclepio. El carmín se reserva para lo urgente.
// ═══════════════════════════════════════════════════════════════════

const ORO = '#e3c994';
const CARMIN = '#d4675a';

/** La vara de Asclepio: una sola serpiente en un bastón. */
const Asclepio = ({ size = 20, color = ORO }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2.5v19" strokeWidth="1.7" />
        <path d="M10.2 4.6c1.2-.9 3.4-.6 3.6.6.3 1.6-3.6 1.7-3.7 3.5-.1 1.8 4 1.8 3.9 3.7-.1 1.9-4 1.9-4 3.7 0 1.6 2.9 1.9 3.9 1" />
        <circle cx="10.4" cy="4.4" r="0.55" fill={color} stroke="none" />
    </svg>
);

/** Filete con la vara al centro: separa sin el electrocardiograma de antes. */
const Filete = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.7 }} aria-hidden>
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(227,201,148,0.35))' }} />
        <Asclepio size={18} />
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(227,201,148,0.35), transparent)' }} />
    </div>
);

const ShieldCheck = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

const HospitalIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 8h6M12 8v8M9 12h6" />
    </svg>
);

const ChartIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);

const DownloadIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const CheckCircle = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const AlertTriangleIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const ArrowLeft = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
);

const ArrowRight = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);

const CopyIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const PrinterIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
    </svg>
);

/* LA PRIMERA HOJA DEL ESCRITO (12-oct-2026). Donde había tres barras grises
   («Buscando jurisprudencia…») que no mostraban nada, va el arranque real de la
   demanda: el encabezado y los ocho apartados que exige SALVAME_SYSTEM_PROMPT
   en el API (main.py), con la suspensión de plano y sus 4 tesis verificadas. */
const APARTADOS = [
    'Nombre y domicilio de la persona quejosa',
    'Persona tercera interesada',
    'Autoridades responsables',
    'Acto reclamado',
    'Hechos, bajo protesta de decir verdad',
    'Preceptos constitucionales violados',
    'Conceptos de violación',
    'Suspensión de oficio y de plano',
];
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function MuestraEscrito() {
    const tinta = '#2a251e';
    const gris = '#8a7d66';
    return (
        <figure style={{ margin: 0, justifySelf: 'center', width: '100%', maxWidth: 470 }}>
            <div className="result-text" style={{ maxHeight: 'none', overflow: 'visible', padding: '34px 34px 30px', fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'normal', transform: 'rotate(-0.6deg)' }}>
                <div style={{ textAlign: 'right', fontWeight: 700, letterSpacing: '0.08em', color: '#9a2a20', fontSize: 11.5 }}>
                    EXTREMA URGENCIA<br />AMPARO INDIRECTO
                </div>
                <div style={{ margin: '14px 0 12px', color: tinta }}>
                    <div><strong>QUEJOSO:</strong> <span style={{ color: gris }}>[nombre del paciente]</span></div>
                    <div><strong>PROMOVENTE:</strong> <span style={{ color: gris }}>[su nombre]</span>, en términos del artículo 15 de la Ley de Amparo.</div>
                    <div style={{ marginTop: 6 }}><strong>ASUNTO:</strong> SE PROMUEVE DEMANDA DE AMPARO INDIRECTO Y SE SOLICITA SUSPENSIÓN DE OFICIO Y DE PLANO.</div>
                </div>
                <div style={{ fontWeight: 700, color: tinta, fontSize: 11.5 }}>
                    C. JUEZ DE DISTRITO EN MATERIA DE AMPARO CIVIL, ADMINISTRATIVO Y DE TRABAJO Y DE JUICIOS FEDERALES EN TURNO<br />P R E S E N T E.
                </div>
                <div style={{ height: 1, background: '#d8cfbd', margin: '14px 0 10px' }} />
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {APARTADOS.map((t, i) => {
                        const clave = i === APARTADOS.length - 1;
                        return (
                            <li key={t} style={{
                                display: 'flex', gap: 8, alignItems: 'baseline', padding: clave ? '6px 8px' : '2.5px 0',
                                margin: clave ? '6px -8px 0' : 0, borderRadius: 4,
                                background: clave ? 'rgba(201,169,98,0.22)' : 'transparent',
                                color: tinta, fontWeight: clave ? 700 : 400,
                            }}>
                                <span style={{ minWidth: 30, color: clave ? tinta : gris, fontWeight: 700 }}>{ROMANOS[i]}.</span>
                                <span>{t}{clave && <span style={{ display: 'block', fontWeight: 400, fontSize: 11.5, color: '#5b5142' }}>Con 4 tesis verificadas, citadas textualmente (art. 126 LA)</span>}</span>
                            </li>
                        );
                    })}
                </ol>
                <div style={{ height: 1, background: '#d8cfbd', margin: '12px 0 8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: gris, fontSize: 11, letterSpacing: '0.04em' }}>
                    <span>PUNTOS PETITORIOS</span><span>PROTESTO LO NECESARIO</span>
                </div>
            </div>
            <figcaption style={{ marginTop: 16, fontSize: 12.5, color: '#7d7466', textAlign: 'center', lineHeight: 1.5 }}>
                Así empieza el escrito que entrega Sálvame: la estructura que pide el juez de distrito.
            </figcaption>
        </figure>
    );
}

// ═══════════════════════════════════════════════════════════════════
// STEP LABELS
// ═══════════════════════════════════════════════════════════════════
const STEP_LABELS = [
    '¿Quién presenta?',
    'Paciente',
    'Autoridad responsable',
    '¿Qué está pasando?',
];

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SalvamePage() {
    const { loading: authLoading, isAuthenticated, user, session } = useAuth();
    const router = useRouter();

    // ─── Form State ─────────────────────────────────────────────
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormData>(INITIAL_FORM);
    const [phase, setPhase] = useState<'intro' | 'form' | 'generating' | 'result'>('intro');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const [error, setError] = useState('');
    const [loaderIdx, setLoaderIdx] = useState(0);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [juzgadoInfo, setJuzgadoInfo] = useState<{ denominacion_turno: string; direccion_oficialia: string; telefono?: string; nota?: string } | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // ─── Loader rotation ──────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'generating') return;
        const interval = setInterval(() => {
            setLoaderIdx(prev => (prev + 1) % LOADER_MESSAGES.length);
        }, 3200);
        return () => clearInterval(interval);
    }, [phase]);

    // ─── Helpers ──────────────────────────────────────────────────
    const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const toggleSituacion = (s: string) => {
        setForm(prev => ({
            ...prev,
            situaciones: prev.situaciones.includes(s)
                ? prev.situaciones.filter(x => x !== s)
                : [...prev.situaciones, s],
        }));
    };

    // ─── Render formatted text (parse markdown-like output) ────
    const renderFormattedText = (text: string) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();

            // Empty line → spacer
            if (!trimmed) return <div key={i} style={{ height: 12 }} />;

            // Horizontal rule
            if (/^-{3,}$/.test(trimmed)) return <hr key={i} style={{ border: 'none', borderTop: '1px solid #d8cfbd', margin: '16px 0' }} />;

            // ## Heading
            if (trimmed.startsWith('## ')) {
                const headingText = trimmed.replace(/^#+\s*/, '');
                return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: '#1d1a16', margin: '20px 0 8px', textTransform: 'uppercase' }}>{headingText}</h3>;
            }
            if (trimmed.startsWith('# ')) {
                const headingText = trimmed.replace(/^#+\s*/, '');
                return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: '#1d1a16', margin: '24px 0 8px', textAlign: 'center' }}>{headingText}</h2>;
            }

            // Bullet line
            const isBullet = /^[-•]\s+/.test(trimmed);
            const bulletText = isBullet ? trimmed.replace(/^[-•]\s+/, '') : trimmed;

            // Parse inline **bold** markers
            const parseInlineBold = (str: string) => {
                const parts = str.split(/(\*\*.*?\*\*)/g);
                return parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} style={{ fontWeight: 700, color: '#1d1a16' }}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                });
            };

            // Check if the whole line is ALL-CAPS header style
            const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length < 120 && /[A-ZÁÉÍÓÚÑÜ]/.test(trimmed);

            if (isBullet) {
                return (
                    <div key={i} style={{ display: 'flex', gap: 8, paddingLeft: 16, marginBottom: 4 }}>
                        <span style={{ color: '#8a7d66', flexShrink: 0 }}>•</span>
                        <span>{parseInlineBold(bulletText)}</span>
                    </div>
                );
            }

            return (
                <p key={i} style={{
                    margin: '4px 0',
                    fontWeight: isAllCaps ? 700 : 400,
                    textAlign: isAllCaps && trimmed.length < 60 ? 'center' : 'justify',
                    ...(isAllCaps && { color: '#1d1a16' }),
                }}>
                    {parseInlineBold(bulletText)}
                </p>
            );
        });
    };

    // ─── Convert markdown to HTML string (for print) ──────────
    const markdownToHtml = (text: string): string => {
        return text
            .split('\n')
            .map(line => {
                const t = line.trim();
                if (!t) return '<br/>';
                if (/^-{3,}$/.test(t)) return '<hr/>';
                if (t.startsWith('## ')) return `<h3 style="text-align:center;font-size:14pt;">${t.replace(/^#+\s*/, '')}</h3>`;
                if (t.startsWith('# ')) return `<h2 style="text-align:center;font-size:16pt;">${t.replace(/^#+\s*/, '')}</h2>`;
                // Inline bold
                const parsed = t.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                // Bullet
                if (/^[-•]\s+/.test(t)) return `<p style="padding-left:2em;">• ${parsed.replace(/^[-•]\s+/, '')}</p>`;
                return `<p>${parsed}</p>`;
            })
            .join('\n');
    };

    const canProceed = (): boolean => {
        switch (step) {
            case 0: return !!(form.promovente_nombre.trim() && form.promovente_domicilio.trim());
            case 1: return !!(form.paciente_nombre.trim() && form.paciente_edad.trim() && form.paciente_diagnostico.trim() && form.paciente_riesgo);
            case 2: return !!(form.institucion && form.hospital_nombre.trim() && form.hospital_ciudad.trim() && form.hospital_estado);
            case 3: return !!(form.situaciones.length > 0 && form.confirma_veracidad);
            default: return false;
        }
    };

    // ─── Generate Amparo ──────────────────────────────────────────
    const handleGenerate = async () => {
        setPhase('generating');
        setError('');
        setGeneratedText('');
        setLoaderIdx(0);

        try {
            const res = await fetch(`${API_URL}/generate-amparo-salud`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    ...form,
                    user_email: user?.email || '',
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
                throw new Error(errData.detail || `Error ${res.status}`);
            }

            // Streaming response
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;
                    setGeneratedText(fullText);
                }
            }

            setPhase('result');
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);

            // Fetch juzgado info for the hospital's state
            try {
                const jRes = await fetch(`${API_URL}/juzgados-distrito?estado=${encodeURIComponent(form.hospital_estado)}`);
                if (jRes.ok) {
                    const jData = await jRes.json();
                    if (jData.denominacion_turno) {
                        setJuzgadoInfo({
                            denominacion_turno: jData.denominacion_turno,
                            direccion_oficialia: jData.direccion_oficialia,
                            telefono: jData.telefono,
                            nota: jData.nota,
                        });
                    }
                }
            } catch { /* silently fail — juzgado info is optional */ }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al generar el amparo');
            setPhase('form');
        }
    };

    // ─── Download DOCX ────────────────────────────────────────────
    const handleDownloadDocx = async () => {
        setDownloading(true);
        try {
            const res = await fetch(`${API_URL}/export-amparo-salud-docx`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    amparo_text: generatedText,
                    promovente_nombre: form.promovente_nombre,
                    paciente_nombre: form.paciente_nombre,
                }),
            });
            if (!res.ok) throw new Error('Error al exportar DOCX');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Amparo_Salud_${form.paciente_nombre.replace(/\s/g, '_')}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Error al descargar el documento');
        } finally {
            setDownloading(false);
        }
    };

    // ─── Copy text ────────────────────────────────────────────────
    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ─── Print ────────────────────────────────────────────────────
    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
      <html><head><title>Amparo de Salud</title>
      <style>body{font-family:Arial,sans-serif;font-size:14pt;margin:2.5cm;line-height:1.8;text-align:justify;}h2,h3{text-align:center;}p{margin:4px 0;}</style>
      </head><body>${markdownToHtml(generatedText)}</body></html>
    `);
        w.document.close();
        w.print();
    };

    // ─── Auth loading ─────────────────────────────────────────────
    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0e0d' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(227,201,148,0.2)', borderTopColor: ORO, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } } `}</style>
            </div>
        );
    }

    const empezar = () => {
        if (isAuthenticated) {
            setPhase('form');
        } else {
            router.push('/login?redirect=/salvame');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="sv-raiz">

            {/* ─── ESTILOS ──────────────────────────────────────────────── */}
            <style>{`
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes latido { 0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px -10px rgba(184,56,44,0.55); } 50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 34px -8px rgba(212,103,90,0.75); } }
.sv-raiz { min-height: 100vh; background: #0f0e0d; color: #efe6d6; font-family: var(--font-sans), Inter, 'Segoe UI', system-ui, sans-serif; overflow-x: clip; }
.sv-serif { font-family: var(--font-serif), 'Playfair Display', Georgia, serif; font-weight: 400; }
.sv-marca { font-family: var(--font-marca), 'Playfair Display', Georgia, serif; font-weight: 600; }
.sv-rotulo { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: ${ORO}; font-weight: 600; }
.sv-panel { border: 1px solid; border-radius: 16px; }
.sv-etiqueta { font-size: 13px; color: #b9ad98; margin-bottom: 6px; display: block; }
.sv-ayuda { font-size: 11.5px; color: #7d7466; margin-top: 5px; line-height: 1.5; }
.salvame-input, .salvame-select, .salvame-textarea { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(227,201,148,0.16); background: #1a1816; color: #efe6d6; font-size: 15px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
.salvame-input:focus, .salvame-select:focus, .salvame-textarea:focus { border-color: #c9a962; box-shadow: 0 0 0 3px rgba(201,169,98,0.16); }
.salvame-input::placeholder, .salvame-textarea::placeholder { color: #6f675b; }
.salvame-select { appearance: none; cursor: pointer; background: #1a1816 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c9a962' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center; }
.salvame-textarea { resize: vertical; min-height: 120px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(227,201,148,0.16); background: #1a1816; color: #b9ad98; font-size: 14px; cursor: pointer; transition: all 0.2s; user-select: none; font-family: inherit; }
.chip:hover { border-color: #c9a962; color: #efe6d6; }
.chip.active { background: rgba(201,169,98,0.14); border-color: #c9a962; color: #f3e4c8; }
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 14px 30px; border-radius: 12px; border: 1px solid #5e1510; color: #fff7ef; font-size: 16px; font-weight: 600; letter-spacing: 0.01em; cursor: pointer; font-family: inherit; transition: transform 0.25s, filter 0.25s; background: linear-gradient(180deg, #b8382c 0%, #9a2a20 55%, #7d1f17 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px -10px rgba(184,56,44,0.55); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 12px; border: 1px solid rgba(227,201,148,0.28); background: transparent; color: #f3e4c8; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s, border-color 0.2s; font-family: inherit; }
.btn-secondary:hover { border-color: rgba(227,201,148,0.55); background: rgba(255,255,255,0.04); }
.result-text { white-space: pre-wrap; line-height: 1.85; font-size: 15.5px; color: #2a251e; padding: 44px 48px; border-radius: 6px; max-height: 680px; overflow-y: auto; font-family: var(--font-lectura), Newsreader, Georgia, serif; background-color: #f6f1e7; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)' opacity='0.08'/></svg>"); box-shadow: 0 1px 0 rgba(0,0,0,0.6), 0 30px 60px -30px rgba(0,0,0,0.9); }

.sv-hero { position: relative; min-height: min(88vh, 780px); display: flex; align-items: center; overflow: hidden; }
.sv-hero-arte { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 72% center; }
.sv-hero-velo { position: absolute; inset: 0; background: linear-gradient(90deg, #0f0e0d 0%, rgba(15,14,13,0.94) 28%, rgba(15,14,13,0.4) 56%, rgba(15,14,13,0) 78%), linear-gradient(180deg, rgba(15,14,13,0) 70%, #0f0e0d 100%); }
.sv-hero-contenido { position: relative; z-index: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 96px 32px 72px; }
.sv-hero-columna { max-width: 560px; }
.sv-banda { position: relative; overflow: hidden; }
.sv-banda-arte { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sv-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.sv-tres { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.sv-par { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

@media (max-width: 820px) {
    .sv-hero { display: block; min-height: 0; }
    .sv-hero-arte { position: relative; display: block; height: 46vh; min-height: 280px; object-position: 76% 35%; }
    .sv-hero-velo { inset: 0 0 auto 0; height: 46vh; min-height: 280px; background: linear-gradient(180deg, rgba(15,14,13,0) 50%, #0f0e0d 100%); }
    .sv-hero-contenido { margin-top: -56px; padding: 0 20px 56px; }
    .sv-dos { grid-template-columns: 1fr; gap: 32px; }
    .sv-tres { grid-template-columns: 1fr; }
    .result-text { padding: 28px 22px; }
}
@media (max-width: 480px) {
    .sv-par { grid-template-columns: 1fr; }
}
@media (max-width: 400px) {
    .sv-de-iurexia { display: none; }
}
`}</style>

            {/* ─── BARRA SUPERIOR ──────────────────────────────────────── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50, padding: '12px 20px',
                background: 'rgba(15,14,13,0.88)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(227,201,148,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <button
                        onClick={() => router.push('/plataforma')}
                        style={{ background: 'none', border: 'none', color: '#b9ad98', cursor: 'pointer', padding: 6, display: 'flex' }}
                        title="Volver"
                        aria-label="Volver"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <Asclepio size={22} />
                    <span className="sv-serif" style={{ fontSize: 20, color: '#f3e4c8', whiteSpace: 'nowrap' }}>Sálvame</span>
                    <span className="sv-de-iurexia" style={{ fontSize: 12, color: '#7d7466', whiteSpace: 'nowrap' }}>de <span className="sv-marca" style={{ color: '#b9ad98' }}>Iurexia</span></span>
                </div>
                <span style={{ fontSize: 11, color: ORO, padding: '4px 10px', border: '1px solid rgba(227,201,148,0.3)', borderRadius: 999, whiteSpace: 'nowrap' }}>Módulo gratuito</span>
            </header>

            {/* ─── PORTADA Y PRESENTACIÓN ───────────────────────────────── */}
            {phase === 'intro' && (
                <div style={{ animation: 'fadeIn 0.8s ease-out' }}>

                    {/* Portada: la anciana grave y la joven que la acompaña */}
                    <section className="sv-hero">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/web/arte/cabecera.webp" alt="" className="sv-hero-arte" />
                        <div className="sv-hero-velo" />
                        <div className="sv-hero-contenido">
                            <div className="sv-hero-columna">
                                <p className="sv-rotulo" style={{ margin: '0 0 18px' }}>Amparo de emergencia por salud · Gratuito</p>
                                <h1 className="sv-serif" style={{ fontSize: 'clamp(3.2rem, 8vw, 5.6rem)', lineHeight: 1, margin: '0 0 18px', color: '#f3e4c8', letterSpacing: '-0.01em' }}>
                                    Sálvame
                                </h1>
                                <p className="sv-serif" style={{ fontSize: 'clamp(1.25rem, 2.4vw, 1.6rem)', color: '#e8dcc6', margin: '0 0 22px', lineHeight: 1.35, fontStyle: 'italic' }}>
                                    La justicia, a la cabecera del paciente.
                                </p>
                                <p style={{ fontSize: '1.0625rem', color: '#b9ad98', margin: '0 0 34px', lineHeight: 1.7 }}>
                                    Si te niegan atención hospitalaria, una cirugía urgente o medicamento vital, el tiempo es crucial. Genera tu demanda de amparo federal en minutos usando Inteligencia Artificial.
                                </p>

                                <button className="btn-primary" onClick={empezar}
                                    style={{ padding: '17px 34px', fontSize: '1.0625rem', animation: 'latido 3s ease-in-out infinite' }}>
                                    <Asclepio size={20} color="#fff7ef" />
                                    Generar amparo ahora, gratis
                                </button>

                                {!isAuthenticated && (
                                    <p style={{ marginTop: 14, color: '#b9ad98', fontSize: '0.95rem' }}>
                                        Lo único que tienes que hacer es registrarte, <span style={{ color: '#f3e4c8' }}>te tomará un minuto</span>.
                                    </p>
                                )}

                                <p style={{ marginTop: 26, display: 'flex', alignItems: 'flex-start', gap: 8, color: '#b9ad98', fontSize: 13, lineHeight: 1.55, maxWidth: 480 }}>
                                    <span style={{ color: CARMIN, flexShrink: 0, marginTop: 1 }}><AlertTriangleIcon size={16} /></span>
                                    <span><strong style={{ color: CARMIN, fontWeight: 600 }}>Si hay peligro inmediato de vida</strong>, acude primero a urgencias y solicita atención inmediata.</span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Por qué creamos Sálvame: el pasillo del hospital */}
                    <section className="sv-banda" style={{ padding: '110px 24px', borderTop: '1px solid rgba(227,201,148,0.08)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/web/arte/espera.webp" alt="" className="sv-banda-arte" style={{ opacity: 0.5 }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0f0e0d 0%, rgba(15,14,13,0.55) 22%, rgba(15,14,13,0.7) 50%, rgba(15,14,13,0.55) 78%, #0f0e0d 100%), radial-gradient(60% 70% at 50% 50%, rgba(15,14,13,0.85), rgba(15,14,13,0) 100%)' }} />
                        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
                            <p className="sv-rotulo" style={{ margin: '0 0 16px' }}>Nuestra razón</p>
                            <h2 className="sv-serif" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: '#f3e4c8', margin: '0 0 28px', lineHeight: 1.15 }}>
                                Por qué creamos Sálvame
                            </h2>
                            <p style={{ color: '#d6cab4', fontSize: '1.0625rem', lineHeight: 1.8, marginBottom: 18 }}>
                                Creamos Iurexia con la mente, pero programamos SÁLVAME con el corazón. Conocemos la desesperación de las salas de espera y la profunda indignidad de tener que suplicar por atención médica. Sabemos que, cuando la vida pende de un hilo, el sentimiento de impotencia es devastador.
                            </p>
                            <p style={{ color: '#d6cab4', fontSize: '1.0625rem', lineHeight: 1.8, marginBottom: 18 }}>
                                Esta herramienta es nuestra respuesta a la soledad institucional que enfrentamos millones de mexicanos. No importa quién seas, cuánto tengas o dónde te encuentres: ante el dolor, la urgencia y el silencio por parte del personal de salud, Iurexia te toma de la mano. Te entregamos una poderosa herramienta para hacer efectivo tu derecho humano a la salud.
                            </p>
                            <p style={{ color: '#d6cab4', fontSize: '1.0625rem', lineHeight: 1.8, margin: 0 }}>
                                Pusimos la tecnología más avanzada del mundo al servicio de lo más importante que existe: la salud de ti, de tus seres queridos, o de cualquier persona en grave riesgo ante la indiferencia y desatención de un hospital.
                            </p>
                        </div>
                    </section>

                    {/* Cifras */}
                    <section style={{ padding: '24px 24px 96px' }}>
                        <div className="sv-tres" style={{ maxWidth: 1100, margin: '0 auto' }}>
                            {[
                                { cifra: '50.4M', titulo: 'Mexicanos sin acceso a la salud', texto: 'Más de 50.4 millones de personas experimentaron carencia por acceso a los servicios de salud (39.1% de la población).', fuente: 'CONEVAL (2022)' },
                                { cifra: '15M+', titulo: 'Recetas no surtidas', texto: 'Más de 15 millones de recetas médicas no fueron surtidas efectivamente en instituciones de salud pública en un nivel reciente.', fuente: 'Colectivo Cero Desabasto' },
                                { cifra: '24h', titulo: 'Derecho a la suspensión', texto: 'Los jueces federales otorgan suspensiones de plano en menos de 24 horas cuando hay peligro inminente de pérdida de la vida.', fuente: 'Ley de Amparo, Arts. 15, 126' },
                            ].map((c) => (
                                <div key={c.cifra} className="tarjeta-negra sv-panel" style={{ padding: '36px 28px', textAlign: 'center' }}>
                                    <div className="sv-serif" style={{ fontSize: '3.2rem', color: ORO, lineHeight: 1, marginBottom: 16 }}>{c.cifra}</div>
                                    <div style={{ fontSize: '1.0625rem', color: '#f3e4c8', fontWeight: 600, marginBottom: 10 }}>{c.titulo}</div>
                                    <div style={{ color: '#9d927f', fontSize: '0.95rem', lineHeight: 1.6 }}>{c.texto}</div>
                                    <span style={{ display: 'block', marginTop: 16, fontSize: '0.78rem', color: '#6f675b', fontStyle: 'italic' }}>Fuente: {c.fuente}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* El amparo salva vidas: la vara de Asclepio sobre la ley */}
                    <section style={{ padding: '0 24px 96px' }}>
                        <div className="sv-dos" style={{ maxWidth: 1100, margin: '0 auto' }}>
                            <div>
                                <p className="sv-rotulo" style={{ margin: '0 0 14px' }}>La ley protege la vida</p>
                                <h3 className="sv-serif" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.5rem)', margin: '0 0 22px', color: '#f3e4c8', lineHeight: 1.15 }}>El juicio de amparo salva vidas</h3>
                                <p style={{ fontSize: '1.0625rem', color: '#b9ad98', marginBottom: 18, lineHeight: 1.75 }}>
                                    El Juicio de Amparo no es solo para grandes corporativos, es un derecho diseñado para <span style={{ color: '#f3e4c8', fontWeight: 600 }}>proteger al ciudadano común</span> contra omisiones de la autoridad.
                                </p>
                                <p style={{ fontSize: '1.0625rem', color: '#b9ad98', margin: 0, lineHeight: 1.75 }}>
                                    Al presentar este documento, un Juez de Distrito de la Federación obliga legalmente al hospital o institución de salud (IMSS, ISSSTE, local) a brindarte la atención médica o el medicamento que te niegan.
                                </p>
                            </div>
                            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(227,201,148,0.18)', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.95)', maxWidth: 460, justifySelf: 'center', width: '100%' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/web/arte/asclepio.webp" alt="La vara de Asclepio sobre un libro de leyes abierto, junto a una balanza y un mazo" style={{ display: 'block', width: '100%', height: 'auto' }} />
                            </div>
                        </div>
                    </section>

                    {/* Respaldo y tecnología legal */}
                    <section style={{ padding: '0 24px 96px' }}>
                        <div className="sv-dos" style={{ maxWidth: 1100, margin: '0 auto' }}>
                            <MuestraEscrito />
                            <div>
                                <p className="sv-rotulo" style={{ margin: '0 0 14px' }}>El motor de Iurexia</p>
                                <h3 className="sv-serif" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.5rem)', margin: '0 0 22px', color: '#f3e4c8', lineHeight: 1.15 }}>Respaldo y tecnología legal</h3>
                                <p style={{ fontSize: '1.0625rem', color: '#b9ad98', marginBottom: 18, lineHeight: 1.75 }}>
                                    SÁLVAME utiliza el motor de inteligencia artificial jurídica más avanzado de México (<span style={{ color: ORO }}>Iurexia Legal AI</span>). La demanda que generas cuenta con los más altos estándares técnicos.
                                </p>
                                <p style={{ fontSize: '1.0625rem', color: '#b9ad98', margin: 0, lineHeight: 1.75 }}>
                                    El sistema fundamenta tu demanda con los <span style={{ color: '#f3e4c8', fontWeight: 600 }}>artículos 1, 4 y 22 de la Constitución</span> y la Ley de Amparo, y cita textualmente <span style={{ color: '#f3e4c8', fontWeight: 600 }}>cuatro tesis verificadas</span> sobre la suspensión de oficio y de plano. Nunca inventa jurisprudencia.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Llamado final, con Themis al fondo */}
                    <section className="sv-banda" style={{ padding: '96px 24px', borderTop: '1px solid rgba(227,201,148,0.08)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/web/arte/themis.webp" alt="" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 'auto', opacity: 0.3, maskImage: 'linear-gradient(90deg, transparent, #000 55%), linear-gradient(180deg, transparent, #000 18%, #000 80%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 55%), linear-gradient(180deg, transparent, #000 18%, #000 80%, transparent)', maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }} />
                        <div className="tarjeta-negra sv-panel" style={{ position: 'relative', maxWidth: 760, margin: '0 auto', padding: 'clamp(36px, 6vw, 60px) clamp(22px, 5vw, 48px)', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: CARMIN, background: 'rgba(212,103,90,0.1)', border: '1px solid rgba(212,103,90,0.25)', padding: '8px 16px', borderRadius: 999, fontSize: '0.9rem', fontWeight: 600, marginBottom: 26 }}>
                                <AlertTriangleIcon size={17} />
                                Uso exclusivo para emergencias reales
                            </div>
                            <h2 className="sv-serif" style={{ fontSize: 'clamp(2rem, 4.4vw, 2.75rem)', margin: '0 0 18px', color: '#f3e4c8', lineHeight: 1.15 }}>
                                Protege la vida de tus seres queridos hoy.
                            </h2>
                            <p style={{ fontSize: '1.0625rem', color: '#b9ad98', margin: '0 auto 34px', maxWidth: 560, lineHeight: 1.7 }}>
                                No necesitas cuenta premium ni conocimientos legales. Completa un breve formulario y obtén tu demanda lista para imprimir y presentar en el juzgado.
                            </p>
                            <button className="btn-primary" onClick={empezar} style={{ padding: '18px 40px', fontSize: '1.125rem' }}>
                                <Asclepio size={20} color="#fff7ef" />
                                Comenzar proceso gratuito
                            </button>
                            {!isAuthenticated && (
                                <p style={{ marginTop: 14, color: '#b9ad98', fontSize: '0.95rem' }}>
                                    Lo único que tienes que hacer es registrarte, <span style={{ color: '#f3e4c8' }}>te tomará un minuto</span>.
                                </p>
                            )}
                            <p style={{ marginTop: 24, color: '#7d7466', fontSize: '0.9rem' }}>
                                Responsabilidad social de <strong style={{ color: '#d6cab4', fontWeight: 600 }}>Iurexia Technologies</strong>
                            </p>
                        </div>
                    </section>

                </div>
            )}

            {/* ─── CABECERA DEL FORMULARIO ─────────────────────────────── */}
            {phase === 'form' && step === 0 && (
                <section className="sv-banda" style={{ padding: '56px 24px 36px', animation: 'fadeIn 0.6s ease-out' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/web/arte/cabecera.webp" alt="" className="sv-banda-arte" style={{ opacity: 0.4, objectPosition: '80% 40%' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0f0e0d 0%, rgba(15,14,13,0.8) 45%, rgba(15,14,13,0.35) 100%), linear-gradient(180deg, rgba(15,14,13,0) 55%, #0f0e0d 100%)' }} />
                    <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
                        <p className="sv-rotulo" style={{ margin: '0 0 12px' }}>Amparo de emergencia por salud</p>
                        <h1 className="sv-serif" style={{ fontSize: 'clamp(2.4rem, 6vw, 3.25rem)', color: '#f3e4c8', margin: '0 0 12px', lineHeight: 1.05 }}>
                            Sálvame
                        </h1>
                        <p style={{ fontSize: 16, color: '#b9ad98', lineHeight: 1.6, margin: '0 0 22px' }}>
                            Si te niegan atención, cirugía o medicamento vital, genera tu escrito en minutos.
                        </p>
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 18px',
                            background: 'rgba(212,103,90,0.08)', borderRadius: 12, border: '1px solid rgba(212,103,90,0.25)',
                        }}>
                            <span style={{ color: CARMIN, flexShrink: 0 }}><AlertTriangleIcon size={20} /></span>
                            <p style={{ fontSize: 13, color: '#b9ad98', margin: 0, lineHeight: 1.55 }}>
                                <strong style={{ color: CARMIN }}>Si hay peligro inmediato de vida</strong>, acude a urgencias y solicita atención inmediata.
                                Este módulo ayuda a documentar y exigir atención mediante una demanda de amparo.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ─── PASOS ────────────────────────────────────────────────── */}
            {phase === 'form' && (
                <div style={{ maxWidth: 640, margin: '0 auto', padding: `${step === 0 ? 8 : 40}px 24px 8px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                        {STEP_LABELS.map((label, i) => (
                            <div key={i} style={{ flex: i < STEP_LABELS.length - 1 ? 1 : '0 0 auto', display: 'flex', alignItems: 'center' }}>
                                <div className="sv-serif" style={{
                                    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 15, flexShrink: 0, transition: 'all 0.3s',
                                    background: i < step ? '#c9a962' : i === step ? 'rgba(201,169,98,0.14)' : '#1a1816',
                                    color: i < step ? '#171614' : i === step ? '#f3e4c8' : '#6f675b',
                                    border: i === step ? '1.5px solid #c9a962' : '1px solid rgba(227,201,148,0.18)',
                                }}>
                                    {i < step ? <CheckCircle size={16} /> : i + 1}
                                </div>
                                {i < STEP_LABELS.length - 1 && (
                                    <div style={{ flex: 1, height: 1.5, background: i < step ? '#c9a962' : 'rgba(227,201,148,0.14)', margin: '0 6px', transition: 'background 0.3s' }} />
                                )}
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#7d7466', textAlign: 'center', margin: '0 0 10px', letterSpacing: '0.04em' }}>
                        Paso {step + 1} de 4 — <span style={{ color: '#b9ad98' }}>{STEP_LABELS[step]}</span>
                    </p>
                </div>
            )}

            {/* ─── FORMULARIO ───────────────────────────────────────────── */}
            {phase === 'form' && (
                <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 40px', animation: 'slideUp 0.4s ease-out' }} key={step}>

                    <div className="tarjeta-negra sv-panel" style={{ padding: '30px 26px' }}>

                        {/* ─── PASO 1: PROMOVENTE ────────────────────────── */}
                        {step === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 className="sv-serif" style={{ fontSize: 22, color: '#f3e4c8', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span style={{ color: ORO, fontSize: 15 }}>01</span> ¿Quién presenta la demanda?
                                </h3>
                                <div>
                                    <label className="sv-etiqueta">Nombre completo del promovente *</label>
                                    <input className="salvame-input" placeholder="Ej. María López García" value={form.promovente_nombre}
                                        onChange={e => updateField('promovente_nombre', e.target.value)} />
                                </div>
                                <div className="sv-par">
                                    <div>
                                        <label className="sv-etiqueta">Teléfono (opcional)</label>
                                        <input className="salvame-input" placeholder="55 1234 5678" value={form.promovente_telefono}
                                            onChange={e => updateField('promovente_telefono', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="sv-etiqueta">Correo (opcional)</label>
                                        <input className="salvame-input" placeholder="correo@ejemplo.com" value={form.promovente_correo}
                                            onChange={e => updateField('promovente_correo', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">Domicilio para notificaciones *</label>
                                    <input className="salvame-input" placeholder="Calle, número, colonia, ciudad, estado, C.P." value={form.promovente_domicilio}
                                        onChange={e => updateField('promovente_domicilio', e.target.value)} />
                                    <p className="sv-ayuda">Dirección donde podrás recibir documentos del juzgado.</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 10, background: form.promueve_por_paciente ? 'rgba(201,169,98,0.08)' : '#1a1816', border: `1px solid ${form.promueve_por_paciente ? 'rgba(201,169,98,0.4)' : 'rgba(227,201,148,0.12)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={form.promueve_por_paciente}
                                        onChange={e => updateField('promueve_por_paciente', e.target.checked)}
                                        style={{ marginTop: 3, accentColor: '#c9a962' }} />
                                    <span style={{ fontSize: 14, color: '#d6cab4', lineHeight: 1.5 }}>
                                        Promuevo por el paciente por imposibilidad de hacerlo personalmente <span style={{ color: '#8a8070' }}>(art. 15 Ley de Amparo)</span>
                                    </span>
                                </label>
                                {form.promueve_por_paciente && (
                                    <div>
                                        <label className="sv-etiqueta">Parentesco con el paciente *</label>
                                        <select className="salvame-select" value={form.parentesco} onChange={e => updateField('parentesco', e.target.value)}>
                                            <option value="">Selecciona parentesco</option>
                                            <option value="padre/madre">Padre / Madre</option>
                                            <option value="hijo/a">Hijo / Hija</option>
                                            <option value="cónyuge">Cónyuge</option>
                                            <option value="concubino/a">Concubino / Concubina</option>
                                            <option value="hermano/a">Hermano / Hermana</option>
                                            <option value="familiar">Otro familiar</option>
                                            <option value="amigo/conocido">Amigo / Conocido</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                        <p className="sv-ayuda">El art. 15 de la Ley de Amparo permite a cualquier persona promover en caso de imposibilidad del afectado.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── PASO 2: PACIENTE ─────────────────────────── */}
                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 className="sv-serif" style={{ fontSize: 22, color: '#f3e4c8', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span style={{ color: ORO, fontSize: 15 }}>02</span> Datos del paciente
                                </h3>
                                <div>
                                    <label className="sv-etiqueta">Nombre completo del paciente *</label>
                                    <input className="salvame-input" placeholder="Nombre del paciente que necesita atención" value={form.paciente_nombre}
                                        onChange={e => updateField('paciente_nombre', e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14 }}>
                                    <div>
                                        <label className="sv-etiqueta">Edad *</label>
                                        <input className="salvame-input" type="number" min="0" max="120" placeholder="Años" value={form.paciente_edad}
                                            onChange={e => updateField('paciente_edad', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="sv-etiqueta">Diagnóstico o padecimiento *</label>
                                        <input className="salvame-input" placeholder="Ej. Tumor cerebral, insuficiencia renal, fractura expuesta..." value={form.paciente_diagnostico}
                                            onChange={e => updateField('paciente_diagnostico', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">¿Cuál es el riesgo actual? *</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {RIESGO_OPTIONS.map(opt => (
                                            <button key={opt.value}
                                                className={`chip ${form.paciente_riesgo === opt.value ? 'active' : ''} `}
                                                onClick={() => updateField('paciente_riesgo', opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── PASO 3: AUTORIDAD ───────────────────────────── */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 className="sv-serif" style={{ fontSize: 22, color: '#f3e4c8', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span style={{ color: ORO, fontSize: 15 }}>03</span> Hospital o clínica responsable
                                </h3>
                                <div>
                                    <label className="sv-etiqueta">Institución *</label>
                                    <select className="salvame-select" value={form.institucion} onChange={e => updateField('institucion', e.target.value)}>
                                        <option value="">Selecciona la institución</option>
                                        {INSTITUCION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">Nombre del hospital o clínica *</label>
                                    <input className="salvame-input" placeholder="Ej. Hospital General de Zona No. 32" value={form.hospital_nombre}
                                        onChange={e => updateField('hospital_nombre', e.target.value)} />
                                </div>
                                <div className="sv-par">
                                    <div>
                                        <label className="sv-etiqueta">Ciudad *</label>
                                        <input className="salvame-input" placeholder="Ej. Guadalajara" value={form.hospital_ciudad}
                                            onChange={e => updateField('hospital_ciudad', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="sv-etiqueta">Estado *</label>
                                        <select className="salvame-select" value={form.hospital_estado} onChange={e => updateField('hospital_estado', e.target.value)}>
                                            <option value="">Selecciona estado</option>
                                            {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">Dirección del hospital o clínica</label>
                                    <input className="salvame-input" placeholder="Calle, número, colonia, C.P." value={form.hospital_direccion}
                                        onChange={e => updateField('hospital_direccion', e.target.value)} />
                                    <p className="sv-ayuda">Indispensable para señalar la competencia territorial y la autoridad responsable.</p>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">Director / Médico responsable (opcional)</label>
                                    <input className="salvame-input" placeholder="Si lo conoces, anota su nombre" value={form.director_nombre}
                                        onChange={e => updateField('director_nombre', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* ─── PASO 4: SITUACIÓN ──────────────────────────── */}
                        {step === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 className="sv-serif" style={{ fontSize: 22, color: '#f3e4c8', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                    <span style={{ color: ORO, fontSize: 15 }}>04</span> ¿Qué está pasando?
                                </h3>
                                <div>
                                    <label className="sv-etiqueta" style={{ marginBottom: 8 }}>Selecciona todo lo que aplica *</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {SITUACION_CHIPS.map(s => (
                                            <button key={s}
                                                className={`chip ${form.situaciones.includes(s) ? 'active' : ''} `}
                                                onClick={() => toggleSituacion(s)}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">
                                        Cuéntanos en tus palabras <span style={{ color: '#7d7466' }}>(máx. 1200 caracteres)</span>
                                    </label>
                                    <textarea className="salvame-textarea" maxLength={1200}
                                        placeholder="Describe brevemente qué ha pasado: cuándo llegaron, qué les dijeron, qué atención han negado, cuánto tiempo llevan esperando..."
                                        value={form.descripcion_libre}
                                        onChange={e => updateField('descripcion_libre', e.target.value)}
                                    />
                                    <p className="sv-ayuda" style={{ textAlign: 'right' }}>{form.descripcion_libre.length}/1200</p>
                                </div>
                                <div>
                                    <label className="sv-etiqueta">
                                        Detalles adicionales <span style={{ color: '#7d7466' }}>(nombres de médicos que niegan atención, circunstancias relevantes)</span>
                                    </label>
                                    <textarea className="salvame-textarea" maxLength={800}
                                        placeholder="Ej: El Dr. Pérez Gómez del turno vespertino nos dijo que no había camas. La enfermera de recepción se negó a registrar al paciente..."
                                        value={form.detalles_medicos_adicionales}
                                        onChange={e => updateField('detalles_medicos_adicionales', e.target.value)}
                                        style={{ minHeight: 80 }}
                                    />
                                    <p className="sv-ayuda" style={{ textAlign: 'right' }}>{form.detalles_medicos_adicionales.length}/800</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 10, background: form.confirma_veracidad ? 'rgba(201,169,98,0.08)' : '#1a1816', border: `1px solid ${form.confirma_veracidad ? 'rgba(201,169,98,0.4)' : 'rgba(227,201,148,0.12)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={form.confirma_veracidad}
                                        onChange={e => updateField('confirma_veracidad', e.target.checked)}
                                        style={{ marginTop: 3, accentColor: '#c9a962' }} />
                                    <span style={{ fontSize: 14, color: '#d6cab4', lineHeight: 1.5 }}>
                                        Lo escrito es veraz según mi leal saber y entender. <span style={{ color: '#8a8070' }}>Bajo protesta de decir verdad.</span>
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* ─── NAVEGACIÓN ──────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12 }}>
                        {step > 0 ? (
                            <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                                <ArrowLeft size={16} /> Anterior
                            </button>
                        ) : <div />}

                        {step < 3 ? (
                            <button className="btn-primary" disabled={!canProceed()} onClick={() => setStep(step + 1)}>
                                Siguiente <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button className="btn-primary" disabled={!canProceed()} onClick={handleGenerate}
                                style={{ animation: canProceed() ? 'latido 2.4s ease-in-out infinite' : 'none' }}>
                                <Asclepio size={18} color="#fff7ef" /> Generar amparo de emergencia
                            </button>
                        )}
                    </div>

                    {error && (
                        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(212,103,90,0.1)', border: '1px solid rgba(212,103,90,0.35)', color: '#f0a397', fontSize: 14 }}>
                            {error}
                        </div>
                    )}
                </main>
            )}

            {/* ─── GENERANDO ────────────────────────────────────────────── */}
            {phase === 'generating' && (
                <main style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px', textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
                    <div style={{ marginBottom: 34 }}>
                        <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 26px' }}>
                            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(227,201,148,0.18)', borderTopColor: ORO, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Asclepio size={26} /></div>
                        </div>
                        <p className="sv-serif" style={{ fontSize: 22, color: '#f3e4c8', margin: '0 0 8px' }}>
                            {LOADER_MESSAGES[loaderIdx]}
                        </p>
                        <p style={{ fontSize: 13, color: '#7d7466', margin: 0 }}>
                            Esto puede tomar entre 30 y 90 segundos
                        </p>
                    </div>

                    {/* El escrito, mientras se redacta */}
                    {generatedText && (
                        <div style={{ textAlign: 'left', maxHeight: 320, overflow: 'hidden', position: 'relative' }}>
                            <div className="result-text" style={{ fontSize: 13.5, opacity: 0.75 }}>
                                {renderFormattedText(generatedText)}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(transparent, #0f0e0d)' }} />
                        </div>
                    )}
                </main>
            )}

            {/* ─── RESULTADO ────────────────────────────────────────────── */}
            {phase === 'result' && (
                <main ref={resultRef} style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px 60px', animation: 'fadeIn 0.5s ease-out' }}>
                    {/* Listo */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', marginBottom: 22,
                        borderRadius: 12, background: 'rgba(143,191,138,0.07)', border: '1px solid rgba(143,191,138,0.25)',
                    }}>
                        <span style={{ color: '#a9d3a2', flexShrink: 0 }}><CheckCircle size={22} /></span>
                        <div>
                            <p className="sv-serif" style={{ margin: 0, fontSize: 18, color: '#cfe7c9' }}>Amparo generado</p>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9d927f' }}>Revisa el escrito, descárgalo e imprímelo por triplicado.</p>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
                        <button className="btn-primary" onClick={handleDownloadDocx} disabled={downloading} style={{ fontSize: 14, padding: '11px 22px' }}>
                            <DownloadIcon size={16} /> {downloading ? 'Descargando...' : 'Descargar DOCX'}
                        </button>
                        <button className="btn-secondary" onClick={handlePrint}>
                            <PrinterIcon size={16} /> Imprimir
                        </button>
                        <button className="btn-secondary" onClick={handleCopy}>
                            <CopyIcon size={16} /> {copied ? '¡Copiado!' : 'Copiar texto'}
                        </button>
                        <button className="btn-secondary" onClick={() => { setPhase('form'); setStep(0); setForm(INITIAL_FORM); setGeneratedText(''); }}>
                            Nuevo amparo
                        </button>
                    </div>

                    {/* El escrito, en su hoja */}
                    <div className="result-text">{renderFormattedText(generatedText)}</div>

                    <div style={{ margin: '36px 0 28px' }}><Filete /></div>

                    {/* ─── GUÍA DE ACCIÓN INMEDIATA ──────────────────────── */}
                    <div className="tarjeta-negra sv-panel" style={{ padding: '26px 24px' }}>
                        <h3 className="sv-serif" style={{ fontSize: 22, color: '#f3e4c8', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: CARMIN, display: 'flex' }}><AlertTriangleIcon size={20} /></span> Guía de acción inmediata
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { n: '1', text: 'Imprime este documento por triplicado (original + 2 copias).' },
                                { n: '2', text: 'Firma en la última hoja los tres ejemplares.' },
                                { n: '3', text: 'Acude INMEDIATAMENTE a la Oficialía de Partes de los Juzgados de Distrito de tu ciudad.' },
                                { n: '4', text: 'Los juzgados de amparo tienen guardias para urgencias — puedes presentar cualquier día y hora.' },
                                { n: '5', text: 'Solicita que te sellen de recibido tu copia y guárdala.' },
                                { n: '6', text: 'El juez debe pronunciarse sobre la suspensión de plano en el mismo acto de admisión.' },
                            ].map(item => (
                                <div key={item.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <span className="sv-serif" style={{
                                        width: 26, height: 26, borderRadius: '50%', background: 'rgba(212,103,90,0.12)', color: CARMIN, border: '1px solid rgba(212,103,90,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                                    }}>{item.n}</span>
                                    <p style={{ margin: 0, fontSize: 14, color: '#d6cab4', lineHeight: 1.55 }}>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── ¿QUÉ SIGUE? ──────────────────────────────────── */}
                    <div style={{ textAlign: 'center', marginTop: 28 }}>
                        <button className="btn-primary" onClick={() => setShowInstructions(!showInstructions)} style={{ padding: '15px 30px', fontSize: 15.5 }}>
                            Ya tengo la demanda generada y revisada, ¿qué sigue?
                            <span style={{ transition: 'transform 0.3s', transform: showInstructions ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 12 }}>▼</span>
                        </button>
                    </div>

                    {showInstructions && (
                        <div className="tarjeta-negra sv-panel" style={{ marginTop: 24, padding: '30px 26px', animation: 'fadeIn 0.4s ease-out' }}>
                            <p className="sv-rotulo" style={{ margin: '0 0 8px', textAlign: 'center' }}>Paso a paso</p>
                            <h3 className="sv-serif" style={{ fontSize: 26, color: '#f3e4c8', margin: '0 0 28px', textAlign: 'center' }}>
                                Instrucciones para presentar tu amparo
                            </h3>

                            {/* 1. ¿A qué instalaciones dirigirte? */}
                            <div style={{ marginBottom: 28 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f3e4c8', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span className="sv-serif" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(227,201,148,0.45)', color: ORO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>1</span>
                                    ¿A qué instalaciones dirigirte? (La jerarquía de juzgados)
                                </h4>

                                {/* La Oficialía de Partes del estado (del directorio) */}
                                {juzgadoInfo && (
                                    <div style={{
                                        padding: '20px', borderRadius: 14, marginBottom: 18, marginLeft: 38,
                                        background: 'rgba(201,169,98,0.06)', border: '1px solid rgba(227,201,148,0.25)',
                                    }}>
                                        <p className="sv-rotulo" style={{ margin: '0 0 6px', fontSize: 10.5 }}>
                                            Oficialía de Partes Común — {form.hospital_estado}
                                        </p>
                                        <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#f3e4c8', lineHeight: 1.4 }}>
                                            {juzgadoInfo.denominacion_turno}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <p style={{ margin: 0, fontSize: 13, color: '#d6cab4', lineHeight: 1.5 }}>
                                                <span style={{ color: '#8a8070' }}>Dirección: </span>{juzgadoInfo.direccion_oficialia}
                                            </p>
                                            {juzgadoInfo.telefono && (
                                                <p style={{ margin: 0, fontSize: 13, color: '#d6cab4', lineHeight: 1.5 }}>
                                                    <span style={{ color: '#8a8070' }}>Teléfono: </span>{juzgadoInfo.telefono}
                                                </p>
                                            )}
                                        </div>
                                        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#a9d3a2', fontWeight: 600 }}>
                                            Funciona las 24 horas, los 365 días del año
                                        </p>
                                        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#7d7466', fontStyle: 'italic' }}>
                                            Fuente: Directorio del Consejo de la Judicatura Federal (CJF)
                                        </p>
                                    </div>
                                )}

                                <p style={{ fontSize: 14, color: '#d6cab4', lineHeight: 1.7, margin: '0 0 14px', paddingLeft: 38 }}>
                                    Idealmente, debes acudir a las instalaciones del <strong style={{ color: '#f3e4c8' }}>Poder Judicial de la Federación</strong> para presentarla ante un <strong style={{ color: '#f3e4c8' }}>Juez de Distrito</strong>. Sin embargo, la ley prevé qué hacer si no hay uno cerca:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 38 }}>
                                    {[
                                        'Si en el lugar donde te encuentras no reside un juez de distrito, debes entregar la demanda al juez de primera instancia (un juez local o estatal) dentro de cuya jurisdicción radique la autoridad del hospital que niega la atención. Este juez está obligado a recibirla y acordar de plano la suspensión.',
                                        'Si tampoco hay un juez de primera instancia en el lugar, o si la autoridad no puede ser habida, puedes presentar la demanda ante cualquiera de los órganos judiciales que ejerzan jurisdicción en ese mismo lugar.',
                                        'En su defecto, puedes acudir ante el órgano jurisdiccional más próximo.',
                                    ].map((text, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: '50%', background: '#1a1816', border: '1px solid rgba(227,201,148,0.2)', color: '#9d927f',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2,
                                            }}>{idx + 1}</span>
                                            <p style={{ margin: 0, fontSize: 13.5, color: '#b9ad98', lineHeight: 1.65 }}>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(227,201,148,0.12)', margin: '0 0 28px' }} />

                            {/* 2. Lo que hará el juez */}
                            <div style={{ marginBottom: 28 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f3e4c8', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span className="sv-serif" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(227,201,148,0.45)', color: ORO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>2</span>
                                    Lo que hará el Juez (La Suspensión Inmediata)
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 38 }}>
                                    <p style={{ margin: 0, fontSize: 14, color: '#d6cab4', lineHeight: 1.7 }}>
                                        Dado que es un caso de urgencia (artículos 15 y 20 de la Ley de Amparo), el juez debe proveer o dar respuesta <strong style={{ color: '#a9d3a2' }}>de inmediato</strong>.
                                    </p>
                                    {[
                                        'El juez decretará la suspensión de los actos reclamados y dictará las medidas necesarias.',
                                        'Esta suspensión se concederá de oficio y de plano (de forma automática y directa).',
                                        'El juez comunicará esta suspensión sin demora a la autoridad responsable (el hospital) por cualquier medio que permita lograr su inmediato cumplimiento para que atiendan al paciente.',
                                    ].map((text, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#a9d3a2', fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
                                            <p style={{ margin: 0, fontSize: 13.5, color: '#b9ad98', lineHeight: 1.65 }}>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(227,201,148,0.12)', margin: '0 0 28px' }} />

                            {/* 3. La ratificación */}
                            <div>
                                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f3e4c8', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span className="sv-serif" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(227,201,148,0.45)', color: ORO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>3</span>
                                    El seguimiento obligatorio: La Ratificación
                                </h4>
                                <div style={{ paddingLeft: 38 }}>
                                    <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(227,201,148,0.07)', border: '1px solid rgba(227,201,148,0.22)', marginBottom: 14 }}>
                                        <p style={{ margin: 0, fontSize: 13, color: ORO, lineHeight: 1.6, fontWeight: 500 }}>
                                            Este paso no siempre ocurrirá (dada la naturaleza del acto reclamado); sin embargo, dependerá del criterio del juez y no debes olvidarlo una vez que pase la urgencia médica.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <p style={{ margin: 0, fontSize: 14, color: '#d6cab4', lineHeight: 1.7 }}>
                                            El Juez podría ordenar al actuario, si es que es posible, que <strong style={{ color: '#f3e4c8' }}>el paciente ratifique (confirme)</strong> la demanda de amparo que tú presentaste por él.
                                        </p>
                                        <p style={{ margin: 0, fontSize: 14, color: '#d6cab4', lineHeight: 1.7 }}>
                                            Si el paciente, por sí mismo o por medio de su representante, <strong style={{ color: CARMIN }}>no ratifica la demanda, esta se tendrá por no presentada</strong> y quedarán sin efecto. Es importante que, si está en condiciones, la persona hospitalizada tenga conocimiento de que se presentó una demanda de amparo a su nombre para que la ratifique en caso de que así sea requerido.
                                        </p>
                                        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(143,191,138,0.07)', border: '1px solid rgba(143,191,138,0.22)' }}>
                                            <p style={{ margin: 0, fontSize: 13, color: '#a9d3a2', lineHeight: 1.6 }}>
                                                Si la persona no está en posibilidades por sus condiciones de salud, no te preocupes — no será necesaria esa ratificación inmediata.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            )}

            {/* ─── DATOS DE SALUD (OMS/OPS) ────────────────────────────── */}
            {(phase === 'form' || phase === 'result') && (
                <section style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 64px', animation: 'fadeIn 0.6s ease-out 0.2s both' }}>
                    <div style={{ margin: '0 0 22px' }}><Filete /></div>
                    <p className="sv-rotulo" style={{ margin: '0 0 18px', textAlign: 'center' }}>Datos de salud — México (OMS/OPS)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                        {[
                            { icon: <Asclepio size={18} />, title: 'Cobertura de servicios esenciales', value: '79.0', unit: '/ 100', desc: 'Índice de Cobertura de Servicios de Salud (UHC), 2023.', source: 'OMS' },
                            { icon: <HospitalIcon size={18} />, title: 'Capacidad y acceso a servicios', value: '45.0', unit: '/ 100', desc: 'Subíndice de capacidad y acceso (UHC), 2023.', source: 'OMS' },
                            { icon: <ChartIcon size={18} />, title: 'Gasto actual en salud', value: '6.08%', unit: 'del PIB', desc: 'Gasto corriente en salud de México, 2021.', source: 'Banco Mundial / OMS' },
                            { icon: <ShieldCheck size={18} />, title: 'Seguridad del paciente', value: '1 de 10', unit: 'pacientes', desc: 'Sufre daños durante la atención; muchos son prevenibles.', source: 'OMS (contexto global)' },
                        ].map((card, i) => (
                            <div key={i} className="tarjeta-negra sv-panel" style={{ padding: 18, borderRadius: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: ORO }}>
                                    {card.icon}
                                    <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9d927f' }}>{card.title}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                                    <span className="sv-serif" style={{ fontSize: 30, color: '#f3e4c8' }}>{card.value}</span>
                                    <span style={{ fontSize: 13, color: '#7d7466' }}>{card.unit}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 12.5, color: '#9d927f', lineHeight: 1.45 }}>{card.desc}</p>
                                <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#6f675b' }}>Fuente: {card.source}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ─── PIE ──────────────────────────────────────────────────── */}
            <footer style={{ padding: '18px 24px', borderTop: '1px solid rgba(227,201,148,0.1)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11.5, color: '#7d7466' }}>
                    <span className="sv-marca">Iurexia</span> Legal AI · Sálvame · Este módulo no constituye asesoría legal personalizada.
                </p>
            </footer>
        </div>
    );
}
