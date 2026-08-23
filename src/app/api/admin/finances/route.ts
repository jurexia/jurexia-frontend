import { NextRequest, NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/guardia-admin';
import { getStripe } from '@/lib/stripe';

// Price IDs mapped to plan names
const PRICE_TO_PLAN: Record<string, { name: string; monthly_equivalent: number }> = {
    'price_1Sy2l63uD85CqvjMku0MM4k3': { name: 'Pro Mensual', monthly_equivalent: 14900 },
    'price_1Sy2l03uD85CqvjMMJ4mFqhw': { name: 'Platinum Mensual', monthly_equivalent: 59900 },
    'price_1T8IMF3uD85CqvjMM49lRfxI': { name: 'Básico', monthly_equivalent: 7900 },
};

export async function GET(req: NextRequest) {
    // Sin esto, cualquiera en internet leía el MRR de la empresa. Medido el
    // 23-ago-2026: HTTP 200 sin credencial alguna.
    const yo = await exigirAdmin(req);
    if (yo instanceof NextResponse) return yo;

    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }

    let stripe;
    try { stripe = getStripe(); }
    catch (e: any) { return NextResponse.json({ error: `Stripe init: ${e.message}` }, { status: 500 }); }

    try {
        // Fetch all active subscriptions
        const allSubs: any[] = [];
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
            const params: any = { status: 'active', limit: 100 };
            if (startingAfter) params.starting_after = startingAfter;
            const batch: any = await stripe.subscriptions.list(params);
            allSubs.push(...batch.data);
            hasMore = batch.has_more;
            if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
        }

        // Aggregate by plan
        const planBreakdown: Record<string, { count: number; mrr: number; name: string }> = {};
        let totalMRR = 0;

        for (const sub of allSubs) {
            const item = sub.items?.data?.[0];
            const priceId = item?.price?.id || '';
            const planInfo = PRICE_TO_PLAN[priceId] || { name: `Desconocido (${priceId.slice(-8)})`, monthly_equivalent: item?.price?.unit_amount || 0 };

            if (!planBreakdown[planInfo.name]) {
                planBreakdown[planInfo.name] = { count: 0, mrr: 0, name: planInfo.name };
            }
            planBreakdown[planInfo.name].count++;
            planBreakdown[planInfo.name].mrr += planInfo.monthly_equivalent;
            totalMRR += planInfo.monthly_equivalent;
        }

        // Fetch balance
        const balance: any = await stripe.balance.retrieve();
        const availableBalance = balance.available?.reduce((sum: number, b: any) => sum + b.amount, 0) || 0;
        const pendingBalance = balance.pending?.reduce((sum: number, b: any) => sum + b.amount, 0) || 0;

        return NextResponse.json({
            totalSubscribers: allSubs.length,
            totalMRR, // in centavos MXN
            planBreakdown: Object.values(planBreakdown).sort((a, b) => b.mrr - a.mrr),
            balance: {
                available: availableBalance,
                pending: pendingBalance,
                currency: 'mxn',
            },
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
