'use client';

import { useEffect, useState } from 'react';
import { X, Smartphone, WifiOff, Mic, Gift, ArrowRight } from 'lucide-react';

/**
 * La invitación a la beta de Android para el grupo fundador.
 *
 * Sólo la ven los usuarios marcados con `beta_android_invitado` en
 * `user_profiles`: son los veinte que más usan Iurexia y que van a probar la
 * app antes de que exista en la tienda. El tono es deliberadamente personal
 * —no es una campaña, es una invitación a un grupo pequeño—, y por eso dice de
 * frente qué van a recibir a cambio.
 *
 * Se cierra para siempre en cuanto la descartan o pulsan el botón: guardar eso
 * en `localStorage` basta, porque el coste de que reaparezca una vez en otro
 * navegador es mucho menor que el de arrastrar una columna más en la base.
 */

export const ENLACE_BETA = 'https://play.google.com/apps/internaltest/4701564364544520174';
const CLAVE_VISTA = 'iurexia:invitacion-beta-android:cerrada';

/**
 * El botón que queda después de cerrar el aviso.
 *
 * Sin él, quien descarta la ventana pierde el enlace para siempre y tiene que
 * volver a buscar el correo. Va abajo a la izquierda porque el widget de
 * comentarios ya ocupa la derecha.
 */
export function BotonBetaAndroid({ invitado }: { invitado: boolean }) {
    if (!invitado) return null;
    return (
        <a
            href={ENLACE_BETA}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-5 left-5 z-[90] hidden sm:flex items-center gap-2 rounded-full border border-[#c9a962]/40 bg-[#15151a]/95 px-4 py-2.5 text-xs font-semibold text-[#c9a962] shadow-lg backdrop-blur transition-colors hover:bg-[#1c1c22] hover:border-[#c9a962]/70"
            title="Instala Iurexia en tu Android — grupo fundador"
        >
            <Smartphone className="w-3.5 h-3.5" />
            Disponible para Android
        </a>
    );
}

export default function InvitacionBetaAndroidModal({ invitado }: { invitado: boolean }) {
    const [abierta, setAbierta] = useState(false);
    const [montada, setMontada] = useState(false);

    useEffect(() => {
        if (!invitado) return;
        if (typeof window === 'undefined') return;
        if (window.localStorage.getItem(CLAVE_VISTA)) return;
        // Un respiro antes de aparecer: si salta junto con la pantalla, se
        // percibe como un anuncio y se cierra por reflejo.
        const t = setTimeout(() => {
            setAbierta(true);
            requestAnimationFrame(() => setMontada(true));
        }, 900);
        return () => clearTimeout(t);
    }, [invitado]);

    const cerrar = () => {
        window.localStorage.setItem(CLAVE_VISTA, '1');
        setMontada(false);
        setTimeout(() => setAbierta(false), 300);
    };

    if (!abierta) return null;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
            className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-opacity duration-500 ${montada ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(8px)' }}
        >
            <div className={`relative w-full max-w-lg bg-gradient-to-b from-[#0f0f12] via-[#15151a] to-[#0f0f12] rounded-2xl border border-[#c9a962]/30 shadow-[0_0_40px_rgba(201,169,98,0.15)] overflow-hidden transform transition-all duration-500 ${montada ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a962] to-transparent" />

                <button
                    onClick={cerrar}
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="px-8 pt-9 pb-8">
                    <div className="flex justify-center mb-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#c9a962]/25 blur-2xl rounded-full" />
                            <div className="relative w-14 h-14 rounded-full bg-[#c9a962]/10 border border-[#c9a962]/40 flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-[#c9a962]" />
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-[11px] tracking-[0.2em] uppercase text-[#c9a962]/80 font-semibold">
                        Invitación personal
                    </p>
                    <h2 className="mt-2 text-center text-2xl font-serif font-semibold text-white leading-snug">
                        Eres de los primeros veinte
                    </h2>

                    <p className="mt-4 text-center text-sm leading-relaxed text-white/65">
                        Entre más de mil ochocientos abogados registrados, estás entre los
                        que más usan Iurexia. Por eso queremos que pruebes la aplicación
                        para Android <span className="text-white/90">antes de que exista en la tienda</span>.
                    </p>

                    <div className="mt-6 space-y-3">
                        <div className="flex items-start gap-3">
                            <WifiOff className="w-4 h-4 mt-0.5 text-[#c9a962] shrink-0" />
                            <p className="text-sm text-white/70 leading-relaxed">
                                <span className="text-white/90">El Semanario Judicial completo, sin internet.</span>{' '}
                                Más de 70,000 tesis en tu teléfono: busca en el sótano del
                                juzgado o en un traslado sin señal.
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Mic className="w-4 h-4 mt-0.5 text-[#c9a962] shrink-0" />
                            <p className="text-sm text-white/70 leading-relaxed">
                                <span className="text-white/90">Pregunta hablando.</span>{' '}
                                El Jurisconsulto te responde leyendo el rubro del criterio,
                                listo para citarlo en la audiencia.
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Gift className="w-4 h-4 mt-0.5 text-[#c9a962] shrink-0" />
                            <p className="text-sm text-white/70 leading-relaxed">
                                <span className="text-white/90">Tu opinión no sale gratis para nosotros.</span>{' '}
                                Lo que reportes en estas semanas decide cómo sale la app al
                                mercado, y quienes participen tendrán beneficios adicionales
                                en su cuenta.
                            </p>
                        </div>
                    </div>

                    <a
                        href={ENLACE_BETA}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={cerrar}
                        className="mt-7 w-full flex items-center justify-center gap-2 rounded-xl bg-[#c9a962] px-6 py-3.5 text-[#0f0f12] font-semibold text-sm hover:bg-[#d8bb78] transition-colors"
                    >
                        Descargar en mi Android
                        <ArrowRight className="w-4 h-4" />
                    </a>

                    <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
                        Ábrelo desde tu teléfono Android y con la cuenta de Google de este
                        correo. Los primeros días la tienda la mostrará como
                        «com.iurexia.app» mientras Google revisa la ficha.
                    </p>

                    <button
                        onClick={cerrar}
                        className="mt-4 w-full text-center text-xs text-white/35 hover:text-white/60 transition-colors"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
        </div>
    );
}
