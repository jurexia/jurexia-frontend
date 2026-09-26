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
// /cita de mentira (D6, D7) con un `fetch` simulado: sin red y sin escribir nada.
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
    globalThis.fetch = fetchReal;
}

console.log(fallas ? `\n${fallas} COMPROBACIÓN(ES) FALLIDA(S)` : '\nTODO BIEN');
process.exit(fallas ? 1 : 0);
