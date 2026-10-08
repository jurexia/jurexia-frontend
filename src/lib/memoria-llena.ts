/**
 * EL MARCADOR DE MEMORIA LLENA (7-oct-2026).
 *
 * El API guarda una memoria de la conversación con tope por plan. Cuando la
 * conversación lo rebasa, lee completo lo más reciente, abrevia lo más antiguo
 * y lo dice dentro de la respuesta —en el stream de `/chat` y en los `token`
 * de `/analyze-document`— con
 *
 *   <!-- MEMORIA_LLENA:{"plan":"pro","tope":400000,"usado":574269,"mayor":"platinum"} -->
 *
 * El marcador se queda guardado en el mensaje; la burbuja no lo enseña y pinta
 * en su lugar el aviso (`AvisoMemoriaLlena`). Funciones puras, sin navegador:
 * `respuestaDelChat` las usa y se mide en Node.
 */

export const ABRE_MEMORIA_LLENA = '<!-- MEMORIA_LLENA:{'
export const CIERRA_MEMORIA_LLENA = '} -->'

export interface MemoriaLlena {
    plan: string
    tope: number
    usado: number
    /** El siguiente plan con más memoria; null si ya es el máximo. */
    mayor: string | null
}

export function traeMemoriaLlena(contenido: string | null | undefined): boolean {
    return !!contenido && contenido.includes(ABRE_MEMORIA_LLENA)
}

/**
 * Lo que dice el marcador y el texto sin él. Si el marcador aún no termina de
 * llegar (el stream lo partió), se corta desde su apertura: un «<!--» sin
 * cerrar en el HTML de la burbuja se tragaría todo lo que viene detrás.
 */
export function separarMemoriaLlena(contenido: string): { memoria: MemoriaLlena | null; texto: string } {
    const a = contenido.indexOf(ABRE_MEMORIA_LLENA)
    if (a === -1) return { memoria: null, texto: contenido }
    const c = contenido.indexOf(CIERRA_MEMORIA_LLENA, a + ABRE_MEMORIA_LLENA.length)
    if (c === -1) return { memoria: null, texto: contenido.slice(0, a) }
    let memoria: MemoriaLlena | null = null
    try {
        const d = JSON.parse(contenido.slice(a + ABRE_MEMORIA_LLENA.length - 1, c + 1))
        memoria = {
            plan: String(d?.plan ?? ''),
            tope: Number(d?.tope) || 0,
            usado: Number(d?.usado) || 0,
            mayor: typeof d?.mayor === 'string' && d.mayor ? d.mayor : null,
        }
    } catch { /* un marcador ilegible no se enseña, pero tampoco se pinta crudo */ }
    // Si viniera más de uno, se quitan todos; el primero basta para el aviso.
    let texto = contenido.slice(0, a) + contenido.slice(c + CIERRA_MEMORIA_LLENA.length)
    for (let k = texto.indexOf(ABRE_MEMORIA_LLENA); k !== -1; k = texto.indexOf(ABRE_MEMORIA_LLENA)) {
        const fin = texto.indexOf(CIERRA_MEMORIA_LLENA, k + ABRE_MEMORIA_LLENA.length)
        texto = fin === -1 ? texto.slice(0, k) : texto.slice(0, k) + texto.slice(fin + CIERRA_MEMORIA_LLENA.length)
    }
    return { memoria, texto }
}

/** Cómo se llama en pantalla el plan que amplía la memoria. */
export const NOMBRE_DE_PLAN: Record<string, string> = {
    basico: 'Básico',
    pro: 'Pro',
    platinum: 'Platinum',
}
