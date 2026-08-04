/**
 * Ciclo completo del programa «Invite y ascienda», del lado servidor.
 *
 *   registro con ?ref=CODIGO  →  referidos (padrino ↔ ahijado)
 *   el ahijado contrata Pro+  →  suscrito_pro_at
 *   al tercero                →  ascenso del padrino a Platinum, 3 meses
 *   a los 3 meses             →  reversión al plan que ya pagaba
 *
 * ─── CÓMO SE PAGA ────────────────────────────────────────────────────────
 * El abogado Pro NO deja de pagar. Su suscripción de Stripe queda intacta:
 * mismo precio, misma tarjeta, misma renovación. Lo que se le regala es el
 * INCREMENTO de capacidades, no la mensualidad.
 *
 * Por eso este módulo jamás toca Stripe. Sólo mueve `subscription_type` en
 * Supabase, que es de donde tanto la web como la API (main.py:8046) deciden
 * qué puede hacer el usuario. `stripe_subscription_id` no se altera.
 *
 * ─── EL RIESGO QUE ESTO RESUELVE ─────────────────────────────────────────
 * Cada renovación mensual dispara el webhook de Stripe, que llama a
 * `updateUserSubscription(email, 'pro_monthly')` y reescribe
 * `subscription_type`. Sin defensa, el ascenso moriría en la primera
 * renovación —dentro del primer mes— y el usuario perdería en silencio un
 * premio que le prometimos por tres. Nadie se enteraría: no hay error, sólo
 * una fila sobrescrita.
 *
 * La defensa es `hayAscensoActivo()`, que el webhook consulta antes de
 * degradar. El plan real de Stripe se guarda igual en `plan_previo`, así que
 * la reversión posterior devuelve al usuario a lo que de verdad paga.
 */

import { createClient } from '@supabase/supabase-js';
import {
    MESES_DE_PREMIO, PLANES_QUE_CUENTAN, REFERIDOS_NECESARIOS,
    codigoReferido, vencimientoDelPremio,
} from './correo/referidos';

const PLAN_PREMIO = 'platinum_monthly';
const LIMITE_PLATINUM = 560;

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
 * Ata a un usuario recién registrado con quien lo invitó.
 * Silencioso a propósito: si el código no existe o el usuario se
 * autorreferencia, el alta continúa igual. Nunca se rompe un registro por
 * culpa del programa de referidos.
 */
export async function registrarReferido(codigo: string, ahijadoId: string): Promise<boolean> {
    const padrino = await padrinoDelCodigo(codigo);
    if (!padrino || padrino.id === ahijadoId) return false;

    const { error } = await admin()
        .from('referidos')
        .insert({ padrino_id: padrino.id, ahijado_id: ahijadoId });

    // El índice único de ahijado_id impide contarlo dos veces; si ya estaba,
    // no es un error que deba propagarse.
    return !error;
}

/** ¿Este usuario tiene un ascenso vigente ahora mismo? */
export async function hayAscensoActivo(email: string): Promise<boolean> {
    const { data: perfil } = await admin()
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
    if (!perfil) return false;

    const { data } = await admin()
        .from('ascensos_referido')
        .select('id')
        .eq('usuario_id', perfil.id)
        .is('revertido_at', null)
        .gt('vence_at', new Date().toISOString())
        .maybeSingle();

    return !!data;
}

/**
 * Marca que un referido contrató un plan de pago y, si con él el padrino
 * llega a tres, le otorga el ascenso.
 *
 * Se llama desde el webhook de Stripe, después de actualizar la suscripción.
 */
export async function alSuscribirseUnReferido(emailDelAhijado: string, plan: string) {
    if (!PLANES_QUE_CUENTAN.includes(plan)) return { contado: false, ascenso: null };

    const cliente = admin();

    const { data: ahijado } = await cliente
        .from('user_profiles')
        .select('id')
        .eq('email', emailDelAhijado.toLowerCase().trim())
        .maybeSingle();
    if (!ahijado) return { contado: false, ascenso: null };

    const { data: vinculo } = await cliente
        .from('referidos')
        .select('id, padrino_id, suscrito_pro_at')
        .eq('ahijado_id', ahijado.id)
        .maybeSingle();
    if (!vinculo) return { contado: false, ascenso: null };

    // Sólo se cuenta la primera vez: si renueva, no suma otro.
    if (!vinculo.suscrito_pro_at) {
        await cliente
            .from('referidos')
            .update({ suscrito_pro_at: new Date().toISOString() })
            .eq('id', vinculo.id);
    }

    const ascenso = await evaluarAscenso(vinculo.padrino_id);
    return { contado: true, ascenso };
}

/**
 * ¿El padrino ya juntó los tres? Si sí, y no tiene otro ascenso corriendo,
 * se le otorga.
 */
