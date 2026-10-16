/**
 * EL ESCRITO POR CORREO: el orden de lo que hace el servidor (16-oct-2026).
 *
 * La ruta (/api/correo/escrito) sólo identifica al abogado y conecta esto con
 * Supabase, Resend y el modelo. Lo que decide —y en qué orden— vive aquí, con
 * las dependencias inyectadas, para poder comprobarlo sin red
 * (comprobaciones/correo_escrito.mjs).
 *
 * EL ORDEN ES EL CONTRATO:
 *   1. Se valida TODO antes de gastar: direcciones, asunto, mensaje, adjunto,
 *      que el correo del abogado esté confirmado, el plan y que la carpeta
 *      sea suya. Una petición mal formada no consume nada.
 *   2. Se gasta el envío del día del abogado (`gastarUso('correo')`).
 *   3. Se escribe el renglón «enviando» y SÓLO ENTONCES se mira el cupo de
 *      Resend (cupo.ts): así dos envíos simultáneos se cuentan el uno al otro
 *      y ninguno se come la reserva de altas y contraseñas.
 *   4. Sale por Resend y el renglón queda «enviado» o «fallido» con su error.
 * Si no sale —sin cupo, sin llave, Resend falla—, el envío del día se le
 * devuelve al abogado: no se le cobra lo que no recibió su cliente.
 */

import { LIMITES, escalonDe, mensajeLimite, type FuncionDespacho } from '../uso-funciones-config';
import { LIMITES_RESEND, margenDeEscritos, unidadesDe, type Consumo, type Limites } from './cupo';
import {
    armarCorreo, destinatariosFinales, encargoDePropuesta, esDocx, nombreDeFirma, propuestaDe,
    remitenteDe, validarEnvio,
} from './escrito';

export const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface Abogado {
    id: string;
    plan: string;
    nombre: string | null;
    /** El correo de su cuenta: a él van la respuesta del cliente y la copia. */
    correo: string | null;
    correoConfirmado: boolean;
}

export interface Respuesta {
    status: number;
    cuerpo: Record<string, unknown>;
}

export interface ResultadoGasto {
    permitido: boolean;
    mensaje?: string;
}

export interface CorreoParaResend {
    from: string;
    to: string[];
    cc?: string[];
    replyTo: string;
    subject: string;
    html: string;
    text: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
    tags: { name: string; value: string }[];
}

export interface DependenciasEnvio {
    gastar: (funcion: FuncionDespacho) => Promise<ResultadoGasto>;
    devolver: (funcion: FuncionDespacho) => Promise<void>;
    carpetaEsSuya: (expedienteId: string) => Promise<boolean>;
    /** Escribe el renglón «enviando»; null si no se pudo. */
    reservar: (fila: {
        expediente_id: string | null; para: string[]; cc: string[]; asunto: string; cuerpo: string;
        adjunto_nombre: string | null; adjunto_bytes: number | null;
    }) => Promise<{ id: string } | null>;
    marcar: (id: string, cambios: { estado: 'enviado' | 'fallido'; resend_id?: string | null; error?: string | null }) => Promise<void>;
    consumo: () => Promise<Consumo>;
    /** Sin llave no se intenta (y el renglón queda «fallido»). */
    hayLlave: boolean;
    enviar: (correo: CorreoParaResend, idempotencia: string) => Promise<{ id: string } | { error: string }>;
    /** `CORREO_ESCRITOS_FROM`. */
    remitente?: string | null;
    limites?: Limites;
    ahora?: () => Date;
}

const AMABLE_SERVICIO = 'No se pudo enviar el correo en este momento. No se gastó tu envío del día: vuelve a intentarlo en unos minutos.';
const AMABLE_CUPO = 'Hoy ya no quedan envíos de correo disponibles en Iurexia. No se gastó tu envío del día: vuelve a intentarlo mañana.';
const SIN_CONFIRMAR = 'Confirma tu correo para enviar escritos desde Iurexia: es la dirección a la que tu cliente responderá.';

/** Lo que el diálogo necesita antes de empezar (GET). */
export function datosDeEnvio(a: Abogado, remitente: string | null | undefined, usados: number | null) {
    const escalon = escalonDe(a.plan);
    const limite = LIMITES.correo.por[escalon];
    const de = remitenteDe(a.nombre, a.correo, remitente);
    return {
        de: de.cabecera,
        de_nombre: de.nombre,
        de_correo: de.correo,
        responder_a: a.correo,
        firma: nombreDeFirma(a.nombre, a.correo),
        escalon,
        limite,
        usados,
        disponible: limite > 0,
        mensaje: limite > 0 ? null : mensajeLimite('correo', escalon),
        correo_confirmado: a.correoConfirmado,
    };
}

