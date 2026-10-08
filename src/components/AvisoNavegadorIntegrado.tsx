'use client';

/**
 * Aviso para quien llega desde Instagram, Facebook u otra app con navegador
 * integrado: ahí Google no deja iniciar sesión (ver lib/navegador-integrado).
 * Dice qué pasa, ofrece abrir la página en el navegador y deja a mano el
 * correo con código. Fuera de esos navegadores no pinta nada.
 */

import { useEffect, useState } from 'react';
import { appDelNavegadorIntegrado, enlaceParaChrome, esAndroid } from '@/lib/navegador-integrado';

export interface NavegadorIntegrado {
    app: string;
    android: boolean;
}

/** null mientras no se sabe (servidor y primer pintado) o si el navegador es normal. */
export function useNavegadorIntegrado(): NavegadorIntegrado | null {
    const [info, setInfo] = useState<NavegadorIntegrado | null>(null);
    useEffect(() => {
        const ua = navigator.userAgent;
        const app = appDelNavegadorIntegrado(ua);
        setInfo(app ? { app, android: esAndroid(ua) } : null);
    }, []);
    return info;
}

export default function AvisoNavegadorIntegrado({ info }: { info: NavegadorIntegrado }) {
    const [copiado, setCopiado] = useState(false);
    const [href, setHref] = useState('');
    useEffect(() => { setHref(window.location.href); }, []);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiado(true);
        } catch {
            // Sin permiso para el portapapeles: se deja el enlace seleccionable.
            setCopiado(false);
        }
    };

    const paraChrome = info.android && href ? enlaceParaChrome(href) : null;

    return (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="note">
            <p className="font-medium mb-1">Estás dentro de {info.app}</p>
            <p className="mb-3">
                Google no permite iniciar sesión desde aquí. Regístrate con tu correo (te llega un código)
                o abre esta página en tu navegador.
            </p>
            <div className="flex flex-wrap gap-2">
                {paraChrome && (
                    <a
                        href={paraChrome}
                        className="inline-flex items-center rounded-lg bg-amber-900 px-3 py-2 text-white font-medium"
                    >
                        Abrir en Chrome
                    </a>
                )}
                <button
                    type="button"
                    onClick={copiar}
                    className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium text-amber-900"
                >
                    {copiado ? 'Enlace copiado: pégalo en tu navegador' : 'Copiar enlace'}
                </button>
            </div>
        </div>
    );
}
