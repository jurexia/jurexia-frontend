'use client';

import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import type { CorreccionDelSupervisor, SupervisorDelProyecto, TipoDeCorreccion } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE CORRIGIÓ EL SUPERVISOR (2-oct-2026, CONTRATO D)
   ═══════════════════════════════════════════════════════════════════════════
   David: «cuando meto el proyecto a gemini 3.8 flash razonamiento extendido
   detecta errores en el proyecto que deben corregirse, incluso propone cómo
   mejorar la redacción (que sigue siendo a veces muy extensa)». El servidor
   pasa ahora el proyecto por un revisor antes de entregarlo y aplica lo que
   encuentra. Aquí se enseña qué cambió: «antes → después · por qué».

   VA APARTE DE AvisoBorrador, A PROPÓSITO. Los avisos se agrupan con
   expresiones regulares sobre prosa; mezclar ahí las correcciones las volvería
   un renglón más. Plegada, con el número en el título: lo primero es el
   documento, y quien quiera saber qué se tocó lo abre. */

export const ROTULO_CORRECCION: Record<TipoDeCorreccion, string> = {
    error_juridico: 'error jurídico',
    incongruencia: 'incongruencia',
    hecho_no_acreditado: 'hecho no acreditado',
    cita: 'cita',
    repeticion: 'repetición',
    extension: 'extensión',
    redaccion: 'redacción',
};

/** El título del pliegue, o '' si no hay nada que decir (apagado, o un
 *  servidor que no lo manda). */
export function tituloDelSupervisor(s: SupervisorDelProyecto | null | undefined): string {
    if (!s || s.estado === 'apagado') return '';
    const n = s.correcciones.length || s.total;
    if (s.estado === 'fallo' || s.estado === 'vencido') {
        return s.estado === 'vencido'
            ? 'El revisor no terminó a tiempo: el proyecto se entregó sin su revisión'
            : 'El revisor no pudo revisar este proyecto: se entregó sin su revisión';
    }
    if (!n) return 'El revisor leyó el proyecto y no encontró nada que corregir';
    return `El revisor corrigió ${n} ${n === 1 ? 'cosa' : 'cosas'} del proyecto`;
}

function Fila({ c }: { c: CorreccionDelSupervisor }) {
    return (
        <li className="border-l-2 border-white/10 py-1.5 pl-3">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-white/45">
                {c.tipo && (
                    <span className={c.tipo === 'error_juridico' || c.tipo === 'incongruencia' || c.tipo === 'hecho_no_acreditado'
                        ? 'font-semibold uppercase tracking-wide text-amber-300/90' : 'font-semibold uppercase tracking-wide text-accent-gold/85'}>
                        {ROTULO_CORRECCION[c.tipo]}
                    </span>
                )}
                {c.parrafo > 0 && <span>párrafo {c.parrafo}</span>}
            </p>
            {(c.antes || c.despues) && (
                <p className="mt-1 text-[13px] leading-relaxed">
                    {c.antes && <span className="text-white/45 line-through decoration-white/25">{c.antes}</span>}
                    {c.antes && c.despues && <span className="mx-1.5 text-accent-gold/80">→</span>}
                    {c.despues && <span className="text-white/90">{c.despues}</span>}
                    {c.antes && !c.despues && <span className="ml-1.5 text-white/45">(se quitó)</span>}
                </p>
            )}
            {c.motivo && <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">Por qué: {c.motivo}</p>}
        </li>
    );
}

export default function CorreccionesDelSupervisor({ supervisor }: { supervisor?: SupervisorDelProyecto | null }) {
    const titulo = tituloDelSupervisor(supervisor);
    if (!supervisor || !titulo) return null;
    const lista = supervisor.correcciones;
    const pie = [supervisor.modelo, supervisor.segundos > 0 ? `${Math.round(supervisor.segundos)} s` : '',
                 supervisor.descartadas > 0 ? `${supervisor.descartadas} propuesta${supervisor.descartadas === 1 ? '' : 's'} descartada${supervisor.descartadas === 1 ? '' : 's'} por no poder aplicarse con seguridad` : '']
        .filter(Boolean).join(' · ');
    const aviso = supervisor.estado === 'fallo' || supervisor.estado === 'vencido';
    return (
        <section data-supervisor={supervisor.estado}
                 className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            {lista.length > 0 ? (
                <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-white/80 hover:text-white">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-accent-gold/70 transition-transform group-open:rotate-90" />
                        <ShieldCheck className="h-4 w-4 shrink-0 text-accent-gold/80" />
                        {titulo}
                    </summary>
                    <ul className="mt-2.5 space-y-1.5">
                        {lista.map((c, i) => <Fila key={i} c={c} />)}
                    </ul>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/40">
                        Ya van aplicadas en el Word. Revísalas: el proyecto sigue siendo tuyo.{pie ? ` ${pie}.` : ''}
                    </p>
                </details>
            ) : (
                <p className={aviso ? 'flex items-center gap-2 text-[13px] text-amber-200/85' : 'flex items-center gap-2 text-[13px] text-white/60'}>
                    <ShieldCheck className={aviso ? 'h-4 w-4 shrink-0 text-amber-300/80' : 'h-4 w-4 shrink-0 text-accent-gold/70'} />
                    {titulo}{aviso ? ': revísalo tú con más cuidado.' : '.'}
                    {pie && !aviso && <span className="text-white/40"> {pie}.</span>}
                </p>
            )}
        </section>
    );
}
