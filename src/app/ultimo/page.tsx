'use client';

/**
 * «Lo último» — lo que se publicó mientras el abogado trabajaba.
 *
 * Cuatro apartados sobre la misma tabla `noticias`, que es la que ya alimenta
 * la app: comunicados de la Corte, las tesis de la semana en el Semanario, el
 * Diario Oficial y lo que pasa en inteligencia artificial.
 *
 * POR QUÉ SE ORDENA POR `orden` Y NO POR FECHA. Porque la fecha no está en
 * todas: de los 4,196 comunicados de la Corte sólo 490 la traen. En las cuatro
 * fuentes `orden` sí es un número que crece con el tiempo —el id del
 * comunicado, el registro digital de la tesis, el código de nota del DOF, la
 * marca de tiempo de la noticia—, así que ordenar por él da el orden real
 * incluso donde la fecha falta.
 *
 * El acopio de cada fuente vive fuera de esta pantalla; aquí sólo se lee.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, ArrowUpRight, BookOpen, Building2, Cpu, Landmark,
    Loader2, Search, X,
} from 'lucide-react';

type Noticia = {
    id: string;
    fuente: string;
    titulo: string;
    resumen: string | null;
    url: string;
    fecha: string | null;
    orden: number | null;
};

type Apartado = {
    clave: string;
    rotulo: string;          // lo que se lee en la pestaña
    corto: string;           // en móvil, donde no cabe el rótulo entero
    icono: React.ElementType;
    pie: string;             // qué es esto, bajo el título
    origen: string;          // de dónde sale, para que se pueda cotejar
};

const APARTADOS: Apartado[] = [
    {
        clave: 'SCJN',
        rotulo: 'Suprema Corte',
        corto: 'Corte',
        icono: Landmark,
        pie: 'Comunicados y resoluciones de la Suprema Corte de Justicia de la Nación.',
        origen: 'scjn.gob.mx',
    },
    {
        clave: 'SJF',
        rotulo: 'Tesis de la semana',
        corto: 'Tesis',
        icono: BookOpen,
        pie: 'Lo que el Semanario Judicial de la Federación publicó esta semana.',
        origen: 'sjf2.scjn.gob.mx',
    },
    {
        clave: 'DOF',
        rotulo: 'Diario Oficial',
        corto: 'DOF',
        icono: Building2,
        pie: 'Normas nuevas y reformas publicadas en el Diario Oficial de la Federación. Sin edictos ni avisos judiciales.',
        origen: 'sidof.segob.gob.mx',
    },
    {
        clave: 'IA',
        rotulo: 'Inteligencia artificial',
        corto: 'IA',
        icono: Cpu,
        pie: 'Lo que se mueve en inteligencia artificial, por si toca a tu práctica.',
        origen: 'prensa especializada',
    },
];

const POR_TANDA = 25;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «2026-09-02» → {dia:'02', mes:'sep'}. Sin `new Date`, que corre la fecha
    un día hacia atrás en México al interpretarla como UTC. */
