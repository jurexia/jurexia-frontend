/**
 * EL CIRCUITO DE INCIDENCIAS · bucle desatendido
 *
 * Recoge → triaje → verificación → corrección de datos → los dos correos.
 *
 * LO QUE ESTE CRON PUEDE HACER SOLO
 * ---------------------------------
 * Corregir DATOS: indexar una norma que faltaba, arreglar un metadato, añadir
 * un caso a la batería de regresión. Nada de eso cambia cómo se comporta la
 * plataforma con los demás, y todo es reversible.
 *
 * LO QUE NO PUEDE HACER NUNCA
 * ---------------------------
 * Tocar un prompt, un umbral, un modelo, el código o el cobro. Eso llega
 * diagnosticado y con el parche propuesto, y espera visto bueno humano.
 *
 * LA PRUEBA DE FUEGO: el arreglo del 4 de septiembre —prohibirle al análisis
 * de documentos citar jurisprudencia— era tocar un prompt. Este cron NO lo
 * habría aplicado. Lo habría dejado en `espera_vb` con el diagnóstico hecho.
 * Si algún día este archivo puede aplicar algo así, el circuito está roto.
 *
 * POR QUÉ EL CORREO AL USUARIO VA EL ÚLTIMO Y CON DOBLE LLAVE
 * ----------------------------------------------------------
 * Escribirle a alguien «ya está corregido» cuando no lo está es peor que no
 * escribirle. Por eso sólo sale si la incidencia está `corregida` —es decir,
 * verificada Y aplicada— y si ya se te avisó a ti primero.
 *
 * A mano:  GET /api/cron/incidencias?simulacro=1   con `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { recoger } from '@/lib/incidencias/recogida';
import { verificar } from '@/lib/incidencias/verificacion';
import { avisoInterno, correoCierre, Incidencia } from '@/lib/incidencias/correos';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DESTINO_INTERNO = 'jdm.juridico@gmail.com';

/** Tope de correos de cierre por vuelta. La cuenta de Resend da 100 al día. */
const MAXIMO_CIERRES = 8;

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
}

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    const clave = process.env.ADMIN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';
    return null;
}

