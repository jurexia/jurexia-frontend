// EL SELLO DE VIGENCIA EN LA LISTA DE FUENTES Y EN EL VISOR (26-sep-2026).
//
// Pide a /cita/{doc_id} de producción (sólo lectura) cuatro tesis reales y
// comprueba, con el código de la app, lo que verá el abogado:
//   2009817  P. X/2015 (10a.)      ABANDONADA por la P./J. 2/2022 (11a.)
//   2024159  P./J. 2/2022 (11a.)   vigente: la que la reemplaza
//   160584   P. LXVI/2011 (9a.)    superada EN LOS HECHOS (curaduría Iurexia)
//   164500   3a. (7a. Época)       INTERRUMPIDA EN PARTE, cadena de dos
// y además 2006225 y 183349 (las que reemplazan a las dos últimas) para el
// caso «la sustituta sí está entre las fuentes».
//
//   node --experimental-strip-types comprobaciones/visor_vigencia.mjs
//       → la lógica (`src/lib/vigencia.ts`, `fuenteDeCita`) y el HTML que
//         pintan la marca, el emblema, la franja y el panel entero
//         (`renderToStaticMarkup` de los mismos componentes).
//   … visor_vigencia.mjs --html <salida.html> [css]
//       → además, una página con esos HTML (y el CSS de `next build`, si se
//         pasa) para mirarla o capturarla en un navegador.
//
// API=<url> cambia el servidor (por omisión https://jurexia-api.onrender.com).
// DATOS=<carpeta> lee cita_<registro>.json de ahí en vez de pedirlos.
// ANTES=<commit> es la versión de los componentes SIN el sello (por omisión
// a08cc1b): con ella se comprueba que una tesis vigente pinta exactamente el
// mismo HTML que antes, byte por byte.
//
// Los .tsx se transpilan con el TypeScript del repositorio y el alias «@/»
// se resuelve a src/, con un cargador de módulos registrado aquí mismo: los
// componentes se prueban tal cual, sin copiarlos.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { register } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Los componentes de ANTES, sacados de git a una carpeta temporal con la misma
// forma que src/: sus «@/…» y sus «./…» se resuelven contra el src/ de hoy.
const ANTES = process.env.ANTES || 'a08cc1b';
const VIEJO = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vigencia-antes-')));
process.on('exit', () => fs.rmSync(VIEJO, { recursive: true, force: true }));
const viejos = {};
for (const rel of ['src/components/PdfViewerPanel.tsx', 'src/components/documento/FuentesPorInstitucion.tsx']) {
    const destino = path.join(VIEJO, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, execFileSync('git', ['-C', RAIZ, 'show', `${ANTES}:${rel}`]));
    viejos[rel] = destino;
}

