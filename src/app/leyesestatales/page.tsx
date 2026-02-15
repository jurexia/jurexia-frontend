'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ESTADOS, REGION_COLORS, getTotalLeyes } from './estadosData';
import { Search, BookOpen, MapPin, ArrowRight, Scale } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from './adminGuard';

export default function LeyesEstatalesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAdmin(user?.email)) {
            router.push('/');
        }
    }, [loading, user, router]);

    // Show nothing while loading or redirecting
    if (loading || !isAdmin(user?.email)) {
        return (
            <main className="min-h-screen bg-cream-300">
                <Navbar />
                <div className="pt-32 flex justify-center">
                    <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        );
    }
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    const filteredEstados = useMemo(() => {
        return ESTADOS.filter(estado => {
            const matchesSearch = estado.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                estado.abreviatura.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRegion = !selectedRegion || estado.region === selectedRegion;
            return matchesSearch && matchesRegion;
        });
    }, [searchQuery, selectedRegion]);

    const regions = [
        { key: 'norte', label: 'Norte', icon: '🏜️' },
        { key: 'centro', label: 'Centro', icon: '🏔️' },
        { key: 'sur', label: 'Sur', icon: '🌴' },
        { key: 'occidente', label: 'Occidente', icon: '🌊' },
        { key: 'oriente', label: 'Oriente', icon: '🌿' },
    ];

    const totalLeyesIndexadas = ESTADOS.reduce((acc, e) => acc + getTotalLeyes(e.leyes), 0);

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-b from-cream-200 via-cream-300 to-cream-300" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-brown/5 rounded-full blur-3xl" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <AnimatedSection animation="scale-in">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-charcoal-900 text-white text-xs font-medium tracking-widest uppercase mb-6">
                            <Scale className="w-3.5 h-3.5 text-accent-gold" />
                            Repositorio Legal
                        </div>
                    </AnimatedSection>

                    <AnimatedSection animation="slide-up" delay={100}>
                        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal-900 mb-4 leading-tight">
                            Leyes <span className="text-accent-gold">Estatales</span> de México
                        </h1>
                    </AnimatedSection>

                    <AnimatedSection animation="fade-in" delay={200}>
                        <p className="text-base sm:text-lg text-charcoal-700 max-w-2xl mx-auto mb-8 leading-relaxed">
                            Accede a la legislación de los 32 estados en un solo lugar.
                            Constituciones, leyes, códigos y reglamentos organizados y en constante actualización.
                        </p>
                    </AnimatedSection>

                    {/* Stats */}
                    <AnimatedSection animation="fade-in" delay={300}>
                        <div className="flex justify-center gap-6 sm:gap-10 mb-10">
                            <div className="text-center">
                                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">32</div>
                                <div className="text-xs sm:text-sm text-charcoal-600">Estados</div>
                            </div>
                            <div className="w-px bg-cream-500" />
                            <div className="text-center">
                                <div className="font-serif text-2xl sm:text-3xl font-bold text-accent-gold">{totalLeyesIndexadas}</div>
                                <div className="text-xs sm:text-sm text-charcoal-600">Documentos Indexados</div>
                            </div>
                            <div className="w-px bg-cream-500" />
                            <div className="text-center">
                                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">5</div>
                                <div className="text-xs sm:text-sm text-charcoal-600">Categorías</div>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Search Bar */}
                    <AnimatedSection animation="slide-up" delay={400}>
                        <div className="max-w-xl mx-auto relative">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-700/50" />
                                <input
                                    type="text"
                                    placeholder="Buscar estado..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-cream-400 text-charcoal-900 placeholder-charcoal-700/40 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold/50 transition-all shadow-sm text-base"
                                />
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Region Filters */}
            <section className="px-4 sm:px-6 pb-4">
                <div className="max-w-6xl mx-auto">
                    <AnimatedSection animation="fade-in" delay={500}>
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setSelectedRegion(null)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${!selectedRegion
                                    ? 'bg-charcoal-900 text-white shadow-md'
                                    : 'bg-white text-charcoal-700 border border-cream-400 hover:border-charcoal-900/20 hover:bg-cream-200'
                                    }`}
                            >
                                🇲🇽 Todos
                            </button>
                            {regions.map((region) => (
                                <button
                                    key={region.key}
                                    onClick={() => setSelectedRegion(selectedRegion === region.key ? null : region.key)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedRegion === region.key
                                        ? 'bg-charcoal-900 text-white shadow-md'
                                        : 'bg-white text-charcoal-700 border border-cream-400 hover:border-charcoal-900/20 hover:bg-cream-200'
                                        }`}
                                >
                                    {region.icon} {region.label}
                                </button>
                            ))}
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* States Grid */}
            <section className="py-8 sm:py-12 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    {filteredEstados.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-charcoal-600 text-lg">No se encontraron estados con ese criterio.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                            {filteredEstados.map((estado, index) => {
                                const regionStyle = REGION_COLORS[estado.region];
                                const totalLeyes = getTotalLeyes(estado.leyes);
                                const hasContent = totalLeyes > 0;

                                return (
                                    <AnimatedSection key={estado.slug} animation="slide-up" delay={Math.min(index * 50, 500)}>
                                        <Link
                                            href={`/leyesestatales/${estado.slug}`}
                                            className={`group relative block rounded-2xl border transition-all duration-300 overflow-hidden ${hasContent
                                                ? 'bg-white border-cream-400 hover:border-accent-gold/40 hover:shadow-xl hover:-translate-y-1'
                                                : 'bg-cream-200/50 border-cream-400/60 hover:bg-white hover:border-cream-400 hover:shadow-md'
                                                }`}
                                        >
                                            {/* Top accent bar */}
                                            <div className={`h-1 w-full transition-all duration-300 ${hasContent
                                                ? 'bg-gradient-to-r from-accent-gold to-accent-brown'
                                                : 'bg-cream-400 group-hover:bg-gradient-to-r group-hover:from-cream-500 group-hover:to-cream-400'
                                                }`} />

                                            <div className="p-5">
                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className={`font-serif text-lg font-semibold leading-tight mb-1 transition-colors ${hasContent ? 'text-charcoal-900 group-hover:text-accent-gold' : 'text-charcoal-700'
                                                            }`}>
                                                            {estado.nombreCorto}
                                                        </h3>
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${regionStyle.bg} ${regionStyle.text} ${regionStyle.border} border`}>
                                                            {estado.region}
                                                        </span>
                                                    </div>
                                                    <span className="text-lg font-serif font-bold text-charcoal-900/20 group-hover:text-accent-gold/40 transition-colors">
                                                        {estado.abreviatura}
                                                    </span>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen className="w-4 h-4 text-charcoal-700/40" />
                                                        <span className={`text-sm ${hasContent ? 'text-charcoal-900 font-semibold' : 'text-charcoal-700/50'}`}>
                                                            {hasContent ? `${totalLeyes} documentos` : 'Próximamente'}
                                                        </span>
                                                    </div>
                                                    <ArrowRight className={`w-4 h-4 transition-all duration-300 ${hasContent
                                                        ? 'text-accent-gold group-hover:translate-x-1'
                                                        : 'text-charcoal-700/20 group-hover:text-charcoal-700/40'
                                                        }`} />
                                                </div>

                                                {/* Last updated */}
                                                {estado.ultimaActualizacion && (
                                                    <div className="mt-3 pt-3 border-t border-cream-400/60">
                                                        <span className="text-[11px] text-charcoal-700/60 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                            Actualizado {estado.ultimaActualizacion}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </AnimatedSection>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Info Banner */}
            <section className="py-10 sm:py-14 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <AnimatedSection animation="fade-in">
                        <div className="relative rounded-3xl bg-charcoal-900 text-white p-8 sm:p-10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent-gold/10 to-transparent rounded-full -translate-y-32 translate-x-32" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent-gold/5 to-transparent rounded-full translate-y-24 -translate-x-24" />

                            <div className="relative">
                                <h3 className="font-serif text-2xl sm:text-3xl font-semibold mb-4">
                                    Repositorio en constante <span className="text-accent-gold">actualización</span>
                                </h3>
                                <p className="text-gray-300 leading-relaxed max-w-2xl mb-6">
                                    Iurexia indexa las fuentes oficiales de cada estado para ofrecerte la legislación más actualizada.
                                    Cada documento es verificado manualmente y vinculado con nuestro sistema de inteligencia artificial
                                    para que puedas consultar artículos específicos directamente desde el chat.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link
                                        href="/chat"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-full hover:bg-accent-gold/90 transition-all duration-300 hover:shadow-lg hover:shadow-accent-gold/20"
                                    >
                                        Consultar con IA
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <a
                                        href="mailto:soporte@iurexia.com"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-all duration-300 border border-white/10"
                                    >
                                        Sugerir una ley
                                    </a>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-cream-300 border-t border-black/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-semibold">Iurex<span className="text-accent-gold">ia</span></span>
                        </div>
                        <div className="flex gap-8 text-sm text-charcoal-600">
                            <Link href="/privacidad" className="hover:text-charcoal-900 transition-colors">Privacidad</Link>
                            <Link href="/terminos" className="hover:text-charcoal-900 transition-colors">Términos</Link>
                            <Link href="/conocenos" className="hover:text-charcoal-900 transition-colors">Conócenos</Link>
                            <a href="mailto:soporte@iurexia.com" className="hover:text-charcoal-900 transition-colors">Contacto</a>
                        </div>
                        <p className="text-sm text-charcoal-500">
                            © 2026 Iurexia. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
