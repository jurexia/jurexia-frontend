/**
 * Motor de envío de campañas.
 *
 * Tres frenos, en este orden, antes de que salga un solo correo:
 *   1. ¿Se dio de baja? → no se le escribe nunca más.
 *   2. ¿Ya recibió esta campaña? → el índice único de `correo_envios` lo
 *      impide aunque el cron se dispare dos veces.
 *   3. ¿Está en la lista de administradores? → no nos escribimos a nosotros.
 *
 * Sin el paso 2 no hay automatización posible: un cron sin bitácora reenvía
 * lo mismo a la misma gente en cada vuelta.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { cabecerasBaja, urlBaja } from './baja';

// La lista vive en `@/lib/admins`, que no depende de nada. Se importa y se
// reexporta porque varios módulos ya la traen desde aquí.
import { ADMINS } from '../admins';
export { ADMINS };

/** Pausa entre peticiones. Resend admite 10 por segundo por equipo; con lotes de 100 sobra. */
const PAUSA_MS = 600;

// ── CUOTA DIARIA ─────────────────────────────────────────────────────────
// La cuenta de Resend es gratuita: 100 correos al día y 3,000 al mes.
//
// De esos 100, una parte se la comen los correos que NO se pueden posponer:
// confirmación de alta y recuperación de contraseña. Rondan los 10 diarios,
// pero un día de tráfico alto pueden ser más — y si una campaña se come el
// cupo, el abogado que pide restablecer su contraseña no recibe nada. Eso es
// mucho peor que retrasar una promoción.
//
// Por eso la reserva es de 30 y no de 10: el margen protege lo transaccional.
//
// LOS TOPES SALEN DEL PLAN, NO DEL CÓDIGO (16-sep-2026). Por omisión son los
// del gratuito, así que esto no cambia nada mientras no se configure. Al
// contratar Pro (20 USD al mes: 50,000 correos, sin tope diario) basta con
// fijar en Vercel `RESEND_LIMITE_DIARIO` y `RESEND_LIMITE_MENSUAL` y volver a
// desplegar. Subirlos ANTES de contratar sería estrellarse contra el tope de
// Resend y dejar sin cupo la recuperación de contraseñas.
//
// Ojo: con plan de pago el techo real deja de ser Resend y pasa a ser el
// tiempo. La función del cron vive 300 s y aquí se manda uno cada 0.6 s, así
// que una corrida no pasa de unos 300 correos. Por eso existe `plazoHasta`.
export const LIMITE_DIARIO = Number(process.env.RESEND_LIMITE_DIARIO || 100);
export const LIMITE_MENSUAL = Number(process.env.RESEND_LIMITE_MENSUAL || 3000);
export const RESERVA_TRANSACCIONAL = 30;

/** Cuántos correos de campaña caben hoy sin tocar la reserva. */
export async function cupoDisponibleHoy(): Promise<{
    cupo: number;
    enviados_hoy: number;
    enviados_mes: number;
    tope_diario: number;
}> {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

    const cliente = admin();
    const [dia, mes] = await Promise.all([
        cliente.from('correo_envios').select('id', { count: 'exact', head: true })
            .eq('estado', 'enviado').gte('enviado_at', inicioDia),
        cliente.from('correo_envios').select('id', { count: 'exact', head: true })
            .eq('estado', 'enviado').gte('enviado_at', inicioMes),
    ]);

    const enviados_hoy = dia.count ?? 0;
    const enviados_mes = mes.count ?? 0;
    const tope_diario = LIMITE_DIARIO - RESERVA_TRANSACCIONAL;

    // El tope mensual también manda: 70 diarios por 30 días son 2,100, que
    // caben, pero si algún día se sube el bloque hay que seguir respetándolo.
    const margenMes = LIMITE_MENSUAL - RESERVA_TRANSACCIONAL * 30 - enviados_mes;

    return {
        cupo: Math.max(0, Math.min(tope_diario - enviados_hoy, margenMes)),
        enviados_hoy,
        enviados_mes,
        tope_diario,
    };
}

export interface Destinatario {
    id?: string | null;
    email: string;
    full_name?: string | null;
    estado?: string | null;
    queries_used?: number | null;
    /** Cómo prefiere ser nombrado: 'lic' (neutro, por omisión), 'licenciado' o 'licenciada'. */
    tratamiento?: string | null;
    /** El plan contratado. Lo usa la plantilla que nombra lo que ese plan incluye. */
    subscription_type?: string | null;
}

export interface Correo {
    asunto: string;
    html: string;
    texto: string;
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

/** Correos dados de baja. Se lee una vez por corrida, no por destinatario. */
export async function leerBajas(): Promise<Set<string>> {
    const { data, error } = await admin().from('correo_bajas').select('email');
    if (error) throw new Error(`No pude leer las bajas: ${error.message}`);
    return new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase()));
}

