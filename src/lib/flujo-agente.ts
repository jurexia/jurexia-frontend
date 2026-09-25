import { getSession } from './supabase'
import { esObligatorio, type CampoFlujo, type FlujoTrabajo } from './flujos'

/**
 * El agente de un flujo de trabajo, del lado de la pantalla (25-sep-2026).
 *
 * Un flujo avanza parte por parte, y cada parte pasa por tres fases:
 *
 *   deduciendo  → la API lee encargo, carpeta y lo redactado, y propone datos
 *   preguntando → el abogado confirma (casi todo ya viene marcado)
 *   redactando  → /chat escribe la parte con todo el acervo, y cae en el documento
 *
 * El estado vive en este navegador por consulta. Si se pierde (otro equipo),
 * el flujo se retoma desde el documento: la API vuelve a deducir con lo que ya
 * está redactado, así que no se empieza de cero.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com'

export type Confianza = 'alta' | 'media' | 'baja' | 'ninguna'
export type Valor = string | string[]

export interface CampoDeducido {
    id: string
    propuesta: Valor | null
    opciones: string[]
    confianza: Confianza
    origen: 'encargo' | 'carpeta' | 'confirmado' | 'criterio' | 'ninguno'
    nota: string
}

export interface Deduccion {
    pensamiento: string[]
    campos: CampoDeducido[]
    pedir_documento: { nombre: string; motivo: string } | null
    consulta: string
    aviso?: string
}

export type FaseAgente = 'deduciendo' | 'preguntando' | 'redactando' | 'terminado'

export interface EstadoAgente {
    flujoId: string
    encargo: string
    expedienteId: string | null
    parte: number
    fase: FaseAgente
    /** Todo lo confirmado, de todas las partes. */
    valores: Record<string, Valor>
    deduccion: Deduccion | null
    /** Qué partes ya están en el documento. */
    hechas: number[]
    /** Algo que el abogado debe saber del último intento (sin consultas, error). */
    aviso?: string
    /** Sube cada vez que se pide deducir de nuevo la misma parte. */
    nonce?: number
}

const CLAVE = (convId: string) => `iurexia-agente-${convId}`

export function leerAgente(convId: string): EstadoAgente | null {
    try {
        const crudo = localStorage.getItem(CLAVE(convId))
        if (!crudo) return null
        const e = JSON.parse(crudo) as EstadoAgente
        // A media deducción o a media redacción no se puede volver: al
        // recargar, esa fase se repite desde su inicio.
        if (e.fase === 'redactando') e.fase = 'preguntando'
        if (e.fase === 'preguntando' && !e.deduccion) e.fase = 'deduciendo'
        return e
    } catch {
        return null
    }
}

export function guardarAgente(convId: string, e: EstadoAgente | null) {
    try {
        if (e) localStorage.setItem(CLAVE(convId), JSON.stringify(e))
        else localStorage.removeItem(CLAVE(convId))
    } catch {
        /* ventana privada: el flujo sigue, sólo que no sobrevive a recargar */
    }
}

export function agenteNuevo(flujo: FlujoTrabajo, encargo: string, expedienteId: string | null): EstadoAgente {
    return {
        flujoId: flujo.id,
        encargo,
        expedienteId,
        parte: 0,
        fase: 'deduciendo',
        valores: {},
        deduccion: null,
        hechas: [],
    }
}

/** Un valor cuenta como dado si no está vacío. */
export function tieneValor(v: Valor | null | undefined): boolean {
    if (Array.isArray(v)) return v.some((x) => x.trim())
    return !!v && !!v.trim()
}

/** Los obligatorios de la parte que todavía no tienen valor. */
export function faltantes(campos: CampoFlujo[], valores: Record<string, Valor>): CampoFlujo[] {
    return campos.filter((c) => esObligatorio(c) && !tieneValor(valores[c.id]))
}

/**
 * Lo que se le manda al agente como «ya confirmado». Los documentos pegados
 * pueden ser largos: el agente sólo necesita saber que están y su arranque;
 * el texto completo ya viaja al redactar.
 */
function conocidoParaAgente(valores: Record<string, Valor>): Record<string, Valor> {
    const salida: Record<string, Valor> = {}
    for (const [k, v] of Object.entries(valores)) {
        if (!tieneValor(v)) continue
        salida[k] = typeof v === 'string' && v.length > 1500 ? `${v.slice(0, 1500)}…` : v
    }
    return salida
}

export class AgenteNoDisponible extends Error {}