function partesFecha(f: string | null) {
    const m = (f || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { dia: m[3], mes: MESES[Number(m[2]) - 1], anio: m[1] };
}

/** Comparación laxa: sin tildes, sin puntuación y en minúsculas. */
function llana(t: string) {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Los comunicados de la Corte traen el resumen empezando por el título otra
 * vez, en mayúsculas sostenidas, y sólo después el cuerpo. Repetido bajo el
 * título de la tarjeta ocupa las dos líneas visibles sin decir nada nuevo, así
 * que se recorta ese arranque y se deja lo que sigue.
 */
function cuerpo(titulo: string, resumen: string | null): string | null {
    if (!resumen) return null;
    const r = resumen.trim();
    const t = llana(titulo);
    if (t.length > 15 && llana(r).startsWith(t)) {
        // Se corta por palabras para no partir el texto a media letra.
        const sobra = r.split(/\s+/);
        const cuantas = titulo.trim().split(/\s+/).length;
        const resto = sobra.slice(cuantas).join(' ').replace(/^[\s:·—-]+/, '');
        if (resto.length > 30) return resto;
    }
    return r;
}

function esDeHoy(f: string | null) {
    if (!f) return false;
    const h = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return f === `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

export default function LoUltimoPage() {
    const [activo, setActivo] = useState('DOF');
    const [busqueda, setBusqueda] = useState('');
    const [filas, setFilas] = useState<Noticia[]>([]);
    const [cargando, setCargando] = useState(true);
    const [trayendoMas, setTrayendoMas] = useState(false);
    const [hayMas, setHayMas] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cada búsqueda y cada cambio de pestaña abre una petición nueva; sin esto,
    // la respuesta lenta de la pestaña anterior pisa a la de la actual.
    const peticion = useRef(0);

    const apartado = useMemo(
        () => APARTADOS.find(a => a.clave === activo) ?? APARTADOS[0],
        [activo],
    );

    const traer = useCallback(async (desde: number, termino: string, fuente: string) => {
        const mia = ++peticion.current;
        if (desde === 0) { setCargando(true); setError(null); }
        else setTrayendoMas(true);

        let q = supabase
            .from('noticias')
            .select('id,fuente,titulo,resumen,url,fecha,orden')
            .eq('fuente', fuente)
            .order('orden', { ascending: false, nullsFirst: false })
            .range(desde, desde + POR_TANDA - 1);

        const t = termino.trim();
        if (t) q = q.ilike('titulo', `%${t}%`);

        const { data, error } = await q;
        if (mia !== peticion.current) return;   // llegó tarde: ya no interesa

        if (error) {
            setError('No se pudo traer la lista. Vuelve a intentarlo en un momento.');
        } else {
            const recibidas = (data ?? []) as Noticia[];
            setFilas(prev => (desde === 0 ? recibidas : [...prev, ...recibidas]));
            setHayMas(recibidas.length === POR_TANDA);
        }
        setCargando(false);
        setTrayendoMas(false);
    }, []);

    // Al cambiar de pestaña se recarga de inmediato; al teclear se espera un
    // momento, para no lanzar una consulta por letra.
    useEffect(() => {
        const espera = busqueda.trim() ? 300 : 0;
        const t = setTimeout(() => { traer(0, busqueda, activo); }, espera);
        return () => clearTimeout(t);
    }, [activo, busqueda, traer]);

    return (
        <main className="min-h-screen bg-cream-300">
            {/* ── Cabecera ── */}
            <div className="border-b border-charcoal-900/[0.07] bg-cream-300/85 backdrop-blur-md sticky top-0 z-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6">
                    <div className="flex items-center gap-3 pt-5">
                        <Link
                            href="/chat"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-charcoal-900/10 text-charcoal-600 transition-colors hover:bg-charcoal-900/[0.04]"
                            aria-label="Volver al chat"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="font-serif text-2xl font-bold leading-none text-charcoal-900 sm:text-3xl">
                                Lo último
                            </h1>
                        </div>
                    </div>

                    {/* ── Pestañas ── */}
                    <div
                        role="tablist"
                        aria-label="Apartados"
                        className="mt-4 -mx-4 flex gap-1 overflow-x-auto px-4 pb-px sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {APARTADOS.map(a => {
                            const Icono = a.icono;
                            const es = a.clave === activo;
                            return (
                                <button
                                    key={a.clave}
                                    role="tab"
                                    aria-selected={es}
                                    onClick={() => { setActivo(a.clave); setBusqueda(''); }}
                                    className={`relative inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-2.5 text-[0.8125rem] font-medium transition-colors sm:px-4 ${es
                                        ? 'text-charcoal-900'
                                        : 'text-charcoal-500 hover:text-charcoal-800'
                                        }`}
                                >
                                    <Icono className={`h-4 w-4 ${es ? 'text-accent-gold' : 'text-charcoal-400'}`} />
                                    <span className="hidden sm:inline">{a.rotulo}</span>
                                    <span className="sm:hidden">{a.corto}</span>
                                    {/* La barra corre bajo la pestaña activa en vez de
                                        aparecer y desaparecer: se sigue con la vista. */}
                                    <span
                                        className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-gold transition-all duration-300 ${es ? 'opacity-100' : 'opacity-0'
                                            }`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
                {/* ── Qué es este apartado, y buscador ── */}
                <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <p className="max-w-xl text-sm leading-relaxed text-charcoal-600">
                        {apartado.pie}{' '}
                        <span className="text-charcoal-400">Fuente: {apartado.origen}.</span>
                    </p>

                    <div className="relative shrink-0 sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal-400" />
                        <input
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar en este apartado"
                            className="h-9 w-full rounded-lg border border-charcoal-900/10 bg-white pl-8 pr-8 text-[0.8125rem] text-charcoal-900 placeholder:text-charcoal-400 focus:border-accent-gold/50 focus:outline-none focus:ring-2 focus:ring-accent-gold/15"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                aria-label="Limpiar la búsqueda"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-charcoal-400 transition-colors hover:text-charcoal-700"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Lista ── */}
                {cargando ? (
                    <ul className="space-y-2" aria-busy>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <li
                                key={i}
                                className="flex gap-4 rounded-xl border border-charcoal-900/[0.06] bg-white p-4"
                                style={{ opacity: 1 - i * 0.13 }}
                            >
                                <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-charcoal-900/[0.06]" />
                                <div className="min-w-0 flex-1 space-y-2 py-0.5">
                                    <div className="h-3 w-3/4 animate-pulse rounded bg-charcoal-900/[0.07]" />
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-charcoal-900/[0.05]" />
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 text-center">
                        <p className="text-sm text-red-800">{error}</p>
                        <button
                            onClick={() => traer(0, busqueda, activo)}
                            className="mt-3 rounded-lg bg-charcoal-900 px-4 py-2 text-xs font-semibold text-white hover:bg-charcoal-800"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : filas.length === 0 ? (
                    <div className="rounded-xl border border-charcoal-900/[0.07] bg-white p-10 text-center">
                        <p className="font-serif text-lg text-charcoal-900">
                            {busqueda.trim() ? 'Sin coincidencias' : 'Todavía no hay nada aquí'}
                        </p>
                        <p className="mt-1.5 text-sm text-charcoal-500">
                            {busqueda.trim()
                                ? <>Nada que contenga «{busqueda.trim()}» en {apartado.rotulo.toLowerCase()}.</>
                                : 'En cuanto se publique algo aparecerá en esta lista.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-2">
                            {filas.map((n, i) => {
                                const f = partesFecha(n.fecha);
                                const hoy = esDeHoy(n.fecha);
                                return (
                                    <li key={n.id}>
                                        <a
                                            href={n.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex gap-4 rounded-xl border border-charcoal-900/[0.06] bg-white p-4 transition-all duration-200 hover:border-accent-gold/40 hover:shadow-[0_6px_24px_-12px_rgba(26,26,26,0.25)]"
                                            style={{
                                                // Escalonado corto en la primera tanda: se
                                                // percibe que la lista llega, no que parpadea.
                                                animation: i < POR_TANDA
                                                    ? `entra 320ms ease-out ${Math.min(i, 12) * 28}ms both`
                                                    : undefined,
                                            }}
                                        >
                                            {/* Sello de fecha */}
                                            <div
                                                className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center leading-none ${hoy
                                                    ? 'border-accent-gold/45 bg-accent-gold/10'
                                                    : 'border-charcoal-900/[0.08] bg-cream-200'
                                                    }`}
                                            >
                                                {f ? (
                                                    <>
                                                        <span className="text-[0.9rem] font-bold tabular-nums text-charcoal-900">{f.dia}</span>
                                                        <span className="mt-0.5 text-[0.5625rem] uppercase tracking-wide text-charcoal-500">{f.mes}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[0.5625rem] uppercase tracking-wide text-charcoal-400">s/f</span>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-[0.9375rem] font-medium leading-snug text-charcoal-900 transition-colors group-hover:text-accent-brown">
                                                    {n.titulo}
                                                </p>
                                                {cuerpo(n.titulo, n.resumen) && (
                                                    <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-charcoal-500">
                                                        {cuerpo(n.titulo, n.resumen)}
                                                    </p>
                                                )}
                                                {hoy && (
                                                    <span className="mt-2 inline-flex items-center gap-1 rounded border border-accent-gold/35 bg-accent-gold/10 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent-brown">
                                                        Hoy
                                                    </span>
                                                )}
                                            </div>

                                            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-gold" />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>

                        {hayMas && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => traer(filas.length, busqueda, activo)}
                                    disabled={trayendoMas}
                                    className="inline-flex items-center gap-2 rounded-lg border border-charcoal-900/12 bg-white px-5 py-2.5 text-[0.8125rem] font-medium text-charcoal-800 transition-colors hover:border-accent-gold/45 hover:bg-accent-gold/[0.06] disabled:opacity-60"
                                >
                                    {trayendoMas && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {trayendoMas ? 'Trayendo…' : 'Ver más'}
                                </button>
                            </div>
                        )}

                        {!hayMas && filas.length > POR_TANDA && (
                            <p className="mt-6 text-center text-xs text-charcoal-400">
                                Has llegado al final de lo que tenemos guardado en este apartado.
                            </p>
                        )}
                    </>
                )}
            </div>

            <style jsx global>{`
                @keyframes entra {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: none; }
                }
                @media (prefers-reduced-motion: reduce) {
                    @keyframes entra { from { opacity: 1; } to { opacity: 1; } }
                }
            `}</style>
        </main>
    );
}
