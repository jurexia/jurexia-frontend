/**
 * EL LIBRO DE REPORTES DE SOPORTE (29-oct-2026).
 *
 * Una fila de `reportes_soporte` por CONVERSACIÓN —no por mensaje, como en
 * `user_feedback`—, con dos cosas que hasta hoy no existían en ninguna parte:
 *
 *   · si a soporte@ le llegó el aviso (`aviso_at`, `aviso_error`), y
 *   · en qué está la atención: pendiente → respondido → cerrado.
 *
 * Las reglas viven en `atencion-logica.ts`; aquí sólo se lee y se escribe.
 *
 * SIN LA MIGRACIÓN (`supabase_reportes_soporte.sql`) NADA SE ROMPE: el chat
 * sigue guardando en `user_feedback` y avisando de lo escalado, ahora con
 * reintento; sólo faltan el aviso de lo no escalado, el estado y el resumen.
 * Cada función devuelve `{ sinTabla: true }` en vez de lanzar.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
    esConversacionNueva, debeAvisar, aplicarObservacion, motivoDeCierre, prioridad,
    HORAS_PENDIENTE_RESUMEN, MAXIMO_INTENTOS_AVISO, DIAS_AVISO_INDIVIDUAL,
    type Observacion, type ReporteAtencion, type Cambio,
} from './atencion-logica';
import {
    enviarConReintento, correoDeAviso, claveDeAviso, turnosDelHilo, CORREO_SOPORTE, REMITENTE_SOPORTE,
    type ClienteCorreo, type ResultadoEnvio,
} from './aviso';

export const TABLA = 'reportes_soporte';

/** El resumen va a los dos buzones: si uno falla, el otro lo ve. */
export const DESTINOS_RESUMEN = [CORREO_SOPORTE, 'jdm.juridico@gmail.com'];

type Sb = SupabaseClient;

export interface FilaReporte extends ReporteAtencion {
    sesion: string | null;
    user_id: string | null;
    user_name: string | null;
    plan: string | null;
    feedback_ids: string[];
    primer_mensaje: string | null;
    hilo: string | null;
    motivo: string | null;
    delicado: boolean;
    aviso_error: string | null;
    cierre_motivo: string | null;
}

/** ¿El error es que la tabla aún no existe? Entonces se sigue como antes. */
export function faltaLaTabla(error: { code?: string; message?: string } | null | undefined): boolean {
    if (!error) return false;
    return error.code === '42P01' || error.code === 'PGRST205'
        || /reportes_soporte/.test(error.message || '') && /does not exist|schema cache|Could not find/i.test(error.message || '');
}

const ahoraIso = () => new Date().toISOString();

/* ───────────────────────── 1. cada mensaje del chat ───────────────────────── */

export interface Turno {
    userId: string;
    email: string | null;
    nombre: string | null;
    plan: string | null;
    sesion: string | null;
    /** Folio de ESTE mensaje en user_feedback. */
    folio: string | null;
    feedbackId: string | null;
    /** Mensajes del usuario que lleva la conversación, contando éste. */
    turnos: number;
    mensaje: string;
    /** El hilo completo hasta este mensaje, como se guarda en user_feedback. */
    hilo: string | null;
    escalado: boolean;
    motivo: string | null;
    delicado: boolean;
}

/**
 * Asienta el mensaje en su conversación y devuelve el folio de la
 * conversación (el de su primer mensaje). Si la conversación ya estaba
 * respondida y el abogado vuelve a escribir, regresa a «pendiente».
 */
