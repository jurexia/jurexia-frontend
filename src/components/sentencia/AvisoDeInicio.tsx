'use client';

/* EL AVISO DE BIENVENIDA (24-sep-2026).
 *
 * David, sobre una usuaria que vuelve y a quien se abre el taller: «coméntale
 * que nos alegra tenerla de vuelta y esperamos ansiosos a que pruebe el
 * taller». El texto vive en el perfil (`aviso_inicio`), lo escribe el
 * administrador y se pinta aquí hasta que la persona lo cierra. Cerrado se
 * recuerda en este navegador por la HUELLA del texto: si mañana se le escribe
 * otro, se vuelve a ver.
 */

import { useEffect, useState } from 'react';

function huella(t: string): string {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return String(h >>> 0);
}

export default function AvisoDeInicio({ texto }: { texto?: string | null }) {
    const clave = texto ? `iurexia_aviso_visto:${huella(texto)}` : '';
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!texto) { setVisible(false); return; }
        try { setVisible(localStorage.getItem(clave) !== '1'); } catch { setVisible(true); }
    }, [texto, clave]);

    if (!texto || !visible) return null;

    const cerrar = () => {
        try { localStorage.setItem(clave, '1'); } catch { /* se cierra igual */ }
        setVisible(false);
    };

    return (
        <div className="relative mx-auto max-w-[1500px] px-4 pt-5 sm:px-6">
            <div role="status"
                 className="flex flex-col gap-4 rounded-2xl border border-[rgba(201,169,98,0.28)] bg-[rgba(201,169,98,0.07)] px-5 py-4 sm:flex-row sm:items-start">
                <p className="min-w-0 flex-1 whitespace-pre-line text-[14px] leading-relaxed text-white/80">
                    {texto}
                </p>
                <button type="button" onClick={cerrar}
                        className="shrink-0 self-start rounded-lg border border-[rgba(201,169,98,0.35)] px-3 py-1.5 text-[13px] text-[#e2c88f] transition-colors hover:bg-[rgba(201,169,98,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,169,98,0.5)]">
                    Entendido
                </button>
            </div>
        </div>
    );
}
