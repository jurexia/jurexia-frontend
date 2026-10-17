/**
 * EL CIRCUITO DE INCIDENCIAS · bucle desatendido
 *
 * Recoge → triaje → acuse al usuario → verificación → corrección de datos →
 * el parte y el cierre.
 *
 * `?paso=acuse` corre sólo recogida + acuse: es la vuelta ligera que el cron
 * dispara cada dos horas para que nadie espere un día a saber que se le leyó.
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
import { avisoInterno, correoAcuse, correoCierre, Incidencia, SIN_ACUSE } from '@/lib/incidencias/correos';
import { esPrueba } from '@/lib/correo/segmentos';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DESTINO_INTERNO = 'jdm.juridico@gmail.com';

/** Tope de correos de cierre por vuelta. La cuenta de Resend da 100 al día. */
const MAXIMO_CIERRES = 8;

/** Tope de acuses por vuelta: el atraso de septiembre se reparte en varias. */
const MAXIMO_ACUSES = 30;

/** Lo más viejo que todavía recibe acuse. Un «lo recibimos» de hace dos meses ya no ayuda. */
const DIAS_ACUSE = 30;

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

    const resend = simulacro ? null : new Resend(process.env.RESEND_API_KEY!);
    const remitente = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

    // ── 1b. EL ACUSE AL USUARIO ─────────────────────────────────────────
    // David, 16-oct-2026: «si falla hay que darles la razón, y si hay tema de
    // leyes se revisará con su reporte». Sale en la vuelta siguiente al
    // reporte, una sola vez (`acuse_at`), y NO depende de que se verifique
    // nada: decir «lo recibimos y esto sigue» es verdad desde el primer
    // minuto. Interruptor: INCIDENCIAS_ACUSES_PAUSA=1.
    parte.acuses = await acusar(cliente, resend, remitente, simulacro);

    if (req.nextUrl.searchParams.get('paso') === 'acuse') return NextResponse.json(parte);

    // ── 2. VERIFICACIÓN ─────────────────────────────────────────────────
    // Sólo las triadas de familia «defecto» o «calidad». Ni soporte, ni
    // mejora, ni buzón equivocado: ésas no son fallos que reproducir.
    const { data: porVerificar } = await cliente
        .from('incidencias')
        .select('id, clase, texto, contexto, requiere_vb, estado_usuario')
        .eq('estado', 'triada')
        .in('familia', ['defecto', 'calidad'])
        .order('creado_at', { ascending: true })
        .limit(15);

    const verificadas = { confirmadas: 0, no_reproducibles: 0, sin_medios: 0 };

    for (const inc of porVerificar ?? []) {
        const v = await verificar(inc as {
            clase: string | null; texto: string; contexto: string | null;
            estado_usuario: string | null;
        });

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

async function acusar(
    cliente: ReturnType<typeof admin>,
    resend: Resend | null,
    remitente: string,
    simulacro: boolean,
): Promise<Record<string, unknown>> {
    if (process.env.INCIDENCIAS_ACUSES_PAUSA === '1') return { pausado: true };

    const desde = new Date(Date.now() - DIAS_ACUSE * 86400_000).toISOString();
    const { data, error } = await cliente
        .from('incidencias')
        .select('id, folio, user_email, familia, clase, confianza, creado_at')
        .is('acuse_at', null)
        .is('cierre_at', null)
        .not('user_email', 'is', null)
        .not('familia', 'in', `(${[...SIN_ACUSE].join(',')})`)
        .gte('creado_at', desde)
        .order('creado_at', { ascending: false })
        .limit(MAXIMO_ACUSES * 3);
    if (error) return { error: error.message };

    // Uno por persona y vuelta: quien mandó cinco mensajes seguidos sobre lo
    // mismo recibe UN acuse, no cinco. Los demás se marcan con el mismo sello.
    type Fila = { id: string; folio: string | null; user_email: string; familia: string;
        clase: string; confianza: number | null; creado_at: string };
    const porPersona = new Map<string, Fila[]>();
    for (const f of (data ?? []) as Fila[]) {
        const e = f.user_email.trim().toLowerCase();
        // Triaje con poca confianza: lo mira un humano antes, no se le escribe a ciegas.
        if (esPrueba(e) || (f.confianza ?? 1) < 0.5) continue;
        porPersona.set(e, [...(porPersona.get(e) ?? []), f]);
    }

    const correos = [...porPersona.keys()].slice(0, MAXIMO_ACUSES);
    const perfiles = new Map<string, { full_name: string | null; tratamiento: string | null }>();
    if (correos.length) {
        const { data: ps } = await cliente.from('user_profiles')
            .select('email, full_name, tratamiento').in('email', correos);
        for (const p of (ps ?? []) as Array<{ email: string; full_name: string | null; tratamiento: string | null }>) {
            perfiles.set(p.email.toLowerCase(), p);
        }
    }

    const enviados: Array<{ clase: string; folio: string | null; dias: number }> = [];
    const errores: string[] = [];
    for (const email of correos) {
        const filas = porPersona.get(email)!;
        // De varias, la que más pesa: un fallo manda sobre una duda de ley,
        // y ésta sobre una pregunta de soporte.
        const orden = ['defecto', 'calidad', 'soporte', 'mejora'];
        const principal = [...filas].sort((a, b) => orden.indexOf(a.familia) - orden.indexOf(b.familia))[0];
        const masVieja = filas.reduce((m, f) => (f.creado_at < m ? f.creado_at : m), principal.creado_at);
        const dias = Math.floor((Date.now() - new Date(masVieja).getTime()) / 86400_000);
        const p = perfiles.get(email);
        const correo = correoAcuse({
            nombre: p?.full_name ?? null, email, tratamiento: p?.tratamiento ?? null,
            familia: principal.familia, clase: principal.clase, folio: principal.folio,
            diasDeRetraso: dias,
        });
        if (!simulacro) {
            const { error: e } = await resend!.emails.send({
                from: remitente, to: email, replyTo: 'soporte@iurexia.com',
                subject: correo.asunto, html: correo.html, text: correo.texto,
            });
            if (e) { errores.push(`${principal.folio ?? principal.id}: ${e.message}`); continue; }
            await cliente.from('incidencias')
                .update({ acuse_at: new Date().toISOString() })
                .in('id', filas.map(f => f.id));
            await new Promise(r => setTimeout(r, 600));   // Resend: 2/s
        }
        enviados.push({ clase: principal.clase, folio: principal.folio, dias });
    }

    return {
        cuantos: enviados.length,
        enviado: !simulacro,
        por_familia: enviados.reduce<Record<string, number>>((m, x) => {
            const fam = x.clase.split('/')[0]; m[fam] = (m[fam] ?? 0) + 1; return m;
        }, {}),
        pendientes_tras_vuelta: Math.max(0, porPersona.size - correos.length),
        errores,
    };
}
