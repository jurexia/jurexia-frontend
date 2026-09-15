'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
    AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Indent, Italic, List, ListOrdered,
    Quote, Redo2, RemoveFormatting, Underline, Undo2, type LucideIcon,
} from 'lucide-react';
import { escapar } from '@/lib/documento/marcado';

/**
 * LA HOJA: el editor de texto enriquecido del constructor de demanda.
 *
 * Es el editor de SwitchMyAI (`src/components/app/Hoja.tsx`) portado a este
 * proyecto, con la misma decisión de fondo: `contentEditable` con
 * `execCommand`, que es lo único que conserva el deshacer nativo del
 * navegador, y el HTML inicial escrito UNA vez al montar para que React no se
 * lleve el cursor en cada tecla.
 *
 * LO QUE SE AÑADIÓ PARA UN ESCRITO:
 *   · INTERLINEADO (1, 1.5, 2) y SANGRÍA DE PRIMERA LÍNEA sobre los párrafos
 *     de la selección. No hay comando nativo: se escribe el estilo en el bloque
 *     y el exportador lo lee.
 *   · PEGADO LIMPIO. Lo que se pega de Word o de una página web entra como
 *     texto en párrafos; si no, arrastra estilos que en el .docx salen rotos.
 *   · GUARDADO MIENTRAS SE ESCRIBE (con espera), no sólo al salir: el borrador
 *     de una demanda no se puede perder por cerrar la pestaña.
 *   · LA HOJA ES UNA PÁGINA: fondo blanco, márgenes proporcionales a los del
 *     Word (3 cm izquierda, 2 cm derecha) y Arial a 12 pt. Lo que se ve es lo
 *     que se imprime.
 */

const LETRAS = ['Arial', 'Times New Roman', 'Georgia', 'Calibri', 'Courier New'] as const;
const CUERPOS = [10, 11, 12, 13, 14, 16] as const;

export interface HojaAPI {
    raiz: () => HTMLDivElement | null;
    /** Añade HTML al final del documento, o donde está el cursor si está dentro. */
    insertar: (html: string, donde?: 'final' | 'cursor') => void;
    /** Sustituye el documento entero. */
    reemplazar: (html: string) => void;
    vacia: () => boolean;
}

interface HojaProps {
    htmlInicial: string;
    onCambio: (html: string) => void;
    soloLectura?: boolean;
    /** Contenido que se está escribiendo (streaming): se enseña encima, sin editar. */
    vistaPrevia?: string | null;
}

