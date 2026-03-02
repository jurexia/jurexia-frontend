'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
    Scale, ArrowRight, Check, Shield, FileText, Brain,
    Clock, Gavel, BookOpen, Sparkles, ChevronDown,
    Building2, Users, Zap, Award, Lock, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';
import Navbar from '@/components/Navbar';
import { AnimateOnScroll } from '@/hooks/useScrollAnimation';

export default function SecretariosPage() {
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleSubscribe = async () => {
        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA_SECRETARIOS;
        if (!priceId) {
            alert('El plan estará disponible próximamente. Contáctanos para más información.');
            return;
        }
        if (!user?.email) {
            window.location.href = '/login?redirect=/secretarios';
            return;
        }
        setLoading(true);
        try {
            await redirectToCheckout(priceId, user.email);
        } catch (error: any) {
            alert(`Error al procesar: ${error?.message || 'Intenta de nuevo.'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0a0f1a] text-white overflow-hidden">
            <Navbar />

            {/* ═══ HERO SECTION ═══ */}
            <section className="relative pt-28 pb-20 px-4">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] via-[#0d1525] to-[#0a0f1a]" />
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
                                    Redacción inteligente de{' '}
                                    <span className="text-[#c9a962]">sentencias federales</span>
                                </h1>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.2}>
                                <p className="text-lg text-gray-400 leading-relaxed mb-8 max-w-xl">
                                    Un borrador de sentencia <strong className="text-white">fundado y motivado</strong> con normativa real extraída de nuestra base de datos verificada.
                                    Tú decides, tú corriges, tú firmas — nosotros aceleramos tu trabajo.
                                </p>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.3}>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        disabled={true}
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-700 text-gray-400 font-bold rounded-full cursor-not-allowed opacity-80"
                                    >
                                        Próximamente
                                    </button>
                                    <a
                                        href="#features"
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-all"
                                    >
                                        Conocer más
                                        <ChevronDown className="w-4 h-4" />
                                    </a>
                                </div>
                                <a
                                    href="mailto:soporte@iurexia.com?subject=Solicitud%20de%20prueba%20—%20Plan%20Secretario%20PJF&body=Hola%2C%20me%20gustaría%20solicitar%20una%20prueba%20de%20la%20función%20Redactor%20de%20Sentencias.%0A%0AMi%20correo%20de%20registro%20en%20Iurexia%20es%3A%20"
                                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#c9a962] transition-colors mt-2 group"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-[#c9a962]/60 group-hover:text-[#c9a962] transition-colors" />
                                    ¿Quieres una prueba antes de suscribirte?{' '}
                                    <span className="text-[#c9a962] underline underline-offset-2 decoration-[#c9a962]/40 group-hover:decoration-[#c9a962]">
                                        Solicítala aquí
                                    </span>
                                </a>
                            </AnimateOnScroll>

                            <AnimateOnScroll delay={0.4}>
                                <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/10">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#c9a962]">20</div>
                                        <div className="text-xs text-gray-500">sentencias/mes</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#c9a962]">50</div>
                                        <div className="text-xs text-gray-500">consultas/mes</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#c9a962]">24/7</div>
                                        <div className="text-xs text-gray-500">disponible</div>
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
                                    <div className="relative w-64 h-64 rounded-full bg-gradient-to-br from-[#1a1a6b] to-[#111840] border border-[#c9a962]/30 flex items-center justify-center shadow-2xl shadow-[#c9a962]/10 overflow-hidden">
                                        <Image
                                            src="/pjf-escudo.png"
                                            alt="Poder Judicial de la Federación"
                                            width={220}
                                            height={220}
                                            className="rounded-full object-cover"
                                        />
                                    </div>
                                    {/* Floating badges */}
                                    <div className="absolute -top-2 -right-2 px-3 py-1.5 bg-[#c9a962] text-[#0a0f1a] text-xs font-bold rounded-full shadow-lg">
                                        NUEVO
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#111827] border border-[#c9a962]/30 rounded-full">
                                        <span className="text-xs text-[#c9a962] font-medium">Plan Secretario PJF</span>
                                    </div>
                                </div>
                            </div>
                        </AnimateOnScroll>
                    </div>
                </div>
            </section>

            {/* ═══ TRUST BAR ═══ */}
            <section className="py-6 bg-[#111827] border-y border-white/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-gray-500 text-sm">
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
                            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                                Revisar actas, identificar agravios, buscar jurisprudencia aplicable, fundar y motivar cada concepto de violación...
                                Iurexia te entrega un borrador estructurado para que te concentres en lo que importa: <strong className="text-white">tu criterio jurídico</strong>.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Before */}
                        <AnimateOnScroll delay={0.1}>
                            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-red-950/30 to-[#111827] border border-red-900/30">
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
                                        <li key={i} className="flex items-start gap-3 text-gray-400">
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
                            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#c9a962]/10 to-[#111827] border border-[#c9a962]/30">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-[#c9a962]/20 border border-[#c9a962]/30 rounded-full text-xs text-[#c9a962] font-medium">
                                    CON IUREXIA
                                </div>
                                <ul className="space-y-4 mt-4">
                                    {[
                                        'Borrador con fundamento legal verificado en minutos',
                                        'Jurisprudencia relevante inyectada automáticamente',
                                        'Estructura profesional: resultandos, considerandos, estudio de fondo',
                                        'Cada agravio analizado individualmente con fundamento',
                                        'Más tiempo para tu criterio, menos para la mecánica',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-300">
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
            <section id="features" className="py-24 px-4 bg-[#111827]">
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
                                desc: 'Modelo de inteligencia artificial con modo de razonamiento avanzado que analiza la estructura lógica de cada agravio antes de redactar.'
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
                                desc: 'Lo que antes tardaba una jornada completa, ahora se obtiene en minutos. Tú revisas, ajustas y aplicas tu criterio — nosotros hacemos la mecánica.'
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
                                title: 'Instrucciones del Secretario',
                                desc: 'Escribe tus instrucciones: sentido del fallo, calificación de agravios, normativa preferente. La IA sigue tus indicaciones como un auxiliar.'
                            },
                        ].map((feature, i) => (
                            <AnimateOnScroll key={i} delay={i * 0.08}>
                                <div className="group p-6 rounded-2xl bg-[#0a0f1a] border border-white/5 hover:border-[#c9a962]/30 transition-all duration-300 hover:-translate-y-1">
                                    <div className="w-12 h-12 rounded-xl bg-[#c9a962]/10 flex items-center justify-center text-[#c9a962] mb-4 group-hover:bg-[#c9a962]/20 transition-colors">
                                        {feature.icon}
                                    </div>
                                    <h3 className="font-serif text-lg font-medium mb-2 text-white">{feature.title}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
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
                            { step: '01', title: 'Sube el expediente', desc: 'Carga los archivos PDF del toca o expediente del asunto.' },
                            { step: '02', title: 'Dicta instrucciones', desc: 'Indica el sentido del fallo, califica los agravios, da tu directriz jurídica.' },
                            { step: '03', title: 'La IA redacta', desc: 'Nuestro motor genera el borrador con normativa y jurisprudencia real.' },
                            { step: '04', title: 'Tú revisas y firmas', desc: 'Descarga el DOCX, ajusta lo que necesites y preséntalo al ponente.' },
                        ].map((item, i) => (
                            <AnimateOnScroll key={i} delay={i * 0.1}>
                                <div className="relative text-center">
                                    <div className="text-5xl font-bold text-[#c9a962]/10 mb-4">{item.step}</div>
                                    <h3 className="font-serif text-lg font-medium mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-400">{item.desc}</p>
                                    {i < 3 && (
                                        <ArrowRight className="hidden md:block absolute -right-4 top-8 w-6 h-6 text-[#c9a962]/30" />
                                    )}
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ PRICING ═══ */}
            <section className="py-24 px-4 bg-gradient-to-b from-[#111827] to-[#0a0f1a]">
                <div className="max-w-4xl mx-auto">
                    <AnimateOnScroll>
                        <div className="text-center mb-12">
                            <p className="text-[#c9a962] font-medium mb-4 tracking-wide text-sm">PLAN EXCLUSIVO</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                                Plan Secretario <span className="text-[#c9a962]">PJF</span>
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                Diseñado específicamente para Secretarios de Acuerdos, Proyectistas y funcionarios del Poder Judicial de la Federación.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <AnimateOnScroll delay={0.2} direction="scale">
                        <div className="relative rounded-3xl overflow-hidden">
                            {/* Card glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#c9a962]/20 to-transparent opacity-50" />
                            <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-br from-[#111827] to-[#0d1525]" />

                            <div className="relative p-10 md:p-14">
                                {/* Badge */}
                                <div className="absolute top-0 right-8 px-4 py-2 bg-[#c9a962] text-[#0a0f1a] text-xs font-bold tracking-wider rounded-b-lg">
                                    EXCLUSIVO PJF
                                </div>

                                <div className="grid md:grid-cols-2 gap-10 items-center">
                                    <div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-6xl font-bold text-white">$999</span>
                                            <span className="text-xl text-gray-400">MXN/mes</span>
                                        </div>
                                        <p className="text-gray-500 mb-8">IVA incluido · Cancela cuando quieras</p>

                                        <button
                                            disabled={true}
                                            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-700 text-gray-400 font-bold text-lg rounded-full cursor-not-allowed opacity-80"
                                        >
                                            Próximamente
                                        </button>
                                        <p className="text-center text-xs text-gray-500 mt-3">
                                            14 días de garantía de devolución
                                        </p>
                                    </div>

                                    <div>
                                        <ul className="space-y-4">
                                            {[
                                                'Hasta 20 proyectos de sentencia por mes',
                                                'Estudio de fondo fundado y motivado con normativa real',
                                                'Jurisprudencia de SCJN inyectada automáticamente',
                                                'Descarga en formato DOCX editable',
                                                'Tribunales Colegiados de Circuito',
                                                'Juzgados de Distrito (próximamente)',
                                                'Instrucciones personalizadas del Secretario',
                                                'Base de datos en constante crecimiento',
                                                '50 consultas de IA legal general incluidas',
                                                'Soporte prioritario por correo',
                                            ].map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-[#c9a962] flex-shrink-0 mt-0.5" />
                                                    <span className="text-gray-300 text-sm">{feature}</span>
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
                                a: 'Absolutamente. Los archivos que subes son procesados temporalmente con encriptación de grado militar y eliminados automáticamente. Nunca almacenamos tus expedientes ni los usamos para entrenar modelos de IA. Tu información está protegida.'
                            },
                            {
                                q: '¿Qué pasa si no uso las 20 sentencias del mes?',
                                a: 'Las sentencias no utilizadas no se acumulan al siguiente mes. Sin embargo, el plan incluye también 50 consultas de IA legal general que puedes usar para investigación jurídica, análisis de documentos y más.'
                            },
                            {
                                q: '¿Puedo cancelar en cualquier momento?',
                                a: 'Sí. No hay compromiso de permanencia. Puedes cancelar tu suscripción en cualquier momento y seguirás teniendo acceso hasta el final de tu periodo de facturación. Además, ofrecemos 14 días de garantía de devolución.'
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
            <section className="py-24 px-4 bg-gradient-to-t from-[#0a0f1a] to-[#111827]">
                <div className="max-w-4xl mx-auto text-center">
                    <AnimateOnScroll>
                        <div className="flex justify-center items-center gap-3 mb-8">
                            <Scale className="w-8 h-8 text-[#c9a962]" />
                            <span className="font-serif text-4xl font-semibold tracking-tight">Iurex<span className="text-[#c9a962]">ia</span></span>
                        </div>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.1}>
                        <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                            Haz más con menos esfuerzo
                        </h2>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.2}>
                        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
                            Únete a los Secretarios que ya usan Iurexia para optimizar la redacción de sentencias federales.
                            Tu criterio jurídico, potenciado por inteligencia artificial.
                        </p>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.3} direction="scale">
                        <button
                            disabled={true}
                            className="inline-flex items-center gap-2 px-10 py-5 bg-gray-700 text-gray-400 font-bold text-lg rounded-full cursor-not-allowed opacity-80"
                        >
                            Próximamente
                        </button>
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
                            <Link href="/precios" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                                Otros planes
                            </Link>
                            <Link href="/privacidad" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                                Privacidad
                            </Link>
                            <Link href="/terminos" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                                Términos
                            </Link>
                        </div>
                        <p className="text-xs text-gray-600">
                            © 2026 Iurexia. Todos los derechos reservados.
                        </p>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-600">
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
                    <p className="text-gray-400 leading-relaxed">{answer}</p>
                </div>
            </div>
        </div>
    );
}
