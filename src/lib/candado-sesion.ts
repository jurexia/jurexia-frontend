/**
 * EL CANDADO DE LA SESIÓN, POR PESTAÑA (14-oct-2026).
 *
 * Hasta hoy cada operación de sesión de supabase-js (2.94) —leer la sesión
 * para cada consulta a la base, `getUser()`, el arranque, el regreso a la
 * pestaña— tomaba un candado del navegador (`navigator.locks`) COMÚN a todas
 * las pestañas de iurexia.com. Con varias abiertas (Roberto trabaja con
 * carpeta, taller y Bóveda a la vez), la que se abría tenía que esperar turno
 * detrás de las demás. Y una pestaña de fondo que Chrome ha congelado, o que
 * tiene el hilo ocupado, no corre JavaScript: si le toca el candado, lo recibe
 * y no lo suelta. Cada una de ésas costaba diez segundos de espera y luego una
 * toma a la fuerza (707d9d1): el 14-oct, once avisos «siguió ocupado 10000 ms»
 * en una sola carga de /chat y 20–30 s hasta poder escribir.
 *
 * Lo que de verdad hay que hacer de una pestaña a la vez es UNA cosa: gastar el
 * refresh token. Supabase lo rota en cada renovación; usar uno ya gastado fuera
 * de su ventana de reutilización (10 s) se toma como robo y revoca la sesión en
 * todas las pestañas. Todo lo demás —leer el token guardado mientras sigue
 * vigente, preguntar quién es el usuario— puede hacerlo cada pestaña por su
 * cuenta.
 *
 * Así que ahora:
 *
 * - `candadoDeSesion` ordena las operaciones de ESTA pestaña entre sí (la
 *   librería lo necesita: lee y escribe la sesión suponiendo que nadie más de
 *   la pestaña lo hace a la vez) y no espera a ninguna otra.
 *
 * - `fetchDeSesion` es el único punto que coordina pestañas: la petición de
 *   renovación (`/token?grant_type=refresh_token`) pasa por un candado común
 *   y, ya con él, se relee la sesión guardada. Si otra pestaña la renovó
 *   mientras tanto, se devuelve ésa sin ir a la red; si el token guardado es
 *   más nuevo que el que se iba a gastar, se gasta el nuevo. Y como auth-js
 *   guarda la sesión nueva DESPUÉS de que este fetch devuelve, quien renueva
 *   deja además un aviso (`iurexia-auth:renovacion`: qué token gastó y qué
 *   sesión obtuvo) para la pestaña que esperaba justo detrás. Así ningún
 *   token se usa dos veces, aunque una pestaña de fondo reintente un minuto
 *   después con el que leyó antes de dormirse.
 *
 * Quien sostiene ese candado sólo espera la red, y renovar ocurre una vez por
 * hora. Si aun así no lo suelta en cinco segundos (una pestaña congelada a
 * media renovación), se sigue sin él, releyendo lo guardado. Cinco y no más:
 * si la congelada ya gastó el token y no alcanzó a guardar, éste vuelve a
 * llegar al servidor dentro de la ventana de 10 s, y Supabase contesta con la
 * sesión vigente en vez de revocarla.
 */

/** Lo que auth-js reconoce como «candado ocupado» en su tic de renovación. */
class CandadoOcupado extends Error {
    readonly isAcquireTimeout = true
}

const enCurso = new Map<string, Promise<void>>()

/**
 * Candado de supabase-js, sólo para esta pestaña. Mismo contrato que
 * `navigatorLock`: con `acquireTimeout` 0 (el tic de renovación) falla si está
 * ocupado; con más, espera su turno. Si la operación anterior de la pestaña no
 * acaba en ese tiempo (un `fetch` colgado), se sigue sin ella en vez de dejar
 * la sesión inservible: el arranque que falla aquí no se recupera nunca.
 */
export async function candadoDeSesion<R>(
    nombre: string,
    acquireTimeout: number,
    fn: () => Promise<R>,
): Promise<R> {
    const anterior = enCurso.get(nombre)
    if (anterior && acquireTimeout === 0) {
        throw new CandadoOcupado(`El candado «${nombre}» está ocupado en esta pestaña`)
    }
    const operacion = (async () => {
        if (anterior) await esperarTurno(anterior, nombre, acquireTimeout)
        return await fn()
    })()
    const fin = operacion.then(() => undefined, () => undefined)
    enCurso.set(nombre, fin)
    try {
        return await operacion
    } finally {
        if (enCurso.get(nombre) === fin) enCurso.delete(nombre)
    }
}

async function esperarTurno(anterior: Promise<void>, nombre: string, tope: number): Promise<void> {
    if (tope < 0) return anterior
    let reloj: ReturnType<typeof setTimeout> | undefined
    const vencio = await Promise.race([
        anterior.then(() => false),
        new Promise<boolean>((r) => { reloj = setTimeout(() => r(true), tope) }),
    ])
    clearTimeout(reloj)
    if (vencio) {
        console.warn(`[sesión] la operación anterior de esta pestaña sigue con «${nombre}» `
            + `tras ${tope} ms: se sigue sin esperarla.`)
    }
}

