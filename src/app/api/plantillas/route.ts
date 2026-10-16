/**
 * LAS PLANTILLAS DEL ABOGADO (16-oct-2026).
 *
 *   GET  → sus plantillas y cuánto le queda de cada tope.
 *   POST (multipart: archivo, nombre) → valida el .docx, comprueba cuántas
 *        puede guardar su plan, guarda el original, detecta los campos (los
 *        marcadores que ya trae y, si cabe en su tope, lo que propone el modelo
 *        ligero) y devuelve la propuesta con la vista previa para revisarla.
 *        La plantilla todavía NO se puede usar: falta que el abogado confirme
 *        los campos (POST /api/plantillas/[id]/campos).
 */

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { servicio, solicitanteDe } from '@/lib/servidor/peticion'
import { gastarUso } from '@/lib/servidor/uso'
import { escalonDe, PLANTILLAS_GUARDADAS } from '@/lib/uso-funciones-config'
import { abrirDocx, leerPartes, MAX_BYTES, PlantillaInvalida } from '@/lib/plantillas/docx'
import { combinar, detectarMarcadores, textoParaModelo, type SugerenciaModelo } from '@/lib/plantillas/deteccion'
import {
    aResumen, BUCKET, COLUMNAS, fallo, faltaEsquema, guardarArchivo, limitesDe, nombreLimpio, rutaOriginal,
    SIN_ESQUEMA, sugerirConModelo, vistaDe, type FilaPlantilla,
} from '@/lib/plantillas/servidor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para ver tus plantillas.')
    const { data, error } = await servicio().from('plantillas_abogado').select(COLUMNAS)
        .eq('user_id', yo.user.id).order('updated_at', { ascending: false })
    if (error) {
        if (faltaEsquema(error)) return fallo(503, SIN_ESQUEMA, { sinEsquema: true })
        console.error('[plantillas] listar:', error.message)
        return fallo(500, 'No se pudieron cargar tus plantillas. Vuelve a intentarlo.')
    }
    const filas = (data ?? []) as FilaPlantilla[]
    return NextResponse.json({ plantillas: filas.map(aResumen), limites: await limitesDe(yo, filas.length) })
}

