import { navigatorLock } from '@supabase/supabase-js'

/**
 * EL CANDADO DE LA SESIÓN QUE SE QUEDABA CERRADO (8-oct-2026).
 *
 * Una abogada contrató Pro desde el celular (Android, Chrome), volvió de
 * Stripe a la página de bienvenida y desde ese momento NINGUNA consulta salió
 * del navegador: ni el perfil, ni la lista de conversaciones, ni el documento
 * de una hoja que intentó analizar durante cuarenta minutos. Tuvo que volver a
 * entrar con su contraseña, y aun así nada. En los registros de Supabase, cero
 * peticiones suyas después de entrar; en los de Render, ninguna consulta.
 *
 * La causa está en supabase-js (2.94). Cada operación de sesión toma un
 * candado del navegador (`navigator.locks`, compartido por todas las pestañas
 * de iurexia.com) y lo espera diez segundos. El arranque del cliente también:
 * si otra pestaña lo retiene —en Android las pestañas de fondo se congelan, y
 * una congelada a media renovación del token no lo suelta nunca—, el arranque
 * falla con «AbortError: signal is aborted without reason», y la librería
 * GUARDA ese fallo: `getSession()` y `getUser()` lo repiten al instante para
 * siempre, aunque el candado ya esté libre. Entrar con contraseña sí funciona
 * (no pasa por el arranque) y por eso la pantalla parecía tener sesión.
 * Reproducido el 8-oct con la 2.94 real: la pestaña muerta sigue fallando con
 * cero candados retenidos.
 *
 * Aquí se espera lo mismo que la librería (su `lockAcquireTimeout`, 10 s) y,
 * si al cabo el candado sigue ocupado, se le quita a quien lo tiene (`steal`):
 * una pestaña que no lo suelta en diez segundos no está trabajando, está
 * congelada. Si despierta, a lo sumo renueva el token otra vez, y Supabase
 * admite dos renovaciones seguidas con el mismo token.
 *
 * El tic de renovación pide el candado sin esperar (`acquireTimeout` 0) y está
 * hecho para fallar si está ocupado; ése se deja como está.
 */
export async function candadoDeSesion<R>(
    nombre: string,
    acquireTimeout: number,
    fn: () => Promise<R>,
): Promise<R> {
    if (acquireTimeout <= 0 || typeof navigator === 'undefined' || !navigator.locks) {
        return navigatorLock(nombre, acquireTimeout, fn)
    }
    let empezo = false
    try {
        return await navigatorLock(nombre, acquireTimeout, async () => {
            empezo = true
            return await fn()
        })
    } catch (e) {
        // Si la operación ya corría, el error es suyo, no de la espera.
        if (empezo) throw e
        console.warn(`[sesión] el candado «${nombre}» siguió ocupado ${acquireTimeout} ms `
            + 'por otra pestaña: se toma para que la sesión no quede inservible.')
        return await navigator.locks.request(nombre, { mode: 'exclusive', steal: true }, async () => await fn())
    }
}
