'use client';

import React from 'react';
import { cn } from './primitivas';
import type { Fase } from './tipos';

/* ═══════════════════════════════════════════════════════════════════════════
   EL ANILLO: OCHO FASES EN UNA CIFRA
   ═══════════════════════════════════════════════════════════════════════════
   La lista vertical de ocho pasos con su icono, su título y su descripción
   ocupaba media pantalla y decía lo mismo que dice un anillo con un número
   dentro: cuánto falta. La lista sigue —a la derecha, en un renglón por fase,
   con el punto que late en la que corre— porque el secretario quiere saber
   QUÉ está pasando; pero lo primero que ve es cuánto queda. */

export default function AnilloDeFases({ fases, corriendo }: { fases: Fase[]; corriendo?: boolean }) {
    const listas = fases.filter((f) => f.estado === 'lista').length;
    const total = fases.length || 1;
    const pct = Math.round((listas / total) * 100);
    const enCurso = fases.find((f) => f.estado === 'corriendo');
    const espera = fases.find((f) => f.estado === 'espera');
    const r = 58, C = 2 * Math.PI * r;
    return (
        <div className="grid items-center gap-5 sm:grid-cols-[140px_1fr]">
            <div className="relative mx-auto h-[140px] w-[140px]" role="img"
                 aria-label={`${listas} de ${total} fases hechas`}>
                <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90" aria-hidden>
                    <defs>
                        <linearGradient id="anillo-oro" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#e3c98a" />
                            <stop offset="1" stopColor="#8e7436" />
                        </linearGradient>
                    </defs>
                    <circle cx="70" cy="70" r={r} fill="none" strokeWidth="8" className="stroke-white/10" />
                    <circle cx="70" cy="70" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
                            stroke="url(#anillo-oro)"
                            strokeDasharray={C} strokeDashoffset={C - (C * listas) / total}
                            className="transition-[stroke-dashoffset] duration-700 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{pct}%</span>
                    <span className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/45">
                        {pct === 100 ? 'listo'
                            : enCurso ? `fase ${fases.indexOf(enCurso) + 1} de ${total}`
                                : espera ? 'te toca a ti' : `${listas} de ${total}`}
                    </span>
                </div>
            </div>
            <ol className="grid gap-1.5">
                {fases.map((f) => (
                    <li key={f.id} className={cn(
                        'grid grid-cols-[14px_1fr_auto] items-center gap-2.5 text-[13px]',
                        f.estado === 'lista' ? 'text-white/75'
                            : f.estado === 'corriendo' || f.estado === 'espera' ? 'text-white' : 'text-white/45')}>
                        <span aria-hidden className={cn(
                            'ml-1 h-2 w-2 rounded-full',
                            f.estado === 'lista' ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]'
                                : f.estado === 'corriendo' ? 'bg-accent-gold animate-[latido_1.4s_ease-in-out_infinite]'
                                    : f.estado === 'espera' ? 'bg-amber-400'
                                        : f.estado === 'error' ? 'bg-red-400' : 'bg-white/15')} />
                        <span className="truncate">{f.titulo}</span>
                        <span className="text-[12px] tabular-nums text-white/45">
                            {f.requiereHumano ? 'tú'
                                : f.estado === 'lista' ? '✓'
                                    : f.estado === 'corriendo' && corriendo ? '…' : ''}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
