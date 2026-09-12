'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   LA ENTRADA DEL TALLER — primero se elige el camino, después se trabaja
   ═══════════════════════════════════════════════════════════════════════════
   David, 12-sep-2026: «quizá dos botones iniciales muy profesionales y
   elegantes (emergiendo en fondo negro con letras resplandecientes blancas
   animadas al inicio) para ir con archivos, o para ir con SISE. Al entrar a
   uno desplegar de manera profesional y paso por paso lo que el secretario
   debe ingresar… El objetivo es una interfaz más moderna e intuitiva, que
   explique al secretario el porqué de cada paso (letras pequeñas)».

   EL PROBLEMA QUE VIENE A CERRAR, medido en la pantalla: al entrar había
   VEINTIDÓS botones visibles a la vez. El manual de instalación de SISE
   ocupaba la esquina superior derecha —el sitio de más peso— aunque sea el
   camino secundario; el auto de admisión se ofrecía en un recuadro de puntos
   en la columna izquierda; y la rejilla de tipos, los dos soltadores de PDF y
   el recorrido competían por la mirada. Todo estaba disponible y nada estaba
   propuesto: el secretario tenía que deducir por dónde se empieza.

   Aquí se elige primero —dos caminos, no veintidós— y cada elección DESPLIEGA
   lo suyo. Debajo de cada botón, en letra pequeña, el porqué: qué hace ese
   camino y qué le ahorra. Nada se esconde: lo que no está en pantalla está a
   un clic y con su nombre escrito. */

import React from 'react';
import { FileText, Download, ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { cn } from './primitivas';
import type { AsuntoEnCurso } from './api';

export type ViaEntrada = 'archivos' | 'sise';
export type PasoArchivos = 'admision' | 'formulario';

/* Un botón grande de los que emergen del fondo negro. El resplandor va en el
   rótulo, no en el marco: una caja que brilla entera parece un anuncio. */
function Camino({
    titulo, que, porque, icono: Icono, onClick, retraso = 0, insignia,
}: {
    titulo: string;
    que: string;
    porque: string;
    icono: React.ElementType;
    onClick: () => void;
    retraso?: number;
    insignia?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{ animationDelay: `${retraso}ms` }}
            className={cn(
                'entrada-tarjeta group relative flex-1 overflow-hidden rounded-3xl border',
                'border-white/[0.09] bg-black/40 p-6 text-left backdrop-blur-xl',
                'transition-all duration-300',
                'hover:border-accent-gold/45 hover:bg-black/30',
                'hover:shadow-[0_0_60px_-24px_rgba(201,169,98,0.5)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold/60',
            )}
        >
            <span className="flex items-center gap-2.5">
                <Icono className="h-4 w-4 shrink-0 text-white/70 transition-colors
                                  duration-300 group-hover:text-accent-gold" />
                <span className="entrada-titulo text-[16px] font-medium tracking-[0.01em] text-white"
                      style={{ animationDelay: `${retraso + 120}ms` }}>
                    {titulo}
                </span>
                {insignia && (
                    <span className="rounded-md border border-accent-gold/30 bg-accent-gold/10
                                     px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-gold/90">
                        {insignia}
                    </span>
                )}
            </span>
            <span className="mt-2.5 block text-[13px] leading-relaxed text-white/65">{que}</span>
            {/* EL PORQUÉ, EN LETRA PEQUEÑA. Es lo que David pidió y es lo que
                convierte un botón en una decisión informada. */}
            <span className="mt-2 block text-[11.5px] leading-relaxed text-white/35">{porque}</span>
        </button>
    );
}

/* Un paso dentro de un camino: rótulo, porqué y el control que toca. */
export function Paso({
    n, titulo, porque, hecho, children,
}: {
    n: number;
    titulo: string;
    porque?: string;
    hecho?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex gap-3">
            <span className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                'border text-[10px] font-semibold',
                hecho ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                      : 'border-accent-gold/35 bg-accent-gold/10 text-accent-gold/90')}>
                {hecho ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-white/80">{titulo}</p>
                {porque && (
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/35">{porque}</p>
                )}
                {children && <div className="mt-2">{children}</div>}
            </div>
        </div>
    );
}

