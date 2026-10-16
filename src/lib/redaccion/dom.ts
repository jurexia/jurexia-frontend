/**
 * «CAMBIAR REDACCIÓN» EN EL DOM DE LA HOJA (16-oct-2026).
 *
 * EL CAMBIO PROPUESTO, CÓMO SE ARMA. La selección toca uno o varios nodos de
 * primer nivel de la hoja (sus párrafos, listas, títulos). Esos nodos ORIGINALES
 * se sacan de la hoja intactos —no se toca ni un carácter— y se guardan en
 * memoria; en su lugar entra UNA envoltura `<div data-cambio="id">` (el contrato
 * de `@/lib/documento/cambios`) con una copia de ellos donde:
 *
 *   · cada trozo seleccionado —texto o ficha de cita— queda dentro de un
 *     `<del class="cambio-del">`, en su sitio, sin mover nada;
 *   · lo propuesto entra en UN `<ins class="cambio-ins">` justo detrás del
 *     último trozo tachado. Si la propuesta trae varios párrafos, dentro del
 *     `<ins>` se separan con `<span class="cambio-salto">` (un salto con aire,
 *     por CSS): nunca un `<p>` dentro de un elemento de línea.
 *
 * Así el HTML es válido con la selección en medio de un párrafo, en varios
 * párrafos o cruzando una lista, y se lee como en Word: lo tachado y, detrás,
 * lo subrayado.
 *
 * LAS TRES SALIDAS:
 *   · RECHAZAR devuelve a la hoja los nodos originales —los mismos objetos—:
 *     el HTML queda EXACTAMENTE como estaba, y el deshacer del navegador, que
 *     guarda referencias a esos nodos, vuelve a cuadrar.
 *   · ACEPTAR se construye aparte, sobre otra copia de los originales, con las
 *     operaciones de rango del DOM (`construirAceptado`): lo seleccionado sale,
 *     el primer párrafo nuevo ocupa su lugar y los demás son párrafos de verdad
 *     del mismo tipo y formato que aquel donde terminaba la selección (un punto
 *     de lista da puntos de lista; un título, renglones dentro del título).
 *   · UNA ENVOLTURA HUÉRFANA —guardada en un borrador a medio revisar— se
 *     resuelve sin memoria, desde el propio DOM: fuera el `<ins>`, fuera los
 *     `<del>` conservando su contenido, fuera la envoltura. Como la envoltura
 *     sólo AÑADE elementos, eso devuelve el texto original.
 *
 * LAS FICHAS DE CITA viajan al modelo como marcadores ⟦n⟧ (ver
 * `./marcadores`) y vuelven como copias de la ficha original, con su mismo
 * `data-doc-id`, número y atributos.
 */

import { ATRIBUTO_CAMBIO } from '@/lib/documento/cambios';
import { marcador, parrafosDe, type Segmento } from './marcadores';
import { LIMITES_REDACCION } from './opciones';

/* ═══ LEER LA SELECCIÓN (también en Node: la comprobación no tiene DOM) ═══ */

/** Lo mínimo de un nodo que hace falta para leerlo. El DOM del navegador lo
 *  cumple; `comprobaciones/redaccion.mjs` lo imita con un analizador pequeño. */
export interface NodoLeible {
    nodeType: number;
    nodeName: string;
    nodeValue: string | null;
    childNodes: ArrayLike<NodoLeible>;
    getAttribute?: (nombre: string) => string | null;
}

/** Lo que separa párrafos al leer: los bloques de la hoja y sus contenedores. */
const ES_BLOQUE = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE|TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|SECTION|ARTICLE|HR|DL|DT|DD|FIGURE|FIGCAPTION)$/;

/** ¿Es una ficha de cita de la hoja? (`htmlDeDocumento` en `@/lib/documento/citas`) */
export function esFicha(n: NodoLeible): boolean {
    if (n.nodeType !== 1 || !n.getAttribute) return false;
    return /(^|\s)citation-badge(\s|$)/.test(n.getAttribute('class') || '') && !!n.getAttribute('data-doc-id');
}

