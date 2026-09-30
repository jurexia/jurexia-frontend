/**
 * POR QUÉ SE REINTENTA UNA CONSULTA DEL CHAT, DICHO CON VERDAD (30-sep-2026)
 *
 * David vio «El servidor está atendiendo varias solicitudes» a las 17:30 del
 * 29-sep y pensó que el servidor estaba saturado. Los registros de Render de
 * esa semana dicen otra cosa: ni un solo error del chat, la CPU a un 18% como
 * máximo y su consulta de esa hora respondida a la primera en 31 s. El aviso
 * salía ante CUALQUIER falla —el «Load failed» del iPhone al cambiar de red,
 * la página en segundo plano—, y culpaba al servidor de lo que era la
 * conexión. Además el error de un status HTTP se lanzaba sin su status, así
 * que un 429 o un 503 tampoco se distinguían.
 *
 * Aquí se decide qué pasó y qué se le dice al abogado. El reintento lleva ese
 * dato al servidor (`reintento` en /chat), que lo apunta en los registros:
 * así se puede contar cuántas veces pasa, cosa que hasta hoy era invisible.
 */

export type TipoFallo = 'red' | 'ocupado' | 'error';

export interface FalloChat {
    tipo: TipoFallo;
    /** El status HTTP, o 0 si la petición no llegó a tener respuesta. */
    status: number;
    /** El mensaje del error, corto: viaja al servidor en el reintento. */
    error: string;
    /** Un 4xx (salvo 408 y 429) es un error de la petición: repetirla no lo arregla. */
    reintentable: boolean;
}

/** Lo que el servidor apunta de un reintento (ver `reintentos_cliente.py`). */
export interface DatosReintento {
    intento: number;
    tipo: TipoFallo;
    status: number;
    error: string;
    espera_ms: number;
}

// Cómo dice cada navegador que la conexión se cayó: Chrome «Failed to fetch» o
// «network error» a media respuesta, Safari «Load failed» o «The network
// connection was lost», Firefox «NetworkError when attempting to fetch».
const RX_RED = /failed to fetch|load failed|networkerror|network error|network connection was lost|internet connection appears to be offline|err_[a-z_]+|econnrefused|econnreset|timed? ?out|terminated|aborted/i;

export function clasificarFallo(err: unknown): FalloChat {
    const e = (err ?? {}) as { status?: unknown; message?: unknown };
    const status = typeof e.status === 'number' ? e.status : 0;
    const error = String(e.message ?? err ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (status === 429 || status === 502 || status === 503 || status === 504) {
        return { tipo: 'ocupado', status, error, reintentable: true };
    }
    if (status >= 500) return { tipo: 'error', status, error, reintentable: true };
    if (status >= 400) return { tipo: 'error', status, error, reintentable: status === 408 };
    if (RX_RED.test(error)) return { tipo: 'red', status: 0, error, reintentable: true };
    // Sin status y sin firma de red: algo falló de este lado. Se reintenta igual,
    // pero no se le echa la culpa a la conexión ni al servidor.
    return { tipo: 'error', status: 0, error, reintentable: true };
}

/** El aviso de cada tipo. Acepta también los tipos viejos ('cold', 'busy'). */
export function textoDelAviso(tipo: string | null | undefined): { titulo: string; detalle: string } {
    switch (tipo) {
        case 'ocupado':
        case 'busy':
            return {
                titulo: 'Servidor ocupado, reintentando…',
                detalle: 'El servidor está atendiendo varias solicitudes. Tu consulta se procesará en breve.',
            };
        case 'cold':
            return {
                titulo: 'Despertando el servidor…',
                detalle: 'Esto sólo lleva unos segundos.',
            };
        case 'error':
            return {
                titulo: 'Algo falló al responder, reintentando…',
                detalle: 'Tu consulta se vuelve a enviar sola. Si se repite, avísanos desde soporte.',
            };
        case 'red':
        default:
            return {
                titulo: 'Se interrumpió la conexión, reintentando…',
                detalle: 'Suele pasar al cambiar de red o cuando el teléfono pausa la página. Tu consulta se vuelve a enviar sola.',
            };
    }
}
