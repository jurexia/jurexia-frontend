/**
 * Verificación: convertir una queja en un hecho.
 *
 * LA REGLA
 * --------
 * Nunca se actúa sobre la queja. Se actúa sobre la REPRODUCCIÓN.
 *
 * Un abogado enfadado también se equivoca. Sin este paso, el circuito sería
 * una máquina de aplicar los errores ajenos a toda velocidad — que es
 * exactamente el fallo que se supone que previene.
 *
 * Lo bueno es que las quejas que llegan son casi todas comprobables por
 * máquina, porque vienen con la prueba: `contexto` guarda la respuesta que el
 * abogado señaló. Un registro se consulta y existe o no existe. Un rubro se
 * compara. Eso no es opinión.
 *
 * TRES DESENLACES, y el tercero importa tanto como los otros:
 *   · confirmada        → se reprodujo. Adelante.
 *   · no_reproducible   → no se reprodujo. NO se arregla nada y se dice.
 *   · sin_medios        → no hay forma automática de comprobarlo. Va a la cola
 *                         del bucle asistido, donde lo mira alguien. Es la
 *                         salida honesta, y no se disfraza de las otras.
 */

export type Desenlace = 'confirmada' | 'no_reproducible' | 'sin_medios';

export interface Veredicto {
    desenlace: Desenlace;
    /** Qué se intentó y qué salió. Se guarda entero en `verificacion`. */
    prueba: Record<string, unknown>;
    diagnostico: string;
    /** Qué corrección propone. Aplicarla o no lo decide `requiere_vb`. */
    correccion: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

/**
 * ¿Están estos registros en el acervo, y con qué rubro?
 *
 * NO SE PREGUNTA A LA CORTE EN VIVO, Y ES DELIBERADO   (6-sep-2026)
 * -----------------------------------------------------------------
 * La primera versión llamaba a `/semanario/tesis/{registro}`, que consulta
 * al microservicio de la Corte. La Corte está detrás de Incapsula: desde
 * Render devuelve 403 SIEMPRE, lo mismo para un registro auténtico que para
 * uno inventado. Y lo devuelve envuelto en un HTTP 200 con `ok:false`.
 *
 * Aquel código hacía `if (!r.ok) return null` — y `r.ok` era **true**. Daba
 * todo registro por existente con rubro vacío, y con rubro vacío la
 * comparación no acusa. El veredicto habría sido «no reproducible»: decirle
 * a un abogado que reportó bien una tesis inventada que su queja no se pudo
 * comprobar. Exonerar a la plataforma con un endpoint roto.
 *
 * Se pregunta al acervo propio, que además es la pregunta correcta: si el
 * registro no está indexado, el modelo no lo leyó — lo inventó.
 *
 * FAIL-CLOSED. `null` significa «no se pudo mirar», y no se parece en nada a
 * «no existe». Confundirlas acusa a la plataforma de inventar una tesis cada
 * vez que se cae la red, y al revés la exonera cada vez que falla el acervo.
 */
async function consultarAcervo(
    registros: string[],
): Promise<Record<string, { existe: boolean; rubro: string }> | null> {
    if (!registros.length) return {};
    try {
        const r = await fetch(`${API}/acervo/registros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registros: registros.slice(0, 100) }),
            signal: AbortSignal.timeout(20000),
        });
        if (!r.ok) return null;
        const d = await r.json();

        // Las dos llaves. `ok` dice que el endpoint respondió; `consultado`
        // dice que llegó a mirar el acervo de verdad. Sin la segunda, un fallo
        // interno de Qdrant devolvería todo como no verificado y esto lo leería
        // como «el modelo se inventó las diez citas».
        if (d?.ok !== true || d?.consultado !== true) return null;

        const filas = d.registros as Record<string, { valid: boolean; rubro_real: string | null }>;
        if (!filas || typeof filas !== 'object') return null;

        const salida: Record<string, { existe: boolean; rubro: string }> = {};
        for (const reg of registros) {
            const f = filas[reg];
            // Un registro que ni siquiera viene en la respuesta no se da por
            // inexistente: se omite, y arriba cuenta como no consultable.
            if (!f) continue;
            salida[reg] = { existe: f.valid === true, rubro: f.rubro_real ?? '' };
        }
        return salida;
    } catch {
        return null;
    }
}

/**
 * Quejas de jurisprudencia inventada.
 *
 * Se comprueban DOS cosas distintas, y la segunda es la peligrosa:
 *   1. ¿Existe el registro?
 *   2. ¿El rubro que se le atribuyó es el suyo?
 *
 * El caso del 4 de septiembre fue el segundo: un registro auténtico de un
 * Colegiado al que se le reescribió el rubro y se le atribuyó a la Primera
 * Sala. Comprobar sólo la existencia lo habría dado por bueno.
 */
async function verificarTesis(texto: string, contexto: string | null): Promise<Veredicto> {
    const { registrosDeLaRespuesta, rubrosPorRegistro, rubroCorresponde, citasSinRegistro } =
        await import('../citas');

    const respuesta = contexto ?? '';
    if (!respuesta.trim()) {
        return {
            desenlace: 'sin_medios',
            prueba: { motivo: 'la queja no trae la respuesta que la provocó' },
            diagnostico: 'No se guardó la respuesta señalada, así que no hay nada que comprobar.',
            correccion: null,
        };
    }

    const registros = registrosDeLaRespuesta(respuesta);
    const rubros = rubrosPorRegistro(respuesta);
    const sinRegistro = citasSinRegistro(respuesta);

    const inexistentes: string[] = [];
    const rubroAjeno: Array<{ registro: string; citado: string; real: string }> = [];
    const noConsultables: string[] = [];

    // Una sola llamada para todos: el acervo resuelve el lote entero, y así
    // no hay estados a medias si la red se corta a la mitad de un bucle.
    const fichas = await consultarAcervo(registros);

    if (fichas === null) {
        // No se pudo mirar el acervo. NO se concluye nada — ni a favor ni en
        // contra. Ésta es la rama que antes exoneraba a la plataforma.
        return {
            desenlace: 'sin_medios',
            prueba: { registros_hallados: registros.length, motivo: 'no se pudo consultar el acervo' },
            diagnostico: 'El acervo no respondió; la queja queda sin comprobar, no desmentida.',
            correccion: null,
        };
    }

    for (const reg of registros) {
        const ficha = fichas[reg];
        if (!ficha) { noConsultables.push(reg); continue; }
        if (!ficha.existe) { inexistentes.push(reg); continue; }
        const citado = rubros[reg] ?? '';
        if (citado && !rubroCorresponde(citado, ficha.rubro)) {
            rubroAjeno.push({ registro: reg, citado: citado.slice(0, 120), real: ficha.rubro.slice(0, 120) });
        }
    }

    const prueba = {
        registros_hallados: registros.length,
        inexistentes, rubro_ajeno: rubroAjeno,
        citas_sin_registro: sinRegistro, no_consultables: noConsultables,
    };

    if (inexistentes.length || rubroAjeno.length) {
        const partes: string[] = [];
        if (inexistentes.length)
            partes.push(`${inexistentes.length} registro(s) no están en el acervo (el modelo no los leyó, los inventó): ${inexistentes.join(', ')}`);
        if (rubroAjeno.length)
            partes.push(`${rubroAjeno.length} registro(s) existen pero con OTRO rubro del que se les atribuyó`);
        return {
            desenlace: 'confirmada',
            prueba,
            diagnostico: `Confirmado contra el acervo. ${partes.join('. ')}.`,
            // Corrección de DATOS: se indexa lo que falta para que el buscador
            // encuentre la tesis buena en lugar de que el modelo la invente.
            correccion: 'Indexar en el acervo las tesis del rubro consultado y añadir el caso a '
                + 'la batería de regresión de citas, para que esta consulta no vuelva a fallar.',
        };
    }

    if (sinRegistro.length) {
        return {
            desenlace: 'confirmada',
            prueba,
            diagnostico: `La respuesta citó ${sinRegistro.length} tesis sin registro digital `
                + `(${sinRegistro.slice(0, 3).join('; ')}), que no se pueden comprobar.`,
            correccion: 'Indexar esas tesis en el acervo si existen; si no, el caso entra en la '
                + 'batería de regresión como cita prohibida.',
        };
    }

    // CUALQUIER registro sin comprobar impide desmentir la queja. Antes hacía
    // falta que fallaran TODOS para no concluir; con eso, tres de cinco sin
    // mirar y dos correctos bastaban para darle la espalda a quien reportó.
    // Un hallazgo positivo sí vale con datos parciales —encontrar un fallo es
    // prueba— pero una absolución, no.
    if (noConsultables.length) {
        return {
            desenlace: 'sin_medios',
            prueba,
            diagnostico: `${noConsultables.length} de ${registros.length} registro(s) no se `
                + 'pudieron comprobar; no se desmiente nada con datos incompletos.',
            correccion: null,
        };
    }

    if (!registros.length) {
        return {
            desenlace: 'sin_medios',
            prueba,
            diagnostico: 'La respuesta no traía ningún registro que comprobar.',
            correccion: null,
        };
    }

    return {
        desenlace: 'no_reproducible',
        prueba,
        diagnostico: `Se comprobaron ${registros.length} registro(s) contra el acervo: todos `
            + 'están indexados y con el rubro que se les atribuyó.',
        correccion: null,
    };
}

/**
 * Quejas sobre un ARTÍCULO mal citado.
 *
 * Es el fallo dominante y el más difícil de ver: el número existe y la ley
 * existe, así que la cita parece impecable. Sólo falla en el fondo — pertenece
 * a otro ordenamiento, o no dice lo que se le atribuye.
 *
 * Se comprueba en dos tiempos, y el primero es gratis:
 *
 *   1. ¿Está ese artículo en ESA ley, dentro del acervo? Si no está, se acabó:
 *      el modelo no lo leyó. Es determinista, no cuesta una llamada al modelo
 *      y es el caso de «ese artículo pertenece a otra ley».
 *
 *   2. Si está, hay que leer las dos cosas: lo que la respuesta dice del
 *      artículo y lo que el artículo dice. Ahí sí entra el modelo, y con una
 *      instrucción sesgada a ABSOLVER: sólo acusa si la contradicción es
 *      evidente. Un verificador que ve fallos donde no los hay llena la cola
 *      de trabajo falso y acaba ignorado, que es como se murió la cola vieja.
 */
async function verificarArticulos(
    texto: string, contexto: string | null, estado: string | null,
): Promise<Veredicto> {
    const respuesta = contexto ?? '';
    if (!respuesta.trim()) {
        return {
            desenlace: 'sin_medios',
            prueba: { motivo: 'la queja no trae la respuesta que la provocó' },
            diagnostico: 'No se guardó la respuesta señalada, así que no hay nada que comprobar.',
            correccion: null,
        };
    }

    let datos: {
        ok: boolean; consultado: boolean; buscado_en?: string[];
        citas: Array<{ ley: string; articulo: string; existe: boolean; texto_real: string | null }>;
    };
    try {
        const r = await fetch(`${API}/acervo/articulos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // El estado abre el silo de leyes de su entidad. Sin el, un articulo
            // del codigo de Sonora sale como inexistente aunque este indexado, y
            // el circuito acusaria a la plataforma de inventarselo.
            body: JSON.stringify({ texto: respuesta, estado }),
            signal: AbortSignal.timeout(25000),
        });
        if (!r.ok) throw new Error(`acervo ${r.status}`);
        datos = await r.json();
    } catch {
        return {
            desenlace: 'sin_medios',
            prueba: { motivo: 'no se pudo consultar el acervo de leyes' },
            diagnostico: 'El acervo no respondió; la queja queda sin comprobar, no desmentida.',
            correccion: null,
        };
    }

