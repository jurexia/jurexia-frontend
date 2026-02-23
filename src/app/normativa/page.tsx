'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useState } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ESTADOS, getTotalLeyes } from '../leyesestatales/estadosData';
import {
    BookOpen, ArrowRight, Scale, FileText, ChevronDown, ExternalLink
} from 'lucide-react';

// ─── Sección 1: Constitución ──────────────────────────────────────
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
        icono: '🏛️',
        disponible: true,
    },
];

// ─── Sección 2: Tratados Internacionales ──────────────────────────
const GCS_TRATADOS = 'https://storage.googleapis.com/iurexia-leyes/Tratados';

const TRATADOS_INTERNACIONALES = [
    // ─── Sistema Interamericano (OEA) ─────────────────────────
    {
        id: 'cadh',
        nombre: 'Convención Americana sobre Derechos Humanos (Pacto de San José)',
        abreviatura: 'CADH',
        descripcion: 'Tratado interamericano de derechos humanos — OEA',
        pdf_url: `${GCS_TRATADOS}/Convencion%20Americana%20sobre%20Derechos%20Humanos%20(CADH).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'OEA',
        icono: '🌎',
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
        icono: '🌺',
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
        icono: '🌈',
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
        icono: '👴',
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
        icono: '🏥',
        disponible: true,
    },

    // ─── Sistema Universal (ONU / OHCHR) ──────────────────────
    {
        id: 'dudh',
        nombre: 'Declaración Universal de Derechos Humanos',
        abreviatura: 'DUDH',
        descripcion: 'Fundamento del derecho internacional de los derechos humanos',
        pdf_url: `${GCS_TRATADOS}/Declaracion%20Universal%20de%20Derechos%20Humanos%20(DUDH).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: '🌍',
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
        icono: '🕊️',
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
        icono: '📋',
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
        icono: '👶',
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
        icono: '🛡️',
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
        icono: '♀️',
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
        icono: '♿',
        disponible: true,
    },
    {
        id: 'conv-dforzada-onu',
        nombre: 'Convención contra las Desapariciones Forzadas (ONU)',
        abreviatura: 'CED',
        descripcion: 'Protección contra desapariciones forzadas — ONU',
        pdf_url: `${GCS_TRATADOS}/Convencion%20Desapariciones%20Forzadas%20ONU%20(CED).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU',
        icono: '🔦',
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
        icono: '✊',
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
        icono: '🌐',
        disponible: true,
    },

    // ─── Instrumentos penitenciarios y de investigación ────────
    {
        id: 'reglas-mandela',
        nombre: 'Reglas Nelson Mandela — Tratamiento de Reclusos',
        abreviatura: 'Reglas Mandela',
        descripcion: 'Reglas mínimas para el tratamiento de reclusos — ONU',
        pdf_url: `${GCS_TRATADOS}/Reglas%20Nelson%20Mandela%20-%20Tratamiento%20Reclusos%20(ONU).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'ONU / UNODC',
        icono: '🔒',
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
        icono: '👩‍⚖️',
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
        icono: '🩺',
        disponible: true,
    },

    // ─── Derechos específicos ──────────────────────────────────
    {
        id: 'principios-yogyakarta',
        nombre: 'Principios de Yogyakarta',
        abreviatura: 'Yogyakarta',
        descripcion: 'Orientación sexual e identidad de género — Soft law',
        pdf_url: `${GCS_TRATADOS}/Principios%20de%20Yogyakarta%20-%20Orientacion%20Sexual%20e%20Identidad%20de%20Genero.pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'Panel de Expertos DDHH',
        icono: '🏳️‍🌈',
        disponible: true,
    },

    // ─── Consejo de Europa ────────────────────────────────────
    {
        id: 'conv-datos',
        nombre: 'Convenio 108 — Protección de Datos Personales',
        abreviatura: 'C108',
        descripcion: 'Tratamiento automatizado de datos personales — CoE',
        pdf_url: `${GCS_TRATADOS}/Convenio%20108%20Proteccion%20Datos%20Personales%20(C108).pdf`,
        chunks: 'Indexado en RAG',
        fuente: 'Consejo de Europa',
        icono: '💻',
        disponible: true,
    },
];

// ─── Sección 3: Leyes Federales ───────────────────────────────────
const LEYES_FEDERALES = [
    {
        id: 'ley-amparo',
        nombre: 'Ley de Amparo, Reglamentaria de los artículos 103 y 107 CPEUM',
        abreviatura: 'Ley de Amparo',
        materia: 'Procesal Constitucional',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: '⚖️',
    },
    {
        id: 'cnpp',
        nombre: 'Código Nacional de Procedimientos Penales',
        abreviatura: 'CNPP',
        materia: 'Penal',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: '🔒',
    },
    {
        id: 'ccf',
        nombre: 'Código Civil Federal',
        abreviatura: 'CCF',
        materia: 'Civil',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: '📜',
    },
    {
        id: 'lft',
        nombre: 'Ley Federal del Trabajo',
        abreviatura: 'LFT',
        materia: 'Laboral',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: '🏭',
    },
    {
        id: 'lfp',
        nombre: 'Ley Federal del Procedimiento Contencioso Administrativo',
        abreviatura: 'LFPCA',
        materia: 'Administrativo',
        disponible: false,
        chunks: 'Próximamente',
        fuente: 'DOF',
        icono: '🏢',
    },
];

/* ─── Accordion Button Component ────────────────────────────────── */
function AccordionButton({
    label,
    emoji,
    isOpen,
    onClick,
    subtitle,
}: {
    label: string;
    emoji: string;
    isOpen: boolean;
    onClick: () => void;
    subtitle?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center justify-between px-6 py-4 rounded-2xl
                bg-charcoal-900 text-white font-semibold text-base sm:text-lg
                hover:bg-charcoal-800 transition-all duration-300
                shadow-md hover:shadow-lg
                ${isOpen ? 'rounded-b-none shadow-none' : ''}
            `}
        >
            <span className="flex items-center gap-3 text-left">
                <span className="text-xl">{emoji}</span>
                <span className="leading-snug">
                    {label}
                    {subtitle && <span className="block text-xs font-normal text-gray-400 mt-0.5">{subtitle}</span>}
                </span>
            </span>
            <ChevronDown className={`w-5 h-5 text-accent-gold shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    );
}

export default function NormativaNacionalPage() {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    const toggle = (key: string) =>
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    const totalDocs = ESTADOS.reduce((acc, e) => acc + getTotalLeyes(e.leyes), 0);

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* ─── Hero ─── */}
            <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cream-200 via-cream-300 to-cream-300" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-brown/5 rounded-full blur-3xl" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <AnimatedSection animation="scale-in">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-charcoal-900 text-white text-xs font-medium tracking-widest uppercase mb-6">
                            <Scale className="w-3.5 h-3.5 text-accent-gold" />
                            Repositorio Jurídico Nacional
                        </div>
                    </AnimatedSection>

                    <AnimatedSection animation="slide-up" delay={100}>
                        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal-900 mb-4 leading-tight">
                            Normativa <span className="text-accent-gold">Nacional</span>
                        </h1>
                    </AnimatedSection>

                    <AnimatedSection animation="fade-in" delay={200}>
                        <p className="text-base sm:text-lg text-charcoal-700 max-w-2xl mx-auto mb-8 leading-relaxed">
                            Todo el ordenamiento jurídico mexicano en un solo lugar.
                            Constitución, tratados internacionales, leyes federales y legislación estatal.
                        </p>
                    </AnimatedSection>

                    {/* Stats */}
                    <AnimatedSection animation="fade-in" delay={300}>
                        <div className="flex justify-center gap-6 sm:gap-10 mb-10">
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
                </div>
            </section>

            {/* ─── Accordion Sections ─── */}
            <section className="pb-16 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto flex flex-col gap-4">

                    {/* ── 1. Constitución ── */}
                    <AnimatedSection animation="slide-up" delay={0}>
                        <AccordionButton
                            label="Constitución"
                            emoji="🏛️"
                            subtitle="Norma suprema del ordenamiento jurídico"
                            isOpen={!!openSections['constitucion']}
                            onClick={() => toggle('constitucion')}
                        />
                        {openSections['constitucion'] && (
                            <div className="bg-white rounded-b-2xl border border-t-0 border-cream-400 shadow-md">
                                {CONSTITUCION_NACIONAL.map(ley => (
                                    <div key={ley.id} className="p-6 text-center">
                                        <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-1">
                                            {ley.nombre}
                                        </h3>
                                        <p className="text-sm text-charcoal-600 mb-2">{ley.descripcion}</p>
                                        <div className="flex items-center justify-center gap-2 text-xs text-charcoal-500 mb-4">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            {ley.chunks} · {ley.fuente}
                                        </div>
                                        {ley.pdf_url && (
                                            <a
                                                href={ley.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal-900 text-white text-sm font-semibold hover:bg-charcoal-800 transition-all shadow-sm"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Ver PDF Oficial
                                                <ExternalLink className="w-3 h-3 opacity-60" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </AnimatedSection>

                    {/* ── 2. Tratados Internacionales ── */}
                    <AnimatedSection animation="slide-up" delay={60}>
                        <AccordionButton
                            label="Tratados Internacionales"
                            emoji="🌎"
                            subtitle={`20 instrumentos con PDF · Bloque de constitucionalidad`}
                            isOpen={!!openSections['tratados']}
                            onClick={() => toggle('tratados')}
                        />
                        {openSections['tratados'] && (
                            <div className="bg-white rounded-b-2xl border border-t-0 border-cream-400 shadow-md divide-y divide-cream-300">
                                {TRATADOS_INTERNACIONALES.map(t => (
                                    <div key={t.id} className="p-5 text-center">
                                        <div className="text-2xl mb-2">{t.icono}</div>
                                        <h3 className="font-serif text-base font-semibold text-charcoal-800 mb-1">{t.nombre}</h3>
                                        <p className="text-xs text-charcoal-500 mb-2">{t.descripcion}</p>
                                        <div className="flex items-center justify-center gap-2 text-xs text-charcoal-500 mb-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            {t.chunks} · {t.fuente}
                                        </div>
                                        {t.pdf_url && (
                                            <a
                                                href={t.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 transition-all shadow-sm"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Ver PDF
                                                <ExternalLink className="w-3 h-3 opacity-60" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </AnimatedSection>

                    {/* ── 3. Leyes Federales ── */}
                    <AnimatedSection animation="slide-up" delay={120}>
                        <AccordionButton
                            label="Leyes Federales"
                            emoji="⚖️"
                            subtitle="Legislación de aplicación nacional"
                            isOpen={!!openSections['federal']}
                            onClick={() => toggle('federal')}
                        />
                        {openSections['federal'] && (
                            <div className="bg-white rounded-b-2xl border border-t-0 border-cream-400 shadow-md divide-y divide-cream-300">
                                {LEYES_FEDERALES.map(ley => (
                                    <div key={ley.id} className="p-5 text-center">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-cream-200 text-charcoal-600 border border-cream-400 mb-2">
                                            {ley.materia}
                                        </span>
                                        <h3 className="font-serif text-sm font-semibold text-charcoal-800 mb-1">{ley.nombre}</h3>
                                        <span className="text-[11px] text-charcoal-400">{ley.chunks} · {ley.fuente}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </AnimatedSection>

                    {/* ── 4. Leyes Estatales ── */}
                    <AnimatedSection animation="slide-up" delay={180}>
                        <AccordionButton
                            label="Leyes Estatales"
                            emoji="🗺️"
                            subtitle={`Legislación de los 32 estados · ${totalDocs.toLocaleString()}+ documentos`}
                            isOpen={!!openSections['estatal']}
                            onClick={() => toggle('estatal')}
                        />
                        {openSections['estatal'] && (
                            <div className="bg-white rounded-b-2xl border border-t-0 border-cream-400 shadow-md p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {ESTADOS.map(estado => {
                                        const totalLeyes = getTotalLeyes(estado.leyes);
                                        const hasContent = totalLeyes > 0;
                                        return (
                                            <Link
                                                key={estado.slug}
                                                href={`/leyesestatales/${estado.slug}`}
                                                className={`group flex flex-col items-center text-center p-3 rounded-xl transition-all duration-200 ${hasContent
                                                    ? 'hover:bg-cream-100 hover:shadow-md'
                                                    : 'opacity-50 hover:opacity-70'
                                                    }`}
                                            >
                                                <h4 className={`text-sm font-semibold leading-tight mb-1 transition-colors ${hasContent ? 'text-charcoal-900 group-hover:text-accent-gold' : 'text-charcoal-500'
                                                    }`}>
                                                    {estado.nombreCorto}
                                                </h4>
                                                <span className={`text-[10px] ${hasContent ? 'text-charcoal-600' : 'text-charcoal-400'}`}>
                                                    {hasContent ? `${totalLeyes} docs` : 'Próximamente'}
                                                </span>
                                                {hasContent && (
                                                    <ArrowRight className="w-3 h-3 text-accent-gold opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </AnimatedSection>
                </div>
            </section>

            {/* ─── Info Banner ─── */}
            <section className="py-10 sm:py-14 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <AnimatedSection animation="fade-in">
                        <div className="relative rounded-3xl bg-charcoal-900 text-white p-8 sm:p-10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent-gold/10 to-transparent rounded-full -translate-y-32 translate-x-32" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent-gold/5 to-transparent rounded-full translate-y-24 -translate-x-24" />
                            <div className="relative text-center">
                                <h3 className="font-serif text-2xl sm:text-3xl font-semibold mb-4">
                                    Repositorio en constante <span className="text-accent-gold">actualización</span>
                                </h3>
                                <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto mb-6">
                                    Iurexia indexa las fuentes oficiales para ofrecerte la legislación más actualizada.
                                    Cada documento está verificado y vinculado con nuestra IA para que puedas consultar
                                    artículos directamente desde el chat.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Link href="/chat" className="inline-flex items-center gap-2 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-full hover:bg-accent-gold/90 transition-all duration-300 hover:shadow-lg hover:shadow-accent-gold/20">
                                        Consultar con IA
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <a href="mailto:soporte@iurexia.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-all duration-300 border border-white/10">
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
                        <p className="text-sm text-charcoal-500">© 2026 Iurexia. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
