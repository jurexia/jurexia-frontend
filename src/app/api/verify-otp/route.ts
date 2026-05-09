import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function POST(request: NextRequest) {
    try {
        const { email, code, password } = await request.json();

        if (!email || !code || !password) {
            return NextResponse.json(
                { error: 'Email, código y contraseña son requeridos' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();
        const supabase = getSupabaseAdmin();

        // Look up OTP from database
        const { data: otpData, error: lookupError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', normalizedEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (lookupError || !otpData) {
            return NextResponse.json(
                { error: 'No se encontró un código para este email. Solicita uno nuevo.' },
                { status: 400 }
            );
        }

        // Check expiry
        if (new Date(otpData.expires_at) < new Date()) {
            await supabase.from('otp_codes').delete().eq('id', otpData.id);
            return NextResponse.json(
                { error: 'El código ha expirado. Solicita uno nuevo.' },
                { status: 400 }
            );
        }

        // Check max attempts
        if (otpData.attempts >= 5) {
            await supabase.from('otp_codes').delete().eq('id', otpData.id);
            return NextResponse.json(
                { error: 'Demasiados intentos fallidos. Solicita un nuevo código.' },
                { status: 400 }
            );
        }

        // Verify code
        if (otpData.code !== code.trim()) {
            // Increment attempts
            await supabase
                .from('otp_codes')
                .update({ attempts: otpData.attempts + 1 })
                .eq('id', otpData.id);

            return NextResponse.json(
                { error: 'Código incorrecto. Verifica e intenta de nuevo.' },
                { status: 400 }
            );
        }

        // ✅ OTP verified! Create user in Supabase with email pre-confirmed
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: otpData.name,
                plan: 'gratuito',
            },
        });

        if (createError) {
            if (createError.message?.includes('already been registered') ||
                createError.message?.includes('already exists')) {
                await supabase.from('otp_codes').delete().eq('id', otpData.id);
                return NextResponse.json(
                    { error: 'Este email ya está registrado. Intenta iniciar sesión.' },
                    { status: 409 }
                );
            }
            console.error('❌ Supabase createUser error:', createError);
            return NextResponse.json(
                { error: 'Error al crear la cuenta. Intenta de nuevo.' },
                { status: 500 }
            );
        }

        // Clean up OTP
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail);

        console.log(`✅ User created with verified email: ${normalizedEmail}`);

        return NextResponse.json({
            success: true,
            message: 'Cuenta creada exitosamente',
            userId: userData.user?.id,
        });
    } catch (err: any) {
        console.error('OTP verify error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
