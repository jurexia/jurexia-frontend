/**
 * Entrar con un código de seis cifras al correo, desde /registro y desde /login
 * (17-sep-2026). Es la puerta de switchmyai: correo → código → dentro, y la
 * contraseña, si se quiere, después.
 *
 * El código lo manda y lo comprueba Iurexia (`/api/send-otp`, `/api/verify-otp`,
 * con el correo de la casa por Resend), no Supabase. Al comprobarlo, el
 * servidor devuelve la llave de un enlace mágico que no se envía a ningún
 * sitio, y aquí se canjea por la sesión.
 */

import { supabase } from '@/lib/supabase';

/** 'registro' puede crear la cuenta; 'entrar' (/login) sólo entra a una que ya existe. */
export type ModoCodigo = 'registro' | 'entrar';

export type FalloCodigo = {
    ok: false;
    error: string;
    /** Sólo desde /login: el código era bueno, pero ese correo no tiene cuenta. */
    sinCuenta?: boolean;
};

export async function pedirCodigo(datos: {
    email: string;
    name?: string;
    modo: ModoCodigo;
}): Promise<{ ok: true } | FalloCodigo> {
    try {
        const res = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: datos.email.trim().toLowerCase(),
                name: datos.name?.trim(),
                modo: datos.modo,
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error || 'Error al enviar el código' };
        return { ok: true };
    } catch {
        return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    }
}

export async function entrarConCodigo(datos: {
    email: string;
    code: string;
    modo: ModoCodigo;
    /** Código de invitación de /registro?ref=…; sólo cuenta si la cuenta es nueva. */
    ref?: string | null;
}): Promise<{ ok: true; nueva: boolean } | FalloCodigo> {
    let nueva = false;
    try {
        const res = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: datos.email.trim().toLowerCase(),
                code: datos.code,
                modo: datos.modo,
                ref: datos.ref ?? null,
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token_hash) {
            return { ok: false, error: data.error || 'Error al verificar', sinCuenta: !!data.sinCuenta };
        }
        nueva = !!data.nueva;

        const { error } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
        if (error) {
            return {
                ok: false,
                error: nueva
                    ? 'Tu cuenta quedó creada, pero no pudimos abrir tu sesión. Entra con un código desde «Inicia sesión».'
                    : 'No pudimos abrir tu sesión. Pide un código nuevo e intenta de nuevo.',
            };
        }
        return { ok: true, nueva };
    } catch {
        return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    }
}
