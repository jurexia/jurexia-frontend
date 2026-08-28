'use client';

/**
 * La línea de fases — el mapa del asunto.
 *
 * Nueve pasos, y uno solo se detiene a esperar a una persona: el criterio. Que
 * eso se vea de un vistazo es el punto entero de este componente: el secretario
 * tiene que saber, sin leer, que el resto corre sin él.
 */

import React from 'react';
import { Check, Loader2, Pause, AlertTriangle, Circle } from 'lucide-react';
import { cn } from './primitivas';
import type { Fase, EstadoFase } from './tipos';

const ICONO: Record<EstadoFase, React.ComponentType<{ className?: string }>> = {
    pendiente: Circle,
    corriendo: Loader2,
    lista: Check,
    espera: Pause,
    error: AlertTriangle,
};

const COLOR: Record<EstadoFase, string> = {
    pendiente: 'text-white/20 border-white/[0.08] bg-white/[0.02]',
    corriendo: 'text-accent-gold border-accent-gold/40 bg-accent-gold/10',
    lista: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
    espera: 'text-amber-300 border-amber-400/45 bg-amber-400/10',
    error: 'text-red-300 border-red-400/35 bg-red-400/10',
};

export default function LineaDeFases({
    fases, onIr,
}: { fases: Fase[]; onIr?: (id: Fase['id']) => void }) {
    return (
        <ol className="flex flex-col gap-0.5">
            {fases.map((f, i) => {
                const Icono = ICONO[f.estado];
                const ultima = i === fases.length - 1;
                return (
                    <li key={f.id} className="relative flex gap-3">
                        {/* Hilo vertical entre pasos */}
                        {!ultima && (
                            <span
                                aria-hidden
                                className={cn(
                                    'absolute left-[13px] top-[30px] h-[calc(100%-22px)] w-px',
                                    f.estado === 'lista' ? 'bg-emerald-400/25' : 'bg-white/[0.07]',
                                )}
                            />
                        )}

                        <span className={cn(
                            'z-10 mt-1 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border',
                            COLOR[f.estado],
                        )}>
                            <Icono className={cn('h-3.5 w-3.5', f.estado === 'corriendo' && 'animate-spin')} />
                        </span>

                        <button
                            onClick={() => onIr?.(f.id)}
                            disabled={!onIr || f.estado === 'pendiente'}
                            className={cn(
                                'group flex-1 rounded-2xl px-3 py-2 text-left transition-colors',
                                onIr && f.estado !== 'pendiente' && 'hover:bg-white/[0.04]',
                                ultima ? 'mb-0' : 'mb-1.5',
                            )}
                        >
                            <span className="flex items-baseline justify-between gap-3">
                                <span className={cn(
                                    'text-[13px] font-medium',
                                    f.estado === 'pendiente' ? 'text-white/35' : 'text-white/90',
                                )}>
                                    {f.titulo}
                                </span>
                                {f.requiereHumano ? (
                                    <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                        te toca a ti
                                    </span>
                                ) : f.segundos !== undefined ? (
                                    <span className="shrink-0 text-[11px] tabular-nums text-white/30">
                                        {f.segundos < 60 ? `${f.segundos}s` : `${Math.round(f.segundos / 60)}m`}
                                    </span>
                                ) : null}
                            </span>
                            <span className={cn(
                                'mt-0.5 block text-[11.5px] leading-relaxed',
                                f.estado === 'pendiente' ? 'text-white/20' : 'text-white/40',
                            )}>
                                {f.detalle}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}
