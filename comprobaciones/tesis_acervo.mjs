// LA TESIS SE COMPRUEBA EN EL ACERVO, NO EN EL SEMANARIO EN VIVO (28-sep-2026).
//
//   node --experimental-strip-types comprobaciones/tesis_acervo.mjs [--sin-red]
//       API=https://jurexia-api.onrender.com por omisión (producción, sólo lectura:
//       POST /acervo/registros y GET /cita/{id}).
//
// Corre EL MISMO código que `/api/tesis/[registro]` (`src/lib/tesisDelAcervo.ts`)
// y que el sello (`src/lib/citas.ts`, `src/lib/documento/sello.ts`):
//
//   1. SIN RED — la regla de oro. Ninguna combinación de acervo caído, fuera
//      del acervo, reto de Incapsula, «Acceso denegado», 500 o red cortada da
//      `no_encontrada`; sólo lo da el 404 (o el «no encontrado» de la propia
//      API) del Semanario. Lo que está en el acervo no pregunta al Semanario.
//      El caso «Acceso denegado» FALLABA con el código anterior: cualquier
//      JSON sin `ius` se leía como «no existe».
//      Y la lectura de rubros en los formatos que pide el prompt: a ningún
//      registro se le atribuye el rubro de la cita de al lado. Con la lectura
//      anterior, el formato judicial daba 2 de 3 «no corresponde» en falso.
//   2. CON RED, contra producción: tesis buenas (las cuatro de la pensión y
//      cuatro de fraude), una inventada (9999999) y una real que el acervo
//      no tiene (238212, «FUNDAMENTACION Y MOTIVACION.», Séptima Época), con
//      el Semanario como lo ve Vercel (el reto de Incapsula medido el 28-sep)
//      y como lo ve esta máquina.
//   3. EL SELLO de punta a punta, con respuestas escritas en los formatos que
//      pide el prompt de main.py, y el veredicto de `veredictoDelSello`.
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = await import(path.join(RAIZ, 'src/lib/tesisDelAcervo.ts'));
const { registrosDeLaRespuesta, rubrosPorRegistro, rubroCorresponde } = await import(path.join(RAIZ, 'src/lib/citas.ts'));
const { veredictoDelSello, estadosDeLosRegistros } = await import(path.join(RAIZ, 'src/lib/documento/sello.ts'));

const SIN_RED = process.argv.includes('--sin-red');
const API = (process.env.API || 'https://jurexia-api.onrender.com').replace(/\/+$/, '');

let fallos = 0;
function comprueba(bien, etiqueta, detalle = '') {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', etiqueta, detalle ? `— ${detalle}` : '');
}

// El reto de Incapsula tal como llega a Vercel (y, a los registros
// inexistentes, también a una laptop): 200 con una página HTML.
const INCAPSULA = '<html style="height:100%"><head><META NAME="ROBOTS" CONTENT="NOINDEX, NOFOLLOW">'
    + '<script type="text/javascript" src="/_Incapsula_Resource?SWJIYLWA=719d34d31c8e3a6e6fffd425f7e032f3"></script></head></html>';
const comoVercel = async () => ({ status: 200, texto: INCAPSULA });

// ─── 1. SIN RED ────────────────────────────────────────────────────────────
console.log('\n1. La regla de oro, sin red\n');

// El id de la v3: los mismos que calcula Python (uuid5 de «tesis:N»).
comprueba(T.idTesisV3('2011282') === '652e7929-99b9-54a3-8c18-fb800f15dd2c', 'idTesisV3(2011282)');
comprueba(T.idTesisV3('198508') === 'ef1435a7-737b-5f78-a7a8-59ed5c6daa08', 'idTesisV3(198508)');

const lecturas = [
    [404, '', 'no_existe'],
    [200, INCAPSULA, 'sin_comprobar'],
    [200, '{"id":null,"ius":2011282,"rubro":"<p>PÉRDIDA DE LA PATRIA POTESTAD.</p>"}', 'existe'],
    [200, '{"error": "Acceso denegado: Formato inválido."}', 'sin_comprobar'],
    [200, '{"title":"Not Found","status":404,"message":"error.http.404"}', 'no_existe'],
    [200, '{"title":"Internal Server Error","status":500,"message":"error.http.500"}', 'sin_comprobar'],
    [200, '{}', 'sin_comprobar'],
    [200, 'null', 'sin_comprobar'],
    [403, '', 'sin_comprobar'],
    [500, '', 'sin_comprobar'],
    [503, '<html>mantenimiento</html>', 'sin_comprobar'],
];
for (const [status, texto, esperado] of lecturas) {
    const l = T.leerRespuestaDelSemanario(status, texto);
    comprueba(l.tipo === esperado, `Semanario ${status} ${texto.slice(0, 48).replace(/\s+/g, ' ')}`, `${l.tipo}${l.detalle ? ` (${l.detalle})` : ''}`);
}

