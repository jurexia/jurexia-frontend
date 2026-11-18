/**
 * ÚLTIMAS HORAS DEL BUEN FIN (17-nov-2026, noche).
 *
 * Manda `buen_fin_horas` AHORA, sin repartir la tanda en el día: la oferta
 * cierra a las 23:59 y una entrega programada llegaría tarde.
 *
 *   POST /api/correo/ultimas-horas   cabecera `x-admin-key`
 *   cuerpo JSON: { "real": true, "maximo": 700 }   (sin `real`, simulacro)
 *
 * Va a quien nunca recibió un correo del Buen Fin: además de los frenos de
 * siempre (bajas, ya enviados y nadie que haya recibido una campaña en los
 * últimos días), se excluye a todo el que recibió `buen_fin` o
 * `buen_fin_ultimo`. Primero quien usó Iurexia más recientemente. Queda en
 * `correo_envios`, así que mañana `posicion` no le repite a nadie.
 *
 * Después de las 23:59 de la Ciudad de México ya no envía.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CAMPANIAS } from '@/lib/correo/campanias';
import { enviarCampania } from '@/lib/correo/enviar';
import { segmento } from '@/lib/correo/segmentos';
import { BUEN_FIN } from '@/lib/buen-fin';

export const fetchCache = 'force-no-store';
export const maxDuration = 300;

async function recibieronAlguno(): Promise<Set<string>> {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const vistos = new Set<string>();
    for (let desde = 0; desde < 50_000; desde += 1000) {
        const { data, error } = await db.from('correo_envios').select('email')
            .in('campania', ['buen_fin', 'buen_fin_ultimo']).eq('estado', 'enviado')
            .order('id', { ascending: true }).range(desde, desde + 999);
        if (error) throw new Error(`recibieron Buen Fin: ${error.message}`);
        for (const r of (data ?? []) as { email: string }[]) vistos.add(r.email.toLowerCase());
        if (!data || data.length < 1000) break;
    }
    return vistos;
}

export async function POST(req: NextRequest) {
    const arranque = Date.now();
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (!clave || req.headers.get('x-admin-key') !== clave) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (Date.now() > BUEN_FIN.fin.getTime()) {
        return NextResponse.json({ omitido: 'El Buen Fin ya cerró' });
    }
    let cuerpo: { real?: boolean; maximo?: number } = {};
    try { cuerpo = await req.json(); } catch { /* sin cuerpo: simulacro */ }
    const maximo = Math.max(1, Math.min(Number(cuerpo.maximo) || 700, 1500));

    const vistos = await recibieronAlguno();
    const todos = await segmento('buen_fin_horas');
    const destinatarios = todos.filter((d) => !vistos.has(d.email.toLowerCase()));

    const res = await enviarCampania({
        campania: 'buen_fin_horas',
        destinatarios,
        construir: CAMPANIAS.buen_fin_horas.construir,
        simulacro: cuerpo.real !== true,
        maximo,
        plazoHasta: arranque + 240_000,
    });
    return NextResponse.json({ sin_correo_del_buen_fin: destinatarios.length, ...res });
}
