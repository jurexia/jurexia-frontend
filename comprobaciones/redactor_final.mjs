// LA MEJORA FINAL DEL REDACTOR, PROBADA SIN SERVIDOR (2-oct-2026).
//
// David: «el motor siempre pide constancias (…) simplificarlo a preguntas»;
// «el motor nunca se atreve a proponer (…) si hay un 50.01% de probabilidad
// hacia un lado sea esa la propuesta»; «un agente supervisor (…) que revise el
// proyecto y ajuste sus errores». Lo que llega a la pantalla viaja por cinco
// contratos (A-E del paquete). Aquí se comprueba, con el código REAL
// transpilado al vuelo y un fetch falso:
//
//   1 · la propuesta (CONTRATO A): la global ya no se tira con `alcanza` falso
//       si trae sentido; `sostenida` y la probabilidad; el estado «preguntas»;
//       y un servidor anterior, que se lee como siempre;
//   2 · las preguntas (CONTRATO B) y su envío en lote (CONTRATO C), y el
//       contexto del asunto con sus preguntas y el avance «preguntas»;
//   3 · el supervisor (CONTRATO D): el evento «revisando» del flujo, las
//       correcciones en el «listo», en la ficha y en la cabecera del camino
//       plano; la fase y su rótulo;
//   4 · la tarjeta (CONTRATO E): la probabilidad, el porcentaje del lado, el
//       volteo en una línea;
//   5 · el HTML de «Preguntas para ti» y de las correcciones del supervisor;
//   6 · el cableado de page.tsx, leído en su fuente.
//
//   TMPDIR=<scratchpad> node comprobaciones/redactor_final.mjs
//
// No arranca Next ni llama a ningún servidor. Datos de prueba esquemáticos.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requerir = createRequire(path.join(RAIZ, 'package.json'));
const ts = requerir('typescript');
const REACT = requerir.resolve('react');
const LUCIDE = requerir.resolve('lucide-react');

let fallas = 0, bien = 0;
function ok(cond, que) {
    if (cond) { bien += 1; return; }
    fallas += 1;
    console.log(`  FALLA · ${que}`);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'redactor-final-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));
const SENT = 'src/components/sentencia';
const conReact = [['require("react")', `require(${JSON.stringify(REACT)})`],
                  ['require("lucide-react")', `require(${JSON.stringify(LUCIDE)})`]];
for (const f of ['api.ts', 'tipos.ts', 'calificaciones.ts', 'recalificacion.ts', 'tarjetaDelPrincipal.ts',
                 'primitivas.tsx', 'PreguntasParaTi.tsx', 'CorreccionesDelSupervisor.tsx']) {
    const src = fs.readFileSync(path.join(RAIZ, SENT, f), 'utf8');
    let js = ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
                           jsx: ts.JsxEmit.React, esModuleInterop: true },
        fileName: f,
    }).outputText;
    for (const [de, a] of conReact) js = js.split(de).join(a);
    fs.writeFileSync(path.join(TMP, f.replace(/\.tsx?$/, '.js')), js);
}
const req = createRequire(path.join(TMP, 'x.js'));
const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
const pintar = (el) => renderToStaticMarkup(el);
const api = req('./api.js');
const td = req('./tarjetaDelPrincipal.js');
const recal = req('./recalificacion.js');
const PreguntasMod = req('./PreguntasParaTi.js');
const Preguntas = PreguntasMod.default;
const SupMod = req('./CorreccionesDelSupervisor.js');
const Correcciones = SupMod.default;

const fetchReal = globalThis.fetch;
const conFetch = async (fn, alPedir) => {
    globalThis.fetch = alPedir;
    try { return await fn(); } finally { globalThis.fetch = fetchReal; }
};
const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });

const GLOBAL = (extra = {}) => ({
    sentido: 'infundado', razon: 'razón global', problema_que_decide: '¿P1?', efecto: '', apoyos: [],
    confianza: 'media', en_contra: '', alcanza: true,
    contexto: { hechos: '', resolvio: '', combate: '', tema_principal: '' },
    alternativa: { sentido: 'fundado', razon: '', efecto: '', apoyos: [] }, checklist: [], ...extra,
});
const PREGUNTA = (extra = {}) => ({
    id: 'P1', pregunta: '¿La diligencia de prueba dejó constancia del cercioramiento?', tipo: 'si_no',
    para_que: 'para qué (prueba)', problema: 1, indispensable: true, afirma_la_parte: 'lo que afirma (prueba)',
    cita_escrito: 'cita (prueba)', el_acto: 'no_se_pronuncia', si_si: 'infundado', si_no: 'fundado',
    si_no_contesta: 'supuesto (prueba)', respuesta: null, ...extra,
});

