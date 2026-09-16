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
    titulo, que, porque, icono: Icono, onClick, retraso = 0, insignia, cerrado,
}: {
    titulo: string;
    que: string;
    porque: string;
    icono: React.ElementType;
    onClick: () => void;
    retraso?: number;
    insignia?: string;
    /** Cerrado: se ve, se lee y no se pulsa. */
    cerrado?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={cerrado ? undefined : onClick}
            disabled={cerrado}
            aria-disabled={cerrado}
            style={{ animationDelay: `${retraso}ms` }}
            /* ═══ UN CAMINO CERRADO SE ENSEÑA, NO SE ESCONDE ═══
               David: «inhabilita la opción de SISE (…) deja el mensaje de
               próximamente». Esconderlo dejaría la pantalla con una sola
               tarjeta y sin explicación; enseñarlo apagado dice qué hay y que
               viene. La puerta de verdad está en el servidor: `puede_sise`. */
            className={cn(
                'entrada-tarjeta group relative flex-1 overflow-hidden rounded-2xl border',
                'p-6 text-left backdrop-blur-xl transition-all duration-300',
                cerrado
                    ? 'cursor-not-allowed border-white/[0.07] bg-black/50 opacity-60'
                    : 'border-white/10 bg-black/40 hover:border-accent-gold/45 '
                      + 'hover:bg-black/30 hover:shadow-[0_0_60px_-24px_rgba(201,169,98,0.5)] '
                      + 'focus-visible:outline focus-visible:outline-2 '
                      + 'focus-visible:outline-accent-gold/60',
            )}
        >
            <span className="flex items-center gap-2.5">
                <Icono className="h-4 w-4 shrink-0 text-white/75 transition-colors
                                  duration-300 group-hover:text-accent-gold" />
                <span className="entrada-titulo text-[16px] font-medium tracking-[0.01em] text-white"
                      style={{ animationDelay: `${retraso + 120}ms` }}>
                    {titulo}
                </span>
                {insignia && (
                    <span className="rounded-lg border border-accent-gold/30 bg-accent-gold/10
                                     px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-gold/90">
                        {insignia}
                    </span>
                )}
            </span>
            <span className="mt-2.5 block text-[14px] leading-relaxed text-white/60">{que}</span>
            {/* EL PORQUÉ, EN LETRA PEQUEÑA. Es lo que David pidió y es lo que
                convierte un botón en una decisión informada. */}
            <span className="mt-2 block text-[12px] leading-relaxed text-white/45">{porque}</span>
        </button>
    );
}

