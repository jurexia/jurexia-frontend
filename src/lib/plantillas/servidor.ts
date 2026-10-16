/**
 * LO COMÚN A LAS RUTAS /api/plantillas (16-oct-2026). Sólo servidor.
 *
 * Todo pasa por el servicio (service_role) y SIEMPRE filtrado por el
 * `user_id` de quien pide: la tabla sólo deja leer al dueño, pero aquí el
 * servicio se salta esas reglas, así que el filtro es la regla.
 *
 * Los archivos viven en el bucket privado `plantillas`:
 *   <uid>/<id>/original.docx   tal como lo subió el abogado
 *   <uid>/<id>/marcado.docx    con los campos como {{clave}}
 */

import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { servicio, type Solicitante } from '@/lib/servidor/peticion'
import { completar, jsonDe } from '@/lib/servidor/modelo'
import { escalonDe, LIMITES, PLANTILLAS_GUARDADAS } from '@/lib/uso-funciones-config'
import type { CampoPlantilla, LimitesPlantillas, PlantillaResumen, VistaPlantilla } from './campos'
import { MIME_DOCX, type Parte } from './docx'
import { SISTEMA_DETECCION, type SugerenciaModelo } from './deteccion'
import { encabezadosYPies, htmlDeDocx } from './vista'

export const BUCKET = 'plantillas'
export const rutaOriginal = (uid: string, id: string) => `${uid}/${id}/original.docx`
export const rutaMarcado = (uid: string, id: string) => `${uid}/${id}/marcado.docx`

/** Lo que se le enseña al abogado cuando la migración aún no está aplicada. */
export const SIN_ESQUEMA = 'Las plantillas todavía no están activadas en Iurexia. Escríbenos y las activamos.'

export function fallo(status: number, mensaje: string, extra?: Record<string, unknown>) {
    return NextResponse.json({ error: mensaje, ...(extra ?? {}) }, { status })
}

/** `true` si el error dice que la tabla, la función o el bucket no existen. */
export function faltaEsquema(err: { code?: string; message?: string } | null | undefined): boolean {
    if (!err) return false
    return ['42P01', '42883', 'PGRST202', 'PGRST205'].includes(String(err.code ?? ''))
        || /does not exist|schema cache|bucket not found/i.test(err.message ?? '')
}

export const COLUMNAS = 'id, nombre, descripcion, materia, campos, archivo_original, archivo_marcado, veces_usada, created_at, updated_at'

export interface FilaPlantilla {
    id: string
    nombre: string
    descripcion: string | null
    materia: string | null
    campos: CampoPlantilla[] | null
    archivo_original: string
    archivo_marcado: string | null
    veces_usada: number | null
    created_at: string
    updated_at: string
}

export function aResumen(f: FilaPlantilla): PlantillaResumen {
    return {
        id: f.id,
        nombre: f.nombre,
        descripcion: f.descripcion,
        materia: f.materia,
        campos: Array.isArray(f.campos) ? f.campos : [],
        lista: !!f.archivo_marcado,
        veces_usada: f.veces_usada ?? 0,
        created_at: f.created_at,
        updated_at: f.updated_at,
    }
}

/** La plantilla de ESTE usuario, o null. */
export async function plantillaDe(uid: string, id: string): Promise<{ fila: FilaPlantilla | null; error?: { code?: string; message?: string } }> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { fila: null }
    const { data, error } = await servicio().from('plantillas_abogado').select(COLUMNAS).eq('id', id).eq('user_id', uid).maybeSingle()
    if (error) return { fila: null, error }
    return { fila: (data as FilaPlantilla | null) ?? null }
}

export async function descargar(ruta: string): Promise<Uint8Array> {
    const { data, error } = await servicio().storage.from(BUCKET).download(ruta)
    if (error || !data) throw Object.assign(new Error(error?.message || 'No se pudo leer el archivo'), { code: (error as { statusCode?: string } | null)?.statusCode })
    return new Uint8Array(await data.arrayBuffer())
}

export async function guardarArchivo(ruta: string, bytes: Uint8Array): Promise<{ message?: string } | null> {
    const { error } = await servicio().storage.from(BUCKET).upload(ruta, bytes, { contentType: MIME_DOCX, upsert: true })
    return error ? { message: error.message } : null
}

