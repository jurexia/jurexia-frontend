'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Check, Zap, Crown, Star, Calendar, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';

export default function PreciosPage() {
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
                            <Link href="/plataforma" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Plataforma</Link>
                            <Link href="/soluciones" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Soluciones</Link>
                            <span className="text-sm font-medium text-charcoal-900 border-b-2 border-charcoal-900">Precios</span>
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
            <section className="pt-32 pb-12 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <p className="text-accent-brown font-medium mb-4 tracking-wide">PRECIOS</p>
                    <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                        Inversión transparente,
                        <br />
                        <span className="text-charcoal-500">valor comprobado</span>
                    </h1>
                    <p className="text-xl text-charcoal-600 max-w-3xl mx-auto">
                        Elige el plan que se adapte a tu práctica. Comienza gratis y escala cuando lo necesites.
                    </p>
                </div>
            </section>

            {/* Pricing Cards - Row 1: Gratuito, Pro Mensual, Pro Anual */}
            <section className="py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        {/* Plan Gratuito */}
                        <PricingCard
                            icon={<Zap className="w-6 h-6" />}
                            name="Plan Gratuito"
                            price="$0"
                            originalPrice={null}
                            period="MXN"
                            description="Ideal para probar la plataforma"
                            features={[
                                "5 consultas/mes",
                                "Búsqueda jurídica con RAG",
                                "Filtros de jurisdicción",
                                "Acceso a base documental completa"
                            ]}
                            buttonText="Comenzar Gratis"
                            buttonHref="/chat"
                            highlighted={false}
                        />

                        {/* Plan Pro Mensual */}
                        <PricingCard
                            icon={<Crown className="w-6 h-6" />}
                            name="Plan Pro"
                            price="$149"
                            originalPrice="$200"
                            period="MXN/mes"
                            description="Para profesionales que necesitan potencia"
                            features={[
                                "170 consultas/mes",
                                "RAG jurídico sin alucinaciones",
                                "Análisis de documentos (auditoría y mejoras)",
                                "Filtros por entidad federativa + marco federal",
                                "Soporte prioritario"
                            ]}
                            buttonText="Elegir Plan Pro"
                            priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY}
                            highlighted={true}
                            badge="MÁS POPULAR"
                        />

                        {/* Plan Pro Anual */}
                        <PricingCard
                            icon={<Calendar className="w-6 h-6" />}
                            name="Plan Pro Anual"
                            price="$1,490"
                            originalPrice="$2,400"
                            period="MXN/año"
                            description="Máximo ahorro por pago adelantado"
                            features={[
                                "170 consultas/mes (2,040/año)",
                                "Todo lo del Plan Pro incluido",
                                "Ahorro de $910 MXN al año",
                                "Precio fijo garantizado",
                                "Soporte prioritario"
                            ]}
                            buttonText="Ahorrar con Plan Anual"
                            priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL}
                            highlighted={false}
                            badge="MEJOR VALOR"
                        />
                    </div>

                    {/* Row 2: Platinum Plans */}
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {/* Plan Platinum Mensual */}
                        <PricingCard
                            icon={<Star className="w-6 h-6" />}
                            name="Plan Platinum"
                            price="$599"
                            originalPrice="$900"
                            period="MXN/mes"
                            description="Asesoría personalizada con equipo legal"
                            features={[
                                "Todo lo del Plan Pro incluido",
                                "Consultas ilimitadas",
                                "Consulta personalizada con equipo legal de Iurexia",
                                "Contrato de prestación de servicios profesionales",
                                "Asesoría legal especializada",
                                "Soporte VIP dedicado"
                            ]}
                            buttonText="Elegir Platinum"
                            priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PLATINUM_MONTHLY}
                            highlighted={false}
                            isPlatinum={true}
                            badge="PREMIUM"
                        />

                        {/* Plan Platinum Anual */}
                        <PricingCard
                            icon={<Star className="w-6 h-6" />}
                            name="Plan Platinum Anual"
                            price="$5,990"
                            originalPrice="$10,800"
                            period="MXN/año"
                            description="Máximo ahorro + asesoría premium"
                            features={[
                                "Todo lo del Plan Platinum incluido",
                                "Consultas ilimitadas todo el año",
                                "Asesoría legal personalizada continua",
                                "Ahorro de $4,810 MXN al año",
                                "Precio fijo garantizado",
                                "Soporte VIP dedicado"
                            ]}
                            buttonText="Ahorrar con Platinum Anual"
                            priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PLATINUM_ANNUAL}
                            highlighted={false}
                            isPlatinum={true}
                            badge="MÁXIMO AHORRO"
                        />
                    </div>
                </div>
            </section>

            {/* Features Comparison */}
            <section className="py-20 bg-white border-t border-black/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-4">
                            Comparación de planes
                        </h2>
                        <p className="text-charcoal-600">
                            Todas las funciones incluidas según tu plan
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-4 px-3 font-medium text-charcoal-900">Característica</th>
                                    <th className="text-center py-4 px-3 font-medium text-charcoal-900">Gratuito</th>
                                    <th className="text-center py-4 px-3 font-medium text-charcoal-900 bg-accent-brown/5">Pro</th>
                                    <th className="text-center py-4 px-3 font-medium text-charcoal-900">Pro Anual</th>
                                    <th className="text-center py-4 px-3 font-medium text-charcoal-900 bg-gradient-to-r from-amber-50 to-yellow-50">Platinum</th>
                                </tr>
                            </thead>
                            <tbody>
                                <ComparisonRow feature="Consultas/mes" free="5" pro="170" proAnual="170" platinum="Ilimitadas" />
                                <ComparisonRow feature="Búsqueda híbrida RAG" free="✓" pro="✓" proAnual="✓" platinum="✓" />
                                <ComparisonRow feature="Filtros jurisdiccionales" free="✓" pro="✓" proAnual="✓" platinum="✓" />
                                <ComparisonRow feature="Base documental completa" free="✓" pro="✓" proAnual="✓" platinum="✓" />
                                <ComparisonRow feature="Análisis de documentos" free="—" pro="✓" proAnual="✓" platinum="✓" />
                                <ComparisonRow feature="Auditoría de demandas" free="—" pro="✓" proAnual="✓" platinum="✓" />
                                <ComparisonRow feature="Sugerencias con fundamento" free="—" pro="✓" proAnual="✓" platinum="✓" />
                                <ComparisonRow feature="Soporte prioritario" free="—" pro="✓" proAnual="✓" platinum="VIP" />
                                <ComparisonRow feature="Consulta con equipo legal" free="—" pro="—" proAnual="—" platinum="✓" />
                                <ComparisonRow feature="Contrato de servicios profesionales" free="—" pro="—" proAnual="—" platinum="✓" />
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-cream-300">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-4">
                            Preguntas frecuentes
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <FAQItem
                            question="¿Qué incluye una consulta?"
                            answer="Una consulta es cada pregunta o solicitud que haces a Iurexia. Incluye la búsqueda en la base documental, el análisis con IA y la respuesta fundamentada. El análisis de documentos también cuenta como consultas según la complejidad del archivo."
                        />
                        <FAQItem
                            question="¿Qué incluye el Plan Platinum?"
                            answer="El Plan Platinum incluye todo lo del Plan Pro más consultas ilimitadas y asesoría personalizada con el equipo legal de Iurexia. Esto se formaliza mediante un contrato de prestación de servicios profesionales para garantizar una atención especializada y dedicada."
                        />
                        <FAQItem
                            question="¿Puedo cambiar de plan en cualquier momento?"
                            answer="Sí, puedes actualizar o cambiar tu plan en cualquier momento. Si subes de plan, el cambio es inmediato. Si bajas, el cambio aplica al siguiente ciclo de facturación."
                        />
                        <FAQItem
                            question="¿Qué métodos de pago aceptan?"
                            answer="Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe, la plataforma de pagos más segura del mundo."
                        />
                        <FAQItem
                            question="¿Hay garantía de devolución?"
                            answer="Ofrecemos 14 días de garantía de devolución en los planes mensuales. Si no estás satisfecho, te devolvemos el 100% de tu pago sin preguntas."
                        />
                        <FAQItem
                            question="¿Qué pasa si se acaban mis consultas?"
                            answer="Te notificaremos cuando te queden pocas consultas. Puedes esperar al siguiente mes o actualizar a un plan con más consultas en cualquier momento. En el Plan Platinum las consultas son ilimitadas."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-charcoal-900 text-white">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                        Comienza gratis hoy
                    </h2>
                    <p className="text-lg text-gray-400 mb-8">
                        Prueba Iurexia con 5 consultas gratuitas. Sin tarjeta de crédito.
                    </p>
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-charcoal-900 font-medium rounded-full hover:bg-gray-100 transition-colors"
                    >
                        Probar Gratis
                        <ArrowRight className="w-5 h-5" />
                    </Link>
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
    badge
}: {
    icon: React.ReactNode;
    name: string;
    price: string;
    originalPrice: string | null;
    period: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonHref?: string;
    priceId?: string;
    highlighted?: boolean;
    isPlatinum?: boolean;
    badge?: string;
}) {
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleSubscribe = async () => {
        if (!priceId) return;

        setLoading(true);
        try {
            await redirectToCheckout(priceId, user?.email || undefined);
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error al procesar el pago. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const cardStyles = isPlatinum
        ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 hover:shadow-xl hover:border-amber-300'
        : highlighted
            ? 'bg-charcoal-900 text-white shadow-2xl scale-105'
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
        <div className={`relative rounded-3xl p-8 transition-all ${cardStyles}`}>
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
    );
}

function ComparisonRow({ feature, free, pro, proAnual, platinum }: { feature: string; free: string; pro: string; proAnual: string; platinum: string }) {
    return (
        <tr className="border-b border-gray-100">
            <td className="py-4 px-3 text-charcoal-700">{feature}</td>
            <td className="py-4 px-3 text-center text-charcoal-600">{free}</td>
            <td className="py-4 px-3 text-center text-charcoal-900 bg-accent-brown/5 font-medium">{pro}</td>
            <td className="py-4 px-3 text-center text-charcoal-600">{proAnual}</td>
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
                <span className={`text-2xl text-charcoal-400 transition-transform ${isOpen ? 'rotate-45' : ''}`}>
                    +
                </span>
            </button>
            {isOpen && (
                <div className="px-6 pb-6">
                    <p className="text-charcoal-600 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
}