    if (datos?.consultado !== true) {
        return {
            desenlace: 'sin_medios',
            prueba: { motivo: 'el acervo no llegó a consultarse' },
            diagnostico: 'El acervo no llegó a consultarse; no se concluye nada.',
            correccion: null,
        };
    }

    const citas = datos.citas ?? [];
    if (!citas.length) {
        return {
            desenlace: 'sin_medios',
            prueba: { motivo: 'la respuesta no cita ningún artículo con su ley' },
            diagnostico: 'La respuesta guardada no contiene ninguna cita de artículo con su ley '
                + 'identificable. Puede estar cortada.',
            correccion: null,
        };
    }

    // ── Primer tiempo: los que no están donde se dijo ───────────────────
    const ausentes = citas.filter(c => !c.existe);
    if (ausentes.length) {
        const lista = ausentes.map(c => `art. ${c.articulo} de ${c.ley}`).slice(0, 6);
        return {
            desenlace: 'confirmada',
            prueba: { citas, ausentes: ausentes.length, buscado_en: datos.buscado_en },
            diagnostico: `${ausentes.length} de ${citas.length} artículo(s) citados no están en `
                + `la ley a la que se les atribuyó: ${lista.join('; ')}.`,
            correccion: 'Indexar en el acervo los artículos ausentes o corregir el metadato `ley` '
                + 'de los que estén mal clasificados, y añadir el caso a la batería de regresión.',
        };
    }

