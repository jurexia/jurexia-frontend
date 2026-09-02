'use client';

/**
 * El visor que se abre YA en el artículo citado, con el texto resaltado.
 *
 * POR QUÉ NO BASTABA EL IFRAME (2-sep-2026)
 * -----------------------------------------
 * El panel mostraba el PDF oficial dentro de un `<iframe>` con el visor
 * nativo del navegador. Ese visor entiende `#page=N` y poco más: no sabe
 * buscar texto de forma fiable ni sabe resaltarlo. El abogado abría una ley
 * de trescientas páginas y tenía que ir bajando hasta encontrar el artículo
 * que el sistema estaba citando — justo la fricción que hace que nadie
 * verifique nada.
 *
 * Aquí el PDF se dibuja con pdf.js, que sí da acceso a la capa de texto y a
 * las coordenadas de cada fragmento. Con eso se puede hacer lo único que
 * importa: **abrir en la página correcta y pintar el artículo de amarillo.**
 * Verificar deja de ser una tarea y pasa a ser un vistazo.
 *
 * CÓMO SE BUSCA, y por qué no es un `indexOf`
 * -------------------------------------------
 * El mismo artículo aparece escrito de maneras distintas según quién publicó
 * el PDF: «Artículo 190», «ARTÍCULO 190.», «Art. 190», «Artículo 190 Bis».
 * Y pdf.js no entrega líneas, sino fragmentos sueltos que pueden partir la
 * palabra por la mitad. Por eso se normaliza (sin acentos, sin mayúsculas,
 * espacios colapsados), se concatena la página entera guardando a qué
 * fragmento pertenece cada carácter, y se busca sobre esa cadena. El
 * resaltado se pinta luego sobre TODOS los fragmentos que toca la coincidencia.
 *
 * Se prefiere la primera aparición que va seguida de texto —el articulado
 * real— sobre las del índice, que suelen quedar en las primeras páginas y son
 * sólo una lista de números.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
    /** El panel resuelve la URL antes de llegar aquí; si viene vacía no hay PDF que abrir. */
    url: string | null;
    /** «Artículo 190», tal como lo extrajo el panel de citas. Si viene vacío se abre en la página 1. */
    articulo?: string | null;
    /** Alto del lienzo. El panel lateral usa 440px. */
    alto?: number;
}

