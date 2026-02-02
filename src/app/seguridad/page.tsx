'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Shield, Lock, Eye, CreditCard, Server, FileCheck, CheckCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function SeguridadPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2 group">
                            <span className="font-serif text-2xl font-semibold text-charcoal-900">
                                Jurex<span className="text-accent-gold">ia</span>
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/plataforma" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Plataforma</Link>
                            <Link href="/#features" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Soluciones</Link>
                            <Link href="/#pricing" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">Precios</Link>
                            <span className="text-sm font-medium text-charcoal-900 border-b-2 border-charcoal-900">Seguridad</span>
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
                    <p className="text-accent-brown font-medium mb-4 tracking-wide">SEGURIDAD</p>
                    <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                        Protección de
                        <br />
                        <span className="text-charcoal-500">nivel empresarial</span>
                    </h1>
                    <p className="text-xl text-charcoal-600 max-w-3xl mx-auto mb-12">
                        Tu información legal es confidencial. Jurexia está diseñada con los más altos estándares de seguridad para proteger tus consultas, documentos y transacciones.
                    </p>
                </div>
            </section>

            {/* Security Badges */}
            <section className="py-8 bg-charcoal-900">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                        <SecurityBadge label="Cifrado TLS 256-bit" />
                        <SecurityBadge label="Datos en México" />
                        <SecurityBadge label="Pagos seguros con Stripe" />
                        <SecurityBadge label="Sin entrenamiento en tus datos" />
                    </div>
                </div>
            </section>

            {/* Core Principles */}
            <section className="py-24 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">PRINCIPIOS FUNDAMENTALES</p>
                        <h2 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-6">
                            La seguridad es nuestra prioridad
                        </h2>
                        <p className="text-xl text-charcoal-600 max-w-2xl mx-auto">
                            Hemos construido Jurexia desde cero con la protección de tu información como pilar central.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <SecurityCard
                            icon={<Lock className="w-8 h-8" />}
                            title="Confidencialidad Total"
                            description="Tus consultas y documentos son completamente privados. Nadie en Jurexia puede ver el contenido de tus búsquedas ni los archivos que subes."
                        />
                        <SecurityCard
                            icon={<Eye className="w-8 h-8" />}
                            title="Sin Entrenamiento en tus Datos"
                            description="Jurexia garantiza contractualmente que tus datos jamás se utilizan para entrenar modelos de IA. Tu información permanece exclusivamente tuya."
                        />
                        <SecurityCard
                            icon={<Server className="w-8 h-8" />}
                            title="Infraestructura Segura"
                            description="Utilizamos servidores con certificación de seguridad empresarial. Todos los datos se cifran en tránsito y en reposo con protocolos de nivel bancario."
                        />
                        <SecurityCard
                            icon={<CreditCard className="w-8 h-8" />}
                            title="Pagos Protegidos"
                            description="Los pagos se procesan a través de Stripe, líder mundial en seguridad de pagos. Nunca almacenamos datos de tarjetas en nuestros servidores."
                        />
                        <SecurityCard
                            icon={<FileCheck className="w-8 h-8" />}
                            title="Control de tus Datos"
                            description="Tú decides qué información compartes. Puedes eliminar tu historial, documentos y cuenta en cualquier momento, sin restricciones."
                        />
                        <SecurityCard
                            icon={<Shield className="w-8 h-8" />}
                            title="Acceso Controlado"
                            description="Implementamos controles de acceso estrictos. Solo tú puedes ver tu información, con autenticación segura y sesiones protegidas."
                        />
                    </div>
                </div>
            </section>

            {/* Data Flow Section */}
            <section className="py-24 bg-cream-300">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <p className="text-accent-brown font-medium mb-4 tracking-wide">FLUJO DE DATOS</p>
                            <h3 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-6">
                                ¿Qué sucede con tu información?
                            </h3>
                            <p className="text-charcoal-600 leading-relaxed mb-8">
                                Cuando realizas una consulta en Jurexia, tu pregunta se procesa de forma segura para buscar en nuestra base de datos jurídica verificada. Los resultados se generan sin almacenar el contenido de tu consulta a largo plazo.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-charcoal-700">Consultas cifradas de extremo a extremo</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-charcoal-700">Documentos subidos protegidos con cifrado AES-256</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-charcoal-700">Sin venta ni compartición de datos con terceros</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-charcoal-700">Cumplimiento con normativa mexicana de protección de datos</span>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-white rounded-3xl p-8 shadow-lg">
                            <DataFlowVisual />
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">PREGUNTAS FRECUENTES</p>
                        <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900">
                            Seguridad en detalle
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <FAQItem
                            question="¿Jurexia puede ver mis consultas y documentos?"
                            answer="No. Tu información está cifrada y es completamente privada. El equipo de Jurexia no tiene acceso al contenido de tus consultas ni a los documentos que subes. Solo tú puedes ver tu información."
                        />
                        <FAQItem
                            question="¿Mis datos se usan para entrenar modelos de IA?"
                            answer="Jamás. Jurexia garantiza contractualmente que tus consultas, respuestas y documentos no se utilizan para entrenar ningún modelo de inteligencia artificial. Tu información permanece exclusivamente tuya."
                        />
                        <FAQItem
                            question="¿Dónde se almacenan mis datos?"
                            answer="Jurexia utiliza infraestructura de servidores seguros con centros de datos que cumplen con estándares internacionales de seguridad. Todos los datos se cifran tanto en tránsito como en reposo."
                        />
                        <FAQItem
                            question="¿Cómo se protegen mis pagos?"
                            answer="Los pagos se procesan a través de Stripe, la plataforma de pagos más segura del mundo, utilizada por empresas como Amazon, Google y Shopify. Nunca almacenamos información de tarjetas en nuestros servidores."
                        />
                        <FAQItem
                            question="¿Puedo eliminar toda mi información?"
                            answer="Sí. Tienes control total sobre tus datos. Puedes eliminar tu historial de consultas, documentos subidos, y tu cuenta completa en cualquier momento desde la configuración de tu perfil."
                        />
                        <FAQItem
                            question="¿Jurexia comparte datos con terceros?"
                            answer="No vendemos ni compartimos tu información personal o profesional con terceros. Los únicos datos que se procesan externamente son los pagos (a través de Stripe) con los más altos estándares de seguridad."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-charcoal-900 text-white">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                        Tu información está segura con Jurexia
                    </h2>
                    <p className="text-lg text-gray-400 mb-8">
                        Comienza a trabajar con la tranquilidad de saber que tu información está protegida.
                    </p>
                    <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-charcoal-900 font-medium rounded-full hover:bg-gray-100 transition-colors"
                    >
                        Comenzar ahora
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
                            <span className="font-serif text-xl font-semibold">Jurex<span className="text-accent-gold">ia</span></span>
                        </div>
                        <p className="text-sm text-charcoal-500">
                            © 2026 Jurexia. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function SecurityBadge({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

function SecurityCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-8 rounded-2xl bg-cream-300 hover:shadow-lg transition-shadow">
            <div className="text-accent-brown mb-4">{icon}</div>
            <h3 className="font-serif text-xl font-medium text-charcoal-900 mb-3">{title}</h3>
            <p className="text-charcoal-600 leading-relaxed">{description}</p>
        </div>
    );
}

function DataFlowVisual() {
    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <Shield className="w-12 h-12 text-charcoal-900 mx-auto mb-2" />
                <p className="text-sm font-medium text-charcoal-900">Flujo Seguro de Datos</p>
            </div>

            <div className="space-y-4">
                <FlowStep number={1} title="Tu consulta" description="Cifrada desde tu navegador" />
                <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gray-200"></div>
                </div>
                <FlowStep number={2} title="Procesamiento seguro" description="Búsqueda en base documental" />
                <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gray-200"></div>
                </div>
                <FlowStep number={3} title="Respuesta cifrada" description="Solo visible para ti" />
            </div>

            <div className="pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">Sin almacenamiento de consultas a largo plazo</p>
            </div>
        </div>
    );
}

function FlowStep({ number, title, description }: { number: number; title: string; description: string }) {
    return (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-charcoal-900 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {number}
            </div>
            <div>
                <p className="font-medium text-charcoal-900">{title}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors"
            >
                <span className="font-medium text-charcoal-900">{question}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-6 pb-6 bg-white">
                    <p className="text-charcoal-600 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
}
