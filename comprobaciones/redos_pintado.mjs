// EL PINTADO DE LA RESPUESTA, EN TIEMPO LINEAL (26-sep-2026).
//
// Un verificador de ReDoS encontró expresiones super-lineales que ya estaban
// en el camino del chat antes de las citas agrupadas:
//
//   1. `@/lib/citas`: el registro digital —«Registro» y 4.000 espacios, 10 s;
//      cúbico— corría en CADA pintado del mensaje, sin memoria, y dentro de
//      ventanas de 800 caracteres por cada tesis citada;
//   2. `procesarRespuesta` (antes el useMemo de ChatMessage): los `\n*<!--…-->`
//      volvían a recorrer una racha de saltos desde cada salto, con cada trozo
//      del stream;
//   3. `formatMarkdown`: el enlace `\[([^\]\n]+)\]\(` desde cada «[» sin cierre,
//      la fuente «> *Fuente:*» con blancos a mitad del renglón, `>\s*\n\s*<`;
//   4. `limpiarParaExportar` (copiar / descargar): `\[[^\]]*,\s*(uuid)` desde
//      cada «[»;
//   5. `@/lib/documento/marcado`, con cada trozo en el constructor: los rubros
//      de estrategia, `(^|\n)\s*❌`, el aviso de truncada y `textoDeHtml`.
//
// Y un organigrama en ciclo recursaba hasta reventar la pila.
//
// Esto comprueba dos cosas:
//
// TIEMPO LINEAL. Con semilla fija, cadenas de 20k y de 100k caracteres de un
// alfabeto hecho con los literales de TODAS esas expresiones —marcadores,
// corchetes, «Registro», «> Fuente:», «](http://», «❌», rubros, blancos de
// toda clase…—, otra familia con los marcadores HTML y las cargas conocidas de
// los verificadores. Cada función pública de `@/lib/respuestaDelChat`,
// `@/lib/citas` y `@/lib/documento/marcado` —una nueva entra sola; si pide más
// de un argumento, necesita aquí su adaptador— y los tres recorridos enteros
// (la burbuja, el sello y la vista previa del constructor): < 60 ms con 20k,
// < 300 ms con 100k (mejor de 2) y con 100k no más de 8× lo de 20k.
//
// LA MISMA SALIDA. Lo de antes se saca del commit de referencia (el que sólo
// movió el código de ChatMessage a `@/lib/respuestaDelChat`, 620e191, por
// omisión) con `git archive` y se compara salida por salida: sobre respuestas
// normales escritas aquí —cada marcador, cita, tabla, organigrama, tarjeta,
// demanda con estrategia, aviso de error y de truncada—, sobre cada prefijo
// de ellas (lo que se ve mientras llega el stream), sobre miles de cadenas
// cortas del alfabeto (donde lo viejo aún tarda poco) y, si se pasa, sobre
// una conversación real.
//
//   node --experimental-strip-types comprobaciones/redos_pintado.mjs [conversacion.json] [--referencia=<commit>]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(os.tmpdir(), 'redos_equivalencia'), { recursive: true });
const REFERENCIAS = fs.realpathSync(path.join(os.tmpdir(), 'redos_equivalencia'));

// «@/…» → src/…, y los imports sin extensión de los .ts, como los resuelve Next.
// Lo que se importa desde una copia de referencia resuelve «@/…» dentro de
// esa copia, y los paquetes (react) desde el node_modules de aquí.
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
const REFERENCIAS = ${JSON.stringify(pathToFileURL(REFERENCIAS + '/').href)};
export async function resolve(spec, ctx, next) {
    const padre = ctx.parentURL || '';
    const copia = padre.startsWith(REFERENCIAS) ? REFERENCIAS + padre.slice(REFERENCIAS.length).split('/')[0] + '/' : null;
    if (spec.startsWith('@/')) spec = (copia || RAIZ) + 'src/' + spec.slice(2);
    else if (copia && !/^(\\.|\\/|file:|node:|data:)/.test(spec)) ctx = { ...ctx, parentURL: RAIZ + 'package.json' };
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

// `textoDeHtml` recorre un árbol del DOM: basta un nodo raíz con un nodo de
// texto dentro, que es donde está su expresión (el texto suelto).
globalThis.HTMLElement ??= class HTMLElement {};
const arbolDeTexto = (s) => ({ childNodes: [{ nodeType: 3, textContent: s }] });

const cargar = async (raiz) => ({
    R: await import(path.join(raiz, 'src/lib/respuestaDelChat.ts')),
    C: await import(path.join(raiz, 'src/lib/citas.ts')),
    M: await import(path.join(raiz, 'src/lib/documento/marcado.ts')),
    V: await import(path.join(raiz, 'src/lib/documento/revelado.ts')),
});
const nuevo = await cargar(RAIZ);

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith('--'));

