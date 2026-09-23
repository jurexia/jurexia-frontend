'use client';

import React from 'react';
import { AlertTriangle, ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { cn } from './primitivas';

/* ═══════════════════════════════════════════════════════════════════════════
   VOLVER ATRÁS CUESTA, Y SE DICE ANTES
   ═══════════════════════════════════════════════════════════════════════════
   David (22-sep-2026): «no es posible salir de un proyecto y volver a la
   ventana de historial (…) el usuario no puede corregir ni regresar a la etapa
   de adelanto con el click. Deberíamos dar libertad de regresar a los pasos y
   volver a generar. Todo esto con el aviso de que si regresa consumirá un
   nuevo proyecto de su contador (que acepte si desea continuar) porque volverá
   a consumir procesamiento LLM».

   El espinazo ya enseñaba los cuatro pasos y dejaba pulsar los hechos, pero
   `onIr` sólo hacía scroll: el estado no se movía. Ahora sí se mueve, y por eso
   hace falta esta puerta: lo que se pierde al volver y lo que va a costar se
   leen ANTES de pulsar, no después.

   QUÉ CUESTA CADA COSA, medido en el pipeline y dicho sin adornos:
     · SALIR al historial no consume nada. El asunto queda guardado en el
       servidor y se reanuda desde «Asuntos en curso».
     · VOLVER a la ficha o al adelanto obliga a releer el expediente —dos PDF,
       varios minutos de proceso— pero NO toca el contador: el contador sólo
       se mueve al GENERAR el proyecto.
     · GENERAR otra vez sí consume uno del contador, se vuelva desde donde se
       vuelva. Por eso se dice en los tres casos.
*/

export type DestinoVuelta = 'historial' | 1 | 2 | 3;

type Ficha = {
    titulo: string;
    verbo: string;
    conserva: string[];
    pierde: string[];
    cuesta: string;
};

const FICHAS: Record<string, Ficha> = {
    historial: {
        titulo: 'Salir a tus asuntos',
        verbo: 'Salir al historial',
        conserva: [
            'El asunto queda guardado en el servidor y aparece en «Asuntos en curso».',
            'Los proyectos que ya generaste se siguen descargando desde ahí.',
        ],
        pierde: ['Esta pantalla se vacía: al volver al asunto se reanuda desde el adelanto.'],
        cuesta: 'Salir no consume nada de tu contador.',
    },
    '1': {
        titulo: 'Volver a la ficha del asunto',
        verbo: 'Volver a la ficha',
        conserva: [
            'Los documentos que subiste y todo lo que ya tecleaste en la ficha.',
            'El proyecto de esta vuelta, descargable desde el historial.',
        ],
        pierde: [
            'La consulta del acervo, la propuesta y tus calificaciones de esta vuelta.',
            'Para que un cambio de la ficha entre en el cómputo y en el proyecto hay que '
            + 'generar el adelanto otra vez: el expediente se vuelve a leer entero '
            + '(varios minutos de proceso).',
        ],
        cuesta: 'Releer el expediente no toca tu contador; generar el proyecto otra vez, sí: uno.',
    },
    '2': {
        titulo: 'Volver al adelanto',
        verbo: 'Volver al adelanto',
        conserva: [
            'La ficha y la lectura del expediente que ya se hizo.',
            'El proyecto de esta vuelta, descargable desde el historial.',
        ],
        pierde: ['La consulta del acervo, la propuesta y tus calificaciones de esta vuelta.'],
        cuesta: 'Volver aquí no toca tu contador; generar el proyecto otra vez, sí: uno.',
    },
    '3': {
        titulo: 'Volver a decidir el sentido',
        verbo: 'Volver a decidir',
        conserva: [
            'La lectura del expediente y el acervo ya consultado —eso no se repite—.',
            'El proyecto de esta vuelta, descargable desde el historial.',
        ],
        pierde: ['Tus calificaciones y las razones escritas para el sentido anterior.'],
        cuesta: 'Al generar de nuevo se consume un proyecto de tu contador.',
    },
};

export default function ConfirmarVolver({
    destino, restantes, sinLimite, corriendo, onAceptar, onCancelar,
}: {
    /** A dónde quiere volver; null = el diálogo no se enseña. */
    destino: DestinoVuelta | null;
    /** Cuántos proyectos le quedan. undefined = no se pudo leer. */
    restantes?: number;
    sinLimite?: boolean;
    /** Hay trabajo en marcha ahora mismo: volver lo abandona. */
    corriendo?: boolean;
    onAceptar: () => void;
    onCancelar: () => void;
}) {
    if (destino === null) return null;
    const f = FICHAS[String(destino)];
    if (!f) return null;
    const esSalir = destino === 'historial';
    const sinProyectos = !sinLimite && typeof restantes === 'number' && restantes <= 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
             role="dialog" aria-modal="true" aria-labelledby="volver-titulo"
             onClick={onCancelar}>
            <div className="w-full max-w-[520px] rounded-2xl border border-white/12 bg-charcoal-900 p-5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] sm:p-6"
                 onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3">
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        esSalir ? 'border-white/15 bg-white/[0.05] text-white/70'
                                : 'border-accent-gold/35 bg-accent-gold/[0.08] text-accent-gold')}>
                        {esSalir ? <LogOut className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                        <h2 id="volver-titulo" className="text-[17px] font-medium text-white">{f.titulo}</h2>
                        <p className="mt-0.5 text-[13px] text-white/50">
                            {esSalir ? 'Puedes reanudarlo cuando quieras.'
                                     : 'Puedes corregir y volver a generar las veces que haga falta.'}
                        </p>
                    </div>
                </div>

                {corriendo && (
                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-accent-gold/35 bg-accent-gold/[0.07] px-3 py-2.5 text-[13px] leading-relaxed text-accent-gold/90">
                        <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                        <span>Hay trabajo en marcha. Si vuelves ahora, lo que esté a medias se
                              abandona —el servidor lo termina y lo guarda, pero esta pantalla
                              deja de seguirlo—.</span>
                    </p>
                )}

                <dl className="mt-4 space-y-3">
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-300/80">Se conserva</dt>
                        <dd className="mt-1 space-y-1">
                            {f.conserva.map((x) => (
                                <p key={x} className="text-[13px] leading-relaxed text-white/70">· {x}</p>
                            ))}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Se pierde</dt>
                        <dd className="mt-1 space-y-1">
                            {f.pierde.map((x) => (
                                <p key={x} className="text-[13px] leading-relaxed text-white/70">· {x}</p>
                            ))}
                        </dd>
                    </div>
                </dl>

                <p className={cn('mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed',
                    esSalir ? 'border-white/10 text-white/60'
                            : 'border-accent-gold/30 bg-accent-gold/[0.05] text-accent-gold/90')}>
                    {!esSalir && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <span>
                        {f.cuesta}
                        {!sinLimite && typeof restantes === 'number' && (
                            <span className="text-white/55">
                                {' '}Te {restantes === 1 ? 'queda' : 'quedan'} <span className="font-medium text-white/85 tabular-nums">{restantes}</span>
                                {restantes === 1 ? ' proyecto' : ' proyectos'}.
                            </span>
                        )}
                    </span>
                </p>

                {sinProyectos && !esSalir && (
                    <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                        Sin proyectos disponibles puedes volver y corregir, pero no podrás generar
                        hasta recargar.
                    </p>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCancelar}
                            className="h-10 rounded-xl border border-white/12 px-4 text-[14px] font-medium text-white/70 transition hover:border-white/25 hover:text-white">
                        Quedarme aquí
                    </button>
                    <button type="button" onClick={onAceptar} autoFocus
                            className={cn('h-10 rounded-xl px-4 text-[14px] font-semibold transition',
                                esSalir
                                    ? 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]'
                                    : 'bg-gradient-to-b from-[#e3c98a] to-accent-gold text-charcoal-900 hover:brightness-105')}>
                        {f.verbo}
                    </button>
                </div>
            </div>
        </div>
    );
}
