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
//   node --experimental-strip-types comprobaciones/citas_plurales.mjs <conversacion.json> [--sin-red] [--referencia=<commit>]
//       API=https://jurexia-api.onrender.com por omisión.
//
// Además prueba cada forma agrupada o suelta que se ha visto por separado, y
// un caso por cada defecto que encontró la verificación de 4be6e11 (todos
// fallaban con ese commit):
//
//   D1. el registro de fuentes verificadas de la conversación cuenta también
//       lo que /cita resolvió (33, no 26), y no lo que el sello marcó;
//   D2. una cita que el servidor marcó (fuera del contexto) y /cita encuentra
//       conserva la marca, y el sello la distingue de la que no existe;
//   D3. la limpieza de las carpetas usa la función compartida;
//   D4. un grupo partido por un salto de línea conserva sus citas, y la
//       limpieza no cruza renglones;
//   D5. «[Doc ID: a]; [Doc ID: b]» → [1][2], sin «;» ni «,» sueltos;
//   D6. las tesis que resuelve /cita no llevan «.txt» en el origen ni en APA;
//   D7. un fallo pasajero de /cita se reintenta solo, con espera creciente, y
//       cambiar de conversación olvida los fallos.
//
// Y los de la reverificación de 33f2001:
//
//   R1. un grupo con etiqueta partido en renglones CON PROSA dentro —«[Doc
//       IDs: a (párr. 340);⏎b (párr. 341)]»— se abre en el chat, la hoja, el
//       constructor, el Word y las carpetas (dejaba uuids o la etiqueta); y
//       también el que lleva otro par de corchetes dentro —«[Doc ID: a,
//       véase [nota]]»—, que las expresiones lineales ya no cruzan;
//   R2. lo que /cita resolvió en una respuesta no se pierde del registro
//       porque OTRA respuesta marcara la cita (sólo la salvaba el mapa);
//   R3. el sello no dice «Citas verificadas» en verde con citas sin comprobar;
//   R4. el visor que llegó a «fallo» sigue escuchando: si el fallo se olvida
//       y el nuevo intento sale bien, se rellena;
//   R5. del historial se lee un tope de texto por mensaje.
//
// TIEMPO LINEAL: con semilla fija, ≥500 cadenas de 20k y ≥20 de 100k
// caracteres de un alfabeto hecho para romper expresiones regulares —[ ] ( )
// * _ ` - ; , . : espacio, salto, hex, «Doc», «IDs», «ID», «y», uuids
// completos y recortados, «…»—, otra familia con marcadores HTML, y las
// cargas conocidas de los verificadores. Cada función pública de
// `@/lib/idsDeCita`, las dos limpiezas de marcadores y la numeración del chat
// y de la hoja: < 60 ms con 20k, < 300 ms con 100k (mejor de 2) y con 100k no
// más de 6× lo de 20k.
//
// EQUIVALENCIA: sobre el caso real, la salida de todo lo anterior es idéntica
// a la del commit de referencia (33f2001 por omisión), que se saca con `git
// archive` a un directorio temporal y se carga al lado.
//
// /cita de mentira (D6, D7, R4) con un `fetch` simulado: sin red y sin escribir nada.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Donde se saca el commit de referencia para la equivalencia (uno por commit).
fs.mkdirSync(path.join(os.tmpdir(), 'citas_equivalencia'), { recursive: true });
const REFERENCIAS = fs.realpathSync(path.join(os.tmpdir(), 'citas_equivalencia'));

