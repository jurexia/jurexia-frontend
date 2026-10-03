'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, FileText, Gavel, MoreHorizontal, Newspaper, Plus } from 'lucide-react';

import ChatSidebar from '@/components/ChatSidebar';
import NuevaCarpetaModal from '@/components/NuevaCarpetaModal';
import { UserAvatar } from '@/components/UserAvatar';
import { estadoPiloto } from '@/components/sentencia/api';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { useAuth } from '@/lib/useAuth';
import { deleteConversation, getConversations, updateConversationTitle, type Conversation } from '@/lib/conversations';
import { getVinculos, vincularConsulta, type Vinculos } from '@/lib/consultas-carpeta';
import { getExpedientes, type Expediente } from '@/lib/expedientes';
import { saldoFlujos } from '@/lib/flujo-agente';

/* ═══ LA BARRA DE TRABAJO, FUERA DEL CHAT (3-oct-2026) ═══
   David: «aún se ve la anterior barra en algunas partes». El chat estrenó el
   25-sep su barra de trabajo —la lateral con carpetas y consultas, y arriba
   Mi trabajo · Lo último · Normativa · Redactor PJF—, pero sus propios botones
   llevaban a páginas que seguían con la barra pública de la web (Plataforma,
   Soluciones, Precios…): quien pulsaba «Mi trabajo» salía de la plataforma sin
   haberlo pedido.

   Esto es esa misma barra para las demás páginas de la plataforma. La lateral
   es el MISMO componente del chat (ChatSidebar), no una copia: lo que cambie
   allí cambia aquí. Lo que en el chat ocurre dentro de la página —abrir una
   consulta, empezar otra, los flujos— aquí lleva al chat con la URL que el
   chat ya entiende (`?c=`, `?carpeta=`, `?flujos=1`).

   Lo monta `<Navbar plataforma />` cuando hay sesión. El contenido de la página
   no se toca: la clase `con-barra-trabajo` en <html> le hace sitio a la lateral
   (globals.css) y esconde lo que sólo es de la web pública (el pie). */

type Memoria = { uid: string; conversations: Conversation[]; carpetas: Expediente[] | null; vinculos: Vinculos };

/* Al pasar de una página de la plataforma a otra la barra se vuelve a montar.
   Para que no parpadee vacía, se recuerda lo último que se cargó (sólo en
   memoria, y sólo del mismo usuario) mientras llega lo nuevo. */
let memoria: Memoria | null = null;

const BOTON = 'relative inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg text-[0.8125rem] font-medium transition-colors';

