/**
 * QUIÉN PUEDE LLAMAR A /api/soporte/atencion (29-oct-2026), sin red: los
 * tokens se firman aquí con una llave RSA de prueba y sus llaves públicas
 * reemplazan a las de Google. Tres partes:
 *
 *   1. `identidad-google.ts`: la verificación del token (aceptado, otro
 *      correo, vencido, firma mala, sin email_verified…), la caché de llaves
 *      y la decisión token / clave de antes.
 *   2. `Atencion.gs` en un vm, con Gmail, UrlFetchApp y ScriptApp de mentira:
 *      qué cabeceras manda y cuándo no llama.
 *   3. La ruta REAL (`POST` de src/app/api/soporte/atencion/route.ts) con un
 *      `fetch` de mentira que sirve las llaves en la dirección de Google y
 *      hace de Supabase. Cualquier otra dirección revienta la prueba.
 *
 * USO   node _pruebas/atencion-identidad.mts      (Node 22.18+, que quita los tipos solo)
 */
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import {
    verificarTokenGoogle, autorizarAtencion, crearLlavero, audienciaNueva, CERTS_GOOGLE, type LlaveGoogle,
} from '../src/lib/soporte/identidad-google.ts';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pasadas = 0;
const prueba = async (nombre: string, f: () => void | Promise<void>) => {
    try { await f(); pasadas++; console.log(`  ok  ${nombre}`); }
    catch (e) { console.error(`  MAL ${nombre}\n`, e); process.exitCode = 1; }
};

/* ───────────── llaves y tokens de prueba ───────────── */

const KID = 'llave-de-prueba-1';
const { publicKey, privateKey: privada } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey: privadaAjena } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = (kid: string, llave: KeyObject = publicKey): LlaveGoogle => ({ ...llave.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' });
const JWKS = [jwk(KID)];

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
function firmar(carga: Record<string, unknown>, o: { llave?: KeyObject; kid?: string; alg?: string } = {}): string {
    const h = b64({ alg: o.alg ?? 'RS256', kid: o.kid ?? KID, typ: 'JWT' });
    const p = b64(carga);
    return `${h}.${p}.${sign('sha256', Buffer.from(`${h}.${p}`), o.llave ?? privada).toString('base64url')}`;
}

const AHORA = Date.parse('2026-10-29T20:00:00Z');
const S = Math.floor(AHORA / 1000);
const AUD = '123456789012-pruebapruebapruebaprueba0123.apps.googleusercontent.com';
const carga = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
    iss: 'https://accounts.google.com', azp: AUD, aud: AUD, sub: '104857600000000000001', hd: 'iurexia.com',
    email: 'soporte@iurexia.com', email_verified: true, iat: S - 120, exp: S + 3480, ...o,
});
const conLlaves = { llaves: JWKS, ahora: AHORA };
const motivo = async (token: string, op: Parameters<typeof verificarTokenGoogle>[1] = conLlaves) => {
    const v = await verificarTokenGoogle(token, op);
    return v.ok ? 'aceptado' : v.motivo;
};

/* ───────────── la red: sólo las llaves de Google y un Supabase vacío ───────────── */

