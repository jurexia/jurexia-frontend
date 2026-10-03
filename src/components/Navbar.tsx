'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, MessageSquare, FileText, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
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

/* «Estudiar y pensar» (3-oct-2026): las lecciones del canal de YouTube con su
   material de lectura. Lleva el punto de sección nueva.

   CON SEIS ENLACES LA FILA YA NO CABE A 1024 PX (medido: el bloque de la
   derecha acababa en 1090 px; con sesión son siete enlaces). Por eso la barra
   completa aparece desde 1280 (xl) y por debajo queda el menú. El nombre
   entero se lee desde 1360 px; antes, «Estudiar». Con sesión abierta siempre
   «Estudiar»: con «Mis carpetas» son siete enlaces y la fila mide 1,216 px
   como máximo (max-w-7xl), a cualquier ancho de pantalla. */
const ENLACES: { href: string; etiqueta: string; corta?: string; destacado?: boolean }[] = [
    { href: '/plataforma', etiqueta: 'Plataforma' },
    { href: '/soluciones', etiqueta: 'Soluciones' },
    { href: '/connect', etiqueta: 'Connect', destacado: true },
    { href: '/precios', etiqueta: 'Precios' },
    { href: '/seguridad', etiqueta: 'Seguridad' },
    { href: '/estudiar', etiqueta: 'Estudiar y pensar', corta: 'Estudiar', destacado: true },
];

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

    /* En claro = texto blanco sobre el vídeo. Con el menú abierto nunca, porque
       el panel desplegable es crema y el texto tiene que verse. */
    const enClaro = sobreOscuro && !anclada && !isMenuOpen;

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

    useEffect(() => setIsMenuOpen(false), [pathname]);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    if (plataforma) {
        if (isLoading) return null;
        if (isLoggedIn) return <MarcoTrabajo />;
    }

    const enlaces = isLoggedIn
        ? [...ENLACES, { href: '/carpetas', etiqueta: 'Mis carpetas' }]
        : ENLACES;

    const fondoBarra = enClaro
        ? 'bg-transparent border-transparent'
        : anclada
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

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${fondoBarra}`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Tres columnas: los extremos ocupan lo mismo (1fr) y el centro
                    sólo lo que necesita, así el menú queda centrado de verdad
                    respecto a la página —no respecto a lo que sobre a los lados,
                    que es lo que descuadraba la barra anterior. */}
                <div className="grid h-16 grid-cols-[auto_1fr] items-center gap-4 xl:h-[72px] xl:grid-cols-[1fr_auto_1fr]">

                    {/* ── Izquierda: marca + Sálvame ── */}
                    <div className="flex items-center gap-3 justify-self-start">
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

                    {/* ── Centro: navegación ── */}
                    <div className="hidden items-center justify-self-center xl:flex">
                        {enlaces.map((e) => (
                            <EnlaceNav
                                key={e.href}
                                href={e.href}
                                activo={pathname === e.href || pathname?.startsWith(e.href + '/')}
                                destacado={e.destacado}
                                claro={enClaro}
                            >
                                {e.corta ? (
                                    isLoggedIn ? e.corta : (
                                        <>
                                            <span className="min-[1360px]:hidden">{e.corta}</span>
                                            <span className="hidden min-[1360px]:inline">{e.etiqueta}</span>
                                        </>
                                    )
                                ) : e.etiqueta}
                            </EnlaceNav>
                        ))}
                    </div>

                    {/* ── Derecha: dos acciones, siempre dos ── */}
                    <div className="hidden items-center gap-2 justify-self-end xl:flex">
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
                transparentaba detrás de los enlaces y el menú se leía sucio. */}
            <div
                className={`overflow-hidden border-t border-charcoal-900/[0.07] bg-cream-200 shadow-[0_12px_24px_-12px_rgba(26,26,26,0.12)] transition-[max-height,opacity] duration-300 ease-out xl:hidden ${
                    isMenuOpen ? 'max-h-[calc(100vh-4rem)] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
                }`}
            >
                <div className="mx-auto max-w-7xl overflow-y-auto px-4 pb-6 pt-2 sm:px-6">

                    <div className="flex flex-col">
                        {enlaces.map((e) => (
                            <Link
                                key={e.href}
                                href={e.href}
                                className={`flex h-12 items-center justify-between border-b border-charcoal-900/[0.06] text-[1.0625rem] transition-colors ${
                                    pathname === e.href
                                        ? 'font-semibold text-charcoal-900'
                                        : 'font-medium text-charcoal-700 hover:text-charcoal-900'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {e.etiqueta}
                                    {e.destacado && <Punto />}
                                </span>
                                {pathname === e.href && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" aria-hidden />
                                )}
                            </Link>
                        ))}
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

/* Enlace del menú. El subrayado se dibuja en un elemento aparte, con posición
   absoluta: aparece y desaparece sin mover ni un píxel del texto, así el ancho
   del menú no baila al pasar el ratón. */
function EnlaceNav({
    href,
    children,
    activo,
    destacado,
    claro,
}: {
    href: string;
    children: React.ReactNode;
    activo?: boolean;
    destacado?: boolean;
    claro?: boolean;
}) {
    const color = claro
        ? activo ? 'text-white' : 'text-white/70 hover:text-white'
        : activo ? 'text-charcoal-900' : 'text-charcoal-700 hover:text-charcoal-900';

    return (
        <Link
            href={href}
            aria-current={activo ? 'page' : undefined}
            className={`group relative flex ${ALTO_CONTROL} ${TEXTO} items-center whitespace-nowrap px-3.5 transition-colors duration-200 ${color}`}
        >
            <span className="flex items-center gap-1.5">
                {children}
                {destacado && <Punto />}
            </span>
            <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-3.5 bottom-0 h-[1.5px] origin-left rounded-full bg-accent-gold transition-transform duration-200 ease-out ${
                    activo ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}
            />
        </Link>
    );
}

/* Señal de sección nueva. Un punto no altera la caja del enlace, a diferencia
   de una píldora de color, que rompía el ritmo de la fila. */
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
