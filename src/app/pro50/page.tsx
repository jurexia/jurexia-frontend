'use client';
/**
 * Aterrizaje de la oferta «Pro al 50 % el primer mes» (17-sep-2026).
 *
 * Va aquí y no en /precios porque el correo promete una cosa concreta y la
 * página tiene que cumplirla sin distracciones: el precio con el descuento ya
 * calculado, las condiciones escritas antes del botón, y un botón que abre
 * Stripe con el código aplicado. Quien no ha iniciado sesión pasa por /login y
 * vuelve aquí.
 *
 * Las condiciones de esta página son las del código PRO50 en Stripe, que es
 * quien las hace cumplir: sólo Pro mensual, sólo la primera compra, un mes, y
 * vigente hasta el 17 de octubre de 2026. Si cambian allá, cambian aquí.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';
import { PLANS } from '@/lib/stripe';

const CODIGO = 'PRO50';
const VIGENCIA = '17 de octubre de 2026';

export default function Pro50Page() {
    const { user } = useAuth();
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const activar = async () => {
        setError('');
        if (!user?.email) {
            window.location.href = '/login?redirect=/pro50';
            return;
        }
        const priceId = PLANS.pro_monthly.priceId;
        if (!priceId) {
            setError('No pudimos preparar el pago. Escríbanos a soporte@iurexia.com.');
            return;
        }
        setCargando(true);
        try {
            await redirectToCheckout(priceId, user.email, CODIGO);
        } catch (e: any) {
            setError(e?.message?.includes('Ya tienes este plan')
                ? 'Su cuenta ya tiene el plan Pro activo.'
                : 'No pudimos abrir el pago. Inténtelo de nuevo o escríbanos a soporte@iurexia.com.');
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-200 px-4 py-10 sm:py-16">
            <div className="mx-auto w-full max-w-lg">
                <Link href="/" className="block font-serif text-2xl font-semibold tracking-wide text-charcoal-900">Iurexia</Link>
                <div className="mb-8 mt-2 text-[10px] uppercase tracking-[0.2em] text-accent-brown">Legal Tech</div>

                <div className="rounded-2xl border border-cream-300 bg-white p-7 sm:p-9">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-accent-brown">Oferta para usuarios de Iurexia</div>
                    <h1 className="mt-3 font-serif text-3xl leading-tight text-charcoal-900 [text-wrap:balance]">
                        Iurexia Pro al 50 % en su primer mes
                    </h1>

                    <div className="mt-6 flex items-baseline gap-3">
                        <span className="font-serif text-5xl text-charcoal-900">$74.50</span>
                        <span className="text-sm text-charcoal-600">MXN el primer mes</span>
                    </div>
                    <p className="mt-2 text-sm text-charcoal-600">
                        Después, <strong className="text-charcoal-900">$149 MXN al mes</strong>, el precio de socio
                        fundador. El precio regular de Pro es de <span className="line-through">$249 MXN</span>.
                    </p>

                    <ul className="mt-6 space-y-2.5 border-t border-cream-300 pt-6 text-sm text-charcoal-800">
                        {PLANS.pro_monthly.features.slice(0, 5).map((f) => (
                            <li key={f} className="flex gap-2.5">
                                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-gold" />
                                <span>{f}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={activar}
                        disabled={cargando}
                        className="mt-8 w-full rounded-lg bg-accent-gold px-5 py-3.5 text-sm font-bold text-charcoal-900 transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {cargando ? 'Abriendo el pago seguro…' : user ? 'Activar Pro con 50 % de descuento' : 'Iniciar sesión y activar Pro'}
                    </button>
                    {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

                    <p className="mt-4 text-center text-xs text-charcoal-500">
                        Pago seguro con Stripe. El descuento aparece ya aplicado antes de pagar.
                    </p>
                </div>

                <div className="mt-6 rounded-xl border border-cream-300 bg-cream-100 p-5 text-xs leading-relaxed text-charcoal-700">
                    <p className="mb-2 font-medium text-charcoal-900">Condiciones</p>
                    <ul className="list-disc space-y-1 pl-4">
                        <li>50 % de descuento sobre el plan Pro mensual, aplicable únicamente al primer mes.</li>
                        <li>A partir del segundo mes la suscripción se renueva sola a $149 MXN mensuales, hasta que usted la cancele.</li>
                        <li>Puede cancelar en cualquier momento desde su perfil, sin contactar a nadie. Conserva el acceso hasta el fin del periodo pagado.</li>
                        <li>Válido para cuentas que no han tenido antes una suscripción de pago en Iurexia.</li>
                        <li>Vigente hasta el {VIGENCIA}. No acumulable con otras promociones.</li>
                    </ul>
                    <p className="mt-3">
                        Aplican los <Link href="/terminos" className="underline">Términos y Condiciones</Link> de Iurexia.
                    </p>
                </div>
            </div>
        </div>
    );
}
