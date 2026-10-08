'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '@/lib/useAuth';
import { abrirSesionBasica, PREGUNTA_PORTADA } from '@/lib/gratis';
import { Titulo } from '@/components/web/sistema';

/* ═══ EL GANCHO DE LA PORTADA (8-oct-2026) ═══
   David: «¿qué gancho sería el perfecto para atraer a usuarios a leer desde la
   portada?… que supere el gancho de harvey y adaptarlo a México».

   Lo que se midió antes de decidir:
   · Harvey dejó el vídeo de ambiente: abre con una frase, una sola línea de
     prueba y su producto real sobre una obra. Legora sigue con la ciudad y un
     lema general, que es lo que tenía Iurexia (abogados generados mirando la
     ciudad: no enseñaba nada).
   · Harvey pide «Request a Demo» porque vende a despachos con contrato. Iurexia
     es autoservicio, y su tapón medido es el registro: de 2,320 cuentas sólo 438
     llegaron a escribir una consulta (ver `@/lib/gratis`). El botón del hero
     mandaba justo ahí, a /registro.

   Así que el gancho son tres piezas, y cada una dice una sola cosa:
   1. La frase, que dictó David al revisarlo en local: «Perfecciona tu ejercicio
      legal con Iurexia» y, en pequeño, qué es y qué hace. (La primera propuesta
      fue «Tú firmas. Iurexia fundamenta.», el cierre del anuncio v78.)
   2. La consulta, aquí mismo y sin registro: la pregunta se guarda, se abre la
      visita básica y el chat la manda sola (`PREGUNTA_PORTADA`). Allí el panel
      de la versión básica empuja a la cuenta gratuita (PanelBasico).
   3. La prueba: una consulta real grabada en producción —los pasos, la hoja,
      «8 citas · 8 verificadas» y el PDF de la Gaceta con su registro digital—,
      sobre un pórtico de la casa. Nada dibujado: así es.
   Detrás de todo, el vídeo de los abogados, que David quiso conservar. */

const EJEMPLOS = [
    {
        etiqueta: 'Amparo contra la omisión del IMSS',
        consulta: 'Mi cliente lleva ocho meses sin respuesta del IMSS a su solicitud de pensión por invalidez. ¿Procede el amparo indirecto por omisión y en qué plazo?',
    },
    {
        etiqueta: 'Guarda y custodia compartida',
        consulta: '¿Qué ha sostenido la Suprema Corte sobre la guarda y custodia compartida y el interés superior del menor?',
    },
    {
        etiqueta: 'Despido por faltas injustificadas',
        consulta: '¿Qué criterios hay sobre el despido por más de tres faltas de asistencia injustificadas en un periodo de treinta días?',
    },
];

/* La película, en dos cortes: 16:10 para escritorio y 4:5 para el teléfono, donde
   la cámara se acerca más para que la letra de la plataforma se lea. */
const PELICULA = {
    escritorio: { src: '/hero/portada-consulta-escritorio.mp4', poster: '/hero/portada-consulta-escritorio.webp', ancho: 1600, alto: 1000 },
    telefono: { src: '/hero/portada-consulta-telefono.mp4', poster: '/hero/portada-consulta-telefono.webp', ancho: 880, alto: 1100 },
} as const;