export const Hoja = forwardRef<HojaAPI, HojaProps>(function Hoja({ htmlInicial, onCambio, soloLectura, vistaPrevia }, ref) {
    const hoja = useRef<HTMLDivElement | null>(null);
    /* EL OBJETO, NO SÓLO LA CADENA, SE FIJA UNA VEZ. El App Router de Next 14
       trae el React «canary», que compara `dangerouslySetInnerHTML` por
       identidad del objeto: con `{{ __html: … }}` escrito en el JSX, cada render
       del padre (cambiar de pestaña, insertar un argumento) volvía a escribir
       la hoja con el contenido inicial y borraba lo que había. Medido en la
       prueba: 21 caracteres insertados → 0 tras cambiar el papel. */
    const inicial = useRef({ __html: htmlInicial });
    const cambio = useRef(onCambio);
    const espera = useRef<number | null>(null);
    useEffect(() => { cambio.current = onCambio; });

    const avisar = () => {
        if (espera.current) window.clearTimeout(espera.current);
        espera.current = window.setTimeout(() => {
            if (hoja.current) cambio.current(hoja.current.innerHTML);
        }, 600);
    };
    useEffect(() => () => {
        if (espera.current) window.clearTimeout(espera.current);
        if (hoja.current) cambio.current(hoja.current.innerHTML);
    }, []);

    useImperativeHandle(ref, () => ({
        raiz: () => hoja.current,
        vacia: () => !(hoja.current?.innerText || '').trim(),
        reemplazar: (html: string) => {
            if (!hoja.current) return;
            hoja.current.innerHTML = html;
            cambio.current(html);
        },
        insertar: (html: string, donde = 'final') => {
            const nodo = hoja.current;
            if (!nodo) return;
            const sel = window.getSelection();
            const dentro = donde === 'cursor' && sel && sel.rangeCount > 0 && nodo.contains(sel.anchorNode);
            if (dentro) {
                nodo.focus();
                try { document.execCommand('insertHTML', false, html); } catch { nodo.insertAdjacentHTML('beforeend', html); }
            } else {
                nodo.insertAdjacentHTML('beforeend', html);
                const ultimo = nodo.lastElementChild as HTMLElement | null;
                ultimo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            cambio.current(nodo.innerHTML);
        },
    }), []);

    function ordenar(orden: string, valor?: string) {
        const nodo = hoja.current;
        if (!nodo) return;
        nodo.focus();
        try {
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand(orden, false, valor);
        } catch { /* sin comando, el texto se queda como estaba */ }
        avisar();
    }

    /* El tamaño en puntos: el centinela 7 y reescritura a `pt` (ver SwitchMyAI). */
    function talla(puntos: string) {
        const nodo = hoja.current;
        if (!nodo) return;
        nodo.focus();
        try {
            document.execCommand('styleWithCSS', false, 'false');
            document.execCommand('fontSize', false, '7');
            for (const marca of Array.from(nodo.querySelectorAll('font[size="7"]'))) {
                const envoltura = document.createElement('span');
                envoltura.style.fontSize = `${puntos}pt`;
                while (marca.firstChild !== null) envoltura.append(marca.firstChild);
                marca.replaceWith(envoltura);
            }
        } catch { /* igual que arriba */ }
        avisar();
    }

    /** Los bloques (p, h, blockquote, li) que toca la selección actual. */
    function bloquesSeleccionados(): HTMLElement[] {
        const nodo = hoja.current;
        const sel = window.getSelection();
        if (!nodo || !sel || sel.rangeCount === 0) return [];
        const rango = sel.getRangeAt(0);
        if (!nodo.contains(rango.commonAncestorContainer)) return [];
        const esBloque = (el: Element) => /^(P|H1|H2|H3|BLOCKQUOTE|LI|DIV)$/.test(el.tagName) && el !== nodo;
        const subir = (n: Node | null): HTMLElement | null => {
            let x: Node | null = n;
            while (x && x !== nodo) {
                if (x instanceof HTMLElement && esBloque(x)) return x;
                x = x.parentNode;
            }
            return null;
        };
        const todos = Array.from(nodo.querySelectorAll('p,h1,h2,h3,blockquote,li')) as HTMLElement[];
        const dentro = todos.filter((b) => rango.intersectsNode(b));
        const inicio = subir(rango.startContainer);
        return dentro.length ? dentro : inicio ? [inicio] : [];
    }

    function interlinear(valor: string) {
        const bloques = bloquesSeleccionados();
        bloques.forEach((b) => { b.style.lineHeight = valor; });
        if (bloques.length) avisar();
        hoja.current?.focus();
    }

    function sangrar() {
        const bloques = bloquesSeleccionados().filter((b) => b.tagName === 'P');
        if (!bloques.length) return;
        const quitar = bloques.every((b) => parseFloat(b.style.textIndent) > 0);
        bloques.forEach((b) => { b.style.textIndent = quitar ? '' : '1.25cm'; });
        avisar();
        hoja.current?.focus();
    }

    function pegar(e: React.ClipboardEvent<HTMLDivElement>) {
        const texto = e.clipboardData.getData('text/plain');
        if (!texto) return;
        e.preventDefault();
        const html = texto
            .replace(/\r/g, '')
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => `<p>${escapar(p).replace(/\n/g, '<br>')}</p>`)
            .join('');
        try {
            document.execCommand('insertHTML', false, html || escapar(texto));
        } catch { /* sin comando: no se pega */ }
        avisar();
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {!soloLectura && (
                <div
                    role="group"
                    aria-label="Formato del documento"
                    className="sticky top-0 z-10 flex flex-nowrap items-center gap-x-0.5 overflow-x-auto border-b border-charcoal-900/10 bg-cream-100/95 px-2 py-1.5 backdrop-blur [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:gap-y-1 sm:overflow-visible sm:px-4 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0"
                >
                    <Eleccion rotulo="Estilo" ancho="w-[6.75rem]"
                        opciones={[
                            { valor: 'p', texto: 'Texto' },
                            { valor: 'h1', texto: 'Título' },
                            { valor: 'h2', texto: 'Rubro' },
                            { valor: 'h3', texto: 'Apartado' },
                        ]}
                        onElegir={(v) => ordenar('formatBlock', `<${v}>`)} />
                    <Eleccion rotulo="Letra" ancho="w-[6.5rem]"
                        opciones={LETRAS.map((l) => ({ valor: l, texto: l }))}
                        onElegir={(v) => ordenar('fontName', v)} />
                    <Eleccion rotulo="Pt" ancho="w-[3.75rem]"
                        opciones={CUERPOS.map((c) => ({ valor: String(c), texto: String(c) }))}
                        onElegir={talla} />
                    <Eleccion rotulo="Interl." ancho="w-[4.75rem]"
                        opciones={[{ valor: '1', texto: '1.0' }, { valor: '1.5', texto: '1.5' }, { valor: '2', texto: '2.0' }]}
                        onElegir={interlinear} />
                    <Separador />
                    <Herramienta icono={Bold} rotulo="Negrita" onClick={() => ordenar('bold')} />
                    <Herramienta icono={Italic} rotulo="Cursiva" onClick={() => ordenar('italic')} />
                    <Herramienta icono={Underline} rotulo="Subrayado" onClick={() => ordenar('underline')} />
                    <Separador />
                    <Herramienta icono={AlignLeft} rotulo="Alinear a la izquierda" onClick={() => ordenar('justifyLeft')} />
                    <Herramienta icono={AlignCenter} rotulo="Centrar" onClick={() => ordenar('justifyCenter')} />
                    <Herramienta icono={AlignRight} rotulo="Alinear a la derecha" onClick={() => ordenar('justifyRight')} />
                    <Herramienta icono={AlignJustify} rotulo="Justificar" onClick={() => ordenar('justifyFull')} />
                    <Separador />
                    <Herramienta icono={Indent} rotulo="Sangría de primera línea" onClick={sangrar} />
                    <Herramienta icono={List} rotulo="Viñetas" onClick={() => ordenar('insertUnorderedList')} />
                    <Herramienta icono={ListOrdered} rotulo="Lista numerada" onClick={() => ordenar('insertOrderedList')} />
                    <Herramienta icono={Quote} rotulo="Cita textual" onClick={() => ordenar('formatBlock', '<blockquote>')} />
                    <Herramienta icono={RemoveFormatting} rotulo="Quitar formato" onClick={() => ordenar('removeFormat')} />
                    <Separador />
                    <Herramienta icono={Undo2} rotulo="Deshacer" onClick={() => ordenar('undo')} />
                    <Herramienta icono={Redo2} rotulo="Rehacer" onClick={() => ordenar('redo')} />
                    {/* En teléfono la fila se desliza: el degradado dice que sigue. */}
                    <span aria-hidden="true" className="pointer-events-none sticky right-0 order-last -ml-6 h-8 w-6 shrink-0 bg-gradient-to-l from-cream-100 to-transparent sm:hidden" />
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto bg-cream-300/70 px-3 py-4 sm:px-6 sm:py-8">
                {/* LA PÁGINA. Márgenes en % del ancho, proporcionales a los del
                    Word: 3 cm de 21.59 a la izquierda (13.9 %), 2 cm a la
                    derecha (9.3 %) y 2.5 cm arriba y abajo (11.6 %). Así la hoja
                    guarda su proporción en un teléfono y en un monitor. */}
                <div className="relative mx-auto w-full max-w-[816px] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.06),0_12px_40px_-12px_rgba(20,18,16,0.18)] ring-1 ring-charcoal-900/[0.06]">
                    {vistaPrevia != null && (
                        <div
                            aria-live="polite"
                            className="hoja-escrito absolute inset-0 z-[1] overflow-hidden bg-white pb-[11.6%] pl-[13.9%] pr-[9.3%] pt-[11.6%]"
                            dangerouslySetInnerHTML={{ __html: vistaPrevia }}
                        />
                    )}
                    <div
                        ref={hoja}
                        data-hoja="1"
                        contentEditable={!soloLectura}
                        suppressContentEditableWarning
                        suppressHydrationWarning
                        role="textbox"
                        aria-multiline="true"
                        aria-label="Documento"
                        spellCheck
                        lang="es-MX"
                        onInput={avisar}
                        onBlur={() => { if (hoja.current) cambio.current(hoja.current.innerHTML); }}
                        onPaste={pegar}
                        dangerouslySetInnerHTML={inicial.current}
                        className={`hoja-escrito min-h-[70vh] pb-[11.6%] pl-[13.9%] pr-[9.3%] pt-[11.6%] outline-none ${vistaPrevia != null ? 'invisible' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
});

function Herramienta({ icono: Icono, rotulo, onClick }: {
    icono: LucideIcon;
    rotulo: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={rotulo}
            title={rotulo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className="grid h-8 w-8 place-items-center rounded-md text-charcoal-900/60 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold"
        >
            <Icono className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
        </button>
    );
}

function Eleccion({ rotulo, ancho, opciones, onElegir }: {
    rotulo: string;
    ancho: string;
    opciones: readonly { valor: string; texto: string }[];
    onElegir: (valor: string) => void;
}) {
    return (
        <select
            aria-label={rotulo}
            title={rotulo}
            value=""
            onChange={(e) => {
                const v = e.target.value;
                if (v !== '') onElegir(v);
                e.target.value = '';
            }}
            className={`h-8 cursor-pointer rounded-md border border-charcoal-900/10 bg-white/70 px-1.5 text-[11px] text-charcoal-900/70 transition-colors hover:bg-white hover:text-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold max-sm:order-last ${ancho}`}
        >
            <option value="">{rotulo}</option>
            {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
    );
}

function Separador() {
    return <span aria-hidden="true" className="mx-1 hidden h-5 w-px shrink-0 bg-charcoal-900/10 sm:inline-block" />;
}
