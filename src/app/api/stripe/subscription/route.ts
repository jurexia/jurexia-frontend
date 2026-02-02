import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe, getPlanFromSubscription } from '@/lib/stripe';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Find customer by email
        const customers = await stripe.customers.list({
            email: session.user.email,
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

        return NextResponse.json({
            plan: planId,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
    } catch (error) {
        console.error('Subscription fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription' },
            { status: 500 }
        );
    }
}
