// LA TARJETA «EL PROBLEMA PRINCIPAL Y SU SOLUCIÓN», PROBADA SIN SERVIDOR
// (28-sep-2026, tras el AR 631/2025).
//
// David: «saltar una tarjeta con el problema jurídico y la posible solución.
// Preguntando, ¿o quieres resolver en sentido opuesto? (…) y nada más un botón
// que me permita ir a resolver con mi criterio». La tarjeta decide qué vía se
// enseña como propuesta, con qué peso, qué suerte lleva cada secundario y qué
// viaja al pulsar cada botón. Nada de eso se ve en un typecheck: aquí se
// comprueba con el código REAL (transpilado al vuelo con el TypeScript del
// proyecto) y el HTML que pinta React de verdad (react-dom/server):
//
//   1 · la lectura tolerante del contrato (`tarjetaDe`) y `leerTarjeta` con un
//       fetch falso (un servidor sin la tarjeta NO es un error);
//   2 · la lógica pura: qué vía está en pantalla, si la contraria es de verdad
//       contraria, la suerte y su rótulo, la vía que revoca, el contraste por
//       vía, el propio tribunal por vía, la tarjeta local y «soltar lo tocado»;
//   3 · el HTML de ProblemaPrincipal con datos del contrato: vía propuesta y
//       opuesta, sin opuesta, reñido, no alcanza, secundarios en las dos vías,
//       conceptos omitidos, la contraria sin razón y sin propuesta global;
//   4 · Decision montada entera: la tarjeta en lugar de «la frase», la tarjeta
//       final con la suerte de cada accesorio y el plan esperando a la vía;
//   5 · el hook que pide la tarjeta: una vez por propuesta, «calculando» con
//       reintentos y lo de una propuesta vieja que no se pinta.
//   6 · la pregunta decisiva con «así lo planteó la recurrida» y la ficha
//       procesal en una línea (SPEC E4), tolerando que falten.
//
//   TMPDIR=<scratchpad> node comprobaciones/problema_principal.mjs
//   … problema_principal.mjs --html <salida.html> [css]
//       → además, una página con la tarjeta en sus estados y Decision entera
//         (con el CSS que se le pase: el de `next build`, o el que saca
//         `tailwindcss -i src/app/globals.css --content <salida.html>`) para
//         mirarla en un navegador.
//
// No arranca Next ni llama a ningún servidor. Los datos son de prueba: textos
// esquemáticos, no frases para copiar.
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

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'problema-principal-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));
const SENT = 'src/components/sentencia';
function transpilar(dir, rel, cambios = []) {
    const src = fs.readFileSync(path.join(RAIZ, SENT, rel), 'utf8');
    let js = ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
                           jsx: ts.JsxEmit.React, esModuleInterop: true },
        fileName: rel,
    }).outputText;
    for (const [de, a] of cambios) js = js.split(de).join(a);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, rel.replace(/\.tsx?$/, '.js')), js);
}

/* ── Con React de verdad: para pintar ── */
const REAL = path.join(TMP, 'real');
const conReact = [['require("react")', `require(${JSON.stringify(REACT)})`],
                  ['require("lucide-react")', `require(${JSON.stringify(LUCIDE)})`]];
for (const f of ['api.ts', 'tipos.ts', 'calificaciones.ts', 'recalificacion.ts', 'tarjetaDelPrincipal.ts',
                 'primitivas.tsx', 'FilaDelEspejo.tsx', 'SolucionesPosibles.tsx', 'ProblemaPrincipal.tsx', 'Decision.tsx', 'ComoSeEstudiara.tsx',
                 'EstudiarJuntos.tsx']) {
    transpilar(REAL, f, conReact);
}
const req = createRequire(path.join(REAL, 'x.js'));
const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
const api = req('./api.js');
const td = req('./tarjetaDelPrincipal.js');
const PP = req('./ProblemaPrincipal.js').default;
const Decision = req('./Decision.js').default;

const pintar = (el) => renderToStaticMarkup(el);
/* Lo pintado, por si se pide la página (--html). */
const MUESTRAS = [];
const muestra = (titulo, html) => { MUESTRAS.push([titulo, html]); return html; };
/** El HTML de la columna de una vía (`data-via`), hasta la siguiente. */
function columna(html, lado) {
    const i = html.indexOf(`data-via="${lado}"`);
    if (i < 0) return '';
    const j = html.indexOf('data-via="', i + 10);
    return html.slice(i, j < 0 ? html.length : j);
}
/** El texto del chip «vía: …». */
function chip(html) {
    const m = /data-chip-via="[a-z]+"[^>]*>([^<]*)</.exec(html);
    return m ? m[1] : '';
}
/** La fila de los tres botones (`data-botones`), hasta el final de la tarjeta. */
function fila3(html) {
    const i = html.indexOf('data-botones=');
    return i < 0 ? '' : html.slice(i);
}
/** La etiqueta <button …>texto</button> que contiene `texto`, en la fila de
 *  los botones (el pie de los secundarios también nombra «Resolver con mi
 *  criterio», como texto). */
function boton(html, texto) {
    html = fila3(html) || html;
    const k = html.indexOf(texto);
    if (k < 0) return '';
    const a = html.lastIndexOf('<button', k);
    const b = html.indexOf('</button>', k);
    return a < 0 || b < 0 ? '' : html.slice(a, b);
}

/* ═══ LOS DATOS DE PRUEBA, EN LA FORMA DEL CONTRATO (contrato_tarjeta.md) ═══
   Un recurso de revisión como el AR 631/2025: el principal es de fondo y un
   secundario procesal cuelga de él. Textos esquemáticos a propósito. */
const APOYO_SCJN = { registro: '2015688', rubro: 'Rubro de prueba A.', instancia: 'Primera Sala',
                     tipo: 'jurisprudencia', fuerza: 'obliga', fuerza_texto: '', vigencia: 'vigente',
                     de_internet: false, en_acervo: true, norma: null };
const APOYO_TCC = { registro: '2020001', rubro: 'Rubro de prueba B.', instancia: 'Tribunales Colegiados',
                    tipo: 'jurisprudencia', fuerza: 'orienta', fuerza_texto: 'orienta (art. 217, párr. tercero)',
                    vigencia: null, de_internet: true, en_acervo: true, norma: null };
const APOYO_ABANDONADO = { registro: '2009817', rubro: 'Rubro de prueba C.', instancia: 'Pleno', tipo: 'aislada',
                           fuerza: 'orienta', vigencia: 'abandonada', en_acervo: true };
const APOYO_SIN_ACERVO = { registro: '1999999', rubro: '', en_acervo: false };
const NORMA = { norma: 'art. 93, fr. VI, LA (prueba)' };

function base(extra = {}) {
    return {
        formato: 1, estado_calculo: 'listo', huella: 'h1',
        principal: {
            numero: 1, pregunta: '¿Pregunta principal de prueba?', clase: 'fondo', jerarquia_de: 'fase3',
            por_que_principal: 'Por qué es el principal (prueba).',
            discrepa_motor: null,
            contraste: { razon_toral: 'Razón toral de prueba.', la_combate: true, sobrevive: false, veredicto_previo: 'a_examinar' },
            prediccion: { frase: 'frase de jurimetría de prueba', n: 12 },
        },
        vias: {
            propuesta: { sentido: 'infundado', prospera: false, razon: 'Razón de la vía A (prueba).', efecto: 'Efecto A.',
                         desenlace: ['PRIMERO. Se confirma (prueba).', 'SEGUNDO. Se concede (prueba).'],
                         desenlace_nota: null, interpretacion: null, cadena: null, objecion: null,
                         apoyos: [APOYO_SCJN, APOYO_ABANDONADO, APOYO_SIN_ACERVO, NORMA], via_protectora: null },
            opuesta: { sentido: 'fundado', prospera: true, razon: 'Razón de la vía B (prueba).', efecto: 'Efecto B.',
                       desenlace: ['PRIMERO. Se revoca (prueba).', 'SEGUNDO. Se niega (prueba).'],
                       desenlace_nota: 'Nota del desenlace (prueba).', interpretacion: 'Interpretación B (prueba).',
                       cadena: null, objecion: { de_la_otra_via: 'Objeción de la vía A (prueba).', respuesta: 'Respuesta B.' },
                       apoyos: [APOYO_TCC], via_protectora: null },
        },
        recomendada: 'propuesta', estado: 'claro', estado_por_que: ['Razón del estado 1 (prueba).'],
        secundarios: [{
            numero: 2, pregunta: '¿Pregunta secundaria procesal de prueba?', clase: 'procesal', relacion: 'depende',
            en_propuesta: { sentido: 'infundado', de: 'arbol', por_que: 'Por qué en A (prueba).', relacion: 'depende',
                            guarda: null, recalificar: false, previsto: false },
            en_opuesta: { sentido: 'innecesario', de: 'motor', por_que: 'Por qué en B (prueba).', relacion: 'depende',
                          guarda: null, recalificar: true, previsto: true },
        }],
        independientes: [{ numero: 3, pregunta: '¿Pregunta independiente de prueba?',
                           propuesta: { sentido: 'inoperante', razon: 'Razón propia (prueba).', apoyos: [] } }],
        que_la_cambiaria: { en_contra: 'Lo que se diría en contra de A (prueba).', crux: null,
                            constancias_indispensables: ['Constancia de prueba'], limite_protector: null },
        tu_tribunal: [
            { expediente: 'AR 10/2025', fecha: '2025-03-01', sentido: 'confirma', calificacion: 'infundado',
              razon: 'Razón de la fila 1.', similitud: 0.94, nivel: 'mismo_problema', neun: '31415926',
              tipo_asunto: 'Amparo en revisión', cota_inferior: false, fuente: 'planteamiento',
              pregunta: '¿Pregunta del precedente 1?', enlace_oaj: 'https://ejusticia.cjf.gob.mx/BuscadorSISE/' },
            { expediente: 'AR 11/2025', fecha: '2025-04-01', sentido: 'CONCEDE', calificacion: '',
              razon: '', similitud: null, nivel: null, neun: '' },
            // UN POSIBLE CON CALIFICACIÓN QUE CASARÍA CON UNA VÍA: no va bajo ninguna.
            { expediente: 'AR 12/2025', fecha: '2025-05-01', sentido: 'revoca', calificacion: 'fundado',
              razon: 'Razón del posible.', similitud: 0.66, nivel: 'posible', neun: '27182818',
              tipo_asunto: 'Amparo en revisión', cota_inferior: true, fuente: 'planteamiento',
              pregunta: '¿Pregunta del posible?', enlace_oaj: 'https://ejusticia.cjf.gob.mx/BuscadorSISE/' },
        ],
        linea_corte: { confirmadas: [APOYO_TCC], pistas: ['Pista de prueba sin confirmar'] },
        deliberacion: null,
        conceptos_omitidos: { hacen_falta: true, por_que: 'art. 93, fr. VI (prueba)', tenemos: false },
        avisos: ['Aviso de prueba'],
        ...extra,
    };
}

