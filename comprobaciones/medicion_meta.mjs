// LA MEDICIÓN DE META, SIN RED (6-oct-2026).
//
//   node --experimental-strip-types comprobaciones/medicion_meta.mjs
//
// Corre EL MISMO código que usan el navegador (`src/lib/origen-alta.ts`), la
// ruta /api/medicion/alta y el webhook de Stripe (`src/lib/meta-capi.ts`), con
// un `fetch`, un `window` y un Supabase de mentira. No toca Meta ni Supabase.
//
//   1. SHA-256 del correo normalizado (minúsculas, sin espacios) y del id.
//   2. `_fbc` con el formato oficial `fb.1.<ms>.<fbclid>`, el primer contacto
//      que manda 30 días y el fbclid nuevo que sí lo actualiza.
//   3. Sin token o sin píxel, el ayudante no hace NADA (ni un fetch).
//   4. El payload: event_id, user_data cifrado, fbc/fbp en claro, value y
//      currency en MAYÚSCULAS, test_event_code cuando lo hay.
//   5. El webhook no se rompe: fetch que falla, fetch colgado (corte a 3 s),
//      Supabase que lanza, Supabase colgado (conTope).
//   6. El alta en el navegador: una sola vez por usuario, fbq con eventID
//      reg_<id>, el evento pendiente cuando fbq aún no existe, y nada a Meta
//      sin permiso de Marketing.
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = await import(path.join(RAIZ, 'src/lib/meta-capi.ts'));
const O = await import(path.join(RAIZ, 'src/lib/origen-alta.ts'));

let fallos = 0;
function comprueba(bien, etiqueta, detalle = '') {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', etiqueta, detalle ? `— ${detalle}` : '');
}
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const silenciar = () => { const l = console.log, w = console.warn; const lineas = []; console.log = console.warn = (...a) => lineas.push(a.join(' ')); return () => { console.log = l; console.warn = w; return lineas; }; };

// ─── 1. Hash ────────────────────────────────────────────────────────────────
console.log('\n1. SHA-256');
comprueba(C.normalizarCorreo('  Juan.Perez @Example.COM ') === 'juan.perez@example.com', 'normaliza: minúsculas y sin espacios');
comprueba(C.hashCorreo('  Juan.Perez @Example.COM ') === sha('juan.perez@example.com'), 'hashCorreo = sha256 del correo normalizado');
comprueba(C.hashCorreo('test@example.com') === '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b', 'vector conocido de test@example.com');
comprueba(C.hashCorreo('') === undefined && C.hashCorreo('sin-arroba') === undefined, 'correo vacío o sin @ → sin em');
comprueba(C.hashId('ABC-123') === sha('abc-123'), 'external_id = sha256 del id en minúsculas');
comprueba(C.ipDelCliente('201.1.2.3, 10.0.0.1') === '201.1.2.3', 'IP: la primera de x-forwarded-for');

// ─── 2. fbc y primer contacto ───────────────────────────────────────────────
console.log('\n2. _fbc y primer contacto');
const T0 = Date.UTC(2026, 9, 6, 12, 0, 0, 123);
comprueba(O.formatoFbc('IwAR_xY-z', T0) === `fb.1.${T0}.IwAR_xY-z`, 'formato fb.1.<ms>.<fbclid>', O.formatoFbc('IwAR_xY-z', T0));
const q1 = '?utm_source=meta&utm_medium=video_pagado&utm_campaign=v77&utm_content=reel&fbclid=IwAR_Uno';
const o1 = O.fusionarOrigen(null, q1, T0, '/registro', 'https://l.facebook.com/l.php?u=secreto');
comprueba(o1?.utm_campaign === 'v77' && o1?.utm_source === 'meta' && o1?.utm_content === 'reel', 'guarda los utm');
comprueba(o1?.fbclid === 'IwAR_Uno' && o1?.fbc === `fb.1.${T0}.IwAR_Uno`, 'fbclid y fbc con la hora del clic');
comprueba(/^fb\.1\.\d{13}\.IwAR_Uno$/.test(o1?.fbc ?? ''), 'fbc con timestamp de 13 cifras (ms)');
comprueba(o1?.referrer === 'https://l.facebook.com/l.php', 'referrer sin query', o1?.referrer);
comprueba(o1?.landing_path === '/registro' && o1?.primer_contacto === new Date(T0).toISOString(), 'página y fecha del primer contacto');
comprueba(O.fusionarOrigen(o1, '?ref=ABC', T0 + 1000, '/precios', '') === o1, 'URL sin utm ni fbclid: no toca nada');
const o2 = O.fusionarOrigen(o1, '?utm_source=google&utm_campaign=otra', T0 + 5 * 86400e3, '/precios', '');
comprueba(o2 === o1, 'segundo contacto con utm dentro de 30 días: manda el primero');
const T3 = T0 + 6 * 86400e3;
const o3 = O.fusionarOrigen(o1, '?fbclid=IwAR_Dos', T3, '/', '');
comprueba(o3?.fbclid === 'IwAR_Dos' && o3?.fbc === `fb.1.${T3}.IwAR_Dos` && o3?.utm_campaign === 'v77' && o3?.primer_contacto === o1.primer_contacto,
    'fbclid nuevo: actualiza fbclid/fbc y conserva el primer contacto');
