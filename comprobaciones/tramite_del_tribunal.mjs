// EL TRÁMITE EN ESTE TRIBUNAL, PROBADO SIN SERVIDOR (3-oct-2026).
//
// David: «que el "adelanto" —que ahora serán resultandos y considerandos de
// procedencia, no adelanto— vayan impecables, disminuyendo el margen de error
// si el secretario introduce el auto de admisión y los datos correctos
// (fechas)». La pantalla le enseña el trámite —auto de Presidencia, turno,
// Ministerio Público, adhesivo, returno y lo reclamado o recurrido—
// prellenado con lo leído del auto, y lo manda como `tramite_json` con las
// claves planas del contrato (`ficha_tramite.de_formulario`). Aquí se
// comprueba, con el código REAL transpilado al vuelo y un fetch falso:
//
//   1 · las claves por tipo y la lectura tolerante (`tramiteDe`);
//   2 · lo que viaja (`tramiteParaEnviar`, `tramiteConLaFicha`): sólo lo que
//       aplica y tiene valor; un dato, un campo;
//   3 · /taller/desde-admision trae `ficha.tramite` normalizado;
//   4 · /taller/adelanto manda `tramite_json` y el auto, y nada si no hay;
//   5 · el HTML de la tarjeta en los cuatro tipos;
//   6 · el cableado de page.tsx y los textos visibles, leídos en su fuente.
//
// SEGUNDA RONDA (3-oct-2026):
//   7 · las tres claves nuevas (`fraccion_63`, `cuantia`,
//       `fundamento_surtimiento`) y sus campos en la tarjeta;
//   8 · la bandera de la cuenta (`EstadoPiloto.procedencia_por_tipo`): sin
//       ella, ni tarjeta ni `tramite_json` ni auto;
//   9 · el supervisor rotula «Antecedentes · A3», no «párrafo 0»;
//  10 · ningún texto visible de ConfirmarVolver, EntradaTaller, Espinazo y
//       FormularioEncargo dice «adelanto» (leído con el árbol de TypeScript:
//       los comentarios no cuentan, las claves internas tampoco).
//
// TERCERA RONDA (3-oct-2026, FIXES_R3 «G»):
//  11 · al retomar, lo leído vuelve marcado con su origen y NO viaja como
//       dato del secretario mientras no lo cambie o lo confirme (rev_6, el
//       AR del juzgado y el juicio cambiados sin aviso);
//  12 · el camino de SISE manda `tramite_json` (rev_6: la tarjeta se pintaba
//       y lo tecleado se tiraba);
//  13 · /taller/reglas-surtimiento con `papel=autoridad` cuando se sabe que
//       recurre una autoridad (rev_4 y rev_6), y la regla que cambia sola lo
//       dice;
//  14 · la vía de presentación no está en la pantalla: el valor «tribunal»
//       no se puede elegir ni proponer aquí (rev_1).
//
// CUARTA RONDA (3-oct-2026, FIXES_R4 «G»):
//  15 · el auto que forma y registra, aparte del que admite (`fecha_registro`,
//       la clave 21; E7): Q_335 y RF_7, donde la fecha de la admisión salía
//       también como la del registro;
//  16 · el ponente se pide con su cargo (E3): el rótulo de la carátula sale
//       de lo escrito, nunca del nombre de pila;
//  17 · las claves de la pantalla son las de `ficha_tramite.CLAVES_FORMULARIO`
//       del servidor, si está al lado (IUREXIA_API, o la carpeta hermana).
//
// QUINTA RONDA (3-oct-2026, visto bueno de David, contrato C1-C8):
//  18 · los asuntos relacionados (C6, la clave 22): sólo si el secretario los
//       marca; serializar y leer 0, 1, 3 e inválidos; retomar; el interruptor
//       y sus filas, vivos; nunca leídos del auto;
//  19 · el órgano en los tres recursos (C3 y C4: la carátula de la queja y la
//       de la revisión fiscal ya no lo llevan) y ningún texto de la tarjeta
//       reproduce los renglones quitados ni la existencia del AR (C1).
//
//   TMPDIR=<scratchpad> node comprobaciones/tramite_del_tribunal.mjs
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
const REACT_DOM = requerir.resolve('react-dom');
const LUCIDE = requerir.resolve('lucide-react');

let fallas = 0, bien = 0;
function ok(cond, que) {
    if (cond) { bien += 1; return; }
    fallas += 1;
    console.log(`  FALLA · ${que}`);
}
/* UNA SECCIÓN QUE REVIENTA CUENTA COMO FALLA Y SE NOMBRA (tercera ronda): con
   el código de antes faltan funciones enteras, y una excepción cortaba la
   lista entera sin decir qué faltaba. */
async function seccion(nombre, fn) {
    try { await fn(); } catch (e) {
        fallas += 1;
        console.log(`  FALLA · ${nombre} — revienta: ${e instanceof Error ? e.message : String(e)}`);
    }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tramite-tribunal-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));
const SENT = 'src/components/sentencia';
const conReact = [['require("react")', `require(${JSON.stringify(REACT)})`],
                  ['require("react-dom")', `require(${JSON.stringify(REACT_DOM)})`],
                  ['require("lucide-react")', `require(${JSON.stringify(LUCIDE)})`]];
for (const f of ['api.ts', 'tipos.ts', 'primitivas.tsx', 'Calendario.tsx', 'TramiteDelTribunal.tsx',
                 'CorreccionesDelSupervisor.tsx', 'ConfirmarVolver.tsx', 'Espinazo.tsx']) {
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
const TramMod = req('./TramiteDelTribunal.js');
const Tarjeta = TramMod.default;

const fetchReal = globalThis.fetch;
const conFetch = async (fn, alPedir) => {
    globalThis.fetch = alPedir;
    try { return await fn(); } finally { globalThis.fetch = fetchReal; }
};
const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });

/* ═══ 1 · LAS CLAVES POR TIPO Y LA LECTURA TOLERANTE ═══ */
{
    ok(api.familiaDelTramite('amparo_directo') === 'AD' && api.familiaDelTramite('amparo_revision') === 'AR'
       && api.familiaDelTramite('queja') === 'Q' && api.familiaDelTramite('revision_fiscal') === 'RF'
       && api.familiaDelTramite('') === '', 'las cuatro familias, y ninguna sin tipo');
    const de = (t) => new Set(api.clavesDelTramite(t));
    const AD = de('amparo_directo'), AR = de('amparo_revision'), Q = de('queja'), RF = de('revision_fiscal');
    ok(AD.has('toca') && !AR.has('toca') && !Q.has('toca') && !RF.has('toca'), 'el toca, sólo en el amparo directo');
    ok(Q.has('fecha_informe_101') && !AD.has('fecha_informe_101') && !RF.has('fecha_informe_101'),
       'el informe del 101, sólo en la queja');
    ok(RF.has('deposito_postal') && !AD.has('deposito_postal') && !AR.has('deposito_postal'),
       'el depósito postal, sólo en la revisión fiscal');
    ok(['adhesivo_quien', 'adhesivo_presentacion', 'adhesivo_admision', 'adhesivo_notificacion']
           .every((k) => AD.has(k) && AR.has(k) && RF.has(k) && !Q.has(k)),
       'el adhesivo en AD, AR y RF; nunca en la queja');
    ok(['fecha_admision', 'fecha_turno', 'ponente_turno', 'fecha_returno', 'ponente_returno',
        'ministerio_publico', 'fecha_acto', 'organo_acto', 'expediente_origen']
           .every((k) => AD.has(k) && AR.has(k) && Q.has(k) && RF.has(k)),
       'admisión, turno, returno, MP, fecha y órgano del acto y juicio de origen, en los cuatro');
    ok(api.clavesDelTramite('').length === 0, 'sin tipo, ninguna clave');
    ok(!AD.has('forma_notificacion') && !AR.has('forma_notificacion'),
       'la forma de notificación no viaja: ya se declara en «Cómo se notificó»');
    // Las claves son las del contrato §1.1 y ninguna más.
    const CONTRATO = ['fecha_admision', 'fecha_turno', 'ponente_turno', 'fecha_returno', 'ponente_returno',
        'ministerio_publico', 'adhesivo_quien', 'adhesivo_presentacion', 'adhesivo_admision',
        'adhesivo_notificacion', 'fecha_acto', 'organo_acto', 'toca', 'expediente_origen',
        'fecha_informe_101', 'deposito_postal', 'forma_notificacion',
        // Segunda ronda (3-oct-2026): las tres de ficha_tramite.CLAVES_FORMULARIO.
        'fraccion_63', 'cuantia', 'fundamento_surtimiento',
        // Cuarta ronda (3-oct-2026, E7): el auto que forma y registra.
        'fecha_registro',
        // Quinta (3-oct-2026, C6): los asuntos relacionados que marca el secretario.
        'relacionados'];
    ok(CONTRATO.length === 22 && api.CLAVES_TRAMITE.length === 22
       && JSON.stringify([...api.CLAVES_TRAMITE].sort()) === JSON.stringify([...CONTRATO].sort()),
       'CLAVES_TRAMITE = las 22 claves planas del contrato, exactas');

    const t = api.tramiteDe({
        fecha_admision: '2026-03-04T00:00:00', fecha_turno: '4 de marzo', ponente_turno: '  Magistrada Ana Pérez ',
        ministerio_publico: 'omitio', toca: '', inventada: 'x', fecha_acto: '2026-01-15', organo_acto: 7,
    });
    ok(t.fecha_admision === '2026-03-04', 'fecha con hora: se queda el día ISO');
    ok(!('fecha_turno' in t), 'fecha que no es ISO: fuera (nunca una fecha a medio leer)');
    ok(t.ponente_turno === 'Magistrada Ana Pérez', 'el nombre, sin espacios de sobra y tal cual');
    ok(!('ministerio_publico' in t), 'el MP sólo admite pedimento / sin_pedimento');
    ok(!('toca' in t) && !('inventada' in t) && !('organo_acto' in t), 'vacíos, ajenos y no-cadenas: fuera');
    ok(api.tramiteDe('{"ministerio_publico":"sin_pedimento"}').ministerio_publico === 'sin_pedimento',
       'también se lee su JSON');
    ok(JSON.stringify(api.tramiteDe('no es json')) === '{}' && JSON.stringify(api.tramiteDe(null)) === '{}'
       && JSON.stringify(api.tramiteDe([1, 2])) === '{}', 'lo que no se entiende da un trámite vacío, no un error');
}

/* ═══ 2 · LO QUE VIAJA ═══ */
{
    const lleno = {
        fecha_admision: '2026-03-04', fecha_turno: '2026-03-10', ponente_turno: 'Magistrado Juan Ruiz',
        ministerio_publico: '', toca: '45/2025', expediente_origen: '120/2024', fecha_informe_101: '2026-03-08',
        deposito_postal: '2026-02-20', adhesivo_quien: 'Rosa Gómez', fecha_acto: '2026-01-15', forma_notificacion: 'oficio',
    };
    const ad = api.tramiteParaEnviar(lleno, 'amparo_directo');
    ok(ad.toca === '45/2025' && ad.expediente_origen === '120/2024' && ad.adhesivo_quien === 'Rosa Gómez',
       'AD: toca, expediente y adhesivo viajan');
    ok(!('fecha_informe_101' in ad) && !('deposito_postal' in ad) && !('forma_notificacion' in ad),
       'AD: lo de otros tipos (informe del 101, depósito postal) y lo que no se pide, no');
    ok(!('ministerio_publico' in ad), 'MP «no consta» (vacío): no viaja, el proyecto calla');
    const q = api.tramiteParaEnviar(lleno, 'queja');
    ok(q.fecha_informe_101 === '2026-03-08' && !('toca' in q) && !('adhesivo_quien' in q),
       'Q: el informe sí; el toca y el adhesivo no');
    const rf = api.tramiteParaEnviar(lleno, 'revision_fiscal');
    ok(rf.deposito_postal === '2026-02-20' && !('toca' in rf), 'RF: el depósito postal sí; el toca no');
    ok(JSON.stringify(api.tramiteParaEnviar({}, 'amparo_directo')) === '{}'
       && JSON.stringify(api.tramiteParaEnviar(lleno, '')) === '{}', 'vacío o sin tipo: nada');

    const conF = TramMod.tramiteConLaFicha;
    // Un dato, un campo: en el AD, el órgano del acto ES la figura de la carátula.
    let x = conF({ organo_acto: 'Sala leída del auto' }, 'amparo_directo', { responsable: ' Sala Civil del TSJ ' });
    ok(x.organo_acto === 'Sala Civil del TSJ', 'AD: organo_acto = la autoridad responsable de la ficha');
    x = conF({ organo_acto: 'Sala leída del auto' }, 'amparo_directo', {});
    ok(api.tramiteParaEnviar(x, 'amparo_directo').organo_acto === undefined,
       'AD sin responsable en la ficha: no viaja el órgano que propuso el auto y nadie vio');
    // DESDE C3 Y C4 (3-oct-2026) la carátula de la queja y la de la revisión
    // fiscal ya no piden el órgano: su campo es el de la tarjeta. Esta
    // comprobación esperaba antes que en la queja mandara la ficha.
    x = conF({ organo_acto: 'Juzgado Segundo de Distrito (prueba)' }, 'queja', { responsable: 'Otro (prueba)' });
    ok(api.tramiteParaEnviar(x, 'queja').organo_acto === 'Juzgado Segundo de Distrito (prueba)',
       'Q: el órgano de la tarjeta viaja; la responsable de la ficha ya no lo pisa (C3)');
    x = conF({}, 'revision_fiscal', { responsable: 'Sala leída del auto (prueba)' });
    ok(api.tramiteParaEnviar(x, 'revision_fiscal').organo_acto === undefined,
       'RF: la responsable que la ficha leyó del auto, que ya no se ve en la carátula (C4), no viaja como órgano');
    x = conF({ organo_acto: 'Juzgado Primero de Distrito' }, 'amparo_revision', { responsable: 'Director de Ingresos' });
    ok(x.organo_acto === 'Juzgado Primero de Distrito', 'AR: el juzgado de la tarjeta manda; la responsable del juicio no lo pisa');
    // El adhesivo de la revisión: el de la carátula si aquí no se tocó.
    x = conF({}, 'amparo_revision', { adherente: 'Tercera S.A. de C.V.' });
    ok(x.adhesivo_quien === 'Tercera S.A. de C.V.', 'AR: el recurrente adhesivo de la carátula viaja como adhesivo_quien');
    x = conF({ adhesivo_quien: '' }, 'amparo_revision', { adherente: 'Tercera S.A. de C.V.' });
    ok(x.adhesivo_quien === '' && !('adhesivo_quien' in api.tramiteParaEnviar(x, 'amparo_revision')),
       'AR: «no hubo revisión adhesiva» (vaciado a propósito) manda sobre la carátula');
    x = conF({}, 'amparo_directo', { adherente: 'X' });
    ok(x.adhesivo_quien === undefined, 'el adherente de la carátula sólo cuenta en la revisión');
}

