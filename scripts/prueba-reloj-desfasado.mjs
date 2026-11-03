// EL RELOJ DEL EQUIPO DESFASADO (2-nov-2026): auth-js 2.94 real contra un GoTrue simulado cuyo
// reloj es el de verdad, mientras el del «equipo» (Date.now) va adelantado o atrasado.
//
// Uso (desde la raíz del front):
//   node --experimental-strip-types scripts/prueba-reloj-desfasado.mjs [candado-sesion-anterior.ts]
// Con el segundo argumento corre también los escenarios con ese módulo («antes»), p. ej. el de
// producción sacado con `git show origin/main:src/lib/candado-sesion.ts > /tmp/antes.ts`.
// Repetirla al actualizar @supabase/supabase-js: depende de cómo auth-js decide que la sesión venció.
import './resolver-ts.mjs';
import { createRequire } from 'node:module';

const WT = process.cwd();
const ANTES = process.argv[2] || null;
const require = createRequire(WT + '/package.json');
const { GoTrueClient } = require('@supabase/auth-js');

// ── relojes: el del servidor es el de verdad; el del equipo, desfasado ──
const ahoraReal = Date.now.bind(Date);
let desfaseEquipo = 0;
Date.now = () => ahoraReal() + desfaseEquipo;
const H = 3_600_000, MIN = 60_000;

// ── navigator.locks mínimo y almacén común (como en prueba-candado-pestanas.mjs) ──
class Locks {
  constructor() { this.st = new Map(); }
  s(n) { if (!this.st.has(n)) this.st.set(n, { holder: null, q: [] }); return this.st.get(n); }
  request(name, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    const s = this.s(name);
    return new Promise((resolve, reject) => {
      const w = { cb, resolve, reject };
      const grant = () => {
        s.holder = w;
        Promise.resolve().then(() => cb({ name })).then(resolve, reject).finally(() => {
          if (s.holder === w) { s.holder = null; const nx = s.q.shift(); if (nx) nx.go(); }
        });
      };
      w.go = grant;
      if (opts.signal?.aborted) return reject(new DOMException('aborted', 'AbortError'));
      if (opts.ifAvailable && (s.holder || s.q.length)) return Promise.resolve().then(() => cb(null)).then(resolve, reject);
      if (!s.holder && !s.q.length) return grant();
      s.q.push(w);
      opts.signal?.addEventListener('abort', () => {
        const i = s.q.indexOf(w); if (i >= 0) { s.q.splice(i, 1); reject(new DOMException('aborted', 'AbortError')); }
      });
    });
  }
}
const mapa = new Map();
globalThis.localStorage = {
  getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
  setItem: (k, v) => mapa.set(k, String(v)),
  removeItem: (k) => mapa.delete(k),
};
const storage = globalThis.localStorage;

// ── GoTrue simulado, con un límite de renovaciones por ventana (el de Supabase contesta 429) ──
const URL_ = 'https://x.supabase.co/auth/v1';
const LIMITE = { renovaciones: 30, ms: 10_000 };
let srv;
function nuevoServidor() { srv = { seq: 0, tokens: new Set(), renovaciones: 0, r429: 0, ventana: [], latencia: 20, duracion: 3600 }; }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function emitir() {
  const ahora = Math.floor(ahoraReal() / 1000);
  const rt = 'rt' + (++srv.seq);
  srv.tokens.add(rt);
  return {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', iat: ahora, exp: ahora + srv.duracion })}.firma`,
    refresh_token: rt, token_type: 'bearer', expires_in: srv.duracion, expires_at: ahora + srv.duracion,
    user: { id: 'u1', aud: 'authenticated', email: 'p@x' },
  };
}
const json = (st, o) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  await espera(srv.latencia);
  if (url.startsWith('/api/version')) return json(200, { version: '', hora: ahoraReal() });
  if (url.includes('/token?grant_type=password')) return json(200, emitir());
  if (url.includes('/token?grant_type=refresh_token')) {
    const t = ahoraReal();
    srv.ventana = srv.ventana.filter((x) => t - x < LIMITE.ms);
    if (srv.ventana.length >= LIMITE.renovaciones) {
      srv.r429++;
      return json(429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' });
    }
    srv.ventana.push(t);
    srv.renovaciones++;
    const { refresh_token: rt } = JSON.parse(init.body);
    if (!srv.tokens.delete(rt)) return json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    return json(200, emitir());
  }
  return json(404, {});
};

