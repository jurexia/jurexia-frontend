import { supabase } from './supabase'
import { streamChat } from './api'

/**
 * Carpetas inteligentes — la misma pieza que ya existe en la app móvil.
 *
 * El abogado que empieza en el teléfono y luego abre la web tiene que
 * reconocer lo que ve. Por eso los tipos, las gavetas, las cuotas y las
 * instrucciones que se le dan al modelo son **literalmente los mismos** que en
 * `iurexia-mobile/src/lib/expedientes.ts`: las dos interfaces leen y escriben
 * las tablas `expedientes` y `expediente_documentos`, así que una carpeta
 * creada en el celular aparece aquí con su mismo avance y sus mismos faltantes.
 *
 * Si se cambia algo de este archivo hay que cambiarlo también allá, y al revés.
 * Lo que sí difiere es la entrada y salida de archivos: aquí se trabaja con
 * `File` y `Blob` del navegador, no con rutas del sistema de archivos.
 */

const BUCKET = 'expedientes'

// ─── Tipos de carpeta ────────────────────────────────────────────────────────

export type MateriaLitigio =
    | 'penal'
    | 'civil'
    | 'laboral'
    | 'administrativo'
    | 'agrario'
    | 'amparo'

export const MATERIAS_LITIGIO: { value: MateriaLitigio; label: string }[] = [
    { value: 'penal', label: 'Penal' },
    { value: 'civil', label: 'Civil' },
    { value: 'laboral', label: 'Laboral' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'agrario', label: 'Agrario' },
    { value: 'amparo', label: 'Amparo' },
]

export type CategoriaDocumento =
    | 'base'
    | 'pruebas'
    | 'demandas'
    | 'impugnacion'
    | 'fuentes'
    | 'notas'
    | 'borradores'
    | 'referencia'
    | 'versiones'
    | 'final'

export type TipoCarpeta = 'cliente' | 'asunto' | 'academico' | 'documento'

/**
 * No todo abogado litiga. El tipo de carpeta decide tres cosas: qué datos pide
 * el alta, qué gavetas se ofrecen y con qué criterio la IA juzga si está
 * completa. Un expediente de amparo y una tesis de maestría no se revisan igual.
 */
export const TIPOS_CARPETA: {
    value: TipoCarpeta
    label: string
    descripcion: string
    /** Cómo se rotula el campo del título en el alta. */
    etiquetaTitulo: string
    ejemploObjetivo: string
    /** Si pide la ficha del cliente (nombre, edad, domicilio…). */
    pideCliente: boolean
    /** Si pide materia del litigio. */
    pideMateria: boolean
    categorias: CategoriaDocumento[]
}[] = [
    {
        value: 'cliente',
        label: 'Cliente',
        descripcion: 'Una persona a la que representas, con uno o varios asuntos.',
        etiquetaTitulo: 'Nombre del cliente',
        ejemploObjetivo: 'Recuperar la pensión alimenticia atrasada de tres años.',
        pideCliente: true,
        pideMateria: true,
        categorias: ['base', 'pruebas', 'demandas', 'impugnacion'],
    },
    {
        value: 'asunto',
        label: 'Asunto o juicio',
        descripcion: 'Un procedimiento concreto, aunque sea del mismo cliente.',
        etiquetaTitulo: 'Nombre del asunto',
        ejemploObjetivo: 'Obtener la suspensión definitiva contra la negativa del IMSS.',
        pideCliente: false,
        pideMateria: true,
        categorias: ['base', 'pruebas', 'demandas', 'impugnacion'],
    },
    {
        value: 'academico',
        label: 'Proyecto académico',
        descripcion: 'Tesis, artículo, ponencia o investigación.',
        etiquetaTitulo: 'Tema del proyecto',
        ejemploObjetivo:
            'Sustentar una tesis sobre la suspensión en amparo con perspectiva de género.',
        pideCliente: false,
        pideMateria: false,
        categorias: ['fuentes', 'notas', 'borradores'],
    },
    {
        value: 'documento',
        label: 'Documento legal',
        descripcion: 'Un contrato, convenio o escrito que estás redactando.',
        etiquetaTitulo: 'Nombre del documento',
        ejemploObjetivo: 'Redactar un contrato de arrendamiento comercial a cinco años.',
        pideCliente: false,
        pideMateria: false,
        categorias: ['referencia', 'versiones', 'final'],
    },
]

export function tipoCarpeta(tipo: string | null | undefined) {
    return TIPOS_CARPETA.find((t) => t.value === tipo) ?? TIPOS_CARPETA[0]
}

