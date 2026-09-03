/**
 * Lector del Boletín Judicial de la Ciudad de México.
 *
 * POR QUÉ POR BOLETÍN Y NO POR BUSCADOR. El buscador del TSJCDMX tiene doble
 * muro: un captcha dibujado en canvas por su propio JavaScript y además
 * reCAPTCHA v3. No se usa. No hace falta: el Boletín Judicial publica cada día,
 * en un solo PDF, todos los acuerdos de todos los juzgados, y eso es un
 * documento público por disposición legal.
 *
 * UNA DESCARGA RESUELVE LA CARTERA ENTERA. Da igual seguir diez expedientes o
 * mil: el coste de red es el mismo, un PDF al día. Es lo contrario del PJF,
 * donde hay que preguntar expediente por expediente.
 *
 * EL PDF: ~20 MB, 400 páginas, cifrado con contraseña de PROPIETARIO —se abre
 * sin contraseña de usuario— y con capa de texto, así que no hace falta OCR.
 * Publicado hacia las 05:49 hora local, tres horas antes de la revisión.
 *
 * CÓMO SE ESTRUCTURA:
 *
 *     CUARTO DE LO CIVIL
 *     SECRETARÍA "A"
 *     ACUERDOS DEL 1 DE SEPTIEMBRE DEL 2026
 *     Fulano vs. Mengano. Ord. Civil Acuerdo. 1 Acdo. Núm. Exp. 1053/2024.
 *
 * El juzgado va en ordinal escrito y es imprescindible: el 200/2026 existe en
 * muchos juzgados a la vez, y sin él el seguimiento avisaría del asunto de otro.
 */

import { huellaClave, huellaTexto } from './pjf';

const INDICE = 'https://consultabpj.poderjudicialcdmx.gob.mx:2096/consultaboletinpjcdmx';
const AGENTE = 'Iurexia/1.0 (+https://iurexia.com/bot; contacto: soporte@iurexia.com)';

const MESES: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5,
    jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

const MESES_LARGO: Record<string, number> = { enero: 1, febrero: 2, marzo: 3,
    abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9,
    octubre: 10, noviembre: 11, diciembre: 12 };

const ORD = 'PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|SEPTIMO|OCTAVO'
    + '|NOVENO|DÉCIMO|DECIMO|UNDÉCIMO|UNDECIMO|DUODÉCIMO|DUODECIMO|VIGÉSIMO'
    + '|VIGESIMO|TRIGÉSIMO|TRIGESIMO|CUADRAGÉSIMO|CUADRAGESIMO|QUINCUAGÉSIMO'
    + '|QUINCUAGESIMO|SEXAGÉSIMO|SEXAGESIMO|SEPTUAGÉSIMO|SEPTUAGESIMO';

const RE_JUZGADO = new RegExp(
    `^\\s*((?:${ORD})(?:\\s+(?:${ORD}))?\\s+DE\\s+LO\\s+[A-ZÁÉÍÓÚÑ ]{4,40})\\s*$`);
/** El PDF parte el rótulo cuando no le cabe: «… DE LO CIVIL DE» / «PROCESO
 *  ORAL». Sin unirlas, el mismo juzgado queda bajo tres claves distintas. */
const RE_CONTINUA = /^\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{2,40})\s*$/;
const RE_SECRETARIA = /^\s*SECRETAR[IÍ]A\s*[“"«]?\s*([A-Z])\s*[”"»]?\s*$/;
const RE_ACUERDOS = /^\s*ACUERDOS?\s+DEL?\s+(.{6,60})\s*$/i;
const RE_EXP = /Núm\.\s*Exp\.\s*(\d{1,6})\s*\/\s*(\d{4})/i;

export class ErrorBoletin extends Error {}