/* ═══ 3 · /taller/desde-admision TRAE EL TRÁMITE ═══ */
{
    const archivo = new File(['%PDF'], 'auto.pdf', { type: 'application/pdf' });
    let pedido = null;
    let r = await conFetch(() => api.fichaDesdeAdmision('x@y.mx', archivo), async (url, init) => {
        pedido = { url: String(url), body: init?.body };
        return json({ ficha: { numero: '12/2026', tipo_asunto: 'queja',
                               tramite: { fecha_admision: '2026-03-04', ministerio_publico: 'pedimento',
                                          fecha_turno: 'ayer', otra: 'x' } },
                      leidos: ['numero'], avisos: [], reglas_surtimiento: null });
    });
    ok(pedido.url.endsWith('/taller/desde-admision') && pedido.body.get('admision') instanceof File,
       'el auto va a /taller/desde-admision como siempre');
    ok(r.ficha.numero === '12/2026' && r.ficha.tramite.fecha_admision === '2026-03-04'
       && r.ficha.tramite.ministerio_publico === 'pedimento', 'ficha.tramite llega con sus claves');
    ok(!('fecha_turno' in r.ficha.tramite) && !('otra' in r.ficha.tramite), 'y normalizado: lo que no se entiende, fuera');
    r = await conFetch(() => api.fichaDesdeAdmision('x@y.mx', archivo), async () =>
        json({ ficha: { numero: '12/2026' }, leidos: [], avisos: [] }));
    ok(JSON.stringify(r.ficha.tramite) === '{}', 'un servidor que aún no lo manda: trámite vacío, nada se rompe');
}

/* ═══ 4 · /taller/adelanto MANDA EL TRÁMITE Y EL AUTO ═══ */
{
    const pdf = (n) => new File(['%PDF'], n, { type: 'application/pdf' });
    const ENC = { numero: '512/2026', encabezado: '', quejoso: 'Q', magistrado: 'M', secretario: 'S',
                  notificacion: '2026-02-02', presentacion: '2026-02-10', tipoAsunto: 'amparo_directo' };
    const docx = () => new Response(new Blob(['docx']), { status: 200 });
    let fd = null, url = '';
    let r = await conFetch(() => api.generarAdelanto(
        { ...ENC, tramite: { fecha_admision: '2026-03-04', toca: '45/2025', fecha_informe_101: '2026-03-08',
                             ministerio_publico: '', ponente_turno: '' } },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf'), admision: pdf('auto.pdf') }, 'x@y.mx'),
        async (u, init) => { url = String(u); fd = init.body; return docx(); });
    ok(url.endsWith('/taller/adelanto'), 'la ruta no cambia: /taller/adelanto');
    const tj = JSON.parse(fd.get('tramite_json'));
    ok(tj.fecha_admision === '2026-03-04' && tj.toca === '45/2025', 'tramite_json lleva lo confirmado');
    ok(!('fecha_informe_101' in tj) && !('ministerio_publico' in tj) && !('ponente_turno' in tj),
       'y sólo lo que aplica al tipo y tiene valor');
    ok(fd.get('admision') instanceof File && fd.get('admision').name === 'auto.pdf', 'el auto de admisión viaja');
    ok(r.nombre === '512-2026 PROCEDENCIA.docx', 'sin nombre del servidor, el archivo ya no se llama «ADELANTO»');
    r = await conFetch(() => api.generarAdelanto(ENC, { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'),
        async (u, init) => { fd = init.body; return docx(); });
    ok(fd.get('tramite_json') === null && fd.get('admision') === null,
       'sin trámite ni auto no se manda nada: el servidor sigue como estaba');
    r = await conFetch(() => api.generarAdelanto({ ...ENC, tramite: { ministerio_publico: '' } },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'),
        async (u, init) => { fd = init.body; return docx(); });
    ok(fd.get('tramite_json') === null, 'un trámite todo vacío tampoco viaja');
}

/* ═══ 5 · LA TARJETA, EN LOS CUATRO TIPOS ═══ */
{
    const nada = () => {};
    const html = (props) => pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, ...props }));
    const ad = html({ tipoAsunto: 'amparo_directo' });
    ok(ad.includes('Trámite en este tribunal') && ad.includes('Auto de Presidencia (admisión)')
       && ad.includes('Auto de turno') && ad.includes('Ponente a quien se turnó'), 'AD: admisión, turno y ponente');
    ok(ad.includes('Toca de apelación') && ad.includes('Expediente de origen') && ad.includes('Fecha de la sentencia reclamada'),
       'AD: toca, expediente de origen y fecha de la reclamada');
    ok(ad.includes('+ Hubo amparo adhesivo') && ad.includes('+ Hubo returno'), 'AD: adhesivo y returno, plegados');
    ok(!ad.includes('Juzgado que la dictó') && !ad.includes('informe con justificación') && !ad.includes('Servicio Postal'),
       'AD: ni el juzgado (es la responsable de la ficha), ni el 101, ni el correo');
    ok(ad.includes('No consta — no se menciona') && ad.includes('Formuló pedimento') && ad.includes('No formuló pedimento')
       && /<option value=""[^>]*selected=""[^>]*>No consta/.test(ad), 'MP: tres opciones, «no consta» por omisión');
    ok(ad.includes('«*********»') && !/adelanto/i.test(ad), 'dice qué pasa con lo vacío y no dice «adelanto»');

    const ar = html({ tipoAsunto: 'amparo_revision', adherente: 'Tercera S.A. de C.V.' });
    ok(ar.includes('Juzgado que la dictó') && ar.includes('Juicio de amparo indirecto')
       && ar.includes('Fecha de la sentencia recurrida'), 'AR: juzgado, juicio de amparo y fecha de la recurrida');
    ok(ar.includes('value="Tercera S.A. de C.V."') && ar.includes('Es el recurrente adhesivo que escribiste en la ficha')
       && ar.includes('no hubo revisión adhesiva'), 'AR: la revisión adhesiva se abre con el adherente de la carátula');
    ok(html({ tipoAsunto: 'amparo_revision' }).includes('+ Hubo revisión adhesiva'), 'AR sin adherente: plegada');

    const q = html({ tipoAsunto: 'queja' });
    ok(q.includes('Fecha del auto recurrido') && q.includes('Juicio de amparo de origen')
       && q.includes('Auto que tuvo por rendido el informe con justificación') && q.includes('fracción II'),
       'Q: fecha del auto, juicio de origen e informe del 101 (fracción II)');
    ok(!q.includes('adhesiv') && !q.includes('Toca de apelación'), 'Q: sin adhesivo ni toca');

    const rf = html({ tipoAsunto: 'revision_fiscal' });
    ok(rf.includes('Juicio contencioso administrativo') && rf.includes('Depósito en el Servicio Postal Mexicano')
       && rf.includes('+ Hubo revisión adhesiva'), 'RF: juicio contencioso, depósito postal y adhesión');
    ok(html({ tipoAsunto: '' }) === '', 'sin tipo, la tarjeta no se pinta');

    // Lo leído del auto se marca mientras siga igual; editado, la marca se va.
    const leido = { fecha_admision: '2026-03-04', ponente_turno: 'Magistrada Ana' };
    const conLeido = html({ tipoAsunto: 'queja', leido, valor: { ...leido } });
    ok((conLeido.match(/>del auto · compruébalo</g) || []).length === 2 && conLeido.includes('>leído del auto<'),
       'lo leído del auto lleva su marca');
    const editado = html({ tipoAsunto: 'queja', leido, valor: { ...leido, ponente_turno: 'Magistrado Otro' } });
    ok((editado.match(/>del auto · compruébalo</g) || []).length === 1, 'lo que el secretario cambió ya no se marca «del auto»');
    const conRet = html({ tipoAsunto: 'queja', valor: { fecha_returno: '2026-04-01' } });
    ok(conRet.includes('Ponente a quien se returnó') && conRet.includes('no hubo returno'), 'con returno leído, se abre solo');
    ok(html({ tipoAsunto: 'queja', deshabilitado: true }).includes('<fieldset disabled=""'),
       'deshabilitada como la ficha mientras corre o fuera del paso 1');
}

/* ═══ 6 · EL CABLEADO DE page.tsx Y LOS TEXTOS VISIBLES ═══ */
{
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    ok((pag.match(/tramite: tramiteDelEnvio \}/g) || []).length === 2
       && (pag.match(/admision: autoDelEnvio \}/g) || []).length === 2,
       'los dos caminos que generan (paso a paso y «Genera todo») mandan trámite y auto');
    ok(/const fichaJsx = !procedenciaPorTipo \? formularioJsx : \([\s\S]{0,600}<TramiteDelTribunal valor=\{tramite\} onCambiar=\{setTramite\}/.test(pag),
       'la tarjeta va con la ficha, en todas partes donde la ficha se pinta (con la bandera)');
    ok(/fichaDesdeAdmision\(correo, archivo\);\s*setAutoAdmision\(archivo\);/.test(pag)
       && /setTarjetaTramite\(\(prev\) => conLoLeidoDelAuto\(prev, leido\)\);/.test(pag),
       'leer el auto guarda el papel y propone el trámite');
    // Lo leído no pisa lo escrito: ahora en una función pura (ver la sección 11).
    await seccion('6 · lo leído no pisa lo escrito', () => {
        const e = TramMod.conLoLeidoDelAuto({ ...TramMod.TRAMITE_VACIO, valor: { ponente_turno: 'Lo escrito (prueba)' } },
                                            { ponente_turno: 'Lo leído (prueba)', fecha_turno: '2026-03-10' });
        ok(e.valor.ponente_turno === 'Lo escrito (prueba)' && e.valor.fecha_turno === '2026-03-10',
           'lo leído no pisa lo que el secretario ya escribió');
    });
    ok(/setEncargo\(ENCARGO_VACIO\);\s*setTarjetaTramite\(TRAMITE_VACIO\); setAutoAdmision\(null\);/.test(pag),
       'salir al historial vacía el trámite y el auto');
    ok(/\.\.\.\(tramiteDelEnvio \? \[tramiteParaEnviar\(tramiteDelEnvio, encargo\.tipoAsunto\)\] : \[\]\),\s*\]\), \[encargo, tramiteDelEnvio\]\);/.test(pag),
       'la huella de la ficha incluye el trámite (con la bandera): cambiarlo tras leer avisa');
    // Lo visible ya no dice «adelanto»; las rutas, claves y nombres no cambian.
    ok(!pag.includes("'Generar el adelanto'") && !/>\s*Generar adelanto\s*</.test(pag)
       && (pag.match(/Generar resultandos y considerandos de procedencia/g) || []).length === 2,
       'los dos botones: «Generar resultandos y considerandos de procedencia»');
    ok(!pag.includes('No se pudo generar el adelanto.') && !pag.includes('Vuelve a generar el adelanto')
       && !pag.includes('generar el adelanto para que el cambio entre')
       && !pag.includes('huecos del adelanto'), 'ni los avisos ni las fases dicen «adelanto»');
    ok(pag.includes("type Paso = 'ficha' | 'adelanto'") && pag.includes('generarAdelanto(')
       && fs.readFileSync(path.join(RAIZ, SENT, 'api.ts'), 'utf8').includes('`${BASE}/taller/adelanto`'),
       'las claves internas, las funciones y la ruta siguen igual');
}

