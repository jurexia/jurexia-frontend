/**
 * ¿Desde qué red SÍ se puede hablar con el Semanario?
 *
 * Medido el 2-sep-2026: desde una conexión doméstica el mismo registro
 * responde 200; desde las funciones de Node de Vercel y desde Render, 302 de
 * reto que acaba en 403. Es Incapsula filtrando por reputación de IP.
 *
 * Esta ruta corre en el **runtime de borde**, que sale por una red distinta a
 * la de las funciones de Node. Es una prueba de una sola pregunta, y barata:
 * si el borde pasa, la verificación de tesis vuelve a funcionar sin montar
 * ninguna ingesta.
 *
 * Devuelve el estado de cada variante, no el contenido: aquí no se sirve nada
 * al usuario, se diagnostica.
 */

export const runtime = 'edge';

const BASE = 'https://sjf2.scjn.gob.mx';
const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function GET(req: Request) {
    const registro = new URL(req.url).searchParams.get('registro') || '172479';
    if (!/^\d{5,8}$/.test(registro)) {
        return Response.json({ error: 'registro_invalido' }, { status: 400 });
    }

    const url =
        `${BASE}/services/sjftesismicroservice/api/public/tesis/${registro}` +
        `?isSemanal=false&hostName=${BASE}`;

    const pruebas: Record<string, HeadersInit> = {
        desnuda: {},
        ua: { 'User-Agent': UA },
        'ua+ref': { 'User-Agent': UA, Referer: `${BASE}/detalle/tesis/${registro}` },
        'ua+ref+accept': {
            'User-Agent': UA,
            Referer: `${BASE}/detalle/tesis/${registro}`,
            Accept: 'application/json, text/plain, */*',
        },
    };

    const salida: Record<string, unknown> = { runtime: 'edge', registro };

    for (const [nombre, headers] of Object.entries(pruebas)) {
        for (const seguir of [false, true] as const) {
            const clave = seguir ? `${nombre} (sigue 302)` : nombre;
            try {
                const r = await fetch(url, {
                    headers,
                    redirect: seguir ? 'follow' : 'manual',
                    cache: 'no-store',
                });
                let ius: unknown = null;
                if (r.status === 200 && (r.headers.get('content-type') || '').includes('json')) {
                    ius = (await r.json())?.ius ?? null;
                }
                salida[clave] = { status: r.status, ius };
            } catch (e) {
                salida[clave] = { error: e instanceof Error ? e.message : String(e) };
            }
        }
    }

    return Response.json(salida);
}