/* Un paso dentro de un camino: rótulo, porqué y el control que toca. */
export function Paso({
    n, titulo, porque, hecho, activo, children,
}: {
    n: number;
    titulo: string;
    porque?: string;
    hecho?: boolean;
    /** El paso en el que está ahora mismo. Los tres se veían IGUAL —mismo
     *  tamaño, mismo color, mismo círculo— y el secretario no tenía forma de
     *  saber en cuál iba: la lista se leía como tres instrucciones sueltas en
     *  vez de como un camino con una posición. */
    activo?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className={cn(
            'flex gap-3.5 rounded-2xl p-3 transition-colors duration-300',
            /* EL PASO DE AHORA SE VE. Un borde tenue y algo de fondo bastan:
               no hace falta un color nuevo ni una animación. */
            activo && 'bg-accent-gold/[0.04] respira',
        )}>
            <span className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                'border text-[12px] font-semibold transition-colors',
                hecho ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                      : activo ? 'border-accent-gold/60 bg-accent-gold/15 text-accent-gold'
                               : 'border-white/20 bg-white/[0.04] text-white/45')}>
                {hecho ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </span>
            <div className="min-w-0 flex-1">
                <p className={cn(
                    'text-[16px] font-medium tracking-[0.01em]',
                    hecho ? 'text-white/60' : activo ? 'text-white' : 'text-white/60',
                )}>
                    {titulo}
                </p>
                {porque && (
                    <p className="mt-1 text-[12px] leading-relaxed text-white/45">{porque}</p>
                )}
                {children && <div className="mt-3">{children}</div>}
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
function Reanudar({ asuntos, onAbrir, onDescargar }: {
    asuntos: AsuntoEnCurso[];
    onAbrir: (numero: string) => void;
    /** Abrir el .docx de una versión concreta del mismo expediente. */
    onDescargar?: (numero: string, version: number) => void;
}) {
    /* QUÉ EXPEDIENTE TIENE LA LISTA ABIERTA. Uno solo: dos listas desplegadas
       a la vez devuelven el archivador que esta pantalla vino a quitar. */
    const [abierto, setAbierto] = React.useState('');
    if (!asuntos.length) return null;
    return (
        <div className="mt-5 border-t border-white/[0.07] px-4 pb-4 pt-4">
            <p className="mb-2 text-[12px] uppercase tracking-[0.14em] text-white/45">
                O vuelve a uno tuyo
            </p>
            <div className="flex flex-col gap-1.5">
                {asuntos.map((a) => (
                    <div key={a.numero}
                         className="rounded-xl border border-white/[0.07] bg-white/[0.02]
                                    transition-colors focus-within:border-accent-gold/35
                                    hover:border-accent-gold/35">
                    <button type="button" onClick={() => onAbrir(a.numero)}
                            className="group flex w-full items-center gap-3 rounded-xl
                                       px-3 py-2 text-left transition-colors
                                       hover:bg-white/[0.045]">
                        <RotateCcw className="h-3.5 w-3.5 shrink-0 text-white/45
                                              transition-colors group-hover:text-accent-gold/70" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-white/75">
                                {a.numero}
                                <span className="ml-2 font-normal text-white/45">
                                    {a.tipoAsunto.replace(/_/g, ' ')}
                                </span>
                            </span>
                            {a.quejoso && (
                                <span className="block truncate text-[12px] text-white/45">
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
                                <span className="block text-[12px] font-medium text-accent-gold/85">
                                    {/* VARIOS PROYECTOS DEL MISMO EXPEDIENTE, en la
                                        misma fila. David, 16-sep-2026: «si un
                                        expediente tiene más de un proyecto,
                                        guardarlos en la misma pestaña de
                                        historial». Son las veces que cambió de
                                        sentido y volvió a generar; no son asuntos
                                        distintos y no merecen filas distintas. */}
                                    {a.versiones && a.versiones.length > 1
                                        ? `${a.versiones.length} proyectos`
                                        : 'proyecto listo'}
                                </span>
                                <span className="block text-[12px] tabular-nums text-white/45">
                                    {a.proyecto.parcial
                                        ? 'sin detalle guardado'
                                        : `${a.proyecto.palabras.toLocaleString('es-MX')} palabras`}
                                    {a.proyecto.generadoEn
                                        ? ' · ' + new Date(a.proyecto.generadoEn)
                                            .toLocaleDateString('es-MX',
                                                { day: 'numeric', month: 'short' })
                                        : ''}
                                </span>
                            </span>
                        ) : (
                            <span className="shrink-0 text-[12px] text-white/45">
                                {a.problemas > 0
                                    ? `${a.problemas} planteamiento${a.problemas === 1 ? '' : 's'}`
                                    : 'sin adelanto'}
                            </span>
                        )}
                    </button>
                    {/* ═══ LOS PROYECTOS DEL MISMO EXPEDIENTE ═══
                        David, 16-sep-2026: «si un expediente tiene más de un
                        proyecto, guardarlos en la misma pestaña de historial».
                        Contarlos no basta: el secretario que probó dos salidas
                        quiere LEERLAS para comparar. Cada versión trae su
                        sentido, su fecha y su documento; el último se abre
                        además entrando al asunto, que es el camino normal.

                        Plegado por omisión: la fila de un asunto con un solo
                        proyecto no cambia en nada. */}
                    {a.versiones && a.versiones.length > 1 && (
                        <div className="border-t border-white/[0.06] px-3 pb-2 pt-1.5">
                            <button type="button"
                                    onClick={() => setAbierto((x) => (x === a.numero ? '' : a.numero))}
                                    className="text-[12px] text-white/45 underline
                                               decoration-white/20 underline-offset-2
                                               transition-colors hover:text-accent-gold/80">
                                {abierto === a.numero
                                    ? 'Ocultar los proyectos'
                                    : `Ver los ${a.versiones.length} proyectos`}
                            </button>
                            {abierto === a.numero && (
                                <ul className="mt-1.5 flex flex-col gap-1">
                                    {a.versiones.map((v) => (
                                        <li key={v.version}
                                            className="flex items-center gap-2 text-[12px]">
                                            <span className="w-7 shrink-0 tabular-nums text-white/35">
                                                v{v.version}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-white/60">
                                                {(v.sentidoGlobal || 'sin sentido').replace(/_/g, ' ')}
                                                <span className="text-white/35">
                                                    {v.palabras
                                                        ? ` · ${v.palabras.toLocaleString('es-MX')} palabras`
                                                        : ''}
                                                    {v.generadoEn
                                                        ? ' · ' + new Date(v.generadoEn)
                                                            .toLocaleDateString('es-MX',
                                                                { day: 'numeric', month: 'short' })
                                                        : ''}
                                                </span>
                                            </span>
                                            {v.sinCopia ? (
                                                <span className="shrink-0 text-[12px] text-white/30"
                                                      title="Se generó antes de que el taller guardara una copia por versión; el siguiente proyecto la sustituyó en el archivo.">
                                                    sin copia
                                                </span>
                                            ) : onDescargar && (
                                                <button type="button"
                                                        onClick={() => onDescargar(a.numero, v.version)}
                                                        className="inline-flex shrink-0 items-center gap-1
                                                                   rounded-lg border border-white/10 px-2 py-0.5
                                                                   text-[12px] text-white/60 transition-colors
                                                                   hover:border-accent-gold/45
                                                                   hover:text-accent-gold/90">
                                                    <Download className="h-3 w-3" />
                                                    Abrir
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    </div>
                ))}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/45">
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
    enCurso = [], onReanudar, onDescargarVersion, accion, admision, puedeSise = false,
    ficha, documentos, plantilla,
}: {
    via: ViaEntrada | null;
    onVia: (v: ViaEntrada | null) => void;
    pasoArchivos: PasoArchivos | null;
    onPasoArchivos: (p: PasoArchivos | null) => void;
    hayDocumentos?: boolean;
    hayFicha?: boolean;
    enCurso?: AsuntoEnCurso[];
    onReanudar?: (numero: string) => void;
    /** El .docx de una versión anterior del mismo expediente. */
    onDescargarVersion?: (numero: string, version: number) => void;
    /** El botón que genera. Lo pone la pantalla, porque es quien sabe si se
     *  puede pulsar; aquí sólo se le da su sitio, que es el final del camino. */
    accion?: React.ReactNode;
    /** El soltador del auto de admisión. Vivía en el raíl izquierdo mientras
     *  la elección se hacía aquí; su sitio es el paso 1. */
    admision?: React.ReactNode;
    /** Lo dice el servidor en /taller/estado. Cerrado salvo administración y
     *  testers mientras el complemento está en pruebas. */
    puedeSise?: boolean;
    /* LA FICHA Y LOS DOCUMENTOS, DENTRO DE SU PASO. Vivían en el raíl
       izquierdo mientras el paso numerado estaba a la derecha: la instrucción
       en un lado y el sitio donde se trabaja en el otro. Ahora el raíl es el
       recorrido y cada paso trae lo suyo. */
    ficha?: React.ReactNode;
    documentos?: React.ReactNode;
    plantilla?: React.ReactNode;
}) {
    /* ── Nada elegido: los dos caminos ──────────────────────────────────── */
    if (!via) {
        return (
            /* Centrada y con un ancho de lectura: estirada a mil quinientos
               píxeles, dos tarjetas se convierten en dos pancartas. */
            <div className="entrada-fondo mx-auto w-full max-w-3xl rounded-2xl p-1 pt-6 sm:p-2 sm:pt-10">
                <p className="px-4 pb-1 pt-3 text-[12px] uppercase tracking-[0.14em] text-white/45">
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
                        insignia={puedeSise ? 'beta' : 'próximamente'}
                        cerrado={!puedeSise}
                        icono={Download}
                        retraso={110}
                        que="El complemento trae las constancias desde el Expediente Electrónico."
                        porque={puedeSise
                            ? 'Se instala una vez, en Chrome y en tu computadora. Después no hay que teclear el número, el tipo ni la ponencia: salen de los autos.'
                            : 'Traerá las constancias sin teclear el número, el tipo ni la ponencia. Está en pruebas y todavía no se abre: por ahora el taller trabaja con tus archivos.'}
                        onClick={() => onVia('sise')}
                    />
                </div>
                {onReanudar && (
                    <Reanudar asuntos={enCurso} onAbrir={onReanudar}
                              onDescargar={onDescargarVersion} />
                )}
            </div>
        );
    }

    /* ── Camino elegido: la cabecera con la vuelta ──────────────────────── */
    const volver = (
        <button type="button"
                onClick={() => { onVia(null); onPasoArchivos(null); }}
                className="inline-flex items-center gap-1.5 text-[12px] text-white/45
                           transition-colors hover:text-white/75">
            <ArrowLeft className="h-3 w-3" />
            cambiar de camino
        </button>
    );

    if (via === 'sise') {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl border
                            border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
                <span className="flex items-center gap-2 text-[13px] font-medium text-white/75">
                    <Download className="h-3.5 w-3.5 text-accent-gold/70" />
                    Desde SISE
                    <span className="rounded-lg border border-accent-gold/30 bg-accent-gold/10
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
                <span className="flex items-center gap-2 text-[13px] font-medium text-white/75">
                    <FileText className="h-3.5 w-3.5 text-accent-gold/70" />
                    Con mis archivos
                </span>
                {volver}
            </div>

            <div className="space-y-3.5">
                <Paso n={1} titulo="La ficha del asunto" hecho={!!hayFicha}
                      activo={!hayFicha}
                      porque="Partes, fechas y tipo. De aquí salen la carátula, el cómputo del plazo y el vocabulario de todo el proyecto.">
                    {!pasoArchivos && (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => onPasoArchivos('admision')}
                                    className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5
                                               text-left transition-colors hover:border-accent-gold/35
                                               hover:bg-white/[0.04]">
                                <span className="block text-[14px] font-medium text-white">
                                    Tengo el auto de admisión
                                </span>
                                <span className="mt-1 block text-[12px] leading-snug text-white/45">
                                    Lo subes y salen solos el expediente, el tipo, el tribunal, la
                                    responsable y el tercero. Son ocho campos que no tecleas.
                                </span>
                            </button>
                            <button type="button" onClick={() => onPasoArchivos('formulario')}
                                    className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5
                                               text-left transition-colors hover:border-accent-gold/35
                                               hover:bg-white/[0.04]">
                                <span className="block text-[14px] font-medium text-white">
                                    Prefiero llenar la ficha
                                </span>
                                <span className="mt-1 block text-[12px] leading-snug text-white/45">
                                    A mano, como siempre. También sirve si el auto no está a la
                                    mano o si prefieres comprobar cada dato tú.
                                </span>
                            </button>
                        </div>
                    )}
                    {/* ═══ ELEGIDO EL AUTO, LA TARJETA Y NADA MÁS ═══
                        David: «basta una tarjeta donde lo cargue y desde allí
                        comenzar el recorrido». El tipo de asunto sale del propio
                        auto —el servidor lo devuelve en `ficha.tipo_asunto`—,
                        así que la rejilla de cuatro tipos sobra en este camino:
                        es pedirle que elija algo que el papel ya dice. */}
                    {pasoArchivos === 'admision' && admision}
                    {pasoArchivos && ficha && <div className="mt-3">{ficha}</div>}
                    {pasoArchivos && (
                        <button type="button" onClick={() => onPasoArchivos(null)}
                                className="mt-2.5 block text-[12px] text-white/45
                                           transition-colors hover:text-white/75">
                            {pasoArchivos === 'admision'
                                ? 'estás subiendo el auto de admisión · cambiar'
                                : 'estás llenando la ficha a mano · cambiar'}
                        </button>
                    )}
                </Paso>

                <Paso n={2} titulo="Los dos documentos del asunto" hecho={!!hayDocumentos}
                      activo={!!hayFicha && !hayDocumentos}
                      porque="El acto reclamado y el escrito de la parte. Del primero sale lo que resolvió la responsable; del segundo, lo que se combate. El contraste de los dos es de donde nacen los problemas jurídicos.">
                    {hayFicha && (documentos || plantilla) && (
                        <div className="space-y-3">
                            {documentos}
                            {plantilla}
                        </div>
                    )}
                </Paso>

                {/* ═══ EL BOTÓN, DONDE ACABA EL CAMINO ═══
                    Estaba treinta centímetros más abajo, dentro de otra
                    tarjeta y del tamaño de un botón secundario. El secretario
                    leía «3 · Generar el adelanto» y tenía que ir a buscar
                    dónde se generaba. Ahora el paso tres TRAE el botón: se
                    lee la instrucción y se pulsa en el mismo sitio. */}
                <Paso n={3} titulo="Generar el adelanto"
                      activo={!!hayFicha && !!hayDocumentos}
                      porque="Con eso el taller lee el expediente y te devuelve el asunto entendido: antecedentes, qué resolvió, qué se alega y los planteamientos. Todavía no decide nada.">
                    {accion}
                </Paso>
            </div>
        </div>
    );
}
