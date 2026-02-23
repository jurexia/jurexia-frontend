'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ESTADOS, getTotalLeyes } from '../leyesestatales/estadosData';
import {
    BookOpen, ArrowRight, Scale, FileText, ExternalLink, Globe2,
    Landmark, Search, Calendar, MapPin, Shield, Users, Gavel,
    Stethoscope, Activity, HeartHandshake, Baby, Lock
} from 'lucide-react';

// ─── Data Sections ───
const CONSTITUCION_NACIONAL = [
    {
        id: 'cpeum',
        nombre: 'Constitución Política de los Estados Unidos Mexicanos',
        abreviatura: 'CPEUM',
        descripcion: '136 artículos — Norma suprema del ordenamiento jurídico mexicano',
        pdf_url: 'https://storage.googleapis.com/iurexia-leyes/constitucion/CPEUM-2024.pdf',
        pdf_fallback: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CPEUM.pdf',
        chunks: '~1,200 fragmentos indexados',
        fuente: 'Cámara de Diputados — DOF',
        icono: Landmark,
        disponible: true,
    },
];

const GCS_TRATADOS = 'https://storage.googleapis.com/iurexia-leyes/Tratados';

const TRATADOS_INTERNACIONALES = [
    {
        id: 'cadh',
        nombre: 'Convención Americana sobre Derechos Humanos (Pacto de San José)',
        abreviatura: 'CADH',
        descripcion: 'Tratado interamericano de derechos humanos — OEA',
        pdf_url: `${GCS_TRATADOS}/Convencion%20Americana%20sobre%20Derechos%20Humanos%20(CADH).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Interamericana%20Belem%20do%20Para%20(CBdP).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Interamericana%20contra%20Racismo%20e%20Intolerancia%20(CIRDI).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Interamericana%20Derechos%20Personas%20Mayores%20(CIPM).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Protocolo%20de%20San%20Salvador%20-%20Derechos%20Economicos%20Sociales%20(PSS).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Declaracion%20Universal%20de%20Derechos%20Humanos%20(DUDH).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Pacto%20Internacional%20Derechos%20Civiles%20y%20Politicos%20(PIDCP).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Pacto%20Internacional%20Derechos%20Economicos%20Sociales%20y%20Culturales%20(PIDESC).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20sobre%20los%20Derechos%20del%20Nino%20(CDN).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20contra%20la%20Tortura%20ONU%20(CAT).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Eliminacion%20Discriminacion%20contra%20la%20Mujer%20(CEDAW).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Derechos%20Personas%20con%20Discapacidad%20(CRPD).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Eliminacion%20Discriminacion%20Racial%20(ICERD).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Convencion%20Derechos%20Trabajadores%20Migratorios%20(CMW).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Reglas%20Nelson%20Mandela%20-%20Tratamiento%20Reclusos%20(ONU).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Reglas%20de%20Bangkok%20-%20Tratamiento%20Reclusas%20(ONU).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Protocolo%20de%20Estambul%20-%20Investigacion%20Tortura%20(OHCHR).pdf`,
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
        pdf_url: `${GCS_TRATADOS}/Principios%20de%20Yogyakarta%20-%20Orientacion%20Sexual%20e%20Identidad%20de%20Genero.pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'Panel de Expertos DDHH',
        icono: Globe2,
        disponible: true,
    },
];

const LEYES_FEDERALES = [
    {
        id: 'ley-amparo',
        nombre: 'Ley de Amparo, Reglamentaria de los artículos 103 y 107 CPEUM',
        abreviatura: 'Ley de Amparo',
        materia: 'Procesal Constitucional',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: Gavel,
    },
    {
        id: 'cnpp',
        nombre: 'Código Nacional de Procedimientos Penales',
        abreviatura: 'CNPP',
        materia: 'Penal',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: Lock,
    },
    {
        id: 'ccf',
        nombre: 'Código Civil Federal',
        abreviatura: 'CCF',
        materia: 'Civil',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: FileText,
    },
    {
        id: 'lft',
        nombre: 'Ley Federal del Trabajo',
        abreviatura: 'LFT',
        materia: 'Laboral',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: Users,
    },
    {
        id: 'lfp',
        nombre: 'Ley Federal del Procedimiento Contencioso Administrativo',
        abreviatura: 'LFPCA',
        materia: 'Administrativo',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: Landmark,
    },
];

type TabType = 'constitucion' | 'tratados' | 'federales' | 'estatales';

export default function NormativaNacionalPage() {
    const [activeTab, setActiveTab] = useState<TabType>('constitucion');
    const [searchQuery, setSearchQuery] = useState('');

    const totalDocs = ESTADOS.reduce((acc, e) => acc + getTotalLeyes(e.leyes), 0);

    // Filtrado de estados
    const filteredEstados = useMemo(() => {
        if (!searchQuery) return ESTADOS;
        return ESTADOS.filter(e =>
            e.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    // Filtrado de Tratados
    const filteredTratados = useMemo(() => {
        if (!searchQuery) return TRATADOS_INTERNACIONALES;
        return TRATADOS_INTERNACIONALES.filter(t =>
            t.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    return (
        <main className="min-h-screen bg-[#0A0F1A] text-gray-200">
            {/* The current Navbar component adapts if we don't pass props, but we will wrap it in dark specific styles if needed. Let's rely on global CSS. */}
            <div className="dark">
                <Navbar />
            </div>

            {/* ─── Hero Section ─── */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-charcoal-800 via-[#0A0F1A] to-black" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />

                <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-5xl mx-auto text-center z-10">
                    <AnimatedSection animation="scale-in">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gold-400 text-xs font-semibold tracking-widest uppercase mb-8 shadow-[0_0_15px_rgba(201,169,98,0.1)]">
                            <Scale className="w-4 h-4" />
                            Repositorio Jurídico Nacional
                        </div>
                    </AnimatedSection>

                    <AnimatedSection animation="slide-up" delay={100}>
                        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500">
                            Normativa <span className="text-gold-400 drop-shadow-[0_0_25px_rgba(201,169,98,0.2)]">Nacional</span>
                        </h1>
                    </AnimatedSection>

                    <AnimatedSection animation="fade-in" delay={200}>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                            Explora el ordenamiento jurídico mexicano más actualizado.
                            Constitución, tratados, leyes federales y legislación estatal en una interfaz de vanguardia.
                        </p>
                    </AnimatedSection>

                    {/* Stats */}
                    <AnimatedSection animation="fade-in" delay={300}>
                        <div className="flex justify-center gap-8 sm:gap-12 mb-12">
                            <div className="text-center group">
                                <div className="font-serif text-2xl sm:text-4xl font-bold text-gray-200 group-hover:text-white transition-colors">4</div>
                                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-1">Fuentes</div>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div className="text-center group">
                                <div className="font-serif text-2xl sm:text-4xl font-bold text-gold-400 drop-shadow-[0_0_10px_rgba(201,169,98,0.3)]">{totalDocs.toLocaleString()}+</div>
                                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-1">Docs Indexados</div>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div className="text-center group">
                                <div className="font-serif text-2xl sm:text-4xl font-bold text-gray-200 group-hover:text-white transition-colors">32</div>
                                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-1">Estados</div>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Gloabl Search Bar */}
                    {(activeTab === 'estatales' || activeTab === 'tratados') && (
                        <AnimatedSection animation="slide-up" delay={400}>
                            <div className="max-w-xl mx-auto relative group">
                                <div className="absolute inset-0 bg-gold-400/20 rounded-2xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" />
                                <div className="relative flex items-center bg-charcoal-800/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden focus-within:border-gold-500/50 focus-within:bg-charcoal-800/60 transition-all duration-300 shadow-xl">
                                    <Search className="w-5 h-5 text-gray-400 ml-5" />
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'estatales' ? "Buscar estado (ej. Nuevo León)..." : "Buscar tratado..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent border-none text-white px-4 py-4 focus:ring-0 placeholder-gray-500 outline-none text-sm md:text-base font-light"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="mr-4 text-gray-500 hover:text-gray-300 text-sm font-medium"
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

            {/* ─── Main Content Tabs ─── */}
            <section className="pb-24 px-4 sm:px-6 relative z-10">
                <div className="max-w-6xl mx-auto">

                    {/* Tabs Navigation */}
                    <AnimatedSection animation="fade-in" delay={100}>
                        <div className="flex flex-wrap justify-center gap-2 bg-charcoal-800/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md mb-12 sm:mb-16 shadow-2xl overflow-x-auto no-scrollbar max-w-fit mx-auto">
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
                                                ? 'bg-charcoal-700/80 text-gold-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                                            }
                                        `}
                                    >
                                        <tab.icon className={`w-4 h-4 ${active ? 'text-gold-400' : 'text-gray-500'}`} strokeWidth={active ? 2 : 1.5} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </AnimatedSection>

                    {/* Tab Content Rendering */}
                    <div className="min-h-[40vh]">
                        {/* 1. CONSTITUCIÓN (Bento Large Card) */}
                        {activeTab === 'constitucion' && (
                            <AnimatedSection animation="fade-in">
                                <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                                    {CONSTITUCION_NACIONAL.map(ley => (
                                        <a
                                            key={ley.id}
                                            href={ley.pdf_url || ley.pdf_fallback}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group relative flex flex-col md:flex-row items-center md:items-start p-8 md:p-10 rounded-3xl bg-charcoal-800/30 backdrop-blur-md border border-charcoal-700/50 hover:bg-charcoal-800/50 hover:border-gold-500/40 transition-all duration-500 shadow-2xl overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gold-400/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-gold-500/10 to-transparent rounded-full -translate-y-32 translate-x-32 blur-2xl" />

                                            <div className="p-5 rounded-2xl bg-charcoal-900 border border-charcoal-700 text-gold-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(201,169,98,0.2)] transition-all duration-500 shrink-0 mb-6 md:mb-0 md:mr-8 z-10">
                                                <ley.icono className="w-10 h-10 stroke-[1.5]" />
                                            </div>

                                            <div className="flex-1 text-center md:text-left z-10 w-full">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-900/80 border border-charcoal-700 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-4">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    {ley.chunks}
                                                </div>
                                                <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-100 leading-tight group-hover:text-gold-100 transition-colors mb-4">
                                                    {ley.nombre}
                                                </h3>
                                                <p className="text-gray-400 lg:text-lg font-light mb-8 max-w-2xl">
                                                    {ley.descripcion}
                                                </p>

                                                <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-charcoal-700/50 gap-4">
                                                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Landmark className="w-3.5 h-3.5" /> {ley.fuente}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-gold-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                                                        Abrir Documento <ExternalLink className="w-4 h-4" />
                                                    </span>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </AnimatedSection>
                        )}

                        {/* 2. TRATADOS INTERNACIONALES (Bento Grid) */}
                        {activeTab === 'tratados' && (
                            <AnimatedSection animation="fade-in">
                                {filteredTratados.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">No se encontraron tratados.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTratados.map(t => (
                                            <a
                                                key={t.id}
                                                href={t.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative flex flex-col p-6 rounded-2xl bg-charcoal-800/30 backdrop-blur-sm border border-charcoal-700/50 hover:bg-charcoal-800/60 hover:border-gold-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                            >
                                                <div className="absolute inset-0 bg-gold-400/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="p-3 rounded-xl bg-charcoal-900 border border-charcoal-700 text-gray-400 group-hover:text-gold-400 group-hover:border-gold-500/30 transition-colors duration-300 shrink-0">
                                                        <t.icono className="w-6 h-6 stroke-[1.5]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-gray-100 font-medium leading-snug group-hover:text-gold-200 transition-colors line-clamp-2">
                                                            {t.nombre}
                                                        </h3>
                                                        <span className="text-[10px] text-gray-400 mt-1 block">
                                                            {t.abreviatura}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-500 font-light line-clamp-2 mb-6 flex-1">
                                                    {t.descripcion}
                                                </p>

                                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-charcoal-700/50">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Indexado
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-charcoal-500 group-hover:text-gold-400 transition-colors" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </AnimatedSection>
                        )}

                        {/* 3. LEYES FEDERALES (Bento Grid) */}
                        {activeTab === 'federales' && (
                            <AnimatedSection animation="fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {LEYES_FEDERALES.map(ley => (
                                        <div
                                            key={ley.id}
                                            className="group relative flex flex-col p-6 rounded-2xl bg-charcoal-800/20 backdrop-blur-sm border border-charcoal-700/30 opacity-70 cursor-not-allowed"
                                        >
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-charcoal-900 border border-charcoal-700 text-charcoal-500 shrink-0">
                                                    <ley.icono className="w-6 h-6 stroke-[1.5]" />
                                                </div>
                                                <div>
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-charcoal-900 text-gray-400 border border-charcoal-700 mb-2">
                                                        {ley.materia}
                                                    </span>
                                                    <h3 className="text-gray-300 font-medium leading-snug line-clamp-2">
                                                        {ley.nombre}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-charcoal-700/30">
                                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                                    {ley.chunks}
                                                </div>
                                                <span className="text-xs text-charcoal-500 font-semibold uppercase tracking-widest">{ley.fuente}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AnimatedSection>
                        )}

                        {/* 4. LEYES ESTATALES (Minimal Cards Grid) */}
                        {activeTab === 'estatales' && (
                            <AnimatedSection animation="fade-in">
                                {filteredEstados.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">No se encontraron estados con esa búsqueda.</div>
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
                                                            ? 'bg-charcoal-800/40 border-charcoal-700/50 hover:bg-charcoal-800/80 hover:border-gold-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold-500/5'
                                                            : 'bg-charcoal-800/10 border-charcoal-800/50 opacity-60 hover:opacity-80'
                                                        }`}
                                                >
                                                    {hasContent && (
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 blur-xl" />
                                                    )}

                                                    <h4 className={`text-base font-semibold leading-tight mb-2 transition-colors relative z-10 ${hasContent ? 'text-gray-200 group-hover:text-gold-300' : 'text-gray-500'
                                                        }`}>
                                                        {estado.nombreCorto}
                                                    </h4>

                                                    <div className="mt-auto flex items-center justify-between relative z-10">
                                                        <span className={`text-[#10px] sm:text-xs font-mono uppercase tracking-widest ${hasContent ? 'text-gray-400' : 'text-charcoal-600'
                                                            }`}>
                                                            {hasContent ? `${totalLeyes} LEYES` : 'PRÓXIMAMENTE'}
                                                        </span>
                                                        {hasContent && (
                                                            <ChevronRight className="w-4 h-4 text-gold-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
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
            <section className="py-16 px-4 sm:px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <AnimatedSection animation="fade-in">
                        <div className="relative rounded-[2rem] bg-gradient-to-br from-charcoal-800 to-charcoal-900 border border-charcoal-700 p-10 sm:p-14 overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-gold-500/10 via-gold-500/5 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full translate-y-32 -translate-x-32 blur-2xl" />

                            <div className="relative text-center z-10">
                                <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-charcoal-900 border border-charcoal-700 text-gold-400 mb-6 shadow-inner">
                                    <Scale className="w-6 h-6 stroke-[1.5]" />
                                </div>
                                <h3 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-6">
                                    Repositorio indexado con <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-600">Inteligencia Artificial</span>
                                </h3>
                                <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10 text-lg font-light">
                                    Iurexia procesa diariamente cientos de ordenamientos jurídicos para ofrecerte
                                    búsquedas semánticas de precisión milimétrica directamente desde nuestro chat especializado.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                    <Link href="/chat" className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-charcoal-900 font-bold rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all duration-300 shadow-[0_0_20px_rgba(201,169,98,0.3)] hover:shadow-[0_0_30px_rgba(201,169,98,0.5)] hover:-translate-y-0.5">
                                        Hablar con el Chat AI
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <a href="mailto:soporte@iurexia.com" className="flex items-center gap-2 px-8 py-4 bg-charcoal-800 text-gray-300 font-medium rounded-xl hover:bg-charcoal-700 hover:text-white transition-all duration-300 border border-charcoal-600 hover:border-charcoal-500">
                                        Sugerir Ordenamiento
                                    </a>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-charcoal-800 bg-[#0A0F1A] relative z-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-semibold text-white tracking-wide">Iurex<span className="text-gold-500">ia</span></span>
                        </div>
                        <div className="flex gap-8 text-sm text-gray-500 font-medium">
                            <Link href="/privacidad" className="hover:text-gold-400 transition-colors">Privacidad</Link>
                            <Link href="/terminos" className="hover:text-gold-400 transition-colors">Términos</Link>
                            <Link href="/conocenos" className="hover:text-gold-400 transition-colors">Conócenos</Link>
                            <a href="mailto:soporte@iurexia.com" className="hover:text-gold-400 transition-colors">Contacto</a>
                        </div>
                        <p className="text-sm text-gray-600">© 2026 Iurexia. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
