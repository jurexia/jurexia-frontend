/**
 * La advertencia que el panel de evaluación puso como CONDICIÓN de lanzamiento.
 *
 * No es un aviso legal ni una casilla que se acepta una vez: va encima del
 * documento, cada vez, con los números de ESTE borrador. La medición sobre tres
 * expedientes reales dejó claro qué hay que mirar y por qué:
 *
 *   PARTES   — antes de los arreglos, el estudio atribuyó al quejoso una
 *              aportación de la tercera interesada. Un texto que confunde a las
 *              partes se lee bien y está mal en lo único que no puede estar mal.
 *   CITAS    — el cotejo contra el Semanario todavía no corre dentro del flujo.
 *   CONCEPTOS— que estén contestados todos, no la mayoría.
 *   EXTENSIÓN— la máquina escribe entre 25% y 60% más que el secretario, y ese
 *              excedente es repetición, no contenido.
 */
'use client';

import React, { useState } from 'react';
import { AlertTriangle, FileWarning, Users, BookMarked, ListChecks } from 'lucide-react';
import { Tarjeta, cn } from './primitivas';

export interface DatosBorrador {
    palabras: number;
    avisos: number;
    huecos: number;
    tieneAdvertencias: boolean;
    conceptos?: number;
    /** El texto de cada aviso, no sólo cuántos son. */
    textoAvisos?: string[];
    textoHuecos?: string[];
}

/* ═══ TRECE AVISOS EN UNA SOLA MANCHA ═══
   Medido sobre el proyecto del ADC 536/2025: trece avisos seguidos, todos del
   mismo color y del mismo peso, y entre ellos «CANTIDADES QUE NO CONSTAN EN
   LAS FUENTES … en una condena, una cifra que no viene de autos es un error
   grave», encajado entre dos notas de estilo.

   No se clasifican aquí —decidir cuál es grave a base de buscar palabras en
   prosa falla en silencio, que es la peor manera de fallar—. Se aprovecha la
   forma que los textos YA tienen: casi todos abren con su asunto y dos puntos.
   Ese encabezado se destaca y el resto queda como cuerpo, así el ojo recorre
   trece encabezados en vez de trece párrafos. Si un aviso no trae dos puntos
   al principio, se pinta entero como antes. */
function partirAviso(t: string): [string, string] {
    const i = t.indexOf(':');
    if (i <= 0 || i > 90) return ['', t];
    return [t.slice(0, i), t.slice(i + 1).trim()];
}

const PUNTOS = [
    { icono: Users, titulo: 'Partes',
      texto: 'Compruebe quién es quién en cada hecho probatorio. El sistema puede atribuir una prueba a la parte equivocada.' },
    { icono: BookMarked, titulo: 'Citas',
      texto: 'Verifique que cada criterio exista, diga lo que aquí se le atribuye y tenga la obligatoriedad que se le asigna.' },
    { icono: ListChecks, titulo: 'Exhaustividad',
      texto: 'Confirme que están contestados todos los conceptos de violación planteados.' },
    { icono: FileWarning, titulo: 'Extensión',
      texto: 'Este borrador tiende a repetir la misma razón. Pode antes de firmar.' },
];

/* ═══ LOS AVISOS, EN TRES BOTONES ═══
   David (15-sep-2026): «reducirlo a botones y entonces sí desplegar». Un
   proyecto real trae veintiséis avisos y se leían como una lista de
   veintiséis renglones del mismo peso. Ahora son tres cifras con botón:
   lo que hay que COMPROBAR antes de firmar —abierto por omisión—, lo de
   FORMA y lo INFORMATIVO. No se tira nada: cada botón despliega su lista
   entera. El reparto va por las marcas que los propios textos traen
   —«Compruébalo», «antes de firmar», «SINTAXIS», «palabras»—; lo que no
   casa con ninguna queda como informativo, nunca fuera. */
type Grupo = 'comprobar' | 'forma' | 'info';

function grupoDe(t: string): Grupo {
    const x = t.toLowerCase();
    if (/compru[eé]b|antes de firmar|no se pudo|no consta|no est[aá]n en|hueco|revíselo a mano/.test(x)) return 'comprobar';
    if (/sintaxis|palabras|p[aá]rrafos|comod[ií]n|repetid|se qued[oó] corto|oscila|mediana/.test(x)) return 'forma';
    return 'info';
}

