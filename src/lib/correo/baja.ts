/**
 * Baja de correos con un clic.
 *
 * Gmail exige `List-Unsubscribe` con un solo clic a quien envía en volumen
 * (requisito vigente desde febrero de 2024). Sin ella los correos caen en
 * spam, y como todos salen del mismo dominio, arrastran también a los de
 * confirmación de cuenta y recuperación de contraseña. Por eso la baja no es
 * un adorno legal: protege la entrega de lo transaccional.
 *
 * El testigo va firmado con HMAC para que nadie pueda dar de baja a un tercero
 * cambiando el correo en la URL.
 */

import crypto from 'crypto';

function secreto(): string {
    // Se deriva de una clave que ya vive en el servidor. HMAC no filtra su
    // clave, así que reutilizarla no la expone; y evita una variable de
    // entorno más que configurar en Vercel y que alguien olvide.
    const s = process.env.CORREO_BAJA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('Falta CORREO_BAJA_SECRET o SUPABASE_SERVICE_ROLE_KEY');
    return s;
}

function firmar(email: string): string {
    return crypto
        .createHmac('sha256', secreto())
        .update(email.trim().toLowerCase())
        .digest('base64url')
        .slice(0, 32);
}

/** Testigo opaco que viaja en la URL de baja. */
export function testigoBaja(email: string): string {
    const normal = email.trim().toLowerCase();
    return `${Buffer.from(normal).toString('base64url')}.${firmar(normal)}`;
}

/** Devuelve el correo si la firma cuadra; null si viene manipulado. */
export function verificarTestigo(testigo: string): string | null {
    const [parteCorreo, firma] = String(testigo || '').split('.');
    if (!parteCorreo || !firma) return null;

    let email: string;
    try {
        email = Buffer.from(parteCorreo, 'base64url').toString('utf8');
    } catch {
        return null;
    }

    const esperada = firmar(email);
    // Comparación en tiempo constante: evita distinguir firmas por lo que
    // tardan en fallar.
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    return email;
}

export function urlBaja(email: string): string {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    return `${sitio}/api/correo/baja?t=${testigoBaja(email)}`;
}

/**
 * Cabeceras que hacen que el cliente de correo muestre su propio botón de
 * baja junto al remitente. `List-Unsubscribe-Post` es la parte que la
 * convierte en un solo clic, sin pasar por una página de confirmación.
 */
export function cabecerasBaja(email: string): Record<string, string> {
    return {
        'List-Unsubscribe': `<${urlBaja(email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
}