/* ═══ 1 · LA PROPUESTA (CONTRATO A) ═══ */
{
    const pedir = (cuerpo) => conFetch(() => api.proponerSolucion('1/2026', 'x@y.mx'), async () => json(cuerpo));
    // Un servidor anterior con la global que «no alcanza» pero trae sentido.
    let r = await pedir({ propuestas: [], global: GLOBAL({ alcanza: false }) });
    ok(r.global && r.global.sentido === 'infundado' && r.global.alcanza === true && r.global.sostenida === false,
       'A: la global con alcanza=false y sentido se QUEDA (alcanza=true, sostenida=false)');
    ok(r.global.probabilidad === null && r.estado === 'lista' && r.formato === 2 && r.preguntas.length === 0,
       'A: un servidor anterior: sin probabilidad, «lista», formato 2, sin preguntas');
    r = await pedir({ propuestas: [], global: GLOBAL({ alcanza: false, sentido: '' }) });
    ok(r.global === null, 'A: sin sentido y sin alcanza, la global sigue fuera');
    r = await pedir({ propuestas: [], global: GLOBAL() });
    ok(r.global && r.global.sostenida === true, 'A: alcanza=true sin `sostenida`: sostenida=true');
    // Formato 3 con la probabilidad.
    r = await pedir({ formato: 3, estado: 'lista', propuestas: [], preguntas: [PREGUNTA({ indispensable: false, respuesta: 'si' })],
                      global: GLOBAL({ sostenida: false, probabilidad: {
                          p_prospera: 0.32, lado: 'no_prospera', fuente: 'jurimetria', tasa: 0.291, n_tasa: 4376,
                          precedentes: { n: 2, a_favor: 0.1, en_contra: 0.4, filas: [{}] }, motor: 1,
                          explicacion: 'explicación (prueba)', volteada: true, sentido_motor: 'Fundado' } }) });
    const p = r.global.probabilidad;
    ok(r.formato === 3 && p && p.p_prospera === 0.32 && p.lado === 'no_prospera' && p.fuente === 'jurimetria'
       && p.n_tasa === 4376 && p.precedentes.n === 2 && p.motor === 1 && p.volteada && p.sentido_motor === 'fundado',
       'A: la probabilidad del sentido, leída entera');
    ok(r.global.sostenida === false && r.preguntas.length === 1 && r.preguntas[0].respuesta === 'si',
       'A: «lista» trae las preguntas ya contestadas para enseñarlas');
    ok(api.probabilidadDe({ p_prospera: 68, lado: 'prospera' }).p_prospera === 0.68,
       'A: un porcentaje entero se lee como fracción');
    ok(api.probabilidadDe({}) === null && api.probabilidadDe(null) === null, 'A: sin lado ni número, nada');
    // Estado «preguntas».
    r = await pedir({ formato: 3, estado: 'preguntas', propuestas: [], global: null, criterios_json: '[]',
                      preguntas: [PREGUNTA(), PREGUNTA({ id: 'P1', pregunta: 'repetida' }), PREGUNTA({ id: 'P2', tipo: 'texto', indispensable: false }),
                                  { id: '', pregunta: 'sin id' }, 'basura'] });
    ok(r.estado === 'preguntas' && r.global === null && r.propuestas.length === 0, 'A: «preguntas»: sin global ni propuestas');
    ok(r.preguntas.map((q) => q.id).join() === 'P1,P2' && r.preguntas[0].pregunta.startsWith('¿La diligencia')
       && r.preguntas[1].tipo === 'texto' && r.preguntas[0].respuesta === null,
       'A/B: las preguntas, sin repetidas ni ilegibles; el primero de un id manda');
    ok(api.conSentido({ sentido: ' fundado ' }) && !api.conSentido({ sentido: '' }) && !api.conSentido(null),
       'conSentido: basta un sentido escrito');
}

