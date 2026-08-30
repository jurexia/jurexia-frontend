/**
 * El parte semanal de salud del negocio. Sale los domingos a las 21:00.
 *
 * POR QUÉ EXISTE (30-ago-2026)
 * ----------------------------
 * David preguntó un domingo si alguien se había registrado y si esos registros
 * usaban sus consultas. La respuesta estaba a cinco consultas SQL de distancia
 * y hubo que escribirlas a mano. Un negocio con 69 clientes de pago no puede
 * depender de que alguien tenga la ocurrencia de preguntar: las cifras que
 * deciden dónde poner el esfuerzo tienen que llegar solas.
 *
 * NO ES SÓLO UN CORREO. Cada envío deja una fila en `reportes_salud`, y esa
 * tabla es el objetivo a medio plazo: el histórico con el que se lanzan las
 * campañas. Por eso guarda LISTAS y no sólo conteos —un número dice «97 se
 * registraron y no pagaron»; la lista permite escribirles— y por eso el correo
 * puede fallar sin que se pierda la medición: primero se guarda, luego se manda.
 *
 * DE DÓNDE SALE CADA COSA
 * -----------------------
 *   · Supabase  → registros, activación, uso, los segmentos de campaña.
 *                 Todo el cálculo vive en la función `reporte_salud_datos`,
 *                 que es SQL: es donde debe estar.
 *   · Stripe    → altas de pago, bajas, cobros fallidos y MRR. El dinero se
 *                 lee de donde está el dinero, nunca de nuestra copia.
 *
 * LAS CATEGORÍAS DE USO NO SON INVENTADAS. Salen de los marcadores que el
 * frontend deja en el propio mensaje (`[MODO_REDACCION_PRO]`, `📄 **Documento
 * adjunto:**`…), comprobados sobre 6,234 preguntas reales. Si alguien renombra
 * un marcador, esta cuenta deja de verlo en silencio: hay que actualizar
 * `reporte_salud_datos` a la vez.
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { PALETA, envolver, rotulo, esc } from './plantilla';

/** UTC-6 todo el año: México suprimió el horario de verano en 2022. */
const OFFSET_CDMX_MS = 6 * 3600 * 1000;

/** A quién llega. Es un parte interno, no una campaña. */
const DESTINO = (process.env.REPORTE_SALUD_TO || 'jdm.juridico@gmail.com')
    .split(',').map(s => s.trim()).filter(Boolean);

/** Cuántos nombres se enseñan de cada lista. La lista entera va a la tabla. */
const MAXIMO_EN_CORREO = 12;

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
}

// ── La semana ────────────────────────────────────────────────────────────────

export interface Ventana {
    inicio: Date;        // lunes 00:00 de Ciudad de México
    fin: Date;           // el instante en que corre
    lunes: string;       // 'YYYY-MM-DD'
    domingo: string;     // 'YYYY-MM-DD'
}

/**
 * De lunes 00:00 (CDMX) al momento de correr.
 *
 * El corte NO es el domingo a medianoche sino la hora del envío, porque el
 * parte sale a las 21:00 del domingo y se llama «la semana del reporte». Se
 * dice en el correo para que nadie compare peras con manzanas.
 */
export function ventanaSemana(ahora: Date = new Date()): Ventana {
    // El reloj de pared de CDMX, movido a UTC para poder usar los getters UTC
    // sin que el huso del servidor —que en Vercel es UTC— se meta de por medio.
    const local = new Date(ahora.getTime() - OFFSET_CDMX_MS);
    const retroceso = (local.getUTCDay() + 6) % 7;   // lunes = 0, domingo = 6
    const lunes = new Date(Date.UTC(
        local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - retroceso));
    const domingo = new Date(lunes.getTime() + 6 * 86400000);
    return {
        inicio: new Date(lunes.getTime() + OFFSET_CDMX_MS),
        fin: ahora,
        lunes: lunes.toISOString().slice(0, 10),
        domingo: domingo.toISOString().slice(0, 10),
    };
}

// ── Lo que devuelve la base ──────────────────────────────────────────────────

interface Persona { email: string; nombre: string | null; estado: string | null; activo?: boolean; usadas?: number }

interface DatosBase {
    registros: number;
    registros_activados: number;
    registros_sin_pago: number;
    usuarios_activos: number;
    consultas: number;
    uso: Record<string, number>;
    otros: Record<string, number>;
    sin_pago: Persona[];
    en_el_muro: Persona[];
}

