// EL PLAN DEL ESTUDIO EN LA PANTALLA, PROBADO SIN SERVIDOR (26-sep-2026).
//
// Paso 2 del estudio de fondo (contrato: diag/contrato_paso2.md). La pantalla
// pide el plan con antirrebote, lo lee, lo pinta, y manda las razones por
// argumento con el proyecto. Nada de eso se ve en un typecheck: un pedido de
// más gasta una de las cuatro corridas de la sesión, y un plan viejo que
// llega tarde pintado encima del nuevo enseña un orden que no es el de su
// decisión. Aquí se comprueba con el código REAL (transpilado al vuelo con el
// TypeScript del proyecto), un reloj falso y un fetch falso:
//
//   · formularioDelResolver: lo que viaja en las dos puertas;
//   · la lectura tolerante del plan y del mapa;
//   · el evento «ordenando» y el mapa del «listo» en resolverEnVivo;
//   · el emparejamiento segmento → problema y la Decisión 6;
//   · usePlanDelEstudio: antirrebote, un solo pedido por firma, la respuesta
//     vieja que se tira, la espera por clave, apagar y encender.
//
//   node comprobaciones/plan_del_estudio.mjs
//
// No arranca Next ni llama a ningún servidor. La prueba en el montaje real
// (clic de ratón en /taller) es otra y la hace quien integra.
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

/* ── Transpilar los dos módulos a CommonJS en una carpeta temporal ──
   React, los iconos y las primitivas se sustituyen por dobles: aquí sólo se
   ejercita la lógica y el hook, no se pinta nada. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-estudio-'));
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
transpilar('src/components/sentencia/api.ts', 'api.js');
transpilar('src/components/sentencia/ComoSeEstudiara.tsx', 'como.js', [
    ['require("react")', 'require("./react_falso.js")'],
    ['require("lucide-react")', 'require("./nada.js")'],
    ['require("./primitivas")', 'require("./nada.js")'],
]);
fs.writeFileSync(path.join(TMP, 'nada.js'),
    'module.exports = new Proxy({}, { get: () => () => null });');

/* Un React mínimo: useState, useRef y useEffect con sus reglas de
   dependencias; los efectos corren después de pintar, en orden. */
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
function useEffect(fn, deps) {
  const i = R.i++; const prev = R.hooks[i];
  const cambia = !prev || !deps || deps.length !== prev.deps.length
                 || deps.some((d, k) => !Object.is(d, prev.deps[k]));
  if (!cambia) return;
  const reg = { deps, limpiar: null }; R.hooks[i] = reg;
  R.efectos.push(() => { if (prev && prev.limpiar) prev.limpiar();
                         const c = fn(); reg.limpiar = typeof c === 'function' ? c : null; });
}
function desmontar() { R.hooks.forEach((h) => h && h.limpiar && h.limpiar()); R.hooks = []; }
module.exports = { __R: R, desmontar, useState, useRef, useEffect,
                   createElement: () => null, Fragment: 'f', default: null };
