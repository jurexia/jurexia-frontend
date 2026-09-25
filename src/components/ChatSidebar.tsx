'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import RegalaIurexia, { IconoRegalo } from '@/components/RegalaIurexia';
import { COLORES as COLORES_CARPETA } from '@/components/CarpetaIcono';
import {
    SquarePen,
    Workflow,
    FolderOpen,
    FolderClosed,
    FolderPlus,
    FolderMinus,
    FolderInput,
    ChevronRight,
    ChevronLeft,
    Search,
    X,
    PanelLeftClose,
    PanelLeftOpen,
    Menu,
    MoreHorizontal,
    Pencil,
    Trash2,
    Plus,
    ArrowUpRight,
    Check,
} from 'lucide-react';
import { Conversation } from '@/lib/conversations';
import { nombreCarpeta, type Expediente } from '@/lib/expedientes';
import { tituloLimpio, type Vinculos } from '@/lib/consultas-carpeta';
import { flujoPorId } from '@/lib/flujos';

/* ═══ LA BARRA DE TRABAJO (25-sep-2026) ════════════════════════════════════
   Rediseñada sobre el espacio de trabajo de Astra for Law. Lo que cambió:

   - Orden de despacho: marca, la acción principal, dos accesos (flujos de
     trabajo y carpetas), las CARPETAS con sus consultas dentro, y el
     historial de consultas sueltas. Antes era una sola lista por fecha con
     tres botones de guías abajo.
   - La consulta vive en su carpeta, como un asunto en Astra: se abre la
     carpeta y ahí están sus consultas; «Nueva consulta aquí» arranca una que
     ya lleva el expediente al modelo. Cualquier consulta vieja se mueve con
     el menú «⋯» de su fila.
   - Filas de una línea (36 px): caben el doble sin desplazarse, y la fecha ya
     la dice el grupo. El oro se reserva para lo activo y para la acción
     principal; lo demás es blanco en tres intensidades.
   - Fuera las guías de uso: la plataforma se explica sola (David, 25-sep).
     «Regala Iurexia» queda como una sola fila; lo que hace se ve al abrirla.
   ═════════════════════════════════════════════════════════════════════════ */

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    /** Con carpeta, la consulta nueva nace dentro de ella. */
    onNewConversation: (expedienteId?: string | null) => void;
    onDeleteConversation: (id: string) => void;
    /* Lo de abajo es opcional: el chat del redactor de sentencias usa la misma
       barra sin carpetas ni flujos, y sin ello se queda en historial simple. */
    /** `null`: la función de carpetas no está disponible (la base aún no la tiene). */
    carpetas?: Expediente[] | null;
    vinculos?: Vinculos;
    /** La carpeta de la consulta abierta, o de la que está por empezar. */
    carpetaActivaId?: string | null;
    onMoverConsulta?: (id: string, expedienteId: string | null) => void;
    onRenombrarConsulta?: (id: string, titulo: string) => void;
    onAbrirFlujos?: () => void;
    /** `paraConsulta`: al crearla, esa consulta se mueve adentro. */
    onNuevaCarpeta?: (paraConsulta?: string) => void;
}

const SIN_VINCULOS: Vinculos = {};
const nada = () => { };

const GRUPOS = ['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días', 'Anteriores'] as const;
const CARPETAS_VISIBLES = 6;

type Menu = {
    id: string;
    vista: 'acciones' | 'mover';
    top: number;
    left: number;
};

function colorDeCarpeta(tipo: string | null | undefined) {
    return (COLORES_CARPETA as Record<string, { tapaBaja: string }>)[tipo ?? '']?.tapaBaja ?? '#c9a962';
}

/* ── Una fila de consulta ──────────────────────────────────────────────────
   Componente de módulo, NO declarado dentro de ChatSidebar: uno declarado en
   el cuerpo es un tipo nuevo en cada render y React desmonta la barra entera
   (el scroll volvía a cero y los clics se perdían; ver la nota del 6-ago). */
