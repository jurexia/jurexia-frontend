'use client';

import { useState } from 'react';
import { Search, MapPin, Shield, Star, BadgeCheck, Users, ArrowRight, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { searchLawyers, LawyerProfile } from '@/lib/api';
import { UserAvatar } from '@/components/UserAvatar';

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
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [totalResults, setTotalResults] = useState(0);

    const handleSearch = async () => {
        if (!searchQuery.trim() || searchQuery.trim().length < 3) return;

        setIsSearching(true);
        setHasSearched(true);
        try {
            const result = await searchLawyers(searchQuery, selectedEstado || undefined, 12);
            setLawyers(result.lawyers);
            setTotalResults(result.total);
        } catch {
            console.error('Search failed');
            setLawyers([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-300">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-serif text-2xl font-semibold text-charcoal-900">
                            Iurex<span className="text-accent-gold">ia</span>
                        </span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                            Connect
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/chat" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 transition-colors">
                            Chat IA
                        </Link>
                        {user ? <UserAvatar /> : (
                            <Link href="/login" className="btn-primary text-sm py-2 px-5">
                                Iniciar Sesión
                            </Link>
                        )}
                    </div>
                </div>
            </header>

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
                                    <LawyerCard key={lawyer.id} lawyer={lawyer} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Empty state - no search yet */}
                    {!hasSearched && !isSearching && (
                        <div className="text-center py-12">
                            <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FeatureCard
                                    icon={<Search className="w-6 h-6 text-blue-600" />}
                                    title="Búsqueda Inteligente"
                                    description="Describe tu problema y la IA encuentra al especialista ideal"
                                />
                                <FeatureCard
                                    icon={<BadgeCheck className="w-6 h-6 text-green-600" />}
                                    title="Cédulas Verificadas"
                                    description="Todos los abogados pasan validación de cédula profesional SEP"
                                />
                                <FeatureCard
                                    icon={<Shield className="w-6 h-6 text-purple-600" />}
                                    title="Chat Seguro"
                                    description="Comunicación blindada con protección de datos de contacto"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

// ─────────────────────────────────────────
// Lawyer Card Component
// ─────────────────────────────────────────

function LawyerCard({ lawyer }: { lawyer: LawyerProfile }) {
    const estado = lawyer.office_address?.estado || '';
    const municipio = lawyer.office_address?.municipio || '';
    const location = [municipio, ESTADOS.find(e => e.value === estado)?.label].filter(Boolean).join(', ');
    const isVerified = lawyer.verification_status === 'verified';
    const initials = lawyer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="bg-white rounded-2xl border border-black/5 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
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
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-charcoal-900 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 transition-colors group-hover:bg-blue-600 group-hover:shadow-md">
                <span>Contactar</span>
                <ArrowRight className="w-4 h-4" />
            </button>
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
