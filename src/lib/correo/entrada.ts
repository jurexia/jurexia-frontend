/**
 * Entrada sin contraseña para las cuentas que nunca iniciaron sesión.
 *
 * ─── POR QUÉ NO VA EL ENLACE MÁGICO EN EL CORREO ────────────────────────
 * Un enlace mágico de Supabase caduca en una hora (`mailer_otp_exp`, 3600 s
 * por omisión). Un correo de campaña se abre horas o días después, así que el
 * enlace llegaría muerto casi siempre y el usuario viviría un segundo fracaso
 * —justo lo contrario de lo que se busca con quien ya se quedó fuera una vez.
 *
 * Peor aún: los antivirus de correo y los prefetchers de Gmail SIGUEN los
 * enlaces al recibirlos. Un enlace mágico de un solo uso quedaría consumido
 * antes de que la persona lo tocara.
 *
 * Por eso el correo lleva un testigo que NO caduca ni autentica por sí mismo:
 * sólo identifica de quién es la dirección. Al abrir /entrar, el usuario pulsa
 * un botón y ahí se genera el enlace mágico, fresco. Para él es un clic; para
 * nosotros, un enlace que siempre funciona.
 *
 * El testigo no es una credencial: quien lo robe sólo consigue que Iurexia
 * mande un correo a la dirección de su dueño, que es donde vive el acceso real.
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
        // Ámbito distinto al de las bajas: así un testigo de baja no sirve
        // para pedir acceso, ni al revés.
        .update(`entrada:${email.trim().toLowerCase()}`)
        .digest('base64url')
        .slice(0, 32);
}

export function testigoEntrada(email: string): string {
    const normal = email.trim().toLowerCase();
    return `${Buffer.from(normal).toString('base64url')}.${firmar(normal)}`;
}

export function verificarEntrada(testigo: string): string | null {
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

export function urlEntrada(email: string): string {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    return `${sitio}/entrar?u=${testigoEntrada(email)}`;
}
