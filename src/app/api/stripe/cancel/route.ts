import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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
        const { subscriptionId } = body;

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

        // Cancel at period end (user keeps access until the billing period ends)
        const updated = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        }) as unknown as { current_period_end: number; id: string };

        const periodEnd = new Date(updated.current_period_end * 1000);

        console.log(`✅ Subscription ${subscriptionId} scheduled for cancellation at ${periodEnd.toISOString()} for user ${user.email}`);

        return NextResponse.json({
            success: true,
            message: 'Tu suscripción se cancelará al final del periodo actual',
            cancelAt: periodEnd.toISOString(),
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json(
            { error: 'Error al cancelar la suscripción' },
            { status: 500 }
        );
    }
}
