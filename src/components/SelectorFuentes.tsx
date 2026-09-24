'use client';

/* ═══ EL BOTÓN «FUENTES» (23-sep-2026) ════════════════════════════════════
   Abajo a la izquierda de la caja de consulta, en la fila de «Desplegar
   herramientas» —en la fila del texto le robaba el ancho a lo que se
   escribe—. Pulsado despliega las cuatro fuentes
   con su emblema; cada una se enciende y se apaga con un clic y se combinan
   libremente. Lo apagado no se consulta ni se cita —eso lo garantiza el
   servidor, no esta pantalla—. La elección vive en `@/lib/fuentes`.

   A la vista y fuera de «Desplegar herramientas» a propósito: el filtro de
   fuero de antes existía, pero plegado; el magistrado que motivó esto lo buscó
   y no lo encontró, y el chat de soporte le mandó a una opción «Federal» de la
   barra superior que nunca existió. Un control que no se ve no existe.

   Plegado, el botón ya dice lo esencial: los emblemas de lo que está
   encendido. Si falta alguna fuente, lo dice con palabras. */

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import {
    EVENTO_FUENTES, FUENTES, type Fuente,
    escudoDe, fuentesElegidas, guardarFuentes, todasLasFuentes,
} from '@/lib/fuentes';
import { getEstadoLabel } from '@/lib/estados';

interface Props {
    /** La entidad de la barra superior (la del perfil, salvo que la cambie). */
    estado?: string;
    disabled?: boolean;
}

interface Ficha {
    clave: Fuente;
    titulo: string;
    detalle: string;
    emblema: string | null;
}

function fichas(estado?: string): Ficha[] {
    const escudo = escudoDe(estado);
    const entidad = estado ? getEstadoLabel(estado) : '';
    return [
        {
            clave: 'constitucional',
            titulo: 'Bloque de constitucionalidad',
            detalle: 'Constitución, tratados de derechos humanos y Corte Interamericana',
            emblema: '/fuentes/corteidh.png',
        },
        {
            clave: 'jurisprudencia',
            titulo: 'Jurisprudencia nacional',
            detalle: 'Tesis y precedentes de la Suprema Corte y los tribunales colegiados',
            emblema: '/fuentes/scjn.png',
        },
        {
            clave: 'federal',
            titulo: 'Leyes federales',
            detalle: 'Leyes federales y generales del Congreso de la Unión',
            emblema: '/fuentes/diputados.png',
        },
        {
            clave: 'estatal',
            titulo: 'Leyes estatales',
            detalle: escudo && entidad && entidad !== 'Todos los estados'
                ? `Legislación de ${entidad}`
                : 'Todas las entidades · elija la suya en la barra superior',
            emblema: escudo,
        },
    ];
}

