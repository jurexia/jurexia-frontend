/**
 * EL SELLO DE VIGENCIA, A LA VISTA DEL ABOGADO (26-sep-2026).
 *
 * El chat le dio a David como vigentes la P. X/2015 (10a.) (2009817) y la
 * P. IX/2015 (2009816), ABANDONADAS por la P./J. 2/2022 (11a.) (2024159) desde
 * febrero de 2022. Desde el 26-sep-2026 el backend lo sabe
 * (`vigencia_tesis.py`) y se lo dice al modelo; pero el abogado que pulsa la
 * cita veía la tesis en el visor exactamente igual que una vigente, y la
 * lista de fuentes tampoco lo distinguía. Aquí se lee lo que ya viaja.
 *
 * EL CONTRATO. Cada fuente que sea una TESIS que perdió vigencia trae, en
 * `FUENTES_PREVIAS`, en `CITATION_META.sources` y en `/cita/{doc_id}`, la
 * clave `vigencia` (`vigencia_tesis.marcador`, main.py `_campos_vigencia`):
 *
 *   { estado: "abandonada", parcial: false, fuente: "nota_propia",
 *     etiqueta: "ABANDONADA por la P./J. 2/2022 (11a.), registro 2024159,
 *                desde el 11 de febrero de 2022",
 *     por_registro: "2024159", por_clave: "P./J. 2/2022 (11a.)",
 *     desde: "2022-02-11" }
 *
 * La clave SÓLO existe si la tesis perdió vigencia: en las vigentes, y en
 * todo lo que no es tesis, no llega nada y nada cambia.
 *
 * Tres matices que el backend distingue y aquí se respetan:
 *  - `fuente: "curaduria"`: el Semanario NO lo anota; es inferencia nuestra
 *    (160584 frente a la P./J. 21/2014). Se dice así, «en los hechos», y no
 *    como si lo hubiera declarado la Corte.
 *  - `parcial`: sólo en la parte afectada. «En parte», siempre.
 *  - `aclarada` / `texto_sustituido`: no es pérdida de vigencia, es una
 *    corrección del texto (8 de las 558 del índice). Se avisa con otra frase.
 */

export type EstadoVigencia =
    | 'abandonada' | 'interrumpida' | 'sustituida' | 'superada' | 'modificada'
    | 'sin_efectos' | 'aclarada' | 'texto_sustituido';

export interface VigenciaTesis {
    estado: EstadoVigencia | string;
    /** La frase entera, ya redactada por el backend (`vigencia_tesis.etiqueta`). */
    etiqueta?: string | null;
    parcial?: boolean | null;
    /** El registro digital de la que la reemplaza (la ÚLTIMA de la cadena). */
    por_registro?: string | number | null;
    por_clave?: string | null;
    /** «2022-02-11» o «1991-05». */
    desde?: string | null;
    /** nota_propia | tesis_nueva | cita_tercera | curaduria. */
    fuente?: string | null;
}

export interface CamposVigencia {
    vigencia?: VigenciaTesis | null;
}

const PALABRA: Record<string, string> = {
    abandonada: 'Abandonada',
    interrumpida: 'Interrumpida',
    sustituida: 'Sustituida',
    superada: 'Superada',
    modificada: 'Modificada',
    sin_efectos: 'Sin efectos',
    aclarada: 'Aclarada',
    texto_sustituido: 'Texto sustituido',
};

const CORRECCION = new Set(['aclarada', 'texto_sustituido']);

/**
 * La vigencia de una fuente, sólo si viene bien formada. Un marcador roto o a
 * medias no puede pintar «perdió vigencia» sobre una tesis: sin `estado` no
 * hay sello.
 */
export function vigenciaDe(src: CamposVigencia | null | undefined): VigenciaTesis | null {
    const v = src?.vigencia;
    if (!v || typeof v !== 'object') return null;
    const estado = typeof v.estado === 'string' ? v.estado.trim() : '';
    return estado ? v : null;
}

/** `{ vigencia }` si la fuente la trae; `{}` en todo lo demás. Para copiar
 *  una fuente de un marcador a otro sin olvidar el campo (como `camposCoidh`). */
export function camposVigencia(src: CamposVigencia | null | undefined): CamposVigencia {
    const v = vigenciaDe(src);
    return v ? { vigencia: v } : {};
}

export function esCorreccion(v: VigenciaTesis | null | undefined): boolean {
    return Boolean(v && CORRECCION.has(String(v.estado)));
}

/** ¿Perdió vigencia (en todo o en parte)? Una corrección del texto, no. */
export function perdioVigencia(v: VigenciaTesis | null | undefined): boolean {
    return Boolean(v && !esCorreccion(v));
}

/** «1 perdió vigencia», «2 perdieron vigencia»: la cuenta del emblema plegado. */
export function cuentaSinVigencia(n: number): string {
    return n === 1 ? '1 perdió vigencia' : `${n} perdieron vigencia`;
}

export function esCurada(v: VigenciaTesis | null | undefined): boolean {
    return Boolean(v && v.fuente === 'curaduria');
}

