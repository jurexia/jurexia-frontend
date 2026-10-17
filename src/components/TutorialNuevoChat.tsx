'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

/* EL TUTORIAL DE LA PLATAFORMA (5:23; 17-oct-2026). Sustituye al v56 (1:25).

   Grabado en vivo con la cuenta demo (la licenciada Irene, Platinum) y SÓLO
   material ficticio: la carpeta de Andrea Robles, los 20 contratos de la
   Bóveda, el acuerdo de la agenda y el contrato del despacho. Voz del canal.
   Aquí NO arranca sola ni en silencio: quien llega a /tutorial viene a verla
   con sonido, así que espera al clic y entonces sí suena desde el principio.

   LOS CAPÍTULOS SALEN DEL MONTAJE, NO A OJO: cada inicio es el instante en que
   empieza su bloque de voz (video-nodos/tutorial2/capitulos.json, que escribe
   armar_t2.py). Si se vuelve a montar, se vuelven a leer de ahí.

   Lo que se dice de los planes es lo que dice el código vivo al grabar:
   Internet y los Flujos de trabajo desde Pro (30 al mes; 60 en Platinum), y la
   Bóveda, la Cronología y las herramientas de «Desplegar herramientas» sólo en
   Platinum. */

export type Capitulo = {
    /** segundo en que empieza (inicio de su bloque de voz) */
    t: number;
    titulo: string;
    texto: string;
};

export const CAPITULOS: Capitulo[] = [
    { t: 0, titulo: 'Qué es Iurexia', texto: 'La plataforma de inteligencia artificial para el trabajo jurídico en México, y lo que vas a ver.' },
    {
        t: 20.2, titulo: 'La consulta: fuentes y esfuerzo',
        texto: 'Dónde busca (bloque de constitucionalidad, jurisprudencia, leyes federales y de tu estado, NOM e Internet desde Pro) y el motor de redacción según tu plan.',
    },
    {
        t: 58.73, titulo: 'Carpetas inteligentes',
        texto: 'Una carpeta por cliente o por asunto, con su objetivo y sus documentos: qué le falta, qué riesgos hay y consultas con el expediente a la vista.',
    },
    {
        t: 99.7, titulo: 'Flujos de trabajo',
        texto: 'Una demanda de amparo construida contigo parte por parte: deduce, te pide lo que falta y redacta con el acervo. Pro, 30 al mes; Platinum, 60.',
    },
    {
        t: 166.4, titulo: 'Bóveda',
        texto: 'Hasta 500 documentos por carpeta: preguntas al expediente completo y tablas de revisión con cita literal verificada. Plan Platinum.',
    },
    {
        t: 205.23, titulo: 'Agenda y plazos',
        texto: 'Sube el acuerdo y se agenda el término, verificado en el acuerdo y con aviso a tu correo; el botón Plazos calcula cualquier vencimiento.',
    },
    {
        t: 246.47, titulo: 'Mis plantillas',
        texto: 'Tu formato de Word con los datos de cada cliente: membrete, estilos y tablas intactos, sin gastar consultas.',
    },
    {
        t: 285.1, titulo: 'Herramientas de Platinum',
        texto: 'Sentencia, Precedentes, Jurimetría, Toulmin y la Cronología del expediente.',
    },
];

const VIDEO = '/video/tutorial-plataforma.mp4';
const POSTER = '/video/tutorial-plataforma-poster.webp';
const SUBTITULOS = '/video/tutorial-plataforma.es.vtt';

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
                    aria-label="Tutorial de la plataforma Iurexia, 5 minutos 23 segundos"
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
                            Ver el tutorial · 5:23
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
