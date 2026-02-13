'use client';

import { useState, useEffect } from 'react';
import {
    Search, MapPin, Shield, Star, BadgeCheck, Users, ArrowRight,
    ChevronDown, Check, X, Loader2, Phone, Mail, MessageSquare,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
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
        <div className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-28 pb-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
                        <Users className="w-4 h-4" />
                        <span>Marketplace Legal Inteligente</span>
                    </div>

                    <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal-900 mb-4 leading-tight">
                        Encuentra al abogado ideal
                        <br />
                        <span className="text-accent-gold">con IA de precisión</span>
                    </h1>

                    <p className="text-lg text-charcoal-600 max-w-2xl mx-auto mb-10">
                        Describe tu problema legal y nuestra IA conectará con abogados verificados
                        especializados en tu caso y zona geográfica.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-3">
                            <div className="flex flex-col md:flex-row gap-3">
                                {/* Problem Input */}
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Ej: Me despidieron injustificadamente..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl text-charcoal-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                    />
                                </div>

                                {/* Estado Filter */}
                                <div className="relative md:w-56">
                                    <button
                                        onClick={() => setShowEstadoDropdown(!showEstadoDropdown)}
                                        className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 rounded-xl text-sm text-charcoal-700 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>{ESTADOS.find(e => e.value === selectedEstado)?.label || 'Todos los estados'}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>

                                    {showEstadoDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/5 max-h-64 overflow-y-auto z-50">
                                            {ESTADOS.map(estado => (
                                                <button
                                                    key={estado.value}
                                                    onClick={() => {
                                                        setSelectedEstado(estado.value);
                                                        setShowEstadoDropdown(false);
                                                    }}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-charcoal-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <span>{estado.label}</span>
                                                    {selectedEstado === estado.value && <Check className="w-4 h-4 text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Search Button */}
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching || searchQuery.trim().length < 3}
                                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-charcoal-900 text-white rounded-xl font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSearching ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4" />
                                            <span className="hidden md:inline">Buscar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="pb-8 px-4">
                <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-charcoal-500">
                    <div className="flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-green-600" />
                        <span>Cédulas verificadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span>Chat blindado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        <span>Matching semántico IA</span>
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
                        <div className="text-center py-20">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-amber-50 rounded-2xl flex items-center justify-center border border-blue-100">
                                <Search className="w-10 h-10 text-blue-500/70" />
                            </div>
                            <h3 className="text-xl font-semibold text-charcoal-900 mb-3">
                                Describe tu problema legal
                            </h3>
                            <p className="text-charcoal-500 max-w-lg mx-auto leading-relaxed">
                                Nuestra IA analizará tu consulta y te conectará con abogados verificados especializados en tu caso y zona geográfica.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 mt-6">
                                {['Despido injustificado', 'Divorcio', 'Defensa penal', 'Deuda fiscal'].map((example) => (
                                    <button
                                        key={example}
                                        onClick={() => { setSearchQuery(example); }}
                                        className="px-4 py-2 text-sm bg-white border border-cream-300 rounded-full text-charcoal-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sin resultados después de buscar */}
                    {!isSearching && hasSearched && lawyers.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-charcoal-900 mb-2">
                                Sin resultados
                            </h3>
                            <p className="text-charcoal-500 max-w-md mx-auto">
                                No encontramos abogados para tu búsqueda. El directorio se está construyendo — pronto habrá más profesionales.
                            </p>
                        </div>
                    )}

                    {!isSearching && lawyers.length > 0 && (
                        <>
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm text-charcoal-500">
                                    {totalResults} abogado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
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
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-3 border-charcoal-200 border-t-charcoal-900 rounded-full animate-spin mb-4" />
                            <p className="text-charcoal-500">Preparando buscador...</p>
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
        <div className="bg-white rounded-2xl border border-black/5 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group relative">
            {/* Match Score Badge */}
            {matchScore > 0 && (
                <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold ${matchScore >= 50 ? 'bg-green-100 text-green-700' :
                    matchScore >= 30 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {matchScore}% match
                </div>
            )}
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-charcoal-700 to-charcoal-900 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-charcoal-900 truncate">
                            {lawyer.full_name}
                        </h3>
                        {isVerified && (
                            <span title="Cédula verificada"><BadgeCheck className="w-5 h-5 text-green-600 flex-shrink-0" /></span>
                        )}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                        Cédula: {lawyer.cedula_number}
                    </p>
                    {location && (
                        <div className="flex items-center gap-1 text-xs text-charcoal-400 mt-1">
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
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${getSpecialtyColor(spec)}`}
                        >
                            {spec}
                        </span>
                    ))}
                    {lawyer.specialties.length > 4 && (
                        <span className="text-xs text-charcoal-400 px-2 py-1">
                            +{lawyer.specialties.length - 4} más
                        </span>
                    )}
                </div>
            )}

            {/* Bio */}
            {/* Phone (if visible) */}
            {lawyer.phone_visible && lawyer.phone && (
                <div className="flex items-center gap-2 mb-3 text-sm text-charcoal-600">
                    <Phone className="w-4 h-4 text-green-600" />
                    <a href={`tel:${lawyer.phone}`} className="hover:text-green-700 transition-colors">
                        {lawyer.phone}
                    </a>
                </div>
            )}

            {lawyer.bio && (
                <p className="text-sm text-charcoal-600 line-clamp-3 mb-4">
                    {lawyer.bio}
                </p>
            )}

            {/* Match Score */}
            {lawyer.score !== undefined && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                            style={{ width: `${Math.round(lawyer.score * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-charcoal-500">
                        {Math.round(lawyer.score * 100)}% match
                    </span>
                </div>
            )}

            {/* CTA */}
            <button
                onClick={onContact}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-charcoal-900 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 transition-colors group-hover:bg-blue-600 group-hover:shadow-md"
            >
                <span>Contactar</span>
                <ArrowRight className="w-4 h-4" />
            </button>
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-charcoal-400 hover:text-charcoal-700 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Success State */}
                {sent ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                            ¡Solicitud enviada!
                        </h3>
                        <p className="text-charcoal-500 mb-6">
                            Tu solicitud fue enviada a <strong>{lawyer.full_name}</strong>.
                            El abogado recibirá una notificación y podrá contactarte directamente.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-charcoal-900 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-charcoal-700 to-charcoal-900 flex items-center justify-center text-white font-bold">
                                    {initials}
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-charcoal-900">
                                        Contactar a {lawyer.full_name}
                                    </h2>
                                    <p className="text-xs text-charcoal-500">
                                        {lawyer.specialties.slice(0, 3).join(' · ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                    Nombre completo *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Tu nombre completo"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                    required
                                />
                            </div>

                            {/* Email + Phone row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                        <Mail className="w-3.5 h-3.5 inline mr-1 opacity-50" />
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                        <Phone className="w-3.5 h-3.5 inline mr-1 opacity-50" />
                                        Teléfono *
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="55 1234 5678"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1 opacity-50" />
                                    Describe tu caso *
                                </label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Describe brevemente tu situación legal para que el abogado pueda evaluar tu caso..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all resize-none"
                                    required
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                                    <X className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Privacy note */}
                            <p className="text-xs text-charcoal-400">
                                Tu información será compartida únicamente con el abogado seleccionado.
                                Al enviar, aceptas nuestros <Link href="/terminos" className="underline hover:text-charcoal-600">Términos</Link> y <Link href="/privacidad" className="underline hover:text-charcoal-600">Política de Privacidad</Link>.
                            </p>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
