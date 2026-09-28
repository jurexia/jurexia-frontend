'use client';
/**
 * El muro de la cuenta bloqueada por disputa (15-sep-2026).
 *
 * Distinto del muro de suspensión por impago, y a propósito:
 *
 *   · La SUSPENSIÓN es temporal y se levanta pagando, así que su muro lleva
 *     un botón que lleva a la caja.
 *   · El BLOQUEO no se levanta pagando. Aquí no hay nada que cobrar —la
 *     suscripción ya se canceló— y ofrecer un botón de pago sería mandar al
 *     usuario a una puerta que no abre. La única salida es escribir a
 *     soporte para que una persona revise el caso.
 *     (La excepción es el cierre que pidió el propio titular: ése sí se
 *     reabre pagando. Ver `CierreSolicitado`, más abajo.)
 *
 * SE LE DICE EL MOTIVO CON TODAS SUS LETRAS. Un bloqueo mudo es lo que
 * convierte a un cliente molesto en una queja ante el banco o ante Profeco.
 * El texto explica qué pasó, por qué se cierra la cuenta y cómo se revisa.
 *
 * El tono no acusa: quien disputa puede haberlo hecho por error, o puede ser
 * la víctima de un uso indebido de su tarjeta. En los dos casos cerrar la
 * cuenta es lo correcto, y en los dos casos el usuario merece saberlo sin que
 * se le trate de tramposo.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { esCierreSolicitado, planDelCierre } from '@/lib/cierre-cuenta';

/* EL CIERRE QUE PIDIÓ EL TITULAR (28-sep-2026). El muro nació para las
   disputas, y su texto lo dice —«Su institución bancaria nos informó que se
   desconoció uno de los cargos»—. A quien pidió cancelar y recibió su
   reembolso, cerrarle el acceso con ESE texto sería contarle algo que no
   pasó. El motivo en `blocked_users.reason` decide la variante (ver
   lib/cierre-cuenta.ts), y ésta sí lleva a la caja: la cuenta se reabre
   pagando. */
export function CuentaBloqueada({ email, desde, motivo, userId }: {
    email?: string | null; desde?: string | null; motivo?: string | null; userId?: string | null;
}) {
    const salir = async () => {
        await supabase.auth.signOut();
        window.location.href = '/entrar';
    };

    const fecha = desde
        ? new Date(desde).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    if (esCierreSolicitado(motivo)) {
        return <CierreSolicitado email={email} fecha={fecha} motivo={motivo} userId={userId} salir={salir} />;
    }

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-bloqueo"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-charcoal-900/95 p-4 backdrop-blur-sm"
        >
            <div className="w-full max-w-lg rounded-2xl border border-charcoal-300 bg-white p-8 shadow-2xl">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-charcoal-300 bg-charcoal-100">
                        <span className="font-serif text-lg text-charcoal-800">&#10005;</span>
                    </div>
                    <h2 id="titulo-bloqueo" className="font-serif text-2xl font-medium text-charcoal-900">
                        Cuenta bloqueada por disputa de cargo
                    </h2>
                </div>

                <p className="mb-4 text-base leading-relaxed text-charcoal-700">
                    Su institución bancaria nos informó que <strong className="text-charcoal-900">se desconoció
                    uno de los cargos</strong> de esta cuenta{fecha ? ` el ${fecha}` : ''}. En consecuencia, su
                    suscripción fue cancelada y el acceso a la plataforma quedó cerrado.
                </p>

                <div className="mb-4 rounded-lg border border-charcoal-200 bg-charcoal-50 p-4 text-sm leading-relaxed text-charcoal-700">
                    <p className="mb-2 font-medium text-charcoal-900">Por qué cerramos la cuenta</p>
                    <p>
                        Cuando se desconoce un cargo, el medio de pago queda en cuestión: puede tratarse de un
                        error, pero también del uso de una tarjeta por quien no es su titular. Mantener abierto
                        un servicio de pago sobre una tarjeta cuestionada expondría al titular a un cobro que
                        quizá no autorizó. Cerrar la cuenta y cancelar la suscripción es la medida que lo evita.
                    </p>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-charcoal-700">
                    <strong className="text-charcoal-900">Si se trató de un error, tiene solución.</strong> Escríbanos
                    a{' '}
                    <a href="mailto:soporte@iurexia.com" className="underline">
                        soporte@iurexia.com
                    </a>{' '}
                    desde este mismo correo y una persona revisará su caso. Si el cargo se reconoce ante el banco,
                    restablecemos su cuenta con todo su contenido en el estado en que quedó: sus conversaciones,
                    sus carpetas y sus documentos siguen guardados.
                </p>

                <a
                    href="mailto:soporte@iurexia.com?subject=Revisi%C3%B3n%20de%20cuenta%20bloqueada"
                    className="block w-full rounded-lg bg-charcoal-900 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-charcoal-800"
                >
                    Escribir a soporte
                </a>

                <div className="mt-5 flex items-center justify-between border-t border-charcoal-100 pt-4 text-xs text-charcoal-500">
                    <span>Sus datos y documentos se conservan íntegros.</span>
                    <button onClick={salir} className="ml-3 flex-shrink-0 underline hover:text-charcoal-700">
                        Cerrar sesión
                    </button>
                </div>
                {email && <p className="mt-3 text-[11px] text-charcoal-400">Sesión de {email}</p>}
            </div>
        </div>
    );
}