// ── Lo que devuelve Stripe ───────────────────────────────────────────────────

interface Movimiento { email: string; importe: number; periodo: string }

interface DatosStripe {
    altas: Movimiento[];
    bajas: Movimiento[];
    bajas_anunciadas: number;
    cobros_fallidos: number;
    suscriptores_activos: number;
    mrr_total: number;
}

/** Un importe de Stripe, llevado a pesos al mes. Lo anual se reparte entre 12. */
function aMensual(precio: Stripe.Price | null | undefined, cantidad = 1): number {
    if (!precio?.unit_amount || !precio.recurring) return 0;
    const { interval, interval_count } = precio.recurring;
    const meses = interval === 'year' ? 12 * (interval_count || 1)
        : interval === 'month' ? (interval_count || 1)
        : interval === 'week' ? (interval_count || 1) / 4.345
        : interval === 'day' ? (interval_count || 1) / 30.44
        : 1;
    return (precio.unit_amount * cantidad) / 100 / meses;
}

function correoDe(sub: Stripe.Subscription): string {
    return String(sub.metadata?.userEmail || '').toLowerCase().trim() || '(sin correo)';
}

function etiquetaPlan(sub: Stripe.Subscription): string {
    const precio = sub.items.data[0]?.price;
    if (!precio?.unit_amount) return '—';
    const cada = precio.recurring?.interval === 'year' ? 'año' : 'mes';
    return `$${(precio.unit_amount / 100).toLocaleString('es-MX')} / ${cada}`;
}

async function leerStripe(v: Ventana): Promise<DatosStripe> {
    const stripe = getStripe();
    const gte = Math.floor(v.inicio.getTime() / 1000);
    const lte = Math.floor(v.fin.getTime() / 1000);

    const altas: Movimiento[] = [];
    for await (const s of stripe.subscriptions.list({ created: { gte, lte }, status: 'all', limit: 100 })) {
        altas.push({ email: correoDe(s), importe: aMensual(s.items.data[0]?.price, s.items.data[0]?.quantity ?? 1), periodo: etiquetaPlan(s) });
    }

    // La base viva y su MRR. `cancel_at_period_end` es un stock, no un flujo:
    // dice cuántos ya avisaron de que se van, aunque avisaran otra semana.
    let activos = 0, mrr = 0, anunciadas = 0;
    for await (const s of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
        activos++;
        for (const it of s.items.data) mrr += aMensual(it.price, it.quantity ?? 1);
        if (s.cancel_at_period_end) anunciadas++;
    }

    // Las bajas se leen de los EVENTOS: Stripe no deja filtrar suscripciones
    // por fecha de cancelación. Los eventos se guardan 30 días, de sobra para
    // un parte semanal.
    const bajas: Movimiento[] = [];
    for await (const e of stripe.events.list({ type: 'customer.subscription.deleted', created: { gte, lte }, limit: 100 })) {
        const s = e.data.object as Stripe.Subscription;
        bajas.push({ email: correoDe(s), importe: aMensual(s.items?.data?.[0]?.price, 1), periodo: etiquetaPlan(s) });
    }

    let fallidos = 0;
    for await (const _e of stripe.events.list({ type: 'invoice.payment_failed', created: { gte, lte }, limit: 100 })) fallidos++;

    return {
        altas, bajas, bajas_anunciadas: anunciadas, cobros_fallidos: fallidos,
        suscriptores_activos: activos, mrr_total: Math.round(mrr * 100) / 100,
    };
}

// ── El correo ────────────────────────────────────────────────────────────────

const SANS = 'Arial,Helvetica,sans-serif';