export async function POST(req: NextRequest) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para subir una plantilla.')
    const uid = yo.user.id

    let form: FormData
    try { form = await req.formData() } catch { return fallo(400, 'No llegó el archivo. Vuelve a intentarlo.') }
    const archivo = form.get('archivo')
    if (!archivo || typeof archivo === 'string') return fallo(400, 'Elige un documento de Word (.docx).')
    const nombreArchivo = (archivo as File).name || 'plantilla.docx'
    if (/\.(docm|dotm)$/i.test(nombreArchivo)) return fallo(400, 'El documento tiene macros (.docm). Por seguridad no se aceptan: guárdalo como «Documento de Word (.docx)».')
    if (/\.doc$/i.test(nombreArchivo)) return fallo(400, 'Es un Word antiguo (.doc). Ábrelo en Word y guárdalo como «Documento de Word (.docx)».')
    if (!/\.(docx|dotx)$/i.test(nombreArchivo)) return fallo(400, 'Sólo se aceptan documentos de Word (.docx).')
    if (archivo.size > MAX_BYTES) return fallo(413, `La plantilla pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo es 10 MB.`)

    const bytes = new Uint8Array(await archivo.arrayBuffer())
    let doc
    try { doc = abrirDocx(bytes) } catch (e) {
        if (e instanceof PlantillaInvalida) return fallo(400, e.message)
        throw e
    }

    // ¿Cabe otra en su plan? Antes de gastar nada.
    const db = servicio()
    const { count, error: errCuenta } = await db.from('plantillas_abogado').select('id', { count: 'exact', head: true }).eq('user_id', uid)
    if (errCuenta) {
        if (faltaEsquema(errCuenta)) return fallo(503, SIN_ESQUEMA, { sinEsquema: true })
        return fallo(500, 'No se pudo revisar tu plan. Vuelve a intentarlo.')
    }
    const maximo = PLANTILLAS_GUARDADAS[escalonDe(yo.plan)]
    if ((count ?? 0) >= maximo) {
        return fallo(403, `Tu plan guarda hasta ${maximo} ${maximo === 1 ? 'plantilla' : 'plantillas'}. Borra una que ya no uses o mejora tu plan para guardar más.`, { tope: true })
    }

    const partes = leerPartes(doc)
    const marcadores = detectarMarcadores(partes)
    const texto = textoParaModelo(partes, marcadores)
    const original = doc.eraDotx ? doc.zip.generate({ type: 'uint8array', compression: 'DEFLATE' }) : bytes
    // La vista previa corre mientras el modelo piensa.
    const vistaEnCamino = vistaDe(original, partes)

    /* EL MODELO, SÓLO SI HACE FALTA Y SI CABE. Una plantilla que ya viene con
       {{campos}} está preparada a mano: el modelo no tiene nada que añadir y
       no se cobra. Lo que gasta es 'plantilla_deteccion' (tope por mes). */
    let sugerencia: SugerenciaModelo | null = null
    let aviso: string | null = null
    const preparada = marcadores.some((m) => m.textos[0].startsWith('{{'))
    if (!preparada && texto.replace(/⟦\d+⟧/g, '').trim().length > 40) {
        try {
            const uso = await gastarUso(uid, yo.plan, 'plantilla_deteccion')
            if (uso.permitido) {
                try { sugerencia = await sugerirConModelo(texto) } catch (e) {
                    console.warn('[plantillas] el modelo no respondió:', (e as Error)?.message)
                    aviso = 'Iurexia no pudo revisar el documento esta vez. Te mostramos los huecos que ya traía; marca los demás seleccionando el texto.'
                }
                if (!sugerencia && !aviso) aviso = 'La revisión de Iurexia llegó incompleta. Te mostramos los huecos que ya traía; marca los demás seleccionando el texto.'
            } else {
                aviso = `${uso.mensaje} Te mostramos los huecos que la plantilla ya traía; marca los demás seleccionando el texto.`
            }
        } catch (e) {
            aviso = (e as Error)?.message || 'No se pudo registrar el uso.'
        }
    }
    const det = combinar(partes, marcadores, sugerencia)

    const id = randomUUID()
    const ruta = rutaOriginal(uid, id)
    const errSubida = await guardarArchivo(ruta, original)
    if (errSubida) {
        if (faltaEsquema(errSubida)) return fallo(503, SIN_ESQUEMA, { sinEsquema: true })
        console.error('[plantillas] guardar original:', errSubida.message)
        return fallo(500, 'No se pudo guardar la plantilla. Vuelve a intentarlo.')
    }
    const { data: fila, error: errAlta } = await db.from('plantillas_abogado').insert({
        id,
        user_id: uid,
        nombre: nombreLimpio(form.get('nombre'), nombreArchivo),
        descripcion: det.descripcion,
        materia: det.materia,
        archivo_original: ruta,
        archivo_marcado: null,
        campos: det.campos,
    }).select(COLUMNAS).single()
    if (errAlta || !fila) {
        // Sin renglón no se deja el archivo huérfano.
        await db.storage.from(BUCKET).remove([ruta])
        if (faltaEsquema(errAlta)) return fallo(503, SIN_ESQUEMA, { sinEsquema: true })
        console.error('[plantillas] alta:', errAlta?.message)
        return fallo(500, 'No se pudo guardar la plantilla. Vuelve a intentarlo.')
    }

    return NextResponse.json({
        plantilla: aResumen(fila as FilaPlantilla),
        vista: await vistaEnCamino,
        aviso,
        revisadaPorIurexia: !!sugerencia,
    }, { status: 201 })
}