function sinPlan(a: Abogado): Respuesta | null {
    const escalon = escalonDe(a.plan);
    if (LIMITES.correo.por[escalon] > 0) return null;
    return { status: 403, cuerpo: { error: mensajeLimite('correo', escalon), codigo: 'plan', escalon } };
}

export async function enviarEscrito(a: Abogado, cuerpo: unknown, d: DependenciasEnvio): Promise<Respuesta> {
    // ── 1. TODO SE VALIDA ANTES DE GASTAR ───────────────────────────────
    const v = validarEnvio(cuerpo);
    if (!v.ok) return { status: 400, cuerpo: { error: v.error, campo: v.campo } };
    const envio = v.envio;
    if (!a.correo) return { status: 400, cuerpo: { error: 'Tu cuenta no tiene un correo al que tu cliente pueda responder.', codigo: 'sin_correo' } };
    if (!a.correoConfirmado) return { status: 403, cuerpo: { error: SIN_CONFIRMAR, codigo: 'correo_sin_confirmar' } };
    const plan = sinPlan(a);
    if (plan) return plan;

    let contenido: Buffer | null = null;
    if (envio.adjunto) {
        contenido = Buffer.from(envio.adjunto.base64, 'base64');
        if (contenido.length !== envio.adjunto.bytes || !esDocx(contenido)) {
            return { status: 400, cuerpo: { error: 'El adjunto no es un documento de Word válido.', campo: 'adjunto' } };
        }
    }
    if (envio.expedienteId && !(await d.carpetaEsSuya(envio.expedienteId))) {
        return { status: 404, cuerpo: { error: 'Esa carpeta no existe o no es tuya.', campo: 'expediente_id' } };
    }

    const { to, cc } = destinatariosFinales(envio.para, envio.copiaParaMi, a.correo);
    const firma = nombreDeFirma(a.nombre, a.correo);
    const de = remitenteDe(a.nombre, a.correo, d.remitente);
    const { html, texto } = armarCorreo({
        firma,
        asunto: envio.asunto,
        mensaje: envio.mensaje,
        adjunto: envio.adjunto ? { nombre: envio.adjunto.nombre, bytes: envio.adjunto.bytes } : null,
    });

    // ── 2. EL ENVÍO DEL DÍA DEL ABOGADO ─────────────────────────────────
    let uso: ResultadoGasto;
    try { uso = await d.gastar('correo'); }
    catch { return { status: 503, cuerpo: { error: 'No se pudo registrar el envío. Vuelve a intentarlo en un momento.', codigo: 'servicio' } }; }
    if (!uso.permitido) {
        return { status: 429, cuerpo: { error: uso.mensaje || mensajeLimite('correo', escalonDe(a.plan)), codigo: 'limite', escalon: escalonDe(a.plan) } };
    }

    // ── 3. EL RENGLÓN PRIMERO, EL CUPO DESPUÉS ──────────────────────────
    const fila = await d.reservar({
        expediente_id: envio.expedienteId,
        para: to,
        cc,
        asunto: envio.asunto,
        cuerpo: envio.mensaje,
        adjunto_nombre: envio.adjunto?.nombre ?? null,
        adjunto_bytes: envio.adjunto?.bytes ?? null,
    }).catch(() => null);
    if (!fila) {
        await d.devolver('correo').catch(() => undefined);
        return { status: 503, cuerpo: { error: AMABLE_SERVICIO, codigo: 'servicio' } };
    }
    const fallar = async (error: string, mensaje: string, codigo: string): Promise<Respuesta> => {
        await d.marcar(fila.id, { estado: 'fallido', error: error.slice(0, 500) }).catch(() => undefined);
        await d.devolver('correo').catch(() => undefined);
        return { status: 503, cuerpo: { error: mensaje, codigo } };
    };

    let consumo: Consumo;
    try { consumo = await d.consumo(); }
    catch (e) { return fallar(`cupo: ${e instanceof Error ? e.message : String(e)}`, AMABLE_SERVICIO, 'servicio'); }
    if (consumo.fallo) return fallar(`cupo: ${consumo.fallo}`, AMABLE_SERVICIO, 'servicio');
    if (margenDeEscritos(consumo, d.limites ?? LIMITES_RESEND) < 0) {
        return fallar(`sin cupo de Resend: ${unidadesDe({ para: to, cc })} correos no caben`, AMABLE_CUPO, 'cupo');
    }

    // ── 4. SALE ─────────────────────────────────────────────────────────
    if (!d.hayLlave) return fallar('falta RESEND_API_KEY', AMABLE_SERVICIO, 'servicio');
    let r: { id: string } | { error: string };
    try {
        r = await d.enviar({
            from: de.cabecera,
            to,
            ...(cc.length ? { cc } : {}),
            replyTo: a.correo,
            subject: envio.asunto,
            html,
            text: texto,
            ...(envio.adjunto && contenido
                ? { attachments: [{ filename: envio.adjunto.nombre, content: contenido, contentType: TIPO_DOCX }] }
                : {}),
            tags: [{ name: 'tipo', value: 'escrito' }],
        }, `escrito-${envio.clave ?? fila.id}`);
    } catch (e) {
        r = { error: e instanceof Error ? e.message : String(e) };
    }
    if ('error' in r) return fallar(`resend: ${r.error}`, AMABLE_SERVICIO, 'servicio');

    await d.marcar(fila.id, { estado: 'enviado', resend_id: r.id, error: null }).catch(() => undefined);
    return {
        status: 200,
        cuerpo: { ok: true, id: fila.id, resend_id: r.id, enviado_at: (d.ahora?.() ?? new Date()).toISOString(), para: to, cc },
    };
}