export default function HeroPortada() {
    const router = useRouter();
    const { user } = useAuth();
    const [pregunta, setPregunta] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const campo = useRef<HTMLTextAreaElement>(null);

    /* El alto del campo sigue al texto (de una a cuatro líneas). */
    useEffect(() => {
        const t = campo.current;
        if (!t) return;
        t.style.height = 'auto';
        t.style.height = `${Math.min(t.scrollHeight, 132)}px`;
    }, [pregunta]);

    const enviar = async (e?: FormEvent) => {
        e?.preventDefault();
        const texto = pregunta.trim();
        if (texto.length < 8) {
            setError('Escribe tu consulta: una pregunta o el problema de tu cliente.');
            campo.current?.focus();
            return;
        }
        setError('');
        setEnviando(true);
        try {
            try {
                window.sessionStorage.setItem(PREGUNTA_PORTADA, texto);
            } catch { /* sin almacenamiento la pregunta no viaja; el chat abre igual */ }
            if (!user) await abrirSesionBasica();
            router.push('/chat');
        } catch {
            setError('No pudimos abrir la consulta. Inténtalo de nuevo.');
            setEnviando(false);
        }
    };

    const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void enviar();
        }
    };

    return (
        <>
            <section className="relative isolate bg-tinta text-cream-100">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    {/* ── Abajo, detrás de la película: el pórtico ── */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/web/arte/portico.webp"
                        alt=""
                        width={2376}
                        height={1008}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-x-0 bottom-0 h-[52%] w-full object-cover object-[50%_70%] opacity-90"
                    />
                    <div
                        className="absolute inset-x-0 bottom-0 h-[52%]"
                        style={{ background: 'linear-gradient(180deg, #0f0e0d 0%, rgba(15,14,13,0.45) 40%, rgba(15,14,13,0.5) 100%)' }}
                    />
                    {/* ── Arriba, detrás del titular: el vídeo de los abogados ── */}
                    <FondoAbogados />
                </div>

                <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-[7.5rem]">
                    <div className="max-w-3xl aparecer">
                        <Titulo como="h1" escala="portada" oscuro>
                            Perfecciona tu ejercicio legal con Iurexia
                        </Titulo>
                        <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-white/70 sm:text-lg">
                            Inteligencia artificial diseñada para el sistema jurídico mexicano. Fundamenta,
                            redacta y analiza escritos con fuentes verificadas.
                        </p>

                        {/* ── La consulta, aquí mismo ── */}
                        <form onSubmit={enviar} className="mt-8 max-w-2xl">
                            <label htmlFor="consulta-portada" className="sr-only">Tu consulta jurídica</label>
                            <div className="rounded-xl border border-white/10 bg-[#faf8f4] p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] focus-within:ring-2 focus-within:ring-accent-gold/60">
                                <textarea
                                    id="consulta-portada"
                                    ref={campo}
                                    rows={1}
                                    value={pregunta}
                                    onChange={(e) => { setPregunta(e.target.value); if (error) setError(''); }}
                                    onKeyDown={alTeclear}
                                    placeholder="Escribe tu consulta como se la plantearías a un colega…"
                                    maxLength={2000}
                                    className="block min-h-[4.5rem] w-full resize-none bg-transparent px-3 pb-2 pt-2.5 text-[1rem] leading-relaxed text-tinta placeholder:text-piedra-500 focus:outline-none sm:min-h-0"
                                />
                                <div className="flex items-center justify-between gap-3 px-1 pb-0.5 pl-3">
                                    <span className="text-[12.5px] leading-snug text-piedra-600">
                                        Sin registro ni tarjeta.
                                        <span className="hidden sm:inline"> Responde con tesis del Semanario y su registro digital.</span>
                                    </span>
                                    <button
                                        type="submit"
                                        disabled={enviando}
                                        className="relieve relieve-tinta !h-10 !px-5 !text-[0.9375rem] disabled:opacity-70"
                                    >
                                        {enviando ? 'Abriendo…' : 'Preguntar'}
                                    </button>
                                </div>
                            </div>
                            {error && <p role="alert" className="mt-2.5 text-sm text-[#f3b9a8]">{error}</p>}
                        </form>

                        <div className="mt-4 flex max-w-3xl flex-wrap items-center gap-2">
                            <span className="mr-1 text-[13px] text-white/45">Prueba con</span>
                            {EJEMPLOS.map((ej) => (
                                <button
                                    key={ej.etiqueta}
                                    type="button"
                                    onClick={() => { setPregunta(ej.consulta); setError(''); campo.current?.focus(); }}
                                    className="rounded-lg border border-white/15 px-3 py-1.5 text-[13px] text-white/75 transition-colors hover:border-white/35 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60"
                                >
                                    {ej.etiqueta}
                                </button>
                            ))}
                        </div>

                    </div>

                    {/* ── La prueba: una consulta real, grabada en la plataforma ── */}
                    <figure className="relative z-10 mx-auto mt-12 max-w-6xl sm:mt-14">
                        <Pelicula />
                        <figcaption className="mt-4 flex flex-col gap-1 text-[13px] text-white/50 sm:flex-row sm:items-baseline sm:justify-between">
                            <span>Una consulta real en Iurexia, grabada en la plataforma. La espera, acortada.</span>
                            <span className="text-white/70">8 citas · 8 verificadas · cada una abre su documento oficial</span>
                        </figcaption>
                    </figure>
                </div>
                <div className="h-20 sm:h-28" />
            </section>
        </>
    );
}