// ── El cargador: «@/…» → src/…, extensiones implícitas y .ts/.tsx transpilados ──
const GANCHOS = `
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
let ts, SRC, VIEJO;
export async function initialize(d) { SRC = d.src; VIEJO = d.viejo; ts = (await import(d.ts)).default; }
const nuestro = (f) => f.startsWith(SRC) || f.startsWith(VIEJO);
const EXT = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function hallar(base) {
    for (const e of EXT) { const f = base + e; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
    return null;
}
export async function resolve(esp, ctx, next) {
    if (esp.startsWith('@/')) {
        const f = hallar(path.join(SRC, esp.slice(2)));
        if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
    }
    if ((esp.startsWith('./') || esp.startsWith('../')) && ctx.parentURL && ctx.parentURL.startsWith('file:')
        && nuestro(fileURLToPath(ctx.parentURL))) {
        let dir = path.dirname(fileURLToPath(ctx.parentURL));
        if (dir.startsWith(VIEJO)) dir = path.join(SRC, path.relative(path.join(VIEJO, 'src'), dir));
        const f = hallar(path.resolve(dir, esp));
        if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
    }
    // Los paquetes (react, lucide-react…) de un componente viejo, desde su sitio en src/.
    if (ctx.parentURL && ctx.parentURL.startsWith('file:') && fileURLToPath(ctx.parentURL).startsWith(VIEJO)) {
        const equiv = path.join(SRC, path.relative(path.join(VIEJO, 'src'), fileURLToPath(ctx.parentURL)));
        return next(esp, { ...ctx, parentURL: pathToFileURL(equiv).href });
    }
    return next(esp, ctx);
}
export async function load(url, ctx, next) {
    if (url.startsWith('file:') && /\\.tsx?$/.test(url) && nuestro(fileURLToPath(url))) {
        const fuente = fs.readFileSync(fileURLToPath(url), 'utf8');
        const out = ts.transpileModule(fuente, { fileName: fileURLToPath(url), compilerOptions: {
            module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, verbatimModuleSyntax: false,
        } });
        return { format: 'module', source: out.outputText, shortCircuit: true };
    }
    return next(url, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(GANCHOS), {
    data: {
        src: path.join(RAIZ, 'src'),
        viejo: VIEJO,
        ts: pathToFileURL(path.join(RAIZ, 'node_modules/typescript/lib/typescript.js')).href,
    },
});

// `<style jsx>` del panel es de styled-jsx, que aquí no está: React avisa por
// el atributo y el aviso no dice nada de lo que se comprueba.
const errorOriginal = console.error;
console.error = (...a) => {
    const t = a.map(String).join(' ');
    if (!(/non-boolean attribute/.test(t) && /\bjsx\b/.test(t))) errorOriginal(...a);
};
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const vig = await import(path.join(RAIZ, 'src/lib/vigencia.ts'));
const { fuenteDeCita } = await import(path.join(RAIZ, 'src/lib/documento/citas.ts'));
const { MarcaVigencia, FranjaVigencia } = await import(path.join(RAIZ, 'src/components/VigenciaTesis.tsx'));
const { FuentesPorInstitucion } = await import(path.join(RAIZ, 'src/components/documento/FuentesPorInstitucion.tsx'));
const PdfViewerPanel = (await import(path.join(RAIZ, 'src/components/PdfViewerPanel.tsx'))).default;
const PdfViewerPanelAntes = (await import(viejos['src/components/PdfViewerPanel.tsx'])).default;
const { FuentesPorInstitucion: FuentesAntes } = await import(viejos['src/components/documento/FuentesPorInstitucion.tsx']);

let fallos = 0;
const ver = (bien, rotulo, detalle = '') => {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', rotulo, detalle ? `— ${detalle}` : '');
};
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));

// ── Los datos reales ────────────────────────────────────────────────────────
const IDS = {
    2009817: '26719185-5b10-5321-a093-ffbf855a3ae3',
    2024159: '73493e98-9da8-5bce-b9e2-e1bfb774c22a',
    160584: 'd71b18a4-26c5-5e0f-8702-00ee6fff6ede',
    164500: '5f03aea1-5097-5356-86ad-fd392c11c953',
    2006225: '44004c61-9f0b-5001-8a0b-0256db33697d',
    183349: 'e3b6ea29-c39f-567e-95eb-bd7da78141ba',
};
const API = (process.env.API || 'https://jurexia-api.onrender.com').replace(/\/$/, '');
const cita = {};
for (const [reg, id] of Object.entries(IDS)) {
    if (process.env.DATOS) {
        cita[reg] = JSON.parse(fs.readFileSync(path.join(process.env.DATOS, `cita_${reg}.json`), 'utf8'));
        continue;
    }
    const r = await fetch(`${API}/cita/${id}`, { signal: AbortSignal.timeout(90_000) });
    if (!r.ok) { console.error(`/cita/${id} (${reg}) respondió ${r.status}`); process.exit(2); }
    cita[reg] = await r.json();
}
console.log(`/cita: ${Object.keys(cita).length} tesis de ${process.env.DATOS || API}\n`);

// ── 1. El contrato tal como llega ───────────────────────────────────────────
const v = (reg) => vig.vigenciaDe(cita[reg]);
ver(v(2009817)?.estado === 'abandonada' && !v(2009817).parcial && String(v(2009817).por_registro) === '2024159',
    '2009817 llega abandonada, por la 2024159', JSON.stringify(cita[2009817].vigencia));
ver(!('vigencia' in cita[2024159]) && v(2024159) === null, '2024159 (vigente) no trae la clave «vigencia»');
ver(v(160584)?.fuente === 'curaduria', '160584 llega curada', JSON.stringify(cita[160584].vigencia));
ver(v(164500)?.parcial === true && v(164500)?.estado === 'interrumpida', '164500 llega interrumpida en parte', JSON.stringify(cita[164500].vigencia));
ver(!('vigencia' in cita[2006225]) && !('vigencia' in cita[183349]), 'sus sustitutas (2006225, 183349) llegan vigentes');

// ── 2. Lo que dicen la marca y la franja ────────────────────────────────────
const aviso = (reg) => vig.avisoVigencia(v(reg));
ver(vig.marcaVigencia(v(2009817)) === 'Abandonada', 'marca 2009817', vig.marcaVigencia(v(2009817)));
ver(vig.marcaVigencia(v(160584)) === 'Superada en los hechos', 'marca 160584', vig.marcaVigencia(v(160584)));
ver(vig.marcaVigencia(v(164500)) === 'Interrumpida en parte', 'marca 164500', vig.marcaVigencia(v(164500)));
ver(aviso(2009817).frase === 'Esta tesis perdió vigencia: ABANDONADA por la P./J. 2/2022 (11a.), registro 2024159, desde el 11 de febrero de 2022',
    'franja 2009817, palabra por palabra', aviso(2009817).frase);
ver(aviso(160584).titulo === 'Superada en los hechos (curaduría Iurexia; el Semanario no lo anota)'
    && !/no lo anota\)$/.test(aviso(160584).detalle),
    'franja 160584: curaduría dicha una vez', aviso(160584).frase);
ver(aviso(164500).titulo === 'Esta tesis perdió vigencia en parte' && aviso(164500).detalle.startsWith('INTERRUMPIDA EN PARTE'),
    'franja 164500: «en parte»', aviso(164500).frase);
ver(vig.enlaceReemplazo(v(160584)) === 'https://sjf2.scjn.gob.mx/detalle/tesis/2006225', 'enlace al Semanario de la sustituta de 160584');
// Las correcciones no «pierden vigencia» (8 de las 558 del índice).
const corregida = { estado: 'texto_sustituido', etiqueta: 'TEXTO SUSTITUIDO por la II.T.296 L, registro 169440', parcial: false, por_registro: '169440', por_clave: 'II.T.296 L', fuente: 'tesis_nueva' };
ver(vig.avisoVigencia(corregida).titulo === 'Se corrigió el texto de esta tesis' && vig.avisoVigencia(corregida).boton === 'Abrir la versión corregida'
    && !vig.perdioVigencia(corregida), 'texto sustituido: corrección, no pérdida de vigencia');
ver(vig.vigenciaDe({ vigencia: { etiqueta: 'x' } }) === null && vig.vigenciaDe({ vigencia: null }) === null, 'un marcador sin estado no pinta nada');

// ── 3. Las fuentes del mensaje: FUENTES_PREVIAS recortado a 350, como en el chat ──
const previa = (reg) => ({ ...cita[reg], texto: Array.from(cita[reg].texto || '').slice(0, 350).join('') });
const meta = (regs) => ({ valid: regs.length, invalid: 0, total: regs.length, invalid_ids: [],
    sources: Object.fromEntries(regs.map((r) => [IDS[r], previa(r)])) });
const m4 = meta([2009817, 2024159, 160584, 164500]);
const f17 = fuenteDeCita(m4, IDS[2009817]);
ver(f17.reemplazo?.docId === IDS[2024159] && f17.reemplazo?.registro === '2024159',
    '2009817: la 2024159 está entre las fuentes y viaja como reemplazo');
ver(fuenteDeCita(m4, IDS[160584]).reemplazo === undefined && fuenteDeCita(m4, IDS[164500]).reemplazo === undefined,
    '160584 y 164500: sus sustitutas no están → sin reemplazo (enlace al Semanario)');
const m6 = meta([2009817, 2024159, 160584, 164500, 2006225, 183349]);
ver(fuenteDeCita(m6, IDS[160584]).reemplazo?.registro === '2006225' && fuenteDeCita(m6, IDS[164500]).reemplazo?.registro === '183349',
    'con 2006225 y 183349 entre las fuentes, las encuentra por registro');
const f59 = fuenteDeCita(m4, IDS[2024159]);
ver(!('vigencia' in f59) && !('reemplazo' in f59), 'la vigente sale de fuenteDeCita sin ninguna clave nueva', Object.keys(f59).join(','));
ver(fuenteDeCita(m4, IDS[2009817].toUpperCase()).vigencia?.estado === 'abandonada', 'la búsqueda no distingue mayúsculas');
// Una cadena circular (A → B → A) no se recorre para siempre.
const ciclo = { valid: 2, invalid: 0, total: 2, invalid_ids: [], sources: {
    a: { origen: '1111111_A', registro: '1111111', vigencia: { estado: 'superada', etiqueta: 'SUPERADA', por_registro: '2222222' } },
    b: { origen: '2222222_B', registro: '2222222', vigencia: { estado: 'superada', etiqueta: 'SUPERADA', por_registro: '1111111' } },
} };
const fa = fuenteDeCita(ciclo, 'a');
ver(fa.reemplazo?.docId === 'b' && fa.reemplazo?.reemplazo === undefined, 'cadena circular: se corta sin volver a la ya vista');

// ── 4. El HTML de las piezas ────────────────────────────────────────────────
const marca17 = h(MarcaVigencia, { vigencia: v(2009817) });
ver(marca17.includes('>Abandonada<') && marca17.includes(`title="${aviso(2009817).frase}"`) && marca17.includes('sr-only'),
    'marca: texto corto, frase entera en title y para lector de pantalla');
const franja17 = h(FranjaVigencia, { vigencia: v(2009817), onAbrirReemplazo: () => {} });
ver(/<button[^>]*>Abrir la que la reemplaza/.test(franja17) && franja17.includes('role="note"') && !franja17.includes('<a '),
    'franja 2009817 con la sustituta entre las fuentes: botón que la abre ahí mismo');
const franja60 = h(FranjaVigencia, { vigencia: v(160584) });
ver(franja60.includes('href="https://sjf2.scjn.gob.mx/detalle/tesis/2006225"') && franja60.includes('target="_blank"')
    && franja60.includes('curaduría Iurexia; el Semanario no lo anota'),
    'franja 160584 sin la sustituta: enlace al Semanario, en otra pestaña');
const sinReemplazo = h(FranjaVigencia, { vigencia: { estado: 'sin_efectos', etiqueta: 'SIN EFECTOS al resolverse la contradicción de tesis 5/2020', fuente: 'nota_propia' } });
ver(!sinReemplazo.includes('<button') && !sinReemplazo.includes('<a '), 'sin registro de reemplazo: sólo la franja');

// El emblema plegado dice cuántas perdieron vigencia; sin ellas, lo de antes.
const docIdMap = new Map([[IDS[2009817], 1], [IDS[2024159], 2], [IDS[164500], 3]]);
const emblema = h(FuentesPorInstitucion, { meta: m4, docIdMap });
ver(emblema.includes('2 perdieron vigencia'), 'emblema de la Suprema Corte: «2 perdieron vigencia»');
const soloVigente = { meta: m4, docIdMap: new Map([[IDS[2024159], 1]]) };
const emblemaVigente = h(FuentesPorInstitucion, soloVigente);
ver(!/vigencia/i.test(emblemaVigente) && emblemaVigente === h(FuentesAntes, soloVigente),
    `emblema sólo con la vigente: el mismo HTML que en ${ANTES}`);

// El panel entero: la abandonada lleva la franja arriba; la vigente, nada.
const panel = (f) => h(PdfViewerPanel, { isOpen: true, onClose: () => {}, source: f });
const panel17 = panel(f17);
const iFranja = panel17.indexOf('role="note"');
const iFicha = panel17.indexOf('TESIS AISLADA');
ver(iFranja > 0 && iFicha > iFranja && /<button[^>]*>Abrir la que la reemplaza/.test(panel17),
    'visor 2009817: franja antes de la ficha, con el botón');
const panel59 = panel(f59);
ver(!panel59.includes('role="note"') && !/perdió vigencia|Volver a/.test(panel59), 'visor 2024159 (vigente): sin franja ni «Volver»');
// La vigente, como la armaba antes el clic en la cita (sin fuenteDeCita).
const { vigencia: _v, reemplazo: _r, ...comoAntes } = f59;
const panelAntes = renderToStaticMarkup(React.createElement(PdfViewerPanelAntes, { isOpen: true, onClose: () => {}, source: comoAntes }));
ver(panel59 === panelAntes, `visor 2024159 (vigente): el mismo HTML que en ${ANTES}`, `${panel59.length} = ${panelAntes.length} caracteres`);
// Y la abandonada, si el backend dejara de mandar la clave, volvería a ser la de antes.
const { vigencia: _v2, reemplazo: _r2, ...abandonadaSinClave } = f17;
ver(panel(abandonadaSinClave) === renderToStaticMarkup(React.createElement(PdfViewerPanelAntes, { isOpen: true, onClose: () => {}, source: abandonadaSinClave })),
    'visor 2009817 sin la clave «vigencia»: idéntico al de antes');

// ── La página para mirarla ──────────────────────────────────────────────────
const iHtml = process.argv.indexOf('--html');
if (iHtml > 0) {
    const salida = process.argv[iHtml + 1];
    const css = process.argv[iHtml + 2] ? fs.readFileSync(process.argv[iHtml + 2], 'utf8') : '';
    const lista = (regs) => regs.map((r) => {
        const f = fuenteDeCita(m4, IDS[r]);
        const mv = vig.vigenciaDe(f);
        return `<li><div class="flex w-full items-start gap-2.5 px-3 py-2 text-left"><span class="mt-[1px] inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-charcoal-900 text-[10px] font-bold text-white">${docIdMap.get(IDS[r]) ?? '·'}</span><span class="min-w-0 flex-1 text-[11.5px] leading-snug text-charcoal-700"><span class="font-medium text-charcoal-900">${f.origen}</span>${mv ? h(MarcaVigencia, { vigencia: mv, className: 'ml-1.5' }) : ''}<span class="text-charcoal-500"> — ${f.ref}</span></span></div></li>`;
    }).join('');
    const tarjeta = (titulo, cuerpo) => `<section style="margin:0 0 28px"><h2 style="font:600 12px Arial;letter-spacing:.08em;text-transform:uppercase;color:#8b7355;margin:0 0 8px">${titulo}</h2>${cuerpo}</section>`;
    const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Sello de vigencia</title><style>${css}</style>
<style>body{background:#f5f4f0;margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif} .col{max-width:576px;margin:0 auto} .panel{background:#fdfbf7;border:1px solid #e8e6e0;border-radius:12px;overflow:hidden}</style></head>
<body><div class="col">
${tarjeta('Lista de fuentes · emblema plegado', emblema)}
${tarjeta('Lista de fuentes · desplegada', `<ul class="divide-y divide-cream-200 overflow-hidden rounded-lg border border-cream-300 bg-white">${lista([2009817, 2024159, 164500, 160584])}</ul>`)}
${tarjeta('Visor · 2009817 abandonada (la sustituta está entre las fuentes)', `<div class="panel"><div class="px-5 py-5">${franja17}</div></div>`)}
${tarjeta('Visor · 160584 curada (sustituta fuera: enlace al Semanario)', `<div class="panel"><div class="px-5 py-5">${franja60}</div></div>`)}
${tarjeta('Visor · 164500 interrumpida en parte', `<div class="panel"><div class="px-5 py-5">${h(FranjaVigencia, { vigencia: v(164500) })}</div></div>`)}
</div></body></html>`;
    fs.writeFileSync(salida, pagina);
    console.log(`\npágina: ${salida}`);
}

console.log(fallos ? `\n${fallos} FALLAS` : '\ntodo en orden');
process.exit(fallos ? 1 : 0);
