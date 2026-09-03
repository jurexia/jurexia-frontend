'use client';

/**
 * Alta de un expediente en seguimiento, en tres pasos.
 *
 * EL TERCER PASO NO ES UN ADORNO. El mismo número vive en muchos órganos a la
 * vez: el 71/2026 existe en Baja California y en Querétaro, con partes y NEUN
 * distintos, y el 250/2026 del mismo tribunal es a la vez una queja y un amparo
 * directo. Por eso no se da de alta a ciegas: se consulta el portal, se enseña
 * la carátula real con los últimos acuerdos, y sólo cuando el abogado dice «sí,
 * es este» se guarda. Sin ese paso, la mitad de las altas seguirían el asunto
 * de otro.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, Check, FolderClosed, Loader2, Search, X,
} from 'lucide-react';

type Organo = {
    id: number; jurisdiccion: string; clave_externa: string;
    nombre: string; entidad: string | null; familia: string | null;
};

type Tipo = { clave_externa: string; nombre: string };

type Caratula = {
    caratula: { organo: string | null; neun: string | null; expediente: string | null };
    organo: string;
    n_acuerdos: number;
    ultimos: { fecha_auto: string | null; cuaderno: string | null; resumen: string }[];
};

export default function SeguirExpediente(
    { abierto, cerrar, alGuardar }:
    { abierto: boolean; cerrar: () => void; alGuardar: () => void },
) {
    const [paso, setPaso] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [organos, setOrganos] = useState<Organo[]>([]);
    const [organo, setOrgano] = useState<Organo | null>(null);
    const [tipos, setTipos] = useState<Tipo[]>([]);
    const [tipo, setTipo] = useState('');
    const [numero, setNumero] = useState('');
    const [alias, setAlias] = useState('');
    const [caratula, setCaratula] = useState<Caratula | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const peticion = useRef(0);

    const reiniciar = useCallback(() => {
        setPaso(1); setBusqueda(''); setOrganos([]); setOrgano(null);
        setTipos([]); setTipo(''); setNumero(''); setAlias('');
        setCaratula(null); setError(null); setOcupado(false);
    }, []);

    useEffect(() => { if (!abierto) reiniciar(); }, [abierto, reiniciar]);

    // Búsqueda de órganos, con un respiro para no lanzar una consulta por letra.
    useEffect(() => {
        if (busqueda.trim().length < 3) { setOrganos([]); return; }
        const mia = ++peticion.current;
        const t = setTimeout(async () => {
            const r = await fetch(
                `/api/seguimiento/organos?jurisdiccion=PJF&q=${encodeURIComponent(busqueda)}`);
            const d = await r.json();
            if (mia === peticion.current) setOrganos(d.organos ?? []);
        }, 300);
        return () => clearTimeout(t);
    }, [busqueda]);

    // Los tipos de asunto dependen de la FAMILIA del órgano: un colegiado conoce
    // de amparo directo y un juzgado de distrito de amparo indirecto. Ofrecer la
    // lista equivocada es la primera forma de dar de alta un expediente que
    // nunca se va a encontrar.
    useEffect(() => {
        if (!organo) return;
        (async () => {
            const { data } = await supabase.from('seg_tipos_asunto')
                .select('clave_externa,nombre')
                .eq('jurisdiccion', 'PJF')
                .eq('familia', organo.familia || 'juzgado_distrito')
                .order('orden');
            const lista = (data ?? []) as Tipo[];
            setTipos(lista);
            setTipo(lista[0]?.clave_externa || '1');
        })();
    }, [organo]);

    async function consultar() {
        setOcupado(true); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch('/api/seguimiento/alta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',
                           Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ accion: 'consultar',
                    organismo: organo!.clave_externa, expediente: numero.trim(),
                    tipo_asunto: tipo }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d.error || 'No se pudo consultar'); return; }
            setCaratula(d);
            if (!alias.trim()) setAlias(`${numero.trim()} · ${d.organo}`.slice(0, 60));
            setPaso(3);
        } catch {
            setError('No se pudo hablar con el portal. Inténtalo en un momento.');
        } finally { setOcupado(false); }
    }

    async function confirmar() {
        setOcupado(true); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch('/api/seguimiento/alta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',
                           Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ accion: 'confirmar',
                    organismo: organo!.clave_externa, expediente: numero.trim(),
                    tipo_asunto: tipo, alias: alias.trim() }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d.error || 'No se pudo guardar'); return; }
            alGuardar();
            cerrar();
        } catch {
            setError('No se pudo guardar. Inténtalo en un momento.');
        } finally { setOcupado(false); }
    }

    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-charcoal-900/50 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-lg rounded-2xl border border-cream-400 bg-white shadow-2xl">
                {/* Cabecera */}
                <div className="flex items-center justify-between border-b border-cream-400 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        {paso > 1 && (
                            <button onClick={() => { setPaso(paso - 1); setError(null); }}
                                className="rounded p-1 text-charcoal-400 hover:text-charcoal-700"
                                aria-label="Atrás">
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}
                        <h3 className="font-serif text-lg font-semibold text-charcoal-900">
                            Seguir un expediente
                        </h3>
                        <span className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-[10px] text-charcoal-500">
                            {paso} de 3
                        </span>
                    </div>
                    <button onClick={cerrar} className="rounded p-1 text-charcoal-400 hover:text-charcoal-700"
                        aria-label="Cerrar">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-5 py-5">
                    {/* ── 1 · ¿Ante quién? ── */}
                    {paso === 1 && (
                        <>
                            <label className="mb-1.5 block text-sm font-medium text-charcoal-800">
                                ¿Ante qué órgano?
                            </label>
                            <p className="mb-3 text-xs text-charcoal-500">
                                Escribe parte del nombre: «primero distrito baja california».
                                Por ahora, órganos del Poder Judicial de la Federación.
                            </p>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
                                <input
                                    autoFocus value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    placeholder="Buscar juzgado o tribunal"
                                    className="h-10 w-full rounded-lg border border-cream-500 bg-white pl-9 pr-3 text-sm focus:border-accent-gold focus:outline-none focus:ring-2 focus:ring-accent-gold/20"
                                />
                            </div>
                            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                                {organos.map(o => (
                                    <li key={o.id}>
                                        <button
                                            onClick={() => { setOrgano(o); setPaso(2); }}
                                            className="w-full rounded-lg border border-cream-400 px-3 py-2.5 text-left text-sm text-charcoal-800 transition-colors hover:border-accent-gold/50 hover:bg-accent-gold/[0.06]"
                                        >
                                            {o.nombre}
                                        </button>
                                    </li>
                                ))}
                                {busqueda.trim().length >= 3 && !organos.length && (
                                    <li className="px-1 py-3 text-sm text-charcoal-500">
                                        Nada con esas palabras. Prueba con menos.
                                    </li>
                                )}
                            </ul>
                        </>
                    )}

                    {/* ── 2 · ¿Cuál? ── */}
                    {paso === 2 && organo && (
                        <>
                            <p className="mb-4 rounded-lg bg-cream-100 px-3 py-2 text-xs text-charcoal-600">
                                {organo.nombre}
                            </p>
                            <label className="mb-1.5 block text-sm font-medium text-charcoal-800">
                                Número de expediente
                            </label>
                            <input
                                autoFocus value={numero}
                                onChange={e => setNumero(e.target.value)}
                                placeholder="71/2026"
                                className="h-10 w-full rounded-lg border border-cream-500 px-3 font-mono text-sm focus:border-accent-gold focus:outline-none focus:ring-2 focus:ring-accent-gold/20"
                            />
                            <label className="mb-1.5 mt-4 block text-sm font-medium text-charcoal-800">
                                Tipo de asunto
                            </label>
                            <select
                                value={tipo} onChange={e => setTipo(e.target.value)}
                                className="h-10 w-full rounded-lg border border-cream-500 bg-white px-3 text-sm focus:border-accent-gold focus:outline-none"
                            >
                                {tipos.map(t => (
                                    <option key={t.clave_externa} value={t.clave_externa}>
                                        {t.nombre}
                                    </option>
                                ))}
                            </select>
                            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
                            <button
                                onClick={consultar}
                                disabled={ocupado || !/^\d{1,6}\s*\/\s*\d{4}$/.test(numero.trim())}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:opacity-50"
                            >
                                {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                                {ocupado ? 'Consultando el portal…' : 'Buscar el expediente'}
                            </button>
                        </>
                    )}

                    {/* ── 3 · Confirmar ── */}
                    {paso === 3 && caratula && (
                        <>
                            <p className="mb-3 text-sm text-charcoal-700">
                                Esto es lo que devuelve el portal. ¿Es tu expediente?
                            </p>
                            <div className="rounded-xl border border-cream-400 bg-cream-50 p-4">
                                <p className="font-mono text-sm font-bold text-charcoal-900">
                                    {caratula.caratula.expediente}
                                </p>
                                <p className="mt-1 text-xs text-charcoal-600">{caratula.organo}</p>
                                {caratula.caratula.neun && (
                                    <p className="mt-1 font-mono text-[11px] text-charcoal-400">
                                        NEUN {caratula.caratula.neun}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-charcoal-500">
                                    {caratula.n_acuerdos} acuerdos en el histórico
                                </p>
                                <ul className="mt-3 space-y-2 border-t border-cream-400 pt-3">
                                    {caratula.ultimos.map((u, i) => (
                                        <li key={i} className="text-xs leading-snug text-charcoal-600">
                                            <span className="font-mono text-charcoal-800">
                                                {u.fecha_auto}
                                            </span>{' '}
                                            {u.resumen.slice(0, 150)}…
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <label className="mb-1.5 mt-4 block text-sm font-medium text-charcoal-800">
                                Cómo quieres llamarlo
                            </label>
                            <input
                                value={alias} onChange={e => setAlias(e.target.value)}
                                placeholder="Amparo de la Sra. Rodríguez"
                                className="h-10 w-full rounded-lg border border-cream-500 px-3 text-sm focus:border-accent-gold focus:outline-none focus:ring-2 focus:ring-accent-gold/20"
                            />

                            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

                            <button
                                onClick={confirmar} disabled={ocupado}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:opacity-50"
                            >
                                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" />
                                         : <Check className="h-4 w-4" />}
                                {ocupado ? 'Guardando…' : 'Sí, es este expediente'}
                            </button>
                            <p className="mt-3 text-center text-[11px] leading-relaxed text-charcoal-400">
                                Lo revisamos cada día a las 9:10, hora de la Ciudad de México.
                                Te escribiremos sólo cuando haya algo nuevo — y también si un
                                día no pudimos revisar.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** La carpeta negra que abre la pantalla vacía. */
export function CarpetaVacia() {
    return <FolderClosed className="mx-auto mb-4 h-9 w-9 text-charcoal-900" strokeWidth={1.5} />;
}
