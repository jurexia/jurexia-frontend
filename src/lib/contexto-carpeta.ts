import {
    categoriasDe,
    etiquetaMateria,
    getDocumentos,
    getExpediente,
    nombreCarpeta,
    tipoCarpeta,
    type DocumentoExpediente,
    type Expediente,
} from './expedientes'

/**
 * Lo que el modelo sabe de la carpeta cuando la consulta vive dentro de ella.
 *
 * Viaja como mensaje de SISTEMA al principio de la conversación, no pegado a la
 * pregunta. Tres razones, medidas en el backend (main.py, /chat):
 *  - la búsqueda del acervo lee la última pregunta del abogado: si la carpeta
 *    fuera pegada ahí, se buscaría con la demanda entera y no con la pregunta;
 *  - la reescritura del hilo (`_consulta_con_hilo`) sólo mira mensajes de
 *    usuario y asistente, así que tampoco la ve;
 *  - todas las ramas del modelo aceptan un segundo mensaje de sistema (las de
 *    Gemini los funden en la instrucción de sistema).
 * Y no se guarda en el historial: se vuelve a armar en cada envío, así que un
 * documento que se sube a media conversación entra en la siguiente pregunta.
 *
 * NO se lee nada que no esté leído. Los extractos se guardan al subir cada
 * documento (y ahí se cobraron); la consulta no dispara OCR. Lo que no tenga
 * extracto se nombra como «sin leer» para que el modelo no lo dé por
 * inexistente.
 */

/** ~10 mil tokens de documentos: la carpeta ayuda sin encarecer cada pregunta. */
const PRESUPUESTO_DOCUMENTOS = 40_000
const MINIMO_POR_DOCUMENTO = 1_000
const TOPE_RESUMEN = 3_000
/** Una carpeta no cambia entre dos preguntas seguidas. */
const VIGENCIA_MS = 2 * 60 * 1000

interface ContextoCarpeta {
    texto: string
    carpeta: Expediente
    documentos: number
    leidos: number
}

const memoria = new Map<string, { hora: number; contexto: ContextoCarpeta }>()

/** Olvida lo armado para una carpeta (p. ej. tras subirle un documento). */
export function olvidarContextoCarpeta(expedienteId?: string) {
    if (expedienteId) memoria.delete(expedienteId)
    else memoria.clear()
}

/** A partes iguales, y lo que dejan los cortos se lo llevan los largos. */
function repartir(extractos: { doc: DocumentoExpediente; texto: string }[]): Map<string, number> {
    const racion = new Map<string, number>()
    let disponible = PRESUPUESTO_DOCUMENTOS
    let pendientes = [...extractos]
    while (pendientes.length > 0) {
        const parte = Math.max(MINIMO_POR_DOCUMENTO, Math.floor(disponible / pendientes.length))
        const caben = pendientes.filter((e) => e.texto.length <= parte)
        if (caben.length === 0) {
            pendientes.forEach((e) => racion.set(e.doc.id, parte))
            break
        }
        caben.forEach((e) => {
            racion.set(e.doc.id, e.texto.length)
            disponible -= e.texto.length
        })
        pendientes = pendientes.filter((e) => !racion.has(e.doc.id))
    }
    return racion
}

function lista(valor: unknown): string[] {
    return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string' && !!v.trim()) : []
}

