'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Youtube } from 'lucide-react';

/* El video de la lección, reproducido aquí sin volver a subirlo: es el mismo
   de YouTube, incrustado.

   POR QUÉ UNA PORTADA Y NO EL REPRODUCTOR DE ENTRADA. El reproductor de
   YouTube pesa cerca de un megabyte de scripts y cookies antes de que nadie
   pulse nada. Hasta el clic sólo se pinta la miniatura —que es nuestra, la
   misma del canal— con su botón; al pulsar se monta el reproductor del dominio
   sin cookies (youtube-nocookie.com) y arranca solo.

   LOS CAPÍTULOS. Son los mismos de la descripción de YouTube. Pulsar uno
   vuelve a montar el reproductor desde ese segundo: no hace falta la API de
   YouTube para algo que una URL ya sabe hacer.

   EL ESTRENO. Un video programado es privado hasta su hora, y el reproductor
   diría «video no disponible». Mientras no llegue, la portada anuncia la fecha
   en lugar del botón. La comprobación se hace en el navegador, no al compilar:
   la página se genera una vez y el estreno llega después. */

type Capitulo = { segundo: number; titulo: string };

export default function VideoLeccion({
    youtube,
    titulo,
    miniatura,
    publicado,
    duracion,
    capitulos,
}: {
    youtube: string;
    titulo: string;
    miniatura: string | null;
    publicado: string;
    duracion: string;
    capitulos: Capitulo[];
}) {
    // null = todavía no se sabe (primer pintado, igual en servidor y navegador)
    const [estrenado, setEstrenado] = useState<boolean | null>(null);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [desde, setDesde] = useState(0);
    const marcoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const comprobar = () => setEstrenado(Date.now() >= new Date(publicado).getTime());
        comprobar();
        // Si la página se queda abierta hasta la hora del estreno, se abre sola.
        const t = window.setInterval(comprobar, 30_000);
        return () => window.clearInterval(t);
    }, [publicado]);

    const reproducir = (segundo = 0) => {
        if (!estrenado) return;
        setDesde(segundo);
        setReproduciendo(true);
        if (segundo > 0) marcoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const fechaEstreno = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        hourCycle: 'h23', timeZone: 'America/Mexico_City',
    }).format(new Date(publicado));

    const src = `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&playsinline=1&hl=es&cc_lang_pref=es${desde ? `&start=${desde}` : ''}`;

    return (
        <div>
            <div
                ref={marcoRef}
                className="relative aspect-video w-full overflow-hidden rounded-xl bg-charcoal-950 shadow-[0_1px_2px_rgba(15,14,13,0.08),0_12px_32px_-12px_rgba(15,14,13,0.35)] ring-1 ring-charcoal-900/10"
            >
                {reproduciendo ? (
                    <iframe
                        key={desde}
                        src={src}
                        title={titulo}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    />
                ) : (
                    <>
                        {miniatura && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={miniatura}
                                alt=""
                                width={1280}
                                height={720}
                                className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-500 ${
                                    estrenado === false ? 'brightness-[0.45] saturate-[0.6]' : ''
                                }`}
                            />
                        )}

                        {estrenado === true && (
                            /* Toda la imagen se pulsa. El botón va en la esquina y no
                               en el centro: las miniaturas del canal llevan el título
                               escrito a la izquierda y al centro, y un círculo encima
                               lo tapaba. */
                            <button
                                type="button"
                                onClick={() => reproducir(0)}
                                aria-label={`Reproducir la lección «${titulo}» (${duracion})`}
                                className="group absolute inset-0 focus:outline-none"
                            >
                                <span className="absolute inset-0 bg-gradient-to-tl from-black/50 via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-80" />
                                <span className="absolute bottom-3 right-3 inline-flex items-center gap-3 rounded-full bg-charcoal-950/85 py-1.5 pl-1.5 pr-4 text-white ring-1 ring-white/10 backdrop-blur-md transition-colors duration-200 group-hover:bg-charcoal-950 group-focus-visible:ring-2 group-focus-visible:ring-accent-gold sm:bottom-5 sm:right-5">
                                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-gold text-charcoal-950 sm:h-11 sm:w-11">
                                        <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
                                    </span>
                                    <span className="text-left leading-tight">
                                        <span className="block text-[13.5px] font-semibold">Ver la lección</span>
                                        <span className="block text-[12px] tabular-nums text-white/65">{duracion}</span>
                                    </span>
                                </span>
                            </button>
                        )}

                        {estrenado === false && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Estreno</span>
                                <span className="mt-2 font-serif text-xl font-semibold text-white first-letter:uppercase sm:text-2xl">
                                    {fechaEstreno} h
                                </span>
                                <span className="mt-1.5 text-[12.5px] text-white/65">Hora del centro de México · el material de lectura ya está disponible</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3 text-[12px] text-charcoal-900/55">
                <span>Video en el canal de Iurexia en YouTube</span>
                {estrenado && (
                    <a
                        href={`https://www.youtube.com/watch?v=${youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-charcoal-900/70 transition-colors hover:text-charcoal-900"
                    >
                        <Youtube className="h-3.5 w-3.5" />
                        Abrir en YouTube
                    </a>
                )}
            </div>

            {capitulos.length > 1 && (
                <section aria-labelledby="capitulos-video" className="mt-8">
                    <h2 id="capitulos-video" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-brown">
                        Capítulos del video
                    </h2>
                    <ol className="mt-3 grid gap-x-8 sm:grid-cols-2">
                        {capitulos.map((c) => (
                            <li key={c.segundo} className="border-b border-charcoal-900/[0.07]">
                                <button
                                    type="button"
                                    onClick={() => reproducir(c.segundo)}
                                    disabled={!estrenado}
                                    className="flex w-full items-baseline gap-3 py-2 text-left text-[13.5px] text-charcoal-900/80 transition-colors enabled:hover:text-charcoal-900 disabled:cursor-default"
                                >
                                    <span className="w-11 shrink-0 font-medium tabular-nums text-accent-brown">{reloj(c.segundo)}</span>
                                    <span>{c.titulo}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>
            )}
        </div>
    );
}

function reloj(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}
