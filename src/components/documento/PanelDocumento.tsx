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
import { guardarEdicion, leerEdicion, type EdicionHoja } from '@/lib/documento/edicionHoja';
import { markdownDeHoja } from '@/lib/documento/marcado';

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
    /** El bloque al que sustituye: un retoque que entrega el escrito entero
     *  ya corregido va EN LUGAR del anterior (28-sep-2026). */
    reemplaza?: string;
}

export interface VersionDocumento {
    id: string;
    titulo: string;
    /** El dossier entero en ese momento, con SEP_DOSSIER entre respuestas. */
    markdown: string;
    fecha: number;
    /** Los bloques de ese dossier, en orden: al volver a una versión, la hoja
     *  los envuelve como los demás y un retoque posterior los encuentra. */
    ids?: string[];
}

/* ═══ CADA RESPUESTA, EN SU ENVOLTORIO (28-sep-2026) ══════════════════════
   Cada bloque del dossier va en `<div data-bloque="m<índice>">`: así un
   retoque puede ponerse EN LUGAR del escrito que corrige, también en una hoja
   editada, y la pantalla puede leer ese escrito tal como lo dejó el abogado.
   El exportador de Word y la revisión ya recorren los `div` con párrafos
   dentro como si sus hijos estuvieran sueltos. */
export function envolverBloque(id: string, html: string): string {
    return `<div data-bloque="${id.replace(/[^\w-]/g, '')}">${html}</div>`;
}

function bloquesEnLaHoja(raiz: HTMLElement | null | undefined): string[] {
    if (!raiz) return [];
    return Array.from(raiz.querySelectorAll<HTMLElement>('[data-bloque]')).map((e) => e.dataset.bloque || '');
}

/* ═══ EL ESCRITO COMO ESTÁ EN LA HOJA (28-sep-2026) ═══════════════════════
   El chat lo pide al enviar: si el abogado corrigió a mano la última
   respuesta, ésa es la que el modelo debe retocar, no la que escribió. Sólo
   hay una hoja montada en el chat; se registra aquí mientras vive. */
let hojaViva: { clave: () => string | null; raiz: () => HTMLElement | null; editada: () => boolean } | null = null;

/** El markdown del bloque `id` tal como está en la hoja de la conversación
 *  `clave`, o null si la hoja no está editada o el bloque ya no está. */
export function escritoEnLaHoja(clave: string | null | undefined, id: string): string | null {
    const h = hojaViva;
    if (!h || !clave || h.clave() !== clave || !h.editada()) return null;
    const bloque = Array.from(h.raiz()?.querySelectorAll<HTMLElement>('[data-bloque]') ?? []).find((e) => e.dataset.bloque === id);
    if (!bloque) return null;
    const md = markdownDeHoja(bloque).trim();
    return md || null;
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
    /** La respuesta que llega es un retoque que sustituirá al escrito anterior. */
    vivoReemplaza?: boolean;
}

