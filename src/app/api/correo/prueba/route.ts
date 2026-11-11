/**
 * PRUEBA DE BANDEJA (11-nov-2026). Antes de mandar una campaña a miles, se
 * manda el correo REAL —mismo remitente, mismas cabeceras, mismo HTML— a unas
 * pocas direcciones propias para ver en qué bandeja cae (Principal,
 * Promociones o Spam) en Gmail, Outlook o Yahoo, o a la dirección que da
 * mail-tester.com para su calificación.
 *
 *   POST /api/correo/prueba
 *   cabecera `x-admin-key`
 *   cuerpo JSON: { "campanias": ["buen_fin", "posicion"], "para": ["uno@gmail.com"] }
 *
 * Por POST y con las direcciones en el cuerpo: así no quedan en la URL ni en
 * los registros de Vercel. Hasta 5 direcciones y hasta 3 campañas por
 * llamada. No se anota en `correo_envios`: no cuenta para la campaña ni para
 * el freno de tres días. El saludo usa «Lic.» y el nombre que se pueda sacar
 * del correo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { CAMPANIAS, type NombreCampania } from '@/lib/correo/campanias';
import { REMITENTE_CAMPANIAS } from '@/lib/correo/enviar';
import { cabecerasBaja } from '@/lib/correo/baja';

export const fetchCache = 'force-no-store';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function lista(v: unknown): string[] {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
    return [];
}

export async function POST(req: NextRequest) {
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (!clave || req.headers.get('x-admin-key') !== clave) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let cuerpo: Record<string, unknown> = {};
    try {
        cuerpo = await req.json();
    } catch {
        return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
    }

    const campanias = lista(cuerpo.campanias ?? cuerpo.campania);
    if (!campanias.length || campanias.length > 3 || !campanias.every((c) => c in CAMPANIAS)) {
        return NextResponse.json({ error: 'Entre 1 y 3 campañas conocidas', campanias: Object.keys(CAMPANIAS) }, { status: 400 });
    }
    const para = lista(cuerpo.para).map((e) => e.toLowerCase());
    if (!para.length || para.length > 5 || !para.every((e) => CORREO.test(e))) {
        return NextResponse.json({ error: 'Entre 1 y 5 correos válidos en `para`' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY sin configurar' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const resultados: { campania: string; para: string; id?: string; error?: string }[] = [];
    for (const campania of campanias as NombreCampania[]) {
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
            resultados.push(error ? { campania, para: email, error: error.message } : { campania, para: email, id: data?.id });
        }
    }
    return NextResponse.json({ remitente: REMITENTE_CAMPANIAS, resultados });
}
