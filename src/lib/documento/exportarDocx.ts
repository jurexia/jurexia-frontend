/**
 * EL DOCUMENTO DEL CONSTRUCTOR, A WORD Y A PAPEL.
 *
 * Portado del editor de SwitchMyAI (`src/lib/app/exportar.ts`), que lee el
 * árbol vivo del editor —no el markdown— para que lo que el abogado ve en la
 * hoja sea exactamente lo que sale en el archivo: negritas, cursivas,
 * alineación, letra y cuerpo.
 *
 * LO QUE SE AÑADIÓ PARA UN ESCRITO JURÍDICO, que el original no necesitaba:
 *   · PAPEL CARTA U OFICIO. El original dejaba el tamaño de la librería (A4),
 *     que en un juzgado mexicano no se usa.
 *   · MÁRGENES DE ESCRITO: 3 cm a la izquierda —el cosido del expediente—,
 *     2 cm a la derecha y 2.5 cm arriba y abajo.
 *   · ARIAL 12, INTERLINEADO 1.5 Y JUSTIFICADO por omisión, que es lo que
 *     piden los tribunales, y sangría de primera línea y de cita.
 *   · EL SALTO DE LÍNEA (`<br>`) VIAJA: en el original se perdía, y en una
 *     demanda el proemio y la firma son renglones cortos seguidos.
 *   · EL INTERLINEADO Y LA SANGRÍA QUE EL USUARIO PONE en un párrafo viajan
 *     como propiedades del párrafo, no como estilo del documento.
 *   · NÚMERO DE PÁGINA centrado al pie, en todas las hojas.
 */

export type Papel = 'carta' | 'oficio'

type Trozo = {
    readonly texto: string
    readonly negrita: boolean
    readonly cursiva: boolean
    readonly subrayado: boolean
    readonly fuente: string | null
    readonly cuerpo: number | null
    /** Un salto de línea dentro del párrafo (`<br>`). */
    readonly salto?: boolean
}

type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'justificado'

type Bloque =
    | { readonly clase: 'titulo'; readonly nivel: 1 | 2 | 3; readonly trozos: readonly Trozo[]; readonly alineacion?: Alineacion }
    | {
          readonly clase: 'parrafo' | 'cita' | 'vineta' | 'numerada'
          readonly trozos: readonly Trozo[]
          readonly alineacion?: Alineacion
          /** Interlineado del párrafo, si el usuario lo cambió (1, 1.5, 2). */
          readonly interlineado?: number
          /** Sangría de primera línea, si el usuario la puso. */
          readonly sangria?: boolean
      }
    | { readonly clase: 'tabla'; readonly encabezado: readonly string[]; readonly filas: readonly (readonly string[])[] }

const VACIO: readonly Trozo[] = []

/* 1 cm = 567 twips. */
const CM = 567
const PAPEL_TWIPS: Record<Papel, { ancho: number; alto: number }> = {
    carta: { ancho: 12240, alto: 15840 }, // 21.59 × 27.94 cm
    oficio: { ancho: 12240, alto: 20160 }, // 21.59 × 35.56 cm
}
export const MARGENES_CM = { arriba: 2.5, abajo: 2.5, izquierda: 3, derecha: 2 } as const

const LETRA = 'Arial'
const CUERPO_TEXTO = 24 // 12 pt, en medios puntos
const TINTA = '111111'

function trozosDe(
    nodo: Node,
    negrita: boolean,
    cursiva: boolean,
    subrayado = false,
    fuente: string | null = null,
    cuerpo: number | null = null
): Trozo[] {
    if (nodo.nodeType === Node.TEXT_NODE) {
        const texto = (nodo.textContent ?? '').replace(/\u00a0/g, ' ')
        return texto === '' ? [...VACIO] : [{ texto, negrita, cursiva, subrayado, fuente, cuerpo }]
    }
    if (!(nodo instanceof HTMLElement)) return [...VACIO]

    const etiqueta = nodo.tagName.toLowerCase()
    if (etiqueta === 'br') return [{ texto: '', negrita, cursiva, subrayado, fuente, cuerpo, salto: true }]

    const estilo = nodo.style
    const peso = estilo.fontWeight
    const masNegrita =
        negrita || etiqueta === 'b' || etiqueta === 'strong' || peso === 'bold' || peso === 'bolder' ||
        (peso !== '' && Number.parseInt(peso, 10) >= 600)
    const masCursiva = cursiva || etiqueta === 'i' || etiqueta === 'em' || estilo.fontStyle === 'italic'
    const masSubrayado =
        subrayado || etiqueta === 'u' ||
        estilo.textDecorationLine.includes('underline') || estilo.textDecoration.includes('underline')

    const trozos: Trozo[] = []
    for (const hijo of Array.from(nodo.childNodes)) {
        trozos.push(
            ...trozosDe(hijo, masNegrita, masCursiva, masSubrayado,
                nombreDeFuente(estilo.fontFamily) ?? fuente, puntosDe(estilo.fontSize) ?? cuerpo)
        )
    }
    return trozos
}

