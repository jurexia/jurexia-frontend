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

/**
 * Lo que pdfjs da por hecho que existe y en un servidor no existe.
 *
 * POR QUÉ HACE FALTA. `pdf.mjs` evalúa `const SCALE_MATRIX = new DOMMatrix()`
 * a nivel de módulo. En una máquina de desarrollo eso funciona por accidente:
 * pdfjs intenta un `require('@napi-rs/canvas')` y de ahí saca la clase. En el
 * empaquetado de Vercel ese require no resuelve, y el import entero revienta
 * con «DOMMatrix is not defined» ANTES de leer un solo byte. Eso es lo que
 * llevaba fallando el seguimiento de la Ciudad de México en producción: los
 * cuatro pases de cada día, siempre, con el mismo mensaje. Nunca funcionó allí.
 *
 * La alternativa era arrastrar el canvas nativo hasta el servidor —cincuenta
 * megas de binario por plataforma— para no dibujar nada: aquí sólo se extrae
 * texto, y el lienzo no se toca. Así que se define lo mínimo, que además es
 * determinista y no depende de qué binario haya en la máquina.
 */
function prepararEntorno() {
    const g = globalThis as Record<string, unknown>;
    if (typeof g.DOMMatrix === 'undefined') {
        class MatrizMinima {
            a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
            constructor(init?: number[] | Float32Array | string) {
                if (init && typeof init !== 'string' && 'length' in init && init.length >= 6) {
                    [this.a, this.b, this.c, this.d, this.e, this.f] =
                        Array.from(init as ArrayLike<number>);
                }
            }
            private static de(m: MatrizMinima) {
                const n = new MatrizMinima();
                n.a = m.a; n.b = m.b; n.c = m.c; n.d = m.d; n.e = m.e; n.f = m.f;
                return n;
            }
            multiplySelf(o: MatrizMinima) {
                const { a, b, c, d, e, f } = this;
                this.a = a * o.a + c * o.b;   this.b = b * o.a + d * o.b;
                this.c = a * o.c + c * o.d;   this.d = b * o.c + d * o.d;
                this.e = a * o.e + c * o.f + e;
                this.f = b * o.e + d * o.f + f;
                return this;
            }
            preMultiplySelf(o: MatrizMinima) {
                const n = MatrizMinima.de(o).multiplySelf(this);
                this.a = n.a; this.b = n.b; this.c = n.c;
                this.d = n.d; this.e = n.e; this.f = n.f;
                return this;
            }
            translateSelf(x = 0, y = 0) { this.e += this.a * x + this.c * y;
                                          this.f += this.b * x + this.d * y; return this; }
            scaleSelf(x = 1, y = x) { this.a *= x; this.b *= x; this.c *= y; this.d *= y; return this; }
            translate(x = 0, y = 0) { return MatrizMinima.de(this).translateSelf(x, y); }
            scale(x = 1, y = x) { return MatrizMinima.de(this).scaleSelf(x, y); }
            invertSelf() {
                const det = this.a * this.d - this.b * this.c;
                if (!det) { this.a = this.b = this.c = this.d = this.e = this.f = NaN; return this; }
                const { a, b, c, d, e, f } = this;
                this.a = d / det;  this.b = -b / det;
                this.c = -c / det; this.d = a / det;
                this.e = (c * f - d * e) / det;
                this.f = (b * e - a * f) / det;
                return this;
            }
        }
        g.DOMMatrix = MatrizMinima;
    }
    if (typeof g.ImageData === 'undefined') {
        g.ImageData = class {
            data: Uint8ClampedArray; width: number; height: number;
            constructor(w: number, h: number) {
                this.width = w; this.height = h;
                this.data = new Uint8ClampedArray(w * h * 4);
            }
        };
    }
    if (typeof g.Path2D === 'undefined') {
        g.Path2D = class { addPath() { /* no se dibuja nada */ } };
    }
}

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

    // El build «legacy» es el que corre en Node sin canvas ni worker, pero da
    // por hecho unas cuantas clases del navegador: hay que ponerlas ANTES del
    // import, porque las usa al evaluar el módulo.
    prepararEntorno();
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({
        data: datos, password: '', isEvalSupported: false, useSystemFonts: true,
    }).promise;

    if (doc.numPages < 20) {
        throw new ErrorBoletin(`sólo ${doc.numPages} páginas: no parece el boletín`);
    }

    const entradas = new Map<string, Entrada[]>();
    const juzgados = new Set<string>();
    /** Cuántas veces aparece la etiqueta «Núm. Exp.» en todo el boletín. Es la
     *  cota de cuántos acuerdos hay: si se indexan muchos menos, el lector se
     *  está comiendo entradas y hay que enterarse aquí, no dentro de tres meses
     *  por un abogado que no recibió su aviso. */
    let etiquetas = 0;
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
            etiquetas += (l.match(/Núm\.\s*Exp\./gi) || []).length;

            // EL NÚMERO SE BUSCA SOBRE EL BUFFER UNIDO, NO SOBRE LA LÍNEA.
            //
            // El boletín va en columna justificada y 2.489 veces al día parte
            // la etiqueta del número: el renglón acaba en «… 1 Acdo. Núm. Exp.»
            // y el «2163/2024» empieza en el siguiente. Buscando línea a línea
            // no casaba, y como el buffer tampoco se vaciaba, el texto seguía
            // acumulándose hasta el número del asunto de al lado. Dos daños a la
            // vez: 4.934 expedientes (36% del boletín) no se indexaban nunca, y
            // 2.435 acuerdos quedaban colgados de la clave del vecino — que es
            // peor, porque eso sí manda correos, y del asunto equivocado.
            //
            // El `while` recoge además el caso de un renglón que trae el final
            // de una entrada y el número de la siguiente; lo que sobra tras el
            // número queda de semilla para la que viene.
            let unido = buffer.join(' ').replace(/\s+/g, ' ');
            let me: RegExpExecArray | null;
            while (juzgado && (me = RE_EXP.exec(unido)) !== null) {
                const fin = me.index + me[0].length;
                // El «Tomo II.» que cierra la entrada anterior cae al principio
                // de ésta, porque va detrás del número en la misma línea.
                const texto = unido.slice(0, fin)
                    .replace(/^[.\s]+/, '')
                    .replace(/^(Tomo\s+[IVXLC]+\.?\s*)+/, '').trim();
                const clave = `${llano(juzgado)}|${Number(me[1])}/${me[2]}`;
                entradas.set(clave, [...(entradas.get(clave) || []),
                    { juzgado, secretaria, acuerdos_del: acuerdosDel, pagina: n, texto }]);
                unido = unido.slice(fin).trim();
            }
            buffer = unido ? [unido] : [];
        }
    }

    if (!entradas.size) {
        throw new ErrorBoletin('no se reconoció ninguna entrada: ¿cambió el formato?');
    }
    // Un índice mutilado es peor que ninguno: devuelve «hoy no hubo acuerdo»
    // para expedientes que sí lo tuvieron, y el silencio del correo es una
    // promesa. Si se pierde más de una de cada diez etiquetas, mejor declararse
    // ciego y que el barrido lo apunte como fallo.
    // Sin desestructurar el iterador: el objetivo de compilación del proyecto
    // no lo recorre.
    let total = 0;
    entradas.forEach(v => { total += v.length; });
    if (etiquetas > 100 && total < etiquetas * 0.9) {
        throw new ErrorBoletin(
            `sólo se indexaron ${total} de ${etiquetas} acuerdos anunciados: `
            + 'el formato del boletín cambió');
    }
    return { entradas, juzgados: Array.from(juzgados), paginas: doc.numPages };
}

