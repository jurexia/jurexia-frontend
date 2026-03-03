'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ESTADOS, getTotalLeyes, FEDERAL_LEYES } from '../leyesestatales/estadosData';
import {
    BookOpen, ArrowRight, Scale, FileText, ExternalLink, Globe2,
    Landmark, Search, MapPin, Shield, Users, Gavel, ChevronRight,
    Stethoscope, Activity, HeartHandshake, Baby, Lock
} from 'lucide-react';

// ─── Data Sections ───
const CONSTITUCION_NACIONAL = [
    {
        id: 'cpeum',
        nombre: 'Constitución Política de los Estados Unidos Mexicanos',
        abreviatura: 'CPEUM',
        descripcion: '136 artículos — Norma suprema del ordenamiento jurídico mexicano',
        pdf_url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/constitucion/CPEUM-2024.pdf',
        pdf_fallback: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CPEUM.pdf',
        chunks: '~1,200 fragmentos indexados',
        fuente: 'Cámara de Diputados — DOF',
        icono: Landmark,
        disponible: true,
    },
];

const SUPABASE_TRATADOS = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Tratados';

const TRATADOS_INTERNACIONALES = [
    {
        id: 'cadh',
        nombre: 'Convención Americana sobre Derechos Humanos (Pacto de San José)',
        abreviatura: 'CADH',
        descripcion: 'Tratado interamericano de derechos humanos — OEA',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Americana%20sobre%20Derechos%20Humanos%20(CADH).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'OEA',
        icono: Globe2,
        disponible: true,
    },
    {
        id: 'cbdp',
        nombre: 'Convención Interamericana Belém do Pará',
        abreviatura: 'CBdP',
        descripcion: 'Prevención, sanción y erradicación de la violencia contra la mujer',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Interamericana%20Belem%20do%20Para%20(CBdP).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'OEA',
        icono: Users,
        disponible: true,
    },
    {
        id: 'conv-intolerancia',
        nombre: 'Convención Interamericana contra el Racismo e Intolerancia',
        abreviatura: 'CIRDI',
        descripcion: 'Discriminación racial y formas conexas de intolerancia',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Interamericana%20contra%20Racismo%20e%20Intolerancia%20(CIRDI).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'OEA',
        icono: HeartHandshake,
        disponible: true,
    },
    {
        id: 'conv-ddmm',
        nombre: 'Convención Interamericana sobre Derechos de Personas Mayores',
        abreviatura: 'CIPM',
        descripcion: 'Derechos humanos de las personas mayores',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Interamericana%20Derechos%20Personas%20Mayores%20(CIPM).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'OEA',
        icono: Activity,
        disponible: true,
    },
    {
        id: 'protocolo-san-salvador',
        nombre: 'Protocolo de San Salvador',
        abreviatura: 'PSS',
        descripcion: 'Derechos económicos, sociales y culturales — OEA',
        pdf_url: `${SUPABASE_TRATADOS}/Protocolo%20de%20San%20Salvador%20-%20Derechos%20Economicos%20Sociales%20(PSS).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'OEA',
        icono: Shield,
        disponible: true,
    },
    {
        id: 'dudh',
        nombre: 'Declaración Universal de Derechos Humanos',
        abreviatura: 'DUDH',
        descripcion: 'Fundamento del derecho internacional de los derechos humanos',
        pdf_url: `${SUPABASE_TRATADOS}/Declaracion%20Universal%20de%20Derechos%20Humanos%20(DUDH).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Globe2,
        disponible: true,
    },
    {
        id: 'pidcp',
        nombre: 'Pacto Internacional de Derechos Civiles y Políticos',
        abreviatura: 'PIDCP',
        descripcion: 'Libertades fundamentales — Naciones Unidas',
        pdf_url: `${SUPABASE_TRATADOS}/Pacto%20Internacional%20Derechos%20Civiles%20y%20Politicos%20(PIDCP).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Scale,
        disponible: true,
    },
    {
        id: 'pidesc',
        nombre: 'Pacto Internacional de Derechos Económicos, Sociales y Culturales',
        abreviatura: 'PIDESC',
        descripcion: 'Derechos económicos, sociales y culturales — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Pacto%20Internacional%20Derechos%20Economicos%20Sociales%20y%20Culturales%20(PIDESC).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: FileText,
        disponible: true,
    },
    {
        id: 'cdn',
        nombre: 'Convención sobre los Derechos del Niño',
        abreviatura: 'CDN',
        descripcion: 'Protección integral de la niñez — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20sobre%20los%20Derechos%20del%20Nino%20(CDN).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Baby,
        disponible: true,
    },
    {
        id: 'conv-tortura',
        nombre: 'Convención contra la Tortura (CAT)',
        abreviatura: 'CAT',
        descripcion: 'Tortura y tratos crueles, inhumanos o degradantes — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20contra%20la%20Tortura%20ONU%20(CAT).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Shield,
        disponible: true,
    },
    {
        id: 'cedaw',
        nombre: 'CEDAW — Eliminación de Discriminación contra la Mujer',
        abreviatura: 'CEDAW',
        descripcion: 'Igualdad de derechos para las mujeres — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Eliminacion%20Discriminacion%20contra%20la%20Mujer%20(CEDAW).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Users,
        disponible: true,
    },
    {
        id: 'crpd',
        nombre: 'Convención sobre Derechos de Personas con Discapacidad',
        abreviatura: 'CRPD',
        descripcion: 'Inclusión y derechos de personas con discapacidad — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Derechos%20Personas%20con%20Discapacidad%20(CRPD).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Users,
        disponible: true,
    },
    {
        id: 'conv-discriminacion-racial',
        nombre: 'Convención contra la Discriminación Racial (ICERD)',
        abreviatura: 'ICERD',
        descripcion: 'Eliminación de todas las formas de discriminación racial — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Eliminacion%20Discriminacion%20Racial%20(ICERD).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Scale,
        disponible: true,
    },
    {
        id: 'conv-derechos-migrantes',
        nombre: 'Convención sobre Derechos de Trabajadores Migratorios',
        abreviatura: 'CMW',
        descripcion: 'Protección de trabajadores migratorios y sus familias — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Convencion%20Derechos%20Trabajadores%20Migratorios%20(CMW).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: Globe2,
        disponible: true,
    },
    {
        id: 'reglas-mandela',
        nombre: 'Reglas Nelson Mandela — Tratamiento de Reclusos',
        abreviatura: 'Reglas Mandela',
        descripcion: 'Reglas mínimas para el tratamiento de reclusos — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Reglas%20Nelson%20Mandela%20-%20Tratamiento%20Reclusos%20(ONU).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU / UNODC',
        icono: Lock,
        disponible: true,
    },
    {
        id: 'reglas-bangkok',
        nombre: 'Reglas de Bangkok — Tratamiento de Reclusas',
        abreviatura: 'Reglas Bangkok',
        descripcion: 'Tratamiento de reclusas y medidas no privativas — ONU',
        pdf_url: `${SUPABASE_TRATADOS}/Reglas%20de%20Bangkok%20-%20Tratamiento%20Reclusas%20(ONU).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU / UNODC',
        icono: Lock,
        disponible: true,
    },
    {
        id: 'protocolo-estambul',
        nombre: 'Protocolo de Estambul',
        abreviatura: 'Protocolo Estambul',
        descripcion: 'Investigación y documentación de la tortura — OHCHR',
        pdf_url: `${SUPABASE_TRATADOS}/Protocolo%20de%20Estambul%20-%20Investigacion%20Tortura%20(OHCHR).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU / OHCHR',
        icono: Stethoscope,
        disponible: true,
    },
    {
        id: 'principios-yogyakarta',
        nombre: 'Principios de Yogyakarta',
        abreviatura: 'Yogyakarta',
        descripcion: 'Orientación sexual e identidad de género — Soft law',
        pdf_url: `${SUPABASE_TRATADOS}/Principios%20de%20Yogyakarta%20-%20Orientacion%20Sexual%20e%20Identidad%20de%20Genero.pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'Panel de Expertos DDHH',
        icono: Globe2,
        disponible: true,
    },
];

