'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Search, Shield, MapPin, CheckCircle, Zap, FileText, BookOpen, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function PlataformaPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2 group">
                            <span className="font-serif text-2xl font-semibold text-charcoal-900">
                                Iurex<span className="text-accent-gold">ia</span>
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center gap-8">
                            <span className="text-sm font-medium text-charcoal-900 border-b-2 border-charcoal-900">Plataforma</span>
                            <Link href="/soluciones" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Soluciones</Link>
                            <Link href="/precios" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Precios</Link>
                            <Link href="/seguridad" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Seguridad</Link>
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/chat" className="btn-primary text-sm py-2 px-5">
                                Probar Gratis
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <p className="text-accent-brown font-medium mb-4 tracking-wide">PLATAFORMA</p>
                    <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                        Diseñada para
                        <br />
                        <span className="text-charcoal-500">el Derecho Mexicano</span>
                    </h1>
                    <p className="text-xl text-charcoal-600 max-w-3xl mx-auto mb-12">
                        Iurexia está diseñada especialmente para el sistema jurídico mexicano. Es una plataforma de inteligencia artificial legal creada para ayudar a entender, ordenar y preparar asuntos dentro del marco normativo de México. Está pensada tanto para profesionales del derecho como para personas sin conocimientos jurídicos que necesitan una primera orientación.
                    </p>

                    {/* Platform Preview */}
                    <div className="relative mt-16 mb-20">
                        <div className="bg-gradient-to-br from-charcoal-800 to-charcoal-900 rounded-3xl p-8 shadow-2xl">
                            <div className="bg-white rounded-2xl overflow-hidden shadow-inner">
                                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="flex-1 text-center text-xs text-gray-400">Iurexia.app</div>
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <Scale className="w-8 h-8 text-charcoal-900" />
                                        <span className="font-serif text-2xl text-charcoal-900">Iurexia</span>
                                    </div>
                                    <div className="bg-cream-300/50 rounded-xl p-4 mb-4">
                                        <p className="text-charcoal-600">
                                            ¿Qué jurisprudencia aplica para impugnar la constitucionalidad del artículo 107 de la Ley de Amparo?
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-full">📚 Jurisprudencia</span>
                                        <span className="px-3 py-1.5 bg-green-50 text-green-600 text-xs rounded-full">⚖️ Leyes Federales</span>
                                        <span className="px-3 py-1.5 bg-purple-50 text-purple-600 text-xs rounded-full">🏛️ SCJN</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Purpose Section */}
            <section className="py-16 bg-white border-t border-black/5">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16">
                        <div>
                            <h2 className="font-serif text-3xl font-medium text-charcoal-900 mb-6">
                                Para Profesionales en derecho
                            </h2>
                            <p className="text-charcoal-600 leading-relaxed">
                                Iurexia no tiene el propósito de reemplazar al profesional del derecho. Es una herramienta impulsada por inteligencia artificial, especializada en el sistema jurídico mexicano, que potencia la eficiencia en el trabajo legal al ofrecer precisión extrema en investigación, análisis y redacción.
                            </p>
                        </div>
                        <div className="border-l-4 border-accent-brown pl-8">
                            <h2 className="font-serif text-3xl font-medium text-charcoal-900 mb-6">
                                Para usuarios que buscan orientación legal
                            </h2>
                            <p className="text-charcoal-600 leading-relaxed">
                                Para personas sin conocimientos jurídicos, Iurexia funciona como una herramienta de <strong>orientación</strong>: ubica la situación jurídica, explica rutas posibles y ayuda a reunir información para que un abogado acompañe y ejecute la estrategia con comunicación más clara y efectiva.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Zero Hallucinations Section */}
            <section className="py-16 bg-charcoal-900 text-white">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-accent-brown font-medium mb-4 tracking-wide">ARQUITECTURA VERIFICADA</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-medium mb-6">Cero alucinaciones.</h3>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Iurexia opera bajo una arquitectura estricta diseñada por profesionales del derecho mexicanos. Todas las respuestas se generan exclusivamente a partir de <strong className="text-white">fuentes jurídicas verificadas</strong> dentro de nuestra base documental, con trazabilidad y fundamento.
                    </p>
                </div>
            </section>

            {/* Feature 1: Búsqueda Híbrida */}
            <FeatureSection
                id="busqueda-hibrida"
                badge="MOTOR DE BÚSQUEDA"
                title="Búsqueda Híbrida Inteligente"
                subtitle="Precisión milimétrica en cada consulta"
                description="Sistema de búsqueda híbrida cuidadosamente programada y verificada por el equipo profesional de Iurexia, diseñado para encontrar exactamente lo que necesitas en el derecho mexicano."
                features={[
                    "Comprensión contextual: Entiende el significado de tu consulta, no solo palabras aisladas",
                    "Precisión técnica: Captura términos jurídicos exactos con alta fidelidad",
                    "Ranking inteligente: Los mejores resultados primero",
                    "Sin alucinaciones: si la fuente no existe, Iurexia lo indica y solicita el dato faltante"
                ]}
                visual={<HybridSearchVisual />}
                bgColor="bg-cream-300"
            />

            {/* Feature 2: Agente de Análisis */}
            <FeatureSection
                id="agente-analisis"
                badge="ANÁLISIS INTELIGENTE"
                title="Agente de Análisis"
                subtitle="Tu analista legal especializado con IA"
                description="Analiza automáticamente demandas, sentencias, impugnaciones y amparos. Identifica fortalezas, debilidades, contradicciones y áreas de mejora, proponiendo ajustes con fundamento jurídico y coherencia argumentativa."
                features={[
                    "Análisis automatizado de demandas completas",
                    "Detección de debilidades y contradicciones argumentativas",
                    "Identificación de fortalezas y puntos clave",
                    "Sugerencias de mejora con fundamento legal",
                    "Sin alucinaciones: cada sugerencia se apoya en material del repositorio jurídico"
                ]}
                visual={<SentinelAgentVisual />}
                bgColor="bg-white"
                reverse
            />

            {/* Feature 3: Filtros Jurisdiccionales */}
            <FeatureSection
                id="filtros-jurisdiccionales"
                badge="SEGURIDAD JURÍDICA"
                title="Filtros Jurisdiccionales"
                subtitle="Resultados precisos por estado"
                description="Asegura que los resultados se ajusten a la jurisdicción aplicable. Si trabajas en Jalisco, verás normativa y criterios aplicables a Jalisco, además del marco federal correspondiente."
                features={[
                    "32 estados + legislación federal",
                    "Aislamiento perfecto entre jurisdicciones",
                    "Sin contaminación de resultados de otros estados",
                    "Leyes federales siempre disponibles",
                    "Sin alucinaciones: todo resultado se limita a fuentes verificadas y filtradas por jurisdicción"
                ]}
                visual={<JurisdictionalFiltersVisual />}
                bgColor="bg-cream-300"
            />

            {/* Data Sources Section */}
            <section className="py-24 bg-charcoal-900 text-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">FUENTES DE DATOS</p>
                        <h2 className="font-serif text-4xl md:text-5xl font-medium mb-6">
                            Conocimiento legal completo
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Acceso a la base de datos legal más completa de México
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <DataSourceCard
                            icon={<FileText className="w-8 h-8" />}
                            title="Leyes Federales"
                            description="Constitución, leyes orgánicas, reglamentos y decretos federales actualizados."
                            count="300+"
                        />
                        <DataSourceCard
                            icon={<BookOpen className="w-8 h-8" />}
                            title="Códigos Estatales"
                            description="Códigos civiles, penales, procesales y administrativos de los 32 estados."
                            count="250+"
                        />
                        <DataSourceCard
                            icon={<Globe className="w-8 h-8" />}
                            title="Jurisprudencia"
                            description="Tesis y jurisprudencia de la SCJN, Tribunales Colegiados y Plenos de Circuito."
                            count="17,000+"
                        />
                    </div>
                </div>
            </section>

            {/* Premium Legal Assistance Section */}
            <section className="py-24 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-t border-amber-100">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full mb-6">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            EXCLUSIVO PLATINUM
                        </div>
                        <h2 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-6">
                            Más que tecnología:
                            <br />
                            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                acompañamiento humano
                            </span>
                        </h2>
                        <p className="text-xl text-charcoal-600 max-w-3xl mx-auto">
                            La plataforma te da las herramientas. Nuestro equipo legal te ayuda a perfeccionar la estrategia.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-3xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-shadow">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-3">
                                Consulta telefónica directa
                            </h3>
                            <p className="text-charcoal-600 leading-relaxed">
                                Habla con un abogado especializado que revisa tu caso y afina la estrategia que ideaste con la plataforma.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-shadow">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-3">
                                Respaldo profesional formal
                            </h3>
                            <p className="text-charcoal-600 leading-relaxed">
                                Contrato de prestación de servicios profesionales que garantiza formalidad y confidencialidad en cada interacción.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-shadow">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-3">
                                Abogados especializados
                            </h3>
                            <p className="text-charcoal-600 leading-relaxed">
                                Profesionales con dominio profundo del derecho mexicano, listos para orientarte con precisión y experiencia.
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href="/precios"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
                        >
                            Conocer Plan Platinum
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-cream-300">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-6">
                        Experimenta el futuro de la práctica legal
                    </h2>
                    <p className="text-lg text-charcoal-600 mb-8">
                        Únete a los profesionales del derecho que ya transforman su práctica con IA.
                    </p>
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-charcoal-900 text-white font-medium rounded-full hover:bg-charcoal-800 transition-colors mb-8"
                    >
                        Comenzar ahora
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <p className="text-sm text-charcoal-500 max-w-2xl mx-auto mt-6">
                        <strong>Nota de uso responsable:</strong> Iurexia no presta servicios legales directamente, ni pretende sustituir la asesoría profesional: orienta, organiza y fortalece el análisis; la estrategia y ejecución siempre deben ser acompañadas por un abogado.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-white border-t border-black/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Scale className="w-6 h-6" />
                            <span className="font-serif text-xl font-semibold">Iurex<span className="text-accent-gold">ia</span></span>
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