function nombreDeFuente(valor: string): string | null {
    const primera = valor.split(',')[0]?.trim().replace(/^["']|["']$/g, '') ?? ''
    return primera === '' ? null : primera
}

function puntosDe(valor: string): number | null {
    const enPuntos = /^([\d.]+)pt$/.exec(valor.trim())
    if (enPuntos !== null) return Math.round(Number(enPuntos[1]))
    const enPixeles = /^([\d.]+)px$/.exec(valor.trim())
    if (enPixeles !== null) return Math.round((Number(enPixeles[1]) * 72) / 96)
    return null
}

function alineacionDe(nodo: HTMLElement): Alineacion | undefined {
    switch (nodo.style.textAlign) {
        case 'center': return 'centro'
        case 'right': return 'derecha'
        case 'justify': return 'justificado'
        case 'left': return 'izquierda'
        default: return undefined
    }
}

function interlineadoDe(nodo: HTMLElement): number | undefined {
    const v = Number.parseFloat(nodo.style.lineHeight)
    return Number.isFinite(v) && v >= 1 && v <= 3 ? v : undefined
}

function sangriaDe(nodo: HTMLElement): boolean | undefined {
    const v = Number.parseFloat(nodo.style.textIndent)
    return Number.isFinite(v) && v > 0 ? true : undefined
}

function tablaDeNodo(nodo: HTMLElement): Bloque | null {
    const filas: string[][] = []
    let encabezado: string[] = []
    for (const fila of Array.from(nodo.querySelectorAll('tr'))) {
        const celdas = Array.from(fila.children).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())
        if (celdas.length === 0) continue
        const esCabecera = Array.from(fila.children).some((c) => c.tagName.toLowerCase() === 'th')
        if (esCabecera && encabezado.length === 0 && filas.length === 0) encabezado = celdas
        else filas.push(celdas)
    }
    if (encabezado.length === 0 && filas.length === 0) return null
    const ancho = Math.max(encabezado.length, ...filas.map((f) => f.length))
    const cuadrar = (f: readonly string[]) => Array.from({ length: ancho }, (_, i) => f[i] ?? '')
    return { clase: 'tabla', encabezado: encabezado.length ? cuadrar(encabezado) : [], filas: filas.map(cuadrar) }
}

/** El árbol del editor a una lista plana de bloques. Nada del usuario se tira. */
export function bloquesDe(raiz: HTMLElement): Bloque[] {
    const bloques: Bloque[] = []
    let sueltos: Trozo[] = []
    const vaciarSueltos = () => {
        if (sueltos.some((t) => t.texto.trim() !== '')) bloques.push({ clase: 'parrafo', trozos: sueltos })
        sueltos = []
    }
    for (const hijo of Array.from(raiz.childNodes)) {
        if (!(hijo instanceof HTMLElement) || hijo.tagName.toLowerCase() === 'br' ||
            ['b', 'strong', 'i', 'em', 'u', 'span', 'font', 'a', 'mark', 'sup', 'sub'].includes(hijo.tagName.toLowerCase())) {
            sueltos.push(...trozosDe(hijo, false, false))
            continue
        }
        vaciarSueltos()
        const etiqueta = hijo.tagName.toLowerCase()
        if (etiqueta === 'ul' || etiqueta === 'ol') {
            const clase = etiqueta === 'ul' ? 'vineta' : 'numerada'
            for (const punto of Array.from(hijo.children)) {
                bloques.push({
                    clase,
                    trozos: trozosDe(punto, false, false),
                    alineacion: (punto instanceof HTMLElement ? alineacionDe(punto) : undefined) ?? alineacionDe(hijo),
                })
            }
            continue
        }
        if (etiqueta === 'table') {
            const t = tablaDeNodo(hijo)
            if (t) bloques.push(t)
            continue
        }
        const h = /^h([1-6])$/.exec(etiqueta)
        if (h) {
            const n = Number(h[1])
            bloques.push({ clase: 'titulo', nivel: n <= 1 ? 1 : n === 2 ? 2 : 3, trozos: trozosDe(hijo, false, false), alineacion: alineacionDe(hijo) })
            continue
        }
        if (etiqueta === 'hr') {
            bloques.push({ clase: 'parrafo', trozos: [{ texto: '', negrita: false, cursiva: false, subrayado: false, fuente: null, cuerpo: null }] })
            continue
        }
        // Un `div` con párrafos dentro (lo deja a veces el pegado) se recorre
        // como si sus hijos estuvieran sueltos en la raíz.
        if (etiqueta === 'div' && hijo.querySelector('p,h1,h2,h3,ul,ol,blockquote,table')) {
            bloques.push(...bloquesDe(hijo))
            continue
        }
        bloques.push({
            clase: etiqueta === 'blockquote' ? 'cita' : 'parrafo',
            trozos: trozosDe(hijo, false, false),
            alineacion: alineacionDe(hijo),
            interlineado: interlineadoDe(hijo),
            sangria: sangriaDe(hijo),
        })
    }
    vaciarSueltos()
    return bloques
}

export async function construirDocx(bloques: readonly Bloque[], papel: Papel): Promise<Blob> {
    const {
        AlignmentType, BorderStyle, Document, Footer, LevelFormat, PageNumber, Packer,
        Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, WidthType,
    } = await import('docx')

    const NUMERACION = 'lista-numerada'

    const corrido = (trozos: readonly Trozo[], extra?: { negrita?: boolean; cuerpo?: number }) =>
        trozos.map((t) =>
            t.salto
                ? new TextRun({ text: '', break: 1 })
                : new TextRun({
                      text: t.texto,
                      bold: (t.negrita || extra?.negrita) || undefined,
                      italics: t.cursiva || undefined,
                      underline: t.subrayado ? { type: UnderlineType.SINGLE } : undefined,
                      font: t.fuente ?? undefined,
                      size: t.cuerpo !== null ? t.cuerpo * 2 : extra?.cuerpo,
                      color: TINTA,
                  })
        )

    const alineado = (a?: Alineacion) => {
        switch (a) {
            case 'centro': return AlignmentType.CENTER
            case 'derecha': return AlignmentType.RIGHT
            case 'izquierda': return AlignmentType.LEFT
            case 'justificado': return AlignmentType.JUSTIFIED
            default: return undefined
        }
    }

    const cuerpo: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []
    for (const b of bloques) {
        if (b.clase === 'tabla') {
            const columnas = Math.max(b.encabezado.length, ...b.filas.map((f) => f.length))
            if (columnas === 0) continue
            const filete = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
            const celda = (texto: string, cabecera: boolean) =>
                new TableCell({
                    width: { size: Math.round(100 / columnas), type: WidthType.PERCENTAGE },
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    borders: { top: filete, bottom: filete, left: filete, right: filete },
                    children: [new Paragraph({ spacing: { before: 0, after: 0, line: 276 }, alignment: AlignmentType.LEFT,
                        children: [new TextRun({ text: texto, bold: cabecera || undefined, size: 22, color: TINTA })] })],
                })
            cuerpo.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    ...(b.encabezado.length ? [new TableRow({ tableHeader: true, children: b.encabezado.map((t) => celda(t, true)) })] : []),
                    ...b.filas.map((f) => new TableRow({ children: Array.from({ length: columnas }, (_, i) => celda(f[i] ?? '', false)) })),
                ],
            }))
            cuerpo.push(new Paragraph({ text: '', spacing: { after: 120 } }))
            continue
        }
        switch (b.clase) {
            case 'titulo':
                cuerpo.push(new Paragraph({
                    children: corrido(b.trozos, { negrita: true, cuerpo: b.nivel === 1 ? 26 : 24 }),
                    alignment: alineado(b.alineacion) ?? (b.nivel === 3 ? AlignmentType.LEFT : AlignmentType.CENTER),
                    spacing: { before: b.nivel === 1 ? 240 : 360, after: 240, line: 360 },
                    keepNext: true,
                }))
                break
            case 'cita':
                cuerpo.push(new Paragraph({
                    children: corrido(b.trozos, { cuerpo: 22 }),
                    alignment: alineado(b.alineacion) ?? AlignmentType.JUSTIFIED,
                    indent: { left: Math.round(1.25 * CM), right: Math.round(1.25 * CM) },
                    spacing: { before: 120, after: 240, line: 276 },
                }))
                break
            case 'vineta':
                cuerpo.push(new Paragraph({ children: corrido(b.trozos), alignment: alineado(b.alineacion) ?? AlignmentType.JUSTIFIED,
                    bullet: { level: 0 }, spacing: { after: 120, line: 360 } }))
                break
            case 'numerada':
                cuerpo.push(new Paragraph({ children: corrido(b.trozos), alignment: alineado(b.alineacion) ?? AlignmentType.JUSTIFIED,
                    numbering: { reference: NUMERACION, level: 0 }, spacing: { after: 120, line: 360 } }))
                break
            case 'parrafo':
                cuerpo.push(new Paragraph({
                    children: corrido(b.trozos),
                    alignment: alineado(b.alineacion) ?? AlignmentType.JUSTIFIED,
                    spacing: { after: 240, line: Math.round((b.interlineado ?? 1.5) * 240) },
                    indent: b.sangria ? { firstLine: Math.round(1.25 * CM) } : undefined,
                }))
                break
        }
    }

    const { ancho, alto } = PAPEL_TWIPS[papel]
    const documento = new Document({
        styles: {
            default: {
                document: {
                    run: { font: LETRA, size: CUERPO_TEXTO, color: TINTA },
                    paragraph: { spacing: { line: 360, after: 240 } },
                },
            },
        },
        numbering: {
            config: [{
                reference: NUMERACION,
                levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
            }],
        },
        sections: [{
            properties: {
                page: {
                    size: { width: ancho, height: alto },
                    margin: {
                        top: Math.round(MARGENES_CM.arriba * CM),
                        bottom: Math.round(MARGENES_CM.abajo * CM),
                        left: Math.round(MARGENES_CM.izquierda * CM),
                        right: Math.round(MARGENES_CM.derecha * CM),
                    },
                },
            },
            footers: {
                default: new Footer({
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ children: [PageNumber.CURRENT], size: 20, color: '555555', font: LETRA })],
                    })],
                }),
            },
            children: cuerpo.length ? cuerpo : [new Paragraph({})],
        }],
    })
    return await Packer.toBlob(documento)
}

