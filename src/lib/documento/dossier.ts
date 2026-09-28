/* ═══ EL DOSSIER: DE LOS MENSAJES A LOS BLOQUES DE LA HOJA ════════════════
   Todas las respuestas terminadas de la conversación, en orden, cada una en
   su bloque. Vivía dentro de la página del chat; sale aquí para poder
   probarse sin montarla.

   SIN LA NOTA PARA EL ABOGADO (28-sep-2026): lo que va después del escrito
   —qué verificar, el punto débil— se enseña en la burbuja; en la hoja
   acababa impreso en el Word que se presenta. Ver `separarNota`.

   EL RETOQUE VA EN LUGAR DEL ESCRITO QUE CORRIGE (28-sep-2026): la
   respuesta marcada (`MARCA_REEMPLAZA`) es el escrito entero ya corregido y
   sustituye a la respuesta anterior, que es la que retocó. */

import { reemplazaEscrito, separarNota } from './marcado';

export interface BloqueDelDossier {
    /** m<índice del mensaje>: el mismo en la hoja, en las versiones y en el chat. */
    id: string;
    markdown: string;
    /** El bloque al que sustituye, si es un retoque. */
    reemplaza?: string;
}

interface MensajeDelChat {
    role: string;
    content: string;
}

/**
 * Los bloques de la hoja. `trabajando`: la última respuesta todavía llega y va
 * aparte, como vista previa. `memoria`: lo ya separado de cada respuesta (por
 * su texto); esto corre con cada trozo que llega y volver a leer todas las
 * respuestas terminadas en cada uno no tiene sentido. Se devuelve la memoria
 * nueva, que guarda sólo las respuestas de ahora.
 */
export function bloquesDelDossier(
    mensajes: readonly MensajeDelChat[],
    trabajando: boolean,
    memoria: ReadonlyMap<string, string> = new Map(),
): { bloques: BloqueDelDossier[]; memoria: Map<string, string> } {
    const bloques: BloqueDelDossier[] = [];
    const nueva = new Map<string, string>();
    mensajes.forEach((m, i) => {
        if (m.role !== 'assistant' || !m.content.trim()) return;
        if (trabajando && i === mensajes.length - 1) return;   // la que llega va aparte
        const escrito = memoria.get(m.content) ?? separarNota(m.content).escrito;
        nueva.set(m.content, escrito);
        if (reemplazaEscrito(m.content) && bloques.length) {
            const previa = bloques.pop()!;
            bloques.push({ id: `m${i}`, markdown: escrito, reemplaza: previa.id });
            return;
        }
        bloques.push({ id: `m${i}`, markdown: escrito });
    });
    return { bloques, memoria: nueva };
}

/** Los índices de las respuestas cuyo escrito sustituyó un retoque
 *  posterior: la respuesta anterior a cada una marcada. */
export function respuestasSustituidas(mensajes: readonly MensajeDelChat[]): Set<number> {
    const indices = new Set<number>();
    let previa = -1;
    mensajes.forEach((m, i) => {
        if (m.role !== 'assistant' || !m.content.trim()) return;
        if (previa !== -1 && reemplazaEscrito(m.content)) indices.add(previa);
        previa = i;
    });
    return indices;
}
