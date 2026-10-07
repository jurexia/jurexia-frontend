'use client';

/**
 * El píxel de Meta, con las mismas reglas que la etiqueta de Google (6-oct-2026).
 *
 *   · Sin `NEXT_PUBLIC_META_PIXEL_ID` no se carga nada: se puede desplegar
 *     antes de tener el píxel.
 *   · Y aun con él, SÓLO con permiso de «Marketing» en el aviso de cookies
 *     («Miden campañas…»). El aviso promete que nada se activa sin un sí
 *     explícito; cargar el píxel antes sería avisar de lo que ya se hizo.
 *     Se carga EN CUANTO el usuario dice que sí, sin recargar.
 *   · `PageView` al cargar y en cada cambio de ruta.
 *
 * Además, en cada página, guarda el primer contacto (`utm_*`, `fbclid`) para
 * saber qué anuncio trajo cada alta. Eso es atribución propia y corre aunque
 * no haya píxel; ver `@/lib/origen-alta`.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { consentimiento, type Consentimiento } from '@/components/AvisoCookies';
import { supabase } from '@/lib/supabase';
import {
    asegurarCookieFbc,
    capturarOrigen,
    dispararPendientes,
    medirAlta,
    type SesionParaAlta,
} from '@/lib/origen-alta';

// El ID del píxel es público (viaja en cada página que lo carga), así que va escrito aquí como valor por
// omisión: el conjunto de datos «Iurexia web», creado el 6-oct-2026. La variable de entorno lo sustituye, y
// NEXT_PUBLIC_META_PIXEL_ID=0 lo apaga sin desplegar código nuevo.
const PIXEL_ID_IUREXIA = '1408384650791902';
const PIXEL_ENV = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const PIXEL_ID = PIXEL_ENV === '0' ? '' : PIXEL_ENV || PIXEL_ID_IUREXIA;

let iniciado = false;

type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push: unknown;
    loaded: boolean;
    version: string;
    disablePushState?: boolean;
};

/** El código base de Meta, tal cual, pero llamado desde aquí para controlar el orden. */
function cargarFbq(id: string) {
    if (!window.fbq) {
        const n = function () {
            // Como el original: se encola el `arguments` entero.
            const args = arguments; // eslint-disable-line prefer-rest-params
            if (n.callMethod) n.callMethod.apply(n, args as unknown as unknown[]);
            else n.queue.push(args);
        } as Fbq;
        window.fbq = n;
        if (!window._fbq) window._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        // Los PageView los manda este componente, uno por ruta. Sin esto el
        // píxel manda otro por su cuenta en cada pushState de Next: doble.
        n.disablePushState = true;
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(s);
    }
    window.fbq?.('consent', 'grant');
    if (!iniciado) {
        // Sin «eventos automáticos» (clics en botones, metadatos de la página):
        // el aviso de privacidad dice que el píxel registra visitas, y eso es
        // lo único que registra, más los eventos que mandamos nosotros.
        window.fbq?.('set', 'autoConfig', false, id);
        window.fbq?.('init', id);
        iniciado = true;
    }
}

export default function MetaPixel() {
    const ruta = usePathname();
    const [permitido, setPermitido] = useState(false);
    const ultimaRuta = useRef<string | null>(null);

    // El permiso de Marketing, y su cambio sin recargar.
    useEffect(() => {
        setPermitido(consentimiento().marketing);
        const alCambiar = (e: Event) => {
            const d = (e as CustomEvent<Consentimiento>).detail;
            setPermitido(Boolean(d?.marketing));
        };
        window.addEventListener('iurexia:cookies', alCambiar);
        return () => window.removeEventListener('iurexia:cookies', alCambiar);
    }, []);

    // El primer contacto, en cualquier página por la que se aterrice.
    useEffect(() => {
        capturarOrigen();
    }, [ruta]);

    // El píxel: carga, PageView por ruta y los eventos que llegaron antes que él.
    useEffect(() => {
        if (!PIXEL_ID) return;
        if (!permitido) {
            // Retiró el permiso con el píxel ya cargado: deja de mandar desde ya.
            try { if (iniciado) window.fbq?.('consent', 'revoke'); } catch { /* nada */ }
            return;
        }
        try {
            asegurarCookieFbc();
            cargarFbq(PIXEL_ID);
            if (ultimaRuta.current !== ruta) {
                ultimaRuta.current = ruta;
                window.fbq?.('track', 'PageView');
            }
            dispararPendientes();
        } catch { /* medir nunca rompe la página */ }
    }, [permitido, ruta]);

    return null;
}

/**
 * Mide un alta desde las dos puertas: el registro por correo (`nueva` = `r.nueva`)
 * y el retorno de Google/Apple (`sesion` del SIGNED_IN; decide `created_at`).
 * Nunca lanza.
 */
export async function medirAltaIurexia(opciones: { sesion?: SesionParaAlta | null; nueva?: boolean } = {}) {
    try {
        let sesion = opciones.sesion ?? null;
        if (!sesion) {
            const { data } = await supabase.auth.getSession();
            sesion = data.session;
        }
        if (!sesion) return;
        await medirAlta({ sesion, nueva: opciones.nueva, marketing: consentimiento().marketing });
    } catch { /* medir nunca rompe el alta */ }
}
