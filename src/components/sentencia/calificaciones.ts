/* ═══ LAS DIEZ CALIFICACIONES Y SU LECTURA, EN UN SOLO SITIO (28-sep-2026) ═══
   Vivían dentro de Decision.tsx. La tarjeta «El problema principal y su
   solución» (ProblemaPrincipal.tsx, AR 631/2025) las necesita igual —la frase
   de cada vía, el grupo que decide si dos vías son de verdad contrarias— y no
   puede importarlas de Decision, que la monta a ella: se sacan aquí, sin
   React, y las dos las leen. Nada cambia en lo que devuelven. */

export type Grupo = 'si' | 'no' | 'sm';

/* Las calificaciones que puede escribir un proyecto, en el orden en que un
   secretario las piensa. Las cuatro de arriba prosperan; las demás no. */
export const FINAS: { id: string; etiqueta: string; grupo: Grupo }[] = [
    { id: 'fundado', etiqueta: 'Fundado', grupo: 'si' },
    { id: 'esencialmente_fundado', etiqueta: 'Esencialmente fundado', grupo: 'si' },
    { id: 'sustancialmente_fundado', etiqueta: 'Sustancialmente fundado', grupo: 'si' },
    { id: 'parcialmente_fundado', etiqueta: 'Parcialmente fundado', grupo: 'si' },
    { id: 'fundado_insuficiente', etiqueta: 'Fundado pero insuficiente', grupo: 'no' },
    { id: 'infundado', etiqueta: 'Infundado', grupo: 'no' },
    { id: 'inoperante', etiqueta: 'Inoperante', grupo: 'no' },
    { id: 'inatendible', etiqueta: 'Inatendible', grupo: 'no' },
    { id: 'ineficaz', etiqueta: 'Ineficaz', grupo: 'no' },
    { id: 'sin_materia', etiqueta: 'Sin materia', grupo: 'sm' },
];

export function grupoDe(sentido: string | undefined | null): Grupo | '' {
    const f = FINAS.find((x) => x.id === (sentido || '').toLowerCase());
    return f ? f.grupo : (sentido || '').toLowerCase() === 'innecesario' ? 'sm' : '';
}

export function legible(sentido: string | undefined | null): string {
    const f = FINAS.find((x) => x.id === (sentido || '').toLowerCase());
    return f ? f.etiqueta : (sentido || '').replace(/_/g, ' ');
}

/* La frase grande: lo que el resolutivo va a hacer, no la etiqueta. */
export function fraseDe(sentido: string, esRecurso: boolean): string {
    const g = grupoDe(sentido);
    const que = legible(sentido).toLowerCase();
    if (g === 'si') return esRecurso ? `Prospera el recurso: ${que}` : `Se concede: ${que}`;
    if (g === 'no') return esRecurso ? `No prospera: agravios ${que}s` : `Se niega: conceptos ${que}s`;
    if (g === 'sm') return 'Queda sin materia';
    return legible(sentido) || 'Sin sentido propuesto';
}
