'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, Check, ChevronLeft, FileText, Loader2, Printer, X } from 'lucide-react';
import { Hoja, type HojaAPI } from './Hoja';
import { aWord, imprimir, type Papel } from '@/lib/documento/exportarDocx';
import { fuenteDeCita, htmlDeDocumento, metaDeCitas, palabrasDe, type FuenteCita } from '@/lib/documento/citas';

/**
 * EL PANEL DOCUMENTO: la hoja tipo Word acoplada al chat (18-sep-2026).
 *
 * David, 18-sep-2026: «rediseñar nuestro chat a como funciona el de Harvey,
 * conservando nuestros elementos […] desplegar la ventana tipo word
 * trabajando en tiempo real, con las citas […] del lado izquierdo la ventana
 * de chat y del derecho la interface de texto tipo word».
 *
 * La regla: si lo que sale es un escrito, nace aquí; si es una respuesta, se
 * queda en el hilo. El panel se acopla a la derecha con la misma geometría
 * que el constructor de escritos (55 % de la ventana, tope 1120 px, el chat
 * conserva 420) y escribe la misma variable `--constructor-w` que lee la
 * página. Los dos paneles nunca están abiertos a la vez: la página se ocupa.
 *
 * EN VIVO. Mientras la respuesta llega, la hoja enseña la vista previa que ya
 * tenía para el constructor; al terminar, el texto se fija y queda editable.
 * Las citas [N] entran como fichas no editables que abren el visor de la
 * fuente, igual que en la burbuja.
 *
 * VERSIONES. Cada escrito terminado queda como una versión; la lista del
 * encabezado permite volver a cualquiera. Comparar dos versiones no existe
 * todavía.
 *
 * EN TELÉFONO Y TABLETA el panel cubre la pantalla y su cabecera lleva las dos
 * pestañas —Consulta · Documento—; la hoja sigue montada aunque se recoja,
 * así lo editado no se pierde.
 */

export interface DocumentoVivo {
    /** Identifica la respuesta: cambiar de id monta una hoja nueva. */
    id: string;
    titulo: string;
    markdown: string;
    /** El texto sigue llegando: vista previa, sin editar. */
    enVivo: boolean;
}

export interface VersionDocumento {
    id: string;
    titulo: string;
    markdown: string;
    fecha: number;
}

interface Props {
    abierto: boolean;
    documento: DocumentoVivo | null;
    versiones: VersionDocumento[];
    onCerrar: () => void;
    onElegirVersion: (id: string) => void;
    onCita?: (fuente: FuenteCita) => void;
}

