/* EL GRABADO DE CADA CARPETA (12-oct-2026).
   David: «tal como hicimos con el diseño de calendarios y de tarjetas de
   abogados», que el abogado trabaje en un ambiente profesional. Las carpetas
   toman los grabados de /web/arte, como las hojas de la Agenda y las tarjetas
   de Connect: cada tipo tiene su familia de grabados oscuros (sobre ellos va
   letra clara) y cada carpeta se queda siempre con el mismo, elegido por su id,
   para que el abogado la reconozca de lejos. */

import type { TipoCarpeta } from '@/lib/expedientes'

const FAMILIAS: Record<TipoCarpeta, string[]> = {
    cliente: ['puertas', 'portico', 'claustro', 'tintero'],
    asunto: ['columnata', 'boveda', 'archivo', 'claustro', 'lomos', 'puertas'],
    academico: ['biblioteca', 'lomos', 'archivo'],
    documento: ['tintero', 'archivo', 'lomos'],
}

/** La ruta del grabado de una carpeta: estable para el mismo id. */
export function arteDeCarpeta(id: string, tipo: TipoCarpeta | null | undefined): string {
    const familia = FAMILIAS[tipo ?? 'cliente'] ?? FAMILIAS.cliente
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return `/web/arte/${familia[h % familia.length]}.webp`
}

/** «hace 3 días», «el 4 oct»: cuándo se tocó la carpeta por última vez. */
export function haceCuanto(iso: string | null | undefined): string {
    if (!iso) return ''
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return ''
    const dias = Math.floor((Date.now() - t) / 86_400_000)
    if (dias <= 0) return 'hoy'
    if (dias === 1) return 'ayer'
    if (dias < 7) return `hace ${dias} días`
    return `el ${new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
}
