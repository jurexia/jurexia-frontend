import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

function buildConfirmationReminderEmail(params: { name: string; email: string }) {
    const { name } = params;
    const firstName = name.split(' ')[0] || 'Estimado/a usuario';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">

                    <!-- Header con gradiente dorado -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#1a1a1a 0%,#1f1f1f 100%);padding:32px 40px;border-bottom:1px solid #333;">
                            <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                                IUREX<span style="color:#c9a84c;">IA</span>
                            </span>
                        </td>
                    </tr>

                    <!-- Cuerpo principal -->
                    <tr>
                        <td style="padding:40px;">
                            <!-- Saludo -->
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ¡Hola, ${firstName}! 👋
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Notamos que creaste una cuenta en Iurexia pero aún no has confirmado tu correo electrónico. 
                                ¡Solo falta un paso para que comiences a usar tu asistente jurídico con inteligencia artificial!
                            </p>

                            <!-- Tarjeta de info -->
                            <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#c9a84c;">
                                    🔑 ¿Qué necesitas hacer?
                                </p>
                                <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;">
                                    Revisa tu bandeja de entrada (y la carpeta de <strong style="color:#fff;">spam o correo no deseado</strong>) 
                                    para encontrar nuestro correo de confirmación. Si no lo encuentras, puedes solicitar uno nuevo 
                                    ingresando a la plataforma.
                                </p>
                            </div>

                            <!-- Lo que te espera -->
                            <div style="background-color:#0d1b0d;border:1px solid #1a3a1a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#86efac;">
                                    ✨ Lo que te espera al confirmar tu cuenta:
                                </p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">⚖️</span>&nbsp; Consultas jurídicas con inteligencia artificial especializada en derecho mexicano
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">📜</span>&nbsp; Acceso a leyes federales, estatales, jurisprudencia y tratados internacionales
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">📝</span>&nbsp; Redacción de documentos legales: contratos, demandas, amparos y más
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">🎁</span>&nbsp; <strong style="color:#fff;">Consultas gratuitas</strong> para que pruebes la plataforma sin compromiso
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Tip -->
                            <div style="background-color:#1a1520;border:1px solid #2d2040;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#c4b5fd;">
                                    💡 ¿No encuentras el correo de confirmación?
                                </p>
                                <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                                    Ingresa a <strong style="color:#fff;">iurexia.com</strong> e inicia sesión con tu email y contraseña. 
                                    El sistema te dará la opción de reenviar el correo de confirmación automáticamente.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/login"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                                            Confirmar mi cuenta →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;">
                            <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;">
                                ¿Dudas o sugerencias? Escríbenos a 
                                <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a>
                            </p>
                            <p style="margin:0;font-size:11px;color:#444;text-align:center;">
                                © 2026 Iurexia Technologies. Inteligencia Artificial para el Derecho Mexicano.
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

/**
 * POST /api/admin/confirmation-reminder
 * 
 * Sends a friendly reminder email to a user who hasn't confirmed their email.
 * Body: { email, name }
 */
export async function POST(req: NextRequest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { email, name } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Campo requerido: email' },
                { status: 400 }
            );
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

        const displayName = name || email.split('@')[0];

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `${displayName.split(' ')[0]}, ¡solo falta confirmar tu cuenta en Iurexia! ✉️`,
            html: buildConfirmationReminderEmail({
                name: displayName,
                email,
            }),
        });

        if (error) {
            console.error('❌ Resend confirmation reminder error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Confirmation reminder sent to ${email}`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ Confirmation reminder failed:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