export default function PanelDocumento({ abierto, documento, versiones, onCerrar, onElegirVersion, onCita }: Props) {
    const hoja = useRef<HojaAPI | null>(null);
    const raizRef = useRef<HTMLDivElement | null>(null);
    const [titulo, setTitulo] = useState('');
    const [papel, setPapel] = useState<Papel>('carta');
    const [exportando, setExportando] = useState(false);
    const [aviso, setAviso] = useState('');
    const relojAviso = useRef<number | null>(null);

    /* EL ÚLTIMO DOCUMENTO SE RETIENE: al recoger el panel, `documento` puede
       volver a null y la hoja no debe desmontarse con lo editado dentro. */
    const [retenido, setRetenido] = useState<DocumentoVivo | null>(null);
    useEffect(() => { if (documento) setRetenido(documento); }, [documento]);
    const vigente = documento ?? retenido;

    /* ── DÓNDE SE DESPLIEGA: la misma geometría que el constructor ──────── */
    const [disp, setDisp] = useState({ lateral: false, ancho: 0 });
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
            setDisp((d) => (d.lateral === lateral && d.ancho === anchoReal ? d : { lateral, ancho: anchoReal }));
        };
        calcular();
        window.addEventListener('resize', calcular);
        const mo = new MutationObserver(calcular);
        mo.observe(raiz, { attributes: true, attributeFilter: ['style'] });
        return () => { window.removeEventListener('resize', calcular); mo.disconnect(); };
    }, []);
    /* UN SOLO ESCRITOR DE `--constructor-w` A LA VEZ. Se escribe mientras este
       panel está abierto y se devuelve a cero sólo al cerrarse: si cada
       recálculo escribiera «0px» estando cerrado, pisaría el ancho del
       constructor cuando fuera él el abierto. */
    const escribio = useRef(false);
    useEffect(() => {
        const raiz = document.documentElement;
        if (abierto && disp.lateral) {
            raiz.style.setProperty('--constructor-w', `${disp.ancho}px`);
            escribio.current = true;
        } else if (escribio.current) {
            raiz.style.setProperty('--constructor-w', '0px');
            escribio.current = false;
        }
    }, [abierto, disp.lateral, disp.ancho]);
    useEffect(() => () => { if (escribio.current) document.documentElement.style.setProperty('--constructor-w', '0px'); }, []);

    /* ── EL TEXTO: markdown → hoja, con sus citas ─────────────────────── */
    const { html, orden } = useMemo(
        () => (vigente ? htmlDeDocumento(vigente.markdown) : { html: '', orden: [] as string[] }),
        [vigente?.markdown],
    );
    const meta = useMemo(() => (vigente ? metaDeCitas(vigente.markdown) : null), [vigente?.markdown]);
    const palabras = useMemo(() => (vigente ? palabrasDe(vigente.markdown) : 0), [vigente?.markdown]);
    const enVivo = !!vigente?.enVivo;

    /* AL TERMINAR, EL TEXTO SE FIJA en la hoja y queda editable. Se detecta
       la transición en vivo → quieto del MISMO documento. */
    const estabaEnVivo = useRef(false);
    useEffect(() => {
        if (estabaEnVivo.current && !enVivo && vigente) hoja.current?.reemplazar(html);
        estabaEnVivo.current = enVivo;
    }, [enVivo, html, vigente]);

    /* El nombre propuesto se rehace sólo al cambiar de documento. */
    const ultimoId = useRef<string | null>(null);
    useEffect(() => {
        if (!vigente || vigente.id === ultimoId.current) return;
        ultimoId.current = vigente.id;
        setTitulo('');
        estabaEnVivo.current = vigente.enVivo;
    }, [vigente]);
    const tituloEfectivo = titulo.trim() || vigente?.titulo || 'Escrito de Iurexia';

    function mostrarAviso(texto: string) {
        setAviso(texto);
        if (relojAviso.current) window.clearTimeout(relojAviso.current);
        relojAviso.current = window.setTimeout(() => setAviso(''), 3200);
    }
    useEffect(() => () => { if (relojAviso.current) window.clearTimeout(relojAviso.current); }, []);

    // Al abrir, el foco entra en el panel.
    useEffect(() => {
        if (!abierto) return;
        const id = window.requestAnimationFrame(() => {
            raizRef.current?.querySelector<HTMLElement>('[data-foco-inicial]')?.focus();
        });
        return () => window.cancelAnimationFrame(id);
    }, [abierto]);

    // A pantalla completa, la página de atrás no se desplaza.
    useEffect(() => {
        if (!abierto || disp.lateral) return;
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previo; };
    }, [abierto, disp.lateral]);

    function tecla(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); }
    }

    /* LAS FICHAS [N] ABREN EL VISOR, tanto en la vista previa como en la hoja
       editable: el clic sube hasta aquí. */
    function clicEnHoja(e: React.MouseEvent<HTMLDivElement>) {
        const ficha = (e.target as HTMLElement).closest<HTMLElement>('.citation-badge');
        if (!ficha?.dataset.docId || !onCita) return;
        e.preventDefault();
        onCita(fuenteDeCita(meta, ficha.dataset.docId));
    }

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

    if (!vigente) return null;

    const versionActual = versiones.findIndex((v) => v.id === vigente.id);
    const fecha = (t: number) => new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
        <div
            ref={raizRef}
            onKeyDown={tecla}
            role={disp.lateral ? 'complementary' : 'dialog'}
            aria-modal={disp.lateral ? undefined : true}
            aria-label="Documento"
            aria-hidden={abierto ? undefined : true}
            className={`fixed flex flex-col bg-cream-300 ${abierto ? '' : 'hidden'} ${disp.lateral
                ? 'inset-y-0 right-0 z-[35] border-l border-charcoal-900/10 shadow-[-18px_0_48px_-28px_rgba(20,18,16,0.45)]'
                : 'inset-0 z-40'}`}
            style={disp.lateral ? { width: disp.ancho } : undefined}
        >
            {/* ── CABECERA ─────────────────────────────────────────────── */}
            <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-charcoal-900/10 bg-cream-100 px-2 sm:gap-3 sm:px-4">
                {disp.lateral ? (
                    <button type="button" onClick={onCerrar} aria-label="Recoger el documento" data-foco-inicial
                        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                        <X className="h-4 w-4" /> Recoger
                    </button>
                ) : (
                    /* En pantalla chica, las dos pestañas de la maqueta */
                    <div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-charcoal-900/5 p-0.5" role="tablist">
                        <button type="button" role="tab" aria-selected={false} onClick={onCerrar} data-foco-inicial
                            className="h-8 rounded-md px-2 text-[12px] font-medium text-charcoal-900/70 transition-colors hover:bg-white/60 sm:px-3 sm:text-[12.5px]">
                            <ChevronLeft className="mr-0.5 inline h-3.5 w-3.5 align-[-2px]" />Consulta
                        </button>
                        <button type="button" role="tab" aria-selected={true}
                            className="h-8 rounded-md bg-charcoal-900 px-2 text-[12px] font-medium text-white sm:px-3 sm:text-[12.5px]">
                            Documento
                        </button>
                    </div>
                )}
                <div className="flex min-w-0 items-center justify-center gap-2">
                    <FileText className="hidden h-4 w-4 shrink-0 text-accent-brown md:inline" />
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder={vigente.titulo}
                        aria-label="Nombre del documento"
                        className="w-full max-w-[420px] truncate rounded-md bg-transparent px-2 py-1 text-center text-[15px] font-medium text-charcoal-900 placeholder:text-charcoal-900/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-charcoal-900/15"
                    />
                    {versiones.length > 0 && (
                        <select
                            value={versionActual >= 0 ? vigente.id : ''}
                            onChange={(e) => e.target.value && onElegirVersion(e.target.value)}
                            aria-label="Versión del documento"
                            className="hidden h-8 max-w-[160px] shrink-0 rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-2 text-[12px] font-medium text-charcoal-900 sm:block"
                        >
                            {versionActual < 0 && <option value="">{enVivo ? 'Escribiendo…' : 'Sin guardar'}</option>}
                            {versiones.map((v, i) => (
                                <option key={v.id} value={v.id}>Versión {i + 1} · {fecha(v.fecha)}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} aria-label="Tamaño de papel"
                        className="hidden h-9 rounded-lg border border-charcoal-900/15 bg-white px-2 text-[12px] text-charcoal-900 md:block">
                        <option value="carta">Carta</option>
                        <option value="oficio">Oficio</option>
                    </select>
                    <button type="button" onClick={mandarAImprimir} title="Imprimir o guardar como PDF" disabled={enVivo}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-charcoal-900/15 bg-white text-charcoal-900 transition-colors hover:border-charcoal-900/35 disabled:opacity-40">
                        <Printer className="h-4 w-4" />
                    </button>
                    {/* Azul porque así lo pidió David para «Word» (15-sep-2026). */}
                    <button type="button" onClick={descargarWord} disabled={exportando || enVivo} title="Descargar en Word"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40 sm:px-3">
                        {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                        <span className="hidden sm:inline">Word</span>
                    </button>
                </div>
            </header>

            {/* ── LA HOJA ───────────────────────────────────────────────
                La `key` monta una hoja nueva por documento; en vivo entra
                vacía y enseña la vista previa; al terminar se fija el texto. */}
            <section className="flex min-h-0 flex-1 flex-col" aria-label="Hoja del documento" onClick={clicEnHoja}>
                <Hoja
                    key={vigente.id}
                    ref={hoja}
                    htmlInicial={vigente.enVivo ? '' : html}
                    onCambio={() => { /* vive en el DOM de la hoja */ }}
                    vistaPrevia={enVivo ? html : null}
                />
            </section>

            {/* ── EL PIE: qué hay y en qué estado ──────────────────────── */}
            <footer className="flex h-9 shrink-0 items-center gap-3 border-t border-charcoal-900/10 bg-cream-100 px-4 text-[11.5px] text-charcoal-900/65">
                {enVivo ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" /><span>Escribiendo en el documento…</span></>
                ) : (
                    <><Check className="h-3.5 w-3.5 text-accent-gold" /><span>Listo para editar</span></>
                )}
                <span className="ml-auto tabular-nums">{palabras.toLocaleString('es-MX')} palabras</span>
                <span className="tabular-nums">{orden.length} {orden.length === 1 ? 'cita' : 'citas'}{meta && meta.valid > 0 ? ` · ${meta.valid} verificadas` : ''}</span>
            </footer>

            <div role="status" aria-live="polite" className={`pointer-events-none fixed bottom-14 z-50 flex justify-center px-4 ${disp.lateral ? 'right-0' : 'inset-x-0'}`} style={disp.lateral ? { width: disp.ancho } : undefined}>
                {aviso && (
                    <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-charcoal-900 px-4 py-2.5 text-[13px] text-white shadow-lg">
                        <Check className="h-4 w-4 shrink-0 text-accent-gold" />
                        <span className="min-w-0">{aviso}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
