/**
 * LA API DE CONVERSIONES DE META, EN UN SOLO SITIO (6-oct-2026). SÓLO SERVIDOR.
 *
 * El píxel del navegador pierde eventos (bloqueadores, Safari, pestañas que se
 * cierran antes de tiempo). La API de Conversiones manda los mismos desde el
 * servidor, y Meta junta los dos por `event_id`: si llegan ambos, cuenta uno.
 *
 * TRES REGLAS
 *   1. Si faltan `NEXT_PUBLIC_META_PIXEL_ID` o `META_CAPI_TOKEN` (éste SÓLO de
 *      servidor), no hace nada y no dice nada: así se despliega antes de tener
 *      las llaves.
 *   2. Nunca lanza y nunca espera más de ~3 s: lo llaman el alta y el webhook
 *      de Stripe, y ninguno de los dos puede caerse ni retrasarse por medir.
 *   3. Nada personal en los registros: ni correos ni ids en claro. Sólo el
 *      nombre del evento, su event_id y el código HTTP. El correo y el id viajan
 *      a Meta cifrados con SHA-256, que es lo que Meta pide.
 *
 * `META_CAPI_TEST_EVENT_CODE` (opcional) manda los eventos al «Probar eventos»
 * del Administrador de eventos en vez de a las estadísticas reales.
 */

import { createHash } from 'crypto';

export const GRAPH_API = 'https://graph.facebook.com/v21.0';
const TIEMPO_MAXIMO_MS = 3000;

export type AccionOrigen = 'website' | 'system_generated' | 'other';

export interface DatosUsuarioCrudos {
    email?: string | null;
    externalId?: string | null;
    fbc?: string | null;
    fbp?: string | null;
    ip?: string | null;
    userAgent?: string | null;
}

export interface EventoMeta {
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: AccionOrigen;
    event_source_url?: string;
    user_data: Record<string, string | string[]>;
    custom_data?: Record<string, string | number>;
}

export interface ResultadoEnvio {
    enviado: boolean;
    status?: number;
    motivo?: 'sin_configurar' | 'sin_eventos' | 'error_red' | 'http';
}

/** Lo que el ayudante puede leer del entorno; inyectable para las pruebas. */
export interface ConfigMeta {
    pixelId?: string;
    token?: string;
    testEventCode?: string;
}

export function configDelEntorno(): ConfigMeta {
    return {
        pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined,
        token: process.env.META_CAPI_TOKEN?.trim() || undefined,
        testEventCode: process.env.META_CAPI_TEST_EVENT_CODE?.trim() || undefined,
    };
}

// ─── Cifrado y normalización ────────────────────────────────────────────────

