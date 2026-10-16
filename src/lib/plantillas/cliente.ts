/**
 * LAS PLANTILLAS DESDE EL NAVEGADOR (16-oct-2026): las llamadas a
 * /api/plantillas con la sesión, y lo que se hace con el Word que vuelve
 * (bajarlo, abrirlo en el editor, sacarle el texto para la carpeta).
 *
 * mammoth se carga sólo cuando hace falta: pesa, y la mayoría de las visitas
 * a una carpeta no abren el editor.
 */

import { cabecerasConSesion } from '@/lib/cliente/sesion'
import type { CampoPlantilla, LimitesPlantillas, PlantillaResumen, VistaPlantilla } from './campos'
import { htmlDeDocx, textoDeDocx } from './vista'

export class ErrorPlantillas extends Error {
    status: number
    sinEsquema: boolean
    tope: boolean
    constructor(mensaje: string, status: number, datos?: { sinEsquema?: boolean; tope?: boolean }) {
        super(mensaje)
        this.name = 'ErrorPlantillas'
        this.status = status
        this.sinEsquema = !!datos?.sinEsquema
        this.tope = !!datos?.tope
    }
}

const SIN_RED = 'No hubo respuesta de Iurexia. Revisa tu conexión y vuelve a intentarlo.'

async function pedir(url: string, init: RequestInit): Promise<Response> {
    try { return await fetch(url, init) } catch { throw new ErrorPlantillas(SIN_RED, 0) }
}

async function json<T>(url: string, init: RequestInit): Promise<T> {
    const r = await pedir(url, init)
    const datos = await r.json().catch(() => ({}))
    if (!r.ok) throw new ErrorPlantillas(datos?.error || 'No se pudo completar. Vuelve a intentarlo.', r.status, datos)
    return datos as T
}

export interface ListaPlantillas {
    plantillas: PlantillaResumen[]
    limites: LimitesPlantillas
}

export async function listarPlantillas(): Promise<ListaPlantillas> {
    return json('/api/plantillas', { headers: await cabecerasConSesion(false), cache: 'no-store' })
}

export interface PlantillaEnRevision {
    plantilla: PlantillaResumen
    vista: VistaPlantilla
    aviso?: string | null
    revisadaPorIurexia?: boolean
}

export async function subirPlantilla(archivo: File, nombre?: string): Promise<PlantillaEnRevision> {
    const form = new FormData()
    form.append('archivo', archivo)
    if (nombre) form.append('nombre', nombre)
    return json('/api/plantillas', { method: 'POST', headers: await cabecerasConSesion(false), body: form })
}

export async function abrirPlantilla(id: string): Promise<PlantillaEnRevision> {
    return json(`/api/plantillas/${encodeURIComponent(id)}`, { headers: await cabecerasConSesion(false), cache: 'no-store' })
}

export async function guardarCampos(id: string, campos: CampoPlantilla[]): Promise<{ plantilla: PlantillaResumen; descartados: string[] }> {
    return json(`/api/plantillas/${encodeURIComponent(id)}/campos`, {
        method: 'POST',
        headers: await cabecerasConSesion(),
        body: JSON.stringify({ campos }),
    })
}

export async function cambiarPlantilla(id: string, cambios: { nombre?: string; descripcion?: string | null; materia?: string | null }): Promise<PlantillaResumen> {
    const r = await json<{ plantilla: PlantillaResumen }>(`/api/plantillas/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: await cabecerasConSesion(),
        body: JSON.stringify(cambios),
    })
    return r.plantilla
}

export async function borrarPlantilla(id: string): Promise<void> {
    await json(`/api/plantillas/${encodeURIComponent(id)}`, { method: 'DELETE', headers: await cabecerasConSesion(false) })
}

export interface DocumentoGenerado {
    blob: Blob
    nombre: string
}

/** Llena la plantilla en el servidor y devuelve el Word con el formato original. */
export async function generarDocumento(id: string, valores: Record<string, string>, expedienteId?: string | null): Promise<DocumentoGenerado> {
    const r = await pedir(`/api/plantillas/${encodeURIComponent(id)}/generar`, {
        method: 'POST',
        headers: await cabecerasConSesion(),
        body: JSON.stringify({ valores, expediente_id: expedienteId || undefined }),
    })
    if (!r.ok) {
        const datos = await r.json().catch(() => ({}))
        throw new ErrorPlantillas(datos?.error || 'No se pudo armar el documento. Vuelve a intentarlo.', r.status, datos)
    }
    const blob = await r.blob()
    const crudo = r.headers.get('X-Nombre-Archivo')
    let nombre = 'Documento.docx'
    try { if (crudo) nombre = decodeURIComponent(crudo) } catch { /* se queda el genérico */ }
    return { blob, nombre }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cargarMammoth(): Promise<any> {
    const m = await import('mammoth')
    return (m as { default?: unknown }).default ?? m
}

/** El Word lleno como HTML para la hoja del editor (mismas reglas que la vista previa). */
export async function htmlParaEditor(blob: Blob): Promise<string> {
    return htmlDeDocx(await cargarMammoth(), { arrayBuffer: await blob.arrayBuffer() })
}

/** El texto del Word, para el extracto de la carpeta (así no se vuelve a leer ni a cobrar). */
export async function textoDeWord(blob: Blob): Promise<string> {
    try { return await textoDeDocx(await cargarMammoth(), { arrayBuffer: await blob.arrayBuffer() }) } catch { return '' }
}

export function bajarArchivo(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
