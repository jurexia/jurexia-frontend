import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { IconoYouTube, REDES } from '@/components/PieDePagina';
import lecciones from '@/lib/estudiar/portada.json';

import { clasesBoton } from '@/components/web/sistema';
/* «Estudiar y pensar» en la portada (3-oct-2026): la puerta a la sección nueva
   y al canal de YouTube. Tres lecciones elegidas —una por tema de fondo— y no
   «las más recientes»: las recientes suelen estar todavía por estrenarse, y una
   portada con tres «próximamente» no invita a nada.

   Lee `portada.json` (3.6 KB), no el catálogo entero: la portada es un
   componente de cliente y el catálogo pesa 170 KB. */

type Ficha = (typeof lecciones)[number];

const DESTACADAS = ['v69', 'v65', 'v62'];

function reloj(s: number | null) {
    if (s == null) return '';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function EstudiarEnPortada() {
    const fichas = DESTACADAS.map((id) => lecciones.find((l) => l.id === id)).filter(Boolean) as Ficha[];
    const elegidas = fichas.length === 3 ? fichas : lecciones.slice(0, 3);

    return (
        <section aria-labelledby="estudiar-portada" className="border-t border-charcoal-900/[0.07] bg-cream-200 py-16 sm:py-20">
            <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[20rem_1fr] lg:gap-14">
                <div>
                    <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">Estudiar y pensar</p>
                    <h2 id="estudiar-portada" className="mt-4 font-serif text-display-s font-normal text-tinta [text-wrap:balance]">
                        Derecho mexicano, explicado con sus fuentes
                    </h2>
                    <p className="mt-4 text-[0.9375rem] leading-relaxed text-charcoal-900/70">
                        Lecciones en video del canal de Iurexia en YouTube, cada una con su material de lectura
                        en PDF: los antecedentes, los personajes y los documentos que se citan. Abiertas a
                        todos, para estudiar a tu ritmo.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-2.5">
                        <Link
                            href="/estudiar"
                            className={clasesBoton()}
                        >
                            Ver las {lecciones.length} lecciones
                            <ArrowRight className="h-4 w-4 text-accent-gold" />
                        </Link>
                        <a
                            href={REDES.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={clasesBoton({ variante: 'secundario' })}
                        >
                            <IconoYouTube className="h-[18px] w-[18px] text-[#c4302b]" />
                            Canal de YouTube
                        </a>
                    </div>
                </div>

                <ul className="grid gap-5 sm:grid-cols-3">
                    {elegidas.map((l) => (
                        <li key={l.id}>
                            <Link href={`/estudiar/${l.slug}`} className="group block">
                                <span className="relative block aspect-video overflow-hidden rounded-lg bg-charcoal-950 ring-1 ring-charcoal-900/10">
                                    {l.miniatura && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={l.miniatura} alt="" width={640} height={360} loading="lazy" className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90" />
                                    )}
                                    <span className="absolute bottom-2 right-2 rounded bg-charcoal-950/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                                        {reloj(l.duracion)}
                                    </span>
                                </span>
                                <span className="mt-3 block text-[11.5px] font-medium uppercase tracking-[0.14em] text-piedra-600">
                                    Lección {l.numero}
                                </span>
                                <span className="mt-1 block font-serif text-[1.2rem] font-normal leading-snug text-tinta [text-wrap:balance] group-hover:underline group-hover:decoration-accent-gold group-hover:underline-offset-4">
                                    {l.titulo}
                                </span>
                                <span className="mt-1 block text-[13px] leading-snug text-charcoal-900/60">{l.subtitulo}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