let fallas = 0;
const ok = (cond, texto, detalle = '') => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}${detalle ? ` — ${detalle}` : ''}`);
    if (!cond) fallas++;
};

const A = 'da1de55e-52d9-de76-8001-92f4bd4c0424';
const B = '2b2dc535-0f3c-4c1e-9d7e-5a1b2c3d4e5f';

/** Todo lo que la pantalla y el constructor hacen con un texto, por función. */
const recorridos = (x) => {
    const docIdMap = new Map([[A, 1], [B, 2]]);
    return {
        'burbuja del chat (procesar → recortar → formatMarkdown)': (t) => {
            const r = x.R.procesarRespuesta(t);
            return [x.R.formatMarkdown(r.processedContent), x.R.formatMarkdown(x.V.recortarABloque(r.processedContent)), x.R.formatMarkdown(r.thinkingContent)];
        },
        'sello (registros, rubros, sin registro)': (t) => {
            const p = x.R.procesarRespuesta(t).processedContent;
            return [x.C.registrosDeLaRespuesta(p), x.C.rubrosPorRegistro(p), x.C.citasSinRegistro(p)];
        },
        'vista previa del constructor': (t) => {
            const r = x.M.analizarRespuesta(t);
            const tarjetas = x.M.separarTarjetas(r.texto);
            const partes = x.M.separarEstrategia(tarjetas.sin);
            return [r, tarjetas, partes, x.M.markdownAHtml(partes.escrito)];
        },
        'mensaje del usuario': (t) => x.R.limpiarMarcadoresInternos(x.R.filterDocumentContent(t)),
        _docIdMap: docIdMap,
    };
};

/** Cada función pública, con su adaptador si pide más de un argumento. */
function funciones(x) {
    const rec = recorridos(x);
    const ADAPTADORES = {
        'respuestaDelChat.limpiarParaExportar': (t) => x.R.limpiarParaExportar(t, rec._docIdMap),
        'citas.rubroCorresponde': (t) => x.C.rubroCorresponde(t, t.slice(0, 400)),
        'marcado.textoDeHtml': (t) => x.M.textoDeHtml(arbolDeTexto(t)),
    };
    const lista = [];
    const sinAdaptador = [];
    for (const [modulo, M] of [['respuestaDelChat', x.R], ['citas', x.C], ['marcado', x.M]]) {
        for (const [nombre, f] of Object.entries(M)) {
            if (typeof f !== 'function') continue;
            const clave = `${modulo}.${nombre}`;
            if (ADAPTADORES[clave]) lista.push([clave, ADAPTADORES[clave]]);
            else if (f.length > 1) sinAdaptador.push(clave);
            else lista.push([clave, f]);
        }
    }
    lista.push(['revelado.recortarABloque', (t) => x.V.recortarABloque(t)]);
    for (const [nombre, f] of Object.entries(rec)) if (!nombre.startsWith('_')) lista.push([nombre, f]);
    return { lista, sinAdaptador };
}

// ═══ EL ALFABETO ═══════════════════════════════════════════════════════════
/** mulberry32: el mismo azar en cada corrida. */
const azar = (semilla) => {
    let a = semilla >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
const BLANCOS = [' ', ' ', '\t', '\n', '\n', '\r', '\r\n', '　', ' ', ' '];
const SIGNOS = ['[', ']', '(', ')', '{', '}', '*', '_', '`', '-', ';', ',', '.', ':', '<', '>', '/', '!', '"', "'", '|', '#', '=', '&', '$1',
    'x', 'a', 'A', 'É', 'I', 'V', 'J', '0', '1', '7', 'f'];
const LITERALES = [
    // citas
    'Registro', 'registro', 'Registro digital: ', ' digital', 'núm.', 'número', 'P./J. ', '1a./J. 82/2014', 'I.1o.C.', 'I.3o.C.493 C', 'J/', '/2014', '123456', '2021472',
    'AAAAAAAAAAAAAAAAAAAAAAA', 'DERECHO DE PETICIÓN. ',
    // formato
    '> ', '> *Fuente:', '> Fuente:', 'Fuente:', '#', '##', '## ', '### ', '#### ', '## ⚖️ Análisis Legal', '---', '***', '___', '═════', '─────',
    '- ', '* ', '• ', '1. ', '2) ', '**', '__', '](', '](http://', '](https://x.mx/', 'http://', '[1]', '```',
    '| a | b |', '|---|', '│', '┌──┐', ':::orgchart', ':::processflow', ':::', ' -> ', 'titulo:',
    'RESPUESTA DIRECTA', 'MARCO CONSTITUCIONAL Y ', '### CONCLUSIÓN', 'Fuentes citadas',
    // citas por identificador
    '[Doc ID: ', '[Doc IDs: ', '(Doc ID: ', 'Doc ID:', 'Doc ', A, B, A.slice(0, 20), '⟦1⟧', '⟦', '⟧', '[, ', '[-985d-5043-8e4e-b43aaee99c66]',
    // constructor
    'ESTRATEGIA PROCESAL', 'ESTRATEGIA DEL AMPARO', 'EVALUACIÓN DE VIABILIDAD', 'PROTESTO LO NECESARIO', 'PUNTOS PETITORIOS', 'FASE 2:', 'IV.', '🔹',
    '❌', '⚠️', '**Respuesta truncada**', 'No pudimos completar', 'consultas', 'SUSCRIPCION_SUSPENDIDA',
    // usuario
    '[MODO_FLASH]', '[CORTE:SCJN]', '[AUDITAR_SENTENCIA]', 'Archivo:', 'Estado:', '---CONTENIDO DEL DOCUMENTO---',
];
const MARCAS = [
    '<!--', '-->', '<!--THINKING_START-->', '<!--THINKING_END-->', '<!--thinking-->', '<!--/thinking-->',
    '<!--SYNTHESIS:START-->', '<!--SYNTHESIS:END-->', '<!-- CITATION_META:{', '<!-- FUENTES_PREVIAS:{', '<!-- PRECEDENTES_META:[',
    '} -->', '] -->', '<!-- SUSCRIPCION_SUSPENDIDA -->', '<!-- DOCUMENTO_INICIO -->', '<!-- DOCUMENTO_FIN -->',
    '<!-- SENTENCIA_INICIO -->', '<!-- SENTENCIA_FIN -->', '<!--PING-->', '<!-- CACHE:ACTIVE -->', '[SCJN_BUSCAR:',
    '<div class="fuentes-web">', '<div class="fw-nota">', '<div class="fw-cab">', '</div>', '<span class="fw-tit">', '<span class="fw-dom">',
    '</span>', '<div ', '<p>', '</p>', '<br>', '<br/>', '&amp;', '&nbsp;', '&#8599;', '<sup class="citation-badge"', '</sup>',
];
const ALFABETO = [...BLANCOS, ...SIGNOS, ...LITERALES];
const CON_MARCAS = [...ALFABETO, ...MARCAS];

