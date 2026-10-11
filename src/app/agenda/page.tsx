'use client';

/* IUREXIA AGENDA (11-oct-2026). David: «iurexia/agenda (botón en el chat) muy
   moderna con dibujos de arte de fondo, calendarios hojeables y avisos al correo
   del abogado en automático».

   · El arte: los grabados de /web/arte. El pórtico detrás de la cabecera, Temis
     al costado y uno distinto en cada hoja del calendario.
   · Los términos viven en Supabase (`agenda_terminos`, RLS). La fecha la calcula
     la API con las reglas del código; el acuerdo lo lee /agenda/extraer.
   · Los avisos los manda /api/cron/agenda cada mañana (7:00, hora de la CDMX)
     a los días que el abogado eligió para cada término. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Mail, Plus } from 'lucide-react';
import { useAuth, useRequireAuth } from '@/lib/useAuth';
import CalendarioHojeable from '@/components/agenda/CalendarioHojeable';
import NuevoTermino from '@/components/agenda/NuevoTermino';
import Tarjeta from '@/components/agenda/TarjetaTermino';
import { diasEntre, fechaLarga, hoyISO, listarTerminos, type Termino } from '@/lib/agenda';

export default function AgendaPage() {
    useRequireAuth('/login?next=/agenda');
    const { user, profile, loading } = useAuth();
    const [terminos, setTerminos] = useState<Termino[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [dia, setDia] = useState<string | null>(null);
    const [nuevo, setNuevo] = useState(false);
    const [verCumplidos, setVerCumplidos] = useState(false);
    const estado = (profile as { estado?: string } | null)?.estado || undefined;

    const cargar = useCallback(async () => {
        try { setTerminos(await listarTerminos()); setError(''); }
        catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar su agenda'); }
        finally { setCargando(false); }
    }, []);
    useEffect(() => { if (!loading && user) cargar(); }, [loading, user, cargar]);
    useEffect(() => {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('nuevo') === '1') setNuevo(true);
    }, []);

    const hoy = hoyISO();
    const pendientes = useMemo(() => terminos.filter((t) => t.estado === 'pendiente'), [terminos]);
    const vencenHoy = pendientes.filter((t) => t.vencimiento === hoy).length;
    const semana = pendientes.filter((t) => { const n = diasEntre(hoy, t.vencimiento); return n >= 0 && n <= 7; }).length;
    const vencidos = pendientes.filter((t) => t.vencimiento < hoy);
    const proximos = pendientes.filter((t) => t.vencimiento >= hoy);
    const delDia = dia ? terminos.filter((t) => t.vencimiento === dia) : [];
    const cumplidos = terminos.filter((t) => t.estado === 'cumplido');

    return (
        <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#efe9dc]">
            {/* El arte de fondo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/web/arte/portico.webp" alt="" className="pointer-events-none fixed inset-x-0 top-0 h-[46vh] w-full object-cover opacity-30" />
            <div className="pointer-events-none fixed inset-x-0 top-0 h-[46vh] bg-gradient-to-b from-transparent via-[#efe9dc]/60 to-[#efe9dc]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/web/arte/themis.webp" alt="" className="pointer-events-none fixed bottom-0 right-0 hidden h-[78vh] opacity-[0.10] lg:block" />

            <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                    <Link href="/chat" className="relieve relieve-papel inline-flex items-center gap-1.5 px-3">
                        <ArrowLeft className="h-3.5 w-3.5" /> Chat
                    </Link>
                    <button type="button" onClick={() => setNuevo(true)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-900 px-4 py-2 text-[13px] font-semibold text-white shadow-lg hover:bg-charcoal-800">
                        <Plus className="h-4 w-4" /> Nuevo término
                    </button>
                </div>

                <header className="mt-6 sm:mt-10">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-accent-brown">Iurexia</p>
                    <h1 className="font-serif text-4xl leading-tight text-charcoal-900 sm:text-5xl">Agenda</h1>
                    <p className="mt-1 max-w-xl text-[14px] text-gray-700">
                        Sus términos, contados con las reglas de su código y su artículo. Suba la foto del acuerdo y nosotros lo agendamos.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${vencenHoy ? 'bg-red-600 text-white' : 'bg-white/80 text-gray-700 ring-1 ring-charcoal-900/10'}`}>
                            {vencenHoy} {vencenHoy === 1 ? 'vence' : 'vencen'} hoy
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-medium text-gray-700 ring-1 ring-charcoal-900/10">{semana} en los próximos 7 días</span>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-medium text-gray-700 ring-1 ring-charcoal-900/10">{pendientes.length} pendientes</span>
                        {user?.email && (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[12px] text-gray-600 ring-1 ring-charcoal-900/10">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">Avisos a {user.email}</span>
                            </span>
                        )}
                    </div>
                </header>

                {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <section aria-label="Calendario">
                        <CalendarioHojeable terminos={terminos} seleccionado={dia} onElegir={(iso) => setDia(iso === dia ? null : iso)} />
                        <p className="mt-2 text-center text-[11px] text-gray-500">Deslice o use ← → para hojear · toque un día para ver sus términos</p>
                    </section>

                    <section aria-label="Términos" className="space-y-5">
                        {dia && (
                            <div>
                                <h2 className="mb-2 font-serif text-lg capitalize text-charcoal-900">{fechaLarga(dia)}</h2>
                                {delDia.length ? <div className="space-y-2">{delDia.map((t) => <Tarjeta key={t.id} t={t} onCambio={cargar} />)}</div>
                                    : <p className="rounded-2xl bg-white/70 px-4 py-3 text-[13px] text-gray-600">Nada vence este día.</p>}
                            </div>
                        )}
                        {vencidos.length > 0 && (
                            <div>
                                <h2 className="mb-2 font-serif text-lg text-red-800">Vencidos sin marcar</h2>
                                <div className="space-y-2">{vencidos.map((t) => <Tarjeta key={t.id} t={t} onCambio={cargar} />)}</div>
                            </div>
                        )}
                        <div>
                            <h2 className="mb-2 font-serif text-lg text-charcoal-900">Próximos vencimientos</h2>
                            {cargando ? <p className="text-[13px] text-gray-500">Cargando…</p>
                                : proximos.length ? <div className="space-y-2">{proximos.slice(0, 30).map((t) => <Tarjeta key={t.id} t={t} onCambio={cargar} />)}</div>
                                    : (
                                        <div className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-charcoal-900/10">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src="/web/arte/escritorio.webp" alt="" className="h-32 w-full object-cover opacity-80" />
                                            <div className="p-4">
                                                <p className="text-[14px] font-semibold">Su agenda está en blanco</p>
                                                <p className="mt-1 text-[13px] text-gray-600">Suba la foto o el PDF del último acuerdo: leemos el plazo, lo contamos con su código y le avisamos por correo antes de que venza.</p>
                                                <button type="button" onClick={() => setNuevo(true)} className="mt-3 rounded-full bg-charcoal-900 px-4 py-2 text-[13px] font-semibold text-white">Agendar un acuerdo</button>
                                            </div>
                                        </div>
                                    )}
                        </div>
                        {cumplidos.length > 0 && (
                            <div>
                                <button type="button" onClick={() => setVerCumplidos(!verCumplidos)} className="flex items-center gap-1 text-[13px] text-gray-600">
                                    <ChevronDown className={`h-4 w-4 transition-transform ${verCumplidos ? 'rotate-180' : ''}`} /> Cumplidos ({cumplidos.length})
                                </button>
                                {verCumplidos && <div className="mt-2 space-y-2">{cumplidos.slice(-30).reverse().map((t) => <Tarjeta key={t.id} t={t} onCambio={cargar} />)}</div>}
                            </div>
                        )}
                        <p className="text-[11px] leading-snug text-gray-500">
                            El cómputo aplica las reglas del código elegido (cuándo surte efectos la notificación, días inhábiles legales). No conoce las vacaciones ni las suspensiones de labores de cada tribunal: verifíquelas. Iurexia no sustituye la revisión del expediente.
                        </p>
                    </section>
                </div>
            </div>
            <NuevoTermino abierto={nuevo} onCerrar={() => setNuevo(false)} onGuardado={cargar} estado={estado} />
        </div>
    );
}
