'use client';

/* ═══ EL PLAN ESTUDIO EN /precios (2-nov-2026) ══════════════════════════════
   David, 2-nov-2026: antes de quitar Básico y subir Pro, dejar /precios como
   está y añadir arriba de las tarjetas dos apartados, «Individual» y
   «Estudio». Individual son las cuatro tarjetas de siempre, sin tocar una
   coma (los anuncios y los videos que ya corren las enseñan así). Estudio es
   la tarjeta nueva, sola, para despachos.

   «Esto en realidad es psicología de compra»: no hay restricción de uso que
   separe a un despacho de un abogado. Lo que separa a Estudio es que el
   abogado lee «ilimitado». Por eso lo que va en el recuadro de exclusivas son
   las tres cosas que Platinum no tiene —consultas ilimitadas, la IA de última
   generación primero y 100 flujos— y lo demás va en la lista. Y por eso el
   uso razonable va DEBAJO, legible y con su enlace a los Términos: PROFECO
   calificó de engañoso el «ilimitado» con la condición escondida
   (ESTUDIO-PRECIOS §4).

   LA TARJETA ES UNA MÁS (2-nov-2026, segunda vuelta). La primera fue una
   pieza ancha y propia —marco de oro animado, brillo, títulos de 4 rem e
   íconos en cajas— y David la rechazó: «debe tener el mismo formato de
   presentación que las tarjetas de todos los planes». Ahora es la
   `PricingCard` de la página, con la estructura de Platinum, y lo que la
   hace más preciosa es su obra (`/web/arte/estudio.webp`, la biblioteca con
   oro en el artesonado, el capitel y los lomos) y un filo de oro más fino.
   Aquí quedan las piezas de la pestaña que no son la tarjeta: el selector,
   el cobro, la nota de uso razonable y el cuadro «Estudio frente a Platinum». */

import Link from 'next/link';
import { useRef } from 'react';
import { Check } from 'lucide-react';
import { redirectToCheckout } from '@/lib/stripe-client';
import { PLANS } from '@/lib/stripe';
import {
    CONSULTAS_ELITE_ESTUDIO,
    CUOTA_MB_ESTUDIO,
    FLUJOS_ESTUDIO,
    PAGINAS_ESTUDIO,
    AVISOS_DEL_COBRO_ESTUDIO,
    PLAN_ESTUDIO,
    USO_RAZONABLE_ESTUDIO,
} from '@/lib/plan-estudio';

export type VistaDePrecios = 'individual' | 'estudio';

/** El ancla de los Términos donde vive la letra del uso razonable. */
export const ENLACE_USO_RAZONABLE = '/terminos#uso-razonable-estudio';

/* Con comas a mano, no con `toLocaleString`: el servidor y el navegador
   tienen que escribir lo mismo en el primer render (ver `formatea` en la
   página). */
function conMiles(n: number) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** El precio de la tarjeta, del mismo `PLANS` que cobra. */
export const PRECIO_ESTUDIO = `$${conMiles(PLANS.platinum_estudio.price)}`;

/* El tachado de la tarjeta, como en las otras cuatro. No es un precio de
   Stripe: Stripe sólo tiene el de $1,499. */
export const PRECIO_TACHADO_ESTUDIO = '$2,000';

/* Las cifras de Platinum con las que se compara. Son las mismas que dice su
   tarjeta en esta página (560 consultas, 60 flujos) y las de `CUOTA_MB` en
   `lib/expedientes.ts` (2 GB); no se importan de ahí para no arrastrar el
   cliente de expedientes a /precios. */
export const CIFRAS_PLATINUM = { consultas: CONSULTAS_ELITE_ESTUDIO, flujos: 60, gb: 2 };

