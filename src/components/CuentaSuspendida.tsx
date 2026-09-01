'use client';

/**
 * El muro de la cuenta suspendida (31-ago-2026).
 *
 * Hasta hoy la suspensión sólo se notaba al preguntar: `consume_query`
 * devolvía `suscripcion_suspendida` y el chat contestaba con un aviso. Eso
 * frena las consultas, pero no frena la sesión: el usuario entra, navega sus
 * carpetas, abre sus documentos y sólo choca con el muro cuando escribe. Un
 * moroso podía pasar días dentro sin enterarse de que debía.
 *
 * Este componente cierra esa puerta. Se pinta sobre TODO —no es un banner ni
 * un aviso descartable— en cuanto el perfil trae `suspendido_at`, y no hay
 * forma de cerrarlo: la única salida es pagar el adeudo o salir de la sesión.
 *
 * Las rutas de pago quedan fuera del muro (ver AuthProvider): encerrar al
 * usuario sin dejarle llegar a la caja sería cobrarle a puerta cerrada.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function CuentaSuspendida({ email }: { email?: string | null }) {
    const [abriendo, setAbriendo] = useState(false);

    // El portal de Stripe es el camino corto: cambia la tarjeta y liquida el
    // adeudo en la misma sesión, sin que el usuario tenga que buscar nada. Si
    // falla —cliente sin `stripe_customer_id`, por ejemplo— se cae a la
    // página de suscripción, que sabe reconstruir el alta desde cero.
    const irAPagar = async () => {
        setAbriendo(true);
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const datos = await res.json();
            if (datos?.url) {
                window.location.href = datos.url;
                return;
            }
        } catch {
            // silencio: el respaldo de abajo cubre cualquier fallo
        }
        window.location.href = '/cuenta/suscripcion';
    };

    const salir = async () => {
        await supabase.auth.signOut();
        window.location.href = '/entrar';
    };

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-suspension"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-charcoal-900/95 p-4 backdrop-blur-sm"
        >
            <div className="w-full max-w-lg rounded-2xl border border-amber-300 bg-white p-8 shadow-2xl">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100">
                        <span className="font-serif text-lg text-amber-800">!</span>
                    </div>
                    <h2 id="titulo-suspension" className="font-serif text-2xl font-medium text-charcoal-900">
                        Cuenta suspendida por falta de pago
                    </h2>
                </div>

                <p className="mb-4 text-base leading-relaxed text-charcoal-700">
                    Para reactivar, actualiza tu método de pago. Tu cuenta permanecerá
                    suspendida hasta que se cubra el adeudo.
                </p>

                <p className="mb-6 text-sm leading-relaxed text-charcoal-600">
                    <strong className="text-charcoal-900">No has perdido nada.</strong> Tu plan,
                    tus conversaciones, tus carpetas y tus documentos siguen intactos, y tu
                    tarifa de socio fundador se conserva. En cuanto entre el pago, tu acceso
                    vuelve solo.
                </p>

                <button
                    onClick={irAPagar}
                    disabled={abriendo}
                    className="w-full rounded-lg bg-charcoal-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-charcoal-800 disabled:opacity-60"
                >
                    {abriendo ? 'Abriendo…' : 'Actualizar mi método de pago'}
                </button>

                <div className="mt-5 flex items-center justify-between border-t border-charcoal-100 pt-4 text-xs text-charcoal-500">
                    <span>
                        ¿Crees que es un error? Escríbenos a{' '}
                        <a href="mailto:soporte@iurexia.com" className="underline">
                            soporte@iurexia.com
                        </a>
                    </span>
                    <button onClick={salir} className="ml-3 flex-shrink-0 underline hover:text-charcoal-700">
                        Cerrar sesión
                    </button>
                </div>

                {email && (
                    <p className="mt-3 text-[11px] text-charcoal-400">Sesión de {email}</p>
                )}
            </div>
        </div>
    );
}
