/**
 * LA SESIÓN QUE VIAJA CON CADA PETICIÓN A LA API (29-oct-2026), sin red: el
 * `src/lib/sesion-api.ts` REAL con un Supabase y un `fetch` de mentira.
 *
 *   · un 401 con el token viejo renueva la sesión y repite UNA vez;
 *   · si la renovación no trae un token distinto, no repite;
 *   · cinco 401 a la vez gastan UNA renovación (un solo refresh token);
 *   · sin sesión va sin cabecera y devuelve el 401 tal cual;
 *   · si getSession() no contesta, se usa la sesión guardada mientras siga
 *     vigente, y una vencida no se manda.
 *
 * USO   node _pruebas/sesion-api.mts      (Node 22.18+, que quita los tipos solo)
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';

let pasadas = 0;
const prueba = async (nombre: string, f: () => void | Promise<void>) => {
    try { await f(); pasadas++; console.log(`  ok  ${nombre}`); }
    catch (e) { console.error(`  MAL ${nombre}\n`, e); process.exitCode = 1; }
};

// «./supabase» de sesion-api.ts → un cliente de mentira que vive en globalThis.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
    if (spec === './supabase' && (ctx.parentURL || '').endsWith('/src/lib/sesion-api.ts'))
        return { url: 'data:text/javascript,export const supabase = globalThis.__supabaseFalso;', shortCircuit: true };
    return next(spec, ctx);
}`));

type Sesion = { access_token: string; user: { id: string; email: string }; expires_at?: number } | null;
let sesion: Sesion = { access_token: 'viejo', user: { id: 'u1', email: 'a@b.mx' } };
let renovaciones = 0;
let renovarDa: string | null = 'nuevo';
let getSessionCuelga = false;
(globalThis as Record<string, unknown>).__supabaseFalso = {
    auth: {
        getSession: () => getSessionCuelga
            ? new Promise(() => { /* el candado no contesta */ })
            : Promise.resolve({ data: { session: sesion } }),
        refreshSession: async () => {
            renovaciones++;
            await new Promise((r) => setTimeout(r, 20));
            if (!renovarDa) return { data: { session: null }, error: new Error('sin sesión') };
            sesion = { ...(sesion as NonNullable<Sesion>), access_token: renovarDa };
            return { data: { session: sesion } };
        },
    },
};
const almacen = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => { almacen.set(k, v); },
    removeItem: (k: string) => { almacen.delete(k); },
};

const vistos: string[] = [];
let aceptado = 'nuevo';
globalThis.fetch = (async (_url: string, init: RequestInit = {}) => {
    const h = new Headers(init.headers);
    vistos.push(h.get('Authorization') || '(sin)');
    const bien = h.get('Authorization') === `Bearer ${aceptado}`;
    return new Response(bien ? 'bien' : '{"detail":"x"}', { status: bien ? 200 : 401 });
}) as typeof fetch;

const m = await import('../src/lib/sesion-api.ts');
const otraVentana = () => new Promise((r) => setTimeout(r, 5_100));   // caduca la renovación compartida

await prueba('un 401 con el token viejo renueva y repite UNA vez, con el mismo cuerpo', async () => {
    const r = await m.fetchConSesion('https://api/x', { method: 'POST', body: 'cuerpo' });
    assert.equal(r.status, 200);
    assert.deepEqual(vistos, ['Bearer viejo', 'Bearer nuevo']);
});

await prueba('si la renovación trae el mismo token, no repite', async () => {
    vistos.length = 0;
    aceptado = 'otro-que-nunca-llega';
    const r = await m.fetchConSesion('https://api/x');
    assert.equal(r.status, 401);
    assert.equal(vistos.length, 1);
});

await prueba('cinco 401 a la vez gastan UNA renovación', async () => {
    await otraVentana();
    vistos.length = 0;
    sesion = { access_token: 'viejo2', user: { id: 'u1', email: 'a@b.mx' } };
    aceptado = renovarDa = 'nuevo2';
    renovaciones = 0;
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => m.fetchConSesion('https://api/x')));
    assert.ok(rs.every((r) => r.status === 200));
    assert.equal(renovaciones, 1);
});

await prueba('sin sesión: va sin cabecera y devuelve el 401 tal cual', async () => {
    await otraVentana();
    vistos.length = 0;
    sesion = null;
    aceptado = 'nadie';
    renovarDa = null;
    const r = await m.fetchConSesion('https://api/x');
    assert.equal(r.status, 401);
    assert.equal(vistos[0], '(sin)');
});

await prueba('si getSession() no contesta, sirve la sesión guardada vigente', async () => {
    getSessionCuelga = true;
    almacen.set('iurexia-auth', JSON.stringify({
        access_token: 'guardado', expires_at: Date.now() / 1000 + 600, user: { id: 'u1', email: 'a@b.mx' } }));
    const s = await m.sesionParaApi();
    assert.equal(s.token, 'guardado');
});

await prueba('…y una guardada ya vencida no se manda', async () => {
    almacen.set('iurexia-auth', JSON.stringify({
        access_token: 'vencido', expires_at: Date.now() / 1000 - 5, user: { id: 'u1', email: 'a@b.mx' } }));
    const s = await m.sesionParaApi();
    assert.equal(s.token, null);
});

console.log(process.exitCode ? 'HAY FALLOS' : `TODO PASA (${pasadas})`);
// El getSession colgado deja una promesa viva para siempre: se sale a mano.
process.exit(process.exitCode ?? 0);
