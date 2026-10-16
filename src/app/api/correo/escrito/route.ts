/**
 * ENVIAR EL ESCRITO POR CORREO, CON APROBACIÓN (16-oct-2026).
 *
 *   GET                                          → quién firma, desde qué dirección
 *        sale, a quién responde el cliente y cuántos envíos le quedan hoy
 *   POST { accion: 'proponer', titulo, texto, destinatario?, adjunto? }
 *        → { asunto, mensaje }                   (gasta un cambio de «redaccion»)
 *   POST { accion: 'enviar', para[], copia_para_mi, asunto, mensaje,
 *          adjunto?: { nombre, base64 }, expediente_id?, clave? }
 *        → { ok, id, enviado_at }                (gasta un «correo»)
 *
 * El correo sale de la cuenta de Resend de Iurexia («{Nombre} vía Iurexia»
 * <escritos@iurexia.com>) con «responder a» el abogado: la respuesta de su
 * cliente le llega a él. Su Gmail u Outlook propio queda para después (pide la
 * verificación de Google).
 *
 * Aquí sólo se identifica al abogado y se conecta con Supabase, Resend y el
 * modelo. El orden —validar todo, gastar, reservar el renglón, mirar el cupo,
 * enviar— vive en `@/lib/correo/escrito-envio`, que se comprueba sin red.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { servicio, solicitanteDe, type Solicitante } from '@/lib/servidor/peticion';
import { gastarUso } from '@/lib/servidor/uso';
import { completar, jsonDe } from '@/lib/servidor/modelo';
import { LIMITES, escalonDe, type FuncionDespacho } from '@/lib/uso-funciones-config';
import { consumoDelCupo } from '@/lib/correo/cupo';
import { datosDeEnvio, enviarEscrito, proponerMensaje, type Abogado } from '@/lib/correo/escrito-envio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SIN_SESION = { error: 'Inicia sesión para continuar.' };

/* El correo de la cuenta (el de Supabase Auth) y no el del perfil: es el que
   está confirmado, y a él irán la respuesta del cliente y la copia. */
function abogadoDe(s: Solicitante): Abogado {
    return {
        id: s.user.id,
        plan: s.plan,
        nombre: s.nombre,
        correo: s.user.email || s.correo,
        correoConfirmado: !!s.user.email && !!s.user.email_confirmed_at,
    };
}

/* El día de `uso_funciones` es el de la Ciudad de México (ver la migración). */
function diaDeMexico(ahora = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(ahora);
}

async function usadosHoy(db: SupabaseClient, userId: string, funcion: FuncionDespacho): Promise<number | null> {
    const { data, error } = await db.from('uso_funciones').select('n')
        .eq('user_id', userId).eq('funcion', funcion).eq('dia', diaDeMexico()).maybeSingle();
    if (error) return null;
    return Number(data?.n ?? 0);
}

/* Devuelve la unidad que se gastó para algo que al final no salió. Sin la
   función atómica de la base: si dos envíos del mismo abogado se cruzan, la
   condición sobre `n` hace que uno no devuelva, nunca que devuelva de más. */
async function devolverUso(db: SupabaseClient, userId: string, funcion: FuncionDespacho): Promise<void> {
    const dia = diaDeMexico();
    const { data } = await db.from('uso_funciones').select('n')
        .eq('user_id', userId).eq('funcion', funcion).eq('dia', dia).maybeSingle();
    const n = Number(data?.n ?? 0);
    if (n <= 0) return;
    await db.from('uso_funciones').update({ n: n - 1 })
        .eq('user_id', userId).eq('funcion', funcion).eq('dia', dia).eq('n', n);
}

export async function GET(req: NextRequest) {
    const s = await solicitanteDe(req);
    if (!s) return NextResponse.json(SIN_SESION, { status: 401 });
    const a = abogadoDe(s);
    const usados = LIMITES.correo.por[escalonDe(a.plan)] > 0 ? await usadosHoy(servicio(), a.id, 'correo') : null;
    return NextResponse.json(datosDeEnvio(a, process.env.CORREO_ESCRITOS_FROM, usados), {
        headers: { 'Cache-Control': 'no-store' },
    });
}

export async function POST(req: NextRequest) {
    const s = await solicitanteDe(req);
    if (!s) return NextResponse.json(SIN_SESION, { status: 401 });

    let cuerpo: unknown;
    try { cuerpo = await req.json(); }
    catch { return NextResponse.json({ error: 'La petición no llegó completa. Vuelve a intentarlo.' }, { status: 400 }); }
    const accion = cuerpo && typeof cuerpo === 'object' ? (cuerpo as { accion?: unknown }).accion : undefined;

    const a = abogadoDe(s);
    const db = servicio();
    const gastar = (f: FuncionDespacho) => gastarUso(a.id, a.plan, f);
    const devolver = (f: FuncionDespacho) => devolverUso(db, a.id, f);

    if (accion === 'proponer') {
        const r = await proponerMensaje(a, cuerpo, { gastar, devolver, completar, jsonDe });
        if (r.status !== 200) console.warn('✉️ escrito: propuesta', { usuario: a.id.slice(0, 8), status: r.status, codigo: r.cuerpo.codigo ?? null });
        return NextResponse.json(r.cuerpo, { status: r.status });
    }

    if (accion === 'enviar') {
        const llave = process.env.RESEND_API_KEY;
        const r = await enviarEscrito(a, cuerpo, {
            gastar,
            devolver,
            carpetaEsSuya: async (id) => {
                const { data, error } = await db.from('expedientes').select('id')
                    .eq('id', id).eq('user_id', a.id).maybeSingle();
                return !error && !!data;
            },
            reservar: async (fila) => {
                const { data, error } = await db.from('correos_abogado')
                    .insert({ ...fila, user_id: a.id, estado: 'enviando' })
                    .select('id').single();
                if (error || !data) { console.error('✉️ escrito: no se pudo escribir el renglón', error?.message); return null; }
                return { id: String(data.id) };
            },
            marcar: async (id, cambios) => {
                const { error } = await db.from('correos_abogado').update(cambios).eq('id', id).eq('user_id', a.id);
                if (error) console.error('✉️ escrito: no se pudo marcar el renglón', id, error.message);
            },
            consumo: () => consumoDelCupo(db),
            hayLlave: !!llave,
            enviar: async (correo, idempotencia) => {
                const { data, error } = await new Resend(llave).emails.send(correo, { idempotencyKey: idempotencia });
                if (error || !data?.id) return { error: error?.message || 'Resend no devolvió el id' };
                return { id: data.id };
            },
            remitente: process.env.CORREO_ESCRITOS_FROM,
        });
        // Sin correos ni contenido en el registro: sólo quién, cómo terminó y por qué.
        console.log('✉️ escrito: envío', {
            usuario: a.id.slice(0, 8), status: r.status, codigo: r.cuerpo.codigo ?? null,
            fila: r.cuerpo.id ?? null, destinatarios: Array.isArray(r.cuerpo.para) ? r.cuerpo.para.length : null,
        });
        return NextResponse.json(r.cuerpo, { status: r.status });
    }

    return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
}
