/**
 * EL DIAGNÓSTICO DE UN REPORTE DE SOPORTE (2-nov-2026).
 *
 * Dado {userId?, email, texto, canal}, reúne los hechos de su cuenta con la
 * llave de servicio —TODO EN LECTURA: aquí no se escribe nada en ninguna
 * parte— y los pasa a las reglas de `diagnostico-reglas.ts`:
 *
 *   · el perfil: plan, consultas usadas y su límite, recargas, `suspendido_at`,
 *     `impago_desde`, `stripe_customer_id`, y si está en `blocked_users`;
 *   · otras cuentas del MISMO buzón de Gmail (con puntos o con +etiqueta);
 *   · el cobro, en sólo lectura con lib/stripe.ts: la suscripción y su última
 *     factura frente al plan del perfil;
 *   · las respuestas del chat de las 48 h previas (`respuestas_chat`):
 *     interrumpidas, o terminadas sin `guardada_at`;
 *   · los «Error al analizar documento» que se le pintaron en ese tiempo;
 *   · sus sesiones de las 24 h previas, con `auth_resumen_usuario`: inicios,
 *     renovaciones, revocaciones y el máximo por minuto.
 *
 * Sólo se busca lo que el tipo necesita: una consulta jurídica mal puesta no
 * gasta llamadas al cobro. Y lo que no se pudo leer queda en
 * `hechos.faltantes` en vez de contar como «no hay»: con una fuente caída, la
 * regla baja la confianza y el caso lo ve una persona.
 *
 * Los clientes llegan por parámetro —Supabase y un `LectorStripe` de dos
 * métodos— para que la prueba los simule sin red.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe, getPlanIdFromPriceId, finDelPeriodo, finDelAcceso } from '../stripe';
import {
    clasificar, decidir, hechosVacios, ocultarCorreo, correoCanonico, HORAS_AUTH, HORAS_RESPUESTAS,
    type Canal, type Clasificacion, type Decision, type Hechos, type Perfil, type HechosStripe,
    type SuscripcionResumen, type RespuestaChat, type ErrorDocumento, type CausaDocumento, type ResumenAuth,
} from './diagnostico-reglas';

export interface EntradaDiagnostico {
    userId?: string | null;
    email: string;
    texto: string;
    canal: Canal;
    /** Cuándo escribió (creado_at del reporte). Por omisión, ahora. */
    referenciaAt?: string;
    /** Sólo correo: la cabecera Date que puso su equipo y la hora en que llegó. */
    cabeceraFecha?: string | null;
    recibidoAt?: string | null;
}

export interface Diagnostico extends Decision {
    hechos: Hechos;
}

/** Lo único del cobro que hace falta. La prueba le pasa uno de mentira. */
export interface LectorStripe {
    clientePorCorreo(correo: string): Promise<string | null>;
    suscripciones(cliente: string): Promise<SuscripcionResumen[]>;
}

export interface Dependencias {
    sb: SupabaseClient;
    stripe: LectorStripe | null;
    ahora?: number;
}

const iso = (segundos: number | null | undefined) =>
    typeof segundos === 'number' && segundos > 0 ? new Date(segundos * 1000).toISOString() : null;

/* ─────────────────────────── el cobro, en lectura ─────────────────────────── */

function resumirSuscripcion(sub: Stripe.Subscription): SuscripcionResumen {
    const precio = sub.items?.data?.[0]?.price?.id ?? null;
    const plan = precio ? getPlanIdFromPriceId(precio) : null;
    const factura = typeof sub.latest_invoice === 'object' && sub.latest_invoice ? sub.latest_invoice : null;
    const cancelada = !!(sub.cancel_at_period_end || sub.cancel_at);
    const fin = cancelada ? finDelAcceso(sub) : finDelPeriodo(sub);
    return {
        id: sub.id,
        estado: sub.status,
        planId: plan && plan !== 'gratuito' ? plan : null,
        cancelaAlFinal: cancelada,
        finPeriodo: fin ? fin.toISOString() : null,
        creadaAt: iso(sub.created),
        factura: factura ? {
            estado: factura.status ?? null,
            pagadaAt: iso(factura.status_transitions?.paid_at ?? null),
            intentos: factura.attempt_count ?? 0,
            creadaAt: iso(factura.created),
        } : null,
    };
}

/**
 * El lector del cobro de verdad: dos llamadas de LISTA, ninguna de escritura.
 * `expand` trae la última factura en la misma petición.
 */
