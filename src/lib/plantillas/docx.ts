/**
 * EL .DOCX DEL ABOGADO: ABRIRLO, LEERLO, MARCARLO Y LLENARLO (16-oct-2026).
 *
 * Bufete.ai lo resume en tres pasos: «Llega el encargo → La plantilla
 * completa → En la carpeta del cliente». Aquí vive el segundo: la plantilla
 * del despacho + los datos del cliente = el documento listo, CON EL FORMATO
 * DEL DESPACHO. No se rehace el Word: se reemplaza el texto dentro del XML y
 * todo lo demás (membrete, estilos, tablas, numeración, encabezados y pies)
 * se queda exactamente como lo dejó el abogado.
 *
 *   abrirDocx      valida: un .docx de verdad, sin macros, sin bomba de zip.
 *   leerPartes     el texto de cada párrafo del cuerpo, encabezados, pies y notas.
 *   marcar         cada aparición confirmada pasa a {{clave}} (docxtemplater).
 *   llenar         docxtemplater con {{ }}: lo que falta sale como «__________».
 *
 * Corre igual en Node y en el navegador (pizzip y docxtemplater no piden
 * nada del servidor): así la prueba en el montaje real usa ESTE código.
 */

import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { leerParrafos, edicionesDe, aplicarEdiciones, type Edicion, type Parrafo, type Reemplazo } from './xml'
import {
    aparicionesDelParrafo, aplicarForma, etiquetaWord, valorLimpio,
    type Aparicion, type CampoPlantilla,
} from './campos'

export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
/** El tope del bucket `plantillas` (supabase_funciones_bufete.sql). */
export const MAX_BYTES = 10 * 1024 * 1024
/** Lo que sale donde el abogado no dio valor: se ve y se llena a mano. */
export const VACIO = '__________'

const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
const TIPO_DOTX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml'
const TIPOS_CON_MACROS = [
    'application/vnd.ms-word.document.macroEnabled.main+xml',
    'application/vnd.ms-word.template.macroEnabledTemplate.main+xml',
]
const TIPOS_PARTE: Record<string, TipoParte> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml': 'encabezado',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml': 'pie',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml': 'nota',
}

/* LA BOMBA DE ZIP. Un .docx de 2 MB puede descomprimirse en gigas. Un escrito
   real, con su membrete, no pasa de unas decenas de MB descomprimido. */
const MAX_DESCOMPRIMIDO = 150 * 1024 * 1024
const MAX_ARCHIVOS = 3000
const MAX_XML_PARTE = 25 * 1024 * 1024

export class PlantillaInvalida extends Error {
    constructor(mensaje: string) {
        super(mensaje)
        this.name = 'PlantillaInvalida'
    }
}

export type TipoParte = 'cuerpo' | 'encabezado' | 'pie' | 'nota'

export interface Parte {
    ruta: string
    tipo: TipoParte
    parrafos: Parrafo[]
}

export interface DocxAbierto {
    zip: PizZip
    principal: string
    /** Encabezados, cuerpo, notas y pies, en ese orden. */
    rutas: { ruta: string; tipo: TipoParte }[]
    /** Era una plantilla de Word (.dotx) y se guardó como documento. */
    eraDotx: boolean
}

const aBytes = (d: Uint8Array | ArrayBuffer) => (d instanceof Uint8Array ? d : new Uint8Array(d))

