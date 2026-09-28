'use client';

/* La etiqueta «Escrito / Consulta» del compositor: qué leyó el servidor en
   lo que el abogado lleva escrito y qué eligió él. Ver `@/lib/intencion`. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { anteriorParaLeer, leerIntencion, type Intencion, type Lectura } from '@/lib/intencion';

/* Lo bastante para no preguntar a media palabra y lo bastante poco para que
   la etiqueta esté puesta cuando el abogado levanta la vista. */
const PAUSA_MS = 350;
const TOPE_MEMORIA = 200;

export interface EstadoIntencion {
    /** Lo que se enseña: la elegida o la última lectura, aunque sea de un
     *  texto anterior mientras llega la del actual. `null`: no se enseña. */
    mostrada: Intencion | null;
    /** La que viaja al enviar: la elegida o la lectura de ESTE texto. */
    efectiva: Intencion | null;
    /** El abogado la cambió con un clic. */
    elegida: boolean;
    /** Lo enseñado es de un texto anterior: la lectura de éste viene en camino. */
    pendiente: boolean;
    alternar: () => void;
}

export function useIntencion(
    mensaje: string,
    respuestaAnterior: string | null | undefined,
    activa: boolean,
): EstadoIntencion {
    const texto = activa ? (mensaje || '').trim() : '';
    // Sólo se limpia la respuesta anterior cuando hay algo que leer: mientras
    // llega una respuesta, cambia en cada trozo y el cuadro está vacío.
    const hayTexto = texto.length > 0;
    const anterior = useMemo(
        () => (hayTexto ? anteriorParaLeer(respuestaAnterior) : ''),
        [hayTexto, respuestaAnterior],
    );
    const [lectura, setLectura] = useState<(Lectura & { anterior: string }) | null>(null);
    const [elegida, setElegida] = useState<Intencion | null>(null);
    // Lo ya leído con esta respuesta anterior: borrar y volver a escribir no
    // pregunta dos veces.
    const memoria = useRef(new Map<string, Lectura>());

    useEffect(() => { memoria.current.clear(); }, [anterior]);

    // Sin texto no hay etiqueta, ni elección: el siguiente mensaje empieza
    // limpio (enviar vacía el cuadro).
    useEffect(() => {
        if (!texto) { setLectura(null); setElegida(null); }
    }, [texto]);

    useEffect(() => {
        if (!texto) return;
        const sabida = memoria.current.get(texto);
        if (sabida) { setLectura({ ...sabida, anterior }); return; }
        const control = new AbortController();
        const reloj = window.setTimeout(async () => {
            const leida = await leerIntencion(texto, anterior, control.signal);
            if (control.signal.aborted || !leida) return;
            if (memoria.current.size >= TOPE_MEMORIA) {
                const vieja = memoria.current.keys().next().value;
                if (vieja !== undefined) memoria.current.delete(vieja);
            }
            memoria.current.set(texto, leida);
            setLectura({ ...leida, anterior });
        }, PAUSA_MS);
        return () => { window.clearTimeout(reloj); control.abort(); };
    }, [texto, anterior]);

    const fresca = !!lectura && lectura.texto === texto && lectura.anterior === anterior;
    const mostrada = texto ? (elegida ?? lectura?.intencion ?? null) : null;
    const efectiva = texto ? (elegida ?? (fresca ? lectura!.intencion : null)) : null;

    const alternar = useCallback(() => {
        if (!mostrada) return;
        const nueva: Intencion = mostrada === 'redactar' ? 'consultar' : 'redactar';
        // Volver a lo que leyó el servidor es volver a lo automático: si el
        // abogado sigue escribiendo, la etiqueta vuelve a seguir al texto.
        setElegida(fresca && lectura!.intencion === nueva ? null : nueva);
    }, [mostrada, fresca, lectura]);

    return {
        mostrada,
        efectiva,
        elegida: !!texto && elegida !== null,
        pendiente: !!texto && elegida === null && !fresca,
        alternar,
    };
}
