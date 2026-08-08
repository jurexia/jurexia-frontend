/**
 * Quién es administrador. UNA lista, para todo.
 *
 * POR QUÉ EXISTE (8-ago-2026)
 * ---------------------------
 * Había dos, y no coincidían:
 *
 *   · `adminGuard.isAdmin()` admitía el dominio @iurexia.com y un correo
 *     suelto de hotmail — pero NO jdm.juridico@gmail.com, que es el de David;
 *   · `correo/enviar.ADMINS` sí lo incluía, junto a otros tres.
 *
 * Dos listas que se contradicen sobre quién manda es un fallo esperando su
 * turno: la puerta que se cierra al dueño, o la que se abre a quien ya no
 * está. Esto las funde.
 *
 * NO IMPORTA `correo/enviar` DESDE UNA RUTA DE API: ese módulo instancia
 * Resend al cargarse, y arrastrarlo a una ruta que sólo quería la lista de
 * correos devolvía un 500 antes siquiera de comprobar el token. Por eso la
 * lista vive aquí, sin dependencias.
 */

/** Todo el que tenga correo de la casa. */
const DOMINIO = '@iurexia.com';

/** Y estos, por nombre. Correos personales de quienes administran. */
const NOMINALES = [
    'jdm.juridico@gmail.com',
    'jenycampos@hotmail.com',
];

export function esAdmin(correo: string | undefined | null): boolean {
    if (!correo) return false;
    const c = correo.toLowerCase().trim();
    return c.endsWith(DOMINIO) || NOMINALES.includes(c);
}

/**
 * La lista explícita, para lo que necesita direcciones concretas y no una
 * comprobación: el envío de campañas se salta a los administradores, y para
 * saltárselos hay que poder enumerarlos.
 */
export const ADMINS = [
    'yair@iurexia.com',
    'jdm.juridico@gmail.com',
    'administracion@iurexia.com',
    'soporte@iurexia.com',
];
