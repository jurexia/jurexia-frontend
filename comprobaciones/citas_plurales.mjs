// LAS CITAS AGRUPADAS, PROBADAS CON EL TEXTO REAL (26-sep-2026).
//
// David preguntó por la línea del control de convencionalidad y el modelo
// escribió 31 citas, cinco de ellas agrupadas —«[Doc IDs: da1de55e-…;
// 2b2dc535-…]»—. La burbuja las borraba, la hoja enseñaba «[Doc IDs: [25];
// [26]]» y el panel las daba por «sin ficha de origen» sin poder abrir su PDF.
//
// Esto corre EL MISMO CÓDIGO que la pantalla —`numerarCitasDelChat` para la
// burbuja, `htmlDeDocumento` para la hoja, `useFichasDeCitas`/`obtenerFicha`
// para las fichas— sobre la respuesta guardada, y comprueba:
//
//   1. 0 apariciones de «Doc ID»/«Doc IDs» en el texto que se ve, en el chat
//      y en la hoja; ni «;» sueltos entre números;
//   2. cada mención de un identificador → su ficha [N], con N por orden de
//      primera aparición, y la misma N en el chat y en la hoja;
//   3. las citas cuyo identificador no está en CITATION_META.sources se
//      resuelven con GET /cita/{id} (sólo lectura) y traen la dirección del
//      PDF; con ellas, ninguna cita queda «sin ficha».
//
//   node --experimental-strip-types comprobaciones/citas_plurales.mjs <conversacion.json> [--sin-red]
//       API=https://jurexia-api.onrender.com por omisión.
//
// Además prueba cada forma agrupada o suelta que se ha visto por separado.
import fs from 'fs';
import path from 'path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// «@/…» → src/…, y los imports sin extensión de los .ts, como los resuelve Next.
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
export async function resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = RAIZ + 'src/' + spec.slice(2);
    try { return await next(spec, ctx); }
    catch (e) {
        if (/^(\\.|\\/|file:)/.test(spec)) {
            for (const ext of ['.ts', '.tsx', '/index.ts']) {
                try { return await next(spec + ext, ctx); } catch {}
            }
        }
        throw e;
    }
}`));

const { expandirCitasAgrupadas, numerarCitasDelChat, idsCitados } = await import(path.join(RAIZ, 'src/lib/idsDeCita.ts'));
const { htmlDeDocumento, metaDeCitas, institucionesDe } = await import(path.join(RAIZ, 'src/lib/documento/citas.ts'));
const { limpiarMarcadores } = await import(path.join(RAIZ, 'src/lib/documento/marcado.ts'));
const { obtenerFicha, estadoDeFicha, citasSinFuente, conFichas, resumenDeCitas } = await import(path.join(RAIZ, 'src/lib/documento/fichas.ts'));

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith('--'));
const sinRed = args.includes('--sin-red');
const API = process.env.API || 'https://jurexia-api.onrender.com';
if (!archivo) { console.error('Falta la ruta de conversacion.json'); process.exit(2); }

let fallas = 0;
const ok = (cond, texto, detalle = '') => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}${detalle ? ` — ${detalle}` : ''}`);
    if (!cond) fallas++;
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const FICHA = /<sup class="citation-badge"[^>]*data-doc-id="([0-9a-f-]+)"[^>]*>\[(\d+)\]<\/sup>/g;
const visible = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const etiquetas = (t) => (t.match(/Doc\s*[-_]?\s*IDs?/gi) || []).length;
const sueltosEntreNumeros = (t) => (t.match(/\[\d+\]\s*[;,]\s*\[\d+\]|\[\s*\[\d+\]|\[\d+\]\s*\]/g) || []);

/** La burbuja, como la arma ChatMessage: numerar y después quitar los marcadores. */
function chat(texto) {
    const { content, docIdMap } = numerarCitasDelChat(texto);
    const sinMeta = content
        .replace(/\n*<!-- CITATION_META:\{[\s\S]*?\} -->/g, '')
        .replace(/\n*<!-- FUENTES_PREVIAS:\{[\s\S]*?\} -->\n*/g, '')
        .replace(/\n*<!-- PRECEDENTES_META:\[[\s\S]*?\] -->/g, '');
    return { html: sinMeta, docIdMap };
}

/** La hoja del documento. */
function hoja(texto) {
    const { html, orden } = htmlDeDocumento(texto);
    return { html, orden };
}

/** [número, uuid] de cada ficha, en orden. */
const fichasDe = (html) => Array.from(html.matchAll(FICHA), (m) => [Number(m[2]), m[1]]);

// ═══ 1. EL CASO REAL ═══════════════════════════════════════════════════════
const conversacion = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const mensaje = (Array.isArray(conversacion) ? conversacion : conversacion.messages || [])
    .find((m) => m.role === 'assistant' && (m.content || '').includes('CITATION_META'));
