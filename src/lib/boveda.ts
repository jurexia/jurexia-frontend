/* ═══ LA BÓVEDA (oct-2026) ═══════════════════════════════════════════════
   Cientos de documentos por carpeta, indexados para preguntarles juntos: en
   el chat (fuente «Bóveda», cita a documento y página) y en la tabla de
   revisión. Sólo Platinum; cobra consultas en proporción y SIEMPRE cotiza
   antes de cobrar. El diseño y los costos viven en el repo de la API
   (BOVEDA.md); aquí sólo se habla con ella.

   Los archivos NO pasan por la API: ella revisa plan y cuotas y da una URL
   firmada por archivo, y el navegador sube directo al cubo privado `boveda`.

   Para VER un archivo, la API da una URL firmada de una hora. Nunca se manda
   por el proxy /api/ley/pdf: ese proxy guarda en la CDN (s-maxage) y estos
   son documentos privados del cliente. Supabase permite CORS, y pdf.js los
   lee directo. */

import { supabase } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390'

export const PLANES_PLATINUM = ['platinum_monthly', 'platinum_annual', 'ultra_secretarios']

export type EstadoDocumento =
    | 'subiendo' | 'subido' | 'revisando' | 'revisado'
    | 'en_cola' | 'procesando' | 'listo' | 'error'

export interface DocumentoBoveda {
    id: string
    nombre: string
    estado: EstadoDocumento
    paginas: number | null
    paginas_ocr: number | null
    tamano: number | null
    fragmentos: number | null
    error: string | null
    creado_en: string
    mime_type: string | null
    aproximadas: boolean
}

export interface Cotizacion {
    ids: string[]
    documentos: number
    paginas: number
    paginas_ocr: number
    paginas_texto: number
    consultas: number
    disponibles: number | null
    alcanza: boolean
    excede_cuota: boolean
    mensaje_cuota: string | null
    pendientes_de_revision?: number
    sin_costo?: boolean
}

export interface BovedaCarpeta {
    carpeta_id: string
    documentos: DocumentoBoveda[]
    resumen: {
        total: number; listos: number; por_revisar: number; por_cobrar: number
        en_proceso: number; errores: number; paginas_listas: number
    }
    cotizacion: Cotizacion | null
    tablas: { id: string; titulo: string; columnas: number; actualizado_en: string }[]
}

export interface Reglas {
    platinum: boolean
    plan: string | null
    disponibles: number | null
    reglas: { paginas_ocr_por_consulta: number; paginas_texto_por_consulta: number; celdas_por_consulta: number }
    cuotas: {
        docs_carpeta: number; docs_usuario: number; paginas_usuario: number
        paginas_documento: number; mb_archivo: number; gb_usuario: number
    }
}

export type TipoColumna = 'texto' | 'fecha' | 'monto' | 'si_no' | 'lista'

export interface Columna {
    id: string
    titulo: string
    pregunta: string
    tipo: TipoColumna
}

export interface RespuestaCelda {
    valor?: string
    encontrado?: boolean
    cita?: string
    pagina?: number | null
    verificada?: boolean
    similitud?: number
    error?: string
}

export interface Celda {
    documento_id: string
    columna_id: string
    estado: 'en_cola' | 'procesando' | 'lista' | 'error'
    respuesta: RespuestaCelda | null
}

export interface TablaRevision {
    tabla: { id: string; titulo: string; columnas: Columna[]; expediente_id: string; actualizado_en: string }
    filas: { id: string; nombre: string; paginas: number | null; aproximadas: boolean }[]
    celdas: Celda[]
    pendientes: number
}

/** Un error de la API con su código («solo_platinum», «sin_saldo»…) y, si
 *  la cotización cambió, la nueva. */
export class ErrorBoveda extends Error {
    constructor(
        mensaje: string,
        public estado: number,
        public codigo?: string,
        public datos?: Record<string, unknown>,
    ) {
        super(mensaje)
    }
}

async function token(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    const t = data.session?.access_token
    if (!t) throw new ErrorBoveda('Inicia sesión para usar la Bóveda.', 401)
    return t
}

