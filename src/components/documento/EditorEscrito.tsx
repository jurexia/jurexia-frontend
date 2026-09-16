'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, ChevronLeft, Loader2, Printer } from 'lucide-react';
import { Hoja, type HojaAPI } from '@/components/documento/Hoja';
import { aWord, imprimir, type Papel } from '@/lib/documento/exportarDocx';

/**
 * EL ESCRITO SUELTO: cualquier respuesta de Iurexia, abierta como un Word.
 *
 * David, 15-sep-2026: «El editor de texto en la herramienta toulmin es bueno.
 * Me gustaría implementarlo cuando el usuario presione en cualquier consulta
 * que da Iurexia […] en la misma ventana, para que el usuario pueda editar el
 * texto tal cual como si estuviera trabajando en Word, conservando en la parte
 * superior el botón de descarga, y el documento salga tal cual lo edite el
 * usuario. El botón ahora será azul y dirá Word. Sin que se despliegue la barra
 * de pasos y documento (ya que eso sólo lo conserva Toulmin).»
 *
 * Es LA MISMA hoja del constructor (`Hoja`) y EL MISMO exportador
 * (`exportarDocx`), sin nada de Toulmin alrededor: ni pasos, ni pestañas, ni
 * tarjetas, ni consultas al servidor. Aquí no se gasta ninguna.
 *
 * POR QUÉ A PANTALLA COMPLETA Y NO ACOPLADO. El constructor se acopla al chat
 * porque se construye A PARTIR de la conversación: hay que ver las dos cosas.
 * Aquí la respuesta ya está dentro del documento, así que el chat no hace
 * falta al lado; y a pantalla completa este panel no toca `--constructor-w`,
 * que es la variable de la que cuelga toda la maqueta del chat. Un segundo
 * escritor de esa variable habría dejado el chat encogido al cerrar uno de los
 * dos paneles, que es exactamente la clase de fallo que no avisa.
 *
 * LO QUE SE EDITA NO SE PIERDE AL RECOGERLO: el panel se esconde, no se
 * desmonta, así que la hoja conserva su contenido. Sólo se rehace cuando se
 * abre OTRA respuesta, y para eso está la `key` sobre el identificador.
 */

export interface EscritoEnEdicion {
    /** Identifica la respuesta: mientras sea la misma, se conserva lo editado. */
    id: string;
    /** El contenido de partida, ya convertido a HTML por `markdownAHtml`. */
    html: string;
    /** Nombre propuesto para el archivo. */
    titulo: string;
}

interface Props {
    escrito: EscritoEnEdicion | null;
    onCerrar: () => void;
}

export default function EditorEscrito({ escrito, onCerrar }: Props) {
    const hoja = useRef<HojaAPI | null>(null);
    const raizRef = useRef<HTMLDivElement | null>(null);
    const focoPrevio = useRef<HTMLElement | null>(null);
    const [titulo, setTitulo] = useState('');
    const [papel, setPapel] = useState<Papel>('carta');
    const [exportando, setExportando] = useState(false);
    const [aviso, setAviso] = useState('');
    const relojAviso = useRef<number | null>(null);

    /* EL ÚLTIMO ESCRITO SE RETIENE. Al recoger el panel, `escrito` vuelve a
       null; si de ahí saliera un `return null`, React desmontaría la hoja y se
       llevaría por delante lo que el abogado acababa de escribir. Se guarda el
       último y el panel se esconde con `hidden`. */
    const [retenido, setRetenido] = useState<EscritoEnEdicion | null>(null);
    useEffect(() => { if (escrito) setRetenido(escrito); }, [escrito]);
    const vigente = escrito ?? retenido;

    const abierto = escrito !== null;
    const tituloEfectivo = titulo.trim() || vigente?.titulo || 'Escrito de Iurexia';

    /* El nombre propuesto se rehace SÓLO al cambiar de respuesta: si se
       reescribiera en cada apertura, borraría el que el abogado puso a mano. */
    const ultimoId = useRef<string | null>(null);
    useEffect(() => {
        if (!escrito || escrito.id === ultimoId.current) return;
        ultimoId.current = escrito.id;
        setTitulo('');
    }, [escrito]);

    function mostrarAviso(texto: string) {
        setAviso(texto);
        if (relojAviso.current) window.clearTimeout(relojAviso.current);
        relojAviso.current = window.setTimeout(() => setAviso(''), 3200);
    }
    useEffect(() => () => { if (relojAviso.current) window.clearTimeout(relojAviso.current); }, []);

    // Al abrir, el foco entra en el panel; al recoger, vuelve de donde vino.
    useEffect(() => {
        if (abierto) {
            focoPrevio.current = (document.activeElement as HTMLElement) ?? null;
            const id = window.requestAnimationFrame(() => {
                raizRef.current?.querySelector<HTMLElement>('[data-foco-inicial]')?.focus();
            });
            return () => window.cancelAnimationFrame(id);
        }
        const previo = focoPrevio.current;
        focoPrevio.current = null;
        if (previo && document.contains(previo)) previo.focus();
    }, [abierto]);

    // La página de atrás no se desplaza mientras el editor la tapa.
    useEffect(() => {
        if (!abierto) return;
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previo; };
    }, [abierto]);

    function teclaDelDialogo(e: React.KeyboardEvent<HTMLDivElement>) {
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

    /* EL WORD SALE DE LA HOJA VIVA, no del texto de partida: `aWord` recorre el
       árbol del editor y lee los estilos en línea, así que lo que se descarga
       es exactamente lo que quedó escrito. */
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

    // Mientras no se haya abierto ninguna vez no hay nada que montar.
    if (!vigente) return null;

    return (
        <div
            ref={raizRef}
            onKeyDown={teclaDelDialogo}
            role="dialog"
            aria-modal="true"
            aria-label="Editor del escrito"
            aria-hidden={abierto ? undefined : true}
            className={`fixed inset-0 z-40 flex flex-col bg-cream-300 ${abierto ? '' : 'hidden'}`}
        >
            {/* ── CABECERA: el botón de descarga vive arriba ──────────────── */}
            <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-charcoal-900/10 bg-cream-100 px-2 sm:gap-3 sm:px-4">
                <button type="button" onClick={onCerrar} data-foco-inicial
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Volver al chat</span><span className="sm:hidden">Chat</span>
                </button>
                <div className="flex min-w-0 items-center justify-center gap-2">
                    <span className="hidden font-serif text-[15px] font-semibold text-charcoal-900 md:inline">Iurex<span className="text-accent-gold">ia</span></span>
                    <span className="hidden h-4 w-px bg-charcoal-900/15 md:inline-block" />
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder={vigente.titulo}
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
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                        {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                        Word
                    </button>
                </div>
            </header>

            {/* ── LA HOJA, Y NADA MÁS ─────────────────────────────────────────
                Sin pestañas «Pasos · Documento»: aquí no hay pasos que enseñar.
                La `key` es lo que hace que abrir OTRA respuesta empiece de cero
                y volver a la MISMA conserve lo editado — `Hoja` escribe su HTML
                inicial una sola vez, al montar. */}
            <section className="flex min-h-0 flex-1 flex-col" aria-label="Documento">
                <Hoja key={vigente.id} ref={hoja} htmlInicial={vigente.html} onCambio={() => { /* vive en el DOM de la hoja */ }} />
            </section>

            <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
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