// FEDERAL_LEYES is imported from estadosData — 72 laws with Supabase URLs

type TabType = 'constitucion' | 'tratados' | 'federales' | 'estatales';

export default function NormativaNacionalPage() {
    const [activeTab, setActiveTab] = useState<TabType>('constitucion');
    const [searchQuery, setSearchQuery] = useState('');

    const totalDocs = ESTADOS.reduce((acc, e) => acc + getTotalLeyes(e.leyes), 0);

    const filteredEstados = useMemo(() => {
        if (!searchQuery) return ESTADOS;
        return ESTADOS.filter(e =>
            e.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const filteredTratados = useMemo(() => {
        if (!searchQuery) return TRATADOS_INTERNACIONALES;
        return TRATADOS_INTERNACIONALES.filter(t =>
            t.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    // Flatten all federal laws (constitucion + leyes + codigos + reglamentos + otros) into a single list
    const ALL_FEDERAL_LEYES = useMemo(() => {
        const cats = ['constitucion', 'leyes', 'codigos', 'reglamentos', 'otros'] as const;
        return cats.flatMap(cat =>
            FEDERAL_LEYES[cat].map(ley => ({
                nombre: ley.nombre,
                url: ley.url,
                categoria: cat,
            }))
        );
    }, []);

    const filteredFederales = useMemo(() => {
        if (!searchQuery) return ALL_FEDERAL_LEYES;
        const q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return ALL_FEDERAL_LEYES.filter(ley =>
            ley.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        );
    }, [searchQuery, ALL_FEDERAL_LEYES]);

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* ─── Hero Section ─── */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-brown/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <AnimatedSection animation="scale-in">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-cream-500 text-accent-gold text-xs font-semibold tracking-widest uppercase mb-8">
                            <Scale className="w-4 h-4" />
                            Repositorio Jurídico Nacional
                        </div>
                    </AnimatedSection>

                    <AnimatedSection animation="slide-up" delay={100}>
                        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight text-charcoal-900">
                            Normativa <span className="text-accent-gold">Nacional</span>
                        </h1>
                    </AnimatedSection>

                    <AnimatedSection animation="fade-in" delay={200}>
                        <p className="text-base sm:text-lg text-charcoal-700 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Explora el ordenamiento jurídico mexicano más actualizado.
                            Constitución, tratados, leyes federales y legislación estatal en un solo lugar.
                        </p>
                    </AnimatedSection>

                    {/* Stats */}
                    <AnimatedSection animation="fade-in" delay={300}>
                        <div className="flex justify-center gap-8 sm:gap-12 mb-12">
                            <div className="text-center">
                                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">4</div>
                                <div className="text-xs sm:text-sm text-charcoal-600">Fuentes</div>
                            </div>
                            <div className="w-px bg-cream-500" />
                            <div className="text-center">
                                <div className="font-serif text-2xl sm:text-3xl font-bold text-accent-gold">{totalDocs.toLocaleString()}+</div>
                                <div className="text-xs sm:text-sm text-charcoal-600">Documentos Indexados</div>
                            </div>
                            <div className="w-px bg-cream-500" />
                            <div className="text-center">
                                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">32</div>
                                <div className="text-xs sm:text-sm text-charcoal-600">Estados</div>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Search Bar — shown on Estatales, Tratados, and Federales tabs */}
                    {(activeTab === 'estatales' || activeTab === 'tratados' || activeTab === 'federales') && (
                        <AnimatedSection animation="slide-up" delay={400}>
                            <div className="max-w-xl mx-auto relative">
                                <div className="flex items-center bg-white border border-cream-400 rounded-2xl overflow-hidden focus-within:border-accent-gold/50 focus-within:shadow-lg transition-all duration-300 shadow-md">
                                    <Search className="w-5 h-5 text-charcoal-500 ml-5" />
                                    <input
                                        type="text"
                                        placeholder={
                                            activeTab === 'estatales' ? 'Buscar estado (ej. Nuevo León)...' :
                                                activeTab === 'federales' ? 'Buscar ley federal (ej. Amparo, Trabajo, Civil...)' :
                                                    'Buscar tratado...'
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent border-none text-charcoal-900 px-4 py-4 focus:ring-0 placeholder-charcoal-400 outline-none text-sm md:text-base"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="mr-4 text-charcoal-400 hover:text-charcoal-700 text-sm font-medium"
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </AnimatedSection>
                    )}
                </div>
            </section>

            {/* ─── Main Content with Tabs ─── */}
            <section className="pb-24 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">

                    {/* Tab Navigation */}
                    <AnimatedSection animation="fade-in" delay={100}>
                        <div className="flex flex-wrap justify-center gap-2 bg-white/60 backdrop-blur-sm p-1.5 rounded-2xl border border-cream-400 mb-12 sm:mb-16 shadow-lg max-w-fit mx-auto">
                            {[
                                { id: 'constitucion', label: 'Constitución', icon: BookOpen },
                                { id: 'tratados', label: 'Tratados Internacionales', icon: Globe2 },
                                { id: 'federales', label: 'Leyes Federales', icon: Landmark },
                                { id: 'estatales', label: 'Normativa Estatal', icon: MapPin },
                            ].map(tab => {
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id as TabType); setSearchQuery(''); }}
                                        className={`
                                            flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap
                                            ${active
                                                ? 'bg-charcoal-900 text-white shadow-lg'
                                                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-400/50'
                                            }
                                        `}
                                    >
                                        <tab.icon className={`w-4 h-4 ${active ? 'text-accent-gold' : 'text-charcoal-500'}`} strokeWidth={active ? 2 : 1.5} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </AnimatedSection>

                    {/* Tab Content */}
                    <div className="min-h-[40vh]">

                        {/* 1. CONSTITUCIÓN */}
                        {activeTab === 'constitucion' && (
                            <AnimatedSection animation="fade-in">
                                <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                                    {CONSTITUCION_NACIONAL.map(ley => (
                                        <a
                                            key={ley.id}
                                            href={ley.pdf_url || ley.pdf_fallback}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group relative flex flex-col md:flex-row items-center md:items-start p-8 md:p-10 rounded-3xl bg-white border border-cream-400 hover:border-accent-gold/40 transition-all duration-500 shadow-md hover:shadow-xl overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent-gold/10 to-transparent rounded-full -translate-y-32 translate-x-32 blur-2xl" />

                                            <div className="p-5 rounded-2xl bg-cream-300 border border-cream-500 text-accent-gold group-hover:scale-110 transition-all duration-500 shrink-0 mb-6 md:mb-0 md:mr-8 z-10">
                                                <ley.icono className="w-10 h-10 stroke-[1.5]" />
                                            </div>

                                            <div className="flex-1 text-center md:text-left z-10 w-full">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-4">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    {ley.chunks}
                                                </div>
                                                <h3 className="text-2xl md:text-3xl font-serif font-bold text-charcoal-900 leading-tight group-hover:text-accent-gold transition-colors mb-4">
                                                    {ley.nombre}
                                                </h3>
                                                <p className="text-charcoal-600 lg:text-lg mb-8 max-w-2xl">
                                                    {ley.descripcion}
                                                </p>

                                                <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-cream-400 gap-4">
                                                    <span className="text-xs font-mono text-charcoal-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Landmark className="w-3.5 h-3.5" /> {ley.fuente}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-accent-gold text-sm font-medium group-hover:translate-x-1 transition-transform">
                                                        Abrir Documento <ExternalLink className="w-4 h-4" />
                                                    </span>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </AnimatedSection>
                        )}

                        {/* 2. TRATADOS INTERNACIONALES */}
                        {activeTab === 'tratados' && (
                            <AnimatedSection animation="fade-in">
                                {filteredTratados.length === 0 ? (
                                    <div className="text-center py-20 text-charcoal-400">No se encontraron tratados.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {filteredTratados.map(t => (
                                            <a
                                                key={t.id}
                                                href={t.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative flex flex-col p-6 rounded-2xl bg-white border border-cream-400 hover:border-accent-gold/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                            >
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="p-3 rounded-xl bg-cream-300 border border-cream-500 text-charcoal-500 group-hover:text-accent-gold group-hover:border-accent-gold/30 transition-colors duration-300 shrink-0">
                                                        <t.icono className="w-6 h-6 stroke-[1.5]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-charcoal-900 font-medium leading-snug group-hover:text-accent-gold transition-colors line-clamp-2">
                                                            {t.nombre}
                                                        </h3>
                                                        <span className="text-[10px] text-charcoal-400 mt-1 block">
                                                            {t.abreviatura}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-charcoal-500 line-clamp-2 mb-6 flex-1">
                                                    {t.descripcion}
                                                </p>

                                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-cream-400">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Indexado
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-charcoal-400 group-hover:text-accent-gold transition-colors" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </AnimatedSection>
                        )}

                        {/* 3. LEYES FEDERALES */}
                        {activeTab === 'federales' && (
                            <AnimatedSection animation="fade-in">
                                {filteredFederales.length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-charcoal-400">No se encontraron leyes con "{searchQuery}".</p>
                                        <button onClick={() => setSearchQuery('')} className="mt-4 text-accent-gold text-sm underline">Ver todas las leyes</button>
                                    </div>
                                ) : (
                                    <>
                                        {searchQuery && (
                                            <p className="text-center text-sm text-charcoal-400 mb-6">
                                                {filteredFederales.length} {filteredFederales.length === 1 ? 'resultado' : 'resultados'} para &ldquo;<strong>{searchQuery}</strong>&rdquo;
                                            </p>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                            {filteredFederales.map((ley, idx) => {
                                                const CatIcon = ley.categoria === 'codigos' ? Lock :
                                                    ley.categoria === 'constitucion' ? Landmark :
                                                        ley.categoria === 'reglamentos' ? Scale :
                                                            ley.categoria === 'otros' ? FileText : Gavel;
                                                const catColor = ley.categoria === 'codigos' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                                    ley.categoria === 'constitucion' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                        ley.categoria === 'reglamentos' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                            ley.categoria === 'otros' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                                                'bg-emerald-50 border-emerald-200 text-emerald-700';
                                                const catLabel = ley.categoria === 'codigos' ? 'Código' :
                                                    ley.categoria === 'constitucion' ? 'Const.' :
                                                        ley.categoria === 'reglamentos' ? 'Reglamento' :
                                                            ley.categoria === 'otros' ? 'General' : 'Ley';

                                                if (!ley.url) return (
                                                    <div key={idx} className="flex flex-col p-5 rounded-2xl bg-white/50 border border-cream-400 opacity-60 cursor-not-allowed">
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="p-2.5 rounded-xl bg-cream-300 border border-cream-500 text-charcoal-400 shrink-0">
                                                                <CatIcon className="w-5 h-5 stroke-[1.5]" />
                                                            </div>
                                                            <div>
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border mb-1.5 ${catColor}`}>
                                                                    {catLabel}
                                                                </span>
                                                                <h3 className="text-charcoal-600 text-sm font-medium leading-snug line-clamp-3">{ley.nombre}</h3>
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto pt-3 border-t border-cream-400 text-[10px] text-charcoal-400 font-mono uppercase tracking-widest">Próximamente</div>
                                                    </div>
                                                );

                                                return (
                                                    <a
                                                        key={idx}
                                                        href={ley.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group flex flex-col p-5 rounded-2xl bg-white border border-cream-400 hover:border-accent-gold/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                                    >
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="p-2.5 rounded-xl bg-cream-300 border border-cream-500 text-charcoal-600 group-hover:text-accent-gold group-hover:border-accent-gold/30 transition-colors shrink-0">
                                                                <CatIcon className="w-5 h-5 stroke-[1.5]" />
                                                            </div>
                                                            <div>
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border mb-1.5 ${catColor}`}>
                                                                    {catLabel}
                                                                </span>
                                                                <h3 className="text-charcoal-900 text-sm font-medium leading-snug line-clamp-3 group-hover:text-accent-gold transition-colors">
                                                                    {ley.nombre}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-cream-400">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                DOF
                                                            </div>
                                                            <ExternalLink className="w-3.5 h-3.5 text-charcoal-400 group-hover:text-accent-gold transition-colors" />
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </AnimatedSection>
                        )}

                        {/* 4. NORMATIVA ESTATAL */}
                        {activeTab === 'estatales' && (
                            <AnimatedSection animation="fade-in">
                                {filteredEstados.length === 0 ? (
                                    <div className="text-center py-20 text-charcoal-400">No se encontraron estados con esa búsqueda.</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {filteredEstados.map(estado => {
                                            const totalLeyes = getTotalLeyes(estado.leyes);
                                            const hasContent = totalLeyes > 0;
                                            return (
                                                <Link
                                                    key={estado.slug}
                                                    href={`/leyesestatales/${estado.slug}`}
                                                    className={`group relative flex flex-col p-4 sm:p-5 rounded-2xl border transition-all duration-300 overflow-hidden ${hasContent
                                                        ? 'bg-white border-cream-400 hover:border-accent-gold/40 hover:-translate-y-1 hover:shadow-lg'
                                                        : 'bg-cream-300/50 border-cream-400/50 opacity-60 hover:opacity-80'
                                                        }`}
                                                >
                                                    {hasContent && (
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent-gold/10 to-transparent rounded-full -translate-y-16 translate-x-16 blur-xl" />
                                                    )}

                                                    <h4 className={`text-base font-semibold leading-tight mb-2 transition-colors relative z-10 ${hasContent ? 'text-charcoal-900 group-hover:text-accent-gold' : 'text-charcoal-400'
                                                        }`}>
                                                        {estado.nombreCorto}
                                                    </h4>

                                                    <div className="mt-auto flex items-center justify-between relative z-10">
                                                        <span className={`text-xs font-mono uppercase tracking-widest ${hasContent ? 'text-charcoal-500' : 'text-charcoal-400'
                                                            }`}>
                                                            {hasContent ? `${totalLeyes} LEYES` : 'PRÓXIMAMENTE'}
                                                        </span>
                                                        {hasContent && (
                                                            <ChevronRight className="w-4 h-4 text-accent-gold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </AnimatedSection>
                        )}
                    </div>
                </div>
            </section>

            {/* ─── CTA Banner ─── */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <AnimatedSection animation="fade-in">
                        <div className="relative rounded-[2rem] bg-charcoal-900 p-10 sm:p-14 overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-accent-gold/10 via-accent-gold/5 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full translate-y-32 -translate-x-32 blur-2xl" />

                            <div className="relative text-center z-10">
                                <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-charcoal-800 border border-charcoal-700 text-accent-gold mb-6 shadow-inner">
                                    <Scale className="w-6 h-6 stroke-[1.5]" />
                                </div>
                                <h3 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-6">
                                    Repositorio indexado con <span className="text-accent-gold">Inteligencia Artificial</span>
                                </h3>
                                <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10 text-lg">
                                    Iurexia procesa diariamente cientos de ordenamientos jurídicos para ofrecerte
                                    búsquedas semánticas de precisión milimétrica directamente desde nuestro chat especializado.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                    <Link href="/chat" className="group flex items-center gap-2 px-8 py-4 bg-accent-gold text-charcoal-900 font-bold rounded-xl hover:bg-accent-gold/90 transition-all duration-300 shadow-lg hover:-translate-y-0.5">
                                        Hablar con el Chat AI
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <a href="mailto:soporte@iurexia.com" className="flex items-center gap-2 px-8 py-4 bg-charcoal-800 text-gray-300 font-medium rounded-xl hover:bg-charcoal-700 hover:text-white transition-all duration-300 border border-charcoal-700">
                                        Sugerir Ordenamiento
                                    </a>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-cream-400 bg-cream-300">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-semibold text-charcoal-900 tracking-wide">Iurex<span className="text-accent-gold">ia</span></span>
                        </div>
                        <div className="flex gap-8 text-sm text-charcoal-500 font-medium">
                            <Link href="/privacidad" className="hover:text-accent-gold transition-colors">Privacidad</Link>
                            <Link href="/terminos" className="hover:text-accent-gold transition-colors">Términos</Link>
                            <Link href="/conocenos" className="hover:text-accent-gold transition-colors">Conócenos</Link>
                            <a href="mailto:soporte@iurexia.com" className="hover:text-accent-gold transition-colors">Contacto</a>
                        </div>
                        <p className="text-sm text-charcoal-400">© 2026 Iurexia. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
