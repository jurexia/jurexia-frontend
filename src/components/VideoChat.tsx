'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

/* La pieza de la plataforma, entre el vídeo de portada y la franja de
   despachos.

   8-oct-2026 (David): «que sólo se reproduzca si le ponen play». Ya no arranca
   sola ni en bucle: se queda en el póster con el botón de reproducir, y al
   pulsarlo suena desde el principio, con los controles del navegador para
   pausar o adelantar (el mismo trato que el tutorial de /tutorial). Tampoco
   descarga el vídeo hasta que alguien lo pide (preload="none").

   El mismo día cambió la voz: la v61 «La plataforma» (1:59, 1280×720) se
   regrabó con la voz de los videos educativos del canal en Eleven v4
   (video-nodos/voz61e.py), cada frase ajustada a la duración de la anterior
   para no tocar la imagen. Archivo nuevo, nombre nuevo: así ningún navegador
   sirve la versión vieja de su caché.

   La v43 sigue en /video/iurexia-chat.mp4 porque el GIF de los correos la
   anuncia. /plataforma usa este mismo reproductor con «Una semana con
   Iurexia» (2:08). */
export default function VideoChat({
    id = 'video-chat',
    src = '/video/iurexia-plataforma-v4.mp4',
    poster = '/video/iurexia-plataforma-poster.webp',
    rotulo = 'La plataforma, en dos minutos',
    duracion = '1:59',
}: { id?: string; src?: string; poster?: string; rotulo?: string; duracion?: string } = {}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [empezado, setEmpezado] = useState(false);

    const reproducir = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = false;
        v.currentTime = 0;
        v.play().catch(() => null);
    };

    return (
        // `id` para que los correos de campaña lleven directo aquí: el GIF del
        // correo es un avance, y quien lo pulsa viene a ver la pieza entera.
        <section id={id} className="scroll-mt-20 bg-cream-300 px-4 pb-12 pt-4 sm:px-6 sm:pb-16">
            <div className="mx-auto max-w-5xl">
                <p className="mb-5 text-center text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">
                    {rotulo}
                </p>
                <div className="group relative overflow-hidden rounded-xl bg-charcoal-900 shadow-[0_24px_60px_-20px_rgba(20,18,16,0.45)]">
                    <video
                        ref={videoRef}
                        className="block aspect-video h-auto w-full"
                        controls={empezado}
                        playsInline
                        preload="none"
                        poster={poster}
                        aria-label={`${rotulo}, ${duracion}`}
                        onPlay={() => setEmpezado(true)}
                    >
                        <source src={src} type="video/mp4" />
                    </video>

                    {!empezado && (
                        <button
                            type="button"
                            onClick={reproducir}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-charcoal-950/60 via-charcoal-950/15 to-transparent text-white outline-none focus-visible:ring-4 focus-visible:ring-accent-gold/60"
                            aria-label={`Reproducir con sonido: ${rotulo}`}
                        >
                            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-gold text-charcoal-950 shadow-[0_12px_40px_-8px_rgba(201,169,98,0.65)] ring-8 ring-white/15 transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24">
                                <Play className="ml-1 h-8 w-8 fill-current sm:h-9 sm:w-9" aria-hidden />
                            </span>
                            <span className="rounded-full bg-charcoal-950/70 px-4 py-1.5 text-[13px] font-medium tracking-wide backdrop-blur-sm">
                                Ver la plataforma · {duracion}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
