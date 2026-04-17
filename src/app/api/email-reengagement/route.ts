import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

function buildReengagementEmail(firstName: string, queriesUsed: number, queriesRemaining: number): string {
    const urgencyLine = queriesRemaining === 1
        ? `Te queda <strong style="color:#4ade80;font-size:18px;">1 consulta gratuita</strong> esperándote.`
        : `Te quedan <strong style="color:#4ade80;font-size:18px;">${queriesRemaining} consultas gratuitas</strong> esperándote.`;

    const personalLine = queriesUsed >= 3
        ? `Ya hiciste ${queriesUsed} consultas &mdash; claramente encontraste valor en Iurexia. &iquest;Por qu&eacute; parar ahora?`
        : `Diste el primer paso con ${queriesUsed} consulta${queriesUsed > 1 ? 's' : ''}. Todav&iacute;a tienes consultas gratuitas por aprovechar.`;

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
                                        <span style="background:#4ade80;color:#000;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">TE EXTRAÑAMOS</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main body -->
                    <tr>
                        <td style="padding:40px;">

                            <!-- Urgency counter -->
                            <div style="background:linear-gradient(135deg,#0d1f0d 0%,#111 100%);border:2px solid #4ade8050;border-radius:16px;padding:28px;margin-bottom:28px;text-align:center;">
                                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:2px;">NO LAS PIERDAS</p>
                                <p style="margin:0 0 4px;font-size:18px;color:#fff;line-height:1.6;">
                                    ${urgencyLine}
                                </p>
                                <p style="margin:0;font-size:13px;color:#999;">
                                    Tus consultas gratuitas se reinician cada mes. &iexcl;Aprovecha las que te quedan!
                                </p>
                            </div>

                            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">
                                ${firstName}, vuelve a Iurexia
                            </h1>
                            <p style="margin:0 0 24px;font-size:15px;color:#999;line-height:1.6;">
                                ${personalLine}
                            </p>

                            <!-- Quick wins section -->
                            <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#ffffff;">
                                &#128161; Prueba estas consultas con tu cuenta gratuita:
                            </p>

                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                                <tr>
                                    <td style="padding:14px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px 12px 0 0;">
                                        <p style="margin:0;font-size:13px;color:#c9a84c;font-weight:600;">&#9997;&#65039; Ejemplo 1:</p>
                                        <p style="margin:4px 0 0;font-size:14px;color:#eee;font-style:italic;">&ldquo;&iquest;Cu&aacute;les son los requisitos para un juicio de amparo indirecto?&rdquo;</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;">
                                        <p style="margin:0;font-size:13px;color:#c9a84c;font-weight:600;">&#9997;&#65039; Ejemplo 2:</p>
                                        <p style="margin:4px 0 0;font-size:14px;color:#eee;font-style:italic;">&ldquo;Analiza las causales de rescisi&oacute;n laboral del art&iacute;culo 47 de la LFT&rdquo;</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-top:none;border-radius:0 0 12px 12px;">
                                        <p style="margin:0;font-size:13px;color:#c9a84c;font-weight:600;">&#9997;&#65039; Ejemplo 3:</p>
                                        <p style="margin:4px 0 0;font-size:14px;color:#eee;font-style:italic;">&ldquo;&iquest;C&oacute;mo se calcula la pensi&oacute;n alimenticia en mi estado?&rdquo;</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:0 0 16px;">
                                        <a href="https://www.iurexia.com/chat"
                                           style="display:inline-block;background:linear-gradient(135deg,#4ade80,#22c55e);color:#000;font-size:16px;font-weight:800;padding:16px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                                            Usar mis consultas gratis &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Soft upsell -->
                            <div style="background-color:#1a1510;border:1px solid #c9a84c30;border-radius:12px;padding:20px;margin-top:8px;">
                                <p style="margin:0 0 8px;font-size:14px;color:#c9a84c;font-weight:700;">
                                    &#128081; &iquest;Necesitas m&aacute;s que 5 consultas?
                                </p>
                                <p style="margin:0 0 12px;font-size:13px;color:#ccc;line-height:1.5;">
                                    El Plan Pro incluye <strong>140 consultas/mes</strong>, Genios Especializados de IA (Amparo, Civil, Penal) y An&aacute;lisis de Documentos. <strong style="color:#4ade80;">Desde $149 MXN/mes</strong> &mdash; menos que un caf&eacute; diario.
                                </p>
                                <a href="https://www.iurexia.com/precios"
                                   style="display:inline-block;background:transparent;color:#c9a84c;font-size:13px;font-weight:600;padding:8px 20px;border-radius:8px;text-decoration:none;border:1px solid #c9a84c50;">
                                    Ver planes &rarr;
                                </a>
                            </div>

                            <p style="margin:24px 0 0;font-size:12px;color:#666;text-align:center;line-height:1.5;">
                                Sin compromisos &middot; Sin tarjeta de cr&eacute;dito requerida &middot; Tus datos son 100% confidenciales
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;">
                            <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;">
                                &iquest;Dudas? Escr&iacute;benos a
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
        // Auth check
        const { searchParams } = new URL(request.url);
        const adminKey = searchParams.get('key');

        if (adminKey !== process.env.ADMIN_CAMPAIGN_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const dryRun = body.dryRun ?? true;
        const limit = body.limit ?? 20;
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
                        subject: `${firstName}, aún te quedan consultas gratuitas en Iurexia ⚖️`,
                        html: buildReengagementEmail(firstName, 3, 2),
                    });
                    testResults.push({ email, status: 'sent' });
                } catch (emailErr: any) {
                    testResults.push({ email, status: 'error', error: emailErr.message });
                }
            }
            return NextResponse.json({ message: 'Test emails sent', results: testResults });
        }

        // ── RE-ENGAGEMENT CAMPAIGN: Free users who used 1-4 queries ──
        const supabase = getSupabaseAdmin();

        const { data: users, error: dbError } = await supabase
            .from('user_profiles')
            .select('email, full_name, queries_used, queries_limit')
            .eq('subscription_type', 'gratuito')
            .eq('queries_limit', 5) // Standard free plan only
            .gte('queries_used', 1)
            .lt('queries_used', 5) // Haven't exhausted their queries
            .not('email', 'in', `(${ADMIN_EMAILS.join(',')})`)
            .order('queries_used', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return NextResponse.json({ error: 'DB query failed', details: dbError.message }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ message: 'No eligible users found', count: 0 });
        }

        const results: { email: string; name: string; queries_used: number; remaining: number; status: 'sent' | 'skipped' | 'error'; error?: string }[] = [];

        for (const user of users) {
            const email = user.email;
            const firstName = (user.full_name || '').split(' ')[0] || 'Estimado/a profesional';
            const queriesRemaining = user.queries_limit - user.queries_used;

            if (dryRun) {
                results.push({ email, name: firstName, queries_used: user.queries_used, remaining: queriesRemaining, status: 'skipped' });
                continue;
            }

            try {
                await new Promise(r => setTimeout(r, 150)); // Rate limit

                await resend.emails.send({
                    from: fromEmail,
                    to: email,
                    subject: `${firstName}, aún te quedan ${queriesRemaining} consultas gratuitas en Iurexia ⚖️`,
                    html: buildReengagementEmail(firstName, user.queries_used, queriesRemaining),
                });

                results.push({ email, name: firstName, queries_used: user.queries_used, remaining: queriesRemaining, status: 'sent' });
                console.log(`📧 Re-engagement email sent to ${email} (${user.queries_used}/5 used, ${queriesRemaining} remaining)`);
            } catch (emailErr: any) {
                results.push({ email, name: firstName, queries_used: user.queries_used, remaining: queriesRemaining, status: 'error', error: emailErr.message });
                console.error(`❌ Failed to send to ${email}:`, emailErr.message);
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const errors = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            message: dryRun ? 'DRY RUN — no emails sent' : 'Re-engagement campaign complete',
            campaign: 'reengagement_partial_users',
            total: users.length,
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
