/**
 * LAS CITAS DE LA SELECCIÓN, COMO MARCADORES ⟦n⟧ («Cambiar redacción»,
 * 16-oct-2026).
 *
 * En la hoja cada cita es una ficha no editable [N] —`<sup class="citation-badge"
 * data-doc-id>`, ver `@/lib/documento/citas`— que abre la fuente verificada. El
 * modelo no puede «ver» una ficha: la leería como el texto «[3]» y la
 * reescribiría, la movería o la perdería, y con ella el enlace a la fuente. Por
 * eso cada ficha de lo seleccionado viaja como un marcador numerado por orden de
 * aparición —⟦1⟧, ⟦2⟧…— con la orden de conservarlo en su sitio, y al volver se
 * cambia otra vez por la ficha original.
 *
 * SI LA PROPUESTA PIERDE UN MARCADOR, LA CITA NO SE PIERDE: la ruta lo vuelve a
 * pedir una vez y, si sigue faltando, lo reinserta al final del párrafo donde
 * estaba (`reinsertarMarcadores`) y la pantalla avisa para que el abogado revise
 * su sitio. Lo que el modelo invente —un ⟦9⟧ que no existía, uno repetido— se
 * quita (`depurarMarcadores`): una ficha no puede salir de la nada.
 *
 * Todo aquí es texto puro, sin DOM ni servidor: lo usan el navegador, la ruta
 * /api/redaccion y la comprobación (`comprobaciones/redaccion.mjs`).
 */

export const marcador = (n: number): string => `⟦${n}⟧`;

/** Los números de los marcadores, en orden de aparición y con repeticiones. */
export function numerosEn(texto: string): number[] {
    const salida: number[] = [];
    const rx = /⟦(\d{1,3})⟧/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(texto || '')) !== null) salida.push(Number(m[1]));
    return salida;
}

/** Sin repetidos, conservando el orden. */
export function unicos(numeros: readonly number[]): number[] {
    const vistos: Record<number, true> = {};
    const salida: number[] = [];
    numeros.forEach((n) => { if (!vistos[n]) { vistos[n] = true; salida.push(n); } });
    return salida;
}

/**
 * LAS VARIANTES QUE ESCRIBE UN MODELO, A LA FORMA CANÓNICA. Los corchetes
 * blancos parecidos —〚1〛 (U+301A) en vez de ⟦1⟧ (U+27E6)—, el marcador con
 * espacios dentro, el que envuelve entre corchetes normales —[⟦1⟧]— y, sólo
 * para los números que sí existen, el doble corchete —[[1]]—, que un texto
 * jurídico no usa nunca pero un modelo sí.
 */
export function normalizarMarcadores(texto: string, validos: readonly number[] = []): string {
    let t = (texto || '')
        .replace(/[〚⟦][ \t]{0,3}(\d{1,3})[ \t]{0,3}[〛⟧]/g, (_, n: string) => marcador(Number(n)))
        .replace(/\[[ \t]{0,2}(⟦\d{1,3}⟧)[ \t]{0,2}\]/g, '$1');
    if (validos.length) {
        const vale: Record<number, true> = {};
        validos.forEach((n) => { vale[n] = true; });
        t = t.replace(/\[\[[ \t]{0,2}(\d{1,3})[ \t]{0,2}\]\]/g, (todo, n: string) => (vale[Number(n)] ? marcador(Number(n)) : todo));
    }
    return t;
}

export interface RevisionMarcadores {
    /** Los del original, en su orden. */
    esperados: number[];
    /** Del original y no de la propuesta. */
    faltan: number[];
    /** De la propuesta y no del original: inventados. */
    sobran: number[];
    /** Del original, puestos más de una vez. */
    repetidos: number[];
}

export function revisarMarcadores(original: string, propuesta: string): RevisionMarcadores {
    const esperados = unicos(numerosEn(original));
    const vistos = numerosEn(propuesta);
    const cuenta: Record<number, number> = {};
    vistos.forEach((n) => { cuenta[n] = (cuenta[n] ?? 0) + 1; });
    const esperado: Record<number, true> = {};
    esperados.forEach((n) => { esperado[n] = true; });
    return {
        esperados,
        faltan: esperados.filter((n) => !cuenta[n]),
        sobran: unicos(vistos.filter((n) => !esperado[n])),
        repetidos: esperados.filter((n) => (cuenta[n] ?? 0) > 1),
    };
}

/**
 * Fuera los marcadores que no existían y las repeticiones (se queda la primera
 * aparición). Con el marcador se va el espacio que lo precedía: «renta ⟦9⟧.»
 * queda «renta.», no «renta .».
 */