const T4 = T0 + 31 * 86400e3;
const o4 = O.fusionarOrigen(o1, '?utm_source=google&utm_campaign=otra', T4, '/precios', '');
comprueba(o4?.utm_source === 'google' && o4?.fbclid === undefined && o4?.primer_contacto === new Date(T4).toISOString(), 'pasados 30 días: nuevo primer contacto');
const g1 = O.fusionarOrigen(null, '?utm_source=google&utm_medium=cpc&utm_campaign=busqueda&gclid=Cj0KG_Uno', T0, '/registro', '');
comprueba(g1?.gclid === 'Cj0KG_Uno' && g1?.fbclid === undefined && g1?.fbc === undefined && g1?.utm_source === 'google', 'gclid: se guarda tal cual, sin fbc');
comprueba(O.fusionarOrigen(null, '?gclid=Solo', T0, '/', '')?.gclid === 'Solo', 'un gclid solo, sin utm, ya es un primer contacto');
const g2 = O.fusionarOrigen(g1, '?gclid=Cj0KG_Dos', T0 + 3 * 86400e3, '/', '');
comprueba(g2?.gclid === 'Cj0KG_Dos' && g2?.utm_campaign === 'busqueda' && g2?.primer_contacto === g1.primer_contacto, 'gclid nuevo: actualiza el clic y conserva el primer contacto');
comprueba(O.fusionarOrigen(g1, '?gclid=Cj0KG_Uno', T0 + 1000, '/', '') === g1, 'el mismo gclid: no toca nada');
const gm = O.fusionarOrigen(o1, '?gclid=Cruzado', T3, '/', '');
comprueba(gm?.gclid === 'Cruzado' && gm?.fbclid === 'IwAR_Uno' && gm?.fbc === o1.fbc, 'un gclid no pisa el fbclid ni el fbc del primer contacto');
comprueba(O.dominioCookie('www.iurexia.com') === '.iurexia.com' && O.dominioCookie('iurexia.com') === '.iurexia.com'
    && O.dominioCookie('localhost') === undefined && O.dominioCookie('jurexia-x.vercel.app') === undefined, 'dominio de la cookie');
comprueba(O.esAltaReciente(new Date(T0 - 5 * 60e3).toISOString(), T0) && !O.esAltaReciente(new Date(T0 - 2 * 3600e3).toISOString(), T0)
    && O.esAltaReciente(new Date(T0 + 60e3).toISOString(), T0) && !O.esAltaReciente(null, T0), 'alta reciente: 5 min sí, 2 h no, reloj atrasado sí, sin fecha no');

