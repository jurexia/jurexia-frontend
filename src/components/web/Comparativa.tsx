'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import Lamina from '@/components/web/Lamina';
import { Antetitulo, Boton } from '@/components/web/sistema';

/* ═══ COMPARATIVA: UNA IA GENÉRICA FRENTE A IUREXIA (4-oct-2026) ═══
   David: «para no ser incongruentes vamos a comparar IA genérica (no ChatGPT,
   porque ahora utilizamos powered by OpenAI)… hazla mejor y más elegante, con
   efectos visuales al scroll». Ya no hay marca enfrente: una IA de uso general
   contra la misma clase de modelo con el derecho mexicano verificado detrás.

   La tabla va sobre una obra oscura y la columna de Iurexia está iluminada. Al
   bajar, las filas entran una tras otra, la palomita dorada se dibuja y un hilo
   de oro recorre la columna de Iurexia al ritmo del desplazamiento.

   Nada espera a un observador para existir: sin JavaScript, con «reducir
   movimiento», o si la tabla ya estaba a la vista al cargar, todo se ve quieto
   desde el principio. Sólo se esconde, para revelarlo, lo que al cargar quedaba
   por debajo de la pantalla (globals.css, «Revelar al bajar»). */

const FILAS: [string, string, string][] = [
    ['Jurisprudencia mexicana real', 'Puede citar tesis y registros que no existen', 'Más de 2 millones de fragmentos de leyes, jurisprudencia y sentencias, verificados'],
    ['Artículos de leyes vigentes', 'No comprueba si el artículo sigue vigente', 'El texto del artículo, tomado del código o la ley actualizados'],
    ['La ley de tu estado', 'No separa la legislación de cada estado', 'Sólo la legislación de tu estado, más la federal'],
    ['Escritos con fundamento', 'Redacta sin anclar cada cita a su fuente', 'Escritos con artículos y tesis verificados, editables y listos para Word'],
    ['Análisis de sentencias y demandas', 'Análisis general, sin el acervo mexicano', 'Auditoría con fortalezas, debilidades y mejoras'],
    ['Flujos de trabajo', 'Sin flujos para escritos mexicanos', 'Demandas y escritos completos, parte por parte'],
    ['Seguimiento de expedientes', 'No consulta los portales de los tribunales', 'Tus expedientes, revisados cada día hábil'],
    // El Básico (79) no trae flujos: por eso «desde», sin «todo incluido».
    ['Precio', 'Planes de uso general, sin acervo jurídico', 'Plan gratuito para empezar y planes desde $79 MXN al mes'],
];

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]';