/* ═══ 7 · LAS TRES CLAVES NUEVAS (segunda ronda, 3-oct-2026) ═══ */
{
    const de = (t) => new Set(api.clavesDelTramite(t));
    const AD = de('amparo_directo'), AR = de('amparo_revision'), Q = de('queja'), RF = de('revision_fiscal');
    ok(AD.has('fundamento_surtimiento') && !AR.has('fundamento_surtimiento') && !Q.has('fundamento_surtimiento')
       && !RF.has('fundamento_surtimiento'), 'el precepto del surtimiento, sólo en el amparo directo');
    ok(RF.has('fraccion_63') && RF.has('cuantia') && !AD.has('fraccion_63') && !AR.has('cuantia') && !Q.has('fraccion_63'),
       'la fracción del 63 y la cuantía, sólo en la revisión fiscal');
    ok(JSON.stringify(api.FRACCIONES_63) === JSON.stringify(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']),
       'las diez fracciones del 63, en romano y en orden');

    const t = api.tramiteDe({ fraccion_63: ' vi ', cuantia: ' 1,250,000.00 ', fundamento_surtimiento: '  el artículo 126 del Código  ' });
    ok(t.fraccion_63 === 'VI', 'la fracción se lee en romano mayúsculo (« vi » → «VI»)');
    ok(t.cuantia === '1,250,000.00', 'la cuantía, tal cual y sin espacios de sobra');
    ok(t.fundamento_surtimiento === 'el artículo 126 del Código', 'el precepto, tal cual (se copia al considerando)');
    ok(api.tramiteDe({ fraccion_63: 'fracción ix.' }).fraccion_63 === 'IX', '«fracción ix.» → «IX»');
    ok(!('fraccion_63' in api.tramiteDe({ fraccion_63: 'XI' })) && !('fraccion_63' in api.tramiteDe({ fraccion_63: 'primera' })),
       'una fracción que no es de la I a la X no se adivina: fuera');
    ok(!('cuantia' in api.tramiteDe({ cuantia: 'indeterminada' })), 'una cuantía sin cifra no es un monto: fuera');

    const rf = { fraccion_63: 'I', cuantia: '5,000,000', fundamento_surtimiento: 'el artículo 126', fecha_admision: '2026-03-04' };
    let x = api.tramiteParaEnviar(rf, 'revision_fiscal');
    ok(x.fraccion_63 === 'I' && x.cuantia === '5,000,000' && !('fundamento_surtimiento' in x),
       'RF con fracción I: viajan la fracción y la cuantía; el precepto del surtimiento no');
    x = api.tramiteParaEnviar({ ...rf, fraccion_63: 'VI' }, 'revision_fiscal');
    ok(x.fraccion_63 === 'VI' && !('cuantia' in x), 'RF con otra fracción: la cuantía (ya oculta) no viaja');
    x = api.tramiteParaEnviar({ ...rf, fraccion_63: '' }, 'revision_fiscal');
    ok(!('fraccion_63' in x) && !('cuantia' in x), '«que lo decida el proyecto»: ni fracción ni cuantía');
    x = api.tramiteParaEnviar(rf, 'amparo_directo');
    ok(x.fundamento_surtimiento === 'el artículo 126' && !('fraccion_63' in x) && !('cuantia' in x),
       'AD: el precepto viaja; la fracción y la cuantía no');

    const nada = () => {};
    const html = (props) => pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, ...props }));
    const ad = html({ tipoAsunto: 'amparo_directo' });
    // LA AYUDA ES NEUTRA desde la segunda ronda: citaba el CPC de Querétaro, un
    // localismo en un producto para toda la república. La comprobación seguía
    // esperando el ejemplo viejo y fallaba (3-oct-2026).
    ok(ad.includes('Precepto que rige el surtimiento de la notificación')
       && ad.includes('Como lo diría el considerando, con su artículo y su ley: &quot;el artículo … del Código de Procedimientos Civiles del Estado de …&quot;')
       && !ad.includes('Querétaro'),
       'AD: el precepto del surtimiento, con su ayuda (sin el localismo de Querétaro)');
    ok(!ad.includes('Fracción del artículo 63') && !ad.includes('Cuantía (pesos)'), 'AD: sin fracción ni cuantía');
    for (const tipo of ['amparo_revision', 'queja', 'revision_fiscal']) {
        ok(!html({ tipoAsunto: tipo }).includes('Precepto que rige el surtimiento'), `${tipo}: sin el precepto del surtimiento`);
    }
    const rfh = html({ tipoAsunto: 'revision_fiscal' });
    ok(rfh.includes('Procedencia del recurso') && rfh.includes('Fracción del artículo 63 de la LFPCA')
       && /<option value=""[^>]*selected=""[^>]*>No sé \/ que lo decida el proyecto</.test(rfh),
       'RF: la fracción del 63, con «No sé / que lo decida el proyecto» vacío y elegido por omisión');
    ok(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].every((r) => rfh.includes(`<option value="${r}"`)),
       'RF: el selector va de la I a la X');
    ok(!rfh.includes('Cuantía (pesos)'), 'RF sin fracción: la cuantía no se pide');
    ok(!html({ tipoAsunto: 'revision_fiscal', valor: { fraccion_63: 'VI' } }).includes('Cuantía (pesos)'),
       'RF con la fracción VI: la cuantía no se pide');
    const rfI = html({ tipoAsunto: 'revision_fiscal', valor: { fraccion_63: 'I', cuantia: '5,000,000' } });
    ok(rfI.includes('Cuantía (pesos)') && rfI.includes('value="5,000,000"') && rfI.includes('inputMode="decimal"'),
       'RF con la fracción I: se pide la cuantía');
    ok(/<option value="I"[^>]*selected=""[^>]*>Fracción I · cuantía</.test(rfI)
       && !/<option value="II"[^>]*selected=""/.test(rfI), 'RF: la fracción elegida se ve, y sólo ella');
    ok(!html({ tipoAsunto: 'queja' }).includes('Fracción del artículo 63'), 'Q: sin la fracción del 63');
    const leidoRf = html({ tipoAsunto: 'revision_fiscal', leido: { fraccion_63: 'II' }, valor: { fraccion_63: 'II' } });
    ok((leidoRf.match(/>del auto · compruébalo</g) || []).length === 1, 'la fracción leída del auto lleva su marca');
}