// ─── 3. Sin configurar, nada ────────────────────────────────────────────────
console.log('\n3. Sin token o sin píxel no hace nada');
delete process.env.META_CAPI_TOKEN; delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
let llamadas = 0;
const fetchCuenta = async () => { llamadas++; return new Response('{}', { status: 200 }); };
const ev = C.construirEvento({ nombre: 'CompleteRegistration', eventId: 'reg_x', usuario: { email: 'a@b.com' } });
let r = await C.enviarEventosMeta([ev], { fetchImpl: fetchCuenta });
comprueba(r.enviado === false && r.motivo === 'sin_configurar' && llamadas === 0, 'sin variables de entorno: no-op');
r = await C.enviarEventosMeta([ev], { config: { pixelId: '123' }, fetchImpl: fetchCuenta });
comprueba(r.motivo === 'sin_configurar' && llamadas === 0, 'con píxel y sin token: no-op');
r = await C.enviarEventosMeta([ev], { config: { token: 'tok' }, fetchImpl: fetchCuenta });
comprueba(r.motivo === 'sin_configurar' && llamadas === 0, 'con token y sin píxel: no-op');
let consultas = 0;
const adminCuenta = { from: () => { consultas++; throw new Error('no debería consultar'); } };
r = await C.medirCompraMeta({ admin: adminCuenta, sesion: { id: 'cs_1', amount_total: 14900, currency: 'mxn' }, email: 'a@b.com', fetchImpl: fetchCuenta });
comprueba(r.motivo === 'sin_configurar' && consultas === 0 && llamadas === 0, 'compra sin configurar: ni consulta Supabase ni llama a Meta');

// ─── 4. El payload ──────────────────────────────────────────────────────────
console.log('\n4. El payload');
function adminFalso(filas) {
    // Imita la cadena from().select().eq().limit().maybeSingle() de supabase-js.
    return {
        from(tabla) {
            const q = { select: () => q, eq: () => q, limit: () => q, maybeSingle: async () => ({ data: filas[tabla] ?? null, error: null }) };
            return q;
        },
    };
}
const FILAS = {
    user_profiles: { id: '8F1D2C3B-0000-4000-8000-000000000001' },
    altas_origen: { fbc: `fb.1.${T0}.IwAR_Uno`, fbp: 'fb.1.1700000000000.123456789', user_agent: 'Mozilla/5.0 Prueba', consiente_marketing: true },
};
let capturada = null;
const fetchCaptura = async (url, init) => { capturada = { url, init, cuerpo: JSON.parse(init.body) }; return new Response('{"events_received":2}', { status: 200 }); };
const CONFIG = { pixelId: '123456789012345', token: 'TOKEN_FALSO', testEventCode: 'TEST123' };
let fin = silenciar();
r = await C.medirCompraMeta({ admin: adminFalso(FILAS), sesion: { id: 'cs_test_a1', amount_total: 14900, currency: 'mxn' }, email: ' Cliente@Despacho.MX ', plan: 'pro_monthly', config: CONFIG, fetchImpl: fetchCaptura });
let lineas = fin();
comprueba(r.enviado === true && r.status === 200, 'compra enviada', JSON.stringify(r));
comprueba(capturada?.url === 'https://graph.facebook.com/v21.0/123456789012345/events', 'URL de la Graph API v21.0', capturada?.url);
const [compra, alta] = capturada?.cuerpo?.data ?? [];
comprueba(compra?.event_name === 'Purchase' && alta?.event_name === 'Subscribe', 'Purchase y Subscribe');
comprueba(compra?.event_id === 'cs_test_a1' && alta?.event_id === 'cs_test_a1', 'event_id = id de la sesión de Stripe');
comprueba(compra?.action_source === 'website' && compra?.event_source_url === 'https://www.iurexia.com/checkout/success', 'action_source y event_source_url');
comprueba(compra?.user_data?.em?.[0] === sha('cliente@despacho.mx'), 'em = sha256 del correo normalizado');
comprueba(compra?.user_data?.external_id?.[0] === sha('8f1d2c3b-0000-4000-8000-000000000001'), 'external_id = sha256 del id');
comprueba(compra?.user_data?.fbc === FILAS.altas_origen.fbc && compra?.user_data?.fbp === FILAS.altas_origen.fbp, 'fbc y fbp en claro, de altas_origen');
comprueba(compra?.user_data?.client_user_agent === 'Mozilla/5.0 Prueba', 'agente de usuario del alta');
comprueba(compra?.custom_data?.value === 149 && compra?.custom_data?.currency === 'MXN', 'value 149 y currency MXN', JSON.stringify(compra?.custom_data));
comprueba(capturada?.cuerpo?.access_token === 'TOKEN_FALSO' && capturada?.cuerpo?.test_event_code === 'TEST123', 'access_token y test_event_code');
comprueba(Number.isInteger(compra?.event_time) && Math.abs(compra.event_time - Date.now() / 1000) < 5, 'event_time en segundos');
const textoRegistros = lineas.join('\n');
comprueba(!/despacho|cliente@|8f1d2c3b/i.test(textoRegistros) && /Purchase cs_test_a1/.test(textoRegistros) && /HTTP 200/.test(textoRegistros),
    'los registros no llevan correo ni id; sí evento, event_id y HTTP', textoRegistros);

