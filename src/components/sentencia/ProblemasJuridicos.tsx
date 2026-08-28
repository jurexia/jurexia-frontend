'use client';

/**
 * Los problemas jurídicos y lo que se encontró para resolverlos.
 *
 * Cada tarjeta enfrenta lo que resolvió la responsable con lo que lo combate —
 * que es exactamente el contraste del que David deriva los problemas— y debajo
 * ofrece las tesis y preceptos hallados por un RAG dirigido a ESE problema, no
 * al asunto entero.
 *
 * Regla dura: sólo se muestra lo verificado contra el Semanario. Una tesis sin
 * registro vivo no se le enseña al secretario ni con advertencia: enseñarla es
 * invitarlo a citarla.
 */

import React, { useState } from 'react';
import { ChevronDown, BookOpen, Landmark, Globe, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Tarjeta, Pastilla, Rotulo, cn } from './primitivas';
import type { ProblemaJuridico, Candidato } from './tipos';

const ICONO_TIPO = {
    tesis: BookOpen,
    norma: Landmark,
    convencional: Globe,
} as const;

const NOMBRE_TIPO = {
    tesis: 'Tesis',
    norma: 'Precepto',
    convencional: 'Convencional',
} as const;

function FichaCandidato({ c }: { c: Candidato }) {
    const Icono = ICONO_TIPO[c.tipo];
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 transition-colors hover:border-accent-gold/25">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Pastilla tono="oro" icono={Icono}>{NOMBRE_TIPO[c.tipo]}</Pastilla>
                {c.registro && <Pastilla tono="neutro">Registro {c.registro}</Pastilla>}
                {c.instancia && <Pastilla tono="neutro">{c.instancia}</Pastilla>}
                {c.verificado && (
                    <Pastilla tono="verde" icono={ShieldCheck}>verificada</Pastilla>
                )}
            </div>
            <p className="text-[12.5px] font-medium leading-relaxed text-white/85">{c.rubro}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
                <span className="text-white/55">Aplica porque</span> {c.porQue}
            </p>
        </div>
    );
}

export default function ProblemasJuridicos({ problemas }: { problemas: ProblemaJuridico[] }) {
    const [abierto, setAbierto] = useState<string | null>(problemas[0]?.id ?? null);

    return (
        <Tarjeta>
            <Rotulo contador={problemas.length}>Problemas jurídicos</Rotulo>
            <p className="mb-4 text-[12px] leading-relaxed text-white/40">
                Salen del contraste entre lo que resolvió la responsable y lo que se
                combate. Cada uno trae lo que se encontró para resolverlo.
            </p>

            <div className="space-y-2.5">
                {problemas.map((p, i) => {
                    const activo = abierto === p.id;
                    return (
                        <div
                            key={p.id}
                            className={cn(
                                'overflow-hidden rounded-2xl border transition-colors duration-300',
                                activo
                                    ? 'border-accent-gold/25 bg-white/[0.035]'
                                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
                            )}
                        >
                            <button
                                onClick={() => setAbierto(activo ? null : p.id)}
                                className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                            >
                                <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-accent-gold">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] leading-relaxed text-white/90">
                                        {p.pregunta}
                                    </span>
                                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <Pastilla tono="neutro">
                                            {p.candidatos.length} fuente{p.candidatos.length === 1 ? '' : 's'}
                                        </Pastilla>
                                        {p.impedimento && (
                                            <Pastilla tono="ambar" icono={AlertTriangle}>
                                                posible {p.impedimento.motivo}
                                            </Pastilla>
                                        )}
                                        {p.sentido && <Pastilla tono="verde">{p.sentido}</Pastilla>}
                                    </span>
                                </span>
                                <ChevronDown className={cn(
                                    'mt-1 h-4 w-4 shrink-0 text-white/25 transition-transform duration-300',
                                    activo && 'rotate-180',
                                )} />
                            </button>

                            {activo && (
                                <div className="space-y-4 border-t border-white/[0.06] px-4 pb-4 pt-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl border-l-2 border-white/15 bg-black/20 py-3 pl-3.5 pr-3">
                                            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">
                                                Resolvió la responsable
                                            </p>
                                            <p className="text-[12px] leading-relaxed text-white/65">{p.resolvio}</p>
                                        </div>
                                        <div className="rounded-2xl border-l-2 border-accent-gold/45 bg-black/20 py-3 pl-3.5 pr-3">
                                            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">
                                                Lo combate
                                            </p>
                                            <p className="text-[12px] leading-relaxed text-white/65">{p.combate}</p>
                                        </div>
                                    </div>

                                    {p.impedimento && (
                                        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3.5">
                                            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                Se advierte un impedimento técnico: {p.impedimento.motivo}
                                            </p>
                                            <p className="text-[11.5px] leading-relaxed text-amber-100/55">
                                                {p.impedimento.explicacion} La decisión es tuya; esto sólo lo señala.
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="mb-2.5 text-[10px] uppercase tracking-wider text-white/35">
                                            Para resolverlo
                                        </p>
                                        <div className="space-y-2">
                                            {p.candidatos.map((c, j) => <FichaCandidato key={j} c={c} />)}
                                            {p.candidatos.length === 0 && (
                                                <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[12px] text-white/40">
                                                    No se encontró jurisprudencia verificable para este punto.
                                                    Se resolverá con la ley aplicable y tu criterio.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Tarjeta>
    );
}
