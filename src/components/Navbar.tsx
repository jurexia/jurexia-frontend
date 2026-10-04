'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, MessageSquare, FileText, Shield, ChevronDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { UserAvatar } from './UserAvatar';
import dynamic from 'next/dynamic';
import LemaOpenAI from './LemaOpenAI';

/* La barra de trabajo sólo se descarga cuando hace falta (página de la
   plataforma y sesión abierta): las páginas públicas no cargan la lateral del
   chat, sus carpetas ni sus consultas. */
const MarcoTrabajo = dynamic(() => import('./trabajo/MarcoTrabajo'), { ssr: false });

const ADMIN_EMAIL = 'administracion@iurexia.com';

/* Un solo sistema de medidas para toda la barra. Cada control —enlace, botón,
   avatar— mide lo mismo de alto y comparte el mismo radio, así la fila lee como
   una sola línea y no como piezas sueltas. */
const ALTO_CONTROL = 'h-9';
const RADIO = 'rounded-lg';
const TEXTO = 'text-[0.9375rem] font-medium tracking-[-0.011em]';
const BOTON = `inline-flex ${ALTO_CONTROL} ${RADIO} ${TEXTO} items-center justify-center whitespace-nowrap px-4 transition-colors duration-200`;

/* LAS PESTAÑAS (3-oct-2026). David pidió las pestañas principales «como
   astraforlaw.app, más corporativo y profesional»: que al acercar el cursor se
   desplieguen todas las opciones —las mismas que ya estaban en el pie— y
   «Precios» siempre arriba. Quedan tres menús desplegables (Plataforma,
   Soluciones, Recursos) y dos enlaces directos (Seguridad, Precios). Cada
   opción lleva una línea que dice qué es; cada menú, una tarjeta oscura con lo
   que se quiere destacar. Connect y Estudiar y pensar, que llevaban el punto de
   sección nueva en la fila, pasan a la tarjeta de su menú.

   Lo que el pie enlaza y aquí no está, a propósito: el Taller de sentencias
   (detrás de una bandera: sin ella manda al chat), Leyes estatales (redirige a
   Normativa), Sálvame (ya es el botón rojo de la barra), Planes y precios (es
   la pestaña Precios) y crear cuenta / iniciar sesión (los dos botones). */
type IdMenu = 'plataforma' | 'soluciones' | 'recursos';
type Opcion = { href: string; titulo: string; texto: string; externo?: boolean };
type Columna = { titulo: string; opciones: Opcion[] };
type Tarjeta = { etiqueta: string; titulo: string; texto: string; href: string; accion: string };
type Menu = { id: IdMenu; etiqueta: string; columnas: Columna[]; tarjeta: Tarjeta };

