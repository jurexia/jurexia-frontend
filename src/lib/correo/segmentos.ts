/**
 * A quién va cada campaña. Fuente única: si un segmento cambia, cambia aquí
 * y las dos rutas (la manual y el cron diario) lo heredan.
 *
 * ─── OJO CON `queries_used`: SE REINICIA ─────────────────────────────────
 * `queries_used` es el consumo DEL PERIODO, no el histórico. Se pone a cero
 * en cada renovación y en cada cambio de plan. Por eso `queries_used = 0` NO
 * significa «nunca usó la plataforma».
 *
 * Medido el 5-ago-2026 sobre la base real:
 *
 *   gratuitos con queries_used = 0 ............. 1,561
 *   de ésos, con last_query_at IS NULL .......... 569  ← nunca consultaron
 *   de ésos, que SÍ consultaron alguna vez ...... 992  ← sólo se les reinició
 *
 * Segmentar la activación por `queries_used = 0` habría mandado a 992 abogados
 * un correo diciéndoles que su cuenta «está sin usar» y que «todavía no ha
 * hecho su primera consulta». A gente que sí la usó, y del gremio que menos
 * perdona la falta de rigor.
 *
 * La señal buena para «nunca la usó» es `last_query_at IS NULL`, que no se
 * reinicia nunca. `queries_used` sólo sirve donde de verdad importa el
 * periodo: saber quién chocó con el tope este mes.
 *
 * Reparto vigente:
 *
 *   nunca consultaron ....... 569   → activacion
 *   inactivos 30+ días ...... 894   → reactivacion
 *   toparon el límite ........ 76   → suscripcion
 *   ya usaron (pago o no) ... 1,394 → referidos  (antes: sólo 159 de pago)
 */

import { promises as dns } from 'dns';
import { createClient } from '@supabase/supabase-js';
import { ADMINS, type Destinatario } from './enviar';
import type { NombreCampania } from './campanias';

const COLUMNAS = 'id, email, full_name, estado, queries_used';
/** `tratamiento` vive en el perfil; la vista `cuentas_dormidas` no lo expone. */
const COLUMNAS_PERFIL = `${COLUMNAS}, tratamiento`;

/**
 * Los dominios de despacho detectados en la base el 8-ago-2026.
 *
 * Se enumeran a mano y no se deducen con un `like`, porque «no es gmail» NO
 * significa «es despacho»: la base está llena de correos universitarios
 * (.edu.mx), de alias de Apple (privaterelay.appleid.com) y de consultorías
 * que no litigan. Pedirle su logotipo a un alumno de la UNAM sería ridículo.
 *
 * Cada uno se comprobó: que el dominio resuelva y que el sitio sea de un
 * despacho. menra.mx entra pese a no tener sitio en pie —son dos abogados de
 * pago con uso real— y se le pedirá el logotipo, no un enlace.
 */
export const DOMINIOS_DESPACHO = [
    'menra.mx',
    'rodriguezasociados.mx',
    'geiserconsultores.com',
    'sotomadrigal.com.mx',
    'tbblaw.net',
];