function leer(raiz: NodoLeible, conMarcadores: boolean): { texto: string; fichas: NodoLeible[] } {
    const fichas: NodoLeible[] = [];
    const trozos: string[] = [];
    const visitar = (n: NodoLeible) => {
        if (n.nodeType === 3) {
            // Como se ve: los blancos seguidos son uno, el salto del código fuente
            // es un espacio, y un ⟦ escrito a mano no se confunde con un marcador.
            trozos.push((n.nodeValue || '').replace(/\s+/g, ' ').replace(/⟦/g, '[').replace(/⟧/g, ']'));
            return;
        }
        if (n.nodeType === 1) {
            if (esFicha(n)) {
                if (conMarcadores) { fichas.push(n); trozos.push(marcador(fichas.length)); }
                return;
            }
            const nombre = n.nodeName.toUpperCase();
            if (nombre === 'BR') { trozos.push('\n'); return; }
            if (nombre === 'SCRIPT' || nombre === 'STYLE' || nombre === 'TEMPLATE') return;
            const bloque = ES_BLOQUE.test(nombre);
            if (bloque) trozos.push('\n\n');
            for (let i = 0; i < n.childNodes.length; i++) visitar(n.childNodes[i]);
            if (bloque) trozos.push('\n\n');
            return;
        }
        // El fragmento de un rango (11) o un documento (9): sólo sus hijos.
        if (n.nodeType === 11 || n.nodeType === 9) {
            for (let i = 0; i < n.childNodes.length; i++) visitar(n.childNodes[i]);
        }
    };
    visitar(raiz);
    const texto = trozos.join('')
        .replace(/ {2,}/g, ' ')
        .replace(/ ?\n ?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return { texto, fichas };
}

/**
 * EL TEXTO DE LA SELECCIÓN TAL COMO LO VE EL MODELO: párrafos separados por una
 * línea en blanco, los `<br>` como salto simple y cada ficha como ⟦n⟧ por orden
 * de aparición. `fichas[n-1]` es la ficha del marcador n.
 *
 * Es determinista: el menú lo calcula al pedir y otra vez al recibir, y si los
 * dos no coinciden es que el abogado tocó el texto mientras tanto.
 */
export function textoConMarcadores(raiz: NodoLeible): { texto: string; fichas: NodoLeible[] } {
    return leer(raiz, true);
}

/** El contexto de alrededor, sin fichas: para que el modelo lea, no para reescribir. */
export function textoPlano(raiz: NodoLeible): string {
    return leer(raiz, false).texto;
}

/* ═══ EN EL NAVEGADOR ═════════════════════════════════════════════════════ */

export const CLASE_ENVOLTURA = 'cambio-propuesto';
export const CLASE_DEL = 'cambio-del';
export const CLASE_INS = 'cambio-ins';
export const CLASE_SALTO = 'cambio-salto';

/** Lo que se toma entero o no se toma: saltos, rayas, imágenes y lo no editable (las fichas). */
const ATOMO = /^(BR|HR|IMG|WBR)$/;
/** Los bloques que llevan texto. Un DIV lo es sólo si no contiene otros bloques. */
const BLOQUE_DE_TEXTO = /^(P|LI|H[1-6]|BLOCKQUOTE|TD|TH|PRE|DT|DD|FIGCAPTION)$/;
const CONTIENE_BLOQUES = 'p,div,li,ul,ol,h1,h2,h3,h4,h5,h6,blockquote,table,pre';
/** Donde los párrafos nuevos son párrafos (o puntos de lista). En un título, una
 *  cita textual o una celda, los párrafos de la propuesta van en renglones. */
const PARTIBLE = /^(P|LI|DIV)$/;
const BLANCO = /[\s​﻿]/;

function esAtomo(n: Node): boolean {
    return n.nodeType === 1 && (ATOMO.test(n.nodeName) || (n as Element).getAttribute('contenteditable') === 'false');
}

/** La isla no editable más externa que contiene al nodo (una ficha), o null. */
function islaDe(n: Node, raiz: Node): Element | null {
    let isla: Element | null = null;
    for (let x: Node | null = n; x && x !== raiz; x = x.parentNode) {
        if (x.nodeType === 1 && (x as Element).getAttribute('contenteditable') === 'false') isla = x as Element;
    }
    return isla;
}

/** El bloque con texto que contiene al nodo, sin pasar de `limite`; null si es texto suelto en la raíz. */
export function bloqueDe(nodo: Node | null, limite: Node): HTMLElement | null {
    for (let x: Node | null = nodo && nodo.nodeType === 3 ? nodo.parentNode : nodo; x && x !== limite; x = x.parentNode) {
        if (x.nodeType !== 1) continue;
        const el = x as HTMLElement;
        if (BLOQUE_DE_TEXTO.test(el.tagName)) return el;
        if (el.tagName === 'DIV' && !el.querySelector(CONTIENE_BLOQUES)) return el;
    }
    return null;
}

/** El nodo donde empieza o termina el rango, también cuando el borde cae entre hijos. */
function nodoInicial(r: Range): Node {
    const c = r.startContainer;
    return c.nodeType !== 3 && c.childNodes[r.startOffset] ? c.childNodes[r.startOffset] : c;
}
function nodoFinal(r: Range): Node {
    const c = r.endContainer;
    return c.nodeType !== 3 && r.endOffset > 0 && c.childNodes[r.endOffset - 1] ? c.childNodes[r.endOffset - 1] : c;
}

function contieneEntero(r: Range, nodo: Node): boolean {
    const n = (nodo.ownerDocument || document).createRange();
    n.selectNode(nodo);
    return r.compareBoundaryPoints(Range.START_TO_START, n) <= 0 && r.compareBoundaryPoints(Range.END_TO_END, n) >= 0;
}

interface Unidad { nodo: Node; desde: number; hasta: number }

/** Los trozos de texto y los átomos que el rango toca de verdad, en orden. */
function unidadesDe(r: Range): Unidad[] {
    const salida: Unidad[] = [];
    const base = r.commonAncestorContainer;
    if (base.nodeType === 3) {
        if (r.endOffset > r.startOffset) salida.push({ nodo: base, desde: r.startOffset, hasta: r.endOffset });
        return salida;
    }
    const recorrer = (padre: Node) => {
        for (let h = padre.firstChild; h; h = h.nextSibling) {
            if (!r.intersectsNode(h)) continue;
            if (h.nodeType === 3) {
                const desde = h === r.startContainer ? r.startOffset : 0;
                const hasta = h === r.endContainer ? r.endOffset : (h as Text).length;
                if (hasta > desde) salida.push({ nodo: h, desde, hasta });
            } else if (h.nodeType === 1) {
                if (esAtomo(h)) { if (contieneEntero(r, h)) salida.push({ nodo: h, desde: 0, hasta: 1 }); }
                else recorrer(h);
            }
        }
    };
    if (!esAtomo(base)) recorrer(base);
    return salida;
}

/** Sin blancos ni saltos sueltos en los bordes: lo que se cambia empieza y acaba en letra (o en ficha). */
function recortarBlancos(r: Range): void {
    const unidades = unidadesDe(r);
    const separador = (n: Node) => /^(BR|WBR|HR)$/.test(n.nodeName);
    let hallado = false;
    for (const u of unidades) {
        if (u.nodo.nodeType === 1) {
            if (separador(u.nodo)) continue;
            r.setStartBefore(u.nodo); hallado = true; break;
        }
        const t = (u.nodo as Text).data;
        let i = u.desde;
        while (i < u.hasta && BLANCO.test(t.charAt(i))) i++;
        if (i < u.hasta) { r.setStart(u.nodo, i); hallado = true; break; }
    }
    if (!hallado) { r.collapse(true); return; }
    for (let k = unidades.length - 1; k >= 0; k--) {
        const u = unidades[k];
        if (u.nodo.nodeType === 1) {
            if (separador(u.nodo)) continue;
            r.setEndAfter(u.nodo); return;
        }
        const t = (u.nodo as Text).data;
        let j = u.hasta;
        while (j > u.desde && BLANCO.test(t.charAt(j - 1))) j--;
        if (j > u.desde) { r.setEnd(u.nodo, j); return; }
    }
}

/**
 * LA SELECCIÓN, LISTA PARA CAMBIARSE: dentro de la hoja, sin blancos en los
 * bordes (el espacio que un doble clic arrastra se queda fuera del cambio) y sin
 * cortar una ficha por la mitad (se toma entera). Null si no queda nada.
 */
export function prepararRango(original: Range, raiz: HTMLElement): Range | null {
    if (original.collapsed) return null;
    if (!raiz.contains(original.startContainer) || !raiz.contains(original.endContainer)) return null;
    const r = original.cloneRange();
    const islaInicio = islaDe(r.startContainer, raiz);
    if (islaInicio) r.setStartBefore(islaInicio);
    const islaFin = islaDe(r.endContainer, raiz);
    if (islaFin) r.setEndAfter(islaFin);
    recortarBlancos(r);
    return r.collapsed ? null : r;
}

/** ¿La selección toca un cambio sin resolver? Entonces no se puede cambiar encima. */
export function tocaCambio(r: Range, raiz: HTMLElement): boolean {
    const cambios = raiz.querySelectorAll(`[${ATRIBUTO_CAMBIO}]`);
    for (let i = 0; i < cambios.length; i++) if (r.intersectsNode(cambios[i])) return true;
    return false;
}

function hijoEnRaiz(contenedor: Node, offset: number, raiz: Node, esFin: boolean): Node | null {
    if (contenedor === raiz) return raiz.childNodes[esFin ? offset - 1 : offset] ?? null;
    let x: Node | null = contenedor;
    while (x && x.parentNode !== raiz) x = x.parentNode;
    return x;
}

/** Los nodos de primer nivel de la hoja que toca el rango, del primero al último. */
export function topsDe(r: Range, raiz: HTMLElement): ChildNode[] | null {
    const a = hijoEnRaiz(r.startContainer, r.startOffset, raiz, false);
    const b = hijoEnRaiz(r.endContainer, r.endOffset, raiz, true);
    if (!a || !b) return null;
    const hijos = Array.from(raiz.childNodes);
    const i = hijos.indexOf(a as ChildNode);
    const j = hijos.indexOf(b as ChildNode);
    return i < 0 || j < i ? null : hijos.slice(i, j + 1);
}

/** Un borde del rango dicho por posiciones: el primer número es el nodo de primer
 *  nivel (de `tops`), los demás bajan por los hijos. Camino vacío = la raíz. */
export interface Ruta { camino: number[]; offset: number }

function rutaDe(contenedor: Node, offset: number, raiz: Node, tops: ChildNode[]): Ruta | null {
    if (contenedor === raiz) {
        return { camino: [], offset: offset - Array.prototype.indexOf.call(raiz.childNodes, tops[0]) };
    }
    const camino: number[] = [];
    let x: Node = contenedor;
    while (x.parentNode && x.parentNode !== raiz) {
        camino.unshift(Array.prototype.indexOf.call(x.parentNode.childNodes, x));
        x = x.parentNode;
    }
    const t = tops.indexOf(x as ChildNode);
    if (t < 0) return null;
    camino.unshift(t);
    return { camino, offset };
}

/** Lo que hace falta para rehacer el cambio cuantas veces se quiera sobre copias. */
export interface Plano {
    /** Los nodos de primer nivel que toca la selección: los ORIGINALES, intactos. */
    tops: ChildNode[];
    inicio: Ruta;
    fin: Ruta;
    /** Copias de las fichas de lo seleccionado: la n-ésima es el marcador ⟦n⟧. */
    fichas: Element[];
}

export function planoDe(r: Range, raiz: HTMLElement, fichas: Element[]): Plano | null {
    const tops = topsDe(r, raiz);
    if (!tops) return null;
    const inicio = rutaDe(r.startContainer, r.startOffset, raiz, tops);
    const fin = rutaDe(r.endContainer, r.endOffset, raiz, tops);
    return inicio && fin ? { tops, inicio, fin, fichas } : null;
}

function nodoDe(ruta: Ruta, base: Node): Node | null {
    let x: Node | null = base;
    for (let i = 0; i < ruta.camino.length && x; i++) x = x.childNodes[ruta.camino[i]] ?? null;
    return x;
}

/** Copia de los originales en un contenedor aparte, con el rango puesto en la copia. */
function copiar(plano: Plano): { caja: HTMLDivElement; rango: Range } | null {
    const caja = document.createElement('div');
    plano.tops.forEach((n) => caja.appendChild(n.cloneNode(true)));
    const a = nodoDe(plano.inicio, caja);
    const b = nodoDe(plano.fin, caja);
    if (!a || !b) return null;
    const rango = document.createRange();
    try {
        rango.setStart(a, plano.inicio.offset);
        rango.setEnd(b, plano.fin.offset);
    } catch {
        return null;
    }
    return { caja, rango };
}

/** El rango del plano sobre los ORIGINALES, ya devueltos a la hoja. */
export function rangoEnVivo(plano: Plano, raiz: HTMLElement): Range | null {
    const base = Array.prototype.indexOf.call(raiz.childNodes, plano.tops[0]);
    if (base < 0) return null;
    const punto = (ruta: Ruta): [Node, number] | null => {
        if (!ruta.camino.length) return [raiz, base + ruta.offset];
        const n = nodoDe({ camino: ruta.camino.slice(1), offset: 0 }, plano.tops[ruta.camino[0]]);
        return n ? [n, ruta.offset] : null;
    };
    const a = punto(plano.inicio);
    const b = punto(plano.fin);
    if (!a || !b) return null;
    try {
        const r = document.createRange();
        r.setStart(a[0], a[1]);
        r.setEnd(b[0], b[1]);
        return r;
    } catch {
        return null;
    }
}

/** Un párrafo de la propuesta como nodos: texto, saltos de renglón y copias de las fichas. */
function fragmentoDe(segmentos: Segmento[], fichas: Element[]): DocumentFragment {
    const f = document.createDocumentFragment();
    segmentos.forEach((s) => {
        if (s.tipo === 'texto') f.appendChild(document.createTextNode(s.valor));
        else if (s.tipo === 'salto') f.appendChild(document.createElement('br'));
        else {
            const ficha = fichas[s.n - 1];
            if (ficha) f.appendChild(ficha.cloneNode(true));
        }
    });
    return f;
}

/** Varios párrafos en uno, separados por renglón: para un título, una cita textual o una celda. */
function enRenglones(parrafos: Segmento[][]): Segmento[] {
    const salida: Segmento[] = [];
    parrafos.forEach((p, i) => {
        if (i > 0) salida.push({ tipo: 'salto' });
        salida.push(...p);
    });
    return salida;
}

/**
 * LA ENVOLTURA DEL CAMBIO PENDIENTE (ver arriba): la copia de los originales con
 * lo seleccionado tachado y lo propuesto subrayado detrás. No toca la hoja: el
 * menú la pone en lugar de los originales.
 */
export function construirPendiente(plano: Plano, propuesta: string, id: string): HTMLElement | null {
    const copia = copiar(plano);
    if (!copia) return null;
    const { caja, rango } = copia;
    const final = bloqueDe(nodoFinal(rango), caja);
    const partible = !!final && PARTIBLE.test(final.tagName);
    const parrafos = parrafosDe(propuesta);
    if (!parrafos.length) return null;

    // 1. Lo seleccionado, tachado en su sitio: cada trozo de texto y cada átomo.
    const nodos: Node[] = [];
    unidadesDe(rango).forEach((u) => {
        if (u.nodo.nodeType !== 3) { nodos.push(u.nodo); return; }
        let t = u.nodo as Text;
        if (u.desde > 0) t = t.splitText(u.desde);
        const largo = u.hasta - u.desde;
        if (largo < t.length) t.splitText(largo);
        nodos.push(t);
    });
    if (!nodos.length) return null;
    let ultimoDel: HTMLElement | null = null;
    for (let i = 0; i < nodos.length;) {
        let j = i + 1;
        while (j < nodos.length && nodos[j] === nodos[j - 1].nextSibling) j++;
        const del = document.createElement('del');
        del.className = CLASE_DEL;
        nodos[i].parentNode?.insertBefore(del, nodos[i]);
        for (let k = i; k < j; k++) del.appendChild(nodos[k]);
        ultimoDel = del;
        i = j;
    }

    // 2. Lo propuesto, subrayado, justo detrás de lo último tachado.
    const ins = document.createElement('ins');
    ins.className = CLASE_INS;
    parrafos.forEach((segmentos, k) => {
        if (k > 0) {
            if (partible) {
                const salto = document.createElement('span');
                salto.className = CLASE_SALTO;
                salto.setAttribute('aria-hidden', 'true');
                ins.appendChild(salto);
            } else {
                ins.appendChild(document.createElement('br'));
            }
        }
        ins.appendChild(fragmentoDe(segmentos, plano.fichas));
    });
    ultimoDel?.parentNode?.insertBefore(ins, ultimoDel.nextSibling);

    // 3. Todo en UNA envoltura con su identificador: es lo que el Word, la
    //    impresión y el correo cuentan para no salir con un cambio a medias.
    const envoltura = document.createElement('div');
    envoltura.setAttribute(ATRIBUTO_CAMBIO, id);
    envoltura.setAttribute('contenteditable', 'false');
    envoltura.className = CLASE_ENVOLTURA;
    while (caja.firstChild) envoltura.appendChild(caja.firstChild);
    return envoltura;
}

function insertarEn(nodo: Node, offset: number, f: DocumentFragment): void {
    const r = document.createRange();
    const largo = nodo.nodeType === 3 ? (nodo as Text).length : nodo.childNodes.length;
    r.setStart(nodo, Math.min(offset, largo));
    r.collapse(true);
    r.insertNode(f);
}

/** Fuera un bloque vaciado y, hacia arriba, los contenedores que se quedaron sin nada (la lista sin puntos). */
function quitarVaciado(el: Node, limite: Node): void {
    let x: Node | null = el;
    while (x && x !== limite) {
        const padre: Node | null = x.parentNode;
        if (!padre) return;
        padre.removeChild(x);
        if (padre === limite) return;
        const vacio = Array.from(padre.childNodes).every((h) => h.nodeType === 3 && !(h.nodeValue || '').trim());
        if (!vacio) return;
        x = padre;
    }
}

/** El hijo de `limite` que contiene al nodo. */
function primerNivel(nodo: Node, limite: Node): Node | null {
    let x: Node | null = nodo;
    while (x && x.parentNode !== limite) x = x.parentNode;
    return x;
}

/**
 * EL TEXTO ACEPTADO, construido sobre otra copia de los originales con las
 * operaciones de rango del DOM, como al escribir encima de una selección en
 * Word: lo seleccionado sale; el primer párrafo nuevo ocupa su sitio, pegado a
 * lo que había antes; el último se une con lo que quedaba después; los de en
 * medio son bloques nuevos del mismo tipo y con el mismo formato que aquél donde
 * terminaba la selección. `ultimo` es el nodo tras el que va el cursor.
 */
export function construirAceptado(plano: Plano, propuesta: string): { nodos: ChildNode[]; ultimo: Node | null } | null {
    const copia = copiar(plano);
    if (!copia) return null;
    const { caja, rango } = copia;
    let primero = bloqueDe(nodoInicial(rango), caja);
    let final = bloqueDe(nodoFinal(rango), caja);
    let parrafos = parrafosDe(propuesta);
    if (!parrafos.length) return null;

    // El punto donde empieza lo seleccionado sobrevive al borrado (su nodo se
    // queda con lo de antes); el rango, no: tras `deleteContents` puede quedar
    // entre bloques, fuera del párrafo.
    const punto = { nodo: rango.startContainer, offset: rango.startOffset };
    rango.deleteContents();
    // Un bloque que el borrado sacó entero ya no recibe nada: su texto era lo
    // seleccionado. (Con los bordes que deja `prepararRango` no pasa; si pasara,
    // la propuesta entera va en renglones donde empezaba, sin perder nada.)
    if (primero && !caja.contains(primero)) primero = null;
    if (final && !caja.contains(final)) final = null;
    const partible = !!final && PARTIBLE.test(final.tagName);
    if (!partible && parrafos.length > 1) parrafos = [enRenglones(parrafos)];

    const inicial = fragmentoDe(parrafos[0], plano.fichas);
    let ultimo: Node | null = inicial.lastChild;
    insertarEn(punto.nodo, punto.offset, inicial);

    const m = parrafos.length;
    if (m === 1) {
        // Lo que quedaba del último bloque se une al primero, como al borrar entre párrafos.
        if (final && primero !== final) {
            if (primero) {
                while (final.firstChild) primero.appendChild(final.firstChild);
            } else {
                const ancla = primerNivel(ultimo ?? punto.nodo, caja);
                const despues = ancla ? ancla.nextSibling : null;
                while (final.firstChild) caja.insertBefore(final.firstChild, despues);
            }
            quitarVaciado(final, caja);
        }
    } else if (final) {
        // El último párrafo nuevo va al principio del bloque donde terminaba la
        // selección; si la selección empezaba y terminaba en el mismo, ese
        // bloque se parte justo detrás del primer párrafo nuevo.
        let cola: HTMLElement = final;
        if (primero === final) {
            cola = final.cloneNode(false) as HTMLElement;
            const resto = document.createRange();
            if (ultimo) resto.setStartAfter(ultimo);
            else resto.setStart(punto.nodo, punto.offset);
            resto.setEnd(final, final.childNodes.length);
            cola.appendChild(resto.extractContents());
            final.parentNode?.insertBefore(cola, final.nextSibling);
        }
        const terminal = fragmentoDe(parrafos[m - 1], plano.fichas);
        ultimo = terminal.lastChild;
        cola.insertBefore(terminal, cola.firstChild);
        for (let k = 1; k < m - 1; k++) {
            const medio = cola.cloneNode(false) as HTMLElement;
            medio.appendChild(fragmentoDe(parrafos[k], plano.fichas));
            cola.parentNode?.insertBefore(medio, cola);
        }
    }
    return { nodos: Array.from(caja.childNodes), ultimo };
}

/** La envoltura sin memoria (un borrador guardado a medio revisar): el original, desde el propio DOM. */
export function resolverHuerfano(envoltura: Element): void {
    Array.from(envoltura.querySelectorAll(`ins.${CLASE_INS}`)).forEach((n) => n.parentNode?.removeChild(n));
    Array.from(envoltura.querySelectorAll(`del.${CLASE_DEL}`)).forEach((d) => {
        while (d.firstChild) d.parentNode?.insertBefore(d.firstChild, d);
        d.parentNode?.removeChild(d);
    });
    const padre = envoltura.parentNode;
    if (!padre) return;
    while (envoltura.firstChild) padre.insertBefore(envoltura.firstChild, envoltura);
    padre.removeChild(envoltura);
}

/**
 * LO DE ALREDEDOR, para que el reemplazo encaje: hasta 700 caracteres antes y
 * 350 después, de los cuatro bloques anteriores y los tres siguientes como
 * mucho (no se clona el documento entero para leer un párrafo).
 */
export function contextoDe(r: Range, raiz: HTMLElement): { antes: string; despues: string } {
    const hijos = Array.from(raiz.childNodes);
    const tops = topsDe(r, raiz);
    const i = tops ? hijos.indexOf(tops[0]) : 0;
    const j = tops ? hijos.indexOf(tops[tops.length - 1]) : hijos.length - 1;
    const antes = document.createRange();
    antes.setStart(raiz, Math.max(0, i - 4));
    antes.setEnd(r.startContainer, r.startOffset);
    const despues = document.createRange();
    despues.setStart(r.endContainer, r.endOffset);
    despues.setEnd(raiz, Math.min(hijos.length, j + 4));
    const a = textoPlano(antes.cloneContents());
    const d = textoPlano(despues.cloneContents());
    const { contextoAntes: maxA, contextoDespues: maxD } = LIMITES_REDACCION;
    return {
        antes: a.length > maxA ? a.slice(a.length - maxA) : a,
        despues: d.length > maxD ? d.slice(0, maxD) : d,
    };
}

/** El contenedor que desplaza la hoja (el «lienzo»): lo que se ve de ella. */
export function desplazable(el: HTMLElement): HTMLElement | null {
    for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(x).overflowY)) return x;
    }
    return null;
}
