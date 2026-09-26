/**
 * LA DOCTRINA EN EL VISOR (25-sep-2026).
 *
 * David, con la captura del panel: «En todas estas nuevas el visor no está
 * disponible, tenemos que implementarlo como todas nuestras fuentes». La
 * doctrina (colección `doctrina`: 9,629 trozos de cinco libros de la
 * Biblioteca Jurídica Virtual del IIJ-UNAM) entraba al panel como si fuera
 * una ley: rótulo «Fuente gubernamental», un «Artículo» inventado con el
 * texto, y el visor pidiendo `…/11.pdf#page=313` a un proxy que no conocía
 * archivos.juridicas.unam.mx → 403 → «No se pudo abrir el PDF aquí».
 *
 * EL CONTRATO. Cada fuente con `silo: "doctrina"` trae, además de lo común,
 * los campos de `CamposDoctrina`. Como en la Corte IDH, la página viaja
 * APARTE (`pagina`) y `pdf_url` es el capítulo sin `#page`; el visor abre en
 * esa página y resalta el pasaje buscando `ancla`.
 *
 * LOS LIBROS NO SE COPIAN. El PDF se lee por el proxy desde la UNAM (ver
 * `canonUNAM` en `@/lib/proxyPdf`) y el panel no enseña el texto corrido del
 * trozo: al abogado se le da la CITA y la obra abierta en su repositorio
 * oficial en la página citada —derecho de cita del art. 148 fr. I de la
 * LFDA, el contrato de doctrina.py—.
 *
 * LAS FUENTES VIEJAS. Las conversaciones guardadas antes del 25-sep-2026
 * traen `pdf_url` con `#page=N`, `origen` «Autor, «Obra», año» y `ref`
 * «p. N», sin los campos nuevos: todo lo de aquí los tolera.
 */

export interface CamposDoctrina {
    /** https://archivos.juridicas.unam.mx/www/bjv/libros/…/N.pdf, sin `#page`. */
    url_oficial?: string | null;
    /** Página del PDF DEL CAPÍTULO, en base 1 (la `pagina_pdf` del payload). */
    pagina?: number | null;
    /** El folio impreso del libro («280»); null si la obra no lo trae. */
    pagina_impresa?: number | string | null;
    /** Las ~15 primeras palabras literales del cuerpo del trozo, sin cabecera. */
    ancla?: string | null;
    obra?: string | null;
    autor?: string | null;
    anio?: number | string | null;
    /** FUERA DEL CONTRATO, opcional: «UNAM, Instituto de Investigaciones Jurídicas». */
    editorial?: string | null;
}

export const CLAVES_DOCTRINA: (keyof CamposDoctrina)[] = [
    'url_oficial', 'pagina', 'pagina_impresa', 'ancla', 'obra', 'autor', 'anio', 'editorial',
];

type FuenteDoctrina = CamposDoctrina & {
    silo?: string | null;
    pdf_url?: string | null;
    origen?: string | null;
    ref?: string | null;
};

export function esDoctrina(f: { silo?: string | null } | null | undefined): boolean {
    return (f?.silo || '') === 'doctrina';
}

/**
 * Los campos de la doctrina de una fuente, sólo si es doctrina y sólo los que
 * vienen: las fuentes se copian campo por campo en la burbuja, la hoja y la
 * página del chat, y un campo olvidado dejaba el visor sin página (lo mismo
 * que `camposCoidh`).
 */
export function camposDoctrina(src: FuenteDoctrina | null | undefined): CamposDoctrina {
    const salida: Record<string, unknown> = {};
    if (!src || !esDoctrina(src)) return salida as CamposDoctrina;
    for (const k of CLAVES_DOCTRINA) {
        const v = src[k];
        if (v !== undefined && v !== null && v !== '') salida[k] = v;
    }
    return salida as CamposDoctrina;
}

function httpSinFragmento(u: string | null | undefined): string | null {
    const s = (u || '').trim().split('#')[0];
    return /^https?:\/\//i.test(s) ? s : null;
}

/** El capítulo que se DIBUJA: `pdf_url` (o `url_oficial`) sin `#page`. */
export function urlPdfDoctrina(f: FuenteDoctrina): string | null {
    return httpSinFragmento(f.pdf_url) || httpSinFragmento(f.url_oficial);
}

