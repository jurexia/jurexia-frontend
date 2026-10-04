import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PieDePagina from '@/components/PieDePagina';
import Lamina from '@/components/web/Lamina';
import { CierreCTA } from '@/components/web/bloques';
import { Antetitulo, Entrada, Seccion, Titulo } from '@/components/web/sistema';
import { CANAL_YOUTUBE, LECCIONES, numeroDe, reloj, totales } from '@/lib/estudiar/catalogo';
import { claseWeb } from '@/lib/fuentes-web';

const TITULO = 'Recursos: lecciones, guías y lo último del derecho mexicano | Iurexia';
const DESCRIPCION = 'Las lecciones de Estudiar y pensar con su lectura en PDF, el canal de YouTube, lo último de la Corte y el Diario Oficial, y cómo usar Iurexia.';

export const metadata: Metadata = {
    title: TITULO,
    description: DESCRIPCION,
    alternates: { canonical: '/recursos' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/recursos.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: TITULO, description: DESCRIPCION, url: '/recursos' },
    twitter: { card: 'summary_large_image', images: ['/og/recursos.jpg'] },
};

/* ═══ /RECURSOS (3-oct-2026, segunda vuelta) ═══
   El «Resources Hub» de harvey.ai: una sola puerta para lo que Iurexia ya
   publica gratis —las lecciones con su lectura, el canal, lo último de la
   Corte y del DOF, el tutorial y la normativa—, que hasta hoy vivía repartido
   entre el menú y el pie. */

const PUERTAS = [
    { href: '/ultimo', titulo: 'Lo último', texto: 'Comunicados de la Suprema Corte, tesis de la semana y publicaciones del Diario Oficial.' },
    { href: '/tutorial', titulo: 'Cómo usar el chat', texto: 'El chat de Iurexia, explicado en video: fuentes, esfuerzo, carpetas y flujos.' },
    { href: '/normativa', titulo: 'Normativa', texto: 'Legislación federal y de las 32 entidades, artículo por artículo, con su texto oficial.' },
    { href: CANAL_YOUTUBE, titulo: 'Canal de YouTube', texto: 'Conocimiento jurídico en video, una lección a la vez.', externo: true },
];

export default function RecursosPage() {
    const t = totales();
    const recientes = [...LECCIONES].reverse().slice(0, 3);
    return (
        <main className={`${claseWeb} min-h-screen bg-cream-300`}>
            <Navbar />

            <section className="pt-28 sm:pt-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Antetitulo className="mb-5">Recursos</Antetitulo>
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
                        <Titulo como="h1" escala="portada" className="aparecer">El derecho mexicano, para estudiar y consultar</Titulo>
                        <Entrada className="aparecer [animation-delay:120ms]">
                            Lecciones en video con su lectura académica, lo último de la Corte y del Diario Oficial, la normativa
                            completa y cómo sacarle partido a Iurexia. Todo abierto, sin registro.
                        </Entrada>
                    </div>
                </div>
            </section>

            {/* Estudiar y pensar, en grande */}
            <Seccion tono="marfil" espacio="normal">
                <Lamina tono="tinta" arte="/web/arte/biblioteca.webp" velo="arriba" prioridad className="rounded-2xl">
                    <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] lg:items-end lg:p-16">
                        <div>
                            <Antetitulo oscuro className="mb-4">Estudiar y pensar</Antetitulo>
                            <h2 className="font-serif text-display-s font-normal text-cream-100 [text-wrap:balance] sm:text-display-m">
                                Lecciones de derecho mexicano, con sus fuentes
                            </h2>
                            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/65">
                                {t.lecciones} lecciones en video, cada una con su lectura en PDF: los antecedentes, los personajes y
                                los documentos que se estudian.
                            </p>
                            <Link href="/estudiar" className="mt-7 inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-medium text-cream-100 transition-colors hover:border-white/50 hover:bg-white/[0.06]">
                                Ver las lecciones <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {recientes.map((l) => (
                                <Link key={l.slug} href={`/estudiar/${l.slug}`} className="group block">
                                    <div className="aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
                                        {l.miniatura640 && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={l.miniatura640} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                        )}
                                    </div>
                                    <p className="mt-3 text-[11.5px] font-medium uppercase tracking-[0.14em] text-white/45">Lección {numeroDe(l)}{l.duracion ? ` · ${reloj(l.duracion)}` : ''}</p>
                                    <p className="mt-1 font-serif text-[1.1rem] font-normal leading-snug text-cream-100 group-hover:underline group-hover:underline-offset-4">{l.tituloPlano}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </Lamina>
            </Seccion>

            {/* Las demás puertas */}
            <Seccion tono="marfil" espacio="normal" className="pt-0 sm:pt-0">
                <div className="grid gap-px overflow-hidden rounded-xl border border-tinta/10 bg-tinta/10 sm:grid-cols-2 lg:grid-cols-4">
                    {PUERTAS.map((p) => {
                        const contenido = (
                            <>
                                <span className="flex items-center justify-between gap-3">
                                    <span className="font-serif text-[1.5rem] font-normal text-tinta">{p.titulo}</span>
                                    {p.externo ? <ArrowUpRight className="h-4 w-4 text-piedra-500" aria-hidden /> : <ArrowRight className="h-4 w-4 text-piedra-500" aria-hidden />}
                                </span>
                                <span className="mt-3 block text-[14.5px] leading-relaxed text-piedra-600">{p.texto}</span>
                            </>
                        );
                        return p.externo ? (
                            <a key={p.href} href={p.href} target="_blank" rel="noopener noreferrer" className="block bg-cream-300 p-7 transition-colors hover:bg-white">{contenido}</a>
                        ) : (
                            <Link key={p.href} href={p.href} className="block bg-cream-300 p-7 transition-colors hover:bg-white">{contenido}</Link>
                        );
                    })}
                </div>
            </Seccion>

            <CierreCTA />
            <PieDePagina />
        </main>
    );
}
