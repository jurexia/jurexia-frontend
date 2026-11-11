'use client';
/**
 * Aterrizaje del Buen Fin 2026 (13 al 17 de noviembre). Ver `src/lib/buen-fin.ts`.
 *
 * La página no presiona: enseña la cuenta. Quien compra aquí tiene que poder
 * explicarle a otro por qué fue buena idea, con números que comprueba él
 * mismo. Por eso abre con la cuenta y no con un adjetivo, recomienda el anual
 * porque es lo que más le conviene, y escribe las condiciones antes del botón.
 *
 * Fuera de las fechas manda a /precios. `?vista=previa` la enseña antes del 13
 * para revisarla.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';
import { BUEN_FIN, buenFinVigente, cuenta, pesos, type PlanBuenFin } from '@/lib/buen-fin';

const PLANES: PlanBuenFin[] = ['basico', 'pro', 'platinum'];

export default function BuenFinPage() {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [anual, setAnual] = useState(true);
    const [cargando, setCargando] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const previa = new URLSearchParams(window.location.search).get('vista') === 'previa';
        if (buenFinVigente() || previa) setVisible(true);
        else window.location.replace('/precios');
    }, []);

    const elegir = async (plan: PlanBuenFin) => {
        setError('');
        if (!user?.email) {
            window.location.href = '/login?redirect=/buen-fin';
            return;
        }
        const c = cuenta(plan);
        const priceId = anual ? c.priceIdAnual : c.priceIdMensual;
        if (!priceId) {
            setError('No pudimos preparar el pago. Escríbanos a soporte@iurexia.com.');
            return;
        }
        setCargando(plan);
        try {
            await redirectToCheckout(priceId, user.email, BUEN_FIN.codigo);
        } catch (e: any) {
            setError(e?.message?.includes('Ya tienes este plan')
                ? 'Su cuenta ya tiene ese plan activo.'
                : 'No pudimos abrir el pago. Inténtelo de nuevo o escríbanos a soporte@iurexia.com.');
            setCargando(null);
        }
    };

    if (!visible) return <div className="min-h-screen bg-cream-200" />;

    const pro = cuenta('pro');

    return (
        <div className="min-h-screen bg-cream-200 px-4 py-10 sm:py-16">
            <div className="mx-auto w-full max-w-5xl">
                <Link href="/" className="mb-10 block font-serif text-2xl font-semibold tracking-wide text-charcoal-900">Iurexia</Link>

                {/* ── La tesis: haga la cuenta ─────────────────────────── */}
                <div className="max-w-2xl">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-accent-brown">Buen Fin · del 13 al 17 de noviembre</div>
                    <h1 className="mt-3 font-serif text-4xl leading-tight text-charcoal-900 sm:text-5xl [text-wrap:balance]">
                        Haga la cuenta.
                    </h1>
                    <p className="mt-4 text-lg leading-relaxed text-piedra-700">
                        30 % de descuento en su primer pago de Iurexia, en cualquier plan. No le vamos a decir que
                        es una oportunidad única: le enseñamos los números y usted decide.
                    </p>
                </div>

                <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-2xl border border-cream-300 bg-white p-7 sm:p-9">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-accent-brown">Un año de Iurexia Pro</div>
                        <dl className="mt-5 divide-y divide-cream-300 text-charcoal-900">
                            <div className="flex items-baseline justify-between gap-4 py-3">
                                <dt className="text-sm text-piedra-700">Pagando mes a mes (12 × {pesos(pro.mensual)})</dt>
                                <dd className="font-serif text-2xl text-piedra-600 line-through decoration-1">{pesos(pro.anioMesAMes)}</dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4 py-3">
                                <dt className="text-sm text-piedra-700">Plan anual en Buen Fin</dt>
                                <dd className="font-serif text-3xl">{pesos(pro.anualBuenFin)}</dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4 py-3">
                                <dt className="text-sm font-medium">Se queda en su bolsillo</dt>
                                <dd className="font-serif text-3xl text-accent-brown">{pesos(pro.ahorro)}</dd>
                            </div>
                        </dl>
                        <p className="mt-4 text-sm leading-relaxed text-piedra-700">
                            Es {pro.ahorroPct} % menos que pagar mes a mes, y cada una de sus {(pro.consultas * 12).toLocaleString('es-MX')} consultas
                            del año le sale en <strong className="text-charcoal-900">{pesos(pro.porConsulta)}</strong>.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-cream-300 bg-cream-100 p-7 sm:p-9 text-sm leading-relaxed text-charcoal-800">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-accent-brown">Por qué la cuenta sale</div>
                        <ul className="mt-5 space-y-4">
                            <li><strong className="text-charcoal-900">Va un paso adelante.</strong> Muchos colegas preguntan a herramientas generales que contestan de memoria. Con Iurexia usted trabaja con la fuente a la vista, y lo prueba gratis en sus propios asuntos antes de pagar.</li>
                            <li><strong className="text-charcoal-900">El precio está publicado.</strong> Las grandes plataformas internacionales de IA jurídica cotizan por su área de ventas. Aquí ve el precio completo antes de pagar.</li>
                            <li><strong className="text-charcoal-900">Cada cita trae su fuente.</strong> Lo que Iurexia le responde se verifica en el documento oficial, con un clic.</li>
                            <li><strong className="text-charcoal-900">Casi 300 profesionales del derecho ya pagan su plan.</strong> Usted entra con 30 % menos en el primer pago.</li>
                        </ul>
                    </div>
                </div>

                {/* ── Los planes ───────────────────────────────────────── */}
                <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-serif text-3xl text-charcoal-900">Elija su plan</h2>
                    <div className="inline-flex rounded-full border border-cream-300 bg-white p-1 text-sm" role="tablist">
                        <button role="tab" aria-selected={anual} onClick={() => setAnual(true)}
                            className={`rounded-full px-4 py-2 ${anual ? 'bg-charcoal-900 text-white' : 'text-charcoal-800'}`}>
                            Anual · la mejor cuenta
                        </button>
                        <button role="tab" aria-selected={!anual} onClick={() => setAnual(false)}
                            className={`rounded-full px-4 py-2 ${!anual ? 'bg-charcoal-900 text-white' : 'text-charcoal-800'}`}>
                            Mensual
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                    {PLANES.map((p) => {
                        const c = cuenta(p);
                        const destacado = p === 'pro';
                        const normal = anual ? c.anual : c.mensual;
                        const hoy = anual ? c.anualBuenFin : c.primerMes;
                        return (
                            <div key={p} className={`flex flex-col rounded-2xl border bg-white p-7 ${destacado ? 'border-accent-gold ring-1 ring-accent-gold' : 'border-cream-300'}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-serif text-2xl text-charcoal-900">{c.nombre}</h3>
                                    {destacado && <span className="rounded-full bg-cream-200 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-accent-brown">El más elegido</span>}
                                </div>
                                <p className="mt-1 text-sm text-piedra-600">{c.consultas} consultas al mes</p>

                                <div className="mt-6 flex items-baseline gap-2">
                                    <span className="font-serif text-4xl text-charcoal-900">{pesos(hoy)}</span>
                                    <span className="text-sm text-piedra-600">MXN {anual ? 'el año' : 'el primer mes'}</span>
                                </div>
                                <p className="mt-1 text-sm text-piedra-600">
                                    En lugar de <span className="line-through">{pesos(normal)}</span>.
                                    {anual
                                        ? <> Mes a mes serían {pesos(c.anioMesAMes)}: se ahorra {pesos(c.ahorro)}.</>
                                        : <> Después, {pesos(c.mensual)} al mes.</>}
                                </p>

                                <button
                                    onClick={() => elegir(p)}
                                    disabled={cargando !== null}
                                    className={`mt-auto w-full rounded-lg px-5 py-3.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 ${destacado ? 'bg-accent-gold text-charcoal-900' : 'bg-charcoal-900 text-white'}`}
                                    style={{ marginTop: '1.75rem' }}
                                >
                                    {cargando === p ? 'Abriendo el pago seguro…'
                                        : user ? `Elegir ${c.nombre} ${anual ? 'anual' : 'mensual'} con 30 %` : `Iniciar sesión y elegir ${c.nombre}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
                {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
                <p className="mt-4 text-center text-xs text-piedra-600">
                    Pago seguro con Stripe. El 30 % aparece ya aplicado antes de pagar; sólo le pedimos los datos de su tarjeta.
                </p>

                {/* ── Sin letra chiquita ──────────────────────────────── */}
                <div className="mt-12 rounded-xl border border-cream-300 bg-cream-100 p-6 text-sm leading-relaxed text-charcoal-800">
                    <p className="mb-3 font-medium text-charcoal-900">Sin letra chiquita</p>
                    <ul className="list-disc space-y-1.5 pl-5">
                        <li>El 30 % se aplica a su primer pago: el primer mes en los planes mensuales, o el primer año en los anuales.</li>
                        <li>Después, el plan se renueva a su precio normal hasta que usted lo cancele.</li>
                        <li>Puede cancelar cuando quiera desde su perfil, sin hablar con nadie, y conserva el acceso hasta el final del periodo pagado.</li>
                        <li>Es para cuentas que no han tenido antes un plan de pago en Iurexia.</li>
                        <li>Vale hasta el {BUEN_FIN.finEnLetra} (hora de la Ciudad de México). No se acumula con otras promociones.</li>
                    </ul>
                    <p className="mt-3">
                        ¿Necesita factura? Capture sus datos fiscales en su <Link href="/perfil" className="underline">perfil</Link>. Aplican
                        los <Link href="/terminos" className="underline">Términos y Condiciones</Link> de Iurexia.
                    </p>
                </div>
            </div>
        </div>
    );
}
