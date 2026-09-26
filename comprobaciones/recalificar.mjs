// LA RECALIFICACIÓN DE LOS TUMBADOS EN LA PANTALLA, PROBADA SIN SERVIDOR
// (26-sep-2026).
//
// David: «si cambio sentido hay que tumbar y regenerar con la premisa del
// cambio de sentido» (contrato: diag/contrato_recalificar.md). Cuando el
// principal va por la vía contraria a la que propuso el motor, /taller/reparto
// devuelve tumbados los accesorios que él no tocó; la pantalla los enseña
// «Recalificando con tu premisa…», pide POST /taller/recalificar con
// antirrebote, pinta lo que vuelve, deja que él lo pise, y el plan espera.
// Nada de eso se ve en un typecheck: una llamada de más es una llamada al
// modelo (y el servidor corta en 6 corridas por adelanto), y una respuesta de
// otra premisa pintada encima de la de ahora enseña una calificación que no
// es la de su decisión. Aquí se comprueba con el código REAL (transpilado al
// vuelo con el TypeScript del proyecto), un reloj falso y un fetch falso:
//
//   1 · recalificar(): el MISMO formulario que el proyecto, y la lectura
//       tolerante de la respuesta;
//   2 · el evento «recalificando» del flujo;
//   3 · el reparto: qué se tumba, qué se escribe y qué NO (la base);
//   4 · la clave de la premisa y lo que se pinta encima;
//   5 · el hook: antirrebote, «enseguida», espera mientras se redacta la
//       razón, clave vieja cancelada e ignorada, en curso, fallo, error y
//       reintentar;
//   6 · pisar = tocado;
//   7 · el plan espera a la recalificación;
//   8 · la pantalla de decisión (Decision.tsx) pintada de verdad.
//
//   node comprobaciones/recalificar.mjs
//
// No arranca Next ni llama a ningún servidor.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requerir = createRequire(path.join(RAIZ, 'package.json'));
const ts = requerir('typescript');

let fallas = 0, bien = 0;
function ok(cond, que) {
    if (cond) { bien += 1; return; }
    fallas += 1;
    console.log(`  FALLA · ${que}`);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'recalificar-'));
function transpilar(rel, destino, cambios = []) {
    const src = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    let js = ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
                           jsx: ts.JsxEmit.React, esModuleInterop: true },
        fileName: rel,
    }).outputText;
    for (const [de, a] of cambios) js = js.split(de).join(a);
    fs.writeFileSync(path.join(TMP, destino), js);
}
const REACT = ['require("react")', 'require("./react_falso.js")'];
transpilar('src/components/sentencia/api.ts', 'api.js');
transpilar('src/components/sentencia/recalificacion.ts', 'recal.js', [REACT]);
transpilar('src/components/sentencia/ComoSeEstudiara.tsx', 'como.js', [
    REACT,
    ['require("lucide-react")', 'require("./nada.js")'],
    ['require("./primitivas")', 'require("./nada.js")'],
]);
transpilar('src/components/sentencia/Decision.tsx', 'decision.js', [
    REACT,
    ['require("lucide-react")', 'require("./nada.js")'],
    ['require("./primitivas")', 'require("./primitivas_falsas.js")'],
    ['require("./EstudiarJuntos")', 'require("./nada.js")'],
    ['require("./ComoSeEstudiara")', 'require("./como_espia.js")'],
    ['require("./recalificacion")', 'require("./recal.js")'],
]);
fs.writeFileSync(path.join(TMP, 'nada.js'),
    'module.exports = new Proxy({}, { get: () => () => null });');

/* Un React mínimo: useState, useRef, useEffect, useMemo y useCallback con sus
   reglas de dependencias; los efectos corren después de pintar, en orden.
   createElement arma un árbol que después se recorre para leer el texto y
   pulsar los botones. */
fs.writeFileSync(path.join(TMP, 'react_falso.js'), `
const R = { hooks: [], i: 0, efectos: [], sucio: false };
function useState(ini) {
  const i = R.i++;
  if (!(i in R.hooks)) R.hooks[i] = { v: typeof ini === 'function' ? ini() : ini };
  const h = R.hooks[i];
  return [h.v, (nv) => { const v = typeof nv === 'function' ? nv(h.v) : nv;
                         if (!Object.is(v, h.v)) { h.v = v; R.sucio = true; } }];
}
function useRef(ini) { const i = R.i++; if (!(i in R.hooks)) R.hooks[i] = { current: ini }; return R.hooks[i]; }
const cambian = (prev, deps) => !prev || !deps || deps.length !== prev.deps.length
                                || deps.some((d, k) => !Object.is(d, prev.deps[k]));
function useEffect(fn, deps) {
  const i = R.i++; const prev = R.hooks[i];
  if (!cambian(prev, deps)) return;
  const reg = { deps, limpiar: null }; R.hooks[i] = reg;
  R.efectos.push(() => { if (prev && prev.limpiar) prev.limpiar();
                         const c = fn(); reg.limpiar = typeof c === 'function' ? c : null; });
}
function useMemo(fn, deps) {
  const i = R.i++; const prev = R.hooks[i];
  if (cambian(prev, deps)) R.hooks[i] = { v: fn(), deps };
  return R.hooks[i].v;
}
function useCallback(fn, deps) { return useMemo(() => fn, deps); }
function desmontar() { R.hooks.forEach((h) => h && h.limpiar && h.limpiar()); R.hooks = []; R.efectos = []; }
const Fragment = Symbol('f');
function createElement(type, props, ...children) {
  return { type, props: { ...(props || {}), children: children.flat(Infinity) } };
}
module.exports = { __R: R, desmontar, useState, useRef, useEffect, useMemo, useCallback,
                   createElement, Fragment };
module.exports.default = module.exports;
`);
fs.writeFileSync(path.join(TMP, 'primitivas_falsas.js'), `
const React = require('./react_falso.js');
module.exports = {
  cn: (...a) => a.filter(Boolean).join(' '),
  Pastilla: (p) => React.createElement('span', null, p.children),
};
`);
/* El panel del plan no se pinta aquí: se espía con qué `listo` lo llama
   Decision, que es lo que decide si el plan se pide. */
fs.writeFileSync(path.join(TMP, 'como_espia.js'), `
globalThis.__listoPlan = [];
module.exports = {
  __esModule: true,
  default: () => null,
  usePlanDelEstudio: (enlace, listo) => { globalThis.__listoPlan.push(listo);
      return { fase: 'esperando', respuesta: null, desactualizado: false, error: '' }; },
  pendientesDeRazon: () => [],
};
`);

const req = createRequire(path.join(TMP, 'x.js'));
const api = req('./api.js');
const recal = req('./recal.js');
const como = req('./como.js');
const Rf = req('./react_falso.js');
const Decision = req('./decision.js').default;

const vaciar = async () => { for (let k = 0; k < 40; k++) await Promise.resolve(); };
const entradas = (fd) => JSON.stringify([...fd.entries()].map(([k, v]) => [k, String(v)]));

/* ── Los datos de un asunto: principal y tres accesorios ── */
const P = (id, pregunta, sentido, criterio = '', jerarquia = 'accesorio') =>
    ({ id, pregunta, sentido, criterio, jerarquia, resolvio: '', combate: '', candidatos: [] });
