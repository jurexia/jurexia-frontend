import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Protected admin-only endpoint for sending conversion emails
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for batch sending

const ADMIN_EMAILS = ['yair@iurexia.com', 'jdm.juridico@gmail.com', 'administracion@iurexia.com'];

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

function buildConversionEmail(firstName: string): string {
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

                    <!-- Gold gradient header -->
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
                                        <span style="background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">NOVEDADES</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main body -->
                    <tr>
                        <td style="padding:40px;">
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ${firstName}, tu conocimiento jur&iacute;dico merece las mejores herramientas
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Sabemos que ya conoces el poder de Iurexia &mdash; lo vimos en tus consultas. Hoy queremos invitarte a dar el siguiente paso y experimentar todo lo que la plataforma tiene para ofrecerte.
                            </p>

                            <!-- Flattering message -->
                            <div style="background-color:#1a1510;border:1px solid #c9a84c30;border-left:4px solid #c9a84c;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0;font-size:15px;color:#e8c56d;line-height:1.7;">
                                    <strong>&ldquo;Los profesionales que invierten en tecnolog&iacute;a jur&iacute;dica resuelven casos m&aacute;s r&aacute;pido, argumentan mejor y ganan m&aacute;s.&rdquo;</strong>
                                </p>
                                <p style="margin:8px 0 0;font-size:13px;color:#999;">
                                    &mdash; M&aacute;s de <strong style="color:#fff;">1,500 abogados activos</strong> ya confían en Iurexia para su práctica diaria. No te quedes atr&aacute;s.
                                </p>
                            </div>

                            <!-- New features section -->
                            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;">
                                &#128640; Lo nuevo en Iurexia:
                            </p>

                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                                <tr>
                                    <td style="padding:12px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px 12px 0 0;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:700;">&#9889; Genios Especializados de IA</p>
                                        <p style="margin:4px 0 0;font-size:13px;color:#ccc;line-height:1.5;">Activa hasta 2 Genios (Amparo, Civil, Penal, CIDH y m&aacute;s) para an&aacute;lisis jur&iacute;dico multi-dimensional que tomar&iacute;a horas de investigaci&oacute;n manual.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:700;">&#127963;&#65039; NUEVO: Consulta de Sentencias por Circuito</p>
                                        <p style="margin:4px 0 0;font-size:13px;color:#ccc;line-height:1.5;">Accede a precedentes judiciales de tribunales colegiados de circuito. B&uacute;squeda inteligente en miles de sentencias con filtros por materia y tribunal.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:700;">&#128269; An&aacute;lisis y Auditor&iacute;a de Documentos</p>
                                        <p style="margin:4px 0 0;font-size:13px;color:#ccc;line-height:1.5;">Sube contratos, sentencias o cualquier documento legal para obtener un an&aacute;lisis detallado con sugerencias de mejora impulsadas por IA.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;border-radius:0 0 12px 12px;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:700;">&#128218; Base Legal en Constante Crecimiento</p>
                                        <p style="margin:4px 0 0;font-size:13px;color:#ccc;line-height:1.5;">11 estados integrados + legislaci&oacute;n federal + tratados internacionales + jurisprudencia SCJN. Cada semana agregamos m&aacute;s contenido.</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Plan highlight -->
                            <div style="background:linear-gradient(135deg,#1a1510 0%,#111 100%);border:2px solid #c9a84c50;border-radius:16px;padding:28px;margin-bottom:24px;text-align:center;">
                                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:2px;">Plan m&aacute;s popular</p>
                                <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#ffffff;">Plan Pro</p>
                                <p style="margin:0 0 16px;font-size:14px;color:#999;">Todo lo que necesitas para potenciar tu pr&aacute;ctica</p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#86efac;text-align:left;">&#10003; 140 consultas al mes</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#86efac;text-align:left;">&#10003; Genios Especializados IA (Amparo, Civil, Penal, CIDH)</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#86efac;text-align:left;">&#10003; An&aacute;lisis y auditor&iacute;a de documentos</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#86efac;text-align:left;">&#10003; Registro Connect para clientes potenciales</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:13px;color:#86efac;text-align:left;">&#10003; Soporte prioritario por correo electr&oacute;nico</td>
                                    </tr>
                                </table>
                                <div style="margin-top:20px;">
                                    <span style="font-size:36px;font-weight:800;color:#c9a84c;">$149</span>
                                    <span style="font-size:14px;color:#999;">/mes</span>
                                </div>
                                <p style="margin:4px 0 0;font-size:12px;color:#666;">Equivale a solo <strong style="color:#ccc;">$4.96 al d&iacute;a</strong> &mdash; menos que un caf&eacute;</p>
                            </div>

                            <!-- CTA -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/precios"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:16px;font-weight:800;padding:16px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                                            Activar mi Plan Pro &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 0;font-size:12px;color:#666;text-align:center;line-height:1.5;">
                                Pago 100% seguro con Stripe &middot; Cancela en cualquier momento &middot; Sin compromisos
                            </p>
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

export async function POST(request: NextRequest) {
    try {
        // Auth check - admin only
        const { searchParams } = new URL(request.url);
        const adminKey = searchParams.get('key');
        
        if (adminKey !== process.env.ADMIN_CAMPAIGN_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const dryRun = body.dryRun ?? true; // Default to dry run for safety
        const limit = body.limit ?? 10; // Send in batches
        const testEmails: string[] = body.testEmails || []; // Send preview to specific emails

        const resend = new Resend(process.env.RESEND_API_KEY!);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

        // ── TEST MODE: Send preview to specific emails ──
        if (testEmails.length > 0) {
            const testResults: { email: string; status: 'sent' | 'error'; error?: string }[] = [];
            for (const email of testEmails) {
                const firstName = email.split('@')[0].split('.')[0] || 'Profesional';
                try {
                    await resend.emails.send({
                        from: fromEmail,
                        to: email,
                        subject: `${firstName}, nuevas funciones te esperan en Iurexia ⚖️`,
                        html: buildConversionEmail(firstName),
                    });
                    testResults.push({ email, status: 'sent' });
                    console.log(`📧 TEST email sent to ${email}`);
                } catch (emailErr: any) {
                    testResults.push({ email, status: 'error', error: emailErr.message });
                }
            }
            return NextResponse.json({ message: 'Test emails sent', results: testResults });
        }

        // ── CAMPAIGN MODE: Send to free users who exhausted queries ──
        const supabase = getSupabaseAdmin();

        const { data: users, error: dbError } = await supabase
            .from('user_profiles')
            .select('email, full_name, queries_used, queries_limit')
            .eq('subscription_type', 'gratuito')
            .gte('queries_used', 5) // Hit or exceeded limit
            .not('email', 'in', `(${ADMIN_EMAILS.join(',')})`)
            .order('queries_used', { ascending: false })
            .limit(limit);

        if (dbError) {
            return NextResponse.json({ error: 'DB query failed', details: dbError.message }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ message: 'No eligible users found', count: 0 });
        }

        const results: { email: string; status: 'sent' | 'skipped' | 'error'; error?: string }[] = [];

        for (const user of users) {
            const email = user.email;
            const firstName = (user.full_name || '').split(' ')[0] || 'Estimado/a profesional';

            if (dryRun) {
                results.push({ email, status: 'skipped' });
                continue;
            }

            try {
                // Rate limit: 100ms between emails to respect Resend limits
                await new Promise(r => setTimeout(r, 100));

                await resend.emails.send({
                    from: fromEmail,
                    to: email,
                    subject: `${firstName}, nuevas funciones te esperan en Iurexia ⚖️`,
                    html: buildConversionEmail(firstName),
                });

                results.push({ email, status: 'sent' });
                console.log(`📧 Conversion email sent to ${email}`);
            } catch (emailErr: any) {
                results.push({ email, status: 'error', error: emailErr.message });
                console.error(`❌ Failed to send to ${email}:`, emailErr.message);
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const errors = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            message: dryRun ? 'DRY RUN — no emails sent' : `Campaign complete`,
            total: users.length,
            sent,
            skipped,
            errors,
            results,
        });
    } catch (err: any) {
        console.error('Campaign error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