const cadena = (semilla, largo, alfabeto) => {
    const r = azar(semilla);
    const uno = () => alfabeto[Math.floor(r() * alfabeto.length)];
    const partes = [];
    let n = 0;
    const poner = (x) => { partes.push(x); n += x.length; };
    if (r() < 0.2) {
        // Una sola racha de un token o de un par: el peor caso de casi todo.
        if (r() < 0.5) poner(uno());
        const u = uno() + (r() < 0.5 ? '' : uno());
        poner(u.repeat(Math.ceil((largo - n) / u.length)));
    } else {
        while (n < largo) {
            if (r() < 0.2) { const tok = uno(); poner(tok.repeat(1 + Math.floor((r() * r() * largo) / 2 / tok.length))); } else poner(uno());
        }
    }
    return partes.join('').slice(0, largo);
};

// Las cargas conocidas, escaladas al largo pedido.
const rellenar = (antes, racha, despues, largo) => antes + racha.repeat(Math.max(1, Math.ceil((largo - antes.length - despues.length) / racha.length))) + despues;
const hasta = (largo, f) => { let t = ''; for (let i = 0; t.length < largo; i++) t += f(i); return t; };
const CARGAS = {
    'Registro y espacios (cúbico)': (n) => rellenar('Registro', ' ', 'x', n),
    'Registro digital núm. y espacios': (n) => rellenar('Registro digital núm.', ' ', 'x', n),
    'colegiado y espacios': (n) => rellenar('I.1o.C.', ' ', 'x', n),
    'tesis y registros alternados': (n) => rellenar('', 'P./J. 1/2000 Registro digital: 123456 ', '', n),
    'rubros casi largos entre registros': (n) => rellenar('', 'AAAAAAAAAAAAAAAAAAAAAAAa Registro 1234567 ', '', n),
    'saltos': (n) => rellenar('a', '\n', 'x', n),
    'saltos y un marcador sin cierre': (n) => rellenar('a', '\n', '<!-- CITATION_META:{', n),
    'saltos y la marca de pausa partida': (n) => rellenar('a', '\n', '<!-- SUSCRIPCION', n),
    'fila de THINKING_START': (n) => rellenar('', '<!--THINKING_START-->', '', n),
    'fila de CITATION_META abierto': (n) => rellenar('', '<!-- CITATION_META:{', '', n),
    'fila de FUENTES_PREVIAS abierto': (n) => rellenar('', '\n<!-- FUENTES_PREVIAS:{', '', n),
    'fila de PRECEDENTES_META abierto': (n) => rellenar('', '<!-- PRECEDENTES_META:[', '', n),
    'fila de SYNTHESIS abierto': (n) => rellenar('', '<!--SYNTHESIS:START-->', '', n),
    'comentarios que al quitarse forman un marcador': (n) => rellenar('', '<!<!--x-->--THINKING_START-->', '', n),
    'fila de «[x» (enlace)': (n) => rellenar('', '[x', '', n),
    'fila de «[»': (n) => rellenar('', '[', '', n),
    '«[» y espacios': (n) => rellenar('[', ' ', 'x', n),
    '«[,» y espacios': (n) => rellenar('[,', ' ', 'x', n),
    '«[» y comas': (n) => rellenar('[', ', ', 'x]', n),
    'Fuente y espacios a mitad del renglón': (n) => rellenar('> Fuente: a', ' ', 'b', n),
    'Fuente y saltos': (n) => rellenar('> *Fuente: a*', '\n', 'b', n),
    'fila de fuentes': (n) => rellenar('', '> *Fuente: a*\n', '', n),
    'SCJN_BUSCAR y espacios': (n) => rellenar('[SCJN_BUSCAR:', ' ', 'x', n),
    'fila de SCJN_BUSCAR': (n) => rellenar('', '[SCJN_BUSCAR:', '', n),
    '<p> y «\\r\\n»': (n) => rellenar('<p>', '\r\n', 'x', n),
    '<p> y « \\n»': (n) => rellenar('<p>', ' \n', 'x', n),
    'enlaces sin cierre': (n) => rellenar('', '[a](http://x', '', n),
    'una dirección sin cierre, muchas veces': (n) => rellenar('', '[a](http://', '', n),
    'fila de «<!--»': (n) => rellenar('', '<!--', '', n),
    'fila de «[Doc ID:»': (n) => rellenar('', '[Doc ID:', '', n),
    'fila de «<div »': (n) => rellenar('', '<div ', '', n),
    'renglón de espacios': (n) => rellenar('', ' ', 'x', n),
    '«#» y espacios': (n) => rellenar('#', ' ', 'x', n),
    '«**» y espacios': (n) => rellenar('**', ' ', 'x', n),
    '«## **» y espacios': (n) => rellenar('## **', ' ', 'x', n),
    'separadores sin fin y estrategia': (n) => rellenar('', '\n---', 'x\nESTRATEGIA PROCESAL', n),
    'separadores hasta la estrategia': (n) => rellenar('x', '\n---', '\nESTRATEGIA PROCESAL', n),
    'separadores con blancos': (n) => rellenar('x\n---', ' ', 'y\nESTRATEGIA PROCESAL', n),
    '❌ y blancos ideográficos': (n) => rellenar('a', '\n　', 'x', n),
    '❌ sin principio de renglón': (n) => rellenar('a', 'x❌', '', n),
    'truncada y blancos': (n) => rellenar('a\n---', '　\n', 'x', n),
    'fila de truncadas incompletas': (n) => rellenar('', '\n---\n⚠️ ', '', n),
    'espacios en el texto suelto': (n) => rellenar('a', ' ', 'x', n),
    'organigrama en ciclo': (n) => `:::orgchart\n${hasta(n - 20, (i) => `n${i} -> n${i + 1}, n0\n`)}\n:::`,
    'organigrama de rombos': (n) => `:::orgchart\n${hasta(n - 20, (i) => `r${i} -> r${i}a, r${i}b\nr${i}a -> r${i + 1}\nr${i}b -> r${i + 1}\n`)}\n:::`,
    'organigrama en cadena': (n) => `:::orgchart\n${hasta(n - 20, (i) => `c${i} -> c${i + 1}\n`)}\n:::`,
    'tabla larga': (n) => rellenar('| a | b |\n|---|---|\n', '| x | y |\n', '', n),
    'viñetas': (n) => rellenar('', '- x\n', '', n),
    'numeradas': (n) => rellenar('', '1. x\n', '', n),
    'citas «>»': (n) => rellenar('', '> x\n', '', n),
    'dígitos a principio de renglón': (n) => rellenar('', '1111111111\n', '', n),
    'asteriscos': (n) => rellenar('**', '*x', '', n),
    'acentos graves': (n) => rellenar('`', 'x', '', n),
    'tarjeta abierta': (n) => rellenar('<div class="fuentes-web"><div class="fw-nota">', '</div> ', '', n),
};

