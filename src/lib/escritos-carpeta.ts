import { streamChat } from './api'
import {
    categoriasDe,
    nombreCarpeta,
    tipoCarpeta,
    type DocumentoExpediente,
    type Expediente,
} from './expedientes'

/**
 * ESCRITOS DEL PROCEDIMIENTO, desde dentro de la carpeta.
 *
 * QUÉ FALTABA
 * -----------
 * La carpeta sabía leer y diagnosticar, pero no producir. Y un juicio no es
 * una línea recta: se promueven incidentes, se piden medidas provisionales,
 * se contestan vistas, se impugnan resoluciones. Nada de eso cabía en el
 * «objetivo» de la carpeta —que describe a dónde va el asunto, no lo que hay
 * que presentar el martes—, así que el abogado tenía que salirse al chat,
 * volver a explicar su caso desde cero y perder el expediente que ya había
 * subido.
 *
 * Aquí el objetivo se queda como lo que es —el rumbo— y se agrega lo
 * contingente: el escrito concreto que el procedimiento exige ahora, redactado
 * con los documentos que ya están en la carpeta.
 *
 * LA REGLA QUE NO SE NEGOCIA
 * --------------------------
 * Esto sale a un juzgado. Lo que no conste en los documentos NO se inventa: se
 * deja como un hueco visible entre corchetes para que el abogado lo llene.
 * Un número de expediente inventado en una promoción real no es un error de
 * estilo, y es exactamente lo que Iurexia existe para no hacer.
 */

export type CategoriaEscrito = 'tramite' | 'incidente' | 'medida' | 'vista' | 'impugnacion'

export interface TipoEscrito {
    value: string
    label: string
    categoria: CategoriaEscrito
    /** Cuándo se usa. Lo lee el abogado, así que va en su idioma. */
    cuando: string
    /** Qué debe contener y cómo se estructura. Va al modelo. */
    guia: string
    /** Si el escrito se dirige contra algo, qué hay que preguntarle. */
    pide?: string
}

export const CATEGORIAS_ESCRITO: { value: CategoriaEscrito; label: string }[] = [
    { value: 'tramite', label: 'Promociones de trámite' },
    { value: 'incidente', label: 'Incidentes' },
    { value: 'medida', label: 'Medidas y providencias' },
    { value: 'vista', label: 'Vistas y traslados' },
    { value: 'impugnacion', label: 'Impugnaciones' },
]

/**
 * El catálogo. Son los escritos que un litigante mexicano necesita de verdad
 * para darle curso a un asunto, no una lista teórica: cada uno responde a algo
 * que ocurre en el expediente y obliga a presentar algo en un plazo.
 */
