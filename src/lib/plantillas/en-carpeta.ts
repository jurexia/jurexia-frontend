/**
 * EL ESCRITO, A LA CARPETA DEL CLIENTE (16-oct-2026). Sólo navegador.
 *
 * El tercer paso de Bufete: «En la carpeta del cliente». Lo usan los dos
 * caminos que terminan en la carpeta —el Word con el formato original que sale
 * de la plantilla y el escrito retocado en el editor («A la carpeta»)— para
 * que caigan en la misma gaveta y con el mismo aviso.
 *
 * El texto viaja como extracto: así el documento cuenta de inmediato para el
 * análisis de la carpeta y NO pasa por el lector (que cuesta una consulta).
 */

import {
    CATEGORIAS, categoriasDe, getExpediente, subirDocumento,
    type CategoriaDocumento, type DocumentoExpediente,
} from '@/lib/expedientes'

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Lo escucha la página de la carpeta para poner el documento nuevo en su lista. */
export const EVENTO_DOCUMENTO_EN_CARPETA = 'iurexia:documento-en-carpeta'

export interface DetalleDocumentoEnCarpeta {
    expedienteId: string
    documento: DocumentoExpediente
}

/** La gaveta de un escrito según el tipo de carpeta: promociones en un
    litigio, versiones en un documento legal, borradores en un proyecto. */
export function gavetaParaEscrito(tipo: string | null | undefined): CategoriaDocumento {
    const disponibles = categoriasDe(tipo).map((c) => c.value)
    const preferidas: CategoriaDocumento[] = ['demandas', 'versiones', 'borradores', 'impugnacion', 'base', 'notas', 'referencia', 'final']
    return preferidas.find((g) => disponibles.includes(g)) ?? disponibles[0]
}

export function nombreDeGaveta(c: CategoriaDocumento): string {
    return CATEGORIAS.find((x) => x.value === c)?.label ?? 'Documentos'
}

export async function guardarWordEnCarpeta({ expedienteId, tipo, blob, nombre, plan, texto }: {
    expedienteId: string
    /** El tipo de la carpeta, si ya se conoce (si no, se lee). */
    tipo?: string | null
    blob: Blob
    nombre: string
    plan?: string | null
    /** El texto del documento: viaja como extracto. */
    texto?: string
}): Promise<{ documento: DocumentoExpediente; gaveta: CategoriaDocumento }> {
    let t = tipo
    if (!t) {
        const exp = await getExpediente(expedienteId)
        if (!exp) throw new Error('Esa carpeta ya no existe o no es tuya.')
        t = exp.tipo
    }
    const gaveta = gavetaParaEscrito(t)
    const archivo = new File([blob], nombre, { type: MIME_DOCX })
    // Nunca vacío: un extracto vacío mandaría el documento al lector y cobraría.
    const extracto = (texto ?? '').trim() || nombre.replace(/\.docx$/i, '')
    const documento = await subirDocumento(expedienteId, gaveta, archivo, plan, extracto)
    window.dispatchEvent(new CustomEvent<DetalleDocumentoEnCarpeta>(EVENTO_DOCUMENTO_EN_CARPETA, { detail: { expedienteId, documento } }))
    return { documento, gaveta }
}

/** El aviso cuando no se pudo guardar, en palabras del abogado. */
export function motivoAlGuardar(e: unknown): string {
    if (e instanceof Error && e.name === 'SinEspacio') return 'Tu almacenamiento está lleno. Libera espacio en tus carpetas o mejora tu plan.'
    if (e instanceof Error && e.message) return e.message
    return 'No se pudo guardar en la carpeta. Vuelve a intentarlo.'
}