/* ═══ 1 · LA LECTURA TOLERANTE ═══ */
{
    ok(api.tarjetaDe(null) === null && api.tarjetaDe('x') === null && api.tarjetaDe([]) === null,
       'lo que no es objeto → null');
    const v = api.tarjetaDe({});
    ok(v && v.estado === '' && v.recomendada === null && v.principal === null
       && v.vias.propuesta === null && v.vias.opuesta === null && v.secundarios.length === 0
       && v.estado_calculo === 'listo' && v.origen === 'servidor',
       'objeto vacío → tarjeta vacía, sin estado ni vías');
    ok(api.tarjetaDe({ estado: 'renido' }).estado === 'reñido', '«renido» sin eñe se lee «reñido»');
    ok(api.tarjetaDe({ estado: 'seguro' }).estado === '', 'un estado desconocido no se inventa');
    ok(api.tarjetaDe({ estado_calculo: 'calculando' }).estado_calculo === 'calculando', 'calculando');
    const t = api.tarjetaDe(base());
    ok(t.principal.numero === 1 && t.principal.contraste.la_combate === true, 'principal y su contraste');
    ok(t.vias.propuesta.apoyos.length === 4 && t.vias.propuesta.apoyos[3].norma, 'apoyos: tesis y norma');
    ok(t.vias.propuesta.apoyos[2].en_acervo === false, 'en_acervo:false se conserva');
    ok(t.vias.opuesta.apoyos[0].fuerza === 'orienta' && t.vias.opuesta.apoyos[0].de_internet,
       'fuerza y de_internet');
    ok(t.secundarios[0].en_opuesta.previsto === true && t.secundarios[0].en_opuesta.recalificar === true,
       'la suerte prevista de la opuesta');
    ok(t.conceptos_omitidos.hacen_falta === true && t.conceptos_omitidos.tenemos === false, 'conceptos omitidos');
    ok(t.linea_corte.pistas.length === 1 && t.linea_corte.confirmadas.length === 1, 'línea de la Corte');
    const raro = api.tarjetaDe({ vias: { propuesta: { sentido: 'FUNDADO', apoyos: ['2015688', 'art. 1 CPF', '', null, { fuerza: 'x' }] },
                                          opuesta: { sentido: '', razon: '' } },
                                 secundarios: [{}, { numero: '2', en_propuesta: 'x' }],
                                 tu_tribunal: [{ expediente: '' }, { expediente: 'X 1', similitud: 'no' }] });
    ok(raro.vias.propuesta.sentido === 'fundado', 'el sentido se normaliza a minúsculas');
    ok(raro.vias.propuesta.apoyos.length === 2 && raro.vias.propuesta.apoyos[0].registro === '2015688'
       && raro.vias.propuesta.apoyos[1].norma === 'art. 1 CPF', 'apoyos en texto: registro o norma; los vacíos fuera');
    ok(raro.vias.opuesta === null, 'una vía sin sentido ni razón es null');
    ok(raro.secundarios.length === 1 && raro.secundarios[0].numero === 2 && raro.secundarios[0].en_propuesta === null,
       'secundarios: sin número ni pregunta fuera; suerte ilegible → null');
    ok(raro.tu_tribunal.length === 1 && raro.tu_tribunal[0].similitud === null, 'tu tribunal: sin expediente fuera');
}
/* leerTarjeta con un fetch falso */
{
    const fetchReal = globalThis.fetch;
    const pedidos = [];
    const responder = (status, cuerpo) => { globalThis.fetch = async (url) => {
        pedidos.push(String(url));
        return { ok: status >= 200 && status < 300, status, json: async () => cuerpo };
    }; };
    responder(200, base());
    const t = await api.leerTarjeta('631/2025', 'casa@iurexia.com');
    ok(t && t.estado === 'claro', '200 → tarjeta leída');
    ok(/\/taller\/tarjeta\?numero=631%2F2025&user_email=casa%40iurexia\.com$/.test(pedidos[0]),
       'GET /taller/tarjeta con numero y user_email codificados');
    responder(404, { detail: 'Not Found' });
    ok(await api.leerTarjeta('1', 'a@b') === null, '404 (servidor sin la tarjeta) → null, no error');
    responder(405, {});
    ok(await api.leerTarjeta('1', 'a@b') === null, '405 → null');
    responder(500, { detail: 'se cayó' });
    let lanzo = false;
    try { await api.leerTarjeta('1', 'a@b'); } catch (e) { lanzo = /se cayó/.test(e.message); }
    ok(lanzo, '500 → error con el detalle');
    globalThis.fetch = fetchReal;
}

