/**
 * EL MODELO LIGERO de las funciones de despacho, por OpenRouter (la misma
 * llave que ya usa Soporte, `OPENROUTER_API_KEY`).
 *
 * Por omisión `google/gemini-2.5-flash`: buen español jurídico, rápido y
 * barato. Se cambia sin desplegar código con `IUREXIA_MODELO_DESPACHO`.
 * No razona: cambiar redacción y proponer un correo no lo necesitan, y el
 * razonamiento triplicaría el costo y la espera.
 */

const MODELO_POR_OMISION = 'google/gemini-2.5-flash';

export class ModeloNoDisponible extends Error {}

export interface Encargo {
    sistema: string;
    usuario: string;
    temperatura?: number;
    maxTokens?: number;
    /** Pide JSON (response_format json_object). El llamador lo valida. */
    json?: boolean;
    /** Para el registro de OpenRouter: «Iurexia Redacción», etc. */
    titulo?: string;
    /** Corta a los N ms (por omisión 45 s, dentro del minuto de Vercel). */
    tiempoMs?: number;
}

export async function completar(e: Encargo): Promise<string> {
    const clave = process.env.OPENROUTER_API_KEY;
    if (!clave) throw new ModeloNoDisponible('Sin OPENROUTER_API_KEY');
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), e.tiempoMs ?? 45_000);
    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: control.signal,
            headers: {
                Authorization: `Bearer ${clave}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://www.iurexia.com',
                'X-Title': e.titulo || 'Iurexia Despacho',
            },
            body: JSON.stringify({
                model: process.env.IUREXIA_MODELO_DESPACHO || MODELO_POR_OMISION,
                temperature: e.temperatura ?? 0.3,
                max_tokens: e.maxTokens ?? 2000,
                ...(e.json ? { response_format: { type: 'json_object' } } : {}),
                messages: [
                    { role: 'system', content: e.sistema },
                    { role: 'user', content: e.usuario },
                ],
            }),
        });
        if (!r.ok) throw new ModeloNoDisponible(`OpenRouter ${r.status}`);
        const d = await r.json();
        const texto = String(d?.choices?.[0]?.message?.content ?? '').trim();
        if (!texto) throw new ModeloNoDisponible('Respuesta vacía');
        return texto;
    } catch (err) {
        if (err instanceof ModeloNoDisponible) throw err;
        throw new ModeloNoDisponible((err as Error)?.name === 'AbortError' ? 'Tiempo agotado' : String(err));
    } finally {
        clearTimeout(reloj);
    }
}

/** Saca el primer objeto JSON de una respuesta (por si viene con ```json). */
export function jsonDe<T = unknown>(texto: string): T | null {
    const limpio = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(limpio) as T; } catch { /* sigue */ }
    const i = limpio.indexOf('{'), j = limpio.lastIndexOf('}');
    if (i >= 0 && j > i) {
        try { return JSON.parse(limpio.slice(i, j + 1)) as T; } catch { /* nada */ }
    }
    return null;
}