export function depurarMarcadores(propuesta: string, esperados: readonly number[]): string {
    const vale: Record<number, true> = {};
    esperados.forEach((n) => { vale[n] = true; });
    const puestos: Record<number, true> = {};
    return (propuesta || '').replace(/( ?)⟦(\d{1,3})⟧/g, (todo, _espacio: string, n: string) => {
        const k = Number(n);
        if (!vale[k] || puestos[k]) return '';
        puestos[k] = true;
        return todo;
    });
}

/** Los signos con que termina una frase, y lo que puede cerrarlos detrás. */
const FINAL_DE_FRASE = /[.;:!?…]/;
const CIERRE = /["»”’')\]]/;

/**
 * LA CITA QUE EL MODELO PERDIÓ, DE VUELTA EN SU PÁRRAFO. Cada marcador que falta
 * va al párrafo de la propuesta que ocupa la misma altura relativa que ocupaba
 * en el original —si estaba al 80 % del fragmento, al párrafo que cubre el 80 %
 * de la propuesta—, antes del punto final de ese párrafo, que es donde la hoja
 * pone las fichas («…constitucional[1].»). No es su sitio exacto: por eso la
 * pantalla avisa y pide revisarlo.
 */
export function reinsertarMarcadores(propuesta: string, original: string, faltan: readonly number[]): string {
    if (!faltan.length) return propuesta;
    // Los separadores quedan en las posiciones impares: se reconstruye igual.
    const partes = (propuesta || '').split(/(\n[ \t]*\n)/);
    const tramos: { indice: number; hasta: number }[] = [];
    let pos = 0;
    partes.forEach((p, i) => {
        pos += p.length;
        if (i % 2 === 0 && p.trim()) tramos.push({ indice: i, hasta: pos });
    });
    if (!tramos.length) return `${propuesta}${faltan.map(marcador).join('')}`;
    const total = Math.max(1, pos);
    const largo = Math.max(1, original.length);
    const porParrafo: Record<number, number[]> = {};
    faltan
        .slice()
        .sort((a, b) => original.indexOf(marcador(a)) - original.indexOf(marcador(b)))
        .forEach((n) => {
            const donde = original.indexOf(marcador(n));
            const objetivo = (donde < 0 ? 1 : donde / largo) * total;
            let elegido = tramos[tramos.length - 1];
            for (const t of tramos) {
                if (objetivo <= t.hasta) { elegido = t; break; }
            }
            (porParrafo[elegido.indice] = porParrafo[elegido.indice] || []).push(n);
        });
    Object.keys(porParrafo).forEach((clave) => {
        const i = Number(clave);
        const marcas = porParrafo[i].map(marcador).join('');
        const p = partes[i].trimEnd();
        const resto = partes[i].slice(p.length);
        let corte = p.length;
        while (corte > 0 && CIERRE.test(p[corte - 1])) corte--;
        let fin = corte;
        while (fin > 0 && FINAL_DE_FRASE.test(p[fin - 1])) fin--;
        partes[i] = fin < corte ? `${p.slice(0, fin)}${marcas}${p.slice(fin)}${resto}` : `${p}${marcas}${resto}`;
    });
    return partes.join('');
}

/** Un trozo de un párrafo de la propuesta, listo para volverse nodo. */
export type Segmento =
    | { tipo: 'texto'; valor: string }
    | { tipo: 'ficha'; n: number }
    | { tipo: 'salto' };

/**
 * LA PROPUESTA EN PÁRRAFOS Y TROZOS. Párrafo = lo separado por una línea en
 * blanco; dentro de un párrafo, un salto simple es un salto de renglón (`<br>`:
 * el proemio y la firma de un escrito son renglones cortos seguidos), y cada
 * ⟦n⟧ es la ficha n.
 */
export function parrafosDe(propuesta: string): Segmento[][] {
    return (propuesta || '')
        .replace(/\r\n?/g, '\n')
        .split(/\n[ \t]*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
            const segmentos: Segmento[] = [];
            p.split('\n').forEach((bruto, i) => {
                const renglon = bruto.trim();
                if (i > 0) segmentos.push({ tipo: 'salto' });
                const rx = /⟦(\d{1,3})⟧/g;
                let ultimo = 0;
                let m: RegExpExecArray | null;
                while ((m = rx.exec(renglon)) !== null) {
                    if (m.index > ultimo) segmentos.push({ tipo: 'texto', valor: renglon.slice(ultimo, m.index) });
                    segmentos.push({ tipo: 'ficha', n: Number(m[1]) });
                    ultimo = m.index + m[0].length;
                }
                if (ultimo < renglon.length) segmentos.push({ tipo: 'texto', valor: renglon.slice(ultimo) });
            });
            return segmentos;
        });
}

/** Palabras con letra o cifra: los marcadores y la puntuación suelta no cuentan. */
export function palabrasDe(texto: string): number {
    let cuenta = 0;
    (texto || '').replace(/⟦\d{1,3}⟧/g, ' ').split(/\s+/).forEach((trozo) => {
        if (/[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(trozo)) cuenta += 1;
    });
    return cuenta;
}