const PROBS = () => [
    P('p0', '¿Procedía la acción sin la inscripción registral?', 'infundado', '', 'principal'),
    P('p1', '¿La condena excedió lo reclamado?', 'fundado', 'razón de la otra vía', 'accesorio'),
    P('p2', '¿Procedían las costas de segunda instancia?', 'fundado', 'otra razón vieja', 'accesorio'),
    P('p3', '¿Se valoró la pericial?', 'infundado', 'la suya', 'accesorio'),
];
const crit = (problema, extra = {}) => ({ problema, sentido: '', razonamiento: '', jerarquia: 'accesorio',
                                          tocado: false, de: '', por_que: '', ...extra });

/* ═══ 1 · recalificar(): EL MISMO FORMULARIO Y LA LECTURA TOLERANTE ═══ */
{
    const fetchReal = globalThis.fetch;
    const pedidos = [];
    let respuesta = { estado: 'listo', clave: ' K1 ', criterios: [
        { problema: '¿La condena excedió lo reclamado?', sentido: 'Infundado', razonamiento: 'r', de: 'recalificada',
          por_que: 'x', recalificar: true, extra: 1 }, 'basura', null],
        avisos: ['uno', { texto: 'dos' }, '  '] };
    let status = 200;
    globalThis.fetch = async (url, init) => {
        pedidos.push({ url: String(url), init });
        return new Response(JSON.stringify(status === 200 ? respuesta : { detail: 'Tope de 6 corridas' }), { status });
    };
    const opciones = { criteriosJson: '[{"problema":"¿x?","sentido":"infundado","tocado":true}]',
                       contexto: 'ctx', formato: 'estandar', suplencia: null,
                       razonesSegmento: { 'C1.a': 'mía' }, varianteEstudio: 'v4' };
    const ctl = new AbortController();
    const r = await api.recalificar('642/2024', 'x@y.mx', opciones, ctl.signal);
    ok(pedidos[0].url.endsWith('/taller/recalificar') && pedidos[0].init.method === 'POST', 'POST a /taller/recalificar');
    ok(entradas(pedidos[0].init.body) === entradas(api.formularioDelResolver('642/2024', 'x@y.mx', opciones)),
       'el cuerpo es EXACTAMENTE formularioDelResolver (misma clave que el proyecto y el plan)');
    ok(pedidos[0].init.signal === ctl.signal, 'la petición lleva la señal para cancelarla');
    ok(r.estado === 'listo' && r.clave === 'K1', 'estado y clave');
    ok(r.criterios.length === 1 && r.criterios[0].sentido === 'infundado' && r.criterios[0].de === 'recalificada'
       && r.criterios[0].recalificar === true, 'criterios leídos, sentido normalizado, basura fuera');
    ok(r.avisos.join('|') === 'uno|dos', 'avisos en texto u objeto, vacíos fuera');
    respuesta = { estado: 'raro', criterios: 'no' };
    const r2 = await api.recalificar('642/2024', 'x@y.mx', opciones);
    ok(r2.estado === 'fallo' && r2.criterios.length === 0, 'un estado que no se reconoce es FALLO, nunca «listo»');
    respuesta = { estado: 'sin_cambios', clave: 'K2', criterios: [] };
    ok((await api.recalificar('1', 'x', opciones)).estado === 'sin_cambios', 'sin_cambios');
    respuesta = { estado: 'en_curso' };
    ok((await api.recalificar('1', 'x', opciones)).estado === 'en_curso', 'en_curso');
    status = 429;
    let msg = '';
    try { await api.recalificar('1', 'x', opciones); } catch (e) { msg = e.message; }
    ok(msg === 'Tope de 6 corridas', 'un error HTTP se lanza con el detalle del servidor');
    globalThis.fetch = fetchReal;
}

/* ═══ 2 · EL EVENTO «recalificando» DEL FLUJO ═══ */
{
    const fetchReal = globalThis.fetch;
    const eventos = [
        { tipo: 'recalificando' },
        { tipo: 'ordenando' },
        { tipo: 'texto', dato: 'Primer párrafo.' },
        { tipo: 'listo', docx_b64: '', nombre: 'x.docx', palabras: 2, avisos: [], huecos: [], version: 3 },
    ];
    const orden = [];
    globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes('/taller/proyecto?')) return new Response(JSON.stringify({ proyecto: null }), { status: 200 });
        if (u.includes('/taller/resolver/stream')) {
            const cuerpo = eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
            return new Response(new ReadableStream({
                start(c) { c.enqueue(new TextEncoder().encode(cuerpo)); c.close(); } }), { status: 200 });
        }
        if (u.includes('/taller/descargar')) return new Response(new Blob(['x']), { status: 200 });
        return new Response('{}', { status: 404 });
    };
    const r = await api.resolverEnVivo('642/2024', 'x@y.mx', { criteriosJson: '[]' },
        () => orden.push('texto'), () => {}, () => orden.push('ordenando'), () => orden.push('recalificando'));
    ok(orden.join(',') === 'recalificando,ordenando,texto', `el evento «recalificando» llega antes del plan (${orden})`);
    ok(r.palabras === 2, 'y el proyecto llega igual');
    // Sin el callback nuevo (llamadas viejas), el evento no tumba nada.
    const r2 = await api.resolverEnVivo('642/2024', 'x@y.mx', { criteriosJson: '[]' });
    ok(r2.palabras === 2, 'sin onRecalificando, el evento se ignora sin error');
    globalThis.fetch = fetchReal;
}

/* ═══ 3 · EL REPARTO: QUÉ SE TUMBA Y QUÉ SE ESCRIBE ═══ */
{
    const probs = PROBS();
    const criterios = [
        crit('¿Procedía la acción sin la inscripción registral?', { sentido: 'infundado', jerarquia: 'principal', de: 'principal' }),
        crit('¿La condena excedió lo reclamado?', { recalificar: true, de: 'por_recalificar', por_que: 'tumbado' }),
        crit('¿Procedían las costas de segunda instancia?', { sentido: 'infundado', razonamiento: 'guardada',
                                                              de: 'recalificada', por_que: 'ya' }),
        crit('¿Se valoró la pericial?', { sentido: 'inoperante', razonamiento: 'cae', de: 'principal', por_que: 'presupone' }),
    ];
    const ids = recal.idsPorRecalificar(probs, criterios, 'p0', new Set());
    ok(ids.join() === 'p1,p2', 'se tumban el «por_recalificar» y el «recalificada» (la recalificada es de la premisa)');
    ok(recal.idsPorRecalificar(probs, criterios, 'p0', new Set(['p1'])).join() === 'p2', 'lo que él tocó no se tumba');
    ok(recal.idsPorRecalificar(probs, [crit('¿Procedía la acción sin la inscripción registral?', { recalificar: true })], 'p0', new Set()).length === 0,
       'el principal nunca se tumba');
    const tras = recal.aplicarReparto(probs, criterios, { excluir: 'p0', tocados: new Set(), pendientes: new Set(ids) });
    ok(tras[1].sentido === 'fundado' && tras[1].criterio === 'razón de la otra vía',
       'LA BASE DEL TUMBADO NO SE TOCA: viaja igual y el árbol vuelve a hallar los mismos pendientes');
    ok(tras[2].sentido === 'fundado' && tras[2].criterio === 'otra razón vieja',
       'ni la de una «recalificada» que trae el reparto: se pinta encima, no se escribe');
    ok(tras[3].sentido === 'inoperante' && tras[3].criterio === 'cae' && tras[3].de === 'principal' && tras[3].porQue === 'presupone',
       'el que no se tumba se escribe como siempre, con de y por qué');
    const conTocado = recal.aplicarReparto(probs, criterios, { excluir: 'p0', tocados: new Set(['p3']), pendientes: new Set() });
    ok(conTocado[3].sentido === 'infundado', 'lo que él marcó no se escribe');
    ok(recal.aplicarReparto(probs, [crit('¿Se valoró la pericial?', { sentido: 'raro' })], { excluir: 'p0', tocados: new Set(), pendientes: new Set() })[3].sentido === 'infundado',
       'un sentido fuera del catálogo no entra');
}

