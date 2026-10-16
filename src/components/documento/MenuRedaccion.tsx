'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as EventoTecla, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle, ArrowUp, BookOpenText, Check, Copy, Lightbulb, Loader2, RotateCcw, Scale, Scissors,
    SpellCheck, Undo2, Wand2, X, type LucideIcon,
} from 'lucide-react';
import { ATRIBUTO_CAMBIO } from '@/lib/documento/cambios';
import { cabecerasConSesion } from '@/lib/cliente/sesion';
import {
    construirAceptado, construirPendiente, contextoDe, desplazable, planoDe, prepararRango,
    rangoEnVivo, resolverHuerfano, textoConMarcadores, tocaCambio, type Plano,
} from '@/lib/redaccion/dom';
import { depurarMarcadores, numerosEn, palabrasDe, reinsertarMarcadores, revisarMarcadores, unicos } from '@/lib/redaccion/marcadores';
import { LIMITES_REDACCION, ROTULO_OPCION, type OpcionRedaccion } from '@/lib/redaccion/opciones';

/**
 * «CAMBIAR REDACCIÓN» SOBRE LA SELECCIÓN (16-oct-2026).
 *
 * David: «Seleccionamos el texto y que se despliegue un botón que diga cambiar
 * redacción; al clicar, con un prompt, que se cambie». Como en Bufete.ai: se
 * selecciona, se escribe la instrucción («Fija la penalidad en dos meses de
 * renta») o se elige Aclarar · Acortar · Más formal · Ortografía, o Explicar; la
 * propuesta aparece EN LA HOJA como cambio marcado —lo original tachado, lo
 * nuevo subrayado— y se acepta o se rechaza. Tú revisas, tú firmas.
 *
 * LAS PIEZAS, todas en un portal a `document.body` (los ancestros de la hoja
 * llevan `backdrop-filter`, y un contexto de apilamiento así se come las capas;
 * ver la memoria de `Calendario.tsx`):
 *   · LA PASTILLA «Cambiar redacción», encima de la selección (debajo si no
 *     cabe). En táctil, abajo de la pantalla: encima están el menú del sistema y
 *     los tiradores de la selección. Ctrl/⌘+K hace lo mismo.
 *   · EL MENÚ: «¿Cómo lo cambio?», las opciones rápidas y «Explicar este
 *     texto» (la explicación se lee aquí; no entra al documento).
 *   · LA BARRA DEL CAMBIO: Aceptar · Rechazar · Otra versión, debajo del
 *     último renglón propuesto. Esc rechaza.
 *   · «CAMBIO APLICADO · DESHACER», unos segundos tras aceptar.
 *
 * EL CAMBIO EN LA HOJA lo arma `@/lib/redaccion/dom` (el porqué de su forma
 * está allí): los nodos originales salen intactos y se guardan en un Map por
 * identificador, y su sitio lo ocupa una envoltura `data-cambio`. Rechazar
 * devuelve esos mismos nodos: el HTML queda exactamente como estaba. Mientras
 * haya una envoltura, el Word, la impresión y el correo no salen
 * (`@/lib/documento/cambios`).
 *
 * UN CAMBIO A LA VEZ. Si hay uno sin resolver, el menú lo dice y lleva a él.
 *
 * EL DESHACER. Ctrl/⌘+Z con un cambio pendiente lo rechaza; justo después de
 * aceptar, lo deshace. Igual el botón «Deshacer» de la barra de Word. Así el
 * deshacer del navegador nunca trabaja sobre nodos que este menú sacó de la hoja.
 */

export interface MenuRedaccionProps {
    /** El nodo editable de la hoja (el `contentEditable`). */
    hoja: RefObject<HTMLDivElement | null>;
    /** Avisa a la hoja de que su contenido cambió (guardado con espera). */
    onCambio: () => void;
}

/* ─── Lo que se dice ─────────────────────────────────────────────────────── */

const MENSAJE_RED = 'No hay conexión con Iurexia. Revisa tu red y vuelve a intentarlo.';
const NO_RESPONDE = 'El servicio de redacción no responde. Vuelve a intentarlo en un momento.';
const TEXTO_MOVIDO = 'El texto seleccionado cambió mientras se preparaba la propuesta. Selecciónalo de nuevo.';
const RESALTE = 'redaccion-objetivo';
/** Lo que dura a la vista el «Deshacer» tras aceptar. Ctrl/⌘+Z sigue valiendo hasta la siguiente edición. */
const DESHACER_MS = 9000;

const OPCIONES: { id: OpcionRedaccion; icono: LucideIcon }[] = [
    { id: 'aclarar', icono: Lightbulb },
    { id: 'acortar', icono: Scissors },
    { id: 'formal', icono: Scale },
    { id: 'ortografia', icono: SpellCheck },
];

/* ─── Tipos ──────────────────────────────────────────────────────────────── */

/** Lo que se le pide al modelo: una opción rápida o la instrucción escrita. */
type Encargo = { opcion: OpcionRedaccion; instruccion?: undefined } | { instruccion: string; opcion?: undefined };

/** La selección tal como se mandó: con ella se comprueba, al volver, que nadie la tocó. */
interface Captura {
    rango: Range;
    texto: string;
    fichas: Element[];
    antes: string;
    despues: string;
}

interface EstadoPastilla { largo: number; demasiado: boolean }

interface EstadoMenu {
    captura: Captura;
    cargando: 'reescribir' | 'explicar' | null;
    /** Qué botón está trabajando, para su rueda. */
    enCurso: OpcionRedaccion | 'instruccion' | 'explicar' | null;
    error: string | null;
    explicacion: string | null;
    /** Ya hay un cambio sin resolver en la hoja. */
    bloqueado: boolean;
}

interface EstadoCambio {
    id: string;
    etiqueta: string;
    cargando: boolean;
    error: string | null;
    aviso: string | null;
}

/** Lo que vive fuera de React mientras el cambio está pendiente. */
interface Entrada {
    id: string;
    plano: Plano;
    envoltura: HTMLElement;
    captura: { texto: string; antes: string; despues: string };
    encargo: Encargo;
    propuesta: string;
    etiqueta: string;
}

interface Punto { x: number; y: number }
interface Marco {
    /** La hoja se ve (su panel no está recogido ni tapado por la vista previa). */
    visible: boolean;
    /** Teléfono o táctil: lo flotante va abajo, a lo ancho, con dedos grandes. */
    abajo: boolean;
    pastilla: Punto | null;
    menu: (Punto & { ancho: number }) | null;
    barra: (Punto & { ancho?: number; maximo?: number }) | null;
    /** El cambio pendiente quedó fuera de la vista: «Ver el cambio». */
    lejos: Punto | null;
    deshacer: Punto | null;
}
const MARCO_VACIO: Marco = { visible: false, abajo: false, pastilla: null, menu: null, barra: null, lejos: null, deshacer: null };

interface Caja { left: number; top: number; right: number; bottom: number }

/* ─── Ayudantes ──────────────────────────────────────────────────────────── */

const nuevoId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const recortar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
const entre = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** «[2] y [5]»: los números que el abogado ve en sus fichas, no los del marcador. */
function citasVisibles(numeros: number[], fichas: Element[]): string {
    const rotulos = numeros.map((n) => (fichas[n - 1]?.textContent || '').trim() || 'una cita');
    if (rotulos.length <= 1) return rotulos[0] || '';
    return `${rotulos.slice(0, -1).join(', ')} y ${rotulos[rotulos.length - 1]}`;
}

function avisoDeCitas(reinsertadas: number[], fichas: Element[]): string | null {
    if (!reinsertadas.length) return null;
    const uno = reinsertadas.length === 1;
    return `La propuesta perdía ${uno ? 'la cita' : 'las citas'} ${citasVisibles(reinsertadas, fichas)}: ${uno ? 'se reinsertó' : 'se reinsertaron'} al final de su párrafo. Revisa que ${uno ? 'quede' : 'queden'} junto a la idea que respalda${uno ? '' : 'n'}.`;
}

/** En la explicación, ⟦1⟧ se lee como la ficha que es: «[3]». */
function conNumerosVisibles(texto: string, fichas: Element[]): string {
    return texto.replace(/⟦(\d{1,3})⟧/g, (_, n: string) => (fichas[Number(n) - 1]?.textContent || '').trim() || '[cita]');
}