export default function PanelDocumento({ abierto, clave, titulo, bloques, vivo, paso, versiones, onCerrar, onCita, vivoReemplaza = false }: Props) {
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
    /* EL MAPA DEL SERVIDOR CUENTA SÓLO LO CITADO (26-sep-2026): `orden` son
       los identificadores que el texto cita, ya abiertos los grupos. Las
       demás entradas de `sources` —precedentes inyectados, alias de
       reparación y, cuando la API la mande, la tesis que reemplaza a una
       citada— siguen en el mapa para que el visor las abra, pero no se
       cuentan. Ver `metaDeDossier`. */
    const metaDelServidor = useMemo(() => metaDeDossier(partes, orden), [partes, orden]);
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
    /* Los bloques terminados, cada uno en su envoltorio. */
    const htmlDeBloques = (desde: number, hasta: number) => segmentos
        .slice(desde, hasta)
        .map((h, i) => envolverBloque(bloques[desde + i]?.id ?? `b${desde + i}`, h))
        .join('<hr>');
    const htmlBase = useMemo(() => htmlDeBloques(0, bloques.length), [segmentos, bloques]);
    const htmlVivo = enVivo ? (segmentos[bloques.length] ?? '') : null;

    /* LO QUE YA ESTÁ EN LA HOJA. Al montar (o al cambiar de conversación) la
       hoja arranca con todas las respuestas terminadas; cada vez que termina
       una nueva se INSERTA al final, sin tocar lo que el abogado editó. */
    const insertados = useRef(0);
    /* Qué bloques del dossier tiene la hoja, en orden. Lo nuevo es lo que no
       está aquí; un retoque se pone en lugar del bloque que sustituye. */
    const enHoja = useRef<string[]>([]);
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

    /* LO QUE EDITA EL ABOGADO SE QUEDA (27-sep-2026).
       ---------------------------------------------------------------------
       Dos fallos, y los dos le borraban al abogado lo que había escrito.

       1. No se guardaba: `onCambio` no hacía nada y la hoja se vuelve a montar
          al cambiar de conversación o al recargar. Ahora cada edición se
          guarda en este navegador (`@/lib/documento/edicionHoja`) y vuelve al
          abrir la conversación; lo que respondió Iurexia después se anexa
          detrás.

       2. Se reescribía sola. Al anexar una respuesta a una hoja editada,
          `escrito` pasaba a valer la hoja editada; en la siguiente consulta la
          guardia de arriba la veía «intacta» y distinta del dossier, y la
          reescribía con el texto del modelo: las correcciones del abogado se
          iban sin que tocara nada. «Editada» es ahora un estado propio, y una
          hoja editada no la reescribe nadie: sólo se le anexa.

       Lo que escribimos nosotros (rellenar, anexar, restaurar) pasa por
       `escribir`, para que la hoja no lo confunda con una edición. */
    const editada = useRef(false);
    useEffect(() => {
        const registro = {
            clave: () => claveMontada.current,
            raiz: () => hoja.current?.raiz() ?? null,
            editada: () => editada.current,
        };
        hojaViva = registro;
        return () => { if (hojaViva === registro) hojaViva = null; };
    }, []);
    const escribiendo = useRef(false);
    const pendiente = useRef<EdicionHoja | null>(null);
    const [guardadaAqui, setGuardadaAqui] = useState(false);
    const escribir = (accion: () => void) => {
        escribiendo.current = true;
        try { accion(); } finally { escribiendo.current = false; }
    };
    const guardar = (html: string) => {
        if (guardarEdicion(claveMontada.current, html, insertados.current)) setGuardadaAqui(true);
    };
    /* La hoja avisa al teclear (con espera), al perder el foco, al ocultarse
       la pestaña y al desmontarse —también al cambiar de conversación, antes
       de que las referencias pasen a la siguiente—. */
    const alCambiar = (html: string) => {
        if (escribiendo.current) return;
        if (!editada.current && html === escrito.current) return;   // nadie tocó nada
        editada.current = true;
        pendiente.current = null;   // lo que teclea ahora manda sobre lo guardado
        guardar(html);
    };

    useEffect(() => {
        const raiz = hoja.current?.raiz();
        const otraConversacion = claveMontada.current !== clave;
        const ids = (n: number) => bloques.slice(0, n).map((b) => b.id);
        if (otraConversacion) {
            claveMontada.current = clave;
            insertados.current = bloques.length;
            enHoja.current = ids(bloques.length);
            // La hoja acaba de montarse con `htmlInicial`: eso es lo nuestro.
            escrito.current = raiz ? raiz.innerHTML : null;
            editada.current = false;
            pendiente.current = leerEdicion(clave);
            setGuardadaAqui(false);
            setNombre('');
            setVersionElegida('');
        }

        // Lo que el abogado había editado vuelve en cuanto están cargadas las
        // respuestas que contiene.
        const guardada = pendiente.current;
        if (raiz && guardada && !editada.current && bloques.length >= guardada.bloques) {
            pendiente.current = null;
            escribir(() => hoja.current?.reemplazar(guardada.html));
            escrito.current = hoja.current?.raiz()?.innerHTML ?? guardada.html;
            insertados.current = guardada.bloques;
            // Los envoltorios dicen qué bloques trae; una hoja guardada antes
            // de que existieran trae los primeros que contaba.
            const envueltos = bloquesEnLaHoja(hoja.current?.raiz());
            enHoja.current = envueltos.length ? envueltos : ids(guardada.bloques);
            editada.current = true;
            setGuardadaAqui(true);
        }

        // Un retoque que sustituye a un bloque que la hoja tiene.
        const sustituye = (b: BloqueDocumento) => !!b.reemplaza && enHoja.current.includes(b.reemplaza);

        if (raiz && bloques.length && !editada.current) {
            const deseado = htmlDeBloques(0, bloques.length);
            const intacta = escrito.current === null
                ? !raiz.innerHTML.trim()          // nunca escribimos: sólo si está en blanco
                : raiz.innerHTML === escrito.current;
            if (deseado && deseado !== escrito.current && intacta) {
                const retoque = bloques.some((b) => !enHoja.current.includes(b.id) && sustituye(b));
                escribir(() => hoja.current?.reemplazar(deseado));
                escrito.current = hoja.current?.raiz()?.innerHTML ?? deseado;
                insertados.current = bloques.length;
                enHoja.current = ids(bloques.length);
                if (retoque && !otraConversacion) mostrarAviso('La versión corregida sustituyó a la anterior, que sigue en «Versiones».');
                return;
            }
        }
        // Recién montada con `htmlInicial` ya tiene lo suyo; restaurada, le
        // faltan las respuestas posteriores a la edición.
        if (otraConversacion && !editada.current) return;

        /* EN UNA HOJA EDITADA SÓLO SE TOCA LO QUE FALTA. Lo nuevo se anexa
           al final; el retoque va en lugar del bloque que sustituye, y si el
           abogado lo borró o lo fundió con otro, se anexa y se dice. */
        const faltan = bloques.filter((b) => !enHoja.current.includes(b.id));
        if (!faltan.length) return;
        let sustituidos = 0;
        let sinSitio = 0;
        escribir(() => {
            for (const b of faltan) {
                const i = bloques.indexOf(b);
                const html = envolverBloque(b.id, segmentos[i] ?? '');
                if (b.reemplaza && sustituye(b) && hoja.current?.sustituirBloque(b.reemplaza, html)) {
                    enHoja.current = enHoja.current.map((x) => (x === b.reemplaza ? b.id : x));
                    sustituidos++;
                    continue;
                }
                if (b.reemplaza) sinSitio++;
                const conAlgo = !!hoja.current?.raiz()?.textContent?.trim();
                hoja.current?.insertar((conAlgo ? '<hr>' : '') + html, 'final');
                enHoja.current = [...enHoja.current, b.id];
            }
        });
        insertados.current = bloques.length;
        escrito.current = hoja.current?.raiz()?.innerHTML ?? null;
        // Lo nuevo se suma a la versión del abogado, y así se guarda.
        if (editada.current && escrito.current !== null) guardar(escrito.current);
        if (sinSitio) mostrarAviso('No encontré el escrito anterior en la hoja: la versión corregida va al final.');
        else if (sustituidos) mostrarAviso('La versión corregida sustituyó a la anterior, con tus cambios. La anterior sigue en «Versiones».');
    }, [clave, bloques, segmentos]);

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

    /* Volver a una versión: la hoja entera se sustituye por ese dossier. Es
       decisión del abogado, así que cuenta como su edición y se guarda. */
    function elegirVersion(id: string) {
        setVersionElegida(id);
        const v = versiones.find((x) => x.id === id);
        if (!v) return;
        const trozos = htmlDeDocumento(v.markdown).html.split(/<p>⟦sep⟧<\/p>/);
        // Con sus bloques envueltos, un retoque posterior encuentra el suyo.
        const html = v.ids && v.ids.length === trozos.length
            ? trozos.map((t, i) => envolverBloque(v.ids![i], t)).join('<hr>')
            : trozos.join('<hr>');
        escribir(() => hoja.current?.reemplazar(html));
        escrito.current = hoja.current?.raiz()?.innerHTML ?? html;
        editada.current = true;
        pendiente.current = null;
        enHoja.current = bloquesEnLaHoja(hoja.current?.raiz());
        guardar(escrito.current);
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
                    onCambio={alCambiar}
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
                    <><Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" /><span className="min-w-0 truncate">{vivoReemplaza
                        ? 'Escribiendo la versión corregida: sustituirá a la anterior al terminar…'
                        : 'Escribiendo en el documento…'}</span></>
                ) : partes.length ? (
                    /* Se dice DÓNDE se guarda: en este navegador, no en la cuenta. */
                    <><Check className="h-3.5 w-3.5 text-accent-gold" /><span className="min-w-0 truncate">{guardadaAqui ? 'Cambios guardados en este navegador' : 'Listo para editar'}</span></>
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
