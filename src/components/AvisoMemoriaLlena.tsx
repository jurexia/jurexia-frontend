'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { NOMBRE_DE_PLAN, type MemoriaLlena } from '@/lib/memoria-llena';

/**
 * LA CONVERSACIÓN REBASÓ LA MEMORIA DEL PLAN (7-oct-2026).
 *
 * Cuando el API recibe una conversación más larga que la memoria del plan, lee
 * completo lo reciente y abrevia lo antiguo, y lo dice con el marcador
 * `MEMORIA_LLENA` (ver `@/lib/memoria-llena`). Callarlo era lo que le pasó a
 * la abogada del 7-oct: la respuesta contradecía lo trabajado al principio y
 * nada le explicaba por qué. Aquí se le dice, y se le ofrece seguir en una
 * conversación nueva que arranca con el resumen de lo trabajado; si hay un
 * plan con más memoria, también ése.
 *
 * Va arriba de la respuesta y sólo en la última que lo traiga (lo decide la
 * página del chat).
 */
export default function AvisoMemoriaLlena({ memoria, onContinuar, ocupado = false }: {
    memoria: MemoriaLlena;
    /** Pide el resumen y abre la conversación nueva; lanza un Error con el texto que se enseña. */
    onContinuar?: () => Promise<void>;
    /** La respuesta sigue llegando: todavía no hay conversación completa que resumir. */
    ocupado?: boolean;
}) {
    const [preparando, setPreparando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Si sale bien, la conversación cambia y el aviso se desmonta a media espera.
    const vivo = useRef(true);
    useEffect(() => {
        vivo.current = true;
        return () => { vivo.current = false; };
    }, []);

    const mayor = memoria.mayor ? NOMBRE_DE_PLAN[memoria.mayor] ?? null : null;

    const continuar = async () => {
        if (!onContinuar || preparando || ocupado) return;
        setPreparando(true);
        setError(null);
        try {
            await onContinuar();
        } catch (e) {
            if (vivo.current) setError(e instanceof Error && e.message ? e.message : 'No se pudo preparar el resumen. Vuelva a intentarlo.');
        } finally {
            if (vivo.current) setPreparando(false);
        }
    };

    return (
        <div className="mx-5 sm:mx-6 mt-4 rounded-xl border border-accent-gold/40 bg-accent-gold/[0.06] px-4 py-3.5" role="note">
            <p className="font-serif text-[15px] font-medium text-charcoal-900">
                Esta conversación rebasó la memoria de su plan
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-charcoal-700">
                Para contestar, Iurexia leyó completo lo más reciente y abrevió lo más antiguo de esta
                conversación, así que puede pasar por alto detalles de lo que trabajaron al principio.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {onContinuar && (
                    <button
                        type="button"
                        onClick={continuar}
                        disabled={preparando || ocupado}
                        aria-busy={preparando}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {preparando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                        {preparando ? 'Preparando el resumen de lo trabajado…' : 'Continuar en una conversación nueva'}
                    </button>
                )}
                {mayor && (
                    <Link
                        href="/precios"
                        className="inline-flex h-8 items-center rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-3 text-xs font-medium text-charcoal-900 transition-colors hover:bg-accent-gold/20"
                    >
                        Ampliar la memoria con el plan {mayor}
                    </Link>
                )}
            </div>
            {mayor && (
                <p className="mt-2 text-[11.5px] leading-snug text-charcoal-500">
                    El plan {mayor} conserva conversaciones más largas y razona con más profundidad.
                </p>
            )}
            {error && (
                <p className="mt-2 text-[12.5px] leading-snug text-red-700" role="alert">{error}</p>
            )}
        </div>
    );
}
