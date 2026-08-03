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

export async function GET(req: NextRequest) {
    const cruda = req.nextUrl.searchParams.get('u');
    if (!cruda) return new Response('Falta el parámetro u', { status: 400 });

    let destino: URL;
    try {
        destino = new URL(cruda);
    } catch {
        return new Response('URL inválida', { status: 400 });
    }

    if (destino.protocol !== 'https:' || !PERMITIDOS.includes(destino.hostname)) {
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
            // repetir la descarga en cada clic.
            next: { revalidate: 86400 },
        });

        if (!r.ok || !r.body) {
            return new Response('No se pudo obtener el documento', { status: 502 });
        }

        const tipo = r.headers.get('content-type') || '';
        if (!tipo.includes('pdf')) {
            return new Response('El origen no devolvió un PDF', { status: 502 });
        }

        const nombre = decodeURIComponent(destino.pathname.split('/').pop() || 'documento.pdf');
        const cabeceras: Record<string, string> = {
            'Content-Type': 'application/pdf',
            // `inline` para que el visor lo pinte en vez de descargarlo.
            'Content-Disposition': `inline; filename="${nombre.replace(/"/g, '')}"`,
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
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
