/**
 * QUIÉN PUEDE MOVER EL ESTADO DE ATENCIÓN, sin secreto compartido (29-oct-2026).
 *
 * /api/soporte/atencion la llama el Apps Script de soporte@ cada 10 minutos.
 * Con una clave compartida (SOPORTE_ATENCION_KEY) había que escribir el mismo
 * valor a mano en Vercel y en las propiedades del script, y eso no se puede
 * automatizar. En su lugar el script manda el token de identidad de la cuenta
 * que lo ejecuta (`ScriptApp.getIdentityToken()`): un JWT que firma Google y
 * que dice «soy soporte@iurexia.com, correo verificado», válido una hora. Nadie
 * más puede fabricarlo y no hay nada que guardar.
 *
 * Lo que se exige (`verificarTokenGoogle`):
 *   · firma RS256 con una de las llaves públicas de Google (`CERTS_GOOGLE`),
 *     guardadas lo que diga su Cache-Control;
 *   · emisor accounts.google.com y sin vencer (con un minuto de holgura);
 *   · email == soporte@iurexia.com y email_verified == true;
 *   · si se fijaron audiencias, `aud` (el client ID del proyecto de Apps
 *     Script) entre ellas. Sin fijar, vale cualquiera: también un token de
 *     soporte@ emitido para otra aplicación (un sitio donde soporte@ entró
 *     con Google). Por eso la ruta escribe en el registro la primera que ve.
 *
 * Sin dependencias: `node:crypto` importa las llaves JWK y verifica RS256
 * (jose sólo está en node_modules como dependencia de next-auth). Tampoco
 * importa nada de Next ni de Supabase: se prueba con
 * `node _pruebas/atencion-identidad.mts`, sin red.
 */

import { createHash, createPublicKey, timingSafeEqual, verify, type JsonWebKey, type KeyObject } from 'node:crypto';

export const CERTS_GOOGLE = 'https://www.googleapis.com/oauth2/v3/certs';
export const EMISORES_GOOGLE: readonly string[] = ['accounts.google.com', 'https://accounts.google.com'];
export const CORREO_ATENCION = 'soporte@iurexia.com';

/** Holgura de reloj entre Google, Apps Script y Vercel. */
export const HOLGURA_S = 60;
/** Un token de Google vive una hora; más de un día no es suyo. */
const VIDA_MAXIMA_TOKEN_S = 86_400;
/** Sin Cache-Control, las llaves se guardan una hora; nunca menos de un minuto ni más de un día. */
const VIDA_LLAVES_S = { porDefecto: 3_600, minima: 60, maxima: 86_400 };
/** Si Google no contesta, se siguen usando las llaves de antes hasta un día después de vencidas. */
const GRACIA_LLAVES_MS = 86_400_000;
/** Una llave desconocida puede ser nueva (Google rota): se vuelven a pedir, a lo más una vez por minuto. */
const ESPERA_RECARGA_MS = 60_000;

export interface LlaveGoogle extends JsonWebKey { kid?: string; alg?: string; use?: string }

/** Da la llave pública de un `kid`, o null si no existe. Lanza si no se pudieron obtener. */
export type Llavero = (kid: string) => Promise<KeyObject | null>;

export interface Identidad {
    email: string;
    aud: string;
    azp: string | null;
    sub: string | null;
    hd: string | null;
    exp: number;
}

export type Verificacion =
    | { ok: true; identidad: Identidad }
    | { ok: false; motivo: string; transitorio?: true; email?: string; aud?: string };

export interface OpcionesVerificacion {
    /** Llaves públicas en lugar de las de Google (pruebas). */
    llaves?: LlaveGoogle[];
    /** Quién da las llaves; por omisión, las de Google con caché. */
    llavero?: Llavero;
    /** El único correo que pasa (por omisión, soporte@iurexia.com). */
    correo?: string;
    /** Si no está vacía, `aud` tiene que ser una de éstas. */
    audiencias?: readonly string[];
    /** Reloj en ms (pruebas). */
    ahora?: number;
}

/* ───────────────────── las llaves de Google ───────────────────── */

/** Un Map y no un objeto: un `kid` como «constructor» no encuentra nada. */
type Llaves = Map<string, KeyObject>;

function importarLlaves(lista: unknown): Llaves {
    const llaves: Llaves = new Map();
    if (!Array.isArray(lista)) return llaves;
    for (const k of lista as LlaveGoogle[]) {
        if (!k || typeof k !== 'object' || k.kty !== 'RSA' || typeof k.kid !== 'string' || !k.kid) continue;
        if (k.alg && k.alg !== 'RS256') continue;
        if (k.use && k.use !== 'sig') continue;
        try {
            const llave = createPublicKey({ key: { kty: 'RSA', n: k.n, e: k.e }, format: 'jwk' });
            if (llave.asymmetricKeyType === 'rsa') llaves.set(k.kid, llave);
        } catch { /* llave mal formada: se ignora */ }
    }
    return llaves;
}

