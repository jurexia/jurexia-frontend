'use client';

/* ═══ EL PLAN ESTUDIO EN /precios (2-nov-2026) ══════════════════════════════
   David, 2-nov-2026: antes de quitar Básico y subir Pro, dejar /precios como
   está y añadir arriba de las tarjetas dos apartados, «Individual» y
   «Estudio». Individual son las cuatro tarjetas de siempre, sin tocar una
   coma (los anuncios y los videos que ya corren las enseñan así). Estudio es
   la tarjeta nueva, sola, para despachos.

   «Esto en realidad es psicología de compra»: no hay restricción de uso que
   separe a un despacho de un abogado. Lo que separa a Estudio es que el
   abogado lee «ilimitado». Por eso las tres líneas grandes son las tres que
   Platinum no tiene —consultas ilimitadas, la IA de última generación primero
   y 100 flujos— y lo demás va más chico. Y por eso el uso razonable va
   DEBAJO, legible y con su enlace a los Términos: PROFECO calificó de
   engañoso el «ilimitado» con la condición escondida (ESTUDIO-PRECIOS §4).

   Aquí viven las tres piezas de la pestaña: el selector, la tarjeta y el
   cuadro «Estudio frente a Platinum». La página decide qué se ve. */

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowRight, Check, FileStack, HardDrive, Headphones, InfinityIcon, Loader2, Sparkles, Workflow } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';
import { PLANS } from '@/lib/stripe';
import { ObraEstudio } from '@/components/FondosDePlan';
import {
    CONSULTAS_ELITE_ESTUDIO,
    CUOTA_MB_ESTUDIO,
    FLUJOS_ESTUDIO,
    PAGINAS_ESTUDIO,
    PLAN_ESTUDIO,
    USO_RAZONABLE_ESTUDIO,
} from '@/lib/plan-estudio';

export type VistaDePrecios = 'individual' | 'estudio';

/** El ancla de los Términos donde vive la letra del uso razonable. */
export const ENLACE_USO_RAZONABLE = '/terminos#uso-razonable-estudio';

/* El tachado de la tarjeta, como en las otras cuatro. No es un precio de
   Stripe: Stripe sólo tiene el de $1,499. */
const PRECIO_TACHADO_ESTUDIO = 2000;

/* Las cifras de Platinum con las que se compara. Son las mismas que dice su
   tarjeta en esta página (560 consultas, 60 flujos) y las de `CUOTA_MB` en
   `lib/expedientes.ts` (2 GB); no se importan de ahí para no arrastrar el
   cliente de expedientes a /precios. */
const PLATINUM = { consultas: CONSULTAS_ELITE_ESTUDIO, flujos: 60, gb: 2 };

const GB_ESTUDIO = Math.round(CUOTA_MB_ESTUDIO / 1024);

/* Con comas a mano, no con `toLocaleString`: el servidor y el navegador
   tienen que escribir lo mismo en el primer render (ver `formatea` en la
   página). */
function conMiles(n: number) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * ¿La dirección pide la pestaña de Estudio? `?plan=estudio` es el enlace del
 * aviso de límite de Platinum (`AvisoLimitePlan`); `?vista=estudio`, el que se
 * comparte. Se acepta también el id del plan. Cualquier otro valor —p. ej.
 * `?plan=ultra_secretarios`, que ya se usa en otros enlaces— deja la página
 * en Individual, como hasta hoy.
 */
export function vistaDeLaDireccion(search: string): VistaDePrecios | null {
    const q = new URLSearchParams(search);
    const v = (q.get('plan') || q.get('vista') || '').trim().toLowerCase();
    return v === 'estudio' || v === PLAN_ESTUDIO ? 'estudio' : null;
}

/* ─── El selector «Individual | Estudio» ──────────────────────────────────
   Un `tablist` de verdad: las flechas, Inicio y Fin cambian de pestaña (y la
   activan, que con dos pestañas es lo esperable), y sólo la activa entra en
   el orden del tabulador. La pastilla dorada se desliza de una a otra; el
   texto de la activa pasa a tinta sobre el oro. */
