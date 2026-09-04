'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { AnimatedSection } from '@/components/AnimatedSection';

/* La demostración de la plataforma, bajo la vitrina de despachos.

   POR QUÉ VÍDEO Y NO GIF. La referencia del sector (iudex) usa un GIF, pero un
   GIF de trece segundos a resolución legible pesa 1.6 MB y se ve escalonado:
   no admite más de unos pocos fotogramas sin dispararse de tamaño. El mismo
   recorrido en H.264 pesa 664 KB para 32 segundos, va a 30 fps y el navegador
   puede pausarlo.

   Va silenciado, en bucle y sin controles nativos —es una demostración, no una
   película— pero con un botón propio de pausa, porque una animación en bucle
   que no se puede detener es una barrera de accesibilidad real. Y si el sistema
   pide menos movimiento, arranca congelado en el póster.

   Los tres rótulos no son decoración: nombran lo que el visitante está viendo
   en cada momento. Sin ellos, quien mira sin sonido y de pasada sólo ve texto
   que aparece. */
export type Rotulo = [titulo: string, texto: string];

export type DemoProps = {
    /** Ruta del MP4 bajo /public. */
    src: string;
    poster: string;
    /** Qué se ve, para quien no puede verlo. */ 
    descripcion: string;
    titulo: React.ReactNode;
    entradilla: string;
    /** Los tres momentos del recorrido. Nombran lo que pasa en pantalla:
        sin ellos, quien mira de pasada y sin sonido sólo ve texto que aparece. */
    rotulos: Rotulo[];
    /** `null` para que no haya llamada a la acción: dentro de una galería
        de capítulos, cuatro botones idénticos no invitan, cansan. */
    cta?: { href: string; texto: string; nota?: string } | null;
    /** La barra de ventana con la URL. Se quita cuando el vídeo ya va dentro
        de una tarjeta que hace de marco. */
    marco?: boolean;
    url?: string;
    fondo?: string;
    /** El aire de la sección. Se reduce cuando el vídeo va dentro de otra
        sección que ya lo pone —si no, se suman dos veces. */
    espaciado?: string;
};

export default function DemoEnVivo(props: Partial<DemoProps> = {}) {
    const {
        src = '/demo/consulta.mp4',
        poster = '/demo/consulta-poster.jpg',
        descripcion = 'Demostración: una consulta sobre prisión preventiva oficiosa, la respuesta con sus criterios y el PDF oficial de la Constitución abierto en el artículo citado.',
        titulo = <>Pregunta como le preguntarías a{' '}<span className="text-accent-gold">un colega</span></>,
        entradilla = 'La respuesta trae los criterios que la sostienen. Pulsa cualquiera y se abre el documento oficial en la página exacta, con el texto subrayado. Sin salir de la conversación.',
        rotulos = [
            ['La pregunta', 'En lenguaje llano, como se plantea en el despacho.'],
            ['La respuesta', 'Con los criterios y las normas que la sostienen.'],
            ['La prueba', 'El PDF oficial, en su página, con el texto subrayado.'],
        ] as Rotulo[],
        cta = { href: '/chat', texto: 'Pruébalo con tu propia consulta',
                nota: 'Plan gratuito, sin tarjeta. Se registra en un minuto.' },
        marco = true,
        url = 'iurexia.com/chat',
        fondo = 'bg-cream-300',
        espaciado = 'px-4 py-16 sm:px-6 sm:py-20',
    } = props;

    const videoRef = useRef<HTMLVideoElement>(null);
    const [enMarcha, setEnMarcha] = useState(true);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (menosMovimiento.matches) {
            v.pause();
            setEnMarcha(false);
        }
    }, []);

    const alternar = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
            v.play().catch(() => { /* el navegador puede negarse; queda el póster */ });
            setEnMarcha(true);
        } else {
            v.pause();
            setEnMarcha(false);
        }
    };

    return (
        <section className={`${fondo} ${espaciado}`}>
            <div className="mx-auto max-w-5xl">

                <AnimatedSection animation="slide-up">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="font-serif text-2xl font-bold leading-tight text-charcoal-900 sm:text-3xl md:text-4xl">
                            {titulo}
                        </p>
                        <p className="mt-4 text-base leading-relaxed text-charcoal-900/70 sm:text-lg">
                            {entradilla}
                        </p>
                    </div>
                </AnimatedSection>

                <AnimatedSection animation="slide-up" delay={150}>
                    <figure className="mt-10 sm:mt-12">
                        {/* El marco: una barra de ventana sobria para que se lea como
                            producto y no como una captura suelta. */}
                        <div className="overflow-hidden rounded-xl border border-charcoal-900/10 bg-white shadow-[0_20px_60px_-20px_rgba(17,17,17,0.35)]">
                            {marco && <div className="flex items-center gap-2 border-b border-charcoal-900/[0.07] bg-charcoal-900/[0.03] px-4 py-2.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-900/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-900/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-900/15" />
                                <span className="ml-3 truncate font-mono text-[11px] text-charcoal-900/40">
                                    {url}
                                </span>
                            </div>}

                            <div className="group relative">
                                <video
                                    ref={videoRef}
                                    className="block w-full"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload="metadata"
                                    poster={poster}
                                    aria-label={descripcion}
                                    key={src}
                                >
                                    {/* Sólo H.264. Se probó VP9 y salía MÁS pesado
                                        (823 KB contra 664 KB): con tipografía sobre
                                        fondo claro y poco movimiento, x264 gana. */}
                                    <source src={src} type="video/mp4" />
                                </video>

                                <button
                                    type="button"
                                    onClick={alternar}
                                    aria-label={enMarcha ? 'Pausar la demostración' : 'Reanudar la demostración'}
                                    className="absolute bottom-3 right-3 rounded-full bg-charcoal-900/60 p-2 text-white opacity-0 backdrop-blur transition hover:bg-charcoal-900/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-gold group-hover:opacity-100 sm:opacity-70"
                                >
                                    {enMarcha ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <figcaption className="mt-6 grid gap-3 sm:grid-cols-3">
                            {rotulos.map(([titulo, texto], i) => (
                                <div
                                    key={titulo}
                                    className="rounded-lg border border-charcoal-900/[0.07] bg-white/70 px-4 py-3 text-left"
                                >
                                    <p className="font-mono text-[11px] tracking-wide text-accent-gold">
                                        0{i + 1}
                                    </p>
                                    <p className="mt-1 font-serif text-sm font-bold text-charcoal-900">
                                        {titulo}
                                    </p>
                                    <p className="mt-1 text-[13px] leading-snug text-charcoal-900/60">
                                        {texto}
                                    </p>
                                </div>
                            ))}
                        </figcaption>
                    </figure>
                </AnimatedSection>

                {cta && (
                    <AnimatedSection animation="slide-up" delay={300}>
                        <div className="mt-10 text-center">
                            <Link
                                href={cta.href}
                                className="inline-flex items-center justify-center rounded-lg bg-charcoal-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-charcoal-900/90"
                            >
                                {cta.texto}
                            </Link>
                            {cta.nota && (
                                <p className="mt-3 text-[13px] text-charcoal-900/50">{cta.nota}</p>
                            )}
                        </div>
                    </AnimatedSection>
                )}
            </div>
        </section>
    );
}
