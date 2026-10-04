'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import Lamina from '@/components/web/Lamina';
import { EnlaceFlecha } from '@/components/web/sistema';

/* ═══ LOS MÓDULOS, EN ACORDEÓN (3-oct-2026) ═══
   El patrón de «Product Innovation» de harvey.ai: a la izquierda la lista de
   funciones, una abierta con su explicación y su enlace; a la derecha, la
   función trabajando. Aquí lo de la derecha son las GRABACIONES reales de la
   plataforma con la cuenta demo (public/demo), no dibujos: se reproducen sin
   sonido y en bucle, y sólo la que está abierta. En teléfono, cada grabación
   va dentro de su apartado. */

export type MediaModulo =
    | { tipo: 'video'; src: string; poster: string }
    | { tipo: 'imagen'; src: string; ancho: number; alto: number; alt: string };

export type ItemModulo = {
    id: string;
    titulo: string;
    texto: string;
    href: string;
    enlace: string;
    media: MediaModulo;
};

function Media({ media, activo }: { media: MediaModulo; activo: boolean }) {
    const video = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const v = video.current;
        if (!v) return;
        const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (activo && !quieto) v.play().catch(() => { /* sin reproducción automática queda el póster */ });
        else v.pause();
    }, [activo]);

    if (media.tipo === 'video') {
        return (
            <video
                ref={video}
                src={media.src}
                poster={media.poster}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden
                className="block h-auto w-full rounded-lg shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)] ring-1 ring-black/20"
            />
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={media.src}
            alt={media.alt}
            width={media.ancho}
            height={media.alto}
            loading="lazy"
            decoding="async"
            className="block h-auto max-h-full w-auto max-w-full rounded-lg shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)] ring-1 ring-black/20"
        />
    );
}

export default function AcordeonModulos({ items }: { items: ItemModulo[] }) {
    const [activo, setActivo] = useState(0);

    return (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-16">
            <ul className="border-t border-tinta/10">
                {items.map((it, i) => {
                    const abierto = i === activo;
                    return (
                        <li key={it.id} className="border-b border-tinta/10">
                            <button
                                type="button"
                                id={`modulo-${it.id}`}
                                aria-expanded={abierto}
                                aria-controls={`panel-${it.id}`}
                                onClick={() => setActivo(i)}
                                className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60"
                            >
                                <span className={`text-[1.0625rem] sm:text-lg ${abierto ? 'font-medium text-tinta' : 'text-piedra-600 hover:text-tinta'}`}>{it.titulo}</span>
                                {abierto ? <Minus className="h-4 w-4 shrink-0 text-tinta" aria-hidden /> : <Plus className="h-4 w-4 shrink-0 text-piedra-500" aria-hidden />}
                            </button>
                            <div id={`panel-${it.id}`} role="region" aria-labelledby={`modulo-${it.id}`} hidden={!abierto} className="pb-6">
                                <p className="max-w-md text-[15px] leading-relaxed text-piedra-600">{it.texto}</p>
                                <EnlaceFlecha href={it.href} className="mt-4">{it.enlace}</EnlaceFlecha>
                                <div className="mt-6 lg:hidden">
                                    <Lamina tono="tinta" patron="ondas" semilla={11 + i} className="rounded-xl p-4 sm:p-6">
                                        {abierto && <Media media={it.media} activo={abierto} />}
                                    </Lamina>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="hidden lg:sticky lg:top-28 lg:block">
                <Lamina tono="tinta" arte="/web/arte/grabado.webp" className="rounded-2xl">
                    <div className="flex aspect-[16/11] items-center justify-center p-8 xl:p-10">
                        {items.map((it, i) => (
                            <div key={it.id} className={i === activo ? 'flex h-full w-full items-center justify-center' : 'hidden'}>
                                <Media media={it.media} activo={i === activo} />
                            </div>
                        ))}
                    </div>
                </Lamina>
            </div>
        </div>
    );
}
