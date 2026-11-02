// EL PLAN ESTUDIO, DE PUNTA A PUNTA EN EL FRONT (2-nov-2026).
//
// Estudio entra al catálogo SIN tocar nada de lo que ya se cobra. Lo que más
// puede romperse no se ve en la pantalla: el webhook de Stripe busca el plan
// por igualdad exacta del precio (`getPlanFromSubscription`), y un precio que
// deja de resolverse escribe «gratuito» en el perfil de un cliente que paga
// (ver precios-nov2/codigo/inventario.md, §0.1). Y `next.config.js` tiene
// `ignoreBuildErrors: true`: un plan que falta en un `Record<PlanId, …>`
// compila igual.
//
// Esto comprueba, con el código tal cual (sin red, sin Stripe, sin Supabase):
//   · cada precio de producción resuelve a su plan de siempre —149, 1,490, 79,
//     790, 599, 5,990 y 999— y el de Estudio a `platinum_estudio`, por las dos
//     rutas del webhook (`getPlanIdFromPriceId` y `getPlanFromSubscription`);
//   · lo de ANTES no cambió: cada plan que existía en el commit de referencia
//     (c0d29e4 por omisión) conserva precio, intervalo, cupo y precio de
//     Stripe, y su `PLAN_CONFIG` es idéntico;
//   · Estudio: rango 8, cupo guardado 3,100 «ilimitado», 100 flujos, 20 GB,
//     600 hojas, las listas de Platinum, el premio de referidos y el aviso;
//   · el mapa del webhook cubre todos los planes de `PLANS`.
//
//   node --test comprobaciones/plan_estudio.mjs
//   ANTES=<commit> node --test comprobaciones/plan_estudio.mjs
//
// Los .ts se transpilan con el TypeScript del repositorio y «@/» se resuelve
// a src/ con un cargador registrado aquí mismo, como en visor_vigencia.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { register } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(RAIZ, 'src');

// ── Lo de antes, sacado de git a una carpeta temporal con la forma de src/ ──
const ANTES = process.env.ANTES || 'c0d29e4';
const VIEJO = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'plan-estudio-antes-')));
process.on('exit', () => fs.rmSync(VIEJO, { recursive: true, force: true }));
for (const rel of ['src/lib/stripe.ts', 'src/lib/supabase-admin.ts']) {
    const destino = path.join(VIEJO, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, execFileSync('git', ['-C', RAIZ, 'show', `${ANTES}:${rel}`]));
}