/* ═══ 2 · LA LÓGICA PURA ═══ */
{
    const t = api.tarjetaDe(base());
    ok(td.hayAlternativaReal(t), 'infundado frente a fundado: alternativa real');
    ok(!td.hayAlternativaReal(api.tarjetaDe(base({ vias: { propuesta: base().vias.propuesta,
        opuesta: { ...base().vias.opuesta, sentido: 'inoperante', prospera: false } } }))),
       'inoperante frente a infundado: NO es contraria');
    ok(!td.hayAlternativaReal(api.tarjetaDe(base({ vias: { propuesta: base().vias.propuesta, opuesta: null } }))),
       'sin opuesta: no hay alternativa');
    ok(td.sinRecomendar(api.tarjetaDe(base({ estado: 'reñido' }))) && td.sinRecomendar(api.tarjetaDe(base({ estado: 'no_alcanza' })))
       && !td.sinRecomendar(t), 'reñido y no alcanza no recomiendan; claro sí');
    ok(td.ladoDelSentido(t, 'inoperante') === 'propuesta' && td.ladoDelSentido(t, 'esencialmente_fundado') === 'opuesta'
       && td.ladoDelSentido(t, '') === null, 'la vía de una calificación, por grupo');

    // QUÉ VÍA ESTÁ EN PANTALLA
    const e = { enGlobal: true, globalDictado: false, sentidoGlobal: 'infundado', razonGlobal: 'Razón de la vía A (prueba).',
                sentidoMotor: 'infundado', nTocados: 0, tarjeta: t, elegida: null };
    ok(td.viaActivaDe(e) === 'propuesta', 'eco del motor → la propuesta');
    ok(td.viaActivaDe({ ...e, globalDictado: true, sentidoGlobal: 'fundado', razonGlobal: 'Razón de la vía B (prueba).' }) === 'contraria',
       'dictado, sentido y razón de la opuesta → la contraria');
    ok(td.viaActivaDe({ ...e, globalDictado: true, sentidoGlobal: 'fundado', razonGlobal: 'Razón de la vía A (prueba).' }) === 'criterio',
       'LECCIÓN 1 DEL 631: el sentido contrario con la razón de la propuesta es SU criterio, no la contraria');
    ok(td.viaActivaDe({ ...e, globalDictado: true, sentidoGlobal: 'esencialmente_fundado', razonGlobal: 'Razón de la vía B (prueba).' }) === 'criterio',
       'otra calificación del mismo grupo: su criterio');
    ok(td.viaActivaDe({ ...e, nTocados: 1 }) === 'criterio', 'con algo marcado a mano: su criterio');
    ok(td.viaActivaDe({ ...e, enGlobal: false }) === 'criterio', 'problema por problema: su criterio');
    const sinRazon = api.tarjetaDe(base({ vias: { propuesta: base().vias.propuesta,
        opuesta: { ...base().vias.opuesta, razon: '' } } }));
    ok(td.viaActivaDe({ ...e, tarjeta: sinRazon, globalDictado: true, sentidoGlobal: 'fundado', razonGlobal: '',
                        elegida: 'contraria' }) === 'contraria', 'opuesta sin razón, recién elegida: la contraria');
    ok(td.viaActivaDe({ ...e, tarjeta: sinRazon, globalDictado: true, sentidoGlobal: 'fundado', razonGlobal: 'redactada',
                        elegida: 'contraria' }) === 'contraria', '… y sigue siéndolo tras redactar su criterio');
    ok(td.viaActivaDe({ ...e, tarjeta: sinRazon, globalDictado: true, sentidoGlobal: 'fundado', razonGlobal: 'mía',
                        elegida: 'criterio' }) === 'criterio', 'sin haberla elegido, una razón suya es su criterio');
    const delib = api.tarjetaDe(base({ vias: { propuesta: { ...base().vias.opuesta }, opuesta: { ...base().vias.propuesta } } }));
    ok(td.viaActivaDe({ ...e, tarjeta: delib, globalDictado: true, sentidoGlobal: 'fundado',
                        razonGlobal: 'Razón de la vía B (prueba).' }) === 'propuesta',
       'con deliberación, la propuesta que no es la del motor: dictada con SU razón');

    // LA SUERTE Y SU RÓTULO
    ok(td.suerteDe(t, 2, '', 'propuesta').sentido === 'infundado' && td.suerteDe(t, 2, '', 'opuesta').sentido === 'innecesario',
       'la suerte de un secundario en cada vía');
    ok(td.suerteDe(t, 3, '', null).relacion === 'distinto', 'un independiente lleva la suya en cualquier vía');
    ok(td.suerteDe(t, 9, '', 'propuesta') === null, 'número sin secundario → null');
    const R = (s, pr) => td.rotuloDeSuerte({ sentido: '', de: 'arbol', por_que: '', relacion: '', guarda: null,
                                             recalificar: false, previsto: false, ...s }, pr);
    ok(R({ sentido: 'innecesario', relacion: 'depende' }, true).texto === 'Queda sin materia: lo absorbe el principal',
       'innecesario con el principal que prospera');
    /* «autonoma»/«mixta» del árbol = LIGADO al principal con causa propia,
       no «tema distinto» (revisión del 28-sep-2026, la 462). */
    ok(R({ sentido: 'innecesario', relacion: 'autonoma' }, true).texto === 'Innecesario por suficiencia',
       'autónomo e innecesario: por suficiencia, no lo absorbe el principal');
    ok(R({ sentido: 'infundado', relacion: 'autonoma' }, false).texto === 'Ligado al principal, con causa propia: se estudia · infundado'
       && R({ sentido: 'infundado', relacion: 'autonoma' }, false).corto === 'se estudia',
       'autónomo: ligado al principal, se estudia con su calificación (no «tema distinto»)');
    ok(R({ sentido: 'fundado', relacion: 'mixta' }, true).texto.startsWith('Ligado al principal, con causa propia')
       && !R({ sentido: 'fundado', relacion: 'mixta' }, true).texto.includes('tema distinto'), 'mixta: igual que autónoma');
    ok(R({ sentido: 'innecesario' }, false).texto === 'Innecesario por suficiencia', 'innecesario sin prosperar');
    ok(R({ sentido: 'infundado', relacion: 'presupone' }, false).texto === 'Cae con lo desestimado · infundado',
       'presupone y el principal cae');
    ok(R({ sentido: 'fundado', guarda: 'procesal' }, false).texto === 'Violación procesal: se decide · fundado', 'guarda procesal');
    ok(R({ guarda: 'mayor_beneficio_189' }, true).texto.includes('art. 189'), 'mayor beneficio, art. 189');
    ok(R({ relacion: 'distinto', sentido: 'inoperante' }, true).texto === 'Se estudia aparte: tema distinto · inoperante', 'tema distinto');
    ok(R({ recalificar: true }, true).tono === 'ambar', 'por recalificar sin previsión: ámbar');
    ok(td.rotuloDeSuerte(null, true).texto === 'Sin suerte prevista', 'sin suerte');
    ok(R({ sentido: 'infundado', de: 'motor' }, false).corto === 'del motor', 'corto: del motor');

    ok(td.textoDeFuerza(t.vias.opuesta.apoyos[0]) === 'orienta (art. 217, párr. tercero)', 'fuerza: el texto del servidor manda');
    ok(td.textoDeFuerza({ ...t.vias.opuesta.apoyos[0], fuerza_texto: '', fuerza: 'pleno_circuito' }) === 'Pleno de Circuito',
       'fuerza: Pleno de Circuito, sin afirmar si obliga');
    const citar = td.apoyosParaCitar(t.vias.propuesta);
    ok(citar.citables.length === 2 && citar.fuera === 2, 'fuera lo abandonado y lo que no está en el acervo; la norma se queda');

    ok(td.ladoQueRevoca(t, true) === 'opuesta', 'la que revoca, por su desenlace');
    const sinDes = api.tarjetaDe(base({ vias: { propuesta: { ...base().vias.propuesta, desenlace: [] },
                                                opuesta: { ...base().vias.opuesta, desenlace: [] } } }));
    ok(td.ladoQueRevoca(sinDes, true) === 'opuesta' && td.ladoQueRevoca(sinDes, false) === null,
       'sin desenlace: en un recurso, la que prospera; en amparo directo, ninguna');

    const trib = td.tribunalPorLado(t);
    ok(trib.propuesta.length === 1 && trib.opuesta.length === 0 && trib.sin_lado.length === 2,
       'tu tribunal: la fila calificada «infundado» va con la vía A; la que no trae calificación, aparte');
    ok(trib.sin_lado.some((f) => f.expediente === 'AR 12/2025') && !trib.opuesta.some((f) => f.expediente === 'AR 12/2025'),
       'tu tribunal: un «posible» calificado «fundado» NO va con la vía que prospera: aparte');

    const cA = td.contrasteParaVia({ la_combate: false, sobrevive: false }, false, true);
    const cB = td.contrasteParaVia({ la_combate: false, sobrevive: false }, true, true);
    const cN = td.contrasteParaVia({ la_combate: true, sobrevive: false }, true, true);
    ok(cA.tono === 'a_favor' && cB.tono === 'en_contra' && cN.tono === 'neutro',
       'contraste: no combate → sostiene la que no prospera; combate y no sobrevive → neutro');
    ok(td.contrasteParaVia(null, true, true) === null && td.contrasteParaVia({ la_combate: true, sobrevive: true }, null, true) === null,
       'sin contraste o sin saber si prospera: nada');

    ok(td.elegirTarjeta(t, null) === t, 'la del servidor manda');
    const local = { ...t, origen: 'local' };
    ok(td.elegirTarjeta({ ...t, estado_calculo: 'calculando' }, local) === local, 'calculando → la local');
    ok(td.elegirTarjeta({ ...t, vias: { propuesta: null, opuesta: null } }, local) === local,
       'la del servidor sin vía propuesta, con la local que sí la tiene → la local');
}
/* LA TARJETA LOCAL Y «SOLTAR LO TOCADO» */
const PROPUESTA = {
    propuestas: [
        { problema: '¿P1?', sentido: 'infundado', razon: 'razón motor 1', apoyos: ['2015688'], confianza: 'alta', alcanza: true, jerarquia: 'principal' },
        { problema: '¿P2?', sentido: 'infundado', razon: 'razón motor 2', apoyos: [], confianza: 'media', alcanza: true },
        { problema: '¿P3?', sentido: '', razon: '', apoyos: [], confianza: '', alcanza: false },
    ],
    global: {
        sentido: 'infundado', razon: 'razón global', problema_que_decide: '¿P1?', efecto: 'efecto global',
        apoyos: ['Registro 2015688', '9999999', 'art. 14 CPEUM'], confianza: 'alta', en_contra: 'en contra global', alcanza: true,
        contexto: { hechos: '', resolvio: '', combate: '', tema_principal: 'tema principal de prueba' },
        alternativa: { sentido: 'fundado', razon: '', efecto: 'efecto alt', apoyos: ['2020001'] },
        via_protectora: { sentido: 'fundado', posible: true, norma: 'norma prueba', lectura: 'lectura', limite: 'límite', apoyos: [] },
        constancias: [{ que: 'constancia X', para_que: '', indispensable: true, problema: 1 },
                      { que: 'constancia Y', para_que: '', indispensable: false, problema: 1 }],
        checklist: [
            { numero: 2, tema: 'P2', papel: 'accesorio', con_propuesta: 'texto A', con_alternativa: 'texto B', relacion: 'depende',
              si_prospera: { sentido: 'innecesario', razon: 'lo absorbe' }, si_no_prospera: { sentido: 'infundado', razon: 'cae' } },
            { numero: 3, tema: 'P3', papel: 'accesorio', con_propuesta: 'solo texto', con_alternativa: '', tema_distinto: true },
        ],
    },
    contraste: [{ numero: 1, razon_toral: 'toral', la_combate: false, sobrevive: false, veredicto_previo: 'inoperante', por_que: '' }],
    resumen: '', avisos: [], criteriosJson: '', modelo: '', necesitaConceptos: false,
};
const PROBLEMAS = [
    { id: 'a', pregunta: '¿P1?', resolvio: '', combate: '', candidatos: [], criterio: '', jerarquia: 'principal',
      prediccion: { sentido: 'infundado', porcentaje: 70, n: 10, confianza: 'media', frase: 'frase P1' } },
    { id: 'b', pregunta: '¿P2?', resolvio: '', combate: '', candidatos: [], criterio: '', jerarquia: 'accesorio' },
    { id: 'c', pregunta: '¿P3?', resolvio: '', combate: '', candidatos: [], criterio: '', jerarquia: 'accesorio' },
];
const TESIS = [{ registro: '2015688', rubro: 'Rubro A', instancia: 'Primera Sala', obligatoria: true, localizacion: '', texto: 'texto A' },
               { registro: '2020001', rubro: 'Rubro B', instancia: 'TCC', obligatoria: true, localizacion: '', texto: '' }];
{
    const l = td.tarjetaDeLaPropuesta(PROPUESTA, PROBLEMAS, TESIS);
    ok(l.origen === 'local' && l.estado === '' && l.recomendada === null, 'local: sin estado ni recomendación');
    ok(l.principal.numero === 1 && l.principal.por_que_principal === 'tema principal de prueba'
       && l.principal.contraste.la_combate === false && l.principal.prediccion.frase === 'frase P1',
       'local: el principal, su porqué, su contraste y su jurimetría');
    ok(l.vias.propuesta.apoyos.length === 2 && l.vias.propuesta.apoyos[0].rubro === 'Rubro A'
       && l.vias.propuesta.apoyos[0].fuerza === '' && l.vias.propuesta.apoyos[1].norma === 'art. 14 CPEUM',
       'local: registro hidratado con el material SIN fuerza; el que no está, fuera; la norma se queda');
    ok(l.vias.opuesta.sentido === 'fundado' && l.vias.opuesta.razon === '' && l.vias.opuesta.via_protectora?.posible
       && l.vias.propuesta.via_protectora === null, 'local: la vía protectora cae del lado de su grupo');
    const s2 = l.secundarios.find((s) => s.numero === 2);
    ok(s2.en_propuesta.sentido === 'infundado' && s2.en_opuesta.sentido === 'innecesario'
       && s2.en_propuesta.previsto && s2.en_opuesta.previsto, 'local: si_no_prospera / si_prospera por vía, «previsto»');
    const s3 = l.secundarios.find((s) => s.numero === 3);
    ok(s3.relacion === 'distinto' && s3.en_propuesta.por_que === 'solo texto' && s3.en_propuesta.sentido === '',
       'local: tema distinto y el texto libre cuando no hay suerte estructurada');
    ok(l.que_la_cambiaria.constancias_indispensables.join() === 'constancia X', 'local: sólo las indispensables');
    const sinG = td.tarjetaDeLaPropuesta({ ...PROPUESTA, global: null }, PROBLEMAS, TESIS);
    ok(sinG.vias.propuesta.sentido === 'infundado' && sinG.vias.opuesta === null
       && sinG.secundarios[0].en_propuesta.previsto === false, 'local sin global: la propuesta por problema, sin contraria');
    const nada = td.tarjetaDeLaPropuesta({ ...PROPUESTA, global: null, propuestas: [] }, PROBLEMAS, TESIS);
    ok(nada.vias.propuesta === null && nada.estado_calculo === 'sin_propuesta', 'sin nada: sin propuesta');

    const tocados = [
        { ...PROBLEMAS[0], sentido: 'fundado', criterio: 'mi razón', razonDe: { sentido: 'fundado', delMotor: false }, de: 'tuya' },
        { ...PROBLEMAS[1], sentido: 'innecesario', criterio: 'razón que puso el reparto', razonDe: { sentido: 'innecesario', delMotor: true }, de: 'principal', porQue: 'x' },
        { ...PROBLEMAS[2], sentido: 'fundado', criterio: '', de: 'tuya' },
    ];
    const s = td.soltarLoTocado(tocados, PROPUESTA.propuestas);
    ok(s[0].sentido === 'infundado' && s[0].criterio === 'mi razón' && s[0].de === 'motor',
       'soltar: vuelve la calificación del motor y SU texto se queda');
    ok(s[1].sentido === 'infundado' && s[1].criterio === 'razón motor 2' && s[1].razonDe.delMotor && s[1].porQue === '',
       'soltar: lo que movió el reparto vuelve a la propuesta, con la razón del motor');
    ok(s[2].sentido === undefined && s[2].de === undefined, 'soltar: sin propuesta del motor, sin calificación');
}

