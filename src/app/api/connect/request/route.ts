import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase admin client (bypasses RLS)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * POST /api/connect/request
 * Creates a connect request from a user to a lawyer.
 * Also creates an in-app notification for the lawyer.
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

        // 2. Create a notification for the lawyer
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