/* ═══ 2 · LAS RESPUESTAS EN LOTE (CONTRATO C) Y EL CONTEXTO ═══ */
{
    const pedidos = [];
    const r = await conFetch(() => api.responderPreguntas('1/2026', 'x@y.mx',
        [{ id: 'P1', respuesta: ' si ' }, { id: 'P2', respuesta: '  ' }, { id: '', respuesta: 'no' }, { id: 'P3', respuesta: 'La cláusula dice X.' }]),
        async (url, init) => { pedidos.push({ url: String(url), init }); return json({ ok: true, pendientes: 0, propuesta: 'en_curso' }); });
    const fd = pedidos[0].init.body;
    ok(pedidos[0].url.endsWith('/taller/responder') && pedidos[0].init.method === 'POST', 'C: POST a /taller/responder');
    ok(fd.get('numero') === '1/2026' && fd.get('user_email') === 'x@y.mx'
       && fd.get('respuestas_json') === JSON.stringify([{ id: 'P1', respuesta: 'si' }, { id: 'P3', respuesta: 'La cláusula dice X.' }]),
       'C: todas en un envío, sin vacías ni sin id, recortadas');
    ok(r.ok && r.pendientes === 0 && r.propuesta === 'en_curso', 'C: la respuesta del servidor');
    const r2 = await conFetch(() => api.responderPreguntas('1', 'x', [{ id: 'P1', respuesta: 'no' }]),
        async () => json({ ok: true, pendientes: 1, propuesta: 'preguntas' }));
    ok(r2.propuesta === 'preguntas' && r2.pendientes === 1, 'C: aún falta una indispensable');
    let msg = '';
    try {
        await conFetch(() => api.responderPreguntas('1', 'x', [{ id: 'P1', respuesta: 'no' }]),
                       async () => json({ detail: 'Sesión vencida (prueba)' }, 409));
    } catch (e) { msg = e.message; }
    ok(msg === 'Sesión vencida (prueba)', 'C: un error del servidor se lanza con su detalle');

    const c = await conFetch(() => api.contextoDelAsunto('1/2026', 'x@y.mx'), async () => json({
        numero: '1/2026', avance: { consulta: { estado: 'listo' }, contraste: { estado: 'listo' }, propuesta: { estado: 'preguntas' } },
        preguntas: [PREGUNTA({ respuesta: 'no_consta' })],
        proyecto: { generado_en: 'x', palabras: 10, avisos: [], huecos: [], supervisor: { estado: 'sin_cambios', modelo: 'm' } },
    }));
    ok(c.avance.propuesta === 'preguntas' && c.preguntas.length === 1 && c.preguntas[0].respuesta === 'no_consta',
       'C: el contexto trae las preguntas con su respuesta y el avance «preguntas»');
    ok(c.proyecto.supervisor && c.proyecto.supervisor.estado === 'sin_cambios', 'D: y la ficha del proyecto, su supervisor');
    const viejo = await conFetch(() => api.contextoDelAsunto('1', 'x'), async () => json({ numero: '1' }));
    ok(viejo.preguntas.length === 0 && viejo.avance.propuesta === '', 'C: un servidor anterior: sin preguntas');
}

