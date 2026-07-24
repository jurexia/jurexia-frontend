import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildCancellationEmail } from '@/lib/cancellation-email';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/cancellation-email
 *
 * Sends a personalized cancellation notification email to a user
 * whose subscription is not renewing (cancel_at_period_end = true).
 * Includes 30% discount coupon and mobile app announcement.
 *
 * Body: { email, name, planLabel? }
 */
export async function POST(req: NextRequest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // ── Admin Auth ──
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
    );

    const ADMIN_EMAILS = ['administracion@iurexia.com', 'jdm.juridico@gmail.com', 'yair@iurexia.com'];
    if (authError || !user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        console.error('Admin Auth Failed:', authError || `User ${user?.email} is not admin`);
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { email, name, planLabel } = body;

        if (!email || !name) {
            return NextResponse.json(
                { error: 'Campos requeridos: email, name' },
                { status: 400 }
            );
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';
        const firstName = (name || '').split(' ')[0] || 'Estimado/a';

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `${firstName}, tu suscripción ha sido cancelada — aquí tienes un 30% de descuento 🎁`,
            html: buildCancellationEmail({
                name,
                planLabel,
            }),
        });

        if (error) {
            console.error('❌ Resend cancellation email error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Cancellation email sent to ${email} (plan: ${planLabel || 'unknown'})`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ Cancellation email failed:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
