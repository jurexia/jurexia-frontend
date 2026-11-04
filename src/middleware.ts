import { NextResponse, type NextRequest } from 'next/server';

/* ═══ LA PORTADA DE LOS ANUNCIOS (4-nov-2026) ═══
   Meta rechazó L3 «Más por menos», cuyo destino es la portada, por su norma de
   Ciberseguridad («imitar sitios conocidos»). La sospecha es el nombre de
   OpenAI. Quien llega desde un anuncio ve la misma portada sin nombrarlo
   (app/abogados); el resto del tráfico, la de siempre.

   Se decide aquí y no en la página porque la portada es estática: leer los
   searchParams en ella la volvería dinámica para todo el mundo, y un
   useEffect no le sirve al rastreador de Meta, que no ejecuta JavaScript. La
   reescritura no cambia la barra de direcciones: sigue diciendo `/?utm_…`, y
   origen-alta lee las UTM de window.location como siempre.

   Sólo corre en `/` (ver `config`). */

const FUENTES_DE_ANUNCIO = new Set(['facebook', 'instagram', 'fb', 'ig', 'meta']);
const MEDIOS_DE_ANUNCIO = new Set(['paid', 'cpc', 'ads']);

function esDeAnuncio(params: URLSearchParams): boolean {
    const fuente = (params.get('utm_source') ?? '').trim().toLowerCase();
    const medio = (params.get('utm_medium') ?? '').trim().toLowerCase();
    return FUENTES_DE_ANUNCIO.has(fuente) || MEDIOS_DE_ANUNCIO.has(medio);
}

export function middleware(request: NextRequest) {
    if (!esDeAnuncio(request.nextUrl.searchParams)) return NextResponse.next();
    const destino = request.nextUrl.clone();
    destino.pathname = '/abogados';
    return NextResponse.rewrite(destino);
}

export const config = { matcher: '/' };