function FilaConsulta({
    conv,
    activa,
    esFlujo,
    subtitulo,
    renombrando,
    porEliminar,
    onAbrir,
    onMenu,
    onRenombrar,
    onCancelarRenombrar,
    onEliminar,
    onCancelarEliminar,
}: {
    conv: Conversation;
    activa: boolean;
    esFlujo: string | null;
    subtitulo?: string;
    renombrando: boolean;
    porEliminar: boolean;
    onAbrir: (id: string) => void;
    onMenu: (id: string, boton: HTMLElement) => void;
    onRenombrar: (id: string, titulo: string) => void;
    onCancelarRenombrar: () => void;
    onEliminar: (id: string) => void;
    onCancelarEliminar: () => void;
}) {
    // Enter envía el formulario, que desmonta el campo, que dispara blur: los
    // dos caminos llegan a guardar. Esto decide cuál gana.
    const resuelto = useRef(false);
    // La misma fila se renombra más de una vez: cada edición empieza en blanco.
    useEffect(() => { if (renombrando) resuelto.current = false; }, [renombrando]);
    const titulo = tituloLimpio(conv.title);
    const mostrado = esFlujo && titulo === 'Consulta' ? esFlujo : titulo;

    if (renombrando) {
        const guardar = (valor: string) => {
            if (resuelto.current) return;
            resuelto.current = true;
            const limpio = valor.trim();
            if (limpio && limpio !== conv.title) onRenombrar(conv.id, limpio);
            else onCancelarRenombrar();
        };
        return (
            <form
                className="px-1 py-0.5"
                onSubmit={(e) => {
                    e.preventDefault();
                    guardar((e.currentTarget.elements[0] as HTMLInputElement).value);
                }}
            >
                <input
                    autoFocus
                    defaultValue={mostrado}
                    maxLength={120}
                    aria-label="Nombre de la consulta"
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={(e) => guardar(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            resuelto.current = true;
                            onCancelarRenombrar();
                        }
                    }}
                    className="h-8 w-full rounded-md border border-[#c9a962]/50 bg-white/[0.06] px-2 text-[13px] text-white outline-none"
                />
            </form>
        );
    }

    return (
        <div
            className={`group relative flex items-center rounded-lg transition-colors duration-150 ${
                activa ? 'bg-white/[0.085]' : 'hover:bg-white/[0.045]'
            }`}
        >
            {activa && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#c9a962]" />}
            <button
                type="button"
                onClick={() => onAbrir(conv.id)}
                title={mostrado}
                aria-current={activa ? 'true' : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 pr-8 text-left"
            >
                {esFlujo && (
                    <Workflow
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: activa ? '#c9a962' : 'rgba(201,169,98,0.55)' }}
                        aria-label="Iniciada con un flujo de trabajo"
                    />
                )}
                <span className="min-w-0 flex-1">
                    <span
                        className={`block truncate text-[13px] leading-5 ${
                            activa ? 'font-medium text-white' : 'text-white/[0.72] group-hover:text-white/90'
                        }`}
                    >
                        {mostrado}
                    </span>
                    {subtitulo && <span className="block truncate text-[11px] leading-4 text-white/35">{subtitulo}</span>}
                </span>
            </button>

            {!porEliminar && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMenu(conv.id, e.currentTarget);
                    }}
                    aria-label={`Opciones de «${mostrado}»`}
                    title="Opciones"
                    className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-white/50
                               opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100
                               focus:opacity-100 max-md:opacity-70"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            )}

            {porEliminar && (
                <div className="absolute inset-0 flex items-center justify-end gap-1.5 rounded-lg bg-[#161617] pr-1.5">
                    <span className="mr-auto pl-3 text-[12px] text-white/55">¿Eliminar?</span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCancelarEliminar(); }}
                        className="rounded-md bg-white/[0.07] px-2 py-1 text-[11.5px] font-medium text-white/65 hover:bg-white/[0.12]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEliminar(conv.id); }}
                        className="rounded-md bg-red-500/15 px-2 py-1 text-[11.5px] font-semibold text-[#ff7b7b] hover:bg-red-500/25"
                    >
                        Eliminar
                    </button>
                </div>
            )}
        </div>
    );
}

function ChatSidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    carpetas = null,
    vinculos = SIN_VINCULOS,
    carpetaActivaId = null,
    onMoverConsulta = nada,
    onRenombrarConsulta,
    onAbrirFlujos,
    onNuevaCarpeta = nada,
}: ChatSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    /* «Regala Iurexia» vive aquí, donde el abogado trabaja todos los días. En
       /perfil no la veía nadie: seis meses y cero invitaciones. */
    const [regaloAbierto, setRegaloAbierto] = useState(false);
    const [filtro, setFiltro] = useState('');
    // El borrado es inmediato y definitivo: se confirma en la propia fila.
    const [porEliminar, setPorEliminar] = useState<string | null>(null);
    const [renombrando, setRenombrando] = useState<string | null>(null);
    const [menu, setMenu] = useState<Menu | null>(null);
    const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
    const [verTodas, setVerTodas] = useState(false);
    const [flujosVistos, setFlujosVistos] = useState(true);

    // El estado de colapso vive en localStorage y se publica como variable CSS
    // (--sidebar-w) para que el encabezado, el pie y el área de mensajes del
    // chat se recorran con la barra en lugar de dejar un hueco vacío.
    useEffect(() => {
        try {
            if (localStorage.getItem('iurexia-sidebar-colapsada') === '1') setIsCollapsed(true);
            setFlujosVistos(localStorage.getItem('iurexia-flujos-vistos') === '1');
            const guardadas = JSON.parse(localStorage.getItem('iurexia-carpetas-abiertas') || '[]');
            if (Array.isArray(guardadas)) setAbiertas(new Set(guardadas.filter((x) => typeof x === 'string')));
        } catch { }
    }, []);

    useEffect(() => {
        try { localStorage.setItem('iurexia-sidebar-colapsada', isCollapsed ? '1' : '0'); } catch { }
        const raiz = document.documentElement;
        raiz.style.setProperty('--sidebar-w', isCollapsed ? '4.5rem' : '18rem');
        return () => { raiz.style.setProperty('--sidebar-w', '18rem'); };
    }, [isCollapsed]);

    // La carpeta de lo que se está trabajando se abre sola.
    useEffect(() => {
        if (!carpetaActivaId) return;
        setAbiertas((prev) => (prev.has(carpetaActivaId) ? prev : new Set(prev).add(carpetaActivaId)));
    }, [carpetaActivaId]);

    useEffect(() => {
        try { localStorage.setItem('iurexia-carpetas-abiertas', JSON.stringify(Array.from(abiertas).slice(-20))); } catch { }
    }, [abiertas]);

    // Escape cierra primero el menú, luego el cajón móvil.
    useEffect(() => {
        if (!isMobileOpen && !menu) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (menu) setMenu(null);
            else setIsMobileOpen(false);
        };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [isMobileOpen, menu]);

    // El menú flota con posición fija: si la ventana cambia, se cierra en vez
    // de quedarse señalando una fila que ya se movió.
    useEffect(() => {
        if (!menu) return;
        const cerrar = () => setMenu(null);
        window.addEventListener('resize', cerrar);
        return () => window.removeEventListener('resize', cerrar);
    }, [menu]);

    const cerrarMovil = () => setIsMobileOpen(false);

    // ── Qué consulta va en qué carpeta ──
    const idsCarpeta = useMemo(() => new Set((carpetas ?? []).map((c) => c.id)), [carpetas]);
    const carpetaDe = (id: string): string | null => {
        const exp = vinculos[id]?.expedienteId ?? null;
        return exp && idsCarpeta.has(exp) ? exp : null;
    };

    const { porCarpeta, sueltas } = useMemo(() => {
        const mapa = new Map<string, Conversation[]>();
        const libres: Conversation[] = [];
        for (const c of conversations) {
            const exp = vinculos[c.id]?.expedienteId;
            if (exp && idsCarpeta.has(exp)) {
                if (!mapa.has(exp)) mapa.set(exp, []);
                mapa.get(exp)!.push(c);
            } else {
                libres.push(c);
            }
        }
        return { porCarpeta: mapa, sueltas: libres };
    }, [conversations, vinculos, idsCarpeta]);

    // Las carpetas, por su última actividad: la de la carpeta o la de su
    // consulta más reciente, lo que sea más nuevo.
    const carpetasOrdenadas = useMemo(() => {
        if (!carpetas) return [];
        const actividad = (c: Expediente) => {
            const suya = new Date(c.updated_at).getTime();
            const deConsultas = (porCarpeta.get(c.id) ?? []).reduce(
                (m, conv) => Math.max(m, new Date(conv.updatedAt).getTime()), 0);
            return Math.max(suya, deConsultas);
        };
        return [...carpetas].sort((a, b) => actividad(b) - actividad(a));
    }, [carpetas, porCarpeta]);

    const carpetasVisibles = useMemo(() => {
        if (verTodas) return carpetasOrdenadas;
        const primeras = carpetasOrdenadas.slice(0, CARPETAS_VISIBLES);
        const activa = carpetaActivaId && carpetasOrdenadas.find((c) => c.id === carpetaActivaId);
        if (activa && !primeras.includes(activa)) primeras.push(activa);
        return primeras;
    }, [carpetasOrdenadas, verTodas, carpetaActivaId]);

    const grupos = useMemo(() => {
        const now = new Date();
        const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const ayer = new Date(hoy.getTime() - 86400000);
        const semana = new Date(hoy.getTime() - 7 * 86400000);
        const mes = new Date(hoy.getTime() - 30 * 86400000);
        const cubos: { label: string; convs: Conversation[] }[] = GRUPOS.map((label) => ({ label, convs: [] }));
        for (const conv of sueltas) {
            const d = new Date(conv.updatedAt);
            if (d >= hoy) cubos[0].convs.push(conv);
            else if (d >= ayer) cubos[1].convs.push(conv);
            else if (d >= semana) cubos[2].convs.push(conv);
            else if (d >= mes) cubos[3].convs.push(conv);
            else cubos[4].convs.push(conv);
        }
        return cubos.filter((g) => g.convs.length > 0);
    }, [sueltas]);

    // Buscar mira TODO, dentro y fuera de las carpetas, y dice dónde está.
    const termino = filtro.trim().toLowerCase();
    const resultados = useMemo(() => {
        if (!termino) return null;
        const nombres = new Map((carpetas ?? []).map((c) => [c.id, nombreCarpeta(c)]));
        const consultas = conversations
            .filter((c) => tituloLimpio(c.title).toLowerCase().includes(termino))
            .map((c) => ({ conv: c, carpeta: nombres.get(vinculos[c.id]?.expedienteId ?? '') ?? null }));
        const deCarpetas = (carpetas ?? []).filter((c) => nombreCarpeta(c).toLowerCase().includes(termino));
        return { consultas, carpetas: deCarpetas };
    }, [termino, conversations, carpetas, vinculos]);

    // ── Acciones ──
    const abrirConsulta = (id: string) => {
        setMenu(null);
        onSelectConversation(id);
        cerrarMovil();
    };
    const nuevaConsulta = (expedienteId?: string | null) => {
        setMenu(null);
        onNewConversation(expedienteId ?? null);
        cerrarMovil();
    };
    const alternarCarpeta = (id: string) =>
        setAbiertas((prev) => {
            const sig = new Set(prev);
            if (sig.has(id)) sig.delete(id);
            else sig.add(id);
            return sig;
        });
    const abrirMenu = (id: string, boton: HTMLElement) => {
        const r = boton.getBoundingClientRect();
        const ancho = 224;
        const alto = 260;
        setPorEliminar(null);
        setMenu({
            id,
            vista: 'acciones',
            top: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - alto - 8)),
            left: Math.max(8, Math.min(r.right - ancho, window.innerWidth - ancho - 8)),
        });
    };
    const abrirFlujos = () => {
        setMenu(null);
        cerrarMovil();
        if (!flujosVistos) {
            setFlujosVistos(true);
            try { localStorage.setItem('iurexia-flujos-vistos', '1'); } catch { }
        }
        onAbrirFlujos?.();
    };

    const propsFila = (conv: Conversation) => ({
        conv,
        activa: activeConversationId === conv.id,
        esFlujo: flujoPorId(vinculos[conv.id]?.flujo)?.nombre ?? null,
        renombrando: renombrando === conv.id,
        porEliminar: porEliminar === conv.id,
        onAbrir: abrirConsulta,
        onMenu: abrirMenu,
        onRenombrar: (id: string, titulo: string) => { setRenombrando(null); onRenombrarConsulta?.(id, titulo); },
        onCancelarRenombrar: () => setRenombrando(null),
        onEliminar: (id: string) => { setPorEliminar(null); onDeleteConversation(id); },
        onCancelarEliminar: () => setPorEliminar(null),
    });

    const hayCarpetas = carpetas !== null;
    const menuConsulta = menu ? conversations.find((c) => c.id === menu.id) : null;
    const carpetaDelMenu = menu ? carpetaDe(menu.id) : null;

    /* ═══ La barra como riel (colapsada) ═══ */
    const riel = (
        <div className="flex h-full flex-col items-center">
            <div className="flex h-14 w-full flex-shrink-0 items-center justify-center border-b border-white/[0.07]">
                <Link href="/" title="Ir al inicio" className="rounded-full transition-opacity hover:opacity-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/marca/i-iurexia-96.png" alt="Iurexia" className="h-6 w-auto select-none" draggable={false} />
                </Link>
            </div>
            <div className="flex flex-col items-center gap-1.5 pt-3">
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    title="Expandir la barra"
                    aria-label="Expandir la barra"
                    className="grid h-9 w-9 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                    <PanelLeftOpen className="h-[18px] w-[18px]" />
                </button>
                <button
                    type="button"
                    onClick={() => nuevaConsulta(null)}
                    title="Nueva consulta"
                    aria-label="Nueva consulta"
                    className="grid h-9 w-9 place-items-center rounded-lg bg-[#c9a962] text-[#14110b] transition-colors hover:bg-[#d6b877]"
                >
                    <SquarePen className="h-[17px] w-[17px]" />
                </button>
                {onAbrirFlujos && <button
                    type="button"
                    onClick={abrirFlujos}
                    title="Flujos de trabajo"
                    aria-label="Flujos de trabajo"
                    className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                    <Workflow className="h-[18px] w-[18px]" />
                </button>}
                <Link
                    href="/carpetas"
                    title="Mis carpetas"
                    aria-label="Mis carpetas"
                    className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                    <FolderOpen className="h-[18px] w-[18px]" />
                </Link>
            </div>
            <div className="mt-auto pb-4">
                <button
                    type="button"
                    onClick={() => setRegaloAbierto(true)}
                    title="Regala Iurexia"
                    aria-label="Regala Iurexia"
                    className="grid h-9 w-9 place-items-center rounded-lg bg-white/90 transition-transform hover:scale-105"
                >
                    <IconoRegalo className="h-[18px] w-[18px]" />
                </button>
            </div>
        </div>
    );

    /* ═══ La barra completa ═══
       IMPORTANTE (6-ago-2026): esto es JSX, NO un componente. Declarado como
       componente dentro del cuerpo, React lo desmontaba en cada render. */
    const completa = (movil: boolean) => (
        <div className="flex h-full min-h-0 flex-col">
            {/* ── Marca: mide lo mismo que el encabezado del chat (h-14) ── */}
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.07] pl-5 pr-3">
                <Link href="/" title="Ir al inicio" className="transition-opacity hover:opacity-80">
                    <span
                        className="text-[1.3rem] font-semibold tracking-[-0.01em] text-white"
                        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                    >
                        Iurex<span style={{ color: '#c9a962' }}>ia</span>
                    </span>
                </Link>
                {movil ? (
                    <button
                        type="button"
                        onClick={cerrarMovil}
                        aria-label="Cerrar la barra"
                        className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/[0.07] hover:text-white"
                    >
                        <X className="h-[18px] w-[18px]" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        title="Contraer la barra"
                        aria-label="Contraer la barra"
                        className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
                    >
                        <PanelLeftClose className="h-[18px] w-[18px]" />
                    </button>
                )}
            </div>

            {/* ── Acción principal y accesos ── */}
            <div className="flex-shrink-0 px-3 pt-3">
                <button
                    type="button"
                    onClick={() => nuevaConsulta(null)}
                    className="flex h-10 w-full items-center gap-2.5 rounded-lg bg-[#c9a962] px-3 text-[13.5px] font-semibold text-[#14110b] transition-colors hover:bg-[#d6b877]"
                >
                    <SquarePen className="h-[17px] w-[17px] flex-shrink-0" />
                    Nueva consulta
                </button>

                <nav aria-label="Herramientas" className="mt-2 space-y-0.5">
                    {onAbrirFlujos && <button
                        type="button"
                        onClick={abrirFlujos}
                        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                        <Workflow className="h-4 w-4 flex-shrink-0 text-white/50" />
                        Flujos de trabajo
                        {!flujosVistos && (
                            <span className="ml-auto rounded-full bg-[#c9a962]/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#c9a962]">
                                Nuevo
                            </span>
                        )}
                    </button>}
                    <Link
                        href="/carpetas"
                        onClick={cerrarMovil}
                        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                        <FolderOpen className="h-4 w-4 flex-shrink-0 text-white/50" />
                        Mis carpetas
                        {hayCarpetas && carpetas!.length > 0 && (
                            <span className="ml-auto text-[11px] text-white/35">{carpetas!.length}</span>
                        )}
                    </Link>
                </nav>

                {/* Buscador: aparece cuando el historial ya es largo */}
                {conversations.length > 6 && (
                    <label className="relative mt-3 block">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                        <input
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            placeholder="Buscar consultas y carpetas"
                            aria-label="Buscar consultas y carpetas"
                            className="h-8 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-7 text-[12.5px] text-white/85 outline-none transition-colors placeholder:text-white/30 focus:border-[#c9a962]/45"
                        />
                        {filtro && (
                            <button
                                type="button"
                                onClick={() => setFiltro('')}
                                aria-label="Limpiar búsqueda"
                                className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-white/40 hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </label>
                )}
            </div>

            {/* ── Lo que se desplaza: carpetas y consultas ── */}
            <div
                className="sidebar-scroll mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4"
                onScroll={() => menu && setMenu(null)}
            >
                {resultados ? (
                    /* ── Resultados de búsqueda ── */
                    <div className="pt-2">
                        {resultados.carpetas.map((c) => (
                            <Link
                                key={c.id}
                                href={`/carpetas/${c.id}`}
                                onClick={cerrarMovil}
                                className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/75 hover:bg-white/[0.045] hover:text-white"
                            >
                                <FolderClosed className="h-4 w-4 flex-shrink-0" style={{ color: colorDeCarpeta(c.tipo) }} />
                                <span className="truncate">{nombreCarpeta(c)}</span>
                            </Link>
                        ))}
                        {resultados.consultas.map(({ conv, carpeta }) => (
                            <FilaConsulta key={conv.id} {...propsFila(conv)} subtitulo={carpeta ? `En ${carpeta}` : undefined} />
                        ))}
                        {resultados.consultas.length === 0 && resultados.carpetas.length === 0 && (
                            <p className="px-3 py-8 text-center text-[12.5px] text-white/35">
                                Nada coincide con «{filtro.trim()}».
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── Carpetas ── */}
                        {hayCarpetas && (
                            <section aria-label="Carpetas" className="pb-2">
                                <div className="flex h-8 items-center justify-between pl-3 pr-1">
                                    <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Carpetas</h2>
                                    <button
                                        type="button"
                                        onClick={() => { cerrarMovil(); onNuevaCarpeta(); }}
                                        title="Nueva carpeta"
                                        aria-label="Nueva carpeta"
                                        className="grid h-6 w-6 place-items-center rounded-md text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
                                    >
                                        <FolderPlus className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {carpetasOrdenadas.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => { cerrarMovil(); onNuevaCarpeta(); }}
                                        className="mt-0.5 w-full rounded-lg border border-dashed border-white/[0.12] px-3 py-2.5 text-left transition-colors hover:border-[#c9a962]/40 hover:bg-white/[0.03]"
                                    >
                                        <span className="block text-[12.5px] font-medium text-white/75">Crea tu primera carpeta</span>
                                        <span className="mt-0.5 block text-[11.5px] leading-snug text-white/40">
                                            Sus consultas responden con el expediente a la vista.
                                        </span>
                                    </button>
                                ) : (
                                    <ul className="space-y-px">
                                        {carpetasVisibles.map((c) => {
                                            const suyas = porCarpeta.get(c.id) ?? [];
                                            const abierta = abiertas.has(c.id);
                                            const activa = carpetaActivaId === c.id;
                                            return (
                                                <li key={c.id}>
                                                    <div
                                                        className={`group relative flex items-center rounded-lg transition-colors ${
                                                            activa && !abierta ? 'bg-white/[0.06]' : 'hover:bg-white/[0.045]'
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => alternarCarpeta(c.id)}
                                                            aria-expanded={abierta}
                                                            title={nombreCarpeta(c)}
                                                            className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-1.5 pr-9 text-left"
                                                        >
                                                            <ChevronRight
                                                                className={`h-3.5 w-3.5 flex-shrink-0 text-white/35 transition-transform duration-150 ${abierta ? 'rotate-90' : ''}`}
                                                            />
                                                            {abierta ? (
                                                                <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: colorDeCarpeta(c.tipo) }} />
                                                            ) : (
                                                                <FolderClosed className="h-4 w-4 flex-shrink-0" style={{ color: colorDeCarpeta(c.tipo) }} />
                                                            )}
                                                            <span className={`truncate text-[13px] ${activa ? 'font-medium text-white' : 'text-white/80'}`}>
                                                                {nombreCarpeta(c)}
                                                            </span>
                                                        </button>
                                                        <span className="pointer-events-none absolute right-3 text-[11px] text-white/30 transition-opacity group-hover:opacity-0 max-md:hidden">
                                                            {suyas.length || ''}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => nuevaConsulta(c.id)}
                                                            title="Nueva consulta en esta carpeta"
                                                            aria-label={`Nueva consulta en ${nombreCarpeta(c)}`}
                                                            className="absolute right-1 grid h-7 w-7 place-items-center rounded-md text-white/55 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100 max-md:opacity-70"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    {abierta && (
                                                        <div className="mb-1 ml-[15px] mt-px space-y-px border-l border-white/[0.08] pl-2">
                                                            {suyas.map((conv) => (
                                                                <FilaConsulta key={conv.id} {...propsFila(conv)} />
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => nuevaConsulta(c.id)}
                                                                className={`flex h-8 w-full items-center gap-2 rounded-lg px-3 text-[12.5px] transition-colors hover:bg-white/[0.045] hover:text-white ${
                                                                    activa && !activeConversationId ? 'bg-white/[0.085] text-white' : 'text-white/50'
                                                                }`}
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                                {suyas.length ? 'Nueva consulta aquí' : 'Primera consulta de esta carpeta'}
                                                            </button>
                                                            <Link
                                                                href={`/carpetas/${c.id}`}
                                                                onClick={cerrarMovil}
                                                                className="flex h-8 items-center gap-2 rounded-lg px-3 text-[12.5px] text-white/50 transition-colors hover:bg-white/[0.045] hover:text-white"
                                                            >
                                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                                                Documentos y análisis
                                                            </Link>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {carpetasOrdenadas.length > CARPETAS_VISIBLES && (
                                    <button
                                        type="button"
                                        onClick={() => setVerTodas((v) => !v)}
                                        className="mt-0.5 flex h-8 w-full items-center rounded-lg px-3 text-[12px] text-white/45 transition-colors hover:bg-white/[0.045] hover:text-white"
                                    >
                                        {verTodas ? 'Ver menos' : `Ver las ${carpetasOrdenadas.length} carpetas`}
                                    </button>
                                )}
                            </section>
                        )}

                        {/* ── Consultas sueltas, por fecha ── */}
                        <section aria-label="Consultas" className={hayCarpetas ? 'border-t border-white/[0.06] pt-2' : ''}>
                            <div className="flex h-8 items-center justify-between pl-3 pr-2">
                                <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
                                    {hayCarpetas ? 'Consultas' : 'Historial'}
                                </h2>
                                <span className="text-[11px] text-white/30">{sueltas.length || ''}</span>
                            </div>
                            {grupos.length === 0 ? (
                                <p className="px-3 py-6 text-[12.5px] leading-relaxed text-white/35">
                                    {conversations.length
                                        ? 'Todas tus consultas están dentro de sus carpetas.'
                                        : 'Tus consultas aparecerán aquí.'}
                                </p>
                            ) : (
                                grupos.map((g) => (
                                    <div key={g.label} className="mb-1">
                                        <p className="sticky top-0 z-10 bg-[#0b0b0c] px-3 pb-1 pt-2.5 text-[11px] font-medium text-white/35">
                                            {g.label}
                                        </p>
                                        <div className="space-y-px">
                                            {g.convs.map((conv) => (
                                                <FilaConsulta key={conv.id} {...propsFila(conv)} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* ── Pie ── */}
            <div className="flex-shrink-0 border-t border-white/[0.07] p-3">
                <button
                    type="button"
                    onClick={() => { setRegaloAbierto(true); cerrarMovil(); }}
                    className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-[#c9a962]/25 bg-[#c9a962]/[0.07] px-2.5 transition-colors hover:border-[#c9a962]/45 hover:bg-[#c9a962]/[0.13]"
                >
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-white/90">
                        <IconoRegalo className="h-4 w-4" />
                    </span>
                    <span className="text-[13px] font-semibold text-[#d9bf7f]">Regala Iurexia</span>
                </button>
                <p className="mt-2.5 px-1 text-[10.5px] leading-snug text-white/30">
                    Iurexia orienta y fortalece el análisis legal; no sustituye la asesoría profesional.
                </p>
            </div>
        </div>
    );

    // EL NEGRO, Y EL DEGRADADO DONDE SE VE (3-sep-2026): fondo negro plano y
    // el degradado en el CONTORNO, que arranca gris claro arriba y se apaga.
    const fondo = '#0b0b0c';
    const contorno = 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, '
        + 'rgba(255,255,255,0.10) 35%, rgba(255,255,255,0.04) 70%, '
        + 'rgba(255,255,255,0.015) 100%)';

    return (
        <>
            {/* Botón de menú en móvil */}
            <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="fixed left-3 top-3 z-40 rounded-xl p-2 shadow-lg md:hidden"
                aria-label="Abrir la barra"
                style={{ backgroundColor: '#1a1a1a', color: '#c9a962', border: '1px solid rgba(201,169,98,0.25)' }}
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Velo en móvil */}
            {isMobileOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={cerrarMovil} />
            )}

            {/* Barra de escritorio */}
            <aside
                aria-label="Barra de trabajo"
                className="fixed left-0 top-0 z-40 hidden h-screen flex-col transition-[width] duration-300 md:flex"
                style={{
                    width: isCollapsed ? '4.5rem' : '18rem',
                    background: fondo,
                    borderRight: '1px solid transparent',
                    borderImage: `${contorno} 1`,
                    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
                }}
            >
                {isCollapsed ? riel : completa(false)}
            </aside>

            {/* Cajón en móvil: siempre completo, nunca riel */}
            <aside
                aria-label="Barra de trabajo"
                aria-hidden={!isMobileOpen}
                className={`fixed left-0 top-0 z-50 h-full w-72 transform transition-transform duration-300 md:hidden ${
                    isMobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
                }`}
                style={{ background: fondo, borderRight: '1px solid transparent', borderImage: `${contorno} 1` }}
            >
                {completa(true)}
            </aside>

            {/* ── Menú de una consulta ── */}
            {menu && menuConsulta && (
                <>
                    <div className="fixed inset-0 z-[65]" onMouseDown={() => setMenu(null)} aria-hidden="true" />
                    <div
                        role="menu"
                        className="fixed z-[70] w-56 overflow-hidden rounded-xl border border-white/10 bg-[#19191a] py-1 text-[13px] text-white/85 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                        style={{ top: menu.top, left: menu.left }}
                    >
                        {menu.vista === 'acciones' ? (
                            <>
                                {onRenombrarConsulta && (
                                    <button
                                        role="menuitem"
                                        type="button"
                                        onClick={() => { setRenombrando(menu.id); setMenu(null); }}
                                        className="flex h-9 w-full items-center gap-2.5 px-3 hover:bg-white/[0.07]"
                                    >
                                        <Pencil className="h-4 w-4 text-white/50" /> Renombrar
                                    </button>
                                )}
                                {hayCarpetas && (
                                    <button
                                        role="menuitem"
                                        type="button"
                                        onClick={() => setMenu({ ...menu, vista: 'mover' })}
                                        className="flex h-9 w-full items-center gap-2.5 px-3 hover:bg-white/[0.07]"
                                    >
                                        <FolderInput className="h-4 w-4 text-white/50" />
                                        {carpetaDelMenu ? 'Mover a otra carpeta' : 'Mover a una carpeta'}
                                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/35" />
                                    </button>
                                )}
                                {hayCarpetas && carpetaDelMenu && (
                                    <button
                                        role="menuitem"
                                        type="button"
                                        onClick={() => { onMoverConsulta(menu.id, null); setMenu(null); }}
                                        className="flex h-9 w-full items-center gap-2.5 px-3 hover:bg-white/[0.07]"
                                    >
                                        <FolderMinus className="h-4 w-4 text-white/50" /> Sacar de la carpeta
                                    </button>
                                )}
                                <div className="my-1 h-px bg-white/[0.07]" />
                                <button
                                    role="menuitem"
                                    type="button"
                                    onClick={() => { setPorEliminar(menu.id); setMenu(null); }}
                                    className="flex h-9 w-full items-center gap-2.5 px-3 text-[#ff8a8a] hover:bg-red-500/10"
                                >
                                    <Trash2 className="h-4 w-4" /> Eliminar
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setMenu({ ...menu, vista: 'acciones' })}
                                    className="flex h-8 w-full items-center gap-1.5 px-2.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-white/40 hover:text-white/70"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Mover a…
                                </button>
                                <div className="sidebar-scroll max-h-52 overflow-y-auto">
                                    {carpetasOrdenadas.map((c) => (
                                        <button
                                            key={c.id}
                                            role="menuitemradio"
                                            aria-checked={carpetaDelMenu === c.id}
                                            type="button"
                                            onClick={() => { if (carpetaDelMenu !== c.id) onMoverConsulta(menu.id, c.id); setMenu(null); }}
                                            className="flex h-9 w-full items-center gap-2.5 px-3 text-left hover:bg-white/[0.07]"
                                        >
                                            <FolderClosed className="h-4 w-4 flex-shrink-0" style={{ color: colorDeCarpeta(c.tipo) }} />
                                            <span className="truncate">{nombreCarpeta(c)}</span>
                                            {carpetaDelMenu === c.id && <Check className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[#c9a962]" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="my-1 h-px bg-white/[0.07]" />
                                <button
                                    type="button"
                                    onClick={() => { const id = menu.id; setMenu(null); onNuevaCarpeta(id); }}
                                    className="flex h-9 w-full items-center gap-2.5 px-3 hover:bg-white/[0.07]"
                                >
                                    <FolderPlus className="h-4 w-4 text-white/50" /> Nueva carpeta…
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            <RegalaIurexia abierto={regaloAbierto} onCerrar={() => setRegaloAbierto(false)} />
        </>
    );
}

export default memo(ChatSidebar);