const MENUS: Record<IdMenu, Menu> = {
    plataforma: {
        id: 'plataforma',
        etiqueta: 'Plataforma',
        columnas: [
            {
                titulo: 'La plataforma',
                opciones: [
                    { href: '/plataforma', titulo: 'Visión general', texto: 'De la investigación al escrito listo para presentar, en un solo lugar.' },
                    { href: '/plataforma/consulta', titulo: 'Consulta jurídica', texto: 'Cada respuesta con su fundamento y cada cita verificada contra su fuente.' },
                    { href: '/plataforma/redaccion', titulo: 'Redacción de escritos', texto: 'Demandas y escritos completos, editables y listos para descargar en Word.' },
                    { href: '/normativa', titulo: 'Normativa', texto: 'Legislación federal y de las 32 entidades, artículo por artículo.' },
                ],
            },
            {
                titulo: 'El espacio de trabajo',
                opciones: [
                    { href: '/plataforma/carpetas', titulo: 'Carpetas y seguimiento', texto: 'Cada asunto en su carpeta y sus expedientes vigilados ante el PJF.' },
                    { href: '/plataforma/redaccion#flujos', titulo: 'Flujos de trabajo', texto: 'Los escritos de siempre, guiados paso a paso.' },
                    { href: '/agente', titulo: 'Agente de amparo', texto: 'La demanda de amparo indirecto, estructurada parte por parte.' },
                    { href: '/plataforma/consulta#precedentes', titulo: 'Jurimetría y precedentes', texto: 'Cómo han resuelto los tribunales asuntos como el suyo.' },
                ],
            },
        ],
        tarjeta: {
            etiqueta: 'En video · 2 min',
            titulo: 'Una semana con Iurexia',
            texto: 'De la investigación del lunes a la audiencia del jueves.',
            href: '/plataforma#video',
            accion: 'Ver el video',
        },
    },
    soluciones: {
        id: 'soluciones',
        etiqueta: 'Soluciones',
        columnas: [
            {
                titulo: 'Para quién',
                opciones: [
                    { href: '/soluciones', titulo: 'Abogados y despachos', texto: 'Investigación, redacción y seguimiento para la práctica diaria.' },
                    { href: '/secretarios', titulo: 'Secretarios del PJF', texto: 'El estudio de fondo y la jurisprudencia para el proyecto de sentencia.' },
                    { href: '/vitrina', titulo: 'Vitrina de despachos', texto: 'Aparezca entre los despachos que trabajan con Iurexia.' },
                ],
            },
        ],
        tarjeta: {
            etiqueta: 'Directorio verificado',
            titulo: 'Iurexia Connect',
            texto: 'Abogados con cédula profesional verificada, sin costo para quien busca.',
            href: '/connect',
            accion: 'Conocer Connect',
        },
    },
    recursos: {
        id: 'recursos',
        etiqueta: 'Recursos',
        columnas: [
            {
                titulo: 'Aprender',
                opciones: [
                    { href: 'https://www.youtube.com/@iurexia', titulo: 'Canal de YouTube', texto: 'Conocimiento jurídico en video.', externo: true },
                    { href: '/ultimo', titulo: 'Lo último', texto: 'Comunicados de la Corte, tesis de la semana y el DOF.' },
                    { href: '/tutorial', titulo: 'Cómo usar el chat', texto: 'El nuevo chat, explicado en video.' },
                ],
            },
            {
                titulo: 'Iurexia',
                opciones: [
                    { href: '/conocenos', titulo: 'Conócenos', texto: 'Diseñada por profesionales del Derecho mexicano.' },
                    { href: '/privacidad', titulo: 'Aviso de privacidad', texto: 'Qué datos tratamos y cómo los protegemos.' },
                    { href: '/terminos', titulo: 'Términos y condiciones', texto: 'Las condiciones del servicio.' },
                    { href: 'mailto:soporte@iurexia.com', titulo: 'Soporte', texto: 'soporte@iurexia.com', externo: true },
                ],
            },
        ],
        tarjeta: {
            etiqueta: 'Nuevo',
            titulo: 'Estudiar y pensar',
            texto: 'Las lecciones del canal, con su material de lectura.',
            href: '/estudiar',
            accion: 'Ir a las lecciones',
        },
    },
};

/* El orden de la fila, como el de astraforlaw.app: Plataforma, Soluciones,
   Seguridad, Precios, Recursos. */
type Pestana = { tipo: 'menu'; id: IdMenu } | { tipo: 'enlace'; href: string; etiqueta: string };
const FILA: Pestana[] = [
    { tipo: 'menu', id: 'plataforma' },
    { tipo: 'menu', id: 'soluciones' },
    { tipo: 'enlace', href: '/seguridad', etiqueta: 'Seguridad' },
    { tipo: 'enlace', href: '/precios', etiqueta: 'Precios' },
    { tipo: 'menu', id: 'recursos' },
];

/* La ruta de una opción, sin el ancla, para marcar la pestaña de la sección en
   la que está la persona. */
const rutaDe = (href: string) => href.split('#')[0];
const esInterno = (href: string) => href.startsWith('/');

