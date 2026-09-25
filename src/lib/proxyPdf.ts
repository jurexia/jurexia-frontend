/**
 * LA DIRECCIÓN CANÓNICA DE UN PDF DE LA CORTE IDH (25-sep-2026).
 *
 * El visor lee las sentencias de corteidh.or.cr a través de nuestro proxy
 * (`/api/ley/pdf?u=…`), y el CDN de Vercel guarda cada respuesta con la URL
 * COMPLETA del proxy como llave. Medido en la vista previa del 25-sep-2026:
 * `…seriec_154_esp.pdf?x=1` dio MISS mientras la canónica daba HIT. Lo mismo
 * pasa con `corteidh.or.cr` frente a `www.corteidh.or.cr`, con `http://`
 * frente a `https://` y con el host en mayúsculas: cuatro maneras de escribir
 * el mismo archivo son cuatro descargas desde el origen.
 *
 * Por eso hay UNA forma de pedirlo, y este módulo la construye tanto en el
 * visor (que pide) como en el proxy (que redirige con 308 lo que llegue de
 * otra forma). Si las dos puntas usaran reglas distintas, el proxy mandaría
 * al visor a una dirección que el visor nunca pide y el CDN se partiría igual.
 *
 * Funciones puras: ni React ni `next/server`, para que las importen el
 * componente y la ruta.
 */

/** El repositorio oficial de la Corte, con y sin `www.`. */
export const HOSTS_CORTEIDH = ['www.corteidh.or.cr', 'corteidh.or.cr'];

/**
 * Sólo el repositorio de resoluciones: casos, opiniones consultivas y
 * supervisiones, y sólo archivos .pdf. El resto del sitio (el buscador en
 * ColdFusion, las fichas técnicas, los formularios) queda fuera. Sin
 * distinguir mayúsculas, porque el catálogo mezcla `seriec_N_esp.pdf` con
 * nombres en mayúsculas y sufijos (`_esp1`, `_esp2`).
 *
 * Quedan fuera, a sabiendas, 34 de los 892 PDF de supervisiones que viven en
 * `/docs/asuntos` (24) y `/docs/medidas` (10): son de F4, no del piloto.
 */
export const RUTA_CORTEIDH = /^\/docs\/(casos|opiniones|supervisiones)\/.+\.pdf$/i;

/** `&v=` son los 8 primeros caracteres del sha1 del PDF que se troceó. */
export const VERSION_PDF = /^[0-9a-f]{8}$/;

/**
 * `https://www.corteidh.or.cr/docs/…pdf`, o null si la dirección no es del
 * repositorio de la Corte o no pasa la puerta.
 *
 * `http://` se acepta y se sube a `https://` ANTES de la puerta: en el
 * catálogo de sentencias 781 de las 937 cadenas `.pdf` vienen en `http://`
 * (revisión del proxy, 25-sep-2026), y rechazarlas dejaba fuera casi todo.
 * `URL` ya bajó el host a minúsculas y resolvió los `..` (también `%2e%2e`)
 * antes de mirar la ruta. La ruta se conserva tal cual: el servidor de la
 * Corte no está comprobado como insensible a mayúsculas, y bajarla podría
 * pedir un archivo que no existe.
 */
export function canonCorteIDH(cruda: string | null | undefined): string | null {
    if (!cruda) return null;
    let u: URL;
    try {
        u = new URL(cruda);
    } catch {
        return null;
    }
    if (!HOSTS_CORTEIDH.includes(u.hostname)) return null;
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    // Sin puerto raro y sin credenciales. `URL` deja el puerto vacío cuando es
    // el de omisión de su esquema (80 en http, 443 en https).
    if (u.port !== '' || u.username !== '' || u.password !== '') return null;
    if (!RUTA_CORTEIDH.test(u.pathname)) return null;
    // `URL` resuelve `..` y `%2e%2e`, pero NO decodifica `%2F` ni `%5C`:
    // `/docs/casos/..%2F..%2Fotra.pdf` pasaba la puerta y el servidor de la
    // Corte podía entenderlo como un salto fuera de `/docs/casos` (revisión
    // del 25-sep-2026). Ninguna de las 2,320 URL del catálogo los usa (sí
    // `%20` y `%c3%b1`, que se quedan), así que se cierran.
    if (/%2f|%5c|%00/i.test(u.pathname)) return null;
    return `https://www.corteidh.or.cr${u.pathname}`;
}

/** La versión que se pone en `&v=`: 8 hexadecimales en minúsculas, o ''. */
export function versionPdf(v: string | null | undefined): string {
    const corta = (v || '').trim().slice(0, 8).toLowerCase();
    return VERSION_PDF.test(corta) ? corta : '';
}

/**
 * La consulta canónica del proxy: `?u=<canónica codificada>[&v=<sha1[:8]>]`.
 * Se codifica con `encodeURIComponent`, que es lo que el visor ya hacía, para
 * que la llave del CDN de las leyes no cambie.
 */