/* ═══ 4 · LA CLAVE DE LA PREMISA Y LO QUE SE PINTA ENCIMA ═══ */
const estado = (o) => ({ fase: 'listo', clave: '', respuesta: null, error: '', reintentar: () => {}, ...o });
{
    const probs = PROBS();
    const vivos = recal.pendientesVivos(probs, ['p1', 'p2', 'p0'], new Set(), 'p0');
    ok(vivos.map((p) => p.id).join() === 'p1,p2', 'vivos: sin el principal');
    ok(recal.pendientesVivos(probs, ['p1', 'p2'], new Set(['p2']), 'p0').map((p) => p.id).join() === 'p1', 'vivos: sin lo tocado');
    const sinBase = probs.map((p) => (p.id === 'p2' ? { ...p, sentido: undefined } : p));
    ok(recal.pendientesVivos(sinBase, ['p1', 'p2'], new Set(), 'p0').map((p) => p.id).join() === 'p1',
       'vivos: el que no viaja en el formulario (sin sentido) no se recalifica: lo califica él');
    const k1 = recal.claveRecalificacion(probs[0], vivos);
    ok(k1 && k1 === recal.claveRecalificacion(probs[0], [vivos[1], vivos[0]]), 'la clave no depende del orden de los tumbados');
    ok(k1 !== recal.claveRecalificacion({ ...probs[0], criterio: 'otra razón' }, vivos), 'otra razón, otra clave');
    ok(k1 !== recal.claveRecalificacion({ ...probs[0], criterio: ' ' }, vivos), 'la razón va TAL COMO VIAJA (un espacio es otra)');
    ok(k1 !== recal.claveRecalificacion({ ...probs[0], sentido: 'inoperante' }, vivos), 'otro sentido, otra clave');
    ok(k1 !== recal.claveRecalificacion(probs[0], [vivos[0]]), 'otros tumbados, otra clave');
    ok(recal.claveRecalificacion(probs[0], []) === '' && recal.claveRecalificacion({ ...probs[0], sentido: undefined }, vivos) === '',
       'sin tumbados o sin sentido del principal: nada que pedir');

    const resp = (criterios, e = 'listo') => ({ estado: e, clave: 'S', criterios, avisos: [] });
    let sup = recal.superposicion(vivos, estado({ clave: 'OTRA', respuesta: resp([]) }), k1);
    ok(sup.p1.estado === 'recalificando' && sup.p1.sentido === '' && sup.p2.estado === 'recalificando',
       'respuesta de OTRA premisa: no se pinta; tumbados, «recalificando»');
    sup = recal.superposicion(vivos, estado({ fase: 'pidiendo', clave: '' }), k1);
    ok(sup.p1.estado === 'recalificando', 'pidiendo: recalificando');
    sup = recal.superposicion(vivos, estado({ clave: k1, respuesta: resp([
        crit(vivos[0].pregunta, { sentido: 'infundado', razonamiento: 'nueva', de: 'recalificada',
                                  por_que: 'recalificada por el motor con tu premisa: no combate' }),
        crit(vivos[1].pregunta, { sentido: 'infundado', de: 'por_recalificar' }),
    ]) }), k1);
    ok(sup.p1.estado === 'recalificada' && sup.p1.sentido === 'infundado' && sup.p1.razon === 'nueva',
       'la de nuestra clave se pinta, con su razón');
    ok(sup.p2.estado === 'fallo', 'si la respuesta no la recalificó, sin calificar (no se inventa)');
    sup = recal.superposicion(vivos, estado({ clave: k1, respuesta: resp([
        crit(vivos[0].pregunta, { sentido: 'mucho', de: 'recalificada' })]) }), k1);
    ok(sup.p1.estado === 'fallo', 'un sentido recalificado fuera del catálogo no se pinta');
    sup = recal.superposicion(vivos, estado({ fase: 'fallo', clave: k1, respuesta: resp([], 'fallo'), error: 'dos intentos' }), k1);
    ok(sup.p1.estado === 'fallo' && sup.p2.estado === 'fallo', 'fallo: los dos sin calificar');
    sup = recal.superposicion(vivos, estado({ fase: 'error', clave: k1, error: 'Error 502' }), k1);
    ok(sup.p1.estado === 'error' && sup.p1.porQue === 'Error 502', 'error de red: se dice, con su motivo');
    sup = recal.superposicion(vivos, estado({ clave: k1, respuesta: resp([], 'sin_cambios') }), k1);
    ok(Object.keys(sup).length === 0, '«sin_cambios»: nada encima (la página lo aplica como reparto)');
    ok(recal.recalificacionEnCurso({ a: { estado: 'recalificada' } }, false) === false
       && recal.recalificacionEnCurso({ a: { estado: 'recalificando' } }, false) === true
       && recal.recalificacionEnCurso({}, true) === true, 'en curso: recalificando, o el reparto en camino');
    ok(recal.porQueLegible('recalificada por el motor con tu premisa: no combate P2') === 'no combate P2'
       && recal.porQueLegible('otra cosa') === 'otra cosa', 'el porqué sin la fórmula que la marca ya dice');
    ok(/^Sin calificar: califícalo tú; si no, el estudio lo desarrollará con el material y lo pondrá primero en ADVERTENCIAS\.$/
       .test(recal.MENSAJE_SIN_CALIFICAR), 'el mensaje del fallo es el del contrato');
}