/**
 * ¿Se puede abrir el boletín desde donde corremos?
 *
 * Indexar las 638 páginas tarda demasiado para una comprobación, así que esto
 * hace lo mínimo que demuestra que la cadena entera funciona: baja el PDF, lo
 * abre y lee el texto de la primera página. Si el entorno no tiene lo que pdfjs
 * da por hecho, revienta aquí —que es donde queremos enterarnos— y no en el
 * barrido de las nueve de la mañana.
 */
export async function sondeo() {
    const t0 = Date.now();
    const lista = await indice();
    const b = lista[0];
    const r = await fetch(b.url, {
        headers: { 'User-Agent': AGENTE }, cache: 'no-store',
        signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) throw new ErrorBoletin(`el PDF respondió HTTP ${r.status}`);
    const datos = new Uint8Array(await r.arrayBuffer());

    prepararEntorno();
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({
        data: datos, password: '', isEvalSupported: false, useSystemFonts: true,
    }).promise;
    const pagina = await doc.getPage(1);
    const contenido = await pagina.getTextContent();
    const texto = (contenido.items as { str: string }[])
        .map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();

    return {
        fecha: b.fecha, url: b.url, bytes: datos.length,
        paginas: doc.numPages, ms: Date.now() - t0,
        primera_pagina: texto.slice(0, 180),
        boletines_en_indice: lista.length,
    };
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