if (!mensaje) { console.error('No hay respuesta con CITATION_META en el archivo'); process.exit(2); }
const texto = mensaje.content;
const cuerpo = texto.replace(/<!--[\s\S]*?-->/g, '');
const menciones = (cuerpo.match(UUID) || []).map((u) => u.toLowerCase());
const distintos = Array.from(new Set(menciones));
const plurales = cuerpo.match(/\[Doc IDs?:[^\]]*;[^\]]*\]/gi) || [];
console.log(`\nEL CASO REAL — mensaje ${mensaje.id || '(sin id)'}`);
console.log(`  ${menciones.length} menciones de identificador, ${distintos.length} distintos; ${plurales.length} grupos plurales en el texto crudo`);

console.log('\nBURBUJA DEL CHAT');
const c = chat(texto);
const vc = visible(c.html);
const fc = fichasDe(c.html);
ok(etiquetas(vc) === 0, '0 «Doc ID(s)» a la vista', `${etiquetas(vc)} encontradas`);
ok(sueltosEntreNumeros(vc).length === 0, 'ningún «;» ni corchete suelto entre números', sueltosEntreNumeros(vc).slice(0, 3).join(' | '));
ok(fc.length === menciones.length, `las ${menciones.length} menciones → ${fc.length} fichas [N]`);
ok(c.docIdMap.size === distintos.length, `${distintos.length} números distintos`, `docIdMap = ${c.docIdMap.size}`);
const primera = new Map(distintos.map((u, i) => [u, i + 1]));
ok(fc.every(([n, u]) => primera.get(u) === n), 'cada número es el de la primera aparición de su identificador');
ok(fc.map(([, u]) => u).join(',') === menciones.join(','), 'las fichas siguen el orden de las menciones del texto');
// Muestra: los cinco grupos plurales, antes y después.
for (const g of plurales) {
    const ids = (g.match(UUID) || []).map((u) => u.toLowerCase());
    console.log(`     ${g.slice(0, 22)}… (${ids.length}) → ${ids.map((u) => `[${c.docIdMap.get(u)}]`).join('')}`);
}

console.log('\nHOJA DEL DOCUMENTO');
const h = hoja(texto);
const vh = visible(h.html);
const fh = fichasDe(h.html);
ok(etiquetas(vh) === 0, '0 «Doc ID(s)» a la vista', `${etiquetas(vh)} encontradas`);
ok(sueltosEntreNumeros(vh).length === 0, 'ningún «;» ni corchete suelto entre números', sueltosEntreNumeros(vh).slice(0, 3).join(' | '));
ok(fh.length === menciones.length, `las ${menciones.length} menciones → ${fh.length} fichas [N]`);
ok(h.orden.length === distintos.length, `«Citas ${h.orden.length}» en el pie`, `esperadas ${distintos.length}`);
ok(fh.every(([n, u]) => c.docIdMap.get(u) === n), 'la misma [N] que en el chat para cada identificador');

console.log('\nOTROS QUE LEEN «Doc ID»');
const citados = idsCitados(texto);
ok(citados.length === distintos.length, `idsCitados (registro de fuentes verificadas): ${citados.length}`, `esperados ${distintos.length}`);
const limpio = limpiarMarcadores(texto);
ok(etiquetas(limpio) === 0, 'limpiarMarcadores (constructor): 0 «Doc ID(s)»', `${etiquetas(limpio)} encontradas`);

console.log('\nFICHAS: CITATION_META.sources y /cita');
const meta = metaDeCitas(texto);
const faltan = citasSinFuente(c.docIdMap.keys(), meta);
console.log(`  CITATION_META: ${Object.keys(meta?.sources || {}).length} fuentes, valid=${meta?.valid}; ${faltan.length} citas del texto sin ficha en el mapa`);
const ORO = [
    'da1de55e-52d9-de76-8001-92f4bd4c0424', '2b2dc535-08b7-f9e7-6884-42d87f9088b0',
    '42e42c82-8bdc-1c9f-da76-da8856c477a5', 'fcd8d6c8-b56e-2488-6196-5bc587ad9e37',
    'a431aca8-1896-c694-1d7d-4bc75d24a453', '81e7710c-d16f-58cf-9753-7fc0b19c09e7',
    '0b9477ff-9b7b-571c-8a57-227f8683013f',
];
if (texto.includes(ORO[0])) {
    ok(faltan.length === ORO.length && ORO.every((u) => faltan.includes(u)), `son las ${ORO.length} esperadas del caso (Radilla, García Rodríguez, 2005115, 2010959)`);
}
const antes = resumenDeCitas(c.docIdMap.keys(), meta, {});
console.log(`  sin /cita: ${antes.verificadas} verificadas de ${c.docIdMap.size}`);

