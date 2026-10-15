// Dos «pestañas» = dos GoTrueClient (auth-js 2.94 real) con almacén y navigator.locks comunes,
// contra un GoTrue simulado que rota el refresh token y revoca la familia si se reutiliza
// fuera de su ventana. Compara: «antes» (navigator.locks común + toma), «processLock» (candado
// por pestaña sin coordinar la renovación) y «ahora» (candado por pestaña + fetchDeSesion).
import { createRequire } from 'node:module';
// Uso (desde la raíz del front):  node --experimental-strip-types scripts/prueba-candado-pestanas.mjs
// Repetirla al actualizar @supabase/supabase-js: depende de cómo auth-js usa `lock` y `fetch`.
const WT = process.argv[2] || process.cwd();
const require = createRequire(WT + '/package.json');
const { GoTrueClient, navigatorLock, processLock } = require('@supabase/auth-js');

// ── navigator.locks mínimo (exclusivo, ifAvailable, signal, steal) ──
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
      if (opts.steal) {
        if (s.holder) s.holder.reject(new DOMException('stolen', 'AbortError'));
        return grant();
      }
      if (opts.ifAvailable && (s.holder || s.q.length)) {
        return Promise.resolve().then(() => cb(null)).then(resolve, reject);
      }
      if (!s.holder && !s.q.length) return grant();
      s.q.push(w);
      opts.signal?.addEventListener('abort', () => {
        const i = s.q.indexOf(w); if (i >= 0) { s.q.splice(i, 1); reject(new DOMException('aborted', 'AbortError')); }
      });
    });
  }
}
Object.defineProperty(globalThis.navigator, 'locks', { value: new Locks(), configurable: true });

// ── almacén común (localStorage) ──
const mapa = new Map();
globalThis.localStorage = {
  getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
  setItem: (k, v) => mapa.set(k, String(v)),
  removeItem: (k) => mapa.delete(k),
};
const storage = globalThis.localStorage;

