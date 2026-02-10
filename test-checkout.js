/**
 * Script de diagnóstico para probar Stripe Checkout localmente
 * 
 * USO:
 * 1. Copia las variables de entorno de Vercel:
 *    - STRIPE_SECRET_KEY
 *    - STRIPE_PRICE_PRO_MONTHLY
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * 2. Ejecuta: node test-checkout.js
 */

async function testCheckout() {
    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const testEmail = "test@example.com"; // Cambia esto por el email del usuario afectado

    console.log('🧪 DIAGNÓSTICO DE STRIPE CHECKOUT');
    console.log('================================\n');

    // 1. Verificar variables de entorno
    console.log('1️⃣ Verificando variables de entorno...');
    const requiredEnvVars = [
        'STRIPE_SECRET_KEY',
        'STRIPE_PRICE_PRO_MONTHLY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    let missingVars = [];
    for (const varName of requiredEnvVars) {
        const value = process.env[varName];
        if (!value) {
            console.log(`   ❌ ${varName}: NO CONFIGURADA`);
            missingVars.push(varName);
        } else {
            console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
        }
    }

    if (missingVars.length > 0) {
        console.log('\n⚠️ FALTAN VARIABLES DE ENTORNO:');
        console.log('   Por favor configura:', missingVars.join(', '));
        console.log('\n📝 Para obtenerlas desde Vercel:');
        console.log('   1. Ve a Vercel Dashboard → Jurexia Frontend → Settings → Environment Variables');
        console.log('   2. Copia cada variable y agrégala a .env.local');
        return;
    }

    console.log('\n2️⃣ Probando conexión con Stripe...');
    try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-01-28.clover',
        });

        // Verificar que el Price ID existe
        console.log(`\n3️⃣ Verificando Price ID: ${priceId}`);
        const price = await stripe.prices.retrieve(priceId);
        console.log('   ✅ Price encontrado:');
        console.log(`      - Producto: ${price.product}`);
        console.log(`      - Monto: $${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
        console.log(`      - Intervalo: ${price.recurring?.interval || 'one-time'}`);

        // Buscar si el customer ya existe
        console.log(`\n4️⃣ Buscando customer existente con email: ${testEmail}`);
        const existingCustomers = await stripe.customers.list({
            email: testEmail,
            limit: 1,
        });

        let customerId = null;
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
            console.log(`   ✅ Customer encontrado: ${customerId}`);

            // Verificar si tiene suscripciones activas
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 10
            });

            if (subscriptions.data.length > 0) {
                console.log('   ⚠️ CUSTOMER YA TIENE SUSCRIPCIONES ACTIVAS:');
                for (const sub of subscriptions.data) {
                    console.log(`      - ${sub.id} (${sub.status})`);
                }
                console.log('\n   ⚠️ ESTO PUEDE CAUSAR PROBLEMAS AL CREAR NUEVA CHECKOUT SESSION');
            } else {
                console.log('   ✅ Customer no tiene suscripciones activas');
            }
        } else {
            console.log('   ℹ️ Customer no existe (se creará nuevo)');
        }

        // Intentar crear checkout session
        console.log('\n5️⃣ Intentando crear Checkout Session...');
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: customerId || undefined,
            customer_email: customerId ? undefined : testEmail,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: 'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost:3000/checkout/cancel',
            metadata: {
                userEmail: testEmail,
            },
            subscription_data: {
                metadata: {
                    userEmail: testEmail,
                },
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            tax_id_collection: {
                enabled: true,
            },
            locale: 'es',
        });

        console.log('   ✅ CHECKOUT SESSION CREADA EXITOSAMENTE!');
        console.log(`      - Session ID: ${checkoutSession.id}`);
        console.log(`      - URL: ${checkoutSession.url}`);
        console.log('\n🎉 TODO FUNCIONA CORRECTAMENTE');
        console.log('   Si funciona aquí pero falla en producción, revisa las env vars de Vercel');

    } catch (error) {
        console.log('\n❌ ERROR AL CREAR CHECKOUT SESSION:');
        console.log(`   Mensaje: ${error.message}`);
        console.log(`   Tipo: ${error.type}`);
        console.log(`   Code: ${error.code}`);
        if (error.raw) {
            console.log(`   Raw: ${JSON.stringify(error.raw, null, 2)}`);
        }
        console.log('\n📋 Posibles causas:');
        if (error.message.includes('No such price')) {
            console.log('   → El Price ID no existe en Stripe');
            console.log('   → Verifica que STRIPE_PRICE_PRO_MONTHLY sea correcto');
        } else if (error.message.includes('already has an active subscription')) {
            console.log('   → El customer ya tiene una suscripción activa');
            console.log('   → Necesitas redirigir al Billing Portal en lugar de checkout');
        } else if (error.message.includes('Invalid API Key')) {
            console.log('   → La STRIPE_SECRET_KEY es inválida');
            console.log('   → Asegúrate de usar la key de producción (sk_live_...) o test (sk_test_...)');
        }
    }
}

// Ejecutar
testCheckout().catch(console.error);