function CierreSolicitado({ email, fecha, motivo, userId, salir }: {
    email?: string | null; fecha: string | null; motivo?: string | null; userId?: string | null;
    salir: () => void;
}) {
    const [abriendo, setAbriendo] = useState(false);
    const [fallo, setFallo] = useState(false);

    // QUIEN YA PAGÓ NO PUEDE SEGUIR VIENDO ESTE MURO. Vuelve de Stripe a
    // /checkout/success con el bloqueo leído ANTES de que el webhook lo
    // borrara, y al pasar al chat sin recargar la página lo encontraría otra
    // vez: «inhabilitada» a quien acaba de pagar. Mientras el muro esté
    // abierto se pregunta por la fila; si ya no existe, se recarga. Un error
    // de lectura NO cuenta como «ya no existe»: recargaría en bucle.
    useEffect(() => {
        if (!userId) return;
        let vivo = true;
        const mirar = async () => {
            const { data, error } = await supabase
                .from('blocked_users')
                .select('reason')
                .eq('user_id', userId)
                .maybeSingle();
            if (vivo && !error && !data) window.location.reload();
        };
        mirar();
        const reloj = setInterval(mirar, 10000);
        return () => { vivo = false; clearInterval(reloj); };
    }, [userId]);

    // Un clic y a la caja de Stripe, con el plan que tenía. Stripe enseña el
    // plan y el precio antes de cobrar nada. Se importa al pulsar, no antes:
    // este muro vive en el proveedor de sesión de TODAS las páginas y no debe
    // cargarle a nadie el código de cobro.
    const reactivar = async () => {
        setAbriendo(true);
        setFallo(false);
        try {
            const [{ PLANS }, { redirectToCheckout }] = await Promise.all([
                import('@/lib/stripe'),
                import('@/lib/stripe-client'),
            ]);
            const planes = PLANS as unknown as Record<string, { priceId?: string | null }>;
            const plan = planDelCierre(motivo);
            const precio = plan ? planes[plan]?.priceId : null;
            if (!precio || !email) {
                window.location.href = '/precios';
                return;
            }
            await redirectToCheckout(precio, email);
        } catch {
            setAbriendo(false);
            setFallo(true);
        }
    };

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-cierre"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-charcoal-900/95 p-4 backdrop-blur-sm"
        >
            <div className="w-full max-w-lg rounded-2xl border border-charcoal-300 bg-white p-8 shadow-2xl">
                <h2 id="titulo-cierre" className="mb-4 font-serif text-2xl font-medium text-charcoal-900">
                    Cuenta inhabilitada
                </h2>
                <p className="mb-4 text-base leading-relaxed text-charcoal-700">
                    A solicitud suya{fecha ? `, el ${fecha},` : ''} cancelamos su suscripción y la cuenta quedó
                    inhabilitada. <strong className="text-charcoal-900">No se realizará ningún cargo más.</strong>
                </p>
                <div className="mb-5 rounded-lg border border-charcoal-200 bg-charcoal-50 p-4 text-sm leading-relaxed text-charcoal-700">
                    Puede reactivarla cuando lo desee con un solo pago. El acceso se restablece en cuanto el pago
                    se confirma, con sus conversaciones, carpetas y documentos tal como quedaron.
                </div>
                <button
                    type="button"
                    onClick={reactivar}
                    disabled={abriendo}
                    className="block w-full rounded-lg bg-charcoal-900 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-charcoal-800 disabled:opacity-60"
                >
                    {abriendo ? 'Abriendo la caja segura…' : 'Reactivar mi cuenta'}
                </button>
                {fallo && (
                    <p className="mt-3 text-sm text-red-700" role="alert">
                        No pudimos abrir la caja. Inténtelo de nuevo o elija su plan en la página de precios.
                    </p>
                )}
                <p className="mt-3 text-center text-xs leading-relaxed text-charcoal-500">
                    Le llevamos a la caja segura de Stripe con el plan que tenía.{' '}
                    <a href="/precios" className="underline hover:text-charcoal-700">
                        Ver todos los planes
                    </a>
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-charcoal-100 pt-4 text-xs text-charcoal-500">
                    <span>
                        Dudas:{' '}
                        <a href="mailto:soporte@iurexia.com" className="underline hover:text-charcoal-700">
                            soporte@iurexia.com
                        </a>
                    </span>
                    <button onClick={salir} className="ml-3 flex-shrink-0 underline hover:text-charcoal-700">
                        Cerrar sesión
                    </button>
                </div>
                {email && <p className="mt-3 text-[11px] text-charcoal-400">Sesión de {email}</p>}
            </div>
        </div>
    );
}
