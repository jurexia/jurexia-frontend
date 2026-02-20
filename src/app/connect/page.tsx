'use client';

import { useState, useEffect } from 'react';
import {
    Search, MapPin, Shield, Star, BadgeCheck, Users, ArrowRight,
    ChevronDown, Check, X, Loader2, Phone, Mail, MessageSquare,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
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

// Specialties for visual badges
const SPECIALTY_COLORS: Record<string, string> = {
    'penal': 'bg-red-50 text-red-700 border-red-200',
    'civil': 'bg-blue-50 text-blue-700 border-blue-200',
    'laboral': 'bg-amber-50 text-amber-700 border-amber-200',
    'familiar': 'bg-pink-50 text-pink-700 border-pink-200',
    'mercantil': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'amparo': 'bg-purple-50 text-purple-700 border-purple-200',
    'fiscal': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'administrativo': 'bg-orange-50 text-orange-700 border-orange-200',
    'constitucional': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function getSpecialtyColor(specialty: string): string {
    const key = specialty.toLowerCase();
    for (const [k, v] of Object.entries(SPECIALTY_COLORS)) {
        if (key.includes(k)) return v;
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function ConnectPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');
    const [showEstadoDropdown, setShowEstadoDropdown] = useState(false);
    const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
    const [allLawyers, setAllLawyers] = useState<LawyerProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    // Contact modal state
    const [contactLawyer, setContactLawyer] = useState<LawyerProfile | null>(null);

    // Load all verified lawyers from Supabase on mount
    useEffect(() => {
        async function loadLawyers() {
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
                    // Map Supabase data to LawyerProfile format
                    const mapped: LawyerProfile[] = data.map((row: Record<string, unknown>) => ({
                        id: row.id as string,
                        full_name: row.full_name as string,
                        cedula_number: (row.cedula_number || '') as string,
                        specialties: (row.specialties || []) as string[],
                        bio: (row.bio || '') as string,
                        office_address: (row.office_address || {}) as { estado?: string; municipio?: string; cp?: string },
                        verification_status: (row.verification_status || '') as string,
                        is_pro_active: row.is_pro_active as boolean,
                        avatar_url: (row.avatar_url || undefined) as string | undefined,
                        phone: (row.phone || undefined) as string | undefined,
                        phone_visible: (row.phone_visible || false) as boolean,
                    }));
                    setAllLawyers(mapped);
                    // NO mostrar abogados al cargar — solo al buscar
                    // setLawyers(mapped);
                    // setTotalResults(mapped.length);
                }
            } catch (err) {
                console.error('Error loading lawyers:', err);
            } finally {
                setIsLoading(false);
            }
        }

        loadLawyers();
    }, []);

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

    // Score a lawyer against a search query (0 to 100)
    const scoreLawyer = (lawyer: LawyerProfile, queryText: string, estado: string): number => {
        const queryLower = queryText.toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
        if (words.length === 0 && !estado) return 0;

        let score = 0;
        const maxScore = 100;

        // Null-safe field access
        const lawyerSpecs = (lawyer.specialties || []).map(s => s.toLowerCase());
        const bioLower = (lawyer.bio || '').toLowerCase();
        const nameLower = (lawyer.full_name || '').toLowerCase();

        // 1. Specialty matching via synonym map (up to 50 points)
        let specScore = 0;

        for (const [area, keywords] of Object.entries(LEGAL_KEYWORDS)) {
            // Check if any query word matches ANY keyword in this legal area
            const queryMatchesArea = words.some(w =>
                keywords.some(kw => kw.includes(w) || w.includes(kw))
            );
            // Check if this lawyer has this legal area as a specialty
            const lawyerHasArea = lawyerSpecs.some(s => s.includes(area));

            if (queryMatchesArea && lawyerHasArea) {
                specScore = Math.max(specScore, 50);
            }
        }

        // Direct word match against specialty text
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
        if (estado) {
            const lawyerEstado = (lawyer.office_address?.estado || '').toUpperCase().replace(/\s+/g, '_');
            const normalizedEstado = estado.replace(/_/g, '');
            if (lawyerEstado === estado || lawyerEstado.replace(/_/g, '') === normalizedEstado) {
                score += 10;
            }
        }

        // 5. Generic terms — everyone is a lawyer, give base score
        const genericTerms = ['abogado', 'abogada', 'licenciado', 'licenciada', 'asesoría', 'asesoria', 'legal', 'jurídico', 'juridico', 'consulta', 'asesor', 'defensa', 'demanda', 'juicio', 'proceso'];
        if (words.some(w => genericTerms.includes(w))) {
            score = Math.max(score, 20);
        }

        return Math.min(maxScore, score);
    };

    // Filter lawyers locally with scoring
    const handleSearch = async () => {
        // Validación de autenticación antes de buscar
        if (!user) {
            router.push('/login?redirect=/connect');
            return;
        }

        const query = searchQuery.trim();
        const estado = selectedEstado;
        setHasSearched(true);
        setIsSearching(true);

        // Score all lawyers
        const scored = allLawyers.map(lawyer => ({
            lawyer,
            score: scoreLawyer(lawyer, query, estado),
        }));

        // Filter by estado if selected (mandatory filter, not just a bonus)
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

        // If only estado selected (no text), show all from that estado
        const finalLawyers = results.map(s => ({
            ...s.lawyer,
            score: s.score,
        }));

        setLawyers(finalLawyers);
        setTotalResults(finalLawyers.length);
        setIsSearching(false);
    };

    return (
        <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', color: '#f5f5f5', paddingBottom: '80px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <Navbar />

            {/* Hero Section Majestic */}
            <section style={{ paddingTop: '160px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px', position: 'relative', overflow: 'hidden' }}>
                {/* Background glow effects */}
                <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(15, 15, 15, 0) 70%)', zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(15, 15, 15, 0) 70%)', zIndex: 0, pointerEvents: 'none' }} />

                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9999px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '32px' }}>
                        <Shield className="w-4 h-4" />
                        <span>Directorio Legítimo y Protegido</span>
                    </div>

                    <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '3.5rem', fontWeight: 300, color: '#FFFFFF', marginBottom: '24px', lineHeight: 1.1 }}>
                        La justicia exige seriedad.<br />
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>Encuentra representación real.</span>
                    </h1>

                    <p style={{ fontSize: '1.25rem', color: '#A3A3A3', maxWidth: '700px', margin: '0 auto 48px', lineHeight: 1.6 }}>
                        La libertad, la salud y el patrimonio no son un juego. Nuestra IA te conecta <strong>gratuitamente</strong> con abogados cuyas cédulas han sido rigurosamente verificadas.
                    </p>

                    {/* Search Bar Box */}
                    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Problem Input */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Ej: Necesito revisar un contrato de renta..."
                                    style={{ width: '100%', paddingLeft: '48px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', background: '#0F0F0F', border: '1px solid #333', borderRadius: '16px', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#333'}
                                />
                            </div>

                            {/* Estado Filter */}
                            <div className="relative md:w-64">
                                <button
                                    onClick={() => setShowEstadoDropdown(!showEstadoDropdown)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#0F0F0F', border: '1px solid #333', borderRadius: '16px', color: '#E5E5E5', cursor: 'pointer' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span>{ESTADOS.find(e => e.value === selectedEstado)?.label || 'México'}</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>

                                {showEstadoDropdown && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#1A1A1A', border: '1px solid #333', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '250px', overflowY: 'auto', zIndex: 50 }}>
                                        {ESTADOS.map(estado => (
                                            <button
                                                key={estado.value}
                                                onClick={() => {
                                                    setSelectedEstado(estado.value);
                                                    setShowEstadoDropdown(false);
                                                }}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', color: '#ccc', borderBottom: '1px solid #222', cursor: 'pointer', textAlign: 'left' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#2A2A2A'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span>{estado.label}</span>
                                                {selectedEstado === estado.value && <Check className="w-4 h-4 text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || (!user && searchQuery.trim().length === 0)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 32px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', borderRadius: '16px', fontWeight: 600, cursor: (isSearching || (!user && searchQuery.trim().length === 0)) ? 'not-allowed' : 'pointer', opacity: (isSearching || (!user && searchQuery.trim().length === 0)) ? 0.6 : 1, transition: 'transform 0.2s', minHeight: '56px' }}
                                onMouseOver={(e) => !isSearching && (e.currentTarget.style.transform = 'scale(1.02)')}
                                onMouseOut={(e) => !isSearching && (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                {isSearching ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        <span>Buscar Abogado</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition Section */}
            <section style={{ padding: '40px 24px', background: '#111111', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '12px', borderRadius: '12px', color: '#EF4444' }}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFF', marginBottom: '8px' }}>Cero Engaños</h3>
                            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>La representación legal no se simula. Protegemos a los usuarios listando únicamente abogados que han demostrado documentalmente su cédula y trayectoria.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px', color: '#3B82F6' }}>
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFF', marginBottom: '8px' }}>Matching de Especialidad</h3>
                            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>Nuestra IA lee tu caso y no busca palabras clave al azar. Encuentra al abogado que por su bio y perfil estadístico tiene la experiencia que requieres.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '12px', borderRadius: '12px', color: '#D4AF37' }}>
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFF', marginBottom: '8px' }}>Calificación Directa</h3>
                            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>El sistema se alimenta de reseñas reales. Podrás calificar la honestidad, primer acercamiento y el costo ofrecido por el abogado.</p>
                        </div>
                    </div>

                </div>
            </section>

            {/* Results */}
            <section className="pb-20 px-4">
                <div className="max-w-6xl mx-auto">
                    {isSearching && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-3 border-charcoal-200 border-t-charcoal-900 rounded-full animate-spin mb-4" />
                            <p className="text-charcoal-500">Buscando abogados afines a tu caso...</p>
                        </div>
                    )}

                    {/* Estado inicial: invitación a buscar */}
                    {!isSearching && !hasSearched && (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                            <div style={{ width: '80px', height: '80px', margin: '0 auto 24px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(15, 15, 15, 0) 100%)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                <Search className="w-10 h-10 text-blue-500" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>
                                Explícanos tu situación
                            </h3>
                            <p style={{ color: '#888', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
                                No uses palabras legales complejas si no las conoces. Escribe como si le platicaras a un amigo y nosotros encontraremos la especialidad correcta.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                                {['Despido sin finiquito', 'Convenio de divorcio', 'Robaron mi negocio', 'Problemas con el SAT'].map((example) => (
                                    <button
                                        key={example}
                                        onClick={() => { setSearchQuery(example); }}
                                        style={{ padding: '8px 16px', fontSize: '0.875rem', background: '#111', border: '1px solid #333', borderRadius: '9999px', color: '#ccc', transition: 'all 0.2s', cursor: 'pointer' }}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#ccc'; }}
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sin resultados después de buscar */}
                    {!isSearching && hasSearched && lawyers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '64px 0', background: '#111', borderRadius: '24px', border: '1px solid #222' }}>
                            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: '#222', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users className="w-8 h-8 text-gray-500" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f5f5f5', marginBottom: '8px' }}>
                                Sin resultados
                            </h3>
                            <p style={{ color: '#888', maxWidth: '400px', margin: '0 auto' }}>
                                No encontramos abogados exactos para tu búsqueda. El directorio Premium se está construyendo — pronto habrá más profesionales en esta región.
                            </p>
                        </div>
                    )}

                    {!isSearching && lawyers.length > 0 && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <p style={{ fontSize: '0.875rem', color: '#888' }}>
                                    {totalResults} abogado{totalResults !== 1 ? 's' : ''} verificado{totalResults !== 1 ? 's' : ''} recomendado{totalResults !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {lawyers.map((lawyer) => (
                                    <LawyerCard
                                        key={lawyer.id}
                                        lawyer={lawyer}
                                        onContact={() => setContactLawyer(lawyer)}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Loading state */}
                    {isLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', marginBottom: '16px' }} className="animate-spin" />
                            <p style={{ color: '#888' }}>Conectando con la base de datos de profesionales...</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Contact Request Modal */}
            {contactLawyer && (
                <ContactModal
                    lawyer={contactLawyer}
                    searchQuery={searchQuery}
                    userId={user?.id}
                    onClose={() => setContactLawyer(null)}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────
// Lawyer Card Component
// ─────────────────────────────────────────

function LawyerCard({ lawyer, onContact }: { lawyer: LawyerProfile; onContact: () => void }) {
    const estado = lawyer.office_address?.estado || '';
    const municipio = lawyer.office_address?.municipio || '';
    const estadoNormalized = estado.toUpperCase().replace(/\s+/g, '_');
    const estadoLabel = ESTADOS.find(e => e.value === estadoNormalized || e.value === estado)?.label || estado;
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
                {/* Avatar */}
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #222 0%, #111 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.125rem', flexShrink: 0, border: '1px solid #333' }}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 style={{ fontWeight: 600, color: '#f5f5f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lawyer.full_name}
                        </h3>
                        {isVerified && (
                            <span title="Cédula verificada"><BadgeCheck className="w-5 h-5 text-green-500 flex-shrink-0" /></span>
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
                        <span
                            key={i}
                            style={{ fontSize: '0.75rem', fontWeight: 500, padding: '4px 10px', borderRadius: '8px', background: '#1A1A1A', color: '#ccc', border: '1px solid #333' }}
                        >
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

            {/* Bio */}
            {/* Phone (if visible) */}
            {lawyer.phone_visible && lawyer.phone && (
                <div className="flex items-center gap-2 mb-3" style={{ fontSize: '0.875rem', color: '#a3a3a3' }}>
                    <Phone className="w-4 h-4 text-green-500" />
                    <a href={`tel:${lawyer.phone}`} style={{ textDecoration: 'none', color: '#a3a3a3' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#a3a3a3'}>
                        {lawyer.phone}
                    </a>
                </div>
            )}

            {lawyer.bio && (
                <p style={{ fontSize: '0.875rem', color: '#888', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '16px', flexGrow: 1 }}>
                    {lawyer.bio}
                </p>
            )}

            <div style={{ marginTop: 'auto' }}>
                {/* Match Score Bar */}
                {lawyer.score !== undefined && (
                    <div className="flex items-center gap-2 mb-4">
                        <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div
                                style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', borderRadius: '9999px', width: `${Math.round(lawyer.score * 100)}%` }}
                            />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#666' }}>
                            {Math.round(lawyer.score * 100)}% match
                        </span>
                    </div>
                )}

                {/* CTA */}
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

function ContactModal({
    lawyer,
    searchQuery,
    userId,
    onClose,
}: {
    lawyer: LawyerProfile;
    searchQuery: string;
    userId?: string;
    onClose: () => void;
}) {
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

        if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
            setError('Todos los campos son obligatorios');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Email inválido');
            return;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            setError('Teléfono inválido (mínimo 10 dígitos)');
            return;
        }

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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div style={{ position: 'relative', background: '#0f0f0f', border: '1px solid #333', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', width: '100%', maxWidth: '512px', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px', color: '#888', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 10 }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#888'}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Success State */}
                {sent ? (
                    <div style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                            ¡Solicitud enviada!
                        </h3>
                        <p style={{ color: '#888', marginBottom: '24px' }}>
                            Tu solicitud fue enviada a <strong>{lawyer.full_name}</strong>.
                            El abogado recibirá una notificación y podrá contactarte directamente.
                        </p>
                        <button
                            onClick={onClose}
                            style={{ padding: '10px 24px', background: '#333', color: '#fff', borderRadius: '12px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#444'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#333'}
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ padding: '24px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #1A1A1A 0%, #000000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                                    {initials}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff' }}>
                                        Contactar a {lawyer.full_name}
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: '#888' }}>
                                        {lawyer.specialties.slice(0, 3).join(' · ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#ccc', marginBottom: '6px' }}>Nombre completo *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" style={{ width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#333'} required />
                            </div>

                            {/* Email + Phone row */}
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

                            {/* Message */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#ccc', marginBottom: '6px' }}><MessageSquare className="w-3.5 h-3.5 inline mr-1 opacity-50" /> Describe tu caso *</label>
                                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe brevemente tu situación legal para que el abogado pueda evaluar tu caso..." rows={4} style={{ width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', resize: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#333'} required />
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <X className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Privacy note */}
                            <p style={{ fontSize: '0.75rem', color: '#666' }}>
                                Tu información será compartida únicamente con el abogado seleccionado.
                                Al enviar, aceptas nuestros <Link href="/terminos" className="underline hover:text-gray-400">Términos</Link> y <Link href="/privacidad" className="underline hover:text-gray-400">Política de Privacidad</Link>.
                            </p>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={sending}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#3b82f6', color: '#fff', borderRadius: '12px', fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, marginTop: '8px' }}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Enviando...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="w-4 h-4" />
                                        <span>Enviar solicitud</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// Feature Card Component
// ─────────────────────────────────────────

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-black/5 p-6 text-center hover:shadow-md transition-all">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-xl flex items-center justify-center">
                {icon}
            </div>
            <h3 className="font-semibold text-charcoal-900 mb-2">{title}</h3>
            <p className="text-sm text-charcoal-500">{description}</p>
        </div>
    );
}
