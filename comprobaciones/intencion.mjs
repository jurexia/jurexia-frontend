// LA ETIQUETA «ESCRITO / CONSULTA» DEL COMPOSITOR (28-sep-2026).
//
// `@/lib/intencion` pregunta al servidor qué hará con lo que el abogado lleva
// escrito y guarda, atada al texto exacto, la intención con que se envía.
// Aquí, sin servidor (un `fetch` de mentira):
//
//   · lo que se manda a leer: cabeza y cola del mensaje largo, la respuesta
//     anterior sin el mapa de fuentes;
//   · la lectura: lo que contesta el servidor, y null si no contesta;
//   · la intención del envío: viaja sólo con el mensaje que el compositor
//     mandó, se consume una vez, caduca y `null` la borra;
//   · `streamChat` la pone en el cuerpo del request, en los reintentos también,
//     y no la inventa para los demás caminos.
//
//   node --experimental-strip-types comprobaciones/intencion.mjs
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

// Un navegador mínimo: `api.ts` lee el localStorage al enviar.
const guardado = new Map();
globalThis.localStorage = {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => guardado.set(k, String(v)),
    removeItem: (k) => guardado.delete(k),
};

// El `fetch` de mentira: apunta lo que se pidió y contesta lo que toque.
const pedidos = [];
let contestar = () => ({ ok: true, json: async () => ({ intencion: 'consultar', motivo: '' }) });
globalThis.fetch = async (url, init) => {
    pedidos.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : null });
    return contestar(url, init);
};

const I = await import(path.join(RAIZ, 'src/lib/intencion.ts'));
const API = await import(path.join(RAIZ, 'src/lib/api.ts'));

let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

// ── lo que se manda a leer ───────────────────────────────────────────────
{
    ok(I.mensajeParaLeer('  Redacta la demanda  ') === 'Redacta la demanda', 'el mensaje corto va entero, sin espacios de sobra');
    const largo = 'A'.repeat(6000) + 'B'.repeat(6000) + ' redacta la demanda';
    const leido = I.mensajeParaLeer(largo);
    ok(leido.length <= 8000, `el largo cabe en el tope del servidor (${leido.length})`);
    ok(leido.startsWith('A'.repeat(5000)) && leido.endsWith('redacta la demanda'),
        'el largo va por la cabeza y la cola: el encargo del final no se pierde');

    const meta = '<!--CITATION_META:' + JSON.stringify({ x: 'y'.repeat(50000) }) + '-->';
    const anterior = I.anteriorParaLeer('C. JUEZ DE DISTRITO\n\nHECHOS\n\n1. …' + meta);
    ok(!anterior.includes('CITATION_META') && anterior.includes('HECHOS'), 'la respuesta anterior va sin el mapa de fuentes');
    const enorme = I.anteriorParaLeer('C. JUEZ\n' + 'x '.repeat(20000) + '\n¿Quieres que redacte la demanda?');
    ok(enorme.length <= 16000 && enorme.startsWith('C. JUEZ') && enorme.endsWith('¿Quieres que redacte la demanda?'),
        'la respuesta enorme conserva el rótulo del principio y la oferta del final');
    ok(I.anteriorParaLeer(undefined) === '' && I.anteriorParaLeer(null) === '', 'sin respuesta anterior, nada');
}

// ── la lectura ───────────────────────────────────────────────────────────
{
    pedidos.length = 0;
    contestar = () => ({ ok: true, json: async () => ({ intencion: 'redactar', motivo: 'pide' }) });
    const l = await I.leerIntencion('  Redacta una demanda de amparo ', '');
    ok(l && l.intencion === 'redactar' && l.motivo === 'pide' && l.texto === 'Redacta una demanda de amparo',
        'lee lo que contesta el servidor, atado al texto sin espacios');
    ok(pedidos[0].url.endsWith('/redaccion/intencion') && pedidos[0].init.method === 'POST',
        'pregunta a /redaccion/intencion');
    ok(!('anterior' in pedidos[0].body), 'sin respuesta anterior no manda el campo');

    await I.leerIntencion('sí', 'algo anterior');
    ok(pedidos[1].body.anterior === 'algo anterior', 'con respuesta anterior, la manda');

    ok(await I.leerIntencion('   ', '') === null && pedidos.length === 2, 'un mensaje vacío ni se pregunta');
    contestar = () => ({ ok: false, json: async () => ({}) });
    ok(await I.leerIntencion('hola', '') === null, 'si el servidor falla, no hay lectura');
    contestar = () => ({ ok: true, json: async () => ({ intencion: 'otra cosa' }) });
    ok(await I.leerIntencion('hola', '') === null, 'una respuesta rara no cuenta');
    contestar = () => { throw new TypeError('Failed to fetch'); };
    ok(await I.leerIntencion('hola', '') === null, 'sin red, no hay lectura (y no revienta)');
}