// Lo que se escribe en la consola con [reloj] (sigue saliendo en pantalla).
const lineasReloj = [];
const warnOriginal = console.warn.bind(console);
console.warn = (...a) => { if (String(a[0]).includes('[reloj]')) lineasReloj.push(String(a[0])); warnOriginal(...a); };

const CLAVE = 'iurexia-auth';
const MODULO_AHORA = `${WT}/src/lib/candado-sesion.ts`;

async function pestana(modulo) {
  const q = `tab=${Math.random().toString(36).slice(2)}`;
  const m = await import(`file://${modulo}?${q}`);
  const c = new GoTrueClient({
    url: URL_, headers: {}, storageKey: CLAVE, storage, autoRefreshToken: false, persistSession: true,
    detectSessionInUrl: false, lock: m.candadoDeSesion, fetch: m.fetchDeSesion(CLAVE),
  });
  return { c, m, reloj: modulo === MODULO_AHORA ? await import(`file://${WT}/src/lib/reloj.ts?${q}`) : null };
}

// Como AuthProvider: con cada evento con sesión carga perfil y bloqueo en paralelo, y cada consulta
// a la base pide la sesión (supabase-js → getSession) para su token.
function comoAuthProvider(c, estado) {
  c.onAuthStateChange((evento, sesion) => {
    estado.eventos.push(evento);
    if (!estado.vivo || evento === 'SIGNED_OUT' || !sesion) return;
    Promise.resolve().then(() => Promise.all([c.getSession(), c.getSession()])).catch(() => {});
  });
}

function guardada() {
  const g = JSON.parse(storage.getItem(CLAVE) || 'null');
  if (!g) return { sesion_guardada: false };
  const exp = JSON.parse(Buffer.from(g.access_token.split('.')[1], 'base64url')).exp;
  return {
    sesion_guardada: true,
    cree_que_quedan_s: Math.round(g.expires_at - Date.now() / 1000),
    quedan_de_verdad_s: Math.round(exp - ahoraReal() / 1000),
    vencimiento_tocado: g.expires_at !== exp,
  };
}

