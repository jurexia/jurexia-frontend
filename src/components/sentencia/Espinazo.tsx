'use client';

import React from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from './primitivas';

/* ═══════════════════════════════════════════════════════════════════════════
   EL ESPINAZO: CUATRO BOTONES
   ═══════════════════════════════════════════════════════════════════════════
   David (15-sep-2026): «es un cuadro muy complejo; podemos reducirlo a botones
   y entonces sí desplegar». El raíl izquierdo tenía la ficha de diez campos,
   los dos soltadores, la plantilla y el guardado, todos abiertos a la vez y
   desde el primer minuto. Ahora el raíl es el recorrido: cuatro botones, uno
   activo, los hechos en verde y los que aún no tocan cerrados. Lo demás queda
   plegado detrás.

   Un paso a la vez. Lo hecho se puede reabrir para LEER —el botón lleva a la
   tarjeta—, no para deshacer: el estado de la página no cambia por pulsar
   aquí. */

export type PasoDelEspinazo = 1 | 2 | 3 | 4;

const PASOS: { n: PasoDelEspinazo; titulo: string; sub: string }[] = [
    { n: 1, titulo: 'Subir el auto', sub: 'Un documento, tres datos' },
    { n: 2, titulo: 'Adelanto', sub: 'Ficha, ratio, problemas' },
    { n: 3, titulo: 'Decidir', sub: 'Aceptar o corregir' },
    { n: 4, titulo: 'Proyecto', sub: 'Word listo para revisar' },
];

type Estado = 'activo' | 'hecho' | 'listo' | 'cerrado';

export default function Espinazo({
    activo, hechos, abiertos, corriendo, onIr, nota,
}: {
    /** El paso en el que está el secretario. */
    activo: PasoDelEspinazo;
    /** Los que ya se hicieron (se pueden reabrir para leer). */
    hechos: PasoDelEspinazo[];
    /** Los que se pueden pulsar aunque no estén hechos. */
    abiertos?: PasoDelEspinazo[];
    corriendo?: boolean;
    onIr: (n: PasoDelEspinazo) => void;
    nota?: React.ReactNode;
}) {
    const estadoDe = (n: PasoDelEspinazo): Estado =>
        n === activo ? 'activo'
            : hechos.includes(n) ? 'hecho'
                : abiertos?.includes(n) ? 'listo' : 'cerrado';
    return (
        <nav aria-label="Pasos del taller" className="flex flex-col gap-2">
            {PASOS.map((p) => {
                const e = estadoDe(p.n);
                const cerrado = e === 'cerrado';
                return (
                    <button key={p.n} type="button"
                            onClick={() => !cerrado && onIr(p.n)}
                            disabled={cerrado}
                            aria-current={e === 'activo' ? 'step' : undefined}
                            className={cn(
                                'group grid w-full grid-cols-[30px_1fr_auto] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left',
                                'transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60',
                                e === 'activo'
                                    ? 'border-accent-gold/50 bg-gradient-to-b from-accent-gold/10 to-accent-gold/[0.03] '
                                      + 'shadow-[0_0_0_1px_rgba(201,169,98,0.18),0_18px_40px_-26px_rgba(201,169,98,0.6)]'
                                    : cerrado
                                        ? 'cursor-not-allowed border-white/[0.07] bg-white/[0.02] opacity-50'
                                        : 'border-white/[0.07] bg-white/[0.035] hover:translate-x-0.5 hover:border-white/15 hover:bg-white/[0.06]',
                            )}>
                        <span className={cn(
                            'flex h-[30px] w-[30px] items-center justify-center rounded-full border text-[12px] font-semibold tabular-nums',
                            'transition-colors',
                            e === 'activo' ? 'border-accent-gold bg-accent-gold text-charcoal-900'
                                : e === 'hecho' ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300'
                                    : 'border-white/15 text-white/60')}>
                            {e === 'hecho' ? <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                : cerrado ? <Lock className="h-3 w-3" /> : p.n}
                        </span>
                        <span className="min-w-0">
                            <span className={cn('block text-[14px] font-medium',
                                e === 'activo' ? 'text-white' : 'text-white/90')}>
                                {p.titulo}
                            </span>
                            <span className="block text-[12px] text-white/45">{p.sub}</span>
                        </span>
                        <span className={cn('text-[10px] uppercase tracking-[0.08em]',
                            e === 'activo' ? 'text-accent-gold' : e === 'hecho' ? 'text-emerald-300' : 'text-white/45')}>
                            {e === 'activo' ? (corriendo ? 'en curso' : 'ahora')
                                : e === 'hecho' ? 'hecho' : e === 'listo' ? 'listo' : '—'}
                        </span>
                    </button>
                );
            })}
            {nota && (
                <div className="mt-1 rounded-xl border border-dashed border-white/10 px-3.5 py-3 text-[12px] leading-relaxed text-white/45">
                    {nota}
                </div>
            )}
        </nav>
    );
}
