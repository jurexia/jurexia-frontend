/**
 * Las cabeceras con la sesión del navegador para las rutas de despacho
 * (`/api/redaccion`, `/api/plantillas/…`, `/api/correo/escrito`). Mismo
 * patrón que `SeguirExpediente`: `Authorization: Bearer <access_token>`.
 */

import { supabase } from '@/lib/supabase';

export async function cabecerasConSesion(json = true): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    return h;
}
