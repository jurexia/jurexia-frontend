import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { esAdmin } from '@/lib/admins';

/**
 * La cerradura de las rutas de administración. UNA, para todas.
 *
 * POR QUÉ EXISTE (23-ago-2026)
 * ----------------------------
 * En una revisión de seguridad salieron cuatro rutas bajo /api/admin sin una
 * sola comprobación. La peor, medida desde fuera y sin credencial alguna:
 *
 *     GET https://www.iurexia.com/api/admin/finances  →  HTTP 200
 *     {"totalSubscribers":184,"totalMRR":4828900,"planBreakdown":[...]}
 *
 * Los ingresos completos de la empresa, servidos a cualquiera que escribiera
 * la dirección. No hacía falta cuenta, ni token, ni saber nada.
 *
 * El patrón correcto ya existía en /api/admin/panel: verificar el token
 * CONTRA Supabase —no fiarse de lo que diga el cliente— y comprobar que el
 * correo del dueño de ese token está en la lista de administradores. Lo que
 * faltaba era que fuera uno solo y compartido, porque una cerradura que hay
 * que reescribir en cada puerta es una puerta que alguien se deja abierta.
 *
 * CÓMO SE USA
 * -----------
 *     const yo = await exigirAdmin(req);
 *     if (yo instanceof NextResponse) return yo;   // 401, ya formado
 *     // a partir de aquí, yo.email es un administrador verificado
 *
 * Devuelve la respuesta de rechazo YA HECHA en vez de un booleano: así no se
 * puede olvidar el `return`, que es como se cuelan estos fallos.
 */

function servicio() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

export type Admin = { email: string; id: string };

export async function exigirAdmin(req: NextRequest): Promise<Admin | NextResponse> {
    const rechazo = NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return rechazo;

    // La identidad se le pregunta a Supabase con el token. Nunca se lee de un
    // campo del cuerpo ni de una cabecera que escriba el cliente: ése es
    // exactamente el fallo que tienen los catorce endpoints del API de Python
    // que se protegen con un `user_email` de formulario.
    let email: string | undefined;
    let id: string | undefined;
    try {
        const { data, error } = await servicio().auth.getUser(token);
        if (error) return rechazo;
        email = data.user?.email?.toLowerCase();
        id = data.user?.id;
    } catch {
        return rechazo;
    }

    if (!email || !id || !esAdmin(email)) return rechazo;
    return { email, id };
}

/**
 * Variante para lo que dispara un cron y también se quiere poder lanzar a
 * mano: acepta el secreto del cron O una sesión de administrador.
 */
export async function exigirAdminOCron(req: NextRequest): Promise<Admin | 'cron' | NextResponse> {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    return exigirAdmin(req);
}
