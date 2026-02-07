import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        // Get user email from Supabase Auth or request body
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

        // Also try from request body
        if (!userEmail) {
            try {
                const body = await request.json();
                userEmail = body.email || null;
            } catch {
                // No body
            }
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
            return NextResponse.json(
                { error: 'No subscription found' },
                { status: 404 }
            );
        }

        const customerId = customers.data[0].id;
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://iurexia.com';

        // Create billing portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/cuenta/suscripcion`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('Portal session error:', error);
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