export async function registrarTurno(sb: Sb, t: Turno): Promise<{ folio: string; nuevo: boolean } | { sinTabla: true } | null> {
    const correo = (t.email || '').trim().toLowerCase() || null;
    let previo: FilaReporte | null = null;

    if (t.sesion) {
        const { data, error } = await sb.from(TABLA).select('*')
            .eq('user_id', t.userId).eq('sesion', t.sesion).maybeSingle();
        if (faltaLaTabla(error)) return { sinTabla: true };
        if (error) throw new Error(error.message);
        previo = (data as FilaReporte | null) ?? null;
    } else {
        // Navegador con la página vieja: sin identificador de conversación.
        const { data, error } = await sb.from(TABLA).select('*')
            .eq('user_id', t.userId).is('sesion', null)
            .order('ultimo_turno_at', { ascending: false }).limit(1).maybeSingle();
        if (faltaLaTabla(error)) return { sinTabla: true };
        if (error) throw new Error(error.message);
        const ultimo = (data as FilaReporte | null) ?? null;
        previo = ultimo && !esConversacionNueva(ultimo, { at: ahoraIso(), turnos: t.turnos }) ? ultimo : null;
    }

    if (previo) {
        const cambios: Record<string, unknown> = {
            turnos: Math.max(previo.turnos, t.turnos),
            ultimo_turno_at: ahoraIso(),
            folios: t.folio && !previo.folios.includes(t.folio) ? previo.folios.concat(t.folio) : previo.folios,
            feedback_ids: t.feedbackId ? previo.feedback_ids.concat(t.feedbackId) : previo.feedback_ids,
            hilo: t.hilo ?? previo.hilo,
            escalado: previo.escalado || t.escalado,
            motivo: t.escalado ? t.motivo : previo.motivo,
            delicado: previo.delicado || t.delicado,
            plan: t.plan ?? previo.plan,
            user_email: correo ?? previo.user_email,
            actualizado_at: ahoraIso(),
        };
        // Volvió a escribir: lo respondido o cerrado se reabre.
        if (previo.estado !== 'pendiente') {
            cambios.estado = 'pendiente';
            cambios.usuario_volvio_at = ahoraIso();
            cambios.cerrado_at = null;
            cambios.cierre_motivo = null;
        }
        const { error } = await sb.from(TABLA).update(cambios).eq('folio', previo.folio);
        if (error) throw new Error(error.message);
        return { folio: previo.folio, nuevo: false };
    }

    const folio = t.folio || `R-${(t.feedbackId || Date.now().toString(36)).slice(0, 8)}`;
    const { error } = await sb.from(TABLA).insert({
        folio,
        sesion: t.sesion,
        origen: 'chat',
        user_id: t.userId,
        user_email: correo,
        user_name: t.nombre,
        plan: t.plan,
        folios: t.folio ? [t.folio] : [],
        feedback_ids: t.feedbackId ? [t.feedbackId] : [],
        turnos: t.turnos,
        primer_mensaje: t.mensaje.slice(0, 2000),
        hilo: t.hilo,
        escalado: t.escalado,
        motivo: t.motivo,
        delicado: t.delicado,
    });
    if (faltaLaTabla(error)) return { sinTabla: true };
    if (error && error.code === '23505' && t.sesion) {
        // Dos peticiones de la misma conversación a la vez: la otra la creó.
        return registrarTurno(sb, t);
    }
    if (error) throw new Error(error.message);
    return { folio, nuevo: true };
}

/** Anota cómo fue el envío del aviso. */
export async function anotarAviso(sb: Sb, folio: string, turnos: number, r: ResultadoEnvio, intentosPrevios = 0) {
    const cambios: Record<string, unknown> = r.ok
        ? {
            aviso_at: ahoraIso(), aviso_turnos: turnos, aviso_via: r.via,
            aviso_resend_id: r.id, aviso_error: null, aviso_intentos: intentosPrevios + r.intentos,
            actualizado_at: ahoraIso(),
        }
        : { aviso_error: (r.error || 'desconocido').slice(0, 500), aviso_intentos: intentosPrevios + Math.max(1, r.intentos), actualizado_at: ahoraIso() };
    const { error } = await sb.from(TABLA).update(cambios).eq('folio', folio);
    if (error && !faltaLaTabla(error)) console.error('[reportes] no pude anotar el aviso de', folio, error.message);
}

/* ───────────────────── 2. el barrido: avisar de lo que falta ───────────────────── */

/** Tope por vuelta y por persona: un usuario no puede llenar el buzón abriendo conversaciones. */
const AVISOS_POR_VUELTA = 25;
const AVISOS_POR_PERSONA = 4;

