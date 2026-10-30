/**
 * LAS REGLAS DE LA ATENCIÓN, sin base de datos ni red (29-oct-2026).
 *
 * David: «No están llegando todos los reportes al correo. Debemos arreglar
 * eso para asegurarnos que cada reporte sea atendido».
 *
 * Lo que se midió ese día, sobre 30 días: 118 conversaciones de soporte, y a
 * soporte@ llegaron 21. Las otras 97 no se perdieron en el envío —Resend no
 * falló ni una vez—: nunca se intentó mandarlas. El chat sólo avisaba cuando
 * el asistente escribía [ESCALAR], pasaba de quince mensajes o se caía el
 * motor. Y la forma más común de quedarse fuera era la más humana: el
 * asistente pide «¿qué mensaje de error ve?», el abogado cierra la pestaña y
 * la conversación muere sin que nadie la lea. 24 de esas 97 eran fallos.
 *
 * De ahí las tres reglas de este archivo:
 *
 *   1. TODA conversación avisa a soporte@ una vez, la resuelva o no el
 *      asistente: la escalada al momento; el resto cuando lleva un rato
 *      quieta (`debeAvisar`). Una conversación es UN reporte, no un correo
 *      por mensaje: así era antes del 17-oct y el buzón dejó de leerse.
 *   2. El estado no lo marca nadie a mano: pasa a «respondido» cuando sale
 *      un correo de soporte@ al abogado, o que cita su folio
 *      (`aplicarObservacion`), y se cierra solo (`motivoDeCierre`).
 *   3. Lo que lleve más de un día sin respuesta sale en el resumen diario.
 *
 * Este módulo NO importa nada a propósito: así se prueba con
 * `node _pruebas/reportes-soporte.mts` sin levantar Next ni tocar producción.
 */

export type EstadoAtencion = 'pendiente' | 'respondido' | 'cerrado';

/** Lo que estas reglas necesitan saber de un reporte. */
export interface ReporteAtencion {
    folio: string;
    folios: string[];
    user_email: string | null;
    turnos: number;
    escalado: boolean;
    creado_at: string;
    ultimo_turno_at: string;
    aviso_at: string | null;
    aviso_turnos: number;
    aviso_intentos: number;
    aviso_via: string | null;
    estado: EstadoAtencion;
    respondido_at: string | null;
    cerrado_at: string | null;
    usuario_volvio_at: string | null;
}

/** Minutos sin un mensaje nuevo para dar por terminada una conversación no escalada. */
export const MINUTOS_QUIETA = 20;

/** Más viejo que esto ya no recibe aviso individual: sale en el resumen. */
export const DIAS_AVISO_INDIVIDUAL = 3;

/** Intentos de aviso antes de dejarlo sólo para el resumen. Con el cron cada 15 min, unas 5 horas. */
export const MAXIMO_INTENTOS_AVISO = 20;

/** Respondido y sin noticias del abogado durante esto: se cierra solo. */
export const HORAS_CIERRE_TRAS_RESPUESTA = 72;

/** El resumen diario lista lo que lleva sin respuesta más de esto. */
export const HORAS_PENDIENTE_RESUMEN = 24;

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/**
 * ¿Este mensaje del chat empieza una conversación nueva?
 *
 * Sólo para los navegadores que todavía no mandan `sesion` (la página vieja
 * en caché). La regla es la misma con la que se midieron las 118: otro
 * usuario, o el contador de turnos que vuelve a empezar (pulsó «Nueva»), o
 * una hora de silencio.
 */
export function esConversacionNueva(
    previo: { ultimo_turno_at: string; turnos: number } | null,
    turno: { at: string; turnos: number },
): boolean {
    if (!previo) return true;
    if (turno.turnos <= previo.turnos) return true;
    return ms(turno.at) - ms(previo.ultimo_turno_at) > 60 * 60_000;
}

export type TipoAviso = 'primero' | 'continuacion';

/**
 * ¿Toca avisar a soporte@ de este reporte, y de qué?
 *
 *   · 'primero': nunca se avisó y la conversación lleva MINUTOS_QUIETA quieta.
 *   · 'continuacion': ya se avisó, pero el abogado siguió escribiendo después;
 *     sale con el mismo asunto para que Gmail lo junte en el mismo hilo.
 *
 * Las escaladas no pasan por aquí: avisan en el momento, desde el chat. Sólo
 * vuelven aquí si aquel envío falló, y entonces no esperan a que se aquiete
 * nada: ya se le dijo al abogado que estaba en manos del equipo.
 */
export function debeAvisar(r: ReporteAtencion, ahora = Date.now()): TipoAviso | null {
    if (r.estado === 'cerrado') return null;
    if (r.aviso_via === 'historico') return null;
    if (r.aviso_intentos >= MAXIMO_INTENTOS_AVISO) return null;
    if (ahora - ms(r.ultimo_turno_at) > DIAS_AVISO_INDIVIDUAL * 86400_000) return null;
    const quieto = ahora - ms(r.ultimo_turno_at);
    const quieta = quieto >= MINUTOS_QUIETA * 60_000;
    // La escalada la manda el propio chat en el mismo segundo; el cron sólo la
    // recoge si aquel envío falló. Los dos minutos evitan pisarse con él
    // mientras todavía está enviando.
    if (!r.aviso_at) return quieta || (r.escalado && quieto >= 2 * 60_000) ? 'primero' : null;
    if (r.turnos > r.aviso_turnos && quieta) return 'continuacion';
    return null;
}

