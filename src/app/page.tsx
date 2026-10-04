'use client';

import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import HeroVideo from '@/components/HeroVideo';
import AnuncioOpenAI from '@/components/AnuncioOpenAI';
import VideoChat from '@/components/VideoChat';
import DespachosVitrina from '@/components/DespachosVitrina';
import EstudiarEnPortada from '@/components/estudiar/EstudiarEnPortada';
import PieDePagina from '@/components/PieDePagina';
import Lamina from '@/components/web/Lamina';
import AcordeonModulos, { type ItemModulo } from '@/components/web/AcordeonModulos';
import Testimonios from '@/components/web/Testimonios';
import Comparativa from '@/components/web/Comparativa';
import { BloqueSeguridad, Cifras, CierreCTA } from '@/components/web/bloques';
import { Antetitulo, Boton, Encabezado, Seccion } from '@/components/web/sistema';

import { claseWeb } from '@/lib/fuentes-web';
/* ═══ LA PORTADA (rehecha el 3-oct-2026, fase 2 del rediseño) ═══
   Tras el barrido de harvey.ai, David: «adelante con todos los cambios pero no
   quites logos, ya le hace falta un nuevo estilo a la página».

   De 15 secciones a 11, y cada una dice una sola cosa, en el orden en que la
   pregunta quien llega a evaluarnos:
   1. qué es (el vídeo de la bandera, que se queda como David lo dejó);
   2. con qué tecnología (la franja de OpenAI);
   3. cómo se ve (la plataforma en dos minutos) y quién lo usa (los logotipos
      de los despachos: no se quitan);
   4. para quién es (abogados y despachos · Poder Judicial), con el producto
      real en cada tarjeta;
   5. qué hace, función por función, con sus grabaciones;
   6. qué dicen quienes lo usan; en qué se distingue de una IA genérica
      (sin ChatGPT desde el 4-oct: Iurexia usa modelos de OpenAI); el acervo
      en cifras; la seguridad;
   7. y el conocimiento gratuito (Estudiar y pensar) antes del cierre.
   Salieron de la portada —no del sitio— la tarjeta de ciudadanos, la caja de
   chat dibujada, la demo por capítulos (ahora es el acordeón) y Connect, que
   pasa a Soluciones. */

const MODULOS: ItemModulo[] = [
    {
        id: 'consulta',
        titulo: 'Consulta con fuentes verificadas',
        texto: 'Pregunta como se lo plantearías a un colega. Iurexia fija la jurisdicción, recorre el acervo y escribe la respuesta con sus fuentes; cada cita abre su documento oficial en la página exacta.',
        href: '/plataforma/consulta',
        enlace: 'Conocer la consulta',
        media: { tipo: 'video', src: '/demo/consulta.mp4', poster: '/demo/consulta-poster.jpg' },
    },
    {
        id: 'redaccion',
        titulo: 'Redacción con el esfuerzo que elijas',
        texto: 'Pide el escrito y elige cómo se redacta: Básico, ágil y bien estructurado; Pro, que razona a fondo cada argumento; o Platinum, el motor más potente. Sale editable y listo para llevar a Word.',
        href: '/plataforma/redaccion',
        enlace: 'Conocer la redacción',
        media: { tipo: 'video', src: '/demo/redaccion.mp4', poster: '/demo/redaccion-poster.jpg' },
    },
    {
        id: 'flujos',
        titulo: 'Flujos de trabajo',
        texto: 'La demanda de amparo, la contestación, el escrito de agravios o la revisión del contrato, parte por parte: Iurexia propone lo que deduce de tu encargo y te pide lo que falta en vez de suponerlo.',
        href: '/plataforma/redaccion#flujos',
        enlace: 'Ver los flujos',
        media: { tipo: 'imagen', src: '/web/producto/flujos.webp', ancho: 1800, alto: 1385, alt: 'Los flujos de trabajo de Iurexia: la demanda de amparo indirecto dividida en sus partes, con los datos que pide cada una.' },
    },
    {
        id: 'carpetas',
        titulo: 'Mis carpetas inteligentes',
        texto: 'Cada asunto en su carpeta, con su objetivo y sus documentos. Iurexia lee lo que subes, te dice qué falta y responde las consultas con todo el expediente a la vista.',
        href: '/plataforma/carpetas',
        enlace: 'Conocer las carpetas',
        media: { tipo: 'video', src: '/demo/carpeta.mp4', poster: '/demo/carpeta-poster.jpg' },
    },
    {
        id: 'seguimiento',
        titulo: 'Seguimiento de expedientes',
        texto: 'Sigue tus expedientes ante el Poder Judicial de la Federación: Iurexia revisa los portales oficiales cada día hábil y deja a la vista lo nuevo de cada asunto.',
        href: '/plataforma/carpetas#seguimiento',
        enlace: 'Conocer el seguimiento',
        media: { tipo: 'video', src: '/demo/seguimiento.mp4', poster: '/demo/seguimiento-poster.jpg' },
    },
];

