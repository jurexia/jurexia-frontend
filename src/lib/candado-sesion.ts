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
 *
 * EL RELOJ DEL EQUIPO (2-nov-2026). Con el reloj nueve horas adelantado, toda
 * sesión que daba el servidor le parecía vencida a supabase-js —compara el
 * `expires_at` del servidor con `Date.now()` del equipo— y la renovaba sin
 * parar: 154 renovaciones en 12 minutos, 21 contestadas con 429, y un 429 al
 * renovar borra la sesión (ver `reloj.ts`). Ahora:
 *
 * - Cada sesión que entrega el servidor (entrar, volver de Google, renovar)
 *   pasa por `pedirSesion`, que mide con ella el desfase del reloj y, si pasa
 *   de un minuto, guarda su vencimiento en la hora del equipo: lo que dura el
 *   token contado desde que se pidió. supabase-js ya no ve vencida una sesión
 *   recién dada, y con el reloj atrasado ya no da por vigente una que el
 *   servidor rechaza. Con el reloj bien no se toca nada.
 *
 * - Si el reloj se corrige después, la sesión guardada quedó en la hora vieja:
 *   `ponerSesionEnHora` la compara con la medición nueva y la renueva.
 *
 * - Y un freno, por si el ciclo vuelve por otro camino: con `TOPE_RENOVACIONES`
 *   renovaciones contestadas por el servidor en el último minuto (entre todas
 *   las pestañas), la siguiente no sale. Se devuelve la sesión guardada si
 *   sigue vigente en la hora del servidor; si no, un 503, que supabase-js
 *   reintenta sin borrar la sesión —el 429 de Supabase la borra—.
 */

import { almacenEscribible } from './almacen-navegador'
import { UMBRAL_CORREGIR_MS, anotarDesfase, desfaseConocido, desfaseDeEmision } from './reloj'

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
/** Renovaciones contestadas por el servidor que caben en `VENTANA_FRENO_MS`
 *  entre todas las pestañas. Lo normal es una por hora. */
const TOPE_RENOVACIONES = 4
const VENTANA_FRENO_MS = 60_000

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

function urlDe(entrada: RequestInfo | URL): string {
    return typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
}

function esRenovacion(entrada: RequestInfo | URL): boolean {
    const url = urlDe(entrada)
    return url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token')
}

/** Las peticiones con las que el servidor de sesión entrega una sesión nueva:
 *  contraseña, código, regreso de Google/Apple (pkce), alta y renovación. */
function emiteSesion(entrada: RequestInfo | URL, init?: RequestInit): boolean {
    const metodo = init?.method
        ?? (typeof Request !== 'undefined' && entrada instanceof Request ? entrada.method : 'GET')
    return metodo.toUpperCase() === 'POST' && /\/auth\/v1\/(token|verify|signup)(\?|$)/.test(urlDe(entrada))
}

/** El `exp` del token de acceso: su vencimiento en la hora del SERVIDOR. */
function vencimientoDelToken(token: string | undefined): number | null {
    try {
        const carga = token?.split('.')[1]
        if (!carga) return null
        const { exp } = JSON.parse(atob(carga.replace(/-/g, '+').replace(/_/g, '/')))
        return typeof exp === 'number' ? exp : null
    } catch {
        return null
    }
}

/**
 * Mide el reloj con una sesión recién emitida y, si va desfasado, pone su
 * vencimiento en la hora del equipo: lo que dura el token, contado desde que
 * se pidió (antes de la respuesta: así nunca vence después que en el servidor).
 */
function enHoraDelEquipo(s: SesionGuardada, inicio: number, fin: number): SesionGuardada {
    if (typeof s.expires_at !== 'number' || typeof s.expires_in !== 'number') return s
    const desfase = desfaseDeEmision(inicio, fin, s.expires_at, s.expires_in)
    anotarDesfase(desfase, 'sesión')
    if (Math.abs(desfase) < UMBRAL_CORREGIR_MS) return s
    return { ...s, expires_at: Math.floor(inicio / 1000) + s.expires_in }
}