/* ═══ 3 · EL SUPERVISOR (CONTRATO D) ═══ */
{
    const SUP = { estado: 'aplicado', modelo: 'modelo-barato', segundos: 41.6, descartadas: 1, correcciones: [
        { tipo: 'incongruencia', parrafo: 12, antes: 'a'.repeat(500), despues: 'después (prueba)', motivo: 'motivo (prueba)' },
        { tipo: 'raro', parrafo: 'x', antes: '', despues: '', motivo: '' },
        { tipo: 'extension', parrafo: 3, antes: 'párrafo largo (prueba)', despues: '', motivo: 'repetía' },
    ] };
    const s = api.supervisorDe(SUP);
    ok(s.estado === 'aplicado' && s.modelo === 'modelo-barato' && s.descartadas === 1 && s.correcciones.length === 2
       && s.total === 2, 'D: el supervisor, sin la corrección vacía');
    ok(s.correcciones[0].antes.length === 400 && s.correcciones[0].tipo === 'incongruencia' && s.correcciones[0].parrafo === 12,
       'D: «antes» recortado a 400 y el tipo reconocido');
    ok(api.supervisorDe({ estado: 'desconocido' }) === null && api.supervisorDe(null) === null, 'D: un estado que no se conoce no se inventa');
    ok(api.supervisorDeCabecera('3 correcciones').total === 3 && api.supervisorDeCabecera('0 correcciones').estado === 'sin_cambios'
       && api.supervisorDeCabecera(null) === null, 'D: la cabecera x-supervisor del camino plano');

    const eventos = [
        { tipo: 'texto', dato: 'Estudio.' },
        { tipo: 'revisando' },
        { tipo: 'listo', docx_b64: '', nombre: 'x.docx', palabras: 1, avisos: [], huecos: [], version: 2, supervisor: SUP },
    ];
    const orden = [];
    const flujo = async (url) => {
        const u = String(url);
        if (u.includes('/taller/proyecto?')) return json({ proyecto: null });
        if (u.includes('/taller/resolver/stream')) {
            const cuerpo = eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
            return new Response(new ReadableStream({ start(k) { k.enqueue(new TextEncoder().encode(cuerpo)); k.close(); } }), { status: 200 });
        }
        if (u.includes('/taller/descargar')) return new Response(new Blob(['x']), { status: 200 });
        return json({}, 404);
    };
    const r = await conFetch(() => api.resolverEnVivo('1', 'x', { criteriosJson: '[]' },
        () => orden.push('texto'), () => {}, () => {}, () => {}, () => {}, () => {}, () => orden.push('revisando')), flujo);
    ok(orden.join() === 'texto,revisando', `D: el evento «revisando» llega a su callback (${orden})`);
    ok(r.supervisor && r.supervisor.correcciones.length === 2 && r.version === 2, 'D: las correcciones llegan en el «listo»');
    const r2 = await conFetch(() => api.resolverEnVivo('1', 'x', { criteriosJson: '[]' }), flujo);
    ok(r2.palabras === 1, 'D: sin el callback (llamadas viejas), el evento no tumba nada');
    eventos[2] = { ...eventos[2], supervisor: undefined };
    const r3 = await conFetch(() => api.resolverEnVivo('1', 'x', { criteriosJson: '[]' }), flujo);
    ok(r3.supervisor === null, 'D: un «listo» sin supervisor: null, como antes');
    const ficha = await conFetch(() => api.fichaProyecto('1', 'x'),
        async () => json({ proyecto: { version: 4, palabras: 9, avisos: [], huecos: [], supervisor: SUP } }));
    ok(ficha.supervisor && ficha.supervisor.total === 2, 'D: la ficha del proyecto guarda las correcciones');

    // La fase del flujo: «revisando» gana a todo y un texto tardío la devuelve.
    const correr = (inicio, evs) => evs.reduce((f, ev) => recal.faseTras(f, ev), inicio);
    ok(correr('preparando', ['ordenando', 'texto', 'revisando']) === 'revisando', 'D: tras escribir, «revisando»');
    ok(correr('revisando', ['ordenando']) === 'revisando' && correr('revisando', ['recalificado']) === 'revisando',
       'D: un «ordenando» o «recalificado» tardío no la tapa');
    ok(correr('revisando', ['texto']) === 'escribiendo', 'D: un texto tardío vuelve a «escribiendo»');
    ok(recal.rotuloDelFlujo('revisando', true).titulo === 'Revisando el proyecto: congruencia, citas y extensión…'
       && recal.rotuloDelFlujo('revisando', false).cuerpo.length > 40,
       'D: el rótulo de la fase, también con el estudio ya a la vista');
    ok(recal.rotuloDelFlujo('escribiendo', true).titulo === 'Escribiendo el estudio', 'D: las demás fases como antes');
}