/* ═══ 3 · EL HTML DE LA TARJETA ═══ */
const props = (t, extra = {}) => ({
    tarjeta: api.tarjetaDe(t), esRecurso: true, hayGlobal: true, hayPropuestas: true,
    viaActiva: 'propuesta', viaElegida: false, ladoSecundarios: 'propuesta',
    tesis: TESIS, onAbrirTesis: () => {}, onResolverAsi: () => {}, onResolverOpuesta: () => {},
    onMiCriterio: () => {}, onRedactarOpuesta: () => {}, ...extra,
});
{   /* A · propuesta y opuesta, estado claro */
    const h = muestra('A · claro, sin elegir', pintar(React.createElement(PP, props(base()))));
    ok(h.includes('id="problema-principal"') && h.includes('tarjeta-clave'), 'A: la tarjeta clave con su id');
    ok(h.includes('El problema principal · decide el asunto') && h.includes('¿Pregunta principal de prueba?'),
       'A: el rótulo y la pregunta del principal');
    ok(h.includes('Te propongo') && h.includes('¿O resolverías en sentido opuesto?') && !h.includes('Vía A'),
       'A: claro → «Te propongo» y «¿O resolverías…?»');
    ok(/border-accent-gold/.test(boton(h, 'Resolver así')), 'A: «Resolver así» en oro');
    ok(!/border-accent-gold/.test(boton(h, 'Resolver en sentido opuesto')), 'A: la opuesta en negro');
    ok(h.includes('Resolver con mi criterio'), 'A: el tercer botón');
    const b = fila3(h);
    ok(b.indexOf('Resolver así') < b.indexOf('Resolver en sentido opuesto')
       && b.indexOf('Resolver en sentido opuesto') < b.indexOf('Resolver con mi criterio'), 'A: el orden de los botones');
    ok(chip(h) === 'vía: la propuesta · sin confirmar', 'A: el chip de la vía, sin confirmar');
    const A = columna(h, 'propuesta'), B = columna(h, 'opuesta');
    ok(A.includes('PRIMERO. Se confirma (prueba).') && B.includes('PRIMERO. Se revoca (prueba).'), 'A: el desenlace de cada vía');
    ok(A.includes('Rubro de prueba A.') && A.includes('>obliga<') && A.includes('art. 93, fr. VI, LA (prueba)'),
       'A: «Lo aplicaría con» con su fuerza y la norma');
    ok(!A.includes('Rubro de prueba C.') && !A.includes('1999999') && A.includes('2 criterios más se quedaron fuera'),
       'A: lo abandonado y lo que no está en el acervo NO se pinta como cita, y se dice');
    ok(B.includes('orienta (art. 217, párr. tercero)') && B.includes('línea de la Corte · internet'),
       'A: la jurisprudencia de colegiado orienta, y la de internet se marca');
    ok(A.includes('AR 10/2025') && !B.includes('AR 10/2025'), 'A: tu tribunal, en la columna de su calificación');
    ok(h.includes('Tu tribunal en este punto') && h.includes('AR 11/2025'), 'A: la fila sin calificación, aparte');
    ok(A.includes('Lo que se diría en contra de A (prueba).') && B.includes('Objeción de la vía A (prueba).'),
       'A: por dónde se cae cada una');
    ok(A.includes('El contraste no la descarta') && B.includes('El contraste no la descarta'),
       'A: combate y no sobrevive → el contraste no descarta ninguna');
    ok(!A.includes('conceptos de violación que el juez no estudió') && B.includes('conceptos de violación que el juez no estudió')
       && B.includes('No constan en lo que se subió'), 'A: los conceptos omitidos, sólo en la vía que revoca');
    ok(h.includes('Claro: el material sostiene la propuesta') && h.includes('Razón del estado 1 (prueba).'), 'A: el estado y su porqué');
    // NINGÚN PORCENTAJE DEL MOTOR (su confianza no predice el acierto). La
    // única excepción es la insignia del precedente propio: la probabilidad
    // CALIBRADA de que sea el mismo problema, que David pidió (28-sep-2026,
    // «opción 1 + 2») y que no es un juicio del motor sobre el asunto.
    ok(!/\d+\s?%/.test(h.replace(/\d+% (o más )?· (mismo problema|posible)/g, '')),
       'A: ningún porcentaje en la tarjeta fuera de la insignia calibrada de un precedente');
    ok(A.includes('94% · mismo problema') && A.includes('¿Pregunta del precedente 1?')
       && A.includes('Amparo en revisión AR 10/2025'),
       'A: el precedente del mismo problema lleva su probabilidad, su pregunta y su tipo');
    ok(A.includes('31415926') && A.includes('Buscador de la OAJ'),
       'A: y se puede abrir: el NEUN para copiar y el Buscador de la OAJ');
    // `columna` corta la B hasta el final del HTML: se corta aquí donde empieza
    // lo que va aparte, debajo de las dos vías.
    const finVias = Math.min(...['Tu tribunal en este punto', 'Posibles precedentes']
        .map((x) => h.indexOf(x)).filter((x) => x >= 0));
    const Bvia = h.slice(h.indexOf('data-via="opuesta"'), finVias);
    ok(!A.includes('AR 12/2025') && !Bvia.includes('AR 12/2025')
       && h.indexOf('AR 12/2025') > h.indexOf('Posibles precedentes')
       && h.includes('66% o más · posible'),
       'A: el posible NO va bajo ninguna vía: aparte, rotulado, con su cota');
    ok(h.includes('Pista de prueba sin confirmar') && h.includes('no se citan'), 'A: las pistas, dichas como no citables');
    ok(h.includes('Se estudian aparte') && h.includes('propuesta propia · inoperante'), 'A: el independiente con su propuesta');
    ok(h.includes('Constancia de prueba'), 'A: qué cambiaría la decisión');
    // secundarios en la vía propuesta
    const fila = (x) => { const i = x.indexOf('data-secundario="2"'); return x.slice(i, x.indexOf('</li>', i)); };
    ok(fila(h).includes('Infundado') && fila(h).includes('Por qué en A (prueba).') && !fila(h).includes('previsto'),
       'A: el secundario con su suerte en la vía propuesta');
    ok(h.includes('Se resuelven solos con el principal'), 'A: el pie de los secundarios');
}
{   /* A2 · la contraria elegida: la suerte cambia de vía */
    const h = muestra('A2 · la contraria elegida', pintar(React.createElement(PP, props(base(), { viaActiva: 'contraria', viaElegida: true, ladoSecundarios: 'opuesta' }))));
    const i = h.indexOf('data-secundario="2"'); const f = h.slice(i, h.indexOf('</li>', i));
    ok(f.includes('Queda sin materia: lo absorbe el principal') && f.includes('previsto'),
       'A2: en la contraria, la suerte de esa vía, rotulada «previsto»');
    ok(chip(h) === 'vía: la contraria', 'A2: el chip dice la contraria, ya confirmada');
    ok(/border-accent-gold/.test(columna(h, 'opuesta').slice(0, 300)) && !/border-accent-gold/.test(columna(h, 'propuesta').slice(0, 300)),
       'A2: sólo la columna elegida se enmarca en oro');
    ok(/aria-pressed="true"/.test(boton(h, 'Resolver en sentido opuesto')), 'A2: el botón de la contraria, pulsado');
}
{   /* A3 · un secundario marcado a mano */
    const h = pintar(React.createElement(PP, props(base(), { viaActiva: 'criterio', marcados: { 2: { sentido: 'fundado', quien: 'marcado por ti' } } })));
    ok(h.includes('marcado por ti · fundado'), 'A3: lo marcado a mano manda y se dice');
}
{   /* B · sin opuesta */
    const h = muestra('B · sin opuesta', pintar(React.createElement(PP, props(base({ vias: { propuesta: base().vias.propuesta, opuesta: null } })))));
    ok(columna(h, 'opuesta').includes('El motor no encontró cómo sostener la vía contraria'), 'B: la columna apagada con su leyenda');
    ok(/disabled/.test(boton(h, 'Resolver en sentido opuesto')), 'B: el botón contrario, apagado');
    const h2 = pintar(React.createElement(PP, props(base({ vias: { propuesta: base().vias.propuesta,
        opuesta: { ...base().vias.opuesta, sentido: 'inoperante', prospera: false } } }))));
    ok(columna(h2, 'opuesta').includes('El motor no encontró') && /disabled/.test(boton(h2, 'Resolver en sentido opuesto')),
       'B: una «opuesta» del mismo grupo tampoco es alternativa');
}
{   /* C · reñido */
    const h = muestra('C · reñido', pintar(React.createElement(PP, props(base({ estado: 'reñido', recomendada: null, estado_por_que: ['Motivo reñido (prueba).'] })))));
    ok(h.includes('Vía A') && h.includes('Vía B') && !h.includes('Te propongo') && !h.includes('¿O resolverías'),
       'C: reñido → «Vía A» y «Vía B», nada de «te propongo»');
    ok(h.includes('Resolver por la vía A') && !/border-accent-gold/.test(boton(h, 'Resolver por la vía A')),
       'C: ningún botón dorado para aceptar');
    ok(!/border-accent-gold/.test(boton(h, 'Resolver con mi criterio')), 'C: ni el de su criterio');
    ok(h.includes('Reñido: las dos vías se sostienen') && h.includes('Motivo reñido (prueba).'), 'C: el estado y su porqué');
    ok(h.split('recomendada').length === 2 && h.includes('Ninguna se rotula como recomendada'),
       'C: la palabra «recomendada» sólo aparece para negarla');
}
{   /* D · no alcanza */
    const h = muestra('D · no alcanza', pintar(React.createElement(PP, props(base({ estado: 'no_alcanza', recomendada: null })))));
    ok(fila3(h).indexOf('Resolver con mi criterio') < fila3(h).indexOf('Resolver por la vía A'), 'D: «Resolver con mi criterio» va primero');
    ok(/border-accent-gold/.test(boton(h, 'Resolver con mi criterio')) && !/border-accent-gold/.test(boton(h, 'Resolver por la vía A')),
       'D: y es el dorado');
    ok(h.includes('data-botones="criterio-primero"') && h.includes('No alcanza para recomendar'), 'D: el estado');
}
{   /* E · conceptos omitidos, cuando ya constan */
    const h = pintar(React.createElement(PP, props(base({ conceptos_omitidos: { hacen_falta: true, por_que: '', tenemos: true } }))));
    ok(columna(h, 'opuesta').includes('Constan en el expediente'), 'E: si constan, se dice que el estudio los contesta');
    const h2 = pintar(React.createElement(PP, props(base({ conceptos_omitidos: { hacen_falta: false, por_que: '', tenemos: false } }))));
    ok(!h2.includes('que el juez no estudió'), 'E: si no hacen falta, no hay aviso');
}
{   /* F · la contraria sin razón */
    const sin = base({ vias: { propuesta: base().vias.propuesta, opuesta: { ...base().vias.opuesta, razon: '' } } });
    const h = pintar(React.createElement(PP, props(sin)));
    ok(columna(h, 'opuesta').includes('El motor no escribió la razón de esta vía')
       && columna(h, 'opuesta').includes('Si eliges esta vía podrás pedir que se redacte')
       && !h.includes('Redactar el criterio de esta vía'), 'F: sin elegirla, sólo se anuncia');
    const h2 = pintar(React.createElement(PP, props(sin, { viaActiva: 'contraria', viaElegida: true, ladoSecundarios: 'opuesta' })));
    ok(h2.includes('Redactar el criterio de esta vía'), 'F: elegida, el botón de redactar (llamada al motor sólo con clic)');
    const h3 = pintar(React.createElement(PP, props(sin, { viaActiva: 'contraria', viaElegida: true, razonActiva: 'Razón redactada (prueba).' })));
    ok(h3.includes('redactada a tu pedido') && h3.includes('Razón redactada (prueba).'), 'F: redactada, se enseña como tal');
}
{   /* G · sin propuesta global */
    const h = muestra('G · sin propuesta global', pintar(React.createElement(PP, props(base({ vias: { propuesta: base().vias.propuesta, opuesta: null } }),
                                                   { hayGlobal: false }))));
    ok(h.includes('El motor propone para este problema') && !h.includes('¿O resolverías') && !h.includes('Resolver así'),
       'G: el principal con su propuesta por problema, sin contraria ni «resolver así»');
    ok(h.includes('Resolver con mi criterio') && h.includes('propuso problema por problema'), 'G: su criterio y el porqué');
    ok(!chip(h), 'G: sin vías no hay chip de vía');
    const h2 = pintar(React.createElement(PP, props(base({ vias: { propuesta: null, opuesta: null } }),
                                                    { hayGlobal: false, hayPropuestas: false, onProponer: () => {} })));
    ok(h2.includes('no propuso ningún sentido') && h2.includes('Volver a pedir la propuesta'), 'G: sin nada, volver a pedirla');
}
{   /* H · la tarjeta local, pintada */
    const l = td.tarjetaDeLaPropuesta(PROPUESTA, PROBLEMAS, TESIS);
    const h = pintar(React.createElement(PP, { ...props(base()), tarjeta: l }));
    ok(h.includes('data-origen="local"') && !h.includes('data-estado-banda'), 'H: la local no dice ningún estado');
    ok(h.includes('Te propongo') && h.includes('Rubro A') && !h.includes('>obliga<'),
       'H: la local no rotula «obliga» (el «obligatoria» del acervo no vale para un colegiado)');
    ok(h.includes('el árbol de decisión lo confirma al generar'), 'H: dice que lo «previsto» lo confirma el árbol');
}