export default function MarcoTrabajo() {
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const { user, profile } = useAuth();
    const uid = user?.id ?? '';
    const previa = memoria && memoria.uid === uid ? memoria : null;

    const [conversations, setConversations] = useState<Conversation[]>(previa?.conversations ?? []);
    const [carpetas, setCarpetas] = useState<Expediente[] | null>(previa?.carpetas ?? null);
    const [vinculos, setVinculos] = useState<Vinculos>(previa?.vinculos ?? {});
    const [nuevaCarpeta, setNuevaCarpeta] = useState<{ abierta: boolean; paraConsulta?: string }>({ abierta: false });
    const [menuMas, setMenuMas] = useState(false);
    const [accesoServidor, setAccesoServidor] = useState<boolean | null>(null);

    // Le hace sitio a la lateral en el resto de la página (ver globals.css).
    useEffect(() => {
        const raiz = document.documentElement;
        raiz.classList.add('con-barra-trabajo');
        return () => raiz.classList.remove('con-barra-trabajo');
    }, []);

    const guardar = useRef((parcial: Partial<Omit<Memoria, 'uid'>>) => {
        memoria = { ...(memoria ?? { uid, conversations: [], carpetas: null, vinculos: {} }), ...parcial, uid };
    });
    guardar.current = (parcial) => {
        const base = memoria && memoria.uid === uid ? memoria : { uid, conversations: [], carpetas: null, vinculos: {} };
        memoria = { ...base, ...parcial, uid };
    };

    const cargar = useCallback(async () => {
        try {
            const convs = await getConversations();
            setConversations(convs);
            guardar.current({ conversations: convs });
        } catch { /* se queda lo que había */ }
        try {
            const v = await getVinculos();
            if (v === null) {
                setCarpetas(null);
                setVinculos({});
                guardar.current({ carpetas: null, vinculos: {} });
                return;
            }
            let cs: Expediente[] = [];
            try { cs = await getExpedientes(); } catch { /* sin carpetas */ }
            setVinculos(v);
            setCarpetas(cs);
            guardar.current({ carpetas: cs, vinculos: v });
        } catch { /* sin carpetas */ }
    }, []);

    useEffect(() => {
        if (uid) void cargar();
    }, [uid, cargar]);

    // El Redactor PJF: la misma regla que el chat (perfil y, si contesta, el servidor).
    useEffect(() => {
        const correo = user?.email;
        if (!correo) return;
        let vigente = true;
        estadoPiloto(correo)
            .then((e) => { if (vigente) setAccesoServidor(!!e.tiene_acceso); })
            .catch(() => { /* se queda la regla del perfil */ });
        return () => { vigente = false; };
    }, [user?.email]);
    const accesoLocal = isAdmin(user?.email)
        || profile?.can_access_sentencia === true
        || profile?.subscription_type === 'ultra_secretarios'
        || (!!profile && (profile.proyectos_prueba_usados ?? 0) < 1);
    const accesoPJF = accesoServidor ?? accesoLocal;
    const rutaPJF = accesoPJF ? '/tcc-beta' : '/secretarios';

    // ── Lo que en el chat pasa dentro de la página, aquí lleva al chat ──
    const abrirConsulta = useCallback((id: string) => router.push(`/chat?c=${encodeURIComponent(id)}`), [router]);
    const nuevaConsulta = useCallback(
        (expedienteId?: string | null) => router.push(expedienteId ? `/chat?carpeta=${encodeURIComponent(expedienteId)}` : '/chat'),
        [router]
    );
    const abrirFlujos = useCallback(() => router.push('/chat?flujos=1'), [router]);
    const eliminar = useCallback(async (id: string) => {
        await deleteConversation(id);
        const resto = await getConversations();
        setConversations(resto);
        guardar.current({ conversations: resto });
    }, []);
    const renombrar = useCallback(async (id: string, titulo: string) => {
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: titulo } : c)));
        const ok = await updateConversationTitle(id, titulo);
        if (!ok) setConversations(await getConversations());
    }, []);
    const mover = useCallback(async (id: string, expedienteId: string | null) => {
        let previo: Vinculos[string] | undefined;
        setVinculos((prev) => {
            previo = prev[id];
            return { ...prev, [id]: { expedienteId, flujo: prev[id]?.flujo ?? null } };
        });
        const ok = await vincularConsulta(id, { expedienteId });
        if (!ok) {
            setVinculos((prev) => {
                const sig = { ...prev };
                if (previo) sig[id] = previo;
                else delete sig[id];
                return sig;
            });
        }
    }, []);
    const pedirCarpeta = useCallback((paraConsulta?: string) => setNuevaCarpeta({ abierta: true, paraConsulta }), []);

    const saldo = isAdmin(user?.email)
        ? { usados: 0, limite: 0, restantes: 0, ilimitado: true }
        : { ...saldoFlujos(profile), ilimitado: false };

    // La carpeta que se está viendo, para que la lateral la abra y la marque.
    const carpetaActivaId = pathname.startsWith('/carpetas/') ? decodeURIComponent(pathname.split('/')[2] ?? '') || null : null;

    const usadas = profile?.queries_used ?? 0;
    const limite = profile?.queries_limit ?? 0;
    const quedan = Math.max(0, limite - usadas);

    const enTrabajo = pathname === '/carpetas' || pathname.startsWith('/carpetas/');
    const enUltimo = pathname.startsWith('/ultimo');
    const enNormativa = pathname.startsWith('/normativa');

    return (
        <>
            <ChatSidebar
                conversations={conversations}
                activeConversationId={null}
                onSelectConversation={abrirConsulta}
                onNewConversation={nuevaConsulta}
                onDeleteConversation={eliminar}
                carpetas={carpetas}
                vinculos={vinculos}
                carpetaActivaId={carpetaActivaId}
                onMoverConsulta={mover}
                onRenombrarConsulta={renombrar}
                onAbrirFlujos={abrirFlujos}
                onNuevaCarpeta={pedirCarpeta}
                saldoFlujos={saldo}
            />

            {/* El encabezado del chat, con las mismas medidas: h-14, controles de
                h-8 y un solo radio. En el teléfono deja sitio a la izquierda
                para el botón que abre la lateral. */}
            <header className="fixed left-0 right-0 top-0 z-30 h-14 border-b border-black/5 bg-cream-300/80 backdrop-blur-md transition-[left] duration-300 md:left-[var(--sidebar-w,18rem)]">
                <div className="flex h-full min-w-0 items-center justify-between gap-2 pl-14 pr-3 sm:pr-4 md:pl-4">
                    <nav aria-label="Herramientas" className="flex min-w-0 items-center gap-1.5">
                        <Link
                            href="/carpetas"
                            aria-current={enTrabajo ? 'page' : undefined}
                            title="Mi trabajo"
                            className={`${BOTON} bg-charcoal-900 px-2.5 text-white hover:bg-charcoal-800 sm:px-3`}
                        >
                            <FileText className="h-3.5 w-3.5 text-accent-gold" />
                            <span className="hidden sm:inline">Mi trabajo</span>
                            {enTrabajo && <Activo />}
                        </Link>
                        <Link
                            href="/ultimo"
                            aria-current={enUltimo ? 'page' : undefined}
                            title="Lo último — Corte, tesis de la semana, Diario Oficial e IA"
                            className={`${BOTON} border border-accent-gold/40 bg-accent-gold/10 px-2.5 text-charcoal-900 hover:bg-accent-gold/20 sm:px-3`}
                        >
                            <Newspaper className="h-3.5 w-3.5 text-accent-gold" />
                            <span className="hidden sm:inline">Lo último</span>
                            {enUltimo && <Activo />}
                        </Link>
                        <Link
                            href="/normativa"
                            aria-current={enNormativa ? 'page' : undefined}
                            title="Normativa"
                            className={`${BOTON} hidden border border-charcoal-900/10 px-3 text-charcoal-800 hover:border-charcoal-900/25 hover:bg-charcoal-900/[0.03] md:inline-flex`}
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Normativa
                            {enNormativa && <Activo />}
                        </Link>
                        <Link
                            href={rutaPJF}
                            title={accesoPJF ? 'Redactor PJF — crea un proyecto de sentencia' : 'Redactor PJF — del plan Ultra Secretarios'}
                            className={`${BOTON} hidden bg-charcoal-900 px-3 text-white hover:bg-charcoal-800 md:inline-flex`}
                        >
                            <Gavel className="h-3.5 w-3.5 text-accent-gold" />
                            Redactor PJF
                        </Link>

                        {/* Lo que no cabe en el teléfono */}
                        <div className="relative md:hidden">
                            <button
                                type="button"
                                onClick={() => setMenuMas((v) => !v)}
                                aria-label="Más herramientas"
                                aria-expanded={menuMas}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-charcoal-900/10 text-charcoal-900/70 transition-colors hover:bg-charcoal-900/[0.04]"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuMas && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuMas(false)} />
                                    <div className="absolute left-0 top-9 z-50 w-52 overflow-hidden rounded-xl border border-charcoal-900/10 bg-white shadow-lg">
                                        <Link
                                            href="/normativa"
                                            onClick={() => setMenuMas(false)}
                                            className="flex items-center gap-2.5 px-3.5 py-3 text-[0.8125rem] font-medium text-charcoal-800 transition-colors hover:bg-charcoal-900/[0.04]"
                                        >
                                            <BookOpen className="h-4 w-4 text-charcoal-900/50" />
                                            Normativa
                                        </Link>
                                        <Link
                                            href={rutaPJF}
                                            onClick={() => setMenuMas(false)}
                                            className="flex items-center gap-2.5 border-t border-charcoal-900/[0.06] px-3.5 py-3 text-[0.8125rem] font-medium text-charcoal-800 transition-colors hover:bg-charcoal-900/[0.04]"
                                        >
                                            <Gavel className={`h-4 w-4 ${accesoPJF ? 'text-accent-gold' : 'text-charcoal-900/50'}`} />
                                            Redactor PJF
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </nav>

                    <div className="flex min-w-0 items-center gap-1.5">
                        <Link
                            href="/salvame"
                            title="Sálvame — ayuda urgente"
                            className={`${BOTON} border border-red-700/25 bg-red-50/60 px-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-red-700 hover:bg-red-50`}
                        >
                            <Plus className="h-3.5 w-3.5 stroke-[3]" />
                            <span className="hidden lg:inline">Sálvame</span>
                        </Link>
                        {limite > 0 && (
                            <div
                                className="hidden h-8 shrink-0 items-center gap-2 rounded-lg border border-charcoal-900/10 px-3 text-[0.8125rem] lg:flex"
                                title={`Consultas usadas este mes: ${usadas} de ${limite}`}
                            >
                                <span className={`font-semibold tabular-nums ${quedan <= 1 ? 'text-red-700' : 'text-charcoal-900'}`}>
                                    {usadas}
                                    <span className="font-normal text-charcoal-900/50">/{limite}</span>
                                </span>
                                <span className="h-1 w-10 overflow-hidden rounded-full bg-charcoal-900/10">
                                    <span
                                        className={`block h-full rounded-full ${quedan <= 1 ? 'bg-red-600' : 'bg-accent-gold'}`}
                                        style={{ width: `${Math.min(100, (usadas / Math.max(1, limite)) * 100)}%` }}
                                    />
                                </span>
                            </div>
                        )}
                        <UserAvatar />
                    </div>
                </div>
            </header>

            <NuevaCarpetaModal
                abierto={nuevaCarpeta.abierta}
                onCerrar={() => setNuevaCarpeta({ abierta: false })}
                onCreada={(exp) => {
                    const para = nuevaCarpeta.paraConsulta;
                    setNuevaCarpeta({ abierta: false });
                    setCarpetas((prev) => [exp, ...(prev ?? [])]);
                    // Como en el chat: desde el menú de una consulta, la consulta
                    // se va adentro; si no, se empieza a trabajar en la carpeta nueva.
                    if (para) void mover(para, exp.id);
                    else nuevaConsulta(exp.id);
                }}
            />
        </>
    );
}

/* La herramienta en la que se está: una raya de oro al pie del botón, que cae
   sobre el borde inferior del encabezado, como la pestaña activa de la web. */
function Activo() {
    return <span aria-hidden className="pointer-events-none absolute -bottom-[12px] left-1 right-1 h-[2px] rounded-full bg-accent-gold" />;
}
