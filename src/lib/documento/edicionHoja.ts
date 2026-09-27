/**
 * LO QUE EL ABOGADO EDITÓ EN LA HOJA DEL CHAT, GUARDADO POR CONVERSACIÓN
 * (27-sep-2026).
 *
 * La hoja del panel Documento vivía sólo en el DOM: su `onCambio` no hacía
 * nada y la hoja se vuelve a montar al cambiar de conversación o al recargar.
 * El abogado llenaba el nombre del quejoso, corregía un hecho, volvía otro día
 * y la hoja salía otra vez tal como la escribió el modelo; el Word, también.
 * El constructor de demanda sí guardaba su borrador; el chat no.
 *
 * Aquí se guarda, EN ESTE NAVEGADOR —como las versiones del documento—, el
 * HTML de la hoja en cuanto el abogado la toca, con cuántas respuestas de la
 * conversación contiene ya: al volver se restaura, y las respuestas que
 * llegaron después se anexan detrás.
 *
 * El navegador guarda poco (≈5 MB por sitio, compartidos con las versiones):
 * se conservan las ediciones de las MAXIMO conversaciones más recientes y, si
 * aun así no cabe, se sueltan las más viejas hasta que quepa. Nunca lanza: sin
 * almacenamiento, la hoja funciona como antes.
 *
 * Sin dependencias de React ni del DOM, para probarlo en Node
 * (`comprobaciones/edicion_hoja.mjs`).
 */

const PREFIJO = 'iurexia-hoja-';
const INDICE = 'iurexia-hojas';
const MAXIMO = 30;
/** Una hoja más grande que esto no se intenta guardar: para hacerle sitio
 *  habría que tirar las ediciones de todas las demás conversaciones. */
const MAXIMO_CARACTERES = 2_000_000;

export interface EdicionHoja {
    /** La hoja tal como la dejó el abogado. */
    html: string;
    /** Cuántas respuestas de la conversación ya están dentro de ese HTML. */
    bloques: number;
    /** Cuándo se guardó (ms desde 1970). */
    t: number;
}

/** Lo que se usa de `localStorage`; las comprobaciones pasan uno en memoria. */
export type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/* Las conversaciones borradas en esta sesión. Al borrar la que está abierta,
   la hoja se desmonta DESPUÉS de olvidarla y, al desmontarse, guarda: sin esto
   la edición de una conversación que ya no existe volvía al navegador. */
const olvidadas = new Set<string>();

function almacenDelNavegador(): Almacen | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

/** La conversación que aún no existe («nueva») no tiene dónde guardarse. */
function guardable(clave: string | null | undefined): clave is string {
    return !!clave && clave !== 'nueva';
}

function leerIndice(a: Almacen): string[] {
    try {
        const v: unknown = JSON.parse(a.getItem(INDICE) || '[]');
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function leerEdicion(
    clave: string | null | undefined,
    a: Almacen | null = almacenDelNavegador(),
): EdicionHoja | null {
    if (!a || !guardable(clave)) return null;
    try {
        const v = JSON.parse(a.getItem(PREFIJO + clave) || 'null');
        if (v && typeof v.html === 'string' && Number.isInteger(v.bloques) && v.bloques >= 0) {
            return { html: v.html, bloques: v.bloques, t: Number(v.t) || 0 };
        }
    } catch {
        /* guardado ilegible: como si no lo hubiera */
    }
    return null;
}

/** Guarda la edición de la conversación. Devuelve si quedó guardada. */
export function guardarEdicion(
    clave: string | null | undefined,
    html: string,
    bloques: number,
    a: Almacen | null = almacenDelNavegador(),
): boolean {
    if (!a || !guardable(clave) || olvidadas.has(clave)) return false;
    const valor = JSON.stringify({ html, bloques, t: Date.now() });
    if (valor.length > MAXIMO_CARACTERES) return false;

    // La más reciente delante; las que pasen del máximo se sueltan ya.
    let indice = [clave, ...leerIndice(a).filter((c) => c !== clave)];
    for (const vieja of indice.slice(MAXIMO)) {
        try { a.removeItem(PREFIJO + vieja); } catch { /* sigue */ }
    }
    indice = indice.slice(0, MAXIMO);

    try {
        a.setItem(PREFIJO + clave, valor);
    } catch {
        // No cupo. Se sueltan ediciones viejas —nunca la propia— SÓLO si con
        // ellas basta: tirar las de otras conversaciones para acabar sin
        // guardar ésta sería perder dos veces.
        const falta = valor.length - (a.getItem(PREFIJO + clave) || '').length;
        const viejas = indice.slice(1).reverse();   // de la más vieja a la más nueva
        const tamanos = viejas.map((c) => (a.getItem(PREFIJO + c) || '').length);
        if (tamanos.reduce((s, n) => s + n, 0) < falta) return false;
        let guardada = false;
        for (let i = 0; i < viejas.length && !guardada; i++) {
            try { a.removeItem(PREFIJO + viejas[i]); } catch { /* sigue */ }
            indice = indice.filter((c) => c !== viejas[i]);
            try { a.setItem(PREFIJO + clave, valor); guardada = true; } catch { /* suelta otra */ }
        }
        if (!guardada) return false;
    }
    try { a.setItem(INDICE, JSON.stringify(indice)); } catch { /* se rehace en el siguiente guardado */ }
    return true;
}

/** Suelta la edición guardada (la conversación se borró). */
export function olvidarEdicion(
    clave: string | null | undefined,
    a: Almacen | null = almacenDelNavegador(),
): void {
    if (!guardable(clave)) return;
    olvidadas.add(clave);
    if (!a) return;
    try { a.removeItem(PREFIJO + clave); } catch { /* sigue */ }
    try { a.setItem(INDICE, JSON.stringify(leerIndice(a).filter((c) => c !== clave))); } catch { /* sigue */ }
}
