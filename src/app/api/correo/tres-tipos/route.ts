/**
 * TRES TIPOS DE ABOGADOS, PRIMER BLOQUE A MANO (25-nov-2026).
 *
 * David: «empújala desde ahorita para algunos de forma gradual para que no se
 * vayan a spam o promociones». El cron diario ya corrió hoy, así que este
 * bloque sale a mano: pocos, primero los más cerca de comprar y quien usó
 * Iurexia más recientemente (así ordena el segmento), y repartidos en las
 * horas siguientes —cada correo con su propia hora en Resend— para que el
 * envío no tenga forma de ráfaga. El jueves y el viernes sigue el cron.
 *
 *   POST /api/correo/tres-tipos   cabecera `x-admin-key`
 *   cuerpo JSON: { "real": true, "maximo": 300, "horas": 3.5 }   (sin `real`, simulacro)
 *
 * Los frenos de siempre (bajas, ya enviados, nadie con otra campaña en los
 * últimos tres días) los aplica `enviarCampania`. Después del cierre de
 * ANUAL20 ya no envía.
 */
import { NextRequest, NextResponse } from 'next/server';
import { ANUAL20, CAMPANIAS } from '@/lib/correo/campanias';
import { enviarCampania } from '@/lib/correo/enviar';
import { segmento } from '@/lib/correo/segmentos';

export const fetchCache = 'force-no-store';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    const arranque = Date.now();
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (!clave || req.headers.get('x-admin-key') !== clave) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (arranque > Date.parse(ANUAL20.hasta)) {
        return NextResponse.json({ omitido: 'ANUAL20 ya venció' });
    }
    let cuerpo: { real?: boolean; maximo?: number; horas?: number } = {};
    try { cuerpo = await req.json(); } catch { /* sin cuerpo: simulacro */ }
    const maximo = Math.max(1, Math.min(Number(cuerpo.maximo) || 300, 800));
    const horas = Math.max(0.5, Math.min(Number(cuerpo.horas) || 3.5, 6));

    const destinatarios = await segmento('tres_tipos');
    const res = await enviarCampania({
        campania: 'tres_tipos',
        destinatarios,
        construir: CAMPANIAS.tres_tipos.construir,
        simulacro: cuerpo.real !== true,
        maximo,
        plazoHasta: arranque + 240_000,
        programadoPara: new Date(arranque + 120_000).toISOString(),
        ventanaMs: horas * 3600_000,
    });
    return NextResponse.json({ segmento: destinatarios.length, horas, ...res });
}
