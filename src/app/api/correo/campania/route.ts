/**
 * Ejecuta las campañas de captación.
 *
 * Tres modos, y el orden entre ellos no es negociable:
 *
 *   revision  → manda una muestra de las CUATRO a jdm.juridico@gmail.com.
 *               Nada sale a usuarios reales hasta que David las apruebe.
 *   simulacro → cuenta a cuánta gente iría y por qué se omite al resto,
 *               sin enviar nada. Es el modo por defecto.
 *   real      → envía de verdad. Hay que pedirlo con `modo=real`.
 *
 * La autenticación es por cabecera y sin respaldo: sin ADMIN_CAMPAIGN_KEY
 * configurada, la ruta no corre. Va en cabecera y no en la query string
 * porque las URLs quedan en los logs de acceso y en el historial.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CAMPANIAS, type NombreCampania } from '@/lib/correo/campanias';
import { segmento } from '@/lib/correo/segmentos';
import { ADMINS, enviarCampania, type Destinatario } from '@/lib/correo/enviar';

export const maxDuration = 300;

const REVISOR = 'jdm.juridico@gmail.com';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

function autorizado(req: NextRequest): boolean {
    const esperada = process.env.ADMIN_CAMPAIGN_KEY;
    if (!esperada) return false; // sin clave configurada, nadie entra
    const dada = req.headers.get('x-admin-key') ?? '';
    // Comparación de longitud fija para no filtrar la clave por tiempos.
    if (dada.length !== esperada.length) return false;
    let dif = 0;
    for (let i = 0; i < esperada.length; i++) dif |= dada.charCodeAt(i) ^ esperada.charCodeAt(i);
    return dif === 0;
}


/** Muestra de todas las campañas al revisor, con datos de ejemplo. */
async function mandarARevision(soloEstas?: string[]) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const remitente = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

    /* CON SU PERFIL DE VERDAD (18-sep-2026). La muestra llevaba datos
       inventados y `id: null`, así que las plantillas que dependen del perfil
       —el enlace de invitación, el código, el plan contratado y con él lo que
       ese plan incluye— se veían vacías o genéricas en la revisión y
       completas en el envío real. Se revisa lo que se va a mandar. */
    let ejemplo: Destinatario = {
        id: null,
        email: REVISOR,
        full_name: 'David Alcantar',
        estado: 'OAXACA',
        queries_used: 5,
    };
    const { data: perfil } = await admin()
        .from('user_profiles')
        .select('id, email, full_name, estado, queries_used, tratamiento, subscription_type')
        .eq('email', REVISOR)
        .maybeSingle();
    if (perfil) ejemplo = perfil as Destinatario;

    const salidas: { campania: string; asunto: string; enviado: boolean; error?: string }[] = [];

    // Se puede pedir una o dos campañas concretas. Sin filtro van todas, que
    // es lo que hacía antes: mandarle seis correos a David cuando sólo quiere
    // ver una convierte la revisión en ruido y deja de revisarse.
    for (const [nombre, def] of Object.entries(CAMPANIAS)) {
        if (soloEstas?.length && !soloEstas.includes(nombre)) continue;
        const correo = def.construir(ejemplo);
        const { error } = await resend.emails.send({
            from: remitente,
            to: REVISOR,
            subject: `[REVISIÓN — ${def.etiqueta}] ${correo.asunto}`,
            html: correo.html,
            text: correo.texto,
        });
        salidas.push({
            campania: nombre,
            asunto: correo.asunto,
            enviado: !error,
            error: error?.message,
        });
        await new Promise((r) => setTimeout(r, 600));
    }

    return salidas;
}

export async function POST(req: NextRequest) {
    if (!autorizado(req)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const modo = req.nextUrl.searchParams.get('modo') ?? 'simulacro';
    const cual = req.nextUrl.searchParams.get('campania') as NombreCampania | null;
    const maximo = Number(req.nextUrl.searchParams.get('maximo') ?? 500);

    try {
        if (modo === 'revision') {
            // ?campania=a,b limita la muestra a esas campañas.
            const filtro = (req.nextUrl.searchParams.get('campania') ?? '')
                .split(',').map(s => s.trim()).filter(Boolean);
            return NextResponse.json({
                modo: 'revision',
                revisor: REVISOR,
                nota: 'Muestras enviadas. Ninguna salió a usuarios reales.',
                muestras: await mandarARevision(filtro),
            });
        }

        if (!cual || !(cual in CAMPANIAS)) {
            return NextResponse.json(
                { error: `campania debe ser una de: ${Object.keys(CAMPANIAS).join(', ')}` },
                { status: 400 },
            );
        }

        const destinatarios = await segmento(cual);

        // Igual que el cron: el enlace de invitación apunta a un código que
        // tiene que estar GUARDADO antes de enviar, o el referido se pierde.
        if ((cual === 'referidos' || cual === 'actualizacion') && modo === 'real') {
            const { asegurarCodigo } = await import('@/lib/referidos-backend');
            await Promise.all(
                destinatarios.filter(d => d.id).map(d => asegurarCodigo(d.id as string).catch(() => null)),
            );
        }

        // `entregar` (ISO 8601): hora a la que Resend soltará los correos.
        // Futura y a no más de 30 días, que es el límite de Resend.
        const entregar = req.nextUrl.searchParams.get('entregar');
        let programadoPara: string | undefined;
        if (entregar) {
            const t = Date.parse(entregar);
            if (Number.isNaN(t) || t <= Date.now() + 60_000 || t > Date.now() + 30 * 86400_000) {
                return NextResponse.json(
                    { error: 'entregar debe ser una fecha ISO futura, a no más de 30 días' },
                    { status: 400 },
                );
            }
            programadoPara = new Date(t).toISOString();
        }

        /* UNO A UNO CUANDO IMPORTA LA BANDEJA (18-sep-2026). `lote=1&pausa=4000`
           manda un correo cada cuatro segundos en vez de cien de golpe: más
           lento, pero sin la ráfaga que los filtros leen como envío masivo. La
           corrida se corta a los 280 s —la función muere a los 300— y lo que
           falte sale en la siguiente llamada, sin repetir a nadie: la bitácora
           lo impide. */
        const lote = Math.max(1, Math.min(100, Number(req.nextUrl.searchParams.get('lote') ?? 100)));
        const pausaMs = Math.max(0, Math.min(30_000, Number(req.nextUrl.searchParams.get('pausa') ?? 600)));

        const resultado = await enviarCampania({
            campania: cual,
            destinatarios,
            construir: CAMPANIAS[cual].construir,
            simulacro: modo !== 'real',
            maximo,
            programadoPara,
            lote,
            pausaMs,
            plazoHasta: Date.now() + 280_000,
        });

        return NextResponse.json(resultado);
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
        );
    }
}

/** Diagnóstico: tamaño de cada segmento sin enviar ni tocar nada. */
export async function GET(req: NextRequest) {
    if (!autorizado(req)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const resumen: Record<string, number> = {};
    for (const nombre of Object.keys(CAMPANIAS) as NombreCampania[]) {
        resumen[nombre] = (await segmento(nombre)).length;
    }
    const { count } = await admin()
        .from('correo_bajas')
        .select('email', { count: 'exact', head: true });
    return NextResponse.json({ segmentos: resumen, bajas: count ?? 0 });
}
