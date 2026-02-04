'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Zap, Users, Shield, FileSearch, Gavel, FileCheck, Compass, BookOpen, MapPin, CheckCircle, Lock, Eye, Server } from 'lucide-react';

export default function SolucionesPage() {
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
                            <span className="text-sm font-medium text-charcoal-900 border-b-2 border-charcoal-900">Soluciones</span>
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
                    <p className="text-accent-brown font-medium mb-4 tracking-wide">SOLUCIONES</p>
                    <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                        Del rezago a la
                        <br />
                        <span className="text-charcoal-500">estrategia legal</span>
                    </h1>
                    <p className="text-xl text-charcoal-600 max-w-3xl mx-auto mb-12">
                        Iurexia transforma tareas rutinarias en ventajas estratégicas para tu práctica jurídica.
                        Acelera tu trabajo legal con precisión y fundamento.
                    </p>
                </div>
            </section>

            {/* Three Key Benefits */}
            <section className="py-16 bg-white border-t border-black/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8">
                        <BenefitCard
                            icon={<Zap className="w-8 h-8" />}
                            title="Optimiza procesos repetitivos"
                            description="Libera tiempo de tareas de alto volumen para enfocarte en iniciativas de alto impacto que impulsen decisiones, gestionen riesgos y acompañen la ejecución de estrategias."
                        />
                        <BenefitCard
                            icon={<Users className="w-8 h-8" />}
                            title="Amplía tu alcance profesional"
                            description="Atiende más materias, jurisdicciones y clientes sin fragmentar herramientas. Una sola plataforma para todo el derecho mexicano."
                        />
                        <BenefitCard
                            icon={<Shield className="w-8 h-8" />}
                            title="Crece con certeza jurídica"
                            description="Fundamenta decisiones rápidas y claras para clientes que innovan: cierra negocios, integra proveedores y lanza proyectos con respaldo legal sólido."
                        />
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section className="py-24 bg-cream-300">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">APLICACIONES</p>
                        <h2 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-6">
                            Cómo usan Iurexia los profesionales
                        </h2>
                        <p className="text-xl text-charcoal-600 max-w-2xl mx-auto">
                            Desde investigación hasta análisis de demandas, Iurexia potencia cada etapa del trabajo legal.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <UseCaseCard
                            icon={<FileSearch className="w-6 h-6" />}
                            title="Síntesis de información"
                            description="Analiza contratos, actualizaciones regulatorias y hallazgos clave para decisiones informadas, con citas verificables de documentos fuente."
                        />
                        <UseCaseCard
                            icon={<Gavel className="w-6 h-6" />}
                            title="Litigio y gestión de riesgos"
                            description="Recibe insights sobre estrategias recomendadas para litigio, e identifica responsabilidades y riesgos potenciales en tu caso."
                        />
                        <UseCaseCard
                            icon={<FileCheck className="w-6 h-6" />}
                            title="Cumplimiento normativo"
                            description="Analiza regulaciones vigentes, rastrea cambios en el tiempo y asegura que políticas internas estén alineadas con requisitos legales."
                        />
                        <UseCaseCard
                            icon={<BookOpen className="w-6 h-6" />}
                            title="Análisis de demandas"
                            description="Revisa demandas contra criterios específicos, identifica fortalezas, debilidades y recibe sugerencias de mejora con fundamento."
                        />
                        <UseCaseCard
                            icon={<MapPin className="w-6 h-6" />}
                            title="Investigación jurisprudencial"
                            description="Encuentra tesis y jurisprudencia aplicable con precisión milimétrica, filtrada por jurisdicción y materia."
                        />
                        <UseCaseCard
                            icon={<Compass className="w-6 h-6" />}
                            title="Orientación para no-abogados"
                            description="Ubica situaciones jurídicas, explica rutas posibles y organiza información para que un abogado ejecute con claridad."
                        />
                    </div>
                </div>
            </section>

            {/* Platform Features */}
            <section className="py-24 bg-charcoal-900 text-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">PLATAFORMA</p>
                        <h2 className="font-serif text-4xl md:text-5xl font-medium mb-6">
                            Herramientas diseñadas para el éxito
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Cada funcionalidad de Iurexia está construida específicamente para el sistema jurídico mexicano.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <PlatformFeatureCard
                            title="Búsqueda Híbrida"
                            description="Combina búsqueda semántica con precisión técnica para encontrar exactamente lo que necesitas."
                            href="/plataforma#busqueda-hibrida"
                        />
                        <PlatformFeatureCard
                            title="Agente de Análisis"
                            description="Analiza demandas y documentos automáticamente, identificando fortalezas, debilidades y oportunidades."
                            href="/plataforma#agente-analisis"
                        />
                        <PlatformFeatureCard
                            title="Filtros Jurisdiccionales"
                            description="Resultados precisos por estado. Solo la normativa aplicable a tu jurisdicción, más la federal."
                            href="/plataforma#filtros-jurisdiccionales"
                        />
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="py-16 bg-white border-t border-black/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h3 className="font-serif text-2xl md:text-3xl font-medium text-charcoal-900 mb-4">
                            Seguridad de nivel empresarial
                        </h3>
                        <p className="text-charcoal-600 max-w-2xl mx-auto">
                            Iurexia cumple con los estándares más altos de seguridad y privacidad para proteger tu información.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                        <SecurityBadge icon={<Lock className="w-5 h-5" />} label="Cifrado TLS 256-bit" />
                        <SecurityBadge icon={<Eye className="w-5 h-5" />} label="Sin entrenamiento en tus datos" />
                        <SecurityBadge icon={<Server className="w-5 h-5" />} label="Datos protegidos" />
                        <SecurityBadge icon={<Shield className="w-5 h-5" />} label="Pagos seguros con Stripe" />
                    </div>

                    <div className="text-center mt-8">
                        <Link
                            href="/seguridad"
                            className="text-accent-brown font-medium hover:underline inline-flex items-center gap-1"
                        >
                            Más sobre seguridad
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Premium Legal Assistance Section */}
            <section className="py-24 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-t border-amber-100">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Content */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full mb-6">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                EXCLUSIVO PLATINUM
                            </div>
                            <h2 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-6 leading-tight">
                                Asesoría legal
                                <br />
                                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                    personalizada
                                </span>
                            </h2>
                            <p className="text-lg text-charcoal-600 mb-8 leading-relaxed">
                                Más allá de la tecnología, Iurexia te conecta con <strong>abogados altamente especializados</strong> que refinan contigo la estrategia legal que ideaste en la plataforma. Una llamada telefónica para pulir cada detalle de tu caso.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-charcoal-900">Consulta telefónica directa</h4>
                                        <p className="text-charcoal-600 text-sm">Habla con un especialista que conoce tu caso y afina tu estrategia en tiempo real.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-charcoal-900">Contrato de servicios profesionales</h4>
                                        <p className="text-charcoal-600 text-sm">Formalidad y respaldo legal en cada interacción con el equipo de Iurexia.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-charcoal-900">Experiencia especializada</h4>
                                        <p className="text-charcoal-600 text-sm">Abogados con dominio profundo del derecho mexicano para orientarte con precisión.</p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/precios"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
                            >
                                Conocer Plan Platinum
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>

                        {/* Visual Element */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-200/50 to-orange-200/50 rounded-3xl blur-3xl"></div>
                            <div className="relative bg-white rounded-3xl p-8 shadow-xl border border-amber-100">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                        Equipo Legal Iurexia
                                    </h3>
                                    <p className="text-charcoal-500 text-sm">
                                        Especialistas a tu disposición
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-charcoal-700 font-medium">Disponible para consultas</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <p className="text-2xl font-bold text-charcoal-900">VIP</p>
                                            <p className="text-xs text-charcoal-500">Soporte dedicado</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <p className="text-2xl font-bold text-charcoal-900">∞</p>
                                            <p className="text-xs text-charcoal-500">Consultas ilimitadas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-cream-300">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-6">
                        Transforma tu práctica legal con IA
                    </h2>
                    <p className="text-lg text-charcoal-600 mb-8">
                        Únete a los profesionales del derecho que ya optimizan su trabajo con Iurexia.
                    </p>
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-charcoal-900 text-white font-medium rounded-full hover:bg-charcoal-800 transition-colors"
                    >
                        Probar Gratis
                        <ArrowRight className="w-5 h-5" />
                    </Link>
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

function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-8 rounded-2xl bg-cream-300 hover:shadow-lg transition-shadow">
            <div className="text-accent-brown mb-4">{icon}</div>
            <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-3">{title}</h3>
            <p className="text-charcoal-600 leading-relaxed">{description}</p>
        </div>
    );
}

function UseCaseCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-6 bg-white rounded-2xl border border-black/5 hover:shadow-lg hover:border-accent-brown/20 transition-all">
            <div className="w-12 h-12 rounded-xl bg-accent-brown/10 flex items-center justify-center text-accent-brown mb-4">
                {icon}
            </div>
            <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-2">{title}</h3>
            <p className="text-sm text-charcoal-600 leading-relaxed">{description}</p>
        </div>
    );
}

function PlatformFeatureCard({ title, description, href }: { title: string; description: string; href: string }) {
    return (
        <Link
            href={href}
            className="block p-8 rounded-2xl bg-charcoal-800 hover:bg-charcoal-700 transition-colors group"
        >
            <h3 className="text-xl font-medium text-white mb-3 group-hover:text-accent-brown transition-colors">
                {title}
            </h3>
            <p className="text-gray-400 mb-4">{description}</p>
            <span className="text-accent-brown font-medium inline-flex items-center gap-1 text-sm">
                Ver más
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
        </Link>
    );
}

function SecurityBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 text-charcoal-700">
            <div className="text-green-500">{icon}</div>
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}
