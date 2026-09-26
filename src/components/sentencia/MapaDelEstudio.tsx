'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Tarjeta, cn } from './primitivas';
import type { MapaDelEstudio as Mapa, PlanDelEstudio, RespuestaPlan, SegmentoDelPlan } from './api';
import { etiquetaLegible, razonLegible } from './ComoSeEstudiara';

/* ═══════════════════════════════════════════════════════════════════════════
   EL MAPA DEL ESTUDIO: DÓNDE SE CONTESTÓ CADA ARGUMENTO (26-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   La omisión es el único defecto de una sentencia que no se ve leyéndola: lo
   que falta no se lee. Medido hoy, la versión corta del estudio dejaba sin
   razón propia uno de cada cuatro argumentos autónomos. Con las variantes v3
   y v4 el estudio escribe una marca invisible (⟦C1.a⟧) al inicio del párrafo
   que contesta cada argumento; el servidor la retira antes de componer —nunca
   llega al .docx— y guarda el mapa. Aquí se enseña: argumento → apartado →
   calificación → razón → párrafo, con la cita literal del escrito.

   LO QUE ESTO NO ES: una garantía. La marca la pone el propio modelo; un
   argumento «sin localizar» puede estar contestado sin marca, y uno marcado
   puede estar mal contestado. Mientras la medición no esté calibrada contra
   engroses reales (lección de la casa: ningún control nuevo que lea el texto
   generado se vuelve aviso sin calibrar), se enseña como mapa para revisar,
   no como veredicto, y así se dice. La cobertura contra la demanda (V1b) va
   en sombra y no se pinta. */

const ES_SEGMENTO = /^(?:AD|[CAS])\d+(?:\.[a-z]+)?$/i;

