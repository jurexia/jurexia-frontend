/**
 * EL COMPLEMENTO, SERVIDO DESDE IUREXIA.
 *
 * David: «cárgalo a Iurexia para que lo instalen los usuarios desde allí».
 *
 * Estaba colgando de la URL del servidor de la API —un dominio de Render que
 * no dice nada—, y a un secretario se le pide que descargue y cargue en su
 * navegador un programa que va a leer el expediente de un particular. Que el
 * enlace sea de iurexia.com no es cosmética: es lo que permite reconocer de
 * quién viene.
 *
 * NO SE DUPLICA EL FICHERO. Se pide al API, que lo empaqueta al vuelo desde la
 * carpeta desplegada. Guardar una copia en `public/` habría creado la versión
 * que alguien tiene que acordarse de actualizar, y ésa siempre acaba vieja.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

export async function GET() {
    try {
        const res = await fetch(`${API}/taller/extension`, { cache: 'no-store' });
        if (!res.ok) {
            return new Response(
                'No se pudo preparar el complemento. Vuelve a intentarlo en un momento.',
                { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
            );
        }
        const datos = await res.arrayBuffer();
        return new Response(datos, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="iurexia-sise.zip"',
                // La versión viaja para que la página pueda enseñarla y para
                // que se note si el usuario se quedó con una vieja.
                'X-Version': res.headers.get('X-Version') || '',
                'Cache-Control': 'no-store',
            },
        });
    } catch {
        return new Response(
            'No se pudo preparar el complemento. Vuelve a intentarlo en un momento.',
            { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        );
    }
}
