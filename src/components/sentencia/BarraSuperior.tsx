'use client';

/**
 * Barra superior del taller. Mínima a propósito: identidad, el asunto en curso,
 * el estado del motor y la salida. Nada que compita con el trabajo.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Circle } from 'lucide-react';
import { Wordmark, cn } from './primitivas';
import type { Asunto } from './tipos';

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
    asunto, conectado = true, onCambiarAsunto,
}: { asunto?: Asunto; conectado?: boolean; onCambiarAsunto?: () => void }) {
    return (
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-charcoal-900/70 backdrop-blur-xl">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
                <Link
                    href="/chat"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Chat</span>
                </Link>

                <span className="h-4 w-px bg-white/[0.09]" />

                <Wordmark className="text-[15px] text-white/90" />
                <span className="hidden text-[11px] uppercase tracking-[0.14em] text-white/30 sm:inline">
                    Taller de sentencias
                </span>

                {/* Selector del asunto en curso */}
                {asunto && (
                    <button
                        onClick={onCambiarAsunto}
                        className="ml-2 inline-flex h-8 min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 transition-colors hover:border-accent-gold/30"
                    >
                        <span className="truncate text-[12px] font-medium text-white/85">
                            {asunto.numero}
                        </span>
                        <span className="hidden shrink-0 text-[11px] text-white/35 md:inline">
                            {ETIQUETA_TIPO[asunto.tipo]}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/30" />
                    </button>
                )}

                <div className="ml-auto flex items-center gap-3">
                    <span className="hidden items-center gap-1.5 text-[11px] text-white/35 sm:flex">
                        <Circle className={cn(
                            'h-2 w-2 fill-current',
                            conectado ? 'text-emerald-400' : 'text-red-400',
                        )} />
                        {conectado ? 'Motor listo' : 'Sin conexión'}
                    </span>
                    <Link
                        href="/perfil"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[11px] font-semibold text-white/60 transition-colors hover:border-accent-gold/35 hover:text-white/90"
                        aria-label="Perfil"
                    >
                        {(asunto?.secretario?.[0] ?? 'S').toUpperCase()}
                    </Link>
                </div>
            </div>
        </header>
    );
}
