/**
 * LOS CAMBIOS PROPUESTOS que viven en la hoja hasta que el abogado los acepta
 * o los rechaza («Cambiar redacción», 16-oct-2026).
 *
 * El contrato, para que el menú, el exportador y los paneles hablen igual:
 * cada propuesta pendiente es UN elemento con el atributo `data-cambio`
 * (su identificador), que contiene el texto original marcado como
 * eliminado y el propuesto como añadido. Mientras exista alguno, el
 * documento no está listo: no se descarga, no se imprime ni se envía.
 */

export const ATRIBUTO_CAMBIO = 'data-cambio';

export function cambiosPendientes(raiz: HTMLElement | null | undefined): number {
    return raiz ? raiz.querySelectorAll(`[${ATRIBUTO_CAMBIO}]`).length : 0;
}

export function avisoCambiosPendientes(n: number): string {
    return n === 1
        ? 'Hay un cambio de redacción sin resolver: acéptalo o recházalo antes de continuar.'
        : `Hay ${n} cambios de redacción sin resolver: acéptalos o recházalos antes de continuar.`;
}
