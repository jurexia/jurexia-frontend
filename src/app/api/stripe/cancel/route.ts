import { NextRequest, NextResponse } from 'next/server';
import { finDelAcceso, getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    // FUERA del try a propósito (8-ago-2026). Estaba declarado dentro, así
    // que el bloque de recuperación del catch —el que comprueba si Stripe sí
    // canceló pese al error— reventaba con ReferenceError y se tragaba la
    // buena noticia. El abogado leía «no pudimos procesar la cancelación» y
    // volvía a intentarlo durante días, mientras su suscripción YA estaba
    // cancelada. Varios lo reportaron por correo.
    let subscriptionId: string | undefined;

    try {
        // Authenticate user via Supabase JWT
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (!user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        subscriptionId = body?.subscriptionId;

        if (!subscriptionId || !subscriptionId.startsWith('sub_')) {
            return NextResponse.json(
                { error: 'ID de suscripción inválido' },
                { status: 400 }
            );
        }

        const stripe = getStripe();

        // Verify the subscription belongs to this user by checking Stripe customer email
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const customerEmail = ((customer as { email?: string }).email || '').toLowerCase().trim();

        if (customerEmail !== user.email.toLowerCase().trim()) {
            console.error(`❌ Cancel attempt: user ${user.email} tried to cancel subscription belonging to ${customerEmail}`);
            return NextResponse.json(
                { error: 'No tienes permiso para cancelar esta suscripción' },
                { status: 403 }
            );
        }

        // Check if subscription is already scheduled for cancellation
        if (subscription.cancel_at_period_end) {
            const fin = finDelAcceso(subscription);
            console.log(`ℹ️ Subscription ${subscriptionId} already scheduled for cancellation at ${fin?.toISOString() ?? '(sin fecha)'} for user ${user.email}`);
            return NextResponse.json({
                success: true,
                message: 'Tu suscripción ya estaba programada para cancelarse al final del periodo actual',
                cancelAt: fin?.toISOString() ?? null,
                alreadyCancelled: true,
            });
        }

        // Cancel at period end (user keeps access until the billing period ends)
        const updated = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        // DESDE AQUÍ LA CANCELACIÓN YA ESTÁ HECHA: nada de lo que sigue puede
        // convertirla en error. La fecha sale de `finDelAcceso`, que nunca
        // lanza (ver lib/stripe.ts: `current_period_end` ya no viene en la
        // suscripción y leerlo aquí era lo que respondía «no pudimos procesar
        // la cancelación» a quien acababa de cancelar).
        const fin = finDelAcceso(updated);

        console.log(`✅ Subscription ${subscriptionId} scheduled for cancellation at ${fin?.toISOString() ?? '(sin fecha)'} for user ${user.email}`);

        return NextResponse.json({
            success: true,
            message: 'Tu suscripción se cancelará al final del periodo actual',
            cancelAt: fin?.toISOString() ?? null,
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);

        // Try to recover: check if the subscription was actually cancelled despite the error
        try {
            if (!subscriptionId) throw new Error('sin identificador de suscripción');
            const stripe = getStripe();
            const currentSub = await stripe.subscriptions.retrieve(subscriptionId);
            if (currentSub.cancel_at_period_end) {
                const fin = finDelAcceso(currentSub);
                console.log(`🔄 Recovery: Subscription ${subscriptionId} is actually cancelled — returning success`);
                return NextResponse.json({
                    success: true,
                    message: 'Tu suscripción se cancelará al final del periodo actual',
                    cancelAt: fin?.toISOString() ?? null,
                });
            }
        } catch (recoveryError) {
            console.error('Recovery check also failed:', recoveryError);
        }

        return NextResponse.json(
            { error: 'No pudimos procesar la cancelación en este momento. Por favor, intenta de nuevo en unos minutos.' },
            { status: 500 }
        );
    }
}