// Un fetch falso del API de Iurexia.
const respuesta = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });
const apiFalso = (acervo, cita = null) => async (url) => {
    if (typeof acervo === 'function') return acervo(url);
    if (url.endsWith('/acervo/registros')) return acervo;
    if (url.includes('/cita/')) return cita ?? respuesta({ detail: 'Documento no encontrado' }, 404);
    throw new Error(`url inesperada ${url}`);
};

// [respuesta del acervo, con qué empieza el `detalle`]. El detalle es lo único
// que distingue «no está» de «no se pudo mirar» cuando los dos acaban en el
// Semanario; confundirlos manda a buscar el fallo al sitio equivocado.
const ACERVOS = {
    'fuera del acervo': [() => respuesta({ ok: true, consultado: true, registros: { 1234567: { valid: false, rubro_real: null } } }), 'fuera_del_acervo;'],
    'Qdrant caído (consultado:false)': [() => respuesta({ ok: true, consultado: false, registros: { 1234567: { valid: false, rubro_real: null } } }), 'acervo_no_consultado;'],
    'API 500': [() => respuesta({ detail: 'boom' }, 500), 'acervo_http_500;'],
    'API 502 en HTML': [() => new Response('<html>Bad Gateway</html>', { status: 502 }), 'acervo_http_502;'],
    'fila ausente': [() => respuesta({ ok: true, consultado: true, registros: {} }), 'acervo_sin_fila;'],
    'red cortada': [() => apiFalso(async () => { throw new TypeError('fetch failed'); }), 'acervo: TypeError'],
};
const SEMANARIOS = {
    'reto de Incapsula': comoVercel,
    'Acceso denegado': async () => ({ status: 200, texto: '{"error": "Acceso denegado: Formato inválido."}' }),
    '500': async () => ({ status: 500, texto: '' }),
    'red cortada': async () => { throw new Error('ETIMEDOUT'); },
    '404': async () => ({ status: 404, texto: '' }),
};
for (const [nAcervo, [hacer, prefijo]] of Object.entries(ACERVOS)) {
    for (const [nSem, sem] of Object.entries(SEMANARIOS)) {
        const pedir = nAcervo === 'red cortada' ? hacer() : apiFalso(hacer());
        const { cuerpo, guardable } = await T.comprobarTesis('1234567', { api: 'http://api', pedir, semanario: sem });
        const esperado = nSem === '404' ? 'no_encontrada' : 'semanario_no_disponible';
        const detalleBien = esperado === 'no_encontrada' || (cuerpo.detalle || '').startsWith(prefijo);
        comprueba(cuerpo.verificada === false && cuerpo.motivo === esperado && !guardable && detalleBien,
            `acervo «${nAcervo}» + Semanario «${nSem}» → ${esperado}`, cuerpo.detalle || '');
    }
}

// Lo que está en el acervo no se le pregunta al Semanario.
{
    let preguntado = false;
    const { cuerpo, guardable } = await T.comprobarTesis('2011282', {
        api: 'http://api',
        pedir: apiFalso(() => respuesta({ ok: true, consultado: true, registros: { 2011282: { valid: true, rubro_real: 'PÉRDIDA DE LA PATRIA POTESTAD. LA CAUSAL' } } })),
        semanario: async () => { preguntado = true; return comoVercel(); },
    });
    comprueba(cuerpo.verificada === true && cuerpo.origen === 'acervo' && guardable && !preguntado,
        'en el acervo → verificada, sin tocar el Semanario');
}

