import type { Message } from '@/lib/api'
import { getSession } from '@/lib/supabase'
import { quitarBloques } from '@/lib/idsDeCita'

/**
 * LA MEMORIA DE LA CONVERSACIÓN (7-oct-2026).
 *
 * Una abogada trabajó una conversación larga y, cada vez que adjuntaba un
 * documento, el análisis la contradecía y olvidaba lo hablado: `/analyze-document`
 * recibía el archivo y la instrucción, nunca la conversación. Ahora viaja
 * (`historialParaAnalisis`), y el API tiene una memoria con tope por plan:
 * cuando la conversación lo rebasa, lee completo lo reciente, abrevia lo
 * antiguo y lo avisa con el marcador `MEMORIA_LLENA` dentro de la respuesta.
 * El aviso ofrece seguir en una conversación nueva que arranca con un resumen
 * de lo trabajado (`pedirContinuacion`).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com'

/* El marcador `MEMORIA_LLENA` y su lectura viven en `@/lib/memoria-llena`
   (funciones puras, que `respuestaDelChat` usa y se miden en Node). */

/* ═══ EL HISTORIAL QUE ACOMPAÑA AL DOCUMENTO ════════════════════════════ */

/* EL TOPE DE UN CAMPO DE FORMULARIO. `historial` viaja como campo de texto en
   el multipart de `/analyze-document`, y Starlette (FastAPI 0.141 / Starlette
   1.3 en el API) rechaza cualquier campo que no sea archivo por encima de
   1 MiB —«Field exceeded maximum size of 1024KB»— antes de que el endpoint lo
   vea: el análisis entero fallaría justo en las conversaciones largas, que son
   para las que se manda. Si el API sube ese tope o lo recibe como archivo,
   esto se puede retirar. Se deja margen para el nombre del campo. */
const LIMITE_HISTORIAL_BYTES = 1_000_000

/** Lo pesado que el API tira de todos modos al limpiar el historial: el mapa
 *  de citas, las fuentes adelantadas, los precedentes y el razonamiento. El
 *  texto del documento leído (DOCUMENTO_INICIO/FIN) y lo demás se quedan. */
function sinCargaDeMarcadores(t: string): string {
    let s = quitarBloques(t, /<!-- ?CITATION_META:/g, '-->')
    s = quitarBloques(s, /<!-- ?FUENTES_PREVIAS:/g, '-->')
    s = quitarBloques(s, /<!-- ?PRECEDENTES_META:/g, '-->')
    s = quitarBloques(s, /<!--THINKING_START-->/g, '<!--THINKING_END-->')
    s = quitarBloques(s, /<!--thinking-->/g, '<!--/thinking-->')
    return s
}

type Turno = { role: 'user' | 'assistant'; content: string }

function turnosDe(mensajes: Message[]): Turno[] {
    return mensajes
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !!m.content?.trim())
        .map((m) => ({ role: m.role as Turno['role'], content: m.content }))
}

/**
 * El campo `historial` de `/analyze-document`: los mensajes que YA estaban en
 * la conversación, en orden y tal como están en pantalla (el API limpia los
 * marcadores). Null si no hay conversación previa.
 *
 * Sólo si no cabe en el campo (ver `LIMITE_HISTORIAL_BYTES`) se aligera:
 * primero se quita la carga de los marcadores, y si aún no cabe, salen los
 * mensajes más antiguos —los que el API abreviaría primero—. Mejor eso que un
 * análisis que no llega.
 */
export function historialParaAnalisis(mensajes: Message[]): string | null {
    const turnos = turnosDe(mensajes)
    if (!turnos.length) return null
    const cod = new TextEncoder()
    const json = JSON.stringify(turnos)
    if (cod.encode(json).length <= LIMITE_HISTORIAL_BYTES) return json

    const ligeros = turnos.map((t) => ({ role: t.role, content: sinCargaDeMarcadores(t.content) }))
    let total = 2   // los corchetes
    let desde = ligeros.length
    while (desde > 0) {
        const peso = cod.encode(JSON.stringify(ligeros[desde - 1])).length + (desde < ligeros.length ? 1 : 0)
        if (total + peso > LIMITE_HISTORIAL_BYTES) break
        total += peso
        desde--
    }
    const quedan = ligeros.slice(desde)
    console.warn(`[analyze-document] historial de ${cod.encode(json).length} bytes: `
        + `sin marcadores y sin los ${desde} mensaje(s) más antiguos para caber en el formulario.`)
    return quedan.length ? JSON.stringify(quedan) : null
}

