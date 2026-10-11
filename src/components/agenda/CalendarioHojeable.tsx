'use client';

/* EL CALENDARIO QUE SE HOJEA (11-oct-2026). David: «calendarios hojeables».
   Es un calendario de pared: arriba el grabado del mes (los de /web/arte, uno
   por mes) con su espiral de argollas; abajo la cuadrícula. Al pasar de mes la
   hoja de encima se levanta hacia atrás (rotateX con el gozne arriba) y deja
   ver la siguiente; al regresar, la anterior baja desde arriba. Se hojea con
   las flechas, con el teclado (← →) o deslizando el dedo. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ARTE_DEL_MES, DIAS_CORTOS, MESES, aISO, hoyISO, urgencia, type Termino } from '@/lib/agenda';

interface Props {
    terminos: Termino[];
    seleccionado: string | null;
    onElegir: (iso: string) => void;
}

function celdasDelMes(anio: number, mes: number): (string | null)[] {
    const primero = new Date(anio, mes, 1);
    const desfase = (primero.getDay() + 6) % 7;            // lunes primero
    const dias = new Date(anio, mes + 1, 0).getDate();
    const fuera: (string | null)[] = Array(desfase).fill(null);
    for (let d = 1; d <= dias; d++) fuera.push(aISO(new Date(anio, mes, d)));
    while (fuera.length % 7) fuera.push(null);
    return fuera;
}

function Hoja({ anio, mes, porDia, seleccionado, onElegir }: {
    anio: number; mes: number; porDia: Map<string, Termino[]>; seleccionado: string | null; onElegir: (iso: string) => void;
}) {
    const hoy = hoyISO();
    const celdas = celdasDelMes(anio, mes);
    return (
        <div className="overflow-hidden rounded-2xl border border-charcoal-900/10 bg-[#fbf8f1] shadow-[0_18px_50px_rgba(17,17,17,0.18)]">
            <div className="relative h-36 sm:h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/web/arte/${ARTE_DEL_MES[mes]}.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1712]/85 via-[#1c1712]/25 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <p className="font-serif text-3xl capitalize leading-none text-white sm:text-4xl">{MESES[mes]}</p>
                    <p className="font-serif text-lg text-white/80">{anio}</p>
                </div>
            </div>
            <div className="grid grid-cols-7 border-b border-charcoal-900/10 bg-white/60 px-1 py-1.5 text-center text-[10.5px] uppercase tracking-wider text-gray-500">
                {DIAS_CORTOS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-charcoal-900/5 p-px">
                {celdas.map((iso, i) => {
                    if (!iso) return <div key={i} className="min-h-[3.1rem] bg-[#fbf8f1] sm:min-h-[4.6rem]" />;
                    const lista = porDia.get(iso) || [];
                    const esHoy = iso === hoy;
                    const elegido = iso === seleccionado;
                    const finde = (i % 7) >= 5;
                    return (
                        <button
                            key={iso}
                            type="button"
                            onClick={() => onElegir(iso)}
                            className={`group relative flex min-h-[3.1rem] flex-col items-stretch gap-0.5 p-1 text-left transition-colors sm:min-h-[4.6rem] sm:p-1.5
                                ${elegido ? 'bg-cream-100 ring-2 ring-inset ring-accent-brown' : finde ? 'bg-[#f6f2e8] hover:bg-cream-100' : 'bg-white hover:bg-cream-100'}`}
                            aria-label={`${iso}${lista.length ? `, ${lista.length} términos` : ''}`}
                        >
                            <span className={`grid h-6 w-6 place-items-center self-start rounded-full text-[12px] font-semibold
                                ${esHoy ? 'bg-charcoal-900 text-white' : finde ? 'text-gray-400' : 'text-charcoal-900'}`}>
                                {Number(iso.slice(8))}
                            </span>
                            {/* teléfono: puntos; pantalla mayor: rótulos */}
                            <span className="flex flex-wrap gap-0.5 sm:hidden">
                                {lista.slice(0, 4).map((t) => <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${urgencia(t).color}`} />)}
                            </span>
                            <span className="hidden flex-col gap-0.5 sm:flex">
                                {lista.slice(0, 2).map((t) => (
                                    <span key={t.id} className={`truncate rounded px-1 py-px text-[10px] font-medium text-white ${urgencia(t).color}`}>
                                        {t.titulo}
                                    </span>
                                ))}
                                {lista.length > 2 && <span className="text-[10px] text-gray-500">+{lista.length - 2} más</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function CalendarioHojeable({ terminos, seleccionado, onElegir }: Props) {
    const hoy = new Date();
    const [vista, setVista] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
    const [saliente, setSaliente] = useState<{ anio: number; mes: number; dir: 1 | -1 } | null>(null);
    const toque = useRef<number | null>(null);

    const porDia = useMemo(() => {
        const m = new Map<string, Termino[]>();
        for (const t of terminos) {
            const l = m.get(t.vencimiento) || [];
            l.push(t);
            m.set(t.vencimiento, l);
        }
        return m;
    }, [terminos]);

    const hojear = (dir: 1 | -1) => {
        setSaliente({ ...vista, dir });
        setVista(({ anio, mes }) => {
            const d = new Date(anio, mes + dir, 1);
            return { anio: d.getFullYear(), mes: d.getMonth() };
        });
        window.setTimeout(() => setSaliente(null), 650);
    };

    useEffect(() => {
        const tecla = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
            if (e.key === 'ArrowRight') hojear(1);
            if (e.key === 'ArrowLeft') hojear(-1);
        };
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    });

    const irAHoy = () => {
        const d = new Date();
        if (d.getFullYear() !== vista.anio || d.getMonth() !== vista.mes) {
            setSaliente({ ...vista, dir: 1 });
            setVista({ anio: d.getFullYear(), mes: d.getMonth() });
            window.setTimeout(() => setSaliente(null), 650);
        }
        onElegir(hoyISO());
    };

    return (
        <div className="select-none">
            <style>{`
                @keyframes hojaSeVa { from { transform: perspective(1600px) rotateX(0deg); opacity: 1; }
                                      to   { transform: perspective(1600px) rotateX(-105deg); opacity: 0; } }
                @keyframes hojaBaja { from { transform: perspective(1600px) rotateX(-105deg); opacity: 0; }
                                      to   { transform: perspective(1600px) rotateX(0deg); opacity: 1; } }
                .hoja-se-va { animation: hojaSeVa .6s cubic-bezier(.45,.05,.3,1) forwards; transform-origin: top center; }
                .hoja-baja  { animation: hojaBaja .6s cubic-bezier(.45,.05,.3,1) both; transform-origin: top center; }
                @media (prefers-reduced-motion: reduce) { .hoja-se-va, .hoja-baja { animation-duration: .01s; } }
            `}</style>
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => hojear(-1)} aria-label="Mes anterior"
                        className="grid h-9 w-9 place-items-center rounded-full border border-charcoal-900/10 bg-white hover:bg-cream-100">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => hojear(1)} aria-label="Mes siguiente"
                        className="grid h-9 w-9 place-items-center rounded-full border border-charcoal-900/10 bg-white hover:bg-cream-100">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <button type="button" onClick={irAHoy}
                    className="rounded-full border border-charcoal-900/10 bg-white px-3 py-1.5 text-[12px] font-medium hover:bg-cream-100">
                    Hoy
                </button>
            </div>
            {/* La espiral de argollas */}
            <div className="relative z-10 -mb-2 flex justify-center gap-5 sm:gap-7" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="h-4 w-2 rounded-full border-2 border-charcoal-900/60 bg-gradient-to-b from-gray-300 to-gray-500" />
                ))}
            </div>
            <div
                className="relative"
                onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    if (toque.current == null) return;
                    const dx = e.changedTouches[0].clientX - toque.current;
                    toque.current = null;
                    if (Math.abs(dx) > 50) hojear(dx < 0 ? 1 : -1);
                }}
            >
                <div key={`${vista.anio}-${vista.mes}`} className={saliente?.dir === -1 ? 'hoja-baja' : ''}>
                    <Hoja anio={vista.anio} mes={vista.mes} porDia={porDia} seleccionado={seleccionado} onElegir={onElegir} />
                </div>
                {saliente && saliente.dir === 1 && (
                    <div className="hoja-se-va pointer-events-none absolute inset-0 z-20">
                        <Hoja anio={saliente.anio} mes={saliente.mes} porDia={porDia} seleccionado={null} onElegir={() => undefined} />
                    </div>
                )}
            </div>
        </div>
    );
}
