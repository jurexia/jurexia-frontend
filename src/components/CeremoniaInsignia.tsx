'use client';

/**
 * La entrega de la insignia: el momento en que el abogado recibe la marca de
 * su plan.
 *
 * ─── CUÁNDO APARECE, Y POR QUÉ AHÍ ──────────────────────────────────────
 * Al entrar al chat, NO al terminar de pagar. Tres razones:
 *
 *  1. El webhook de Stripe tarda unos segundos en escribir el plan nuevo en
 *     Supabase. Celebrar en la pantalla de éxito enseñaría la insignia VIEJA
 *     a alguien que acaba de pagar — el peor error posible de este sistema.
 *  2. En el chat el perfil ya está cargado y es el que la plataforma usa para
 *     todo lo demás: si dice Platinum, es Platinum.
 *  3. Es el momento de trabajo, no el de la transacción. La insignia se
 *     recibe al empezar a usar lo que se compró.
 *
 * ─── QUÉ IMPIDE QUE SE DISPARE MAL ──────────────────────────────────────
 *  · `insignia_vista` guarda el NIVEL ya mostrado, no un sí/no: subir de Pro
 *    a Platinum vuelve a celebrar, que es de lo que se trata.
 *  · Sólo se celebra ASCENSO. Al bajar de plan la columna se actualiza en
 *    silencio: felicitar a alguien por su descenso es una torpeza cara.
 *  · Se escribe en Supabase ANTES de animar. Si el usuario cierra a media
 *    ceremonia, no le vuelve a salir; una celebración repetida deja de serlo.
 *
 * La insignia termina volando a la esquina superior derecha, donde vive a
 * partir de entonces junto al avatar: la animación explica dónde buscarla.
 */

import { useEffect, useState } from 'react';
import { Insignia, INSIGNIAS, type NivelInsignia } from '@/components/Insignia';

interface Props {
    nivel: NivelInsignia;
    /** Primera insignia de la vida del usuario, o ascenso desde otra. */
    esAscenso: boolean;
    onCerrar: () => void;
}

export function CeremoniaInsignia({ nivel, esAscenso, onCerrar }: Props) {
    const [fase, setFase] = useState<'entrando' | 'visible' | 'volando'>('entrando');
    const info = INSIGNIAS[nivel];

    useEffect(() => {
        const t1 = setTimeout(() => setFase('visible'), 700);
        const t2 = setTimeout(() => setFase('volando'), 4200);
        const t3 = setTimeout(onCerrar, 5300);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onCerrar]);

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal-900/70 backdrop-blur-sm ceremonia-fondo"
            onClick={onCerrar}
            role="dialog"
            aria-label={`Insignia ${info.nombre}`}
        >
            <div className="mx-4 max-w-sm rounded-2xl border border-accent-gold/30 bg-cream-100 px-8 py-9 text-center shadow-2xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent-brown">
                    {esAscenso ? 'Ha ascendido' : 'Le damos la bienvenida'}
                </p>

                <div className={`my-6 flex justify-center ${fase === 'volando' ? 'insignia-vuela' : 'insignia-aparece'}`}>
                    <Insignia nivel={nivel} tam={116} animada />
                </div>

                <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                    Insignia {info.nombre}
                </h2>
                <p className="mt-1 text-sm font-medium text-accent-brown">Plan {info.material}</p>
                <p className="mt-4 text-sm leading-relaxed text-charcoal-700">{info.frase}</p>

                <p className="mt-6 text-[11px] text-charcoal-700/60">
                    La encontrará junto a su nombre, arriba a la derecha.
                </p>
            </div>
        </div>
    );
}