export function lectorStripeReal(): LectorStripe {
    const s = getStripe();
    return {
        async clientePorCorreo(correo) {
            const r = await s.customers.list({ email: correo, limit: 3 });
            return r.data[0]?.id ?? null;
        },
        async suscripciones(cliente) {
            const r = await s.subscriptions.list({ customer: cliente, status: 'all', limit: 5, expand: ['data.latest_invoice'] });
            return r.data.map(resumirSuscripcion);
        },
    };
}

const VIVAS = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

/** La suscripción que importa: la del perfil si está, si no la viva más reciente, si no la última. */
export function suscripcionRelevante(subs: SuscripcionResumen[], delPerfil: string | null): SuscripcionResumen | null {
    if (!subs.length) return null;
    const recientes = [...subs].sort((a, b) => Date.parse(b.creadaAt || '0') - Date.parse(a.creadaAt || '0'));
    return (delPerfil && recientes.find(s => s.id === delPerfil && VIVAS.includes(s.estado)))
        || recientes.find(s => VIVAS.includes(s.estado))
        || recientes[0];
}

async function leerCobro(stripe: LectorStripe | null, perfil: Perfil | null, correo: string): Promise<HechosStripe> {
    if (!stripe) return { consultado: false, error: 'sin STRIPE_SECRET_KEY', cliente: null, porCorreo: false, suscripcion: null };
    try {
        let cliente = perfil?.stripeCustomerId ?? null;
        let porCorreo = false;
        if (!cliente && correo) {
            cliente = await stripe.clientePorCorreo(correo);
            porCorreo = !!cliente;
        }
        if (!cliente) return { consultado: true, error: null, cliente: null, porCorreo: false, suscripcion: null };
        const subs = await stripe.suscripciones(cliente);
        return {
            consultado: true, error: null, cliente, porCorreo,
            suscripcion: suscripcionRelevante(subs, perfil?.stripeSubscriptionId ?? null),
        };
    } catch (e) {
        return { consultado: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200), cliente: null, porCorreo: false, suscripcion: null };
    }
}

/* ─────────────────────────── la base, en lectura ─────────────────────────── */

const COLUMNAS_PERFIL = 'id, email, full_name, tratamiento, subscription_type, queries_used, queries_limit, '
    + 'consultas_recargadas, suspendido_at, impago_desde, stripe_customer_id, stripe_subscription_id';

interface FilaPerfil {
    id: string; email: string; full_name: string | null; tratamiento: string | null; subscription_type: string | null;
    queries_used: number | null; queries_limit: number | null; consultas_recargadas: number | null;
    suspendido_at: string | null; impago_desde: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null;
}

function aPerfil(f: FilaPerfil): Perfil {
    return {
        id: f.id, email: (f.email || '').toLowerCase(), nombre: f.full_name, tratamiento: f.tratamiento,
        plan: f.subscription_type || 'gratuito',
        consultasUsadas: f.queries_used ?? 0, consultasLimite: f.queries_limit ?? 0,
        consultasRecargadas: f.consultas_recargadas ?? 0,
        suspendidoAt: f.suspendido_at, impagoDesde: f.impago_desde,
        stripeCustomerId: f.stripe_customer_id, stripeSubscriptionId: f.stripe_subscription_id,
    };
}

async function leerPerfil(sb: SupabaseClient, e: EntradaDiagnostico, h: Hechos): Promise<Perfil | null> {
    const consulta = e.userId
        ? sb.from('user_profiles').select(COLUMNAS_PERFIL).eq('id', e.userId).limit(1)
        : sb.from('user_profiles').select(COLUMNAS_PERFIL).eq('email', e.email.trim().toLowerCase()).limit(1);
    const { data, error } = await consulta;
    if (error) { h.faltantes.push(`perfil: ${error.message}`); return null; }
    const fila = (data as unknown as FilaPerfil[] | null)?.[0];
    return fila ? aPerfil(fila) : null;
}

async function leerBloqueo(sb: SupabaseClient, userId: string, h: Hechos): Promise<Hechos['bloqueo']> {
    const { data, error } = await sb.from('blocked_users').select('reason, blocked_at').eq('user_id', userId).limit(1);
    if (error) { h.faltantes.push(`blocked_users: ${error.message}`); return null; }
    const f = (data as Array<{ reason: string; blocked_at: string | null }> | null)?.[0];
    return f ? { motivo: f.reason || 'sin motivo', desde: f.blocked_at } : null;
}

