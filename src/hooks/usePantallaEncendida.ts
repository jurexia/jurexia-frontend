'use client';

import { useEffect } from 'react';

/**
 * LA PANTALLA NO SE APAGA MIENTRAS IUREXIA ESCRIBE (30-oct-2026).
 *
 * En el teléfono, la pantalla que se apaga a media respuesta congela la
 * pestaña y le corta la conexión: un análisis tarda de uno a tres minutos y el
 * apagado automático suele llegar antes. Rubén Ávila (Android) perdió así el
 * 29-oct la vista de un análisis que el servidor sí terminó.
 *
 * Con la API de bloqueo de pantalla (Screen Wake Lock) la pantalla se queda
 * encendida mientras haya una respuesta en curso y la pestaña esté a la vista;
 * el navegador la suelta solo si el abogado cambia de app, y aquí se vuelve a
 * pedir al regresar. Al terminar, se libera. Donde no existe (Safari antiguo,
 * Firefox), no hace nada. El servidor termina lo pedido aunque la conexión se
 * corte (respuesta_guardada.py en la API): esto sólo evita el corte.
 */
export function usePantallaEncendida(activo: boolean) {
    useEffect(() => {
        if (!activo || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
        let candado: WakeLockSentinel | null = null;
        let vivo = true;
        const pedir = async () => {
            if (!vivo || candado || document.visibilityState !== 'visible') return;
            try {
                const nuevo = await navigator.wakeLock.request('screen');
                if (!vivo) { void nuevo.release().catch(() => {}); return; }
                candado = nuevo;
                nuevo.addEventListener('release', () => { if (candado === nuevo) candado = null; });
            } catch {
                /* Sin permiso, batería baja o pestaña oculta: no pasa nada. */
            }
        };
        const alVolver = () => { if (document.visibilityState === 'visible') void pedir(); };
        void pedir();
        document.addEventListener('visibilitychange', alVolver);
        return () => {
            vivo = false;
            document.removeEventListener('visibilitychange', alVolver);
            void candado?.release().catch(() => {});
            candado = null;
        };
    }, [activo]);
}