/* ═══ 8 · LA BANDERA DE LA CUENTA (`procedencia_por_tipo`) ═══ */
{
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    const apiSrc = fs.readFileSync(path.join(RAIZ, SENT, 'api.ts'), 'utf8');
    ok(/export interface EstadoPiloto \{[\s\S]*?procedencia_por_tipo\?: boolean;[\s\S]*?\n\}/.test(apiSrc),
       'EstadoPiloto trae procedencia_por_tipo?: boolean');
    ok(pag.includes('const procedenciaPorTipo = piloto?.procedencia_por_tipo === true;'),
       'la bandera la decide el servidor; sin respuesta, apagada');
    ok(pag.includes('const tramiteDelEnvio = procedenciaPorTipo ? tramiteAEnviar : undefined;')
       && pag.includes('const autoDelEnvio = procedenciaPorTipo ? (autoAdmision ?? undefined) : undefined;'),
       'sin la bandera no viajan ni el trámite ni el auto');
    ok(!/tramite: tramiteAEnviar|admision: autoAdmision/.test(pag), 'ningún envío se salta la bandera');
    ok(/const formularioJsx = \(\s*<FormularioEncargo /.test(pag)
       && (pag.match(/<TramiteDelTribunal /g) || []).length === 1,
       'sin la bandera, la ficha se pinta sola, sin envoltorio; la tarjeta sólo en un sitio');
    // Lo que de verdad sale: con la bandera apagada, la petición es la de antes.
    const pdf = (n) => new File(['%PDF'], n, { type: 'application/pdf' });
    const ENC = { numero: '512/2026', encabezado: '', quejoso: 'Q', magistrado: 'M', secretario: 'S',
                  notificacion: '2026-02-02', presentacion: '2026-02-10', tipoAsunto: 'amparo_directo' };
    let fd = null;
    await conFetch(() => api.generarAdelanto({ ...ENC, tramite: undefined },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf'), admision: undefined }, 'x@y.mx'),
        async (u, init) => { fd = init.body; return new Response(new Blob(['docx']), { status: 200 }); });
    ok(fd.get('tramite_json') === null && fd.get('admision') === null
       && JSON.stringify([...fd.keys()].sort()) === JSON.stringify([...fd.keys()].filter((k) => k !== 'tramite_json' && k !== 'admision').sort()),
       'bandera apagada (trámite y auto undefined): ni tramite_json ni admision en el formulario');
    // Con la bandera, las claves nuevas viajan dentro de tramite_json.
    await conFetch(() => api.generarAdelanto({ ...ENC, tipoAsunto: 'revision_fiscal',
                                                tramite: { fraccion_63: 'I', cuantia: '5,000,000', fecha_admision: '2026-03-04' } },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'),
        async (u, init) => { fd = init.body; return new Response(new Blob(['docx']), { status: 200 }); });
    const tj = JSON.parse(fd.get('tramite_json'));
    ok(tj.fraccion_63 === 'I' && tj.cuantia === '5,000,000' && tj.fecha_admision === '2026-03-04',
       'con la bandera, fraccion_63 y cuantia viajan en tramite_json con su nombre');
}

/* ═══ 9 · EL SUPERVISOR: «Antecedentes · A3», NO «párrafo 0» ═══ */
{
    const SupMod = req('./CorreccionesDelSupervisor.js');
    const s = api.supervisorDe({ estado: 'aplicado', modelo: 'm', segundos: 24, correcciones: [
        { tipo: 'error_juridico', parrafo: 0, seccion: 'antecedentes', bloque: 'A6', antes: 'Segunda Sala (prueba)',
          despues: 'Primera Sala (prueba)', accion: 'reemplazar', motivo: 'el acto dice Primera (prueba)' },
        { tipo: 'repeticion', parrafo: 0, seccion: 'antecedentes', bloque: 'a10', antes: 'lo repetido (prueba)',
          despues: '', accion: 'eliminar', motivo: 'repite A9' },
        { tipo: 'redaccion', parrafo: 7, seccion: 'antecedentes', bloque: 'P7', antes: 'x (prueba)', despues: 'y (prueba)', motivo: 'm' },
        { tipo: 'cita', parrafo: 4, antes: 'antes (prueba)', despues: 'después (prueba)', motivo: 'motivo (prueba)' }] });
    ok(s.correcciones[0].seccion === 'antecedentes' && s.correcciones[0].bloque === 'A6' && s.correcciones[0].parrafo === 0,
       'supervisorDe lee la sección y el bloque');
    ok(s.correcciones[1].bloque === 'A10', 'el bloque se normaliza («a10» → «A10»)');
    ok(s.correcciones[2].bloque === '' && s.correcciones[2].parrafo === 0,
       'un bloque que no es «A…» no se pinta como ubicación, ni su párrafo como del estudio');
    ok(s.correcciones[3].seccion === undefined && s.correcciones[3].parrafo === 4, 'lo del estudio, como siempre');
    ok(SupMod.ubicacionDeCorreccion(s.correcciones[0]) === 'Antecedentes · A6'
       && SupMod.ubicacionDeCorreccion(s.correcciones[2]) === 'Antecedentes'
       && SupMod.ubicacionDeCorreccion(s.correcciones[3]) === 'párrafo 4', 'la ubicación de cada corrección');
    const c = pintar(React.createElement(SupMod.default, { supervisor: s }));
    ok(c.includes('>Antecedentes · A6<') && c.includes('>Antecedentes · A10<') && c.includes('>párrafo 4<'),
       'el pliegue rotula «Antecedentes · A6» y «párrafo 4»');
    ok(!c.includes('párrafo 0') && !c.includes('párrafo 7'), 'y nunca «párrafo 0» (ni el párrafo de un antecedente)');
    ok(c.includes('El revisor corrigió 4 cosas del proyecto') && c.includes('(se quitó)'), 'el título y lo quitado, como siempre');
}

/* ═══ 10 · «ADELANTO» YA NO SE DICE, en ningún texto visible ═══
   Se recorre el árbol de TypeScript: cadenas, plantillas y texto JSX. Los
   comentarios no son nodos y no cuentan; la clave interna 'adelanto' (el
   paso) tampoco, porque no se pinta. */
{
    const visibles = (archivo) => {
        const src = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
        const sf = ts.createSourceFile(archivo, src, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
        const fuera = [];
        const ver = (n) => {
            if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)
                || n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle
                || n.kind === ts.SyntaxKind.TemplateTail) {
                const t = (n.text ?? '').replace(/\s+/g, ' ').trim();
                if (t) fuera.push(t);
            }
            ts.forEachChild(n, ver);
        };
        ver(sf);
        return fuera;
    };
    const conAdelanto = (xs) => xs.filter((t) => /adelanto/i.test(t) && t !== 'adelanto');
    for (const f of ['ConfirmarVolver.tsx', 'EntradaTaller.tsx', 'Espinazo.tsx', 'FormularioEncargo.tsx',
                     'TramiteDelTribunal.tsx', 'CorreccionesDelSupervisor.tsx']) {
        const malos = conAdelanto(visibles(`${SENT}/${f}`));
        ok(malos.length === 0, `${f}: ningún texto visible dice «adelanto»${malos.length ? ` (${malos.join(' | ')})` : ''}`);
    }
    const malosPag = conAdelanto(visibles('src/app/taller/page.tsx'));
    ok(malosPag.length === 0, `page.tsx: ningún texto visible dice «adelanto»${malosPag.length ? ` (${malosPag.join(' | ')})` : ''}`);

    const todo = (f) => visibles(`${SENT}/${f}`).join(' ¶ ');
    ok(todo('Espinazo.tsx').includes('Procedencia') && !/\bAdelanto\b/.test(todo('Espinazo.tsx')),
       'el espinazo rotula el paso 2 «Procedencia»');
    ok(todo('EntradaTaller.tsx').includes('Generar resultandos y considerandos de procedencia')
       && todo('EntradaTaller.tsx').includes('procedencia sin generar'),
       'la entrada: el paso 3 y el asunto sin planteamientos, con el nombre nuevo');
    ok(todo('FormularioEncargo.tsx').includes('Medido sobre los resultandos y considerandos de procedencia de'),
       'la ficha: «medido sobre los resultandos y considerandos de procedencia de N asuntos reales»');

    // El diálogo de volver, pintado.
    const Volver = req('./ConfirmarVolver.js').default;
    const v2 = pintar(React.createElement(Volver, { destino: 2, onAceptar: () => {}, onCancelar: () => {} }));
    ok(v2.includes('Volver a los resultandos y considerandos de procedencia') && v2.includes('>Volver a la procedencia<')
       && !/adelanto/i.test(v2), 'volver al paso 2: título completo y botón corto, sin «adelanto»');
    const vh = pintar(React.createElement(Volver, { destino: 'historial', onAceptar: () => {}, onCancelar: () => {} }));
    ok(vh.includes('se reanuda desde los resultandos y considerandos de procedencia') && !/adelanto/i.test(vh),
       'salir al historial: se reanuda desde los resultandos y considerandos de procedencia');
    const v1 = pintar(React.createElement(Volver, { destino: 1, onAceptar: () => {}, onCancelar: () => {} }));
    ok(v1.includes('generar otra vez los resultandos y considerandos de procedencia') && !/adelanto/i.test(v1),
       'volver a la ficha: hay que generar otra vez los resultandos y considerandos de procedencia');
    const Esp = req('./Espinazo.js').default;
    const e = pintar(React.createElement(Esp, { activo: 2, hechos: [1], onIr: () => {} }));
    ok(e.includes('>Procedencia<') && !/adelanto/i.test(e), 'el espinazo pintado: «Procedencia»');
}

/* ═══ 11 · AL RETOMAR, LO LEÍDO NO VUELVE COMO DATO DEL SECRETARIO ═══
   El caso de rev_6 (scratchpad/robustez/retomar.py), con datos de prueba: un
   amparo en revisión cuya primera vuelta leyó DEL ACTO la fecha, el juzgado y
   el juicio, y DEL AUTO el ponente y el Ministerio Público. Se retoma y se
   sube la sentencia correcta. Antes, la pantalla los ponía sin marca y los
   reenviaba en `tramite_json` con fuente «secretario»: le ganaban a la
   relectura y el juzgado cambiaba sin aviso. */
await seccion('11 · al retomar, lo leído no viaja', async () => {
    const nada = () => {};
    const AR = 'amparo_revision';
    const LEIDO = { fecha_acto: '2026-01-15', organo_acto: 'Juzgado Primero de Distrito (prueba)',
                    expediente_origen: '905/2025', ponente_turno: 'Ponente del auto (prueba)',
                    ministerio_publico: 'sin_pedimento' };
    const FUENTES = { fecha_acto: 'acto', organo_acto: 'acto', expediente_origen: 'acto',
                      ponente_turno: 'auto', ministerio_publico: 'auto_turno' };
    const enc = { numero: '631/2025', tramite: { fecha_admision: '2026-02-10' },
                  tramite_leido: LEIDO, tramite_fuentes: FUENTES };
    const r = api.tramiteRetomado(enc, AR);
    ok(r.suyo.fecha_admision === '2026-02-10' && Object.keys(r.suyo).length === 1,
       'retomar: lo tecleado por el secretario vuelve como suyo, y sólo eso');
    ok(r.leido.fecha_acto === '2026-01-15' && r.leido.organo_acto === LEIDO.organo_acto
       && r.fuentes.fecha_acto === 'acto' && r.fuentes.ponente_turno === 'auto' && r.fuentes.ministerio_publico === 'auto',
       'retomar: lo leído vuelve como leído, con su origen («auto_turno» cuenta como «auto»)');

    const est = TramMod.alRetomar(r);
    ok(est.valor.fecha_admision === '2026-02-10' && est.valor.organo_acto === LEIDO.organo_acto,
       'la tarjeta enseña lo suyo y lo leído');
    const viaja = (e, tipo = AR, ficha = {}) => api.tramiteParaEnviar(
        TramMod.tramiteConLaFicha(TramMod.sinLoNoTocado(e.valor, e.sinConfirmar), tipo, ficha), tipo);
    ok(JSON.stringify(viaja(est)) === JSON.stringify({ fecha_admision: '2026-02-10' }),
       'sin tocar nada, SÓLO viaja lo del secretario: lo leído no le gana a la relectura (rev_6)');
    // El secretario corrige el juzgado: desde ahí es suyo y viaja.
    const tocado = { ...est, valor: { ...est.valor, organo_acto: 'Juzgado Segundo de Distrito (prueba)' } };
    let x = viaja(tocado);
    ok(x.organo_acto === 'Juzgado Segundo de Distrito (prueba)' && !('fecha_acto' in x) && !('ponente_turno' in x),
       'lo que el secretario cambia viaja; lo demás leído, no');
    // «Confirmar lo leído»: todo viaja como suyo y la marca se va.
    const conf = TramMod.confirmarLoLeido(est);
    x = viaja(conf);
    ok(x.fecha_acto === '2026-01-15' && x.expediente_origen === '905/2025' && x.ponente_turno === 'Ponente del auto (prueba)'
       && x.ministerio_publico === 'sin_pedimento' && Object.keys(conf.leido).length === 0
       && Object.keys(conf.sinConfirmar).length === 0, 'confirmado, lo leído viaja como suyo y deja de marcarse');
    // El adhesivo leído al retomar no viaja por la puerta del adherente de la carátula.
    const conAdh = TramMod.alRetomar(api.tramiteRetomado(
        { tramite_leido: { adhesivo_quien: 'Tercera leída (prueba)' }, tramite_fuentes: { adhesivo_quien: 'auto' } }, AR));
    ok(!('adhesivo_quien' in viaja(conAdh, AR, { adherente: 'Otra de la carátula (prueba)' })),
       'el adhesivo leído y sin tocar no viaja, ni lo sustituye el adherente de la carátula');

    // EL SERVIDOR DE LA SEGUNDA RONDA (todo junto, sin fuentes): todo cuenta como leído.
    const viejo = api.tramiteRetomado({ tramite: { ...LEIDO, fecha_admision: '2026-02-10' } }, AR);
    ok(Object.keys(viejo.suyo).length === 0 && viejo.leido.fecha_admision === '2026-02-10'
       && viejo.fuentes.fecha_acto === 'papeles', 'sin fuentes, todo vuelve como leído «de los papeles» (nunca como del secretario)');
    ok(JSON.stringify(viaja(TramMod.alRetomar(viejo))) === '{}', 'y nada viaja sin que el secretario lo toque o lo confirme');
    ok(JSON.stringify(api.tramiteRetomado({ tramite_json: JSON.stringify({ toca: '45/2025' }) }, 'amparo_directo').leido)
       === JSON.stringify({ toca: '45/2025' }), 'también el `tramite_json` viejo, como leído');
    // Otras formas que el servidor puede elegir.
    let y = api.tramiteRetomado({ tramite: { fecha_turno: { valor: '2026-03-10', fuente: 'auto' },
                                             ponente_turno: { valor: 'Ponente (prueba)', fuente: 'secretario' } } }, AR);
    ok(y.suyo.ponente_turno === 'Ponente (prueba)' && y.leido.fecha_turno === '2026-03-10' && y.fuentes.fecha_turno === 'auto',
       'cada valor con {valor, fuente}');
    y = api.tramiteRetomado({ tramite: { fecha_acto: '2026-01-15', fecha_turno: '2026-03-10', organo_acto: 'Sala (prueba)' },
                              tramite_fuentes: { 'acto.fecha': 'acto', 'turno.fecha': 'secretario', sala: 'acto' } }, 'revision_fiscal');
    ok(y.suyo.fecha_turno === '2026-03-10' && y.leido.fecha_acto === '2026-01-15' && y.fuentes.organo_acto === 'acto',
       'las fuentes por RUTA de la ficha («acto.fecha», y «sala» como órgano en la revisión fiscal)');
    y = api.tramiteRetomado({ tramite: {}, tramite_leido: { fecha_acto: 'ayer', otra: 'x', via_presentacion: 'tribunal' } }, AR);
    ok(JSON.stringify(y) === JSON.stringify({ suyo: {}, leido: {}, fuentes: {} }),
       'lo que no se entiende (fechas que no son ISO, claves ajenas) no se propone');
    ok(JSON.stringify(api.tramiteRetomado(null)) === JSON.stringify({ suyo: {}, leido: {}, fuentes: {} })
       && JSON.stringify(api.tramiteRetomado('no es json')) === JSON.stringify({ suyo: {}, leido: {}, fuentes: {} }),
       'sin encargo, nada (no rompe)');

    // LA TARJETA PINTADA: la marca dice de dónde se leyó, y avisa que no viaja.
    const html = (props) => pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, ...props }));
    const t = html({ tipoAsunto: AR, valor: est.valor, leido: est.leido, fuentes: est.fuentes,
                     sinConfirmar: est.sinConfirmar, onConfirmarLeido: nada });
    ok((t.match(/>de la sentencia recurrida · compruébalo</g) || []).length === 3
       && (t.match(/>del auto · compruébalo</g) || []).length === 2,
       'la marca nombra el papel: «de la sentencia recurrida» (3) y «del auto» (2)');
    ok(t.includes('>leído de los papeles<') && !t.includes('>leído del auto<'), 'el rótulo ya no dice «del auto» si no todo vino de él');
    ok(t.includes('Retomaste este asunto. Lo marcado como leído no viaja como dato tuyo')
       && t.includes('Confirmar lo leído (5 datos)'), 'avisa que lo leído no viaja y ofrece confirmarlo (5 datos)');
    const t2 = html({ tipoAsunto: AR, valor: tocado.valor, leido: est.leido, fuentes: est.fuentes,
                      sinConfirmar: est.sinConfirmar, onConfirmarLeido: nada });
    ok(t2.includes('Confirmar lo leído (4 datos)') && (t2.match(/>de la sentencia recurrida · compruébalo</g) || []).length === 2,
       'lo que el secretario cambió ya no se marca ni cuenta como pendiente');
    const t3 = html({ tipoAsunto: AR, valor: conf.valor, leido: conf.leido, fuentes: conf.fuentes,
                      sinConfirmar: conf.sinConfirmar, onConfirmarLeido: nada });
    ok(!t3.includes('Confirmar lo leído') && !t3.includes('compruébalo'), 'confirmado: sin aviso ni marcas');
    const papeles = html({ tipoAsunto: 'queja', valor: { toca: 'x', fecha_turno: '2026-03-10' },
                           leido: { fecha_turno: '2026-03-10' }, fuentes: { fecha_turno: 'papeles' } });
    ok(papeles.includes('>de los papeles · compruébalo<') && !papeles.includes('Confirmar lo leído'),
       'sin origen preciso, «de los papeles» (nunca se afirma un papel que no consta); sin pendientes, sin aviso');
    const q = html({ tipoAsunto: 'queja', valor: { fecha_acto: '2026-01-15' }, leido: { fecha_acto: '2026-01-15' },
                     fuentes: { fecha_acto: 'acto' } });
    ok(q.includes('>del auto recurrido · compruébalo<'), 'en la queja, «del auto recurrido» (la contracción, bien)');

    // SÓLO LO QUE SE VE SE CONFIRMA. En el amparo directo el órgano no tiene
    // campo (es la responsable de la carátula) y en la revisión fiscal la
    // cuantía sólo se pinta con la fracción I: ni cuentan ni se confirman.
    ok(!TramMod.clavesALaVista('amparo_directo', {}).includes('organo_acto')
       && TramMod.clavesALaVista('amparo_revision', {}).includes('organo_acto')
       && !TramMod.clavesALaVista('revision_fiscal', {}).includes('cuantia')
       && TramMod.clavesALaVista('revision_fiscal', { fraccion_63: 'I' }).includes('cuantia'),
       'las claves a la vista: sin el órgano fuera del AR, sin la cuantía fuera de la fracción I');
    const ad = TramMod.alRetomar(api.tramiteRetomado({ tramite_leido: { organo_acto: 'Sala leída (prueba)', toca: '45/2025' },
                                                       tramite_fuentes: { organo_acto: 'acto', toca: 'acto' } }, 'amparo_directo'));
    const adH = html({ tipoAsunto: 'amparo_directo', valor: ad.valor, leido: ad.leido, fuentes: ad.fuentes,
                       sinConfirmar: ad.sinConfirmar, onConfirmarLeido: nada });
    ok(adH.includes('Confirmar lo leído (1 dato)'), 'AD: el órgano leído no se cuenta como pendiente (no tiene campo aquí)');
    const rfL = TramMod.alRetomar(api.tramiteRetomado({ tramite_leido: { cuantia: '5,000,000', fecha_turno: '2026-03-10' },
                                                        tramite_fuentes: { cuantia: 'acto', fecha_turno: 'auto' } }, 'revision_fiscal'));
    const rfC = TramMod.confirmarLoLeido(rfL, TramMod.clavesALaVista('revision_fiscal', rfL.valor));
    const conI = { ...rfC, valor: { ...rfC.valor, fraccion_63: 'I' } };
    ok(rfC.sinConfirmar.cuantia === '5,000,000' && !('fecha_turno' in rfC.sinConfirmar)
       && !('cuantia' in viaja(conI, 'revision_fiscal')) && viaja(conI, 'revision_fiscal').fecha_turno === '2026-03-10',
       'RF: confirmar no se lleva la cuantía oculta; al elegir la fracción I aparece marcada y sin viajar');
    const rfIH = html({ tipoAsunto: 'revision_fiscal', valor: conI.valor, leido: conI.leido, fuentes: conI.fuentes,
                        sinConfirmar: conI.sinConfirmar, onConfirmarLeido: nada });
    ok(rfIH.includes('>de la sentencia recurrida · compruébalo<') && rfIH.includes('Confirmar lo leído (1 dato)'),
       'y la tarjeta la enseña con su marca y la ofrece confirmar');
    ok(fs.readFileSync(path.join(RAIZ, SENT, 'TramiteDelTribunal.tsx'), 'utf8').includes('onClick={() => onConfirmarLeido(pendientes)}'),
       'el botón confirma lo pendiente a la vista, no todo');

    // UN AUTO SUBIDO DESPUÉS DE RETOMAR: la lectura nueva le gana a la vieja
    // que nadie tocó; lo escrito no se pisa; lo que el auto no trae sigue
    // marcado y sin viajar.
    const conAuto = TramMod.conLoLeidoDelAuto(tocado, { ponente_turno: 'Ponente nuevo (prueba)',
                                                        organo_acto: 'Juzgado del auto (prueba)' });
    ok(conAuto.valor.ponente_turno === 'Ponente nuevo (prueba)' && conAuto.fuentes.ponente_turno === 'auto'
       && !('ponente_turno' in conAuto.sinConfirmar), 'el auto nuevo reemplaza lo leído que nadie tocó, y eso viaja');
    ok(conAuto.valor.organo_acto === 'Juzgado Segundo de Distrito (prueba)', 'lo que el secretario cambió no lo pisa el auto');
    ok(conAuto.sinConfirmar.fecha_acto === '2026-01-15' && conAuto.leido.fecha_acto === '2026-01-15'
       && conAuto.fuentes.fecha_acto === 'acto' && !('fecha_acto' in viaja(conAuto)),
       'lo leído del acto que el auto no trae sigue marcado, con su origen, y sin viajar');
    // Sin retomar, el auto recién leído se comporta como siempre: propone y viaja.
    const fresco = TramMod.conLoLeidoDelAuto(TramMod.TRAMITE_VACIO, { fecha_admision: '2026-03-04' });
    ok(fresco.valor.fecha_admision === '2026-03-04' && viaja(fresco).fecha_admision === '2026-03-04'
       && JSON.stringify(fresco.fuentes) === JSON.stringify({ fecha_admision: 'auto' }),
       'sin retomar, lo leído del auto recién subido se propone y viaja (como desde la primera ronda)');

    // EL CABLEADO DE page.tsx.
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    ok(pag.includes('setTarjetaTramite(alRetomar(tramiteRetomado(c.encargo, c.tipoAsunto)));')
       && !/setTramite\(tramiteDe\(/.test(pag), 'reanudar separa lo suyo de lo leído (ya no pone todo como suyo)');
    ok(/sinLoNoTocado\(tramite, tarjetaTramite\.sinConfirmar\)/.test(pag),
       'lo que viaja (y la huella) pasa por `sinLoNoTocado`');
    ok(/leido=\{tarjetaTramite\.leido\} fuentes=\{tarjetaTramite\.fuentes\}\s*sinConfirmar=\{tarjetaTramite\.sinConfirmar\}\s*onConfirmarLeido=\{\(ks\) => setTarjetaTramite\(\(p\) => confirmarLoLeido\(p, ks\)\)\}/.test(pag),
       'la tarjeta recibe lo leído, su origen, lo pendiente y la confirmación');

    // DE PUNTA A PUNTA: lo que sale hacia /taller/adelanto tras retomar.
    const pdf = (n) => new File(['%PDF'], n, { type: 'application/pdf' });
    let fd = null;
    await conFetch(() => api.generarAdelanto(
        { numero: '631/2025', encabezado: '', quejoso: 'Q', magistrado: 'M', secretario: 'S',
          notificacion: '2026-01-20', presentacion: '2026-02-03', tipoAsunto: AR,
          tramite: TramMod.tramiteConLaFicha(TramMod.sinLoNoTocado(est.valor, est.sinConfirmar), AR, {}) },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'),
        async (u, init) => { fd = init.body; return new Response(new Blob(['docx']), { status: 200 }); });
    ok(JSON.stringify(JSON.parse(fd.get('tramite_json'))) === JSON.stringify({ fecha_admision: '2026-02-10' }),
       'tramite_json tras retomar: sólo lo del secretario');
});

/* ═══ 12 · EL CAMINO DE SISE MANDA EL TRÁMITE ═══ */
await seccion('12 · el camino de SISE', async () => {
    const docx = () => new Response(new Blob(['docx']), { status: 200 });
    let fd = null, url = '';
    await conFetch(() => api.generarDesdeExpediente('91/2025', 'x@y.mx', '2026-02-02', {
        tramite: { fecha_admision: '2026-03-04', toca: '45/2025', fecha_turno: '', organo_acto: 'Juzgado (prueba)' },
        tipoAsunto: 'amparo_revision' }), async (u, init) => { url = String(u); fd = init.body; return docx(); });
    ok(url.endsWith('/taller/desde-expediente'), 'la ruta no cambia: /taller/desde-expediente');
    const tj = JSON.parse(fd.get('tramite_json') ?? '{}');
    ok(tj.fecha_admision === '2026-03-04' && tj.organo_acto === 'Juzgado (prueba)' && !('toca' in tj) && !('fecha_turno' in tj),
       'SISE: tramite_json con lo que aplica al tipo y tiene valor (el toca no es de la revisión)');
    await conFetch(() => api.generarDesdeExpediente('91/2025', 'x@y.mx', '2026-02-02'),
                   async (u, init) => { fd = init.body; return docx(); });
    ok(fd.get('tramite_json') === null, 'SISE sin trámite (o sin la bandera): la petición es la de antes');
    await conFetch(() => api.generarDesdeExpediente('91/2025', 'x@y.mx', '2026-02-02', { tramite: { toca: '' }, tipoAsunto: 'queja' }),
                   async (u, init) => { fd = init.body; return docx(); });
    ok(fd.get('tramite_json') === null, 'SISE con un trámite vacío: no viaja');
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    ok(/generarDesdeExpediente\(elegido, correo, fechaNotif,\s*tramiteDelEnvio \? \{ tramite: tramiteDelEnvio, tipoAsunto: encargo\.tipoAsunto \} : undefined\)/.test(pag),
       '«Generar desde SISE» manda la tarjeta, y sólo con la bandera (tramiteDelEnvio)');
});

/* ═══ 13 · EL PAPEL DE QUIEN RECURRE, A /taller/reglas-surtimiento ═══ */
await seccion('13 · el papel de quien recurre', async () => {
    const A = api.pareceAutoridad;
    ok(A('Juez Tercero de Distrito en Materia Administrativa (prueba)') && A('Titular de la Unidad de Inteligencia Financiera')
       && A('Secretaría General de Gobierno') && A('Administración Desconcentrada Jurídica (prueba)')
       && A('INSTITUTO MEXICANO DEL SEGURO SOCIAL') && A('Comision Federal de Electricidad'),
       'autoridades: juez, titular, Secretaría, administración, instituto, comisión (con o sin tilde)');
    ok(!A('Rosa Gómez Pérez') && !A('Inmobiliaria del Bajío, S.A. de C.V.') && !A('')
       && !A('Juan Pérez, administrador único de Constructora Norte, S.A. de C.V.') && !A('Servicios Integrales SA de CV')
       && !A('secretaria Ana López'),
       'no lo son: una persona, una sociedad (aunque firme su administrador), ni «secretaria» sin tilde');
    const P = api.papelDelRecurrente;
    ok(P('amparo_revision', 'Titular de la Unidad de Inteligencia Financiera', 'Quejosa, S.A. de C.V.') === 'autoridad',
       'AR: recurre la UIF contra la concesión (711/2025) → autoridad');
    ok(P('amparo_revision', '', 'Juez Primero (prueba)') === '' && P('amparo_revision', 'Ana Ruiz', 'Juez X') === '',
       'AR: el quejoso no cuenta como recurrente; un particular, tampoco');
    ok(P('amparo_revision', 'JUZGADO PRIMERO', 'Juzgado Primero') === '', 'AR: el recurrente que es el propio quejoso no es otra parte');
    ok(P('queja', '', 'Juez Segundo de Distrito (prueba)', true) === 'autoridad'
       && P('queja', '', 'Juez Segundo de Distrito (prueba)', false) === '',
       'queja: el campo «RECURRENTE» de la carátula cuenta sólo si la carátula lo rotula así');
    ok(P('revision_fiscal', 'Administrador Desconcentrado', '') === '' && P('amparo_directo', 'Juez', '') === '',
       'en la revisión fiscal y el amparo directo no se manda papel (el servidor no lo mira)');

    let url = '';
    const R = { fuero: 'federal', por_omision: 'oficio', reglas: [] };
    await conFetch(() => api.reglasSurtimiento('amparo_revision', 'Juzgado (prueba)', 'autoridad'),
                   async (u) => { url = String(u); return json(R); });
    ok(url.includes('/taller/reglas-surtimiento?') && url.includes('papel=autoridad'), 'con papel, viaja `papel=autoridad`');
    await conFetch(() => api.reglasSurtimiento('amparo_revision', 'Juzgado (prueba)'), async (u) => { url = String(u); return json(R); });
    ok(!url.includes('papel='), 'sin papel, la petición es la de siempre');

    const reg = (c, e) => ({ clave: c, etiqueta: e, dias_habiles: 1, fundamento: '' });
    const AUT = { fuero: 'federal', por_omision: 'oficio', reglas: [reg('oficio', 'Por oficio a autoridad'),
        reg('electronica', 'Electrónica'), reg('personal', 'Personal'), reg('lista', 'Por lista'), reg('otra', 'Otra regla')] };
    const PAR = { ...AUT, por_omision: 'personal' };
    const RP = api.reglaPropuesta;
    let p = RP('personal', '', AUT);
    ok(p && p.regla === 'oficio' && p.aviso === '', 'recurre una autoridad: de «personal» a «oficio», sin aviso (la etiqueta lo dice)');
    p = RP('oficio', 'oficio', PAR);
    ok(p && p.regla === 'personal' && p.aviso.includes('se propone «Personal»'),
       'la puso la pantalla y ya no consta que recurra una autoridad: vuelve, y lo dice');
    ok(RP('oficio', '', PAR) === null, 'la eligió el secretario: no se toca');
    ok(RP('electronica', '', AUT) === null, 'la electrónica elegida a propósito se respeta');
    p = RP('lfpca_boletin', '', PAR, 'Boletín Jurisdiccional del TFJA');
    ok(p && p.regla === 'personal' && p.aviso.startsWith('«Boletín Jurisdiccional del TFJA» no es de las reglas'),
       'una sesión reabierta con una regla que ya no se ofrece cambia, y lo dice (rev_4)');
    ok(RP('oficio', 'oficio', AUT) === null && RP('', '', null) === null, 'nada que cambiar, o sin respuesta: nada');
    ok(RP('oficio', 'oficio', PAR).aviso.includes('(quién recurre, la responsable o la sede del tribunal)'),
       'el aviso del cambio solo nombra también la sede (revisión del front, 3-oct-2026)');
    // LO AGRARIO (revisión de normas y front, 3-oct-2026): la del Código Nacional
    // ya no entra en silencio, y el paso por la sede se explica.
    const AGR_CDMX = { fuero: 'agrario', por_omision: 'cnpcf_personal', reglas: [
        reg('cnpcf_personal', 'Personal — Código Nacional (art. 227, fr. I): el plazo corre al día siguiente'),
        reg('cfpc_personal', 'Personal — Código Federal (art. 321): surte al día siguiente'), reg('otra', 'Otra regla')] };
    const AGR_FUERA = { ...AGR_CDMX, por_omision: 'cfpc_personal' };
    p = RP('personal', '', AGR_CDMX);
    ok(p && p.regla === 'cnpcf_personal' && p.aviso.includes('el juicio es agrario y el tribunal reside en la Ciudad de México')
       && p.aviso.includes('transitorio Tercero') && p.aviso.includes('«Personal — Código Federal (art. 321)»'),
       'agrario en la Ciudad de México: la genérica pasa a la del Código Nacional y lo dice, con el transitorio');
    p = RP('', '', AGR_CDMX);
    ok(p && p.regla === 'cnpcf_personal' && p.aviso.includes('transitorio Tercero'), 'también en la ficha nueva');
    p = RP('cfpc_personal', 'cfpc_personal', AGR_CDMX);
    ok(p && p.aviso.startsWith('Con la sede del tribunal se propone') && p.aviso.includes('transitorio Tercero'),
       'la sede cambió a la Ciudad de México: el aviso nombra la sede');
    p = RP('cnpcf_personal', 'cnpcf_personal', AGR_FUERA);
    ok(p && p.regla === 'cfpc_personal' && p.aviso.startsWith('Con la sede del tribunal se propone')
       && !p.aviso.includes('transitorio Tercero'), 'y al revés, fuera de la Ciudad de México, sin el transitorio');
    ok(RP('cfpc_personal', '', AGR_CDMX) === null, 'la del Código Federal elegida a mano no se toca');

    const form = fs.readFileSync(path.join(RAIZ, SENT, 'FormularioEncargo.tsx'), 'utf8');
    /* C7 (3-oct-2026): también con la sede del colegiado, que en lo agrario
       decide la regla de omisión; y se vuelven a pedir si cambia. */
    ok(/reglasSurtimiento\(valor\.tipoAsunto, valor\.responsable \|\| '', papel,\s*valor\.tribunal \|\| '', valor\.ciudad \|\| ''\)/.test(form)
       && form.includes('}, [valor.tipoAsunto, valor.responsable, papel, valor.tribunal, valor.ciudad]);'),
       'la ficha pide las reglas con el papel y la sede, y las vuelve a pedir si cambian');
    const apiR = fs.readFileSync(path.join(RAIZ, SENT, 'api.ts'), 'utf8');
    ok(apiR.includes("if (tribunal.trim()) q.set('tribunal', tribunal.trim());")
       && apiR.includes("if (ciudad.trim()) q.set('ciudad', ciudad.trim());"),
       'reglasSurtimiento manda tribunal y ciudad sólo cuando los hay (C7)');
    ok(/onChange=\{\(e\) => \{[\s\S]{0,120}reglaPuestaSola\.current = '';[\s\S]{0,60}setAvisoRegla\(''\);/.test(form)
       && form.includes('{avisoRegla}'), 'lo elegido a mano ya no cambia solo; lo que cambia solo, se dice');
});

/* ═══ 13 bis · LA FICHA, VIVA: QUIÉN RECURRE CAMBIA LA REGLA QUE SE PIDE ═══
   `renderToStaticMarkup` no corre efectos, y el papel vive en uno. Aquí se
   corre FormularioEncargo con un React mínimo (estado por posición, refs y
   efectos con sus dependencias) y temporizadores de verdad: la queja cuyo
   «RECURRENTE» es un juez pide las reglas con `papel=autoridad` y pone
   «oficio»; si el recurrente pasa a ser un particular, vuelve a «personal» y
   lo dice; lo que el secretario elige a mano ya no cambia solo. */
await seccion('13 bis · la ficha pide las reglas con el papel (efectos de verdad)', async () => {
    const iguales = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
    let ranuras = [], pos = 0, pendientes = [];
    const R = {
        useState(ini) {
            const k = pos++;
            if (!(k in ranuras)) ranuras[k] = { v: typeof ini === 'function' ? ini() : ini };
            const s = ranuras[k];
            return [s.v, (nv) => { s.v = typeof nv === 'function' ? nv(s.v) : nv; }];
        },
        useRef(ini) { const k = pos++; if (!(k in ranuras)) ranuras[k] = { current: ini }; return ranuras[k]; },
        useCallback(fn, deps) {
            const k = pos++; const s = ranuras[k];
            if (s && iguales(s.deps, deps)) return s.fn;
            ranuras[k] = { fn, deps }; return fn;
        },
        useMemo(fn, deps) {
            const k = pos++; const s = ranuras[k];
            if (s && iguales(s.deps, deps)) return s.v;
            const v = fn(); ranuras[k] = { v, deps }; return v;
        },
        useEffect(fn, deps) {
            const k = pos++; const s = ranuras[k];
            if (s && deps && iguales(s.deps, deps)) return;
            ranuras[k] = { deps, limpiar: s?.limpiar };
            pendientes.push(() => {
                ranuras[k].limpiar?.();
                const l = fn();
                ranuras[k].limpiar = typeof l === 'function' ? l : undefined;
            });
        },
        createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
        Fragment: 'Fragment', forwardRef: (f) => f, memo: (f) => f,
    };
    const TMP2 = fs.mkdtempSync(path.join(TMP, 'viva-'));
    fs.writeFileSync(path.join(TMP2, 'react-falso.js'), 'module.exports = globalThis.__REACT_FALSO__;');
    fs.writeFileSync(path.join(TMP2, 'react-dom-falso.js'), 'module.exports = { createPortal: (x) => x };');
    for (const f of ['api.ts', 'tipos.ts', 'primitivas.tsx', 'Calendario.tsx', 'FormularioEncargo.tsx']) {
        let js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, SENT, f), 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
                               jsx: ts.JsxEmit.React, esModuleInterop: true }, fileName: f }).outputText;
        js = js.split('require("react")').join('require("./react-falso.js")')
               .split('require("react-dom")').join('require("./react-dom-falso.js")')
               .split('require("lucide-react")').join(`require(${JSON.stringify(LUCIDE)})`);
        fs.writeFileSync(path.join(TMP2, f.replace(/\.tsx?$/, '.js')), js);
    }
    globalThis.__REACT_FALSO__ = R;
    const Form = createRequire(path.join(TMP2, 'x.js'))('./FormularioEncargo.js').default;

    const reg = (c, e) => ({ clave: c, etiqueta: e, dias_habiles: 1, fundamento: '' });
    const DEL_31 = [reg('oficio', 'Por oficio a autoridad'), reg('electronica', 'Electrónica')];
    const BASE = [reg('personal', 'Personal'), reg('lista', 'Por lista')];
    const QUEJA = { clave: 'queja', nombre: 'queja', promovente: 'recurrente', combate: 'agravios',
                    recurrido: 'el auto recurrido', escrito: 'el escrito de queja',
                    plazo: { dias: 5, fundamento: 'artículo 98 (prueba)' }, excepciones_de_plazo: [],
                    apartados: { resultandos: [], considerandos: ['Competencia'] }, medido_sobre: 1,
                    // La carátula de la queja ya sin el renglón del órgano (C3, 3-oct-2026).
                    caratula: [{ etiqueta: 'RECURRENTE', clave: 'quejoso', obligatoria: true }] };
    const pedidas = [];
    const fetchReal2 = globalThis.fetch;
    globalThis.fetch = async (u) => {
        const url = String(u);
        if (url.includes('/taller/tipos')) return json({ tipos: [QUEJA] });
        if (url.includes('/taller/reglas-surtimiento')) {
            pedidas.push(url);
            const aut = url.includes('papel=autoridad');
            return json({ fuero: 'federal', por_omision: aut ? 'oficio' : 'personal',
                          reglas: aut ? [...DEL_31, ...BASE, reg('otra', 'Otra')] : [...BASE, ...DEL_31, reg('otra', 'Otra')] });
        }
        return json({}, 404);
    };
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
        let enc = { tipoAsunto: 'queja', numero: '12/2026', encabezado: '', quejoso: 'Juez Segundo de Distrito (prueba)',
                    magistrado: '', secretario: '', notificacion: '', presentacion: '', reglaSurtimiento: 'personal',
                    plazo: 0, diasInhabilesExtra: [], inhabilesResponsable: '', materia: '' };
        let arbol = null;
        const pinta = () => {
            pos = 0; pendientes = [];
            arbol = Form({ valor: enc, onCambiar: (e) => { enc = e; } });
            const ps = pendientes; ps.forEach((f) => f());
        };
        const buscar = (n, pred) => {
            if (!n || typeof n !== 'object') return null;
            if (Array.isArray(n)) { for (const x of n) { const r = buscar(x, pred); if (r) return r; } return null; }
            if (pred(n)) return n;
            return buscar(n.children, pred) || buscar(n.props?.children, pred);
        };
        const textoDe = (n) => JSON.stringify(n, (k, v) => (typeof v === 'function' ? undefined : v));
        pinta(); await espera(60);          // llega el catálogo
        pinta(); await espera(500);         // con el tipo, el papel; vence el temporizador
        pinta();
        ok(pedidas.some((u) => u.includes('papel=autoridad')), 'queja con un juez como RECURRENTE: se piden las reglas con papel=autoridad');
        ok(enc.reglaSurtimiento === 'oficio', 'y la ficha pone «oficio» (surte desde que queda hecha, art. 31, fr. I)');
        // El recurrente pasa a ser un particular: vuelve a «personal», y lo dice.
        enc = { ...enc, quejoso: 'Rosa Gómez Pérez (prueba)' };
        pinta(); await espera(500); pinta();
        ok(!pedidas[pedidas.length - 1].includes('papel='), 'un particular: la petición es la de siempre');
        ok(enc.reglaSurtimiento === 'personal' && textoDe(arbol).includes('se propone «Personal»'),
           'la regla que la pantalla puso sola vuelve a «personal», con su aviso');
        // Elegida a mano, ya no cambia sola.
        const sel = buscar(arbol, (n) => n.type === 'select' && n.props?.value === 'personal');
        sel.props.onChange({ target: { value: 'oficio' } });
        pinta();
        ok(enc.reglaSurtimiento === 'oficio' && !textoDe(arbol).includes('se propone'),
           'el secretario elige «oficio» a mano: se queda y el aviso se va');
        enc = { ...enc, quejoso: 'Juez Segundo de Distrito (prueba)' }; pinta(); await espera(500); pinta();
        enc = { ...enc, quejoso: 'Rosa Gómez Pérez (prueba)' }; pinta(); await espera(500); pinta();
        ok(enc.reglaSurtimiento === 'oficio', 'y aunque cambie quién recurre, lo elegido a mano no se toca');
    } finally {
        globalThis.fetch = fetchReal2;
    }
});

