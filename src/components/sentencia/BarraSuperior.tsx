'use client';

/**
 * Barra superior del taller. Mínima a propósito: identidad, el asunto en curso,
 * el estado del motor y la salida. Nada que compita con el trabajo.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Circle, FileText } from 'lucide-react';
import { Wordmark, cn } from './primitivas';
import type { Asunto } from './tipos';
import type { BolsaProyectos } from './api';

const ETIQUETA_TIPO: Record<Asunto['tipo'], string> = {
    amparo_directo: 'Amparo directo',
    amparo_revision: 'Amparo en revisión',
    queja: 'Queja',
    reclamacion: 'Reclamación',
    revision_fiscal: 'Revisión fiscal',
    inconformidad: 'Inconformidad',
    impedimento: 'Impedimento',
    conflicto_competencial: 'Conflicto competencial',
};

export default function BarraSuperior({
    asunto, conectado = true, onCambiarAsunto, proyectos,
}: {
    asunto?: Asunto; conectado?: boolean; onCambiarAsunto?: () => void;
    /** La bolsa de proyectos del usuario, tal como la devuelve /taller/estado. */
    proyectos?: BolsaProyectos;
}) {
    return (
        <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-charcoal-900/70 backdrop-blur-xl">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
                <Link
                    href="/chat"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/75"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Chat</span>
                </Link>

                <span className="h-4 w-px bg-white/[0.09]" />

                <Wordmark className="text-[16px] text-white/90" />
                <span className="hidden text-[12px] uppercase tracking-[0.14em] text-white/45 sm:inline">
                    Taller de sentencias
                </span>

                {/* Selector del asunto en curso */}
                {asunto && (
                    <button
                        onClick={onCambiarAsunto}
                        className="ml-2 inline-flex h-8 min-w-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 transition-colors hover:border-accent-gold/30"
                    >
                        <span className="truncate text-[13px] font-medium text-white/90">
                            {asunto.numero}
                        </span>
                        <span className="hidden shrink-0 text-[12px] text-white/45 md:inline">
                            {ETIQUETA_TIPO[asunto.tipo]}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/45" />
                    </button>
                )}

                <div className="ml-auto flex items-center gap-3">
                    {/* ═══ EL CONTADOR, ARRIBA Y VISIBLE ═══
                        David, 13-sep-2026: «el contador debe ir en la parte superior
                        del redactor muy visible para que el usuario sepa cuánto ha
                        consumido de su plan».

                        Antes sólo se enteraba al quedarse sin nada, con un error. Un
                        plan que se consume a ciegas es un plan que genera reclamaciones:
                        nadie acepta que se le acabe algo que nunca vio bajar.

                        SE PINTA POR TRAMOS, no con un número suelto: en oro mientras va
                        holgado, en ámbar cuando quedan tres o menos —que es cuando toca
                        decidir si recargar— y en rojo cuando no queda ninguno. Y la
                        prueba de las cuentas gratuitas se nombra como lo que es: una
                        prueba, no una cuota. */}
                    {proyectos && !proyectos.sin_limite && (
                        <Link
                            href="/precios?plan=ultra_secretarios"
                            title={proyectos.mes_limite > 0
                                ? `${proyectos.mes_usados} de ${proyectos.mes_limite} proyectos usados este mes`
                                + (proyectos.recargados ? ` · ${proyectos.recargados} recargados que no caducan` : '')
                                : 'Tu prueba gratuita'}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                                'text-[12px] font-medium tabular-nums transition-colors',
                                proyectos.restantes <= 0
                                    ? 'border-red-400/40 bg-red-400/10 text-red-200 hover:bg-red-400/15'
                                    : proyectos.restantes <= 3
                                        ? 'border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15'
                                        : 'border-accent-gold/30 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/15',
                            )}
                        >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            {proyectos.mes_limite > 0 ? (
                                <>
                                    <span>{proyectos.restantes}</span>
                                    <span className="hidden font-normal opacity-70 sm:inline">
                                        {proyectos.restantes === 1 ? 'proyecto' : 'proyectos'}
                                    </span>
                                </>
                            ) : (
                                <span>
                                    {proyectos.restantes > 0 ? 'Prueba gratis' : 'Prueba usada'}
                                </span>
                            )}
                        </Link>
                    )}
                    <span className="hidden items-center gap-1.5 text-[12px] text-white/45 sm:flex">
                        <Circle className={cn(
                            'h-2 w-2 fill-current',
                            conectado ? 'text-emerald-400' : 'text-red-400',
                        )} />
                        {conectado ? 'Motor listo' : 'Sin conexión'}
                    </span>
                    <Link
                        href="/perfil"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-semibold text-white/60 transition-colors hover:border-accent-gold/35 hover:text-white/90"
                        aria-label="Perfil"
                    >
                        {(asunto?.secretario?.[0] ?? 'S').toUpperCase()}
                    </Link>
                </div>
            </div>
        </header>
    );
}
