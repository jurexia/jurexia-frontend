import { NextRequest } from 'next/server';
import { HOSTS_CORTEIDH, puertaCorteIDH } from '@/lib/proxyPdf';

/**
 * Sirve el PDF de una ley desde el propio dominio de Iurexia.
 *
 * Por qué existe. El diagnóstico del 3-ago-2026 descartó lo que parecía
 * obvio: **ni la fuente ni Iurexia bloquean nada**. Los 73 PDF del catálogo
 * federal responden 200 `application/pdf`, sin `X-Frame-Options` ni CSP, y el
 * navegador los descarga sin problema. El archivo tampoco está roto.
 *
 * Lo que falla es el último tramo: el visor incrusta un archivo de **otro
 * dominio**, y ahí manda el navegador del usuario. Un bloqueador de anuncios,
 * una extensión de privacidad o la opción «descargar los PDF en vez de abrirlos
 * en Chrome» hacen que el marco quede en blanco con el icono de documento roto
 * — y nada de eso se puede arreglar desde el servidor de origen.
 *
 * Sirviéndolo desde `iurexia.com` el archivo deja de ser de terceros: mismo
 * origen, sin extensión que lo tome por rastreo y sin depender de que la fuente
 * no añada mañana una cabecera de framing.
 *
 * **Esto no burla ninguna protección.** Los PDF viven en el Supabase y el GCS
 * de Iurexia; son documentos públicos que el propio sitio ya entregaba. Lo que
 * cambia es por qué puerta salen.
 *
 * Seguridad: la lista de dominios permitidos es obligatoria. Sin ella esto
 * sería un proxy abierto y cualquiera podría usar el servidor de Iurexia para
 * pedir direcciones internas (SSRF).
 */

/**
 * Sólo estos orígenes: los del catálogo de normativa y los que guarda Qdrant
 * en el payload de las citas.
 *
 * `diputados.gob.mx` es el que motivó todo esto. Las leyes federales tienen su
 * dirección oficial en Qdrant bajo la clave `url_pdf` —no `pdf_url`, que es la
 * que usan las estatales—, y ese sitio **sí** manda `X-Frame-Options:
 * SAMEORIGIN`: el navegador se niega a incrustarlo y no hay nada que hacer del
 * lado del cliente. Reenviarlo desde aquí es la única salida.
 */
const PERMITIDOS = [
    'ukcuzhwmmfwvcedvhfll.supabase.co',
    'storage.googleapis.com',
    'www.diputados.gob.mx',
    'diputados.gob.mx',
    'www.scjn.gob.mx',
    'www.buholegal.com',
    'www.congresochihuahua2.gob.mx',
    'www.congresochihuahua.gob.mx',
];

/**
 * Corte IDH (plan de ingesta de sentencias, 25-sep-2026).
 *
 * Las sentencias se citan al párrafo y se abren en el PDF oficial de
 * corteidh.or.cr, sin copia en nuestro almacenamiento. Pero el navegador no
 * puede leerlo directo: la Corte no manda CORS («Failed to fetch» desde
 * iurexia.com) y en iOS un PDF dentro de un iframe no se pinta. pdf.js lo lee,
 * entonces, a través de este proxy, que lo reenvía sin guardarlo.
 *
 * La puerta (sólo `/docs/(casos|opiniones|supervisiones)/*.pdf`) y la forma
 * canónica viven en `@/lib/proxyPdf`, porque el visor construye la misma
 * dirección y las dos puntas tienen que coincidir letra por letra.
 *
 * SIN `maxDuration` PROPIO. La rama de prueba ponía 60 s creyendo que alargaba
 * el tope, pero el proyecto corre en Fluid Compute con 300 s por omisión
 * (`functionDefaultTimeout`, API de Vercel, 25-sep-2026): 60 lo BAJABA, y esta
 * ruta es la de todas las leyes: por ella pasan la LIGIE (19.2 MB, más de
 * los 10 MB que guarda el CDN, así que cada clic va a diputados) y el PEF
 * 2026 (8.6 MB), y un teléfono lento podía quedarse a medias. El origen de
 * la Corte, además, no reprodujo el frío de 30-45 s que se temía: las cuatro
 * peticiones medidas desde la vista previa tuvieron un TTFB de 0.57 s o menos.
 */

/**
 * Treinta días en el CDN de Vercel para la Corte. Una sentencia publicada
 * casi nunca cambia, y cuando cambia el mapa de páginas que guardamos sólo
 * vale para el archivo que se troceó; para eso está `&v=<sha1[:8]>`: otra
 * versión, otra llave.
 *
 * `stale-while-revalidate` sí lo respeta Vercel. `stale-if-error` NO (su
 * documentación lo dice): se deja por los cachés intermedios que sí lo
 * entienden, no porque proteja nada en el CDN. Vercel además le quita al
 * navegador `s-maxage` y `stale-*`, que recibe sólo `max-age=86400`.
 *
 * El resto de los orígenes sigue con un día: las leyes sí se reforman.
 */
