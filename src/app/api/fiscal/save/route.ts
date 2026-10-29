import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

// RFC validation: 12 chars for personas morales, 13 for personas físicas
function isValidRFC(rfc: string): boolean {
    const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
    return rfcPattern.test(rfc) && (rfc.length === 12 || rfc.length === 13);
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { rfc, razon_social, regimen_fiscal, codigo_postal_fiscal, uso_cfdi } = body;

        // Validate required fields
        if (!rfc || !razon_social || !regimen_fiscal || !codigo_postal_fiscal) {
            return NextResponse.json(
                { error: 'RFC, Razón Social, Régimen Fiscal y Código Postal son obligatorios' },
                { status: 400 }
            );
        }

        // Validate RFC format
        const normalizedRFC = rfc.toUpperCase().trim();
        if (!isValidRFC(normalizedRFC)) {
            return NextResponse.json(
                { error: 'El formato del RFC no es válido. Debe tener 12 o 13 caracteres alfanuméricos.' },
                { status: 400 }
            );
        }

        // Validate CP format (5 digits)
        const cpTrimmed = codigo_postal_fiscal.trim();
        if (!/^\d{5}$/.test(cpTrimmed)) {
            return NextResponse.json(
                { error: 'El código postal debe tener 5 dígitos' },
                { status: 400 }
            );
        }

        // LLAVE DE SERVICIO, A PROPÓSITO. `authenticated` no tiene privilegio
        // UPDATE sobre user_profiles (sólo SELECT, acotado por la política
        // «auth.uid() = id»), así que con el cliente de la sesión esta
        // escritura nunca pasaría. La llave de servicio se salta RLS: lo único
        // que acota la fila es el filtro de abajo, y su valor sale del token
        // verificado por `auth.getUser`, nunca del cuerpo de la petición.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: profile, error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                rfc: normalizedRFC,
                razon_social: razon_social.trim(),
                regimen_fiscal: regimen_fiscal.trim(),
                codigo_postal_fiscal: cpTrimmed,
                uso_cfdi: uso_cfdi || 'G03',
                updated_at: new Date().toISOString(),
            })
            // LA LLAVE ES `id`, NO `user_id` (28-oct-2026). user_profiles no
            // tiene columna user_id: su llave es `id`, la misma de auth.users.
            // Con `.eq('user_id', …)` Postgres respondía 42703 «column does
            // not exist» y la ruta devolvía 500 SIEMPRE, en el GET y en el
            // POST, desde que nació (a396fdd, 8-feb). Lo medido el 28-oct:
            // 0 de 3,884 perfiles con RFC, y 14 respuestas 500 ese día sólo
            // por abrir la página de perfil.
            .eq('id', user.id)
            .select('stripe_customer_id')
            .maybeSingle();

        if (updateError) {
            console.error('Error saving fiscal data:', updateError);
            return NextResponse.json(
                { error: 'Error al guardar datos fiscales' },
                { status: 500 }
            );
        }
        // Sin perfil no hay fila que actualizar: el UPDATE afecta 0 filas y
        // Postgres no lo trata como error. Se dice, en vez de responder
        // «guardado» sin haber guardado nada.
        if (!profile) {
            return NextResponse.json(
                { error: 'No encontramos tu perfil. Escríbenos a soporte@iurexia.com.' },
                { status: 404 }
            );
        }

        // Sync to Stripe if customer exists
        if (profile?.stripe_customer_id) {
            try {
                const stripe = getStripe();
                const customerId = profile.stripe_customer_id;

                // Update customer name and address
                await stripe.customers.update(customerId, {
                    name: razon_social.trim(),
                    address: {
                        postal_code: cpTrimmed,
                        country: 'MX',
                    },
                    metadata: {
                        rfc: normalizedRFC,
                        regimen_fiscal: regimen_fiscal.trim(),
                        uso_cfdi: uso_cfdi || 'G03',
                    },
                });

                // Check existing tax IDs to avoid duplicates
                const existingTaxIds = await stripe.customers.listTaxIds(customerId);
                const hasRFC = existingTaxIds.data.some(
                    (tid) => tid.type === 'mx_rfc' && tid.value === normalizedRFC
                );

                if (!hasRFC) {
                    // Remove old mx_rfc tax IDs if any
                    for (const tid of existingTaxIds.data) {
                        if (tid.type === 'mx_rfc') {
                            await stripe.customers.deleteTaxId(customerId, tid.id);
                        }
                    }

                    // Add new RFC
                    await stripe.customers.createTaxId(customerId, {
                        type: 'mx_rfc',
                        value: normalizedRFC,
                    });
                }

                console.log(`✅ Fiscal data synced to Stripe for customer ${customerId}`);
            } catch (stripeError) {
                // Don't fail the whole request if Stripe sync fails
                console.error('⚠️ Stripe sync failed (fiscal data saved in DB):', stripeError);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Datos fiscales guardados correctamente',
            synced_to_stripe: !!profile?.stripe_customer_id,
        });
    } catch (error) {
        console.error('Fiscal save error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve fiscal data
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('rfc, razon_social, regimen_fiscal, codigo_postal_fiscal, uso_cfdi')
            // `id`, no `user_id`: ver el POST. `maybeSingle` porque un perfil
            // que todavía no existe no es un fallo del servidor; la página de
            // perfil ya pinta el formulario vacío cuando `data` llega en null.
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching fiscal data:', error);
            return NextResponse.json(
                { error: 'Error al obtener datos fiscales' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Fiscal GET error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