/* ═══ 14 · LA VÍA DE PRESENTACIÓN NO ESTÁ EN LA PANTALLA ═══
   rev_1: cuatro fichas traían la vía «tribunal» por la Oficialía del Tribunal
   Superior y el proyecto afirmaba en falso «ante este Tribunal Colegiado». El
   valor ambiguo no puede salir de aquí: la pantalla ni lo pide ni lo propone
   (la tarjeta no tiene ese campo y la clave no es del contrato). */
await seccion('14 · la vía no está en la pantalla', async () => {
    ok(!api.CLAVES_TRAMITE.includes('via_presentacion'), 'la vía no es una clave del contrato de la pantalla');
    ok(!('via_presentacion' in api.tramiteDe({ via_presentacion: 'tribunal' })), 'ni se lee del servidor');
    const nada = () => {};
    for (const tipo of ['amparo_directo', 'amparo_revision', 'queja', 'revision_fiscal']) {
        const h = pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, tipoAsunto: tipo }));
        ok(!/value="tribunal"/.test(h) && !/ante este Tribunal/i.test(h), `${tipo}: ninguna opción «tribunal» en la tarjeta`);
    }
});

/* ═══ 15 · EL AUTO QUE FORMA Y REGISTRA, APARTE DEL QUE ADMITE (FIXES_R4, E7) ═══
   Q_335 (queja, fracción II): la Presidencia registró y pidió el informe del
   101 el 14 de octubre y lo tuvo por rendido y admitió el 3 de noviembre; el
   resultando dijo «3 de noviembre» en los dos autos, sin aviso, porque la
   pantalla y la ficha sólo tenían UNA fecha. RF_7: radicado el 10 de febrero,
   admitido el 15 de mayo tras una declinatoria. Fechas del banco, sin nombres. */
