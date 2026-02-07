import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getPlanFromSubscription } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

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

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            return NextResponse.json({
                plan: 'gratuito',
                status: 'none',
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
            });
        }

        const subscription = subscriptions.data[0];
        const planId = getPlanFromSubscription(subscription);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any;

        return NextResponse.json({
            plan: planId,
            status: subscription.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
    } catch (error) {
        console.error('Subscription fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription' },
            { status: 500 }
        );
    }
}
