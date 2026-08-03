'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Check, Zap, Crown, Star, Calendar, Loader2, AlertTriangle, ShieldCheck, Lock, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';
import Navbar from '@/components/Navbar';
import { AnimateOnScroll } from '@/hooks/useScrollAnimation';
import { PLANS } from '@/lib/stripe';

export default function PreciosPage() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const isAnnual = billingPeriod === 'annual';

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-12 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <AnimateOnScroll delay={0.1}>
                        <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                            Inversión transparente,
                            <br />
                            <span className="text-accent-gold">valor comprobado</span>
                        </h1>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.2}>
                        <p className="text-xl text-charcoal-600 max-w-3xl mx-auto mb-10">
                            Elige el plan que se adapte a tu práctica. Comienza gratis y escala cuando lo necesites. Cancela cuando quieras.
                        </p>
                    </AnimateOnScroll>

                    {/* Billing Period Toggle */}
                    <AnimateOnScroll delay={0.3}>
                        <div className="flex flex-col items-center gap-6">
                            <div className="flex items-center justify-center gap-3">
                                <div className="relative inline-flex items-center bg-charcoal-100 rounded-full p-1 shadow-inner">
                                    <button
                                        onClick={() => setBillingPeriod('monthly')}
                                        className={`relative z-10 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                            !isAnnual
                                                ? 'bg-charcoal-900 text-white shadow-lg'
                                                : 'text-charcoal-500 hover:text-charcoal-700'
                                        }`}
                                    >
                                        Mensual
                                    </button>
                                    <button
                                        onClick={() => setBillingPeriod('annual')}
                                        className={`relative z-10 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                            isAnnual
                                                ? 'bg-charcoal-900 text-white shadow-lg'
                                                : 'text-charcoal-500 hover:text-charcoal-700'
                                        }`}
                                    >
                                        Anual
                                    </button>
                                </div>
                                {isAnnual && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-accent-gold/15 border border-accent-gold/30 text-charcoal-900 text-xs font-bold animate-in fade-in slide-in-from-left-2 duration-300">
                                        <span>✨</span> Ahorra hasta 17%
                                    </span>
                                )}
                            </div>

                            {/* Founders Promotion Callout */}
                            <div className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg bg-gradient-to-r from-accent-gold/15 via-accent-gold/25 to-accent-gold/15 border border-accent-gold/40 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                                <span className="text-accent-gold text-base leading-none animate-pulse">✨</span>
                                <p className="text-xs sm:text-sm font-bold text-charcoal-900 tracking-wide">
                                    ¡Vuelven los precios de descuento para suscriptores fundadores por tiempo limitado! 🚀
                                </p>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Pricing Cards - Row 1: Gratuito, Pro Mensual, Pro Anual */}
            <section className="py-8 px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                        <AnimateOnScroll delay={0} className="h-full">
                            <PricingCard
                                icon={<Zap className="w-6 h-6" />}
                                name="Plan Gratuito"
                                price="$0"
                                originalPrice={null}
                                period="MXN"
                                description="Ideal para probar la plataforma"
                                features={[
                                    "5 consultas/mes",
                                    "Asistente de IA Básico",
                                    "Acceso a Leyes del Estado",
                                    "Búsqueda con IA en legislación mexicana verificada",
                                    "Filtros de jurisdicción",
                                    "Acceso a base documental completa",
                                    <span className="text-gray-400">Sin acceso a Genios Especializados ni Análisis</span>
                                ]}
                                buttonText="Comenzar Gratis"
                                buttonHref="/chat"
                                highlighted={false}
                            />
                        </AnimateOnScroll>

                        <AnimateOnScroll delay={0.1} className="h-full">
                            <PricingCard
                                icon={<ShieldCheck className="w-6 h-6" />}
                                name="Plan Básico"
                                price={isAnnual ? '$790' : '$79'}
                                originalPrice={isAnnual ? '$1,548' : '$129'}
                                period={isAnnual ? 'MXN/año' : 'MXN/mes'}
                                description={isAnnual ? 'Un solo pago, búsqueda garantizada todo el año' : 'Búsqueda rápida en la base de datos de Iurexia'}
                                savingsBadge={isAnnual ? 'Ahorras $158 MXN' : undefined}
                                features={[
                                    isAnnual ? <span className="font-bold">70 consultas/mes (840/año)</span> : "70 consultas/mes",
                                    "Asistente de IA Plus (Alta eficiencia)",
                                    "Búsqueda inteligente con IA en legislación mexicana",
                                    "Filtros de jurisdicción y entidad federativa",
                                    "Acceso a base documental completa",
                                    "Soporte estándar"
                                ]}
                                buttonText={isAnnual ? 'Elegir Básico Anual' : 'Elegir Básico'}
                                priceId={isAnnual ? PLANS.basico_annual?.priceId || undefined : PLANS.basico_monthly?.priceId || undefined}
                                highlighted={false}
                                isBasic={true}
                            />
                        </AnimateOnScroll>

                        <AnimateOnScroll delay={0.2} className="h-full">
                            <PricingCard
                                icon={<Crown className="w-6 h-6" />}
                                name="Plan Pro"
                                price={isAnnual ? '$1,490' : '$149'}
                                originalPrice={isAnnual ? '$2,988' : '$249'}
                                period={isAnnual ? 'MXN/año' : 'MXN/mes'}
                                description={isAnnual ? 'Un solo pago, todo el año cubierto' : 'Para profesionales que necesitan potencia'}
                                savingsBadge={isAnnual ? 'Ahorras $298 MXN' : undefined}
                                features={[
                                    <span className="text-accent-gold font-bold">140 consultas/mes</span>,
                                    <span className="text-accent-gold font-bold">IA Jurídica Avanzada (Análisis complejo y deducción)</span>,
                                    <span className="text-accent-gold font-medium">Arquitectura Multi-Genio (IA avanzada)</span>,
                                    <span className="text-accent-gold font-medium">Análisis de documentos (auditoría y mejoras)</span>,
                                    <span className="text-accent-gold font-medium">Precedentes Judiciales por Circuito — <span className="text-[10px] font-semibold">6 circuitos activos, creciendo</span></span>,
                                    <span className="flex items-center gap-1.5 font-bold text-white bg-gradient-to-r from-accent-gold/20 to-accent-brown/10 border border-accent-gold/30 rounded-lg px-3 py-2 -mx-1">
                                        <span className="text-accent-gold text-base leading-none">✦</span>
                                        <span className="text-accent-gold">Redacción Pro — Motor de razonamiento profundo</span>
                                        <span className="ml-auto text-[9px] bg-accent-gold text-charcoal-900 px-1.5 py-0.5 rounded-lg font-bold shrink-0">NUEVO</span>
                                    </span>,
                                    "Registra tu cédula para conectar clientes",
                                    "Búsqueda con IA verificado en constante actualización",
                                    "Filtros por entidad federativa + marco federal",
                                    <span className="text-accent-gold font-medium">📧 Mensaje de bienvenida con instrucciones para sacar el máximo provecho</span>,
                                    "Soporte prioritario"
                                ]}
                                buttonText={isAnnual ? 'Elegir Pro Anual' : 'Elegir Plan Pro'}
                                priceId={isAnnual ? PLANS.pro_annual.priceId || undefined : PLANS.pro_monthly.priceId || undefined}
                                highlighted={true}
                                badge="MÁS POPULAR"
                            />
                        </AnimateOnScroll>

                        <AnimateOnScroll delay={0.3} className="h-full">
                            <PricingCard
                                icon={<Star className="w-6 h-6" />}
                                name="Plan Platinum"
                                price={isAnnual ? '$5,990' : '$599'}
                                originalPrice={isAnnual ? '$9,588' : '$799'}
                                period={isAnnual ? 'MXN/año' : 'MXN/mes'}
                                description={isAnnual ? 'Máximo poder para tu despacho, todo el año' : 'Ideal para despachos y corporativos'}
                                savingsBadge={isAnnual ? 'Ahorras $1,198 MXN' : undefined}
                                features={[
                                    <span className="text-charcoal-900 font-bold">560 consultas/mes — ideal para despachos</span>,
                                    <span className="text-charcoal-900 font-bold">IA Jurídica de Élite (Máxima precisión argumentativa)</span>,
                                    <span className="text-charcoal-900 font-bold">Arquitectura Multi-Genio (IA avanzada)</span>,
                                    <span className="text-charcoal-900 font-bold">Análisis de documentos y auditoría</span>,
                                    <span className="text-charcoal-900 font-bold">Precedentes Judiciales por Circuito — <span className="text-[10px] font-semibold">6 circuitos activos, creciendo</span></span>,
                                    <span className="flex items-center gap-1.5 font-bold text-charcoal-900 bg-accent-gold/10 border border-accent-gold/40 rounded-lg px-3 py-2 -mx-1">
                                        <span className="text-accent-gold text-base leading-none">✦</span>
                                        <span className="text-charcoal-900 font-bold">Redacción Pro — Motor de razonamiento profundo</span>
                                    </span>,
                                    <span className="flex items-center gap-1.5 font-bold text-charcoal-900 bg-accent-gold/10 border border-accent-gold/40 rounded-lg px-3 py-2 -mx-1">
                                        <span className="text-accent-gold text-base leading-none">✦</span>
                                        <span className="text-charcoal-900 font-bold">Jurimetría — Predicción de sentido</span>
                                    </span>,
                                    <span className="flex items-center gap-1.5 font-bold text-charcoal-900 bg-gradient-to-r from-red-100 to-red-50 border border-red-200 rounded-lg px-3 py-2 -mx-1">
                                        <span className="text-charcoal-400 text-base leading-none">⚡</span>
                                        <span className="text-charcoal-900 font-bold">Redactor de Sentencias TCC</span>
                                        <span className="ml-auto text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-lg font-bold shrink-0">BETA</span>
                                    </span>,
                                    <span className="text-charcoal-900 font-bold">Registra tu cédula para conectar clientes</span>,
                                    <span className="text-charcoal-900 font-bold">Consulta personalizada con equipo legal de Iurexia (vía correo)</span>,
                                    <span className="text-charcoal-900 font-bold">📧 Mensaje de bienvenida con instrucciones premium</span>,
                                    <span className="text-charcoal-900 font-bold">Soporte VIP dedicado</span>
                                ]}
                                buttonText={isAnnual ? 'Elegir Platinum Anual' : 'Elegir Platinum'}
                                priceId={isAnnual ? PLANS.platinum_annual.priceId || undefined : PLANS.platinum_monthly.priceId || undefined}
                                highlighted={false}
                                isPlatinum={true}
                                badge="PREMIUM"
                            />
                        </AnimateOnScroll>
                    </div>
                </div>
            </section>

            {/* Trust Signal Strip */}
            <section className="py-6 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-charcoal-500 text-xs">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-accent-gold" />
                            <span>Pago seguro con <strong className="text-charcoal-700">Stripe</strong></span>
                        </div>
                        <span className="hidden sm:inline text-charcoal-300">·</span>
                        <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-accent-gold" />
                            <span>Cifrado SSL de extremo a extremo</span>
                        </div>
                        <span className="hidden sm:inline text-charcoal-300">·</span>
                        <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-charcoal-400" />
                            <span>Visa · Mastercard · AMEX</span>
                        </div>
                        <span className="hidden sm:inline text-charcoal-300">·</span>
                        <span>Cancela cuando quieras · Sin cargos ocultos</span>
                        <span className="hidden sm:inline text-charcoal-300">·</span>
                        <span>Tus datos y consultas son 100% confidenciales</span>
                    </div>
                </div>
            </section>

            {/* Ultra Secretarios — Jurimetría + Redactor */}
            <section className="py-10 px-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    <AnimateOnScroll delay={0.05}>
                        <div className="rounded-2xl bg-gradient-to-br from-[#0d1525] to-[#1a1a2e] border border-accent-gold/30 p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-accent-gold/15 border border-accent-gold/30 mb-4">
                                        <span className="text-[10px] font-bold text-accent-gold tracking-widest">PLAN ULTRA SECRETARIOS · $999 MXN/mes</span>
                                    </div>
                                    <h3 className="font-serif text-xl md:text-2xl font-medium text-white mb-3">
                                        Herramientas exclusivas para el<br />
                                        <span className="text-accent-gold">Poder Judicial de la Federación</span>
                                    </h3>
                                    <ul className="space-y-2 mb-4">
                                        {[
                                            { label: 'Redactor de Sentencias PJF', detail: 'Borradores con estudio de fondo, jurisprudencia inyectada y estructura TCC profesional' },
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                                <span className="w-4 h-4 rounded-full bg-accent-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-2.5 h-2.5 text-accent-gold" />
                                                </span>
                                                <span><strong className="text-white">{item.label}</strong> — {item.detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="shrink-0 max-w-xs">
                                    <p className="text-sm text-gray-400 leading-relaxed text-center md:text-left">
                                        <span className="text-accent-gold font-semibold">Versión beta disponible</span> para usuarios Platinum.
                                        La versión Ultra estará disponible próximamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Features Comparison */}
            <section className="py-20 bg-white border-t border-black/5 overflow-hidden">
                <div className="max-w-6xl mx-auto px-4">
                    <AnimateOnScroll>
                        <div className="text-center mb-12">
                            <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-4">
                                Comparación <span className="text-accent-gold">de planes</span>
                            </h2>
                            <p className="text-charcoal-600">
                                Todas las funciones incluidas según tu plan
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <AnimateOnScroll delay={0.2}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-4 px-3 font-medium text-charcoal-900">Característica</th>
                                        <th className="text-center py-4 px-3 font-medium text-charcoal-900">Gratuito</th>
                                        <th className="text-center py-4 px-3 font-medium text-charcoal-900">Básico</th>
                                        <th className="text-center py-4 px-3 font-medium text-charcoal-900 bg-accent-brown/5">Pro</th>
                                        <th className="text-center py-4 px-3 font-bold text-accent-gold bg-[#111425] border-x-2 border-t-2 border-accent-gold/40 rounded-t-2xl shadow-lg">Platinum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <ComparisonRow feature="Límite de Consultas" free="5 consultas/mes" basico="70 consultas/mes" pro="140 consultas/mes" platinum="560 consultas/mes" />
                                    <ComparisonRow feature="Búsqueda con IA verificada" free="✓" basico="✓" pro="✓" platinum="✓" />
                                    <ComparisonRow feature="Filtros jurisdiccionales" free="✓" basico="✓" pro="✓" platinum="✓" />
                                    <ComparisonRow feature="Base documental completa" free="✓" basico="✓" pro="✓" platinum="✓" />
                                    <ComparisonRow feature="Directorio de abogados (Connect)" free="✓" basico="✓" pro="✓" platinum="✓" />
                                    <ComparisonRow feature="Registro connect para captar clientes" free="—" basico="—" pro="✓" platinum="✓" />
                                    <ComparisonRow feature="Análisis y auditoría de documentos" free="—" basico="—" pro="✓" platinum="✓" goldFeature={true} />
                                    <ComparisonRow feature="Genios Especializados (IA avanzada)" free="—" basico="—" pro="✓" platinum="✓" goldFeature={true} />
                                    <ComparisonRow
                                        feature="Precedentes Judiciales por Circuito"
                                        free="—" basico="—"
                                        pro={<span className="inline-flex items-center gap-1 text-accent-gold font-semibold">✓ <span className="text-[9px]">6 circuitos</span></span>}
                                        platinum={<span className="inline-flex items-center gap-1 text-accent-gold font-semibold">✓ <span className="text-[9px]">6 circuitos</span></span>}
                                        goldFeature={true}
                                    />
                                    <ComparisonRow feature="Sugerencias con fundamento" free="—" basico="—" pro="✓" platinum="✓" goldFeature={true} />
                                    <ComparisonRow feature="Soporte prioritario" free="—" basico="Estándar" pro="✓" platinum="VIP" />
                                    <ComparisonRow feature="Consulta legal estratégica (vía correo)" free="—" basico="—" pro="—" platinum="✓" />
                                    <ComparisonRow
                                        feature={<span className="flex items-center gap-1.5 font-semibold text-accent-gold">Redacción Pro — Razonamiento profundo <span className="text-[9px] bg-accent-brown text-white px-1.5 py-0.5 rounded-lg font-bold">NUEVO</span></span>}
                                        free="—" basico="—" pro="✓"
                                        platinum="✓"
                                        goldFeature={true}
                                    />
                                    <ComparisonRow
                                        feature={<span className="flex items-center gap-1.5 font-semibold text-accent-gold">Jurimetría — Predicción de sentido</span>}
                                        free="—" basico="—" pro="—"
                                        platinum="✓"
                                        goldFeature={true}
                                    />
                                    <ComparisonRow
                                        feature={
                                            <span className="flex items-center gap-1.5 font-semibold text-charcoal-400">
                                                Redactor de Sentencias TCC
                                                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-lg font-bold">BETA</span>
                                            </span>
                                        }
                                        free="—"
                                        basico="—"
                                        pro="—"
                                        platinum={
                                            <span className="flex flex-col items-center">
                                                <span className="text-charcoal-400 font-bold">✓ (Beta)</span>
                                                <span className="text-[9px] text-gray-400 leading-none mt-0.5 font-normal">10 cons/gen</span>
                                            </span>
                                        }
                                        goldFeature={true}
                                        isLast={true}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-cream-300 overflow-hidden">
                <div className="max-w-4xl mx-auto px-4">
                    <AnimateOnScroll>
                        <div className="text-center mb-12">
                            <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-4">
                                Preguntas <span className="text-accent-gold">frecuentes</span>
                            </h2>
                        </div>
                    </AnimateOnScroll>

                    <div className="space-y-4">
                        {[
                            { question: '¿Qué son los Precedentes Judiciales y en qué planes están disponibles?', answer: 'Precedentes es una función de búsqueda semántica directa sobre sentencias reales de Tribunales Colegiados de Circuito. Actualmente cubre más de 141,000 sentencias de 6 circuitos (1° Ciudad de México, 2° Estado de México, 3° Jalisco, 4° Nuevo León, 16° Guanajuato y 22° Querétaro). El corpus crece continuamente: cada mes se ingresan nuevas sentencias y se incorporan más circuitos. Está disponible en los planes Pro y Platinum.' },
                            { question: '¿Qué es Redacción Pro y en qué planes está disponible?', answer: 'Redacción Pro es el modo de redacción más avanzado de Iurexia. Utiliza un motor de razonamiento profundo de última generación que produce textos legales de calidad significativamente superior al modo de redacción normal: argumentación más coherente, subsunción jurídica completa y prosa de nivel SCJN. Está disponible exclusivamente en los planes Pro y Platinum.' },
                            { question: '¿Qué es Jurimetría y en qué plan está disponible?', answer: 'Jurimetría es la herramienta más avanzada de Iurexia: predice el sentido probable de un asunto (Concede / Niega / Sobresee) analizando los precedentes del corpus completo. En modo básico basta describir el asunto; en modo Secretario puedes adjuntar el acto reclamado y los agravios como PDF y la IA analiza argumento por argumento, señalando cuáles son probablemente inoperantes, infundados o fundados — con base en sentencias reales, no en suposiciones. Está disponible exclusivamente en el plan Platinum.' },
                            { question: '¿Qué incluye una consulta?', answer: 'Una consulta es cada pregunta o solicitud que haces a Iurexia. Incluye la búsqueda en la base documental, el análisis con IA y la respuesta fundamentada. El análisis de documentos también cuenta como consultas según la complejidad del archivo.' },
                            { question: '¿Qué son los Genios Especializados y por qué son exclusivos PRO?', answer: 'Los Genios son una capa de inteligencia artificial avanzada especializada en materias específicas (Amparo, CIDH, Civil, Penal, etc.). Se activan con un clic dentro del chat (pudiendo usar hasta 2 al mismo tiempo) y utilizan un modelo de IA más potente para generar razonamientos jurídicos interdisciplinarios con fundamento verificado. Debido al alto costo computacional de este procesamiento complejo simultáneo, los Genios están disponibles exclusivamente para usuarios de los planes Pro y Platinum. Los usuarios gratuitos no tienen acceso a esta función.' },
                            { question: '¿Qué incluye el Plan Platinum?', answer: 'El Plan Platinum incluye todo lo del Plan Pro con capacidades premium máximas (incluyendo el Redactor de Sentencias TCC Beta y Jurimetría avanzada), bajo nuestra política de uso justo, y asesoría personalizada con el equipo legal de Iurexia vía correo electrónico. Es ideal para despachos y corporativos que necesitan la máxima potencia y volumen.' },
                            { question: '¿Puedo cambiar de plan en cualquier momento?', answer: 'Sí, puedes actualizar o cambiar tu plan en cualquier momento. Si subes de plan, el cambio es inmediato. Si bajas, el cambio aplica al siguiente ciclo de facturación.' },
                            { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe, la plataforma de pagos más segura del mundo.' },
                            { question: '¿Ofrecen reembolsos?', answer: 'Iurexia no ofrece reembolsos. Por eso ofrecemos 5 consultas gratuitas mensuales para que pruebes la plataforma antes de suscribirte. Si decides cancelar, conservas el acceso hasta el final de tu periodo de facturación.' },
                            { question: '¿Qué pasa si llego al límite de mi plan?', answer: 'Nuestros planes de pago operan bajo una Política de Uso Justo sumamente generosa. Si realizas un volumen inusualmente alto de consultas que ponga en riesgo la estabilidad del servicio, te notificaremos para ayudarte a ajustar tu uso o recomendarte un plan corporativo a tu medida.' },
                            { question: '¿Mis datos y consultas son confidenciales?', answer: 'Absolutamente. Iurexia utiliza cifrado SSL de extremo a extremo y no comparte, almacena ni utiliza el contenido de tus consultas para entrenar modelos de IA. Tus pagos son procesados por Stripe, la plataforma certificada PCI DSS Nivel 1 utilizada por empresas como Amazon, Shopify y BMW. Tu información nunca se expone.' },
                        ].map((faq, i) => (
                            <AnimateOnScroll key={i} delay={i * 0.08}>
                                <FAQItem question={faq.question} answer={faq.answer} />
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-charcoal-900 text-white overflow-hidden">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <AnimateOnScroll>
                        <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                            Potencia tu práctica legal <span className="text-accent-gold">hoy</span>
                        </h2>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.15}>
                        <p className="text-gray-300 mb-3 max-w-2xl mx-auto text-lg">
                            Más de 600 abogados ya confían en Iurexia para sus investigaciones jurídicas.
                        </p>
                        <p className="text-gray-500 mb-8 max-w-2xl mx-auto text-sm">
                            Comienza gratis o activa el Plan Pro para acceder a la Arquitectura Multi-Genio.
                        </p>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.3} direction="scale">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/precios#pro"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold rounded-lg transition-colors shadow-lg shadow-charcoal-900/20"
                            >
                                Activar Plan Pro — $149/mes
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="/chat"
                                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
                            >
                                Comenzar Gratis
                            </Link>
                        </div>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.5}>
                        <div className="flex items-center justify-center gap-4 mt-8 text-gray-500 text-xs">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-accent-gold" />
                                <span>Pago seguro con Stripe</span>
                            </div>
                            <span className="text-gray-700">·</span>
                            <span>Sin tarjeta para plan gratuito</span>
                            <span className="text-gray-700">·</span>
                            <span>Cancela cuando quieras</span>
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Nota de uso responsable */}
            <section className="py-8 bg-cream-200">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <p className="text-sm text-charcoal-500">
                        <strong>Nota de uso responsable:</strong> Iurexia no presta servicios legales directamente, ni pretende sustituir la asesoría profesional: orienta, organiza y fortalece el análisis; la estrategia y ejecución siempre deben ser acompañadas por un abogado.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-cream-300 border-t border-black/5">
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

function PricingCard({
    icon,
    name,
    price,
    originalPrice,
    period,
    description,
    features,
    buttonText,
    buttonHref,
    priceId,
    highlighted = false,
    isPlatinum = false,
    isBasic = false,
    badge,
    savingsBadge
}: {
    icon: React.ReactNode;
    name: string;
    price: string;
    originalPrice: string | null;
    period: string;
    description: string;
    features: React.ReactNode[];
    buttonText: string;
    buttonHref?: string;
    priceId?: string;
    highlighted?: boolean;
    isPlatinum?: boolean;
    isBasic?: boolean;
    badge?: string;
    savingsBadge?: string;
}) {
    const [loading, setLoading] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const { user } = useAuth();

    const handleSubscribe = async () => {
        if (!priceId) {
            console.error('❌ No priceId provided');
            alert('Error de configuración. Por favor contacta a soporte.');
            return;
        }

        // Check if user is logged in
        if (!user?.email) {
            console.warn('⚠️ User not logged in, redirecting to login');
            alert('Por favor inicia sesión para suscribirte.');
            window.location.href = '/login?redirect=/precios';
            return;
        }

        if (isBasic && !showWarning) {
            setShowWarning(true);
            return; // Detener flujo para mostrar modal
        }

        setLoading(true);
        try {
            console.log('🔄 Starting checkout with:', { priceId, email: user.email });
            await redirectToCheckout(priceId, user.email);
        } catch (error: any) {
            console.error('❌ Checkout error:', error);

            // More detailed error message
            const errorMessage = error?.message || 'Error desconocido';
            if (errorMessage.includes('Email is required')) {
                alert('Por favor inicia sesión para continuar.');
                window.location.href = '/login?redirect=/precios';
            } else if (errorMessage.includes('Price ID')) {
                alert('Error de configuración del plan. Por favor contacta a soporte.');
            } else {
                alert(`Error al procesar el pago: ${errorMessage}. Por favor intenta de nuevo o contacta a soporte.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const cardStyles = isPlatinum
        ? 'bg-cream-200 border-2 border-accent-gold/30 hover:shadow-xl hover:border-accent-gold/40'
        : highlighted
            ? 'bg-charcoal-900 text-white shadow-2xl relative z-10'
            : 'bg-white border border-black/5 hover:shadow-lg';

    const badgeStyles = isPlatinum
        ? 'bg-accent-gold text-charcoal-900'
        : highlighted
            ? 'bg-accent-brown text-white'
            : 'bg-charcoal-900 text-white';

    const buttonBaseStyles = `block w-full text-center py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;
    const buttonColorStyles = isPlatinum
        ? 'bg-charcoal-900 text-white hover:bg-charcoal-800'
        : highlighted
            ? 'bg-white text-charcoal-900 hover:bg-gray-100'
            : 'bg-charcoal-900 text-white hover:bg-charcoal-800';

    return (
        <div className={`relative rounded-3xl p-8 transition-all duration-300 flex flex-col h-full ${cardStyles}`}>
            {badge && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide ${badgeStyles}`}>
                    {badge}
                </div>
            )}

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isPlatinum
                ? 'bg-accent-gold/10 text-white'
                : highlighted
                    ? 'bg-white/10 text-white'
                    : 'bg-accent-brown/10 text-accent-brown'
                }`}>
                {icon}
            </div>

            <h3 className={`font-serif text-2xl font-medium mb-2 ${highlighted ? 'text-white' : 'text-charcoal-900'
                }`}>
                {name}
            </h3>

            <div className="mb-4">
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-charcoal-900'
                        }`}>
                        {price}
                    </span>
                    <span className={highlighted ? 'text-gray-400' : 'text-charcoal-500'}>
                        {period}
                    </span>
                </div>
                {originalPrice && (
                    <p className={`text-sm line-through ${highlighted ? 'text-gray-500' : 'text-charcoal-400'
                        }`}>
                        {originalPrice} {period}
                    </p>
                )}
                {savingsBadge && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-gold/15 border border-accent-gold/30">
                        <span className="text-xs font-bold text-accent-gold">✨ {savingsBadge}</span>
                    </div>
                )}
            </div>

            <p className={`text-sm mb-6 ${highlighted ? 'text-gray-400' : 'text-charcoal-600'
                }`}>
                {description}
            </p>

            <ul className="space-y-3 mb-8">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPlatinum
                            ? 'text-accent-gold'
                            : highlighted
                                ? 'text-accent-gold'
                                : 'text-accent-gold'
                            }`} />
                        <span className={`text-sm ${highlighted ? 'text-gray-300' : 'text-charcoal-700'
                            }`}>
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="mt-auto pt-6">
                {priceId ? (
                    <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className={`${buttonBaseStyles} ${buttonColorStyles} flex items-center justify-center gap-2`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            buttonText
                        )}
                    </button>
                ) : (
                    <Link
                        href={buttonHref || '/chat'}
                        className={`${buttonBaseStyles} ${buttonColorStyles}`}
                    >
                        {buttonText}
                    </Link>
                )}
            </div>

            {/* Modal Warning Básico */}
            {showWarning && isBasic && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-accent-gold/15 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-accent-gold" />
                        </div>
                        <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                            Aviso Importante
                        </h3>
                        <p className="text-charcoal-600 mb-6 text-sm">
                            El <strong>Plan Básico</strong> es excelente para búsquedas rápidas en nuestra base de datos, pero <span className="font-semibold text-charcoal-900">NO incluye el acceso a los Genios Especializados ni las Auditorías de Sentencias.</span>
                            <br /><br />
                            Si necesitas razonamiento jurídico avanzado, te recomendamos el <strong className="text-accent-gold">Plan Pro</strong>.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowWarning(false);
                                }}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-charcoal-900 text-white rounded-xl hover:bg-black transition-colors font-bold disabled:opacity-70"
                            >
                                Cambiar a Plan Pro — El favorito
                            </button>
                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className="w-full px-4 py-2 border border-charcoal-200 text-charcoal-500 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Procesando...' : 'Continuar con Plan Básico'}
                            </button>
                            <p className="text-xs text-charcoal-400 mt-1">Más del 80% de nuestros suscriptores eligen el Plan Pro.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ComparisonRow({ 
    feature, 
    free, 
    basico, 
    pro, 
    platinum, 
    goldFeature = false,
    isLast = false
}: { 
    feature: React.ReactNode; 
    free: React.ReactNode; 
    basico: React.ReactNode; 
    pro: React.ReactNode; 
    platinum: React.ReactNode; 
    goldFeature?: boolean;
    isLast?: boolean;
}) {
    // Detect exclusive Platinum features
    const isExclusive = free === '—' && basico === '—' && pro === '—';

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
            <td className={`py-4 px-3 ${goldFeature ? 'text-accent-gold font-medium' : 'text-charcoal-700'}`}>{feature}</td>
            <td className="py-4 px-3 text-center text-charcoal-600">{free}</td>
            <td className="py-4 px-3 text-center text-charcoal-600 font-medium bg-stone-50/50">{basico}</td>
            <td className="py-4 px-3 text-center text-charcoal-900 bg-accent-brown/5 font-medium">{pro}</td>
            <td className={`py-4 px-3 text-center font-medium border-x-2 border-accent-gold/30 shadow-md transition-all ${
                isExclusive 
                    ? "bg-[#0b0c10] text-[#c9a962] font-bold border-accent-gold/45 shadow-accent-gold/5" 
                    : "bg-[#111425] text-gray-200"
            } ${
                isLast ? "rounded-b-2xl border-b-2 border-accent-gold/45" : ""
            }`}>
                {platinum === "✓" ? (
                    <span className="text-accent-gold font-extrabold text-lg">✓</span>
                ) : (
                    platinum
                )}
            </td>
        </tr>
    );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
                <span className="font-medium text-charcoal-900">{question}</span>
                <span className={`text-2xl text-charcoal-400 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                    +
                </span>
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                    maxHeight: isOpen ? '200px' : '0px',
                    opacity: isOpen ? 1 : 0,
                }}
            >
                <div className="px-6 pb-6">
                    <p className="text-charcoal-600 leading-relaxed">{answer}</p>
                </div>
            </div>
        </div>
    );
}
