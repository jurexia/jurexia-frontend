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
 *   POST { accion: 'consultar', organismo, expediente, tipo_asunto? }
 *        → la carátula y los últimos acuerdos, sin guardar nada
 *
 *   POST { accion: 'confirmar', organismo, expediente, tipo_asunto, alias }
 *        → crea el seguimiento y guarda TODO el histórico como línea base
 *
 * EL TIPO DE ASUNTO SE BUSCA, NO SE EXIGE. El portal del Consejo no indexa por
 * número: indexa por (órgano, tipo de asunto, número). El mismo 250/2026 de un
 * colegiado puede ser a la vez un amparo directo y una queja, y son asuntos
 * distintos. El abogado sabe su número y su tribunal; la taxonomía del Consejo
 * —«Revisión Contenciosa Administrativa», «Incidentes de Inejecución»— no tiene
 * por qué sabérsela. Así que si el tipo que eligió no da, se prueban los demás
 * de esa familia, uno por uno, y se le dice cuál era. Cada consulta tarda un
 * segundo; catorce tardan menos que una llamada al juzgado.
 *
 * Esto arregla el síntoma que reportó el usuario: «siempre dice que el
 * expediente no existe». Casi nunca era verdad. Era el tipo equivocado.
 *
 * LA LÍNEA BASE ES LO QUE EVITA EL DESASTRE DEL PRIMER DÍA. Sin ella, el primer
 * barrido vería años de acuerdos como novedades y mandaría un correo con
 * cuarenta actuaciones. Todo lo anterior al alta entra marcado y callado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    leer, urlDe, normalizaExpediente, ErrorFormato, ErrorNoEncontrado,
    type Lectura,
} from '@/lib/seguimiento/pjf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Cuántos tipos se prueban como mucho. La familia más larga —los colegiados—
 *  tiene catorce; a un segundo cada uno cabe de sobra en el minuto que da
 *  Vercel, pero el tope evita que un cambio del catálogo lo desborde. */
const MAX_TIPOS = 14;

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

const respiro = (ms: number) => new Promise(r => setTimeout(r, ms));

type Intento = { clave: string; nombre: string };

/**
 * Prueba tipos de asunto hasta que uno traiga el expediente.
 *
 * Un fallo que NO sea «no existe» —el portal caído, un formato que no
 * reconocemos— corta el barrido de inmediato: insistir catorce veces contra un
 * portal que no responde no ayuda a nadie y lo castiga.
 */
async function buscarPorTipos(
    organismo: string, expediente: string, tipos: Intento[],
): Promise<{ lectura: Lectura; tipo: Intento } | { probados: Intento[]; fatal?: Error }> {
    const probados: Intento[] = [];
    for (const t of tipos.slice(0, MAX_TIPOS)) {
        if (probados.length) await respiro(350);
        try {
            const lectura = await leer(organismo, expediente, t.clave, 0);
            return { lectura, tipo: t };
        } catch (e) {
            probados.push(t);
            if (!(e instanceof ErrorNoEncontrado)) {
                return { probados, fatal: e as Error };
            }
        }
    }
    return { probados };
}

export async function POST(req: NextRequest) {
    const user = await usuarioDe(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión para continuar' },
                                        { status: 401 });

    const cuerpo = await req.json().catch(() => ({}));
    const { accion, organismo, alias } = cuerpo;
    const expediente = normalizaExpediente(String(cuerpo.expediente ?? ''));
    const tipoPedido = String(cuerpo.tipo_asunto ?? '').trim();
    const tipoProc = cuerpo.tipo_procedimiento || 0;

    if (!organismo || !expediente) {
        return NextResponse.json({ error: 'Faltan el órgano y el número' },
                                 { status: 400 });
    }
    if (!/^\d{1,6}\/\d{4}$/.test(expediente)) {
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

    // Los tipos que conoce esa familia de órganos, en el orden en que se usan.
    const { data: catalogo } = await db.from('seg_tipos_asunto')
        .select('clave_externa,nombre')
        .eq('jurisdiccion', 'PJF')
        .eq('familia', organo.familia || 'juzgado_distrito')
        .order('orden');
    const todos: Intento[] = (catalogo ?? []).map(
        (t: { clave_externa: string; nombre: string }) =>
            ({ clave: String(t.clave_externa), nombre: t.nombre }));

    if (!todos.length) {
        return NextResponse.json(
            { error: 'No hay tipos de asunto en el catálogo para ese órgano.' },
            { status: 500 });
    }

    // El elegido primero; los demás detrás. Si no eligió ninguno —porque la
    // lista aún no había cargado cuando pulsó— se prueban todos en su orden
    // natural, en vez de asumir «Amparo Indirecto» y fallar en un colegiado.
    const elegido = todos.find(t => t.clave === tipoPedido);
    const orden = elegido ? [elegido, ...todos.filter(t => t !== elegido)] : todos;

    // Al confirmar NO se barre: el abogado ya vio la carátula de un tipo
    // concreto, y barrer otra vez podría guardarle un asunto distinto del que
    // aprobó.
    const aProbar = accion === 'confirmar' && elegido ? [elegido] : orden;

    const r = await buscarPorTipos(String(organismo), expediente, aProbar);

    if (!('lectura' in r)) {
        const primera = urlDe(organismo, expediente, aProbar[0].clave, tipoProc);
        if (r.fatal instanceof ErrorFormato) {
            return NextResponse.json({
                error: 'El portal del Consejo respondió de una forma que no '
                     + 'reconocemos. No es que tu expediente no exista: es que '
                     + 'ahora mismo no podemos leer el portal. Inténtalo en unos '
                     + 'minutos.',
                tipo: 'formato', detalle: r.fatal.message, url: primera,
            }, { status: 502 });
        }
        if (r.fatal) {
            return NextResponse.json({
                error: 'No se pudo hablar con el portal del Consejo ahora mismo.',
                tipo: 'red', url: primera,
            }, { status: 502 });
        }
        // Se probaron todos los tipos y ninguno lo trae. AHORA sí se puede
        // afirmar que no está, y decir además dónde se buscó.
        const nombres = r.probados.map(t => t.nombre);
        return NextResponse.json({
            error: `El portal no tiene el ${expediente} en ${organo.nombre}.`,
            tipo: 'no_encontrado',
            probados: nombres,
            detalle: nombres.length > 1
                ? `Se buscó como ${nombres.slice(0, -1).join(', ')} y `
                  + `${nombres[nombres.length - 1]}. Comprueba el número y el `
                  + 'órgano: el mismo número existe en muchos tribunales.'
                : `Se buscó como ${nombres[0]}.`,
            url: primera,
        }, { status: 404 });
    }

    const { lectura, tipo } = r;

    if (accion !== 'confirmar') {
        return NextResponse.json({
            caratula: lectura.caratula,
            organo: organo.nombre,
            expediente,
            tipo_asunto: tipo.clave,
            tipo_asunto_nombre: tipo.nombre,
            // Lo que permite decirle «no era un amparo directo: es una queja».
            corregido: !!elegido && elegido.clave !== tipo.clave,
            pedido_nombre: elegido?.nombre ?? null,
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
            user_id: user.id, organo_id: organo.id, numero: expediente,
            anio: Number(expediente.split('/')[1]) || null,
            tipo_asunto_clave: tipo.clave,
            tipo_procedimiento_clave: String(tipoProc),
            neun: lectura.caratula.neun,
            alias: (alias || '').trim() || expediente,
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
        tipo_asunto: tipo.clave,
        url_manual: urlDe(organismo, expediente, tipo.clave, tipoProc),
    });
}
