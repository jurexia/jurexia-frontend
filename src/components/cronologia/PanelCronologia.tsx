'use client';

/* CRONOLOGÍA DEL EXPEDIENTE (12-oct-2026) — el panel.

   Cuatro momentos: elegir los PDF (o los de la carpeta), ver cuántas
   consultas cuesta y confirmarlo, esperar con el progreso a la vista, y el
   resultado: la tabla de hechos con la página que abre el PDF ahí mismo, las
   cuestiones en disputa, los plazos con su vencimiento, Word y la Agenda.

   NADA SE COBRA SIN CONFIRMAR. La cifra que el abogado acepta viaja con la
   subida; si el servidor recuenta y sale más cara, no cobra y la pantalla
   vuelve a preguntar con la cifra nueva. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
    AlertTriangle, CalendarPlus, CheckCircle2, Download, ExternalLink, FileText,
    GanttChartSquare, History, Loader2, Lock, Upload, X,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import AvisoPlan from '@/components/AvisoPlan';
import { aWord } from '@/lib/documento/exportarDocx';
import {
    contarPaginas, cotizar, crear, enviarPlazosAAgenda, ErrorCrono, estado as leerEstado, fechaCorta,
    lista as listarCronologias, puedeCronologia, textoProgreso, urlPdf,
    type CotizacionCrono, type ResultadoCrono, type TrabajoCrono,
} from '@/lib/cronologia';

export interface DocumentoDeCarpeta { id: string; nombre: string; mime_type?: string | null }

interface Props {
    abierto: boolean;
    onCerrar: () => void;
    /** Desde una carpeta: sus PDF ya guardados, sin volver a subirlos. */
    carpetaId?: string;
    documentosCarpeta?: DocumentoDeCarpeta[];
    /** Abrir directamente una cronología ya hecha. */
    trabajoInicial?: string | null;
    /** Tras cobrar, para que el contador de consultas de la pantalla se ponga al día. */
    onConsultasGastadas?: () => void;
}

type Paso = 'elegir' | 'cotizando' | 'confirmar' | 'subiendo' | 'procesando' | 'lista' | 'error';
type Pestana = 'cronologia' | 'cuestiones' | 'plazos';

const esPdf = (nombre: string, tipo?: string | null) => /pdf/i.test(tipo || '') || /\.pdf$/i.test(nombre);
const UNIDAD: Record<string, string> = { dias: 'días', horas: 'horas', meses: 'meses', anos: 'años' };
const TIPO_DIAS: Record<string, string> = { habiles: 'hábiles', naturales: 'naturales' };
const plazoEnTexto = (cantidad: number, unidad: string, tipo?: string | null) =>
    `${cantidad} ${UNIDAD[unidad] || unidad}${tipo && TIPO_DIAS[tipo] ? ` ${TIPO_DIAS[tipo]}` : ''}`;