// El código de antes, sacado del commit de referencia a un directorio temporal.
const ref = (args.find((a) => a.startsWith('--referencia=')) || '--referencia=620e191').split('=')[1];
let dir = null;
try {
    const sha = execFileSync('git', ['-C', RAIZ, 'rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
    dir = path.join(REFERENCIAS, sha);
    if (!fs.existsSync(path.join(dir, 'src/lib/respuestaDelChat.ts'))) {
        fs.mkdirSync(dir, { recursive: true });
        execSync(`git -C ${JSON.stringify(RAIZ)} archive ${sha} src | tar -x -C ${JSON.stringify(dir)}`);
    }
} catch (e) {
    ok(false, `no se pudo sacar ${ref} con git`, String(e?.message || e).slice(0, 160));
    dir = null;
}
const viejo = dir ? await cargar(dir) : null;
// `--medir-referencia` mide el código de antes en vez del de ahora: así se ve
// que esta prueba lo habría parado. Lo de antes puede tardar horas en una
// sola cadena (el registro era cúbico), así que cada función se mide en su
// propio proceso y se corta a los 30 s. `--solo=<nombre>` mide una sola.
const soloUna = (args.find((a) => a.startsWith('--solo=')) || '').slice('--solo='.length);
const medirReferencia = args.includes('--medir-referencia');
const medido = medirReferencia ? viejo : nuevo;
if (medirReferencia && !soloUna) {
    console.log(`MIDIENDO LA REFERENCIA (${ref}), NO EL CÓDIGO DE AHORA: cada función en su proceso, cortada a los 30 s\n`);
    for (const [nombre] of funciones(viejo).lista) {
        try {
            const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', fileURLToPath(import.meta.url),
                '--medir-referencia', `--referencia=${ref}`, `--solo=${nombre}`], { encoding: 'utf8', timeout: 30_000 });
            console.log(out.split('\n').filter((l) => /^ {2}[✔✘]/.test(l)).join('\n'));
        } catch (e) {
            const out = String(e?.stdout || '').split('\n').filter((l) => /^ {2}[✔✘]/.test(l));
            fallas += out.filter((l) => l.includes('✘')).length;
            if (out.length) console.log(out.join('\n'));
            else ok(false, nombre, e?.signal === 'SIGTERM' ? 'más de 30 s: se cortó' : `falló: ${String(e?.message || e).slice(0, 100)}`);
        }
    }
    console.log(`\n${fallas} de ${funciones(viejo).lista.length} funciones no pasan con el código de ${ref}`);
    process.exit(fallas ? 1 : 0);
}

