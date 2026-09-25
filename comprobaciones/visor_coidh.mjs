// EL VISOR DE LA CORTE IDH, PROBADO SOBRE LOS PDF OFICIALES (25-sep-2026).
//
// Corre `localizarParrafo` (src/lib/visor/parrafoPdf.ts) con pdf.js en Node,
// el mismo pdf.js 5.4.624 que usa el navegador, sin tocar la red.
//
//   node --experimental-strip-types comprobaciones/visor_coidh.mjs <seriec_154_esp.pdf>
//       → el oro: Almonacid ¶124 en la pág. 53, de «124.» a «125.».
//
//   node --experimental-strip-types comprobaciones/visor_coidh.mjs --censo <carpeta_pdf> <puntos.jsonl> [salida.json]
//       (con RECORTADO=1, como si el texto llegara recortado a 350 caracteres)
//       → cada punto del JSONL de la ingesta cuyo PDF esté en la carpeta
//         con el MISMO sha1 que se troceó: ¿abre en su página?, ¿el resaltado
//         cubre el texto guardado?, ¿cuánto se pasa?
//
// El JSONL es `reingesta/coidh/f0/puntos_seco.jsonl`: los puntos exactos que
// se escribirán en Qdrant, así que lo que mide esto es lo que verá el abogado.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDFJS = path.join(RAIZ, 'node_modules/pdfjs-dist');
const pdfjs = await import(path.join(PDFJS, 'legacy/build/pdf.mjs'));
const { localizarParrafo, planoDeItems, normalizar } = await import(path.join(RAIZ, 'src/lib/visor/parrafoPdf.ts'));

async function abrir(archivo) {
    const data = new Uint8Array(fs.readFileSync(archivo));
    const doc = await pdfjs.getDocument({
        data,
        cMapUrl: path.join(PDFJS, 'cmaps') + '/',
        cMapPacked: true,
        verbosity: 0,
    }).promise;
    const planos = {};
    const leer = async (n) => {
        if (!planos[n]) {
            const page = await doc.getPage(n);
            planos[n] = planoDeItems((await page.getTextContent()).items);
        }
        return planos[n];
    };
    return { doc, leer };
}

