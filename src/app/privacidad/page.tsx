'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PieDePagina from '@/components/PieDePagina';
import { Shield } from 'lucide-react';

import { claseWeb } from '@/lib/fuentes-web';
export default function PrivacidadPage() {
    const fechaActualizacion = "4 de febrero de 2026";

    return (
        <main className={`${claseWeb} min-h-screen bg-cream-300`}>
            {/* La barra de la web, la misma de todas las páginas (3-oct-2026).
                Antes ésta llevaba la suya: la marca y «Volver al inicio». */}
            <Navbar />

            {/* Content */}
            <article className="pt-28 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-white rounded-full text-sm mb-6">
                            <Shield className="w-4 h-4" />
                            Protección de Datos
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl font-medium text-charcoal-900 mb-4">
                            Aviso de Privacidad
                        </h1>
                        <p className="text-charcoal-500">
                            Última actualización: {fechaActualizacion}
                        </p>
                    </div>

                    {/* Legal Content */}
                    <div className="bg-white rounded-3xl shadow-xl border border-black/5 p-8 md:p-12 prose-legal">

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                I. Identidad del Responsable
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                En cumplimiento de lo dispuesto por la Ley Federal de Protección de Datos Personales
                                en Posesión de los Particulares (LFPDPPP) y su Reglamento, Iurexia (en adelante,
                                "el Responsable"), con domicilio en Ciudad de México, México, pone a su disposición
                                el presente Aviso de Privacidad.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                <strong>Contacto para asuntos de privacidad:</strong>{' '}
                                <a href="mailto:soporte@iurexia.com" className="text-accent-brown hover:underline">
                                    soporte@iurexia.com
                                </a>
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                II. Datos Personales que Recabamos
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                De conformidad con el artículo 16 de la LFPDPPP, le informamos que recabamos los
                                siguientes datos personales:
                            </p>

                            <h3 className="font-medium text-charcoal-900 mt-6 mb-3">Datos de identificación:</h3>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2 mb-4">
                                <li>Nombre completo</li>
                                <li>Correo electrónico</li>
                                <li>Datos de autenticación (contraseña encriptada o tokens de OAuth)</li>
                            </ul>

                            <h3 className="font-medium text-charcoal-900 mt-6 mb-3">Datos de uso del servicio:</h3>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2 mb-4">
                                <li>Historial de consultas realizadas en la plataforma</li>
                                <li>Documentos subidos para análisis (procesados y eliminados según nuestra política)</li>
                                <li>Preferencias de uso y configuración</li>
                            </ul>

                            <h3 className="font-medium text-charcoal-900 mt-6 mb-3">Datos de facturación:</h3>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2">
                                <li>Información de pago (procesada exclusivamente por Stripe)</li>
                                <li>Historial de transacciones</li>
                            </ul>

                            <div className="bg-green-50 border-l-4 border-green-500 p-4 my-6">
                                <p className="text-charcoal-800 font-medium mb-2">✓ No recabamos datos sensibles</p>
                                <p className="text-charcoal-700 text-sm">
                                    Iurexia NO recaba datos personales sensibles tales como origen étnico,
                                    estado de salud, creencias religiosas, afiliación sindical, orientación
                                    sexual, u otros que pudieran dar origen a discriminación.
                                </p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                III. Finalidades del Tratamiento
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Sus datos personales serán utilizados para las siguientes finalidades primarias,
                                necesarias para la prestación del servicio:
                            </p>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2 mb-6">
                                <li>Crear y administrar su cuenta de usuario</li>
                                <li>Proporcionar acceso a los servicios de la plataforma</li>
                                <li>Procesar pagos y facturación</li>
                                <li>Brindar soporte técnico y atención al cliente</li>
                                <li>Cumplir con obligaciones legales aplicables</li>
                            </ul>

                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Finalidades secundarias</strong> (puede oponerse a estas):
                            </p>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2">
                                <li>Envío de comunicaciones sobre nuevas funcionalidades</li>
                                <li>Análisis estadísticos para mejora del servicio</li>
                                <li>Encuestas de satisfacción</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                IV. Transferencia de Datos
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                De conformidad con el artículo 36 de la LFPDPPP, le informamos que sus datos
                                personales pueden ser transferidos a:
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse my-4">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left py-3 px-4 text-charcoal-900 font-medium">Destinatario</th>
                                            <th className="text-left py-3 px-4 text-charcoal-900 font-medium">Finalidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-3 px-4 text-charcoal-700">Stripe, Inc.</td>
                                            <td className="py-3 px-4 text-charcoal-700">Procesamiento de pagos</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-3 px-4 text-charcoal-700">Supabase, Inc.</td>
                                            <td className="py-3 px-4 text-charcoal-700">Autenticación y almacenamiento</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-3 px-4 text-charcoal-700">Render Services, Inc.</td>
                                            <td className="py-3 px-4 text-charcoal-700">Hosting del servicio</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-3 px-4 text-charcoal-700">Autoridades competentes</td>
                                            <td className="py-3 px-4 text-charcoal-700">Cumplimiento de obligaciones legales</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-charcoal-700 leading-relaxed mt-4">
                                Estas transferencias no requieren de su consentimiento conforme al artículo 37
                                de la LFPDPPP, al ser necesarias para el cumplimiento del contrato de servicios.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                V. Derechos ARCO
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                De conformidad con los artículos 22 a 35 de la LFPDPPP, usted tiene derecho a:
                            </p>

                            <div className="grid md:grid-cols-2 gap-4 my-6">
                                <div className="bg-cream-100 rounded-xl p-4">
                                    <h4 className="font-medium text-charcoal-900 mb-2">🔍 Acceso</h4>
                                    <p className="text-sm text-charcoal-600">
                                        Conocer qué datos personales tenemos sobre usted
                                    </p>
                                </div>
                                <div className="bg-cream-100 rounded-xl p-4">
                                    <h4 className="font-medium text-charcoal-900 mb-2">✏️ Rectificación</h4>
                                    <p className="text-sm text-charcoal-600">
                                        Solicitar la corrección de datos inexactos
                                    </p>
                                </div>
                                <div className="bg-cream-100 rounded-xl p-4">
                                    <h4 className="font-medium text-charcoal-900 mb-2">🚫 Cancelación</h4>
                                    <p className="text-sm text-charcoal-600">
                                        Solicitar la eliminación de sus datos
                                    </p>
                                </div>
                                <div className="bg-cream-100 rounded-xl p-4">
                                    <h4 className="font-medium text-charcoal-900 mb-2">✋ Oposición</h4>
                                    <p className="text-sm text-charcoal-600">
                                        Oponerse al tratamiento para fines específicos
                                    </p>
                                </div>
                            </div>

                            <p className="text-charcoal-700 leading-relaxed">
                                Para ejercer estos derechos, envíe una solicitud a{' '}
                                <a href="mailto:soporte@iurexia.com" className="text-accent-brown hover:underline">
                                    soporte@iurexia.com
                                </a>{' '}
                                con los siguientes datos: nombre completo, correo electrónico registrado,
                                descripción clara del derecho que desea ejercer, y documentos que acrediten
                                su identidad. Responderemos en un plazo máximo de 20 días hábiles.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                VI. Medidas de Seguridad
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                En cumplimiento del artículo 19 de la LFPDPPP, hemos implementado medidas de
                                seguridad administrativas, técnicas y físicas para proteger sus datos personales:
                            </p>
                            <ul className="list-disc pl-6 text-charcoal-700 space-y-2">
                                <li>Cifrado de datos en tránsito (TLS 1.3) y en reposo (AES-256)</li>
                                <li>Autenticación segura con estándares OAuth 2.0</li>
                                <li>Procesamiento de pagos certificado PCI-DSS a través de Stripe</li>
                                <li>Acceso restringido a personal autorizado</li>
                                <li>Monitoreo continuo de seguridad</li>
                                <li>Respaldos periódicos de información</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                VII. Uso de Cookies y Tecnologías de Rastreo
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies
                                de autenticación para mantener su sesión activa. No utilizamos cookies de
                                publicidad ni compartimos información con redes publicitarias.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                VIII. Conservación de Datos
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed">
                                Conservaremos sus datos personales mientras mantenga una cuenta activa en la
                                plataforma, y posteriormente durante los plazos legalmente establecidos para
                                cumplir con obligaciones fiscales y legales (generalmente 5 años conforme al
                                Código Fiscal de la Federación). Los documentos subidos para análisis se procesan
                                en memoria y se eliminan inmediatamente después del análisis.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                IX. Modificaciones al Aviso de Privacidad
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed">
                                Nos reservamos el derecho de modificar el presente Aviso de Privacidad para
                                adaptarlo a novedades legislativas o cambios en nuestros servicios. Cualquier
                                modificación será comunicada a través de la plataforma y/o por correo electrónico.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                X. Autoridad Competente
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed">
                                Si considera que sus derechos han sido vulnerados, puede presentar una queja
                                ante el Instituto Nacional de Transparencia, Acceso a la Información y Protección
                                de Datos Personales (INAI):{' '}
                                <a
                                    href="https://home.inai.org.mx"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent-brown hover:underline"
                                >
                                    www.inai.org.mx
                                </a>
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                XI. Consentimiento
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed">
                                Al utilizar nuestros servicios y proporcionar sus datos personales, usted
                                manifiesta su consentimiento expreso para el tratamiento de los mismos conforme
                                a lo establecido en el presente Aviso de Privacidad.
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
                            href="/terminos"
                            className="text-accent-brown hover:underline font-medium"
                        >
                            ← Términos y Condiciones
                        </Link>
                    </div>
                </div>
            </article>

            <PieDePagina />
        </main>
    );
}
