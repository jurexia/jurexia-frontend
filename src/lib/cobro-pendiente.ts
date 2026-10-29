/**
 * EL COBRO PENDIENTE DEL SUSPENDIDO (28-sep-2026).
 *
 * Desde hoy la cuenta se suspende al primer cobro rechazado, y el muro sólo
 * deja hacer una cosa: actualizar el método de pago. Aquí vive lo que hace
 * que esa única acción funcione de verdad.
 *
 * POR QUÉ NO BASTA CON ABRIR EL PORTAL DE STRIPE. El portal, en su flujo de
 * «actualizar método de pago», guarda la tarjeta nueva como predeterminada
 * del CLIENTE (`invoice_settings.default_payment_method`). Pero nuestras
 * suscripciones nacen en Checkout con su propia tarjeta
 * (`subscription.default_payment_method`), y ésa manda: Stripe seguiría
 * reintentando con la tarjeta rechazada, y el cliente —que ya hizo lo que le
 * pedimos— seguiría fuera hasta el siguiente reintento, días después.
 *
 * Por eso, al volver del portal:
 *   1. la tarjeta nueva pasa a la suscripción, para este cobro y los que
 *      vienen, y
 *   2. se cobra la factura abierta EN EL ACTO; si entra, la cuenta se abre sin
 *      esperar al webhook.
 *
 * Sólo se cobran facturas de suscripciones vivas en mora (`past_due` o
 * `unpaid`). Las deudas viejas de suscripciones ya canceladas NO se cargan en
 * automático a la tarjeta nueva: a quien deba una de ésas se le manda a la
 * factura alojada de Stripe, donde ve qué paga antes de pagarlo.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { levantarSuspension, marcarImpago } from '@/lib/supabase-admin';

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';

/** El correo de quien llama, sacado del token de su sesión. El cuerpo de la
 *  petición no se lee: el cobro de un tercero no puede estar a un POST de
 *  distancia (el mismo agujero que se cerró en el portal el 23-sep). */
export async function correoDeLaSesion(req: NextRequest): Promise<string | null> {
    const cabecera = req.headers.get('authorization');
    if (!cabecera?.startsWith('Bearer ')) return null;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user } } = await supabase.auth.getUser(cabecera.slice('Bearer '.length));
    const correo = (user?.email || '').toLowerCase().trim();
    return correo || null;
}

export function origenDe(req: NextRequest): string {
    return req.headers.get('origin') || SITIO;
}

/** El id de la suscripción de una factura. Desde la API 2026-01-28.clover vive
 *  en `parent.subscription_details`; el campo viejo queda de respaldo. */
export function suscripcionDeLaFactura(invoice: Stripe.Invoice): string | null {
    const f = invoice as unknown as {
        parent?: { subscription_details?: { subscription?: string | { id: string } } };
        subscription?: string | { id: string };
    };
    const ref = f.parent?.subscription_details?.subscription ?? f.subscription;
    return (typeof ref === 'string' ? ref : ref?.id) || null;
}

/** Que la tarjeta con la que el cliente pague la factura se quede para los
 *  cobros siguientes. Sin esto, quien paga desde el enlace del correo con una
 *  tarjeta nueva volvería a caer el mes siguiente con la vieja. */
export async function guardarTarjetaQuePague(stripe: Stripe, subId: string) {
    await stripe.subscriptions.update(subId, {
        payment_settings: { save_default_payment_method: 'on_subscription' },
    });
}

interface Adeudo {
    customerId: string;
    /** Suscripciones vivas en mora. */
    morosas: Stripe.Subscription[];
    /** Sus facturas abiertas, de la más vieja a la más nueva. */
    facturas: Stripe.Invoice[];
    /** Facturas abiertas de suscripciones que ya no existen (deuda vieja). */
    sueltas: Stripe.Invoice[];
}

const porFecha = (a: Stripe.Invoice, b: Stripe.Invoice) => (a.created ?? 0) - (b.created ?? 0);

async function buscarAdeudo(stripe: Stripe, email: string): Promise<Adeudo | null> {
    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
    const { data: perfil } = await admin
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('email', email)
        .maybeSingle();

    let customerId: string | null = perfil?.stripe_customer_id || null;
    if (!customerId) {
        const clientes = await stripe.customers.list({ email, limit: 1 });
        customerId = clientes.data[0]?.id || null;
    }
    if (!customerId) return null;

    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const morosas = subs.data.filter((s) => s.status === 'past_due' || s.status === 'unpaid');

    const facturas: Stripe.Invoice[] = [];
    for (const s of morosas) {
        const abiertas = await stripe.invoices.list({ subscription: s.id, status: 'open', limit: 20 });
        facturas.push(...abiertas.data);
    }
    facturas.sort(porFecha);

    let sueltas: Stripe.Invoice[] = [];
    if (!facturas.length) {
        const abiertas = await stripe.invoices.list({ customer: customerId, status: 'open', limit: 20 });
        sueltas = abiertas.data.sort(porFecha);
    }
    return { customerId, morosas, facturas, sueltas };
}

