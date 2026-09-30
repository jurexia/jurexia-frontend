'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from './primitivas';
import { guardarOrigen } from './api';
import type {
    CambiosDelOrigen, InstanciaDelActo, OrigenDelActoReclamado,
    ProblemaAnteLaEjecutoria, VinculacionEjecutoria,
} from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   DE DÓNDE VIENE LO RECLAMADO (30-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   David, tras un amparo directo contra un juicio oral mercantil: «Siempre, en
   amparo directo, partimos de la base de que hay una sala. Es decir, una
   segunda instancia. Pero no siempre es así. La segunda instancia ocurre sólo
   si hubo recurso de apelación […]. La autoridad responsable era el propio
   juez de oralidad mercantil. En segundo lugar, la sentencia había sido
   dictada en cumplimiento».

   El proyecto hablaba de «la Sala», del «toca» y de los «agravios» de un
   juicio que nunca tuvo alzada: contra la sentencia del oral mercantil no
   procede recurso ordinario (art. 1390 Bis del Código de Comercio), y lo mismo
   pasa con un laudo, una nulidad del TFJA o un juicio de cuantía menor. El
   servidor ya lo lee del expediente; esta tarjeta lo ENSEÑA donde se lee el
   asunto —junto a la autoridad responsable, que es donde se nota el error— y
   deja corregirlo antes de que se escriba una línea.

   LA SEGUNDA MITAD ES LA EJECUTORIA. Si la sentencia reclamada se dictó en
   cumplimiento de un amparo anterior, lo que esa ejecutoria dejó atado ya no
   se discute (es inoperante) y sólo se estudia lo que la responsable resolvió
   con libertad de jurisdicción. Con los efectos pegados aquí, el servidor
   clasifica cada planteamiento; si TODO quedó vinculado, el amparo es
   improcedente (art. 61, fracción IX, de la Ley de Amparo) y se sobresee.

   Sólo se monta si el servidor manda `origen`. Sin él —cuentas sin la bandera
   `instancia_origen`— la pantalla queda exactamente como estaba. */

const OPCIONES_INSTANCIA: [InstanciaDelActo, string][] = [
    ['unica', 'Única instancia'],
    ['alzada', 'Segunda instancia (apelación)'],
    ['', 'No consta'],
];

/** Lo que el servidor guarda de los efectos de la ejecutoria. */
const TOPE_EFECTOS = 3000;
/** A partir de aquí los efectos leídos llegan plegados: son la fuente, para
 *  comprobar, y abiertos empujan la tarjeta fuera de la pantalla. */
const EFECTOS_LARGOS = 420;

/* La llave del pipeline es el TEXTO de la pregunta. Se compara sin acentos,
   sin signos y sin espacios de más —igual que `ComoSeEstudiara`—, para que un
   «¿» o un doble espacio no dejen al problema sin su distintivo. */
const norm = (t: string) => (t || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Cómo quedó ESTE planteamiento frente a la ejecutoria, si el servidor lo
 *  clasificó. null si no hay origen, no hay clasificación o no casa el texto. */
export function vinculacionDe(
    origen: OrigenDelActoReclamado | null | undefined, pregunta: string,
): ProblemaAnteLaEjecutoria | null {
    const lista = origen?.cumplimiento?.clasificacion?.problemas;
    if (!lista?.length || !pregunta) return null;
    const k = norm(pregunta);
    if (!k) return null;
    return lista.find((p) => norm(p.pregunta) === k) ?? null;
}

/* LOS DISTINTIVOS. El oro es para lo que exige decisión (primitivas.tsx):
   sólo lo lleva la inconstitucionalidad de la norma, donde las Salas están
   divididas y decide él. Lo vinculado va en ámbar —se cae—; lo libre, en
   verde —se estudia—; lo que no es materia de este amparo, neutro. */
const DISTINTIVOS: Record<Exclude<VinculacionEjecutoria, 'no_consta'>, { texto: string; clase: string }> = {
    vinculado: {
        texto: 'Vinculado por la ejecutoria · inoperante',
        clase: 'border-amber-400/30 bg-amber-400/[0.08] text-amber-200/90',
    },
    consentido: {
        texto: 'Sólo reiterado y no impugnado la primera vez · inoperante (2a./J. 113/2012)',
        clase: 'border-amber-400/25 bg-amber-400/[0.05] text-amber-200/80',
    },
    libre: {
        texto: 'Libertad de jurisdicción · se estudia',
        clase: 'border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-200/90',
    },
    mixto: {
        texto: 'Parte vinculada, parte libre',
        clase: 'border-amber-400/25 bg-white/[0.03] text-amber-100/80',
    },
    exceso_defecto: {
        texto: 'Exceso o defecto en el cumplimiento · no es materia de este amparo',
        clase: 'border-white/15 bg-white/[0.04] text-white/65',
    },
    constitucionalidad: {
        texto: 'Inconstitucionalidad de la norma aplicada · criterio dividido (1a. IX/2022 vs 2a. CXLVII/2017): decide tú',
        clase: 'border-accent-gold/40 bg-accent-gold/[0.08] text-accent-gold',
    },
};

/** El distintivo pequeño de cada tarjeta de problema. Nada si no hay
 *  clasificación o si la vinculación no consta. El porqué y el efecto de la
 *  ejecutoria van en el `title`: se leen al pasar el ratón, sin ocupar sitio. */
export function DistintivoEjecutoria({ origen, pregunta, bloque = false, className }: {
    origen: OrigenDelActoReclamado | null | undefined;
    pregunta: string;
    /** En su propio renglón, debajo de la pregunta. Lo pone el componente y no
     *  quien lo llama: un envoltorio fuera dejaría su margen aunque no hubiera
     *  distintivo, y las cuentas sin la bandera verían moverse la lista. */
    bloque?: boolean;
    className?: string;
}) {
    const p = vinculacionDe(origen, pregunta);
    if (!p || p.vinculacion === 'no_consta') return null;
    const d = DISTINTIVOS[p.vinculacion];
    const titulo = [
        p.porQue,
        p.efecto && `Efecto de la ejecutoria: ${p.efecto}`,
        p.parteVinculada && `Lo vinculado: ${p.parteVinculada}`,
        p.parteLibre && `Lo libre: ${p.parteLibre}`,
    ].filter(Boolean).join('\n\n');
    return (
        <span data-vinculacion={p.vinculacion} title={titulo || undefined}
              className={cn(bloque ? 'mt-1 block w-fit' : 'inline-block',
                  'max-w-full cursor-help rounded border px-1.5 py-0.5',
                  'text-[11px] font-medium leading-snug', d.clase, className)}>
            {d.texto}
        </span>
    );
}

/* Cuántos hay de cada clase, con su número delante. Vinculados y libres se
   dicen siempre —aunque sean cero, es lo que David pidió leer—; los demás,
   sólo si los hay. */
const RENGLONES: [VinculacionEjecutoria, string, string, boolean][] = [
    ['vinculado', 'vinculado por la ejecutoria · inoperante',
     'vinculados por la ejecutoria · inoperantes', true],
    ['consentido', 'sólo reiterado y no impugnado la primera vez · inoperante',
     'sólo reiterados y no impugnados la primera vez · inoperantes', false],
    ['libre', 'resuelto con libertad de jurisdicción · se estudia',
     'resueltos con libertad de jurisdicción · se estudian', true],
    ['mixto', 'con una parte vinculada y otra libre',
     'con una parte vinculada y otra libre', false],
    ['constitucionalidad', 'de inconstitucionalidad de la norma aplicada · decides tú',
     'de inconstitucionalidad de la norma aplicada · decides tú', false],
    ['exceso_defecto', 'de exceso o defecto en el cumplimiento · no es materia de este amparo',
     'de exceso o defecto en el cumplimiento · no son materia de este amparo', false],
];

interface Borrador {
    instancia: InstanciaDelActo;
    cumplimiento: boolean;
    ejecutoria: string;
    efectos: string;
}

export default function OrigenDelActo({
    origen, numero, userEmail, onGuardado, ocupado = false,
}: {
    origen: OrigenDelActoReclamado;
    numero: string;
    userEmail: string;
    /** Tras guardar: la página vuelve a pedir el asunto (cambian el órgano,
     *  la voz y la clasificación). Recibe el origen que devolvió el servidor. */
    onGuardado?: (o: OrigenDelActoReclamado | null) => void | Promise<void>;
    /** Hay algo corriendo en la página: guardar espera. */
    ocupado?: boolean;
}) {
    const c = origen.cumplimiento;
    const base = useMemo<Borrador>(() => ({
        instancia: origen.instancia,
        cumplimiento: c.consta,
        ejecutoria: c.ejecutoria,
        efectos: c.efectos,
    }), [origen.instancia, c.consta, c.ejecutoria, c.efectos]);

    const [borrador, setBorrador] = useState<Borrador>(base);
    /* LO QUE ÉL ESCRIBE NO LO PISA LA SONDA. Mientras corre lo automático, la
       página vuelve a pedir el asunto cada cuatro segundos; si cada vuelta
       reseteara el formulario, se le borraría lo que está pegando. Sólo se
       sincroniza con el servidor mientras él no haya tocado nada. */
    const tocado = useRef(false);
    useEffect(() => { if (!tocado.current) setBorrador(base); }, [base]);

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [hecho, setHecho] = useState(false);
    const [efectosAbiertos, setEfectosAbiertos] = useState(false);

    const cambiar = (x: Partial<Borrador>) => {
        tocado.current = true;
        setHecho(false); setError('');
        setBorrador((b) => ({ ...b, ...x }));
    };

    const sucio = borrador.instancia !== base.instancia
        || borrador.cumplimiento !== base.cumplimiento
        || (borrador.cumplimiento && (borrador.ejecutoria.trim() !== base.ejecutoria.trim()
            || borrador.efectos.trim() !== base.efectos.trim()));

    const guardar = async () => {
        if (!sucio || guardando || ocupado || !numero) return;
        setGuardando(true); setError(''); setHecho(false);
        try {
            /* VA EL CUMPLIMIENTO ENTERO, no sólo lo cambiado: es lo que él
               confirma. La ejecutoria y sus efectos sólo viajan si marcó que
               se dictó en cumplimiento. La instancia, sólo si la cambió (el
               servidor guarda lo que él corrigió antes). */
            const cambios: CambiosDelOrigen = { cumplimiento: borrador.cumplimiento };
            /* LA INSTANCIA SÓLO VIAJA SI ÉL LA CAMBIÓ. «No consta» elegido
               por él se manda como 'no_consta' (gana a la lectura); mandar «»
               le devolvería la decisión al expediente y reaparecería lo leído. */
            if (borrador.instancia !== base.instancia) {
                cambios.instancia = borrador.instancia || 'no_consta';
            }
            if (borrador.cumplimiento) {
                cambios.ejecutoria = borrador.ejecutoria.trim();
                cambios.efectos = borrador.efectos.trim().slice(0, TOPE_EFECTOS);
            }
            const nuevo = await guardarOrigen(numero, userEmail, cambios);
            tocado.current = false;
            if (nuevo) {
                setBorrador({
                    instancia: nuevo.instancia, cumplimiento: nuevo.cumplimiento.consta,
                    ejecutoria: nuevo.cumplimiento.ejecutoria, efectos: nuevo.cumplimiento.efectos,
                });
            }
            setHecho(true);
            await onGuardado?.(nuevo);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar de dónde viene lo reclamado.');
        } finally {
            setGuardando(false);
        }
    };

    /* EL SOBRESEIMIENTO NO SE ESCRIBE SOLO. El servidor lo propone cuando la
       ejecutoria no dejó libertad alguna; el proyecto sólo sobresee si él lo
       confirma aquí —y lo puede retirar—. Va aparte del formulario: no
       depende de que haya otra cosa por guardar. */
    const [confirmando, setConfirmando] = useState(false);
    const confirmarSobreseer = async (valor: boolean) => {
        if (confirmando || guardando || ocupado || !numero) return;
        setConfirmando(true); setError('');
        try {
            const nuevo = await guardarOrigen(numero, userEmail, { sobreseer: valor });
            await onGuardado?.(nuevo);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la decisión sobre el sobreseimiento.');
        } finally {
            setConfirmando(false);
        }
    };

    /* LA CLASIFICACIÓN ES LA DEL SERVIDOR, la guardada: no la del borrador.
       Mientras él escribe, lo que se cuenta es lo último que se clasificó. */
    const clasif = c.consta ? c.clasificacion : null;
    const cuenta = (v: VinculacionEjecutoria) =>
        clasif ? clasif.problemas.filter((p) => p.vinculacion === v).length : 0;

    const efectosLargos = borrador.efectos.length > EFECTOS_LARGOS;
    const plegados = efectosLargos && !efectosAbiertos;
    const pasaDelTope = borrador.efectos.trim().length > TOPE_EFECTOS;

    return (
        <div data-origen-instancia={origen.instancia || 'no_consta'}
             data-origen-cumplimiento={c.consta ? 'si' : 'no'}
             className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
                    De dónde viene lo reclamado
                </p>
                <span className={cn('rounded border px-1.5 py-0.5 text-[10.5px] uppercase tracking-wide',
                    origen.fuente === 'secretario'
                        ? 'border-accent-gold/35 text-accent-gold/90'
                        : 'border-white/15 text-white/50')}>
                    {origen.fuente === 'secretario' ? 'Corregido por ti' : 'Leído del expediente'}
                </span>
            </div>

            {origen.aviso ? (
                <p className="mt-2 text-[14px] leading-relaxed text-white/85">{origen.aviso}</p>
            ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                    No consta en lo leído si hubo apelación ni si la sentencia se dictó en
                    cumplimiento de una ejecutoria de amparo. Si lo sabes, dilo aquí: cambia cómo
                    se nombra a la responsable y qué planteamientos se estudian.
                </p>
            )}
            {origen.organo && (
                <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                    En el proyecto, a quien la dictó se le nombra «{origen.organo}».
                </p>
            )}

            {/* ── LO QUE LA EJECUTORIA DEJÓ ATADO Y LO QUE NO ── */}
            {/* SÓLO LO QUE EL SERVIDOR PROPONE (revisión adversarial): «todo
                vinculado» no basta si la ejecutoria dejó libertad; ahí se niega
                con conceptos inoperantes, no se sobresee (2a./J. 113/2012). */}
            {c.consta && (c.sobreseerPropuesto || c.sobreseerConfirmado) && (
                <div data-todo-vinculado
                     data-sobreseer={c.sobreseerConfirmado ? 'confirmado' : 'propuesto'}
                     className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/35
                                bg-amber-400/[0.07] px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <div className="min-w-0">
                        <p className="text-[13px] leading-relaxed text-amber-100/90">
                            {c.sobreseerConfirmado
                                ? 'Confirmaste el sobreseimiento: el proyecto no estudia el fondo y sobresee por '
                                  + 'improcedencia (arts. 61, fracción IX, y 63, fracción V, de la Ley de Amparo).'
                                : 'Todo lo reclamado se dictó vinculado por la ejecutoria: el amparo es improcedente '
                                  + '(art. 61, fracción IX, de la Ley de Amparo) y se propone sobreseer. El proyecto '
                                  + 'sólo sobresee si lo confirmas.'}
                        </p>
                        <button type="button"
                                onClick={() => { void confirmarSobreseer(!c.sobreseerConfirmado); }}
                                disabled={confirmando || guardando || ocupado}
                                title={ocupado ? 'Espera a que termine lo que está corriendo' : undefined}
                                className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-300/40
                                           px-2.5 text-[12px] font-medium text-amber-200 hover:text-amber-100
                                           disabled:opacity-50">
                            {confirmando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {c.sobreseerConfirmado ? 'Retirar: estudiar el fondo' : 'Confirmar el sobreseimiento'}
                        </button>
                    </div>
                </div>
            )}
            {clasif && clasif.problemas.length > 0 && (
                <ul className="mt-3 space-y-1">
                    {RENGLONES.filter(([v, , , siempre]) => siempre || cuenta(v) > 0).map(([v, uno, varios]) => {
                        const n = cuenta(v);
                        return (
                            <li key={v} data-cuenta={v} className="flex items-baseline gap-2.5 text-[13px] leading-snug">
                                <span className={cn('w-5 shrink-0 text-right font-semibold tabular-nums',
                                    n === 0 ? 'text-white/35'
                                        : v === 'vinculado' ? 'text-amber-300'
                                        : v === 'libre' ? 'text-emerald-300'
                                        : v === 'constitucionalidad' ? 'text-accent-gold'
                                        : 'text-white/70')}>
                                    {n}
                                </span>
                                <span className={n === 0 ? 'text-white/40' : 'text-white/75'}>
                                    {n === 1 ? uno : varios}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
            {clasif?.resumen && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{clasif.resumen}</p>
            )}
            {c.consta && !clasif && (
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                    {c.efectos.trim()
                        ? 'Los planteamientos aún no se han clasificado frente a esos efectos.'
                        : 'Sin los efectos de la ejecutoria no se puede saber qué quedó vinculado: pégalos abajo.'}
                </p>
            )}

            {/* ── LA CORRECCIÓN ── */}
            <div className="mt-3.5 border-t border-white/[0.06] pt-3">
                <p className="text-[12px] text-white/55">La sentencia reclamada se dictó en</p>
                <div role="group" aria-label="Instancia de la sentencia reclamada"
                     className="mt-1.5 flex flex-wrap gap-1.5">
                    {OPCIONES_INSTANCIA.map(([v, rotulo]) => {
                        const activa = borrador.instancia === v;
                        return (
                            <button key={v || 'no_consta'} type="button" aria-pressed={activa}
                                    disabled={guardando}
                                    onClick={() => cambiar({ instancia: v })}
                                    className={cn('rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors',
                                        activa ? 'border-accent-gold/50 text-accent-gold'
                                               : 'border-white/10 text-white/60 hover:text-white/85')}>
                                {rotulo}
                            </button>
                        );
                    })}
                </div>

                <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                    <input type="checkbox" checked={borrador.cumplimiento} disabled={guardando}
                           onChange={(e) => cambiar({ cumplimiento: e.target.checked })}
                           className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#c9a962] [color-scheme:dark]" />
                    <span className="text-[13px] leading-snug text-white/80">
                        Se dictó en cumplimiento de una ejecutoria de amparo
                    </span>
                </label>

                {borrador.cumplimiento && (
                    <div className="mt-2.5 space-y-2.5 pl-6">
                        <div>
                            <label htmlFor="origen-ejecutoria"
                                   className="block text-[12px] text-white/55">
                                Qué ejecutoria
                            </label>
                            <input id="origen-ejecutoria" value={borrador.ejecutoria}
                                   disabled={guardando}
                                   onChange={(e) => cambiar({ ejecutoria: e.target.value })}
                                   placeholder="p. ej.: amparo directo civil 123/2024"
                                   className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03]
                                              px-3 py-2 text-[13px] text-white/80
                                              placeholder:text-white/40 focus:border-accent-gold/40
                                              focus:outline-none" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <label htmlFor="origen-efectos" className="block text-[12px] text-white/55">
                                    Sus efectos: lo que mandó hacer
                                </label>
                                {efectosLargos && (
                                    <button type="button"
                                            onClick={() => setEfectosAbiertos((a) => !a)}
                                            className="text-[12px] text-accent-gold/80 hover:text-accent-gold">
                                        {plegados ? 'ver y corregir' : 'plegar'}
                                    </button>
                                )}
                            </div>
                            {plegados ? (
                                <p className="mt-1 line-clamp-3 whitespace-pre-line text-[12.5px] leading-relaxed text-white/55">
                                    {borrador.efectos}
                                </p>
                            ) : (
                                <textarea id="origen-efectos" value={borrador.efectos}
                                          disabled={guardando}
                                          rows={efectosLargos ? 9 : 4}
                                          onChange={(e) => {
                                              /* Lo que él pega no se pliega en su cara. */
                                              setEfectosAbiertos(true);
                                              cambiar({ efectos: e.target.value });
                                          }}
                                          placeholder="Pega aquí los efectos de la concesión: «para el efecto de que la autoridad responsable deje insubsistente la sentencia reclamada y dicte otra en la que…»"
                                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03]
                                                     px-3 py-2 text-[13px] leading-relaxed text-white/80
                                                     placeholder:text-white/40 focus:border-accent-gold/40
                                                     focus:outline-none" />
                            )}
                            <p className={cn('mt-1 text-[11.5px]',
                                pasaDelTope ? 'text-amber-300/90' : 'text-white/40')}>
                                {borrador.efectos.trim().length.toLocaleString('es-MX')} / {TOPE_EFECTOS.toLocaleString('es-MX')} caracteres
                                {pasaDelTope && ' · se guardan los primeros 3,000: deja sólo los efectos, sin las consideraciones'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <button type="button" onClick={() => { void guardar(); }}
                            disabled={!sucio || guardando || ocupado}
                            title={ocupado ? 'Espera a que termine lo que está corriendo' : undefined}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent-gold/45
                                       px-3 text-[12.5px] font-medium text-accent-gold">
                        {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                    {hecho && !sucio && (
                        <span className="text-[12px] text-emerald-300/85">
                            Guardado. El asunto se vuelve a leer con este origen.
                        </span>
                    )}
                    {!hecho && sucio && (
                        <span className="text-[12px] text-white/45">
                            Al guardar cambia cómo se nombra a la responsable y cómo se estudian los planteamientos.
                        </span>
                    )}
                </div>
                {error && (
                    <p role="alert" className="mt-2 text-[12px] leading-relaxed text-red-300/90">{error}</p>
                )}
            </div>
        </div>
    );
}