await seccion('15 · el auto que forma y registra', async () => {
    ok(api.CLAVES_TRAMITE.includes('fecha_registro') && api.FECHAS_TRAMITE.has('fecha_registro'),
       'fecha_registro es clave del contrato, y es una fecha');
    for (const tipo of ['amparo_directo', 'amparo_revision', 'queja', 'revision_fiscal']) {
        ok(api.clavesDelTramite(tipo).includes('fecha_registro')
           && TramMod.clavesALaVista(tipo, {}).includes('fecha_registro'),
           `${tipo}: el registro aplica y está a la vista (se confirma con lo demás)`);
    }
    const t = api.tramiteDe({ fecha_registro: '2025-10-14T00:00:00', fecha_admision: '2025-11-03' });
    ok(t.fecha_registro === '2025-10-14' && t.fecha_admision === '2025-11-03', 'se lee en ISO, aparte de la admisión');
    ok(!('fecha_registro' in api.tramiteDe({ fecha_registro: 'catorce de octubre' })),
       'un registro que no es fecha ISO no se lee (nunca una fecha a medio leer)');

    const q = api.tramiteParaEnviar({ fecha_registro: '2025-10-14', fecha_informe_101: '2025-11-03',
                                      fecha_admision: '2025-11-03' }, 'queja');
    ok(q.fecha_registro === '2025-10-14' && q.fecha_admision === '2025-11-03' && q.fecha_informe_101 === '2025-11-03',
       'Q_335: el registro, el informe y la admisión viajan cada uno con su fecha');
    const rf = api.tramiteParaEnviar({ fecha_registro: '2025-02-10', fecha_admision: '2025-05-15' }, 'revision_fiscal');
    ok(rf.fecha_registro === '2025-02-10' && rf.fecha_admision === '2025-05-15', 'RF_7: la radicación y la admisión, cada una la suya');
    ok(!('fecha_registro' in api.tramiteParaEnviar({ fecha_registro: '', fecha_admision: '2026-03-04' }, 'amparo_directo')),
       'vacío (un mismo auto registró y admitió): no viaja');

    // Leída del auto: llega en ficha.tramite, se propone con su marca y viaja.
    const archivo = new File(['%PDF'], 'auto.pdf', { type: 'application/pdf' });
    const r = await conFetch(() => api.fichaDesdeAdmision('x@y.mx', archivo), async () =>
        json({ ficha: { numero: '335/2025', tramite: { fecha_registro: '2025-10-14', fecha_admision: '2025-11-03' } },
               leidos: [], avisos: [] }));
    ok(r.ficha.tramite.fecha_registro === '2025-10-14' && r.ficha.tramite.fecha_admision === '2025-11-03',
       '/taller/desde-admision: el registro llega en ficha.tramite, aparte de la admisión');
    const e = TramMod.conLoLeidoDelAuto(TramMod.TRAMITE_VACIO, r.ficha.tramite);
    ok(e.valor.fecha_registro === '2025-10-14' && e.fuentes.fecha_registro === 'auto',
       'el auto recién leído propone el registro, marcado «del auto»');
    // Al retomar: la ruta de la ficha («registro.fecha») es fecha_registro.
    const ret = api.tramiteRetomado({ tramite: { fecha_registro: '2025-10-14', fecha_admision: '2025-11-03' },
                                      tramite_fuentes: { 'registro.fecha': 'auto', 'admision.fecha': 'secretario' } }, 'queja');
    ok(ret.leido.fecha_registro === '2025-10-14' && ret.fuentes.fecha_registro === 'auto'
       && ret.suyo.fecha_admision === '2025-11-03' && !('fecha_registro' in ret.suyo),
       'al retomar, «registro.fecha» leída del auto vuelve como leída (no como del secretario)');

    // La tarjeta: el campo, ANTES de la admisión, con su ayuda por tipo.
    const nada = () => {};
    const html = (props) => pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, ...props }));
    for (const tipo of ['amparo_directo', 'amparo_revision', 'queja', 'revision_fiscal']) {
        const h = html({ tipoAsunto: tipo });
        ok(h.includes('aria-label="Auto de Presidencia que forma y registra"')
           && h.includes('Sólo si es distinto del que admite')
           && h.indexOf('Auto de Presidencia que forma y registra') < h.indexOf('Auto de Presidencia (admisión)'),
           `${tipo}: «Auto de Presidencia que forma y registra», opcional y antes de la admisión`);
    }
    const hq = html({ tipoAsunto: 'queja' });
    ok(hq.includes('en la queja contra la autoridad responsable de un amparo directo es el que pide el informe del artículo 101'),
       'Q: la ayuda dice que en la fracción II el registro es el auto que pide el informe');
    ok(!html({ tipoAsunto: 'amparo_directo' }).includes('pide el informe'), 'AD: la ayuda no habla del informe de la queja');
    ok(!hq.includes('El que registra el asunto con su número y lo admite'),
       'la admisión ya no dice que registra: el registro tiene su campo');
    const marcada = html({ tipoAsunto: 'queja', leido: { fecha_registro: '2025-10-14' }, valor: { fecha_registro: '2025-10-14' } });
    ok(/aria-label="Auto de Presidencia que forma y registra"[\s\S]*?>del auto · compruébalo<[\s\S]*?Auto de Presidencia \(admisión\)/.test(marcada),
       'el registro leído del auto lleva su marca en su campo');

    // Por /taller/adelanto, dentro de tramite_json y con su nombre.
    const pdf = (n) => new File(['%PDF'], n, { type: 'application/pdf' });
    let fd = null;
    await conFetch(() => api.generarAdelanto(
        { numero: '335/2025', encabezado: '', quejoso: 'Q', magistrado: 'M', secretario: 'S',
          notificacion: '2025-10-01', presentacion: '2025-10-08', tipoAsunto: 'queja',
          tramite: { fecha_registro: '2025-10-14', fecha_admision: '2025-11-03' } },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'),
        async (u, init) => { fd = init.body; return new Response(new Blob(['docx']), { status: 200 }); });
    const tj = JSON.parse(fd.get('tramite_json') ?? '{}');
    ok(tj.fecha_registro === '2025-10-14' && tj.fecha_admision === '2025-11-03',
       'tramite_json lleva fecha_registro y fecha_admision, distintas');
});

/* ═══ 16 · EL PONENTE, CON SU CARGO (FIXES_R4, E3) ═══
   «MAGISTRADA PONENTE» o «MAGISTRADO PONENTE» sale de lo escrito
   (documento_generado._ponente_sin_cargo) y NUNCA del nombre de pila. La ayuda
   decía «se copia tal cual» y el lector quita el cargo: el rótulo quedaba por
   omisión. Ahora pide el cargo como lo dice el auto. */
await seccion('16 · el ponente con su cargo', async () => {
    const nada = () => {};
    const h = pintar(React.createElement(Tarjeta, { valor: { fecha_returno: '2026-04-01' }, onCambiar: nada,
                                                     tipoAsunto: 'amparo_revision' }));
    ok(h.includes('Con su cargo, como lo nombra el auto de turno («Magistrada …», «Magistrado …»)')
       && h.includes('el cargo no se deduce del nombre'), 'el ponente del turno se pide con su cargo');
    ok(h.includes('Con su cargo, como lo nombra el acuerdo («Magistrada …», «Magistrado …»)'),
       'el del returno también');
    ok(!h.includes('se copia tal cual'), 'ya no dice «se copia tal cual» (el lector quita el cargo)');
});

/* ═══ 17 · EL CONTRATO CON EL SERVIDOR ═══
   Las claves de la pantalla y las de `ficha_tramite.CLAVES_FORMULARIO`, leídas
   del archivo del servidor si está al lado: una clave que el servidor no
   conoce no llega, y una que la pantalla no manda nunca se llena. */
