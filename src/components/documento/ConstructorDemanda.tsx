'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle, ArrowDownToLine, Check, ChevronLeft, FileText, ListChecks, Loader2, Network,
    PenLine, Printer, ScrollText,
} from 'lucide-react';
import { Hoja, type HojaAPI } from './Hoja';
import { TarjetaToulmin } from './TarjetaToulmin';
import { aWord, imprimir, type Papel } from '@/lib/documento/exportarDocx';
import { markdownAHtml, textoDeHtml, limpiarMarcadores } from '@/lib/documento/marcado';
import {
    ErrorToulmin, ORDINALES, argumentoAHtml, toulminStream,
    type ResultadoToulmin,
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
] as const;

interface Caso { tipo: string; estado: string; hechos: string; pretension: string }

interface Guardado {
    caso: Caso;
    resultado: ResultadoToulmin | null;
    insertados: number[];
    revisionHtml: string;
    papel: Papel;
    titulo: string;
    html: string;
    paso: IdPaso;
}

const PASOS: { id: IdPaso; n: number; titulo: string; icono: typeof FileText }[] = [
    { id: 'caso', n: 1, titulo: 'El caso', icono: PenLine },
    { id: 'toulmin', n: 2, titulo: 'Argumentos · Toulmin', icono: Network },
    { id: 'redactar', n: 3, titulo: 'Redactar la demanda', icono: ScrollText },
    { id: 'revisar', n: 4, titulo: 'Revisar fundamentos', icono: ListChecks },
    { id: 'word', n: 5, titulo: 'Word listo para imprimir', icono: FileText },
];

