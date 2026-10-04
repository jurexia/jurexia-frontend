'use client';

import Link from 'next/link';
import { ArrowRight, Search, Shield, MapPin, CheckCircle, Zap, FileText, BookOpen, Globe, MessageSquare, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import DemoCapitulos from '@/components/DemoCapitulos';
import { CAPITULOS } from '@/lib/capitulos-demo';
import { useEffect, useRef, useState } from 'react';
import PieDePagina from '@/components/PieDePagina';
import VideoChat from '@/components/VideoChat';

import { clasesBoton } from '@/components/web/sistema';
export default function PlataformaPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">PLATAFORMA</p>
                    <h1 className="font-serif text-[2.6rem] leading-[1.05] sm:text-display-l lg:text-display-xl font-normal text-tinta mb-8 [text-wrap:balance]">
                        Diseñada para el
                        <br />
                        Derecho Mexicano
                    </h1>
                    <p className="text-xl text-piedra-700 max-w-3xl mx-auto mb-12">
                        Infraestructura de inteligencia artificial diseñada para expandir radicalmente la capacidad operativa de las firmas legales y empresas en México. Automatiza la investigación jurisprudencial, acelera el flujo de nuevos asuntos y audita resoluciones masivas; liberando a los abogados para enfocarse en el trabajo estratégico de más alto valor y recuperando horas rentables.
                    </p>

                    {/* EL CHAT DE HOY (3-oct-2026). Aquí había un dibujo del chat
                        de antes del 25-sep —Buscar/Redactar, el rayo y las cuatro
                        herramientas en fila—, que ya no es lo que el abogado ve al
                        entrar. Ahora es una captura de la plataforma real: la barra
                        de trabajo con carpetas y consultas, Mi trabajo · Lo último
                        · Normativa · Redactor PJF, y la caja con Fuentes y
                        Esfuerzo. Un dibujo dice «así se vería»; la captura, «así
                        es». Se rehace con scratchpad/web/chat_hoy.py si cambia. */}
                    <div className="relative mt-16 mb-20 mx-auto max-w-5xl text-left select-none">
                        <div className="rounded-[1.75rem] bg-[#141414] p-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-black/40 sm:p-4">
                            <div className="overflow-hidden rounded-xl bg-cream-300">
                                <div className="flex items-center gap-2 border-b border-black/5 bg-white/70 px-4 py-2.5">
                                    <div className="flex w-16 gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-charcoal-900/20"></div>
                                        <div className="h-3 w-3 rounded-full bg-charcoal-900/15"></div>
                                        <div className="h-3 w-3 rounded-full bg-charcoal-900/10"></div>
                                    </div>
                                    <div className="flex-1 text-center text-xs font-medium text-charcoal-900/50">iurexia.com/chat</div>
                                    <div className="w-16"></div>
                                </div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/plataforma/chat-hoy.webp"
                                    alt="El chat de Iurexia: a la izquierda la barra de trabajo con nueva consulta, flujos de trabajo, carpetas y consultas; arriba Mi trabajo, Lo último, Normativa y Redactor PJF; al centro la caja de consulta con Fuentes y Esfuerzo."
                                    width={1792}
                                    height={1120}
                                    className="block h-auto w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* UNA SEMANA CON IUREXIA (3-oct-2026): la pieza de producto rehecha
                en Blender —un asunto laboral de lunes a viernes, de la
                investigación a la audiencia— justo después del hero. El menú
                «Plataforma» de la barra la enlaza con /plataforma#video. */}
            <VideoChat
                id="video"
                src="/video/iurexia-una-semana.mp4"
                poster="/video/iurexia-una-semana-poster.webp"
                rotulo="Una semana con Iurexia, en dos minutos"
            />

            {/* Purpose Section */}
            <section className="py-16 bg-white border-t border-black/5">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16">
                        <div>
                            <h2 className="font-serif text-display-s font-normal text-tinta mb-6 [text-wrap:balance]">
                                Escala las operaciones de tu Firma
                            </h2>
                            <p className="text-piedra-700 leading-relaxed">
                                Transforma drásticamente los márgenes de rentabilidad, especialmente en casos de tarifa fija (Fixed-Fee). Reduce las horas no facturables dedicadas a buscar precedentes o redactar revisiones iniciales. Iurexia multiplica tu capacidad de respuesta, permitiéndote tomar más clientela sin tener que contratar más personal.
                            </p>
                        </div>
                        <div className="border-l-4 border-accent-brown pl-8">
                            <h2 className="font-serif text-display-s font-normal text-tinta mb-6 [text-wrap:balance]">
                                Reduce costos en equipos In-House
                            </h2>
                            <p className="text-piedra-700 leading-relaxed">
                                Para departamentos corporativos, Iurexia agiliza la respuesta a consultas de las demás áreas del negocio. Disminuye agresivamente el gasto en despachos de abogados externos resolviendo internamente y con certeza las primeras fases de la estrategia legal corporativa.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* La sala de demostraciones. Antes había aquí una sola animación
                de mentira; ahora son cuatro grabaciones de la plataforma real,
                una por función, y el visitante elige cuál ver. */}
            <section id="demos" className="scroll-mt-24 py-16 bg-cream-300">
                <div className="max-w-[1100px] mx-auto px-4 sm:px-6 mb-8">
                    <h2 className="font-serif text-[2.1rem] leading-[1.1] tracking-[-0.015em] sm:text-display-m font-normal text-center text-tinta mb-3 sm:mb-4 [text-wrap:balance]">
                        Mira cómo funciona
                    </h2>
                    <p className="text-center text-base sm:text-lg text-piedra-700 max-w-2xl mx-auto px-2">
                        Cuatro grabaciones de la plataforma trabajando. Elige la función y
                        mírala de principio a fin.
                    </p>
                </div>
                <DemoCapitulos capitulos={CAPITULOS} fondo="bg-transparent" />
            </section>

            {/* Zero Hallucinations Section */}
            <section className="py-16 bg-charcoal-900 text-white">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.16em] text-white/55">ARQUITECTURA TRAZABLE</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-normal mb-6">Genera respuestas verificadas.</h3>
                    <p className="text-xl text-white/55 max-w-3xl mx-auto">
                        Iurexia opera con <strong>Security by Design (Blindaje de Datos)</strong>, protegiendo el secreto profesional de los litigios. Todas las respuestas proceden de <strong className="text-white">fuentes jurídicas públicas</strong>, y a diferencia de los modelos de IA tradicionales, en Iurexia <strong className="text-accent-gold">jamás usamos la información confidencial de tus casos o clientes para entrenar nuestros modelos</strong> compartidos.
                    </p>
                </div>
            </section>

            {/* Feature 1: Búsqueda Híbrida */}
            <FeatureSection
                id="busqueda-hibrida"
                badge="MOTOR DE BÚSQUEDA"
                title={<>Búsqueda Híbrida <span className="text-accent-gold">Inteligente</span></>}
                subtitle="Precisión milimétrica en cada consulta"
                description="Sistema de búsqueda híbrida cuidadosamente programada y verificada por el equipo profesional de Iurexia, diseñado para encontrar exactamente lo que necesitas en el derecho mexicano."
                features={[
                    "Comprensión contextual: Entiende el significado de tu consulta, no solo palabras aisladas",
                    "Precisión técnica: Captura términos jurídicos exactos con alta fidelidad",
                    "Ranking inteligente: Los mejores resultados primero",
                    "Verificado: si la fuente no existe, Iurexia lo indica y solicita el dato faltante"
                ]}
                visual={<HybridSearchVisual />}
                bgColor="bg-cream-300"
            />

            {/* Feature 2: Agente de Análisis */}
            <FeatureSection
                id="agente-analisis"
                badge="ANÁLISIS INTELIGENTE"
                title={<>Agente de <span className="text-accent-gold">Análisis</span></>}
                subtitle="Tu analista legal especializado con IA"
                description="Analiza automáticamente demandas, sentencias, impugnaciones y amparos. Identifica fortalezas, debilidades, contradicciones y áreas de mejora, proponiendo ajustes con fundamento jurídico y coherencia argumentativa."
                features={[
                    "Análisis automatizado de demandas completas",
                    "Detección de debilidades y contradicciones argumentativas",
                    "Identificación de fortalezas y puntos clave",
                    "Sugerencias de mejora con fundamento legal",
                    "Verificado: cada sugerencia se apoya en material del repositorio jurídico"
                ]}
                visual={<SentinelAgentVisual />}
                bgColor="bg-white"
                reverse
            />

            {/* Feature 3: Filtros Jurisdiccionales */}
            <FeatureSection
                id="filtros-jurisdiccionales"
                badge="SEGURIDAD JURÍDICA"
                title={<>Filtros <span className="text-accent-gold">Jurisdiccionales</span></>}
                subtitle="Resultados precisos por estado"
                description="Asegura que los resultados se ajusten a la jurisdicción aplicable. Si trabajas en Jalisco, verás normativa y criterios aplicables a Jalisco, además del marco federal correspondiente."
                features={[
                    "32 estados + legislación federal",
                    "Aislamiento perfecto entre jurisdicciones",
                    "Sin contaminación de resultados de otros estados",
                    "Leyes federales siempre disponibles",
                    "Trazable: todo resultado se limita a fuentes verificadas y filtradas por jurisdicción"
                ]}
                visual={<JurisdictionalFiltersVisual />}
                bgColor="bg-cream-300"
            />

            {/* Feature 4: Flujos de trabajo. Sustituye a «Arquitectura
                Multi-Genio» (3-oct-2026): los Genios salieron del producto el
                25-sep y esta página seguía vendiéndolos. Lo que hay hoy en su
                lugar son los siete flujos que arrancan en el chat. */}
            <FeatureSection
                id="flujos-de-trabajo"
                badge="✦ PRO Y PLATINUM"
                title={<>Flujos de <span className="text-accent-gold">trabajo</span></>}
                subtitle="Del encargo al escrito terminado, parte por parte"
                description="Iurexia construye contigo la demanda de amparo, la contestación, el escrito de agravios o la revisión del contrato, parte por parte y con todo el acervo a la vista. En cada parte propone lo que deduce de tu encargo y de tu carpeta —ya marcado, para que sólo confirmes—, te pide lo que falta y, si hace falta un documento, te lo pide en vez de suponerlo."
                features={[
                    "Siete flujos: amparo indirecto y directo, contestación, agravios, revisión de contrato, teoría del caso y dictamen",
                    "Cada dato propuesto y marcado: tú sólo confirmas",
                    "Pide el documento que falta en vez de inventar el dato",
                    "Redacta con todo el acervo y con sus citas",
                    "30 flujos al mes en Pro y 60 en Platinum, sin gastar consultas"
                ]}
                visual={<FlujoVisual />}
                bgColor="bg-white"
                reverse
            />

            {/* Feature 5: Precedentes Judiciales */}
            <FeatureSection
                id="precedentes"
                badge="CORPUS JUDICIAL"
                title={<>Precedentes <span className="text-accent-gold">Judiciales</span></>}
                subtitle="111,000+ sentencias reales de Tribunales Colegiados"
                description="El primer corpus de precedentes judiciales indexado semánticamente para el derecho mexicano. Encuentra sentencias reales por materia, acto reclamado, tribunal y sentido del fallo — con comprensión profunda del razonamiento judicial, no solo palabras clave."
                features={[
                    "141,000+ holdings de sentencias reales de Tribunales Colegiados",
                    "6 circuitos activos hoy: 1, 2, 3, 4, 16 y 22 — el corpus crece cada mes con nuevas sentencias",
                    "Búsqueda semántica por materia, acto reclamado, tribunal y sentido del resolutivo",
                    "Acceso a PDFs de las sentencias originales para consulta directa",
                    "Disponible en planes Pro y Platinum"
                ]}
                visual={<PrecedentesVisual />}
                bgColor="bg-cream-300"
            />

            {/* Feature 6: Esfuerzo de redacción. Era «Redacción Pro», un
                interruptor que el chat ya no tiene: desde el 25-sep la caja
                lleva el desplegable «Esfuerzo» con tres escalones (3-oct-2026). */}
            <FeatureSection
                id="esfuerzo-de-redaccion"
                badge="BÁSICO · PRO · PLATINUM"
                title={<>Esfuerzo de <span className="text-accent-gold">redacción</span></>}
                subtitle="Tú decides cuánto razona Iurexia antes de escribir"
                description="Al pedir un escrito —«Redacta una demanda de…»— eliges con qué motor se redacta, en el desplegable que está junto a «Fuentes». Las demás consultas no cambian: el esfuerzo sólo se aplica cuando pides un escrito."
                features={[
                    "Básico: escrito completo, ágil y bien estructurado, en todos los planes",
                    "Pro: razona a fondo cada argumento antes de escribir",
                    "Platinum: el motor más potente, con escritos más extensos y argumentos en capas",
                    "En los tres, fundamentación con artículos y tesis verificadas contra el acervo",
                    "Pro en el plan Pro; Platinum en el plan Platinum"
                ]}
                visual={<EsfuerzoVisual />}
                bgColor="bg-white"
                reverse
            />

            {/* Feature 7: Jurimetría */}
            <FeatureSection
                id="jurimetria"
                badge="✦ EXCLUSIVO PLATINUM"
                title={<>Jurimetría <span className="text-accent-gold">Judicial</span></>}
                subtitle="Predice el sentido de tu amparo antes de presentarlo"
                description="Herramienta de inteligencia predictiva exclusiva para secretarios de tribunal. Sube el acto reclamado y los conceptos de violación en PDF — la IA los analiza, los compara con 111,000+ precedentes reales y genera una predicción estadística fundamentada argumento por argumento."
                features={[
                    "Predicción del sentido probable: Concede, Niega o Sobresee con porcentajes reales",
                    "Análisis argumento por argumento con precedentes aplicables de cada concepto",
                    "Estadísticas históricas por circuito, tribunal y magistrado",
                    "Adjunta PDFs del acto reclamado y agravios para análisis avanzado en modo Secretario",
                    "Exclusivo para el plan Platinum"
                ]}
                visual={<JurimetriaVisual />}
                bgColor="bg-cream-300"
            />

            {/* Data Sources Section */}
            <section className="py-24 bg-charcoal-900 text-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.16em] text-white/55">FUENTES DE DATOS</p>
                        <h2 className="font-serif text-[2.1rem] leading-[1.1] sm:text-display-m font-normal mb-6 [text-wrap:balance]">
                            Conocimiento legal completo
                        </h2>
                        <p className="text-xl text-white/55 max-w-2xl mx-auto">
                            Acceso a la base de datos legal más completa de México
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <DataSourceCard
                            icon={<FileText className="w-8 h-8" />}
                            title="Leyes Federales"
                            description="Constitución, leyes orgánicas, reglamentos y decretos federales actualizados."
                            count="Cientos"
                        />
                        <DataSourceCard
                            icon={<BookOpen className="w-8 h-8" />}
                            title="Códigos Estatales"
                            description="Códigos civiles, penales, procesales y administrativos de los 32 estados."
                            count="Miles"
                        />
                        <DataSourceCard
                            icon={<Globe className="w-8 h-8" />}
                            title="Jurisprudencia"
                            description="Tesis y jurisprudencia de la SCJN, Tribunales Colegiados y Plenos de Circuito."
                            count="Miles"
                        />
                        <DataSourceCard
                            icon={<Shield className="w-8 h-8" />}
                            title="Bloque de Constitucionalidad"
                            description="Constitución PEUM, Tratados internacionales, Cuadernillos de la Corte Interamericana de Derechos Humanos y Resumen de casos de la CIDH."
                            count="Miles"
                        />
                    </div>
                </div>
            </section>

            {/* Premium Legal Assistance Section */}
            <section className="py-24 bg-cream-200 border-t border-accent-gold/20">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-gold/10 text-white text-sm font-bold rounded-lg mb-6">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            EXCLUSIVO PLATINUM
                        </div>
                        <h2 className="font-serif text-[2.1rem] leading-[1.1] sm:text-display-m font-normal text-tinta mb-6 [text-wrap:balance]">
                            Más que tecnología:
                            <br />
                            
                                acompañamiento humano
                            
                        </h2>
                        <p className="text-xl text-piedra-700 max-w-3xl mx-auto">
                            La plataforma te da las herramientas. Nuestro equipo legal te ayuda a perfeccionar la estrategia.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-3xl p-8 shadow-lg border border-accent-gold/20 hover:shadow-xl transition-shadow">
                            <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 flex items-center justify-center mb-6">
                                <MessageSquare className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="font-serif text-xl font-normal text-tinta mb-3">
                                Consulta directa mediante la plataforma
                            </h3>
                            <p className="text-piedra-700 leading-relaxed">
                                Escribe a un abogado especializado que revisa tu caso y afina la estrategia que ideaste con la plataforma, directamente desde Iurexia.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl p-8 shadow-lg border border-accent-gold/20 hover:shadow-xl transition-shadow">
                            <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="font-serif text-xl font-normal text-tinta mb-3">
                                Respaldo profesional formal
                            </h3>
                            <p className="text-piedra-700 leading-relaxed">
                                Contrato de prestación de servicios profesionales que garantiza formalidad y confidencialidad en cada interacción.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl p-8 shadow-lg border border-accent-gold/20 hover:shadow-xl transition-shadow">
                            <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="font-serif text-xl font-normal text-tinta mb-3">
                                Abogados especializados
                            </h3>
                            <p className="text-piedra-700 leading-relaxed">
                                Profesionales con dominio profundo del derecho mexicano, listos para orientarte con precisión y experiencia.
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href="/precios"
                            className={clasesBoton()}
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
                    <h2 className="font-serif text-[2.1rem] leading-[1.1] sm:text-display-m font-normal text-tinta mb-6 [text-wrap:balance]">
                        Experimenta el futuro de la práctica legal
                    </h2>
                    <p className="text-lg text-piedra-700 mb-8">
                        Únete a los profesionales del derecho que ya transforman su práctica con IA.
                    </p>
                    <Link
                        href="/chat"
                        className={`${clasesBoton()} mb-8`}
                    >
                        Comenzar ahora
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <p className="text-sm text-piedra-600 max-w-2xl mx-auto mt-6">
                        <strong>Nota de uso responsable:</strong> Iurexia no presta servicios legales directamente, ni pretende sustituir la asesoría profesional: orienta, organiza y fortalece el análisis; la estrategia y ejecución siempre deben ser acompañadas por un abogado.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <PieDePagina />
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
    title: React.ReactNode;
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
            className={`scroll-mt-20 py-24 ${bgColor} overflow-hidden`}
        >
            <div className="max-w-7xl mx-auto px-4">
                <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
                    {/* Content */}
                    <div
                        className={`flex-1 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${reverse ? 'translate-x-12' : '-translate-x-12'}`
                            }`}
                    >
                        <p className="text-accent-brown font-medium mb-4 tracking-wide text-sm">{badge}</p>
                        <h2 className="font-serif text-[2.1rem] leading-[1.1] sm:text-display-m font-normal text-tinta mb-4 [text-wrap:balance]">
                            {title}
                        </h2>
                        <p className="text-xl text-piedra-600 mb-6">{subtitle}</p>
                        <p className="text-piedra-700 mb-8 leading-relaxed">{description}</p>

                        <ul className="space-y-4">
                            {features.map((feature, index) => (
                                <li
                                    key={index}
                                    className={`flex items-start gap-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                                        }`}
                                    style={{ transitionDelay: `${index * 100}ms` }}
                                >
                                    <CheckCircle className="w-5 h-5 text-accent-gold mt-0.5 flex-shrink-0" />
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
        <div className="bg-gradient-to-br from-cream-200 to-cream-300 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <Search className="w-5 h-5 text-charcoal-800" />
                    <span className="text-piedra-700">derecho del tanto arrendamiento</span>
                </div>
                <div className="h-px bg-piedra-100 mb-4"></div>
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
            <div className="flex items-center justify-center gap-4 text-sm text-piedra-600">
                <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-accent-gold" />
                    Búsqueda Híbrida Verificada
                </span>
            </div>
        </div>
    );
}

function SentinelAgentVisual() {
    return (
        <div className="bg-accent-gold/10 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-accent-gold" />
                    <span className="font-medium text-charcoal-900">Análisis de Demanda</span>
                </div>

                <div className="space-y-4">
                    {/* Fortalezas */}
                    <div className="p-3 bg-accent-gold/[0.07] rounded-lg border border-accent-gold/20">
                        <p className="text-sm font-medium text-accent-gold mb-1">✓ Fortalezas</p>
                        <p className="text-xs text-accent-gold">Fundamentación sólida en Art. 14 CPEUM</p>
                    </div>

                    {/* Debilidades */}
                    <div className="p-3 bg-cream-200 rounded-lg border border-charcoal-900/10">
                        <p className="text-sm font-medium text-charcoal-800 mb-1">⚠ Debilidades</p>
                        <p className="text-xs text-charcoal-800">Falta jurisprudencia de 5ta época aplicable</p>
                    </div>

                    {/* Sugerencias */}
                    <div className="p-3 bg-cream-200 rounded-lg border border-charcoal-900/10">
                        <p className="text-sm font-medium text-charcoal-800 mb-1">💡 Sugerencia</p>
                        <p className="text-xs text-charcoal-800">Agregar Tesis 2a. LXVII/2021 como apoyo</p>
                    </div>

                    {/* Risk */}
                    <div className="flex items-center justify-between pt-2 border-t border-piedra-100">
                        <span className="text-sm text-piedra-600">Riesgo General:</span>
                        <span className="px-3 py-1 bg-accent-gold/15 text-accent-gold text-sm font-medium rounded-lg">
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
        <div className="bg-gradient-to-br from-cream-200 to-cream-300 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-6 h-6 text-accent-gold" />
                    <span className="font-medium text-charcoal-900">Jurisdicción Activa</span>
                </div>

                <div className="space-y-2 mb-4">
                    {states.map((state) => (
                        <div
                            key={state.name}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${state.active
                                ? 'bg-accent-gold/[0.07] border border-accent-gold/30'
                                : 'bg-piedra-50 border border-piedra-100 opacity-50'
                                }`}
                        >
                            <span className={`text-sm ${state.active ? 'text-accent-gold font-medium' : 'text-piedra-500'}`}>
                                {state.federal && '🇲🇽 '}{state.name}
                            </span>
                            {state.active ? (
                                <CheckCircle className="w-4 h-4 text-accent-gold" />
                            ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-piedra-300"></div>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-xs text-piedra-600 text-center">
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
        blue: 'bg-cream-300 text-charcoal-800',
        purple: 'bg-accent-gold/15 text-accent-brown',
        green: 'bg-accent-gold/15 text-accent-gold',
    };

    return (
        <div className="flex items-center justify-between p-3 bg-piedra-50 rounded-lg">
            <div>
                <p className="text-sm font-medium text-charcoal-900">{title}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${colors[color]}`}>{type}</span>
            </div>
            <div className="text-right">
                <p className="text-lg font-semibold text-charcoal-900">{(score * 100).toFixed(0)}%</p>
                <p className="text-xs text-piedra-500">relevancia</p>
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
            <h3 className="text-xl font-normal text-white mb-2">{title}</h3>
            <p className="text-white/55">{description}</p>
        </div>
    );
}

function PrecedentesVisual() {
    const results = [
        { circuito: '22', tribunal: '3TCC', sentido: 'NIEGA', match: 94, tema: 'Amparo directo — Litis cerrada' },
        { circuito: '1', tribunal: '7TCC', sentido: 'CONCEDE', match: 91, tema: 'Falta de fundamentación y motivación' },
        { circuito: '4', tribunal: '2TCC', sentido: 'SOBRESEE', match: 87, tema: 'Falta de interés jurídico' },
    ] as const;

    const sentidoStyle: Record<string, string> = {
        CONCEDE: 'bg-accent-gold/15 text-accent-gold',
        NIEGA: 'bg-red-800/10 text-charcoal-800',
        SOBRESEE: 'bg-accent-gold/15 text-accent-gold',
    };

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-6 h-6 text-slate-600" />
                    <span className="font-medium text-charcoal-900">Precedentes</span>
                    <span className="ml-auto text-xs text-piedra-600">111,248 sentencias</span>
                </div>

                <div className="space-y-3">
                    {results.map((item, i) => (
                        <div key={i} className="p-3 bg-piedra-50 rounded-lg border border-piedra-100">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-piedra-600">Circ. {item.circuito} · {item.tribunal}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${sentidoStyle[item.sentido]}`}>
                                        {item.sentido}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold text-charcoal-900">{item.match}%</span>
                            </div>
                            <p className="text-xs text-piedra-700">{item.tema}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-piedra-100 flex items-center justify-between text-xs text-piedra-500">
                    <span>6 circuitos activos</span>
                    <span className="text-accent-brown font-medium">corpus creciente →</span>
                </div>
            </div>
        </div>
    );
}