export async function barrerAvisos(sb: Sb, resend: ClienteCorreo | null, simulacro: boolean) {
    const desde = new Date(Date.now() - DIAS_AVISO_INDIVIDUAL * 86400_000).toISOString();
    const { data, error } = await sb.from(TABLA).select('*')
        .neq('estado', 'cerrado')
        .gte('ultimo_turno_at', desde)
        .order('ultimo_turno_at', { ascending: true })
        .limit(300);
    if (faltaLaTabla(error)) return { sinTabla: true };
    if (error) return { error: error.message };

    const porPersona = new Map<string, number>();
    const enviados: Array<{ folio: string; tipo: string; ok: boolean; error?: string | null }> = [];
    for (const r of (data ?? []) as FilaReporte[]) {
        if (enviados.length >= AVISOS_POR_VUELTA) break;
        const tipo = debeAvisar(r);
        if (!tipo) continue;
        const quien = r.user_email || r.user_id || r.folio;
        const n = porPersona.get(quien) ?? 0;
        if (n >= AVISOS_POR_PERSONA) continue;
        porPersona.set(quien, n + 1);

        const datos = {
            folio: r.folio, folios: r.folios,
            correo: r.user_email, nombre: r.user_name, userId: r.user_id, plan: r.plan,
            conversacion: turnosDelHilo(r.hilo),
            motivo: r.escalado
                ? (r.motivo || 'Soporte no pudo resolverlo')
                : tipo === 'continuacion' ? 'Conversación con el asistente (continuación)' : 'Conversación con el asistente',
            // Una escalada que el chat no pudo avisar se reintenta como escalada.
            tipo: r.escalado && !r.aviso_at ? 'escalado' as const : tipo === 'continuacion' ? 'continuacion' as const : 'asistente' as const,
            turnos: r.turnos,
            delicado: r.delicado,
        };
        if (simulacro) { enviados.push({ folio: r.folio, tipo, ok: true }); continue; }

        const res = await enviarConReintento(resend, correoDeAviso(datos), {
            idempotencia: claveDeAviso(datos), remitente: REMITENTE_SOPORTE,
        });
        await anotarAviso(sb, r.folio, r.turnos, res, r.aviso_intentos);
        enviados.push({ folio: r.folio, tipo, ok: res.ok, error: res.error });
        await new Promise(ok => setTimeout(ok, 600));
    }
    return {
        avisados: enviados.filter(e => e.ok).length,
        fallidos: enviados.filter(e => !e.ok).length,
        detalle: enviados,
    };
}

/* ───────────────────── 3. lo que se ve en el buzón de soporte@ ───────────────────── */

export async function aplicarObservaciones(sb: Sb, observaciones: Observacion[]) {
    const folios = Array.from(new Set(observaciones.flatMap(o => o.folios)));
    const correos = Array.from(new Set(observaciones.flatMap(o => o.correos.map(c => c.trim().toLowerCase()))));
    const desde = new Date(Date.now() - 45 * 86400_000).toISOString();

    const candidatos = new Map<string, FilaReporte>();
    const base = () => sb.from(TABLA).select('*').neq('estado', 'cerrado').gte('creado_at', desde).limit(500);
    const tandas: Array<PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>> = [];
    for (let i = 0; i < folios.length; i += 100) tandas.push(base().overlaps('folios', folios.slice(i, i + 100)));
    for (let i = 0; i < correos.length; i += 100) tandas.push(base().in('user_email', correos.slice(i, i + 100)));
    for (const tanda of tandas) {
        const { data, error } = await tanda;
        if (faltaLaTabla(error)) return { sinTabla: true };
        if (error) return { error: error.message };
        for (const r of (data ?? []) as FilaReporte[]) candidatos.set(r.folio, r);
    }

    const ordenadas = [...observaciones].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
    const cambios: Array<{ folio: string; estado: string }> = [];
    const candidatosLista = Array.from(candidatos.values());
    for (const original of candidatosLista) {
        let r: FilaReporte = { ...original };
        let acumulado: Cambio | null = null;
        for (const o of ordenadas) {
            const c = aplicarObservacion(r, o);
            if (!c) continue;
            r = { ...r, ...c } as FilaReporte;
            acumulado = { ...(acumulado ?? {}), ...c };
        }
        if (!acumulado) continue;
        const { error } = await sb.from(TABLA)
            .update({ ...acumulado, respondido_por: acumulado.respondido_at ? CORREO_SOPORTE : undefined, actualizado_at: ahoraIso() })
            .eq('folio', r.folio);
        if (error) return { error: error.message };
        cambios.push({ folio: r.folio, estado: r.estado });
    }
    return { observaciones: observaciones.length, reportes_vistos: candidatos.size, cambios };
}

/* ───────────────────── 4. el cierre solo ───────────────────── */

interface Cruce {
    familia: Map<string, { familia: string | null; clase: string | null }>;
    cerradoPanel: Set<string>;
    cerradoCircuito: Set<string>;
}