export const CATEGORIAS: {
    value: CategoriaDocumento
    label: string
    descripcion: string
}[] = [
    {
        value: 'base',
        label: 'Documentos base',
        descripcion: 'Lo que funda la acción: contratos, escrituras, actas, identificaciones.',
    },
    {
        value: 'pruebas',
        label: 'Pruebas',
        descripcion: 'Documentales, periciales, testimoniales y todo material probatorio.',
    },
    {
        value: 'demandas',
        label: 'Demandas y promociones',
        descripcion: 'Escritos presentados y por presentar en el expediente.',
    },
    {
        value: 'impugnacion',
        label: 'Medios de impugnación',
        descripcion: 'Recursos, apelaciones, revisiones y amparos interpuestos.',
    },
    // Proyecto académico
    {
        value: 'fuentes',
        label: 'Fuentes',
        descripcion: 'Doctrina, tesis, legislación y jurisprudencia que sustentan el trabajo.',
    },
    {
        value: 'notas',
        label: 'Notas y fichas',
        descripcion: 'Apuntes de lectura, fichas bibliográficas y esquemas.',
    },
    {
        value: 'borradores',
        label: 'Borradores',
        descripcion: 'Capítulos y versiones en curso del texto.',
    },
    // Documento legal
    {
        value: 'referencia',
        label: 'Modelos y referencia',
        descripcion: 'Formatos, contratos similares y normativa aplicable.',
    },
    {
        value: 'versiones',
        label: 'Versiones',
        descripcion: 'Los borradores que has ido negociando o corrigiendo.',
    },
    {
        value: 'final',
        label: 'Versión final',
        descripcion: 'El documento listo para firmar o presentar.',
    },
]

/** Las gavetas que corresponden a una carpeta según su tipo. */
export function categoriasDe(tipo: string | null | undefined) {
    const permitidas = tipoCarpeta(tipo).categorias
    return CATEGORIAS.filter((c) => permitidas.includes(c.value))
}

// ─── Registros ───────────────────────────────────────────────────────────────

export interface Expediente {
    id: string
    tipo: TipoCarpeta
    /** Nombre visible de la carpeta. En clientes suele igualar cliente_nombre. */
    titulo: string | null
    /** Contra esto mide la IA qué falta. Es el corazón de la carpeta. */
    objetivo: string | null
    /** Lo que la IA detectó que falta para cumplir el objetivo. */
    faltantes: string[] | null
    /** Advertencias que el abogado podría no haber visto. */
    riesgos: string[] | null
    /** 0–100 estimado por la IA. */
    avance: number | null
    cliente_nombre: string
    cliente_edad: number | null
    cliente_sexo: string | null
    cliente_domicilio: string | null
    cliente_telefono: string | null
    cliente_correo: string | null
    pretension: string | null
    materia: MateriaLitigio
    resumen_ia: string | null
    estado_ia: string | null
    resumen_at: string | null
    created_at: string
    updated_at: string
    /** Número de documentos, cuando viene del listado. */
    totalDocumentos?: number
}

export interface DocumentoExpediente {
    id: string
    expediente_id: string
    categoria: CategoriaDocumento
    nombre: string
    storage_path: string
    mime_type: string | null
    tamano: number | null
    extracto: string | null
    created_at: string
}

export interface NuevoExpediente {
    tipo: TipoCarpeta
    titulo: string
    objetivo?: string
    cliente_nombre?: string
    cliente_edad?: string
    cliente_sexo?: string
    cliente_domicilio?: string
    cliente_telefono?: string
    cliente_correo?: string
    pretension?: string
    materia?: MateriaLitigio
}

/** El nombre que se muestra en la lista, sea cual sea el tipo de carpeta. */
export function nombreCarpeta(e: Expediente): string {
    return e.titulo?.trim() || e.cliente_nombre?.trim() || 'Carpeta sin nombre'
}

export function etiquetaMateria(materia: string): string {
    return MATERIAS_LITIGIO.find((m) => m.value === materia)?.label ?? materia
}

// ─── Cuota de almacenamiento por plan ────────────────────────────────────────

/**
 * Cuánto espacio tiene cada plan, en megabytes. Mismas cifras que en la app.
 *
 * Salen de una cuenta concreta: un acuerdo de 20 páginas escaneado pesa ~8 MB,
 * pero su TEXTO extraído pesa ~40 KB. Como lo que alimenta al análisis es el
 * texto, lo caro de guardar es el original, no lo que hace lista a la carpeta.
 */
export const CUOTA_MB: Record<string, number> = {
    gratuito: 20,
    basico_monthly: 100,
    basico_annual: 100,
    pro_monthly: 500,
    pro_annual: 500,
    platinum_monthly: 2048,
    platinum_annual: 2048,
    ultra_secretarios: 2048,
}

export function cuotaDe(plan: string | null | undefined): number {
    return CUOTA_MB[plan ?? 'gratuito'] ?? CUOTA_MB.gratuito
}

/**
 * Hojas que lee cada plan de un documento. Espejo de `PAGINAS_POR_PLAN` en el
 * API, que es quien manda: aquí sirve para DECIRLO ANTES, no para decidir.
 *
 * Quien rechaza es el backend, que cuenta las hojas de verdad y responde 413
 * sin cobrar. Esta copia existe porque un abogado que sube un expediente de
 * 400 hojas merece saber el tope antes de esperar la subida, no después.
 */
export const PAGINAS_POR_PLAN: Record<string, number> = {
    gratuito: 20,
    basico_monthly: 50,
    basico_annual: 50,
    pro_monthly: 100,
    pro_annual: 100,
    platinum_monthly: 600,
    platinum_annual: 600,
    ultra_secretarios: 600,
}

export function paginasDe(plan: string | null | undefined): number {
    return PAGINAS_POR_PLAN[plan ?? 'gratuito'] ?? PAGINAS_POR_PLAN.gratuito
}

