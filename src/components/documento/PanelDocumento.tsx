'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, Check, ChevronLeft, FileText, Loader2, Printer, X } from 'lucide-react';
import { Hoja, type HojaAPI } from './Hoja';
import { aWord, imprimir, type Papel } from '@/lib/documento/exportarDocx';
import {
    fuenteDeCita, htmlDeDocumento, htmlDeDossier, metaDeDossier, palabrasDe, referenciaAPA,
    type FuenteCita,
} from '@/lib/documento/citas';
import { recortarABloque } from '@/lib/documento/revelado';
import { citasSinFuente, conFichas, resumenDeCitas, useFichasDeCitas } from '@/lib/documento/fichas';

/**
 * EL PANEL DOCUMENTO: la hoja tipo Word acoplada al chat (18-sep-2026).
 *
 * David, 18-sep-2026: «rediseñar nuestro chat a como funciona el de Harvey
 * […] que la respuesta empiece a redactarse en esa hoja, que se despliegue al
 * responder […] en ese documento podrá volver a generar una consulta y se irá
 * acumulando. Al último podrá exportarse ese documento con sus citas APA […]
 * tal cual el formato que ve el usuario».
 *
 * EL DOSSIER. La hoja es la conversación entera: cada respuesta se escribe a
 * continuación de la anterior, separada por una raya, y la numeración de las
 * citas sigue de una a otra. La que está llegando se ve como vista previa
 * debajo de lo ya escrito; al terminar se inserta al final y queda editable.
 * Lo que el abogado edita a mano no se toca: sólo se añade.
 *
 * SE ACOPLA a la derecha con la misma geometría que el constructor de
 * escritos (55 % de la ventana, tope 1120 px, el chat conserva 420) y escribe
 * la misma variable `--constructor-w`. Los dos paneles nunca están abiertos a
 * la vez: la página se ocupa.
 *
 * LAS CITAS [N] son fichas no editables que abren el visor de la fuente, y al
 * exportar a Word salen como notas al pie con su referencia APA. Sin logo de
 * Iurexia: el documento es del abogado.
 *
 * EN TELÉFONO Y TABLETA el panel cubre la pantalla y su cabecera lleva las dos
 * pestañas —Consulta · Documento—; la hoja sigue montada aunque se recoja.
 */

export interface BloqueDocumento {
    /** Identifica la respuesta dentro de la conversación (m<índice>). */
    id: string;
    markdown: string;
}

export interface VersionDocumento {
    id: string;
    titulo: string;
    /** El dossier entero en ese momento, con SEP_DOSSIER entre respuestas. */
    markdown: string;
    fecha: number;
}

interface Props {
    abierto: boolean;
    /** La conversación: cambiar de clave monta una hoja nueva. */
    clave: string;
    titulo: string;
    /** Las respuestas terminadas, en orden. */
    bloques: BloqueDocumento[];
    /** La respuesta que está llegando (markdown parcial), o null. */
    vivo: string | null;
    /** Por dónde va el servidor antes del primer token: «Reconociendo el texto
     *  de 50 páginas…». Sin esto el panel enseñaba una hoja en blanco y un pie
     *  que decía «Escribiendo… 0 palabras» durante todo el reconocimiento. */
    paso?: string;
    versiones: VersionDocumento[];
    onCerrar: () => void;
    onCita?: (fuente: FuenteCita) => void;
}

