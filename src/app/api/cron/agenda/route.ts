/* AVISOS DE LA AGENDA (11-oct-2026). Cada mañana a las 7:00 de la CDMX (13:00
   UTC, vercel.json) se buscan los términos pendientes que vencen en los
   próximos días y, para cada abogado, se manda UN correo con los que tocan
   hoy según los días de aviso que eligió en cada término (por omisión 3, 1 y
   el mismo día). Lo enviado se anota en `avisos_enviados` del término: un cron
   que corra dos veces no repite. Transaccional: lo pidió el propio abogado al
   guardar el término; sale de avisos@ con respuesta a soporte@. */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SITIO, boton, caja, envolver, esc, parrafo, rotulo } from '@/lib/correo/plantilla';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';
    return null;
}

const hoyMexico = () => new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10);
const masDias = (iso: string, n: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
const entre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const enLetra = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
};

interface Fila {
    id: string; user_id: string; titulo: string; expediente: string | null; organo: string | null;
    vencimiento: string; cantidad: number | null; unidad: string | null; tipo_dias: string | null;
    fundamento: string[] | null; recordar_dias: number[] | null; avisos_enviados: Record<string, string> | null;
}

function correo(filas: (Fila & { faltan: number })[]) {
    const hoyMismo = filas.filter((f) => f.faltan === 0);
    const asunto = hoyMismo.length
        ? `Hoy vence: ${hoyMismo[0].titulo}${hoyMismo.length > 1 ? ` y ${hoyMismo.length - 1} más` : ''}`
        : filas.length === 1
            ? `Vence ${filas[0].faltan === 1 ? 'mañana' : `en ${filas[0].faltan} días`}: ${filas[0].titulo}`
            : `${filas.length} términos por vencer`;
    const bloques = filas
        .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
        .map((f) => {
            const cuando = f.faltan === 0 ? 'VENCE HOY' : f.faltan === 1 ? 'Vence mañana' : `Vence en ${f.faltan} días`;
            const plazo = f.cantidad ? `${f.cantidad} ${f.unidad === 'dias' ? `días ${f.tipo_dias === 'naturales' ? 'naturales' : 'hábiles'}` : f.unidad}` : '';
            return caja(
                rotulo(`${cuando} · ${enLetra(f.vencimiento)}`)
                + `<div style="font-size:17px;font-weight:bold;color:#1c1712;margin-bottom:6px;">${esc(f.titulo)}</div>`
                + (f.expediente || f.organo ? `<div style="font-size:13px;color:#5b5348;">${esc([f.expediente, f.organo].filter(Boolean).join(' · '))}</div>` : '')
                + (plazo ? `<div style="font-size:13px;color:#5b5348;margin-top:4px;">Plazo: ${esc(plazo)}${f.fundamento?.length ? ` · ${esc(f.fundamento[0])}` : ''}</div>` : ''),
            );
        }).join('<div style="height:10px"></div>');
    const cuerpo = parrafo('Licenciado:')
        + parrafo(filas.length === 1 ? 'Le recordamos un término de su agenda:' : 'Le recordamos estos términos de su agenda:')
        + bloques
        + '<div style="height:18px"></div>'
        + boton('Abrir mi agenda', `${SITIO}/agenda`)
        + parrafo('<span style="font-size:12px;color:#6b6358;">El cómputo aplica las reglas del código elegido; no conoce las vacaciones ni suspensiones de cada tribunal. Puede cambiar o quitar los avisos desde cada término de su agenda.</span>', '18px 0 0 0');
    return { asunto, html: envolver({ cuerpo, pie: 'Iurexia Agenda · Equipo de Desarrollo de Iurexia' }) };
}

async function enviar(para: string, asunto: string, html: string) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) throw new Error('falta RESEND_API_KEY');
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Iurexia Agenda <avisos@iurexia.com>', to: [para], subject: asunto, html,
            reply_to: 'soporte@iurexia.com' }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).id as string;
}

export async function GET(req: NextRequest) {
    const quien = quienLlama(req);
    if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } });
    const hoy = hoyMexico();
    const { data, error } = await db.from('agenda_terminos')
        .select('id,user_id,titulo,expediente,organo,vencimiento,cantidad,unidad,tipo_dias,fundamento,recordar_dias,avisos_enviados')
        .eq('estado', 'pendiente').gte('vencimiento', hoy).lte('vencimiento', masDias(hoy, 10))
        .limit(5000);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const porUsuario = new Map<string, (Fila & { faltan: number })[]>();
    for (const f of (data || []) as Fila[]) {
        const faltan = entre(hoy, f.vencimiento);
        const toca = (f.recordar_dias || [3, 1, 0]).includes(faltan) && !(f.avisos_enviados || {})[String(faltan)];
        if (!toca) continue;
        const l = porUsuario.get(f.user_id) || [];
        l.push({ ...f, faltan });
        porUsuario.set(f.user_id, l);
    }

    let enviados = 0, fallidos = 0;
    for (const [uid, filas] of Array.from(porUsuario.entries())) {
        try {
            const { data: u } = await db.auth.admin.getUserById(uid);
            const para = u?.user?.email;
            if (!para) continue;
            const { asunto, html } = correo(filas);
            const rid = await enviar(para, asunto, html);
            const ahora = new Date().toISOString();
            for (const f of filas) {
                await db.from('agenda_terminos')
                    .update({ avisos_enviados: { ...(f.avisos_enviados || {}), [String(f.faltan)]: ahora } })
                    .eq('id', f.id);
            }
            enviados += 1;
            console.log(`📅 Agenda: aviso a ${uid.slice(0, 8)} (${filas.length} términos) · ${rid}`);
        } catch (e) {
            fallidos += 1;
            console.error(`📅 Agenda: no se pudo avisar a ${uid.slice(0, 8)}:`, e instanceof Error ? e.message : e);
        }
    }
    return NextResponse.json({ ok: true, hoy, usuarios: porUsuario.size, enviados, fallidos });
}
