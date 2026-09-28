// LA REVISIÓN ANTES DE PRESENTAR (28-sep-2026).
//
// · `revisarEscrito`: manda la hoja a `POST /redaccion/revisar`, recortada al
//   tope del servidor; sin texto no pregunta, y si el servidor falla o no
//   contesta, null (el panel lo dice) en vez de tronar.
// · `normalizarRevision`: sólo se pinta lo que tiene nivel conocido y texto, y
//   las cuentas de la cabecera son las de lo pintado.
// · `trozosParaSenalar`: el trozo entero y sus centros, para encontrarlo en la
//   hoja aunque el contexto del linter cruce dos párrafos; en tiempo lineal.
//
//   node --experimental-strip-types comprobaciones/revision.mjs
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

let respuesta = null;
const pedidos = [];
globalThis.fetch = async (url, init) => {
    pedidos.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : null });
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
};
const contesta = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });

const R = await import(path.join(RAIZ, 'src/lib/revision.ts'));

let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

const BUENA = {
    tipo: 'amparo_indirecto', tipo_nombre: 'demanda de amparo indirecto',
    hallazgos: [
        { nivel: 'falta', que: 'Los antecedentes, bajo protesta de decir verdad', fundamento: 'artículo 108, fracción V, de la Ley de Amparo', donde: '' },
        { nivel: 'revise', que: 'Un dato pendiente sin llenar', fundamento: '', donde: '[DATO PENDIENTE: fecha]' },
        { nivel: 'bien', que: 'El acto reclamado', fundamento: 'artículo 108, fracción IV', donde: '' },
    ],
    faltan: 1, revisar: 1,
};

// ── el envío ─────────────────────────────────────────────────────────────
{
    pedidos.length = 0;
    respuesta = contesta(200, BUENA);
    const r = await R.revisarEscrito('Juan Pérez, por mi propio derecho…');
    ok(pedidos.length === 1 && pedidos[0].url.endsWith('/redaccion/revisar') && pedidos[0].init.method === 'POST',
        'pregunta a POST /redaccion/revisar');
    ok(pedidos[0].body && pedidos[0].body.texto === 'Juan Pérez, por mi propio derecho…', 'con la hoja como `texto`');
    ok(r && r.tipo_nombre === 'demanda de amparo indirecto' && r.hallazgos.length === 3 && r.faltan === 1 && r.revisar === 1,
        'y devuelve la revisión');

    pedidos.length = 0;
    ok(await R.revisarEscrito('') === null && await R.revisarEscrito('   \n\t ') === null && await R.revisarEscrito(null) === null
        && pedidos.length === 0, 'sin texto no pregunta');

    pedidos.length = 0;
    await R.revisarEscrito('x'.repeat(R.TOPE_REVISION + 5000));
    ok(pedidos[0].body.texto.length === R.TOPE_REVISION, 'lo recorta al tope del servidor');
    ok(R.TOPE_REVISION === 300_000, 'el tope es el de revision_escrito.TOPE_TEXTO (300,000)');

    const control = new AbortController();
    pedidos.length = 0;
    await R.revisarEscrito('algo', control.signal);
    ok(pedidos[0].init.signal === control.signal, 'la señal para cancelarla viaja con la petición');

    respuesta = contesta(500, { detail: 'error' });
    ok(await R.revisarEscrito('algo') === null, 'si el servidor falla, null');
    respuesta = contesta(422, { detail: [{ msg: 'demasiado largo' }] });
    ok(await R.revisarEscrito('algo') === null, 'si lo rechaza, null');
    respuesta = new Error('sin red');
    ok(await R.revisarEscrito('algo') === null, 'sin red, null');
    respuesta = Object.assign(new Error('cancelada'), { name: 'AbortError' });
    ok(await R.revisarEscrito('algo') === null, 'cancelada, null');
    respuesta = { ok: true, status: 200, json: async () => { throw new SyntaxError('no es JSON'); } };
    ok(await R.revisarEscrito('algo') === null, 'si no contesta JSON, null');
}

// ── lo que se pinta ──────────────────────────────────────────────────────
{
    for (const [nombre, j] of Object.entries({ nulo: null, texto: 'hola', vacio: {}, 'hallazgos que no son lista': { hallazgos: 'x' } })) {
        ok(R.normalizarRevision(j) === null, `${nombre}: null`);
    }
    const r = R.normalizarRevision({
        tipo_nombre: '   ',
        hallazgos: [
            { nivel: 'falta', que: '  De verdad falta  ', fundamento: 7, donde: null },
            { nivel: 'raro', que: 'nivel desconocido' },
            { nivel: 'revise', que: '' },
            { nivel: 'bien' },
            null, 'texto', 42,
            { nivel: 'revise', que: 'Una coma huérfana', donde: 'dice , así' },
        ],
        faltan: 9, revisar: 9,
    });
    ok(r.hallazgos.length === 2, `sólo lo que tiene nivel conocido y texto (${r.hallazgos.length})`);
    ok(r.hallazgos[0].que === 'De verdad falta' && r.hallazgos[0].fundamento === '' && r.hallazgos[0].donde === '',
        'recortado, y lo que no es texto queda vacío');
    ok(r.faltan === 1 && r.revisar === 1, 'las cuentas son las de lo pintado, no las que dijo');
    ok(r.tipo_nombre === 'escrito' && r.tipo === 'otro', 'sin nombre del tipo, «escrito»');
    const b = R.normalizarRevision(BUENA);
    ok(JSON.stringify(b) === JSON.stringify(BUENA), 'una respuesta buena pasa tal cual');
}

// ── los trozos para señalar ──────────────────────────────────────────────
{
    ok(R.trozosParaSenalar('').length === 0 && R.trozosParaSenalar(null).length === 0 && R.trozosParaSenalar('abc').length === 0,
        'vacío o de menos de 4, ninguno');
    ok(JSON.stringify(R.trozosParaSenalar('  la   coma,\n rota  ')) === JSON.stringify(['la coma, rota']),
        'los blancos, a uno (como los junta la hoja)');
    const largo = 'a'.repeat(30) + ' EL CENTRO DE LA FRASE ROTA , AQUÍ ' + 'b'.repeat(30);
    const t = R.trozosParaSenalar(largo);
    ok(t.length === 3 && t[0] === largo && t[1].length <= 40 && t[2].length <= 20, 'el entero, su centro de 40 y de 20');
    ok(t[0].includes(t[1]) && t[1].includes(t[2]) && t[2].includes('ROTA'), 'cada uno dentro del anterior, alrededor del centro');
    const corto = 'x'.repeat(30);
    ok(R.trozosParaSenalar(corto).length === 2, 'sin repetidos: si mide menos de 40, su centro de 40 es él mismo');

    for (const [nombre, texto] of Object.entries({ blancos: ' '.repeat(200000) + 'x', mezclado: ' \n\t'.repeat(70000) })) {
        const t0 = performance.now();
        R.trozosParaSenalar(texto);
        const ms = performance.now() - t0;
        ok(ms < 300, `${nombre} (${texto.length.toLocaleString('es-MX')} caracteres): ${ms.toFixed(0)} ms`);
    }
}

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
