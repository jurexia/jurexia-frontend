'use client';

/* ═══ «ESCRITO» O «CONSULTA», ANTES DE ENVIAR (28-sep-2026) ═══════════════
   Vive al final de la fila de «Fuentes» y «Esfuerzo», bajo el botón de
   enviar: dice qué va a hacer ese botón con lo escrito. Un clic la cambia, y
   lo elegido es lo que ocurre. Ver `@/lib/intencion`. */

import { ArrowLeftRight, MessageSquare, PenLine } from 'lucide-react';
import type { Intencion } from '@/lib/intencion';

interface Props {
    intencion: Intencion;
    /** El abogado la cambió: se marca con un punto. */
    elegida: boolean;
    /** La lectura del texto actual viene en camino: se atenúa. */
    pendiente: boolean;
    onAlternar: () => void;
    disabled?: boolean;
}

export default function EtiquetaIntencion({ intencion, elegida, pendiente, onAlternar, disabled = false }: Props) {
    const escrito = intencion === 'redactar';
    const Icono = escrito ? PenLine : MessageSquare;
    const quien = elegida ? ' Lo eligió usted.' : '';
    const titulo = escrito
        ? `Se redactará como escrito, con el Esfuerzo elegido.${quien} Pulse para contestarlo como consulta.`
        : `Se contestará como consulta.${quien} Pulse para redactarlo como escrito.`;

    return (
        <button
            type="button"
            data-guide="intencion"
            data-intencion={intencion}
            data-elegida={elegida ? '1' : undefined}
            onClick={onAlternar}
            disabled={disabled}
            title={titulo}
            aria-label={titulo}
            className={`etiqueta-intencion flex h-7 flex-shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition duration-200 disabled:opacity-50
                ${escrito
                    ? 'border-accent-gold/60 bg-accent-gold/10 text-charcoal-900 hover:border-accent-gold'
                    : 'border-charcoal-900/15 bg-white text-charcoal-700 hover:border-charcoal-900/30 hover:text-charcoal-900'}
                ${pendiente ? 'opacity-60' : ''}`}
        >
            <Icono className={`h-3.5 w-3.5 flex-shrink-0 ${escrito ? 'text-accent-brown' : 'text-gray-500'}`} />
            <span className="palabra-intencion">{escrito ? 'Escrito' : 'Consulta'}</span>
            {elegida && <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-charcoal-900" />}
            <ArrowLeftRight aria-hidden="true" className="flechas-intencion h-3 w-3 flex-shrink-0 text-gray-400" />
        </button>
    );
}
