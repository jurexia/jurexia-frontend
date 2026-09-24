'use client';

/**
 * El panel de administración.
 *
 * QUÉ SE ARREGLÓ (8-ago-2026)
 * ---------------------------
 * El panel anterior pedía casi todo a la API de Render —que duerme— y traía
 * las 1,972 cuentas al navegador para filtrarlas ahí. Abrirlo era esperar un
 * arranque en frío mirando una pantalla en blanco.
 *
 * Este habla con `/api/admin/panel`, que corre en Vercel contra Supabase.
 * Además:
 *
 *   · cada sección carga POR SEPARADO y sólo cuando se abre — entrar al panel
 *     no dispara siete consultas de las que se van a mirar dos;
 *   · la búsqueda y la paginación van al servidor: 50 filas, no dos mil;
 *   · cada respuesta muestra sus milisegundos. El panel viejo era lento y
 *     nadie sabía cuánto: lo que no se mide, se discute.
 *
 * El diseño sigue la casa —crema, carbón, oro— y el azul se reserva para lo
 * accionable, no para decorar.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import {
    LayoutDashboard, Users, CreditCard, Megaphone, LifeBuoy, ShieldAlert,
    Gem, Search, Loader2, ChevronLeft, ChevronRight, X, Check, RefreshCw, Scale, Star,
} from 'lucide-react';

type Seccion = 'resumen' | 'cuentas' | 'finanzas' | 'campanias' | 'soporte' | 'seguridad' | 'vitrina' | 'taller';

const SECCIONES: { id: Seccion; nombre: string; icono: typeof Users }[] = [
    { id: 'resumen', nombre: 'Resumen', icono: LayoutDashboard },
    { id: 'cuentas', nombre: 'Cuentas', icono: Users },
    { id: 'finanzas', nombre: 'Finanzas', icono: CreditCard },
    { id: 'campanias', nombre: 'Campañas', icono: Megaphone },
    { id: 'soporte', nombre: 'Soporte', icono: LifeBuoy },
    // EL AUDITOR DEL TALLER (24-sep-2026): quién lo usa, qué opina de sus
    // sentencias y qué le avisó la máquina, con banderas que se levantan solas.
    { id: 'taller', nombre: 'Taller', icono: Scale },
    { id: 'vitrina', nombre: 'Vitrina', icono: Gem },
    { id: 'seguridad', nombre: 'Seguridad', icono: ShieldAlert },
];

const PLANES = ['gratuito', 'basico_monthly', 'pro_monthly', 'pro_annual',
    'platinum_monthly', 'platinum_annual', 'ultra_secretarios'];

const NOMBRE_PLAN: Record<string, string> = {
    gratuito: 'Gratuito', basico_monthly: 'Básico', pro_monthly: 'Pro',
    pro_annual: 'Pro anual', platinum_monthly: 'Platinum',
    platinum_annual: 'Platinum anual', ultra_secretarios: 'Secretarios',
};

const dinero = (c: number) => `$${(c / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
const fecha = (s?: string | null) => s ? new Date(s).toLocaleDateString('es-MX',
    { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

/** Una cifra del tablero. Fuera del componente: definida dentro, React la
 *  remonta en cada render y el número parpadea. */
function Cifra({ etiqueta, valor, pie, acento }: {
    etiqueta: string; valor: string | number; pie?: string; acento?: 'oro' | 'azul' | 'rojo';
}) {
    const color = acento === 'oro' ? 'text-accent-gold'
        : acento === 'azul' ? 'text-blue-600'
        : acento === 'rojo' ? 'text-red-600' : 'text-charcoal-900';
    return (
        <div className="rounded-xl border border-cream-400 bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-1.5">{etiqueta}</p>
            <p className={`text-2xl font-medium tabular-nums ${color}`}>{valor}</p>
            {pie && <p className="text-xs text-charcoal-500 mt-1">{pie}</p>}
        </div>
    );
}

