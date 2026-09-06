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
 * ¿Existe este registro en el Semanario, y con qué rubro?
 * Devuelve null cuando no se pudo consultar — que NO es lo mismo que «no
 * existe». Confundir esas dos cosas acusaría a la plataforma de inventar una
 * tesis cada vez que se cae la red.
 */
async function consultarRegistro(registro: string): Promise<{ existe: boolean; rubro: string } | null> {
    try {
        const r = await fetch(`${API}/semanario/tesis/${encodeURIComponent(registro)}`, {
            signal: AbortSignal.timeout(15000),
        });
        if (r.status === 404) return { existe: false, rubro: '' };
        if (!r.ok) return null;
        const d = await r.json();
        const rubro = String(d?.rubro ?? d?.titulo ?? d?.tesis?.rubro ?? '');
        return { existe: true, rubro };
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

    for (const reg of registros.slice(0, 12)) {
        const ficha = await consultarRegistro(reg);
        if (ficha === null) { noConsultables.push(reg); continue; }
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
            partes.push(`${inexistentes.length} registro(s) no existen en el Semanario: ${inexistentes.join(', ')}`);
        if (rubroAjeno.length)
            partes.push(`${rubroAjeno.length} registro(s) existen pero con OTRO rubro del que se les atribuyó`);
        return {
            desenlace: 'confirmada',
            prueba,
            diagnostico: `Confirmado contra el Semanario. ${partes.join('. ')}.`,
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

    if (noConsultables.length === registros.length && registros.length > 0) {
        return {
            desenlace: 'sin_medios',
            prueba,
            diagnostico: 'No se pudo consultar el Semanario en esta vuelta; no se concluye nada.',
            correccion: null,
        };
    }

    return {
        desenlace: 'no_reproducible',
        prueba,
        diagnostico: `Se comprobaron ${registros.length} registro(s) contra el Semanario y todos `
            + 'existen con el rubro que se les atribuyó.',
        correccion: null,
    };
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
}): Promise<Veredicto> {
    switch (inc.clase) {
        case 'calidad/tesis-falsa':
            return verificarTesis(inc.texto, inc.contexto);

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
