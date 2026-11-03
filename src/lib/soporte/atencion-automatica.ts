/**
 * LA ATENCIÓN AUTOMÁTICA (2-nov-2026) · lo que corre /api/cron/atencion cada 10 minutos.
 *
 * David lo aprobó como fase 2 del soporte: que quien reporta un problema
 * reciba diagnóstico y solución por correo sin esperar días. La auditoría de
 * ese día: 90 casos en 14 días, casi ninguno resuelto sin una persona, y la
 * respuesta real tardó una mediana de 4.8 días.
 *
 * Cada vuelta:
 *   1. Toma los `reportes_soporte` PENDIENTES que llevan veinte minutos quietos
 *      (la conversación terminó) y no tienen diagnóstico.
 *   2. Los diagnostica (`diagnostico.ts`, sólo lectura) y anota el resultado
 *      en `atencion_casos`, con el correo que le tocaría.
 *   3. Sólo en modo `enviar`, y sólo si su plantilla está APROBADA por sha256
 *      en `plantillas_soporte`, le escribe: desde «Soporte de Iurexia
 *      <soporte@iurexia.com>», con respuesta a soporte@, un correo por caso, y
 *      el reporte pasa a «respondido».
 *   4. Arma el PARTE para David —cada caso, su diagnóstico y el correo que se
 *      mandaría o se mandó— y lo manda a soporte@ y a jdm.juridico@, a lo más
 *      cada tres horas y sólo con casos nuevos.
 *
 * LO QUE GARANTIZA QUE NO SE LE ESCRIBA A NADIE ANTES DE TIEMPO, en capas:
 *   · El modo por omisión es `simulacro`. Sólo ATENCION_MODO=enviar, escrito
 *     así, enciende el envío.
 *   · En simulacro la ruta ni siquiera crea el cliente de correo para usuarios:
 *     `correoUsuarios` llega null, y `enviarAlUsuario` lo vuelve a comprobar.
 *   · Una plantilla sin fila aprobada (aprobada_at y aprobada_por) con SU hash
 *     exacto no sale. Cambiar una coma cambia el hash y la vuelve a frenar.
 *   · Lo que no es seguro (`tipo: 'humano'`, confianza bajo el umbral) no tiene
 *     plantilla: no hay nada que mandar.
 *   · Un correo por caso: se «reclama» la fila antes de mandar
 *     (`envio_reclamado_at`) y la clave de idempotencia de Resend es la del caso.
 *     Y uno por persona cada 24 h, aunque abra varias conversaciones.
 *   · El parte sólo puede ir a la casa: `soloInternos` lo comprueba.
 *
 * Ninguna llamada a modelos. Sin la migración, devuelve { sinTabla: true } y
 * no hace nada.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { diagnosticar, type Diagnostico, type LectorStripe } from './diagnostico';
import { pintar, saludoPara, REMITENTE_ATENCION, RESPONDER_A, type CorreoPintado, type Huella } from './plantillas-atencion';
import { enviarConReintento, turnosDelHilo, CORREO_SOPORTE, REMITENTE_SOPORTE, type ClienteCorreo, type Correo } from './aviso';
import { MINUTOS_QUIETA } from './atencion-logica';
import { DESTINOS_RESUMEN } from './reportes';
import { esPrueba } from '../correo/segmentos';
import { PALETA, esc, envolver, rotulo } from '../correo/plantilla';
import { nombrePlan, type Hechos, type IdPlantilla } from './diagnostico-reglas';

export const TABLA_CASOS = 'atencion_casos';
export const TABLA_PLANTILLAS = 'plantillas_soporte';

/** Casos nuevos por vuelta: cada uno puede leer el cobro dos veces. */
export const CASOS_POR_VUELTA = 15;
/** Más viejo que esto no se diagnostica: ya lo vio (o lo verá) el resumen diario. */
export const DIAS_DIAGNOSTICO = 7;
/** Más viejo que esto no recibe correo solo: los hechos de 24–48 h ya no son los de su reporte. */
export const DIAS_ENVIO = 3;
export const HORAS_ENTRE_PARTES = 3;
export const HORAS_UN_CORREO_POR_PERSONA = 24;

/** A dónde va el parte. Sólo la casa. */
export const DESTINOS_INTERNOS: readonly string[] = DESTINOS_RESUMEN;