/** Quiénes ya recibieron esta campaña. */
export async function leerYaEnviados(campania: string): Promise<Set<string>> {
    const enviados = new Set<string>();
    let desde = 0;
    // Paginado: Supabase corta en 1000 filas por consulta.
    for (;;) {
        const { data, error } = await admin()
            .from('correo_envios')
            .select('email')
            .eq('campania', campania)
            .eq('estado', 'enviado')
            // Orden estable OBLIGATORIO al paginar: sin él, PostgREST puede
            // devolver páginas que se solapan. Medido el 17-sep-2026: la misma
            // lectura dio 1,070 y 1,714 «ya enviados» con una hora de diferencia,
            // y lo que se cuenta de menos se REENVÍA.
            .order('id', { ascending: true })
            .range(desde, desde + 999);
        if (error) throw new Error(`No pude leer la bitácora: ${error.message}`);
        (data ?? []).forEach((r: { email: string }) => enviados.add(r.email.toLowerCase()));
        if (!data || data.length < 1000) break;
        desde += 1000;
    }
    return enviados;
}

export interface Resultado {
    campania: string;
    candidatos: number;
    enviados: number;
    omitidos_baja: number;
    omitidos_ya_enviado: number;
    omitidos_admin: number;
    /** Recibió otra campaña hace menos de DIAS_ENTRE_CAMPANIAS días. */
    omitidos_reciente: number;
    fallidos: number;
    errores: string[];
    /** En simulacro no sale ningún correo: sólo se reporta a quién iría. */
    simulacro: boolean;
    /** Lo que quedaba de cuota al empezar y si fue ella quien detuvo el envío. */
    cupo_al_iniciar: number;
    detenido_por_cuota: boolean;
    restantes_en_segmento: number;
    /** Se paró por tiempo antes de agotar el cupo: lo que falta sale mañana. */
    detenido_por_tiempo?: boolean;
}

/**
 * Días mínimos entre dos correos de campaña a la misma persona (17-sep-2026).
 *
 * Con el plan gratuito de Resend esto no hacía falta: 70 correos al día
 * repartidos entre campañas rara vez caían dos veces en la misma persona. Con
 * el plan Pro el techo desaparece y la misma corrida podría mandarle a un
 * abogado la invitación a la vitrina, la de referidos y el descuento de Pro,
 * los tres el mismo día. Eso es exactamente lo que convierte un remitente
 * legítimo en correo no deseado —para el abogado y para Gmail—.
 *
 * La regla mira TODAS las campañas, no sólo la actual. Y como cada campaña de
 * una corrida lee la bitácora fresca, quien recibió la primera ya queda fuera
 * de la segunda sin coordinación adicional.
 */
export const DIAS_ENTRE_CAMPANIAS = Number(process.env.CORREO_DIAS_ENTRE_CAMPANIAS ?? 3);

/** Quiénes recibieron cualquier correo de campaña en los últimos `dias`. */
export async function leerRecientes(dias: number): Promise<Set<string>> {
    const recientes = new Set<string>();
    if (!(dias > 0)) return recientes;
    const desdeFecha = new Date(Date.now() - dias * 86400_000).toISOString();
    let desde = 0;
    for (;;) {
        const { data, error } = await admin()
            .from('correo_envios')
            .select('email')
            .eq('estado', 'enviado')
            .gte('enviado_at', desdeFecha)
            // Orden estable OBLIGATORIO al paginar: sin él, PostgREST puede
            // devolver páginas que se solapan. Medido el 17-sep-2026: la misma
            // lectura dio 1,070 y 1,714 «ya enviados» con una hora de diferencia,
            // y lo que se cuenta de menos se REENVÍA.
            .order('id', { ascending: true })
            .range(desde, desde + 999);
        if (error) throw new Error(`No pude leer los envíos recientes: ${error.message}`);
        for (const r of data ?? []) recientes.add(String(r.email).toLowerCase());
        if (!data || data.length < 1000) break;
        desde += 1000;
    }
    return recientes;
}

/**
 * Las 8:00 de la Ciudad de México en UTC (17-sep-2026, decisión de David).
 *
 * México no tiene horario de verano desde 2022: la capital está todo el año
 * en UTC-6, así que las 8:00 son siempre las 14:00 UTC.
 */
export const HORA_ENTREGA_UTC = 14;

/**
 * La próxima entrega de las 8:00 de México, si cae dentro de `margenHoras`.
 * Fuera de ese margen devuelve `undefined` y el correo sale al momento: un
 * disparo manual por la tarde no debe quedar esperando al día siguiente sin
 * que nadie lo haya pedido.
 */
