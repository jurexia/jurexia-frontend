'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Scale, ArrowRight, Check, Shield, FileText, Brain,
    Clock, Gavel, BookOpen, Sparkles, ChevronDown,
    Building2, Users, Zap, Award, Lock, TrendingUp
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AnimateOnScroll } from '@/hooks/useScrollAnimation';

export default function SecretariosPage() {

    return (
        <main className="min-h-screen bg-[#0f0e0d] text-white overflow-hidden">
            <Navbar />

            {/* ═══ HERO SECTION ═══ */}
            <section className="relative pt-28 pb-20 px-4">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0d] via-[#131211] to-[#0f0e0d]" />
                {/* Gold accent lines */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(45deg, #c9a962 1px, transparent 1px), linear-gradient(-45deg, #c9a962 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                <div className="relative max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <AnimateOnScroll delay={0}>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c9a962]/10 border border-[#c9a962]/20 mb-8">
                                    <Shield className="w-4 h-4 text-[#c9a962]" />
                                    <span className="text-sm text-[#c9a962] font-medium tracking-wide">EXCLUSIVO PARA SERVIDORES PÚBLICOS DEL PJF</span>
                                </div>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.1}>
                                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-6">
                                    El arsenal legal del<br />
                                    <span className="text-[#c9a962]">secretario moderno</span>
                                </h1>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.2}>
                                <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-xl">
                                    Herramientas de IA avanzada diseñadas para <strong className="text-white">ampliar la capacidad intelectual del secretario</strong>: proyección estadística con jurimetría, búsqueda en 111,000+ precedentes reales y redacción de proyectos de sentencia con modelos de razonamiento profundo.
                                    Todo bajo tu <strong className="text-[#c9a962]">gestión estricta y criterio en cada paso</strong> — tú defines el rumbo, tú validas, tú firmas.
                                </p>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.3}>
                                {/* ═══ TRES ACCIONES, TRES PESOS ═══
                                    David: «esos botones están estéticamente
                                    desagradables». Eran tres óvalos de anchos dispares,
                                    y la causa era concreta: `rounded-full` sobre un
                                    botón cuyo texto envuelve en tres renglones deja de
                                    ser una píldora y se convierte en una elipse.

                                    Ahora llevan el radio del taller, el texto no envuelve
                                    y los rótulos están medidos para que los tres midan
                                    parecido. Y se leen como lo que son: la prueba
                                    gratuita manda —es lo que queremos que pulse—, la
                                    suscripción va en contorno dorado, y conocer más en
                                    gris, que es ayuda y no decisión. */}
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                                    <Link
                                        href="/tcc-beta"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a962] px-6 py-3.5 text-[15px] font-bold text-[#0f0e0d] whitespace-nowrap transition-colors hover:bg-[#d8bd7d]"
                                    >
                                        Probar gratis
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    {/* SUSCRIBIRSE, ARRIBA Y NO A MITAD DE PÁGINA:
                                        quien entra decidido no baja a buscarlo. */}
                                    <Link
                                        href="/precios?plan=ultra_secretarios"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9a962]/45 px-6 py-3.5 text-[15px] font-semibold text-[#c9a962] whitespace-nowrap transition-colors hover:bg-[#c9a962]/10"
                                    >
                                        Suscribirme · $999/mes
                                    </Link>
                                    <a
                                        href="#features"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-[15px] font-medium text-white/75 whitespace-nowrap transition-colors hover:border-white/30 hover:text-white"
                                    >
                                        Conocer más
                                        <ChevronDown className="w-4 h-4" />
                                    </a>
                                </div>
                                {/* LA PRUEBA YA NO SE PIDE POR CORREO. David:
                                    «ya quita lo de solicitar prueba porque el usuario
                                    gratuito puede hacer una prueba; no es necesario».
                                    Cualquier cuenta gratuita genera un proyecto desde el
                                    propio taller, sin tarjeta y sin escribirle a nadie. */}
                                <p className="mt-3 text-sm text-white/45">
                                    La prueba no se solicita: cualquier cuenta gratuita genera
                                    un proyecto completo desde el taller, sin tarjeta.
                                </p>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.4}>
                                <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/10">
                                    <div className="text-center">
                                        {/* DECÍA 20 Y 50. Son las cifras del plan cuando se
                                            escribió la página; el plan da 40 proyectos y 560
                                            consultas —las mismas que Platinum—. Anunciar de
                                            menos por un texto viejo es vender peor de lo que
                                            se tiene, y esto se ve en la primera pantalla. */}
                                        <div className="text-2xl font-bold text-[#c9a962]">40</div>
                                        <div className="text-xs text-white/45">proyectos/mes</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#c9a962]">111K+</div>
                                        <div className="text-xs text-white/45">precedentes</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#c9a962]">560</div>
                                        <div className="text-xs text-white/45">consultas/mes</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#c9a962]">24/7</div>
                                        <div className="text-xs text-white/45">disponible</div>
                                    </div>
                                </div>
                            </AnimateOnScroll>
                        </div>

                        {/* Right side — Logo + PJF badge */}
                        <AnimateOnScroll delay={0.2} direction="scale">
                            <div className="relative flex items-center justify-center">
                                <div className="relative w-80 h-80 flex items-center justify-center">
                                    {/* Outer glow ring */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#c9a962]/20 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
                                    {/* Inner circle with logo */}
                                    <div className="relative w-64 h-64 rounded-full bg-gradient-to-br from-[#1c1b19] to-[#121110] border border-[#c9a962]/30 flex items-center justify-center shadow-2xl shadow-[#c9a962]/10 overflow-hidden">
                                        <Image
                                            src="/pjf-escudo.png"
                                            alt="Poder Judicial de la Federación"
                                            width={220}
                                            height={220}
                                            className="rounded-full object-cover"
                                        />
                                    </div>
                                    {/* Floating badges */}
                                    <div className="absolute -top-2 -right-2 px-3 py-1.5 bg-[#c9a962] text-[#0f0e0d] text-xs font-bold rounded-full shadow-lg">
                                        NUEVO
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#171614] border border-[#c9a962]/30 rounded-full">
                                        <span className="text-xs text-[#c9a962] font-medium">Plan Secretario PJF</span>
                                    </div>
                                </div>
                            </div>
                        </AnimateOnScroll>
                    </div>
                </div>
            </section>

            {/* ═══ TRUST BAR ═══ */}
            <section className="py-6 bg-[#171614] border-y border-white/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-white/45 text-sm">
                        <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#c9a962]" />
                            <span>Datos 100% confidenciales</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#c9a962]" />
                            <span>Base de datos verificada</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-[#c9a962]" />
                            <span>Normativa actualizada</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#c9a962]" />
                            <span>Jurisprudencia de la SCJN</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ PROBLEM / SOLUTION ═══ */}
            <section className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <AnimateOnScroll>
                        <div className="text-center mb-16">
                            <p className="text-[#c9a962] font-medium mb-4 tracking-wide text-sm">EL DESAFÍO</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                                El estudio de fondo consume <span className="text-[#c9a962]">horas de tu jornada</span>
                            </h2>
                            <p className="text-white/60 max-w-2xl mx-auto text-lg">
                                Revisar actas, identificar agravios, buscar jurisprudencia aplicable, fundar y motivar cada concepto de violación...
                                Iurexia genera el andamiaje para que exprimias tu capacidad intelectual en lo que importa: <strong className="text-white">tu criterio jurídico y la calidad del fallo</strong>.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Before */}
                        <AnimateOnScroll delay={0.1}>
                            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-red-950/30 to-[#171614] border border-red-900/30">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-red-900/60 border border-red-800/40 rounded-full text-xs text-red-200 font-medium">
                                    SIN IUREXIA
                                </div>
                                <ul className="space-y-4 mt-4">
                                    {[
                                        'Búsqueda manual de artículos y tesis por horas',
                                        'Riesgo de omitir jurisprudencia aplicable',
                                        'Estructura del estudio repetitiva y propensa a errores',
                                        'Copiar y pegar de sentencias anteriores',
                                        'Jornadas de 12+ horas para un solo proyecto',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-white/60">
                                            <span className="w-5 h-5 rounded-full bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-red-400 text-xs">✕</span>
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimateOnScroll>

                        {/* After */}
                        <AnimateOnScroll delay={0.2}>
                            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#c9a962]/10 to-[#171614] border border-[#c9a962]/30">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-[#c9a962]/20 border border-[#c9a962]/30 rounded-full text-xs text-[#c9a962] font-medium">
                                    CON IUREXIA
                                </div>
                                <ul className="space-y-4 mt-4">
                                    {[
                                        'Proyecto de sentencia con fundamento verificado — tú defines el criterio',
                                        'Jurisprudencia relevante sugerida para tu validación',
                                        'Estructura generada por IA: resultandos, considerandos, estudio de fondo — tú la perfeccionas',
                                        'Cada agravio analizado individualmente — el secretario valida y ajusta cada uno',
                                        '111,000+ precedentes reales para fortalecer tu argumentación',
                                        'Jurimetría: proyección estadística del sentido para orientar tu estrategia',
                                        'Más tiempo para razonar, menos para la mecánica',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-white/75">
                                            <span className="w-5 h-5 rounded-full bg-[#c9a962]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-[#c9a962]" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimateOnScroll>
                    </div>
                </div>
            </section>

            {/* ═══ FEATURES GRID ═══ */}
            <section id="features" className="py-24 px-4 bg-[#171614]">
                <div className="max-w-6xl mx-auto">
                    <AnimateOnScroll>
                        <div className="text-center mb-16">
                            <p className="text-[#c9a962] font-medium mb-4 tracking-wide text-sm">CAPACIDADES</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                                Una herramienta diseñada para <span className="text-[#c9a962]">tu flujo de trabajo</span>
                            </h2>
                        </div>
                    </AnimateOnScroll>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <FileText className="w-6 h-6" />,
                                title: 'Estudio de Fondo Completo',
                                desc: 'Genera un borrador de estudio de fondo con análisis individual de cada agravio o concepto de violación, fundado y motivado con normativa real.'
                            },
                            {
                                icon: <BookOpen className="w-6 h-6" />,
                                title: 'Jurisprudencia Automática',
                                desc: 'Búsqueda inteligente en nuestra base de tesis y jurisprudencias verificadas de la SCJN y Tribunales Colegiados, inyectada directamente en tu sentencia.'
                            },
                            {
                                icon: <Brain className="w-6 h-6" />,
                                title: 'IA con Razonamiento Legal',
                                desc: 'Modelo de razonamiento avanzado que analiza la estructura lógica de cada agravio y propone fundamentos — siempre bajo las instrucciones del secretario. La IA propone; el secretario decide.'
                            },
                            {
                                icon: <Gavel className="w-6 h-6" />,
                                title: 'Tribunales Colegiados',
                                desc: 'Proyectos de sentencia para amparo directo, amparo en revisión, recurso de queja y recurso de reclamación en Tribunales Colegiados de Circuito.'
                            },
                            {
                                icon: <Building2 className="w-6 h-6" />,
                                title: 'Juzgados de Distrito',
                                desc: 'Próximamente: soporte para sentencias de juzgados de distrito en materia de amparo indirecto. La herramienta crece conforme ingestamos más datos.'
                            },
                            {
                                icon: <Clock className="w-6 h-6" />,
                                title: 'De Horas a Minutos',
                                desc: 'La mecánica —buscar, estructurar, citar— en minutos. El tiempo liberado lo inviertes en lo que ninguna IA puede hacer: el razonamiento jurídico profundo y la calidad del fallo.'
                            },
                            {
                                icon: <Shield className="w-6 h-6" />,
                                title: 'Confidencialidad Total',
                                desc: 'Los documentos del expediente que subes son procesados con encriptación de grado militar. Nunca se almacenan ni se usan para entrenar modelos.'
                            },
                            {
                                icon: <TrendingUp className="w-6 h-6" />,
                                title: 'Mejora Continua',
                                desc: 'La base de datos se actualiza constantemente con nuevas leyes federales, estatales y jurisprudencia. Cada mes la herramienta es más completa.'
                            },
                            {
                                icon: <Sparkles className="w-6 h-6" />,
                                title: 'El Secretario dirige cada paso',
                                desc: 'Define el sentido del fallo, califica cada agravio, señala la normativa preferente. La IA actúa como auxiliar técnico bajo tu mando — no como tomador de decisiones.'
                            },
                            {
                                icon: <BookOpen className="w-6 h-6" />,
                                title: 'Precedentes Judiciales',
                                desc: 'Búsqueda semántica en 141,000+ sentencias reales de Tribunales Colegiados. 6 circuitos activos hoy — el corpus crece cada mes con nuevas sentencias y nuevos circuitos.',
                                badge: 'NUEVO'
                            },
                            {
                                icon: <TrendingUp className="w-6 h-6" />,
                                title: 'Jurimetría',
                                desc: 'Sube el acto reclamado y los agravios: la IA predice el sentido probable (Concede / Niega / Sobresee) con estadísticas reales de precedentes, análisis argumento por argumento y narrativa predictiva.',
                                badge: 'NUEVO'
                            },
                        ].map((feature, i) => (
                            <AnimateOnScroll key={i} delay={i * 0.08}>
                                <div className="group relative p-6 rounded-2xl bg-[#0f0e0d] border border-white/5 hover:border-[#c9a962]/30 transition-all duration-300 hover:-translate-y-1">
                                    {'badge' in feature && feature.badge && (
                                        <span className="absolute -top-2.5 -right-2.5 px-2 py-0.5 bg-[#c9a962] text-[#0f0e0d] text-[9px] font-bold rounded-full shadow-lg">
                                            {feature.badge}
                                        </span>
                                    )}
                                    <div className="w-12 h-12 rounded-xl bg-[#c9a962]/10 flex items-center justify-center text-[#c9a962] mb-4 group-hover:bg-[#c9a962]/20 transition-colors">
                                        {feature.icon}
                                    </div>
                                    <h3 className="font-serif text-lg font-medium mb-2 text-white">{feature.title}</h3>
                                    <p className="text-sm text-white/60 leading-relaxed">{feature.desc}</p>
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <AnimateOnScroll>
                        <div className="text-center mb-16">
                            <p className="text-[#c9a962] font-medium mb-4 tracking-wide text-sm">PROCESO</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium">
                                ¿Cómo funciona?
                            </h2>
                        </div>
                    </AnimateOnScroll>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: '01', title: 'Sube el expediente', desc: 'Carga los archivos PDF del toca o expediente. Los documentos se procesan cifrados y se eliminan automáticamente — nunca se almacenan.' },
                            { step: '02', title: 'Tú defines el criterio', desc: 'Estableces el sentido del fallo, calificas los agravios, señalas la normativa preferente. Cada instrucción es tuya.' },
                            { step: '03', title: 'La IA proyecta el borrador', desc: 'El motor genera un proyecto de sentencia con normativa y jurisprudencia real, siguiendo estrictamente tus instrucciones.' },
                            { step: '04', title: 'Tú revisas, enriqueces y firmas', desc: 'El borrador es tu punto de partida. Lo ajustas con tu criterio jurídico, lo perfeccionas y lo presentas al ponente.' },
                        ].map((item, i) => (
                            <AnimateOnScroll key={i} delay={i * 0.1}>
                                <div className="relative text-center">
                                    <div className="text-5xl font-bold text-[#c9a962]/10 mb-4">{item.step}</div>
                                    <h3 className="font-serif text-lg font-medium mb-2">{item.title}</h3>
                                    <p className="text-sm text-white/60">{item.desc}</p>
                                    {i < 3 && (
                                        <ArrowRight className="hidden md:block absolute -right-4 top-8 w-6 h-6 text-[#c9a962]/30" />
                                    )}
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ RESPONSIBLE USE ═══ */}
            <section className="py-16 px-4 bg-[#171614]">
                <div className="max-w-4xl mx-auto">
                    <AnimateOnScroll>
                        <div className="relative rounded-2xl border border-[#c9a962]/30 p-8 md:p-12 bg-gradient-to-br from-[#131211] to-[#171614]">
                            <div className="absolute -top-3 left-8 px-4 py-1 bg-[#c9a962]/15 border border-[#c9a962]/30 rounded-full">
                                <span className="text-[11px] font-bold text-[#c9a962] tracking-widest">USO RESPONSABLE</span>
                            </div>
                            <h3 className="font-serif text-2xl md:text-3xl font-medium text-white mb-3 mt-2">
                                El criterio es tuyo. <span className="text-[#c9a962]">Siempre.</span>
                            </h3>
                            <p className="text-white/60 mb-8 max-w-2xl leading-relaxed">
                                Iurexia no resuelve asuntos ni sustituye el juicio jurisdiccional. Es una herramienta que amplía la capacidad técnica del secretario — la responsabilidad del fallo permanece íntegramente en el operador jurídico.
                            </p>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    { icon: '⚖️', text: 'Tu criterio define el sentido del fallo — la IA lo proyecta, no lo determina' },
                                    { icon: '✍️', text: 'Tú calificas y validas cada agravio en cada etapa del proceso' },
                                    { icon: '📋', text: 'El borrador es un punto de partida técnico — tú lo enriqueces con tu razonamiento' },
                                    { icon: '🔒', text: 'La responsabilidad jurisdiccional es y siempre será del secretario y del magistrado ponente' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{item.icon}</span>
                                        <p className="text-sm text-white/75 leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* ═══ PRICING ═══ */}
            <section className="py-24 px-4 bg-gradient-to-b from-[#171614] to-[#0f0e0d]">
                <div className="max-w-4xl mx-auto">
                    <AnimateOnScroll>
                        <div className="text-center mb-12">
                            <p className="text-[#c9a962] font-medium mb-4 tracking-wide text-sm">PLAN EXCLUSIVO</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                                Plan Secretario <span className="text-[#c9a962]">PJF</span>
                            </h2>
                            <p className="text-white/60 max-w-2xl mx-auto">
                                Diseñado específicamente para Secretarios de Acuerdos, Proyectistas y funcionarios del Poder Judicial de la Federación.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <AnimateOnScroll delay={0.2} direction="scale">
                        <div className="relative rounded-2xl overflow-hidden">
                            {/* Card glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#c9a962]/20 to-transparent opacity-50" />
                            <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-[#171614] to-[#131211]" />

                            <div className="relative p-10 md:p-14">
                                {/* Badge */}
                                <div className="absolute top-0 right-8 px-4 py-2 bg-[#c9a962] text-[#0f0e0d] text-xs font-bold tracking-wider rounded-b-lg">
                                    EXCLUSIVO PJF
                                </div>

                                <div className="grid md:grid-cols-2 gap-10 items-center">
                                    <div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-6xl font-bold text-white">$999</span>
                                            <span className="text-xl text-white/60">MXN/mes</span>
                                        </div>
                                        <p className="text-white/45 mb-8">IVA incluido · Cancela cuando quieras</p>

                                        {/* YA SE PUEDE CONTRATAR. El botón decía «Próximamente»
                                            aunque el plan lleva meses dado de alta en Stripe:
                                            price_1T2MzR3uD85CqvjMW6MK8OyG, 999 MXN al mes, activo.
                                            Quien llegaba aquí decidido a pagar no tenía dónde. */}
                                        <Link
                                            href="/precios?plan=ultra_secretarios"
                                            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#c9a962] text-[#0f0e0d] font-bold text-lg rounded-xl whitespace-nowrap transition-colors hover:bg-[#d8bd7d]"
                                        >
                                            Contratar el plan
                                            <ArrowRight className="w-5 h-5" />
                                        </Link>
                                        <p className="text-center text-xs text-white/45 mt-3">
                                            Cancela cuando quieras · Sin compromiso
                                        </p>
                                        <p className="text-center text-xs text-white/45 mt-2">
                                            ¿Primero probarlo?{' '}
                                            <Link href="/tcc-beta" className="text-[#c9a962] underline underline-offset-2 hover:text-[#d8bd7d]">
                                                genera un proyecto gratis
                                            </Link>
                                        </p>
                                    </div>

                                    <div>
                                        <ul className="space-y-4">
                                            {[
                                                /* LAS CIFRAS DE VERDAD. Decía «20 proyectos» y «50
                                                   consultas», que eran las del plan cuando se escribió
                                                   la página. El plan da 560 consultas —las mismas que
                                                   Platinum— y 40 proyectos; anunciar de menos por un
                                                   texto viejo es vender peor de lo que se tiene. */
                                                '560 consultas al mes al chat de Iurexia, con todo lo premium incluido',
                                                '40 proyectos de sentencia al mes en el taller',
                                                'Recargas de 10 proyectos por $250 MXN, y no caducan',
                                                '20 GB para tus expedientes, con historial de tus proyectos',
                                                'Estudio de fondo fundado y motivado con normativa real',
                                                'Jurisprudencia de la SCJN y del Semanario, con su registro',
                                                'Descarga en formato DOCX editable, en tu plantilla',
                                                'Amparo directo, amparo en revisión, queja y revisión fiscal',
                                                'Instrucciones personalizadas del Secretario',
                                                'Soporte prioritario por correo',
                                            ].map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                                    <span className="text-white/75 text-sm">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* ═══ FAQ ═══ */}
            <section className="py-24 px-4">
                <div className="max-w-3xl mx-auto">
                    <AnimateOnScroll>
                        <div className="text-center mb-12">
                            <h2 className="font-serif text-3xl md:text-4xl font-medium">
                                Preguntas frecuentes
                            </h2>
                        </div>
                    </AnimateOnScroll>

                    <div className="space-y-4">
                        {[
                            {
                                q: '¿Iurexia redacta la sentencia final?',
                                a: 'No. Iurexia genera un borrador o proyecto de sentencia que el Secretario debe revisar, ajustar y complementar con su criterio jurídico. Es una herramienta de apoyo para hacer tu trabajo más eficiente, no un sustituto de tu labor jurisdiccional.'
                            },
                            {
                                q: '¿Qué tipos de sentencias puede generar?',
                                a: 'Actualmente genera proyectos para Tribunales Colegiados de Circuito: amparo directo, amparo en revisión, recurso de queja y recurso de reclamación. Próximamente se habilitará el soporte para Juzgados de Distrito en materia de amparo indirecto.'
                            },
                            {
                                q: '¿La normativa citada es real y verificada?',
                                a: 'Sí. Iurexia cuenta con una base de datos propia que incluye legislación federal, estatal, jurisprudencia de la SCJN y tesis de Tribunales Colegiados. Toda la normativa es verificada y actualizada constantemente. El borrador incluye las citas específicas para que puedas corroborarlas.'
                            },
                            {
                                q: '¿Mis expedientes son confidenciales?',
                                /* ESTO DECÍA «nunca almacenamos tus expedientes» Y HA DEJADO DE
                                   SER CIERTO: el taller los guarda desde que existe el historial de
                                   proyectos —son los 20 GB del plan— para que puedas volver a un
                                   asunto y regenerarlo. Lo que no se hace es entrenar con ellos, que
                                   es lo que de verdad preocupa. Una página que promete de más sobre
                                   privacidad es peor que una que no promete nada. */
                                a: 'Tus expedientes se guardan en tu cuenta —son los 20 GB del plan— para que puedas volver a un asunto, cambiarle el sentido y regenerarlo sin volver a subir nada. Lo que NO se hace, bajo cláusula expresa en los términos: no se usan para entrenar modelos, no se ceden a terceros y no se emplean para ninguna finalidad distinta de prestarte el servicio. Los proveedores de IA que contratamos operan con condiciones de no entrenamiento. Puedes borrar los documentos de un asunto cuando quieras, desde el propio taller.'
                            },
                            {
                                q: '¿Qué pasa si no uso los 40 proyectos del mes?',
                                a: 'Los proyectos del mes no se acumulan: la cuota se renueva al inicio de cada periodo. Lo que sí se guarda para siempre son las recargas: si compras 10 proyectos por $250 MXN, esos no caducan y se usan sólo después de agotar la cuota mensual. El plan incluye además 560 consultas al mes al chat de Iurexia, con todo lo premium: búsqueda jurídica, análisis de documentos y filtros por entidad.'
                            },
                            {
                                q: '¿Puedo cancelar en cualquier momento?',
                                a: 'Sí. No hay compromiso de permanencia. Puedes cancelar tu suscripción en cualquier momento y seguirás teniendo acceso hasta el final de tu periodo de facturación. No se realizan reembolsos, pero conservas el servicio hasta que termine el ciclo pagado.'
                            },
                        ].map((faq, i) => (
                            <AnimateOnScroll key={i} delay={i * 0.06}>
                                <FAQItemDark question={faq.q} answer={faq.a} />
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FINAL CTA ═══ */}
            <section className="py-24 px-4 bg-gradient-to-t from-[#0f0e0d] to-[#171614]">
                <div className="max-w-4xl mx-auto text-center">
                    <AnimateOnScroll>
                        <div className="flex justify-center items-center gap-3 mb-8">
                            <Scale className="w-8 h-8 text-[#c9a962]" />
                            <span className="font-serif text-4xl font-semibold tracking-tight">Iurex<span className="text-[#c9a962]">ia</span></span>
                        </div>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.1}>
                        <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                            Tu capacidad intelectual,<br />
                            <span className="text-[#c9a962]">multiplicada</span>
                        </h2>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.2}>
                        <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto">
                            Iurexia no pretende reemplazar el juicio del secretario — lo potencia. Tú defines el criterio, la IA hace la mecánica. El resultado es tuyo.
                        </p>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.3} direction="scale">
                        <Link
                            href="/tcc-beta"
                            className="inline-flex items-center gap-2 px-10 py-5 bg-[#c9a962] text-[#0f0e0d] font-bold text-lg rounded-xl whitespace-nowrap transition-colors hover:bg-[#d8bd7d]"
                        >
                            Genera tu primer proyecto gratis
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <p className="mt-4 text-sm text-white/45">
                            Sin tarjeta. Una prueba por cuenta.
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="py-8 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Scale className="w-5 h-5 text-[#c9a962]" />
                            <span className="font-serif text-lg font-semibold">Iurex<span className="text-[#c9a962]">ia</span></span>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link href="/precios" className="text-sm text-white/45 hover:text-white/75 transition-colors">
                                Otros planes
                            </Link>
                            <Link href="/privacidad" className="text-sm text-white/45 hover:text-white/75 transition-colors">
                                Privacidad
                            </Link>
                            <Link href="/terminos" className="text-sm text-white/45 hover:text-white/75 transition-colors">
                                Términos
                            </Link>
                        </div>
                        <p className="text-xs text-white/45">
                            © 2026 Iurexia. Todos los derechos reservados.
                        </p>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-xs text-white/45">
                            <strong>Nota:</strong> Iurexia es una herramienta de apoyo que no sustituye el criterio jurisdiccional del Secretario ni del Magistrado Ponente.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function FAQItemDark({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-white/10 rounded-xl overflow-hidden hover:border-[#c9a962]/20 transition-colors">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
            >
                <span className="font-medium text-white pr-4">{question}</span>
                <span className={`text-2xl text-[#c9a962] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-45' : ''}`}>
                    +
                </span>
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? '300px' : '0px', opacity: isOpen ? 1 : 0 }}
            >
                <div className="px-6 pb-6">
                    <p className="text-white/60 leading-relaxed">{answer}</p>
                </div>
            </div>
        </div>
    );
}
