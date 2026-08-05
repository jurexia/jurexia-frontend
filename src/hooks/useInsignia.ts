'use client';

/**
 * Decide si toca entregar la insignia, y la marca como entregada.
 *
 * La regla, en una línea: se celebra cuando el nivel del plan SUPERA al último
 * que se le mostró. Todo lo demás se registra en silencio.
 *
 * ─── EL DESFASE DE STRIPE, QUE ES EL RIESGO REAL ────────────────────────
 * Tras pagar, el webhook tarda unos segundos en escribir el plan nuevo en
 * Supabase. Si el usuario llega al chat antes de eso, su perfil todavía dice
 * «gratuito» y le entregaríamos la insignia de mármol a alguien que acaba de
 * pagar Platinum — y, peor, `insignia_vista` quedaría en 'gratuito', así que
 * al recargar tampoco vería la suya.
 *
 * Por eso: si el usuario viene de un pago (`?bienvenida=1`, que pone la
 * pantalla de éxito) se espera a que el perfil deje de decir «gratuito», con
 * varios reintentos. Si el webhook nunca llega, no se entrega nada: es
 * preferible que la insignia salga en la siguiente visita a entregar la
 * equivocada y bloquear la buena.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type UserProfile } from '@/lib/supabase';
import { nivelDePlan, RANGO, type NivelInsignia } from '@/components/Insignia';

const ESPERAS_TRAS_PAGO = 6;      // reintentos
const PAUSA_MS = 2500;            // entre reintentos → hasta 15 s de gracia

export function useInsignia(profile: UserProfile | null | undefined) {
    const [pendiente, setPendiente] = useState<{ nivel: NivelInsignia; esAscenso: boolean } | null>(null);
    const yaEvaluado = useRef(false);

    const cerrar = useCallback(() => setPendiente(null), []);

    useEffect(() => {
        if (!profile || yaEvaluado.current) return;

        const vienePagando =
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('bienvenida') === '1';

        let cancelado = false;

        (async () => {
            let actual = profile;

            // Espera al webhook sólo si viene de pagar y el perfil aún dice
            // gratuito. En cualquier otro caso se resuelve de inmediato.
            if (vienePagando && actual.subscription_type === 'gratuito') {
                for (let i = 0; i < ESPERAS_TRAS_PAGO && !cancelado; i++) {
                    await new Promise((r) => setTimeout(r, PAUSA_MS));
                    const { data } = await supabase
                        .from('user_profiles')
                        .select('subscription_type, insignia_vista')
                        .eq('id', profile.id)
                        .maybeSingle();
                    if (data && data.subscription_type !== 'gratuito') {
                        actual = { ...actual, ...data } as UserProfile;
                        break;
                    }
                }
                // El webhook no llegó: no se entrega nada y no se marca nada,
                // así la insignia correcta saldrá en la próxima visita.
                if (actual.subscription_type === 'gratuito') return;
            }

            if (cancelado) return;
            yaEvaluado.current = true;

            const nivel = nivelDePlan(actual.subscription_type);
            const visto = actual.insignia_vista as NivelInsignia | null | undefined;

            if (visto === nivel) return;                       // ya la tiene
            const esAscenso = !!visto && RANGO[nivel] > RANGO[visto];
            const esPrimera = !visto;

            // Se marca ANTES de animar: si cierra a media ceremonia, no le
            // vuelve a salir. Una celebración repetida deja de serlo.
            await supabase
                .from('user_profiles')
                .update({ insignia_vista: nivel })
                .eq('id', profile.id);

            // Descenso de plan: se registra, pero no se celebra. Felicitar a
            // alguien por bajar de plan es una torpeza cara.
            if (!esPrimera && !esAscenso) return;

            if (!cancelado) setPendiente({ nivel, esAscenso });
        })();

        return () => { cancelado = true; };
    }, [profile]);

    return { insigniaPendiente: pendiente, cerrarInsignia: cerrar };
}