export function sha256(texto: string): string {
    return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** Correo como lo pide Meta: minúsculas y sin espacios (en ningún sitio). */
export function normalizarCorreo(email: string): string {
    return email.replace(/\s+/g, '').toLowerCase();
}

export function hashCorreo(email: string | null | undefined): string | undefined {
    if (!email) return undefined;
    const n = normalizarCorreo(email);
    return n.includes('@') ? sha256(n) : undefined;
}

export function hashId(id: string | null | undefined): string | undefined {
    if (!id) return undefined;
    const n = id.trim().toLowerCase();
    return n ? sha256(n) : undefined;
}

/** La primera IP de `x-forwarded-for` (la del cliente; las demás son proxies). */
export function ipDelCliente(xForwardedFor: string | null | undefined, xRealIp?: string | null): string | undefined {
    const primera = (xForwardedFor || '').split(',')[0]?.trim();
    return primera || xRealIp?.trim() || undefined;
}

/** `user_data` con lo que hay: cifra correo e id; `fbc`, `fbp`, IP y agente van en claro, como pide Meta. */
export function construirUserData(d: DatosUsuarioCrudos): Record<string, string | string[]> {
    const ud: Record<string, string | string[]> = {};
    const em = hashCorreo(d.email);
    if (em) ud.em = [em];
    const ext = hashId(d.externalId);
    if (ext) ud.external_id = [ext];
    if (d.fbc) ud.fbc = d.fbc;
    if (d.fbp) ud.fbp = d.fbp;
    if (d.ip) ud.client_ip_address = d.ip;
    if (d.userAgent) ud.client_user_agent = d.userAgent;
    return ud;
}

export function construirEvento(e: {
    nombre: string;
    eventId: string;
    usuario: DatosUsuarioCrudos;
    url?: string;
    accion?: AccionOrigen;
    datos?: Record<string, string | number>;
    momentoMs?: number;
}): EventoMeta {
    const evento: EventoMeta = {
        event_name: e.nombre,
        event_time: Math.floor((e.momentoMs ?? Date.now()) / 1000),
        event_id: e.eventId,
        action_source: e.accion ?? 'website',
        user_data: construirUserData(e.usuario),
    };
    if (e.url) evento.event_source_url = e.url;
    if (e.datos && Object.keys(e.datos).length) evento.custom_data = e.datos;
    return evento;
}

// ─── Envío ──────────────────────────────────────────────────────────────────

/**
 * Manda los eventos a la Graph API. No lanza nunca; devuelve qué pasó.
 * `fetchImpl` y `config` sólo se pasan en las pruebas.
 */
export async function enviarEventosMeta(
    eventos: EventoMeta[],
    opciones: { config?: ConfigMeta; fetchImpl?: typeof fetch; tiempoMaximoMs?: number } = {},
): Promise<ResultadoEnvio> {
    const config = opciones.config ?? configDelEntorno();
    if (!config.pixelId || !config.token) return { enviado: false, motivo: 'sin_configurar' };
    if (!eventos.length) return { enviado: false, motivo: 'sin_eventos' };

    const etiqueta = eventos.map(e => `${e.event_name} ${e.event_id}`).join(', ');
    const hacerFetch = opciones.fetchImpl ?? fetch;
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS);

    try {
        const cuerpo: Record<string, unknown> = { data: eventos, access_token: config.token };
        if (config.testEventCode) cuerpo.test_event_code = config.testEventCode;

        const res = await hacerFetch(`${GRAPH_API}/${encodeURIComponent(config.pixelId)}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo),
            signal: control.signal,
        });
        console.log(`[meta-capi] ${etiqueta} → HTTP ${res.status}${config.testEventCode ? ' (prueba)' : ''}`);
        return res.ok ? { enviado: true, status: res.status } : { enviado: false, status: res.status, motivo: 'http' };
    } catch (err) {
        const nombre = err instanceof Error ? err.name : 'Error';
        console.warn(`[meta-capi] ${etiqueta} → sin respuesta (${nombre})`);
        return { enviado: false, motivo: 'error_red' };
    } finally {
        clearTimeout(reloj);
    }
}

// ─── La compra, desde el webhook de Stripe ──────────────────────────────────

/** Lo mínimo de una sesión de Checkout que hace falta (estructural, sin importar Stripe). */
export interface SesionDeCompra {
    id: string;
    amount_total?: number | null;
    currency?: string | null;
}

/** Lo mínimo del cliente de Supabase con service role. */
export interface ClienteAdminMinimo {
    // `any` a propósito: el constructor de consultas de supabase-js no tiene un tipo cómodo de escribir.
    from: (tabla: string) => any;
}

const SITIO = 'https://www.iurexia.com';

/** Promesa que se resuelve sola a los `ms`, pase lo que pase con la otra. */
export function conTope<T>(promesa: Promise<T>, ms: number): Promise<T | undefined> {
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const tope = new Promise<undefined>(resolver => { reloj = setTimeout(() => resolver(undefined), ms); });
    return Promise.race([promesa.catch(() => undefined), tope]).finally(() => clearTimeout(reloj));
}

/**
 * `Purchase` y `Subscribe` por la API de Conversiones tras la primera compra de
 * una suscripción (`checkout.session.completed`). `event_id` = id de la sesión
 * de Stripe. `fbc`, `fbp` y el agente salen de `altas_origen`, y SÓLO se manda
 * si el usuario dio permiso de Marketing al registrarse.
 *
 * Nunca lanza. El webhook además lo envuelve en `conTope`.
 */
export async function medirCompraMeta(p: {
    admin: ClienteAdminMinimo;
    sesion: SesionDeCompra;
    email: string;
    plan?: string;
    config?: ConfigMeta;
    fetchImpl?: typeof fetch;
}): Promise<ResultadoEnvio> {
    try {
        const config = p.config ?? configDelEntorno();
        if (!config.pixelId || !config.token) return { enviado: false, motivo: 'sin_configurar' };

        const { data: perfil } = await p.admin
            .from('user_profiles').select('id').eq('email', p.email).limit(1).maybeSingle();
        const userId: string | undefined = perfil?.id;
        if (!userId) return { enviado: false, motivo: 'sin_eventos' };

        const { data: origen } = await p.admin
            .from('altas_origen')
            .select('fbc, fbp, user_agent, consiente_marketing')
            .eq('user_id', userId)
            .maybeSingle();
        if (!origen?.consiente_marketing) {
            console.log(`[meta-capi] Purchase ${p.sesion.id} → omitido (sin origen del alta o sin permiso de Marketing)`);
            return { enviado: false, motivo: 'sin_eventos' };
        }

        const usuario: DatosUsuarioCrudos = {
            email: p.email,
            externalId: userId,
            fbc: origen.fbc,
            fbp: origen.fbp,
            userAgent: origen.user_agent,
        };
        const centavos = typeof p.sesion.amount_total === 'number' ? p.sesion.amount_total : 0;
        const datos: Record<string, string | number> = {
            value: Math.round(centavos) / 100,
            currency: (p.sesion.currency || 'mxn').toUpperCase(),
        };
        if (p.plan) datos.content_name = p.plan;

        const url = `${SITIO}/checkout/success`;
        const eventos: EventoMeta[] = [];
        // Una suscripción a 0 (cupón del 100 %) es Subscribe, no Purchase.
        if (centavos > 0) {
            eventos.push(construirEvento({ nombre: 'Purchase', eventId: p.sesion.id, usuario, url, datos }));
        }
        eventos.push(construirEvento({ nombre: 'Subscribe', eventId: p.sesion.id, usuario, url, datos }));

        return await enviarEventosMeta(eventos, { config, fetchImpl: p.fetchImpl });
    } catch (err) {
        const nombre = err instanceof Error ? err.name : 'Error';
        console.warn(`[meta-capi] Purchase ${p.sesion?.id} → falló antes de enviar (${nombre})`);
        return { enviado: false, motivo: 'error_red' };
    }
}
