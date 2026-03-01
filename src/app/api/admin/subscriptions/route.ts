import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

/**
 * GET /api/admin/subscriptions
 * 
 * Receives a list of stripe_subscription_ids and returns enriched data for each.
 * Query param: ids=sub_xxx,sub_yyy,...
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
        return NextResponse.json({ subscriptions: {}, error: 'No ids provided' });
    }

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) {
        return NextResponse.json({ subscriptions: {}, error: 'Empty ids' });
    }

    // Verify Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({
            subscriptions: {},
            error: 'STRIPE_SECRET_KEY not configured',
            env_keys: Object.keys(process.env).filter(k => k.includes('STRIPE')).join(', ')
        });
    }

    let stripe;
    try {
        stripe = getStripe();
    } catch (e: any) {
        return NextResponse.json({ subscriptions: {}, error: `Stripe init failed: ${e.message}` });
    }

    const subscriptions: Record<string, any> = {};
    const errors: string[] = [];

    // Fetch each subscription
    for (const subId of ids) {
        try {
            const sub: any = await stripe.subscriptions.retrieve(subId);
            const item = sub.items?.data?.[0];
            subscriptions[subId] = {
                status: sub.status,
                created: new Date(sub.created * 1000).toISOString(),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                cancel_at_period_end: sub.cancel_at_period_end,
                amount: item?.price?.unit_amount || 0,
                currency: item?.price?.currency || 'mxn',
                interval: item?.price?.recurring?.interval || 'month',
            };
        } catch (err: any) {
            errors.push(`${subId}: ${err.message || String(err)}`);
        }
    }

    return NextResponse.json({
        subscriptions,
        total: ids.length,
        fetched: Object.keys(subscriptions).length,
        ...(errors.length > 0 ? { errors } : {})
    });
}
