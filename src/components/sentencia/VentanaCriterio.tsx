'use client';

/**
 * La ventana de criterio — el único punto donde entra el humano.
 *
 * Aquí está la idea entera del redactor: la máquina lee, contrasta y busca; el
 * secretario decide. Por eso esta pantalla no pide un botón, pide un texto.
 *
 * Y pide el PORQUÉ, no sólo el qué. David lo dijo con precisión: «si el
 * secretario pone en dos líneas sólo que se declaren infundados los conceptos
 * por x razón, tendrá menor posibilidad de éxito de que se alinee la sentencia
 * a lo que él quiere». El medidor de abajo existe para que eso se vea ANTES de
 * mandar, no después de leer un proyecto que no se parece a lo que pensaba.
 *
 * El medidor no puntúa la calidad jurídica —eso no lo puede juzgar una
 * interfaz—: mide cobertura. Cuántos problemas tienen sentido elegido y cuántos
 * tienen razón escrita. Es una lista de comprobación, no una nota.
 */

import React, { useMemo } from 'react';
import { PenLine, Lightbulb, ArrowRight } from 'lucide-react';
import { Tarjeta, Pastilla, cn } from './primitivas';
import type { ProblemaJuridico } from './tipos';

const SENTIDOS: { id: NonNullable<ProblemaJuridico['sentido']>; etiqueta: string }[] = [
    { id: 'fundado', etiqueta: 'Fundado' },
    { id: 'infundado', etiqueta: 'Infundado' },
    { id: 'inoperante', etiqueta: 'Inoperante' },
    { id: 'ineficaz', etiqueta: 'Ineficaz' },
];

/** Palabras con las que un texto deja de ser un veredicto y pasa a ser una razón. */
const MARCAS_DE_RAZON = /\bporque\b|\bya que\b|\bpuesto que\b|\bdebido a\b|\btoda vez que\b|\ben virtud de\b|\bdado que\b|\bpues\b|\bal (?:haber|no|ser|resultar)\b/i;

export function fuerzaDelCriterio(problemas: ProblemaJuridico[]) {
    const total = problemas.length || 1;
    const conSentido = problemas.filter((p) => !!p.sentido).length;
    const conRazon = problemas.filter(
        (p) => p.criterio.trim().split(/\s+/).length >= 25 && MARCAS_DE_RAZON.test(p.criterio),
    ).length;
    // El sentido vale un tercio; la razón, dos. Decidir es la mitad del trabajo;
    // explicar por qué es la otra mitad y media.
    const pct = Math.round(((conSentido / total) * 33 + (conRazon / total) * 67));
    return { pct, conSentido, conRazon, total: problemas.length };
}

export default function VentanaCriterio({
    problemas, onCambiar, onGenerar, generando,
}: {
    problemas: ProblemaJuridico[];
    onCambiar: (id: string, campo: 'criterio' | 'sentido', valor: string) => void;
    onGenerar: () => void;
    generando?: boolean;
}) {
    const fuerza = useMemo(() => fuerzaDelCriterio(problemas), [problemas]);
    const listo = fuerza.conSentido === fuerza.total && fuerza.total > 0;

    const tono = fuerza.pct >= 70 ? 'bg-emerald-400' : fuerza.pct >= 35 ? 'bg-accent-gold' : 'bg-amber-400';
    const dictamen =
        fuerza.pct >= 70 ? 'Criterio sólido: la sentencia se va a parecer a lo que piensas.'
            : fuerza.pct >= 35 ? 'Vas bien. Añade el porqué donde falte y ganarás alineación.'
                : 'Sólo con el sentido, la redacción tendrá que suponer tus razones.';

    return (
        <Tarjeta glow className="border-amber-400/20">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white/95">
                        <PenLine className="h-4 w-4 text-amber-300" />
                        Tu criterio
                    </h2>
                    <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/45">
                        Decide el sentido de cada problema y, sobre todo,{' '}
                        <span className="text-white/75">escribe por qué</span>. El estudio se
                        construye para demostrar tu razonamiento, no para sustituirlo.
                    </p>
                </div>
                <span className="shrink-0 text-right">
                    <span className="block text-2xl font-semibold tabular-nums text-white/90">{fuerza.pct}%</span>
                    <span className="block text-[10px] uppercase tracking-wider text-white/35">criterio dado</span>
                </span>
            </div>

            {/* Medidor */}
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                    className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tono)}
                    style={{ width: `${Math.max(fuerza.pct, 2)}%` }}
                />
            </div>
            <div className="mb-5 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-white/40">{dictamen}</span>
                <span className="shrink-0 tabular-nums text-white/30">
                    {fuerza.conSentido}/{fuerza.total} con sentido · {fuerza.conRazon}/{fuerza.total} razonados
                </span>
            </div>

            {/* Un bloque por problema */}
            <div className="space-y-4">
                {problemas.map((p, i) => {
                    const razonado = p.criterio.trim().split(/\s+/).length >= 25 && MARCAS_DE_RAZON.test(p.criterio);
                    return (
                        <div key={p.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                            <p className="mb-3 text-[13px] leading-relaxed text-white/80">
                                <span className="mr-2 text-[11px] font-semibold text-accent-gold">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {p.pregunta}
                            </p>

                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {SENTIDOS.map((s) => (
                                    <Pastilla
                                        key={s.id}
                                        activa={p.sentido === s.id}
                                        onClick={() => onCambiar(p.id, 'sentido', s.id)}
                                    >
                                        {s.etiqueta}
                                    </Pastilla>
                                ))}
                                {p.impedimento && (
                                    <Pastilla tono="ambar" icono={Lightbulb}>
                                        se advierte {p.impedimento.motivo}
                                    </Pastilla>
                                )}
                            </div>

                            <textarea
                                value={p.criterio}
                                onChange={(e) => onCambiar(p.id, 'criterio', e.target.value)}
                                rows={3}
                                placeholder="Mi criterio es… porque…"
                                className={cn(
                                    'w-full resize-y rounded-xl border bg-black/20 px-3.5 py-2.5',
                                    'text-[13px] leading-relaxed text-white/90 placeholder:text-white/25',
                                    'transition-colors duration-200 outline-none',
                                    razonado
                                        ? 'border-emerald-400/25 focus:border-emerald-400/50'
                                        : 'border-white/[0.09] focus:border-accent-gold/45',
                                )}
                            />
                            {!razonado && p.criterio.trim().length > 0 && (
                                <p className="mt-1.5 text-[11px] text-amber-300/70">
                                    Falta el porqué. Una razón explícita aquí vale más que tres
                                    párrafos de instrucciones después.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                onClick={onGenerar}
                disabled={!listo || generando}
                className={cn(
                    'mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl',
                    'text-[13px] font-semibold transition-all duration-200',
                    listo && !generando
                        ? 'bg-accent-gold text-charcoal-900 hover:brightness-110 active:scale-[0.99]'
                        : 'cursor-not-allowed border border-white/[0.08] bg-white/[0.03] text-white/30',
                )}
            >
                {generando ? 'Redactando la sentencia…' : 'Generar la sentencia completa'}
                {!generando && <ArrowRight className="h-4 w-4" />}
            </button>
            {!listo && (
                <p className="mt-2 text-center text-[11px] text-white/30">
                    Falta elegir el sentido de {fuerza.total - fuerza.conSentido} problema
                    {fuerza.total - fuerza.conSentido === 1 ? '' : 's'}.
                </p>
            )}
        </Tarjeta>
    );
}
