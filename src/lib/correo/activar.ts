/**
 * Activación de cuenta para quien empezó el registro y no lo terminó
 * (17-sep-2026).
 *
 * QUIÉNES SON. El registro con correo crea la cuenta DESPUÉS de que se escribe
 * el código de seis dígitos (`/api/verify-otp`). Quien pidió el código y no lo
 * escribió —se le pasó el correo, caducaron los diez minutos, cerró la
 * pestaña— no tiene cuenta: sólo queda en `otp_codes`, con su correo y su
 * nombre. No hay contraseña guardada, porque ésa viaja al verificar.
 *
 * QUÉ HACE EL ENLACE. Pulsar un enlace que llegó a esa bandeja prueba lo mismo
 * que el código: que la dirección es suya. Por eso el enlace crea la cuenta ya
 * verificada y deja a la persona dentro, sin segundo correo. A quien ya falló
 * una vez con un código por correo, pedirle otro es repetirle el obstáculo.
 *
 * POR QUÉ ES SEGURO, y dónde está el límite:
 *   · El testigo es un HMAC del correo con ámbito propio (`activar:`): un
 *     testigo de baja o de entrada no sirve aquí, ni al revés.
 *   · La página NO actúa al abrirse: los antivirus y los prefetchers siguen
 *     los enlaces al recibirlos. Se actúa al pulsar el botón (POST).
 *   · Sólo inicia sesión si la cuenta NO existía y se crea en esa misma
 *     petición. Si ya existe, no entra a nadie: lo manda a /entrar, que envía
 *     un enlace de un solo uso a su correo. Así el testigo nunca se convierte
 *     en una llave permanente de una cuenta con contenido.
 */

import crypto from 'crypto';

function secreto(): string {
    const s = process.env.CORREO_BAJA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('Falta CORREO_BAJA_SECRET o SUPABASE_SERVICE_ROLE_KEY');
    return s;
}

function firmar(email: string): string {
    return crypto
        .createHmac('sha256', secreto())
        .update(`activar:${email.trim().toLowerCase()}`)
        .digest('base64url')
        .slice(0, 32);
}

export function testigoActivacion(email: string): string {
    const normal = email.trim().toLowerCase();
    return `${Buffer.from(normal).toString('base64url')}.${firmar(normal)}`;
}

export function verificarActivacion(testigo: string): string | null {
    const [parte, firma] = String(testigo || '').split('.');
    if (!parte || !firma) return null;

    let email: string;
    try {
        email = Buffer.from(parte, 'base64url').toString('utf8');
    } catch {
        return null;
    }

    const a = Buffer.from(firma);
    const b = Buffer.from(firmar(email));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    return email;
}

export function urlActivacion(email: string): string {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    return `${sitio}/activar?u=${testigoActivacion(email)}`;
}