`);

/* ── Reloj falso, que se instala sólo para el hook (sección 6) ── */
const reloj = { ahora: 1_000_000, timers: [], sig: 1 };
const DateNowReal = Date.now;
const vaciar = async () => { for (let k = 0; k < 30; k++) await Promise.resolve(); };

const req = createRequire(path.join(TMP, 'x.js'));
const api = req('./api.js');
const como = req('./como.js');
const Rf = req('./react_falso.js');

/* ═══ 1 · EL FORMULARIO DE LAS DOS PUERTAS ═══ */
{
    const fd = api.formularioDelResolver('642/2024', 'casa@iurexia.com', {
        sentidoGlobal: 'infundado', razonGlobal: '  porque sí  ', globalDictado: true,
        criteriosJson: '[{"problema":"¿x?","sentido":"","grupo":"A","tocado":false}]',
        contexto: 'ctx', formato: 'estandar', suplencia: null,
        razonesSegmento: { 'C3.e': '  el precedente no aplica  ', 'C1.a': '   ', ' ': 'x' },
        varianteEstudio: 'v4',
    });
    ok(fd.get('modo_decision') === 'global', 'global: modo_decision');
    ok(fd.get('razonamiento') === 'porque sí', 'global: la razón va recortada');
    ok(fd.get('global_dictado') === '1', 'global: dictado');
    ok(JSON.parse(fd.get('criterios_json'))[0].grupo === 'A', 'global: el grupo viaja en criterios_json');
    ok(JSON.stringify(JSON.parse(fd.get('razones_segmento'))) === '{"C3.e":"el precedente no aplica"}',
       'razones_segmento: sólo las escritas, recortadas');
    ok(fd.get('variante_estudio') === 'v4', 'variante_estudio cuando se eligió');
    ok(fd.get('suplencia') === '', 'suplencia vacía viaja vacía');
    ok(fd.get('formato') === 'estandar', 'formato');

    const fd2 = api.formularioDelResolver('642/2024', 'x@y.mx', {
        criteriosJson: '[]', formato: 'moderna', varianteEstudio: '',
        suplencia: { fraccion: 'IV-b', aFavorDe: 'el quejoso', confirmada: true },
    });
    ok(fd2.get('razones_segmento') === '', 'razones_segmento va SIEMPRE, vacía si no hay');
    ok(!fd2.has('variante_estudio'), 'sin variante elegida no se manda el campo');
    ok(fd2.get('formato') === 'moderna', 'formato moderna');
    ok(JSON.parse(fd2.get('suplencia')).a_favor_de === 'el quejoso', 'suplencia confirmada');
    ok(!fd2.has('modo_decision'), 'por problema: sin modo_decision');
}

/* ═══ 2 · LA LECTURA TOLERANTE DEL PLAN ═══ */
const PLAN = {
    version: '1', clave: 'K1', tipo_asunto: 'amparo_directo',
    segmentos: [
        { id: 'C1.a', problema_id: 0, vicio: 'fondo', ataca: 'P2', dato: { texto: 'confesión', cita: 'dijo', fuente: 'escrito' },
          etiqueta: 'infundado', razon: 'fondo_desestimado', trat: 'aplica', pendiente: null, cita: 'sin pericial no hay identidad' },
        { id: 'C1.b', problema_id: '0', vicio: 'fondo', ataca: 'P2', etiqueta: 'infundado',
          razon: { tipo: 'no_combate', p: 'P3' }, trat: 'aplica' },
        { id: 'C3.e', problema_id: 1, vicio: 'fondo', etiqueta: 'infundado', razon: 'fondo_desestimado',
          trat: 'desarrolla', diferencia: 'precedente', pendiente: 'razon', sostiene: 'aplicar por analogía el 1114/2017' },
        { id: 'C9.z', problema_id: null, pendiente: 'sentido' },
        { sin_id: true },
    ],
    proposiciones: [{ id: 'P2', dice: 'identidad por confesión', caracter: 'toral' }],
    premisas: [{ id: 'M1', responde_a: ['P2'], fuentes: { tesis: ['2014643'], normas: [] }, anclas: ['confesión'] }],
    unidades: [{ id: 'U1', problemas: [0], segmentos: ['C1.a', 'C1.b'], premisa: 'M1', objecion: { de: 'tercero', anclas: [] } },
               { id: 'U2', problemas: [1], segmentos: ['C3.e'], premisa: 'M1' }],
    propuestas: [{ seg: 'C1.b', de: 'infundado', a: 'inoperante', por_que: 'no combate P3' }, { seg: '', a: 'x' }],
    avisos_al_secretario: ['P4 suficiente sin ataque', { texto: 'grupo con P distintas' }],
    orden: { criterio: 'promovente', por_que: 'sin prelación' },
};
{
    const p = api.planDe(PLAN);
    ok(p && p.segmentos.length === 4, 'segmento sin id se descarta');
    ok(p.segmentos[1].problemaId === 0, 'problema_id «0» (texto) → 0');
    ok(p.segmentos[1].razon === 'no_combate(P3)', 'razón partida en objeto → «no_combate(P3)»');
    ok(p.segmentos[0].pendiente === '' && p.segmentos[2].pendiente === 'razon'
       && p.segmentos[3].pendiente === 'sentido', 'pendiente normalizado');
    ok(p.segmentos[0].dato && p.segmentos[0].dato.texto === 'confesión', 'dato propio');
    ok(p.propuestas.length === 1 && p.propuestas[0].porQue === 'no combate P3', 'propuestas: por_que, y sin seg se tira');
    ok(p.avisos.length === 2 && p.avisos[1] === 'grupo con P distintas', 'avisos en texto u objeto');
    ok(p.premisas[0].tesis[0] === '2014643', 'fuentes de la premisa');
    ok(api.planDe(null) === null && api.planDe('x') === null, 'plan ilegible → null');
}

/* ═══ 3 · EL MAPA DEL «LISTO» ═══ */
{
    const m = api.mapaDe({ mapa: { 'C1.a': [3, '4'], 'M1': 2, 'U1': [] },
                           cobertura: { faltan: ['C3.e'], rescatados: [], cobertura: 0.9 },
                           plan: PLAN, parrafos: ['uno', 'dos'], variante: 'v4' });
    ok(m && m.marcas['C1.a'].join(',') === '3,4', 'índices numéricos, aunque lleguen como texto');
    ok(m.marcas['M1'].join(',') === '2', 'un índice suelto se vuelve lista');
    ok(m.cobertura.cobertura === 0.9 && m.cobertura.faltan[0] === 'C3.e', 'cobertura');
    ok(m.plan && m.plan.clave === 'K1' && m.variante === 'v4', 'plan usado y variante');
    ok(api.mapaDe({ palabras: 10 }) === null, 'sin mapa ni cobertura → null (v1/v2)');
    const m2 = api.mapaDe({ cobertura: 0.5 });
    ok(m2 && m2.cobertura.cobertura === 0.5, 'cobertura como número');
}

/* ═══ 4 · EL FLUJO: «ordenando», «texto» y el mapa en «listo» ═══ */
{
    const fetchReal = globalThis.fetch;
    const eventos = [
        { tipo: 'ordenando' },
        { tipo: 'texto', dato: 'Primer párrafo.' },
        { tipo: 'listo', docx_b64: '', nombre: 'x.docx', palabras: 2, avisos: [], huecos: [],
          version: 3, variante: 'v4', mapa: { 'C1.a': [0] }, cobertura: { faltan: [], rescatados: [], cobertura: 1 } },
    ];
    const pedidos = [];
    globalThis.fetch = async (url, init) => {
        pedidos.push({ url: String(url), init });
        if (String(url).includes('/taller/proyecto?')) {
            return new Response(JSON.stringify({ proyecto: null }), { status: 200 });
        }
        if (String(url).includes('/taller/resolver/stream')) {
            const cuerpo = eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
            return new Response(new ReadableStream({
                start(c) { c.enqueue(new TextEncoder().encode(cuerpo)); c.close(); },
            }), { status: 200 });
        }
        if (String(url).includes('/taller/descargar')) return new Response(new Blob(['x']), { status: 200 });
        return new Response('{}', { status: 404 });
    };
    let ordeno = 0, texto = '';
    const r = await api.resolverEnVivo('642/2024', 'x@y.mx', { criteriosJson: '[]', razonesSegmento: { 'C3.e': 'mía' } },
        (t) => { texto += t; }, () => {}, () => { ordeno += 1; });
    ok(ordeno === 1, 'el evento «ordenando» llega a onOrdenando');
    ok(texto === 'Primer párrafo.', 'el texto sigue llegando');
    ok(r.mapa && r.mapa.marcas['C1.a'][0] === 0 && r.mapa.variante === 'v4', 'el «listo» trae el mapa');
    const fd = pedidos.find((p) => p.url.includes('/resolver/stream')).init.body;
    ok(JSON.parse(fd.get('razones_segmento'))['C3.e'] === 'mía', 'resolverEnVivo manda razones_segmento');
    globalThis.fetch = fetchReal;
}

/* ═══ 5 · SEGMENTO → PROBLEMA, Y LA DECISIÓN 6 ═══ */
{
    const probs = [{ id: 'p1', pregunta: '¿Se acreditó la identidad?' }, { id: 'p2', pregunta: '¿Hay cosa juzgada?' }];
    ok(como.problemaDelSegmento({ problema: '', problemaId: 1 }, probs).p.id === 'p2', 'índice base 0');
    ok(como.problemaDelSegmento({ problema: '¿SE ACREDITÓ la identidad', problemaId: 1 }, probs).p.id === 'p1',
       'la pregunta manda sobre el índice (normalizada)');
    ok(como.problemaDelSegmento({ problema: '', problemaId: 'p2' }, probs).n === 2, 'id de la pantalla');
    ok(como.problemaDelSegmento({ problema: '', problemaId: 7 }, probs) === null, 'fuera de rango → null, no adivina');
    const p = api.planDe(PLAN);
    ok(como.pendientesDeRazon(p, {}).map((s) => s.id).join() === 'C3.e', 'pendiente de razón sin escribir');
    ok(como.pendientesDeRazon(p, { 'C3.e': '  ' }).length === 1, 'sólo espacios no cuenta como razón');
    ok(como.pendientesDeRazon(p, { 'C3.e': 'porque…' }).length === 0, 'con razón escrita deja de estar pendiente');
    // La caja no desaparece cuando el plan nuevo ya no la marca pendiente.
    const sinPend = api.planDe({ ...PLAN, segmentos: PLAN.segmentos.map((x) => (x.id === 'C3.e' ? { ...x, pendiente: null } : x)) });
    const c1 = como.cajasDeRazon(p, {});
    ok(c1.pendRazon.map((x) => x.id).join() === 'C3.e' && c1.porContestar === 1, 'caja pendiente sin escribir');
    const c2 = como.cajasDeRazon(sinPend, { 'C3.e': 'mi razón' });
    ok(c2.pendRazon.map((x) => x.id).join() === 'C3.e' && c2.porContestar === 0,
       'con su razón escrita la caja sigue a la vista aunque el plan ya no la marque');
    const c3 = como.cajasDeRazon(p, { 'C7.q': 'huérfana', 'C1.a': '  ' });
    ok(c3.sinSegmento.join() === 'C7.q', 'la razón de un id que el plan ya no trae se enseña aparte');
    ok(como.cajasDeRazon(null, { 'C7.q': 'x' }).sinSegmento.length === 0, 'sin plan no hay huérfanas que enseñar');
    ok(como.razonLegible('no_combate(P2)') === 'no combate la consideración (P2)', 'razón legible con argumento');
    ok(como.razonLegible('algo_nuevo') === 'algo nuevo', 'razón fuera del catálogo: se enseña, no se esconde');
}

/* ═══ 6 · EL HOOK: ANTIRREBOTE, TURNOS Y CLAVES ═══ */
Date.now = () => reloj.ahora;
globalThis.setTimeout = (fn, ms = 0) => {
    const id = reloj.sig++;
    reloj.timers.push({ id, cuando: reloj.ahora + Math.max(0, ms), fn });
    return id;
};
globalThis.clearTimeout = (id) => { reloj.timers = reloj.timers.filter((t) => t.id !== id); };

function montar(props) {
    let salida;
    const pintar = () => {
        let vueltas = 0;
        do {
            Rf.__R.sucio = false; Rf.__R.i = 0;
            salida = como.usePlanDelEstudio(props.enlace, props.listo);
            Rf.__R.efectos.splice(0).forEach((f) => f());
        } while (Rf.__R.sucio && ++vueltas < 20);
        return salida;
    };
    pintar();
    return {
        get: () => salida,
        async cambiar(p) { Object.assign(props, p); pintar(); await vaciar(); pintar(); },
        async avanzar(ms) {
            const fin = reloj.ahora + ms;
            for (;;) {
                reloj.timers.sort((a, b) => a.cuando - b.cuando);
                const t = reloj.timers[0];
                if (!t || t.cuando > fin) break;
                reloj.timers.shift();
                reloj.ahora = t.cuando;
                // Sin esperar a que acabe: el temporizador del hook sigue
                // vivo (espera la fila con este mismo reloj) y lo que
                // programe entra en esta vuelta.
                void Promise.resolve(t.fn()).catch(() => {});
                await vaciar(); pintar();
            }
            reloj.ahora = fin;
            await vaciar(); pintar();
        },
    };
}
const listo = (clave, plan = PLAN) => ({ estado: 'listo', clave, plan: api.planDe(plan), avisos: [], corridas: 1, tope: 4 });
function reiniciar() { Rf.desmontar(); reloj.timers = []; }

{   // 6.1 apagado: ni se pide ni se pinta
    reiniciar();
    let n = 0;
    const h = montar({ enlace: { activo: false, firma: 'A', pedir: async () => { n++; return listo('K'); }, leer: async () => listo('K') }, listo: true });
    await h.avanzar(30_000);
    ok(n === 0 && h.get().fase === 'inactivo', 'apagado: no se pide nada');
}
{   // 6.2 primer pedido a los 2 s; después, 8 s de quietud; uno por firma
    reiniciar();
    const firmas = [];
    const enlace = { activo: true, firma: 'A', pedir: async () => { firmas.push(enlace.firma); return listo(`K${firmas.length}`); },
                     leer: async () => { throw new Error('no debe leer'); } };
    const h = montar({ enlace, listo: true });
    ok(h.get().fase === 'esperando', 'recién montado: en espera');
    await h.avanzar(1_900);
    ok(firmas.length === 0, 'antes de 2 s no se pide');
    await h.avanzar(200);
    ok(firmas.join() === 'A', 'a los 2 s, un pedido');
    ok(h.get().fase === 'listo' && h.get().respuesta.clave === 'K1' && !h.get().desactualizado, 'plan listo y al día');
    await h.cambiar({ enlace: Object.assign(enlace, { firma: 'B' }) });
    ok(h.get().desactualizado && h.get().fase === 'listo', 'al cambiar la decisión, el plan se marca desactualizado');
    await h.avanzar(5_000);
    await h.cambiar({ enlace: Object.assign(enlace, { firma: 'C' }) });
    await h.avanzar(7_900);
    ok(firmas.length === 1, 'cada cambio reinicia la cuenta: nada antes de 8 s de quietud');
    await h.avanzar(200);
    ok(firmas.join() === 'A,C', 'un solo pedido, con la última firma (B nunca se pidió)');
    ok(!h.get().desactualizado, 'al día otra vez');
    await h.cambiar({ enlace: Object.assign(enlace, { firma: 'C' }) });
    await h.avanzar(20_000);
    ok(firmas.length === 2, 'la misma firma no se pide dos veces');
}
{   // 6.3 decisión incompleta: no se programa; lo que ya iba no se corta
    reiniciar();
    let n = 0;
    const enlace = { activo: true, firma: 'A', pedir: async () => { n++; return listo('K'); }, leer: async () => listo('K') };
    const h = montar({ enlace, listo: false });
    await h.avanzar(30_000);
    ok(n === 0 && h.get().fase === 'esperando', 'incompleta: en espera, sin pedir');
    await h.cambiar({ listo: true });
    await h.avanzar(2_100);
    ok(n === 1 && h.get().fase === 'listo', 'completa: se pide');
}
{   // 6.4 en curso: se pregunta a la fila y sólo vale NUESTRA clave
    reiniciar();
    const lecturas = [
        { estado: 'listo', clave: 'VIEJA', plan: api.planDe(PLAN), avisos: [], corridas: null, tope: null },
        { estado: 'en_curso', clave: 'K9', plan: null, avisos: [], corridas: null, tope: null },
        listo('K9'),
    ];
    let leidas = 0;
    const enlace = { activo: true, firma: 'A',
                     pedir: async () => ({ estado: 'en_curso', clave: 'K9', plan: null, avisos: [], corridas: null, tope: null }),
                     leer: async () => lecturas[Math.min(leidas++, lecturas.length - 1)] };
    const h = montar({ enlace, listo: true });
    await h.avanzar(2_100);
    ok(h.get().fase === 'en_curso', 'en curso tras pedir');
    await h.avanzar(4_100);
    ok(h.get().fase === 'en_curso' && !h.get().respuesta, 'un plan de OTRA clave en la fila no se pinta');
    await h.avanzar(8_200);
    ok(h.get().fase === 'listo' && h.get().respuesta.clave === 'K9', 'llega el de nuestra clave');
}
{   // 6.5 la respuesta vieja que llega tarde se tira
    reiniciar();
    let soltarA;
    const enlace = { activo: true, firma: 'A',
                     pedir: () => (enlace.firma === 'A'
                         ? new Promise((r) => { soltarA = () => r(listo('KA')); })
                         : Promise.resolve(listo('KB'))),
                     leer: async () => listo('KB') };
    const h = montar({ enlace, listo: true });
    await h.avanzar(2_100);
    ok(h.get().fase === 'pidiendo', 'A en camino');
    await h.cambiar({ enlace: Object.assign(enlace, { firma: 'B' }) });
    await h.avanzar(8_100);
    ok(h.get().respuesta && h.get().respuesta.clave === 'KB', 'B pedido y pintado');
    soltarA();
    await h.avanzar(10);
    ok(h.get().respuesta.clave === 'KB' && !h.get().desactualizado, 'A llegó tarde y no pisó a B');
}
{   // 6.6 error: se dice y no se reintenta en bucle; apagar y encender vuelve a pedir
    reiniciar();
    let n = 0;
    const enlace = { activo: true, firma: 'A', pedir: async () => { n++; throw new Error('Tope de 4 corridas'); },
                     leer: async () => listo('K') };
    const h = montar({ enlace, listo: true });
    await h.avanzar(2_100);
    ok(h.get().fase === 'fallo' && /Tope/.test(h.get().error), 'el fallo se enseña con su motivo');
    await h.avanzar(60_000);
    ok(n === 1, 'no se reintenta solo la misma firma');
    await h.cambiar({ enlace: Object.assign(enlace, { activo: false }) });
    ok(h.get().fase === 'inactivo', 'apagado');
    enlace.pedir = async () => { n++; return listo('K2'); };
    await h.cambiar({ enlace: Object.assign(enlace, { activo: true }) });
    await h.avanzar(8_100);
    ok(n === 2 && h.get().fase === 'listo', 'al encender otra vez se pide de nuevo');
}

Date.now = DateNowReal;
fs.rmSync(TMP, { recursive: true, force: true });
console.log(fallas ? `FALLAS: ${fallas} (bien: ${bien})` : `OK · ${bien} comprobaciones`);
process.exit(fallas ? 1 : 0);