function Insignia({ texto, tono = 'neutro' }: { texto: string; tono?: 'neutro' | 'ok' | 'aviso' | 'malo' }) {
    const c = tono === 'ok' ? 'bg-green-50 text-green-800 border-green-200'
        : tono === 'aviso' ? 'bg-amber-50 text-amber-800 border-amber-200'
        : tono === 'malo' ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-cream-100 text-charcoal-700 border-cream-400';
    return <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${c}`}>{texto}</span>;
}

export default function PanelAdmin() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [seccion, setSeccion] = useState<Seccion>('resumen');
    // Cada sección guarda SU dato. Cambiar de pestaña no vuelve a pedir lo ya
    // traído, que era otra de las esperas del panel viejo.
    const [datos, setDatos] = useState<Record<string, any>>({});
    const [cargando, setCargando] = useState<Seccion | null>(null);
    const [error, setError] = useState('');

    const [busca, setBusca] = useState('');
    const [plan, setPlan] = useState('');
    const [pagina, setPagina] = useState(0);
    const [detalle, setDetalle] = useState<any>(null);
    const temporizador = useRef<any>(null);

    useEffect(() => {
        if (!loading && (!user || !isAdmin(user.email))) router.push('/');
    }, [loading, user, router]);

    const pedir = useCallback(async (s: Seccion, extra = '') => {
        setCargando(s); setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch(`/api/admin/panel?seccion=${s}${extra}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            const j = await r.json();
            if (!r.ok) { setError(j.error || 'Error'); return; }
            setDatos(d => ({ ...d, [s]: j }));
        } catch {
            setError('No se pudo conectar.');
        } finally {
            setCargando(null);
        }
    }, []);

    // Finanzas vive en su propia ruta porque su fuente es Stripe, no Supabase.
    // La cabecera no es opcional: esa ruta estuvo devolviendo el MRR de la
    // empresa a cualquiera hasta el 23-ago-2026, y al ponerle cerradura esta
    // llamada —la única de la página que no mandaba el token— se quedó fuera.
    const pedirFinanzas = useCallback(async () => {
        setCargando('finanzas'); setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch('/api/admin/finances', {
                headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
            });
            if (!r.ok) { setError(r.status === 401 ? 'Sesión no autorizada.' : 'No se pudo leer Stripe.'); return; }
            const j = await r.json();
            setDatos(d => ({ ...d, finanzas: j }));
        } catch { setError('No se pudo leer Stripe.'); }
        finally { setCargando(null); }
    }, []);

    useEffect(() => {
        if (!user || !isAdmin(user.email)) return;
        if (datos[seccion]) return;                 // ya está: no se vuelve a pedir
        if (seccion === 'finanzas') pedirFinanzas();
        else if (seccion !== 'cuentas') pedir(seccion);
    }, [seccion, user, datos, pedir, pedirFinanzas]);

    // Búsqueda con freno: se escribe «gonzález» y no se disparan ocho
    // consultas, una por letra.
    useEffect(() => {
        if (seccion !== 'cuentas' || !user || !isAdmin(user.email)) return;
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            pedir('cuentas', `&q=${encodeURIComponent(busca)}&plan=${plan}&pagina=${pagina}`);
        }, 300);
        return () => clearTimeout(temporizador.current);
    }, [seccion, busca, plan, pagina, user, pedir]);

    const actuar = async (cuerpo: any, recargar?: () => void) => {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch('/api/admin/panel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify(cuerpo),
        });
        if (!r.ok) { const j = await r.json(); setError(j.error || 'La acción falló'); return; }
        recargar?.();
    };

    const abrirCuenta = async (id: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch(`/api/admin/panel?seccion=cuenta&id=${id}`, {
            headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (r.ok) setDetalle(await r.json());
    };

    if (loading || !user || !isAdmin(user.email)) {
        return <div className="min-h-screen bg-cream-50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-charcoal-400" />
        </div>;
    }

    const d = datos[seccion];
    const ms = d?._ms;

    return (
        <div className="min-h-screen bg-cream-50">
            {/* Barra: una sola altura, un solo radio, sin óvalos. */}
            <header className="sticky top-0 z-20 bg-white border-b border-cream-400">
                <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center gap-4">
                    <span className="font-serif text-lg text-charcoal-900 shrink-0"
                        style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600 }}>
                        Iurexia
                    </span>
                    <span className="text-xs text-charcoal-500 shrink-0 hidden sm:inline">Administración</span>
                    <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
                        {SECCIONES.map(s => (
                            <button key={s.id} onClick={() => setSeccion(s.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                                    seccion === s.id ? 'bg-charcoal-900 text-cream-100'
                                                     : 'text-charcoal-700 hover:bg-cream-100'}`}>
                                <s.icono className="w-3.5 h-3.5" />
                                {s.nombre}
                            </button>
                        ))}
                    </nav>
                    <button onClick={() => { setDatos(x => ({ ...x, [seccion]: undefined })); }}
                        title="Volver a consultar"
                        className="p-2 rounded-lg text-charcoal-500 hover:bg-cream-100 shrink-0">
                        <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 py-6">
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {cargando === seccion && !d && (
                    <div className="flex items-center gap-2 text-charcoal-500 py-16 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" /> Consultando…
                    </div>
                )}

                {/* ── RESUMEN ────────────────────────────────────────────── */}
                {seccion === 'resumen' && d && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                            <Cifra etiqueta="Cuentas" valor={d.total.toLocaleString('es-MX')} />
                            <Cifra etiqueta="De pago" valor={d.pago} acento="oro"
                                pie={`${d.conversion}% de conversión`} />
                            <Cifra etiqueta="Activos 7 días" valor={d.activos7} acento="azul" />
                            <Cifra etiqueta="Nunca consultaron" valor={d.sinUsar} acento="rojo"
                                pie={`${d.fugaActivacion}% — fuga de activación`} />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                            <Cifra etiqueta="Altas 30 días" valor={d.nuevos30} />
                            <Cifra etiqueta="Soporte sin resolver" valor={d.feedbackAbierto}
                                acento={d.feedbackAbierto ? 'rojo' : undefined} />
                            <Cifra etiqueta="Vitrina por revisar" valor={d.vitrinaPend}
                                acento={d.vitrinaPend ? 'azul' : undefined} />
                            <Cifra etiqueta="Respuesta del panel" valor={`${ms} ms`} />
                        </div>
                        <div className="rounded-xl border border-cream-400 bg-white p-5">
                            <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-3">Reparto por plan</p>
                            <div className="space-y-2">
                                {Object.entries(d.planes as Record<string, number>)
                                    .sort((a, b) => b[1] - a[1]).map(([p, n]) => (
                                    <div key={p} className="flex items-center gap-3">
                                        <span className="text-sm text-charcoal-700 w-32 shrink-0">{NOMBRE_PLAN[p] ?? p}</span>
                                        <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                                            <div className="h-full bg-accent-gold rounded-full"
                                                style={{ width: `${(n / d.total) * 100}%` }} />
                                        </div>
                                        <span className="text-sm text-charcoal-900 tabular-nums w-14 text-right">{n}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ── CUENTAS ────────────────────────────────────────────── */}
                {seccion === 'cuentas' && (
                    <>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                                <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(0); }}
                                    placeholder="Buscar por correo o nombre…"
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-cream-400 bg-white text-sm" />
                            </div>
                            <select value={plan} onChange={e => { setPlan(e.target.value); setPagina(0); }}
                                className="px-3 py-2 rounded-lg border border-cream-400 bg-white text-sm">
                                <option value="">Todos los planes</option>
                                <option value="pago">Sólo de pago</option>
                                {PLANES.map(p => <option key={p} value={p}>{NOMBRE_PLAN[p]}</option>)}
                            </select>
                        </div>

                        {d && (
                            <>
                                <div className="flex items-center justify-between mb-2 text-xs text-charcoal-500">
                                    <span>{d.total.toLocaleString('es-MX')} cuentas · {ms} ms</span>
                                    <span className="flex items-center gap-1">
                                        <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}
                                            className="p-1 rounded disabled:opacity-30 hover:bg-cream-100"><ChevronLeft className="w-4 h-4" /></button>
                                        página {pagina + 1} de {Math.max(1, Math.ceil(d.total / d.porPagina))}
                                        <button disabled={(pagina + 1) * d.porPagina >= d.total} onClick={() => setPagina(p => p + 1)}
                                            className="p-1 rounded disabled:opacity-30 hover:bg-cream-100"><ChevronRight className="w-4 h-4" /></button>
                                    </span>
                                </div>
                                <div className="rounded-xl border border-cream-400 bg-white overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-[11px] uppercase tracking-wider text-accent-brown border-b border-cream-400">
                                                <th className="px-4 py-2.5 font-medium">Abogado</th>
                                                <th className="px-4 py-2.5 font-medium">Plan</th>
                                                <th className="px-4 py-2.5 font-medium">Consumo</th>
                                                <th className="px-4 py-2.5 font-medium">Estado</th>
                                                <th className="px-4 py-2.5 font-medium">Última consulta</th>
                                                <th className="px-4 py-2.5 font-medium">Alta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {d.filas.map((u: any) => (
                                                <tr key={u.id} onClick={() => abrirCuenta(u.id)}
                                                    className="border-b border-cream-200 last:border-0 hover:bg-cream-50 cursor-pointer">
                                                    <td className="px-4 py-2.5">
                                                        <span className="block text-charcoal-900">{u.full_name || '—'}</span>
                                                        <span className="block text-xs text-charcoal-500">{u.email}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5"><Insignia texto={NOMBRE_PLAN[u.subscription_type] ?? u.subscription_type}
                                                        tono={u.subscription_type === 'gratuito' ? 'neutro' : 'ok'} /></td>
                                                    <td className="px-4 py-2.5 tabular-nums text-charcoal-700">
                                                        {u.queries_used}/{u.queries_limit}</td>
                                                    <td className="px-4 py-2.5">
                                                        {u.is_active ? <Insignia texto="Activa" tono="ok" />
                                                                     : <Insignia texto="Inactiva" tono="malo" />}</td>
                                                    <td className="px-4 py-2.5 text-charcoal-700">{fecha(u.last_query_at)}</td>
                                                    <td className="px-4 py-2.5 text-charcoal-500">{fecha(u.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ── FINANZAS ───────────────────────────────────────────── */}
                {seccion === 'finanzas' && d && !d.error && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                            <Cifra etiqueta="Ingreso mensual" valor={dinero(d.mrr ?? 0)} acento="oro"
                                pie="MRR según Stripe" />
                            <Cifra etiqueta="Suscripciones activas" valor={d.active_count ?? 0} />
                            <Cifra etiqueta="Proyección anual" valor={dinero((d.mrr ?? 0) * 12)} />
                            <Cifra etiqueta="Ingreso por cuenta" valor={d.active_count ? dinero((d.mrr ?? 0) / d.active_count) : '—'} />
                        </div>
                        {d.by_plan && (
                            <div className="rounded-xl border border-cream-400 bg-white p-5">
                                <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-3">Por plan</p>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {Object.entries(d.by_plan as Record<string, any>).map(([k, v]: any) => (
                                            <tr key={k} className="border-b border-cream-200 last:border-0">
                                                <td className="py-2 text-charcoal-900">{k}</td>
                                                <td className="py-2 text-charcoal-700 tabular-nums text-right">{v.count ?? v}</td>
                                                <td className="py-2 text-charcoal-900 tabular-nums text-right">
                                                    {typeof v.total === 'number' ? dinero(v.total) : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
                {seccion === 'finanzas' && d?.error && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Stripe no respondió: {d.error}
                    </div>
                )}

                {/* ── CAMPAÑAS ───────────────────────────────────────────── */}
                {seccion === 'campanias' && d && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                            <Cifra etiqueta="Correos registrados" valor={Object.values(d.porCampania as any)
                                .reduce((s: number, c: any) => s + c.enviados, 0)} />
                            <Cifra etiqueta="Campañas distintas" valor={Object.keys(d.porCampania).length} />
                            <Cifra etiqueta="Bajas totales" valor={d.bajas} acento={d.bajas ? 'rojo' : undefined} />
                        </div>
                        <div className="rounded-xl border border-cream-400 bg-white overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-wider text-accent-brown border-b border-cream-400">
                                        <th className="px-4 py-2.5 font-medium">Campaña</th>
                                        <th className="px-4 py-2.5 font-medium text-right">Enviados</th>
                                        <th className="px-4 py-2.5 font-medium text-right">Fallidos</th>
                                        <th className="px-4 py-2.5 font-medium text-right">Último envío</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(d.porCampania as Record<string, any>)
                                        .sort((a, b) => b[1].enviados - a[1].enviados).map(([n, c]) => (
                                        <tr key={n} className="border-b border-cream-200 last:border-0">
                                            <td className="px-4 py-2.5 text-charcoal-900">{n}</td>
                                            <td className="px-4 py-2.5 tabular-nums text-right">{c.enviados}</td>
                                            <td className={`px-4 py-2.5 tabular-nums text-right ${c.fallidos ? 'text-red-600' : 'text-charcoal-500'}`}>{c.fallidos}</td>
                                            <td className="px-4 py-2.5 text-right text-charcoal-500">{fecha(c.ultimo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ── SOPORTE ────────────────────────────────────────────── */}
                {seccion === 'soporte' && d && (
                    <div className="space-y-3">
                        {d.filas.length === 0 && (
                            <p className="text-charcoal-500 text-sm py-12 text-center">Nada pendiente.</p>
                        )}
                        {d.filas.map((f: any) => (
                            <div key={f.id} className="rounded-xl border border-cream-400 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Insignia texto={f.category || 'sin categoría'} />
                                    <Insignia texto={f.status}
                                        tono={f.status === 'resuelto' ? 'ok' : f.status === 'nuevo' ? 'aviso' : 'neutro'} />
                                    <span className="text-xs text-charcoal-500 ml-auto">{fecha(f.created_at)}</span>
                                </div>
                                <p className="text-sm text-charcoal-900 mb-2 whitespace-pre-wrap">{f.message}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
                                    <span>{f.user_name || '—'} · {f.user_email}</span>
                                    {f.status !== 'resuelto' && (
                                        <button onClick={() => actuar(
                                            { tipo: 'soporte_estado', feedback_id: f.id, estado: 'resuelto' },
                                            () => setDatos(x => ({ ...x, soporte: undefined })))}
                                            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-charcoal-900 text-cream-100">
                                            <Check className="w-3 h-3" /> Marcar resuelto
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TALLER: EL AUDITOR ─────────────────────────────────────
                    David (24-sep-2026): «un auditor para verificar la
                    experiencia de todos los usuarios para aprovechar la
                    calidad de sus sentencias». Tres fuentes cruzadas: lo que
                    hizo cada secretario, lo que dijo de sus sentencias y lo
                    que la máquina le avisó en cada proyecto. */}
                {seccion === 'taller' && d && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Cifra etiqueta="Secretarios" valor={d.cifras.usuarios}
                                pie={`${d.cifras.clientes} clientes · ${d.cifras.activos7} activos en 7 días`} />
                            <Cifra etiqueta="Proyectos" valor={d.cifras.proyectos} acento="oro"
                                pie={`${d.cifras.proyectos7} en los últimos 7 días`} />
                            <Cifra etiqueta="Firmables con poca corrección"
                                valor={d.opiniones.firmables === null ? '—' : `${d.opiniones.firmables}%`}
                                acento="azul"
                                pie={`${d.opiniones.total} opinión(es) · media ${d.opiniones.califMedia ?? '—'}/5`} />
                            <Cifra etiqueta="Clientes con bandera roja" valor={d.cifras.conBandera}
                                acento={d.cifras.conBandera ? 'rojo' : undefined}
                                pie={`${d.cifras.proyectosAuditados} proyectos auditados`} />
                        </div>

                        {/* QUÉ OPINAN DE SUS SENTENCIAS, aspecto por aspecto */}
                        <div className="rounded-xl border border-cream-400 bg-white p-5">
                            <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-3">
                                Qué opinan de sus sentencias
                            </p>
                            {d.opiniones.total === 0 ? (
                                <p className="text-sm text-charcoal-700">
                                    Todavía no hay opiniones. Se piden solas al terminar cada proyecto.
                                </p>
                            ) : (
                                <div className="grid gap-5 lg:grid-cols-2">
                                    <div className="space-y-2">
                                        {d.opiniones.aspectos.map((a: any) => {
                                            const tot = a.bien + a.mejorar;
                                            return (
                                                <div key={a.clave} className="flex items-center gap-3">
                                                    <span className="text-sm text-charcoal-700 w-32 shrink-0">{a.etiqueta}</span>
                                                    <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden flex">
                                                        {tot > 0 && <div className="h-full bg-green-600" style={{ width: `${(a.bien / tot) * 100}%` }} />}
                                                        {tot > 0 && <div className="h-full bg-red-500" style={{ width: `${(a.mejorar / tot) * 100}%` }} />}
                                                    </div>
                                                    <span className="text-xs tabular-nums w-24 text-right text-charcoal-700">
                                                        {tot ? `${a.bien} bien · ${a.mejorar} mejorar` : 'sin datos'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div>
                                        <p className="text-sm text-charcoal-700 mb-2">Cuánto tuvieron que corregir para firmar</p>
                                        {(['nada', 'poco', 'mucho', 'rehecho'] as const).map((k) => {
                                            const n = d.opiniones.correccion[k] || 0;
                                            const tot = Object.values(d.opiniones.correccion as Record<string, number>).reduce((x, y) => x + y, 0) || 1;
                                            return (
                                                <div key={k} className="flex items-center gap-3 mb-1.5">
                                                    <span className="text-sm text-charcoal-700 w-28 shrink-0">
                                                        {{ nada: 'Nada', poco: 'Poco', mucho: 'Mucho', rehecho: 'Lo rehízo' }[k]}
                                                    </span>
                                                    <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                                                        <div className={`h-full rounded-full ${k === 'nada' || k === 'poco' ? 'bg-accent-gold' : 'bg-charcoal-700'}`}
                                                            style={{ width: `${(n / tot) * 100}%` }} />
                                                    </div>
                                                    <span className="text-sm tabular-nums w-8 text-right text-charcoal-900">{n}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CADA SECRETARIO, con sus banderas */}
                        <div className="rounded-xl border border-cream-400 bg-white overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-wider text-accent-brown border-b border-cream-400">
                                        <th className="px-4 py-3">Cuenta</th>
                                        <th className="px-3 py-3">Plan</th>
                                        <th className="px-3 py-3 text-right">Proyectos</th>
                                        <th className="px-3 py-3 text-right">Último uso</th>
                                        <th className="px-3 py-3 text-right">Le quedan</th>
                                        <th className="px-3 py-3 text-right">Opinión</th>
                                        <th className="px-4 py-3">Banderas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.usuarios.map((u: any) => (
                                        <tr key={u.email} className="border-b border-cream-200 align-top">
                                            <td className="px-4 py-3">
                                                <p className="text-charcoal-900">{u.email.split('@')[0]}</p>
                                                <p className="text-xs text-charcoal-700">
                                                    {u.expedientes} expediente(s){u.delPiloto ? ' · piloto' : ''}
                                                </p>
                                            </td>
                                            <td className="px-3 py-3 text-charcoal-700">{NOMBRE_PLAN[u.plan] ?? u.plan}</td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                <span className="text-charcoal-900">{u.proyectos}</span>
                                                <span className="block text-xs text-charcoal-700">{u.proyectos7} en 7 d</span>
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                <span className={u.diasSinUso >= 7 && !u.sinLimite ? 'text-red-600' : 'text-charcoal-900'}>
                                                    {u.diasSinUso === 0 ? 'hoy' : `hace ${u.diasSinUso} d`}
                                                </span>
                                                <span className="block text-xs text-charcoal-700">{fecha(u.ultimoUso)}</span>
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {u.restantes === null ? <span className="text-charcoal-700">sin tope</span> : (
                                                    <>
                                                        <span className={u.restantes <= 1 ? 'text-red-600' : 'text-charcoal-900'}>{u.restantes}</span>
                                                        <span className="block text-xs text-charcoal-700">
                                                            mes {u.mesUsados}/{u.mesLimite}{u.recargados ? ` · +${u.recargados}` : ''}
                                                        </span>
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums text-charcoal-900">
                                                {u.opiniones ? `${u.califMedia ?? '—'}/5` : '—'}
                                                {u.opiniones > 0 && <span className="block text-xs text-charcoal-700">{u.opiniones} opinión(es)</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                                                    {u.banderas.map((b: any) => (
                                                        <Insignia key={b.clave} texto={b.texto}
                                                            tono={b.tono === 'malo' ? 'malo' : b.tono === 'aviso' ? 'aviso' : 'neutro'} />
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* LO QUE AVISA LA MÁQUINA, por familia */}
                        <div className="rounded-xl border border-cream-400 bg-white p-5">
                            <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-1">
                                Lo que avisa la máquina
                            </p>
                            <p className="text-xs text-charcoal-700 mb-3">
                                Los avisos que el propio pipeline puso en cada proyecto, agrupados. Lo que se repite en
                                muchos proyectos es un defecto del redactor, no del asunto.
                            </p>
                            <div className="space-y-1.5">
                                {d.avisos.map((a: any) => (
                                    <div key={a.familia} className="flex items-center gap-3" title={a.ejemplo}>
                                        <span className="text-sm tabular-nums w-10 text-right text-charcoal-900">{a.proyectos}</span>
                                        <div className="w-24 h-1.5 rounded-full bg-cream-200 overflow-hidden shrink-0">
                                            <div className="h-full bg-accent-brown"
                                                style={{ width: `${(a.proyectos / Math.max(1, d.cifras.proyectosAuditados)) * 100}%` }} />
                                        </div>
                                        <span className="text-sm text-charcoal-900 flex-1 min-w-0 truncate">{a.familia}</span>
                                        <span className="text-xs text-charcoal-700 shrink-0">{a.usuarios} usuario(s)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LAS OPINIONES, tal como las escribieron */}
                        {d.recientes.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[11px] uppercase tracking-wider text-accent-brown">Opiniones recientes</p>
                                {d.recientes.map((o: any) => (
                                    <div key={`${o.email}-${o.expediente}-${o.version}`} className="rounded-xl border border-cream-400 bg-white p-4">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-sm font-medium text-charcoal-900">{o.cuenta}</span>
                                            <span className="text-xs text-charcoal-700">
                                                {o.expediente} · v{o.version}{o.tipo_asunto ? ` · ${o.tipo_asunto.replace(/_/g, ' ')}` : ''}
                                                {o.sentido ? ` · ${o.sentido.replace(/_/g, ' ')}` : ''}
                                            </span>
                                            {o.calificacion && (
                                                <span className="inline-flex items-center gap-0.5 ml-2">
                                                    {[1, 2, 3, 4, 5].map((i) => (
                                                        <Star key={i} className={`w-3.5 h-3.5 ${i <= o.calificacion ? 'fill-accent-gold text-accent-gold' : 'text-cream-500'}`} />
                                                    ))}
                                                </span>
                                            )}
                                            {o.correccion && (
                                                <Insignia texto={`corrección: ${o.correccion === 'rehecho' ? 'lo rehízo' : o.correccion}`}
                                                    tono={o.correccion === 'nada' || o.correccion === 'poco' ? 'ok' : 'malo'} />
                                            )}
                                            <span className="text-xs text-charcoal-700 ml-auto">
                                                {o.dias === 0 ? 'hoy' : `hace ${o.dias} d`} · {o.avisos_n} aviso(s) de la máquina
                                            </span>
                                        </div>
                                        {Object.keys(o.aspectos || {}).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {Object.entries(o.aspectos as Record<string, string>).map(([k, v]) => (
                                                    <Insignia key={k} texto={`${k}: ${v === 'bien' ? 'bien' : 'a mejorar'}`}
                                                        tono={v === 'bien' ? 'ok' : 'aviso'} />
                                                ))}
                                            </div>
                                        )}
                                        {o.sobre_sentencia && (
                                            <p className="text-sm text-charcoal-900 whitespace-pre-wrap mb-1.5">
                                                <span className="text-xs uppercase tracking-wider text-accent-brown mr-1.5">Sentencia</span>
                                                {o.sobre_sentencia}
                                            </p>
                                        )}
                                        {o.sobre_taller && (
                                            <p className="text-sm text-charcoal-900 whitespace-pre-wrap">
                                                <span className="text-xs uppercase tracking-wider text-accent-brown mr-1.5">Taller</span>
                                                {o.sobre_taller}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── VITRINA ────────────────────────────────────────────── */}
                {seccion === 'vitrina' && d && (
                    <div className="space-y-4">
                        {d.filas.length === 0 && (
                            <p className="text-charcoal-500 text-sm py-12 text-center">
                                Todavía nadie ha autorizado aparecer.
                            </p>
                        )}
                        {d.filas.map((v: any) => (
                            <div key={v.id} className="rounded-xl border border-cream-400 bg-white p-5">
                                <div className="flex flex-wrap items-start gap-4">
                                    {v.foto_url && (
                                        <img src={v.foto_url} alt="" className="w-16 h-16 rounded-full object-cover border border-cream-400" />
                                    )}
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="text-charcoal-900 font-medium">{v.perfil?.full_name}</p>
                                        <p className="text-xs text-charcoal-500">
                                            {v.despacho || 'sin despacho'} · {v.cargo || '—'} · {v.perfil?.estado}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <Insignia texto={v.estado} tono={v.estado === 'publicada' ? 'ok' : v.estado === 'pendiente' ? 'aviso' : 'neutro'} />
                                            {v.consiente_nombre && <Insignia texto="nombre" />}
                                            {v.consiente_testimonio && <Insignia texto="testimonio" />}
                                            {v.consiente_foto && <Insignia texto="foto" />}
                                            {v.consiente_logo && <Insignia texto="logo" />}
                                            {v.revocado_at && <Insignia texto="REVOCADA" tono="malo" />}
                                        </div>
                                    </div>
                                    {v.logo_url && (
                                        <img src={v.logo_url} alt="" className="h-12 object-contain" />
                                    )}
                                </div>
                                {v.testimonio && (
                                    <blockquote className="mt-3 pl-3 border-l-2 border-accent-gold text-sm text-charcoal-700 italic">
                                        {v.testimonio}
                                    </blockquote>
                                )}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {['aprobada', 'publicada', 'rechazada'].map(e => (
                                        <button key={e} disabled={v.estado === e || !!v.revocado_at}
                                            onClick={() => actuar({ tipo: 'vitrina_estado', id: v.usuario_id, estado: e },
                                                () => setDatos(x => ({ ...x, vitrina: undefined })))}
                                            className="px-3 py-1.5 rounded-lg border border-cream-400 text-xs font-medium text-charcoal-700 hover:bg-cream-100 disabled:opacity-40">
                                            {e === 'aprobada' ? 'Aprobar' : e === 'publicada' ? 'Publicar' : 'Rechazar'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── SEGURIDAD ──────────────────────────────────────────── */}
                {seccion === 'seguridad' && d && (
                    <div className="space-y-2">
                        {d.filas.length === 0 && (
                            <p className="text-charcoal-500 text-sm py-12 text-center">Sin alertas por revisar.</p>
                        )}
                        {d.filas.map((a: any) => (
                            <div key={a.id} className="rounded-xl border border-cream-400 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <Insignia texto={a.alert_type} tono={a.severity === 'alta' ? 'malo' : 'aviso'} />
                                    <span className="text-xs text-charcoal-500">{a.user_email}</span>
                                    <span className="text-xs text-charcoal-500 ml-auto">{fecha(a.created_at)}</span>
                                </div>
                                <p className="text-sm text-charcoal-700">{a.query_text}</p>
                                <button onClick={() => actuar({ tipo: 'alerta_revisada', alerta_id: a.id },
                                    () => setDatos(x => ({ ...x, seguridad: undefined })))}
                                    className="mt-2 text-xs px-2.5 py-1 rounded-lg bg-charcoal-900 text-cream-100">
                                    Marcar revisada
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ── Ficha de una cuenta ─────────────────────────────────────── */}
            {detalle && (
                <div className="fixed inset-0 z-30 bg-charcoal-900/40 flex justify-end" onClick={() => setDetalle(null)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg bg-cream-50 h-full overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-cream-400 px-5 h-14 flex items-center justify-between">
                            <span className="font-medium text-charcoal-900">Ficha de la cuenta</span>
                            <button onClick={() => setDetalle(null)} className="p-2 rounded-lg hover:bg-cream-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="rounded-xl border border-cream-400 bg-white p-4">
                                <p className="text-charcoal-900 font-medium">{detalle.perfil?.full_name}</p>
                                <p className="text-sm text-charcoal-500">{detalle.perfil?.email}</p>
                                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                    <div><span className="text-charcoal-500">Plan</span><br />
                                        {NOMBRE_PLAN[detalle.perfil?.subscription_type] ?? '—'}</div>
                                    <div><span className="text-charcoal-500">Consumo</span><br />
                                        {detalle.perfil?.queries_used}/{detalle.perfil?.queries_limit}</div>
                                    <div><span className="text-charcoal-500">Conversaciones</span><br />{detalle.convs}</div>
                                    <div><span className="text-charcoal-500">Estado</span><br />{detalle.perfil?.estado || '—'}</div>
                                    <div><span className="text-charcoal-500">Alta</span><br />{fecha(detalle.perfil?.created_at)}</div>
                                    <div><span className="text-charcoal-500">Última consulta</span><br />{fecha(detalle.perfil?.last_query_at)}</div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-cream-400 bg-white p-4">
                                <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-3">Acciones</p>
                                <div className="flex flex-wrap gap-2">
                                    <select defaultValue="" onChange={e => e.target.value && actuar(
                                        { tipo: 'cambiar_plan', id: detalle.perfil.id, plan: e.target.value },
                                        () => { abrirCuenta(detalle.perfil.id); setDatos(x => ({ ...x, cuentas: undefined })); })}
                                        className="px-3 py-1.5 rounded-lg border border-cream-400 bg-white text-sm">
                                        <option value="">Cambiar plan…</option>
                                        {PLANES.map(p => <option key={p} value={p}>{NOMBRE_PLAN[p]}</option>)}
                                    </select>
                                    <button onClick={() => actuar({ tipo: 'reiniciar_consumo', id: detalle.perfil.id },
                                        () => abrirCuenta(detalle.perfil.id))}
                                        className="px-3 py-1.5 rounded-lg border border-cream-400 text-sm hover:bg-cream-100">
                                        Reiniciar consumo
                                    </button>
                                    <button onClick={() => actuar(
                                        { tipo: detalle.perfil.is_active ? 'desactivar' : 'activar', id: detalle.perfil.id },
                                        () => { abrirCuenta(detalle.perfil.id); setDatos(x => ({ ...x, cuentas: undefined })); })}
                                        className="px-3 py-1.5 rounded-lg border border-cream-400 text-sm hover:bg-cream-100">
                                        {detalle.perfil?.is_active ? 'Desactivar' : 'Activar'}
                                    </button>
                                </div>
                                <p className="text-xs text-charcoal-500 mt-3">
                                    Cambiar el plan aquí mueve las capacidades en Supabase; NO toca su
                                    suscripción de Stripe ni le cobra nada. Queda asentado en el registro
                                    de auditoría con su correo.
                                </p>
                            </div>

                            {detalle.referidos?.length > 0 && (
                                <div className="rounded-xl border border-cream-400 bg-white p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-2">Referidos</p>
                                    <p className="text-sm text-charcoal-700">
                                        {detalle.referidos.length} invitados ·{' '}
                                        {detalle.referidos.filter((r: any) => r.activado_at).length} activos
                                    </p>
                                </div>
                            )}

                            {detalle.premios?.length > 0 && (
                                <div className="rounded-xl border border-cream-400 bg-white p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-2">Premios otorgados</p>
                                    {detalle.premios.map((p: any) => (
                                        <p key={p.id} className="text-sm text-charcoal-700">
                                            {NOMBRE_PLAN[p.plan_premio] ?? p.plan_premio} hasta {fecha(p.vence_at)}
                                            {p.revertido_at ? ' · revertido' : ''}
                                            <span className="text-charcoal-500"> (vuelve a {NOMBRE_PLAN[p.plan_previo] ?? p.plan_previo})</span>
                                        </p>
                                    ))}
                                </div>
                            )}

                            {detalle.feedback?.length > 0 && (
                                <div className="rounded-xl border border-cream-400 bg-white p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-2">Soporte</p>
                                    {detalle.feedback.map((f: any) => (
                                        <p key={f.id} className="text-sm text-charcoal-700 mb-1">
                                            <span className="text-charcoal-500">{fecha(f.created_at)}</span> — {f.message?.slice(0, 120)}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {detalle.envios?.length > 0 && (
                                <div className="rounded-xl border border-cream-400 bg-white p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-accent-brown mb-2">Correos recibidos</p>
                                    {detalle.envios.map((e: any, i: number) => (
                                        <p key={i} className="text-sm text-charcoal-700">
                                            {e.campania} · <span className="text-charcoal-500">{fecha(e.enviado_at)}</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