/** La dirección que se cita y se enlaza: `url_oficial` o, si falta, `pdf_url`. */
export function urlOficialDoctrina(f: FuenteDoctrina): string | null {
    return httpSinFragmento(f.url_oficial) || httpSinFragmento(f.pdf_url);
}

/**
 * La página del PDF del capítulo, en base 1: `pagina` del contrato o, en las
 * fuentes viejas, la que venía pegada a `pdf_url` («…/11.pdf#page=313»).
 */
export function paginaDoctrina(f: FuenteDoctrina): number | null {
    const n = Number(f.pagina);
    if (Number.isInteger(n) && n > 0) return n;
    for (const u of [f.pdf_url, f.url_oficial]) {
        const m = (u || '').match(/#(?:.*&)?page=(\d{1,5})\b/i);
        if (m && Number(m[1]) > 0) return Number(m[1]);
    }
    return null;
}

/**
 * «Ver en la Biblioteca Jurídica Virtual»: la obra en la UNAM, en su página.
 * No pasa por el proxy: si el proxy o la UNAM fallan, es el camino que queda.
 */
export function enlaceBJV(f: FuenteDoctrina): string | null {
    const u = urlOficialDoctrina(f);
    if (!u) return null;
    const pag = paginaDoctrina(f);
    return pag ? `${u}#page=${pag}` : u;
}

/**
 * Autor, obra y año: del contrato o, en las fuentes viejas, del `origen` que
 * arma main.py: `f"{autor}, «{obra}»{, año}"`. El autor puede llevar comas
 * («Ferrer Mac-Gregor, Martínez Ramírez y Figueroa Mejía (coords.)»), así que
 * se parte por las comillas, no por la coma.
 */
export function fichaDoctrina(f: FuenteDoctrina): { autor: string; obra: string; anio: string } {
    const m = (f.origen || '').match(/^(.*?),\s*«(.+)»\s*(?:,\s*(\d{4}))?\s*$/);
    return {
        autor: String(f.autor || (m ? m[1] : '') || '').trim(),
        obra: String(f.obra || (m ? m[2] : '') || '').trim(),
        anio: String(f.anio || (m ? m[3] : '') || '').trim(),
    };
}

/**
 * El folio impreso que se cita («280»): `pagina_impresa` o, en las fuentes
 * viejas, el de `ref` («p. 280»). Cuidado: si la obra no trae folio, el
 * backend viejo ponía en `ref` la página del PDF; se devuelve igual, porque
 * es la única que había y es la que ya se citó en la respuesta.
 */
export function folioDoctrina(f: FuenteDoctrina): string | null {
    const p = f.pagina_impresa;
    if (p !== undefined && p !== null && String(p).trim()) return String(p).trim();
    const m = (f.ref || '').match(/^\s*pp?\.\s*(\S+)/i);
    return m ? m[1] : null;
}

/** «p. 280»; sin folio, «pág. 313 del PDF»; sin nada, «pasaje citado». */
export function lugarDoctrina(f: FuenteDoctrina): string {
    const folio = folioDoctrina(f);
    if (folio) return `p. ${folio}`;
    const pag = paginaDoctrina(f);
    return pag ? `pág. ${pag} del PDF` : 'pasaje citado';
}

/** El rótulo del panel: «Doctrina · Las razones del derecho… · Manuel Atienza · 2005 · p. 132». */
export function rotuloDoctrina(f: FuenteDoctrina): string {
    const { autor, obra, anio } = fichaDoctrina(f);
    return ['Doctrina', obra, autor, anio, lugarDoctrina(f)].filter(Boolean).join(' · ');
}

/**
 * La referencia para las referencias del escrito. Antes caía en la regla de
 * las leyes y salía «Miguel Carbonell, «Los derechos fundamentales en
 * México», 2004, art. p. 402. (2026).».
 */
export function referenciaDoctrina(f: FuenteDoctrina): string {
    const { autor, obra, anio } = fichaDoctrina(f);
    const folio = folioDoctrina(f);
    const editorial = (f.editorial || '').trim();
    const partes = [
        `${autor || 'Autor sin identificar'}. (${anio || 's.f.'}).`,
        `${obra || 'Obra sin título'}${folio ? ` (p. ${folio})` : ''}.`,
        editorial ? `${editorial}.` : '',
        'Biblioteca Jurídica Virtual del Instituto de Investigaciones Jurídicas, UNAM.',
    ];
    return partes.filter(Boolean).join(' ');
}
