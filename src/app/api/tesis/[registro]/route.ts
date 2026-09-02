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
        const r = await fetch(
            `${API}/${registro}?isSemanal=false&hostName=${BASE}`,
            {
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    Referer: `${BASE}/detalle/tesis/${registro}`,
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
                // El Semanario cambia poco; una hora de caché evita golpear su
                // servidor en cada clic y hace instantánea la segunda consulta.
                next: { revalidate: 3600 },
            }
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

        const d = await r.json();

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
