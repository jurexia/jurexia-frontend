'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

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
     y el Básico corren con otros proveedores. */

export default function AnuncioOpenAI() {
    const bloque = useRef<HTMLDivElement>(null);

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

    return (
        <section id="openai" aria-labelledby="openai-titulo" className="scroll-mt-20 bg-cream-300 px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
            <div ref={bloque} className="mx-auto flex max-w-5xl flex-col items-center text-center will-change-[opacity,transform]">
                {/* El símbolo oficial, sin tocar (public/terceros/openai). El
                    margen que trae el archivo es su espacio de respeto. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/terceros/openai/OAI_OpenAI-Blossom_Black.svg"
                    alt=""
                    width={716}
                    height={716}
                    className="h-[68px] w-[68px] sm:h-[92px] sm:w-[92px]"
                />

                <h2
                    id="openai-titulo"
                    className="mt-1 font-serif text-[2.15rem] font-normal leading-[1.12] tracking-[-0.015em] sm:text-5xl lg:text-[3.75rem]"
                >
                    <span className="text-charcoal-900/85">Iurexia</span>
                    <span className="text-charcoal-900/40">,</span>
                    <br className="sm:hidden" />
                    <span className="text-charcoal-900/40"> now powered by </span>
                    <span className="text-charcoal-900/85">OpenAI</span>
                </h2>

                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-charcoal-900/60 [text-wrap:balance] sm:mt-6 sm:max-w-2xl sm:text-base">
                    En algunas funciones incorporamos los modelos más avanzados de OpenAI, que maximizan la
                    calidad de la herramienta{' '}
                    <Link
                        href="/seguridad"
                        className="underline decoration-charcoal-900/25 decoration-dotted underline-offset-4 transition-colors hover:text-charcoal-900 hover:decoration-charcoal-900/60"
                    >
                        sin comprometer tu privacidad
                    </Link>
                    .
                </p>
            </div>
        </section>
    );
}
