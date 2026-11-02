/**
 * EL RELOJ DEL EQUIPO (2-nov-2026).
 *
 * Ese día un abogado (Windows + Chrome) creyó que su contraseña no servía: sí
 * servía, pero su reloj iba nueve horas adelantado. supabase-js decide si la
 * sesión ya venció comparando la hora de vencimiento que da el servidor
 * (`expires_at`) con el reloj del equipo. Con el reloj adelantado más de lo que
 * dura el token (1 h), toda sesión recién emitida le parece vencida: la
 * renueva, la nueva también le parece vencida, y así. Fueron 154 renovaciones
 * en 12 minutos; Supabase contestó 429 a 21, y un 429 al renovar borra la
 * sesión. Basta un reloj una hora adelantado: equipos con el horario de verano
 * que México ya no usa.
 *
 * Aquí se mide el desfase —con la hora que da `/api/version` y con cada sesión
 * que entrega el servidor de sesión— y se avisa en la consola con `[reloj]`.
 * La pantalla que se lo dice al usuario es `AvisoRelojDesfasado`; la sesión,
 * para que el ciclo no ocurra, se guarda en la hora del equipo
 * (`candado-sesion.ts`).
 */

/** Desde aquí se le dice al usuario que corrija la hora. */
export const UMBRAL_AVISO_MS = 5 * 60_000;
/** Desde aquí el vencimiento de la sesión se guarda en la hora del equipo y no
 *  en la del servidor. Por debajo, el margen de 90 s de supabase-js lo absorbe. */
export const UMBRAL_CORREGIR_MS = 60_000;

export type FuenteDesfase = 'servidor' | 'sesión';

export interface Medicion {
    /** Cuánto va adelantado (+) o atrasado (−) el equipo, en ms. */
    desfase: number;
    fuente: FuenteDesfase;
    /** `Date.now() − performance.now()` al medir: si cambia, movieron el reloj. */
    base: number | null;
}

/** El desfase del equipo contra una hora del servidor. Se compara con la hora
 *  del equipo a la mitad del viaje: lo que tardó la red no cuenta como desfase. */
export function calcularDesfase(inicio: number, fin: number, horaServidor: number): number {
    return (inicio + fin) / 2 - horaServidor;
}

/** Lo mismo con una sesión recién emitida: el servidor la emitió `expires_in`
 *  segundos antes de su `expires_at` (los dos vienen en la respuesta). */
export function desfaseDeEmision(inicio: number, fin: number, expiresAt: number, expiresIn: number): number {
    return calcularDesfase(inicio, fin, (expiresAt - expiresIn) * 1000);
}

export function hayQueAvisar(desfase: number | null | undefined): desfase is number {
    return typeof desfase === 'number' && Number.isFinite(desfase) && Math.abs(desfase) > UMBRAL_AVISO_MS;
}

/** El aviso se pinta si hay que avisar y el usuario no lo cerró ya para ESTE
 *  desfase: si después el reloj se mueve otros cinco minutos, vuelve. */
export function avisoVisible(desfase: number | null | undefined, descartado: number | null | undefined): boolean {
    if (!hayQueAvisar(desfase)) return false;
    return typeof descartado !== 'number' || Math.abs(desfase - descartado) > UMBRAL_AVISO_MS;
}

/** «9 h adelantado», «7 min atrasado», «1 h 5 min adelantado», «3 días adelantado». */
export function describirDesfase(desfase: number): string {
    const sentido = desfase >= 0 ? 'adelantado' : 'atrasado';
    const minutos = Math.round(Math.abs(desfase) / 60_000);
    if (minutos < 60) return `${minutos} min ${sentido}`;
    const horas = Math.floor(minutos / 60);
    if (horas < 48) {
        const resto = minutos % 60;
        return `${horas} h${resto ? ` ${resto} min` : ''} ${sentido}`;
    }
    const dias = Math.round(horas / 24);
    if (dias < 365) return `${dias} días ${sentido}`;
    const anios = Math.floor(dias / 365.25);
    return `${anios === 1 ? 'un año' : `${anios} años`} ${sentido}`;
}

function base(): number | null {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? Date.now() - performance.now()
        : null;
}

let ultima: Medicion | null = null;
/** El desfase que ya se escribió en la consola: no se repite en cada sesión. */
let dicho: number | null = null;
const oyentes = new Set<(m: Medicion) => void>();

/** Guarda una medición, la dice en la consola si el reloj está mal y avisa a la pantalla. */
export function anotarDesfase(desfase: number, fuente: FuenteDesfase): void {
    if (!Number.isFinite(desfase)) return;
    const medicion: Medicion = { desfase, fuente, base: base() };
    ultima = medicion;
    if (hayQueAvisar(desfase)) {
        if (dicho === null || Math.abs(desfase - dicho) > UMBRAL_CORREGIR_MS) {
            dicho = desfase;
            console.warn(`[reloj] El reloj de este equipo va ${describirDesfase(desfase)} `
                + `(medido con ${fuente === 'servidor' ? 'la hora de iurexia.com' : 'la sesión que entregó Supabase'}). `
                + `Hora del equipo: ${new Date(Date.now()).toISOString()}; hora real: ${new Date(Date.now() - desfase).toISOString()}.`);
        }
    } else if (dicho !== null) {
        dicho = null;
        console.info(`[reloj] El reloj de este equipo ya coincide con el del servidor `
            + `(${Math.round(desfase / 1000)} s de diferencia).`);
    }
    oyentes.forEach((fn) => fn(medicion));
}

/** La última medición, salvo que el reloj del equipo se haya movido después. */
export function medicionVigente(): Medicion | null {
    if (!ultima) return null;
    const ahora = base();
    if (ahora !== null && ultima.base !== null && Math.abs(ahora - ultima.base) > UMBRAL_CORREGIR_MS) return null;
    return ultima;
}

export function desfaseConocido(): number | null {
    return medicionVigente()?.desfase ?? null;
}

/** Hubo medición y desde entonces alguien movió el reloj (o el equipo durmió):
 *  hay que volver a medir. */
export function relojMovido(): boolean {
    return ultima !== null && medicionVigente() === null;
}

export function alMedirDesfase(fn: (m: Medicion) => void): () => void {
    oyentes.add(fn);
    return () => { oyentes.delete(fn); };
}

/**
 * Pregunta la hora a iurexia.com (`/api/version` trae `hora`; si faltara, se
 * usa su cabecera `Date`). Devuelve el desfase en ms, o null si no se pudo
 * medir: sin medición no se avisa de nada.
 */
export async function medirDesfase(fetchImpl: typeof fetch = fetch): Promise<number | null> {
    try {
        const inicio = Date.now();
        const r = await fetchImpl(`/api/version?reloj=${inicio}`, { cache: 'no-store' });
        const fin = Date.now();
        if (!r.ok) return null;
        const { hora } = await r.json() as { hora?: unknown };
        const servidor = typeof hora === 'number' ? hora : Date.parse(r.headers.get('date') ?? '');
        if (!Number.isFinite(servidor)) return null;
        const desfase = calcularDesfase(inicio, fin, servidor);
        anotarDesfase(desfase, 'servidor');
        return desfase;
    } catch {
        return null;
    }
}
