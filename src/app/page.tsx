import Navbar from '@/components/Navbar';
import ChatInput from '@/components/ChatInput';
import Link from 'next/link';
import { HeroCTA } from '@/components/HeroCTA';

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
                            <source src="/iurexia-front-final.mp4" type="video/mp4" />
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

                {/* Chat Input Demo - Harvey Style (Conditional for auth) */}
                <div className="max-w-3xl mx-auto mt-8">
                    <HeroCTA />
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

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* IUREXIA CONNECT — ECOSISTEMA LEGAL INTELIGENTE */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-24 overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-b from-white via-cream-50 to-cream-200" />

                {/* Decorative gold accent line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent rounded-full" />

                <div className="relative max-w-6xl mx-auto px-4">
                    {/* Section Header */}
                    <div className="text-center mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-charcoal-900 text-white text-xs font-medium tracking-widest uppercase mb-6">
                            <span className="w-2 h-2 bg-accent-gold rounded-full animate-pulse-subtle" />
                            Nuevo
                        </span>
                        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium text-charcoal-900 mb-4">
                            Iurexia <span className="text-accent-gold">Connect</span>
                        </h2>
                        <p className="text-lg md:text-xl text-charcoal-700 max-w-3xl mx-auto leading-relaxed">
                            El primer ecosistema legal en México que une inteligencia artificial de precisión
                            con abogados certificados. <span className="font-medium text-charcoal-900">Una solución que nadie más ofrece.</span>
                        </p>
                    </div>

                    {/* Unique Value Proposition Badge */}
                    <div className="flex justify-center mb-16">
                        <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-cream-400 shadow-sm">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-gold to-accent-brown flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">IA</div>
                                <div className="w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center text-white text-xs ring-2 ring-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                            <span className="text-sm text-charcoal-700">
                                <span className="font-semibold text-charcoal-900">Orientación con IA</span> + <span className="font-semibold text-charcoal-900">Abogado real</span> en un solo lugar
                            </span>
                        </div>
                    </div>

                    {/* Dual Audience Cards */}
                    <div className="grid lg:grid-cols-2 gap-6 mb-20">

                        {/* Card: Para Usuarios */}
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

                        {/* Card: Para Abogados */}
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

                                <Link href="/registro" className="inline-flex items-center gap-2 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-full hover:bg-accent-gold/90 transition-all duration-300 hover:shadow-lg hover:shadow-accent-gold/20">
                                    Registrar mi perfil
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Workflow: How Connect Works */}
                    <div className="max-w-4xl mx-auto">
                        <h3 className="font-serif text-2xl md:text-3xl font-medium text-center text-charcoal-900 mb-12">
                            ¿Cómo funciona?
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
                        Comienza hoy con Iurexia
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