export type ModoAtencion = 'simulacro' | 'enviar' | 'apagado';

/** Sólo «enviar», escrito así, manda correos. Cualquier otra cosa —o nada— es simulacro. */
export function modoAtencion(valor: string | null | undefined = process.env.ATENCION_MODO): ModoAtencion {
    const v = (valor || '').trim();
    if (v === 'enviar') return 'enviar';
    if (v === 'apagado') return 'apagado';
    return 'simulacro';
}

export function soloInternos(destinos: readonly string[]): boolean {
    return destinos.length > 0 && destinos.every(d => DESTINOS_INTERNOS.includes(d.trim().toLowerCase()));
}

export interface FilaReporte {
    folio: string;
    origen: string;
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    plan: string | null;
    primer_mensaje: string | null;
    hilo: string | null;
    turnos: number;
    creado_at: string;
    ultimo_turno_at: string;
    estado: string;
    escalado: boolean;
}

const COLUMNAS_REPORTE = 'folio, origen, user_id, user_email, user_name, plan, primer_mensaje, hilo, turnos, creado_at, ultimo_turno_at, estado, escalado';

export type EstadoEnvio = 'no-se-envia' | 'por-enviar' | 'enviando' | 'enviado' | 'fallido';

export interface FilaCaso {
    folio: string;
    user_id: string | null;
    user_email: string | null;
    canal: 'chat' | 'correo';
    tipo: string;
    clasificado: string;
    regla: string;
    diagnostico: string;
    accion: string;
    plantilla_id: IdPlantilla | null;
    plantilla_version: number | null;
    plantilla_sha256: string | null;
    /** El correo es un borrador para el parte: nunca se manda. */
    borrador: boolean;
    variables: Record<string, unknown>;
    hechos: Hechos;
    confianza: number;
    modo: ModoAtencion;
    turnos_diagnosticados: number;
    mensaje: string;
    correo_asunto: string | null;
    correo_texto: string | null;
    envio_estado: EstadoEnvio;
    envio_motivo: string | null;
    envio_reclamado_at: string | null;
    correo_enviado_at: string | null;
    correo_resend_id: string | null;
    correo_error: string | null;
    parte_at: string | null;
    diagnosticado_at: string;
}

export interface DependenciasCron {
    sb: SupabaseClient;
    stripe: LectorStripe | null;
    /** Sólo existe en modo «enviar». En simulacro es null: no hay con qué escribirle a nadie. */
    correoUsuarios: ClienteCorreo | null;
    /** Para el parte a la casa. */
    correoInterno: ClienteCorreo | null;
    modo: ModoAtencion;
    ahora?: number;
    forzarParte?: boolean;
    /** Las pruebas no esperan los 600 ms entre correos. */
    dormir?: (ms: number) => Promise<void>;
}

/** ¿Falta la tabla? Entonces la migración no se ha aplicado: no se hace nada. */
export function faltaTabla(error: { code?: string; message?: string } | null | undefined, tabla: string): boolean {
    if (!error) return false;
    return error.code === '42P01' || error.code === 'PGRST205'
        || (new RegExp(tabla).test(error.message || '') && /does not exist|schema cache|Could not find/i.test(error.message || ''));
}

/**
 * Lo que escribió el abogado en toda la conversación, sin las respuestas del
 * asistente (que abren con «le ayudo con la plataforma, su plan…» y harían
 * creer que todo es de cobro). Un renglón por turno: un escrito pegado llega
 * con decenas de saltos de línea, y el clasificador lo aparta por turno.
 */
export function textoDelUsuario(r: Pick<FilaReporte, 'primer_mensaje' | 'hilo'>): string {
    const unRenglon = (s: string) => s.replace(/\s+/g, ' ').trim();
    const lineas = turnosDelHilo(r.hilo).filter(t => t.rol === 'usuario').map(t => unRenglon(t.texto)).filter(Boolean);
    const primero = unRenglon(r.primer_mensaje || '');
    // El hilo guarda 700 caracteres por turno; el primer mensaje, 2,000: manda el más largo.
    const i = primero ? lineas.findIndex(l => primero.startsWith(l.slice(0, 200))) : -1;
    if (i >= 0) lineas[i] = primero;
    else if (primero) lineas.unshift(primero);
    return Array.from(new Set(lineas)).join('\n').slice(0, 6000);
}

/* ─────────────────────────── las plantillas aprobadas ─────────────────────────── */

