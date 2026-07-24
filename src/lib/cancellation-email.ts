// ─── Cancellation Email Builder ─────────────────────────────
// Used by the admin cancellation-email route to send personalized
// emails when a subscription is not renewing (cancel_at_period_end).
// Includes 30% discount coupon + mobile app announcement.

interface CancellationEmailParams {
    name: string;
    planLabel?: string;
}

export function buildCancellationEmail({ name, planLabel }: CancellationEmailParams): string {
    const firstName = (name || 'Estimado/a').split(' ')[0];
    const displayPlan = planLabel || 'Pro';

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
                        <td style="background:linear-gradient(135deg,#1a1510 0%,#1f1f1f 100%);padding:32px 40px;border-bottom:1px solid #333;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                                            IUREX<span style="color:#c9a84c;">IA</span>
                                        </span>
                                    </td>
                                    <td align="right">
                                        <span style="background:linear-gradient(135deg,#f87171,#ef4444);color:#fff;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">AVISO IMPORTANTE</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ${firstName}, tu suscripci&oacute;n ha sido cancelada
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Queremos confirmarte que tu plan <strong style="color:#c9a84c;">${displayPlan}</strong> ha sido cancelado exitosamente. <strong style="color:#ddd;">No se realizar&aacute; ning&uacute;n cobro subsecuente</strong> a tu m&eacute;todo de pago. Tu acceso se mantendr&aacute; hasta el final del periodo que ya pagaste.
                            </p>

                            <!-- 30% Discount Coupon -->
                            <div style="background:linear-gradient(135deg,#1a1510 0%,#0f0d08 100%);border:2px solid #c9a84c;border-radius:16px;padding:32px;margin-bottom:28px;text-align:center;">
                                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:3px;">&#127873; Oferta exclusiva para ti</p>
                                <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#ffffff;">
                                    30% de descuento
                                </p>
                                <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#c9a84c;">
                                    para que sigas con nosotros
                                </p>
                                <div style="background-color:#000;border:1px solid #333;border-radius:12px;padding:20px;margin:0 auto;max-width:320px;">
                                    <p style="margin:0 0 8px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;">C&oacute;digo de descuento</p>
                                    <p style="margin:0;font-size:32px;font-weight:900;color:#c9a84c;letter-spacing:4px;font-family:monospace;">VUELVE30</p>
                                </div>
                                <p style="margin:16px 0 0;font-size:13px;color:#ddd;line-height:1.5;">
                                    Usa este c&oacute;digo al momento de reactivar tu suscripci&oacute;n y obt&eacute;n un <strong style="color:#c9a84c;">30% de descuento</strong> en tu pr&oacute;ximo mes. V&aacute;lido por tiempo limitado.
                                </p>
                            </div>

                            <!-- Mobile App Announcement -->
                            <div style="background:linear-gradient(135deg,#0d0d1f 0%,#0a0a1a 100%);border:1px solid #3b82f6;border-radius:16px;padding:28px;margin-bottom:28px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="width:56px;vertical-align:top;padding-right:16px;">
                                            <div style="width:48px;height:48px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:12px;text-align:center;line-height:48px;font-size:24px;">&#128241;</div>
                                        </td>
                                        <td>
                                            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#ffffff;">
                                                &#127775; Pr&oacute;ximamente: App M&oacute;vil Iurexia
                                            </p>
                                            <p style="margin:0 0 12px;font-size:14px;color:#93c5fd;line-height:1.6;">
                                                Lleva el poder de Iurexia en tu celular. Muy pronto podr&aacute;s:
                                            </p>
                                            <table cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="padding:6px 0;">
                                                        <span style="font-size:14px;color:#ddd;line-height:1.6;">
                                                            &#128247; <strong style="color:#fff;">Escanear acuerdos y sentencias</strong> — Con una simple foto desde tu celular, nuestros agentes de IA especializados en derecho mexicano analizar&aacute;n el documento instant&aacute;neamente
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:6px 0;">
                                                        <span style="font-size:14px;color:#ddd;line-height:1.6;">
                                                            &#9997;&#65039; <strong style="color:#fff;">Redacci&oacute;n autom&aacute;tica de escritos</strong> — Genera promociones, recursos y escritos jur&iacute;dicos completos a partir de una foto o escaneo de un acuerdo o sentencia
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:6px 0;">
                                                        <span style="font-size:14px;color:#ddd;line-height:1.6;">
                                                            &#129302; <strong style="color:#fff;">Agentes de IA avanzados</strong> — Podr&aacute;s leer documentos y generar promociones o recursos desde tu celular con uno de los modelos m&aacute;s avanzados de inteligencia artificial
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Why come back -->
                            <div style="background-color:#1a1510;border:1px solid #c9a84c30;border-left:4px solid #c9a84c;border-radius:12px;padding:20px;margin-bottom:28px;">
                                <p style="margin:0;font-size:14px;color:#e8c56d;line-height:1.7;">
                                    <strong>&iquest;Por qu&eacute; regresar?</strong> Iurexia sigue creciendo. Ahora contamos con <strong style="color:#fff;">m&aacute;s de 200,000 precedentes judiciales</strong> de 7 circuitos, 9 Genios Jur&iacute;dicos Especializados con leyes completas en su contexto, y el Redactor de Sentencias con IA m&aacute;s avanzado del mercado. Y con la app m&oacute;vil, los abogados podr&aacute;n llevar todo este poder en su bolsillo.
                                </p>
                            </div>

                            <!-- CTA -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/precios"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#a8883e);color:#0a0a0a;font-size:16px;font-weight:800;padding:16px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                                            Reactivar mi suscripci&oacute;n con 30% OFF &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 0;font-size:12px;color:#666;text-align:center;line-height:1.5;">
                                Ingresa el c&oacute;digo <strong style="color:#c9a84c;">VUELVE30</strong> al momento del pago para aplicar tu descuento.
                            </p>

                            <!-- Founder guarantee -->
                            <div style="background-color:#111;border:1px solid #333;border-radius:12px;padding:16px;margin-top:24px;text-align:center;">
                                <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">
                                    &#128272; <strong style="color:#ccc;">Garant&iacute;a de suscriptor fundador</strong> — Si decides regresar, se te respetar&aacute; el precio con el que contrataste originalmente, sin importar ajustes futuros.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;">
                            <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;">
                                &iquest;Dudas o sugerencias? Escr&iacute;benos a
                                <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a>
                            </p>
                            <p style="margin:0;font-size:11px;color:#444;text-align:center;">
                                &copy; 2026 Iurexia Technologies. Inteligencia Artificial para el Derecho Mexicano.
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
