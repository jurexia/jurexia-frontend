'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Check, Zap, Crown, Star, Calendar, Loader2, AlertTriangle, ShieldCheck, Lock, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';
import Navbar from '@/components/Navbar';
import { AnimateOnScroll } from '@/hooks/useScrollAnimation';

export default function PreciosPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-12 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <AnimateOnScroll delay={0}>
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">PRECIOS</p>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.1}>
                        <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                            Inversión transparente,
                            <br />
                            <span className="text-accent-gold">valor comprobado</span>
                        </h1>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.2}>
                        <p className="text-xl text-charcoal-600 max-w-3xl mx-auto">
                            Elige el plan que se adapte a tu práctica. Comienza gratis y escala cuando lo necesites.
                        </p>
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
                                price="$79"
                                originalPrice="$149"
                                period="MXN/mes"
                                description="Búsqueda rápida en la base de datos legal de Iurexia"
                                features={[
                                    "70 consultas/mes",
                                    "Búsqueda inteligente en la base de datos legal de Iurexia",
                                    "Filtros de jurisdicción",
                                    "Acceso a base documental completa",
                                    <span className="text-gray-500">Sin acceso a Inteligencia Avanzada</span>
                                ]}
                                buttonText="Elegir Básico"
                                priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_BASICO_MONTHLY}
                                highlighted={false}
                                isBasic={true}
                            />
                        </AnimateOnScroll>

                        <AnimateOnScroll delay={0.2} className="h-full">
                            <PricingCard
                                icon={<Crown className="w-6 h-6" />}
                                name="Plan Pro"
                                price="$149"
                                originalPrice="$200"
                                period="MXN/mes"
                                description="Para profesionales que necesitan potencia"
                                features={[
                                    "140 consultas/mes",
                                    <span className="text-accent-gold font-medium">Arquitectura Multi-Genio (IA avanzada)</span>,
                                    <span className="text-accent-gold font-medium">Análisis de documentos (auditoría y mejoras)</span>,
                                    <span className="text-accent-gold font-medium">Precedentes Judiciales por Circuito — <span className="text-[10px] font-semibold">4 circuitos activos, creciendo</span></span>,
                                    "Registra tu cédula para conectar clientes",
                                    "Búsqueda con IA verificada en constante actualización",
                                    "Filtros por entidad federativa + marco federal",
                                    <span className="text-green-300 font-medium">📧 Mensaje de bienvenida con instrucciones para sacar el máximo provecho</span>,
                                    "Soporte prioritario"
                                ]}
                                buttonText="Elegir Plan Pro"
                                priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY}
                                highlighted={true}
                                badge="MÁS POPULAR"
                            />
                        </AnimateOnScroll>

                        <AnimateOnScroll delay={0.3} className="h-full">
                            <PricingCard
                                icon={<Star className="w-6 h-6" />}
                                name="Plan Platinum"
                                price="$599"
                                originalPrice="$900"
                                period="MXN/mes"
                                description="Ideal para despachos y corporativos"
                                features={[
                                    "560 consultas/mes — ideal para despachos",
                                    <span className="text-accent-gold font-medium">Arquitectura Multi-Genio (IA avanzada)</span>,
                                    <span className="text-accent-gold font-medium">Análisis de documentos y auditoría</span>,
                                    <span className="text-accent-gold font-medium">Precedentes Judiciales por Circuito — <span className="text-[10px] font-semibold">4 circuitos activos, creciendo</span></span>,
                                    "Registra tu cédula para conectar clientes",
                                    "Consulta personalizada con equipo legal de Iurexia (vía correo)",
                                    <span className="text-amber-600 font-medium">📧 Mensaje de bienvenida con instrucciones premium</span>,
                                    "Soporte VIP dedicado"
                                ]}
                                buttonText="Elegir Platinum"
                                priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PLATINUM_MONTHLY}
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
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            <span>Pago seguro con <strong className="text-charcoal-700">Stripe</strong></span>
                        </div>
                        <span className="hidden sm:inline text-charcoal-300">·</span>
                        <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-green-500" />
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
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-gold/15 border border-accent-gold/30 mb-4">
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
                                <div className="shrink-0">
                                    <Link
                                        href="/secretarios"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-gold text-charcoal-900 font-bold text-sm hover:bg-accent-gold/90 transition-all shadow-lg shadow-accent-gold/20 whitespace-nowrap"
                                    >
                                        Ver Plan Ultra
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
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
                                        <th className="text-center py-4 px-3 font-medium text-charcoal-900 bg-gradient-to-r from-amber-50 to-yellow-50">Platinum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <ComparisonRow feature="Consultas/mes" free="5" basico="70" pro="140" platinum="560" />
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
                                        pro={<span className="inline-flex items-center gap-1 text-accent-gold font-semibold">✓ <span className="text-[9px]">4 circuitos</span></span>}
                                        platinum={<span className="inline-flex items-center gap-1 text-accent-gold font-semibold">✓ <span className="text-[9px]">4 circuitos</span></span>}
                                        goldFeature={true}
                                    />
                                    <ComparisonRow feature="Sugerencias con fundamento" free="—" basico="—" pro="✓" platinum="✓" goldFeature={true} />
                                    <ComparisonRow feature="Soporte prioritario" free="—" basico="Estándar" pro="✓" platinum="VIP" />
                                    <ComparisonRow feature="Consulta legal estratégica (vía correo)" free="—" basico="—" pro="—" platinum="✓" />
                                    <ComparisonRow
                                        feature={<span className="flex items-center gap-1.5 font-semibold text-accent-gold">Jurimetría — Predicción de sentido <span className="text-[9px] bg-accent-brown text-white px-1.5 py-0.5 rounded-full font-bold">NUEVO</span></span>}
                                        free="—" basico="—" pro="—"
                                        platinum="✓"
                                        goldFeature={true}
                                    />
                                    <ComparisonRow
                                        feature={<span className="flex items-center gap-1.5 font-semibold text-[#c9a962]">Redactor de Sentencias PJF <span className="text-[9px] bg-[#c9a962] text-white px-1.5 py-0.5 rounded-full font-bold">ULTRA</span></span>}
                                        free="—" basico="—" pro="—"
                                        platinum={<Link href="/secretarios" className="text-[#c9a962] font-bold hover:underline text-xs whitespace-nowrap">Ver plan Ultra →</Link>}
                                        goldFeature={true}
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
                            { question: '¿Qué son los Precedentes Judiciales y en qué planes están disponibles?', answer: 'Precedentes es una función de búsqueda semántica directa sobre sentencias reales de Tribunales Colegiados de Circuito. Actualmente cubre más de 111,000 sentencias de 4 circuitos (1° Ciudad de México, 2° Estado de México, 4° Nuevo León y 22° Querétaro). El corpus crece continuamente: cada mes se ingresan nuevas sentencias y se incorporan más circuitos. Está disponible en los planes Pro y Platinum.' },
                            { question: '¿Qué es Jurimetría y en qué plan está disponible?', answer: 'Jurimetría es la herramienta más avanzada de Iurexia: predice el sentido probable de un asunto (Concede / Niega / Sobresee) analizando los precedentes del corpus completo. En modo básico basta describir el asunto; en modo Secretario puedes adjuntar el acto reclamado y los agravios como PDF y la IA analiza argumento por argumento, señalando cuáles son probablemente inoperantes, infundados o fundados — con base en sentencias reales, no en suposiciones. Está disponible exclusivamente en el plan Platinum.' },
                            { question: '¿Qué incluye una consulta?', answer: 'Una consulta es cada pregunta o solicitud que haces a Iurexia. Incluye la búsqueda en la base documental, el análisis con IA y la respuesta fundamentada. El análisis de documentos también cuenta como consultas según la complejidad del archivo.' },
                            { question: '¿Qué son los Genios Especializados y por qué son exclusivos PRO?', answer: 'Los Genios son una capa de inteligencia artificial avanzada especializada en materias específicas (Amparo, CIDH, Civil, Penal, etc.). Se activan con un clic dentro del chat (pudiendo usar hasta 2 al mismo tiempo) y utilizan un modelo de IA más potente para generar razonamientos jurídicos interdisciplinarios con fundamento verificado. Debido al alto costo computacional de este procesamiento complejo simultáneo, los Genios están disponibles exclusivamente para usuarios de los planes Pro y Platinum. Los usuarios gratuitos no tienen acceso a esta función.' },
                            { question: '¿Qué incluye el Plan Platinum?', answer: 'El Plan Platinum incluye todo lo del Plan Pro más 560 consultas al mes y asesoría personalizada con el equipo legal de Iurexia vía correo electrónico. Es ideal para despachos y corporativos que necesitan un volumen alto de consultas. Un abogado de nuestro equipo te contestará a la brevedad para orientarte sobre tu estrategia legal.' },
                            { question: '¿Puedo cambiar de plan en cualquier momento?', answer: 'Sí, puedes actualizar o cambiar tu plan en cualquier momento. Si subes de plan, el cambio es inmediato. Si bajas, el cambio aplica al siguiente ciclo de facturación.' },
                            { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe, la plataforma de pagos más segura del mundo.' },
                            { question: '¿Ofrecen reembolsos?', answer: 'Iurexia no ofrece reembolsos. Por eso ofrecemos 5 consultas gratuitas mensuales para que pruebes la plataforma antes de suscribirte. Si decides cancelar, conservas el acceso hasta el final de tu periodo de facturación.' },
                            { question: '¿Qué pasa si se acaban mis consultas?', answer: 'Te notificaremos cuando te queden pocas consultas. Puedes esperar al siguiente mes o actualizar a un plan con más consultas en cualquier momento. Al hacer upgrade, tu plan anterior se cancela automáticamente sin cobros dobles. El Plan Platinum incluye 560 consultas al mes, ideal para despachos y corporativos.' },
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
                                className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-colors shadow-lg shadow-green-500/20"
                            >
                                Activar Plan Pro — $149/mes
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="/chat"
                                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-colors"
                            >
                                Comenzar Gratis
                            </Link>
                        </div>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.5}>
                        <div className="flex items-center justify-center gap-4 mt-8 text-gray-500 text-xs">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
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
    badge
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
        ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 hover:shadow-xl hover:border-amber-300'
        : highlighted
            ? 'bg-charcoal-900 text-white shadow-2xl relative z-10'
            : 'bg-white border border-black/5 hover:shadow-lg';

    const badgeStyles = isPlatinum
        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
        : highlighted
            ? 'bg-accent-brown text-white'
            : 'bg-green-500 text-white';

    const buttonBaseStyles = `block w-full text-center py-3 px-6 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;
    const buttonColorStyles = isPlatinum
        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
        : highlighted
            ? 'bg-white text-charcoal-900 hover:bg-gray-100'
            : 'bg-charcoal-900 text-white hover:bg-charcoal-800';

    return (
        <div className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${cardStyles}`}>
            {badge && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${badgeStyles}`}>
                    {badge}
                </div>
            )}

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isPlatinum
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
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
            </div>

            <p className={`text-sm mb-6 ${highlighted ? 'text-gray-400' : 'text-charcoal-600'
                }`}>
                {description}
            </p>

            <ul className="space-y-3 mb-8">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPlatinum
                            ? 'text-amber-500'
                            : highlighted
                                ? 'text-green-400'
                                : 'text-green-500'
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
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-600" />
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

function ComparisonRow({ feature, free, basico, pro, platinum, goldFeature = false }: { feature: React.ReactNode; free: React.ReactNode; basico: React.ReactNode; pro: React.ReactNode; platinum: React.ReactNode; goldFeature?: boolean }) {
    return (
        <tr className="border-b border-gray-100">
            <td className={`py-4 px-3 ${goldFeature ? 'text-accent-gold font-medium' : 'text-charcoal-700'}`}>{feature}</td>
            <td className="py-4 px-3 text-center text-charcoal-600">{free}</td>
            <td className="py-4 px-3 text-center text-charcoal-600 font-medium bg-stone-50/50">{basico}</td>
            <td className="py-4 px-3 text-center text-charcoal-900 bg-accent-brown/5 font-medium">{pro}</td>
            <td className="py-4 px-3 text-center text-charcoal-900 bg-gradient-to-r from-amber-50 to-yellow-50 font-medium">{platinum}</td>
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
