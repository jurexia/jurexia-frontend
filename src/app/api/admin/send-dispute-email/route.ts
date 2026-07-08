import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const ADMIN_KEY = 'jurexia-reingest-2026';

export async function POST(req: NextRequest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY no configurada en el servidor' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key');

        if (key !== ADMIN_KEY) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const to = body.to || 'fgalindoespinosa07@gmail.com';
        const subject = body.subject || 'Actualización sobre tu cuenta de Iurexia ⚖️';
        const from = body.from || 'Iurexia <soporte@iurexia.com>';

        const resend = new Resend(apiKey);

        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actualización sobre tu cuenta de Iurexia</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">
                    
                    <!-- Header con identidad de marca Iurexia -->
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
                                        <span style="border:1px solid #c9a84c40;color:#c9a84c;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;background-color:#c9a84c0a;">SOPORTE PREMIUM</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Cuerpo principal -->
                    <tr>
                        <td style="padding:40px;line-height:1.6;">
                            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;">
                                Hola Fernando,
                            </h1>
                            
                            <p style="margin:0 0 20px;font-size:15px;color:#ccc;">
                                Esperamos que te encuentres muy bien. Te escribimos desde el equipo de atención al cliente de <strong>Iurexia</strong>. 
                            </p>

                            <p style="margin:0 0 20px;font-size:15px;color:#ccc;">
                                Lamentamos saber que has iniciado una disputa bancaria por el cargo correspondiente a tu suscripción del Plan Pro. Queremos aprovechar este espacio para aclarar la situación de la manera más transparente y brindarte una solución directa.
                            </p>

                            <!-- Cuadro informativo sobre la disputa -->
                            <div style="background-color:#1c1313;border:1px solid #ef444430;border-left:4px solid #ef4444;border-radius:12px;padding:20px;margin-bottom:24px;">
                                <p style="margin:0;font-size:14px;color:#fca5a5;line-height:1.6;">
                                    <strong>Sobre la disputa automática:</strong><br/>
                                    Nuestro sistema y el procesador de pagos Stripe detectaron el uso constante y activo de tu cuenta (realizando consultas jurídicas) tanto antes como después del cobro del 20 de junio. Debido a esta evidencia de actividad en la plataforma, la disputa fue declinada de forma automática por el sistema de seguridad bancario.
                                </p>
                            </div>

                            <p style="margin:0 0 20px;font-size:15px;color:#ccc;">
                                En Iurexia nos rige una política de honestidad y nuestro principal objetivo es tu satisfacción. Por ello, te ofrecemos una alternativa mucho más rápida y sin complicaciones:
                            </p>

                            <!-- Propuesta de reembolso y solución -->
                            <div style="background-color:#1c1913;border:1px solid #c9a84c30;border-left:4px solid #c9a84c;border-radius:12px;padding:20px;margin-bottom:24px;">
                                <p style="margin:0;font-size:14px;color:#e8c56d;line-height:1.6;">
                                    <strong>💡 Solución Directa de Reembolso:</strong><br/>
                                    Si es tu deseo, puedes <strong>retirar o levantar la disputa</strong> en tu banca en línea. En cuanto nos confirmes que ha sido retirada, nosotros te realizaremos el <strong>reembolso inmediato y completo del 100% de tu mensualidad</strong> directamente a tu tarjeta, sin cuestionamientos ni demoras.
                                </p>
                            </div>

                            <p style="margin:0 0 20px;font-size:15px;color:#ccc;">
                                Ten en cuenta que, por el momento, tu suscripción al Plan Pro ya no estará activa. No obstante, nos encantaría seguir acompañándote en tu práctica profesional cotidiana. Por ello, tu cuenta ha pasado automáticamente a nuestro <strong>Plan Gratuito</strong> permanente.
                            </p>

                            <!-- Gesto de retención y cortesía -->
                            <p style="margin:0 0 24px;font-size:15px;color:#ccc;">
                                Queremos que sigas comprobando el valor de la plataforma. Como un gesto de cortesía y agradecimiento por tu tiempo, hemos añadido un paquete de <strong>20 consultas Premium de cortesía</strong> a tu plan gratuito para que las utilices cuando las necesites.
                            </p>

                            <div style="background-color:#131a1a;border:1px solid #14b8a630;border-left:4px solid #14b8a6;border-radius:12px;padding:20px;margin-bottom:28px;">
                                <p style="margin:0;font-size:14px;color:#99f6e4;line-height:1.6;">
                                    <strong>🚀 Próximas actualizaciones:</strong><br/>
                                    Durante el próximo mes estaremos desplegando nuevas herramientas, incluyendo mejoras sustanciales en el redactor inteligente de documentos y la cobertura de nuevos circuitos estatales de TCC, incrementando significativamente las capacidades de tu cuenta.
                                </p>
                            </div>

                            <p style="margin:0 0 28px;font-size:15px;color:#ccc;">
                                Recuerda que el equipo de soporte de Iurexia está siempre disponible para ti a través de <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;font-weight:600;">soporte@iurexia.com</a> para resolver cualquier duda o situación de facturación de manera inmediata y amigable, sin intermediarios bancarios.
                            </p>

                            <p style="margin:0;font-size:15px;color:#999;">
                                Atentamente,<br/>
                                <strong>El Equipo de Soporte Premium</strong><br/>
                                Iurexia México
                            </p>
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
</html>
        `;

        const { data, error } = await resend.emails.send({
            from,
            to,
            subject,
            html: htmlContent,
        });

        if (error) {
            console.error('❌ Error al enviar email de disputa:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Email de resolución de disputa enviado con éxito a ${to}`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ Falló la ejecución de send-dispute-email:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
