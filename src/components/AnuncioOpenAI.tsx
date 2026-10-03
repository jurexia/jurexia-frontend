'use client';

import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';
import { useEffect, useRef } from 'react';

/* ═══ «NOW POWERED BY OPENAI», EN VOZ BAJA (3-oct-2026, segunda versión) ═══
   La primera fue una tarjeta oscura con titular y tres columnas, y David la
   rechazó: «está muy grande, domina mucho la pantalla». Lo que pidió es otra
   cosa: decirlo «tenuemente y de manera muy profesional y elegante», con un
   rótulo grande que cruce la pantalla, traslúcido, que se desvanezca al
   bajar, el logotipo oficial de OpenAI y, debajo, el mensaje en una línea.

   Las pautas de marca de OpenAI (openai.com/brand, aceptadas al bajar el
   paquete de logotipos) mandan sobre cómo se hace:
   · el logotipo va TAL CUAL: sin transparencias, efectos ni texturas, y con
     su espacio libre (el archivo oficial ya lo trae como margen). Por eso lo
     traslúcido es el rótulo, que es letra nuestra; el logotipo va entero;
   · nunca más prominente que la marca propia: va a la altura de la «Iurexia»
     de la barra, no al tamaño del rótulo;
   · la marca denominativa sola, sin el «Blossom»;
   · sin lenguaje de alianza: «trabajamos con», «colaboramos con» o «nos
     asociamos con» están vetados a quien no es socio. Se dice qué tecnología
     se usa y dónde: «en algunas funciones», porque Sálvame, la Consulta rápida
     y el Básico corren con otros proveedores.

   El rótulo va en cursiva porque es inglés: en la tipografía española los
   extranjerismos se escriben en cursiva. */

const cursiva = Playfair_Display({
    subsets: ['latin'],
    weight: '400',
    style: 'italic',
    display: 'swap',
});

export default function AnuncioOpenAI() {
    const rotulo = useRef<HTMLParagraphElement>(null);

    /* Se desvanece al bajar: entero mientras está en la mitad baja de la
       pantalla y nada cuando su centro llega arriba, subiendo un poco más
       despacio que la página. Con «menos movimiento» se queda quieto. */
    useEffect(() => {
        const el = rotulo.current;
        if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let cuadro = 0;
        const pintar = () => {
            cuadro = 0;
            const r = el.getBoundingClientRect();
            const alto = window.innerHeight || 1;
            const t = Math.min(1, Math.max(0, (r.top + r.height / 2 - alto * 0.12) / (alto * 0.43)));
            el.style.opacity = (t * t * (3 - 2 * t)).toFixed(3);
            el.style.transform = `translate3d(0, ${((1 - t) * -24).toFixed(1)}px, 0)`;
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

    return (
        <section id="openai" aria-labelledby="openai-titulo" className="scroll-mt-20 bg-cream-300 px-4 pb-12 pt-3 sm:px-6 sm:pb-16 lg:px-8">
            <h2 id="openai-titulo" className="sr-only">Now powered by OpenAI</h2>

            <div className="mx-auto max-w-7xl [container-type:inline-size]">
                <p ref={rotulo} aria-hidden className={`${cursiva.className} rotulo-openai`}>
                    Now powered by
                </p>

                <div className="mt-5 flex flex-col items-center gap-3 text-center sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:text-left">
                    {/* El archivo oficial, sin tocar (public/terceros/openai). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/terceros/openai/OAI_OpenAI_Wordmark_Black.svg"
                        alt="OpenAI"
                        width={1212}
                        height={542}
                        className="h-11 w-auto shrink-0 sm:order-2 sm:-mr-4 sm:h-12"
                    />
                    <p className="max-w-md text-[14px] leading-relaxed text-charcoal-900/60 sm:order-1 sm:max-w-2xl sm:text-[15px]">
                        En algunas funciones, Iurexia incorpora ahora los modelos más avanzados de OpenAI, que
                        maximizan la calidad de la herramienta{' '}
                        <Link
                            href="/seguridad"
                            className="underline decoration-charcoal-900/25 decoration-dotted underline-offset-4 transition-colors hover:text-charcoal-900 hover:decoration-charcoal-900/60"
                        >
                            sin comprometer tu privacidad
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </section>
    );
}
