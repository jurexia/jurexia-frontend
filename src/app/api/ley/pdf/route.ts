import { NextRequest } from 'next/server';

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
 * El dominio se abre **sólo** para el repositorio de resoluciones: casos,
 * opiniones consultivas y supervisiones, y sólo archivos .pdf. El resto del
 * sitio (buscador en ColdFusion, fichas técnicas, formularios) queda fuera.
 * Sin distinguir mayúsculas, porque el catálogo de la Corte mezcla
 * `seriec_N_esp.pdf` con nombres en mayúsculas y sufijos (`_esp1`, `_esp2`).
 * `URL` ya resolvió los `..` (también `%2e%2e`) antes de mirar la ruta.
 */
const CORTEIDH = ['www.corteidh.or.cr', 'corteidh.or.cr'];
const RUTA_CORTEIDH = /^\/docs\/(casos|opiniones|supervisiones)\/.+\.pdf$/i;

/**
 * El origen de la Corte tarda de 30 a 45 s en frío (medido el 25-sep-2026; una
 * vez respondió 522 de Cloudflare), y la Serie C 529 pesa 10.3 MB.
 *
 * Ojo: el proyecto corre en Fluid Compute y su tope por omisión es de 300 s
 * (`functionDefaultTimeout` en la API de Vercel, 25-sep-2026), así que esta
 * línea no alarga nada: **acota**. Sesenta segundos cubren el frío del origen
 * con margen, y un origen colgado deja de retener la función cinco minutos.
 */
export const maxDuration = 60;

/**
 * Treinta días en el CDN de Vercel para la Corte, y otros tantos sirviendo la
 * copia vieja mientras se revalida o si el origen se cae. Una sentencia
 * publicada casi nunca cambia; y cuando cambia, el mapa de páginas que
 * guardamos sólo vale para el archivo que se troceó, así que servir un tiempo
 * la copia anterior es coherente con lo ingerido. Lo que no se puede es que
 * cada clic espere los 30-45 s del origen en frío.
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

    const esCorte = CORTEIDH.includes(destino.hostname);
    if (esCorte) {
        // Sin puerto raro, sin credenciales y sólo el repositorio de PDF. La
        // consulta y el fragmento se descartan: el archivo es el mismo y así no
        // se abre una llave de caché distinta por cada `?x=`.
        if (
            destino.protocol !== 'https:' ||
            destino.port !== '' ||
            destino.username !== '' ||
            destino.password !== '' ||
            !RUTA_CORTEIDH.test(destino.pathname)
        ) {
            return new Response('Origen no permitido', { status: 403 });
        }
        destino.search = '';
        destino.hash = '';
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
            // Las leyes cambian poco; un día de caché en el borde evita
            // repetir la descarga en cada clic. (La caché de datos de Next no
            // guarda nada de más de 2 MB: para las sentencias grandes lo que
            // cuenta es el `s-maxage` de la respuesta, no esto.)
            next: { revalidate: esCorte ? TREINTA_DIAS : 86400 },
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
