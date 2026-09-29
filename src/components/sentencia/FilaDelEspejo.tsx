'use client';

/* ═══ UNA SENTENCIA DEL PROPIO TRIBUNAL, EN UN SOLO SITIO (29-sep-2026) ═══
   La pintan dos tarjetas: «Su propio tribunal» (page.tsx, todos los
   planteamientos) y «El problema principal y su solución» (ProblemaPrincipal,
   sólo el principal). Antes la nueva la pintaba recortada —sin el porcentaje,
   sin la pregunta del precedente, sin el NEUN ni el Buscador de la OAJ— y no
   había forma de abrir la sentencia desde ahí. Ahora las dos usan esta fila. */

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { FilaEspejo } from './api';

/* EL NEUN, PARA LLEVARLO A LA OAJ. El Buscador de la OAJ no tiene enlace
   profundo por expediente: se abre el buscador y se pega ahí el NEUN. Copiarlo
   con un clic ahorra teclear el número a mano, que es donde uno se equivoca de
   sentencia sin darse cuenta.

   Si el navegador no deja escribir en el portapapeles —página sin HTTPS,
   permiso denegado—, se dice en el propio botón; el número lleva `select-all`
   para que un clic lo seleccione entero. */
export function CopiarNeun({ neun }: { neun: number }) {
    const [estado, setEstado] = useState<'' | 'copiado' | 'fallo'>('');
    useEffect(() => {
        if (!estado) return;
        const t = setTimeout(() => setEstado(''), 1800);
        return () => clearTimeout(t);
    }, [estado]);
    return (
        <button type="button"
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(String(neun));
                        setEstado('copiado');
                    } catch {
                        setEstado('fallo');
                    }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10
                           bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-white/60
                           transition-colors hover:text-white/75">
            {estado === 'copiado' ? (
                <><Check className="h-3 w-3 text-accent-gold/80" aria-hidden="true" />copiado</>
            ) : estado === 'fallo' ? 'selecciónelo a mano' : 'copiar'}
        </button>
    );
}

/* LOS DOS NIVELES DE LA FUENTE OAJ (David, 28-sep-2026, «opción 1 + 2»). Del
   85% arriba, «mismo problema»; de 50% a 84%, «posible», que va aparte y se
   revisa a mano. Una fila sin `nivel` —del acervo viejo, o de un API anterior,
   que sólo mandaba las de 85% o más— es del nivel de arriba y se pinta como
   siempre. */
export function esPosible(f: FilaEspejo): boolean {
    return typeof f.similitud === 'number' && f.nivel === 'posible';
}

/* LO QUE HAY DENTRO DEL PLIEGUE, contado por nivel. Sin piso de filas en la
   OAJ, «1 sentencias» se leería mal; y un planteamiento con sólo posibles no
   dice «0 sentencias propias».

   CON LOS DOS NIVELES, «2 propias · 1 posible», sin «sentencias»: la nota no
   se encoge (shrink-0 en el Pliegue) y «2 sentencias propias · 2 posibles»
   empujaba el «ocultar» fuera de la pantalla en un teléfono de 375 px —medido
   en el navegador: 19 px de desborde—. Con el nivel de arriba solo, el texto
   de siempre. */
export function notaDelGrupo(filas: FilaEspejo[]): string {
    const posibles = filas.filter(esPosible).length;
    const mismas = filas.length - posibles;
    const txtPosibles = posibles === 1 ? '1 posible' : `${posibles} posibles`;
    if (posibles === 0) return mismas === 1 ? '1 sentencia propia' : `${mismas} sentencias propias`;
    if (mismas === 0) return txtPosibles;
    return `${mismas} ${mismas === 1 ? 'propia' : 'propias'} · ${txtPosibles}`;
}

/* UNA SENTENCIA DEL ESPEJO. La misma fila para los dos niveles y para las dos
   fuentes: lo que cambia es la insignia. La del nivel de arriba es la dorada de
   siempre; la del posible, sólo contorno y en gris, porque dice menos y no debe
   competir con ella. Las dos llevan el número REAL de la tabla.

   LAS DOS INSIGNIAS NOMBRAN IGUAL EL MISMO NÚMERO: «90% · mismo problema» y
   «57% · posible». Antes la de arriba decía «90% de similitud», que es justo
   la lectura —parecido del texto— que el encabezado descarta, y ponía debajo de
   ella un «57% · posible» como si fueran magnitudes distintas. Las dos son la
   probabilidad calibrada de que sea el mismo problema. */
