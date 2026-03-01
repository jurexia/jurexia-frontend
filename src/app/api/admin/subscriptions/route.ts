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
        return NextResponse.json({ subscriptions: {} });
    }

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) {
        return NextResponse.json({ subscriptions: {} });
    }

    const stripe = getStripe();
    const subscriptions: Record<string, {
        status: string;
        created: string;
        current_period_end: string;
        current_period_start: string;
        cancel_at_period_end: boolean;
        amount: number;
        currency: string;
        interval: string;
    }> = {};

    // Fetch in parallel with concurrency limit of 10
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
    }

    for (const chunk of chunks) {
        const results = await Promise.allSettled(
            chunk.map(async (subId) => {
                try {
                    const sub: any = await stripe.subscriptions.retrieve(subId);
                    const item = sub.items.data[0];
                    subscriptions[subId] = {
                        status: sub.status,
                        created: new Date(sub.created * 1000).toISOString(),
                        current_period_end: new Date(
                            sub.current_period_end * 1000
                        ).toISOString(),
                        current_period_start: new Date(
                            sub.current_period_start * 1000
                        ).toISOString(),
                        cancel_at_period_end: sub.cancel_at_period_end,
                        amount: item?.price?.unit_amount || 0,
                        currency: item?.price?.currency || 'mxn',
                        interval: item?.price?.recurring?.interval || 'month',
                    };
                } catch (err) {
                    console.error(`Failed to fetch subscription ${subId}:`, err);
                }
            })
        );
    }

    return NextResponse.json({ subscriptions });
}