function JurimetriaVisual() {
    return (
        <div className="bg-gradient-to-br from-[#0f1626] to-[#1a2540] rounded-3xl p-8 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent-gold" />
                    <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Jurimetría Predictiva</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-[#c9a962]/20 text-accent-gold rounded-lg font-bold">PLATINUM</span>
            </div>

            <div className="bg-red-900/20 border border-red-800/40 rounded-2xl p-5 mb-4">
                <p className="text-red-200/80 text-xs font-medium mb-1">Sentido probable</p>
                <p className="text-3xl font-serif font-medium text-red-200/80">NIEGA</p>
                <p className="text-xs text-red-200/60 mt-1">Basado en 6,379 precedentes análogos</p>
            </div>

            <div className="space-y-3 mb-4">
                {[
                    { label: 'NIEGA', pct: 71, color: 'bg-red-800' },
                    { label: 'CONCEDE', pct: 19, color: 'bg-charcoal-900' },
                    { label: 'SOBRESEE', pct: 10, color: 'bg-accent-gold' },
                ].map(bar => (
                    <div key={bar.label}>
                        <div className="flex justify-between text-xs text-white/60 mb-1">
                            <span>{bar.label}</span><span>{bar.pct}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.pct}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-white/40 text-center">n = 6,379 · confianza alta</p>
        </div>
    );
}

/* El flujo, como lo enseña el chat: el escrito y sus partes, lo que Iurexia
   tomó del encargo y de la carpeta, los datos ya marcados y el que falta. */
function FlujoVisual() {
    return (
        <div className="bg-gradient-to-br from-cream-200 to-cream-300 rounded-3xl p-8 shadow-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-charcoal-900 flex items-center justify-center">
                        <svg className="w-[18px] h-[18px] text-accent-gold" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="3" y="3" width="8" height="8" rx="2" />
                            <path d="M7 11v4a2 2 0 0 0 2 2h4" />
                            <rect x="13" y="13" width="8" height="8" rx="2" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-charcoal-900 text-sm">Demanda de amparo indirecto</p>
                        <p className="text-accent-brown text-xs">Parte 2 de 4 · Antecedentes y preceptos violados</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
                    <span className="h-1.5 rounded-full bg-charcoal-900" />
                    <span className="h-1.5 rounded-full bg-accent-gold" />
                    <span className="h-1.5 rounded-full bg-cream-400" />
                    <span className="h-1.5 rounded-full bg-cream-400" />
                </div>

                <div className="mt-5 rounded-lg bg-cream-100 border border-cream-300 px-3.5 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-charcoal-900/50 mb-1.5">Proceso</p>
                    <ul className="space-y-1 text-[12px] leading-snug text-charcoal-900/70">
                        <li>Tomé del encargo el acto reclamado y la fecha del oficio</li>
                        <li>De la carpeta: la sentencia que acredita el concubinato</li>
                        <li>Falta la fecha de notificación para computar el plazo</li>
                    </ul>
                </div>

                <p className="mt-4 text-xs font-semibold text-charcoal-900">
                    Preceptos violados <span className="ml-1 rounded-md bg-accent-gold/15 px-1.5 py-px text-[9px] font-bold uppercase text-accent-brown">Sugerido</span>
                </p>
                <div className="mt-1.5 space-y-1">
                    {[['Artículos 1o. y 4o. constitucionales', true], ['Artículo 123, apartado A, fracción XXIX', true], ['Artículo 24 de la Convención Americana', false]].map(([t, marcado]) => (
                        <div key={t as string} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${marcado ? 'border-accent-gold/60 bg-accent-gold/[0.07] text-charcoal-900' : 'border-cream-400 text-charcoal-900/55'}`}>
                            <span className={`grid h-3 w-3 place-items-center rounded-[3px] border ${marcado ? 'border-accent-gold bg-accent-gold' : 'border-charcoal-900/30'}`}>
                                {marcado && <svg className="h-2 w-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            {t as string}
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-cream-300">
                    <span className="text-xs font-medium text-accent-brown">Falta 1 dato</span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 py-1.5 text-[11.5px] font-semibold text-white opacity-60">
                        Redactar esta parte →
                    </span>
                </div>
            </div>
        </div>
    );
}
/* El desplegable «Esfuerzo» tal como se abre en el chat: los tres escalones
   con su descripción, Platinum elegido. */
function EsfuerzoVisual() {
    const escalones = [
        { nombre: 'Básico', detalle: 'Escrito completo, ágil y bien estructurado.', plan: 'Todos los planes', elegido: false },
        { nombre: 'Pro', detalle: 'Razona a fondo cada argumento antes de escribir.', plan: 'Plan Pro', elegido: false },
        { nombre: 'Platinum', detalle: 'El motor más potente: escritos más extensos y argumentos en capas.', plan: 'Plan Platinum', elegido: true },
    ];
    return (
        <div className="bg-gradient-to-br from-cream-200 to-cream-300 rounded-3xl p-8 shadow-lg">
            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-charcoal-900/10 bg-white shadow-sm">
                <p className="border-b border-charcoal-900/[0.07] px-5 py-3.5 text-center font-serif text-[1.0625rem] text-charcoal-900">
                    Esfuerzo de redacción
                </p>
                <ul>
                    {escalones.map((e) => (
                        <li key={e.nombre} className={`flex items-start gap-3 px-5 py-3.5 ${e.elegido ? 'bg-accent-gold/[0.07]' : ''}`}>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-charcoal-900">{e.nombre}</p>
                                <p className="mt-0.5 text-[12.5px] leading-snug text-charcoal-900/65">{e.detalle}</p>
                                <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent-brown">{e.plan}</p>
                            </div>
                            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${e.elegido ? 'border-charcoal-900 bg-charcoal-900' : 'border-charcoal-900/25'}`}>
                                {e.elegido && <CheckCircle className="h-3 w-3 text-white" />}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="border-t border-charcoal-900/[0.07] px-5 py-3 text-center text-[12px] leading-snug text-charcoal-900/60">
                    Se aplica cuando pides un escrito. Las demás consultas no cambian.
                </p>
            </div>
        </div>
    );
}
