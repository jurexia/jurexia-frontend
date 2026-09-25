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
    /** https://www.corteidh.or.cr/… sin `#page`. Igual que `pdf_url`. */
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
}

/** Los nombres de los campos, para copiarlos de un marcador a otro. */
export const CLAVES_COIDH: (keyof CamposCoidh)[] = [
    'tipo', 'url_oficial', 'pagina', 'parrafo', 'seg', 'voto_autor', 'caso', 'serie',
    'fecha', 'ancla', 'cita_canonica', 'llave', 'pdf_sha1',
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
    const v = (f.voto_autor || '').trim();
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
export function lugarConVoto(f: CamposCoidh & { ref?: string | null }): string {
    const autor = autorVoto(f);
    const n = numeroCoidh(f);
    if (autor) return n ? `voto de ${autor}, párr. ${n}` : `voto de ${autor}`;
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
export function rotuloCoidh(f: CamposCoidh & { ref?: string | null }): string {
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

/** La dirección oficial, sin fragmento: `url_oficial` o, si falta, `pdf_url`. */
export function urlOficialCoidh(f: CamposCoidh & { pdf_url?: string | null }): string | null {
    const u = (f.url_oficial || f.pdf_url || '').trim();
    return u ? u.split('#')[0] : null;
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
    return f.pagina ? `${u}#page=${f.pagina}` : u;
}

/** El párrafo sin la cabecera «[Corte IDH | Caso … | párr. 124]» con que se vectoriza. */
export function textoCoidh(texto: string | null | undefined): string {
    return (texto || '').replace(/^\s*\[Corte IDH[^\]]*\]\s*/i, '').trim();
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
    return (texto || '').length !== LARGO_FUENTES_PREVIAS;
}
