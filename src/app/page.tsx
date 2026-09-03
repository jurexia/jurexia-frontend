'use client';

import Navbar from '@/components/Navbar';
import { Suspense } from 'react';
import HeroVideo from '@/components/HeroVideo';
import DespachosVitrina from '@/components/DespachosVitrina';
import DemoEnVivo from '@/components/DemoEnVivo';
import ChatInput from '@/components/ChatInput';
import Link from 'next/link';
import { HeroCTA } from '@/components/HeroCTA';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { AnimatedSection } from '@/components/AnimatedSection';

export default function HomePage() {
    return (
        <main className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "Iurexia",
                        "operatingSystem": "Web",
                        "applicationCategory": "BusinessApplication",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "MXN"
                        },
                        "description": "La inteligencia artificial más precisa para el sistema jurídico Mexicano. Herramienta legal de investigación y análisis de sentencias."
                    })
                }}
            />
            <Navbar sobreOscuro />

            {/* Hero con vídeo de fondo. El titular y los botones viven ahí. */}
            <HeroVideo />

            {/* La franja de despachos, inmediatamente bajo el vídeo. Es la
                primera pregunta que se hace quien llega a evaluarnos: quién
                más está usando esto. Si no hay logotipos publicados, no se
                pinta nada — un escaparate con huecos grises dice lo contrario
                de lo que se pretende. */}
            <Suspense fallback={null}>
                <DespachosVitrina />
            </Suspense>

            {/* La demostración, justo debajo de la vitrina: es la segunda
                pregunta de quien llega —qué hace exactamente— y se responde
                mejor enseñándolo que contándolo. */}
            <DemoEnVivo />

            {/* Rehecha el 3-ago-2026 (paso 2 de la estrategia de la home):
                titular en la paleta de la casa, franja de números verificables
                y las dos tarjetas sin adornos. El grid de features aparte se
                fundió aquí: decía lo mismo dos veces. */}
            <section className="pt-14 sm:pt-20 pb-12 sm:pb-20 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <AnimatedSection animation="slide-up" delay={200}>
                        <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900 leading-tight px-2">
                            La inteligencia artificial <span className="text-accent-gold">más precisa</span> para el sistema jurídico Mexicano
                        </p>
                    </AnimatedSection>

                    {/* Franja de números. Cada cifra es medible contra Qdrant o
                        la auditoría de citas — si alguna deja de ser cierta, se
                        cambia el número, no el adjetivo. */}
                    <AnimatedSection animation="fade-in" delay={300}>
                        <dl className="mx-auto my-12 grid max-w-3xl grid-cols-3 divide-x divide-charcoal-900/10 border-y border-charcoal-900/10 py-8">
                            <div className="px-2 sm:px-6">
                                <dd className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal-900">32</dd>
                                <dt className="mt-1 text-xs sm:text-sm text-charcoal-600">entidades con su legislación</dt>
                            </div>
                            <div className="px-2 sm:px-6">
                                <dd className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal-900">2M+</dd>
                                <dt className="mt-1 text-xs sm:text-sm text-charcoal-600">fragmentos de leyes, jurisprudencia y sentencias</dt>
                            </div>
                            <div className="px-2 sm:px-6">
                                <dd className="font-serif text-3xl sm:text-4xl font-semibold text-accent-gold">97%</dd>
                                <dt className="mt-1 text-xs sm:text-sm text-charcoal-600">de citas con documento oficial</dt>
                            </div>
                        </dl>
                    </AnimatedSection>

                    {/* Dos públicos, dos tarjetas. Sin badges numerados, sin
                        rebotes ni iconos que giran: el hover sólo cambia el
                        borde. La lista de la primera absorbe el grid de
                        features que vivía más abajo. */}
                    <div className="grid gap-5 text-left md:grid-cols-2">
                        <AnimatedSection animation="slide-up" delay={400}>
                            <div className="h-full rounded-xl bg-charcoal-900 p-8 text-white border border-transparent transition-colors duration-300 hover:border-accent-gold/40">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-gold mb-3">
                                    Para profesionales del derecho
                                </p>
                                <h3 className="font-serif text-2xl font-semibold mb-3">
                                    Investiga, analiza y redacta con fundamento
                                </h3>
                                <p className="text-white/60 leading-relaxed mb-6 text-[0.9375rem]">
                                    IA que reduce horas de trabajo sin comprometer el rigor:
                                    cada respuesta cita el artículo exacto y enlaza su
                                    documento oficial.
                                </p>
                                <ul className="space-y-2.5 text-sm text-white/70">
                                    {[
                                        'Búsqueda híbrida en legislación verificada de las 32 entidades',
                                        'Filtros jurisdiccionales estrictos: tu estado, nunca otro',
                                        'Análisis de demandas y sentencias',
                                        'Redacción de escritos con argumentos fundamentados',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-2.5">
                                            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimatedSection>

                        <AnimatedSection animation="slide-up" delay={500}>
                            <div className="h-full rounded-xl bg-white p-8 border border-cream-400 transition-colors duration-300 hover:border-accent-gold/50">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-brown mb-3">
                                    Para ciudadanos
                                </p>
                                <h3 className="font-serif text-2xl font-semibold text-charcoal-900 mb-3">
                                    Claridad y el siguiente paso correcto
                                </h3>
                                <p className="text-charcoal-600 leading-relaxed mb-6 text-[0.9375rem]">
                                    Orientación con información confiable para personas sin
                                    formación jurídica — y conexión con profesionales cuando
                                    el caso lo pide.
                                </p>
                                <ul className="space-y-2.5 text-sm text-charcoal-600">
                                    {[
                                        'Consultas en lenguaje natural',
                                        'Orientación paso a paso',
                                        'Conexión con abogados verificados',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-2.5">
                                            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimatedSection>
                    </div>

                    {/* Tagline */}
                    <AnimatedSection animation="fade-in" delay={600}>
                        <p className="text-center text-lg font-medium text-charcoal-700 mt-10 px-4">
                            Haciendo el conocimiento legal mexicano <span className="text-accent-gold">accesible</span>, <span className="text-accent-gold">confiable</span> y <span className="text-accent-gold">utilizable</span>.
                        </p>
                    </AnimatedSection>
                </div>
            </section>

            {/* Chat Input Demo Section */}
            <section className="py-4 px-4">
                <AnimatedSection animation="fade-in" delay={700}>
                    <div className="max-w-3xl mx-auto">
                        <HeroCTA />
                    </div>
                </AnimatedSection>
            </section>

            {/* El vídeo demo se mudó a /plataforma (3-ago-2026) y el grid de
                features se fundió con las tarjetas de arriba: repetía el mismo
                contenido con otro estilo. */}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* COMPARATIVA: ¿POR QUÉ IUREXIA Y NO CHATGPT? */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="py-16 sm:py-20 bg-cream-300">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <AnimatedSection animation="slide-up">
                        <div className="text-center mb-4">
                            <span className="inline-flex items-center rounded-lg border border-charcoal-900/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-600 mb-6">
                                Comparativa
                            </span>
                        </div>
                        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-center text-charcoal-900 mb-4">
                            ¿Por qué <span className="text-charcoal-800">no</span> usar ChatGPT para derecho mexicano?
                        </h2>
                    </AnimatedSection>
                    <AnimatedSection animation="fade-in" delay={100}>
                        <p className="text-center text-charcoal-600 mb-12 max-w-3xl mx-auto text-base sm:text-lg">
                            ChatGPT es una herramienta general increíble, pero <strong className="text-charcoal-900">no fue diseñada para el sistema jurídico mexicano</strong>. Aquí está la diferencia:
                        </p>
                    </AnimatedSection>

                    <AnimatedSection animation="slide-up" delay={200}>
                        <div className="overflow-hidden rounded-xl border border-charcoal-900/12">
                            <div className="overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-charcoal-900 text-white">
                                                <th className="text-left py-5 px-5 font-semibold w-[35%]">Capacidad</th>
                                                <th className="text-center py-5 px-4 w-[32.5%]">
                                                    <span className="inline-flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight text-white">
                                                        <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                                                        </svg>
                                                        <span>ChatGPT</span>
                                                    </span>
                                                </th>
                                                <th className="text-center py-5 px-4 w-[32.5%] bg-accent-gold/20">
                                                    <span className="text-xl sm:text-2xl font-bold tracking-tight">
                                                        <span className="text-white">Iurex</span><span className="text-accent-gold">ia</span>
                                                    </span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <ComparisonChatRow
                                                feature="Jurisprudencia mexicana real y verificada"
                                                chatgpt="Inventa tesis y registros que no existen"
                                                iurexia="Base de datos verificada con 50,000+ fuentes reales"
                                            />
                                            <ComparisonChatRow
                                                feature="Cita artículos exactos de leyes vigentes"
                                                chatgpt="Cita artículos incorrectos o derogados"
                                                iurexia="Artículos textuales de códigos y leyes actualizadas"
                                            />
                                            <ComparisonChatRow
                                                feature="Filtro por estado y fuero"
                                                chatgpt="Mezcla leyes de diferentes estados"
                                                iurexia="Seguridad jurisdiccional: solo legislación de tu estado"
                                            />
                                            <ComparisonChatRow
                                                feature="Redacción de escritos con fundamento"
                                                chatgpt="Redacta sin fundamento legal real"
                                                iurexia="Escritos con artículos y tesis verificadas"
                                            />
                                            <ComparisonChatRow
                                                feature="Análisis de sentencias y demandas"
                                                chatgpt="Análisis genérico sin contexto legal mexicano"
                                                iurexia="Auditoría con fortalezas, debilidades y mejoras"
                                            />
                                            <ComparisonChatRow
                                                feature="Genios especializados por materia"
                                                chatgpt="No tiene"
                                                iurexia="Expertos en Amparo, CIDH, Civil, Penal, etc."
                                            />
                                            <ComparisonChatRow
                                                feature="Precio"
                                                chatgpt="~$400 MXN/mes (Plus)"
                                                iurexia="Desde $79 MXN/mes con todo incluido"
                                                isLast
                                            />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection animation="fade-in" delay={300}>
                        <div className="mt-8 text-center">
                            <p className="text-charcoal-500 text-sm mb-4">
                                En derecho, un artículo incorrecto puede llevar a perder un caso. <strong className="text-charcoal-900">No arriesgues tu práctica con herramientas genéricas.</strong>
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-white font-semibold rounded-lg hover:bg-charcoal-800 transition-all shadow-lg hover:shadow-xl"
                            >
                                Probar Iurexia Gratis →
                            </Link>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TESTIMONIO — DANIEL VECKER */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="py-16 sm:py-20 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <AnimatedSection animation="slide-up">
                        <div className="text-center mb-12">
                            <span className="inline-flex items-center rounded-lg border border-charcoal-900/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-600 mb-4">
                                Testimonios
                            </span>
                            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-charcoal-900">
                                Lo que dicen <span className="text-accent-gold">nuestros usuarios</span>
                            </h2>
                        </div>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Testimonial 1: Daniel Vecker */}
                        <AnimatedSection animation="slide-up" delay={100}>
                            <div className="relative rounded-xl border border-cream-400 bg-white p-6 sm:p-7 h-full flex flex-col">
                                <blockquote className="font-serif text-[17px] sm:text-lg text-charcoal-900 leading-[1.6] mb-6 flex-grow">
                                    &ldquo;Antes de Iurexia, pasaba horas buscando tesis en bases de datos obsoletas. La primera vez que activé un Genio de Amparo y me citó el artículo exacto con la tesis aplicable en segundos, supe que mi forma de litigar había cambiado para siempre. Es como tener un asociado senior disponible las 24 horas.&rdquo;
                                </blockquote>
                                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-cream-300">
                                    <div className="w-11 h-11 rounded-full bg-charcoal-900 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-serif text-sm font-bold">DV</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-charcoal-900 text-sm">Lic. Daniel Vecker</p>
                                        <p className="text-charcoal-500 text-xs">Abogado Litigante</p>
                                    </div>
                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-medium">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                        Pro
                                    </span>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Testimonial 2: Ulises Alegando */}
                        <AnimatedSection animation="slide-up" delay={200}>
                            <div className="relative rounded-xl border border-cream-400 bg-white p-6 sm:p-7 h-full flex flex-col">
                                <blockquote className="font-serif text-[17px] sm:text-lg text-charcoal-900 leading-[1.6] mb-6 flex-grow">
                                    &ldquo;En un amparo contra una autoridad fiscal, necesitaba jurisprudencia de la Décima Época sobre competencia territorial. Iurexia me encontró tres tesis aplicables que ni mi equipo había localizado en dos días de búsqueda manual. Ganamos el caso. Esa sola consulta pagó un año de suscripción.&rdquo;
                                </blockquote>
                                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-cream-300">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-gold to-accent-brown flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-serif text-sm font-bold">UA</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-charcoal-900 text-sm">Lic. Ulises Alejandro</p>
                                        <p className="text-charcoal-500 text-xs">Abogado Litigante</p>
                                    </div>
                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-medium">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                        Pro
                                    </span>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Testimonial 3: Jorge Adrián Morales */}
                        <AnimatedSection animation="slide-up" delay={300}>
                            <div className="relative rounded-xl border border-cream-400 bg-white p-6 sm:p-7 h-full flex flex-col">
                                <blockquote className="font-serif text-[17px] sm:text-lg text-charcoal-900 leading-[1.6] mb-6 flex-grow">
                                    &ldquo;Lo que más me impresionó fue la precisión del filtro jurisdiccional. Trabajo en materia penal en Querétaro y cada respuesta viene fundamentada con legislación de mi estado, no con artículos de otros códigos. Esa seguridad jurídica no la encuentras en ninguna otra herramienta de IA. Iurexia es el futuro de la abogacía en México.&rdquo;
                                </blockquote>
                                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-cream-300">
                                    <div className="w-11 h-11 rounded-full bg-charcoal-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-serif text-sm font-bold">JM</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-charcoal-900 text-sm">Lic. Jorge Adrián Morales</p>
                                        <p className="text-charcoal-500 text-xs">Abogado Penalista</p>
                                    </div>
                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-medium">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                        Pro
                                    </span>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>
            <section className="relative py-16 sm:py-20 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-charcoal-900" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent rounded-full" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Content */}
                        <div>
                            <AnimatedSection animation="slide-up">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold tracking-widest uppercase mb-6">
                                    ✦ Exclusivo PRO
                                </span>
                            </AnimatedSection>

                            <AnimatedSection animation="slide-up" delay={100}>
                                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                    Arquitectura <span className="text-accent-gold">Multi-Genio</span>
                                </h2>
                            </AnimatedSection>

                            <AnimatedSection animation="fade-in" delay={200}>
                                <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                                    Tu copiloto de inteligencia artificial impulsado por <span className="text-accent-gold font-medium">expertos especializados por materia</span>. Nuestros Genios (Amparo, CIDH, Civil, Penal, etc.) analizan, razonan y generan argumentos jurídicos con fundamento verificado — en tiempo real mientras trabajas.
                                </p>
                                <p className="text-base text-gray-400 mb-8 leading-relaxed">
                                    Activa hasta <span className="text-white font-medium">dos Genios simultáneamente</span> en tu chat para analizar tu caso desde múltiples perspectivas legales. El modelo avanzado procesa el contexto complejo integrando legislación, jurisprudencia y tratados de tu jurisdicción.
                                </p>
                            </AnimatedSection>

                            <AnimatedSection animation="slide-up" delay={300}>
                                <ul className="space-y-3 mb-8">
                                    {['Razonamiento jurídico interdisciplinario de precisión', 'Uso simultáneo de hasta 2 expertos virtuales', 'Fundamentación automatizada con artículos y tesis verificadas', 'Análisis contextual especializado por materia y jurisdicción'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-accent-gold font-bold mt-0.5">—</span>
                                            <span className="text-gray-300 text-sm">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </AnimatedSection>

                            <AnimatedSection animation="fade-in" delay={400}>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link
                                        href="/precios"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-lg hover:bg-accent-gold/90 transition-all shadow-lg shadow-accent-gold/10 hover:shadow-accent-gold/20"
                                    >
                                        Desbloquear Genios PRO →
                                    </Link>
                                    <Link
                                        href="/plataforma"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-cream-400/20 text-cream-300 font-medium rounded-lg hover:bg-white/5 transition-all"
                                    >
                                        Conocer más
                                    </Link>
                                </div>
                            </AnimatedSection>
                        </div>

                        {/* Visual Card — Mock chat */}
                        <AnimatedSection animation="scale-in" delay={300}>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-br from-accent-gold/10 to-accent-brown/5 rounded-3xl blur-xl" />
                                <div className="relative bg-charcoal-800 rounded-3xl p-8 border border-white/10">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-accent-gold/20 flex flex-col items-center justify-center relative">
                                            <div className="flex gap-0.5">
                                                <span className="w-2 h-2 rounded-full bg-accent-gold"></span>
                                                <span className="w-2 h-2 rounded-full bg-accent-gold/50"></span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">Genios Especializados</p>
                                            <p className="text-accent-gold/70 text-xs">Amparo + CIDH Activos</p>
                                        </div>
                                        <span className="ml-auto px-2.5 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-bold tracking-wide">PRO</span>
                                    </div>

                                    {/* Chat bubbles.
                                        Los pasos del agente son los que el chat
                                        pinta de verdad; antes esta tarjeta sólo
                                        mostraba pregunta y respuesta y se perdía
                                        lo que distingue a Iurexia: que enseña por
                                        dónde pasó antes de responder. */}
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Tu consulta</p>
                                            <p className="text-white text-sm leading-relaxed">¿Cómo impugno una orden de aprehensión sin fundamentación considerando los criterios interamericanos?</p>
                                        </div>

                                        <ol className="space-y-1.5 px-1">
                                            {[
                                                'Entendiendo la consulta',
                                                'Revisando el bloque de constitucionalidad',
                                                'Buscando jurisprudencia y precedentes',
                                                'Con los genios de Amparo y CIDH',
                                                '18 fuentes encontradas',
                                            ].map((paso) => (
                                                <li key={paso} className="flex items-center gap-2">
                                                    <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-accent-gold/20">
                                                        <svg className="h-2 w-2 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">{paso}</span>
                                                </li>
                                            ))}
                                        </ol>

                                        <div className="p-3 rounded-xl bg-accent-gold/5 border border-accent-gold/10">
                                            <p className="text-gray-300 text-sm leading-relaxed">Vía amparo indirecto alegando violación al debido proceso. La Corte IDH en <i>Caso Cabrera García</i> establece que toda restricción a la libertad personal debe…</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="rounded-md border border-accent-gold/30 px-1.5 py-0.5 text-[10px] text-accent-gold/90">Artículo 107 · Ley de Amparo</span>
                                                <span className="rounded-md border border-accent-gold/30 px-1.5 py-0.5 text-[10px] text-accent-gold/90">Corte IDH · Cabrera García</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Free user notice */}
                                    <div className="mt-6 p-3 rounded-xl bg-charcoal-900/60 border border-white/5 text-center">
                                        <p className="text-gray-500 text-xs">Los usuarios gratuitos no tienen acceso a Genios Especializados. <span className="text-accent-gold font-medium">Actualiza a PRO</span> para desbloquear.</p>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ── Iurexia Connect ──
                Adelgazado el 3-ago-2026: ocupaba 175 líneas —más que ninguna
                otra sección— sin ser el producto principal. Queda lo que hay
                que saber y una puerta; el detalle vive en /connect. */}
            <section className="border-t border-charcoal-900/[0.07] bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                    <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
                        <AnimatedSection animation="slide-up">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent-brown">
                                Iurexia Connect
                            </p>
                            <h2 className="mb-4 font-serif text-2xl font-semibold leading-tight text-charcoal-900 sm:text-3xl md:text-4xl">
                                Cuando el caso necesita <span className="text-accent-gold">un abogado</span>,
                                no sólo una respuesta
                            </h2>
                            <p className="max-w-xl text-[0.9375rem] leading-relaxed text-charcoal-600 sm:text-base">
                                La orientación con IA resuelve la duda; hay asuntos que además
                                necesitan quien los lleve. Connect une las dos cosas en un mismo
                                lugar: quien consulta encuentra un abogado con cédula verificada,
                                y quien ejerce recibe asuntos que ya llegan con el problema
                                planteado.
                            </p>
                        </AnimatedSection>

                        <AnimatedSection animation="fade-in" delay={150}>
                            <div className="flex flex-col gap-2.5 md:w-56">
                                <Link
                                    href="/connect"
                                    className="inline-flex h-11 items-center justify-center rounded-lg bg-charcoal-900 px-5 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800"
                                >
                                    Conocer Connect
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex h-11 items-center justify-center rounded-lg border border-charcoal-900/15 px-5 text-[0.9375rem] font-medium text-charcoal-800 transition-colors hover:border-charcoal-900/30 hover:bg-charcoal-900/[0.03]"
                                >
                                    Registrarme como abogado
                                </Link>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-charcoal-900 text-white">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                        Comienza hoy con <span className="text-accent-gold">Iurexia</span>
                    </h2>
                    <p className="text-lg text-gray-300 mb-8">
                        Únete a los profesionales del derecho que ya utilizan IA especializada.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-charcoal-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Probar Gratis
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
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

function QuickAccessChip({ icon, label }: { icon: string; label: string }) {
    return (
        <Link
            href="/login"
            className="chip hover:bg-charcoal-900 hover:text-white hover:border-charcoal-900 transition-all"
        >
            <span>{icon}</span>
            <span>{label}</span>
        </Link>
    );
}

function ConnectFeature({
    icon,
    title,
    description
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <li className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center mt-0.5">
                {icon}
            </div>
            <div>
                <h4 className="font-medium text-charcoal-900 mb-1">{title}</h4>
                <p className="text-sm text-charcoal-600 leading-relaxed">{description}</p>
            </div>
        </li>
    );
}

function ConnectFeatureDark({
    icon,
    title,
    description
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <li className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mt-0.5">
                {icon}
            </div>
            <div>
                <h4 className="font-medium text-white mb-1">{title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
            </div>
        </li>
    );
}

function ConnectStep({
    number,
    title,
    description
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <div className="relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-cream-400 shadow-sm flex items-center justify-center mx-auto mb-4">
                <span className="font-serif text-2xl font-bold text-accent-gold">{number}</span>
            </div>
            <h4 className="font-serif text-lg font-medium text-charcoal-900 mb-2">{title}</h4>
            <p className="text-sm text-charcoal-600 leading-relaxed">{description}</p>
        </div>
    );
}

function ComparisonChatRow({
    feature,
    chatgpt,
    iurexia,
    isLast = false
}: {
    feature: string;
    chatgpt: string;
    iurexia: string;
    isLast?: boolean;
}) {
    return (
        /* El texto va en carbón en las dos columnas; el color lo lleva sólo el
           icono. Antes la columna de Iurexia iba entera en dorado y a ese
           tamaño costaba leerla. */
        <tr className={!isLast ? 'border-b border-charcoal-900/[0.06]' : ''}>
            <td className="py-3.5 px-5 text-sm font-medium text-charcoal-900">{feature}</td>
            <td className="py-3.5 px-4 text-center text-sm text-charcoal-500">
                <span className="inline-flex items-start justify-center gap-1.5 text-left">
                    <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    <span>{chatgpt}</span>
                </span>
            </td>
            <td className="bg-accent-gold/[0.06] py-3.5 px-4 text-center text-sm text-charcoal-800">
                <span className="inline-flex items-start justify-center gap-1.5 text-left">
                    <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span>{iurexia}</span>
                </span>
            </td>
        </tr>
    );
}
