// LA DOCTRINA EN EL VISOR, PROBADA SOBRE LOS PDF DE LA UNAM (25-sep-2026).
//
// Corre `localizarPasaje` (src/lib/visor/parrafoPdf.ts) con el mismo pdf.js
// del navegador, sin red, y comprueba el contrato de las fuentes nuevas
// (src/lib/doctrina.ts, src/lib/coidh.ts, src/lib/proxyPdf.ts).
//
//   node --experimental-strip-types comprobaciones/visor_doctrina.mjs <carpeta_pdf>
//       → el contrato (sin PDF) y dos casos de oro. En <carpeta_pdf> deben
//         estar, con esos nombres, los dos capítulos (se bajan con un GET
//         normal; los libros no se guardan en el repositorio):
//           8_3632_11.pdf ← https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf
//           3_1408_6.pdf  ← https://archivos.juridicas.unam.mx/www/bjv/libros/3/1408/6.pdf
//         Cada caso lleva el ancla y los 350 caracteres que manda
//         `FUENTES_PREVIAS`: lo que el visor tiene si el abogado pulsa la
//         cita mientras la respuesta se escribe.
//
//   node --experimental-strip-types comprobaciones/visor_doctrina.mjs --censo <carpeta_pdf> <trozos.json>
//       → cada trozo (payload de la colección `doctrina` con `id`, `texto`,
//         `url_oficial` y `pagina_pdf`, leído de Qdrant) cuyo capítulo esté en
//         la carpeta: ¿se halla?, ¿en su página?, ¿lo pintado cubre el trozo?,
//         ¿cuánto se pinta que no es del trozo? Sin ancla (como las fuentes
//         viejas), o con ANCLA=cruda (las 15 primeras palabras tal cual).
//
// Medido el 25-sep-2026 con --censo sobre los 3,593 trozos de 15 capítulos
// (tres por libro): 3,593 hallados, todos en su página y con una ventana de
// 48 letras; lo pintado cubre ≥90 % del trozo (sin el colofón de la BJV) en
// 3,528 y se pasa de 10 % en 34.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDFJS = path.join(RAIZ, 'node_modules/pdfjs-dist');
const pdfjs = await import(path.join(PDFJS, 'legacy/build/pdf.mjs'));
const { localizarPasaje, planoDeItems, palabrasCompactas } = await import(path.join(RAIZ, 'src/lib/visor/parrafoPdf.ts'));
const doctrina = await import(path.join(RAIZ, 'src/lib/doctrina.ts'));
const coidh = await import(path.join(RAIZ, 'src/lib/coidh.ts'));
const { urlProxyPdf } = await import(path.join(RAIZ, 'src/lib/proxyPdf.ts'));

let fallos = 0;
const ver = (bien, rotulo, detalle = '') => {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', rotulo, detalle);
};

// pdf.js en Node (con su worker falso) deja inservible un documento al abrir
// otro: se abre uno a la vez y se cierra el anterior.
let abierto = null;
async function abrir(archivo) {
    if (abierto && abierto.archivo === archivo) return abierto;
    if (abierto) await abierto.doc.destroy();
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(fs.readFileSync(archivo)),
        cMapUrl: path.join(PDFJS, 'cmaps') + '/',
        cMapPacked: true,
        verbosity: 0,
    }).promise;
    const planos = {};
    const leer = async (n) => (planos[n] = planos[n] || planoDeItems((await (await doc.getPage(n)).getTextContent()).items));
    return (abierto = { archivo, doc, leer });
}

/** Lo que se pinta de verdad, sin espacios. */
async function pintado(loc, leer) {
    let s = '';
    for (const [n, indices] of Object.entries(loc.porPagina)) {
        const p = await leer(Number(n));
        for (const i of indices) s += palabrasCompactas(p.items[i].str).join('');
    }
    return s;
}