async function abrirCuenta(email: string) {
    await levantarSuspension(email);
    await marcarImpago(email, null);
}

export type Salida =
    | { accion: 'portal' | 'factura'; url: string }
    | { accion: 'reactivada' };

/**
 * A dónde lleva el botón del muro. Lo normal es el portal de Stripe en su
 * flujo de actualizar la tarjeta, que al terminar devuelve al chat con
 * `?pago=actualizado` para cobrar en el acto. Si la deuda es de una
 * suscripción que ya no existe, a su factura alojada. Si no debe nada, se le
 * abre la cuenta: nadie se queda encerrado por una suspensión sin adeudo.
 */
export async function salidaDelMuro(email: string, origen: string): Promise<Salida> {
    const stripe = getStripe();
    const adeudo = await buscarAdeudo(stripe, email);

    if (adeudo?.morosas.length) {
        const sesion = await stripe.billingPortal.sessions.create({
            customer: adeudo.customerId,
            return_url: `${origen}/chat`,
            flow_data: {
                type: 'payment_method_update',
                after_completion: {
                    type: 'redirect',
                    redirect: { return_url: `${origen}/chat?pago=actualizado` },
                },
            },
        });
        return { accion: 'portal', url: sesion.url };
    }

    const vieja = adeudo?.sueltas.find((f) => f.hosted_invoice_url);
    if (vieja?.hosted_invoice_url) return { accion: 'factura', url: vieja.hosted_invoice_url };

    await abrirCuenta(email);
    return { accion: 'reactivada' };
}

export type ResultadoCobro =
    | { estado: 'pagado' | 'sin_adeudo' }
    | { estado: 'rechazado'; mensaje: string }
    | { estado: 'autenticar' | 'factura'; url: string };

/** Lo que el banco dijo, en palabras del cliente. Nunca se le repite el
 *  código crudo, y a una tarjeta reportada no se le dice «robada». */
function motivoDelRechazo(e: unknown): string {
    const err = e as { code?: string; decline_code?: string };
    const codigo = err.decline_code || err.code || '';
    const MOTIVOS: Record<string, string> = {
        insufficient_funds: 'Tu banco rechazó el cargo por fondos insuficientes.',
        expired_card: 'La tarjeta está vencida.',
        incorrect_cvc: 'El código de seguridad de la tarjeta no es correcto.',
        invalid_cvc: 'El código de seguridad de la tarjeta no es correcto.',
        card_velocity_exceeded: 'La tarjeta alcanzó su límite de operaciones.',
        withdrawal_count_limit_exceeded: 'La tarjeta alcanzó su límite de operaciones.',
        processing_error: 'Hubo un error al procesar la tarjeta. Inténtalo de nuevo en unos minutos.',
    };
    return MOTIVOS[codigo]
        || 'Tu banco rechazó el cargo. Prueba con otra tarjeta o comunícate con tu banco.';
}

/**
 * EL MÉTODO QUE LA SUSCRIPCIÓN NO ADMITE (28-oct-2026).
 *
 * Las suscripciones nacen en Checkout con `payment_method_types: ['card']`, y
 * Stripe guarda esa lista en `subscription.payment_settings`. El portal, en
 * cambio, ofrece los métodos dinámicos de la cuenta, Link entre ellos: quien
 * elige Link deja como predeterminado del cliente un método de tipo `link`.
 * Al copiarlo a la suscripción, Stripe rechaza la actualización entera («The
 * `default_payment_method` provided has a payment method type (link) that is
 * not included in `payment_settings[payment_method_types]`») y la ruta
 * devolvía 500: cuatro veces el 28-oct, todas de la misma cuenta, que ya
 * había hecho lo que el muro le pedía y se quedó viendo «No pudimos completar
 * el paso».
 *
 * Se eligió NO copiar lo que la suscripción no admite, en vez de añadir
 * `link` a su lista: ampliar los métodos de una suscripción viva cambia cómo
 * cobra Stripe en adelante —reintentos automáticos y página de la factura
 * incluidos— y eso es una decisión de cobro, no un arreglo. Así nada cambia
 * en Stripe y el cliente sabe exactamente qué hacer.
 *
 * Devuelve el tipo rechazado, o null si todas las suscripciones lo admiten.
 * Una suscripción sin lista propia (`payment_method_types` null) sigue la
 * configuración de la cuenta, y ésa ya dejó guardar el método: se admite.
 */
