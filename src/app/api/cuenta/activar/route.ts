/**
 * Crea la cuenta verificada de quien empezó el registro y no lo terminó, y lo
 * deja dentro. Ver `@/lib/correo/activar` para el porqué y los límites.
 *
 * Respuestas:
 *   { estado: 'creada', url }   → la cuenta se creó ahora; `url` es un enlace
 *                                 de acceso de un solo uso. La página navega.
 *   { estado: 'existe', url }   → ya había cuenta; `url` lleva a /entrar, que
 *                                 manda el acceso al correo. Nadie entra aquí.
 *   { error }                   → testigo inválido o fallo al crear.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verificarActivacion } from '@/lib/correo/activar';
import { urlEntrada } from '@/lib/correo/entrada';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    let testigo = '';
    try {
        testigo = (await req.json())?.u ?? '';
    } catch {
        return NextResponse.json({ error: 'Petición mal formada' }, { status: 400 });
    }

    const email = verificarActivacion(testigo);
    if (!email) {
        return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ¿Ya tiene cuenta? Entonces no se entra desde aquí: se le manda a /entrar.
    const { data: perfil } = await admin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    if (perfil) {
        return NextResponse.json({ estado: 'existe', url: urlEntrada(email) });
    }

    // El nombre que escribió al registrarse, si quedó guardado con su código.
    const { data: codigo } = await admin
        .from('otp_codes')
        .select('name')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Sin contraseña conocida: se le asigna una aleatoria que nadie conoce.
    // Entrará con enlaces de acceso o creará la suya con «Olvidé mi contraseña».
    const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomBytes(32).toString('base64url'),
        email_confirm: true,
        user_metadata: {
            full_name: codigo?.name ?? '',
            plan: 'gratuito',
            alta_por: 'activacion_campania',
        },
    });

    if (errCrear || !creado?.user?.id) {
        const msg = errCrear?.message ?? '';
        // Carrera: se registró por otra vía entre la consulta y la creación.
        if (msg.includes('already been registered') || msg.includes('already exists')) {
            return NextResponse.json({ estado: 'existe', url: urlEntrada(email) });
        }
        console.error('activar: createUser', msg);
        return NextResponse.json({ error: 'No pudimos crear la cuenta' }, { status: 500 });
    }

    // La marca de verificación la pone un disparador al confirmar el correo.
    // Se asegura aquí también: sin ella `consume_query` rechazaría su primera
    // consulta con «correo no verificado», que es justo lo que se quiere evitar.
    await admin
        .from('user_profiles')
        .update({ email_verificado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', creado.user.id)
        .is('email_verificado_at', null);

    await admin.from('otp_codes').delete().eq('email', email);

    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    const { data: enlace, error: errEnlace } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${sitio}/chat` },
    });

    if (errEnlace || !enlace?.properties?.action_link) {
        // La cuenta quedó creada y verificada; sólo falló el acceso directo.
        console.error('activar: generateLink', errEnlace?.message);
        return NextResponse.json({ estado: 'existe', url: urlEntrada(email) });
    }

    console.log(`✅ Cuenta activada desde campaña: ${email.replace(/(.).*@/, '$1***@')}`);
    return NextResponse.json({ estado: 'creada', url: enlace.properties.action_link });
}
