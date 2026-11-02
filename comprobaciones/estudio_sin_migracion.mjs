// ESTUDIO ANTES DE LA MIGRACIÓN: QUE NADIE PAGUE SIN PLAN (2-nov-2026).
//
// La revisión del front (precios-nov2/estudio-hoy/revision-front.md, §1 y §2)
// encontró que, si el front sale antes que `sql/supabase_estudio.sql`, la
// base rechaza `platinum_estudio` y:
//   · el webhook responde 200 aunque no escribió el plan, Stripe no reintenta
//     y el cliente pagó 1,499 sin plan; si venía de Platinum, la suscripción
//     vieja no se cancela (va después) y le quedan las dos;
//   · el panel de administración, con el cambio de plan rechazado, escribía
//     igual 3,100 consultas en el plan anterior y respondía {ok:true}.
//
// Esto corre las RUTAS DE VERDAD (checkout, webhook y panel) con Stripe,
// Supabase, Resend y next/server de mentira, sin red:
//   · checkout: con la base sin migrar no se abre el cobro de Estudio (503 y
//     el mensaje de la tarjeta); con la base al día, sí; los demás planes ni
//     preguntan. Quien paga Ultra no pasa solo a Estudio (§5): va a soporte;
//   · webhook: la escritura de Estudio que falla responde 500 y no marca el
//     evento; el reintento, con la base al día, escribe el plan y cancela la
//     Platinum vieja con prorrateo. Un plan de siempre que falla sigue en 200;
//   · panel: un cambio de plan rechazado no escribe el cupo ni dice «ok».
//
//   node --test comprobaciones/estudio_sin_migracion.mjs
//
// Los .ts se transpilan con el TypeScript del repositorio, como en
// plan_estudio.mjs; los paquetes de red se sustituyen en el cargador.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { register } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(RAIZ, 'src');

// ── Los paquetes de red, de mentira. Leen lo que la prueba deja en globalThis ──
const FALSOS_DIR = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-falsos-')));
process.on('exit', () => fs.rmSync(FALSOS_DIR, { recursive: true, force: true }));
const FALSOS = {
    'stripe': `export default class Stripe { constructor() { return globalThis.__falsos.stripe; } }`,
    // Como el de verdad: sin URL o sin llave, lanza al crear el cliente.
    '@supabase/supabase-js': `export function createClient(url, llave) {
    if (!url) throw new Error('supabaseUrl is required.');
    if (!llave) throw new Error('supabaseKey is required.');
    return globalThis.__falsos.supabase;
}`,
    'resend': `export class Resend { constructor() { this.emails = { send: async (m) => { globalThis.__falsos.correos.push(m); return { data: { id: 'correo_prueba' }, error: null }; } }; } }`,
    'next/server': `export class NextRequest {}
export const NextResponse = { json: (body, init) => ({ status: (init && init.status) || 200, body }) };`,
};
const URL_FALSO = {};
for (const [paquete, fuente] of Object.entries(FALSOS)) {
    const f = path.join(FALSOS_DIR, paquete.replace(/[@/]/g, '_') + '.mjs');
    fs.writeFileSync(f, fuente);
    URL_FALSO[paquete] = pathToFileURL(f).href;
}