capturada = null;
r = await C.medirCompraMeta({ admin: adminFalso({ ...FILAS, altas_origen: { ...FILAS.altas_origen, consiente_marketing: false } }), sesion: { id: 'cs_2', amount_total: 14900, currency: 'mxn' }, email: 'a@b.com', config: CONFIG, fetchImpl: fetchCaptura });
comprueba(r.enviado === false && capturada === null, 'sin permiso de Marketing: no se manda la compra');
r = await C.medirCompraMeta({ admin: adminFalso({ user_profiles: FILAS.user_profiles }), sesion: { id: 'cs_3', amount_total: 14900, currency: 'mxn' }, email: 'a@b.com', config: CONFIG, fetchImpl: fetchCaptura });
comprueba(r.enviado === false && capturada === null, 'usuario sin fila en altas_origen (anterior al cambio): no se manda');
fin = silenciar();
r = await C.medirCompraMeta({ admin: adminFalso(FILAS), sesion: { id: 'cs_4', amount_total: 0, currency: 'usd' }, email: 'a@b.com', config: CONFIG, fetchImpl: fetchCaptura });
fin();
comprueba(capturada?.cuerpo?.data?.length === 1 && capturada.cuerpo.data[0].event_name === 'Subscribe' && capturada.cuerpo.data[0].custom_data.currency === 'USD',
    'cupón del 100 %: sólo Subscribe, moneda de la sesión en mayúsculas');

const evAlta = C.construirEvento({ nombre: 'CompleteRegistration', eventId: 'reg_u1', url: 'https://www.iurexia.com/registro',
    usuario: { email: 'X@Y.com', externalId: 'u1', ip: '201.1.2.3', userAgent: 'UA', fbc: 'fb.1.1.a', fbp: null } });
comprueba(evAlta.event_id === 'reg_u1' && evAlta.user_data.client_ip_address === '201.1.2.3' && !('fbp' in evAlta.user_data) && !('custom_data' in evAlta),
    'CompleteRegistration: reg_<id>, IP, sin campos vacíos');

// ─── 5. El webhook no se rompe ──────────────────────────────────────────────
console.log('\n5. El webhook no se rompe ni se retrasa');
fin = silenciar();
r = await C.medirCompraMeta({ admin: adminFalso(FILAS), sesion: { id: 'cs_5', amount_total: 14900 }, email: 'a@b.com', config: CONFIG,
    fetchImpl: async () => { throw new TypeError('fetch failed'); } });
lineas = fin();
comprueba(r.enviado === false && r.motivo === 'error_red', 'fetch que lanza: resuelve sin lanzar', lineas.join(' | '));

let t = Date.now();
fin = silenciar();
r = await C.medirCompraMeta({ admin: adminFalso(FILAS), sesion: { id: 'cs_6', amount_total: 14900 }, email: 'a@b.com', config: CONFIG,
    fetchImpl: (url, init) => new Promise((_, rechazar) => init.signal.addEventListener('abort', () => rechazar(new DOMException('Aborted', 'AbortError')))) });
fin();
let dt = Date.now() - t;
comprueba(r.motivo === 'error_red' && dt >= 2900 && dt < 3600, 'fetch colgado: se corta a los 3 s', `${dt} ms`);