export const TIPOS_ESCRITO: TipoEscrito[] = [
    // ── Trámite ──────────────────────────────────────────────────────────
    {
        value: 'promocion_simple',
        label: 'Promoción simple',
        categoria: 'tramite',
        cuando: 'Para pedir algo puntual al juzgado: copias, fecha de audiencia, devolución de documentos.',
        guia: 'Escrito breve de una sola petición, claro y sin relleno. Encabezado, un punto de ' +
            'hechos si hace falta situar la petición, y los puntos petitorios.',
        pide: '¿Qué le pide al juzgado?',
    },
    {
        value: 'desahogo_prevencion',
        label: 'Desahogo de prevención o requerimiento',
        categoria: 'tramite',
        cuando: 'El juzgado previno o requirió algo y hay plazo para cumplir.',
        guia: 'Cita el acuerdo que previene —fecha y contenido—, atiende PUNTO POR PUNTO lo ' +
            'requerido en el mismo orden, y pide que se tenga por desahogada la prevención y ' +
            'se dé curso. Si algún punto no puede cumplirse con lo que consta, dilo y explica.',
        pide: '¿Qué le previno o requirió el juzgado? (si consta en la carpeta, déjelo en blanco)',
    },
    {
        value: 'senalamiento',
        label: 'Domicilio y autorizados',
        categoria: 'tramite',
        cuando: 'Para señalar domicilio para oír notificaciones y autorizar abogados.',
        guia: 'Escrito breve: señalamiento de domicilio, autorización de personas en términos ' +
            'del código procesal aplicable, y correo electrónico si procede.',
    },
    {
        value: 'pruebas',
        label: 'Ofrecimiento de pruebas',
        categoria: 'tramite',
        cuando: 'Se abrió el periodo probatorio y hay que ofrecer.',
        guia: 'Ofrece cada prueba por separado, numerada, con: denominación, lo que se pretende ' +
            'acreditar con ella (relación con los hechos), y su desahogo. Sólo ofrece pruebas ' +
            'que consten en la carpeta o que el abogado pueda razonablemente aportar; el resto ' +
            'márcalo como hueco.',
    },
    {
        value: 'alegatos',
        label: 'Alegatos',
        categoria: 'tramite',
        cuando: 'Cerrada la instrucción, antes de sentencia.',
        guia: 'Recapitula qué se demandó, qué quedó probado con qué prueba concreta, y por qué ' +
            'procede resolver en el sentido pedido. Sin repetir la demanda: argumenta sobre lo ' +
            'probado.',
    },

    // ── Incidentes ───────────────────────────────────────────────────────
    {
        value: 'incidente_nulidad',
        label: 'Incidente de nulidad de actuaciones',
        categoria: 'incidente',
        cuando: 'Una actuación se practicó con vicios que dejaron sin defensa.',
        guia: 'Identifica con precisión la actuación que se impugna —fecha y foja—, expón el ' +
            'vicio, funda por qué es causa de nulidad, y acredita el perjuicio: sin perjuicio no ' +
            'hay nulidad. Pide la nulidad y la reposición del procedimiento.',
        pide: '¿Qué actuación impugna y por qué? (fecha, si la sabe)',
    },
    {
        value: 'incidente_personalidad',
        label: 'Incidente de falta de personalidad',
        categoria: 'incidente',
        cuando: 'Quien comparece no acredita su representación.',
        guia: 'Señala quién comparece y con qué documento pretende acreditar su personalidad, ' +
            'explica por qué ese documento es insuficiente, y pide que se le tenga por no ' +
            'presentado o se le desconozca la personalidad.',
        pide: '¿De quién objeta la personalidad?',
    },
    {
        value: 'incidente_competencia',
        label: 'Incompetencia',
        categoria: 'incidente',
        cuando: 'El juzgado que conoce no es el competente.',
        guia: 'Precisa si es por declinatoria o inhibitoria, expón el criterio de competencia ' +
            'aplicable —materia, cuantía, territorio o grado— y por qué el juzgado carece de ' +
            'ella. Señala cuál es el competente.',
        pide: '¿Por qué considera que el juzgado no es competente?',
    },
    {
        value: 'incidente_generico',
        label: 'Otro incidente',
        categoria: 'incidente',
        cuando: 'Acumulación, liquidación de sentencia, o cualquier otra cuestión incidental.',
        guia: 'Estructura de incidente: hechos que lo motivan, fundamento, y petición. Deja ' +
            'claro si es de previo y especial pronunciamiento o si se tramita por cuerda separada.',
        pide: '¿Qué incidente necesita promover?',
    },

    // ── Medidas ──────────────────────────────────────────────────────────
    {
        value: 'medidas_provisionales',
        label: 'Medidas provisionales',
        categoria: 'medida',
        cuando: 'Familiar: alimentos, guarda y custodia, convivencia, uso del domicilio.',
        guia: 'Pide las medidas de manera concreta y cuantificada donde proceda. Justifica cada ' +
            'una con los hechos que constan y, si hay menores, articula el interés superior de ' +
            'la niñez con lo que el expediente acredita.',
        pide: '¿Qué medidas necesita y a favor de quién?',
    },
    {
        value: 'providencias',
        label: 'Providencias precautorias',
        categoria: 'medida',
        cuando: 'Para asegurar bienes o personas antes o durante el juicio.',
        guia: 'Acredita los dos extremos: la apariencia del buen derecho y el peligro en la ' +
            'demora, cada uno con el documento de la carpeta que lo sostiene. Precisa qué bienes ' +
            'o qué medida, y ofrece garantía si la ley la exige.',
        pide: '¿Qué providencia pide y sobre qué?',
    },
    {
        value: 'suspension',
        label: 'Solicitud de suspensión',
        categoria: 'medida',
        cuando: 'Para que no se ejecute el acto mientras se resuelve.',
        guia: 'Precisa el acto cuya suspensión se pide, los daños de difícil reparación que su ' +
            'ejecución causaría, y por qué no se sigue perjuicio al interés social ni se ' +
            'contravienen disposiciones de orden público.',
        pide: '¿La ejecución de qué acto quiere detener?',
    },

    // ── Vistas ───────────────────────────────────────────────────────────
    {
        value: 'contestacion_vista',
        label: 'Contestación de vista',
        categoria: 'vista',
        cuando: 'Le dieron vista con un escrito y corre el plazo para contestar.',
        guia: 'Contesta el escrito con el que se dio vista punto por punto, en su orden. ' +
            'Distingue lo que se admite, lo que se niega y lo que se objeta. Cierra pidiendo lo ' +
            'que corresponda según el sentido de la contestación.',
        pide: '¿Con qué escrito le dieron vista?',
    },
    {
        value: 'objecion_pruebas',
        label: 'Objeción de pruebas',
        categoria: 'vista',
        cuando: 'Para objetar documentos ofrecidos por la contraria.',
        guia: 'Objeta documento por documento, precisando si es en cuanto a su alcance y valor ' +
            'probatorio o en cuanto a su autenticidad, y el motivo concreto de cada objeción.',
        pide: '¿Qué pruebas objeta?',
    },

    // ── Impugnaciones ────────────────────────────────────────────────────
    {
        value: 'apelacion',
        label: 'Recurso de apelación',
        categoria: 'impugnacion',
        cuando: 'Contra sentencia o auto apelable.',
        guia: 'Precisa la resolución recurrida —fecha y sentido—, y expón los AGRAVIOS como ' +
            'agravios: cada uno identifica la parte de la resolución que lesiona, la razón por ' +
            'la que es ilegal, y el precepto o criterio que se estima violado. Numéralos. ' +
            'No son alegatos: son ataques a puntos concretos de la resolución.',
        pide: '¿Qué resolución apela y qué le agravia?',
    },
    {
        value: 'revocacion',
        label: 'Revocación o reposición',
        categoria: 'impugnacion',
        cuando: 'Contra autos y decretos no apelables.',
        guia: 'Identifica el auto recurrido, expón por qué debe revocarse y pide que se deje sin ' +
            'efecto y se provea en el sentido correcto.',
        pide: '¿Qué auto recurre?',
    },
    {
        value: 'queja',
        label: 'Recurso de queja',
        categoria: 'impugnacion',
        cuando: 'Contra omisiones o resoluciones que la ley señala.',
        guia: 'Precisa la conducta u omisión que motiva la queja, el precepto que la hace ' +
            'procedente, y lo que se pide.',
        pide: '¿Qué omisión o resolución motiva la queja?',
    },
]

