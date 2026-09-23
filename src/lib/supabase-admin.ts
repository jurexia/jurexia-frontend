import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service_role key
// This client bypasses Row Level Security (RLS) - use ONLY in server-side code (API routes, webhooks)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminInstance: any = null;

function getSupabaseAdmin(): any {
    if (!adminInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured');
        }

        adminInstance = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return adminInstance;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA CUOTA DE CADA PLAN
   ═══════════════════════════════════════════════════════════════════════════
   `proyectosMes` es nuevo y es una bolsa APARTE de `queriesLimit`. Hasta ahora
   una sentencia del taller costaba 10 consultas del chat, y eso mezcla dos
   cosas que no se parecen: una consulta vale céntimos y un proyecto cuesta
   minutos de motor. Además el secretario no puede saber cuántos proyectos le
   quedan mirando un número de consultas.

   Se gasta primero la cuota del mes —que caduca— y sólo después las recargas
   —que no—. Ver `consumir_proyecto_taller` en la base de datos: el orden está
   ahí y es deliberado.

   La cuenta gratuita no lleva cuota mensual: lleva UNA prueba de por vida, que
   se cuenta aparte en `proyectos_prueba_usados`. Es para que conozca la
   herramienta, no para redactar un proyecto gratis cada treinta días. */
export const PLAN_CONFIG = {
    gratuito: { queriesLimit: 5, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    basico_monthly: { queriesLimit: 70, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    // El Básico anual da lo mismo que el mensual: cambia el cobro, no el
    // derecho. Faltaba aquí, y por eso el webhook no sabía cuántas consultas
    // darle a quien lo comprara. Igual que pro_annual espeja a pro_monthly.
    basico_annual: { queriesLimit: 70, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    pro_monthly: { queriesLimit: 140, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    pro_annual: { queriesLimit: 140, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    platinum_monthly: { queriesLimit: 560, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    platinum_annual: { queriesLimit: 560, draftsLimit: 0, sentenciaQueriesLimit: 0, isUnlimited: false, proyectosMes: 0 },
    // ULTRA SECRETARIOS, tal como David lo definió el 13-sep-2026: «el
    // secretario tendrá acceso al chat (560 consultas como ultra) y podrá
    // generar 40 proyectos de sentencia al mes». Las 560 son las mismas que
    // Platinum; los 40 proyectos son la bolsa nueva.
    //
    // ESTABA MAL Y HABRÍA COBRADO DE MENOS: decía 140 consultas —las de Pro—
    // aunque el plan cuesta 999 y se anuncia por encima de Platinum, que da
    // 560. Quien lo hubiera comprado habría recibido menos chat que alguien
    // pagando 599.
    ultra_secretarios: { queriesLimit: 560, draftsLimit: 20, sentenciaQueriesLimit: 50, isUnlimited: false, proyectosMes: 40 },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;

/**
 * Update a user's subscription in Supabase based on Stripe events.
 * Includes row-count verification and fallback diagnostics.
 */
export async function updateUserSubscription(
    email: string,
    subscriptionType: PlanType,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string,
    resetUsage: boolean = false
) {
    const normalizedEmail = email.toLowerCase().trim();
    let config = PLAN_CONFIG[subscriptionType];
    let tipoAEscribir: PlanType = subscriptionType;

    // ── Defensa del ascenso por referidos ────────────────────────────────
    // Cada renovación mensual dispara este webhook con el plan REAL de Stripe
    // (pro_monthly). Si un usuario está gozando su Platinum de tres meses por
    // haber invitado a tres colegas, escribir 'pro_monthly' aquí se lo quita
    // en silencio: sin error, sin aviso, sólo una fila sobrescrita. El premio
    // moriría en la primera renovación en vez de durar los tres meses
    // prometidos.
    //
    // El plan de Stripe se sigue respetando para el cobro —esto no toca la
    // suscripción, el abogado sigue pagando su Pro— y `plan_previo` ya guardó
    // ese dato, así que la reversión al vencer devuelve lo correcto.
    //
    // Desde la escalera de «Regale Iurexia» el premio ya NO es siempre
    // Platinum: puede ser Pro. Suponerlo escribía Platinum a un cliente que
    // sólo tenía regalados días de Pro — le habríamos regalado un plan que
    // nadie prometió. Por eso se consulta QUÉ plan se otorgó y se conserva el
    // MEJOR de los dos: el premio nunca degrada, y Stripe nunca se degrada
    // por culpa del premio. Si el usuario contrató de verdad algo superior,
    // ese manda y el premio simplemente queda por debajo.
    const RANGO: Record<string, number> = {
        gratuito: 0, basico_monthly: 1,
        pro_monthly: 2, pro_annual: 2, ultra_secretarios: 2,
        platinum_monthly: 3, platinum_annual: 3,
    };

    if (subscriptionType !== 'gratuito') {
        try {
            const { premioVigente } = await import('./referidos-backend');
            const premio = await premioVigente(normalizedEmail);
            if (premio && (RANGO[premio.plan] ?? 0) > (RANGO[subscriptionType] ?? 0)) {
                console.log(`🎁 ${normalizedEmail} tiene ${premio.plan} de regalo vigente — se conserva`);
                tipoAEscribir = premio.plan as PlanType;
                config = PLAN_CONFIG[premio.plan as PlanType] ?? config;
            }
        } catch (e) {
            // Si la comprobación falla, se sigue con el plan de Stripe: es
            // preferible perder el premio a dejar la suscripción sin escribir.
            console.error('No pude comprobar el premio por referidos:', e);
        }
    }

    console.log(`🔄 updateUserSubscription called:`, {
        email: normalizedEmail,
        subscriptionType,
        escrito: tipoAEscribir,
        queriesLimit: config.queriesLimit,
        stripeCustomerId,
        stripeSubscriptionId,
    });

    const updatePayload: any = {
        subscription_type: tipoAEscribir,
        queries_limit: config.queriesLimit,
        drafts_limit: config.draftsLimit,
        sentencia_queries_limit: config.sentenciaQueriesLimit,
        /* LA CUOTA DE PROYECTOS VIAJA CON EL PLAN. Si no se escribe aquí, quien
           compre Ultra se queda con el 0 por defecto de la columna y paga 999
           por un taller que no le deja generar nada. Bajar de plan también la
           ajusta, que es lo correcto: el derecho es del plan vigente.
           LO RECARGADO NO SE TOCA NUNCA: está comprado aparte y no caduca; si
           una bajada de plan lo borrara, sería quedarse con dinero cobrado. */
        proyectos_mes_limite: config.proyectosMes,
        stripe_customer_id: stripeCustomerId || undefined,
        stripe_subscription_id: stripeSubscriptionId || undefined,
        is_active: true,
        updated_at: new Date().toISOString(),
    };

    if (resetUsage) {
        updatePayload.queries_used = 0;
        updatePayload.drafts_used = 0;
        updatePayload.sentencia_queries_used = 0;
        // El mes empieza de cero al renovar, igual que las consultas. La fecha
        // del periodo la pone la propia función de consumo si se queda vacía.
        updatePayload.proyectos_mes_usados = 0;
    }

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update(updatePayload)
        .eq('email', normalizedEmail)
        .select();

    if (error) {
        console.error(`❌ Supabase UPDATE error for ${normalizedEmail}:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });
        throw error;
    }

    // Force queries_limit override to bypass the DB trigger auto_update_queries_limit
    try {
        console.log(`🔄 Overriding DB trigger queries_limit for ${normalizedEmail} to ${config.queriesLimit}`);
        await getSupabaseAdmin()
            .from('user_profiles')
            .update({ queries_limit: config.queriesLimit })
            .eq('email', normalizedEmail);
    } catch (triggerOverrideErr) {
        console.error(`⚠️ DB trigger override failed for ${normalizedEmail} (continuing):`, triggerOverrideErr);
    }

    // Check if any rows were actually updated
    if (!data || data.length === 0) {
        console.error(`⚠️ UPDATE affected 0 rows for email "${normalizedEmail}"`);

        // Diagnostic: check if the profile exists at all
        const { data: existing, error: lookupError } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('id, email, subscription_type')
            .ilike('email', normalizedEmail);

        if (lookupError) {
            console.error(`❌ Diagnostic lookup failed:`, lookupError);
        } else if (!existing || existing.length === 0) {
            console.error(`❌ No user_profiles row found for email "${normalizedEmail}" — profile may not have been created on signup`);
        } else {
            console.log(`🔍 Found ${existing.length} profile(s) for "${normalizedEmail}":`, existing);
            // The row exists but the update didn't match — could be case sensitivity
            // Retry with ilike match on the actual id
            const profileId = existing[0].id;
            console.log(`🔄 Retrying update using profile id: ${profileId}`);

            const { data: retryData, error: retryError } = await getSupabaseAdmin()
                .from('user_profiles')
                .update(updatePayload)
                .eq('id', profileId)
                .select();

            if (retryError) {
                console.error(`❌ Retry UPDATE by id failed:`, retryError);
                throw retryError;
            }

            // Force queries_limit override on retry
            try {
                await getSupabaseAdmin()
                    .from('user_profiles')
                    .update({ queries_limit: config.queriesLimit })
                    .eq('id', profileId);
            } catch (triggerOverrideErr) {
                console.error(`⚠️ DB trigger override retry failed for ${profileId} (continuing):`, triggerOverrideErr);
            }

            if (retryData && retryData.length > 0) {
                console.log(`✅ Retry succeeded! Updated profile for ${normalizedEmail} via id:`, retryData[0]);
                return;
            }

            console.error(`❌ Retry also matched 0 rows — possible constraint violation`);
        }

        throw new Error(`Failed to update subscription: no rows matched for email "${normalizedEmail}"`);
    }

    console.log(`✅ Updated subscription for ${normalizedEmail}: ${subscriptionType} (limit: ${config.queriesLimit})`, {
        updatedRow: data[0],
    });
}

/**
 * Downgrade a user to the free plan.
 * @param canceledSubscriptionId - If provided, only downgrade if this matches the
 *   user's current stripe_subscription_id. This prevents incorrectly downgrading
 *   users who upgraded (old sub canceled, but new sub is already active).
 */
export async function downgradeToFree(email: string, canceledSubscriptionId?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // ─── Guard: only downgrade if the canceled subscription is the CURRENT one ───
    // When a user upgrades (e.g., Básico → Pro), Stripe cancels the old sub and
    // creates a new one. The webhook fires customer.subscription.deleted for the
    // OLD sub. If the user already has a NEW sub active, we must NOT downgrade.
    if (canceledSubscriptionId) {
        const { data: profile } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('stripe_subscription_id, subscription_type')
            .eq('email', normalizedEmail)
            .single();

        if (profile && profile.stripe_subscription_id && profile.stripe_subscription_id !== canceledSubscriptionId) {
            console.log(`⏭️ SKIP downgrade for ${normalizedEmail}: webhook sub=${canceledSubscriptionId}, current sub=${profile.stripe_subscription_id} (user has a newer subscription — likely an upgrade)`);
            return;
        }
    }

    // ─── Guard: un regalo vigente sobrevive a la cancelación en Stripe ───
    // Sin esto, quien tenía un plan regalado —un premio de referidos, una
    // compensación de soporte— y además cancelaba su suscripción de pago se
    // quedaba en gratuito al instante, aunque su regalo siguiera corriendo. El
    // regalo desaparecía sin que nadie se enterara: el usuario ve que su plan
    // bajó, nosotros vemos una cancelación normal, y el tramo sigue vivo en
    // `ascensos_referido` esperando a revertir algo que ya no está.
    //
    // Si hay un tramo vigente, se conserva el plan regalado y sus consultas.
    // Lo demás de la cancelación sí se aplica: la suscripción de Stripe se
    // desvincula porque, en efecto, ya no existe. Cuando el tramo venza,
    // `revertirVencidos` la devolverá a su `plan_previo`, que es quien sabe a
    // dónde corresponde.
    // Se resuelve en dos pasos y no con un join anidado: un join depende de que
    // exista la relación declarada entre las tablas, y si no existiera esta
    // consulta devolvería vacío en vez de fallar — o sea, borraría el regalo
    // sin decir nada, que es justo lo que se quiere evitar.
    let planDestino: PlanType = 'gratuito';
    const { data: quien } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();
    const { data: regalo } = quien?.id
        ? await getSupabaseAdmin()
            .from('ascensos_referido')
            .select('plan_premio, vence_at')
            .eq('usuario_id', quien.id)
            .is('revertido_at', null)
            .gt('vence_at', new Date().toISOString())
            .order('vence_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };
    if (regalo?.plan_premio && regalo.plan_premio in PLAN_CONFIG) {
        planDestino = regalo.plan_premio as PlanType;
        console.log(`🎁 ${normalizedEmail} cancela en Stripe pero conserva ${planDestino} ` +
            `por un regalo vigente hasta ${regalo.vence_at}`);
    }

    const cfgDestino = PLAN_CONFIG[planDestino];
    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            subscription_type: planDestino,
            queries_limit: cfgDestino.queriesLimit,
            queries_used: 0,
            drafts_limit: cfgDestino.draftsLimit,
            drafts_used: 0,
            sentencia_queries_limit: cfgDestino.sentenciaQueriesLimit,
            sentencia_queries_used: 0,
            stripe_subscription_id: null,
            // Sigue activa si le queda un regalo corriendo; si no, se apaga.
            is_active: planDestino !== 'gratuito',
            // La suspensión por impago muere aquí: cuando la suscripción se
            // acaba de verdad ya no hay nada que cobrar, y dejar la fecha
            // puesta le cerraría hasta el nivel gratuito a quien ya no debe nada.
            suspendido_at: null,
            updated_at: new Date().toISOString(),
        } as any)
        .eq('email', normalizedEmail)
        .select();

    if (error) {
        console.error(`❌ Failed to downgrade ${normalizedEmail}:`, error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.error(`⚠️ downgradeToFree: 0 rows updated for ${normalizedEmail}`);
    } else {
        console.log(`✅ Downgraded ${normalizedEmail} to free plan`, { updatedRow: data[0] });
    }
}

/** Cuántos días de impago se aguantan antes de cortar el servicio. */
/**
 * Bloquear una cuenta por disputa de cargo (15-sep-2026).
 *
 * Quien desconoce un cargo ante su banco deja de usar la plataforma. No es
 * una represalia: un cargo desconocido pone en duda QUIÉN controla la
 * tarjeta, y seguir cobrando y sirviendo sobre un medio de pago cuestionado
 * expone al titular —que puede ser la víctima— a un cobro que no autorizó.
 *
 * NO ES UNA SUSPENSIÓN, y por eso no usa `suspendido_at`:
 *   · el barrido diario de morosos LEVANTA `suspendido_at` cuando no hay
 *     factura abierta, y cancelar la suscripción del disputante deja cero
 *     facturas abiertas: el bloqueo se desharía solo a la mañana siguiente;
 *   · la suspensión se levanta pagando, el bloqueo no. Sólo lo levanta una
 *     persona, borrando la fila de `blocked_users`.
 *
 * El asiento vive en `blocked_users`, la tabla que ya existía y que
 * `is_user_blocked()` consulta desde el backend. Es idempotente: bloquear a
 * un bloqueado no duplica ni cambia la fecha original.
 */
export async function bloquearPorDisputa(
    email: string,
    motivo = 'Disputa de cargo ante la institución bancaria',
    por = 'webhook-stripe',
): Promise<{ ok: boolean; yaEstaba: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();

    const { data: perfil, error: errPerfil } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (errPerfil || !perfil?.id) {
        console.error(`❌ No encontré la cuenta de ${normalizedEmail} para bloquearla`, errPerfil);
        return { ok: false, yaEstaba: false };
    }

    const { data, error } = await getSupabaseAdmin().rpc('bloquear_por_disputa', {
        p_user_id: perfil.id,
        p_motivo: motivo,
        p_por: por,
    });

    if (error) {
        console.error(`❌ No pude bloquear a ${normalizedEmail}:`, error);
        return { ok: false, yaEstaba: false };
    }
    const r = (data ?? {}) as { ok?: boolean; ya_estaba?: boolean };
    console.log(`🔒 CUENTA BLOQUEADA ${normalizedEmail} — ${motivo}`
        + (r.ya_estaba ? ' (ya lo estaba)' : ''));
    return { ok: !!r.ok, yaEstaba: !!r.ya_estaba };
}

export const DIAS_HASTA_SUSPENDER = Number(process.env.DIAS_HASTA_SUSPENDER || 14);

/**
 * Cortar el servicio por impago SIN romper nada (31-ago-2026).
 *
 * POR QUÉ NO SE DEGRADA A GRATUITO, que es lo que se hacía antes:
 *
 *   · gratuito NO frena. Deja cinco consultas al mes, y un cliente ya
 *     degradado por impago hizo 43 preguntas en 30 días.
 *   · degradar borra `stripe_subscription_id`, o sea el vínculo con la
 *     suscripción que TODAVÍA se quiere cobrar. Tiraba a la basura la
 *     posibilidad de seguir cobrando mientras el cliente no cancelara.
 *   · y era mudo: el cliente se quedaba con cinco consultas sin que nadie le
 *     dijera por qué ni le ofreciera actualizar su tarjeta.
 *
 * Suspender es una fecha. El plan, el cupo y el vínculo con Stripe siguen
 * exactamente donde estaban, así que reactivar es poner esa fecha en NULL.
 *
 * EL UMBRAL SON 14 DÍAS desde la factura impagada, no un número de intentos.
 * Medido el 31-ago-2026: los diez morosos de ese día llevaban de 1 a 7 días,
 * Stripe seguía reintentando en los diez, y una factura que se revisó acabó
 * pagándose al octavo intento. Cortar antes es cortarle a quien iba a pagar.
 */
/**
 * Deja escrito desde cuándo hay una factura sin pagar —o lo borra al entrar el
 * pago—. Es lo único que el frontend necesita para avisar en pantalla: la
 * cuenta de días se hace contra `DIAS_HASTA_SUSPENDER`.
 *
 * No toca `suspendido_at`: marcar el adeudo y cortar el acceso son dos cosas
 * distintas, separadas por catorce días.
 */
export async function marcarImpago(email: string, desde: Date | null) {
    const normalizedEmail = email.toLowerCase().trim();
    const { error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({ impago_desde: desde ? desde.toISOString() : null, updated_at: new Date().toISOString() } as any)
        .eq('email', normalizedEmail);
    if (error) {
        console.error(`❌ No pude marcar el impago de ${normalizedEmail}:`, error);
        return false;
    }
    return true;
}

export async function suspenderPorImpago(email: string, motivo = 'impago') {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({ suspendido_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
        .eq('email', normalizedEmail)
        .is('suspendido_at', null)   // a quien ya está suspendido no se le toca la fecha
        .select();

    if (error) {
        console.error(`❌ No pude suspender a ${normalizedEmail}:`, error);
        throw error;
    }
    if (!data || data.length === 0) {
        console.log(`ℹ️ ${normalizedEmail} ya estaba suspendido (o no existe) — sin cambios`);
        return false;
    }
    console.log(`⛔ SUSPENDIDO ${normalizedEmail} por ${motivo}. Conserva su plan `
        + `${data[0].subscription_type} y su suscripción de Stripe.`);
    return true;
}

/**
 * Levantar la suspensión. Se llama en cuanto entra un pago: el cliente vuelve
 * a su plan intacto, sin que nadie tenga que hacer nada a mano.
 */
export async function levantarSuspension(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        // `impago_desde` se borra con la suspensión: si volvió, no debe nada, y
        // dejarlo puesto mantendría el aviso de «se suspende en N días» en la
        // pantalla de alguien que acaba de pagar.
        .update({ suspendido_at: null, impago_desde: null, updated_at: new Date().toISOString() } as any)
        .eq('email', normalizedEmail)
        .not('suspendido_at', 'is', null)
        .select();

    if (error) {
        console.error(`❌ No pude reactivar a ${normalizedEmail}:`, error);
        throw error;
    }
    if (data && data.length > 0) {
        console.log(`✅ REACTIVADO ${normalizedEmail}: entró el pago y recupera ${data[0].subscription_type}`);
        return true;
    }
    return false;
}

/**
 * Reset the query count for a user (called on successful payment renewal)
 */
export async function resetUserQueries(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .update({
            queries_used: 0,
            drafts_used: 0,
            sentencia_queries_used: 0,
            updated_at: new Date().toISOString(),
        } as any)
        .eq('email', normalizedEmail)
        .select();

    if (error) {
        console.error(`❌ Failed to reset queries for ${normalizedEmail}:`, error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.error(`⚠️ resetUserQueries: 0 rows updated for ${normalizedEmail}`);
    } else {
        console.log(`✅ Reset query count for ${normalizedEmail}`);
    }
}

/**
 * Get user profile by email (server-side, bypasses RLS)
 */
export async function getUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .ilike('email', normalizedEmail)
        .single();

    if (error) {
        console.error(`Failed to get user by email ${normalizedEmail}:`, error);
        return null;
    }

    return data;
}
