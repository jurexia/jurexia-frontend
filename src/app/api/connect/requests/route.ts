import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * Helper: extract user ID from Supabase JWT in Authorization header.
 */
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

/**
 * GET /api/connect/requests
 * Fetches all connect requests for the authenticated lawyer.
 * Requires Authorization: Bearer <supabase_jwt>
 */
export async function GET(req: NextRequest) {
    try {
        const userId = await getUserIdFromToken(req);
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Verify user is a lawyer
        const { data: lawyerProfile } = await supabase
            .from('lawyer_profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (!lawyerProfile) {
            return NextResponse.json({ error: 'No eres un abogado registrado' }, { status: 403 });
        }

        // Fetch requests ordered by newest first
        const { data: requests, error } = await supabase
            .from('connect_requests')
            .select('*')
            .eq('lawyer_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching connect requests:', error);
            return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 });
        }

        return NextResponse.json({
            requests: requests || [],
            total: requests?.length || 0,
        });
    } catch (err) {
        console.error('❌ Unexpected error in GET /api/connect/requests:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
