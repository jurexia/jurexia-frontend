'use client';

/**
 * El visor que abre en el artículo citado, lo resalta, y se sigue leyendo con
 * el dedo como cualquier PDF.
 *
 * DOS COSAS QUE LA PRIMERA VERSIÓN HIZO MAL (2-sep-2026)
 * ------------------------------------------------------
 * (a) DIBUJABA UNA SOLA PÁGINA. Sustituir el iframe por un lienzo suelto se
 *     llevó por delante el scroll: para leer el artículo siguiente había que
 *     pulsar «página siguiente». Un PDF que no se puede hojear no es un
 *     visor. Ahora se apilan todas las páginas en una columna con scroll y
 *     cada una se dibuja cuando se acerca a la ventana.
 *
 * (b) BUSCABA POR EL NÚMERO DEL ARTÍCULO, y eso marca cualquier cosa. «Artículo
 *     190» aparece en el índice, en las remisiones de otros artículos («en
 *     términos del artículo 190…») y en los transitorios; y peor, un `indexOf`
 *     de «articulo 19» casa dentro de «articulo 190». El abogado veía el
 *     amarillo sobre un párrafo que no era el suyo, y un resaltado que miente
 *     hace más daño que no resaltar nada: destruye justo la confianza que este
 *     panel existe para dar.
 *
 * CÓMO SE BUSCA AHORA: por el TEXTO del artículo, que ya lo tenemos
 * ---------------------------------------------------------------
 * El panel de citas no sólo sabe «Artículo 190»: tiene el texto del precepto
 * que el sistema citó. Una frase literal de ese texto es una huella mucho más
 * específica que un número, y además es lo que el abogado quiere cotejar.
 *
 * El orden de intentos es:
 *   1. una frase larga del cuerpo del artículo (la más específica),
 *   2. una frase más corta, por si el PDF corta o guioniza distinto,
 *   3. el rótulo «Artículo 190» pero **con frontera de palabra** y exigiendo
 *      que detrás venga el cuerpo del artículo, no una remisión.
 *
 * Y SI NADA CASA CON CERTEZA, NO SE PINTA NADA. Se dice que no se pudo
 * localizar y se deja el documento abierto en la página 1. Preferimos no
 * ayudar a ayudar mal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Loader2, AlertTriangle, SearchX } from 'lucide-react';

interface Props {
    /** El panel resuelve la URL antes de llegar aquí; si viene vacía no hay PDF que abrir. */
    url: string | null;
    /** «Artículo 190», tal como lo extrajo el panel de citas. */
    articulo?: string | null;
    /** El texto del precepto citado. Es la huella con la que se localiza de verdad. */
    textoArticulo?: string | null;
    /** Alto del visor. El panel lateral usa 440px. */
    alto?: number;
}

/** Sin acentos, sin mayúsculas, sin puntuación y con los espacios colapsados. */
function normalizar(t: string): string {
    return t
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        // Tras quitar los diacríticos todo lo que importa es ASCII —la ñ se
        // descompone en n—, así que no hace falta la clase unicode, que además
        // exige un `target` más nuevo del que compila este proyecto.
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * El número del artículo: «190», «190 bis», «17».
 *
 * SE TOMA EL NÚMERO QUE SIGUE A «ARTÍCULO», no el último de la cadena.
 * Parece un detalle y era el fallo entero: la etiqueta real que llega no
 * siempre es «Artículo 148.», también viene «Art. 19 CPEUM (parte 2)». Con la
 * versión anterior —que anclaba al final— eso daba **2**, así que el visor
 * buscaba «artículo 2», lo encontraba en «artículo 2o. de la Ley
 * Reglamentaria» dentro de los TRANSITORIOS, y abría la Constitución en la
 * página 206 en vez de en el 19.
 *
 * Medido sobre las etiquetas que produce el panel: cinco de siete salían mal.
 */
function numeroDe(etiqueta: string): string {
    const m = normalizar(etiqueta)
        .match(/\bart(?:iculo)?\s+(\d+(?:\s+(?:bis|ter|quater|quinquies))?)/);
    return m ? m[1] : '';
}

type Trozo = { inicio: number; fin: number; indice: number };
type Objetivo = { pagina: number; desde: number; hasta: number; certeza: 'texto' | 'rotulo' };

/**
 * El artículo despojado de sus adornos.
 *
 * El texto que llega del corpus NO es sólo el precepto: viene envuelto en
 * corchetes de metadatos, y uno de ellos es el NOMBRE DE LA LEY.
 *
 *     [MATERIA: procesal_civil]
 *     [Código Nacional de Procedimientos Civiles y Familiares | Capítulo II…]
 *     Artículo 148. En el Poder Judicial respectivo estarán disponibles…
 *
 * Ese envoltorio es exactamente lo que hizo fallar la versión anterior: la
 * huella se construía con las primeras palabras del texto, o sea con el
 * nombre de la ley, que es el ENCABEZADO IMPRESO EN CADA PÁGINA. El visor
 * abría el Código en la página 2 y pintaba de amarillo su propio título.
 * Comprobado el 2-sep-2026 sobre el PDF real de 279 páginas.
 */
function cuerpoLimpio(texto: string | null | undefined): string {
    const sinCorchetes = (texto || '').replace(/\[[^\]]*\]/g, ' ');
    return normalizar(sinCorchetes)
        .replace(/^\s*articulo\s+\d+(?:\s+(?:bis|ter|quater|quinquies))?\s*/, '');
}

