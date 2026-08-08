/**
 * La capa de datos del panel de administración.
 *
 * POR QUÉ SE REHIZO (8-ago-2026)
 * ------------------------------
 * El panel anterior pedía casi todo a `${API_URL}/admin/*` — es decir, a la
 * API de Render. Render duerme: un arranque en frío son decenas de segundos
 * con la pantalla en blanco, y eso ocurría al ABRIR el panel, que es
 * justamente cuando uno quiere ver un número rápido. Encima traía las 1,972
 * cuentas al navegador para filtrarlas ahí.
 *
 * Ahora todo sale de Supabase a través de esta ruta, que corre en Vercel:
 * sin arranque en frío y sin intermediario. La búsqueda y la paginación son
 * del lado del servidor — se piden 50 filas, no dos mil.
 *
 * Stripe es la excepción: las finanzas se leen de Stripe porque es la única
 * fuente que sabe lo que de verdad se cobró. Supabase sabe qué plan tiene
 * cada quien; Stripe sabe quién pagó.
 *
 * SEGURIDAD
 * ---------
 * Se exige un token de sesión válido Y que el correo esté en la lista de
 * administradores. Comprobar sólo el correo del cuerpo de la petición sería
 * dejar la puerta abierta a cualquiera que sepa escribir un JSON.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { esAdmin } from '@/lib/admins';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

/** Nadie entra sin sesión válida Y correo de administrador. */
async function guardia(req: NextRequest): Promise<{ email: string } | null> {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const { data } = await admin().auth.getUser(token);
    const email = data.user?.email?.toLowerCase();
    if (!esAdmin(email)) return null;
    return { email: email! };
}

const PLANES_PAGO = ['pro_monthly', 'pro_annual', 'platinum_monthly',
    'platinum_annual', 'basico_monthly', 'ultra_secretarios'];

// ── Secciones ───────────────────────────────────────────────────────────

/** El tablero de arriba: lo que se mira antes que nada. */
async function resumen() {
    const db = admin();
    const hoy = new Date(); const hace30 = new Date(hoy.getTime() - 30 * 864e5);
    const hace7 = new Date(hoy.getTime() - 7 * 864e5);

    const cuenta = async (f: (q: any) => any) => {
        const { count } = await f(db.from('user_profiles').select('id', { count: 'exact', head: true }));
        return count ?? 0;
    };

    const [total, pago, nuevos30, activos7, sinUsar, feedbackAbierto, vitrinaPend] = await Promise.all([
        cuenta((q: any) => q),
        cuenta((q: any) => q.in('subscription_type', PLANES_PAGO)),
        cuenta((q: any) => q.gte('created_at', hace30.toISOString())),
        cuenta((q: any) => q.gte('last_query_at', hace7.toISOString())),
        cuenta((q: any) => q.is('last_query_at', null)),
        db.from('user_feedback').select('id', { count: 'exact', head: true })
            .neq('status', 'resuelto').then((r: any) => r.count ?? 0),
        db.from('vitrina_autorizaciones').select('id', { count: 'exact', head: true })
            .eq('estado', 'pendiente').is('revocado_at', null).then((r: any) => r.count ?? 0),
    ]);

    // Reparto por plan, sin RPC: siete consultas de conteo son más baratas
    // que traerse 1,972 filas para agruparlas en el navegador.
    const planes: Record<string, number> = {};
    await Promise.all(['gratuito', ...PLANES_PAGO].map(async p => {
        planes[p] = await cuenta((q: any) => q.eq('subscription_type', p));
    }));

    return {
        total, pago, nuevos30, activos7, sinUsar, feedbackAbierto, vitrinaPend,
        planes,
        conversion: total ? Math.round((pago / total) * 1000) / 10 : 0,
        // La fuga real: quien se registra y jamás escribe una consulta. Es un
        // problema de ACTIVACIÓN, no de precio, y conviene tenerlo a la vista.
        fugaActivacion: total ? Math.round((sinUsar / total) * 1000) / 10 : 0,
    };
}

