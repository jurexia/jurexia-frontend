'use client'

/* LA MESA DE TRABAJO (12-oct-2026). David: rediseñar /carpetas «tal como hicimos
   con el diseño de calendarios y de tarjetas de abogados… para que el abogado se
   sienta en un ambiente profesional». Las piezas comunes a Mis carpetas y a cada
   carpeta, con el lenguaje de la Agenda (papel cálido, grabados de /web/arte,
   títulos en Playfair, botones redondos de tinta) y el de Connect (la portada
   oscura con su grabado y el rótulo dorado).

   Una sección nueva de la carpeta se arma con <Seccion>: así toda la carpeta
   habla igual, la ponga quien la ponga. */

import type { ReactNode } from 'react'

/** Botón principal: tinta sobre papel. */
export const BOTON =
    'inline-flex items-center justify-center gap-2 rounded-full bg-charcoal-900 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-50'
/** Botón secundario: papel con filete. */
export const BOTON_SUAVE =
    'inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-charcoal-900 ring-1 ring-charcoal-900/15 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50'
/** Botón sobre la portada oscura. */
export const BOTON_CLARO =
    'inline-flex items-center justify-center gap-2 rounded-full bg-[#f3e4c8] px-4 py-2 text-[13px] font-semibold text-[#171614] transition hover:bg-white disabled:opacity-50'
export const BOTON_CLARO_SUAVE =
    'inline-flex items-center justify-center gap-2 rounded-full border border-[#bdab86]/60 px-4 py-2 text-[13px] font-semibold text-[#f3e4c8] transition hover:border-[#e3c994] hover:bg-white/10 disabled:opacity-50'

/** El papel de fondo, con Temis a un costado, como en la Agenda. Recorta con
    `overflow-x-clip` y no con `hidden`: `hidden` vuelve a este bloque un
    contenedor de desplazamiento y la ficha lateral de la carpeta deja de
    quedarse fija al bajar. */
export function FondoMesa({ children }: { children: ReactNode }) {
    return (
        <div className="relative min-h-screen overflow-x-clip bg-[#efe9dc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/web/arte/portico.webp"
                alt=""
                className="pointer-events-none fixed inset-x-0 top-0 h-[40vh] w-full object-cover opacity-[0.16]"
            />
            <div className="pointer-events-none fixed inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-transparent via-[#efe9dc]/70 to-[#efe9dc]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/web/arte/themis.webp"
                alt=""
                className="pointer-events-none fixed bottom-0 right-0 hidden h-[72vh] opacity-[0.07] xl:block"
            />
            <div className="relative">{children}</div>
        </div>
    )
}

/**
 * La portada oscura con su grabado (la de Connect). `rotulo` va en dorado y
 * espaciado; `titulo` en Playfair; lo que vaya en `children` queda debajo.
 */
export function Portada({
    arte,
    rotulo,
    titulo,
    children,
    arriba,
}: {
    arte: string
    rotulo: ReactNode
    titulo: ReactNode
    children?: ReactNode
    /** Lo que va sobre el rótulo: la ruta de regreso. */
    arriba?: ReactNode
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#564936] bg-[#171614] text-[#f7f2e8] shadow-[0_28px_60px_-32px_rgba(17,17,17,0.75)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={arte} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#11100e_0%,rgba(17,16,14,0.94)_36%,rgba(17,16,14,0.45)_78%,rgba(17,16,14,0.25)_100%)]" />
            {/* En el teléfono la letra cruza todo el grabado: se oscurece entero. */}
            <div className="absolute inset-0 bg-[#11100e]/55 sm:hidden" />
            <div className="relative px-5 py-7 sm:px-9 sm:py-9">
                {arriba}
                <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-[#c8ab73]">{rotulo}</p>
                <h1 className="mt-3 max-w-3xl font-serif text-[34px] font-normal leading-[1.05] tracking-[-0.03em] text-[#faf7ef] sm:text-[46px] [&_em]:font-normal [&_em]:text-[#e3c994]">
                    {titulo}
                </h1>
                {children}
            </div>
        </div>
    )
}

/** Una cifra de la portada: «4 · carpetas». */
export function Cifra({ valor, rotulo, alerta = false }: { valor: ReactNode; rotulo?: string; alerta?: boolean }) {
    return (
        <span
            className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 text-[12px] backdrop-blur-sm ${
                alerta
                    ? 'border-red-300/50 bg-red-900/40 text-red-100'
                    : 'border-[#bdab86]/35 bg-black/30 text-[#d9cfbd]'
            }`}>
            <strong className="text-[13px] font-semibold tabular-nums text-[#faf7ef]">{valor}</strong>
            {rotulo}
        </span>
    )
}

/** Una sección de la carpeta: rótulo dorado, título en Playfair y sus acciones. */
export function Seccion({
    rotulo,
    titulo,
    acciones,
    children,
    id,
}: {
    rotulo: string
    titulo: ReactNode
    acciones?: ReactNode
    children: ReactNode
    id?: string
}) {
    return (
        <section
            id={id}
            className="scroll-mt-24 rounded-2xl bg-white/90 p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_14px_34px_-24px_rgba(17,17,17,0.35)] ring-1 ring-charcoal-900/10 sm:p-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">{rotulo}</p>
                    <h2 className="mt-1 font-serif text-[22px] font-normal leading-tight text-charcoal-900">{titulo}</h2>
                </div>
                {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
            </header>
            <div className="mt-4">{children}</div>
        </section>
    )
}
