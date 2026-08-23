/**
 * A dónde llevar al usuario después de iniciar sesión o registrarse.
 *
 * POR QUÉ EXISTE
 * --------------
 * La página de precios manda al visitante a `/login?redirect=/precios` cuando
 * toca un plan sin haber entrado. Alguien diseñó ese parámetro con intención…
 * y ninguna de las tres puertas de entrada lo leía: login, registro y el
 * retorno de Google/Apple empujaban siempre a `/chat`.
 *
 * Eso importa más de lo que parece: medido el 22-ago-2026, **91 de 126
 * clientes de pago (72%) compraron el mismo día que se registraron**. La ruta
 * dominante de compra es exactamente «me registro para comprar», y esa ruta
 * terminaba soltando al abogado en el chat, lejos del botón que iba a tocar.
 *
 * EL CANDADO
 * ----------
 * Un destino que llega por la URL es texto de un desconocido. Si se obedece a
 * ciegas, `?redirect=https://sitio-falso.mx` convierte nuestro login en un
 * trampolín para robar credenciales. Por eso sólo se aceptan rutas internas:
 * empiezan con una sola barra y no con `//` ni con `/\`, que el navegador
 * interpreta como otro dominio.
 */
const DESTINO_POR_OMISION = '/chat';

export function destinoTrasEntrar(
    destinoCrudo: string | null | undefined,
    porOmision: string = DESTINO_POR_OMISION,
): string {
    if (!destinoCrudo) return porOmision;
    const d = destinoCrudo.trim();
    // Sólo rutas internas: '/algo'. Se rechaza '//otro-sitio', '/\otro-sitio',
    // 'https://…' y cualquier cosa con esquema.
    if (!d.startsWith('/')) return porOmision;
    if (d.startsWith('//') || d.startsWith('/\\')) return porOmision;
    return d;
}

/** Guarda el destino para el viaje de ida y vuelta de Google/Apple, que
 *  vuelven por `/auth/callback` y pierden los parámetros del principio. */
export const LLAVE_DESTINO = 'iurexia:destino-tras-entrar';

export function recordarDestino(destino: string | null | undefined) {
    try {
        const limpio = destinoTrasEntrar(destino, '');
        if (limpio) sessionStorage.setItem(LLAVE_DESTINO, limpio);
        else sessionStorage.removeItem(LLAVE_DESTINO);
    } catch { /* sin sessionStorage: se cae al destino por omisión */ }
}

export function recogerDestino(): string {
    try {
        const guardado = sessionStorage.getItem(LLAVE_DESTINO);
        sessionStorage.removeItem(LLAVE_DESTINO);
        return destinoTrasEntrar(guardado);
    } catch {
        return DESTINO_POR_OMISION;
    }
}