function atributo(etiqueta: string, nombre: string): string | null {
    const m = new RegExp(`\\s${nombre}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(etiqueta)
    return m ? (m[2] ?? m[3] ?? null) : null
}

/**
 * Abre y valida. Lanza `PlantillaInvalida` con un mensaje que el abogado
 * entiende y le dice qué hacer.
 */
export function abrirDocx(datos: Uint8Array | ArrayBuffer): DocxAbierto {
    const b = aBytes(datos)
    if (b.length === 0) throw new PlantillaInvalida('El archivo está vacío.')
    if (b.length > MAX_BYTES) {
        throw new PlantillaInvalida(`La plantilla pesa ${(b.length / 1024 / 1024).toFixed(1)} MB y el máximo es 10 MB. Suele bastar con comprimir las imágenes del membrete (en Word: Archivo → Comprimir imágenes).`)
    }
    // D0 CF 11 E0: el formato viejo de Office. Es un .doc de Word 97-2003 o un
    // .docx con contraseña (Word lo cifra dentro de ese mismo contenedor).
    if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) {
        throw new PlantillaInvalida('Es un Word antiguo (.doc) o está protegido con contraseña. Ábrelo en Word y guárdalo como «Documento de Word (.docx)», sin contraseña.')
    }
    if (!(b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04)) {
        throw new PlantillaInvalida('No es un documento de Word (.docx). Ábrelo en Word y guárdalo como «Documento de Word (.docx)».')
    }
    let zip: PizZip
    try { zip = new PizZip(b) } catch {
        throw new PlantillaInvalida('El archivo está dañado: Word no podría abrirlo. Vuelve a guardarlo desde Word.')
    }

    const nombres = Object.keys(zip.files)
    if (nombres.length > MAX_ARCHIVOS) throw new PlantillaInvalida('El archivo no tiene la forma de un documento de Word.')
    let total = 0
    for (const nombre of nombres) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const crudo = (zip.files[nombre] as any)?._data
        total += typeof crudo?.uncompressedSize === 'number' ? crudo.uncompressedSize : 0
    }
    if (total > MAX_DESCOMPRIMIDO) throw new PlantillaInvalida('El documento es demasiado grande por dentro para procesarlo.')

    const tipos = zip.file('[Content_Types].xml')?.asText()
    if (!tipos) throw new PlantillaInvalida('No es un documento de Word (.docx).')

    // El documento principal lo dice _rels/.rels (casi siempre word/document.xml).
    let principal = 'word/document.xml'
    const rels = zip.file('_rels/.rels')?.asText() ?? ''
    for (const m of Array.from(rels.matchAll(/<Relationship\b[^>]*>/g))) {
        const tipo = atributo(m[0], 'Type') ?? ''
        if (/\/officeDocument$/.test(tipo)) {
            const destino = (atributo(m[0], 'Target') ?? '').replace(/^\//, '')
            if (destino) principal = destino
            break
        }
    }
    if (!zip.file(principal)) throw new PlantillaInvalida('No es un documento de Word (.docx): le falta el cuerpo del documento.')

    // Las macros no entran: una plantilla del despacho no las necesita y un
    // .docm es la forma clásica de colar código en un Word.
    const partes: { ruta: string; tipo: string }[] = []
    for (const m of Array.from(tipos.matchAll(/<Override\b[^>]*>/g))) {
        const ruta = (atributo(m[0], 'PartName') ?? '').replace(/^\//, '')
        const tipo = atributo(m[0], 'ContentType') ?? ''
        if (ruta) partes.push({ ruta, tipo })
    }
    const tipoPrincipal = partes.find((p) => p.ruta === principal)?.tipo ?? TIPO_DOCX
    if (TIPOS_CON_MACROS.includes(tipoPrincipal) || nombres.some((x) => /vbaProject\.bin$/i.test(x))) {
        throw new PlantillaInvalida('El documento tiene macros (.docm). Por seguridad no se aceptan: guárdalo como «Documento de Word (.docx)».')
    }
    // Una plantilla de Word (.dotx) se guarda como documento: así el resultado
    // se abre como un escrito y no como otra plantilla.
    const eraDotx = tipoPrincipal === TIPO_DOTX
    if (eraDotx) zip.file('[Content_Types].xml', tipos.split(TIPO_DOTX).join(TIPO_DOCX))

    const rutas: { ruta: string; tipo: TipoParte }[] = []
    const de = (t: TipoParte) => partes.filter((p) => TIPOS_PARTE[p.tipo] === t && zip.file(p.ruta)).map((p) => ({ ruta: p.ruta, tipo: t }))
    rutas.push(...de('encabezado').sort(porNumero), { ruta: principal, tipo: 'cuerpo' }, ...de('nota'), ...de('pie').sort(porNumero))
    for (const r of rutas) {
        const xml = zip.file(r.ruta)?.asText() ?? ''
        if (xml.length > MAX_XML_PARTE) throw new PlantillaInvalida('El documento es demasiado grande por dentro para procesarlo.')
    }
    return { zip, principal, rutas, eraDotx }
}

function porNumero(a: { ruta: string }, b: { ruta: string }) {
    const n = (s: string) => parseInt(/(\d+)\.xml$/.exec(s)?.[1] ?? '0', 10)
    return n(a.ruta) - n(b.ruta)
}

/** El texto de cada parte, párrafo por párrafo. */
export function leerPartes(doc: DocxAbierto): Parte[] {
    return doc.rutas.map((r) => ({
        ruta: r.ruta,
        tipo: r.tipo,
        parrafos: leerParrafos(doc.zip.file(r.ruta)?.asText() ?? ''),
    }))
}

/** El texto plano del documento, sin las copias de respaldo y sin líneas vacías de más. */
export function textoPlano(partes: readonly Parte[], tipos: readonly TipoParte[] = ['encabezado', 'cuerpo', 'pie']): string {
    const lineas: string[] = []
    for (const p of partes) {
        if (!tipos.includes(p.tipo)) continue
        for (const q of p.parrafos) {
            if (q.respaldo) continue
            const t = q.texto.replace(/\u2011/g, '-').replace(/\ufffc/g, '').replace(/[ \t]+/g, ' ').trim()
            if (t || (lineas.length && lineas[lineas.length - 1] !== '')) lineas.push(t)
        }
    }
    return lineas.join('\n').trim()
}

/** Cuántas veces aparece cada campo, con la misma regla con que se marcará. */
export function contarApariciones(partes: readonly Parte[], campos: readonly CampoPlantilla[]): Map<string, number> {
    const cuenta = new Map<string, number>(campos.map((c) => [c.clave, 0]))
    for (const parte of partes) {
        for (const p of parte.parrafos) {
            if (p.respaldo) continue
            for (const a of aparicionesDelParrafo(p.texto, campos, p.virtuales)) {
                cuenta.set(a.clave, (cuenta.get(a.clave) ?? 0) + 1)
            }
        }
    }
    return cuenta
}

/* LAS LLAVES SUELTAS. Si el texto ya traía «{{» o «}}» que no son campos,
   docxtemplater los tomaría por etiquetas y el documento no se podría llenar.
   Se separan con un espacio de ancho cero: no se ve, no se imprime, y deja de
   ser un delimitador. Lo mismo junto a un campo: «{JUAN}» → «{\u200b{{actor}}\u200b}». */
const ZWSP = '\u200b'

function llavesSueltas(texto: string, ocupadas: readonly Aparicion[]): Reemplazo[] {
    const fuera: Reemplazo[] = []
    const libre = (k: number) => !ocupadas.some((a) => k >= a.desde && k < a.hasta)
    for (let k = 1; k < texto.length; k++) {
        const par = texto[k - 1] + texto[k]
        if ((par === '{{' || par === '}}') && libre(k) && libre(k - 1)) {
            fuera.push({ desde: k, hasta: k + 1, nuevo: ZWSP + texto[k] })
        }
    }
    return fuera
}

export interface ResultadoMarcado {
    docx: Uint8Array
    apariciones: Map<string, number>
}

/**
 * La plantilla con cada aparición confirmada convertida en {{clave}}. Parte
 * SIEMPRE del original: volver a revisar los campos rehace el marcado desde
 * cero, sin arrastrar el anterior.
 */
export function marcar(original: Uint8Array | ArrayBuffer, campos: readonly CampoPlantilla[]): ResultadoMarcado {
    const doc = abrirDocx(original)
    const apariciones = new Map<string, number>(campos.map((c) => [c.clave, 0]))
    for (const r of doc.rutas) {
        const xml = doc.zip.file(r.ruta)?.asText() ?? ''
        const parrafos = leerParrafos(xml)
        const ediciones: Edicion[] = []
        for (const p of parrafos) {
            const aps = aparicionesDelParrafo(p.texto, campos, p.virtuales)
            const reemplazos: Reemplazo[] = aps.map((a) => {
                const antes = a.desde > 0 && p.texto[a.desde - 1] === '{' ? ZWSP : ''
                const despues = a.hasta < p.texto.length && p.texto[a.hasta] === '}' ? ZWSP : ''
                return { desde: a.desde, hasta: a.hasta, nuevo: antes + etiquetaWord(a) + despues }
            })
            reemplazos.push(...llavesSueltas(p.texto, aps))
            reemplazos.sort((a, b) => a.desde - b.desde)
            ediciones.push(...edicionesDe(p, reemplazos))
            if (!p.respaldo) for (const a of aps) apariciones.set(a.clave, (apariciones.get(a.clave) ?? 0) + 1)
        }
        if (ediciones.length) doc.zip.file(r.ruta, aplicarEdiciones(xml, ediciones))
    }
    const docx = doc.zip.generate({ type: 'uint8array', compression: 'DEFLATE' })
    // La prueba de fuego: si docxtemplater no lo puede compilar, no se guarda.
    llenar(docx, {})
    return { docx, apariciones }
}

/** Lo que dice docxtemplater cuando no puede, en una línea. */
function motivoDocxtemplater(err: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any
    const errores = e?.properties?.errors
    if (Array.isArray(errores) && errores.length) {
        return errores.slice(0, 3).map((x: { properties?: { explanation?: string }; message?: string }) => x?.properties?.explanation || x?.message).join(' · ')
    }
    return e?.properties?.explanation || e?.message || String(err)
}

export class NoSePudoLlenar extends Error {
    constructor(motivo: string) {
        super(`No se pudo armar el documento: ${motivo}`)
        this.name = 'NoSePudoLlenar'
    }
}

/**
 * Llena la plantilla marcada. `valores` va por clave; lo vacío o ausente sale
 * como «__________». Los saltos de línea del valor son saltos de línea en
 * Word. La forma de cada aparición ({{clave|mayus}}) se respeta.
 */
export function llenar(marcado: Uint8Array | ArrayBuffer, valores: Record<string, unknown>): Uint8Array {
    const limpios: Record<string, string> = {}
    for (const [k, v] of Object.entries(valores)) {
        const t = valorLimpio(v)
        if (t !== undefined) limpios[k] = t
    }
    try {
        const zip = new PizZip(aBytes(marcado))
        const doc = new Docxtemplater(zip, {
            delimiters: { start: '{{', end: '}}' },
            paragraphLoop: true,
            linebreaks: true,
            errorLogging: false,
            parser: (etiqueta: string) => {
                const [clave, forma] = etiqueta.trim().split('|')
                return {
                    get: (scope: Record<string, unknown>) => {
                        const v = scope?.[clave.trim()]
                        if (typeof v !== 'string' || !v) return undefined
                        return aplicarForma(v, forma === 'mayus' || forma === 'inicial' ? forma : null)
                    },
                }
            },
            nullGetter: () => VACIO,
        })
        doc.render(limpios)
        return doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' })
    } catch (err) {
        throw new NoSePudoLlenar(motivoDocxtemplater(err))
    }
}

/** Las claves que de verdad quedaron en una plantilla marcada. */
export function clavesMarcadas(marcado: Uint8Array | ArrayBuffer): string[] {
    const doc = abrirDocx(marcado)
    const claves = new Set<string>()
    for (const p of leerPartes(doc)) {
        for (const q of p.parrafos) {
            for (const m of Array.from(q.texto.matchAll(/\{\{([a-z0-9_]+)(?:\|[a-z]+)?\}\}/g))) claves.add(m[1])
        }
    }
    return Array.from(claves)
}