/* ═══ 4 · DECISION MONTADA ENTERA ═══ */
{
    const plan = { activo: true, firma: 'f', pedir: () => Promise.reject(new Error('x')), leer: () => Promise.reject(new Error('x')) };
    const comunes = {
        problemas: PROBLEMAS.map((p, i) => ({ ...p, sentido: PROPUESTA.propuestas[i].sentido || undefined })),
        onCambiar: () => {}, onGenerar: () => {}, propuesta: PROPUESTA, modo: 'global',
        sentidoGlobal: 'infundado', razonGlobal: 'razón global', globalDictado: false,
        tocados: new Set(), esRecurso: true, plan, tesisDelMaterial: TESIS,
    };
    const tServ = api.tarjetaDe(base({ secundarios: [{ ...base().secundarios[0] },
        { numero: 3, pregunta: '¿P3?', relacion: 'distinto',
          en_propuesta: { sentido: 'inoperante', de: 'arbol', relacion: 'distinto' },
          en_opuesta: { sentido: 'inoperante', de: 'arbol', relacion: 'distinto' } }], independientes: [] }));
    const h = muestra('Decision entera · la del servidor', pintar(React.createElement(Decision, { ...comunes, tarjeta: tServ })));
    ok(h.includes('id="problema-principal"') && h.includes('data-origen="servidor"'), 'D: la tarjeta del servidor, montada');
    ok(!h.includes('Ver por qué') && !h.includes('Cambiar el sentido') && !h.includes('El motor propone</p>'),
       'D: fuera «la frase» y «el porqué»');
    const fin = h.slice(h.indexOf('id="asi-sale"'));
    ok(/Infundado<\/span><span[^>]*>del motor/.test(fin) || fin.includes('del motor'), 'D: el principal en la tarjeta final');
    ok(fin.includes('¿P2?') && /sigue al principal|del motor|cae con el principal/.test(fin.slice(fin.indexOf('¿P2?'), fin.indexOf('¿P3?')))
       && fin.slice(fin.indexOf('¿P2?'), fin.indexOf('¿P3?')).includes('Infundado'),
       'D: en «todo el asunto», el accesorio con la suerte del reparto, no en blanco');
    ok(fin.slice(fin.indexOf('¿P3?')).includes('se estudia aparte'), 'D: el de tema distinto dice que se estudia aparte');
    ok(fin.includes('se ordena cuando elijas la vía'), 'D: el plan espera a que se elija la vía');
    // sin la del servidor: la local
    const h2 = pintar(React.createElement(Decision, { ...comunes, tarjeta: null }));
    ok(h2.includes('data-origen="local"') && h2.includes('Te propongo'), 'D: sin la del servidor, la local');
    const fin2 = h2.slice(h2.indexOf('id="asi-sale"'));
    ok(fin2.slice(fin2.indexOf('¿P2?'), fin2.indexOf('¿P3?')).includes('previsto'),
       'D: con la local, la suerte del accesorio se rotula «previsto»');
    // la contraria en pantalla, dictada con su razón
    const h3 = pintar(React.createElement(Decision, { ...comunes, tarjeta: tServ, sentidoGlobal: 'fundado',
                                                      globalDictado: true, razonGlobal: 'Razón de la vía B (prueba).' }));
    ok(h3.includes('vía: la contraria'), 'D: dictado con la razón de la opuesta → «la contraria»');
    const fin3 = h3.slice(h3.indexOf('id="asi-sale"'));
    ok(fin3.slice(fin3.indexOf('¿P2?'), fin3.indexOf('¿P3?')).includes('previsto'),
       'D: la tarjeta final sigue a la vía en pantalla');
    // problema por problema: la ventana manual de siempre, con su ancla
    const h4 = pintar(React.createElement(Decision, { ...comunes, tarjeta: tServ, propuesta: { ...PROPUESTA, global: null }, modo: 'por_problema' }));
    ok(!h4.includes('Te propongo') && h4.includes('El motor propone para este problema'), 'D: sin global, sin columnas');
    // sin propuesta: la tarjeta lo dice y deja volver a pedirla
    const h5 = pintar(React.createElement(Decision, { ...comunes, propuesta: null, tarjeta: null, onProponer: () => {} }));
    ok(h5.includes('no propuso ningún sentido') && h5.includes('Volver a pedir la propuesta') && h5.includes('Resolver con mi criterio'),
       'D: sin propuesta, la tarjeta lo dice y ofrece su criterio');
}

/* ═══ 5 · EL HOOK QUE PIDE LA TARJETA ═══
   Con un React mínimo (useState/useEffect con dependencias) y un reloj falso. */
{
    const FALSO = path.join(TMP, 'falso');
    const aFalso = [['require("react")', 'require("./react_falso.js")']];
    for (const f of ['api.ts', 'tipos.ts', 'calificaciones.ts', 'recalificacion.ts', 'tarjetaDelPrincipal.ts']) transpilar(FALSO, f, aFalso);
    fs.writeFileSync(path.join(FALSO, 'react_falso.js'), `
const R = { hooks: [], i: 0, efectos: [] };
function useState(ini) { const i = R.i++; if (!(i in R.hooks)) R.hooks[i] = { v: typeof ini === 'function' ? ini() : ini };
  const h = R.hooks[i]; return [h.v, (nv) => { h.v = typeof nv === 'function' ? nv(h.v) : nv; }]; }
function useRef(ini) { const i = R.i++; if (!(i in R.hooks)) R.hooks[i] = { current: ini }; return R.hooks[i]; }
function useEffect(fn, deps) { const i = R.i++; const prev = R.hooks[i];
  const cambia = !prev || !deps || deps.length !== prev.deps.length || deps.some((d, k) => !Object.is(d, prev.deps[k]));
  if (!cambia) return; const reg = { deps, limpiar: null }; R.hooks[i] = reg;
  R.efectos.push(() => { if (prev && prev.limpiar) prev.limpiar(); const c = fn(); reg.limpiar = typeof c === 'function' ? c : null; }); }
function useMemo(fn) { return fn(); }
function useCallback(fn) { return fn; }
module.exports = { __R: R, useState, useRef, useEffect, useMemo, useCallback, createElement: () => null, default: null };
`);
    const rq = createRequire(path.join(FALSO, 'x.js'));
    const Rf = rq('./react_falso.js');
    const tdf = rq('./tarjetaDelPrincipal.js');
    const vaciar = async () => { for (let k = 0; k < 20; k++) await Promise.resolve(); };
    const relojes = [];
    const stReal = globalThis.setTimeout, ctReal = globalThis.clearTimeout;
    globalThis.setTimeout = (fn, ms) => { const id = relojes.length + 1; relojes.push({ id, fn, ms, vivo: true }); return id; };
    globalThis.clearTimeout = (id) => { const r = relojes.find((x) => x.id === id); if (r) r.vivo = false; };
    const correr = async () => { for (const r of relojes.filter((x) => x.vivo)) { r.vivo = false; r.fn(); } await vaciar(); };
    let res = null;
    const pintarHook = async (prop, leer) => {
        Rf.__R.i = 0;
        res = tdf.useTarjetaDelPrincipal(prop, '631/2025', 'casa@iurexia.com', leer);
        const ef = Rf.__R.efectos.splice(0); ef.forEach((f) => f());
        await vaciar();
        Rf.__R.i = 0;
        res = tdf.useTarjetaDelPrincipal(prop, '631/2025', 'casa@iurexia.com', leer);
    };
    let n = 0;
    const cola = [];
    const leer = async () => { n += 1; return cola.length ? cola.shift() : api.tarjetaDe(base()); };
    const p1 = { ...PROPUESTA };
    await pintarHook(p1, leer);
    ok(n === 1 && res && res.estado === 'claro', 'hook: una petición por propuesta y la tarjeta llega');
    await pintarHook(p1, leer);
    ok(n === 1, 'hook: el mismo objeto de propuesta no vuelve a pedir');
    // «calculando» → reintenta con pausa, hasta el tope
    const p2 = { ...PROPUESTA };
    cola.push(api.tarjetaDe({ estado_calculo: 'calculando' }), api.tarjetaDe({ estado_calculo: 'calculando' }));
    await pintarHook(p2, leer);
    ok(res === null, 'hook: lo de la propuesta anterior no se pinta mientras llega la nueva');
    ok(relojes.some((r) => r.vivo && r.ms === tdf.PAUSA_TARJETA_MS), 'hook: «calculando» → otra pregunta tras la pausa');
    await correr(); await correr();
    Rf.__R.i = 0; res = tdf.useTarjetaDelPrincipal(p2, '631/2025', 'casa@iurexia.com', leer);
    ok(n === 4 && res && res.estado === 'claro', 'hook: tras dos «calculando», la tercera respuesta se pinta');
    // un fallo no rompe: la pantalla sigue con la local
    const p3 = { ...PROPUESTA };
    await pintarHook(p3, async () => { throw new Error('caído'); });
    ok(res === null, 'hook: si falla, null (la pantalla pinta la local)');
    // sin propuesta no se pide nada
    let pedidas = 0;
    await pintarHook(null, async () => { pedidas += 1; return null; });
    ok(pedidas === 0 && res === null, 'hook: sin propuesta no pide');
    globalThis.setTimeout = stReal; globalThis.clearTimeout = ctReal;
}

