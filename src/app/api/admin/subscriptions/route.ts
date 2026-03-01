import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

function safeDate(ts: any): string {
    if (!ts) return '';
    try {
        const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
        return isNaN(d.getTime()) ? '' : d.toISOString();
    } catch { return ''; }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) return NextResponse.json({ subscriptions: {} });

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ subscriptions: {} });

    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ subscriptions: {}, error: 'STRIPE_SECRET_KEY not configured' });
    }

    let stripe;
    try { stripe = getStripe(); }
    catch (e: any) { return NextResponse.json({ subscriptions: {}, error: `Stripe init: ${e.message}` }); }

    const subscriptions: Record<string, any> = {};
    const errors: string[] = [];

    for (const subId of ids) {
        try {
            const sub: any = await stripe.subscriptions.retrieve(subId);
            const item = sub.items?.data?.[0];
            subscriptions[subId] = {
                status: sub.status || 'unknown',
                created: safeDate(sub.created),
                current_period_end: safeDate(sub.current_period_end),
                current_period_start: safeDate(sub.current_period_start),
                cancel_at_period_end: !!sub.cancel_at_period_end,
                amount: item?.price?.unit_amount || item?.plan?.amount || 0,
                currency: item?.price?.currency || item?.plan?.currency || 'mxn',
                interval: item?.price?.recurring?.interval || item?.plan?.interval || 'month',
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
