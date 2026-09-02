import { NextRequest, NextResponse } from 'next/server';

/**
 * Verificación de una tesis contra el Semanario Judicial de la Federación.
 *
 * Por qué existe este proxy y no se llama al Semanario desde el navegador:
 * su API rechaza la petición si no llega con `Referer` de su propio dominio
 * («Acceso denegado: Formato inválido») y no envía cabeceras CORS. Desde el
 * servidor sí responde.
 *
 * Y por qué importa más de lo que parece: **esto es una comprobación real de
 * que la tesis existe**. Si el chat cita un registro inventado, el Semanario
 * no lo encuentra y la interfaz puede decirlo en vez de mostrar una ficha con
 * apariencia de verificada. Es la diferencia entre pedirle al modelo que no
 * alucine y comprobar que no lo hizo.
 *
 * Devuelve sólo lo que se va a mostrar; el resto del JSON del Semanario
 * (genealogías, índices, temas) no se reenvía al navegador.
 */

const BASE = 'https://sjf2.scjn.gob.mx';
const API = `${BASE}/services/sjftesismicroservice/api/public/tesis`;

/**
 * QUÉ SE ROMPIÓ, Y NO FUE NUESTRO CÓDIGO (2-sep-2026)
 * ---------------------------------------------------
 * Esta función y la del PDF se escribieron entre el 3 y el 7 de agosto de
 * 2026 y funcionaron. No se han tocado desde entonces. Lo que cambió está al
 * otro lado: **el Semanario puso Incapsula delante y ahora reta a las IP de
 * centro de datos.** Medido contra su servidor con el mismo registro:
 *
 *                          desde una laptop     desde Render / Vercel
 *   sin cabeceras .......... 403                 403
 *   sólo User-Agent ........ 403                 302 → 403
 *   Referer + User-Agent ... 200                 302 → 403
 *
 * Desde una conexión doméstica pasa a la primera; desde un servidor recibe un
 * 302 de reto que acaba en 403 se siga o no. No hay combinación de cabeceras
 * que lo salve: se probó la matriz entera.
 *
 * Y OJO CON LA COOKIE, que es lo contrario de lo que parece: llevar el
 * `incap_ses_*` que planta la redirección da 403, y con el tarro vacío da
 * 200. La cookie no abre la puerta, la cierra. Por eso las redirecciones se
 * siguen SIN arrastrar cookies.
 *
 * Se usa `node:https` y no `fetch` por una razón menor pero real: permite ver
 * el código de estado de cada salto y decidir sobre la redirección, que con
 * `fetch` queda oculta. Se pierde el caché de `next: { revalidate }`, que sólo
 * existe para fetch; no es pérdida, porque una verificación que devuelve un
 * dato viejo es peor que una que tarda 400 ms.
 *
 * LA SALIDA no está aquí: hay que servir la tesis desde nuestro propio
 * almacenamiento, como ya se hace con las leyes y las sentencias, en vez de
 * pedírsela a la Corte en cada clic desde un servidor que tiene vetado.
 */
async function pedirAlSemanario(
    url: string,
    registro: string,
    saltos = 0
): Promise<{ status: number; ok: boolean; texto: string }> {
    const { request } = await import('node:https');

    const res = await new Promise<{
        status: number; texto: string; destino?: string;
    }>((resolve, reject) => {
        const req = request(
            url,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language': 'es-MX,es;q=0.9',
                    Referer: `${BASE}/detalle/tesis/${registro}`,
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
                timeout: 12_000,
            },
            (r) => {
                const trozos: Buffer[] = [];
                r.on('data', (c: Buffer) => trozos.push(c));
                r.on('end', () =>
                    resolve({
                        status: r.statusCode ?? 0,
                        texto: Buffer.concat(trozos).toString('utf8'),
                        destino: (r.headers.location as string) || undefined,
                    })
                );
            }
        );
        req.on('timeout', () => req.destroy(new Error('ETIMEDOUT')));
        req.on('error', reject);
        req.end();
    });

    // `fetch` seguía las redirecciones solo; `https.request` no, y hay que
    // seguirlas. Pero SIN arrastrar las cookies, que es lo contrario de lo que
    // parecía: medido el 2-sep-2026 contra el Semanario, la misma petición
    // responde 200 con el tarro vacío y 403 llevando el `incap_ses_*` que
    // planta la redirección. La cookie no abre la puerta, la cierra.
    if (res.status >= 300 && res.status < 400 && res.destino && saltos < 3) {
        return pedirAlSemanario(new URL(res.destino, url).toString(), registro, saltos + 1);
    }

    return {
        status: res.status,
        ok: res.status >= 200 && res.status < 300,
        texto: res.texto,
    };
}

