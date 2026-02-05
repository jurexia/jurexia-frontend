/**
 * API Client for Iurexia FastAPI Backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface SearchResult {
    id: string;
    score: number;
    texto: string;
    ref: string | null;
    origen: string | null;
    jurisdiccion: string | null;
    entidad: string | null;
    silo: string;
}

export interface SearchResponse {
    query: string;
    estado_filtrado: string | null;
    resultados: SearchResult[];
    total: number;
}

export interface AuditResponse {
    puntos_controvertidos: string[];
    fortalezas: Array<{ punto: string; fundamento: string; citas: string[] }>;
    debilidades: Array<{ punto: string; problema: string; citas: string[] }>;
    sugerencias: Array<{ accion: string; justificacion: string; citas: string[] }>;
    riesgo_general: string;
    resumen_ejecutivo: string;
}

export interface HealthResponse {
    status: string;
    qdrant: string;
    silos_activos: string[];
    sparse_encoder: string;
    dense_model: string;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) throw new Error('API not available');
    return response.json();
}

/**
 * Perform hybrid search
 */
export async function search(
    query: string,
    estado?: string,
    topK: number = 10
): Promise<SearchResponse> {
    const response = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, estado, top_k: topK }),
    });
    if (!response.ok) throw new Error('Search failed');
    return response.json();
}

/**
 * Stream chat response
 */
export async function* streamChat(
    messages: Message[],
    estado?: string,
    topK: number = 4,  // Reduced to stay within 8k token limit
    accessToken?: string  // Optional Supabase access token for auth
): AsyncGenerator<string, void, unknown> {
    console.log('[API] Calling chat endpoint:', API_URL + '/chat');
    console.log('[API] Messages:', messages);

    // Build headers with optional auth
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers,
            credentials: 'include',  // Enable cookies for CORS with credentials
            body: JSON.stringify({ messages, estado, top_k: topK }),
        });

        console.log('[API] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API] Error response:', errorText);
            throw new Error(`Chat request failed: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            yield chunk;
        }
    } catch (err) {
        console.error('[API] Fetch error:', err);
        throw err;
    }
}

/**
 * Audit a legal document
 */
export async function auditDocument(
    documento: string,
    estado?: string,
    profundidad: 'rapida' | 'exhaustiva' = 'rapida'
): Promise<AuditResponse> {
    const response = await fetch(`${API_URL}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento, estado, profundidad }),
    });
    if (!response.ok) throw new Error('Audit failed');
    return response.json();
}

/**
 * Document response interface
 */
export interface DocumentResponse {
    id: string;
    texto: string;
    ref: string | null;
    origen: string | null;
    jurisdiccion: string | null;
    entidad: string | null;
    silo: string;
    found: boolean;
}

/**
 * Get full document by ID
 */
export async function getDocument(docId: string): Promise<DocumentResponse> {
    const response = await fetch(`${API_URL}/document/${docId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Document not found: ${docId}`);
    return response.json();
}

/**
 * Enhance response interface
 */
export interface EnhanceResponse {
    texto_mejorado: string;
    documentos_usados: number;
    tokens_usados: number;
}

/**
 * Enhance legal text with RAG
 */
export async function enhanceText(
    texto: string,
    tipoDocumento: string = 'demanda',
    estado?: string
): Promise<EnhanceResponse> {
    const response = await fetch(`${API_URL}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            texto,
            tipo_documento: tipoDocumento,
            estado
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Enhancement failed: ${errorText}`);
    }
    return response.json();
}