export const GB_ESTUDIO = Math.round(CUOTA_MB_ESTUDIO / 1024);

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
   David, 2-nov-2026: la pastilla negra con el bloque de oro que se deslizaba
   estaba «muy tosca y muy visible cuando debería ser sutil y elegante, quizá
   con una línea que separe uno de otro en medio y que diga "Tipo de plan"».
   Ahora es texto: la etiqueta en versalitas apagadas, como las demás
   etiquetas chicas de la página, y debajo las dos palabras con un filo
   vertical en medio. La elegida va en tinta con un subrayado de oro de un
   pixel; la otra, en piedra. Mensual | Anual se queda como estaba: es la
   segunda decisión y la que sí tiene que verse.

   Sigue siendo un `tablist` de verdad: las flechas, Inicio y Fin cambian de
   pestaña (y la activan, que con dos pestañas es lo esperable), y sólo la
   activa entra en el orden del tabulador. */
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
        <div className="flex flex-col items-center">
            <p id="tipo-de-plan" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-piedra-500">
                Tipo de plan
            </p>
            <div role="tablist" aria-labelledby="tipo-de-plan" className="mt-1.5 flex items-center">
                {VISTAS.map((v, i) => {
                    const activa = v.id === vista;
                    return (
                        <div key={v.id} className="flex items-center">
                            {/* El filo de en medio, sólo entre las dos. Sube dos
                                pixeles: centrado en la caja quedaba bajo,
                                porque la letra de la casa monta sobre la línea
                                de base y el subrayado ocupa el pie. */}
                            {i > 0 && <span aria-hidden className="mx-4 h-[15px] w-px -translate-y-0.5 bg-piedra-300 sm:mx-5" />}
                            <button
                                ref={el => { botones.current[i] = el; }}
                                type="button"
                                role="tab"
                                id={`pestana-${v.id}`}
                                aria-selected={activa}
                                aria-controls={`panel-${v.id}`}
                                tabIndex={activa ? 0 : -1}
                                onClick={() => onCambio(v.id)}
                                onKeyDown={e => alTeclear(e, i)}
                                className={`relative flex h-10 items-center px-1 font-serif text-[1.0625rem] tracking-[0.01em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold/70 focus-visible:ring-offset-4 focus-visible:ring-offset-cream-300 motion-reduce:transition-none ${activa ? 'text-tinta' : 'text-piedra-500 hover:text-charcoal-700'}`}
                            >
                                {v.nombre}
                                {/* El subrayado de oro: crece desde el centro al
                                    elegirla y se recoge al dejarla. */}
                                <span
                                    aria-hidden
                                    className={`absolute inset-x-1 bottom-1.5 h-px origin-center bg-accent-gold transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${activa ? 'scale-x-100' : 'scale-x-0'}`}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── El cobro de Estudio ─────────────────────────────────────────────────
   El de siempre (`redirectToCheckout`), con el precio de `PLANS`, y dos
   diferencias con el de las demás tarjetas, por eso va aparte y la tarjeta lo
   recibe en `cobro`:
   · sin sesión se va a entrar y vuelve a ESTA pestaña (`?plan=estudio`), sin
     el aviso previo;
   · los «todavía no» del checkout (la base aún no acepta Estudio, o quien
     paga Ultra) no son errores del pago: se dicen tal cual. */
export async function cobrarEstudio(email?: string | null) {
    const volver = `/login?redirect=${encodeURIComponent('/precios?plan=estudio')}`;
    const precio = PLANS.platinum_estudio.priceId;
    if (!precio) {
        alert('Error de configuración del plan. Por favor contacta a soporte.');
        return;
    }
    if (!email) {
        window.location.href = volver;
        return;
    }
    try {
        await redirectToCheckout(precio, email);
    } catch (error: any) {
        const mensaje = error?.message || 'Error desconocido';
        if (mensaje.includes('Email is required')) {
            window.location.href = volver;
        } else if (mensaje.includes('Price ID')) {
            alert('Error de configuración del plan. Por favor contacta a soporte.');
        } else if (AVISOS_DEL_COBRO_ESTUDIO.includes(mensaje)) {
            alert(mensaje);
        } else {
            alert(`Error al procesar el pago: ${mensaje}. Por favor intenta de nuevo o contacta a soporte.`);
        }
    }
}

/* ─── El uso razonable, en la nota de la tarjeta ──────────────────────────
   A la vista, en la letra de las notas de las demás tarjetas, con «uso
   razonable» enlazado a la cláusula de /terminos. Es la misma frase que
   `lib/plan-estudio.ts`; si un día cambia su arranque, se enseña entera con
   el enlace al final en vez de partirla mal. */
export function NotaUsoRazonable() {
    const PREFIJO = 'Consultas ilimitadas con uso razonable';
    const resto = USO_RAZONABLE_ESTUDIO.startsWith(PREFIJO)
        ? USO_RAZONABLE_ESTUDIO.slice(PREFIJO.length)
        : null;
    const enlace = 'text-accent-gold underline decoration-accent-gold/40 underline-offset-2 hover:decoration-accent-gold';
    return resto !== null ? (
        <>
            Consultas ilimitadas con{' '}
            <Link href={ENLACE_USO_RAZONABLE} className={enlace}>uso razonable</Link>
            {resto}
        </>
    ) : (
        <>
            {USO_RAZONABLE_ESTUDIO}{' '}
            <Link href={ENLACE_USO_RAZONABLE} className={enlace}>Uso razonable</Link>
        </>
    );
}

/* ─── Estudio frente a Platinum ───────────────────────────────────────────
   La tabla grande de la página compara los cuatro planes individuales; una
   quinta columna la volvía ilegible en el teléfono. Aquí, en la pestaña de
   Estudio, sólo lo que cambia frente a Platinum y lo que se queda igual, para
   que se vea que Estudio nunca es menos. */
export function EstudioFrentePlatinum({ onIndividual }: { onIndividual: () => void }) {
    const filas: [string, React.ReactNode, React.ReactNode][] = [
        ['Consultas al mes', `${CIFRAS_PLATINUM.consultas}`, 'Ilimitadas'],
        ['IA de última generación, primero', '—', <Check key="ia" className="mx-auto h-4 w-4" strokeWidth={2.5} />],
        ['Flujos de trabajo al mes', `${CIFRAS_PLATINUM.flujos}`, `${FLUJOS_ESTUDIO}`],
        ['Espacio para expedientes', `${CIFRAS_PLATINUM.gb} GB`, `${GB_ESTUDIO} GB`],
        ['Hojas por documento', `${PAGINAS_ESTUDIO}`, `${PAGINAS_ESTUDIO}`],
        ['Sentencia, Precedentes, Jurimetría, Cronología, Bóveda y Toulmin', <Check key="hp" className="mx-auto h-4 w-4" strokeWidth={2.5} />, <Check key="he" className="mx-auto h-4 w-4" strokeWidth={2.5} />],
        ['Precio', `$${conMiles(PLANS.platinum_monthly.price)} al mes`, `${PRECIO_ESTUDIO} al mes`],
    ];

    return (
        <div className="mx-auto mt-16 max-w-3xl">
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
