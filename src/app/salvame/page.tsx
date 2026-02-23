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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api-634779006258.us-central1.run.app';

// ═══════════════════════════════════════════════════════════════════
// SVG Inline Icons
// ═══════════════════════════════════════════════════════════════════
const MedicalCross = ({ size = 20, color = '#dc2626' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2h6v6h6v6h-6v6H9v-6H3V8h6z" fill={color} fillOpacity="0.15" />
    </svg>
);

const HeartPulse = ({ size = 20, color = '#dc2626' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572" />
        <path d="M12 6v4l-1 2h3l-1 2v4" strokeWidth="1.8" />
    </svg>
);

const EcgLine = () => (
    <svg width="100%" height="24" viewBox="0 0 600 24" preserveAspectRatio="none" style={{ display: 'block', opacity: 0.15 }}>
        <polyline
            points="0,12 80,12 100,12 120,2 130,22 140,6 150,18 160,12 200,12 280,12 300,12 320,2 330,22 340,6 350,18 360,12 400,12 480,12 500,12 520,2 530,22 540,6 550,18 560,12 600,12"
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.5"
        />
    </svg>
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
    const { loading: authLoading, isAuthenticated, user } = useAuth();
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
            if (/^-{3,}$/.test(trimmed)) return <hr key={i} style={{ border: 'none', borderTop: '1px solid #333', margin: '16px 0' }} />;

            // ## Heading
            if (trimmed.startsWith('## ')) {
                const headingText = trimmed.replace(/^#+\s*/, '');
                return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: '#e5e5e5', margin: '20px 0 8px', textTransform: 'uppercase' }}>{headingText}</h3>;
            }
            if (trimmed.startsWith('# ')) {
                const headingText = trimmed.replace(/^#+\s*/, '');
                return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: '#e5e5e5', margin: '24px 0 8px', textAlign: 'center' }}>{headingText}</h2>;
            }

            // Bullet line
            const isBullet = /^[-•]\s+/.test(trimmed);
            const bulletText = isBullet ? trimmed.replace(/^[-•]\s+/, '') : trimmed;

            // Parse inline **bold** markers
            const parseInlineBold = (str: string) => {
                const parts = str.split(/(\*\*.*?\*\*)/g);
                return parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} style={{ fontWeight: 700, color: '#e5e5e5' }}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                });
            };

            // Check if the whole line is ALL-CAPS header style
            const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length < 120 && /[A-ZÁÉÍÓÚÑÜ]/.test(trimmed);

            if (isBullet) {
                return (
                    <div key={i} style={{ display: 'flex', gap: 8, paddingLeft: 16, marginBottom: 4 }}>
                        <span style={{ color: '#666', flexShrink: 0 }}>•</span>
                        <span>{parseInlineBold(bulletText)}</span>
                    </div>
                );
            }

            return (
                <p key={i} style={{
                    margin: '4px 0',
                    fontWeight: isAllCaps ? 700 : 400,
                    textAlign: isAllCaps && trimmed.length < 60 ? 'center' : 'justify',
                    ...(isAllCaps && { color: '#e5e5e5' }),
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(220,38,38,0.3)', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } } `}</style>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

            {/* ─── GLOBAL STYLES ──────────────────────────────────────── */}
            <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 8px rgba(220, 38, 38, 0.3); } 50% { box-shadow: 0 0 24px rgba(220, 38, 38, 0.6);
} }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ecgPulse { 0% { stroke-dashoffset: 600; } 100% { stroke-dashoffset: 0; } }
        .salvame-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: #e5e5e5; font-size: 15px; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; outline: none; box-sizing: border-box; }
        .salvame-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15); }
        .salvame-input::placeholder { color: #666; }
        .salvame-select { appearance: none; width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center; color: #e5e5e5; font-size: 15px; font-family: inherit; cursor: pointer; outline: none; transition: border-color 0.2s; }
        .salvame-select:focus { border-color: #dc2626; }
        .salvame-textarea { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: #e5e5e5; font-size: 15px; font-family: inherit; resize: vertical; min-height: 120px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .salvame-textarea:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15); }
        .chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; border: 1px solid #333; background: #1a1a1a; color: #aaa; font-size: 14px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .chip:hover { border-color: #dc2626; color: #e5e5e5; }
        .chip.active { background: rgba(220, 38, 38, 0.15); border-color: #dc2626; color: #f87171; }
        .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; border: none; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-family: inherit; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-secondary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: #e5e5e5; font-size: 14px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .btn-secondary:hover { border-color: #555; background: #222; }
        .result-text { white-space: pre-wrap; line-height: 1.8; font-size: 15px; color: #d4d4d4; padding: 24px; background: #141414; border-radius: 12px; border: 1px solid #262626; max-height: 600px; overflow-y: auto; }
`}</style>

            {/* ─── HEADER BAR ─────────────────────────────────────────── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50, padding: '12px 24px',
                background: 'rgba(15,15,15,0.92)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={() => router.push('/plataforma')}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 6 }}
                        title="Volver"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <MedicalCross size={24} color="#dc2626" />
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#e5e5e5', letterSpacing: '0.05em' }}>SÁLVAME</span>
                    <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>Iurexia Legal AI</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#555', padding: '4px 10px', border: '1px solid #2a2a2a', borderRadius: 6 }}>Módulo Gratuito</span>
                </div>
            </header>

            {/* ─── INTRO / TERMS SCREEN (NEW PUBLI DESIGN) ──────────────── */}
            {phase === 'intro' && (
                <div style={{ animation: 'fadeIn 0.8s ease-out' }}>

                    {/* Hero Section */}
                    <section style={{
                        minHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '80px 5% 60px',
                        position: 'relative'
                    }}>
                        {/* Background heart watermark */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.03, pointerEvents: 'none' }}>
                            <HeartPulse size={400} color="#dc2626" />
                        </div>

                        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                <MedicalCross size={48} color="#dc2626" />
                                <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff 0%, #a3a3a3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    SÁLVAME
                                </h1>
                            </div>
                            <h2 style={{ fontSize: '1.5rem', color: '#a3a3a3', fontWeight: 400, marginBottom: 32, lineHeight: 1.5 }}>
                                Amparo de emergencia por salud
                            </h2>
                            <p style={{ fontSize: '1.125rem', color: '#999', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.6 }}>
                                Si te niegan atención hospitalaria, una cirugía urgente o medicamento vital, el tiempo es crucial. Genera tu demanda de amparo federal en minutos usando Inteligencia Artificial.
                            </p>

                            <button
                                className="btn-primary"
                                onClick={() => {
                                    if (isAuthenticated) {
                                        setPhase('form');
                                    } else {
                                        router.push('/login?redirect=/salvame');
                                    }
                                }}
                                style={{ padding: '18px 40px', fontSize: '1.125rem', boxShadow: '0 0 15px rgba(220,38,38,0.3)', animation: 'pulseGlow 3s infinite' }}
                            >
                                <CheckCircle size={20} color="white" />
                                Generar Amparo Ahora Gratis
                            </button>

                            {!isAuthenticated && (
                                <p style={{ marginTop: 16, color: '#a3a3a3', fontSize: '0.95rem', fontWeight: 500 }}>
                                    Lo único que tienes que hacer es registrarte, <span style={{ color: '#f5f5f5' }}>te tomará un minuto</span>.
                                </p>
                            )}

                            <div style={{ width: '100%', maxWidth: 600, margin: '40px auto 0', opacity: 0.3 }}>
                                <EcgLine />
                            </div>
                        </div>
                    </section>

                    {/* Stats Section */}
                    <section style={{ padding: '80px 5%', background: '#151515', borderTop: '1px solid #262626', borderBottom: '1px solid #262626' }}>
                        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
                            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '2.5rem', fontWeight: 300, color: '#f5f5f5', marginBottom: 24 }}>
                                Por qué creamos SÁLVAME
                            </h2>
                            <p style={{ color: '#a3a3a3', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: 20 }}>
                                Creamos Iurexia con la mente, pero programamos SÁLVAME con el corazón. Conocemos la desesperación de las salas de espera y la profunda indignidad de tener que suplicar por atención médica. Sabemos que, cuando la vida pende de un hilo, el sentimiento de impotencia es devastador.
                            </p>
                            <p style={{ color: '#a3a3a3', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: 20 }}>
                                Esta herramienta es nuestra respuesta a la soledad institucional que enfrentamos millones de mexicanos. No importa quién seas, cuánto tengas o dónde te encuentres: ante el dolor, la urgencia y el silencio por parte del personal de salud, Iurexia te toma de la mano. Te entregamos una poderosa herramienta para hacer efectivo tu derecho humano a la salud.
                            </p>
                            <p style={{ color: '#a3a3a3', fontSize: '1.125rem', lineHeight: 1.7 }}>
                                Pusimos la tecnología más avanzada del mundo al servicio de lo más importante que existe: la salud de ti, de tus seres queridos, o de cualquier persona en grave riesgo ante la indiferencia y desatención de un hospital.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30, maxWidth: 1200, margin: '0 auto' }}>
                            {/* Stat 1: CONEVAL */}
                            <div style={{ background: '#0f0f0f', border: '1px solid #262626', borderRadius: 16, padding: '40px 30px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#dc2626', marginBottom: 16 }}>50.4M</div>
                                <div style={{ fontSize: '1.125rem', color: '#f5f5f5', fontWeight: 600, marginBottom: 12 }}>Mexicanos sin acceso a la salud</div>
                                <div style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>Más de 50.4 millones de personas experimentaron carencia por acceso a los servicios de salud (39.1% de la población).</div>
                                <span style={{ display: 'block', marginTop: 16, fontSize: '0.8rem', color: '#444', fontStyle: 'italic' }}>Fuente: CONEVAL (2022)</span>
                            </div>

                            {/* Stat 2: Colectivo Cero Desabasto */}
                            <div style={{ background: '#0f0f0f', border: '1px solid #262626', borderRadius: 16, padding: '40px 30px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#dc2626', marginBottom: 16 }}>15M+</div>
                                <div style={{ fontSize: '1.125rem', color: '#f5f5f5', fontWeight: 600, marginBottom: 12 }}>Recetas no surtidas</div>
                                <div style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>Más de 15 millones de recetas médicas no fueron surtidas efectivamente en instituciones de salud pública en un nivel reciente.</div>
                                <span style={{ display: 'block', marginTop: 16, fontSize: '0.8rem', color: '#444', fontStyle: 'italic' }}>Fuente: Colectivo Cero Desabasto</span>
                            </div>

                            {/* Stat 3: Amparo 24h */}
                            <div style={{ background: '#0f0f0f', border: '1px solid #262626', borderRadius: 16, padding: '40px 30px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#dc2626', marginBottom: 16 }}>24h</div>
                                <div style={{ fontSize: '1.125rem', color: '#f5f5f5', fontWeight: 600, marginBottom: 12 }}>Derecho a la suspensión</div>
                                <div style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>Los jueces federales otorgan suspensiones de plano en menos de 24 horas cuando hay peligro inminente de pérdida de la vida.</div>
                                <span style={{ display: 'block', marginTop: 16, fontSize: '0.8rem', color: '#444', fontStyle: 'italic' }}>Fuente: Ley de Amparo, Arts. 15, 126</span>
                            </div>
                        </div>
                    </section>

                    {/* Features Sections */}
                    <section style={{ padding: '80px 5%', maxWidth: 1200, margin: '0 auto' }}>
                        {/* Feature 1 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 60, marginBottom: 80 }}>
                            <div style={{ flex: '1 1 400px' }}>
                                <h3 style={{ fontSize: '2rem', marginBottom: 20, color: '#f5f5f5' }}>El Juicio de Amparo Salva Vidas</h3>
                                <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: 24, lineHeight: 1.6 }}>
                                    El Juicio de Amparo no es solo para grandes corporativos, es un derecho diseñado para <span style={{ color: '#dc2626', fontWeight: 600 }}>proteger al ciudadano común</span> contra omisiones de la autoridad.
                                </p>
                                <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: 24, lineHeight: 1.6 }}>
                                    Al presentar este documento, un Juez de Distrito de la Federación obliga legalmente al hospital o institución de salud (IMSS, ISSSTE, local) a brindarte la atención médica o el medicamento que te niegan.
                                </p>
                            </div>
                            <div style={{ flex: '1 1 400px', background: 'linear-gradient(145deg, #1a1a1a, #111)', border: '1px solid #262626', borderRadius: 20, padding: 40, position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                <ShieldCheck size={160} color="#dc2626" />
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 60, marginBottom: 40, flexDirection: 'row-reverse' }}>
                            <div style={{ flex: '1 1 400px' }}>
                                <h3 style={{ fontSize: '2rem', marginBottom: 20, color: '#f5f5f5' }}>Respaldo y Tecnología Legal</h3>
                                <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: 24, lineHeight: 1.6 }}>
                                    SÁLVAME utiliza el motor de inteligencia artificial jurídica más avanzado de México (<span style={{ color: '#c9a962' }}>Iurexia Legal AI</span>). La demanda que generas cuenta con los más altos estándares técnicos.
                                </p>
                                <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: 24, lineHeight: 1.6 }}>
                                    El sistema fundamenta automáticamente tu demanda con los <span style={{ color: '#dc2626', fontWeight: 600 }}>artículos 1 y 4 de la Constitución</span>, y busca jurisprudencia en tiempo real para hacer valer tu derecho a la salud.
                                </p>
                            </div>
                            <div style={{ flex: '1 1 400px', background: 'linear-gradient(145deg, #1a1a1a, #111)', border: '1px solid #262626', borderRadius: 20, padding: 40, display: 'flex', flexDirection: 'column', gap: 15 }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, borderLeft: '3px solid #c9a962' }}>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Buscando jurisprudencia...</div>
                                    <div style={{ width: '80%', height: 8, background: '#333', borderRadius: 4 }}></div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Redactando suspensión de plano...</div>
                                    <div style={{ width: '60%', height: 8, background: '#333', borderRadius: 4 }}></div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, borderLeft: '3px solid #a3a3a3' }}>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Fundamentando agravios...</div>
                                    <div style={{ width: '90%', height: 8, background: '#333', borderRadius: 4 }}></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action CTA Section */}
                    <section style={{ padding: '80px 5%', textAlign: 'center', background: 'linear-gradient(to bottom, #0f0f0f, #1a0505)', borderTop: '1px solid rgba(220,38,38,0.15)' }}>
                        <div style={{ maxWidth: 800, margin: '0 auto', background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(10px)', border: '1px solid #262626', padding: '60px 40px', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#f87171', background: 'rgba(220,38,38,0.1)', padding: '10px 20px', borderRadius: 30, fontSize: '0.95rem', fontWeight: 600, marginBottom: 30 }}>
                                <AlertTriangleIcon size={20} />
                                Uso exclusivo para emergencias reales
                            </div>

                            <h2 style={{ fontSize: '2.5rem', marginBottom: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                                Protege la vida de tus seres queridos hoy.
                            </h2>
                            <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: 40, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                                No necesitas cuenta premium ni conocimientos legales. Completa un breve formulario y obtén tu demanda lista para imprimir y presentar en el juzgado.
                            </p>

                            <button
                                className="btn-primary"
                                onClick={() => {
                                    if (isAuthenticated) {
                                        setPhase('form');
                                    } else {
                                        router.push('/login?redirect=/salvame');
                                    }
                                }}
                                style={{ padding: '20px 50px', fontSize: '1.25rem' }}
                            >
                                <MedicalCross size={20} color="white" />
                                Comenzar proceso gratuito
                            </button>

                            {!isAuthenticated && (
                                <p style={{ marginTop: 16, color: '#a3a3a3', fontSize: '0.95rem', fontWeight: 500 }}>
                                    Lo único que tienes que hacer es registrarte, <span style={{ color: '#f5f5f5' }}>te tomará un minuto</span>.
                                </p>
                            )}

                            <p style={{ marginTop: 24, color: '#666', fontSize: '0.9rem' }}>
                                Responsabilidad social de <strong style={{ color: '#e5e5e5' }}>Iurexia Technologies</strong>
                            </p>
                        </div>
                    </section>

                </div>
            )}

            {/* ─── HERO ───────────────────────────────────────────────── */}
            {phase === 'form' && step === 0 && (
                <section style={{
                    padding: '48px 24px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                    animation: 'fadeIn 0.6s ease-out',
                }}>
                    {/* Background heart watermark */}
                    <div style={{ position: 'absolute', top: 20, right: '10%', opacity: 0.04, pointerEvents: 'none' }}>
                        <HeartPulse size={280} color="#dc2626" />
                    </div>

                    <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <MedicalCross size={32} color="#dc2626" />
                            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#f5f5f5', margin: 0, letterSpacing: '-0.02em' }}>
                                SÁLVAME
                            </h1>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#a3a3a3', margin: '8px 0 24px', lineHeight: 1.5 }}>
                            Amparo de emergencia por salud
                        </h2>
                        <p style={{ fontSize: 16, color: '#999', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 20px' }}>
                            Si te niegan atención, cirugía o medicamento vital, genera tu escrito en minutos.
                        </p>

                        {/* ECG line */}
                        <div style={{ margin: '16px auto', maxWidth: 500 }}>
                            <EcgLine />
                        </div>

                        {/* Warning box */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'flex-start', gap: 10, padding: '14px 20px',
                            background: 'rgba(220,38,38,0.06)', borderRadius: 12, border: '1px solid rgba(220,38,38,0.15)',
                            textAlign: 'left', maxWidth: 560,
                        }}>
                            <AlertTriangleIcon size={20} />
                            <p style={{ fontSize: 13, color: '#999', margin: 0, lineHeight: 1.5 }}>
                                <strong style={{ color: '#f87171' }}>Si hay peligro inmediato de vida</strong>, acude a urgencias y solicita atención inmediata.
                                Este módulo ayuda a documentar y exigir atención mediante una demanda de amparo.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ─── STEPPER PROGRESS ───────────────────────────────────── */}
            {phase === 'form' && (
                <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
                        {STEP_LABELS.map((label, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                                    background: i < step ? '#dc2626' : i === step ? 'rgba(220,38,38,0.15)' : '#1a1a1a',
                                    color: i <= step ? '#fff' : '#555',
                                    border: i === step ? '2px solid #dc2626' : '1px solid #333',
                                    transition: 'all 0.3s',
                                }}>
                                    {i < step ? <CheckCircle size={16} /> : i + 1}
                                </div>
                                {i < STEP_LABELS.length - 1 && (
                                    <div style={{ flex: 1, height: 2, background: i < step ? '#dc2626' : '#262626', margin: '0 4px', transition: 'background 0.3s' }} />
                                )}
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#666', textAlign: 'center', margin: '0 0 8px' }}>
                        Paso {step + 1} de 4 — {STEP_LABELS[step]}
                    </p>
                </div>
            )}

            {/* ─── FORM CONTAINER ─────────────────────────────────────── */}
            {phase === 'form' && (
                <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 40px', animation: 'slideUp 0.4s ease-out' }} key={step}>

                    <div style={{ background: '#151515', borderRadius: 16, border: '1px solid #222', padding: '28px 24px' }}>

                        {/* ─── STEP 0: PROMOVENTE ────────────────────────────── */}
                        {step === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f5f5f5', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ opacity: 0.5 }}>01</span> ¿Quién presenta la demanda?
                                </h3>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Nombre completo del promovente *</label>
                                    <input className="salvame-input" placeholder="Ej. María López García" value={form.promovente_nombre}
                                        onChange={e => updateField('promovente_nombre', e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Teléfono (opcional)</label>
                                        <input className="salvame-input" placeholder="55 1234 5678" value={form.promovente_telefono}
                                            onChange={e => updateField('promovente_telefono', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Correo (opcional)</label>
                                        <input className="salvame-input" placeholder="correo@ejemplo.com" value={form.promovente_correo}
                                            onChange={e => updateField('promovente_correo', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Domicilio para notificaciones *</label>
                                    <input className="salvame-input" placeholder="Calle, número, colonia, ciudad, estado, C.P." value={form.promovente_domicilio}
                                        onChange={e => updateField('promovente_domicilio', e.target.value)} />
                                    <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Dirección donde podrás recibir documentos del juzgado.</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 10, background: form.promueve_por_paciente ? 'rgba(220,38,38,0.06)' : '#1a1a1a', border: `1px solid ${form.promueve_por_paciente ? 'rgba(220,38,38,0.3)' : '#2a2a2a'} `, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={form.promueve_por_paciente}
                                        onChange={e => updateField('promueve_por_paciente', e.target.checked)}
                                        style={{ marginTop: 2, accentColor: '#dc2626' }} />
                                    <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>
                                        Promuevo por el paciente por imposibilidad de hacerlo personalmente <span style={{ color: '#888' }}>(art. 15 Ley de Amparo)</span>
                                    </span>
                                </label>
                                {form.promueve_por_paciente && (
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Parentesco con el paciente *</label>
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
                                        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>El art. 15 de la Ley de Amparo permite a cualquier persona promover en caso de imposibilidad del afectado.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── STEP 1: PACIENTE ─────────────────────────────── */}
                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f5f5f5', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ opacity: 0.5 }}>02</span> Datos del paciente
                                </h3>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Nombre completo del paciente *</label>
                                    <input className="salvame-input" placeholder="Nombre del paciente que necesita atención" value={form.paciente_nombre}
                                        onChange={e => updateField('paciente_nombre', e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Edad *</label>
                                        <input className="salvame-input" type="number" min="0" max="120" placeholder="Años" value={form.paciente_edad}
                                            onChange={e => updateField('paciente_edad', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Diagnóstico o padecimiento *</label>
                                        <input className="salvame-input" placeholder="Ej. Tumor cerebral, insuficiencia renal, fractura expuesta..." value={form.paciente_diagnostico}
                                            onChange={e => updateField('paciente_diagnostico', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>¿Cuál es el riesgo actual? *</label>
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

                        {/* ─── STEP 2: AUTORIDAD ───────────────────────────── */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f5f5f5', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ opacity: 0.5 }}>03</span> Hospital o clínica responsable
                                </h3>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Institución *</label>
                                    <select className="salvame-select" value={form.institucion} onChange={e => updateField('institucion', e.target.value)}>
                                        <option value="">Selecciona la institución</option>
                                        {INSTITUCION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Nombre del hospital o clínica *</label>
                                    <input className="salvame-input" placeholder="Ej. Hospital General de Zona No. 32" value={form.hospital_nombre}
                                        onChange={e => updateField('hospital_nombre', e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Ciudad *</label>
                                        <input className="salvame-input" placeholder="Ej. Guadalajara" value={form.hospital_ciudad}
                                            onChange={e => updateField('hospital_ciudad', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Estado *</label>
                                        <select className="salvame-select" value={form.hospital_estado} onChange={e => updateField('hospital_estado', e.target.value)}>
                                            <option value="">Selecciona estado</option>
                                            {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Dirección del hospital o clínica</label>
                                    <input className="salvame-input" placeholder="Calle, número, colonia, C.P." value={form.hospital_direccion}
                                        onChange={e => updateField('hospital_direccion', e.target.value)} />
                                    <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Indispensable para señalar la competencia territorial y la autoridad responsable.</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Director / Médico responsable (opcional)</label>
                                    <input className="salvame-input" placeholder="Si lo conoces, anota su nombre" value={form.director_nombre}
                                        onChange={e => updateField('director_nombre', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* ─── STEP 3: SITUACIÓN ──────────────────────────── */}
                        {step === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f5f5f5', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ opacity: 0.5 }}>04</span> ¿Qué está pasando?
                                </h3>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 8, display: 'block' }}>Selecciona todo lo que aplica *</label>
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
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>
                                        Cuéntanos en tus palabras <span style={{ color: '#555' }}>(máx. 1200 caracteres)</span>
                                    </label>
                                    <textarea className="salvame-textarea" maxLength={1200}
                                        placeholder="Describe brevemente qué ha pasado: cuándo llegaron, qué les dijeron, qué atención han negado, cuánto tiempo llevan esperando..."
                                        value={form.descripcion_libre}
                                        onChange={e => updateField('descripcion_libre', e.target.value)}
                                    />
                                    <p style={{ fontSize: 11, color: '#555', textAlign: 'right', marginTop: 4 }}>{form.descripcion_libre.length}/1200</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>
                                        Detalles adicionales <span style={{ color: '#555' }}>(nombres de médicos que niegan atención, circunstancias relevantes)</span>
                                    </label>
                                    <textarea className="salvame-textarea" maxLength={800}
                                        placeholder="Ej: El Dr. Pérez Gómez del turno vespertino nos dijo que no había camas. La enfermera de recepción se negó a registrar al paciente..."
                                        value={form.detalles_medicos_adicionales}
                                        onChange={e => updateField('detalles_medicos_adicionales', e.target.value)}
                                        style={{ minHeight: 80 }}
                                    />
                                    <p style={{ fontSize: 11, color: '#555', textAlign: 'right', marginTop: 4 }}>{form.detalles_medicos_adicionales.length}/800</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 10, background: form.confirma_veracidad ? 'rgba(220,38,38,0.06)' : '#1a1a1a', border: `1px solid ${form.confirma_veracidad ? 'rgba(220,38,38,0.3)' : '#2a2a2a'} `, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={form.confirma_veracidad}
                                        onChange={e => updateField('confirma_veracidad', e.target.checked)}
                                        style={{ marginTop: 2, accentColor: '#dc2626' }} />
                                    <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>
                                        Lo escrito es veraz según mi leal saber y entender. <span style={{ color: '#888' }}>Bajo protesta de decir verdad.</span>
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* ─── NAV BUTTONS ────────────────────────────────────── */}
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
                                style={{ animation: canProceed() ? 'pulseGlow 2s ease-in-out infinite' : 'none' }}>
                                <MedicalCross size={18} color="white" /> Generar Amparo de Emergencia
                            </button>
                        )}
                    </div>

                    {error && (
                        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', fontSize: 14 }}>
                            {error}
                        </div>
                    )}
                </main>
            )}

            {/* ─── GENERATING LOADER ──────────────────────────────────── */}
            {phase === 'generating' && (
                <main style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
                    <div style={{ marginBottom: 32 }}>
                        <div style={{ width: 56, height: 56, margin: '0 auto 24px', border: '3px solid rgba(220,38,38,0.2)', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ fontSize: 17, fontWeight: 600, color: '#f5f5f5', marginBottom: 8 }}>
                            {LOADER_MESSAGES[loaderIdx]}
                        </p>
                        <p style={{ fontSize: 13, color: '#666' }}>
                            Esto puede tomar entre 30 y 90 segundos
                        </p>
                    </div>

                    {/* Live preview of generated text */}
                    {generatedText && (
                        <div style={{ textAlign: 'left', maxHeight: 300, overflow: 'hidden', position: 'relative' }}>
                            <div className="result-text" style={{ fontSize: 13, opacity: 0.6 }}>
                                {renderFormattedText(generatedText)}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, #0f0f0f)' }} />
                        </div>
                    )}
                </main>
            )}

            {/* ─── RESULT ─────────────────────────────────────────────── */}
            {phase === 'result' && (
                <main ref={resultRef} style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 60px', animation: 'fadeIn 0.5s ease-out' }}>
                    {/* Success banner */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', marginBottom: 24,
                        borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    }}>
                        <CheckCircle size={22} />
                        <div>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#4ade80' }}>Amparo generado exitosamente</p>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Revisa el escrito, descárgalo e imprímelo por triplicado.</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                        <button className="btn-primary" onClick={handleDownloadDocx} disabled={downloading} style={{ fontSize: 14 }}>
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

                    {/* Generated text */}
                    <div className="result-text">{renderFormattedText(generatedText)}</div>

                    {/* ECG separator */}
                    <div style={{ margin: '32px 0 24px' }}><EcgLine /></div>

                    {/* ─── GUÍA DE ACCIÓN INMEDIATA ──────────────────────── */}
                    <div style={{
                        padding: '24px', borderRadius: 16, background: '#151515', border: '1px solid rgba(220,38,38,0.15)',
                    }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f87171', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangleIcon size={20} /> Guía de Acción Inmediata
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
                                    <span style={{
                                        width: 26, height: 26, borderRadius: '50%', background: 'rgba(220,38,38,0.12)', color: '#f87171',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0,
                                    }}>{item.n}</span>
                                    <p style={{ margin: 0, fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── ¿QUÉ SIGUE? BUTTON + INSTRUCTIONS ──────────── */}
                    <div style={{ textAlign: 'center', marginTop: 28 }}>
                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                padding: '16px 36px', borderRadius: 14, border: 'none',
                                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                color: 'white', fontSize: 16, fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'inherit',
                                boxShadow: '0 4px 20px rgba(220,38,38,0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(220,38,38,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.3)'; }}
                        >
                            ✅ Ya tengo la demanda generada y revisada, ¿qué sigue?
                            <span style={{ transition: 'transform 0.3s', transform: showInstructions ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 14 }}>▼</span>
                        </button>
                    </div>

                    {showInstructions && (
                        <div style={{
                            marginTop: 24, padding: '28px', borderRadius: 16,
                            background: '#151515', border: '1px solid rgba(220,38,38,0.2)',
                            animation: 'fadeIn 0.4s ease-out',
                        }}>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f87171', margin: '0 0 24px', textAlign: 'center' }}>
                                📋 Instrucciones para presentar tu Amparo
                            </h3>

                            {/* SECTION 1: ¿A qué instalaciones dirigirte? */}
                            <div style={{ marginBottom: 28 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#e5e5e5', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 28, height: 28, borderRadius: '50%', background: 'rgba(220,38,38,0.15)', color: '#f87171',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
                                    }}>1</span>
                                    ¿A qué instalaciones dirigirte? (La jerarquía de juzgados)
                                </h4>

                                {/* ── Oficialía de Partes Info Card (from DB) ───────── */}
                                {juzgadoInfo && (
                                    <div style={{
                                        padding: '20px', borderRadius: 14, marginBottom: 18, marginLeft: 36,
                                        background: 'linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0.02) 100%)',
                                        border: '1px solid rgba(220,38,38,0.2)',
                                        boxShadow: '0 2px 12px rgba(220,38,38,0.08)',
                                    }}>
                                        <p style={{ margin: '0 0 4px', fontSize: 11, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            🏛️ Oficialía de Partes Común — {form.hospital_estado}
                                        </p>
                                        <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#f5f5f5', lineHeight: 1.4 }}>
                                            {juzgadoInfo.denominacion_turno}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <p style={{ margin: 0, fontSize: 13, color: '#ccc', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                <span style={{ flexShrink: 0 }}>📍</span> {juzgadoInfo.direccion_oficialia}
                                            </p>
                                            {juzgadoInfo.telefono && (
                                                <p style={{ margin: 0, fontSize: 13, color: '#ccc', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ flexShrink: 0 }}>📞</span> {juzgadoInfo.telefono}
                                                </p>
                                            )}
                                        </div>
                                        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
                                            ⏰ Funciona las 24 horas, los 365 días del año
                                        </p>
                                        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                                            Fuente: Directorio del Consejo de la Judicatura Federal (CJF)
                                        </p>
                                    </div>
                                )}

                                <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7, margin: '0 0 14px', paddingLeft: 36 }}>
                                    Idealmente, debes acudir a las instalaciones del <strong style={{ color: '#f5f5f5' }}>Poder Judicial de la Federación</strong> para presentarla ante un <strong style={{ color: '#f5f5f5' }}>Juez de Distrito</strong>. Sin embargo, la ley prevé qué hacer si no hay uno cerca:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 36 }}>
                                    {[
                                        'Si en el lugar donde te encuentras no reside un juez de distrito, debes entregar la demanda al juez de primera instancia (un juez local o estatal) dentro de cuya jurisdicción radique la autoridad del hospital que niega la atención. Este juez está obligado a recibirla y acordar de plano la suspensión.',
                                        'Si tampoco hay un juez de primera instancia en el lugar, o si la autoridad no puede ser habida, puedes presentar la demanda ante cualquiera de los órganos judiciales que ejerzan jurisdicción en ese mismo lugar.',
                                        'En su defecto, puedes acudir ante el órgano jurisdiccional más próximo.',
                                    ].map((text, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: '50%', background: '#1e1e1e', border: '1px solid #333', color: '#888',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2,
                                            }}>{idx + 1}</span>
                                            <p style={{ margin: 0, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <hr style={{ border: 'none', borderTop: '1px solid #262626', margin: '0 0 28px' }} />

                            {/* SECTION 2: Lo que hará el Juez */}
                            <div style={{ marginBottom: 28 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#e5e5e5', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 28, height: 28, borderRadius: '50%', background: 'rgba(220,38,38,0.15)', color: '#f87171',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
                                    }}>2</span>
                                    Lo que hará el Juez (La Suspensión Inmediata)
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 36 }}>
                                    <p style={{ margin: 0, fontSize: 14, color: '#ccc', lineHeight: 1.7 }}>
                                        Dado que es un caso de urgencia (artículos 15 y 20 de la Ley de Amparo), el juez debe proveer o dar respuesta <strong style={{ color: '#4ade80' }}>de inmediato</strong>.
                                    </p>
                                    {[
                                        'El juez decretará la suspensión de los actos reclamados y dictará las medidas necesarias.',
                                        'Esta suspensión se concederá de oficio y de plano (de forma automática y directa).',
                                        'El juez comunicará esta suspensión sin demora a la autoridad responsable (el hospital) por cualquier medio que permita lograr su inmediato cumplimiento para que atiendan al paciente.',
                                    ].map((text, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#4ade80', fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                                            <p style={{ margin: 0, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <hr style={{ border: 'none', borderTop: '1px solid #262626', margin: '0 0 28px' }} />

                            {/* SECTION 3: La Ratificación */}
                            <div>
                                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#e5e5e5', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 28, height: 28, borderRadius: '50%', background: 'rgba(220,38,38,0.15)', color: '#f87171',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
                                    }}>3</span>
                                    El seguimiento obligatorio: La Ratificación
                                </h4>
                                <div style={{ paddingLeft: 36 }}>
                                    <div style={{
                                        padding: '16px 18px', borderRadius: 12, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)', marginBottom: 14,
                                    }}>
                                        <p style={{ margin: 0, fontSize: 13, color: '#fbbf24', lineHeight: 1.6, fontWeight: 500 }}>
                                            ⚠️ Este paso no siempre ocurrirá (dada la naturaleza del acto reclamado); sin embargo, dependerá del criterio del juez y no debes olvidarlo una vez que pase la urgencia médica.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <p style={{ margin: 0, fontSize: 14, color: '#ccc', lineHeight: 1.7 }}>
                                            El Juez podría ordenar al actuario, si es que es posible, que <strong style={{ color: '#f5f5f5' }}>el paciente ratifique (confirme)</strong> la demanda de amparo que tú presentaste por él.
                                        </p>
                                        <p style={{ margin: 0, fontSize: 14, color: '#ccc', lineHeight: 1.7 }}>
                                            Si el paciente, por sí mismo o por medio de su representante, <strong style={{ color: '#f87171' }}>no ratifica la demanda, esta se tendrá por no presentada</strong> y quedarán sin efecto. Es importante que, si está en condiciones, la persona hospitalizada tenga conocimiento de que se presentó una demanda de amparo a su nombre para que la ratifique en caso de que así sea requerido.
                                        </p>
                                        <div style={{
                                            padding: '14px 18px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                                        }}>
                                            <p style={{ margin: 0, fontSize: 13, color: '#4ade80', lineHeight: 1.6 }}>
                                                💚 Si la persona no está en posibilidades por sus condiciones de salud, no te preocupes — no será necesaria esa ratificación inmediata.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            )}

            {/* ─── OMS/OPS DATA SECTION ───────────────────────────────── */}
            {(phase === 'form' || phase === 'result') && (
                <section style={{
                    maxWidth: 760, margin: '0 auto', padding: '24px 24px 60px',
                    animation: 'fadeIn 0.6s ease-out 0.2s both',
                }}>
                    <div style={{ margin: '0 0 20px' }}><EcgLine /></div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#888', margin: '0 0 16px', textAlign: 'center' }}>
                        Datos de Salud — México (OMS/OPS)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                        {[
                            {
                                icon: <MedicalCross size={18} color="#dc2626" />,
                                title: 'Cobertura de servicios esenciales',
                                value: '79.0',
                                unit: '/ 100',
                                desc: 'Índice de Cobertura de Servicios de Salud (UHC), 2023.',
                                source: 'OMS',
                            },
                            {
                                icon: <HospitalIcon size={18} />,
                                title: 'Capacidad y acceso a servicios',
                                value: '45.0',
                                unit: '/ 100',
                                desc: 'Subíndice de capacidad y acceso (UHC), 2023.',
                                source: 'OMS',
                            },
                            {
                                icon: <ChartIcon size={18} />,
                                title: 'Gasto actual en salud',
                                value: '6.08%',
                                unit: 'del PIB',
                                desc: 'Gasto corriente en salud de México, 2021.',
                                source: 'Banco Mundial / OMS',
                            },
                            {
                                icon: <ShieldCheck size={18} />,
                                title: 'Seguridad del paciente',
                                value: '1 de 10',
                                unit: 'pacientes',
                                desc: 'Sufre daños durante la atención; muchos son prevenibles.',
                                source: 'OMS (contexto global)',
                            },
                        ].map((card, i) => (
                            <div key={i} style={{
                                padding: '18px', borderRadius: 14, background: '#151515', border: '1px solid #222',
                                transition: 'border-color 0.2s',
                            }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#999' }}>
                                    {card.icon}
                                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.title}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                                    <span style={{ fontSize: 28, fontWeight: 700, color: '#f5f5f5' }}>{card.value}</span>
                                    <span style={{ fontSize: 13, color: '#666' }}>{card.unit}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.4 }}>{card.desc}</p>
                                <p style={{ margin: '6px 0 0', fontSize: 10, color: '#444' }}>Fuente: {card.source}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ─── FOOTER ─────────────────────────────────────────────── */}
            <footer style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#444' }}>
                    Iurexia Legal AI · SÁLVAME · Este módulo no constituye asesoría legal personalizada.
                </p>
            </footer>
        </div>
    );
}