/* ═══ 4-bis · LO QUE EL SERVIDOR DEVUELVE DE VERDAD (revisión adversarial) ═══
   Con la forma exacta de main.py (`_taller_recalificar_para` y
   `_taller_criterios_pantalla`): un «fallo» puede traer recalificados los que
   pasaron la validación, el tumbado pendiente trae el porqué «se recalifica
   con tu premisa», y el texto del problema llega recortado a 400. */
{
    const probs = PROBS();
    const vivos = recal.pendientesVivos(probs, ['p1', 'p2'], new Set(), 'p0');
    const k = recal.claveRecalificacion(probs[0], vivos);
    const PENDIENTE = 'con el principal infundado —la vía contraria a la que propuso el motor— la calificación '
        + 'que traía se escribió para la otra vía y no se usa: se recalifica con tu premisa';
    const parcial = { estado: 'fallo', clave: 'srv', avisos: ['la recalificación no pasó la validación dos veces'], criterios: [
        crit(vivos[0].pregunta, { sentido: 'infundado', razonamiento: 'pasó la validación', de: 'recalificada',
                                  por_que: 'recalificada por el motor con tu premisa: pasó' }),
        crit(vivos[1].pregunta, { de: 'por_recalificar', recalificar: true, por_que: PENDIENTE }),
    ] };
    let sup = recal.superposicion(vivos, estado({ fase: 'fallo', clave: k, respuesta: parcial }), k);
    ok(sup.p1.estado === 'recalificada' && sup.p1.sentido === 'infundado' && sup.p1.razon === 'pasó la validación',
       '«fallo» PARCIAL: el que pasó la validación se enseña recalificado (el servidor lo aplica al generar)');
    ok(sup.p2.estado === 'fallo' && sup.p2.sentido === '', '«fallo» parcial: el que no pasó, sin calificar');
    ok(!/se recalifica con tu premisa/.test(sup.p2.porQue),
       'el «sin calificar» no lleva el porqué del pendiente («se recalifica…»), que lo contradice');

    // EL TEXTO RECORTADO A 400 (puntos de código, como Python).
    const largo = '¿La autoridad responsable valoró indebidamente la prueba pericial en materia de avalúo '
        + 'y omitió pronunciarse sobre la objeción planteada en tiempo por la parte actora, '.repeat(5) + '?';
    const corte = Array.from(largo).slice(0, 400).join('');
    ok(Array.from(largo).length > 400 && corte !== largo, '(datos: el problema pasa de 400)');
    const probsL = probs.map((p) => (p.id === 'p1' ? { ...p, pregunta: largo } : p));
    const vivosL = recal.pendientesVivos(probsL, ['p1', 'p2'], new Set(), 'p0');
    const kL = recal.claveRecalificacion(probsL[0], vivosL);
    sup = recal.superposicion(vivosL, estado({ clave: kL, respuesta: { estado: 'listo', clave: 'srv', avisos: [], criterios: [
        crit(corte, { sentido: 'inoperante', razonamiento: 'r', de: 'recalificada', por_que: 'p' }),
        crit(vivosL[1].pregunta, { sentido: 'infundado', razonamiento: 'r2', de: 'recalificada', por_que: 'p' }),
    ] } }), kL);
    ok(sup.p1.estado === 'recalificada' && sup.p1.sentido === 'inoperante',
       'un problema de más de 400 caracteres, recortado por el servidor, se encuentra y se pinta recalificado');
    ok(recal.idsPorRecalificar(probsL, [crit(corte, { recalificar: true, de: 'por_recalificar' })], 'p0', new Set()).join() === 'p1',
       'y el recortado se tumba');
    ok(recal.aplicarReparto(probsL, [crit(corte, { sentido: 'inoperante', de: 'principal', por_que: 'x' })],
        { excluir: 'p0', tocados: new Set(), pendientes: new Set() })[1].sentido === 'inoperante',
       'y el «sin cambios» recortado se aplica');
    const emoji = '😀' + 'a'.repeat(450);
    ok(recal.mismoProblema('😀' + 'a'.repeat(399), emoji) && !recal.mismoProblema('😀' + 'a'.repeat(398), emoji),
       'el corte se cuenta en puntos de código, como Python');
    ok(!recal.mismoProblema(corte.slice(0, 399), largo) && !recal.mismoProblema('¿La condena excedió', '¿La condena excedió lo reclamado?')
       && !recal.mismoProblema('', 'x'), 'un prefijo que no es el corte de 400 no es el mismo problema');

    // LA FIRMA DEL PLAN: sin tumbados, la de siempre; con ellos, cambia al llegar.
    ok(recal.firmaConRecalificacion('F', [], {}) === 'F' && recal.firmaConRecalificacion('', vivos, {}) === '',
       'firma del plan: sin tumbados (o sin plan), la de siempre');
    const f1 = recal.firmaConRecalificacion('F', vivos, { p1: { estado: 'recalificando', sentido: '' }, p2: { estado: 'recalificando', sentido: '' } });
    const f2 = recal.firmaConRecalificacion('F', vivos, { p1: { estado: 'recalificada', sentido: 'infundado' }, p2: { estado: 'recalificando', sentido: '' } });
    const f3 = recal.firmaConRecalificacion('F', vivos, { p1: { estado: 'recalificada', sentido: 'inoperante' }, p2: { estado: 'recalificando', sentido: '' } });
    ok(f1 !== 'F' && f1 !== f2 && f2 !== f3, 'firma del plan: cambia cuando llega lo recalificado, y con otra calificación');
    ok(f2 === recal.firmaConRecalificacion('F', [vivos[1], vivos[0]], { p2: { estado: 'recalificando', sentido: '' }, p1: { estado: 'recalificada', sentido: 'infundado' } }),
       'firma del plan: no depende del orden');
}

/* ═══ 5 · EL HOOK: ANTIRREBOTE, CLAVES Y FALLOS ═══ */
const reloj = { ahora: 1_000_000, timers: [], sig: 1 };
const DateNowReal = Date.now;
Date.now = () => reloj.ahora;
const setTimeoutReal = globalThis.setTimeout, clearTimeoutReal = globalThis.clearTimeout;
globalThis.setTimeout = (fn, ms = 0) => {
    const id = reloj.sig++;
    reloj.timers.push({ id, cuando: reloj.ahora + Math.max(0, ms), fn });
    return id;
};
globalThis.clearTimeout = (id) => { reloj.timers = reloj.timers.filter((t) => t.id !== id); };

function montar(componente, props) {
    let salida;
    const pintar = () => {
        let vueltas = 0;
        do {
            Rf.__R.sucio = false; Rf.__R.i = 0;
            salida = componente(props);
            Rf.__R.efectos.splice(0).forEach((f) => f());
        } while (Rf.__R.sucio && ++vueltas < 20);
        return salida;
    };
    pintar();
    return {
        get: () => salida,
        async cambiar(p) { Object.assign(props, p); pintar(); await vaciar(); pintar(); },
        async avanzar(ms) {
            // Lo que una respuesta recién soltada programe entra en esta vuelta.
            await vaciar(); pintar();
            const fin = reloj.ahora + ms;
            for (;;) {
                reloj.timers.sort((a, b) => a.cuando - b.cuando);
                const t = reloj.timers[0];
                if (!t || t.cuando > fin) break;
                reloj.timers.shift();
                reloj.ahora = t.cuando;
                void Promise.resolve(t.fn()).catch(() => {});
                await vaciar(); pintar();
            }
            reloj.ahora = fin;
            await vaciar(); pintar();
        },
    };
}
function reiniciar() { Rf.desmontar(); reloj.timers = []; }
/* El componente: el hook y lo que la página calcula con él. */
const conRecal = (pr) => {
    const r = recal.useRecalificacion(pr.enlace, pr.listo);
    const sup = recal.superposicion(pr.vivos, r, pr.enlace.clave);
    return { r, sup, enCurso: recal.recalificacionEnCurso(sup, !!pr.repartiendo) };
};
const VIVOS = () => PROBS().filter((p) => p.id === 'p1' || p.id === 'p2');
const listoPara = (vivos, sentido = 'infundado') => ({ estado: 'listo', clave: 'srv', avisos: [],
    criterios: vivos.map((p) => crit(p.pregunta, { sentido, razonamiento: `r ${p.id}`, de: 'recalificada', por_que: 'p' })) });
