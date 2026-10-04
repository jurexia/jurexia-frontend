'use client';

import { useEffect, useRef } from 'react';

/* Una grabación de la plataforma que sólo se descarga y se reproduce cuando
   entra en pantalla (y se pausa al salir). Sin sonido, en bucle; con «menos
   movimiento» se queda en el póster. Así una página con varias grabaciones
   no baja megas que nadie va a ver. */
export default function VideoEnVista({ src, poster, className = '' }: { src: string; poster: string; className?: string }) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const v = ref.current;
        if (!v) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    if (!v.src) v.src = src;
                    v.play().catch(() => { /* queda el póster */ });
                } else {
                    v.pause();
                }
            },
            { threshold: 0.35 },
        );
        obs.observe(v);
        return () => obs.disconnect();
    }, [src]);

    return <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-hidden className={className} />;
}
