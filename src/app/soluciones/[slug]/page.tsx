import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, FolderOpen, Scale, ScrollText } from 'lucide-react';
import PlantillaModulo from '@/components/web/PlantillaModulo';
import { Antetitulo, Seccion, Titulo } from '@/components/web/sistema';
import { MATERIAS, PERFILES, SOLUCIONES, solucionPorSlug } from '@/lib/soluciones';

/* ═══ UNA PÁGINA POR PERFIL Y POR MATERIA (3-oct-2026) ═══
   La misma plantilla de los módulos de la plataforma, con los datos de
   src/lib/soluciones.ts: la promesa, el producto sobre su obra, tres
   beneficios, preguntas de ejemplo, las fuentes que consulta (todas
   comprobadas en el acervo) y los flujos que aplican. */

export const dynamicParams = false;

export function generateStaticParams() {
    return SOLUCIONES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
    const s = solucionPorSlug(params.slug);
    if (!s) return {};
    const titulo = `${s.nombre}: ${s.titulo} | Iurexia`;
    return {
        title: titulo,
        description: s.descripcion,
        alternates: { canonical: `/soluciones/${s.slug}` },
        openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: `/og/solucion-${s.slug}.jpg`, width: 1200, height: 630, alt: 'Iurexia' }], title: titulo, description: s.descripcion, url: `/soluciones/${s.slug}` },
        twitter: { card: 'summary_large_image', images: [`/og/solucion-${s.slug}.jpg`] },
    };
}

const ICONOS = [Scale, ScrollText, FolderOpen];

export default function SolucionPage({ params }: { params: { slug: string } }) {
    const s = solucionPorSlug(params.slug);
    if (!s) notFound();
    const hermanas = (s.tipo === 'perfil' ? PERFILES : MATERIAS).filter((x) => x.slug !== s.slug);

    return (
        <PlantillaModulo
            ruta={`/soluciones/${s.slug}`}
            nombre={s.nombre}
            migas={[{ href: '/soluciones', texto: 'Soluciones' }, { texto: s.nombre }]}
            titulo={s.titulo}
            entrada={s.entrada}
            visual={{ tipo: 'imagen', ...s.visual }}
            heroArte={s.arte}
            beneficios={s.beneficios.map((b, i) => ({ Icono: s.slug === 'academia' && i === 1 ? BookOpen : ICONOS[i % 3], titulo: b.titulo, texto: b.texto }))}
            filas={[]}
        >
            {/* Preguntas de ejemplo */}
            <Seccion tono="tinta" espacio="amplio" arte="/web/arte/claustro.webp">
                <Antetitulo oscuro className="mb-4">Cómo se pregunta</Antetitulo>
                <Titulo oscuro escala="bloque" className="max-w-2xl">Preguntas como éstas, con su fundamento</Titulo>
                <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-3">
                    {s.preguntas.map((p) => (
                        <div key={p} className="bg-tinta p-7 sm:p-8">
                            <p className="font-serif text-[1.3rem] font-normal leading-snug text-cream-100">«{p}»</p>
                        </div>
                    ))}
                </div>
            </Seccion>

            {/* Fuentes y flujos */}
            {(s.fuentes || s.flujos) && (
                <Seccion tono="blanco" espacio="amplio">
                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                        {s.fuentes && (
                            <div>
                                <Antetitulo className="mb-4">Fuentes que consulta</Antetitulo>
                                <Titulo escala="bloque">El derecho que aplica, en su documento oficial</Titulo>
                                <ul className="mt-8 divide-y divide-tinta/10 border-y border-tinta/10">
                                    {s.fuentes.map((f) => (
                                        <li key={f} className="py-4 text-[15px] text-tinta">{f}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {s.flujos && (
                            <div>
                                <Antetitulo className="mb-4">Flujos de trabajo</Antetitulo>
                                <Titulo escala="bloque">Los escritos de esta práctica, parte por parte</Titulo>
                                <ul className="mt-8 divide-y divide-tinta/10 border-y border-tinta/10">
                                    {s.flujos.map((f) => (
                                        <li key={f}>
                                            <Link href="/plataforma/redaccion#flujos" className="flex items-center justify-between py-4 text-[15px] text-tinta hover:underline hover:underline-offset-4">
                                                {f}
                                                <ArrowRight className="h-4 w-4 text-piedra-500" aria-hidden />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-4 text-[13px] text-piedra-600">Los flujos están en los planes Pro y Platinum.</p>
                            </div>
                        )}
                    </div>
                </Seccion>
            )}

            {/* Las demás soluciones del mismo tipo */}
            <Seccion tono="marfil" espacio="normal">
                <Antetitulo className="mb-6">{s.tipo === 'perfil' ? 'Otros perfiles' : 'Otras materias'}</Antetitulo>
                <div className={`grid gap-px overflow-hidden rounded-xl border border-tinta/10 bg-tinta/10 sm:grid-cols-2 ${s.tipo === 'perfil' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
                    {hermanas.map((h) => (
                        <Link key={h.slug} href={`/soluciones/${h.slug}`} className="group bg-cream-300 p-5 transition-colors hover:bg-white">
                            <p className="font-serif text-lg font-normal text-tinta">{h.nombre}</p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-piedra-600">{h.resumen}</p>
                        </Link>
                    ))}
                    {s.tipo === 'perfil' && (
                        <Link href="/secretarios" className="group bg-cream-300 p-5 transition-colors hover:bg-white">
                            <p className="font-serif text-lg font-normal text-tinta">Poder Judicial</p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-piedra-600">El taller de sentencias, con su propio plan para servidores públicos.</p>
                        </Link>
                    )}
                </div>
            </Seccion>
        </PlantillaModulo>
    );
}
