'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle, ArrowDownToLine, Check, ChevronLeft, FileText, ListChecks, Loader2, Network,
    PenLine, Printer, ScrollText, X,
} from 'lucide-react';
import { Hoja, type HojaAPI } from './Hoja';
import { TarjetaToulmin } from './TarjetaToulmin';
import { aWord, imprimir, type Papel } from '@/lib/documento/exportarDocx';
import { analizarRespuesta, markdownAHtml, separarEstrategia, separarTarjetas, textoDeHtml } from '@/lib/documento/marcado';
import {
    ErrorToulmin, argumentoAHtml, rotuloDe, toulminStream,
    type ClaseEscrito, type ResultadoToulmin,
} from '@/lib/toulmin';
import { streamChat } from '@/lib/api';
import { getSession } from '@/lib/supabase';
import { ESTADOS_SOLO, getEstadoLabel } from '@/lib/estados';

/**
 * EL CONSTRUCTOR DE DEMANDA.
 *
 * David, 15-sep-2026: «un abogado que necesita construir una demanda rápido y
 * bien argumentada… introducir el editor Word que tenemos en SwitchMyAI y
 * desplegarlo con un botón bien logrado abajo del chat para ir paso a paso
 * construyendo la demanda con las herramientas existentes… acompañado de una
 * nueva función en botón (Toulmin)… un documento terminado en Word listo para
 * imprimir… logrando simetría en todos los dispositivos».
 *
 * CINCO PASOS, Y CADA UNO USA LO QUE YA HAY:
 *   1. EL CASO: tipo de escrito, entidad, hechos y lo que se pide.
 *   2. ARGUMENTOS · TOULMIN: POST /toulmin/stream (nuevo). Cada cita resuelta
 *      contra el acervo en el servidor; se insertan en la hoja uno a uno.
 *   3. REDACTAR: el mismo /chat de «Escrito legal» ([REDACTAR_DOCUMENTO]), con
 *      los argumentos ya estructurados dentro para que el escrito los use.
 *   4. REVISAR: el mismo /chat, con el borrador y la pregunta de siempre —qué
 *      fundamentos le faltan— (la revisión que se enseña en la pieza 43).
 *   5. WORD: carta u oficio, .docx con márgenes de escrito, o imprimir.
 *
 * DISPOSICIÓN. Desde `lg`, pasos a la izquierda (420 px) y hoja a la derecha.
 * Por debajo, dos pestañas del mismo ancho —Pasos · Documento— y la hoja
 * sigue MONTADA aunque no se vea: lo escrito no se pierde al cambiar.
 *
 * DEMANDA O RECURSO. David, 15-sep-2026: «Toulmin es un modelo argumentativo
 * que sirve para convencer. Esto es fundamental también en recursos… déjalo
 * abierto para que él ingrese el tipo de recurso». En «Recurso» el abogado
 * escribe el tipo (con sugerencias, no con lista cerrada), la materia y —lo
 * que más pesa— LA RESOLUCIÓN QUE IMPUGNA: de sus consideraciones salen los
 * agravios, que se rotulan «PRIMER AGRAVIO…» y van bajo AGRAVIOS.
 *
 * EL BORRADOR SE GUARDA EN ESTE NAVEGADOR (localStorage, por usuario): caso,
 * argumentos, revisión y documento. Volver al chat y regresar no pierde nada.
 */

type IdPaso = 'caso' | 'toulmin' | 'redactar' | 'revisar' | 'word';
type Estado = 'inactivo' | 'trabajando' | 'listo' | 'error';

const TIPOS = [
    { valor: 'civil', etiqueta: 'Demanda civil', tipo: 'demanda', subtipo: 'civil', materia: 'civil' },
    { valor: 'familiar', etiqueta: 'Demanda familiar', tipo: 'demanda', subtipo: 'familiar', materia: 'familiar' },
    { valor: 'mercantil', etiqueta: 'Demanda oral mercantil', tipo: 'demanda', subtipo: 'mercantil', materia: 'mercantil' },
    { valor: 'laboral', etiqueta: 'Demanda laboral', tipo: 'demanda', subtipo: 'laboral', materia: 'laboral' },
    { valor: 'agrario', etiqueta: 'Demanda agraria', tipo: 'demanda', subtipo: 'agrario', materia: 'administrativa' },
    { valor: 'amparo_indirecto', etiqueta: 'Demanda de amparo indirecto', tipo: 'amparo', subtipo: 'amparo_indirecto', materia: 'amparo' },
    { valor: 'recurso', etiqueta: 'Recurso', tipo: 'impugnacion', subtipo: '', materia: '' },
] as const;

/** Sugerencias para el tipo de recurso. El campo es abierto: manda lo que escriba el abogado. */
const RECURSOS_SUGERIDOS = [
    'Apelación contra sentencia definitiva',
    'Apelación contra auto',
    'Revocación',
    'Queja',
    'Revisión en amparo indirecto',
    'Reclamación',
    'Revisión fiscal',
    'Recurso de inconformidad',
];

const MATERIAS_RECURSO = [
    { valor: 'civil', etiqueta: 'Civil' },
    { valor: 'familiar', etiqueta: 'Familiar' },
    { valor: 'mercantil', etiqueta: 'Mercantil' },
    { valor: 'laboral', etiqueta: 'Laboral' },
    { valor: 'penal', etiqueta: 'Penal' },
    { valor: 'administrativa', etiqueta: 'Administrativa' },
    { valor: 'amparo', etiqueta: 'Amparo' },
];

interface Caso {
    tipo: string; estado: string; hechos: string; pretension: string;
    /** Sólo en «recurso»: el tipo que escribe el abogado, la materia y la resolución impugnada. */
    recurso: string; materia: string; resolucion: string;
}

const CASO_VACIO: Caso = { tipo: 'civil', estado: '', hechos: '', pretension: '', recurso: '', materia: 'civil', resolucion: '' };

/** Principio y final de un texto largo, como `toulmin._recorte`: los resolutivos van al final. */
function recorte(texto: string, tope: number): string {
    if (texto.length <= tope) return texto;
    const cabeza = Math.floor(tope / 3);
    return `${texto.slice(0, cabeza).trimEnd()}\n[…]\n${texto.slice(-(tope - cabeza)).trimStart()}`;
}

/** «apelación contra sentencia» → «Recurso de apelación contra sentencia»; «Queja» → «Recurso de queja». */
function nombreDelRecurso(recurso: string): string {
    const r = recurso.replace(/\s+/g, ' ').trim();
    if (!r) return 'Recurso';
    if (/^(recurso|juicio|incidente)\b/i.test(r)) return r.charAt(0).toUpperCase() + r.slice(1);
    return `Recurso de ${r.charAt(0).toLowerCase()}${r.slice(1)}`;
}

interface Guardado {
    caso: Caso;
    resultado: ResultadoToulmin | null;
    insertados: number[];
    revisionHtml: string;
    /** La estrategia que el chat pone al final de la redacción: se enseña, no se imprime. */
    estrategiaHtml?: string;
    papel: Papel;
    titulo: string;
    html: string;
    paso: IdPaso;
}

function pasosDe(clase: ClaseEscrito): { id: IdPaso; n: number; titulo: string; icono: typeof FileText }[] {
    const recurso = clase === 'recurso';
    return [
        { id: 'caso', n: 1, titulo: recurso ? 'El recurso' : 'El caso', icono: PenLine },
        { id: 'toulmin', n: 2, titulo: recurso ? 'Agravios · Toulmin' : 'Argumentos · Toulmin', icono: Network },
        { id: 'redactar', n: 3, titulo: recurso ? 'Redactar el recurso' : 'Redactar la demanda', icono: ScrollText },
        { id: 'revisar', n: 4, titulo: 'Revisar fundamentos', icono: ListChecks },
        { id: 'word', n: 5, titulo: 'Word listo para imprimir', icono: FileText },
    ];
}