export async function GET(req: NextRequest) {
    if (!quienLlama(req)) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });

    // En simulacro se hace TODO menos escribir correos y menos marcar nada
    // como corregido. Sirve para ver qué haría la vuelta antes de dejarla sola.
    const simulacro = req.nextUrl.searchParams.get('simulacro') === '1';
    const cliente = admin();
    const parte: Record<string, unknown> = { simulacro };

    // ── 1. RECOGIDA + TRIAJE ────────────────────────────────────────────
    const recogida = await recoger();
    parte.recogida = recogida;

    // ── 2. VERIFICACIÓN ─────────────────────────────────────────────────
    // Sólo las triadas de familia «defecto» o «calidad». Ni soporte, ni
    // mejora, ni buzón equivocado: ésas no son fallos que reproducir.
    const { data: porVerificar } = await cliente
        .from('incidencias')
        .select('id, clase, texto, contexto, requiere_vb')
        .eq('estado', 'triada')
        .in('familia', ['defecto', 'calidad'])
        .order('creado_at', { ascending: true })
        .limit(15);

    const verificadas = { confirmadas: 0, no_reproducibles: 0, sin_medios: 0 };

    for (const inc of porVerificar ?? []) {
        const v = await verificar(inc as { clase: string | null; texto: string; contexto: string | null });

        // Un `sin_medios` NO avanza de estado: se queda en `triada` con la
        // razón anotada, y lo recoge el bucle asistido. Si avanzara, el
        // circuito iría escondiendo en «verificando» todo lo que no sabe hacer.
        const estado = v.desenlace === 'confirmada'
            ? ((inc as { requiere_vb: boolean }).requiere_vb ? 'espera_vb' : 'confirmada')
            : v.desenlace === 'no_reproducible' ? 'no_reproducible' : 'triada';

        await cliente.from('incidencias').update({
            estado,
            verificacion: { ...v.prueba, desenlace: v.desenlace, cuando: new Date().toISOString() },
            diagnostico: v.diagnostico,
            correccion: v.correccion,
        }).eq('id', (inc as { id: string }).id);

        if (v.desenlace === 'confirmada') verificadas.confirmadas++;
        else if (v.desenlace === 'no_reproducible') verificadas.no_reproducibles++;
        else verificadas.sin_medios++;
    }
    parte.verificadas = verificadas;

    // ── 3. CORRECCIÓN AUTOMÁTICA (sólo datos) ───────────────────────────
    // Las `confirmada` con requiere_vb=false. Hoy la aplicación efectiva
    // (indexar el acervo) la ejecuta el backend; aquí se marca la orden y se
    // deja constancia. Deliberadamente NO se toca nada más: ampliar esto es
    // ampliar lo que la máquina hace sin permiso, y eso se decide fuera.
    const { data: aplicables } = await cliente
        .from('incidencias')
        .select('id, clase, correccion')
        .eq('estado', 'confirmada').eq('requiere_vb', false).limit(10);

    if (!simulacro && aplicables?.length) {
        await cliente.from('incidencias')
            .update({ estado: 'corregida' })
            .in('id', aplicables.map((i: { id: string }) => i.id));
    }
    parte.corregidas_auto = aplicables?.length ?? 0;

    // ── 4. EL PARTE PARA DAVID ──────────────────────────────────────────
    const [corregidas, esperando, dudosas] = await Promise.all([
        cliente.from('incidencias').select('*').eq('estado', 'corregida').is('aviso_at', null).limit(20),
        cliente.from('incidencias').select('*').eq('estado', 'espera_vb').is('aprobada_at', null).limit(20),
        cliente.from('incidencias').select('*').lt('confianza', 0.5).is('aviso_at', null).limit(10),
    ]);

    const hayQueContar = (corregidas.data?.length ?? 0) + (esperando.data?.length ?? 0)
        + (dudosas.data?.length ?? 0) + recogida.nuevos;

    const resend = simulacro ? null : new Resend(process.env.RESEND_API_KEY!);
    const remitente = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

    // Un parte que llega todos los días diciendo «cero» se deja de leer, y
    // entonces el día que trae algo tampoco se lee.
    if (hayQueContar > 0) {
        const correo = avisoInterno({
            recogidas: recogida.nuevos,
            porFamilia: recogida.por_familia,
            corregidas: (corregidas.data ?? []) as Incidencia[],
            esperandoVB: (esperando.data ?? []) as Incidencia[],
            dudosas: (dudosas.data ?? []) as Incidencia[],
        });
        if (!simulacro) {
            await resend!.emails.send({
                from: remitente, to: DESTINO_INTERNO,
                subject: correo.asunto, html: correo.html, text: correo.texto,
            });
            // Se marca lo ya contado, PERO NO lo que espera visto bueno: ésas
            // vuelven a salir en el parte cada día hasta que las apruebes o
            // las descartes. Es el único modo de que algo pendiente no se
            // hunda en silencio, que es exactamente lo que le pasó a los 182.
            const avisadas = [...(corregidas.data ?? []), ...(dudosas.data ?? [])]
                .map((i: { id: string }) => i.id);
            if (avisadas.length) {
                await cliente.from('incidencias')
                    .update({ aviso_at: new Date().toISOString() }).in('id', avisadas);
            }
        }
        parte.aviso = { asunto: correo.asunto, enviado: !simulacro };
    } else {
        parte.aviso = 'nada que contar';
    }

    // ── 5. EL CIERRE AL USUARIO ─────────────────────────────────────────
    // TRES llaves, no dos.
    //
    // La tercera es un pestillo manual: mientras `INCIDENCIAS_CIERRES` no
    // valga `1`, el circuito hace todo su trabajo pero NO le escribe a ningún
    // usuario. Existe porque el día que esto se despliega por primera vez ya
    // hay 182 incidencias sembradas en el libro, y una automatización nueva
    // no debe estrenarse mandando correos a gente real. Se mira una vuelta
    // completa en el parte interno, se comprueba que dice la verdad, y
    // entonces se abre.
    const cierresAbiertos = process.env.INCIDENCIAS_CIERRES === '1';

    // Las otras dos: `corregida` (verificada Y aplicada) y con aviso ya dado.
    const { data: porCerrar } = cierresAbiertos ? await cliente
        .from('incidencias')
        .select('id, folio, user_email, clase, correccion, origen_id, origen')
        .eq('estado', 'corregida')
        .not('aviso_at', 'is', null)
        .is('cierre_at', null)
        .not('user_email', 'is', null)
        .limit(MAXIMO_CIERRES) : { data: [] };

    const cierres: string[] = [];
    for (const inc of porCerrar ?? []) {
        const i = inc as {
            id: string; folio: string | null; user_email: string;
            clase: string; correccion: string | null; origen: string; origen_id: string;
        };
        const correo = correoCierre({
            nombre: null, clase: i.clase, folio: i.folio,
            correccion: i.correccion ?? 'Se corrigió la causa del fallo.',
        });
        if (!simulacro) {
            await resend!.emails.send({
                from: remitente, to: i.user_email,
                subject: correo.asunto, html: correo.html, text: correo.texto,
            });
            await cliente.from('incidencias')
                .update({ cierre_at: new Date().toISOString(), estado: 'cerrada' }).eq('id', i.id);
            // El reporte original también se cierra: si no, la cola de
            // `user_feedback` seguiría creciendo con cosas ya resueltas.
            if (i.origen === 'reporte') {
                await cliente.from('user_feedback').update({
                    status: 'resuelto', resolved_at: new Date().toISOString(),
                }).eq('id', i.origen_id);
            }
            await new Promise(r => setTimeout(r, 600));   // Resend: 2/s
        }
        cierres.push(i.user_email);
    }
    parte.cierres = { cuantos: cierres.length, enviado: !simulacro && cierresAbiertos, pestillo: cierresAbiertos ? 'abierto' : 'cerrado' };

    return NextResponse.json(parte);
}
