'use client';

/**
 * Google Analytics / Google Ads, PERO SÓLO CON PERMISO.
 *
 * Hasta el 2-sep-2026 este componente cargaba el script de Google en cuanto
 * la página existía, sin preguntar nada. El día que se añadió el aviso de
 * cookies eso pasó de descuido a contradicción: un banner que pide permiso
 * para medir, mientras la medición ya lleva medio segundo corriendo, no es un
 * consentimiento — es un cartel.
 *
 * Ahora el script sólo se monta si el usuario dijo que sí a «Analíticas», y
 * se monta EN CUANTO lo dice, sin recargar, escuchando el evento que emite el
 * aviso. Si dice que no, o si aún no ha contestado, aquí no se carga nada.
 */

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { consentimiento, type Consentimiento } from '@/components/AvisoCookies';

const MEDIDOR = 'AW-18019843576';

export default function GoogleAnalytics() {
    const [permitido, setPermitido] = useState(false);

    useEffect(() => {
        setPermitido(consentimiento().analiticas);
        const alCambiar = (e: Event) => {
            const d = (e as CustomEvent<Consentimiento>).detail;
            setPermitido(Boolean(d?.analiticas));
        };
        window.addEventListener('iurexia:cookies', alCambiar);
        return () => window.removeEventListener('iurexia:cookies', alCambiar);
    }, []);

    if (!permitido) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${MEDIDOR}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){window.dataLayer.push(arguments);}
                    window.gtag = gtag;
                    gtag('js', new Date());

                    gtag('config', '${MEDIDOR}');
                `}
            </Script>
        </>
    );
}
