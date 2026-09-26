/**
 * LAS SENTENCIAS DE LA CORTE IDH EN EL VISOR (25-sep-2026).
 *
 * Hasta hoy la Corte Interamericana sólo entraba por los cuadernillos, y el
 * 96.9 % de sus trozos comprobables nombraba el caso SIGUIENTE (1,408 de
 * 1,453): el ¶124 de Almonacid se citaba como Trabajadores Cesados. La
 * colección nueva (`coidh`, un punto por párrafo) cita la sentencia, el
 * párrafo y la página, y el visor abre el PDF oficial de corteidh.or.cr en
 * esa página con el párrafo resaltado.
 *
 * EL CONTRATO. Cada resultado con `silo: "coidh"` trae, además de lo común
 * (origen, ref, texto, pdf_url…), los campos de `CamposCoidh`. Es el mismo
 * para el backend y para el frontend —los marcadores `FUENTES_PREVIAS` y
 * `CITATION_META`, `/cita/{doc_id}` y `/document-full`—, y la página viaja
 * SIEMPRE aparte: con `#page` pegado a `pdf_url`, la regla `esPdf` de la app
 * Android deja de reconocer el PDF.
 */

export type TipoCoidh = 'sentencia_coidh' | 'voto_coidh' | 'resolutivo_coidh' | 'oc_coidh' | 'supervision_coidh';
export type SegCoidh = 'sentencia' | 'voto' | 'resolutivos' | 'considerandos';

export interface CamposCoidh {
    tipo?: TipoCoidh | string | null;
    /**
     * https://www.corteidh.or.cr/… sin `#page`: la dirección que se CITA y la
     * del enlace «Ver en el sitio de la Corte IDH». Desde el 25-sep-2026 ya no
     * es la que se dibuja: `pdf_url` trae la copia verificada de legal-docs
     * (ver `urlPdfCoidh`).
     */
    url_oficial?: string | null;
    /** Página del PDF, en base 1, donde EMPIEZA el párrafo (no el folio impreso). */
    pagina?: number | null;
    /** «124», «8»; null en las ventanas de votos sin numerar. */
    parrafo?: string | number | null;
    /** sentencia | voto | resolutivos | considerandos (el troceador también da «visto»). */
    seg?: SegCoidh | string | null;
    /** El nombre del juez. El payload crudo trae el slug («garcia-ramirez»). */
    voto_autor?: string | null;
    /** «Almonacid Arellano y otros Vs. Chile». */
    caso?: string | null;
    /** «Serie C No. 154». El payload crudo trae sólo la letra («C»). */
    serie?: string | null;
    /** «2006-09-26». */
    fecha?: string | null;
    /** Las ~15 primeras palabras literales del párrafo, para confirmarlo en el PDF. */
    ancla?: string | null;
    /** «Corte IDH. Caso … Serie C No. 154, párr. 124.» */
    cita_canonica?: string | null;
    /** «C-154|s|124». */
    llave?: string | null;
    /**
     * FUERA DEL CONTRATO, opcional: el sha1 del PDF que se troceó. Si llega,
     * el visor pide `&v=<sha1[:8]>` y un PDF que la Corte reemplace abre otra
     * llave de CDN en vez de servir la copia vieja hasta 30 días.
     */
    pdf_sha1?: string | null;
    /**
     * pedido | vecino | resolutivo | destacado | hito | ficha | supervision.
     * El backend lo manda desde el 25-sep-2026 (`_CAMPOS_COIDH` de main.py);
     * se copia para que no se pierda por el camino, aunque el visor todavía
     * reconoce las fichas por su nota (`esFichaCoidh`).
     */
    rol_coidh?: string | null;
}

/** Los nombres de los campos, para copiarlos de un marcador a otro. */
export const CLAVES_COIDH: (keyof CamposCoidh)[] = [
    'tipo', 'url_oficial', 'pagina', 'parrafo', 'seg', 'voto_autor', 'caso', 'serie',
    'fecha', 'ancla', 'cita_canonica', 'llave', 'pdf_sha1', 'rol_coidh',
];

export function esCoidh(f: { silo?: string | null } | null | undefined): boolean {
    return (f?.silo || '') === 'coidh';
}

/**
 * Los campos de la Corte IDH de una fuente, sólo si es de la Corte y sólo los
 * que vienen. Las fuentes se copian campo por campo en tres sitios (la burbuja,
 * la hoja y la página del chat) y cada copia que se olvidaba un campo nuevo
 * dejaba el visor sin página: aquí se copian todos de una vez.
 */