async function pedir<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
    const r = await fetch(`${API_URL}${ruta}`, {
        method: opciones.metodo ?? 'GET',
        headers: {
            Authorization: `Bearer ${await token()}`,
            ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
        const det = d?.detail
        if (det && typeof det === 'object') {
            throw new ErrorBoveda(det.mensaje || 'No se pudo completar.', r.status, det.codigo, det)
        }
        throw new ErrorBoveda(typeof det === 'string' ? det : 'No se pudo completar.', r.status)
    }
    return d as T
}

export const leerReglas = () => pedir<Reglas>('/boveda/reglas')
export const leerBoveda = (carpetaId: string) => pedir<BovedaCarpeta>(`/boveda/carpeta/${carpetaId}`)
export const cotizarIngesta = (carpetaId: string) =>
    pedir<Cotizacion>(`/boveda/carpeta/${carpetaId}/cotizar`, { metodo: 'POST' })
export const confirmarIngesta = (carpetaId: string, ids: string[], consultas: number) =>
    pedir<{ tanda_id: string; documentos: number; consultas_cobradas: number; disponibles: number | null }>(
        `/boveda/carpeta/${carpetaId}/confirmar`, { metodo: 'POST', cuerpo: { ids, consultas_esperadas: consultas } })
export const borrarDocumentoBoveda = (docId: string) =>
    pedir<{ borrado: boolean }>(`/boveda/documento/${docId}`, { metodo: 'DELETE' })
export const vaciarBoveda = (carpetaId: string) =>
    pedir<{ borrados: number }>(`/boveda/carpeta/${carpetaId}`, { metodo: 'DELETE' })
export const abrirDocumento = (docId: string) =>
    pedir<DocumentoBoveda & { url: string }>(`/boveda/documento/${docId}`)
export const paginasDe = (docId: string) =>
    pedir<{ id: string; nombre: string; paginas: string[] }>(`/boveda/documento/${docId}/paginas`)

export const columnasSugeridas = () =>
    pedir<{ columnas: Columna[]; tipos: Record<TipoColumna, string> }>('/boveda/columnas-sugeridas')
export const crearTabla = (carpetaId: string, titulo: string, columnas: Columna[]) =>
    pedir<{ id: string }>(`/boveda/carpeta/${carpetaId}/tablas`, { metodo: 'POST', cuerpo: { titulo, columnas } })
export const leerTabla = (tablaId: string) => pedir<TablaRevision>(`/boveda/tablas/${tablaId}`)
export const editarTabla = (tablaId: string, cambio: { titulo?: string; columnas?: Columna[] }) =>
    pedir<unknown>(`/boveda/tablas/${tablaId}`, { metodo: 'PATCH', cuerpo: cambio })
export const borrarTabla = (tablaId: string) => pedir<unknown>(`/boveda/tablas/${tablaId}`, { metodo: 'DELETE' })

export interface Corrida { doc_ids?: string[]; columna_ids?: string[]; rehacer?: boolean }
export const cotizarTabla = (tablaId: string, c: Corrida = {}) =>
    pedir<{ celdas: number; consultas: number; disponibles: number | null; alcanza: boolean; sin_costo: boolean }>(
        `/boveda/tablas/${tablaId}/cotizar`, { metodo: 'POST', cuerpo: c })
export const ejecutarTabla = (tablaId: string, consultas: number, c: Corrida = {}) =>
    pedir<{ celdas: number; consultas_cobradas: number; disponibles: number | null }>(
        `/boveda/tablas/${tablaId}/ejecutar`, { metodo: 'POST', cuerpo: { ...c, consultas_esperadas: consultas } })

/** Descarga la tabla en Excel o Word (lleva la sesión, por eso no es un enlace). */
export async function exportarTabla(tablaId: string, formato: 'xlsx' | 'docx', titulo: string): Promise<void> {
    const r = await fetch(`${API_URL}/boveda/tablas/${tablaId}/exportar?formato=${formato}`, {
        headers: { Authorization: `Bearer ${await token()}` },
    })
    if (!r.ok) throw new ErrorBoveda('No se pudo exportar la tabla.', r.status)
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '_').slice(0, 60) || 'tabla'}.${formato}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/* ── Subir ────────────────────────────────────────────────────────────── */
const ACEPTADOS = /\.(pdf|docx)$/i
const LOTE = 50
const A_LA_VEZ = 4

export interface ProgresoSubida { subidos: number; total: number; fallidos: string[]; rechazados: { nombre: string; motivo: string }[] }

/** Filtra lo que la Bóveda admite (PDF y .docx); el resto se reporta. */
export function separarArchivos(archivos: File[]): { validos: File[]; ignorados: string[] } {
    const validos: File[] = []
    const ignorados: string[] = []
    for (const f of archivos) {
        if (ACEPTADOS.test(f.name)) validos.push(f)
        else if (!f.name.startsWith('.')) ignorados.push(f.name)
    }
    return { validos, ignorados }
}

/**
 * Reserva, sube directo a Storage y avisa a la API, en lotes de 50 y de 4 en
 * 4. Un archivo que falla no detiene a los demás. Al terminar, la API ya
 * tiene los documentos «subidos» y su trabajador empieza a contar páginas.
 */
