/**
 * A quién va cada campaña. Fuente única: si un segmento cambia, cambia aquí
 * y las dos rutas (la manual y el cron diario) lo heredan.
 *
 * Reparto real de la base al 4-ago-2026, que es lo que justifica cada corte:
 *
 *   0 consultas          1,564   → activacion
 *   1-4 consultas          131   → reactivacion / suscripcion
 *   5+ topó el límite       66   → suscripcion
 *   pagados                167   → referidos
 */

import { createClient } from '@supabase/supabase-js';
import { ADMINS, type Destinatario } from './enviar';
import { PLANES_QUE_CUENTAN } from './referidos';
import type { NombreCampania } from './campanias';

const COLUMNAS = 'id, email, full_name, estado, queries_used';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

export async function segmento(campania: NombreCampania): Promise<Destinatario[]> {
    let q = admin().from('user_profiles').select(COLUMNAS);

    if (campania === 'referidos') {
        // Único segmento de clientes, no de prospectos. Se les pide que
        // recomienden, así que tienen que estar al corriente.
        q = q.in('subscription_type', PLANES_QUE_CUENTAN).eq('is_active', true);
    } else if (campania === 'activacion') {
        // Nunca escribió una consulta. Se dejan pasar 48 h desde el alta para
        // no competir con el correo de bienvenida.
        q = q.eq('subscription_type', 'gratuito')
             .or('queries_used.is.null,queries_used.eq.0')
             .lt('created_at', new Date(Date.now() - 48 * 3600_000).toISOString());
    } else if (campania === 'reactivacion') {
        // Probó de verdad y lleva más de 30 días sin volver.
        q = q.eq('subscription_type', 'gratuito')
             .gte('queries_used', 1)
             .lt('last_query_at', new Date(Date.now() - 30 * 86400_000).toISOString());
    } else {
        // Chocó con el muro de cinco, o está a una consulta de hacerlo.
        q = q.eq('subscription_type', 'gratuito').gte('queries_used', 4);
    }

    const { data, error } = await q.limit(2000);
    if (error) throw new Error(`segmento ${campania}: ${error.message}`);

    return (data ?? []).filter(
        (u: Destinatario) => u.email && !ADMINS.includes(u.email.toLowerCase()),
    );
}
