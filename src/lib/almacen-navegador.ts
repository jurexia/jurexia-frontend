/**
 * EL ALMACÉN DEL NAVEGADOR, CUANDO SE LLENA (2-nov-2026).
 *
 * Tres abogados de pago —un Platinum con 22 sesiones en una semana, un Pro con
 * 10, otro Platinum con 5— entraban y a la hora los sacaba: ninguna de sus
 * sesiones se había renovado nunca. Su localStorage de iurexia.com estaba
 * lleno, y la cuenta sale sola:
 *
 *   · Cada versión del panel «Documento» guarda el dossier ENTERO de ese
 *     momento (ver `VersionDocumento`), hasta 12 por conversación. Un escrito
 *     que crece 30 mil caracteres por respuesta deja 12 versiones de 30 mil a
 *     360 mil: 2.3 millones de caracteres, unos 4.7 MB en UTF-16, casi los 5 MB
 *     que Chrome da por sitio. Y nunca se borraban.
 *   · supabase-js, al crearse, prueba a ESCRIBIR en localStorage. Si no puede,
 *     guarda la sesión sólo en memoria: cada recarga, cada vuelta de Stripe o
 *     de Google, cierra la sesión, y el «Continuar con Google» no termina
 *     porque su código de verificación tampoco se guarda. Si la prueba pasa
 *     pero la sesión (~4 KB) ya no cabe, la renovación falla al guardarla.
 *   · Y la renovación coordinada entre pestañas (`fetchDeSesion`) leía la
 *     sesión de localStorage —una vieja, de antes de que se llenara— y gastaba
 *     su token en vez del bueno de la memoria. El servidor contestaba
 *     «Refresh Token Not Found» y supabase-js cerraba la sesión.
 *
 * Aquí: hacer sitio antes de que nazca el cliente de Supabase borrando lo único
 * que es copia de comodidad —las versiones del panel «Documento», de la
 * conversación más vieja a la más nueva— (`liberarAlmacen`); saber si ese
 * cliente guarda la sesión en localStorage o en memoria (`almacenEscribible`),
 * y guardar versiones dejando siempre sitio para la sesión (`guardarVersiones`).
 * Los estados de los flujos (`iurexia-agente-*`) y los mensajes por guardar NO
 * se tocan: son trabajo del abogado que no está en ningún otro lado.
 */

const PREFIJO_VERSIONES = 'iurexia-documento-';
/** Conversaciones con versiones guardadas en este navegador, como máximo. */
const MAXIMO_CONVERSACIONES_CON_VERSIONES = 15;
/** Sitio libre que se deja siempre: la sesión ocupa ~4 KB, el código de Google
 *  otro poco y un mensaje por guardar puede traer una respuesta larga; 64 mil
 *  caracteres (~128 KB) dan holgura. */
const HOLGURA_CARACTERES = 64_000;
/** La prueba de supabase-js escribe ~85 caracteres; la nuestra, más, para no
 *  decir nunca «se puede» cuando él decidió que no. */
const PRUEBA_CARACTERES = 256;

function hayLocalStorage(): boolean {
    try {
        // Como supabase-js: `globalThis`, que en el navegador es `window`.
        return typeof globalThis.localStorage === 'object' && globalThis.localStorage !== null;
    } catch {
        return false;
    }
}

/** ¿Cabe una escritura de `caracteres`? Prueba real, como la de supabase-js. */
function cabe(caracteres: number): boolean {
    if (!hayLocalStorage()) return false;
    const clave = `iurexia-prueba-espacio-${Math.random().toString(36).slice(2)}`;
    try {
        localStorage.setItem(clave, 'x'.repeat(caracteres));
        localStorage.removeItem(clave);
        return true;
    } catch {
        try { localStorage.removeItem(clave); } catch { /* nada */ }
        return false;
    }
}

function borrar(clave: string): boolean {
    try { localStorage.removeItem(clave); return true; } catch { return false; }
}

let escribible: boolean | null = null;

/** ¿Guarda supabase-js la sesión en localStorage? Lo mide `liberarAlmacen`
 *  justo antes de que el cliente haga su propia prueba, que también es una
 *  sola por carga de página; aquí sólo se repite esa respuesta. */
