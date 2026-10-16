/**
 * EL XML DE WORD, PÁRRAFO POR PÁRRAFO (16-oct-2026).
 *
 * Un párrafo de Word (`<w:p>`) guarda su texto repartido en «corridas»
 * (`<w:r>`), cada una con su formato y su `<w:t>`. Word parte el texto donde
 * quiere: por un cambio de formato, por la revisión ortográfica, por haber
 * escrito una palabra en dos sesiones. Así que «Juan Pérez López» puede vivir
 * en tres `<w:t>` distintos, y un buscar-y-reemplazar sobre el XML no lo
 * encuentra nunca.
 *
 * Aquí se lee el texto de cada párrafo SEGUIDO —con un mapa de qué tramo vive
 * en qué `<w:t>`— y se reescribe sin tocar nada más del XML: ni formato, ni
 * tablas, ni imágenes, ni campos de Word. El reemplazo cae en el `<w:t>` donde
 * empieza el texto (conserva el formato de esa primera corrida) y los tramos
 * siguientes se vacían.
 *
 * Sin dependencias y sin DOM: corre igual en el servidor y en el navegador. No
 * es un intérprete de XML general; es uno para el XML que escribe Word (sin
 * DTD), con comillas en los atributos, comentarios e instrucciones.
 */

export interface Segmento {
    /** La etiqueta de apertura `<w:t …>` en el XML. */
    tagDesde: number
    /** Donde empieza y termina el texto (sin etiquetas) en el XML. */
    xmlDesde: number
    xmlHasta: number
    /** El texto ya decodificado (&amp; → &). */
    texto: string
    /** Dónde empieza dentro del texto del párrafo. */
    inicio: number
}

export interface Parrafo {
    /** El texto del párrafo. Tabuladores y saltos van como \t y \n. */
    texto: string
    segmentos: Segmento[]
    /** Posiciones del texto que no son de ningún `<w:t>` (tabulador, salto,
        guion de Word…): un reemplazo no las puede cruzar. */
    virtuales: number[]
    /** Copia de respaldo dentro de `mc:Fallback` (la que leen los Word viejos):
        se marca igual, pero no se lee ni se cuenta dos veces. */
    respaldo: boolean
    /** Dentro de una tabla. */
    enTabla: boolean
    /** Dónde empieza el párrafo en el XML: da el orden de lectura. */
    desde: number
}

// ─── Entidades ───────────────────────────────────────────────────────────────

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function decodificar(s: string): string {
    if (s.indexOf('&') < 0) return s
    return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (m, e: string) => {
        if (e[0] === '#') {
            const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
            return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m
        }
        return ENTIDADES[e] ?? m
    })
}

