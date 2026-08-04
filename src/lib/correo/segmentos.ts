/**
 * A quién va cada campaña. Fuente única: si un segmento cambia, cambia aquí
 * y las dos rutas (la manual y el cron diario) lo heredan.
 *
 * ─── OJO CON `queries_used`: SE REINICIA ─────────────────────────────────
 * `queries_used` es el consumo DEL PERIODO, no el histórico. Se pone a cero
 * en cada renovación y en cada cambio de plan. Por eso `queries_used = 0` NO
 * significa «nunca usó la plataforma».
 *
 * Medido el 5-ago-2026 sobre la base real:
 *
 *   gratuitos con queries_used = 0 ............. 1,561
 *   de ésos, con last_query_at IS NULL .......... 569  ← nunca consultaron
 *   de ésos, que SÍ consultaron alguna vez ...... 992  ← sólo se les reinició
 *
 * Segmentar la activación por `queries_used = 0` habría mandado a 992 abogados
 * un correo diciéndoles que su cuenta «está sin usar» y que «todavía no ha
 * hecho su primera consulta». A gente que sí la usó, y del gremio que menos
 * perdona la falta de rigor.
 *
 * La señal buena para «nunca la usó» es `last_query_at IS NULL`, que no se
 * reinicia nunca. `queries_used` sólo sirve donde de verdad importa el
 * periodo: saber quién chocó con el tope este mes.
 *
 * Reparto vigente:
 *
 *   nunca consultaron ....... 569   → activacion
 *   inactivos 30+ días ...... 894   → reactivacion
 *   toparon el límite ........ 76   → suscripcion
 *   clientes de pago ........ 159   → referidos
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

/** Aplica los filtros del segmento a una consulta ya iniciada. */
function filtrar(q: any, campania: NombreCampania) {
    if (campania === 'referidos') {
        // Único segmento de clientes, no de prospectos. Se les pide que
        // recomienden, así que tienen que estar al corriente.
        return q.in('subscription_type', PLANES_QUE_CUENTAN).eq('is_active', true);
    }
    if (campania === 'activacion') {
        // Nunca escribió una consulta — `last_query_at` nulo, que es lo único
        // que no se reinicia. Se dejan pasar 48 h desde el alta para no
        // competir con el correo de bienvenida.
        return q.eq('subscription_type', 'gratuito')
                .is('last_query_at', null)
                .lt('created_at', new Date(Date.now() - 48 * 3600_000).toISOString());
    }
    if (campania === 'reactivacion') {
        // Sí la usó, y lleva más de 30 días sin volver.
        return q.eq('subscription_type', 'gratuito')
                .not('last_query_at', 'is', null)
                .lt('last_query_at', new Date(Date.now() - 30 * 86400_000).toISOString());
    }
    // Chocó con el tope de cinco de ESTE periodo, o está a una consulta de
    // hacerlo. Aquí `queries_used` sí es la medida correcta.
    return q.eq('subscription_type', 'gratuito').gte('queries_used', 4);
}

export async function segmento(campania: NombreCampania): Promise<Destinatario[]> {
    // Paginado obligatorio: Supabase corta en 1,000 filas por respuesta
    // (ajuste `max-rows` de PostgREST) y IGNORA un `.limit()` mayor. Pedir
    // 2,000 devolvía exactamente 1,000 sin error ni aviso, así que el
    // segmento venía truncado y nadie se enteraba: el reporte decía «1000»
    // como si ése fuera el tamaño real.
    const TAMANO = 1000;
    const filas: Destinatario[] = [];

    for (let desde = 0; ; desde += TAMANO) {
        const q = filtrar(admin().from('user_profiles').select(COLUMNAS), campania);
        const { data, error } = await q.range(desde, desde + TAMANO - 1);
        if (error) throw new Error(`segmento ${campania}: ${error.message}`);

        filas.push(...(data ?? []));
        if (!data || data.length < TAMANO) break;

        // Freno de seguridad por si algún día la base crece de golpe.
        if (desde > 50_000) break;
    }

    return filas.filter(
        (u: Destinatario) => u.email && !ADMINS.includes(u.email.toLowerCase()),
    );
}
