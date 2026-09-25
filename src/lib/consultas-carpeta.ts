import { supabase } from './supabase'

/**
 * La consulta dentro de la carpeta (25-sep-2026).
 *
 * Como en Astra for Law, donde cada conversación pertenece a un asunto: aquí la
 * consulta puede vivir en una carpeta inteligente (`conversations.expediente_id`)
 * y recordar con qué flujo de trabajo empezó (`conversations.flujo`).
 *
 * Vive aparte de `conversations.ts` a propósito. Aquel archivo guarda y
 * recupera mensajes —el camino que no puede fallar—; esto es una capa encima
 * que, si las columnas todavía no existen en la base, se apaga sola: la barra
 * se queda sin carpetas y el chat sigue exactamente como antes. Por eso cada
 * función distingue «no hay columnas» de cualquier otro error.
 */

export interface VinculoConsulta {
    expedienteId: string | null
    flujo: string | null
}

/** id de conversación → carpeta y flujo. Sólo trae las que tienen alguno. */
export type Vinculos = Record<string, VinculoConsulta>

export interface ConsultaDeCarpeta {
    id: string
    title: string
    flujo: string | null
    updatedAt: string
}

/** Se aprende una vez por carga de página: preguntar de nuevo no la crea. */
let sinColumnas = false

function faltanColumnas(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false
    // 42703: columna inexistente al leer. PGRST204: columna fuera del esquema
    // en caché de PostgREST al escribir.
    if (error.code === '42703' || error.code === 'PGRST204') return true
    return /expediente_id|flujo/.test(error.message ?? '') && /does not exist|schema cache/.test(error.message ?? '')
}

/** ¿Está disponible la función? Falso hasta que la base tenga las columnas. */
export function carpetasEnConsultasDisponibles(): boolean {
    return !sinColumnas
}

/**
 * Los vínculos de todas las consultas del usuario. `null` quiere decir «la
 * función no está disponible»; `{}` quiere decir «ninguna consulta vinculada».
 */
export async function getVinculos(): Promise<Vinculos | null> {
    if (sinColumnas) return null
    const { data, error } = await supabase
        .from('conversations')
        .select('id, expediente_id, flujo')
        .or('expediente_id.not.is.null,flujo.not.is.null')
        .limit(1000)
    if (error) {
        if (faltanColumnas(error)) {
            sinColumnas = true
            return null
        }
        console.warn('[consultas-carpeta] no se pudieron leer los vínculos:', error.message)
        return {}
    }
    const vinculos: Vinculos = {}
    for (const fila of (data ?? []) as { id: string; expediente_id: string | null; flujo: string | null }[]) {
        vinculos[fila.id] = { expedienteId: fila.expediente_id, flujo: fila.flujo }
    }
    return vinculos
}

/**
 * Mete (o saca, con `null`) una consulta de una carpeta, o le anota su flujo.
 *
 * No toca `updated_at`: mover una consulta de mayo a una carpeta no la vuelve
 * de hoy, y el historial la seguiría enseñando arriba sin razón.
 */
export async function vincularConsulta(
    conversacionId: string,
    cambios: { expedienteId?: string | null; flujo?: string | null }
): Promise<boolean> {
    if (sinColumnas) return false
    const fila: Record<string, string | null> = {}
    if ('expedienteId' in cambios) fila.expediente_id = cambios.expedienteId ?? null
    if ('flujo' in cambios) fila.flujo = cambios.flujo ?? null
    if (Object.keys(fila).length === 0) return true

    const { error } = await supabase.from('conversations').update(fila).eq('id', conversacionId)
    if (error) {
        if (faltanColumnas(error)) sinColumnas = true
        else console.warn('[consultas-carpeta] no se pudo vincular:', error.message)
        return false
    }
    return true
}

/** Las consultas de una carpeta, la más reciente primero. */
export async function consultasDeCarpeta(expedienteId: string): Promise<ConsultaDeCarpeta[] | null> {
    if (sinColumnas) return null
    const { data, error } = await supabase
        .from('conversations')
        .select('id, title, flujo, updated_at')
        .eq('expediente_id', expedienteId)
        .order('updated_at', { ascending: false })
        .limit(100)
    if (error) {
        if (faltanColumnas(error)) {
            sinColumnas = true
            return null
        }
        console.warn('[consultas-carpeta] no se pudieron leer las consultas:', error.message)
        return []
    }
    return ((data ?? []) as { id: string; title: string | null; flujo: string | null; updated_at: string }[]).map(
        (f) => ({ id: f.id, title: f.title || 'Consulta', flujo: f.flujo, updatedAt: f.updated_at })
    )
}

/**
 * Los títulos se generan del primer mensaje, y algunos caminos lo mandan con
 * marcadores internos por delante: «[MODO_PRECEDENTES] [CORTE:SCJN] ¿Qué…».
 * Eso no es un título. Se quitan para mostrarlo; en la base no se toca nada.
 */
export function tituloLimpio(titulo: string | null | undefined): string {
    const t = (titulo ?? '')
        .replace(/^(\s*\[[A-Z_]+(?::[^\]]*)?\]\s*)+/, '')
        // El título se corta a unos cincuenta caracteres, así que el rótulo
        // del flujo puede llegar sin sus asteriscos de cierre.
        .replace(/^\*\*Flujo · [^*]*(\*\*)?\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
    return t || 'Consulta'
}
