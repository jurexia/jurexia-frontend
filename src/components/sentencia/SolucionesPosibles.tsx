'use client';

import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from './primitivas';
import type { SolucionPosible } from './tipos';

/** TODAS LAS SOLUCIONES QUE CABEN (rediseño del taller, etapa 3).
 *
 *  La tarjeta tiene dos columnas —la vía propuesta y la contraria—, pero en un
 *  amparo directo «conceder» no es una sola solución: reponer el procedimiento,
 *  conceder para efectos o conceder liso y llano son tres, y cada una la
 *  argumentó otra persona, ciega a las demás. Aquí se ven todas, con lo que la
 *  revisión por código encontró en cada una y la falla que vio el juez. No se
 *  elige nada aquí: el sentido lo decide el secretario con las columnas.
 *
 *  Sólo se pinta si el servidor manda la lista (bandera encendida). */

const EFECTO: Record<string, string> = {
    niega: 'niega',
    para_efectos: 'concede para efectos',
    reposicion: 'concede para reponer el procedimiento',
    liso_y_llano: 'concede liso y llano',
    confirma: 'confirma',
    revoca: 'revoca',
    revoca_sobresee: 'revoca y sobresee',
    repone: 'revoca y repone el procedimiento',
    modifica_efectos: 'modifica los efectos',
    prospera: 'prospera',
    no_prospera: 'no prospera',
};

const ESTADO: Record<string, { texto: string; clase: string }> = {
    completa: { texto: 'completa', clase: 'text-emerald-300/85' },
    con_pendientes: { texto: 'con pendientes', clase: 'text-amber-200/85' },
    incompleta: { texto: 'incompleta', clase: 'text-red-300/85' },
    sin_revisar: { texto: 'sin revisar', clase: 'text-white/45' },
};

function Solucion({ s, onResolver }: { s: SolucionPosible; onResolver?: (s: SolucionPosible) => void }) {
    const est = ESTADO[s.revision?.estado] ?? ESTADO.sin_revisar;
    return (
        <li className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
                <span className={cn('font-medium', s.prospera ? 'text-accent-gold' : 'text-white/80')}>
                    {EFECTO[s.tipo_efecto] ?? (s.prospera ? 'prospera' : 'no prospera')}
                </span>
                {s.papel && (
                    <span className="text-white/45">
                        · {s.papel === 'propuesta' ? 'la columna propuesta' : 'la columna contraria'}
                    </span>
                )}
                <span className={cn('ml-auto', est.clase)}>{est.texto}</span>
            </div>
            {s.resumen && <p className="mt-1 text-[13px] leading-relaxed text-white/75">{s.resumen}</p>}
            {!s.sostenible && (
                <p className="mt-1 text-[12px] text-white/55">Quien la argumentó dice que no se sostiene con lo que hay.</p>
            )}
            {s.falla?.que && (
                <p className={cn('mt-1 flex gap-1.5 text-[12px] leading-relaxed',
                    s.falla.fatal ? 'text-red-200/85' : 'text-white/60')}>
                    {s.falla.fatal && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <span>
                        <span className="text-white/45">{s.falla.fatal ? 'Falla fatal: ' : 'Su punto débil: '}</span>
                        {s.falla.que}
                    </span>
                </p>
            )}
            {s.revision?.avisos?.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-relaxed text-white/55">
                    {s.revision.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
            )}
            {/* Las dos columnas ya tienen sus botones; aquí sólo las demás. */}
            {onResolver && !s.papel && s.sentido && s.razon && (
                <button type="button" onClick={() => onResolver(s)} data-resolver-solucion={s.id}
                    className="mt-2 rounded-lg border border-accent-gold/40 px-2.5 py-1 text-[12px] text-accent-gold/90 hover:border-accent-gold hover:text-accent-gold">
                    Resolver con esta solución
                </button>
            )}
        </li>
    );
}

export function SolucionesPosibles({ soluciones, onResolver }: {
    soluciones?: SolucionPosible[];
    /** Elegir una solución que no está en las columnas: viaja como la vía
     *  contraria —su sentido y SU razón—, y la decisión sigue siendo suya. */
    onResolver?: (s: SolucionPosible) => void;
}) {
    if (!soluciones || soluciones.length === 0) return null;
    return (
        <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-accent-gold/80 hover:text-accent-gold">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                Las soluciones que caben ({soluciones.length})
            </summary>
            <ul className="mt-2 space-y-2">
                {soluciones.map(s => <Solucion key={s.id} s={s} onResolver={onResolver} />)}
            </ul>
        </details>
    );
}