/* ═══ EL ASUNTO QUE SE QUEDÓ A MEDIAS ═══
   Visto recargando la pantalla en mitad del 93/2026: los dos PDF leídos, los
   resúmenes, los problemas y el acervo buscado —cuatro minutos de motor— y el
   taller volvía a la casilla de salida con el número en blanco. No se había
   perdido nada: `taller_sesiones` guarda la sesión entera desde el primer
   adelanto. Lo que faltaba era preguntarla.

   Va DEBAJO de los dos caminos, no encima: quien entra a empezar un asunto
   nuevo es la mayoría, y una lista de expedientes antiguos en el sitio de más
   peso convertiría la entrada en un archivador. */
function Reanudar({ asuntos, onAbrir }: {
    asuntos: AsuntoEnCurso[];
    onAbrir: (numero: string) => void;
}) {
    if (!asuntos.length) return null;
    return (
        <div className="mt-5 border-t border-white/[0.06] px-4 pb-4 pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-white/30">
                O vuelve a uno tuyo
            </p>
            <div className="flex flex-col gap-1.5">
                {asuntos.map((a) => (
                    <button key={a.numero} type="button" onClick={() => onAbrir(a.numero)}
                            className="group flex items-center gap-3 rounded-xl border
                                       border-white/[0.07] bg-white/[0.02] px-3 py-2 text-left
                                       transition-colors hover:border-accent-gold/35
                                       hover:bg-white/[0.045]">
                        <RotateCcw className="h-3.5 w-3.5 shrink-0 text-white/30
                                              transition-colors group-hover:text-accent-gold/70" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium text-white/80">
                                {a.numero}
                                <span className="ml-2 font-normal text-white/35">
                                    {a.tipoAsunto.replace(/_/g, ' ')}
                                </span>
                            </span>
                            {a.quejoso && (
                                <span className="block truncate text-[11px] text-white/35">
                                    {a.quejoso}
                                </span>
                            )}
                        </span>
                        {/* ═══ TERMINADO O A MEDIAS ═══
                            David: «hay que tener un historial de proyectos
                            elaborados». No hace falta una segunda lista: el
                            asunto es el mismo y lo que cambia es hasta dónde
                            llegó. El que ya tiene sentencia escrita lo dice, con
                            sus palabras y su fecha, y al abrirlo se aterriza en
                            su pantalla terminada en vez de en el adelanto. */}
                        {a.proyecto ? (
                            <span className="shrink-0 text-right">
                                <span className="block text-[11px] font-medium text-accent-gold/85">
                                    proyecto listo
                                </span>
                                <span className="block text-[10.5px] tabular-nums text-white/30">
                                    {a.proyecto.palabras.toLocaleString('es-MX')} palabras
                                    {a.proyecto.generadoEn
                                        ? ' · ' + new Date(a.proyecto.generadoEn)
                                            .toLocaleDateString('es-MX',
                                                { day: 'numeric', month: 'short' })
                                        : ''}
                                </span>
                            </span>
                        ) : (
                            <span className="shrink-0 text-[11px] text-white/30">
                                {a.problemas > 0
                                    ? `${a.problemas} planteamiento${a.problemas === 1 ? '' : 's'}`
                                    : 'sin adelanto'}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                Los que ya tienen proyecto se abren en su pantalla terminada, con sus
                avisos y su descarga, y desde ahí puedes cambiar el sentido y volver a
                generarlo. En los demás se recuperan la ficha, los resúmenes y los
                planteamientos; la búsqueda en el acervo se vuelve a hacer.
            </p>
        </div>
    );
}

export default function EntradaTaller({
    via, onVia, pasoArchivos, onPasoArchivos, hayDocumentos, hayFicha,
    enCurso = [], onReanudar,
}: {
    via: ViaEntrada | null;
    onVia: (v: ViaEntrada | null) => void;
    pasoArchivos: PasoArchivos | null;
    onPasoArchivos: (p: PasoArchivos | null) => void;
    hayDocumentos?: boolean;
    hayFicha?: boolean;
    enCurso?: AsuntoEnCurso[];
    onReanudar?: (numero: string) => void;
}) {
    /* ── Nada elegido: los dos caminos ──────────────────────────────────── */
    if (!via) {
        return (
            /* Centrada y con un ancho de lectura: estirada a mil quinientos
               píxeles, dos tarjetas se convierten en dos pancartas. */
            <div className="entrada-fondo mx-auto w-full max-w-3xl rounded-3xl p-1 pt-6 sm:p-2 sm:pt-10">
                <p className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-[0.14em] text-white/30">
                    Por dónde empezamos
                </p>
                <div className="flex flex-col gap-3 p-2 sm:flex-row">
                    <Camino
                        titulo="Con mis archivos"
                        icono={FileText}
                        retraso={0}
                        que="Subes el acto reclamado y el escrito de la parte, y el taller lee el resto."
                        porque="Es el camino de siempre y no necesita instalar nada. Si además tienes el auto de admisión, la ficha se rellena sola."
                        onClick={() => onVia('archivos')}
                    />
                    <Camino
                        titulo="Desde SISE"
                        insignia="beta"
                        icono={Download}
                        retraso={110}
                        que="El complemento trae las constancias desde el Expediente Electrónico."
                        porque="Se instala una vez, en Chrome y en tu computadora. Después no hay que teclear el número, el tipo ni la ponencia: salen de los autos."
                        onClick={() => onVia('sise')}
                    />
                </div>
                {onReanudar && (
                    <Reanudar asuntos={enCurso} onAbrir={onReanudar} />
                )}
            </div>
        );
    }

    /* ── Camino elegido: la cabecera con la vuelta ──────────────────────── */
    const volver = (
        <button type="button"
                onClick={() => { onVia(null); onPasoArchivos(null); }}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-white/40
                           transition-colors hover:text-white/70">
            <ArrowLeft className="h-3 w-3" />
            cambiar de camino
        </button>
    );

    if (via === 'sise') {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl border
                            border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-white/75">
                    <Download className="h-3.5 w-3.5 text-accent-gold/70" />
                    Desde SISE
                    <span className="rounded-md border border-accent-gold/30 bg-accent-gold/10
                                     px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-gold/90">
                        beta
                    </span>
                </span>
                {volver}
            </div>
        );
    }

    /* ── Camino de archivos: primero cómo se llena la ficha ─────────────── */
    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-white/75">
                    <FileText className="h-3.5 w-3.5 text-accent-gold/70" />
                    Con mis archivos
                </span>
                {volver}
            </div>

            <div className="space-y-3.5">
                <Paso n={1} titulo="La ficha del asunto" hecho={!!hayFicha}
                      porque="Partes, fechas y tipo. De aquí salen la carátula, el cómputo del plazo y el vocabulario de todo el proyecto.">
                    {!pasoArchivos && (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => onPasoArchivos('admision')}
                                    className="rounded-xl border border-white/[0.09] bg-white/[0.02] p-3
                                               text-left transition-colors hover:border-accent-gold/35
                                               hover:bg-white/[0.04]">
                                <span className="block text-[12.5px] font-medium text-white/85">
                                    Tengo el auto de admisión
                                </span>
                                <span className="mt-1 block text-[11.5px] leading-snug text-white/40">
                                    Lo subes y salen solos el expediente, el tipo, el tribunal, la
                                    responsable y el tercero. Son ocho campos que no tecleas.
                                </span>
                            </button>
                            <button type="button" onClick={() => onPasoArchivos('formulario')}
                                    className="rounded-xl border border-white/[0.09] bg-white/[0.02] p-3
                                               text-left transition-colors hover:border-accent-gold/35
                                               hover:bg-white/[0.04]">
                                <span className="block text-[12.5px] font-medium text-white/85">
                                    Prefiero llenar la ficha
                                </span>
                                <span className="mt-1 block text-[11.5px] leading-snug text-white/40">
                                    A mano, como siempre. También sirve si el auto no está a la
                                    mano o si prefieres comprobar cada dato tú.
                                </span>
                            </button>
                        </div>
                    )}
                    {pasoArchivos && (
                        <button type="button" onClick={() => onPasoArchivos(null)}
                                className="text-[11.5px] text-white/40 transition-colors hover:text-white/70">
                            {pasoArchivos === 'admision'
                                ? 'estás subiendo el auto de admisión · cambiar'
                                : 'estás llenando la ficha a mano · cambiar'}
                        </button>
                    )}
                </Paso>

                <Paso n={2} titulo="Los dos documentos del asunto" hecho={!!hayDocumentos}
                      porque="El acto reclamado y el escrito de la parte. Del primero sale lo que resolvió la responsable; del segundo, lo que se combate. El contraste de los dos es de donde nacen los problemas jurídicos." />

                <Paso n={3} titulo="Generar el adelanto"
                      porque="Con eso el taller lee el expediente y te devuelve el asunto entendido: antecedentes, qué resolvió, qué se alega y los planteamientos. Todavía no decide nada." />
            </div>
        </div>
    );
}