function Cruz({ className = '' }: { className?: string }) {
    return (
        <svg className={`mt-[3px] h-3.5 w-3.5 shrink-0 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

/** La palomita: su trazo se dibuja cuando la fila entra (clase `trazo`). */
function Palomita() {
    return (
        <svg className="mt-[3px] h-3.5 w-3.5 shrink-0 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path className="trazo" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    );
}

function MarcaIurexia({ className }: { className: string }) {
    return (
        <span className={`font-marca font-semibold ${className}`}>
            <span className="text-cream-100">Iurex</span>
            <span className="text-accent-gold">ia</span>
        </span>
    );
}

/** Revela las filas al bajar y mueve el hilo de oro; devuelve las referencias que necesita. */
function useRevelar() {
    const raiz = useRef<HTMLDivElement>(null);
    const hilo = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = raiz.current;
        if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        // Si al cargar la tabla ya se ve (se recargó a media página), se queda quieta.
        if (el.getBoundingClientRect().top < window.innerHeight) return;

        el.classList.add('revelar-activo');
        const filas = Array.from(el.querySelectorAll<HTMLElement>('.revelar'));
        const obs = new IntersectionObserver(
            (entradas) => {
                for (const e of entradas) {
                    if (!e.isIntersecting) continue;
                    e.target.classList.add('visto');
                    obs.unobserve(e.target);
                }
            },
            { rootMargin: '0px 0px -12% 0px', threshold: 0.2 },
        );
        filas.forEach((f) => obs.observe(f));

        // El hilo: empieza cuando la tabla asoma por abajo y termina cuando su
        // última fila llega a la altura en que se revela (el 85 % de la pantalla).
        let cuadro = 0;
        const medir = () => {
            cuadro = 0;
            const r = el.getBoundingClientRect();
            const avance = (window.innerHeight * 0.85 - r.top) / (r.height * 0.95);
            if (hilo.current) hilo.current.style.transform = `scaleY(${Math.min(1, Math.max(0, avance))})`;
        };
        const alMover = () => {
            if (!cuadro) cuadro = requestAnimationFrame(medir);
        };
        medir();
        window.addEventListener('scroll', alMover, { passive: true });
        window.addEventListener('resize', alMover);
        return () => {
            obs.disconnect();
            cancelAnimationFrame(cuadro);
            window.removeEventListener('scroll', alMover);
            window.removeEventListener('resize', alMover);
        };
    }, []);

    return { raiz, hilo };
}

export default function Comparativa() {
    const { raiz, hilo } = useRevelar();

    return (
        <section className="bg-cream-300 py-16 sm:py-32">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <Antetitulo className="mb-4">Comparativa</Antetitulo>
                    <h2 className="font-serif text-[2.1rem] font-normal leading-[1.1] tracking-[-0.015em] text-tinta [text-wrap:balance] sm:text-display-m">
                        Una IA genérica frente a Iurexia
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-piedra-700 sm:text-lg">
                        Una IA de uso general sabe un poco de todo y responde de memoria: no distingue la ley de cada estado
                        ni comprueba que la tesis exista. Iurexia usa modelos de OpenAI y no los deja responder de memoria:
                        los pone a razonar sobre el derecho mexicano verificado.
                    </p>
                </div>

                <Lamina tono="tinta" arte="/web/arte/claustro.webp" velo="denso" className="mt-12 rounded-2xl shadow-[0_50px_100px_-45px_rgba(15,14,13,0.7)] sm:mt-16">
                    <div ref={raiz} className="relative px-4 py-6 sm:px-10 sm:py-12 lg:px-14">
                        {/* ── Escritorio: tres columnas, la de Iurexia iluminada de arriba abajo ── */}
                        <div className="relative hidden md:block">
                            <div aria-hidden className={`pointer-events-none absolute inset-0 ${COLUMNAS}`}>
                                <div className="relative col-start-3 rounded-xl bg-white/[0.045] shadow-[0_0_90px_-30px_rgba(201,169,98,0.35)] ring-1 ring-accent-gold/25">
                                    <span ref={hilo} className="hilo absolute -left-px bottom-3 top-3 w-px origin-top bg-gradient-to-b from-accent-gold via-accent-gold/70 to-accent-gold/0" />
                                </div>
                            </div>

                            <div className={`relative ${COLUMNAS} items-center pb-6 pt-5`}>
                                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/45">Capacidad</p>
                                <p className="flex items-center gap-2 text-[1.05rem] font-medium text-white/60">
                                    <Sparkles className="h-4 w-4 text-white/40" strokeWidth={1.5} aria-hidden />
                                    IA genérica
                                </p>
                                <p className="px-6">
                                    <MarcaIurexia className="text-[1.65rem] leading-none" />
                                </p>
                            </div>

                            <ul>
                                {FILAS.map(([capacidad, generica, iurexia], i) => (
                                    <li
                                        key={capacidad}
                                        className={`revelar relative ${COLUMNAS} items-start border-t border-white/[0.08] py-5`}
                                        style={{ ['--retraso' as string]: `${i * 70}ms` }}
                                    >
                                        <p className="pr-6 text-[15px] font-medium leading-snug text-cream-100/90">{capacidad}</p>
                                        <p className="flex gap-2.5 pr-6 text-[14.5px] leading-snug text-white/45">
                                            <Cruz className="text-white/25" />
                                            <span>{generica}</span>
                                        </p>
                                        <p className="flex gap-2.5 px-6 text-[14.5px] leading-snug text-cream-100">
                                            <Palomita />
                                            <span>{iurexia}</span>
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* ── Teléfono: cada capacidad en su fila, con las dos respuestas lado a lado ── */}
                        <div className="md:hidden">
                            <div className="grid grid-cols-2 gap-2 pb-4">
                                <p className="flex items-center gap-1.5 px-1 text-[15px] font-medium text-white/60">
                                    <Sparkles className="h-4 w-4 text-white/40" strokeWidth={1.5} aria-hidden />
                                    IA genérica
                                </p>
                                <p className="px-3">
                                    <MarcaIurexia className="text-xl leading-none" />
                                </p>
                            </div>
                            <ul>
                                {FILAS.map(([capacidad, generica, iurexia], i) => (
                                    <li
                                        key={capacidad}
                                        className="revelar border-t border-white/[0.08] py-4"
                                        style={{ ['--retraso' as string]: `${(i % 2) * 70}ms` }}
                                    >
                                        <p className="px-1 text-[14px] font-medium text-cream-100/90">{capacidad}</p>
                                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[13px] leading-snug">
                                            <p className="flex gap-1.5 px-1 py-2 text-white/45">
                                                <Cruz className="text-white/25" />
                                                <span>{generica}</span>
                                            </p>
                                            <p className="flex gap-1.5 rounded-lg bg-white/[0.05] px-3 py-2 text-cream-100 ring-1 ring-accent-gold/20">
                                                <Palomita />
                                                <span>{iurexia}</span>
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Lamina>

                <div className="mt-10 flex flex-col items-center gap-5 text-center">
                    <p className="max-w-xl text-[0.9375rem] leading-relaxed text-piedra-700">
                        En derecho, un artículo equivocado puede costar un caso. Por eso cada cita de Iurexia abre su documento oficial.
                    </p>
                    <Boton href="/registro">Probar Iurexia gratis</Boton>
                </div>
            </div>
        </section>
    );
}
