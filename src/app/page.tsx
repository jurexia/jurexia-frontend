'use client';

import Navbar from '@/components/Navbar';
import { Suspense } from 'react';
import HeroVideo from '@/components/HeroVideo';
import DespachosVitrina from '@/components/DespachosVitrina';
import VideoChat from '@/components/VideoChat';
import DemoEnVivo from '@/components/DemoEnVivo';
import ChatInput from '@/components/ChatInput';
import Link from 'next/link';
import { HeroCTA } from '@/components/HeroCTA';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { AnimatedSection } from '@/components/AnimatedSection';
import BotonProbar from '@/components/BotonProbar';

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

            {/* La pieza del chat (v43), bajo la portada y sobre la vitrina.
                David, 15-sep-2026: «al igual que Harvey, el vídeo se
                reproduce pero no se escucha hasta que el usuario haga clic». */}
            <VideoChat />

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
                                                feature="Flujos de trabajo"
                                                chatgpt="No tiene"
                                                iurexia="Demandas y escritos completos, parte por parte"
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
                                    ✦ Pro y Platinum
                                </span>
                            </AnimatedSection>

                            {/* FLUJOS DE TRABAJO (25-sep-2026): sustituye a la
                                «Arquitectura Multi-Genio». Los Genios se retiraron
                                del producto; lo que esta sección vende ahora es lo
                                que el chat hace de verdad: un escrito completo,
                                parte por parte. */}
                            <AnimatedSection animation="slide-up" delay={100}>
                                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                    Flujos de <span className="text-accent-gold">trabajo</span>
                                </h2>
                            </AnimatedSection>

                            <AnimatedSection animation="fade-in" delay={200}>
                                <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                                    Del encargo al <span className="text-accent-gold font-medium">escrito terminado</span>. Iurexia construye contigo la demanda de amparo, la contestación, el escrito de agravios o la revisión del contrato, parte por parte y con todo el acervo a la vista.
                                </p>
                                <p className="text-base text-gray-400 mb-8 leading-relaxed">
                                    En cada parte propone lo que deduce de tu encargo y de tu carpeta —<span className="text-white font-medium">ya marcado, para que sólo confirmes</span>—, te pide lo que falta y, si hace falta un documento, te lo pide en vez de suponerlo. Lo que escribe cae en tu documento, con sus citas.
                                </p>
                            </AnimatedSection>

                            <AnimatedSection animation="slide-up" delay={300}>
                                <ul className="space-y-3 mb-8">
                                    {['Amparo indirecto y directo, contestación, agravios, contratos, teoría del caso y dictamen', 'Cada dato propuesto y marcado: tú sólo confirmas', 'Pide el documento que falta en vez de inventar el dato', 'Redacta con todo el acervo y con sus citas'].map((item, i) => (
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
                                        Ver planes con flujos →
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

                        {/* La tarjeta imita al agente real: partes del escrito,
                            su proceso, los datos ya marcados y el botón. */}
                        <AnimatedSection animation="scale-in" delay={300}>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-br from-accent-gold/10 to-accent-brown/5 rounded-3xl blur-xl" />
                                <div className="relative bg-charcoal-800 rounded-3xl p-6 sm:p-8 border border-white/10">
                                    {/* Cabecera: el escrito y sus partes */}
                                    <div className="mb-5 pb-4 border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-accent-gold/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                                                    <rect x="3" y="3" width="8" height="8" rx="2" />
                                                    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
                                                    <rect x="13" y="13" width="8" height="8" rx="2" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-medium text-sm">Demanda de amparo indirecto</p>
                                                <p className="text-accent-gold/70 text-xs">Parte 2 de 4 · Antecedentes y preceptos violados</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
                                            <span className="h-1.5 rounded-full bg-emerald-400/80" />
                                            <span className="h-1.5 rounded-full bg-accent-gold" />
                                            <span className="h-1.5 rounded-full bg-white/10" />
                                            <span className="h-1.5 rounded-full bg-white/10" />
                                        </div>
                                    </div>

                                    {/* El proceso */}
                                    <div className="rounded-xl bg-white/[0.04] px-3.5 py-3 mb-4">
                                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Proceso</p>
                                        <ul className="space-y-1">
                                            {[
                                                'Tomé del encargo el acto reclamado y la fecha del oficio',
                                                'De la carpeta: la sentencia que acredita el concubinato',
                                                'Falta la fecha de notificación para computar el plazo',
                                            ].map((l) => (
                                                <li key={l} className="flex items-start gap-2 text-[11.5px] leading-snug text-gray-400">
                                                    <span className="mt-[6px] h-1 w-1 flex-shrink-0 rounded-full bg-gray-500" />
                                                    {l}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Los datos, ya marcados */}
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-white text-xs font-semibold mb-1.5">Preceptos violados <span className="ml-1 rounded-full bg-accent-gold/15 px-1.5 py-px text-[9px] font-bold text-accent-gold">Sugerido</span></p>
                                            <div className="space-y-1">
                                                {[['Artículos 1o. y 4o. constitucionales', true], ['Artículo 123, apartado A, fracción XXIX', true], ['Artículo 24 de la Convención Americana', false]].map(([t, marcado]) => (
                                                    <div key={t as string} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11.5px] ${marcado ? 'border-accent-gold/60 bg-accent-gold/10 text-white' : 'border-white/10 text-gray-400'}`}>
                                                        <span className={`grid h-3 w-3 place-items-center rounded-[3px] border ${marcado ? 'border-accent-gold bg-accent-gold' : 'border-gray-500'}`}>
                                                            {marcado && <svg className="h-2 w-2 text-charcoal-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                                        </span>
                                                        {t as string}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-white text-xs font-semibold mb-1.5">Fecha de notificación <span className="ml-1 rounded-full bg-amber-400/15 px-1.5 py-px text-[9px] font-bold text-amber-300">Falta</span></p>
                                            <div className="h-8 rounded-lg border border-amber-300/40 bg-white/[0.02]" />
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-3">
                                        <span className="text-[11px] text-amber-300/80">Falta 1 dato</span>
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11.5px] font-semibold text-charcoal-900 opacity-60">
                                            Redactar esta parte →
                                        </span>
                                    </div>

                                    {/* Cupo */}
                                    <div className="mt-6 p-3 rounded-xl bg-charcoal-900/60 border border-white/5 text-center">
                                        <p className="text-gray-500 text-xs">30 flujos al mes en <span className="text-accent-gold font-medium">Pro</span> · 60 en <span className="text-accent-gold font-medium">Platinum</span>, sin gastar consultas.</p>
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
                    <BotonProbar
                        className="inline-flex items-center gap-2 px-8 py-4 bg-accent-gold text-charcoal-900 font-bold rounded-lg hover:opacity-90 transition-opacity"
                        sub="Sin correo, sin tarjeta. Entras y preguntas."
                    >
                        Probar sin registrarme
                    </BotonProbar>
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

            {/* ═══ EL PIE ═══
                Cuatro enlaces en una fila no dicen de qué es capaz Iurexia.
                Aquí se enseña el catálogo entero por columnas: cualquiera que
                llegue al final de la portada ve la plataforma completa y
                encuentra por dónde entrar. Sólo se enlaza a rutas que existen
                —se comprobó una por una—, porque un pie lleno de enlaces
                muertos es peor que un pie corto. */}
            <footer className="border-t border-black/5 bg-cream-300 pt-16 pb-10">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
                        <div className="max-w-xs">
                            <span className="font-serif text-2xl font-semibold tracking-wide">
                                Iurex<span className="text-accent-gold">ia</span>
                            </span>
                            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-brown">
                                Legal Tech
                            </div>
                            <p className="mt-4 text-[13.5px] leading-relaxed text-charcoal-600">
                                Inteligencia artificial jurídica para México. Legislación federal y de
                                las 32 entidades, jurisprudencia del Semanario y cada cita verificada
                                contra su fuente.
                            </p>
                            <div className="mt-5 flex items-center gap-2.5">
                                <a
                                    href="https://www.facebook.com/profile.php?id=61588222127518"
                                    target="_blank" rel="noopener noreferrer" aria-label="Iurexia en Facebook"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-charcoal-600 transition-colors hover:border-charcoal-900 hover:text-charcoal-900"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.instagram.com/iurex.ia"
                                    target="_blank" rel="noopener noreferrer" aria-label="Iurexia en Instagram"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-charcoal-600 transition-colors hover:border-charcoal-900 hover:text-charcoal-900"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                        <rect x="3" y="3" width="18" height="18" rx="5" />
                                        <circle cx="12" cy="12" r="3.6" />
                                        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                                    </svg>
                                </a>
                            </div>
                        </div>

                        <ColumnaPie
                            titulo="Plataforma"
                            enlaces={[
                                ['Consulta jurídica', '/chat'],
                                ['Redacción de escritos', '/plataforma'],
                                ['Taller de sentencias', '/redaccionsentencias'],
                                ['Agente de amparo', '/agente'],
                                ['Jurimetría y precedentes', '/soluciones'],
                                ['Normativa', '/normativa'],
                                ['Leyes estatales', '/leyesestatales'],
                                ['Lo último', '/ultimo'],
                            ]}
                        />
                        <ColumnaPie
                            titulo="Para quién"
                            enlaces={[
                                ['Abogados y despachos', '/soluciones'],
                                ['Secretarios del PJF', '/secretarios'],
                                ['Directorio Connect', '/connect'],
                                ['Vitrina de despachos', '/vitrina'],
                                ['Sálvame', '/salvame'],
                                ['Planes y precios', '/precios'],
                            ]}
                        />
                        <ColumnaPie
                            titulo="Iurexia"
                            enlaces={[
                                ['Conócenos', '/conocenos'],
                                ['Seguridad', '/seguridad'],
                                ['Aviso de privacidad', '/privacidad'],
                                ['Términos y condiciones', '/terminos'],
                                ['Crear cuenta', '/registro'],
                                ['Iniciar sesión', '/login'],
                                ['soporte@iurexia.com', 'mailto:soporte@iurexia.com'],
                            ]}
                        />
                    </div>

                    <div className="mt-12 flex flex-col gap-3 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[12.5px] text-charcoal-500">
                            © 2026 Iurexia. Todos los derechos reservados.
                        </p>
                        <p className="max-w-xl text-[12px] leading-relaxed text-charcoal-500">
                            Iurexia orienta y fortalece el análisis jurídico. No sustituye la asesoría
                            de un profesional del derecho ni constituye asesoría legal.
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

function ColumnaPie({ titulo, enlaces }: {
    titulo: string;
    enlaces: ReadonlyArray<readonly [string, string]>;
}) {
    return (
        <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">
                {titulo}
            </h3>
            <ul className="mt-4 space-y-2.5">
                {enlaces.map(([texto, href]) => (
                    <li key={href + texto}>
                        {href.startsWith('mailto:') ? (
                            <a href={href} className="text-[13.5px] text-charcoal-700 transition-colors hover:text-charcoal-900">
                                {texto}
                            </a>
                        ) : (
                            <Link href={href} className="text-[13.5px] text-charcoal-700 transition-colors hover:text-charcoal-900">
                                {texto}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