function vidaDe(cacheControl: string | null): number {
    const m = /max-age=(\d+)/i.exec(cacheControl || '');
    const s = m ? Number(m[1]) : VIDA_LLAVES_S.porDefecto;
    return Math.min(VIDA_LLAVES_S.maxima, Math.max(VIDA_LLAVES_S.minima, s));
}

/**
 * Las llaves públicas de `url`, guardadas lo que diga su Cache-Control. Dos
 * pedidos a la vez comparten la descarga; un `kid` desconocido vuelve a
 * pedirlas (Google publica la llave nueva antes de usarla, pero por si acaso).
 * `fetch` se toma al llamar, no al crear: así lo sustituyen las pruebas.
 */
export function crearLlavero(op: { url?: string; fetch?: typeof fetch; reloj?: () => number } = {}): Llavero {
    const url = op.url ?? CERTS_GOOGLE;
    const reloj = op.reloj ?? (() => Date.now());
    let llaves: Llaves | null = null;
    let venceAt = 0;
    let pedidaAt = 0;
    let enCurso: Promise<void> | null = null;

    async function descargar(): Promise<void> {
        pedidaAt = reloj();
        const r = await (op.fetch ?? globalThis.fetch)(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status} de ${url}`);
        const nuevas = importarLlaves(((await r.json()) as { keys?: unknown } | null)?.keys);
        if (!nuevas.size) throw new Error(`${url} no trajo llaves RSA`);
        llaves = nuevas;
        venceAt = reloj() + vidaDe(r.headers.get('cache-control')) * 1000;
    }
    function recargar(): Promise<void> {
        if (!enCurso) enCurso = descargar().finally(() => { enCurso = null; });
        return enCurso;
    }

    return async (kid: string) => {
        if (!llaves || reloj() >= venceAt) {
            try {
                await recargar();
            } catch (e) {
                if (!llaves || reloj() - venceAt > GRACIA_LLAVES_MS) throw e;
                console.warn(`[identidad-google] no se renovaron las llaves (${(e as Error).message}); sigo con las de antes`);
            }
        }
        const conocida = llaves?.get(kid);
        if (conocida) return conocida;
        if (reloj() - pedidaAt < ESPERA_RECARGA_MS) return null;
        await recargar();   // si falla, lanza: no se sabe si la llave existe
        return llaves?.get(kid) ?? null;
    };
}

/** El de producción: uno por instancia, para que la caché sirva entre llamadas. */
const llaveroGoogle = crearLlavero();

function llaveroFijo(lista: LlaveGoogle[]): Llavero {
    const llaves = importarLlaves(lista);
    return async (kid: string) => llaves.get(kid) ?? null;
}

/* ───────────────────── el token ───────────────────── */

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function json64(parte: string): Record<string, unknown> | null {
    if (!BASE64URL.test(parte)) return null;
    try {
        const v: unknown = JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));
        return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
    } catch {
        return null;
    }
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export async function verificarTokenGoogle(token: string, op: OpcionesVerificacion = {}): Promise<Verificacion> {
    const t = String(token || '').trim();
    const partes = t.split('.');
    if (partes.length !== 3 || t.length > 8_192) return { ok: false, motivo: 'no es un JWT' };
    const h = partes[0], p = partes[1], s = partes[2];
    const cabecera = json64(h), carga = json64(p);
    if (!cabecera || !carga || !BASE64URL.test(s)) return { ok: false, motivo: 'no es un JWT' };
    // Lo único del token sin firma que llega al registro: recortado, para que no fabrique renglones.
    if (cabecera.alg !== 'RS256') return { ok: false, motivo: `algoritmo ${String(cabecera.alg).replace(/[^\w.-]/g, '').slice(0, 16)} no admitido` };
    const kid = texto(cabecera.kid);
    if (!kid) return { ok: false, motivo: 'sin kid' };

    let llave: KeyObject | null;
    try {
        llave = await (op.llavero ?? (op.llaves ? llaveroFijo(op.llaves) : llaveroGoogle))(kid);
    } catch (e) {
        return { ok: false, motivo: `llaves de Google no disponibles: ${(e as Error).message}`, transitorio: true };
    }
    if (!llave) return { ok: false, motivo: 'llave desconocida' };

    let firmaValida = false;
    try {
        firmaValida = verify('sha256', Buffer.from(`${h}.${p}`), llave, Buffer.from(s, 'base64url'));
    } catch {
        firmaValida = false;
    }
    if (!firmaValida) return { ok: false, motivo: 'firma inválida' };

    // De aquí en adelante la carga la firmó Google.
    const email = (texto(carga.email) ?? '').trim().toLowerCase();
    const auds = (Array.isArray(carga.aud) ? carga.aud : [carga.aud]).filter((a): a is string => typeof a === 'string' && !!a);
    const visto = { ...(email ? { email } : {}), ...(auds.length ? { aud: auds.join(' ') } : {}) };
    const ahora = Math.floor((op.ahora ?? Date.now()) / 1000);

    if (typeof carga.iss !== 'string' || EMISORES_GOOGLE.indexOf(carga.iss) < 0) return { ok: false, motivo: 'emisor ajeno', ...visto };
    if (typeof carga.exp !== 'number') return { ok: false, motivo: 'sin vencimiento', ...visto };
    if (ahora > carga.exp + HOLGURA_S) return { ok: false, motivo: 'token vencido', ...visto };
    if (typeof carga.iat === 'number') {
        if (carga.iat > ahora + HOLGURA_S) return { ok: false, motivo: 'emitido en el futuro', ...visto };
        if (carga.exp - carga.iat > VIDA_MAXIMA_TOKEN_S) return { ok: false, motivo: 'vida demasiado larga', ...visto };
    }
    if (typeof carga.nbf === 'number' && carga.nbf > ahora + HOLGURA_S) return { ok: false, motivo: 'todavía no vale', ...visto };
    if (!auds.length) return { ok: false, motivo: 'sin audiencia', ...visto };
    if (!email) return { ok: false, motivo: 'el token no trae email: falta el scope userinfo.email en appsscript.json', ...visto };
    if (email !== (op.correo ?? CORREO_ATENCION).toLowerCase()) return { ok: false, motivo: 'correo no autorizado', ...visto };
    // Google lo manda como booleano; la cadena «true» es la misma afirmación, también firmada.
    if (carga.email_verified !== true && carga.email_verified !== 'true') return { ok: false, motivo: 'correo sin verificar', ...visto };
    const audiencias = op.audiencias ?? [];
    if (audiencias.length && !auds.some(a => audiencias.indexOf(a) >= 0)) return { ok: false, motivo: 'audiencia no fijada', ...visto };

    return {
        ok: true,
        identidad: { email, aud: auds[0], azp: texto(carga.azp), sub: texto(carga.sub), hd: texto(carga.hd), exp: carga.exp },
    };
}

/* ───────────────────── la decisión de la ruta ───────────────────── */

export type Autorizacion =
    | { ok: true; via: 'identidad'; identidad: Identidad }
    | { ok: true; via: 'clave' }
    | { ok: false; status: 401 | 503; motivo: string; email?: string; aud?: string };

function mismaClave(a: string, b: string): boolean {
    const h = (x: string) => createHash('sha256').update(x).digest();
    return timingSafeEqual(h(a), h(b));
}

/**
 * Pasa el token de identidad de soporte@ (`Authorization: Bearer …`) o, sólo
 * si el servidor la tiene configurada, la clave de antes (`x-atencion-key`).
 * Lo demás es 401; 503 sólo si un token no se pudo revisar porque Google no
 * dio sus llaves, para no confundirlo con un token malo.
 */
export async function autorizarAtencion(
    pedido: { authorization: string | null; clave: string | null },
    config: { clave?: string | null; audiencias?: readonly string[] },
    op: OpcionesVerificacion = {},
): Promise<Autorizacion> {
    const m = /^Bearer\s+(\S+)\s*$/i.exec(pedido.authorization || '');
    let fallo: Extract<Verificacion, { ok: false }> | null = null;
    if (m) {
        const v = await verificarTokenGoogle(m[1], { ...op, audiencias: config.audiencias ?? op.audiencias });
        if (v.ok) return { ok: true, via: 'identidad', identidad: v.identidad };
        fallo = v;
    }
    if (config.clave && pedido.clave && mismaClave(pedido.clave, config.clave)) return { ok: true, via: 'clave' };
    if (fallo) {
        return {
            ok: false, status: fallo.transitorio ? 503 : 401, motivo: fallo.motivo,
            ...(fallo.email ? { email: fallo.email } : {}), ...(fallo.aud ? { aud: fallo.aud } : {}),
        };
    }
    if (pedido.clave) return { ok: false, status: 401, motivo: config.clave ? 'clave incorrecta' : 'la clave no está habilitada: mande el token de identidad' };
    return { ok: false, status: 401, motivo: 'sin credenciales' };
}

/** Cada audiencia distinta se registra una vez por instancia: así se sabe cuál fijar. */
const audienciasVistas = new Set<string>();
export function audienciaNueva(aud: string): boolean {
    if (audienciasVistas.has(aud)) return false;
    audienciasVistas.add(aud);
    return true;
}
