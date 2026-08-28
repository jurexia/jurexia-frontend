'use client';

/**
 * Primitivas visuales del taller de sentencias.
 *
 * Todo el taller se apoya en estas cuatro piezas para que el lenguaje sea uno
 * solo: tarjeta bento, pastilla, rótulo de sección y separador. Si algo hay
 * que cambiar en la dirección de arte, se cambia aquí y no en ocho sitios.
 *
 * Dirección de arte (28-ago-2026): fondo carbón muy limpio, tarjetas
 * translúcidas de esquina muy redondeada, bordes finísimos y el oro de la casa
 * dosificado — sólo para lo activo y para lo que exige decisión. Nada de
 * degradados ni de colores nuevos: la marca ya tiene paleta.
 */

import React from 'react';

export const cn = (...c: (string | false | null | undefined)[]) =>
    c.filter(Boolean).join(' ');

/* ── Tarjeta bento ─────────────────────────────────────────────────────────
   El halo (`glow`) es un resplandor ambiental muy tenue, no una sombra dura:
   separa la tarjeta del fondo sin ensuciar el borde. */
export function Tarjeta({
    children, className, glow = false, padding = 'p-5', as: Tag = 'section',
}: {
    children: React.ReactNode; className?: string; glow?: boolean;
    padding?: string; as?: React.ElementType;
}) {
    return (
        <Tag
            className={cn(
                'relative rounded-3xl border border-white/[0.07] bg-white/[0.035]',
                'backdrop-blur-xl transition-colors duration-300',
                glow && 'shadow-[0_0_60px_-20px_rgba(201,169,98,0.35)]',
                padding, className,
            )}
        >
            {children}
        </Tag>
    );
}

/* ── Pastilla ──────────────────────────────────────────────────────────────
   Un solo componente para estados, etiquetas y filtros. El tono `oro` es el
   único que llama la atención; el resto son neutros deliberadamente apagados. */
type Tono = 'neutro' | 'oro' | 'verde' | 'ambar' | 'rojo';

const TONOS: Record<Tono, string> = {
    neutro: 'border-white/10 bg-white/[0.05] text-white/60',
    oro: 'border-accent-gold/35 bg-accent-gold/10 text-accent-gold',
    verde: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    ambar: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    rojo: 'border-red-400/30 bg-red-400/10 text-red-300',
};

export function Pastilla({
    children, tono = 'neutro', icono: Icono, className, onClick, activa,
}: {
    children: React.ReactNode; tono?: Tono;
    icono?: React.ComponentType<{ className?: string }>;
    className?: string; onClick?: () => void; activa?: boolean;
}) {
    const Elemento = onClick ? 'button' : 'span';
    return (
        <Elemento
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                'text-[11px] font-medium leading-none tracking-wide',
                'transition-all duration-200',
                onClick && 'hover:scale-[1.03] active:scale-[0.98] cursor-pointer',
                activa ? TONOS.oro : TONOS[tono],
                className,
            )}
        >
            {Icono && <Icono className="h-3 w-3 shrink-0" />}
            {children}
        </Elemento>
    );
}

/* ── Rótulo de sección ─────────────────────────────────────────────────── */
export function Rotulo({
    children, contador, accion,
}: { children: React.ReactNode; contador?: number; accion?: React.ReactNode }) {
    return (
        <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {children}
                {contador !== undefined && (
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-white/50">
                        {contador}
                    </span>
                )}
            </h2>
            {accion}
        </div>
    );
}

/* ── El wordmark ───────────────────────────────────────────────────────────
   NO SE TOCA. Playfair (o Georgia como respaldo), peso 600, con las dos
   últimas letras en oro. Da igual lo que cambie alrededor: la marca se
   escribe siempre así. */
export function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('font-serif font-semibold tracking-tight', className)}>
            Iurex<span className="text-accent-gold">ia</span>
        </span>
    );
}