// La ficha: `/cita` de OTRA tesis no se mezcla; la de esta sí.
{
    const acervo = () => respuesta({ ok: true, consultado: true, registros: { 2011282: { valid: true, rubro_real: 'PÉRDIDA RECORTADA' } } });
    const ajena = respuesta({ registro: '2011172', ref: 'FRAUDE ESPECÍFICO', texto: 'x', tesis_num: 'X' });
    const { cuerpo: c1 } = await T.comprobarTesis('2011282', { api: 'http://api', ficha: true, pedir: apiFalso(acervo(), ajena), semanario: comoVercel });
    comprueba(c1.verificada && c1.rubro === 'PÉRDIDA RECORTADA' && c1.clave === null, 'ficha: /cita de otra tesis se ignora');
    const propia = respuesta({
        registro: '2011282', ref: 'PÉRDIDA DE LA PATRIA POTESTAD. RUBRO ENTERO.',
        texto: '[TIPO: TESIS AISLADA] [REGISTRO: 2011282]\nPÉRDIDA DE LA PATRIA POTESTAD. RUBRO ENTERO.\nLa pérdida de la patria potestad…',
        tesis_num: '1a. LXXIV/2016 (10a.)', tipo_criterio: 'TESIS AISLADA', instancia: 'Primera Sala', materia: 'Civil',
        pdf_url: 'https://storage.googleapis.com/iurexia-leyes/tesis/201/2011282.pdf',
    });
    const { cuerpo: c2 } = await T.comprobarTesis('2011282', { api: 'http://api', ficha: true, pedir: apiFalso(acervo(), propia), semanario: comoVercel });
    comprueba(c2.rubro === 'PÉRDIDA DE LA PATRIA POTESTAD. RUBRO ENTERO.' && c2.texto === 'La pérdida de la patria potestad…'
        && c2.clave === '1a. LXXIV/2016 (10a.)' && c2.pdf?.endsWith('/2011282.pdf'), 'ficha: rubro entero, cuerpo sin cabecera, clave y PDF');
    const pdfAjeno = respuesta({ registro: '2011282', ref: 'X', texto: 'y', pdf_url: 'https://evil.example/2011282.pdf' });
    const { cuerpo: c3 } = await T.comprobarTesis('2011282', { api: 'http://api', ficha: true, pedir: apiFalso(acervo(), pdfAjeno), semanario: comoVercel });
    comprueba(c3.pdf === null, 'ficha: un PDF fuera de nuestro bucket no se ofrece');
}

