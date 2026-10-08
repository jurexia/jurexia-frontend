/**
 * ¿La página se abrió dentro del navegador integrado de otra app?
 *
 * Instagram, Facebook, Messenger, TikTok, LinkedIn y otras abren los enlaces en
 * un «webview» propio. Google bloquea ahí el inicio de sesión con Google (error
 * `disallowed_useragent`, desde el 30-sep-2021) y avisa que puede afectar a
 * cualquier sitio abierto desde otra app. El 82 % de las altas de Iurexia entra
 * con Google, y el tráfico de los anuncios llega casi todo desde Instagram y
 * Facebook: quien toca «Continuar con Google» ahí se queda sin entrar.
 *
 * Función pura: recibe el `user-agent` y devuelve el nombre de la app, o null.
 */

const APPS: Array<[RegExp, string]> = [
    [/Instagram/i, 'Instagram'],
    [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
    [/Messenger|MessengerForiOS/i, 'Messenger'],
    [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
    [/LinkedInApp/i, 'LinkedIn'],
    [/Twitter/i, 'X'],
    [/Snapchat/i, 'Snapchat'],
    [/Pinterest/i, 'Pinterest'],
    [/\bLine\//, 'Line'],
];

export function appDelNavegadorIntegrado(userAgent: string | null | undefined): string | null {
    const ua = (userAgent ?? '').trim();
    if (!ua) return null;
    for (const [patron, nombre] of APPS) {
        if (patron.test(ua)) return nombre;
    }
    return null;
}

export function esAndroid(userAgent: string | null | undefined): boolean {
    return /Android/i.test(userAgent ?? '');
}

/**
 * Enlace que, en Android, pide abrir la misma página en Chrome. En iPhone no
 * hay un esquema fiable: ahí se ofrece copiar el enlace.
 */
export function enlaceParaChrome(href: string): string | null {
    try {
        const u = new URL(href);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
        const esquema = u.protocol.slice(0, -1);
        return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${esquema};package=com.android.chrome;end`;
    } catch {
        return null;
    }
}
