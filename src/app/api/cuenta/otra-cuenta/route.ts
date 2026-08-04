/**
 * ¿El usuario que consulta tiene OTRA cuenta, con plan de pago?
 *
 * Nació de un caso real: un abogado con Platinum contratado desde su correo
 * personal entraba a diario con el del despacho —una segunda cuenta, gratuita—
 * y escribió a soporte convencido de que le habían quitado su plan. Nada
 * fallaba; simplemente no había forma de que lo supiera.
 *
 * ─── PRIVACIDAD ──────────────────────────────────────────────────────────
 * La coincidencia se busca por NOMBRE COMPLETO, que es un indicio, no una
 * prueba de identidad: dos abogados pueden llamarse igual, y en un despacho
 * familiar es de esperarse. Por eso la respuesta:
 *
 *   · devuelve la dirección ENMASCARADA (mig•••@aol.com). Su dueño la
 *     reconoce al instante; un homónimo no aprende nada útil.
 *   · no revela el plan exacto ni ningún otro dato de la otra cuenta.
 *   · nunca acepta un correo o un id por parámetro: sólo mira al usuario
 *     autenticado por su token. Si aceptara un correo ajeno, cualquiera
 *     podría sondear qué cuentas de pago existen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PLANES_DE_PAGO = [
    'basico_monthly', 'pro_monthly', 'pro_annual',
    'platinum_monthly', 'platinum_annual', 'ultra_secretarios',
];

/** «miguel@tbblaw.net» → «mig•••••@tbblaw.net» */
function enmascarar(email: string): string {
    const [usuario, dominio] = email.split('@');
    if (!dominio) return '•••';
    const visible = usuario.slice(0, Math.min(3, usuario.length));
    return `${visible}${'•'.repeat(Math.max(3, usuario.length - visible.length))}@${dominio}`;
}

/** Normaliza para comparar: sin acentos, sin dobles espacios, en minúsculas. */
function normalizar(nombre: string): string {
    return nombre
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function GET(req: NextRequest) {
    const cabecera = req.headers.get('authorization') ?? '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: sesion, error: eSesion } = await anon.auth.getUser(token);
    if (eSesion || !sesion.user) {
        return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: yo } = await admin
        .from('user_profiles')
        .select('id, full_name, subscription_type')
        .eq('id', sesion.user.id)
        .maybeSingle();

    // Sólo tiene sentido avisar a quien está en gratuito: si ya paga, no anda
    // buscando su plan perdido.
    if (!yo || yo.subscription_type !== 'gratuito') {
        return NextResponse.json({ hay_otra: false });
    }

    const miNombre = normalizar(yo.full_name ?? '');
    // Un nombre demasiado corto («Miguel») produciría coincidencias falsas.
    if (miNombre.split(' ').length < 2) return NextResponse.json({ hay_otra: false });

    const { data: candidatas } = await admin
        .from('user_profiles')
        .select('email, full_name')
        .in('subscription_type', PLANES_DE_PAGO)
        .eq('is_active', true)
        .neq('id', yo.id);

    const otra = (candidatas ?? []).find(
        (c: { full_name: string | null }) => normalizar(c.full_name ?? '') === miNombre,
    );

    if (!otra) return NextResponse.json({ hay_otra: false });

    return NextResponse.json({
        hay_otra: true,
        correo_oculto: enmascarar(otra.email),
    });
}
