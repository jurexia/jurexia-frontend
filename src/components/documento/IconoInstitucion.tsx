'use client';
import { useState } from 'react';
import type { Institucion } from '@/lib/documento/citas';

/** El icono del sitio oficial de la institución; si no carga, su inicial. */
export function IconoInstitucion({ inst, tam = 14 }: { inst: Institucion; tam?: number }) {
    const [roto, setRoto] = useState(false);
    if (!inst.icono || roto) {
        return (
            <span
                aria-hidden
                style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.55) }}
                className="inline-flex flex-shrink-0 items-center justify-center rounded-[3px] bg-charcoal-900/10 font-bold leading-none text-charcoal-700"
            >
                {inst.nombre.charAt(0)}
            </span>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={inst.icono} alt="" width={tam} height={tam} className="flex-shrink-0 rounded-[3px]" onError={() => setRoto(true)} />;
}