// ═══ 1. TIEMPO LINEAL ══════════════════════════════════════════════════════
// `--sin-tiempo`: sólo la equivalencia (para probar cambios deprisa).
if (!args.includes('--sin-tiempo')) {
    console.log('TIEMPO LINEAL (fuzzing con semilla fija)');
    const todas = funciones(medido);
    const lista = soloUna ? todas.lista.filter(([nombre]) => nombre === soloUna) : todas.lista;
    const sinAdaptador = soloUna ? [] : todas.sinAdaptador;
    for (const clave of sinAdaptador) ok(false, `${clave}: pide más de un argumento y no tiene adaptador para medirla`);

    const SEMILLA = 20260926;
    const familia = (nombre, desde, cuantas, largo, alfabeto) =>
        Array.from({ length: cuantas }, (_, k) => ({ nombre: `${nombre} #${k}`, s: cadena(SEMILLA + desde + k, largo, alfabeto) }));
    const cargas = (largo) => Object.entries(CARGAS).map(([nombre, g]) => ({ nombre, s: g(largo) }));
    // Pares 20k ↔ 100k con la MISMA receta: se compara lo mismo a dos tamaños.
    const C20 = familia('azar', 0, 300, 20_000, ALFABETO);
    const C100 = familia('azar', 0, 20, 100_000, ALFABETO);
    const M20 = familia('marcas', 100_000, 60, 20_000, CON_MARCAS);
    const M100 = familia('marcas', 100_000, 6, 100_000, CON_MARCAS);
    const P20 = cargas(20_000);
    const P100 = cargas(100_000);
    const TODAS20 = [...C20, ...M20, ...P20];
    const PARES = [
        ...C100.map((c, k) => [C20[k], c]),
        ...M100.map((c, k) => [M20[k], c]),
        ...P100.map((c, k) => [P20[k], c]),
    ];
    console.log(`  ${TODAS20.length} cadenas de 20k (${C20.length} del alfabeto, ${M20.length} con marcadores, ${P20.length} cargas conocidas) y ${PARES.length} de 100k; ${lista.length} funciones`);

    const cronometrar = (f, x, veces = 2) => {
        let mejor = Infinity;
        for (let k = 0; k < veces; k++) {
            const t0 = performance.now();
            f(x);
            const dt = performance.now() - t0;
            if (dt < mejor) mejor = dt;
        }
        return mejor;
    };
    // Por debajo de un milisegundo con 20k la razón es ruido (el reloj, el
    // JIT): se compara contra ese piso. Una expresión cuadrática que tarde
    // medio milisegundo con 20k tarda 12 ms con 100k: se ve igual.
    const PISO = 1;
    const TOPE_RAZON = 8;
    /** 100k/20k. Lo lineal da ~5×. Si pasa del tope se mide otra vez —hasta
     *  cuatro rondas de mejor de 7, alternando los dos tamaños— antes de
     *  acusar: una pausa del recolector no es una expresión cuadrática, que
     *  da ~25× en todas las rondas. */
    const razon = (f, chica, grande, a, b) => {
        let r = b / Math.max(a, PISO);
        for (let ronda = 0; r > TOPE_RAZON && ronda < 4; ronda++) {
            const a2 = cronometrar(f, chica.s, 7);
            const b2 = cronometrar(f, grande.s, 7);
            const r2 = b2 / Math.max(a2, PISO);
            if (r2 < r) { r = r2; a = a2; b = b2; }
        }
        return { r, a, b };
    };
    const t0 = performance.now();
    const cuenta = (x, campo = 't') => (x.c ? `${x[campo].toFixed(1)}${campo === 'r' ? '×' : ' ms'} (${x.c.nombre})` : 'sin medir');
    for (const [nombre, f] of lista) {
        for (const c of TODAS20.slice(0, 5)) f(c.s);          // que el JIT la compile antes de medir
        // En cuanto una cadena rompe el límite, la función ya falló: no se
        // espera al resto (con una expresión cuadrática serían minutos).
        const t20 = new Map();
        let peor20 = { t: -1, c: null };
        let error = null;
        try {
            for (const c of TODAS20) {
                const t = cronometrar(f, c.s);
                t20.set(c, t);
                if (t > peor20.t) peor20 = { t, c };
                if (t >= 60) break;
            }
        } catch (e) { error = e; }
        let peor100 = { t: -1, c: null };
        let peorRazon = { r: -1, c: null, a: 0, b: 0 };
        if (!error && peor20.t < 60) {
            try {
                for (const [chica, grande] of PARES) {
                    const b = cronometrar(f, grande.s);
                    if (b > peor100.t) peor100 = { t: b, c: grande };
                    if (b >= 300) break;
                    const m = razon(f, chica, grande, t20.get(chica), b);
                    if (m.r > peorRazon.r) peorRazon = { ...m, c: grande };
                    if (m.r > TOPE_RAZON) break;
                }
            } catch (e) { error = e; }
        }
        if (error) { ok(false, nombre, `lanzó ${String(error?.message || error).slice(0, 120)}`); continue; }
        const bien = peor20.t < 60 && peor100.t >= 0 && peor100.t < 300 && peorRazon.r <= TOPE_RAZON;
        ok(bien, nombre, `20k ≤ ${cuenta(peor20)} · 100k ≤ ${cuenta(peor100)} · 100k/20k ≤ ${cuenta(peorRazon, 'r')}`
            + (peorRazon.c ? `: ${peorRazon.a.toFixed(2)} → ${peorRazon.b.toFixed(2)} ms` : ''));
    }
    console.log(`  (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
}

// ═══ 2. LA MISMA SALIDA QUE ANTES ══════════════════════════════════════════
// Respuestas normales, escritas como las escribe el modelo.
const META = JSON.stringify({ valid: 2, invalid: 0, total: 2, invalid_ids: [], sources: { [A]: { origen: 'SCJN', ref: '2a./J. 183/2007', texto: 'x' }, [B]: { origen: 'CPEUM', ref: 'art. 8o.', texto: 'y' } } });
const PREVIAS = JSON.stringify({ [A]: { origen: 'SCJN', ref: 'previa', texto: 'p' } });
const PRECEDENTES = JSON.stringify([{ id: 'p1', holding: 'La autoridad debe "contestar" <pronto>.', ref: '3TCC · AD-892/2022 · Null · 2022', origen: 'TCC_ADMIN — 3er Circuito — ADMINISTRATIVA', score: 0.8, silo: 'tcc' }]);
const NORMALES = [
    `## ⚖️ Respuesta Legal
---
## RESPUESTA DIRECTA
Sí procede el amparo indirecto contra la negativa ficta [Doc ID: ${A}]. Véase también [Doc IDs: ${A}; ${B}] y (Doc ID: ${B}).

## MARCO CONSTITUCIONAL Y DERECHOS HUMANOS
El artículo 8o. constitucional garantiza el derecho de petición [Doc ID: ${B}].

> *Fuente: Constitución Política de los Estados Unidos Mexicanos, art. 8o.*

La Segunda Sala lo ha sostenido así:

**DERECHO DE PETICIÓN. SUS ELEMENTOS ESENCIALES Y SU ALCANCE.** El derecho de petición consigna la obligación de responder.
Tesis: 2a./J. 183/2007. Registro digital: 171484.

**NEGATIVA FICTA. EL TRIBUNAL DEBE PRONUNCIARSE SOBRE EL FONDO DEL ASUNTO.** Texto de la tesis.
Tesis: I.3o.C.493 C · Registro digital 2021472

Otra sin registro: Tesis 1a./J. 82/2014, y la del colegiado VI.2o.C. J/207.

- primer punto con *énfasis* y \`código\`
- segundo punto, [la guía](https://www.scjn.gob.mx/guia?x=1) y [1]
* tercero • con viñeta

1. uno
2) dos

| Vía | Plazo |
|---|---|
| Amparo | 15 días |

═══════════════
### CONCLUSIÓN
Procede, conforme al registro núm. 2006227.

## Fuentes citadas
<!-- CITATION_META:${META} -->`,
    `<!--THINKING_START-->El usuario pregunta por la suplencia de la queja. Debo revisar el art. 79.<!--THINKING_END-->
<!-- FUENTES_PREVIAS:${PREVIAS} -->

<!--SYNTHESIS:START-->Consultando a los genios...<!--SYNTHESIS:END-->
## FUNDAMENTO LEGAL
La suplencia opera en materia penal [Doc ID: ${A}].
> **Artículo 79.** La autoridad que conozca del juicio de amparo deberá suplir la deficiencia.
> Fracción III, inciso a).

### Conclusión
Sí opera.

<!-- PRECEDENTES_META:${PRECEDENTES} -->
<!-- CITATION_META:${META} -->`,
    `Tu cuenta está en pausa.

<!-- SUSCRIPCION_SUSPENDIDA -->`,
    `## ANÁLISIS INTEGRADO
Cita con coma [véase, ${A}] y otra [Tesis 2a./J. 5/2020, ${B}], sin etiqueta [${A}], con coma delante [, ${B}], suelta Doc ${A} y el fragmento [-985d-5043-8e4e-b43aaee99c66].
Doc ID: ${A.slice(0, 13)} quedó a medias. Y un [Doc IDs: ${A}; 5f3e] roto.
Una dirección con uuid https://x.mx/${A}/pdf y el de la tesis ${B}.
Y la nota dentro de otra: [véase [la tesis, ${A}] y sigue.

<div class="fuentes-web"><div class="fw-cab">📚 Doctrina consultada</div><ul><li><span class="fw-tit">Tratado de amparo</span> <span class="fw-dom">Porrúa, p. 45</span></li></ul><div class="fw-nota">⚠️ Algunas citas textuales no pudieron verificarse.</div></div>

Texto &amp; más &nbsp; y <br/> salto.
<!--PING--><!-- CACHE:ACTIVE --><!--SYNTHESIS:END-->`,
    `> *Fuente: Ley de Amparo, art. 17.*

Sigue el texto.

> Fuente:

foo en otro renglón

> **Fuente:** negrita que no casa
> *Fuente: con blancos al final*
> *Fuente: con estrella suelta * y texto *
> FUENTE: mayúsculas*
fin`,
    `:::orgchart
titulo: Estructura del Poder Judicial
[SCJN] -> [Primera Sala], [Segunda Sala], [Pleno]
Primera Sala -> Colegiados Civiles, Colegiados Penales
Segunda Sala -> Colegiados Administrativos
:::

:::processflow
titulo: Trámite del amparo
1. Demanda | Se presenta ante el juez | Día 1
2. Admisión | El juez la admite | 24 h
3. Informe justificado
:::

┌──────┬──────┐
│ Vía  │ Plazo│
├──────┼──────┤
│ Amparo │ 15 │
└──────┴──────┘

[SCJN_BUSCAR: negativa ficta] y [SCJN_BUSCAR: otra [anidada] cosa]`,
    `:::orgchart
titulo: De la Corte al juzgado
SCJN -> Segunda Sala
Segunda Sala -> Pleno Regional
Pleno Regional -> Tribunal Colegiado
Tribunal Colegiado -> Juzgado de Distrito
Juzgado de Distrito -> Secretaría
Juzgado de Distrito -> Actuaría
:::
Ver [el art. [14] constitucional](https://www.diputados.gob.mx/LeyesBiblio/pdf/CPEUM.pdf) y [nota] (https://x.mx).`,
    `**PROEMIO**

C. JUEZ DE DISTRITO EN MATERIA ADMINISTRATIVA
PRESENTE.

HECHOS:

1. El 3 de marzo presenté la solicitud.

2. No hubo respuesta.

## DERECHO

Artículos 8o. y 17 constitucionales [Doc ID: ${A}].

**PUNTOS PETITORIOS**

PRIMERO. Tenerme por presentado.

PROTESTO LO NECESARIO

---
═══

## ESTRATEGIA PROCESAL Y RECOMENDACIONES

| Fortaleza | Alta |
|---|---|
| Probabilidad | 70% |`,
    `HECHOS

1. Uno.

PROTESTO LO NECESARIO

---

═══

## ESTRATEGIA PROCESAL Y RECOMENDACIONES
Alta.`,
    `**EVALUACIÓN DE VIABILIDAD**
Alta.

## HECHOS
Uno.

  ### 🔹 ESTRATEGIA DEL AMPARO
Pedir la suspensión.`,
    `Estrategia procesal: un párrafo que empieza así no es rubro.

FASE 2: ESTRATEGIA DE IMPUGNACIÓN
Recurso de revisión.
---
***
___`,
    '❌ Has alcanzado tu límite de consultas de este periodo.',
    'Opción A ✅, opción B ❌ no procede porque venció el plazo.',
    'Texto a medias de la demanda.\n\n❌ **No pudimos completar la consulta.** Inténtalo de nuevo.',
    '## REVISIÓN\n' + '❌ Falta la firma.\n'.repeat(4) + 'x'.repeat(700),
    `Primera parte del escrito.

---

⚠️ **Respuesta truncada** — envía «continúa» para seguir.`,
    'Otra\n---　\n　⚠️　**Respuesta truncada**',
    '[MODO_FLASH] [CORTE:SCJN] ¿qué artículos regulan el amparo?',
    '[AUDITAR_SENTENCIA]\nArchivo: sentencia_final.pdf\nEstado: pendiente\n---CONTENIDO DEL DOCUMENTO---\ncuerpo',
    'Revisa esto <!-- DOCUMENTO_INICIO -->texto largo del documento<!-- DOCUMENTO_FIN --> y <!-- SENTENCIA_INICIO -->otra<!-- SENTENCIA_FIN --> fin\nArchivo: x.docx',
    `<p>uno</p>
<p>dos</p>

<div class="x">
  <span>tres</span>
</div>`,
    'Registro digital: 2021472 y registro 162822 y Registro núm. 2006227 y Registro número: 1234567 y registro digital. 7654321 y Registro:123456789 y Registro núm 2006228 y Registro número 1234568',
];

console.log('\nLA MISMA SALIDA QUE ANTES');
{
    if (viejo && !soloUna) {
        console.log(`  referencia: ${ref}`);
        const fv = new Map(funciones(viejo).lista);
        const fn = new Map(funciones(nuevo).lista);
        const salida = (f, t) => { try { return JSON.stringify(f(t), (_, v) => (v instanceof Map ? [...v] : v)); } catch (e) { return `LANZÓ ${e?.message}`; } };
        const comparar = (titulo, textos) => {
            let malas = 0;
            let primera = '';
            for (const [nombre, f] of fn) {
                const g = fv.get(nombre);
                if (!g) continue;                          // función nueva: no hay con qué comparar
                for (const t of textos) {
                    const a = salida(g, t);
                    const b = salida(f, t);
                    if (a !== b) {
                        malas++;
                        if (!primera) {
                            let k = 0;
                            while (a[k] === b[k]) k++;
                            primera = `${nombre} con ${JSON.stringify(t.slice(0, 80))}: «${a.slice(Math.max(0, k - 40), k + 40)}» → «${b.slice(Math.max(0, k - 40), k + 40)}»`;
                        }
                    }
                }
            }
            ok(malas === 0, `${titulo}: ${textos.length} textos × ${fn.size} funciones, idénticas`, malas ? `${malas} distintas; la primera, ${primera}` : '');
        };

        comparar('respuestas normales', NORMALES);
        // Lo que se pinta mientras llega: cada prefijo, cortado en cualquier sitio.
        const prefijos = [];
        for (const t of NORMALES) for (let k = 0; k < t.length; k += 7) prefijos.push(t.slice(0, k));
        comparar('sus prefijos (el stream a medias)', prefijos);
        // Cortas del alfabeto: donde lo viejo aún tarda poco.
        const cortas = [];
        for (let k = 0; k < 2500; k++) {
            const r = azar(777 + k);
            cortas.push(cadena(900_000 + k, 20 + Math.floor(r() * 380), k % 3 ? ALFABETO : CON_MARCAS));
        }
        comparar('cadenas cortas del alfabeto', cortas);
        // Alfabetos pequeños, uno por escáner: con pocas piezas salen a menudo
        // las combinaciones raras que distinguen una lectura de otra.
        const PEQUENOS = {
            'exportación': ['[', ']', ',', ', ', ' ', '\n', A, 'x', '[Doc ID: ', '[Doc IDs: ', '⟦1⟧', '(', ')', '<div', '>', '<p ', '<a'],
            'enlaces': ['[', ']', '(', ')', 'http://', 'https://', 'x', ' ', '\n', '](http://', '](https://x', '\r'],
            'fuentes': ['> *Fuente:', '> Fuente:', '> FUENTE:', '*', ' ', '\n', '\r', '\r\n', '\u3000', 'x', '\u2028', '> '],
            'marcadores': ['\n', '<!-- CITATION_META:{', '} -->', '<!-- FUENTES_PREVIAS:{', '<!-- PRECEDENTES_META:[', '] -->', 'x', '{', '}',
                '<!-- SUSCRIPCION_SUSPENDIDA -->', '<!--THINKING_START-->', '<!--THINKING_END-->', '<!--SYNTHESIS:START-->', '<!--SYNTHESIS:END-->'],
            'estrategia': ['\n', '---', '***', '___', '═══', '-', '*', ' ', '\t', 'x', 'ESTRATEGIA PROCESAL', '## ', '#', '**', 'PROTESTO', '\u3000', 'IV. ', 'FASE 1: ', '🔹',
                '\n**', '\n## ', '** ESTRATEGIA PROCESAL', '\n**PROTESTO**'],
            'avisos': ['\n', ' ', '\u3000', '❌', 'x', '---', '⚠️', '**Respuesta truncada**', '-', 'No pudimos completar', '**', 'consultas',
                '\n---', '⚠️ **Respuesta truncada**', '\n❌ '],
            'registros': ['Registro', 'registro', ' ', '\n', ' digital', 'núm', 'número', '.', ':', '1234567', '12', 'I.1o.C.', 'J/', '5', 'P./J. 1/2000', 'AAAAAAAAAAAAAAAAAAAAAAAAA', 'b', ' C'],
            'etiquetas': ['<p>', '</p>', '>', '<', ' ', '\n', '\r', 'x', '\n\n', '<div>'],
        };
        for (const [nombre, alfabeto] of Object.entries(PEQUENOS)) {
            const textos = [];
            for (let k = 0; k < 400; k++) {
                const r = azar(31 * k + nombre.length);
                const partes = [];
                for (let n = 1 + Math.floor(r() * 24); n > 0; n--) partes.push(alfabeto[Math.floor(r() * alfabeto.length)]);
                textos.push(partes.join(''));
            }
            comparar(`alfabeto pequeño de ${nombre}`, textos);
        }
        // Organigramas al azar SIN ciclos (lo de antes, con ciclos, revienta).
        const organigramas = [];
        for (let k = 0; k < 300; k++) {
            const r = azar(4242 + k);
            const n = 2 + Math.floor(r() * 7);
            const renglones = [];
            for (let e = 1 + Math.floor(r() * 9); e > 0; e--) {
                const padre = Math.floor(r() * (n - 1));
                const hijos = Array.from({ length: 1 + Math.floor(r() * 3) }, () => `n${padre + 1 + Math.floor(r() * (n - 1 - padre))}`);
                renglones.push(`${r() < 0.3 ? '[' : ''}n${padre}${r() < 0.3 ? ']' : ''} -> ${hijos.join(', ')}`);
            }
            organigramas.push(`:::orgchart\n${r() < 0.5 ? 'titulo: T\n' : ''}${renglones.join('\n')}\n:::`);
        }
        comparar('organigramas sin ciclos', organigramas);
        // Pegadas de a dos, para cruzar los marcadores de una con el texto de otra.
        const mezclas = [];
        for (let k = 0; k < NORMALES.length; k++) mezclas.push(NORMALES[k] + '\n' + NORMALES[(k + 5) % NORMALES.length], NORMALES[k] + NORMALES[(k + 1) % NORMALES.length]);
        comparar('respuestas pegadas de dos en dos', mezclas);
        // Con ciclo, lo de antes recursaba hasta reventar la pila; ahora se pinta.
        const ciclo = ':::orgchart\nA -> B\nB -> C\nC -> A, D\n:::';
        let reventaba = false;
        try { viejo.R.formatMarkdown(ciclo); } catch (e) { reventaba = e instanceof RangeError; }
        let pinta = '';
        try { pinta = nuevo.R.formatMarkdown(ciclo); } catch (e) { pinta = `LANZÓ ${e?.message}`; }
        ok(reventaba && ['A', 'B', 'C', 'D'].every((x) => pinta.includes(`>${x}</div>`)),
            'organigrama en ciclo: antes reventaba la pila, ahora pinta sus cuatro nodos', reventaba ? '' : 'lo de antes no reventó');
        if (archivo) {
            const conv = JSON.parse(fs.readFileSync(archivo, 'utf8'));
            const mensajes = (Array.isArray(conv) ? conv : conv.messages || []).map((m) => m.content || '');
            comparar(`la conversación de ${path.basename(archivo)}`, mensajes);
        }
    }
}

console.log(fallas ? `\n${fallas} COMPROBACIÓN(ES) FALLIDA(S)` : '\nTODO BIEN');
process.exit(fallas ? 1 : 0);