function pesos(n: number): string {
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Una cifra grande con su rótulo. Cuatro por fila como mucho. */
function tarjetas(items: { valor: string; pie: string; tono?: 'bien' | 'mal' }[]): string {
    const celdas = items.map(i => {
        const color = i.tono === 'mal' ? '#8a2b2b' : i.tono === 'bien' ? '#2f5d3a' : PALETA.tinta;
        return `<td width="25%" style="padding:14px 10px;border:1px solid ${PALETA.borde};background-color:${PALETA.cremaFondo};vertical-align:top;">
            <div style="font-family:Georgia,serif;font-size:26px;line-height:1;color:${color};">${i.valor}</div>
            <div style="font-family:${SANS};font-size:10px;letter-spacing:1.2px;color:${PALETA.marron};text-transform:uppercase;padding-top:7px;">${esc(i.pie)}</div>
        </td>`;
    }).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;"><tr>${celdas}</tr></table>`;
}

/** Tabla de dos columnas: concepto y cifra. */
function filas(datos: [string, string][], destacar = false): string {
    const cuerpo = datos.map(([k, val]) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid ${PALETA.borde};font-family:Georgia,serif;font-size:14px;color:${PALETA.texto};">${esc(k)}</td>
        <td align="right" style="padding:9px 0;border-bottom:1px solid ${PALETA.borde};font-family:Georgia,serif;font-size:14px;${destacar ? `color:${PALETA.tinta};font-weight:bold;` : `color:${PALETA.texto};`}">${val}</td>
    </tr>`).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;border-top:1px solid ${PALETA.borde};">${cuerpo}</table>`;
}

/** Barra proporcional: se lee de un vistazo qué usan más. */
function barras(datos: [string, number][]): string {
    const total = datos.reduce((a, [, n]) => a + n, 0) || 1;
    const cuerpo = datos.map(([k, n]) => {
        const pct = Math.round((n / total) * 1000) / 10;
        const ancho = Math.max(1, Math.round(pct));
        return `<tr>
            <td width="34%" style="padding:7px 8px 7px 0;font-family:Georgia,serif;font-size:13px;color:${PALETA.texto};">${esc(k)}</td>
            <td width="46%" style="padding:7px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                    <td width="${ancho}%" style="background-color:${PALETA.oro};height:9px;line-height:9px;font-size:0;">&nbsp;</td>
                    <td style="background-color:${PALETA.borde};height:9px;line-height:9px;font-size:0;">&nbsp;</td>
                </tr></table>
            </td>
            <td width="20%" align="right" style="padding:7px 0 7px 10px;font-family:${SANS};font-size:12px;color:${PALETA.apagado};">${n.toLocaleString('es-MX')} · ${pct}%</td>
        </tr>`;
    }).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">${cuerpo}</table>`;
}

function listaPersonas(gente: Persona[], vacio: string): string {
    if (!gente.length) return `<p style="margin:0 0 24px 0;font-family:Georgia,serif;font-size:14px;color:${PALETA.apagado};">${esc(vacio)}</p>`;
    const visibles = gente.slice(0, MAXIMO_EN_CORREO);
    const cuerpo = visibles.map(p => `<tr>
        <td style="padding:8px 0 8px 12px;border-bottom:1px solid ${PALETA.borde};border-left:2px solid ${PALETA.oro};font-family:Georgia,serif;font-size:13px;color:${PALETA.texto};">
            ${esc(p.nombre || p.email)}${p.estado ? ` <span style="color:${PALETA.marron};">· ${esc(p.estado.replace(/_/g, ' '))}</span>` : ''}
            <br><span style="font-family:${SANS};font-size:11px;color:${PALETA.apagado};">${esc(p.email)}</span>
        </td>
    </tr>`).join('');
    const resto = gente.length - visibles.length;
    const pie = resto > 0
        ? `<p style="margin:8px 0 24px 0;font-family:${SANS};font-size:11px;color:${PALETA.apagado};">y ${resto} más — la lista completa queda en la tabla <em>reportes_salud</em>.</p>`
        : '<div style="height:24px;"></div>';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PALETA.borde};">${cuerpo}</table>${pie}`;
}

const NOMBRE_USO: Record<string, string> = {
    chat: 'Chat jurídico',
    documentos: 'Análisis de documentos',
    redaccion: 'Redacción',
    redaccion_pro: 'Redacción Pro',
    redaccion_platinum: 'Redacción Platinum',
    precedentes: 'Precedentes',
    consulta_rapida: 'Consulta rápida',
};

const NOMBRE_OTROS: Record<string, string> = {
    carpetas: 'Carpetas creadas',
    documentos_carpeta: 'Documentos guardados en carpetas',
    taller_sesiones: 'Sesiones del taller de sentencias',
    estudios_sentencia: 'Estudios de fondo generados',
    salvame: 'Amparos SÁLVAME',
    voz_turnos: 'Turnos de voz',
    connect: 'Solicitudes de Connect',
    reportes_soporte: 'Reportes a soporte',
};

function fecha(iso: string): string {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('es-MX',
        { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export function componerCorreo(v: Ventana, base: DatosBase, st: DatosStripe): string {
    const neto = st.altas.length - st.bajas.length;
    const mrrAlta = st.altas.reduce((a, m) => a + m.importe, 0);
    const mrrBaja = st.bajas.reduce((a, m) => a + m.importe, 0);
    const activacion = base.registros ? Math.round((base.registros_activados / base.registros) * 100) : 0;
    const conversion = base.registros ? Math.round((st.altas.length / base.registros) * 1000) / 10 : 0;

    const usos: [string, number][] = Object.entries(base.uso)
        .map(([k, n]) => [NOMBRE_USO[k] || k, n] as [string, number])
        .sort((a, b) => b[1] - a[1]);

    const otros: [string, string][] = Object.entries(base.otros)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => [NOMBRE_OTROS[k] || k, n.toLocaleString('es-MX')]);

    const cuerpo = `
${rotulo(`Semana del ${fecha(v.lunes)} al ${fecha(v.domingo)}`)}
<h2 style="font-family:Georgia,serif;font-size:23px;font-weight:600;color:${PALETA.tinta};margin:0 0 6px 0;">Salud de Iurexia</h2>
<p style="margin:0 0 24px 0;font-family:${SANS};font-size:11px;color:${PALETA.apagado};">
  Cortado el domingo a las 21:00, hora de Ciudad de México. La cifra del domingo cubre hasta esa hora.
</p>

${tarjetas([
    { valor: pesos(st.mrr_total), pie: 'Ingreso mensual' },
    { valor: String(st.suscriptores_activos), pie: 'Suscriptores' },
    { valor: (neto >= 0 ? '+' : '') + neto, pie: 'Neto de la semana', tono: neto > 0 ? 'bien' : neto < 0 ? 'mal' : undefined },
    { valor: base.registros.toLocaleString('es-MX'), pie: 'Registros nuevos' },
])}

<h3 style="font-family:Georgia,serif;font-size:17px;font-weight:600;color:${PALETA.tinta};margin:0 0 12px 0;">Dinero</h3>
${filas([
    ['Pagaron esta semana', `${st.altas.length} &nbsp;·&nbsp; ${pesos(mrrAlta)}/mes`],
    ['Dejaron de pagar', `${st.bajas.length} &nbsp;·&nbsp; ${mrrBaja > 0 ? '−' + pesos(mrrBaja) + '/mes' : '—'}`],
    ['Cancelación anunciada (aún activos)', String(st.bajas_anunciadas)],
    ['Cobros fallidos', String(st.cobros_fallidos)],
    ['Ingreso mensual recurrente', pesos(st.mrr_total)],
], true)}

<h3 style="font-family:Georgia,serif;font-size:17px;font-weight:600;color:${PALETA.tinta};margin:0 0 12px 0;">Altas y activación</h3>
${filas([
    ['Se registraron', String(base.registros)],
    ['De ésos, llegaron a consultar', `${base.registros_activados} (${activacion}%)`],
    ['Se registraron y siguen sin pagar', String(base.registros_sin_pago)],
    ['Conversión a plan de pago', `${conversion}%`],
    ['Usuarios activos en la semana', String(base.usuarios_activos)],
    ['Consultas atendidas', base.consultas.toLocaleString('es-MX')],
])}

<h3 style="font-family:Georgia,serif;font-size:17px;font-weight:600;color:${PALETA.tinta};margin:0 0 12px 0;">En qué se usa</h3>
${usos.length ? barras(usos) : `<p style="font-family:Georgia,serif;font-size:14px;color:${PALETA.apagado};">Sin consultas esta semana.</p>`}
${otros.length ? `<p style="margin:0 0 10px 0;font-family:${SANS};font-size:10px;letter-spacing:1.4px;color:${PALETA.marron};text-transform:uppercase;">Fuera del chat</p>${filas(otros)}` : ''}

<h3 style="font-family:Georgia,serif;font-size:17px;font-weight:600;color:${PALETA.tinta};margin:0 0 6px 0;">A un paso de pagar</h3>
<p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:14px;color:${PALETA.texto};">
  Gratuitos que esta semana agotaron o casi agotaron sus cinco consultas. Es el
  segmento más caliente que existe: ya chocaron con el muro.
</p>
${listaPersonas(base.en_el_muro, 'Nadie llegó al límite esta semana.')}

<h3 style="font-family:Georgia,serif;font-size:17px;font-weight:600;color:${PALETA.tinta};margin:0 0 6px 0;">Se registraron y no pasaron a pago</h3>
<p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:14px;color:${PALETA.texto};">
  ${base.registros_sin_pago} personas. Los que ya probaron y los que se quedaron
  en la puerta son dos campañas distintas; el dato viaja completo en la tabla.
</p>
${listaPersonas(base.sin_pago, 'Ningún registro sin pago esta semana.')}
`;

    return envolver({
        cuerpo,
        pie: 'Parte interno de Iurexia. Las cifras de dinero se leen de Stripe; las de uso, de la propia plataforma.',
    });
}

// ── Orquestación ─────────────────────────────────────────────────────────────

export interface Resultado {
    ok: boolean;
    semana: string;
    guardado: boolean;
    enviado: boolean;
    destino?: string[];
    error?: string;
    resumen?: Record<string, unknown>;
    html?: string;
}

/**
 * Junta, guarda y manda. En ese orden, y a propósito: si Resend falla, la
 * medición de la semana ya está en la tabla y no se pierde.
 */
export async function generarReporteSalud(
    { ahora = new Date(), enviar = true }: { ahora?: Date; enviar?: boolean } = {},
): Promise<Resultado> {
    const v = ventanaSemana(ahora);
    const sb = admin();

    const { data: base, error: eBase } = await sb.rpc('reporte_salud_datos', {
        p_inicio: v.inicio.toISOString(),
        p_fin: v.fin.toISOString(),
    });
    if (eBase) return { ok: false, semana: v.lunes, guardado: false, enviado: false, error: `Supabase: ${eBase.message}` };

    const b = base as DatosBase;
    const st = await leerStripe(v);

    const mrrAlta = Math.round(st.altas.reduce((a, m) => a + m.importe, 0) * 100) / 100;
    const mrrBaja = Math.round(st.bajas.reduce((a, m) => a + m.importe, 0) * 100) / 100;

    // 1. La medición, primero.
    const { error: eGuardar } = await sb.from('reportes_salud').upsert({
        semana_inicio: v.lunes,
        semana_fin: v.domingo,
        generado_at: new Date().toISOString(),
        registros: b.registros,
        registros_activados: b.registros_activados,
        registros_sin_pago: b.registros_sin_pago,
        altas_pago: st.altas.length,
        bajas_efectivas: st.bajas.length,
        bajas_anunciadas: st.bajas_anunciadas,
        cobros_fallidos: st.cobros_fallidos,
        mrr_alta_mxn: mrrAlta,
        mrr_baja_mxn: mrrBaja,
        mrr_total_mxn: st.mrr_total,
        suscriptores_activos: st.suscriptores_activos,
        usuarios_activos: b.usuarios_activos,
        consultas: b.consultas,
        uso: { ...b.uso, otros: b.otros },
        detalle: { sin_pago: b.sin_pago, en_el_muro: b.en_el_muro, altas: st.altas, bajas: st.bajas },
    }, { onConflict: 'semana_inicio' });

    const html = componerCorreo(v, b, st);
    const resumen = {
        registros: b.registros, activados: b.registros_activados, sin_pago: b.registros_sin_pago,
        altas_pago: st.altas.length, bajas: st.bajas.length, mrr: st.mrr_total,
        consultas: b.consultas, usuarios_activos: b.usuarios_activos, uso: b.uso,
    };

    if (!enviar) {
        return { ok: !eGuardar, semana: v.lunes, guardado: !eGuardar, enviado: false, error: eGuardar?.message, resumen, html };
    }

    // 2. Y luego el correo.
    const clave = process.env.RESEND_API_KEY;
    if (!clave) return { ok: false, semana: v.lunes, guardado: !eGuardar, enviado: false, error: 'RESEND_API_KEY sin configurar', resumen };

    const { error: eCorreo } = await new Resend(clave).emails.send({
        from: process.env.FROM_EMAIL_REPORTES || 'Iurexia <soporte@iurexia.com>',
        to: DESTINO,
        subject: `Salud de Iurexia · semana del ${fecha(v.lunes)} al ${fecha(v.domingo)}`,
        html,
    });

    return {
        ok: !eGuardar && !eCorreo,
        semana: v.lunes,
        guardado: !eGuardar,
        enviado: !eCorreo,
        destino: DESTINO,
        error: eGuardar?.message || (eCorreo ? String(eCorreo.message) : undefined),
        resumen,
    };
}
