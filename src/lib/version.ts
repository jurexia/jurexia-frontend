/**
 * ¿ESTA PESTAÑA TIENE EL CÓDIGO PUBLICADO? (29-oct-2026)
 *
 * La versión con la que se construyó esta pantalla (el commit de Vercel,
 * fijado al compilar en next.config.js) contra la que sirve hoy el sitio
 * (`/api/version`). Si no se sabe alguna de las dos, se da por vigente: es un
 * aviso, y un aviso falso sería peor que ninguno.
 */
export const VERSION_PANTALLA = process.env.NEXT_PUBLIC_VERSION || '';

export async function pantallaDesactualizada(fetchImpl: typeof fetch = fetch): Promise<boolean> {
    if (!VERSION_PANTALLA) return false;
    try {
        const r = await fetchImpl('/api/version', { cache: 'no-store' });
        if (!r.ok) return false;
        const { version } = await r.json() as { version?: string };
        return Boolean(version) && version !== VERSION_PANTALLA;
    } catch {
        return false;
    }
}

export const AVISO_PANTALLA_VIEJA = '**Su pantalla de Iurexia es de una versión anterior.** Recargue la página '
    + '(o cierre esta pestaña y vuelva a abrir iurexia.com) y adjunte el documento otra vez: la versión '
    + 'actual corrige justo este fallo al enviar desde el teléfono.';
