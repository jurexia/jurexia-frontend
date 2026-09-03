/**
 * Lector de expedientes del Poder Judicial de la Federación.
 *
 * Es el gemelo en TypeScript de `seg_lector_pjf.py`, que vive en el backend.
 * Se duplica a propósito: así el alta y el barrido diario corren en Vercel sin
 * depender de que Render esté desplegado y despierto. Si algún día se unifican,
 * el que manda es este, porque es el que usa la pantalla.
 *
 * QUÉ LEE. La página pública de captura del propio Consejo de la Judicatura, la
 * misma que abre cualquiera que consulte su asunto:
 *
 *   https://www.dgej.cjf.gob.mx/siseinternet/Reportes/VerCaptura.aspx
 *       ?tipoasunto=1&organismo=293&expediente=71/2026&tipoprocedimiento=0
 *
 * Devuelve la carátula y la tabla `grvAcuerdos` con la historia cronológica
 * completa. Una petición trae el expediente entero, así que un día inhábil o
 * una caída del portal no pierden nada: al día siguiente reaparece lo publicado
 * en el hueco, con su fecha de auto real.
 *
 * LO QUE NO HACE. No resuelve CAPTCHAs. Las pantallas de búsqueda del PJF
 * llevan reCAPTCHA y no se usan; no hacen falta, porque la pregunta de un
 * litigante es por su propio número. Si algún día le ponen reto a esta ruta,
 * `parsear` lo detecta y levanta ErrorFormato para que el sistema se declare
 * ciego en vez de inventarse un «sin novedad».
 */

import { createHash } from 'crypto';
import https from 'https';
import tls from 'tls';
import { ISRG_ROOT_YR } from './raiz-yr';

/**
 * El portal del Consejo encadena con una raíz de Let's Encrypt más nueva que
 * el almacén de Node, así que `fetch` no puede validarla. Se pide con el
 * módulo `https` añadiendo esa raíz a las de siempre: la verificación sigue
 * entera, sólo se le da a Node el certificado que le falta.
 */
const CA = [...tls.rootCertificates, ISRG_ROOT_YR];

function pedir(url: string, timeout = 45_000): Promise<{ status: number; cuerpo: string }> {
    const u = new URL(url);
    return new Promise((ok, mal) => {
        const req = https.request({
            hostname: u.hostname, port: 443, path: u.pathname + u.search,
            method: 'GET', ca: CA, timeout,
            headers: {
                'User-Agent': AGENTE,
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'es-MX,es;q=0.9',
            },
        }, res => {
            let d = '';
            res.setEncoding('utf8');
            res.on('data', c => { d += c; });
            res.on('end', () => ok({ status: res.statusCode || 0, cuerpo: d }));
        });
        req.on('timeout', () => { req.destroy(new Error('el portal no respondió a tiempo')); });
        req.on('error', mal);
        req.end();
    });
}

const BASE = 'https://www.dgej.cjf.gob.mx/siseinternet/Reportes/VerCaptura.aspx';
export const AGENTE =
    'Iurexia/1.0 (+https://iurexia.com/bot; contacto: soporte@iurexia.com)';

/** Las seis columnas que la tabla tiene que traer, en este orden. Si el portal
 *  cambia el encabezado nos enteramos aquí, y no más adelante leyendo fechas
 *  de la columna equivocada. */
const COLUMNAS = ['no.', 'fecha del auto', 'tipo cuaderno',
    'fecha de publicacion', 'resumen', 'ver sintesis completa'];

export class ErrorFormato extends Error {}
export class ErrorNoEncontrado extends Error {}

export type Acuerdo = {
    orden_en_lista: number | null;
    fecha_auto: string | null;
    cuaderno: string | null;
    fecha_publicacion: string | null;
    resumen: string;
    huella_clave: string;
    huella_texto: string;
    simhash: null;
};

export type Lectura = {
    caratula: {
        organo: string | null;
        neun: string | null;
        expediente: string | null;
        organismo: string;
    };
    acuerdos: Acuerdo[];
    url: string;
    http: number;
    bytes: number;
    hash_respuesta: string;
};

