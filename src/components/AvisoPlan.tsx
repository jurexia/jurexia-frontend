'use client';

/* EL AVISO QUE INVITA A SUBIR DE PLAN (12-oct-2026)
   Sale al tocar en el chat una herramienta con candado.

   David: «cambia el mensaje que sale para cambiar a Platinum y mete a Themis
   de la tarjeta Platinum y el botón crema con negro texturizado». El aviso de
   Platinum es la tarjeta de /precios en pequeño: la misma Themis, el negro con
   grano (`tarjeta-negra`) y el botón crema en relieve (`boton-crema`,
   globals.css). La letra va a la izquierda, sobre el negro limpio, y la diosa
   a la derecha. Cada herramienta dice qué es y con qué otras viene
   (`HERRAMIENTAS_PLATINUM`, el mismo texto de la tarjeta).

   «pro» es lo que pide Pro: el mismo negro y el mismo botón, sin Themis, que
   es la obra de Platinum. */

import { HERRAMIENTAS_PLATINUM, type HerramientaPlatinum } from '@/lib/herramientas-platinum';

/* Themis, encuadrada para el aviso. `ObraOscura` (FondosDePlan) la pone en
   una tarjeta alta y en el aviso sólo asomaba la cabeza: aquí va en columna a
   todo el alto, con el rayo, la balanza y el rostro a la vista, y se funde
   con el negro por la izquierda (donde va la letra) y por el pie (el botón). */
/* eslint-disable @next/next/no-img-element */
function Themis() {
    const mascara = 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 22%, #000 50%), linear-gradient(180deg, #000 62%, transparent 100%)';
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <div
                className="absolute bottom-0 right-0 top-0 w-[60%]"
                style={{ WebkitMaskImage: mascara, maskImage: mascara, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }}
            >
                <img src="/web/arte/themis.webp" alt="" decoding="async" className="h-full w-full object-cover object-[100%_0%]" />
            </div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,14,13,0.86) 0%, rgba(15,14,13,0.62) 42%, rgba(15,14,13,0.12) 78%, rgba(15,14,13,0.02) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,14,13,0) 0%, rgba(15,14,13,0) 58%, rgba(15,14,13,0.55) 100%)' }} />
        </div>
    );
}

/** «A, B y C». */
function enLista(xs: string[]): string {
    return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

export default function AvisoPlan({ herramienta, onCerrar }: {
    herramienta: 'pro' | HerramientaPlatinum;
    onCerrar: () => void;
}) {
    const platinum = herramienta !== 'pro';
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCerrar}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="aviso-plan-titulo"
                className="tarjeta-negra relative isolate w-full max-w-lg overflow-hidden rounded-2xl border px-7 pb-6 pt-9 text-left animate-in zoom-in-95 fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {platinum && <Themis />}
                <div className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                {platinum ? (
                    <div className="max-w-[12.75rem] sm:max-w-[16.5rem]">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold">
                            Plan Platinum
                        </p>
                        <h3 id="aviso-plan-titulo" className="mb-3 font-serif text-[1.75rem] font-medium leading-tight text-white">
                            {HERRAMIENTAS_PLATINUM[herramienta].nombre}
                        </h3>
                        <p className="mb-4 text-sm leading-relaxed text-white/80">
                            {HERRAMIENTAS_PLATINUM[herramienta].explicacion}
                        </p>
                        <p className="mb-8 text-xs leading-relaxed text-white/55">
                            Viene en Platinum junto con {enLista(
                                (Object.keys(HERRAMIENTAS_PLATINUM) as HerramientaPlatinum[])
                                    .filter((h) => h !== herramienta)
                                    .map((h) => HERRAMIENTAS_PLATINUM[h].nombre),
                            )}.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold">
                            Función exclusiva Pro
                        </p>
                        <p id="aviso-plan-titulo" className="mb-8 text-sm leading-relaxed text-white/80">
                            Únete al plan <span className="text-white font-semibold">Pro o superior</span> de Iurexia para utilizar las mejores y más potentes funciones de la plataforma.
                        </p>
                    </>
                )}
                <div className="flex flex-col gap-2">
                    <a href="/precios" className="boton-crema h-12 w-full text-[0.9375rem]">
                        {platinum ? 'Pasar a Platinum' : 'Ver planes Pro'}
                    </a>
                    <button
                        onClick={onCerrar}
                        className="py-1 text-xs text-white/40 transition-colors hover:text-white/75"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