/* ═══ 4 · LA TARJETA Y LA PROBABILIDAD (CONTRATO E) ═══ */
{
    const t = api.tarjetaDe({ estado: 'reñido', recomendada: 'propuesta',
                              probabilidad: { p: 0.68, lado: 'no_prospera', explicacion: 'por qué (prueba)' } });
    ok(t.probabilidad && t.probabilidad.p === 0.68 && t.probabilidad.lado === 'no_prospera'
       && t.probabilidad.explicacion === 'por qué (prueba)', 'E: la probabilidad de la tarjeta');
    ok(api.tarjetaDe({}).probabilidad === null && api.tarjetaDe({ probabilidad: { lado: 'x' } }).probabilidad === null,
       'E: sin número, null (un servidor anterior)');
    ok(!td.sinRecomendar(t), 'E: reñido con «recomendada» ya no quita la recomendación');
    ok(td.pctDelLado(0.32) === 68 && td.pctDelLado(0.68) === 68 && td.pctDelLado(68) === 68 && td.pctDelLado(null) === null
       && td.pctDelLado(0.5) === 50, 'el porcentaje del lado que gana, venga como venga');
    const g = api.probabilidadDe({ p_prospera: 0.32, lado: 'no_prospera', volteada: true, sentido_motor: 'fundado',
                                   explicacion: 'de la propuesta' });
    let pv = td.probabilidadVisible(t, g);
    ok(pv.pct === 68 && pv.explicacion === 'por qué (prueba)' && pv.volteada && pv.sentidoMotor === 'fundado',
       'la de la tarjeta manda; el volteo, de la propuesta');
    pv = td.probabilidadVisible(api.tarjetaDe({}), g);
    ok(pv.pct === 68 && pv.lado === 'no_prospera' && pv.explicacion === 'de la propuesta', 'sin la de la tarjeta, la de la propuesta');
    ok(td.probabilidadVisible(api.tarjetaDe({}), null) === null, 'sin ninguna: null (nada lleva porcentaje)');
    ok(td.pctDelSentido(pv, 'infundado') === 68 && td.pctDelSentido(pv, 'inoperante') === 68
       && td.pctDelSentido(pv, 'fundado') === 32 && td.pctDelSentido(pv, 'sin_materia') === null,
       'el porcentaje de un sentido: el del lado, o su complemento');
    ok(td.fraseDelVolteo(pv, false) === 'El motor leía conceder; la jurimetría del tribunal inclina a negar: 68 %.',
       `el volteo en una línea, en el amparo directo (${td.fraseDelVolteo(pv, false)})`);
    ok(td.fraseDelVolteo(pv, true) === 'El motor leía que el recurso prospere; la jurimetría del tribunal inclina a que no prospere: 68 %.',
       'y en un recurso');
    ok(td.fraseDelVolteo({ ...pv, volteada: false }, false) === '', 'sin volteo, nada');

    // La tarjeta local: con la probabilidad recomienda; sin ella, como antes.
    const PROBS = [{ id: 'a', pregunta: '¿P1?', jerarquia: 'principal' }];
    const conProb = td.tarjetaDeLaPropuesta({ propuestas: [], global: { ...GLOBAL(), probabilidad: g }, contraste: [],
                                              resumen: '', avisos: [], criteriosJson: '', modelo: '', necesitaConceptos: false }, PROBS);
    ok(conProb.recomendada === 'propuesta' && conProb.probabilidad === null, 'local con probabilidad: recomienda la propuesta');
    const sinProb = td.tarjetaDeLaPropuesta({ propuestas: [], global: GLOBAL(), contraste: [],
                                              resumen: '', avisos: [], criteriosJson: '', modelo: '', necesitaConceptos: false }, PROBS);
    ok(sinProb.recomendada === null, 'local sin probabilidad: no recomienda (como antes)');
    const porProblema = td.tarjetaDeLaPropuesta({ propuestas: [{ problema: '¿P1?', sentido: 'infundado', razon: 'r', apoyos: [],
                                                                  confianza: 'baja', alcanza: false }], global: null, contraste: [],
                                                  resumen: '', avisos: [], criteriosJson: '', modelo: '', necesitaConceptos: false }, PROBS);
    ok(porProblema.vias.propuesta && porProblema.vias.propuesta.sentido === 'infundado',
       'local por problema: el sentido va aunque `alcanza` venga falso');
    const suelto = td.soltarLoTocado([{ id: 'a', pregunta: '¿P1?', criterio: '' }],
                                     [{ problema: '¿P1?', sentido: 'infundado', razon: 'r', apoyos: [], confianza: '', alcanza: false }]);
    ok(suelto[0].sentido === 'infundado', '«Resolver así» devuelve el sentido del motor aunque `alcanza` venga falso');
}

