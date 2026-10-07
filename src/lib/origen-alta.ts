/**
 * DE DÓNDE VINO CADA ALTA (6-oct-2026).
 *
 * Hasta hoy no se sabía qué anuncio había traído a quién: los enlaces de Meta
 * llegan con `utm_*` y `fbclid` a /registro, pero nadie los leía, y el alta con
 * Google o Apple se lleva al usuario a otro dominio y lo devuelve por
 * /auth/callback sin un solo parámetro del principio. Por eso el primer
 * contacto se guarda en localStorage al aterrizar —en cualquier página— y se
 * lee cuando la cuenta ya existe, aunque haya habido un viaje de ida y vuelta
 * por OAuth de por medio.
 *
 * QUÉ SE GUARDA Y CUÁNTO DURA
 * ---------------------------
 * Sólo si la URL trae algún `utm_*` o un `fbclid`. El PRIMER contacto manda
 * durante 30 días: un segundo clic no le roba la alta al anuncio que trajo a
 * la persona. La excepción es el `fbclid`: si llega uno nuevo se actualizan
 * `fbclid` y `fbc`, porque Meta atribuye por el clic más reciente y un `fbc`
 * viejo empeora la coincidencia.
 *
 * LA COOKIE `_fbc` Y EL CONSENTIMIENTO
 * ------------------------------------
 * `_fbc` es la cookie con la que el píxel de Meta recuerda el clic. Se escribe
 * SÓLO con permiso de «Marketing» en el aviso de cookies (quien llama decide:
 * ver `asegurarCookieFbc`), igual que el píxel. Lo que va a localStorage es
 * atribución propia —qué campaña trajo la alta— y no sale de Iurexia salvo
 * que ese permiso exista.
 *
 * Este módulo no importa nada de la aplicación (ni Supabase ni el aviso de
 * cookies): las funciones puras se prueban con node y las que tocan el
 * navegador van todas en try/catch, porque en navegación privada o con el
 * almacenamiento bloqueado lo correcto es no medir, no romper la página.
 */

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
        _fbq?: unknown;
    }
}

export const LLAVE_ORIGEN = 'iurexia:origen-alta';
const LLAVE_MEDIDA = 'iurexia:alta-medida:';
const LLAVE_PENDIENTES = 'iurexia:meta-pendientes';

/** El primer contacto manda durante 30 días. */
export const VIGENCIA_PRIMER_CONTACTO_MS = 30 * 24 * 60 * 60 * 1000;
/** Lo que vive la cookie `_fbc`, como la del propio píxel. */
const VIDA_FBC_S = 90 * 24 * 60 * 60;
/** Una cuenta creada hace menos de esto, al volver de Google/Apple, es un alta. */
export const VENTANA_ALTA_MS = 30 * 60 * 1000;

const PARAMS_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const LARGO_MAXIMO = 200;

export interface OrigenAlta {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    fbclid?: string;
    /** `fb.1.<ms>.<fbclid>` calculado al aterrizar, con la hora del clic. */
    fbc?: string;
    landing_path?: string;
    referrer?: string;
    /** ISO 8601. */
    primer_contacto: string;
}

// ─── Funciones puras ────────────────────────────────────────────────────────

/** El formato oficial de `_fbc`: `fb.1.<timestamp en ms>.<fbclid>`, sin tocar el fbclid. */
export function formatoFbc(fbclid: string, momentoMs: number): string {
    return `fb.1.${Math.floor(momentoMs)}.${fbclid}`;
}

function recortar(v: string | null | undefined): string | undefined {
    if (typeof v !== 'string') return undefined;
    const limpio = v.trim();
    return limpio ? limpio.slice(0, LARGO_MAXIMO) : undefined;
}

/** Sólo origen y ruta del referrer: su query puede llevar datos de otro sitio. */
export function referrerSinQuery(referrer: string | null | undefined): string | undefined {
    if (!referrer) return undefined;
    try {
        const u = new URL(referrer);
        return recortar(u.origin + u.pathname);
    } catch {
        return undefined;
    }
}

/**
 * Lo que debe quedar guardado después de aterrizar en una página con `query`.
 * Devuelve `previo` tal cual si la URL no trae nada que medir.
 */
