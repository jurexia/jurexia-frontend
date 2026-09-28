// LOS DATOS PENDIENTES Y EL PERFIL DEL DESPACHO (28-sep-2026).
//
// · `datosPendientes`: los «[DATO PENDIENTE: …]» de la hoja, agrupados por su
//   texto exacto —que es lo que se sustituye—, con cuántas veces aparecen; lo
//   que no tiene esa forma no cuenta, y en tiempo lineal.
// · `normalizarDespacho`: sólo los campos conocidos, en un renglón y
//   recortados a los mismos topes que el servidor; el rol, sólo si es uno de
//   los cuatro.
// · El envío: el perfil vigente viaja en el request como `despacho`, y sin
//   perfil no viaja nada.
//
//   node --experimental-strip-types comprobaciones/pendientes_despacho.mjs
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

const guardado = new Map();
globalThis.localStorage = {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => guardado.set(k, String(v)),
    removeItem: (k) => guardado.delete(k),
};
const pedidos = [];
globalThis.fetch = async (url, init) => {
    pedidos.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    return {
        ok: true, status: 200,
        body: { getReader: () => { let dado = false; return { read: async () => (dado ? { done: true } : (dado = true, { done: false, value: new TextEncoder().encode('ok') })) }; } },
    };
};

const M = await import(path.join(RAIZ, 'src/lib/documento/marcado.ts'));
const D = await import(path.join(RAIZ, 'src/lib/despacho.ts'));
const API = await import(path.join(RAIZ, 'src/lib/api.ts'));

let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

// ── los datos pendientes ─────────────────────────────────────────────────
{
    const hoja = `[DATO PENDIENTE: nombre de la parte quejosa], por mi propio derecho…
El día [DATO PENDIENTE: fecha de la visita] la autoridad clausuró… y
[DATO PENDIENTE: nombre de la parte quejosa] lo acredita. [dato pendiente:  domicilio ]
[COMPLETAR] y [INSERTAR fecha] no son de esta forma. [DATO PENDIENTE: ] tampoco.
[DATO PENDIENTE: partido
en dos renglones] no cuenta.`;
    const p = M.datosPendientes(hoja);
    ok(p.length === 3, `tres huecos distintos (${p.length})`);
    const quejosa = p.find((x) => x.dato === 'nombre de la parte quejosa');
    ok(quejosa && quejosa.veces === 2 && quejosa.marca === '[DATO PENDIENTE: nombre de la parte quejosa]',
        'el repetido se cuenta dos veces, con su texto exacto para sustituirlo');
    ok(p.some((x) => x.dato === 'domicilio' && x.marca === '[dato pendiente:  domicilio ]'), 'en minúsculas y con blancos, también');
    ok(p[0].dato === 'nombre de la parte quejosa', 'en el orden en que aparecen');
    ok(M.datosPendientes('').length === 0 && M.datosPendientes(null).length === 0, 'vacío o nulo, ninguno');

    for (const [nombre, texto] of Object.entries({
        'corchetes abiertos': '[DATO PENDIENTE: '.repeat(20000),
        'blancos': '[' + ' '.repeat(100000),
        'muchos huecos': '[DATO PENDIENTE: x] '.repeat(20000),
    })) {
        const t0 = performance.now();
        M.datosPendientes(texto);
        const ms = performance.now() - t0;
        ok(ms < 300, `${nombre} (${texto.length.toLocaleString('es-MX')} caracteres): ${ms.toFixed(0)} ms`);
    }
}

// ── el perfil del despacho ───────────────────────────────────────────────
{
    const d = D.normalizarDespacho({
        rol: 'postulante', nombre: '  Lic.   María\nLópez ', cedula: '1234567',
        domicilio: 'x'.repeat(1000), otra: 'no', autorizados: 42, ciudad: '',
    });
    ok(d.nombre === 'Lic. María López', 'un renglón, sin blancos de sobra');
    ok(d.domicilio.length === D.TOPES_DESPACHO.domicilio, 'recortado a su tope (el mismo del servidor)');
    ok(!('otra' in d) && !('autorizados' in d) && !('ciudad' in d), 'sólo campos conocidos, de texto y con algo');
    ok(d.rol === 'postulante' && D.normalizarDespacho({ rol: 'juez' }) === null, 'el rol, sólo si es uno de los cuatro');
    ok(D.normalizarDespacho(null) === null && D.normalizarDespacho('texto') === null && D.normalizarDespacho([]) === null
        && D.normalizarDespacho({}) === null, 'lo que no es un perfil, nada');
    ok(JSON.stringify(D.TOPES_DESPACHO) === JSON.stringify({ nombre: 120, cedula: 40, domicilio: 300, contacto: 160, autorizados: 400, ciudad: 80 }),
        'los topes son los de esfuerzo_redaccion.DESPACHO_TOPES');
}

// ── el envío ─────────────────────────────────────────────────────────────
{
    const enviar = async () => {
        pedidos.length = 0;
        for await (const _ of API.streamChat([{ role: 'user', content: 'Redacta la demanda' }], 'CDMX')) { /* nada */ }
        return pedidos.find((p) => p.url.endsWith('/chat')).body;
    };
    D.fijarDespacho(null);
    ok(!('despacho' in await enviar()), 'sin perfil no viaja nada');
    D.fijarDespacho({ rol: 'postulante', nombre: 'Lic. María López', cedula: '1234567' });
    const cuerpo = await enviar();
    ok(cuerpo.despacho && cuerpo.despacho.nombre === 'Lic. María López' && cuerpo.despacho.rol === 'postulante',
        'con perfil, viaja como `despacho`');
    D.fijarDespacho({ nada: 'x' });
    ok(!('despacho' in await enviar()), 'un perfil vacío no viaja');
}

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