/** Lo que el Apps Script de soporte@ ve en el buzón y le cuenta al servidor. */
export interface Observacion {
    /** 'respuesta': salió de soporte@ hacia el abogado. 'usuario': el abogado escribió a soporte@. */
    tipo: 'respuesta' | 'usuario';
    fecha: string;
    /** Correos del otro lado: destinatarios de la respuesta, o remitente del abogado. */
    correos: string[];
    /** Folios citados en el asunto o el cuerpo. */
    folios: string[];
    hilo?: string | null;
}

/** «folio 1850-02», «Folio 3640-01:», «folios 14-07 y 14-16». */
export function extraerFolios(texto: string): string[] {
    const vistos = new Set<string>();
    const rx = /\bfolios?\b[^0-9]{0,12}((?:\d{1,6}-\d{2}(?:[\s,;y]+)?)+)/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(texto || '')) !== null) {
        const sueltos = m[1].match(/\d{1,6}-\d{2}/g) || [];
        sueltos.forEach((f) => vistos.add(f));
    }
    return Array.from(vistos);
}

/** ¿Esta observación habla de este reporte? Por folio, o por el correo del abogado. */
export function observacionToca(r: ReporteAtencion, o: Observacion): boolean {
    if (o.folios.some((f) => r.folio === f || r.folios.includes(f))) return true;
    const correo = (r.user_email || '').trim().toLowerCase();
    if (!correo) return false;
    // Por correo sólo cuenta lo que salió DESPUÉS de que el abogado escribiera:
    // una respuesta de la semana pasada no atiende el reporte de hoy.
    return o.correos.some((c) => c.trim().toLowerCase() === correo) && ms(o.fecha) >= ms(r.creado_at);
}

export interface Cambio {
    estado: EstadoAtencion;
    respondido_at?: string;
    usuario_volvio_at?: string;
    gmail_hilo?: string | null;
}

/**
 * El estado que deja una observación del buzón, o null si no cambia nada.
 *
 *   · Sale una respuesta de soporte@ → «respondido» (si no estaba cerrado).
 *   · El abogado vuelve a escribir DESPUÉS de esa respuesta → «pendiente» otra
 *     vez: su caso sigue abierto aunque ya se le hubiera contestado.
 *
 * Idempotente: el script manda las mismas observaciones en cada vuelta y la
 * segunda vez no cambia nada.
 */
export function aplicarObservacion(r: ReporteAtencion, o: Observacion): Cambio | null {
    if (!observacionToca(r, o)) return null;
    if (o.tipo === 'respuesta') {
        if (r.estado === 'cerrado') return null;
        // Una respuesta anterior a que el abogado volviera no atiende lo nuevo.
        if (r.usuario_volvio_at && ms(o.fecha) <= ms(r.usuario_volvio_at)) return null;
        if (r.estado === 'respondido' && r.respondido_at && ms(o.fecha) <= ms(r.respondido_at)) return null;
        return { estado: 'respondido', respondido_at: o.fecha, gmail_hilo: o.hilo ?? null };
    }
    // tipo 'usuario'
    if (r.estado !== 'respondido' || !r.respondido_at) return null;
    if (ms(o.fecha) <= ms(r.respondido_at)) return null;
    return { estado: 'pendiente', usuario_volvio_at: o.fecha };
}

/**
 * ¿Se cierra solo? Devuelve el motivo, o null.
 *
 * Cerrar no es callar: lo que se cierra es lo que ya tuvo respuesta. Lo que
 * nadie contestó NO se cierra nunca por tiempo; sigue saliendo en el resumen.
 */
export function motivoDeCierre(
    r: ReporteAtencion,
    extra: { cerradoEnPanel?: boolean; cerradoPorCircuito?: boolean },
    ahora = Date.now(),
): string | null {
    if (r.estado === 'cerrado') return null;
    if (extra.cerradoPorCircuito) return 'circuito';
    if (extra.cerradoEnPanel) return 'panel';
    if (r.estado === 'respondido' && r.respondido_at
        && ahora - ms(r.respondido_at) >= HORAS_CIERRE_TRAS_RESPUESTA * 3600_000) {
        return `sin_respuesta_del_usuario_${HORAS_CIERRE_TRAS_RESPUESTA}h`;
    }
    return null;
}

/** Orden del resumen: fallos y quejas de calidad primero, pagos antes que gratuitos, lo más viejo arriba. */
export function prioridad(familia: string | null, plan: string | null): number {
    const porFamilia: Record<string, number> = {
        defecto: 0, calidad: 1, soporte: 2, mejora: 3, encuesta: 4, 'buzon-equivocado': 5,
    };
    const f = familia && familia in porFamilia ? porFamilia[familia] : 2;
    const pago = plan && plan !== 'gratuito' ? 0 : 1;
    return f * 2 + pago;
}