// ── GoTrue simulado ──
const URL_ = 'https://x.supabase.co/auth/v1';
let srv;
function nuevoServidor(reuseMs) {
  srv = { tokens: new Map(), familiaRevocada: false, refrescosRed: 0, reusos: 0, robos: 0, fallarProxima: new Set(), reuseMs, seq: 0, latencia: 30 };
}
function emitir(padre) {
  const rt = 'rt' + (++srv.seq);
  srv.tokens.set(rt, { revocadoEn: null, hijo: null });
  if (padre) srv.tokens.get(padre).hijo = rt;
  const ahora = Math.floor(Date.now() / 1000);
  return { access_token: 'at-' + rt, refresh_token: rt, token_type: 'bearer', expires_in: 3600, expires_at: ahora + 3600, user: { id: 'u1', aud: 'authenticated', email: 'p@x' } };
}
function activo(rt) { let t = rt; while (srv.tokens.get(t)?.hijo) t = srv.tokens.get(t).hijo; return t; }
const json = (st, o) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const tab = new Headers(init.headers).get('x-tab');
  await new Promise((r) => setTimeout(r, srv.latencia));
  if (srv.fallarProxima.has(tab)) { srv.fallarProxima.delete(tab); throw new TypeError('Failed to fetch'); }
  if (String(url).includes('/token?grant_type=refresh_token')) {
    srv.refrescosRed++;
    const { refresh_token: rt } = JSON.parse(init.body);
    const t = srv.tokens.get(rt);
    if (!t || srv.familiaRevocada) return json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    if (t.revocadoEn !== null) {
      if (Date.now() - t.revocadoEn <= srv.reuseMs) { srv.reusos++; const a = activo(rt); srv.tokens.get(a).revocadoEn = null; return json(200, { ...emitir(null), refresh_token: a }); }
      srv.robos++; srv.familiaRevocada = true;
      return json(400, { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' });
    }
    t.revocadoEn = Date.now();
    return json(200, emitir(rt));
  }
  return json(404, {});
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const CLAVE = 'iurexia-auth';

async function candadoAntes(nombre, to, fn) {
  if (to <= 0) return navigatorLock(nombre, to, fn);
  let empezo = false;
  try { return await navigatorLock(nombre, to, async () => { empezo = true; return await fn(); }); }
  catch (e) { if (empezo) throw e; return await navigator.locks.request(nombre, { mode: 'exclusive', steal: true }, async () => await fn()); }
}

async function pestana(modo, id) {
  const base = { url: URL_, headers: { 'x-tab': id }, storageKey: CLAVE, storage, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false };
  if (modo === 'antes') return new GoTrueClient({ ...base, lock: candadoAntes });
  if (modo === 'processLock') {
    // processLock usa un registro de módulo: «por pestaña» se simula con un nombre distinto.
    return new GoTrueClient({ ...base, lock: (n, t, f) => processLock(n + ':' + id, t, f) });
  }
  const m = await import(`file://${WT}/src/lib/candado-sesion.ts?tab=${id}-${Math.random()}`);
  return new GoTrueClient({ ...base, lock: m.candadoDeSesion, fetch: m.fetchDeSesion(CLAVE) });
}

function sembrar(venceEnS) {
  const s = emitir(null);
  s.expires_at = Math.floor(Date.now() / 1000) + venceEnS;
  storage.setItem(CLAVE, JSON.stringify(s));
  return s;
}

const resultados = [];
async function escenario(nombre, modo, fn) {
  nuevoServidor(150);
  mapa.clear();
  Object.defineProperty(globalThis.navigator, 'locks', { value: new Locks(), configurable: true });
  const r = await fn(modo);
  const guardada = JSON.parse(storage.getItem(CLAVE) || 'null');
  resultados.push({ escenario: nombre, modo, refrescos_red: srv.refrescosRed, reusos_en_ventana: srv.reusos, token_reutilizado_fuera: srv.robos, sesion_revocada: srv.familiaRevocada, sesion_guardada: !!guardada, ...r });
}

// S1: dos pestañas piden la sesión a la vez con el token a 30 s de vencer.
const s1 = async (modo) => {
  sembrar(30);
  const A = await pestana(modo, 'A'), B = await pestana(modo, 'B');
  await Promise.all([A.initialize(), B.initialize()]);
  const [a, b] = await Promise.all([A.getSession(), B.getSession()]);
  return { mismo_token: a.data.session?.access_token === b.data.session?.access_token, errores: [a.error, b.error].filter(Boolean).map((e) => e.code || e.message).join(',') };
};
// S2: la pestaña B intenta renovar, su red falla, duerme; A renueva; B reintenta tarde con el token viejo.
const s2 = async (modo) => {
  sembrar(30);
  const A = await pestana(modo, 'A'), B = await pestana(modo, 'B');
  await B.initialize();               // B arranca primero y renueva
  srv.fallarProxima.add('B');
  sembrar(30);                        // vuelve a dejar un token por vencer (el de B ya renovado no importa)
  const pb = B.getSession();          // B: 1.er intento falla → espera 200 ms → reintenta con el mismo token
  await espera(60);
  await A.initialize();
  const pa = A.getSession();          // A renueva en medio
  const [a, b] = await Promise.all([pa, pb]);
  return { a_ok: !!a.data.session, b_ok: !!b.data.session, errores: [a.error, b.error].filter(Boolean).map((e) => e.code || e.message).join(',') };
};
// S3: una pestaña «congelada» retiene el candado común; ¿cuánto espera la pestaña que se abre?
const s3 = async (modo) => {
  sembrar(3000);
  navigator.locks.request('lock:' + CLAVE, () => new Promise(() => {})).catch(() => {});   // nunca lo suelta
  const A = await pestana(modo, 'A');
  const t0 = Date.now();
  await A.initialize();
  const a = await A.getSession();
  return { ms_hasta_sesion: Date.now() - t0, a_ok: !!a.data.session };
};


// S4: una pestaña congelada A MEDIA RENOVACIÓN retiene el candado de renovación (sólo «ahora» lo usa).
const s4 = async (modo) => {
  sembrar(30);
  navigator.locks.request('lock:' + CLAVE + ':renovacion', () => new Promise(() => {})).catch(() => {});
  const A = await pestana(modo, 'A');
  const t0 = Date.now();
  await A.initialize();
  const a = await A.getSession();
  return { ms_hasta_sesion: Date.now() - t0, a_ok: !!a.data.session };
};
// S6: cuatro pestañas, token por vencer, todas piden la sesión a la vez.
const s6 = async (modo) => {
  sembrar(30);
  const ts = await Promise.all(['A', 'B', 'C', 'D'].map((id) => pestana(modo, id)));
  await Promise.all(ts.map((t) => t.initialize()));
  const rs = await Promise.all(ts.map((t) => t.getSession()));
  const tokens = new Set(rs.map((r) => r.data.session?.access_token));
  return { mismo_token: tokens.size === 1, errores: rs.map((r) => r.error).filter(Boolean).map((e) => e.code || e.message).join(',') };
};
// S7: como S2, pero lo que A guardó también está por vencer: B debe gastar el token NUEVO, no el suyo.
const s7 = async (modo) => {
  sembrar(30);
  const A = await pestana(modo, 'A'), B = await pestana(modo, 'B');
  await B.initialize();
  srv.fallarProxima.add('B');
  sembrar(30);
  const pb = B.getSession();
  await espera(60);
  await A.initialize();
  const a = await A.getSession();
  const g = JSON.parse(storage.getItem(CLAVE)); g.expires_at = Math.floor(Date.now() / 1000) + 30; storage.setItem(CLAVE, JSON.stringify(g));
  storage.removeItem(CLAVE + ':renovacion');
  const b = await pb;
  return { a_ok: !!a.data.session, b_ok: !!b.data.session, errores: [a.error, b.error].filter(Boolean).map((e) => e.code || e.message).join(',') };
};

// S4b: la congelada GASTÓ el token en el servidor y no alcanzó a guardar (ventana real de 10 s).
const s4b = async (modo) => {
  srv.reuseMs = 10_000;
  const sem = sembrar(30);
  navigator.locks.request('lock:' + CLAVE + ':renovacion', async () => {
    await globalThis.fetch(URL_ + '/token?grant_type=refresh_token', { method: 'POST', headers: { 'x-tab': 'Z' }, body: JSON.stringify({ refresh_token: sem.refresh_token }) });
    await new Promise(() => {});   // se congela con el candado, sin guardar
  }).catch(() => {});
  await espera(100);
  const A = await pestana(modo, 'A');
  const t0 = Date.now();
  await A.initialize();
  const a = await A.getSession();
  return { ms_hasta_sesion: Date.now() - t0, a_ok: !!a.data.session, errores: a.error ? (a.error.code || a.error.message) : '' };
};

for (const modo of ['antes', 'processLock', 'ahora']) {
  await escenario('S1 renovación simultánea', modo, s1);
  await escenario('S2 reintento tardío', modo, s2);
  await escenario('S3 pestaña congelada', modo, s3);
  if (modo === 'ahora') await escenario('S4 renovación congelada', modo, s4);
  if (modo === 'ahora') await escenario('S4b congelada tras gastar', modo, s4b);
  await escenario('S6 cuatro pestañas', modo, s6);
  await escenario('S7 guardado nuevo por vencer', modo, s7);
}

// S5: el candado por pestaña en sí.
{
  const m = await import(`file://${WT}/src/lib/candado-sesion.ts?tab=s5`);
  const orden = [];
  let liberar; const ocupado = new Promise((r) => (liberar = r));
  const p1 = m.candadoDeSesion('x', 10000, async () => { orden.push(1); await ocupado; orden.push('1fin'); });
  const p2 = m.candadoDeSesion('x', 10000, async () => { orden.push(2); });
  let tic = null; try { await m.candadoDeSesion('x', 0, async () => {}); } catch (e) { tic = e.isAcquireTimeout === true; }
  liberar(); await Promise.all([p1, p2]);
  let colgado = Date.now();
  const p3 = m.candadoDeSesion('y', 50, () => new Promise(() => {}));
  await m.candadoDeSesion('y', 50, async () => {}); colgado = Date.now() - colgado;
  let libre = true; try { await m.candadoDeSesion('x', 0, async () => {}); } catch { libre = false; }
  resultados.push({ escenario: 'S5 candado por pestaña', modo: 'ahora', orden: orden.join('>'), tic_ocupado_falla: tic, sigue_tras_colgado_ms: colgado, tic_libre_pasa: libre });
}
console.table(resultados);
process.exit(0);