// Feature Section Component
function FeatureSection({
    id,
    badge,
    title,
    subtitle,
    description,
    features,
    visual,
    bgColor,
    reverse = false
}: {
    id: string;
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    visual: React.ReactNode;
    bgColor: string;
    reverse?: boolean;
}) {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            id={id}
            ref={sectionRef}
            className={`py-24 ${bgColor} overflow-hidden`}
        >
            <div className="max-w-7xl mx-auto px-4">
                <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
                    {/* Content */}
                    <div
                        className={`flex-1 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${reverse ? 'translate-x-12' : '-translate-x-12'}`
                            }`}
                    >
                        <p className="text-accent-brown font-medium mb-4 tracking-wide text-sm">{badge}</p>
                        <h2 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-4">
                            {title}
                        </h2>
                        <p className="text-xl text-charcoal-500 mb-6">{subtitle}</p>
                        <p className="text-charcoal-600 mb-8 leading-relaxed">{description}</p>

                        <ul className="space-y-4">
                            {features.map((feature, index) => (
                                <li
                                    key={index}
                                    className={`flex items-start gap-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                                        }`}
                                    style={{ transitionDelay: `${index * 100}ms` }}
                                >
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-charcoal-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Visual */}
                    <div
                        className={`flex-1 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${reverse ? '-translate-x-12' : 'translate-x-12'}`
                            }`}
                    >
                        {visual}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Visual Components for each feature
