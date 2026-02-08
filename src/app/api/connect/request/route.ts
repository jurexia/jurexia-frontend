import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Server-side Supabase admin client (bypasses RLS)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * Build the HTML email for a new connect request notification.
 */
function buildNotificationEmail(params: {
    lawyerName: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    message: string;
    searchQuery?: string;
}) {
    const { lawyerName, clientName, clientEmail, clientPhone, message, searchQuery } = params;
    const inboxUrl = 'https://www.iurexia.com/connect/inbox';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f6f3;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1a1a1a;padding:24px 32px;">
                            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Iurex<span style="color:#22c55e;">ia</span></span>
                            <span style="display:inline-block;margin-left:8px;background-color:rgba(255,255,255,0.15);color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;">CONNECT</span>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1a1a;">Nueva solicitud de asesoría</h1>
                            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
                                Hola ${lawyerName}, un usuario te ha contactado a través de IUREXIA Connect.
                            </p>

                            <!-- Client Card -->
                            <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
                                <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1a1a1a;">${clientName}</p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding:4px 0;font-size:13px;color:#6b7280;width:80px;">Email:</td>
                                        <td style="padding:4px 0;font-size:13px;color:#1a1a1a;">
                                            <a href="mailto:${clientEmail}" style="color:#2563eb;text-decoration:none;">${clientEmail}</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:4px 0;font-size:13px;color:#6b7280;width:80px;">Teléfono:</td>
                                        <td style="padding:4px 0;font-size:13px;color:#1a1a1a;">
                                            <a href="tel:${clientPhone}" style="color:#2563eb;text-decoration:none;">${clientPhone}</a>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Message -->
                            <div style="background-color:#fffbeb;border-left:3px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
                                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Mensaje del cliente</p>
                                <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.5;">${message}</p>
                            </div>

                            ${searchQuery ? `
                            <!-- Search Query -->
                            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                                <p style="margin:0;font-size:12px;color:#166534;">
                                    🔍 <strong>Búsqueda del usuario:</strong> ${searchQuery}
                                </p>
                            </div>
                            ` : ''}

                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 16px;">
                                        <a href="${inboxUrl}"
                                           style="display:inline-block;background-color:#1a1a1a;color:#ffffff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
                                            Ver solicitud en mi bandeja
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                                Responde lo antes posible para aumentar tu tasa de aceptación.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                                Este email fue enviado por IUREXIA Connect. Si no esperabas esta notificación, puedes ignorarlo.
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
 * Send email notification to the lawyer about a new connect request.
 * Non-blocking — logs errors but never throws.
 */
async function sendLawyerEmailNotification(params: {
    lawyerId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    message: string;
    searchQuery?: string;
}) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ RESEND_API_KEY not set — skipping email notification');
        return;
    }

    try {
        const supabase = getSupabaseAdmin();

        // Get lawyer's email and name from auth + lawyer_profiles
        const { data: { user: lawyerUser }, error: authError } = await supabase.auth.admin.getUserById(params.lawyerId);
        if (authError || !lawyerUser?.email) {
            console.error('⚠️ Could not fetch lawyer email:', authError);
            return;
        }

        // Get lawyer's display name
        const { data: lawyerProfile } = await supabase
            .from('lawyer_profiles')
            .select('full_name')
            .eq('id', params.lawyerId)
            .single();

        const lawyerName = lawyerProfile?.full_name || lawyerUser.user_metadata?.full_name || 'Abogado';
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia Connect <onboarding@resend.dev>';

        const resend = new Resend(apiKey);

        const { error: sendError } = await resend.emails.send({
            from: fromEmail,
            to: lawyerUser.email,
            subject: `Nueva solicitud de asesoría — ${params.clientName}`,
            html: buildNotificationEmail({
                lawyerName,
                clientName: params.clientName,
                clientEmail: params.clientEmail,
                clientPhone: params.clientPhone,
                message: params.message,
                searchQuery: params.searchQuery,
            }),
        });

        if (sendError) {
            console.error('⚠️ Resend email error:', sendError);
        } else {
            console.log(`📧 Email notification sent to ${lawyerUser.email} for connect request`);
        }
    } catch (err) {
        console.error('⚠️ Email notification failed (non-critical):', err);
    }
}

/**
 * POST /api/connect/request
 * Creates a connect request from a user to a lawyer.
 * Also creates an in-app notification and sends an email to the lawyer.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lawyer_id, client_id, client_name, client_email, client_phone, message, search_query } = body;

        // Validate required fields
        if (!lawyer_id || !client_name || !client_email || !client_phone || !message) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: lawyer_id, client_name, client_email, client_phone, message' },
                { status: 400 }
            );
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
            return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
        }

        // Basic phone validation (at least 10 digits)
        const phoneDigits = client_phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            return NextResponse.json({ error: 'Teléfono inválido (mínimo 10 dígitos)' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Insert the connect request
        const { data: requestData, error: requestError } = await supabase
            .from('connect_requests')
            .insert({
                lawyer_id,
                client_id: client_id || null,
                client_name: client_name.trim(),
                client_email: client_email.trim().toLowerCase(),
                client_phone: client_phone.trim(),
                message: message.trim(),
                search_query: search_query?.trim() || null,
                status: 'pending',
            })
            .select()
            .single();

        if (requestError) {
            console.error('❌ Error creating connect request:', requestError);
            return NextResponse.json(
                { error: 'Error al crear la solicitud de contacto' },
                { status: 500 }
            );
        }

        // 2. Create a notification for the lawyer (in-app)
        const { error: notifError } = await supabase
            .from('notifications')
            .insert({
                user_id: lawyer_id,
                type: 'connect_request',
                title: 'Nueva solicitud de asesoría',
                message: `${client_name} te ha enviado una solicitud de contacto.`,
                metadata: {
                    request_id: requestData.id,
                    client_name,
                    search_query: search_query || null,
                },
            });

        if (notifError) {
            // Non-critical — log but don't fail the request
            console.error('⚠️ Error creating notification (non-critical):', notifError);
        }

        // 3. Send email notification to the lawyer (non-blocking)
        sendLawyerEmailNotification({
            lawyerId: lawyer_id,
            clientName: client_name.trim(),
            clientEmail: client_email.trim().toLowerCase(),
            clientPhone: client_phone.trim(),
            message: message.trim(),
            searchQuery: search_query?.trim() || undefined,
        }).catch((err) => {
            console.error('⚠️ Email notification promise rejected:', err);
        });

        console.log(`✅ Connect request created: ${requestData.id} → lawyer ${lawyer_id}`);

        return NextResponse.json({
            success: true,
            request_id: requestData.id,
            message: 'Solicitud enviada exitosamente',
        });
    } catch (err) {
        console.error('❌ Unexpected error in POST /api/connect/request:', err);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