export function tipoEscrito(value: string): TipoEscrito | undefined {
    return TIPOS_ESCRITO.find((t) => t.value === value)
}

export function escritosDe(categoria: CategoriaEscrito): TipoEscrito[] {
    return TIPOS_ESCRITO.filter((t) => t.categoria === categoria)
}

export interface EscritoGenerado {
    titulo: string
    markdown: string
    /** Lo que el abogado tiene que llenar porque no constaba. */
    huecos: string[]
}

/** Presupuesto de contexto, el mismo criterio que el análisis de carpeta. */
const PRESUPUESTO = 120_000

/**
 * Redacta el escrito con los documentos de la carpeta como única fuente.
 *
 * Cobra una consulta —la cobra `/chat`, igual que el análisis— porque es una
 * generación completa con todo el expediente en contexto.
 */
export async function generarEscrito(
    expediente: Expediente,
    documentos: DocumentoExpediente[],
    tipo: TipoEscrito,
    instruccion: string,
    /* La entidad federativa NO vive en la carpeta sino en el perfil del
       abogado, y aquí pesa: no se redacta igual un incidente en Querétaro que
       en Sinaloa. Se pasa para que el buscador filtre por esa jurisdicción. */
    estado: string | null | undefined,
    accessToken?: string,
    userIdQuePide?: string,
    signal?: AbortSignal
): Promise<EscritoGenerado> {
    const conTexto = documentos.filter((d) => d.extracto && d.extracto.trim())
    if (conTexto.length === 0) {
        throw new Error(
            'Esta carpeta no tiene documentos legibles todavía. Sube al menos uno para que ' +
            'Iurexia pueda redactar con base en tu asunto.'
        )
    }

    // Reparto parejo del presupuesto: un expediente con veinte documentos no
    // puede dejar que el primero se coma todo el contexto.
    const racion = Math.max(2_000, Math.floor(PRESUPUESTO / conTexto.length))
    const porCategoria = categoriasDe(expediente.tipo)
        .map((cat) => {
            const grupo = conTexto.filter((d) => d.categoria === cat.value)
            if (grupo.length === 0) return null
            const cuerpo = grupo
                .map((d) => {
                    const t = (d.extracto ?? '').trim()
                    return t.length <= racion
                        ? `— ${d.nombre}:\n${t}`
                        : `— ${d.nombre} (extracto de ${t.length.toLocaleString('es-MX')} ` +
                          `caracteres):\n${t.slice(0, racion)}\n[…truncado…]`
                })
                .join('\n\n')
            return `## ${cat.label}\n${cuerpo}`
        })
        .filter(Boolean)
        .join('\n\n')

    const ficha = [
        `Carpeta: ${nombreCarpeta(expediente)}`,
        `Tipo: ${tipoCarpeta(expediente.tipo).label}`,
        expediente.materia ? `Materia: ${expediente.materia}` : null,
        expediente.objetivo ? `Objetivo del asunto: ${expediente.objetivo}` : null,
        expediente.pretension ? `Pretensión: ${expediente.pretension}` : null,
    ]
        .filter(Boolean)
        .join('\n')

    const prompt =
        `Eres el abogado postulante y redactas un escrito que se va a presentar ante un ` +
        `juzgado mexicano. Redactas ${tipo.label.toUpperCase()}.\n\n` +
        `QUÉ DEBE CONTENER\n${tipo.guia}\n\n` +
        (instruccion.trim()
            ? `LO QUE PIDE EL ABOGADO\n${instruccion.trim()}\n\n`
            : '') +
        `REGLAS QUE NO SE NEGOCIAN\n` +
        `1. Este escrito va a un juzgado. NO INVENTES NADA: ni números de expediente, ni ` +
        `nombres, ni fechas, ni juzgados, ni montos, ni domicilios. Si un dato indispensable ` +
        `no consta en los documentos, escríbelo como hueco entre corchetes dobles, así: ` +
        `[[número de expediente]]. Es preferible un escrito con diez huecos a uno con un solo ` +
        `dato inventado.\n` +
        `2. Cita fundamentos legales sólo si estás seguro del precepto. Si no lo estás, escribe ` +
        `[[fundamento aplicable]] y sigue. Nunca inventes un artículo ni una tesis.\n` +
        `3. Usa los hechos de los documentos, no los adornes. Cuando afirmes un hecho, que salga ` +
        `de un documento de la carpeta.\n` +
        `4. Escribe en el registro forense mexicano: proemio, hechos numerados, derecho, ` +
        `puntos petitorios, protesto lo necesario, lugar y fecha, nombre y firma.\n\n` +
        `FORMATO DE LA RESPUESTA\n` +
        `Primero el escrito completo en Markdown, listo para imprimir.\n` +
        `Al final, separado por una línea con «---», una sección titulada exactamente ` +
        `«## Lo que debe completar» con la lista de todos los huecos [[...]] que dejaste y qué ` +
        `dato va en cada uno. Si no dejaste ninguno, escribe una viñeta que lo diga.\n\n` +
        `# Ficha del asunto\n${ficha}\n\n# Documentos de la carpeta\n${porCategoria}`

    let respuesta = ''
    for await (const trozo of streamChat(
        [{ role: 'user', content: prompt }],
        estado ?? undefined,
        30,
        accessToken,
        false,
        userIdQuePide,
        undefined,
        undefined,
        expediente.materia ?? undefined,
        signal
    )) {
        respuesta += trozo
    }

    const limpio = respuesta.replace(/<!--thinking-->[\s\S]*?<!--\/thinking-->/g, '').trim()
    if (!limpio) throw new Error('No se recibió respuesta. Vuelve a intentarlo.')

    // Los huecos se sacan del TEXTO, no de la sección final: el modelo puede
    // olvidarse de listarlos, pero los corchetes están donde los escribió.
    const huecos = Array.from(new Set(
        (limpio.match(/\[\[([^\]]+)\]\]/g) ?? []).map((h) => h.slice(2, -2).trim())
    ))

    return {
        titulo: `${tipo.label} — ${nombreCarpeta(expediente)}`,
        markdown: limpio,
        huecos,
    }
}