if (sinRed) {
    console.log('  (--sin-red: no se consulta /cita)');
} else {
    console.log(`  GET ${API}/cita/{id} …`);
    const t0 = Date.now();
    const resueltas = {};
    const estado = {};
    await Promise.all(faltan.map(async (id) => {
        const f = await obtenerFicha(id, API);
        estado[id] = estadoDeFicha(id);
        if (f) resueltas[id] = f;
    }));
    const ms = Date.now() - t0;
    for (const id of faltan) {
        const f = resueltas[id];
        const pdf = f && (f.pdf_url || f.url_oficial);
        ok(Boolean(f && pdf), `[${c.docIdMap.get(id)}] ${id.slice(0, 8)}…`,
            f ? `${f.silo} · ${String(f.origen).slice(0, 48)} · ${String(f.ref || '').slice(0, 30)}${f.pagina ? ` · pág. ${f.pagina}` : ''} · ${String(pdf || 'SIN PDF').slice(0, 70)}`
                : `estado ${estado[id]}`);
    }
    console.log(`  (${faltan.length} consultas en ${ms} ms)`);
    // Segunda vuelta: de la caché, sin red.
    const t1 = Date.now();
    await Promise.all(faltan.map((id) => obtenerFicha(id, 'http://127.0.0.1:9')));
    ok(Date.now() - t1 < 50 && faltan.every((id) => estadoDeFicha(id) === 'lista'), 'la segunda vez salen de la caché, sin pedir nada');

    const completo = conFichas(meta, resueltas);
    const grupos = institucionesDe(completo, c.docIdMap.keys());
    const agrupadas = grupos.reduce((n, g) => n + g.docIds.length, 0);
    ok(agrupadas === c.docIdMap.size, `las ${c.docIdMap.size} citas bajo su institución, ninguna «sin ficha»`,
        grupos.map((g) => `${g.institucion.nombre} ${g.docIds.length}`).join(' · '));
    const despues = resumenDeCitas(c.docIdMap.keys(), completo, estado);
    ok(despues.verificadas === c.docIdMap.size && despues.noTrazadas === 0,
        `${despues.verificadas} de ${c.docIdMap.size} verificadas, ${despues.noTrazadas} sin trazar`);
}

// ═══ 2. CADA FORMA, POR SEPARADO ═══════════════════════════════════════════
console.log('\nCADA FORMA AGRUPADA O SUELTA');
const A = 'da1de55e-52d9-de76-8001-92f4bd4c0424';
const B = '2b2dc535-08b7-f9e7-6884-42d87f9088b0';
const C = '42e42c82-8bdc-1c9f-da76-da8856c477a5';
const casos = [
    // [entrada, fichas esperadas (en orden), texto visible esperado en el chat]
    [`Radilla [Doc IDs: ${A}; ${B}].`, [A, B], 'Radilla [1][2].'],
    [`Radilla [Doc ID: ${A}; ${B}].`, [A, B], 'Radilla [1][2].'],
    [`Radilla [Doc ID: ${A}, ${B}].`, [A, B], 'Radilla [1][2].'],
    [`Radilla [Doc ID: ${A}; Doc ID: ${B}; Doc ID: ${C}].`, [A, B, C], 'Radilla [1][2][3].'],
    [`Radilla (Doc ID: ${A}).`, [A], 'Radilla [1].'],
    [`Radilla (Doc IDs: ${A}, ${B}).`, [A, B], 'Radilla [1][2].'],
    [`Radilla [${A}; ${B}].`, [A, B], 'Radilla [1][2].'],
    [`Radilla Doc ID: ${A}; Doc ID: ${B}.`, [A, B], 'Radilla [1][2].'],
    [`Radilla [Doc IDs: ${A} y ${B}].`, [A, B], 'Radilla [1][2].'],
    [`Radilla [Doc IDs: ${A}; ${A}] y otra [Doc ID: ${B}] y de nuevo [Doc ID: ${A}].`, [A, B, A], 'Radilla [1] y otra [2] y de nuevo [1].'],
    [`Radilla [nombre, ${A}].`, [A], 'Radilla [1].'],
    [`(como resolvió la Corte [Doc ID: ${A}], párr. 340)`, [A], '(como resolvió la Corte [1], párr. 340)'],
    [`Mientras llega: [Doc IDs: ${A}; ${B.slice(0, 12)}`, [A], 'Mientras llega: [1]'],
    [`Una etiqueta vacía [Doc IDs: ; ] no deja rastro.`, [], 'Una etiqueta vacía no deja rastro.'],
];
for (const [entrada, esperadas, texto] of casos) {
    const r = chat(entrada);
    const f = fichasDe(r.html).map(([, u]) => u);
    const v = visible(r.html).replace(/\s+/g, ' ').trim();
    const d = hoja(entrada);
    const vd = visible(d.html).replace(/\s+/g, ' ').trim();
    const bien = f.join(',') === esperadas.join(',') && v === texto && etiquetas(v) === 0 && etiquetas(vd) === 0
        && fichasDe(d.html).map(([, u]) => u).join(',') === esperadas.join(',');
    ok(bien, entrada.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (u) => u.slice(0, 4) + '…').slice(0, 70), bien ? v : `chat «${v}» · hoja «${vd}» · fichas ${f.length}`);
}
// Lo que no es una cita no se toca.
const enlace = `Ver [la sentencia](https://example.org/document/${A}) y el marcador <!-- CITATION_META:{"invalid_ids":["${A}","${B}"]} -->`;
ok(expandirCitasAgrupadas(enlace) === enlace, 'un enlace con uuid y el JSON de un marcador quedan intactos');

console.log(fallas ? `\n${fallas} COMPROBACIÓN(ES) FALLIDA(S)` : '\nTODO BIEN');
process.exit(fallas ? 1 : 0);