function HybridSearchVisual() {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <Search className="w-5 h-5 text-blue-600" />
                    <span className="text-charcoal-600">derecho del tanto arrendamiento</span>
                </div>
                <div className="h-px bg-gray-100 mb-4"></div>
                <div className="space-y-3">
                    <ResultItem
                        score={0.92}
                        title="Art. 2447 Código Civil Federal"
                        type="Ley Federal"
                        color="blue"
                    />
                    <ResultItem
                        score={0.89}
                        title="Tesis 1a./J. 45/2019"
                        type="Jurisprudencia"
                        color="purple"
                    />
                    <ResultItem
                        score={0.85}
                        title="Art. 2320 CC Jalisco"
                        type="Ley Estatal"
                        color="green"
                    />
                </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Búsqueda Híbrida Verificada
                </span>
            </div>
        </div>
    );
}

function SentinelAgentVisual() {
    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-amber-600" />
                    <span className="font-medium text-charcoal-900">Análisis de Demanda</span>
                </div>

                <div className="space-y-4">
                    {/* Fortalezas */}
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm font-medium text-green-700 mb-1">✓ Fortalezas</p>
                        <p className="text-xs text-green-600">Fundamentación sólida en Art. 14 CPEUM</p>
                    </div>

                    {/* Debilidades */}
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm font-medium text-red-700 mb-1">⚠ Debilidades</p>
                        <p className="text-xs text-red-600">Falta jurisprudencia de 5ta época aplicable</p>
                    </div>

                    {/* Sugerencias */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm font-medium text-blue-700 mb-1">💡 Sugerencia</p>
                        <p className="text-xs text-blue-600">Agregar Tesis 2a. LXVII/2021 como apoyo</p>
                    </div>

                    {/* Risk */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">Riesgo General:</span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                            MEDIO
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function JurisdictionalFiltersVisual() {
    const states = [
        { name: 'JALISCO', active: true },
        { name: 'NUEVO LEÓN', active: false },
        { name: 'CDMX', active: false },
        { name: 'ESTADO DE MÉXICO', active: false },
        { name: 'FEDERAL', active: true, federal: true },
    ];

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                    <span className="font-medium text-charcoal-900">Jurisdicción Activa</span>
                </div>

                <div className="space-y-2 mb-4">
                    {states.map((state) => (
                        <div
                            key={state.name}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${state.active
                                ? 'bg-emerald-50 border border-emerald-200'
                                : 'bg-gray-50 border border-gray-100 opacity-50'
                                }`}
                        >
                            <span className={`text-sm ${state.active ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
                                {state.federal && '🇲🇽 '}{state.name}
                            </span>
                            {state.active ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-xs text-gray-500 text-center">
                    Solo resultados de JALISCO + FEDERAL
                </p>
            </div>
        </div>
    );
}

function ResultItem({
    score,
    title,
    type,
    color
}: {
    score: number;
    title: string;
    type: string;
    color: string;
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
        green: 'bg-green-100 text-green-700',
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
                <p className="text-sm font-medium text-charcoal-900">{title}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${colors[color]}`}>{type}</span>
            </div>
            <div className="text-right">
                <p className="text-lg font-semibold text-charcoal-900">{(score * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-400">relevancia</p>
            </div>
        </div>
    );
}

function DataSourceCard({
    icon,
    title,
    description,
    count
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    count: string;
}) {
    return (
        <div className="p-8 rounded-2xl bg-charcoal-800 hover:bg-charcoal-700 transition-colors">
            <div className="text-white/80 mb-4">{icon}</div>
            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-serif font-medium text-white">{count}</span>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
            <p className="text-gray-400">{description}</p>
        </div>
    );
}