export async function subirArchivos(
    carpetaId: string,
    archivos: File[],
    alAvanzar: (p: ProgresoSubida) => void,
): Promise<ProgresoSubida> {
    const prog: ProgresoSubida = { subidos: 0, total: archivos.length, fallidos: [], rechazados: [] }
    alAvanzar({ ...prog })
    for (let i = 0; i < archivos.length; i += LOTE) {
        const lote = archivos.slice(i, i + LOTE)
        const r = await pedir<{
            aceptados: { id: string; nombre: string; path: string; token: string; ref: string | null }[]
            rechazados: { nombre: string; motivo: string; ref: string | null }[]
        }>(`/boveda/carpeta/${carpetaId}/subidas`, {
            metodo: 'POST',
            // `ref` vuelve tal cual: así se casa cada URL con SU archivo aunque
            // dos se llamen igual o alguno se rechace.
            cuerpo: { archivos: lote.map((f, n) => ({ nombre: f.name, tamano: f.size, mime: f.type || null, ref: String(n) })) },
        })
        prog.rechazados.push(...r.rechazados.map(({ nombre, motivo }) => ({ nombre, motivo })))
        prog.total -= r.rechazados.length
        const listos: string[] = []
        const fallidos: string[] = []
        let k = 0
        const trabajar = async () => {
            while (k < r.aceptados.length) {
                const j = k++
                const a = r.aceptados[j]
                const archivo = lote[Number(a.ref)]
                try {
                    if (!archivo) throw new Error('sin archivo')
                    const { error } = await supabase.storage
                        .from('boveda')
                        .uploadToSignedUrl(a.path, a.token, archivo, { contentType: archivo.type || undefined })
                    if (error) throw error
                    listos.push(a.id)
                    prog.subidos += 1
                } catch {
                    fallidos.push(a.id)
                    prog.fallidos.push(a.nombre)
                }
                alAvanzar({ ...prog })
            }
        }
        await Promise.all(Array.from({ length: Math.min(A_LA_VEZ, r.aceptados.length) }, trabajar))
        await pedir(`/boveda/carpeta/${carpetaId}/subidas/listas`, {
            metodo: 'POST', cuerpo: { ids: listos, fallidos },
        })
    }
    alAvanzar({ ...prog })
    return prog
}

/* ── La fuente «Bóveda» del chat ──────────────────────────────────────────
   Como Internet en `@/lib/fuentes`: vive en el módulo y api.ts la lee al
   enviar. La pantalla del chat la fija cuando la consulta está dentro de una
   carpeta con Bóveda; el botón «Fuentes» la enciende y la apaga. */
export const EVENTO_BOVEDA = 'iurexia:boveda'

let carpetaConBoveda: { id: string; documentos: number } | null = null
let bovedaEncendida = true

function avisar() {
    try {
        window.dispatchEvent(new CustomEvent(EVENTO_BOVEDA, { detail: estadoBovedaChat() }))
    } catch { /* sin ventana */ }
}

/** La pantalla del chat: esta carpeta tiene `documentos` listos en su Bóveda (o null). */
export function fijarCarpetaConBoveda(c: { id: string; documentos: number } | null): void {
    const cambio = carpetaConBoveda?.id !== c?.id
    carpetaConBoveda = c && c.documentos > 0 ? c : null
    if (cambio) bovedaEncendida = true
    avisar()
}

export function fijarBovedaEncendida(encendida: boolean): void {
    bovedaEncendida = encendida
    avisar()
}

export function estadoBovedaChat(): { disponible: boolean; encendida: boolean; documentos: number } {
    return {
        disponible: carpetaConBoveda !== null,
        encendida: carpetaConBoveda !== null && bovedaEncendida,
        documentos: carpetaConBoveda?.documentos ?? 0,
    }
}

/** Lo que api.ts manda como `boveda_carpeta_id` (o nada). */
export function bovedaParaEnviar(): string | null {
    return carpetaConBoveda && bovedaEncendida ? carpetaConBoveda.id : null
}

/* ── Rótulos ──────────────────────────────────────────────────────────── */
export const ROTULO_ESTADO: Record<EstadoDocumento, string> = {
    subiendo: 'Subiendo',
    subido: 'Contando páginas',
    revisando: 'Contando páginas',
    revisado: 'Por confirmar',
    en_cola: 'En cola',
    procesando: 'Leyendo',
    listo: 'Listo',
    error: 'Error',
}

export function textoCotizacion(c: Pick<Cotizacion, 'documentos' | 'paginas' | 'paginas_ocr' | 'consultas'>): string {
    const docs = `${c.documentos.toLocaleString('es-MX')} ${c.documentos === 1 ? 'documento' : 'documentos'}`
    const pags = `${c.paginas.toLocaleString('es-MX')} ${c.paginas === 1 ? 'página' : 'páginas'}`
    const ocr = c.paginas_ocr ? ` (${c.paginas_ocr.toLocaleString('es-MX')} escaneadas)` : ''
    const cons = `${c.consultas} ${c.consultas === 1 ? 'consulta' : 'consultas'}`
    return `${docs} · ${pags}${ocr} → ${cons}`
}
