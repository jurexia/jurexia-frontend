'use client';

import Link from 'next/link';
import { useEffect, useRef, type PointerEvent as EventoPuntero } from 'react';
import { crearGalaxia, type Anclas, type Galaxia } from '@/components/web/galaxia';

/* ═══ «IUREXIA, NOW POWERED BY OPENAI» (3-oct-2026, tercera versión) ═══
   Dos intentos rechazados por David, y lo que enseñaron:
   1. Una tarjeta oscura con titular y tres columnas: «está muy grande, domina
      mucho la pantalla».
   2. «Now powered by» gigante en cursiva, casi transparente, y el nombre de
      OpenAI chico debajo: «ocupa toda la pantalla y OpenAI casi nada, y sin
      logo… no cursivas, tipografía profesional».
   Lo que quiere: el símbolo de OpenAI que todos reconocen y la frase completa,
   en equilibrio, sobria, tenue, y que se desvanezca al bajar.

   Las pautas de marca de OpenAI (openai.com/brand) deciden la forma:
   · El símbolo (el «Blossom») va solo, negro y tal cual. No puede ir pegado a
     la palabra «OpenAI» como logotipo combinado, ni sobre una imagen, ni con
     transparencias o colores. Su margen de respeto lo trae el propio archivo
     oficial.
   · Las marcas de OpenAI no pueden verse más que la nuestra. Por eso la frase
     lleva a Iurexia de sujeto, con «Iurexia» y «OpenAI» del mismo tamaño y el
     mismo tono, y el enlace («now powered by») más claro.
   · Sin lenguaje de alianza («trabajamos con», «colaboramos con»): se dice qué
     se usa y dónde, «en algunas funciones», porque Sálvame, la Consulta rápida
     y el Básico corren con otros proveedores.

   La galaxia (4-oct-2026): al pasar el puntero por el titular —o al tocarlo
   con el dedo— la franja estalla en una noche con estrellas que giran
   alrededor de «OpenAI» (src/components/web/galaxia.ts). Mientras dura, el
   texto pasa a crema y el símbolo cambia a su versión BLANCA oficial (el
   archivo tal cual, nunca un filtro), en la caja que el lienzo no pinta. */

const DURACION_MINIMA = 1500; // ms: aunque el puntero se vaya antes, el estallido se ve entero
const TOQUE = 5500; // ms que queda abierta tras tocar con el dedo

