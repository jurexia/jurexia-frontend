'use client';
/**
 * Franja del Buen Fin en /precios (13 al 17-nov-2026). Se enciende y se apaga
 * sola con las fechas de `src/lib/buen-fin.ts`; se decide en el navegador para
 * que el servidor y el cliente no pinten cosas distintas.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BUEN_FIN, buenFinVigente, cuenta, pesos } from '@/lib/buen-fin';

export default function AvisoBuenFin() {
    const [vigente, setVigente] = useState(false);
    useEffect(() => { setVigente(buenFinVigente()); }, []);
    if (!vigente) return null;

    const pro = cuenta('pro');
    return (
        <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-accent-gold bg-white px-6 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-accent-brown">Buen Fin · hasta el {BUEN_FIN.finEnLetra}</div>
                <p className="mt-1 font-serif text-xl text-charcoal-900">
                    30 % en su primer pago, ya aplicado al elegir cualquier plan.
                </p>
                <p className="mt-1 text-sm text-piedra-700">
                    Haga la cuenta: un año de Pro mes a mes son {pesos(pro.anioMesAMes)}; el anual en Buen Fin, {pesos(pro.anualBuenFin)}.
                </p>
            </div>
            <Link href="/buen-fin" className="mt-4 inline-block shrink-0 rounded-lg bg-accent-gold px-5 py-3 text-sm font-bold text-charcoal-900 hover:opacity-90 sm:mt-0">
                Ver la cuenta completa
            </Link>
        </div>
    );
}
