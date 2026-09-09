/**
 * La advertencia que el panel de evaluación puso como CONDICIÓN de lanzamiento.
 *
 * No es un aviso legal ni una casilla que se acepta una vez: va encima del
 * documento, cada vez, con los números de ESTE borrador. La medición sobre tres
 * expedientes reales dejó claro qué hay que mirar y por qué:
 *
 *   PARTES   — antes de los arreglos, el estudio atribuyó al quejoso una
 *              aportación de la tercera interesada. Un texto que confunde a las
 *              partes se lee bien y está mal en lo único que no puede estar mal.
 *   CITAS    — el cotejo contra el Semanario todavía no corre dentro del flujo.
 *   CONCEPTOS— que estén contestados todos, no la mayoría.
 *   EXTENSIÓN— la máquina escribe entre 25% y 60% más que el secretario, y ese
 *              excedente es repetición, no contenido.
 */
'use client';

import React from 'react';
import { AlertTriangle, FileWarning, Users, BookMarked, ListChecks } from 'lucide-react';
import { Tarjeta, cn } from './primitivas';

export interface DatosBorrador {
    palabras: number;
    avisos: number;
    huecos: number;
    tieneAdvertencias: boolean;
    conceptos?: number;
    /** El texto de cada aviso, no sólo cuántos son. */
    textoAvisos?: string[];
    textoHuecos?: string[];
}

const PUNTOS = [
    { icono: Users, titulo: 'Partes',
      texto: 'Compruebe quién es quién en cada hecho probatorio. El sistema puede atribuir una prueba a la parte equivocada.' },
    { icono: BookMarked, titulo: 'Citas',
      texto: 'Verifique que cada criterio exista, diga lo que aquí se le atribuye y tenga la obligatoriedad que se le asigna.' },
    { icono: ListChecks, titulo: 'Exhaustividad',
      texto: 'Confirme que están contestados todos los conceptos de violación planteados.' },
    { icono: FileWarning, titulo: 'Extensión',
      texto: 'Este borrador tiende a repetir la misma razón. Pode antes de firmar.' },
];

export default function AvisoBorrador({ datos, className }: {
    datos: DatosBorrador; className?: string;
}) {
    return (
        <Tarjeta
            padding="p-5"
            className={cn('border-amber-400/30 bg-amber-400/[0.06]', className)}
        >
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-amber-100">
                        Borrador. No es un proyecto firmable.
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/60">
                        {datos.palabras.toLocaleString('es-MX')} palabras
                        {datos.avisos > 0 && <> · <span className="text-amber-200">{datos.avisos} avisos</span></>}
                        {datos.huecos > 0 && <> · {datos.huecos} huecos de su criterio</>}
                        {datos.tieneAdvertencias && (
                            <> · <span className="text-amber-200">
                                el sistema encontró un obstáculo al sentido que usted fijó
                            </span></>
                        )}
                    </p>

                    {/* QUÉ DICEN LOS AVISOS, no cuántos son.
                        Se contaban y se tiraban los textos, y entre ellos venía
                        el único que de verdad importa: «El criterio pedía X y
                        esa calificación no aparece en el estudio». El
                        secretario veía «3 avisos» y un recuadro genérico, sin
                        forma de saber que el sistema no le había hecho caso. */}
                    {(datos.textoAvisos?.length ?? 0) > 0 && (
                        <ul className="mt-3 space-y-1.5 border-t border-amber-400/20 pt-3">
                            {(datos.textoAvisos ?? []).map((a, i) => (
                                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-amber-100/90">
                                    <span className="shrink-0 text-amber-300/70">·</span>
                                    <span>{a}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {(datos.textoHuecos?.length ?? 0) > 0 && (
                        <ul className="mt-2 space-y-1.5">
                            {(datos.textoHuecos ?? []).map((h, i) => (
                                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-white/55">
                                    <span className="shrink-0 text-white/30">·</span>
                                    <span>{h}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                        {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
                            <li key={titulo} className="flex gap-2.5">
                                <Icono className="mt-0.5 h-4 w-4 shrink-0 text-white/35" aria-hidden />
                                <div>
                                    <p className="text-[13px] font-medium text-white/85">{titulo}</p>
                                    <p className="text-[12px] leading-snug text-white/50">{texto}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-4 border-t border-white/[0.08] pt-3 text-[12px] text-white/45">
                        Usted firma. El sistema no responde por el contenido.
                    </p>
                </div>
            </div>
        </Tarjeta>
    );
}

/** La banda del piloto: cuántas plazas quedan y qué pasa cuando se acaben. */
export function AvisoPiloto({ secretarios, cupo }: { secretarios: number; cupo: number }) {
    const quedan = Math.max(0, cupo - secretarios);
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5
                        text-[12px] text-white/55">
            <span className="font-medium text-white/75">Piloto Platinum</span>
            {' · '}
            {quedan > 0
                ? <>quedan {quedan} de {cupo} plazas. Al completarse, el taller pasa al plan Ultra.</>
                : <>cupo completo. Quienes ya entraron conservan el acceso.</>}
        </div>
    );
}