function etapasDe(clase: ClaseEscrito) {
    const recurso = clase === 'recurso';
    return [
        { clave: 'problemas', texto: recurso ? 'Identificando lo que hay que combatir de la resolución' : 'Planteando los problemas jurídicos' },
        { clave: 'acervo', texto: 'Buscando en Constitución, tratados, leyes y jurisprudencia' },
        { clave: 'argumentos', texto: recurso ? 'Construyendo los agravios' : 'Construyendo los argumentos' },
        { clave: 'verificando', texto: 'Verificando cada cita contra el acervo' },
    ];
}

function claveDe(usuarioId?: string) {
    return `iurexia:constructor:v1:${usuarioId || 'anonimo'}`;
}

function leerGuardado(usuarioId?: string): Guardado | null {
    try {
        const raw = window.localStorage.getItem(claveDe(usuarioId));
        return raw ? (JSON.parse(raw) as Guardado) : null;
    } catch {
        return null;
    }
}

export interface InsercionDocumento { html: string; n: number }

export default function ConstructorDemanda({
    abierto, pasoInicial, estadoChat, usuarioId, insercion, onCerrar, onConsultaGastada,
}: {
    abierto: boolean;
    pasoInicial?: IdPaso | null;
    estadoChat?: string;
    usuarioId?: string;
    insercion?: InsercionDocumento | null;
    onCerrar: () => void;
    onConsultaGastada?: () => void;
}) {
    /* SÓLO EN EL NAVEGADOR. El borrador vive en localStorage; si esto se
       pintara en el servidor, el primer render del cliente no casaría con él.
       En el chat se carga con `ssr: false`, pero el componente no debe
       depender de que quien lo use se acuerde. */
    const [enCliente, setEnCliente] = useState(false);
    useEffect(() => { setEnCliente(true); }, []);
    const guardado = useMemo(() => (typeof window !== 'undefined' ? leerGuardado(usuarioId) : null), [usuarioId]);
    const hoja = useRef<HojaAPI>(null);

    const [paso, setPaso] = useState<IdPaso>(guardado?.paso ?? 'caso');
    const [vista, setVista] = useState<'pasos' | 'documento'>('pasos');
    // Un borrador de antes del modo recurso no trae sus campos: se completan con los vacíos.
    const [caso, setCaso] = useState<Caso>(guardado?.caso ? { ...CASO_VACIO, ...guardado.caso } : { ...CASO_VACIO, estado: estadoChat || '' });
    const [papel, setPapel] = useState<Papel>(guardado?.papel ?? 'carta');
    const [titulo, setTitulo] = useState(guardado?.titulo ?? '');
    const htmlRef = useRef<string>(guardado?.html ?? '');

    const [tEstado, setTEstado] = useState<Estado>(guardado?.resultado ? 'listo' : 'inactivo');
    const [tEtapa, setTEtapa] = useState<string>('');
    const [tError, setTError] = useState<string>('');
    const [resultado, setResultado] = useState<ResultadoToulmin | null>(guardado?.resultado ?? null);
    const [insertados, setInsertados] = useState<number[]>(guardado?.insertados ?? []);

    const [rEstado, setREstado] = useState<Estado>('inactivo');
    const [rError, setRError] = useState('');
    const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

    const [vEstado, setVEstado] = useState<Estado>(guardado?.revisionHtml ? 'listo' : 'inactivo');
    const [vError, setVError] = useState('');
    const [revisionHtml, setRevisionHtml] = useState(guardado?.revisionHtml ?? '');
    const [estrategiaHtml, setEstrategiaHtml] = useState(guardado?.estrategiaHtml ?? '');
    const [avisoDoctrina, setAvisoDoctrina] = useState('');

    /* ── DÓNDE SE DESPLIEGA ────────────────────────────────────────────
       David, 15-sep-2026: «en la misma ventana, si es posible sin salir del
       chat». En escritorio el constructor se ACOPLA a la derecha y el chat se
       estrecha a su lado (la página lee `--constructor-w`), dejándole al chat
       al menos 420 px. Si no caben los dos —pantallas chicas, tabletas y
       teléfonos— se abre a pantalla completa con su botón de volver.
       Dentro, pasos y hoja van lado a lado desde 960 px de panel; con menos,
       en dos pestañas del mismo ancho. */
    const [disp, setDisp] = useState({ lateral: false, ancho: 0, dos: false });
    useEffect(() => {
        const raiz = document.documentElement;
        const calcular = () => {
            const vw = window.innerWidth;
            const rem = parseFloat(getComputedStyle(raiz).fontSize) || 16;
            const sw = getComputedStyle(raiz).getPropertyValue('--sidebar-w').trim();
            const barra = vw >= 768 ? (sw.endsWith('rem') ? parseFloat(sw) * rem : sw.endsWith('px') ? parseFloat(sw) : 18 * rem) : 0;
            const CHAT_MIN = 420;
            let ancho = Math.round(Math.min(1120, Math.max(640, vw * 0.55)));
            if (vw - barra - ancho < CHAT_MIN) ancho = Math.round(vw - barra - CHAT_MIN);
            const lateral = vw >= 1024 && ancho >= 600;
            const anchoReal = lateral ? ancho : vw;
            const dos = anchoReal >= 960;
            setDisp((d) => (d.lateral === lateral && d.ancho === anchoReal && d.dos === dos ? d : { lateral, ancho: anchoReal, dos }));
        };
        calcular();
        window.addEventListener('resize', calcular);
        // Plegar la barra lateral del chat cambia `--sidebar-w` en <html>.
        const mo = new MutationObserver(calcular);
        mo.observe(raiz, { attributes: true, attributeFilter: ['style'] });
        return () => { window.removeEventListener('resize', calcular); mo.disconnect(); };
    }, []);
    useEffect(() => {
        const raiz = document.documentElement;
        const w = abierto && disp.lateral ? `${disp.ancho}px` : '0px';
        if (raiz.style.getPropertyValue('--constructor-w') !== w) raiz.style.setProperty('--constructor-w', w);
    }, [abierto, disp.lateral, disp.ancho]);
    useEffect(() => () => { document.documentElement.style.setProperty('--constructor-w', '0px'); }, []);

    const [aviso, setAviso] = useState<string>('');
    const [exportando, setExportando] = useState(false);
    /* UN CONTROLADOR POR OPERACIÓN. Con uno compartido, pulsar «Revisar»
       mientras Toulmin trabajaba abortaba Toulmin y lo dejaba girando para
       siempre, y «Detener» podía parar la operación equivocada. */
    const tAbort = useRef<AbortController | null>(null);
    const rAbort = useRef<AbortController | null>(null);
    const vAbort = useRef<AbortController | null>(null);
    useEffect(() => () => { tAbort.current?.abort(); rAbort.current?.abort(); vAbort.current?.abort(); }, []);
    /* Lo que había en la hoja antes de que «Redactar» la sustituyera. */
    const [respaldo, setRespaldo] = useState<string | null>(null);
    const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);
    const raizRef = useRef<HTMLDivElement | null>(null);

    const tipoSel = TIPOS.find((t) => t.valor === caso.tipo) ?? TIPOS[0];
    const clase: ClaseEscrito = tipoSel.valor === 'recurso' ? 'recurso' : 'demanda';
    const esRecurso = clase === 'recurso';
    /* Lo que el escrito ES, dicho para una persona: «Demanda civil» o «Recurso de apelación…». */
    const nombreEscrito = esRecurso ? nombreDelRecurso(caso.recurso) : tipoSel.etiqueta;
    const materiaEscrito = esRecurso ? (caso.materia || 'civil') : tipoSel.materia;
    const PASOS = pasosDe(clase);
    const ETAPAS_TOULMIN = etapasDe(clase);
    const tituloEfectivo = titulo.trim() || `${nombreEscrito}${caso.estado ? ` · ${getEstadoLabel(caso.estado)}` : ''}`;
    /* El resultado guardado es de la clase con que se construyó: si el abogado cambia
       de demanda a recurso, los argumentos de antes siguen ahí pero se rotulan como eran. */
    const claseResultado: ClaseEscrito = resultado?.clase === 'recurso' ? 'recurso' : 'demanda';
    /* Lo que se usa al redactar, se marca como hecho y se anuncia sale de la MISMA
       condición: argumentos de una demanda no viajan en el encargo de un recurso. */
    const resultadoVigente = resultado && resultado.argumentos?.length && claseResultado === clase ? resultado : null;
    /* El amparo directo y el juicio de nulidad no son recursos: sus argumentos son
       conceptos de violación o de impugnación, no agravios. */
    // Sólo cuando el texto NOMBRA el juicio, no un recurso dentro de él («revisión en
    // amparo directo» es un recurso). Es un aviso, no un bloqueo (segunda revisión).
    const noEsRecurso = esRecurso
        && /^\s*(demanda\s+de\s+|juicio\s+de\s+)?(amparo\s+directo|nulidad|juicio\s+contencioso(\s+administrativo)?)\b/i.test(caso.recurso)
        && !/\b(recurso|revisi[oó]n|queja|reclamaci[oó]n|apelaci[oó]n|revocaci[oó]n|inconformidad)\b/i.test(caso.recurso);

    // ── guardar en este navegador ─────────────────────────────────────────
    const guardar = useCallback(() => {
        try {
            const g: Guardado = { caso, resultado, insertados, revisionHtml, estrategiaHtml, papel, titulo, html: htmlRef.current, paso };
            window.localStorage.setItem(claveDe(usuarioId), JSON.stringify(g));
        } catch { /* sin almacenamiento: el borrador vive mientras la pestaña esté abierta */ }
    }, [caso, resultado, insertados, revisionHtml, estrategiaHtml, papel, titulo, paso, usuarioId]);
    useEffect(() => { const id = window.setTimeout(guardar, 400); return () => window.clearTimeout(id); }, [guardar]);
    // Al cerrar la pestaña o salir de /chat, lo pendiente se guarda ya (la espera de 400 ms se cancelaba).
    const guardarRef = useRef(guardar);
    useEffect(() => { guardarRef.current = guardar; }, [guardar]);
    useEffect(() => {
        const ya = () => guardarRef.current();
        window.addEventListener('pagehide', ya);
        return () => { window.removeEventListener('pagehide', ya); ya(); };
    }, []);

    /* LA ENTIDAD DEL CHAT SE TOMA UNA VEZ, al empezar un caso nuevo. Si el
       abogado elige «Sin entidad (sólo federal)», se respeta: antes el efecto
       volvía a poner la del chat en cuanto el campo quedaba vacío. */
    const entidadElegida = useRef(Boolean(guardado));
    useEffect(() => {
        if (!entidadElegida.current && estadoChat && !caso.estado) setCaso((c) => ({ ...c, estado: estadoChat }));
    }, [estadoChat, caso.estado]);

    /* FOCO. Abierto a pantalla completa es un diálogo: el foco entra, Escape
       cierra, Tab no se escapa al chat de atrás, y al cerrar vuelve al botón
       que lo abrió. Acoplado a un lado, sólo entra y vuelve. */
    const focoPrevio = useRef<HTMLElement | null>(null);
    useEffect(() => {
        if (!enCliente) return;
        if (abierto) {
            focoPrevio.current = document.activeElement as HTMLElement | null;
            const id = window.requestAnimationFrame(() => {
                raizRef.current?.querySelector<HTMLElement>('[data-foco-inicial]')?.focus();
            });
            return () => window.cancelAnimationFrame(id);
        }
        const previo = focoPrevio.current;
        focoPrevio.current = null;
        if (previo && document.contains(previo)) previo.focus();
    }, [abierto, enCliente]);
    function teclaDelDialogo(e: React.KeyboardEvent<HTMLDivElement>) {
        if (disp.lateral) return;
        if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); return; }
        if (e.key !== 'Tab' || !raizRef.current) return;
        const foco = Array.from(raizRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
        )).filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
        if (!foco.length) return;
        const primero = foco[0], ultimo = foco[foco.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }

    useEffect(() => {
        if (!abierto || !pasoInicial) return;
        const listo = caso.hechos.trim().length >= 40 && caso.pretension.trim().length >= 10
            && (caso.tipo !== 'recurso' || (caso.recurso.trim().length >= 3 && caso.resolucion.trim().length >= 40));
        setPaso(pasoInicial === 'toulmin' && !listo ? 'caso' : pasoInicial);
        setVista('pasos');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, pasoInicial]);

    // Bloquear el scroll de la página de atrás mientras está abierto.
    useEffect(() => {
        if (!abierto || disp.lateral) return;
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previo; };
    }, [abierto, disp.lateral]);

    // Lo que llega desde una respuesta del chat («Al documento»).
    const ultimaInsercion = useRef(0);
    useEffect(() => {
        if (!insercion || insercion.n === ultimaInsercion.current) return;
        ultimaInsercion.current = insercion.n;
        const t = window.setTimeout(() => {
            hoja.current?.insertar(insercion.html, 'final');
            setVista('documento');
            mostrarAviso('Se añadió la respuesta al final del documento.');
        }, 60);
        return () => window.clearTimeout(t);
    }, [insercion]);

    function mostrarAviso(t: string) {
        setAviso(t);
        window.setTimeout(() => setAviso(''), 3200);
    }

    const casoListo = caso.hechos.trim().length >= 40 && caso.pretension.trim().length >= 10
        && (!esRecurso || (caso.recurso.trim().length >= 3 && caso.resolucion.trim().length >= 40));

    // ── 2 · TOULMIN ──────────────────────────────────────────────────────
    async function estructurar() {
        if (!casoListo) { setPaso('caso'); return; }
        tAbort.current?.abort();
        const control = new AbortController();
        tAbort.current = control;
        setTEstado('trabajando'); setTError(''); setTEtapa('problemas');
        let llego = false;
        try {
            const sesion = await getSession();
            for await (const ev of toulminStream({
                hechos: caso.hechos, pretension: caso.pretension, clase,
                tipo: esRecurso ? caso.recurso.replace(/\s+/g, ' ').trim() : tipoSel.etiqueta.toLowerCase(),
                resolucion: esRecurso ? recorte(caso.resolucion.trim(), 60000) : undefined,
                estado: caso.estado || undefined, materia: materiaEscrito,
            }, sesion?.access_token, control.signal)) {
                if (ev.tipo === 'paso') setTEtapa(ev.clave === 'material' ? 'argumentos' : ev.clave);
                if (ev.tipo === 'error') throw new ErrorToulmin(ev.mensaje, 500);
                if (ev.tipo === 'listo') {
                    // Un servidor que aún no conoce los recursos devuelve argumentos de demanda:
                    // se dice, en vez de guardarlos como si fueran agravios.
                    if (esRecurso && ev.resultado?.clase !== 'recurso') {
                        throw new ErrorToulmin('El servidor todavía no admite recursos. Vuelve a intentarlo en unos minutos.', 0);
                    }
                    llego = true;
                    setResultado(ev.resultado);
                    setInsertados([]);
                    setTEstado('listo');
                }
            }
            if (!llego) throw new ErrorToulmin('La conexión se cortó antes de terminar. Vuelve a intentarlo.', 0);
            onConsultaGastada?.();
        } catch (e) {
            if ((e as Error)?.name === 'AbortError' || control.signal.aborted) {
                if (tAbort.current === control) setTEstado(resultado ? 'listo' : 'inactivo');
                return;
            }
            const status = e instanceof ErrorToulmin ? e.status : 0;
            setTError(status === 429
                ? 'Se te acabaron las consultas de este periodo.'
                : (e as Error)?.message || (esRecurso ? 'No se pudieron construir los agravios.' : 'No se pudieron construir los argumentos.'));
            setTEstado('error');
        }
    }

    function insertarArgumento(i: number) {
        if (!resultado) return;
        const a = resultado.argumentos[i];
        hoja.current?.insertar(argumentoAHtml(a, rotuloDe(claseResultado, i)), 'final');
        setInsertados((xs) => (xs.includes(i) ? xs : [...xs, i]));
        mostrarAviso(`«${a.titulo}» quedó al final del documento.`);
    }

    function insertarTodos() {
        if (!resultado) return;
        const html = `<h2>${claseResultado === 'recurso' ? 'AGRAVIOS' : 'FUNDAMENTOS DE DERECHO'}</h2>` +
            resultado.argumentos.map((a, i) => argumentoAHtml(a, rotuloDe(claseResultado, i))).join('');
        hoja.current?.insertar(html, 'final');
        setInsertados(resultado.argumentos.map((_, i) => i));
        setVista('documento');
        mostrarAviso(claseResultado === 'recurso' ? 'Los agravios quedaron en el documento.' : 'Los argumentos quedaron en el documento.');
    }

    // ── 3 · REDACTAR (el /chat de siempre) ───────────────────────────────
    function pedirRedaccion(modo: 'reemplazar' | 'final') {
        // Sustituir una hoja con trabajo pide confirmación: es lo único que borra.
        if (modo === 'reemplazar' && hoja.current && !hoja.current.vacia()) { setConfirmarReemplazo(true); return; }
        setConfirmarReemplazo(false);
        void redactar(modo);
    }

    async function redactar(modo: 'reemplazar' | 'final') {
        if (!casoListo) { setPaso('caso'); return; }
        setConfirmarReemplazo(false);
        rAbort.current?.abort();
        const control = new AbortController();
        rAbort.current = control;
        setREstado('trabajando'); setRError('');
        setVista('documento');
        const usar = resultadoVigente;
        const argumentos = !usar ? '' : (clase === 'recurso'
            ? '\n\nAGRAVIOS YA ESTRUCTURADOS Y VERIFICADOS (intégralos como agravios numerados del recurso, en este orden, cada uno íntegro como bloque de prosa bajo su rótulo, sin dividirlos en subapartados ni agregar agravios contra consideraciones secundarias, conservando cada cita tal como está escrita, sin cambiar registros, rubros ni artículos):\n\n'
            : '\n\nFUNDAMENTOS YA ESTRUCTURADOS Y VERIFICADOS (intégralos en el capítulo de derecho o de conceptos de violación, conservando cada cita tal como está escrita, sin cambiar registros, rubros ni artículos):\n\n') +
            usar.argumentos.map((a, i) => `${rotuloDe(clase, i)}. ${a.titulo}\n${a.redaccion}`).join('\n\n') +
            /* EL TEXTO DE LO YA VERIFICADO VIAJA CON EL ENCARGO. La redacción hace su
               propia búsqueda, y cuando no traía una tesis que Toulmin ya había
               verificado, el modelo escribía DENTRO del escrito una «nota de
               cobertura documental» diciendo que no la recuperó. */
            (() => {
                const lista = usar.citadas.map((id) => usar.fuentes[id]).filter(Boolean)
                    .map((f) => `- ${f.cita}${f.texto ? `\n  ${f.texto.replace(/\s+/g, ' ').slice(0, 700)}` : ''}`);
                return lista.length
                    ? `\n\nTEXTO DE LAS FUENTES CITADAS, YA VERIFICADAS CONTRA EL ACERVO DE IUREXIA (apóyate en ellas aunque tu búsqueda no las traiga; dentro del escrito no escribas notas sobre lo que la búsqueda recuperó o no recuperó):\n${lista.join('\n')}`
                    : '';
            })();
        // El subtipo viaja en su propio renglón: un salto dentro lo partiría.
        const subtipo = esRecurso ? caso.recurso.replace(/\s+/g, ' ').trim() : tipoSel.subtipo;
        const cuerpoCaso = esRecurso
            ? `RESOLUCIÓN QUE SE IMPUGNA:
${recorte(caso.resolucion.trim(), 30000)}

ANTECEDENTES:
${caso.hechos.trim()}

LO QUE SE PIDE AL RESOLVER EL RECURSO:
${caso.pretension.trim()}`
            : `HECHOS:
${caso.hechos.trim()}

LO QUE SE PIDE:
${caso.pretension.trim()}`;
        const mensaje = `[REDACTAR_DOCUMENTO]
Tipo: ${tipoSel.tipo}
Subtipo: ${subtipo}
${esRecurso ? `Materia: ${materiaEscrito}\n` : ''}${esRecurso && usar?.recurrente === 'autoridad' ? 'Recurrente: autoridad (voz institucional, sin alegar derechos humanos propios)\n' : ''}Jurisdicción: ${caso.estado ? getEstadoLabel(caso.estado) : 'No indicada'}

Descripción del caso:
${esRecurso ? `Escrito: ${nombreEscrito}\n\n` : ''}${cuerpoCaso}${argumentos}`;
        let texto = '';
        let ultimo = 0;
        try {
            const sesion = await getSession();
            for await (const trozo of streamChat(
                [{ role: 'user', content: mensaje }], caso.estado || undefined, 30,
                sesion?.access_token, false, sesion?.user?.id, undefined, undefined, undefined, control.signal,
            )) {
                // Un reintento de streamChat vuelve a mandar la respuesta ENTERA: lo de antes se tira.
                if (trozo.includes('<!--RETRY:')) { texto = ''; continue; }
                texto += trozo;
                const ahora = Date.now();
                if (ahora - ultimo > 250) {
                    ultimo = ahora;
                    const previa = analizarRespuesta(texto);
                    setVistaPrevia((!previa.error && markdownAHtml(separarEstrategia(separarTarjetas(previa.texto).sin).escrito)) || `<p style="text-align:center;color:#8b7355"><i>Iurexia está analizando ${esRecurso ? 'la resolución y preparando el recurso' : 'el caso y preparando la demanda'}…</i></p>`);
                }
            }
            const r = analizarRespuesta(texto);
            if (r.error) throw new Error(r.error);
            const sinTarjetas = separarTarjetas(r.texto);
            const partes = separarEstrategia(sinTarjetas.sin);
            const html = markdownAHtml(partes.escrito);
            if (!html) throw new Error('La redacción llegó vacía. Vuelve a intentarlo.');
            const notas = [partes.estrategia, sinTarjetas.tarjetas].filter(Boolean).join('\n\n');
            setEstrategiaHtml(notas ? markdownAHtml(notas) : '');
            setAvisoDoctrina(sinTarjetas.aviso);
            if (modo === 'reemplazar' && hoja.current && !hoja.current.vacia()) setRespaldo(hoja.current.raiz()?.innerHTML ?? null);
            else setRespaldo(null);
            if (modo === 'reemplazar' || hoja.current?.vacia()) hoja.current?.reemplazar(html);
            else hoja.current?.insertar(html, 'final');
            setREstado('listo');
            mostrarAviso(r.truncada
                ? 'La redacción quedó incompleta: pulsa «Añadir al final» para que continúe.'
                : esRecurso ? 'El recurso quedó en el documento. Revísalo y ajústalo a tu caso.' : 'La demanda quedó en el documento. Revísala y ajústala a tu caso.');
            onConsultaGastada?.();
        } catch (e) {
            if ((e as Error)?.name === 'AbortError' || control.signal.aborted) {
                if (rAbort.current === control) setREstado('inactivo');
            } else {
                const m = (e as Error)?.message || '';
                setRError(/429|consultas/i.test(m) ? 'Se te acabaron las consultas de este periodo.'
                    : /suspendida|No se te descontó|vacía/i.test(m) ? m
                    : 'No se pudo redactar. Vuelve a intentarlo.');
                setREstado('error');
            }
        } finally {
            if (rAbort.current === control) setVistaPrevia(null);
        }
    }

    function recuperarAnterior() {
        if (respaldo == null) return;
        hoja.current?.reemplazar(respaldo);
        setRespaldo(null);
        setVista('documento');
        mostrarAviso('Se recuperó el documento anterior.');
    }

    // ── 4 · REVISAR (el /chat de siempre) ────────────────────────────────
    async function revisar() {
        const raiz = hoja.current?.raiz();
        const texto = raiz ? textoDeHtml(raiz) : '';
        if (texto.length < 200) { setVError('El documento todavía es muy corto para revisarlo.'); setVEstado('error'); return; }
        vAbort.current?.abort();
        const control = new AbortController();
        vAbort.current = control;
        setVEstado('trabajando'); setVError(''); setRevisionHtml('');
        const mensaje = esRecurso
            ? `Revisa este borrador de ${nombreEscrito.charAt(0).toLowerCase()}${nombreEscrito.slice(1)}${caso.estado ? ` (${getEstadoLabel(caso.estado)})` : ''}. Antes que nada, dime si ese recurso procede contra la resolución según la ley aplicable, ante qué órgano se interpone y en qué plazo; si no procede, dime cuál es el medio correcto y su plazo. Después dime, con fundamento en la ley y la jurisprudencia aplicables: si cada agravio combate las consideraciones que sostienen la resolución impugnada o deja alguna en pie, si hay riesgo de que alguno se declare inoperante, y qué fundamentos o requisitos del recurso faltan o están mal citados. Sé concreto, agravio por agravio, y termina con una lista de cambios que debo hacer.

RESOLUCIÓN QUE SE IMPUGNA:
${recorte(caso.resolucion.trim(), 12000)}

BORRADOR:
${texto.slice(0, 50000)}`
            : `Revisa este borrador de ${tipoSel.etiqueta.toLowerCase()}${caso.estado ? ` (${getEstadoLabel(caso.estado)})` : ''} y dime, con fundamento en la ley y la jurisprudencia aplicables, qué fundamentos legales o requisitos le faltan o están mal citados antes de presentarlo. Sé concreto: artículo por artículo, y termina con una lista de cambios concretos que debo hacer.

BORRADOR:
${texto.slice(0, 60000)}`;
        let salida = '';
        let ultimo = 0;
        try {
            const sesion = await getSession();
            for await (const trozo of streamChat(
                [{ role: 'user', content: mensaje }], caso.estado || undefined, 30,
                sesion?.access_token, false, sesion?.user?.id, undefined, undefined, undefined, control.signal,
            )) {
                if (trozo.includes('<!--RETRY:')) { salida = ''; continue; }
                salida += trozo;
                const ahora = Date.now();
                if (ahora - ultimo > 300) {
                    ultimo = ahora;
                    const previa = analizarRespuesta(salida);
                    const pv = separarTarjetas(previa.texto);
                    setRevisionHtml((!previa.error && markdownAHtml(pv.sin)) || '<p><i>Iurexia está leyendo el documento…</i></p>');
                }
            }
            const r = analizarRespuesta(salida);
            if (r.error) throw new Error(r.error);
            const rv = separarTarjetas(r.texto);
            const html = markdownAHtml([rv.sin, rv.tarjetas].filter(Boolean).join('\n\n'));
            if (!html) throw new Error('La revisión llegó vacía. Vuelve a intentarlo.');
            setRevisionHtml(html);
            setVEstado('listo');
            onConsultaGastada?.();
        } catch (e) {
            if ((e as Error)?.name === 'AbortError' || control.signal.aborted) {
                if (vAbort.current === control) { setVEstado('inactivo'); setRevisionHtml(''); }
            } else {
                const m = (e as Error)?.message || '';
                setRevisionHtml('');
                setVError(/429|consultas/i.test(m) ? 'Se te acabaron las consultas de este periodo.'
                    : /suspendida|No se te descontó|vacía/i.test(m) ? m
                    : 'No se pudo revisar. Vuelve a intentarlo.');
                setVEstado('error');
            }
        }
    }

    // ── 5 · WORD ──────────────────────────────────────────────────────────
    async function descargarWord() {
        const raiz = hoja.current?.raiz();
        if (!raiz || hoja.current?.vacia()) { mostrarAviso('El documento está vacío.'); return; }
        setExportando(true);
        try { await aWord(raiz, tituloEfectivo, papel); }
        catch { mostrarAviso('No se pudo generar el Word. Vuelve a intentarlo.'); }
        finally { setExportando(false); }
    }
    function mandarAImprimir() {
        const raiz = hoja.current?.raiz();
        if (!raiz || hoja.current?.vacia()) { mostrarAviso('El documento está vacío.'); return; }
        if (!imprimir(raiz, tituloEfectivo, papel)) mostrarAviso('El navegador bloqueó la ventana de impresión.');
    }

    const hecho: Record<IdPaso, boolean> = {
        caso: casoListo,
        toulmin: tEstado === 'listo' && !!resultadoVigente,
        redactar: rEstado === 'listo',
        revisar: vEstado === 'listo',
        word: false,
    };

    const botonPrimario = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-charcoal-900 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:bg-charcoal-900/40';
    const botonSecundario = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-charcoal-900/15 bg-white px-4 text-[13.5px] font-medium text-charcoal-900 transition-colors hover:border-charcoal-900/35 disabled:cursor-not-allowed disabled:opacity-50';
    const campo = 'w-full rounded-lg border border-charcoal-900/15 bg-white px-3 py-2.5 text-base leading-relaxed text-charcoal-900 placeholder:text-charcoal-900/45 [@media(pointer:fine)]:text-[14px] focus:border-accent-gold focus:outline-none focus:ring-2 focus:ring-accent-gold/25';
    const rotulo = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-brown';

    if (!enCliente) return null;

    return (
        <div
            className={`fixed flex flex-col bg-cream-300 ${abierto ? '' : 'hidden'} ${disp.lateral
                ? 'inset-y-0 right-0 z-[35] border-l border-charcoal-900/10 shadow-[-18px_0_48px_-28px_rgba(20,18,16,0.45)]'
                : 'inset-0 z-40'}`}
            style={disp.lateral ? { width: disp.ancho } : undefined}
            role={disp.lateral ? 'complementary' : 'dialog'}
            aria-modal={disp.lateral ? undefined : true}
            aria-label="Constructor de escritos"
            ref={raizRef}
            onKeyDown={teclaDelDialogo}
        >
            {/* ── CABECERA ─────────────────────────────────────────────── */}
            <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-charcoal-900/10 bg-cream-100 px-2 sm:gap-3 sm:px-4">
                {disp.lateral ? (
                    <button type="button" onClick={onCerrar} aria-label="Recoger el constructor" data-foco-inicial
                        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                        <X className="h-4 w-4" /> Recoger
                    </button>
                ) : (
                    <button type="button" onClick={onCerrar} data-foco-inicial
                        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                        <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Volver al chat</span><span className="sm:hidden">Chat</span>
                    </button>
                )}
                <div className="flex min-w-0 items-center justify-center gap-2">
                    <span className="hidden font-serif text-[15px] font-semibold text-charcoal-900 md:inline">Iurex<span className="text-accent-gold">ia</span></span>
                    <span className="hidden h-4 w-px bg-charcoal-900/15 md:inline-block" />
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder={tituloEfectivo}
                        aria-label="Nombre del documento"
                        className="w-full max-w-[420px] truncate rounded-md bg-transparent px-2 py-1 text-center text-base font-medium text-charcoal-900 placeholder:text-charcoal-900/60 [@media(pointer:fine)]:text-[14px] hover:bg-charcoal-900/[0.04] focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-gold/50"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} aria-label="Tamaño de papel"
                        className="hidden h-9 rounded-lg border border-charcoal-900/15 bg-white px-2 text-[12px] text-charcoal-900 md:block">
                        <option value="carta">Carta</option>
                        <option value="oficio">Oficio</option>
                    </select>
                    <button type="button" onClick={mandarAImprimir} title="Imprimir o guardar como PDF"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-charcoal-900/15 bg-white text-charcoal-900 transition-colors hover:border-charcoal-900/35">
                        <Printer className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={descargarWord} disabled={exportando}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:opacity-60">
                        {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 text-accent-gold" />}
                        Word
                    </button>
                </div>
            </header>

            {/* ── PESTAÑAS (móvil y tableta) ───────────────────────────── */}
            <div className={`grid shrink-0 grid-cols-2 gap-1 border-b border-charcoal-900/10 bg-cream-100 p-1.5 ${disp.dos ? 'hidden' : ''}`} role="tablist">
                {(['pasos', 'documento'] as const).map((v) => (
                    <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                        className={`h-9 rounded-lg text-[13px] font-medium transition-colors ${vista === v ? 'bg-charcoal-900 text-white' : 'text-charcoal-900/70 hover:bg-charcoal-900/5'}`}>
                        {v === 'pasos' ? 'Pasos' : 'Documento'}
                    </button>
                ))}
            </div>

            {/* En pestañas, la oculta NO se quita del flujo con display:none: eso
                ponía su desplazamiento a cero y el scrollIntoView de una inserción
                caía sobre una caja sin medida. Se apila invisible debajo. */}
            <div className={`relative min-h-0 flex-1 ${disp.dos ? 'grid grid-cols-[380px_1fr]' : ''}`}>
                {/* ── LOS PASOS ─────────────────────────────────────────── */}
                <aside aria-hidden={!disp.dos && vista !== 'pasos' ? true : undefined}
                    className={`h-full min-h-0 overflow-y-auto border-charcoal-900/10 bg-cream-200/60 ${disp.dos ? 'block border-r' : vista === 'pasos' ? 'block' : 'invisible absolute inset-0'}`}>
                    <ol className="mx-auto grid max-w-2xl gap-2.5 p-3 sm:p-4">
                        {PASOS.map((p) => {
                            const activo = paso === p.id;
                            const Icono = p.icono;
                            return (
                                <li key={p.id} className={`rounded-xl border bg-white transition-shadow ${activo ? 'border-accent-gold/50 shadow-[0_6px_24px_-12px_rgba(139,115,85,0.45)]' : 'border-charcoal-900/[0.08]'}`}>
                                    <button type="button" onClick={() => setPaso(p.id)} aria-expanded={activo}
                                        className="grid w-full grid-cols-[32px_1fr_auto] items-center gap-3 px-3.5 py-3 text-left">
                                        <span className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold ${hecho[p.id] ? 'bg-emerald-600 text-white' : activo ? 'bg-charcoal-900 text-accent-gold' : 'bg-cream-300 text-charcoal-900/60'}`}>
                                            {hecho[p.id] ? <Check className="h-4 w-4" /> : p.n}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-[14px] font-semibold text-charcoal-900">{p.titulo}</span>
                                        </span>
                                        <Icono className={`h-4 w-4 ${activo ? 'text-accent-gold' : 'text-charcoal-900/35'}`} />
                                    </button>

                                    {activo && (
                                        <div className="border-t border-charcoal-900/[0.06] px-3.5 pb-4 pt-3">
                                            {p.id === 'caso' && (
                                                <div className="grid gap-3">
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <label className="block">
                                                            <span className={rotulo}>Escrito</span>
                                                            <select className={campo} value={caso.tipo} onChange={(e) => {
                                                                const nuevo = e.target.value;
                                                                // Al pasar de una demanda a recurso, la materia se hereda de la demanda.
                                                                const previa = TIPOS.find((x) => x.valor === caso.tipo)?.materia;
                                                                const materia = nuevo === 'recurso' && caso.tipo !== 'recurso' && previa && MATERIAS_RECURSO.some((m) => m.valor === previa)
                                                                    ? previa : caso.materia;
                                                                setCaso({ ...caso, tipo: nuevo, materia });
                                                            }}>
                                                                <optgroup label="Demandas">
                                                                    {TIPOS.filter((t) => t.valor !== 'recurso').map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                                                                </optgroup>
                                                                <optgroup label="Recursos">
                                                                    <option value="recurso">Recurso (escribes cuál)</option>
                                                                </optgroup>
                                                            </select>
                                                        </label>
                                                        {esRecurso && (
                                                            <>
                                                                <label className="block">
                                                                    <span className={rotulo}>Tipo de recurso</span>
                                                                    <input className={campo} list="iurexia-recursos" value={caso.recurso} maxLength={140}
                                                                        onChange={(e) => setCaso({ ...caso, recurso: e.target.value })}
                                                                        placeholder="Apelación contra sentencia definitiva, revocación, queja…" />
                                                                    {noEsRecurso && (
                                                                        <span className="mt-1.5 block rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
                                                                            El amparo directo y el juicio de nulidad no son recursos: son demandas, y sus argumentos son conceptos de violación o de impugnación, no agravios. Para ese escrito usa «Escrito legal» en el chat.
                                                                        </span>
                                                                    )}
                                                                    <datalist id="iurexia-recursos">
                                                                        {RECURSOS_SUGERIDOS.map((r) => <option key={r} value={r} />)}
                                                                    </datalist>
                                                                </label>
                                                                <label className="block">
                                                                    <span className={rotulo}>Materia</span>
                                                                    <select className={campo} value={caso.materia} onChange={(e) => setCaso({ ...caso, materia: e.target.value })}>
                                                                        {MATERIAS_RECURSO.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                                                                    </select>
                                                                </label>
                                                            </>
                                                        )}
                                                        <label className="block">
                                                            <span className={rotulo}>Entidad</span>
                                                            <select className={campo} value={caso.estado} onChange={(e) => { entidadElegida.current = true; setCaso({ ...caso, estado: e.target.value }); }}>
                                                                <option value="">Sin entidad (sólo federal)</option>
                                                                {ESTADOS_SOLO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                                                            </select>
                                                        </label>
                                                    </div>
                                                    <label className="block">
                                                        <span className={rotulo}>{esRecurso ? 'Antecedentes' : 'Hechos'}</span>
                                                        <textarea className={`${campo} ${esRecurso ? 'min-h-[110px]' : 'min-h-[150px]'} resize-y`} value={caso.hechos} maxLength={15000}
                                                            onChange={(e) => setCaso({ ...caso, hechos: e.target.value })}
                                                            placeholder={esRecurso
                                                                ? 'Cómo llegó el asunto hasta aquí: el juicio, lo que se reclamó, las pruebas y lo que se alegó.'
                                                                : 'Qué pasó, en orden: quiénes, cuándo, dónde, qué documentos o pruebas hay.'} />
                                                    </label>
                                                    {esRecurso && (
                                                        <label className="block">
                                                            <span className={rotulo}>Resolución que se impugna</span>
                                                            <textarea className={`${campo} min-h-[150px] resize-y`} value={caso.resolucion}
                                                                onChange={(e) => setCaso({ ...caso, resolucion: e.target.value })}
                                                                placeholder="Qué resolvió la autoridad y con qué razones. Puedes pegar las consideraciones de la sentencia o del auto." />
                                                            <span className="mt-1 block text-[12px] leading-relaxed text-charcoal-900/70">
                                                                {caso.resolucion.length > 12000
                                                                    ? `${caso.resolucion.length.toLocaleString('es-MX')} caracteres: para los agravios se leen el principio y el final. Si puedes, pega sólo las consideraciones que sostienen lo resuelto y los resolutivos.`
                                                                    : 'De aquí salen los agravios: mientras más fiel a lo que dijo, mejor se combate.'}
                                                            </span>
                                                        </label>
                                                    )}
                                                    <label className="block">
                                                        <span className={rotulo}>Lo que se pide</span>
                                                        <textarea className={`${campo} min-h-[90px] resize-y`} value={caso.pretension} maxLength={4000}
                                                            onChange={(e) => setCaso({ ...caso, pretension: e.target.value })}
                                                            placeholder={esRecurso
                                                                ? 'Que se revoque o modifique lo resuelto y, en su lugar, se resuelva…'
                                                                : 'Las prestaciones o pretensiones que reclamas.'} />
                                                    </label>
                                                    <p className="text-[12px] leading-relaxed text-charcoal-900/70">
                                                        Sin nombres reales si no hace falta: para fundar basta con {esRecurso ? 'lo resuelto y los antecedentes' : 'los hechos'}.
                                                    </p>
                                                    <button type="button" className={botonPrimario} disabled={!casoListo} onClick={() => setPaso('toulmin')}>
                                                        {esRecurso ? 'Continuar con los agravios' : 'Continuar con los argumentos'}
                                                    </button>
                                                </div>
                                            )}

                                            {p.id === 'toulmin' && (
                                                <div className="grid gap-3">
                                                    <p className="text-[13px] leading-relaxed text-charcoal-900/70">
                                                        {esRecurso
                                                            ? 'Iurexia identifica las consideraciones de la resolución que sostienen lo resuelto y construye cada agravio con sus seis piezas —lo que se combate, lo que consta, la norma violada, su respaldo, su fuerza y la objeción del tribunal que hay que vencer—, citando sólo lo que encuentra en el acervo: Constitución, tratados, Corte Interamericana, leyes y jurisprudencia.'
                                                            : 'Iurexia plantea los problemas jurídicos de tu caso y construye cada argumento con sus seis piezas —afirmación, hechos, regla, respaldo, fuerza y la objeción que hay que vencer—, citando sólo lo que encuentra en el acervo: Constitución, tratados, Corte Interamericana, leyes y jurisprudencia.'}
                                                    </p>
                                                    {!casoListo && (
                                                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 ring-1 ring-amber-200">
                                                            {esRecurso ? 'Primero escribe el tipo de recurso, los antecedentes, la resolución que impugnas y lo que pides (paso 1).' : 'Primero escribe los hechos y lo que pides (paso 1).'}
                                                        </p>
                                                    )}
                                                    {resultado && claseResultado !== clase && tEstado !== 'trabajando' && (
                                                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 ring-1 ring-amber-200">
                                                            Estos {claseResultado === 'recurso' ? 'agravios se construyeron para un recurso' : 'argumentos se construyeron para una demanda'}. Vuelve a estructurar para {esRecurso ? 'el recurso' : 'la demanda'}.
                                                        </p>
                                                    )}
                                                    {tEstado === 'trabajando' ? (
                                                        <div className="rounded-lg border border-charcoal-900/10 bg-cream-100 p-3">
                                                            <ul className="grid gap-2">
                                                                {ETAPAS_TOULMIN.map((e) => {
                                                                    const idx = ETAPAS_TOULMIN.findIndex((x) => x.clave === tEtapa);
                                                                    const i = ETAPAS_TOULMIN.indexOf(e);
                                                                    const estado = i < idx ? 'hecho' : i === idx ? 'ahora' : 'pendiente';
                                                                    return (
                                                                        <li key={e.clave} className="flex items-center gap-2.5 text-[13px]">
                                                                            {estado === 'hecho' ? <Check className="h-4 w-4 text-emerald-600" />
                                                                                : estado === 'ahora' ? <Loader2 className="h-4 w-4 animate-spin text-accent-brown" />
                                                                                : <span className="h-4 w-4 rounded-full border border-charcoal-900/20" />}
                                                                            <span className={estado === 'pendiente' ? 'text-charcoal-900/40' : 'text-charcoal-900'}>{e.texto}</span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                            <p className="mt-2.5 text-[12px] text-charcoal-900/70">Tarda alrededor de un minuto.</p>
                                                        </div>
                                                    ) : (
                                                        <button type="button" className={botonPrimario} disabled={!casoListo} onClick={estructurar}>
                                                            <Network className="h-4 w-4 text-accent-gold" />
                                                            {resultado ? 'Volver a estructurar' : esRecurso ? 'Estructurar agravios' : 'Estructurar argumentos'}
                                                            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-medium text-white/80">1 consulta</span>
                                                        </button>
                                                    )}
                                                    {tEstado === 'error' && <AvisoError mensaje={tError} />}

                                                    {resultado && tEstado !== 'trabajando' && (
                                                        <div className="grid gap-2.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <p className="text-[12px] text-charcoal-900/60">
                                                                    {resultado.argumentos.length} {claseResultado === 'recurso' ? 'agravios' : 'argumentos'} · {resultado.citadas.length} fuentes citadas, todas del acervo
                                                                </p>
                                                                <button type="button" onClick={insertarTodos}
                                                                    className="h-8 rounded-lg border border-accent-gold/50 bg-accent-gold/10 px-3 text-[12px] font-semibold text-charcoal-900 transition-colors hover:bg-accent-gold/20">
                                                                    Todos al documento
                                                                </button>
                                                            </div>
                                                            {resultado.argumentos.map((a, i) => (
                                                                <TarjetaToulmin key={`${i}-${a.titulo}`} argumento={a} ordinal={rotuloDe(claseResultado, i)} fuentes={resultado.fuentes}
                                                                    consideracion={claseResultado === 'recurso' ? a.consideracion || undefined : undefined}
                                                                    insertado={insertados.includes(i)} onInsertar={() => insertarArgumento(i)} />
                                                            ))}
                                                            {(resultado.avisos.length > 0 || resultado.faltantes.length > 0) && (
                                                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-950">
                                                                    {resultado.avisos.map((x, i) => <p key={`a${i}`} className="mb-1">{x}</p>)}
                                                                    {resultado.faltantes.length > 0 && (
                                                                        <>
                                                                            <p className="mt-1 font-semibold">Para fundar mejor, conviene precisar:</p>
                                                                            <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                                                                {resultado.faltantes.map((x, i) => <li key={`f${i}`}>{x}</li>)}
                                                                            </ul>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <button type="button" className={botonSecundario} onClick={() => setPaso('redactar')}>{esRecurso ? 'Continuar: redactar el recurso' : 'Continuar: redactar la demanda'}</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {p.id === 'redactar' && (
                                                <div className="grid gap-3">
                                                    <p className="text-[13px] leading-relaxed text-charcoal-900/70">
                                                        {esRecurso
                                                            ? <>Iurexia redacta el {nombreEscrito.charAt(0).toLowerCase() + nombreEscrito.slice(1)} completo —proemio, resolución que se impugna, agravios y puntos petitorios— con {resultadoVigente ? `tus ${resultadoVigente.argumentos.length} agravios ya estructurados` : 'lo resuelto y lo que pides'}. Llega a la hoja mientras se escribe.</>
                                                            : <>Iurexia redacta la {tipoSel.etiqueta.toLowerCase()} completa —proemio, hechos, derecho, pruebas y puntos petitorios— con {resultadoVigente ? `tus ${resultadoVigente.argumentos.length} argumentos ya estructurados` : 'los hechos y lo que pides'}. Llega a la hoja mientras se escribe.</>}
                                                    </p>
                                                    {rEstado === 'trabajando' ? (
                                                        <div className="flex items-center gap-2.5 rounded-lg border border-charcoal-900/10 bg-cream-100 px-3 py-3 text-[13px] text-charcoal-900">
                                                            <Loader2 className="h-4 w-4 animate-spin text-accent-brown" /> Redactando en el documento…
                                                            <button type="button" onClick={() => rAbort.current?.abort()} className="ml-auto h-8 rounded-md border border-charcoal-900/15 bg-white px-3 text-[12.5px] font-medium text-charcoal-900 transition-colors hover:border-charcoal-900/35">Detener</button>
                                                        </div>
                                                    ) : confirmarReemplazo ? (
                                                        <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                            <p className="text-[13px] leading-relaxed text-amber-950">La hoja ya tiene texto. ¿Lo sustituyo por {esRecurso ? 'el recurso nuevo o lo añado' : 'la demanda nueva o la añado'} al final?</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button type="button" className={botonSecundario} onClick={() => void redactar('final')}>Añadir al final</button>
                                                                <button type="button" className={botonPrimario} onClick={() => void redactar('reemplazar')}>Sustituir</button>
                                                            </div>
                                                            <button type="button" onClick={() => setConfirmarReemplazo(false)} className="h-8 text-[12.5px] font-medium text-charcoal-900/70 hover:text-charcoal-900">Cancelar</button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-2">
                                                            <button type="button" className={botonPrimario} disabled={!casoListo} onClick={() => pedirRedaccion('reemplazar')}>
                                                                <ScrollText className="h-4 w-4 text-accent-gold" /> Redactar
                                                                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-medium text-white/80">1 consulta</span>
                                                            </button>
                                                            <button type="button" className={botonSecundario} disabled={!casoListo} onClick={() => pedirRedaccion('final')}>
                                                                Añadir al final
                                                            </button>
                                                        </div>
                                                    )}
                                                    <p className="text-[12px] leading-relaxed text-charcoal-900/70">«Redactar» sustituye lo que haya en la hoja; «Añadir al final» lo conserva.</p>
                                                    {avisoDoctrina && rEstado !== 'trabajando' && (
                                                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">{avisoDoctrina}</p>
                                                    )}
                                                    {estrategiaHtml && rEstado !== 'trabajando' && (
                                                        <details className="group rounded-lg border border-charcoal-900/10 bg-cream-100">
                                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[13px] font-medium text-charcoal-900">
                                                                <span>Estrategia y referencias <span className="font-normal text-charcoal-900/70">· no va al documento</span></span>
                                                                <span aria-hidden="true" className="text-charcoal-900/60 transition-transform group-open:rotate-180">▾</span>
                                                            </summary>
                                                            <div className="hoja-escrito max-h-[45vh] overflow-y-auto border-t border-charcoal-900/10 bg-white px-4 py-3 !text-[13px] !leading-relaxed"
                                                                dangerouslySetInnerHTML={{ __html: estrategiaHtml }} />
                                                        </details>
                                                    )}
                                                    {respaldo != null && rEstado === 'listo' && (
                                                        <button type="button" onClick={recuperarAnterior} className="justify-self-start text-[12.5px] font-medium text-accent-brown underline-offset-2 hover:underline">
                                                            Recuperar el documento anterior
                                                        </button>
                                                    )}
                                                    {rEstado === 'error' && <AvisoError mensaje={rError} />}
                                                </div>
                                            )}

                                            {p.id === 'revisar' && (
                                                <div className="grid gap-3">
                                                    <p className="text-[13px] leading-relaxed text-charcoal-900/70">
                                                        Iurexia lee el documento como está ahora y te dice qué fundamentos le faltan o están mal citados, artículo por artículo, con la lista de cambios antes de presentar.
                                                    </p>
                                                    <button type="button" className={botonPrimario} disabled={vEstado === 'trabajando'} onClick={revisar}>
                                                        {vEstado === 'trabajando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4 text-accent-gold" />}
                                                        {vEstado === 'trabajando' ? 'Revisando…' : 'Revisar el documento'}
                                                        {vEstado !== 'trabajando' && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-medium text-white/80">1 consulta</span>}
                                                    </button>
                                                    {vEstado === 'error' && <AvisoError mensaje={vError} />}
                                                    {revisionHtml && (
                                                        <div className="hoja-escrito max-h-[55vh] overflow-y-auto rounded-lg border border-charcoal-900/10 bg-white px-4 py-3 !text-[13px] !leading-relaxed"
                                                            dangerouslySetInnerHTML={{ __html: revisionHtml }} />
                                                    )}
                                                </div>
                                            )}

                                            {p.id === 'word' && (
                                                <div className="grid gap-3">
                                                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tamaño de papel">
                                                        {(['carta', 'oficio'] as const).map((x) => (
                                                            <button key={x} type="button" role="radio" aria-checked={papel === x} onClick={() => setPapel(x)}
                                                                className={`h-11 rounded-lg border text-[13px] font-medium transition-colors ${papel === x ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-900/15 bg-white text-charcoal-900 hover:border-charcoal-900/35'}`}>
                                                                {x === 'carta' ? 'Carta' : 'Oficio'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[12px] leading-relaxed text-charcoal-900/60">
                                                        Arial 12, interlineado 1.5, justificado, márgenes de escrito (3 cm izquierda, 2 cm derecha, 2.5 cm arriba y abajo) y número de página.
                                                    </p>
                                                    <div className="grid gap-2">
                                                        <button type="button" className={botonPrimario} onClick={descargarWord} disabled={exportando}>
                                                            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 text-accent-gold" />} Descargar Word
                                                        </button>
                                                        <button type="button" className={botonSecundario} onClick={mandarAImprimir}>
                                                            <Printer className="h-4 w-4" /> Imprimir o PDF
                                                        </button>
                                                    </div>
                                                    <p className="text-[12px] leading-relaxed text-charcoal-900/70">
                                                        Revisa y firma tú el escrito: Iurexia orienta y fundamenta, no sustituye tu criterio profesional.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </aside>

                {/* ── LA HOJA ───────────────────────────────────────────── */}
                <section aria-hidden={!disp.dos && vista !== 'documento' ? true : undefined}
                    className={`flex h-full min-h-0 flex-col ${disp.dos || vista === 'documento' ? '' : 'invisible absolute inset-0'}`} aria-label="Documento">
                    {rEstado === 'trabajando' && (
                        <div className="flex shrink-0 items-center gap-2.5 border-b border-charcoal-900/10 bg-charcoal-900 px-3 py-1.5 text-[13px] text-white sm:px-4">
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-gold" />
                            <span className="min-w-0 truncate">{esRecurso ? 'Redactando el recurso…' : 'Redactando la demanda…'}</span>
                            <button type="button" onClick={() => rAbort.current?.abort()}
                                className="ml-auto h-8 shrink-0 rounded-md border border-white/25 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-white/10">
                                Detener
                            </button>
                        </div>
                    )}
                    <Hoja ref={hoja} htmlInicial={htmlRef.current}
                        onCambio={(h) => { htmlRef.current = h; guardar(); }}
                        vistaPrevia={vistaPrevia} />
                </section>
            </div>

            {/* La región de estado está SIEMPRE montada: si nace ya con el texto, el lector de pantalla no la anuncia. */}
            <div role="status" aria-live="polite" className={`pointer-events-none fixed bottom-5 z-50 flex justify-center px-4 ${disp.lateral ? 'right-0' : 'inset-x-0'}`} style={disp.lateral ? { width: disp.ancho } : undefined}>
                {aviso && (
                    <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-charcoal-900 px-4 py-2.5 text-[13px] text-white shadow-lg">
                        <Check className="h-4 w-4 shrink-0 text-accent-gold" />
                        <span className="min-w-0">{aviso}</span>
                        {!disp.dos && vista === 'pasos' && (
                            <button type="button" onClick={() => setVista('documento')} className="shrink-0 font-semibold text-accent-gold">Ver</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AvisoError({ mensaje }: { mensaje: string }) {
    const cuota = /consultas/i.test(mensaje);
    return (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-red-900 ring-1 ring-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
                {mensaje}
                {cuota && <> <Link href="/precios" className="font-semibold underline">Ver planes</Link></>}
            </span>
        </div>
    );
}
