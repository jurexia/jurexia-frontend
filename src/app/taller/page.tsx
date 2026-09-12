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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Download, Search, FileText, AlertCircle } from 'lucide-react';
import { useRequireAuth } from '@/lib/useAuth';
import BarraSuperior from '@/components/sentencia/BarraSuperior';
import EntradaTaller from '@/components/sentencia/EntradaTaller';
import type { ViaEntrada, PasoArchivos } from '@/components/sentencia/EntradaTaller';
import PanelDocumentos from '@/components/sentencia/PanelDocumentos';
import LineaDeFases from '@/components/sentencia/LineaDeFases';
import VentanaCriterio from '@/components/sentencia/VentanaCriterio';
import FormularioEncargo, { ENCARGO_VACIO, faltaEnEncargo } from '@/components/sentencia/FormularioEncargo';
import type { TipoAsunto } from '@/components/sentencia/api';
import type { Encargo } from '@/components/sentencia/FormularioEncargo';
import AvisoBorrador, { AvisoPiloto } from '@/components/sentencia/AvisoBorrador';
import { Tarjeta, Rotulo, cn } from '@/components/sentencia/primitivas';
import type { Asunto, Documento, Fase, ProblemaJuridico, RolDocumento } from '@/components/sentencia/tipos';
import {
    generarAdelanto, descargar, consultarAcervo, resolverConCriterio,
    resolverConSentidoGlobal,
    proponerSolucion, aportarContexto, resolverEnVivo,
    type RespuestaPropuesta,
    estadoPiloto, descargarProyecto,
    sisePendiente, generarDesdeExpediente, NecesitaNotificacion, razonarSentido,
    contextoDelAsunto,
    URL_EXTENSION, URL_COMPLEMENTO, URL_SISE, descartarPendiente,
    fichaDesdeAdmision,
} from '@/components/sentencia/api';
import type { PendienteSISE, FaltaLaFecha, ContextoDelAsunto } from '@/components/sentencia/api';
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

const boton = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 ' +
    'text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

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
                <span className="text-[12.5px] font-medium text-white/80">{titulo}</span>
                {nota && (
                    <span className="ml-auto shrink-0 text-[11px] text-white/35">{nota}</span>
                )}
                <span className="shrink-0 text-[11px] text-white/40">
                    <span className="group-open:hidden">ver</span>
                    <span className="hidden group-open:inline">ocultar</span>
                </span>
            </summary>
            <div className="px-3 pb-3 pt-0.5">{children}</div>
        </details>
    );
}