function palabra(estado: string): string {
    const e = (estado || '').trim();
    if (PALABRA[e]) return PALABRA[e];
    const libre = e.replace(/_/g, ' ').toLowerCase();
    return libre ? libre[0].toUpperCase() + libre.slice(1) : 'Sin vigencia';
}

/**
 * La marca corta de la lista de fuentes: «Abandonada», «Interrumpida en
 * parte», «Superada en los hechos», «Texto sustituido».
 */
export function marcaVigencia(v: VigenciaTesis): string {
    const p = palabra(String(v.estado));
    if (esCurada(v)) return v.parcial ? `${p} en parte, en los hechos` : `${p} en los hechos`;
    return v.parcial ? `${p} en parte` : p;
}

/** La etiqueta del backend; si llegara vacía, una mínima con lo que hay. */
function etiquetaDe(v: VigenciaTesis): string {
    const e = (v.etiqueta || '').replace(/\s+/g, ' ').trim();
    if (e) return e;
    const reg = v.por_registro ? String(v.por_registro).trim() : '';
    return marcaVigencia(v).toUpperCase()
        + (v.por_clave ? ` por la ${v.por_clave}` : reg ? ' por la tesis' : '')
        + (reg ? `, registro ${reg}` : '');
}

export interface AvisoVigencia {
    /** «Esta tesis perdió vigencia», «… en parte», «Superada en los hechos (curaduría Iurexia; …)». */
    titulo: string;
    /** La etiqueta: «ABANDONADA por la P./J. 2/2022 (11a.), registro 2024159, desde …». */
    detalle: string;
    /** La frase entera, para el `title` de la marca y para leerla de un tirón. */
    frase: string;
    /** «Abrir la que la reemplaza» o, si es una corrección, «Abrir la versión corregida». */
    boton: string;
}

/**
 * Lo que dice la franja del visor:
 *   «Esta tesis perdió vigencia: ABANDONADA por la P./J. 2/2022 (11a.),
 *    registro 2024159, desde el 11 de febrero de 2022»
 * En la curada el título ya dice que el Semanario no lo anota, así que se le
 * quita a la etiqueta la cola «(el Semanario no lo anota)» para no repetirla.
 */
export function avisoVigencia(v: VigenciaTesis): AvisoVigencia {
    let detalle = etiquetaDe(v);
    let titulo: string;
    if (esCorreccion(v)) {
        titulo = 'Se corrigió el texto de esta tesis';
    } else if (esCurada(v)) {
        titulo = `${marcaVigencia(v)} (curaduría Iurexia; el Semanario no lo anota)`;
        detalle = detalle.replace(/\s*\(el Semanario no lo anota\)\s*$/i, '');
    } else {
        titulo = v.parcial ? 'Esta tesis perdió vigencia en parte' : 'Esta tesis perdió vigencia';
    }
    return {
        titulo,
        detalle,
        frase: `${titulo}: ${detalle}`,
        boton: esCorreccion(v) ? 'Abrir la versión corregida' : 'Abrir la que la reemplaza',
    };
}

/** El registro digital de la que la reemplaza, sólo dígitos. */
export function registroDelReemplazo(v: VigenciaTesis | null | undefined): string | null {
    const r = String(v?.por_registro ?? '').trim();
    return /^\d{4,8}$/.test(r) ? r : null;
}

/** La ficha del Semanario de la que la reemplaza (cuando no está entre las fuentes). */
export function enlaceReemplazo(v: VigenciaTesis | null | undefined): string | null {
    const r = registroDelReemplazo(v);
    return r ? `https://sjf2.scjn.gob.mx/detalle/tesis/${r}` : null;
}

type ConRegistro = { registro?: string | number | null; origen?: string | null; ref?: string | null };

/** El registro de una fuente: el campo, o el que encabeza el `origen`
 *  («2024159_P./J. 2/2022 (11a.)»), como lo lee el visor. */
export function registroDeFuente(f: ConRegistro | null | undefined): string | null {
    if (!f) return null;
    const r = String(f.registro ?? '').trim();
    if (/^\d{4,8}$/.test(r)) return r;
    const o = (f.origen || '').match(/^(\d{5,8})[_\s]/);
    if (o) return o[1];
    const ref = (f.ref || '').match(/Registro\s+(\d{5,8})/i);
    return ref ? ref[1] : null;
}

/**
 * La que la reemplaza, si está entre las fuentes del mensaje: el backend la
 * mete en el contexto a propósito (`_sumar_sustitutas`, antes de emitir
 * `FUENTES_PREVIAS`), así que suele venir entre las fuentes aunque la
 * respuesta no la cite. Se busca por registro, que es lo único que el sello
 * comparte con ella.
 */
export function buscarReemplazo<T extends ConRegistro>(
    fuentes: Record<string, T | undefined> | null | undefined,
    v: VigenciaTesis | null | undefined,
    excepto?: string,
): { docId: string; fuente: T } | null {
    const r = registroDelReemplazo(v);
    if (!r || !fuentes) return null;
    const fuera = (excepto || '').toLowerCase();
    for (const [docId, f] of Object.entries(fuentes)) {
        if (!f || docId.toLowerCase() === fuera) continue;
        if (registroDeFuente(f) === r) return { docId, fuente: f };
    }
    return null;
}