// ── Normalización y huellas ───────────────────────────────────────────

export function sinTildes(t: string) {
    return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Texto comparable. Se conservan tildes y eñes a propósito: en un acuerdo
 *  «anos» y «años» no son lo mismo. */
export function normalizar(t: string | null | undefined) {
    return (t || '')
        .normalize('NFKC')
        .replace(/ /g, ' ')
        .replace(/[“”«»]/g, '"')
        .replace(/[‘’]/g, "'")
        // Los sellos de hora se reimprimen distintos entre visitas.
        .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(hrs?|horas)?\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

const sha = (...partes: string[]) =>
    createHash('sha256').update(partes.join('|'), 'utf8').digest('hex');

/**
 * La identidad del acuerdo.
 *
 * Lleva `fecha_auto` y no la de publicación porque la del auto es del juez y no
 * se mueve. Lleva `cuaderno` porque el principal y el incidente de suspensión
 * pueden tener autos el mismo día. Y NO lleva el número de orden de la lista:
 * el juzgado lo renumera al intercalar un acuerdo atrasado, y si formara parte
 * de la identidad, un día cualquiera el expediente entero parecería nuevo.
 */
export function huellaClave(
    jurisdiccion: string, organo: string, numero: string,
    neun: string | null, cuaderno: string, fechaAuto: string | null, resumen: string,
) {
    return sha(jurisdiccion, organo, numero, neun || '',
        normalizar(cuaderno), fechaAuto || '', normalizar(resumen).slice(0, 300));
}

export function huellaTexto(resumen: string, completo?: string | null) {
    return sha(normalizar(resumen), normalizar(completo || ''));
}

/**
 * El simhash NO se calcula aquí, y la columna queda a null.
 *
 * Se guarda en la tabla por si algún día hace falta descartar en grueso entre
 * muchos documentos, pero no decide nada: el desempate de reediciones lo hace
 * `parecido` sobre el texto real, en `detector.ts`. Calcularlo obligaría a
 * BigInt y a subir el objetivo de compilación de todo el proyecto a ES2020
 * por un campo que ningún camino lee. El barrido en Python sí lo rellena.
 */

// ── Petición ──────────────────────────────────────────────────────────

export function urlDe(organismo: string | number, expediente: string,
                      tipoAsunto: string | number = 1,
                      tipoProcedimiento: string | number = 0) {
    return `${BASE}?tipoasunto=${tipoAsunto}&organismo=${organismo}`
        + `&expediente=${encodeURIComponent(expediente).replace(/%2F/g, '/')}`
        + `&tipoprocedimiento=${tipoProcedimiento}`;
}

// ── Parser ────────────────────────────────────────────────────────────

const texto = (f: string) =>
    f.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é')
        .replace(/&iacute;/gi, 'í').replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú')
        .replace(/&ntilde;/gi, 'ñ').replace(/&Ntilde;/g, 'Ñ')
        .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim();

function span(s: string, id: string) {
    const m = s.match(new RegExp(`<span[^>]*id="${id}"[^>]*>([\\s\\S]*?)</span>`, 'i'));
    return m ? texto(m[1]) : null;
}

/** «19-01-2026» → «2026-01-19». */
function fecha(t: string) {
    const m = (t || '').trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** «71/2026» === «071/2026»: el portal a veces rellena con ceros. */
function mismoNumero(a: string | null, b: string) {
    const limpia = (x: string | null) => {
        const m = (x || '').trim().match(/^0*(\d+)\s*\/\s*(\d{4})$/);
        return m ? `${m[1]}/${m[2]}` : (x || '').replace(/\s+/g, '').toLowerCase();
    };
    return limpia(a) === limpia(b);
}

/** El primer grupo de cada coincidencia. Con `exec` en vez de `matchAll`
 *  porque el objetivo de compilación del proyecto no recorre iteradores. */
function todas(s: string, re: RegExp): string[] {
    const salida: string[] = [];
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = r.exec(s)) !== null) {
        salida.push(m[1]);
        if (m.index === r.lastIndex) r.lastIndex++;   // guarda contra bucle infinito
    }
    return salida;
}

export function parsear(s: string, expedientePedido: string, organismo: string) {
    if (/recaptcha|g-recaptcha|captcha/i.test(s)) {
        throw new ErrorFormato('la página trae un reto CAPTCHA que antes no tenía');
    }

    // El portal es explícito cuando el expediente no está: emite un alert de
    // JavaScript. Es la señal más limpia que da, y su texto es justo el que hay
    // que enseñarle al abogado. Esto NO es un fallo del portal: es un dato mal
    // dado, y se trata distinto.
    const alerta = s.match(/alert\(\s*["'](No existe[^"']{0,240})["']\s*\)/i);
    if (alerta) throw new ErrorNoEncontrado(texto(alerta[1]));

    const organo = span(s, 'lblNombreOrgano');
    const neun = span(s, 'lblNEUN');
    const asignado = span(s, 'lblNoExpedienteAsignado');

    if (!organo && !asignado) {
        throw new ErrorNoEncontrado('la página no trae carátula');
    }
    // La comprobación que impide leer el expediente del vecino.
    if (asignado && !mismoNumero(asignado, expedientePedido)) {
        throw new ErrorNoEncontrado(
            `se pidió ${expedientePedido} y la página devolvió ${asignado}`);
    }

    const i = s.indexOf('id="grvAcuerdos"');
    if (i < 0) throw new ErrorFormato('no está la tabla grvAcuerdos');
    const j = s.indexOf('</table>', i);
    const tabla = s.slice(i, j > 0 ? j : undefined);

    const filas = todas(tabla, /<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (!filas.length) throw new ErrorFormato('la tabla no tiene filas');

    const celdasDe = (f: string) => todas(f, /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g);

    const encabezado = celdasDe(filas[0]).map(c => sinTildes(texto(c)).toLowerCase());
    if (JSON.stringify(encabezado) !== JSON.stringify(COLUMNAS)) {
        throw new ErrorFormato(`el encabezado cambió: llegó ${encabezado.join(' | ')}`);
    }

    const acuerdos: Acuerdo[] = [];
    for (const f of filas.slice(1)) {
        const celdas = celdasDe(f);
        if (celdas.length !== 6) continue;          // paginación del GridView
        const c = celdas.map(texto);
        if (!c[4]) continue;                        // sin resumen no hay acuerdo

        const cuaderno = c[2] || null;
        const fechaAuto = fecha(c[1]);
        acuerdos.push({
            orden_en_lista: /^\d+$/.test(c[0]) ? Number(c[0]) : null,
            fecha_auto: fechaAuto,
            cuaderno,
            fecha_publicacion: fecha(c[3]),
            resumen: c[4],
            huella_clave: huellaClave('PJF', organismo, asignado || expedientePedido,
                neun, cuaderno || '', fechaAuto, c[4]),
            huella_texto: huellaTexto(c[4]),
            simhash: null,
        });
    }

    return {
        caratula: { organo, neun, expediente: asignado, organismo },
        acuerdos,
    };
}

/**
 * La operación completa. `minimoEsperado` son los acuerdos que ya teníamos: si
 * la página trae menos, algo va mal y NO se puede afirmar que no hubo novedad.
 */
export async function leer(
    organismo: string | number, expediente: string,
    tipoAsunto: string | number = 1, tipoProcedimiento: string | number = 0,
    minimoEsperado = 0,
): Promise<Lectura> {
    const url = urlDe(organismo, expediente, tipoAsunto, tipoProcedimiento);
    const { status, cuerpo } = await pedir(url);
    if (status !== 200) throw new ErrorFormato(`HTTP ${status}`);

    const l = parsear(cuerpo, expediente, String(organismo));
    if (minimoEsperado && l.acuerdos.length < minimoEsperado) {
        throw new ErrorFormato(
            `la página trajo ${l.acuerdos.length} acuerdos y ya teníamos `
            + `${minimoEsperado}: no se puede afirmar que no hubo novedad`);
    }

    return {
        ...l, url, http: status, bytes: cuerpo.length,
        hash_respuesta: createHash('sha256').update(cuerpo, 'utf8').digest('hex'),
    };
}