export function llano(t: string) {
    return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export type Boletin = { fecha: string; id_externo: string | null; url: string };

/** Los boletines publicados, del más reciente al más antiguo. No hace falta
 *  POST ni token: la página trae fecha y PDF en cada fila. */
export async function indice(): Promise<Boletin[]> {
    const r = await fetch(INDICE, {
        headers: { 'User-Agent': AGENTE }, cache: 'no-store',
        signal: AbortSignal.timeout(40_000),
    });
    const s = await r.text();
    const salida: Boletin[] = [];
    const filas = s.split(/<tr[^>]*>/i);
    for (const fila of filas) {
        const f = fila.match(/(\d{2})-([a-zA-Z]{3})\.?-(\d{4})/);
        const pdf = fila.match(/href="([^"]*\/pdf\/boletines\/[^"]+\.pdf)"/);
        const ext = fila.match(/\/externo\/(\d+)/);
        if (!f || !pdf) continue;
        const mes = MESES[f[2].slice(0, 3).toLowerCase()];
        if (!mes) continue;
        salida.push({
            fecha: `${f[3]}-${String(mes).padStart(2, '0')}-${f[1]}`,
            id_externo: ext ? ext[1] : null, url: pdf[1],
        });
    }
    if (!salida.length) throw new ErrorBoletin('el índice no trae ninguna fila con PDF');
    return salida;
}

export type Entrada = {
    juzgado: string; secretaria: string | null;
    acuerdos_del: string | null; pagina: number; texto: string;
};

/** Descarga el PDF y lo indexa por (juzgado, expediente). */
export async function indexar(url: string) {
    const r = await fetch(url, {
        headers: { 'User-Agent': AGENTE }, cache: 'no-store',
        signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) throw new ErrorBoletin(`el PDF respondió HTTP ${r.status}`);
    const datos = new Uint8Array(await r.arrayBuffer());
    if (datos[0] !== 0x25 || datos[1] !== 0x50) {
        throw new ErrorBoletin('lo descargado no es un PDF');
    }

    // El build «legacy» es el que corre en Node sin canvas ni worker.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({
        data: datos, password: '', isEvalSupported: false, useSystemFonts: true,
    }).promise;

    if (doc.numPages < 20) {
        throw new ErrorBoletin(`sólo ${doc.numPages} páginas: no parece el boletín`);
    }

    const entradas = new Map<string, Entrada[]>();
    const juzgados = new Set<string>();
    let juzgado: string | null = null;
    let secretaria: string | null = null;
    let acuerdosDel: string | null = null;
    let esperandoResto = false;

    for (let n = 1; n <= doc.numPages; n++) {
        const pagina = await doc.getPage(n);
        const contenido = await pagina.getTextContent();

        // pdfjs entrega fragmentos, no líneas: se reconstruyen con hasEOL,
        // porque el rótulo del juzgado sólo se reconoce si va en línea propia.
        const lineas: string[] = [];
        let actual = '';
        for (const item of contenido.items as { str: string; hasEOL?: boolean }[]) {
            actual += item.str;
            if (item.hasEOL) { lineas.push(actual); actual = ''; }
        }
        if (actual) lineas.push(actual);

        let buffer: string[] = [];
        for (const cruda of lineas) {
            const l = cruda.replace(/\s+/g, ' ').trim();
            if (!l) continue;

            const mj = RE_JUZGADO.exec(l);
            if (mj) { juzgado = mj[1].trim(); esperandoResto = true; buffer = []; continue; }
            if (esperandoResto) {
                if (RE_CONTINUA.test(l) && !RE_SECRETARIA.test(l) && !RE_ACUERDOS.test(l)) {
                    juzgado = `${juzgado} ${l}`.trim();
                    continue;
                }
                esperandoResto = false;
                if (juzgado) juzgados.add(juzgado);
            }
            const ms = RE_SECRETARIA.exec(l);
            if (ms) { secretaria = ms[1]; buffer = []; continue; }
            const ma = RE_ACUERDOS.exec(l);
            if (ma) { acuerdosDel = ma[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, ''); buffer = []; continue; }

            buffer.push(l);
            const me = RE_EXP.exec(l);
            if (me && juzgado) {
                // El «Tomo II.» que cierra la entrada anterior cae al principio
                // de ésta, porque va detrás del número en la misma línea.
                const texto = buffer.join(' ').replace(/\s+/g, ' ')
                    .replace(/^(Tomo\s+[IVXLC]+\.?\s*)+/, '').trim();
                const clave = `${llano(juzgado)}|${Number(me[1])}/${me[2]}`;
                entradas.set(clave, [...(entradas.get(clave) || []),
                    { juzgado, secretaria, acuerdos_del: acuerdosDel, pagina: n, texto }]);
                buffer = [];
            }
        }
    }

    if (!entradas.size) {
        throw new ErrorBoletin('no se reconoció ninguna entrada: ¿cambió el formato?');
    }
    return { entradas, juzgados: Array.from(juzgados), paginas: doc.numPages };
}

export function buscar(idx: { entradas: Map<string, Entrada[]> },
                       juzgado: string, expediente: string): Entrada[] {
    const [n, a] = expediente.split('/');
    return idx.entradas.get(`${llano(juzgado)}|${Number(n)}/${a}`) || [];
}

/** «1 DE SEPTIEMBRE DEL 2026» → «2026-09-01». */
export function fechaDeRotulo(rotulo: string | null) {
    if (!rotulo) return null;
    const m = rotulo.match(/(\d{1,2})\s+DE\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+DEL?\s+(\d{4})/i);
    if (!m) return null;
    const mes = MESES_LARGO[m[2].toLowerCase()];
    return mes ? `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** Convierte las entradas del boletín en acuerdos con sus huellas, para que
 *  entren por el mismo detector que los del PJF. */
export function comoAcuerdos(entradas: Entrada[], claveOrgano: string,
                             numero: string, fechaBoletin: string) {
    return entradas.map(e => {
        const fecha = fechaDeRotulo(e.acuerdos_del) || fechaBoletin;
        const cuaderno = e.secretaria ? `Secretaría ${e.secretaria}` : null;
        return {
            orden_en_lista: null,
            fecha_auto: fecha,
            fecha_publicacion: fechaBoletin,
            cuaderno,
            resumen: e.texto,
            pagina: e.pagina,
            huella_clave: huellaClave('CDMX', claveOrgano, numero, null,
                e.secretaria || '', fecha, e.texto),
            huella_texto: huellaTexto(e.texto),
            simhash: null,
        };
    });
}
