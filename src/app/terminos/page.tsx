'use client';

import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export default function TerminosPage() {
    const fechaActualizacion = "22 de agosto de 2026";

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
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-sm text-charcoal-600 hover:text-charcoal-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver al inicio
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <article className="pt-28 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-white rounded-full text-sm mb-6">
                            <Scale className="w-4 h-4" />
                            Documento Legal
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-4">
                            Términos y Condiciones
                        </h1>
                        <p className="text-charcoal-500">
                            Última actualización: {fechaActualizacion}
                        </p>
                    </div>

                    {/* Legal Content */}
                    <div className="bg-white rounded-3xl shadow-xl border border-black/5 p-8 md:p-12 prose-legal">

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                1. Aceptación de los Términos
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Al acceder y utilizar la plataforma Iurexia (en adelante, "la Plataforma"), usted acepta
                                quedar vinculado por los presentes Términos y Condiciones de uso, de conformidad con lo
                                establecido en los artículos 1794 y 1796 del Código Civil Federal, que regulan los
                                elementos de existencia y validez de los contratos.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                Si usted no está de acuerdo con estos términos, le solicitamos abstenerse de utilizar
                                nuestros servicios.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                2. Descripción del Servicio
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Iurexia es una plataforma de inteligencia artificial diseñada para proporcionar
                                herramientas de investigación jurídica, análisis de documentos legales y asistencia
                                en la práctica del derecho mexicano.
                            </p>
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
                                <p className="text-charcoal-800 font-medium mb-2">⚠️ Aviso Importante</p>
                                <p className="text-charcoal-700 text-sm">
                                    Iurexia es una herramienta de apoyo y no sustituye el criterio profesional de un
                                    abogado. Las respuestas generadas por la plataforma tienen carácter informativo
                                    y orientativo, y no constituyen asesoría legal vinculante. La responsabilidad
                                    final de cualquier decisión legal recae en el usuario y/o su representante legal.
                                </p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                3. Registro y Cuenta de Usuario
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Para acceder a determinadas funcionalidades de la Plataforma, el usuario deberá
                                registrarse proporcionando información veraz y actualizada, conforme a lo dispuesto
                                en el artículo 76 Bis de la Ley Federal de Protección al Consumidor.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                El usuario es responsable de mantener la confidencialidad de sus credenciales de
                                acceso y de todas las actividades que se realicen bajo su cuenta.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                4. Propiedad Intelectual
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo pero no
                                limitado a software, algoritmos, diseño, marcas y contenido, son propiedad exclusiva
                                de Iurexia o sus licenciantes, protegidos por la Ley Federal del Derecho de Autor
                                y la Ley de la Propiedad Industrial.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                Los documentos generados por el usuario mediante la Plataforma podrán ser utilizados
                                libremente por éste para sus fines profesionales.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                5. Uso Aceptable
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                El usuario se compromete a utilizar la Plataforma únicamente para fines lícitos y
                                de conformidad con estos Términos. Queda expresamente prohibido:
                            </p>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2">
                                <li>Utilizar la Plataforma para fines ilícitos o fraudulentos</li>
                                <li>Intentar acceder a sistemas o datos no autorizados</li>
                                <li>Reproducir, distribuir o comercializar el contenido de la Plataforma sin autorización</li>
                                <li>Introducir virus o código malicioso</li>
                                <li>Realizar ingeniería inversa del software</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                6. Planes y Pagos
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Los servicios de pago se regirán por las condiciones específicas de cada plan,
                                publicadas en la sección de Precios. Los pagos se procesan a través de Stripe,
                                cumpliendo con los estándares PCI-DSS de seguridad.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                De conformidad con el artículo 56 de la Ley Federal de Protección al Consumidor,
                                el usuario tendrá derecho a:
                            </p>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2">
                                <li>Conocer previamente el precio total de los servicios</li>
                                <li>Recibir comprobante de pago</li>
                                <li>Cancelar o suspender su suscripción en cualquier momento, por sí mismo, desde su cuenta</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                7. Renovación Automática, Cancelación y Reembolsos
                            </h2>

                            <h3 className="font-serif text-lg font-medium text-charcoal-900 mt-6 mb-2">
                                7.1 La suscripción se renueva sola hasta que el usuario la cancela
                            </h3>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Todos los planes de pago son de <strong>renovación automática</strong>. Al
                                contratar, el usuario autoriza que se cobre el importe del plan a su método de
                                pago al inicio de cada período de facturación, de forma recurrente y sin
                                necesidad de una nueva autorización, <strong>hasta que el propio usuario
                                cancele o suspenda su suscripción</strong>.
                            </p>

                            <h3 className="font-serif text-lg font-medium text-charcoal-900 mt-6 mb-2">
                                7.2 Cancelar es responsabilidad del usuario, y la plataforma se lo permite
                            </h3>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Iurexia pone a disposición del usuario, dentro de su propia cuenta y sin
                                necesidad de contactar a nadie, la posibilidad de <strong>cancelar o suspender
                                su suscripción en cualquier momento</strong>, desde la sección de su perfil en
                                la plataforma. El uso de esa función es{' '}
                                <strong>responsabilidad enteramente del usuario</strong>.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                En consecuencia, si el usuario no cancela antes de la fecha de renovación,
                                asume el costo del período correspondiente, sin derecho a devolución.
                            </p>

                            <h3 className="font-serif text-lg font-medium text-charcoal-900 mt-6 mb-2">
                                7.3 No utilizar el servicio no da derecho a reembolso
                            </h3>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Lo que el usuario contrata es la <strong>disponibilidad</strong> del servicio
                                durante el período pagado: su cuenta permanece activa en el plan contratado,
                                con todas sus funciones y su cuota de consultas a su disposición, la use o no.
                                Por lo mismo, <strong>el no uso, el uso parcial o el olvido de la suscripción
                                no generan derecho a devolución</strong>, del mismo modo que ocurre con
                                cualquier servicio por suscripción.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Esta política se sustenta, además, en que todo usuario dispone de un plan
                                gratuito que le permite evaluar la plataforma antes de contratar. Al
                                suscribirse a un plan de pago, el usuario reconoce haber tenido esa
                                oportunidad y acepta las presentes condiciones.
                            </p>

                            <h3 className="font-serif text-lg font-medium text-charcoal-900 mt-6 mb-2">
                                7.4 Dispensa por solicitud a soporte
                            </h3>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                No obstante lo anterior, <strong>Iurexia dispensará del cargo al usuario que
                                así lo solicite</strong> contactando al área de soporte, procediendo al
                                reembolso del período correspondiente y a la cancelación de su suscripción.
                                Esta vía está siempre abierta y no requiere justificación: basta con
                                escribir a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline">soporte@iurexia.com</a>{' '}
                                o utilizar la sección de soporte dentro de la plataforma.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                Al existir esta vía de solución directa, sencilla y sin costo, el usuario se
                                obliga a acudir a ella antes de iniciar cualquier reclamación ante su
                                institución bancaria.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                8. Limitación de Responsabilidad
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Iurexia proporciona la Plataforma "tal cual" y no garantiza que el servicio sea
                                ininterrumpido o libre de errores. En la máxima medida permitida por la ley aplicable:
                            </p>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2">
                                <li>No seremos responsables por daños indirectos, incidentales o consecuentes</li>
                                <li>Nuestra responsabilidad total no excederá el monto pagado por el usuario en los últimos 12 meses</li>
                                <li>No garantizamos la exactitud de la información proporcionada por la IA</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                9. Modificaciones
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed">
                                Nos reservamos el derecho de modificar estos Términos en cualquier momento. Las
                                modificaciones entrarán en vigor a partir de su publicación en la Plataforma.
                                El uso continuado del servicio después de la publicación de cambios constituirá
                                la aceptación de los mismos.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                10. Ley Aplicable y Jurisdicción
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Los presentes Términos se regirán e interpretarán de conformidad con las leyes de
                                los Estados Unidos Mexicanos. Para cualquier controversia derivada de estos Términos,
                                las partes se someten expresamente a la jurisdicción de los tribunales competentes
                                de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles
                                por razón de su domicilio presente o futuro.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                11. Contacto
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed">
                                Para cualquier duda o aclaración sobre estos Términos y Condiciones, puede
                                contactarnos a través de: <a href="mailto:soporte@iurexia.com" className="text-accent-brown hover:underline">soporte@iurexia.com</a>
                            </p>
                        </section>

                        {/* Footer Legal */}
                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-sm text-charcoal-500 text-center">
                                © 2026 Iurexia. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>

                    {/* Related Links */}
                    <div className="mt-8 flex justify-center gap-6">
                        <Link
                            href="/privacidad"
                            className="text-accent-brown hover:underline font-medium"
                        >
                            Aviso de Privacidad →
                        </Link>
                    </div>
                </div>
            </article>
        </main>
    );
}
