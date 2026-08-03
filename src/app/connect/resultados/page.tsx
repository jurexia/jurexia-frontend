'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Search, MapPin, Shield, BadgeCheck, Users, ArrowRight,
    Check, X, Loader2, Phone, Mail, MessageSquare,
    CheckCircle2, Star, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useRequireAuth } from '@/lib/useAuth';
import { LawyerProfile, sendConnectRequest } from '@/lib/api';
import Navbar from '@/components/Navbar';

// Mexican states for filter
const ESTADOS = [
    { value: '', label: 'Todos los estados' },
    { value: 'AGUASCALIENTES', label: 'Aguascalientes' },
    { value: 'BAJA_CALIFORNIA', label: 'Baja California' },
    { value: 'BAJA_CALIFORNIA_SUR', label: 'Baja California Sur' },
    { value: 'CAMPECHE', label: 'Campeche' },
    { value: 'CHIAPAS', label: 'Chiapas' },
    { value: 'CHIHUAHUA', label: 'Chihuahua' },
    { value: 'CIUDAD_DE_MEXICO', label: 'Ciudad de México' },
    { value: 'COAHUILA', label: 'Coahuila' },
    { value: 'COLIMA', label: 'Colima' },
    { value: 'DURANGO', label: 'Durango' },
    { value: 'GUANAJUATO', label: 'Guanajuato' },
    { value: 'GUERRERO', label: 'Guerrero' },
    { value: 'HIDALGO', label: 'Hidalgo' },
    { value: 'JALISCO', label: 'Jalisco' },
    { value: 'MEXICO', label: 'Estado de México' },
    { value: 'MICHOACAN', label: 'Michoacán' },
    { value: 'MORELOS', label: 'Morelos' },
    { value: 'NAYARIT', label: 'Nayarit' },
    { value: 'NUEVO_LEON', label: 'Nuevo León' },
    { value: 'OAXACA', label: 'Oaxaca' },
    { value: 'PUEBLA', label: 'Puebla' },
    { value: 'QUERETARO', label: 'Querétaro' },
    { value: 'QUINTANA_ROO', label: 'Quintana Roo' },
    { value: 'SAN_LUIS_POTOSI', label: 'San Luis Potosí' },
    { value: 'SINALOA', label: 'Sinaloa' },
    { value: 'SONORA', label: 'Sonora' },
    { value: 'TABASCO', label: 'Tabasco' },
    { value: 'TAMAULIPAS', label: 'Tamaulipas' },
    { value: 'TLAXCALA', label: 'Tlaxcala' },
    { value: 'VERACRUZ', label: 'Veracruz' },
    { value: 'YUCATAN', label: 'Yucatán' },
    { value: 'ZACATECAS', label: 'Zacatecas' },
];

// ── Legal problem → specialty mapping for intelligent matching ──
const LEGAL_KEYWORDS: Record<string, string[]> = {
    'penal': ['penal', 'criminal', 'delito', 'homicidio', 'robo', 'fraude', 'violencia', 'abuso', 'extorsión', 'extorsion', 'secuestro', 'narcotráfico', 'narcotrafico', 'preso', 'cárcel', 'carcel', 'denuncia', 'ministerio público', 'ministerio publico', 'víctima', 'victima', 'agresión', 'agresion'],
    'civil': ['civil', 'contrato', 'propiedad', 'arrendamiento', 'renta', 'inmueble', 'compraventa', 'daños', 'danos', 'perjuicios', 'responsabilidad', 'obligaciones', 'prescripción', 'prescripcion', 'usucapión', 'usucapion', 'servidumbre', 'hipoteca', 'fianza', 'nulidad'],
    'familiar': ['familiar', 'familia', 'divorcio', 'custodia', 'pensión alimenticia', 'pension alimenticia', 'alimentos', 'matrimonio', 'patria potestad', 'adopción', 'adopcion', 'violencia familiar', 'guarda', 'convivencia', 'separación', 'separacion', 'hijos', 'esposo', 'esposa', 'pareja'],
    'laboral': ['laboral', 'trabajo', 'trabajador', 'despido', 'despidieron', 'liquidación', 'liquidacion', 'indemnización', 'indemnizacion', 'salario', 'sueldo', 'patrón', 'patron', 'empresa', 'sindicato', 'huelga', 'acoso laboral', 'aguinaldo', 'vacaciones', 'imss', 'seguro social', 'junta de conciliación', 'reinstalación', 'reinstalacion', 'injustificado', 'injustificadamente'],
    'mercantil': ['mercantil', 'comercial', 'sociedad', 'empresa', 'quiebra', 'concurso', 'pagaré', 'pagare', 'cheque', 'letra de cambio', 'título de crédito', 'titulo de credito', 'marca', 'patente', 'franquicia'],
    'amparo': ['amparo', 'constitucional', 'derechos humanos', 'garantías', 'garantias', 'suspensión', 'suspension', 'acto de autoridad', 'inconstitucional'],
    'fiscal': ['fiscal', 'impuesto', 'impuestos', 'sat', 'tributario', 'iva', 'isr', 'factura', 'contribución', 'contribucion', 'auditoría', 'auditoria', 'hacienda', 'crédito fiscal', 'credito fiscal', 'devolución', 'devolucion'],
    'administrativo': ['administrativo', 'gobierno', 'permiso', 'licencia', 'concesión', 'concesion', 'licitación', 'licitacion', 'expropiación', 'expropiacion', 'sanción', 'sancion', 'multa', 'trámite', 'tramite'],
};

