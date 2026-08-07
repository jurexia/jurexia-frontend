/**
 * API Client for Iurexia FastAPI Backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isPro?: boolean;  // True when the assistant message was generated in Redacción Pro mode
    isPlatinum?: boolean;  // Redacción Platinum: el escalón superior (también trae isPro)
    isProfesional?: boolean;  // Redacción Profesional: el escalón base, incluido en todos los planes
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
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Stream chat response with internal implementation (no retry logic)
 */
/* La señal del globo se lee de localStorage EN EL MOMENTO del envío y viaja
   como campo del request. Antes viajaba como texto «[FUENTES_WEB] » antepuesto
   por ChatInput, y cada camino que armaba el mensaje distinto (documentos,
   sugerencias) la perdía en silencio. */
export function fuentesWebActivas(): boolean {
    try { return localStorage.getItem('iurexia-fuentes-web') === '1'; } catch { return false; }
}

async function* streamChatInternal(
    messages: Message[],
    estado?: string,
    topK: number = 30,
    accessToken?: string,
    enableReasoning = false,
    userId?: string,
    fuero?: string,
    genioIds?: string[],
    materia?: string,
    signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
    console.log('[API] Calling chat endpoint:', API_URL + '/chat');
    console.log('[API] Messages:', messages);
    console.log('[API] Fuero:', fuero);

    // Build headers with optional auth
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // Opt-in al razonamiento en vivo: el backend transmite el análisis
        // conforme ocurre (<!--thinking-->…<!--/thinking-->) en lugar de
        // retenerlo hasta el primer token de respuesta. Sólo lo pide la web:
        // los builds móviles en circulación traen el parser viejo y a ellos
        // el backend les sigue mandando el bloque clásico.
        'X-Razonamiento-Vivo': '1',
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
            messages,
            estado,
            top_k: topK,
            enable_reasoning: enableReasoning,
            genio_ids: genioIds || [],
            user_id: userId,
            fuentes_web: fuentesWebActivas(),
            ...(fuero ? { fuero } : {}),
            ...(materia ? { materia } : {}),
        }),
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
}

/**
 * Stream chat response with automatic retry on cold start
 * Implements exponential backoff: 2s, 4s, 8s
 */
export async function* streamChat(
    messages: Message[],
    estado?: string,
    topK: number = 30,
    accessToken?: string,
    enableReasoning = false,
    userId?: string,
    fuero?: string,
    genioIds?: string[],
    materia?: string,
    signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            // Attempt to stream chat
            yield* streamChatInternal(messages, estado, topK, accessToken, enableReasoning, userId, fuero, genioIds, materia, signal);
            return; // Success - exit
        } catch (err) {
            // User-initiated stop — exit silently without retry
            if ((err as Error)?.name === 'AbortError') throw err;

            attempt++;
            console.error(`[API] Attempt ${attempt}/${maxRetries} failed:`, err);

            // Classify the error type
            const errMsg = err instanceof Error ? err.message : String(err);
            const status = (err as any)?.status ?? (err as any)?.response?.status ?? 0;

            // Network block: persistent fetch failures across all attempts (firewall/proxy)
            const isNetworkBlock = (
                (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ERR_CONNECTION_REFUSED') || errMsg.includes('ECONNREFUSED')) &&
                attempt >= maxRetries
            );

            // Cold start: connection refused, DNS failure, 503 Service Unavailable
            const isColdStart = (
                status === 503 ||
                errMsg.includes('Failed to fetch') ||
                errMsg.includes('NetworkError') ||
                errMsg.includes('ECONNREFUSED') ||
                errMsg.includes('ERR_CONNECTION_REFUSED')
            );
            // Busy/overloaded: 504 Gateway Timeout, 502 Bad Gateway, AbortError
            const isBusy = (
                status === 504 ||
                status === 502 ||
                errMsg.includes('AbortError') ||
                errMsg.includes('timeout') ||
                errMsg.includes('Timeout')
            );

            const retryType = isColdStart ? 'cold' : isBusy ? 'busy' : 'busy';

            // If it's a client error (4xx), don't retry
            if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
                console.error('[API] Client error, not retrying:', status);
                throw err;
            }

            // If we've exhausted retries, throw with a user-friendly network message
            if (attempt >= maxRetries) {
                console.error('[API] All retry attempts exhausted');
                if (isNetworkBlock) {
                    throw new Error(
                        'No se pudo conectar con el servidor de Iurexia. ' +
                        'Tu red puede estar bloqueando la conexión (firewall o proxy corporativo). ' +
                        'Intenta con otra red (datos móviles o Wi-Fi personal).'
                    );
                }
                throw err;
            }

            // Exponential backoff: 2s, 4s, 8s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[API] Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}), type: ${retryType}...`);

            // Yield a special marker for UI to show retry status with error type
            yield `<!--RETRY:${attempt}:${delay}:${retryType}-->`;

            // Wait before retrying
            await sleep(delay);
        }
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
    // Additional fields for jurisprudencia (esp. TCC)
    tipo_criterio?: string;
    materia?: string;
    instancia?: string;
    tesis_num?: string;
    registro?: string;
    url_pdf?: string;
    chunk_index?: number;      // 0 = article start, >0 = continuation
    jerarquia_txt?: string;    // e.g. "Título Quinto > Capítulo II"
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
 * Full document response (reconstructed from chunks)
 */
export interface FullDocumentResponse {
    origen: string;
    titulo: string;
    tipo: string | null;
    texto_completo: string;
    total_chunks: number;
    highlight_chunk_index: number | null;
    source_doc_url: string | null;
    external_url: string | null;
    metadata: Record<string, string>;
}

/**
 * Get full document reconstructed from all chunks with the same origen
 */
export async function getFullDocument(
    origen: string,
    highlightChunkId?: string
): Promise<FullDocumentResponse> {
    const params = new URLSearchParams({ origen });
    if (highlightChunkId) params.set('highlight_chunk_id', highlightChunkId);
    const response = await fetch(`${API_URL}/document-full?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Full document not found: ${origen}`);
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
    phone?: string;
    phone_visible?: boolean;
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
 * Validate a cédula profesional format (7-8 digits).
 * Returns validation result with pending verification status.
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


// ══════════════════════════════════════════════════════════════
// CONNECT REQUESTS — API
// ══════════════════════════════════════════════════════════════

export interface ConnectRequest {
    id: string;
    lawyer_id: string;
    client_id: string | null;
    client_name: string;
    client_email: string;
    client_phone: string;
    message: string;
    search_query: string | null;
    status: 'pending' | 'read' | 'accepted' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface SendConnectRequestData {
    lawyer_id: string;
    client_id?: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    message: string;
    search_query?: string;
}

/**
 * Send a connect request to a lawyer
 */
export async function sendConnectRequest(data: SendConnectRequestData): Promise<{
    success: boolean;
    request_id: string;
    message: string;
}> {
    const response = await fetch('/api/connect/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al enviar solicitud');
    }
    return response.json();
}

/**
 * Get connect requests for the authenticated lawyer
 */
export async function getConnectRequests(accessToken: string): Promise<{
    requests: ConnectRequest[];
    total: number;
}> {
    const response = await fetch('/api/connect/requests', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al obtener solicitudes');
    }
    return response.json();
}

/**
 * Update the status of a connect request (lawyer only)
 */
export async function updateConnectRequestStatus(
    requestId: string,
    status: 'pending' | 'read' | 'accepted' | 'rejected',
    accessToken: string
): Promise<{ success: boolean; request: ConnectRequest }> {
    const response = await fetch(`/api/connect/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar solicitud');
    }
    return response.json();
}