function tipoNoAdmitido(
    metodo: Stripe.PaymentMethod | null, morosas: Stripe.Subscription[],
): string | null {
    if (!metodo) return null;
    const rechaza = morosas.some((s) => {
        const admitidos = s.payment_settings?.payment_method_types;
        return !!admitidos?.length && !(admitidos as string[]).includes(metodo.type);
    });
    return rechaza ? metodo.type : null;
}

function mensajeMetodoNoAdmitido(tipo: string): string {
    const nombre = tipo === 'link' ? 'Link' : 'Ese método de pago';
    return `${nombre} no se puede usar para cobrar tu suscripción, que sólo admite tarjeta. `
        + 'Vuelve a actualizar tu método de pago y escribe directamente los datos de una '
        + 'tarjeta de crédito o débito' + (tipo === 'link' ? ', sin entrar con Link.' : '.');
}

/**
 * Cobrar ya, al volver del portal. La tarjeta predeterminada del cliente —la
 * que acaba de dar de alta— pasa a sus suscripciones en mora y con ella se
 * pagan sus facturas abiertas, de la más vieja a la más nueva.
 */
export async function reintentarCobro(email: string): Promise<ResultadoCobro> {
    const stripe = getStripe();
    const adeudo = await buscarAdeudo(stripe, email);

    if (!adeudo || (!adeudo.facturas.length && !adeudo.sueltas.length)) {
        await abrirCuenta(email);
        return { estado: 'sin_adeudo' };
    }
    if (!adeudo.facturas.length) {
        const vieja = adeudo.sueltas.find((f) => f.hosted_invoice_url);
        if (vieja?.hosted_invoice_url) return { estado: 'factura', url: vieja.hosted_invoice_url };
        return { estado: 'rechazado', mensaje: 'No encontramos cómo cobrar tu adeudo. Escríbenos a soporte@iurexia.com.' };
    }

    // Se expande el método para conocer su TIPO antes de copiarlo: ver
    // `tipoNoAdmitido`.
    const cliente = await stripe.customers.retrieve(adeudo.customerId, {
        expand: ['invoice_settings.default_payment_method'],
    });
    const pred = 'deleted' in cliente ? null : cliente.invoice_settings?.default_payment_method;
    const nueva = (typeof pred === 'string' ? pred : pred?.id) || null;
    const metodo = pred && typeof pred !== 'string' ? pred : null;

    // Antes de tocar nada: si la suscripción no admite el método nuevo, ni se
    // copia ni se cobra con él. La factura hereda la misma lista, así que
    // `invoices.pay` con ese método tampoco pasaría, y su error caería en
    // `motivoDelRechazo` como «tu banco rechazó el cargo», que es falso: el
    // banco ni se enteró.
    const noAdmitido = tipoNoAdmitido(metodo, adeudo.morosas);
    if (noAdmitido) {
        console.warn(`💳 ${email} eligió un método de tipo ${noAdmitido}, que su suscripción no admite: no se copia ni se cobra`);
        return { estado: 'rechazado', mensaje: mensajeMetodoNoAdmitido(noAdmitido) };
    }

    for (const sub of adeudo.morosas) {
        const actual = typeof sub.default_payment_method === 'string'
            ? sub.default_payment_method
            : sub.default_payment_method?.id;
        await stripe.subscriptions.update(sub.id, {
            ...(nueva && nueva !== actual ? { default_payment_method: nueva } : {}),
            payment_settings: { save_default_payment_method: 'on_subscription' },
        });
    }

    for (const factura of adeudo.facturas) {
        try {
            const pagada = await stripe.invoices.pay(factura.id, nueva ? { payment_method: nueva } : {});
            if (pagada.status !== 'paid') {
                return { estado: 'rechazado', mensaje: 'Tu banco no completó el cargo. Prueba con otra tarjeta.' };
            }
        } catch (e) {
            const err = e as { code?: string };
            // 3D Secure: el banco pide que el titular confirme. Eso sólo se
            // puede hacer en la página de la factura, que ya sabe pedirlo.
            if (err.code === 'invoice_payment_intent_requires_action' && factura.hosted_invoice_url) {
                return { estado: 'autenticar', url: factura.hosted_invoice_url };
            }
            console.warn(`💳 Reintento de cobro rechazado para ${email} (${factura.id}):`, err.code, (e as Error).message);
            return { estado: 'rechazado', mensaje: motivoDelRechazo(e) };
        }
    }

    // Entró todo: se abre ya. El webhook `invoice.payment_succeeded` hará lo
    // mismo en unos segundos; hacerlo aquí es para que no espere mirando el muro.
    await abrirCuenta(email);
    console.log(`✅ ${email} actualizó su tarjeta y pagó ${adeudo.facturas.length} factura(s): cuenta reabierta`);
    return { estado: 'pagado' };
}