// ─── La lectura de rubros, sin red ─────────────────────────────────────────
// Rubros reales (del acervo) de tres tesis, citados en los formatos que pide
// el prompt de main.py. Lo que importa: a ningún registro se le atribuye el
// rubro de OTRO.
const RUB = {
    2011282: 'PÉRDIDA DE LA PATRIA POTESTAD. LA CAUSAL SE ACTUALIZA SI EL OBLIGADO SE ABSTIENE INJUSTIFICADAMENTE DE CUBRIR SUS DEBERES ALIMENTARIOS POR MÁS DE DOS MESES, AUNQUE POSTERIORMENTE CUMPLA CON EL PAGO DE ALIMENTOS O MUESTRE VOLUNTAD PARA HACERLO (ARTÍCULO 4.224, FRACCIÓN II, DEL CÓDIGO CIVIL DEL ESTADO DE MÉXICO).',
    198508: 'ALIMENTOS. LA INCAPACIDAD FÍSICA O MENTAL DE LOS PADRES, OBLIGA A LOS ASCENDIENTES MÁS PRÓXIMOS EN GRADO A PROPORCIONARLOS, PERO ESA EXIGENCIA NO EXISTE CUANDO EL PROGENITOR, DE MANERA IRRESPONSABLE Y VENTAJOSA, OCULTA SUS INGRESOS PARA EVADIR EL CUMPLIMIENTO DE SU OBLIGACIÓN.',
    2013967: 'ALIMENTOS VENCIDOS. FORMA EN QUE OPERAN EL PRINCIPIO DE IGUALDAD Y EL ESTÁNDAR DE PRUEBA CUANDO AQUÉLLOS DERIVAN DE UN ADEUDO CONTRAÍDO POR LOS ACREEDORES (LEGISLACIÓN DEL ESTADO DE QUERÉTARO).',
};
const TRES = ['2011282', '198508', '2013967'];
const INST = { 2011282: 'Primera Sala', 198508: 'Tribunales Colegiados de Circuito', 2013967: 'Plenos de Circuito' };
const EPOCA = { 2011282: 'Décima Época', 198508: 'Novena Época', 2013967: 'Décima Época' };
const FORMATOS = {
    // REGLA #5 del chat: el rubro delante del registro, una cita por párrafo.
    'chat, una por párrafo': TRES.map((r) => `> "${RUB[r]}" -- *${INST[r]}, Registro digital: ${r}* [Doc ID: ${T.idTesisV3(r)}]\n\nExplicación: sustenta el punto. [Doc ID: ${T.idTesisV3(r)}]\n`).join('\n'),
    'chat, una por renglón': TRES.map((r) => `> "${RUB[r]}" -- *${INST[r]}, Registro digital: ${r}* [Doc ID: ${T.idTesisV3(r)}]`).join('\n'),
    // FORMATO JUDICIAL (modo redacción): «Registro digital [número], [Época], [Tribunal]» y «de rubro:».
    'judicial, en prosa': TRES.map((r, i) => `${i ? 'Asimismo, resulta aplicable' : 'Sirve de apoyo'} la tesis con registro digital ${r}, ${EPOCA[r]}, ${INST[r]}, de rubro: «${RUB[r]}».`).join(' '),
    'judicial, el rubro en su párrafo': TRES.map((r) => `Resulta aplicable la tesis con registro digital ${r}, ${EPOCA[r]}, ${INST[r]}, de rubro:\n\n> «${RUB[r]}»\n`).join('\n'),
    // «Jurisprudencia: Época, Instancia, Registro digital, Rubro entre comillas».
    'redacción: época, instancia, registro, rubro': TRES.map((r) => `${EPOCA[r]}, ${INST[r]}, Registro digital: ${r}, «${RUB[r]}»`).join('\n\n'),
    // Un título en mayúsculas y una cita sin rubro debajo.
    'título y cita sin rubro': `### JURISPRUDENCIA Y TESIS APLICABLES\n\nLa Primera Sala (Registro digital: 2011282) sostuvo que el abandono de los deberes alimentarios actualiza la causal.`,
};
// [formato, lo que la lectura debe atribuir: registro → inicio del rubro, o '' = nada]
const LECTURAS = [
    ['chat, una por párrafo', { 2011282: 'PÉRDIDA', 198508: 'ALIMENTOS. LA', 2013967: 'ALIMENTOS VENCIDOS' }],
    ['chat, una por renglón', { 2011282: 'PÉRDIDA', 198508: 'ALIMENTOS. LA', 2013967: 'ALIMENTOS VENCIDOS' }],
    ['judicial, en prosa', { 2011282: '', 198508: '', 2013967: '' }],
    ['redacción: época, instancia, registro, rubro', { 2011282: '', 198508: '', 2013967: '' }],
    ['título y cita sin rubro', { 2011282: '' }],
];
console.log('\n   la lectura de rubros\n');
for (const [nombre, esperado] of LECTURAS) {
    const leido = rubrosPorRegistro(FORMATOS[nombre]);
    const malos = Object.entries(esperado).filter(([r, ini]) => (ini ? !(leido[r] || '').replace(/^["«]/, '').startsWith(ini) : Boolean(leido[r])));
    comprueba(!malos.length, `lectura «${nombre}»`, malos.length ? malos.map(([r]) => `${r} ← «${(leido[r] || '(nada)').slice(0, 30)}»`).join(' · ') : '');
}

// El préstamo que cruza renglones lo reconoce el sello, con los rubros reales.
{
    const texto = FORMATOS['judicial, el rubro en su párrafo'];
    const regs = registrosDeLaRespuesta(texto);
    const respuestas = Object.fromEntries(regs.map((r) => [r, { verificada: true, rubro: RUB[r] }]));
    const est = estadosDeLosRegistros(regs, respuestas, { rubros: rubrosPorRegistro(texto), corresponde: rubroCorresponde });
    comprueba(est.every((e) => e.estado === 'existe'), 'sello: rubro prestado de la cita de al lado no acusa (judicial, rubro en su párrafo)', est.map((e) => `${e.registro}:${e.estado}`).join(' '));
    // Pero el rubro de una tesis que NO está en la respuesta sí acusa.
    const ajeno = { 2011282: 'TUTELA JUDICIAL EFECTIVA. LOS ÓRGANOS ENCARGADOS DE ADMINISTRAR JUSTICIA' };
    const est2 = estadosDeLosRegistros(['2011282', '198508'], { 2011282: { verificada: true, rubro: RUB[2011282] }, 198508: { verificada: true, rubro: RUB[198508] } },
        { rubros: ajeno, corresponde: rubroCorresponde });
    comprueba(est2[0].estado === 'no_corresponde' && est2[1].estado === 'existe', 'sello: rubro de una tesis ajena sigue acusando', est2.map((e) => `${e.registro}:${e.estado}`).join(' '));
    // La regla de oro, aquí también: sin respuesta, o sin prueba, no hay invento.
    const est3 = estadosDeLosRegistros(['1', '2', '3', '4'], { 1: null, 2: { verificada: false, motivo: 'semanario_no_disponible' }, 3: { verificada: false, motivo: 'no_encontrada' }, 4: null },
        { fueraDelAcervo: ['4'], corresponde: rubroCorresponde });
    comprueba(est3.map((e) => e.estado).join() === 'sin_comprobar,sin_comprobar,no_existe,sin_comprobar', 'sello: sólo «no_encontrada» es invento; sin respuesta es sin comprobar', est3.map((e) => e.estado).join());
}

// ─── El sello de una respuesta, como lo arma SelloCitas ────────────────────
async function sello(texto, { semanario = comoVercel, fueraDelAcervo = [], pedir } = {}) {
    const registros = registrosDeLaRespuesta(texto);
    const rubros = rubrosPorRegistro(texto);
    const respuestas = {};
    for (const reg of registros) respuestas[reg] = (await T.comprobarTesis(reg, { api: API, semanario, pedir })).cuerpo;
    const filas = estadosDeLosRegistros(registros, respuestas, { rubros, fueraDelAcervo, corresponde: rubroCorresponde });
    const cuenta = (e) => filas.filter((f) => f.estado === e).length;
    const v = veredictoDelSello({
        noTrazadas: 0, fueraDeContexto: 0, sinComprobar: 0, fichasPendientes: 0, comprobandoRegistros: false,
        inventadas: cuenta('no_existe'), desviadas: cuenta('no_corresponde'), sinRegistro: 0, registrosSinComprobar: cuenta('sin_comprobar'),
    });
    return { filas: filas.map((f) => ({ reg: f.registro, estado: f.estado })), ...v };
}

if (SIN_RED) {
    console.log(`\n${fallos ? `${fallos} FALLOS` : 'todo en orden'} (sin red)`);
    process.exit(fallos ? 1 : 0);
}

// ─── 2. CON RED, CONTRA PRODUCCIÓN ─────────────────────────────────────────
console.log(`\n2. Contra producción (${API})\n`);

const BUENAS = {
    2011282: 'PÉRDIDA DE LA PATRIA POTESTAD. LA CAUSAL SE ACTUALIZA',
    198508: 'ALIMENTOS. LA INCAPACIDAD FÍSICA O MENTAL DE LOS PADRES',
    2013967: 'ALIMENTOS VENCIDOS. FORMA EN QUE OPERAN',
    2017562: 'PENSIÓN ALIMENTICIA DE UN MENOR. ANTE LA OMISIÓN',
    194378: 'FRAUDE ESPECÍFICO POR SIMULACIÓN.',
    190310: 'FRAUDE ESPECÍFICO PREVISTO EN EL ARTÍCULO 387',
    2011172: 'FRAUDE ESPECÍFICO. EL ARTÍCULO 306',
    164053: 'FRAUDE ESPECÍFICO POR DOBLE VENTA.',
};
for (const [reg, inicio] of Object.entries(BUENAS)) {
    const t0 = Date.now();
    const { cuerpo, guardable } = await T.comprobarTesis(reg, { api: API, semanario: comoVercel });
    comprueba(cuerpo.verificada === true && cuerpo.origen === 'acervo' && cuerpo.rubro.startsWith(inicio) && guardable,
        `buena ${reg} (Semanario vetado, como en Vercel)`, `${cuerpo.verificada ? cuerpo.rubro.slice(0, 60) : cuerpo.detalle} · ${Date.now() - t0} ms`);
}

// La ficha completa para el panel.
{
    const { cuerpo } = await T.comprobarTesis('2011282', { api: API, ficha: true, semanario: comoVercel });
    comprueba(cuerpo.verificada && cuerpo.clave === '1a. LXXIV/2016 (10a.)' && cuerpo.instancia === 'Primera Sala'
        && cuerpo.texto.startsWith('La pérdida de la patria potestad') && cuerpo.rubro.endsWith('ESTADO DE MÉXICO).')
        && /^https:\/\/storage\.googleapis\.com\/iurexia-leyes\/tesis\/201\/2011282\.pdf$/.test(cuerpo.pdf || ''),
        'ficha 2011282: clave, instancia, texto sin cabecera, rubro entero y PDF del bucket',
        `${cuerpo.clave} · ${cuerpo.tipoTesis} · ${cuerpo.pdf}`);
}

// Inventada y real-fuera-del-acervo, con el Semanario como lo ve Vercel.
for (const [reg, que] of [['9999999', 'inventada'], ['238212', 'real, Séptima Época, fuera del acervo']]) {
    const { cuerpo, guardable } = await T.comprobarTesis(reg, { api: API, semanario: comoVercel });
    comprueba(cuerpo.verificada === false && cuerpo.motivo === 'semanario_no_disponible' && !guardable,
        `${reg} ${que} → sin comprobar, NUNCA «no existe» por no estar en el acervo`, cuerpo.detalle);
}
// Las mismas, con el Semanario de verdad desde esta máquina (conexión doméstica).
for (const [reg, que] of [['9999999', 'inventada'], ['238212', 'real, fuera del acervo']]) {
    const { cuerpo } = await T.comprobarTesis(reg, { api: API });
    const desc = cuerpo.verificada ? `verificada en vivo: ${cuerpo.rubro.slice(0, 40)}` : `${cuerpo.motivo} (${cuerpo.detalle || ''})`;
    const bien = reg === '9999999' ? cuerpo.verificada === false : cuerpo.motivo !== 'no_encontrada';
    comprueba(bien, `${reg} ${que}, Semanario real desde esta máquina`, desc);
}

// ─── 3. EL SELLO DE PUNTA A PUNTA ──────────────────────────────────────────
console.log('\n3. El sello, con los formatos que pide el prompt\n');

// Formato de main.py (REGLA #5): > "[RUBRO]" -- *[instancia], Registro digital: [registro]* [Doc ID: uuid]
const cita = (rubro, instancia, reg) => `> "${rubro}" -- *${instancia}, Registro digital: ${reg}* [Doc ID: ${T.idTesisV3(reg)}]\n\nExplicación: el criterio sostiene lo que se viene razonando sobre el punto. [Doc ID: ${T.idTesisV3(reg)}]\n`;
const PENSION = [
    '### Jurisprudencia y tesis aplicables\n',
    cita('PÉRDIDA DE LA PATRIA POTESTAD. LA CAUSAL SE ACTUALIZA SI EL OBLIGADO SE ABSTIENE INJUSTIFICADAMENTE DE CUBRIR SUS DEBERES ALIMENTARIOS POR MÁS DE DOS MESES, AUNQUE POSTERIORMENTE CUMPLA CON EL PAGO DE ALIMENTOS O MUESTRE VOLUNTAD PARA HACERLO (ARTÍCULO 4.224, FRACCIÓN II, DEL CÓDIGO CIVIL DEL ESTADO DE MÉXICO).', 'Primera Sala', '2011282'),
    cita('ALIMENTOS. LA INCAPACIDAD FÍSICA O MENTAL DE LOS PADRES, OBLIGA A LOS ASCENDIENTES MÁS PRÓXIMOS EN GRADO A PROPORCIONARLOS, PERO ESA EXIGENCIA NO EXISTE CUANDO EL PROGENITOR, DE MANERA IRRESPONSABLE Y VENTAJOSA, OCULTA SUS INGRESOS PARA EVADIR EL CUMPLIMIENTO DE SU OBLIGACIÓN.', 'Tribunales Colegiados de Circuito', '198508'),
    cita('ALIMENTOS VENCIDOS. FORMA EN QUE OPERAN EL PRINCIPIO DE IGUALDAD Y EL ESTÁNDAR DE PRUEBA CUANDO AQUÉLLOS DERIVAN DE UN ADEUDO CONTRAÍDO POR LOS ACREEDORES (LEGISLACIÓN DEL ESTADO DE QUERÉTARO).', 'Plenos de Circuito', '2013967'),
    // El modelo recorta rubros: se comprueba que un recorte legítimo no acusa.
    cita('PENSIÓN ALIMENTICIA DE UN MENOR. ANTE LA OMISIÓN DE DECRETARLA Y PONER EN RIESGO LA SUBSISTENCIA DE AQUÉL, ES PRECISO DICTAR LA MEDIDA PERTINENTE…', 'Tribunales Colegiados de Circuito', '2017562'),
].join('\n');
const FRAUDE = [
    cita('FRAUDE ESPECÍFICO POR SIMULACIÓN. EL SOLO HECHO DE SUSCRIBIR UN PAGARÉ FICTICIO NO ACTUALIZA EL "ACTO JUDICIAL", NI INTEGRA LA TENTATIVA (LEGISLACIÓN DEL ESTADO DE NUEVO LEÓN).', 'Tribunales Colegiados de Circuito', '194378'),
    cita('FRAUDE ESPECÍFICO PREVISTO EN EL ARTÍCULO 387, FRACCIÓN VIII, DEL CÓDIGO PENAL (FRAUDE POR USURA).', 'Tribunales Colegiados de Circuito', '190310'),
    cita('FRAUDE ESPECÍFICO. EL ARTÍCULO 306, FRACCIÓN III, DEL CÓDIGO PENAL DEL ESTADO DE MÉXICO, AL EMPLEAR LOS TÉRMINOS "PROPIO" Y "LIBRE", RESPECTO DE UN BIEN DETERMINADO, NO VULNERA EL DERECHO FUNDAMENTAL A LA EXACTA APLICACIÓN DE LA LEY EN MATERIA PENAL, EN SU VERTIENTE DE TAXATIVIDAD.', 'Primera Sala', '2011172'),
    cita('FRAUDE ESPECÍFICO POR DOBLE VENTA. EL SUJETO PASIVO DEL DELITO, Y POR TANTO, QUIEN SE ENCUENTRA LEGITIMADO PARA QUERELLARSE, ES EL SEGUNDO COMPRADOR O ADQUIRIENTE DE LA COSA MUEBLE O RAÍZ (LEGISLACIÓN DEL ESTADO DE PUEBLA).', 'Tribunales Colegiados de Circuito', '164053'),
].join('\n');
// El caso del 8-ago-2026: registro real con el rubro de OTRA tesis.
const DESVIADA = cita('TUTELA JUDICIAL EFECTIVA. LOS ÓRGANOS ENCARGADOS DE ADMINISTRAR JUSTICIA DEBEN PRIVILEGIAR EL FONDO', 'Primera Sala', '2011282');
const MIXTA = cita('PÉRDIDA DE LA PATRIA POTESTAD. LA CAUSAL SE ACTUALIZA SI EL OBLIGADO SE ABSTIENE', 'Primera Sala', '2011282')
    + '\n' + cita('FUNDAMENTACION Y MOTIVACION.', 'Segunda Sala', '238212')
    + '\n' + cita('SUPLENCIA DE LA QUEJA DEFICIENTE EN MATERIA FAMILIAR. OPERA SIEMPRE', 'Primera Sala', '9999999');

const casos = [
    ['pensión (4 tesis)', PENSION, {}, 'verificado'],
    ['fraude (4 tesis)', FRAUDE, {}, 'verificado'],
    // Los formatos de redacción: con la lectura anterior, 2 de 3 «no corresponde» en falso.
    ...Object.entries(FORMATOS).map(([n, t]) => [`formato «${n}»`, t, {}, 'verificado']),
    ['registro real con rubro ajeno', DESVIADA, {}, 'problema'],
    ['mixta: buena + fuera del acervo + inventada', MIXTA, {}, 'incompleto'],
    ['mixta, con el backend marcando 9999999 fuera del contexto', MIXTA, { fueraDelAcervo: ['9999999'] }, 'problema'],
];
for (const [nombre, texto, extra, esperado] of casos) {
    const r = await sello(texto, extra);
    const resumen = r.filas.map((f) => `${f.reg}:${f.estado}`).join(' ');
    comprueba(r.tono === esperado, `sello «${nombre}» → ${esperado}`, `${r.tono} · «${r.titulo}» · ${resumen}`);
}

console.log(`\n${fallos ? `${fallos} FALLOS` : 'todo en orden'}`);
process.exit(fallos ? 1 : 0);
