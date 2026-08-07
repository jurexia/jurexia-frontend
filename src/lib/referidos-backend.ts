/**
 * Ciclo completo del programa «Regale Iurexia», del lado servidor.
 *
 *   registro con ?ref=CODIGO  →  referidos (padrino ↔ ahijado)
 *                             →  el AHIJADO recibe 6 días de Pro en el acto
 *   el ahijado hace 1 consulta →  activado_at: ya cuenta como usuario real
 *   1 / 3 / 5 activados        →  el PADRINO cobra 6 / 15 / 30 días de Pro
 *   al vencer                  →  reversión al plan que de verdad tenía
 *
 * ─── CÓMO SE PAGA ────────────────────────────────────────────────────────
 * Nadie deja de pagar lo que ya pagaba. La suscripción de Stripe queda
 * intacta: mismo precio, misma tarjeta, misma renovación. Lo que se regala
 * es el INCREMENTO de capacidades, no la mensualidad.
 *
 * Por eso este módulo jamás toca Stripe. Sólo mueve `subscription_type` en
 * Supabase, que es de donde tanto la web como la API (main.py:8046) deciden
 * qué puede hacer el usuario. `stripe_subscription_id` no se altera.
 *
 * ─── EL RIESGO QUE ESTO RESUELVE ─────────────────────────────────────────
 * Cada renovación mensual dispara el webhook de Stripe, que llama a
 * `updateUserSubscription(email, 'pro_monthly')` y reescribe
 * `subscription_type`. Sin defensa, el premio moriría en la primera
 * renovación y el usuario perdería en silencio algo que le prometimos.
 * Nadie se enteraría: no hay error, sólo una fila sobrescrita.
 *
 * La defensa es `premioVigente()`, que el webhook consulta antes de escribir.
 * Devuelve el PLAN otorgado —ya no siempre Platinum— y el webhook se queda
 * con el mejor de los dos. El plan real de Stripe se guarda en `plan_previo`,
 * así que la reversión posterior devuelve al usuario a lo que de verdad paga.
 *
 * ─── LA ASIMETRÍA QUE HAY QUE RESPETAR ───────────────────────────────────
 * El premio NUNCA debe degradar a nadie. Un gratuito con regalo de Pro que
 * contrata Platinum de verdad se queda con Platinum; la reversión sólo actúa
 * sobre quien sigue exactamente en el plan que se le regaló. Toda escritura
 * de este módulo lleva esa condición.
 */

import { createClient } from '@supabase/supabase-js';
import {
    DIAS_DE_BIENVENIDA, ESCALERA, META_ESCALERA, NIVEL_BIENVENIDA,
    PLANES_QUE_CUENTAN, PLAN_REGALO,
    codigoReferido, peldanoAlcanzado, siguientePeldano, vencimientoEnDias,
} from './correo/referidos';

/** Cuota mensual de cada plan. Espejo de PLAN_CONFIG en supabase-admin. */
const LIMITE: Record<string, number> = {
    gratuito: 5,
    basico_monthly: 70,
    pro_monthly: 140,
    pro_annual: 140,
    platinum_monthly: 560,
    platinum_annual: 560,
    ultra_secretarios: 140,
};

/** Jerarquía para no degradar nunca a nadie por culpa de un premio. */
const RANGO: Record<string, number> = {
    gratuito: 0,
    basico_monthly: 1,
    pro_monthly: 2,
    pro_annual: 2,
    ultra_secretarios: 2,
    platinum_monthly: 3,
    platinum_annual: 3,
};

const rango = (plan: string) => RANGO[plan] ?? 0;

/** Forma única del resultado de la escalera: el llamador no adivina. */
export type PremioEscalera = {
    otorgado: boolean;
    activos: number;
    nivel: number;
    dias: number;
    vence_at: string | null;
    faltan: number;
    motivo?: string;
};

/** Forma única del resultado de un premio otorgado. */
type ResultadoPremio = {
    otorgado: boolean;
    plan?: string;
    dias?: number;
    nivel?: number;
    vence_at?: string;
    motivo?: string;
};

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

/** Asegura que el usuario tenga su código guardado, y lo devuelve. */
export async function asegurarCodigo(usuarioId: string): Promise<string> {
    const codigo = codigoReferido(usuarioId);
    await admin()
        .from('user_profiles')
        .update({ codigo_referido: codigo })
        .eq('id', usuarioId)
        .is('codigo_referido', null);
    return codigo;
}

