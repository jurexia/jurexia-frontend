import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
}

const VALID_STATUSES = ['pending', 'read', 'accepted', 'rejected'];

/**
 * PATCH /api/connect/requests/[id]
 * Updates the status of a connect request.
 * Only the lawyer who owns the request can update it.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getUserIdFromToken(req);
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Status inválido. Opciones: ${VALID_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Verify the request belongs to this lawyer
        const { data: existing } = await supabase
            .from('connect_requests')
            .select('id, lawyer_id')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
        }

        if (existing.lawyer_id !== userId) {
            return NextResponse.json({ error: 'No autorizado para esta solicitud' }, { status: 403 });
        }

        // Update status
        const { data: updated, error } = await supabase
            .from('connect_requests')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating connect request:', error);
            return NextResponse.json({ error: 'Error al actualizar solicitud' }, { status: 500 });
        }

        console.log(`✅ Connect request ${id} updated to status: ${status}`);

        return NextResponse.json({
            success: true,
            request: updated,
        });
    } catch (err) {
        console.error('❌ Unexpected error in PATCH /api/connect/requests/[id]:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
