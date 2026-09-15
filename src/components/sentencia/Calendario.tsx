'use client';

/**
 * UN CALENDARIO PROPIO, POSICIONABLE.
 *
 * David, 15-sep-2026: «me gustaría que, ya teniendo el dato de la fecha en
 * que se presentó el recurso, en lugar de llenar el calendario desplegarlo en
 * el mes y año del recurso para que el secretario sólo seleccione cuándo fue
 * notificado, pudiendo cambiar de mes».
 *
 * Un <input type="date"> nativo no se puede abrir posicionado en un mes que
 * no sea el de su propio valor: si el campo está vacío, abre en el mes de
 * hoy, y el secretario tiene que pasear el calendario del navegador desde
 * ahí hasta junio de 2025 a mano. No hay ninguna librería de fechas en el
 * proyecto (no hace falta: es un calendario, no un huso horario), así que
 * éste es de cero, con las mismas piezas que el resto del taller.
 */

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './primitivas';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoDe = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function mesDe(v?: string): [number, number] | null {
    if (!v || v.length < 7) return null;
    const [y, m] = v.split('-').map(Number);
    return y && m ? [y, m - 1] : null;
}

export default function Calendario({ valor, onCambiar, mesInicial, placeholder }: {
    /** ISO AAAA-MM-DD, o cadena vacía. */
    valor: string;
    onCambiar: (iso: string) => void;
    /** AAAA-MM: el mes en que abre la PRIMERA VEZ si `valor` sigue vacío. Por
     *  ejemplo, el mes de la fecha de presentación, para el campo de
     *  notificación. */
    mesInicial?: string;
    placeholder?: string;
}) {
    const hoy = new Date();
    const inicial = mesDe(valor) ?? mesDe(mesInicial) ?? [hoy.getFullYear(), hoy.getMonth()];
    const [abierto, setAbierto] = React.useState(false);
    const [vista, setVista] = React.useState({ y: inicial[0], m: inicial[1] });
    const cajaRef = React.useRef<HTMLDivElement>(null);

    // SI `mesInicial` LLEGA DESPUÉS —el auto de admisión tarda en leerse, o el
    // secretario lo sube tras haber abierto ya el formulario— y este campo
    // sigue vacío, la vista salta a su mes en cuanto llega.
    React.useEffect(() => {
        if (valor) return;
        const m = mesDe(mesInicial);
        if (m) setVista({ y: m[0], m: m[1] });
    }, [mesInicial, valor]);

    React.useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener('mousedown', fuera);
        return () => document.removeEventListener('mousedown', fuera);
    }, [abierto]);

    const abrir = () => {
        const m = mesDe(valor) ?? mesDe(mesInicial);
        if (m) setVista({ y: m[0], m: m[1] });
        setAbierto(true);
    };

    const primerDia = new Date(vista.y, vista.m, 1);
    const corrimiento = (primerDia.getDay() + 6) % 7;   // semana en lunes
    const diasDelMes = new Date(vista.y, vista.m + 1, 0).getDate();
    const celdas: (number | null)[] = [
        ...Array(corrimiento).fill(null),
        ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
    ];

    const legible = valor
        ? new Date(`${valor}T00:00:00`).toLocaleDateString('es-MX',
              { day: 'numeric', month: 'long', year: 'numeric' })
        : (placeholder || 'Elegir fecha');

    return (
        <div className="relative" ref={cajaRef}>
            <button type="button" onClick={() => (abierto ? setAbierto(false) : abrir())}
                    className={cn(
                        'flex w-full items-center gap-2 rounded-lg border border-white/10',
                        'bg-white/[0.04] px-3 py-2 text-left text-[14px] outline-none transition',
                        'hover:border-white/20 focus:border-accent-gold/40 focus:bg-white/[0.06]',
                        valor ? 'text-white/90' : 'text-white/45')}>
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/45" />
                <span className="flex-1 truncate first-letter:uppercase">{legible}</span>
            </button>
            {abierto && (
                <div className="absolute z-20 mt-1.5 w-72 rounded-xl border border-white/10
                                bg-charcoal-900 p-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
                    <div className="mb-2 flex items-center justify-between">
                        <button type="button" aria-label="Mes anterior"
                                onClick={() => setVista((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
                                className="rounded-lg p-1 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[13px] font-medium text-white/90 first-letter:uppercase">
                            {MESES[vista.m]} {vista.y}
                        </span>
                        <button type="button" aria-label="Mes siguiente"
                                onClick={() => setVista((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
                                className="rounded-lg p-1 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {DIAS.map((d) => (
                            <span key={d} className="text-center text-[10px] font-medium uppercase text-white/35">
                                {d}
                            </span>
                        ))}
                        {celdas.map((d, i) => {
                            const iso = d ? isoDe(vista.y, vista.m, d) : '';
                            const elegido = d !== null && iso === valor;
                            return (
                                <button key={i} type="button" disabled={d === null}
                                        onClick={() => { onCambiar(iso); setAbierto(false); }}
                                        className={cn(
                                            'aspect-square rounded-lg text-[12px] transition',
                                            d === null
                                                ? 'invisible'
                                                : elegido
                                                    ? 'bg-accent-gold font-semibold text-charcoal-900'
                                                    : 'text-white/75 hover:bg-white/[0.08]')}>
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                    {valor && (
                        <button type="button" onClick={() => { onCambiar(''); setAbierto(false); }}
                                className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-[12px]
                                           text-white/45 transition hover:text-white/75">
                            Quitar fecha
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