const COLOFON = /juridicas\.unam\.mx|biblioteca\s+jur[ií]dica\s+virtual|^\s*DR\s*©|ir a la p[aá]gina del libro/i;
const tejas = (s, n = 12, paso = 6) => { const r = []; for (let i = 0; i + n <= s.length; i += paso) r.push(s.slice(i, i + n)); return r; };
/** Qué parte del trozo (sin el colofón) queda pintada, y qué parte de lo pintado no es del trozo. */
function medir(texto, pint) {
    const T = palabrasCompactas(texto.split('\n').filter((l) => !COLOFON.test(l)).join('\n')).join('');
    const enP = new Set(tejas(pint, 12, 1));
    const enT = new Set(tejas(T, 12, 1));
    const deT = tejas(T);
    const deP = tejas(pint);
    return {
        cobertura: deT.filter((s) => enP.has(s)).length / Math.max(1, deT.length),
        exceso: deP.filter((s) => !enT.has(s)).length / Math.max(1, deP.length),
    };
}

const args = process.argv.slice(2);

if (args[0] !== '--censo') {
    // ── El contrato, sin PDF ─────────────────────────────────────────────
    const vieja = {
        silo: 'doctrina',
        origen: 'Ferrer Mac-Gregor, Martínez Ramírez y Figueroa Mejía (coords.), «Diccionario de derecho procesal constitucional y convencional, t. I», 2014',
        ref: 'p. 280',
        pdf_url: 'https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf#page=313',
    };
    const nueva = {
        silo: 'doctrina', origen: vieja.origen, ref: 'p. 280',
        pdf_url: 'https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf',
        url_oficial: 'https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf',
        pagina: 313, pagina_impresa: 280, ancla: 'Esta última modalidad…',
        obra: 'Diccionario de derecho procesal constitucional y convencional, t. I',
        autor: 'Ferrer Mac-Gregor, Martínez Ramírez y Figueroa Mejía (coords.)', anio: 2014,
    };
    const capitulo = 'https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf';
    for (const [nombre, f] of [['vieja', vieja], ['nueva', nueva]]) {
        ver(doctrina.urlPdfDoctrina(f) === capitulo, `doctrina ${nombre}: se dibuja el capítulo sin #page`);
        ver(doctrina.paginaDoctrina(f) === 313, `doctrina ${nombre}: pág. 313 del PDF`);
        ver(doctrina.enlaceBJV(f) === `${capitulo}#page=313`, `doctrina ${nombre}: enlace a la BJV en su página`);
        ver(urlProxyPdf(doctrina.urlPdfDoctrina(f)) === `/api/ley/pdf?u=${encodeURIComponent(capitulo)}`, `doctrina ${nombre}: una sola llave de CDN`);
        const ficha = doctrina.fichaDoctrina(f);
        ver(ficha.autor === nueva.autor && ficha.obra === nueva.obra && ficha.anio === '2014', `doctrina ${nombre}: autor, obra y año`, JSON.stringify(ficha));
        ver(doctrina.lugarDoctrina(f) === 'p. 280', `doctrina ${nombre}: p. 280`);
        ver(/^Ferrer Mac-Gregor.*\(2014\)\. Diccionario .*\(p\. 280\)\. Biblioteca Jurídica Virtual/.test(doctrina.referenciaDoctrina(f)), `doctrina ${nombre}: referencia`, doctrina.referenciaDoctrina(f));
        ver(doctrina.camposDoctrina({ ...f, silo: 'leyes_federales' }).obra === undefined, `doctrina ${nombre}: los campos sólo viajan con silo doctrina`);
    }
    ver(Object.keys(doctrina.camposDoctrina(nueva)).length === 7, 'doctrina: camposDoctrina copia los siete campos del contrato');

    // La Corte IDH: se dibuja la copia de legal-docs, se enlaza la Corte.
    const oficial = 'https://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf';
    const copia = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CorteIDH/seriec_154_esp.pdf';
    const conCopia = { silo: 'coidh', pdf_url: copia, url_oficial: oficial, pagina: 53, pdf_sha1: '8b4e9e056dbeb5d38cb2f5190bfa7c624ddece36' };
    const sinCopia = { silo: 'coidh', pdf_url: oficial, url_oficial: oficial, pagina: 53 };
    const soloOficial = { silo: 'coidh', url_oficial: oficial, pagina: 53 };
    const copiaSinOficial = { silo: 'coidh', pdf_url: copia, pagina: 53 };
    ver(coidh.urlPdfCoidh(conCopia) === copia, 'coidh con copia: se dibuja la copia');
    ver(urlProxyPdf(coidh.urlPdfCoidh(conCopia), conCopia.pdf_sha1) === `/api/ley/pdf?u=${encodeURIComponent(copia)}`, 'coidh con copia: por el proxy de siempre');
    ver(coidh.enlaceOficialCoidh(conCopia) === `${oficial}#page=53`, 'coidh con copia: el enlace va a la Corte, en la pág. 53');
    ver(coidh.dibujaCopiaCoidh(conCopia) && !coidh.dibujaCopiaCoidh(sinCopia) && !coidh.dibujaCopiaCoidh(soloOficial), 'coidh: dibujaCopiaCoidh');
    ver(coidh.urlPdfCoidh(sinCopia) === oficial && coidh.urlPdfCoidh(soloOficial) === oficial, 'coidh sin copia: como antes, la oficial');
    ver(urlProxyPdf(coidh.urlPdfCoidh(soloOficial), null).startsWith('/api/ley/pdf?u=https%3A%2F%2Fwww.corteidh.or.cr'), 'coidh sin copia: por la puerta de la Corte');
    ver(coidh.urlPdfCoidh({ ...conCopia, pdf_url: `${copia}#page=53` }) === copia, 'coidh con copia y #page: sin fragmento');
    ver(coidh.urlOficialCoidh(copiaSinOficial) === null && coidh.urlPdfCoidh(copiaSinOficial) === copia, 'coidh copia sin url_oficial: no se enlaza la copia como «la Corte»');
    ver(coidh.camposCoidh({ silo: 'coidh', rol_coidh: 'pedido' }).rol_coidh === 'pedido', 'coidh: rol_coidh viaja');

    // ── Los casos de oro ─────────────────────────────────────────────────
    const carpeta = args[0];
    if (!carpeta) { console.error('Falta la carpeta con 8_3632_11.pdf y 3_1408_6.pdf'); process.exit(2); }
    const oro = [
        {
            // Diccionario t. I, voz de Karina Ansolabehere: el trozo empieza con el
            // folio «280» y el título corrido; el ancla, con el cuerpo.
            nombre: 'Diccionario t. I, pág. 313 (folio y título corrido)',
            archivo: '8_3632_11.pdf', pagina: 313,
            ancla: 'Esta última modalidad, íntimamente relacionada con el proceso de ju- dicialización de las demandas por derechos humanos, de su',
            texto: '280\nCreación de derechos por el juez constitucional\nEsta última modalidad, íntimamente relacionada con el proceso de ju-\ndicialización de las demandas por derechos humanos, de su justiciabilidad \n(Abramovich y Pautassi, 2009; Ferrajoli, 2003) traen aparejados nuevos dile-\nmas en la relación entre justicia y política. Dilemas no sólo vinculados con ',
        },
        {
            // Carbonell: PyMuPDF separó las sílabas («ca pí tu lo»); pdf.js no.
            nombre: 'Carbonell, pág. 18 (sílabas separadas)',
            archivo: '3_1408_6.pdf', pagina: 18,
            ancla: 'den tro del ca pí tu lo re la ti vo a los de re',
            texto: ' den tro del ca pí tu lo re la ti vo a los de re chos de se gu ri dad jurídica).\nAho ra bien, si la li ber tad es un de re cho fun da men tal (con cre ta da en los di -\nver sos de re chos de li ber tad que es ta ble cen la Cons ti tu ción me xi ca na y los tra -\nta dos in ter na cio na les de de re chos hu ma nos), en ton ces de be ser ca paz de ha',
        },
    ];
    for (const c of oro) {
        const archivo = path.join(carpeta, c.archivo);
        if (!fs.existsSync(archivo)) { ver(false, c.nombre, `falta ${archivo}`); continue; }
        const { doc, leer } = await abrir(archivo);
        const t0 = Date.now();
        const loc = await localizarPasaje({ total: doc.numPages, pagina: c.pagina, ancla: c.ancla, texto: c.texto, leer });
        const ms = Date.now() - t0;
        const pint = loc ? await pintado(loc, leer) : '';
        // La cobertura, desde el ancla: lo de antes (folio, título corrido) no se pinta a propósito.
        const cuerpo = c.texto.slice(Math.max(0, c.texto.indexOf(c.ancla.split(' ')[0])));
        const { cobertura, exceso } = medir(cuerpo, pint);
        ver(Boolean(loc && loc.pagina === c.pagina && loc.confirmado), `${c.nombre}: hallado y confirmado en su página`, loc ? `pág. ${loc.pagina}, ${ms} ms` : '');
        // Lo que se pinta empieza en el ancla: ni el folio ni el título corrido.
        const cabeza = palabrasCompactas(c.ancla).join('').slice(0, 30);
        ver(pint.includes(cabeza) && pint.indexOf(cabeza) < 60 && !pint.startsWith('280'), `${c.nombre}: empieza en el ancla`, JSON.stringify(pint.slice(0, 60)));
        ver(cobertura >= 0.95, `${c.nombre}: cubre los 350 caracteres`, `cobertura ${cobertura.toFixed(3)}`);
        ver(exceso <= 0.25, `${c.nombre}: no se pasa (sólo el resto del último renglón)`, `exceso ${exceso.toFixed(3)}`);
    }
    console.log(fallos ? `${fallos} FALLOS` : 'todo bien');
    process.exit(fallos ? 1 : 0);
}