/* ═══ 6 · LA REVISIÓN DEL 28-SEP-2026 ═══
   Los siete hallazgos de la revisión del frente del 631: la deliberación que
   no es la del motor, los conceptos por la vía que viaja, «autonoma», la
   deliberación en camino y la vía confirmada. */
{
    // LA DELIBERACIÓN: la columna «propuesta» es la del juez (fundado) y el
    // motor dijo «infundado». Datos esquemáticos.
    const DELIB = { origen: 'deliberacion', pregunta_decisiva: '¿Pregunta decisiva (prueba)?', figura: '', proposicion_toral: null };
    // Las columnas y la suerte de los secundarios, cambiadas de lado: la
    // propuesta (del juez) es la fundada, donde el 2 queda innecesario.
    const s2 = base().secundarios[0];
    const juezRevoca = api.tarjetaDe(base({ deliberacion: DELIB,
        vias: { propuesta: { ...base().vias.opuesta, razon: 'Razón del juez A (prueba).' },
                opuesta: { ...base().vias.propuesta, razon: 'Razón del juez B (prueba).' } },
        secundarios: [{ ...s2, en_propuesta: s2.en_opuesta, en_opuesta: s2.en_propuesta }] }));
    const eco = { enGlobal: true, globalDictado: false, sentidoGlobal: 'infundado', razonGlobal: 'Razón del motor (prueba).',
                  sentidoMotor: 'infundado', nTocados: 0, tarjeta: juezRevoca, elegida: null };
    ok(td.viaActivaDe(eco) === 'contraria',
       'deliberación contraria al motor: el eco del motor NO es «la propuesta»; casa con la opuesta → la contraria');
    ok(td.viaActivaDe({ ...eco, tarjeta: api.tarjetaDe(base()) , razonGlobal: 'Razón de la vía A (prueba).' }) === 'propuesta',
       'sin deliberación, el eco del motor sigue siendo la propuesta');
    // misma calificación, otra razón
    const juezMismo = api.tarjetaDe(base({ deliberacion: DELIB,
        vias: { propuesta: { ...base().vias.opuesta, razon: 'Causahabiencia (prueba).' },
                opuesta: { ...base().vias.propuesta } } }));
    const ecoF = { ...eco, sentidoGlobal: 'fundado', sentidoMotor: 'fundado', razonGlobal: 'Cosa juzgada (prueba).', tarjeta: juezMismo };
    ok(td.viaActivaDe(ecoF) === 'criterio', 'deliberación con la misma calificación y otra razón: el eco NO es la propuesta');
    ok(td.viaActivaDe({ ...ecoF, globalDictado: true, razonGlobal: 'Causahabiencia (prueba).' }) === 'propuesta',
       '… dictada con la razón del juez sí lo es');
    ok(td.viaActivaDe({ ...ecoF, razonGlobal: 'Causahabiencia (prueba).' }) === 'propuesta',
       '… y el eco con la misma razón también');
    // «Resolver así» dicta cuando la columna no es la del motor
    ok(td.resolverAsiDicta(juezMismo, { sentido: 'fundado', razon: 'Cosa juzgada (prueba).' }) === true,
       'resolver así: misma calificación que el motor, otra razón del juez → se dicta con SU razón');
    ok(td.resolverAsiDicta(juezMismo, { sentido: 'fundado', razon: 'Causahabiencia (prueba).' }) === false,
       'resolver así: la misma razón → volver al eco');
    ok(td.resolverAsiDicta(juezRevoca, { sentido: 'infundado', razon: 'x' }) === true, 'resolver así: otra calificación → se dicta');
    ok(td.resolverAsiDicta(api.tarjetaDe(base()), { sentido: 'infundado', razon: 'otra' }) === false,
       'resolver así sin deliberación: volver a la propuesta aunque la razón difiera en la forma');

    // Decision con la deliberación contraria: la tarjeta final y el botón
    const plan = { activo: true, firma: 'f', pedir: () => Promise.reject(new Error('x')), leer: () => Promise.reject(new Error('x')) };
    const comunes = {
        problemas: PROBLEMAS.map((p, i) => ({ ...p, sentido: PROPUESTA.propuestas[i].sentido || undefined })),
        onCambiar: () => {}, onGenerar: () => {}, propuesta: PROPUESTA, modo: 'global',
        sentidoGlobal: 'infundado', razonGlobal: 'razón global', globalDictado: false,
        tocados: new Set(), esRecurso: true, plan, tesisDelMaterial: TESIS,
    };
    const h = muestra('6 · deliberación contraria al motor, sin elegir', pintar(React.createElement(Decision, { ...comunes, tarjeta: juezRevoca })));
    ok(chip(h) === 'vía: la contraria · sin confirmar', 'D6: el chip dice lo que viaja (la contraria), no «la propuesta»');
    ok(!h.includes('Aceptar y generar el proyecto') && h.includes('Generar el proyecto'),
       'D6: sin «Aceptar» de una vía que no es la que se enseña como propuesta');
    ok(h.includes('que no es la de la primera columna'), 'D6: se dice que lo que viaja no es la primera columna');
    const fin = h.slice(h.indexOf('id="asi-sale"'));
    const p2 = fin.slice(fin.indexOf('¿P2?'), fin.indexOf('¿P3?'));
    ok(p2.includes('Infundado') && !p2.includes('innecesario'),
       'D6: «Así va a salir» con la suerte de la vía que viaja (infundado), no la de la fundada');
}
{
    // LOS CONCEPTOS POR LA VÍA QUE VIAJA — el 631: motor «infundado»,
    // conceptos_omitidos calculado para «fundado».
    const CO = { hacen_falta: true, tenemos: false, donde: '', por_que: 'por qué (prueba)', fundamento: 'art. 93, fr. VI (prueba)', reasuncion: 'concesion' };
    const f = (x) => td.conceptosQueFaltan({ co: CO, necesitaMotor: false, sentidosQueViajan: ['infundado'], conceptos: '', ...x });
    ok(f({}).pueden === true && f({}).faltan === false, 'conceptos: la vía que no prospera no los exige, pero se ofrecen');
    ok(f({ sentidosQueViajan: ['fundado'] }).faltan === true && f({ sentidosQueViajan: ['fundado'] }).reasuncion === 'concesion',
       'conceptos: EL 631 — en sentido opuesto (fundado) faltan aunque el motor dijera que no');
    ok(f({ sentidosQueViajan: ['infundado', 'esencialmente_fundado'] }).faltan === true, 'conceptos: basta que algo de lo que viaja prospere');
    ok(f({ sentidosQueViajan: ['fundado'], conceptos: 'pegados' }).faltan === false, 'conceptos: pegados, ya no faltan');
    ok(f({ co: { ...CO, tenemos: true }, sentidosQueViajan: ['fundado'] }).faltan === false
       && f({ co: { ...CO, tenemos: true } }).pueden === false, 'conceptos: si constan, ni faltan ni se ofrece el cuadro');
    ok(f({ co: undefined, necesitaMotor: true }).faltan === true && f({ co: undefined, necesitaMotor: false, sentidosQueViajan: ['fundado'] }).faltan === false,
       'conceptos: un servidor sin el contrato → lo del motor, como antes');
    ok(f({ necesitaMotor: true, sentidosQueViajan: ['infundado'] }).faltan === false,
       'conceptos: con el contrato, la vía que no prospera no se bloquea por lo que necesitaba la del motor');

    // /taller/proponer: se lee el contrato entero
    const fetchReal = globalThis.fetch;
    let cuerpo = {};
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => cuerpo });
    cuerpo = { propuestas: [], necesita_conceptos: false, conceptos_omitidos: CO };
    const r1 = await api.proponerSolucion('631/2025', 'casa@iurexia.com');
    ok(r1.conceptosOmitidos && r1.conceptosOmitidos.reasuncion === 'concesion' && r1.conceptosOmitidos.fundamento
       && r1.conceptosOmitidos.hacen_falta && !r1.conceptosOmitidos.tenemos, 'proponer: conceptos_omitidos leído entero');
    cuerpo = { propuestas: [], conceptos_omitidos: null };
    ok((await api.proponerSolucion('1', 'a@b')).conceptosOmitidos === null, 'proponer: null = no hay nada que estudiar');
    cuerpo = { propuestas: [] };
    ok((await api.proponerSolucion('1', 'a@b')).conceptosOmitidos === undefined, 'proponer: sin el campo → undefined');
    globalThis.fetch = fetchReal;
    const tc = api.tarjetaDe(base({ conceptos_omitidos: CO, deliberacion_estado: 'EN_CURSO' }));
    ok(tc.conceptos_omitidos.reasuncion === 'concesion' && tc.conceptos_omitidos.fundamento && tc.deliberacion_estado === 'en_curso',
       'tarjeta: el contrato de B entero y el estado de la deliberación');
    ok(api.tarjetaDe(base({ deliberacion_estado: 'raro' })).deliberacion_estado === '', 'tarjeta: un estado desconocido no se inventa');

    // Decision montada con el 631: motor infundado, él dicta la contraria
    const plan = { activo: true, firma: 'f', pedir: () => Promise.reject(new Error('x')), leer: () => Promise.reject(new Error('x')) };
    const prop = { ...PROPUESTA, necesitaConceptos: false, conceptosOmitidos: CO };
    const comunes = {
        problemas: PROBLEMAS.map((p, i) => ({ ...p, sentido: PROPUESTA.propuestas[i].sentido || undefined })),
        onCambiar: () => {}, onGenerar: () => {}, propuesta: prop, modo: 'global',
        sentidoGlobal: 'infundado', razonGlobal: 'razón global', globalDictado: false,
        tocados: new Set(), esRecurso: true, plan, tesisDelMaterial: TESIS, onConceptosViolacion: () => {},
    };
    const pliegue = (x) => { const i = x.indexOf('id="conceptos-violacion"'); return i < 0 ? '' : x.slice(i, x.indexOf('</details>', i)); };
    const generar = (x) => { const k = x.indexOf('Generar sentencia en versión moderna'); return x.slice(x.lastIndexOf('<button', k), k); };
    const h1 = pintar(React.createElement(Decision, { ...comunes, tarjeta: null }));
    ok(pliegue(h1) && !/<details[^>]*open/.test(pliegue(h1)) && !/disabled=""/.test(generar(h1)),
       'C631: con la vía del motor (infundado), el cuadro se ofrece cerrado y se puede generar');
    const h2 = muestra('6 · el 631 en sentido opuesto, sin conceptos', pintar(React.createElement(Decision, { ...comunes, tarjeta: null,
        sentidoGlobal: 'fundado', globalDictado: true, razonGlobal: 'razón de la contraria' })));
    ok(/<details[^>]*open/.test(pliegue(h2)) && pliegue(h2).includes('revoca una concesión'),
       'C631: en sentido opuesto el cuadro se abre y dice que se revoca una concesión');
    // David, 28-sep-2026: al revocar una concesión se PIDEN, no se exigen; sin ellos, hueco y aviso.
    ok(!/disabled=""/.test(generar(h2)), 'C631: y «Generar» sigue activo (se genera con el punto del amparo en hueco)');
    ok(h2.includes('Pégalos') && h2.includes('hueco'), 'C631: junto al botón se pide pegarlos y se avisa del hueco');
    const h3 = pintar(React.createElement(Decision, { ...comunes, tarjeta: null,
        sentidoGlobal: 'fundado', globalDictado: true, razonGlobal: 'razón de la contraria', conceptosViolacion: 'pegados (prueba)' }));
    ok(!/disabled=""/.test(generar(h3)), 'C631: con los conceptos pegados, se puede generar');
    // la columna de la vía que revoca enlaza al cuadro
    const hc = pintar(React.createElement(PP, props(base())));
    ok(columna(hc, 'opuesta').includes('href="#conceptos-violacion"'), 'C631: el aviso de la columna lleva al cuadro');
}
{
    // LA DELIBERACIÓN EN CAMINO: se sigue preguntando con pausa larga y tope.
    const FALSO = path.join(TMP, 'falso');
    const rq = createRequire(path.join(FALSO, 'x.js'));
    const Rf = rq('./react_falso.js');
    const tdf = rq('./tarjetaDelPrincipal.js');
    const vaciar = async () => { for (let k = 0; k < 20; k++) await Promise.resolve(); };
    const relojes = [];
    const stReal = globalThis.setTimeout, ctReal = globalThis.clearTimeout;
    globalThis.setTimeout = (fn, ms) => { const id = relojes.length + 1; relojes.push({ id, fn, ms, vivo: true }); return id; };
    globalThis.clearTimeout = (id) => { const r = relojes.find((x) => x.id === id); if (r) r.vivo = false; };
    const correr = async () => { for (const r of relojes.filter((x) => x.vivo)) { r.vivo = false; r.fn(); } await vaciar(); };
    let res = null;
    const prop = { ...PROPUESTA };
    let n = 0;
    const cola = [api.tarjetaDe(base({ deliberacion_estado: 'en_curso' })),
                  api.tarjetaDe(base({ deliberacion_estado: 'en_curso' })),
                  api.tarjetaDe(base({ deliberacion_estado: 'listo', estado: 'reñido' }))];
    const leer = async () => { n += 1; return cola.length ? cola.shift() : api.tarjetaDe(base()); };
    Rf.__R.hooks = []; Rf.__R.efectos = [];
    Rf.__R.i = 0; tdf.useTarjetaDelPrincipal(prop, '631/2025', 'casa@iurexia.com', leer);
    Rf.__R.efectos.splice(0).forEach((f) => f()); await vaciar();
    Rf.__R.i = 0; res = tdf.useTarjetaDelPrincipal(prop, '631/2025', 'casa@iurexia.com', leer);
    ok(res && res.estado === 'claro' && res.deliberacion_estado === 'en_curso', 'hook: con el juez en curso, se pinta lo que hay');
    ok(relojes.some((r) => r.vivo && r.ms === tdf.PAUSA_DELIBERACION_MS), 'hook: y se vuelve a preguntar tras la pausa larga');
    await correr(); await correr();
    Rf.__R.i = 0; res = tdf.useTarjetaDelPrincipal(prop, '631/2025', 'casa@iurexia.com', leer);
    ok(n === 3 && res.estado === 'reñido' && !relojes.some((r) => r.vivo), 'hook: llega la deliberación y se deja de preguntar');
    // tope
    let m = 0;
    const siempre = async () => { m += 1; return api.tarjetaDe(base({ deliberacion_estado: 'en_curso' })); };
    const prop2 = { ...PROPUESTA };
    Rf.__R.i = 0; tdf.useTarjetaDelPrincipal(prop2, '631/2025', 'casa@iurexia.com', siempre);
    Rf.__R.efectos.splice(0).forEach((f) => f()); await vaciar();
    for (let k = 0; k < tdf.REINTENTOS_DELIBERACION + 5; k++) await correr();
    ok(m === tdf.REINTENTOS_DELIBERACION + 1 && !relojes.some((r) => r.vivo), 'hook: con tope, no pregunta para siempre');
    globalThis.setTimeout = stReal; globalThis.clearTimeout = ctReal;
}