export default function HomePage() {
    return (
        <main className={`${claseWeb} min-h-screen`}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: 'Iurexia',
                        operatingSystem: 'Web',
                        applicationCategory: 'BusinessApplication',
                        offers: { '@type': 'Offer', price: '0', priceCurrency: 'MXN' },
                        description: 'La inteligencia artificial más precisa para el sistema jurídico mexicano. Investigación legal, redacción de escritos y análisis de sentencias con fuentes verificadas.',
                    }),
                }}
            />
            <Navbar sobreOscuro />

            {/* 1. El vídeo de la bandera: no se toca (David, 3-oct-2026). */}
            <HeroVideo />

            {/* 2. «Iurexia, now powered by OpenAI». (Entre el vídeo y esta franja
                hubo una captura del chat encimada al vídeo; David no le vio
                sentido y se quitó el 4-oct-2026.) */}
            <AnuncioOpenAI />

            {/* 3. La plataforma en dos minutos y, debajo, los despachos. */}
            <VideoChat />
            <Suspense fallback={null}>
                <DespachosVitrina />
            </Suspense>

            {/* 4. Para quién: dos públicos, cada uno con su producto real. */}
            <Seccion tono="marfil" espacio="amplio">
                <Encabezado
                    centrado
                    titulo="Una plataforma para el trabajo jurídico"
                    entrada="Abogados, despachos y secretarios del Poder Judicial trabajan en Iurexia con el derecho mexicano verificado detrás de cada respuesta."
                />
                <div className="mt-14 grid gap-5 lg:grid-cols-2">
                    <Lamina tono="tinta" arte="/web/arte/biblioteca.webp" velo="arriba" className="flex flex-col rounded-2xl">
                        <div className="p-8 sm:p-10">
                            <Antetitulo oscuro>Para abogados y despachos</Antetitulo>
                            <h3 className="mt-4 max-w-md font-serif text-display-xs font-normal text-cream-100 [text-wrap:balance] sm:text-display-s">
                                Investiga, redacta y da seguimiento con fuentes verificadas
                            </h3>
                            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
                                Cada asunto en su carpeta, cada escrito con su fundamento y cada cita con su documento oficial.
                            </p>
                            <div className="mt-7">
                                <Boton href="/plataforma" variante="secundario" oscuro tamano="sm">Conocer la plataforma</Boton>
                            </div>
                        </div>
                        <div className="mt-auto pl-8 sm:pl-10">
                            <div className="aspect-[16/10] overflow-hidden rounded-tl-xl shadow-[0_-10px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/web/producto/consulta.webp"
                                    alt="Una consulta en Iurexia: el escrito con 12 citas, las 12 verificadas, agrupadas por fuente oficial (Suprema Corte y Cámara de Diputados)."
                                    width={2000}
                                    height={1250}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover object-left-top"
                                />
                            </div>
                        </div>
                    </Lamina>

                    <Lamina tono="tinta" arte="/web/arte/columnata.webp" velo="arriba" className="flex flex-col rounded-2xl">
                        <div className="p-8 sm:p-10">
                            <Antetitulo oscuro>Para el Poder Judicial de la Federación</Antetitulo>
                            <h3 className="mt-4 max-w-md font-serif text-display-xs font-normal text-cream-100 [text-wrap:balance] sm:text-display-s">
                                El taller de sentencias del secretario
                            </h3>
                            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
                                La ficha, la ratio del acto reclamado, los problemas jurídicos y la jurisprudencia de cada uno.
                                El criterio lo fijas tú. Con su propio plan, para servidores públicos.
                            </p>
                            <div className="mt-7">
                                <Boton href="/secretarios" variante="secundario" oscuro tamano="sm">Conocer el taller</Boton>
                            </div>
                        </div>
                        <div className="mt-auto pl-8 sm:pl-10">
                            <div className="aspect-[16/10] overflow-hidden rounded-tl-xl bg-[#1b1a18] shadow-[0_-10px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/web/producto/taller-recorrido.webp"
                                    alt="El recorrido del asunto en el taller de sentencias: ficha y oportunidad, ratio del acto reclamado, síntesis de conceptos, problemas jurídicos, búsqueda por problema y, al final, tu criterio."
                                    width={680}
                                    height={454}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover object-left-top"
                                />
                            </div>
                        </div>
                    </Lamina>
                </div>
            </Seccion>

            {/* 5. Qué hace, función por función, con sus grabaciones. */}
            <Seccion tono="blanco" espacio="amplio">
                <Encabezado
                    antetitulo="La plataforma"
                    titulo="Todo el trabajo jurídico, en un solo lugar"
                    entrada="De la primera pregunta al escrito presentado y al expediente vigilado. Cada función, grabada en la plataforma real."
                    className="mb-12"
                />
                <AcordeonModulos items={MODULOS} />
            </Seccion>

            {/* 6. Lo que dicen quienes lo usan. */}
            <Testimonios />

            {/* 7. Una IA genérica frente a Iurexia: sin ChatGPT, porque Iurexia usa modelos de OpenAI (David, 4-oct-2026). */}
            <Comparativa />

            {/* 8. El acervo, medido, y la seguridad: los dos oscuros seguidos, como Harvey. */}
            <Cifras
                titulo="El derecho mexicano, verificado"
                entrada="Iurexia no responde de memoria: trabaja sobre un acervo propio y cada cita se coteja con su documento oficial antes de llegar a ti."
            />
            <BloqueSeguridad />

            {/* 9. Estudiar y pensar: las lecciones del canal con su lectura. */}
            <EstudiarEnPortada />

            {/* 10. El cierre y el pie, iguales en toda la web. */}
            <CierreCTA />
            <PieDePagina />
        </main>
    );
}
