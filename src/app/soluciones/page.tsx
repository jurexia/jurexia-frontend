import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PieDePagina from '@/components/PieDePagina';
import BotonProbar from '@/components/BotonProbar';
import Lamina from '@/components/web/Lamina';
import { BloqueSeguridad, Captura, CierreCTA } from '@/components/web/bloques';
import { Antetitulo, Boton, clasesBoton, Entrada, Seccion, Titulo } from '@/components/web/sistema';
import { MATERIAS, PERFILES } from '@/lib/soluciones';
import { claseWeb } from '@/lib/fuentes-web';

/* ═══ /SOLUCIONES (rehecha el 3-oct-2026, segunda vuelta) ═══
   Antes: una página con tarjetas de iconos que repetían la plataforma. Ahora
   es el índice que Harvey tiene en «Solutions»: por perfil (quién lo usa) y
   por materia (para qué práctica), y cada tarjeta lleva a su página
   (/soluciones/[slug], con los datos en src/lib/soluciones.ts). Connect, que
   salió de la portada, vive aquí. */

export default function SolucionesPage() {
    return (
        <main className={`${claseWeb} min-h-screen bg-cream-300`}>
            <Navbar />

            {/* La promesa */}
            <section className="pt-28 sm:pt-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Antetitulo className="mb-5">Soluciones</Antetitulo>
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
                        <Titulo como="h1" escala="portada" className="aparecer">Para cada práctica y cada perfil</Titulo>
                        <div>
                            <Entrada>
                                Litigantes, despachos, áreas jurídicas de empresa, estudiantes y el Poder Judicial: cada uno
                                usa Iurexia a su manera, sobre el mismo derecho mexicano verificado.
                            </Entrada>
                            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
                                <BotonProbar className={clasesBoton()} sub="Sin correo, sin tarjeta." subClassName="text-xs text-piedra-600">
                                    Probar sin registrarme
                                </BotonProbar>
                                <Boton href="/precios" variante="secundario">Ver planes</Boton>
                            </div>
                        </div>
                    </div>
                    <Lamina tono="piedra" arte="/web/arte/fachada.webp" prioridad className="mt-14 rounded-2xl">
                        <div className="px-4 pt-8 sm:px-12 sm:pt-14 lg:px-20">
                            <div className="mx-auto max-w-5xl translate-y-px">
                                <Captura
                                    src="/web/producto/carpetas.webp"
                                    alt="Mis carpetas inteligentes: cada asunto con sus documentos y su avance."
                                    ancho={2000}
                                    alto={1250}
                                    barra="iurexia.com/carpetas"
                                    prioridad
                                />
                            </div>
                        </div>
                    </Lamina>
                </div>
            </section>

            {/* Por perfil */}
            <Seccion tono="marfil" espacio="amplio">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Antetitulo className="mb-4">Por perfil</Antetitulo>
                        <Titulo escala="bloque">Quién trabaja con Iurexia</Titulo>
                    </div>
                </div>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                    {PERFILES.map((p) => (
                        <Link key={p.slug} href={`/soluciones/${p.slug}`} className="group flex flex-col overflow-hidden rounded-xl border border-tinta/10 bg-white transition-colors hover:border-tinta/25">
                            <div className="aspect-[4/3] overflow-hidden bg-piedra-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.arte} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                                <p className="font-serif text-xl font-normal text-tinta">{p.nombre}</p>
                                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-piedra-600">{p.resumen}</p>
                                <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-tinta group-hover:underline group-hover:underline-offset-4">
                                    Conocer <ArrowRight className="h-4 w-4" aria-hidden />
                                </span>
                            </div>
                        </Link>
                    ))}
                    <Link href="/secretarios" className="group flex flex-col overflow-hidden rounded-xl border border-tinta/10 bg-white transition-colors hover:border-tinta/25">
                        <div className="aspect-[4/3] overflow-hidden bg-tinta">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/web/arte/columnata.webp" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                            <p className="font-serif text-xl font-normal text-tinta">Poder Judicial</p>
                            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-piedra-600">El taller de sentencias del secretario, con su propio plan para servidores públicos.</p>
                            <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-tinta group-hover:underline group-hover:underline-offset-4">
                                Conocer <ArrowRight className="h-4 w-4" aria-hidden />
                            </span>
                        </div>
                    </Link>
                </div>
            </Seccion>

            {/* Por materia */}
            <Seccion tono="blanco" espacio="amplio">
                <Antetitulo className="mb-4">Por materia</Antetitulo>
                <Titulo escala="bloque" className="max-w-2xl">La práctica que llevas, con su ley y su jurisprudencia</Titulo>
                <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-tinta/10 bg-tinta/10 sm:grid-cols-2 lg:grid-cols-3">
                    {MATERIAS.map((m) => (
                        <Link key={m.slug} href={`/soluciones/${m.slug}`} className="group flex flex-col bg-white p-7 transition-colors hover:bg-cream-300">
                            <p className="font-serif text-[1.75rem] font-normal leading-tight text-tinta">{m.nombre}</p>
                            <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-piedra-600">{m.resumen}</p>
                            <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-tinta group-hover:underline group-hover:underline-offset-4">
                                Conocer <ArrowRight className="h-4 w-4" aria-hidden />
                            </span>
                        </Link>
                    ))}
                </div>
            </Seccion>

            {/* Iurexia Connect (se mudó aquí desde la portada) */}
            <Seccion tono="marfil" espacio="normal" className="border-t border-tinta/[0.07]">
                <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
                    <div>
                        <Antetitulo className="mb-4">Iurexia Connect</Antetitulo>
                        <h2 className="mb-4 font-serif text-display-s font-normal text-tinta [text-wrap:balance] sm:text-display-m">
                            Cuando el caso necesita un abogado, no sólo una respuesta
                        </h2>
                        <p className="max-w-xl text-[0.9375rem] leading-relaxed text-piedra-700 sm:text-base">
                            La orientación con IA resuelve la duda; hay asuntos que además necesitan quien los lleve. Connect une
                            las dos cosas en un mismo lugar: quien consulta encuentra un abogado con cédula verificada, y quien
                            ejerce recibe asuntos que ya llegan con el problema planteado.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Boton href="/connect">Conocer Connect</Boton>
                        <Boton href="/login" variante="secundario">Registrarme como abogado</Boton>
                    </div>
                </div>
            </Seccion>

            <BloqueSeguridad />

            <section className="border-t border-white/[0.06] bg-tinta">
                <p className="mx-auto max-w-4xl px-4 py-8 text-center text-[13px] leading-relaxed text-white/45">
                    <span className="text-white/70">Nota de uso responsable:</span> Iurexia no presta servicios legales
                    directamente ni pretende sustituir la asesoría profesional: orienta, organiza y fortalece el análisis;
                    la estrategia y su ejecución siempre deben ir acompañadas por un abogado.
                </p>
            </section>

            <CierreCTA titulo="Transforma tu práctica legal con IA" entrada="Únete a los profesionales del derecho que ya optimizan su trabajo con Iurexia." />
            <PieDePagina />
        </main>
    );
}