export function consultaProxy(canonica: string, version?: string | null): string {
    const v = versionPdf(version);
    return `?u=${encodeURIComponent(canonica)}${v ? `&v=${v}` : ''}`;
}

/**
 * Lo que el visor pide a nuestro dominio para un PDF.
 *
 *  - Corte IDH: la forma canónica, con `&v=` si se conoce el sha1 del PDF que
 *    se troceó (así un PDF que la Corte reemplace abre una llave nueva en vez
 *    de servir 30 días la copia vieja).
 *  - Corte IDH FUERA de la puerta (`/docs/medidas`, `/docs/asuntos`: 794 de
 *    las 2,320 resoluciones del catálogo, y el backend las manda como fichas):
 *    null. Pedirlas al proxy era pedir un 403 seguro y esperar a que pdf.js
 *    fallara para enseñar el enlace directo; con null el visor lo enseña de
 *    entrada (revisión del 25-sep-2026).
 *  - Lo demás: como siempre, sólo si es https; si no, la dirección tal cual.
 */
export function urlProxyPdf(u: string | null | undefined, version?: string | null): string | null {
    if (!u) return null;
    const canon = canonCorteIDH(u);
    if (canon) return `/api/ley/pdf${consultaProxy(canon, version)}`;
    if (esDeLaCorte(u)) return null;
    return /^https:\/\//.test(u) ? `/api/ley/pdf?u=${encodeURIComponent(u)}` : u;
}

/** ¿La dirección es de corteidh.or.cr, pase o no la puerta? */
function esDeLaCorte(u: string): boolean {
    try {
        return HOSTS_CORTEIDH.includes(new URL(u).hostname);
    } catch {
        return false;
    }
}

/**
 * EL PROXY NO SIGUE REDIRECCIONES A CIEGAS (revisión del 25-sep-2026).
 *
 * `fetch` sigue las redirecciones por omisión: la puerta miraba la primera
 * dirección y el proxy podía acabar sirviendo lo que la Corte —o quien
 * controlara una redirección suya— mandara después, fuera de
 * `/docs/(casos|opiniones|supervisiones)` o fuera de corteidh.or.cr. Aquí se
 * sigue a mano, hasta tres saltos, y sólo si el destino pasa la MISMA puerta.
 * Una redirección DENTRO de la puerta (un PDF renombrado en la misma carpeta)
 * se sigue igual que antes; sólo cambia lo que sale de ella. Que la forma
 * canónica no redirija hoy no está medido: el fetch anterior seguía los
 * saltos sin dejar rastro, y las mediciones de la vista previa sólo vieron
 * el 200 final.
 *
 * Devuelve la respuesta final, o `{ bloqueada }` con el estado de la
 * redirección que no pasó la puerta. `traer` se inyecta para probarlo sin red.
 */
export async function traerCorteIDH(
    canonica: string,
    init: RequestInit,
    traer: typeof fetch = fetch,
): Promise<Response | { bloqueada: number }> {
    let destino = canonica;
    for (let salto = 0; salto <= 3; salto++) {
        const r = await traer(destino, { ...init, redirect: 'manual' });
        if (r.status < 300 || r.status >= 400 || r.status === 304) return r;
        const ubicacion = r.headers.get('location');
        let siguiente: string | null = null;
        try {
            siguiente = ubicacion ? canonCorteIDH(new URL(ubicacion, destino).toString()) : null;
        } catch {
            siguiente = null;
        }
        if (!siguiente || salto === 3) return { bloqueada: r.status };
        destino = siguiente;
    }
    return { bloqueada: 0 };
}

/**
 * La puerta del proxy para la Corte, separada de la ruta para poder probarla
 * sin levantar Next.
 *
 *  - null: la dirección es de la Corte pero no pasa la puerta (→ 403).
 *  - `ubicacion` null: la petición ya llegó en la forma canónica; se sirve.
 *  - `ubicacion` con valor: la consulta canónica a la que hay que mandar con
 *    308 para no partir la llave del CDN.
 *
 * Se compara lo LEÍDO (`u` y `v` ya decodificados, y qué parámetros vienen),
 * no la cadena cruda: los navegadores recodifican algunos caracteres del
 * query (la comilla simple, por ejemplo) y comparar cadenas podría redirigir
 * en bucle a la misma dirección. El precio, aceptado: `?u=https://www…` SIN
 * codificar se sirve y ocupa otra llave. El visor siempre la pide codificada
 * (`urlProxyPdf`); sólo un enlace escrito a mano cae ahí.
 */
export function puertaCorteIDH(params: URLSearchParams): { canonica: string; ubicacion: string | null } | null {
    const cruda = params.get('u');
    const canonica = canonCorteIDH(cruda);
    if (!canonica) return null;
    const nombres = Array.from(params.keys()).join(',');
    const vCruda = params.get('v');
    const v = versionPdf(vCruda);
    const yaCanonica =
        cruda === canonica &&
        (nombres === 'u' || (nombres === 'u,v' && v !== '' && vCruda === v));
    return { canonica, ubicacion: yaCanonica ? null : consultaProxy(canonica, v) };
}
