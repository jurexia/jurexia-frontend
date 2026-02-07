'use client';

import { useState, useEffect } from 'react';
import {
    BadgeCheck,
    Search,
    MapPin,
    Briefcase,
    Scale,
    Loader2,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ExternalLink,
    Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    validateCedula,
    sepomexLookup,
    indexLawyerProfile,
    CedulaValidationResponse,
} from '@/lib/api';

// reCAPTCHA v3 site key (SEP's official key)
const RECAPTCHA_SITE_KEY = '6Leb1M4rAAAAAP_gRcAyMiOo99-j6eqQajKuMlB9';

// Declare grecaptcha global
declare global {
    interface Window {
        grecaptcha: {
            ready: (cb: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface LawyerProfileData {
    id: string;
    cedula_number: string;
    full_name: string;
    specialties: string[];
    bio: string;
    office_address: { estado: string; municipio: string; cp: string };
    verification_status: string;
    is_pro_active: boolean;
    avatar_url: string | null;
    phone: string | null;
}

// Specialties available
const SPECIALTIES = [
    'Derecho Penal',
    'Derecho Civil',
    'Derecho Laboral',
    'Derecho Familiar',
    'Derecho Mercantil',
    'Amparo',
    'Derecho Fiscal',
    'Derecho Administrativo',
    'Derecho Constitucional',
    'Derecho Agrario',
    'Derecho Ambiental',
    'Propiedad Intelectual',
    'Derecho Migratorio',
    'Derecho Internacional',
];

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────

export default function ConnectLawyerSection({
    userId,
    userName,
    avatarUrl,
}: {
    userId: string;
    userName: string;
    avatarUrl?: string;
}) {
    // ── State ──
    const [step, setStep] = useState<'loading' | 'not_registered' | 'validating' | 'form' | 'registered'>('loading');
    const [existingProfile, setExistingProfile] = useState<LawyerProfileData | null>(null);

    // Cédula validation
    const [cedula, setCedula] = useState('');
    const [validating, setValidating] = useState(false);
    const [cedulaResult, setCedulaResult] = useState<CedulaValidationResponse | null>(null);

    // Profile form
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [cp, setCp] = useState('');
    const [estado, setEstado] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [colonia, setColonia] = useState('');
    const [phone, setPhone] = useState('');
    const [cpLookedUp, setCpLookedUp] = useState(false);

    // Submission
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ── Load existing profile ──
    useEffect(() => {
        async function checkExistingProfile() {
            try {
                const { data, error } = await supabase
                    .from('lawyer_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (data && !error) {
                    setExistingProfile(data);
                    setStep('registered');
                } else {
                    setStep('not_registered');
                }
            } catch {
                setStep('not_registered');
            }
        }

        checkExistingProfile();
    }, [userId]);

    // ── Load reCAPTCHA v3 script ──
    useEffect(() => {
        if (typeof window !== 'undefined' && !document.getElementById('recaptcha-sep')) {
            const script = document.createElement('script');
            script.id = 'recaptcha-sep';
            script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    // ── Cédula Validation ──
    const handleValidateCedula = async () => {
        if (!cedula.trim() || cedula.trim().length < 7) return;

        setValidating(true);
        setCedulaResult(null);

        try {
            // Generate reCAPTCHA v3 token
            let recaptchaToken: string | undefined;
            try {
                if (window.grecaptcha) {
                    recaptchaToken = await new Promise<string>((resolve) => {
                        window.grecaptcha.ready(() => {
                            window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'buscar_cedula' }).then(resolve);
                        });
                    });
                }
            } catch (e) {
                console.warn('reCAPTCHA token generation failed:', e);
            }

            const result = await validateCedula(cedula.trim(), recaptchaToken);
            setCedulaResult(result);

            if (result.valid) {
                // Auto-advance to form
                setTimeout(() => setStep('form'), 1500);
            }
        } catch {
            setCedulaResult({
                valid: false,
                cedula: cedula.trim(),
                error: 'Error de conexión. Intente nuevamente.',
            });
        } finally {
            setValidating(false);
        }
    };

    // ── CP Lookup ──
    const handleCpLookup = async () => {
        if (cp.length < 5) return;

        try {
            const result = await sepomexLookup(cp);
            setEstado(result.estado);
            setMunicipio(result.municipio);
            setColonia(result.colonia || '');
            setCpLookedUp(true);
        } catch {
            // Not found — let user type manually
            setCpLookedUp(false);
        }
    };

    // ── Toggle Specialty ──
    const toggleSpecialty = (spec: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(spec)
                ? prev.filter(s => s !== spec)
                : prev.length < 5
                    ? [...prev, spec]
                    : prev
        );
    };

    // ── Submit Profile ──
    const handleSubmit = async () => {
        if (!cedulaResult?.valid) return;
        if (selectedSpecialties.length === 0) {
            setSubmitError('Selecciona al menos una especialidad');
            return;
        }
        if (!bio.trim()) {
            setSubmitError('Escribe una bio profesional');
            return;
        }
        if (!estado) {
            setSubmitError('Ingresa tu código postal para obtener tu ubicación');
            return;
        }

        setSubmitting(true);
        setSubmitError('');

        try {
            // 1. Insert into Supabase
            const { error: dbError } = await supabase
                .from('lawyer_profiles')
                .upsert({
                    id: userId,
                    cedula_number: cedulaResult.cedula,
                    full_name: cedulaResult.nombre || userName,
                    specialties: selectedSpecialties,
                    bio: bio.trim(),
                    office_address: { estado, municipio, cp },
                    verification_status: 'verified',
                    is_pro_active: true,
                    avatar_url: avatarUrl || null,
                    phone: phone || null,
                });

            if (dbError) {
                throw new Error(dbError.message);
            }

            // 2. Index in Qdrant for semantic search
            await indexLawyerProfile({
                cedula_number: cedulaResult.cedula,
                full_name: cedulaResult.nombre || userName,
                specialties: selectedSpecialties,
                bio: bio.trim(),
                office_address: { estado, municipio, cp },
                avatar_url: avatarUrl,
            });

            // 3. Update local state
            setExistingProfile({
                id: userId,
                cedula_number: cedulaResult.cedula,
                full_name: cedulaResult.nombre || userName,
                specialties: selectedSpecialties,
                bio: bio.trim(),
                office_address: { estado, municipio, cp },
                verification_status: 'verified',
                is_pro_active: true,
                avatar_url: avatarUrl || null,
                phone: phone || null,
            });

            setStep('registered');
        } catch (err: any) {
            setSubmitError(err.message || 'Error al registrar perfil');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading State ──
    if (step === 'loading') {
        return (
            <section className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-charcoal-600">Cargando perfil Connect...</span>
                </div>
            </section>
        );
    }

    // ── Already Registered ──
    if (step === 'registered' && existingProfile) {
        return (
            <section className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <Scale className="w-5 h-5 text-blue-600" />
                    <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                        IUREXIA Connect
                    </h2>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wide">
                        Verificado
                    </span>
                </div>

                {/* Profile Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 mb-4">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-charcoal-700 to-charcoal-900 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {existingProfile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-charcoal-900">
                                    {existingProfile.full_name}
                                </h3>
                                <BadgeCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <p className="text-xs text-charcoal-500 mt-0.5">
                                Cédula: {existingProfile.cedula_number}
                            </p>
                            <p className="text-xs text-charcoal-400 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {existingProfile.office_address.municipio}, {existingProfile.office_address.estado}
                            </p>
                        </div>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {existingProfile.specialties.map((spec, i) => (
                            <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg border bg-white text-blue-700 border-blue-200">
                                {spec}
                            </span>
                        ))}
                    </div>

                    {/* Bio */}
                    {existingProfile.bio && (
                        <p className="text-sm text-charcoal-600 mt-3 line-clamp-2">{existingProfile.bio}</p>
                    )}
                </div>

                {/* CTA — Bandeja de Solicitudes */}
                <Link
                    href="/connect/inbox"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-charcoal-900 text-white rounded-xl font-medium hover:bg-charcoal-800 transition-colors"
                >
                    <Inbox className="w-4 h-4" />
                    <span>Ver Bandeja de Solicitudes</span>
                    <ExternalLink className="w-4 h-4" />
                </Link>

                <p className="text-xs text-charcoal-400 text-center mt-3">
                    Tu perfil está visible en el directorio de IUREXIA Connect
                </p>
            </section>
        );
    }

    // ── Registration Flow ──
    return (
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                    IUREXIA Connect
                </h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                    PRO
                </span>
            </div>
            <p className="text-sm text-charcoal-500 mb-6">
                Registra tu perfil de abogado verificado y recibe solicitudes de asesoría de usuarios en tu zona.
            </p>

            {/* Step 1: Cédula Validation */}
            {(step === 'not_registered' || step === 'validating') && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                            Cédula Profesional
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={cedula}
                                    onChange={(e) => {
                                        setCedula(e.target.value);
                                        setCedulaResult(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleValidateCedula()}
                                    placeholder="Ej: 12345678"
                                    className="w-full pl-10 pr-4 py-2.5 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-charcoal-900"
                                />
                            </div>
                            <button
                                onClick={handleValidateCedula}
                                disabled={validating || cedula.trim().length < 5}
                                className="px-5 py-2.5 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {validating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <BadgeCheck className="w-4 h-4" />
                                )}
                                <span>Validar</span>
                            </button>
                        </div>
                        <p className="text-xs text-charcoal-400 mt-1.5">
                            Ingresa tu número de cédula profesional emitida por la SEP
                        </p>
                    </div>

                    {/* Validation Result */}
                    {cedulaResult && (
                        <div className={`flex items-start gap-3 p-4 rounded-xl border ${cedulaResult.valid
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                            }`}>
                            {cedulaResult.valid ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                                {cedulaResult.valid ? (
                                    <>
                                        <p className="font-medium text-green-800">Cédula válida ✓</p>
                                        {cedulaResult.nombre && (
                                            <p className="text-sm text-green-700 mt-1">
                                                <span className="font-semibold">Nombre:</span> {cedulaResult.nombre}
                                            </p>
                                        )}
                                        <p className="text-xs text-green-600 mt-0.5">
                                            <span className="font-semibold">Profesión:</span> {cedulaResult.profesion}
                                        </p>
                                        {cedulaResult.institucion && (
                                            <p className="text-xs text-green-600 mt-0.5">
                                                <span className="font-semibold">Institución:</span> {cedulaResult.institucion}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="font-medium text-red-800">Cédula no válida</p>
                                        <p className="text-sm text-red-600 mt-0.5">{cedulaResult.error}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info note */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-700">
                            <strong>Nota:</strong> La validación de tu cédula se verificará con la base de datos de la SEP. Tu perfil aparecerá como verificado en el directorio.
                        </p>
                    </div>
                </div>
            )}

            {/* Step 2: Profile Form */}
            {step === 'form' && cedulaResult?.valid && (
                <div className="space-y-5">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-800 font-semibold">Cédula verificada</span>
                            <span className="text-xs text-green-500 ml-auto">N.° {cedulaResult.cedula}</span>
                        </div>
                        <p className="text-sm text-green-700">
                            <span className="font-medium">Nombre:</span> {cedulaResult.nombre || userName}
                        </p>
                        {cedulaResult.profesion && (
                            <p className="text-xs text-green-600 mt-0.5">
                                <span className="font-medium">Profesión:</span> {cedulaResult.profesion}
                            </p>
                        )}
                        {cedulaResult.institucion && (
                            <p className="text-xs text-green-600 mt-0.5">
                                <span className="font-medium">Institución:</span> {cedulaResult.institucion}
                            </p>
                        )}
                    </div>

                    {/* Specialties */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                            <Briefcase className="w-4 h-4 inline mr-1" />
                            Especialidades (máx. 5)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SPECIALTIES.map(spec => (
                                <button
                                    key={spec}
                                    onClick={() => toggleSpecialty(spec)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${selectedSpecialties.includes(spec)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-charcoal-600 border-cream-300 hover:border-blue-300'
                                        }`}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-charcoal-400 mt-1">
                            {selectedSpecialties.length}/5 seleccionadas
                        </p>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                            Bio Profesional
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Describe tu experiencia, áreas de expertise y enfoque profesional..."
                            rows={3}
                            maxLength={500}
                            className="w-full px-4 py-2.5 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-charcoal-900 resize-none"
                        />
                        <p className="text-xs text-charcoal-400 mt-1">{bio.length}/500 caracteres</p>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Ubicación de despacho
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <input
                                    type="text"
                                    value={cp}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                        setCp(val);
                                        setCpLookedUp(false);
                                        if (val.length === 5) {
                                            // Auto-lookup on 5 digits
                                            setTimeout(async () => {
                                                try {
                                                    const result = await sepomexLookup(val);
                                                    setEstado(result.estado);
                                                    setMunicipio(result.municipio);
                                                    setColonia(result.colonia || '');
                                                    setCpLookedUp(true);
                                                } catch {
                                                    setCpLookedUp(false);
                                                }
                                            }, 100);
                                        }
                                    }}
                                    placeholder="C.P. (ej: 06600)"
                                    className="w-full px-3 py-2.5 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-charcoal-900"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={cpLookedUp ? (estado.replace(/_/g, ' ')) : estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                    placeholder="Estado"
                                    className="w-full px-3 py-2.5 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-charcoal-900 disabled:bg-gray-50"
                                    disabled={cpLookedUp}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={municipio}
                                    onChange={(e) => setMunicipio(e.target.value)}
                                    placeholder="Municipio"
                                    className="w-full px-3 py-2.5 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-charcoal-900 disabled:bg-gray-50"
                                    disabled={cpLookedUp}
                                />
                            </div>
                        </div>
                        {cpLookedUp && colonia && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {colonia}, {municipio}, {estado.replace(/_/g, ' ')}
                            </p>
                        )}
                    </div>

                    {/* Phone (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                            Teléfono <span className="text-charcoal-400 font-normal">(opcional, solo visible para ti)</span>
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="55 1234 5678"
                            className="w-full px-4 py-2.5 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-charcoal-900"
                        />
                    </div>

                    {/* Error */}
                    {submitError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-700">{submitError}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => {
                                setStep('not_registered');
                                setCedulaResult(null);
                            }}
                            className="px-4 py-2.5 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || selectedSpecialties.length === 0 || !bio.trim() || !estado}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <BadgeCheck className="w-4 h-4" />
                            )}
                            <span>{submitting ? 'Registrando...' : 'Registrar Perfil de Abogado'}</span>
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