export function camposCoidh(src: (CamposCoidh & { silo?: string | null }) | null | undefined): CamposCoidh {
    const salida: Record<string, unknown> = {};
    if (!src || !esCoidh(src)) return salida as CamposCoidh;
    for (const k of CLAVES_COIDH) {
        const v = src[k];
        if (v !== undefined && v !== null && v !== '') salida[k] = v;
    }
    return salida as CamposCoidh;
}

/** El número citado: «124», «82.1»; null si la unidad no está numerada. */
export function numeroCoidh(f: CamposCoidh): string | null {
    if (f.parrafo === null || f.parrafo === undefined) return null;
    const m = String(f.parrafo).trim().match(/^(\d{1,4}(?:\.\d{1,3})?)\.?$/);
    return m ? m[1] : null;
}

/** «Serie C No. 154», del marcador o, si sólo trae la letra, de la llave. */
export function serieCoidh(f: CamposCoidh): string {
    const s = (f.serie || '').trim();
    if (/^serie/i.test(s)) return s;
    const m = (f.llave || '').match(/^([AC])-(\d+)\|/);
    return m ? `Serie ${m[1]} No. ${m[2]}` : '';
}

/**
 * El nombre del juez del voto. El contrato lo da ya escrito; si llega el slug
 * del payload («cancado-trindade»), se toma de `ref` («Voto de Cançado
 * Trindade, párr. 1»), que conserva los acentos y la cedilla.
 */
export function autorVoto(f: CamposCoidh & { ref?: string | null }): string | null {
    // Sin `voto_autor`, la llave también lo dice («C-101|v:garcia-ramirez|27»).
    // Un voto sin autor se rotularía «párr. 27» y la referencia se lo
    // atribuiría a la Corte: el plan (§3.7) exige que «un voto no es la Corte».
    const v = (f.voto_autor || (f.llave || '').match(/\|v:([a-z0-9+-]+)\|/)?.[1] || '').trim();
    if (!v) return null;
    if (/[A-ZÁÉÍÓÚÑ ]/.test(v)) return v;
    const m = (f.ref || '').match(/^Voto de (.+?)(?:,\s*(?:p[aá]rr\.|sin numerar).*)?$/i);
    if (m) return m[1].trim();
    return v
        .split('+')
        .map((a) => a.split('-').map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(' '))
        .join(' y ');
}

/** «párr. 124», «resolutivo 8», «considerando 67»; «pasaje citado» sin número. */
export function lugarCoidh(f: CamposCoidh): string {
    const n = numeroCoidh(f);
    if (!n) return 'pasaje citado';
    switch ((f.seg || '').toLowerCase()) {
        case 'resolutivos':
            return `resolutivo ${n}`;
        case 'considerandos':
            return `considerando ${n}`;
        case 'visto':
            return `visto ${n}`;
        default:
            return `párr. ${n}`;
    }
}

/** Lo que va tras «Ir al…»: «párr. 124», «voto de García Ramírez, párr. 12», «resolutivo 8». */
export function lugarConVoto(f: CamposCoidh & { ref?: string | null; texto?: string | null; silo?: string | null }): string {
    const autor = autorVoto(f);
    const n = numeroCoidh(f);
    if (autor) return n ? `voto de ${autor}, párr. ${n}` : `voto de ${autor}`;
    // Una ficha sin número no tiene «pasaje citado»: tiene su extracto
    // verificado, o su página, o nada más que la ficha. Va tras «Ir al…» y
    // «Buscando el…», de ahí el masculino.
    if (!n && esFichaCoidh(f)) {
        if (!f.pagina) return 'ficha del catálogo';
        return extractoDeFicha(f.texto) ? 'extracto verificado' : `pasaje de la pág. ${f.pagina}`;
    }
    return lugarCoidh(f);
}

/** «OC-24/17» de un caso como «OC-24/17 · Identidad de género…». */
function nombreCorto(f: CamposCoidh): string {
    const caso = (f.caso || '').trim();
    if (f.tipo === 'oc_coidh' || /^OC-\d/i.test(caso)) return caso.split(' · ')[0];
    if (!caso) return '';
    return /^caso\b/i.test(caso) ? caso : `Caso ${caso}`;
}

/**
 * El rótulo del visor, en lugar de «Fuente gubernamental»:
 *   Corte IDH · Caso Almonacid Arellano y otros Vs. Chile · párr. 124
 *   Corte IDH · Caso Trabajadores Cesados del Congreso… · voto de García Ramírez, párr. 12
 *   Corte IDH · Caso Tzompaxtle Tecpile y otros Vs. México · resolutivo 8
 *   Corte IDH · OC-24/17 · párr. 26
 */