/* ═══ 6 · LA PREGUNTA DECISIVA Y LA FICHA PROCESAL (SPEC E4, AR 631/2025) ═══
   El 631 sintético: recurre la tercera interesada contra una concesión; el
   sobreseimiento de otro acto quedó firme. Datos esquemáticos de prueba. */
const FICHA_631 = {
    tipo: 'amparo_revision', quejosa: 'Quejosa de prueba',
    responsables: [{ autoridad: 'Juez responsable de prueba', acto: 'acto 1 de prueba' },
                   { autoridad: 'Actuario de prueba', acto: 'acto 2 de prueba' }],
    terceros: ['Tercera interesada de prueba'],
    recurrida: { organo: 'Juzgado de Distrito de prueba',
                 resolvio: [{ acto: 'acto 2 de prueba', sentido: 'sobresee' }, { acto: 'acto 1 de prueba', sentido: 'concede' }] },
    recurrente: { quien: 'Tercera interesada de prueba', caracter: 'tercera interesada' },
    materia: 'la concesión respecto del acto 1 (prueba)', avisos: ['aviso de ficha de prueba'],
};
{
    // lectura tolerante
    const sin = api.tarjetaDe(base());
    ok(sin.ficha === null && sin.principal.pregunta_recurrida === '', 'E4: sin ficha ni pregunta_recurrida → null y vacío');
    ok(api.tarjetaDe(base({ ficha: {} })).ficha === null && api.tarjetaDe(base({ ficha: 'x' })).ficha === null
       && api.tarjetaDe(base({ ficha: [] })).ficha === null, 'E4: una ficha vacía o rara no se inventa');
    const f = api.tarjetaDe(base({ ficha: FICHA_631 })).ficha;
    ok(f && f.responsables.length === 2 && f.recurrida.resolvio.length === 2 && f.recurrente.caracter === 'tercera interesada'
       && f.avisos.length === 1, 'E4: la ficha del contrato se lee entera');
    const v = api.fichaDe({ quejoso: { nombre: 'Q' }, responsable: 'Sala de prueba', tercero: 'T',
                            organo_recurrida: 'Juzgado X', resolvio: 'concede', recurrente: 'Autoridad Y',
                            caracter_recurrente: 'autoridad responsable', materia_revision: 'M', tipo_asunto: 'Amparo_Revision' });
    ok(v && v.quejosa === 'Q' && v.responsables[0].autoridad === 'Sala de prueba' && v.terceros[0] === 'T'
       && v.recurrida.organo === 'Juzgado X' && v.recurrida.resolvio[0].sentido === 'concede'
       && v.recurrente.quien === 'Autoridad Y' && v.recurrente.caracter === 'autoridad responsable'
       && v.materia === 'M' && v.tipo === 'amparo_revision', 'E4: variantes (suelto, texto, alias) se leen');
    // la línea
    const l = td.lineaDeLaFicha(f);
    ok(l.map((x) => x.rotulo).join('|') === 'Quejosa|Responsables|Tercero|Recurrida|Recurre|Materia de la revisión',
       'E4: la línea en el orden de lectura del asunto');
    ok(l[3].texto === 'Juzgado de Distrito de prueba: sobresee (acto 2 de prueba); concede (acto 1 de prueba)',
       'E4: la recurrida con lo que resolvió por acto');
    ok(l[4].texto === 'Tercera interesada de prueba, tercera interesada', 'E4: quién recurre y su carácter');
    ok(td.lineaDeLaFicha(null).length === 0, 'E4: sin ficha, sin línea');
    const ad = td.lineaDeLaFicha(api.fichaDe({ tipo: 'amparo_directo', quejosa: 'Q', responsables: [{ autoridad: 'Sala', acto: 'sentencia' }], materia: 'civil' }));
    ok(ad.map((x) => x.rotulo).join('|') === 'Quejosa|Responsable|Materia' && ad[1].texto === 'Sala (sentencia)',
       'E4: amparo directo sin recurrida ni «de la revisión»');
    // la pregunta recurrida aparte
    const P = (pregunta, pregunta_recurrida) => ({ pregunta, pregunta_recurrida });
    ok(td.preguntaRecurridaAparte(P('¿Puede el adquirente sustituirse?', '¿Alteró la cosa juzgada?')) === '¿Alteró la cosa juzgada?',
       'E4: la recurrida distinta se enseña');
    ok(td.preguntaRecurridaAparte(P('¿Alteró la cosa juzgada?', 'Alteró la cosa  juzgada')) === '',
       'E4: igual a la decisiva (salvo signos) no se repite');
    ok(td.preguntaRecurridaAparte(null) === '' && td.preguntaRecurridaAparte(P('x', '')) === '', 'E4: tolera que falte');
    ok(td.decisivaYaEsElPrincipal(P('¿Puede el adquirente sustituirse?'), 'puede el adquirente sustituirse')
       && !td.decisivaYaEsElPrincipal(P('¿Otra?'), '¿Puede?') && !td.decisivaYaEsElPrincipal(P('x'), ''),
       'E4: «Lo que decide» sólo sobra si ya es el encabezado');
    // el HTML
    const t = base({ ficha: FICHA_631,
        principal: { ...base().principal, pregunta: '¿Pregunta decisiva de prueba?', pregunta_recurrida: '¿Pregunta del a quo de prueba?' },
        deliberacion: { origen: 'deliberacion', pregunta_decisiva: '¿Pregunta decisiva de prueba?', figura: 'Figura de prueba',
                        proposicion_toral: null } });
    const h = muestra('E4 · decisiva, recurrida y ficha', pintar(React.createElement(PP, props(t))));
    const iH2 = h.indexOf('¿Pregunta decisiva de prueba?'), iRec = h.indexOf('Así lo planteó la recurrida');
    ok(iH2 > 0 && iRec > iH2 && h.includes('¿Pregunta del a quo de prueba?'), 'E4: la decisiva arriba y la de la recurrida debajo');
    ok(h.split('¿Pregunta decisiva de prueba?').length === 2 && h.includes('Figura de prueba'),
       'E4: «Lo que decide» no repite el encabezado; la figura sí se enseña');
    ok(h.includes('data-ficha') && h.includes('Recurre: </span>Tercera interesada de prueba, tercera interesada')
       && h.includes('Materia de la revisión: </span>') && h.includes('1 aviso') && h.includes('title="aviso de ficha de prueba"'),
       'E4: la ficha en una línea con su aviso');
    ok(h.indexOf('data-ficha') < iH2, 'E4: la ficha va antes de la pregunta, como contexto');
    const h0 = pintar(React.createElement(PP, props(base())));
    ok(!h0.includes('data-ficha') && !h0.includes('Así lo planteó la recurrida'), 'E4: sin los campos, la tarjeta de siempre');
    const igual = pintar(React.createElement(PP, props(base({ principal: { ...base().principal, pregunta_recurrida: '¿Pregunta principal de prueba?' } }))));
    ok(!igual.includes('Así lo planteó la recurrida'), 'E4: la recurrida igual a la decisiva no se pinta');
}
/* ═══ 7 · REVISIÓN ADVERSARIAL DE LA FASE E ═══
   Lo firme salía bajo «Materia de la revisión»; ni la fracción del art. 93 ni
   la figura llegaban a la pantalla. */
{
    const F2 = { ...FICHA_631, materia: 'concesión (prueba)', firme: 'sobreseimiento (prueba)',
                 art_93: { fraccion: 'VI', previo: 'II y III (prueba)', si_prospera: 'revoca (prueba); reasume (prueba); resto (prueba)',
                           si_no_prospera: 'confirma (prueba)' } };
    const f2 = api.fichaDe(F2);
    ok(f2.firme === 'sobreseimiento (prueba)' && f2.materia === 'concesión (prueba)' && f2.art_93.fraccion === 'VI',
       'E-rev: `firme` y `art_93` se leen aparte de `materia`');
    const vieja = api.fichaDe({ ...FICHA_631, materia: 'concesión (prueba) · firme: sobreseimiento (prueba)' });
    ok(vieja.materia === 'concesión (prueba)' && vieja.firme === 'sobreseimiento (prueba)',
       'E-rev: un servidor anterior («… · firme: …» en materia) se parte');
    const l2 = td.lineaDeLaFicha(f2);
    ok(l2.map((x) => x.rotulo).join('|') === 'Quejosa|Responsables|Tercero|Recurrida|Recurre|Materia de la revisión|Firme|Art. 93',
       'E-rev: «Firme» y «Art. 93» con su propio rótulo');
    ok(l2[5].texto === 'concesión (prueba)' && l2[6].texto === 'sobreseimiento (prueba)'
       && l2[7].texto === 'fr. VI · si prospera: revoca (prueba); reasume (prueba)',
       'E-rev: lo firme no va bajo «Materia de la revisión»; la fracción y qué pasa si prospera');
    const t2 = base({ ficha: F2, principal: { ...base().principal, pregunta: '¿Decisiva (prueba)?',
                                              pregunta_recurrida: '¿Del a quo (prueba)?', figura: 'Figura sola (prueba)' } });
    const tt = api.tarjetaDe(t2);
    ok(tt.principal.figura === 'Figura sola (prueba)', 'E-rev: `principal.figura` se lee');
    const h2 = pintar(React.createElement(PP, props(t2)));
    ok(h2.includes('data-figura') && h2.includes('Figura sola (prueba)') && h2.includes('Firme: </span>sobreseimiento (prueba)')
       && h2.includes('Art. 93: </span>fr. VI'), 'E-rev: la figura bajo la decisiva, lo firme aparte y la fracción en la línea');
    const h3 = pintar(React.createElement(PP, props(base({ principal: { ...base().principal, figura: 'Figura (prueba)' },
        deliberacion: { origen: 'deliberacion', pregunta_decisiva: '¿X?', figura: 'Figura (prueba)', proposicion_toral: null } }))));
    ok(h3.split('Figura (prueba)').length === 2, 'E-rev: si la deliberación ya enseña la figura, no se repite');
}

