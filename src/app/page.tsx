import Navbar from '@/components/Navbar';
import ChatInput from '@/components/ChatInput';
import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen">
            <Navbar />

            {/* Hero Section - Harvey.AI Style */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Logo */}
                    <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
                        Iurex<span className="text-accent-gold">ia</span>
                    </h1>

                    {/* Promotional Video */}
                    <div className="mb-8 rounded-2xl overflow-hidden shadow-xl max-w-2xl mx-auto">
                        <video
                            controls
                            playsInline
                            className="w-full"
                            poster="/video-poster.jpg"
                        >
                            <source src="/0202.mp4" type="video/mp4" />
                        </video>
                    </div>

                    {/* Headline */}
                    <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-charcoal-900 leading-tight mb-6">
                        La inteligencia artificial más precisa para el sistema jurídico Mexicano
                    </p>

                    {/* Subheadline */}
                    <p className="text-lg text-charcoal-600 max-w-3xl mx-auto mb-12">
                        Poderosa herramienta de investigación jurídica, análisis de documentos y consultoría legal
                        potenciada por inteligencia artificial especializada para el sistema jurídico mexicano.
                    </p>
                </div>

                {/* Chat Input Demo - Harvey Style */}
                <div className="max-w-3xl mx-auto mt-8">
                    <Link href="/chat">
                        <div className="chat-input-container p-6 cursor-pointer hover:shadow-lg transition-shadow">
                            {/* Sample prompt preview */}
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                                    <span className="text-red-500">📄</span>
                                    <span className="text-sm text-charcoal-700">Demanda.pdf</span>
                                    <span className="text-xs text-gray-400">2.4 MB</span>
                                </div>
                            </div>

                            <p className="text-charcoal-600 text-base leading-relaxed">
                                Analiza esta demanda de amparo indirecto y encuentra la jurisprudencia
                                aplicable de la Suprema Corte...
                            </p>

                            {/* Action buttons */}
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5">
                                        <span>📎</span> Subir documento
                                    </span>
                                    <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                                        <span>🔍</span> Buscar
                                    </span>
                                </div>
                                <div className="w-10 h-10 bg-charcoal-900 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Link>

                </div>
            </section>

            {/* Demo Video Section */}
            <section className="py-16 bg-white">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="font-serif text-2xl md:text-3xl font-medium text-center text-charcoal-900 mb-4">
                        Mira cómo funciona
                    </h2>
                    <p className="text-center text-charcoal-600 mb-8 max-w-2xl mx-auto">
                        Desde la selección de jurisdicción hasta consultar documentos fuente, todo en segundos.
                    </p>
                    <div className="rounded-2xl overflow-hidden shadow-2xl border border-cream-300">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full"
                        >
                            <source src="/demo/Iurexia-demo.mp4" type="video/mp4" />
                            Tu navegador no soporta video.
                        </video>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium text-center text-charcoal-900 mb-16">
                        Potencia tu práctica legal
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon="🔍"
                            title="Búsqueda Híbrida"
                            description="Combina búsqueda semántica con palabras clave exactas (BM25) para encontrar jurisprudencia y normativa con precisión milimétrica."
                        />
                        <FeatureCard
                            icon="🛡️"
                            title="Agente de Análisis"
                            description="Analiza demandas y sentencias automáticamente. Identifica fortalezas, debilidades y sugiere mejoras con fundamento legal."
                        />
                        <FeatureCard
                            icon="📍"
                            title="Filtros Jurisdiccionales"
                            description="Garantiza seguridad jurídica. Si seleccionas Nuevo León, nunca verás resultados de otros estados (salvo federal)."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-charcoal-900 text-white">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                        Comienza hoy con Iurexia
                    </h2>
                    <p className="text-lg text-gray-300 mb-8">
                        Únete a los profesionales del derecho que ya utilizan IA especializada.
                    </p>
                    <Link
                        href="/chat"
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
                            <Link href="#" className="hover:text-charcoal-900 transition-colors">Privacidad</Link>
                            <Link href="#" className="hover:text-charcoal-900 transition-colors">Términos</Link>
                            <Link href="#" className="hover:text-charcoal-900 transition-colors">Contacto</Link>
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
            href="/chat"
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
