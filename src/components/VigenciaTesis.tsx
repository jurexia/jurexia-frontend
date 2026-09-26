'use client';
import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { avisoVigencia, enlaceReemplazo, marcaVigencia, type VigenciaTesis } from '@/lib/vigencia';

/**
 * LA TESIS QUE PERDIÓ VIGENCIA, DICHA DONDE EL ABOGADO LA MIRA (26-sep-2026).
 *
 * Dos piezas, las dos con la paleta ámbar con que la app ya marca «mira esto
 * antes de firmar» (el grupo «Citas sin ficha», los avisos del sello):
 *  - `MarcaVigencia`: la marca corta en la lista de fuentes del mensaje, con la
 *    frase entera en el `title` y para el lector de pantalla.
 *  - `FranjaVigencia`: la franja de arriba del visor, con el botón a la que la
 *    reemplaza.
 * Las tesis vigentes no traen `vigencia` y no pintan nada. La app no tiene
 * tema oscuro (ni `dark:` ni `prefers-color-scheme`): no se añade uno sólo
 * para esto, porque se encendería con el sistema sobre un panel que sigue
 * claro. Ver `@/lib/vigencia`.
 */

export function MarcaVigencia({ vigencia, className = '' }: { vigencia: VigenciaTesis; className?: string }) {
    const aviso = avisoVigencia(vigencia);
    return (
        <span
            title={aviso.frase}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-1.5 align-middle text-[10px] font-semibold leading-4 text-amber-900 ${className}`}
        >
            <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
            {marcaVigencia(vigencia)}
            <span className="sr-only">. {aviso.frase}.</span>
        </span>
    );
}

/**
 * «Esta tesis perdió vigencia: ABANDONADA por la P./J. 2/2022 (11a.), registro
 * 2024159, desde el 11 de febrero de 2022» y el botón:
 *  - con `onAbrirReemplazo` (la que la reemplaza está entre las fuentes del
 *    mensaje): la abre en el mismo visor;
 *  - sin él: enlace a su ficha en el Semanario, en otra pestaña;
 *  - sin registro de reemplazo (la dejó sin efectos una resolución, p. ej.):
 *    sólo la franja.
 */
export function FranjaVigencia({ vigencia, onAbrirReemplazo }: {
    vigencia: VigenciaTesis;
    onAbrirReemplazo?: () => void;
}) {
    const aviso = avisoVigencia(vigencia);
    const enlace = onAbrirReemplazo ? null : enlaceReemplazo(vigencia);
    const boton = 'inline-flex h-8 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-charcoal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50';
    return (
        <div role="note" aria-label="Vigencia de la tesis"
             className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
            <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug">
                        <strong className="font-semibold">{aviso.titulo}:</strong>{' '}
                        {aviso.detalle}
                    </p>
                    {onAbrirReemplazo ? (
                        <button type="button" onClick={onAbrirReemplazo} className={`mt-2.5 ${boton}`}>
                            {aviso.boton}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    ) : enlace ? (
                        <a href={enlace} target="_blank" rel="noopener noreferrer" className={`mt-2.5 ${boton}`}>
                            {aviso.boton}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only"> (ficha del Semanario, se abre en otra pestaña)</span>
                        </a>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/** Cómo se nombra una tesis en «Volver a …»: su clave, o su registro. */
export function rotuloTesis(f: { tesis_num?: string | null; registro?: string | null; ref?: string | null } | null | undefined): string {
    const clave = (f?.tesis_num || '').trim();
    if (clave) return `la ${clave}`;
    const reg = (f?.registro || '').trim();
    return reg ? `la tesis ${reg}` : 'la tesis anterior';
}

/** Tras abrir la que la reemplaza: el camino de vuelta a la que se citó. */
export function VolverATesis({ anterior, onVolver }: {
    anterior: { tesis_num?: string | null; registro?: string | null; ref?: string | null };
    onVolver: () => void;
}) {
    return (
        <button type="button" onClick={onVolver}
                className="inline-flex items-center gap-1 rounded text-[11.5px] font-medium text-charcoal-700 underline underline-offset-2 hover:text-charcoal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-700">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Volver a {rotuloTesis(anterior)}
        </button>
    );
}
