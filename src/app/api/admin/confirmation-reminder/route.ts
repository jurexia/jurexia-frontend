import { NextRequest, NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/guardia-admin';
import { Resend } from 'resend';

function buildAccountReadyEmail(params: { name: string; email: string }) {
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

                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#1a1a1a 0%,#1f1f1f 100%);padding:32px 40px;border-bottom:1px solid #333;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                                            IUREX<span style="color:#c9a84c;">IA</span>
                                        </span>
                                    </td>
                                    <td align="right">
                                        <span style="background:linear-gradient(135deg,#22c55e,#4ade80);color:#0a0a0a;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">CUENTA ACTIVA</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Cuerpo principal -->
                    <tr>
                        <td style="padding:40px;">
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ¡${firstName}, tu cuenta ya está lista! 🎉
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Hemos activado tu cuenta en Iurexia. Ya puedes iniciar sesión y comenzar a usar 
                                tu asistente jurídico con inteligencia artificial — no necesitas hacer nada más.
                            </p>

                            <!-- Tarjeta de activación -->
                            <div style="background-color:#0d1b0d;border:1px solid #22c55e30;border-left:4px solid #22c55e;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0;font-size:15px;color:#86efac;line-height:1.7;">
                                    <strong style="color:#fff;">✅ Tu cuenta ha sido verificada.</strong><br/>
                                    Solo inicia sesión con tu email y contraseña para comenzar a consultar.
                                </p>
                            </div>

                            <!-- Lo que puedes hacer -->
                            <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#c9a84c;">
                                    ✨ Con tu prueba gratuita puedes:
                                </p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">⚖️</span>&nbsp; Hacer consultas jurídicas con IA especializada en derecho mexicano
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">📜</span>&nbsp; Acceder a leyes federales, estatales, jurisprudencia y tratados internacionales
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">📝</span>&nbsp; Redactar contratos, demandas, amparos y más documentos legales
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">🎁</span>&nbsp; <strong style="color:#fff;">Consultas gratuitas</strong> para explorar la plataforma sin compromiso
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Tip -->
                            <div style="background-color:#1a1520;border:1px solid #2d2040;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#c4b5fd;">
                                    💡 Consejo
                                </p>
                                <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                                    Revisa la <strong style="color:#fff;">Guía de Uso</strong> dentro del chat para obtener 
                                    los mejores resultados en tus consultas jurídicas.
                                </p>
                            </div>

                            <!-- CTA -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/login"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                                            Iniciar sesión →
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
 * Sends a "your account is ready" email after admin manually confirms email.
 * Body: { email, name }
 */
export async function POST(req: NextRequest) {
    const yo = await exigirAdmin(req);
    if (yo instanceof NextResponse) return yo;

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
            subject: `¡${displayName.split(' ')[0]}, tu cuenta en Iurexia ya está activa! 🎉`,
            html: buildAccountReadyEmail({
                name: displayName,
                email,
            }),
        });

        if (error) {
            console.error('❌ Resend account-ready email error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Account-ready email sent to ${email}`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ Account-ready email failed:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
