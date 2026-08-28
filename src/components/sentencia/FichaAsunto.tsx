'use client';

/**
 * La ficha del asunto y el cómputo de la oportunidad.
 *
 * Todo lo que hay aquí es DETERMINISTA: sale de los documentos y del calendario
 * de días hábiles, no de un modelo. Por eso la oportunidad se muestra con sus
 * dos fechas y su plazo a la vista — un plazo mal contado invalida la sentencia,
 * y el secretario tiene derecho a verificarlo de un golpe de vista.
 */

import React from 'react';
import { CalendarDays, CheckCircle2, XCircle, Hash } from 'lucide-react';
import { Tarjeta, Pastilla, Rotulo } from './primitivas';
import type { Asunto } from './tipos';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wider text-white/30">{etiqueta}</dt>
            <dd className="mt-0.5 truncate text-[12.5px] text-white/80" title={typeof valor === 'string' ? valor : undefined}>
                {valor || <span className="text-white/25">—</span>}
            </dd>
        </div>
    );
}

export default function FichaAsunto({ asunto }: { asunto: Asunto }) {
    const o = asunto.oportunidad;
    return (
        <Tarjeta>
            <Rotulo accion={<Pastilla tono="neutro" icono={Hash}>{asunto.numero}</Pastilla>}>
                Ficha del asunto
            </Rotulo>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <Dato etiqueta="Quejoso" valor={asunto.quejoso} />
                <Dato etiqueta="Magistrado" valor={asunto.magistrado} />
                <Dato etiqueta="Secretario" valor={asunto.secretario} />
                <Dato
                    etiqueta="Autoridades responsables"
                    valor={asunto.autoridades.length > 1
                        ? `${asunto.autoridades[0]} +${asunto.autoridades.length - 1}`
                        : asunto.autoridades[0]}
                />
            </dl>

            <div className="mt-4 rounded-2xl border-l-2 border-white/15 bg-black/20 py-3 pl-3.5 pr-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Acto reclamado</p>
                <p className="text-[12px] leading-relaxed text-white/65">{asunto.actoReclamado}</p>
            </div>

            {o && (
                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/55">
                            <CalendarDays className="h-3.5 w-3.5 text-accent-gold" />
                            Oportunidad
                        </span>
                        {o.enTiempo ? (
                            <Pastilla tono="verde" icono={CheckCircle2}>en tiempo</Pastilla>
                        ) : (
                            <Pastilla tono="rojo" icono={XCircle}>extemporánea</Pastilla>
                        )}
                    </div>
                    <dl className="grid grid-cols-3 gap-3">
                        <Dato etiqueta="Notificación" valor={o.notificacion} />
                        <Dato etiqueta="Presentación" valor={o.presentacion} />
                        <Dato etiqueta="Plazo" valor={`${o.plazo} días hábiles`} />
                    </dl>
                    <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/25">
                        Contado sobre el calendario de días hábiles del PJF. Los dos
                        calendarios van a la síntesis del documento final.
                    </p>
                </div>
            )}
        </Tarjeta>
    );
}
