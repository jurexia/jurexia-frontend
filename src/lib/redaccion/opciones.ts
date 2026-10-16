/**
 * LO QUE COMPARTEN EL MENÚ Y LA RUTA DE «CAMBIAR REDACCIÓN» (16-oct-2026): las
 * acciones, las opciones rápidas con su rótulo y los límites de tamaño.
 *
 * Los prompts NO viven aquí: este archivo llega al navegador, y cómo se le pide
 * el trabajo al modelo es de la casa (ver `prompts.ts`, que sólo importa la
 * ruta).
 */

export type AccionRedaccion = 'reescribir' | 'explicar';

export const OPCIONES_REDACCION = ['aclarar', 'acortar', 'formal', 'ortografia'] as const;
export type OpcionRedaccion = (typeof OPCIONES_REDACCION)[number];

export function esOpcion(valor: unknown): valor is OpcionRedaccion {
    return typeof valor === 'string' && (OPCIONES_REDACCION as readonly string[]).indexOf(valor) !== -1;
}

/** Cómo se llama cada opción en el menú y en la barra del cambio. */
export const ROTULO_OPCION: Record<OpcionRedaccion, string> = {
    aclarar: 'Aclarar',
    acortar: 'Acortar',
    formal: 'Más formal',
    ortografia: 'Ortografía y gramática',
};

/**
 * LOS TAMAÑOS. El texto va de 3 a 6,000 caracteres (con los marcadores): menos
 * no es una frase; más son varias páginas, que ya no se revisan de un vistazo
 * como un cambio marcado y que un modelo ligero reescribe peor. El contexto de
 * alrededor viaja recortado —700 caracteres antes y 350 después, como en «Mejora
 * mi mano» de SwitchMyAI—: lo justo para que el reemplazo encaje.
 */
export const LIMITES_REDACCION = {
    textoMin: 3,
    textoMax: 6000,
    instruccionMax: 500,
    contextoAntes: 700,
    contextoDespues: 350,
    anteriorMax: 9000,
} as const;
