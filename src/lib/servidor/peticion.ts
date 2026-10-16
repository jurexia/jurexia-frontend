/**
 * QUIÉN PIDE: el usuario detrás de una petición a las rutas de despacho
 * (cambiar redacción, plantillas, correo).
 *
 * El navegador manda su token de sesión en `Authorization: Bearer …`, igual
 * que `SeguirExpediente`. Con él se identifica al usuario y, con el servicio,
 * se lee su perfil: el plan decide los topes y el nombre firma los correos.
 * Una cuenta suspendida no pasa.
 */

import type { NextRequest } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export function servicio(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

export interface Solicitante {
    user: User;
    /** `subscription_type` tal cual; para los topes, ver `escalonDe`. */
    plan: string;
    nombre: string | null;
    correo: string | null;
}

export async function solicitanteDe(req: NextRequest): Promise<Solicitante | null> {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    const anonimo = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await anonimo.auth.getUser(token);
    const user = data?.user;
    if (!user) return null;
    const { data: perfil } = await servicio()
        .from('user_profiles')
        .select('subscription_type, full_name, email, suspendido_at')
        .eq('id', user.id)
        .maybeSingle();
    if (perfil?.suspendido_at) return null;
    return {
        user,
        plan: String(perfil?.subscription_type || 'gratuito'),
        nombre: (perfil?.full_name as string | null) || (user.user_metadata?.full_name as string | undefined) || null,
        correo: (perfil?.email as string | null) || user.email || null,
    };
}