/** Pide la sesión al servidor y se la devuelve a supabase-js en la hora del equipo. */
async function pedirSesion(
    entrada: RequestInfo | URL,
    init: RequestInit | undefined,
): Promise<{ respuesta: Response; sesion: SesionGuardada | null }> {
    const inicio = Date.now()
    const respuesta = await fetch(entrada, init)
    const fin = Date.now()
    // Sin cuerpo no hay sesión, y `new Response` no admite cuerpo con éstos.
    if ([101, 204, 205, 304].includes(respuesta.status)) return { respuesta, sesion: null }
    const texto = await respuesta.text()
    let cuerpo = texto
    let sesion: SesionGuardada | null = null
    if (respuesta.ok) {
        try {
            const datos = JSON.parse(texto) as SesionGuardada
            if (datos.access_token && datos.refresh_token) {
                sesion = enHoraDelEquipo(datos, inicio, fin)
                if (sesion !== datos) cuerpo = JSON.stringify(sesion)
            }
        } catch {
            // No era una sesión: se devuelve tal cual.
        }
    }
    const headers = new Headers(respuesta.headers)
    if (cuerpo !== texto) headers.delete('content-length')
    return {
        respuesta: new Response(cuerpo, { status: respuesta.status, statusText: respuesta.statusText, headers }),
        sesion,
    }
}

let renovacionesEnMemoria: number[] = []
let frenoDicho = 0

/** Las renovaciones que el servidor contestó en el último minuto, de todas las
 *  pestañas. Si el reloj se movió hacia atrás, las «futuras» no cuentan. */
function renovacionesRecientes(clave: string): number[] {
    const ahora = Date.now()
    const guardadas = leer<unknown>(clave)
    const lista = Array.isArray(guardadas) ? guardadas : renovacionesEnMemoria
    return lista.filter((t): t is number => typeof t === 'number' && ahora - t >= 0 && ahora - t < VENTANA_FRENO_MS)
}

function anotarRenovacion(clave: string): void {
    const lista = [...renovacionesRecientes(clave), Date.now()]
    renovacionesEnMemoria = lista
    try { localStorage.setItem(clave, JSON.stringify(lista)) } catch { /* sin almacén: queda en memoria */ }
}

/**
 * La renovación que no sale. Si la sesión guardada aún vale en la hora del
 * servidor, se devuelve ésa, puesta en la hora del equipo para que supabase-js
 * deje de pedir. Si no, un 503: supabase-js lo reintenta y NO borra la sesión.
 */
