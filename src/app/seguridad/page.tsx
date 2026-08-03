'use client';

import Link from 'next/link';
import { Scale, ArrowRight, Shield, Lock, Eye, CreditCard, Server, FileCheck, CheckCircle, ChevronDown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useState } from 'react';
import { AnimateOnScroll } from '@/hooks/useScrollAnimation';

/* ───────── Page ───────── */
export default function SeguridadPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <AnimateOnScroll delay={0}>
                        <p className="text-accent-brown font-medium mb-4 tracking-wide">SEGURIDAD</p>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.1}>
                        <h1 className="font-serif text-5xl md:text-7xl font-medium text-charcoal-900 leading-tight mb-8">
                            Protección de
                            <br />
                            <span className="text-accent-gold">nivel empresarial</span>
                        </h1>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.2}>
                        <p className="text-xl text-charcoal-600 max-w-3xl mx-auto mb-12">
                            Tu información legal es confidencial. Iurexia está diseñada con los más altos estándares de seguridad para proteger tus consultas, documentos y transacciones.
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Security Badges */}
            <section className="py-8 bg-charcoal-900 overflow-hidden">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                        {['Cifrado TLS 256-bit', 'Datos en México', 'Pagos seguros con Stripe', 'Sin entrenamiento en tus datos'].map((label, i) => (
                            <AnimateOnScroll key={label} delay={i * 0.1} direction="scale">
                                <SecurityBadge label={label} />
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Principles */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-6xl mx-auto px-4">
                    <AnimateOnScroll>
                        <div className="text-center mb-16">
                            <p className="text-accent-brown font-medium mb-4 tracking-wide">PRINCIPIOS FUNDAMENTALES</p>
                            <h2 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-6">
                                La seguridad es <span className="text-accent-gold">nuestra prioridad</span>
                            </h2>
                            <p className="text-xl text-charcoal-600 max-w-2xl mx-auto">
                                Hemos construido Iurexia desde cero con la protección de tu información como pilar central.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: <Lock className="w-8 h-8" />, title: 'Confidencialidad Total', description: 'Tus consultas y documentos son completamente privados. Nadie en Iurexia puede ver el contenido de tus búsquedas ni los archivos que subes.' },
                            { icon: <Eye className="w-8 h-8" />, title: 'Sin Entrenamiento en tus Datos', description: 'Iurexia garantiza contractualmente que tus datos jamás se utilizan para entrenar modelos de IA. Tu información permanece exclusivamente tuya.' },
                            { icon: <Server className="w-8 h-8" />, title: 'Infraestructura Segura', description: 'Utilizamos servidores con certificación de seguridad empresarial. Todos los datos se cifran en tránsito y en reposo con protocolos de nivel bancario.' },
                            { icon: <CreditCard className="w-8 h-8" />, title: 'Pagos Protegidos', description: 'Los pagos se procesan a través de Stripe, líder mundial en seguridad de pagos. Nunca almacenamos datos de tarjetas en nuestros servidores.' },
                            { icon: <FileCheck className="w-8 h-8" />, title: 'Control de tus Datos', description: 'Tú decides qué información compartes. Puedes eliminar tu historial, documentos y cuenta en cualquier momento, sin restricciones.' },
                            { icon: <Shield className="w-8 h-8" />, title: 'Acceso Controlado', description: 'Implementamos controles de acceso estrictos. Solo tú puedes ver tu información, con autenticación segura y sesiones protegidas.' },
                        ].map((card, i) => (
                            <AnimateOnScroll key={card.title} delay={i * 0.1}>
                                <SecurityCard {...card} />
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* Data Flow Section */}
            <section className="py-24 bg-cream-300 overflow-hidden">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <AnimateOnScroll direction="left">
                            <div>
                                <p className="text-accent-brown font-medium mb-4 tracking-wide">FLUJO DE DATOS</p>
                                <h3 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-6">
                                    ¿Qué sucede con <span className="text-accent-gold">tu información?</span>
                                </h3>
                                <p className="text-charcoal-600 leading-relaxed mb-8">
                                    Cuando realizas una consulta en Iurexia, tu pregunta se procesa de forma segura para buscar en nuestra base de datos jurídica verificada. Los resultados se generan sin almacenar el contenido de tu consulta a largo plazo.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        'Consultas cifradas de extremo a extremo',
                                        'Documentos subidos protegidos con cifrado AES-256',
                                        'Sin venta ni compartición de datos con terceros',
                                        'Cumplimiento con normativa mexicana de protección de datos',
                                    ].map((item, i) => (
                                        <AnimateOnScroll key={i} delay={0.3 + i * 0.1}>
                                            <li className="flex items-start gap-3">
                                                <CheckCircle className="w-5 h-5 text-accent-gold mt-0.5 flex-shrink-0" />
                                                <span className="text-charcoal-700">{item}</span>
                                            </li>
                                        </AnimateOnScroll>
                                    ))}
                                </ul>
                            </div>
                        </AnimateOnScroll>
                        <AnimateOnScroll direction="right" delay={0.2}>
                            <div className="bg-white rounded-3xl p-8 shadow-lg">
                                <DataFlowVisual />
                            </div>
                        </AnimateOnScroll>
                    </div>
                </div>
            </section>

            {/* ── El secreto profesional ──
                Añadido el 3-ago-2026. La página respondía a las preguntas de
                cualquier SaaS —cifrado, pagos, borrado— pero no a la que de
                verdad se hace un abogado antes de pegar un expediente en una
                IA. Se plantea como las preguntas que hay que hacerle a
                CUALQUIER herramienta, con las respuestas de Iurexia al lado:
                así el lector se lleva un criterio, no una promesa. */}
            <section className="py-24 bg-cream-200 border-t border-black/5 overflow-hidden">
                <div className="max-w-5xl mx-auto px-4">
                    <AnimateOnScroll>
                        <div className="text-center mb-12">
                            <p className="text-accent-brown font-medium mb-4 tracking-wide">SECRETO PROFESIONAL</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900 mb-4">
                                Lo que deberías preguntarle a <span className="text-accent-gold">cualquier IA jurídica</span>
                            </h2>
                            <p className="text-charcoal-600 max-w-2xl mx-auto">
                                Antes de escribir el nombre de un cliente en una herramienta de
                                inteligencia artificial, estas cuatro preguntas separan a las que
                                puedes usar de las que no.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            {
                                pregunta: '¿Mi consulta entrena al modelo?',
                                respuesta: 'En Iurexia, no. Si la respuesta de una herramienta es «sí» o «depende de tu configuración», lo que escribas puede reaparecer en la respuesta de otro usuario.',
                            },
                            {
                                pregunta: '¿Quién puede leer lo que subo?',
                                respuesta: 'Sólo tú. Ni el equipo de Iurexia ni otros usuarios ven tus consultas ni los documentos de tus carpetas.',
                            },
                            {
                                pregunta: '¿Puedo borrarlo todo cuando el asunto termina?',
                                respuesta: 'Sí, en cualquier momento y sin pedirlo por correo: historial, documentos y cuenta se eliminan desde tu perfil.',
                            },
                            {
                                pregunta: '¿La respuesta se puede verificar?',
                                respuesta: 'Cada cita lleva su artículo y el enlace a su documento oficial. Una herramienta que no te enseña la fuente te obliga a comprobarla entera a mano.',
                            },
                        ].map((q, i) => (
                            <AnimateOnScroll key={q.pregunta} delay={i * 0.1}>
                                <div className="h-full rounded-xl border border-cream-400 bg-white p-6">
                                    <h3 className="mb-2.5 font-serif text-lg font-semibold text-charcoal-900">
                                        {q.pregunta}
                                    </h3>
                                    <p className="text-[0.9375rem] leading-relaxed text-charcoal-600">{q.respuesta}</p>
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>

                    <AnimateOnScroll delay={0.4}>
                        <p className="mt-8 text-center text-sm text-charcoal-500 max-w-2xl mx-auto">
                            El secreto profesional sigue siendo tuyo: ninguna herramienta te releva
                            de él. Iurexia está construida para que puedas cumplirlo, no para
                            sustituirlo.
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-4xl mx-auto px-4">
                    <AnimateOnScroll>
                        <div className="text-center mb-16">
                            <p className="text-accent-brown font-medium mb-4 tracking-wide">PREGUNTAS FRECUENTES</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-medium text-charcoal-900">
                                Seguridad <span className="text-accent-gold">en detalle</span>
                            </h2>
                        </div>
                    </AnimateOnScroll>

                    <div className="space-y-4">
                        {[
                            { question: '¿Iurexia puede ver mis consultas y documentos?', answer: 'No. Tu información está cifrada y es completamente privada. El equipo de Iurexia no tiene acceso al contenido de tus consultas ni a los documentos que subes. Solo tú puedes ver tu información.' },
                            { question: '¿Mis datos se usan para entrenar modelos de IA?', answer: 'Jamás. Iurexia garantiza contractualmente que tus consultas, respuestas y documentos no se utilizan para entrenar ningún modelo de inteligencia artificial. Tu información permanece exclusivamente tuya.' },
                            { question: '¿Dónde se almacenan mis datos?', answer: 'Iurexia utiliza infraestructura de servidores seguros con centros de datos que cumplen con estándares internacionales de seguridad. Todos los datos se cifran tanto en tránsito como en reposo.' },
                            { question: '¿Cómo se protegen mis pagos?', answer: 'Los pagos se procesan a través de Stripe, la plataforma de pagos más segura del mundo, utilizada por empresas como Amazon, Google y Shopify. Nunca almacenamos información de tarjetas en nuestros servidores.' },
                            { question: '¿Puedo eliminar toda mi información?', answer: 'Sí. Tienes control total sobre tus datos. Puedes eliminar tu historial de consultas, documentos subidos, y tu cuenta completa en cualquier momento desde la configuración de tu perfil.' },
                            { question: '¿Iurexia comparte datos con terceros?', answer: 'No vendemos ni compartimos tu información personal o profesional con terceros. Los únicos datos que se procesan externamente son los pagos (a través de Stripe) con los más altos estándares de seguridad.' },
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
                        <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6">
                            Tu información está segura <span className="text-accent-gold">con Iurexia</span>
                        </h2>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.15}>
                        <p className="text-lg text-gray-400 mb-8">
                            Comienza a trabajar con la tranquilidad de saber que tu información está protegida.
                        </p>
                    </AnimateOnScroll>
                    <AnimateOnScroll delay={0.3} direction="scale">
                        <Link
                            href="/chat"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-charcoal-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Comenzar ahora
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Nota de uso responsable */}
            <section className="py-8 bg-charcoal-800">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <p className="text-sm text-gray-400">
                        <strong className="text-gray-300">Nota de uso responsable:</strong> Iurexia no presta servicios legales directamente, ni pretende sustituir la asesoría profesional: orienta, organiza y fortalece el análisis; la estrategia y ejecución siempre deben ser acompañadas por un abogado.
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

/* ───────── Subcomponents ───────── */

function SecurityBadge({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-accent-gold" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

function SecurityCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-8 rounded-2xl bg-cream-300 hover:shadow-lg transition-all duration-300">
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
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                    maxHeight: isOpen ? '200px' : '0px',
                    opacity: isOpen ? 1 : 0,
                }}
            >
                <div className="px-6 pb-6 bg-white">
                    <p className="text-charcoal-600 leading-relaxed">{answer}</p>
                </div>
            </div>
        </div>
    );
}