export function FilaDelEspejo({ f }: { f: FilaEspejo }) {
    // LA FILA DE LA OAJ SE RECONOCE POR SU PORCENTAJE. Las del acervo viejo no
    // lo traen y se pintan exactamente como antes.
    const oaj = typeof f.similitud === 'number';
    const posible = esPosible(f);
    // Tope en 99: el back ya lo pone, y aquí se repite porque «100%» sería
    // afirmar certeza con un centenar de pares medidos.
    const porcentaje = Math.min(f.similitud ?? 0, 99);
    // «57% O MÁS» cuando la tabla no midió ese coseno y el número es el del
    // tramo de abajo (api.ts, `cota_inferior`): enseñarlo pelado haría pasar
    // una cota por una medida. En el tope no se añade: «99% o más» dejaría
    // abierto el 100% que el tope existe para no afirmar.
    const cifra = `${porcentaje}%${f.cota_inferior && porcentaje < 99 ? ' o más' : ''}`;
    return (
        <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5
                       rounded-lg border border-white/[0.07]
                       bg-white/[0.02] px-3 py-2 text-[12px]">
            <span className="font-medium text-white/75">
                {f.tipo_asunto} {f.expediente}
            </span>
            {f.fecha && (
                <span className="tabular-nums text-white/45">
                    {f.fecha.slice(0, 10)}
                </span>
            )}
            {/* En la OAJ el sentido puede venir vacío, y ahí «sin sentido» no
                es un dato: es que el índice no lo trae. */}
            {(f.sentido || !oaj) && (
                <span className="rounded-lg border border-white/10
                                 bg-white/[0.05] px-1.5 py-0.5
                                 text-[10px] uppercase tracking-wide
                                 text-white/60">
                    {f.sentido || 'sin sentido'}
                </span>
            )}
            {oaj && !posible && (
                <span className="rounded-lg border border-accent-gold/30
                                 bg-accent-gold/[0.07] px-1.5 py-0.5
                                 text-[10px] font-medium tabular-nums
                                 text-accent-gold/90">
                    {cifra} · mismo problema
                </span>
            )}
            {posible && (
                <span className="rounded-lg border border-white/10 px-1.5 py-0.5
                                 text-[10px] tabular-nums text-white/60">
                    {cifra} · posible
                </span>
            )}
            {f.pdf_url && (
                <a href={f.pdf_url} target="_blank"
                   rel="noopener noreferrer"
                   className="ml-auto text-[12px] text-accent-gold/80
                              underline decoration-accent-gold/30
                              underline-offset-2 transition-colors
                              hover:text-accent-gold">
                    abrir
                </a>
            )}
            {/* POR TEMA NO ES POR PUNTO. Si ningún planteamiento del
                precedente pasó y coincidió el tema del asunto, se dice: no hay
                pregunta ni calificación que enseñar, y no se finge. */}
            {oaj && f.fuente === 'tema' && (
                <span className="w-full text-[11px] text-white/45">
                    coincide por el tema del asunto, no por un planteamiento
                </span>
            )}
            {oaj && f.pregunta && (
                <p className="w-full pt-0.5 text-[12px] leading-relaxed
                              text-white/60">
                    {f.pregunta}
                </p>
            )}
            {/* La calificación, LITERAL. Es la del planteamiento del
                precedente, no un juicio sobre el proyecto: compara el
                secretario. */}
            {oaj && (f.calificacion || f.razon) && (
                <p className="w-full text-[12px] leading-relaxed
                              text-white/45">
                    {f.calificacion && (
                        <span className="text-white/75">
                            {f.calificacion}
                        </span>
                    )}
                    {f.calificacion && f.razon && ' · '}
                    {f.razon}
                </p>
            )}
            {oaj && f.neun != null && (
                <span className="flex w-full flex-wrap items-center
                                 gap-x-2 gap-y-1 pt-1 text-[11px]
                                 text-white/45">
                    <span>
                        NEUN{' '}
                        <span className="select-all tabular-nums
                                         text-white/75">
                            {f.neun}
                        </span>
                    </span>
                    <CopiarNeun neun={f.neun} />
                    {f.enlace_oaj && (
                        <a href={f.enlace_oaj} target="_blank"
                           rel="noopener noreferrer"
                           className="text-accent-gold/80 underline
                                      decoration-accent-gold/30
                                      underline-offset-2
                                      transition-colors
                                      hover:text-accent-gold">
                            Buscador de la OAJ
                        </a>
                    )}
                </span>
            )}
        </li>
    );
}