    // ── Segundo tiempo: están, pero ¿dicen lo que se les atribuye? ──────
    const juicio = await contrastarSentido(respuesta, citas);
    if (juicio === null) {
        return {
            desenlace: 'sin_medios',
            prueba: { citas, motivo: 'no se pudo contrastar el sentido' },
            diagnostico: `Los ${citas.length} artículos citados existen en su ley. No se pudo `
                + 'contrastar si la respuesta los interpretó bien.',
            correccion: null,
        };
    }

    if (juicio.contradice) {
        return {
            desenlace: 'confirmada',
            prueba: { citas, contraste: juicio },
            diagnostico: `Los artículos existen, pero la respuesta le atribuye a ${juicio.cual} `
                + `algo que su texto no dice: ${juicio.porque}`,
            correccion: 'Revisar el troceado y el texto indexado de ese artículo, y añadir el '
                + 'caso a la batería de regresión con el texto correcto como referencia.',
        };
    }

    return {
        desenlace: 'no_reproducible',
        prueba: { citas, contraste: juicio },
        diagnostico: `Se comprobaron ${citas.length} artículo(s) contra el acervo: todos están en `
            + 'la ley que se les atribuyó y su texto respalda lo que dice la respuesta.',
        correccion: null,
    };
}

/**
 * ¿La respuesta le hace decir a algún artículo lo que no dice?
 *
 * Sesgado a absolver a propósito. Devuelve null si no se pudo juzgar — que no
 * es «no contradice», y por eso arriba se trata como `sin_medios`.
 */
