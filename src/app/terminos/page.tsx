'use client';

import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export default function TerminosPage() {
    const fechaActualizacion = "15 de septiembre de 2026";

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

                        {/* ═══ LA CLÁUSULA DEL TALLER DE SENTENCIAS ═══
                            David, 13-sep-2026: «la suscripción implica contratar
                            un servicio de software de inteligencia artificial con
                            cláusula de estricta privacidad, que exime a Iurexia
                            del uso irresponsable por parte del usuario al generar
                            los documentos. El redactor es una herramienta de
                            apoyo, no un sustituto. Esto agrégalo a términos y
                            condiciones. Cuando el usuario acepta el servicio y
                            hace el pago, acepta esos términos».

                            VA INMEDIATAMENTE DESPUÉS DE LA ACEPTACIÓN y antes de
                            la descripción del servicio, no al final: es lo que
                            delimita la responsabilidad de quien firma un proyecto
                            con su nombre, y enterrarla en el apartado catorce
                            sería esconderla. */}
                        <section className="mb-8">
                            <h2 className="font-serif text-2xl font-medium text-charcoal-900 mb-4">
                                1 bis. Taller de sentencias: naturaleza del servicio,
                                privacidad y responsabilidad
                            </h2>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Qué se contrata.</strong> La suscripción al taller de
                                sentencias —incluido el Plan Ultra Secretarios— es la contratación de
                                un <strong>servicio de software de inteligencia artificial</strong>.
                                No es asesoría jurídica, no constituye una opinión legal y no crea
                                relación abogado-cliente. Iurexia pone a disposición una herramienta;
                                el criterio jurídico, en todos los casos, es de quien la usa.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Herramienta de apoyo, no sustituto.</strong> El redactor
                                produce <em>borradores</em>. No sustituye el estudio del expediente,
                                el criterio del servidor público ni la revisión de quien suscribe la
                                resolución. El usuario se obliga a verificar, antes de darle cualquier
                                uso, la identidad de las partes, la exactitud de las fechas y del
                                cómputo, la existencia y el contenido de los criterios citados, su
                                obligatoriedad, y que estén contestados todos los planteamientos.
                                Todo documento generado se entrega con la advertencia de que es un
                                borrador no firmable.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Privacidad estricta.</strong> Los documentos, expedientes y
                                textos que el usuario cargue en el taller se tratan bajo cláusula de
                                confidencialidad estricta: <strong>no se utilizan para entrenar
                                modelos</strong>, no se ceden a terceros con fines comerciales y no se
                                emplean para ninguna finalidad distinta de prestarle el servicio al
                                propio usuario. Los proveedores de modelos de inteligencia artificial
                                que Iurexia contrata operan bajo condiciones contractuales de no
                                entrenamiento con los datos transmitidos por su interfaz de
                                programación. El usuario conserva la titularidad de sus documentos y
                                puede solicitar su eliminación en cualquier momento.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Uso responsable y deslinde.</strong> El usuario es el único
                                responsable del uso que dé a los documentos generados, de su
                                contenido definitivo una vez editado y de su incorporación a cualquier
                                actuación. <strong>Iurexia queda exenta de responsabilidad</strong> por
                                el uso irresponsable, negligente o contrario a derecho de los
                                documentos generados, incluyendo —de manera enunciativa y no
                                limitativa— su empleo sin la verificación exigida en esta cláusula,
                                su firma o presentación sin revisión, la carga de información a la que
                                el usuario no tenga derecho de acceso, y cualquier consecuencia
                                procesal, administrativa o disciplinaria derivada de ello.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Cuotas, recargas y almacenamiento.</strong> Cada plan incluye
                                un número de proyectos de sentencia al mes, que se renueva al inicio
                                de cada periodo y <strong>no es acumulable</strong>. El usuario puede
                                adquirir recargas de proyectos adicionales mediante pago único; los
                                proyectos así adquiridos <strong>no caducan</strong> y se consumen
                                únicamente después de agotada la cuota mensual del plan. Las recargas
                                no son reembolsables una vez acreditadas, salvo lo dispuesto por la
                                legislación aplicable en materia de protección al consumidor. El plan
                                incluye asimismo una capacidad de almacenamiento determinada para los
                                expedientes del usuario.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                <strong>Aceptación con el pago.</strong> La contratación de la
                                suscripción o de una recarga, y la realización del pago
                                correspondiente, constituyen la aceptación expresa de esta cláusula y
                                de la totalidad de los presentes Términos y Condiciones, en términos
                                de los artículos 1803 y 1834 bis del Código Civil Federal y 89 del
                                Código de Comercio, relativos al consentimiento expresado por medios
                                electrónicos.
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

                            <h3 className="font-serif text-lg font-medium text-charcoal-900 mt-6 mb-2">
                                7.5 Suspensión de la cuenta por falta de pago
                            </h3>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Cuando un cargo de renovación no pueda procesarse, Iurexia reintentará el
                                cobro durante un <strong>plazo de gracia de catorce (14) días naturales</strong>,
                                contados desde la fecha de la factura no cubierta. Durante ese plazo la cuenta
                                conserva su acceso íntegro y el usuario recibe avisos con el enlace para
                                actualizar su método de pago.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Transcurrido ese plazo sin que el adeudo se cubra, la cuenta pasa
                                automáticamente al estado de <strong>suspensión por falta de pago</strong>. La
                                cuenta suspendida <strong>no permite el uso de ninguna función de la
                                plataforma</strong> —consultas, redacción de documentos, análisis de
                                expedientes ni acceso al historial— y así permanecerá hasta que el adeudo sea
                                cubierto.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>La suspensión no es una cancelación.</strong> El usuario conserva su
                                plan contratado, su tarifa vigente —incluida, en su caso, la tarifa preferente
                                de socio fundador—, sus conversaciones, sus carpetas y sus documentos, así como
                                el vínculo con su método de pago. La suscripción continúa devengándose y
                                facturándose <strong>hasta que el propio usuario la cancele</strong> por las
                                vías previstas en la cláusula 7.2, por lo que el hecho de no cancelar y dejar de
                                pagar no extingue la obligación de pago ni el adeudo acumulado.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>La reactivación es automática e inmediata al cubrirse el adeudo.</strong>{' '}
                                En cuanto el pago se confirma, la cuenta recupera su plan y la totalidad de su
                                contenido en el estado en que quedó, sin gestión alguna por parte del usuario.
                                La única vía de reactivación es el pago de las cantidades pendientes.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                Esta medida se aplica de manera general y uniforme a todo usuario con
                                suscripción de pago cuyo adeudo rebase el plazo de gracia señalado. Si el
                                usuario considera que la suspensión obedece a un error, o atraviesa una
                                circunstancia que le impide cubrir el pago, puede escribir a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline">soporte@iurexia.com</a>,
                                donde su caso será revisado; la dispensa prevista en la cláusula 7.4 sigue
                                estando disponible.
                            </p>

                            <h3 className="font-serif text-lg font-medium text-charcoal-900 mt-6 mb-3">
                                7.6 Desconocimiento de cargos ante la institución bancaria
                            </h3>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Conforme a la cláusula 7.4, el usuario cuenta con una vía directa, gratuita y sin
                                necesidad de justificación para obtener la cancelación de su suscripción y el
                                reembolso del período: basta con escribir a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline">soporte@iurexia.com</a>.
                                El usuario se obliga a acudir a ella antes de iniciar cualquier reclamación ante su
                                institución bancaria.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                Cuando el usuario desconozca un cargo ante su institución bancaria —por la vía de una
                                aclaración, una contracargo o cualquier reclamación equivalente—,{' '}
                                <strong>su suscripción será cancelada y su cuenta quedará bloqueada</strong>, sin
                                perjuicio de las cantidades que resulten a cargo del usuario.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed mb-4">
                                <strong>Esta medida es de seguridad, no sancionatoria.</strong> El desconocimiento de un
                                cargo pone en duda quién ejerce el control del medio de pago: puede deberse a un error
                                del propio titular, pero también al uso de una tarjeta por persona distinta de aquél.
                                Mantener activo un servicio de renovación automática sobre un medio de pago cuestionado
                                expondría al titular a cobros sucesivos que quizá no autorizó. La cancelación y el
                                bloqueo impiden ese riesgo, y se aplican de manera general y uniforme a todo usuario en
                                ese supuesto.
                            </p>
                            <p className="text-charcoal-700 leading-relaxed">
                                <strong>El bloqueo es revisable y el contenido se conserva.</strong> Las conversaciones,
                                carpetas y documentos del usuario permanecen íntegros. Si el desconocimiento del cargo
                                obedeció a un error, el usuario puede escribir a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline">soporte@iurexia.com</a>{' '}
                                desde el correo de su cuenta; acreditado el reconocimiento del cargo ante su institución
                                bancaria, la cuenta se restablece con todo su contenido.
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