export function esDespacho(email: string): boolean {
    return DOMINIOS_DESPACHO.includes((email.split('@')[1] || '').toLowerCase());
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

/**
 * De dónde sale cada segmento. Casi todos vienen de `user_profiles`, pero
 * `entrada` necesita `last_sign_in_at`, que vive en `auth.users` y PostgREST
 * no expone: para eso está la vista `cuentas_dormidas`.
 */
function origen(campania: NombreCampania): string {
    return campania === 'entrada' ? 'cuentas_dormidas' : 'user_profiles';
}

/** Aplica los filtros del segmento a una consulta ya iniciada. */
function filtrar(q: any, campania: NombreCampania) {
    if (campania === 'entrada') {
        // La vista ya filtra por «nunca inició sesión» y plan gratuito. Aquí
        // sólo se dejan pasar 48 h desde el alta, para no pisar al correo de
        // bienvenida de quien se registró hace un rato.
        return q.lt('created_at', new Date(Date.now() - 48 * 3600_000).toISOString());
    }

    // ── VITRINA ──────────────────────────────────────────────────────────
    // TODOS los planes de pago, incluido Básico (decisión de David, 8-ago).
    // No se filtra por uso: no se les pide un testimonio sobre la
    // herramienta, se les ofrece un espacio en la portada, y para eso lo que
    // importa es que sean clientes — no cuántas veces entraron.
    //
    // AMPLIADA EL 17-SEP-2026 (David): «todos los abogados activos que usan
    // Iurexia». Entran los clientes de pago de siempre y, además, quien hizo al
    // menos una consulta en los últimos 60 días, pague o no. La campaña sigue
    // llamándose `vitrina`, así que los 218 que ya la recibieron no la reciben
    // dos veces.
    if (campania === 'vitrina') {
        const hace60 = new Date(Date.now() - 60 * 86400_000).toISOString();
        return q.eq('is_active', true)
                .or(`subscription_type.in.(basico_monthly,pro_monthly,pro_annual,platinum_monthly,platinum_annual,ultra_secretarios),last_query_at.gte."${hace60}"`); // entre comillas: la fecha lleva «:» y «.», reservados en `or`
    }


    if (campania === 'referidos') {
        // ABIERTO A QUIEN YA USÓ LA PLATAFORMA (cambio del 7-ago-2026).
        //
        // Antes iba sólo a los ~165 clientes de pago, y en seis meses produjo
        // CERO invitaciones. Una causa medida: el 91% de los usuarios ni
        // siquiera tenía código guardado, así que jamás pudo invitar.
        //
        // Ahora entra cualquiera que haya escrito al menos una consulta —de
        // pago o gratuito—, porque el programa nuevo también premia al
        // gratuito con días de Pro. Se exige `last_query_at` para no pedirle
        // una recomendación a quien todavía no conoce la herramienta: nadie
        // recomienda lo que no ha usado, y pedírselo quema el remitente.
        return q.eq('is_active', true).not('last_query_at', 'is', null);
    }
    // ── DESCUENTO PRO (17-sep-2026) ──────────────────────────────────────
    // Quien ya consultó y nunca contrató: plan gratuito, cuenta activa, al
    // menos una consulta (`last_query_at`, que no se reinicia) y correo
    // verificado.
    //
    // `is_active` hace un trabajo que no se ve: los 69 abogados que pagaron
    // alguna vez y hoy están en gratuito tienen la cuenta inactiva, así que
    // quedan fuera. Importa, porque el código PRO50 sólo vale para una
    // primera compra y Stripe se lo rechazaría: ofrecerles un descuento que
    // no pueden usar sería peor que no escribirles. Medido contra los 1,622
    // cobros de Stripe: cero coincidencias en el segmento.
    if (campania === 'descuento_pro') {
        return q.eq('subscription_type', 'gratuito')
                .eq('is_active', true)
                .not('last_query_at', 'is', null)
                .not('email_verificado_at', 'is', null);
    }
    if (campania === 'activacion') {
        // Nunca escribió una consulta — `last_query_at` nulo, que es lo único
        // que no se reinicia. Se dejan pasar 48 h desde el alta para no
        // competir con el correo de bienvenida.
        return q.eq('subscription_type', 'gratuito')
                .is('last_query_at', null)
                .lt('created_at', new Date(Date.now() - 48 * 3600_000).toISOString());
    }
    if (campania === 'reactivacion') {
        // Sí la usó, y lleva más de 30 días sin volver.
        return q.eq('subscription_type', 'gratuito')
                .not('last_query_at', 'is', null)
                .lt('last_query_at', new Date(Date.now() - 30 * 86400_000).toISOString());
    }
    // Chocó con el tope de cinco de ESTE periodo, o está a una consulta de
    // hacerlo. Aquí `queries_used` sí es la medida correcta.
    return q.eq('subscription_type', 'gratuito').gte('queries_used', 4);
}

/**
 * Dominios que de verdad reciben correo (tienen registro MX).
 *
 * Quien no terminó su registro tiene la tasa de errores de dedo más alta de
 * la base: entre 48 personas aparecen «gmail.con», «gmial.com», «hotmail.ess»
 * y «outloot.com». Cada correo a un dominio inexistente es un rebote, y los
 * rebotes son lo que más rápido hunde la reputación del remitente — también
 * para los correos de contraseña que salen del mismo dominio. Se consulta el
 * DNS una vez por dominio, no por persona.
 */
async function dominiosConCorreo(correos: string[]): Promise<Set<string>> {
    const dominios = Array.from(new Set(correos.map((e) => (e.split('@')[1] || '').toLowerCase()).filter(Boolean)));
    const validos = new Set<string>();
    await Promise.all(dominios.map(async (d) => {
        try {
            const mx = await dns.resolveMx(d);
            if (mx && mx.length) validos.add(d);
        } catch {
            // Sin MX o dominio inexistente: no se le escribe.
        }
    }));
    return validos;
}

/**
 * Registro pendiente: pidió el código de verificación y nunca lo escribió, así
 * que no tiene cuenta. No viven en `user_profiles` sino en `otp_codes`, y se
 * leen con una función que sólo ejecuta la clave de servicio.
 */
async function segmentoRegistroPendiente(): Promise<Destinatario[]> {
    const { data, error } = await admin().rpc('segmento_registro_pendiente');
    if (error) throw new Error(`segmento registro_pendiente: ${error.message}`);
    const filas = (data ?? []) as { email: string; full_name: string | null }[];
    const conCorreo = await dominiosConCorreo(filas.map((f) => f.email));
    return filas
        .filter((f) => f.email && conCorreo.has((f.email.split('@')[1] || '').toLowerCase()))
        .filter((f) => !ADMINS.includes(f.email.toLowerCase()))
        .map((f) => ({ id: null, email: f.email, full_name: f.full_name, estado: null, queries_used: 0 }));
}

export async function segmento(campania: NombreCampania): Promise<Destinatario[]> {
    if (campania === 'registro_pendiente') return segmentoRegistroPendiente();

    // Paginado obligatorio: Supabase corta en 1,000 filas por respuesta
    // (ajuste `max-rows` de PostgREST) y IGNORA un `.limit()` mayor. Pedir
    // 2,000 devolvía exactamente 1,000 sin error ni aviso, así que el
    // segmento venía truncado y nadie se enteraba: el reporte decía «1000»
    // como si ése fuera el tamaño real.
    const TAMANO = 1000;
    const filas: Destinatario[] = [];

    for (let desde = 0; ; desde += TAMANO) {
        const columnas = origen(campania) === 'user_profiles' ? COLUMNAS_PERFIL : COLUMNAS;
        const q = filtrar(admin().from(origen(campania)).select(columnas), campania);
        // Orden estable al paginar, o las páginas pueden solaparse y perder gente.
        const { data, error } = await q.order('id', { ascending: true }).range(desde, desde + TAMANO - 1);
        if (error) throw new Error(`segmento ${campania}: ${error.message}`);

        filas.push(...(data ?? []));
        if (!data || data.length < TAMANO) break;

        // Freno de seguridad por si algún día la base crece de golpe.
        if (desde > 50_000) break;
    }

    const limpias = filas.filter(
        (u: Destinatario) => u.email && !ADMINS.includes(u.email.toLowerCase()),
    );

    // El filtro por dominio va AQUÍ y no en la consulta: Supabase no permite
    // filtrar por la parte derecha del correo sin un `like` que barrería
    // también gmail. Con 1,969 filas el coste es irrelevante.
    return limpias;
}
