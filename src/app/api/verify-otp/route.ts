/**
 * Comprueba el código de seis cifras y deja a la persona DENTRO (17-sep-2026).
 *
 * El código prueba que el correo es suyo, y con eso basta:
 *   · Si NO tiene cuenta, se crea aquí, ya verificada. Salvo desde /login
 *     (`modo: 'entrar'`), donde no se aceptan los términos: ahí se le dice que
 *     no hay cuenta y la página lo manda a registrarse.
 *   · Si YA la tiene, entra a la suya. Antes se le contestaba «ya está
 *     registrado, inicia sesión», y el 78% de las cuentas entró con Google o
 *     Apple y no tiene contraseña con la que iniciarla.
 *
 * LA SESIÓN LA ABRE EL NAVEGADOR. Aquí se genera un enlace mágico que no se
 * manda a ningún sitio —`generateLink` no envía correo— y se devuelve su
 * `token_hash`, que la página canjea con `supabase.auth.verifyOtp`. Es de un
 * solo uso: el segundo canje da 403 `otp_expired` (comprobado).
 *
 * Decir «nueva» o «sin cuenta» no descubre nada: sólo llega hasta ahí quien
 * escribió el código que se mandó a ese correo.
 *
 * La contraseña ya no hace falta para entrar; la página la ofrece después.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const MAX_INTENTOS = 5;

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function POST(request: NextRequest) {
    try {
        const { email, code, password, ref, modo } = await request.json();
        const entrar = modo === 'entrar';

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email y código son requeridos' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const supabase = getSupabaseAdmin();

        // Look up OTP from database. Sólo vale el más reciente: los anteriores
        // se quedan en la tabla para el freno de /api/send-otp.
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

        // Caducado o agotado: se contesta y la fila se queda, que la cuenta el
        // freno de envíos. Borrarla le devolvía el cupo a quien prueba códigos.
        if (new Date(otpData.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'El código ha expirado. Solicita uno nuevo.' },
                { status: 400 }
            );
        }

        if (otpData.attempts >= MAX_INTENTOS) {
            return NextResponse.json(
                { error: 'Demasiados intentos fallidos. Solicita un nuevo código.' },
                { status: 400 }
            );
        }

        // El intento se GASTA ANTES de comparar, con un update condicional: sólo
        // una petición puede pasar `attempts` de n a n+1. Leer, comparar y luego
        // sumar dejaba que cien peticiones en paralelo leyeran «0 intentos» y
        // probaran cien códigos contra el mismo (comprobado: de dos en paralelo,
        // gana una).
        const { data: gastado, error: attemptError } = await supabase
            .from('otp_codes')
            .update({ attempts: otpData.attempts + 1 })
            .eq('id', otpData.id)
            .eq('attempts', otpData.attempts)
            .select('id');

        if (attemptError) {
            console.error('❌ OTP attempt update error:', attemptError);
            return NextResponse.json({ error: 'Error interno' }, { status: 500 });
        }

        const esperado = Buffer.from(String(otpData.code));
        const recibido = Buffer.from(String(code).trim());
        if (!gastado?.length || esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
            return NextResponse.json(
                { error: 'Código incorrecto. Verifica e intenta de nuevo.' },
                { status: 400 }
            );
        }

        // ✅ OTP verified. ¿Ya tiene cuenta?
        //
        // Se pregunta a `user_profiles` y NO a `auth.admin.listUsers()`, que es
        // lo que hacía /api/send-otp: esa llamada devuelve sólo la primera página
        // (50 cuentas de más de 2,500), así que para casi todos contestaba «no
        // existe». Cada cuenta tiene su perfil —disparador `on_auth_user_created`,
        // FK a auth.users con ON DELETE CASCADE— con el mismo correo en
        // minúsculas: cotejado el 17-sep-2026, 2,519 de 2,519. Es una búsqueda
        // exacta por correo con la clave de servicio.
        const { data: perfil, error: perfilError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (perfilError) {
            console.error('❌ Profile lookup error:', perfilError);
            return NextResponse.json({ error: 'Error interno' }, { status: 500 });
        }

        let userId: string | null = perfil?.id ?? null;
        let nueva = false;

        if (!perfil) {
            if (entrar) {
                await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
                return NextResponse.json(
                    { error: 'No hay una cuenta con este email. Regístrate para crearla.', sinCuenta: true },
                    { status: 404 }
                );
            }

            const { data: userData, error: createError } = await supabase.auth.admin.createUser({
                email: normalizedEmail,
                // Nadie la conoce: se entra con código y, si se quiere, se elige
                // una después. La página anterior a este cambio sí mandaba la suya
                // y, con ella, iniciaba sesión: se respeta mientras quede alguna
                // abierta.
                password: typeof password === 'string' && password.length >= 8
                    ? password
                    : crypto.randomBytes(32).toString('base64url'),
                email_confirm: true,
                user_metadata: {
                    full_name: otpData.name,
                    plan: 'gratuito',
                },
            });

            if (createError) {
                // Si se registró por otra vía entre la consulta y aquí, entra a la suya.
                const yaExiste = createError.code === 'email_exists' ||
                    createError.message?.includes('already been registered') ||
                    createError.message?.includes('already exists');
                if (!yaExiste) {
                    console.error('❌ Supabase createUser error:', createError);
                    return NextResponse.json(
                        { error: 'Error al crear la cuenta. Intenta de nuevo.' },
                        { status: 500 }
                    );
                }
            } else {
                nueva = true;
                userId = userData.user?.id ?? null;
                console.log(`✅ User created with verified email: ${normalizedEmail}`);
            }
        }

        // ── PROGRAMA DE REFERIDOS ────────────────────────────────────────
        // Si llegó con un código de invitación, se ata aquí con quien lo
        // invitó y se le entregan sus días de Pro de bienvenida. Es el único
        // punto donde existen a la vez el código y el id recién creado. Sólo
        // para cuentas NUEVAS: quien ya tenía una no es un invitado.
        //
        // Silencioso a propósito: un código caducado, mal escrito o de un
        // usuario borrado NO puede impedir que se complete un alta. Lo peor
        // que pasa es que el regalo no se aplique.
        let regalo: any = null;
        if (nueva && ref && userId) {
            try {
                const { registrarReferido } = await import('@/lib/referidos-backend');
                const r = await registrarReferido(String(ref), userId);
                regalo = r.regalo?.otorgado ? r.regalo : null;
                console.log(`🔗 Referido ${r.atado ? 'registrado' : 'no aplicable'} para ${normalizedEmail}`
                    + (regalo ? ` · ${regalo.dias} días de Pro entregados` : ''));
            } catch (refErr) {
                console.error('⚠️ No pude registrar el referido (el alta sí se completó):', refErr);
            }
        }

        // La llave de la sesión. Si esto falla, el código NO se borra: la cuenta
        // ya existe y un segundo intento con el mismo código entra.
        const { data: enlace, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail,
        });
        const tokenHash = enlace?.properties?.hashed_token;

        if (linkError || !tokenHash) {
            console.error('❌ generateLink error:', linkError);
            return NextResponse.json(
                { error: 'No pudimos abrir tu sesión. Intenta de nuevo.' },
                { status: 500 }
            );
        }

        // Clean up OTP
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail);

        if (!nueva) console.log(`🔑 Entrada con código: ${normalizedEmail}`);

        return NextResponse.json({
            success: true,
            message: nueva ? 'Cuenta creada exitosamente' : 'Código verificado',
            nueva,
            userId,
            token_hash: tokenHash,
            // Para que la pantalla de bienvenida pueda decirle al invitado lo
            // que acaba de recibir: si no se lo enseñamos, el regalo se gasta
            // sin que se entere de que lo tenía.
            regalo: regalo ? { dias: regalo.dias, plan: regalo.plan, vence_at: regalo.vence_at } : null,
        });
    } catch (err: any) {
        console.error('OTP verify error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