// ── El cargador: «@/…» → src/…, extensiones implícitas y .ts transpilados ──
const GANCHOS = `
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
let ts, SRC, VIEJO, RAIZ;
export async function initialize(d) { SRC = d.src; VIEJO = d.viejo; RAIZ = d.raiz; ts = (await import(d.ts)).default; }
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
    const padre = ctx.parentURL && ctx.parentURL.startsWith('file:') ? fileURLToPath(ctx.parentURL) : '';
    if ((esp.startsWith('./') || esp.startsWith('../')) && padre && nuestro(padre)) {
        const f = hallar(path.resolve(path.dirname(padre), esp));
        if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
    }
    // Los paquetes (stripe, @supabase/…) de un archivo viejo, desde node_modules de aquí.
    if (padre.startsWith(VIEJO) && !/^(\\.|\\/|file:|node:|data:)/.test(esp)) {
        return next(esp, { ...ctx, parentURL: pathToFileURL(path.join(RAIZ, 'package.json')).href });
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
        src: SRC,
        viejo: VIEJO,
        raiz: RAIZ,
        ts: pathToFileURL(path.join(RAIZ, 'node_modules/typescript/lib/typescript.js')).href,
    },
});

// Sin variables de Stripe: lo que se comprueba son los precios del código.
// (En Vercel una variable puede ganarle; eso se revisa allá, no aquí.)
for (const k of Object.keys(process.env)) if (k.includes('STRIPE_PRICE_')) delete process.env[k];
// El cliente de Supabase del navegador se crea al importar; con esto no sale
// a ninguna parte (no hay sesión que recuperar ni ventana).
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:9';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'clave-de-prueba';

const S = await import(path.join(SRC, 'lib/stripe.ts'));
const A = await import(path.join(SRC, 'lib/supabase-admin.ts'));
const E = await import(path.join(SRC, 'lib/plan-estudio.ts'));
const R = await import(path.join(SRC, 'lib/correo/referidos.ts'));
const SV = await import(path.join(VIEJO, 'src/lib/stripe.ts'));
const AV = await import(path.join(VIEJO, 'src/lib/supabase-admin.ts'));

/** `getPlanFromSubscription` escribe cada comparación en el registro: aquí, callado. */
function callado(f) {
    const log = console.log, error = console.error;
    console.log = () => {}; console.error = () => {};
    try { return f(); } finally { console.log = log; console.error = error; }
}
const suscripcion = (precio) => ({ id: 'sub_prueba', status: 'active', items: { data: [{ price: { id: precio } }] } });

// Los precios que hoy cobran, con lo que cuestan. Fuente: el catálogo de
// Stripe leído en sólo lectura (precios-nov2/codigo/inventario.md) y
// PROMOTION_PRICE_IDS.
const PRODUCCION = [
    ['price_1Sy2l63uD85CqvjMku0MM4k3', 'pro_monthly', 149],
    ['price_1Sy2l23uD85CqvjMOwcGmC1N', 'pro_annual', 1490],
    ['price_1T8IMF3uD85CqvjMM49lRfxI', 'basico_monthly', 79],
    ['price_1Tx9m23uD85CqvjM9OPUDdQg', 'basico_annual', 790],
    ['price_1Sy2l03uD85CqvjMMJ4mFqhw', 'platinum_monthly', 599],
    ['price_1Sy2kw3uD85CqvjM45ZABmfE', 'platinum_annual', 5990],
    ['price_1T2MzR3uD85CqvjMW6MK8OyG', 'ultra_secretarios', 999],
];
const PRECIO_ESTUDIO = 'price_1UXIiI3uD85CqvjMrXLzuClJ';

test('cada precio de producción resuelve a su plan de siempre, por las dos rutas del webhook', () => {
    for (const [precio, plan, pesos] of PRODUCCION) {
        assert.equal(S.getPlanIdFromPriceId(precio), plan, `getPlanIdFromPriceId(${precio})`);
        assert.equal(callado(() => S.getPlanFromSubscription(suscripcion(precio))), plan, `getPlanFromSubscription(${precio})`);
        assert.equal(S.PLANS[plan].priceId, precio, `PLANS.${plan}.priceId`);
        assert.equal(S.PLANS[plan].price, pesos, `PLANS.${plan}.price`);
        // Y como antes: el commit de referencia daba exactamente lo mismo.
        assert.equal(SV.getPlanIdFromPriceId(precio), plan, `antes: ${precio}`);
    }
});

test('el precio de Estudio resuelve a platinum_estudio', () => {
    assert.equal(S.PLANS.platinum_estudio.priceId, PRECIO_ESTUDIO);
    assert.equal(S.getPlanIdFromPriceId(PRECIO_ESTUDIO), 'platinum_estudio');
    assert.equal(callado(() => S.getPlanFromSubscription(suscripcion(PRECIO_ESTUDIO))), 'platinum_estudio');
    assert.equal(S.PLANS.platinum_estudio.price, 1499);
    assert.equal(S.PLANS.platinum_estudio.interval, 'month');
    // Antes no existía: habría caído en gratuito. Es lo que este cambio arregla.
    assert.equal(SV.getPlanIdFromPriceId(PRECIO_ESTUDIO), 'gratuito');
    // Un precio desconocido sigue cayendo en gratuito (el webhook lo grita).
    assert.equal(callado(() => S.getPlanFromSubscription(suscripcion('price_inexistente'))), 'gratuito');
});

test('la variable STRIPE_PRICE_ESTUDIO_MONTHLY gana, como en los demás planes', () => {
    process.env.STRIPE_PRICE_ESTUDIO_MONTHLY = 'price_de_prueba_estudio';
    try {
        assert.equal(S.PLANS.platinum_estudio.priceId, 'price_de_prueba_estudio');
        assert.equal(S.getPlanIdFromPriceId('price_de_prueba_estudio'), 'platinum_estudio');
        // y no mueve a nadie más
        for (const [precio, plan] of PRODUCCION) assert.equal(S.getPlanIdFromPriceId(precio), plan);
    } finally {
        delete process.env.STRIPE_PRICE_ESTUDIO_MONTHLY;
    }
    assert.equal(S.PLANS.platinum_estudio.priceId, PRECIO_ESTUDIO);
});

test('los planes que ya existían no cambiaron (salvo el texto de Platinum)', () => {
    for (const [id, viejo] of Object.entries(SV.PLANS)) {
        const nuevo = S.PLANS[id];
        assert.ok(nuevo, `falta ${id}`);
        for (const campo of ['name', 'price', 'currency', 'interval', 'queryLimit', 'priceId', 'flujosMes', 'sentenciaQueryLimit', 'draftLimit', 'proyectosMes']) {
            assert.deepEqual(nuevo[campo], viejo[campo], `${id}.${campo}`);
        }
        const cambio = id === 'platinum_monthly'
            ? viejo.features.map((f) => f === '560 consultas/mes — ideal para despachos' ? '560 consultas/mes — para abogados exigentes' : f)
            : viejo.features;
        assert.deepEqual(nuevo.features, cambio, `${id}.features`);
        assert.equal(S.PLAN_RANK[id], SV.PLAN_RANK[id], `PLAN_RANK.${id}`);
    }
    for (const [id, viejo] of Object.entries(AV.PLAN_CONFIG)) {
        assert.deepEqual(A.PLAN_CONFIG[id], viejo, `PLAN_CONFIG.${id}`);
    }
    assert.ok(!JSON.stringify(S.PLANS).includes('ideal para despachos'), 'Platinum ya no es «para despachos»');
});

test('Estudio: rango, cupo «ilimitado» y PLAN_CONFIG', () => {
    assert.equal(S.PLAN_RANK.platinum_estudio, 8);
    for (const id of Object.keys(SV.PLANS)) {
        assert.ok(S.isUpgrade(id, 'platinum_estudio'), `${id} → Estudio es subir (el checkout no lo manda al portal)`);
        if (id !== 'gratuito') assert.ok(!S.isUpgrade('platinum_estudio', id), `Estudio → ${id} es bajar`);
    }
    // Finito, nunca −1: con −1 el chat de la web y la app instalada bloquean.
    assert.equal(S.PLANS.platinum_estudio.queryLimit, 3100);
    assert.equal(S.getQueryLimit('platinum_estudio'), 3100);
    assert.ok(S.hasUnlimitedQueries('platinum_estudio'));
    for (const id of Object.keys(SV.PLANS)) assert.ok(!S.hasUnlimitedQueries(id), `${id} no es ilimitado`);
    assert.deepEqual(A.PLAN_CONFIG.platinum_estudio,
        { queriesLimit: 3100, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: true, proyectosMes: 0 });
    assert.equal(E.TOPE_CONSULTAS_ESTUDIO, 3100);
    assert.equal(E.CONSULTAS_ELITE_ESTUDIO, 560);
    assert.equal(E.CONSULTAS_ELITE_ESTUDIO, A.PLAN_CONFIG.platinum_monthly.queriesLimit, 'el freno = el cupo de Platinum');
    assert.equal(E.textoDelCupo('platinum_estudio', 3100), 'Ilimitadas');
    assert.equal(E.textoDelCupo('platinum_monthly', 560), '560');
    assert.equal(E.textoDelCupo('pro_monthly', -1), '∞');
    assert.ok(!E.pasoDeLaElite('platinum_estudio', 559));
    assert.ok(E.pasoDeLaElite('platinum_estudio', 560));
    assert.ok(!E.pasoDeLaElite('platinum_monthly', 900));
});

test('el mapa del webhook cubre todos los planes de PLANS', () => {
    const fuente = fs.readFileSync(path.join(SRC, 'app/api/stripe/webhook/route.ts'), 'utf8');
    const bloque = fuente.match(/const mapping: Record<PlanId, PlanType> = \{([\s\S]*?)\};/);
    assert.ok(bloque, 'no encontré el mapa');
    const claves = Object.fromEntries([...bloque[1].matchAll(/^\s*(\w+):\s*'(\w+)'/gm)].map((m) => [m[1], m[2]]));
    for (const id of Object.keys(S.PLANS)) {
        assert.equal(claves[id], id, `mapPlanIdToSubscriptionType(${id})`);
        assert.ok(A.PLAN_CONFIG[id], `PLAN_CONFIG.${id} (sin él, el webhook no sabe cuántas consultas dar)`);
    }
});

test('Estudio hereda todo lo de Platinum: listas, almacenamiento, hojas, flujos', async () => {
    const H = await import(path.join(SRC, 'lib/herramientas-platinum.ts'));
    const F = await import(path.join(SRC, 'lib/esfuerzo.ts'));
    const B = await import(path.join(SRC, 'lib/boveda.ts'));
    const C = await import(path.join(SRC, 'lib/cronologia.ts'));
    const X = await import(path.join(SRC, 'lib/expedientes.ts'));
    const G = await import(path.join(SRC, 'lib/flujo-agente.ts'));
    const U = await import(path.join(SRC, 'lib/uso-funciones-config.ts'));
    const I = await import(path.join(SRC, 'components/Insignia.tsx'));

    assert.ok(H.tieneHerramientasPlatinum('platinum_estudio', 'alguien@ejemplo.mx'));
    assert.equal(F.techoDelPlan('platinum_estudio', 'alguien@ejemplo.mx'), 'platinum');
    assert.ok(B.PLANES_PLATINUM.includes('platinum_estudio'));
    assert.ok(C.puedeCronologia('platinum_estudio', 'alguien@ejemplo.mx'));
    assert.equal(X.cuotaDe('platinum_estudio'), 20480);
    assert.equal(X.paginasDe('platinum_estudio'), 600);
    assert.equal(G.limiteFlujos('platinum_estudio'), 100);
    assert.equal(G.limiteFlujos('platinum_monthly'), 60, 'Platinum sigue en 60');
    assert.equal(G.limiteFlujos('ultra_secretarios'), 60);
    assert.equal(G.limiteFlujos('pro_monthly'), 30);
    assert.equal(U.escalonDe('platinum_estudio'), 'platinum');
    assert.equal(I.nivelDePlan('platinum_estudio'), 'platinum');
    // Lo de los demás, igual que antes.
    assert.equal(X.cuotaDe('platinum_monthly'), 2048);
    assert.equal(X.cuotaDe('ultra_secretarios'), 20480);
    assert.equal(X.paginasDe('pro_monthly'), 100);
});

test('referidos: un premio de Platinum nunca pisa a Estudio', () => {
    assert.equal(R.planDelPremio('platinum_estudio'), 'platinum_estudio');
    assert.equal(R.planDelPremio('platinum_monthly'), 'platinum_monthly');
    assert.equal(R.planDelPremio('pro_monthly'), 'platinum_monthly');
    assert.equal(R.planDelPremio('gratuito'), 'pro_monthly');
    assert.ok(R.PLANES_QUE_CUENTAN.includes('platinum_estudio'));
    // Las dos tablas de rango (webhook y escalera) ponen a Estudio sobre Platinum.
    for (const rel of ['lib/supabase-admin.ts', 'lib/referidos-backend.ts']) {
        const fuente = fs.readFileSync(path.join(SRC, rel), 'utf8');
        const rango = (plan) => Number((fuente.match(new RegExp(`${plan}:\\s*(\\d+)`)) || [])[1]);
        assert.ok(rango('platinum_estudio') > rango('platinum_monthly'), `${rel}: rango de Estudio`);
    }
});
