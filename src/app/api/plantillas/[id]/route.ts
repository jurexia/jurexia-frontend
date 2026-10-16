/**
 * UNA PLANTILLA (16-oct-2026).
 *
 *   GET    → la plantilla y su vista previa, para volver a revisar sus campos.
 *   PATCH  { nombre?, descripcion?, materia? } → renombrar o reclasificar.
 *   DELETE → la borra con sus dos archivos.
 *
 * Siempre la del usuario que pide: el id solo no basta.
 */

import { NextRequest, NextResponse } from 'next/server'
import { servicio, solicitanteDe } from '@/lib/servidor/peticion'
import { abrirDocx, leerPartes, PlantillaInvalida } from '@/lib/plantillas/docx'
import {
    aResumen, BUCKET, COLUMNAS, descargar, fallo, faltaEsquema, plantillaDe, SIN_ESQUEMA, vistaDe,
    type FilaPlantilla,
} from '@/lib/plantillas/servidor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Contexto = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Contexto) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para ver tus plantillas.')
    const { fila, error } = await plantillaDe(yo.user.id, params.id)
    if (error) return faltaEsquema(error) ? fallo(503, SIN_ESQUEMA, { sinEsquema: true }) : fallo(500, 'No se pudo abrir la plantilla.')
    if (!fila) return fallo(404, 'Esa plantilla ya no existe.')
    try {
        const original = await descargar(fila.archivo_original)
        const partes = leerPartes(abrirDocx(original))
        return NextResponse.json({ plantilla: aResumen(fila), vista: await vistaDe(original, partes) })
    } catch (e) {
        if (e instanceof PlantillaInvalida) return fallo(422, e.message)
        console.error('[plantillas] abrir original:', (e as Error)?.message)
        return fallo(500, 'No se pudo leer el documento de la plantilla. Vuelve a intentarlo.')
    }
}

const MATERIAS = new Set(['civil', 'familiar', 'mercantil', 'penal', 'laboral', 'amparo', 'administrativo', 'fiscal', 'agrario', 'notarial'])

export async function PATCH(req: NextRequest, { params }: Contexto) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para cambiar tus plantillas.')
    let cuerpo: Record<string, unknown>
    try { cuerpo = await req.json() } catch { return fallo(400, 'Petición mal formada.') }

    const cambios: Record<string, unknown> = {}
    if (typeof cuerpo.nombre === 'string') {
        const nombre = cuerpo.nombre.replace(/\s+/g, ' ').trim().slice(0, 120)
        if (!nombre) return fallo(400, 'Ponle un nombre a la plantilla.')
        cambios.nombre = nombre
    }
    if (typeof cuerpo.descripcion === 'string' || cuerpo.descripcion === null) {
        cambios.descripcion = typeof cuerpo.descripcion === 'string' ? cuerpo.descripcion.replace(/\s+/g, ' ').trim().slice(0, 140) || null : null
    }
    if (typeof cuerpo.materia === 'string' || cuerpo.materia === null) {
        const m = typeof cuerpo.materia === 'string' ? cuerpo.materia.trim().toLowerCase() : ''
        cambios.materia = MATERIAS.has(m) ? m : null
    }
    if (Object.keys(cambios).length === 0) return fallo(400, 'No hay nada que cambiar.')
    cambios.updated_at = new Date().toISOString()

    const { data, error } = await servicio().from('plantillas_abogado').update(cambios)
        .eq('id', params.id).eq('user_id', yo.user.id).select(COLUMNAS).maybeSingle()
    if (error) return faltaEsquema(error) ? fallo(503, SIN_ESQUEMA, { sinEsquema: true }) : fallo(500, 'No se pudo guardar el cambio.')
    if (!data) return fallo(404, 'Esa plantilla ya no existe.')
    return NextResponse.json({ plantilla: aResumen(data as FilaPlantilla) })
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para borrar tus plantillas.')
    const { fila, error } = await plantillaDe(yo.user.id, params.id)
    if (error) return faltaEsquema(error) ? fallo(503, SIN_ESQUEMA, { sinEsquema: true }) : fallo(500, 'No se pudo borrar la plantilla.')
    if (!fila) return fallo(404, 'Esa plantilla ya no existe.')
    const db = servicio()
    const { error: errBorrar } = await db.from('plantillas_abogado').delete().eq('id', fila.id).eq('user_id', yo.user.id)
    if (errBorrar) return fallo(500, 'No se pudo borrar la plantilla.')
    // Los archivos, después del renglón: un archivo huérfano no se ve; un
    // renglón sin archivo sí, y fallaría al usarlo.
    const rutas = [fila.archivo_original, fila.archivo_marcado].filter((r): r is string => !!r)
    const { error: errArchivos } = await db.storage.from(BUCKET).remove(rutas)
    if (errArchivos) console.warn('[plantillas] quedaron archivos sin borrar:', rutas.join(', '), errArchivos.message)
    return NextResponse.json({ borrada: true })
}
