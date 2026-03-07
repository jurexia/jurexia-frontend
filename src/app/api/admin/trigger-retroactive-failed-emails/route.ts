import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export const dynamic = 'force-dynamic';

function buildPaymentFailedEmail(name: string, attemptCount: number) {
    const firstName = name.split(' ')[0] || 'Estimado/a';

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
                    <!-- Header con gradiente -->
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
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                Acción Requerida en tu Suscripción ⚠️
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Hola ${firstName},
                            </p>
                            
                            <div style="background-color:#1a1a1a;border:1px solid #dc262640;border-left:4px solid #dc2626;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0;font-size:15px;color:#fca5a5;line-height:1.7;">
                                    <strong>No hemos podido procesar el cargo de tu mensualidad.</strong><br/>
                                    Esto suele ocurrir porque los fondos son insuficientes o la tarjeta ha caducado.
                                </p>
                            </div>

                            <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6;">
                                Para seguir disfrutando del Genio Jurídico y acceso ilimitado a nuestros modelos de IA, por favor <strong>actualiza tu método de pago</strong> en la plataforma.
                            </p>
                            
                            <div style="background-color:#0d1b0d;border:1px solid #1a3a1a;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0;font-size:14px;color:#86efac;line-height:1.6;">
                                    🔄 Realizaremos intentos de cobro automáticos (intento ${attemptCount} de 3) en los próximos días. <strong>Si el último intento falla, tu suscripción pasará de forma automática al plan Gratuito.</strong>
                                </p>
                            </div>

                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/plataforma"
                                           style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c56d);color:#1a1a1a;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                                            Actualizar Método de Pago →
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
                                Si tienes dudas sobre tu facturación contáctanos a <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a>
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

export async function GET(req: NextRequest) {
    try {
        // Authenticate admin using getToken
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const adminEmail = process.env.ADMIN_EMAIL || 'administracion@iurexia.com';
        if (!token?.email || token.email !== adminEmail) {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2023-10-16' as any,
        });

        const resend = new Resend(process.env.RESEND_API_KEY);
        const supabase = getSupabaseAdmin();

        console.log('Buscando facturas fallidas...');
        const invoices = await stripe.invoices.list({
            status: 'open',
            limit: 100,
        });

        const results = [];

        for (const invoice of invoices.data) {
            const email = invoice.customer_email;
            let targetEmail = email;

            if (!targetEmail && invoice.customer) {
                const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
                targetEmail = customer.email;
            }

            if (!targetEmail) {
                results.push({ invoice: invoice.id, status: 'skipped', reason: 'No email found' });
                continue;
            }

            const attemptCount = invoice.attempt_count ?? 1;

            const { data: user } = await supabase
                .from('users')
                .select('full_name')
                .eq('email', targetEmail)
                .single();

            const fullName = user?.full_name || 'Usuario';

            console.log(`Enviando email de fallo a ${targetEmail} (Intento ${attemptCount})...`);
            const { error: sendError } = await resend.emails.send({
                from: process.env.FROM_EMAIL || 'Iurexia Facturación <noreply@iurexia.com>',
                to: targetEmail,
                subject: '⚠️ Error al procesar tu pago de Iurexia',
                html: buildPaymentFailedEmail(fullName, attemptCount),
            });

            if (sendError) {
                results.push({ email: targetEmail, attemptCount, status: 'error', error: sendError.message });
            } else {
                results.push({ email: targetEmail, attemptCount, status: 'sent' });
            }
        }

        return NextResponse.json({ success: true, processedCount: invoices.data.length, results });

    } catch (err: any) {
        console.error('Error triggering retroactive emails:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