await seccion('17 · el contrato con el servidor', async () => {
    const candidatos = [process.env.IUREXIA_API, RAIZ.replace(/-front$/, ''), RAIZ.replace(/frontend/, 'api')]
        .filter((d) => d && path.resolve(d) !== RAIZ)
        .map((d) => path.join(d, 'ficha_tramite.py'));
    const servidor = candidatos.find((f) => fs.existsSync(f));
    if (!servidor) {
        console.log('  (sin el servidor al lado: no se compara con ficha_tramite.CLAVES_FORMULARIO)');
        return;
    }
    const src = fs.readFileSync(servidor, 'utf8');
    const m = src.match(/^CLAVES_FORMULARIO\s*=\s*\(([\s\S]*?)\)/m);
    const delServidor = m ? [...m[1].replace(/#.*$/gm, '').matchAll(/["']([a-z0-9_]+)["']/g)].map((x) => x[1]) : [];
    const faltan = api.CLAVES_TRAMITE.filter((k) => !delServidor.includes(k));
    const sobran = delServidor.filter((k) => !api.CLAVES_TRAMITE.includes(k));
    ok(delServidor.length > 0 && !faltan.length && !sobran.length,
       `las claves de la pantalla = CLAVES_FORMULARIO de ${servidor}`
       + (faltan.length ? ` · el servidor no conoce: ${faltan.join(', ')}` : '')
       + (sobran.length ? ` · la pantalla no manda: ${sobran.join(', ')}` : ''));
});

/* ═══ 18 · LOS ASUNTOS RELACIONADOS (C6, 3-oct-2026) ═══
   David: «siempre y cuando haya asuntos relacionados. No vamos a meter
   conexidad en automático. Hay que habilitar en el taller la opción de con un
   clic precisar si existen asuntos relacionados y con ello se genera el
   considerando». Viajan como «relacionados» en `tramite_json`, con el formato
   plano del contrato «tipo|numero|estado;…». Números de prueba. */
await seccion('18 · los asuntos relacionados', async () => {
    const TIPOS4 = ['amparo_directo', 'amparo_revision', 'queja', 'revision_fiscal'];
    for (const tipo of TIPOS4) {
        ok(api.clavesDelTramite(tipo).includes('relacionados') && TramMod.clavesALaVista(tipo, {}).includes('relacionados'),
           `${tipo}: los relacionados aplican y están a la vista`);
    }
    ok(!api.FECHAS_TRAMITE.has('relacionados'), 'no es una fecha');
    ok(api.MAX_RELACIONADOS === 4 && api.TIPOS_RELACIONADO.length === 4 && api.ESTADOS_RELACIONADO.length === 2
       && JSON.stringify(api.TIPOS_RELACIONADO.map((t) => t.clave)) === JSON.stringify(TIPOS4)
       && JSON.stringify(api.ESTADOS_RELACIONADO.map((e) => e.clave)) === JSON.stringify(['misma_sesion', 'resuelto']),
       'los cuatro tipos y los dos estados del contrato; cuatro como mucho');

    // ── SERIALIZAR Y LEER: 0, 1, 3, INVÁLIDOS ──
    const R = api.relacionadosDe, F = api.relacionadosAFormulario;
    ok(R('').length === 0 && R(null).length === 0 && R(undefined).length === 0 && F([]) === ''
       && R('  ;  ; ').length === 0, '0: sin relacionados, lista vacía y cadena vacía');
    let l = R('amparo_directo|452/2025|misma_sesion');
    ok(l.length === 1 && l[0].tipo === 'amparo_directo' && l[0].numero === '452/2025' && l[0].estado === 'misma_sesion'
       && F(l) === 'amparo_directo|452/2025|misma_sesion', '1: se lee y vuelve igual');
    const TRES = 'amparo_directo|452/2025|misma_sesion;revision_fiscal|33/2024|resuelto;queja|24/2026|misma_sesion';
    l = R(TRES);
    ok(l.length === 3 && l[1].tipo === 'revision_fiscal' && l[1].estado === 'resuelto' && F(l) === TRES,
       '3: en su orden, cada uno con su estado, y vuelve igual (ida y vuelta)');
    ok(F(R('amparo_revision|12/2026')) === 'amparo_revision|12/2026|misma_sesion'
       && F(R('amparo_revision|12/2026|')) === 'amparo_revision|12/2026|misma_sesion',
       'sin estado: «misma_sesion» (lo que la tarjeta marca por omisión)');
    ok(F(R(' amparo_directo | 452 / 2025 | resuelto ')) === 'amparo_directo|452/2025|resuelto',
       'espacios de sobra, también dentro del número: fuera');
    ok(F(R('amparo_directo|452/2025|ya se resolvió;queja|1/2026|hecho_notorio;amparo_revision|2/2026|conexidad'))
       === 'amparo_directo|452/2025|resuelto;queja|1/2026|resuelto;amparo_revision|2/2026|misma_sesion',
       'los alias del estado, los mismos que el servidor (ficha_tramite._ESTADOS_ALIAS)');
    // Inválidos: tipo desconocido, número sin la forma, estado desconocido, duplicados, más de cuatro.
    ok(R('amparo_indirecto|452/2025|misma_sesion').length === 0, 'inválido: un tipo que no es de los cuatro, fuera');
    ok(R('amparo_directo|452|misma_sesion').length === 0 && R('amparo_directo|452-2025|misma_sesion').length === 0
       && R('amparo_directo|1234567/2025|misma_sesion').length === 0 && R('amparo_directo|45/25|misma_sesion').length === 0
       && R('amparo_directo||misma_sesion').length === 0,
       'inválido: el número que no es «452/2025» (sin año, con guion, siete cifras, año de dos, vacío), fuera');
    ok(R('amparo_directo|452/2025|pendiente').length === 0,
       'inválido: un estado que no se reconoce, fuera (el servidor la quitaría con aviso)');
    ok(F(R('queja|24/2026|misma_sesion;queja|24/2026|resuelto;amparo_directo|24/2026|resuelto'))
       === 'queja|24/2026|misma_sesion;amparo_directo|24/2026|resuelto',
       'duplicado (mismo tipo y número): cuenta una vez, el primero; con otro tipo es otro expediente');
    ok(R('queja|1/2026;queja|2/2026;queja|3/2026;queja|4/2026;queja|5/2026').length === 4, 'más de cuatro: los cuatro primeros');
    ok(F(R([{ tipo: 'revision_fiscal', numero: '33/2024', estado: 'resuelto' }, 'queja|24/2026', { tipo: 7 }, 5]))
       === 'revision_fiscal|33/2024|resuelto;queja|24/2026|misma_sesion',
       'también como lista (de {tipo, numero, estado} o de cadenas); lo que no se entiende, fuera');

    // ── EN EL TRÁMITE: tramiteDe y lo que viaja ──
    ok(api.tramiteDe({ relacionados: 'amparo_directo|452/2025|misma_sesion;xx|1/2026|resuelto' }).relacionados
       === 'amparo_directo|452/2025|misma_sesion', 'tramiteDe deja sólo las filas que valen');
    ok(!('relacionados' in api.tramiteDe({ relacionados: 'amparo_directo||misma_sesion' }))
       && !('relacionados' in api.tramiteDe({ relacionados: '' })), 'sin filas que valgan, la clave no existe');
    ok(api.tramiteDe({ relacionados: [{ tipo: 'queja', numero: '24/2026', estado: 'resuelto' }] }).relacionados
       === 'queja|24/2026|resuelto', 'la lista de la ficha se lee y se escribe con el formato plano');
    for (const tipo of TIPOS4) {
        const x = api.tramiteParaEnviar({ relacionados: TRES }, tipo);
        ok(x.relacionados === TRES, `${tipo}: los relacionados viajan con el formato del contrato`);
    }
    // La tarjeta guarda borradores: la fila a medio escribir no viaja.
    const BORRADOR = 'amparo_directo|452/2025|misma_sesion;revision_fiscal|33/20|resuelto;queja||misma_sesion';
    ok(api.tramiteParaEnviar({ relacionados: BORRADOR }, 'queja').relacionados === 'amparo_directo|452/2025|misma_sesion',
       'con una fila buena y dos a medias, sólo viaja la buena');
    ok(!('relacionados' in api.tramiteParaEnviar({ relacionados: 'revision_fiscal|33/20|resuelto;queja||misma_sesion' }, 'queja')),
       'sin filas válidas, no viaja');
    ok(!('relacionados' in api.tramiteParaEnviar({ relacionados: '' }, 'amparo_directo')), 'apagado (vacío), no viaja');
    // Las filas de la tarjeta, tal como están escritas.
    const filas = api.filasDeRelacionados(BORRADOR);
    ok(filas.length === 3 && filas[1].numero === '33/20' && filas[2].numero === '' && filas[2].tipo === 'queja',
       'filasDeRelacionados conserva lo que aún no vale (para pintarlo)');
    ok(api.filasARelacionados(filas) === BORRADOR && api.filasDeRelacionados('').length === 0,
       'y vuelve a la misma cadena; vacía, ninguna fila');
    ok(api.filasARelacionados([{ tipo: 'queja', numero: '24|/20;26', estado: 'misma_sesion' }]) === 'queja|24/2026|misma_sesion',
       'un «|» o un «;» tecleado en el número no rompe el formato');

    // ── /taller/adelanto: dentro de tramite_json ──
    const pdf = (n) => new File(['%PDF'], n, { type: 'application/pdf' });
    const ENC = { numero: '456/2025', encabezado: '', quejoso: 'Q', magistrado: 'M', secretario: 'S',
                  notificacion: '2026-02-02', presentacion: '2026-02-10', tipoAsunto: 'amparo_directo' };
    let fd = null;
    const docx = () => new Response(new Blob(['docx']), { status: 200 });
    await conFetch(() => api.generarAdelanto({ ...ENC, tramite: { relacionados: 'revision_fiscal|33/2024|misma_sesion' } },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'), async (u, init) => { fd = init.body; return docx(); });
    ok(JSON.parse(fd.get('tramite_json')).relacionados === 'revision_fiscal|33/2024|misma_sesion',
       '/taller/adelanto: «relacionados» viaja en tramite_json con su nombre (AD 456 con la RF 33, el par del art. 64 LFPCA)');
    await conFetch(() => api.generarAdelanto({ ...ENC, tramite: { relacionados: 'queja||misma_sesion' } },
        { acto: pdf('acto.pdf'), conceptos: pdf('c.pdf') }, 'x@y.mx'), async (u, init) => { fd = init.body; return docx(); });
    ok(fd.get('tramite_json') === null, 'encendido con una fila vacía y nada más: tramite_json ni se manda');

    // ── NUNCA DE LOS PAPELES ──
    const archivo = new File(['%PDF'], 'auto.pdf', { type: 'application/pdf' });
    const r = await conFetch(() => api.fichaDesdeAdmision('x@y.mx', archivo), async () =>
        json({ ficha: { numero: '24/2026', tramite: { fecha_admision: '2026-03-04', relacionados: 'amparo_directo|452/2025|misma_sesion' } },
               leidos: [], avisos: [] }));
    ok(r.ficha.tramite.fecha_admision === '2026-03-04' && !('relacionados' in r.ficha.tramite),
       '/taller/desde-admision: aunque el servidor los mandara, no se proponen (no se leen del auto)');
    const conMarcados = { ...TramMod.TRAMITE_VACIO, valor: { relacionados: 'queja|24/2026|resuelto' } };
    const tras = TramMod.conLoLeidoDelAuto(conMarcados, { relacionados: 'amparo_directo|1/2026|misma_sesion', fecha_turno: '2026-03-10' });
    ok(tras.valor.relacionados === 'queja|24/2026|resuelto' && !('relacionados' in tras.leido) && !('relacionados' in tras.fuentes)
       && tras.valor.fecha_turno === '2026-03-10', 'lo «leído» de un auto no pisa ni propone relacionados; lo demás, como siempre');

    // ── RETOMAR ──
    let ret = api.tramiteRetomado({ tramite: { relacionados: TRES, fecha_admision: '2026-02-10' }, tramite_leido: {},
                                    tramite_fuentes: { relacionados: 'secretario' } }, 'queja');
    ok(ret.suyo.relacionados === TRES && !('relacionados' in ret.leido), 'retomar: vuelven como del secretario');
    ret = api.tramiteRetomado({ tramite: { relacionados: TRES, fecha_turno: '2026-03-10' } }, 'queja');
    ok(ret.suyo.relacionados === TRES && ret.leido.fecha_turno === '2026-03-10' && !('relacionados' in ret.fuentes),
       'retomar con el servidor que no separa fuentes: lo demás vuelve leído, los relacionados siguen siendo suyos');
    ret = api.tramiteRetomado({ tramite: {}, tramite_leido: { relacionados: 'amparo_directo|452/2025|resuelto' },
                                tramite_fuentes: { relacionados: 'auto' } }, 'queja');
    ok(ret.suyo.relacionados === 'amparo_directo|452/2025|resuelto' && !('relacionados' in ret.leido),
       'retomar: aunque llegaran como «leídos», son del secretario (nunca se leen de los papeles)');
    ret = api.tramiteRetomado({ tramite: { relacionados: [{ tipo: 'revision_fiscal', numero: '33/2024', estado: 'resuelto' }] },
                                tramite_leido: {} }, 'amparo_directo');
    ok(ret.suyo.relacionados === 'revision_fiscal|33/2024|resuelto', 'retomar: también si vuelven como lista');
    const est = TramMod.alRetomar(api.tramiteRetomado({ tramite: { relacionados: TRES }, tramite_leido: {} }, 'queja'));
    const viaja = (e, tipo) => api.tramiteParaEnviar(
        TramMod.tramiteConLaFicha(TramMod.sinLoNoTocado(e.valor, e.sinConfirmar), tipo, {}), tipo);
    ok(est.valor.relacionados === TRES && !('relacionados' in est.sinConfirmar) && viaja(est, 'queja').relacionados === TRES,
       'retomado: en la tarjeta, sin confirmar nada, y viaja (es suyo)');

    // ── LA TARJETA PINTADA ──
    const nada = () => {};
    const html = (props) => pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, ...props }));
    const AYUDA = 'Sólo si existen. Con esto el proyecto lleva el considerando de conexidad (o de hecho notorio) y el rubro dice “RELACIONADO CON…”.';
    for (const tipo of TIPOS4) {
        const h = html({ tipoAsunto: tipo });
        // ACCESIBILIDAD (revisión del front, 3-oct-2026): sin `aria-checked`, que
        // sobra en una casilla nativa; el rótulo sólo dice «Hay asuntos
        // relacionados» y la ayuda va por `aria-describedby`. Antes se exigía
        // `aria-checked="false"`.
        ok(/<input type="checkbox" role="switch"(?![^>]*checked="")[^>]*aria-describedby="relacionados-ayuda"/.test(h)
           && !h.includes('aria-checked')
           && /<label for="relacionados-interruptor"[^>]*>\s*Hay asuntos relacionados\s*<\/label>/.test(h)
           && /<p id="relacionados-ayuda"[^>]*>/.test(h)
           && h.includes('Hay asuntos relacionados') && h.replace(/\s+/g, ' ').includes(AYUDA)
           && !h.includes('Añadir otro') && !h.includes('placeholder="452/2025"'),
           `${tipo}: el interruptor «Hay asuntos relacionados», apagado por omisión, con su ayuda descrita y sin filas`);
    }
    const h3 = html({ tipoAsunto: 'queja', valor: { relacionados: TRES } });
    ok(/role="switch"[^>]*checked=""/.test(h3) && (h3.match(/placeholder="452\/2025"/g) || []).length === 3
       && (h3.match(/aria-label="Asunto relacionado \d"/g) || []).length === 3,
       'retomado con tres: el interruptor encendido y tres filas');
    ok(h3.includes('value="452/2025"') && h3.includes('value="33/2024"') && h3.includes('value="24/2026"'), 'con sus números');
    ok(/<option value="amparo_directo"[^>]*selected=""[^>]*>Amparo directo</.test(h3)
       && /<option value="revision_fiscal"[^>]*selected=""[^>]*>Revisión fiscal</.test(h3)
       && /<option value="resuelto"[^>]*selected=""[^>]*>Ya se resolvió</.test(h3)
       && (h3.match(/<option value="misma_sesion"[^>]*selected=""[^>]*>Se resuelve en la misma sesión</g) || []).length === 2,
       'cada fila con su tipo y su estado elegidos');
    ok(['Amparo directo', 'Amparo en revisión', 'Queja', 'Revisión fiscal'].every((e) => h3.includes(`>${e}</option>`)),
       'el tipo: Amparo directo / Amparo en revisión / Queja / Revisión fiscal');
    ok((h3.match(/>Quitar</g) || []).length === 3 && h3.includes('+ Añadir otro'), 'cada fila se quita; con tres, «Añadir otro»');
    ok(!h3.includes('compruébalo') && !h3.includes('leído del auto') && !h3.includes('Confirmar lo leído'),
       'los relacionados no llevan marca de «leído» ni piden confirmación');
    const h4 = html({ tipoAsunto: 'queja', valor: { relacionados: `${TRES};amparo_revision|298/2025|misma_sesion` } });
    ok((h4.match(/placeholder="452\/2025"/g) || []).length === 4 && !h4.includes('Añadir otro'), 'con cuatro, ya no se añade otro');
    const mal = html({ tipoAsunto: 'queja', numeroAsunto: '24/2026',
                       valor: { relacionados: 'amparo_directo|452-2025|misma_sesion;amparo_directo|9/2026|misma_sesion;'
                                + 'amparo_directo|9/2026|resuelto;queja|24/2026|misma_sesion' } });
    ok(mal.includes('Escríbelo como 452/2025: número, barra y año. Así no viaja.') && mal.includes('aria-invalid="true"'),
       'número inválido: lo dice en la fila, y la fila no viaja');
    ok(mal.includes('Repetido: ya está en otra fila y cuenta una vez.'), 'repetido: lo dice');
    ok(mal.includes('Es el número de este asunto: no se relaciona consigo mismo.'), 'el propio asunto: lo dice (con el número)');
    ok(!html({ tipoAsunto: 'queja', valor: { relacionados: 'queja||misma_sesion' } }).includes('Escríbelo como'),
       'recién abierta, con el número vacío, no regaña');
    // LA FILA VACÍA LO DICE AL SALIR (revisión del front, 3-oct-2026): el aviso
    // está en la fila, oculto mientras el campo tiene el foco o un número.
    const vac = html({ tipoAsunto: 'queja', valor: { relacionados: 'queja||misma_sesion' } });
    ok(/<span id="relacionado-0-vacio" class="[^"]*\bhidden\b[^"]*peer-placeholder-shown:block[^"]*peer-focus:hidden[^"]*">Falta el número: así no viaja\.<\/span>/
           .test(vac.replace(/\s+/g, ' '))
       && /<input id="relacionado-0-numero" class="peer [^"]*"[^>]*aria-describedby="relacionado-0-vacio"/.test(vac),
       'fila encendida sin número: «Falta el número: así no viaja» al salir del campo (oculto con el foco)');
    ok(!h3.includes('Falta el número'), 'con número, ese aviso no está');
    ok(/aria-invalid="true" aria-describedby="relacionado-0-problema"/.test(mal)
       && /<span id="relacionado-0-problema"/.test(mal)
       && !/<label[^>]*>[^<]*Número[^<]*<input/.test(mal),
       'el aviso de la fila es descripción del campo (aria-describedby), no parte de su rótulo');
    // EL PROPIO NÚMERO CON ESPACIOS O CEROS (revisión del front, 3-oct-2026).
    const fp = TramMod.problemaDeFila;
    const filaQ = [{ tipo: 'queja', numero: '24/2026', estado: 'misma_sesion' }];
    ok(fp(filaQ, 0, { tipo: 'queja', numero: '24 / 2026' }).startsWith('Es el número de este asunto')
       && fp(filaQ, 0, { tipo: 'queja', numero: '024/2026' }).startsWith('Es el número de este asunto')
       && fp([{ tipo: 'queja', numero: '024/2026', estado: 'misma_sesion' }], 0,
             { tipo: 'queja', numero: '24/2026' }).startsWith('Es el número de este asunto')
       && fp(filaQ, 0, { tipo: 'queja', numero: '25/2026' }) === '',
       'el propio número se reconoce aunque la ficha lo escriba con espacios o ceros a la izquierda');
    ok(fp([{ tipo: 'queja', numero: '24/2026', estado: 'misma_sesion' },
           { tipo: 'queja', numero: '024/2026', estado: 'resuelto' }], 1, { tipo: 'amparo_directo' })
       .startsWith('Repetido'), 'y el repetido con ceros a la izquierda también');
    ok(!html({ tipoAsunto: 'amparo_directo', numeroAsunto: '24/2026', valor: { relacionados: 'queja|24/2026|misma_sesion' } })
         .includes('Es el número de este asunto'), 'el mismo número con otro tipo es otro expediente: no se señala');
    ok(html({ tipoAsunto: 'queja', valor: { relacionados: TRES }, deshabilitado: true }).includes('<fieldset disabled=""'),
       'deshabilitada la tarjeta, el interruptor y las filas también (van dentro del fieldset)');

    // ── VIVOS: el interruptor y las filas, pulsados ──
    const Rel = TramMod.AsuntosRelacionados;
    let val = '';
    const arbol = (extra = {}) => Rel({ valor: val, onCambiar: (v) => { val = v; }, propio: 'queja', ...extra });
    const todos = (n, pred, fuera = []) => {
        if (!n || typeof n !== 'object') return fuera;
        if (Array.isArray(n)) { n.forEach((x) => todos(x, pred, fuera)); return fuera; }
        if (pred(n)) fuera.push(n);
        todos(n.props?.children, pred, fuera);
        return fuera;
    };
    const interruptor = () => todos(arbol(), (n) => n.props?.role === 'switch')[0];
    const numeros = () => todos(arbol(), (n) => n.type === 'input' && n.props?.placeholder === '452/2025');
    const selects = () => todos(arbol(), (n) => n.type === 'select');
    const botones = (texto) => todos(arbol(), (n) => n.type === 'button'
        && [].concat(n.props.children).join('').includes(texto));
    ok(interruptor().props.checked === false && numeros().length === 0, 'vivo: empieza apagado y sin filas');
    interruptor().props.onChange({ target: { checked: true } });
    ok(val === 'queja||misma_sesion' && numeros().length === 1 && interruptor().props.checked === true,
       'un clic: se enciende con una fila del mismo tipo que este asunto y «misma sesión»');
    numeros()[0].props.onChange({ target: { value: ' 298 / 2025 ' } });
    ok(val === 'queja|298/2025|misma_sesion', 'se teclea el número (sin espacios)');
    selects()[0].props.onChange({ target: { value: 'amparo_revision' } });
    selects()[1].props.onChange({ target: { value: 'resuelto' } });
    ok(val === 'amparo_revision|298/2025|resuelto', 'se elige el tipo y el estado');
    botones('Añadir otro')[0].props.onClick();
    ok(api.filasDeRelacionados(val).length === 2 && val.endsWith(';queja||misma_sesion'), '«Añadir otro»: una fila más');
    botones('Añadir otro')[0].props.onClick(); botones('Añadir otro')[0].props.onClick();
    ok(api.filasDeRelacionados(val).length === 4 && botones('Añadir otro').length === 0, 'hasta cuatro; ahí el botón se va');
    botones('Quitar')[1].props.onClick();
    ok(api.filasDeRelacionados(val).length === 3 && val.startsWith('amparo_revision|298/2025|resuelto;queja||'),
       '«Quitar» quita esa fila y deja las demás');
    ok(api.tramiteParaEnviar({ relacionados: val }, 'queja').relacionados === 'amparo_revision|298/2025|resuelto',
       'de lo escrito, viaja sólo la fila completa');
    interruptor().props.onChange({ target: { checked: false } });
    ok(val === '' && numeros().length === 0 && !('relacionados' in api.tramiteParaEnviar({ relacionados: val }, 'queja')),
       'apagado: no queda nada y no viaja nada');
    interruptor().props.onChange({ target: { checked: true } });
    ok(numeros()[0].props.autoFocus === true, 'la fila nueva recibe el foco (por eso recién abierta no se regaña)');
    botones('Quitar')[0].props.onClick();
    ok(val === '' && interruptor().props.checked === false, 'quitar la última fila apaga el interruptor');
    const fuenteTarjeta = fs.readFileSync(path.join(RAIZ, 'src/components/sentencia/TramiteDelTribunal.tsx'), 'utf8');
    ok(/filas\.length === 1 && typeof document !== 'undefined'[\s\S]{0,120}getElementById\(ID_INTERRUPTOR\)\?\.focus\(\)/
           .test(fuenteTarjeta),
       'y el foco vuelve al interruptor (el botón pulsado desaparece con la fila)');

    // ── EL CABLEADO: la tarjeta recibe el número del asunto (integración,
    //    3-oct-2026: era una nota mientras page.tsx no lo pasaba; ya lo pasa) ──
    const pag = fs.readFileSync(path.join(RAIZ, 'src/app/taller/page.tsx'), 'utf8');
    ok(/numeroAsunto=\{encargo\.numero\}/.test(pag),
       'page.tsx pasa el número del asunto a la tarjeta (el aviso del propio número en la fila)');
});

