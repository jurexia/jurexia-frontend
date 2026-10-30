'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

/**
 * EL DOCUMENTO QUE LEE EL PLAN GRATUITO INVITA A PRO (25-oct-2026, David).
 *
 * El gratuito ya leía documentos de hasta 20 hojas —409 en octubre, de 219
 * usuarios—, pero nada le decía qué ganaba pagando, y un PDF de más hojas
 * acababa en un error sin salida. Ahora el documento largo se lee en muestra
 * (las primeras hojas; ver `lectura_de_muestra` en la API) y, tras cada
 * documento, esta tarjeta dice cuánto le queda y qué abre Pro.
 *
 * Y TAMBIÉN LOS PLANES DE PAGO (29-oct-2026, David). Un documento con más
 * hojas de las que lee el plan se rechazaba con un 413: 53 veces a 32 usuarios
 * de pago en 30 días, tres seguidas a un abogado recién pasado a Pro. Ahora se
 * leen las primeras N y esta tarjeta lo dice, ofrece las hojas siguientes con
 * un botón (el mismo archivo, sin partir el PDF) y, si existe, el plan que lo
 * lee entero.
 *
 * Va bajo la última respuesta y NO se guarda en la conversación: es de la
 * pantalla, no del expediente. Desaparece al mandar la siguiente consulta.
 */
export interface DatosAvisoDocumentoGratis {
    /** Consultas que le quedan este mes; null si no se pudo leer la cuenta. */
    restantes: number | null;
    limite: number;
    /** Si el documento se leyó en muestra: hojas leídas, hojas totales y el plan que lo lee entero. */
    leidas?: number;
    total?: number;
    plan?: string | null;
    /** Desde el 29-oct: el plan del abogado («gratuito», «Pro»…), su tope y el tramo leído. */
    planActual?: string;
    tope?: number;
    desde?: number;
    hasta?: number;
    /** La hoja con la que seguiría; null o ausente si ya se leyó hasta el final. */
    siguiente?: number | null;
}

const TOPE_DE: Record<string, number> = { 'Básico': 50, Pro: 100, Platinum: 600 };

export default function AvisoDocumentoGratis({ datos, onCerrar, onSiguientes }: {
    datos: DatosAvisoDocumentoGratis;
    onCerrar: () => void;
    /** Analizar las hojas siguientes del mismo archivo; sin él no hay botón. */
    onSiguientes?: () => void;
}) {
    const { restantes, limite, leidas, total, plan, planActual, tope, desde, hasta, siguiente } = datos;
    const muestra = Boolean(leidas && total && total > leidas);
    const gratuito = !planActual || planActual === 'gratuito';
    const planDestino = plan || 'Pro';
    const finSiguiente = siguiente && total ? Math.min(total, siguiente + (tope || leidas || 0) - 1) : null;
    const botonSiguientes = siguiente && onSiguientes
        ? (finSiguiente && finSiguiente > siguiente ? `Analizar las hojas ${siguiente} a ${finSiguiente}` : `Analizar la hoja ${siguiente}`)
        : null;

    const consultas = restantes === null
        ? null
        : gratuito
            ? (restantes <= 0
                ? `Ya usó sus ${limite} consultas gratis de este mes.`
                : `Le ${restantes === 1 ? 'queda' : 'quedan'} ${restantes} de sus ${limite} consultas gratis.`)
            : `Analizar las hojas siguientes usa una consulta; le ${restantes === 1 ? 'queda' : 'quedan'} ${restantes} este mes.`;

    let titulo: string;
    let cuerpo: string;
    if (muestra && !gratuito) {
        titulo = desde && desde > 1
            ? `Leímos las hojas ${desde} a ${hasta} de las ${total}.`
            : `Leímos las primeras ${leidas} de las ${total} hojas.`;
        cuerpo = `Su plan ${planActual} lee hasta ${tope || leidas} hojas por documento.`
            + (siguiente ? ' Puede analizar las siguientes con el mismo archivo, sin partirlo.' : '')
            + (plan && TOPE_DE[plan] ? ` Con ${plan} se leen hasta ${TOPE_DE[plan]} de una vez.` : '');
    } else if (muestra) {
        titulo = `Leímos ${leidas} de las ${total} hojas.`;
        cuerpo = plan === 'Platinum'
            ? 'Con Platinum, Iurexia lee el documento completo (hasta 600 hojas).'
            : plan
                ? 'Con Pro, Iurexia lee el documento completo (hasta 100 hojas) y 140 consultas al mes.'
                : 'Ningún plan lo lee de una sola vez: divídalo en partes. Con Platinum se leen hasta 600 hojas por documento.';
    } else {
        titulo = consultas || 'Así trabaja Iurexia con sus documentos.';
        cuerpo = 'Con Pro: 140 consultas al mes y documentos de hasta 100 hojas.';
    }

    return (
        <div className="mx-5 sm:mx-6 mt-4 rounded-xl border border-accent-gold/40 bg-accent-gold/[0.06] px-4 py-3.5" role="note">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] font-medium text-charcoal-900">{titulo}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-charcoal-700">{cuerpo}</p>
                    {muestra && consultas && (
                        <p className="mt-1 text-[12px] leading-snug text-charcoal-500">{consultas}</p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar el aviso"
                    className="-mr-1 -mt-1 rounded-md p-1 text-charcoal-400 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-700"
                >
                    <X className="h-4 w-4" aria-hidden />
                </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {botonSiguientes && (
                    <button
                        type="button"
                        onClick={onSiguientes}
                        className="inline-flex h-8 items-center rounded-lg bg-charcoal-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-charcoal-800"
                    >
                        {botonSiguientes}
                    </button>
                )}
                {(gratuito || plan) && (
                    <Link
                        href="/precios"
                        className={botonSiguientes
                            ? 'inline-flex h-8 items-center rounded-lg border border-charcoal-900/20 px-3 text-xs font-semibold text-charcoal-900 transition-colors hover:bg-charcoal-900/5'
                            : 'inline-flex h-8 items-center rounded-lg bg-charcoal-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-charcoal-800'}
                    >
                        Ver el plan {muestra ? planDestino : 'Pro'} →
                    </Link>
                )}
            </div>
        </div>
    );
}