const red = { certs: 0, supabase: 0 };
globalThis.fetch = (async (entrada: string | URL | Request) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    if (url === CERTS_GOOGLE) {
        red.certs++;
        return new Response(JSON.stringify({ keys: JWKS }), {
            headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=19742, must-revalidate, no-transform' },
        });
    }
    if (url.startsWith('https://falso.supabase.co/rest/v1/reportes_soporte')) {
        red.supabase++;
        return new Response('[]', { headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`red prohibida en la prueba: ${url}`);
}) as typeof fetch;

/* ═════════════ 1. identidad-google.ts ═════════════ */

console.log('el token de identidad');
await prueba('soporte@ con su token firmado: aceptado', async () => {
    const v = await verificarTokenGoogle(firmar(carga()), conLlaves);
    assert.equal(v.ok, true);
    if (v.ok) {
        assert.equal(v.identidad.email, 'soporte@iurexia.com');
        assert.equal(v.identidad.aud, AUD);
        assert.equal(v.identidad.hd, 'iurexia.com');
    }
});
await prueba('el emisor sin https también es Google', async () =>
    assert.equal(await motivo(firmar(carga({ iss: 'accounts.google.com' }))), 'aceptado'));
await prueba('el correo se compara sin mayúsculas', async () =>
    assert.equal(await motivo(firmar(carga({ email: 'Soporte@Iurexia.com' }))), 'aceptado'));
await prueba('otro correo, aunque Google lo firme: no (y se sabe cuál)', async () => {
    const v = await verificarTokenGoogle(firmar(carga({ email: 'jdm.juridico@gmail.com' })), conLlaves);
    assert.equal(v.ok, false);
    if (!v.ok) { assert.equal(v.motivo, 'correo no autorizado'); assert.equal(v.email, 'jdm.juridico@gmail.com'); }
});
await prueba('sin email (faltó el scope userinfo.email): no, y dice por qué', async () =>
    assert.match(await motivo(firmar(carga({ email: undefined, email_verified: undefined }))), /userinfo\.email/));
await prueba('otro buzón del mismo dominio: no', async () =>
    assert.equal(await motivo(firmar(carga({ email: 'connect@iurexia.com' }))), 'correo no autorizado'));
await prueba('vencido: no', async () =>
    assert.equal(await motivo(firmar(carga({ iat: S - 7200, exp: S - 3600 }))), 'token vencido'));
await prueba('dentro del minuto de holgura sí; pasado, no', async () => {
    assert.equal(await motivo(firmar(carga({ exp: S - 30 }))), 'aceptado');
    assert.equal(await motivo(firmar(carga({ exp: S - 61 }))), 'token vencido');
});
await prueba('emitido en el futuro: no', async () =>
    assert.equal(await motivo(firmar(carga({ iat: S + 600, exp: S + 4200 }))), 'emitido en el futuro'));
await prueba('sin vencimiento: no', async () =>
    assert.equal(await motivo(firmar(carga({ exp: undefined }))), 'sin vencimiento'));
await prueba('firma de otra llave con el mismo kid: no', async () =>
    assert.equal(await motivo(firmar(carga(), { llave: privadaAjena })), 'firma inválida'));
await prueba('carga cambiada después de firmar: no', async () => {
    const [h, , s] = firmar(carga({ email: 'jdm.juridico@gmail.com' })).split('.');
    assert.equal(await motivo(`${h}.${b64(carga())}.${s}`), 'firma inválida');
});
await prueba('firma recortada: no', async () =>
    assert.equal(await motivo(firmar(carga()).slice(0, -8)), 'firma inválida'));
await prueba('sin email_verified: no', async () => {
    const { email_verified: _fuera, ...sinVerificar } = carga();
    assert.equal(await motivo(firmar(sinVerificar)), 'correo sin verificar');
});
await prueba('email_verified en false: no', async () =>
    assert.equal(await motivo(firmar(carga({ email_verified: false }))), 'correo sin verificar'));
await prueba('alg none o HS256: no', async () => {
    const h = b64({ alg: 'none', kid: KID }), p = b64(carga());
    assert.equal(await motivo(`${h}.${p}.`), 'no es un JWT');
    assert.equal(await motivo(`${h}.${p}.AAAA`), 'algoritmo none no admitido');
    assert.equal(await motivo(firmar(carga(), { alg: 'HS256' })), 'algoritmo HS256 no admitido');
    const inyectado = await motivo(`${b64({ alg: 'x\n[soporte/atencion] identidad aceptada', kid: KID })}.${p}.AAAA`);
    assert.ok(!/\s\[/.test(inyectado) && inyectado.length < 40, inyectado);
});
await prueba('kid que no es de Google: no', async () => {
    assert.equal(await motivo(firmar(carga(), { kid: 'otra' })), 'llave desconocida');
    assert.equal(await motivo(firmar(carga(), { kid: 'constructor' })), 'llave desconocida');
});
await prueba('emisor ajeno: no', async () =>
    assert.equal(await motivo(firmar(carga({ iss: 'https://accounts.google.com.evil.example' }))), 'emisor ajeno'));
await prueba('sin aud: no', async () =>
    assert.equal(await motivo(firmar(carga({ aud: undefined }))), 'sin audiencia'));
await prueba('audiencia fijada: la suya pasa, otra no', async () => {
    assert.equal(await motivo(firmar(carga()), { ...conLlaves, audiencias: [AUD] }), 'aceptado');
    assert.equal(await motivo(firmar(carga()), { ...conLlaves, audiencias: ['999-otra.apps.googleusercontent.com'] }), 'audiencia no fijada');
});
await prueba('lo que no es un JWT: no', async () => {
    for (const t of ['', 'abc', 'a.b', 'a.b.c', '...', 'x'.repeat(9000)]) assert.equal(await motivo(t), 'no es un JWT', t.slice(0, 20));
});

console.log('token o clave de antes');
const pedido = (authorization: string | null, clave: string | null = null) => ({ authorization, clave });
await prueba('Bearer válido y Vercel sin clave: pasa por la identidad', async () => {
    const r = await autorizarAtencion(pedido(`Bearer ${firmar(carga())}`), {}, conLlaves);
    assert.equal(r.ok && r.via, 'identidad');
});
await prueba('«bearer» en minúsculas, también', async () => {
    const r = await autorizarAtencion(pedido(`bearer ${firmar(carga())}`), {}, conLlaves);
    assert.equal(r.ok && r.via, 'identidad');
});
await prueba('sin nada: 401', async () => {
    assert.deepEqual(await autorizarAtencion(pedido(null), {}, conLlaves), { ok: false, status: 401, motivo: 'sin credenciales' });
    assert.equal((await autorizarAtencion(pedido('Basic abc'), {}, conLlaves)).ok, false);
});
await prueba('token de otro correo: 401, con el correo para el registro', async () => {
    const r = await autorizarAtencion(pedido(`Bearer ${firmar(carga({ email: 'jdm.juridico@gmail.com' }))}`), {}, conLlaves);
    assert.deepEqual(r, { ok: false, status: 401, motivo: 'correo no autorizado', email: 'jdm.juridico@gmail.com', aud: AUD });
});
await prueba('la clave de antes vale sólo si Vercel la tiene', async () => {
    assert.equal((await autorizarAtencion(pedido(null, 'k-123'), { clave: 'k-123' }, conLlaves)).ok, true);
    const mala = await autorizarAtencion(pedido(null, 'k-124'), { clave: 'k-123' }, conLlaves);
    assert.equal(!mala.ok && mala.status, 401);
    const sinClave = await autorizarAtencion(pedido(null, 'k-123'), { clave: undefined }, conLlaves);
    assert.equal(!sinClave.ok && sinClave.status, 401);
    const vacia = await autorizarAtencion(pedido(null, ''), { clave: '' }, conLlaves);
    assert.equal(vacia.ok, false);
});
await prueba('token malo y clave buena: pasa por la clave', async () => {
    const r = await autorizarAtencion(pedido(`Bearer ${firmar(carga(), { llave: privadaAjena })}`, 'k-123'), { clave: 'k-123' }, conLlaves);
    assert.equal(r.ok && r.via, 'clave');
});
await prueba('Google no da sus llaves: 503, no 401; con la clave buena pasa igual', async () => {
    const caido = { llavero: async () => { throw new Error('fetch failed'); } };
    const r = await autorizarAtencion(pedido(`Bearer ${firmar(carga())}`), {}, caido);
    assert.equal(!r.ok && r.status, 503);
    const conClave = await autorizarAtencion(pedido(`Bearer ${firmar(carga())}`, 'k-123'), { clave: 'k-123' }, caido);
    assert.equal(conClave.ok && conClave.via, 'clave');
});
await prueba('cada audiencia se registra una sola vez', () => {
    assert.equal(audienciaNueva('aud-de-la-prueba-1'), true);
    assert.equal(audienciaNueva('aud-de-la-prueba-1'), false);
    assert.equal(audienciaNueva('aud-de-la-prueba-2'), true);
});

console.log('la caché de llaves');
function googleFalso(cacheControl = 'public, max-age=19742, must-revalidate, no-transform') {
    const g = { llamadas: 0, caido: false, llaves: JWKS as unknown[], t: 0 };
    const llavero = crearLlavero({
        reloj: () => g.t,
        fetch: (async () => {
            g.llamadas++;
            if (g.caido) throw new TypeError('fetch failed');
            return new Response(JSON.stringify({ keys: g.llaves }), { headers: { 'cache-control': cacheControl } });
        }) as typeof fetch,
    });
    return { g, llavero };
}
await prueba('una descarga sirve lo que dice su max-age', async () => {
    const { g, llavero } = googleFalso();
    assert.ok(await llavero(KID));
    assert.ok(await llavero(KID));
    g.t = 19_742_000 - 1;
    assert.ok(await llavero(KID));
    assert.equal(g.llamadas, 1);
    g.t = 19_742_000;
    assert.ok(await llavero(KID));
    assert.equal(g.llamadas, 2);
});
await prueba('dos pedidos a la vez: una sola descarga', async () => {
    const { g, llavero } = googleFalso();
    const [a, b] = await Promise.all([llavero(KID), llavero(KID)]);
    assert.ok(a && b);
    assert.equal(g.llamadas, 1);
});
await prueba('kid nuevo (Google rotó): se vuelven a pedir, a lo más una vez por minuto', async () => {
    const { g, llavero } = googleFalso();
    assert.ok(await llavero(KID));
    g.llaves = [jwk(KID), jwk('llave-nueva')];
    g.t = 10_000;
    assert.equal(await llavero('llave-nueva'), null);
    assert.equal(g.llamadas, 1);
    g.t = 61_000;
    assert.ok(await llavero('llave-nueva'));
    assert.equal(g.llamadas, 2);
    g.t = 70_000;
    assert.equal(await llavero('inventada'), null);
    assert.equal(g.llamadas, 2);
});
await prueba('Google caído: las llaves de antes sirven hasta un día después de vencer', async () => {
    const { g, llavero } = googleFalso('max-age=3600');
    assert.ok(await llavero(KID));
    g.caido = true;
    const avisos: string[] = [];
    const warn = console.warn;
    console.warn = (...a: unknown[]) => { avisos.push(a.join(' ')); };
    try {
        g.t = 3_600_000 + 60_000;
        assert.ok(await llavero(KID));
        assert.ok(avisos.some(a => a.includes('sigo con las de antes')));
        g.t = 3_600_000 + 86_400_000 + 1;
        await assert.rejects(llavero(KID), /fetch failed/);
    } finally { console.warn = warn; }
});
await prueba('Google caído sin llaves guardadas: error (la ruta da 503)', async () => {
    const { g, llavero } = googleFalso();
    g.caido = true;
    await assert.rejects(llavero(KID), /fetch failed/);
});
await prueba('respuesta sin llaves RSA: error', async () => {
    const { g, llavero } = googleFalso();
    g.llaves = [{ kty: 'EC', kid: KID, crv: 'P-256', x: 'AA', y: 'AA' }];
    await assert.rejects(llavero(KID), /no trajo llaves RSA/);
});

/* ═════════════ 2. Atencion.gs ═════════════ */

console.log('Atencion.gs');
const GS = readFileSync(path.join(RAIZ, 'scripts/soporte-atencion/Atencion.gs'), 'utf8');
const mensaje = (o: { de: string; para?: string; cuerpo: string; asunto: string; fecha: string }) => ({
    getFrom: () => o.de, getTo: () => o.para ?? '', getCc: () => '', getPlainBody: () => o.cuerpo,
    getDate: () => new Date(o.fecha), getSubject: () => o.asunto, getId: () => `m-${o.fecha}`,
});
const hilo = (id: string, mensajes: unknown[]) => ({ getId: () => id, getMessages: () => mensajes });
const ENVIADOS = [hilo('h1', [mensaje({
    de: 'Soporte de Iurexia <soporte@iurexia.com>', para: 'Lic. Ana <ana@ejemplo.mx>', asunto: 'Re: [Soporte] folio 3856-01',
    cuerpo: 'Lic. Ana: sobre su folio 3856-01, la carga del PDF ya quedó corregida.', fecha: '2026-10-29T18:00:00Z',
})])];
const RECIBIDOS = [hilo('h1', [mensaje({
    de: 'Lic. Ana <ana@ejemplo.mx>', asunto: 'Re: [Soporte] folio 3856-01',
    cuerpo: 'Me sigue saliendo el error al subir el PDF del expediente, les mando la captura.', fecha: '2026-10-29T19:00:00Z',
})])];

/** Lo que sale del vm es de otro «realm»: se copia antes de comparar. */
const plano = (o: unknown) => JSON.parse(JSON.stringify(o));

function correrScript(entorno: { token?: string | null; tokenFalla?: boolean; clave?: string | null }) {
    const llamadas: Array<{ url: string; params: { headers: Record<string, string>; payload: string } }> = [];
    const registro: string[] = [];
    const anota = (nivel: string) => (...a: unknown[]) => { registro.push(`${nivel} ${a.join(' ')}`); };
    const ctx: Record<string, unknown> = {
        module: { exports: {} },
        console: { log: anota('log'), warn: anota('warn'), error: anota('error') },
        ScriptApp: {
            getIdentityToken: () => { if (entorno.tokenFalla) throw new Error('sin permiso openid'); return entorno.token ?? null; },
        },
        PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => (k === 'ATENCION_KEY' ? entorno.clave ?? null : null) }) },
        GmailApp: { search: (q: string) => (q.startsWith('in:sent') ? ENVIADOS : RECIBIDOS) },
        UrlFetchApp: {
            fetch: (url: string, params: { headers: Record<string, string>; payload: string }) => {
                llamadas.push({ url, params });
                return { getResponseCode: () => 200, getContentText: () => '{"observaciones":2,"reportes_vistos":1,"cambios":[]}' };
            },
        },
    };
    vm.runInNewContext(GS, ctx);
    (ctx.revisarAtencion as () => void)();
    return { llamadas, registro };
}
await prueba('con token: manda Bearer y nada más, con lo que vio en el buzón', () => {
    const { llamadas } = correrScript({ token: 'tok.en.prueba' });
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, 'https://www.iurexia.com/api/soporte/atencion');
    assert.deepEqual(plano(llamadas[0].params.headers), { Authorization: 'Bearer tok.en.prueba' });
    const { observaciones } = JSON.parse(llamadas[0].params.payload);
    assert.deepEqual(observaciones.map((o: { tipo: string }) => o.tipo), ['respuesta', 'usuario']);
    assert.deepEqual(observaciones[0].correos, ['ana@ejemplo.mx']);
    assert.deepEqual(observaciones[0].folios, ['3856-01']);
});
await prueba('con token y la propiedad ATENCION_KEY: las dos cabeceras', () => {
    const { llamadas } = correrScript({ token: 'tok.en.prueba', clave: 'k-vieja' });
    assert.deepEqual(plano(llamadas[0].params.headers), { Authorization: 'Bearer tok.en.prueba', 'x-atencion-key': 'k-vieja' });
});
await prueba('sin token pero con ATENCION_KEY: la clave sola, como antes', () => {
    const { llamadas } = correrScript({ token: null, clave: 'k-vieja' });
    assert.deepEqual(plano(llamadas[0].params.headers), { 'x-atencion-key': 'k-vieja' });
});
await prueba('sin token ni clave: no llama y dice qué falta', () => {
    for (const entorno of [{ token: null }, { tokenFalla: true }]) {
        const { llamadas, registro } = correrScript(entorno);
        assert.equal(llamadas.length, 0);
        assert.ok(registro.some(l => l.startsWith('error') && l.includes('openid')), registro.join('\n'));
    }
});