// ── la intención del envío ───────────────────────────────────────────────
{
    const conv = (texto) => [
        { role: 'system', content: 'carpeta' },
        { role: 'user', content: 'antes' },
        { role: 'assistant', content: 'respuesta' },
        { role: 'user', content: texto },
    ];
    I.fijarIntencionDelEnvio('  Quiero que me ayudes con la demanda ', 'consultar');
    ok(I.intencionParaEnviar(conv('Otra cosa')) === undefined, 'otro mensaje no la recibe');
    ok(I.intencionParaEnviar(conv('Quiero que me ayudes con la demanda')) === 'consultar',
        'el mensaje que el compositor mandó sí');
    ok(I.intencionParaEnviar(conv('Quiero que me ayudes con la demanda')) === undefined, 'se consume una vez');

    I.fijarIntencionDelEnvio('Redacta la demanda', 'redactar');
    I.fijarIntencionDelEnvio('Redacta la demanda', null);
    ok(I.intencionParaEnviar(conv('Redacta la demanda')) === undefined, 'null la borra');

    I.fijarIntencionDelEnvio('', 'redactar');
    ok(I.intencionParaEnviar(conv('')) === undefined, 'sin texto no se guarda');

    const ahora = Date.now;
    I.fijarIntencionDelEnvio('sí', 'redactar');
    Date.now = () => ahora() + 11 * 60 * 1000;
    ok(I.intencionParaEnviar(conv('sí')) === undefined, 'pasados diez minutos caduca');
    Date.now = ahora;
    ok(I.intencionParaEnviar(conv('sí')) === undefined, 'y la caducada se consumió');
}

// ── streamChat la pone en el request ─────────────────────────────────────
const leerCuerpo = async (mensajes, extra, fallarAntes = 0) => {
    pedidos.length = 0;
    let fallos = fallarAntes;
    contestar = () => {
        if (fallos > 0) { fallos--; return { ok: false, status: 503, text: async () => 'dormido' }; }
        return {
            ok: true, status: 200,
            body: { getReader: () => { let dado = false; return { read: async () => (dado ? { done: true } : (dado = true, { done: false, value: new TextEncoder().encode('ok') })) }; } },
        };
    };
    const trozos = [];
    for await (const t of API.streamChat(mensajes, 'CDMX', 30, undefined, false, undefined, undefined, undefined, undefined, extra)) trozos.push(t);
    return pedidos.filter((p) => p.url.endsWith('/chat')).map((p) => p.body);
};
{
    const msgs = [{ role: 'user', content: 'Quiero que me ayudes con la demanda' }];
    I.fijarIntencionDelEnvio('Quiero que me ayudes con la demanda', 'redactar');
    const [cuerpo] = await leerCuerpo(msgs);
    ok(cuerpo.intencion === 'redactar', 'el request lleva la intención del compositor');

    const [sin] = await leerCuerpo(msgs);
    ok(!('intencion' in sin), 'el siguiente envío del mismo texto ya no la lleva (se consumió)');

    I.fijarIntencionDelEnvio('Quiero que me ayudes con la demanda', 'consultar');
    const [flujo] = await leerCuerpo([{ role: 'user', content: 'Parte 2 del flujo: redacta los hechos' }]);
    ok(!('intencion' in flujo), 'otro camino (un flujo) no la recibe');
    I.fijarIntencionDelEnvio('', null);

    // `setTimeout` inmediato: el reintento espera 2 s y aquí no hace falta.
    const espera = globalThis.setTimeout;
    globalThis.setTimeout = (fn) => espera(fn, 0);
    I.fijarIntencionDelEnvio('Quiero que me ayudes con la demanda', 'consultar');
    const cuerpos = await leerCuerpo(msgs, undefined, 1);
    globalThis.setTimeout = espera;
    ok(cuerpos.length === 2 && cuerpos.every((c) => c.intencion === 'consultar'),
        'el reintento tras un arranque en frío lleva la misma intención');

    const [explicita] = await leerCuerpo(msgs, { intencion: 'redactar' });
    ok(explicita.intencion === 'redactar', 'quien la pasa en `extra` la manda tal cual');
}

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