export function fusionarOrigen(
    previo: OrigenAlta | null,
    query: string,
    ahoraMs: number,
    landingPath: string,
    referrer: string | null | undefined,
): OrigenAlta | null {
    const q = new URLSearchParams(query);
    const utm: Partial<OrigenAlta> = {};
    let hayUtm = false;
    for (const p of PARAMS_UTM) {
        const v = recortar(q.get(p));
        if (v) { utm[p] = v; hayUtm = true; }
    }
    // El fbclid se guarda tal cual llega (Meta distingue mayúsculas), sólo
    // recortado si viniera monstruoso.
    const fbclidCrudo = q.get('fbclid');
    const fbclid = fbclidCrudo && fbclidCrudo.trim() ? fbclidCrudo.trim().slice(0, 500) : undefined;

    if (!hayUtm && !fbclid) return previo;

    const inicioPrevio = previo ? Date.parse(previo.primer_contacto) : NaN;
    const vigente = previo !== null
        && Number.isFinite(inicioPrevio)
        && ahoraMs - inicioPrevio < VIGENCIA_PRIMER_CONTACTO_MS;

    if (!vigente) {
        const nuevo: OrigenAlta = {
            ...utm,
            landing_path: recortar(landingPath),
            referrer: referrerSinQuery(referrer),
            primer_contacto: new Date(ahoraMs).toISOString(),
        };
        if (fbclid) {
            nuevo.fbclid = fbclid;
            nuevo.fbc = formatoFbc(fbclid, ahoraMs);
        }
        return nuevo;
    }

    // Primer contacto vigente: se conserva; sólo un fbclid NUEVO lo actualiza.
    if (fbclid && fbclid !== previo!.fbclid) {
        return { ...previo!, fbclid, fbc: formatoFbc(fbclid, ahoraMs) };
    }
    return previo;
}

/** ¿La cuenta se creó hace poco? `createdAt` es la hora de Supabase. */
export function esAltaReciente(createdAt: string | null | undefined, ahoraMs: number): boolean {
    if (!createdAt) return false;
    const creado = Date.parse(createdAt);
    if (!Number.isFinite(creado)) return false;
    // Un reloj local atrasado deja la creación «en el futuro»: también cuenta.
    return ahoraMs - creado < VENTANA_ALTA_MS;
}

/**
 * El dominio de la cookie: `.iurexia.com` en producción (el mismo que usa el
 * píxel, para que no convivan dos `_fbc`), y el host actual en cualquier otro
 * sitio (localhost, vistas previas de Vercel).
 */
export function dominioCookie(host: string): string | undefined {
    const h = host.toLowerCase();
    if (h === 'iurexia.com' || h.endsWith('.iurexia.com')) return '.iurexia.com';
    return undefined;
}

// ─── Navegador ──────────────────────────────────────────────────────────────