const ETAPAS_TOULMIN = [
    { clave: 'problemas', texto: 'Planteando los problemas jurídicos' },
    { clave: 'acervo', texto: 'Buscando en Constitución, tratados, leyes y jurisprudencia' },
    { clave: 'argumentos', texto: 'Construyendo los argumentos' },
    { clave: 'verificando', texto: 'Verificando cada cita contra el acervo' },
];

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
    const [caso, setCaso] = useState<Caso>(guardado?.caso ?? { tipo: 'civil', estado: estadoChat || '', hechos: '', pretension: '' });
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

    const [aviso, setAviso] = useState<string>('');
    const [exportando, setExportando] = useState(false);
    const abortar = useRef<AbortController | null>(null);

    const tipoSel = TIPOS.find((t) => t.valor === caso.tipo) ?? TIPOS[0];
    const tituloEfectivo = titulo.trim() || `${tipoSel.etiqueta}${caso.estado ? ` · ${getEstadoLabel(caso.estado)}` : ''}`;

    // ── guardar en este navegador ─────────────────────────────────────────
    const guardar = useCallback(() => {
        try {
            const g: Guardado = { caso, resultado, insertados, revisionHtml, papel, titulo, html: htmlRef.current, paso };
            window.localStorage.setItem(claveDe(usuarioId), JSON.stringify(g));
        } catch { /* sin almacenamiento: el borrador vive mientras la pestaña esté abierta */ }
    }, [caso, resultado, insertados, revisionHtml, papel, titulo, paso, usuarioId]);
    useEffect(() => { const id = window.setTimeout(guardar, 400); return () => window.clearTimeout(id); }, [guardar]);

    // Si el chat cambia de entidad y el caso aún no la tiene, se toma.
    useEffect(() => {
        if (estadoChat && !caso.estado) setCaso((c) => ({ ...c, estado: estadoChat }));
    }, [estadoChat, caso.estado]);

    useEffect(() => { if (abierto && pasoInicial) { setPaso(pasoInicial); setVista('pasos'); } }, [abierto, pasoInicial]);

    // Bloquear el scroll de la página de atrás mientras está abierto.
    useEffect(() => {
        if (!abierto) return;
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previo; };
    }, [abierto]);

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

    const casoListo = caso.hechos.trim().length >= 40 && caso.pretension.trim().length >= 10;

    // ── 2 · TOULMIN ──────────────────────────────────────────────────────
    async function estructurar() {
        if (!casoListo) { setPaso('caso'); return; }
        abortar.current?.abort();
        abortar.current = new AbortController();
        setTEstado('trabajando'); setTError(''); setTEtapa('problemas');
        try {
            const sesion = await getSession();
            for await (const ev of toulminStream({
                hechos: caso.hechos, pretension: caso.pretension,
                tipo: tipoSel.etiqueta.toLowerCase(), estado: caso.estado || undefined, materia: tipoSel.materia,
            }, sesion?.access_token, abortar.current.signal)) {
                if (ev.tipo === 'paso') setTEtapa(ev.clave === 'material' ? 'argumentos' : ev.clave);
                if (ev.tipo === 'error') throw new ErrorToulmin(ev.mensaje, 500);
                if (ev.tipo === 'listo') {
                    setResultado(ev.resultado);
                    setInsertados([]);
                    setTEstado('listo');
                }
            }
            onConsultaGastada?.();
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') return;
            const status = e instanceof ErrorToulmin ? e.status : 0;
            setTError(status === 429
                ? 'Se te acabaron las consultas de este periodo.'
                : (e as Error)?.message || 'No se pudieron construir los argumentos.');
            setTEstado('error');
        }
    }

    function insertarArgumento(i: number) {
        if (!resultado) return;
        const a = resultado.argumentos[i];
        hoja.current?.insertar(argumentoAHtml(a, ORDINALES[i]), 'final');
        setInsertados((xs) => (xs.includes(i) ? xs : [...xs, i]));
        mostrarAviso(`«${a.titulo}» quedó al final del documento.`);
    }

    function insertarTodos() {
        if (!resultado) return;
        const html = `<h2>FUNDAMENTOS DE DERECHO</h2>` +
            resultado.argumentos.map((a, i) => argumentoAHtml(a, ORDINALES[i])).join('');
        hoja.current?.insertar(html, 'final');
        setInsertados(resultado.argumentos.map((_, i) => i));
        setVista('documento');
        mostrarAviso('Los argumentos quedaron en el documento.');
    }

    // ── 3 · REDACTAR (el /chat de siempre) ───────────────────────────────
    async function redactar(modo: 'reemplazar' | 'final') {
        if (!casoListo) { setPaso('caso'); return; }
        abortar.current?.abort();
        abortar.current = new AbortController();
        setREstado('trabajando'); setRError('');
        setVista('documento');
        const argumentos = resultado?.argumentos?.length
            ? '\n\nFUNDAMENTOS YA ESTRUCTURADOS Y VERIFICADOS (intégralos en el capítulo de derecho o de conceptos de violación, conservando cada cita tal como está escrita, sin cambiar registros, rubros ni artículos):\n\n' +
              resultado.argumentos.map((a, i) => `${ORDINALES[i]}. ${a.titulo}\n${a.redaccion}`).join('\n\n')
            : '';
        const mensaje = `[REDACTAR_DOCUMENTO]
Tipo: ${tipoSel.tipo}
Subtipo: ${tipoSel.subtipo}
Jurisdicción: ${caso.estado ? getEstadoLabel(caso.estado) : 'No indicada'}

Descripción del caso:
HECHOS:
${caso.hechos.trim()}

LO QUE SE PIDE:
${caso.pretension.trim()}${argumentos}`;
        let texto = '';
        let ultimo = 0;
        try {
            const sesion = await getSession();
            for await (const trozo of streamChat(
                [{ role: 'user', content: mensaje }], caso.estado || undefined, 30,
                sesion?.access_token, false, sesion?.user?.id, undefined, undefined, undefined, abortar.current.signal,
            )) {
                texto += trozo;
                const ahora = Date.now();
                if (ahora - ultimo > 250) {
                    ultimo = ahora;
                    setVistaPrevia(markdownAHtml(texto) || '<p style="text-align:center;color:#8b7355"><i>Iurexia está analizando el caso y preparando la demanda…</i></p>');
                }
            }
            const html = markdownAHtml(texto);
            if (!limpiarMarcadores(texto)) throw new Error('La redacción llegó vacía.');
            if (modo === 'reemplazar' || hoja.current?.vacia()) hoja.current?.reemplazar(html);
            else hoja.current?.insertar(html, 'final');
            setREstado('listo');
            mostrarAviso('La demanda quedó en el documento. Revísala y ajústala a tu caso.');
            onConsultaGastada?.();
        } catch (e) {
            if ((e as Error)?.name !== 'AbortError') {
                const m = (e as Error)?.message || '';
                setRError(/429|consultas/i.test(m) ? 'Se te acabaron las consultas de este periodo.' : 'No se pudo redactar. Vuelve a intentarlo.');
                setREstado('error');
            }
        } finally {
            setVistaPrevia(null);
        }
    }

    // ── 4 · REVISAR (el /chat de siempre) ────────────────────────────────
    async function revisar() {
        const raiz = hoja.current?.raiz();
        const texto = raiz ? textoDeHtml(raiz) : '';
        if (texto.length < 200) { setVError('El documento todavía es muy corto para revisarlo.'); setVEstado('error'); return; }
        abortar.current?.abort();
        abortar.current = new AbortController();
        setVEstado('trabajando'); setVError(''); setRevisionHtml('');
        const mensaje = `Revisa este borrador de ${tipoSel.etiqueta.toLowerCase()}${caso.estado ? ` (${getEstadoLabel(caso.estado)})` : ''} y dime, con fundamento en la ley y la jurisprudencia aplicables, qué fundamentos legales o requisitos le faltan o están mal citados antes de presentarlo. Sé concreto: artículo por artículo, y termina con una lista de cambios concretos que debo hacer.

BORRADOR:
${texto.slice(0, 60000)}`;
        let salida = '';
        let ultimo = 0;
        try {
            const sesion = await getSession();
            for await (const trozo of streamChat(
                [{ role: 'user', content: mensaje }], caso.estado || undefined, 30,
                sesion?.access_token, false, sesion?.user?.id, undefined, undefined, undefined, abortar.current.signal,
            )) {
                salida += trozo;
                const ahora = Date.now();
                if (ahora - ultimo > 300) { ultimo = ahora; setRevisionHtml(markdownAHtml(salida) || '<p><i>Iurexia está leyendo el documento…</i></p>'); }
            }
            setRevisionHtml(markdownAHtml(salida));
            setVEstado('listo');
            onConsultaGastada?.();
        } catch (e) {
            if ((e as Error)?.name !== 'AbortError') {
                setVError('No se pudo revisar. Vuelve a intentarlo.');
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
        toulmin: tEstado === 'listo',
        redactar: rEstado === 'listo',
        revisar: vEstado === 'listo',
        word: false,
    };

    const botonPrimario = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-charcoal-900 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:bg-charcoal-900/40';
    const botonSecundario = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-charcoal-900/15 bg-white px-4 text-[13.5px] font-medium text-charcoal-900 transition-colors hover:border-charcoal-900/35 disabled:cursor-not-allowed disabled:opacity-50';
    const campo = 'w-full rounded-lg border border-charcoal-900/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-charcoal-900 placeholder:text-charcoal-900/35 focus:border-accent-gold focus:outline-none focus:ring-2 focus:ring-accent-gold/25';
    const rotulo = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-brown';

    if (!enCliente) return null;

    return (
        <div
            className={`fixed inset-0 z-40 flex flex-col bg-cream-300 ${abierto ? '' : 'hidden'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Constructor de demanda"
        >
            {/* ── CABECERA ─────────────────────────────────────────────── */}
            <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-charcoal-900/10 bg-cream-100 px-2 sm:gap-3 sm:px-4">
                <button type="button" onClick={onCerrar}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                    <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Volver al chat</span><span className="sm:hidden">Chat</span>
                </button>
                <div className="flex min-w-0 items-center justify-center gap-2">
                    <span className="hidden font-serif text-[15px] font-semibold text-charcoal-900 md:inline">Iurex<span className="text-accent-gold">ia</span></span>
                    <span className="hidden h-4 w-px bg-charcoal-900/15 md:inline-block" />
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder={tituloEfectivo}
                        aria-label="Nombre del documento"
                        className="w-full max-w-[420px] truncate rounded-md bg-transparent px-2 py-1 text-center text-[14px] font-medium text-charcoal-900 placeholder:text-charcoal-900/60 hover:bg-charcoal-900/[0.04] focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-gold/50"
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
            <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-charcoal-900/10 bg-cream-100 p-1.5 lg:hidden" role="tablist">
                {(['pasos', 'documento'] as const).map((v) => (
                    <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                        className={`h-9 rounded-lg text-[13px] font-medium transition-colors ${vista === v ? 'bg-charcoal-900 text-white' : 'text-charcoal-900/70 hover:bg-charcoal-900/5'}`}>
                        {v === 'pasos' ? 'Pasos' : 'Documento'}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[420px_1fr]">
                {/* ── LOS PASOS ─────────────────────────────────────────── */}
                <aside className={`h-full min-h-0 overflow-y-auto border-charcoal-900/10 bg-cream-200/60 lg:block lg:border-r ${vista === 'pasos' ? 'block' : 'hidden'}`}>
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
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                                        <label className="block">
                                                            <span className={rotulo}>Escrito</span>
                                                            <select className={campo} value={caso.tipo} onChange={(e) => setCaso({ ...caso, tipo: e.target.value })}>
                                                                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                                                            </select>
                                                        </label>
                                                        <label className="block">
                                                            <span className={rotulo}>Entidad</span>
                                                            <select className={campo} value={caso.estado} onChange={(e) => setCaso({ ...caso, estado: e.target.value })}>
                                                                <option value="">Sin entidad (sólo federal)</option>
                                                                {ESTADOS_SOLO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                                                            </select>
                                                        </label>
                                                    </div>
                                                    <label className="block">
                                                        <span className={rotulo}>Hechos</span>
                                                        <textarea className={`${campo} min-h-[150px] resize-y`} value={caso.hechos}
                                                            onChange={(e) => setCaso({ ...caso, hechos: e.target.value })}
                                                            placeholder="Qué pasó, en orden: quiénes, cuándo, dónde, qué documentos o pruebas hay." />
                                                    </label>
                                                    <label className="block">
                                                        <span className={rotulo}>Lo que se pide</span>
                                                        <textarea className={`${campo} min-h-[90px] resize-y`} value={caso.pretension}
                                                            onChange={(e) => setCaso({ ...caso, pretension: e.target.value })}
                                                            placeholder="Las prestaciones o pretensiones que reclamas." />
                                                    </label>
                                                    <p className="text-[12px] leading-relaxed text-charcoal-900/55">
                                                        Sin nombres reales si no hace falta: para fundar basta con los hechos.
                                                    </p>
                                                    <button type="button" className={botonPrimario} disabled={!casoListo} onClick={() => setPaso('toulmin')}>
                                                        Continuar con los argumentos
                                                    </button>
                                                </div>
                                            )}

                                            {p.id === 'toulmin' && (
                                                <div className="grid gap-3">
                                                    <p className="text-[13px] leading-relaxed text-charcoal-900/70">
                                                        Iurexia plantea los problemas jurídicos de tu caso y construye cada argumento con sus seis piezas —afirmación, hechos, regla, respaldo, fuerza y la objeción que hay que vencer—, citando sólo lo que encuentra en el acervo: Constitución, tratados, Corte Interamericana, leyes y jurisprudencia.
                                                    </p>
                                                    {!casoListo && (
                                                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 ring-1 ring-amber-200">Primero escribe los hechos y lo que pides (paso 1).</p>
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
                                                            <p className="mt-2.5 text-[11.5px] text-charcoal-900/50">Tarda alrededor de un minuto.</p>
                                                        </div>
                                                    ) : (
                                                        <button type="button" className={botonPrimario} disabled={!casoListo} onClick={estructurar}>
                                                            <Network className="h-4 w-4 text-accent-gold" />
                                                            {resultado ? 'Volver a estructurar' : 'Estructurar argumentos'}
                                                            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-medium text-white/80">1 consulta</span>
                                                        </button>
                                                    )}
                                                    {tEstado === 'error' && <AvisoError mensaje={tError} />}

                                                    {resultado && tEstado !== 'trabajando' && (
                                                        <div className="grid gap-2.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <p className="text-[12px] text-charcoal-900/60">
                                                                    {resultado.argumentos.length} argumentos · {resultado.citadas.length} fuentes citadas, todas del acervo
                                                                </p>
                                                                <button type="button" onClick={insertarTodos}
                                                                    className="h-8 rounded-lg border border-accent-gold/50 bg-accent-gold/10 px-3 text-[12px] font-semibold text-charcoal-900 transition-colors hover:bg-accent-gold/20">
                                                                    Todos al documento
                                                                </button>
                                                            </div>
                                                            {resultado.argumentos.map((a, i) => (
                                                                <TarjetaToulmin key={`${i}-${a.titulo}`} argumento={a} ordinal={ORDINALES[i]} fuentes={resultado.fuentes}
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
                                                            <button type="button" className={botonSecundario} onClick={() => setPaso('redactar')}>Continuar: redactar la demanda</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {p.id === 'redactar' && (
                                                <div className="grid gap-3">
                                                    <p className="text-[13px] leading-relaxed text-charcoal-900/70">
                                                        Iurexia redacta la {tipoSel.etiqueta.toLowerCase()} completa —proemio, hechos, derecho, pruebas y puntos petitorios— con {resultado?.argumentos?.length ? `tus ${resultado.argumentos.length} argumentos ya estructurados` : 'los hechos y lo que pides'}. Llega a la hoja mientras se escribe.
                                                    </p>
                                                    {rEstado === 'trabajando' ? (
                                                        <div className="flex items-center gap-2.5 rounded-lg border border-charcoal-900/10 bg-cream-100 px-3 py-3 text-[13px] text-charcoal-900">
                                                            <Loader2 className="h-4 w-4 animate-spin text-accent-brown" /> Redactando en el documento…
                                                            <button type="button" onClick={() => abortar.current?.abort()} className="ml-auto text-[12px] font-medium text-charcoal-900/60 underline-offset-2 hover:underline">Detener</button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                                            <button type="button" className={botonPrimario} disabled={!casoListo} onClick={() => redactar('reemplazar')}>
                                                                <ScrollText className="h-4 w-4 text-accent-gold" /> Redactar
                                                                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-medium text-white/80">1 consulta</span>
                                                            </button>
                                                            <button type="button" className={botonSecundario} disabled={!casoListo} onClick={() => redactar('final')}>
                                                                Añadir al final
                                                            </button>
                                                        </div>
                                                    )}
                                                    <p className="text-[11.5px] leading-relaxed text-charcoal-900/50">«Redactar» sustituye lo que haya en la hoja; «Añadir al final» lo conserva.</p>
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
                                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                                        <button type="button" className={botonPrimario} onClick={descargarWord} disabled={exportando}>
                                                            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 text-accent-gold" />} Descargar Word
                                                        </button>
                                                        <button type="button" className={botonSecundario} onClick={mandarAImprimir}>
                                                            <Printer className="h-4 w-4" /> Imprimir o PDF
                                                        </button>
                                                    </div>
                                                    <p className="text-[11.5px] leading-relaxed text-charcoal-900/50">
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
                <section className={`h-full min-h-0 flex-col lg:flex ${vista === 'documento' ? 'flex' : 'hidden'}`} aria-label="Documento">
                    <Hoja ref={hoja} htmlInicial={htmlRef.current}
                        onCambio={(h) => { htmlRef.current = h; guardar(); }}
                        vistaPrevia={vistaPrevia} />
                </section>
            </div>

            {aviso && (
                <div role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
                    <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-charcoal-900 px-4 py-2.5 text-[13px] text-white shadow-lg">
                        <Check className="h-4 w-4 shrink-0 text-accent-gold" />
                        <span className="min-w-0">{aviso}</span>
                        {vista === 'pasos' && (
                            <button type="button" onClick={() => setVista('documento')} className="shrink-0 font-semibold text-accent-gold lg:hidden">Ver</button>
                        )}
                    </div>
                </div>
            )}
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
