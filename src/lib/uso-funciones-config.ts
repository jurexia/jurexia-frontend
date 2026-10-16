/**
 * LOS TOPES DE LAS FUNCIONES DE DESPACHO, por plan (16-oct-2026).
 *
 * Sin dependencias de servidor: la interfaz los importa para decir cuántos
 * quedan, y `servidor/uso.ts` los aplica. Cambiar un número aquí cambia las dos
 * cosas a la vez.
 *
 * POR QUÉ ESTOS NÚMEROS. Cambiar redacción usa un modelo ligero (≈1-2 mil
 * tokens por propuesta, fracciones de centavo), así que el tope protege del
 * abuso, no del costo normal. El correo sale de la cuenta de Resend de
 * Iurexia, compartida con los avisos y la recuperación de contraseñas: por eso
 * es lo más corto y el plan gratuito no lo tiene (también es el incentivo para
 * suscribirse).
 */

export type FuncionDespacho = 'redaccion' | 'plantilla_deteccion' | 'plantilla_generar' | 'correo';
export type Escalon = 'gratuito' | 'basico' | 'pro' | 'platinum';

export function escalonDe(plan: string | null | undefined): Escalon {
    const p = (plan ?? '').trim().toLowerCase();
    if (p.startsWith('platinum') || p.startsWith('ultra')) return 'platinum';
    if (p.startsWith('pro')) return 'pro';
    if (p.startsWith('basico') || p.startsWith('básico')) return 'basico';
    return 'gratuito';
}

export const LIMITES: Record<FuncionDespacho, { periodo: 'dia' | 'mes'; por: Record<Escalon, number> }> = {
    redaccion:           { periodo: 'dia', por: { gratuito: 5, basico: 30, pro: 150, platinum: 400 } },
    plantilla_deteccion: { periodo: 'mes', por: { gratuito: 1, basico: 5, pro: 30, platinum: 100 } },
    plantilla_generar:   { periodo: 'dia', por: { gratuito: 3, basico: 20, pro: 100, platinum: 300 } },
    correo:              { periodo: 'dia', por: { gratuito: 0, basico: 5, pro: 30, platinum: 80 } },
};

/** Cuántas plantillas puede tener guardadas a la vez. */
export const PLANTILLAS_GUARDADAS: Record<Escalon, number> = { gratuito: 1, basico: 5, pro: 30, platinum: 100 };

const NOMBRE: Record<FuncionDespacho, string> = {
    redaccion: 'cambios de redacción',
    plantilla_deteccion: 'plantillas nuevas',
    plantilla_generar: 'documentos desde plantilla',
    correo: 'correos',
};

/** El mensaje que ve el abogado cuando topa. */
export function mensajeLimite(funcion: FuncionDespacho, escalon: Escalon): string {
    const { periodo, por } = LIMITES[funcion];
    const tope = por[escalon];
    if (tope === 0) {
        return funcion === 'correo'
            ? 'Enviar escritos por correo desde Iurexia está disponible desde el plan Básico.'
            : 'Esta función está disponible desde el plan Básico.';
    }
    const cuando = periodo === 'dia' ? 'de hoy' : 'de este mes';
    const mejora = escalon === 'platinum' ? '' : ' Con un plan superior tienes más.';
    return `Llegaste a tus ${tope} ${NOMBRE[funcion]} ${cuando}.${mejora}`;
}