/** Cuentas, con búsqueda y paginación DEL LADO DEL SERVIDOR. */
async function cuentas(params: URLSearchParams) {
    const db = admin();
    const busca = (params.get('q') ?? '').trim();
    const plan = params.get('plan') ?? '';
    const pagina = Math.max(0, Number(params.get('pagina') ?? 0));
    const POR_PAGINA = 50;

    let q = db.from('user_profiles')
        .select('id, email, full_name, subscription_type, queries_used, queries_limit, ' +
                'estado, created_at, last_query_at, is_active, stripe_customer_id, ' +
                'email_verificado_at, codigo_referido', { count: 'exact' });

    if (busca) q = q.or(`email.ilike.%${busca}%,full_name.ilike.%${busca}%`);
    if (plan === 'pago') q = q.in('subscription_type', PLANES_PAGO);
    else if (plan) q = q.eq('subscription_type', plan);

    const { data, count } = await q
        .order('created_at', { ascending: false })
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

    return { filas: data ?? [], total: count ?? 0, pagina, porPagina: POR_PAGINA };
}

/** Una cuenta a fondo: todo lo que hace falta para atender un caso. */
async function cuenta(id: string) {
    const db = admin();
    const [perfil, convs, feedback, envios, premios, vitrina, referidos] = await Promise.all([
        db.from('user_profiles').select('*').eq('id', id).maybeSingle().then(r => r.data),
        db.from('conversations').select('id', { count: 'exact', head: true })
            .eq('user_id', id).then(r => r.count ?? 0),
        db.from('user_feedback').select('id, category, message, status, created_at')
            .eq('user_id', id).order('created_at', { ascending: false }).limit(10).then(r => r.data ?? []),
        db.from('correo_envios').select('campania, enviado_at, estado')
            .eq('usuario_id', id).order('enviado_at', { ascending: false }).limit(10).then(r => r.data ?? []),
        db.from('ascensos_referido').select('*').eq('usuario_id', id)
            .order('otorgado_at', { ascending: false }).then(r => r.data ?? []),
        db.from('vitrina_autorizaciones').select('*').eq('usuario_id', id).maybeSingle().then(r => r.data),
        db.from('referidos').select('ahijado_id, registrado_at, activado_at, suscrito_pro_at')
            .eq('padrino_id', id).then(r => r.data ?? []),
    ]);
    return { perfil, convs, feedback, envios, premios, vitrina, referidos };
}

/** Campañas: qué salió, a cuántos y cuántos se dieron de baja. */
async function campanias() {
    const db = admin();
    const { data } = await db.from('correo_envios')
        .select('campania, enviado_at, estado')
        .order('enviado_at', { ascending: false })
        .limit(5000);

    const porCampania: Record<string, { enviados: number; fallidos: number; ultimo: string }> = {};
    for (const e of data ?? []) {
        const c = porCampania[e.campania] ??= { enviados: 0, fallidos: 0, ultimo: e.enviado_at };
        c.enviados++;
        if (e.estado && e.estado !== 'enviado') c.fallidos++;
        if (e.enviado_at > c.ultimo) c.ultimo = e.enviado_at;
    }

    const { count: bajas } = await db.from('correo_bajas')
        .select('email', { count: 'exact', head: true });

    return { porCampania, bajas: bajas ?? 0, muestra: (data ?? []).slice(0, 60) };
}

/** Soporte: quién escribió y qué reportó. */
async function soporte(params: URLSearchParams) {
    const db = admin();
    const estado = params.get('estado') ?? '';
    let q = db.from('user_feedback')
        .select('id, user_id, user_email, user_name, category, message, status, admin_notes, created_at', { count: 'exact' });
    if (estado) q = q.eq('status', estado);
    const { data, count } = await q.order('created_at', { ascending: false }).limit(100);
    return { filas: data ?? [], total: count ?? 0 };
}

/** Seguridad: consultas marcadas por el centinela. */
async function seguridad(params: URLSearchParams) {
    const db = admin();
    const revisadas = params.get('revisadas') === '1';
    const { data } = await db.from('security_alerts')
        .select('id, user_email, query_text, alert_type, severity, reviewed, created_at')
        .eq('reviewed', revisadas)
        .order('created_at', { ascending: false })
        .limit(100);
    return { filas: data ?? [] };
}

/** Vitrina: las autorizaciones que esperan revisión, con sus archivos. */
async function vitrina() {
    const db = admin();
    const { data } = await db.from('vitrina_autorizaciones')
        .select('*')
        .order('creado_at', { ascending: false })
        .limit(100);

    // El cubo es privado a propósito: las imágenes se sirven con enlaces
    // firmados de una hora, no exponiéndolo al público. Publicar la foto de
    // un abogado en una URL adivinable sería exactamente lo contrario de lo
    // que le prometimos al pedirle su consentimiento.
    const filas = await Promise.all((data ?? []).map(async (v: any) => {
        const firmar = async (ruta: string | null) => {
            if (!ruta) return null;
            const { data: s } = await db.storage.from('vitrina').createSignedUrl(ruta, 3600);
            return s?.signedUrl ?? null;
        };
        const perfil = await db.from('user_profiles')
            .select('email, full_name, estado, subscription_type')
            .eq('id', v.usuario_id).maybeSingle();
        return {
            ...v,
            logo_url: await firmar(v.logo_path),
            foto_url: await firmar(v.foto_path),
            perfil: perfil.data,
        };
    }));

    return { filas };
}

