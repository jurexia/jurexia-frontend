'use client';

import React from 'react';
import { Check, Lock, LogOut, RotateCcw } from 'lucide-react';
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

   Un paso a la vez. Y LO HECHO SE PUEDE DESHACER, desde el 22-sep-2026: el
   botón de un paso anterior vuelve a él de verdad —antes sólo hacía scroll y
   el estado no se movía, así que no había manera de corregir la ficha ni de
   volver al adelanto—. Lo que cuesta volver se lee antes de volver, en
   `ConfirmarVolver`. */

export type PasoDelEspinazo = 1 | 2 | 3 | 4;

const PASOS: { n: PasoDelEspinazo; titulo: string; sub: string }[] = [
    { n: 1, titulo: 'Subir el auto', sub: 'Un documento, tres datos' },
    { n: 2, titulo: 'Adelanto', sub: 'De qué va; la solución, en camino' },
    { n: 3, titulo: 'Decidir', sub: 'Aceptar o corregir' },
    { n: 4, titulo: 'Proyecto', sub: 'Word listo para revisar' },
];

type Estado = 'activo' | 'hecho' | 'listo' | 'cerrado';

export default function Espinazo({
    activo, hechos, abiertos, corriendo, onIr, nota, onSalir,
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
    /** Salir del asunto y volver a la ventana de entrada —el historial, con
     *  los asuntos en curso y la elección de por dónde empezar—. Sin esto no
     *  había forma de salir de un proyecto sin recargar la página. */
    onSalir?: () => void;
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
                                : e === 'hecho'
                                    /* AL PASAR EL RATÓN DICE QUÉ HACE. «Hecho» invita a leer;
                                       lo que ocurre al pulsar es volver, y eso cuesta. */
                                    ? (<>
                                        <span className="group-hover:hidden">hecho</span>
                                        <span className="hidden items-center gap-1 text-accent-gold group-hover:inline-flex">
                                            <RotateCcw className="h-3 w-3" />volver
                                        </span>
                                      </>)
                                    : e === 'listo' ? 'listo' : '—'}
                        </span>
                    </button>
                );
            })}
            {nota && (
                <div className="mt-1 rounded-xl border border-dashed border-white/10 px-3.5 py-3 text-[12px] leading-relaxed text-white/45">
                    {nota}
                </div>
            )}
            {onSalir && (
                <button type="button" onClick={onSalir}
                        className={cn('mt-1 inline-flex items-center justify-center gap-2 rounded-xl border',
                            'border-white/[0.09] px-3.5 py-2.5 text-[13px] text-white/55',
                            'transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white/85')}>
                    <LogOut className="h-3.5 w-3.5" />
                    Salir a mis asuntos
                </button>
            )}
        </nav>
    );
}
