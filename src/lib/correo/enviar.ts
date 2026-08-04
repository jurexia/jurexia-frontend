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

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { cabecerasBaja, urlBaja } from './baja';

export const ADMINS = [
    'yair@iurexia.com',
    'jdm.juridico@gmail.com',
    'administracion@iurexia.com',
    'soporte@iurexia.com',
];

/** Ritmo de envío. Resend admite 2 por segundo. */
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
export const LIMITE_DIARIO = 100;
export const LIMITE_MENSUAL = 3000;
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
    fallidos: number;
    errores: string[];
    /** En simulacro no sale ningún correo: sólo se reporta a quién iría. */
    simulacro: boolean;
    /** Lo que quedaba de cuota al empezar y si fue ella quien detuvo el envío. */
    cupo_al_iniciar: number;
    detenido_por_cuota: boolean;
    restantes_en_segmento: number;
}

/**
 * Envía una campaña.
 *
 * `construir` recibe cada destinatario y devuelve el correo ya compuesto, así
 * que la personalización (nombre, estado, consultas de ejemplo) vive en la
 * plantilla y no aquí.
 */
export async function enviarCampania(opciones: {
    campania: string;
    destinatarios: Destinatario[];
    construir: (d: Destinatario) => Correo;
    /** Sin esto no sale nada: hay que pedirlo explícitamente. */
    simulacro?: boolean;
    /** Tope de seguridad por corrida. */
    maximo?: number;
}): Promise<Resultado> {
    const { campania, destinatarios, construir, simulacro = true, maximo = 500 } = opciones;

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
        fallidos: 0,
        errores: [],
        simulacro,
        cupo_al_iniciar: cupo,
        detenido_por_cuota: false,
        restantes_en_segmento: 0,
    };

    const bajas = await leerBajas();
    const yaEnviados = await leerYaEnviados(campania);
    const remitente = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';
    const resend = simulacro ? null : new Resend(process.env.RESEND_API_KEY!);

    // Elegibles de verdad: los que pasan los tres frenos. Se cuenta antes de
    // enviar para poder reportar cuántos quedan para los días siguientes.
    const elegibles = destinatarios.filter((d) => {
        const e = d.email?.trim().toLowerCase();
        return !!e && !ADMINS.includes(e) && !bajas.has(e) && !yaEnviados.has(e);
    });
    res.restantes_en_segmento = Math.max(0, elegibles.length - tope);
    res.detenido_por_cuota = elegibles.length > tope && tope === cupo;

    for (const d of destinatarios) {
        if (res.enviados >= tope) break;

        const email = d.email?.trim().toLowerCase();
        if (!email) continue;

        if (ADMINS.includes(email)) { res.omitidos_admin++; continue; }
        if (bajas.has(email)) { res.omitidos_baja++; continue; }
        if (yaEnviados.has(email)) { res.omitidos_ya_enviado++; continue; }

        const correo = construir(d);

        if (simulacro) { res.enviados++; continue; }

        try {
            const { data, error } = await resend!.emails.send({
                from: remitente,
                to: email,
                subject: correo.asunto,
                html: correo.html,
                text: correo.texto,
                headers: cabecerasBaja(email),
            });

            if (error) {
                res.fallidos++;
                res.errores.push(`${email}: ${error.message}`);
                await admin().from('correo_envios').insert({
                    usuario_id: d.id ?? null, email, campania, estado: 'fallido',
                });
            } else {
                res.enviados++;
                // La bitácora se escribe SIEMPRE tras un envío bueno. Si esto
                // fallara, la siguiente corrida repetiría el correo — por eso
                // el error se registra en vez de tragarse.
                const { error: eLog } = await admin().from('correo_envios').insert({
                    usuario_id: d.id ?? null, email, campania,
                    resend_id: data?.id ?? null, estado: 'enviado',
                });
                if (eLog) res.errores.push(`bitácora ${email}: ${eLog.message}`);
            }
        } catch (e) {
            res.fallidos++;
            res.errores.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
        }

        await new Promise((r) => setTimeout(r, PAUSA_MS));
    }

    return res;
}

/** Enlace de baja, reexportado para que las plantillas no importen dos módulos. */
export { urlBaja };