function frenar(guardada: SesionGuardada | null, cuantas: number): Response {
    const ahora = Date.now()
    const desfase = desfaseConocido()
    if (ahora - frenoDicho > VENTANA_FRENO_MS) {
        frenoDicho = ahora
        console.warn(`[sesión] ${cuantas} renovaciones del token en el último minuto: se frenan las `
            + 'siguientes para no llegar al límite de Supabase (su 429 cierra la sesión).'
            + (desfase !== null && Math.abs(desfase) >= UMBRAL_CORREGIR_MS
                ? ` [reloj] El reloj del equipo va ${Math.round(desfase / 60_000)} min desfasado.` : ''))
    }
    const exp = vencimientoDelToken(guardada?.access_token)
    const quedan = exp === null ? 0 : exp * 1000 - (ahora - (desfase ?? 0))
    if (guardada?.refresh_token && quedan > MARGEN_MS) {
        return respuestaCon({ ...guardada, expires_at: Math.floor((ahora + quedan) / 1000) })
    }
    return new Response(
        JSON.stringify({ code: 503, error_code: 'renovacion_frenada', msg: 'Demasiadas renovaciones seguidas' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
}

/**
 * ¿La sesión guardada se calculó con otra hora del equipo? Su `expires_at`
 * menos el `exp` de su token es el desfase con que se guardó (cero si se guardó
 * en la hora del servidor). Si difiere del medido ahora en más que el margen
 * con que supabase-js renueva (90 s), la renovaría cuando el servidor ya la
 * rechaza. Por debajo no vale la pena: con un desfase justo en el umbral de un
 * minuto, el ruido de cada medición la haría renovar en cada carga de página.
 */
export function sesionEnOtraHora(claveSesion: string, desfase: number): boolean {
    const s = leerSesion(claveSesion)
    const exp = vencimientoDelToken(s?.access_token)
    if (!s || typeof s.expires_at !== 'number' || exp === null) return false
    return Math.abs(desfase - (s.expires_at - exp) * 1000) > MARGEN_MS
}

/** Lo que se usa del cliente de sesión de supabase-js. */
interface ClienteDeSesion {
    getSession(): Promise<unknown>
    refreshSession(): Promise<unknown>
}

/**
 * Tras medir el reloj (al abrir la página, o porque el usuario lo corrigió):
 * si la sesión guardada quedó en otra hora, se renueva y la nueva se guarda en
 * la hora de ahora. Primero se pide la sesión: si ya parecía vencida,
 * supabase-js la renueva ahí mismo y no hace falta una segunda renovación.
 */
export async function ponerSesionEnHora(auth: ClienteDeSesion, claveSesion: string, desfase: number): Promise<boolean> {
    await auth.getSession()
    if (!sesionEnOtraHora(claveSesion, desfase)) return false
    console.warn('[reloj] La sesión guardada se calculó con otra hora del equipo: se renueva.')
    await auth.refreshSession()
    return true
}

/**
 * El `fetch` del cliente de Supabase: deja pasar todo tal cual salvo la
 * renovación del token, que se hace de una pestaña a la vez (ver arriba).
 */
export function fetchDeSesion(claveSesion: string): typeof fetch {
    const claveAviso = `${claveSesion}:renovacion`
    const claveRenovaciones = `${claveSesion}:renovaciones`
    const avisoVigente = (): AvisoRenovacion | null => {
        const aviso = leer<AvisoRenovacion>(claveAviso)
        if (aviso && Date.now() - aviso.en < VIGENCIA_AVISO_MS) return aviso
        if (aviso) try { localStorage.removeItem(claveAviso) } catch { /* sin almacén */ }
        return null
    }
    if (typeof localStorage !== 'undefined') avisoVigente()

    return async (entrada, init) => {
        if (!emiteSesion(entrada, init)) return fetch(entrada, init)
        // Entrar, volver de Google, el alta, y la renovación en navegadores
        // sin `navigator.locks`: sin coordinar pestañas, pero en la hora del equipo.
        const sinCoordinar = async () => (await pedirSesion(entrada, init)).respuesta
        if (typeof navigator === 'undefined' || !navigator.locks || !esRenovacion(entrada)
            || typeof init?.body !== 'string') {
            return sinCoordinar()
        }
        let cuerpo: Record<string, unknown>
        try {
            cuerpo = JSON.parse(init.body)
        } catch {
            return sinCoordinar()
        }
        const pedido = cuerpo.refresh_token
        if (typeof pedido !== 'string' || !pedido) return sinCoordinar()

        const renovar = async (): Promise<Response> => {
            // Con el almacén lleno, supabase-js guarda la sesión en memoria y
            // lo que queda en localStorage es una sesión VIEJA: gastar su token
            // en vez del pedido daba «Refresh Token Not Found» y cerraba la
            // sesión cada hora (2-nov-2026, ver almacen-navegador.ts). Sin
            // almacén escribible no hay pestañas que coordinar por él.
            const guardada = almacenEscribible() ? leerSesion(claveSesion) : null
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
            // El freno (2-nov-2026): cuentan las que el servidor contestó.
            const recientes = renovacionesRecientes(claveRenovaciones)
            if (recientes.length >= TOPE_RENOVACIONES) return frenar(guardada, recientes.length)
            const body = gastar === pedido ? init.body : JSON.stringify({ ...cuerpo, refresh_token: gastar })
            const { respuesta, sesion } = await pedirSesion(entrada, { ...init, body })
            anotarRenovacion(claveRenovaciones)
            if (sesion) {
                try {
                    if (typeof sesion.expires_at !== 'number' && typeof sesion.expires_in === 'number') {
                        sesion.expires_at = Math.round(Date.now() / 1000) + sesion.expires_in
                    }
                    const aviso: AvisoRenovacion = { de: gastar, en: Date.now(), sesion }
                    localStorage.setItem(claveAviso, JSON.stringify(aviso))
                } catch {
                    // Sin aviso, la que espera a lo sumo reutiliza el token
                    // dentro de su ventana de 10 s, que Supabase admite.
                }
            }
            return respuesta
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
