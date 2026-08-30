import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getPlanFromSubscription } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Get user email from Supabase Auth
        let userEmail: string | null = null;

        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
                userEmail = user?.email || null;
            } catch {
                // Auth failed
            }
        }

        // Also try email from query params as fallback
        if (!userEmail) {
            const { searchParams } = new URL(request.url);
            userEmail = searchParams.get('email');
        }

        if (!userEmail) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const stripe = getStripe();

        // Find customer by email
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
        });

        if (customers.data.length === 0) {
            return NextResponse.json({
                plan: 'gratuito',
                status: 'none',
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
            });
        }

        const customerId = customers.data[0].id;

        // FIX #2: Buscar suscripciones active, trialing, Y past_due
        // Un usuario con pago pendiente (past_due) aún tiene plan activo
        const allSubs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 5,
        });

        // Priorizar: active > trialing > past_due
        const subscription = allSubs.data.find(s => s.status === 'active')
            || allSubs.data.find(s => s.status === 'trialing')
            || allSubs.data.find(s => s.status === 'past_due');

        if (!subscription) {
            return NextResponse.json({
                plan: 'gratuito',
                status: 'none',
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
            });
        }

        const planId = getPlanFromSubscription(subscription);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any;

        // `cancelAt` y `pausedUntil` salen de aquí porque el diálogo de
        // cancelación los necesita para saber qué pantalla enseñar (30-ago-2026).
        // Sin ellos no se distinguía «aún no ha cancelado» de «ya canceló y no
        // se lo hemos dicho», y un cliente recorrió el diálogo cinco veces
        // creyendo que no funcionaba.
        return NextResponse.json({
            plan: planId,
            status: subscription.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            pausedUntil: sub.pause_collection?.resumes_at
                ? new Date(sub.pause_collection.resumes_at * 1000).toISOString()
                : null,
        });
    } catch (error) {
        console.error('Subscription fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription' },
            { status: 500 }
        );
    }
}
