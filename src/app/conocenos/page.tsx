import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import PieDePagina from '@/components/PieDePagina';
import Lamina from '@/components/web/Lamina';
import { Antetitulo, Boton, Entrada, Titulo } from '@/components/web/sistema';
import { claseWeb } from '@/lib/fuentes-web';

export const metadata: Metadata = {
    title: 'Conócenos | Iurexia',
    description: 'Iurexia es inteligencia artificial jurídica diseñada por profesionales del derecho mexicano, con cada cita verificada contra su fuente oficial.',
    alternates: { canonical: '/conocenos' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/conocenos.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Conócenos | Iurexia', description: 'Inteligencia artificial jurídica diseñada por profesionales del derecho mexicano.', url: '/conocenos' },
    twitter: { card: 'summary_large_image', images: ['/og/conocenos.jpg'] },
};

/* ═══ CONÓCENOS (rehecha el 3-oct-2026, segunda vuelta del rediseño) ═══
   La página de empresa de harvey.ai: la promesa, una obra, y el texto en dos
   columnas —el título fijo a la izquierda mientras se lee a la derecha—. Los
   textos son los de siempre, palabra por palabra: sólo cambió la forma. */

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <section className="border-t border-tinta/10 py-14 sm:py-20">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:gap-16">
                <h2 className="font-serif text-display-xs font-normal text-tinta [text-wrap:balance] sm:text-display-s lg:sticky lg:top-28 lg:self-start">{titulo}</h2>
                <div className="max-w-2xl text-[1.0625rem] leading-relaxed text-piedra-700">{children}</div>
            </div>
        </section>
    );
}

function Punto({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <div className="border-t border-tinta/10 pt-5 first:border-t-0 first:pt-0">
            <h3 className="font-sans text-[1.0625rem] font-medium tracking-normal text-tinta">{titulo}</h3>
            <p className="mt-2">{children}</p>
        </div>
    );
}

