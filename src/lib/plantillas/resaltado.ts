/**
 * LOS CAMPOS EN ORO SOBRE LA VISTA PREVIA (16-oct-2026). Sólo navegador.
 *
 * Se resalta con la MISMA regla con que el servidor marcará el Word
 * (`aparicionesDelParrafo` de campos.ts): lo que el abogado ve en oro es
 * exactamente lo que se va a llenar. Cada bloque (párrafo, título, celda,
 * punto de lista) se lee seguido aunque su texto venga partido en <strong>,
 * <em>…, y cada aparición se envuelve en un <mark data-campo>.
 *
 * El resultado es una cadena: React la pinta una vez por cambio de campos, en
 * vez de que el DOM se toque por fuera de React.
 */

import { aparicionesDelParrafo, LETRA_O_CIFRA, type CampoPlantilla } from './campos'

const BLOQUES = 'p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote'

export type EstadoMarca = 'aceptado' | 'quitado' | 'activo'

export interface Resaltado {
    html: string
    /** Apariciones visibles de cada campo en la vista previa. */
    cuenta: Map<string, number>
}

export const CLASE_MARCA: Record<EstadoMarca, string> = {
    aceptado: 'campo-marca cursor-pointer rounded-[3px] bg-[#f6e7c1] px-[1px] text-charcoal-900 shadow-[inset_0_-2px_0_#c9a962] transition-colors hover:bg-[#efd8a0]',
    activo: 'campo-marca cursor-pointer rounded-[3px] bg-[#e9c97f] px-[1px] text-charcoal-950 shadow-[0_0_0_2px_#c9a962] transition-colors',
    quitado: 'campo-marca cursor-pointer rounded-[3px] bg-transparent px-[1px] text-inherit underline decoration-[#bdab86] decoration-dashed decoration-1 underline-offset-4 transition-colors hover:bg-[#f3eee3]',
}

/**
 * Los quitados también se pintan (con raya punteada): así el abogado ve lo
 * que dejó fuera y lo vuelve a poner con un clic. Pero sólo donde no pisan a
 * uno aceptado: en el Word sólo entran los aceptados, y si un quitado más
 * largo le ganara el lugar aquí, el oro mentiría.
 */
export function resaltar(html: string, campos: readonly (CampoPlantilla & { aceptado: boolean })[], activo: string | null): Resaltado {
    const cuenta = new Map<string, number>(campos.map((c) => [c.clave, 0]))
    if (typeof window === 'undefined' || !html) return { html, cuenta }
    const doc = new DOMParser().parseFromString(`<div id="raiz">${html}</div>`, 'text/html')
    const raiz = doc.getElementById('raiz')
    if (!raiz) return { html, cuenta }
    const aceptados = campos.filter((c) => c.aceptado)
    const quitados = campos.filter((c) => !c.aceptado)
    const estadoDe = (clave: string): EstadoMarca => {
        const c = campos.find((x) => x.clave === clave)
        if (!c?.aceptado) return 'quitado'
        return clave === activo ? 'activo' : 'aceptado'
    }

    // Sólo los bloques que no contienen otro bloque: una celda con párrafos
    // dentro se resalta por sus párrafos, no dos veces.
    const bloques = Array.from(raiz.querySelectorAll(BLOQUES)).filter((b) => !b.querySelector(BLOQUES))
    for (const bloque of bloques) {
        // El texto seguido del bloque y de qué nodo sale cada tramo. Un <br>
        // cuenta como salto (\n) y, como en el Word, no se puede cruzar.
        const tramos: { nodo: Text; inicio: number }[] = []
        const prohibidas: number[] = []
        let texto = ''
        const caminante = doc.createTreeWalker(bloque, 0x1 | 0x4) // elementos y texto
        for (let n = caminante.nextNode(); n; n = caminante.nextNode()) {
            if (n.nodeType === 3) {
                const t = (n as Text).data
                for (let k = 0; k < t.length; k++) if (t[k] === '\t' || t[k] === '\u2011' || t[k] === '\ufffc') prohibidas.push(texto.length + k)
                tramos.push({ nodo: n as Text, inicio: texto.length })
                texto += t
            } else if ((n as Element).tagName === 'BR') {
                prohibidas.push(texto.length)
                texto += '\n'
            }
        }
        if (!texto.trim()) continue
        const buenas = aparicionesDelParrafo(texto, aceptados, prohibidas)
        const fuera = aparicionesDelParrafo(texto, quitados, prohibidas)
            .filter((q) => !buenas.some((b) => q.desde < b.hasta && b.desde < q.hasta))
        const aps = [...buenas, ...fuera].sort((x, y) => x.desde - y.desde)
        // De atrás para adelante: partir un nodo de texto no mueve lo anterior.
        for (const a of [...aps].reverse()) {
            cuenta.set(a.clave, (cuenta.get(a.clave) ?? 0) + 1)
            for (const tramo of [...tramos].reverse()) {
                const largo = tramo.nodo.data.length
                const ini = Math.max(a.desde, tramo.inicio) - tramo.inicio
                const fin = Math.min(a.hasta, tramo.inicio + largo) - tramo.inicio
                if (fin <= ini || ini >= largo) continue
                const medio = tramo.nodo.splitText(ini)
                medio.splitText(fin - ini)
                const marca = doc.createElement('mark')
                marca.setAttribute('data-campo', a.clave)
                marca.className = CLASE_MARCA[estadoDe(a.clave)]
                medio.parentNode?.replaceChild(marca, medio)
                marca.appendChild(medio)
            }
        }
    }
    return { html: raiz.innerHTML, cuenta }
}

