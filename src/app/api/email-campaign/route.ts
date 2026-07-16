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
    <title>Desbloquea el poder completo de Iurexia</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">
                    <!-- HEADER -->
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
                                        <span style="border:1px solid #c9a84c40;color:#c9a84c;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;background-color:#c9a84c0a;">MESA DE CONTROL</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- BODY -->
                    <tr>
                        <td style="padding:40px;line-height:1.6;">
                            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;">
                                Estimado Abogado ${firstName},
                            </h1>
                            
                            <p style="margin:0 0 20px;font-size:15px;color:#ccc;">
                                Esperamos que te encuentres muy bien. Vemos que has estado utilizando la plataforma y has **agotado tus 5 consultas gratuitas del Plan Gratuito**. Queremos felicitarte por dar el paso hacia la digitalización de tu práctica jurídica.
                            </p>

                            <p style="margin:0 0 24px;font-size:15px;color:#ccc;">
                                Para ayudarte a llevar tu litigio y consultoría al siguiente nivel, queremos ofrecerte una oportunidad especial de transición. Activa un plan de pago hoy con un **30% de descuento extra en tu primer mes** utilizando el código de promoción exclusivo en tu pantalla de pago:
                            </p>

                            <!-- CÓDIGO PROMOCIONAL BOX -->
                            <div style="background-color:#1c1913;border:1px solid #c9a84c40;border-radius:12px;padding:24px;margin-bottom:28px;text-align:center;">
                                <span style="font-size:12px;color:#c9a84c;font-weight:700;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:6px;">CÓDIGO DE DESCUENTO</span>
                                <span style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:4px;display:block;margin-bottom:6px;">ABOGADO30</span>
                                <span style="font-size:13px;color:#bbb;display:block;">30% de descuento extra en tu primer mes en planes Pro y Platinum</span>
                            </div>

                            <!-- BENEFICIOS EXCLUSIVOS -->
                            <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">
                                ¿Por qué dar el salto a un Plan Premium?
                            </h2>
                            <p style="margin:0 0 20px;font-size:14px;color:#aaa;">
                                Los planes Pro y Platinum de Iurexia desbloquean herramientas avanzadas que multiplican tu eficiencia jurídica y te dan una ventaja competitiva en los tribunales:
                            </p>

                            <!-- FEATURE LIST -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                                <tr>
                                    <td style="padding:8px 0;vertical-align:top;width:30px;">
                                        <span style="font-size:18px;color:#c9a84c;">✦</span>
                                    </td>
                                    <td style="padding:8px 0;color:#ccc;font-size:14px;line-height:1.5;">
                                        <strong style="color:#fff;">Redactor Pro (Motor de Razonamiento Profundo)</strong><br>
                                        Genera borradores de demandas, amparos y escritos formales con una argumentación robusta y coherente de nivel SCJN, fundamentada automáticamente.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0;vertical-align:top;width:30px;">
                                        <span style="font-size:18px;color:#c9a84c;">✦</span>
                                    </td>
                                    <td style="padding:8px 0;color:#ccc;font-size:14px;line-height:1.5;">
                                        <strong style="color:#fff;">Genios Jurídicos (IA Especializada)</strong><br>
                                        Asistentes expertos por materia (Amparo, Civil, Mercantil, Penal, Fiscal, Laboral, etc.) que tienen leyes completas y tratados en su ventana de contexto (Gemini Context Cache) para respuestas híper-precisas y sin alucinaciones.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0;vertical-align:top;width:30px;">
                                        <span style="font-size:18px;color:#c9a84c;">✦</span>
                                    </td>
                                    <td style="padding:8px 0;color:#ccc;font-size:14px;line-height:1.5;">
                                        <strong style="color:#fff;">Jurimetría Predictiva (Exclusivo Platinum)</strong><br>
                                        Predice el sentido de resolución (concede, niega o sobresee) de tu caso analizando estadísticamente las tendencias de resolución en base a más de 300,000 sentencias de la SCJN y TCC.
                                    </td>
                                </tr>
                            </table>

                            <!-- COMPARATIVA DE PLANES -->
                            <div style="background-color:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;text-align:center;">
                                    Elige el Plan que Mejor se Adapte a ti
                                </h3>
                                
                                <!-- PLAN PRO -->
                                <div style="border-bottom:1px solid #222;padding-bottom:16px;margin-bottom:16px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td>
                                                <strong style="font-size:16px;color:#c9a84c;">PLAN PRO</strong><br>
                                                <span style="font-size:12px;color:#888;">Para litigantes independientes</span>
                                            </td>
                                            <td align="right" style="vertical-align:top;">
                                                <strong style="font-size:16px;color:#fff;">$149 MXN <span style="font-size:11px;color:#888;">/mes</span></strong>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:8px 0 0;font-size:13px;color:#bbb;line-height:1.5;">
                                        • <strong>140 consultas/mes</strong> al chat principal.<br>
                                        • Arquitectura Multi-Genio y análisis/auditoría de documentos.<br>
                                        • Precedentes judiciales detallados de <strong>6 circuitos activos</strong>.<br>
                                        • Registro en el directorio Connect para captar clientes en tu zona.
                                    </p>
                                </div>

                                <!-- PLAN PLATINUM -->
                                <div>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td>
                                                <strong style="font-size:16px;color:#c9a84c;">PLAN PLATINUM</strong><br>
                                                <span style="font-size:12px;color:#888;">Para despachos y firmas jurídicas</span>
                                            </td>
                                            <td align="right" style="vertical-align:top;">
                                                <strong style="font-size:16px;color:#fff;">$599 MXN <span style="font-size:11px;color:#888;">/mes</span></strong>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:8px 0 0;font-size:13px;color:#bbb;line-height:1.5;">
                                        • <strong>560 consultas/mes</strong>.<br>
                                        • Todo lo del Plan Pro incluido.<br>
                                        • <strong>Módulo de Jurimetría</strong> (Predicción de sentencias).<br>
                                        • Acceso en fase beta al <strong>Redactor de Sentencias TCC</strong>.<br>
                                        • Asesoría directa vía correo electrónico y soporte VIP dedicado.
                                    </p>
                                </div>
                            </div>

                            <!-- PAGO SEGURO CON STRIPE -->
                            <div style="background-color:#131a15;border:1px solid #10b98130;border-radius:12px;padding:16px;margin-bottom:28px;text-align:center;">
                                <p style="margin:0;font-size:13px;color:#a7f3d0;line-height:1.5;">
                                    🔒 <strong>Seguridad Garantizada:</strong> Procesamos tus suscripciones a través de <strong>Stripe</strong>, el proveedor de pagos globales más seguro del mundo. Tu información bancaria está 100% cifrada bajo los estándares más estrictos.
                                </p>
                            </div>

                            <!-- CTA PRINCIPAL -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://www.iurexia.com/precios"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:16px;font-weight:700;padding:16px 48px;border-radius:10px;text-decoration:none;box-shadow:0 4px 12px rgba(201,168,76,0.25);">
                                            🚀 Desbloquear Premium con 30% Off →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 20px;font-size:14px;color:#aaa;text-align:center;">
                                * El descuento del 30% aplica ingresando el código <strong>ABOGADO30</strong> en la pantalla de pago de Stripe.
                            </p>

                            <p style="margin:40px 0 0;font-size:14px;color:#888;">
                                Atentamente,<br/>
                                <strong>El Equipo Iurexia</strong><br/>
                                <span style="font-size:12px;">Inteligencia Artificial para el Derecho Mexicano</span>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;text-align:center;">
                            <p style="margin:0 0 8px;font-size:11px;color:#444;">
                                © 2026 Iurexia Technologies. Todos los derechos reservados.
                            </p>
                            <p style="margin:0;font-size:11px;color:#444;">
                                Recibiste este correo porque estás registrado en iurexia.com. Para dejar de recibir estos correos, puedes responder directamente solicitando tu baja.
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
}

export async function POST(request: NextRequest) {
    try {
        // Auth check - admin only
        const { searchParams } = new URL(request.url);
        const adminKey = searchParams.get('key');
        const allowedKeys = ['jurexia-reingest-2026'];
        if (process.env.ADMIN_CAMPAIGN_KEY) {
            allowedKeys.push(process.env.ADMIN_CAMPAIGN_KEY);
        }
        
        if (!adminKey || !allowedKeys.includes(adminKey)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const dryRun = body.dryRun ?? true; // Default to dry run for safety
        const limit = body.limit ?? 10; // Send in batches
        const offset = body.offset ?? 0; // Skip already-sent users
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
            .range(offset, offset + limit - 1);

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