const CANDADO_RENOVACION = 'lock:iurexia-auth:renovacion'
const TOPE_RENOVACION_MS = 5_000
/** Como `EXPIRY_MARGIN_MS` de auth-js: con menos de esto, la sesión ya se renueva. */
const MARGEN_MS = 90_000
/** Cuánto vale el aviso de la última renovación para las pestañas que esperaban. */
const VIGENCIA_AVISO_MS = 60_000

interface SesionGuardada {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    expires_in?: number
}

/** La última renovación: qué token se gastó y qué sesión dio a cambio. */
interface AvisoRenovacion {
    de: string
    en: number
    sesion: SesionGuardada
}

function leer<T>(clave: string): T | null {
    try {
        const crudo = localStorage.getItem(clave)
        return crudo ? JSON.parse(crudo) : null
    } catch {
        return null
    }
}

function leerSesion(clave: string): SesionGuardada | null {
    const s = leer<SesionGuardada & { currentSession?: SesionGuardada }>(clave)
    return s?.currentSession ?? s
}

function vigente(s: SesionGuardada | null | undefined): boolean {
    return !!s?.access_token && !!s.refresh_token && typeof s.expires_at === 'number'
        && s.expires_at * 1000 - Date.now() > MARGEN_MS
}

function respuestaCon(s: SesionGuardada): Response {
    return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function esRenovacion(entrada: RequestInfo | URL): boolean {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
    return url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token')
}

/**
 * El `fetch` del cliente de Supabase: deja pasar todo tal cual salvo la
 * renovación del token, que se hace de una pestaña a la vez (ver arriba).
 */
export function fetchDeSesion(claveSesion: string): typeof fetch {
    const claveAviso = `${claveSesion}:renovacion`
    const avisoVigente = (): AvisoRenovacion | null => {
        const aviso = leer<AvisoRenovacion>(claveAviso)
        if (aviso && Date.now() - aviso.en < VIGENCIA_AVISO_MS) return aviso
        if (aviso) try { localStorage.removeItem(claveAviso) } catch { /* sin almacén */ }
        return null
    }
    if (typeof localStorage !== 'undefined') avisoVigente()

    return async (entrada, init) => {
        if (typeof navigator === 'undefined' || !navigator.locks || !esRenovacion(entrada)
            || typeof init?.body !== 'string') {
            return fetch(entrada, init)
        }
        let cuerpo: Record<string, unknown>
        try {
            cuerpo = JSON.parse(init.body)
        } catch {
            return fetch(entrada, init)
        }
        const pedido = cuerpo.refresh_token
        if (typeof pedido !== 'string' || !pedido) return fetch(entrada, init)

        const renovar = async (): Promise<Response> => {
            const guardada = leerSesion(claveSesion)
            let gastar = pedido
            if (guardada?.refresh_token && guardada.refresh_token !== pedido) {
                // Otra pestaña ya renovó y guardó: se usa lo suyo.
                if (vigente(guardada)) return respuestaCon(guardada)
                gastar = guardada.refresh_token
            } else {
                // Otra pestaña acaba de gastar este mismo token y aún no lo
                // guarda (auth-js guarda después de que este fetch devuelve).
                const aviso = avisoVigente()
                if (aviso?.de === pedido && vigente(aviso.sesion)) return respuestaCon(aviso.sesion)
            }
            const body = gastar === pedido ? init.body : JSON.stringify({ ...cuerpo, refresh_token: gastar })
            const respuesta = await fetch(entrada, { ...init, body })
            const texto = await respuesta.text()
            if (respuesta.ok) {
                try {
                    const sesion = JSON.parse(texto) as SesionGuardada
                    if (sesion.access_token && sesion.refresh_token) {
                        if (typeof sesion.expires_at !== 'number' && typeof sesion.expires_in === 'number') {
                            sesion.expires_at = Math.round(Date.now() / 1000) + sesion.expires_in
                        }
                        const aviso: AvisoRenovacion = { de: gastar, en: Date.now(), sesion }
                        localStorage.setItem(claveAviso, JSON.stringify(aviso))
                    }
                } catch {
                    // Sin aviso, la que espera a lo sumo reutiliza el token
                    // dentro de su ventana de 10 s, que Supabase admite.
                }
            }
            return new Response(texto, {
                status: respuesta.status,
                statusText: respuesta.statusText,
                headers: respuesta.headers,
            })
        }

        const control = new AbortController()
        const reloj = setTimeout(() => control.abort(), TOPE_RENOVACION_MS)
        let empezo = false
        try {
            return await navigator.locks.request(CANDADO_RENOVACION, { signal: control.signal }, () => {
                empezo = true
                return renovar()
            })
        } catch (e) {
            // Si la renovación ya corría, el error es suyo (la red), no de la espera.
            if (empezo) throw e
            console.warn(`[sesión] otra pestaña sigue renovando la sesión tras ${TOPE_RENOVACION_MS} ms: `
                + 'se renueva sin esperarla.')
            return await renovar()
        } finally {
            clearTimeout(reloj)
        }
    }
}