export interface UsoAlmacenamiento {
    usadoMB: number
    cuotaMB: number
    /** 0–1; sirve para pintar la barra y para avisar antes de que se llene. */
    proporcion: number
}

export async function usoAlmacenamiento(
    plan: string | null | undefined
): Promise<UsoAlmacenamiento> {
    const cuotaMB = cuotaDe(plan)
    const uid = await userId()
    if (!uid) return { usadoMB: 0, cuotaMB, proporcion: 0 }

    const { data, error } = await supabase
        .from('expediente_documentos')
        .select('tamano')
        .eq('user_id', uid)

    if (error || !data) return { usadoMB: 0, cuotaMB, proporcion: 0 }

    const bytes = data.reduce(
        (suma: number, d: { tamano: number | null }) => suma + (d.tamano ?? 0),
        0
    )
    const usadoMB = bytes / (1024 * 1024)
    return {
        usadoMB: Math.round(usadoMB * 10) / 10,
        cuotaMB,
        proporcion: cuotaMB > 0 ? Math.min(1, usadoMB / cuotaMB) : 0,
    }
}

/**
 * El documento tiene más hojas de las que lee el plan.
 *
 * No es un error del abogado ni un fallo nuestro: es el límite anunciado.
 * El mensaje viene del backend y ya nombra el plan que sí lo cubre, así que
 * se muestra tal cual.
 */
export class DemasiadoGrande extends Error {
    constructor(mensaje: string) {
        super(mensaje)
        this.name = 'DemasiadoGrande'
    }
}

export class SinEspacio extends Error {
    constructor(usadoMB: number, cuotaMB: number) {
        super(
            `Ya usaste ${usadoMB.toFixed(1)} MB de los ${cuotaMB} MB de tu plan. ` +
                'Libera espacio borrando documentos que ya no necesites, o mejora tu plan.'
        )
        this.name = 'SinEspacio'
    }
}

export class ExpedientesNoConfigurado extends Error {
    constructor() {
        super(
            'El espacio de carpetas aún no está configurado en la base de datos. ' +
                'Escríbenos y lo activamos.'
        )
        this.name = 'ExpedientesNoConfigurado'
    }
}

// ─── Auxiliares ──────────────────────────────────────────────────────────────

async function userId(): Promise<string | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    return session?.user?.id ?? null
}

/** `true` si el error indica que las tablas todavía no existen en Supabase. */
function tablaFaltante(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false
    return (
        error.code === '42P01' ||
        /does not exist|relation .* does not exist/i.test(error.message ?? '')
    )
}

// ─── Expedientes ─────────────────────────────────────────────────────────────

export async function getExpedientes(): Promise<Expediente[]> {
    const uid = await userId()
    if (!uid) return []

    const { data, error } = await supabase
        .from('expedientes')
        .select('*, expediente_documentos(count)')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })

    if (error) {
        if (tablaFaltante(error)) throw new ExpedientesNoConfigurado()
        console.warn('[expedientes] no se pudo listar:', error.message)
        return []
    }

    return (data ?? []).map((row: any) => ({
        ...row,
        totalDocumentos: row.expediente_documentos?.[0]?.count ?? 0,
    })) as Expediente[]
}

export async function getExpediente(id: string): Promise<Expediente | null> {
    const uid = await userId()
    if (!uid) return null

    const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .eq('id', id)
        .eq('user_id', uid)
        .single()

    if (error) {
        if (tablaFaltante(error)) throw new ExpedientesNoConfigurado()
        return null
    }
    return data as Expediente
}

export async function crearExpediente(datos: NuevoExpediente): Promise<Expediente> {
    const uid = await userId()
    if (!uid) throw new Error('Inicia sesión para crear una carpeta.')

    const edad = datos.cliente_edad?.trim() ? parseInt(datos.cliente_edad, 10) : null

    const { data, error } = await supabase
        .from('expedientes')
        .insert({
            user_id: uid,
            tipo: datos.tipo,
            titulo: datos.titulo.trim(),
            objetivo: datos.objetivo?.trim() || null,
            // En una carpeta de cliente el título ES el nombre del cliente; en
            // las demás no hay cliente y la columna queda vacía a propósito.
            cliente_nombre: (datos.cliente_nombre ?? datos.titulo).trim() || null,
            cliente_edad: Number.isFinite(edad as number) ? edad : null,
            cliente_sexo: datos.cliente_sexo || null,
            cliente_domicilio: datos.cliente_domicilio?.trim() || null,
            cliente_telefono: datos.cliente_telefono?.trim() || null,
            cliente_correo: datos.cliente_correo?.trim() || null,
            pretension: datos.pretension?.trim() || null,
            materia: datos.materia ?? null,
        })
        .select()
        .single()

    if (error) {
        if (tablaFaltante(error)) throw new ExpedientesNoConfigurado()
        throw new Error(`No se pudo crear la carpeta: ${error.message}`)
    }
    return data as Expediente
}