const TREINTA_DIAS = 2592000;
const CACHE_CORTEIDH = `public, max-age=86400, s-maxage=${TREINTA_DIAS}, stale-while-revalidate=${TREINTA_DIAS}, stale-if-error=${TREINTA_DIAS}`;
const CACHE_LEYES = 'public, max-age=3600, s-maxage=86400';

export async function GET(req: NextRequest) {
    const cruda = req.nextUrl.searchParams.get('u');
    if (!cruda) return new Response('Falta el parámetro u', { status: 400 });

    let destino: URL;
    try {
        destino = new URL(cruda);
    } catch {
        return new Response('URL inválida', { status: 400 });
    }

    const esCorte = HOSTS_CORTEIDH.includes(destino.hostname);
    if (esCorte) {
        // http→https y `www.` ANTES de la puerta; sin puerto raro, sin
        // credenciales y sólo el repositorio de PDF (ver `@/lib/proxyPdf`).
        const puerta = puertaCorteIDH(req.nextUrl.searchParams);
        if (!puerta) return new Response('Origen no permitido', { status: 403 });

        // UNA SOLA LLAVE DE CDN POR ARCHIVO. El CDN de Vercel indexa la URL
        // completa de esta ruta —`?x=1` dio MISS mientras la canónica daba
        // HIT (medido el 25-sep-2026)—, así que descartar aquí la consulta
        // de la Corte, como hacía la rama de prueba, no evitaba nada: la
        // llave ya estaba partida antes de entrar. Lo que no llegue en la
        // forma canónica (otro host, http, parámetros de más, `v` mal
        // escrita) se manda con 308 a ella.
        if (puerta.ubicacion) {
            return new Response(null, {
                status: 308,
                headers: {
                    // Relativa a propósito: no depende del host por el que entró.
                    Location: `${req.nextUrl.pathname}${puerta.ubicacion}`,
                    'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
                },
            });
        }
        destino = new URL(puerta.canonica);
    } else if (destino.protocol !== 'https:' || !PERMITIDOS.includes(destino.hostname)) {
        return new Response('Origen no permitido', { status: 403 });
    }

    try {
        const r = await fetch(destino.toString(), {
            headers: {
                Accept: 'application/pdf,*/*',
                // Algunos portales de gobierno cortan las peticiones que no
                // parecen venir de un navegador.
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
            // Las leyes cambian poco; un día en la caché de datos de Next
            // evita repetir la descarga en cada clic.
            //
            // La Corte, SIN caché de datos. Esa caché indexa el DESTINO, no la
            // URL del proxy, y guarda los PDF de 2 MB o menos, que son casi
            // todos (p90 ≈1.5-1.7 MB en la muestra): si la Corte reemplazara
            // un PDF, `&v=` abriría una llave nueva en el CDN pero Next
            // seguiría sirviendo la copia vieja hasta 30 días. El CDN, que sí
            // indexa `&v=`, ya hace de caché.
            ...(esCorte ? { cache: 'no-store' as const } : { next: { revalidate: 86400 } }),
        });

        // El estado del origen viaja en `X-Origen-Estado` para poder distinguir
        // un bloqueo de Cloudflare (403) de un origen caído (522, 5xx) sin
        // abrir los registros de Vercel.
        if (!r.ok || !r.body) {
            return new Response('No se pudo obtener el documento', {
                status: 502,
                headers: { 'X-Origen-Estado': String(r.status) },
            });
        }

        const tipo = r.headers.get('content-type') || '';
        if (!tipo.includes('pdf')) {
            return new Response('El origen no devolvió un PDF', {
                status: 502,
                headers: { 'X-Origen-Estado': `${r.status} ${tipo.slice(0, 60)}` },
            });
        }

        const nombre = decodeURIComponent(destino.pathname.split('/').pop() || 'documento.pdf');
        const cabeceras: Record<string, string> = {
            'Content-Type': 'application/pdf',
            // `inline` para que el visor lo pinte en vez de descargarlo.
            'Content-Disposition': `inline; filename="${nombre.replace(/"/g, '')}"`,
            'Cache-Control': esCorte ? CACHE_CORTEIDH : CACHE_LEYES,
        };
        const largo = r.headers.get('content-length');
        if (largo) cabeceras['Content-Length'] = largo;

        // Se reenvía el flujo tal cual, sin acumularlo en memoria: algunas leyes
        // pasan de los 4 MB y bufferizarlas rozaría el límite de respuesta del
        // entorno serverless.
        return new Response(r.body, { status: 200, headers: cabeceras });
    } catch {
        return new Response('No se pudo obtener el documento', { status: 502 });
    }
}