const resultados = [];
const fallas = [];
function comprobar(nombre, ok, detalle = '') {
  console.log(`${ok ? '✓' : '✗'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallas.push(nombre);
}

/** Entra con contraseña con el reloj desfasado y deja correr la página `ms`. */
async function entrarYUsar(modulo, desfase, ms = 1500) {
  nuevoServidor(); mapa.clear();
  Object.defineProperty(globalThis.navigator, 'locks', { value: new Locks(), configurable: true });
  desfaseEquipo = desfase;
  const t = await pestana(modulo);
  await t.c.initialize();
  const estado = { vivo: true, eventos: [] };
  comoAuthProvider(t.c, estado);
  const entrada = await t.c.signInWithPassword({ email: 'p@x', password: 'buena' });
  await Promise.all([t.c.getSession(), t.c.getSession(), t.c.getSession()]);   // chat, cuota, carpetas
  await espera(ms);
  estado.vivo = false;
  await espera(200);
  return {
    t, estado,
    fila: {
      entro: !entrada.error,
      renovaciones: srv.renovaciones,
      rechazos_429: srv.r429,
      cerro_sesion: estado.eventos.includes('SIGNED_OUT'),
      ...guardada(),
    },
  };
}

// ── P: las cuentas, sin red ──
{
  const r = await import(`file://${WT}/src/lib/reloj.ts?tab=puras`);
  comprobar('P1 sin desfase, con 200 ms de red', r.calcularDesfase(1_000, 1_200, 1_100) === 0);
  comprobar('P2 nueve horas adelantado', r.calcularDesfase(9 * H + 1_000, 9 * H + 1_200, 1_100) === 9 * H);
  comprobar('P3 desde la sesión emitida', r.desfaseDeEmision(9 * H + 5_000, 9 * H + 5_000, 3_605, 3_600) === 9 * H);
  const casos = [[null, false], [0, false], [4 * MIN + 59_000, false], [5 * MIN, false], [5 * MIN + 1_000, true],
    [-6 * MIN, true], [9 * H, true], [-9 * H, true], [NaN, false]];
  for (const [d, esperado] of casos) comprobar(`P4 hayQueAvisar(${d === null ? 'null' : Math.round(d / 1000) + ' s'})`, r.hayQueAvisar(d) === esperado);
  comprobar('P5 descartado para este desfase: no se pinta', r.avisoVisible(9 * H, 9 * H + 30_000) === false);
  comprobar('P6 descartado, pero el reloj se movió otra hora: se pinta', r.avisoVisible(10 * H, 9 * H) === true);
  comprobar('P7 descartado y ya corregido: no se pinta', r.avisoVisible(2_000, 9 * H) === false);
  comprobar('P8 describir', [r.describirDesfase(9 * H), r.describirDesfase(-7 * MIN), r.describirDesfase(H + 5 * MIN), r.describirDesfase(-72 * H)].join(' | ')
    === '9 h adelantado | 7 min atrasado | 1 h 5 min adelantado | 3 días atrasado',
    [r.describirDesfase(9 * H), r.describirDesfase(-7 * MIN), r.describirDesfase(H + 5 * MIN), r.describirDesfase(-72 * H)].join(' | '));
  nuevoServidor();
  desfaseEquipo = 9 * H;
  let oido = null; const quitar = r.alMedirDesfase((m) => { oido = m.desfase; });
  const d = await r.medirDesfase();
  comprobar('P9 medirDesfase con /api/version (hora)', Math.abs(d - 9 * H) < 1_000 && Math.abs(oido - d) < 1, `${Math.round(d / 1000)} s`);
  const conFecha = async () => new Response('{}', { status: 200, headers: { date: new Date(ahoraReal()).toUTCString() } });
  const d2 = await r.medirDesfase(conFecha);
  comprobar('P10 medirDesfase con la cabecera Date', Math.abs(d2 - 9 * H) < 2_000, `${Math.round(d2 / 1000)} s`);
  comprobar('P11 la consola lo dice con [reloj]', lineasReloj.some((l) => l.includes('9 h adelantado')));
  desfaseEquipo = 0;
  comprobar('P12 si el reloj se mueve, la medición deja de valer', r.relojMovido() && r.desfaseConocido() === null);
  quitar();
}

// ── R: la sesión con el reloj desfasado ──
const modulos = ANTES ? [['antes', ANTES], ['ahora', MODULO_AHORA]] : [['ahora', MODULO_AHORA]];
const porEscenario = {};
for (const [modo, modulo] of modulos) {
  for (const [nombre, desfase] of [['R1 equipo 9 h adelantado', 9 * H], ['R2 equipo 1 h adelantado', H],
    ['R3 equipo 9 h atrasado', -9 * H], ['R6 reloj bien (3 s)', 3_000]]) {
    const { fila } = await entrarYUsar(modulo, desfase);
    resultados.push({ escenario: nombre, modo, ...fila });
    (porEscenario[nombre] ??= {})[modo] = fila;
  }
}
for (const nombre of ['R1 equipo 9 h adelantado', 'R2 equipo 1 h adelantado']) {
  const { antes, ahora } = porEscenario[nombre];
  if (antes) comprobar(`${nombre}: antes se reproduce el ciclo`, antes.renovaciones > 10 || antes.cerro_sesion,
    `${antes.renovaciones} renovaciones, ${antes.rechazos_429} con 429, sesión ${antes.sesion_guardada ? 'viva' : 'borrada'}`);
  comprobar(`${nombre}: ahora ninguna renovación y la sesión sigue`, ahora.renovaciones === 0 && ahora.sesion_guardada && !ahora.cerro_sesion);
  comprobar(`${nombre}: ahora supabase-js la ve con ~1 h`, Math.abs(ahora.cree_que_quedan_s - ahora.quedan_de_verdad_s) < 5,
    `cree ${ahora.cree_que_quedan_s} s, de verdad ${ahora.quedan_de_verdad_s} s`);
}
{
  const { antes, ahora } = porEscenario['R3 equipo 9 h atrasado'];
  if (antes) comprobar('R3 antes: supabase-js la creía vigente 10 h (el servidor la rechaza a la hora)', antes.cree_que_quedan_s > 30_000);
  comprobar('R3 ahora: la renueva a tiempo', Math.abs(ahora.cree_que_quedan_s - ahora.quedan_de_verdad_s) < 5,
    `cree ${ahora.cree_que_quedan_s} s, de verdad ${ahora.quedan_de_verdad_s} s`);
}
{
  const { ahora } = porEscenario['R6 reloj bien (3 s)'];
  comprobar('R6 con el reloj bien no se toca la sesión', ahora.renovaciones === 0 && !ahora.vencimiento_tocado);
}

// R4: entra con el reloj 9 h adelantado y luego lo corrige.
{
  const { t } = await entrarYUsar(MODULO_AHORA, 9 * H, 300);
  desfaseEquipo = 0;
  const peligro = guardada();
  const movido = t.reloj.relojMovido();
  const d = await t.reloj.medirDesfase();
  const renovo = await t.m.ponerSesionEnHora(t.c, CLAVE, d);
  const despues = guardada();
  resultados.push({ escenario: 'R4 corrige el reloj', modo: 'ahora', renovaciones: srv.renovaciones, ...despues });
  comprobar('R4 al corregir el reloj, la sesión guardada quedaba 9 h larga', peligro.cree_que_quedan_s > 30_000 && movido);
  comprobar('R4 se renueva una vez y queda en la hora nueva', renovo && srv.renovaciones === 1
    && Math.abs(despues.cree_que_quedan_s - despues.quedan_de_verdad_s) < 5,
    `cree ${despues.cree_que_quedan_s} s, de verdad ${despues.quedan_de_verdad_s} s`);
  const otra = await t.m.ponerSesionEnHora(t.c, CLAVE, await t.reloj.medirDesfase());
  comprobar('R4 medir otra vez ya no renueva', !otra && srv.renovaciones === 1);
}

// R8: un desfase justo en el umbral de un minuto no hace renovar en cada carga de página.
{
  const { t } = await entrarYUsar(MODULO_AHORA, 59_000, 100);
  desfaseEquipo = 61_000;
  const renovo = await t.m.ponerSesionEnHora(t.c, CLAVE, await t.reloj.medirDesfase());
  resultados.push({ escenario: 'R8 desfase en el umbral (59 → 61 s)', modo: 'ahora', renovaciones: srv.renovaciones, ...guardada() });
  comprobar('R8 en el umbral no se renueva', !renovo && srv.renovaciones === 0);
}

// R5: el freno. Algo pide renovar diez veces seguidas con el reloj bien.
{
  const { t, estado } = await entrarYUsar(MODULO_AHORA, 0, 100);
  for (let i = 0; i < 10; i++) await t.c.refreshSession();
  const { data } = await t.c.getSession();
  resultados.push({ escenario: 'R5 diez renovaciones seguidas', modo: 'ahora', renovaciones: srv.renovaciones, cerro_sesion: estado.eventos.includes('SIGNED_OUT'), ...guardada() });
  comprobar('R5 sólo 4 llegan al servidor y la sesión sigue', srv.renovaciones === 4 && !!data.session && !estado.eventos.includes('SIGNED_OUT'),
    `${srv.renovaciones} renovaciones`);
}

// R7: el freno con un ciclo que no es del reloj: tokens de 60 s (menos que el margen de 90 s de
// supabase-js, así que toda sesión le parece vencida). Va al final: sus reintentos siguen 30 s.
{
  nuevoServidor(); mapa.clear();
  Object.defineProperty(globalThis.navigator, 'locks', { value: new Locks(), configurable: true });
  desfaseEquipo = 0;
  srv.duracion = 60;
  const t = await pestana(MODULO_AHORA);
  await t.c.initialize();
  const estado = { vivo: true, eventos: [] };
  comoAuthProvider(t.c, estado);
  await t.c.signInWithPassword({ email: 'p@x', password: 'buena' });
  t.c.getSession();
  await espera(2_000);
  resultados.push({ escenario: 'R7 tokens de 60 s', modo: 'ahora', renovaciones: srv.renovaciones, rechazos_429: srv.r429, cerro_sesion: estado.eventos.includes('SIGNED_OUT'), ...guardada() });
  comprobar('R7 el freno lo para en 4 sin borrar la sesión', srv.renovaciones === 4 && srv.r429 === 0
    && !estado.eventos.includes('SIGNED_OUT') && !!storage.getItem(CLAVE), `${srv.renovaciones} renovaciones`);
}

console.table(resultados);
console.log(fallas.length ? `\n${fallas.length} FALLA(S): ${fallas.join(' · ')}` : '\nTodo en orden.');
process.exit(fallas.length ? 1 : 0);