export function nombreDeArchivo(titulo: string, extension: string): string {
    let limpio = (titulo || '')
        .replace(/[\\/:*?"<>| -]/g, ' ')
        .replace(/[.…]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (limpio.length > 60) {
        const cortado = limpio.slice(0, 60)
        const ultimo = cortado.lastIndexOf(' ')
        limpio = (ultimo > 20 ? cortado.slice(0, ultimo) : cortado).trim()
    }
    limpio = limpio.replace(/[\s,;:·—–-]+$/, '')
    return `${limpio || 'Demanda Iurexia'}.${extension}`
}

function descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export async function aWord(raiz: HTMLElement, titulo: string, papel: Papel): Promise<void> {
    const blob = await construirDocx(bloquesDe(raiz), papel)
    descargar(blob, nombreDeArchivo(titulo, 'docx'))
}

/**
 * IMPRIMIR O GUARDAR COMO PDF. Se imprime sólo la hoja: una ventana nueva con
 * el HTML del documento y la página en carta u oficio con los mismos márgenes
 * del Word. Imprimir la página del chat obligaría a esconder media aplicación
 * con reglas de impresión que se rompen en cuanto alguien toca la maqueta.
 */
export function imprimir(raiz: HTMLElement, titulo: string, papel: Papel): boolean {
    const v = window.open('', '_blank', 'noopener=no,width=900,height=1100')
    if (!v) return false
    const tam = papel === 'oficio' ? '21.59cm 35.56cm' : 'letter'
    const html = raiz.innerHTML
    v.document.open()
    v.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escaparHtml(titulo || 'Demanda')}</title>
<style>
@page { size: ${tam}; margin: ${MARGENES_CM.arriba}cm ${MARGENES_CM.derecha}cm ${MARGENES_CM.abajo}cm ${MARGENES_CM.izquierda}cm; }
html,body{margin:0;background:#fff;color:#111}
body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;text-align:justify}
p{margin:0 0 12pt}
h1{font-size:13pt;text-align:center;margin:12pt 0;font-weight:bold}
h2{font-size:12pt;text-align:center;margin:18pt 0 12pt;font-weight:bold}
h3{font-size:12pt;margin:14pt 0 10pt;font-weight:bold}
blockquote{margin:6pt 1.25cm 12pt;font-size:11pt;line-height:1.15}
ul,ol{margin:0 0 12pt 1cm;padding:0}
table{border-collapse:collapse;width:100%;margin:0 0 12pt}td,th{border:1px solid #999;padding:3pt 5pt;font-size:11pt}
h1,h2,h3{page-break-after:avoid}
</style></head><body>${html}</body></html>`)
    v.document.close()
    v.focus()
    window.setTimeout(() => { try { v.print() } catch { /* el usuario puede imprimir desde la ventana */ } }, 350)
    return true
}

function escaparHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