/** Busca al dueño de un código de invitación. */
export async function padrinoDelCodigo(codigo: string): Promise<{ id: string; email: string } | null> {
    const limpio = (codigo || '').trim().toUpperCase();
    if (limpio.length !== 8) return null;

    const { data } = await admin()
        .from('user_profiles')
        .select('id, email')
        .eq('codigo_referido', limpio)
        .maybeSingle();

    return data ?? null;
}

/**
 * Ata a un usuario recién registrado con quien lo invitó, y le entrega en el
 * acto sus días de bienvenida.
 *
 * Silencioso a propósito: si el código no existe o el usuario se
 * autorreferencia, el alta continúa igual. Nunca se rompe un registro por
 * culpa del programa de referidos — ni siquiera si falla el regalo.
 */
export async function registrarReferido(codigo: string, ahijadoId: string) {
    const padrino = await padrinoDelCodigo(codigo);
    if (!padrino || padrino.id === ahijadoId) return { atado: false, regalo: null };

    const { error } = await admin()
        .from('referidos')
        .insert({ padrino_id: padrino.id, ahijado_id: ahijadoId });

    // El índice único de ahijado_id impide contarlo dos veces; si ya estaba,
    // no es un error que deba propagarse — pero tampoco se regala otra vez.
    if (error) return { atado: false, regalo: null };

    // El invitado cobra PRIMERO. Es lo que convierte la invitación en un
    // regalo y no en un favor, que era el defecto del programa anterior.
    const regalo = await otorgarPremio(ahijadoId, DIAS_DE_BIENVENIDA, NIVEL_BIENVENIDA)
        .catch(() => null);

    return { atado: true, regalo };
}

/**
 * Otorga N días del plan de regalo, sin tocar Stripe.
 *
 * No degrada jamás: si el usuario ya está en un plan igual o mejor que el
 * regalo, se registra el intento como no otorgado y su cuenta no se toca.
 * `plan_previo` guarda lo que tenía ANTES, que es lo único que permitirá
 * devolverlo a su sitio cuando venzan los días.
 */
