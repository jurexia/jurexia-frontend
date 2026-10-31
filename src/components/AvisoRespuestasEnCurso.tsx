'use client';

import { Loader2 } from 'lucide-react';

/**
 * LO QUE EL SERVIDOR SIGUE ESCRIBIENDO, A LA VISTA (30-oct-2026).
 *
 * Desde ese día la API termina lo pedido aunque la pantalla se desconecte
 * (respuesta_guardada.py). Tras una recarga —el teléfono que vuelve de
 * WhatsApp, el navegador que cerró la pestaña— la página no sabe que pidió
 * algo, y el abogado lo volvía a pedir: Rubén Ávila pagó dos veces el mismo
 * análisis el 29-oct. Este aviso le dice que viene en camino; desaparece solo
 * cuando la respuesta entra en su conversación. No se guarda en ningún lado.
 */
export default function AvisoRespuestasEnCurso({ cuantas }: { cuantas: number }) {
    if (cuantas <= 0) return null;
    const varias = cuantas > 1;
    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed left-1/2 top-16 z-30 w-[min(92vw,34rem)] -translate-x-1/2"
        >
            <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-charcoal-900/10 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-charcoal-500" aria-hidden />
                <p className="text-[13px] leading-relaxed text-charcoal-700">
                    {varias
                        ? `Iurexia está terminando ${cuantas} respuestas que pidió. Aparecerán en su conversación en cuanto terminen; no hace falta volver a pedirlas.`
                        : 'Iurexia está terminando una respuesta que pidió. Aparecerá en su conversación en cuanto termine; no hace falta volver a pedirla.'}
                </p>
            </div>
        </div>
    );
}
