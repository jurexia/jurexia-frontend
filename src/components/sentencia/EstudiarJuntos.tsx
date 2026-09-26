'use client';

import React, { useState } from 'react';
import { cn } from './primitivas';

/* ═══ ESTUDIAR JUNTOS: EL GRUPO DEL SECRETARIO, EN LOS TRES MODOS ═══

   David: «darle la posibilidad al secretario de englobarlo con otro (por su
   estrecha relación) para que, en una sola línea argumentativa, se resuelvan
   dos o más problemas jurídicos vinculados».

   POR QUÉ ESTÁ EN SU PROPIO ARCHIVO (26-sep-2026). Vivía dentro de
   `SolucionDelAsunto`, que sólo pintaba `VentanaCriterio`, y ésta dejó de
   montarse el 14-sep-2026 («la decisión en una frase y dos botones»). Desde
   entonces el botón no tenía puerta: `page.tsx` guardaba `grupos` y los
   mandaba al servidor, pero nada en pantalla los fijaba. Un camino sin
   puerta no existe. Ahora lo monta `Decision.tsx` fuera del condicional de
   modo —en «todo el asunto» y en «problema por problema»—, y el plan del
   estudio lo obedece: «el grupo del secretario manda» (w2_final §3.7, V0 e):
   el apartado es uno, las respuestas se separan por consideración y el panel
   lo avisa. */

const LETRAS = 'ABCDEFGH';

export default function EstudiarJuntos({ problemas, grupos, onGrupos }: {
    problemas: { id: string; pregunta: string; jerarquia?: string }[];
    /** id del problema → letra del grupo con el que se estudia. */
    grupos: Record<string, string>;
    onGrupos: (g: Record<string, string>) => void;
}) {
    const [marcados, setMarcados] = useState<string[]>([]);
    const siguienteLetra = () => {
        const usadas = new Set(Object.values(grupos));
        return LETRAS.split('').find((l) => !usadas.has(l)) || 'A';
    };
    const agrupar = () => {
        if (marcados.length < 2) return;
        const l = siguienteLetra();
        const g = { ...grupos };
        marcados.forEach((id) => { g[id] = l; });
        onGrupos(g);
        setMarcados([]);
    };
    const separar = (letra: string) => {
        const g = { ...grupos };
        Object.keys(g).forEach((k) => { if (g[k] === letra) delete g[k]; });
        onGrupos(g);
    };
    return (
        <div>
            <div className="space-y-1.5">
                {problemas.map((p, i) => {
                    const g = grupos[p.id];
                    const sel = marcados.includes(p.id);
                    return (
                        <div key={p.id}
                             className={cn('flex items-start gap-2 rounded-xl border px-2.5 py-2 transition-colors',
                                 g ? 'border-accent-gold/30 bg-accent-gold/[0.05]'
                                   : sel ? 'border-white/20 bg-white/[0.05]'
                                         : 'border-white/[0.07] bg-white/[0.02]')}>
                            {/* Un problema ya agrupado no se vuelve a marcar: se
                                separa su grupo y se arma otro. Dos letras para un
                                mismo problema serían dos órdenes distintas. */}
                            <button type="button" disabled={!!g}
                                    onClick={() => setMarcados((m) =>
                                        m.includes(p.id) ? m.filter((x) => x !== p.id) : [...m, p.id])}
                                    aria-pressed={sel}
                                    aria-label={`Marcar el problema ${i + 1}`}
                                    className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-lg border text-[10px]',
                                        sel ? 'border-accent-gold bg-accent-gold/30 text-white'
                                            : 'border-white/20 text-transparent',
                                        g && 'cursor-not-allowed opacity-40')}>✓</button>
                            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/75">
                                <span className="text-white/45">{i + 1}. </span>
                                {p.pregunta}
                            </p>
                            {p.jerarquia === 'principal' && (
                                <span className="mt-0.5 shrink-0 rounded-lg bg-white/[0.08] px-1.5 py-0.5 text-[10px] uppercase text-white/60">
                                    principal
                                </span>
                            )}
                            {g && (
                                <button type="button" onClick={() => separar(g)}
                                        className="mt-0.5 shrink-0 rounded-lg bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-gold/90"
                                        title="Separar este grupo">
                                    juntos · {g} ✕
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            {marcados.length >= 2 && (
                <button type="button" onClick={agrupar}
                        className="mt-2.5 rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 text-[12px] font-medium text-accent-gold/90 transition-colors hover:bg-accent-gold/20">
                    Estudiar juntos los {marcados.length} marcados
                </button>
            )}
            {marcados.length === 1 && (
                <p className="mt-2 text-[12px] text-white/45">Marca al menos otro para estudiarlos juntos.</p>
            )}
        </div>
    );
}