/* Un servidor falso que cuenta, recuerda la señal y contesta cuando se le dice. */
function servidor() {
    const s = { pedidos: [], pendientes: [] };
    s.pedir = (signal) => new Promise((res, rej) => {
        const p = { signal, res, rej, clave: s.enlace?.clave };
        s.pedidos.push(p); s.pendientes.push(p);
        signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    s.contestar = (r, k = 0) => { const p = s.pendientes.splice(k, 1)[0]; p.res(r); };
    return s;
}

{   // 5.1 apagado o sin clave: ni se pide ni se pinta encima
    reiniciar();
    const s = servidor();
    const h = montar(conRecal, { enlace: s.enlace = { activo: false, clave: 'K', inmediato: true, pedir: s.pedir }, listo: true, vivos: VIVOS() });
    await h.avanzar(30_000);
    ok(s.pedidos.length === 0 && h.get().r.fase === 'inactivo', 'apagado: no se pide');
}
{   // 5.2 ANTIRREBOTE: 3 s tras la última tecla de la razón; una sola llamada
    reiniciar();
    const s = servidor();
    const enlace = s.enlace = { activo: true, clave: 'K|a', inmediato: false, pedir: s.pedir };
    const h = montar(conRecal, { enlace, listo: true, vivos: VIVOS() });
    ok(h.get().r.fase === 'esperando' && h.get().sup.p1.estado === 'recalificando', 'recién tumbados: «recalificando», en espera');
    await h.avanzar(2_900);
    ok(s.pedidos.length === 0, 'antes de 3 s no se pide');
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'K|ab' }) });
    await h.avanzar(2_000);
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'K|abc' }) });
    await h.avanzar(2_900);
    ok(s.pedidos.length === 0, 'cada tecla reinicia la cuenta');
    await h.avanzar(200);
    ok(s.pedidos.length === 1 && s.pedidos[0].clave === 'K|abc', 'a los 3 s de quietud, UNA llamada con la última razón');
    ok(h.get().r.fase === 'pidiendo' && h.get().enCurso, 'pidiendo: en curso');
    s.contestar(listoPara(VIVOS()));
    await h.avanzar(10);
    ok(h.get().r.fase === 'listo' && h.get().sup.p1.estado === 'recalificada' && h.get().sup.p1.sentido === 'infundado',
       'llega y se pinta «recalificado»');
    ok(!h.get().enCurso, 'ya no está en curso');
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'K|abc' }) });
    await h.avanzar(20_000);
    ok(s.pedidos.length === 1, 'la misma premisa no se pide dos veces');
}
{   // 5.3 ENSEGUIDA si eligió sentido y no hay razón
    reiniciar();
    const s = servidor();
    const h = montar(conRecal, { enlace: s.enlace = { activo: true, clave: 'K|', inmediato: true, pedir: s.pedir }, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    ok(s.pedidos.length === 1, 'sin razón: se pide enseguida, sin los 3 s');
}
{   // 5.4 MIENTRAS SE REDACTA LA RAZÓN DEL PRINCIPAL no se pide; al llegar, 3 s
    reiniciar();
    const s = servidor();
    const enlace = s.enlace = { activo: true, clave: 'K|', inmediato: true, pedir: s.pedir };
    const h = montar(conRecal, { enlace, listo: false, vivos: VIVOS() });
    await h.avanzar(30_000);
    ok(s.pedidos.length === 0 && h.get().sup.p1.estado === 'recalificando', 'redactando la razón: espera sin pedir (y lo dice)');
    await h.cambiar({ listo: true, enlace: Object.assign(enlace, { clave: 'K|la razón del motor', inmediato: false }) });
    await h.avanzar(2_900);
    ok(s.pedidos.length === 0, 'llegó la razón: antirrebote');
    await h.avanzar(200);
    ok(s.pedidos.length === 1 && s.pedidos[0].clave === 'K|la razón del motor', 'se pide con la razón que llegó, no con la vacía');
}
{   // 5.5 CLAVE VIEJA: se cancela y, si llega tarde, se ignora
    reiniciar();
    const s = servidor();
    const enlace = s.enlace = { activo: true, clave: 'A', inmediato: true, pedir: s.pedir };
    const h = montar(conRecal, { enlace, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    ok(s.pedidos.length === 1, 'A en camino');
    const a = s.pedidos[0];
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'B', inmediato: false }) });
    ok(a.signal.aborted, 'al cambiar la premisa, la petición de A se CANCELA');
    ok(h.get().sup.p1.estado === 'recalificando', 'y lo de A no se pinta');
    // Aunque el servidor contestara igual (la respuesta ya iba en camino):
    a.res(listoPara(VIVOS(), 'fundado'));
    await h.avanzar(10);
    ok(h.get().r.fase === 'esperando' && h.get().sup.p1.estado === 'recalificando',
       'A llegó tarde y NO se pinta encima de B');
    await h.avanzar(3_100);
    ok(s.pedidos.length === 2 && s.pedidos[1].clave === 'B', 'B se pide tras su antirrebote');
    s.contestar(listoPara(VIVOS(), 'inoperante'), s.pendientes.indexOf(s.pedidos[1]));
    await h.avanzar(10);
    ok(h.get().sup.p1.sentido === 'inoperante', 'se pinta B');
}
{   // 5.5-bis LA RESPUESTA VIEJA QUE LLEGA DESPUÉS DE LA NUEVA. Una petición
    // puede no enterarse de que se canceló (la respuesta ya venía en camino):
    // si llega después de la de la premisa nueva, no puede borrarla.
    reiniciar();
    const s = servidor();
    const sordas = [];
    const enlace = s.enlace = { activo: true, clave: 'A', inmediato: true,
                                pedir: () => new Promise((res) => { sordas.push({ res, clave: enlace.clave }); }) };
    const h = montar(conRecal, { enlace, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'B' }) });
    await h.avanzar(1);
    ok(sordas.length === 2 && sordas[1].clave === 'B', 'B pedida (A no se enteró de la cancelación)');
    sordas[1].res(listoPara(VIVOS(), 'inoperante'));
    await h.avanzar(10);
    ok(h.get().sup.p1.sentido === 'inoperante', 'B pintada');
    sordas[0].res(listoPara(VIVOS(), 'fundado'));
    await h.avanzar(10);
    ok(h.get().r.fase === 'listo' && h.get().sup.p1.sentido === 'inoperante',
       'A llega DESPUÉS de B y no la borra ni la deja «recalificando» para siempre');
}
{   // 5.5-ter LA MISMA PREMISA NO SE PIDE DOS VECES, aunque algo la detenga y
    // la suelte (se generó, se redactó la razón de otro) o se vaya y vuelva.
    reiniciar();
    const s = servidor();
    const enlace = s.enlace = { activo: true, clave: 'M', inmediato: true, pedir: s.pedir };
    const h = montar(conRecal, { enlace, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    s.contestar(listoPara(VIVOS()));
    await h.avanzar(10);
    await h.cambiar({ listo: false });
    await h.cambiar({ listo: true });
    await h.avanzar(10_000);
    ok(s.pedidos.length === 1, 'detenida y soltada: no se vuelve a pedir lo que ya llegó');
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'M2', inmediato: false }) });
    await h.avanzar(1_000);
    await h.cambiar({ enlace: Object.assign(enlace, { clave: 'M' }) });
    await h.avanzar(10_000);
    ok(s.pedidos.length === 1 && h.get().sup.p1.estado === 'recalificada',
       'una tecla y su borrado dentro del antirrebote: ni llamada ni rueda');
}
{   // 5.6 FALLO: se dice y no se reintenta solo
    reiniciar();
    const s = servidor();
    const h = montar(conRecal, { enlace: s.enlace = { activo: true, clave: 'F', inmediato: true, pedir: s.pedir }, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    s.contestar({ estado: 'fallo', clave: 'srv', criterios: [], avisos: ['no salió en dos intentos'] });
    await h.avanzar(10);
    ok(h.get().r.fase === 'fallo' && h.get().sup.p1.estado === 'fallo' && h.get().sup.p2.estado === 'fallo',
       'fallo: sin calificar');
    ok(!h.get().enCurso, 'un fallo no deja el plan esperando');
    await h.avanzar(120_000);
    ok(s.pedidos.length === 1, 'no se reintenta solo (cada intento es una llamada al modelo)');
    // A mano, sí: el servidor devuelve al momento el fallo de validación y
    // rehace el que cortó el proveedor.
    h.get().r.reintentar();
    await h.avanzar(1);
    ok(s.pedidos.length === 2, 'tras un fallo, «volver a intentar» pide otra vez, enseguida');
    // 5.6-bis EL «FALLO» PARCIAL, por el hook: lo que pasó la validación se pinta.
    s.contestar({ estado: 'fallo', clave: 'srv', avisos: ['el 2 no pasó'], criterios: [
        crit(VIVOS()[0].pregunta, { sentido: 'inoperante', razonamiento: 'r', de: 'recalificada', por_que: 'p' }),
        crit(VIVOS()[1].pregunta, { de: 'por_recalificar', recalificar: true, por_que: 'se recalifica con tu premisa' })] });
    await h.avanzar(10);
    ok(h.get().r.fase === 'fallo' && h.get().sup.p1.estado === 'recalificada' && h.get().sup.p1.sentido === 'inoperante'
       && h.get().sup.p2.estado === 'fallo' && h.get().sup.p2.porQue === '',
       '«fallo» parcial por el hook: el recalificado se pinta; el otro, sin calificar y sin el porqué contradictorio');
}
{   // 5.7 EN CURSO: se vuelve a preguntar, pocas veces, y después se dice
    reiniciar();
    const s = servidor();
    const h = montar(conRecal, { enlace: s.enlace = { activo: true, clave: 'C', inmediato: true, pedir: s.pedir }, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    const enCurso = { estado: 'en_curso', clave: 'srv', criterios: [], avisos: [] };
    s.contestar(enCurso);
    await h.avanzar(3_100);
    ok(s.pedidos.length === 2 && h.get().r.fase === 'pidiendo', 'en curso: se pregunta otra vez tras la pausa');
    s.contestar(enCurso);
    await h.avanzar(3_100);
    s.contestar(enCurso);
    await h.avanzar(10);
    ok(s.pedidos.length === 3 && h.get().r.fase === 'fallo' && /sigue recalificándolo/.test(h.get().r.error),
       `tras ${recal.REINTENTOS_EN_CURSO} reintentos deja de esperar y lo dice`);
    await h.avanzar(60_000);
    ok(s.pedidos.length === 3, 'y no sigue preguntando');
}
{   // 5.8 ERROR DE RED: se dice; «volver a intentar» pide otra vez, enseguida
    reiniciar();
    const s = servidor();
    const h = montar(conRecal, { enlace: s.enlace = { activo: true, clave: 'E', inmediato: false, pedir: s.pedir }, listo: true, vivos: VIVOS() });
    await h.avanzar(3_100);
    s.pendientes.shift().rej(new Error('Error 502'));
    await h.avanzar(10);
    ok(h.get().r.fase === 'error' && h.get().sup.p1.estado === 'error' && h.get().sup.p1.porQue === 'Error 502', 'error con su motivo');
    await h.avanzar(60_000);
    ok(s.pedidos.length === 1, 'no se reintenta en bucle');
    h.get().r.reintentar();
    await h.avanzar(1);
    ok(s.pedidos.length === 2 && h.get().r.fase === 'pidiendo', 'reintentar: la misma premisa, enseguida');
}
{   // 5.9 EL SERVIDOR NO CONTESTA: a los 120 s se corta y se dice
    reiniciar();
    const s = servidor();
    const h = montar(conRecal, { enlace: s.enlace = { activo: true, clave: 'T', inmediato: true, pedir: s.pedir }, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    await h.avanzar(119_000);
    ok(h.get().r.fase === 'pidiendo', 'a los 119 s sigue esperando');
    await h.avanzar(2_000);
    ok(s.pedidos[0].signal.aborted && h.get().r.fase === 'error' && /dos minutos/.test(h.get().r.error),
       'a los 120 s se corta: error, no una rueda eterna');
}
{   // 5.10 APAGAR con algo en camino (el principal volvió a la vía del motor)
    reiniciar();
    const s = servidor();
    const enlace = s.enlace = { activo: true, clave: 'V', inmediato: true, pedir: s.pedir };
    const h = montar(conRecal, { enlace, listo: true, vivos: VIVOS() });
    await h.avanzar(1);
    await h.cambiar({ enlace: Object.assign(enlace, { activo: false, clave: '' }), vivos: [] });
    ok(s.pedidos[0].signal.aborted && h.get().r.fase === 'inactivo' && Object.keys(h.get().sup).length === 0,
       'sin tumbados: se cancela lo que iba y no queda nada encima');
}

/* ═══ 6 · PISAR = TOCADO ═══
   La página saca de los vivos lo que él marcó; la clave cambia (otros
   pendientes) y lo recalificado de antes ya no se le pinta encima. */
{
    reiniciar();
    const s = servidor();
    const probs = PROBS();
    let tocados = new Set();
    const vivos = () => recal.pendientesVivos(probs, ['p1', 'p2'], tocados, 'p0');
    const enlace = s.enlace = { activo: true, clave: recal.claveRecalificacion(probs[0], vivos()), inmediato: false, pedir: s.pedir };
    const h = montar(conRecal, { enlace, listo: true, vivos: vivos() });
    await h.avanzar(3_100);
    s.contestar(listoPara(vivos()));
    await h.avanzar(10);
    ok(h.get().sup.p1.estado === 'recalificada', 'p1 recalificado');
    // Él pisa p1 con una pastilla: queda tocado.
    tocados = new Set(['p1']);
    await h.cambiar({ vivos: vivos(), enlace: Object.assign(enlace, { clave: recal.claveRecalificacion(probs[0], vivos()) }) });
    ok(!('p1' in h.get().sup), 'lo que él pisó ya no lleva nada encima: manda su marca');
    ok(h.get().sup.p2.estado === 'recalificando', 'los demás, con la premisa nueva (otros pendientes), se recalifican');
    await h.avanzar(3_100);
    ok(s.pedidos.length === 2 && !JSON.parse(s.pedidos[1].clave)[3].includes(probs[1].pregunta),
       'la llamada nueva ya no lleva a p1 entre los pendientes');
    s.contestar(listoPara(PROBS().filter((p) => p.id !== 'p0'), 'fundado'));
    await h.avanzar(10);
    ok(!('p1' in h.get().sup) && h.get().sup.p2.estado === 'recalificada',
       'aunque la respuesta traiga a p1, no se le pinta encima');
    // Y aplicarReparto tampoco escribe sobre lo tocado.
    const tras = recal.aplicarReparto(probs.map((p) => (p.id === 'p1' ? { ...p, sentido: 'inoperante' } : p)),
        [crit(probs[1].pregunta, { sentido: 'fundado', de: 'principal' })],
        { excluir: 'p0', tocados, pendientes: new Set() });
    ok(tras[1].sentido === 'inoperante', 'un reparto posterior no pisa lo que él pisó');
}

/* ═══ 7 · EL PLAN ESPERA A LA RECALIFICACIÓN ═══
   El mismo cableado que Decision: listo del plan = decisión lista y NADA en
   recalificación (se comprueba en la 8 que Decision lo hace así). */
{
    reiniciar();
    const s = servidor();
    const planes = [];
    const enlacePlan = { activo: true, firma: 'F1',
                         pedir: async () => { planes.push(reloj.ahora); return { estado: 'listo', clave: 'KP', avisos: [], corridas: 1, tope: 4,
                             plan: api.planDe({ clave: 'KP', segmentos: [] }) }; },
                         leer: async () => { throw new Error('no debe leer'); } };
    // Como la página: la firma del plan lleva el estado de los tumbados.
    const conPlan = (pr) => {
        const o = conRecal(pr);
        const plan = como.usePlanDelEstudio(
            { ...pr.enlacePlan, firma: recal.firmaConRecalificacion(pr.enlacePlan.firma, pr.vivos, o.sup) },
            pr.listoPlan && !o.enCurso);
        return { ...o, plan };
    };
    // Como la página: con el reparto en camino el enlace está apagado.
    const enlace = s.enlace = { activo: false, clave: 'R', inmediato: false, pedir: s.pedir };
    const h = montar(conPlan, { enlace, listo: true, vivos: VIVOS(), enlacePlan, listoPlan: true, repartiendo: true });
    await h.avanzar(20_000);
    ok(planes.length === 0 && s.pedidos.length === 0, 'con el reparto en camino no se pide ni plan ni recalificación');
    await h.cambiar({ repartiendo: false, enlace: Object.assign(enlace, { activo: true }) });
    await h.avanzar(3_100);
    ok(s.pedidos.length === 1, 'contestó el reparto: se recalifica');
    await h.avanzar(60_000);
    ok(planes.length === 0 && h.get().plan.fase === 'esperando', 'recalificando: el plan NO se pide (espera)');
    s.contestar(listoPara(VIVOS()));
    await h.avanzar(10);
    const llego = reloj.ahora;
    await h.avanzar(2_100);
    ok(planes.length === 1 && planes[0] >= llego, 'recalificado: el plan se pide una vez, DESPUÉS');
    await h.avanzar(30_000);
    ok(planes.length === 1, 'y sólo una');
}
{   // 7-bis (revisión adversarial) EL PLAN SE VUELVE A PEDIR CUANDO LA
    // RECALIFICACIÓN LLEGA TARDE. Tras un error de red el plan se pide y el
    // servidor contesta «sin plan: hay accesorios recalificándose»; «volver a
    // intentar» trae la recalificación, pero el formulario no cambia (la base
    // no se toca): sin el estado de los tumbados en la firma, el plan no se
    // volvía a pedir nunca.
    reiniciar();
    const s = servidor();
    const planes = [];
    const enlacePlan = { activo: true, firma: 'F1',
                         pedir: async () => { planes.push(reloj.ahora);
                             return { estado: 'sin_plan', clave: '', corridas: 0, tope: 4, plan: null,
                                      avisos: ['hay accesorios recalificándose con tu premisa; el plan se pide cuando terminen'] }; },
                         leer: async () => { throw new Error('no debe leer'); } };
    const conPlan = (pr) => {
        const o = conRecal(pr);
        const plan = como.usePlanDelEstudio(
            { ...pr.enlacePlan, firma: recal.firmaConRecalificacion(pr.enlacePlan.firma, pr.vivos, o.sup) },
            pr.listoPlan && !o.enCurso);
        return { ...o, plan };
    };
    const h = montar(conPlan, { enlace: s.enlace = { activo: true, clave: 'R', inmediato: true, pedir: s.pedir },
                                listo: true, vivos: VIVOS(), enlacePlan, listoPlan: true });
    await h.avanzar(1);
    s.pendientes.shift().rej(new Error('Error 502'));
    await h.avanzar(20_000);
    ok(planes.length === 1 && h.get().sup.p1.estado === 'error', 'error de red: el plan se pide y el servidor dice que espera');
    h.get().r.reintentar();
    await h.avanzar(1);
    s.contestar(listoPara(VIVOS()));
    await h.avanzar(20_000);
    ok(h.get().sup.p1.estado === 'recalificada' && planes.length === 2,
       'llegó la recalificación tras «volver a intentar»: el plan se pide OTRA vez, con lo recalificado');
    await h.avanzar(60_000);
    ok(planes.length === 2, 'y sólo una vez más');
}

Date.now = DateNowReal;
globalThis.setTimeout = setTimeoutReal;
globalThis.clearTimeout = clearTimeoutReal;

/* ═══ 8 · LA PANTALLA DE DECISIÓN, PINTADA ═══
   Decision.tsx real, con el React falso: se arma el árbol, se lee su texto y
   se pulsan sus botones. */
function expandir(n) {
    if (n === null || n === undefined || n === false || n === true) return null;
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(expandir);
    if (n.type === Rf.Fragment) return n.props.children.map(expandir);
    if (typeof n.type === 'function') return expandir(n.type({ ...n.props }));
    return { type: n.type, props: n.props, hijos: n.props.children.map(expandir) };
}
function texto(t) {
    if (t === null) return '';
    if (typeof t === 'string') return t;
    if (Array.isArray(t)) return t.map(texto).join('');
    return t.hijos.map(texto).join('');
}
function buscar(t, pred, out = []) {
    if (!t || typeof t === 'string') return out;
    if (Array.isArray(t)) { t.forEach((x) => buscar(x, pred, out)); return out; }
    if (pred(t)) out.push(t);
    t.hijos.forEach((x) => buscar(x, pred, out));
    return out;
}
function pintarDecision(props) {
    Rf.desmontar();
    globalThis.__listoPlan.length = 0;
    let arbol;
    let vueltas = 0;
    do {
        Rf.__R.sucio = false; Rf.__R.i = 0;
        arbol = expandir(Rf.createElement(Decision, props));
        Rf.__R.efectos.splice(0).forEach((f) => f());
    } while (Rf.__R.sucio && ++vueltas < 10);
    return arbol;
}
const llamadas = [];
const baseDecision = (o = {}) => ({
    problemas: PROBS(), modo: 'por_problema', generando: false, proponiendo: false,
    onCambiar: (...a) => llamadas.push(['cambiar', ...a]),
    onRazonar: (...a) => llamadas.push(['razonar', ...a]),
    onGenerar: () => {},
    propuesta: { propuestas: PROBS().map((p) => ({ problema: p.pregunta, sentido: p.sentido, razon: '', apoyos: [],
                                                     confianza: 'media', alcanza: true })),
                 global: null, resumen: '', avisos: [], criteriosJson: '', modelo: '', necesitaConceptos: false },
    tocados: new Set(['p0']), razonando: new Set(), abrirCorreccion: 1,
    plan: { activo: true, firma: 'F', pedir: async () => ({}), leer: async () => ({}) },
    recalificadas: {}, recalificacionEnCurso: false, avisosRecalificacion: [],
    ...o,
});
const tarjetaDe = (arbol, id) => buscar(arbol, (n) => n.type === 'div' && n.props.key === id)[0];
const pastillaPulsada = (t) => buscar(t, (n) => n.type === 'button' && n.props['aria-pressed'] === true).map(texto);
{
    // 8.1 el plan: Decision lo espera mientras hay recalificación en curso
    pintarDecision(baseDecision({ recalificacionEnCurso: false }));
    ok(globalThis.__listoPlan.at(-1) === true, 'decisión completa y sin recalificación: el plan puede pedirse');
    const a = pintarDecision(baseDecision({ recalificacionEnCurso: true,
        recalificadas: { p1: { estado: 'recalificando', sentido: '', razon: '', porQue: '' } } }));
    ok(globalThis.__listoPlan.length > 0 && globalThis.__listoPlan.every((x) => x === false),
       'con recalificación en curso Decision NO deja pedir el plan');
    ok(/se ordena en cuanto terminen de recalificarse/.test(texto(a)), 'y la tarjeta final dice por qué espera');

    // 8.2 recalificando
    const t1 = tarjetaDe(a, 'p1');
    ok(t1 && /Recalificando con tu premisa…/.test(texto(t1)), '«Recalificando con tu premisa…» en el accesorio');
    ok(pastillaPulsada(t1).length === 0, 'la calificación de la otra vía (fundado) NO se enseña marcada');
    ok(buscar(t1, (n) => n.type === 'textarea').length === 0, 'ni su razón vieja');
    ok(/se está recalificando/.test(texto(a)) && /terminará esa recalificación antes de escribir/.test(texto(a)),
       'el formulario no sale con un «Recalificando…» sin avisarlo');
    const fila = buscar(a, (n) => n.type === 'li' && n.props.key === 'p1')[0];
    ok(fila && /por recalificar/.test(texto(fila)) && /recalificando…/.test(texto(fila)) && !/Fundado/.test(texto(fila)),
       'la tarjeta final no dice «Fundado» del tumbado: dice que se recalifica');
    // pisar con una pastilla
    llamadas.length = 0;
    buscar(t1, (n) => n.type === 'button' && texto(n) === 'Inoperante')[0].props.onClick();
    ok(JSON.stringify(llamadas) === JSON.stringify([['cambiar', 'p1', 'sentido', 'inoperante'],
                                                    ['razonar', 'p1', PROBS()[1].pregunta, 'inoperante']]),
       'PISAR: la pastilla lo marca como suyo (tocado) y pide su razón');

    // 8.3 recalificado
    const b = pintarDecision(baseDecision({ recalificadas: { p1: { estado: 'recalificada', sentido: 'infundado',
        razon: 'La condena se ciñó a lo pactado.', porQue: 'recalificada por el motor con tu premisa: no combate la razón toral' } } }));
    const t2 = tarjetaDe(b, 'p1');
    ok(/Recalificado con tu premisa/.test(texto(t2)) && /· no combate la razón toral/.test(texto(t2))
       && !/motor con tu premisa: no combate/.test(texto(t2)), 'la marca «recalificado con tu premisa» y su porqué, sin repetir');
    ok(pastillaPulsada(t2).join() === 'Infundado', 'se enseña marcada la recalificada');
    const area = buscar(t2, (n) => n.type === 'textarea')[0];
    ok(area && area.props.value === 'La condena se ciñó a lo pactado.', 'con su razón');
    llamadas.length = 0;
    area.props.onChange({ target: { value: 'La condena se ciñó a lo pactado, y más.' } });
    ok(JSON.stringify(llamadas) === JSON.stringify([['cambiar', 'p1', 'sentido', 'infundado'],
                                                    ['cambiar', 'p1', 'criterio', 'La condena se ciñó a lo pactado, y más.']]),
       'corregir su razón la hace TUYA: esa calificación queda marcada (tocado) con tu texto');
    const fila2 = buscar(b, (n) => n.type === 'li' && n.props.key === 'p1')[0];
    ok(/Infundado/.test(texto(fila2)) && /recalificado con tu premisa/.test(texto(fila2)), 'la tarjeta final lleva la recalificada');
    ok(!/se está recalificando/.test(texto(b)), 'sin nada en curso no hay aviso');

    // 8.4 fallo
    const c = pintarDecision(baseDecision({ recalificadas: { p1: { estado: 'fallo', sentido: '', razon: '', porQue: '' } },
                                            avisosRecalificacion: ['El motor no pudo recalificar en dos intentos.'] }));
    const t3 = tarjetaDe(c, 'p1');
    ok(texto(t3).includes(recal.MENSAJE_SIN_CALIFICAR), 'fallo: «sin calificar: califícalo tú; si no, …ADVERTENCIAS»');
    ok(buscar(t3, (n) => n.type === 'textarea').length === 0 && pastillaPulsada(t3).length === 0, 'sin calificación ni razón vieja');
    ok(/quedó sin calificar/.test(texto(c)) && /primero en ADVERTENCIAS/.test(texto(c)), 'y la tarjeta final lo dice');
    ok(/El motor no pudo recalificar en dos intentos/.test(texto(c)), 'los avisos de la recalificación se enseñan');
    const fila3 = buscar(c, (n) => n.type === 'li' && n.props.key === 'p1')[0];
    ok(/sin calificar/.test(texto(fila3)) && !/Fundado/.test(texto(fila3)), 'tarjeta final: sin calificar');

    // 8.5 error de red, con «volver a intentar»
    let reintentos = 0;
    const d = pintarDecision(baseDecision({ recalificadas: { p1: { estado: 'error', sentido: '', razon: '', porQue: 'Error 502' } },
                                            onReintentarRecalificacion: () => { reintentos += 1; } }));
    const t4 = tarjetaDe(d, 'p1');
    ok(/No se pudo recalificar desde aquí \(Error 502\)/.test(texto(t4)) && texto(t4).includes(recal.MENSAJE_SIN_CALIFICAR),
       'error: se dice el motivo y qué pasará');
    const boton = buscar(t4, (n) => n.type === 'button' && texto(n) === 'volver a intentar')[0];
    ok(!!boton, 'tras un error de red se ofrece «volver a intentar»');
    if (boton) boton.props.onClick();
    ok(reintentos === 1, '«volver a intentar» llama a reintentar');
    // 8.5-bis y tras un «fallo» del servidor también (revisión adversarial)
    const d2 = pintarDecision(baseDecision({ recalificadas: { p1: { estado: 'fallo', sentido: '', razon: '', porQue: '' } },
                                             onReintentarRecalificacion: () => { reintentos += 1; } }));
    const boton2 = buscar(tarjetaDe(d2, 'p1'), (n) => n.type === 'button' && texto(n) === 'volver a intentar')[0];
    ok(!!boton2, 'tras un «fallo» también se ofrece «volver a intentar»');
    if (boton2) boton2.props.onClick();
    ok(reintentos === 2, 'y llama a reintentar');

    // 8.6 sin tumbados, la pantalla de siempre
    const e = pintarDecision(baseDecision());
    const t5 = tarjetaDe(e, 'p1');
    ok(!/Recalific/.test(texto(e)), 'sin tumbados no hay ninguna marca de recalificación');
    ok(pastillaPulsada(t5).join() === 'Fundado' && buscar(t5, (n) => n.type === 'textarea')[0].props.value === 'razón de la otra vía',
       'y cada accesorio enseña lo suyo');
}

/* ═══ 9 · EL CABLEADO DE page.tsx, LEÍDO EN SU FUENTE (revisión adversarial) ═══
   La página no se monta sin Next. Lo que la revisión arregló en ella se fija
   aquí, en su fuente, para que no vuelva en silencio. */
{
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    const i0 = pag.indexOf('const pedirPropuesta = useCallback(');
    const i1 = pag.indexOf('pedirPropuestaRef.current = pedirPropuesta;', i0);
    const cuerpo = i0 >= 0 && i1 > i0 ? pag.slice(i0, i1) : '';
    ok(!!cuerpo && cuerpo.includes('tocadosRef.current.has(q.id)') && !cuerpo.includes('tocados.has('),
       'volver a proponer lee los tocados de AHORA (tocadosRef): no vuelca el motor sobre el principal que él marcó');
    ok(pag.includes('tocadosRef.current = tocados;'), 'y tocadosRef se refresca en cada pintado');
    ok(pag.includes('firma: firmaConRecalificacion(firmaPlan, vivosRecal, superpuestas)'),
       'la firma del plan lleva el estado de los tumbados');
    ok(pag.includes('avisosReparto={avisosRepartoVigentes}')
       && pag.includes('const avisosRepartoVigentes = avisosRecal.length ? [] : avisosReparto;'),
       'los avisos de la recalificación sustituyen a los del reparto');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(fallas ? `FALLAS: ${fallas} (bien: ${bien})` : `OK · ${bien} comprobaciones`);
process.exit(fallas ? 1 : 0);
