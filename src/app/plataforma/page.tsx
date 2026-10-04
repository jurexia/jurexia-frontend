'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import DemoCapitulos from '@/components/DemoCapitulos';
import { CAPITULOS } from '@/lib/capitulos-demo';
import PieDePagina from '@/components/PieDePagina';
import VideoChat from '@/components/VideoChat';
import BotonProbar from '@/components/BotonProbar';
import Lamina from '@/components/web/Lamina';
import { BloqueSeguridad, Captura, Cifras, CierreCTA, OtrosModulos } from '@/components/web/bloques';
import { Antetitulo, Boton, clasesBoton, Encabezado, Entrada, Seccion, Titulo } from '@/components/web/sistema';

import { claseWeb } from '@/lib/fuentes-web';
/* ═══ /PLATAFORMA (rehecha el 3-oct-2026, fase 3 del rediseño) ═══
   Tenía 17 secciones y casi 12,000 px de alto: cada función con su propio
   bloque, su dibujo y su lista. Ahora es la puerta de la plataforma, como la
   «Overview» de harvey.ai: la promesa, el producto, el vídeo de la semana, los
   módulos —cada uno con su página: /plataforma/consulta, /redaccion y
   /carpetas—, las grabaciones y, en una sola rejilla, lo que antes ocupaba
   siete secciones.

   Las anclas que enlaza el menú de la barra se conservan: #video, #demos,
   #flujos-de-trabajo, #esfuerzo-de-redaccion y #jurimetria (y las demás de
   las funciones), para que ningún enlace guardado se rompa. */

const FUNCIONES: { id: string; nombre: string; texto: string; href: string; plan?: string }[] = [
    { id: 'busqueda-hibrida', nombre: 'Búsqueda híbrida', texto: 'Por concepto y por término jurídico exacto, con lo más pertinente primero.', href: '/plataforma/consulta#busqueda-hibrida' },
    { id: 'filtros-jurisdiccionales', nombre: 'Filtros jurisdiccionales', texto: 'Tu estado y la federación, nunca la legislación de otro estado.', href: '/plataforma/consulta' },
    { id: 'agente-analisis', nombre: 'Análisis de documentos', texto: 'Demandas, sentencias y amparos: fortalezas, debilidades y mejoras con fundamento.', href: '/plataforma/carpetas#lo-que-ve-iurexia' },
    { id: 'esfuerzo-de-redaccion', nombre: 'Esfuerzo de redacción', texto: 'Básico, Pro o Platinum: cuánto razona Iurexia antes de escribir.', href: '/plataforma/redaccion#esfuerzo' },
    { id: 'flujos-de-trabajo', nombre: 'Flujos de trabajo', texto: 'Siete escritos guiados parte por parte, del encargo al documento.', href: '/plataforma/redaccion#flujos', plan: 'Pro y Platinum' },
    { id: 'precedentes', nombre: 'Precedentes judiciales', texto: 'Más de 111,000 sentencias de Tribunales Colegiados, con su PDF.', href: '/plataforma/consulta#precedentes', plan: 'Pro y Platinum' },
    { id: 'jurimetria', nombre: 'Jurimetría', texto: 'El sentido probable de un amparo, argumento por argumento, a partir de los precedentes.', href: '/plataforma/consulta#precedentes', plan: 'Platinum' },
    { id: 'seguimiento', nombre: 'Seguimiento de expedientes', texto: 'Los portales oficiales revisados cada día hábil, lo nuevo a la vista.', href: '/plataforma/carpetas#seguimiento' },
];

const FUENTES: [string, string][] = [
    ['Leyes federales', 'Constitución, leyes, reglamentos y decretos federales.'],
    ['Legislación de las 32 entidades', 'Códigos civiles, penales, procesales y administrativos de cada estado.'],
    ['Jurisprudencia', 'Tesis y jurisprudencia de la Suprema Corte, los Tribunales Colegiados y los Plenos.'],
    ['Bloque de constitucionalidad', 'Tratados internacionales, cuadernillos y casos de la Corte Interamericana.'],
];

