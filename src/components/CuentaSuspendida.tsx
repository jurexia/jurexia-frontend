'use client';

/**
 * El muro de la cuenta suspendida (31-ago-2026; al primer rechazo desde el
 * 28-sep-2026).
 *
 * Se pinta sobre TODO —no es un banner ni un aviso descartable— en cuanto el
 * perfil trae `suspendido_at`, y no hay forma de cerrarlo. Desde el 28-sep cae
 * al primer cobro rechazado, sin plazo de gracia, y la única acción que ofrece
 * es la que pidió David: ACTUALIZAR EL MÉTODO DE PAGO. Ya no deja ir a
 * /precios ni a /checkout (ver `AuthProvider`): desde ahí se podía contratar
 * otro plan y dejar atrás la factura rechazada.
 *
 * EL RECORRIDO:
 *   1. El botón pide `/api/stripe/metodo-de-pago` y lleva al portal de Stripe,
 *      directo al alta de una tarjeta nueva.
 *   2. Stripe devuelve a `/chat?pago=actualizado`. Aquí el muro llama a
 *      `/api/stripe/reintentar-cobro`, que pone la tarjeta nueva en la
 *      suscripción y cobra la factura en el acto.
 *   3. Si entra, la suspensión ya se levantó y se recarga sin el parámetro.
 *      Si el banco la rechaza, se dice por qué y se ofrece otra tarjeta.
 *
 * Y si paga por otro camino —el enlace del correo, o un reintento de Stripe
 * que sí pasa—, el muro lo nota solo: mira el perfil cada 10 s.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Estado =
    | { tipo: 'listo' }
    | { tipo: 'abriendo' }
    | { tipo: 'cobrando' }
    | { tipo: 'rechazado'; mensaje: string }
    | { tipo: 'confirmar'; url: string; porque: 'autenticar' | 'factura' }
    | { tipo: 'error' };

/** POST con el token de la sesión: las dos rutas sacan el correo de ahí. */
async function pedir(ruta: string): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('sin sesión');
    const r = await fetch(ruta, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
    return d;
}

export function CuentaSuspendida({ email, userId }: { email?: string | null; userId?: string | null }) {
    const [estado, setEstado] = useState<Estado>({ tipo: 'listo' });

    /** Recargar sin `?pago=actualizado`: el perfil se vuelve a leer ya sin la
     *  suspensión, y una recarga posterior no vuelve a intentar el cobro. */
    const abrir = useCallback(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('pago');
        window.location.replace(url.toString());
    }, []);

    const actualizarMetodo = async () => {
        setEstado({ tipo: 'abriendo' });
        try {
            const d = await pedir('/api/stripe/metodo-de-pago');
            if (d.accion === 'reactivada') return abrir();
            if (d.url) {
                window.location.href = d.url;
                return;
            }
            setEstado({ tipo: 'error' });
        } catch {
            setEstado({ tipo: 'error' });
        }
    };

    // AL VOLVER DEL PORTAL: cobrar ya con la tarjeta nueva.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('pago') !== 'actualizado') return;
        let vivo = true;
        setEstado({ tipo: 'cobrando' });
        pedir('/api/stripe/reintentar-cobro')
            .then((d) => {
                if (!vivo) return;
                if (d.estado === 'pagado' || d.estado === 'sin_adeudo') return abrir();
                if ((d.estado === 'autenticar' || d.estado === 'factura') && d.url) {
                    return setEstado({ tipo: 'confirmar', url: d.url, porque: d.estado as 'autenticar' | 'factura' });
                }
                setEstado({ tipo: 'rechazado', mensaje: d.mensaje || 'Tu banco rechazó el cargo con la tarjeta nueva.' });
            })
            .catch(() => { if (vivo) setEstado({ tipo: 'error' }); });
        return () => { vivo = false; };
    }, [abrir]);

    // SI PAGA POR OTRO CAMINO, LA PUERTA SE ABRE SOLA. Un error de lectura NO
    // cuenta como «ya no está suspendido»: recargaría en bucle.
    useEffect(() => {
        if (!userId) return;
        let vivo = true;
        const mirar = async () => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('suspendido_at')
                .eq('id', userId)
                .maybeSingle();
            if (vivo && !error && data && !data.suspendido_at) abrir();
        };
        const reloj = setInterval(mirar, 10000);
        return () => { vivo = false; clearInterval(reloj); };
    }, [userId, abrir]);

    const salir = async () => {
        await supabase.auth.signOut();
        window.location.href = '/entrar';
    };

    const ocupado = estado.tipo === 'abriendo' || estado.tipo === 'cobrando';

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
                    Tu banco rechazó el cobro de tu suscripción. Para seguir usando Iurexia,
                    actualiza tu método de pago: en cuanto el cobro se complete, tu cuenta
                    se reactiva sola.
                </p>

                <p className="mb-6 text-sm leading-relaxed text-charcoal-600">
                    <strong className="text-charcoal-900">No has perdido nada.</strong> Tu plan,
                    tus conversaciones, tus carpetas y tus documentos siguen intactos, y tu
                    tarifa se conserva.
                </p>

                {estado.tipo === 'rechazado' && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
                        {estado.mensaje}
                    </p>
                )}
                {estado.tipo === 'error' && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
                        No pudimos completar el paso. Inténtalo de nuevo; si se repite, escríbenos
                        a soporte@iurexia.com.
                    </p>
                )}

                {estado.tipo === 'confirmar' ? (
                    <>
                        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-charcoal-800">
                            {estado.porque === 'autenticar'
                                ? 'Tu banco pide que confirmes el pago.'
                                : 'Tienes una factura pendiente de un periodo anterior.'}{' '}
                            Al pagarla, esta pantalla se abre sola.
                        </p>
                        <a
                            href={estado.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-lg bg-charcoal-900 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-charcoal-800"
                        >
                            Confirmar el pago
                        </a>
                    </>
                ) : (
                    <button
                        onClick={actualizarMetodo}
                        disabled={ocupado}
                        className="w-full rounded-lg bg-charcoal-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-charcoal-800 disabled:opacity-60"
                    >
                        {estado.tipo === 'abriendo' ? 'Abriendo…'
                            : estado.tipo === 'cobrando' ? 'Completando el cobro con tu tarjeta nueva…'
                                : estado.tipo === 'rechazado' ? 'Probar con otra tarjeta'
                                    : 'Actualizar mi método de pago'}
                    </button>
                )}

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