/** Errores de «la función no existe»: la migración aún no se aplicó. */
const sinFuncion = (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function|does not exist/i.test(e.message || ''));

async function leerGemelas(sb: SupabaseClient, perfil: Perfil | null, correo: string, h: Hechos) {
    const propio = (perfil?.email || correo).toLowerCase();
    // Sólo Gmail ignora puntos y etiquetas; en los demás no hay gemela posible.
    if (correoCanonico(propio) === propio && !/@(gmail|googlemail)\.com$/.test(propio)) return [];
    const { data, error } = await sb.rpc('cuentas_mismo_correo', { p_correo: propio });
    if (error) {
        h.faltantes.push(sinFuncion(error) ? 'cuentas_mismo_correo: falta la migración' : `cuentas_mismo_correo: ${error.message}`);
        return [];
    }
    return ((data ?? []) as Array<{ id: string; email: string; subscription_type: string | null }>)
        .filter(c => c.id !== perfil?.id && c.email.toLowerCase() !== propio)
        .map(c => ({ id: c.id, correoOculto: ocultarCorreo(c.email.toLowerCase()), plan: c.subscription_type || 'gratuito' }));
}

async function leerRespuestas(sb: SupabaseClient, userId: string, desde: string, h: Hechos): Promise<RespuestaChat[] | null> {
    const { data, error } = await sb.from('respuestas_chat')
        .select('peticion_id, estado, creada_at, terminada_at, guardada_at, respuesta')
        .eq('user_id', userId).gte('creada_at', desde)
        .order('creada_at', { ascending: false }).limit(8);
    if (error) { h.faltantes.push(`respuestas_chat: ${error.message}`); return null; }
    // Del texto sólo sale su largo: la respuesta jurídica no entra al diagnóstico ni al parte.
    return ((data ?? []) as Array<{ peticion_id: string; estado: string; creada_at: string; terminada_at: string | null; guardada_at: string | null; respuesta: string | null }>)
        .map(f => ({
            id: String(f.peticion_id).slice(0, 8), estado: f.estado, creadaAt: f.creada_at, terminadaAt: f.terminada_at,
            guardada: !!f.guardada_at, largo: (f.respuesta || '').length,
        }));
}

/** Los textos que la pantalla del chat deja en la conversación cuando un documento falla (chat/page.tsx). */
const PATRONES_ERROR_DOCUMENTO = ['%Error al analizar documento%', '%al enviar el documento%', '%contacto con el servidor%'];

export function causaDeError(texto: string): Pick<ErrorDocumento, 'causa' | 'hojasDocumento' | 'hojasPlan'> {
    const t = texto || '';
    const hojas = /tiene (\d+) p[aá]ginas y tu plan lee hasta (\d+)/i.exec(t);
    if (hojas) return { causa: 'hojas', hojasDocumento: Number(hojas[1]), hojasPlan: Number(hojas[2]) };
    let causa: CausaDocumento = 'fallo';
    if (/contacto con el servidor|cort[oó] la conexi[oó]n|network ?error|load failed|failed to fetch|no lleg[oó] a su pantalla/i.test(t)) causa = 'red';
    else if (/no se pudo extraer (el )?texto|imagen sin texto/i.test(t)) causa = 'texto';
    else if (/not a zip file|formato no soportado/i.test(t)) causa = 'formato';
    else if (/demasiado grande|too large/i.test(t)) causa = 'tamano';
    else if (/ya us[oó] las consultas/i.test(t)) causa = 'cuota';
    return { causa };
}

async function leerErroresDocumento(sb: SupabaseClient, userId: string, desde: string, h: Hechos): Promise<ErrorDocumento[] | null> {
    const { data: convs, error } = await sb.from('conversations').select('id')
        .eq('user_id', userId).gte('updated_at', desde).order('updated_at', { ascending: false }).limit(40);
    if (error) { h.faltantes.push(`conversations: ${error.message}`); return null; }
    const ids = ((convs ?? []) as Array<{ id: string }>).map(c => c.id);
    if (!ids.length) return [];
    const vistos = new Map<string, ErrorDocumento>();
    for (const patron of PATRONES_ERROR_DOCUMENTO) {
        const { data, error: e } = await sb.from('messages').select('conversation_id, created_at, content')
            .in('conversation_id', ids).eq('role', 'assistant').gte('created_at', desde)
            .ilike('content', patron).order('created_at', { ascending: false }).limit(10);
        if (e) { h.faltantes.push(`messages: ${e.message}`); return null; }
        for (const m of (data ?? []) as Array<{ conversation_id: string; created_at: string; content: string }>) {
            // Un aviso de error es corto. Una respuesta larga que lo menciona no es un error.
            if ((m.content || '').length > 2000) continue;
            vistos.set(`${m.conversation_id}/${m.created_at}`, { at: m.created_at, ...causaDeError(m.content) });
        }
    }
    return Array.from(vistos.values());
}

