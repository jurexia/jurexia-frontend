'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { AnimatedSection } from '@/components/AnimatedSection';

/* La demostración de la plataforma.

   POR QUÉ VÍDEO Y NO GIF. La referencia del sector (iudex) usa un GIF, pero un
   GIF de trece segundos a resolución legible pesa 1.6 MB y se ve escalonado:
   no admite más de unos pocos fotogramas sin dispararse de tamaño. El mismo
   recorrido en H.264 pesa 664 KB para 32 segundos, va a 30 fps y el navegador
   puede pausarlo.

   LO QUE SE APRENDIÓ MIRANDO A IUDEX DE CERCA. Sus dos demostraciones de
   producto son másters de 1920 metidos en un cuadro de 822 px: escala 0,428, y
   el cuerpo del contrato que enseñan queda a 5-7 píxeles en pantalla, y a 2-3
   en un teléfono. Enseñan control de cambios en una resolución en la que el
   control de cambios no se ve. Iurexia cometía el mismo error, y peor: escala
   0,26 y texto a 3 px. Por eso ahora se graba con la página al 150% y se
   entrega a 1696 px para un hueco de 1100: el texto llega legible.

   Y NO HAY UN SOLO RÓTULO EN 120 SEGUNDOS DE SU METRAJE. Un clip de 58 s se
   explica allí con una frase de doce palabras. Aquí los rótulos van en HTML
   sobre el vídeo, sincronizados por `timeupdate`: nítidos a cualquier
   resolución, traducibles sin reencodar, seleccionables, indexables y leíbles
   por un lector de pantalla. Cambiar uno cuesta una línea, no 1,5 MB.

   Va silenciado y sin controles nativos —es una demostración, no una película—
   pero con botón propio de pausa, porque una animación en bucle que no se puede
   detener es una barrera de accesibilidad real. Y si el sistema pide menos
   movimiento, arranca congelado en el póster. */

/** `desde` son los segundos en que ese momento empieza en el vídeo. Si falta,
 *  el rótulo se queda en la tarjeta de abajo y no aparece sobre la imagen. */
export type Rotulo = [titulo: string, texto: string, desde?: number];