export interface DependenciasPropuesta {
    gastar: (funcion: FuncionDespacho) => Promise<ResultadoGasto>;
    devolver: (funcion: FuncionDespacho) => Promise<void>;
    /** El modelo ligero (`completar` de servidor/modelo.ts). */
    completar: (e: { sistema: string; usuario: string; json: boolean; temperatura: number; maxTokens: number; titulo: string; tiempoMs: number }) => Promise<string>;
    /** `jsonDe` de servidor/modelo.ts. */
    jsonDe: (texto: string) => unknown;
}

const AMABLE_PROPUESTA = 'No se pudo proponer el mensaje en este momento. Escríbelo tú o vuelve a intentarlo en unos segundos.';

/** «Proponer mensaje»: gasta un cambio de redacción, no un envío. */
export async function proponerMensaje(a: Abogado, cuerpo: unknown, d: DependenciasPropuesta): Promise<Respuesta> {
    const c = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>;
    const texto = typeof c.texto === 'string' ? c.texto : '';
    if (!texto.trim()) return { status: 400, cuerpo: { error: 'El documento está vacío: escribe el escrito antes de proponer el correo.', campo: 'texto' } };
    const titulo = typeof c.titulo === 'string' ? c.titulo : '';
    const destinatario = typeof c.destinatario === 'string' ? c.destinatario : null;
    const plan = sinPlan(a);
    if (plan) return plan;

    let uso: ResultadoGasto;
    try { uso = await d.gastar('redaccion'); }
    catch { return { status: 503, cuerpo: { error: AMABLE_PROPUESTA, codigo: 'servicio' } }; }
    if (!uso.permitido) {
        return { status: 429, cuerpo: { error: uso.mensaje || mensajeLimite('redaccion', escalonDe(a.plan)), codigo: 'limite', escalon: escalonDe(a.plan) } };
    }

    const { sistema, usuario } = encargoDePropuesta({
        abogado: nombreDeFirma(a.nombre, a.correo),
        destinatario,
        titulo,
        texto,
        adjunto: c.adjunto !== false,
    });
    try {
        const crudo = await d.completar({
            sistema, usuario, json: true, temperatura: 0.4, maxTokens: 1200,
            titulo: 'Iurexia Correo del escrito', tiempoMs: 30_000,
        });
        const propuesta = propuestaDe(d.jsonDe(crudo));
        if (!propuesta) throw new Error('propuesta ilegible');
        return { status: 200, cuerpo: propuesta };
    } catch {
        await d.devolver('redaccion').catch(() => undefined);
        return { status: 503, cuerpo: { error: AMABLE_PROPUESTA, codigo: 'servicio' } };
    }
}