// ── El censo ────────────────────────────────────────────────────────────────
const [, carpeta, archivoTrozos] = args;
const trozos = JSON.parse(fs.readFileSync(archivoTrozos, 'utf8'))
    .sort((a, b) => a.url_oficial.localeCompare(b.url_oficial) || a.pagina_pdf - b.pagina_pdf);
const ANCLA = process.env.ANCLA || 'sin';
const r = { trozos: 0, sin_capitulo: 0, hallados: 0, en_su_pagina: 0, firmes: 0, cobertura_090: 0, exceso_010: 0 };
const fallidos = [];
for (const t of trozos) {
    const archivo = path.join(carpeta, t.url_oficial.split('/').slice(-3).join('_'));
    if (!fs.existsSync(archivo)) { r.sin_capitulo++; continue; }
    r.trozos++;
    const { doc, leer } = await abrir(archivo);
    const ancla = ANCLA === 'cruda' ? t.texto.split(/\s+/).filter(Boolean).slice(0, 15).join(' ') : null;
    const loc = await localizarPasaje({ total: doc.numPages, pagina: t.pagina_pdf, ancla, texto: t.texto, leer });
    if (!loc) { fallidos.push([t.id, t.pagina_pdf, 'no hallado']); continue; }
    r.hallados++;
    if (loc.pagina === t.pagina_pdf) r.en_su_pagina++;
    if (loc.confirmado) r.firmes++;
    const { cobertura, exceso } = medir(t.texto, await pintado(loc, leer));
    if (cobertura >= 0.9) r.cobertura_090++;
    if (exceso <= 0.1) r.exceso_010++;
    if (loc.pagina !== t.pagina_pdf || cobertura < 0.6) fallidos.push([t.id, t.pagina_pdf, `pág. ${loc.pagina}`, `cobertura ${cobertura.toFixed(2)}`, `exceso ${exceso.toFixed(2)}`]);
}
console.log(JSON.stringify({ ancla: ANCLA, ...r, muestra_fallos: fallidos.slice(0, 30) }, null, 2));
