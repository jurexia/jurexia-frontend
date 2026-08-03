'use client';

import Navbar from '@/components/Navbar';
import HeroVideo from '@/components/HeroVideo';
import ChatInput from '@/components/ChatInput';
import Link from 'next/link';
import { HeroCTA } from '@/components/HeroCTA';
import HomeDemo from '@/components/HomeDemo';
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

            <section className="pt-14 sm:pt-20 pb-12 sm:pb-20 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Promotional Video */}
                    <AnimatedSection animation="fade-in" delay={200}>
                        <div className="mb-8 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl max-w-2xl mx-auto aspect-video">
                            <video
                                controls
                                playsInline
                                className="w-full h-full object-cover"
                                poster="/video-poster.jpg"
                            >
                                <source src="/iurexia-front-final.mp4" type="video/mp4" />
                            </video>
                        </div>
                    </AnimatedSection>

                    {/* El titular se mudó al hero; aquí sólo queda el remate
                        que enlaza el vídeo de presentación con las tarjetas. */}
                    <AnimatedSection animation="slide-up" delay={300}>
                        <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900 leading-tight mb-12 px-2">
                            La inteligencia artificial <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">más precisa</span> para el sistema jurídico Mexicano
                        </p>
                    </AnimatedSection>

                    {/* Two Main Objectives - Visual Cards */}
                    <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto px-4">
                        {/* Objective 1: For Legal Professionals */}
                        <AnimatedSection animation="slide-up" delay={400}>
                            <div className="group relative bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900 rounded-2xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                {/* Animated gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className="w-14 h-14 rounded-xl bg-accent-gold/20 flex items-center justify-center mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <svg className="w-7 h-7 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>

                                    {/* Number badge */}
                                    <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-accent-gold flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                                        <span className="font-serif text-xl font-bold text-charcoal-900">1</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-serif text-2xl font-bold mb-3 group-hover:text-accent-gold transition-colors duration-300">
                                        Para Profesionales del Derecho
                                    </h3>

                                    {/* Description */}
                                    <p className="text-gray-300 leading-relaxed mb-4">
                                        Apoyar a profesionales con <span className="text-accent-gold font-medium">investigación jurídica</span>, <span className="text-accent-gold font-medium">análisis de documentos</span> y <span className="text-accent-gold font-medium">generación de escritos legales</span>, todo mediante IA que reduce tiempos sin comprometer rigor jurídico.
                                    </p>

                                    {/* Features list */}
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2 text-sm text-gray-400">
                                            <svg className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="group-hover:text-gray-300 transition-colors">Búsqueda híbrida en legislación verificada</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-gray-400">
                                            <svg className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="group-hover:text-gray-300 transition-colors">Análisis de demandas y sentencias</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-gray-400">
                                            <svg className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="group-hover:text-gray-300 transition-colors">Generación de argumentos fundamentados</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Decorative element */}
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-accent-gold/10 blur-2xl transform group-hover:scale-150 transition-transform duration-700"></div>
                            </div>
                        </AnimatedSection>

                        {/* Objective 2: For Citizens */}
                        <AnimatedSection animation="slide-up" delay={500}>
                            <div className="group relative bg-gradient-to-br from-cream-200 via-cream-100 to-white rounded-2xl p-8 border border-cream-300 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                {/* Animated gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-brown/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className="w-14 h-14 rounded-xl bg-accent-brown/10 flex items-center justify-center mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <svg className="w-7 h-7 text-accent-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>

                                    {/* Number badge */}
                                    <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-accent-brown flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                                        <span className="font-serif text-xl font-bold text-white">2</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-serif text-2xl font-bold mb-3 text-charcoal-900 group-hover:text-accent-brown transition-colors duration-300">
                                        Para Ciudadanos
                                    </h3>

                                    {/* Description */}
                                    <p className="text-charcoal-600 leading-relaxed mb-4">
                                        Orientar a personas <span className="text-accent-brown font-medium">sin formación jurídica</span> hacia la claridad y el siguiente paso correcto para resolver su problema legal con <span className="text-accent-brown font-medium">información confiable</span> y <span className="text-accent-brown font-medium">conexión con profesionales</span>.
                                    </p>

                                    {/* Features list */}
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2 text-sm text-charcoal-500">
                                            <svg className="w-5 h-5 text-accent-brown flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="group-hover:text-charcoal-600 transition-colors">Consultas en lenguaje natural</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-charcoal-500">
                                            <svg className="w-5 h-5 text-accent-brown flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="group-hover:text-charcoal-600 transition-colors">Orientación paso a paso</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-charcoal-500">
                                            <svg className="w-5 h-5 text-accent-brown flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="group-hover:text-charcoal-600 transition-colors">Conexión con abogados verificados</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Decorative element */}
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-accent-brown/10 blur-2xl transform group-hover:scale-150 transition-transform duration-700"></div>
                            </div>
                        </AnimatedSection>
                    </div>

                    {/* Tagline */}
                    <AnimatedSection animation="fade-in" delay={600}>
                        <p className="text-center text-lg font-medium text-charcoal-700 mt-8 px-4">
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

            {/* Demo Video Section */}
            <section className="py-12 sm:py-16 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <AnimatedSection animation="slide-up">
                        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-center text-charcoal-900 mb-3 sm:mb-4">
                            Mira cómo <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">funciona</span>
                        </h2>
                    </AnimatedSection>
                    <AnimatedSection animation="fade-in" delay={100}>
                        <p className="text-center text-base sm:text-lg text-charcoal-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
                            Desde la selección de jurisdicción hasta consultar documentos fuente, todo en segundos.
                        </p>
                    </AnimatedSection>
                    <AnimatedSection animation="fade-in" delay={200}>
                        <HomeDemo />
                    </AnimatedSection>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-12 sm:py-16 md:py-20 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <AnimatedSection animation="slide-up">
                        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-center text-charcoal-900 mb-10 sm:mb-12 md:mb-16">
                            Potencia tu <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">práctica legal</span>
                        </h2>
                    </AnimatedSection>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        <AnimatedSection animation="slide-up" delay={100}>
                            <FeatureCard
                                icon="🔍"
                                title="Búsqueda Híbrida"
                                description="Combina búsqueda semántica con palabras clave exactas (BM25) para encontrar jurisprudencia y normativa con precisión milimétrica."
                            />
                        </AnimatedSection>
                        <AnimatedSection animation="slide-up" delay={200}>
                            <FeatureCard
                                icon="🛡️"
                                title="Agente de Análisis"
                                description="Analiza demandas y sentencias automáticamente. Identifica fortalezas, debilidades y sugiere mejoras con fundamento legal."
                            />
                        </AnimatedSection>
                        <AnimatedSection animation="slide-up" delay={300}>
                            <FeatureCard
                                icon="📍"
                                title="Filtros Jurisdiccionales"
                                description="Garantiza seguridad jurídica. Si seleccionas Nuevo León, nunca verás resultados de otros estados (salvo federal)."
                            />
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* COMPARATIVA: ¿POR QUÉ IUREXIA Y NO CHATGPT? */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="py-16 sm:py-20 bg-cream-300">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <AnimatedSection animation="slide-up">
                        <div className="text-center mb-4">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold tracking-widest uppercase mb-6">
                                ⚠️ Dato importante
                            </span>
                        </div>
                        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-center text-charcoal-900 mb-4">
                            ¿Por qué <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">no</span> usar ChatGPT para derecho mexicano?
                        </h2>
                    </AnimatedSection>
                    <AnimatedSection animation="fade-in" delay={100}>
                        <p className="text-center text-charcoal-600 mb-12 max-w-3xl mx-auto text-base sm:text-lg">
                            ChatGPT es una herramienta general increíble, pero <strong className="text-charcoal-900">no fue diseñada para el sistema jurídico mexicano</strong>. Aquí está la diferencia:
                        </p>
                    </AnimatedSection>

                    <AnimatedSection animation="slide-up" delay={200}>
                        <div className="rounded-3xl border-2 border-charcoal-900 shadow-2xl overflow-hidden bg-charcoal-900 p-1">
                            <div className="rounded-2xl overflow-hidden bg-white">
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
                                                iurexia="Desde $129 MXN/mes con todo incluido"
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
                                className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-white font-semibold rounded-full hover:bg-charcoal-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold tracking-widest uppercase mb-4">
                                ★ Testimonios reales
                            </span>
                            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-charcoal-900">
                                Lo que dicen <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">nuestros usuarios</span>
                            </h2>
                        </div>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Testimonial 1: Daniel Vecker */}
                        <AnimatedSection animation="slide-up" delay={100}>
                            <div className="relative bg-gradient-to-br from-cream-100 via-cream-50 to-white rounded-3xl border border-cream-400 p-6 sm:p-8 shadow-sm h-full flex flex-col">
                                <div className="absolute -top-3 -left-1 text-accent-gold/15 font-serif text-[80px] leading-none select-none pointer-events-none">&ldquo;</div>
                                <div className="flex gap-0.5 mb-4">
                                    {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 text-accent-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                                </div>
                                <blockquote className="font-serif text-base sm:text-lg text-charcoal-900 leading-relaxed mb-6 italic flex-grow">
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
                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-medium">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                        Pro
                                    </span>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Testimonial 2: Ulises Alegando */}
                        <AnimatedSection animation="slide-up" delay={200}>
                            <div className="relative bg-gradient-to-br from-cream-100 via-cream-50 to-white rounded-3xl border border-cream-400 p-6 sm:p-8 shadow-sm h-full flex flex-col">
                                <div className="absolute -top-3 -left-1 text-accent-gold/15 font-serif text-[80px] leading-none select-none pointer-events-none">&ldquo;</div>
                                <div className="flex gap-0.5 mb-4">
                                    {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 text-accent-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                                </div>
                                <blockquote className="font-serif text-base sm:text-lg text-charcoal-900 leading-relaxed mb-6 italic flex-grow">
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
                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-medium">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                        Pro
                                    </span>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Testimonial 3: Jorge Adrián Morales */}
                        <AnimatedSection animation="slide-up" delay={300}>
                            <div className="relative bg-gradient-to-br from-cream-100 via-cream-50 to-white rounded-3xl border border-cream-400 p-6 sm:p-8 shadow-sm h-full flex flex-col">
                                <div className="absolute -top-3 -left-1 text-accent-gold/15 font-serif text-[80px] leading-none select-none pointer-events-none">&ldquo;</div>
                                <div className="flex gap-0.5 mb-4">
                                    {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 text-accent-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                                </div>
                                <blockquote className="font-serif text-base sm:text-lg text-charcoal-900 leading-relaxed mb-6 italic flex-grow">
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
                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-medium">
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
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold tracking-widest uppercase mb-6">
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
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-full hover:bg-accent-gold/90 transition-all shadow-lg shadow-accent-gold/10 hover:shadow-accent-gold/20"
                                    >
                                        Desbloquear Genios PRO →
                                    </Link>
                                    <Link
                                        href="/plataforma"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-cream-400/20 text-cream-300 font-medium rounded-full hover:bg-white/5 transition-all"
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
                                                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">Genios Especializados</p>
                                            <p className="text-accent-gold/70 text-xs">Amparo + CIDH Activos</p>
                                        </div>
                                        <span className="ml-auto px-2.5 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-bold tracking-wide">PRO</span>
                                    </div>

                                    {/* Chat bubbles */}
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Tu consulta</p>
                                            <p className="text-white text-sm leading-relaxed">¿Cómo impugno una orden de aprehensión sin fundamentación considerando los criterios interamericanos?</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-accent-gold/5 border border-accent-gold/10">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-accent-gold text-[10px] uppercase tracking-wider">Perspectiva Combinada</p>
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed">Vía amparo indirecto (Art. 107 L.A.) alegando violación al debido proceso. La Corte IDH en <i>Caso Cabrera García</i> establece que toda restricción a la libertad personal debe...</p>
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

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* IUREXIA CONNECT — ECOSISTEMA LEGAL INTELIGENTE */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-b from-white via-cream-50 to-cream-200" />

                {/* Decorative gold accent line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent rounded-full" />

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
                    {/* Section Header */}
                    <div className="text-center mb-6 sm:mb-8">
                        <AnimatedSection animation="scale-in">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-charcoal-900 text-white text-xs font-medium tracking-widest uppercase mb-6">
                                <span className="w-2 h-2 bg-accent-gold rounded-full animate-pulse-subtle" />
                                Nuevo
                            </span>
                        </AnimatedSection>
                        <AnimatedSection animation="slide-up" delay={100}>
                            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-charcoal-900 mb-4 px-2">
                                Iurexia <span className="text-accent-gold">Connect</span>
                            </h2>
                        </AnimatedSection>
                        <AnimatedSection animation="fade-in" delay={200}>
                            <p className="text-base sm:text-lg md:text-xl text-charcoal-700 max-w-3xl mx-auto leading-relaxed px-2">
                                El primer ecosistema legal en México que une inteligencia artificial de precisión
                                con abogados certificados. <span className="font-medium text-charcoal-900">Una solución que nadie más ofrece.</span>
                            </p>
                        </AnimatedSection>
                    </div>

                    {/* Unique Value Proposition Badge */}
                    <AnimatedSection animation="scale-in" delay={300}>
                        <div className="flex justify-center mb-12 sm:mb-16">
                            <div className="relative inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-white border border-cream-400 shadow-sm">
                                <div className="flex -space-x-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-accent-gold to-accent-brown flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">IA</div>
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-charcoal-900 flex items-center justify-center text-white text-xs ring-2 ring-white">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                </div>
                                <span className="text-xs sm:text-sm text-charcoal-700">
                                    <span className="font-semibold text-charcoal-900">Orientación con IA</span> + <span className="font-semibold text-charcoal-900">Abogado real</span> en un solo lugar
                                </span>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Dual Audience Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 sm:mb-20">

                        {/* Card: Para Usuarios */}
                        <AnimatedSection animation="slide-in-left" delay={100}>
                            <div className="group relative rounded-3xl bg-white border border-cream-400 p-8 md:p-10 hover:shadow-xl transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-gold via-accent-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-cream-200 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-xl md:text-2xl font-medium text-charcoal-900">
                                            ¿Necesitas orientación legal?
                                        </h3>
                                        <p className="text-sm text-charcoal-600">Para ciudadanos y empresas</p>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    <ConnectFeature
                                        icon={<svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                                        title="Consulta con IA especializada"
                                        description="Obtén respuestas precisas basadas en legislación real de tu estado — no respuestas genéricas de internet."
                                    />
                                    <ConnectFeature
                                        icon={<svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                                        title="Conecta con abogados verificados"
                                        description="La IA analiza tu caso y te conecta con profesionales certificados que se especializan en tu materia y jurisdicción."
                                    />
                                    <ConnectFeature
                                        icon={<svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                        title="Expediente preliminar automático"
                                        description="Tu consulta se convierte en un expediente IA que el abogado recibe con contexto legal completo — ahorra tiempo y dinero."
                                    />
                                </ul>

                                <Link href="/login" className="inline-flex items-center gap-2 text-accent-gold font-medium hover:gap-3 transition-all duration-300 group/link">
                                    Buscar orientación
                                    <svg className="w-4 h-4 transition-transform group-hover/link:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </Link>
                            </div>
                        </AnimatedSection>

                        {/* Card: Para Abogados */}
                        <AnimatedSection animation="slide-in-right" delay={200}>
                            <div className="group relative rounded-3xl bg-charcoal-900 text-white p-8 md:p-10 hover:shadow-xl transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-gold via-accent-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent-gold/5 to-transparent rounded-full -translate-y-32 translate-x-32" />

                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-xl md:text-2xl font-medium">
                                                ¿Eres profesional del derecho?
                                            </h3>
                                            <p className="text-sm text-gray-400">Para abogados y despachos</p>
                                        </div>
                                    </div>

                                    <ul className="space-y-4 mb-8">
                                        <ConnectFeatureDark
                                            icon={<svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                            title="IA que potencia tu trabajo"
                                            description="Investiga jurisprudencia, analiza demandas, redacta escritos — todo con fundamento legal verificado de tu jurisdicción."
                                        />
                                        <ConnectFeatureDark
                                            icon={<svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                            title="Capta clientes por el ecosistema"
                                            description="Usuarios que ya entendieron su situación legal con la IA llegan a ti con contexto — clientes informados y listos para actuar."
                                        />
                                        <ConnectFeatureDark
                                            icon={<svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
                                            title="Perfil verificado con cédula profesional"
                                            description="Validamos tu cédula en tiempo real con el Registro Nacional de Profesionistas. Genera confianza desde el primer contacto."
                                        />
                                    </ul>

                                    <Link href="/precios" className="inline-flex flex-col items-center gap-1 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-full hover:bg-accent-gold/90 transition-all duration-300 hover:shadow-lg hover:shadow-accent-gold/20">
                                        <span className="flex items-center gap-2">
                                            Registrar mi perfil
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </span>
                                        <span className="text-xs font-normal text-charcoal-700">(Disponible para usuarios Pro en adelante)</span>
                                    </Link>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>

                    {/* Workflow: How Connect Works */}
                    <div className="max-w-4xl mx-auto">
                        <h3 className="font-serif text-2xl md:text-3xl font-medium text-center text-charcoal-900 mb-12">
                            ¿Cómo <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">funciona</span>?
                        </h3>

                        <div className="grid md:grid-cols-3 gap-8 relative">
                            {/* Connecting line (desktop) */}
                            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-cream-400 via-accent-gold/40 to-cream-400" />

                            <ConnectStep
                                number="1"
                                title="Consulta a la IA"
                                description="Haz tu pregunta legal. Iurexia busca en miles de leyes, jurisprudencia y tesis de tu estado."
                            />
                            <ConnectStep
                                number="2"
                                title="Recibe orientación verificada"
                                description="Obtén respuestas con artículos exactos, tesis aplicables y fundamento legal real — no alucinaciones."
                            />
                            <ConnectStep
                                number="3"
                                title="Conecta con un abogado"
                                description="Si necesitas representación, la IA te conecta con profesionales certificados de tu materia y jurisdicción."
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-charcoal-900 text-white">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                        Comienza hoy con <span className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent">Iurexia</span>
                    </h2>
                    <p className="text-lg text-gray-300 mb-8">
                        Únete a los profesionales del derecho que ya utilizan IA especializada.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-charcoal-900 font-medium rounded-full hover:bg-gray-100 transition-colors"
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

function FeatureCard({
    icon,
    title,
    description
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="p-6 rounded-2xl bg-cream-300 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-4">{icon}</div>
            <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-3">{title}</h3>
            <p className="text-charcoal-600 leading-relaxed">{description}</p>
        </div>
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
        <tr className={!isLast ? 'border-b border-gray-100' : ''}>
            <td className="py-4 px-5 font-medium text-charcoal-900 text-sm">{feature}</td>
            <td className="py-4 px-4 text-center text-red-500 text-sm">
                <span className="inline-flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    <span>{chatgpt}</span>
                </span>
            </td>
            <td className="py-4 px-4 text-center text-green-700 font-semibold text-sm bg-green-50/50">
                <span className="inline-flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span>{iurexia}</span>
                </span>
            </td>
        </tr>
    );
}