export default function PanelCronologia({
    abierto, onCerrar, carpetaId, documentosCarpeta, trabajoInicial, onConsultasGastadas,
}: Props) {
    const { user, profile } = useAuth();
    const permitido = puedeCronologia(profile?.subscription_type, user?.email);

    const [paso, setPaso] = useState<Paso>('elegir');
    // Sin Platinum: el aviso de Platinum (AvisoPlan), como en el resto del chat.
    const [avisoPlatinum, setAvisoPlatinum] = useState(false);
    const [archivos, setArchivos] = useState<File[]>([]);
    const [paginasLocales, setPaginasLocales] = useState<number[]>([]);
    const [elegidosCarpeta, setElegidosCarpeta] = useState<string[]>([]);
    const [cotizacion, setCotizacion] = useState<CotizacionCrono | null>(null);
    const [trabajo, setTrabajo] = useState<TrabajoCrono | null>(null);
    const [recientes, setRecientes] = useState<TrabajoCrono[] | null>(null);
    const [error, setError] = useState<{ texto: string; codigo?: string } | null>(null);
    const [pestana, setPestana] = useState<Pestana>('cronologia');
    const [soloClave, setSoloClave] = useState(false);
    const [plazosElegidos, setPlazosElegidos] = useState<Set<string>>(new Set());
    const [agenda, setAgenda] = useState<{ enviando: boolean; hecho?: string }>({ enviando: false });
    const [exportando, setExportando] = useState(false);
    const hoja = useRef<HTMLDivElement>(null);
    const entrada = useRef<HTMLInputElement>(null);
    // Los PDF subidos en esta sesión, para abrirlos en su página sin pedir
    // la liga al servidor. El índice coincide con el de `documentos`: la API
    // pone primero los subidos y después los de la carpeta.
    const locales = useRef<File[]>([]);

    const pdfsCarpeta = useMemo(
        () => (documentosCarpeta || []).filter((d) => esPdf(d.nombre, d.mime_type)), [documentosCarpeta]);

    const reiniciar = useCallback(() => {
        setPaso('elegir'); setArchivos([]); setPaginasLocales([]); setCotizacion(null); setTrabajo(null);
        setError(null); setPestana('cronologia'); setAgenda({ enviando: false });
        setElegidosCarpeta(pdfsCarpeta.map((d) => d.id));
    }, [pdfsCarpeta]);

    // Al abrir: lo de la carpeta preelegido y las cronologías recientes.
    useEffect(() => {
        if (!abierto) return;
        reiniciar();
        if (!permitido) return;
        listarCronologias(carpetaId).then(setRecientes).catch(() => setRecientes([]));
        if (trabajoInicial) abrirTrabajo(trabajoInicial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, trabajoInicial, carpetaId, permitido]);

    // El progreso se pregunta cada 2,5 s mientras corre.
    useEffect(() => {
        if (paso !== 'procesando' || !trabajo?.id) return;
        let vivo = true;
        let fallos = 0;
        const id = trabajo.id;
        const vuelta = async () => {
            if (!vivo) return;
            try {
                const t = await leerEstado(id);
                fallos = 0;
                if (!vivo) return;
                setTrabajo(t);
                if (t.estado === 'lista') { alListo(t); return; }
                if (t.estado === 'error') {
                    setError({ texto: t.error || 'No se pudo construir la cronología.' }); setPaso('error'); return;
                }
            } catch {
                // Un tropiezo de red no mata el trabajo: corre en el servidor.
                if (++fallos >= 8) {
                    setError({ texto: 'Se perdió la conexión. La cronología sigue en el servidor: ábrala desde «Recientes».' });
                    setPaso('error'); return;
                }
            }
            setTimeout(vuelta, 2500);
        };
        const t0 = setTimeout(vuelta, 1500);
        return () => { vivo = false; clearTimeout(t0); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paso, trabajo?.id]);

    const alListo = (t: TrabajoCrono) => {
        setTrabajo(t);
        setPaso('lista');
        const corren = (t.resultado?.plazos || []).filter((p) => p.estado === 'corre' && p.calculo?.vencimiento);
        setPlazosElegidos(new Set(corren.map((p) => p.id)));
    };

    const abrirTrabajo = async (id: string) => {
        setError(null);
        try {
            const t = await leerEstado(id);
            locales.current = [];
            setTrabajo(t);
            if (t.estado === 'lista') alListo(t);
            else if (t.estado === 'error') { setError({ texto: t.error || 'Esa cronología no se pudo construir.' }); setPaso('error'); }
            else setPaso('procesando');
        } catch (e) {
            setError({ texto: e instanceof Error ? e.message : 'No se pudo abrir la cronología.' });
            setPaso('error');
        }
    };

    const agregarArchivos = async (lista: FileList | null) => {
        if (!lista) return;
        const nuevos = Array.from(lista).filter((f) => esPdf(f.name, f.type));
        if (nuevos.length < lista.length) setError({ texto: 'Sólo se leen PDF; los demás archivos se omitieron.' });
        const cuentas = await Promise.all(nuevos.map((f) => contarPaginas(f).catch(() => 0)));
        setArchivos((a) => [...a, ...nuevos]);
        setPaginasLocales((p) => [...p, ...cuentas]);
    };

    const quitarArchivo = (i: number) => {
        setArchivos((a) => a.filter((_, j) => j !== i));
        setPaginasLocales((p) => p.filter((_, j) => j !== i));
    };

    const pedirCotizacion = async () => {
        setError(null); setPaso('cotizando');
        try {
            const c = await cotizar({ paginas: paginasLocales.reduce((s, n) => s + n, 0), documento_ids: elegidosCarpeta });
            setCotizacion(c); setPaso('confirmar');
        } catch (e) {
            const err = e as ErrorCrono;
            setError({ texto: err.message, codigo: err.codigo }); setPaso('elegir');
        }
    };

    const confirmar = async () => {
        if (!cotizacion) return;
        setError(null); setPaso('subiendo');
        try {
            const r = await crear({
                archivos, documento_ids: elegidosCarpeta, consultas_aceptadas: cotizacion.consultas,
                carpeta_id: carpetaId,
            });
            locales.current = archivos;
            onConsultasGastadas?.();
            setTrabajo({
                id: r.id, estado: 'en_cola', titulo: r.titulo, carpeta_id: carpetaId || null, documentos: [],
                paginas: r.paginas, consultas: r.consultas, progreso: { fase: 'en_cola' }, error: null,
                created_at: new Date().toISOString(),
            });
            setPaso('procesando');
        } catch (e) {
            const err = e as ErrorCrono;
            if (err.codigo === 'cotizacion_distinta' && err.datos) {
                // El servidor contó otra cosa: se vuelve a preguntar, sin cobro.
                setCotizacion({ ...cotizacion, paginas: Number(err.datos.paginas), consultas: Number(err.datos.consultas) });
                setError({ texto: err.message, codigo: err.codigo });
                setPaso('confirmar');
                return;
            }
            setError({ texto: err.message, codigo: err.codigo });
            setPaso(err.codigo === 'saldo_insuficiente' ? 'confirmar' : 'elegir');
        }
    };

    /* Abre el PDF en la página citada. La ventana se abre ANTES de pedir la
       liga: abierta después de un `await`, el navegador la bloquea. */
    const abrirPagina = async (documento: number, pagina: number) => {
        const local = locales.current[documento];
        if (local) {
            window.open(`${URL.createObjectURL(local)}#page=${pagina}`, '_blank', 'noopener');
            return;
        }
        if (!trabajo) return;
        const v = window.open('', '_blank');
        try {
            const url = await urlPdf(trabajo.id, documento);
            if (v) v.location.href = `${url}#page=${pagina}`;
            else window.open(`${url}#page=${pagina}`, '_blank', 'noopener');
        } catch (e) {
            v?.close();
            setError({ texto: e instanceof Error ? e.message : 'No se pudo abrir el documento.' });
        }
    };

    const res: ResultadoCrono | null = trabajo?.resultado || null;
    const varios = (res?.documentos.length || 0) > 1;
    const etiquetaPagina = (documento: number, pagina: number, foja?: string) =>
        `${varios ? `Doc. ${documento + 1} · ` : ''}pág. ${pagina}${foja ? ` · f. ${foja}` : ''}`;
    const hechos = useMemo(
        () => (res?.hechos || []).filter((h) => !soloClave || h.relevancia === 'alta'), [res, soloClave]);
    const titulo = trabajo?.titulo || res?.datos.expediente || 'Expediente';

    const exportarWord = async () => {
        if (!hoja.current) return;
        setExportando(true);
        try { await aWord(hoja.current, `Cronología · ${titulo}`, 'carta'); }
        catch { setError({ texto: 'No se pudo generar el Word.' }); }
        finally { setExportando(false); }
    };

    const mandarAgenda = async () => {
        if (!res) return;
        setAgenda({ enviando: true });
        try {
            const n = await enviarPlazosAAgenda(res, res.plazos.filter((p) => plazosElegidos.has(p.id)), titulo);
            setAgenda({ enviando: false, hecho: n ? `${n} ${n === 1 ? 'plazo enviado' : 'plazos enviados'} a su agenda` : 'Ningún plazo elegido tiene vencimiento' });
        } catch (e) {
            setAgenda({ enviando: false });
            setError({ texto: e instanceof Error ? e.message : 'No se pudieron guardar los plazos.' });
        }
    };

    if (!abierto || typeof document === 'undefined') return null;

    const totalLocal = paginasLocales.reduce((s, n) => s + n, 0);
    const hayAlgo = archivos.length > 0 || elegidosCarpeta.length > 0;

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-charcoal-900/45 sm:items-center sm:p-4" onClick={onCerrar}>
            <div role="dialog" aria-modal="true" aria-label="Cronología del expediente" onClick={(e) => e.stopPropagation()}
                className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#fbf8f1] shadow-2xl sm:rounded-3xl ${paso === 'lista' ? 'max-w-5xl' : 'max-w-2xl'}`}>

                {/* ── Cabecera ── */}
                <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-charcoal-900/10 px-5 pb-3 pt-4">
                    <div className="min-w-0">
                        <h2 className="flex items-center gap-2 font-serif text-xl text-charcoal-900">
                            <GanttChartSquare className="h-5 w-5 text-accent-brown" />
                            Cronología del expediente
                        </h2>
                        <p className="truncate text-[12px] text-gray-600">
                            {paso === 'lista' && trabajo
                                ? `${titulo} · ${trabajo.paginas} páginas · ${trabajo.consultas} consultas`
                                : 'Hechos con su página, cuestiones en disputa y plazos que corren · Platinum'}
                        </p>
                    </div>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-white/70"><X className="h-4 w-4" /></button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {error && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{error.texto}{error.codigo === 'saldo_insuficiente' && (
                                <> <Link href="/precios" className="font-semibold underline">Recargar consultas</Link></>)}</span>
                        </div>
                    )}

                    {/* ── Sin Platinum: la función se ve, bloqueada ── */}
                    {!permitido ? (
                        <div className="mx-auto max-w-md py-6 text-center">
                            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-charcoal-900">
                                <Lock className="h-5 w-5 text-[#c9a962]" />
                            </div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-brown">Exclusiva del plan Platinum</p>
                            <p className="text-sm leading-relaxed text-charcoal-700">
                                Suba un expediente completo —cientos de páginas— y Iurexia le entrega la cronología de los
                                hechos con la página exacta de cada uno, la lista de cuestiones en disputa y los plazos que
                                corren, listos para Word y para su agenda.
                            </p>
                            <button type="button" onClick={() => setAvisoPlatinum(true)}
                                className="mt-5 inline-block rounded-xl px-6 py-2.5 text-sm font-bold text-charcoal-900"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)' }}>
                                Pásate a Platinum
                            </button>
                            {avisoPlatinum && <AvisoPlan herramienta="cronologia" onCerrar={() => setAvisoPlatinum(false)} />}
                        </div>
                    ) : paso === 'elegir' || paso === 'cotizando' ? (
                        <div className="space-y-4">
                            {pdfsCarpeta.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-500">PDF de esta carpeta</p>
                                    <div className="space-y-1">
                                        {pdfsCarpeta.map((d) => (
                                            <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] ring-1 ring-charcoal-900/10">
                                                <input type="checkbox" checked={elegidosCarpeta.includes(d.id)}
                                                    onChange={(e) => setElegidosCarpeta((s) => e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id))} />
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                <span className="truncate">{d.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); }}
                                onClick={() => entrada.current?.click()}
                                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-charcoal-900/20 bg-white px-4 py-7 text-center hover:border-accent-brown/60">
                                <Upload className="mb-2 h-6 w-6 text-accent-brown" />
                                <p className="text-sm font-medium text-charcoal-900">
                                    {pdfsCarpeta.length ? 'Agregar otros PDF' : 'Suba el expediente en PDF'}
                                </p>
                                <p className="text-[12px] text-gray-500">Uno o varios archivos · escaneados o con texto · hasta 1,500 páginas</p>
                                <input ref={entrada} type="file" accept="application/pdf,.pdf" multiple className="hidden"
                                    onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ''; }} />
                            </div>

                            {archivos.length > 0 && (
                                <ul className="space-y-1">
                                    {archivos.map((f, i) => (
                                        <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] ring-1 ring-charcoal-900/10">
                                            <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                            <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                            <span className="flex-shrink-0 text-[12px] text-gray-500">{paginasLocales[i] || '?'} págs.</span>
                                            <button type="button" onClick={() => quitarArchivo(i)} aria-label={`Quitar ${f.name}`} className="rounded p-0.5 hover:bg-cream-200"><X className="h-3.5 w-3.5" /></button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <button type="button" disabled={!hayAlgo || paso === 'cotizando'} onClick={pedirCotizacion}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-charcoal-900 py-2.5 text-sm font-semibold text-cream-50 hover:bg-charcoal-800 disabled:opacity-50">
                                {paso === 'cotizando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GanttChartSquare className="h-4 w-4" />}
                                {paso === 'cotizando' ? 'Contando páginas…' : `Ver cuánto cuesta${totalLocal ? ` · ${totalLocal} págs.` : ''}`}
                            </button>

                            {recientes && recientes.length > 0 && (
                                <div>
                                    <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                                        <History className="h-3.5 w-3.5" /> Recientes
                                    </p>
                                    <ul className="divide-y divide-charcoal-900/5 rounded-xl bg-white ring-1 ring-charcoal-900/10">
                                        {recientes.slice(0, 8).map((t) => (
                                            <li key={t.id}>
                                                <button type="button" onClick={() => abrirTrabajo(t.id)}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-cream-100">
                                                    <span className="min-w-0 flex-1 truncate">{t.titulo || 'Expediente'}</span>
                                                    <span className="flex-shrink-0 text-[11.5px] text-gray-500">
                                                        {t.paginas} págs. · {t.estado === 'lista' ? new Date(t.created_at).toLocaleDateString('es-MX') : t.estado === 'error' ? 'falló' : 'en proceso'}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : paso === 'confirmar' && cotizacion ? (
                        <div className="mx-auto max-w-md space-y-4 py-2">
                            <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-charcoal-900/10">
                                <p className="text-[12px] uppercase tracking-wide text-gray-500">{cotizacion.paginas} páginas</p>
                                <p className="mt-1 font-serif text-3xl text-charcoal-900">
                                    {cotizacion.consultas} {cotizacion.consultas === 1 ? 'consulta' : 'consultas'}
                                </p>
                                <p className="mt-1 text-[12px] text-gray-500">
                                    1 consulta por cada {cotizacion.paginas_por_consulta} páginas
                                </p>
                                <p className="mt-3 text-[13px] text-charcoal-700">
                                    {cotizacion.saldo.ilimitado
                                        ? 'Su plan no tiene tope de consultas.'
                                        : `Le quedan ${cotizacion.saldo.disponibles} consultas${cotizacion.saldo.recargadas ? ` (${cotizacion.saldo.recargadas} de recarga)` : ''}.`}
                                </p>
                            </div>
                            {cotizacion.excede ? (
                                <p className="text-center text-[13px] text-red-700">
                                    Pasa del máximo de {cotizacion.max_paginas.toLocaleString('es-MX')} páginas por cronología. Divida el expediente en partes.
                                </p>
                            ) : !cotizacion.alcanza ? (
                                <p className="text-center text-[13px] text-red-700">
                                    No le alcanzan las consultas. <Link href="/precios" className="font-semibold underline">Recargar consultas</Link>
                                </p>
                            ) : null}
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setPaso('elegir'); setError(null); }}
                                    className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium ring-1 ring-charcoal-900/15 hover:bg-cream-100">
                                    Volver
                                </button>
                                <button type="button" disabled={!cotizacion.alcanza || cotizacion.excede} onClick={confirmar}
                                    className="flex-[2] rounded-xl bg-charcoal-900 py-2.5 text-sm font-semibold text-cream-50 hover:bg-charcoal-800 disabled:opacity-50">
                                    Confirmar y usar {cotizacion.consultas} {cotizacion.consultas === 1 ? 'consulta' : 'consultas'}
                                </button>
                            </div>
                            <p className="text-center text-[11.5px] text-gray-500">
                                Si la cronología falla, se le devuelven las consultas.
                            </p>
                        </div>
                    ) : paso === 'subiendo' || paso === 'procesando' ? (
                        <div className="mx-auto max-w-md py-8 text-center">
                            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-accent-brown" />
                            {(() => {
                                const p = paso === 'subiendo' ? { texto: 'Subiendo el expediente…', fraccion: 0.01 } : textoProgreso(trabajo!);
                                return (
                                    <>
                                        <p className="text-sm text-charcoal-900">{p.texto}</p>
                                        <div className="mx-auto mt-3 h-1.5 w-full overflow-hidden rounded-full bg-charcoal-900/10">
                                            <div className="h-full rounded-full bg-accent-brown transition-all duration-700" style={{ width: `${Math.round(p.fraccion * 100)}%` }} />
                                        </div>
                                    </>
                                );
                            })()}
                            <p className="mt-4 text-[12px] text-gray-500">
                                Un expediente de 500 páginas tarda unos minutos. Puede cerrar esta ventana: la cronología
                                sigue en el servidor y la encuentra en «Recientes».
                            </p>
                        </div>
                    ) : paso === 'lista' && res ? (
                        <div>
                            {/* ── Datos del asunto y acciones ── */}
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 text-[12.5px] text-charcoal-700">
                                    {[res.datos.expediente && `Exp. ${res.datos.expediente}`, res.datos.organo, res.datos.materia]
                                        .filter(Boolean).join(' · ')}
                                    {res.descartes.hechos > 0 && (
                                        <p className="text-[11.5px] text-gray-500">
                                            Cada hecho se comprobó contra el texto de su página; {res.descartes.hechos} que no se pudieron comprobar se omitieron.
                                        </p>
                                    )}
                                    {(res.lotes_fallidos?.length || 0) > 0 && (
                                        <p className="text-[11.5px] text-amber-800">
                                            Algunas páginas no se pudieron analizar ({res.lotes_fallidos.map((l) => `${l.desde}-${l.hasta}`).join(', ')})
                                            {res.consultas_devueltas ? `; se devolvieron ${res.consultas_devueltas} consultas` : ''}.
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-shrink-0 gap-2">
                                    <button type="button" onClick={exportarWord} disabled={exportando}
                                        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-charcoal-900/15 hover:bg-cream-100 disabled:opacity-50">
                                        {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Word
                                    </button>
                                    <button type="button" onClick={() => setPaso('elegir')}
                                        className="rounded-lg px-3 py-1.5 text-[12.5px] text-gray-600 hover:bg-cream-100">
                                        Nueva
                                    </button>
                                </div>
                            </div>

                            <div className="mb-3 inline-flex rounded-full bg-white p-1 ring-1 ring-charcoal-900/10">
                                {([['cronologia', `Cronología (${res.hechos.length})`], ['cuestiones', `Cuestiones (${res.cuestiones.length})`],
                                    ['plazos', `Plazos (${res.plazos.length})`]] as const).map(([k, t]) => (
                                    <button key={k} type="button" onClick={() => setPestana(k)}
                                        className={`rounded-full px-3.5 py-1 text-[12.5px] font-medium ${pestana === k ? 'bg-charcoal-900 text-white' : 'text-gray-600'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {pestana === 'cronologia' && (
                                <div>
                                    <label className="mb-2 flex w-fit cursor-pointer items-center gap-1.5 text-[12.5px] text-gray-600">
                                        <input type="checkbox" checked={soloClave} onChange={(e) => setSoloClave(e.target.checked)} />
                                        Sólo hechos clave
                                    </label>
                                    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-charcoal-900/10">
                                        <table className="w-full text-left text-[13px] sm:min-w-[640px]">
                                            <thead className="bg-cream-100 text-[11.5px] uppercase tracking-wide text-gray-600">
                                                <tr>
                                                    <th className="w-[96px] px-3 py-2 font-semibold">Fecha</th>
                                                    <th className="px-3 py-2 font-semibold">Hecho</th>
                                                    <th className="hidden w-[190px] px-3 py-2 font-semibold sm:table-cell">Actuación · actor</th>
                                                    <th className="hidden w-[96px] px-3 py-2 font-semibold sm:table-cell">Página</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-charcoal-900/5">
                                                {hechos.map((h) => (
                                                    <tr key={h.id} className="align-top">
                                                        <td className="whitespace-nowrap px-3 py-2 font-medium text-charcoal-900">
                                                            {fechaCorta(h.fecha)}
                                                            {/* En el teléfono la página va bajo la fecha: es lo que
                                                                el abogado viene a buscar y no debe quedar fuera. */}
                                                            <button type="button" onClick={() => abrirPagina(h.documento, h.pagina)}
                                                                className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-accent-brown sm:hidden">
                                                                {etiquetaPagina(h.documento, h.pagina)} <ExternalLink className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <p className={h.relevancia === 'alta' ? 'font-medium text-charcoal-900' : 'text-charcoal-800'}>{h.hecho}</p>
                                                            <p className="mt-0.5 text-[11.5px] italic text-gray-500" title="Texto literal de la página">«{h.cita}»</p>
                                                        </td>
                                                        <td className="hidden px-3 py-2 text-[12px] text-gray-600 sm:table-cell">
                                                            <span className="font-medium text-charcoal-800">{h.actuacion}</span>
                                                            {h.actor && <><br />{h.actor}</>}
                                                        </td>
                                                        <td className="hidden px-3 py-2 sm:table-cell">
                                                            <button type="button" onClick={() => abrirPagina(h.documento, h.pagina)}
                                                                title={`Abrir ${res.documentos[h.documento]?.nombre || 'el PDF'} en la página ${h.pagina}`}
                                                                className="flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-accent-brown underline-offset-2 hover:underline">
                                                                {etiquetaPagina(h.documento, h.pagina, h.foja)} <ExternalLink className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {hechos.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-gray-500">No hay hechos con fecha comprobable.</p>}
                                    </div>
                                </div>
                            )}

                            {pestana === 'cuestiones' && (
                                <ol className="space-y-2">
                                    {res.cuestiones.map((q, i) => (
                                        <li key={q.id} className="rounded-xl bg-white p-3.5 ring-1 ring-charcoal-900/10">
                                            <p className="text-[13.5px] font-semibold text-charcoal-900">{i + 1}. {q.cuestion}</p>
                                            {q.postura && <p className="mt-1 text-[12.5px] text-charcoal-700"><span className="font-medium">{q.sostiene || 'Sostiene'}:</span> {q.postura}</p>}
                                            {q.contraparte && <p className="mt-0.5 text-[12.5px] text-charcoal-700"><span className="font-medium">Respuesta:</span> {q.contraparte}</p>}
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {q.citas.filter((c, j) => q.citas.findIndex((x) => x.documento === c.documento && x.pagina === c.pagina) === j).map((c, j) => (
                                                    <button key={j} type="button" onClick={() => abrirPagina(c.documento, c.pagina)} title={`«${c.cita}»`}
                                                        className="flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-0.5 text-[11.5px] text-accent-brown hover:bg-cream-200">
                                                        {etiquetaPagina(c.documento, c.pagina)} <ExternalLink className="h-2.5 w-2.5" />
                                                    </button>
                                                ))}
                                            </div>
                                        </li>
                                    ))}
                                    {res.cuestiones.length === 0 && <p className="py-6 text-center text-[13px] text-gray-500">No se identificaron cuestiones en disputa.</p>}
                                </ol>
                            )}

                            {pestana === 'plazos' && (
                                <div className="space-y-2">
                                    {res.plazos.map((t) => {
                                        const v = t.calculo?.vencimiento;
                                        return (
                                            <label key={t.id} className={`flex gap-3 rounded-xl bg-white p-3.5 ring-1 ${t.estado === 'corre' ? 'ring-accent-brown/40' : 'ring-charcoal-900/10'} ${v ? 'cursor-pointer' : ''}`}>
                                                <input type="checkbox" className="mt-1" disabled={!v} checked={plazosElegidos.has(t.id)}
                                                    onChange={(e) => setPlazosElegidos((s) => { const n = new Set(s); if (e.target.checked) n.add(t.id); else n.delete(t.id); return n; })} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${t.estado === 'corre' ? 'bg-amber-100 text-amber-900' : t.estado === 'vencido' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-800'}`}>
                                                            {t.estado === 'corre' ? 'Corre' : t.estado === 'vencido' ? 'Vencido' : 'Sin fecha base'}
                                                        </span>
                                                        <span className="text-[13.5px] font-semibold text-charcoal-900">{t.acto}</span>
                                                    </div>
                                                    <p className="mt-1 text-[12.5px] text-charcoal-700">
                                                        {plazoEnTexto(t.cantidad, t.unidad, t.tipo_dias)}
                                                        {t.parte ? ` · ${t.parte}` : ''}
                                                        {t.fecha_base ? ` · desde ${fechaCorta(t.fecha_base)}` : ''}
                                                        {v ? <> · <span className="font-semibold">vence {fechaCorta(v)}</span></> : ''}
                                                    </p>
                                                    <p className="mt-0.5 text-[11.5px] text-gray-500">{t.calculo?.regla || t.regla} · {t.regla_motivo}</p>
                                                    <p className="mt-1 text-[11.5px] italic text-gray-500">«{t.texto_literal}»</p>
                                                    {t.avisos.length > 0 && <ul className="mt-1 list-disc pl-4 text-[11.5px] text-amber-800">{t.avisos.map((a) => <li key={a}>{a}</li>)}</ul>}
                                                    <button type="button" onClick={(e) => { e.preventDefault(); abrirPagina(t.documento, t.pagina); }}
                                                        className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-accent-brown hover:underline">
                                                        {etiquetaPagina(t.documento, t.pagina)} <ExternalLink className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {res.plazos.length === 0 && <p className="py-6 text-center text-[13px] text-gray-500">No se encontraron plazos concedidos en el expediente.</p>}
                                    {res.plazos.length > 0 && (
                                        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 bg-[#fbf8f1] pt-2">
                                            <button type="button" onClick={mandarAgenda} disabled={agenda.enviando || plazosElegidos.size === 0 || !!agenda.hecho}
                                                className="flex items-center gap-1.5 rounded-xl bg-[#b8892d] px-4 py-2 text-[13px] font-semibold text-charcoal-900 disabled:opacity-60">
                                                {agenda.enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : agenda.hecho ? <CheckCircle2 className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
                                                {agenda.hecho || `Enviar ${plazosElegidos.size} ${plazosElegidos.size === 1 ? 'plazo' : 'plazos'} a mi Agenda`}
                                            </button>
                                            {agenda.hecho && <Link href="/agenda" className="text-[12.5px] text-accent-brown underline">Abrir mi agenda</Link>}
                                            <p className="w-full text-[11.5px] text-gray-500">
                                                El vencimiento se calcula con las reglas del código que rige; revíselo con su cédula o lista antes de confiar en él.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── La hoja que va a Word (fuera de la vista) ── */}
                            <div className="sr-only" aria-hidden>
                                <div ref={hoja}>
                                    <h1>Cronología del expediente</h1>
                                    <p>{[titulo, res.datos.expediente && `Expediente ${res.datos.expediente}`, res.datos.organo, res.datos.materia].filter(Boolean).join(' · ')}</p>
                                    <p>Documentos: {res.documentos.map((d, i) => `${varios ? `Doc. ${i + 1}: ` : ''}${d.nombre} (${d.paginas} págs.)`).join('; ')}</p>
                                    <h2>Cronología</h2>
                                    <table>
                                        <thead><tr><th>Fecha</th><th>Hecho</th><th>Actuación · actor</th><th>Página</th></tr></thead>
                                        <tbody>
                                            {res.hechos.map((h) => (
                                                <tr key={h.id}>
                                                    <td>{fechaCorta(h.fecha)}</td>
                                                    <td>{h.hecho} «{h.cita}»</td>
                                                    <td>{[h.actuacion, h.actor].filter(Boolean).join(' · ')}</td>
                                                    <td>{etiquetaPagina(h.documento, h.pagina, h.foja)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <h2>Cuestiones en disputa</h2>
                                    <ol>
                                        {res.cuestiones.map((q) => (
                                            <li key={q.id}>{q.cuestion}{q.postura ? ` ${q.sostiene || 'Sostiene'}: ${q.postura}.` : ''}{q.contraparte ? ` Respuesta: ${q.contraparte}.` : ''} ({q.citas.map((c) => etiquetaPagina(c.documento, c.pagina)).join(', ')})</li>
                                        ))}
                                    </ol>
                                    <h2>Plazos</h2>
                                    <table>
                                        <thead><tr><th>Acto</th><th>Plazo</th><th>Desde</th><th>Vence</th><th>Página</th></tr></thead>
                                        <tbody>
                                            {res.plazos.map((t) => (
                                                <tr key={t.id}>
                                                    <td>{t.acto}{t.parte ? ` (${t.parte})` : ''}</td>
                                                    <td>{plazoEnTexto(t.cantidad, t.unidad, t.tipo_dias)} · {t.calculo?.regla || t.regla}</td>
                                                    <td>{fechaCorta(t.fecha_base)}</td>
                                                    <td>{fechaCorta(t.calculo?.vencimiento) || 'sin cómputo'}</td>
                                                    <td>{etiquetaPagina(t.documento, t.pagina)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <p>Cada hecho se comprobó contra el texto literal de la página citada. Los vencimientos se calcularon con las reglas del código que rige y deben revisarse con las constancias de notificación y el calendario del órgano.</p>
                                </div>
                            </div>
                        </div>
                    ) : paso === 'error' ? (
                        <div className="py-6 text-center">
                            <button type="button" onClick={reiniciar}
                                className="rounded-xl bg-charcoal-900 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-charcoal-800">
                                Empezar de nuevo
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body,
    );
}