/* ═══ EL DOCUMENTO ADJUNTO, OCULTO EN SU MENSAJE ════════════════════════ */

/**
 * El mensaje del abogado con el texto leído del documento dentro, oculto
 * entre DOCUMENTO_INICIO/FIN: la burbuja enseña la ficha del archivo y la
 * pregunta, y el texto viaja en el historial de los turnos siguientes. Es el
 * formato del evento `documento` de `/analyze-document` (23-sep-2026), y el
 * de la conversación que continúa otra: los dos salen de aquí para que no
 * se separen.
 */
export function mensajeConDocumento(visible: string, nombre: string, texto: string, recortado = false): string {
    const aviso = recortado ? '; es la primera parte, el documento es más largo' : ''
    return `${visible}\n\n<!-- DOCUMENTO_INICIO -->\n`
        + `CONTENIDO DEL DOCUMENTO ADJUNTO «${nombre}» (texto leído por Iurexia${aviso}):\n\n`
        + `${texto}\n<!-- DOCUMENTO_FIN -->`
}

/** El encabezado con que ChatInput abre el mensaje de un adjunto. */
export function encabezadoDeAdjunto(nombre: string, pregunta: string): string {
    return `📄 **Documento adjunto:** ${nombre}\n\n${pregunta}`
}

/* ═══ CONTINUAR EN UNA CONVERSACIÓN NUEVA ═══════════════════════════════ */

export const ARCHIVO_LO_TRABAJADO = 'Lo-trabajado.md'
const PREGUNTA_DE_CONTINUACION = 'Continúo el trabajo de la conversación anterior.'
const APERTURA_DE_CONTINUACION = encabezadoDeAdjunto(ARCHIVO_LO_TRABAJADO, PREGUNTA_DE_CONTINUACION)

/** El primer mensaje de la conversación nueva: el resumen como adjunto oculto. */
export function aperturaDeContinuacion(documento: string): Message {
    return { role: 'user', content: mensajeConDocumento(APERTURA_DE_CONTINUACION, ARCHIVO_LO_TRABAJADO, documento) }
}

/** ¿Es el mensaje con que arranca una conversación continuada? */
export function esAperturaDeContinuacion(m: Message | undefined): boolean {
    return !!m && m.role === 'user' && m.content.startsWith(APERTURA_DE_CONTINUACION)
}

export interface Continuacion {
    titulo: string
    documento: string
    bienvenida: string
}

/** El resumen de la conversación tarda 20-60 s; a los 120 se da por perdido. */
const TOPE_CONTINUAR_MS = 120_000

/**
 * POST /conversacion/continuar: el API resume lo trabajado en un documento y
 * propone el título y la bienvenida de la conversación nueva. Lanza un Error
 * con un texto que se puede enseñar tal cual.
 */
export async function pedirContinuacion(opciones: { userId: string; titulo: string; mensajes: Message[] }): Promise<Continuacion> {
    const controlador = new AbortController()
    const reloj = setTimeout(() => controlador.abort(), TOPE_CONTINUAR_MS)
    try {
        const sesion = await getSession().catch(() => null)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (sesion?.access_token) headers.Authorization = `Bearer ${sesion.access_token}`
        let res: Response
        try {
            res = await fetch(`${API_URL}/conversacion/continuar`, {
                method: 'POST',
                headers,
                signal: controlador.signal,
                body: JSON.stringify({
                    user_id: opciones.userId,
                    titulo: opciones.titulo || '',
                    messages: turnosDe(opciones.mensajes),
                }),
            })
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') {
                throw new Error('El resumen tardó demasiado. Vuelva a intentarlo en un momento.')
            }
            throw new Error('No se pudo conectar con el servidor. Revise su conexión y vuelva a intentarlo.')
        }
        if (!res.ok) {
            const cuerpo = await res.json().catch(() => null)
            const detalle = typeof cuerpo?.detail === 'string' ? cuerpo.detail : ''
            throw new Error(detalle || `No se pudo preparar el resumen (error ${res.status}).`)
        }
        const datos = await res.json().catch(() => null)
        const documento = typeof datos?.documento === 'string' ? datos.documento.trim() : ''
        if (!documento) throw new Error('El servidor no devolvió el resumen de lo trabajado. Vuelva a intentarlo.')
        return {
            titulo: typeof datos?.titulo === 'string' ? datos.titulo.trim() : '',
            documento,
            bienvenida: typeof datos?.bienvenida === 'string' ? datos.bienvenida : '',
        }
    } finally {
        clearTimeout(reloj)
    }
}