export async function actualizarObjetivo(id: string, objetivo: string): Promise<void> {
    const { error } = await supabase
        .from('expedientes')
        .update({ objetivo: objetivo.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) throw new Error(`No se pudo guardar el objetivo: ${error.message}`)
}

export async function borrarExpediente(id: string): Promise<void> {
    // Los documentos se van por ON DELETE CASCADE; limpiamos también el Storage.
    const docs = await getDocumentos(id)
    if (docs.length > 0) {
        await supabase.storage.from(BUCKET).remove(docs.map((d) => d.storage_path))
    }
    const { error } = await supabase.from('expedientes').delete().eq('id', id)
    if (error) throw new Error(`No se pudo eliminar la carpeta: ${error.message}`)
}

// ─── Documentos ──────────────────────────────────────────────────────────────

export async function getDocumentos(expedienteId: string): Promise<DocumentoExpediente[]> {
    const { data, error } = await supabase
        .from('expediente_documentos')
        .select('*')
        .eq('expediente_id', expedienteId)
        .order('created_at', { ascending: false })

    if (error) {
        if (tablaFaltante(error)) throw new ExpedientesNoConfigurado()
        return []
    }
    return (data ?? []) as DocumentoExpediente[]
}

/**
 * Sube un archivo a la carpeta.
 *
 * A diferencia de la app —que maneja base64 porque es lo que entregan el
 * selector y la cámara del teléfono—, aquí llega un `File` del navegador y se
 * sube tal cual, sin convertirlo: Supabase Storage acepta `Blob` directamente y
 * pasar por base64 costaría un tercio más de memoria por nada.
 */
export async function subirDocumento(
    expedienteId: string,
    categoria: CategoriaDocumento,
    archivo: File,
    plan?: string | null,
    /** El texto, cuando ya se conoce (una tesis, una respuesta del chat). */
    extracto?: string
): Promise<DocumentoExpediente> {
    const uid = await userId()
    if (!uid) throw new Error('Inicia sesión para subir documentos.')

    // El tope de peso es POR PLAN, espejo del backend: platinum y ultra suben
    // hasta 50 MB por archivo, el resto 25. Se dice AQUÍ, con el peso y el
    // porqué, antes de que el abogado espere minutos de subida para un
    // rechazo seguro. Quien decide sigue siendo el backend con su 400.
    const esPlan50 = (plan ?? '').startsWith('platinum') || plan === 'ultra_secretarios'
    const mbPorArchivo = esPlan50 ? 50 : 25
    if (archivo.size > mbPorArchivo * 1024 * 1024) {
        const pesoMB = archivo.size / 1024 / 1024
        throw new DemasiadoGrande(
            `«${archivo.name}» pesa ${pesoMB.toFixed(0)} MB y ` +
            (esPlan50
                ? `el máximo por archivo es ${mbPorArchivo} MB. `
                : `tu plan acepta hasta ${mbPorArchivo} MB por archivo. ` +
                  (pesoMB <= 50 ? 'El plan Platinum acepta archivos de hasta 50 MB. ' : '')) +
            `Divide el expediente en partes (por etapa procesal funciona bien) y súbelas ` +
            `por separado: la carpeta las analiza juntas. Tu plan lee hasta ` +
            `${paginasDe(plan)} hojas por archivo.`
        )
    }

    // Se revisa la cuota ANTES de subir: si no cabe, no tiene sentido gastar la
    // red del abogado ni dejar el archivo a medias en Storage.
    const uso = await usoAlmacenamiento(plan)
    if (uso.usadoMB + archivo.size / (1024 * 1024) > uso.cuotaMB) {
        throw new SinEspacio(uso.usadoMB, uso.cuotaMB)
    }

    // SE LEE ANTES DE GUARDAR (16-ago-2026).
    //
    // Antes el archivo se subía a Storage y la lectura salía después, en
    // segundo plano y tragándose los errores: un documento de 300 hojas en un
    // plan que lee 30 quedaba almacenado, sin extracto y sin que nadie
    // avisara. Ahora, si no lo podemos leer, no lo guardamos y el abogado se
    // entera en el momento.
    //
    // El extracto que devuelve esta lectura se guarda con el registro, así
    // que no se lee dos veces ni se cobra dos veces.
    let extractoLeido = extracto ?? null
    if (!extractoLeido) {
        extractoLeido = await extraerDeArchivo(null, categoria, archivo)
    }

    const limpio = archivo.name.replace(/[^\w.\-]/g, '_')
    const storagePath = `${uid}/${expedienteId}/${Date.now()}-${limpio}`

    const { error: errSubida } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, archivo, {
            contentType: archivo.type || 'application/octet-stream',
            upsert: false,
        })

    if (errSubida) {
        if (/bucket not found/i.test(errSubida.message)) throw new ExpedientesNoConfigurado()
        throw new Error(`No se pudo subir el archivo: ${errSubida.message}`)
    }

    const { data, error } = await supabase
        .from('expediente_documentos')
        .insert({
            expediente_id: expedienteId,
            user_id: uid,
            categoria,
            nombre: archivo.name,
            storage_path: storagePath,
            mime_type: archivo.type || null,
            tamano: archivo.size,
            extracto: extractoLeido,
        })
        .select()
        .single()

    if (error) {
        // Si falló el registro, no dejamos el archivo huérfano en Storage.
        await supabase.storage.from(BUCKET).remove([storagePath])
        throw new Error(`No se pudo registrar el documento: ${error.message}`)
    }

    // Tocar la carpeta para que suba en el listado.
    await supabase
        .from('expedientes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', expedienteId)

    const doc = data as DocumentoExpediente

    return doc
}

