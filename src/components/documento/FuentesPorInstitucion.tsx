'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import { fuenteDeCita, institucionesDe, type FuenteCita, type Institucion, type MetaCitas } from '@/lib/documento/citas';
import { esCoidh, rotuloCoidh } from '@/lib/coidh';
import { IconoInstitucion } from './IconoInstitucion';
import { citasSinFuente, conFichas, useFichasDeCitas } from '@/lib/documento/fichas';

/**
 * LAS FUENTES, BAJO EL EMBLEMA DE QUIEN LAS PUBLICA (18-sep-2026).
 *
 * David: «las citas de las fuentes ya no deberían juntarse allí en la parte
 * fina (ejemplo de "18 fuentes") sino cada una en su botón del logo y
 * desplegarlas al oprimirlo».
 *
 * La lista única ponía en el mismo renglón gris la Constitución, una tesis del
 * Semanario y un cuadernillo de la Corte Interamericana. Un abogado no busca
 * «la fuente 14»: busca de qué autoridad viene lo que va a citar. Aquí cada
 * institución es un botón con su emblema y su cuenta, y al oprimirlo salen SUS
 * fuentes, numeradas igual que en el texto.
 *
 * NADA SE ESCONDE. Las citas que el motor no pudo trazar hasta una ficha
 * tienen su propio grupo, en ámbar: una cita que no se puede abrir es
 * precisamente la que hay que mirar antes de firmar.
 */

const SIN_FICHA: Institucion = { clave: 'otra', nombre: 'Citas sin ficha', icono: '' };

export function FuentesPorInstitucion({ meta: metaDelMensaje, docIdMap, onCita, resolver = true, className = '' }: {
    meta: MetaCitas | null;
    /** Identificador de cada cita → su número en el texto. */
    docIdMap: Map<string, number>;
    onCita?: (fuente: FuenteCita) => void;
    /** Pedir a `/cita` las fichas que el mapa no traiga (en el hilo, al
     *  terminar la respuesta). */
    resolver?: boolean;
    className?: string;
}) {
    const [abierta, setAbierta] = useState<string | null>(null);

    /* NINGUNA CITA ES «SIN FICHA» ANTES DE PREGUNTAR (26-sep-2026). Lo que el
       mapa del mensaje no trae se pide a `/cita` (`@/lib/documento/fichas`) y
       entra en su institución con su PDF. Al grupo ámbar sólo va lo que `/cita`
       no encontró o no pudo consultar; mientras se busca, se dice que se busca. */
    const faltan = useMemo(() => citasSinFuente(docIdMap.keys(), metaDelMensaje), [docIdMap, metaDelMensaje]);
    const { fichas, estado } = useFichasDeCitas(faltan, resolver);
    const meta = useMemo(() => conFichas(metaDelMensaje, fichas), [metaDelMensaje, fichas]);
    const buscando = faltan.filter((id) => estado[id.toLowerCase()] === 'buscando').length;

    const { grupos, numeros } = useMemo(() => {
        const numeros = new Map<string, number>();
        docIdMap.forEach((n, id) => numeros.set(id.toLowerCase(), n));
        const orden = (id: string) => numeros.get(id.toLowerCase()) ?? 9999;

        const base = institucionesDe(meta, docIdMap.keys()).map((g) => ({
            id: `${g.institucion.clave}|${g.institucion.nombre}`,
            institucion: g.institucion,
            docIds: [...g.docIds].sort((a, b) => orden(a) - orden(b)),
            sinFicha: false,
        }));

        const conFicha = new Set(base.flatMap((g) => g.docIds.map((x) => x.toLowerCase())));
        const sueltas = Array.from(docIdMap.keys())
            .filter((id) => !conFicha.has(id.toLowerCase()) && estado[id.toLowerCase()] !== 'buscando');
        if (sueltas.length) {
            base.push({
                id: 'sin-ficha', institucion: SIN_FICHA, sinFicha: true,
                docIds: sueltas.sort((a, b) => orden(a) - orden(b)),
            });
        }
        return { grupos: base, numeros };
    }, [meta, docIdMap, estado]);

    if (!grupos.length && !buscando) return null;
    const desplegada = grupos.find((g) => g.id === abierta);

    return (
        <div className={className}>
            <div className="flex flex-wrap items-center gap-1.5">
                {grupos.map((g) => {
                    const activa = g.id === abierta;
                    return (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => setAbierta(activa ? null : g.id)}
                            aria-expanded={activa}
                            title={`${g.institucion.nombre} · ${g.docIds.length} ${g.docIds.length === 1 ? 'fuente' : 'fuentes'}`}
                            /* En teléfono cada emblema ocupa su renglón: en fila, el nombre
                               de la institución se quedaba en «C.. 3», que no dice nada. */
                            className={`inline-flex max-w-full items-center gap-2 rounded-lg border py-1 pl-1.5 pr-2 text-[11.5px] transition-colors max-sm:w-full
                                ${g.sinFicha
                                    ? 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400'
                                    : activa
                                        ? 'border-charcoal-900 bg-charcoal-900 text-white'
                                        : 'border-cream-300 bg-white text-charcoal-800 hover:border-charcoal-400'}`}
                        >
                            {g.sinFicha
                                ? <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                : <IconoInstitucion inst={g.institucion} tam={22} />}
                            <span className="truncate font-medium">{g.institucion.nombre}</span>
                            <span className={`ml-auto tabular-nums ${activa && !g.sinFicha ? 'text-white/70' : 'text-charcoal-400'}`}>
                                {g.docIds.length}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${activa ? 'rotate-180' : ''}`} />
                        </button>
                    );
                })}
                {buscando > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-1 text-[11.5px] text-charcoal-500 max-sm:w-full">
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                        {buscando === 1 ? 'Buscando la ficha de 1 cita…' : `Buscando la ficha de ${buscando} citas…`}
                    </span>
                )}
            </div>

            {desplegada && (
                <ul className="mt-2 divide-y divide-cream-200 overflow-hidden rounded-lg border border-cream-300 bg-white">
                    {desplegada.docIds.map((id) => {
                        const f = fuenteDeCita(meta, id);
                        const n = numeros.get(id.toLowerCase());
                        return (
                            <li key={id}>
                                <button
                                    type="button"
                                    onClick={() => onCita?.(f)}
                                    title="Abrir la fuente"
                                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-cream-100"
                                >
                                    <span className="mt-[1px] inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-charcoal-900 text-[10px] font-bold text-white">
                                        {n ?? '·'}
                                    </span>
                                    <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-charcoal-700">
                                        <span className="font-medium text-charcoal-900">
                                            {desplegada.sinFicha
                                                // Ya se preguntó a `/cita`: se dice qué contestó.
                                                ? (estado[id.toLowerCase()] === 'fallo'
                                                    ? `Cita ${n ?? ''}: no se pudo consultar su ficha. Toca para reintentar`
                                                    : `Cita ${n ?? ''} sin ficha: no está en el acervo`)
                                                // La Corte IDH se nombra por su caso y párrafo,
                                                // no por el `origen` del marcador.
                                                : esCoidh(f) ? rotuloCoidh(f) : f.origen}
                                        </span>
                                        {!desplegada.sinFicha && f.ref && !esCoidh(f) ? <span className="text-charcoal-500"> — {f.ref}</span> : null}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