export function codificar(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── El recorrido ────────────────────────────────────────────────────────────

/** Lo que vale como carácter en el texto aunque no sea un `<w:t>`. */
const VIRTUALES: Record<string, string> = {
    'w:tab': '\t',
    'w:ptab': '\t',
    'w:br': '\n',
    'w:cr': '\n',
    'w:noBreakHyphen': '\u2011',
    'w:sym': '\ufffc',
}

/** Dentro de estos elementos el texto está borrado (control de cambios). */
const BORRADO = new Set(['w:del', 'w:moveFrom'])

function esFinDeNombre(c: string): boolean {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '/' || c === '>'
}

/**
 * Los párrafos de una parte del documento (`word/document.xml`, un
 * encabezado, un pie), en orden de lectura. Un párrafo dentro de un cuadro de
 * texto es un párrafo aparte, como lo ve Word.
 */
export function leerParrafos(xml: string): Parrafo[] {
    const fuera: Parrafo[] = []
    const pila: string[] = []
    const abiertos: Parrafo[] = []
    let respaldo = 0, borrado = 0, tabla = 0
    const n = xml.length
    let i = 0
    while (i < n) {
        const lt = xml.indexOf('<', i)
        if (lt < 0) break
        if (xml.startsWith('<?', lt)) { const f = xml.indexOf('?>', lt); i = f < 0 ? n : f + 2; continue }
        if (xml.startsWith('<!--', lt)) { const f = xml.indexOf('-->', lt); i = f < 0 ? n : f + 3; continue }
        if (xml.startsWith('<![CDATA[', lt)) { const f = xml.indexOf(']]>', lt); i = f < 0 ? n : f + 3; continue }
        if (xml.startsWith('<!', lt)) { const f = xml.indexOf('>', lt); i = f < 0 ? n : f + 1; continue }

        const cierre = xml.charCodeAt(lt + 1) === 47 // '/'
        const ini = lt + (cierre ? 2 : 1)
        let k = ini
        while (k < n && !esFinDeNombre(xml[k])) k++
        const nombre = xml.slice(ini, k)
        // Fin de la etiqueta, respetando las comillas de los atributos.
        let q = '', m = k
        for (; m < n; m++) {
            const c = xml[m]
            if (q) { if (c === q) q = '' }
            else if (c === '"' || c === "'") q = c
            else if (c === '>') break
        }
        const finTag = m + 1
        const vacio = !cierre && xml[m - 1] === '/'
        i = finTag

        if (cierre) {
            // Cierra hasta el elemento de ese nombre (el XML de Word está bien
            // formado; esto sólo protege de un descuadre).
            const idx = pila.lastIndexOf(nombre)
            if (idx >= 0) {
                for (let x = pila.length - 1; x >= idx; x--) {
                    const sale = pila[x]
                    if (sale === 'w:p') { const p = abiertos.pop(); if (p) fuera.push(p) }
                    else if (sale === 'mc:Fallback') respaldo--
                    else if (sale === 'w:tbl') tabla--
                    else if (BORRADO.has(sale)) borrado--
                }
                pila.length = idx
            }
            continue
        }

        if (nombre === 'w:t') {
            if (vacio) continue
            const fin = xml.indexOf('</w:t>', finTag)
            if (fin < 0) { i = n; continue }
            const p = abiertos[abiertos.length - 1]
            if (p && !borrado) {
                const texto = decodificar(xml.slice(finTag, fin))
                if (texto) {
                    p.segmentos.push({ tagDesde: lt, xmlDesde: finTag, xmlHasta: fin, texto, inicio: p.texto.length })
                    p.texto += texto
                }
            }
            i = fin + 6
            continue
        }

        if (nombre === 'w:p') {
            const p: Parrafo = { texto: '', segmentos: [], virtuales: [], respaldo: respaldo > 0, enTabla: tabla > 0, desde: lt }
            if (vacio) { fuera.push(p); continue }
            abiertos.push(p)
            pila.push(nombre)
            continue
        }

        const virtual = VIRTUALES[nombre]
        if (virtual !== undefined && pila[pila.length - 1] === 'w:r' && !borrado) {
            const p = abiertos[abiertos.length - 1]
            if (p) { p.virtuales.push(p.texto.length); p.texto += virtual }
            if (!vacio) pila.push(nombre)
            continue
        }

        if (vacio) continue
        pila.push(nombre)
        if (nombre === 'mc:Fallback') respaldo++
        else if (nombre === 'w:tbl') tabla++
        else if (BORRADO.has(nombre)) borrado++
    }
    // Lo que quedara abierto (un XML cortado) también se lee.
    while (abiertos.length) fuera.push(abiertos.pop()!)
    return fuera.sort((a, b) => a.desde - b.desde)
}

// ─── La reescritura ──────────────────────────────────────────────────────────

/** Un tramo del texto del párrafo que se cambia por otro. */
export interface Reemplazo {
    desde: number
    hasta: number
    nuevo: string
}

export interface Edicion {
    segmento: Segmento
    texto: string
}

/**
 * Cómo queda cada `<w:t>` tocado por los reemplazos (ordenados y sin
 * encimarse). El texto nuevo entra en el segmento donde EMPIEZA el tramo, con
 * el formato de esa corrida; lo que el tramo cubría en los segmentos
 * siguientes se borra de ellos.
 */
export function edicionesDe(p: Parrafo, reemplazos: readonly Reemplazo[]): Edicion[] {
    const fuera: Edicion[] = []
    if (reemplazos.length === 0) return fuera
    for (const s of p.segmentos) {
        const sIni = s.inicio, sFin = s.inicio + s.texto.length
        let texto = '', cursor = sIni, tocado = false
        for (const r of reemplazos) {
            if (r.hasta <= sIni || r.desde >= sFin) continue
            tocado = true
            if (r.desde > cursor) texto += s.texto.slice(cursor - sIni, r.desde - sIni)
            if (r.desde >= sIni) texto += r.nuevo
            cursor = Math.max(cursor, Math.min(r.hasta, sFin))
        }
        if (!tocado) continue
        if (cursor < sFin) texto += s.texto.slice(cursor - sIni)
        fuera.push({ segmento: s, texto })
    }
    return fuera
}

/** Aplica las ediciones al XML. Cada `<w:t>` tocado queda con
    `xml:space="preserve"` para que Word no se coma los espacios de los bordes. */
export function aplicarEdiciones(xml: string, ediciones: readonly Edicion[]): string {
    if (ediciones.length === 0) return xml
    const orden = [...ediciones].sort((a, b) => a.segmento.tagDesde - b.segmento.tagDesde)
    let fuera = ''
    let cursor = 0
    for (const e of orden) {
        if (e.segmento.tagDesde < cursor) continue // no debería pasar: dos ediciones al mismo <w:t>
        fuera += xml.slice(cursor, e.segmento.tagDesde)
        fuera += '<w:t xml:space="preserve">' + codificar(e.texto)
        cursor = e.segmento.xmlHasta
    }
    return fuera + xml.slice(cursor)
}