export default function AnuncioOpenAI() {
    const seccion = useRef<HTMLElement>(null);
    const bloque = useRef<HTMLDivElement>(null);
    const lienzo = useRef<HTMLCanvasElement>(null);
    const simbolo = useRef<HTMLSpanElement>(null);
    const palabra = useRef<HTMLSpanElement>(null);
    const galaxia = useRef<Galaxia | null>(null);
    const encendidaEn = useRef(0);
    const recogiendo = useRef(false);
    const pendiente = useRef(0);
    const toque = useRef(0);

    /* Se desvanece al bajar: entero mientras está en la mitad baja de la
       pantalla y nada cuando su centro llega arriba, subiendo un poco más
       despacio que la página. Con «menos movimiento» se queda quieto. */
    useEffect(() => {
        const el = bloque.current;
        if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let cuadro = 0;
        const pintar = () => {
            cuadro = 0;
            const r = el.getBoundingClientRect();
            const alto = window.innerHeight || 1;
            const t = Math.min(1, Math.max(0, (r.top + r.height / 2 - alto * 0.12) / (alto * 0.43)));
            el.style.opacity = (t * t * (3 - 2 * t)).toFixed(3);
            el.style.transform = `translate3d(0, ${((1 - t) * -20).toFixed(1)}px, 0)`;
        };
        const alMover = () => {
            if (!cuadro) cuadro = requestAnimationFrame(pintar);
        };

        pintar();
        window.addEventListener('scroll', alMover, { passive: true });
        window.addEventListener('resize', alMover);
        return () => {
            cancelAnimationFrame(cuadro);
            window.removeEventListener('scroll', alMover);
            window.removeEventListener('resize', alMover);
        };
    }, []);

    /** La palabra «OpenAI», el núcleo y la caja del símbolo, en coordenadas del lienzo. */
    const anclas = (): Anclas => {
        const base = lienzo.current!.getBoundingClientRect();
        const w = palabra.current!.getBoundingClientRect();
        const s = simbolo.current!.getBoundingClientRect();
        const lente = { x: w.left - base.left, y: w.top - base.top, w: w.width, h: w.height };
        return {
            nucleo: { x: lente.x + lente.w / 2, y: lente.y + lente.h / 2 },
            lente,
            reserva: { x: s.left - base.left - 6, y: s.top - base.top - 6, w: s.width + 12, h: s.height + 12 },
        };
    };

    const encender = () => {
        const g = galaxia.current;
        const sec = seccion.current;
        const blq = bloque.current;
        if (!g || !sec || !blq) return;
        window.clearTimeout(pendiente.current);
        if (g.activa() && !recogiendo.current) return;
        encendidaEn.current = performance.now();
        recogiendo.current = false;

        // Distancias desde el núcleo: al símbolo (cuándo cambia a blanco) y a la esquina
        // más lejana del texto (cuándo, al recogerse, el texto vuelve a tinta).
        const a = anclas();
        const base = lienzo.current!.getBoundingClientRect();
        const b = blq.getBoundingClientRect();
        const r = a.reserva!;
        const dSimbolo = Math.hypot(r.x + r.w / 2 - a.nucleo.x, r.y + r.h / 2 - a.nucleo.y);
        const dTexto = Math.max(
            ...[[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]].map(([x, y]) =>
                Math.hypot(x - base.left - a.nucleo.x, y - base.top - a.nucleo.y),
            ),
        );

        g.encender(anclas, (radio) => {
            if (radio === 0) {
                sec.dataset.cosmos = 'off';
                sec.dataset.simbolo = 'negro';
                recogiendo.current = false;
                return;
            }
            sec.dataset.cosmos = (recogiendo.current ? radio > dTexto * 0.85 : radio > 30) ? 'on' : 'off';
            sec.dataset.simbolo = radio > dSimbolo ? 'blanco' : 'negro';
        });
    };

    const apagar = () => {
        const g = galaxia.current;
        if (!g || !g.activa() || recogiendo.current) return;
        window.clearTimeout(pendiente.current);
        const falta = DURACION_MINIMA - (performance.now() - encendidaEn.current);
        if (falta > 0) {
            pendiente.current = window.setTimeout(apagar, falta);
            return;
        }
        recogiendo.current = true;
        g.apagar();
    };

    // La galaxia sólo existe si el sistema no pide menos movimiento.
    useEffect(() => {
        const el = lienzo.current;
        if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        galaxia.current = crearGalaxia(el);

        // Se recoge si la franja sale de la pantalla, si cambia el tamaño o si se toca fuera.
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) apagar();
        });
        if (seccion.current) obs.observe(seccion.current);
        const alCambiarTamano = () => apagar();
        const alTocarFuera = (e: PointerEvent) => {
            if (e.pointerType === 'touch' && !seccion.current?.contains(e.target as Node)) apagar();
        };
        window.addEventListener('resize', alCambiarTamano);
        document.addEventListener('pointerdown', alTocarFuera);
        return () => {
            obs.disconnect();
            window.removeEventListener('resize', alCambiarTamano);
            document.removeEventListener('pointerdown', alTocarFuera);
            window.clearTimeout(pendiente.current);
            window.clearTimeout(toque.current);
            galaxia.current?.destruir();
            galaxia.current = null;
        };
        // encender/apagar sólo leen referencias: no hace falta volver a crear la galaxia
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const alEntrar = (e: EventoPuntero) => {
        if (e.pointerType !== 'touch') encender();
    };
    const alTocar = (e: EventoPuntero) => {
        if (e.pointerType !== 'touch') return;
        encender();
        window.clearTimeout(toque.current);
        toque.current = window.setTimeout(apagar, TOQUE);
    };
    const alSalir = (e: EventoPuntero) => {
        if (e.pointerType !== 'touch') apagar();
    };

    return (
        <section
            ref={seccion}
            id="openai"
            aria-labelledby="openai-titulo"
            data-cosmos="off"
            data-simbolo="negro"
            onPointerLeave={alSalir}
            className="group relative isolate scroll-mt-20 overflow-hidden bg-cream-300 px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12"
        >
            <canvas ref={lienzo} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

            <div ref={bloque} className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center will-change-[opacity,transform]">
                {/* El símbolo oficial, sin tocar (public/terceros/openai). El
                    margen que trae el archivo es su espacio de respeto. Con la
                    noche detrás se cambia al archivo blanco oficial, sin
                    fundidos: una transparencia sería una variación. */}
                <span ref={simbolo} className="relative block h-[68px] w-[68px] sm:h-[92px] sm:w-[92px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/terceros/openai/OAI_OpenAI-Blossom_Black.svg"
                        alt=""
                        width={716}
                        height={716}
                        className="absolute inset-0 h-full w-full group-data-[simbolo=blanco]:invisible"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/terceros/openai/OAI_OpenAI-Blossom_White.svg"
                        alt=""
                        width={716}
                        height={716}
                        className="invisible absolute inset-0 h-full w-full group-data-[simbolo=blanco]:visible"
                    />
                </span>

                <h2
                    id="openai-titulo"
                    onPointerEnter={alEntrar}
                    onPointerDown={alTocar}
                    className="mt-1 font-serif text-[2.15rem] font-normal leading-[1.12] tracking-[-0.015em] sm:text-5xl lg:text-[3.75rem]"
                >
                    <span className="text-charcoal-900/85 transition-colors duration-300 group-data-[cosmos=on]:text-cream-100">Iurexia</span>
                    <span className="text-charcoal-900/40 transition-colors duration-300 group-data-[cosmos=on]:text-cream-100/45">,</span>
                    <br className="sm:hidden" />
                    <span className="text-charcoal-900/40 transition-colors duration-300 group-data-[cosmos=on]:text-cream-100/45"> now powered by </span>
                    <span ref={palabra} className="text-charcoal-900/85 transition-colors duration-300 group-data-[cosmos=on]:text-cream-100">
                        OpenAI
                    </span>
                </h2>

                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-charcoal-900/60 transition-colors duration-300 [text-wrap:balance] group-data-[cosmos=on]:text-cream-100/65 sm:mt-6 sm:max-w-2xl sm:text-base">
                    En algunas funciones incorporamos los modelos más avanzados de OpenAI, que maximizan la
                    calidad de la herramienta{' '}
                    <Link
                        href="/seguridad"
                        className="underline decoration-charcoal-900/25 decoration-dotted underline-offset-4 transition-colors hover:text-charcoal-900 hover:decoration-charcoal-900/60 group-data-[cosmos=on]:decoration-cream-100/40 group-data-[cosmos=on]:hover:text-cream-100"
                    >
                        sin comprometer tu privacidad
                    </Link>
                    .
                </p>
            </div>
        </section>
    );
}