function ResultadosContent() {
    const { user } = useRequireAuth('/login?redirect=/connect');
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const estado = searchParams.get('estado') || '';

    const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
    const [allLawyers, setAllLawyers] = useState<LawyerProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const [contactLawyer, setContactLawyer] = useState<LawyerProfile | null>(null);

    // Score a lawyer against a search query (0 to 100)
    const scoreLawyer = (lawyer: LawyerProfile, queryText: string, estadoFilter: string): number => {
        const queryLower = queryText.toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
        if (words.length === 0 && !estadoFilter) return 0;

        let score = 0;
        const maxScore = 100;

        const lawyerSpecs = (lawyer.specialties || []).map(s => s.toLowerCase());
        const bioLower = (lawyer.bio || '').toLowerCase();
        const nameLower = (lawyer.full_name || '').toLowerCase();

        // 1. Specialty matching via synonym map (up to 50 points)
        let specScore = 0;
        for (const [area, keywords] of Object.entries(LEGAL_KEYWORDS)) {
            const queryMatchesArea = words.some(w =>
                keywords.some(kw => kw.includes(w) || w.includes(kw))
            );
            const lawyerHasArea = lawyerSpecs.some(s => s.includes(area));
            if (queryMatchesArea && lawyerHasArea) {
                specScore = Math.max(specScore, 50);
            }
        }
        for (const word of words) {
            if (lawyerSpecs.some(s => s.includes(word))) {
                specScore = Math.max(specScore, 40);
            }
        }
        score += specScore;

        // 2. Bio keyword matching (up to 30 points)
        let bioHits = 0;
        for (const word of words) {
            if (bioLower.includes(word)) bioHits++;
        }
        if (words.length > 0) {
            score += Math.min(30, Math.round((bioHits / words.length) * 30));
        }

        // 3. Name matching (up to 10 points)
        for (const word of words) {
            if (nameLower.includes(word)) { score += 10; break; }
        }

        // 4. Estado match bonus (10 points)
        if (estadoFilter) {
            const lawyerEstado = (lawyer.office_address?.estado || '').toUpperCase().replace(/\s+/g, '_');
            if (lawyerEstado === estadoFilter || lawyerEstado.replace(/_/g, '') === estadoFilter.replace(/_/g, '')) {
                score += 10;
            }
        }

        // Generic term baseline 
        const genericTerms = ['abogado', 'abogada', 'licenciado', 'licenciada', 'asesoría', 'asesoria', 'legal', 'jurídico', 'juridico', 'consulta', 'asesor', 'defensa', 'demanda', 'juicio', 'proceso'];
        if (words.some(w => genericTerms.includes(w))) {
            score = Math.max(score, 20);
        }

        return Math.min(maxScore, score);
    };

    // Load lawyers and run search
    useEffect(() => {
        async function loadAndSearch() {
            setIsLoading(true);
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                const { data, error } = await supabase
                    .from('lawyer_profiles')
                    .select('*')
                    .eq('is_pro_active', true)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    const mapped: LawyerProfile[] = data.map((row: Record<string, unknown>) => ({
                        id: row.id as string,
                        full_name: row.full_name as string,
                        cedula_number: (row.cedula_number || '') as string,
                        specialties: (row.specialties || []) as string[],
                        bio: (row.bio || '') as string,
                        office_address: {
                            estado: (row.estado || (row.office_address as Record<string, string>)?.estado || '') as string,
                            municipio: (row.municipio || (row.office_address as Record<string, string>)?.municipio || '') as string,
                            cp: (row.cp || (row.office_address as Record<string, string>)?.cp || '') as string,
                        },
                        verification_status: (row.verification_status || '') as string,
                        is_pro_active: row.is_pro_active as boolean,
                        avatar_url: (row.avatar_url || undefined) as string | undefined,
                        phone: (row.phone || undefined) as string | undefined,
                        phone_visible: (row.phone_visible || false) as boolean,
                    }));
                    setAllLawyers(mapped);

                    // Score all lawyers
                    const scored = mapped.map(lawyer => ({
                        lawyer,
                        score: scoreLawyer(lawyer, query, estado),
                    }));

                    // Filter by estado if selected
                    let results = estado
                        ? scored.filter(s => {
                            const lawyerEstado = (s.lawyer.office_address?.estado || '').toUpperCase().replace(/\s+/g, '_');
                            return lawyerEstado === estado || lawyerEstado.replace(/_/g, '') === estado.replace(/_/g, '');
                        })
                        : scored;

                    // If there's a text query, filter to score > 0 and sort by score desc
                    if (query.length >= 2) {
                        results = results.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
                    }

                    const finalLawyers = results.map(s => ({
                        ...s.lawyer,
                        score: s.score,
                    }));

                    setLawyers(finalLawyers);
                    setTotalResults(finalLawyers.length);
                }
            } catch (err) {
                console.error('Error loading lawyers:', err);
            } finally {
                setIsLoading(false);
            }
        }

        loadAndSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, estado]);

    const estadoLabel = ESTADOS.find(e => e.value === estado)?.label || '';

    return (
        <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', color: '#f5f5f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <Navbar />

            {/* Header */}
            <section style={{ paddingTop: '100px', paddingBottom: '32px', paddingLeft: '24px', paddingRight: '24px', borderBottom: '1px solid #1A1A1A' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Link
                        href="/connect"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '0.875rem', marginBottom: '24px', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#888'}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Volver a Connect
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                                Resultados para: <span style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>&ldquo;{query}&rdquo;</span>
                            </h1>
                            {estadoLabel && (
                                <div className="flex items-center gap-2" style={{ color: '#888', fontSize: '0.875rem' }}>
                                    <MapPin className="w-4 h-4" />
                                    <span>Filtrado por {estadoLabel}</span>
                                </div>
                            )}
                        </div>
                        {!isLoading && (
                            <p style={{ fontSize: '0.875rem', color: '#888' }}>
                                {totalResults} abogado{totalResults !== 1 ? 's' : ''} verificado{totalResults !== 1 ? 's' : ''} — ordenados por relevancia
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Results Grid */}
            <section style={{ padding: '40px 24px 80px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {isLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', marginBottom: '16px' }} className="animate-spin" />
                            <p style={{ color: '#888' }}>Analizando perfiles de abogados verificados...</p>
                        </div>
                    )}

                    {!isLoading && lawyers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '64px 0', background: '#111', borderRadius: '24px', border: '1px solid #222' }}>
                            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: '#222', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users className="w-8 h-8 text-gray-500" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f5f5f5', marginBottom: '8px' }}>
                                Sin resultados
                            </h3>
                            <p style={{ color: '#888', maxWidth: '400px', margin: '0 auto', marginBottom: '24px' }}>
                                No encontramos abogados exactos para tu búsqueda. El directorio Premium se está construyendo — pronto habrá más profesionales.
                            </p>
                            <Link
                                href="/connect"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 24px', background: '#2563EB', color: '#fff', borderRadius: '12px', fontWeight: 500, textDecoration: 'none' }}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Intentar otra búsqueda
                            </Link>
                        </div>
                    )}

                    {!isLoading && lawyers.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lawyers.map((lawyer) => (
                                <LawyerCard
                                    key={lawyer.id}
                                    lawyer={lawyer}
                                    onContact={() => setContactLawyer(lawyer)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Contact Request Modal */}
            {contactLawyer && (
                <ContactModal
                    lawyer={contactLawyer}
                    searchQuery={query}
                    userId={user?.id}
                    onClose={() => setContactLawyer(null)}
                />
            )}
        </div>
    );
}

export default function ResultadosPage() {
    return (
        <Suspense fallback={
            <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%' }} className="animate-spin" />
            </div>
        }>
            <ResultadosContent />
        </Suspense>
    );
}

// ─────────────────────────────────────────
// Lawyer Card Component
// ─────────────────────────────────────────

function LawyerCard({ lawyer, onContact }: { lawyer: LawyerProfile; onContact: () => void }) {
    const estadoRaw = lawyer.office_address?.estado || '';
    const municipio = lawyer.office_address?.municipio || '';
    const estadoNormalized = estadoRaw.toUpperCase().replace(/\s+/g, '_');
    const estadoLabel = ESTADOS.find(e => e.value === estadoNormalized || e.value === estadoRaw)?.label || estadoRaw;
    const location = [municipio, estadoLabel].filter(Boolean).join(', ');
    const isVerified = lawyer.verification_status === 'verified';
    const matchScore = lawyer.score || 0;
    const initials = lawyer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div style={{ background: '#111', borderRadius: '24px', border: '1px solid #222', padding: '24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Match Score Badge */}
            {matchScore > 0 && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', background: matchScore >= 50 ? 'rgba(34, 197, 94, 0.1)' : matchScore >= 30 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: matchScore >= 50 ? '#4ade80' : matchScore >= 30 ? '#fbbf24' : '#a3a3a3', border: '1px solid', borderColor: matchScore >= 50 ? 'rgba(34, 197, 94, 0.2)' : matchScore >= 30 ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}>
                    {matchScore}% match
                </div>
            )}
            {/* Header */}
            <div className="flex items-start gap-4 mb-4" style={{ paddingRight: matchScore > 0 ? '70px' : '0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #222 0%, #111 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.125rem', flexShrink: 0, border: '1px solid #333' }}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 style={{ fontWeight: 600, color: '#f5f5f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lawyer.full_name}
                        </h3>
                        {isVerified && (
                            <span title="Cédula verificada"><BadgeCheck className="w-5 h-5 text-accent-gold flex-shrink-0" /></span>
                        )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#a3a3a3', marginTop: '2px' }}>
                        Cédula: {lawyer.cedula_number}
                    </p>
                    {location && (
                        <div className="flex items-center gap-1 mt-1" style={{ fontSize: '0.75rem', color: '#666' }}>
                            <MapPin className="w-3 h-3" />
                            <span>{location}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Specialties */}
            {lawyer.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {lawyer.specialties.slice(0, 4).map((spec, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', fontWeight: 500, padding: '4px 10px', borderRadius: '8px', background: '#1A1A1A', color: '#ccc', border: '1px solid #333' }}>
                            {spec}
                        </span>
                    ))}
                    {lawyer.specialties.length > 4 && (
                        <span style={{ fontSize: '0.75rem', color: '#888', padding: '4px 8px' }}>
                            +{lawyer.specialties.length - 4} más
                        </span>
                    )}
                </div>
            )}

            {/* Phone */}
            {lawyer.phone_visible && lawyer.phone && (
                <div className="flex items-center gap-2 mb-3" style={{ fontSize: '0.875rem', color: '#a3a3a3' }}>
                    <Phone className="w-4 h-4 text-accent-gold" />
                    <a href={`tel:${lawyer.phone}`} style={{ textDecoration: 'none', color: '#a3a3a3' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#a3a3a3'}>
                        {lawyer.phone}
                    </a>
                </div>
            )}

            {lawyer.bio && (
                <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '16px', flexGrow: 1, paddingRight: '4px' }}>
                    <p style={{ fontSize: '0.875rem', color: '#888', lineHeight: '1.5', margin: 0 }}>
                        {lawyer.bio}
                    </p>
                </div>
            )}

            <div style={{ marginTop: 'auto' }}>
                {/* Match Score Bar */}
                {lawyer.score !== undefined && (
                    <div className="flex items-center gap-2 mb-4">
                        <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', borderRadius: '9999px', width: `${Math.round(lawyer.score * 100)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#666' }}>
                            {Math.round(lawyer.score * 100)}% match
                        </span>
                    </div>
                )}

                <button
                    onClick={onContact}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#222', color: '#fff', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #333', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = '#333'; }}
                >
                    <span>Contactar</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// Contact Request Modal
// ─────────────────────────────────────────

function ContactModal({ lawyer, searchQuery, userId, onClose }: { lawyer: LawyerProfile; searchQuery: string; userId?: string; onClose: () => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) { setError('Todos los campos son obligatorios'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido'); return; }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) { setError('Teléfono inválido (mínimo 10 dígitos)'); return; }

        setSending(true);
        try {
            await sendConnectRequest({
                lawyer_id: lawyer.id,
                client_id: userId,
                client_name: name.trim(),
                client_email: email.trim(),
                client_phone: phone.trim(),
                message: message.trim(),
                search_query: searchQuery || undefined,
            });
            setSent(true);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Error al enviar la solicitud';
            setError(errMsg);
        } finally {
            setSending(false);
        }
    };

    const initials = lawyer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div style={{ position: 'relative', background: '#0f0f0f', border: '1px solid #333', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', width: '100%', maxWidth: '512px', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px', color: '#888', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
                    <X className="w-5 h-5" />
                </button>

                {sent ? (
                    <div style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 className="w-8 h-8 text-accent-gold" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>¡Solicitud enviada!</h3>
                        <p style={{ color: '#888', marginBottom: '24px' }}>Tu solicitud fue enviada a <strong>{lawyer.full_name}</strong>. El abogado recibirá una notificación y podrá contactarte directamente.</p>
                        <button onClick={onClose} style={{ padding: '10px 24px', background: '#333', color: '#fff', borderRadius: '12px', fontWeight: 500, border: 'none', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = '#444'} onMouseOut={(e) => e.currentTarget.style.background = '#333'}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '24px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #1A1A1A 0%, #000000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>{initials}</div>
                                <div>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff' }}>Contactar a {lawyer.full_name}</h2>
                                    <p style={{ fontSize: '0.75rem', color: '#888' }}>{lawyer.specialties.slice(0, 3).join(' · ')}</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#ccc', marginBottom: '6px' }}>Nombre completo *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" style={{ width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#333'} required />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#ccc', marginBottom: '6px' }}><Mail className="w-3.5 h-3.5 inline mr-1 opacity-50" /> Email *</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={{ width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#333'} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#ccc', marginBottom: '6px' }}><Phone className="w-3.5 h-3.5 inline mr-1 opacity-50" /> Teléfono *</label>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="55 1234 5678" style={{ width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#333'} required />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#ccc', marginBottom: '6px' }}><MessageSquare className="w-3.5 h-3.5 inline mr-1 opacity-50" /> Describe tu caso *</label>
                                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe brevemente tu situación legal para que el abogado pueda evaluar tu caso..." rows={4} style={{ width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', resize: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#333'} required />
                            </div>
                            {error && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <X className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                                </div>
                            )}
                            <p style={{ fontSize: '0.75rem', color: '#666' }}>
                                Tu información será compartida únicamente con el abogado seleccionado.
                                Al enviar, aceptas nuestros <Link href="/terminos" className="underline hover:text-gray-400">Términos</Link> y <Link href="/privacidad" className="underline hover:text-gray-400">Política de Privacidad</Link>.
                            </p>
                            <button type="submit" disabled={sending} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#3b82f6', color: '#fff', borderRadius: '12px', fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, marginTop: '8px', border: 'none' }}>
                                {sending ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Enviando...</span></>) : (<><ArrowRight className="w-4 h-4" /><span>Enviar solicitud</span></>)}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