/* ═══ 5 · EL HTML ═══ */
{
    const P = [PREGUNTA(), PREGUNTA({ id: 'P2', tipo: 'texto', indispensable: false, pregunta: '¿Qué dice la cláusula sexta?' })];
    ok(PreguntasMod.indispensablesSinContestar(P, {}).map((q) => q.id).join() === 'P1', 'B: falta la indispensable');
    ok(PreguntasMod.indispensablesSinContestar(P, { P1: 'no_consta' }).length === 0, 'B: «No consta» cuenta como respuesta');
    ok(JSON.stringify(PreguntasMod.respuestasQueViajan(P, { P1: 'si', P2: ' ' })) === JSON.stringify([{ id: 'P1', respuesta: 'si' }]),
       'B: viaja lo contestado');
    const guardadas = [PREGUNTA({ respuesta: 'si' }), P[1]];
    ok(JSON.stringify(PreguntasMod.respuestasQueViajan(guardadas, { P1: 'si', P2: 'Dice X.' })) === JSON.stringify([{ id: 'P2', respuesta: 'Dice X.' }]),
       'B: lo ya guardado igual no se repite');
    ok(JSON.stringify(PreguntasMod.respuestasIniciales(guardadas)) === JSON.stringify({ P1: 'si' }), 'B: arranca con lo guardado');

    const h = pintar(React.createElement(Preguntas, { preguntas: P, onResponder: () => {}, esperando: true }));
    ok(h.includes('Preguntas para ti') && h.includes('1 indispensable') && h.includes('data-pregunta="P1"')
       && h.includes('¿La diligencia de prueba dejó constancia del cercioramiento?'), 'B: la tarjeta, con su pregunta');
    ok(h.includes('Lo que afirma la parte: </span>lo que afirma (prueba)') && h.includes('«cita (prueba)»')
       && h.includes('para qué (prueba)'), 'B: lo que afirma la parte y para qué sirve');
    ok(h.includes('>Sí</button>') && h.includes('>No</button>') && h.includes('>No consta</button>'),
       'B: Sí / No / No consta');
    ok(/Otras preguntas · no bloquean/.test(h) && h.includes('<details'), 'B: las no indispensables, plegadas');
    ok(h.includes('placeholder="Lo que dice, en una o dos líneas"'), 'B: la de texto, con un campo corto');
    ok(/<button[^>]*disabled=""[^>]*>.*Responder y proponer/.test(h) && h.includes('Falta 1 indispensable'),
       'B: un solo botón, apagado mientras falte la indispensable, y lo dice');
    ok(/Sin respuesta: supuesto \(prueba\)/.test(h), 'B: lo que supone el motor sin respuesta, antes de pulsar');
    const h2 = pintar(React.createElement(Preguntas, { preguntas: [PREGUNTA({ respuesta: 'no' })], onResponder: () => {}, esperando: true }));
    ok(/aria-pressed="true"[^>]*>.*No<\/button>/.test(h2.replace(/<svg.*?<\/svg>/g, '')), 'B: la respuesta guardada se ve marcada');
    const bResp = (x) => { const k = x.indexOf('Responder y proponer'); return x.slice(x.lastIndexOf('<button', k), k); };
    ok(!bResp(h2).includes('disabled=""') && bResp(h).includes('disabled=""'), 'B: con la indispensable contestada, el botón se enciende');
    const h3 = pintar(React.createElement(Preguntas, { preguntas: [PREGUNTA({ indispensable: false, respuesta: 'si' })],
                                                       onResponder: () => {}, esperando: false, compacta: true }));
    ok(h3.includes('data-preguntas="afinar"') && h3.includes('1 de 1 contestada'),
       'B: con la propuesta hecha, plegada entera y con lo contestado');
    ok(pintar(React.createElement(Preguntas, { preguntas: [] })) === '', 'B: sin preguntas, nada');

    const s = api.supervisorDe({ estado: 'aplicado', modelo: 'm', segundos: 30, correcciones: [
        { tipo: 'cita', parrafo: 4, antes: 'antes (prueba)', despues: 'después (prueba)', motivo: 'motivo (prueba)' },
        { tipo: 'repeticion', parrafo: 9, antes: 'lo repetido (prueba)', despues: '', motivo: 'repetía' }] });
    const c = pintar(React.createElement(Correcciones, { supervisor: s }));
    ok(c.includes('El revisor corrigió 2 cosas del proyecto') && c.includes('<details') && c.includes('párrafo 4')
       && c.includes('antes (prueba)') && c.includes('→') && c.includes('después (prueba)') && c.includes('Por qué: motivo (prueba)'),
       'D: «antes → después · por qué», plegada, con el número en el título');
    ok(c.includes('(se quitó)') && c.includes('repetición'), 'D: lo que se quitó se dice');
    ok(SupMod.tituloDelSupervisor(api.supervisorDe({ estado: 'sin_cambios' })).includes('no encontró nada que corregir'),
       'D: sin cambios, se dice');
    const f = pintar(React.createElement(Correcciones, { supervisor: api.supervisorDe({ estado: 'vencido' }) }));
    ok(f.includes('no terminó a tiempo') && f.includes('revísalo tú'), 'D: vencido: se entregó sin su revisión');
    ok(pintar(React.createElement(Correcciones, { supervisor: api.supervisorDe({ estado: 'apagado' }) })) === ''
       && pintar(React.createElement(Correcciones, { supervisor: null })) === '', 'D: apagado o sin supervisor: nada');
    const cab = pintar(React.createElement(Correcciones, { supervisor: api.supervisorDeCabecera('3 correcciones') }));
    ok(cab.includes('El revisor corrigió 3 cosas'), 'D: del camino plano, el número');
}