/** Lo que dicen de cada reporte el panel (user_feedback) y el circuito (incidencias). */
async function cruzar(sb: Sb, reportes: FilaReporte[]): Promise<Cruce> {
    const cruce: Cruce = { familia: new Map(), cerradoPanel: new Set(), cerradoCircuito: new Set() };
    const deFeedback = new Map<string, string>();
    for (const r of reportes) for (const id of r.feedback_ids || []) deFeedback.set(id, r.folio);
    const ids = Array.from(deFeedback.keys());
    for (let i = 0; i < ids.length; i += 100) {
        const tramo = ids.slice(i, i + 100);
        const [fb, inc] = await Promise.all([
            sb.from('user_feedback').select('id, status').in('id', tramo),
            sb.from('incidencias').select('origen_id, familia, clase, cierre_at').eq('origen', 'reporte').in('origen_id', tramo),
        ]);
        for (const f of (fb.data ?? []) as Array<{ id: string; status: string }>) {
            if (f.status === 'resuelto' || f.status === 'descartado') cruce.cerradoPanel.add(deFeedback.get(f.id)!);
        }
        for (const x of (inc.data ?? []) as Array<{ origen_id: string; familia: string | null; clase: string | null; cierre_at: string | null }>) {
            const folio = deFeedback.get(x.origen_id)!;
            if (x.cierre_at) cruce.cerradoCircuito.add(folio);
            // De varias, la que más pesa (un fallo manda sobre una duda de uso).
            const previa = cruce.familia.get(folio);
            if (!previa || prioridad(x.familia, null) < prioridad(previa.familia, null)) {
                cruce.familia.set(folio, { familia: x.familia, clase: x.clase });
            }
        }
    }
    return cruce;
}

async function abiertos(sb: Sb, dias: number) {
    const desde = new Date(Date.now() - dias * 86400_000).toISOString();
    const filas: FilaReporte[] = [];
    for (let desdeFila = 0; desdeFila < 3000; desdeFila += 1000) {
        const { data, error } = await sb.from(TABLA).select('*')
            .neq('estado', 'cerrado').gte('creado_at', desde)
            .order('creado_at', { ascending: true }).order('folio', { ascending: true })
            .range(desdeFila, desdeFila + 999);
        if (error) return { error };
        filas.push(...((data ?? []) as FilaReporte[]));
        if (!data || data.length < 1000) break;
    }
    return { filas };
}

export async function cerrarSolos(sb: Sb, simulacro: boolean) {
    const { filas, error } = await abiertos(sb, 60);
    if (faltaLaTabla(error)) return { sinTabla: true };
    if (error) return { error: error.message };
    const cruce = await cruzar(sb, filas!);
    const cerrados: Array<{ folio: string; motivo: string }> = [];
    for (const r of filas!) {
        const motivo = motivoDeCierre(r, {
            cerradoEnPanel: cruce.cerradoPanel.has(r.folio),
            cerradoPorCircuito: cruce.cerradoCircuito.has(r.folio),
        });
        if (!motivo) continue;
        cerrados.push({ folio: r.folio, motivo });
        if (simulacro) continue;
        await sb.from(TABLA).update({
            estado: 'cerrado', cerrado_at: ahoraIso(), cierre_motivo: motivo, actualizado_at: ahoraIso(),
        }).eq('folio', r.folio);
    }
    return { cerrados };
}

/* ───────────────────── 5. el resumen diario ───────────────────── */

function esc(s: string | null | undefined): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ETIQUETA_FAMILIA: Record<string, string> = {
    defecto: 'Fallo', calidad: 'Calidad de respuesta', soporte: 'Uso, plan o cobro',
    mejora: 'Mejora', encuesta: 'Encuesta', 'buzon-equivocado': 'Consulta jurídica en soporte',
};

export interface Resumen {
    asunto: string;
    html: string;
    texto: string;
    pendientes: number;
    avisos_fallidos: number;
}

const DETALLE_MAXIMO = 40;