/** Encabezados y pies, que llegan como texto: a párrafos de HTML. */
export function parrafosAHtml(parrafos: readonly string[]): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return parrafos.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
}

/**
 * El texto que el abogado seleccionó dentro de la vista previa, si sirve como
 * campo. SE AJUSTA A PALABRAS ENTERAS: arrastrar el ratón casi nunca cae justo
 * en el borde, y «Roberto Garza Medin» no aparecería nunca como palabra entera
 * (ver `aparicionesEn`). Tampoco se lleva la coma o el punto y coma del final.
 */
export function seleccionComoCampo(contenedor: HTMLElement | null): { texto: string; rect: DOMRect } | null {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null
    if (!contenedor || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null
    const rango = sel.getRangeAt(0)
    if (!contenedor.contains(rango.commonAncestorContainer)) return null
    let texto = sel.toString()
    const inicio = rango.startContainer instanceof Element ? rango.startContainer : rango.startContainer.parentElement
    const bloque = inicio?.closest(BLOQUES)
    if (bloque && bloque.contains(rango.endContainer)) {
        const previo = document.createRange()
        previo.selectNodeContents(bloque)
        previo.setEnd(rango.startContainer, rango.startOffset)
        const todo = bloque.textContent ?? ''
        let a = previo.toString().length
        let b = a + texto.length
        // Sólo si los desplazamientos cuadran con lo seleccionado (un bloque raro
        // podría contar distinto); si no, se queda la selección tal cual.
        if (todo.slice(a, b) === texto) {
            while (a > 0 && LETRA_O_CIFRA.test(todo[a - 1]) && LETRA_O_CIFRA.test(todo[a])) a--
            while (b < todo.length && LETRA_O_CIFRA.test(todo[b]) && LETRA_O_CIFRA.test(todo[b - 1])) b++
            texto = todo.slice(a, b)
        }
    }
    texto = texto.replace(/\u00a0/g, ' ').replace(/[ ]{2,}/g, ' ').trim().replace(/[,;:]+$/, '').trim()
    if (texto.length < 2 || texto.length > 160 || /[\n\r\t]/.test(texto)) return null
    const rect = rango.getBoundingClientRect()
    if (!rect || (rect.width === 0 && rect.height === 0)) return null
    return { texto, rect }
}
