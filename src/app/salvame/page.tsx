'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useAuth';

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
    director_nombre: string;
    // Step 4 — Situación
    situaciones: string[];
    descripcion_libre: string;
    confirma_veracidad: boolean;
}

const INITIAL_FORM: FormData = {
    promovente_nombre: '',
    promovente_telefono: '',
    promovente_correo: '',
    promovente_domicilio: '',
    promueve_por_paciente: false,
    paciente_nombre: '',
    paciente_edad: '',
    paciente_diagnostico: '',
    paciente_riesgo: '',
    institucion: '',
    hospital_nombre: '',
    hospital_ciudad: '',
    hospital_estado: '',
    director_nombre: '',
    situaciones: [],
    descripcion_libre: '',
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

const ShieldCheck = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const CheckCircle = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    const { loading: authLoading, isAuthenticated, user } = useRequireAuth();
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
      <style>body{font-family:Arial,sans-serif;font-size:14pt;margin:2.5cm;line-height:1.8;text-align:justify;}h2,h3{text-align:center;}</style>
      </head><body>${generatedText.replace(/\n/g, '<br/>')}</body></html>
    `);
        w.document.close();
        w.print();
    };

    // ─── Auth loading ─────────────────────────────────────────────
    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(220,38,38,0.3)', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 8px rgba(220,38,38,0.3); } 50% { box-shadow: 0 0 24px rgba(220,38,38,0.6); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ecgPulse { 0% { stroke-dashoffset: 600; } 100% { stroke-dashoffset: 0; } }
        .salvame-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: #e5e5e5; font-size: 15px; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; outline: none; box-sizing: border-box; }
        .salvame-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.15); }
        .salvame-input::placeholder { color: #666; }
        .salvame-select { appearance: none; width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center; color: #e5e5e5; font-size: 15px; font-family: inherit; cursor: pointer; outline: none; transition: border-color 0.2s; }
        .salvame-select:focus { border-color: #dc2626; }
        .salvame-textarea { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: #e5e5e5; font-size: 15px; font-family: inherit; resize: vertical; min-height: 120px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .salvame-textarea:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.15); }
        .chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; border: 1px solid #333; background: #1a1a1a; color: #aaa; font-size: 14px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .chip:hover { border-color: #dc2626; color: #e5e5e5; }
        .chip.active { background: rgba(220,38,38,0.15); border-color: #dc2626; color: #f87171; }
        .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; border: none; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-family: inherit; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(220,38,38,0.4); }
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
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#e5e5e5', letterSpacing: '0.05em' }}>SALVAME</span>
                    <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>Iurexia Legal AI</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#555', padding: '4px 10px', border: '1px solid #2a2a2a', borderRadius: 6 }}>Módulo Gratuito</span>
                </div>
            </header>

            {/* ─── INTRO / TERMS SCREEN ─────────────────────────────── */}
            {phase === 'intro' && (
                <section style={{
                    padding: '48px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                    animation: 'fadeIn 0.6s ease-out',
                }}>
                    {/* Background heart watermark */}
                    <div style={{ position: 'absolute', top: 20, right: '10%', opacity: 0.04, pointerEvents: 'none' }}>
                        <HeartPulse size={280} color="#dc2626" />
                    </div>

                    <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <MedicalCross size={32} color="#dc2626" />
                            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#f5f5f5', margin: 0, letterSpacing: '-0.02em' }}>
                                SALVAME
                            </h1>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#a3a3a3', margin: '8px 0 28px', lineHeight: 1.5 }}>
                            Amparo de emergencia por salud
                        </h2>


                        {/* ─── What is this tool? ──────────────────────── */}
                        <div style={{ textAlign: 'left', marginBottom: 40 }}>
                            <h3 style={{
                                fontSize: 24, fontWeight: 300, color: '#e5e5e5', margin: '0 0 16px',
                                fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '-0.01em',
                            }}>
                                ¿Qué es esta herramienta?
                            </h3>
                            <p style={{ fontSize: 17, color: '#999', lineHeight: 1.8, margin: 0 }}>
                                <strong style={{ color: '#d4d4d4' }}>SALVAME</strong> es una herramienta gratuita
                                diseñada para ayudar a todas las personas que enfrentan una emergencia de salud
                                y necesitan exigir atención médica de manera legal e inmediata.
                            </p>
                        </div>

                        {/* ─── Thin separator ─────────────────────────── */}
                        <div style={{ width: 60, height: 1, background: 'rgba(220,38,38,0.3)', margin: '0 0 40px' }} />

                        {/* ─── What is Amparo for? ────────────────────── */}
                        <div style={{ textAlign: 'left', marginBottom: 40 }}>
                            <h3 style={{
                                fontSize: 24, fontWeight: 300, color: '#e5e5e5', margin: '0 0 16px',
                                fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '-0.01em',
                            }}>
                                ¿Para qué sirve el Juicio de Amparo en este caso?
                            </h3>
                            <p style={{ fontSize: 17, color: '#999', lineHeight: 1.8, margin: 0 }}>
                                En casos como estos, el <strong style={{ color: '#d4d4d4' }}>Juicio de Amparo</strong> funciona
                                como un derecho constitucional que permite a cualquier persona solicitar a un juez
                                federal que ordene a la autoridad responsable — como un hospital público — que
                                proteja tu <strong style={{ color: '#d4d4d4' }}>derecho a la salud y a la vida</strong>.
                                No necesitas ser abogado para presentarlo.
                            </p>
                        </div>

                        {/* ─── Thin separator ─────────────────────────── */}
                        <div style={{ width: 60, height: 1, background: 'rgba(220,38,38,0.3)', margin: '0 0 40px' }} />

                        {/* ─── How it works ───────────────────────────── */}
                        <div style={{ textAlign: 'left', marginBottom: 44 }}>
                            <h3 style={{
                                fontSize: 24, fontWeight: 300, color: '#e5e5e5', margin: '0 0 16px',
                                fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '-0.01em',
                            }}>
                                ¿Cómo funciona?
                            </h3>
                            <p style={{ fontSize: 17, color: '#999', lineHeight: 1.8, margin: 0 }}>
                                Completas un formulario breve con tus datos, los del paciente y la situación.
                                La inteligencia artificial genera automáticamente la demanda de amparo lista para
                                imprimir, firmar y presentar ante un Juzgado de Distrito. También recibirás
                                instrucciones paso a paso de cómo y dónde presentarla según tu ubicación.
                            </p>
                        </div>

                        {/* ─── ECG separator ──────────────────────────── */}
                        <div style={{ maxWidth: 400, margin: '0 auto 36px' }}>
                            <EcgLine />
                        </div>

                        {/* ─── Urgent use warning ─────────────────────── */}
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <p style={{ fontSize: 15, color: '#f87171', fontWeight: 600, margin: '0 0 8px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangleIcon size={18} />
                                Uso exclusivo para emergencias reales
                            </p>
                            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
                                Esta herramienta genera un <strong style={{ color: '#aaa' }}>documento legal real</strong> que
                                será presentado ante un juez. Está diseñada estrictamente para casos de urgencia
                                en los que se te esté negando atención médica. Por favor, utilízala con responsabilidad.
                            </p>
                        </div>
                        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, textAlign: 'center', margin: '0 0 32px' }}>
                            <strong style={{ color: '#fbbf24' }}>Si hay peligro inmediato de vida</strong>, acude
                            primero a urgencias. Este módulo complementa esa acción.
                        </p>

                        {/* ─── Terms Checkbox ─────────────────────────── */}
                        <label style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                            padding: '16px 18px', borderRadius: 12,
                            background: termsAccepted ? 'rgba(220,38,38,0.06)' : '#1a1a1a',
                            border: `1px solid ${termsAccepted ? 'rgba(220,38,38,0.3)' : '#2a2a2a'}`,
                            transition: 'all 0.2s', textAlign: 'left',
                        }}>
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={e => setTermsAccepted(e.target.checked)}
                                style={{ marginTop: 3, accentColor: '#dc2626', width: 18, height: 18, flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
                                Declaro que necesito esta herramienta por una <strong style={{ color: '#e5e5e5' }}>situación
                                    de emergencia de salud real</strong> y me comprometo a usarla de manera responsable.
                                <span style={{ color: '#888' }}> Acepto los términos y condiciones de uso.</span>
                            </span>
                        </label>

                        {/* ─── Continue Button ────────────────────────── */}
                        <div style={{ textAlign: 'center', marginTop: 28 }}>
                            <button
                                className="btn-primary"
                                disabled={!termsAccepted}
                                onClick={() => setPhase('form')}
                                style={{ padding: '16px 40px', fontSize: 17 }}
                            >
                                <MedicalCross size={20} color="white" />
                                Comenzar
                            </button>
                            <p style={{ fontSize: 12, color: '#555', marginTop: 12 }}>
                                Herramienta 100% gratuita — Iurexia Legal AI
                            </p>
                        </div>
                    </div>
                </section>
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
                                SALVAME
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
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 10, background: form.promueve_por_paciente ? 'rgba(220,38,38,0.06)' : '#1a1a1a', border: `1px solid ${form.promueve_por_paciente ? 'rgba(220,38,38,0.3)' : '#2a2a2a'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={form.promueve_por_paciente}
                                        onChange={e => updateField('promueve_por_paciente', e.target.checked)}
                                        style={{ marginTop: 2, accentColor: '#dc2626' }} />
                                    <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>
                                        Promuevo por el paciente por imposibilidad de hacerlo personalmente <span style={{ color: '#888' }}>(art. 15 Ley de Amparo)</span>
                                    </span>
                                </label>
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
                                                className={`chip ${form.paciente_riesgo === opt.value ? 'active' : ''}`}
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
                                                className={`chip ${form.situaciones.includes(s) ? 'active' : ''}`}
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
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 10, background: form.confirma_veracidad ? 'rgba(220,38,38,0.06)' : '#1a1a1a', border: `1px solid ${form.confirma_veracidad ? 'rgba(220,38,38,0.3)' : '#2a2a2a'}`, transition: 'all 0.2s' }}>
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
                                {generatedText}
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
                    <div className="result-text">{generatedText}</div>

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
                    Iurexia Legal AI · SALVAME · Este módulo no constituye asesoría legal personalizada.
                </p>
            </footer>
        </div>
    );
}
