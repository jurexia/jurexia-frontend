/**
 * LOS CAMPOS CONFIRMADOS (16-oct-2026).
 *
 *   POST { campos } → el abogado revisó la propuesta: se vuelven a validar
 *   contra el documento (el navegador no decide qué se reemplaza), se marca el
 *   ORIGINAL con {{clave}} en cada aparición y se guarda `marcado.docx`. Desde
 *   ese momento la plantilla se puede usar.
 *
 * No gasta nada: marcar es trabajo del servidor, no del modelo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { servicio, solicitanteDe } from '@/lib/servidor/peticion'
import { abrirDocx, leerPartes, marcar, NoSePudoLlenar, PlantillaInvalida } from '@/lib/plantillas/docx'
import { camposConfirmados } from '@/lib/plantillas/deteccion'
import {
    aResumen, COLUMNAS, descargar, fallo, faltaEsquema, guardarArchivo, plantillaDe, rutaMarcado, SIN_ESQUEMA,
    type FilaPlantilla,
} from '@/lib/plantillas/servidor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para guardar tu plantilla.')
    let cuerpo: { campos?: unknown }
    try { cuerpo = await req.json() } catch { return fallo(400, 'Petición mal formada.') }
    if (!Array.isArray(cuerpo.campos)) return fallo(400, 'Faltan los campos.')

    const { fila, error } = await plantillaDe(yo.user.id, params.id)
    if (error) return faltaEsquema(error) ? fallo(503, SIN_ESQUEMA, { sinEsquema: true }) : fallo(500, 'No se pudo abrir la plantilla.')
    if (!fila) return fallo(404, 'Esa plantilla ya no existe.')

    let original: Uint8Array
    try { original = await descargar(fila.archivo_original) } catch {
        return fallo(500, 'No se pudo leer el documento de la plantilla. Vuelve a intentarlo.')
    }

    try {
        const partes = leerPartes(abrirDocx(original))
        const { campos, descartados } = camposConfirmados(partes, cuerpo.campos)
        if (campos.length === 0) return fallo(400, 'Marca al menos un campo: sin campos, la plantilla siempre saldría igual.')

        const { docx, apariciones } = marcar(original, campos)
        const finales = campos.map((c) => ({ ...c, apariciones: apariciones.get(c.clave) ?? c.apariciones }))
        const ruta = rutaMarcado(yo.user.id, fila.id)
        const errSubida = await guardarArchivo(ruta, docx)
        if (errSubida) return fallo(500, 'No se pudo guardar la plantilla marcada. Vuelve a intentarlo.')

        const { data, error: errFila } = await servicio().from('plantillas_abogado')
            .update({ campos: finales, archivo_marcado: ruta, updated_at: new Date().toISOString() })
            .eq('id', fila.id).eq('user_id', yo.user.id).select(COLUMNAS).maybeSingle()
        if (errFila || !data) return fallo(500, 'No se pudo guardar la plantilla. Vuelve a intentarlo.')
        return NextResponse.json({ plantilla: aResumen(data as FilaPlantilla), descartados })
    } catch (e) {
        if (e instanceof PlantillaInvalida) return fallo(422, e.message)
        if (e instanceof NoSePudoLlenar) return fallo(422, `${e.message} Revisa los campos que se enciman y vuelve a guardar.`)
        console.error('[plantillas] marcar:', (e as Error)?.message)
        return fallo(500, 'No se pudo preparar la plantilla. Vuelve a intentarlo.')
    }
}