export default function PanelDocumento({ abierto, clave, titulo, bloques, vivo, paso, versiones, onCerrar, onCita }: Props) {
    const hoja = useRef<HojaAPI | null>(null);
    const raizRef = useRef<HTMLDivElement | null>(null);
    const [nombre, setNombre] = useState('');
    const [papel, setPapel] = useState<Papel>('carta');
    const [exportando, setExportando] = useState(false);
    const [aviso, setAviso] = useState('');
    const [versionElegida, setVersionElegida] = useState('');
    const relojAviso = useRef<number | null>(null);

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
    /* UN SOLO ESCRITOR DE `--constructor-w` A LA VEZ: se escribe abierto y se
       devuelve a cero sólo al cerrarse, para no pisar al constructor. */
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

    /* ── EL TEXTO: todas las respuestas a la vez, para numerar las citas seguidas ── */
    /* LO QUE SE ENSEÑA DE LA RESPUESTA QUE ESTÁ LLEGANDO: hasta el último
       párrafo terminado. El párrafo a medio escribir se guarda para el trozo
       siguiente, y por eso el texto aparece bloque a bloque —desvaneciéndose
       hacia dentro— en lugar de letra a letra (David, 18-sep-2026). */
    const vivoVisible = useMemo(() => (vivo === null ? null : recortarABloque(vivo)), [vivo]);
    const partes = useMemo(
        () => [...bloques.map((b) => b.markdown), ...(vivoVisible !== null ? [vivoVisible] : [])],
        [bloques, vivoVisible],
    );
    const { segmentos, orden } = useMemo(() => htmlDeDossier(partes), [partes]);
    const metaDelServidor = useMemo(() => metaDeDossier(partes), [partes]);
    /* LAS CITAS SIN FICHA EN EL MAPA SE PIDEN A `/cita` (26-sep-2026): así la
       ficha [N] de la hoja abre su PDF y el Word lleva su referencia APA,
       también en las respuestas ya guardadas. Con la respuesta aún llegando no
       se pide: el mapa final puede traerlas. Ver `@/lib/documento/fichas`. */
    const faltan = useMemo(() => citasSinFuente(orden, metaDelServidor), [orden, metaDelServidor]);
    const { fichas, estado: estadoFichas } = useFichasDeCitas(faltan, vivo === null);
    const meta = useMemo(() => conFichas(metaDelServidor, fichas), [metaDelServidor, fichas]);
    const cuentaCitas = useMemo(() => resumenDeCitas(orden, meta, estadoFichas), [orden, meta, estadoFichas]);
    const palabras = useMemo(() => palabrasDe(partes.join(' ')), [partes]);
    const enVivo = vivo !== null;
    const htmlBase = useMemo(() => segmentos.slice(0, bloques.length).join('<hr>'), [segmentos, bloques.length]);
    const htmlVivo = enVivo ? (segmentos[bloques.length] ?? '') : null;

    /* LO QUE YA ESTÁ EN LA HOJA. Al montar (o al cambiar de conversación) la
       hoja arranca con todas las respuestas terminadas; cada vez que termina
       una nueva se INSERTA al final, sin tocar lo que el abogado editó. */
    const insertados = useRef(0);
    const claveMontada = useRef<string | null>(null);
    /* LA HOJA VACÍA SE RELLENA SOLA (20-sep-2026).
       ---------------------------------------------------------------------
       Un abogado estuvo cuatro días con un dictamen que no podía abrir. En su
       pantalla el pie contaba 1,880 palabras y 30 citas, y la hoja enseñaba una
       línea: «Estimado abogado». El Word bajaba lo mismo, porque se exporta
       desde el DOM de la hoja. El texto no se había perdido —los 57,706
       caracteres estaban enteros en la base— pero la hoja nunca los recibió.

       El reparto de aquí abajo da por hecho que la hoja ya tiene lo suyo: al
       montar se le pasa `htmlInicial` y después sólo se le AÑADE lo nuevo.
       Cuando ese supuesto falla —por el camino que sea— nadie lo comprueba y no
       hay vuelta atrás: la hoja se queda vacía para siempre y el documento se
       vuelve inalcanzable aunque esté guardado. Medido en el banco de pruebas
       del 20-sep con el mensaje real: las cuatro secuencias de props conocidas
       llenaban la hoja, así que el fallo entra por una quinta que no sabemos
       cuál es. Esto no la busca: la cubre.

       El primer intento (20-sep) sólo miraba si la hoja estaba VACÍA, y por eso
       no sirvió: al día siguiente el mismo fallo la dejó con un trozo —«A
       continuación, presento un análisis jurídico exhaustivo del», cortado a
       mitad de frase— y un trozo no es vacío, así que el guardia ni se enteró.

       LO QUE SE VIGILA AHORA ES OTRA COSA: que la hoja diga lo que el dossier
       dice. Se recuerda EXACTAMENTE el HTML que escribimos nosotros; si el
       dossier ha cambiado y la hoja sigue teniendo palabra por palabra lo que
       dejamos, se reescribe. Da igual por qué se quedó atrás —bloque que creció
       después de darse por terminado, hoja que nunca recibió nada, bandera mal
       apagada—: la comparación no pregunta la causa.

       Y no puede pisarle el trabajo a nadie: en cuanto el abogado toca una
       letra, la hoja deja de coincidir con lo que escribimos y no se vuelve a
       tocar nunca. Sólo se reescribe lo que es nuestro y está desactualizado. */
    const escrito = useRef<string | null>(null);   // el HTML que pusimos nosotros
    useEffect(() => {
        const raiz = hoja.current?.raiz();
        const otraConversacion = claveMontada.current !== clave;
        if (otraConversacion) {
            claveMontada.current = clave;
            insertados.current = bloques.length;
            // La hoja acaba de montarse con `htmlInicial`: eso es lo nuestro.
            escrito.current = raiz ? raiz.innerHTML : null;
            setNombre('');
            setVersionElegida('');
        }

        if (raiz && bloques.length) {
            const deseado = segmentos.slice(0, bloques.length).join('<hr>');
            const intacta = escrito.current === null
                ? !raiz.innerHTML.trim()          // nunca escribimos: sólo si está en blanco
                : raiz.innerHTML === escrito.current;
            if (deseado && deseado !== escrito.current && intacta) {
                hoja.current?.reemplazar(deseado);
                escrito.current = hoja.current?.raiz()?.innerHTML ?? deseado;
                insertados.current = bloques.length;
                return;
            }
        }
        if (otraConversacion) return;

        if (bloques.length > insertados.current) {
            const nuevos = segmentos.slice(insertados.current, bloques.length).join('<hr>');
            hoja.current?.insertar((insertados.current > 0 ? '<hr>' : '') + nuevos, 'final');
            insertados.current = bloques.length;
            escrito.current = hoja.current?.raiz()?.innerHTML ?? null;
        }
    }, [clave, bloques.length, segmentos]);

    const tituloEfectivo = nombre.trim() || titulo || 'Documento de Iurexia';

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

    /* LAS FICHAS [N] ABREN EL VISOR, en la vista previa y en la hoja editable. */
    function clicEnHoja(e: React.MouseEvent<HTMLDivElement>) {
        const ficha = (e.target as HTMLElement).closest<HTMLElement>('.citation-badge');
        if (!ficha?.dataset.docId || !onCita) return;
        e.preventDefault();
        onCita(fuenteDeCita(meta, ficha.dataset.docId));
    }

    /* Volver a una versión: la hoja entera se sustituye por ese dossier. */
    function elegirVersion(id: string) {
        setVersionElegida(id);
        const v = versiones.find((x) => x.id === id);
        if (!v) return;
        hoja.current?.reemplazar(htmlDeDocumento(v.markdown).html.replace(/<p>⟦sep⟧<\/p>/g, '<hr>'));
        mostrarAviso('Versión restaurada en la hoja.');
    }

    /* EL WORD SALE DE LA HOJA VIVA, con cada ficha como nota al pie APA. */
    async function descargarWord() {
        const raiz = hoja.current?.raiz();
        if (!raiz || hoja.current?.vacia()) { mostrarAviso('El documento está vacío.'); return; }
        setExportando(true);
        try {
            const referencias = new Map(orden.map((id) => [id, referenciaAPA(fuenteDeCita(meta, id))]));
            await aWord(raiz, tituloEfectivo, papel, referencias);
        } catch { mostrarAviso('No se pudo generar el Word. Vuelve a intentarlo.'); }
        finally { setExportando(false); }
    }
    function mandarAImprimir() {
        const raiz = hoja.current?.raiz();
        if (!raiz || hoja.current?.vacia()) { mostrarAviso('El documento está vacío.'); return; }
        if (!imprimir(raiz, tituloEfectivo, papel)) mostrarAviso('El navegador bloqueó la ventana de impresión.');
    }

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
            <header className="grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-charcoal-900/10 bg-cream-100 px-2 sm:gap-3 sm:px-4">
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
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder={titulo || 'Documento de Iurexia'}
                        aria-label="Nombre del documento"
                        className="w-full min-w-0 max-w-[420px] truncate rounded-md bg-transparent px-2 py-1 text-center text-[15px] font-medium text-charcoal-900 placeholder:text-charcoal-900/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-charcoal-900/15"
                    />
                    {versiones.length > 0 && (
                        <select
                            value={versionElegida}
                            onChange={(e) => e.target.value && elegirVersion(e.target.value)}
                            aria-label="Versión del documento"
                            className="hidden h-8 max-w-[170px] shrink-0 rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-2 text-[12px] font-medium text-charcoal-900 sm:block"
                        >
                            <option value="">{enVivo ? 'Escribiendo…' : `Versión ${versiones.length} (actual)`}</option>
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
                    <button type="button" onClick={descargarWord} disabled={exportando || enVivo} title="Descargar en Word, con las citas como notas al pie"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40 sm:px-3">
                        {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                        <span className="hidden sm:inline">Word</span>
                    </button>
                </div>
            </header>

            {/* ── LA HOJA: una por conversación; lo nuevo se anexa ────────── */}
            <section className="flex min-h-0 flex-1 flex-col" aria-label="Hoja del documento" onClick={clicEnHoja}>
                <Hoja
                    key={clave}
                    ref={hoja}
                    htmlInicial={htmlBase}
                    onCambio={() => { /* vive en el DOM de la hoja */ }}
                    vistaPrevia={htmlVivo}
                    anexando={bloques.length > 0}
                />
            </section>

            {/* ── EL PIE: qué hay y en qué estado ──────────────────────── */}
            <footer className="flex h-9 shrink-0 items-center gap-3 border-t border-charcoal-900/10 bg-cream-100 px-4 text-[11.5px] text-charcoal-900/65">
                {paso && !palabras ? (
                    /* Aún no hay ni una palabra: se dice qué está pasando en vez
                       de «Escribiendo… 0 palabras», que era mentira y dejaba al
                       abogado mirando una hoja en blanco sin señal de vida. */
                    <><Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" /><span>{paso}</span></>
                ) : enVivo ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" /><span>Escribiendo en el documento…</span></>
                ) : partes.length ? (
                    <><Check className="h-3.5 w-3.5 text-accent-gold" /><span>Listo para editar</span></>
                ) : (
                    <span>La primera respuesta se escribirá aquí.</span>
                )}
                <span className="ml-auto tabular-nums">
                    {palabras ? `${palabras.toLocaleString('es-MX')} palabras` : ''}
                </span>
                <span className="tabular-nums">
                    {orden.length} {orden.length === 1 ? 'cita' : 'citas'}
                    {/* Las citas del texto con ficha, no las entradas del mapa: con
                        el mapa entero salía «33 citas · 60 verificadas». */}
                    {cuentaCitas.verificadas > 0 ? ` · ${cuentaCitas.verificadas} ${cuentaCitas.verificadas === 1 ? 'verificada' : 'verificadas'}` : ''}
                </span>
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
