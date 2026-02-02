import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST() {
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
            return NextResponse.json(
                { error: 'No subscription found' },
                { status: 404 }
            );
        }

        const customerId = customers.data[0].id;

        // Create billing portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.NEXTAUTH_URL}/cuenta/suscripcion`,
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
