'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/* La pieza de la plataforma, entre el vídeo de portada y la franja de
   despachos. Al modo de harvey.ai: arranca sola, en bucle y SIN sonido; el
   sonido —voz, efectos y música— sólo entra cuando la persona lo pide con un
   clic, y ese clic la reinicia desde el principio para que la oiga entera.
   Con «menos movimiento» activado se queda en el póster.

   3-oct-2026: era la v43 (1:52), grabada con el chat de antes —la barra de
   Genios, el selector Auto·Civil·Penal, Buscar/Redactar—. Ahora es la v61,
   «La plataforma» (1:59, 1280×720 para la web), que enseña el chat de hoy:
   Fuentes, Esfuerzo, las herramientas, los flujos de trabajo y la carpeta.
   La v43 sigue en /video/iurexia-chat.mp4 porque el GIF de los correos la
   anuncia. */
/* 3-oct-2026: el mismo reproductor sirve a /plataforma con «Una semana con
   Iurexia» (la v61 rehecha en Blender, 2:08). Sin propiedades es la pieza de
   la portada, como siempre. */
export default function VideoChat({
    id = 'video-chat',
    src = '/video/iurexia-plataforma.mp4',
    poster = '/video/iurexia-plataforma-poster.webp',
    rotulo = 'La plataforma, en dos minutos',
}: { id?: string; src?: string; poster?: string; rotulo?: string } = {}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [conSonido, setConSonido] = useState(false);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
        const aplicar = () => {
            if (menosMovimiento.matches) v.pause();
            else v.play().catch(() => { /* si el navegador lo niega, queda el póster */ });
        };
        aplicar();
        menosMovimiento.addEventListener('change', aplicar);
        return () => menosMovimiento.removeEventListener('change', aplicar);
    }, []);

    const alternar = () => {
        const v = videoRef.current;
        if (!v) return;
        if (conSonido) {
            v.muted = true;
            setConSonido(false);
            return;
        }
        v.muted = false;
        v.currentTime = 0;
        v.play().catch(() => null);
        setConSonido(true);
    };

    return (
        // `id` para que los correos de campaña lleven directo aquí: el GIF del
        // correo es un avance, y quien lo pulsa viene a ver la pieza entera.
        <section id={id} className="scroll-mt-20 bg-cream-300 px-4 pb-12 pt-4 sm:px-6 sm:pb-16">
            <div className="mx-auto max-w-5xl">
                <p className="mb-5 text-center text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">
                    {rotulo}
                </p>
                <div
                    className="group relative cursor-pointer overflow-hidden rounded-xl bg-charcoal-900 shadow-[0_24px_60px_-20px_rgba(20,18,16,0.45)]"
                    onClick={alternar}
                    role="button"
                    tabIndex={0}
                    aria-pressed={conSonido}
                    aria-label={conSonido ? 'Silenciar el vídeo' : 'Escuchar el vídeo'}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); } }}
                >
                    <video
                        ref={videoRef}
                        className="block aspect-video h-auto w-full"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={poster}
                    >
                        <source src={src} type="video/mp4" />
                    </video>

                    {/* la invitación a escuchar: discreta, abajo a la derecha */}
                    <span
                        className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-charcoal-900/75 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 sm:bottom-5 sm:right-5"
                    >
                        {conSonido
                            ? <><Volume2 className="h-4 w-4 text-accent-gold" /> Con sonido · clic para silenciar</>
                            : <><VolumeX className="h-4 w-4 text-accent-gold" /> Clic para escuchar</>}
                    </span>
                </div>
            </div>
        </section>
    );
}