export function almacenEscribible(): boolean {
    if (escribible === null) escribible = cabe(PRUEBA_CARACTERES);
    return escribible;
}

function clavesDeVersiones(excepto?: string): string[] {
    const claves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave !== excepto && clave.startsWith(PREFIJO_VERSIONES)) claves.push(clave);
    }
    return claves;
}

interface Copia { clave: string; reciente: number; largo: number }

/** De la conversación más vieja a la más nueva (por su última versión); entre
 *  iguales, la más pesada primero. Sólo se calcula cuando hay que borrar. */
function masViejasPrimero(claves: string[]): Copia[] {
    return claves.map((clave) => {
        const crudo = localStorage.getItem(clave) ?? '';
        let reciente = 0;
        try {
            const v = JSON.parse(crudo);
            if (Array.isArray(v)) reciente = Math.max(0, ...v.map((x: { fecha?: number }) => Number(x?.fecha) || 0));
        } catch { /* ilegible: se borra primero */ }
        return { clave, reciente, largo: clave.length + crudo.length };
    }).sort((a, b) => a.reciente - b.reciente || b.largo - a.largo);
}

/**
 * Si no queda sitio para la sesión con holgura, borra versiones de documento
 * —de la conversación más vieja a la más nueva— hasta que lo haya. Se llama
 * ANTES de crear el cliente de Supabase. Devuelve cuántas conversaciones vació.
 */
export function liberarAlmacen(): number {
    if (!hayLocalStorage()) {
        escribible = false;
        return 0;
    }
    let borradas = 0;
    if (!cabe(HOLGURA_CARACTERES)) {
        let caracteres = 0;
        for (const c of masViejasPrimero(clavesDeVersiones())) {
            if (!borrar(c.clave)) continue;
            borradas++;
            caracteres += c.largo;
            if (cabe(HOLGURA_CARACTERES)) break;
        }
        console.warn(`[almacén] localStorage estaba lleno: se borraron las versiones de documento de ${borradas} conversaciones `
            + `(${Math.round(caracteres / 1000)} mil caracteres). ¿Ya hay sitio para la sesión? ${cabe(HOLGURA_CARACTERES) ? 'sí' : 'NO'}.`);
    }
    escribible = cabe(PRUEBA_CARACTERES);
    return borradas;
}

/**
 * Guarda las versiones de documento de una conversación dejando siempre sitio
 * para la sesión. Si no caben con holgura, se sacrifican primero las versiones
 * de las conversaciones más viejas y después las más viejas de ésta. Sin
 * versiones se borra la clave: una conversación sin documento no gasta un
 * lugar del tope. Nunca lanza; devuelve cuántas versiones quedaron guardadas.
 */
export function guardarVersiones(clave: string, versiones: readonly unknown[]): number {
    if (!hayLocalStorage()) return 0;
    if (!versiones.length) {
        borrar(clave);
        return 0;
    }
    const escribir = (n: number): boolean => {
        try {
            localStorage.setItem(clave, JSON.stringify(versiones.slice(versiones.length - n)));
            return true;
        } catch {
            return false;
        }
    };
    let n = versiones.length;
    let escrito = escribir(n);
    const bien = () => escrito && cabe(HOLGURA_CARACTERES);

    if (!bien()) {
        for (const c of masViejasPrimero(clavesDeVersiones(clave))) {
            if (!borrar(c.clave)) continue;
            if (!escrito) escrito = escribir(n);
            if (bien()) break;
        }
    }
    while (!bien() && n > 1) escrito = escribir(--n);
    if (!bien()) {
        // Ni una sola versión cabe dejando sitio a la sesión.
        borrar(clave);
        return 0;
    }

    // El tope: más allá de las conversaciones más recientes, fuera.
    const otras = clavesDeVersiones(clave);
    const sobran = otras.length - (MAXIMO_CONVERSACIONES_CON_VERSIONES - 1);
    if (sobran > 0) masViejasPrimero(otras).slice(0, sobran).forEach((c) => borrar(c.clave));
    return n;
}
