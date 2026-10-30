/**
 * EL AVISO A soporte@, con reintento y remitente de respaldo (29-oct-2026).
 *
 * Hasta hoy el chat de soporte mandaba el aviso con
 * `try { await resend.emails.send(...); return true } catch { return false }`.
 * Pero Resend NO lanza cuando rechaza un correo: devuelve `{ error }`. Un 429
 * por ráfaga, una cuota agotada o un remitente rechazado pasaban por «enviado»
 * y el reporte se perdía sin una línea en el registro. En los 30 días medidos
 * no ocurrió ni una vez —los 21 avisos que se intentaron están en el buzón—,
 * pero era cuestión de tiempo, y es justo el fallo que no se ve.
 *
 * Ahora:
 *   · se mira `error`, no la excepción;
 *   · lo pasajero (429, 5xx, red) se reintenta dos veces más, con espera;
 *   · si Resend rechaza el remitente, se prueba con el de las campañas;
 *   · cada intento lleva la misma clave de idempotencia, para que un
 *     reintento —o el cron que recoge lo que falló— nunca duplique el aviso;
 *   · lo que aun así no sale queda anotado en `reportes_soporte` y el cron
 *     lo vuelve a intentar cada 15 minutos (ver `reportes.ts`).
 *
 * Los correos a soporte@ no se firman como persona: los manda «Soporte
 * Iurexia» y hablan en plural.
 */

import type { Resend } from 'resend';

export const CORREO_SOPORTE = 'soporte@iurexia.com';
export const REMITENTE_SOPORTE = 'Soporte Iurexia <soporte@iurexia.com>';

export interface TurnoAviso { rol: 'usuario' | 'soporte'; texto: string }

export type TipoDeAviso = 'escalado' | 'asistente' | 'continuacion';

export interface DatosAviso {
    folio: string | null;
    /** Los folios de cada mensaje de la conversación, por si el abogado cita otro. */
    folios?: string[];
    correo?: string | null;
    nombre?: string | null;
    userId?: string | null;
    plan?: string | null;
    navegador?: string | null;
    conversacion: TurnoAviso[];
    /** Título del correo: «Soporte no pudo resolverlo», «Conversación con el asistente»… */
    motivo: string;
    tipo: TipoDeAviso;
    /** Mensajes del abogado que lleva la conversación (para la clave de idempotencia). */
    turnos?: number;
    /** Tema de cobro, cancelación o acceso que el asistente no escaló. */
    delicado?: boolean;
}

/** El hilo guardado («Usuario: …\nSoporte: …») vuelto turnos, para el aviso. */
export function turnosDelHilo(hilo: string | null): TurnoAviso[] {
    const turnos: TurnoAviso[] = [];
    for (const linea of String(hilo || '').split('\n')) {
        const m = linea.match(/^(Usuario|Soporte): ?(.*)$/);
        if (m) turnos.push({ rol: m[1] === 'Usuario' ? 'usuario' : 'soporte', texto: m[2] });
        else if (turnos.length) turnos[turnos.length - 1].texto += `\n${linea}`;
    }
    return turnos;
}

