'use client';

import { ArrowUpRight } from 'lucide-react';

/* LA PRIMERA CONSULTA (20-oct-2026). David: «necesitamos que el registrado haga
 * su primera consulta». Medido del 17 al 20-oct: de 70 cuentas que llegaron por
 * los anuncios de Meta, 35 nunca escribieron nada. Entraban a un chat con la
 * caja vacía y sin una pista de qué preguntar.
 *
 * Tres consultas de ejemplo, sólo para la cuenta que todavía no ha consultado
 * nada: un toque y sale con el motor completo. Son preguntas de oficio que el
 * acervo contesta con ley y jurisprudencia citadas, y la de familiar estrena el
 * estado que se acaba de elegir. Desaparecen con la primera consulta.
 */
export const PRIMERAS_CONSULTAS = [
    { materia: 'Amparo', texto: '¿En qué plazo debo promover un amparo indirecto y desde cuándo empieza a correr?' },
    { materia: 'Familiar', texto: '¿Qué debo acreditar para pedir una pensión alimenticia provisional para mis hijos?' },
    { materia: 'Laboral', texto: 'Despidieron a un trabajador sin causa justificada: ¿qué indemnización le corresponde?' },
];

interface PrimeraConsultaProps {
    onElegir: (texto: string) => void;
    deshabilitado?: boolean;
}

export default function PrimeraConsulta({ onElegir, deshabilitado }: PrimeraConsultaProps) {
    return (
        <div data-primera-consulta className="mx-auto mt-4 w-full max-w-[var(--chat-max)] text-left">
            <p className="mb-2 px-1 text-[12.5px] text-charcoal-900/60">O empieza con una consulta real:</p>
            <div className="grid gap-1.5">
                {PRIMERAS_CONSULTAS.map((c) => (
                    <button
                        key={c.materia}
                        type="button"
                        disabled={deshabilitado}
                        onClick={() => onElegir(c.texto)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-charcoal-900/10 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-charcoal-900/25 hover:bg-cream-100 disabled:opacity-50"
                    >
                        <span className="w-[62px] flex-shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-charcoal-900/60">
                            {c.materia}
                        </span>
                        <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-charcoal-900/85">{c.texto}</span>
                        <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-charcoal-900/30 transition-colors group-hover:text-charcoal-900/60" aria-hidden />
                    </button>
                ))}
            </div>
        </div>
    );
}
