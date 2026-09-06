/**
 * Triaje de incidencias.
 *
 * POR QUÉ HAY DOS PASADAS Y NO UNA
 * --------------------------------
 * Estas reglas se escribieron leyendo los 182 reportes que llevaban meses sin
 * atender, y luego se auditaron contra ellos. Aciertan alrededor del 76%. Lo
 * que se les escapa no es raro, es *humano*:
 *
 *   · «Estoy batallando para ver el hostorial»   → historial mal escrito
 *   · «Porque me pone muchos numeros»            → la queja de artículos sin
 *                                                   decir «artículos»
 *   · «La plataforma se atora y no me contesta»  → un fallo sin la palabra
 *                                                   «error» en ninguna parte
 *
 * Ninguna lista de patrones cubre eso. Por tanto: la regla decide cuando está
 * segura y es barata; el modelo entra sólo donde la regla dice «no sé». Al
 * revés —modelo primero— se gasta una llamada en las 17 filas de encuesta que
 * un `like` resuelve gratis.
 *
 * `triaje_por` guarda quién decidió. Si el modelo empieza a contradecir mucho
 * a la regla, la regla envejeció y hay que volver a mirarla.
 */

export type Familia =
    | 'defecto' | 'calidad' | 'soporte' | 'mejora' | 'encuesta' | 'buzon-equivocado';

export interface Clasificacion {
    familia: Familia;
    clase: string;
    por: 'regla' | 'modelo';
    confianza: number;
}

/** Normaliza como lo hizo el triaje en frío: minúsculas y espacios colapsados. */
function normaliza(s: string): string {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Reglas por patrón. El ORDEN es la regla: la primera que casa, gana, y van
 * de lo más específico a lo más vago. Mover una línea cambia el resultado.
 */
const REGLAS: Array<[RegExp, Familia, string]> = [
    // La encuesta de salida cayendo en la cola de soporte. 17 de 182: no es
    // una queja, es telemetría, y no debe generar ni aviso ni correo.
    [/^\[cancelación · (?!.*_detalle)/, 'encuesta', 'encuesta'],

    // ── Defectos: fallo reproducible ────────────────────────────────────
    [/cancel.*(error|no me deja|no puedo|no permite)|(?:error|no me deja|no puedo|no permite).*cancel/,
        'defecto', 'defecto/cancelacion'],
    [/(error|falla|no contest|se atora).*(cobr|consum|crédito|credito)|(cobr|consum|crédito|credito).*(error|falla)/,
        'defecto', 'defecto/cobra-consulta-fallida'],
    [/h[oi]storial|consultas previas|conversaci|desaparec|barra de desplaz/,
        'defecto', 'defecto/historial'],
    [/failed to fetch|analizar documento|no permite adjuntar|cargar un documento/,
        'defecto', 'defecto/subida'],
    // Error crudo de proveedor llegando al usuario. Mismo filtro que ya corre
    // en el chat de soporte: si asoma un `remedy_hint`, es fuga nuestra.
    [/insufficient credits|openrouter|error code: 4\d\d|invalid_argument|retryerror|remedy_hint|traceback/,
        'defecto', 'defecto/error-crudo'],
    [/pago.*(gratuito|no se refleja|sigue apareciendo)/, 'defecto', 'defecto/plan-no-aplicado'],
    [/secretario del p/, 'defecto', 'defecto/funcion-prometida'],
    [/(celular|móvil|movil).*(contraseñ|no puedo entrar)/, 'defecto', 'defecto/acceso-movil'],
    [/marca error|sigue sin funcionar|sigue igual|no est[áa] funcionando|intentos y|se atora|no me contesta nada|no señala nada|no me deja buscar|no aparece nada|no carga mi plataforma|^error$/,
        'defecto', 'defecto/error-generico'],
    [/no muestra el contenido|se repiti[óo] el texto|bajar la barra/, 'defecto', 'defecto/interfaz'],

    // ── Calidad: la respuesta llegó, pero estaba mal ────────────────────
    [/(art[íi]culos.*(muchos|todos|s[óo]lo n[úu]meros|solo numeros|pone ))|pone muchos numeros|todos los que integran/,
        'calidad', 'calidad/enumera-articulos'],
    [/(tesis|jurisprudencia|precedent).*(invent|no existe|falsa)/, 'calidad', 'calidad/tesis-falsa'],
    [/tergivers|incoherent|no se configura|s[óo]lo ubica|solo ubica|no satisfactori|no tiene acceso a sus ordenamientos|no tiene capacidad/,
        'calidad', 'calidad/respuesta-erronea'],
    [/muy corta|no me dio la repuesta completa|no ofreces/, 'calidad', 'calidad/respuesta-pobre'],

    // ── Peticiones y soporte ────────────────────────────────────────────
    [/admitir el env[íi]o|m[áa]s de un archivo a la vez|existe una app|no es intituiva|no es claro el men[úu]/,
        'mejora', 'mejora'],
    [/nadie me responde|no me responden|no me ha llegado ning[úu]n correo/, 'soporte', 'soporte/sin-respuesta'],
    [/cancel/, 'soporte', 'soporte/cancelacion'],
    [/plan|platinum|precio|pagar|suscrip|factur|comprobante|cobro|paquete|contratar/,
        'soporte', 'soporte/planes-y-cobro'],
];

/** Pasada barata. Devuelve null cuando ninguna regla casa: ahí entra el modelo. */
export function porRegla(texto: string): Clasificacion | null {
    const t = normaliza(texto);
    for (const [re, familia, clase] of REGLAS) {
        if (re.test(t)) return { familia, clase, por: 'regla', confianza: 0.9 };
    }
    return null;
}

const CLASES_VALIDAS = new Set(REGLAS.map(([, , c]) => c).concat('buzon-equivocado', 'soporte/uso'));

const INSTRUCCION = `Clasificas mensajes que abogados mexicanos dejan en la caja de reportes de Iurexia, una plataforma de IA jurídica.

Devuelve SOLO un JSON: {"clase":"...","confianza":0.0}

Clases posibles:
- defecto/cancelacion, defecto/cobra-consulta-fallida, defecto/historial, defecto/subida,
  defecto/error-crudo, defecto/plan-no-aplicado, defecto/funcion-prometida,
  defecto/acceso-movil, defecto/error-generico, defecto/interfaz
- calidad/enumera-articulos, calidad/tesis-falsa, calidad/respuesta-erronea, calidad/respuesta-pobre
- soporte/cancelacion, soporte/planes-y-cobro, soporte/uso, soporte/sin-respuesta
- mejora
- buzon-equivocado

DISTINCIÓN CLAVE — «defecto» frente a «calidad»:
· defecto = la plataforma no funcionó (error, pantalla en blanco, no respondió, cobró de más).
· calidad = la plataforma SÍ respondió, pero la respuesta estaba mal (ley equivocada,
  tesis inventada, transcripción tergiversada, enumeró artículos sin venir a cuento).

«buzon-equivocado» es la clase más frecuente y la más fácil de fallar: es gente que
escribió su CONSULTA JURÍDICA aquí creyendo que era el chat. Textos como «amparo»,
«Requiero precedentes sobre nuevo acto legislativo», un contrato pegado entero, o
«gracias». No es queja: es un usuario perdido. Si el mensaje no dice nada sobre la
plataforma sino sobre un caso, es buzon-equivocado.

La ortografía es mala y hay muchas mayúsculas. Clasifica por lo que la persona quiere
decir, no por las palabras exactas.

confianza: 0.9 si es inequívoco, 0.5 si dudas, 0.3 si es ilegible o vacío.`;

/**
 * Pasada del modelo, para lo que la regla no supo.
 * Ante cualquier fallo devuelve buzon-equivocado con confianza baja: una
 * incidencia mal clasificada con confianza 0.3 se queda en la cola para que
 * la mire un humano, que es lo correcto. Nunca inventa una clase.
 */
export async function porModelo(texto: string): Promise<Clasificacion> {
    const rendirse: Clasificacion = {
        familia: 'buzon-equivocado', clase: 'buzon-equivocado', por: 'modelo', confianza: 0.3,
    };
    const clave = process.env.OPENROUTER_API_KEY;
    if (!clave) return rendirse;

    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${clave}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://www.iurexia.com',
                'X-Title': 'Iurexia Triaje',
            },
            body: JSON.stringify({
                model: process.env.TRIAJE_MODELO || 'google/gemini-2.5-flash-lite',
                max_tokens: 60,
                temperature: 0,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: INSTRUCCION },
                    { role: 'user', content: texto.slice(0, 2000) },
                ],
            }),
        });
        if (!r.ok) return rendirse;
        const d = await r.json();
        const crudo = (d?.choices?.[0]?.message?.content || '').trim();
        const j = JSON.parse(crudo.replace(/^```json\s*|\s*```$/g, ''));

        const clase = String(j.clase || '');
        if (!CLASES_VALIDAS.has(clase)) return rendirse;

        return {
            familia: (clase.split('/')[0] as Familia),
            clase,
            por: 'modelo',
            confianza: Math.max(0, Math.min(1, Number(j.confianza) || 0.5)),
        };
    } catch {
        return rendirse;
    }
}

