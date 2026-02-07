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


/**
 * Sentencia Audit types
 */
export interface SentenciaHallazgo {
    tipo: string;
    severidad: string;
    descripcion: string;
    fundamento: string;
    protocolo_origen: string;
}

export interface SentenciaPerfilado {
    materia: string;
    sentido_fallo: string;
    modo_revision: string;
    acto_reclamado: string;
}

export interface SentenciaAuditResponse {
    viabilidad_sentencia: string;
    perfil_sentencia: SentenciaPerfilado;
    hallazgos_criticos: SentenciaHallazgo[];
    analisis_jurisprudencial: {
        jurisprudencia_contradictoria_encontrada: boolean;
        detalle: string;
    };
    analisis_convencional: {
        derechos_en_juego: string[];
        tratados_aplicables: string[];
        restriccion_constitucional_aplica: boolean;
        detalle: string;
    };
    analisis_metodologico: {
        interpretacion_conforme_aplicada: boolean;
        detalle: string;
    };
    sugerencia_proyectista: string;
    resumen_ejecutivo: string;
}

/**
 * Audit a sentencia (hierarchical analysis)
 */
export async function auditSentencia(
    documento: string,
    estado?: string
): Promise<SentenciaAuditResponse> {
    const response = await fetch(`${API_URL}/audit/sentencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento, estado }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sentencia audit failed: ${errorText}`);
    }
    return response.json();
}

// ══════════════════════════════════════════════════════════════
// IUREXIA CONNECT — API
// ══════════════════════════════════════════════════════════════

export interface CedulaValidationResponse {
    valid: boolean;
    cedula: string;
    nombre?: string;
    profesion?: string;
    institucion?: string;
    error?: string;
}

export interface SepomexResponse {
    cp: string;
    estado: string;
    municipio: string;
    colonia?: string;
}

export interface LawyerProfile {
    id: string;
    full_name: string;
    cedula_number: string;
    specialties: string[];
    bio: string;
    office_address: { estado?: string; municipio?: string; cp?: string };
    verification_status: string;
    is_pro_active: boolean;
    avatar_url?: string;
    score?: number;
}

export interface LawyerSearchResponse {
    lawyers: LawyerProfile[];
    total: number;
    note?: string;
}

export interface ConnectStartResponse {
    system_message: string;
    dossier: Record<string, unknown>;
    status: string;
}

export interface PrivacyCheckResponse {
    original: string;
    sanitized: string;
    has_contact_info: boolean;
    detections: Array<{ type: string; value: string }>;
}

/**
 * Validate a cédula profesional
 */
export async function validateCedula(cedula: string): Promise<CedulaValidationResponse> {
    const response = await fetch(`${API_URL}/connect/validate-cedula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula }),
    });
    if (!response.ok) throw new Error('Cedula validation failed');
    return response.json();
}

/**
 * SEPOMEX postal code lookup
 */
export async function sepomexLookup(cp: string): Promise<SepomexResponse> {
    const response = await fetch(`${API_URL}/connect/sepomex/${cp}`);
    if (!response.ok) throw new Error('CP not found');
    return response.json();
}

/**
 * Search lawyers by legal problem (semantic search)
 */
export async function searchLawyers(
    query: string,
    estado?: string,
    limit: number = 10
): Promise<LawyerSearchResponse> {
    const response = await fetch(`${API_URL}/connect/lawyers/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, estado, limit }),
    });
    if (!response.ok) throw new Error('Lawyer search failed');
    return response.json();
}

/**
 * Start a Connect chat (generates system message with dossier)
 */
export async function startConnectChat(
    lawyerId: string,
    dossierSummary: Record<string, unknown> = {}
): Promise<ConnectStartResponse> {
    const response = await fetch(`${API_URL}/connect/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyer_id: lawyerId, dossier_summary: dossierSummary }),
    });
    if (!response.ok) throw new Error('Connect start failed');
    return response.json();
}

/**
 * Privacy check on a message before sending
 */
export async function privacyCheck(content: string): Promise<PrivacyCheckResponse> {
    const response = await fetch(`${API_URL}/connect/privacy-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Privacy check failed');
    return response.json();
}

/**
 * Index a lawyer profile for semantic search
 */
export async function indexLawyerProfile(profile: {
    cedula_number: string;
    full_name: string;
    specialties: string[];
    bio: string;
    office_address: { estado?: string; municipio?: string; cp?: string };
    avatar_url?: string;
}): Promise<{ indexed: boolean; point_id: string }> {
    const response = await fetch(`${API_URL}/connect/lawyers/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
    });
    if (!response.ok) throw new Error('Lawyer indexing failed');
    return response.json();
}

/**
 * Connect module health check
 */
export async function connectHealth(): Promise<{
    module: string;
    status: string;
    lawyers_indexed: number;
    services: Record<string, string>;
}> {
    const response = await fetch(`${API_URL}/connect/health`);
    if (!response.ok) throw new Error('Connect health check failed');
    return response.json();
}