export function proximaEntrega(ahora = new Date(), margenHoras = 6): string | undefined {
    const objetivo = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), HORA_ENTREGA_UTC, 0, 0));
    const falta = objetivo.getTime() - ahora.getTime();
    if (falta > 60_000 && falta <= margenHoras * 3600_000) return objetivo.toISOString();
    return undefined;
}

/** Máximo de correos por petición en el envío por lotes de Resend. */
const LOTE = 100;

/**
 * Envía una campaña.
 *
 * `construir` recibe cada destinatario y devuelve el correo ya compuesto, así
 * que la personalización (nombre, estado, consultas de ejemplo) vive en la
 * plantilla y no aquí.
 *
 * POR LOTES DESDE EL 17-SEP-2026. Uno a uno, con la pausa que exige el límite
 * de peticiones, la función del cron —que vive 300 s— no pasaba de unos 400
 * correos por corrida. Resend acepta 100 por petición, así que el techo real
 * vuelve a ser la cuota y no el reloj. Cada lote lleva una clave de
 * idempotencia: si la petición se reintenta, Resend no duplica el envío.
 */
export async function enviarCampania(opciones: {
    campania: string;
    destinatarios: Destinatario[];
    construir: (d: Destinatario) => Correo;
    /** Sin esto no sale nada: hay que pedirlo explícitamente. */
    simulacro?: boolean;
    /** Tope de seguridad por corrida. */
    maximo?: number;
    /**
     * Hora límite (epoch ms) para dejar de enviar. La función del cron se corta
     * a los 300 s; si la cortara Vercel a media tanda no habría reporte y la
     * corrida parecería rota. Parando antes, lo enviado queda registrado y el
     * resto sale en la siguiente corrida, sin repetir a nadie.
     */
    plazoHasta?: number;
    /**
     * Hora de entrega (ISO 8601). Resend encola el correo y lo suelta a esa
     * hora exacta, hasta 30 días después. Así la hora de llegada no depende
     * de la puntualidad del cron, y un envío encolado se puede cancelar.
     */
    programadoPara?: string;
    /**
     * Correos por petición. 100 —el máximo de Resend— es lo que conviene para
     * las campañas grandes. Con `lote: 1` sale uno a uno: más lento, pero sin
     * la ráfaga que los filtros de Gmail leen como envío masivo. Se usa en los
     * avisos a clientes de pago, donde llegar a la bandeja principal importa
     * más que terminar rápido.
     */
    lote?: number;
    /** Espera entre lotes, en milisegundos. */
    pausaMs?: number;
    /**
     * REPARTIR LA TANDA EN EL TIEMPO (19-sep-2026, David: «envíalos en
     * exactamente 7 horas, cada uno con ese intervalo»).
     *
     * Con `programadoPara` y esta ventana, cada correo recibe SU propia hora:
     * el primero a la hora de inicio y el último justo al cerrar la ventana,
     * repartidos por igual. No hay proceso vivo esperando —las horas viajan a
     * Resend, que es quien los suelta—, así que la tanda sobrevive a que la
     * función termine, y un envío programado todavía se puede cancelar.
     *
     * Para qué: un goteo parejo no tiene la forma de ráfaga que los filtros
     * de correo leen como envío masivo.
     */
    ventanaMs?: number;
}): Promise<Resultado> {
    const {
        campania, destinatarios, construir, simulacro = true, maximo = 500,
        plazoHasta, programadoPara, lote: tamanoLote = LOTE, pausaMs = PAUSA_MS, ventanaMs,
    } = opciones;

    // El bloque de hoy es lo menor entre lo que pide quien llama y lo que
    // permite la cuota. En simulacro se calcula igual, para que el reporte
    // diga la verdad sobre cuánto saldría de verdad.
    const { cupo } = await cupoDisponibleHoy();
    const tope = Math.min(maximo, cupo);

    const res: Resultado = {
        campania,
        candidatos: destinatarios.length,
        enviados: 0,
        omitidos_baja: 0,
        omitidos_ya_enviado: 0,
        omitidos_admin: 0,
        omitidos_reciente: 0,
        fallidos: 0,
        errores: [],
        simulacro,
        cupo_al_iniciar: cupo,
        detenido_por_cuota: false,
        restantes_en_segmento: 0,
    };

    const bajas = await leerBajas();
    const yaEnviados = await leerYaEnviados(campania);
    const recientes = await leerRecientes(DIAS_ENTRE_CAMPANIAS);
    const remitente = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';
    // Las campañas invitan a responder («responda este correo y le
    // contestamos nosotros»). Salían sin dirección de respuesta, así que la
    // respuesta iba al remitente de campañas y nadie la leía.
    const responderA = process.env.CORREO_RESPONDER_A || 'soporte@iurexia.com';

    // Elegibles de verdad: los que pasan los cuatro frenos. Se cuenta antes de
    // enviar para poder reportar cuántos quedan para los días siguientes. Un
    // mismo correo repetido en el segmento sale una sola vez.
    const elegibles: Destinatario[] = [];
    const vistos = new Set<string>();
    for (const d of destinatarios) {
        const email = d.email?.trim().toLowerCase();
        if (!email || vistos.has(email)) continue;
        vistos.add(email);
        if (ADMINS.includes(email)) { res.omitidos_admin++; continue; }
        if (bajas.has(email)) { res.omitidos_baja++; continue; }
        if (yaEnviados.has(email)) { res.omitidos_ya_enviado++; continue; }
        if (recientes.has(email)) { res.omitidos_reciente++; continue; }
        elegibles.push({ ...d, email });
    }
    res.restantes_en_segmento = Math.max(0, elegibles.length - tope);
    res.detenido_por_cuota = elegibles.length > tope && tope === cupo;

    const aEnviar = elegibles.slice(0, Math.max(0, tope));
    if (simulacro) {
        res.enviados = aEnviar.length;
        return res;
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const hoy = new Date().toISOString().slice(0, 10);

    /* La hora de CADA correo. Sin ventana, todos comparten la de `programadoPara`
       (o ninguna). Con ventana, se reparten por igual entre el inicio y el
       cierre: con 219 correos en siete horas, uno cada 115 segundos. */
    const inicio = programadoPara ? Date.parse(programadoPara) : 0;
    const paso = ventanaMs && aEnviar.length > 1 ? ventanaMs / (aEnviar.length - 1) : 0;
    const cuando = (indice: number) => {
        if (!programadoPara) return {};
        return { scheduledAt: new Date(inicio + Math.round(indice * paso)).toISOString() };
    };

    for (let i = 0; i < aEnviar.length; i += tamanoLote) {
        if (plazoHasta && Date.now() > plazoHasta) { res.detenido_por_tiempo = true; break; }
        const lote = aEnviar.slice(i, i + tamanoLote);

        let correos;
        try {
            correos = lote.map((d, k) => {
                const c = construir(d);
                return {
                    from: remitente,
                    to: d.email,
                    replyTo: responderA,
                    subject: c.asunto,
                    html: c.html,
                    text: c.texto,
                    headers: cabecerasBaja(d.email),
                    tags: [{ name: 'campania', value: campania.replace(/[^A-Za-z0-9_-]/g, '_') }],
                    ...cuando(i + k),
                };
            });
        } catch (e) {
            // Una plantilla que revienta con un destinatario raro no debe
            // tumbar el lote entero sin dejar rastro.
            res.fallidos += lote.length;
            res.errores.push(`plantilla, lote ${i / tamanoLote + 1}: ${e instanceof Error ? e.message : String(e)}`);
            continue;
        }

        const huella = crypto.createHash('sha1').update(lote.map((d) => d.email).join(',')).digest('hex').slice(0, 20);
        try {
            const { data, error } = await resend.batch.send(correos, {
                idempotencyKey: `${campania}:${hoy}:${huella}`,
            });
            if (error) {
                res.fallidos += lote.length;
                res.errores.push(`lote ${i / tamanoLote + 1}: ${error.message}`);
                await admin().from('correo_envios').insert(
                    lote.map((d) => ({ usuario_id: d.id ?? null, email: d.email, campania, estado: 'fallido' })),
                );
            } else {
                const ids = data?.data ?? [];
                res.enviados += lote.length;
                // La bitácora se escribe SIEMPRE tras un envío bueno, y en un
                // solo insert por lote. Si fallara, la siguiente corrida
                // repetiría el lote — por eso el error se registra.
                const { error: eLog } = await admin().from('correo_envios').insert(
                    lote.map((d, k) => ({
                        usuario_id: d.id ?? null, email: d.email, campania,
                        resend_id: ids[k]?.id ?? null, estado: 'enviado',
                    })),
                );
                if (eLog) res.errores.push(`bitácora lote ${i / tamanoLote + 1}: ${eLog.message}`);
            }
        } catch (e) {
            res.fallidos += lote.length;
            res.errores.push(`lote ${i / tamanoLote + 1}: ${e instanceof Error ? e.message : String(e)}`);
        }
        await new Promise((r) => setTimeout(r, pausaMs));
    }
    return res;
}

/** Enlace de baja, reexportado para que las plantillas no importen dos módulos. */
export { urlBaja };