/** El texto que quedaría resaltado, ya normalizado. */
async function resaltado(loc, leer) {
    const partes = [];
    for (const t of loc.tramos) partes.push((await leer(t.pagina)).plano.slice(t.desde, t.hasta));
    return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/** Qué parte de las palabras del texto guardado cae dentro del resaltado. */
function cobertura(guardado, pintado) {
    const bolsa = {};
    for (const w of pintado.split(' ')) bolsa[w] = (bolsa[w] || 0) + 1;
    const palabras = guardado.split(' ').filter(Boolean);
    let dentro = 0;
    for (const w of palabras) if (bolsa[w] > 0) { bolsa[w]--; dentro++; }
    return palabras.length ? dentro / palabras.length : 0;
}

const args = process.argv.slice(2);

if (args[0] !== '--censo') {
    // ── El oro: Almonacid Arellano y otros Vs. Chile, Serie C No. 154, párr. 124 ──
    const archivo = args[0];
    if (!archivo) { console.error('Falta la ruta de seriec_154_esp.pdf'); process.exit(2); }
    const { doc, leer } = await abrir(archivo);
    const t0 = Date.now();
    const loc = await localizarParrafo({
        total: doc.numPages,
        pagina: 53,
        parrafo: '124',
        ancla: 'La Corte es consciente que los jueces y tribunales internos están sujetos al imperio de',
        texto: '[Corte IDH | Caso Almonacid Arellano y otros Vs. Chile | 26-09-2006 | Serie C 154 | párr. 124]\nLa Corte es consciente que los jueces y tribunales internos están sujetos al imperio de la ley y, por ello, están obligados a aplicar las disposiciones vigentes en el ordenamiento jurídico. Pero cuando un Estado ha ratificado un tratado internacional como la Convención Americana, sus jueces, como parte del aparato del Estado, también están sometidos a ella, lo que les obliga a velar porque los efectos de las disposiciones de la Convención no se vean mermadas por la aplicación de leyes contrarias a su objeto y fin, y que desde un inicio carecen de efectos jurídicos. En otras palabras, el Poder Judicial debe ejercer una especie de “control de convencionalidad” entre las normas jurídicas internas que aplican en los casos concretos y la Convención Americana sobre Derechos Humanos. En esta tarea, el Poder Judicial debe tener en cuenta no solamente el tratado, sino también la interpretación que del mismo ha hecho la Corte Interamericana, intérprete última de la Convención Americana.',
        leer,
    });
    const ms = Date.now() - t0;
    const pintado = loc ? await resaltado(loc, leer) : '';
    const esperado = {
        pagina: loc && loc.pagina === 53,
        una_pagina: loc && loc.tramos.length === 1 && loc.tramos[0].pagina === 53,
        empieza: pintado.startsWith('124 la corte es consciente que los jueces'),
        termina: pintado.endsWith('interprete ultima de la convencion americana'),
        sin_125: !/\b125 en esta misma linea\b/.test(pintado),
        confirmado: loc && loc.confirmado && loc.inicio === 'numero' && loc.fin === 'siguiente',
    };
    console.log(JSON.stringify({ paginas_pdf: doc.numPages, ms, loc, palabras_resaltadas: pintado.split(' ').length, inicio: pintado.slice(0, 80), final: pintado.slice(-80), esperado }, null, 2));
    process.exit(Object.values(esperado).every(Boolean) ? 0 : 1);
}

// ── El censo ────────────────────────────────────────────────────────────────
const [, carpeta, jsonl, salida] = args;
const RECORTADO = process.env.RECORTADO === '1';
const porArchivo = {};
for (const linea of fs.readFileSync(jsonl, 'utf8').split('\n')) {
    if (!linea.trim()) continue;
    const p = JSON.parse(linea).payload;
    const archivo = path.join(carpeta, decodeURIComponent(p.url_oficial.split('/').pop()));
    (porArchivo[archivo] = porArchivo[archivo] || []).push(p);
}

// Algunas copias locales se llaman distinto que el archivo oficial
// (`seriec_218_esp.pdf` frente a `…_esp1.pdf`): se buscan también por sha1.
const porSha1 = {};
for (const f of fs.readdirSync(carpeta)) {
    if (!f.toLowerCase().endsWith('.pdf')) continue;
    porSha1[crypto.createHash('sha1').update(fs.readFileSync(path.join(carpeta, f))).digest('hex')] = path.join(carpeta, f);
}

const filas = [];
const docs = { abiertos: 0, sin_archivo: 0, otro_sha1: 0 };
for (const [nombre, puntos] of Object.entries(porArchivo)) {
    const archivo = porSha1[puntos[0].pdf_sha1] || nombre;
    if (!fs.existsSync(archivo)) { docs.sin_archivo++; continue; }
    const sha1 = crypto.createHash('sha1').update(fs.readFileSync(archivo)).digest('hex');
    if (sha1 !== puntos[0].pdf_sha1) { docs.otro_sha1++; continue; }
    docs.abiertos++;
    const { doc, leer } = await abrir(archivo);
    for (const p of puntos) {
        const t0 = Date.now();
        const loc = await localizarParrafo({
            total: doc.numPages,
            pagina: p.pagina,
            parrafo: p.parrafo === null ? null : String(p.parrafo),
            ancla: p.ancla,
            // RECORTADO=1 imita el clic durante el streaming: `FUENTES_PREVIAS`
            // manda sólo 350 caracteres del texto y el visor lo sabe.
            texto: RECORTADO ? p.texto.slice(0, 350) : p.texto,
            textoCompleto: RECORTADO ? p.texto.length <= 350 : true,
            leer,
        });
        const ms = Date.now() - t0;
        const guardado = normalizar(p.texto_raw);
        const pintado = loc ? await resaltado(loc, leer) : '';
        filas.push({
            llave: p.llave, sub: p.sub, seg: p.seg, pagina: p.pagina, pagina_fin: p.pagina_fin,
            hallado: Boolean(loc),
            en_su_pagina: Boolean(loc && loc.pagina === p.pagina),
            inicio: loc ? loc.inicio : null,
            confirmado: loc ? loc.confirmado : false,
            fin: loc ? loc.fin : null,
            // El resaltado acaba en la página donde el troceador dice que acaba el párrafo.
            acaba_en_su_pagina: Boolean(loc && loc.tramos.length && loc.tramos[loc.tramos.length - 1].pagina === p.pagina_fin),
            cobertura: loc ? Number(cobertura(guardado, pintado).toFixed(3)) : 0,
            // Cuánto más largo es lo pintado que lo guardado (notas, epígrafes…).
            exceso: loc && guardado.length ? Number((pintado.length / guardado.length).toFixed(2)) : null,
            ms,
        });
    }
}

const n = filas.length;
const cuenta = (f) => filas.filter(f).length;
const pct = (x) => `${x} (${(100 * x / Math.max(1, n)).toFixed(2)} %)`;
const numerados = filas.filter((f) => f.inicio !== null && f.sub === 0);
const resumen = {
    docs,
    puntos: n,
    hallados: pct(cuenta((f) => f.hallado)),
    en_su_pagina: pct(cuenta((f) => f.en_su_pagina)),
    en_otra_pagina: cuenta((f) => f.hallado && !f.en_su_pagina),
    no_hallados: cuenta((f) => !f.hallado),
    por_numero: cuenta((f) => f.inicio === 'numero'),
    por_ancla: cuenta((f) => f.inicio === 'ancla'),
    fin: {
        siguiente: cuenta((f) => f.fin === 'siguiente'),
        texto: cuenta((f) => f.fin === 'texto'),
        pagina: cuenta((f) => f.fin === 'pagina'),
    },
    acaba_en_su_pagina: pct(cuenta((f) => f.acaba_en_su_pagina)),
    cobertura_095: pct(cuenta((f) => f.cobertura >= 0.95)),
    cobertura_080: pct(cuenta((f) => f.cobertura >= 0.8)),
    // Párrafos enteros (sub 0) pintados de más: más de 1.5 veces lo guardado.
    exceso_15_sub0: `${numerados.filter((f) => f.exceso > 1.5).length} de ${numerados.length}`,
    ms_mediana: filas.map((f) => f.ms).sort((a, b) => a - b)[Math.floor(n / 2)],
    ms_max: Math.max(...filas.map((f) => f.ms)),
    muestra_fallos: filas.filter((f) => !f.en_su_pagina || !f.acaba_en_su_pagina || f.cobertura < 0.8).slice(0, 40),
};
console.log(JSON.stringify(resumen, null, 2));
if (salida) fs.writeFileSync(salida, JSON.stringify({ resumen, filas }, null, 1));
