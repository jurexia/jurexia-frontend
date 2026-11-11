/**
 * PRUEBA DE BANDEJA (11-nov-2026). Antes de mandar una campaña a miles, se
 * manda el correo REAL —mismo remitente, mismas cabeceras, mismo HTML— a unas
 * pocas direcciones propias para ver en qué bandeja cae (Principal,
 * Promociones o Spam) en Gmail, Outlook o Yahoo, o a la dirección que da
 * mail-tester.com para su calificación.
 *
 *   GET /api/correo/prueba?campania=buen_fin&para=uno@gmail.com,otro@outlook.com
 *   con la cabecera `x-admin-key`.
 *
 * Hasta 5 direcciones. No se anota en `correo_envios`: no cuenta para la
 * campaña ni para el freno de tres días. El saludo usa «Lic.» y el nombre que
 * se pueda sacar del correo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { CAMPANIAS, type NombreCampania } from '@/lib/correo/campanias';
import { REMITENTE_CAMPANIAS } from '@/lib/correo/enviar';
import { cabecerasBaja } from '@/lib/correo/baja';

export const fetchCache = 'force-no-store';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (!clave || req.headers.get('x-admin-key') !== clave) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const campania = req.nextUrl.searchParams.get('campania') as NombreCampania | null;
    if (!campania || !(campania in CAMPANIAS)) {
        return NextResponse.json({ error: 'Campaña desconocida', campanias: Object.keys(CAMPANIAS) }, { status: 400 });
    }
    const para = (req.nextUrl.searchParams.get('para') || '')
        .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!para.length || para.length > 5 || !para.every((e) => CORREO.test(e))) {
        return NextResponse.json({ error: 'Entre 1 y 5 correos válidos en `para`, separados por coma' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY sin configurar' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const resultados: { para: string; id?: string; error?: string }[] = [];
    for (const email of para) {
        const c = CAMPANIAS[campania].construir({
            id: null, email, full_name: null, estado: null, queries_used: 5, tratamiento: 'lic',
        });
        const { data, error } = await resend.emails.send({
            from: REMITENTE_CAMPANIAS,
            to: email,
            replyTo: 'soporte@iurexia.com',
            subject: c.asunto,
            html: c.html,
            text: c.texto,
            headers: cabecerasBaja(email),
        });
        resultados.push(error ? { para: email, error: error.message } : { para: email, id: data?.id });
    }
    return NextResponse.json({ campania, remitente: REMITENTE_CAMPANIAS, resultados });
}
