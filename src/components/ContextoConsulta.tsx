'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, FolderClosed, FolderPlus, Workflow, X } from 'lucide-react';
import { COLORES as COLORES_CARPETA } from '@/components/CarpetaIcono';
import { nombreCarpeta, type Expediente } from '@/lib/expedientes';
import { flujoPorId } from '@/lib/flujos';

/* ═══ DÓNDE VIVE ESTA CONSULTA (25-sep-2026) ══════════════════════════════
   La franja sobre el compositor. Dice en qué carpeta está la consulta —y por
   tanto con qué expediente responde Iurexia— y con qué flujo arrancó.

   Antes de enviar (consulta nueva) se puede elegir la carpeta aquí mismo, como
   el selector de asunto de Astra for Law. Con la consulta ya en marcha la
   carpeta sólo se muestra: moverla se hace desde la barra, con el menú «⋯»,
   para que nadie la cambie por accidente a media conversación.
   ═════════════════════════════════════════════════════════════════════════ */

function color(tipo: string | null | undefined) {
    return (COLORES_CARPETA as Record<string, { tapaBaja: string }>)[tipo ?? '']?.tapaBaja ?? '#c9a962';
}

export default function ContextoConsulta({
    carpetas,
    carpetaId,
    flujoId,
    editable,
    onCambiarCarpeta,
    onAbrirFlujos,
    onNuevaCarpeta,
    centrado = false,
}: {
    carpetas: Expediente[] | null;
    carpetaId: string | null;
    flujoId: string | null;
    /** Consulta aún sin enviar: la carpeta se puede elegir. */
    editable: boolean;
    onCambiarCarpeta: (id: string | null) => void;
    onAbrirFlujos: () => void;
    onNuevaCarpeta: () => void;
    centrado?: boolean;
}) {
    const [abierto, setAbierto] = useState(false);
    const cajaRef = useRef<HTMLDivElement>(null);
    const carpeta = carpetas?.find((c) => c.id === carpetaId) ?? null;
    const flujo = flujoPorId(flujoId);

    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
        };
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        window.addEventListener('mousedown', fuera);
        window.addEventListener('keydown', tecla);
        return () => {
            window.removeEventListener('mousedown', fuera);
            window.removeEventListener('keydown', tecla);
        };
    }, [abierto]);

    // Nada que decir: una consulta suelta ya en marcha no lleva franja.
    if (!editable && !carpeta && !flujo) return null;

    const chip =
        'inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors';

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${centrado ? 'justify-center' : ''}`}>
            {carpetas !== null && (
                editable ? (
                    <div ref={cajaRef} className="relative max-w-full">
                        <button
                            type="button"
                            onClick={() => setAbierto((v) => !v)}
                            aria-haspopup="listbox"
                            aria-expanded={abierto}
                            className={`${chip} ${
                                carpeta
                                    ? 'border-charcoal-900/15 bg-white text-charcoal-900 shadow-sm'
                                    : 'border-charcoal-900/10 bg-white/60 text-charcoal-900/65 hover:bg-white hover:text-charcoal-900'
                            }`}
                        >
                            <FolderClosed className="h-3.5 w-3.5 flex-shrink-0" style={{ color: carpeta ? color(carpeta.tipo) : undefined }} />
                            <span className="truncate">{carpeta ? nombreCarpeta(carpeta) : 'Sin carpeta'}</span>
                            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                        </button>
                        {abierto && (
                            <div
                                role="listbox"
                                aria-label="Carpeta de la consulta"
                                className="absolute left-0 top-full z-40 mt-1.5 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-charcoal-900/10 bg-white py-1 text-left shadow-xl"
                            >
                                <p className="px-3 pb-1 pt-1.5 text-[11px] leading-snug text-charcoal-900/50">
                                    Con carpeta, Iurexia responde con su expediente a la vista y la consulta se guarda en ella.
                                </p>
                                <div className="max-h-60 overflow-y-auto">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={!carpeta}
                                        onClick={() => { onCambiarCarpeta(null); setAbierto(false); }}
                                        className="flex h-9 w-full items-center gap-2.5 px-3 text-[13px] text-charcoal-900/75 hover:bg-cream-200"
                                    >
                                        <span className="h-3.5 w-3.5" />
                                        Sin carpeta
                                        {!carpeta && <Check className="ml-auto h-3.5 w-3.5 text-[#a8863f]" />}
                                    </button>
                                    {carpetas.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            role="option"
                                            aria-selected={c.id === carpetaId}
                                            onClick={() => { onCambiarCarpeta(c.id); setAbierto(false); }}
                                            className="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13px] text-charcoal-900 hover:bg-cream-200"
                                        >
                                            <FolderClosed className="h-3.5 w-3.5 flex-shrink-0" style={{ color: color(c.tipo) }} />
                                            <span className="truncate">{nombreCarpeta(c)}</span>
                                            {c.id === carpetaId && <Check className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[#a8863f]" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="my-1 h-px bg-charcoal-900/[0.07]" />
                                <button
                                    type="button"
                                    onClick={() => { setAbierto(false); onNuevaCarpeta(); }}
                                    className="flex h-9 w-full items-center gap-2.5 px-3 text-[13px] text-charcoal-900/75 hover:bg-cream-200"
                                >
                                    <FolderPlus className="h-3.5 w-3.5" />
                                    Nueva carpeta…
                                </button>
                            </div>
                        )}
                    </div>
                ) : carpeta ? (
                    <Link
                        href={`/carpetas/${carpeta.id}`}
                        title="Abrir la carpeta: documentos y análisis"
                        className={`${chip} border-charcoal-900/10 bg-white/70 text-charcoal-900/80 hover:bg-white hover:text-charcoal-900`}
                    >
                        <FolderClosed className="h-3.5 w-3.5 flex-shrink-0" style={{ color: color(carpeta.tipo) }} />
                        <span className="truncate">
                            <span className="font-normal text-charcoal-900/50">En </span>
                            {nombreCarpeta(carpeta)}
                        </span>
                    </Link>
                ) : null
            )}

            {editable && carpeta && (
                <button
                    type="button"
                    onClick={() => onCambiarCarpeta(null)}
                    aria-label="Quitar la carpeta"
                    title="Quitar la carpeta"
                    className="grid h-8 w-8 place-items-center rounded-lg text-charcoal-900/40 transition-colors hover:bg-charcoal-900/[0.05] hover:text-charcoal-900"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}

            {flujo ? (
                <span className={`${chip} border-[#c9a962]/35 bg-[#c9a962]/10 text-[#6f5725]`} title={flujo.nombre}>
                    <Workflow className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{flujo.nombre}</span>
                </span>
            ) : (
                editable && (
                    <button
                        type="button"
                        onClick={onAbrirFlujos}
                        className={`${chip} border-charcoal-900/10 bg-white/60 text-charcoal-900/65 hover:bg-white hover:text-charcoal-900`}
                    >
                        <Workflow className="h-3.5 w-3.5 flex-shrink-0 text-[#a8863f]" />
                        Flujos de trabajo
                    </button>
                )
            )}
        </div>
    );
}