/** El Semanario responde con HTML dentro de sus campos; aquí sólo hace falta el texto. */
function aTextoPlano(html: string | null | undefined): string {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function GET(
    _req: NextRequest,
    { params }: { params: { registro: string } }
) {
    const registro = (params.registro || '').trim();

    // El registro digital es sólo dígitos. Filtrarlo aquí evita reenviar
    // cualquier cosa que venga en la URL al servidor de la Corte.
    if (!/^\d{5,8}$/.test(registro)) {
        return NextResponse.json(
            { verificada: false, motivo: 'registro_invalido' },
            { status: 400 }
        );
    }

    try {
        const r = await pedirAlSemanario(
            `${API}/${registro}?isSemanal=false&hostName=${BASE}`,
            registro
        );

        // Sólo un 404 prueba que la tesis NO existe. Cualquier otro fallo
        // (500, 503, mantenimiento) es del servidor de la Corte, y tratarlo
        // como «no encontrada» sería acusar al chat de inventar un registro
        // que quizá es correcto. En una función que vende confianza, esa
        // equivocación es más cara que no poder comprobar. (7-ago-2026)
        if (r.status === 404) {
            return NextResponse.json(
                { verificada: false, motivo: 'no_encontrada', registro },
                { status: 200 }
            );
        }
        // El `detalle` es para nosotros, no para el usuario: la interfaz sigue
        // enseñando el mismo aviso. Sin él, un rechazo del servidor de la Corte
        // y una excepción de red se veían idénticos desde fuera. El 2-sep-2026
        // costó media hora distinguirlos: cinco registros respondían 200 desde
        // una laptop y fallaban los cinco desde Vercel, sin forma de saber por
        // qué.
        if (!r.ok) {
            return NextResponse.json(
                {
                    verificada: false,
                    motivo: 'semanario_no_disponible',
                    detalle: `upstream_${r.status}`,
                    registro,
                },
                { status: 200 }
            );
        }

        const d = JSON.parse(r.texto);

        // Sin `ius` no hay tesis: el Semanario devuelve un objeto de error con
        // forma de problema JHipster, no un 404.
        if (!d || !d.ius) {
            return NextResponse.json(
                { verificada: false, motivo: 'no_encontrada', registro },
                { status: 200 }
            );
        }

        return NextResponse.json({
            verificada: true,
            registro: String(d.ius),
            rubro: aTextoPlano(d.rubro),
            texto: aTextoPlano(d.texto),
            precedentes: aTextoPlano(d.precedentes),
            localizacion: (d.localizacion || '').trim(),
            clave: d.claveTesis || null,
            epoca: d.epoca || null,
            fuente: d.fuente || null,
            instancia: d.instancia || null,
            volumen: d.volumen || null,
            subVolumen: d.subVolumen || null,
            pagina: (d.pagina || '').toString().trim() || null,
            materias: d.materias || null,
            tipoTesis: d.tipoTesis || null,
            publicacion: aTextoPlano(d.textoPublicacion),
            url: `${BASE}/detalle/tesis/${d.ius}`,
        });
    } catch (e) {
        // Que el Semanario esté caído no debe romper el panel: se avisa y el
        // usuario conserva el enlace para comprobarlo él mismo.
        const causa = e instanceof Error
            ? `${e.name}: ${e.message}${(e as { cause?: { code?: string } }).cause?.code
                ? ` (${(e as { cause?: { code?: string } }).cause?.code})` : ''}`
            : String(e);
        console.error(`[tesis/${registro}] el Semanario no respondió →`, causa);
        return NextResponse.json(
            { verificada: false, motivo: 'semanario_no_disponible', detalle: causa, registro },
            { status: 200 }
        );
    }
}
