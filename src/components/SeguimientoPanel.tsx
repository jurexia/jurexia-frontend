'use client';

/**
 * Seguimiento de expedientes ante órganos jurisdiccionales.
 *
 * La otra mitad de `/carpetas`. Las carpetas inteligentes responden a «¿qué
 * tengo yo de este asunto?» —son el archivo del despacho—; esto responde a
 * «¿qué ha hecho el juzgado?», que es una vigilancia. Se vinculan, no se
 * funden.
 *
 * LA LÍNEA QUE SOSTIENE EL CONTRATO. Arriba del todo va «Última revisión
 * completa: hoy a las 9:27». Es lo que convierte el silencio del correo en una
 * promesa comprobable: si Iurexia no escribió y aquí dice que revisó, es que no
 * hubo movimiento. Sin esa línea, el silencio sería ambiguo y el producto no
 * valdría nada.
 *
 * EL SEMÁFORO DICE LA VERDAD, incluida la incómoda. «No se pudo revisar hoy»
 * es un estado de primera clase, con su color propio, porque ocultarlo sería
 * hacer que el verde signifique dos cosas.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import {
    AlertTriangle, ArrowUpRight, Building2, CheckCircle2, Clock,
    FolderClosed, Loader2, Plus, Scale,
} from 'lucide-react';
import SeguirExpediente from '@/components/SeguirExpediente';

type Organo = {
    id: number;
    jurisdiccion: string;
    clave_externa: string;
    nombre: string;
    entidad: string | null;
};

type Seguimiento = {
    id: string;
    numero: string;
    alias: string;
    neun: string | null;
    modo: string;
    estado: string;
    tipo_asunto_clave: string | null;
    ultima_revision_ok: string | null;
    ultima_actuacion_en: string | null;
    fallos_consecutivos: number;
    organo: Organo | null;
};

type Revision = {
    seguimiento_id: string;
    resultado: string;
    fecha_local: string;
    iniciada_en: string;
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Sin `new Date`: interpretar «2026-09-03» como UTC corre el día en México. */
function enCorto(iso: string | null) {
    const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : '—';
}

function hoyMexico() {
    // UTC−6 todo el año: México suprimió el horario de verano en 2022.
    const d = new Date(Date.now() - 6 * 3600_000);
    return d.toISOString().slice(0, 10);
}

function horaDe(iso: string | null) {
    if (!iso) return null;
    const d = new Date(new Date(iso).getTime() - 6 * 3600_000);
    return d.toISOString().slice(11, 16);
}

type Estado = {
    color: string;
    fondo: string;
    texto: string;
    icono: React.ElementType;
};

function estadoDe(s: Seguimiento, rev: Revision | undefined): Estado {
    if (s.modo === 'asistido') {
        return { color: 'text-purple-700', fondo: 'bg-purple-50 border-purple-200',
                 texto: 'Le toca a usted: marque la casilla', icono: AlertTriangle };
    }
    if (!rev) {
        return { color: 'text-charcoal-500', fondo: 'bg-cream-100 border-cream-400',
                 texto: 'Aún no se ha revisado hoy', icono: Clock };
    }
    if (rev.resultado === 'inhabil') {
        return { color: 'text-charcoal-500', fondo: 'bg-cream-100 border-cream-400',
                 texto: 'Hoy es inhábil', icono: Clock };
    }
    if (rev.resultado.startsWith('fallo')) {
        return { color: 'text-amber-700', fondo: 'bg-amber-50 border-amber-200',
                 texto: `No se pudo revisar hoy${s.fallos_consecutivos > 1
                     ? ` · ${s.fallos_consecutivos} días seguidos` : ''}`,
                 icono: AlertTriangle };
    }
    if (rev.resultado === 'ok_con_novedad') {
        return { color: 'text-blue-700', fondo: 'bg-blue-50 border-blue-200',
                 texto: `Actuación nueva del ${enCorto(s.ultima_actuacion_en)} · avisado por correo`,
                 icono: ArrowUpRight };
    }
    return { color: 'text-emerald-700', fondo: 'bg-emerald-50 border-emerald-200',
             texto: `Revisado hoy ${horaDe(rev.iniciada_en) || ''}. Sin novedad.`,
             icono: CheckCircle2 };
}

