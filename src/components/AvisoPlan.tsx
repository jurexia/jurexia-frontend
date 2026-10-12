'use client';

/* EL AVISO QUE INVITA A SUBIR DE PLAN (12-oct-2026)
   Sale al tocar cualquier herramienta con candado: los mosaicos y la fila del
   chat, el esfuerzo de redacción, Internet en «Fuentes», los motores del
   escrito, los flujos, la Cronología y la Bóveda.

   David: «cambia el mensaje que sale para cambiar a Platinum y mete a Themis
   de la tarjeta Platinum y el botón crema con negro texturizado», y luego: «si
   es gratuito y quiere utilizar herramienta Pro como redacción u otra, la
   tarjeta crema con "Pásate a Pro"; si quiere usar una Platinum, la que
   configuraste». Cada aviso es la tarjeta de su plan en /precios, en pequeño:
     · Platinum — negro con grano (`tarjeta-negra`), Themis a la derecha y el
       botón crema en relieve (`boton-crema`, globals.css);
     · Pro — el marfil de su tarjeta, el palacio de justicia a lápiz al pie y
       el botón de tinta en relieve (`relieve-tinta`).
   Qué dice cada uno vive en lib/avisos-plan.ts.

   Va en un portal sobre `body`: se abre también desde dentro de otros modales
   (el del escrito, los flujos, la Cronología) y, dentro de uno con
   `transform`, un `fixed` deja de cubrir la pantalla. */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fichaDelAviso, otrasDePlatinum, type HerramientaConAviso } from '@/lib/avisos-plan';

/* eslint-disable @next/next/no-img-element */

/* Themis, encuadrada para el aviso. `ObraOscura` (FondosDePlan) la pone en
   una tarjeta alta y en el aviso sólo asomaba la cabeza: aquí va en columna a
   todo el alto, con el rayo, la balanza y el rostro a la vista, y se funde
   con el negro por la izquierda (donde va la letra) y por el pie (el botón). */
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

/* El palacio de justicia de la tarjeta Pro, entero y pequeño al pie, detrás
   del botón, fundido hacia arriba con el marfil para no cruzar la letra. Es
   `ObraClara` con el alto del aviso, que es más bajo que la tarjeta; el
   marfil se espesa al pie para que «Cerrar» no se pierda entre columnas. */
function Fachada() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <div
                className="absolute inset-x-0 bottom-0 h-[230px] sm:h-[250px]"
                style={{
                    WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 42%)',
                    maskImage: 'linear-gradient(180deg, transparent 0%, #000 42%)',
                }}
            >
                <img src="/web/arte/fachada.webp" alt="" decoding="async" className="h-full w-full object-cover object-[50%_38%]" />
            </div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(248,243,235,0) 0%, rgba(248,243,235,0.12) 55%, rgba(248,243,235,0.72) 86%, rgba(248,243,235,0.88) 100%)' }} />
        </div>
    );
}

/** «A, B y C». */
function enLista(xs: string[]): string {
    return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

export default function AvisoPlan({ herramienta, onCerrar }: {
    herramienta: HerramientaConAviso;
    onCerrar: () => void;
}) {
    // El portal se monta tras hidratar: en el servidor no hay `body` y, si un
    // padre lo pintara desde el primer cuadro, el HTML no coincidiría.
    const [montado, setMontado] = useState(false);
    useEffect(() => setMontado(true), []);
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);

    if (!montado) return null;

    const ficha = fichaDelAviso(herramienta);
    const platinum = ficha.plan === 'platinum';

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); onCerrar(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="aviso-plan-titulo"
                className={`relative isolate w-full max-w-lg overflow-hidden rounded-2xl border px-7 pb-6 pt-9 text-left animate-in zoom-in-95 fade-in duration-200 ${platinum
                    ? 'tarjeta-negra'
                    : 'border-black/[0.08] bg-[#f8f3eb] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {platinum ? <Themis /> : <Fachada />}
                {/* El filo de oro es de Platinum, como el anillo de su tarjeta. */}
                {platinum && (
                    <div className="absolute top-0 left-0 right-0 h-0.5"
                        style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                )}

                <div className={platinum ? 'max-w-[12.75rem] sm:max-w-[16.5rem]' : 'max-w-[22rem]'}>
                    <p className={`mb-3 text-[10px] font-bold uppercase tracking-[0.2em] ${platinum ? 'text-accent-gold' : 'text-accent-brown'}`}>
                        {platinum ? 'Plan Platinum' : 'Plan Pro'}
                    </p>
                    <h3 id="aviso-plan-titulo" className={`mb-3 font-serif text-[1.75rem] font-medium leading-tight ${platinum ? 'text-white' : 'text-charcoal-900'}`}>
                        {ficha.nombre}
                    </h3>
                    <p className={`mb-4 text-sm leading-relaxed ${platinum ? 'text-white/80' : 'text-piedra-700'}`}>
                        {ficha.explicacion}
                    </p>
                    <p className={`text-xs leading-relaxed ${platinum ? 'mb-8 text-white/55' : 'mb-32 text-piedra-600 sm:mb-36'}`}>
                        {platinum
                            ? <>Viene en Platinum junto con {enLista(otrasDePlatinum(herramienta))}.</>
                            : herramienta === 'flujos'
                                ? <>Vienen en Pro, 30 al mes, y en Platinum, 60 al mes.</>
                                : <>Viene en Pro, con 140 consultas al mes y 30 flujos de trabajo.</>}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <a href="/precios" className={platinum
                        ? 'boton-crema h-12 w-full text-[0.9375rem]'
                        : 'relieve relieve-tinta h-12 w-full rounded-xl text-[0.9375rem] font-semibold'}>
                        {platinum ? 'Pásate a Platinum' : 'Pásate a Pro'}
                    </a>
                    <button
                        onClick={onCerrar}
                        className={`py-1 text-xs transition-colors ${platinum ? 'text-white/40 hover:text-white/75' : 'text-charcoal-800 hover:text-charcoal-900'}`}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
