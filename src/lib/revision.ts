/* ═══ LA REVISIÓN ANTES DE PRESENTAR (28-sep-2026) ════════════════════════
   El escrito de la hoja, revisado sin modelo en `POST /redaccion/revisar`
   (revision_escrito.py del API): los requisitos de la demanda de amparo
   —artículos 108 y 175 de la Ley de Amparo—, los datos pendientes y las
   plantillas sin llenar, el cierre y las frases rotas. No calcula el plazo:
   un cómputo a medias es peor que ninguno. */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

export type NivelHallazgo = 'falta' | 'revise' | 'bien';

export interface Hallazgo {
    nivel: NivelHallazgo;
    que: string;
    fundamento: string;
    /** Un trozo del escrito donde está, para señalarlo en la hoja. */
    donde: string;
}

export interface Revision {
    tipo: string;
    tipo_nombre: string;
    hallazgos: Hallazgo[];
    faltan: number;
    revisar: number;
}

/** El tope del servidor: lo de más, no se revisa (se dice). */
export const TOPE_REVISION = 300_000;

const NIVELES: ReadonlySet<string> = new Set(['falta', 'revise', 'bien']);

/** Lo que llegó, en la forma que el panel pinta: un hallazgo sin nivel
 *  conocido o sin texto no se pinta, y las cuentas son las de lo pintado. */
export function normalizarRevision(j: unknown): Revision | null {
    if (!j || typeof j !== 'object' || !Array.isArray((j as Revision).hallazgos)) return null;
    const o = j as Record<string, unknown>;
    const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const hallazgos = (o.hallazgos as unknown[]).flatMap((h): Hallazgo[] => {
        if (!h || typeof h !== 'object') return [];
        const x = h as Record<string, unknown>;
        const nivel = texto(x.nivel), que = texto(x.que);
        if (!NIVELES.has(nivel) || !que) return [];
        return [{ nivel: nivel as NivelHallazgo, que, fundamento: texto(x.fundamento), donde: texto(x.donde) }];
    });
    const cuenta = (n: NivelHallazgo) => hallazgos.filter((h) => h.nivel === n).length;
    return {
        tipo: texto(o.tipo) || 'otro',
        tipo_nombre: texto(o.tipo_nombre) || 'escrito',
        hallazgos,
        faltan: cuenta('falta'),
        revisar: cuenta('revise'),
    };
}

export async function revisarEscrito(texto: string, signal?: AbortSignal): Promise<Revision | null> {
    const t = (texto || '').slice(0, TOPE_REVISION);
    if (!t.trim()) return null;
    try {
        const r = await fetch(`${API_URL}/redaccion/revisar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: t }),
            signal,
        });
        if (!r.ok) return null;
        return normalizarRevision(await r.json());
    } catch {
        return null;
    }
}

/** Trozos cada vez más cortos de `donde`, para encontrarlo en la hoja aunque
 *  el contexto cruce dos párrafos: el entero, su centro de 40 y de 20. */
export function trozosParaSenalar(donde: string): string[] {
    const t = (donde || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    const centro = (n: number) => {
        if (t.length <= n) return t;
        const a = Math.floor((t.length - n) / 2);
        return t.slice(a, a + n).trim();
    };
    return Array.from(new Set([t, centro(40), centro(20)])).filter((x) => x.length >= 4);
}