export interface Aprobadas {
    porHash: Map<string, { id: string; version: number; por: string }>;
    error: string | null;
}

export async function leerAprobadas(sb: SupabaseClient): Promise<Aprobadas> {
    const { data, error } = await sb.from(TABLA_PLANTILLAS)
        .select('id, version, sha256, aprobada_at, aprobada_por').not('aprobada_at', 'is', null);
    const porHash = new Map<string, { id: string; version: number; por: string }>();
    if (error) return { porHash, error: faltaTabla(error, TABLA_PLANTILLAS) ? 'falta la tabla plantillas_soporte' : error.message };
    for (const f of (data ?? []) as Array<{ id: string; version: number; sha256: string; aprobada_at: string | null; aprobada_por: string | null }>) {
        if (!f.aprobada_at || !(f.aprobada_por || '').trim()) continue;
        porHash.set(f.sha256, { id: f.id, version: f.version, por: f.aprobada_por!.trim() });
    }
    return { porHash, error: null };
}

/** El hash aprobado tiene que ser el de ESTA plantilla, no el de otra con el mismo texto. */
export function estaAprobada(a: Aprobadas, h: Huella | null | undefined): boolean {
    if (!h) return false;
    const fila = a.porHash.get(h.sha256);
    return !!fila && fila.id === h.id && fila.version === h.version;
}

/* ─────────────────────────── componer el correo ─────────────────────────── */

export interface Composicion {
    correo: CorreoPintado | null;
    plantilla: IdPlantilla | null;
    borrador: boolean;
    error: string | null;
}

