import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

function buildStateUpdateEmail(params: { name: string; estado: string }) {
    const { name, estado } = params;
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

                    <!-- Header -->
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
                            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;">
                                ¡Guanajuato ya está disponible en Iurexia, ${firstName}! ⚖️
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#ccc;line-height:1.6;">
                                Tenemos excelentes noticias para tu práctica legal. La legislación local del estado de <strong>${estado}</strong> ha sido integrada completamente en nuestra base de datos.
                            </p>

                            <!-- Tarjeta de contenido -->
                            <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">
                                    📚 Nuevo contenido disponible:
                                </p>
                                <ul style="margin:0;padding-left:20px;color:#bbb;font-size:14px;line-height:1.8;">
                                    <li>Constitución Política de Guanajuato</li>
                                    <li>Más de 100 Leyes Estatales</li>
                                    <li>Códigos: Penal, Civil, Fiscal, Territorial y más</li>
                                    <li>Reglamentos vigentes</li>
                                </ul>
                            </div>

                            <!-- Tip de uso -->
                            <div style="background-color:#1a1520;border:1px solid #2d2040;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#c4b5fd;">
                                    💡 Consejo para obtener mejores resultados
                                </p>
                                <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                                    Recuerda utilizar el <strong>filtro de Fuero: Local</strong> en el chat. Esto le indica a Iurexia que debe priorizar la normativa de Guanajuato en tus consultas.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="https://www.iurexia.com/chat"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;">
                                            Comenzar consulta local →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;">
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
 * POST /api/admin/state-update
 * Sends an ingestion update notification to a user.
 * Body: { email, name, estado }
 */
export async function POST(req: NextRequest) {
    // Esta ruta estaba desplegada SIN autenticación: cualquiera que conociera
    // la URL podía hacer que iurexia.com enviara correos a la dirección que
    // quisiera, desde noreply@iurexia.com. Además de servir para phishing con
    // nuestro dominio, un abuso habría hundido la reputación de envío y con
    // ella los correos de confirmación de cuenta y recuperación de contraseña.
    const esperada = process.env.ADMIN_CAMPAIGN_KEY;
    if (!esperada) {
        return NextResponse.json({ error: 'ADMIN_CAMPAIGN_KEY no configurada' }, { status: 500 });
    }
    const dada = req.headers.get('x-admin-key') ?? '';
    let dif = dada.length === esperada.length ? 0 : 1;
    for (let i = 0; i < esperada.length; i++) {
        dif |= (dada.charCodeAt(i) || 0) ^ esperada.charCodeAt(i);
    }
    if (dif !== 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { email, name, estado } = body;

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
            subject: `📍 ¡${estado} ya está disponible en Iurexia! ⚖️`,
            html: buildStateUpdateEmail({ name, estado }),
        });

        if (error) {
            console.error('❌ Resend state-update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Ingestion update sent to ${email} (${estado})`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ State update failed:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