export async function borrarDocumento(doc: DocumentoExpediente): Promise<void> {
    await supabase.storage.from(BUCKET).remove([doc.storage_path])
    const { error } = await supabase
        .from('expediente_documentos')
        .delete()
        .eq('id', doc.id)
    if (error) throw new Error(`No se pudo eliminar el documento: ${error.message}`)
}

/** URL temporal firmada para abrir o previsualizar el documento. */
export async function urlFirmada(
    doc: DocumentoExpediente,
    segundos = 3600
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, segundos)
    if (error) return null
    return data?.signedUrl ?? null
}

// ─── Lectura de la carpeta por la IA ─────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://jurexia-api.onrender.com'

/** Qué se le pide al lector según la gaveta donde cayó el documento. */
function promptExtracto(categoria: CategoriaDocumento): string {
    const foco: Record<CategoriaDocumento, string> = {
        base: 'partes, objeto, obligaciones, fechas y montos',
        pruebas: 'qué acredita, quién lo emite y su fecha',
        demandas: 'prestaciones, hechos, fundamentos y fecha de presentación',
        impugnacion: 'resolución combatida, agravios y fecha',
        fuentes: 'tesis o autor, criterio sostenido y datos de localización',
        notas: 'las ideas principales',
        borradores: 'estructura y argumentos que ya contiene',
        referencia: 'cláusulas relevantes y para qué sirve de modelo',
        versiones: 'qué cambió respecto de una versión anterior',
        final: 'contenido definitivo, partes y obligaciones',
    }
    return (
        'Extrae el contenido de este documento en texto plano, sin comentarios ni ' +
        `opiniones. Conserva sobre todo: ${foco[categoria]}. ` +
        'No inventes nada que no esté en el documento.'
    )
}

/**
 * Lee el documento con el mismo endpoint que usa la app y guarda el extracto.
 *
 * Se guarda porque es lo que después alimenta el análisis: si no existiera, cada
 * análisis tendría que volver a leer los PDF completos y costaría de más cada
 * vez.
 */
async function extraerDeArchivo(
    docId: string | null,
    categoria: CategoriaDocumento,
    archivo: File
): Promise<string | null> {
    try {
        const form = new FormData()
        form.append('file', archivo)
        form.append('prompt', promptExtracto(categoria))

        // ESTA LECTURA CUESTA Y AHORA SE COBRA (16-ago-2026).
        //
        // Iba sin `user_id`, y el backend sólo descuenta cuando lo recibe: la
        // carpeta leía documentos gratis. No es poca cosa — un PDF escaneado
        // se lee con OCR de Gemini, que es de lo más caro del sistema, y un
        // expediente entra con diez o veinte archivos de golpe.
        //
        // Se cobra al SUBIR y no al analizar porque el extracto se guarda: la
        // lectura ocurre una sola vez por documento y el análisis posterior ya
        // no vuelve a pagarla. Cobrar aquí es cobrar el trabajo real, y por eso
        // el botón de subir anuncia su costo.
        const uid = await userId()
        if (uid) form.append('user_id', uid)

        const res = await fetch(`${API_URL}/analyze-document`, { method: 'POST', body: form })
        if (!res.ok) {
            // El 413 lo manda el backend cuando el documento tiene más hojas de
            // las que lee el plan. No es un fallo: es una respuesta que el
            // abogado tiene que leer, con el nombre del plan que sí lo cubre.
            // Se propaga en vez de tragarse, que es lo que hacía antes.
            if (res.status === 413 || res.status === 402 || res.status === 400) {
                // El 400 también trae un motivo que el abogado DEBE leer: el
                // backend lo usa para «Archivo muy grande (131MB). Máximo
                // 25MB» y para formatos no soportados. Tragárselo fue lo que
                // le pasó al usuario 14 con su expediente de 517 páginas: el
                // rechazo existía, el porqué nunca llegó a la pantalla.
                const cuerpo = await res.json().catch(() => null)
                throw new DemasiadoGrande(
                    cuerpo?.detail ?? 'Este documento excede lo que tu plan puede leer.'
                )
            }
            return null
        }

        // El endpoint responde en SSE: se junta el texto de todos los marcos.
        const crudo = await res.text()
        let texto = ''
        for (const marco of crudo.split('\n\n')) {
            const linea = marco.split('\n').find((l) => l.startsWith('data: '))
            if (!linea) continue
            try {
                const data = JSON.parse(linea.slice(6))
                if (typeof data.token === 'string') texto += data.token
            } catch {
                /* marco incompleto */
            }
        }

        const extracto = texto.trim()
        if (!extracto) return null

        if (docId) {
            await supabase.from('expediente_documentos').update({ extracto }).eq('id', docId)
        }
        return extracto
    } catch (err) {
        console.warn(`[expedientes] no se pudo leer ${archivo.name}:`, err)
        return null
    }
}

/** El extracto guardado, o lo que se pueda sacar bajando el archivo. */
async function asegurarExtracto(doc: DocumentoExpediente): Promise<string | null> {
    if (doc.extracto) return doc.extracto

    const url = await urlFirmada(doc, 600)
    if (!url) return null
    try {
        const blob = await (await fetch(url)).blob()
        const archivo = new File([blob], doc.nombre, {
            type: doc.mime_type ?? 'application/pdf',
        })
        return await extraerDeArchivo(doc.id, doc.categoria, archivo)
    } catch (err) {
        console.warn(`[expedientes] no se pudo descargar ${doc.nombre}:`, err)
        return null
    }
}