export type DemoProps = {
    /** Ruta del MP4 bajo /public. */
    src: string;
    poster: string;
    /** Qué se ve, para quien no puede verlo. */
    descripcion: string;
    titulo: React.ReactNode;
    entradilla: string;
    /** Los momentos del recorrido. Nombran lo que pasa en pantalla: sin ellos,
        quien mira de pasada y sin sonido sólo ve texto que aparece. */
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
    /** El ancho del cuadro. Cuanto más ancho, más legible el texto de dentro:
        es la diferencia entre enseñar un expediente y enseñar una mancha. */
    ancho?: string;
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
        ancho = 'max-w-[1100px]',
    } = props;

    const videoRef = useRef<HTMLVideoElement>(null);
    const cajaRef = useRef<HTMLDivElement>(null);
    const [enMarcha, setEnMarcha] = useState(false);
    const [paso, setPaso] = useState(0);
    const [avance, setAvance] = useState(0);

    const conTiempo = rotulos.filter(r => typeof r[2] === 'number');

    /* Sólo se reproduce lo que se está mirando, y se rebobina al entrar. Iudex
       arranca sus dos vídeos a la vez cuando la sección asoma y nunca los
       rebobina: el segundo siempre se coge empezado, por la mitad. */
    useEffect(() => {
        const v = videoRef.current;
        const caja = cajaRef.current;
        if (!v || !caja) return;

        const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (quieto) return;

        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                v.currentTime = 0;
                v.play().then(() => setEnMarcha(true)).catch(() => { /* queda el póster */ });
            } else {
                v.pause();
                setEnMarcha(false);
            }
        }, { threshold: 0.55 });

        obs.observe(caja);
        return () => obs.disconnect();
    }, [src]);

    const alAvanzar = useCallback(() => {
        const v = videoRef.current;
        if (!v || !v.duration) return;
        setAvance(v.currentTime / v.duration);
        if (!conTiempo.length) return;
        let i = 0;
        for (let k = 0; k < rotulos.length; k++) {
            const t = rotulos[k][2];
            if (typeof t === 'number' && v.currentTime >= t) i = k;
        }
        setPaso(i);
    }, [rotulos, conTiempo.length]);

    const alternar = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
            v.play().then(() => setEnMarcha(true)).catch(() => {});
        } else {
            v.pause();
            setEnMarcha(false);
        }
    };

    const activo = rotulos[paso];

    return (
        <section className={`${fondo} ${espaciado}`}>
            <div className={`mx-auto ${ancho}`}>

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
                        <div ref={cajaRef}
                             className="overflow-hidden rounded-xl border border-charcoal-900/10 bg-white shadow-[0_20px_60px_-20px_rgba(17,17,17,0.35)]">
                            {marco && <div className="flex items-center gap-2 border-b border-charcoal-900/[0.07] bg-charcoal-900/[0.03] px-4 py-2.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-900/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-900/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-900/15" />
                                <span className="ml-3 truncate font-mono text-[11px] text-charcoal-900/40">
                                    {url}
                                </span>
                                {/* El contador convierte un bucle mudo en una secuencia
                                    con estructura: se sabe por dónde va y cuánto queda. */}
                                {!!conTiempo.length && (
                                    <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-charcoal-900/35">
                                        {String(paso + 1).padStart(2, '0')} / {String(rotulos.length).padStart(2, '0')}
                                    </span>
                                )}
                            </div>}

                            <div className="group relative">
                                <video
                                    ref={videoRef}
                                    className="block w-full"
                                    loop
                                    muted
                                    playsInline
                                    preload="none"
                                    poster={poster}
                                    aria-label={descripcion}
                                    onTimeUpdate={alAvanzar}
                                    key={src}
                                >
                                    {/* Sólo H.264. Se probó VP9 y salía MÁS pesado
                                        (823 KB contra 664 KB): con tipografía sobre
                                        fondo claro y poco movimiento, x264 gana. */}
                                    <source src={src} type="video/mp4" />
                                </video>

                                {/* El rótulo del momento, en HTML sobre la imagen. */}
                                {!!conTiempo.length && activo && (
                                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/40 to-transparent px-5 pb-4 pt-10">
                                        <p key={paso} className="animate-[fadeIn_240ms_ease-out] font-mono text-[10px] uppercase tracking-[0.14em] text-accent-gold/90">
                                            Paso {String(paso + 1).padStart(2, '0')}
                                        </p>
                                        <p className="mt-0.5 font-serif text-sm font-bold text-white sm:text-base">
                                            {activo[0]}
                                        </p>
                                        <p className="text-[12px] leading-snug text-white/70 sm:text-[13px]">
                                            {activo[1]}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={alternar}
                                    aria-label={enMarcha ? 'Pausar la demostración' : 'Reanudar la demostración'}
                                    className="absolute right-3 top-3 rounded-full bg-charcoal-900/55 p-2 text-white backdrop-blur transition hover:bg-charcoal-900/80 focus:outline-none focus:ring-2 focus:ring-accent-gold"
                                >
                                    {enMarcha ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>

                                {/* Dos píxeles que dicen cuánto queda. */}
                                <div className="absolute bottom-0 left-0 h-[2px] w-full bg-charcoal-900/10">
                                    <div className="h-full bg-accent-gold/80 transition-[width] duration-150"
                                         style={{ width: `${Math.round(avance * 100)}%` }} />
                                </div>
                            </div>
                        </div>

                        <figcaption className="mt-6 grid gap-3 sm:grid-cols-3">
                            {rotulos.map(([t, texto], i) => {
                                const puesto = !!conTiempo.length && i === paso;
                                return (
                                    <div
                                        key={t}
                                        className={`rounded-lg border px-4 py-3 text-left transition-colors duration-300 ${
                                            puesto
                                                ? 'border-accent-gold/50 bg-white'
                                                : 'border-charcoal-900/[0.07] bg-white/70'
                                        }`}
                                    >
                                        <p className={`font-mono text-[11px] tracking-wide ${
                                            puesto ? 'text-accent-gold' : 'text-charcoal-900/30'}`}>
                                            0{i + 1}
                                        </p>
                                        <p className="mt-1 font-serif text-sm font-bold text-charcoal-900">
                                            {t}
                                        </p>
                                        <p className="mt-1 text-[13px] leading-snug text-charcoal-900/60">
                                            {texto}
                                        </p>
                                    </div>
                                );
                            })}
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
