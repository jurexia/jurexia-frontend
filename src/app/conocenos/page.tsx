import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ConocenosPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="font-serif text-5xl md:text-6xl font-bold text-charcoal-900 mb-6">
                        Diseñada por profesionales del Derecho mexicano,{' '}
                        <span className="text-accent-gold">para el Derecho mexicano</span>
                    </h1>
                    <p className="text-xl text-charcoal-700 leading-relaxed">
                        La práctica jurídica en México merece herramientas que comprendan su complejidad. Iurexia nace del trabajo conjunto de jueces, secretarios del Poder Judicial, litigantes y especialistas técnicos, con una convicción clara: la inteligencia artificial puede transformar el acceso a la justicia, pero solo si está construida desde la realidad jurídica del país.
                    </p>
                </div>
            </section>

            {/* Value Props Cards */}
            <section className="py-12 px-4 bg-cream-200/50">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
                    <div className="bg-white border border-charcoal-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-2">
                            Precisión verificable en cada respuesta
                        </h3>
                    </div>
                    <div className="bg-white border border-charcoal-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-2">
                            De la consulta al abogado ideal
                        </h3>
                    </div>
                    <div className="bg-white border border-charcoal-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-2">
                            Especializada en Derecho mexicano, desde México
                        </h3>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto space-y-16">

                    {/* Nuestra Misión */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-6">Nuestra misión</h2>
                        <p className="text-lg text-charcoal-700 leading-relaxed">
                            Democratizar el acceso a información jurídica precisa, verificable y comprensible para todos. Apoyar a profesionales del Derecho con investigación asistida por IA que reduce tiempos sin comprometer rigor. Orientar a personas sin formación jurídica hacia la claridad y el siguiente paso correcto. En síntesis: hacer que el conocimiento legal mexicano sea accesible, confiable y utilizable.
                        </p>
                    </div>

                    {/* Qué nos hace diferentes */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-6">Qué nos hace diferentes</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-3">
                                    Especialización México-first
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Nuestra base de datos está construida exclusivamente con legislación y jurisprudencia mexicana verificada: códigos federales y de las 32 entidades, jurisprudencia de la SCJN, tribunales colegiados y, cuando corresponde, precedentes relevantes de la Corte Interamericana de Derechos Humanos. No usamos modelos genéricos internacionales que "aprenden" de otros sistemas jurídicos.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-3">
                                    Respuestas verificadas, con comprobación en tiempo real
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Cada respuesta de Iurexia incluye referencias trazables a documentos específicos. Trabajamos con un sistema de recuperación de información basado en Inteligencia Artificial que vincula cada afirmación legal con su fuente original. No prometemos infalibilidad —ninguna IA puede hacerlo con responsabilidad—, pero sí reducimos drásticamente el riesgo de inventar contenido inexistente. Si el sistema no encuentra fundamento en la base de datos, lo indica expresamente.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-3">
                                    Memoria conversacional
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Iurexia recuerda el contexto de tu caso a lo largo del diálogo. No tienes que repetir antecedentes; la IA construye sobre lo que ya has compartido, permitiendo profundizar en análisis, explorar alternativas procesales o ajustar estrategias sin empezar desde cero en cada consulta.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-3">
                                    Doble propósito: profesionales y ciudadanos
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Para abogados: investigación jurídica asistida, análisis de documentos, borradores fundados, comparativas normativas entre entidades federativas, detección de contradicciones en escritos. Para personas sin formación legal: orientación inicial en lenguaje natural, explicación de figuras jurídicas, identificación de derechos y vías de acción. Misma tecnología, interfaz adaptada a cada necesidad.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quiénes somos */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-6">Quiénes somos</h2>
                        <div className="space-y-4 text-charcoal-700 leading-relaxed">
                            <p>
                                Iurexia es una iniciativa impulsada por profesionales del Derecho con experiencia en el Poder Judicial y litigio independiente, acompañados de especialistas en arquitectura web, inteligencia artificial, seguridad informática y diseño de producto. El proyecto fue liderado por un equipo de Profesionales del derecho y expertos en programación, con la colaboración de jueces estatales, secretarios del Poder Judicial de la Federación y abogados litigantes que aportaron su conocimiento práctico para definir qué respuestas necesita realmente un usuario al consultar normativa o buscar estrategia procesal.
                            </p>
                            <p>
                                No somos una empresa de tecnología que incursiona en legal; somos profesionales del Derecho que utilizan tecnología para resolver problemas que conocemos de primera mano: la dificultad de encontrar jurisprudencia aplicable en tiempo útil, la complejidad de contrastar normativa de múltiples jurisdicciones, la barrera de lenguaje técnico que aleja a las personas de entender sus derechos.
                            </p>
                        </div>
                    </div>

                    {/* Cómo cuidamos la precisión */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-6">Cómo cuidamos la precisión</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Fuentes verificadas</h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Cada documento en nuestra base de datos proviene de fuentes oficiales: Diario Oficial de la Federación, gacetas estatales, Semanario Judicial de la Federación, publicaciones de tribunales. No integramos contenido no verificable.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Trazabilidad obligatoria</h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Toda respuesta incluye identificadores únicos de documento (Doc ID) que permiten rastrear la fuente exacta. Si citamos un artículo, indicamos de qué ley proviene y en qué silo de información se encuentra. Si mencionamos jurisprudencia, especificamos tribunal, registro y rubro.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Principio de honestidad ante vacíos</h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Si el sistema no recupera información suficiente para responder con fundamento, lo comunica expresamente. No se generan textos especulativos para "rellenar" una respuesta. Esta transparencia es crítica en materia legal.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Memoria conversacional segura</h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    El historial de tu caso se almacena de forma cifrada y solo tú puedes acceder a él. Esto permite continuidad en el análisis sin comprometer confidencialidad.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Actualización continua</h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    La base se actualiza con nuevas leyes, reformas y jurisprudencia reciente. El Derecho es dinámico; la herramienta debe serlo también.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Iurexia Connect */}
                    <div className="bg-gradient-to-br from-blue-50 to-cream-200 border border-blue-200 rounded-2xl p-8">
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-6">
                            Iurexia Connect: del diagnóstico a la representación
                        </h2>
                        <p className="text-charcoal-700 leading-relaxed mb-6">
                            Entendimos que orientación jurídica y representación profesional no son excluyentes, sino complementarias. Iurexia Connect cierra ese ciclo.
                        </p>

                        <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-4">Cómo funciona:</h3>
                        <ol className="space-y-4 text-charcoal-700">
                            <li className="flex gap-3">
                                <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                                <div>
                                    <strong>Describes tu problema en lenguaje natural</strong><br />
                                    No necesitas saber terminología jurídica. Explicas tu situación como se la contarías a un amigo.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                                <div>
                                    <strong>La IA hace matching semántico</strong><br />
                                    No buscamos palabras clave; analizamos el contexto de tu caso y lo comparamos con las especialidades de abogados registrados en la red.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                                <div>
                                    <strong>Filtramos por especialidad y jurisdicción</strong><br />
                                    Si tu caso es laboral en Jalisco, Connect prioriza laboralistas certificados que operan en Jalisco.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                                <div>
                                    <strong>Recibes perfiles ordenados por relevancia</strong><br />
                                    Los abogados aparecen con su cédula profesional verificada, especialidades declaradas y jurisdicciones de práctica.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                                <div>
                                    <strong>Tú decides a quién contactar</strong><br />
                                    El abogado recibe un resumen de tu caso generado por la IA, lo que agiliza la primera consulta.
                                </div>
                            </li>
                        </ol>
                    </div>

                    {/* Compromisos */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-6">Nuestros compromisos</h2>
                        <div className="space-y-6 text-charcoal-700 leading-relaxed">
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Ética y transparencia</h3>
                                <p>
                                    Iurexia no presta servicios legales directamente. Somos herramienta de orientación e investigación. Cada usuario debe validar información y, cuando el caso lo requiera, acudir a un abogado para asesoría formal y representación.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Privacidad y seguridad</h3>
                                <p>
                                    Tus consultas, documentos y conversaciones están cifrados. No vendemos datos. No compartimos casos con terceros. El contenido de tu interacción con la IA es tuyo.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Mejora continua basada en la comunidad</h3>
                                <p>
                                    Escuchamos retroalimentación de abogados y usuarios. Ajustamos algoritmos, ampliamos cobertura normativa y refinamos la interfaz con base en necesidades reales.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal-900 mb-2">Lenguaje accesible sin sacrificar rigor</h3>
                                <p>
                                    Nos esforzamos por explicar conceptos jurídicos en términos comprensibles, pero sin trivializar su complejidad. El Derecho es técnico; nuestra tarea es hacerlo navegable, no simplificarlo hasta distorsionarlo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Aviso Responsable */}
                    <div className="bg-cream-200 border-l-4 border-accent-gold p-6 rounded-r-lg">
                        <h3 className="font-serif text-xl font-semibold text-charcoal-900 mb-3">Aviso responsable</h3>
                        <p className="text-charcoal-700 leading-relaxed">
                            Iurexia es una herramienta tecnológica de apoyo a la investigación y orientación jurídica. No sustituye la asesoría legal profesional, no genera relaciones abogado-cliente por el simple uso de la plataforma, y no garantiza resultados específicos en procesos judiciales o administrativos. Toda información proporcionada debe ser validada por el usuario y, en su caso, consultada con un abogado certificado. El uso de Iurexia implica aceptar estos términos de responsabilidad limitada.
                        </p>
                    </div>

                    {/* FAQ Section */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mb-8">Preguntas frecuentes</h2>
                        <div className="space-y-6">
                            <div className="bg-white border border-charcoal-200 rounded-lg p-6">
                                <h3 className="font-semibold text-charcoal-900 mb-3">
                                    ¿Iurexia reemplaza a un abogado?
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    No. Iurexia es una herramienta de orientación e investigación jurídica. Para asesoría formal, representación en juicios o elaboración de estrategias procesales complejas, siempre debes consultar a un abogado certificado. Connect facilita ese encuentro.
                                </p>
                            </div>
                            <div className="bg-white border border-charcoal-200 rounded-lg p-6">
                                <h3 className="font-semibold text-charcoal-900 mb-3">
                                    ¿Cómo sé que las respuestas son confiables?
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    Cada respuesta incluye referencias específicas (Doc ID) que rastrean la fuente exacta: artículo de ley, tesis jurisprudencial o tratado internacional. Si el sistema no encuentra fundamento en su base de datos, lo comunica expresamente en lugar de inventar contenido.
                                </p>
                            </div>
                            <div className="bg-white border border-charcoal-200 rounded-lg p-6">
                                <h3 className="font-semibold text-charcoal-900 mb-3">
                                    ¿Qué tan actualizada está la información?
                                </h3>
                                <p className="text-charcoal-700 leading-relaxed">
                                    La base de datos se actualiza continuamente con nuevas leyes, reformas y jurisprudencia reciente publicada en fuentes oficiales. Trabajamos con un sistema de integración que revisa periódicamente el Diario Oficial de la Federación, gacetas estatales y el Semanario Judicial.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Final */}
                    <div className="bg-gradient-to-br from-charcoal-900 to-charcoal-800 rounded-2xl p-12 text-center">
                        <h2 className="font-serif text-3xl font-bold text-white mb-4">
                            Únete a la transformación del acceso a la justicia en México
                        </h2>
                        <p className="text-cream-200 text-lg mb-8 max-w-2xl mx-auto">
                            Iurexia no es solo tecnología; es una comunidad de profesionales y ciudadanos que creen en un sistema legal más accesible, transparente y eficiente.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/registro"
                                className="btn-primary text-base px-8 py-3"
                            >
                                Probar Iurexia
                            </Link>
                            <Link
                                href="/connect"
                                className="bg-white text-charcoal-900 border-2 border-white rounded-full px-8 py-3 font-semibold hover:bg-cream-100 transition-all duration-200"
                            >
                                Encontrar un abogado (Connect)
                            </Link>
                        </div>
                    </div>

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
                            <Link href="/conocenos" className="hover:text-charcoal-900 transition-colors">Conócenos</Link>
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