export interface ProgresoResumen {
    fase: 'leyendo' | 'sintetizando'
    documento?: string
    actual?: number
    total?: number
}

export interface ResumenCaso {
    resumen: string
    estado: string
    /** Lo que falta para cumplir el objetivo de la carpeta. */
    faltantes: string[]
    /** Advertencias que el abogado podría no haber notado. */
    riesgos: string[]
    /** Qué tan cerca está del objetivo, 0–100. */
    avance: number | null
}

/**
 * Saca la lista que va bajo un encabezado markdown (`## Título`).
 *
 * Se prefiere esto a pedirle JSON al modelo: el motor del chat responde en prosa
 * con marcadores de streaming, y forzar JSON encima de ese protocolo da más
 * fallos que leer las viñetas de un texto que además el usuario ya ve.
 */
function extraerLista(texto: string, titulo: string): string[] {
    const re = new RegExp(`##+\\s*${titulo}[^\\n]*\\n([\\s\\S]*?)(?=\\n##+\\s|$)`, 'i')
    const cuerpo = texto.match(re)?.[1]
    if (!cuerpo) return []

    return cuerpo
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
        .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, '').replace(/\*\*/g, '').trim())
        .filter((l) => l.length > 2)
        .slice(0, 8)
}

/** Lee "Avance: 60%" del texto del modelo. */
function extraerAvance(texto: string): number | null {
    const m = texto.match(/avance[^\d%]{0,20}(\d{1,3})\s*%/i)
    if (!m) return null
    const n = parseInt(m[1], 10)
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null
}

/** Saca el cuerpo de una sección markdown del resumen, para la insignia. */
function extraerSeccion(texto: string, titulo: string): string | null {
    const re = new RegExp(`##+\\s*${titulo}\\s*\\n([\\s\\S]*?)(?=\\n##+\\s|$)`, 'i')
    const cuerpo = texto.match(re)?.[1]?.trim()
    if (!cuerpo) return null
    const primeraFrase = cuerpo.replace(/\s+/g, ' ').split(/(?<=\.)\s/)[0]
    return primeraFrase.length > 180 ? `${primeraFrase.slice(0, 177)}…` : primeraFrase
}

/**
 * Lee los documentos de la carpeta y produce el análisis del caso.
 *
 * Usa el mismo motor del chat que el resto del producto, así que la voz y el
 * criterio jurídico son los mismos que el abogado ya conoce. Y **cobra una
 * consulta**: leer una carpeta entera cuesta más cómputo que una pregunta
 * suelta, así que con mayor razón tiene que contar. Por eso `userId` no es
 * opcional en la práctica — el backend sólo descuenta cuando lo recibe.
 */
/**
 * Cuántos caracteres de cada documento caben en el análisis.
 *
 * POR QUÉ HAY UN PRESUPUESTO (10-ago-2026)
 * ----------------------------------------
 * Esto mandaba el texto ÍNTEGRO de todos los documentos, sin tope. Una carpeta
 * real con 35 documentos sumaba 201,965 caracteres —unos 50,500 tokens— antes
 * de que el backend añadiera su propio contexto del acervo. El análisis moría
 * con `RetryError[… BadRequestError]` y esa cadena se pintaba en pantalla como
 * si fuera el resultado.
 *
 * Y aunque hubiera cabido, tampoco convenía: una abogada reportó que la
 * plataforma no advirtió que un acuerdo venía firmado por un solo integrante
 * del pleno cuando la Ley de Amparo exige el pleno completo. Un defecto así
 * salta a la vista en una hoja y se pierde entre doscientos mil caracteres.
 * Menos texto, mejor elegido, se lee mejor.
 *
 * EL REPARTO. A partes iguales, pero sin desperdiciar: en la primera vuelta
 * cada documento toma lo que necesite hasta su parte; lo que dejan los cortos
 * se reparte entre los largos en las siguientes. Así un anexo de una página no
 * se lleva la misma tajada que la demanda, y ninguno queda fuera del todo.
 */
const PRESUPUESTO_ANALISIS = 120_000   // ~30,000 tokens de documentos
const MINIMO_POR_DOCUMENTO = 1_200     // ni el más humilde entra mudo

function repartirPresupuesto(
    extractos: { doc: DocumentoExpediente; texto: string }[]
): Map<string, number> {
    const racion = new Map<string, number>()
    const total = extractos.reduce((s, e) => s + e.texto.length, 0)
    if (total <= PRESUPUESTO_ANALISIS) {
        extractos.forEach((e) => racion.set(e.doc.id, e.texto.length))
        return racion
    }

    let disponible = PRESUPUESTO_ANALISIS
    let pendientes = [...extractos]
    while (pendientes.length > 0 && disponible > 0) {
        const parte = Math.max(MINIMO_POR_DOCUMENTO, Math.floor(disponible / pendientes.length))
        const caben = pendientes.filter((e) => e.texto.length <= parte)
        if (caben.length === 0) {
            // Todos piden más de su parte: se les da su parte y se acabó.
            pendientes.forEach((e) => {
                racion.set(e.doc.id, Math.min(e.texto.length, parte))
                disponible -= Math.min(e.texto.length, parte)
            })
            break
        }
        caben.forEach((e) => {
            racion.set(e.doc.id, e.texto.length)
            disponible -= e.texto.length
        })
        pendientes = pendientes.filter((e) => !racion.has(e.doc.id))
    }
    // Por si el reparto dejó a alguien sin asignar (presupuesto agotado).
    extractos.forEach((e) => {
        if (!racion.has(e.doc.id)) racion.set(e.doc.id, MINIMO_POR_DOCUMENTO)
    })
    return racion
}

