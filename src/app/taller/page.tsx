'use client';

/**
 * Taller de sentencias — la pantalla del redactor desde el adelanto.
 *
 * EL CIRCUITO ESTÁ PARTIDO EN DOS A PROPÓSITO, porque entre las dos mitades hay
 * una PERSONA. La máquina lee y ordena; el secretario decide; la máquina
 * redacta la demostración de lo que él decidió.
 *
 *     1. adelanto    los dos PDF y su plantilla → ficha, resúmenes, problemas
 *     2. acervo      lo que la jurisprudencia dice de SUS problemas
 *     3. criterio    ⏸ él decide, viendo ya la obligatoria del tema
 *     4. proyecto    el estudio de fondo dentro de su propio .docx
 *
 * El paso 2 va ANTES del 3 y no al revés: pedirle el sentido sin enseñarle la
 * jurisprudencia obligatoria es justo el error que este taller existe para
 * evitar.
 *
 * Y lo que sale NO es un proyecto firmable. La medición sobre tres expedientes
 * reales lo dejó claro, así que el aviso va encima del documento, cada vez, con
 * los números de ESE borrador.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Download, Search, FileText, AlertCircle, Zap, Upload, Check, Star } from 'lucide-react';
import { useRequireAuth } from '@/lib/useAuth';
import BarraSuperior from '@/components/sentencia/BarraSuperior';
import AvisoDeInicio from '@/components/sentencia/AvisoDeInicio';
import EntradaTaller from '@/components/sentencia/EntradaTaller';
import type { ViaEntrada, PasoArchivos } from '@/components/sentencia/EntradaTaller';
import type { AsuntoEnCurso, FichaProyecto, DocumentosDelAsunto, FormatoSentencia }
    from '@/components/sentencia/api';
import PanelDocumentos from '@/components/sentencia/PanelDocumentos';
import AnilloDeFases from '@/components/sentencia/AnilloDeFases';
import Espinazo from '@/components/sentencia/Espinazo';
import type { PasoDelEspinazo } from '@/components/sentencia/Espinazo';
import ConfirmarVolver from '@/components/sentencia/ConfirmarVolver';
import OpinionProyecto from '@/components/sentencia/OpinionProyecto';
import type { DestinoVuelta } from '@/components/sentencia/ConfirmarVolver';
import Decision from '@/components/sentencia/Decision';
import FormularioEncargo, { ENCARGO_VACIO, faltaEnEncargo } from '@/components/sentencia/FormularioEncargo';
import type { TipoAsunto } from '@/components/sentencia/api';
import type { Encargo } from '@/components/sentencia/FormularioEncargo';
import AvisoBorrador, { AvisoPiloto } from '@/components/sentencia/AvisoBorrador';
import { Tarjeta, Rotulo, cn } from '@/components/sentencia/primitivas';
import VentanaTesis from '@/components/sentencia/VentanaTesis';
import type { TesisDelAcervo } from '@/components/sentencia/api';
import type { Asunto, Documento, Fase, ProblemaJuridico, RolDocumento } from '@/components/sentencia/tipos';
import {
    generarAdelanto, descargar, consultarAcervo, resolverConCriterio,
    resolverConSentidoGlobal,
    proponerSolucion, aportarContexto, resolverEnVivo,
    repartirCriterios, corregirProblema,
    type RespuestaPropuesta, type CriterioEnviado,
    estadoPiloto, descargarProyecto,
    sisePendiente, generarDesdeExpediente, NecesitaNotificacion, razonarSentido,
    contextoDelAsunto, asuntosEnCurso, descargarDelAlmacen,
    documentosDelAsunto, descargarDocumento, olvidarAsunto,
    URL_EXTENSION, URL_COMPLEMENTO, URL_SISE, descartarPendiente,
    fichaDesdeAdmision, pedirPlan, leerPlan, recalificar,
} from '@/components/sentencia/api';
import type { OpcionesResolver } from '@/components/sentencia/api';
import type { EnlacePlan } from '@/components/sentencia/ComoSeEstudiara';
import {
    useRecalificacion, idsPorRecalificar, aplicarReparto, pendientesVivos,
    claveRecalificacion, superposicion, recalificacionEnCurso, firmaConRecalificacion,
    faseTras, rotuloDelFlujo,
} from '@/components/sentencia/recalificacion';
import type { EnlaceRecalificacion, FaseDelFlujo, EventoDelFlujo } from '@/components/sentencia/recalificacion';
import { opcionesDelProyecto as armarOpciones } from '@/components/sentencia/opcionesDelProyecto';
import MapaDelEstudio from '@/components/sentencia/MapaDelEstudio';
import type { PendienteSISE, FaltaLaFecha, ContextoDelAsunto, DecisionSuplencia } from '@/components/sentencia/api';
import type { MaterialDelCaso, ResultadoProyecto, EstadoPiloto } from '@/components/sentencia/api';

type Paso = 'ficha' | 'adelanto' | 'acervo' | 'criterio' | 'proyecto';

const FASES_BASE: Fase[] = [
    { id: 'ficha', titulo: 'Ficha y oportunidad', detalle: 'Partes, fechas y cómputo de días hábiles. Sin modelo: aritmética.', estado: 'pendiente' },
    { id: 'ratio', titulo: 'Ratio del acto reclamado', detalle: 'Qué resolvió la responsable y con qué razones, anclado a su página.', estado: 'pendiente' },
    { id: 'conceptos', titulo: 'Síntesis de conceptos', detalle: 'Un párrafo por concepto, en el registro de tus engroses.', estado: 'pendiente' },
    { id: 'problemas', titulo: 'Problemas jurídicos', detalle: 'Del contraste entre lo resuelto y lo combatido.', estado: 'pendiente' },
    { id: 'busqueda', titulo: 'Búsqueda por problema', detalle: 'Un RAG dirigido a cada problema, con registro verificado.', estado: 'pendiente' },
    { id: 'criterio', titulo: 'Tu criterio', detalle: 'El único paso que no se automatiza. Decide y explica por qué.', estado: 'pendiente', requiereHumano: true },
    { id: 'estudio', titulo: 'Estudio de fondo', detalle: 'Tu criterio manda el sentido; el corpus, la forma; la ley, el fundamento.', estado: 'pendiente' },
    { id: 'ensamblado', titulo: 'Ensamblado en tu plantilla', detalle: 'Se rellenan los huecos del adelanto. No se construye un Word nuevo.', estado: 'pendiente' },
];

/** Qué fases están hechas según dónde vamos. */
function fasesSegun(paso: Paso, corriendo: boolean): Fase[] {
    const hasta: Record<Paso, number> = { ficha: 0, adelanto: 4, acervo: 5, criterio: 5, proyecto: 8 };
    const n = hasta[paso];
    return FASES_BASE.map((f, i) => ({
        ...f,
        estado: i < n ? 'lista'
            : i === n && corriendo ? 'corriendo'
                : f.requiereHumano && i === n ? 'espera'
                    : 'pendiente',
    }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL AUTO DE ADMISIÓN: UNA TARJETA Y YA
   ═══════════════════════════════════════════════════════════════════════════
   David, 13-sep-2026: «si el secretario tiene el auto de admisión, ni siquiera
   son necesarios los botones de tipo de asunto. Basta con que lo arrastre o lo
   cargue desde el navegador (porque no deja arrastrar actualmente) para que el
   pipeline reconozca de qué asunto se va a tratar. (…) Una vez carga, los datos
   necesarios serán pocos: la fecha de notificación, la de presentación y el
   magistrado ponente. Lo demás ya viene en el auto».

   DOS COSAS ESTABAN MAL Y LAS DOS SE ARREGLAN AQUÍ:

   · NO DEJABA ARRASTRAR, y no era un capricho del navegador: esto era un
     <label> con un <input type="file"> escondido dentro. Un label abre el
     diálogo al pulsarlo, pero no recibe nada soltado encima —sin onDragOver ni
     onDrop el navegador se limita a abrir el PDF en otra pestaña—. Ahora es un
     soltador de verdad.

   · ESTABA EN LA OTRA COLUMNA. Se elegía «Tengo el auto de admisión» a la
     derecha y el sitio donde subirlo salía en el raíl izquierdo.

   Y el tipo de asunto sale del auto: el servidor ya lo devuelve en
   `ficha.tipo_asunto` y la pantalla ya lo aplicaba. Lo que sobraba era seguir
   enseñando la rejilla de cuatro tipos después de haberlo leído. */
function TarjetaAdmision({ fichando, fichado, onArchivo }: {
    fichando: boolean;
    fichado: string[];
    onArchivo: (f: File) => void;
}) {
    const [encima, setEncima] = useState(false);
    const input = React.useRef<HTMLInputElement>(null);
    const listo = fichado.length > 0;

    return (
        <>
            <input ref={input} type="file" accept=".pdf" className="sr-only"
                   disabled={fichando}
                   onChange={(e) => {
                       const f = e.target.files?.[0];
                       e.target.value = '';
                       if (f) onArchivo(f);
                   }} />
            <button
                type="button"
                disabled={fichando}
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
                onDragLeave={() => setEncima(false)}
                onDrop={(e) => {
                    e.preventDefault(); setEncima(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) onArchivo(f);
                }}
                className={cn(
                    'w-full rounded-2xl border border-dashed px-5 py-6 text-left',
                    'transition-all duration-200 disabled:cursor-wait',
                    encima ? 'border-accent-gold/60 bg-accent-gold/[0.07] scale-[1.01]'
                           : listo ? 'border-emerald-400/30 bg-emerald-400/[0.04]'
                                   : 'border-white/20 bg-white/[0.02] '
                                     + 'hover:border-accent-gold/45 hover:bg-accent-gold/[0.03]',
                )}
            >
                <span className="flex items-center gap-3.5">
                    <span className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        'transition-colors',
                        encima ? 'bg-accent-gold/20'
                               : listo ? 'bg-emerald-400/10' : 'bg-white/[0.06]',
                    )}>
                        {fichando
                            ? <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
                            : listo
                                ? <Check className="h-5 w-5 text-emerald-300" strokeWidth={2.5} />
                                : <FileText className={cn('h-5 w-5',
                                    encima ? 'text-accent-gold' : 'text-white/60')} />}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[16px] font-medium tracking-[0.01em] text-white">
                            {fichando ? 'Leyendo el auto…'
                                      : listo ? 'Auto de admisión leído'
                                              : 'El auto de admisión'}
                        </span>
                        <span className={cn(
                            'mt-1 flex items-center gap-1.5 text-[14px]',
                            encima ? 'text-accent-gold' : 'text-white/60',
                        )}>
                            <Upload className="h-3.5 w-3.5" />
                            {encima ? 'Suelta aquí'
                                    : listo ? 'Arrastra otro para rehacer la ficha'
                                            : 'Arrastra el PDF o haz clic'}
                        </span>
                    </span>
                </span>
                <span className="mt-3.5 block text-[12px] leading-relaxed text-white/45">
                    De aquí salen el tipo de asunto, el número de expediente, el
                    tribunal, la autoridad responsable, el tercero interesado y
                    quien promueve. No hay que elegir el tipo a mano: lo dice el
                    propio auto.
                </span>
                {listo && (
                    <span className="mt-3 flex flex-wrap gap-1.5">
                        {fichado.map((k) => (
                            <span key={k}
                                  className="rounded-lg border border-emerald-400/30
                                             bg-emerald-400/[0.08] px-1.5 py-0.5
                                             text-[12px] text-emerald-300/90">
                                {k.replace(/_/g, ' ')}
                            </span>
                        ))}
                        <span className="text-[12px] text-white/45">
                            leídos del auto · compruébalos
                        </span>
                    </span>
                )}
            </button>
        </>
    );
}

const boton = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 ' +
    'text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

/* ═══════════════════════════════════════════════════════════════════════════
   UN PLIEGUE QUE SE VE QUE ES UN PLIEGUE
   ═══════════════════════════════════════════════════════════════════════════
   David: «debería poder ser visibles los botones para desplegar el resumen, o
   los problemas jurídicos del caso».

   Tenía razón y el motivo estaba en el CSS: los cuatro <summary> llevaban
   `list-none`, que quita el triángulo que el navegador dibuja solo, y no se
   ponía nada en su lugar. El único indicio era que el cursor cambiaba al pasar
   por encima —y eso sólo lo descubre quien ya sabe que hay algo debajo—.

   Aquí el rótulo es un botón con todas las señales: galón que gira, la palabra
   que dice qué va a pasar, y una línea a la derecha con el tamaño de lo que
   hay dentro, para decidir si vale la pena abrirlo. */
function Pliegue({ titulo, nota, abierto, children }: {
    titulo: string;
    nota?: string;
    abierto?: boolean;
    children: React.ReactNode;
}) {
    return (
        <details className="group rounded-xl border border-white/[0.07] bg-white/[0.02]"
                 open={abierto}>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5
                                transition-colors hover:bg-white/[0.03]">
                <svg viewBox="0 0 24 24" aria-hidden="true"
                     className="h-3.5 w-3.5 shrink-0 text-accent-gold/70 transition-transform
                                duration-200 group-open:rotate-90"
                     fill="none" stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="text-[13px] font-medium text-white/75">{titulo}</span>
                {nota && (
                    <span className="ml-auto shrink-0 text-[12px] text-white/45">{nota}</span>
                )}
                <span className="shrink-0 text-[12px] text-white/45">
                    <span className="group-open:hidden">ver</span>
                    <span className="hidden group-open:inline">ocultar</span>
                </span>
            </summary>
            <div className="px-3 pb-3 pt-0.5">{children}</div>
        </details>
    );
}


export default function TallerDeSentencias() {
    const { user, profile, loading: authLoading } = useRequireAuth();
    const correo = user?.email ?? '';

    const [paso, setPaso] = useState<Paso>('ficha');
    const [propuesta, setPropuesta] = useState<RespuestaPropuesta | null>(null);
    // CÓMO DECIDE EL SECRETARIO. Por omisión, problema por problema, que es
    // como funcionaba: nadie se encuentra con un flujo distinto sin pedirlo.
    const [modo, setModo] = useState<'acervo' | 'global' | 'por_problema'>('por_problema');
    const [sentidoGlobal, setSentidoGlobal] = useState('');
    /* LA RAZÓN DE LA SOLUCIÓN GLOBAL. El sentido dice QUÉ se resuelve y esto,
     * POR QUÉ: es lo que alinea el estudio entero. Se insertaba la propuesta
     * del motor en el modo «acervo» —problema por problema— y en el global no
     * había dónde ponerla, así que el proyecto salía con un sentido dictado y
     * ninguna explicación detrás. */
    const [razonGlobal, setRazonGlobal] = useState('');
    /* LOS CONCEPTOS DE VIOLACIÓN, cuando el recurso levanta un sobreseimiento
       y el tribunal asume jurisdicción. No están en el expediente del recurso:
       los pega el secretario. */
    const [conceptosViolacion, setConceptosViolacion] = useState('');
    /* PROBLEMAS QUE SE ESTUDIAN JUNTOS: id del problema → letra del grupo. Lo
       decide el secretario, porque es quien ve que dos planteamientos se
       resuelven con una sola línea argumentativa. */
    const [grupos, setGrupos] = useState<Record<string, string>>({});
    /* LA SUPLENCIA DE LA QUEJA QUE DECIDIÓ EL SECRETARIO (David, 26-sep-2026).
       Null = no ha decidido: viaja la propuesta del motor SIN confirmar y el
       estudio se comporta como antes. Se guarda con el número del asunto al
       que pertenece, para que la decisión de un expediente no se cuele en el
       siguiente que se abra. No depende del sentido: cambiar de sentido y
       regenerar la conserva. */
    const [suplenciaDecidida, setSuplenciaDecidida] =
        useState<{ numero: string; d: DecisionSuplencia } | null>(null);
    /* EL ESTUDIO, SEGÚN SE ESCRIBE. Cuatro minutos de pantalla quieta se
       sienten como una avería; viéndose escribir se sienten como trabajo. Y de
       paso el secretario va leyendo y puede parar si ve que va mal encaminado. */
    const [avance, setAvance] = useState('');
    /* PROPONER Y GENERAR NO SON LO MISMO, y el botón decía «Redactando la
       sentencia…» mientras lo que corría era la PROPUESTA. Los dos comparten
       `corriendo`, así que hacía falta distinguirlos: un rótulo que miente
       sobre lo que está pasando hace que el secretario espere lo que no va a
       llegar. */
    const [proponiendo, setProponiendo] = useState(false);

    /* LLEVAR AL SECRETARIO ADONDE ACABA DE PASAR ALGO.
     *
     * David: «no se sabe en qué momento puede hacer scrolling. Si el
     * secretario no baja, no se percata de todo el pipeline existente».
     *
     * Es exacto, y se nota conduciendo la pantalla: cada paso deja lo nuevo
     * fuera de vista. Quien no baje no ve las dos vías, ni la lista de
     * comprobación, ni el estudio escribiéndose — y no tiene forma de saber
     * que están ahí.
     *
     * Se mueve la pantalla SOLA, y sólo cuando aparece algo que hay que leer o
     * decidir. Nunca mientras el secretario escribe: eso es arrebatarle el
     * cursor. */
    const irA = useCallback((id: string, retraso = 350) => {
        window.setTimeout(() => {
            const el = document.getElementById(id);
            if (!el) return;
            const activo = document.activeElement;
            // Si está escribiendo, no se le mueve el suelo bajo los pies.
            if (activo && /INPUT|TEXTAREA/.test(activo.tagName)) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, retraso);
    }, []);
    // Lo que el secretario aporta porque el acervo no lo tenía. Vive aquí y
    // viaja con cada petición: el servidor no lo guarda.
    const [contexto, setContexto] = useState('');
    const [aportando, setAportando] = useState(false);
    /* ═══ LA FICHA, DEL AUTO DE ADMISIÓN ═══
       David: «basta con subir el auto de admisión y de allí derivar qué
       expediente, qué tribunal resolverá, la autoridad responsable, el o los
       terceros interesados. Pero sólo déjalo como posibilidad optativa».

       OPTATIVO DE VERDAD: no crea sesión, no gasta cuota y no obliga a nada.
       Lo que vuelve es una PROPUESTA que se pone en los campos y él corrige;
       lo que ya hubiera escrito NO se pisa, porque lo suyo manda sobre lo
       leído. El auto de admisión es el único papel del expediente que dice
       quién es quién en su primera página. */
    /* ═══ LO QUE EL SECRETARIO RESUELVE SOBRE UN CÓMPUTO EXTEMPORÁNEO ═══
       David: «si el cómputo es extemporáneo sólo avisar, pero nunca impedir el
       estudio de fondo si el secretario decide generar proyecto de fondo.
       Recuerda que la tarjeta final gobierna el proyecto».

       Dos vías, y no caben en una casilla, porque son dos afirmaciones
       jurídicas distintas y el artículo 74, fracción VI, de la Ley de Amparo
       exige congruencia entre considerandos y resolutivos:
         · «oportuna» — él rectifica el cómputo, su razón va literal al
           considerando y la ejecutoria entra al fondo;
         · «reserva»  — la ejecutoria resuelve la improcedencia y el estudio va
           DETRÁS de los resolutivos, en un anexo que dice que no forma parte
           de ella.
       Nunca deshabilita el botón de generar: avisa, no impide. */
    const [extemporanea, setExtemporanea] = useState(false);
    const [decision, setDecision] = useState<'' | 'oportuna' | 'reserva'>('');
    const [motivoDecision, setMotivoDecision] = useState('');
    /* ═══ POR DÓNDE SE EMPIEZA ═══
       Al entrar había VEINTIDÓS botones visibles a la vez y ninguno propuesto:
       el manual de SISE ocupaba la esquina de más peso aunque sea el camino
       secundario, el auto de admisión se ofrecía en un recuadro de puntos en
       la otra columna, y la rejilla de tipos y los dos soltadores de PDF
       competían por la mirada. Todo estaba disponible y nada estaba dicho.
       Ahora se elige primero —dos caminos— y cada uno despliega lo suyo. */
    const [via, setVia] = useState<ViaEntrada | null>(null);
    /* LOS ASUNTOS A MEDIAS. La sesión del taller vive en `taller_sesiones`
       desde el primer adelanto —hay que serializarla igual, porque con -w 2 el
       worker que resuelve no es el que leyó—, y la pantalla nunca la
       preguntaba: recargar en mitad del asunto tiraba cuatro minutos de motor. */
    const [enCurso, setEnCurso] = useState<AsuntoEnCurso[]>([]);
    /* EL PROYECTO YA ESCRITO, cuando se vuelve a un asunto terminado. Es
       distinto de `proyecto`: aquél trae el .docx en memoria porque se acaba de
       generar; éste es la FICHA de uno anterior, y su documento vive en el
       almacén. Se separan a propósito para no fingir un fichero que no está. */
    const [previo, setPrevio] = useState<FichaProyecto | null>(null);
    /* LOS DOCUMENTOS GUARDADOS DEL ASUNTO. Hasta ahora los PDF se leían y se
       tiraban con la petición: volver a un asunto exigía traerlos otra vez. */
    const [guardados, setGuardados] = useState<DocumentosDelAsunto | null>(null);
    const [confirmaOlvidar, setConfirmaOlvidar] = useState(false);

    /* EL MARCO, ENTERO CUANDO SE PIDE. La lista se corta en doce tesis y
       catorce preceptos y lo decía —«y 6 más»—, pero decirlo no es enseñarlo:
       este panel existe para COMPROBAR con qué se va a fundar, y seis tesis que
       no se pueden leer son seis que no se pueden comprobar. */
    const [marcoEntero, setMarcoEntero] = useState(false);
    // LA TESIS, SIN SALIR DEL REDACTOR. David: «basta con un clic para abrir
    // una ventana que muestre la tesis, sin salir del redactor». `null` =
    // cerrada; la tesis clicada = abierta.
    const [tesisAbierta, setTesisAbierta] = useState<TesisDelAcervo | null>(null);
    const [pasoArchivos, setPasoArchivos] = useState<PasoArchivos | null>(null);
    const [fichando, setFichando] = useState(false);
    const [fichado, setFichado] = useState<string[]>([]);
    const leerAdmision = useCallback(async (archivo: File) => {
        setError(''); setFichando(true); setFichado([]);
        try {
            const { ficha, leidos, avisos, reglas } = await fichaDesdeAdmision(correo, archivo);
            setEncargo((prev) => {
                const x = { ...prev };
                // LA REGLA DE NOTIFICACIÓN DEL FUERO. Leída la responsable, el
                // servidor dice qué regla le corresponde por la ley del acto
                // —el TFJA notifica por Boletín Jurisdiccional y surte al
                // tercer día hábil, art. 65 LFPCA—. Se preselecciona si el
                // secretario no había elegido otra a propósito.
                if (reglas?.por_omision && (!prev.reglaSurtimiento || prev.reglaSurtimiento === 'personal')) {
                    x.reglaSurtimiento = reglas.por_omision;
                }
                const poner = (k: keyof Encargo, v?: string) => {
                    if (v && !String((x as unknown as Record<string, string>)[k] ?? '').trim()) {
                        (x as unknown as Record<string, string>)[k] = v;
                    }
                };
                /* EL TIPO PRIMERO, porque de él cuelga todo lo demás: el
                   formulario deriva sus apartados, su vocabulario y su plazo de
                   `tipoAsunto`, y mientras esté vacío NO PINTA NI UN CAMPO.
                   Se leía del auto y no se ponía —había aquí una línea que no
                   hacía nada—, así que el secretario subía el auto, veía ocho
                   etiquetas verdes y seguía delante de la rejilla de tipos con
                   la ficha en blanco: lo leído estaba, pero no se veía. */
                poner('tipoAsunto', ficha.tipo_asunto);
                poner('numero', ficha.numero);
                // EL ENCABEZADO YA SE SABE: lo compone el servidor con tipo,
                // materia y número. David: «sigue pidiendo el encabezado
                // cuando ese ya se sabe en automático del auto de admisión».
                poner('encabezado', ficha.encabezado);
                poner('quejoso', ficha.quejoso);
                poner('recurrente', ficha.recurrente);
                poner('responsable', ficha.responsable);
                poner('tercero', ficha.tercero_interesado);
                poner('tribunal', ficha.tribunal);
                poner('ciudad', ficha.ciudad);
                poner('magistrado', ficha.magistrado);
                // LA FECHA DE PRESENTACIÓN. No siempre está en el auto de
                // admisión —a veces sólo en la portada de la promoción—, así
                // que se propone cuando se lee y se deja vacía cuando no: el
                // secretario la teclea como hoy en ese caso.
                poner('presentacion', ficha.presentacion);
                return x;
            });
            setFichado(leidos);
            if (avisos.length) setError(avisos[0]);
        } catch (e) {
            setError(e instanceof Error ? e.message
                : 'No se pudo fichar el asunto desde el auto de admisión.');
        } finally { setFichando(false); }
    }, [correo]);
    const [corriendo, setCorriendo] = useState(false);
    const [error, setError] = useState('');

    /* ─ SE RECONOCE POR EL 402 DEL SERVIDOR, no por buscar palabras en la
         prosa del mensaje: el texto se reescribe y una heurística de palabras
         falla en silencio, que es la peor manera de fallar. El servidor manda
         402 «Payment Required» y `api.ts` lo cuelga del error. ─ */
    const sinProyectos = /sin_saldo|proyecto de prueba|proyectos de este mes|Plan Ultra Secretarios/i
        .test(error || '');
    const [recargando, setRecargando] = useState(false);

    /* COMPRAR UNA RECARGA. Abre el cobro de Stripe en la misma pestaña: volver
       con el navegador deja al secretario donde estaba, y el webhook ya le
       habrá abonado los diez proyectos. */
    const comprarRecarga = useCallback(async () => {
        setRecargando(true);
        try {
            const r = await fetch('/api/stripe/recarga', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: correo }),
            });
            const j = await r.json();
            if (j?.url) { window.location.href = j.url; return; }
            setError(j?.error || 'No se pudo abrir el cobro de la recarga.');
        } catch {
            setError('No se pudo abrir el cobro de la recarga.');
        } finally { setRecargando(false); }
    }, [correo]);

    const [piloto, setPiloto] = useState<EstadoPiloto | null>(null);

    const [encargo, setEncargo] = useState<Encargo>(ENCARGO_VACIO);
    /* EL TIPO ELEGIDO, que gobierna cómo se llama cada cosa en pantalla. */
    const [tipoSel, setTipoSel] = useState<TipoAsunto | undefined>(undefined);
    const voz = useMemo(() => tipoSel ? {
        recurrido: tipoSel.recurrido,
        combate: tipoSel.combate,
        esRecurso: /revision|queja/i.test(tipoSel.clave),
    } : undefined, [tipoSel]);
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    /* EL EXPEDIENTE QUE YA ESTÁ ESPERANDO. La extensión lo deja aquí desde el
       Expediente Electrónico; sin esto la pantalla no se enteraba y todo el
       camino era inalcanzable para el secretario. */
    const [pendientes, setPendientes] = useState<PendienteSISE[]>([]);
    const [elegido, setElegido] = useState<string>('');
    /* LA ÚNICA FECHA QUE SE TECLEA. No está en los escaneos y es la que decide
       la extemporaneidad; suponerla es lo que dejó dos proyectos vacíos. */
    const [fechaNotif, setFechaNotif] = useState('');
    const [sabemos, setSabemos] = useState<FaltaLaFecha | null>(null);
    /* EL ERROR SE PINTA DONDE SE PULSÓ.
       Probándolo en Chrome: el 409 llegaba, `setError` lo guardaba y el mensaje
       se pintaba en la columna IZQUIERDA, fuera de la vista. Se pulsaba
       «Generar desde SISE» y no cambiaba nada en pantalla. Un error que
       aparece a dos columnas del botón es un error invisible. */
    const [errorSise, setErrorSise] = useState('');
    /* EL ASUNTO, PARA LEERLO. Se trae en cuanto hay adelanto y se enseña ANTES
       de buscar: el recorrido marcaba «Ratio del acto reclamado» en verde y el
       secretario no podía leerla. Se le pedía formar criterio sobre un asunto
       que no había visto. */
    const [delAsunto, setDelAsunto] = useState<ContextoDelAsunto | null>(null);
    /* La suplencia decidida vale sólo para el asunto en que se decidió. */
    const suplencia = suplenciaDecidida && suplenciaDecidida.numero === encargo.numero
        ? suplenciaDecidida.d : null;

    /* ═══ LA RAZÓN POR ARGUMENTO (Decisión 6 de David, opción a, 26-sep-2026) ═══
       El plan marca los argumentos que su problema decide pero su razón no
       contesta; el panel se la pide y aquí se guarda, por id del segmento
       («C3.e»). Como la suplencia, con el número del asunto: los ids se
       repiten de un expediente a otro y una razón no puede colarse en el
       siguiente que se abra. */
    const [razonesDecididas, setRazonesDecididas] =
        useState<{ numero: string; r: Record<string, string> }>({ numero: '', r: {} });
    const razonesSegmento = useMemo(
        () => (razonesDecididas.numero === encargo.numero ? razonesDecididas.r : {}),
        [razonesDecididas, encargo.numero]);
    const escribirRazonSegmento = useCallback((id: string, texto: string) => {
        setRazonesDecididas((prev) => ({
            numero: encargo.numero,
            r: { ...(prev.numero === encargo.numero ? prev.r : {}), [id]: texto },
        }));
    }, [encargo.numero]);

    /* ═══ LA VARIANTE DEL PROMPT DEL ESTUDIO, SÓLO EN CASA (26-sep-2026) ═══
       Hasta hoy sólo la pedía el banco de medición. Para probar el plan en el
       montaje real hace falta elegirla en pantalla. Casa = lo que el servidor
       diga (`es_casa`) o, si no lo dice, `puede_sise`, que sale de la misma
       lista de cuentas sin tope. Al resto el servidor le ignora el campo de
       todos modos. Se recuerda en este navegador —es una comodidad de quien
       mide, no un estado del asunto—; si el almacenamiento falla, vuelve a
       «por omisión». */
    const esCasa = !!(piloto?.es_casa ?? piloto?.puede_sise);
    const [varianteEstudio, setVarianteEstudio] = useState('');
    useEffect(() => {
        try {
            const v = window.localStorage.getItem('taller.varianteEstudio') || '';
            if (/^v[1-4]$/.test(v)) setVarianteEstudio(v);
        } catch { /* sin almacenamiento: por omisión */ }
    }, []);
    const elegirVariante = useCallback((v: string) => {
        setVarianteEstudio(v);
        try {
            if (v) window.localStorage.setItem('taller.varianteEstudio', v);
            else window.localStorage.removeItem('taller.varianteEstudio');
        } catch { /* no pasa nada: vale para esta visita */ }
    }, []);
    /* ¿ESTE ESTUDIO SE ESCRIBE CON PLAN? En casa, si eligió la v4; si no
       eligió nada —o no es de casa—, lo que el servidor diga que usará para
       este asunto (cuando se encienda por tipo). Sin plan, el panel «Cómo se
       estudiará» no aparece y no se pide nada. */
    const varianteEfectiva = (esCasa && varianteEstudio) || delAsunto?.varianteEstudio || '';
    const usaPlan = varianteEfectiva === 'v4';
    /* QUÉ ESTÁ HACIENDO EL SERVIDOR MIENTRAS SE GENERA, en UNA fase y no en
       dos banderas: «recalificando» (los accesorios con la premisa del
       secretario, antes del plan y del estudio), «ordenando» (el plan) o
       «escribiendo». Cada evento la sustituye (`faseTras`), así el rótulo de
       la recalificación no se queda puesto cuando el servidor ya pasó a otra
       cosa (revisión adversarial, 26-sep-2026). */
    const [faseSrv, setFaseSrv] = useState<FaseDelFlujo>('preparando');
    const avanzarFase = useCallback((ev: EventoDelFlujo) => setFaseSrv((f) => faseTras(f, ev)), []);
    /* Si al pulsar «generar» quedaba un accesorio «Recalificando…», la
       pantalla lo dice desde el primer segundo: el servidor lo terminará antes
       de escribir, aunque no llegue a mandar el evento (si la recalificación
       que pidió esta pantalla acaba mientras tanto, la usa sin rehacerla). */
    const recalEnCursoRef = useRef(false);

    const traerContexto = useCallback(async (num: string) => {
        if (!num || !correo) return;
        try {
            const c = await contextoDelAsunto(num, correo);
            if (c) {
                setDelAsunto(c);
                // Y EL TIPO SE SINCRONIZA. Venía del expediente de SISE y la
                // pantalla seguía diciendo «Amparo directo» sobre una revisión
                // fiscal: el servidor resolvía una cosa y el rótulo decía otra.
                if (c.tipoAsunto) {
                    setEncargo((e) => e.tipoAsunto === c.tipoAsunto
                        ? e : { ...e, tipoAsunto: c.tipoAsunto });
                }
            }
        } catch { /* si no llega, la pantalla sigue como antes */ }
    }, [correo]);
    /* ═══ LA SOLUCIÓN LLEGA SOLA ═══
       David (17-sep): «cuando entrega el asunto en corto debería ya estarse
       buscando la solución jurídica y contar con una propuesta global y por
       puntos que el secretario pueda cambiar». El servidor consulta el acervo,
       contrasta y propone en cuanto termina el adelanto; aquí se pregunta cada
       cuatro segundos cómo va y, con la propuesta lista, se recoge —el botón
       contesta al instante— y se pasa a decidir. Sin que el secretario pulse
       nada entre leer el asunto y ver la propuesta.
       Los dos callbacks que hacen el trabajo se definen más abajo; se llaman
       por referencia para no adelantar su declaración. */
    const avanceAuto = delAsunto?.avance ?? { consulta: '', contraste: '', propuesta: '' };
    const autoEnCurso = paso === 'adelanto' && !!delAsunto
        && avanceAuto.propuesta !== 'listo' && avanceAuto.propuesta !== 'fallo';
    const pedirAcervoRef = useRef<((usarContexto?: boolean) => Promise<void>) | null>(null);
    const pedirPropuestaRef = useRef<((opts?: { sinContexto?: boolean; contextoTexto?: string }) => Promise<void>) | null>(null);
    const autoLanzado = useRef(false);
    useEffect(() => {
        if (!autoEnCurso || corriendo || !encargo.numero) return;
        const t = setTimeout(() => { void traerContexto(encargo.numero); }, 4000);
        return () => clearTimeout(t);
    }, [autoEnCurso, corriendo, encargo.numero, delAsunto, traerContexto]);
    useEffect(() => {
        if (paso !== 'adelanto' || corriendo || autoLanzado.current) return;
        if (avanceAuto.propuesta !== 'listo') return;
        autoLanzado.current = true;
        void pedirAcervoRef.current?.(false);
    }, [paso, corriendo, avanceAuto.propuesta]);
    /* BORRAR PIDE CONFIRMACIÓN, pero no un modal: el mismo botón cambia de
       texto. Borrar tira las constancias y hay que volver a traerlas de SISE,
       así que un clic despistado cuesta trabajo de verdad. */
    const [confirmaBorrar, setConfirmaBorrar] = useState(false);
    const [ficheros, setFicheros] = useState<Partial<Record<RolDocumento | 'plantilla', File>>>({});
    const [material, setMaterial] = useState<MaterialDelCaso | null>(null);
    /* ═══ CON QUÉ FICHA SE LEYÓ EL EXPEDIENTE ═══
       Ahora se puede volver al paso 1 y corregir la ficha. Pero el servidor
       guarda la sesión con los datos de la vuelta anterior: si el secretario
       cambia la fecha de notificación —o la regla, o el plazo— y salta directo
       al acervo sin regenerar el adelanto, el cómputo del documento sale con
       el dato viejo y nadie lo dice. Se guarda la huella de los campos que
       mueven el cómputo y se compara: si cambió, la pantalla lo avisa. */
    const [fichaDelAdelanto, setFichaDelAdelanto] = useState<string>('');
    const [problemas, setProblemas] = useState<ProblemaJuridico[]>([]);
    const [proyecto, setProyecto] = useState<ResultadoProyecto | null>(null);
    /* ═══ LA OPINIÓN AL TERMINAR CADA PROYECTO ═══
       David (24-sep-2026): «al término de cada proyecto abrir un cuadro de
       texto con formato visual profesional para que el usuario escriba sus
       puntos de vista y aspectos a mejorar». Se abre SOLA cuando llega un
       proyecto recién generado —una vez por versión: si la cierra, no vuelve
       a saltar en esa versión— y queda el botón para abrirla cuando quiera. */
    const [opinion, setOpinion] = useState<{ version: number } | null>(null);
    const [opinadas, setOpinadas] = useState<Set<string>>(new Set());
    useEffect(() => {
        try {
            const v = JSON.parse(localStorage.getItem('iurexia.taller.opiniones') || '[]');
            if (Array.isArray(v)) setOpinadas(new Set(v.map(String)));
        } catch { /* sin almacenamiento: se pregunta cada vez, que es lo menos malo */ }
    }, []);
    const marcarOpinion = useCallback((clave: string) => {
        setOpinadas((prev) => {
            const n = new Set(prev); n.add(clave);
            try { localStorage.setItem('iurexia.taller.opiniones', JSON.stringify(Array.from(n).slice(-200))); } catch { /* nada */ }
            return n;
        });
    }, []);
    /* Se preguntan al abrir un asunto y al terminar de generar: son los dos
       momentos en que la respuesta cambia. */
    const traerGuardados = useCallback(async (num: string) => {
        if (!num || !correo) { setGuardados(null); return; }
        setGuardados(await documentosDelAsunto(num, correo));
    }, [correo]);

    /* Los campos de la ficha que mueven el cómputo o el documento. Si uno
       cambia después del adelanto, hay que releer el expediente. */
    const huellaFicha = useMemo(() => JSON.stringify([
        encargo.tipoAsunto, encargo.notificacion, encargo.presentacion,
        encargo.reglaSurtimiento, encargo.surteEfectos, encargo.plazo,
        encargo.responsable, encargo.inhabilesResponsable,
        (encargo.diasInhabilesExtra ?? []).join(','),
    ]), [encargo]);
    const fichaCambiada = !!fichaDelAdelanto && fichaDelAdelanto !== huellaFicha;
    /* AL REANUDAR, lo leído corresponde a la ficha que acaba de recuperarse:
       se sella en cuanto está puesta, para no acusar un cambio que no hubo. */
    useEffect(() => {
        if (paso !== 'ficha' && !fichaDelAdelanto && encargo.notificacion) {
            setFichaDelAdelanto(huellaFicha);
        }
    }, [paso, fichaDelAdelanto, huellaFicha, encargo.notificacion]);

    const olvidar = useCallback(async () => {
        if (!confirmaOlvidar) { setConfirmaOlvidar(true); return; }
        try {
            const msg = await olvidarAsunto(encargo.numero, correo);
            setGuardados(null); setPrevio(null); setProyecto(null);
            setEnCurso((xs) => xs.filter((x) => x.numero !== encargo.numero));
            setError(msg);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo borrar el asunto.');
        } finally { setConfirmaOlvidar(false); }
    }, [confirmaOlvidar, encargo.numero, correo]);

    useEffect(() => {
        if (!correo) return;
        estadoPiloto(correo).then(setPiloto).catch(() => setPiloto(null));
        asuntosEnCurso(correo).then(setEnCurso).catch(() => setEnCurso([]));
    }, [correo]);

    /* VOLVER A UN ASUNTO SIN REHACERLO. Se recupera lo caro —la ficha, los
       resúmenes y los planteamientos, que son los dos PDF leídos— y se deja al
       secretario en el mismo sitio donde estaría al terminar un adelanto: con
       el botón rojo pendiente. La búsqueda en el acervo se rehace porque el
       material no viaja por esta puerta, y son cuarenta segundos frente a los
       cuatro minutos de volver a leer el expediente. */
    const reanudar = useCallback(async (numero: string) => {
        if (!numero || !correo) return;
        setError(''); setCorriendo(true);
        try {
            const c = await contextoDelAsunto(numero, correo);
            if (!c) {
                setError(`No se pudo recuperar el ${numero}: la sesión ya no está `
                       + 'en la base. Vuelve a generar el adelanto con sus documentos.');
                return;
            }
            setDelAsunto(c);
            /* LA FICHA VUELVE ENTERA. Antes sólo se restauraban el número y el
               tipo: el secretario veía el quejoso y la responsable vacíos sobre
               un asunto que sí los tenía. El documento salía bien porque el
               servidor usa su propia copia, pero la pantalla mentía — y si él
               tocaba uno de esos campos, se mandaba vacío encima del bueno. */
            const en = c.encargo || {};
            setEncargo((e) => ({
                ...e,
                numero,
                tipoAsunto: c.tipoAsunto || e.tipoAsunto,
                encabezado: en.encabezado || e.encabezado,
                quejoso: en.quejoso || e.quejoso,
                responsable: en.responsable || e.responsable,
                tribunal: en.tribunal || e.tribunal,
                ciudad: en.ciudad || e.ciudad,
                magistrado: en.magistrado || e.magistrado,
                secretario: en.secretario || e.secretario,
                materia: en.materia || e.materia,
                reglaSurtimiento: en.regla_surtimiento || e.reglaSurtimiento,
                surteEfectos: en.surte_efectos || e.surteEfectos,
                inhabilesResponsable: en.inhabiles_responsable || e.inhabilesResponsable,
                // Las fechas llegan en ISO con hora; el campo es un date.
                notificacion: (en.notificacion || '').slice(0, 10) || e.notificacion,
                presentacion: (en.presentacion || '').slice(0, 10) || e.presentacion,
            }));
            setVia('archivos');
            setPasoArchivos('formulario');
            setMaterial(null);
            setProblemas([]);
            setProyecto(null);
            /* ¿TERMINADO O A MEDIAS? Si el asunto ya tiene proyecto escrito se
               aterriza en SU PANTALLA —el aviso de borrador con sus avisos y su
               descarga—, que es lo que David pidió; si no, en el adelanto, con
               el botón rojo pendiente. */
            void traerGuardados(numero);
            // La huella se sella sola en cuanto la ficha recuperada esté puesta
            // (el efecto de abajo): aquí el `encargo` todavía es el de antes.
            setFichaDelAdelanto('');
            if (c.proyecto) {
                setPrevio(c.proyecto);
                setPaso('proyecto');
                irA('proyecto');
            } else {
                setPrevio(null);
                setPaso('adelanto');
                irA('recorrido');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : `No se pudo abrir el ${numero}.`);
        } finally { setCorriendo(false); }
    }, [correo]);

    const soltar = useCallback((rol: RolDocumento, f: File) => {
        setFicheros((p) => ({ ...p, [rol]: f }));
        setDocumentos((prev) => [
            ...prev.filter((d) => d.rol !== rol),
            { id: `${rol}-${f.name}`, nombre: f.name, rol, bytes: f.size, progreso: 100, estado: 'listo' },
        ]);
    }, []);

    const quitar = useCallback((id: string) => {
        setDocumentos((prev) => {
            const d = prev.find((x) => x.id === id);
            if (d) setFicheros((f) => ({ ...f, [d.rol]: undefined }));
            return prev.filter((x) => x.id !== id);
        });
    }, []);

    const falta = useMemo(() => {
        const f = faltaEnEncargo(encargo);
        // La plantilla NO se exige: hay una precargada por familia de asunto.
        // CON EL NOMBRE DEL TIPO. Decía «falta el acto reclamado» aunque el
        // secretario estuviera proyectando una revisión, donde lo que falta es
        // la sentencia recurrida.
        if (!ficheros.acto) f.push(voz?.recurrido ?? 'el acto reclamado');
        if (!ficheros.conceptos) f.push(`los ${voz?.combate ?? 'conceptos de violación'}`);
        return f;
    }, [encargo, ficheros, voz]);

    /* Se mira UNA VEZ, al entrar. Si no hay nada esperando, la tarjeta no
       aparece y la pantalla queda exactamente como estaba. */
    /* SE VUELVE A MIRAR AL REGRESAR A LA PESTAÑA.
       Mirarlo sólo al cargar era un fallo de verdad: el secretario abre el
       taller, se va a SISE, manda las constancias y vuelve… a la misma
       pantalla vacía, porque nadie preguntó otra vez. Le pasó a David con las
       constancias del 91/2025 ya enviadas. */
    const [mirando, setMirando] = useState(false);
    const mirarPendientes = useCallback(async () => {
        if (!correo) return;
        setMirando(true);
        try {
            const ps = await sisePendiente(correo);
            setPendientes(ps);
            setElegido((e) => e || (ps.length === 1 ? ps[0].numero : ''));
        } catch { /* que no haya expedientes no es un error */ }
        finally { setMirando(false); }
    }, [correo]);

    useEffect(() => { void mirarPendientes(); }, [mirarPendientes]);

    useEffect(() => {
        const alVolver = () => { if (!document.hidden) void mirarPendientes(); };
        window.addEventListener('focus', alVolver);
        document.addEventListener('visibilitychange', alVolver);
        return () => {
            window.removeEventListener('focus', alVolver);
            document.removeEventListener('visibilitychange', alVolver);
        };
    }, [mirarPendientes]);

    const pedirDesdeSISE = useCallback(async () => {
        if (!elegido) return;
        setError(''); setErrorSise(''); setCorriendo(true);
        try {
            const r = await generarDesdeExpediente(elegido, correo, fechaNotif);
            descargar(r);
            setExtemporanea(r.oportunidad === 'EXTEMPORANEA');
            if (r.oportunidad === 'EXTEMPORANEA') {
                setError('El cómputo da EXTEMPORÁNEA. Compruébalo antes de seguir: '
                       + 'si es correcto, el asunto no se resuelve en el fondo, '
                       + 'salvo que tú resuelvas otra cosa abajo.');
            }
            // El encargo se rellena con lo leído para que los pasos siguientes
            // —y el documento final— lleven el número y la ponencia correctos.
            setEncargo((e) => ({ ...e, numero: elegido }));
            setSabemos(null);
            setPaso('adelanto');
            setFichaDelAdelanto(huellaFicha);
            void traerContexto(elegido);
        } catch (e) {
            if (e instanceof NecesitaNotificacion) {
                // No es un fallo: es el servidor diciendo qué falta y
                // enseñando todo lo que ya sabe. Se pinta, no se tira.
                setSabemos(e.datos);
            } else {
                setErrorSise(e instanceof Error ? e.message : 'No se pudo generar desde SISE.');
            }
        } finally { setCorriendo(false); }
    }, [elegido, correo, fechaNotif]);

    const borrarYOtro = useCallback(async () => {
        if (!confirmaBorrar) { setConfirmaBorrar(true); return; }
        setError('');
        try {
            if (elegido) await descartarPendiente(elegido, correo);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo borrar el expediente.');
            setConfirmaBorrar(false);
            return;
        }
        setPendientes((ps) => ps.filter((p) => p.numero !== elegido));
        setElegido('');
        setSabemos(null);
        setConfirmaBorrar(false);
        // Y SIEMPRE SE VUELVE A SISE, que es de donde se toma el siguiente.
        window.open(URL_SISE, '_blank', 'noopener');
    }, [confirmaBorrar, elegido, correo]);

    const pedirAdelanto = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            const r = await generarAdelanto(
                { ...encargo, reglaSurtimiento: encargo.reglaSurtimiento,
                  // EL TIPO LO ELIGE EL SECRETARIO, NO SE DEDUCE DE UN
                  // INTERRUPTOR. Esta línea decía
                  // `encargo.esRecurso ? 'amparo_revision' : 'amparo_directo'`,
                  // así que una QUEJA o una REVISIÓN FISCAL eran imposibles de
                  // pedir desde la pantalla: el interruptor sólo alternaba
                  // entre amparo directo y amparo en revisión. Todo el trabajo
                  // hecho para esos dos tipos era inalcanzable para un
                  // secretario y sólo existía desde una petición a mano.
                  tipoAsunto: encargo.tipoAsunto,
                  // El documento se escribe entero. La ruta de plantilla queda
                  // sólo para quien suba la suya a propósito.
                  modo: ficheros.plantilla ? 'plantilla' : 'generado' },
                { plantilla: ficheros.plantilla, acto: ficheros.acto!, conceptos: ficheros.conceptos! },
                correo,
            );
            descargar(r);
            if (r.oportunidad === 'EXTEMPORANEA') {
                setError('El cómputo da EXTEMPORÁNEA. Compruébalo antes de seguir: si es correcto, el asunto no se resuelve en el fondo.');
            }
            setPaso('adelanto');
            setFichaDelAdelanto(huellaFicha);
            autoLanzado.current = false;
            void traerContexto(encargo.numero);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo generar el adelanto.');
        } finally { setCorriendo(false); }
    }, [encargo, ficheros, correo]);

    const pedirAcervo = useCallback(async (usarContexto: boolean = true) => {
        setError(''); setCorriendo(true);
        try {
            /* EL CONTEXTO VA EN LA BÚSQUEDA, no después de ella.
               David: «primero debe presentarse todo el contexto jurídico y
               después buscar la solución; así el sistema va a tener mejor
               capacidad de buscar jurisprudencia o las normas aplicables».
               Hasta ahora este texto sólo se pedía DESPUÉS de proponer, y sólo
               si alguna propuesta no alcanzaba. */
            if (usarContexto && contexto.trim()) {
                await aportarContexto(correo, null, contexto, encargo.numero)
                    .catch(() => { /* si no se pudo guardar, igual viaja abajo */ });
            }
            const m = await consultarAcervo(encargo.numero, correo,
                                            'leyes_queretaro', usarContexto ? contexto : '');
            setMaterial(m);
            const candidatos = m.tesis.slice(0, 4).map((t) => ({
                tipo: 'tesis' as const, registro: t.registro, rubro: t.rubro,
                instancia: t.instancia,
                porQue: t.obligatoria
                    ? 'Jurisprudencia obligatoria del tema: vincula a este Tribunal.'
                    : 'Tesis orientadora: ilustra, no vincula.',
                verificado: true,
            }));
            /* LA PREGUNTA GLOBAL NO ES UN PLANTEAMIENTO MÁS.
               Se colaba al frente de la lista como el «01» y el secretario
               tenía que calificarla junto a los temas reales: trabajo doble, y
               dos marcas que podían contradecirse —global infundado con un
               tema fundado— sin que la pantalla dijera cuál mandaba. Además
               inflaba el contador («1 de 4 sin calificar») y con ello retenía
               la tarjeta final por una pregunta que no se califica aquí.
               La vía global viaja por su cuenta: sentido global y su razón. */
            setProblemas([
                ...m.problemas.map((p, i) => ({
                    id: `p${i}`, pregunta: p.pregunta, resolvio: p.resolvio,
                    combate: p.combate,
                    impedimento: p.impedimento ?? undefined,
                    candidatos, criterio: '',
                })),
            ]);
            setPaso('acervo');
            irA('recorrido');
            /* Y SEGUIDO, LA PROPUESTA. Antes el botón sólo consultaba y el paso 3
               salía vacío —«el motor no se atrevió»— hasta pulsar «Volver a
               pedir la propuesta»: dos clics para una cosa, y el primero no
               enseñaba nada. Ahora consultar es proponer. */
            if (m.problemas.length > 0) {
                await pedirPropuestaRef.current?.({ sinContexto: !usarContexto });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo consultar el acervo.');
        } finally { setCorriendo(false); }
    }, [encargo.numero, correo, contexto]);
    pedirAcervoRef.current = pedirAcervo;

    /* LO QUE EL SECRETARIO TOCA A MANO NO SE PISA NUNCA MÁS.
       Sin esta lista no había forma de distinguir un sentido que él eligió de
       uno que rellenó la propuesta, y por eso se perdía el suyo: David marcó
       INFUNDADO el concepto de la pericial declarada desierta y el proyecto
       salió FUNDADO. */
    const [tocados, setTocados] = useState<Set<string>>(new Set());
    /* LOS DE AHORA, para lo que llega tarde (revisión adversarial,
       26-sep-2026). `pedirPropuesta` es un useCallback que no depende de
       `tocados`: leía los del pintado en que se armó —a menudo, ninguno—, y
       «Aporta y vuelve a proponer» volcaba el sentido del motor encima del
       principal que él acababa de marcar. Con el cambio de sentido era peor:
       el reparto que se rehace tras la propuesta leía el principal ya pisado,
       en la vía del motor, y no tumbaba nada. La máquina cambiaba su sentido. */
    const tocadosRef = useRef(tocados);
    tocadosRef.current = tocados;
    /* Y SI EL SENTIDO GLOBAL LO ELIGIÓ ÉL. La pantalla también lo fija sola al
       llegar la propuesta —con el sentido del MODELO—, y confundir las dos
       cosas es lo que hizo que David dictara «infundado global» y recibiera un
       proyecto que amparaba. */
    const [globalDictado, setGlobalDictado] = useState(false);
    /* SUBE cada vez que el secretario pide cambiar el sentido desde el
       proyecto terminado: la pantalla de decisión abre su panel de
       corrección al verlo subir. */
    const [vueltaCriterio, setVueltaCriterio] = useState(0);
    /* Los problemas cuya razón está redactando el motor ahora mismo. */
    const [razonando, setRazonando] = useState<Set<string>>(new Set());

    /* CON CADA CALIFICACIÓN, SU RAZÓN.
       No sustituye lo que el secretario haya escrito: sólo rellena el cuadro
       cuando está vacío. Si él ya razonó, manda lo suyo. */
    const pedirRazon = useCallback(async (id: string, pregunta: string, sentido: string) => {
        if (!encargo.numero || !sentido) return;
        setRazonando((prev) => new Set(prev).add(id));
        try {
            const r = await razonarSentido(encargo.numero, correo, pregunta, sentido);
            if (r) {
                setProblemas((prev) => prev.map((p) => {
                    if (p.id !== id) return p;
                    // LA RESPUESTA PUEDE LLEGAR TARDE. Si mientras se redactaba
                    // él marcó otra pastilla, esta razón ya no es de este
                    // sentido y no se escribe: llegar con retraso no da derecho
                    // a pisar lo que decidió después.
                    if (p.sentido !== sentido) return p;
                    // Y no se pisa lo suyo. El guardia de antes era
                    // `!p.criterio.trim()`, que además tiraba la razón nueva
                    // cuando había una vieja de la máquina.
                    if (p.criterio.trim() && p.razonDe && !p.razonDe.delMotor) return p;
                    return { ...p, criterio: r,
                             razonDe: { sentido, delMotor: true } };
                }));
            }
        } catch { /* si no sale, el secretario la escribe */ }
        finally {
            setRazonando((prev) => { const n = new Set(prev); n.delete(id); return n; });
        }
    }, [encargo.numero, correo]);

    const elegirGlobal = useCallback((s: string) => {
        setSentidoGlobal(s);
        setGlobalDictado(!!s);
    }, []);

    /* EL CRITERIO GLOBAL, REDACTADO EN PANTALLA (23-sep-2026).
       David, 711/2025: «al introducir manual la solución no me da la opción
       para generar el criterio en pantalla y ver cómo va a salir. Este es un
       fallo del pipeline». Por problema ya existía; en «todo el asunto» el
       secretario escribía dos líneas y tenía que generar el proyecto entero
       —cuatro minutos y una consulta— para ver qué hacía el motor con ellas.

       Se pide sobre el problema PRINCIPAL, que es el que decide, con el
       sentido global y lo que haya en el cuadro como directriz. Lo que vuelve
       SUSTITUYE el cuadro: es lo que él pidió ver, y puede corregirlo. */
    const [razonandoGlobal, setRazonandoGlobal] = useState(false);
    const razonarGlobal = useCallback(async () => {
        const pral = problemas.find((p) => (p.jerarquia ?? '') === 'principal') ?? problemas[0];
        if (!encargo.numero || !sentidoGlobal || !pral) return;
        setRazonandoGlobal(true);
        try {
            const r = await razonarSentido(encargo.numero, correo, pral.pregunta, sentidoGlobal, razonGlobal);
            if (r) setRazonGlobal(r);
            else setError('El motor no devolvió un criterio utilizable. Escríbelo tú o vuelve a intentarlo.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo redactar el criterio.');
        } finally { setRazonandoGlobal(false); }
    }, [encargo.numero, correo, problemas, sentidoGlobal, razonGlobal]);

    /* ═══ EL PRINCIPAL DICTA LA SUERTE DE LOS ACCESORIOS ═══
       David (22-sep-2026): «si cambio de sentido o el sentido de la resolución
       principal es uno, los accesorios caen por su propio peso cuando tienen
       estrecha relación o cuando a ningún fin práctico produce su análisis».

       Al cambiar la pastilla del PRINCIPAL se le pide al servidor el reparto
       —la misma regla que aplicará al generar— y los accesorios que él no
       marcó a mano se actualizan solos, con su razón y con la etiqueta
       «sigue al principal». Lo que él marcó no se toca: la regla vive en el
       servidor y aquí sólo se pinta. */
    const repartirRef = useRef<(id: string, valor: string) => Promise<void>>(async () => {});
    const repartirTrasCambio = useCallback((id: string, valor: string) => repartirRef.current(id, valor), []);
    const [avisosReparto, setAvisosReparto] = useState<string[]>([]);
    /* ═══ LOS TUMBADOS: RECALIFICAR CON LA PREMISA (26-sep-2026) ═══
       David: «si cambio sentido hay que tumbar y regenerar con la premisa del
       cambio de sentido». Si el principal va por la vía contraria a la que
       propuso el motor, el reparto devuelve tumbados los accesorios que él no
       tocó y traían la calificación de la otra vía. Sus ids viven aquí; la
       calificación nueva llega por `useRecalificacion`, más abajo, y se pinta
       ENCIMA —la base del problema no se toca: ver recalificacion.ts—. */
    const [pendientesRecal, setPendientesRecal] = useState<string[]>([]);
    /* El reparto en camino: hasta que conteste no se sabe qué se tumba, y ni
       se recalifica ni se pide el plan con lo de antes. */
    const [repartiendo, setRepartiendo] = useState(false);
    /* Cada reparto lleva su turno. Dos cambios seguidos del principal podían
       contestar en desorden, y el viejo, llegando tarde, repartía la suerte
       de un sentido que él ya había cambiado. */
    const turnoReparto = useRef(0);
    /* Sube tras una propuesta nueva con el principal marcado a mano: el
       reparto se rehace con los valores nuevos del motor (efecto de abajo). */
    const [repartoTrasPropuesta, setRepartoTrasPropuesta] = useState(0);
    /** Lo que cuelga de la recalificación se olvida con la decisión. */
    const olvidarRecalificacion = useCallback(() => {
        turnoReparto.current += 1;
        setRepartiendo(false);
        setPendientesRecal([]);
    }, []);
    repartirRef.current = async (id: string, valor: string) => {
        if (!encargo.numero || !valor) return;
        const esPrincipal = (problemas.find((p) => p.id === id)?.jerarquia ?? '') === 'principal'
            || (problemas[0]?.id === id && !problemas.some((p) => p.jerarquia === 'principal'));
        if (!esPrincipal) return;
        const criterios: CriterioEnviado[] = problemas.map((p) => ({
            problema: p.pregunta,
            sentido: p.id === id ? valor : (p.sentido ?? ''),
            razonamiento: p.criterio ?? '',
            jerarquia: p.jerarquia ?? 'accesorio',
            tocado: p.id === id || tocados.has(p.id),
        }));
        const mio = ++turnoReparto.current;
        setRepartiendo(true);
        try {
            const r = await repartirCriterios(encargo.numero, correo, criterios, propuesta?.global ?? null);
            if (mio !== turnoReparto.current) return;    // llegó tarde: manda el último cambio
            setAvisosReparto(r.avisos);
            const pend = idsPorRecalificar(problemas, r.criterios, id, tocados);
            setPendientesRecal(pend);
            setProblemas((prev) => aplicarReparto(prev, r.criterios,
                { excluir: id, tocados, pendientes: new Set(pend) }));
        } catch {
            /* si el reparto no sale, las pastillas se quedan como estaban; lo
               tumbado de antes ya no se sabe si sigue: al generar, el servidor
               aplica el árbol y recalifica igual. */
            if (mio === turnoReparto.current) setPendientesRecal([]);
        } finally {
            if (mio === turnoReparto.current) setRepartiendo(false);
        }
    };

    const cambiarCriterio = useCallback((id: string, campo: 'criterio' | 'sentido', valor: string) => {
        setProblemas((prev) => prev.map((p) => {
            if (p.id !== id) return p;
            if (campo !== 'sentido') {
                // Lo teclea él: desde ahora la razón es suya y no se toca.
                return { ...p, criterio: valor,
                         razonDe: { sentido: p.sentido || '', delMotor: false } };
            }
            /* ═══ AL CAMBIAR DE SENTIDO, LA RAZÓN DEL MOTOR SE VA ═══
               David: «si cambia de sentido debe borrarse lo generado y ser
               visible lo generado en otro sentido».

               Tenía toda la razón y era peor de lo que parecía: al marcar otra
               pastilla se pedía la razón nueva PERO no se borraba la vieja, y
               `pedirRazon` sólo escribía «si el criterio está vacío», así que
               la nueva se tiraba. El secretario se quedaba con un porqué que
               argumentaba lo contrario de lo que acababa de marcar, y el
               estudio se construía sobre ése.

               Lo que escribió la máquina se borra en el acto —antes de que
               llegue la razón nueva, para que no haya un segundo en que la
               pantalla diga una cosa y la pastilla otra—. Lo que escribió ÉL
               no se destruye nunca: se conserva y la ventana avisa de que se
               redactó para otro sentido, con un botón para reemplazarla. */
            const _s = valor as ProblemaJuridico['sentido'];
            const suya = p.criterio.trim() && p.razonDe && !p.razonDe.delMotor;
            if (suya) return { ...p, sentido: _s, de: 'tuya', porQue: '' };
            return { ...p, sentido: _s, criterio: '', razonDe: undefined, de: 'tuya', porQue: '' };
        }));
        if (campo === 'sentido' && valor) {
            setTocados((prev) => new Set(prev).add(id));
            void repartirTrasCambio(id, valor);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    // LA PROPUESTA DE SOLUCIÓN. El motor sugiere el sentido de cada problema
    // con su razón y los registros que lo apoyan; el secretario la acepta tal
    // cual, la edita o dicta el suyo. Sin este paso el proyecto salía con la
    // calificación que trajera la plantilla, y así nacían las incongruencias.
    /* ═══════════════════════════════════════════════════════════════════════
       EL CAMINO DE UN SOLO BOTÓN
       ═══════════════════════════════════════════════════════════════════════
       David: «una opción con un botón amarillo desde el principio que diga
       "Genera todo el proyecto" y abajo, con letras más pequeñas, "Se decide por
       jurimetría. No recomendado". Una vez que se tengan los documentos, el
       proyecto se genera solo conforme a lo que considere acertado. Si el
       secretario decide arriesgar sus consultas sin supervisión, dejémoslo —
       pero queda expuesto a tenerlo que cambiar».

       NO SE ENCADENAN LOS CALLBACKS DE LA PANTALLA, y no es un capricho: cada
       paso lee el estado que puso el anterior, y en React ese estado todavía no
       ha llegado cuando el siguiente arranca. Llamar a `pedirAcervo` y después a
       `pedirPropuesta` daría una propuesta sobre una lista de problemas vacía.
       Aquí los cuatro resultados viajan en variables locales y el estado se
       actualiza al paso, sólo para que la pantalla acompañe.

       EL SENTIDO LO DECIDE EL MOTOR, que es lo que hace este camino distinto:
       se manda lo que la propuesta calificó, sin que nadie lo revise. Es
       exactamente el riesgo que David acepta ofrecer. */
    const generarTodo = useCallback(async () => {
        setError(''); setCorriendo(true); setAvance('');
        try {
            // 1 · el adelanto: los dos PDF leídos, la ficha y los problemas.
            const ade = await generarAdelanto(
                { ...encargo, tipoAsunto: encargo.tipoAsunto,
                  modo: ficheros.plantilla ? 'plantilla' : 'generado' },
                { plantilla: ficheros.plantilla, acto: ficheros.acto!,
                  conceptos: ficheros.conceptos! },
                correo);
            descargar(ade);
            setPaso('adelanto');
            setFichaDelAdelanto(huellaFicha);
            autoLanzado.current = false;
            void traerContexto(encargo.numero);

            /* EL CÓMPUTO EXTEMPORÁNEO AVISA, NO FRENA.
               Aquí se paraba en seco: «se paró aquí (…) no hay proyecto que
               generar». El razonamiento era que en este camino no hay nadie
               leyendo el aviso. Pero quien pulsa «Genera todo el proyecto» ya
               decidió seguir, y David lo ha pedido cuatro veces con las mismas
               palabras: «a pesar del aviso de extemporaneidad, si el secretario
               decide continuar con el estudio el redactor debe entregar el
               proyecto». Un motor que se planta deja al secretario con dos PDF
               leídos y nada escrito, que es justo lo que pasó con la revisión
               fiscal 2/2026.
               El cómputo NO se maquilla: la ejecutoria sigue diciendo lo que
               dice, el aviso viaja pegado al proyecto y el servidor reserva la
               oportunidad cuando nadie califica el fondo. Lo que cambia es que
               el trabajo se entrega y la última palabra es del secretario. */
            if (ade.oportunidad === 'EXTEMPORANEA') {
                setExtemporanea(true);
                setError('EL CÓMPUTO DA EXTEMPORÁNEA y aun así se generó el '
                       + 'proyecto, con el sentido que propuso el motor. '
                       + 'Compruébalo antes de firmar: si el cómputo es '
                       + 'correcto, el recurso no se estudia en el fondo y lo '
                       + 'que procede es desecharlo. Si no lo es, corrige la '
                       + 'fecha de notificación o declara los días en que la '
                       + 'responsable no laboró, y vuelve a generarlo.');
            }

            // 2 · el acervo. El contexto se guarda antes de buscar, igual que
            //     en el camino largo: es lo que afina la búsqueda.
            if (contexto.trim()) {
                await aportarContexto(correo, null, contexto, encargo.numero)
                    .catch(() => { /* si no se guarda, igual viaja abajo */ });
            }
            const mat = await consultarAcervo(encargo.numero, correo,
                                              'leyes_queretaro', contexto);
            setMaterial(mat);
            /* Se arman igual que en el camino largo: si este atajo acaba
               cayendo a la pantalla de criterio —porque el motor no se atrevió—,
               el secretario la encuentra completa y no a medias. */
            const cands = mat.tesis.slice(0, 4).map((t) => ({
                tipo: 'tesis' as const, registro: t.registro, rubro: t.rubro,
                instancia: t.instancia,
                porQue: t.obligatoria
                    ? 'Jurisprudencia obligatoria del tema: vincula a este Tribunal.'
                    : 'Tesis orientadora: ilustra, no vincula.',
                verificado: true,
            }));
            const probs = mat.problemas.map((q, i) => ({
                id: `p${i}`, pregunta: q.pregunta, resolvio: q.resolvio,
                combate: q.combate, impedimento: q.impedimento ?? undefined,
                candidatos: cands, criterio: '',
            }));
            setProblemas(probs);
            setPaso('acervo');

            // 3 · la propuesta: aquí decide el motor.
            const pro = await proponerSolucion(encargo.numero, correo, contexto);
            setPropuesta(pro);

            // 4 · y se resuelve con lo que él propuso, sin revisión.
            const VALIDOS = ['fundado', 'esencialmente_fundado',
                             'sustancialmente_fundado', 'parcialmente_fundado',
                             'fundado_insuficiente', 'infundado', 'inoperante',
                             'inatendible', 'ineficaz', 'sin_materia'];
            /* NO SE MANDAN: sólo se cuentan. Sirven para saber si el motor se
               atrevió con algo; el reparto lo hace el servidor con las mismas
               propuestas, que ya guardó. */
            const criterios = probs.map((q, i) => {
                const sug = pro.propuestas[i];
                if (!sug || !sug.alcanza || !VALIDOS.includes(sug.sentido || ''))
                    return null;
                return {
                    problema: q.pregunta, sentido: sug.sentido,
                    razonamiento: sug.razon ?? '',
                    jerarquia: sug.jerarquia ?? 'accesorio',
                    prediccion: sug.prediccion ?? {},
                };
            }).filter(Boolean);
            if (!criterios.length && !pro.global?.alcanza) {
                // EL MOTOR NO SE ATREVIÓ, así que este camino tampoco. Se deja
                // al secretario en la ventana de criterio con todo cargado, que
                // es donde habría llegado por el camino largo.
                setModo('por_problema');
                setError('El motor no pudo decidir el sentido de ningún '
                       + 'planteamiento con el material de este asunto. No se '
                       + 'generó nada: el criterio te toca a ti, y lo tienes '
                       + 'todo cargado más abajo.');
                irA('criterio', 400);
                return;
            }
            const rg = await resolverEnVivo(
                encargo.numero, correo,
                pro.global?.alcanza
                    ? { sentidoGlobal: pro.global.sentido,
                        razonGlobal: pro.global.razon,
                        globalDictado: false,
                        globalJson: JSON.stringify(pro.global),
                        resolvioDeclarado: pro.global.contexto?.resolvio ?? '',
                        responsable: encargo.responsable,
                        contexto,
                        // La variante que eligió en casa vale también para el
                        // atajo: un mismo navegador no mide con dos prompts.
                        varianteEstudio: esCasa ? varianteEstudio : '' }
                    : { porJurimetria: true,
                        responsable: encargo.responsable, contexto,
                        varianteEstudio: esCasa ? varianteEstudio : '' },
                (t) => { avanzarFase('texto'); setAvance((x) => x + t); },
                () => setAvance((x) => x + '\n\n… componiendo el documento'),
                () => avanzarFase('ordenando'),
                () => avanzarFase('recalificando'),
                () => avanzarFase('recalificado'));
            setProyecto(rg);
            descargarProyecto(rg);
            void traerGuardados(encargo.numero);
            setPaso('proyecto');
            irA('proyecto', 400);
        } catch (e) {
            setError(e instanceof Error ? e.message
                   : 'No se pudo generar el proyecto completo.');
        } finally { setCorriendo(false); setFaseSrv('preparando'); }
    }, [encargo, ficheros, correo, contexto, traerContexto, traerGuardados, esCasa, varianteEstudio, avanzarFase]);

    const pedirPropuesta = useCallback(async (opts?: { sinContexto?: boolean; contextoTexto?: string }) => {
        setError(''); setCorriendo(true); setProponiendo(true);
        try {
            // EL CONTEXTO RECIÉN APORTADO viaja por argumento: `setContexto`
            // es asíncrono y el estado de esta función es el de antes.
            const p = await proponerSolucion(encargo.numero, correo,
                                             opts?.sinContexto ? '' : (opts?.contextoTexto ?? contexto));
            setPropuesta(p);
            /* SE ENTRA DIRECTO A LA DECISIÓN, con la propuesta del motor ya
               puesta. Es lo que automatiza el trabajo: el caso frecuente es
               seguirla, y el secretario llega a una pantalla que ya dice cómo
               se resuelve, por qué, y qué pasa con cada tema. Si no está de
               acuerdo, la vía contraria está a un clic.
               Antes caía en 'acervo', que es el volcado de tesis: la pantalla
               donde se perdía. */
            // La propuesta llegó: ahí es donde toca leer y decidir.
            irA('criterio', 500);
            if (p.global?.alcanza) {
                setModo('global');
                setSentidoGlobal(p.global.sentido || '');
                // Lo pone la pantalla, no él: es un eco del motor.
                setGlobalDictado(false);
                setRazonGlobal(p.global.razon || '');
            } else {
                // SIN PROPUESTA GLOBAL NO HAY CAMINO GLOBAL QUE OFRECER: se cae
                // al de problema por problema, que es el que siempre funciona.
                // Antes caía en «acervo», que era el volcado de tesis y ya no
                // existe como modo.
                setModo('por_problema');
            }
            /* LO TUMBADO ERA DE LA PROPUESTA ANTERIOR. Con los valores nuevos
               del motor el reparto se rehace (si el principal lo marcó él) y
               dice otra vez qué se recalifica: ver el efecto
               `repartoTrasPropuesta`. */
            olvidarRecalificacion();
            // Se vuelca sobre los problemas para que se vean y se puedan editar.
            setProblemas((prev) => prev.map((q, i) => {
                const s = p.propuestas[i];
                // El sentido es una unión cerrada: lo que venga de fuera se
                // valida antes de entrar, no se castea a ciegas.
                const valido = (['fundado', 'esencialmente_fundado',
                                 'sustancialmente_fundado', 'parcialmente_fundado',
                                 'fundado_insuficiente', 'infundado', 'inoperante',
                                 'inatendible', 'ineficaz', 'sin_materia'] as const)
                    .find((x) => x === s?.sentido);
                // LA PREDICCIÓN Y LA JERARQUÍA SE VUELCAN SIEMPRE, alcance o
                // no la propuesta: son lo que el secretario necesita para
                // decidir, y perderlas aquí dejaría la tabla a medias —es el
                // fallo que ya costó una ronda en el servidor—.
                const base = { ...q, prediccion: s?.prediccion ?? q.prediccion,
                               jerarquia: (s?.jerarquia as 'principal' | 'accesorio')
                                          ?? q.jerarquia };
                // SI ÉL YA LO DECIDIÓ, LA PROPUESTA NO LO TOCA. Antes se
                // volcaba encima sin mirar, y «volver a proponer» borraba en
                // silencio lo que el secretario acababa de marcar.
                if (tocadosRef.current.has(q.id)) {
                    return { ...base, criterio: q.criterio || s?.razon || '' };
                }
                if (!(s && s.alcanza && valido)) return base;
                // LA RAZÓN SE VA CON EL SENTIDO. Al volver a proponer —tras
                // aportar la reclamación, en el 93/2026— el sentido nuevo
                // (infundado) se pegaba sobre la razón vieja (la del fundado).
                // Lo que escribió la máquina para otro sentido se tira; lo
                // que escribió ÉL no se destruye nunca.
                const suya = q.criterio.trim() && q.razonDe && !q.razonDe.delMotor;
                const mismaRazon = q.razonDe?.sentido === valido && q.criterio.trim();
                return { ...base, sentido: valido,
                         criterio: suya || mismaRazon ? q.criterio : s.razon,
                         razonDe: suya || mismaRazon ? q.razonDe : { sentido: valido, delMotor: true },
                         de: 'motor', porQue: '' };
            }));
            setRepartoTrasPropuesta((n) => n + 1);
            if (!p.propuestas.length) {
                setError('El motor no propuso ningún sentido. Dicta tu criterio.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo obtener la propuesta.');
        } finally { setCorriendo(false); setProponiendo(false); }
    }, [encargo.numero, correo, contexto, olvidarRecalificacion]);
    pedirPropuestaRef.current = pedirPropuesta;

    /* ═══ QUIERO CAMBIAR DE SENTIDO ═══
       David, 16-sep-2026: «si el secretario decide cambiar de sentido hay que
       retroceder y BORRAR TODO lo que muestra el taller. Recuerda que en este
       paso el secretario quiere volver a estudiar».

       El botón viejo —«cambiar el sentido y regenerar»— sólo hacía
       `setProyecto(null)`: quedaban en pantalla el estudio que se vio
       escribirse, los avisos del proyecto anterior, las calificaciones ya
       puestas y las razones escritas para el sentido que acaba de descartar.
       Volvía al paso de criterio con la mesa sin recoger.

       Se recoge la mesa: se borra el proyecto, el estudio en curso, los
       errores, lo que él marcó y las razones que el motor escribió para el
       sentido anterior. NO se borra el material del acervo —eso ya se
       consultó y se pagó— ni las preguntas del caso, que son las mismas. Y se
       vuelve a pedir la propuesta sola, para que llegue al paso de criterio
       con la clasificación otra vez puesta y pueda cambiarla. */
    const volverAEstudiar = useCallback(() => {
        setProyecto(null);
        setPrevio(null);
        setAvance('');
        setError('');
        setTocados(new Set());
        olvidarRecalificacion();
        setRazonando(new Set());
        setGrupos({});
        // Las razones por argumento eran de la decisión que se descarta.
        setRazonesDecididas({ numero: '', r: {} });
        setRazonGlobal('');
        setSentidoGlobal('');
        setGlobalDictado(false);
        setPropuesta(null);
        setMarcoEntero(false);
        setTesisAbierta(null);      // la ventana de una tesis, si quedó abierta
        setModo('por_problema');    // la vía de la vuelta anterior no manda en ésta
        // Las calificaciones y las razones del sentido anterior se van: son de
        // la decisión que acaba de descartar.
        setProblemas((ps) => ps.map((p) => ({
            ...p, sentido: undefined, criterio: '', razonDe: undefined,
        })));
        setPrevio(null);
        setPaso('acervo');
        setVueltaCriterio((v) => v + 1);
        irA('criterio', 120);
        // ── Y SE VUELVE A PROPONER SOLO, POR LA PUERTA QUE TOQUE ──
        // Hay DOS maneras de llegar aquí y no son iguales:
        //   · desde el proyecto recién hecho, el acervo y los planteamientos
        //     siguen en memoria: basta volver a proponer;
        //   · desde el historial, `reanudar` dejó el material vacío, y pedir
        //     la propuesta sin acervo da un 409 del servidor —«consulta
        //     primero el acervo: una propuesta sin material es una opinión»—.
        // Por eso se mira antes qué hay. El secretario no tiene por qué saber
        // por qué puerta entró.
        if (material && problemas.length > 0) {
            void pedirPropuesta();
        } else {
            void pedirAcervo();
        }
    }, [pedirPropuesta, pedirAcervo, material, problemas.length]);   // eslint-disable-line react-hooks/exhaustive-deps

    // AL TERMINAR, SE ABRE SOLA. Un segundo después de llegar el proyecto,
    // para que antes se vean el documento descargado y sus avisos.
    useEffect(() => {
        const v = proyecto?.version;
        if (!v || !encargo.numero) return;
        const clave = `${encargo.numero}|${v}`;
        if (opinadas.has(clave)) return;
        const t = setTimeout(() => setOpinion({ version: v }), 1200);
        return () => clearTimeout(t);
    }, [proyecto?.version, encargo.numero]);   // eslint-disable-line react-hooks/exhaustive-deps

    /* ═══════════════════════════════════════════════════════════════════════
       VOLVER ATRÁS Y SALIR: EL CAMINO NO ES DE UNA SOLA DIRECCIÓN
       ═══════════════════════════════════════════════════════════════════════
       David (22-sep-2026): «no es posible salir de un proyecto y volver a la
       ventana de historial (…) el usuario no puede corregir ni regresar a la
       etapa de adelanto con el click. Deberíamos dar libertad de regresar a
       los pasos y volver a generar».

       El espinazo pintaba los cuatro pasos y dejaba pulsar los hechos, pero
       `irAlPaso` sólo hacía scroll: el estado se quedaba donde estaba. Quien
       se equivocaba en una fecha, o quería releer el expediente con un
       documento más, no tenía más salida que recargar la página.

       Cada vuelta recoge SU mesa y nada más: volver a decidir no tira el
       acervo, que ya se consultó y se pagó; volver al adelanto no tira la
       ficha ni los documentos. Lo que cuesta se lee antes, en el diálogo. */
    const [vuelta, setVuelta] = useState<DestinoVuelta | null>(null);

    /** Lo que se borra en CUALQUIER vuelta atrás: lo que cuelga de la
     *  decisión. Ni el acervo ni la lectura del expediente. */
    const limpiarDecision = useCallback(() => {
        setProyecto(null);
        setPrevio(null);
        setAvance('');
        setError('');
        setPropuesta(null);
        setSuplenciaDecidida(null);
        setTocados(new Set());
        olvidarRecalificacion();
        setRazonando(new Set());
        setGrupos({});
        setRazonesDecididas({ numero: '', r: {} });
        setRazonGlobal('');
        setSentidoGlobal('');
        setGlobalDictado(false);
        setModo('por_problema');
        setMarcoEntero(false);
        setTesisAbierta(null);
        setAvisosReparto([]);
        setProblemas((ps) => ps.map((x) => ({
            ...x, sentido: undefined, criterio: '', razonDe: undefined,
            de: undefined, porQue: '',
        })));
    }, []);

    /** Volver al paso `n` de verdad. El 3 ya tenía su camino —«cambiar el
     *  sentido y regenerar»— y se reutiliza entero. */
    const volverAlPaso = useCallback((n: PasoDelEspinazo) => {
        if (n === 3) { volverAEstudiar(); return; }
        limpiarDecision();
        setMaterial(null);
        setProponiendo(false);
        setCorriendo(false);
        if (n === 2) {
            // La lectura del expediente se conserva: desde aquí se vuelve a
            // buscar en el acervo, o se regenera el adelanto si hace falta.
            setPaso('adelanto');
            irA('recorrido', 80);
            return;
        }
        // Paso 1: la ficha, para corregirla. Los documentos y lo tecleado se
        // quedan; el adelanto leído también, pero con el aviso de que un
        // cambio no entra hasta volver a generarlo.
        setPasoArchivos('formulario');
        setPaso('ficha');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [volverAEstudiar, limpiarDecision]);

    /** Salir del asunto y volver a la ventana de entrada: el historial con los
     *  asuntos en curso y la elección de por dónde empezar. No consume nada;
     *  el asunto vive en el servidor y se reanuda desde ahí. */
    const salirAlHistorial = useCallback(() => {
        limpiarDecision();
        setMaterial(null);
        setProblemas([]);
        setDelAsunto(null);
        setContexto('');
        setClaseContexto(null);
        setConstanciasAportadas(new Set());
        setConceptosViolacion('');
        setDecision(''); setMotivoDecision('');
        setExtemporanea(false);
        setGuardados(null);
        setFichado([]);
        setDocumentos([]);
        setFicheros({});
        setEncargo(ENCARGO_VACIO);
        setFichaDelAdelanto('');
        setPasoArchivos(null);
        setVia(null);
        setPaso('ficha');
        setProponiendo(false);
        setCorriendo(false);
        // El historial se relee: puede traer el asunto que se acaba de dejar.
        if (correo) {
            asuntosEnCurso(correo).then(setEnCurso).catch(() => {});
            estadoPiloto(correo).then(setPiloto).catch(() => {});
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [limpiarDecision, correo]);


    /* Qué es lo último que se aportó, para decirlo en pantalla: si fue la
       resolución que decidió una violación procesal, el motor la trata como
       la razón toral a confrontar. */
    const [claseContexto, setClaseContexto] = useState<{ clase: string; rotulo: string } | null>(null);

    /* ═══ EL PROBLEMA JURÍDICO SE CORRIGE ANTES DE DECIDIRLO ═══
       David (22-sep-2026): «Desde fijar si el problema jurídico es el correcto
       y dar la opción de modificarlo». Se corrige en la fuente —la fase 3 del
       servidor, persistida— y la propuesta se vuelve a pedir sobre la
       pregunta corregida: el contraste, la propuesta y el estudio se
       emparejan por el texto de la pregunta, así que editarla sólo aquí los
       habría dejado huérfanos. */
    const [editandoProblema, setEditandoProblema] = useState<string | null>(null);
    const corregirYProponer = useCallback(async (id: string, pregunta: string, jerarquia?: 'principal' | 'accesorio') => {
        const indice = problemas.findIndex((p) => p.id === id);
        if (indice < 0 || !encargo.numero) return;
        setError(''); setEditandoProblema(id);
        try {
            const r = await corregirProblema(encargo.numero, correo, indice, pregunta, jerarquia);
            setProblemas((prev) => prev.map((p, i) => {
                const q = r.problemas[i];
                if (!q) return p;
                return { ...p, pregunta: q.pregunta,
                         jerarquia: (q.jerarquia as 'principal' | 'accesorio') ?? p.jerarquia,
                         editada: q.editado || p.editada,
                         // La calificación era de la pregunta anterior.
                         sentido: undefined, criterio: '', razonDe: undefined, de: undefined, porQue: '' };
            }));
            setTocados(new Set());
            olvidarRecalificacion();
            setPropuesta(null);
            setSentidoGlobal(''); setGlobalDictado(false); setRazonGlobal('');
            setModo('por_problema');
            await pedirPropuestaRef.current?.({});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo corregir el problema jurídico.');
        } finally { setEditandoProblema(null); }
    }, [problemas, encargo.numero, correo]);

    /* Las constancias que ya se aportaron, por su nombre: la pantalla las
       tacha y el estudio las recibe rotuladas. */
    const [constanciasAportadas, setConstanciasAportadas] = useState<Set<string>>(new Set());

    const aportarYProponer = useCallback(async (doc: File | null, texto: string, etiqueta?: string) => {
        setError(''); setAportando(true);
        try {
            // CONTRA EL EXPEDIENTE. Sin `numero` el servidor no lo guardaba y
            // la búsqueda del acervo no se enteraba de lo aportado.
            const c = await aportarContexto(correo, doc, texto, encargo.numero, etiqueta || '');
            // SE ACUMULA, NO SE SUSTITUYE. Cada aporte reemplazaba al
            // anterior: la segunda constancia borraba la primera. Lo
            // aportado viaja entero con cada petición, así que aquí se
            // suma y se manda todo.
            const junto = contexto.trim() ? `${contexto.trim()}\n\n${c.texto}` : c.texto;
            setContexto(junto);
            if (etiqueta) setConstanciasAportadas((prev) => new Set(prev).add(etiqueta));
            setClaseContexto({ clase: c.clase, rotulo: c.rotulo });
            // POR LA MISMA PUERTA QUE LA PROPUESTA. Este camino tenía su propio
            // volcado: dejaba el modo global con el eco del motor ANTERIOR y
            // conservaba la razón vieja bajo el sentido nuevo. Una sola
            // manera de recibir una propuesta, y es `pedirPropuesta`.
            await pedirPropuestaRef.current?.({ contextoTexto: junto });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo leer el documento.');
        } finally { setAportando(false); }
    }, [correo, encargo.numero, contexto]);

    /* ═══ EL FORMULARIO DEL PROYECTO, EN UN SOLO SITIO (26-sep-2026) ═══
       Lo arma `armarOpciones` (components/sentencia/opcionesDelProyecto.ts,
       sin React, probado en comprobaciones/recalificar.mjs) y lo usan TRES
       llamadas: la que genera el proyecto, la que pide el plan del estudio
       (`pedirPlan`) y la que recalifica los tumbados (`recalificar`). El
       servidor busca el plan y la recalificación por una clave que sale de
       este formulario; si cada llamada lo armara a su manera, al generar no
       encontraría lo que el secretario vio en pantalla.

       Se lee por referencia, con el estado de AHORA. `pedirProyecto` es un
       useCallback cuya lista de dependencias no traía ni `grupos`, ni
       `conceptosViolacion`, ni `propuesta`: con «Estudiar juntos» sin puerta
       no se notaba, pero pegar los conceptos después del último cambio de
       sentido los mandaba vacíos. Leyendo por referencia no hay lista que
       olvidar. Devuelve null si en «todo el asunto» falta el sentido. */
    const opcionesDelProyecto = (formato: FormatoSentencia): OpcionesResolver | null => armarOpciones({
        modo, problemas, tocados, grupos, sentidoGlobal, razonGlobal, globalDictado, propuesta,
        conceptosViolacion, contexto,
        responsable: encargo.responsable,
        oportunidadDecision: decision,
        oportunidadMotivo: motivoDecision,
        suplencia,
        suplenciaPropuesta: delAsunto?.suplencia ?? null,
        razonesSegmento,
        varianteEstudio: esCasa ? varianteEstudio : '',
    }, formato);
    const opcionesRef = useRef(opcionesDelProyecto);
    opcionesRef.current = opcionesDelProyecto;

    const pedirProyecto = useCallback(async (formatoPedido?: FormatoSentencia) => {
        // LA FORMA DE LA SENTENCIA (David, 25-sep-2026): el botón de siempre
        // es la estándar; «versión moderna» es el segundo. Se normaliza aquí
        // porque un `onClick={pedirProyecto}` pasaría el evento del ratón.
        const formato: FormatoSentencia = formatoPedido === 'moderna' ? 'moderna' : 'estandar';
        const opciones = opcionesRef.current(formato);
        if (!opciones) {
            setError('Elige el sentido del problema principal.');
            return;
        }
        // EL AVANCE ARRANCA LIMPIO. Si se genera dos veces —cambiando el
        // criterio, que es lo normal—, lo que se veía escribirse era el
        // estudio nuevo pegado detrás del viejo.
        setError(''); setAvance(''); setCorriendo(true);
        /* «RECALIFICANDO LOS ACCESORIOS CON TU PREMISA…» (26-sep-2026): si
           quedaba alguno «Recalificando…» en pantalla, se dice desde ya —el
           servidor lo termina antes del plan y del estudio—, y también cuando
           el servidor manda el evento. Lo sustituye lo siguiente que pase:
           «ordenando», el primer trozo de texto, o que la recalificación
           termine (el evento «recalificado», o la de esta pantalla, que es la
           que el servidor espera; ver el efecto de abajo). */
        setFaseSrv(recalEnCursoRef.current ? 'recalificando' : 'preparando');
        const alRecalificar = () => avanzarFase('recalificando');
        const alRecalificado = () => avanzarFase('recalificado');
        /* «ORDENANDO EL ESTUDIO…» (Paso 2): con el plan encendido, el servidor
           espera o hace el plan de esta decisión antes de la primera línea.
           Se apaga con el primer trozo de texto. */
        const alOrdenar = () => avanzarFase('ordenando');
        try {
            if (modo === 'global') {
                // POR EL FLUJO, NO POR LA LLAMADA BLOQUEANTE. El servidor
                // tenía este camino escrito y nadie lo llamaba: todo salía por
                // /taller/resolver, que devuelve el .docx en una sola respuesta
                // al cabo de varios minutos. Medido el 7-sep-2026 en la
                // revisión 410/2026: el servidor TERMINÓ el trabajo dos veces
                // —«200 · 4,031 palabras», sin timeout ni traza— y la respuesta
                // no llegó. El proyecto existía y era inalcanzable.
                // SE BAJA AL ESTUDIO AL ARRANCAR. Estaba en el primer trozo,
                // que llega a los 61 segundos: el secretario se quedaba
                // mirando la pantalla anterior sin saber que ya se estaba
                // trabajando.
                irA('estudio', 200);
                const rg = await resolverEnVivo(
                    encargo.numero, correo, opciones,
                    (t) => { avanzarFase('texto'); setAvance((x) => x + t); },
                    () => setAvance((x) => x + '\n\n… componiendo el documento'),
                    alOrdenar, alRecalificar, alRecalificado);
                setProyecto(rg);
                descargarProyecto(rg);
                void traerGuardados(encargo.numero);
                setPaso('proyecto');
                // Terminó: al aviso de borrador, que es lo que hay que leer
                // ANTES de abrir el documento.
                irA('proyecto', 400);
                return;
            }
            const r = await resolverEnVivo(
                encargo.numero, correo, opciones,
                (t) => {
                    avanzarFase('texto');
                    setAvance((x) => {
                        // AL PRIMER TROZO, y sólo al primero: si se moviera en cada uno la
                        // pantalla temblaría durante los dos minutos que dura el estudio.
                        if (!x) irA('estudio', 120);
                        return x + t;
                    });
                },
                () => setAvance((x) => x + '\n\n… componiendo el documento'),
                alOrdenar, alRecalificar, alRecalificado);
            setProyecto(r);
            descargarProyecto(r);
            irA('proyecto', 400);
            setPaso('proyecto');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo redactar el proyecto.');
            /* EL ERROR SE VE. La pantalla había bajado al estudio; el aviso
               vive arriba. Si el servidor se negó porque quedaron accesorios
               sin calificar tras el cambio de sentido, la lista está ahí. */
            irA('error-del-taller', 200);
        } finally { setCorriendo(false); setFaseSrv('preparando'); }
    }, [encargo.numero, correo, modo, irA, traerGuardados, avanzarFase]);

    /* ═══ LA RECALIFICACIÓN DE LOS TUMBADOS, PEDIDA DESDE LA PANTALLA ═══
       Sólo en «problema por problema», que es donde el principal se cambia
       con su pastilla y se pide el reparto. En «todo el asunto» la
       calificación global es la brocha del secretario y el contrato no
       recalifica lo que ella cubre; en el atajo del motor no hay cambio de
       sentido. Si aun así el servidor recalifica al generar, el evento
       «recalificando» lo dice en el flujo. */
    const principalRecal = problemas.find((p) => (p.jerarquia ?? '') === 'principal') ?? problemas[0];
    const vivosRecal = modo === 'por_problema' && principalRecal
        ? pendientesVivos(problemas, pendientesRecal, tocados, principalRecal.id) : [];
    const claveRecal = claveRecalificacion(principalRecal, vivosRecal,
        suplencia?.confirmada ? JSON.stringify([suplencia.fraccion, suplencia.aFavorDe]) : '');
    const enlaceRecal: EnlaceRecalificacion = {
        activo: !!claveRecal && !repartiendo && !!encargo.numero,
        clave: claveRecal,
        // Eligió sentido y no hay razón (ni se está redactando): enseguida.
        inmediato: !(principalRecal?.criterio ?? '').trim(),
        pedir: (signal) => {
            const o = opcionesRef.current('estandar');
            return o ? recalificar(encargo.numero, correo, o, signal)
                     : Promise.reject(new Error('Falta el sentido del problema principal.'));
        },
    };
    /* LA RAZÓN DEL PRINCIPAL ESTÁ QUIETA si el motor no la está redactando:
       pedir antes gastaría una llamada con la razón que está por llegar. Y no
       se pide mientras se genera o se propone. */
    const recal = useRecalificacion(enlaceRecal,
        !(principalRecal && razonando.has(principalRecal.id)) && !corriendo && !proponiendo);
    const superpuestas = superposicion(vivosRecal, recal, claveRecal);
    const recalEnCurso = recalificacionEnCurso(superpuestas, repartiendo && modo === 'por_problema');
    recalEnCursoRef.current = recalEnCurso;
    /* LA RECALIFICACIÓN DE ESTA PANTALLA TERMINÓ MIENTRAS SE GENERA. La que
       pidió esta pantalla sigue en camino con la misma premisa que el
       servidor espera —el hook no corta lo que ya va con ESTA clave—, así que
       cuando llega, la del servidor también terminó. Sin plan no hay
       «ordenando», y el rótulo se quedaba en «Recalificando…» el minuto que
       tarda el primer texto (revisión adversarial, 26-sep-2026). */
    const recalAntesRef = useRef(false);
    useEffect(() => {
        if (corriendo && recalAntesRef.current && !recalEnCurso) avanzarFase('recalificado');
        recalAntesRef.current = recalEnCurso;
    }, [recalEnCurso, corriendo, avanzarFase]);
    const avisosRecal = recal.clave === claveRecal && recal.respuesta ? recal.respuesta.avisos : [];
    /* Los avisos de /taller/recalificar son los del árbol de ESTE formulario
       con lo recalificado aplicado, más los de la recalificación: sustituyen a
       los del reparto, que se quedaban diciendo «SE RECALIFICAN CON TU
       PREMISA… el motor los vuelve a calificar» junto a lo ya recalificado, y
       repetían cada aviso del árbol dos veces (revisión adversarial,
       26-sep-2026). */
    const avisosRepartoVigentes = avisosRecal.length ? [] : avisosReparto;
    /* «SIN CAMBIOS»: el servidor no halló nada que recalificar —la lista de
       tumbados de esta pantalla era de un reparto anterior—. Lo que devuelve
       es un reparto como cualquier otro: se aplica y los pendientes se van. */
    const sinCambios = recal.fase === 'listo' && recal.clave === claveRecal
        && recal.respuesta?.estado === 'sin_cambios' ? recal.respuesta : null;
    useEffect(() => {
        if (!sinCambios || !principalRecal) return;
        setProblemas((prev) => aplicarReparto(prev, sinCambios.criterios,
            { excluir: principalRecal.id, tocados, pendientes: new Set() }));
        setPendientesRecal([]);
    }, [sinCambios]); // eslint-disable-line react-hooks/exhaustive-deps
    /* TRAS UNA PROPUESTA NUEVA, si el principal lo marcó él, el reparto se
       rehace con los valores nuevos del motor: son de la vía del motor, y si
       él va por la contraria, hay que tumbarlos otra vez. */
    useEffect(() => {
        if (!repartoTrasPropuesta || !principalRecal?.sentido) return;
        if (!tocados.has(principalRecal.id)) return;
        void repartirRef.current(principalRecal.id, principalRecal.sentido);
    }, [repartoTrasPropuesta]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ═══ EL PLAN DEL ESTUDIO, PEDIDO DESDE LA PANTALLA DE DECISIÓN ═══
       La firma es el formulario que se mandaría AHORA con el botón de siempre
       (estándar): cuando cambia —un sentido, una razón, un grupo, la
       suplencia, una razón por argumento—, el plan que hay deja de ser el de
       esta decisión y el panel lo pide otra vez, con antirrebote. Sólo se
       calcula si la cuenta escribe con plan: armar y serializar el
       formulario en cada pintado no le cuesta nada a quien no lo usa. */
    const firmaPlan = useMemo(() => {
        if (!usaPlan) return '';
        const o = opcionesDelProyecto('estandar');
        return o ? JSON.stringify(o) : '';
    }, [usaPlan, problemas, tocados, grupos, modo, sentidoGlobal, razonGlobal, globalDictado,  // eslint-disable-line react-hooks/exhaustive-deps
        propuesta, conceptosViolacion, contexto, encargo.responsable, decision, motivoDecision,
        suplencia, delAsunto, razonesSegmento, varianteEstudio, esCasa]);
    const enlacePlan: EnlacePlan = {
        activo: usaPlan && !!encargo.numero,
        /* Con tumbados, la firma lleva también cómo va cada uno: cuando llega
           su recalificación el formulario no cambia (la base no se toca) y el
           plan tiene que pedirse otra vez (ver recalificacion.ts). */
        firma: firmaConRecalificacion(firmaPlan, vivosRecal, superpuestas),
        pedir: () => {
            const o = opcionesRef.current('estandar');
            return o ? pedirPlan(encargo.numero, correo, o)
                     : Promise.reject(new Error('Falta el sentido del problema principal.'));
        },
        leer: () => leerPlan(encargo.numero, correo),
    };

    const asunto: Asunto = useMemo(() => ({
        numero: encargo.numero || '—',
        tipo: (encargo.tipoAsunto || 'amparo_directo') as Asunto['tipo'],
        quejoso: encargo.quejoso || '—',
        magistrado: encargo.magistrado, secretario: encargo.secretario,
        autoridades: [], actoReclamado: '',
        oportunidad: {
            notificacion: encargo.notificacion, presentacion: encargo.presentacion,
            plazo: encargo.plazo, enTiempo: true,
        },
    }), [encargo]);

    if (authLoading) {
        return <div className="grid min-h-screen place-items-center bg-charcoal-900">
            <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
        </div>;
    }

    const sinAcceso = piloto && !piloto.tiene_acceso;

    /* ═══ LA FICHA, LOS DOCUMENTOS Y LA PLANTILLA, UNA SOLA VEZ ═══
       Se pintan dentro del paso 1 mientras se está en él, y después quedan
       plegados en el raíl —para leer y comprobar, no para volver a empezar—. */
    const fichaJsx = (
        <FormularioEncargo valor={encargo} onCambiar={setEncargo} onTipo={setTipoSel}
                                           deshabilitado={corriendo || paso !== 'ficha'}
                                           activa={paso === 'ficha' && via === 'archivos'
                                                   && !(!!encargo.numero && !!encargo.tipoAsunto)}
                                           delAuto={pasoArchivos === 'admision'}
                                           onDelAuto={(v) => setPasoArchivos(v ? 'admision' : 'formulario')} />
    );
    const documentosJsx = (
        <PanelDocumentos documentos={documentos} onSoltar={soltar} onQuitar={quitar}
                                         extractos={[]} vocabulario={voz}
                                         activa={paso === 'ficha' && via === 'archivos'
                                                 && !!encargo.numero && !!encargo.tipoAsunto
                                                 && documentos.length < 2} />
    );
    const plantillaJsx = (
        <label className={cn('block cursor-pointer rounded-xl border border-dashed',
                        'border-white/20 bg-white/[0.02] px-4 py-3 text-[13px] text-white/60',
                        'transition hover:border-accent-gold/30 hover:text-white/75')}>
                        <input type="file" accept=".docx" className="hidden"
                               onChange={(e) => e.target.files?.[0] &&
                                   setFicheros((p) => ({ ...p, plantilla: e.target.files![0] }))} />
                        {ficheros.plantilla
                            ? <>Plantilla propia: <span className="text-white/75">{ficheros.plantilla.name}</span></>
                            : <>Se usará la plantilla del tribunal ya cargada. Sube una .docx sólo si quieres otra.</>}
                    </label>
    );
    const pasoEspinazo: PasoDelEspinazo =
        paso === 'ficha' ? 1 : paso === 'adelanto' ? 2 : paso === 'proyecto' ? 4 : 3;
    const hechosEspinazo = ([1, 2, 3, 4] as PasoDelEspinazo[]).filter((n) => n < pasoEspinazo);
    /* ADELANTE TAMBIÉN SE ANDA. Al volver al paso 1 para corregir la ficha, los
       pasos 2, 3 y 4 quedaban cerrados aunque su trabajo siguiera intacto: el
       secretario tenía que repetir cuatro minutos de lectura para volver a
       donde estaba. Se abre lo que TIENE contenido —el adelanto leído, el
       acervo consultado, el proyecto escrito—, y hacia adelante no se pregunta
       nada porque no se pierde nada. */
    const abiertosEspinazo = ([
        delAsunto ? 2 : 0,
        (material && problemas.length > 0) ? 3 : 0,
        (proyecto || previo) ? 4 : 0,
    ].filter((n) => n && n > pasoEspinazo) as PasoDelEspinazo[]);
    const irAlPaso = (n: PasoDelEspinazo) => {
        /* HACIA ATRÁS SE PREGUNTA; hacia el paso en curso sólo se baja. Volver
           deshace trabajo hecho y, al generar otra vez, consume un proyecto
           del contador: eso se lee antes de pulsar, no después. */
        if (n !== 4 && n < pasoEspinazo) { setVuelta(n); return; }
        if (n > pasoEspinazo) {
            // Volver a donde ya se había llegado: gratis y sin preguntar.
            if (n === 2 && delAsunto) setPaso('adelanto');
            if (n === 3 && material && problemas.length > 0) setPaso('acervo');
            if (n === 4 && (proyecto || previo)) setPaso('proyecto');
        }
        if (n === 1) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        irA(['', 'recorrido', 'criterio', 'proyecto'][n - 1], 80);
    };

    return (
        <div className="min-h-screen bg-charcoal-950 font-sans text-white antialiased">
            {/* ═══ LA PROFUNDIDAD DEL FONDO ═══
                David: «colores más profundos». El suelo era #1a1a1a plano y las
                tarjetas se pintan con bg-white/[0.035] —#232323—: trece puntos
                de diferencia. Con ese desnivel nada parece levantado y la
                pantalla se lee chata por mucho que se ordenen las tarjetas.

                Ahora el suelo es casi negro con un sesgo cálido, y encima van
                DOS capas que no se ven pero se notan: un halo dorado arriba
                —que ya estaba— y una veladura que aclara muy poco el centro
                de la página, de modo que los bordes caen a oscuro. Es lo que
                hace que el contenido parezca estar delante del fondo en vez de
                pegado a él. Ninguna de las dos tiene color propio: son el mismo
                oro y el mismo blanco de la casa, muy diluidos. */}
            <div aria-hidden className="pointer-events-none fixed inset-0"
                 style={{ background:
                     'radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.035) 0%, transparent 60%)' }} />
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[460px] opacity-[0.6]"
                 style={{ background: 'radial-gradient(70% 100% at 50% 0%, rgba(201,169,98,0.13) 0%, transparent 70%)' }} />

            <div aria-hidden className="taller-aurora"><i /><i /><i /></div>
            <BarraSuperior asunto={asunto} proyectos={piloto?.proyectos} />
            <AvisoDeInicio texto={profile?.aviso_inicio} />

            {/* LA PUERTA DE VOLVER ATRÁS. Dice qué se conserva, qué se pierde y
                qué se consume; sin aceptar, no se mueve nada. */}
            <ConfirmarVolver destino={vuelta}
                             restantes={piloto?.proyectos?.restantes}
                             sinLimite={piloto?.proyectos?.sin_limite}
                             corriendo={corriendo}
                             onCancelar={() => setVuelta(null)}
                             onAceptar={() => {
                                 const d = vuelta;
                                 setVuelta(null);
                                 if (d === 'historial') salirAlHistorial();
                                 else if (d) volverAlPaso(d);
                             }} />

            <main className={cn(
                'relative mx-auto grid max-w-[1500px] gap-4 px-4 py-5 sm:px-6',
                /* SIN CAMINO ELEGIDO NO HAY DOS COLUMNAS QUE REPARTIR: la
                   elección ocupa el ancho y se lee de una vez. En cuanto se
                   elige, vuelve la retícula de trabajo de siempre. */
                (paso !== 'ficha' || via || pendientes.length > 0)
                    ? 'lg:grid-cols-[minmax(320px,400px)_1fr]'
                    : 'lg:grid-cols-1')}>
                <div className="flex flex-col gap-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto lg:pr-1">
                    {(paso !== 'ficha' || via || pendientes.length > 0) && (
                        <Espinazo activo={pasoEspinazo} hechos={hechosEspinazo}
                                  abiertos={abiertosEspinazo}
                                  corriendo={corriendo} onIr={irAlPaso}
                                  onSalir={() => setVuelta('historial')}
                                  nota={<><span className="text-white/60">Un paso a la vez.</span> Puedes volver
                                        a un paso hecho para corregir y generar de nuevo; se te dirá antes qué
                                        se pierde y qué cuesta.</>} />
                    )}
                    {piloto && !piloto.proyectos?.sin_limite && (
                        <AvisoPiloto delPiloto={piloto.del_piloto}
                                     restantes={piloto.proyectos?.restantes}
                                     mesLimite={piloto.proyectos?.mes_limite} />
                    )}
                    {/* LA FICHA SIN TECLEARLA YA NO VIVE AQUÍ. El secretario
                        elegía «Tengo el auto de admisión» en la columna derecha
                        y el sitio donde subirlo aparecía en el raíl izquierdo:
                        la decisión en un lado y la acción en el otro. Ahora la
                        tarjeta está dentro del paso 1, que es donde se lee la
                        instrucción —ver `TarjetaAdmision` más abajo—. */}
                    {/* LA FICHA Y LOS DOCUMENTOS APARECEN CUANDO HAY CAMINO.
                        Antes estaban siempre, y con ellos la rejilla de cuatro
                        tipos y los dos soltadores de PDF: tres decisiones
                        encima de la mesa antes de haber tomado la primera. */}
                    {/* EN EL CAMINO DE SISE NO SE OFRECE LA FICHA A MANO ni
                        los soltadores de PDF: el sentido de ese camino es
                        justamente que el número, el tipo y la ponencia salen de
                        los autos. Enseñarlos ahí es contradecir lo que la propia
                        tarjeta acaba de prometer. Vuelven en cuanto llega el
                        expediente y hay algo que comprobar. */}
                    {paso === 'ficha' && pendientes.length > 0 && fichaJsx}
                    {paso === 'ficha' && pendientes.length > 0 && documentosJsx}
                    {paso !== 'ficha' && (
                        <Pliegue titulo="Ficha y documentos" nota="leídos">
                            <div className="space-y-3 pt-2">
                                {fichaJsx}
                                {documentosJsx}
                                {plantillaJsx}
                            </div>
                        </Pliegue>
                    )}

                    {/* ═══ LO QUE QUEDA GUARDADO DE ESTE ASUNTO ═══
                        David: «hay que guardar los archivos de cada secretario y
                        sus proyectos para que pueda volver a trabajar, incluso
                        cambiar de sentido. Dinámico y con historial —no eliminar
                        su pdf—, pero con privacidad y no utilización de datos
                        personales para ningún fin, sin excepción».

                        Los PDF se leían y se tiraban con la petición. Ya se
                        guardan, y aquí se ven: se pueden abrir, y se pueden
                        borrar. El botón de borrar no es un adorno de
                        cumplimiento — es lo que convierte la promesa en algo que
                        el secretario puede ejercer y comprobar. */}
                    {(guardados?.documentos?.length ?? 0) > 0 && (
                        <Tarjeta>
                            <Rotulo accion={
                                <span className="text-[12px] text-white/45">
                                    sólo tú los ves
                                </span>
                            }>
                                Guardado de este asunto
                            </Rotulo>
                            <ul className="grid gap-1.5">
                                {guardados!.documentos.map((d) => (
                                    <li key={d.rol}>
                                        <button type="button"
                                                onClick={() => descargarDocumento(
                                                    encargo.numero, d.rol, correo)}
                                                className="group flex w-full items-center gap-2.5 rounded-lg
                                                           border border-white/[0.07] bg-white/[0.02] px-3 py-2
                                                           text-left transition-colors
                                                           hover:border-accent-gold/35 hover:bg-white/[0.045]">
                                            <FileText className="h-3.5 w-3.5 shrink-0 text-white/45
                                                                 transition-colors group-hover:text-accent-gold/70" />
                                            <span className="min-w-0 flex-1 truncate text-[13px] text-white/75">
                                                {d.etiqueta}
                                            </span>
                                            <span className="shrink-0 text-[12px] tabular-nums text-white/45">
                                                {Math.max(1, Math.round(d.bytes / 1024)).toLocaleString('es-MX')} KB
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {guardados!.proyecto && (
                                <p className="mt-2 text-[12px] text-white/45">
                                    Y el proyecto generado, que puedes descargar y volver a
                                    generar con otro sentido cuantas veces quieras.
                                </p>
                            )}

                            {/* LA PRIVACIDAD, DICHA SIN MATICES porque así está
                                contratada: los planes de API de pago de los
                                modelos no usan el contenido de las peticiones
                                para entrenar. */}
                            <p className="mt-3 border-t border-white/[0.07] pt-2.5
                                          text-[12px] leading-relaxed text-white/45">
                                {guardados!.aviso}
                            </p>

                            <button type="button" onClick={() => void olvidar()}
                                    className={cn(
                                        'mt-3 text-[12px] transition-colors',
                                        confirmaOlvidar
                                            ? 'font-medium text-red-300 hover:text-red-200'
                                            : 'text-white/45 hover:text-white/75')}>
                                {confirmaOlvidar
                                    ? '¿Seguro? Esto borra los documentos, el proyecto y la sesión. Pulsa otra vez.'
                                    : 'Borrar todo lo de este asunto'}
                            </button>
                        </Tarjeta>
                    )}
                    {/* La plantilla propia tampoco pinta nada antes de elegir
                        camino: es el último detalle de un trabajo que aún no
                        ha empezado. */}
                    {paso === 'ficha' && pendientes.length > 0 && plantillaJsx}
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    {sinAcceso && (
                        <Tarjeta className="border-amber-400/30 bg-amber-400/[0.06]">
                            <p className="text-[14px] text-amber-100">
                                El taller de sentencias es del plan Ultra Secretarios. Ya usaste tu
                                proyecto de prueba; el plan incluye 40 proyectos al mes.
                            </p>
                        </Tarjeta>
                    )}

                    <span id="error-del-taller" />
                    {error && (
                        <Tarjeta className={cn(
                            sinProyectos
                                ? 'border-accent-gold/35 bg-accent-gold/[0.06]'
                                : 'border-red-400/30 bg-red-400/[0.06]')}>
                            <div className="flex gap-2.5">
                                <AlertCircle className={cn('mt-0.5 h-4 w-4 shrink-0',
                                    sinProyectos ? 'text-accent-gold' : 'text-red-300')} />
                                <div className="min-w-0">
                                    {/* CON SUS RENGLONES: el servidor puede mandar una
                                        lista —los accesorios que quedaron sin calificar
                                        tras el cambio de sentido—, uno por renglón. */}
                                    <p className={cn('whitespace-pre-line text-[14px] leading-relaxed',
                                        sinProyectos ? 'text-white/90' : 'text-red-100')}>
                                        {error}
                                    </p>
                                    {/* ═══ QUEDARSE SIN PROYECTOS NO ES UN ERROR ═══
                                        David: «luego permitir a los usuarios gratuitos
                                        suscribirse cuando no tengan más posibilidad de
                                        generar proyectos».
                                        Se acabó la cuota y eso tiene solución, así que no
                                        se pinta en rojo de fallo ni se deja al secretario
                                        con un mensaje y nada que pulsar: aquí están las
                                        dos salidas, con su precio escrito. */}
                                    {sinProyectos && (
                                        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                                            <a href="/precios?plan=ultra_secretarios"
                                               className={cn(boton,
                                                   'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}>
                                                Ver el plan Ultra · $999 al mes
                                            </a>
                                            <button type="button"
                                                    disabled={recargando}
                                                    onClick={comprarRecarga}
                                                    className={cn(boton,
                                                        'border border-white/20 bg-white/[0.05] text-white/90',
                                                        'hover:bg-white/[0.08]')}>
                                                {recargando
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Zap className="h-4 w-4" />}
                                                Recargar 10 proyectos · $250
                                            </button>
                                            <span className="text-[12px] text-white/45">
                                                los recargados no caducan
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tarjeta>
                    )}

                    {/* ═══ EL COMPLEMENTO, ANTES DE PODER USARLO ═══
                        David: «si voy a instalar el complemento de Chrome dame
                        la opción de descargar o con un click que me lleve a
                        instalarlo, sino no servirá».

                        Sólo se enseña mientras no haya llegado ningún
                        expediente: en cuanto la extensión funciona, esta
                        tarjeta sobra y deja el sitio a la del expediente. */}
                    {/* ═══ POR DÓNDE EMPEZAMOS ═══ Lo primero que se ve, y lo
                        único hasta que se elige. */}
                    {paso === 'ficha' && pendientes.length === 0 && (
                        <EntradaTaller via={via} onVia={setVia}
                                       pasoArchivos={pasoArchivos}
                                       onPasoArchivos={setPasoArchivos}
                                       hayDocumentos={documentos.length >= 2}
                                       hayFicha={!!encargo.numero && !!encargo.tipoAsunto}
                                       enCurso={enCurso}
                                       onReanudar={reanudar}
                                       onDescargarVersion={(n, v) =>
                                           void descargarDelAlmacen(n, correo, v)}
                                       puedeSise={!!piloto?.puede_sise}
                                       ficha={fichaJsx}
                                       documentos={documentosJsx}
                                       plantilla={plantillaJsx}
                                       admision={
                                           <TarjetaAdmision fichando={fichando}
                                                            fichado={fichado}
                                                            onArchivo={(f) => void leerAdmision(f)} />
                                       }
                        /* ═══ LA LLAMADA A GENERAR ═══
                           David: «que la plataforma sea más intuitiva y llame
                           al secretario a generar proyectos». El botón estaba
                           en otra tarjeta, más abajo, y era del tamaño de una
                           acción secundaria: se leía «3 · Generar el adelanto»
                           y había que ir a buscar dónde se hacía eso.
                           Aquí va al final del camino y con el tamaño de lo
                           que es: la acción principal de la pantalla. */
                                       accion={
                            <div>
                                <button className={cn(
                                            'inline-flex w-full items-center justify-center gap-2',
                                            'rounded-xl px-5 py-3.5 text-[14px] font-medium',
                                            'transition disabled:cursor-not-allowed sm:w-auto',
                                            'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90',
                                            'shadow-[0_0_36px_-12px_rgba(201,169,98,0.65)]',
                                            'disabled:bg-white/[0.05] disabled:text-white/45',
                                            'disabled:shadow-none')}
                                        disabled={corriendo || falta.length > 0 || !!sinAcceso}
                                        onClick={pedirAdelanto}>
                                    {corriendo
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <FileText className="h-4 w-4" />}
                                    {corriendo ? 'Leyendo el expediente…' : 'Generar el adelanto'}
                                </button>
                                {falta.length > 0 && (
                                    <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                                        Antes hace falta {falta.join(', ')}.
                                    </p>
                                )}
                            </div>
                                       } />
                    )}

                    {pendientes.length === 0 && paso === 'ficha' && via === 'sise' && (
                    <Tarjeta>
                        <Rotulo accion={<span className="text-[12px] text-white/45">se instala una vez</span>}>
                            Trae el expediente desde SISE
                        </Rotulo>
                        <p className="mt-2 text-[14px] leading-relaxed text-white/60">
                            Con el complemento instalado, abres tu expediente en SISE, pulsas
                            <span className="text-white/90"> Vista Expediente Electrónico</span> y desde
                            ahí mandas las constancias al taller. No hace falta que teclees el número,
                            el tipo ni la ponencia: salen de los autos.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-4">
                            <a href={URL_EXTENSION} download
                               className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}>
                                <Download className="h-4 w-4" />
                                Descargar el complemento
                            </a>
                            <a href={URL_COMPLEMENTO} target="_blank" rel="noopener"
                               className="text-[13px] text-white/45 underline underline-offset-2
                                          hover:text-white/75">
                                ver los pasos y la política
                            </a>
                            <span className="text-[13px] text-white/45">Chrome · en tu computadora</span>
                        </div>
                        {/* LO QUE PASA DESPUÉS, dicho antes. Sin esto el
                            secretario instala, manda las constancias y no sabe
                            que tiene que volver aquí. */}
                        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5
                                      text-[13px] leading-relaxed text-white/60">
                            Una vez que instales el complemento y, desde la vista del expediente
                            electrónico, selecciones las constancias y pulses{' '}
                            <span className="text-white/90">Mandar constancias seleccionadas al
                            taller</span>, este módulo se actualizará y podrás empezar con la
                            elaboración del proyecto.
                        </p>
                        {/* ═══ EL MANUAL, PLEGADO ═══
                            Los tres pasos de instalación y la letra pequeña
                            ocupaban la primera pantalla ENTERA, todos los días,
                            y empujaban el recorrido del asunto fuera de vista:
                            lo primero que veía el secretario no era su trabajo,
                            era un manual. Se instala una vez; se lee una vez.
                            Fuera queda lo que hace falta siempre —el botón de
                            descarga y con qué cuenta mira el taller—. */}
                        <div className="mt-3">
                          <Pliegue titulo="Cómo se instala" nota="3 pasos, una sola vez">
                        <ol className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-white/45">
                            <li><span className="text-white/75">1.</span> Descomprime el archivo.</li>
                            <li><span className="text-white/75">2.</span> En Chrome, entra a
                                <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-white/75">chrome://extensions</code>
                                y enciende <span className="text-white/75">Modo de desarrollador</span>.</li>
                            <li><span className="text-white/75">3.</span> Pulsa
                                <span className="text-white/75"> Cargar descomprimida</span> y elige la
                                carpeta <span className="text-white/75">iurexia-sise</span>.</li>
                        </ol>
                        {/* EL CORREO, A LA VISTA. La extensión pide un correo escrito a
                            mano, y una letra cambiada manda las constancias a un sitio
                            donde nadie las busca: le pasó a David —jmd en vez de jdm— y
                            el envío dijo «Listo» igualmente. Enseñar aquí con qué cuenta
                            está mirando el taller hace visible ese desajuste. */}
                          </Pliegue>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1
                                        border-t border-white/[0.07] pt-3">
                            <span className="text-[13px] text-white/45">
                                Este taller mira las constancias de{' '}
                                <span className="text-white/75">{correo}</span>
                            </span>
                            <button type="button" onClick={() => void mirarPendientes()}
                                    disabled={mirando}
                                    className="text-[13px] text-accent-gold underline
                                               underline-offset-2 hover:text-accent-gold/80
                                               disabled:opacity-40">
                                {mirando ? 'buscando…' : 'buscar ahora'}
                            </button>
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                            No hay que configurar nada: el complemento reconoce tu sesión de Iurexia
                            desde este mismo navegador. Si te dice que no la encuentra, entra aquí con
                            tu cuenta y vuelve a pulsar en el visor.
                        </p>

                        {/* EL PORQUÉ DE LOS TRES PASOS Y LA PRIVACIDAD, PLEGADOS.
                            Son dos párrafos largos en gris que se leen una vez y
                            se recorren siempre. Plegados siguen estando —y con su
                            nombre en el rótulo, que es lo que importa en un texto
                            de privacidad: que se sepa que está y dónde—. */}
                        <div className="mt-3">
                          <Pliegue titulo="Por qué tres pasos, y qué pasa con tus datos"
                                   nota="privacidad">
                        <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                            Son tres pasos y no uno porque Chrome sólo instala de un clic lo que viene
                            de su tienda, y publicar ahí exige revisión.
                        </p>
                        {/* PRIVACIDAD, DICHA COMO ES. Se escribió después de comprobar en
                            el código qué se guarda de verdad y de añadir el borrado: antes
                            no había ninguno, y prometerlo habría sido falso sobre datos de
                            terceros que no eligieron estar ahí. */}
                        <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                            <span className="text-white/60">Privacidad.</span> Iurexia no guarda tu
                            usuario, tu contraseña ni tu sesión del Consejo: el complemento usa la que
                            ya tienes abierta en tu navegador y sólo para pedirle al propio Consejo los
                            documentos que marques. No se manda ningún correo a nadie: las constancias
                            viajan cifradas de esa pestaña al servidor y quedan sólo en tu taller. Las constancias se usan para preparar tu proyecto y
                            se borran en cuanto el taller las toma; lo que no se llegue a usar se borra
                            a las 48 horas. No se comparten con nadie, no se usan para entrenar nada y
                            los nombres de las partes no viajan a ningún otro servidor.
                        </p>
                          </Pliegue>
                        </div>
                    </Tarjeta>
                    )}

                    {/* ═══ DESDE SISE ═══
                        David, con todo el servidor ya hecho: «no veo cómo
                        generar el proyecto desde tcc-beta utilizando sise. No
                        hay nada desplegado para conectar con SISE. Debería
                        tener algún botón que diga "Generar desde SISE"».

                        Tenía razón. La extensión dejaba el expediente, el
                        servidor lo depuraba y sabía leerlo, y la pantalla no se
                        había enterado. Un camino al que no se puede entrar no
                        existe. */}
                    {pendientes.length > 0 && paso === 'ficha' && (
                    <Tarjeta className="border-accent-gold/30 bg-accent-gold/[0.05]">
                        <Rotulo accion={<span className="text-[12px] text-white/45">
                            {pendientes.length === 1 ? 'traído por la extensión'
                                                     : `${pendientes.length} esperando`}
                        </span>}>
                            Tienes un expediente esperando
                        </Rotulo>

                        {pendientes.length > 1 && (
                            <select value={elegido} onChange={(ev) => setElegido(ev.target.value)}
                                    className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.05]
                                               px-3 py-2 text-[14px] text-white/90">
                                <option value="">Elige el expediente…</option>
                                {pendientes.map((p) => (
                                    <option key={p.numero} value={p.numero}>
                                        {p.numero} · {p.tipoSise}
                                    </option>
                                ))}
                            </select>
                        )}

                        {(() => {
                            const p = pendientes.find((x) => x.numero === elegido);
                            if (!p) return null;
                            return (
                                <div className="mt-3 space-y-2">
                                    <p className="text-[14px] text-white/90">
                                        <span className="font-medium">{p.numero}</span>
                                        {p.tipoSise && <span className="text-white/60"> · {p.tipoSise}</span>}
                                    </p>
                                    {p.organo && <p className="text-[13px] text-white/45">{p.organo}</p>}
                                    {p.documentos.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {p.documentos.map((d, i) => (
                                                <span key={i} className="rounded-lg border border-white/10
                                                        bg-white/[0.04] px-2 py-1 text-[12px] text-white/60">
                                                    {d.que.replace(/_/g, ' ')}
                                                    {d.n > 0 && <span className="text-white/45"> · {d.n} pág</span>}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {p.presentacion && (
                                        <p className="text-[13px] text-white/45">
                                            Presentación según SISE: {p.presentacion}
                                            <span className="text-white/45"> — se confirma con la portada</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {errorSise && (
                            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/[0.08] px-3 py-2.5">
                                <p className="text-[13px] leading-relaxed text-red-100">{errorSise}</p>
                            </div>
                        )}

                        {/* LO QUE EL SERVIDOR YA SABE, cuando sólo le falta la
                            fecha. Se enseña para que el secretario vea que no
                            hay que teclear nada más. */}
                        {sabemos && (
                            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[13px] leading-relaxed text-white/75">{sabemos.dice}</p>
                                <dl className="mt-2.5 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
                                    {Object.entries(sabemos.yaSabemos)
                                        .filter(([, v]) => v)
                                        .map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                            <dt className="shrink-0 text-white/45">
                                                {k.replace(/_/g, ' ')}
                                            </dt>
                                            <dd className="text-white/75">{String(v)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/[0.07] pt-4">
                            <label className="flex flex-col gap-1">
                                <span className="text-[12px] text-white/45">
                                    Notificación de la recurrida
                                </span>
                                <input type="date" value={fechaNotif}
                                       onChange={(ev) => setFechaNotif(ev.target.value)}
                                       className="rounded-lg border border-white/10 bg-white/[0.05]
                                                  px-3 py-2 text-[14px] text-white/90" />
                            </label>
                            <button className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                    disabled={corriendo || !elegido || !!sinAcceso}
                                    onClick={pedirDesdeSISE}>
                                {corriendo
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <FileText className="h-4 w-4" />}
                                Generar desde SISE
                            </button>
                        </div>

                        {/* CAMBIAR DE ASUNTO. David: «si ya no quiero trabajar en ese
                            sino en otro, agrega botón borrar y trabajar en otro
                            expediente. Al dar click siempre redirigir a SISE». */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button type="button" onClick={borrarYOtro} disabled={corriendo}
                                    className={cn(
                                        'text-[13px] underline underline-offset-2 transition',
                                        confirmaBorrar
                                            ? 'font-medium text-red-300 hover:text-red-200'
                                            : 'text-white/45 hover:text-white/75',
                                        corriendo && 'opacity-40')}>
                                {confirmaBorrar
                                    ? 'Sí, borrar este expediente y abrir SISE'
                                    : 'Borrar y trabajar en otro expediente'}
                            </button>
                            {confirmaBorrar && (
                                <button type="button" onClick={() => setConfirmaBorrar(false)}
                                        className="text-[13px] text-white/45 underline
                                                   underline-offset-2 hover:text-white/75">
                                    no, dejarlo
                                </button>
                            )}
                        </div>
                        {confirmaBorrar && (
                            <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                                Se borran las constancias del {elegido || 'expediente'} y se abre SISE
                                para que tomes otro. Si luego lo necesitas, habrá que traerlo otra vez
                                desde el visor.
                            </p>
                        )}
                        <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                            El número, el tipo, el órgano, el ponente y el secretario salen de los
                            autos. La fecha de notificación es la única que no está en los escaneos
                            y de ella depende el cómputo: por eso se pregunta.
                        </p>
                    </Tarjeta>
                    )}

                    {/* EL RECORRIDO, DESPUÉS DE ELEGIR CAMINO. Es el mapa de
                        los ocho pasos y vale mucho, pero puesto ANTES de la
                        primera decisión es una cosa más que leer cuando lo que
                        toca es escoger por dónde se entra. */}
                    {(paso !== 'ficha' || via || pendientes.length > 0) && (
                    <Tarjeta>
                        <Rotulo accion={<span className="text-[12px] text-white/45">se detiene una sola vez</span>}>
                            Recorrido del asunto
                        </Rotulo>
                        <span id="recorrido" />
                        <AnilloDeFases fases={fasesSegun(paso, corriendo || autoEnCurso)} corriendo={corriendo || autoEnCurso} />
                        {paso !== 'ficha' && delAsunto && (
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                                    <p className="text-[16px] font-semibold text-white">
                                        {extemporanea ? 'Extemporánea' : 'En tiempo'}
                                    </p>
                                    <p className="text-[12px] text-white/45">
                                        {extemporanea ? 'el cómputo lo dice; decides abajo' : 'según el cómputo de días hábiles'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                                    <p className="text-[16px] font-semibold tabular-nums text-white">
                                        {delAsunto.problemas.length}
                                    </p>
                                    <p className="text-[12px] text-white/45">
                                        {delAsunto.problemas.length === 1 ? 'problema jurídico' : 'problemas jurídicos'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                                    <p className="text-[16px] font-semibold tabular-nums text-white">
                                        {material ? material.tesis.length : '—'}
                                    </p>
                                    <p className="text-[12px] text-white/45">
                                        {material ? 'criterios con registro verificado' : 'criterios: al buscar la solución'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
                            {/* EL MISMO BOTÓN, UNA SOLA VEZ. En el camino de
                                archivos la acción principal vive ahora al final
                                de los tres pasos, con su tamaño; dejarlo también
                                aquí, pequeño y a treinta centímetros, son dos
                                botones que hacen lo mismo y el secretario no
                                sabe cuál es «el bueno». El camino de SISE no
                                tiene pasos numerados, así que ahí se queda. */}
                            {via !== 'archivos' && (
                            <button className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                    disabled={corriendo || falta.length > 0 || !!sinAcceso || paso !== 'ficha'}
                                    onClick={pedirAdelanto}>
                                {corriendo && paso === 'ficha'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <FileText className="h-4 w-4" />}
                                Generar adelanto
                            </button>
                            )}
            {/* ═══ EL PASO QUE SE PERDÍA ═══
                David: «después del adelanto viene la parte de consultar
                acervo. Sin embargo, el secretario se pierde».

                Dos motivos, y los dos eran de la pantalla. El botón se llamaba
                «Consultar el acervo», que dice lo que hace la máquina por
                dentro y no lo que el secretario viene a buscar; y estaba en
                gris de segunda acción, al lado de uno dorado, así que después
                de generar el adelanto la vista no tenía a dónde ir.

                Ahora dice a qué sirve —buscar la solución jurídica— y late
                mientras es EL paso que toca. El latido para en cuanto se pulsa:
                una animación que no se apaga deja de ser una guía y pasa a ser
                un adorno molesto. */}
                            {/* ═══ LA SOLUCIÓN VIENE SOLA ═══
                                David (17-sep): «cuando entrega el asunto en corto
                                debería ya estarse buscando la solución jurídica».
                                Mientras corre, aquí se ve cómo va; el botón sólo
                                aparece si hay que buscar a mano (sesión anterior,
                                fallo) o para repetir la búsqueda con el contexto
                                que el secretario escribió. */}
                            {paso === 'adelanto' && delAsunto && avanceAuto.propuesta !== 'fallo'
                             && (autoEnCurso || avanceAuto.propuesta === 'listo') && (
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                                    {([['consulta', 'Buscando en el acervo'],
                                       ['contraste', 'Contrastando los planteamientos'],
                                       ['propuesta', 'Proponiendo la solución']] as const).map(([k, t]) => {
                                        const e = avanceAuto[k];
                                        return (
                                            <span key={k} className={cn('inline-flex items-center gap-1.5',
                                                e === 'listo' ? 'text-white/75'
                                                    : e === 'en_curso' ? 'text-accent-gold'
                                                        : 'text-white/40')}>
                                                <span className={cn('inline-block h-1.5 w-1.5 rounded-full',
                                                    e === 'listo' ? 'bg-emerald-400'
                                                        : e === 'en_curso'
                                                            ? 'bg-accent-gold animate-[latido_1.4s_ease-in-out_infinite]'
                                                            : 'bg-white/20')} />
                                                {t}{e === 'en_curso' ? '…' : ''}
                                            </span>
                                        );
                                    })}
                                    <span className="basis-full text-[12px] text-white/45">
                                        {avanceAuto.propuesta === 'listo'
                                            ? 'La propuesta está lista: se abre el paso 3.'
                                            : 'En cuanto esté la propuesta, pasas a decidir. Mientras, lee el asunto.'}
                                    </span>
                                </div>
                            )}
                            {(paso !== 'adelanto' || !delAsunto || avanceAuto.propuesta === 'fallo'
                              || (!autoEnCurso && avanceAuto.propuesta !== 'listo')) && (
                            <button className={cn(
                                        boton,
                                        paso === 'adelanto' && !corriendo
                                            ? 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90 shadow-[0_0_0_0_rgba(201,169,98,0.7)] animate-[latido_1.6s_ease-in-out_infinite]'
                                            : 'border border-white/10 bg-white/[0.05] text-white/90 hover:bg-white/[0.08]')}
                                    disabled={corriendo || paso === 'ficha'}
                                    onClick={() => { void pedirAcervo(true); }}>
                                {corriendo && paso === 'adelanto'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Search className="h-4 w-4" />}
                                Buscar solución jurídica
                            </button>
                            )}
                            {paso === 'adelanto' && delAsunto && contexto.trim().length > 0
                             && avanceAuto.propuesta === 'listo' && (
                            <button className={cn(boton, 'border border-white/10 bg-white/[0.05] text-white/90 hover:bg-white/[0.08]')}
                                    disabled={corriendo}
                                    onClick={() => { void pedirAcervo(true); }}>
                                <Search className="h-4 w-4" />
                                Buscar de nuevo con tu contexto
                            </button>
                            )}
                        </div>

            {/* ═══ EL ATAJO DE UN SOLO CLIC ═══
                David: «una opción con un botón amarillo desde el principio que
                diga "Genera todo el proyecto" y abajo, con letras más pequeñas,
                "Se decide por jurimetría. No recomendado". (…) Si el secretario
                decide arriesgar sus consultas sin supervisión, dejémoslo que use
                el taller y le resuelva, pero queda expuesto a que él lo tenga
                que cambiar».

                VA APARTE Y NO EN LA FILA DE ARRIBA, y es deliberado: el camino
                recomendado es el dorado, que se detiene una vez a que él decida.
                Dos botones del mismo color en la misma fila serían dos caminos
                de igual rango, y no lo son. Aquí está el amarillo, separado por
                la línea, con su advertencia pegada debajo —donde se lee antes de
                pulsar, no después—. */}
                        {paso === 'ficha' && (
                        <div className="mt-4 border-t border-white/[0.07] pt-4">
                            <button className={cn(
                                        boton,
                                        'bg-amber-400 text-charcoal-900 hover:bg-amber-300',
                                        /* APAGADO PERO LEGIBLE. La clase `boton`
                                           ya baja todo al 40%, y encima de eso
                                           un ámbar al 30% con texto carbón daba
                                           oscuro sobre oscuro: un borrón donde
                                           no se leía nada. Y este botón apagado
                                           tiene algo que decir —qué podrá hacer
                                           en cuanto suba los documentos—, así
                                           que se apaga a contorno, no a mancha. */
                                        'disabled:opacity-100 disabled:border',
                                        'disabled:border-amber-400/30',
                                        'disabled:bg-amber-400/[0.07]',
                                        'disabled:text-amber-200/60')}
                                    disabled={corriendo || falta.length > 0 || !!sinAcceso}
                                    onClick={generarTodo}>
                                {corriendo
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Zap className="h-4 w-4" />}
                                Genera todo el proyecto
                            </button>
                            <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                                Se decide por jurimetría. No recomendado.
                            </p>
                            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                                Salta los ocho pasos y entrega el proyecto terminado,
                                con el sentido que el motor considere acertado. Nadie
                                lo revisa antes de escribirlo: si no coincide con tu
                                criterio, el cambio corre por tu cuenta. Cuesta lo
                                mismo que el camino con supervisión.
                            </p>
                        </div>
                        )}

                        {falta.length > 0 && paso === 'ficha' && via !== 'archivos' && (
                            <p className="mt-3 text-[13px] text-white/45">
                                Falta {falta.join(', ')}.
                            </p>
                        )}

                        {/* ═══ EL ASUNTO, PARA LEERLO ═══
                            David, repetidas veces: «el secretario está sentado
                            frente a la pantalla y primero quiere entender el
                            asunto (por eso el contexto), luego con la posible
                            solución puede formar un criterio».

                            El recorrido marcaba «Ratio del acto reclamado» y
                            «Síntesis de conceptos» en verde y no había manera de
                            leerlas: estaban dentro del .docx. Se le pedía formar
                            criterio sobre un asunto que no había visto. */}
                        {/* SIGUE EN PANTALLA MIENTRAS DECIDE. Estaba atado a
                            `paso === 'adelanto'`, así que al pulsar «Buscar
                            solución jurídica» el asunto entero desaparecía y el
                            secretario formaba criterio de memoria. Se queda: al
                            llegar la propuesta los desplegables se cierran solos
                            —para no empujar la decisión fuera de la vista— y él
                            los reabre cuando quiera comprobar algo. */}
                        {/* ═══ LA FICHA CAMBIÓ DESPUÉS DE LEER EL EXPEDIENTE ═══
                            Volver al paso 1 y corregir una fecha no basta: el
                            servidor guarda la sesión con los datos de la vuelta
                            anterior y el cómputo del documento saldría con el
                            dato viejo. Se dice aquí, donde está el botón. */}
                        {fichaCambiada && delAsunto && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-gold/40
                                            bg-accent-gold/[0.07] px-3.5 py-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" />
                                <p className="text-[13px] leading-relaxed text-accent-gold/90">
                                    Cambiaste la ficha después de leer el expediente.
                                    <span className="text-white/65"> El cómputo del plazo y los datos del
                                    documento se quedaron con los de la vuelta anterior: vuelve a
                                    generar el adelanto para que el cambio entre.</span>
                                </p>
                            </div>
                        )}
                        {paso !== 'ficha' && delAsunto && (
                            <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
                                <p className="text-[12px] uppercase tracking-wide text-accent-gold">
                                    El asunto, en corto
                                </p>
                                {/* ═══ DE QUÉ VA EL ASUNTO ═══
                                    David (17-sep): «me gustaría una tarjeta más
                                    grande en la que al secretario se le explique
                                    de qué va el caso (…) mi redacción es más
                                    amena y trata de dar a entender el asunto de
                                    una forma más sencilla, con una sola tarjeta».
                                    Los tres pliegues de abajo siguen —son la
                                    fuente, para comprobar—, pero cerrados: lo
                                    que se lee primero es el relato, y debajo,
                                    numerada, la litis tal como la calculó el
                                    reparto, que es exactamente lo que se va a
                                    estudiar. */}
                                {delAsunto.relato && (
                                    <div className="rounded-xl border border-accent-gold/25
                                                    bg-accent-gold/[0.045] px-4 py-4 sm:px-5">
                                        <p className="text-[12px] uppercase tracking-wide text-accent-gold">
                                            De qué va el asunto
                                        </p>
                                        <div className="mt-2 space-y-2.5">
                                            {delAsunto.relato.split(/\n\s*\n/).map((parrafo, i) => (
                                                <p key={i}
                                                   className="text-[14px] leading-[1.7] text-white/85">
                                                    {parrafo.trim()}
                                                </p>
                                            ))}
                                        </div>
                                        {delAsunto.problemas.length > 0 && (
                                            <div className="mt-4 border-t border-accent-gold/15 pt-3.5">
                                                <p className="text-[14px] font-medium text-white/90">
                                                    ¿A qué se reduce la litis? Tendrás que resolver
                                                    principalmente{' '}
                                                    {delAsunto.problemas.length === 1
                                                        ? 'este problema jurídico:'
                                                        : `estos ${delAsunto.problemas.length} problemas jurídicos:`}
                                                </p>
                                                <ol className="mt-2 space-y-1.5">
                                                    {delAsunto.problemas.map((q, i) => (
                                                        <li key={i}
                                                            className="flex gap-2.5 text-[13px] leading-relaxed text-white/75">
                                                            <span className="shrink-0 tabular-nums text-accent-gold/80">
                                                                {i + 1}.
                                                            </span>
                                                            <span>
                                                                {q.pregunta}
                                                                {q.jerarquia === 'principal' && (
                                                                    <span className="ml-1.5 rounded border border-accent-gold/30 px-1 py-0.5
                                                                                     text-[10px] uppercase text-accent-gold/80">
                                                                        principal
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {delAsunto.antecedentes && (
                                    <Pliegue titulo="Antecedentes"
                                             abierto={paso === 'adelanto' && !delAsunto.relato}
                                             nota={`${delAsunto.antecedentes.split(/\s+/).length} palabras`}>
                                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/60">
                                            {delAsunto.antecedentes}
                                        </p>
                                    </Pliegue>
                                )}

                                {delAsunto.resumenActo && (
                                    <Pliegue titulo={`Qué resolvió ${delAsunto.voz.organo}`}
                                             abierto={paso === 'adelanto' && !delAsunto.relato}
                                             nota={`${delAsunto.resumenActo.split(/\s+/).length} palabras`}>
                                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/60">
                                            {delAsunto.resumenActo}
                                        </p>
                                    </Pliegue>
                                )}

                                {delAsunto.resumenConceptos && (
                                    <Pliegue titulo={`Qué alega quien promueve · ${delAsunto.voz.combate}`}
                                             nota={`${delAsunto.resumenConceptos.split(/\s+/).length} palabras`}>
                                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/60">
                                            {delAsunto.resumenConceptos}
                                        </p>
                                    </Pliegue>
                                )}

                                {/* LOS PROBLEMAS, PLEGABLES. Con once —el ADC
                                    393/2025 tiene once— la lista abierta es un
                                    muro que empuja la decisión fuera de la
                                    pantalla. Se abre sola mientras se lee el
                                    asunto y se cierra al pasar a decidir, con
                                    el número a la vista para saber qué hay
                                    dentro sin abrirla. */}
                                {/* CON RELATO, LA LITIS YA ESTÁ ARRIBA: la misma
                                    lista dos veces en la misma tarjeta es ruido. */}
                                {delAsunto.problemas.length > 0 && !delAsunto.relato && (
                                    <Pliegue titulo="Problemas jurídicos del caso"
                                             abierto={paso === 'adelanto'}
                                             nota={`${delAsunto.problemas.length} ${
                                                 delAsunto.problemas.length === 1
                                                     ? 'planteamiento' : 'planteamientos'}`}>
                                        <ol className="space-y-1.5">
                                            {delAsunto.problemas.map((q, i) => (
                                                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/60">
                                                    <span className="shrink-0 text-white/45">{i + 1}.</span>
                                                    <span>
                                                        {q.pregunta}
                                                        {q.jerarquia === 'principal' && (
                                                            <span className="ml-1.5 rounded border border-accent-gold/30 px-1 py-0.5
                                                                             text-[10px] uppercase text-accent-gold/80">
                                                                principal
                                                            </span>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    </Pliegue>
                                )}

                                {/* ═══ LA AUTORIDAD, CORREGIBLE HASTA EL FINAL ═══
                                    Este nombre se lee del acto reclamado y acaba en
                                    doce sitios del documento, cuatro de ellos puntos
                                    resolutivos. Cuando el OCR rompe la carátula, el
                                    lector prefiere el hueco al nombre equivocado —«un
                                    nombre equivocado en el resolutivo es peor que un
                                    hueco, porque el hueco se ve»—, pero el campo del
                                    encargo se congela al arrancar el adelanto y el
                                    hueco quedaba sin puerta. Aquí sigue abierto, y
                                    está donde se lee el asunto, que es cuando se
                                    nota que el nombre no es el bueno. */}
                                <div>
                                    <label htmlFor="autoridad-resp"
                                           className="block text-[13px] font-medium text-white/75">
                                        Autoridad responsable
                                    </label>
                                    <input id="autoridad-resp" value={encargo.responsable ?? ''}
                                           onChange={(e) => setEncargo(
                                               (x) => ({ ...x, responsable: e.target.value }))}
                                           placeholder="No se pudo leer del acto: escríbela"
                                           className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03]
                                                      px-3 py-2 text-[13px] text-white/75
                                                      placeholder:text-white/45 focus:border-accent-gold/40
                                                      focus:outline-none" />
                                    <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                                        Se leyó del acto reclamado. Compruébala contra la carátula:
                                        de aquí sale el resolutivo. Si la corriges, manda lo que escribas.
                                    </p>
                                </div>

                            </div>
                        )}

                        {/* ═══ LO QUE TÚ SABES, ANTES DE BUSCAR ═══
                            David: «primero debe presentarse todo el contexto
                            jurídico y después buscar la solución jurídica. Me
                            parece que así el sistema va a tener mejor capacidad
                            de buscar jurisprudencia o las normas aplicables al
                            caso para resolver con mayor precisión».

                            Estaba al revés: este recuadro sólo aparecía DESPUÉS
                            de proponer, y sólo si alguna propuesta no alcanzaba.
                            Aquí entra en la búsqueda como ancla propia. */}
                        {paso === 'adelanto' && (
                            <div className="mt-4 border-t border-white/[0.07] pt-4">
                                <label htmlFor="ctx-previo"
                                       className="block text-[13px] font-medium text-white/75">
                                    Lo que sabes del asunto y no está en los papeles
                                </label>
                                <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                                    Opcional. Lo que escribas aquí se usa para BUSCAR: entra en el
                                    acervo como una consulta propia, además de las preguntas de los
                                    problemas. Cuanto más preciso el concepto jurídico, mejor la
                                    jurisprudencia que vuelve.
                                </p>
                                <textarea id="ctx-previo" rows={3} value={contexto}
                                          onChange={(e) => setContexto(e.target.value)}
                                          placeholder="p. ej.: la pericial se declaró desierta porque la oferente no presentó a su perito en la fecha señalada, pese a estar notificada"
                                          className="mt-2 w-full rounded-lg border border-white/10
                                                     bg-white/[0.04] px-3 py-2.5 text-[14px]
                                                     leading-relaxed text-white/90
                                                     placeholder:text-white/45" />
                                {contexto.trim().length > 0 && (
                                    <p className="mt-1.5 text-[12px] text-white/45">
                                        {contexto.trim().length.toLocaleString('es-MX')} caracteres ·
                                        entran en la búsqueda al pulsar el botón de arriba
                                    </p>
                                )}
                            </div>
                        )}
                    </Tarjeta>
                    )}

                    {/* EL ACERVO, PLEGADO. Antes se desplegaba entero al pulsar
                        el botón rojo y era donde el secretario se perdía: ocho
                        tesis y treinta preceptos como pantalla de decisión.
                        No sobra —es lo que impide citar de memoria— pero es
                        material de FUNDAR, no de DECIDIR, así que va detrás de
                        un pliegue y se abre cuando se quiere comprobar algo. */}
                    {/* ═══ EL POSIBLE MARCO DE RESOLUCIÓN ═══
                        Se llamaba «En qué se apoya» y era un pliegue sin
                        galón, con las tesis dentro y los preceptos reducidos a
                        una nota al pie de una línea. David lo pidió por su
                        nombre: «visible un botón para desplegar lo que entrega
                        el RAG (posible marco de resolución)».

                        Sigue plegado a propósito —es material de FUNDAR, no de
                        DECIDIR, y abierto era donde el secretario se perdía—
                        pero ahora el rótulo dice qué hay dentro y cuánto, para
                        decidir si merece abrirlo sin tener que abrirlo. */}
                    {material && (
                        <Tarjeta>
                          <Pliegue titulo="Posible marco de resolución"
                                   nota={`${material.tesis.length} tesis · ${
                                       material.tesis.filter((t) => t.obligatoria).length
                                       } obligatorias · ${material.normas.length} preceptos${
                                       material.materia ? ` · acervo ${material.materia}` : ''}`}>
                            <p className="mb-2.5 text-[12px] leading-relaxed text-white/45">
                                Lo que el acervo dice sobre tus planteamientos. No decide nada:
                                es con lo que se funda una vez decidido.
                            </p>
                            {/* EN QUÉ ACERVO SE BUSCÓ. La materia elige la ley con la
                                que se funda el proyecto, y se deducía en silencio: un
                                asunto fiscal enrutado a civil recibe el Código Federal
                                de Procedimientos Civiles y el estudio se funda con el
                                código equivocado sin que nada lo diga. Aquí se ve, y
                                se corrige en la ficha. */}
                            {material.materia && (
                                <p className="mb-2.5 rounded-lg border border-white/[0.07]
                                              bg-white/[0.02] px-3 py-2 text-[12px]
                                              leading-relaxed text-white/60">
                                    Se buscó en el acervo de materia{' '}
                                    <span className="text-white/75">{material.materia}</span>.
                                    Si el asunto no es de esa materia, cámbialo en la ficha y
                                    vuelve a buscar: de ahí sale la ley con la que se funda.
                                </p>
                            )}
                            <ul className="grid gap-2">
                                {(marcoEntero ? material.tesis
                                               : material.tesis.slice(0, 12)).map((t) => (
                                    <li key={t.registro}>
                                        <button type="button" onClick={() => setTesisAbierta(t)}
                                                className="w-full rounded-lg border border-white/[0.07] bg-white/[0.02]
                                                           p-3 text-left transition hover:border-accent-gold/30
                                                           hover:bg-white/[0.035]">
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className={cn('rounded-lg border px-1.5 py-0.5 text-[10px] font-medium',
                                                    t.obligatoria
                                                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                                        : 'border-white/10 bg-white/[0.05] text-white/60')}>
                                                    {t.obligatoria ? 'Obligatoria' : 'Orientadora'}
                                                </span>
                                                {/* EL CLIC ABRE LA TESIS AQUÍ MISMO. David: «esto ayuda para que
                                                    el secretario no salga del redactor a verificar la tesis». */}
                                                <span className="text-[12px] text-accent-gold/80 underline
                                                                 decoration-accent-gold/25 underline-offset-2">
                                                    Reg. {t.registro} · {t.instancia}
                                                </span>
                                            </div>
                                            <p className="text-[13px] leading-snug text-white/75">{t.rubro}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {material.tesis.length > 12 && !marcoEntero && (
                                <button type="button" onClick={() => setMarcoEntero(true)}
                                        className="mt-2 text-[12px] text-white/45 underline
                                                   decoration-white/20 underline-offset-2
                                                   transition-colors hover:text-white/75">
                                    Y {material.tesis.length - 12} tesis más, todas en el
                                    proyecto · verlas
                                </button>
                            )}
                            {/* LOS PRECEPTOS, COMO LISTA Y NO COMO COLETILLA. Eran
                                una línea con seis artículos sueltos y sin ley:
                                «art. 14 · art. 16» no le dice a nadie de qué
                                ordenamiento, y son la mitad de lo que funda. */}
                            {material.normas.length > 0 && (
                                <div className="mt-3 border-t border-white/[0.07] pt-2.5">
                                    <p className="mb-1.5 text-[12px] uppercase tracking-wide text-white/45">
                                        Preceptos recuperados
                                    </p>
                                    <ul className="grid gap-1">
                                        {(marcoEntero ? material.normas
                                                       : material.normas.slice(0, 14)).map((n, i) => (
                                            <li key={i} className="text-[12px] leading-snug text-white/60">
                                                <span className="text-white/75">art. {n.articulo}</span>
                                                {n.cuerpo_legal ? ` · ${n.cuerpo_legal}` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                    {material.normas.length > 14 && !marcoEntero && (
                                        <button type="button" onClick={() => setMarcoEntero(true)}
                                                className="mt-1 text-[12px] text-white/45 underline
                                                           decoration-white/20 underline-offset-2
                                                           transition-colors hover:text-white/75">
                                            Y {material.normas.length - 14} más · verlos
                                        </button>
                                    )}
                                    {marcoEntero && (
                                        <button type="button" onClick={() => setMarcoEntero(false)}
                                                className="mt-2 text-[12px] text-white/45
                                                           transition-colors hover:text-white/60">
                                            volver a la lista corta
                                        </button>
                                    )}
                                </div>
                            )}
                          </Pliegue>
                        </Tarjeta>
                    )}

                    {/* ═══ EL ESPEJO DEL PROPIO TRIBUNAL ═══
                        David preguntó qué implementar para superar a un
                        secretario. La respuesta medida: no se le supera en
                        criterio, se le supera en MEMORIA. Recuerda lo que él
                        trabajó; el acervo tiene 3,585 sentencias de su tribunal
                        —de 2019 a 2026— incluidas las de las ponencias que no
                        son la suya y las anteriores a su llegada.

                        VA ANTES DE «TU CRITERIO» Y DESPUÉS DEL MARCO. Es
                        material de DECIDIR, no de fundar, así que no se pliega
                        entero como el marco; pero cada planteamiento sí, porque
                        tres planteamientos por seis sentencias son dieciocho
                        renglones y eso ya no se lee.

                        NO ACUSA, Y ESO ES EL DISEÑO. La calificación del
                        proyecto es del planteamiento —fundado, infundado— y el
                        sentido del acervo es del resolutivo —concede, niega,
                        confirma—: no son la misma escala. Cruzarlas producía el
                        error medido del 45% en el grupo tributario del propio
                        tribunal, donde «confirma» confirmaba una CONCESIÓN. Se
                        enseñan las sentencias y compara el secretario. */}
                    {(material?.espejo?.length ?? 0) > 0 && (
                        <Tarjeta>
                            <Rotulo accion={
                                <span className="text-[12px] text-white/45">
                                    no es un recuento: son sentencias que puede abrir
                                </span>
                            }>
                                Su propio tribunal
                            </Rotulo>
                            <p className="mb-3 text-[12px] leading-relaxed text-white/45">
                                Del acervo de{' '}
                                <span className="text-white/75">
                                    {material!.espejo![0].tribunal}
                                </span>
                                : las sentencias suyas más cercanas a cada planteamiento.
                                No dicen cómo debe resolver — dicen qué ha resuelto antes
                                el tribunal que firma.
                            </p>
                            <div className="grid gap-2">
                                {material!.espejo!.map((e, i) => (
                                    <Pliegue key={i} abierto={i === 0}
                                             titulo={e.problema.length > 92
                                                 ? e.problema.slice(0, 92) + '…'
                                                 : e.problema}
                                             nota={`${e.filas.length} sentencias propias`}>
                                        <ul className="grid gap-1.5">
                                            {e.filas.map((f, j) => (
                                                <li key={j}
                                                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5
                                                               rounded-lg border border-white/[0.07]
                                                               bg-white/[0.02] px-3 py-2 text-[12px]">
                                                    <span className="font-medium text-white/75">
                                                        {f.tipo_asunto} {f.expediente}
                                                    </span>
                                                    {f.fecha && (
                                                        <span className="tabular-nums text-white/45">
                                                            {f.fecha.slice(0, 10)}
                                                        </span>
                                                    )}
                                                    <span className="rounded-lg border border-white/10
                                                                     bg-white/[0.05] px-1.5 py-0.5
                                                                     text-[10px] uppercase tracking-wide
                                                                     text-white/60">
                                                        {f.sentido || 'sin sentido'}
                                                    </span>
                                                    {f.pdf_url && (
                                                        <a href={f.pdf_url} target="_blank"
                                                           rel="noopener noreferrer"
                                                           className="ml-auto text-[12px] text-accent-gold/80
                                                                      underline decoration-accent-gold/30
                                                                      underline-offset-2 transition-colors
                                                                      hover:text-accent-gold">
                                                            abrir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                        {/* El resumen viene vacío cuando no se puede
                                            resumir sin mentir: tipos de asunto
                                            mezclados, o etiqueta que ya contiene el
                                            resultado —«inoperancia_…», donde todas
                                            niegan porque la etiqueta ES la negativa—. */}
                                        {e.resumen && (
                                            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
                                                {e.resumen}
                                            </p>
                                        )}
                                    </Pliegue>
                                ))}
                            </div>
                            {/* LA COBERTURA VA EN EL CUERPO, NO AL PIE. Al acervo
                                propio le falta el 85% de 2025: si el tribunal cambió
                                de criterio ese año, aquí no aparece, y quien lea esto
                                tiene que saberlo antes de darle peso. */}
                            <p className="mt-3 border-t border-white/[0.07] pt-2.5
                                          text-[12px] leading-relaxed text-white/45">
                                {material!.espejo![0].cobertura}
                            </p>
                        </Tarjeta>
                    )}

                    <span id="criterio" />
                    {/* ═══ EL CÓMPUTO DICE EXTEMPORÁNEA. DECIDES TÚ. ═══
                    Avisa, no impide: el botón de generar nunca se
                    deshabilita. Y son DOS vías, no una casilla, porque son
                    dos afirmaciones jurídicas distintas y el artículo 74,
                    fracción VI, de la Ley de Amparo exige congruencia entre
                    los considerandos y los resolutivos. */}
                {extemporanea && (
                    <Tarjeta>
                        <p className="text-[12px] uppercase tracking-wide text-amber-300/80">
                            El cómputo da extemporánea
                        </p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                            Sin decidir nada, el proyecto resuelve la improcedencia y no
                            entra al fondo. Si tú sostienes otra cosa, dilo aquí: el
                            proyecto lo obedece.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {([
                                ['', 'Dejarlo así',
                                 'La ejecutoria resuelve la improcedencia. Es lo que pasa hoy.'],
                                ['oportuna', 'Fue oportuna',
                                 'Rectificas el cómputo. Tu razón va literal al considerando y se entra al fondo.'],
                                ['reserva', 'Estudio en reserva',
                                 'La ejecutoria no cambia, y el estudio de fondo va detrás de los resolutivos.'],
                            ] as const).map(([id, titulo, que]) => (
                                <button key={id || 'nada'} type="button"
                                        onClick={() => setDecision(id)}
                                        className={cn('rounded-xl border p-3 text-left transition-colors',
                                            decision === id
                                                ? 'border-accent-gold/50 bg-accent-gold/[0.07]'
                                                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]')}>
                                    <span className="block text-[13px] font-medium text-white/90">
                                        {titulo}
                                    </span>
                                    <span className="mt-1 block text-[12px] leading-snug text-white/60">
                                        {que}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {decision !== '' && (
                            <div className="mt-3">
                                <label htmlFor="motivo-oportunidad"
                                       className="block text-[13px] font-medium text-white/75">
                                    Por qué
                                </label>
                                <textarea id="motivo-oportunidad" rows={2}
                                          value={motivoDecision}
                                          onChange={(e) => setMotivoDecision(e.target.value)}
                                          placeholder="p. ej.: la Junta Especial Número Dos suspendió labores del catorce al veinticinco de agosto"
                                          className="mt-1.5 w-full resize-y rounded-xl border border-white/10
                                                     bg-black/20 px-3.5 py-2.5 text-[14px] leading-relaxed
                                                     text-white/90 placeholder:text-white/45 outline-none
                                                     focus:border-accent-gold/45" />
                                <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                                    Va LITERAL al considerando de oportunidad. Sin razón escrita, la
                                    rectificación no se sostiene en revisión.
                                </p>
                            </div>
                        )}
                    </Tarjeta>
                )}

                    {/* EL PASO 3 NO SE QUEDA EN PANTALLA CUANDO YA HAY PASO 4.
                        Recorrido del 16-sep-2026: con el proyecto ya escrito,
                        el secretario seguía viendo «Aceptar y generar el
                        proyecto» debajo, como si no lo hubiera hecho —tres
                        botones que generan y tres que cambian el sentido, a la
                        vez—. Mientras el proyecto esté en pantalla, la
                        decisión se repliega: para volver a ella está «Quiero
                        cambiar de sentido», que además recoge la mesa. */}
                    {problemas.length > 0 && !proyecto && (
                    <Decision problemas={problemas} onCambiar={cambiarCriterio}
                              onGenerar={pedirProyecto} generando={corriendo && paso === 'acervo' && !proponiendo}
                              onProponer={() => { void pedirPropuesta(); }} propuesta={propuesta}
                              proponiendo={proponiendo}
                              onAportar={aportarYProponer} aportando={aportando}
                              modo={modo} onModo={setModo}
                              sentidoGlobal={sentidoGlobal}
                              onSentidoGlobal={elegirGlobal}
                              razonGlobal={razonGlobal}
                              onRazonGlobal={setRazonGlobal}
                              onRazonarGlobal={razonarGlobal}
                              razonandoGlobal={razonandoGlobal}
                              globalDictado={globalDictado}
                              abrirCorreccion={vueltaCriterio}
                              tocados={tocados}
                              onRazonar={pedirRazon} razonando={razonando}
                              conceptosViolacion={conceptosViolacion}
                              onConceptosViolacion={setConceptosViolacion}
                              contextoAportado={contexto.length}
                              claseContexto={claseContexto}
                              constanciasAportadas={constanciasAportadas}
                              onCorregirProblema={corregirYProponer}
                              corrigiendoProblema={editandoProblema}
                              avisosReparto={avisosRepartoVigentes}
                              esRecurso={encargo.tipoAsunto !== 'amparo_directo'}
                              extemporanea={extemporanea} oportunidadDecidida={decision !== ''}
                              propuestaSuplencia={delAsunto?.suplencia ?? null}
                              suplencia={suplencia}
                              onSuplencia={(d) => setSuplenciaDecidida(
                                  d ? { numero: encargo.numero, d } : null)}
                              grupos={grupos} onGrupos={setGrupos}
                              plan={enlacePlan}
                              recalificadas={superpuestas}
                              recalificacionEnCurso={recalEnCurso}
                              avisosRecalificacion={avisosRecal}
                              onReintentarRecalificacion={recal.reintentar}
                              razonesSegmento={razonesSegmento}
                              onRazonSegmento={escribirRazonSegmento}
                              esCasa={esCasa} varianteEstudio={varianteEstudio}
                              onVarianteEstudio={elegirVariante} />
                    )}

                    {/* EL ESTUDIO, VIÉNDOSE ESCRIBIR. Antes aquí no había nada
                        durante cuatro minutos y el secretario no sabía si el
                        sistema trabajaba o se había caído. Ahora lee mientras
                        se escribe: si ve que va mal encaminado, no espera al
                        final para saberlo. */}
                    <span id="estudio" />
                    {/* LA TARJETA SE ABRE AL EMPEZAR, NO AL PRIMER TROZO.
                        David: «tampoco existe el streaming de la generación de
                        la sentencia». Existe —medido en producción: 4,659
                        eventos de texto—, pero el PRIMER TROZO LLEGA A LOS 61
                        SEGUNDOS, y la tarjeta se pintaba con `corriendo &&
                        avance`: durante ese minuto la pantalla no decía nada
                        del estudio y parecía que no pasaba nada.
                        Ahora se abre en cuanto arranca, diciendo qué está
                        haciendo, y el texto la va llenando. */}
                    {/* ═══ LA TARJETA QUE NO PODÍA APARECER ═══
                        Estaba condicionada a `paso === 'criterio'`, y ESE PASO
                        NO SE FIJA NUNCA: `setPaso` sólo se llama con 'ficha',
                        'adelanto', 'acervo' y 'proyecto'. La comprobación era
                        imposible de cumplir, así que el panel entero —el
                        estudio viéndose escribir, las palabras contadas, el
                        cursor— era código muerto y la pantalla se quedaba muda
                        los dos a cuatro minutos que tarda la redacción, que es
                        la espera más larga de la herramienta.

                        Es exactamente lo que David había reclamado —«tampoco
                        existe el streaming de la generación de la sentencia»—:
                        se arregló el momento en que la tarjeta se abre y se
                        quedó sin arreglar que no se abría nunca.

                        Mientras se redacta, el paso real es 'acervo'. Se
                        excluye `proponiendo` porque esa llamada también levanta
                        `corriendo` con el mismo paso, y entonces la tarjeta
                        diría «preparando el estudio» mientras el motor propone
                        el sentido, que es otra cosa. */}
                    {corriendo && !proponiendo && paso === 'acervo' && (
                        <Tarjeta>
                            <Rotulo accion={
                                <span className="text-[12px] tabular-nums text-white/45">
                                    {avance ? `${avance.trim().split(/\s+/).length} palabras`
                                            : 'leyendo el acervo'}
                                </span>
                            }>
                                {rotuloDelFlujo(faseSrv, !!avance).titulo}
                            </Rotulo>
                            <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/75">
                                    {/* Lo que dice cada fase —preparando, recalificando,
                                        ordenando— vive en `rotuloDelFlujo`
                                        (recalificacion.ts), probado sin servidor. */}
                                    {avance || rotuloDelFlujo(faseSrv, false).cuerpo}
                                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent-gold align-middle" />
                                </p>
                            </div>
                        </Tarjeta>
                    )}

                    <span id="proyecto" />
                    {/* ═══ LA PANTALLA TERMINADA, DESDE EL HISTORIAL ═══
                        David: «cada usuario podrá acceder a su pantalla
                        terminada y, si lo desea, cambiar de sentido el proyecto
                        y volver a generarlo».

                        Se pinta sólo cuando NO hay proyecto recién generado: si
                        el secretario acaba de resolver, manda lo que tiene en la
                        mano, con su .docx en memoria. Ésta es la de volver, y su
                        documento vive en el almacén.

                        DICE CON QUÉ CRITERIO SALIÓ, que es la mitad del encargo:
                        sin verlo, «cambiar de sentido» es cambiar a ciegas. */}
                    {!proyecto && previo && (
                        <>
                            <Tarjeta>
                                <Rotulo accion={
                                    <span className="text-[12px] text-white/45">
                                        {previo.generadoEn
                                            ? new Date(previo.generadoEn).toLocaleString('es-MX', {
                                                dateStyle: 'long', timeStyle: 'short' })
                                            : 'sin fecha'}
                                    </span>
                                }>
                                    Proyecto ya generado
                                </Rotulo>
                                {previo.parcial ? (
                                    /* SE GENERÓ ANTES DE QUE SE GUARDARA LA FICHA.
                                       Consta cuándo y está su documento; de las
                                       palabras, los avisos y el criterio no hay
                                       registro, y se dice en vez de enseñar ceros. */
                                    <p className="text-[13px] leading-relaxed text-white/60">
                                        Este asunto ya tiene sentencia escrita y su documento
                                        se puede descargar.{' '}
                                        <span className="text-white/45">
                                            Se generó antes de que el taller guardara la ficha,
                                            así que de sus avisos y de su criterio no hay
                                            registro: para volver a verlos habría que generarlo
                                            otra vez.
                                        </span>
                                    </p>
                                ) : (
                                    <p className="text-[13px] leading-relaxed text-white/60">
                                        Este asunto ya tiene sentencia escrita:{' '}
                                        <span className="text-white/90">
                                            {previo.palabras.toLocaleString('es-MX')} palabras
                                        </span>
                                        {previo.avisos.length > 0 && <>, {previo.avisos.length} avisos</>}
                                        {previo.huecos.length > 0 && <> y {previo.huecos.length} huecos de tu criterio</>}.
                                    </p>
                                )}

                                {/* CON QUÉ SE RESOLVIÓ */}
                                {(previo.sentidoGlobal || previo.criterios.length > 0) && (
                                    <div className="mt-3 rounded-xl border border-white/[0.07]
                                                    bg-white/[0.02] p-3">
                                        <p className="mb-1.5 text-[10px] font-semibold uppercase
                                                      tracking-wide text-white/45">
                                            Con qué criterio salió
                                        </p>
                                        {previo.sentidoGlobal && (
                                            <p className="text-[13px] text-white/75">
                                                Todo el asunto:{' '}
                                                <span className="font-medium text-white/90">
                                                    {previo.sentidoGlobal.replace(/_/g, ' ')}
                                                </span>
                                            </p>
                                        )}
                                        {previo.criterios.length > 0 && (
                                            <ul className="mt-1.5 grid gap-1">
                                                {previo.criterios.map((c, i) => (
                                                    <li key={i} className="text-[12px] leading-snug text-white/60">
                                                        <span className="font-medium text-white/75">
                                                            {c.sentido.replace(/_/g, ' ')}
                                                        </span>
                                                        {' · '}{c.problema}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                            onClick={() => descargarDelAlmacen(encargo.numero, correo)}>
                                        <Download className="h-4 w-4" />
                                        Descargar el proyecto
                                    </button>
                                    {/* CAMBIAR DE SENTIDO ES VOLVER AL ACERVO, no
                                        saltar al criterio: los planteamientos y el
                                        material se cargan ahí, y sin ellos la
                                        ventana de criterio no tiene qué calificar.
                                        Son unos cuarenta segundos y se dicen. */}
                                    <button className={cn(boton, 'border border-white/10 bg-white/[0.05] text-white/90 hover:bg-white/[0.08]')}
                                            disabled={corriendo}
                                            onClick={volverAEstudiar}>
                                        {corriendo
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Search className="h-4 w-4" />}
                                        Quiero cambiar de sentido
                                    </button>
                                </div>
                                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                                    Volver a generar reescribe el documento de este expediente:
                                    se guarda el último, no todos los intentos. Descarga el
                                    actual antes si quieres conservarlo.
                                </p>
                            </Tarjeta>

                            {/* EL AVISO DE BORRADOR, IGUAL QUE EL DÍA QUE SE GENERÓ.
                                Los textos de los avisos y de los huecos se guardaron
                                con la ficha: sin ellos esta pantalla diría «12 avisos»
                                y el secretario no sabría cuáles, que es exactamente el
                                fallo que este recuadro vino a cerrar. */}
                            {!previo.parcial && (
                                <BotonOpinion hecha={opinadas.has(`${encargo.numero}|${previo.version ?? 0}`)}
                                              onAbrir={() => setOpinion({ version: previo.version ?? 0 })} />
                            )}
                            {!previo.parcial && (
                            <AvisoBorrador datos={{
                                palabras: previo.palabras,
                                avisos: previo.avisos.length,
                                huecos: previo.huecos.length,
                                tieneAdvertencias: previo.advertencias,
                                textoAvisos: previo.avisos,
                                textoHuecos: previo.huecos,
                            }} />
                            )}
                            {/* EL MAPA DEL ESTUDIO, IGUAL QUE EL DÍA QUE SE GENERÓ
                                (Paso 2): viene en la ficha. No se lee el plan de la
                                sesión: pudo cambiar después de este proyecto. */}
                            {!previo.parcial && previo.mapa && (
                                <MapaDelEstudio mapa={previo.mapa}
                                                esRecurso={encargo.tipoAsunto !== 'amparo_directo'}
                                                verCobertura={esCasa} />
                            )}
                        </>
                    )}

                    {proyecto && (
                        <>
                            {/* ═══ PASO 4: EL WORD, Y LOS AVISOS EN TRES BOTONES ═══
                                David: «reducirlo a botones y entonces sí desplegar».
                                Primero lo que el secretario vino a buscar —el
                                documento, con sus cifras— y las dos salidas: bajarlo
                                o cambiar el sentido. Los avisos van debajo, agrupados. */}
                            <Tarjeta glow className="border-accent-gold/30">
                                <p className="text-[12px] uppercase tracking-[0.14em] text-accent-gold/80">
                                    Paso 4 · proyecto listo para revisar
                                </p>
                                <h2 className="mt-2 font-serif text-xl font-medium text-white">
                                    {proyecto.nombre}
                                </h2>
                                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                                        <p className="text-[16px] font-semibold tabular-nums text-white">
                                            {proyecto.palabras.toLocaleString('es-MX')}
                                        </p>
                                        <p className="text-[12px] text-white/45">palabras · {Math.max(1, Math.round(proyecto.palabras / 380))} páginas</p>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                                        <p className="text-[16px] font-semibold text-white">
                                            {sentidoGlobal ? sentidoGlobal.replace(/_/g, ' ') : `${problemas.filter((q) => q.sentido).length} de ${problemas.length}`}
                                        </p>
                                        <p className="text-[12px] text-white/45">
                                            {sentidoGlobal ? 'sentido de todo el asunto' : 'problemas con sentido'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
                                        <p className="text-[16px] font-semibold tabular-nums text-white">
                                            {proyecto.avisos}
                                        </p>
                                        <p className="text-[12px] text-white/45">avisos, agrupados abajo</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                                    <button type="button" onClick={() => descargarProyecto(proyecto)}
                                            className={cn(boton,
                                                'h-11 bg-gradient-to-b from-[#e3c98a] to-accent-gold text-charcoal-900',
                                                'shadow-[0_10px_30px_-12px_rgba(201,169,98,0.7)] hover:-translate-y-px')}>
                                        <Download className="h-4 w-4" />
                                        Descargar el Word
                                    </button>
                                    <button type="button" disabled={corriendo}
                                            onClick={volverAEstudiar}
                                            className={cn(boton, 'h-11 border border-white/15 bg-white/[0.05] text-white/90 hover:bg-white/[0.08]')}>
                                        <Search className="h-4 w-4" />
                                        Quiero cambiar de sentido
                                    </button>
                                    <p className="text-[12px] leading-relaxed text-white/45">
                                        Ya se descargó al terminar. Es un .docx sobre la plantilla del tribunal.
                                    </p>
                                </div>
                            </Tarjeta>
                            <BotonOpinion hecha={opinadas.has(`${encargo.numero}|${proyecto.version ?? 0}`)}
                                          onAbrir={() => setOpinion({ version: proyecto.version ?? 0 })} />
                            <AvisoBorrador datos={{
                                palabras: proyecto.palabras, avisos: proyecto.avisos,
                                huecos: proyecto.huecos, tieneAdvertencias: proyecto.tieneAdvertencias,
                                textoAvisos: proyecto.textoAvisos,
                                textoHuecos: proyecto.textoHuecos,
                            }} />
                            {/* ═══ EL MAPA DEL ESTUDIO (Paso 2, 26-sep-2026) ═══
                                Debajo del aviso de borrador, no en su lugar: el
                                aviso es condición de lanzamiento y va siempre a la
                                vista. Sólo con las variantes que marcan (v3/v4).
                                Si el «listo» no trajo el plan, se lee el de la
                                sesión, y sólo vale si su clave es la del plan que
                                el «listo» dice haber usado: si el de esta decisión
                                no salió, la fila guarda el de la anterior.
                                La cobertura (V1), sólo a casa: sin calibrar. */}
                            {proyecto.mapa && (
                                <MapaDelEstudio mapa={proyecto.mapa}
                                                esRecurso={encargo.tipoAsunto !== 'amparo_directo'}
                                                leer={() => leerPlan(encargo.numero, correo)}
                                                verCobertura={esCasa} />
                            )}
                            {/* EL FINAL DEL CAMINO DECÍA «DE NUEVO» SIN HABER
                                DICHO NADA LA PRIMERA VEZ. El .docx se descarga
                                solo al terminar —y bien, porque es lo que el
                                secretario viene a buscar—, pero si el navegador
                                lo guarda sin avisar, lo único que queda en
                                pantalla es un botón que ofrece repetir algo que
                                nunca se vio. Ahora se dice qué documento es y
                                que ya está bajado; el botón sigue ahí para
                                quien no lo encuentre. */}

                        </>
                    )}
                </div>
            </main>
            <VentanaTesis tesis={tesisAbierta} onCerrar={() => setTesisAbierta(null)} />
            <OpinionProyecto abierto={!!opinion} numero={encargo.numero} correo={correo}
                             version={opinion?.version ?? 0}
                             // Cerrar sin enviar TAMBIÉN la da por vista: no se
                             // vuelve a abrir sola en esa versión. El botón sigue.
                             onCerrar={() => {
                                 if (opinion) marcarOpinion(`${encargo.numero}|${opinion.version}`);
                                 setOpinion(null);
                             }}
                             onGuardada={() => {
                                 if (opinion) marcarOpinion(`${encargo.numero}|${opinion.version}`);
                             }} />
        </div>
    );
}

/** El botón que abre la opinión desde la tarjeta del proyecto. */
function BotonOpinion({ hecha, onAbrir }: { hecha: boolean; onAbrir: () => void }) {
    return (
        <button type="button" onClick={onAbrir}
                className={cn('flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                    'border-accent-gold/25 bg-accent-gold/[0.05] hover:border-accent-gold/45 hover:bg-accent-gold/[0.08]')}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-gold/35 bg-accent-gold/[0.1]">
                <Star className="h-4 w-4 text-accent-gold" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-white/90">
                    {hecha ? 'Tu opinión sobre este proyecto' : '¿Qué tal salió? Danos tu opinión'}
                </span>
                <span className="block text-[12px] text-white/50">
                    {hecha ? 'Ábrela para revisarla o cambiarla.'
                           : 'Un minuto: la nota, cuánto corregiste y qué mejorarías. Con eso se afina el redactor.'}
                </span>
            </span>
        </button>
    );
}