/**
 * DEVOLVER LO QUE NO SE USÓ. El uso se gasta antes de llamar al modelo (así un
 * abuso no llega a costar), pero si el modelo no respondió o el documento no se
 * pudo armar, el abogado no recibió nada: con el plan gratuito, ésa era su
 * única detección del mes. Se resta una unidad del renglón de hoy. No es
 * atómico (leer y escribir), y por eso sólo puede equivocarse a favor del
 * abogado si dos devoluciones se cruzan.
 */
export async function devolverUso(uid: string, funcion: 'plantilla_deteccion' | 'plantilla_generar'): Promise<void> {
    try {
        const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
        const db = servicio()
        const { data } = await db.from('uso_funciones').select('n').eq('user_id', uid).eq('funcion', funcion).eq('dia', dia).maybeSingle()
        const n = Number((data as { n?: number } | null)?.n ?? 0)
        if (n > 0) await db.from('uso_funciones').update({ n: n - 1 }).eq('user_id', uid).eq('funcion', funcion).eq('dia', dia)
    } catch (e) {
        console.warn('[plantillas] no se pudo devolver el uso:', funcion, (e as Error)?.message)
    }
}

/** Cuánto le queda al abogado, para que la interfaz lo diga antes de cobrar. */
export async function limitesDe(yo: Solicitante, guardadas: number): Promise<LimitesPlantillas> {
    const escalon = escalonDe(yo.plan)
    const det = LIMITES.plantilla_deteccion, gen = LIMITES.plantilla_generar
    let usadosDet: number | null = null, usadosGen: number | null = null
    try {
        const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
        const inicioMes = `${hoy.slice(0, 7)}-01`
        const { data, error } = await servicio().from('uso_funciones').select('funcion, dia, n')
            .eq('user_id', yo.user.id).in('funcion', ['plantilla_deteccion', 'plantilla_generar']).gte('dia', inicioMes)
        if (!error && Array.isArray(data)) {
            usadosDet = 0; usadosGen = 0
            for (const r of data as { funcion: string; dia: string; n: number }[]) {
                if (r.funcion === 'plantilla_deteccion') usadosDet += r.n ?? 0
                else if (r.dia === hoy) usadosGen += r.n ?? 0
            }
        }
    } catch { /* sin conteo: la interfaz no dice cuántos quedan */ }
    return {
        escalon,
        guardadas: { usadas: guardadas, maximo: PLANTILLAS_GUARDADAS[escalon] },
        deteccion: { usados: usadosDet, limite: det.por[escalon], periodo: det.periodo },
        generar: { usados: usadosGen, limite: gen.por[escalon], periodo: gen.periodo },
    }
}

/**
 * La propuesta del modelo ligero (el de despacho, `IUREXIA_MODELO_DESPACHO`).
 * 40 s de tope: la ruta tiene 60 y antes hay que subir y leer el archivo.
 */
export async function sugerirConModelo(texto: string): Promise<SugerenciaModelo | null> {
    const respuesta = await completar({
        sistema: SISTEMA_DETECCION,
        usuario: `PLANTILLA:\n"""\n${texto}\n"""`,
        json: true,
        temperatura: 0.1,
        maxTokens: 6000,
        titulo: 'Iurexia Plantillas',
        tiempoMs: 40_000,
    })
    return jsonDe<SugerenciaModelo>(respuesta)
}

/** La vista previa para revisar: el cuerpo con mammoth y, aparte, encabezados y pies. */
export async function vistaDe(bytes: Uint8Array, partes: readonly Parte[]): Promise<VistaPlantilla> {
    let html = ''
    try { html = await htmlDeDocx(mammoth, { buffer: Buffer.from(bytes) }) } catch (e) {
        console.warn('[plantillas] mammoth no pudo con la vista previa:', (e as Error)?.message)
    }
    return { html, ...encabezadosYPies(partes) }
}

/** El nombre visible: el que escribió o el del archivo sin extensión. */
export function nombreLimpio(nombre: unknown, archivo: string): string {
    const propio = typeof nombre === 'string' ? nombre.replace(/\s+/g, ' ').trim() : ''
    const delArchivo = archivo.replace(/\.(docx|dotx)$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
    return (propio || delArchivo || 'Plantilla sin nombre').slice(0, 120)
}