export default function PlataformaPage() {
    return (
        <main className={`${claseWeb} min-h-screen bg-cream-300`}>
            <Navbar />

            {/* La promesa y el producto */}
            <section className="pt-28 sm:pt-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Antetitulo className="mb-5">Plataforma</Antetitulo>
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
                        <Titulo como="h1" escala="portada" className="aparecer">Una plataforma para todo el trabajo jurídico</Titulo>
                        <div>
                            <Entrada>
                                De la primera pregunta al escrito presentado y al expediente vigilado: investigación con fuentes
                                verificadas, redacción con fundamento y cada asunto en su carpeta, sobre el derecho mexicano.
                            </Entrada>
                            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
                                <BotonProbar className={clasesBoton()} sub="Sin correo, sin tarjeta." subClassName="text-xs text-piedra-600">
                                    Probar sin registrarme
                                </BotonProbar>
                                <Boton href="/precios" variante="secundario">Ver planes</Boton>
                            </div>
                        </div>
                    </div>
                    <Lamina tono="tinta" arte="/web/arte/columnata.webp" prioridad className="mt-14 rounded-2xl">
                        <div className="px-4 pt-8 sm:px-12 sm:pt-14 lg:px-20">
                            <div className="mx-auto max-w-5xl translate-y-px">
                                <Captura
                                    src="/web/producto/chat.webp"
                                    alt="El chat de Iurexia hoy: la barra de trabajo con carpetas y consultas, y la caja de consulta con Fuentes y Esfuerzo."
                                    ancho={2000}
                                    alto={1250}
                                    barra="iurexia.com/chat"
                                    prioridad
                                />
                            </div>
                        </div>
                    </Lamina>
                </div>
            </section>

            {/* Una semana con Iurexia (la pieza de producto; el menú enlaza #video) */}
            <div className="pt-16 sm:pt-20">
                <VideoChat
                    id="video"
                    src="/video/iurexia-una-semana.mp4"
                    poster="/video/iurexia-una-semana-poster.webp"
                    rotulo="Una semana con Iurexia, en dos minutos"
                />
            </div>

            {/* Los módulos, cada uno con su página */}
            <OtrosModulos titulo="Elige por dónde empezar" />

            {/* Las grabaciones de la plataforma real (el menú enlaza #demos) */}
            <Seccion id="demos" tono="blanco" espacio="amplio">
                <Encabezado
                    centrado
                    antetitulo="En la plataforma real"
                    titulo="Mira cómo funciona"
                    entrada="Cuatro grabaciones de la plataforma trabajando. Elige la función y mírala de principio a fin."
                    className="mb-10"
                />
                <DemoCapitulos capitulos={CAPITULOS} fondo="bg-transparent" />
            </Seccion>

            {/* Lo que antes ocupaba siete secciones, en una rejilla con sus anclas */}
            <Seccion tono="marfil" espacio="amplio">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Antetitulo className="mb-4">Funciones</Antetitulo>
                        <Titulo escala="bloque" className="max-w-xl">Lo que hace Iurexia, de un vistazo</Titulo>
                    </div>
                </div>
                <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-tinta/10 bg-tinta/10 sm:grid-cols-2 lg:grid-cols-4">
                    {FUNCIONES.map((f) => (
                        <Link key={f.id} id={f.id} href={f.href} className="group flex scroll-mt-28 flex-col bg-cream-300 p-6 transition-colors hover:bg-white">
                            <span className="flex items-baseline justify-between gap-3">
                                <span className="text-[1.0625rem] font-medium text-tinta">{f.nombre}</span>
                                {f.plan && <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-piedra-500">{f.plan}</span>}
                            </span>
                            <span className="mt-2 flex-1 text-[14px] leading-relaxed text-piedra-600">{f.texto}</span>
                            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-tinta group-hover:underline group-hover:underline-offset-4">
                                Conocer <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </span>
                        </Link>
                    ))}
                </div>
            </Seccion>

            {/* El acervo */}
            <Cifras
                titulo="Las fuentes, medidas"
                entrada="Todas las respuestas proceden de fuentes jurídicas públicas: legislación, jurisprudencia y precedentes, con su documento oficial."
            />
            <Seccion tono="tinta" espacio="compacto" className="border-t border-white/[0.06]">
                <div className="grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
                    {FUENTES.map(([nombre, texto]) => (
                        <div key={nombre} className="bg-tinta p-6">
                            <p className="font-serif text-xl font-normal text-cream-100">{nombre}</p>
                            <p className="mt-2 text-[14px] leading-relaxed text-white/55">{texto}</p>
                        </div>
                    ))}
                </div>
            </Seccion>

            {/* El acompañamiento de Platinum */}
            <Seccion tono="marfil" espacio="amplio">
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20">
                    <div>
                        <Antetitulo className="mb-4">Exclusivo de Platinum</Antetitulo>
                        <Titulo escala="bloque">Más que tecnología: acompañamiento humano</Titulo>
                        <Entrada className="mt-5 max-w-md">La plataforma te da las herramientas. Nuestro equipo legal te ayuda a perfeccionar la estrategia.</Entrada>
                        <div className="mt-8">
                            <Boton href="/precios" variante="secundario" tamano="sm">Conocer Platinum</Boton>
                        </div>
                    </div>
                    <ul className="divide-y divide-tinta/10 border-y border-tinta/10">
                        {[
                            ['Consulta directa en la plataforma', 'Escribe a un abogado especializado que revisa tu caso y afina la estrategia que ideaste con Iurexia.'],
                            ['Respaldo profesional formal', 'Contrato de prestación de servicios profesionales, con formalidad y confidencialidad en cada interacción.'],
                            ['Abogados especializados', 'Profesionales con dominio del derecho mexicano, para orientarte con precisión.'],
                        ].map(([t, x]) => (
                            <li key={t} className="py-5">
                                <p className="text-[15px] font-medium text-tinta">{t}</p>
                                <p className="mt-1 text-[14px] leading-relaxed text-piedra-600">{x}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </Seccion>

            <BloqueSeguridad />

            {/* Nota de uso responsable */}
            <section className="border-t border-white/[0.06] bg-tinta">
                <p className="mx-auto max-w-4xl px-4 py-8 text-center text-[13px] leading-relaxed text-white/45">
                    <span className="text-white/70">Nota de uso responsable:</span> Iurexia no presta servicios legales
                    directamente ni pretende sustituir la asesoría profesional: orienta, organiza y fortalece el análisis;
                    la estrategia y su ejecución siempre deben ir acompañadas por un abogado.
                </p>
            </section>

            <CierreCTA />
            <PieDePagina />
        </main>
    );
}
