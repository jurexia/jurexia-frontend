/* ═══ EL ESTADO DE LA SUSCRIPCIÓN, VISTO DESDE LA PANTALLA (26-sep-2026) ═══
   David: «muchos usuarios se quejan de que no pueden cancelar su cuenta […] si
   se procesa, sólo que por error la plataforma les dice que ocurrió un
   error. Es necesario que vean el mensaje de que su cuenta ha sido
   cancelada, que conservan el periodo pagado (dar fecha) y que no ocurrirá
   cobro subsecuente».

   Una sola forma de preguntar a Stripe cómo está la suscripción, para que el
   diálogo de cancelación, el perfil y /cuenta/suscripcion digan lo mismo.
   Siempre con la sesión: /cuenta/suscripcion llamaba sin ella, recibía 401 y
   nunca enseñaba ni la fecha ni la cancelación. */

import { supabase } from '@/lib/supabase';

/** Lo dispara el diálogo al cancelar: quien enseña el estado se actualiza. */
export const EVENTO_SUSCRIPCION = 'iurexia:suscripcion';

export interface EstadoSuscripcion {
    plan: string;
    status: string;
    /** Fin del periodo en curso (ISO) — la próxima facturación si no canceló. */
    currentPeriodEnd: string | null;
    /** Canceló: no habrá más cobros y el acceso dura hasta `cancelAt`. */
    cancelAtPeriodEnd: boolean;
    /** Hasta cuándo conserva el acceso quien canceló (ISO). */
    cancelAt: string | null;
    pausedUntil: string | null;
}

/** El estado según Stripe, o null si no se pudo saber (nunca lanza). */
export async function consultarSuscripcion(): Promise<EstadoSuscripcion | null> {
    try {
        const tk = (await supabase.auth.getSession()).data.session?.access_token;
        if (!tk) return null;
        const r = await fetch('/api/stripe/subscription', { headers: { Authorization: `Bearer ${tk}` } });
        return r.ok ? await r.json() : null;
    } catch {
        return null;
    }
}

/** «9 de octubre de 2026», o null si la fecha no sirve. */
export function fechaLarga(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function avisarCambioDeSuscripcion(): void {
    try { window.dispatchEvent(new Event(EVENTO_SUSCRIPCION)); } catch { /* sin ventana */ }
}
