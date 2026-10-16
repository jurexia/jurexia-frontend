'use client';

import type { RefObject } from 'react';

/**
 * «CAMBIAR REDACCIÓN» SOBRE LA SELECCIÓN (16-oct-2026).
 *
 * Punto de montaje dentro de `Hoja`. La implementación vive en la rama
 * `redaccion-seleccion`; hasta entonces no pinta nada.
 */
export interface MenuRedaccionProps {
    /** El nodo editable de la hoja (el `contentEditable`). */
    hoja: RefObject<HTMLDivElement | null>;
    /** Avisa a la hoja de que su contenido cambió (guardado con espera). */
    onCambio: () => void;
}

export function MenuRedaccion(_props: MenuRedaccionProps) {
    return null;
}
