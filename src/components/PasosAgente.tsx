'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Scale } from 'lucide-react';
import { ESTADOS_MEXICO } from '@/lib/estados';

/* Línea de pasos del agente, al estilo del Assistant de harvey.ai: mientras
   el backend trabaja en silencio (la fase de búsqueda dura varios segundos y
   sólo emite PINGs), el usuario ve QUÉ está pasando en vez de un spinner con
   frases giratorias.

   Honestidad de cada paso:
   - Los pasos de búsqueda se derivan de los filtros que el usuario eligió
     (estado, fuero, materia, genios) — son las bases que el backend de verdad
     recorre en su fan-out por silos.
   - «N fuentes encontradas» llega del marcador real <!--SOURCES:n--> que el
     backend emite al terminar la búsqueda. No es decorado.
   - El avance entre pasos de búsqueda es temporal (el backend aún no informa
     silo por silo); la llegada de SOURCES los cierra todos con la cifra real.

   El panel vive sólo mientras no hay respuesta; el primer token lo sustituye
   por el mensaje en streaming (con su panel de razonamiento, si aplica). */

interface PasosAgenteProps {
    estado?: string;
    fuero?: string[];
    materia?: string;
    genios?: string[];
    /** null = la búsqueda sigue; número = <!--SOURCES:n--> ya llegó. */
    sourcesCount: number | null;
    retryMessage?: string;
    retryType?: string;
}

const CADENCIA_MS = 2200; // avance entre pasos de búsqueda mientras no hay señal real

function etiquetaEstado(valor?: string): string | null {
    if (!valor) return null;
    return ESTADOS_MEXICO.find((e) => e.value === valor)?.label ?? null;
}

function capitalizar(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PasosAgente({
    estado,
    fuero,
    materia,
    genios,
    sourcesCount,
    retryMessage,
    retryType,
}: PasosAgenteProps) {
    /* Los pasos de búsqueda espejan el fan-out real del backend. Sin filtro de
       fuero se consulta todo; con filtro, sólo lo elegido. */
    const pasosBusqueda = useMemo(() => {
        const sinFiltro = !fuero || fuero.length === 0;
        const pasos: string[] = [];

        const nombreEstado = etiquetaEstado(estado);
        if ((sinFiltro || fuero!.includes('estatal')) && nombreEstado) {
            pasos.push(`Consultando la legislación de ${nombreEstado}`);
        }
        if (sinFiltro || fuero!.includes('federal')) {
            pasos.push(
                materia
                    ? `Consultando la legislación federal en materia ${materia}`
                    : 'Consultando la legislación federal',
            );
        }
        if (sinFiltro || fuero!.includes('constitucional')) {
            pasos.push('Revisando el bloque de constitucionalidad');
        }
        pasos.push('Buscando jurisprudencia y precedentes');
        if (genios?.length) {
            pasos.push(`Con el genio de ${genios.map(capitalizar).join(' y ')}`);
        }
        return pasos;
    }, [estado, fuero, materia, genios]);

    /* 0 = entendiendo; 1..n = paso de búsqueda (n-1); se congela en el último
       hasta que llegue SOURCES. */
    const [avance, setAvance] = useState(0);

    useEffect(() => {
        if (sourcesCount !== null) return; // la señal real manda
        if (avance >= pasosBusqueda.length) return;
        const t = setTimeout(() => setAvance((a) => a + 1), avance === 0 ? 1100 : CADENCIA_MS);
        return () => clearTimeout(t);
    }, [avance, pasosBusqueda.length, sourcesCount]);

    /* Reintento (arranque en frío del servidor): se conserva el aviso ámbar
       de siempre — es información distinta, no un paso del agente. */
    if (retryMessage) {
        const esFrio = retryType === 'cold';
        return (
            <div className="flex gap-4 justify-start animate-slide-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="message-assistant px-4 py-4 border-l-4 border-amber-500">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-amber-900 font-semibold text-sm">
                            {esFrio ? '⏳ Despertando el servidor...' : '⏳ Servidor procesando solicitudes, reintentando...'}
                        </span>
                        <span className="text-amber-700 text-xs">{retryMessage}</span>
                        <span className="text-amber-600 text-xs mt-0.5 italic">
                            {esFrio
                                ? 'Esto sucede cuando el servidor ha estado inactivo. Solo llevará unos segundos.'
                                : 'El servidor está atendiendo varias solicitudes. Tu consulta se procesará en breve.'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const busquedaTerminada = sourcesCount !== null;

    const filas: { texto: string; estado: 'hecho' | 'activo' | 'pendiente' }[] = [
        {
            texto: 'Entendiendo la consulta',
            estado: avance > 0 || busquedaTerminada ? 'hecho' : 'activo',
        },
        ...pasosBusqueda.map((texto, i) => ({
            texto,
            estado: busquedaTerminada
                ? ('hecho' as const)
                : avance > i + 1
                    ? ('hecho' as const)
                    : avance === i + 1
                        ? ('activo' as const)
                        : ('pendiente' as const),
        })),
        busquedaTerminada
            ? {
                texto:
                    sourcesCount === 0
                        ? 'Búsqueda completada'
                        : `${sourcesCount} ${sourcesCount === 1 ? 'fuente encontrada' : 'fuentes encontradas'}`,
                estado: 'hecho' as const,
            }
            : { texto: 'Reuniendo fuentes', estado: 'pendiente' as const },
        { texto: 'Redactando la respuesta', estado: busquedaTerminada ? 'activo' : 'pendiente' },
    ];

    return (
        <div className="flex gap-4 justify-start animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
                <Scale className="w-4 h-4 text-accent-gold" />
            </div>

            <div className="message-assistant px-4 py-3.5 min-w-[260px]">
                <p className="text-[0.8125rem] font-medium text-charcoal-500 mb-2.5">
                    Trabajando en tu consulta…
                </p>

                <ol className="relative flex flex-col gap-0">
                    {filas.map((fila, i) => (
                        <li key={fila.texto} className="relative flex items-start gap-2.5 pb-2.5 last:pb-0">
                            {/* hilo vertical que une los pasos */}
                            {i < filas.length - 1 && (
                                <span
                                    aria-hidden
                                    className="absolute left-[7px] top-[18px] bottom-0 w-px bg-charcoal-900/10"
                                />
                            )}

                            <span className="relative z-10 mt-[3px] flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center">
                                {fila.estado === 'hecho' ? (
                                    <span className="flex h-[15px] w-[15px] items-center justify-center rounded-full bg-accent-gold/15">
                                        <Check className="h-2.5 w-2.5 text-accent-gold" strokeWidth={3} />
                                    </span>
                                ) : fila.estado === 'activo' ? (
                                    <Loader2 className="h-[13px] w-[13px] animate-spin text-accent-brown" />
                                ) : (
                                    <span className="h-[7px] w-[7px] rounded-full bg-charcoal-900/15" />
                                )}
                            </span>

                            <span
                                className={`text-sm leading-snug transition-colors duration-300 ${
                                    fila.estado === 'hecho'
                                        ? 'text-charcoal-700'
                                        : fila.estado === 'activo'
                                            ? 'font-medium text-charcoal-900'
                                            : 'text-charcoal-500/60'
                                }`}
                            >
                                {fila.texto}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
