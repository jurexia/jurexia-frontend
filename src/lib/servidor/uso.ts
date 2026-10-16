/**
 * Gasta una unidad de una función de despacho, si cabe en el tope del plan.
 * El conteo es atómico en la base (`gastar_uso_funcion`, ver
 * supabase_funciones_bufete.sql).
 *
 * SE GASTA DESPUÉS DE VALIDAR Y ANTES DE LLAMAR AL MODELO O A RESEND: una
 * petición mal formada no consume, y un abuso no llega a costar.
 */

import { servicio } from './peticion';
import { escalonDe, LIMITES, mensajeLimite, type Escalon, type FuncionDespacho } from '../uso-funciones-config';

export interface ResultadoUso {
    permitido: boolean;
    usados: number;
    limite: number;
    escalon: Escalon;
    /** Listo para la interfaz cuando no se permite. */
    mensaje?: string;
}

export async function gastarUso(userId: string, plan: string, funcion: FuncionDespacho): Promise<ResultadoUso> {
    const escalon = escalonDe(plan);
    const { periodo, por } = LIMITES[funcion];
    const limite = por[escalon];
    if (limite <= 0) {
        return { permitido: false, usados: 0, limite, escalon, mensaje: mensajeLimite(funcion, escalon) };
    }
    const { data, error } = await servicio().rpc('gastar_uso_funcion', {
        p_user: userId, p_funcion: funcion, p_limite: limite, p_periodo: periodo,
    });
    if (error) {
        // Sin la tabla (migración sin aplicar) o la base caída: NO se deja pasar
        // en silencio, porque entonces el tope no existiría.
        console.error('[uso] no se pudo contar', funcion, error.message);
        throw new Error('No se pudo registrar el uso. Vuelve a intentarlo en un momento.');
    }
    const fila = Array.isArray(data) ? data[0] : data;
    const permitido = !!fila?.permitido;
    return {
        permitido,
        usados: Number(fila?.usados ?? 0),
        limite,
        escalon,
        mensaje: permitido ? undefined : mensajeLimite(funcion, escalon),
    };
}