/** Lo que el modelo devolvió, con sus citas aseguradas también aquí (la ruta ya lo hizo; esto no se fía). */
function asegurarCitas(original: string, bruta: string, delServidor: number[]): { propuesta: string; reinsertadas: number[] } {
    const esperados = unicos(numerosEn(original));
    let propuesta = depurarMarcadores(bruta, esperados);
    const faltan = revisarMarcadores(original, propuesta).faltan;
    if (faltan.length) propuesta = reinsertarMarcadores(propuesta, original, faltan);
    return { propuesta, reinsertadas: unicos(delServidor.concat(faltan)).filter((n) => esperados.indexOf(n) !== -1) };
}

/** El resalte de la selección mientras el menú tiene el foco: la selección del
 *  navegador se va al campo de texto, y sin esto no se vería qué se cambia. */
function resaltar(r: Range | null): void {
    const registro = (globalThis as unknown as { CSS?: { highlights?: { set: (n: string, h: unknown) => void; delete: (n: string) => void } } }).CSS?.highlights;
    const Resalte = (globalThis as unknown as { Highlight?: new (...rangos: Range[]) => unknown }).Highlight;
    if (!registro || !Resalte) return;
    try {
        if (r) registro.set(RESALTE, new Resalte(r));
        else registro.delete(RESALTE);
    } catch { /* navegador sin resaltes: el menú sigue funcionando */ }
}

function vistaVisual(): Caja {
    const vv = window.visualViewport;
    const left = vv ? vv.offsetLeft : 0;
    const top = vv ? vv.offsetTop : 0;
    return { left, top, right: left + (vv ? vv.width : window.innerWidth), bottom: top + (vv ? vv.height : window.innerHeight) };
}

function interseccion(a: Caja, b: DOMRect | null): Caja {
    if (!b) return a;
    return { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) };
}

function hojaVisible(raiz: HTMLElement): boolean {
    return raiz.isConnected && raiz.getClientRects().length > 0 && getComputedStyle(raiz).visibility !== 'hidden';
}

/** Los renglones de un rango (sus cajas con tamaño), en orden. */
function renglonesDe(r: Range): DOMRect[] {
    try {
        return Array.from(r.getClientRects()).filter((c) => c.width > 0.5 && c.height > 0.5);
    } catch {
        return [];
    }
}

/** La franja inferior del iPhone (la del indicador de inicio), una vez. */
let franjaInferior: number | null = null;
function margenSeguro(): number {
    if (franjaInferior !== null) return franjaInferior;
    const sonda = document.createElement('div');
    sonda.style.cssText = 'position:fixed;left:0;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';
    document.body.appendChild(sonda);
    franjaInferior = parseFloat(getComputedStyle(sonda).paddingBottom) || 0;
    sonda.remove();
    return franjaInferior;
}

type Respuesta = { ok: true; datos: Record<string, unknown> } | { ok: false; mensaje: string };

/** Los mensajes del servidor tal cual (el del tope lo redacta `mensajeLimite`); los genéricos, por estado. */
async function pedirAlServidor(cuerpo: Record<string, unknown>, senal: AbortSignal): Promise<Respuesta> {
    let r: Response;
    try {
        r = await fetch('/api/redaccion', { method: 'POST', headers: await cabecerasConSesion(), body: JSON.stringify(cuerpo), signal: senal });
    } catch {
        return { ok: false, mensaje: senal.aborted ? '' : MENSAJE_RED };
    }
    let datos: Record<string, unknown> | null = null;
    try { datos = (await r.json()) as Record<string, unknown>; } catch { /* sin cuerpo */ }
    if (r.ok && datos) return { ok: true, datos };
    const delServidor = typeof datos?.mensaje === 'string' ? datos.mensaje : '';
    if (r.status === 503) return { ok: false, mensaje: NO_RESPONDE };
    if (r.status === 429) return { ok: false, mensaje: delServidor || 'Llegaste al tope de cambios de redacción de hoy.' };
    if (r.status === 401) return { ok: false, mensaje: delServidor || 'Tu sesión terminó. Vuelve a entrar para cambiar la redacción.' };
    return { ok: false, mensaje: delServidor || 'No se pudo preparar la propuesta. Vuelve a intentarlo.' };
}

/** El cursor justo detrás de un nodo, con el foco en la hoja: se sigue escribiendo ahí. */
function cursorTras(nodo: Node | null, raiz: HTMLElement): void {
    try {
        raiz.focus({ preventScroll: true });
        const r = document.createRange();
        if (nodo && raiz.contains(nodo)) r.setStartAfter(nodo);
        else r.selectNodeContents(raiz);
        r.collapse(!!nodo);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
    } catch { /* sin selección no pasa nada: el texto ya está en su sitio */ }
}

/** El cursor al final de lo que estaba seleccionado, ya devuelto a la hoja. */
function cursorAlFinal(plano: Plano, raiz: HTMLElement): void {
    const r = rangoEnVivo(plano, raiz);
    if (!r) return;
    try {
        raiz.focus({ preventScroll: true });
        r.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
    } catch { /* sin selección no pasa nada */ }
}

/** La barra de Word de la misma hoja, para que su «Deshacer» pase por aquí. */
function barraDeFormato(raiz: HTMLElement): HTMLElement | null {
    for (let x = raiz.parentElement, n = 0; x && n < 5; x = x.parentElement, n++) {
        const barra = x.querySelector<HTMLElement>('[role="group"][aria-label="Formato del documento"]');
        if (barra) return barra;
    }
    return null;
}

/** Tab no se escapa de la capa: el diálogo de alrededor no la conoce. */
function encerrarTab(e: EventoTecla<HTMLElement>, nodo: HTMLElement | null): void {
    if (e.key !== 'Tab' || !nodo) return;
    const focos = Array.from(nodo.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), a[href]'));
    e.stopPropagation();
    if (!focos.length) return;
    e.preventDefault();
    const i = focos.indexOf(document.activeElement as HTMLElement);
    const siguiente = e.shiftKey ? (i <= 0 ? focos.length - 1 : i - 1) : (i === -1 || i === focos.length - 1 ? 0 : i + 1);
    focos[siguiente].focus();
}

/** Sin sitio todavía (el primer cuadro), se pinta transparente: así se mide sin verse. */
function lugar(p: Punto | null, extra?: CSSProperties): CSSProperties {
    return p
        ? { left: Math.round(p.x), top: Math.round(p.y), ...extra }
        : { left: 0, top: 0, opacity: 0, pointerEvents: 'none', ...extra };
}

/* ─── El componente ──────────────────────────────────────────────────────── */