async function leerAuth(sb: SupabaseClient, userId: string, desde: string, h: Hechos): Promise<ResumenAuth | null> {
    const { data, error } = await sb.rpc('auth_resumen_usuario', { p_user: userId, p_desde: desde });
    if (error) {
        h.faltantes.push(sinFuncion(error) ? 'auth_resumen_usuario: falta la migración' : `auth_resumen_usuario: ${error.message}`);
        return null;
    }
    return (data as ResumenAuth | null) ?? null;
}

/* ─────────────────────────── el diagnóstico ─────────────────────────── */

const QUE_HACE_FALTA: Record<string, Array<'cobro' | 'gemelas' | 'respuestas' | 'documentos' | 'auth'>> = {
    pago: ['cobro', 'gemelas'],
    contratar: ['cobro'],
    cancelar: ['cobro', 'gemelas'],
    acceso: ['auth', 'gemelas'],
    'respuesta-cortada': ['respuestas'],
    documento: ['documentos'],
};

/** Reúne los hechos que el tipo necesita. Nunca lanza: lo que falla queda en `faltantes`. */
export async function reunirHechos(c: Clasificacion, e: EntradaDiagnostico, d: Dependencias): Promise<Hechos> {
    const h = hechosVacios();
    const ahora = d.ahora ?? Date.now();
    const ref = Date.parse(e.referenciaAt || '') || ahora;
    const hace = (horas: number) => new Date(ref - horas * 3600_000).toISOString();
    try {
        h.perfil = await leerPerfil(d.sb, e, h);
        const userId = h.perfil?.id ?? e.userId ?? null;
        if (userId) h.bloqueo = await leerBloqueo(d.sb, userId, h);
        if (h.bloqueo || c.tipo === 'acuse' || c.tipo === 'humano') return h;

        const falta = [...(QUE_HACE_FALTA[c.tipo] ?? [])];
        // Una cuenta suspendida que pregunta precios se contesta con su pago (T4).
        if (c.tipo === 'contratar' && !h.perfil?.suspendidoAt) falta.splice(falta.indexOf('cobro'), 1);
        if (falta.includes('cobro')) h.stripe = await leerCobro(d.stripe, h.perfil, e.email);
        if (falta.includes('gemelas')) h.gemelas = await leerGemelas(d.sb, h.perfil, e.email, h);
        if (userId && falta.includes('respuestas')) h.respuestas = await leerRespuestas(d.sb, userId, hace(HORAS_RESPUESTAS), h);
        if (userId && falta.includes('documentos')) h.erroresDocumento = await leerErroresDocumento(d.sb, userId, hace(HORAS_RESPUESTAS), h);
        if (userId && falta.includes('auth')) h.auth = await leerAuth(d.sb, userId, hace(HORAS_AUTH), h);
        if (c.tipo === 'acceso' && e.cabeceraFecha && e.recibidoAt) {
            const desfase = (Date.parse(e.cabeceraFecha) - Date.parse(e.recibidoAt)) / 60_000;
            if (Number.isFinite(desfase)) h.reloj = { desfaseMinutos: Math.round(desfase) };
        }
    } catch (err) {
        h.faltantes.push(`inesperado: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}`);
    }
    return h;
}

/** Clasifica, reúne los hechos y decide. Sólo lee. */
export async function diagnosticar(e: EntradaDiagnostico, d: Dependencias): Promise<Diagnostico> {
    const ahora = d.ahora ?? Date.now();
    const c = clasificar(e.texto);
    const hechos = await reunirHechos(c, e, d);
    const decision = decidir(c, hechos, {
        canal: e.canal,
        referenciaAt: e.referenciaAt || new Date(ahora).toISOString(),
        ahora,
    });
    return { ...decision, hechos };
}