const VISTAS: { id: VistaDePrecios; nombre: string }[] = [
    { id: 'individual', nombre: 'Individual' },
    { id: 'estudio', nombre: 'Estudio' },
];

export function SelectorDeVista({
    vista,
    onCambio,
}: {
    vista: VistaDePrecios;
    onCambio: (v: VistaDePrecios) => void;
}) {
    const botones = useRef<Array<HTMLButtonElement | null>>([]);
    const indice = VISTAS.findIndex(v => v.id === vista);

    const alTeclear = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
        let j = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % VISTAS.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + VISTAS.length) % VISTAS.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = VISTAS.length - 1;
        if (j < 0) return;
        e.preventDefault();
        onCambio(VISTAS[j].id);
        botones.current[j]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label="Tipo de plan"
            className="relative inline-grid grid-cols-2 rounded-xl bg-tinta p-1 ring-1 ring-accent-gold/35 shadow-[0_18px_40px_-22px_rgba(15,14,13,0.9)]"
        >
            <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-gradient-to-b from-[#f3e2b3] via-accent-gold to-[#a98a4c] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_22px_-8px_rgba(201,169,98,0.75)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                style={{ transform: `translateX(${indice * 100}%)` }}
            />
            {VISTAS.map((v, i) => {
                const activa = v.id === vista;
                return (
                    <button
                        key={v.id}
                        ref={el => { botones.current[i] = el; }}
                        type="button"
                        role="tab"
                        id={`pestana-${v.id}`}
                        aria-selected={activa}
                        aria-controls={`panel-${v.id}`}
                        tabIndex={activa ? 0 : -1}
                        onClick={() => onCambio(v.id)}
                        onKeyDown={e => alTeclear(e, i)}
                        className={`relative z-10 flex h-11 min-w-[8.75rem] items-center justify-center gap-2 rounded-lg px-5 text-[0.9375rem] font-semibold tracking-wide transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-100/80 sm:min-w-[10rem] ${activa ? 'text-tinta' : 'text-white/65 hover:text-white'}`}
                    >
                        {v.nombre}
                        {v.id === 'estudio' && (
                            <span className={`rounded px-1.5 py-[3px] text-[9px] font-bold leading-none tracking-[0.12em] transition-colors duration-300 ${activa ? 'bg-tinta/85 text-accent-gold' : 'bg-accent-gold/15 text-accent-gold'}`}>
                                NUEVO
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ─── La tarjeta ──────────────────────────────────────────────────────────
   Más que Platinum a simple vista: marco de oro vivo en vez de un anillo,
   la columnata dorada en vez de Themis, el nombre y el precio a la escala de
   un título, y las tres razones del plan a tamaño de titular. Todo lo demás
   del sistema se respeta: tinta, crema, oro sólo en filos y sellos, radios
   rectos (sin óvalos) y la letra de la casa. Nunca una balanza.

   `activa` escalona la entrada de cada bloque cuando la pestaña aparece; es
   el mismo movimiento que `AnimateOnScroll` (subir y aparecer, misma curva),
   pero atado a la pestaña: la tarjeta está fuera de la pantalla, a la
   derecha, hasta que se elige Estudio. */
export function TarjetaEstudio({ activa, animar = true }: { activa: boolean; animar?: boolean }) {
    const { user } = useAuth();
    const [cargando, setCargando] = useState(false);

    /* El cobro de siempre (`redirectToCheckout`), con el precio de `PLANS`.
       Sin sesión se va a entrar y vuelve a esta misma pestaña. */
    const elegir = async () => {
        const precio = PLANS.platinum_estudio.priceId;
        if (!precio) {
            alert('Error de configuración del plan. Por favor contacta a soporte.');
            return;
        }
        if (!user?.email) {
            window.location.href = `/login?redirect=${encodeURIComponent('/precios?plan=estudio')}`;
            return;
        }
        setCargando(true);
        try {
            await redirectToCheckout(precio, user.email);
        } catch (error: any) {
            const mensaje = error?.message || 'Error desconocido';
            if (mensaje.includes('Email is required')) {
                window.location.href = `/login?redirect=${encodeURIComponent('/precios?plan=estudio')}`;
            } else if (mensaje.includes('Price ID')) {
                alert('Error de configuración del plan. Por favor contacta a soporte.');
            } else {
                alert(`Error al procesar el pago: ${mensaje}. Por favor intenta de nuevo o contacta a soporte.`);
            }
        } finally {
            setCargando(false);
        }
    };

    /* Con `animar` en falso (prefers-reduced-motion) todo aparece de una vez.
       Llegando por la dirección (`?plan=estudio`) la entrada escalonada es la
       entrada de la página, como la de `AnimateOnScroll` en Individual. */
    const entra = (orden: number): React.CSSProperties => {
        const retraso = activa ? 0.18 + orden * 0.07 : 0;
        return {
            opacity: activa ? 1 : 0,
            transform: activa ? 'none' : 'translateY(18px)',
            transition: animar
                ? `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${retraso}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${retraso}s`
                : 'none',
        };
    };

    // El texto de uso razonable, con «uso razonable» como enlace a los Términos.
    const PREFIJO = 'Consultas ilimitadas con uso razonable';
    const restoUso = USO_RAZONABLE_ESTUDIO.startsWith(PREFIJO)
        ? USO_RAZONABLE_ESTUDIO.slice(PREFIJO.length)
        : null;

    return (
        <div className="estudio-marco relative rounded-[1.75rem] p-[1.5px]">
            <div className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gradient-to-b from-[#f3e2b3] to-accent-gold px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-tinta shadow-[0_8px_20px_-8px_rgba(201,169,98,0.8)]">
                PARA DESPACHOS
            </div>

            <div className="relative isolate overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-tinta text-white">
                <ObraEstudio arte="/web/arte/columnata.webp" />
                <div aria-hidden className="estudio-brillo" />

                <div className="relative z-[2] grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    {/* ── El nombre, el precio y el botón, sobre la obra ── */}
                    <div className="flex flex-col px-6 pb-8 pt-12 sm:px-10 sm:pt-14 lg:py-14 lg:pl-14 lg:pr-10">
                        <div style={entra(0)}>
                            <p className="text-[11px] font-bold tracking-[0.28em] text-accent-gold">
                                IUREXIA ESTUDIO
                            </p>
                            <h3 className="mt-3 font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.015em] text-white sm:text-display-l lg:text-[4rem]">
                                Plan Estudio
                            </h3>
                            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/75 sm:text-lg">
                                Para despachos que trabajan sin contar consultas.
                            </p>
                        </div>

                        <div className="mt-8" style={entra(1)}>
                            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                <span className="text-[3.25rem] font-bold leading-none tracking-tight text-white tabular-nums sm:text-6xl">
                                    ${conMiles(PLANS.platinum_estudio.price)}
                                </span>
                                <span className="text-lg text-white/60">MXN/mes</span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="text-sm text-white/50 line-through tabular-nums">
                                    ${conMiles(PRECIO_TACHADO_ESTUDIO)} MXN/mes
                                </span>
                                <span className="rounded-md border border-accent-gold/40 bg-accent-gold/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-accent-gold">
                                    Sólo mensual
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 lg:mt-auto lg:pt-10" style={entra(2)}>
                            <button
                                type="button"
                                onClick={elegir}
                                disabled={cargando}
                                className="boton-crema h-14 w-full gap-2 px-6 text-base disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-sm"
                            >
                                {cargando ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        Elegir Estudio
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                            <p className="mt-3 text-xs text-white/45">
                                Pago seguro con Stripe · Cancela cuando quieras
                            </p>
                        </div>
                    </div>

                    {/* ── Lo que trae: en el teléfono, sobre negro limpio; en
                        escritorio, en un cristal oscuro sobre la obra ── */}
                    <div className="px-6 pb-8 sm:px-10 sm:pb-10 lg:border-l lg:border-accent-gold/15 lg:bg-[#0f0e0d]/[0.78] lg:py-14 lg:pl-12 lg:pr-14 lg:backdrop-blur-md">
                        <p className="text-sm font-semibold tracking-wide text-accent-gold" style={entra(1)}>
                            Todo lo del Plan Platinum, y además:
                        </p>

                        <ul className="mt-6 space-y-6">
                            {[
                                {
                                    icono: InfinityIcon,
                                    titulo: 'Consultas ilimitadas',
                                    detalle: `Sin cupo mensual que se agote. En Platinum son ${PLATINUM.consultas} al mes.`,
                                },
                                {
                                    icono: Sparkles,
                                    titulo: 'IA de última generación',
                                    detalle: 'Cada nueva generación de la IA Jurídica de Iurexia llega primero a Estudio.',
                                },
                                {
                                    icono: Workflow,
                                    titulo: `${FLUJOS_ESTUDIO} flujos de trabajo al mes`,
                                    detalle: `Escritos completos, paso a paso. En Platinum son ${PLATINUM.flujos}.`,
                                },
                            ].map(({ icono: Icono, titulo, detalle }, i) => (
                                <li key={titulo} className="flex items-start gap-3.5 sm:gap-4" style={entra(2 + i)}>
                                    <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-accent-gold/45 bg-gradient-to-b from-accent-gold/25 to-accent-gold/[0.04] text-accent-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                                        <Icono className="h-6 w-6" strokeWidth={1.6} />
                                    </span>
                                    <span className="min-w-0 pt-0.5">
                                        <span className="block font-serif text-[1.5rem] leading-[1.15] text-white [text-wrap:balance] sm:text-[1.85rem]">
                                            {titulo}
                                        </span>
                                        <span className="mt-1 block text-sm leading-relaxed text-white/60">
                                            {detalle}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 border-t border-accent-gold/20 pt-6" style={entra(5)}>
                            <ul className="grid gap-x-5 gap-y-3 sm:grid-cols-3">
                                {[
                                    { icono: HardDrive, texto: `${GB_ESTUDIO} GB para tus expedientes`, nota: `Platinum: ${PLATINUM.gb} GB` },
                                    { icono: FileStack, texto: `Documentos de hasta ${PAGINAS_ESTUDIO} hojas`, nota: null },
                                    { icono: Headphones, texto: 'Soporte prioritario', nota: null },
                                ].map(({ icono: Icono, texto, nota }) => (
                                    <li key={texto} className="flex items-start gap-2.5">
                                        <Icono className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" strokeWidth={1.8} />
                                        <span className="text-sm leading-snug text-white/85">
                                            {texto}
                                            {nota && <span className="mt-0.5 block text-xs text-white/45">{nota}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* El uso razonable: a la vista, en letra que se lee, con
                            su enlace. Es la misma frase que `lib/plan-estudio.ts`
                            y que la cláusula de /terminos. */}
                        <p className="mt-7 text-[13px] leading-relaxed text-white/60" style={entra(6)}>
                            {restoUso !== null ? (
                                <>
                                    Consultas ilimitadas con{' '}
                                    <Link href={ENLACE_USO_RAZONABLE} className="text-accent-gold underline decoration-accent-gold/40 underline-offset-2 hover:decoration-accent-gold">
                                        uso razonable
                                    </Link>
                                    {restoUso}
                                </>
                            ) : (
                                <>
                                    {USO_RAZONABLE_ESTUDIO}{' '}
                                    <Link href={ENLACE_USO_RAZONABLE} className="text-accent-gold underline underline-offset-2">
                                        Uso razonable
                                    </Link>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Estudio frente a Platinum ───────────────────────────────────────────
   La tabla grande de la página compara los cuatro planes individuales; una
   quinta columna la volvía ilegible en el teléfono. Aquí, en la pestaña de
   Estudio, sólo lo que cambia frente a Platinum y lo que se queda igual, para
   que se vea que Estudio nunca es menos. */
export function EstudioFrentePlatinum({ onIndividual }: { onIndividual: () => void }) {
    const filas: [string, React.ReactNode, React.ReactNode][] = [
        ['Consultas al mes', `${PLATINUM.consultas}`, 'Ilimitadas'],
        ['IA de última generación, primero', '—', <Check key="ia" className="mx-auto h-4 w-4" strokeWidth={2.5} />],
        ['Flujos de trabajo al mes', `${PLATINUM.flujos}`, `${FLUJOS_ESTUDIO}`],
        ['Espacio para expedientes', `${PLATINUM.gb} GB`, `${GB_ESTUDIO} GB`],
        ['Hojas por documento', `${PAGINAS_ESTUDIO}`, `${PAGINAS_ESTUDIO}`],
        ['Sentencia, Precedentes, Jurimetría, Cronología, Bóveda y Toulmin', <Check key="hp" className="mx-auto h-4 w-4" strokeWidth={2.5} />, <Check key="he" className="mx-auto h-4 w-4" strokeWidth={2.5} />],
        ['Precio', `$${conMiles(PLANS.platinum_monthly.price)} al mes`, `$${conMiles(PLANS.platinum_estudio.price)} al mes`],
    ];

    return (
        <div className="mx-auto mt-14 max-w-3xl">
            <h3 className="text-center font-serif text-display-xs font-normal text-tinta sm:text-display-s">
                Estudio frente a Platinum
            </h3>
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)]">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th scope="col" className="border-b border-piedra-200 px-4 py-3.5 text-left font-medium text-piedra-600 sm:px-6">
                                <span className="sr-only">Característica</span>
                            </th>
                            <th scope="col" className="w-[26%] border-b border-piedra-200 px-2 py-3.5 text-center font-medium text-charcoal-900 sm:w-[24%]">Platinum</th>
                            <th scope="col" className="w-[28%] border-b border-accent-gold/30 bg-tinta px-2 py-3.5 text-center font-bold text-accent-gold sm:w-[24%]">Estudio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* El filo de cada fila, por celda: claro sobre blanco y
                            apenas visible sobre la columna en tinta, que así se
                            lee como una sola pieza. */}
                        {filas.map(([rasgo, platinum, estudio], i) => {
                            const ultima = i === filas.length - 1;
                            return (
                                <tr key={rasgo}>
                                    <th scope="row" className={`px-4 py-3.5 text-left font-normal text-charcoal-700 sm:px-6 ${ultima ? '' : 'border-b border-piedra-100'}`}>{rasgo}</th>
                                    <td className={`px-2 py-3.5 text-center text-piedra-700 ${ultima ? '' : 'border-b border-piedra-100'}`}>{platinum}</td>
                                    <td className={`bg-tinta px-2 py-3.5 text-center font-semibold text-accent-gold ${ultima ? '' : 'border-b border-white/[0.07]'}`}>{estudio}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-piedra-600 sm:flex-row sm:justify-between sm:text-left">
                <span>
                    Consultas ilimitadas con{' '}
                    <Link href={ENLACE_USO_RAZONABLE} className="font-medium text-charcoal-900 underline underline-offset-2">
                        uso razonable
                    </Link>
                    .
                </span>
                <button
                    type="button"
                    onClick={onIndividual}
                    className="font-medium text-charcoal-900 underline-offset-4 hover:underline"
                >
                    Ver los planes individuales
                </button>
            </div>
        </div>
    );
}
