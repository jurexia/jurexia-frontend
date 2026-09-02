'use client';

/**
 * El aviso de cookies, con el detalle desplegable.
 *
 * POR QUÉ SE GUARDA EL RECHAZO Y NO SÓLO LA ACEPTACIÓN
 * ----------------------------------------------------
 * Un banner que reaparece hasta que le dices que sí no es un consentimiento,
 * es un desgaste. Aquí se guarda la decisión sea cual sea —incluida la de
 * rechazarlo todo— y no se vuelve a preguntar. La única forma de que
 * reaparezca es que el propio usuario abra sus preferencias desde el pie.
 *
 * NADA SE ACTIVA MIENTRAS NO HAYA RESPUESTA. Antes de que el usuario decida,
 * el estado es «sólo lo estrictamente necesario»: quien lea el consentimiento
 * para encender analítica o marketing recibe `false` hasta que haya un sí
 * explícito. Es la diferencia entre pedir permiso y avisar de lo que ya se
 * hizo, y con la LFPDPPP encima conviene estar del lado correcto.
 *
 * Cómo lo lee el resto de la aplicación:
 *
 *     import { consentimiento } from '@/components/AvisoCookies';
 *     if (consentimiento().analiticas) { … }
 *
 * y para reaccionar a un cambio sin recargar, el evento `iurexia:cookies`.
 */

import { useEffect, useState } from 'react';
import { Cookie, X, ChevronDown } from 'lucide-react';

const CLAVE = 'iurexia_cookies_v1';

export interface Consentimiento {
    necesarias: true;          // no se puede apagar: sin ellas no hay sesión
    funcionales: boolean;
    analiticas: boolean;
    marketing: boolean;
    fecha: string;
}

const NEGADO: Consentimiento = {
    necesarias: true, funcionales: false, analiticas: false,
    marketing: false, fecha: '',
};

/** Lo que el usuario decidió, o el mínimo si aún no ha decidido. */
export function consentimiento(): Consentimiento {
    if (typeof window === 'undefined') return NEGADO;
    try {
        const guardado = window.localStorage.getItem(CLAVE);
        return guardado ? { ...NEGADO, ...JSON.parse(guardado) } : NEGADO;
    } catch {
        // Navegación privada, almacenamiento bloqueado: se asume el mínimo.
        return NEGADO;
    }
}

const CATEGORIAS = [
    {
        id: 'necesarias' as const,
        titulo: 'Estrictamente necesarias',
        nota: '(siempre activas)',
        texto: 'Imprescindibles para que el sitio funcione y sea seguro.',
        fija: true,
    },
    {
        id: 'funcionales' as const,
        titulo: 'Funcionales',
        texto: 'Recuerdan tus preferencias y configuración.',
        fija: false,
    },
    {
        id: 'analiticas' as const,
        titulo: 'Analíticas',
        texto: 'Nos ayudan a entender el uso del sitio para mejorarlo.',
        fija: false,
    },
    {
        id: 'marketing' as const,
        titulo: 'Marketing',
        texto: 'Miden campañas y permiten comunicación personalizada.',
        fija: false,
    },
];

export function AvisoCookies() {
    const [visible, setVisible] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const [elegido, setElegido] = useState({
        funcionales: false, analiticas: false, marketing: false,
    });

    useEffect(() => {
        // Sólo se pregunta a quien no ha contestado nunca.
        try {
            if (!window.localStorage.getItem(CLAVE)) setVisible(true);
        } catch {
            setVisible(true);
        }
        const abrir = () => { setVisible(true); setAbierto(true); };
        window.addEventListener('iurexia:abrir-cookies', abrir);
        return () => window.removeEventListener('iurexia:abrir-cookies', abrir);
    }, []);

    const guardar = (valores: Omit<Consentimiento, 'necesarias' | 'fecha'>) => {
        const decision: Consentimiento = {
            necesarias: true, ...valores, fecha: new Date().toISOString(),
        };
        try {
            window.localStorage.setItem(CLAVE, JSON.stringify(decision));
        } catch {
            // Si no se puede guardar, al menos no se insiste en esta sesión.
        }
        window.dispatchEvent(new CustomEvent('iurexia:cookies', { detail: decision }));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label="Preferencias de cookies"
            className="fixed bottom-4 left-4 right-4 z-[60] mx-auto w-auto max-w-md rounded-2xl border border-black/5 bg-white p-5 shadow-2xl sm:left-6 sm:right-auto"
        >
            <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <Cookie className="h-5 w-5 text-emerald-700" />
                </div>
                <h2 className="flex-1 pt-2 font-serif text-lg font-medium text-charcoal-900">
                    Este sitio usa cookies
                </h2>
                <button
                    onClick={() => guardar({ funcionales: false, analiticas: false, marketing: false })}
                    aria-label="Cerrar y aceptar sólo las necesarias"
                    className="rounded p-1 text-charcoal-400 transition-colors hover:text-charcoal-700"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-charcoal-700">
                Usamos cookies para operar el sitio y, con tu permiso, para medir su uso.
                Consulta el{' '}
                <a href="/privacidad" className="underline hover:text-charcoal-900">Aviso de Privacidad</a>
                {' '}y los{' '}
                <a href="/terminos" className="underline hover:text-charcoal-900">Términos y Condiciones</a>.
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setAbierto((v) => !v)}
                    aria-expanded={abierto}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cream-400 bg-cream-100 px-4 py-2.5 text-sm font-medium text-charcoal-800 transition-colors hover:bg-cream-200"
                >
                    Personalizar
                    <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                </button>
                <button
                    onClick={() => guardar({ funcionales: true, analiticas: true, marketing: true })}
                    className="rounded-xl bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800"
                >
                    Aceptar todas
                </button>
            </div>

            {abierto && (
                <>
                    <div className="mt-4 flex flex-col gap-2">
                        {CATEGORIAS.map((c) => {
                            const activa = c.fija || elegido[c.id as 'funcionales' | 'analiticas' | 'marketing'];
                            return (
                                <label
                                    key={c.id}
                                    className={`flex gap-3 rounded-xl border border-cream-400 p-3 ${
                                        c.fija ? 'bg-cream-100' : 'cursor-pointer hover:bg-cream-100'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={activa}
                                        disabled={c.fija}
                                        onChange={(e) =>
                                            setElegido((prev) => ({ ...prev, [c.id]: e.target.checked }))
                                        }
                                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-charcoal-900"
                                    />
                                    <span className="flex-1">
                                        <span className="block text-sm font-semibold text-charcoal-900">
                                            {c.titulo}
                                            {c.nota && (
                                                <span className="ml-1.5 font-normal text-charcoal-500">{c.nota}</span>
                                            )}
                                        </span>
                                        <span className="block text-sm leading-snug text-charcoal-500">{c.texto}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={() => guardar({ funcionales: false, analiticas: false, marketing: false })}
                            className="rounded-xl border border-cream-400 bg-white px-4 py-2.5 text-sm font-medium text-charcoal-800 transition-colors hover:bg-cream-100"
                        >
                            Rechazar todas
                        </button>
                        <button
                            onClick={() => guardar(elegido)}
                            className="rounded-xl bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800"
                        >
                            Guardar preferencias
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