/** C1.a < C1.b < C2.a < C10.a: por letra de serie, número y letra. */
function comparaIds(a: string, b: string): number {
    const pa = /^([A-Z]+)(\d+)(?:\.([a-z]+))?/i.exec(a);
    const pb = /^([A-Z]+)(\d+)(?:\.([a-z]+))?/i.exec(b);
    if (!pa || !pb) return a.localeCompare(b);
    if (pa[1] !== pb[1]) return pa[1].localeCompare(pb[1]);
    if (Number(pa[2]) !== Number(pb[2])) return Number(pa[2]) - Number(pb[2]);
    return (pa[3] || '').localeCompare(pb[3] || '');
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

function recorte(t: string, palabras = 18): string {
    const w = (t || '').trim().split(/\s+/);
    return w.length > palabras ? `${w.slice(0, palabras).join(' ')}…` : w.join(' ');
}

type Localizado = 'marca' | 'anclas' | 'falta' | 'sin_dato';
const LOCALIZADO: Record<Localizado, { texto: string; clase: string }> = {
    marca: { texto: 'con marca', clase: 'border-accent-gold/40 text-accent-gold' },
    anclas: { texto: 'por sus anclas', clase: 'border-white/20 text-white/70' },
    falta: { texto: 'sin localizar', clase: 'border-amber-400/40 text-amber-300' },
    sin_dato: { texto: 'sin dato', clase: 'border-white/10 text-white/45' },
};

export default function MapaDelEstudio({ mapa, esRecurso = false, leer }: {
    mapa: Mapa;
    esRecurso?: boolean;
    /** Si el resultado no trajo el plan, se lee el de la sesión: tras generar
     *  es el que se usó —la pantalla de decisión ya no pide otro—. */
    leer?: () => Promise<RespuestaPlan>;
}) {
    const cob = mapa.cobertura;
    const faltan = new Set(cob?.faltan ?? []);
    const rescatados = new Set(cob?.rescatados ?? []);
    const [abierto, setAbierto] = useState(faltan.size > 0);
    const [planSesion, setPlanSesion] = useState<PlanDelEstudio | null>(null);
    /* Una sola lectura por mapa: `leer` llega nueva en cada pintado de la
       página y, como dependencia, pediría el plan en bucle. */
    const leerRef = useRef(leer);
    leerRef.current = leer;
    useEffect(() => {
        const l = leerRef.current;
        if (mapa.plan || !l) return;
        let vivo = true;
        l().then((r) => { if (vivo && r.estado === 'listo' && r.plan) setPlanSesion(r.plan); })
           .catch(() => { /* sin detalle: el mapa se pinta con los ids */ });
        return () => { vivo = false; };
    }, [mapa]);
    const plan = mapa.plan ?? planSesion;

    const porId = new Map<string, SegmentoDelPlan>();
    (plan?.segmentos ?? []).forEach((s) => porId.set(s.id, s));
    const ids = Array.from(new Set([
        ...(plan?.segmentos ?? []).map((s) => s.id),
        ...Object.keys(mapa.marcas).filter((k) => ES_SEGMENTO.test(k)),
        ...Array.from(faltan), ...Array.from(rescatados),
    ])).sort(comparaIds);
    const unidadDe = (id: string) => plan?.unidades.find((u) => u.segmentos.includes(id))?.id ?? '';
    const localizado = (id: string): Localizado =>
        (mapa.marcas[id]?.length ? 'marca' : rescatados.has(id) ? 'anclas' : faltan.has(id) ? 'falta' : 'sin_dato');
    const n = ids.length;
    const conMarca = ids.filter((id) => localizado(id) === 'marca').length;
    const porAnclas = ids.filter((id) => localizado(id) === 'anclas').length;
    const sinLocalizar = ids.filter((id) => localizado(id) === 'falta').length;
    const cobertura = cob?.cobertura ?? (n ? conMarca / n : null);
    const otras = Object.keys(mapa.marcas).filter((k) => !ES_SEGMENTO.test(k)).sort(comparaIds);

    const parrafos = (idx: number[]) => idx.map((i) => i + 1).join(', ');
    const quien = esRecurso ? 'agravio' : 'concepto';

    return (
        <Tarjeta padding="p-5">
            <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
                    className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 text-left">
                <ChevronRight className={cn('h-4 w-4 shrink-0 self-center text-accent-gold/70 transition-transform duration-200',
                                            abierto && 'rotate-90')} />
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Mapa del estudio</span>
                <span className="min-w-0 flex-1 text-[13px] text-white/75">
                    {n} {n === 1 ? 'argumento' : 'argumentos'} · {conMarca} con marca
                    {porAnclas > 0 && <> · {porAnclas} por sus anclas</>}
                    {sinLocalizar > 0 && <span className="text-amber-300"> · {sinLocalizar} sin localizar</span>}
                    {cobertura !== null && <span className="text-white/45"> · cobertura {pct(cobertura)}</span>}
                </span>
                <span className="text-[12px] text-white/45">{abierto ? 'ocultar' : 'ver'}</span>
            </button>

            {abierto && (
                <div className="mt-3 space-y-3">
                    <p className="text-[12px] leading-relaxed text-white/50">
                        Dónde contestó el estudio cada {quien}, según la marca que el propio modelo deja al
                        principio del párrafo (no entra al documento). Es para revisar, no un veredicto: un argumento
                        «sin localizar» puede estar contestado sin marca, y uno con marca, mal contestado.
                        Compruébalo en el .docx antes de firmar.
                    </p>

                    <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] bg-black/20">
                        {ids.map((id) => {
                            const s = porId.get(id);
                            const loc = localizado(id);
                            const idx = mapa.marcas[id] ?? [];
                            const u = unidadDe(id);
                            return (
                                <li key={id} className="px-3 py-2.5">
                                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
                                        <span className="shrink-0 font-semibold tabular-nums text-accent-gold/90">{id}</span>
                                        {u && <span className="shrink-0 text-white/45">{u}</span>}
                                        {s?.etiqueta && <span className="shrink-0 font-medium text-white/90">{etiquetaLegible(s.etiqueta)}</span>}
                                        {s?.razon && <span className="min-w-0 text-white/60">· {razonLegible(s.razon)}</span>}
                                        <span className="ml-auto flex shrink-0 items-center gap-2">
                                            {idx.length > 0 && (
                                                <span className="text-[12px] tabular-nums text-white/60">
                                                    {idx.length === 1 ? 'párrafo' : 'párrafos'} {parrafos(idx)}
                                                </span>
                                            )}
                                            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
                                                LOCALIZADO[loc].clase)}>
                                                {LOCALIZADO[loc].texto}
                                            </span>
                                        </span>
                                    </p>
                                    {(s?.sostiene || s?.texto) && (
                                        <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">{s?.sostiene || s?.texto}</p>
                                    )}
                                    {s?.cita && (
                                        <p className="mt-1 border-l-2 border-white/10 pl-2 text-[12px] italic leading-relaxed text-white/50">
                                            «{s.cita}»{s.pagina ? <span className="not-italic text-white/40"> · {s.pagina}</span> : null}
                                        </p>
                                    )}
                                    {idx.length > 0 && mapa.parrafos.length > 0 && (
                                        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                                            {idx.filter((i) => mapa.parrafos[i]).slice(0, 2).map((i) => (
                                                <span key={i} className="block">¶ {i + 1}: {recorte(mapa.parrafos[i])}</span>
                                            ))}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    {/* LAS PREMISAS Y LOS EFECTOS, dónde quedaron. Sin juicio:
                        «esta premisa se expuso dos veces» sería un control nuevo
                        sobre el texto generado, y ésos van en sombra hasta
                        calibrarse contra engroses reales (V4 b, V6). */}
                    {otras.length > 0 && (
                        <ul className="space-y-1 text-[12px] leading-relaxed text-white/60">
                            {otras.map((k) => {
                                const idx = mapa.marcas[k] ?? [];
                                const esPremisa = /^M\d/i.test(k);
                                return (
                                    <li key={k}>
                                        <span className="font-semibold text-white/75">{k}</span>
                                        {' · '}{esPremisa ? 'premisa expuesta en' : /^U\d/i.test(k) ? 'efectos en' : 'en'}
                                        {' '}{idx.length ? `${idx.length === 1 ? 'el párrafo' : 'los párrafos'} ${parrafos(idx)}` : 'ningún párrafo'}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {mapa.variante && (
                        <p className="text-[12px] text-white/40">Escrito con la variante {mapa.variante} del estudio.</p>
                    )}
                </div>
            )}
        </Tarjeta>
    );
}
