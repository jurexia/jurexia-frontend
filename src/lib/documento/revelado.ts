'use client';
import { useEffect, useRef, type RefObject } from 'react';

/**
 * LA RESPUESTA APARECE POR PÁRRAFOS, NO LETRA A LETRA (18-sep-2026).
 *
 * David: «me gustaría que el efecto de generación de texto no fuera tiping,
 * sino que aparezca con efecto visual de generación párrafo por párrafo
 * (efecto suave al inverso de desvanecimiento)».
 *
 * Son dos piezas, y las dos hacen falta:
 *
 *   · `recortarABloque` esconde el párrafo a medio escribir. El texto se corta
 *     en el último salto de línea, que en la salida del motor es el final de
 *     un párrafo, de un título o de un punto de lista. Lo que aún se está
 *     escribiendo no se enseña: por eso aparece entero y de golpe.
 *
 *   · `useRevelado` escribe en el nodo AÑADIENDO sólo lo nuevo. Reescribir el
 *     HTML entero en cada trozo —que es lo que hace `dangerouslySetInnerHTML`—
 *     convierte todos los párrafos en nodos nuevos: la animación se reinicia
 *     en todos a la vez y lo ya leído parpadea. Aquí los párrafos anteriores
 *     son los MISMOS nodos y no se tocan; sólo el recién llegado se desvanece
 *     hacia dentro.
 *
 * La animación vive en `.bloque-revelado` (globals.css) y se anula sola con
 * `prefers-reduced-motion`.
 */

/** Qué se compara para saber si un nodo ya estaba escrito. */
const clave = (n: Node) =>
    n.nodeType === 1 ? (n as HTMLElement).outerHTML
        : n.nodeType === 8 ? `<!--${n.nodeValue}-->`
            : `#${n.nodeValue}`;

/** Cuánto puede crecer un párrafo sin punto y aparte antes de enseñarlo a
 *  medias. Un párrafo doctrinal denso ronda los 800 caracteres: sin este
 *  tope, la hoja se quedaría en blanco veinte segundos. */
const COLA_MAXIMA = 520;

/**
 * Devuelve la parte del texto que ya se puede enseñar: todo hasta el último
 * final de línea. Si lo que queda pendiente es muy largo, llega hasta el
 * último punto y seguido, para que un párrafo largo no detenga la hoja.
 */
export function recortarABloque(texto: string, colaMaxima = COLA_MAXIMA): string {
    if (!texto) return '';
    const corte = texto.lastIndexOf('\n');
    let visible = corte > 0 ? texto.slice(0, corte) : '';
    const cola = texto.slice(corte + 1);

    if (cola.length > colaMaxima) {
        let fin = 0;
        const puntos = /[.;:!?]["»”)]*\s/g;
        let m: RegExpExecArray | null;
        while ((m = puntos.exec(cola))) fin = m.index + m[0].length;
        if (fin > 0) visible = (visible ? visible + '\n' : '') + cola.slice(0, fin).trimEnd();
    }

    /* NADA A MEDIO CERRAR. Un bloque de código sin su cierre, un comentario
       `<!-- CITATION_META:` partido o un `[Doc ID: …` sin corchete final se
       verían como texto crudo durante un instante. Se dejan para el siguiente
       trozo, que es cuestión de milisegundos. */
    if (((visible.match(/```/g) || []).length % 2) === 1) visible = visible.slice(0, visible.lastIndexOf('```'));
    const comentario = visible.lastIndexOf('<!--');
    if (comentario !== -1 && visible.indexOf('-->', comentario) === -1) visible = visible.slice(0, comentario);
    const corchete = visible.lastIndexOf('[');
    if (corchete !== -1 && visible.indexOf(']', corchete) === -1) visible = visible.slice(0, corchete);

    return visible.trimEnd();
}

/**
 * Escribe `html` dentro del nodo de `ref` añadiendo sólo los bloques nuevos.
 * Con `animar` en falso (mensaje ya terminado, historial) se escribe de una
 * vez y sin animación: al abrir una conversación vieja nada debe «aparecer».
 */
export function useRevelado(ref: RefObject<HTMLElement | null>, html: string, animar: boolean) {
    const previos = useRef<string[]>([]);
    const nodoEscrito = useRef<HTMLElement | null>(null);
    const htmlEscrito = useRef<string | null>(null);

    /* Sin lista de dependencias a propósito: si React sustituyera el nodo, el
       efecto tiene que volver a escribirlo aunque el HTML sea el mismo. La
       comparación de las dos líneas siguientes lo hace barato. */
    useEffect(() => {
        const raiz = ref.current;
        if (!raiz) return;
        const mismoNodo = nodoEscrito.current === raiz;
        if (mismoNodo && htmlEscrito.current === html) return;
        if (!mismoNodo) { previos.current = []; nodoEscrito.current = raiz; raiz.innerHTML = ''; }
        htmlEscrito.current = html;

        if (!animar) {
            raiz.innerHTML = html;
            previos.current = Array.from(raiz.childNodes).map(clave);
            return;
        }

        const molde = document.createElement('div');
        molde.innerHTML = html;
        /* Se recorren TODOS los nodos, no sólo los elementos: los comentarios
           `<!-- CITATION_META… -->` viajan en este HTML y de ellos salen las
           fichas al exportar. Perderlos aquí sería perderlas allí. */
        const hijos = Array.from(molde.childNodes);
        const nuevos = hijos.map(clave);
        const viejos = previos.current;

        let i = 0;
        while (i < viejos.length && i < nuevos.length && viejos[i] === nuevos[i]) i++;

        const puestos = Array.from(raiz.childNodes);
        for (let k = raiz.childNodes.length - 1; k >= i; k--) raiz.removeChild(raiz.childNodes[k]);
        for (let k = i; k < hijos.length; k++) {
            const nodo = hijos[k];
            const previo = puestos[k];
            /* El bloque que sólo CRECIÓ —un párrafo largo que avanza por
               oraciones— se sustituye en silencio: animarlo otra vez sería
               justo el parpadeo que se quiere evitar. */
            const crecio = k === i && !!previo && previo.nodeName === nodo.nodeName
                && (previo.textContent || '').length > 0
                && (nodo.textContent || '').startsWith(previo.textContent || '');
            /* UNA LISTA QUE CRECE conserva su nodo y recibe sólo los puntos
               nuevos, cada uno con su desvanecido. Sustituirla entera los haría
               aparecer todos de golpe y sin animación. */
            if (crecio && (nodo.nodeName === 'UL' || nodo.nodeName === 'OL')) {
                const puntosViejos = Array.from(previo.childNodes);
                const puntosNuevos = Array.from(nodo.childNodes);
                let j = 0;
                while (j < puntosViejos.length && j < puntosNuevos.length && clave(puntosViejos[j]) === clave(puntosNuevos[j])) j++;
                for (let q = previo.childNodes.length - 1; q >= j; q--) previo.removeChild(previo.childNodes[q]);
                for (let q = j; q < puntosNuevos.length; q++) {
                    const punto = puntosNuevos[q];
                    if (punto.nodeType === 1) (punto as HTMLElement).classList.add('bloque-revelado');
                    previo.appendChild(punto);
                }
                raiz.appendChild(previo);
                continue;
            }
            if (!crecio && nodo.nodeType === 1) (nodo as HTMLElement).classList.add('bloque-revelado');
            raiz.appendChild(nodo);
        }
        previos.current = nuevos;
    });
}
