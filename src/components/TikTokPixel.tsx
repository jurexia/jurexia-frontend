'use client';

/**
 * El píxel de TikTok, con las mismas reglas que el de Meta (6-nov-2026): sólo
 * con permiso de «Marketing» en el aviso de cookies, sin recargar, y un
 * `page()` por ruta. Sin ID no se carga nada; NEXT_PUBLIC_TIKTOK_PIXEL_ID=0 lo
 * apaga sin desplegar código nuevo. El ID es público: viaja en cada página.
 *
 * Registra visitas y el alta (`CompleteRegistration`, en `origen-alta`). No
 * manda correo ni teléfono: no se usa `ttq.identify`.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { consentimiento, type Consentimiento } from '@/components/AvisoCookies';
import { dispararPendientesTikTok } from '@/lib/origen-alta';

const PIXEL_ID_IUREXIA = 'DBNA9QJC77UASCMH7R50';
const PIXEL_ENV = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim();
const PIXEL_ID = PIXEL_ENV === '0' ? '' : PIXEL_ENV || PIXEL_ID_IUREXIA;

/** El código base de TikTok tal como lo da Events Manager, para controlar cuándo corre. */
function cargarTtq(id: string) {
    if (window.ttq) return;
    /* eslint-disable */
    (function (w: any, d: Document, t: string) {
        w.TiktokAnalyticsObject = t;
        var ttq: any = (w[t] = w[t] || []);
        ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
        ttq.setAndDefer = function (t: any, e: string) {
            t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
        };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t: string) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
            return e;
        };
        ttq.load = function (e: string, n?: any) {
            var r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
            ttq._i = ttq._i || {};
            ttq._i[e] = [];
            ttq._i[e]._u = r;
            ttq._t = ttq._t || {};
            ttq._t[e] = +new Date();
            ttq._o = ttq._o || {};
            ttq._o[e] = n || {};
            var s = d.createElement('script');
            s.type = 'text/javascript';
            s.async = true;
            s.src = r + '?sdkid=' + e + '&lib=' + t;
            var p: any = d.getElementsByTagName('script')[0];
            p.parentNode.insertBefore(s, p);
        };
        ttq.load(id);
    })(window, document, 'ttq');
    /* eslint-enable */
}

export default function TikTokPixel() {
    const ruta = usePathname();
    const [permitido, setPermitido] = useState(false);
    const ultimaRuta = useRef<string | null>(null);

    useEffect(() => {
        setPermitido(consentimiento().marketing);
        const alCambiar = (e: Event) => {
            const d = (e as CustomEvent<Consentimiento>).detail;
            setPermitido(Boolean(d?.marketing));
        };
        window.addEventListener('iurexia:cookies', alCambiar);
        return () => window.removeEventListener('iurexia:cookies', alCambiar);
    }, []);

    useEffect(() => {
        if (!PIXEL_ID) return;
        if (!permitido) {
            // Retiró el permiso con el píxel ya cargado: deja de mandar desde ya.
            try { window.ttq?.revokeConsent?.(); } catch { /* nada */ }
            return;
        }
        try {
            const yaEstaba = Boolean(window.ttq);
            cargarTtq(PIXEL_ID);
            if (yaEstaba) window.ttq?.grantConsent?.();
            if (ultimaRuta.current !== ruta) {
                ultimaRuta.current = ruta;
                window.ttq?.page?.();
            }
            dispararPendientesTikTok();
        } catch { /* medir nunca rompe la página */ }
    }, [permitido, ruta]);

    return null;
}
