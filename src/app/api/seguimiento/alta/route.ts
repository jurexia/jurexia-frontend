/**
 * Alta de un expediente en seguimiento.
 *
 * Dos pasos, y el segundo existe por una razón concreta: el mismo número vive
 * en muchos órganos a la vez. El 71/2026 existe en Baja California Y en
 * Querétaro, con NEUN distintos y partes distintas. Por eso no se da de alta a
 * ciegas: primero se consulta el portal y se le enseña al abogado la carátula
 * real —órgano, NEUN, últimos acuerdos— y sólo cuando dice «sí, es este» se
 * guarda.
 *
 *   POST { accion: 'consultar', organismo, expediente, tipo_asunto }
 *        → la carátula y los últimos acuerdos, sin guardar nada
 *
 *   POST { accion: 'confirmar', organismo, expediente, tipo_asunto, alias }
 *        → crea el seguimiento y guarda TODO el histórico como línea base
 *
 * LA LÍNEA BASE ES LO QUE EVITA EL DESASTRE DEL PRIMER DÍA. Sin ella, el primer
 * barrido vería años de acuerdos como novedades y mandaría un correo con
 * cuarenta actuaciones. Todo lo anterior al alta entra marcado y callado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { leer, urlDe, ErrorFormato, ErrorNoEncontrado } from '@/lib/seguimiento/pjf';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function servicio() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

/** Quién pide el alta. El token viene de la sesión del navegador; si no es
 *  válido, no se crea nada a nombre de nadie. */
async function usuarioDe(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await db.auth.getUser(token);
    return data?.user ?? null;
}

export async function POST(req: NextRequest) {
    const user = await usuarioDe(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión para continuar' },
                                        { status: 401 });

    const cuerpo = await req.json().catch(() => ({}));
    const { accion, organismo, expediente, alias } = cuerpo;
    const tipoAsunto = cuerpo.tipo_asunto || 1;
    const tipoProc = cuerpo.tipo_procedimiento || 0;

    if (!organismo || !expediente) {
        return NextResponse.json({ error: 'Faltan el órgano y el número' },
                                 { status: 400 });
    }
    if (!/^\d{1,6}\s*\/\s*\d{4}$/.test(String(expediente))) {
        return NextResponse.json(
            { error: 'El número va como «71/2026»: número, barra y año.' },
            { status: 400 });
    }

    const db = servicio();
    const { data: organos } = await db.from('seg_organos')
        .select('*').eq('clave_externa', String(organismo))
        .eq('jurisdiccion', 'PJF').limit(1);
    const organo = organos?.[0];
    if (!organo) return NextResponse.json({ error: 'Ese órgano no está en el catálogo' },
                                          { status: 400 });

    // ── Consultar el portal ──
    let lectura;
    try {
        lectura = await leer(organismo, expediente, tipoAsunto, tipoProc);
    } catch (e) {
        if (e instanceof ErrorNoEncontrado) {
            // El texto viene del propio portal y es el más útil que se le puede
            // enseñar: dice si falla el número, el órgano o el tipo de asunto.
            return NextResponse.json({ error: e.message, tipo: 'no_encontrado' },
                                     { status: 404 });
        }
        if (e instanceof ErrorFormato) {
            return NextResponse.json(
                { error: 'El portal del Consejo respondió de una forma que no '
                       + 'reconocemos. Inténtalo en unos minutos.', tipo: 'formato' },
                { status: 502 });
        }
        return NextResponse.json(
            { error: 'No se pudo consultar el portal del Consejo ahora mismo.',
              tipo: 'red' }, { status: 502 });
    }

    if (accion !== 'confirmar') {
        return NextResponse.json({
            caratula: lectura.caratula,
            organo: organo.nombre,
            n_acuerdos: lectura.acuerdos.length,
            ultimos: lectura.acuerdos.slice(-3).reverse().map(a => ({
                fecha_auto: a.fecha_auto, cuaderno: a.cuaderno,
                resumen: a.resumen.slice(0, 220),
            })),
            url: lectura.url,
        });
    }

    // ── Confirmar y guardar ──
    const { data: seg, error } = await db.from('seg_expedientes_seguidos')
        .insert({
            user_id: user.id, organo_id: organo.id, numero: String(expediente),
            anio: Number(String(expediente).split('/')[1]) || null,
            tipo_asunto_clave: String(tipoAsunto),
            tipo_procedimiento_clave: String(tipoProc),
            neun: lectura.caratula.neun,
            alias: (alias || '').trim() || String(expediente),
            modo: 'automatico',
            correo_aviso: user.email,
            linea_base_en: new Date().toISOString(),
        })
        .select().single();

    if (error) {
        const repetido = error.code === '23505';
        return NextResponse.json({
            error: repetido
                ? 'Ya sigues ese expediente en ese órgano.'
                : 'No se pudo guardar el seguimiento.',
        }, { status: repetido ? 409 : 500 });
    }

    const ahora = new Date().toISOString();
    if (lectura.acuerdos.length) {
        await db.from('seg_actuaciones').insert(lectura.acuerdos.map(a => ({
            seguimiento_id: seg.id, user_id: user.id,
            huella_clave: a.huella_clave, huella_texto: a.huella_texto,
            cuaderno: a.cuaderno, fecha_auto: a.fecha_auto,
            fecha_publicacion: a.fecha_publicacion,
            orden_en_lista: a.orden_en_lista, resumen: a.resumen,
            url_fuente: lectura.url, origen: 'pjf_vercaptura', version: 1,
            // Marcadas y avisadas: el histórico NUNCA genera correo.
            es_linea_base: true, avisada_en: ahora,
        })));
    }

    return NextResponse.json({
        ok: true, seguimiento_id: seg.id,
        guardadas: lectura.acuerdos.length,
        organo: organo.nombre,
        url_manual: urlDe(organismo, expediente, tipoAsunto, tipoProc),
    });
}