export default function ConocenosPage() {
    return (
        <main className={`${claseWeb} min-h-screen bg-cream-300`}>
            <Navbar />

            {/* La promesa */}
            <section className="pt-28 sm:pt-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Antetitulo className="mb-5">Conócenos</Antetitulo>
                    {/* El título es largo: a lo ancho cabe en tres líneas; en media columna bajaba en cinco. */}
                    <Titulo como="h1" escala="portada" className="aparecer max-w-5xl">
                        Diseñada por profesionales del Derecho mexicano, para el Derecho mexicano
                    </Titulo>
                    <div className="mt-8 grid lg:mt-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
                        <Entrada className="aparecer [animation-delay:120ms] lg:col-start-2">
                            La práctica jurídica en México merece herramientas que comprendan su complejidad. Iurexia nace del
                            trabajo conjunto de jueces, secretarios del Poder Judicial, litigantes y especialistas técnicos, con
                            una convicción clara: la inteligencia artificial puede transformar el acceso a la justicia, pero solo
                            si está construida desde la realidad jurídica del país.
                        </Entrada>
                    </div>

                    {/* Los tres pilares, sobre una obra */}
                    <Lamina tono="piedra" arte="/web/arte/cupula.webp" prioridad className="mt-14 rounded-2xl">
                        <div className="grid gap-4 p-6 sm:p-12 md:grid-cols-3 lg:p-16">
                            {['Precisión verificable en cada respuesta', 'De la consulta al abogado ideal', 'Especializada en Derecho mexicano, desde México'].map((t) => (
                                <div key={t} className="flex min-h-[9rem] items-end rounded-xl bg-white/90 p-6 shadow-[0_20px_40px_-25px_rgba(15,14,13,0.4)] ring-1 ring-black/5 backdrop-blur-sm">
                                    <p className="font-serif text-[1.4rem] font-normal leading-snug text-tinta">{t}</p>
                                </div>
                            ))}
                        </div>
                    </Lamina>
                </div>
            </section>

            {/* El texto, en dos columnas */}
            <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16 lg:px-8">
                <Bloque titulo="Nuestra misión">
                    <p>
                        Democratizar el acceso a información jurídica precisa, verificable y comprensible para todos. Apoyar a
                        profesionales del Derecho con investigación asistida por IA que reduce tiempos sin comprometer rigor.
                        Orientar a personas sin formación jurídica hacia la claridad y el siguiente paso correcto. En síntesis:
                        hacer que el conocimiento legal mexicano sea accesible, confiable y utilizable.
                    </p>
                </Bloque>

                <Bloque titulo="Qué nos hace diferentes">
                    <div className="space-y-6">
                        <Punto titulo="Especialización México-first">
                            Nuestra base de datos está construida exclusivamente con legislación y jurisprudencia mexicana
                            verificada: códigos federales y de las 32 entidades, jurisprudencia de la SCJN, tribunales colegiados
                            y, cuando corresponde, precedentes relevantes de la Corte Interamericana de Derechos Humanos. No usamos
                            modelos genéricos internacionales que &quot;aprenden&quot; de otros sistemas jurídicos.
                        </Punto>
                        <Punto titulo="Respuestas verificadas, con comprobación en tiempo real">
                            Cada respuesta de Iurexia incluye referencias trazables a documentos específicos. Trabajamos con un
                            sistema de recuperación de información basado en Inteligencia Artificial que vincula cada afirmación
                            legal con su fuente original. No prometemos infalibilidad —ninguna IA puede hacerlo con
                            responsabilidad—, pero sí reducimos drásticamente el riesgo de inventar contenido inexistente. Si el
                            sistema no encuentra fundamento en la base de datos, lo indica expresamente.
                        </Punto>
                        <Punto titulo="Memoria conversacional">
                            Iurexia recuerda el contexto de tu caso a lo largo del diálogo. No tienes que repetir antecedentes; la
                            IA construye sobre lo que ya has compartido, permitiendo profundizar en análisis, explorar alternativas
                            procesales o ajustar estrategias sin empezar desde cero en cada consulta.
                        </Punto>
                        <Punto titulo="Doble propósito: profesionales y ciudadanos">
                            Para abogados: investigación jurídica asistida, análisis de documentos, borradores fundados,
                            comparativas normativas entre entidades federativas, detección de contradicciones en escritos. Para
                            personas sin formación legal: orientación inicial en lenguaje natural, explicación de figuras
                            jurídicas, identificación de derechos y vías de acción. Misma tecnología, interfaz adaptada a cada
                            necesidad.
                        </Punto>
                    </div>
                </Bloque>

                <Bloque titulo="Quiénes somos">
                    <div className="space-y-4">
                        <p>
                            Iurexia es una iniciativa impulsada por profesionales del Derecho con experiencia en el Poder Judicial
                            y litigio independiente, acompañados de especialistas en arquitectura web, inteligencia artificial,
                            seguridad informática y diseño de producto. El proyecto fue liderado por un equipo de Profesionales del
                            derecho y expertos en programación, con la colaboración de jueces estatales, secretarios del Poder
                            Judicial de la Federación y abogados litigantes que aportaron su conocimiento práctico para definir qué
                            respuestas necesita realmente un usuario al consultar normativa o buscar estrategia procesal.
                        </p>
                        <p>
                            No somos una empresa de tecnología que incursiona en legal; somos profesionales del Derecho que
                            utilizan tecnología para resolver problemas que conocemos de primera mano: la dificultad de encontrar
                            jurisprudencia aplicable en tiempo útil, la complejidad de contrastar normativa de múltiples
                            jurisdicciones, la barrera de lenguaje técnico que aleja a las personas de entender sus derechos.
                        </p>
                    </div>
                </Bloque>

                <Bloque titulo="Cómo cuidamos la precisión">
                    <div className="space-y-6">
                        <Punto titulo="Fuentes verificadas">
                            Cada documento en nuestra base de datos proviene de fuentes oficiales: Diario Oficial de la
                            Federación, gacetas estatales, Semanario Judicial de la Federación, publicaciones de tribunales. No
                            integramos contenido no verificable.
                        </Punto>
                        <Punto titulo="Trazabilidad obligatoria">
                            Toda respuesta incluye identificadores únicos de documento (Doc ID) que permiten rastrear la fuente
                            exacta. Si citamos un artículo, indicamos de qué ley proviene y en qué silo de información se
                            encuentra. Si mencionamos jurisprudencia, especificamos tribunal, registro y rubro.
                        </Punto>
                        <Punto titulo="Principio de honestidad ante vacíos">
                            Si el sistema no recupera información suficiente para responder con fundamento, lo comunica
                            expresamente. No se generan textos especulativos para &quot;rellenar&quot; una respuesta. Esta transparencia
                            es crítica en materia legal.
                        </Punto>
                        <Punto titulo="Memoria conversacional segura">
                            El historial de tu caso se almacena de forma cifrada y solo tú puedes acceder a él. Esto permite
                            continuidad en el análisis sin comprometer confidencialidad.
                        </Punto>
                        <Punto titulo="Actualización continua">
                            La base se actualiza con nuevas leyes, reformas y jurisprudencia reciente. El Derecho es dinámico; la
                            herramienta debe serlo también.
                        </Punto>
                    </div>
                </Bloque>

                {/* Connect, en su lámina */}
                <section className="border-t border-tinta/10 py-14 sm:py-20">
                    <Lamina tono="tinta" arte="/web/arte/biblioteca.webp" velo="arriba" className="rounded-2xl">
                        <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] lg:gap-16 lg:p-16">
                            <div>
                                <Antetitulo oscuro className="mb-4">Iurexia Connect</Antetitulo>
                                <h2 className="font-serif text-display-xs font-normal text-cream-100 [text-wrap:balance] sm:text-display-s">
                                    Iurexia Connect: del diagnóstico a la representación
                                </h2>
                                <p className="mt-5 text-[15px] leading-relaxed text-white/65">
                                    Entendimos que orientación jurídica y representación profesional no son excluyentes, sino
                                    complementarias. Iurexia Connect cierra ese ciclo.
                                </p>
                                <div className="mt-7">
                                    <Boton href="/connect" variante="secundario" oscuro tamano="sm">Conocer Connect</Boton>
                                </div>
                            </div>
                            <ol className="divide-y divide-white/10 border-y border-white/10">
                                {[
                                    ['Describes tu problema en lenguaje natural', 'No necesitas saber terminología jurídica. Explicas tu situación como se la contarías a un amigo.'],
                                    ['La IA hace matching semántico', 'No buscamos palabras clave; analizamos el contexto de tu caso y lo comparamos con las especialidades de abogados registrados en la red.'],
                                    ['Filtramos por especialidad y jurisdicción', 'Si tu caso es laboral en Jalisco, Connect prioriza laboralistas certificados que operan en Jalisco.'],
                                    ['Recibes perfiles ordenados por relevancia', 'Los abogados aparecen con su cédula profesional verificada, especialidades declaradas y jurisdicciones de práctica.'],
                                    ['Tú decides a quién contactar', 'El abogado recibe un resumen de tu caso generado por la IA, lo que agiliza la primera consulta.'],
                                ].map(([t, x], i) => (
                                    <li key={t} className="flex gap-4 py-4">
                                        <span className="font-serif text-lg text-white/40 tabular-nums">{i + 1}</span>
                                        <div>
                                            <p className="text-[15px] font-medium text-cream-100">{t}</p>
                                            <p className="mt-1 text-[14px] leading-relaxed text-white/55">{x}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </Lamina>
                </section>

                <Bloque titulo="Nuestros compromisos">
                    <div className="space-y-6">
                        <Punto titulo="Ética y transparencia">
                            Iurexia no presta servicios legales directamente. Somos herramienta de orientación e investigación.
                            Cada usuario debe validar información y, cuando el caso lo requiera, acudir a un abogado para asesoría
                            formal y representación.
                        </Punto>
                        <Punto titulo="Privacidad y seguridad">
                            Tus consultas, documentos y conversaciones están cifrados. No vendemos datos. No compartimos casos con
                            terceros. El contenido de tu interacción con la IA es tuyo.
                        </Punto>
                        <Punto titulo="Mejora continua basada en la comunidad">
                            Escuchamos retroalimentación de abogados y usuarios. Ajustamos algoritmos, ampliamos cobertura
                            normativa y refinamos la interfaz con base en necesidades reales.
                        </Punto>
                        <Punto titulo="Lenguaje accesible sin sacrificar rigor">
                            Nos esforzamos por explicar conceptos jurídicos en términos comprensibles, pero sin trivializar su
                            complejidad. El Derecho es técnico; nuestra tarea es hacerlo navegable, no simplificarlo hasta
                            distorsionarlo.
                        </Punto>
                    </div>
                </Bloque>

                <Bloque titulo="Aviso responsable">
                    <p>
                        Iurexia es una herramienta tecnológica de apoyo a la investigación y orientación jurídica. No sustituye
                        la asesoría legal profesional, no genera relaciones abogado-cliente por el simple uso de la plataforma, y
                        no garantiza resultados específicos en procesos judiciales o administrativos. Toda información
                        proporcionada debe ser validada por el usuario y, en su caso, consultada con un abogado certificado. El
                        uso de Iurexia implica aceptar estos términos de responsabilidad limitada.
                    </p>
                </Bloque>

                <Bloque titulo="Preguntas frecuentes">
                    <div className="space-y-6">
                        <Punto titulo="¿Iurexia reemplaza a un abogado?">
                            No. Iurexia es una herramienta de orientación e investigación jurídica. Para asesoría formal,
                            representación en juicios o elaboración de estrategias procesales complejas, siempre debes consultar a
                            un abogado certificado. Connect facilita ese encuentro.
                        </Punto>
                        <Punto titulo="¿Cómo sé que las respuestas son confiables?">
                            Cada respuesta incluye referencias específicas (Doc ID) que rastrean la fuente exacta: artículo de ley,
                            tesis jurisprudencial o tratado internacional. Si el sistema no encuentra fundamento en su base de
                            datos, lo comunica expresamente en lugar de inventar contenido.
                        </Punto>
                        <Punto titulo="¿Qué tan actualizada está la información?">
                            La base de datos se actualiza continuamente con nuevas leyes, reformas y jurisprudencia reciente
                            publicada en fuentes oficiales. Trabajamos con un sistema de integración que revisa periódicamente el
                            Diario Oficial de la Federación, gacetas estatales y el Semanario Judicial.
                        </Punto>
                    </div>
                </Bloque>
            </div>

            {/* La llamada final, con sus dos caminos de siempre */}
            <section className="mt-10 bg-tinta text-cream-100 sm:mt-16">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div className="max-w-2xl">
                        <p className="font-serif text-display-xs font-normal [text-wrap:balance] sm:text-display-s">
                            Únete a la transformación del acceso a la justicia en México
                        </p>
                        <p className="mt-3 text-[1.0625rem] text-white/60">
                            Iurexia no es solo tecnología; es una comunidad de profesionales y ciudadanos que creen en un sistema
                            legal más accesible, transparente y eficiente.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:flex-row">
                        <Boton href="/registro" oscuro>Probar Iurexia</Boton>
                        <Boton href="/connect" variante="secundario" oscuro>Encontrar un abogado (Connect)</Boton>
                    </div>
                </div>
            </section>

            <PieDePagina />
        </main>
    );
}