export async function evaluarAscenso(padrinoId: string) {
    const cliente = admin();

    const { count } = await cliente
        .from('referidos')
        .select('id', { count: 'exact', head: true })
        .eq('padrino_id', padrinoId)
        .not('suscrito_pro_at', 'is', null);

    if ((count ?? 0) < REFERIDOS_NECESARIOS) {
        return { otorgado: false, faltan: REFERIDOS_NECESARIOS - (count ?? 0) };
    }

    const { data: yaTiene } = await cliente
        .from('ascensos_referido')
        .select('id')
        .eq('usuario_id', padrinoId)
        .is('revertido_at', null)
        .gt('vence_at', new Date().toISOString())
        .maybeSingle();
    if (yaTiene) return { otorgado: false, motivo: 'ya tiene un ascenso vigente' };

    const { data: perfil } = await cliente
        .from('user_profiles')
        .select('subscription_type')
        .eq('id', padrinoId)
        .maybeSingle();
    if (!perfil) return { otorgado: false, motivo: 'perfil no encontrado' };

    // El premio es para quien paga Pro. A un Platinum no hay nada que subirle,
    // y a un gratuito no le corresponde: la oferta era para clientes.
    if (!PLANES_QUE_CUENTAN.includes(perfil.subscription_type)) {
        return { otorgado: false, motivo: 'el padrino no tiene plan de pago vigente' };
    }
    if (perfil.subscription_type.startsWith('platinum') ||
        perfil.subscription_type === 'ultra_secretarios') {
        return { otorgado: false, motivo: 'ya está en Platinum o superior' };
    }

    const vence = vencimientoDelPremio();

    // Se guarda el plan que de verdad paga ANTES de tocar nada: es lo único
    // que permitirá devolverlo a su sitio dentro de tres meses.
    const { error: eAsc } = await cliente.from('ascensos_referido').insert({
        usuario_id: padrinoId,
        plan_previo: perfil.subscription_type,
        vence_at: vence.toISOString(),
    });
    if (eAsc) return { otorgado: false, motivo: eAsc.message };

    // Sólo capacidades. Stripe no se toca: sigue cobrando su plan Pro.
    await cliente
        .from('user_profiles')
        .update({
            subscription_type: PLAN_PREMIO,
            queries_limit: LIMITE_PLATINUM,
            updated_at: new Date().toISOString(),
        })
        .eq('id', padrinoId);

    return {
        otorgado: true,
        plan_previo: perfil.subscription_type,
        vence_at: vence.toISOString(),
        meses: MESES_DE_PREMIO,
    };
}

/**
 * Devuelve a su plan a quienes ya cumplieron los tres meses.
 * Lo llama el cron diario.
 */
export async function revertirVencidos() {
    const cliente = admin();
    const ahora = new Date().toISOString();

    const { data: vencidos } = await cliente
        .from('ascensos_referido')
        .select('id, usuario_id, plan_previo')
        .is('revertido_at', null)
        .lte('vence_at', ahora);

    const revertidos: string[] = [];

    for (const a of vencidos ?? []) {
        const limite = a.plan_previo.startsWith('pro') ? 140
            : a.plan_previo === 'basico_monthly' ? 70
            : a.plan_previo === 'ultra_secretarios' ? 140 : 5;

        await cliente
            .from('user_profiles')
            .update({
                subscription_type: a.plan_previo,
                queries_limit: limite,
                updated_at: ahora,
            })
            .eq('id', a.usuario_id)
            // Si el usuario contrató Platinum de verdad en el ínterin, no se
            // le degrada: sólo se revierte a quien sigue en el plan de premio.
            .eq('subscription_type', PLAN_PREMIO);

        await cliente
            .from('ascensos_referido')
            .update({ revertido_at: ahora })
            .eq('id', a.id);

        revertidos.push(a.usuario_id);
    }

    return { revertidos: revertidos.length, usuarios: revertidos };
}

/** Estado del programa para un usuario, para pintarlo en su perfil. */
export async function estadoDeReferidos(usuarioId: string) {
    const cliente = admin();

    const { data: vinculos } = await cliente
        .from('referidos')
        .select('registrado_at, suscrito_pro_at')
        .eq('padrino_id', usuarioId);

    const invitados = vinculos?.length ?? 0;
    const suscritos = vinculos?.filter((v) => v.suscrito_pro_at).length ?? 0;

    const { data: ascenso } = await cliente
        .from('ascensos_referido')
        .select('otorgado_at, vence_at, plan_previo, revertido_at')
        .eq('usuario_id', usuarioId)
        .order('otorgado_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return {
        codigo: await asegurarCodigo(usuarioId),
        invitados,
        suscritos,
        faltan: Math.max(0, REFERIDOS_NECESARIOS - suscritos),
        necesarios: REFERIDOS_NECESARIOS,
        ascenso: ascenso ?? null,
    };
}
