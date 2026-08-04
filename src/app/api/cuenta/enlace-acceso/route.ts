/**
 * Genera y envía un enlace de acceso de un solo uso.
 *
 * Lo llama la página /entrar cuando el usuario pulsa el botón. El enlace se
 * crea en ese instante, así que llega fresco y con toda su vigencia por
 * delante — a diferencia de uno embebido en el correo de campaña, que habría
 * caducado o lo habría consumido el antivirus del destinatario.
 *
 * Sólo acepta un testigo firmado: nadie puede pedir un enlace para la
 * dirección de otro escribiéndola en la petición.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verificarEntrada } from '@/lib/correo/entrada';

export async function POST(req: NextRequest) {
    let testigo = '';
    try {
        testigo = (await req.json())?.u ?? '';
    } catch {
        return NextResponse.json({ error: 'Petición mal formada' }, { status: 400 });
    }

    const email = verificarEntrada(testigo);
    if (!email) {
        return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // La cuenta tiene que existir. `magiclink` sobre una dirección sin cuenta
    // fallaría, y no queremos crear cuentas desde aquí.
    const { data: perfil } = await admin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (!perfil) {
        // Respuesta deliberadamente igual que la del caso bueno: si dijéramos
        // «esa cuenta no existe», esto sería un oráculo para averiguar quién
        // está registrado en Iurexia.
        return NextResponse.json({ ok: true });
    }

    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${sitio}/chat` },
    });

    if (error || !data?.properties?.action_link) {
        console.error('generateLink:', error?.message);
        return NextResponse.json({ error: 'No pudimos generar el enlace' }, { status: 500 });
    }

    // Supabase manda su propio correo cuando se usa signInWithOtp, pero
    // generateLink NO envía nada: sólo devuelve el enlace. Lo mandamos
    // nosotros para que salga con la plantilla de la casa.
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { envolver, parrafo, boton, fuerte } = await import('@/lib/correo/plantilla');

    const cuerpo =
        parrafo('Estimado licenciado:', '0 0 22px 0') +
        parrafo(
            `Aquí tiene su acceso directo a Iurexia. El enlace es ${fuerte('de un solo uso')} ` +
            'y no le pedirá contraseña.',
        ) +
        boton('Entrar a Iurexia', data.properties.action_link) +
        parrafo(
            'Por seguridad, este enlace caduca en poco tiempo. Si al pulsarlo le indica que ' +
            'ya no es válido, solicite uno nuevo desde la misma página y le llegará al instante.',
            '22px 0 0 0',
        );

    await resend.emails.send({
        from: process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>',
        to: email,
        subject: 'Su acceso a Iurexia',
        html: envolver({
            cuerpo,
            pie: 'Si no solicitó este acceso, ignore este mensaje: sin pulsar el enlace no ocurre nada.',
        }),
    });

    return NextResponse.json({ ok: true });
}
