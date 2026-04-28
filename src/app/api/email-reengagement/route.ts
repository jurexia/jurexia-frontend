import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Protected admin-only endpoint for re-engagement campaign
// Target: Free users with < 2 queries used
// Offer: Use your 5 free queries → get 15 bonus queries
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ADMIN_EMAILS = ['yair@iurexia.com', 'jdm.juridico@gmail.com', 'administracion@iurexia.com'];

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

function buildReengagementEmail(firstName: string): string {
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
                                        <span style="background:linear-gradient(135deg,#4ade80,#22c55e);color:#0a0a0a;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">PROMOCI&Oacute;N EXCLUSIVA</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main body -->
                    <tr>
                        <td style="padding:40px;">
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ${firstName}, tienes 5 consultas esperando por ti
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Creaste tu cuenta en Iurexia pero a&uacute;n no has aprovechado todo el poder de tu asistente jur&iacute;dico con inteligencia artificial. Queremos que lo descubras &mdash; y tenemos una oferta especial para ti.
                            </p>

                            <!-- THE OFFER — Hero Box -->
                            <div style="background:linear-gradient(135deg,#0d1f0d 0%,#0a1a0a 100%);border:2px solid #4ade80;border-radius:16px;padding:32px;margin-bottom:28px;text-align:center;">
                                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:3px;">&#127873; Promoci&oacute;n por tiempo limitado</p>
                                <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#ffffff;">
                                    Usa tus 5 consultas gratuitas
                                </p>
                                <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#4ade80;">
                                    y te regalamos 15 m&aacute;s
                                </p>
                                <div style="background-color:#000;border:1px solid #333;border-radius:12px;padding:16px;margin:0 auto;max-width:380px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="text-align:center;padding:8px;">
                                                <span style="font-size:42px;font-weight:900;color:#c9a84c;">5</span>
                                                <p style="margin:4px 0 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Consultas<br>actuales</p>
                                            </td>
                                            <td style="text-align:center;padding:8px;">
                                                <span style="font-size:28px;color:#4ade80;">&#10132;</span>
                                            </td>
                                            <td style="text-align:center;padding:8px;">
                                                <span style="font-size:42px;font-weight:900;color:#4ade80;">20</span>
                                                <p style="margin:4px 0 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Consultas<br>totales</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                <p style="margin:16px 0 0;font-size:13px;color:#ddd;line-height:1.5;">
                                    <strong>As&iacute; de simple:</strong> agota tus 5 consultas gratuitas antes del <strong style="color:#4ade80;">28 de abril</strong> y autom&aacute;ticamente agregaremos <strong style="color:#4ade80;">15 consultas adicionales</strong> a tu cuenta. Sin costo. Sin trucos.
                                </p>
                            </div>

                            <!-- What can you ask? -->
                            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;">
                                &#9997;&#65039; &iquest;Qu&eacute; puedes consultar? Todo esto y m&aacute;s:
                            </p>
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                                <tr>
                                    <td style="padding:10px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px 12px 0 0;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:600;">&#9878;&#65039; &ldquo;&iquest;Cu&aacute;les son los requisitos para demandar pensi&oacute;n alimenticia en mi estado?&rdquo;</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:600;">&#128221; &ldquo;Redacta una demanda de amparo indirecto contra orden de aprehensi&oacute;n&rdquo;</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:600;">&#128269; &ldquo;Busca jurisprudencia sobre prescripci&oacute;n adquisitiva de inmuebles&rdquo;</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;border-radius:0 0 12px 12px;">
                                        <p style="margin:0;font-size:14px;color:#c9a84c;font-weight:600;">&#128196; &ldquo;Analiza este contrato de arrendamiento y detecta cl&aacute;usulas abusivas&rdquo;</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Why this promotion -->
                            <div style="background-color:#1a1510;border:1px solid #c9a84c30;border-left:4px solid #c9a84c;border-radius:12px;padding:20px;margin-bottom:28px;">
                                <p style="margin:0;font-size:14px;color:#e8c56d;line-height:1.7;">
                                    <strong>&iquest;Por qu&eacute; esta promoci&oacute;n?</strong> Sabemos que la mejor forma de conocer Iurexia es us&aacute;ndola. Queremos que experimentes c&oacute;mo nuestra IA analiza leyes federales, legislaci&oacute;n de 11 estados, jurisprudencia de la SCJN y m&aacute;s de <strong style="color:#fff;">112,000 precedentes judiciales</strong> para darte respuestas precisas en segundos.
                                </p>
                            </div>

                            <!-- CTA -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/chat"
                                           style="display:inline-block;background:linear-gradient(135deg,#4ade80,#22c55e);color:#0a0a0a;font-size:16px;font-weight:800;padding:16px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                                            Hacer mi primera consulta &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 0;font-size:12px;color:#f87171;text-align:center;font-weight:600;">
                                &#9888; Promoci&oacute;n v&aacute;lida solo para cuentas gratuitas &middot; Expira el 28 de abril 2026
                            </p>

                            <p style="margin:12px 0 0;font-size:12px;color:#666;text-align:center;line-height:1.5;">
                                100% gratuito &middot; Sin tarjeta de cr&eacute;dito &middot; Sin compromisos
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
        const { searchParams } = new URL(request.url);
        const adminKey = searchParams.get('key');

        if (adminKey !== process.env.ADMIN_CAMPAIGN_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const dryRun = body.dryRun ?? true;
        const limit = body.limit ?? 50;
        const offset = body.offset ?? 0;
        const testEmails: string[] = body.testEmails || [];

        const resend = new Resend(process.env.RESEND_API_KEY!);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

        // ── TEST MODE ──
        if (testEmails.length > 0) {
            const testResults: { email: string; status: 'sent' | 'error'; error?: string }[] = [];
            for (const email of testEmails) {
                const firstName = email.split('@')[0].split('.')[0] || 'Profesional';
                try {
                    await resend.emails.send({
                        from: fromEmail,
                        to: email,
                        subject: `${firstName}, usa tus 5 consultas y te regalamos 15 más ⚖️✨`,
                        html: buildReengagementEmail(firstName),
                    });
                    testResults.push({ email, status: 'sent' });
                } catch (emailErr: any) {
                    testResults.push({ email, status: 'error', error: emailErr.message });
                }
            }
            return NextResponse.json({ message: 'Test emails sent', results: testResults });
        }

        // ── CAMPAIGN MODE: Free users with < 2 queries ──
        const supabase = getSupabaseAdmin();

        // Get total count first  
        const { count: totalCount } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_type', 'gratuito')
            .lt('queries_used', 2)
            .not('email', 'in', `(${ADMIN_EMAILS.join(',')})`);

        const { data: users, error: dbError } = await supabase
            .from('user_profiles')
            .select('email, full_name, queries_used, queries_limit')
            .eq('subscription_type', 'gratuito')
            .lt('queries_used', 2)
            .not('email', 'in', `(${ADMIN_EMAILS.join(',')})`)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return NextResponse.json({ error: 'DB query failed', details: dbError.message }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ message: 'No eligible users found', count: 0, totalEligible: totalCount });
        }

        const results: { email: string; status: 'sent' | 'skipped' | 'error'; error?: string }[] = [];

        for (const user of users) {
            const email = user.email;
            const rawName = (user.full_name || '').trim();
            const firstName = rawName.split(' ')[0] || 'Estimado/a profesional';
            // Capitalize first letter
            const capitalizedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

            if (dryRun) {
                results.push({ email, status: 'skipped' });
                continue;
            }

            try {
                await new Promise(r => setTimeout(r, 150));

                await resend.emails.send({
                    from: fromEmail,
                    to: email,
                    subject: `${capitalizedFirst}, usa tus 5 consultas y te regalamos 15 más ⚖️✨`,
                    html: buildReengagementEmail(capitalizedFirst),
                });

                results.push({ email, status: 'sent' });
                console.log(`📧 Re-engagement email sent to ${email}`);
            } catch (emailErr: any) {
                results.push({ email, status: 'error', error: emailErr.message });
                console.error(`❌ Failed to send to ${email}:`, emailErr.message);
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const errors = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            message: dryRun ? 'DRY RUN — no emails sent' : 'Re-engagement campaign complete',
            totalEligible: totalCount,
            batchSize: users.length,
            offset,
            sent,
            skipped,
            errors,
            results,
        });
    } catch (err: any) {
        console.error('Re-engagement campaign error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
