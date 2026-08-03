'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

/* Hero con vídeo de fondo, al modo de harvey.ai: el vídeo va silenciado, en
   bucle y sin controles, y encima se apilan tres capas de oscurecimiento que
   son lo que de verdad hace legible el texto.

   El vídeo es decorativo: no lleva información. Por eso va `aria-hidden` y el
   contenido vive en su propia capa, accesible con o sin vídeo. */
export default function HeroVideo() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        /* Si el sistema pide menos movimiento, se congela en el póster.
           No es un adorno: hay gente a la que el movimiento de fondo le
           provoca mareo. */
        const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
        const aplicar = () => {
            if (menosMovimiento.matches) v.pause();
            else v.play().catch(() => { /* el navegador puede negar la reproducción; queda el póster */ });
        };
        aplicar();
        menosMovimiento.addEventListener('change', aplicar);
        return () => menosMovimiento.removeEventListener('change', aplicar);
    }, []);

    return (
        <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-charcoal-900 lg:min-h-[680px] lg:h-[calc(100vh-72px)] lg:max-h-[820px]">

            {/* ── Vídeo ── */}
            <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster="/hero/hero-poster.webp"
                aria-hidden
                tabIndex={-1}
            >
                <source src="/hero/hero.mp4" type="video/mp4" />
            </video>

            {/* ── Capa 1: degradado lateral. Es la que sostiene el titular ── */}
            <div
                aria-hidden
                className="absolute inset-y-0 left-0 z-10 w-11/12 bg-gradient-to-r from-charcoal-900 via-charcoal-900/70 to-transparent"
            />

            {/* En teléfono el texto ocupa todo el ancho y pisa la parte
                iluminada del vídeo: un velo plano extra lo asienta. Desaparece
                en cuanto hay sitio para que el texto viva solo a la izquierda. */}
            <div aria-hidden className="absolute inset-0 z-10 bg-charcoal-900/45 sm:hidden" />

            {/* ── Capa 2: velo superior, para que la barra de navegación se lea ── */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/45 via-transparent to-transparent"
            />

            {/* ── Capa 3: funde con la sección crema de abajo ── */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-32 bg-gradient-to-t from-cream-300 to-transparent"
            />

            {/* ── Contenido ── */}
            <div className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-24">
                <div className="max-w-2xl">
                    <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-6xl lg:text-7xl">
                        El ejercicio,
                        <br />
                        <span className="text-accent-gold">perfeccionado</span>
                    </h1>

                    <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:mt-7 sm:text-lg">
                        Legislación federal y de las 32 entidades, jurisprudencia y
                        precedentes. Cada respuesta cita el artículo exacto y te lleva
                        al documento oficial.
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            href="/registro"
                            className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-7 text-[0.9375rem] font-medium text-charcoal-900 transition-colors duration-200 hover:bg-cream-200"
                        >
                            Probar Gratis
                        </Link>
                        <Link
                            href="/chat"
                            className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 px-7 text-[0.9375rem] font-medium text-white transition-colors duration-200 hover:border-white/50 hover:bg-white/10"
                        >
                            <MessageSquare className="mr-2 h-4 w-4 text-accent-gold" />
                            Ir al Chat
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