/* ═══ 19 · C1, C3 Y C4 EN LA TARJETA ═══
   La carátula de la queja ya no lleva «ÓRGANO QUE DICTÓ EL AUTO RECURRIDO»
   (C3) ni la de la revisión fiscal «AUTORIDAD RECURRENTE» ni «SALA
   RESPONSABLE» (C4): el órgano pasa a pedirse en la tarjeta, una sola vez,
   como en el amparo en revisión. Y el amparo en revisión ya no lleva
   considerando de existencia (C1): ningún texto de la tarjeta lo promete. */
await seccion('19 · C1, C3 y C4 en la tarjeta', async () => {
    const nada = () => {};
    const html = (props) => pintar(React.createElement(Tarjeta, { valor: {}, onCambiar: nada, ...props }));
    const q = html({ tipoAsunto: 'queja' });
    const rf = html({ tipoAsunto: 'revision_fiscal' });
    const ad = html({ tipoAsunto: 'amparo_directo' });
    const ar = html({ tipoAsunto: 'amparo_revision' });
    ok(q.includes('Órgano que lo dictó') && q.includes('como firma el auto'), 'Q: el órgano que dictó el auto, en la tarjeta');
    ok(rf.includes('Sala que la dictó') && rf.includes('como firma la sentencia'), 'RF: la Sala, en la tarjeta');
    ok(ar.includes('Juzgado que la dictó'), 'AR: el juzgado, como siempre');
    ok(!ad.includes('Órgano que lo dictó') && !ad.includes('Sala que la dictó') && !ad.includes('Juzgado que la dictó'),
       'AD: sin campo de órgano (es la autoridad responsable de la carátula: un dato, un campo)');
    ok(TramMod.clavesALaVista('queja', {}).includes('organo_acto') && TramMod.clavesALaVista('revision_fiscal', {}).includes('organo_acto')
       && !TramMod.clavesALaVista('amparo_directo', {}).includes('organo_acto'),
       'el órgano está a la vista en los tres recursos, no en el AD');
    // Leído del auto: se propone con su marca y, al retomar, se confirma con lo demás.
    const qL = html({ tipoAsunto: 'queja', leido: { organo_acto: 'Juzgado Cuarto de Distrito (prueba)' },
                      valor: { organo_acto: 'Juzgado Cuarto de Distrito (prueba)' } });
    ok(/Órgano que lo dictó[\s\S]*?value="Juzgado Cuarto de Distrito \(prueba\)"[\s\S]*?>del auto · compruébalo</.test(qL),
       'Q: el órgano leído del auto lleva su marca');
    const rfR = TramMod.alRetomar(api.tramiteRetomado({ tramite_leido: { organo_acto: 'Sala Regional (prueba)' },
                                                        tramite_fuentes: { sala: 'acto' } }, 'revision_fiscal'));
    const rfH = html({ tipoAsunto: 'revision_fiscal', valor: rfR.valor, leido: rfR.leido, fuentes: rfR.fuentes,
                       sinConfirmar: rfR.sinConfirmar, onConfirmarLeido: nada });
    ok(rfH.includes('Confirmar lo leído (1 dato)') && rfH.includes('>de la sentencia recurrida · compruébalo<'),
       'RF retomada: la Sala leída cuenta como pendiente (ya tiene campo) y lleva su marca');
    // Ningún texto visible reproduce lo quitado de la carátula ni la existencia del AR.
    for (const [tipo, h] of [['amparo_directo', ad], ['amparo_revision', ar], ['queja', q], ['revision_fiscal', rf]]) {
        ok(!/AUTORIDAD RECURRENTE|SALA RESPONSABLE|ÓRGANO QUE DICTÓ EL AUTO RECURRIDO/i.test(h),
           `${tipo}: la tarjeta no rotula «autoridad recurrente», «Sala responsable» ni «órgano que dictó el auto recurrido»`);
    }
    ok(!/existencia/i.test(ar), 'AR: ningún texto de la tarjeta habla de la existencia (ya no hay considerando, C1)');
});

console.log(fallas ? `FALLA · ${bien} comprobaciones bien, ${fallas} mal` : `OK · ${bien} comprobaciones bien, 0 mal`);
process.exit(fallas ? 1 : 0);
