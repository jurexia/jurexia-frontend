/**
 * La vuelta ligera del circuito de incidencias: recogida + acuse al usuario,
 * cada dos horas (vercel.json). Sin verificación ni parte: eso va en la diaria.
 *
 * Ruta propia y sin parámetros porque el cron con `?paso=acuse` no llegó a
 * correr (16-oct-2026, 00:15 UTC).
 *
 * A mano:  GET /api/cron/incidencias-acuse?simulacro=1   con `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { recoger } from '@/lib/incidencias/recogida';
import { acusar } from '@/lib/incidencias/acuse';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function autorizado(req: NextRequest): boolean {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return true;
    const clave = process.env.ADMIN_KEY;
    return !!clave && req.headers.get('x-admin-key') === clave;
}

export async function GET(req: NextRequest) {
    if (!autorizado(req)) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
    const simulacro = req.nextUrl.searchParams.get('simulacro') === '1';
    const cliente = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
    try {
        const recogida = await recoger();
        const resend = simulacro ? null : new Resend(process.env.RESEND_API_KEY!);
        const remitente = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';
        const acuses = await acusar(cliente, resend, remitente, simulacro);
        return NextResponse.json({ simulacro, recogida, acuses });
    } catch (e) {
        const mensaje = e instanceof Error ? e.message : String(e);
        console.error('❌ incidencias-acuse:', mensaje);
        return NextResponse.json({ error: mensaje }, { status: 500 });
    }
}