/** Regla primero, modelo después. */
export async function clasificar(texto: string): Promise<Clasificacion> {
    return porRegla(texto) ?? porModelo(texto);
}

/**
 * ¿Se puede arreglar sin visto bueno?
 *
 * LA FRONTERA, escrita una sola vez y en un solo sitio.
 *
 * Se aplica solo lo que corrige DATOS: indexar una norma que faltaba, arreglar
 * la vigencia de un documento, reindexar un texto mal troceado, añadir un caso
 * a la batería de regresión. Todo eso es reversible y no cambia cómo se
 * comporta la plataforma con nadie más.
 *
 * Pasa por visto bueno todo lo que cambia COMPORTAMIENTO: prompts, umbrales,
 * modelos, código, y cualquier cosa que roce el cobro.
 *
 * PRUEBA DE FUEGO: el arreglo del 4 de septiembre —prohibir que el análisis de
 * documentos citara jurisprudencia— era tocar un prompt. Bajo esta regla NO se
 * habría aplicado solo. Habría llegado con el diagnóstico hecho y el parche
 * escrito, y lo habría aprobado un humano. Así debe ser.
 */
export function requiereVistoBueno(clase: string): boolean {
    const AUTOMATICAS = new Set([
        'calidad/tesis-falsa',        // → indexar/corregir el acervo
        'calidad/respuesta-erronea',  // → corregir la norma o su metadato
        'calidad/enumera-articulos',  // → sólo si la causa resulta ser de datos
    ]);
    return !AUTOMATICAS.has(clase);
}