function Emblema({ src, grande = false }: { src: string | null; grande?: boolean }) {
    const caja = grande ? 'h-9 w-9' : 'h-4 w-4';
    if (!src) {
        return (
            <span className={`${caja} grid flex-shrink-0 place-items-center rounded-full bg-cream-100 ring-1 ring-charcoal-900/10`}>
                <MapPin className={grande ? 'h-4 w-4 text-accent-brown' : 'h-2.5 w-2.5 text-accent-brown'} />
            </span>
        );
    }
    return (
        <span className={`${caja} grid flex-shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-charcoal-900/10`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className={grande ? 'h-7 w-7 object-contain' : 'h-3 w-3 object-contain'} />
        </span>
    );
}

export default function SelectorFuentes({ estado, disabled = false }: Props) {
    // Las cuatro hasta leer el navegador: así el servidor y el cliente pintan
    // lo mismo en el primer cuadro.
    const [elegidas, setElegidas] = useState<Fuente[]>([...FUENTES]);
    const [abierto, setAbierto] = useState(false);
    const caja = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setElegidas(fuentesElegidas());
        const sincronizar = (e: Event) => {
            const detalle = (e as CustomEvent<Fuente[]>).detail;
            setElegidas(Array.isArray(detalle) ? detalle : fuentesElegidas());
        };
        window.addEventListener(EVENTO_FUENTES, sincronizar);
        return () => window.removeEventListener(EVENTO_FUENTES, sincronizar);
    }, []);

    // Se cierra al pulsar fuera o con Escape, como cualquier menú.
    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
        };
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        document.addEventListener('mousedown', fuera);
        document.addEventListener('keydown', tecla);
        return () => {
            document.removeEventListener('mousedown', fuera);
            document.removeEventListener('keydown', tecla);
        };
    }, [abierto]);

    const lista = fichas(estado);
    const todas = todasLasFuentes(elegidas);
    const encendidas = lista.filter((f) => elegidas.includes(f.clave));

    const alternar = (f: Fuente) => {
        const esta = elegidas.includes(f);
        if (esta && elegidas.length === 1) return;   // al menos una
        setElegidas(guardarFuentes(esta ? elegidas.filter((x) => x !== f) : [...elegidas, f]));
    };

    const resumen = todas
        ? 'Todas las fuentes'
        : encendidas.map((f) => f.titulo).join(' · ');

    return (
        <div ref={caja} className="relative flex-shrink-0">
            <button
                type="button"
                data-guide="fuero-filter"
                onClick={() => setAbierto((v) => !v)}
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-label={`Fuentes de la consulta: ${resumen}`}
                title={`Fuentes: ${resumen}`}
                /* Vive en la fila de herramientas, bajo el texto: de ahí la
                   altura de 28 px, la misma línea que «Desplegar
                   herramientas». En el teléfono, sólo los emblemas —ya dicen
                   qué está encendido— para que la fila quepa entera. */
                className={`flex h-7 items-center gap-1.5 rounded-full border px-1.5 transition-colors disabled:opacity-50 sm:px-2
                    ${abierto || !todas
                        ? 'border-accent-gold/70 bg-accent-gold/10 text-charcoal-900'
                        : 'border-charcoal-900/15 bg-white text-charcoal-700 hover:border-charcoal-900/30 hover:text-charcoal-900'}`}
            >
                <span className="flex items-center -space-x-1.5">
                    {encendidas.map((f) => <Emblema key={f.clave} src={f.emblema} />)}
                </span>
                <span className="hidden text-[11px] font-semibold sm:inline">Fuentes</span>
                {!todas && (
                    <span className="hidden rounded-full bg-charcoal-900 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums sm:inline">
                        {elegidas.length}/{FUENTES.length}
                    </span>
                )}
                <ChevronDown className={`hidden h-3 w-3 flex-shrink-0 transition-transform sm:block ${abierto ? 'rotate-180' : ''}`} />
            </button>

            {abierto && (
                <div
                    role="menu"
                    aria-label="Fuentes de la consulta"
                    className="absolute bottom-full left-0 z-40 mb-2 w-[min(23rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-charcoal-900/10 bg-white shadow-[0_12px_40px_rgba(17,17,17,0.16)]"
                >
                    <div className="flex items-baseline justify-between gap-3 border-b border-charcoal-900/10 px-4 pb-2.5 pt-3">
                        <p className="font-serif text-[15px] text-charcoal-900">Fuentes de la consulta</p>
                        {!todas && (
                            <button
                                type="button"
                                onClick={() => setElegidas(guardarFuentes([...FUENTES]))}
                                className="text-[11.5px] font-semibold text-accent-brown underline-offset-2 hover:underline"
                            >
                                Encender todas
                            </button>
                        )}
                    </div>

                    <ul className="py-1.5">
                        {lista.map((f) => {
                            const on = elegidas.includes(f.clave);
                            const ultima = on && elegidas.length === 1;
                            return (
                                <li key={f.clave}>
                                    <button
                                        type="button"
                                        role="menuitemcheckbox"
                                        aria-checked={on}
                                        aria-disabled={ultima}
                                        onClick={() => alternar(f.clave)}
                                        title={ultima ? 'Debe quedar al menos una fuente encendida' : undefined}
                                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream-100/70 focus-visible:bg-cream-100/70 focus-visible:outline-none
                                            ${ultima ? 'cursor-not-allowed' : ''}`}
                                    >
                                        <span className={on ? '' : 'opacity-40 grayscale'}>
                                            <Emblema src={f.emblema} grande />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block text-[13px] font-semibold leading-snug ${on ? 'text-charcoal-900' : 'text-gray-500'}`}>
                                                {f.titulo}
                                            </span>
                                            <span className="block text-[11.5px] leading-snug text-gray-500">{f.detalle}</span>
                                        </span>
                                        <span
                                            aria-hidden="true"
                                            className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border transition-colors
                                                ${on ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-900/25 bg-white text-transparent'}`}
                                        >
                                            <Check className="h-3 w-3" strokeWidth={3} />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="border-t border-charcoal-900/10 bg-cream-100/50 px-4 py-2.5 text-[11.5px] leading-snug text-gray-600">
                        {todas
                            ? 'Iurexia consulta las cuatro y elige lo que aplica a su pregunta.'
                            : 'Iurexia responde sólo con las fuentes encendidas: lo apagado no se consulta ni se cita.'}
                    </p>
                </div>
            )}
        </div>
    );
}