export function rotuloCoidh(f: CamposCoidh & { ref?: string | null; texto?: string | null; silo?: string | null }): string {
    const partes = ['Corte IDH'];
    const nombre = nombreCorto(f);
    if (nombre) partes.push(nombre);
    if (f.tipo === 'supervision_coidh') partes.push('supervisión de cumplimiento');
    partes.push(lugarConVoto(f));
    return partes.join(' · ');
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «2006-09-26» → «26 de septiembre de 2006». */
export function fechaLarga(iso: string | null | undefined): string {
    const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

/**
 * La referencia de la Corte IDH para las referencias del escrito. Manda la
 * cita canónica del catálogo, que es la forma en que la propia Corte se cita
 * («Corte IDH. Caso … Sentencia de 26 de septiembre de 2006. Serie C No. 154,
 * párr. 124.»). Sin ella, se arma con lo que haya.
 */
export function referenciaCoidh(f: CamposCoidh & { ref?: string | null; origen?: string | null }): string {
    const canonica = (f.cita_canonica || '').trim();
    if (canonica) return /[.]$/.test(canonica) ? canonica : `${canonica}.`;
    const nombre = nombreCorto(f) || (f.origen || '').trim() || 'Corte Interamericana de Derechos Humanos';
    const fecha = fechaLarga(f.fecha);
    const autor = autorVoto(f);
    const n = numeroCoidh(f);
    const acto = f.tipo === 'oc_coidh' ? 'Opinión Consultiva' : f.tipo === 'supervision_coidh' ? 'Resolución' : 'Sentencia';
    const partes = [`Corte IDH. ${nombre}.`];
    if (fecha) partes.push(`${acto} de ${fecha}.`);
    const cola = [serieCoidh(f), !autor && n ? lugarCoidh(f) : ''].filter(Boolean).join(', ');
    if (cola) partes.push(`${cola.charAt(0).toUpperCase()}${cola.slice(1)}.`);
    if (autor) partes.push(`Voto de ${autor}${n ? `, párr. ${n}` : ''}.`);
    return partes.join(' ');
}

/**
 * La dirección oficial, sin fragmento: `url_oficial` o, si falta, `pdf_url`.
 * Sólo http(s): va a un `href` y a `window.open`, y un `javascript:` que se
 * colara en un payload sería código en la página (revisión del 25-sep-2026).
 */
export function urlOficialCoidh(f: CamposCoidh & { pdf_url?: string | null }): string | null {
    const oficial = httpSinFragmento(f.url_oficial);
    if (oficial) return oficial;
    // Sin `url_oficial`, `pdf_url` sólo hace de dirección oficial si ES de la
    // Corte: la copia de legal-docs no se enlaza como «el sitio de la Corte».
    const pdf = httpSinFragmento(f.pdf_url);
    return pdf && esDeCorteidh(pdf) ? pdf : null;
}

function httpSinFragmento(u: string | null | undefined): string | null {
    const s = (u || '').trim().split('#')[0];
    return /^https?:\/\//i.test(s) ? s : null;
}

function esDeCorteidh(u: string): boolean {
    try {
        return /(^|\.)corteidh\.or\.cr$/i.test(new URL(u).hostname);
    } catch {
        return false;
    }
}

/**
 * EL PDF QUE SE DIBUJA NO ES EL DE LA CORTE, ES SU COPIA (25-sep-2026).
 *
 * Cloudflare de corteidh.or.cr reta con 403 a TODO cliente automático,
 * también al proxy de Vercel: el visor decía «No se pudo abrir el PDF aquí»
 * en cada sentencia. Las 58 resoluciones del piloto se subieron al bucket
 * público `legal-docs/CorteIDH/` —donde ya viven la Constitución y los
 * tratados—, cada una con el MISMO sha1 del PDF con que se midieron las
 * páginas (`datos/coidh_copias.json` del backend), y el backend manda esa
 * copia en `pdf_url`. Así la página 53 de la copia es la página 53 que midió
 * el troceador, y el resaltado del ¶124 cae donde debe.
 *
 *  - `pdf_url` que NO es de corteidh.or.cr (la copia): se dibuja ésa, por el
 *    proxy de siempre (Supabase ya está en la lista).
 *  - `pdf_url` ausente o de corteidh.or.cr (una resolución sin copia, o una
 *    fuente vieja guardada en el historial): lo de antes, la dirección
 *    oficial por la puerta de la Corte.
 * `url_oficial` queda SÓLO para la cita y el enlace a la Corte.
 */
export function urlPdfCoidh(f: CamposCoidh & { pdf_url?: string | null }): string | null {
    const pdf = httpSinFragmento(f.pdf_url);
    if (pdf && !esDeCorteidh(pdf)) return pdf;
    return urlOficialCoidh(f);
}

/** ¿Se dibuja una copia nuestra del PDF de la Corte (y no el de corteidh.or.cr)? */
export function dibujaCopiaCoidh(f: CamposCoidh & { pdf_url?: string | null }): boolean {
    const pdf = urlPdfCoidh(f);
    return Boolean(pdf && !esDeCorteidh(pdf));
}

/**
 * El enlace directo a la Corte, en la página del párrafo: lo que se abre en
 * otra pestaña y lo que queda si pdf.js no puede dibujar el PDF. NO pasa por
 * el proxy: si el proxy o el origen fallan, ése es justo el camino que no
 * sirve. El visor nativo del navegador entiende `#page=N` (abrió la pág. 53
 * de Almonacid en Chromium en 2 de 3 intentos).
 */
export function enlaceOficialCoidh(f: CamposCoidh & { pdf_url?: string | null }): string | null {
    const u = urlOficialCoidh(f);
    if (!u) return null;
    const pag = Number(f.pagina);
    return Number.isInteger(pag) && pag > 0 ? `${u}#page=${pag}` : u;
}

/** El párrafo sin la cabecera «[Corte IDH | Caso … | párr. 124]» con que se vectoriza. */
export function textoCoidh(texto: string | null | undefined): string {
    return (texto || '').replace(/^\s*\[Corte IDH[^\]]*\]\s*/i, '').trim();
}

/**
 * LAS FICHAS NO SON PÁRRAFOS (revisión del 25-sep-2026).
 *
 * El backend también manda con `silo: "coidh"` resoluciones que NO están en
 * la colección (`linea_coidh.ficha_catalogo`, `ficha_hito`,
 * `ficha_supervision`): su `texto` es una nota —«Ficha del catálogo oficial
 * de la Corte IDH: …», «Hito de la línea curada; el texto completo … no está
 * ingerido»—, sin `ancla` y, en las del catálogo, sin `pagina`. Tratarlas como
 * párrafo ofrecía «Copiar el párrafo» sobre la nota y, sin página, mandaba al
 * visor a recorrer hasta 500 páginas buscando la nota en el PDF (y a pintar
 * «el pasaje más parecido»: la portada, que trae las mismas palabras). La
 * nota empieza justo tras la cabecera, así que se reconoce también en el
 * texto recortado a 350 de `FUENTES_PREVIAS`.
 */
export function esFichaCoidh(f: { texto?: string | null; ancla?: string | null; silo?: string | null }): boolean {
    if (!esCoidh(f) || (f.ancla || '').trim()) return false;
    return /^(ficha del cat[aá]logo oficial|hito de la l[ií]nea curada)/i.test(textoCoidh(f.texto));
}

/**
 * El ancla de una ficha de hito o de supervisión: su extracto, que SÍ es
 * literal («Extracto verificado en la pág. 15 del PDF oficial: «…»»), en sus
 * primeras 15 palabras. Con él el visor confirma el pasaje en su página en
 * vez de fiarse de un número suelto. Tolera el extracto cortado por el
 * recorte de `FUENTES_PREVIAS` (sin el «»» final).
 */
export function extractoDeFicha(texto: string | null | undefined): string | null {
    const m = (texto || '').match(/Extracto verificado en la p[aá]g\.\s*\d+ del PDF oficial:\s*«([^»]+)/i);
    const e = m ? m[1].replace(/^[\s.…]+/, '').trim() : '';
    return e.split(/\s+/).length >= 5 ? e : null;
}

export function anclaDeFicha(texto: string | null | undefined): string | null {
    const e = extractoDeFicha(texto);
    return e ? e.split(/\s+/).slice(0, 15).join(' ') : null;
}

/**
 * `FUENTES_PREVIAS` (main.py, `_fuentes_previas`) manda el texto recortado a
 * 350 caracteres mientras la respuesta se escribe; `CITATION_META` lo manda
 * entero al final. Con el recortado el visor no puede cerrar el resaltado por
 * el final del texto, y se lo dice. Medido sobre los 16,825 puntos del piloto:
 * con el texto recortado, 94.97 % del resaltado cubre ≥95 % del párrafo; con
 * el entero, 95.37 %.
 */
export const LARGO_FUENTES_PREVIAS = 350;
export function textoEstaCompleto(texto: string | null | undefined): boolean {
    // Python corta por puntos de código y `.length` cuenta unidades UTF-16:
    // un carácter fuera del plano básico hacía 351 de un texto recortado.
    return Array.from(texto || '').length !== LARGO_FUENTES_PREVIAS;
}