function menuActivo(menu: Menu, pathname: string | null) {
    if (!pathname) return false;
    const rutas = [...menu.columnas.flatMap((c) => c.opciones.map((o) => o.href)), menu.tarjeta.href]
        .filter(esInterno)
        .map(rutaDe);
    return rutas.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

/* `sobreOscuro` lo activa la portada, que arranca con un hero de vídeo oscuro:
   allí la barra va transparente con texto blanco y sólo se vuelve crema cuando
   el contenido claro llega por debajo. En el resto de páginas no se pasa y la
   barra es crema desde el primer píxel.

   `plataforma` lo pasan las páginas de la plataforma (Mi trabajo, Lo último,
   Normativa, el perfil, Estudiar y pensar…): con sesión abierta no se pinta
   esta barra pública sino la barra de trabajo del chat (MarcoTrabajo); sin
   sesión, esta. Mientras se sabe si hay sesión no se pinta ninguna, para no
   enseñar una y cambiarla por la otra. */
export default function Navbar({ sobreOscuro = false, plataforma = false }: { sobreOscuro?: boolean; plataforma?: boolean }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [anclada, setAnclada] = useState(!sobreOscuro);
    /* El menú desplegable abierto en escritorio, y en el móvil la sección
       desplegada del acordeón. */
    const [abierto, setAbierto] = useState<IdMenu | null>(null);
    const [seccionMovil, setSeccionMovil] = useState<IdMenu | null>(null);
    const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ultimoPuntero = useRef<string>('mouse');
    const barraRef = useRef<HTMLElement>(null);
    const { user, profile, loading } = useAuth();
    const pathname = usePathname();

    const isLoggedIn = !!user;
    const isLoading = loading;
    const userIsAdmin = isAdmin(user?.email);
    const canAccessRedactor =
        userIsAdmin ||
        profile?.subscription_type === 'ultra_secretarios' ||
        profile?.can_access_sentencia === true;
    const isAdminEmail = user?.email === ADMIN_EMAIL;

    /* En claro = texto blanco sobre el vídeo. Con el menú del móvil o un
       desplegable abiertos nunca, porque el panel es crema y la barra se une a
       él. */
    const conPanel = abierto !== null;
    const enClaro = sobreOscuro && !anclada && !isMenuOpen && !conPanel;

    useEffect(() => {
        /* Sobre el hero se espera a haberlo recorrido casi entero antes de
           anclar; en las demás páginas basta un empujón para separar la barra. */
        const alScrollear = () => {
            const umbral = sobreOscuro ? window.innerHeight * 0.7 : 8;
            setAnclada(window.scrollY > umbral);
        };
        alScrollear();
        window.addEventListener('scroll', alScrollear, { passive: true });
        window.addEventListener('resize', alScrollear);
        return () => {
            window.removeEventListener('scroll', alScrollear);
            window.removeEventListener('resize', alScrollear);
        };
    }, [sobreOscuro]);

    useEffect(() => {
        setIsMenuOpen(false);
        setAbierto(null);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    useEffect(() => () => {
        if (temporizador.current) clearTimeout(temporizador.current);
    }, []);

    /* Con un desplegable abierto: Escape lo cierra y devuelve el foco a su
       pestaña; un toque fuera de la barra lo cierra (en pantallas táctiles no
       hay cursor que salga). */
    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const id = abierto;
            setAbierto(null);
            document.getElementById(`pestana-${id}`)?.focus();
        };
        const alTocar = (e: PointerEvent) => {
            if (barraRef.current && !barraRef.current.contains(e.target as Node)) setAbierto(null);
        };
        window.addEventListener('keydown', alTeclear);
        document.addEventListener('pointerdown', alTocar);
        return () => {
            window.removeEventListener('keydown', alTeclear);
            document.removeEventListener('pointerdown', alTocar);
        };
    }, [abierto]);

    if (plataforma) {
        if (isLoading) return null;
        if (isLoggedIn) return <MarcoTrabajo />;
    }

    const cancelar = () => {
        if (temporizador.current) {
            clearTimeout(temporizador.current);
            temporizador.current = null;
        }
    };
    /* El cursor que entra en una pestaña la abre tras un instante (si sólo
       cruza la barra camino de otra cosa, no se despliega nada); si ya hay un
       menú abierto, cambia al momento. Al salir de la barra se cierra con un
       margen de gracia, para poder bajar en diagonal hasta el panel. */
    const abrirAlPasar = (id: IdMenu) => {
        cancelar();
        if (abierto) {
            setAbierto(id);
            return;
        }
        temporizador.current = setTimeout(() => setAbierto(id), 80);
    };
    const cerrarConGracia = () => {
        cancelar();
        temporizador.current = setTimeout(() => setAbierto(null), 180);
    };
    const cerrar = () => {
        cancelar();
        setAbierto(null);
    };

    const fondoBarra = enClaro
        ? 'bg-transparent border-transparent'
        : anclada || conPanel
            ? 'bg-cream-200/90 backdrop-blur-xl border-b border-charcoal-900/[0.07] shadow-[0_1px_3px_rgba(26,26,26,0.04)]'
            : 'bg-cream-300/70 backdrop-blur-md border-b border-transparent';

    const botonContorno = enClaro
        ? `${BOTON} border border-white/25 text-white hover:border-white/50 hover:bg-white/10`
        : `${BOTON} border border-charcoal-900/10 text-charcoal-800 hover:border-charcoal-900/25 hover:bg-charcoal-900/[0.03]`;

    const botonSolido = enClaro
        ? `${BOTON} bg-white text-charcoal-900 hover:bg-cream-200`
        : `${BOTON} bg-charcoal-900 text-white hover:bg-charcoal-800`;

    const iconoUtilidad = enClaro
        ? `inline-flex ${ALTO_CONTROL} w-9 ${RADIO} items-center justify-center border border-white/25 text-white/80 transition-colors duration-200 hover:bg-white/10`
        : `inline-flex ${ALTO_CONTROL} w-9 ${RADIO} items-center justify-center border border-charcoal-900/10 text-charcoal-700 transition-colors duration-200 hover:border-charcoal-900/25 hover:bg-charcoal-900/[0.03]`;

    /* Con sesión, «Mis carpetas» se suma a la fila como enlace directo. */
    const fila: Pestana[] = isLoggedIn ? [...FILA, { tipo: 'enlace', href: '/carpetas', etiqueta: 'Mis carpetas' }] : FILA;

    return (
        <nav
            ref={barraRef}
            aria-label="Principal"
            onPointerEnter={cancelar}
            onPointerLeave={(e) => {
                if (e.pointerType === 'mouse' && abierto) cerrarConGracia();
            }}
            onBlur={(e) => {
                /* El foco del teclado que sale de la barra cierra el desplegable. */
                if (abierto && !e.currentTarget.contains(e.relatedTarget as Node | null)) setAbierto(null);
            }}
            className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${fondoBarra}`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Tres columnas: los extremos ocupan lo mismo (1fr) y el centro
                    sólo lo que necesita, así el menú queda centrado de verdad
                    respecto a la página —no respecto a lo que sobre a los lados,
                    que es lo que descuadraba la barra anterior. */}
                <div className="grid h-16 grid-cols-[auto_1fr] items-center gap-4 xl:h-[72px] xl:grid-cols-[1fr_auto_1fr]">

                    {/* ── Izquierda: marca + Sálvame ── */}
                    <div
                        className="flex items-center gap-3 justify-self-start"
                        onPointerEnter={(e) => {
                            if (e.pointerType === 'mouse' && abierto) cerrarConGracia();
                        }}
                    >
                        <Link href="/" className="flex flex-col items-start gap-1" aria-label="Iurexia — inicio. Now powered by OpenAI">
                            {/* La marca no cambia nunca de tipografía: Playfair/Georgia 600. */}
                            <span
                                className={`font-serif text-2xl font-semibold leading-none transition-colors duration-300 ${
                                    enClaro ? 'text-white' : 'text-charcoal-900'
                                }`}
                            >
                                Iurex<span className="text-accent-gold">ia</span>
                            </span>
                            <LemaOpenAI sobreOscuro={enClaro} tamano="text-[9px]" />
                        </Link>

                        <span
                            aria-hidden
                            className={`h-5 w-px transition-colors duration-300 ${
                                enClaro ? 'bg-white/25' : 'bg-charcoal-900/10'
                            }`}
                        />

                        {/* Sálvame se queda visible también en teléfono: es el
                            amparo de urgencia y quien lo necesita no está para
                            buscarlo dentro de un menú. */}
                        <Link
                            href="/salvame"
                            className={`inline-flex ${ALTO_CONTROL} ${RADIO} items-center gap-1.5 px-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-200 sm:px-3 sm:text-[0.8125rem] ${
                                enClaro
                                    ? 'border border-red-300/35 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                                    : 'border border-red-700/20 bg-red-50/60 text-red-700 hover:border-red-700/40 hover:bg-red-50'
                            }`}
                        >
                            <CruzMedica claro={enClaro} />
                            Sálvame
                        </Link>
                    </div>

                    {/* ── Centro: las pestañas ── */}
                    <div className="hidden items-center justify-self-center xl:flex">
                        {fila.map((p) => {
                            if (p.tipo === 'enlace') {
                                return (
                                    <EnlaceNav
                                        key={p.href}
                                        href={p.href}
                                        activo={pathname === p.href || pathname?.startsWith(p.href + '/')}
                                        claro={enClaro}
                                        onPointerEnter={(e) => {
                                            if (e.pointerType === 'mouse' && abierto) cerrar();
                                        }}
                                    >
                                        {p.etiqueta}
                                    </EnlaceNav>
                                );
                            }
                            const menu = MENUS[p.id];
                            const estaAbierto = abierto === menu.id;
                            return (
                                <div key={menu.id}>
                                    <PestanaMenu
                                        id={menu.id}
                                        abierto={estaAbierto}
                                        activo={menuActivo(menu, pathname)}
                                        claro={enClaro}
                                        onPointerEnter={(e) => {
                                            if (e.pointerType === 'mouse') abrirAlPasar(menu.id);
                                        }}
                                        onPointerDown={(e) => {
                                            ultimoPuntero.current = e.pointerType;
                                        }}
                                        onClick={(e) => {
                                            /* Con el ratón, el clic no cierra lo que el
                                               paso del cursor acaba de abrir; con el
                                               teclado o el dedo, abre y cierra. */
                                            if (e.detail > 0 && ultimoPuntero.current === 'mouse') {
                                                cancelar();
                                                setAbierto(menu.id);
                                                return;
                                            }
                                            setAbierto((a) => (a === menu.id ? null : menu.id));
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setAbierto(menu.id);
                                                setTimeout(() => document.querySelector<HTMLElement>(`#menu-${menu.id} a`)?.focus(), 0);
                                            }
                                        }}
                                    >
                                        {menu.etiqueta}
                                    </PestanaMenu>
                                    <PanelMenu menu={menu} abierto={estaAbierto} alElegir={cerrar} />
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Derecha: dos acciones, siempre dos ── */}
                    <div
                        className="hidden items-center gap-2 justify-self-end xl:flex"
                        onPointerEnter={(e) => {
                            if (e.pointerType === 'mouse' && abierto) cerrarConGracia();
                        }}
                    >
                        {isAdminEmail && (
                            <Link href="/admin" aria-label="Administrador" title="Administrador" className={iconoUtilidad}>
                                <Shield className="h-4 w-4" />
                            </Link>
                        )}
                        {canAccessRedactor && (
                            <Link
                                href="/redactor-sentencia"
                                aria-label="Redactor de sentencias"
                                title="Redactor de sentencias"
                                className={iconoUtilidad}
                            >
                                <FileText className="h-4 w-4" />
                            </Link>
                        )}

                        {isLoading ? (
                            <>
                                <div className={`${ALTO_CONTROL} ${RADIO} w-24 animate-pulse ${enClaro ? 'bg-white/10' : 'bg-charcoal-900/[0.06]'}`} />
                                <div className={`${ALTO_CONTROL} ${RADIO} w-28 animate-pulse ${enClaro ? 'bg-white/10' : 'bg-charcoal-900/[0.06]'}`} />
                            </>
                        ) : isLoggedIn ? (
                            <>
                                <Link href="/chat" className={botonSolido}>
                                    <MessageSquare className="mr-2 h-4 w-4 text-accent-gold" />
                                    Ir al Chat
                                </Link>
                                <UserAvatar />
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={botonContorno}>
                                    Acceder
                                </Link>
                                <Link href="/registro" className={botonSolido}>
                                    Probar Gratis
                                </Link>
                            </>
                        )}
                    </div>

                    {/* ── Móvil ── */}
                    <div className="flex items-center gap-2 justify-self-end xl:hidden">
                        {isLoggedIn && !isLoading && <UserAvatar />}
                        <button
                            type="button"
                            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={isMenuOpen}
                            className={iconoUtilidad}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ Menú de móvil ═══
                Opaco a propósito: con fondo translúcido el vídeo del hero se
                transparentaba detrás de los enlaces y el menú se leía sucio. Las
                mismas pestañas que en escritorio; los menús, en acordeón. */}
            <div
                className={`overflow-hidden border-t border-charcoal-900/[0.07] bg-cream-200 shadow-[0_12px_24px_-12px_rgba(26,26,26,0.12)] transition-[max-height,opacity] duration-300 ease-out xl:hidden ${
                    isMenuOpen ? 'max-h-[calc(100vh-4rem)] overflow-y-auto opacity-100' : 'pointer-events-none max-h-0 opacity-0'
                }`}
            >
                <div className="mx-auto max-w-7xl px-4 pb-6 pt-2 sm:px-6">

                    <div className="flex flex-col">
                        {fila.map((p) => {
                            if (p.tipo === 'enlace') {
                                const activo = pathname === p.href;
                                return (
                                    <Link
                                        key={p.href}
                                        href={p.href}
                                        className={`flex h-12 items-center justify-between border-b border-charcoal-900/[0.06] text-[1.0625rem] transition-colors ${
                                            activo ? 'font-semibold text-charcoal-900' : 'font-medium text-charcoal-700 hover:text-charcoal-900'
                                        }`}
                                    >
                                        {p.etiqueta}
                                        {activo && <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" aria-hidden />}
                                    </Link>
                                );
                            }
                            const menu = MENUS[p.id];
                            const desplegado = seccionMovil === menu.id;
                            const opciones: (Opcion & { destacada?: boolean })[] = [
                                { href: menu.tarjeta.href, titulo: menu.tarjeta.titulo, texto: menu.tarjeta.texto, destacada: true },
                                ...menu.columnas.flatMap((c) => c.opciones),
                            ];
                            return (
                                <div key={menu.id} className="border-b border-charcoal-900/[0.06]">
                                    <button
                                        type="button"
                                        aria-expanded={desplegado}
                                        aria-controls={`movil-${menu.id}`}
                                        onClick={() => setSeccionMovil(desplegado ? null : menu.id)}
                                        className={`flex h-12 w-full items-center justify-between text-left text-[1.0625rem] transition-colors ${
                                            menuActivo(menu, pathname) ? 'font-semibold text-charcoal-900' : 'font-medium text-charcoal-700 hover:text-charcoal-900'
                                        }`}
                                    >
                                        {menu.etiqueta}
                                        <ChevronDown
                                            aria-hidden
                                            className={`h-4 w-4 text-charcoal-900/45 transition-transform duration-200 ${desplegado ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    <div id={`movil-${menu.id}`} hidden={!desplegado} className="pb-3">
                                        {opciones.map((o) => (
                                            <EnlaceOpcion
                                                key={o.href}
                                                opcion={o}
                                                className="flex h-11 items-center gap-2 pl-3 text-[0.9375rem] text-charcoal-700 transition-colors hover:text-charcoal-900"
                                            >
                                                {o.titulo}
                                                {o.destacada && <Punto />}
                                                {o.externo && <ArrowUpRight aria-hidden className="h-3.5 w-3.5 text-charcoal-900/40" />}
                                            </EnlaceOpcion>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Sálvame no se repite aquí: ya está fijo en la barra, a un
                        toque, en cualquier ancho de pantalla. */}
                    <div className="mt-5 flex flex-col gap-2">
                        {isLoggedIn ? (
                            <Link
                                href="/chat"
                                className={`inline-flex h-11 ${RADIO} items-center justify-center bg-charcoal-900 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800`}
                            >
                                <MessageSquare className="mr-2 h-4 w-4 text-accent-gold" />
                                Ir al Chat
                            </Link>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    href="/login"
                                    className={`inline-flex h-11 ${RADIO} items-center justify-center border border-charcoal-900/10 text-[0.9375rem] font-medium text-charcoal-800 transition-colors hover:bg-charcoal-900/[0.03]`}
                                >
                                    Acceder
                                </Link>
                                <Link
                                    href="/registro"
                                    className={`inline-flex h-11 ${RADIO} items-center justify-center bg-charcoal-900 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800`}
                                >
                                    Probar Gratis
                                </Link>
                            </div>
                        )}

                        {(canAccessRedactor || isAdminEmail) && (
                            <div className="mt-1 grid grid-cols-2 gap-2">
                                {canAccessRedactor && (
                                    <Link
                                        href="/redactor-sentencia"
                                        className={`inline-flex h-11 ${RADIO} items-center justify-center gap-2 border border-charcoal-900/10 text-[0.9375rem] font-medium text-charcoal-700 transition-colors hover:bg-charcoal-900/[0.03]`}
                                    >
                                        <FileText className="h-4 w-4" />
                                        Redactor
                                    </Link>
                                )}
                                {userIsAdmin && (
                                    <Link
                                        href="/leyesestatales"
                                        className={`inline-flex h-11 ${RADIO} items-center justify-center border border-charcoal-900/10 text-[0.9375rem] font-medium text-charcoal-700 transition-colors hover:bg-charcoal-900/[0.03]`}
                                    >
                                        Leyes Estatales
                                    </Link>
                                )}
                                {isAdminEmail && (
                                    <Link
                                        href="/admin"
                                        className={`col-span-2 inline-flex h-11 ${RADIO} items-center justify-center gap-2 border border-red-700/20 text-[0.9375rem] font-medium text-red-700 transition-colors hover:bg-red-50`}
                                    >
                                        <Shield className="h-4 w-4" />
                                        Administrador
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

/* El subrayado dorado de las pestañas: se dibuja en un elemento aparte, con
   posición absoluta, y aparece sin mover ni un píxel del texto, así el ancho
   de la fila no baila al pasar el ratón. */
function Subrayado({ visible }: { visible?: boolean }) {
    return (
        <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-3.5 bottom-0 h-[1.5px] origin-left rounded-full bg-accent-gold transition-transform duration-200 ease-out ${
                visible ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`}
        />
    );
}

function colorPestana(activo?: boolean, claro?: boolean) {
    return claro
        ? activo ? 'text-white' : 'text-white/70 hover:text-white'
        : activo ? 'text-charcoal-900' : 'text-charcoal-700 hover:text-charcoal-900';
}

/* Enlace directo de la fila (Seguridad, Precios, Mis carpetas). */
function EnlaceNav({
    href,
    children,
    activo,
    claro,
    onPointerEnter,
}: {
    href: string;
    children: React.ReactNode;
    activo?: boolean;
    claro?: boolean;
    onPointerEnter?: (e: React.PointerEvent) => void;
}) {
    return (
        <Link
            href={href}
            aria-current={activo ? 'page' : undefined}
            onPointerEnter={onPointerEnter}
            className={`group relative flex ${ALTO_CONTROL} ${RADIO} ${TEXTO} items-center whitespace-nowrap px-3.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60 ${colorPestana(activo, claro)}`}
        >
            {children}
            <Subrayado visible={activo} />
        </Link>
    );
}

/* Pestaña con desplegable: un botón (no un enlace), con su flecha. */
function PestanaMenu({
    id,
    children,
    abierto,
    activo,
    claro,
    ...eventos
}: {
    id: IdMenu;
    children: React.ReactNode;
    abierto: boolean;
    activo?: boolean;
    claro?: boolean;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}) {
    return (
        <button
            type="button"
            id={`pestana-${id}`}
            aria-expanded={abierto}
            aria-controls={`menu-${id}`}
            className={`group relative flex ${ALTO_CONTROL} ${RADIO} ${TEXTO} items-center gap-1 whitespace-nowrap px-3.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60 ${colorPestana(activo || abierto, claro)}`}
            {...eventos}
        >
            {children}
            <ChevronDown
                aria-hidden
                className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
            />
            <Subrayado visible={activo || abierto} />
        </button>
    );
}

/* El panel desplegable. Va justo después de su pestaña en el documento (el
   tabulador entra en él en orden), pero se coloca respecto a la barra entera:
   ocupa el ancho del contenedor, pegado a su borde inferior. Dos columnas de
   opciones y la tarjeta oscura a la derecha. Cerrado no se ve ni recibe el
   foco (visibility). */
function PanelMenu({ menu, abierto, alElegir }: { menu: Menu; abierto: boolean; alElegir: () => void }) {
    const unaColumna = menu.columnas.length === 1;
    return (
        <div
            id={`menu-${menu.id}`}
            aria-label={menu.etiqueta}
            role="region"
            className={`absolute inset-x-0 top-full transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
                abierto ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-1 opacity-0'
            }`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,340px)] gap-x-12 rounded-b-2xl border border-t-0 border-charcoal-900/[0.08] bg-cream-100 px-10 pb-10 pt-9 shadow-[0_28px_56px_-28px_rgba(26,26,26,0.30)]">
                    {unaColumna ? (
                        <div className="col-span-2">
                            <TituloColumna>{menu.columnas[0].titulo}</TituloColumna>
                            <div className="grid grid-cols-2 gap-x-12 gap-y-1">
                                {menu.columnas[0].opciones.map((o) => <OpcionMenu key={o.href} opcion={o} alElegir={alElegir} />)}
                            </div>
                        </div>
                    ) : (
                        menu.columnas.map((c) => (
                            <div key={c.titulo}>
                                <TituloColumna>{c.titulo}</TituloColumna>
                                <div className="flex flex-col gap-1">
                                    {c.opciones.map((o) => <OpcionMenu key={o.href} opcion={o} alElegir={alElegir} />)}
                                </div>
                            </div>
                        ))
                    )}

                    <Link
                        href={menu.tarjeta.href}
                        onClick={alElegir}
                        className="group/tarjeta flex min-h-[260px] flex-col justify-between rounded-xl bg-charcoal-950 p-7 text-white transition-colors hover:bg-charcoal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold"
                    >
                        <span>
                            <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">{menu.tarjeta.etiqueta}</span>
                            <span className="mt-6 block font-serif text-[1.75rem] leading-[1.15] text-white [text-wrap:balance]">{menu.tarjeta.titulo}</span>
                            <span className="mt-3 block text-[0.9375rem] leading-relaxed text-white/65">{menu.tarjeta.texto}</span>
                        </span>
                        <span className="mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-white">
                            {menu.tarjeta.accion}
                            <ArrowRight aria-hidden className="h-4 w-4 text-accent-gold transition-transform duration-200 group-hover/tarjeta:translate-x-0.5" />
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function TituloColumna({ children }: { children: React.ReactNode }) {
    return <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-charcoal-900/45">{children}</p>;
}

function OpcionMenu({ opcion, alElegir }: { opcion: Opcion; alElegir: () => void }) {
    return (
        <EnlaceOpcion
            opcion={opcion}
            onClick={alElegir}
            className="-mx-3 block rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-charcoal-900/[0.035] focus-visible:bg-charcoal-900/[0.035] focus-visible:outline-none"
        >
            <span className="flex items-center gap-1.5 text-[1.0625rem] font-medium tracking-[-0.011em] text-charcoal-900">
                {opcion.titulo}
                {opcion.externo && <ArrowUpRight aria-hidden className="h-3.5 w-3.5 text-charcoal-900/40" />}
            </span>
            <span className="mt-1 block text-[0.9375rem] leading-snug text-charcoal-900/60">{opcion.texto}</span>
        </EnlaceOpcion>
    );
}

/* Una opción: las páginas propias con <Link>; el canal de YouTube se abre en
   otra pestaña y el correo de soporte con su mailto. */
function EnlaceOpcion({
    opcion,
    className,
    onClick,
    children,
}: {
    opcion: Opcion;
    className: string;
    onClick?: () => void;
    children: React.ReactNode;
}) {
    if (esInterno(opcion.href)) {
        return (
            <Link href={opcion.href} onClick={onClick} className={className}>
                {children}
            </Link>
        );
    }
    const web = opcion.href.startsWith('http');
    return (
        <a
            href={opcion.href}
            onClick={onClick}
            className={className}
            {...(web ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
            {children}
        </a>
    );
}

/* Señal de lo destacado en el menú del móvil. Un punto no altera la caja del
   enlace, a diferencia de una píldora de color. */
function Punto() {
    return <span className="h-[5px] w-[5px] rounded-full bg-accent-gold" aria-hidden />;
}

function CruzMedica({ claro }: { claro?: boolean }) {
    const color = claro ? '#fca5a5' : '#b91c1c';
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="9" y="2" width="6" height="20" rx="1.5" fill={color} />
            <rect x="2" y="9" width="20" height="6" rx="1.5" fill={color} />
        </svg>
    );
}