// ── Acciones ────────────────────────────────────────────────────────────

async function accion(cuerpo: any, quien: string) {
    const db = admin();
    const { tipo, id } = cuerpo;

    const asentar = async (detalle: any) => {
        await db.from('admin_audit_log').insert({
            admin_email: quien, action: tipo, target_user_id: id ?? null,
            details: detalle,
        }).then(() => null, () => null);   // el registro no debe romper la acción
    };

    switch (tipo) {
        case 'cambiar_plan': {
            const LIMITES: Record<string, number> = {
                gratuito: 5, basico_monthly: 70, pro_monthly: 140, pro_annual: 140,
                platinum_monthly: 560, platinum_annual: 560, ultra_secretarios: 140,
            };
            const plan = cuerpo.plan;
            if (!(plan in LIMITES)) return { error: 'plan desconocido' };
            await db.from('user_profiles').update({
                subscription_type: plan, queries_limit: LIMITES[plan],
                updated_at: new Date().toISOString(),
            }).eq('id', id);
            await asentar({ plan });
            return { ok: true };
        }
        case 'reiniciar_consumo':
            await db.from('user_profiles').update({
                queries_used: 0, drafts_used: 0, updated_at: new Date().toISOString(),
            }).eq('id', id);
            await asentar({});
            return { ok: true };
        case 'activar':
        case 'desactivar':
            await db.from('user_profiles').update({
                is_active: tipo === 'activar', updated_at: new Date().toISOString(),
            }).eq('id', id);
            await asentar({});
            return { ok: true };
        case 'soporte_estado':
            await db.from('user_feedback').update({
                status: cuerpo.estado,
                admin_notes: cuerpo.notas ?? null,
                resolved_at: cuerpo.estado === 'resuelto' ? new Date().toISOString() : null,
            }).eq('id', cuerpo.feedback_id);
            await asentar({ feedback_id: cuerpo.feedback_id, estado: cuerpo.estado });
            return { ok: true };
        case 'vitrina_estado':
            await db.from('vitrina_autorizaciones').update({
                estado: cuerpo.estado, actualizado_at: new Date().toISOString(),
            }).eq('usuario_id', id);
            await asentar({ estado: cuerpo.estado });
            return { ok: true };
        case 'alerta_revisada':
            await db.from('security_alerts').update({
                reviewed: true, reviewed_by: quien, reviewed_at: new Date().toISOString(),
            }).eq('id', cuerpo.alerta_id);
            return { ok: true };
        default:
            return { error: `acción desconocida: ${tipo}` };
    }
}

// ── Entradas ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const yo = await guardia(req);
    if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const p = req.nextUrl.searchParams;
    const seccion = p.get('seccion') ?? 'resumen';
    const t0 = Date.now();

    try {
        let datos: any;
        switch (seccion) {
            case 'resumen': datos = await resumen(); break;
            case 'cuentas': datos = await cuentas(p); break;
            case 'cuenta': datos = await cuenta(p.get('id')!); break;
            case 'campanias': datos = await campanias(); break;
            case 'soporte': datos = await soporte(p); break;
            case 'seguridad': datos = await seguridad(p); break;
            case 'vitrina': datos = await vitrina(); break;
            default: return NextResponse.json({ error: 'sección desconocida' }, { status: 400 });
        }
        // El tiempo va en la respuesta a propósito: el panel viejo era lento y
        // nadie sabía cuánto. Lo que no se mide, se discute.
        return NextResponse.json({ ...datos, _ms: Date.now() - t0 });
    } catch (e: any) {
        console.error(`panel/${seccion}:`, e);
        return NextResponse.json({ error: e.message ?? 'error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const yo = await guardia(req);
    if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const cuerpo = await req.json().catch(() => ({}));
    const r = await accion(cuerpo, yo.email);
    return NextResponse.json(r, { status: r.error ? 400 : 200 });
}
