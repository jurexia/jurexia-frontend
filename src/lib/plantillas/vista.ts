/**
 * EL WORD COMO HTML, PARA VERLO Y PARA EDITARLO (16-oct-2026).
 *
 * mammoth convierte el cuerpo del .docx a HTML limpio (párrafos, negritas,
 * tablas, listas). Se usa dos veces y con las MISMAS opciones:
 *   · en el servidor, para la vista previa de la revisión de campos;
 *   · en el navegador, para abrir el documento ya lleno en el editor.
 *
 * Lo que se le añade a mammoth, que por sí solo no lo hace:
 *   · LA ALINEACIÓN. Un escrito vive de ella: «C. JUEZ…» a la izquierda, el
 *     rubro centrado, «PROTESTO LO NECESARIO» y la firma al centro. mammoth la
 *     tira; aquí viaja como `text-align` en línea, que es lo que lee la hoja
 *     del editor (`exportarDocx`).
 *   · SIN IMÁGENES: el membrete viaja en el Word original, no en el editor ni
 *     en la vista previa, y en base64 inflaría la respuesta.
 *   · SIN ENLACES: un .docx puede traer cualquier `href` (incluso
 *     `javascript:`); en la vista previa no hace falta ninguno.
 *
 * El módulo de mammoth se pasa como argumento: el servidor lo importa entero y
 * el navegador lo carga bajo demanda.
 */

import type { Parte } from './docx'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Mammoth = {
    convertToHtml: (entrada: any, opciones?: any) => Promise<{ value: string }>
    extractRawText: (entrada: any) => Promise<{ value: string }>
    images: { imgElement: (f: (img: any) => Promise<{ src: string }>) => any }
}

const ALINEACION: Record<string, string> = {
    center: 'IurexiaCentro',
    right: 'IurexiaDerecha',
    end: 'IurexiaDerecha',
    both: 'IurexiaJustificado',
    distribute: 'IurexiaJustificado',
}

/* Sólo los párrafos SIN estilo de título y sin numeración: un «Heading 1» ya
   sale como <h1>, y un párrafo de lista tiene que seguir siendo <li>. */
function alinear(elemento: any): any {
    // Como los `transforms` de mammoth: se cambia en su sitio, sin perder el prototipo.
    if (elemento?.children) elemento.children = elemento.children.map(alinear)
    if (elemento?.type === 'paragraph' && !elemento.numbering) {
        const estilo = String(elemento.styleName ?? '')
        const deTitulo = /^(heading|t[ií]tulo|title|subtitle|subt[ií]tulo)\b/i.test(estilo)
        const nuevo = ALINEACION[String(elemento.alignment ?? '')]
        if (nuevo && !deTitulo) { elemento.styleName = nuevo; elemento.styleId = nuevo }
    }
    return elemento
}

const MAPA_ESTILOS = [
    "p[style-name='IurexiaCentro'] => p.al-centro:fresh",
    "p[style-name='IurexiaDerecha'] => p.al-derecha:fresh",
    "p[style-name='IurexiaJustificado'] => p.al-justificado:fresh",
    'u => u',
    'strike => s',
]

const ESTILO_DE_CLASE: Record<string, string> = {
    'al-centro': 'text-align: center',
    'al-derecha': 'text-align: right',
    'al-justificado': 'text-align: justify',
}

/** El HTML de mammoth, limpio. `entrada` es `{ buffer }` en Node o `{ arrayBuffer }` en el navegador. */
export async function htmlDeDocx(mammoth: Mammoth, entrada: unknown): Promise<string> {
    const r = await mammoth.convertToHtml(entrada, {
        styleMap: MAPA_ESTILOS,
        transformDocument: alinear,
        convertImage: mammoth.images.imgElement(async () => ({ src: '' })),
    })
    return limpiarHtml(r.value)
}

export function limpiarHtml(html: string): string {
    return html
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<a\b[^>]*>/gi, '<span>')
        .replace(/<\/a>/gi, '</span>')
        .replace(/\s(on\w+|style)\s*=\s*("[^"]*"|'[^']*')/gi, '')
        .replace(/<p class="(al-centro|al-derecha|al-justificado)">/g, (_m, c: string) => `<p style="${ESTILO_DE_CLASE[c]}">`)
        .replace(/<p>\s*<\/p>/g, '')
}

/** El texto plano de un .docx con mammoth (para el extracto de la carpeta). */
export async function textoDeDocx(mammoth: Mammoth, entrada: unknown): Promise<string> {
    const r = await mammoth.extractRawText(entrada)
    return r.value.replace(/\n{3,}/g, '\n\n').trim()
}

/** Los encabezados y pies, que mammoth no convierte: texto de cada párrafo. */
export function encabezadosYPies(partes: readonly Parte[]): { encabezados: string[]; pies: string[] } {
    const de = (tipo: Parte['tipo']) => {
        const vistos = new Set<string>()
        const fuera: string[] = []
        for (const p of partes) {
            if (p.tipo !== tipo) continue
            for (const q of p.parrafos) {
                const t = q.texto.trim()
                if (q.respaldo || !t || vistos.has(t)) continue // la primera página y las demás suelen repetirse
                vistos.add(t)
                fuera.push(q.texto)
            }
        }
        return fuera.slice(0, 30)
    }
    return { encabezados: de('encabezado'), pies: de('pie') }
}