export async function deducirParte(opciones: {
    flujo: FlujoTrabajo
    estado: EstadoAgente
    carpeta: string | null
    documento: string
    entidad?: string
    signal?: AbortSignal
}): Promise<Deduccion> {
    const { flujo, estado } = opciones
    const parte = flujo.partes[estado.parte]
    const sesion = await getSession()
    const token = sesion?.access_token
    if (!token) throw new AgenteNoDisponible('Inicia sesión para usar los flujos de trabajo.')

    const res = await fetch(`${API_URL}/flujo/deducir`, {
        method: 'POST',
        signal: opciones.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            flujo: flujo.id,
            entrega: flujo.entrega,
            parte: parte.titulo,
            objetivo_parte: parte.redaccion,
            campos: parte.campos.map((c) => ({
                id: c.id,
                etiqueta: c.etiqueta,
                tipo: c.tipo,
                ayuda: c.ayuda ?? null,
                opciones: c.opciones ?? null,
                obligatorio: esObligatorio(c),
            })),
            conocido: conocidoParaAgente(estado.valores),
            encargo: estado.encargo.slice(0, 8000),
            carpeta: opciones.carpeta ? opciones.carpeta.slice(0, 60000) : null,
            documento: opciones.documento ? opciones.documento.slice(-12000) : null,
            estado: opciones.entidad || null,
        }),
    })
    if (res.status === 404) throw new AgenteNoDisponible('El agente de flujos todavía no está disponible en el servidor.')
    if (!res.ok) {
        const cuerpo = await res.json().catch(() => null)
        throw new Error(cuerpo?.detail || `El agente no respondió (${res.status}).`)
    }
    return (await res.json()) as Deduccion
}

/**
 * Los valores con que arranca el formulario: lo ya confirmado manda; si no,
 * la propuesta del agente. Así, lo que el agente dedujo viene marcado y el
 * abogado sólo corrige lo que no.
 */
export function valoresIniciales(
    campos: CampoFlujo[],
    deduccion: Deduccion | null,
    valores: Record<string, Valor>
): Record<string, Valor> {
    const salida: Record<string, Valor> = {}
    for (const c of campos) {
        if (tieneValor(valores[c.id])) {
            salida[c.id] = valores[c.id]
            continue
        }
        const d = deduccion?.campos.find((x) => x.id === c.id)
        if (!d || d.propuesta === null) {
            salida[c.id] = c.tipo === 'varias' ? [] : ''
            continue
        }
        if (c.tipo === 'varias') salida[c.id] = Array.isArray(d.propuesta) ? d.propuesta : [d.propuesta]
        else if (c.tipo === 'fecha') salida[c.id] = /^\d{4}-\d{2}-\d{2}$/.test(String(d.propuesta)) ? String(d.propuesta) : ''
        // Un documento sólo se da por aportado cuando el abogado lo pega o lo
        // sube: el resumen del agente se enseña, no se toma como el documento.
        else if (c.tipo === 'documento') salida[c.id] = ''
        else salida[c.id] = Array.isArray(d.propuesta) ? d.propuesta.join('; ') : d.propuesta
    }
    return salida
}

// ─── El saldo de flujos del mes (Pro 30, Platinum 60) ────────────────────────

/** Espejo de `public.limite_flujos` (Supabase) y de `limite_flujos` (API). */
export function limiteFlujos(plan: string | null | undefined): number {
    const p = (plan ?? '').trim()
    if (p.startsWith('platinum') || p === 'ultra_secretarios') return 60
    if (p.startsWith('pro')) return 30
    return 0
}

export interface SaldoFlujos {
    usados: number
    limite: number
    restantes: number
}

/**
 * Lo que queda este mes, leído del perfil. El contador se reabre solo en el
 * primer flujo de cada mes (en la base), así que un periodo viejo cuenta como
 * mes sin usar.
 */
export function saldoFlujos(perfil: {
    subscription_type?: string | null
    flujos_mes_usados?: number | null
    flujos_periodo?: string | null
} | null | undefined): SaldoFlujos {
    const limite = limiteFlujos(perfil?.subscription_type)
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
    const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`
    const vigente = !!perfil?.flujos_periodo && perfil.flujos_periodo >= inicioMes
    const usados = vigente ? Math.max(0, perfil?.flujos_mes_usados ?? 0) : 0
    return { usados, limite, restantes: Math.max(0, limite - usados) }
}

export class FlujoRechazado extends Error {
    constructor(mensaje: string, public motivo: string) {
        super(mensaje)
    }
}

/** Gasta UN flujo del mes. Se llama una sola vez, al empezar. */
export async function iniciarFlujo(): Promise<{ usados: number; limite: number; restantes: number | null; ilimitado?: boolean }> {
    const sesion = await getSession()
    const token = sesion?.access_token
    if (!token) throw new FlujoRechazado('Inicia sesión para usar los flujos de trabajo.', 'sin_sesion')
    const res = await fetch(`${API_URL}/flujo/iniciar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 404) throw new FlujoRechazado('Los flujos de trabajo todavía no están disponibles en el servidor.', 'sin_servidor')
    const cuerpo = await res.json().catch(() => null)
    if (!res.ok) {
        const d = cuerpo?.detail
        throw new FlujoRechazado(
            (typeof d === 'object' && d?.mensaje) || (typeof d === 'string' ? d : 'No se pudo iniciar el flujo.'),
            (typeof d === 'object' && d?.motivo) || 'error'
        )
    }
    return cuerpo
}