export function MenuRedaccion({ hoja, onCambio }: MenuRedaccionProps) {
    const [montado, setMontado] = useState(false);
    const [pastilla, setPastillaEstado] = useState<EstadoPastilla | null>(null);
    const [menu, setMenuEstado] = useState<EstadoMenu | null>(null);
    const [cambio, setCambioEstado] = useState<EstadoCambio | null>(null);
    const [deshacible, setDeshacible] = useState(false);
    const [marco, setMarco] = useState<Marco>(MARCO_VACIO);
    const [instruccion, setInstruccion] = useState('');
    const [anuncio, setAnuncio] = useState('');
    const [copiado, setCopiado] = useState(false);
    const [esMac, setEsMac] = useState(false);

    /* Los oyentes leen el estado por estos espejos: un oyente de `keydown` o del
       MutationObserver no puede esperar a que React vuelva a pintar. */
    const pastillaRef = useRef<EstadoPastilla | null>(null);
    const menuRef = useRef<EstadoMenu | null>(null);
    const cambioRef = useRef<EstadoCambio | null>(null);
    const ponerPastilla = useCallback((v: EstadoPastilla | null) => { pastillaRef.current = v; setPastillaEstado(v); }, []);
    const ponerMenu = useCallback((v: EstadoMenu | null) => { menuRef.current = v; setMenuEstado(v); }, []);
    const ponerCambio = useCallback((v: EstadoCambio | null) => { cambioRef.current = v; setCambioEstado(v); }, []);

    const seleccion = useRef<Range | null>(null);
    const entradas = useRef(new Map<string, Entrada>());
    const aceptado = useRef<{ plano: Plano; nodos: ChildNode[] } | null>(null);
    const control = useRef<AbortController | null>(null);
    const propio = useRef(false);
    const observador = useRef<MutationObserver | null>(null);
    const puntero = useRef<string>('');
    const arrastrando = useRef(false);
    const descartada = useRef(false);
    /** Cuándo se tocó la capa por última vez: en iOS, tocar la pastilla limpia la
     *  selección antes del clic, y eso no debe quitarle la selección que abre. */
    const tocada = useRef(0);
    const lienzo = useRef<HTMLElement | null>(null);
    /** La hoja lleva relleno de más abajo para que el menú quepa (ver «acomodar»). */
    const holgura = useRef(false);
    /** El menú se acaba de abrir: su primer elemento recibe el foco al pintarse. */
    const enfocar = useRef(false);
    const avisar = useRef(onCambio);
    useEffect(() => { avisar.current = onCambio; });

    const capa = useRef<HTMLDivElement | null>(null);
    const refPastilla = useRef<HTMLDivElement | null>(null);
    const refMenu = useRef<HTMLDivElement | null>(null);
    const refBarra = useRef<HTMLDivElement | null>(null);
    const refCampo = useRef<HTMLTextAreaElement | null>(null);
    const idTitulo = useId();
    const idCampo = useId();

    useEffect(() => {
        setMontado(true);
        setEsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    }, []);

    const anunciar = useCallback((t: string) => {
        // Vaciar y volver a poner: así el lector de pantalla repite el mismo aviso.
        setAnuncio('');
        window.setTimeout(() => setAnuncio(t), 30);
    }, []);

    /** Lo que este menú le hace a la hoja no lo vuelve a leer su propio observador. */
    const propias = useCallback((fn: () => void) => {
        propio.current = true;
        try { fn(); } finally {
            observador.current?.takeRecords();
            propio.current = false;
        }
    }, []);

    const retirarDeshacer = useCallback(() => {
        aceptado.current = null;
        setDeshacible(false);
    }, []);

    /* ═══ LAS ENVOLTURAS DE LA HOJA ═══════════════════════════════════════════
       Al montar y en cada cambio del DOM que no sea nuestro: la que es del
       cambio activo se deja; la que volvió (el Ctrl+Z de quien la había
       borrado) se reactiva; la que no tiene dueño —un borrador guardado a medio
       revisar— se resuelve devolviendo el original. Y si la del cambio activo
       desapareció (se borró, o el panel reescribió la hoja), ya no hay cambio. */
    const revisarEnvolturas = useCallback(() => {
        const raiz = hoja.current;
        if (!raiz) return;
        let activo = cambioRef.current;
        if (activo) {
            const e = entradas.current.get(activo.id);
            if (!e || !raiz.contains(e.envoltura)) { ponerCambio(null); activo = null; }
        }
        let resueltas = 0;
        Array.from(raiz.querySelectorAll<HTMLElement>(`[${ATRIBUTO_CAMBIO}]`)).forEach((el) => {
            const id = el.getAttribute(ATRIBUTO_CAMBIO) || '';
            const e = entradas.current.get(id);
            if (activo && activo.id === id && e && e.envoltura === el) return;
            if (e && !activo) {
                e.envoltura = el;
                activo = { id, etiqueta: e.etiqueta, cargando: false, error: null, aviso: null };
                ponerCambio(activo);
                return;
            }
            propias(() => resolverHuerfano(el));
            entradas.current.delete(id);
            resueltas++;
        });
        if (resueltas) avisar.current();
    }, [hoja, ponerCambio, propias]);

    useEffect(() => {
        const raiz = hoja.current;
        if (!raiz) return;
        const mo = new MutationObserver(() => { if (!propio.current) revisarEnvolturas(); });
        observador.current = mo;
        mo.observe(raiz, { childList: true, subtree: true });
        revisarEnvolturas();
        lienzo.current = desplazable(raiz);
        return () => { mo.disconnect(); observador.current = null; };
    }, [hoja, revisarEnvolturas]);

    /* Al desmontar con un cambio pendiente, la hoja vuelve a su texto: nadie lo aceptó. */
    useEffect(() => () => {
        control.current?.abort();
        resaltar(null);
        const c = cambioRef.current;
        const e = c ? entradas.current.get(c.id) : undefined;
        const raiz = hoja.current;
        if (raiz && holgura.current) raiz.style.paddingBottom = '';
        if (e && raiz && raiz.contains(e.envoltura)) {
            observador.current?.disconnect();
            e.envoltura.replaceWith(...e.plano.tops);
        }
    }, [hoja]);

    /* ═══ LA SELECCIÓN → LA PASTILLA ══════════════════════════════════════════ */
    const evaluar = useCallback(() => {
        if (menuRef.current || arrastrando.current) return;
        const raiz = hoja.current;
        const sel = window.getSelection();
        const ocultar = () => {
            // Justo después de tocar la capa no se esconde nada: en iOS, tocar la
            // pastilla limpia la selección antes de que llegue el clic.
            if (Date.now() - tocada.current < 700) return;
            seleccion.current = null;
            if (pastillaRef.current) ponerPastilla(null);
        };
        if (!raiz || !sel || sel.rangeCount === 0 || sel.isCollapsed) return ocultar();
        const r0 = sel.getRangeAt(0);
        if (!raiz.contains(r0.startContainer) || !raiz.contains(r0.endContainer) || descartada.current) return ocultar();
        const r = tocaCambio(r0, raiz) ? null : prepararRango(r0, raiz);
        if (!r) return ocultar();
        const largo = textoConMarcadores(r.cloneContents()).texto.length;
        if (largo < LIMITES_REDACCION.textoMin) return ocultar();
        seleccion.current = r;
        const previa = pastillaRef.current;
        const demasiado = largo > LIMITES_REDACCION.textoMax;
        if (!previa || previa.largo !== largo || previa.demasiado !== demasiado) ponerPastilla({ largo, demasiado });
    }, [hoja, ponerPastilla]);

    useEffect(() => {
        let reloj = 0;
        const programar = () => { window.clearTimeout(reloj); reloj = window.setTimeout(evaluar, 90); };
        const alCambiar = () => { descartada.current = false; programar(); };
        const alApretar = (e: PointerEvent) => {
            puntero.current = e.pointerType || 'mouse';
            const raiz = hoja.current;
            if (e.target instanceof Node && capa.current?.contains(e.target)) { tocada.current = Date.now(); return; }
            if (!raiz || !(e.target instanceof Node) || !raiz.contains(e.target)) return;
            if (e.pointerType === 'mouse' && e.button === 0) arrastrando.current = true;
            if (pastillaRef.current) ponerPastilla(null);
        };
        const alSoltar = () => {
            if (!arrastrando.current) return;
            arrastrando.current = false;
            programar();
        };
        document.addEventListener('selectionchange', alCambiar);
        document.addEventListener('pointerdown', alApretar, true);
        window.addEventListener('pointerup', alSoltar, true);
        window.addEventListener('pointercancel', alSoltar, true);
        return () => {
            window.clearTimeout(reloj);
            document.removeEventListener('selectionchange', alCambiar);
            document.removeEventListener('pointerdown', alApretar, true);
            window.removeEventListener('pointerup', alSoltar, true);
            window.removeEventListener('pointercancel', alSoltar, true);
        };
    }, [evaluar, hoja, ponerPastilla]);

    /* ═══ EL MENÚ ═════════════════════════════════════════════════════════════ */
    const abrir = useCallback(() => {
        const raiz = hoja.current;
        const base = seleccion.current;
        if (!raiz || !base) return;
        const r = prepararRango(base, raiz);
        if (!r || tocaCambio(r, raiz)) { ponerPastilla(null); return; }
        const lectura = textoConMarcadores(r.cloneContents());
        if (lectura.texto.length < LIMITES_REDACCION.textoMin || lectura.texto.length > LIMITES_REDACCION.textoMax) return;
        const { antes, despues } = contextoDe(r, raiz);
        ponerPastilla(null);
        setInstruccion('');
        setCopiado(false);
        enfocar.current = true;
        ponerMenu({
            captura: { rango: r, texto: lectura.texto, fichas: lectura.fichas as unknown as Element[], antes, despues },
            cargando: null, enCurso: null, error: null, explicacion: null, bloqueado: !!cambioRef.current,
        });
        resaltar(r);
    }, [hoja, ponerMenu, ponerPastilla]);

    const cerrarMenu = useCallback((restaurar: boolean) => {
        const m = menuRef.current;
        control.current?.abort();
        control.current = null;
        ponerMenu(null);
        resaltar(null);
        const raiz = hoja.current;
        if (!restaurar || !m || !raiz) return;
        const r = m.captura.rango;
        if (!raiz.contains(r.startContainer) || !raiz.contains(r.endContainer)) return;
        try {
            raiz.focus({ preventScroll: true });
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(r.cloneRange());
        } catch { /* sin selección no pasa nada */ }
    }, [hoja, ponerMenu]);

    /* Si el menú no cabe ni debajo ni encima de la selección, la hoja sube lo
       justo para que quepa debajo sin perder de vista el primer renglón: tapar
       lo que se va a cambiar mientras se escribe cómo cambiarlo no sirve. */
    const acomodar = useCallback(() => {
        const m = menuRef.current;
        const caja = lienzo.current;
        const alto = refMenu.current?.offsetHeight || 0;
        const vista = vistaVisual();
        if (!m || !caja || !alto || puntero.current === 'touch' || vista.right - vista.left < 640) return;
        const renglones = renglonesDe(m.captura.rango);
        if (!renglones.length) return;
        const arriba = renglones[0].top;
        const abajo = renglones[renglones.length - 1].bottom;
        const area = interseccion(vista, caja.getBoundingClientRect());
        const falta = abajo + 10 + alto - (area.bottom - 8);
        if (falta <= 0 || arriba - 10 - alto >= area.top + 8) return;
        const cabe = Math.min(falta, Math.max(0, arriba - (area.top + 16)));
        if (cabe <= 4) return;
        // Al final del documento ya no hay hacia dónde subir: la hoja gana
        // holgura abajo mientras el menú esté abierto. Es relleno de la propia
        // hoja, no contenido: no entra al HTML ni al Word.
        const raiz = hoja.current;
        const queda = caja.scrollHeight - caja.clientHeight - caja.scrollTop;
        if (raiz && cabe > queda) {
            const base = parseFloat(getComputedStyle(raiz).paddingBottom) || 0;
            raiz.style.paddingBottom = `${Math.ceil(base + cabe - queda + 24)}px`;
            holgura.current = true;
        }
        caja.scrollBy({ top: cabe, behavior: 'smooth' });
    }, [hoja]);

    /* LAS PETICIONES DE FOCO —la barra cuando llega la propuesta, «Copiar»
       cuando llega la explicación, «Cancelar» mientras se espera— se cumplen en
       el primer render en que su destino ya está pintado. Un `setTimeout` corría
       antes de que React pintara la barra (y el botón pulsado, deshabilitado
       mientras se espera, ya había soltado el foco): el foco acababa en <body>. */
    const [foco, setFoco] = useState<{ destino: 'barra' | 'menu' | 'espera'; vez: number } | null>(null);
    const pedirFoco = useCallback((destino: 'barra' | 'menu' | 'espera') => setFoco({ destino, vez: Date.now() }), []);
    useEffect(() => {
        if (!foco) return;
        const el = foco.destino === 'barra'
            ? refBarra.current
            : refMenu.current?.querySelector<HTMLElement>(foco.destino === 'espera' ? '[data-foco-espera]' : '[data-foco-inicial]');
        if (!el) return;   // todavía no se pinta: se intenta en el render siguiente
        el.focus({ preventScroll: true });
        setFoco(null);
    });

    /* EL FOCO ENTRA AL MENÚ EN CUANTO SE PINTA: al campo, o a «Ir al cambio».
       Con una referencia de llamada y no con un efecto y un cuadro de
       animación: el menú puede pintarse un render después de abrirse (cuando
       todavía no tenía sitio), y en una pestaña en segundo plano los cuadros se
       congelan; las dos cosas dejaban el foco en la hoja. */
    const montarMenu = useCallback((el: HTMLDivElement | null) => {
        refMenu.current = el;
        if (!el || !enfocar.current) return;
        enfocar.current = false;
        el.querySelector<HTMLElement>('[data-foco-inicial]')?.focus({ preventScroll: true });
        acomodar();
    }, [acomodar]);
    const abierto = menu !== null;

    /* La holgura se va con el menú. */
    useEffect(() => {
        if (abierto || !holgura.current) return;
        holgura.current = false;
        if (hoja.current) hoja.current.style.paddingBottom = '';
    }, [abierto, hoja]);

    /* Un clic fuera cierra el menú (mientras trabaja, no: la propuesta llega igual). */
    useEffect(() => {
        if (!abierto) return;
        const alApretar = (e: PointerEvent) => {
            const m = menuRef.current;
            if (!m || m.cargando) return;
            const t = e.target as Node | null;
            if (t && (refMenu.current?.contains(t) || refPastilla.current?.contains(t))) return;
            cerrarMenu(false);
        };
        document.addEventListener('pointerdown', alApretar, true);
        return () => document.removeEventListener('pointerdown', alApretar, true);
    }, [abierto, cerrarMenu]);

    /** El cambio pendiente, a la vista y con el foco en su barra. */
    const irAlCambio = useCallback(() => {
        const c = cambioRef.current;
        const e = c ? entradas.current.get(c.id) : undefined;
        if (menuRef.current) cerrarMenu(false);
        if (!e) return;
        e.envoltura.scrollIntoView({ block: 'center', behavior: 'smooth' });
        pedirFoco('barra');
    }, [cerrarMenu, pedirFoco]);

    /* ═══ LA PROPUESTA EN LA HOJA ═════════════════════════════════════════════ */
    const aplicarPendiente = useCallback((captura: Captura, bruta: string, encargo: Encargo, delServidor: number[]): string | null => {
        const raiz = hoja.current;
        if (!raiz) return NO_RESPONDE;
        if (cambioRef.current) return 'Primero resuelve el cambio que está pendiente.';
        // La selección tiene que seguir siendo la que se mandó, letra por letra.
        const r = prepararRango(captura.rango, raiz);
        if (!r || tocaCambio(r, raiz)) return TEXTO_MOVIDO;
        const lectura = textoConMarcadores(r.cloneContents());
        if (lectura.texto !== captura.texto) return TEXTO_MOVIDO;
        const { propuesta, reinsertadas } = asegurarCitas(captura.texto, bruta, delServidor);
        if (!propuesta.trim()) return NO_RESPONDE;
        const plano = planoDe(r, raiz, lectura.fichas as unknown as Element[]);
        const id = nuevoId();
        const envoltura = plano ? construirPendiente(plano, propuesta, id) : null;
        if (!plano || !envoltura) return 'No se pudo marcar el cambio en la hoja. Vuelve a seleccionar el texto.';
        propias(() => {
            raiz.insertBefore(envoltura, plano.tops[0]);
            plano.tops.forEach((n) => n.parentNode?.removeChild(n));
        });
        const etiqueta = encargo.opcion ? ROTULO_OPCION[encargo.opcion] : `«${recortar(encargo.instruccion, 46)}»`;
        entradas.current.set(id, {
            id, plano, envoltura, encargo, propuesta, etiqueta,
            captura: { texto: captura.texto, antes: captura.antes, despues: captura.despues },
        });
        retirarDeshacer();
        ponerCambio({ id, etiqueta, cargando: false, error: null, aviso: avisoDeCitas(reinsertadas, plano.fichas) });
        window.getSelection()?.removeAllRanges();
        envoltura.scrollIntoView({ block: 'nearest' });
        anunciar('Propuesta lista. Revisa el cambio marcado y elige aceptar, rechazar u otra versión.');
        pedirFoco('barra');
        return null;
    }, [anunciar, hoja, pedirFoco, ponerCambio, propias, retirarDeshacer]);

    const pedir = useCallback(async (accion: 'reescribir' | 'explicar', encargo: Encargo | null) => {
        const m = menuRef.current;
        if (!m || m.cargando) return;
        if (accion === 'reescribir' && cambioRef.current) { ponerMenu({ ...m, bloqueado: true }); return; }
        control.current?.abort();
        const ctl = new AbortController();
        control.current = ctl;
        const enCurso = accion === 'explicar' ? 'explicar' : encargo?.opcion ?? 'instruccion';
        ponerMenu({ ...m, cargando: accion, enCurso, error: null, explicacion: null });
        // Lo pulsado se deshabilita mientras se espera y soltaría el foco: va a «Cancelar».
        pedirFoco('espera');
        anunciar(accion === 'explicar' ? 'Preparando la explicación…' : 'Redactando la propuesta…');
        const r = await pedirAlServidor({
            accion,
            texto: m.captura.texto,
            contexto_antes: m.captura.antes,
            contexto_despues: m.captura.despues,
            ...(encargo ?? {}),
        }, ctl.signal);
        if (ctl.signal.aborted || control.current !== ctl) return;
        control.current = null;
        const actual = menuRef.current;
        if (!actual || actual.captura !== m.captura) return;
        const fallar = (mensaje: string) => {
            ponerMenu({ ...actual, cargando: null, enCurso: null, error: mensaje });
            pedirFoco('menu');
            anunciar(mensaje);
        };
        if (!r.ok) return fallar(r.mensaje || NO_RESPONDE);
        if (accion === 'explicar') {
            const texto = typeof r.datos.explicacion === 'string' ? r.datos.explicacion.trim() : '';
            if (!texto) return fallar(NO_RESPONDE);
            ponerMenu({ ...actual, cargando: null, enCurso: null, explicacion: conNumerosVisibles(texto, actual.captura.fichas) });
            anunciar('Explicación lista.');
            pedirFoco('menu');
            return;
        }
        const propuesta = typeof r.datos.propuesta === 'string' ? r.datos.propuesta : '';
        const delServidor = Array.isArray(r.datos.reinsertadas)
            ? (r.datos.reinsertadas as unknown[]).map(Number).filter((n) => Number.isFinite(n))
            : [];
        const fallo = encargo ? aplicarPendiente(actual.captura, propuesta, encargo, delServidor) : NO_RESPONDE;
        if (fallo) return fallar(fallo);
        ponerMenu(null);
        resaltar(null);
    }, [anunciar, aplicarPendiente, pedirFoco, ponerMenu]);

    const enviarInstruccion = useCallback(() => {
        const t = instruccion.trim().slice(0, LIMITES_REDACCION.instruccionMax);
        if (t) void pedir('reescribir', { instruccion: t });
    }, [instruccion, pedir]);

    /* ═══ ACEPTAR · RECHAZAR · OTRA VERSIÓN · DESHACER ════════════════════════ */
    const aceptar = useCallback(() => {
        const c = cambioRef.current;
        const raiz = hoja.current;
        const e = c ? entradas.current.get(c.id) : undefined;
        if (!c || !raiz) return;
        if (!e || !raiz.contains(e.envoltura)) { ponerCambio(null); return; }
        control.current?.abort();
        control.current = null;
        const hecho = construirAceptado(e.plano, e.propuesta);
        if (!hecho || !hecho.nodos.length) {
            ponerCambio({ ...c, cargando: false, error: 'No se pudo aplicar el cambio. Recházalo y vuelve a intentarlo.' });
            return;
        }
        propias(() => e.envoltura.replaceWith(...hecho.nodos));
        entradas.current.delete(c.id);
        ponerCambio(null);
        aceptado.current = { plano: e.plano, nodos: hecho.nodos };
        setDeshacible(true);
        cursorTras(hecho.ultimo, raiz);
        avisar.current();
        anunciar('Cambio aplicado.');
    }, [anunciar, hoja, ponerCambio, propias]);

    const rechazar = useCallback(() => {
        const c = cambioRef.current;
        if (!c) return;
        control.current?.abort();
        control.current = null;
        const e = entradas.current.get(c.id);
        const raiz = hoja.current;
        ponerCambio(null);
        entradas.current.delete(c.id);
        if (!e || !raiz || !raiz.contains(e.envoltura)) return;
        // Los MISMOS nodos de antes: el HTML vuelve exactamente a como estaba.
        propias(() => e.envoltura.replaceWith(...e.plano.tops));
        cursorAlFinal(e.plano, raiz);
        avisar.current();
        anunciar('Cambio rechazado: el texto quedó como estaba.');
    }, [anunciar, hoja, ponerCambio, propias]);

    const otraVersion = useCallback(async () => {
        const c = cambioRef.current;
        const e = c ? entradas.current.get(c.id) : undefined;
        if (!c || !e || c.cargando) return;
        control.current?.abort();
        const ctl = new AbortController();
        control.current = ctl;
        ponerCambio({ ...c, cargando: true, error: null });
        anunciar('Preparando otra versión…');
        const r = await pedirAlServidor({
            accion: 'reescribir',
            texto: e.captura.texto,
            contexto_antes: e.captura.antes,
            contexto_despues: e.captura.despues,
            ...e.encargo,
            anterior: e.propuesta,
        }, ctl.signal);
        if (ctl.signal.aborted || control.current !== ctl) return;
        control.current = null;
        const actual = cambioRef.current;
        const raiz = hoja.current;
        if (!actual || actual.id !== c.id || !raiz) return;
        if (!r.ok) {
            ponerCambio({ ...actual, cargando: false, error: r.mensaje || NO_RESPONDE });
            anunciar(r.mensaje || NO_RESPONDE);
            return;
        }
        const bruta = typeof r.datos.propuesta === 'string' ? r.datos.propuesta : '';
        const delServidor = Array.isArray(r.datos.reinsertadas)
            ? (r.datos.reinsertadas as unknown[]).map(Number).filter((n) => Number.isFinite(n))
            : [];
        const { propuesta, reinsertadas } = asegurarCitas(e.captura.texto, bruta, delServidor);
        const nueva = propuesta.trim() ? construirPendiente(e.plano, propuesta, c.id) : null;
        if (!nueva || !raiz.contains(e.envoltura)) {
            ponerCambio({ ...actual, cargando: false, error: NO_RESPONDE });
            return;
        }
        propias(() => e.envoltura.replaceWith(nueva));
        e.envoltura = nueva;
        e.propuesta = propuesta;
        ponerCambio({ ...actual, cargando: false, error: null, aviso: avisoDeCitas(reinsertadas, e.plano.fichas) });
        anunciar('Otra versión lista.');
        pedirFoco('barra');
    }, [anunciar, hoja, pedirFoco, ponerCambio, propias]);

    const deshacerAceptado = useCallback(() => {
        const a = aceptado.current;
        const raiz = hoja.current;
        retirarDeshacer();
        if (!a || !raiz) return;
        if (!a.nodos.length || !a.nodos.every((n) => n.parentNode === raiz)) {
            anunciar('Ya no se puede deshacer: el texto cambió después.');
            return;
        }
        propias(() => {
            a.plano.tops.forEach((n) => raiz.insertBefore(n, a.nodos[0]));
            a.nodos.forEach((n) => n.parentNode?.removeChild(n));
        });
        cursorAlFinal(a.plano, raiz);
        avisar.current();
        anunciar('Se restauró el texto anterior.');
    }, [anunciar, hoja, propias, retirarDeshacer]);

    /* El «Deshacer» se ve unos segundos; Ctrl/⌘+Z vale hasta la siguiente edición. */
    useEffect(() => {
        if (!deshacible) return;
        const reloj = window.setTimeout(() => setDeshacible(false), DESHACER_MS);
        return () => window.clearTimeout(reloj);
    }, [deshacible]);

    /* ═══ EL TECLADO, LA BARRA DE WORD Y EL DESHACER DEL NAVEGADOR ════════════
       En captura y en `window`: el Esc tiene que llegar aquí antes que al
       diálogo del editor, que con Esc se cierra entero. */
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => {
            const raiz = hoja.current;
            if (!raiz || !hojaVisible(raiz)) return;
            const t = e.target instanceof Node ? e.target : null;
            const enHoja = !!t && raiz.contains(t);
            const enCapa = !!t && !!capa.current && capa.current.contains(t);
            const mod = (e.metaKey || e.ctrlKey) && !e.altKey;
            const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (e.key === 'Escape') {
                if (menuRef.current) { e.preventDefault(); e.stopPropagation(); cerrarMenu(true); return; }
                if (cambioRef.current && (enHoja || enCapa)) { e.preventDefault(); e.stopPropagation(); rechazar(); return; }
                if (pastillaRef.current && enHoja) { e.preventDefault(); e.stopPropagation(); descartada.current = true; ponerPastilla(null); }
                return;
            }
            if (!(enHoja || enCapa)) return;
            if (mod && tecla === 'k') {
                e.preventDefault();
                e.stopPropagation();
                if (menuRef.current) { refCampo.current?.focus(); return; }
                evaluar();
                if (seleccion.current && pastillaRef.current && !pastillaRef.current.demasiado) abrir();
                return;
            }
            if (mod && e.key === 'Enter' && cambioRef.current && !cambioRef.current.cargando) {
                e.preventDefault(); e.stopPropagation(); aceptar(); return;
            }
            if (mod && enHoja && (tecla === 'z' || tecla === 'y')) {
                const deshacer = tecla === 'z' && !e.shiftKey;
                if (cambioRef.current) { e.preventDefault(); e.stopPropagation(); if (deshacer) rechazar(); return; }
                if (deshacer && aceptado.current) { e.preventDefault(); e.stopPropagation(); deshacerAceptado(); }
            }
        };
        window.addEventListener('keydown', alTeclear, true);
        return () => window.removeEventListener('keydown', alTeclear, true);
    }, [abrir, aceptar, cerrarMenu, deshacerAceptado, evaluar, hoja, ponerPastilla, rechazar]);

    useEffect(() => {
        const raiz = hoja.current;
        if (!raiz) return;
        // El deshacer que llega por el menú Edición o el clic derecho.
        const antesDeEscribir = (e: InputEvent) => {
            if (e.inputType !== 'historyUndo' && e.inputType !== 'historyRedo') return;
            if (cambioRef.current) { e.preventDefault(); if (e.inputType === 'historyUndo') rechazar(); }
            else if (e.inputType === 'historyUndo' && aceptado.current) { e.preventDefault(); deshacerAceptado(); }
        };
        // Cualquier edición después de aceptar: el deshacer vuelve a ser el del navegador.
        const alEscribir = () => { if (aceptado.current) retirarDeshacer(); };
        // El «Deshacer» de la barra de Word con un cambio pendiente es rechazarlo.
        const barra = barraDeFormato(raiz);
        const alPulsar = (e: MouseEvent) => {
            const boton = (e.target as Element | null)?.closest?.('button[aria-label]');
            const rotulo = boton?.getAttribute('aria-label');
            if (rotulo !== 'Deshacer' && rotulo !== 'Rehacer') return;
            if (cambioRef.current) { e.preventDefault(); e.stopPropagation(); if (rotulo === 'Deshacer') rechazar(); }
            else if (rotulo === 'Deshacer' && aceptado.current) { e.preventDefault(); e.stopPropagation(); deshacerAceptado(); }
        };
        raiz.addEventListener('beforeinput', antesDeEscribir);
        raiz.addEventListener('input', alEscribir);
        barra?.addEventListener('click', alPulsar, true);
        return () => {
            raiz.removeEventListener('beforeinput', antesDeEscribir);
            raiz.removeEventListener('input', alEscribir);
            barra?.removeEventListener('click', alPulsar, true);
        };
    }, [deshacerAceptado, hoja, rechazar, retirarDeshacer]);

    /* ═══ DÓNDE SE PINTA CADA COSA, cuadro a cuadro ═══════════════════════════
       Mientras haya algo a la vista: la hoja se desplaza, la ventana cambia, el
       teclado del teléfono sube, la propuesta llega y crece. Con la hoja oculta
       (el panel recogido) se mira dos veces por segundo, no sesenta. */
    const medir = useCallback((): Marco => {
        const raiz = hoja.current;
        if (!raiz || !hojaVisible(raiz)) return MARCO_VACIO;
        const vista = vistaVisual();
        const area = interseccion(vista, lienzo.current?.getBoundingClientRect() ?? null);
        const ancho = vista.right - vista.left;
        const abajo = puntero.current === 'touch' || ancho < 640;
        // Lo que va abajo se apoya en el borde inferior de la hoja (encima del pie
        // del panel, que no se tapa) y nunca bajo la franja del iPhone.
        const franja = vista.bottom >= window.innerHeight - 1 ? margenSeguro() : 0;
        const piso = Math.min(area.bottom, vista.bottom - franja) - 12;
        const m: Marco = { ...MARCO_VACIO, visible: true, abajo };

        const r = seleccion.current;
        if (pastillaRef.current && !menuRef.current && r) {
            const renglones = renglonesDe(r);
            const caja = renglones.length ? r.getBoundingClientRect() : null;
            if (caja && caja.bottom > area.top + 2 && caja.top < area.bottom - 2) {
                const w = refPastilla.current?.offsetWidth || 170;
                const h = refPastilla.current?.offsetHeight || 36;
                if (abajo) {
                    m.pastilla = { x: (vista.left + vista.right - w) / 2, y: piso - h };
                } else {
                    const primero = renglones[0];
                    const ultimo = renglones[renglones.length - 1];
                    let y = primero.top - 10 - h;
                    if (y < area.top + 6) y = ultimo.bottom + 10;
                    y = entre(y, area.top + 6, area.bottom - 6 - h);
                    m.pastilla = { x: entre((primero.left + primero.right - w) / 2, area.left + 8, area.right - 8 - w), y };
                }
            }
        }

        const menuActual = menuRef.current;
        if (menuActual) {
            const h = refMenu.current?.offsetHeight || 320;
            if (abajo) {
                m.menu = { x: vista.left + 12, y: Math.max(vista.top + 12, piso - h), ancho: ancho - 24 };
            } else {
                const w = Math.min(432, ancho - 24);
                const renglones = renglonesDe(menuActual.captura.rango);
                const primero = renglones[0];
                const ultimo = renglones[renglones.length - 1];
                const cabe = area.right - area.left >= w + 16;
                const izq = cabe ? area.left + 8 : vista.left + 12;
                const der = cabe ? area.right - 8 : vista.right - 12;
                if (primero && ultimo) {
                    // Debajo si cabe en la hoja; si no, encima, también dentro de la
                    // hoja (encima no tapa la cabecera del panel con sus botones); y
                    // si tampoco, debajo hasta el borde de la ventana: al abrirse,
                    // la hoja ya subió lo posible (ver `acomodar`).
                    let y = ultimo.bottom + 10;
                    if (y + h > area.bottom - 8) {
                        const arriba = primero.top - 10 - h;
                        y = arriba >= area.top + 8 ? arriba : Math.max(area.top + 8, Math.min(y, vista.bottom - 8 - h));
                    }
                    m.menu = { x: entre(ultimo.left, izq, der - w), y, ancho: w };
                } else {
                    m.menu = { x: (area.left + area.right - w) / 2, y: area.top + 24, ancho: w };
                }
            }
        }

        const c = cambioRef.current;
        const e = c ? entradas.current.get(c.id) : undefined;
        if (c && e && raiz.contains(e.envoltura)) {
            const caja = e.envoltura.getBoundingClientRect();
            const fuera = caja.bottom < area.top + 8 || caja.top > area.bottom - 8;
            const h = refBarra.current?.offsetHeight || 44;
            /* EL HUECO DE LA BARRA CRECE CON ELLA. El CSS reserva 52 px; con un
               aviso o un error la barra tiene dos o tres renglones y, sin esto,
               taparía lo último de la propuesta. Sólo se escribe cuando cambia,
               y la envoltura se va de la hoja al resolverse el cambio. */
            if (refBarra.current) {
                const hueco = abajo ? 0 : Math.ceil(h + 12);
                const puesto = parseFloat(e.envoltura.style.paddingBottom) || 0;
                if (hueco > 52 ? Math.abs(puesto - hueco) > 1 : puesto > 0) {
                    e.envoltura.style.paddingBottom = hueco > 52 ? `${hueco}px` : '';
                }
            }
            if (abajo) {
                m.barra = { x: vista.left + 12, y: piso - h, ancho: ancho - 24 };
                if (fuera) m.lejos = { x: 0, y: 0 };
            } else if (fuera) {
                m.lejos = { x: (area.left + area.right) / 2, y: area.bottom - 56 };
            } else {
                // En el hueco de abajo de la envoltura, alineada con la columna del
                // texto y nunca más ancha que ella.
                const w = Math.min(refBarra.current?.offsetWidth || 340, caja.width);
                const y = entre(caja.bottom - h - 6, area.top + 8, area.bottom - 8 - h);
                m.barra = { x: entre(caja.left, area.left + 8, area.right - 8 - w), y, maximo: Math.floor(Math.min(560, caja.width)) };
            }
        }

        if (aceptado.current && !c) m.deshacer = { x: (area.left + area.right) / 2, y: area.bottom - 56 };
        return m;
    }, [hoja]);

    const activo = !!(pastilla || menu || cambio || deshacible);
    useEffect(() => {
        if (!activo) { setMarco(MARCO_VACIO); return; }
        let cuadro = 0;
        let reloj = 0;
        let previo = '';
        const mirar = () => {
            const m = medir();
            const clave = JSON.stringify(m);
            if (clave !== previo) { previo = clave; setMarco(m); }
            if (m.visible) cuadro = window.requestAnimationFrame(mirar);
            else reloj = window.setTimeout(mirar, 500);
        };
        mirar();
        return () => { window.cancelAnimationFrame(cuadro); window.clearTimeout(reloj); };
    }, [activo, medir, pastilla, menu, cambio, deshacible]);

    if (!montado) return null;

    /* ═══ LO QUE SE PINTA ═════════════════════════════════════════════════════ */
    const visible = marco.visible;
    const abajo = marco.abajo;
    const atajo = esMac ? '⌘K' : 'Ctrl+K';
    const aceptarAtajo = esMac ? '⌘↩' : 'Ctrl+Enter';
    const citas = menu ? numerosEn(menu.captura.texto).length : 0;
    const palabras = menu ? palabrasDe(menu.captura.texto) : 0;
    // Con la barra abajo (teléfono), si el cambio quedó fuera de la vista, la barra lleva a él.
    const barraLejos = abajo && !!marco.lejos;

    return createPortal(
        <div
            ref={capa}
            className="redaccion-capa"
            // Los clics y las teclas de aquí no son de la hoja ni del diálogo de alrededor.
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            {/* ── LA PASTILLA ───────────────────────────────────────────── */}
            {pastilla && visible && !menu && (
                <div ref={refPastilla} className="fixed z-[95] transition-opacity duration-150" style={lugar(marco.pastilla)}>
                    {pastilla.demasiado ? (
                        <div role="status" className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-charcoal-900/10 bg-white px-3.5 text-[12.5px] text-charcoal-900/75 shadow-[0_10px_30px_-12px_rgba(20,18,16,0.45)]">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-brown" aria-hidden="true" />
                            Selección muy larga: hasta {LIMITES_REDACCION.textoMax.toLocaleString('es-MX')} caracteres
                        </div>
                    ) : (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={abrir}
                            aria-label="Cambiar redacción del texto seleccionado"
                            aria-keyshortcuts="Control+K Meta+K"
                            title={`Cambiar redacción (${atajo})`}
                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-charcoal-900 font-medium text-white shadow-[0_12px_32px_-10px_rgba(20,18,16,0.6)] ring-1 ring-black/5 transition-[background-color,transform] hover:bg-charcoal-800 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold ${abajo ? 'h-11 px-5 text-[14px]' : 'h-9 pl-3 pr-3.5 text-[13px]'}`}
                        >
                            <Wand2 className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" />
                            Cambiar redacción
                        </button>
                    )}
                </div>
            )}

            {/* ── EL MENÚ ───────────────────────────────────────────────── */}
            {menu && visible && (
                <div
                    ref={montarMenu}
                    role="dialog"
                    aria-modal="false"
                    aria-label="Cambiar redacción"
                    aria-busy={menu.cargando ? true : undefined}
                    onKeyDown={(e) => encerrarTab(e, refMenu.current)}
                    className="fixed z-[95] flex max-h-[min(560px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl border border-charcoal-900/10 bg-white text-charcoal-900 shadow-[0_28px_70px_-24px_rgba(20,18,16,0.5),0_2px_6px_rgba(20,18,16,0.06)] transition-opacity duration-150"
                    style={lugar(marco.menu, { width: marco.menu?.ancho ?? 432 })}
                >
                    {/* La franja de arriba trabaja mientras se espera: nada salta de sitio. */}
                    <div className="relative h-[3px] shrink-0 overflow-hidden" aria-hidden="true">
                        {menu.cargando && <div className="absolute inset-y-0 left-0 w-1/3 animate-[redaccion-barrido_1.1s_ease-in-out_infinite] rounded-full bg-accent-gold" />}
                    </div>
                    <div className="flex items-center gap-2 px-4 pb-2 pt-2.5">
                        <Wand2 className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" />
                        <h2 id={idTitulo} className="min-w-0 flex-1 truncate font-sans text-[13.5px] font-semibold tracking-normal text-charcoal-900">
                            {menu.bloqueado ? 'Hay un cambio sin resolver' : menu.explicacion ? 'Qué dice este texto' : '¿Cómo lo cambio?'}
                        </h2>
                        <button type="button" onClick={() => cerrarMenu(true)} aria-label="Cerrar"
                            className="-mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-charcoal-900/55 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    {menu.bloqueado ? (
                        <div className="px-4 pb-4">
                            <p className="text-[13px] leading-relaxed text-charcoal-900/75">
                                Acepta o rechaza el cambio de redacción que está pendiente antes de pedir otro.
                            </p>
                            <button type="button" data-foco-inicial onClick={irAlCambio}
                                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-charcoal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold">
                                Ir al cambio
                            </button>
                        </div>
                    ) : menu.explicacion ? (
                        <div className="flex min-h-0 flex-col px-4 pb-3">
                            <p className="min-h-0 overflow-y-auto whitespace-pre-line rounded-xl bg-cream-100 px-3.5 py-3 text-[13.5px] leading-relaxed text-charcoal-900">
                                {menu.explicacion}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <button type="button" data-foco-inicial
                                    onClick={() => {
                                        const texto = menu.explicacion ?? '';
                                        const listo = () => {
                                            setCopiado(true);
                                            anunciar('Explicación copiada.');
                                            window.setTimeout(() => setCopiado(false), 1600);
                                        };
                                        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texto).then(listo, () => anunciar('No se pudo copiar.'));
                                        else anunciar('No se pudo copiar.');
                                    }}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-charcoal-900/15 bg-white px-3 text-[12.5px] font-medium text-charcoal-900 transition-colors hover:border-charcoal-900/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                                    {copiado ? <Check className="h-3.5 w-3.5 text-accent-gold" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                                    {copiado ? 'Copiado' : 'Copiar'}
                                </button>
                                <button type="button"
                                    onClick={() => {
                                        ponerMenu({ ...menu, explicacion: null, error: null });
                                        pedirFoco('menu');
                                    }}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Cambiar la redacción
                                </button>
                            </div>
                            <p className="mt-2 text-[11.5px] text-charcoal-900/55">La explicación no entra al documento.</p>
                        </div>
                    ) : (
                        <>
                            <form className="px-4" onSubmit={(e) => { e.preventDefault(); enviarInstruccion(); }}>
                                <label htmlFor={idCampo} className="sr-only">¿Cómo lo cambio?</label>
                                <div className="relative">
                                    <textarea
                                        id={idCampo}
                                        ref={refCampo}
                                        data-foco-inicial
                                        rows={abajo ? 2 : 1}
                                        value={instruccion}
                                        maxLength={LIMITES_REDACCION.instruccionMax}
                                        disabled={!!menu.cargando}
                                        placeholder="Ej.: fija la penalidad en dos meses de renta"
                                        onChange={(e) => {
                                            setInstruccion(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                enviarInstruccion();
                                            }
                                        }}
                                        className="block min-h-[42px] w-full resize-none rounded-xl border border-charcoal-900/15 bg-cream-50 py-2.5 pl-3 pr-11 text-base leading-snug text-charcoal-900 placeholder:text-charcoal-900/45 transition-colors focus:border-accent-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-gold/25 disabled:opacity-60 [@media(pointer:fine)]:text-[13px]"
                                    />
                                    <button type="submit" aria-label="Cambiar con esta instrucción" disabled={!instruccion.trim() || !!menu.cargando}
                                        className="absolute bottom-[5px] right-[5px] grid h-8 w-8 place-items-center rounded-lg bg-charcoal-900 text-white transition-colors hover:bg-charcoal-800 disabled:bg-charcoal-900/15 disabled:text-charcoal-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold">
                                        {menu.enCurso === 'instruccion' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
                                    </button>
                                </div>
                            </form>

                            <div className="min-h-0 overflow-y-auto px-4 pb-1 pt-3">
                                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-charcoal-900/50">Mejorar</p>
                                {/* Las cuatro con la misma altura (`auto-rows-fr`): si en un
                                    teléfono un rótulo se parte en dos renglones, crecen todas. */}
                                <div className="grid auto-rows-fr grid-cols-2 gap-1.5">
                                    {OPCIONES.map(({ id, icono: Icono }) => (
                                        <button key={id} type="button" disabled={!!menu.cargando}
                                            onClick={() => void pedir('reescribir', { opcion: id })}
                                            className="inline-flex min-h-[36px] min-w-0 items-center gap-2 rounded-lg border border-charcoal-900/10 bg-cream-50 px-2.5 py-1.5 text-left text-[12.5px] font-medium leading-tight text-charcoal-900 transition-colors hover:border-accent-gold/60 hover:bg-cream-100 disabled:cursor-default disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                                            {menu.enCurso === id
                                                ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-brown" aria-hidden="true" />
                                                : <Icono className="h-3.5 w-3.5 shrink-0 text-accent-brown" aria-hidden="true" />}
                                            <span className="min-w-0">{ROTULO_OPCION[id]}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="mb-1.5 mt-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-charcoal-900/50">Entender</p>
                                <button type="button" disabled={!!menu.cargando} onClick={() => void pedir('explicar', null)}
                                    className="inline-flex h-9 w-full items-center gap-2 rounded-lg border border-charcoal-900/10 bg-cream-50 px-2.5 text-left text-[12.5px] font-medium text-charcoal-900 transition-colors hover:border-accent-gold/60 hover:bg-cream-100 disabled:cursor-default disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                                    {menu.enCurso === 'explicar'
                                        ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-brown" aria-hidden="true" />
                                        : <BookOpenText className="h-3.5 w-3.5 shrink-0 text-accent-brown" aria-hidden="true" />}
                                    Explicar este texto
                                </button>
                            </div>

                            {/* El pie, siempre a la misma altura: qué se va a cambiar, qué
                                está pasando o qué falló. Así nada salta de sitio. */}
                            <div className="mt-2 flex min-h-[44px] items-center gap-2 border-t border-charcoal-900/[0.07] bg-cream-50/70 px-4 py-2 text-[12px]">
                                {menu.cargando ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-brown" aria-hidden="true" />
                                        <span className="min-w-0 flex-1 text-charcoal-900/75">
                                            {menu.cargando === 'explicar' ? 'Preparando la explicación…' : 'Redactando la propuesta…'}
                                        </span>
                                        <button type="button" data-foco-espera
                                            onClick={() => {
                                                control.current?.abort();
                                                control.current = null;
                                                ponerMenu({ ...menu, cargando: null, enCurso: null });
                                                pedirFoco('menu');
                                            }}
                                            className="shrink-0 rounded-md px-2 py-1 font-medium text-charcoal-900/70 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                                            Cancelar
                                        </button>
                                    </>
                                ) : menu.error ? (
                                    <p role="alert" className="flex min-w-0 items-start gap-1.5 leading-snug text-[#8f3a30]">
                                        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        <span>{menu.error}</span>
                                    </p>
                                ) : (
                                    <span className="min-w-0 truncate text-charcoal-900/55">
                                        {palabras.toLocaleString('es-MX')} {palabras === 1 ? 'palabra' : 'palabras'}
                                        {citas ? ` · ${citas === 1 ? 'su cita se conserva' : `sus ${citas} citas se conservan`}` : ''}
                                        {' · '}tú revisas, tú firmas
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── LA BARRA DEL CAMBIO ───────────────────────────────────── */}
            {cambio && visible && (marco.barra || !marco.lejos) && (
                <div
                    ref={refBarra}
                    role="group"
                    aria-label={`Cambio propuesto: ${cambio.etiqueta}`}
                    tabIndex={-1}
                    onKeyDown={(e) => encerrarTab(e, refBarra.current)}
                    className={`fixed z-[95] flex flex-wrap items-center gap-1 rounded-xl border border-charcoal-900/10 bg-white p-1 text-[12.5px] shadow-[0_18px_44px_-18px_rgba(20,18,16,0.5),0_1px_3px_rgba(20,18,16,0.06)] outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-accent-gold/50 ${abajo ? '' : 'max-w-[min(560px,calc(100vw-24px))]'}`}
                    style={lugar(marco.barra, marco.barra?.ancho ? { width: marco.barra.ancho } : marco.barra?.maximo ? { maxWidth: marco.barra.maximo } : undefined)}
                >
                    <span className={`flex min-w-0 items-center gap-1.5 px-2 text-[11.5px] text-charcoal-900/60 ${abajo ? 'basis-full pb-0.5 pt-1' : 'max-w-[13rem]'}`}>
                        <span className="h-2 w-2 shrink-0 rounded-full bg-accent-gold" aria-hidden="true" />
                        <span className="truncate">{cambio.etiqueta}</span>
                    </span>
                    {/* En teléfono: «Aceptar» a lo ancho y, debajo, las otras dos en
                        mitades iguales (tres a lo ancho no caben parejas). */}
                    <button type="button" onClick={aceptar} title={`Aceptar (${aceptarAtajo})`}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-charcoal-900 px-3 font-semibold text-white transition-colors hover:bg-charcoal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold ${abajo ? 'h-11 basis-full' : 'h-8'}`}>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Aceptar
                    </button>
                    <button type="button" onClick={rechazar} title="Rechazar (Esc)"
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 font-medium text-charcoal-900/80 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold ${abajo ? 'h-11 flex-1 border border-charcoal-900/10' : 'h-8'}`}>
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Rechazar
                    </button>
                    <button type="button" onClick={() => void otraVersion()} disabled={cambio.cargando}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 font-medium text-charcoal-900/80 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold ${abajo ? 'h-11 flex-1 border border-charcoal-900/10' : 'h-8 min-w-[8.25rem]'}`}>
                        {cambio.cargando
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" aria-hidden="true" />
                            : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                        {cambio.cargando ? 'Redactando…' : 'Otra versión'}
                    </button>
                    {barraLejos && (
                        <button type="button" onClick={irAlCambio}
                            className="basis-full rounded-lg px-2 py-1.5 text-[12px] font-medium text-accent-brown underline underline-offset-4">
                            Ver el cambio
                        </button>
                    )}
                    {cambio.aviso && (
                        <p className="flex basis-full items-start gap-1.5 px-2 pb-1 pt-0.5 text-[11.5px] leading-snug text-accent-brown">
                            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{cambio.aviso}</span>
                        </p>
                    )}
                    {cambio.error && (
                        <p role="alert" className="flex basis-full items-start gap-1.5 px-2 pb-1 pt-0.5 text-[11.5px] leading-snug text-[#8f3a30]">
                            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{cambio.error}</span>
                        </p>
                    )}
                </div>
            )}

            {/* ── EL CAMBIO PENDIENTE, FUERA DE LA VISTA ────────────────── */}
            {cambio && visible && marco.lejos && !marco.barra && (
                <div className="fixed z-[95] -translate-x-1/2" style={lugar(marco.lejos)}>
                    <button type="button" onClick={irAlCambio}
                        className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-charcoal-900 px-4 text-[12.5px] font-medium text-white shadow-lg transition-colors hover:bg-charcoal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold">
                        <span className="h-2 w-2 rounded-full bg-accent-gold" aria-hidden="true" />
                        Hay un cambio sin resolver · Ver
                    </button>
                </div>
            )}

            {/* ── CAMBIO APLICADO · DESHACER ────────────────────────────── */}
            {deshacible && visible && marco.deshacer && (
                <div className="fixed z-[95] -translate-x-1/2" style={lugar(marco.deshacer)}>
                    <div className="inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-full bg-charcoal-900 pl-4 pr-1.5 text-[13px] text-white shadow-lg">
                        <Check className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" />
                        <span className="pr-1.5">Cambio aplicado</span>
                        <button type="button" onClick={deshacerAceptado}
                            className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold">
                            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Deshacer
                        </button>
                    </div>
                </div>
            )}

            <div role="status" aria-live="polite" className="sr-only">{anuncio}</div>
        </div>,
        document.body,
    );
}
