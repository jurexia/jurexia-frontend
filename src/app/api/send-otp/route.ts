/**
 * Manda el código de seis cifras con el que se ENTRA a Iurexia por correo, desde
 * /registro y desde /login (17-sep-2026).
 *
 * Sirve igual a quien no tiene cuenta —se le crea al escribir el código— que a
 * quien ya la tiene —entra a la suya—. Eso lo decide `/api/verify-otp` DESPUÉS
 * de comprobar el código, así que aquí no se pregunta si el correo está
 * registrado y la respuesta es la misma en los dos casos: esta ruta no le dice
 * a nadie quién tiene cuenta.
 *
 * Antes sí lo preguntaba, para contestar «este email ya está registrado», y lo
 * hacía mal: `auth.admin.listUsers()` devuelve sólo la PRIMERA PÁGINA (50
 * cuentas) y hay más de 2,500. Para casi todos la búsqueda fallaba, se mandaba
 * el código y el registro moría al final con un 409. Y acertando tampoco
 * servía: dejaba en la puerta a quien ya tenía cuenta, cuando el 78% de las
 * cuentas entró con Google o Apple y no tiene contraseña con la que «iniciar
 * sesión».
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * EL FRENO. Un código abre cuentas que ya existen, así que tiene que frenar de
 * verdad. El de antes contaba los códigos de los últimos diez minutos… en una
 * tabla donde cada envío BORRABA los anteriores: nunca había más de uno y nunca
 * frenaba. Ahora los códigos viejos se quedan —sólo vale el más reciente— y se
 * cuentan.
 *
 * Con cinco intentos por código (`/api/verify-otp`), diez códigos al día son 50
 * intentos diarios contra un millón de combinaciones.
 */
const VIGENCIA_MS = 10 * 60 * 1000;
const MAX_CODIGOS_10_MIN = 3;
const MAX_CODIGOS_DIA = 10;

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

/** Aleatorio criptográfico: `Math.random` se puede predecir observando unos
 *  cuantos códigos propios, y este código abre cuentas. */
function generateOTP(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** El nombre lo escribe quien pide el código, y el correo sale a nombre de
 *  Iurexia hacia cualquier dirección: sin escapar, es HTML ajeno en él. */
function escapar(s: string) {
    return s.replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function buildOTPEmail(name: string, code: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f6f3;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4de;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1a1a1a;padding:24px 32px;text-align:center;">
                            <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                                IUREX<span style="color:#c9a84c;">IA</span>
                            </span>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 32px 28px;">
                            <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a1a;">
                                Hola${name ? ` ${escapar(name)}` : ''},
                            </p>
                            <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">
                                Ingresa el siguiente c&oacute;digo para entrar a Iurexia:
                            </p>

                            <!-- OTP Code -->
                            <div style="background-color:#f8f6f3;border:2px solid #c9a84c;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                                <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#1a1a1a;font-family:'Courier New',monospace;">
                                    ${code}
                                </span>
                            </div>

                            <p style="margin:0 0 4px;font-size:13px;color:#999;text-align:center;">
                                Este c&oacute;digo expira en <strong style="color:#666;">10 minutos</strong>
                            </p>
                            <p style="margin:0;font-size:12px;color:#bbb;text-align:center;">
                                No lo compartas con nadie. Si no lo solicitaste, puedes ignorar este mensaje.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#fafaf9;padding:16px 32px;border-top:1px solid #e8e4de;">
                            <p style="margin:0;font-size:11px;color:#999;text-align:center;">
                                &copy; 2026 Iurexia Technologies &middot; Inteligencia Artificial para el Derecho Mexicano
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
    try {
        const { email, name, modo } = await request.json();
        // 'registro' pide nombre porque puede crear la cuenta; 'entrar' (/login) no.
        const entrar = modo === 'entrar';

        const normalizedEmail = String(email ?? '').trim().toLowerCase();
        const nombre = String(name ?? '').trim();

        if (!normalizedEmail || (!entrar && !nombre)) {
            return NextResponse.json(
                { error: entrar ? 'El email es requerido' : 'Email y nombre son requeridos' },
                { status: 400 }
            );
        }
        if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return NextResponse.json({ error: 'Escribe un email válido' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const ahora = Date.now();
        const haceDiezMin = new Date(ahora - VIGENCIA_MS).toISOString();
        const haceUnDia = new Date(ahora - 24 * 60 * 60 * 1000).toISOString();

        // Lo de hace más de un día ya no cuenta para el freno.
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail).lt('created_at', haceUnDia);

        const contar = (desde: string) => supabase
            .from('otp_codes')
            .select('*', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .gte('created_at', desde);
        const [enDiezMin, enElDia] = await Promise.all([contar(haceDiezMin), contar(haceUnDia)]);

        // Sin poder contar no se manda: un freno que falla abierto no es freno.
        if (enDiezMin.error || enElDia.error) {
            console.error('❌ OTP rate limit error:', enDiezMin.error ?? enElDia.error);
            return NextResponse.json({ error: 'Error interno' }, { status: 500 });
        }
        if ((enDiezMin.count ?? 0) >= MAX_CODIGOS_10_MIN) {
            return NextResponse.json(
                { error: 'Demasiados intentos. Espera unos minutos.' },
                { status: 429 }
            );
        }
        if ((enElDia.count ?? 0) >= MAX_CODIGOS_DIA) {
            return NextResponse.json(
                { error: 'Pediste demasiados códigos hoy. Intenta de nuevo mañana.' },
                { status: 429 }
            );
        }

        // Generate OTP
        const code = generateOTP();

        // Store in Supabase (shared across serverless instances). Los códigos
        // anteriores de este correo NO se borran: los cuenta el freno, y
        // /api/verify-otp sólo acepta el más reciente.
        const { error: insertError } = await supabase.from('otp_codes').insert({
            email: normalizedEmail,
            code,
            name: nombre,
            attempts: 0,
            expires_at: new Date(ahora + VIGENCIA_MS).toISOString(),
        });

        if (insertError) {
            console.error('❌ OTP insert error:', insertError);
            return NextResponse.json({ error: 'Error interno' }, { status: 500 });
        }

        // Send via Resend
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('❌ RESEND_API_KEY not configured');
            return NextResponse.json({ error: 'Servicio de email no disponible' }, { status: 500 });
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

        const firstName = nombre.split(' ')[0];
        const capitalizedFirst = firstName
            ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
            : '';

        // Resend no lanza cuando rechaza el envío: devuelve `error`. Sin mirarlo,
        // la página decía «código enviado» por un correo que nunca salió.
        const { error: sendError } = await resend.emails.send({
            from: fromEmail,
            to: normalizedEmail,
            subject: `${code} — Tu código para entrar a Iurexia`,
            html: buildOTPEmail(capitalizedFirst, code),
        });

        if (sendError) {
            console.error('❌ OTP email error:', sendError);
            return NextResponse.json({ error: 'No pudimos enviar el código. Intenta de nuevo.' }, { status: 500 });
        }

        console.log(`📧 OTP sent to ${normalizedEmail}`);

        return NextResponse.json({ success: true, message: 'Código enviado' });
    } catch (err: any) {
        console.error('OTP send error:', err);
        return NextResponse.json({ error: 'Error al enviar el código' }, { status: 500 });
    }
}