/* ═════════════ 3. la ruta real ═════════════ */

console.log('la ruta /api/soporte/atencion');
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
export async function resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = RAIZ + 'src/' + spec.slice(2);
    try { return await next(spec, ctx); }
    catch (e) {
        const extensiones = /^(\\.|\\/|file:)/.test(spec) ? ['.ts', '.tsx', '/index.ts'] : ['.js'];
        for (const ext of extensiones) { try { return await next(spec + ext, ctx); } catch {} }
        throw e;
    }
}`));
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://falso.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'servicio-de-relleno';
delete process.env.SOPORTE_ATENCION_KEY;

assert.equal(red.certs, 0, 'las partes 1 y 2 no debían pedir llaves a «Google»');
const { NextRequest } = await import('next/server.js');
const { POST } = await import('../src/app/api/soporte/atencion/route.ts');

const AUD_RUTA = '555555555555-proyectosoporteautomatico.apps.googleusercontent.com';
const tokenReal = (o: Record<string, unknown> = {}) => {
    const s = Math.floor(Date.now() / 1000);
    return firmar(carga({ aud: AUD_RUTA, azp: AUD_RUTA, iat: s - 60, exp: s + 3540, ...o }));
};
const OBS = { tipo: 'respuesta', fecha: '2026-10-29T18:00:00Z', correos: ['ana@ejemplo.mx'], folios: ['3856-01'], hilo: 'h1' };
async function llamar(cabeceras: Record<string, string>, cuerpo: string = JSON.stringify({ observaciones: [OBS] })) {
    const registro: string[] = [];
    const { log, warn } = console;
    console.log = (...a: unknown[]) => { registro.push(a.join(' ')); };
    console.warn = (...a: unknown[]) => { registro.push(a.join(' ')); };
    try {
        const r = await POST(new NextRequest('http://localhost/api/soporte/atencion', {
            method: 'POST', headers: { 'content-type': 'application/json', ...cabeceras }, body: cuerpo,
        }));
        return { status: r.status, cuerpo: await r.json(), registro };
    } finally { console.log = log; console.warn = warn; }
}

await prueba('sin credenciales: 401 (antes, sin SOPORTE_ATENCION_KEY, era 503)', async () => {
    const r = await llamar({});
    assert.equal(r.status, 401);
    assert.equal(r.cuerpo.error, 'no autorizado');
    assert.equal(red.certs, 0);
});
await prueba('token de soporte@: 200, cuenta las observaciones y registra la audiencia', async () => {
    const r = await llamar({ authorization: `Bearer ${tokenReal()}` });
    assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
    assert.deepEqual(r.cuerpo, { observaciones: 1, reportes_vistos: 0, cambios: [] });
    assert.equal(red.certs, 1);
    assert.ok(red.supabase >= 1);
    assert.ok(r.registro.some(l => l.includes('identidad aceptada') && l.includes(`aud=${AUD_RUTA}`) && l.includes('sin fijar')), r.registro.join('\n'));
});
await prueba('segunda llamada: llaves en caché y la audiencia no se repite en el registro', async () => {
    const r = await llamar({ authorization: `Bearer ${tokenReal()}` });
    assert.equal(r.status, 200);
    assert.equal(red.certs, 1);
    assert.ok(!r.registro.some(l => l.includes('identidad aceptada')), r.registro.join('\n'));
});
await prueba('token de otro correo: 401, sin tocar la base, y el registro dice quién era', async () => {
    const antes = red.supabase;
    const r = await llamar({ authorization: `Bearer ${tokenReal({ email: 'jdm.juridico@gmail.com' })}` });
    assert.equal(r.status, 401);
    assert.equal(r.cuerpo.motivo, 'correo no autorizado');
    assert.equal(red.supabase, antes);
    assert.ok(r.registro.some(l => l.includes('401') && l.includes('email=jdm.juridico@gmail.com')), r.registro.join('\n'));
});
await prueba('token vencido o con firma ajena: 401', async () => {
    const s = Math.floor(Date.now() / 1000);
    assert.equal((await llamar({ authorization: `Bearer ${tokenReal({ iat: s - 7200, exp: s - 3600 })}` })).status, 401);
    const ajeno = firmar(carga({ aud: AUD_RUTA, iat: s - 60, exp: s + 3540 }), { llave: privadaAjena });
    assert.equal((await llamar({ authorization: `Bearer ${ajeno}` })).status, 401);
    assert.equal((await llamar({ authorization: `Bearer ${tokenReal({ email_verified: undefined })}` })).status, 401);
});
await prueba('con SOPORTE_ATENCION_KEY: la clave de antes vale, la equivocada no, el token sigue valiendo', async () => {
    process.env.SOPORTE_ATENCION_KEY = 'clave-de-prueba';
    try {
        assert.equal((await llamar({ 'x-atencion-key': 'clave-de-prueba' })).status, 200);
        assert.equal((await llamar({ 'x-atencion-key': 'otra' })).status, 401);
        assert.equal((await llamar({ authorization: `Bearer ${tokenReal()}` })).status, 200);
    } finally { delete process.env.SOPORTE_ATENCION_KEY; }
    assert.equal((await llamar({ 'x-atencion-key': 'clave-de-prueba' })).status, 401);
});
await prueba('primero quién, después el cuerpo: JSON roto con token 400, sin token 401', async () => {
    assert.equal((await llamar({ authorization: `Bearer ${tokenReal()}` }, '{roto')).status, 400);
    assert.equal((await llamar({}, '{roto')).status, 401);
});

console.log(`\n${pasadas} pruebas pasaron${process.exitCode ? ' — HAY FALLOS' : ''}`);
