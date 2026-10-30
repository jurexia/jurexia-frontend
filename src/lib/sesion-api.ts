'use client';

/**
 * LA SESIÓN VIAJA CON CADA PETICIÓN A LA API (29-oct-2026).
 *
 * La API decidía de quién eran los datos —los asuntos del taller y el .docx
 * de sus proyectos, la cuota, el plan— por el `user_email` o el `user_id` que
 * mandaba la pantalla, y ésos los puede escribir cualquiera. Ahora la API
 * exige `Authorization: Bearer <access_token de Supabase>` y comprueba que sea
 * de esa misma cuenta: sin token contesta 401 y con el de otra, 403 (ver
 * puerta_sesion.py en la API). Todo lo que la pantalla le pide en nombre de
 * alguien sale por aquí.
 *
 * - El token se pide EN CADA PETICIÓN y no se guarda: `getSession()` lo renueva
 *   si ya caducó, y hay pantallas —el taller— que se quedan abiertas horas.
 *   Con tope: si el candado de la sesión no contesta (ver candado-sesion.ts),
 *   se usa el guardado mientras siga vigente, igual que hace el chat.
 * - Si la API contesta 401 con el token que se mandó, se renueva la sesión UNA
 *   vez y se repite. Una sola renovación a la vez en esta pestaña: si diez
 *   llamadas del taller reciben 401 juntas, gastan un solo refresh token.
 * - Funciona igual con la API anterior, que no mira la cabecera: por eso esto
 *   se despliega ANTES que la API.
 */

import { supabase } from './supabase';

const TOPE_SESION_MS = 8_000;
const TOPE_RENOVAR_MS = 10_000;

export interface SesionApi {
    token: string | null;
    correo: string | null;
    id: string | null;
}

const SIN_SESION: SesionApi = { token: null, correo: null, id: null };

function conTope<T>(promesa: PromiseLike<T>, ms: number, siVence: T): Promise<T> {
    return new Promise<T>((resolve) => {
        const reloj = setTimeout(() => resolve(siVence), ms);
        Promise.resolve(promesa).then(
            (v) => { clearTimeout(reloj); resolve(v); },
            () => { clearTimeout(reloj); resolve(siVence); },
        );
    });
}

/** La sesión guardada por supabase-js, leída directo del almacenamiento, sin
 *  el candado. Gemela de `sesionDelAlmacen` (respuestas-servidor.ts), copiada
 *  para no hacer un ciclo de importaciones con lib/api.ts. */
function delAlmacen(): SesionApi {
    try {
        const crudo = typeof localStorage !== 'undefined' ? localStorage.getItem('iurexia-auth') : null;
        if (!crudo) return SIN_SESION;
        const s = JSON.parse(crudo);
        const sesion = s?.currentSession ?? s;
        if (!sesion?.access_token || !sesion?.user?.id) return SIN_SESION;
        if (typeof sesion.expires_at === 'number' && sesion.expires_at * 1000 < Date.now()) return SIN_SESION;
        return { token: sesion.access_token, correo: sesion.user.email ?? null, id: sesion.user.id };
    } catch {
        return SIN_SESION;
    }
}

/** El token vigente de quien está delante, su correo y su id. */
export async function sesionParaApi(): Promise<SesionApi> {
    const r = await conTope(supabase.auth.getSession(), TOPE_SESION_MS, null);
    const s = r?.data?.session;
    if (s?.access_token) {
        return { token: s.access_token, correo: s.user?.email ?? null, id: s.user?.id ?? null };
    }
    return delAlmacen();
}

let renovando: Promise<string | null> | null = null;

/** Un token NUEVO, distinto del que la API rechazó; null si no lo hay (no hay
 *  sesión, o la renovación no contestó). */
export async function tokenRenovado(rechazado: string | null | undefined): Promise<string | null> {
    if (!renovando) {
        renovando = conTope(supabase.auth.refreshSession(), TOPE_RENOVAR_MS, null)
            .then((r) => r?.data?.session?.access_token ?? null)
            // Cinco segundos más vale para las que lleguen detrás con el
            // mismo 401: el taller lanza varias a la vez.
            .finally(() => { setTimeout(() => { renovando = null; }, 5_000); });
    }
    const nuevo = await renovando;
    if (nuevo && nuevo !== rechazado) return nuevo;
    // Quizá otra llamada ya renovó antes que ésta: lo guardado puede ser más
    // nuevo que lo que se mandó.
    const actual = (await sesionParaApi()).token;
    return actual && actual !== rechazado ? actual : null;
}

function conToken(init: RequestInit, token: string | null): RequestInit {
    const h = new Headers(init.headers);
    if (token) h.set('Authorization', `Bearer ${token}`);
    return { ...init, headers: h };
}

/**
 * `fetch` a la API de Iurexia con la sesión. El cuerpo tiene que poder
 * mandarse dos veces (FormData, texto, Blob): si la API contesta 401, se
 * renueva la sesión y se repite UNA vez.
 */
export async function fetchConSesion(url: string, init: RequestInit = {}): Promise<Response> {
    const { token } = await sesionParaApi();
    const res = await fetch(url, conToken(init, token));
    if (res.status !== 401) return res;
    const nuevo = await tokenRenovado(token);
    if (!nuevo) return res;
    return fetch(url, conToken(init, nuevo));
}
