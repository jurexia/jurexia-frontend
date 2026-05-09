import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
                                Hola ${name},
                            </p>
                            <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">
                                Ingresa el siguiente c&oacute;digo para completar tu registro en Iurexia:
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
                                Si no solicitaste este c&oacute;digo, puedes ignorar este mensaje.
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
        const { email, name } = await request.json();

        if (!email || !name) {
            return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const supabase = getSupabaseAdmin();

        // Rate limiting: check recent OTP requests for this email
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('otp_codes')
            .select('*', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .gte('created_at', tenMinutesAgo);

        if (count && count >= 3) {
            return NextResponse.json(
                { error: 'Demasiados intentos. Espera unos minutos.' },
                { status: 429 }
            );
        }

        // Check if email already registered in auth.users
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const alreadyExists = existingUsers?.users?.find(
            u => u.email?.toLowerCase() === normalizedEmail
        );
        if (alreadyExists) {
            return NextResponse.json(
                { error: 'Este email ya está registrado. Intenta iniciar sesión.' },
                { status: 409 }
            );
        }

        // Generate OTP
        const code = generateOTP();

        // Store in Supabase (shared across serverless instances)
        // Delete any previous codes for this email first
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
        
        const { error: insertError } = await supabase.from('otp_codes').insert({
            email: normalizedEmail,
            code,
            name: name.trim(),
            attempts: 0,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
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

        const firstName = name.trim().split(' ')[0] || 'Profesional';
        const capitalizedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

        await resend.emails.send({
            from: fromEmail,
            to: normalizedEmail,
            subject: `${code} — Tu código de verificación para Iurexia`,
            html: buildOTPEmail(capitalizedFirst, code),
        });

        console.log(`📧 OTP sent to ${normalizedEmail}`);

        return NextResponse.json({ success: true, message: 'Código enviado' });
    } catch (err: any) {
        console.error('OTP send error:', err);
        return NextResponse.json({ error: 'Error al enviar el código' }, { status: 500 });
    }
}
