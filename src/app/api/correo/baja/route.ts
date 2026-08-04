/**
 * Baja de correos con un clic.
 *
 * GET  — el usuario hizo clic en el enlace del pie; se da de baja y ve una
 *        página de confirmación sobria.
 * POST — lo dispara el propio cliente de correo (Gmail, Apple Mail) a partir
 *        de la cabecera `List-Unsubscribe-Post`. Nunca lo ve una persona, así
 *        que responde 200 en seco.
 *
 * Ambos son idempotentes: repetir la baja no falla.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verificarTestigo } from '@/lib/correo/baja';
import { PALETA } from '@/lib/correo/plantilla';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

async function darDeBaja(email: string, origen: 'un-clic' | 'manual') {
    const { error } = await admin()
        .from('correo_bajas')
        .upsert({ email, origen }, { onConflict: 'email' });
    if (error) console.error('correo_bajas upsert:', error.message);
    return !error;
}

function pagina(titulo: string, mensaje: string): NextResponse {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · Iurexia</title></head>
<body style="margin:0;background-color:${PALETA.cremaFondo};font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:64px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background-color:${PALETA.cremaPapel};border:1px solid ${PALETA.borde};">
<tr><td style="padding:34px 44px 24px;border-bottom:2px solid ${PALETA.oro};">
  <div style="font-size:25px;font-weight:600;color:${PALETA.tinta};letter-spacing:0.5px;">Iurexia</div>
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2.6px;color:${PALETA.marron};text-transform:uppercase;padding-top:8px;">Legal Tech</div>
</td></tr>
<tr><td style="padding:36px 44px;font-size:16px;line-height:1.7;color:${PALETA.texto};">
  <div style="font-size:20px;color:${PALETA.tinta};padding-bottom:14px;">${titulo}</div>
  ${mensaje}
  <div style="padding-top:26px;">
    <a href="${sitio}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${PALETA.marron};text-decoration:underline;">Volver a iurexia.com</a>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;
    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export async function GET(req: NextRequest) {
    const testigo = req.nextUrl.searchParams.get('t') || '';
    const email = verificarTestigo(testigo);

    if (!email) {
        return pagina(
            'Enlace no válido',
            `<p style="margin:0;">Este enlace de baja no es válido o fue modificado. Si quiere dejar de recibir nuestros avisos, escríbanos a <a href="mailto:soporte@iurexia.com" style="color:${PALETA.marron};">soporte@iurexia.com</a> y lo haremos de inmediato.</p>`,
        );
    }

    const ok = await darDeBaja(email, 'un-clic');
    if (!ok) {
        return pagina(
            'No pudimos completar la baja',
            `<p style="margin:0;">Ocurrió un problema al registrar su baja. Escríbanos a <a href="mailto:soporte@iurexia.com" style="color:${PALETA.marron};">soporte@iurexia.com</a> y la aplicamos manualmente.</p>`,
        );
    }

    return pagina(
        'Listo, no volverá a recibir estos avisos',
        `<p style="margin:0 0 16px;">Dimos de baja a <strong style="color:${PALETA.tinta};">${email}</strong> de nuestros correos informativos y promocionales.</p>
         <p style="margin:0;color:${PALETA.apagado};font-size:14px;">Su cuenta sigue activa y no perdió nada de su trabajo. Seguirá recibiendo únicamente los correos indispensables de su cuenta, como la recuperación de contraseña.</p>`,
    );
}

export async function POST(req: NextRequest) {
    const testigo = req.nextUrl.searchParams.get('t') || '';
    const email = verificarTestigo(testigo);
    if (!email) return new NextResponse(null, { status: 400 });

    await darDeBaja(email, 'un-clic');
    // El cliente de correo sólo mira el código; no hay nadie leyendo.
    return new NextResponse(null, { status: 200 });
}