export default function SeguimientoPanel() {
    const { user } = useAuth();
    const [filas, setFilas] = useState<Seguimiento[]>([]);
    const [revisiones, setRevisiones] = useState<Record<string, Revision>>({});
    const [cargando, setCargando] = useState(true);
    const [alta, setAlta] = useState(false);

    const traer = useCallback(async () => {
        if (!user) return;
        setCargando(true);
        const { data } = await supabase
            .from('seg_expedientes_seguidos')
            .select('*, organo:seg_organos(id,jurisdiccion,clave_externa,nombre,entidad)')
            .eq('user_id', user.id)
            .neq('estado', 'archivado')
            .order('creado_en', { ascending: false });
        const seg = (data ?? []) as Seguimiento[];
        setFilas(seg);

        if (seg.length) {
            const { data: revs } = await supabase
                .from('seg_revisiones')
                .select('seguimiento_id,resultado,fecha_local,iniciada_en')
                .eq('fecha_local', hoyMexico())
                .in('seguimiento_id', seg.map(s => s.id))
                .order('intento', { ascending: false });
            const mapa: Record<string, Revision> = {};
            // Se queda el MEJOR resultado del día: si un intento salió bien,
            // el día está resuelto aunque otro fallara.
            for (const r of (revs ?? []) as Revision[]) {
                const previo = mapa[r.seguimiento_id];
                if (!previo || (previo.resultado.startsWith('fallo')
                                && !r.resultado.startsWith('fallo'))) {
                    mapa[r.seguimiento_id] = r;
                }
            }
            setRevisiones(mapa);
        }
        setCargando(false);
    }, [user]);

    useEffect(() => { traer(); }, [traer]);

    const ultimaCompleta = Object.values(revisiones)
        .filter(r => !r.resultado.startsWith('fallo'))
        .map(r => horaDe(r.iniciada_en))
        .filter(Boolean)
        .sort()
        .pop();

    if (cargando) {
        return (
            <div className="flex items-center gap-2 py-16 text-sm text-charcoal-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Abriendo el seguimiento…
            </div>
        );
    }

    if (!filas.length) {
        return (
            <div className="rounded-2xl border border-cream-400 bg-white px-8 py-14 text-center">
                <FolderClosed className="mx-auto mb-4 h-10 w-10 text-charcoal-900"
                              strokeWidth={1.25} />
                <h3 className="font-serif text-xl font-semibold text-charcoal-900">
                    Todavía no sigue ningún expediente
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-charcoal-600">
                    Dé de alta el número y el órgano, y Iurexia lo revisa cada día a las
                    9:10, hora de la Ciudad de México. Le escribirá sólo cuando haya algo
                    nuevo — y también si un día no pudo revisar.
                </p>
                <button
                    onClick={() => setAlta(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800"
                >
                    <Plus className="h-4 w-4" /> Seguir un expediente
                </button>
                <SeguirExpediente abierto={alta} cerrar={() => setAlta(false)}
                                  alGuardar={traer} />
            </div>
        );
    }

    return (
        <div>
            {/* La promesa comprobable */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-400 bg-white px-4 py-3">
                <p className="text-sm text-charcoal-700">
                    {ultimaCompleta
                        ? <>Última revisión completa: <strong className="text-charcoal-900">
                            hoy a las {ultimaCompleta}</strong>, hora de la Ciudad de México.</>
                        : <>Hoy todavía no se ha corrido la revisión. Se hace cada día
                            laborable a las 9:10, hora de la Ciudad de México.</>}
                </p>
                <button
                    onClick={() => setAlta(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-charcoal-900/12 px-3 py-1.5 text-xs font-semibold text-charcoal-800 transition-colors hover:bg-charcoal-900/[0.04]">
                    <Plus className="h-3.5 w-3.5" /> Seguir otro
                </button>
            </div>

            <ul className="space-y-2.5">
                {filas.map(s => {
                    const e = estadoDe(s, revisiones[s.id]);
                    const Icono = e.icono;
                    const federal = s.organo?.jurisdiccion === 'PJF';
                    return (
                        <li key={s.id}
                            className="rounded-xl border border-cream-400 bg-white p-4 transition-shadow hover:shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-bold text-charcoal-900">
                                            {s.numero}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                            federal
                                                ? 'border-accent-gold/40 bg-accent-gold/10 text-accent-brown'
                                                : 'border-charcoal-900/12 bg-charcoal-900/[0.04] text-charcoal-600'}`}>
                                            {federal ? <Scale className="h-2.5 w-2.5" />
                                                     : <Building2 className="h-2.5 w-2.5" />}
                                            {federal ? 'Federal' : 'Ciudad de México'}
                                        </span>
                                        {s.neun && (
                                            <span className="font-mono text-[11px] text-charcoal-400">
                                                NEUN {s.neun}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 truncate text-sm font-medium text-charcoal-800">
                                        {s.alias}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-charcoal-500">
                                        {s.organo?.nombre}
                                    </p>
                                </div>

                                <div className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${e.fondo} ${e.color}`}>
                                    <Icono className="h-3.5 w-3.5" />
                                    {e.texto}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <SeguirExpediente abierto={alta} cerrar={() => setAlta(false)}
                              alGuardar={traer} />

            <p className="mt-5 text-xs leading-relaxed text-charcoal-400">
                La información procede de los portales oficiales y es de carácter
                informativo; no sustituye la consulta del expediente. El Consejo de la
                Judicatura Federal advierte que sus datos, aun siendo los mismos que
                obran en estrados, no deben tomarse como oficiales.
            </p>
        </div>
    );
}