/* ═══ 6 · EL CABLEADO DE page.tsx, LEÍDO EN SU FUENTE ═══ */
{
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    ok(/avanceAuto\.propuesta !== 'preguntas';/.test(pag), 'el sondeo del paso 2 se detiene en «preguntas»');
    ok(/paso === 'adelanto' && avanceAuto\.propuesta === 'preguntas'[\s\S]{0,200}<PreguntasParaTi/.test(pag),
       'y el paso 2 enseña las preguntas');
    ok((pag.match(/alOrdenar, alRecalificar, alRecalificado,[\s\S]{0,200}alRevisar\);/g) || []).length === 2
       && /\(\) => avanzarFase\('revisando'\)\);/.test(pag), '«revisando» llega a la fase en los tres caminos');
    ok((pag.match(/<CorreccionesDelSupervisor supervisor=\{(proyecto|previo)\.supervisor\} \/>/g) || []).length === 2,
       'las correcciones del supervisor, en el proyecto nuevo y en el del historial');
    ok(!/No recomendado\.\s*\n\s*<\/p>/.test(pag) && pag.includes('Con la propuesta del motor: el lado más probable.'),
       'el botón amarillo ya no dice «No recomendado»');
    const i0 = pag.indexOf('const generarTodo = useCallback(');
    const cuerpo = pag.slice(i0, pag.indexOf('const pedirPropuesta = useCallback(', i0));
    ok(cuerpo.includes("pro.estado === 'preguntas'") && cuerpo.includes('generarTrasResponder.current = true')
       && !cuerpo.includes('El motor no pudo decidir el sentido'), '«Genera todo» se detiene en las preguntas y ya no aborta');
    ok(/if \(!generarTrasResponder\.current \|\| corriendo[\s\S]{0,200}void pedirProyecto\('estandar'\);/.test(pag),
       'y sigue solo por efecto cuando la propuesta llega lista');
    const j0 = pag.indexOf('const pedirPropuesta = useCallback(');
    const pp = pag.slice(j0, pag.indexOf('pedirPropuestaRef.current = pedirPropuesta;', j0));
    ok(pp.includes("p.estado === 'preguntas'") && pp.includes('conSentido(p.global)') && pp.includes('conSentido(s) && valido')
       && !pp.includes('s.alcanza'), 'pedirPropuesta: entra en global con el sentido y vuelca aunque no «alcance»');
    ok(pag.includes('onResponderPreguntas={responderYProponer}'), 'la decisión responde en lote');
    ok(/responderPreguntas\(encargo\.numero, correo, respuestas\)/.test(pag), 'por /taller/responder');
}

console.log(fallas ? `FALLA · ${bien} comprobaciones bien, ${fallas} mal` : `OK · ${bien} comprobaciones bien, 0 mal`);
process.exit(fallas ? 1 : 0);
