'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

/* EL TUTORIAL DEL NUEVO CHAT (v56, 1:25; 27-sep-2026).

   Una pieza grabada en vivo con la cuenta demo, voz de Javi y sin avatar. A
   diferencia de la pieza de la portada (VideoChat), aquí NO arranca sola ni en
   silencio: quien llega a /tutorial viene a verla con sonido, así que espera
   al clic y entonces sí suena desde el principio.

   LOS CAPÍTULOS SALEN DE LA VOZ, NO A OJO. Cada inicio es el instante en que
   empieza su bloque de voz en el montaje (video-nodos/mapa_v56.json, campo
   `voz_en`): al pulsar «Flujos de trabajo» se oye «Y lo más potente…» desde la
   primera sílaba. Si se vuelve a montar el vídeo, se vuelven a leer de ahí.

   Lo que se dice de los planes es lo mismo que dice la voz, comprobado en el
   código vivo al grabar: Internet y los Flujos de trabajo desde Pro, y los
   escalones del Esfuerzo de redacción según el plan. */

export type Capitulo = {
    /** segundo en que empieza (inicio de su bloque de voz) */
    t: number;
    titulo: string;
    texto: string;
};

export const CAPITULOS: Capitulo[] = [
    { t: 0, titulo: 'La nueva interfaz', texto: 'El chat, la caja de consulta y lo que la rodea.' },
    {
        t: 7.48, titulo: 'Fuentes: sólo tu estado',
        texto: 'Deja sólo las Leyes estatales y la respuesta cita tu legislación local; en el ejemplo, sólo el Código de Procedimientos Civiles de Querétaro.',
    },
    {
        t: 22.71, titulo: 'Todas las fuentes e Internet',
        texto: 'Para una consulta compleja, enciende todas. Internet, desde el plan Pro.',
    },
    {
        t: 31.04, titulo: 'Esfuerzo de redacción',
        texto: 'Básico, Pro y Platinum: la potencia del escrito según tu plan.',
    },
    {
        t: 47.21, titulo: 'Las herramientas',
        texto: 'Escrito legal, revisión de sentencias, precedentes, jurimetría y Toulmin.',
    },
    {
        t: 58.98, titulo: 'Flujos de trabajo',
        texto: 'Un amparo, una contestación, unos agravios o un dictamen, construidos contigo parte por parte. Desde el plan Pro.',
    },
    {
        t: 74.36, titulo: 'Un flujo en marcha',
        texto: 'Propone lo que deduce de tu carpeta, te pide lo que falta y redacta hasta el documento completo.',
    },
];

const VIDEO = '/video/tutorial-nuevo-chat.mp4';
const POSTER = '/video/tutorial-nuevo-chat-poster.webp';
const SUBTITULOS = '/video/tutorial-nuevo-chat.es.vtt';

function mmss(s: number) {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
}

export default function TutorialNuevoChat() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [empezado, setEmpezado] = useState(false);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [actual, setActual] = useState(0);

    const irA = (t: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = t;
        setEmpezado(true);
        v.play().catch(() => { /* si el navegador lo niega, quedan los controles */ });
    };

    // Un enlace con tiempo —/tutorial?t=59— abre ya en ese punto, en pausa
    // (sin clic no hay sonido: el navegador no dejaría reproducir con voz).
    useEffect(() => {
        const t = Number(new URLSearchParams(window.location.search).get('t'));
        const v = videoRef.current;
        if (!v || !Number.isFinite(t) || t <= 0) return;
        const fijar = () => { v.currentTime = Math.min(t, (v.duration || t) - 0.5); };
        if (v.readyState >= 1) fijar();
        else v.addEventListener('loadedmetadata', fijar, { once: true });
    }, []);

    const alPasar = () => {
        const v = videoRef.current;
        if (!v) return;
        let i = 0;
        for (let k = 0; k < CAPITULOS.length; k++) if (v.currentTime + 0.05 >= CAPITULOS[k].t) i = k;
        setActual(i);
    };

    return (
        <div className="mx-auto max-w-5xl">
            <div className="group relative overflow-hidden rounded-2xl bg-charcoal-950 shadow-[0_30px_80px_-30px_rgba(20,18,16,0.55)] ring-1 ring-charcoal-900/10">
                <video
                    ref={videoRef}
                    className="block aspect-video h-auto w-full"
                    controls={empezado}
                    playsInline
                    preload="metadata"
                    poster={POSTER}
                    aria-label="Tutorial del nuevo chat de Iurexia, 1 minuto 25 segundos"
                    onPlay={() => { setEmpezado(true); setReproduciendo(true); }}
                    onPause={() => setReproduciendo(false)}
                    onEnded={() => setReproduciendo(false)}
                    onTimeUpdate={alPasar}
                    onSeeked={alPasar}
                >
                    <source src={VIDEO} type="video/mp4" />
                    <track kind="captions" src={SUBTITULOS} srcLang="es" label="Español" />
                </video>

                {!empezado && (
                    <button
                        type="button"
                        onClick={() => irA(videoRef.current?.currentTime || 0)}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-charcoal-950/60 via-charcoal-950/15 to-transparent text-white outline-none focus-visible:ring-4 focus-visible:ring-accent-gold/60"
                        aria-label="Reproducir el tutorial con sonido"
                    >
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-gold text-charcoal-950 shadow-[0_12px_40px_-8px_rgba(201,169,98,0.65)] ring-8 ring-white/15 transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24">
                            <Play className="ml-1 h-8 w-8 fill-current sm:h-9 sm:w-9" aria-hidden />
                        </span>
                        <span className="rounded-full bg-charcoal-950/70 px-4 py-1.5 text-[13px] font-medium tracking-wide backdrop-blur-sm">
                            Ver el tutorial · 1:25
                        </span>
                    </button>
                )}
            </div>

            <div className="mt-10 sm:mt-12">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brown">
                        Capítulos
                    </h2>
                    <p className="text-[12px] text-charcoal-700">Toca uno para ir a ese momento</p>
                </div>
                <ol className="grid gap-3 sm:grid-cols-2">
                    {CAPITULOS.map((c, i) => {
                        const activo = empezado && i === actual;
                        return (
                            <li key={c.t}>
                                <button
                                    type="button"
                                    onClick={() => irA(c.t)}
                                    aria-current={activo ? 'step' : undefined}
                                    aria-label={`Ir a «${c.titulo}», en el ${mmss(c.t)}`}
                                    className={`flex h-full w-full gap-4 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${activo
                                        ? 'border-accent-gold/70 bg-white shadow-[0_8px_24px_-12px_rgba(20,18,16,0.25)]'
                                        : 'border-charcoal-900/10 bg-white/55 hover:border-charcoal-900/20 hover:bg-white'}`}
                                >
                                    <span className="flex w-11 flex-shrink-0 flex-col items-start pt-0.5">
                                        <span className={`font-mono text-[12.5px] tabular-nums ${activo ? 'text-accent-gold' : 'text-accent-brown'}`}>
                                            {mmss(c.t)}
                                        </span>
                                        {activo && reproduciendo && (
                                            <span className="mt-2 h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-accent-gold" aria-hidden />
                                        )}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-serif text-[16px] font-semibold leading-snug text-charcoal-900">
                                            {c.titulo}
                                        </span>
                                        <span className="mt-1 block text-[13px] leading-relaxed text-charcoal-700">
                                            {c.texto}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}