function armar(carpeta: Expediente, documentos: DocumentoExpediente[]): ContextoCarpeta {
    const tipo = tipoCarpeta(carpeta.tipo)

    // Sólo lo que sirve para razonar el caso. Teléfono, correo y domicilio del
    // cliente se quedan fuera: no cambian ninguna respuesta y no tienen por qué
    // viajar en cada consulta.
    const ficha = [
        `Tipo de carpeta: ${tipo.label}`,
        `Nombre: ${nombreCarpeta(carpeta)}`,
        carpeta.objetivo ? `Objetivo declarado: ${carpeta.objetivo}` : 'Objetivo declarado: (no lo ha escrito)',
        carpeta.materia ? `Materia: ${etiquetaMateria(carpeta.materia)}` : null,
        carpeta.pretension ? `Pretensión: ${carpeta.pretension}` : null,
        tipo.pideCliente && carpeta.cliente_edad ? `Edad del cliente: ${carpeta.cliente_edad}` : null,
        tipo.pideCliente && carpeta.cliente_sexo ? `Sexo del cliente: ${carpeta.cliente_sexo}` : null,
    ]
        .filter(Boolean)
        .join('\n')

    const faltantes = lista(carpeta.faltantes)
    const riesgos = lista(carpeta.riesgos)
    const analisis = carpeta.resumen_ia
        ? [
              `## Lo que Iurexia ya advirtió al analizar la carpeta` +
                  (carpeta.resumen_at
                      ? ` (${new Date(carpeta.resumen_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })})`
                      : ''),
              typeof carpeta.avance === 'number' ? `Avance estimado: ${carpeta.avance}%` : null,
              faltantes.length ? `Qué falta:\n${faltantes.map((f) => `- ${f}`).join('\n')}` : null,
              riesgos.length ? `Riesgos:\n${riesgos.map((r) => `- ${r}`).join('\n')}` : null,
              `Resumen:\n${carpeta.resumen_ia.slice(0, TOPE_RESUMEN)}${carpeta.resumen_ia.length > TOPE_RESUMEN ? '\n[…]' : ''}`,
          ]
              .filter(Boolean)
              .join('\n')
        : null

    const conTexto = documentos
        .filter((d) => d.extracto && d.extracto.trim())
        .map((d) => ({ doc: d, texto: d.extracto!.trim() }))
    const sinTexto = documentos.filter((d) => !d.extracto || !d.extracto.trim())
    const racion = repartir(conTexto)

    const porGaveta = categoriasDe(carpeta.tipo)
        .map((cat) => {
            const delGrupo = conTexto.filter((e) => e.doc.categoria === cat.value)
            if (delGrupo.length === 0) return null
            const cuerpo = delGrupo
                .map((e) => {
                    const tope = racion.get(e.doc.id) ?? e.texto.length
                    if (e.texto.length <= tope) return `— ${e.doc.nombre}:\n${e.texto}`
                    return (
                        `— ${e.doc.nombre} (EXTRACTO: primeros ${tope.toLocaleString('es-MX')} de ` +
                        `${e.texto.length.toLocaleString('es-MX')} caracteres):\n${e.texto.slice(0, tope)}\n[…documento truncado…]`
                    )
                })
                .join('\n\n')
            return `### ${cat.label}\n${cuerpo}`
        })
        .filter(Boolean)
        .join('\n\n')

    const documentosTexto = documentos.length
        ? [
              `## Documentos de la carpeta (${documentos.length})`,
              porGaveta || null,
              sinTexto.length
                  ? `Sin leer todavía (existen, pero su texto no se ha extraído): ${sinTexto.map((d) => d.nombre).join('; ')}`
                  : null,
          ]
              .filter(Boolean)
              .join('\n\n')
        : '## Documentos de la carpeta\nLa carpeta todavía no tiene documentos.'

    const texto = [
        `# CARPETA DE TRABAJO: «${nombreCarpeta(carpeta)}»`,
        'El abogado hace esta consulta DENTRO de una de sus carpetas. Trátala como el expediente del caso: ' +
            'los hechos, las partes, las fechas y los documentos que constan aquí son los del asunto, y tu respuesta ' +
            'debe aplicarse a ellos, no quedarse en lo general.',
        'Reglas de la carpeta:\n' +
            '- Lo que dice la carpeta es información del abogado, no fuente jurídica. Las normas y los criterios se ' +
            'citan del acervo, como siempre, con su Doc ID.\n' +
            '- Cuando te apoyes en un documento de la carpeta, nómbralo por su nombre de archivo; nunca le asignes un Doc ID.\n' +
            '- Si la respuesta necesita un dato que no consta en la carpeta ni en la pregunta, dilo como faltante; no lo supongas.\n' +
            '- No transcribas la carpeta: interprétala para lo que se pregunta.',
        `## Ficha\n${ficha}`,
        analisis,
        documentosTexto,
    ]
        .filter(Boolean)
        .join('\n\n')

    return { texto, carpeta, documentos: documentos.length, leidos: conTexto.length }
}

export async function contextoDeCarpeta(expedienteId: string): Promise<ContextoCarpeta | null> {
    const guardado = memoria.get(expedienteId)
    if (guardado && Date.now() - guardado.hora < VIGENCIA_MS) return guardado.contexto
    try {
        const carpeta = await getExpediente(expedienteId)
        if (!carpeta) return null
        const documentos = await getDocumentos(expedienteId)
        const contexto = armar(carpeta, documentos)
        memoria.set(expedienteId, { hora: Date.now(), contexto })
        return contexto
    } catch (err) {
        // Sin carpeta la consulta sigue: responder sin el expediente es peor que
        // responder con él, pero mucho mejor que no responder.
        console.warn('[contexto-carpeta] no se pudo armar el contexto:', err)
        return null
    }
}

/**
 * El mensaje de sistema completo de una consulta: la instrucción de la parte
 * que el agente de un flujo está redactando (si la hay) y la carpeta (si la
 * hay). `null` si no hay ninguna: la consulta viaja exactamente como antes del
 * 25-sep. Las preguntas sueltas dentro de un flujo sólo llevan la carpeta.
 */
export async function contextoDeConsulta(opciones: {
    expedienteId: string | null
    extra?: string | null
}): Promise<string | null> {
    const partes: string[] = []
    if (opciones.extra) partes.push(opciones.extra)
    if (opciones.expedienteId) {
        const c = await contextoDeCarpeta(opciones.expedienteId)
        if (c) partes.push(c.texto)
    }
    return partes.length ? partes.join('\n\n---\n\n') : null
}
