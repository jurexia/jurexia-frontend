import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildWelcomeEmail } from '@/lib/welcome-email';

/**
 * POST /api/admin/welcome-email
 *
 * Sends a personalized welcome email to a paid subscriber.
 * Body: { email, name, estado, planType?, planLabel?, isIngested? }
 */
export async function POST(req: NextRequest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { email, name, estado, planType, planLabel, isIngested } = body;

        if (!email || !name || !estado) {
            return NextResponse.json(
                { error: 'Campos requeridos: email, name, estado' },
                { status: 400 }
            );
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `¡Bienvenido/a a Iurexia, ${name.split(' ')[0]}! 🎉`,
            html: buildWelcomeEmail({
                name,
                estado,
                planType: planType || 'pro_monthly',
                planLabel,
                isIngested: !!isIngested,
            }),
        });

        if (error) {
            console.error('❌ Resend welcome email error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`📧 Welcome email sent to ${email} (plan: ${planType || 'pro_monthly'}, estado: ${estado})`);
        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error('❌ Welcome email failed:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
