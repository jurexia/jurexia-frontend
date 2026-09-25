'use client';

/* ═══ EL DESPLEGABLE «ESFUERZO» (25-sep-2026) ════════════════════════════
   Sustituye al interruptor Buscar/Redactar y a las tres pastillas
   Profesional · Pro · Platinum. Vive junto a «Fuentes», en la fila que se ve
   siempre: el abogado no tiene que desplegar nada para saber con qué fuerza
   se le va a redactar.

   No enciende la redacción: la enciende el mensaje («Redacta una demanda…»).
   Esto sólo dice con qué motor. Ver `@/lib/esfuerzo`. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Gem, Lock, PenLine, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import {
    EVENTO_ESFUERZO, ESFUERZOS, type Esfuerzo,
    esfuerzoVigente, fijarEnPantalla, guardarEsfuerzo, permitido, techoDelPlan,
} from '@/lib/esfuerzo';

interface Ficha {
    clave: Esfuerzo;
    nombre: string;
    detalle: string;
    plan: string;
    Icono: typeof PenLine;
    tinta: string;
}

const FICHAS: Record<Esfuerzo, Ficha> = {
    basico: {
        clave: 'basico',
        nombre: 'Básico',
        detalle: 'Escrito completo, ágil y bien estructurado.',
        plan: 'Todos los planes',
        Icono: PenLine,
        tinta: 'text-charcoal-600',
    },
    pro: {
        clave: 'pro',
        nombre: 'Pro',
        detalle: 'Razona a fondo cada argumento antes de escribir.',
        plan: 'Plan Pro',
        Icono: Sparkles,
        tinta: 'text-accent-gold',
    },
    platinum: {
        clave: 'platinum',
        nombre: 'Platinum',
        detalle: 'El motor más potente: escritos más extensos y argumentos en capas.',
        plan: 'Plan Platinum',
        Icono: Gem,
        tinta: 'text-slate-700',
    },
};

interface Props {
    disabled?: boolean;
}

export default function SelectorEsfuerzo({ disabled = false }: Props) {
    const { user, profile } = useAuth();
    const techo = techoDelPlan(profile?.subscription_type, user?.email);
    // Básico hasta leer el navegador y el perfil: servidor y cliente pintan lo
    // mismo en el primer cuadro.
    const [elegido, setElegido] = useState<Esfuerzo>('basico');
    const [abierto, setAbierto] = useState(false);
    // Cuánto se corre el menú a la izquierda para no salirse de la pantalla:
    // «Fuentes» va pegado al borde, pero este botón no, y en el teléfono el
    // menú anclado a su izquierda asomaba 60 px por la derecha.
    const [desplazo, setDesplazo] = useState(0);
    const caja = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const vigente = esfuerzoVigente(techo);
        setElegido(vigente);
        fijarEnPantalla(vigente);
        const sincronizar = (e: Event) => {
            const d = (e as CustomEvent<Esfuerzo>).detail;
            if (d && permitido(d, techo)) setElegido(d);
        };
        window.addEventListener(EVENTO_ESFUERZO, sincronizar);
        return () => window.removeEventListener(EVENTO_ESFUERZO, sincronizar);
    }, [techo]);

    useLayoutEffect(() => {
        if (!abierto || !caja.current) return;
        // clientWidth y no innerWidth: éste cuenta la barra de desplazamiento
        // (y en la emulación de teléfono del navegador, más que eso).
        const vista = document.documentElement.clientWidth;
        const izquierda = caja.current.getBoundingClientRect().left;
        const ancho = Math.min(336, vista - 40);
        const sobra = izquierda + ancho - (vista - 16);
        setDesplazo(sobra > 0 ? -Math.min(sobra, Math.max(0, izquierda - 16)) : 0);
    }, [abierto]);

    // Se cierra al pulsar fuera o con Escape, como «Fuentes».
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

    const actual = FICHAS[elegido];

    return (
        <div ref={caja} className="relative flex-shrink-0">
            <button
                type="button"
                data-guide="esfuerzo"
                onClick={() => setAbierto((v) => !v)}
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-label={`Esfuerzo de redacción: ${actual.nombre}`}
                title={`Esfuerzo de redacción: ${actual.nombre}. Se aplica cuando pide un escrito.`}
                className={`flex h-7 items-center gap-1.5 rounded-full border px-2 transition-colors disabled:opacity-50
                    ${abierto
                        ? 'border-accent-gold/70 bg-accent-gold/10 text-charcoal-900'
                        : 'border-charcoal-900/15 bg-white text-charcoal-700 hover:border-charcoal-900/30 hover:text-charcoal-900'}`}
            >
                <actual.Icono className={`h-3.5 w-3.5 flex-shrink-0 ${actual.tinta}`} />
                <span className="palabra-esfuerzo text-[11px] font-medium text-gray-500">Esfuerzo</span>
                <span className="text-[11px] font-semibold">{actual.nombre}</span>
                <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>

            {abierto && (
                <div
                    role="menu"
                    aria-label="Esfuerzo de redacción"
                    style={{ left: desplazo }}
                    className="absolute bottom-full left-0 z-40 mb-2 w-[min(21rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-charcoal-900/10 bg-white shadow-[0_12px_40px_rgba(17,17,17,0.16)]"
                >
                    <div className="border-b border-charcoal-900/10 px-4 pb-2.5 pt-3">
                        <p className="font-serif text-[15px] text-charcoal-900">Esfuerzo de redacción</p>
                    </div>

                    <ul className="py-1.5">
                        {ESFUERZOS.map((clave) => {
                            const f = FICHAS[clave];
                            const libre = permitido(clave, techo);
                            const on = elegido === clave;
                            const fila = (
                                <>
                                    <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ring-1 ring-charcoal-900/10
                                        ${libre ? 'bg-cream-100' : 'bg-gray-50'}`}>
                                        <f.Icono className={`h-4 w-4 ${libre ? f.tinta : 'text-gray-400'}`} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-[13px] font-semibold leading-snug ${libre ? 'text-charcoal-900' : 'text-gray-500'}`}>
                                            {f.nombre}
                                        </span>
                                        <span className="block text-[11.5px] leading-snug text-gray-500">{f.detalle}</span>
                                    </span>
                                    {libre ? (
                                        <span
                                            aria-hidden="true"
                                            className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border transition-colors
                                                ${on ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-900/25 bg-white text-transparent'}`}
                                        >
                                            <Check className="h-3 w-3" strokeWidth={3} />
                                        </span>
                                    ) : (
                                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-accent-gold/40 px-2 py-0.5 text-[10px] font-semibold text-accent-brown">
                                            <Lock className="h-2.5 w-2.5" />
                                            {f.plan}
                                        </span>
                                    )}
                                </>
                            );
                            const clases = 'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream-100/70 focus-visible:bg-cream-100/70 focus-visible:outline-none';
                            return (
                                <li key={clave}>
                                    {libre ? (
                                        <button
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={on}
                                            onClick={() => { setElegido(guardarEsfuerzo(clave)); setAbierto(false); }}
                                            className={clases}
                                        >
                                            {fila}
                                        </button>
                                    ) : (
                                        <Link href="/precios" role="menuitem" className={clases}
                                              title={`${f.nombre} está disponible en el ${f.plan}`}>
                                            {fila}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <p className="border-t border-charcoal-900/10 bg-cream-100/50 px-4 py-2.5 text-[11.5px] leading-snug text-gray-600">
                        Se aplica cuando pide un escrito: <span className="italic text-charcoal-700">«Redacta una demanda de…»</span>. Las demás consultas no cambian.
                    </p>
                </div>
            )}
        </div>
    );
}