async function contrastarSentido(
    respuesta: string,
    citas: Array<{ ley: string; articulo: string; texto_real: string | null }>,
): Promise<{ contradice: boolean; cual: string; porque: string } | null> {
    const clave = process.env.OPENROUTER_API_KEY;
    if (!clave) return null;

    const conTexto = citas.filter(c => c.texto_real).slice(0, 6);
    if (!conTexto.length) return null;

    const dossier = conTexto
        .map(c => `--- Artículo ${c.articulo} de ${c.ley} (TEXTO OFICIAL):\n${(c.texto_real ?? '').slice(0, 1800)}`)
        .join('\n\n');

    const instruccion = `Eres un revisor jurídico mexicano. Se te da una respuesta que dio un asistente legal y el TEXTO OFICIAL de los artículos que citó.

Tu única tarea: decir si la respuesta le atribuye a algún artículo algo que su texto NO dice.

Devuelve SOLO un JSON: {"contradice":false,"cual":"","porque":""}

REGLAS, en orden de importancia:
1. Ante la duda, contradice=false. Sólo acusa si la contradicción es EVIDENTE al comparar los dos textos: la respuesta dice que el artículo regula X y el artículo regula otra cosa, o le atribuye un supuesto, un plazo o un sujeto que no aparece.
2. Que la respuesta resuma, parafrasee o cite sólo una parte NO es contradicción.
3. Que la respuesta añada razonamiento propio alrededor de la cita NO es contradicción.
4. Si el artículo viene cortado y no puedes comparar, contradice=false.

En "cual" pon «artículo N de LEY». En "porque", una frase: qué dice la respuesta frente a qué dice el artículo.`;

    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${clave}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://www.iurexia.com',
                'X-Title': 'Iurexia Verificacion',
            },
            body: JSON.stringify({
                model: process.env.TRIAJE_MODELO || 'google/gemini-2.5-flash-lite',
                max_tokens: 250,
                temperature: 0,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: instruccion },
                    { role: 'user', content: `RESPUESTA DEL ASISTENTE:\n${respuesta.slice(0, 9000)}\n\n${dossier}` },
                ],
            }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        const crudo = (d?.choices?.[0]?.message?.content || '').trim();
        const j = JSON.parse(crudo.replace(/^```json\s*|\s*```$/g, ''));
        return {
            contradice: j.contradice === true,
            cual: String(j.cual || '').slice(0, 120),
            porque: String(j.porque || '').slice(0, 400),
        };
    } catch {
        return null;
    }
}

