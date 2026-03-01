import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

function buildWelcomeEmail(params: { name: string; estado: string; planLabel: string; isIngested: boolean }) {
    const { name, estado, planLabel, isIngested } = params;
    const firstName = name.split(' ')[0] || name;

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
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                                            IUREX<span style="color:#c9a84c;">IA</span>
                                        </span>
                                    </td>
                                    <td align="right">
                                        <span style="background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">${planLabel}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Cuerpo principal -->
                    <tr>
                        <td style="padding:40px;">
                            <!-- Saludo -->
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ¡Bienvenido/a, ${firstName}! 🎉
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Gracias por confiar en Iurexia y por formar parte de nuestra comunidad de profesionales del Derecho.
                            </p>

                            <!-- Tarjeta de estado -->
                            <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">
                                    📍 Tu Estado: ${estado}
                                </p>
                                ${isIngested ? `
                                <p style="margin:0;font-size:14px;color:#86efac;line-height:1.7;">
                                    ✅ <strong style="color:#fff;">¡Excelentes noticias!</strong> La legislación de <strong style="color:#fff;">${estado}</strong> ya se encuentra completamente integrada en nuestra base de datos. 
                                    Puedes consultar códigos, leyes y reglamentos de tu entidad directamente en el chat.
                                </p>
                                ` : `
                                <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;">
                                    Estamos trabajando activamente para integrar la legislación completa de <strong style="color:#fff;">${estado}</strong> a nuestra base de datos. 
                                    Muy pronto tendrás acceso a los códigos, leyes y reglamentos de tu entidad directamente en tus consultas.
                                </p>
                                `}
                            </div>

                            <!-- Repertorio disponible AHORA -->
                            <div style="background-color:#0d1b0d;border:1px solid #1a3a1a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#86efac;">
                                    ✅ Mientras tanto, ya cuentas con un amplio repertorio legal:
                                </p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">⚖️</span>&nbsp; <strong style="color:#fff;">Constitución Política</strong> de los Estados Unidos Mexicanos (CPEUM)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">📜</span>&nbsp; <strong style="color:#fff;">Leyes Federales</strong> — Código Civil Federal, Código Penal Federal, Ley Federal del Trabajo, Ley de Amparo y más
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">🌐</span>&nbsp; <strong style="color:#fff;">Tratados Internacionales</strong> — Convención Americana sobre Derechos Humanos, Pacto Internacional de Derechos Civiles y Políticos, Convención de Viena, entre otros
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">🏛️</span>&nbsp; <strong style="color:#fff;">Jurisprudencia Nacional</strong> — Tesis y jurisprudencia de la SCJN, Tribunales Colegiados y Plenos de Circuito
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">
                                            <span style="color:#c9a84c;font-weight:bold;">🌎</span>&nbsp; <strong style="color:#fff;">Jurisprudencia Interamericana</strong> — Sentencias y opiniones consultivas de la Corte Interamericana de Derechos Humanos (Corte IDH)
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Tip de guía de uso -->
                            <div style="background-color:#1a1520;border:1px solid #2d2040;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#c4b5fd;">
                                    💡 Consejo para obtener mejores resultados
                                </p>
                                <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                                    Te invitamos a revisar la <strong style="color:#fff;">Guía de Uso</strong> ubicada en la barra del chat. 
                                    Ahí encontrarás tips para formular consultas más precisas y aprovechar al máximo el potencial de Iurexia.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/chat"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                                            Comenzar a consultar →
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
 * POST /api/admin/welcome-email
 * 
 * Sends a welcome email to a subscriber whose state is not yet ingested.
 * Body: { email, name, estado, planLabel? }
 */
export async function POST(req: NextRequest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { email, name, estado, planLabel, isIngested } = body;

        if (!email || !name || !estado) {
            return NextResponse.json(
                { error: 'Campos requeridos: email, name, estado' },
                { status: 400 }
            );
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `¡Bienvenido/a a Iurexia, ${name.split(' ')[0]}! 🎉`,
            html: buildWelcomeEmail({
                name,
                estado,
                planLabel: planLabel || 'PRO',
                isIngested: !!isIngested,
            }),
        });

        if (error) {
            console.error('❌ Resend welcome email error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Welcome email sent to ${email} (${estado})`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ Welcome email failed:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