function hayNavegador(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function leerOrigen(): OrigenAlta | null {
    if (!hayNavegador()) return null;
    try {
        const crudo = window.localStorage.getItem(LLAVE_ORIGEN);
        if (!crudo) return null;
        const o = JSON.parse(crudo);
        return o && typeof o === 'object' && typeof o.primer_contacto === 'string' ? o as OrigenAlta : null;
    } catch {
        return null;
    }
}

/** Al aterrizar en cualquier página: guarda el primer contacto si la URL trae algo que medir. */
export function capturarOrigen(): void {
    if (!hayNavegador()) return;
    try {
        const previo = leerOrigen();
        const nuevo = fusionarOrigen(
            previo,
            window.location.search,
            Date.now(),
            window.location.pathname,
            document.referrer,
        );
        if (nuevo && nuevo !== previo) {
            window.localStorage.setItem(LLAVE_ORIGEN, JSON.stringify(nuevo));
        }
    } catch { /* sin almacenamiento no se mide */ }
}

export function leerCookie(nombre: string): string | undefined {
    if (!hayNavegador()) return undefined;
    try {
        const prefijo = nombre + '=';
        const partes = document.cookie ? document.cookie.split('; ') : [];
        for (const p of partes) {
            if (p.indexOf(prefijo) === 0) {
                const v = decodeURIComponent(p.slice(prefijo.length));
                return v || undefined;
            }
        }
    } catch { /* cookies bloqueadas */ }
    return undefined;
}

/**
 * Si hubo un clic de Meta y no existe `_fbc`, la crea con el valor guardado
 * al aterrizar (90 días). Sólo debe llamarse con permiso de Marketing.
 */
export function asegurarCookieFbc(): void {
    if (!hayNavegador()) return;
    try {
        if (leerCookie('_fbc')) return;
        const fbc = leerOrigen()?.fbc;
        if (!fbc) return;
        const dominio = dominioCookie(window.location.hostname);
        const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `_fbc=${encodeURIComponent(fbc)}; Max-Age=${VIDA_FBC_S}; Path=/; SameSite=Lax`
            + (dominio ? `; Domain=${dominio}` : '') + seguro;
    } catch { /* cookies bloqueadas */ }
}

/** El `fbc` vigente: la cookie si existe (la escribe el píxel o `asegurarCookieFbc`), si no, el guardado. */
export function leerFbc(): string | undefined {
    return leerCookie('_fbc') || leerOrigen()?.fbc;
}

export function leerFbp(): string | undefined {
    return leerCookie('_fbp');
}

// ─── Eventos del píxel que llegan antes que el píxel ─────────────────────────

interface EventoPendiente { evento: string; eventID: string }

function leerPendientes(): EventoPendiente[] {
    try {
        const crudo = window.sessionStorage.getItem(LLAVE_PENDIENTES);
        const lista = crudo ? JSON.parse(crudo) : [];
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}

/**
 * Manda un evento al píxel, o lo deja apuntado si el píxel aún no cargó (al
 * volver de Google, el alta puede detectarse antes de que exista `fbq`).
 */
export function rastrearMeta(evento: string, eventID: string): void {
    if (!hayNavegador()) return;
    try {
        if (typeof window.fbq === 'function') {
            window.fbq('track', evento, {}, { eventID });
            return;
        }
        const lista = leerPendientes();
        if (!lista.some(e => e.eventID === eventID && e.evento === evento)) {
            lista.push({ evento, eventID });
            window.sessionStorage.setItem(LLAVE_PENDIENTES, JSON.stringify(lista.slice(-5)));
        }
    } catch { /* nada que hacer */ }
}

/** Lo llama el píxel en cuanto existe `fbq`. */
export function dispararPendientes(): void {
    if (!hayNavegador() || typeof window.fbq !== 'function') return;
    try {
        const lista = leerPendientes();
        if (!lista.length) return;
        window.sessionStorage.removeItem(LLAVE_PENDIENTES);
        for (const e of lista) window.fbq('track', e.evento, {}, { eventID: e.eventID });
    } catch { /* nada que hacer */ }
}

// ─── El alta ────────────────────────────────────────────────────────────────

export interface SesionParaAlta {
    access_token: string;
    user: { id: string; created_at?: string | null };
}

/**
 * Mide una alta UNA sola vez por usuario y navegador:
 *   · en el navegador, `CompleteRegistration` con eventID `reg_<id>` (si hay
 *     permiso de Marketing);
 *   · en el servidor, `/api/medicion/alta` guarda el origen y manda el mismo
 *     evento por la API de Conversiones —Meta deduplica por el eventID—.
 *
 * `nueva` viene del alta por correo (`r.nueva`, dicho por el servidor). Sin
 * él —el retorno de Google/Apple— se decide por `created_at`; el servidor
 * vuelve a comprobarlo con su propio reloj antes de guardar nada.
 *
 * Nunca lanza: medir no puede estorbar a quien se está registrando.
 */
export async function medirAlta(opciones: {
    sesion: SesionParaAlta;
    marketing: boolean;
    nueva?: boolean;
}): Promise<void> {
    if (!hayNavegador()) return;
    try {
        const { sesion, marketing } = opciones;
        const id = sesion.user.id;
        if (!id || !sesion.access_token) return;
        const esNueva = opciones.nueva ?? esAltaReciente(sesion.user.created_at, Date.now());
        if (!esNueva) return;

        try {
            if (window.localStorage.getItem(LLAVE_MEDIDA + id)) return;
            window.localStorage.setItem(LLAVE_MEDIDA + id, new Date().toISOString());
        } catch { /* sin almacenamiento: se mide igual; Meta deduplica */ }

        if (marketing) {
            asegurarCookieFbc();
            rastrearMeta('CompleteRegistration', 'reg_' + id);
        }

        await fetch('/api/medicion/alta', {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sesion.access_token}`,
            },
            body: JSON.stringify({
                origen: leerOrigen(),
                fbc: marketing ? leerFbc() : undefined,
                fbp: marketing ? leerFbp() : undefined,
                consiente_marketing: marketing,
                url: window.location.origin + window.location.pathname,
            }),
        }).catch(() => undefined);
    } catch { /* medir nunca rompe el alta */ }
}