export default function TallerDeSentencias() {
    const { user, loading: authLoading } = useRequireAuth();
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
    const [pasoArchivos, setPasoArchivos] = useState<PasoArchivos | null>(null);
    const [fichando, setFichando] = useState(false);
    const [fichado, setFichado] = useState<string[]>([]);
    const leerAdmision = useCallback(async (archivo: File) => {
        setError(''); setFichando(true); setFichado([]);
        try {
            const { ficha, leidos, avisos } = await fichaDesdeAdmision(correo, archivo);
            setEncargo((prev) => {
                const x = { ...prev };
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
                poner('quejoso', ficha.quejoso);
                poner('responsable', ficha.responsable);
                poner('tercero', ficha.tercero_interesado);
                poner('tribunal', ficha.tribunal);
                poner('ciudad', ficha.ciudad);
                poner('magistrado', ficha.magistrado);
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
    /* BORRAR PIDE CONFIRMACIÓN, pero no un modal: el mismo botón cambia de
       texto. Borrar tira las constancias y hay que volver a traerlas de SISE,
       así que un clic despistado cuesta trabajo de verdad. */
    const [confirmaBorrar, setConfirmaBorrar] = useState(false);
    const [ficheros, setFicheros] = useState<Partial<Record<RolDocumento | 'plantilla', File>>>({});
    const [material, setMaterial] = useState<MaterialDelCaso | null>(null);
    const [problemas, setProblemas] = useState<ProblemaJuridico[]>([]);
    const [proyecto, setProyecto] = useState<ResultadoProyecto | null>(null);

    useEffect(() => {
        if (!correo) return;
        estadoPiloto(correo).then(setPiloto).catch(() => setPiloto(null));
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
            void traerContexto(encargo.numero);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo generar el adelanto.');
        } finally { setCorriendo(false); }
    }, [encargo, ficheros, correo]);

    const pedirAcervo = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            /* EL CONTEXTO VA EN LA BÚSQUEDA, no después de ella.
               David: «primero debe presentarse todo el contexto jurídico y
               después buscar la solución; así el sistema va a tener mejor
               capacidad de buscar jurisprudencia o las normas aplicables».
               Hasta ahora este texto sólo se pedía DESPUÉS de proponer, y sólo
               si alguna propuesta no alcanzaba. */
            if (contexto.trim()) {
                await aportarContexto(correo, null, contexto, encargo.numero)
                    .catch(() => { /* si no se pudo guardar, igual viaja abajo */ });
            }
            const m = await consultarAcervo(encargo.numero, correo,
                                            'leyes_queretaro', contexto);
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
            // El adelanto está: lo siguiente es el botón rojo.
            irA('recorrido');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo consultar el acervo.');
        } finally { setCorriendo(false); }
    }, [encargo.numero, correo]);

    /* LO QUE EL SECRETARIO TOCA A MANO NO SE PISA NUNCA MÁS.
       Sin esta lista no había forma de distinguir un sentido que él eligió de
       uno que rellenó la propuesta, y por eso se perdía el suyo: David marcó
       INFUNDADO el concepto de la pericial declarada desierta y el proyecto
       salió FUNDADO. */
    const [tocados, setTocados] = useState<Set<string>>(new Set());
    /* Y SI EL SENTIDO GLOBAL LO ELIGIÓ ÉL. La pantalla también lo fija sola al
       llegar la propuesta —con el sentido del MODELO—, y confundir las dos
       cosas es lo que hizo que David dictara «infundado global» y recibiera un
       proyecto que amparaba. */
    const [globalDictado, setGlobalDictado] = useState(false);
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
            if (suya) return { ...p, sentido: _s };
            return { ...p, sentido: _s, criterio: '', razonDe: undefined };
        }));
        if (campo === 'sentido' && valor) {
            setTocados((prev) => new Set(prev).add(id));
        }
    }, []);

    // LA PROPUESTA DE SOLUCIÓN. El motor sugiere el sentido de cada problema
    // con su razón y los registros que lo apoyan; el secretario la acepta tal
    // cual, la edita o dicta el suyo. Sin este paso el proyecto salía con la
    // calificación que trajera la plantilla, y así nacían las incongruencias.
    const pedirPropuesta = useCallback(async () => {
        setError(''); setCorriendo(true); setProponiendo(true);
        try {
            const p = await proponerSolucion(encargo.numero, correo, contexto);
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
                if (tocados.has(q.id)) {
                    return { ...base, criterio: q.criterio || s?.razon || '' };
                }
                return s && s.alcanza && valido
                    ? { ...base, sentido: valido, criterio: q.criterio || s.razon }
                    : base;
            }));
            if (!p.propuestas.length) {
                setError('El motor no propuso ningún sentido. Dicta tu criterio.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo obtener la propuesta.');
        } finally { setCorriendo(false); setProponiendo(false); }
    }, [encargo.numero, correo, contexto]);

    const aportarYProponer = useCallback(async (doc: File | null, texto: string) => {
        setError(''); setAportando(true);
        try {
            const c = await aportarContexto(correo, doc, texto);
            setContexto(c.texto);
            const p = await proponerSolucion(encargo.numero, correo, c.texto);
            setPropuesta(p);
            setProblemas((prev) => prev.map((q, i) => {
                const s2 = p.propuestas[i];
                const valido = (['fundado', 'esencialmente_fundado',
                                 'sustancialmente_fundado', 'parcialmente_fundado',
                                 'fundado_insuficiente', 'infundado', 'inoperante',
                                 'inatendible', 'ineficaz', 'sin_materia'] as const)
                    .find((x) => x === s2?.sentido);
                return s2 && s2.alcanza && valido
                    ? { ...q, sentido: valido, criterio: q.criterio || s2.razon }
                    : q;
            }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo leer el documento.');
        } finally { setAportando(false); }
    }, [correo, encargo.numero]);

    const pedirProyecto = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            // SE MANDAN TODOS LOS SENTIDOS, NO EL PRIMERO. Antes se tomaba
            // `problemas.find(p => p.sentido)` y los demás se perdían: el
            // secretario calificaba seis problemas y el estudio recibía uno.
            // Con varios criterios el resolutivo sale mixto donde debe salir
            // mixto, que es lo que hace que concuerde con el estudio.
            // EL MODO GLOBAL NO PASA POR AQUÍ. El secretario dictó un sentido
            // para el proyecto entero y el servidor lo reparte: mandar además
            // los criterios por problema sería dar dos órdenes distintas.
            if (modo === 'global') {
                if (!sentidoGlobal) {
                    setError('Elige el sentido del problema principal.');
                    setCorriendo(false);
                    return;
                }
                /* LO QUE ÉL MARCÓ VIAJA TAMBIÉN AQUÍ, y manda.
                   Este camino decía «mandar además los criterios por problema
                   sería dar dos órdenes distintas» y por eso los tiraba. El
                   razonamiento daba por hecho que el sentido global era la
                   palabra del secretario, y no lo es: lo pone la propuesta del
                   modelo en cuanto llega. Así que se tiraba lo único que él
                   había dicho de verdad.
                   Ahora el global RELLENA los problemas que no tocó, y donde
                   marcó algo gana su marca. El servidor aplica esa regla en
                   modos_decision.repartir y lo dice en un aviso. */
                const suyos = problemas.filter((p) => tocados.has(p.id) && p.sentido);
                // POR EL FLUJO, NO POR LA LLAMADA BLOQUEANTE. El servidor
                // tenía este camino escrito y nadie lo llamaba: todo salía por
                // /taller/resolver, que devuelve el .docx en una sola respuesta
                // al cabo de varios minutos. Medido el 7-sep-2026 en la
                // revisión 410/2026: el servidor TERMINÓ el trabajo dos veces
                // —«200 · 4,031 palabras», sin timeout ni traza— y la respuesta
                // no llegó. El proyecto existía y era inalcanzable.
                setAvance('');
                // SE BAJA AL ESTUDIO AL ARRANCAR. Estaba en el primer trozo,
                // que llega a los 61 segundos: el secretario se quedaba
                // mirando la pantalla anterior sin saber que ya se estaba
                // trabajando.
                irA('estudio', 200);
                const rg = await resolverEnVivo(
                    encargo.numero, correo, {
                        sentidoGlobal, contexto, razonGlobal, globalDictado,
                        // LO QUE ÉL MARCÓ, con su razón y su grupo. Va junto al
                        // sentido global, no en lugar de él: el servidor usa el
                        // global de relleno y respeta cada marca expresa.
                        criteriosJson: suyos.length
                            ? JSON.stringify(suyos.map((p) => ({
                                  problema: p.pregunta,
                                  sentido: p.sentido,
                                  razonamiento: p.criterio ?? '',
                                  grupo: grupos[p.id] ?? '',
                                  jerarquia: p.jerarquia ?? 'accesorio',
                                  prediccion: p.prediccion ?? {},
                              })))
                            : undefined,
                        // Qué resolvió el órgano recurrido, del contexto que
                        // escribió el motor. Decide el verbo del resolutivo.
                        resolvioDeclarado: propuesta?.global?.contexto?.resolvio ?? '',
                        // Y la propuesta global entera, para el estudio.
                        globalJson: propuesta?.global
                            ? JSON.stringify(propuesta.global) : '',
                        // Y los conceptos de violación, si el secretario los
                        // aportó: sin ellos el proyecto levanta el
                        // sobreseimiento y deja el estudio pendiente.
                        conceptosViolacion,
                        // Y la autoridad, si la corrigió después del adelanto.
                        responsable: encargo.responsable,
                        // Lo que él resolvió sobre la oportunidad. Viaja en la
                        // petición y no en memoria: con -w 2 el worker que
                        // compone no es el que leyó el expediente.
                        oportunidadDecision: decision,
                        oportunidadMotivo: motivoDecision,
                    },
                    (t) => setAvance((x) => x + t),
                    () => setAvance((x) => x + '\n\n… componiendo el documento'));
                setProyecto(rg);
                descargarProyecto(rg);
                setPaso('proyecto');
                // Terminó: al aviso de borrador, que es lo que hay que leer
                // ANTES de abrir el documento.
                irA('proyecto', 400);
                setCorriendo(false);
                return;
            }
            const conSentido = problemas.filter((p) => p.sentido);
            const criteriosJson = conSentido.length
                ? JSON.stringify(conSentido.map((p) => ({
                      problema: p.pregunta,
                      sentido: p.sentido,
                      razonamiento: p.criterio ?? '',
                      // EL GRUPO VIAJA CON EL CRITERIO. Si el secretario marcó
                      // dos planteamientos como una sola línea argumentativa,
                      // el estudio tiene que saberlo: es lo único que autoriza
                      // resolverlos con una calificación conjunta.
                      grupo: grupos[p.id] ?? '',
                      // LO QUE SE SEMBRÓ TIENE QUE VOLVER. Este objeto se
                      // reconstruía con tres campos y perdía la jerarquía y la
                      // predicción, que es lo que ordena el estudio por
                      // prelación lógica y lo que avisa de ir contra la
                      // corriente del acervo. Es el gemelo exacto del fallo que
                      // ya costó una ronda en el servidor: un arreglo
                      // reconstruye una lista y descarta lo que otro sembró.
                      jerarquia: p.jerarquia ?? 'accesorio',
                      prediccion: p.prediccion ?? {},
                  })))
                : undefined;
            setAvance('');
            const r = await resolverEnVivo(
                encargo.numero, correo, {
                    criterio: criteriosJson ? null : {
                        sentido: problemas[0]?.sentido ?? 'infundado',
                        problema: problemas[0]?.pregunta ?? '',
                        razonamiento: problemas.filter((p) => p.criterio)
                            .map((p) => `${p.pregunta}\n${p.criterio}`).join('\n\n'),
                    },
                    criteriosJson, contexto,
                    // También por este camino: los dos componen el documento.
                    responsable: encargo.responsable,
                    // Por este camino también: los dos componen el documento.
                    oportunidadDecision: decision,
                    oportunidadMotivo: motivoDecision,
                },
                (t) => setAvance((x) => {
                    // AL PRIMER TROZO, y sólo al primero: si se moviera en cada uno la
                    // pantalla temblaría durante los dos minutos que dura el estudio.
                    if (!x) irA('estudio', 120);
                    return x + t;
                }),
                () => setAvance((x) => x + '\n\n… componiendo el documento'));
            setProyecto(r);
            descargarProyecto(r);
            irA('proyecto', 400);
            setPaso('proyecto');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo redactar el proyecto.');
        } finally { setCorriendo(false); }
    }, [problemas, encargo.numero, encargo.responsable, correo, contexto, modo,
        sentidoGlobal, razonGlobal, decision, motivoDecision]);

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

    return (
        <div className="min-h-screen bg-charcoal-900 font-sans text-white antialiased">
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-[0.55]"
                 style={{ background: 'radial-gradient(70% 100% at 50% 0%, rgba(201,169,98,0.10) 0%, transparent 70%)' }} />

            <BarraSuperior asunto={asunto} />

            <main className={cn(
                'relative mx-auto grid max-w-[1500px] gap-4 px-4 py-5 sm:px-6',
                /* SIN CAMINO ELEGIDO NO HAY DOS COLUMNAS QUE REPARTIR: la
                   elección ocupa el ancho y se lee de una vez. En cuanto se
                   elige, vuelve la retícula de trabajo de siempre. */
                (paso !== 'ficha' || via || pendientes.length > 0)
                    ? 'lg:grid-cols-[minmax(320px,400px)_1fr]'
                    : 'lg:grid-cols-1')}>
                <div className="flex flex-col gap-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto lg:pr-1">
                    {piloto && <AvisoPiloto secretarios={piloto.secretarios} cupo={piloto.cupo} />}
                    {/* ═══ LA FICHA, SIN TECLEARLA ═══
                        Optativo y dicho como tal: quien no lo use no pierde
                        nada, y quien lo use no queda atado —lo leído entra
                        como propuesta en campos que siguen siendo suyos—.
                        El auto de admisión es el único papel del expediente
                        que dice, en su primera página, cómo se llama el
                        asunto y quién es cada quien. */}
                    {paso === 'ficha' && via === 'archivos' && pasoArchivos === 'admision' && (
                        <label className={cn(
                            'block cursor-pointer rounded-2xl border border-dashed px-4 py-3 transition',
                            fichando
                                ? 'border-accent-gold/40 bg-accent-gold/[0.05]'
                                : 'border-white/15 bg-white/[0.02] hover:border-accent-gold/30')}>
                            <input type="file" accept=".pdf" className="hidden"
                                   disabled={fichando}
                                   onChange={(e) => {
                                       const f = e.target.files?.[0];
                                       e.target.value = '';
                                       if (f) void leerAdmision(f);
                                   }} />
                            <span className="flex items-center gap-2 text-[12.5px] font-medium text-white/75">
                                {fichando
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-gold" />
                                    : <FileText className="h-3.5 w-3.5 text-accent-gold/70" />}
                                {fichando ? 'Leyendo el auto…' : '¿Tienes el auto de admisión?'}
                            </span>
                            <span className="mt-1 block text-[11.5px] leading-relaxed text-white/45">
                                Súbelo y se rellenan solos el expediente, el tribunal, la autoridad
                                responsable, el tercero interesado y quien promueve. Es opcional:
                                puedes teclear la ficha como siempre, y lo que ya hayas escrito no
                                se toca.
                            </span>
                            {fichado.length > 0 && (
                                <span className="mt-2 flex flex-wrap gap-1.5">
                                    {fichado.map((k) => (
                                        <span key={k}
                                              className="rounded-md border border-emerald-400/30 bg-emerald-400/[0.08]
                                                         px-1.5 py-0.5 text-[10.5px] text-emerald-300/90">
                                            {k.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                    <span className="text-[11px] text-white/40">
                                        leídos del auto · compruébalos
                                    </span>
                                </span>
                            )}
                        </label>
                    )}
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
                    {(paso !== 'ficha' || (via === 'archivos') || pendientes.length > 0) && (
                        <FormularioEncargo valor={encargo} onCambiar={setEncargo} onTipo={setTipoSel}
                                           deshabilitado={corriendo || paso !== 'ficha'} />
                    )}
                    {(paso !== 'ficha' || (via === 'archivos') || pendientes.length > 0) && (
                        <PanelDocumentos documentos={documentos} onSoltar={soltar} onQuitar={quitar}
                                         extractos={[]} vocabulario={voz} />
                    )}
                    {/* La plantilla propia tampoco pinta nada antes de elegir
                        camino: es el último detalle de un trabajo que aún no
                        ha empezado. */}
                    {(paso !== 'ficha' || (via === 'archivos') || pendientes.length > 0) && (
                    <label className={cn('block cursor-pointer rounded-xl border border-dashed',
                        'border-white/15 bg-white/[0.02] px-4 py-3 text-[12px] text-white/50',
                        'transition hover:border-accent-gold/30 hover:text-white/70')}>
                        <input type="file" accept=".docx" className="hidden"
                               onChange={(e) => e.target.files?.[0] &&
                                   setFicheros((p) => ({ ...p, plantilla: e.target.files![0] }))} />
                        {ficheros.plantilla
                            ? <>Plantilla propia: <span className="text-white/80">{ficheros.plantilla.name}</span></>
                            : <>Se usará la plantilla del tribunal ya cargada. Sube una .docx sólo si quieres otra.</>}
                    </label>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    {sinAcceso && (
                        <Tarjeta className="border-amber-400/30 bg-amber-400/[0.06]">
                            <p className="text-[13px] text-amber-100">
                                El taller de sentencias es una función Platinum.
                            </p>
                        </Tarjeta>
                    )}

                    {error && (
                        <Tarjeta className="border-red-400/30 bg-red-400/[0.06]">
                            <div className="flex gap-2.5">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                                <p className="text-[13px] leading-relaxed text-red-100">{error}</p>
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
                                       hayFicha={!!encargo.numero && !!encargo.tipoAsunto} />
                    )}

                    {pendientes.length === 0 && paso === 'ficha' && via === 'sise' && (
                    <Tarjeta>
                        <Rotulo accion={<span className="text-[11px] text-white/30">se instala una vez</span>}>
                            Trae el expediente desde SISE
                        </Rotulo>
                        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                            Con el complemento instalado, abres tu expediente en SISE, pulsas
                            <span className="text-white/85"> Vista Expediente Electrónico</span> y desde
                            ahí mandas las constancias al taller. No hace falta que teclees el número,
                            el tipo ni la ponencia: salen de los autos.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-4">
                            <a href={URL_EXTENSION} download
                               className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}>
                                <Download className="h-4 w-4" />
                                Descargar el complemento
                            </a>
                            <a href={URL_COMPLEMENTO} target="_blank" rel="noopener"
                               className="text-[12px] text-white/45 underline underline-offset-2
                                          hover:text-white/70">
                                ver los pasos y la política
                            </a>
                            <span className="text-[12px] text-white/35">Chrome · en tu computadora</span>
                        </div>
                        {/* LO QUE PASA DESPUÉS, dicho antes. Sin esto el
                            secretario instala, manda las constancias y no sabe
                            que tiene que volver aquí. */}
                        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5
                                      text-[12px] leading-relaxed text-white/60">
                            Una vez que instales el complemento y, desde la vista del expediente
                            electrónico, selecciones las constancias y pulses{' '}
                            <span className="text-white/85">Mandar constancias seleccionadas al
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
                        <ol className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-white/45">
                            <li><span className="text-white/70">1.</span> Descomprime el archivo.</li>
                            <li><span className="text-white/70">2.</span> En Chrome, entra a
                                <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-white/75">chrome://extensions</code>
                                y enciende <span className="text-white/70">Modo de desarrollador</span>.</li>
                            <li><span className="text-white/70">3.</span> Pulsa
                                <span className="text-white/70"> Cargar descomprimida</span> y elige la
                                carpeta <span className="text-white/70">iurexia-sise</span>.</li>
                        </ol>
                        {/* EL CORREO, A LA VISTA. La extensión pide un correo escrito a
                            mano, y una letra cambiada manda las constancias a un sitio
                            donde nadie las busca: le pasó a David —jmd en vez de jdm— y
                            el envío dijo «Listo» igualmente. Enseñar aquí con qué cuenta
                            está mirando el taller hace visible ese desajuste. */}
                          </Pliegue>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1
                                        border-t border-white/[0.08] pt-3">
                            <span className="text-[12px] text-white/40">
                                Este taller mira las constancias de{' '}
                                <span className="text-white/80">{correo}</span>
                            </span>
                            <button type="button" onClick={() => void mirarPendientes()}
                                    disabled={mirando}
                                    className="text-[12px] text-accent-gold underline
                                               underline-offset-2 hover:text-accent-gold/80
                                               disabled:opacity-40">
                                {mirando ? 'buscando…' : 'buscar ahora'}
                            </button>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/30">
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
                        <p className="mt-3 text-[11px] leading-relaxed text-white/30">
                            Son tres pasos y no uno porque Chrome sólo instala de un clic lo que viene
                            de su tienda, y publicar ahí exige revisión.
                        </p>
                        {/* PRIVACIDAD, DICHA COMO ES. Se escribió después de comprobar en
                            el código qué se guarda de verdad y de añadir el borrado: antes
                            no había ninguno, y prometerlo habría sido falso sobre datos de
                            terceros que no eligieron estar ahí. */}
                        <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                            <span className="text-white/50">Privacidad.</span> Iurexia no guarda tu
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
                        <Rotulo accion={<span className="text-[11px] text-white/30">
                            {pendientes.length === 1 ? 'traído por la extensión'
                                                     : `${pendientes.length} esperando`}
                        </span>}>
                            Tienes un expediente esperando
                        </Rotulo>

                        {pendientes.length > 1 && (
                            <select value={elegido} onChange={(ev) => setElegido(ev.target.value)}
                                    className="mt-3 w-full rounded-lg border border-white/12 bg-white/[0.05]
                                               px-3 py-2 text-[13px] text-white/90">
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
                                    <p className="text-[13px] text-white/85">
                                        <span className="font-medium">{p.numero}</span>
                                        {p.tipoSise && <span className="text-white/55"> · {p.tipoSise}</span>}
                                    </p>
                                    {p.organo && <p className="text-[12px] text-white/40">{p.organo}</p>}
                                    {p.documentos.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {p.documentos.map((d, i) => (
                                                <span key={i} className="rounded-md border border-white/10
                                                        bg-white/[0.04] px-2 py-1 text-[11px] text-white/60">
                                                    {d.que.replace(/_/g, ' ')}
                                                    {d.n > 0 && <span className="text-white/35"> · {d.n} pág</span>}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {p.presentacion && (
                                        <p className="text-[12px] text-white/40">
                                            Presentación según SISE: {p.presentacion}
                                            <span className="text-white/25"> — se confirma con la portada</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {errorSise && (
                            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/[0.08] px-3 py-2.5">
                                <p className="text-[12px] leading-relaxed text-red-100">{errorSise}</p>
                            </div>
                        )}

                        {/* LO QUE EL SERVIDOR YA SABE, cuando sólo le falta la
                            fecha. Se enseña para que el secretario vea que no
                            hay que teclear nada más. */}
                        {sabemos && (
                            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[12px] leading-relaxed text-white/70">{sabemos.dice}</p>
                                <dl className="mt-2.5 grid gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2">
                                    {Object.entries(sabemos.yaSabemos)
                                        .filter(([, v]) => v)
                                        .map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                            <dt className="shrink-0 text-white/35">
                                                {k.replace(/_/g, ' ')}
                                            </dt>
                                            <dd className="text-white/75">{String(v)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/[0.08] pt-4">
                            <label className="flex flex-col gap-1">
                                <span className="text-[11px] text-white/45">
                                    Notificación de la recurrida
                                </span>
                                <input type="date" value={fechaNotif}
                                       onChange={(ev) => setFechaNotif(ev.target.value)}
                                       className="rounded-lg border border-white/12 bg-white/[0.05]
                                                  px-3 py-2 text-[13px] text-white/90" />
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
                                        'text-[12px] underline underline-offset-2 transition',
                                        confirmaBorrar
                                            ? 'font-medium text-red-300 hover:text-red-200'
                                            : 'text-white/40 hover:text-white/70',
                                        corriendo && 'opacity-40')}>
                                {confirmaBorrar
                                    ? 'Sí, borrar este expediente y abrir SISE'
                                    : 'Borrar y trabajar en otro expediente'}
                            </button>
                            {confirmaBorrar && (
                                <button type="button" onClick={() => setConfirmaBorrar(false)}
                                        className="text-[12px] text-white/40 underline
                                                   underline-offset-2 hover:text-white/70">
                                    no, dejarlo
                                </button>
                            )}
                        </div>
                        {confirmaBorrar && (
                            <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
                                Se borran las constancias del {elegido || 'expediente'} y se abre SISE
                                para que tomes otro. Si luego lo necesitas, habrá que traerlo otra vez
                                desde el visor.
                            </p>
                        )}
                        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
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
                        <Rotulo accion={<span className="text-[11px] text-white/30">se detiene una sola vez</span>}>
                            Recorrido del asunto
                        </Rotulo>
                        <span id="recorrido" />
                        <LineaDeFases fases={fasesSegun(paso, corriendo)} />

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
                            <button className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                    disabled={corriendo || falta.length > 0 || !!sinAcceso || paso !== 'ficha'}
                                    onClick={pedirAdelanto}>
                                {corriendo && paso === 'ficha'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <FileText className="h-4 w-4" />}
                                Generar adelanto
                            </button>
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
                            <button className={cn(
                                        boton,
                                        paso === 'adelanto' && !corriendo
                                            ? 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_0_0_rgba(220,38,38,0.7)] animate-[latido_1.8s_ease-out_infinite]'
                                            : 'border border-white/12 bg-white/[0.05] text-white/85 hover:bg-white/[0.08]')}
                                    disabled={corriendo || paso === 'ficha'}
                                    onClick={pedirAcervo}>
                                {corriendo && paso === 'adelanto'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Search className="h-4 w-4" />}
                                Buscar solución jurídica
                            </button>
                        </div>

                        {falta.length > 0 && paso === 'ficha' && (
                            <p className="mt-3 text-[12px] text-white/40">
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
                        {paso !== 'ficha' && delAsunto && (
                            <div className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
                                <p className="text-[11px] uppercase tracking-wide text-accent-gold">
                                    El asunto, en corto
                                </p>

                                {delAsunto.antecedentes && (
                                    <Pliegue titulo="Antecedentes" abierto={paso === 'adelanto'}
                                             nota={`${delAsunto.antecedentes.split(/\s+/).length} palabras`}>
                                        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-white/60">
                                            {delAsunto.antecedentes}
                                        </p>
                                    </Pliegue>
                                )}

                                {delAsunto.resumenActo && (
                                    <Pliegue titulo={`Qué resolvió ${delAsunto.voz.organo}`}
                                             abierto={paso === 'adelanto'}
                                             nota={`${delAsunto.resumenActo.split(/\s+/).length} palabras`}>
                                        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-white/60">
                                            {delAsunto.resumenActo}
                                        </p>
                                    </Pliegue>
                                )}

                                {delAsunto.resumenConceptos && (
                                    <Pliegue titulo={`Qué alega quien promueve · ${delAsunto.voz.combate}`}
                                             nota={`${delAsunto.resumenConceptos.split(/\s+/).length} palabras`}>
                                        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-white/60">
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
                                {delAsunto.problemas.length > 0 && (
                                    <Pliegue titulo="Problemas jurídicos del caso"
                                             abierto={paso === 'adelanto'}
                                             nota={`${delAsunto.problemas.length} ${
                                                 delAsunto.problemas.length === 1
                                                     ? 'planteamiento' : 'planteamientos'}`}>
                                        <ol className="space-y-1.5">
                                            {delAsunto.problemas.map((q, i) => (
                                                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-white/60">
                                                    <span className="shrink-0 text-white/30">{i + 1}.</span>
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
                                           className="block text-[12px] font-medium text-white/70">
                                        Autoridad responsable
                                    </label>
                                    <input id="autoridad-resp" value={encargo.responsable ?? ''}
                                           onChange={(e) => setEncargo(
                                               (x) => ({ ...x, responsable: e.target.value }))}
                                           placeholder="No se pudo leer del acto: escríbela"
                                           className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03]
                                                      px-3 py-2 text-[12.5px] text-white/80
                                                      placeholder:text-white/25 focus:border-accent-gold/40
                                                      focus:outline-none" />
                                    <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
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
                            <div className="mt-4 border-t border-white/[0.08] pt-4">
                                <label htmlFor="ctx-previo"
                                       className="block text-[12px] font-medium text-white/70">
                                    Lo que sabes del asunto y no está en los papeles
                                </label>
                                <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
                                    Opcional. Lo que escribas aquí se usa para BUSCAR: entra en el
                                    acervo como una consulta propia, además de las preguntas de los
                                    problemas. Cuanto más preciso el concepto jurídico, mejor la
                                    jurisprudencia que vuelve.
                                </p>
                                <textarea id="ctx-previo" rows={3} value={contexto}
                                          onChange={(e) => setContexto(e.target.value)}
                                          placeholder="p. ej.: la pericial se declaró desierta porque la oferente no presentó a su perito en la fecha señalada, pese a estar notificada"
                                          className="mt-2 w-full rounded-lg border border-white/12
                                                     bg-white/[0.04] px-3 py-2.5 text-[13px]
                                                     leading-relaxed text-white/90
                                                     placeholder:text-white/25" />
                                {contexto.trim().length > 0 && (
                                    <p className="mt-1.5 text-[11px] text-white/35">
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
                                       material.normas.length} preceptos${
                                       material.materia ? ` · acervo ${material.materia}` : ''}`}>
                            <p className="mb-2.5 text-[11.5px] leading-relaxed text-white/40">
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
                                              bg-white/[0.02] px-3 py-2 text-[11.5px]
                                              leading-relaxed text-white/50">
                                    Se buscó en el acervo de materia{' '}
                                    <span className="text-white/80">{material.materia}</span>.
                                    Si el asunto no es de esa materia, cámbialo en la ficha y
                                    vuelve a buscar: de ahí sale la ley con la que se funda.
                                </p>
                            )}
                            <ul className="grid gap-2">
                                {material.tesis.slice(0, 12).map((t) => (
                                    <li key={t.registro}
                                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                                                t.obligatoria
                                                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                                    : 'border-white/10 bg-white/[0.05] text-white/50')}>
                                                {t.obligatoria ? 'Obligatoria' : 'Orientadora'}
                                            </span>
                                            <span className="text-[11px] text-white/35">
                                                Reg. {t.registro} · {t.instancia}
                                            </span>
                                        </div>
                                        <p className="text-[12px] leading-snug text-white/75">{t.rubro}</p>
                                    </li>
                                ))}
                            </ul>
                            {material.tesis.length > 12 && (
                                <p className="mt-2 text-[11px] text-white/30">
                                    Y {material.tesis.length - 12} tesis más, todas en el proyecto.
                                </p>
                            )}
                            {/* LOS PRECEPTOS, COMO LISTA Y NO COMO COLETILLA. Eran
                                una línea con seis artículos sueltos y sin ley:
                                «art. 14 · art. 16» no le dice a nadie de qué
                                ordenamiento, y son la mitad de lo que funda. */}
                            {material.normas.length > 0 && (
                                <div className="mt-3 border-t border-white/[0.07] pt-2.5">
                                    <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/35">
                                        Preceptos recuperados
                                    </p>
                                    <ul className="grid gap-1">
                                        {material.normas.slice(0, 14).map((n, i) => (
                                            <li key={i} className="text-[11.5px] leading-snug text-white/55">
                                                <span className="text-white/75">art. {n.articulo}</span>
                                                {n.cuerpo_legal ? ` · ${n.cuerpo_legal}` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                    {material.normas.length > 14 && (
                                        <p className="mt-1 text-[11px] text-white/30">
                                            Y {material.normas.length - 14} más.
                                        </p>
                                    )}
                                </div>
                            )}
                          </Pliegue>
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
                        <p className="text-[11px] uppercase tracking-wide text-amber-300/80">
                            El cómputo da extemporánea
                        </p>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
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
                                                : 'border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.04]')}>
                                    <span className="block text-[12.5px] font-medium text-white/85">
                                        {titulo}
                                    </span>
                                    <span className="mt-1 block text-[11.5px] leading-snug text-white/50">
                                        {que}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {decision !== '' && (
                            <div className="mt-3">
                                <label htmlFor="motivo-oportunidad"
                                       className="block text-[12px] font-medium text-white/70">
                                    Por qué
                                </label>
                                <textarea id="motivo-oportunidad" rows={2}
                                          value={motivoDecision}
                                          onChange={(e) => setMotivoDecision(e.target.value)}
                                          placeholder="p. ej.: la Junta Especial Número Dos suspendió labores del catorce al veinticinco de agosto"
                                          className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.09]
                                                     bg-black/20 px-3.5 py-2.5 text-[13px] leading-relaxed
                                                     text-white/90 placeholder:text-white/25 outline-none
                                                     focus:border-accent-gold/45" />
                                <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                                    Va LITERAL al considerando de oportunidad. Sin razón escrita, la
                                    rectificación no se sostiene en revisión.
                                </p>
                            </div>
                        )}
                    </Tarjeta>
                )}

                    {problemas.length > 0 && (
                    <VentanaCriterio problemas={problemas} onCambiar={cambiarCriterio}
                                         onGenerar={pedirProyecto} generando={corriendo && paso === 'acervo'}
                                         onProponer={pedirPropuesta} propuesta={propuesta}
                                         proponiendo={proponiendo}
                                         onAportar={aportarYProponer} aportando={aportando}
                                         modo={modo} onModo={setModo}
                                         sentidoGlobal={sentidoGlobal}
                                         razonGlobal={razonGlobal}
                                         onRazonGlobal={setRazonGlobal}
                                         onSentidoGlobal={elegirGlobal}
                                         tocados={tocados}
                                         globalDictado={globalDictado}
                                         onRazonar={pedirRazon} razonando={razonando}
                                         grupos={grupos} onGrupos={setGrupos}
                                         conceptosViolacion={conceptosViolacion}
                                         onConceptosViolacion={setConceptosViolacion}
                                         contextoAportado={contexto.length} />
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
                    {corriendo && paso === 'criterio' && (
                        <Tarjeta>
                            <Rotulo accion={
                                <span className="text-[11px] tabular-nums text-white/30">
                                    {avance ? `${avance.trim().split(/\s+/).length} palabras`
                                            : 'leyendo el acervo'}
                                </span>
                            }>
                                {avance ? 'Escribiendo el estudio' : 'Preparando el estudio'}
                            </Rotulo>
                            <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/70">
                                    {avance || 'El motor está leyendo las tesis y las normas del acervo y fijando la premisa. El texto empieza a aparecer aquí en cuanto escribe la primera línea; suele tardar alrededor de un minuto.'}
                                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent-gold align-middle" />
                                </p>
                            </div>
                        </Tarjeta>
                    )}

                    <span id="proyecto" />
                    {proyecto && (
                        <>
                            <AvisoBorrador datos={{
                                palabras: proyecto.palabras, avisos: proyecto.avisos,
                                huecos: proyecto.huecos, tieneAdvertencias: proyecto.tieneAdvertencias,
                                textoAvisos: proyecto.textoAvisos,
                                textoHuecos: proyecto.textoHuecos,
                            }} />
                            <button className={cn(boton, 'self-start bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                    onClick={() => descargarProyecto(proyecto)}>
                                <Download className="h-4 w-4" />
                                Descargar de nuevo
                            </button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