function escaparHtml(s: string): string {
    return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * El asunto lleva SIEMPRE el folio: es por donde el Apps Script de soporte@
 * reconoce la respuesta y marca el reporte como respondido. Las
 * conversaciones no escaladas usan el mismo asunto en el primer aviso y en
 * sus continuaciones, para que Gmail las junte en un solo hilo.
 */
export function asuntoAviso(d: Pick<DatosAviso, 'motivo' | 'folio' | 'correo' | 'tipo'>): string {
    const titulo = d.tipo === 'escalado' ? d.motivo : 'Conversación con el asistente';
    return `[Soporte] ${titulo}${d.folio ? ` — folio ${d.folio}` : ''} — ${d.correo || 'sin correo'}`;
}

function entradilla(d: DatosAviso): string {
    if (d.tipo === 'escalado') return '';
    const base = d.tipo === 'continuacion'
        ? 'El abogado siguió escribiendo después del aviso anterior. Va la conversación completa.'
        : 'El asistente atendió esta conversación sin escalarla. Se avisa igual: todo reporte llega al equipo.';
    const delicado = d.delicado
        ? ' <strong>Toca cobro, cancelación o acceso</strong>: conviene confirmarlo con una persona.'
        : '';
    return `<p style="font-size:13px;line-height:1.5;color:#444;margin:0 0 16px">${base}${delicado}</p>`;
}

export function htmlAviso(d: DatosAviso): string {
    const hilo = d.conversacion
        .map(t => `<p style="margin:0 0 10px"><strong style="color:${t.rol === 'usuario' ? '#1a1a1a' : '#8a6d2e'}">` +
            `${t.rol === 'usuario' ? 'Usuario' : 'Soporte'}:</strong> ${escaparHtml(t.texto)}</p>`)
        .join('');
    const otros = (d.folios || []).filter(f => f && f !== d.folio);
    const rotulo = d.tipo === 'escalado' ? 'Soporte · escalado automático' : 'Soporte · reporte atendido por el asistente';

    return `
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;color:#1a1a1a">
  <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6d2e;margin:0 0 6px">${rotulo}</p>
  <h2 style="font-family:Georgia,serif;font-size:19px;margin:0 0 14px">${escaparHtml(d.motivo)}${d.folio ? ` — folio ${escaparHtml(d.folio)}` : ''}</h2>
  ${entradilla(d)}
  <table style="font-size:13px;border-collapse:collapse;margin-bottom:18px">
    <tr><td style="padding:3px 14px 3px 0;color:#666">Usuario</td><td>${escaparHtml(d.nombre || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">Correo</td><td><a href="mailto:${escaparHtml(d.correo || '')}">${escaparHtml(d.correo || '—')}</a></td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">Plan</td><td>${escaparHtml(d.plan || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">ID</td><td style="font-family:monospace;font-size:11px">${escaparHtml(d.userId || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">Navegador</td><td style="font-size:11px">${escaparHtml((d.navegador || '—').slice(0, 120))}</td></tr>
    ${otros.length ? `<tr><td style="padding:3px 14px 3px 0;color:#666">Otros folios</td><td style="font-size:12px">${escaparHtml(otros.join(', '))}</td></tr>` : ''}
  </table>
  <div style="border-left:3px solid #c9a962;padding-left:14px;font-size:13px;line-height:1.6">${hilo}</div>
  <p style="margin-top:20px;font-size:12px;color:#888">
    Responda directamente a este correo: llega al abogado, y el reporte queda como respondido.
    Mientras nadie le conteste, sale en el resumen diario de pendientes.
  </p>
</div>`;
}

export function textoAviso(d: DatosAviso): string {
    const lineas = [
        `${d.motivo}${d.folio ? ` — folio ${d.folio}` : ''}`,
        '',
        `Usuario: ${d.nombre || '—'}`,
        `Correo: ${d.correo || '—'}`,
        `Plan: ${d.plan || '—'}`,
        `ID: ${d.userId || '—'}`,
        '',
        ...d.conversacion.map(t => `${t.rol === 'usuario' ? 'Usuario' : 'Soporte'}: ${t.texto}`),
        '',
        'Responda directamente a este correo: llega al abogado.',
    ];
    return lineas.join('\n');
}

/* ─────────────────────────── el envío ─────────────────────────── */

export interface Correo {
    to: string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    headers?: Record<string, string>;
}

export interface ResultadoEnvio {
    ok: boolean;
    id: string | null;
    intentos: number;
    /** 'principal' = soporte@; 'respaldo' = el remitente de las campañas. */
    via: 'principal' | 'respaldo' | null;
    /** Resend ya tenía este envío con la misma clave: salió antes, no se duplica. */
    duplicado?: boolean;
    error: string | null;
}

/** Lo único de Resend que hace falta; así las pruebas le pasan un doble. */
export type ClienteCorreo = Pick<Resend, 'emails'>;

/** Errores que no se arreglan reintentando con la misma cuenta. */
const SIN_REMEDIO = new Set([
    'missing_api_key', 'invalid_api_key', 'restricted_api_key',
    'daily_quota_exceeded', 'monthly_quota_exceeded', 'security_error',
]);
/** Errores del remitente: se prueba con el de respaldo. */
const DE_REMITENTE = new Set(['invalid_from_address', 'invalid_access']);
/** La misma clave ya se usó: otro proceso mandó este mismo aviso. */
const YA_ENVIADO = new Set(['invalid_idempotent_request', 'concurrent_idempotent_requests']);

const dormirPorOmision = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function enviarConReintento(
    cliente: ClienteCorreo | null,
    correo: Correo,
    opciones: {
        idempotencia?: string;
        remitente?: string;
        respaldo?: string;
        /** Esperas entre intentos con el mismo remitente. */
        esperas?: number[];
        dormir?: (ms: number) => Promise<void>;
    } = {},
): Promise<ResultadoEnvio> {
    if (!cliente) return { ok: false, id: null, intentos: 0, via: null, error: 'sin RESEND_API_KEY' };

    const principal = opciones.remitente || REMITENTE_SOPORTE;
    const respaldo = opciones.respaldo ?? (process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>');
    const remitentes: Array<['principal' | 'respaldo', string]> = [['principal', principal]];
    if (respaldo && respaldo !== principal) remitentes.push(['respaldo', respaldo]);
    const esperas = opciones.esperas ?? [800, 2500];
    const dormir = opciones.dormir ?? dormirPorOmision;

    let intentos = 0;
    let ultimo = 'sin intentar';
    // Las cabeceras de hilo son un lujo: si Resend las rechazara, el aviso
    // sale sin ellas antes que no salir.
    let conCabeceras = !!correo.headers;

    for (const [via, from] of remitentes) {
        for (let i = 0; i <= esperas.length; i++) {
            intentos++;
            try {
                const { headers, ...resto } = correo;
                const { data, error } = await cliente.emails.send(
                    { from, ...resto, ...(conCabeceras && headers ? { headers } : {}) },
                    opciones.idempotencia ? { idempotencyKey: `${opciones.idempotencia}/${via}${conCabeceras ? '' : '/s'}` } : undefined,
                );
                if (!error) return { ok: true, id: data?.id ?? null, intentos, via, error: null };
                ultimo = `${error.name}: ${error.message}`;
                if (YA_ENVIADO.has(error.name)) return { ok: true, id: null, intentos, via, duplicado: true, error: null };
                if (SIN_REMEDIO.has(error.name)) return { ok: false, id: null, intentos, via, error: ultimo };
                if (conCabeceras && (error.name === 'validation_error' || error.name === 'invalid_parameter')
                    && /header/i.test(error.message)) {
                    conCabeceras = false;
                    i--;                                       // no cuenta como espera: es otro correo
                    continue;
                }
                if (DE_REMITENTE.has(error.name)) break;     // al remitente de respaldo
                if (error.name === 'validation_error' && /from/i.test(error.message)) break;
                if (error.name === 'validation_error' || error.name === 'invalid_parameter'
                    || error.name === 'missing_required_field') {
                    // Un correo mal formado no mejora con otro remitente ni con espera.
                    return { ok: false, id: null, intentos, via, error: ultimo };
                }
            } catch (e) {
                // Red o tiempo de espera: la petición pudo llegar o no. La clave
                // de idempotencia hace seguro el reintento.
                ultimo = `red: ${e instanceof Error ? e.message : String(e)}`;
            }
            if (i < esperas.length) await dormir(esperas[i]);
        }
    }
    return { ok: false, id: null, intentos, via: null, error: ultimo };
}

/** El aviso de un reporte a soporte@, listo para mandar. */
export function correoDeAviso(d: DatosAviso): Correo {
    return {
        to: [CORREO_SOPORTE],
        replyTo: d.correo || undefined,
        subject: asuntoAviso(d),
        html: htmlAviso(d),
        text: textoAviso(d),
        // Un mismo identificador por reporte: Gmail junta el primer aviso y
        // sus continuaciones aunque cambie algo del cuerpo.
        headers: d.folio ? {
            References: `<reporte-${d.folio}@iurexia.com>`,
            'X-Iurexia-Folio': d.folio,
        } : undefined,
    };
}

export function claveDeAviso(d: Pick<DatosAviso, 'folio' | 'turnos' | 'tipo'>): string | undefined {
    if (!d.folio) return undefined;
    return `aviso-soporte/${d.folio}/${d.turnos ?? 0}/${d.tipo === 'continuacion' ? 'c' : 'p'}`;
}