/* ═══ 8 · LAS SOLUCIONES QUE CABEN (rediseño, etapa 3) ═══
   Sólo si el servidor manda la lista; cada una con su efecto, su papel, la
   revisión por código y la falla que vio el juez. */
{
    const SOLS = [
        { id: 'S1', prospera: false, sentido: 'infundado', tipo_efecto: 'niega', rama: 'niega', desenlace: ['No ampara (prueba).'],
          resumen: 'Resumen de la que niega (prueba).', revision: { estado: 'completa', avisos: [] },
          falla: { que: 'punto débil de prueba', fatal: false }, sostenible: true, papel: 'contraria' },
        { id: 'S2', prospera: true, sentido: 'fundado', tipo_efecto: 'reposicion', rama: 'concede', desenlace: [],
          resumen: 'Resumen de la reposición (prueba).', revision: { estado: 'con_pendientes', avisos: ['Hecho sin verificar: «x».'] },
          falla: { que: 'no vence la razón autónoma R1 (prueba)', fatal: true }, sostenible: true, papel: 'propuesta' },
        { id: 'S3', prospera: true, sentido: 'fundado', tipo_efecto: 'para_efectos', rama: 'concede', desenlace: [],
          resumen: '', revision: { estado: 'incompleta', avisos: [] }, falla: null, sostenible: false, papel: null,
          razon: 'Razón de la S3 (prueba).' },
        { prospera: true, tipo_efecto: 'basura sin id' },
    ];
    const tt = api.tarjetaDe(base({ deliberacion: { origen: 'deliberacion', pregunta_decisiva: '¿X (prueba)?', figura: '',
                                                    proposicion_toral: null, soluciones: SOLS } }));
    ok(tt.deliberacion.soluciones.length === 3 && tt.deliberacion.soluciones[1].falla.fatal === true
       && tt.deliberacion.soluciones[0].papel === 'contraria', 'E3: la lista se lee tolerante (lo que no tiene id no pasa)');
    const h = muestra('E3 · las soluciones que caben', pintar(React.createElement(PP, props(tt))));
    ok(h.includes('Las soluciones que caben (3)') && h.includes('concede para reponer el procedimiento')
       && h.includes('concede para efectos') && h.includes('la columna propuesta') && h.includes('la columna contraria'),
       'E3: las tres, con su efecto y cuál es cada columna');
    ok(h.includes('Falla fatal: ') && h.includes('no vence la razón autónoma R1 (prueba)') && h.includes('Su punto débil: ')
       && h.includes('con pendientes') && h.includes('Hecho sin verificar'), 'E3: la falla del juez y la revisión por código');
    ok(h.includes('Quien la argumentó dice que no se sostiene'), 'E3: la insostenible lo dice');
    ok(!h.includes('Resolver con esta solución'), 'E3: sin la acción, ningún botón');
    let elegida = null;
    const hB = pintar(React.createElement(PP, { ...props(tt), onResolverSolucion: (s, r) => { elegida = [s, r]; } }));
    ok(hB.split('Resolver con esta solución').length === 2 && hB.includes('data-resolver-solucion="S3"'),
       'E3: con la acción, el botón sólo en la solución que no es ninguna columna (la S3)');
    ok(tt.deliberacion.soluciones[2].razon === 'Razón de la S3 (prueba).' && tt.deliberacion.soluciones[0].razon === '',
       'E3: la razón que viaja se lee (vacía si no llegó)');
    const h0 = pintar(React.createElement(PP, props(api.tarjetaDe(base({ deliberacion: { origen: 'deliberacion',
        pregunta_decisiva: '¿X (prueba)?', figura: '', proposicion_toral: null } })))));
    ok(!h0.includes('Las soluciones que caben') && api.tarjetaDe(base()).deliberacion === null,
       'E3: sin la lista (servidor sin la bandera), la tarjeta de siempre');
}

const iHtml = process.argv.indexOf('--html');
if (iHtml > 0 && process.argv[iHtml + 1]) {
    const salida = path.resolve(process.argv[iHtml + 1]);
    const css = process.argv[iHtml + 2] ? fs.readFileSync(process.argv[iHtml + 2], 'utf8') : '';
    const cuerpo = MUESTRAS.map(([t, h]) => `<h1 style="font:600 12px system-ui;color:#c9a962;margin:32px 0 8px">${t}</h1>${h}`).join('\n');
    fs.writeFileSync(salida, `<!doctype html><html lang="es"><head><meta charset="utf-8">`
        + `<meta name="viewport" content="width=device-width, initial-scale=1"><title>Problema principal</title>`
        + `<style>${css}</style></head><body class="taller-negro" style="margin:0;padding:24px;color:#fff">`
        + `<main style="max-width:880px;margin:0 auto">${cuerpo}</main></body></html>`);
    console.log(`página: ${salida}`);
}

console.log(`\n${fallas ? 'FALLA' : 'OK'} · ${bien} comprobaciones bien, ${fallas} mal`);
process.exit(fallas ? 1 : 0);