export async function generarResumenCaso(
    expediente: Expediente,
    documentos: DocumentoExpediente[],
    accessToken: string | undefined,
    userIdQuePide: string | undefined,
    onProgreso?: (p: ProgresoResumen) => void
): Promise<ResumenCaso> {
    if (documentos.length === 0) {
        throw new Error('Sube al menos un documento para que Iurexia pueda leer la carpeta.')
    }

    // 1) Extracto de cada documento (se reutiliza el ya guardado).
    const extractos: { doc: DocumentoExpediente; texto: string }[] = []
    for (let i = 0; i < documentos.length; i++) {
        const doc = documentos[i]
        onProgreso?.({
            fase: 'leyendo',
            documento: doc.nombre,
            actual: i + 1,
            total: documentos.length,
        })
        const texto = await asegurarExtracto(doc)
        if (texto) extractos.push({ doc, texto })
    }

    if (extractos.length === 0) {
        throw new Error(
            'No se pudo leer el contenido de los documentos. Revisa que sean legibles.'
        )
    }

    // 2) Síntesis con el motor del chat.
    onProgreso?.({ fase: 'sintetizando' })

    const tipo = tipoCarpeta(expediente.tipo)

    const racion = repartirPresupuesto(extractos)

    const porCategoria = categoriasDe(expediente.tipo)
        .map((cat) => {
            const delGrupo = extractos.filter((e) => e.doc.categoria === cat.value)
            if (delGrupo.length === 0) return null
            const cuerpo = delGrupo
                .map((e) => {
                    const tope = racion.get(e.doc.id) ?? e.texto.length
                    if (e.texto.length <= tope) return `— ${e.doc.nombre}:\n${e.texto}`
                    // Se dice que es un extracto para que el modelo no dé por
                    // inexistente lo que simplemente no le llegó.
                    return (
                        `— ${e.doc.nombre} (EXTRACTO: primeros ${tope.toLocaleString('es-MX')} ` +
                        `de ${e.texto.length.toLocaleString('es-MX')} caracteres):\n` +
                        `${e.texto.slice(0, tope)}\n[…documento truncado…]`
                    )
                })
                .join('\n\n')
            return `## ${cat.label}\n${cuerpo}`
        })
        .filter(Boolean)
        .join('\n\n')

    const ficha = [
        `Tipo de carpeta: ${tipo.label}`,
        `Nombre: ${nombreCarpeta(expediente)}`,
        expediente.objetivo ? `OBJETIVO DECLARADO: ${expediente.objetivo}` : null,
        tipo.pideCliente && expediente.cliente_edad ? `Edad: ${expediente.cliente_edad}` : null,
        tipo.pideCliente && expediente.cliente_sexo ? `Sexo: ${expediente.cliente_sexo}` : null,
        tipo.pideCliente && expediente.cliente_domicilio
            ? `Domicilio: ${expediente.cliente_domicilio}`
            : null,
        expediente.materia ? `Materia: ${expediente.materia}` : null,
        expediente.pretension ? `Pretensión: ${expediente.pretension}` : null,
    ]
        .filter(Boolean)
        .join('\n')

    // El encargo cambia según el tipo: no se revisa igual un juicio que una tesis.
    const encargo: Record<TipoCarpeta, string> = {
        cliente: 'Eres el asistente jurídico del abogado y revisas el expediente de su cliente.',
        asunto: 'Eres el asistente jurídico del abogado y revisas un asunto en trámite.',
        academico:
            'Eres el asistente académico del investigador y revisas su proyecto jurídico ' +
            '(tesis, artículo o ponencia).',
        documento:
            'Eres el asistente del abogado y revisas un documento legal en elaboración ' +
            '(contrato, convenio o escrito).',
    }

    const instruccion =
        `${encargo[tipo.value]} ` +
        (expediente.objetivo
            ? 'Tu tarea principal es medir la distancia entre lo que ya tiene y el OBJETIVO ' +
              'DECLARADO de la carpeta. Todo lo que digas debe servir para acercarlo a ese objetivo.'
            : 'La carpeta no tiene objetivo declarado, así que limítate a describir lo que hay ' +
              'y sugiere cuál debería ser el objetivo.') +
        '\n\nDevuelve exactamente estas secciones, con estos títulos:\n\n' +
        '## Resumen\n' +
        'Dos o tres párrafos: qué contiene la carpeta y en qué punto está respecto del objetivo.\n\n' +
        '## Avance\n' +
        'Una sola línea que empiece con «Avance: N%» donde N es tu estimación honesta de qué ' +
        'tan cerca está del objetivo, seguida de una frase que justifique ese número.\n\n' +
        '## Qué falta\n' +
        'Lista con viñetas de los documentos o elementos concretos que faltan para cumplir el ' +
        'objetivo. Sé específico: no digas «más pruebas», di qué prueba y para qué sirve. Si no ' +
        'falta nada, escribe una sola viñeta que lo diga.\n\n' +
        '## Riesgos\n' +
        'Lista con viñetas de lo que el usuario podría no haber notado: documentos vencidos o ' +
        'muy antiguos, plazos que corren, contradicciones entre documentos, requisitos formales ' +
        'incumplidos. Esta sección es la más valiosa: piensa como el abogado contrario o como el ' +
        'revisor. Si no adviertes ninguno, escribe una viñeta que lo diga.\n\n' +
        '## Siguientes pasos\n' +
        'De 3 a 5 acciones concretas, en orden de urgencia.\n\n' +
        'Reglas estrictas: no inventes hechos, fechas, montos ni números de expediente que no ' +
        'consten en los extractos. Si algo indispensable no consta, dilo como faltante, nunca lo ' +
        'supongas. No repitas el contenido de los documentos: interpreta.\n\n' +
        `# Ficha de la carpeta\n${ficha}\n\n# Documentos\n${porCategoria}`

    let respuesta = ''
    for await (const trozo of streamChat(
        [{ role: 'user', content: instruccion }],
        undefined,
        30,
        accessToken,
        false,
        userIdQuePide,
        undefined,
        undefined,
        expediente.materia ?? undefined
    )) {
        respuesta += trozo
    }

    // Los marcadores del protocolo del chat se quitan igual que en la pantalla
    // de conversación.
    const limpio = limpiarMarcadores(respuesta).trim()
    if (!limpio) throw new Error('El modelo no devolvió un análisis. Inténtalo de nuevo.')

    const faltantes = extraerLista(limpio, 'Qué falta')
    const riesgos = extraerLista(limpio, 'Riesgos')
    const avance = extraerAvance(limpio)
    const estado = extraerSeccion(limpio, 'Resumen') ?? 'Sin determinar'

    await supabase
        .from('expedientes')
        .update({
            resumen_ia: limpio,
            estado_ia: estado,
            faltantes,
            riesgos,
            avance,
            resumen_at: new Date().toISOString(),
        })
        .eq('id', expediente.id)

    return { resumen: limpio, estado, faltantes, riesgos, avance }
}