export async function armarResumen(sb: Sb, ahora = Date.now()): Promise<Resumen | { sinTabla: true } | { error: string }> {
    const { filas, error } = await abiertos(sb, 30);
    if (faltaLaTabla(error)) return { sinTabla: true };
    if (error) return { error: error.message };
    const cruce = await cruzar(sb, filas!);

    const limite = ahora - HORAS_PENDIENTE_RESUMEN * 3600_000;
    const pendientes = filas!.filter(r => r.estado === 'pendiente'
        && Date.parse(r.usuario_volvio_at || r.creado_at) <= limite);
    const fallidos = filas!.filter(r => !r.aviso_at && r.aviso_error && r.aviso_via !== 'historico');
    const agotados = fallidos.filter(r => r.aviso_intentos >= MAXIMO_INTENTOS_AVISO).length;
    const respondidos = filas!.filter(r => r.estado === 'respondido').length;

    const fam = (r: FilaReporte) => cruce.familia.get(r.folio)?.familia ?? null;
    pendientes.sort((a, b) => prioridad(fam(a), a.plan) - prioridad(fam(b), b.plan)
        || Date.parse(a.creado_at) - Date.parse(b.creado_at));

    const dias = (r: FilaReporte) => Math.floor((ahora - Date.parse(r.usuario_volvio_at || r.creado_at)) / 86400_000);
    const porFamilia = new Map<string, number>();
    for (const r of pendientes) {
        const k = ETIQUETA_FAMILIA[fam(r) ?? ''] ?? 'Sin clasificar';
        porFamilia.set(k, (porFamilia.get(k) ?? 0) + 1);
    }

    const SANS = 'Arial,Helvetica,sans-serif';
    const fila = (r: FilaReporte) => {
        const f = cruce.familia.get(r.folio);
        const etiqueta = ETIQUETA_FAMILIA[f?.familia ?? ''] ?? 'Sin clasificar';
        // Antes del 29-oct sólo avisaba lo escalado: lo demás nunca llegó a soporte@.
        const sinAviso = r.aviso_at ? ''
            : r.aviso_via === 'historico' ? (r.escalado ? '' : ' · nunca llegó a soporte@')
            : r.aviso_error ? ' · <strong>el aviso no salió</strong>'
            : ' · aviso en camino';
        const volvio = r.usuario_volvio_at ? ' · volvió a escribir tras la respuesta' : '';
        return `<tr><td style="padding:9px 0;border-top:1px solid #e8e6e0;font-family:${SANS};font-size:13px;vertical-align:top;">
            <strong>Folio ${esc(r.folio)}</strong> · ${esc(r.user_email || '—')} · ${esc(r.plan || 'gratuito')}<br>
            <span style="color:#8b7355;">${esc(etiqueta)}${f?.clase ? ` (${esc(f.clase)})` : ''} · hace ${dias(r)} d${r.escalado ? ' · escalado' : ''}${sinAviso}${volvio}</span><br>
            <span style="color:#404040;">${esc((r.primer_mensaje || '').replace(/\s+/g, ' ').slice(0, 220))}</span>
        </td></tr>`;
    };

    const asunto = pendientes.length
        ? `[Soporte] ${pendientes.length} ${pendientes.length === 1 ? 'reporte lleva' : 'reportes llevan'} más de ${HORAS_PENDIENTE_RESUMEN} h sin respuesta`
        : `[Soporte] ${fallidos.length} ${fallidos.length === 1 ? 'aviso no salió' : 'avisos no salieron'}`;

    const partes: string[] = [];
    partes.push(`<div style="font-family:${SANS};font-size:10px;letter-spacing:2px;color:#8b7355;text-transform:uppercase;padding-bottom:10px;">Soporte · resumen diario</div>`);
    partes.push(`<div style="font-family:Georgia,serif;font-size:21px;color:#1a1a1a;padding-bottom:14px;">${esc(asunto.replace('[Soporte] ', ''))}</div>`);
    partes.push(`<p style="font-family:${SANS};font-size:13px;color:#404040;margin:0 0 14px;">` +
        `Un reporte pasa a respondido cuando sale un correo de soporte@ al abogado o que cite su folio, ` +
        `y se cierra solo tres días después si el abogado no vuelve a escribir. Lo que nadie contesta no se cierra: sigue saliendo aquí.</p>`);
    if (porFamilia.size) {
        partes.push(`<p style="font-family:${SANS};font-size:13px;margin:0 0 14px;">` +
            Array.from(porFamilia.entries()).map(([k, v]) => `${esc(k)}: <strong>${v}</strong>`).join(' · ') + '</p>');
    }
    if (fallidos.length) {
        partes.push(`<p style="font-family:${SANS};font-size:13px;color:#982830;margin:0 0 14px;">` +
            `${fallidos.length} ${fallidos.length === 1 ? 'aviso no llegó' : 'avisos no llegaron'} a soporte@ ` +
            `(${agotados} ya sin más reintentos). Último error: ${esc(fallidos[fallidos.length - 1].aviso_error)}</p>`);
    }
    if (pendientes.length) {
        partes.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${pendientes.slice(0, DETALLE_MAXIMO).map(fila).join('')}</table>`);
        if (pendientes.length > DETALLE_MAXIMO) {
            partes.push(`<p style="font-family:${SANS};font-size:12px;color:#404040;">Y ${pendientes.length - DETALLE_MAXIMO} más, de menor prioridad.</p>`);
        }
    }
    partes.push(`<p style="font-family:${SANS};font-size:12px;color:#777;margin-top:18px;">` +
        `Respondidos a la espera de cierre: ${respondidos}. Soporte de Iurexia.</p>`);

    const html = `<div style="max-width:640px;margin:0 auto;color:#1a1a1a;">${partes.join('\n')}</div>`;
    const texto = [
        asunto.replace('[Soporte] ', ''),
        '',
        ...Array.from(porFamilia.entries()).map(([k, v]) => `${k}: ${v}`),
        fallidos.length ? `\nAvisos que no llegaron: ${fallidos.length}` : '',
        '',
        ...pendientes.slice(0, DETALLE_MAXIMO).map(r =>
            `· Folio ${r.folio} · ${r.user_email || '—'} · hace ${dias(r)} d · ${(r.primer_mensaje || '').replace(/\s+/g, ' ').slice(0, 140)}`),
        '',
        'Soporte de Iurexia',
    ].join('\n');

    return { asunto, html, texto, pendientes: pendientes.length, avisos_fallidos: fallidos.length };
}

const ASUNTO_RESUMEN = 'resumen-reportes';
/** 14:00 UTC = 8:00 en la Ciudad de México (sin horario de verano desde 2022). */
export const HORA_RESUMEN_UTC = 14;

/**
 * El resumen sale una vez al día, en la primera vuelta del cron a partir de
 * las 8:00 de México. Si esa vuelta falla, lo reintenta la siguiente: sólo se
 * da por hecho cuando queda asentado en `avisos_infraestructura`.
 */
export async function resumenDelDia(
    sb: Sb, resend: ClienteCorreo | null,
    opciones: { simulacro: boolean; forzar?: boolean; ahora?: Date },
) {
    const ahora = opciones.ahora ?? new Date();
    if (!opciones.forzar && ahora.getUTCHours() < HORA_RESUMEN_UTC) return { toca: false, motivo: 'antes de las 8:00' };
    const dia = ahora.toISOString().slice(0, 10);
    const inicio = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())).toISOString();
    if (!opciones.forzar) {
        const { data } = await sb.from('avisos_infraestructura').select('id')
            .eq('asunto', ASUNTO_RESUMEN).gte('enviado_at', inicio).limit(1);
        if (data?.length) return { toca: false, motivo: 'ya salió hoy' };
    }

    const resumen = await armarResumen(sb, ahora.getTime());
    if ('sinTabla' in resumen || 'error' in resumen) return resumen;

    // Un resumen que llega todos los días diciendo «cero» se deja de leer.
    if (!resumen.pendientes && !resumen.avisos_fallidos) {
        if (!opciones.simulacro) {
            await sb.from('avisos_infraestructura').insert({ asunto: ASUNTO_RESUMEN, detalle: { dia, enviado: false, pendientes: 0 } });
        }
        return { toca: true, enviado: false, motivo: 'nada pendiente' };
    }
    if (opciones.simulacro) return { toca: true, enviado: false, simulacro: true, asunto: resumen.asunto, pendientes: resumen.pendientes };

    const res = await enviarConReintento(resend, {
        to: DESTINOS_RESUMEN, subject: resumen.asunto, html: resumen.html, text: resumen.texto,
    }, { idempotencia: `resumen-reportes/${dia}${opciones.forzar ? `/${Date.now()}` : ''}`, remitente: REMITENTE_SOPORTE });
    if (res.ok) {
        await sb.from('avisos_infraestructura').insert({
            asunto: ASUNTO_RESUMEN,
            detalle: { dia, enviado: true, pendientes: resumen.pendientes, avisos_fallidos: resumen.avisos_fallidos, resend_id: res.id },
        });
    } else {
        console.error('[reportes] el resumen diario no salió:', res.error);
    }
    return { toca: true, enviado: res.ok, error: res.error, pendientes: resumen.pendientes };
}