/**
 * Qué clases sabe verificar el circuito hoy, y cuáles no.
 *
 * Esta lista se queda corta a propósito. Una clase que no está aquí sale como
 * `sin_medios` y va a manos humanas — que es infinitamente mejor que una
 * verificación falsa que cierre la incidencia sin haber comprobado nada.
 */
export async function verificar(inc: {
    clase: string | null; texto: string; contexto: string | null;
    estado_usuario?: string | null;
}): Promise<Veredicto> {
    switch (inc.clase) {
        case 'calidad/tesis-falsa':
            return verificarTesis(inc.texto, inc.contexto);

        // El fallo dominante: cinco de las nueve correcciones reales.
        case 'calidad/articulo-mal-citado':
        case 'calidad/respuesta-erronea':
            return verificarArticulos(inc.texto, inc.contexto, inc.estado_usuario ?? null);

        // Estas se detectan por su rastro en el propio texto, sin red.
        case 'defecto/error-crudo': {
            const fuga = /openrouter|insufficient credits|remedy_hint|error code: 4\d\d|traceback|sk-or-/i
                .test(`${inc.texto} ${inc.contexto ?? ''}`);
            return fuga
                ? {
                    desenlace: 'confirmada',
                    prueba: { fuga_detectada: true },
                    diagnostico: 'El usuario recibió literalmente un error interno de proveedor.',
                    correccion: 'Añadir la firma de este error al filtro determinista que ya corre '
                        + 'antes del modelo, para que no vuelva a salir de la máquina.',
                }
                : { desenlace: 'no_reproducible', prueba: {}, diagnostico: 'Sin rastro de error interno.', correccion: null };
        }

        // Todo lo demás necesita reproducir con sesión, cobro o navegador.
        // El circuito no se lo inventa: lo deja dicho y lo pasa.
        default:
            return {
                desenlace: 'sin_medios',
                prueba: { motivo: `sin comprobación automática para «${inc.clase ?? 'sin clase'}»` },
                diagnostico: 'Requiere reproducción manual.',
                correccion: null,
            };
    }
}
