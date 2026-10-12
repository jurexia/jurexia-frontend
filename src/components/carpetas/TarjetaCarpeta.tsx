'use client'

/* La carpeta en el escritorio, como las tarjetas de abogados de Connect: arriba
   su grabado con el tipo y el avance; abajo el dibujo de la carpeta (el mismo de
   la app móvil, que dice «carpeta» sin leer), su nombre en Playfair, el objetivo
   contra el que la mide Iurexia y cuánto le falta. */

import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'

import { CarpetaIcono } from '@/components/CarpetaIcono'
import { arteDeCarpeta, haceCuanto } from '@/lib/arte-carpeta'
import { etiquetaMateria, nombreCarpeta, tipoCarpeta, type Expediente } from '@/lib/expedientes'

export default function TarjetaCarpeta({ carpeta }: { carpeta: Expediente }) {
    const tipo = tipoCarpeta(carpeta.tipo)
    const docs = carpeta.totalDocumentos ?? 0
    const avance = carpeta.avance
    const datos = [
        carpeta.materia ? etiquetaMateria(carpeta.materia) : null,
        docs === 0 ? 'Sin documentos' : `${docs} ${docs === 1 ? 'documento' : 'documentos'}`,
    ].filter(Boolean)

    return (
        <Link
            href={`/carpetas/${carpeta.id}`}
            className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#ddd5c7] bg-[#fffefa] shadow-[0_7px_20px_rgba(32,26,16,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-[#c9b994] hover:shadow-[0_22px_44px_-22px_rgba(32,26,16,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold">
            <div className="relative h-32 overflow-hidden bg-[#1a1916]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={arteDeCarpeta(carpeta.id, carpeta.tipo)}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/70" />
                <div className="absolute inset-x-4 top-3 flex items-start justify-between gap-2">
                    <span className="rounded-[3px] border border-[#e8d3a8]/60 bg-[#161410]/75 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#f3dfb4]">
                        {tipo.label}
                    </span>
                    {avance !== null ? (
                        <span className="rounded-[3px] border border-[#e8d3a8]/60 bg-[#161410]/75 px-2 py-1 text-[10px] font-bold tracking-[0.04em] text-[#f3dfb4]">
                            {avance}% de avance
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="relative flex flex-1 flex-col px-5 pb-5">
                <div className="-mt-7 mb-2 w-fit drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]">
                    <CarpetaIcono tipo={carpeta.tipo} tamano={52} documentos={docs} avance={null} />
                </div>
                <h3 className="line-clamp-2 font-serif text-[21px] font-normal leading-[1.15] tracking-[-0.015em] text-[#1c1a17]">
                    {nombreCarpeta(carpeta)}
                </h3>
                <p className="mt-1.5 text-[11.5px] text-[#71695e]">{datos.join(' · ')}</p>
                {carpeta.objetivo ? (
                    <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-[#5f584e]">
                        <span className="font-semibold text-[#816434]">Objetivo: </span>
                        {carpeta.objetivo}
                    </p>
                ) : (
                    <p className="mt-3 text-[12.5px] italic leading-relaxed text-[#9a9184]">
                        Sin objetivo todavía: escríbalo y Iurexia medirá qué le falta.
                    </p>
                )}

                <div className="mt-auto pt-5">
                    {avance !== null ? (
                        <div className="h-1 overflow-hidden rounded-full bg-[#ece6da]" aria-label={`${avance}% de avance`}>
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-accent-brown to-accent-gold"
                                style={{ width: `${Math.max(3, Math.min(100, avance))}%` }}
                            />
                        </div>
                    ) : (
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#a3988a]">Sin analizar</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#ece6da] pt-3 text-[11px] text-[#8a8173]">
                        <span>Actualizada {haceCuanto(carpeta.updated_at)}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-charcoal-900">
                            Abrir
                            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    )
}

/** El último lugar de la cuadrícula: abrir una carpeta nueva. */
export function TarjetaNueva({ onCrear }: { onCrear: () => void }) {
    return (
        <button
            type="button"
            onClick={onCrear}
            className="group flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#c9bda6] bg-white/40 px-6 text-center transition hover:border-accent-brown hover:bg-white/70">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-charcoal-900 text-white shadow-lg transition-transform group-hover:scale-105">
                <Plus className="h-5 w-5" />
            </span>
            <span className="mt-4 font-serif text-[21px] text-charcoal-900">Nueva carpeta</span>
            <span className="mt-1.5 max-w-[15rem] text-[12px] leading-relaxed text-[#71695e]">
                Un cliente, un juicio, un proyecto académico o un documento que esté redactando.
            </span>
        </button>
    )
}