// «@/…» → src/…, y los imports sin extensión de los .ts, como los resuelve Next.
// Lo que se importa desde una copia de referencia resuelve «@/…» dentro de
// esa copia, y los paquetes (react, supabase) desde el node_modules de aquí.
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
const REFERENCIAS = ${JSON.stringify(pathToFileURL(REFERENCIAS + '/').href)};
export async function resolve(spec, ctx, next) {
    const padre = ctx.parentURL || '';
    const copia = padre.startsWith(REFERENCIAS) ? REFERENCIAS + padre.slice(REFERENCIAS.length).split('/')[0] + '/' : null;
    if (spec.startsWith('@/')) spec = (copia || RAIZ) + 'src/' + spec.slice(2);
    else if (copia && !/^(\\.|\\/|file:|node:|data:)/.test(spec)) ctx = { ...ctx, parentURL: RAIZ + 'package.json' };
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

// `@/lib/expedientes` crea el cliente de Supabase al cargarse: con valores de
// relleno no se conecta a nada (D3 sólo usa su limpieza, que es pura).
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://relleno.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'relleno';

const { expandirCitasAgrupadas, numerarCitasDelChat, idsCitados } = await import(path.join(RAIZ, 'src/lib/idsDeCita.ts'));
const { htmlDeDocumento, metaDeCitas, institucionesDe, fuenteDeCita, referenciaAPA } = await import(path.join(RAIZ, 'src/lib/documento/citas.ts'));
const { limpiarMarcadores } = await import(path.join(RAIZ, 'src/lib/documento/marcado.ts'));
const F = await import(path.join(RAIZ, 'src/lib/documento/fichas.ts'));
const { obtenerFicha, estadoDeFicha, citasSinFuente, conFichas, resumenDeCitas } = F;
const E = await import(path.join(RAIZ, 'src/lib/expedientes.ts'));

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
    // D6: el origen de las tesis que devuelve /cita, sin el «.txt» del archivo.
    const conTxt = faltan.filter((id) => /\.txt\s*$/i.test(String(resueltas[id]?.origen || '')));
    ok(conTxt.length === 0, 'D6 · ninguna ficha de /cita lleva «.txt» en el origen',
        conTxt.map((id) => resueltas[id].origen).join(' | '));
    // D1: lo que viaja a la vuelta siguiente es lo mismo que el sello cuenta.
    if (typeof F.fuentesDeLaConversacion === 'function') {
        const reg = F.fuentesDeLaConversacion([texto]).verificadas;
        ok(reg.length === despues.verificadas && ORO.every((u) => reg.includes(u)),
            `D1 · el registro de fuentes verificadas lleva las ${despues.verificadas} del sello, con las 7 agrupadas`,
            `registra ${reg.length}`);
    } else ok(false, 'D1 · el registro de fuentes verificadas cuenta lo que /cita resolvió', 'no hay fuentesDeLaConversacion');
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
    // D4: el grupo partido por un salto de línea (antes: hoja «Radilla sigue.», chat «; [2]]»).
    [`Radilla [Doc IDs: ${A};\n${B}] sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    [`Radilla [Doc ID: ${A},\n${B}] sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    [`Radilla (Doc IDs: ${A};\n${B}) sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    [`Mientras llega: [Doc IDs: ${A};\n${B}`, [A, B], 'Mientras llega: [1][2]'],
    // …y uno sin cerrar con prosa detrás no se lleva el párrafo siguiente.
    [`Radilla [Doc IDs: ${A};\nEl párrafo siguiente sigue aquí.`, [A], null],
    // D5: sólo números seguidos, sin «;» ni «,» sueltos entre ellos.
    [`Radilla [Doc ID: ${A}]; [Doc ID: ${B}].`, [A, B], 'Radilla [1][2].'],
    [`Radilla [Doc ID: ${A}], [Doc ID: ${B}] , [Doc ID: ${C}].`, [A, B, C], 'Radilla [1][2][3].'],
    [`Radilla (Doc ID: ${A}); (Doc ID: ${B}).`, [A, B], 'Radilla [1][2].'],
    // …pero el «;» de la frase se queda.
    [`Radilla [Doc ID: ${A}]; en cambio, García [Doc ID: ${B}].`, [A, B], 'Radilla [1]; en cambio, García [2].'],
    // R1: partido en renglones CON PROSA dentro (antes: hoja «[Doc IDs: [1] (párr.
    // 340);[2] (párr. 341)]», chat «[[1] (párr. 340); [2] (párr. 341)]»). Como
    // en el de un renglón, la prosa de dentro se va con el grupo.
    [`Radilla [Doc IDs: ${A} (párr. 340);\n${B} (párr. 341)] sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    [`Radilla [Doc ID: ${A}, párr. 340;\nDoc ID: ${B}, párr. 341] sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    [`Radilla (Doc IDs: ${A}, párr. 340;\n${B}, párr. 341) sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    [`Mientras llega: [Doc IDs: ${A}, párr. 340;\n${B}, pá`, [A, B], 'Mientras llega: [1][2]'],
    // Con otro par de corchetes dentro: las expresiones ya no cruzan un «[» (es
    // lo que las hace lineales) y lo abre un escáner de una pasada (antes: hoja
    // «[Doc ID: [1], véase [nota]]»; constructor y carpetas, «Radilla ] sigue.»).
    [`Radilla [Doc ID: ${A}, véase [nota]] sigue.`, [A], 'Radilla [1] sigue.'],
    [`Radilla [Doc IDs: ${A}; ${B} (véase [1])] sigue.`, [A, B], 'Radilla [1][2] sigue.'],
    // …pero una nota entre corchetes con una cita dentro es prosa, no un grupo.
    [`[Nota: la Corte [Doc ID: ${A}] resolvió.]`, [A], '[Nota: la Corte [1] resolvió.]'],
];
for (const [entrada, esperadas, texto] of casos) {
    const r = chat(entrada);
    const f = fichasDe(r.html).map(([, u]) => u);
    const v = visible(r.html).replace(/\s+/g, ' ').trim();
    const d = hoja(entrada);
    const vd = visible(d.html).replace(/\s+/g, ' ').trim();
    // Sin texto esperado (null): lo que importa es que no se pierda la prosa.
    const prosa = texto === null ? /El párrafo siguiente sigue aquí\./ : null;
    const bien = f.join(',') === esperadas.join(',') && etiquetas(v) === 0 && etiquetas(vd) === 0
        && (prosa ? prosa.test(v) && prosa.test(vd) : v === texto && vd === texto)
        && sueltosEntreNumeros(v).length === 0 && sueltosEntreNumeros(vd).length === 0
        && fichasDe(d.html).map(([, u]) => u).join(',') === esperadas.join(',');
    ok(bien, entrada.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (u) => u.slice(0, 4) + '…').replace(/\n/g, '⏎').slice(0, 70),
        bien ? v : `chat «${v}» · hoja «${vd}» · fichas ${f.length}`);
}
// Lo que no es una cita no se toca.
const enlace = `Ver [la sentencia](https://example.org/document/${A}) y el marcador <!-- CITATION_META:{"invalid_ids":["${A}","${B}"]} -->`;
ok(expandirCitasAgrupadas(enlace) === enlace, 'un enlace con uuid y el JSON de un marcador quedan intactos');

// ═══ 3. LOS DEFECTOS DE LA VERIFICACIÓN DE 4be6e11 ═════════════════════════
const falta = (nombre) => typeof F[nombre] !== 'function';
const minusc = (u) => u.toLowerCase();

console.log('\nD1 · EL REGISTRO DE FUENTES VERIFICADAS DE LA CONVERSACIÓN');
if (falta('fuentesDeLaConversacion')) {
    ok(false, 'cuenta lo que /cita resolvió', 'no hay fuentesDeLaConversacion');
} else {
    // Sin red: la caché de /cita, simulada con las 7 del caso.
    const resuelta = (id) => (ORO.includes(id) ? { origen: 'x', ref: '', texto: 'x' } : null);
    const { verificadas, faltan: porPedir } = F.fuentesDeLaConversacion([texto], resuelta);
    ok(porPedir.length === ORO.length && ORO.every((u) => porPedir.includes(u)), `pide a /cita las ${ORO.length} que el mapa no trae`, `${porPedir.length}`);
    ok(verificadas.length === distintos.length, `registra las ${distintos.length} citas, no sólo las ${distintos.length - ORO.length} del mapa`, `${verificadas.length}`);
    ok(F.fuentesDeLaConversacion([texto], () => null).verificadas.length === distintos.length - ORO.length,
        'sin fichas de /cita, sólo las del mapa (se rehace cuando llegan)');
    // Lo que el sello marcó no se da por hecho, aunque /cita lo encuentre;
    // salvo que otra respuesta de la conversación sí lo trajera en su mapa.
    const X = 'eeeeeeee-0000-4000-8000-000000000001';
    const marcada = `Otra vuelta [Doc ID: ${X}] y [Doc ID: ${A}].\n\n<!-- CITATION_META:${JSON.stringify({
        valid: 0, invalid: 2, total: 2, invalid_ids: [X, A],
        sources: { [X]: { origen: 'Fuente no verificada', ref: '', texto: '' }, [A]: { origen: 'Fuente no verificada', ref: '', texto: '' } },
    })} -->`;
    const conMarcada = F.fuentesDeLaConversacion([marcada], () => ({ origen: 'x', ref: '', texto: 'x' })).verificadas;
    ok(!conMarcada.includes(X) && !conMarcada.includes(A), 'lo que el sello marcó como fuera del contexto no se registra', conMarcada.join(','));
    const previa = `Primera [Doc ID: ${A}].\n\n<!-- CITATION_META:${JSON.stringify({
        valid: 1, invalid: 0, total: 1, invalid_ids: [], sources: { [A]: { origen: 'Radilla', ref: 'Párr. 340', texto: 'x' } },
    })} -->`;
    ok(F.fuentesDeLaConversacion([previa, marcada], () => null).verificadas.join(',') === A,
        'la que otra respuesta sí trajo en su mapa sigue registrada');
}

console.log('\nD2 · MARCADA POR EL SERVIDOR PERO EXISTENTE');
{
    // La forma real del servidor: la inválida entra en el mapa VACÍA.
    const vacia = { origen: 'Fuente no verificada', ref: '', texto: '' };
    const meta2 = { valid: 0, invalid: 1, total: 1, invalid_ids: [A], sources: { [A]: vacia } };
    const ficha = { origen: 'Corte IDH. Caso Radilla Pacheco Vs. México', ref: 'Párr. 340', texto: 'El Poder Judicial…', pdf_url: 'https://x/radilla.pdf', silo: 'coidh', caso: 'Radilla Pacheco Vs. México', parrafo: '340', pagina: 93 };
    ok(citasSinFuente([A], meta2).includes(A), 'la entrada vacía del mapa se pide a /cita');
    const junto = conFichas(meta2, { [minusc(A)]: ficha });
    ok(Boolean(fuenteDeCita(junto, A).pdf_url), 'la ficha de /cita sustituye a la vacía: abre su PDF');
    const grupos = institucionesDe(junto, [A]);
    ok(grupos.length === 1 && grupos[0].institucion.clave === 'corteidh', 'queda bajo su institución',
        grupos.map((g) => `${g.institucion.nombre} ${g.docIds.length}`).join(' · '));
    ok(!falta('fueraDelContexto') && F.fueraDelContexto(junto, A), 'y conserva la marca de fuera del contexto');
    const r = resumenDeCitas([A], junto, { [minusc(A)]: 'lista' });
    ok(r.verificadas === 0 && r.fueraDeContexto === 1 && r.noTrazadas === 0,
        'el sello: «no estaba en el contexto», no «no existe en el acervo»', JSON.stringify(r));
    const Z = 'eeeeeeee-0000-4000-8000-000000000009';
    const r404 = resumenDeCitas([Z], { valid: 0, invalid: 1, total: 1, invalid_ids: [Z], sources: {} }, { [Z]: 'no_existe' });
    ok(r404.noTrazadas === 1 && !r404.fueraDeContexto, 'la que /cita no encuentra sí «no existe en el acervo»', JSON.stringify(r404));
    const vacias = conFichas(meta2, {});
    ok(institucionesDe(vacias, [A]).length === 0, 'una vacía sin ficha no se agrupa como «Fuente no verificada»',
        institucionesDe(vacias, [A]).map((g) => g.institucion.nombre).join(' · '));
}

console.log('\nD3 · LA LIMPIEZA DE LAS CARPETAS');
for (const entrada of [
    `Radilla Doc ID: ${A}; Doc ID: ${B}. Fin`,
    `Radilla [${A}; ${B}]. Fin`,
    `Radilla [Doc IDs: ${A};\n${B}]. Fin`,
    `Radilla [Doc ID: ${A}]; [Doc ID: ${B}]. Fin`,
]) {
    const sale = E.limpiarMarcadores(entrada);
    ok(sale === 'Radilla. Fin', `carpetas: ${entrada.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (u) => u.slice(0, 4) + '…').replace(/\n/g, '⏎')}`, JSON.stringify(sale));
}

console.log('\nD4 · LA LIMPIEZA NO CRUZA RENGLONES');
{
    const roto = 'Uno [Doc IDs: pendiente\nDos renglones] tres.';
    const vc2 = visible(chat(roto).html);
    ok(/Dos renglones/.test(vc2), 'chat: un corchete con etiqueta sin cerrar no se lleva el renglón siguiente', JSON.stringify(vc2));
    const lm = limpiarMarcadores(roto);
    ok(/Dos renglones/.test(lm), 'constructor: tampoco', JSON.stringify(lm));
    const le = E.limpiarMarcadores(roto);
    ok(/Dos renglones/.test(le), 'carpetas: tampoco', JSON.stringify(le));
}

console.log('\nD6 y D7 · /cita SIMULADO');
{
    const BASE = 'http://cita.prueba';
    const fetchReal = globalThis.fetch;
    const llamadas = {};
    const guion = {};
    // Contesta lo que va a BASE y, venga de donde venga (el visor pide a la
    // API de siempre), lo que tenga guion; lo demás pasa a la red de verdad.
    globalThis.fetch = async (url, opciones) => {
        const u = String(url);
        const id = decodeURIComponent(u.split('/cita/')[1] || '');
        if (!u.startsWith(BASE) && !(id in guion)) return fetchReal(url, opciones);
        llamadas[id] = (llamadas[id] || 0) + 1;
        const pasos = guion[id] || [[404, null]];
        const [status, cuerpo] = pasos[Math.min(llamadas[id] - 1, pasos.length - 1)];
        return new Response(cuerpo ? JSON.stringify(cuerpo) : 'error', { status, headers: { 'content-type': 'application/json' } });
    };
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

    // D6
    const T = 'eeeeeeee-0000-4000-8000-000000000006';
    guion[T] = [[200, { origen: '2005115_1a. CCCLIX/2013 (10a.).txt', ref: 'CONTROL DE CONSTITUCIONALIDAD Y DE CONVENCIONALIDAD…', texto: '…', pdf_url: 'https://x/2005115.pdf', silo: 'jurisprudencia_nacional_v3', registro: '2005115', tesis_num: '1a. CCCLIX/2013 (10a.)' }]];
    const tesis = await obtenerFicha(T, BASE);
    ok(tesis && tesis.origen === '2005115_1a. CCCLIX/2013 (10a.)', 'D6 · el origen de la tesis, sin «.txt»', tesis?.origen);
    ok(tesis && !/\.txt/.test(referenciaAPA(tesis)), 'D6 · y la referencia APA del Word tampoco', tesis ? referenciaAPA(tesis) : '');

    // D7
    if (Array.isArray(F.ESPERAS_REINTENTO_MS)) F.ESPERAS_REINTENTO_MS.splice(0, F.ESPERAS_REINTENTO_MS.length, 40, 80);
    const R1 = 'eeeeeeee-0000-4000-8000-000000000071';
    const R2 = 'eeeeeeee-0000-4000-8000-000000000072';
    const N4 = 'eeeeeeee-0000-4000-8000-000000000074';
    guion[R1] = [[503, null], [200, { origen: 'Ley de Amparo', ref: 'Art. 1', texto: 'x', pdf_url: 'https://x/amparo.pdf', silo: 'leyes_federales' }]];
    guion[R2] = [[503, null]];
    guion[N4] = [[404, null]];
    const primera = await obtenerFicha(R1, BASE);
    ok(primera === null && estadoDeFicha(R1) === 'buscando', 'D7 · tras un 503 no queda en ámbar: espera su reintento', `estado ${estadoDeFicha(R1)}`);
    await obtenerFicha(R2, BASE);
    await obtenerFicha(N4, BASE);
    await dormir(400);
    ok(estadoDeFicha(R1) === 'lista' && llamadas[R1] === 2, 'D7 · el reintento automático trae la ficha sin que nadie toque la cita',
        `estado ${estadoDeFicha(R1)}, ${llamadas[R1]} peticiones`);
    ok(estadoDeFicha(R2) === 'fallo' && llamadas[R2] === 3, 'D7 · un servidor caído: dos reintentos con espera creciente y luego «fallo», sin bucle',
        `estado ${estadoDeFicha(R2)}, ${llamadas[R2]} peticiones`);
    ok(estadoDeFicha(N4) === 'no_existe' && llamadas[N4] === 1, 'D7 · un 404 no se reintenta', `${llamadas[N4]} peticiones`);
    // El visor abierto sobre una cita cuyo /cita falló se rellena solo al llegar el reintento.
    const V = 'eeeeeeee-0000-4000-8000-000000000075';
    guion[V] = [[503, null], [200, { origen: 'Código Nacional de Procedimientos Penales', ref: 'Art. 2', texto: 'x', pdf_url: 'https://x/cnpp.pdf', silo: 'leyes_federales' }]];
    let visor = null;
    const fijar = (x) => { visor = typeof x === 'function' ? x(visor) : x; };
    F.abrirCitaConFicha({ docId: V, origen: 'Fuente legal', ref: '', texto: '' }, fijar);
    await dormir(20);
    const mientras = visor?.origen;
    await dormir(200);
    ok(visor?.pdf_url === 'https://x/cnpp.pdf', 'D7 · el visor abierto se rellena solo cuando el reintento trae la ficha',
        `mientras: «${mientras}» · después: «${visor?.origen}»`);
    if (falta('olvidarFallos')) ok(false, 'D7 · cambiar de conversación olvida los fallos', 'no hay olvidarFallos');
    else {
        F.olvidarFallos();
        ok(estadoDeFicha(R2) === null && estadoDeFicha(N4) === 'no_existe', 'D7 · cambiar de conversación olvida los fallos (no los 404)',
            `R2 ${estadoDeFicha(R2)}, 404 ${estadoDeFicha(N4)}`);
    }

    // R4: el visor abierto sobre una cita que agota sus reintentos («fallo»)
    // dejaba de escucharla; si después se olvidaba el fallo y el nuevo
    // intento salía bien, seguía diciendo «No se pudo consultar la fuente».
    console.log('\nR4 · EL VISOR QUE LLEGÓ A «FALLO» SIGUE ESCUCHANDO');
    const W = 'eeeeeeee-0000-4000-8000-000000000077';
    const lft = { origen: 'Ley Federal del Trabajo', ref: 'Art. 5', texto: 'x', pdf_url: 'https://x/lft.pdf', silo: 'leyes_federales' };
    guion[W] = [[503, null], [503, null], [503, null], [200, lft]];
    let visor2 = null;
    const fijar2 = (x) => { visor2 = typeof x === 'function' ? x(visor2) : x; };
    F.abrirCitaConFicha({ docId: W, origen: 'Fuente legal', ref: '', texto: '' }, fijar2);
    await dormir(400);
    ok(estadoDeFicha(W) === 'fallo' && visor2?.origen === 'No se pudo consultar la fuente',
        'R4 · tres intentos fallidos: el visor dice que no se pudo consultar', `estado ${estadoDeFicha(W)} · «${visor2?.origen}»`);
    F.olvidarFallos();                                 // cambiar de conversación
    await dormir(150);
    ok(visor2?.pdf_url === lft.pdf_url && llamadas[W] === 4,
        'R4 · al olvidar el fallo, el visor que la enseña la vuelve a pedir y se rellena', `«${visor2?.origen}», ${llamadas[W]} peticiones`);
    // Lo mismo si la pide otro (la burbuja, al tocarla otra vez): se rellena.
    const W2 = 'eeeeeeee-0000-4000-8000-000000000078';
    guion[W2] = [[503, null], [503, null], [503, null], [200, lft]];
    let visor3 = null;
    const fijar3 = (x) => { visor3 = typeof x === 'function' ? x(visor3) : x; };
    F.abrirCitaConFicha({ docId: W2, origen: 'Fuente legal', ref: '', texto: '' }, fijar3);
    await dormir(400);
    await obtenerFicha(W2);
    await dormir(20);
    ok(visor3?.pdf_url === lft.pdf_url, 'R4 · tras «fallo», un nuevo intento de otro también rellena el visor abierto', `«${visor3?.origen}»`);
    // Y abrir otra cita en el mismo visor suelta la anterior: su ficha no la pisa.
    const W3 = 'eeeeeeee-0000-4000-8000-000000000079';
    guion[W3] = [[503, null], [200, lft]];
    F.abrirCitaConFicha({ docId: W3, origen: 'Fuente legal', ref: '', texto: '' }, fijar3);
    F.abrirCitaConFicha({ docId: 'otra', origen: 'Constitución', ref: 'Art. 1', texto: 'Todas las personas…' }, fijar3);
    await dormir(200);
    ok(visor3?.origen === 'Constitución', 'R4 · la cita anterior ya no escribe en el visor', `«${visor3?.origen}»`);
    // Cerrado el visor, tampoco.
    const W4 = 'eeeeeeee-0000-4000-8000-00000000007a';
    guion[W4] = [[200, lft]];
    F.abrirCitaConFicha({ docId: W4, origen: 'Fuente legal', ref: '', texto: '' }, fijar3);
    fijar3(null);
    await dormir(150);
    ok(visor3 === null, 'R4 · con el visor cerrado, lo que llega no lo abre', JSON.stringify(visor3));
    globalThis.fetch = fetchReal;
}

// ═══ 4. LOS DEFECTOS DE LA REVERIFICACIÓN DE 33f2001 ═══════════════════════
const Mar = await import(path.join(RAIZ, 'src/lib/documento/marcado.ts'));
const Cit = await import(path.join(RAIZ, 'src/lib/documento/citas.ts'));
const Ids = await import(path.join(RAIZ, 'src/lib/idsDeCita.ts'));
const uuidsEn = (t) => (t.match(/[0-9a-f]{8}-[0-9a-f]{4}-/gi) || []).length;
const corto = (t) => t.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (u) => u.slice(0, 4) + '…').replace(/\n/g, '⏎');

console.log('\nR1 · EL GRUPO PARTIDO CON PROSA DENTRO, EN EL CONSTRUCTOR, EL WORD Y LAS CARPETAS');
for (const entrada of [
    `Radilla [Doc IDs: ${A} (párr. 340);\n${B} (párr. 341)]. Fin`,
    `Radilla [Doc ID: ${A}, párr. 340;\nDoc ID: ${B}, párr. 341]. Fin`,
    // Y el de corchetes dentro, que con las expresiones lineales dejaba el uuid.
    `Radilla [Doc ID: ${A}, véase [nota]]. Fin`,
    `Radilla [Doc IDs: ${A}; ${B} (véase [1])]. Fin`,
]) {
    const constructor = Mar.limpiarMarcadores(entrada);
    const word = visible(Mar.markdownAHtml(entrada));
    const carpetas = E.limpiarMarcadores(entrada);
    const bien = [constructor, word, carpetas].every((x) => uuidsEn(x) === 0 && etiquetas(x) === 0 && /^Radilla\s*\. Fin$/.test(x));
    ok(bien, `R1 · ${corto(entrada)}`, `constructor «${corto(constructor)}» · Word «${corto(word)}» · carpetas «${corto(carpetas)}»`);
}
{
    // …pero un renglón de prosa no se lo lleva el grupo, aunque luego venga un «]».
    const entrada = `Radilla [Doc IDs: ${A};\nEl párrafo siguiente] sigue aquí.`;
    const v = visible(chat(entrada).html);
    ok(/El párrafo siguiente/.test(v) && fichasDe(chat(entrada).html).length === 1, 'R1 · un renglón que empieza por prosa no entra en el grupo', JSON.stringify(corto(v)));
}

console.log('\nR2 · EL REGISTRO NO DEPENDE DE DÓNDE SALIÓ LA FICHA');
{
    const vacia = { origen: 'Fuente no verificada', ref: '', texto: '' };
    const ficha = { origen: 'Corte IDH. Caso Radilla Pacheco Vs. México', ref: 'Párr. 340', texto: 'x' };
    const meta = (m) => `\n\n<!-- CITATION_META:${JSON.stringify({ valid: 0, invalid: 0, total: 0, invalid_ids: [], sources: {}, ...m })} -->`;
    // La primera la cita agrupada (fuera del mapa, sin marca); /cita la resuelve.
    const primera = `Radilla [Doc IDs: ${A}; ${B}].` + meta({});
    // La segunda la cita otra vez y el servidor la marca (entrada vacía).
    const segunda = `Otra vez [Doc ID: ${A}].` + meta({ invalid: 1, total: 1, invalid_ids: [A], sources: { [A]: vacia } });
    const resolver = (id) => ([A, B].includes(id) ? ficha : null);
    const r = F.fuentesDeLaConversacion([primera, segunda], resolver);
    ok(r.verificadas.includes(A) && r.verificadas.includes(B), 'R2 · lo que /cita resolvió en una respuesta sigue registrado aunque otra la marque', r.verificadas.map((u) => u.slice(0, 4)).join(','));
    ok(r.faltan.includes(A), 'R2 · y se pide a /cita para poder contarla', r.faltan.map((u) => u.slice(0, 4)).join(','));
    // Igual que si hubiera venido en el mapa (lo que ya pasaba).
    const primeraConMapa = `Radilla [Doc ID: ${A}].` + meta({ valid: 1, total: 1, sources: { [A]: ficha } });
    ok(F.fuentesDeLaConversacion([primeraConMapa, segunda], () => null).verificadas.includes(A), 'R2 · (la que vino en el mapa, como antes)');
    // Lo que sólo aparece marcado sigue fuera, aunque /cita lo encuentre.
    ok(!F.fuentesDeLaConversacion([segunda], resolver).verificadas.includes(A), 'R2 · la que sólo aparece marcada no se registra');
    // El orden de las respuestas no cambia nada.
    ok(F.fuentesDeLaConversacion([segunda, primera], resolver).verificadas.includes(A), 'R2 · tampoco si la marca viene antes');
}

console.log('\nR3 · EL SELLO NO SE PONE VERDE CON CITAS SIN COMPROBAR');
const S = await import(path.join(RAIZ, 'src/lib/documento/sello.ts')).catch(() => null);
if (!S) ok(false, 'R3 · la cabecera del sello se decide en @/lib/documento/sello', 'no existe');
else {
    const base = { noTrazadas: 0, fueraDeContexto: 0, sinComprobar: 0, fichasPendientes: 0, comprobandoRegistros: false, inventadas: 0, desviadas: 0, sinRegistro: 0, registrosSinComprobar: 0 };
    const v = (c) => S.veredictoDelSello({ ...base, ...c });
    ok(v({ sinComprobar: 1 }).tono === 'incompleto' && v({ sinComprobar: 1 }).titulo !== 'Citas verificadas',
        'R3 · 1 cita sin comprobar (el servidor no respondió): no dice «Citas verificadas»', JSON.stringify(v({ sinComprobar: 1 })));
    ok(v({ registrosSinComprobar: 1 }).tono === 'incompleto', 'R3 · una tesis que el Semanario no dejó comprobar, tampoco', JSON.stringify(v({ registrosSinComprobar: 1 })));
    ok(v({}).titulo === 'Citas verificadas' && v({}).tono === 'verificado', 'R3 · todo comprobado: «Citas verificadas»');
    ok(v({ sinComprobar: 1, noTrazadas: 1 }).tono === 'problema' && v({ sinComprobar: 1, fueraDeContexto: 1 }).tono === 'problema', 'R3 · un problema manda sobre lo incompleto');
    ok(v({ sinComprobar: 1, fichasPendientes: 1 }).tono === 'comprobando', 'R3 · mientras se piden fichas, «Comprobando»');
    const fuente = fs.readFileSync(path.join(RAIZ, 'src/components/SelloCitas.tsx'), 'utf8');
    ok(fuente.includes('veredictoDelSello(') && !fuente.includes("'Citas verificadas'"), 'R3 · el componente usa esa decisión y no tiene la suya');
}

console.log('\nR5 · UN TOPE DE TEXTO POR MENSAJE DEL HISTORIAL');
{
    const TOPE = F.TOPE_TEXTO_POR_MENSAJE;
    ok(Number.isInteger(TOPE) && TOPE >= 200_000, `R5 · ${TOPE} caracteres (la respuesta real tiene ${texto.length}, 22.000 de texto)`);
    const ficha = { origen: 'x', ref: '', texto: 'x' };
    const cola = `\n\n<!-- CITATION_META:${JSON.stringify({ valid: 2, invalid: 0, total: 2, invalid_ids: [], sources: { [A]: ficha, [B]: ficha } })} -->`;
    const enorme = `Al principio [Doc ID: ${A}]. ` + '[Doc ID '.repeat(Math.ceil(3 * TOPE / 8)) + ` Al final [Doc ID: ${B}].` + cola;
    const t0 = performance.now();
    const r = F.fuentesDeLaConversacion([enorme], () => null);
    const ms = performance.now() - t0;
    ok(r.verificadas.includes(A) && !r.verificadas.includes(B), 'R5 · lo que pasa del tope no se lee; el mapa, sí (entero, aparte)', r.verificadas.map((u) => u.slice(0, 4)).join(','));
    const t1 = performance.now();
    F.fuentesDeLaConversacion([enorme.slice(0, TOPE) + cola], () => null);
    const msTope = performance.now() - t1;
    ok(ms < 3 * Math.max(msTope, 5), `R5 · un mensaje de ${(enorme.length / 1e6).toFixed(1)} MB cuesta lo que uno del tope`, `${ms.toFixed(0)} ms frente a ${msTope.toFixed(0)} ms`);
    // Los comentarios no gastan el tope: unas fuentes previas enormes al
    // principio no dejan sin leer las citas del texto.
    const previas = `<!-- FUENTES_PREVIAS:${JSON.stringify({ relleno: 'x'.repeat(2 * TOPE) })} -->\n`;
    const conPrevias = previas + `Radilla [Doc IDs: ${A}; ${B}].` + cola;
    ok(F.fuentesDeLaConversacion([conPrevias], () => null).verificadas.length === 2, 'R5 · los comentarios no cuentan contra el tope');
}

// ═══ 5. TIEMPO LINEAL ══════════════════════════════════════════════════════
// Dos rondas seguidas, un arreglo de expresión regular metió otra
// super-lineal. Aquí se mide: si alguien vuelve a escribir una, falla.
console.log('\nTIEMPO LINEAL (fuzzing con semilla fija)');
{
    /** mulberry32: el mismo azar en cada corrida. */
    const azar = (semilla) => {
        let a = semilla >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };
    const HEX = [...'0123456789abcdef'];
    const COMPLETOS = [A, B, C, 'e63f92ad-a3f0-583e-a7be-001a2b95956d'];
    const RECORTADOS = ['da1de55e-', 'da1de55e-52d9', 'da1de55e-52d9-…', '2b2dc535-…', '42e42c82-8bdc-1c9f-da76-', A.slice(0, 35), '0123abcd-', '-0123456789abcdef'];
    const ALFABETO = ['[', ']', '(', ')', '*', '_', '`', '-', ';', ',', '.', ':', ' ', '\n', ...HEX,
        'Doc', 'IDs', 'ID', 'y', '…', ...COMPLETOS, ...RECORTADOS, 'Doc ID: ', 'Doc IDs: ', '[Doc ID: ', '(Doc IDs: '];
    // Otra familia con lo que leen los escáneres: comentarios, tarjetas, fichas, «\r».
    const MARCAS = ['<!--', '-->', '<!-- CITATION_META:{', '} -->', '<!--thinking-->', '<!--/thinking-->', '<!--THINKING_START-->',
        '<!--SYNTHESIS:START-->', '<!--PASO:', '<think>', '<div class="fuentes-web">', '<div class="fw-nota">', '</div>',
        '<span class="fw-tit">', '</span>', '<span class="fw-dom">', '⟦', '⟧', '<sup class="citation-badge"', '</sup>',
        'data-doc-id="', '\r', '⚠', '# ', '- ', '1. ', '<', '>'];
    const cadena = (semilla, largo, alfabeto) => {
        const r = azar(semilla);
        const uno = () => alfabeto[Math.floor(r() * alfabeto.length)];
        const partes = [];
        let n = 0;
        const poner = (x) => { partes.push(x); n += x.length; };
        if (r() < 0.2) {
            // Una sola racha de un token o de un par: el peor caso de casi todo.
            // Con un uuid delante la mitad de las veces, para no ir por la vía rápida.
            if (r() < 0.5) poner(`${A} `);
            const u = uno() + (r() < 0.5 ? '' : uno());
            poner(u.repeat(Math.ceil((largo - n) / u.length)));
        } else {
            while (n < largo) {
                if (r() < 0.2) { const tok = uno(); poner(tok.repeat(1 + Math.floor((r() * r() * largo) / 2 / tok.length))); } else poner(uno());
            }
        }
        return partes.join('').slice(0, largo);
    };
    // Las cargas de los verificadores (remate_resultado.json de la reverificación
    // de 8029c97 y de 33f2001), escaladas al largo pedido.
    const rellenar = (antes, racha, despues, largo) => antes + racha.repeat(Math.max(1, Math.ceil((largo - antes.length - despues.length) / racha.length))) + despues;
    const CARGAS = {
        'hex con guiones tras «(véase Doc ID: 0123abcd»': (n) => rellenar('(véase Doc ID: 0123abcd', '-0123456789abcdef', '.)', n),
        'racha de «_» dentro de un grupo': (n) => rellenar(`Respuesta [Doc IDs: ${A} `, '_', ']', n),
        'racha de «*» dentro de un grupo': (n) => rellenar(`Respuesta [Doc IDs: ${A} `, '*', ']', n),
        '«(Doc ID: a; ____)»': (n) => rellenar(`(Doc ID: ${A}; `, '_', ')', n),
        '«[Doc ID: x____y]»': (n) => rellenar(`${A} [Doc ID: x`, '_', 'y]', n),
        'adorno en la etiqueta y en el id': (n) => rellenar('', `[**Doc ID:** **${A}**] (**Doc ID:** **${B}**) [**Doc ID:** \`${A}\`] `, '', n),
        'conjunción junto a un id con adorno': (n) => rellenar('', `[Doc IDs: **${A}** y **${B}**] [Doc IDs: \`${A}\` y **${B}**, Tesis 2a./J. 5/2020] `, '', n),
        'prosa dentro del grupo': (n) => rellenar('', `[Doc ID: ${A} (párr. 3)] [Doc ID: ${A}, véase [nota]] `, '', n),
        'grupo partido con prosa (R1)': (n) => rellenar('', `Radilla [Doc IDs: ${A} (párr. 340);\n${B} (párr. 341)] sigue. `, '', n),
        'grupo partido con etiqueta en cada renglón': (n) => rellenar('', `[Doc ID: ${A}, párr. 340;\nDoc ID: ${B}, párr. 341] `, '', n),
        'un corchete con etiqueta y 20k espacios': (n) => rellenar(`${A} [Doc ID`, ' ', ']', n),
        'una etiqueta abierta y espacios hasta el final': (n) => rellenar(`${A} [Doc IDs:`, ' ', 'x', n),
        'fila de «[»': (n) => rellenar(`${A} `, '[', '', n),
        'fila de «[Doc ID:»': (n) => rellenar(`${A} `, '[Doc ID:', '', n),
        'fila de «(Doc ID:»': (n) => rellenar(`${A} `, '(Doc ID:', '', n),
        '«Doc» y espacios': (n) => rellenar(`${A} Doc`, ' ', 'x', n),
        'espacios que no acaban en salto': (n) => rellenar(`${A} `, ' ', 'x', n),
        'fila de «<!--»': (n) => rellenar(`${A} `, '<!--', '', n),
        'grupo abierto al final, renglón a renglón': (n) => rellenar(`Mientras: [Doc IDs: ${A};\n`, `${B};\n`, '', n),
        'serie suelta muy larga': (n) => rellenar('Doc ID: ', `${A}; Doc ID: `, A, n),
        'citas distintas': (n) => { let t = ''; for (let i = 0; t.length < n; i++) t += `[Doc ID: ${i.toString(16).padStart(8, '0')}-52d9-de76-8001-92f4bd4c0424] `; return t; },
        'renglones en blanco con «\\r»': (n) => rellenar('- x\n', '\r\n', '- y', n),
        'viñeta con espacios y «\\r»': (n) => rellenar('- ', ' ', 'x\ry', n),
        'corchetes dentro de un grupo': (n) => rellenar('', `[Doc ID: ${A}, véase [nota]] [Nota [Doc ID: ${B}] x] `, '', n),
        'pares dentro de un grupo que no cierra': (n) => rellenar(`${A} [Doc ID: `, '[x] ', '', n),
        'tres niveles de corchetes': (n) => rellenar(`${A} `, '[a [b [c] d] e] ', '', n),
    };

    // Lo que se mide: TODA función pública de `@/lib/idsDeCita` —una nueva entra
    // sola; si pide más de un argumento necesita aquí su adaptador—, las dos
    // limpiezas, la numeración del chat y la de la hoja, y el registro.
    const ADAPTADORES = { quitarBloques: (t) => Ids.quitarBloques(t, /<!--/g, '-->') };
    const medidas = [];
    for (const [nombre, f] of Object.entries(Ids)) {
        if (typeof f !== 'function') continue;
        if (f.length > 1 && !ADAPTADORES[nombre]) { ok(false, `idsDeCita.${nombre}: pide ${f.length} argumentos y no tiene adaptador para medirla`); continue; }
        medidas.push([`idsDeCita.${nombre}`, ADAPTADORES[nombre] || f]);
    }
    medidas.push(
        ['marcado.limpiarMarcadores (constructor)', Mar.limpiarMarcadores],
        ['marcado.markdownAHtml (Word)', Mar.markdownAHtml],
        ['expedientes.limpiarMarcadores (carpetas)', E.limpiarMarcadores],
        ['citas.htmlDeDocumento (numeración de la hoja)', Cit.htmlDeDocumento],
        ['citas.htmlDeDossier (hoja de la conversación)', (t) => Cit.htmlDeDossier([t])],
        ['citas.metaDeCitas', Cit.metaDeCitas],
        ['fichas.fuentesDeLaConversacion (registro)', (t) => F.fuentesDeLaConversacion([t], () => null)],
    );

    const SEMILLA = 20260926;
    const familia = (nombre, desde, cuantas, largo, alfabeto) =>
        Array.from({ length: cuantas }, (_, k) => ({ nombre: `${nombre} #${k}`, s: cadena(SEMILLA + desde + k, largo, alfabeto) }));
    const cargas = (largo) => Object.entries(CARGAS).map(([nombre, g]) => ({ nombre, s: g(largo) }));
    // Pares 20k ↔ 100k con la MISMA receta (semilla o carga): así se compara
    // lo mismo a dos tamaños.
    const C20 = familia('azar', 0, 500, 20_000, ALFABETO);
    const C100 = familia('azar', 0, 20, 100_000, ALFABETO);
    const M20 = familia('marcas', 100_000, 60, 20_000, [...ALFABETO, ...MARCAS]);
    const M100 = familia('marcas', 100_000, 6, 100_000, [...ALFABETO, ...MARCAS]);
    const P20 = cargas(20_000);
    const P100 = cargas(100_000);
    const TODAS20 = [...C20, ...M20, ...P20];
    const PARES = [
        ...C100.map((c, k) => [C20[k], c]),
        ...M100.map((c, k) => [M20[k], c]),
        ...P100.map((c, k) => [P20[k], c]),
    ];
    console.log(`  ${TODAS20.length} cadenas de 20k (${C20.length} del alfabeto, ${M20.length} con marcadores, ${P20.length} cargas conocidas) y ${PARES.length} de 100k`);

    const cronometrar = (f, x, veces = 2) => {
        let mejor = Infinity;
        for (let k = 0; k < veces; k++) {
            const t0 = performance.now();
            f(x);
            const dt = performance.now() - t0;
            if (dt < mejor) mejor = dt;
        }
        return mejor;
    };
    // Por debajo de un milisegundo con 20k, la razón es ruido (el reloj, el
    // JIT): se compara contra ese piso, así que con 100k 6 ms pasan siempre.
    // Una expresión cuadrática que tarde medio milisegundo con 20k tarda
    // 12 ms con 100k: se ve igual.
    const PISO = 1;
    /** 100k/20k. Lo lineal da ~5×, y el ruido lo lleva a veces a 6,2× (medido:
     *  la carga de corchetes anidados da 4,2×, 5,2× y 3,7× de 20k a 2 MB). Si
     *  pasa de 6 se mide otra vez —hasta cuatro rondas de mejor de 7,
     *  alternando los dos tamaños— antes de acusar: una pausa del recolector
     *  o otra carga en la máquina no es una expresión cuadrática, que da ~25×
     *  en todas las rondas. */
    const razon = (f, chica, grande, a, b) => {
        let r = b / Math.max(a, PISO);
        for (let ronda = 0; r > 6 && ronda < 4; ronda++) {
            const a2 = cronometrar(f, chica.s, 7);
            const b2 = cronometrar(f, grande.s, 7);
            const r2 = b2 / Math.max(a2, PISO);
            if (r2 < r) { r = r2; a = a2; b = b2; }
        }
        return { r, a, b };
    };
    const t0 = performance.now();
    const cuenta = (x, campo = 't') => (x.c ? `${x[campo].toFixed(1)}${campo === 'r' ? '×' : ' ms'} (${x.c.nombre})` : 'sin medir');
    for (const [nombre, f] of medidas) {
        for (const c of TODAS20.slice(0, 5)) f(c.s);          // que el JIT la compile antes de medir
        // En cuanto una cadena rompe el límite, la función ya falló: no se
        // espera al resto (con una expresión cuadrática serían minutos).
        const t20 = new Map();
        let peor20 = { t: -1, c: null };
        for (const c of TODAS20) {
            const t = cronometrar(f, c.s);
            t20.set(c, t);
            if (t > peor20.t) peor20 = { t, c };
            if (t >= 60) break;
        }
        let peor100 = { t: -1, c: null };
        let peorRazon = { r: -1, c: null, a: 0, b: 0 };
        if (peor20.t < 60) {
            for (const [chica, grande] of PARES) {
                const b = cronometrar(f, grande.s);
                if (b > peor100.t) peor100 = { t: b, c: grande };
                if (b >= 300) break;
                const m = razon(f, chica, grande, t20.get(chica), b);
                if (m.r > peorRazon.r) peorRazon = { ...m, c: grande };
                if (m.r > 6) break;
            }
        }
        const bien = peor20.t < 60 && peor100.t >= 0 && peor100.t < 300 && peorRazon.r <= 6;
        ok(bien, nombre, `20k ≤ ${cuenta(peor20)} · 100k ≤ ${cuenta(peor100)} · 100k/20k ≤ ${cuenta(peorRazon, 'r')}`
            + (peorRazon.c ? `: ${peorRazon.a.toFixed(2)} → ${peorRazon.b.toFixed(2)} ms` : ''));
    }
    console.log(`  (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
}

// ═══ 6. EQUIVALENCIA CON EL COMMIT ANTERIOR ════════════════════════════════
// Lo que cambió para ganar tiempo lineal no debe cambiar la salida del caso
// real: se saca el commit de referencia con `git archive` y se compara.
{
    const ref = (args.find((a) => a.startsWith('--referencia=')) || '--referencia=33f2001').split('=')[1];
    console.log(`\nEQUIVALENCIA CON ${ref} SOBRE EL CASO REAL`);
    let dir = null;
    try {
        const sha = execFileSync('git', ['-C', RAIZ, 'rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
        dir = path.join(REFERENCIAS, sha);
        if (!fs.existsSync(path.join(dir, 'src/lib/idsDeCita.ts'))) {
            fs.mkdirSync(dir, { recursive: true });
            execSync(`git -C ${JSON.stringify(RAIZ)} archive ${sha} src | tar -x -C ${JSON.stringify(dir)}`);
        }
    } catch (e) {
        ok(false, `no se pudo sacar ${ref} con git`, String(e?.message || e).slice(0, 160));
        dir = null;
    }
    if (dir) {
        const cargar = async (raiz) => ({
            I: await import(path.join(raiz, 'src/lib/idsDeCita.ts')),
            C: await import(path.join(raiz, 'src/lib/documento/citas.ts')),
            M: await import(path.join(raiz, 'src/lib/documento/marcado.ts')),
            E: await import(path.join(raiz, 'src/lib/expedientes.ts')),
            F: await import(path.join(raiz, 'src/lib/documento/fichas.ts')),
        });
        const viejo = await cargar(dir);
        const nuevo = await cargar(RAIZ);
        const mensajes = (Array.isArray(conversacion) ? conversacion : conversacion.messages || []).map((m) => m.content || '');
        const respuestas = (Array.isArray(conversacion) ? conversacion : conversacion.messages || []).filter((m) => m.role === 'assistant').map((m) => m.content || '');
        const resolver = (id) => (ORO.includes(id) ? { origen: 'x', ref: '', texto: 'x' } : null);
        const salidas = (x) => ({
            'expandirCitasAgrupadas': mensajes.map((t) => x.I.expandirCitasAgrupadas(t)),
            'idsCitados': mensajes.map((t) => x.I.idsCitados(t)),
            'numerarCitasDelChat (chat)': mensajes.map((t) => { const r = x.I.numerarCitasDelChat(t); return [r.content, [...r.docIdMap]]; }),
            'htmlDeDocumento (hoja)': mensajes.map((t) => x.C.htmlDeDocumento(t)),
            'marcarCitas': mensajes.map((t) => x.C.marcarCitas(t)),
            'metaDeCitas': mensajes.map((t) => x.C.metaDeCitas(t)),
            'palabrasDe': mensajes.map((t) => x.C.palabrasDe(t)),
            'separarTarjetas': mensajes.map((t) => x.M.separarTarjetas(t)),
            'limpiarMarcadores (constructor)': mensajes.map((t) => x.M.limpiarMarcadores(t)),
            'markdownAHtml (Word)': mensajes.map((t) => x.M.markdownAHtml(t)),
            'limpiarMarcadores (carpetas)': mensajes.map((t) => x.E.limpiarMarcadores(t)),
            'htmlDeDossier': x.C.htmlDeDossier(respuestas),
            'fuentesDeLaConversacion (registro)': x.F.fuentesDeLaConversacion(respuestas, resolver),
        });
        const antes = salidas(viejo);
        const ahora = salidas(nuevo);
        for (const clave of Object.keys(antes)) {
            const a = JSON.stringify(antes[clave]);
            const b = JSON.stringify(ahora[clave]);
            let donde = '';
            if (a !== b) { let k = 0; while (a[k] === b[k]) k++; donde = `difiere en ${k}: «${a.slice(Math.max(0, k - 40), k + 40)}» → «${b.slice(Math.max(0, k - 40), k + 40)}»`; }
            ok(a === b, `${clave}: idéntica (${a.length} caracteres)`, donde);
        }
    }
}

console.log(fallas ? `\n${fallas} COMPROBACIÓN(ES) FALLIDA(S)` : '\nTODO BIEN');
process.exit(fallas ? 1 : 0);