/* El vídeo: el corte que toca según el ancho, silenciado y en bucle. Con «menos
   movimiento» se queda en su primer cuadro. Se elige al montar —y no con dos
   vídeos ocultos— para que el teléfono no descargue el de escritorio. */
function Pelicula() {
    const video = useRef<HTMLVideoElement>(null);
    const [corte, setCorte] = useState<keyof typeof PELICULA>('escritorio');

    useEffect(() => {
        const estrecho = window.matchMedia('(max-width: 639px)');
        const elegir = () => setCorte(estrecho.matches ? 'telefono' : 'escritorio');
        elegir();
        estrecho.addEventListener('change', elegir);
        return () => estrecho.removeEventListener('change', elegir);
    }, []);

    useEffect(() => {
        const v = video.current;
        if (!v) return;
        const menos = window.matchMedia('(prefers-reduced-motion: reduce)');
        const aplicar = () => {
            if (menos.matches) v.pause();
            else v.play().catch(() => { /* el navegador puede negarlo: queda el primer cuadro */ });
        };
        aplicar();
        menos.addEventListener('change', aplicar);
        return () => menos.removeEventListener('change', aplicar);
    }, [corte]);

    const p = PELICULA[corte];
    return (
        <div className="overflow-hidden rounded-xl bg-[#f5f4f0] shadow-[0_50px_140px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
            <video
                key={corte}
                ref={video}
                className="block h-auto w-full"
                width={p.ancho}
                height={p.alto}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster={p.poster}
                aria-label="Una consulta real en Iurexia: la pregunta, los pasos con nombre, la hoja escribiéndose con sus citas, 8 citas verificadas y el PDF oficial de la Gaceta del Semanario Judicial con el registro digital de la tesis."
            >
                <source src={p.src} type="video/mp4" />
            </video>
        </div>
    );
}

/* El vídeo de los abogados (el hero anterior), ahora de fondo: silenciado, en
   bucle y decorativo. Los velos son los mismos que lo hacían legible: el lateral
   sostiene el titular, el de arriba la barra, y abajo se funde con la tinta donde
   empieza la película. Con «menos movimiento», el póster quieto. */
function FondoAbogados() {
    const video = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const v = video.current;
        if (!v) return;
        const menos = window.matchMedia('(prefers-reduced-motion: reduce)');
        const aplicar = () => {
            if (menos.matches) v.pause();
            else v.play().catch(() => { /* queda el póster */ });
        };
        aplicar();
        menos.addEventListener('change', aplicar);
        return () => menos.removeEventListener('change', aplicar);
    }, []);

    return (
        <div className="absolute inset-x-0 top-0 h-[880px] sm:h-[820px] lg:h-[800px]">
            <video
                ref={video}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster="/hero/hero-poster.webp"
                tabIndex={-1}
            >
                <source src="/hero/hero.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-tinta via-tinta/75 to-tinta/10 lg:w-11/12" />
            <div className="absolute inset-0 bg-tinta/50 sm:hidden" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-tinta via-tinta/80 to-transparent" />
        </div>
    );
}