const GANCHOS = `
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
let ts, SRC, FALSO;
export async function initialize(d) { SRC = d.src; FALSO = d.falso; ts = (await import(d.ts)).default; }
const EXT = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function hallar(base) {
    for (const e of EXT) { const f = base + e; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
    return null;
}
export async function resolve(esp, ctx, next) {
    if (FALSO[esp]) return { url: FALSO[esp], shortCircuit: true };
    if (esp.startsWith('@/')) {
        const f = hallar(path.join(SRC, esp.slice(2)));
        if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
    }
    const padre = ctx.parentURL && ctx.parentURL.startsWith('file:') ? fileURLToPath(ctx.parentURL) : '';
    if ((esp.startsWith('./') || esp.startsWith('../')) && padre.startsWith(SRC)) {
        const f = hallar(path.resolve(path.dirname(padre), esp));
        if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
    }
    return next(esp, ctx);
}
export async function load(url, ctx, next) {
    if (url.startsWith('file:') && /\\.tsx?$/.test(url) && fileURLToPath(url).startsWith(SRC)) {
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
        src: SRC,
        falso: URL_FALSO,
        ts: pathToFileURL(path.join(RAIZ, 'node_modules/typescript/lib/typescript.js')).href,
    },
});

// ── Sin red y sin llaves de verdad ──────────────────────────────────────────
for (const k of Object.keys(process.env)) {
    if (/STRIPE|SUPABASE|RESEND|META_|FROM_EMAIL/.test(k)) delete process.env[k];
}
process.env.STRIPE_SECRET_KEY = 'sk_prueba';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_prueba';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_prueba';
globalThis.fetch = async (u) => { throw new Error(`sin red en la prueba: ${u}`); };

const PRECIO_ESTUDIO = 'price_1UXIiI3uD85CqvjMrXLzuClJ';
const PRECIO_PLATINUM = 'price_1Sy2l03uD85CqvjMMJ4mFqhw';
const PRECIO_PRO = 'price_1Sy2l63uD85CqvjMku0MM4k3';
const PRECIO_ULTRA = 'price_1T2MzR3uD85CqvjMW6MK8OyG';
const CHECK_RECHAZA = { message: 'new row for relation "user_profiles" violates check constraint "user_profiles_subscription_type_check"', code: '23514' };

// ── El estado de la base y de Stripe de mentira ─────────────────────────────
let E;
function reiniciar() {
    E = {
        ops: [],                 // todo lo que se pidió a Supabase, en orden
        baseMigrada: false,      // ¿ya corrió sql/supabase_estudio.sql?
        rpcFalla: false,
        fallaUpdate: null,       // error para CUALQUIER update de plan (otro motivo)
        usuario: null,           // el de auth.getUser
        suscripciones: {},
        canceladas: [],
        sesiones: [],
        correo: 'cliente@ejemplo.mx',
    };
}
reiniciar();

/** Lo que respondería la base a cada operación. */
function responder(op) {
    if (op.tabla === 'rpc:limite_flujos') {
        if (E.rpcFalla) return { data: null, error: { message: 'fetch failed' } };
        const p = op.datos?.p_plan;
        return { data: p === 'platinum_estudio' ? (E.baseMigrada ? 100 : 60) : 60, error: null };
    }
    if (op.tabla === 'user_profiles' && op.accion === 'update') {
        if (E.fallaUpdate && 'subscription_type' in op.datos) return { data: null, error: E.fallaUpdate };
        if (op.datos.subscription_type === 'platinum_estudio' && !E.baseMigrada) return { data: null, error: CHECK_RECHAZA };
        return { data: [{ email: E.correo, ...op.datos }], error: null };
    }
    return { data: null, error: null };
}

/** Un constructor de consultas encadenable que apunta lo que se le pide. */
function consulta(tabla, accion = 'select', datos = null) {
    const op = { tabla, accion, datos, filtros: [] };
    const cadena = new Proxy({}, {
        get(_, prop) {
            if (typeof prop === 'symbol') return undefined;
            if (prop === 'then') {
                E.ops.push(op);
                const r = responder(op);
                return (ok, ko) => Promise.resolve(r).then(ok, ko);
            }
            return (...args) => {
                if (['insert', 'update', 'upsert', 'delete'].includes(prop)) { op.accion = prop; op.datos = args[0]; }
                else if (prop !== 'select') op.filtros.push([prop, ...args]);
                return cadena;
            };
        },
    });
    return cadena;
}
const generico = () => new Proxy(() => {}, {
    get: (_, p) => (typeof p === 'symbol' ? undefined : generico()),
    apply: () => Promise.resolve({ data: null, error: null }),
});

globalThis.__falsos = {
    correos: [],
    supabase: {
        from: (t) => consulta(t),
        rpc: (fn, args) => consulta(`rpc:${fn}`, 'rpc', args),
        auth: { getUser: async () => ({ data: { user: E.usuario }, error: null }) },
        storage: generico(),
    },
    stripe: {
        webhooks: { constructEvent: (body) => JSON.parse(body) },
        subscriptions: {
            retrieve: async (id) => E.suscripciones[id],
            list: async ({ customer }) => ({ data: Object.values(E.suscripciones).filter((s) => s.customer === customer) }),
            cancel: async (id, opciones) => {
                E.canceladas.push({ id, opciones });
                E.suscripciones[id] = { ...E.suscripciones[id], status: 'canceled' };
                return E.suscripciones[id];
            },
        },
        customers: {
            list: async () => ({ data: [{ id: 'cus_prueba', email: E.correo }] }),
            retrieve: async (id) => ({ id, email: E.correo }),
        },
        checkout: { sessions: {
            create: async (p) => { E.sesiones.push(p); return { id: 'cs_prueba', url: 'https://checkout.stripe.test/cs_prueba' }; },
            listLineItems: async () => ({ data: [] }),
        } },
        billingPortal: { sessions: { create: async () => ({ url: 'https://portal.stripe.test' }) } },
        promotionCodes: { list: async () => ({ data: [] }) },
    },
};

const suscripcion = (id, precio, status = 'active') => ({
    id, status, customer: 'cus_prueba', items: { data: [{ price: { id: precio } }] },
});

/** Corre `f` con la consola apuntada en vez de impresa. */
async function callado(f) {
    const dicho = [];
    const orig = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = (...a) => dicho.push(a.map(String).join(' '));
    try { return { r: await f(), dicho }; } finally { Object.assign(console, orig); }
}

const Estudio = await import(path.join(SRC, 'lib/plan-estudio.ts'));
const Base = await import(path.join(SRC, 'lib/estudio-en-la-base.ts'));
const Checkout = await import(path.join(SRC, 'app/api/stripe/checkout/route.ts'));
const Webhook = await import(path.join(SRC, 'app/api/stripe/webhook/route.ts'));
const Panel = await import(path.join(SRC, 'app/api/admin/panel/route.ts'));

beforeEach(() => { reiniciar(); Base.olvidarConfirmacionEstudio(); });

const pedirCobro = (priceId) => callado(() => Checkout.POST({
    json: async () => ({ priceId, email: E.correo }),
    headers: { get: () => null },
}));
const avisar = (evento) => callado(() => Webhook.POST({
    text: async () => JSON.stringify(evento),
    headers: { get: (k) => (k === 'stripe-signature' ? 'firma_prueba' : null) },
}));
const eventoCheckout = (id, sub) => ({
    id, type: 'checkout.session.completed',
    data: { object: {
        id: 'cs_prueba', customer: 'cus_prueba', subscription: sub, customer_email: E.correo,
        payment_status: 'paid', metadata: { userEmail: E.correo },
    } },
});
const marcados = () => E.ops.filter((o) => o.tabla === 'stripe_events_processed' && o.accion === 'insert').map((o) => o.datos.event_id);
const planesEscritos = () => E.ops
    .filter((o) => o.tabla === 'user_profiles' && o.accion === 'update' && o.datos && 'subscription_type' in o.datos)
    .map((o) => o.datos.subscription_type);

// ── Checkout ────────────────────────────────────────────────────────────────

test('checkout: con la base sin migrar NO se abre el cobro de Estudio', async () => {
    const { r } = await pedirCobro(PRECIO_ESTUDIO);
    assert.equal(r.status, 503);
    assert.equal(r.body.code, 'ESTUDIO_NO_DISPONIBLE');
    assert.equal(r.body.error, Estudio.MENSAJE_ESTUDIO_NO_DISPONIBLE);
    assert.ok(Estudio.AVISOS_DEL_COBRO_ESTUDIO.includes(r.body.error), 'la tarjeta lo enseña tal cual');
    assert.equal(E.sesiones.length, 0, 'no se creó sesión de cobro');
});

test('checkout: si la base no contesta, tampoco se cobra Estudio', async () => {
    E.baseMigrada = true;
    E.rpcFalla = true;
    const { r } = await pedirCobro(PRECIO_ESTUDIO);
    assert.equal(r.status, 503);
    assert.equal(E.sesiones.length, 0);
});

test('checkout: con la base al día, Estudio se cobra normal y el «sí» se recuerda', async () => {
    E.baseMigrada = true;
    const { r } = await pedirCobro(PRECIO_ESTUDIO);
    assert.equal(r.status, 200);
    assert.equal(r.body.url, 'https://checkout.stripe.test/cs_prueba');
    assert.equal(E.sesiones[0].line_items[0].price, PRECIO_ESTUDIO);
    assert.equal(E.sesiones[0].mode, 'subscription');
    // Segunda compra: ya no se pregunta.
    const preguntas = E.ops.filter((o) => o.tabla === 'rpc:limite_flujos').length;
    await pedirCobro(PRECIO_ESTUDIO);
    assert.equal(E.ops.filter((o) => o.tabla === 'rpc:limite_flujos').length, preguntas);
    assert.equal(E.sesiones.length, 2);
});

test('checkout: un «no» no se recuerda; el botón se abre solo al migrar', async () => {
    assert.equal((await pedirCobro(PRECIO_ESTUDIO)).r.status, 503);
    E.baseMigrada = true;
    assert.equal((await pedirCobro(PRECIO_ESTUDIO)).r.status, 200);
});

test('checkout: sin llave de servicio pregunta con la pública; sin ninguna, el mismo aviso (no un 500)', async () => {
    const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        assert.equal((await pedirCobro(PRECIO_ESTUDIO)).r.status, 503, 'sin migrar');
        E.baseMigrada = true;
        assert.equal((await pedirCobro(PRECIO_ESTUDIO)).r.status, 200, 'migrada, con la llave pública');
        Base.olvidarConfirmacionEstudio();
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const { r } = await pedirCobro(PRECIO_ESTUDIO);
        assert.equal(r.status, 503);
        assert.equal(r.body.error, Estudio.MENSAJE_ESTUDIO_NO_DISPONIBLE);
        assert.equal(E.sesiones.length, 1, 'sólo la de la base migrada');
    } finally {
        process.env.SUPABASE_SERVICE_ROLE_KEY = servicio;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = publica;
    }
});

test('checkout: los planes de siempre no preguntan a la base', async () => {
    for (const precio of [PRECIO_PRO, PRECIO_PLATINUM]) {
        reiniciar();
        const { r } = await pedirCobro(precio);
        assert.equal(r.status, 200, precio);
        assert.equal(E.sesiones[0].line_items[0].price, precio);
        assert.equal(E.ops.filter((o) => o.tabla.startsWith('rpc:')).length, 0, `${precio}: sin rpc`);
    }
});

test('checkout: quien paga Ultra no pasa solo a Estudio (perdería el taller); va a soporte', async () => {
    for (const status of ['active', 'past_due']) {
        reiniciar();
        E.baseMigrada = true;
        E.suscripciones.sub_ultra = suscripcion('sub_ultra', PRECIO_ULTRA, status);
        const { r } = await pedirCobro(PRECIO_ESTUDIO);
        assert.equal(r.status, 409, status);
        assert.equal(r.body.code, 'ULTRA_A_ESTUDIO');
        assert.equal(r.body.error, Estudio.MENSAJE_ULTRA_A_ESTUDIO);
        assert.ok(Estudio.AVISOS_DEL_COBRO_ESTUDIO.includes(r.body.error), 'la tarjeta lo enseña tal cual');
        assert.equal(E.sesiones.length, 0);
        assert.deepEqual(E.canceladas, []);
    }
});

test('checkout: Platinum → Estudio sí se cobra (subida normal; la vieja la cancela el webhook)', async () => {
    E.baseMigrada = true;
    E.suscripciones.sub_platinum = suscripcion('sub_platinum', PRECIO_PLATINUM);
    const { r } = await pedirCobro(PRECIO_ESTUDIO);
    assert.equal(r.status, 200);
    assert.equal(E.sesiones[0].line_items[0].price, PRECIO_ESTUDIO);
    assert.deepEqual(E.canceladas, [], 'el checkout no cancela nada antes del pago (29-sep)');
});

test('checkout: Ultra comprando otro plan sigue como antes', async () => {
    E.suscripciones.sub_ultra = suscripcion('sub_ultra', PRECIO_ULTRA);
    const { r } = await pedirCobro(PRECIO_ULTRA);
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'SUBSCRIPTION_EXISTS');
    reiniciar();
    E.suscripciones.sub_ultra = suscripcion('sub_ultra', PRECIO_ULTRA);
    const bajada = await pedirCobro(PRECIO_PRO);
    assert.equal(bajada.r.body.code, 'DOWNGRADE_REDIRECT');
});

// ── Webhook ─────────────────────────────────────────────────────────────────

test('webhook: Platinum → Estudio sin migrar responde 500, no marca el evento ni cancela nada', async () => {
    E.suscripciones.sub_platinum = suscripcion('sub_platinum', PRECIO_PLATINUM);
    E.suscripciones.sub_estudio = suscripcion('sub_estudio', PRECIO_ESTUDIO);
    const { r, dicho } = await avisar(eventoCheckout('evt_estudio_1', 'sub_estudio'));
    assert.equal(r.status, 500, 'Stripe tiene que reintentar');
    assert.deepEqual(marcados(), [], 'sin marcar: el reintento sí se procesa');
    assert.deepEqual(E.canceladas, [], 'la Platinum sigue viva hasta que Estudio quede escrito');
    assert.ok(dicho.some((l) => l.includes('ESTUDIO COBRADO Y SIN ESCRIBIR')), 'el registro lo grita');
});

test('webhook: el reintento, ya con la base al día, escribe Estudio y cancela la Platinum con prorrateo', async () => {
    E.suscripciones.sub_platinum = suscripcion('sub_platinum', PRECIO_PLATINUM);
    E.suscripciones.sub_estudio = suscripcion('sub_estudio', PRECIO_ESTUDIO);
    const evento = eventoCheckout('evt_estudio_2', 'sub_estudio');
    assert.equal((await avisar(evento)).r.status, 500);
    E.baseMigrada = true;
    const { r } = await avisar(evento);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { received: true });
    assert.ok(planesEscritos().includes('platinum_estudio'));
    const cupo = E.ops.filter((o) => o.tabla === 'user_profiles' && o.accion === 'update' && o.datos?.queries_limit !== undefined)
        .map((o) => o.datos.queries_limit);
    assert.ok(cupo.length >= 2 && cupo.every((n) => n === 3100), `3,100 dos veces (disparador): ${cupo}`);
    assert.deepEqual(E.canceladas, [{ id: 'sub_platinum', opciones: { prorate: true, invoice_now: true } }]);
    assert.deepEqual(marcados(), ['evt_estudio_2']);
});

test('webhook: customer.subscription.created de Estudio sin migrar también pide reintento', async () => {
    const sub = suscripcion('sub_estudio', PRECIO_ESTUDIO);
    const { r } = await avisar({ id: 'evt_estudio_3', type: 'customer.subscription.created', data: { object: sub } });
    assert.equal(r.status, 500);
    assert.deepEqual(marcados(), []);
});

test('webhook: un plan de siempre que falla al escribirse sigue respondiendo 200 (FIX #1, sin cambios)', async () => {
    E.fallaUpdate = { message: 'se cayó la conexión', code: '08006' };
    E.suscripciones.sub_pro = suscripcion('sub_pro', PRECIO_PRO);
    const { r } = await avisar(eventoCheckout('evt_pro_1', 'sub_pro'));
    assert.equal(r.status, 200);
    assert.equal(r.body.error, 'Webhook handler failed');
    assert.deepEqual(marcados(), [], 'como antes: ni se marca ni se reintenta');
});

test('webhook: Pro con la base sana, igual que siempre', async () => {
    E.suscripciones.sub_pro = suscripcion('sub_pro', PRECIO_PRO);
    const { r } = await avisar(eventoCheckout('evt_pro_2', 'sub_pro'));
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { received: true });
    assert.deepEqual(planesEscritos(), ['pro_monthly']);
    assert.deepEqual(marcados(), ['evt_pro_2']);
});

// ── Panel de administración ─────────────────────────────────────────────────

const cambiarPlan = (plan) => callado(() => Panel.POST({
    headers: { get: (k) => (k === 'authorization' ? 'Bearer token_prueba' : null) },
    json: async () => ({ tipo: 'cambiar_plan', id: 'perfil_1', plan }),
}));
const updatesDelPerfil = () => E.ops.filter((o) => o.tabla === 'user_profiles' && o.accion === 'update');
const bitacora = () => E.ops.filter((o) => o.tabla === 'admin_audit_log' && o.accion === 'insert');

test('panel: Estudio rechazado por la base no deja 3,100 en el plan viejo ni dice ok', async () => {
    E.usuario = { email: 'pruebas@iurexia.com' };
    const { r } = await cambiarPlan('platinum_estudio');
    assert.equal(r.status, 400);
    assert.match(r.body.error, /no se pudo cambiar el plan/);
    assert.equal(updatesDelPerfil().length, 1, 'sólo el intento del plan: el cupo no se escribe');
    assert.equal(bitacora().length, 0, 'la bitácora no registra un cambio que no ocurrió');
});

test('panel: cualquier otro fallo del primer update, igual', async () => {
    E.usuario = { email: 'pruebas@iurexia.com' };
    E.fallaUpdate = { message: 'se cayó la conexión', code: '08006' };
    const { r } = await cambiarPlan('pro_monthly');
    assert.equal(r.status, 400);
    assert.equal(updatesDelPerfil().length, 1);
    assert.equal(bitacora().length, 0);
});

test('panel: un cambio que sí entra escribe el cupo sólo sobre ese plan y lo asienta', async () => {
    E.usuario = { email: 'pruebas@iurexia.com' };
    E.baseMigrada = true;
    const { r } = await cambiarPlan('platinum_estudio');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
    const [plan, cupo] = updatesDelPerfil();
    assert.equal(plan.datos.subscription_type, 'platinum_estudio');
    assert.equal(plan.datos.queries_limit, 3100);
    assert.deepEqual(cupo.datos, { queries_limit: 3100 });
    assert.deepEqual(cupo.filtros, [['eq', 'id', 'perfil_1'], ['eq', 'subscription_type', 'platinum_estudio']]);
    assert.equal(bitacora().length, 1);
    assert.deepEqual(bitacora()[0].datos.details, { plan: 'platinum_estudio' });
});

test('panel: sin sesión de administrador no se toca nada', async () => {
    E.usuario = { email: 'alguien@ejemplo.mx' };
    const { r } = await cambiarPlan('platinum_estudio');
    assert.equal(r.status, 401);
    assert.equal(updatesDelPerfil().length, 0);
});