/** El correo del caso: el que se manda o, si lo ve una persona, el borrador para el parte. */
export function componerCorreo(d: Diagnostico, r: Pick<FilaReporte, 'folio' | 'user_email' | 'user_name' | 'creado_at'>): Composicion {
    const plantilla = d.plantilla ?? d.borrador?.plantilla ?? null;
    if (!plantilla) return { correo: null, plantilla: null, borrador: false, error: null };
    const variables = d.plantilla ? d.variables : d.borrador!.variables;
    const p = d.hechos.perfil;
    try {
        const correo = pintar(plantilla, {
            ...variables,
            folio: r.folio,
            saludo: saludoPara(p?.nombre ?? r.user_name, p?.tratamiento ?? null, r.user_email ?? ''),
            fecha_reporte: r.creado_at,
        });
        return { correo, plantilla, borrador: !d.plantilla, error: null };
    } catch (e) {
        return { correo: null, plantilla, borrador: !d.plantilla, error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
    }
}

/** Por qué este caso NO recibe correo, o null si puede recibirlo. */
export function motivoParaNoEnviar(o: {
    modo: ModoAtencion; d: Diagnostico; c: Composicion; r: FilaReporte; aprobadas: Aprobadas;
    ahora: number; yaRecibieron: Set<string>;
}): string | null {
    const correo = (o.r.user_email || '').trim().toLowerCase();
    if (o.d.tipo === 'acuse') return 'nada que contestar';
    if (o.d.tipo === 'humano' || !o.d.plantilla) return 'lo ve una persona';
    if (o.c.error || !o.c.correo) return `la plantilla no se pudo pintar: ${o.c.error ?? 'sin correo'}`;
    if (!correo) return 'el reporte no tiene correo';
    if (esPrueba(correo)) return 'cuenta de prueba';
    if (o.ahora - Date.parse(o.r.creado_at) > DIAS_ENVIO * 86400_000) return `reporte de hace más de ${DIAS_ENVIO} días`;
    if (o.yaRecibieron.has(correo)) return `ya recibió una respuesta automática en ${HORAS_UN_CORREO_POR_PERSONA} h`;
    if (!estaAprobada(o.aprobadas, o.c.correo.plantilla)) {
        return `plantilla ${o.c.correo.plantilla.id} v${o.c.correo.plantilla.version} sin aprobar (${o.c.correo.plantilla.sha256.slice(0, 12)}…)`;
    }
    if (o.modo !== 'enviar') return 'simulacro';
    return null;
}

/**
 * El único sitio que le escribe a un usuario. Vuelve a comprobar todo lo que
 * ya comprobó quien la llama: el modo, el cliente y la aprobación.
 */
export async function enviarAlUsuario(
    deps: Pick<DependenciasCron, 'modo' | 'correoUsuarios' | 'dormir'>,
    caso: { folio: string; correo: string; pintado: CorreoPintado },
    aprobadas: Aprobadas,
) {
    if (deps.modo !== 'enviar' || !deps.correoUsuarios) {
        return { ok: false, id: null, intentos: 0, via: null, error: 'no está en modo enviar' } as const;
    }
    if (!estaAprobada(aprobadas, caso.pintado.plantilla)) {
        return { ok: false, id: null, intentos: 0, via: null, error: 'plantilla sin aprobar' } as const;
    }
    // Con copia oculta a soporte@: en su buzón queda lo que se le dijo, en el
    // mismo hilo que el aviso del reporte (misma cabecera References).
    const mensaje: Correo & { bcc: string[] } = {
        to: [caso.correo],
        bcc: [CORREO_SOPORTE],
        subject: caso.pintado.asunto,
        html: caso.pintado.html,
        text: caso.pintado.texto,
        replyTo: RESPONDER_A,
        headers: { References: `<reporte-${caso.folio}@iurexia.com>`, 'X-Iurexia-Folio': caso.folio },
    };
    return enviarConReintento(deps.correoUsuarios, mensaje, {
        idempotencia: `atencion/${caso.folio}/${caso.pintado.plantilla.sha256.slice(0, 16)}`,
        remitente: REMITENTE_ATENCION,
        // Sin remitente de respaldo: al usuario sólo se le escribe desde soporte@.
        respaldo: '',
        dormir: deps.dormir,
    });
}

/* ─────────────────────────── la vuelta ─────────────────────────── */

export interface ResultadoCaso {
    folio: string;
    tipo: string;
    plantilla: string | null;
    confianza: number;
    envio: EstadoEnvio;
    motivo: string | null;
}

export async function atenderPendientes(deps: DependenciasCron) {
    const { sb, modo } = deps;
    const ahora = deps.ahora ?? Date.now();
    const iso = (t: number) => new Date(t).toISOString();
    if (modo === 'apagado') return { modo, apagado: true };
    // En simulacro no hay cliente para usuarios, aunque alguien lo haya pasado.
    const deps2: DependenciasCron = { ...deps, correoUsuarios: modo === 'enviar' ? deps.correoUsuarios : null };

    const { data: pendientes, error } = await sb.from('reportes_soporte').select(COLUMNAS_REPORTE)
        .eq('estado', 'pendiente')
        .lte('ultimo_turno_at', iso(ahora - MINUTOS_QUIETA * 60_000))
        .gte('ultimo_turno_at', iso(ahora - DIAS_DIAGNOSTICO * 86400_000))
        .order('ultimo_turno_at', { ascending: true })
        .limit(100);
    if (faltaTabla(error, 'reportes_soporte')) return { modo, sinTabla: 'reportes_soporte' };
    if (error) return { modo, error: error.message };
    const candidatos = (pendientes ?? []) as FilaReporte[];

    const folios = candidatos.map(r => r.folio);
    const diagnosticados = new Set<string>();
    if (folios.length) {
        const { data: ya, error: e2 } = await sb.from(TABLA_CASOS).select('folio').in('folio', folios);
        if (faltaTabla(e2, TABLA_CASOS)) return { modo, sinTabla: TABLA_CASOS };
        if (e2) return { modo, error: e2.message };
        for (const f of (ya ?? []) as Array<{ folio: string }>) diagnosticados.add(f.folio);
    }
    const nuevos = candidatos.filter(r => !diagnosticados.has(r.folio)).slice(0, CASOS_POR_VUELTA);

    const aprobadas = await leerAprobadas(sb);

    const yaRecibieron = new Set<string>();
    {
        const { data } = await sb.from(TABLA_CASOS).select('user_email')
            .gte('correo_enviado_at', iso(ahora - HORAS_UN_CORREO_POR_PERSONA * 3600_000));
        for (const f of (data ?? []) as Array<{ user_email: string | null }>) if (f.user_email) yaRecibieron.add(f.user_email.toLowerCase());
    }

    const casos: ResultadoCaso[] = [];
    for (const r of nuevos) {
        const d = await diagnosticar({
            userId: r.user_id, email: r.user_email || '', texto: textoDelUsuario(r),
            canal: r.origen === 'correo' ? 'correo' : 'chat', referenciaAt: r.creado_at,
        }, { sb, stripe: deps.stripe, ahora });
        const c = componerCorreo(d, r);
        const motivo = motivoParaNoEnviar({ modo, d, c, r, aprobadas, ahora, yaRecibieron });

        const fila: FilaCaso = {
            folio: r.folio, user_id: r.user_id, user_email: r.user_email,
            canal: r.origen === 'correo' ? 'correo' : 'chat',
            tipo: d.tipo, clasificado: d.clasificado, regla: d.regla, diagnostico: d.diagnostico, accion: d.accion,
            plantilla_id: c.plantilla, plantilla_version: c.correo?.plantilla.version ?? null,
            plantilla_sha256: c.correo?.plantilla.sha256 ?? null, borrador: c.borrador,
            variables: d.plantilla ? d.variables : d.borrador?.variables ?? {}, hechos: d.hechos,
            confianza: Math.round(d.confianza * 100) / 100, modo, turnos_diagnosticados: r.turnos,
            mensaje: textoDelUsuario(r).slice(0, 1000),
            correo_asunto: c.correo?.asunto ?? null, correo_texto: c.correo?.texto ?? null,
            envio_estado: motivo ? 'no-se-envia' : 'por-enviar', envio_motivo: motivo,
            envio_reclamado_at: null, correo_enviado_at: null, correo_resend_id: null, correo_error: c.error,
            parte_at: null, diagnosticado_at: iso(ahora),
        };
        // ignoreDuplicates: si otra vuelta ya lo diagnosticó, ésta no lo pisa ni le escribe.
        const { data: insertada, error: e3 } = await sb.from(TABLA_CASOS)
            .upsert(fila, { onConflict: 'folio', ignoreDuplicates: true }).select('folio');
        if (e3) { casos.push({ folio: r.folio, tipo: d.tipo, plantilla: c.plantilla, confianza: d.confianza, envio: 'fallido', motivo: `no se pudo anotar: ${e3.message}` }); continue; }
        if (!(insertada as unknown[] | null)?.length) continue;

        let envio: EstadoEnvio = fila.envio_estado;
        let motivoFinal = motivo;
        if (!motivo && c.correo) {
            // Reclamar antes de mandar: nunca dos correos por caso. La base
            // también lo vigila: su disparador rechaza el reclamo si no es modo
            // «enviar» o si la plantilla no está aprobada en esa versión exacta.
            const { data: reclamo, error: eReclamo } = await sb.from(TABLA_CASOS)
                .update({ envio_reclamado_at: iso(ahora), envio_estado: 'enviando' })
                .eq('folio', r.folio).is('envio_reclamado_at', null).select('folio');
            if (eReclamo) {
                envio = 'fallido';
                motivoFinal = `la base rechazó el envío: ${eReclamo.message}`.slice(0, 300);
                await sb.from(TABLA_CASOS).update({ envio_estado: 'fallido', correo_error: motivoFinal }).eq('folio', r.folio);
            } else if ((reclamo as unknown[] | null)?.length) {
                const res = await enviarAlUsuario(deps2, { folio: r.folio, correo: r.user_email!.trim().toLowerCase(), pintado: c.correo }, aprobadas);
                if (res.ok) {
                    envio = 'enviado';
                    yaRecibieron.add(r.user_email!.trim().toLowerCase());
                    await sb.from(TABLA_CASOS).update({
                        envio_estado: 'enviado', correo_enviado_at: iso(ahora), correo_resend_id: res.id, correo_error: null,
                    }).eq('folio', r.folio);
                    // Contestar ES marcarlo: si el abogado responde, el Apps Script lo reabre.
                    await sb.from('reportes_soporte').update({
                        estado: 'respondido', respondido_at: iso(ahora), respondido_por: 'atencion-automatica', actualizado_at: iso(ahora),
                    }).eq('folio', r.folio).eq('estado', 'pendiente');
                } else {
                    envio = 'fallido';
                    motivoFinal = res.error;
                    await sb.from(TABLA_CASOS).update({ envio_estado: 'fallido', correo_error: (res.error || 'desconocido').slice(0, 300) })
                        .eq('folio', r.folio);
                }
                await (deps.dormir ?? (ms => new Promise(ok => setTimeout(ok, ms))))(600);   // Resend: 2/s
            }
        }
        casos.push({ folio: r.folio, tipo: d.tipo, plantilla: c.plantilla, confianza: d.confianza, envio, motivo: motivoFinal });
    }

    const parte = await mandarParte(deps2, aprobadas, ahora);
    return {
        modo,
        aprobadas: aprobadas.error ? { error: aprobadas.error } : aprobadas.porHash.size,
        candidatos: candidatos.length,
        ya_diagnosticados: diagnosticados.size,
        nuevos: nuevos.length,
        enviados: casos.filter(c => c.envio === 'enviado').length,
        casos,
        parte,
    };
}

/* ─────────────────────────── el parte ─────────────────────────── */

const SANS = 'Arial,Helvetica,sans-serif';

/** Los hechos en una línea, para leerlos de un vistazo. */
export function resumenHechos(h: Hechos): string {
    const partes: string[] = [];
    const p = h.perfil;
    if (p) {
        partes.push(`plan ${nombrePlan(p.plan)}`, `${p.consultasUsadas}/${p.consultasLimite} consultas${p.consultasRecargadas ? ` (+${p.consultasRecargadas} recargadas)` : ''}`);
        if (p.suspendidoAt) partes.push(`suspendida desde ${p.suspendidoAt.slice(0, 10)}`);
        if (p.impagoDesde) partes.push(`impago desde ${p.impagoDesde.slice(0, 10)}`);
    } else partes.push('sin perfil');
    if (h.bloqueo) partes.push(`BLOQUEADA (${h.bloqueo.motivo})`);
    if (h.gemelas.length) partes.push(`gemelas: ${h.gemelas.map(g => `${g.correoOculto} ${nombrePlan(g.plan)}`).join(', ')}`);
    if (h.stripe) {
        const s = h.stripe.suscripcion;
        partes.push(!h.stripe.consultado ? `cobro: sin leer (${h.stripe.error})`
            : !h.stripe.cliente ? 'cobro: sin cliente'
                : s ? `cobro: ${s.estado} ${nombrePlan(s.planId)}${s.cancelaAlFinal ? ' (cancelada)' : ''}, factura ${s.factura?.estado ?? '—'}${h.stripe.porCorreo ? ', hallado por correo' : ''}`
                    : 'cobro: cliente sin suscripción');
    }
    if (h.auth) partes.push(`sesiones 24 h: ${h.auth.inicios} inicios (${h.auth.inicios_sin_renovar} sin renovar), ${h.auth.renovaciones} renov., máx ${h.auth.max_por_minuto}/min${h.auth.vida_mediana_s !== null ? `, vida ${h.auth.vida_mediana_s}s` : ''}`);
    if (h.reloj) partes.push(`reloj del correo: ${h.reloj.desfaseMinutos} min`);
    if (h.respuestas) partes.push(`respuestas 48 h: ${h.respuestas.map(r => `${r.estado}${r.guardada ? '' : '·sin guardar'}·${r.largo}c`).join(', ') || 'ninguna'}`);
    if (h.erroresDocumento) partes.push(`errores de documento: ${h.erroresDocumento.map(e => e.causa).join(', ') || 'ninguno'}`);
    if (h.faltantes.length) partes.push(`NO SE LEYÓ: ${h.faltantes.join('; ')}`);
    return partes.join(' · ');
}

const ETIQUETA_ENVIO: Record<EstadoEnvio, string> = {
    'no-se-envia': 'no se envía', 'por-enviar': 'por enviar', enviando: 'enviándose', enviado: 'ENVIADO', fallido: 'el envío FALLÓ',
};

export function armarParte(casos: FilaCaso[], o: { modo: ModoAtencion; aprobadas: Aprobadas; ahora: number }) {
    const porTipo = new Map<string, number>();
    for (const c of casos) porTipo.set(c.tipo, (porTipo.get(c.tipo) ?? 0) + 1);
    const enviados = casos.filter(c => c.envio_estado === 'enviado').length;
    // Los que tienen respuesta automática lista (no un borrador): son los que saldrían al aprobar su plantilla.
    const listos = casos.filter(c => c.correo_texto && !c.borrador).length;

    const asunto = o.modo === 'enviar'
        ? `[Soporte] Atención automática: ${casos.length} ${casos.length === 1 ? 'caso' : 'casos'}, ${enviados} ${enviados === 1 ? 'correo enviado' : 'correos enviados'}`
        : `[Soporte] Atención automática (simulacro): ${casos.length} ${casos.length === 1 ? 'caso' : 'casos'}, ${listos} con respuesta lista`;

    const bloque = (c: FilaCaso) => {
        const plantilla = c.plantilla_id
            ? `${c.plantilla_id} v${c.plantilla_version ?? '?'} (${(c.plantilla_sha256 || '').slice(0, 12)}…)${c.borrador ? ' · borrador, no se manda' : ''}`
            : '—';
        const envio = `${ETIQUETA_ENVIO[c.envio_estado]}${c.envio_motivo ? `: ${c.envio_motivo}` : ''}`;
        const correo = c.correo_texto
            ? `<div style="margin-top:8px;padding:10px 12px;background:${PALETA.cremaFondo};border:1px solid ${PALETA.borde};font-family:${SANS};font-size:12px;color:${PALETA.texto};white-space:pre-wrap;">` +
              `<strong>${esc(c.correo_asunto)}</strong>\n\n${esc(c.correo_texto.slice(0, 2500))}</div>`
            : '';
        return `<tr><td style="padding:12px 0;border-top:1px solid ${PALETA.borde};font-family:${SANS};font-size:13px;line-height:1.5;color:${PALETA.texto};vertical-align:top;">
            <strong>Folio ${esc(c.folio)}</strong> · ${esc(c.user_email || '—')} · ${esc(c.canal)} · <strong>${esc(c.tipo)}</strong>${c.clasificado !== c.tipo ? ` (leído como ${esc(c.clasificado)})` : ''} · confianza ${c.confianza.toFixed(2)}<br>
            <span style="color:${PALETA.marron};">Diagnóstico:</span> ${esc(c.diagnostico)}<br>
            <span style="color:${PALETA.marron};">Acción:</span> ${esc(c.accion)} · <span style="color:${PALETA.marron};">Plantilla:</span> ${esc(plantilla)}<br>
            <span style="color:${PALETA.marron};">Correo:</span> ${esc(envio)}<br>
            <span style="color:${PALETA.marron};">Escribió:</span> «${esc(c.mensaje.replace(/\s+/g, ' ').slice(0, 260))}»<br>
            <span style="color:${PALETA.marron};">Hechos:</span> <span style="font-size:12px;">${esc(resumenHechos(c.hechos))}</span>
            ${correo}
        </td></tr>`;
    };

    const aprobadas = o.aprobadas.error
        ? `No se pudo leer plantillas_soporte (${o.aprobadas.error}): ninguna plantilla cuenta como aprobada.`
        : o.aprobadas.porHash.size
            ? `Plantillas aprobadas: ${Array.from(o.aprobadas.porHash.values()).map(a => `${a.id} v${a.version}`).join(', ')}.`
            : 'Todavía no hay ninguna plantilla aprobada: no sale ningún correo a usuarios.';

    const cuerpo = [
        rotulo('Soporte · atención automática'),
        `<div style="font-family:Georgia,serif;font-size:21px;color:${PALETA.tinta};padding-bottom:14px;">${esc(asunto.replace('[Soporte] ', ''))}</div>`,
        `<p style="font-family:${SANS};font-size:13px;color:${PALETA.apagado};margin:0 0 10px;">Modo <strong>${esc(o.modo)}</strong>. ${esc(aprobadas)} ` +
        `Para aprobar una plantilla, en Supabase: <code>update public.plantillas_soporte set aprobada_at = now(), aprobada_por = 'David' where id = 'T4' and version = 1;</code></p>`,
        `<p style="font-family:${SANS};font-size:13px;margin:0 0 14px;">${Array.from(porTipo.entries()).map(([k, v]) => `${esc(k)}: <strong>${v}</strong>`).join(' · ')}</p>`,
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${casos.map(bloque).join('')}</table>`,
        `<p style="font-family:${SANS};font-size:12px;color:#777;margin-top:18px;">Soporte de Iurexia · parte interno, no se reenvía a usuarios.</p>`,
    ].join('\n');

    const texto = [
        asunto.replace('[Soporte] ', ''), '', `Modo ${o.modo}. ${aprobadas}`, '',
        ...casos.flatMap(c => [
            `· Folio ${c.folio} · ${c.user_email || '—'} · ${c.tipo} · ${c.confianza.toFixed(2)}`,
            `  ${c.diagnostico}`, `  Acción: ${c.accion}`, `  Correo: ${ETIQUETA_ENVIO[c.envio_estado]}${c.envio_motivo ? `: ${c.envio_motivo}` : ''}`,
            ...(c.correo_asunto ? [`  Asunto: ${c.correo_asunto}`] : []), '',
        ]),
        'Soporte de Iurexia',
    ].join('\n');

    return { asunto, html: envolver({ cuerpo }), texto };
}

async function mandarParte(deps: DependenciasCron, aprobadas: Aprobadas, ahora: number) {
    const { sb } = deps;
    const { data, error } = await sb.from(TABLA_CASOS).select('*').is('parte_at', null)
        .order('diagnosticado_at', { ascending: true }).limit(60);
    if (error) return { error: error.message };
    const casos = (data ?? []) as FilaCaso[];
    if (!casos.length) return { toca: false, motivo: 'nada nuevo' };

    if (!deps.forzarParte) {
        const { data: ultimo } = await sb.from(TABLA_CASOS).select('parte_at').not('parte_at', 'is', null)
            .order('parte_at', { ascending: false }).limit(1);
        const ultimoAt = (ultimo as Array<{ parte_at: string }> | null)?.[0]?.parte_at;
        if (ultimoAt && ahora - Date.parse(ultimoAt) < HORAS_ENTRE_PARTES * 3600_000) {
            return { toca: false, motivo: `el último salió hace menos de ${HORAS_ENTRE_PARTES} h`, pendientes: casos.length };
        }
    }
    const parte = armarParte(casos, { modo: deps.modo, aprobadas, ahora });
    if (!deps.correoInterno) return { toca: true, enviado: false, motivo: 'sin RESEND_API_KEY', casos: casos.length, asunto: parte.asunto };

    const destinos = [...DESTINOS_INTERNOS];
    if (!soloInternos(destinos)) return { toca: true, enviado: false, motivo: 'destinos fuera de la casa' };
    const res = await enviarConReintento(deps.correoInterno, { to: destinos, subject: parte.asunto, html: parte.html, text: parte.texto }, {
        idempotencia: `parte-atencion/${casos[0].folio}/${casos[casos.length - 1].folio}/${casos.length}`,
        remitente: REMITENTE_SOPORTE,
        dormir: deps.dormir,
    });
    if (res.ok) {
        await sb.from(TABLA_CASOS).update({ parte_at: new Date(ahora).toISOString() }).in('folio', casos.map(c => c.folio));
    }
    return { toca: true, enviado: res.ok, error: res.error, casos: casos.length, asunto: parte.asunto };
}

/** La vista previa del parte de lo que aún no se ha reportado, sin mandar ni marcar nada. */
export async function vistaDelParte(sb: SupabaseClient, modo: ModoAtencion, ahora = Date.now()) {
    const { data, error } = await sb.from(TABLA_CASOS).select('*').is('parte_at', null)
        .order('diagnosticado_at', { ascending: true }).limit(60);
    if (error) return { error: error.message };
    return armarParte((data ?? []) as FilaCaso[], { modo, aprobadas: await leerAprobadas(sb), ahora });
}

/** Un folio, de prueba: lo diagnostica y pinta su correo. No escribe nada en ninguna parte. */
export async function diagnosticarFolio(sb: SupabaseClient, stripe: LectorStripe | null, folio: string, ahora = Date.now()) {
    const { data, error } = await sb.from('reportes_soporte').select(COLUMNAS_REPORTE).eq('folio', folio).limit(1);
    if (error) return { error: error.message };
    const r = (data as FilaReporte[] | null)?.[0];
    if (!r) return { error: `no existe el folio ${folio}` };
    const d = await diagnosticar({
        userId: r.user_id, email: r.user_email || '', texto: textoDelUsuario(r),
        canal: r.origen === 'correo' ? 'correo' : 'chat', referenciaAt: r.creado_at,
    }, { sb, stripe, ahora });
    const c = componerCorreo(d, r);
    const aprobadas = await leerAprobadas(sb);
    return {
        folio, diagnostico: d, plantilla: c.correo?.plantilla ?? null, aprobada: estaAprobada(aprobadas, c.correo?.plantilla),
        borrador: c.borrador, error: c.error, correo: c.correo ? { asunto: c.correo.asunto, texto: c.correo.texto, html: c.correo.html } : null,
    };
}