async function otorgarPremio(usuarioId: string, dias: number, nivel: number): Promise<ResultadoPremio> {
    const cliente = admin();

    const ahora = new Date();

    const { data: perfil } = await cliente
        .from('user_profiles')
        .select('subscription_type')
        .eq('id', usuarioId)
        .maybeSingle();
    if (!perfil) return { otorgado: false, motivo: 'perfil no encontrado' };

    // ── PREMIOS QUE SE ACUMULAN ──────────────────────────────────────────
    // Un usuario cobra el regalo de bienvenida y después peldaños de la
    // escalera: al segundo premio ya está EN el plan regalado. Sin este
    // bloque pasaban dos cosas, ambas silenciosas y ambas caras:
    //
    //   · `plan_previo` del segundo premio habría guardado 'pro_monthly'
    //     —el plan que le regalamos, no el suyo—, así que al revertir se
    //     habría quedado en Pro PARA SIEMPRE, gratis.
    //   · el primero en vencer lo habría degradado aunque el segundo
    //     siguiera corriendo.
    //
    // Por eso, si ya hay un premio vigente, no se crea otro tramo desde
    // cero: se ALARGA el que existe conservando su `plan_previo` original,
    // que es el único dato que sabe a dónde devolver al usuario.
    const { data: vigente } = await cliente
        .from('ascensos_referido')
        .select('id, plan_previo, vence_at')
        .eq('usuario_id', usuarioId)
        .eq('plan_premio', PLAN_REGALO)
        .is('revertido_at', null)
        .gt('vence_at', ahora.toISOString())
        .order('vence_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const origen = vigente?.plan_previo ?? (perfil.subscription_type || 'gratuito');

    // Nunca degradar: si lo que de verdad tiene es igual o mejor que el
    // regalo, no hay nada que darle y su cuenta no se toca.
    if (rango(origen) >= rango(PLAN_REGALO)) {
        return { otorgado: false, motivo: `ya tiene ${origen}, que no es inferior al regalo` };
    }

    // El peldaño se sella siempre —así el índice único impide cobrarlo dos
    // veces— aunque los días se sumen sobre el tramo vigente.
    const desde = vigente ? new Date(vigente.vence_at) : ahora;
    const vence = vencimientoEnDias(dias, desde);

    const { error } = await cliente.from('ascensos_referido').insert({
        usuario_id: usuarioId,
        plan_previo: origen,
        plan_premio: PLAN_REGALO,
        nivel,
        vence_at: vence.toISOString(),
    });
    // El índice único (usuario_id, nivel) para nivel>0 es lo que impide pagar
    // dos veces el mismo peldaño. Si choca, ya estaba pagado: no es un fallo.
    if (error) return { otorgado: false, motivo: 'ese peldaño ya estaba otorgado' };

    await cliente
        .from('user_profiles')
        .update({
            subscription_type: PLAN_REGALO,
            queries_limit: LIMITE[PLAN_REGALO],
            updated_at: ahora.toISOString(),
        })
        .eq('id', usuarioId);

    return { otorgado: true, plan: PLAN_REGALO, dias, nivel, vence_at: vence.toISOString() };
}

/**
 * Sella qué invitados ya son usuarios REALES y paga los peldaños que toquen.
 *
 * «Real» = correo verificado (lo es por construcción: la cuenta sólo nace
 * tras el OTP) Y al menos una conversación. El conteo se hace AQUÍ, en el
 * servidor con la llave de servicio, nunca con un dato que mande el
 * navegador: el premio es dinero y el navegador es del usuario.
 *
 * Se llama desde el cron diario (para todos) y al abrir el panel de referidos
 * (sólo para ese padrino), así el abogado ve su avance al momento.
 */
export async function sincronizarActivaciones(padrinoId?: string) {
    const cliente = admin();

    let q = cliente.from('referidos').select('id, padrino_id, ahijado_id').is('activado_at', null);
    if (padrinoId) q = q.eq('padrino_id', padrinoId);
    const { data: pendientes } = await q;
    if (!pendientes?.length) return { activados: 0, premios: [] as any[] };

    const ahora = new Date().toISOString();
    const padrinosTocados = new Set<string>();
    let activados = 0;

    for (const v of pendientes) {
        const { count } = await cliente
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', v.ahijado_id);

        if ((count ?? 0) < 1) continue;

        await cliente.from('referidos').update({ activado_at: ahora }).eq('id', v.id);
        padrinosTocados.add(v.padrino_id);
        activados++;
    }

    const premios: PremioEscalera[] = [];
    for (const p of Array.from(padrinosTocados)) premios.push(await evaluarEscalera(p));

    return { activados, premios: premios.filter((p) => p?.otorgado) };
}

/**
 * ¿Este padrino alcanzó un peldaño nuevo? Si sí, se le paga.
 *
 * Se paga SÓLO el peldaño más alto alcanzado. Los inferiores ya se cobraron
 * en su momento —el índice único los protege—, así que no hay doble pago ni
 * al subir del tercero al quinto.
 */
export async function evaluarEscalera(padrinoId: string): Promise<PremioEscalera> {
    const cliente = admin();

    const { count } = await cliente
        .from('referidos')
        .select('id', { count: 'exact', head: true })
        .eq('padrino_id', padrinoId)
        .not('activado_at', 'is', null);

    const activos = count ?? 0;
    const peldano = peldanoAlcanzado(activos);
    if (!peldano) {
        return {
            otorgado: false, activos, nivel: 0, dias: 0, vence_at: null,
            faltan: siguientePeldano(activos)?.faltan ?? 0,
            motivo: 'aún no alcanza el primer peldaño',
        };
    }

    const r = await otorgarPremio(padrinoId, peldano.dias, peldano.nivel);
    return {
        otorgado: r.otorgado,
        activos,
        nivel: peldano.nivel,
        dias: peldano.dias,
        vence_at: r.vence_at ?? null,
        faltan: siguientePeldano(activos)?.faltan ?? 0,
        motivo: r.motivo,
    };
}

/**
 * El premio vigente de un usuario, o null. Lo consulta el webhook de Stripe
 * antes de escribir, para no borrar en silencio algo que prometimos.
 *
 * Devuelve el PLAN otorgado: desde que la escalera regala Pro y no sólo
 * Platinum, el webhook no puede suponer cuál era.
 */
export async function premioVigente(email: string): Promise<{ plan: string; vence_at: string } | null> {
    const { data: perfil } = await admin()
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
    if (!perfil) return null;

    const { data } = await admin()
        .from('ascensos_referido')
        .select('plan_premio, vence_at')
        .eq('usuario_id', perfil.id)
        .is('revertido_at', null)
        .gt('vence_at', new Date().toISOString())
        .order('vence_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return data ? { plan: data.plan_premio, vence_at: data.vence_at } : null;
}

/** Compatibilidad con el llamador anterior. */
export async function hayAscensoActivo(email: string): Promise<boolean> {
    return !!(await premioVigente(email));
}

/**
 * Marca que un referido contrató un plan de pago. Ya no otorga nada por sí
 * solo —la escalera premia la ACTIVACIÓN, no la compra— pero se conserva el
 * sello: es la métrica que dice cuánto vale de verdad cada referido.
 *
 * Se llama desde el webhook de Stripe, después de actualizar la suscripción.
 */
export async function alSuscribirseUnReferido(emailDelAhijado: string, plan: string) {
    if (!PLANES_QUE_CUENTAN.includes(plan)) return { contado: false };

    const cliente = admin();

    const { data: ahijado } = await cliente
        .from('user_profiles')
        .select('id')
        .eq('email', emailDelAhijado.toLowerCase().trim())
        .maybeSingle();
    if (!ahijado) return { contado: false };

    const { data: vinculo } = await cliente
        .from('referidos')
        .select('id, padrino_id, suscrito_pro_at, activado_at')
        .eq('ahijado_id', ahijado.id)
        .maybeSingle();
    if (!vinculo) return { contado: false };

    const ahora = new Date().toISOString();
    const parche: Record<string, string> = {};
    if (!vinculo.suscrito_pro_at) parche.suscrito_pro_at = ahora;
    // Quien paga es, sin discusión, un usuario real: si por lo que sea no
    // tenía conversación sellada, el pago lo activa.
    if (!vinculo.activado_at) parche.activado_at = ahora;

    if (Object.keys(parche).length) {
        await cliente.from('referidos').update(parche).eq('id', vinculo.id);
    }

    const premio = parche.activado_at ? await evaluarEscalera(vinculo.padrino_id) : null;
    return { contado: true, premio };
}

/**
 * Devuelve a su plan a quienes ya cumplieron sus días.
 * Lo llama el cron diario.
 */
export async function revertirVencidos() {
    const cliente = admin();
    const ahora = new Date().toISOString();

    const { data: vencidos } = await cliente
        .from('ascensos_referido')
        .select('id, usuario_id, plan_previo, plan_premio')
        .is('revertido_at', null)
        .lte('vence_at', ahora);

    const revertidos: string[] = [];

    for (const a of vencidos ?? []) {
        const previo = a.plan_previo || 'gratuito';

        // ¿Le queda otro premio corriendo? Los tramos se alargan encadenados,
        // pero un usuario puede tener varias filas y no se le puede quitar el
        // plan mientras alguna siga viva: se marca ésta como revertida y su
        // cuenta se deja en paz.
        const { data: otro } = await cliente
            .from('ascensos_referido')
            .select('id')
            .eq('usuario_id', a.usuario_id)
            .is('revertido_at', null)
            .neq('id', a.id)
            .gt('vence_at', ahora)
            .limit(1)
            .maybeSingle();

        if (!otro) {
            await cliente
                .from('user_profiles')
                .update({
                    subscription_type: previo,
                    queries_limit: LIMITE[previo] ?? 5,
                    updated_at: ahora,
                })
                .eq('id', a.usuario_id)
                // Sólo se degrada a quien SIGUE en el plan que se le regaló.
                // Si contrató de verdad en el ínterin, no se le toca.
                .eq('subscription_type', a.plan_premio);

            revertidos.push(a.usuario_id);
        }

        await cliente
            .from('ascensos_referido')
            .update({ revertido_at: ahora })
            .eq('id', a.id);
    }

    return { revertidos: revertidos.length, usuarios: revertidos };
}

/** Estado del programa para un usuario, para pintarlo en su perfil. */
export async function estadoDeReferidos(usuarioId: string) {
    const cliente = admin();

    // Se sincroniza al abrir el panel: si un invitado ya consultó, el abogado
    // ve su avance —y cobra su peldaño— sin esperar al cron de la tarde.
    await sincronizarActivaciones(usuarioId).catch(() => null);

    const { data: vinculos } = await cliente
        .from('referidos')
        .select('registrado_at, activado_at, suscrito_pro_at')
        .eq('padrino_id', usuarioId);

    const invitados = vinculos?.length ?? 0;
    const activos = vinculos?.filter((v) => v.activado_at).length ?? 0;
    const suscritos = vinculos?.filter((v) => v.suscrito_pro_at).length ?? 0;

    const { data: premio } = await cliente
        .from('ascensos_referido')
        .select('otorgado_at, vence_at, plan_previo, plan_premio, nivel, revertido_at')
        .eq('usuario_id', usuarioId)
        .is('revertido_at', null)
        .gt('vence_at', new Date().toISOString())
        .order('vence_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return {
        codigo: await asegurarCodigo(usuarioId),
        invitados,
        activos,
        suscritos,
        meta: META_ESCALERA,
        escalera: ESCALERA,
        diasDeBienvenida: DIAS_DE_BIENVENIDA,
        siguiente: siguientePeldano(activos),
        premio: premio ?? null,
    };
}