/** Quita los marcadores de control que el backend intercala entre tokens.
 *
 *  Faltaban `PASO` y `SOURCES`, y se vio probando el generador de escritos
 *  contra producción: el borrador empezaba con
 *  `<!--PASO:jurisdiccion|QUERETARO--><!--SOURCES:75-->` a la vista del
 *  abogado. El chat sí los interpreta —son los pasos con nombre que pinta
 *  mientras piensa—, pero aquí no hay quien los consuma, así que sobran.
 *  Como el análisis de carpeta usa esta misma función, se arregla en los dos.
 */
export function limpiarMarcadores(texto: string): string {
    return texto
        // Los identificadores internos de documento NO son para el abogado.
        // El chat los convierte en marcadores de cita [1], [2]; la carpeta no
        // tiene dónde ponerlos, así que se quitan. Se veía feo de verdad:
        // «…queda sin efecto alguno. [Doc ID: 7fc88536-c19a-25c3-ba36-…]».
        .replace(/\s*\[Doc ID:[^\]]*\]/gi, '')
        .replace(/<!--PING-->/g, '')
        .replace(/<!--PASO:[^>]*-->/g, '')
        .replace(/<!--SOURCES:[^>]*-->/g, '')
        .replace(/<!--CACHE:ACTIVE-->/g, '')
        .replace(/<!--MODE:(?:PRO|PLATINUM)-->/g, '')
        .replace(/<!--thinking-->[\s\S]*?<!--\/thinking-->/g, '')
        .replace(/<!-- ?CITATION_META:[\s\S]*?-->/g, '')
        // La carga de precedentes (puntuaciones, silos y URLs internas de GCS)
        // faltaba aquí, y el chat sí la quitaba. Resultado: el escrito que el
        // abogado iba a presentar EMPEZABA con
        // `… "score": 0.673, "silo": "sentencias_scjn_holdings", "pdf_url":
        // "https://storage.googleapis.com/iurexia-leyes/…" }] -->`.
        .replace(/<!-- ?PRECEDENTES_META:[\s\S]*?-->/g, '')
        .replace(/<!--THINKING_START-->[\s\S]*?<!--THINKING_END-->/g, '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        // Cualquier otro comentario, conocido o no. Un marcador nuevo en el
        // servidor no debería volver a aparecer dentro de un escrito jurídico
        // sólo porque nadie se acordó de añadirlo a esta lista.
        .replace(/<!--[\s\S]*?-->/g, '')
        // Y el caso que de verdad falló: el bloque que llega SIN cerrar, porque
        // el flujo se cortó. Ninguna expresión de las de arriba lo toca —todas
        // exigen el `-->`—, así que se recorta desde la apertura huérfana.
        .replace(/<!--[\s\S]*$/, '')
        .trim()
}
