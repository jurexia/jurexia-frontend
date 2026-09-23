'use client';

/**
 * EL AVISO DE LOS DÍAS QUE QUEDAN (23-sep-2026).
 *
 * Hasta hoy, el primero en enterarse de que un cobro no había entrado era el
 * abogado el día que dejaba de poder consultar: el barrido diario apuntaba
 * «en gracia, 6 días» en su reporte y nadie se lo decía al interesado. Catorce
 * días de margen que no servían de nada porque el margen era secreto.
 *
 * Esto es la otra mitad de `CuentaSuspendida`: aquélla es el muro del que ya
 * cayó; ésta, el aviso del que todavía puede evitarlo. Por eso NO tapa la
 * pantalla —el usuario está al corriente de su acceso, sólo debe una factura—:
 * es una banda arriba, con la cuenta atrás y el botón que abre su facturación
 * en Stripe.
 *
 * SE PUEDE POSPONER, y vuelve al día siguiente. Un aviso que no se puede
 * cerrar se vuelve parte del decorado en dos días; uno que vuelve cada día,
 * no. Lo que no se puede es cerrarlo para siempre: el cobro sigue pendiente.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/** Mismo umbral que el servidor (`DIAS_HASTA_SUSPENDER`). Si allá cambia, aquí también. */
const DIAS_DE_GRACIA = 14;
const CLAVE_POSPUESTO = 'iurexia_aviso_impago_pospuesto';

export function AvisoImpago({ impagoDesde }: { impagoDesde: string | null | undefined }) {
    const [oculto, setOculto] = useState(true);   // se decide en el cliente
    const [abriendo, setAbriendo] = useState(false);

    useEffect(() => {
        if (!impagoDesde) { setOculto(true); return; }
        let pospuesto = 0;
        try { pospuesto = Number(window.localStorage.getItem(CLAVE_POSPUESTO) || 0); } catch { /* ventana privada */ }
        setOculto(Date.now() - pospuesto < 20 * 3600_000);
    }, [impagoDesde]);

    if (!impagoDesde || oculto) return null;

    const dias = Math.floor((Date.now() - new Date(impagoDesde).getTime()) / 86400_000);
    const faltan = Math.max(0, DIAS_DE_GRACIA - dias);
    const urgente = faltan <= 3;

    const posponer = () => {
        try { window.localStorage.setItem(CLAVE_POSPUESTO, String(Date.now())); } catch { /* da igual */ }
        setOculto(true);
    };

    const actualizar = async () => {
        setAbriendo(true);
        try {
            const { urlPortalFacturacion } = await import('@/lib/stripe-client');
            const url = await urlPortalFacturacion();
            // Sin portal —nunca pagó, o la sesión caducó— queda la página de
            // alta, que sabe reconstruir la suscripción desde cero.
            window.location.href = url || '/cuenta/suscripcion';
        } catch {
            window.location.href = '/cuenta/suscripcion';
        }
    };

    return (
        <div
            role="status"
            /* `flex-wrap` con base ancha en el texto: en el teléfono los botones
               bajan a su propio renglón y el párrafo deja de partirse en ocho
               líneas —medido a 375 px, ocupaba un tercio de la pantalla—. */
            className="fixed inset-x-3 top-3 z-[80] mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
        >
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 self-start sm:self-center ${urgente ? 'text-red-600' : 'text-amber-700'}`} />
            <div className="min-w-0 flex-1 basis-[20rem] text-[13.5px] leading-snug text-charcoal-800">
                <p className="font-semibold text-charcoal-900">
                    {faltan === 0
                        ? 'Su cuenta se suspende hoy por falta de pago'
                        : `Su cuenta se suspende en ${faltan} ${faltan === 1 ? 'día' : 'días'} por falta de pago`}
                </p>
                <p className="mt-0.5 text-charcoal-700">
                    El cobro del mes no se completó. Actualice su método de pago y no se
                    interrumpe nada: su plan, sus conversaciones y sus carpetas siguen intactos.
                </p>
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
                <button
                    type="button"
                    onClick={actualizar}
                    disabled={abriendo}
                    className="rounded-lg bg-charcoal-900 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:opacity-60"
                >
                    {abriendo ? 'Abriendo…' : 'Actualizar pago'}
                </button>
                <button
                    type="button"
                    onClick={posponer}
                    aria-label="Recordármelo mañana"
                    title="Recordármelo mañana"
                    className="grid h-8 w-8 place-items-center rounded-lg text-charcoal-500 transition-colors hover:bg-amber-100 hover:text-charcoal-900"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

export default AvisoImpago;