/** Las palabras del cuerpo que sirven para confirmar: las cortas no distinguen. */
function palabrasClave(cuerpo: string): string[] {
    return cuerpo.split(' ').filter((w) => w.length > 3).slice(0, 24);
}

export function VisorArticulo({ url, articulo, textoArticulo, alto = 440 }: Props) {
    const scroller = useRef<HTMLDivElement | null>(null);
    const documento = useRef<any>(null);
    const dibujadas = useRef<Set<number>>(new Set());
    const objetivo = useRef<Objetivo | null>(null);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [paginaVisible, setPaginaVisible] = useState(1);
    const [estadoBusqueda, setEstadoBusqueda] =
        useState<'buscando' | 'encontrado' | 'no_encontrado' | 'sin_articulo'>('buscando');
    const [dims, setDims] = useState<{ ancho: number; alto: number } | null>(null);

    const rotulo = useMemo(() => (articulo || '').trim(), [articulo]);

    // ── Texto plano de una página, con el mapa de qué fragmento es cada letra ──
    const planoDe = useCallback(async (page: any) => {
        const contenido = await page.getTextContent();
        const items = contenido.items as any[];
        let plano = '';
        const trozos: Trozo[] = [];
        for (let i = 0; i < items.length; i++) {
            const t = normalizar(items[i].str || '');
            if (!t) continue;
            trozos.push({ inicio: plano.length, fin: plano.length + t.length, indice: i });
            plano += t + ' ';
        }
        return { plano, trozos, items };
    }, []);

    // ── Dibujar una página concreta dentro de su hueco ───────────────────
    const dibujarPagina = useCallback(async (n: number) => {
        const doc = documento.current;
        const cont = scroller.current;
        if (!doc || !cont || dibujadas.current.has(n)) return;
        dibujadas.current.add(n);

        const hueco = cont.querySelector<HTMLDivElement>(`[data-pagina="${n}"]`);
        if (!hueco) return;
        const cv = hueco.querySelector('canvas');
        const capa = hueco.querySelector<HTMLDivElement>('[data-capa]');
        if (!cv || !capa) return;

        const pdfjs = await import('pdfjs-dist');
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const escala = Math.max(0.4, (cont.clientWidth - 16) / base.width);
        const viewport = page.getViewport({ scale: escala });

        // En pantallas Retina el lienzo se dibuja al doble y se muestra al
        // tamaño lógico; sin esto el texto de un documento que se cita se ve
        // borroso, y lo borroso también resta confianza.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.floor(viewport.width * dpr);
        cv.height = Math.floor(viewport.height * dpr);
        cv.style.width = `${Math.floor(viewport.width)}px`;
        cv.style.height = `${Math.floor(viewport.height)}px`;
        hueco.style.height = 'auto';

        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // ── El resaltado, sólo en la página del objetivo ─────────────────
        const obj = objetivo.current;
        capa.innerHTML = '';
        capa.style.width = `${Math.floor(viewport.width)}px`;
        capa.style.height = `${Math.floor(viewport.height)}px`;
        if (!obj || obj.pagina !== n) return;

        const { trozos, items } = await planoDe(page);
        const tocados = trozos.filter((t) => t.fin > obj.desde && t.inicio < obj.hasta);
        for (const t of tocados) {
            const it = items[t.indice];
            const m = pdfjs.Util.transform(viewport.transform, it.transform);
            const h = Math.abs(it.height ? it.height * escala : Math.hypot(m[2], m[3]));
            const w = Math.abs((it.width || 0) * escala);
            if (!w || !h) continue;
            const marca = document.createElement('div');
            marca.style.cssText = [
                'position:absolute',
                `left:${m[4] - 1.5}px`,
                `top:${m[5] - h - 1}px`,
                `width:${w + 3}px`,
                `height:${h + 2.5}px`,
                'background:rgba(250,204,21,0.40)',
                'border-radius:2px',
                'pointer-events:none',
            ].join(';');
            capa.appendChild(marca);
        }
    }, [planoDe]);

    // ── Abrir, medir y localizar ─────────────────────────────────────────
    useEffect(() => {
        let vivo = true;
        (async () => {
            if (!url) { setError('sin_pdf'); setCargando(false); return; }
            setCargando(true);
            setError(null);
            dibujadas.current.clear();
            objetivo.current = null;

            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                const doc = await pdfjs.getDocument({
                    url,
                    // Los PDF oficiales traen fuentes incrustadas raras; sin los
                    // mapas de caracteres el texto sale como cuadritos.
                    cMapUrl: '/cmaps/',
                    cMapPacked: true,
                }).promise;
                if (!vivo) return;

                documento.current = doc;
                setTotal(doc.numPages);

                // Las medidas de la primera página sirven de molde para los
                // huecos de todas: pedir las 300 sólo para dimensionarlas
                // costaría más que dibujarlas.
                const p1 = await doc.getPage(1);
                const v1 = p1.getViewport({ scale: 1 });
                setDims({ ancho: v1.width, alto: v1.height });

                if (!rotulo && !textoArticulo) {
                    setEstadoBusqueda('sin_articulo');
                    setCargando(false);
                    return;
                }

                // ── La búsqueda: anclar en el rótulo, CONFIRMAR con el cuerpo ──
                //
                // Buscar sólo por el número marca cualquier cosa —el índice,
                // los transitorios, cada remisión de otro artículo—. Buscar
                // sólo por el texto marcaba el encabezado, porque el texto que
                // recibimos empieza con el nombre de la ley.
                //
                // La señal buena es la conjunción: «Artículo 148.» SEGUIDO de
                // su propio texto. Así que se recorren todas las apariciones
                // del rótulo en el documento y gana la que trae más cuerpo
                // detrás. Verificado contra el PDF real del Código Nacional:
                // el 148 cae en la 37, que es la única página donde el rótulo
                // aparece, y lo mismo el 147 y el 145.
                const cuerpo = cuerpoLimpio(textoArticulo);
                const claves = palabrasClave(cuerpo);
                const num = numeroDe(rotulo);
                const rxRotulo = num
                    ? new RegExp(`(?:^|\\s)articulo ${num.replace(/\s+/g, '\\s+')}(?![\\d])`, 'g')
                    : null;

                let hallado: Objetivo | null = null;
                let mejorPuntos = 0;
                const tope = Math.min(doc.numPages, 500);

                for (let n = 1; n <= tope; n++) {
                    if (!vivo) return;
                    const page = await doc.getPage(n);
                    const { plano } = await planoDe(page);

                    if (rxRotulo) {
                        rxRotulo.lastIndex = 0;
                        let m: RegExpExecArray | null;
                        while ((m = rxRotulo.exec(plano)) !== null) {
                            const desplaz = m[0].startsWith(' ') ? 1 : 0;
                            const cola = plano.slice(m.index + m[0].length,
                                                     m.index + m[0].length + 600);
                            const puntos = claves.filter((w) => cola.includes(w)).length;
                            if (puntos > mejorPuntos) {
                                mejorPuntos = puntos;
                                hallado = {
                                    pagina: n,
                                    desde: m.index + desplaz,
                                    hasta: m.index + m[0].length,
                                    certeza: puntos >= 3 ? 'texto' : 'rotulo',
                                };
                            }
                        }
                        // Con media docena de palabras del cuerpo detrás del
                        // rótulo ya no hay duda razonable: se deja de buscar en
                        // vez de recorrer trescientas páginas por deporte.
                        if (mejorPuntos >= 6) break;
                    }

                    // Sin rótulo utilizable —o sin ninguna aparición— queda la
                    // frase literal del cuerpo, ya sin el nombre de la ley.
                    if (!rxRotulo && claves.length >= 7) {
                        const frase = claves.slice(0, 7).join(' ');
                        const pos = plano.indexOf(frase);
                        if (pos !== -1) {
                            hallado = { pagina: n, desde: pos,
                                        hasta: pos + frase.length, certeza: 'texto' };
                            break;
                        }
                    }
                }

                // Un rótulo sin NADA de su cuerpo detrás es una remisión o una
                // línea de índice, no el precepto. Antes que llevar al abogado
                // a un sitio equivocado, se admite no haberlo encontrado.
                if (hallado && mejorPuntos === 0 && claves.length > 0) hallado = null;

                if (!vivo) return;
                objetivo.current = hallado;
                setEstadoBusqueda(hallado ? 'encontrado' : 'no_encontrado');
                setCargando(false);
            } catch (e) {
                if (!vivo) return;
                setError(e instanceof Error ? e.message : 'No se pudo abrir el documento');
                setCargando(false);
            }
        })();
        return () => { vivo = false; };
    }, [url, rotulo, textoArticulo, planoDe]);

    const irAlArticulo = useCallback(() => {
        const obj = objetivo.current;
        const cont = scroller.current;
        if (!obj || !cont) return;
        const hueco = cont.querySelector<HTMLElement>(`[data-pagina="${obj.pagina}"]`);
        if (hueco) cont.scrollTo({ top: Math.max(0, hueco.offsetTop - 8), behavior: 'smooth' });
    }, []);

    // ── Dibujar lo que se acerca a la ventana, y sólo eso ────────────────
    useEffect(() => {
        const cont = scroller.current;
        if (!cont || !total || cargando) return;

        const obs = new IntersectionObserver(
            (entradas) => {
                for (const e of entradas) {
                    const n = Number((e.target as HTMLElement).dataset.pagina);
                    if (e.isIntersecting) {
                        dibujarPagina(n);
                        if (e.intersectionRatio > 0.35) setPaginaVisible(n);
                    }
                }
            },
            // 600 px de margen: la página siguiente ya está dibujada cuando el
            // usuario llega a ella, así que el scroll no muestra huecos.
            { root: cont, rootMargin: '600px 0px', threshold: [0, 0.35, 0.8] }
        );

        cont.querySelectorAll('[data-pagina]').forEach((n) => obs.observe(n));

        // Al terminar de abrir, saltar al artículo.
        const t = setTimeout(irAlArticulo, 120);
        return () => { obs.disconnect(); clearTimeout(t); };
    }, [total, cargando, dibujarPagina, irAlArticulo]);

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

    const relacion = dims ? dims.alto / dims.ancho : 1.4142;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-cream-400 bg-cream-100 px-3 py-1.5">
                <span className="text-[11px] tabular-nums text-charcoal-600">
                    {total ? `Página ${paginaVisible} de ${total}` : '—'}
                </span>

                {estadoBusqueda === 'encontrado' && (
                    <button onClick={irAlArticulo}
                            className="inline-flex items-center gap-1.5 rounded-md bg-charcoal-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-charcoal-700">
                        <Crosshair className="h-3 w-3" />
                        {rotulo ? `Ir al ${rotulo}` : 'Ir a la cita'}
                    </button>
                )}
                {estadoBusqueda === 'no_encontrado' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-charcoal-500">
                        <SearchX className="h-3 w-3" />
                        No se localizó {rotulo || 'la cita'} en el PDF
                    </span>
                )}
            </div>

            <div ref={scroller} className="relative flex-1 overflow-y-auto bg-cream-200 px-2 py-2"
                 style={{ height: alto }}>
                {cargando && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-cream-200/90">
                        <Loader2 className="h-5 w-5 animate-spin text-charcoal-500" />
                        <p className="text-[11px] text-charcoal-600">
                            {rotulo ? `Buscando el ${rotulo}…` : 'Abriendo el documento…'}
                        </p>
                    </div>
                )}

                <div className="flex flex-col items-center gap-3">
                    {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                        <div key={n} data-pagina={n}
                             className="relative w-full max-w-full bg-white shadow-sm"
                             style={{ aspectRatio: `1 / ${relacion}` }}>
                            <canvas className="block" />
                            <div data-capa className="pointer-events-none absolute left-0 top-0" />
                        </div>
                    ))}
                </div>
            </div>

            {estadoBusqueda === 'encontrado' && objetivo.current?.certeza === 'rotulo' && (
                <p className="border-t border-cream-400 bg-cream-100 px-3 py-1 text-[10px] text-charcoal-500">
                    Localizado por el número de artículo; coteja el texto por tu cuenta.
                </p>
            )}
        </div>
    );
}