export default function AvisoBorrador({ datos, className }: {
    datos: DatosBorrador; className?: string;
}) {
    const [abierto, setAbierto] = useState<Grupo | null>('comprobar');
    const avisos = datos.textoAvisos ?? [];
    const huecos = datos.textoHuecos ?? [];
    const grupos: Record<Grupo, string[]> = { comprobar: [], forma: [], info: [] };
    for (const a of avisos) grupos[grupoDe(a)].push(a);
    for (const h of huecos) grupos.comprobar.push(`Hueco de tu criterio: ${h}`);
    const BOTONES: { id: Grupo; titulo: string; tono: string }[] = [
        { id: 'comprobar', titulo: 'para comprobar antes de firmar', tono: 'text-amber-300' },
        { id: 'forma', titulo: 'de forma', tono: 'text-white/75' },
        { id: 'info', titulo: 'informativos', tono: 'text-white/60' },
    ];
    return (
        <Tarjeta padding="p-5" className={cn('border-amber-400/30 bg-amber-400/[0.06]', className)}>
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-semibold text-amber-100">
                        Borrador. No es un proyecto firmable.
                    </h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-white/60">
                        {datos.palabras.toLocaleString('es-MX')} palabras
                        {datos.huecos > 0 && <> · {datos.huecos} huecos de tu criterio</>}
                        {datos.tieneAdvertencias && (
                            <> · <span className="text-amber-200">
                                el sistema encontró un obstáculo al sentido que fijaste
                            </span></>
                        )}
                    </p>
                    {(avisos.length + huecos.length) > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {BOTONES.filter((b) => grupos[b.id].length > 0).map((b) => (
                                <button key={b.id} type="button"
                                        onClick={() => setAbierto((v) => (v === b.id ? null : b.id))}
                                        aria-expanded={abierto === b.id}
                                        className={cn(
                                            'inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[13px] transition-colors',
                                            abierto === b.id
                                                ? 'border-amber-400/45 bg-amber-400/10 text-white'
                                                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20')}>
                                    <span className={cn('font-semibold tabular-nums', b.tono)}>{grupos[b.id].length}</span>
                                    {b.titulo}
                                </button>
                            ))}
                        </div>
                    )}
                    {abierto && grupos[abierto].length > 0 && (
                        <ul className="mt-3 space-y-1.5 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-2.5">
                            {grupos[abierto].map((a, i) => {
                                const [cabeza, cuerpo] = partirAviso(a);
                                return (
                                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/75">
                                        <span className="shrink-0 text-amber-300/70">·</span>
                                        <span>
                                            {cabeza && <span className="font-medium text-amber-100">{cabeza}: </span>}
                                            {cuerpo}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <details className="group mt-4 border-t border-white/[0.07] pt-3">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-white/60 hover:text-white">
                            <span className="text-accent-gold/70 transition-transform group-open:rotate-90">›</span>
                            Qué revisar siempre, aunque no haya avisos
                        </summary>
                        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                            {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
                                <li key={titulo} className="flex gap-2.5">
                                    <Icono className="mt-0.5 h-4 w-4 shrink-0 text-white/45" aria-hidden />
                                    <div>
                                        <p className="text-[14px] font-medium text-white/90">{titulo}</p>
                                        <p className="text-[13px] leading-snug text-white/60">{texto}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </details>
                    <p className="mt-3 text-[13px] text-white/45">
                        Tú firmas. El sistema no responde por el contenido.
                    </p>
                </div>
            </div>
        </Tarjeta>
    );
}

/* ═══ EL CARTEL DEL PILOTO SE RETIRA ═══
   David, 13-sep-2026: «a esta herramienta ya no acceden Platinum. Deja a
   quienes ocuparon los 9 de los 10 asientos. Ahora sólo podrán acceder los
   gratuitos para su prueba y quienes contraten el plan mensual».

   Decía «Piloto Platinum · quedan 1 de 10 plazas» y las dos mitades han dejado
   de ser ciertas: no es Platinum y no quedan plazas que ofrecer. Un cartel que
   anuncia una fase cerrada le da al visitante una idea equivocada de qué está
   comprando, y estamos a punto de publicitar.

   En su lugar, lo que sí le sirve a cada cual: al del piloto, que conserva su
   asiento; al gratuito, que tiene una prueba; y al que no tiene ninguna de las
   dos, dónde está el plan. El contador de arriba lleva la cuenta exacta. */
export function AvisoPiloto({ delPiloto, restantes, mesLimite }: {
    delPiloto?: boolean; restantes?: number; mesLimite?: number;
}) {
    if (delPiloto) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5
                            text-[13px] text-white/60">
                <span className="font-medium text-white/75">Tu plaza del piloto</span>
                {' · '}conservas el acceso al taller y tus 40 proyectos al mes.
            </div>
        );
    }
    // Con plan de pago no hace falta cartel: el contador de arriba ya lo dice.
    if ((mesLimite ?? 0) > 0) return null;
    if ((restantes ?? 0) > 0) {
        return (
            <div className="rounded-xl border border-accent-gold/25 bg-accent-gold/[0.05] px-4 py-2.5
                            text-[13px] text-white/75">
                <span className="font-medium text-accent-gold">Tu proyecto de prueba</span>
                {' · '}gratis y completo. Después, el plan Ultra Secretarios incluye 40 al mes.
            </div>
        );
    }
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5
                        text-[13px] text-white/60">
            <span className="font-medium text-white/75">Prueba usada</span>
            {' · '}el taller es del plan Ultra Secretarios: 40 proyectos al mes.{' '}
            <a href="/precios?plan=ultra_secretarios"
               className="text-accent-gold underline underline-offset-2 hover:text-accent-gold/80">
                ver el plan
            </a>
        </div>
    );
}