/** Sin acentos, sin mayúsculas y con los espacios colapsados. */
function normalizar(t: string): string {
    return t
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * Las formas en que un mismo artículo puede estar escrito en el PDF, de la
 * más específica a la más laxa. Se prueban en orden: «articulo 190 bis» debe
 * ganarle a «articulo 190», que si no casaría dentro de aquél.
 */
function variantes(etiqueta: string): string[] {
    const m = normalizar(etiqueta).match(/(\d+[\s\w]*?)$/);
    const numero = (m ? m[1] : '').trim();
    if (!numero) return [];
    return [
        `articulo ${numero}`,
        `articulo ${numero}.`,
        `art. ${numero}`,
        `art ${numero}`,
    ];
}

type Trozo = { inicio: number; fin: number; indice: number };

export function VisorArticulo({ url, articulo, alto = 440 }: Props) {
    const lienzo = useRef<HTMLCanvasElement | null>(null);
    const capa = useRef<HTMLDivElement | null>(null);
    const contenedor = useRef<HTMLDivElement | null>(null);
    const documento = useRef<any>(null);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [paginaDelArticulo, setPaginaDelArticulo] = useState<number | null>(null);
    const [buscando, setBuscando] = useState(false);

    // ── Dibujar una página y, si toca, resaltar el artículo ──────────────
    const dibujar = useCallback(async (n: number) => {
        const doc = documento.current;
        const cv = lienzo.current;
        const cont = contenedor.current;
        if (!doc || !cv || !cont) return;

        const pdfjs = await import('pdfjs-dist');
        const page = await doc.getPage(n);

        // La escala sale del ancho disponible: el PDF debe caber sin scroll
        // horizontal, que en un panel de 400 px es lo que arruina la lectura.
        const base = page.getViewport({ scale: 1 });
        const escala = Math.max(0.4, (cont.clientWidth - 2) / base.width);
        const viewport = page.getViewport({ scale: escala });

        // En pantallas Retina el lienzo se dibuja al doble y se muestra al
        // tamaño lógico; sin esto el texto del PDF se ve borroso, que en un
        // documento que se cita es peor que un defecto estético.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.floor(viewport.width * dpr);
        cv.height = Math.floor(viewport.height * dpr);
        cv.style.width = `${Math.floor(viewport.width)}px`;
        cv.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // ── El resaltado ────────────────────────────────────────────────
        const marco = capa.current;
        if (!marco) return;
        marco.innerHTML = '';
        marco.style.width = `${Math.floor(viewport.width)}px`;
        marco.style.height = `${Math.floor(viewport.height)}px`;
        if (!articulo) return;

        const contenido = await page.getTextContent();
        const items = contenido.items as any[];

        let plano = '';
        const trozos: Trozo[] = [];
        items.forEach((it, i) => {
            const t = normalizar(it.str || '');
            if (!t) return;
            trozos.push({ inicio: plano.length, fin: plano.length + t.length, indice: i });
            plano += t + ' ';
        });

        let desde = -1;
        let hasta = -1;
        for (const v of variantes(articulo)) {
            const p = plano.indexOf(v);
            if (p !== -1) { desde = p; hasta = p + v.length; break; }
        }
        if (desde === -1) return;

        const tocados = trozos.filter((t) => t.fin > desde && t.inicio < hasta);
        for (const t of tocados) {
            const it = items[t.indice];
            const m = pdfjs.Util.transform(viewport.transform, it.transform);
            const altoTexto = Math.abs(it.height ? it.height * escala : Math.hypot(m[2], m[3]));
            const anchoTexto = Math.abs((it.width || 0) * escala);
            if (!anchoTexto || !altoTexto) continue;

            const marca = document.createElement('div');
            marca.className = 'visor-marca';
            marca.style.cssText = [
                'position:absolute',
                `left:${m[4] - 2}px`,
                `top:${m[5] - altoTexto - 1}px`,
                `width:${anchoTexto + 4}px`,
                `height:${altoTexto + 3}px`,
                'background:rgba(250, 204, 21, 0.42)',
                'border-radius:2px',
                'box-shadow:0 0 0 1px rgba(202, 138, 4, 0.5)',
                'pointer-events:none',
            ].join(';');
            marco.appendChild(marca);
        }

        // Dejar la marca a la vista sin pegarla al borde superior.
        if (tocados.length) {
            const primera = trozos.find((t) => t.indice === tocados[0].indice)!;
            const it = items[primera.indice];
            const m = pdfjs.Util.transform(viewport.transform, it.transform);
            cont.scrollTo({ top: Math.max(0, m[5] - alto / 3), behavior: 'smooth' });
        }
    }, [articulo, alto]);

    // ── Abrir el documento y localizar el artículo ───────────────────────
    useEffect(() => {
        let vivo = true;
        (async () => {
            if (!url) { setError('sin_pdf'); setCargando(false); return; }
            setCargando(true);
            setError(null);
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

                const doc = await pdfjs.getDocument({
                    url,
                    // Los PDF oficiales traen fuentes incrustadas raras; sin
                    // esto pdf.js pide los mapas de caracteres a un CDN que la
                    // CSP bloquea y el texto sale como cuadritos.
                    cMapUrl: '/cmaps/',
                    cMapPacked: true,
                    disableAutoFetch: false,
                }).promise;
                if (!vivo) return;

                documento.current = doc;
                setTotal(doc.numPages);

                // Buscar el artículo. Se recorren las páginas en orden y se
                // toma la PRIMERA que además tenga cuerpo detrás: en un código
                // el índice cita todos los artículos y siempre va delante, así
                // que quedarse con la primera coincidencia a secas llevaría al
                // abogado al índice en vez de a la norma.
                let destino = 1;
                if (articulo) {
                    setBuscando(true);
                    const formas = variantes(articulo);
                    let respaldo: number | null = null;
                    const tope = Math.min(doc.numPages, 400);
                    for (let n = 1; n <= tope; n++) {
                        if (!vivo) return;
                        const p = await doc.getPage(n);
                        const c = await p.getTextContent();
                        const texto = normalizar(
                            (c.items as any[]).map((i) => i.str).join(' ')
                        );
                        const pos = formas.map((f) => texto.indexOf(f)).filter((x) => x !== -1);
                        if (!pos.length) continue;
                        if (respaldo === null) respaldo = n;
                        // ¿Hay articulado después de la coincidencia, o sólo
                        // una lista de números? 220 caracteres de cola bastan
                        // para distinguir un índice de un artículo de verdad.
                        const cola = texto.slice(Math.min(...pos));
                        if (cola.length > 220) { destino = n; respaldo = null; break; }
                    }
                    if (respaldo !== null) destino = respaldo;
                    setPaginaDelArticulo(destino);
                    setBuscando(false);
                }

                if (!vivo) return;
                setPagina(destino);
                setCargando(false);
                await dibujar(destino);
            } catch (e) {
                if (!vivo) return;
                setError(e instanceof Error ? e.message : 'No se pudo abrir el documento');
                setCargando(false);
                setBuscando(false);
            }
        })();
        return () => { vivo = false; };
    }, [url, articulo, dibujar]);

    const ir = useCallback((n: number) => {
        if (n < 1 || n > total) return;
        setPagina(n);
        dibujar(n);
    }, [total, dibujar]);

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-xs text-charcoal-600">No se pudo abrir el PDF aquí.</p>
                {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       className="text-xs underline text-charcoal-900">
                        Abrirlo en una pestaña nueva
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-cream-400 bg-cream-100 px-3 py-1.5">
                <div className="flex items-center gap-1">
                    <button onClick={() => ir(pagina - 1)} disabled={pagina <= 1}
                            aria-label="Página anterior"
                            className="rounded p-1 text-charcoal-700 hover:bg-cream-300 disabled:opacity-30">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[4.5rem] text-center text-[11px] tabular-nums text-charcoal-600">
                        {total ? `${pagina} / ${total}` : '—'}
                    </span>
                    <button onClick={() => ir(pagina + 1)} disabled={pagina >= total}
                            aria-label="Página siguiente"
                            className="rounded p-1 text-charcoal-700 hover:bg-cream-300 disabled:opacity-30">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {articulo && paginaDelArticulo && (
                    <button
                        onClick={() => ir(paginaDelArticulo)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-charcoal-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-charcoal-700"
                    >
                        <Crosshair className="h-3 w-3" />
                        Ir al {articulo}
                    </button>
                )}
            </div>

            <div ref={contenedor} className="relative flex-1 overflow-auto bg-cream-200"
                 style={{ height: alto }}>
                {(cargando || buscando) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-cream-200/85">
                        <Loader2 className="h-5 w-5 animate-spin text-charcoal-500" />
                        <p className="text-[11px] text-charcoal-600">
                            {buscando && articulo ? `Buscando el ${articulo}…` : 'Abriendo el documento…'}
                        </p>
                    </div>
                )}
                <div className="relative mx-auto w-fit">
                    <canvas ref={lienzo} className="block" />
                    <div ref={capa} className="pointer-events-none absolute left-0 top-0" />
                </div>
            </div>
        </div>
    );
}