r = await C.medirCompraMeta({ admin: { from: () => { throw new Error('supabase caído'); } }, sesion: { id: 'cs_7', amount_total: 1 }, email: 'a@b.com', config: CONFIG, fetchImpl: fetchCaptura });
comprueba(r.enviado === false, 'Supabase que lanza: resuelve sin lanzar');

t = Date.now();
const q = { select: () => q, eq: () => q, limit: () => q, maybeSingle: () => new Promise(() => {}) };
const adminColgado = { from: () => q };
const conTope = await C.conTope(C.medirCompraMeta({ admin: adminColgado, sesion: { id: 'cs_8', amount_total: 1 }, email: 'a@b.com', config: CONFIG, fetchImpl: fetchCaptura }), 300);
dt = Date.now() - t;
comprueba(conTope === undefined && dt < 600, 'Supabase colgado: conTope suelta a tiempo', `${dt} ms`);
const rechazo = await C.conTope(Promise.reject(new Error('x')), 100);
comprueba(rechazo === undefined, 'conTope tampoco lanza si la promesa falla');

// ─── 6. El alta en el navegador ─────────────────────────────────────────────
console.log('\n6. El alta en el navegador (window de mentira)');
function navegador({ host = 'www.iurexia.com', search = '', cookies = '' } = {}) {
    const mem = (m = new Map()) => ({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m });
    const tarro = new Map(cookies ? cookies.split('; ').map(c => c.split('=')) : []);
    const escritas = [];
    const doc = {
        referrer: 'https://m.facebook.com/',
        get cookie() { return [...tarro].map(([k, v]) => `${k}=${v}`).join('; '); },
        set cookie(v) { escritas.push(v); const [kv] = v.split('; '); const i = kv.indexOf('='); tarro.set(kv.slice(0, i), kv.slice(i + 1)); },
    };
    const win = {
        localStorage: mem(), sessionStorage: mem(),
        location: { search, pathname: '/registro', hostname: host, protocol: 'https:', origin: `https://${host}` },
    };
    globalThis.window = win;
    globalThis.document = doc;
    return { win, doc, escritas };
}
const enviados = [];
globalThis.fetch = async (url, init) => { enviados.push({ url, init, cuerpo: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };

let nav = navegador({ search: '?utm_source=meta&utm_campaign=v77&fbclid=IwAR_Nav' });
O.capturarOrigen();
const guardado = O.leerOrigen();
comprueba(guardado?.utm_campaign === 'v77' && /^fb\.1\.\d{13}\.IwAR_Nav$/.test(guardado?.fbc ?? ''), 'capturarOrigen guarda en localStorage');
O.asegurarCookieFbc();
comprueba(nav.escritas.length === 1 && nav.escritas[0].startsWith(`_fbc=${encodeURIComponent(guardado.fbc)}; Max-Age=7776000; Path=/; SameSite=Lax; Domain=.iurexia.com; Secure`),
    'crea _fbc (90 días, .iurexia.com, Secure)', nav.escritas[0]);
O.asegurarCookieFbc();
comprueba(nav.escritas.length === 1, 'si _fbc ya existe no la reescribe');

const fbqLlamadas = [];
nav.win.fbq = (...a) => fbqLlamadas.push(a);
const sesion = { access_token: 'tok_usuario', user: { id: 'u-123', created_at: new Date().toISOString() } };
await O.medirAlta({ sesion, marketing: true, nueva: true });
comprueba(fbqLlamadas.length === 1 && fbqLlamadas[0][1] === 'CompleteRegistration' && fbqLlamadas[0][3]?.eventID === 'reg_u-123', 'fbq CompleteRegistration con eventID reg_<id>');
comprueba(enviados.length === 1 && enviados[0].url === '/api/medicion/alta' && enviados[0].init.headers.Authorization === 'Bearer tok_usuario', 'POST a /api/medicion/alta con el token');
comprueba(enviados[0].cuerpo.consiente_marketing === true && enviados[0].cuerpo.origen?.utm_campaign === 'v77' && enviados[0].cuerpo.fbc === guardado.fbc && !('user_id' in enviados[0].cuerpo),
    'el cuerpo lleva origen, fbc y permiso, y NO un user_id');
comprueba(enviados[0].cuerpo.url === 'https://www.iurexia.com/registro', 'url sin query');
await O.medirAlta({ sesion, marketing: true, nueva: true });
comprueba(fbqLlamadas.length === 1 && enviados.length === 1, 'segunda vez para el mismo usuario: nada');

nav = navegador();
enviados.length = 0;
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-viejo', created_at: '2025-01-01T00:00:00Z' } }, marketing: true });
comprueba(enviados.length === 0, 'retorno de Google con cuenta vieja: no es alta');
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-nuevo', created_at: new Date(Date.now() - 60e3).toISOString() } }, marketing: true });
comprueba(enviados.length === 1, 'retorno de Google con cuenta de hace 1 min: es alta');
const pend = JSON.parse(nav.win.sessionStorage.getItem('iurexia:meta-pendientes') || '[]');
comprueba(pend.length === 1 && pend[0].eventID === 'reg_u-nuevo', 'sin fbq todavía: el evento queda pendiente');
const tarde = [];
nav.win.fbq = (...a) => tarde.push(a);
O.dispararPendientes();
comprueba(tarde.length === 1 && tarde[0][3]?.eventID === 'reg_u-nuevo' && nav.win.sessionStorage.getItem('iurexia:meta-pendientes') === null, 'en cuanto hay fbq, sale el pendiente');

// Conversión de Google Ads al volver de Google/Apple (sólo si hay gtag, o sea, con analíticas)
nav = navegador();
const gtagLlamadas = [];
nav.win.gtag = (...a) => gtagLlamadas.push(a);
enviados.length = 0;
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-g1', created_at: new Date().toISOString() } }, marketing: false, conversionGoogle: true });
comprueba(gtagLlamadas.length === 2 && gtagLlamadas.every(a => a[0] === 'event' && a[1] === 'conversion' && a[2].send_to.startsWith('AW-18019843576/') && a[2].currency === 'MXN'), 'alta con Google/Apple: dos conversiones de Google Ads', String(gtagLlamadas.length));
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-g1', created_at: new Date().toISOString() } }, marketing: false, conversionGoogle: true });
comprueba(gtagLlamadas.length === 2, 'segunda vez para el mismo usuario: Google no cuenta doble');
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-viejo2', created_at: '2025-01-01T00:00:00Z' } }, marketing: false, conversionGoogle: true });
comprueba(gtagLlamadas.length === 2, 'cuenta vieja que vuelve: no es alta, no convierte');
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-g2', created_at: new Date().toISOString() } }, marketing: false, nueva: true });
comprueba(gtagLlamadas.length === 2, 'registro por correo (sin conversionGoogle): no duplica la conversión que ya dispara /registro');
nav = navegador();
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-g3', created_at: new Date().toISOString() } }, marketing: false, conversionGoogle: true });
comprueba(true, 'sin gtag (sin permiso de analíticas): no lanza');

nav = navegador({ search: '?fbclid=IwAR_SinPermiso' });
O.capturarOrigen();
enviados.length = 0;
const sinPermiso = [];
nav.win.fbq = (...a) => sinPermiso.push(a);
await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-np', created_at: new Date().toISOString() } }, marketing: false, nueva: true });
comprueba(sinPermiso.length === 0 && nav.escritas.length === 0, 'sin permiso de Marketing: ni fbq ni cookie _fbc');
comprueba(enviados.length === 1 && enviados[0].cuerpo.consiente_marketing === false && enviados[0].cuerpo.fbc === undefined, 'sin permiso: el servidor recibe consiente_marketing=false y sin fbc');

globalThis.fetch = async () => { throw new TypeError('sin red'); };
nav = navegador();
let lanzo = false;
try { await O.medirAlta({ sesion: { access_token: 't', user: { id: 'u-red', created_at: new Date().toISOString() } }, marketing: true, nueva: true }); } catch { lanzo = true; }
comprueba(!lanzo, 'sin red: medirAlta no lanza');

console.log(`\n${fallos ? `${fallos} FALLA(S)` : 'todo bien'}`);
process.exit(fallos ? 1 : 0);
