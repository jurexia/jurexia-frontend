/**
 * EL ANÁLISIS DE UN DOCUMENTO NO SE PIERDE PORQUE LA RED LO RETENGA
 * (28-oct-2026).
 *
 * Un Platinum del Tribunal Colegiado de Tlaxcala (folio 3640-01) trabajaba
 * tras Cisco Umbrella, que retiene la respuesta en streaming y la entrega
 * entera al terminar. La pantalla vigilaba el silencio —75 s sin un byte— y
 * abortaba: de cuatro análisis cortó tres que el servidor sí terminó (144, 110
 * y 101 s), con el texto leído del documento dentro, y ninguno quedó en la
 * conversación.
 *
 * Ahora el silencio ya no tira nada. Pasado el reloj, el flujo se sigue
 * escuchando y además se espera la COPIA que la API guarda de cada análisis
 * (`respuestas_chat`, ver respuesta_guardada.py en la API): lo primero que
 * llegue —el flujo entero o la copia terminada— es el resultado. Si la red
 * corta el flujo a media lectura, también se va por la copia. Sólo cuando no
 * hay copia (la API de antes, o sin sesión) queda el aviso de siempre.
 *
 * Vive fuera de la página, y sin importar nada, para probarlo de punta a
 * punta contra un proxy que retiene (`_pruebas/red-que-retiene/`).
 */

export interface DocumentoLeido { nombre?: string; texto: string; recortado?: boolean }
export interface LimitePlan { leidas: number; total: number; plan: string | null }

/** Lo que la pantalla hace con cada evento del flujo. */
export interface EventosAnalisis {
    token: (texto: string) => void;
    progreso: (texto: string) => void;
    documento: (d: DocumentoLeido) => void;
    limitePlan: (l: LimitePlan) => void;
    error: (mensaje: string) => void;
    /** Una línea de avance que no viene del servidor: reintento, red que retiene… */
    aviso: (texto: string) => void;
}

export type EstadoCopia = 'en_curso' | 'terminada' | 'interrumpida';

/** La copia que la API guardó en `respuestas_chat`. */
export interface CopiaDeRespuesta {
    peticion_id: string;
    conversation_id: string | null;
    expediente_id: string | null;
    estado_mx: string | null;
    pregunta: string;
    respuesta: string | null;
    estado: EstadoCopia;
    guardada_at: string | null;
}

/** De dónde se leen las copias: `estado` es la consulta ligera que se repite;
 *  `completa`, la que trae la pregunta y la respuesta, una sola vez. */
export interface FuenteDeCopias {
    estado: (peticionId: string) => Promise<{ estado: EstadoCopia | null; error: boolean }>;
    completa: (peticionId: string) => Promise<CopiaDeRespuesta | null>;
}

export type FinDelAnalisis =
    /** Llegó por el flujo. `terminado`: vino su `done` (o su `error`). */
    | { via: 'flujo'; terminado: boolean; redRetuvo: boolean }
    /** El flujo no llegó entero y la copia del servidor sí. */
    | { via: 'copia'; copia: CopiaDeRespuesta; redRetuvo: boolean }
    /** Se acabó la espera con el servidor todavía escribiendo. */
    | { via: 'sigue'; redRetuvo: boolean };

export interface Tiempos {
    /** Sin un byte en este tiempo, además del flujo se espera la copia. */
    silencio: number;
    /** Sin el primer byte en este tiempo, se avisa que la red puede estar reteniendo. */
    avisoRed: number;
    /** Desde el envío: hasta aquí se espera la copia. Lo que tarde más lo
     *  pasa al historial la recuperación (`recuperarRespuestas`). */
    topeCopia: number;
    /** Cada cuánto se mira la copia. */
    cadaCopia: number;
    /** Tantas consultas seguidas sin fila: la API no guardó copia. */
    consultasSinFila: number;
    /** La espera antes de reenviar un envío que no salió. */
    reintentoEnvio: number;
}

export const TIEMPOS: Tiempos = {
    silencio: 75_000,
    avisoRed: 20_000,
    topeCopia: 10 * 60_000,
    cadaCopia: 4_000,
    consultasSinFila: 3,
    reintentoEnvio: 2_500,
};

/* La red «retuvo» si lo primero llegó tarde y todo de golpe: el servidor
   cuenta su avance desde el primer segundo, así que un flujo vivo no calla
   medio minuto para luego soltarlo entero en un instante. Una subida lenta
   sí retrasa el primer byte, pero después el análisis llega por partes. */
const RETENCION_PRIMER_BYTE_MS = 30_000;
const RETENCION_RAFAGA_MS = 3_000;
const FALLOS_SEGUIDOS_SIN_COPIA = 5;

export const AVISO_RED_TARDA = 'Todavía no llega nada del servidor: el archivo puede seguir subiendo, '
    + 'o su red puede estar reteniendo la respuesta. No cierre esta ventana.';
export const AVISO_RED_RETIENE = 'Su red está reteniendo la respuesta. El análisis sigue en el servidor: '
    + 'lo traemos en cuanto termine.';
export const AVISO_SIGUE = 'El servidor sigue trabajando en su análisis: lo traemos en cuanto termine.';
export const AVISO_CORTADO = 'Se cortó la conexión; recuperamos el análisis del servidor…';

/** «Failed to fetch» y sus parientes: la petición no salió o se cortó. Mismo
 *  criterio que el reintento del envío (25-oct-2026), más «network error»
 *  (Chrome cuando se corta a media lectura) y «fetch failed» (undici). */
export function esFalloDeRed(e: unknown): boolean {
    const err = e as { name?: string; message?: string } | null;
    return err?.name !== 'AbortError'
        && /Failed to fetch|fetch failed|NetworkError|network error|ERR_CONNECTION|Load failed/i.test(err?.message || '');
}

function esAborto(e: unknown): boolean {
    return (e as { name?: string } | null)?.name === 'AbortError';
}

function dormir(ms: number, senal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        if (senal?.aborted) return resolve();
        const reloj = setTimeout(resolve, ms);
        senal?.addEventListener('abort', () => { clearTimeout(reloj); resolve(); }, { once: true });
    });
}

type EsperaDeCopia =
    | { tipo: 'lista'; fila: CopiaDeRespuesta }
    | { tipo: 'sin_copia' }
    | { tipo: 'en_curso' }
    | { tipo: 'cancelada' };

/** Mira la copia hasta que el servidor la termine, hasta `hasta` o hasta que
 *  se cancele. Sin fila tras unas cuantas consultas: no hay copia. */
async function esperarCopia(peticionId: string, copias: FuenteDeCopias, t: Tiempos,
    hasta: number, senal: AbortSignal): Promise<EsperaDeCopia> {
    let sinFila = 0;
    let fallos = 0;
    let existe = false;
    for (;;) {
        if (senal.aborted) return { tipo: 'cancelada' };
        const { estado, error } = await copias.estado(peticionId).catch(() => ({ estado: null, error: true }));
        if (senal.aborted) return { tipo: 'cancelada' };
        if (error) {
            fallos++;
        } else if (!estado) {
            fallos = 0;
            if (!existe && ++sinFila >= t.consultasSinFila) return { tipo: 'sin_copia' };
        } else {
            fallos = 0;
            existe = true;
            if (estado !== 'en_curso') {
                const fila = await copias.completa(peticionId).catch(() => null);
                if (senal.aborted) return { tipo: 'cancelada' };
                if (fila && fila.estado !== 'en_curso') return { tipo: 'lista', fila };
            }
        }
        if (!existe && fallos >= FALLOS_SEGUIDOS_SIN_COPIA) return { tipo: 'sin_copia' };
        if (Date.now() + t.cadaCopia > hasta) return existe ? { tipo: 'en_curso' } : { tipo: 'sin_copia' };
        await dormir(t.cadaCopia, senal);
    }
}

/**
 * Envía el documento a /analyze-document y entrega cada evento a la pantalla.
 * Lanza lo mismo que antes —un error HTTP con su `status`, el fallo de red del
 * envío, o un AbortError si el silencio venció sin copia que esperar— para
 * que la pantalla diga lo de siempre.
 */
export async function analizarDocumento(o: {
    url: string;
    cuerpo: FormData;
    cabeceras?: Record<string, string>;
    /** Sin los dos no hay copia que esperar: el silencio aborta como antes. */
    peticionId?: string | null;
    copias?: FuenteDeCopias | null;
    eventos: EventosAnalisis;
    tiempos?: Partial<Tiempos>;
    fetchImpl?: typeof fetch;
}): Promise<FinDelAnalisis> {
    const t: Tiempos = { ...TIEMPOS, ...o.tiempos };
    const fetchImpl = o.fetchImpl ?? fetch;
    const peticionId = o.peticionId || null;
    const copias = peticionId ? o.copias ?? null : null;
    const inicio = Date.now();
    const controller = new AbortController();
    let reloj: ReturnType<typeof setTimeout> | undefined;
    let primerByte = 0;          // ms desde el envío; 0: todavía nada
    let ultimoByte = 0;
    let vioFin = false;          // llegó `done` o `error`
    let respuestaRecibida = false;
    let espera: EsperaDeCopia | null = null;
    let vigilancia: { promesa: Promise<EsperaDeCopia>; corte: AbortController } | null = null;

    /* Una sola vigilancia a la vez. Si el flujo revive (la red suelta lo
       retenido), se deja de vigilar: el flujo manda. */
    const vigilar = (): Promise<EsperaDeCopia> => {
        if (!copias || !peticionId) return Promise.resolve({ tipo: 'sin_copia' });
        if (!vigilancia) {
            const corte = new AbortController();
            const promesa = esperarCopia(peticionId, copias, t, inicio + t.topeCopia, corte.signal)
                .then((r) => {
                    if (r.tipo !== 'cancelada' && vigilancia?.corte === corte) {
                        espera = r;
                        controller.abort();      // corta la lectura que esté esperando
                    }
                    return r;
                });
            vigilancia = { promesa, corte };
        }
        return vigilancia.promesa;
    };
    const dejarDeVigilar = () => {
        vigilancia?.corte.abort();
        vigilancia = null;
    };
    const alSilencio = () => {
        if (!copias) { controller.abort(); return; }          // como antes: no hay copia que esperar
        o.eventos.aviso(primerByte ? AVISO_SIGUE : AVISO_RED_RETIENE);
        void vigilar();
    };
    const rearmar = () => {
        if (reloj) clearTimeout(reloj);
        reloj = setTimeout(alSilencio, t.silencio);
    };
    const relojAviso = setTimeout(() => {
        if (!primerByte && !vigilancia) o.eventos.aviso(AVISO_RED_TARDA);
    }, t.avisoRed);
    const retuvo = () => !primerByte
        || (primerByte >= RETENCION_PRIMER_BYTE_MS && ultimoByte - primerByte <= RETENCION_RAFAGA_MS);
    const deLaCopia = (r: EsperaDeCopia): FinDelAnalisis | null =>
        r.tipo === 'lista' ? { via: 'copia', copia: r.fila, redRetuvo: retuvo() }
            : r.tipo === 'en_curso' ? { via: 'sigue', redRetuvo: retuvo() }
                : null;

    rearmar();
    try {
        /* UN REINTENTO SI LA PETICIÓN NO SALIÓ (25-oct-2026). «Failed to
           fetch» antes de las cabeceras casi siempre quiere decir que el
           servidor no recibió nada: en móvil, una red que parpadea o una
           pestaña que el teléfono pausó. Pero si ya se está vigilando la
           copia, la petición lleva más de un minuto abierta: el servidor la
           tiene, y reenviarla sería analizar (y cobrar) dos veces. */
        let response: Response | null = null;
        for (let intento = 1; ; intento++) {
            try {
                response = await fetchImpl(o.url, {
                    method: 'POST', body: o.cuerpo, headers: o.cabeceras, signal: controller.signal,
                });
                break;
            } catch (errEnvio) {
                if (vigilancia || !esFalloDeRed(errEnvio) || intento >= 2) throw errEnvio;
                console.warn('[analyze-document] el envío no salió; se reintenta una vez', errEnvio);
                o.eventos.aviso('Reintentando el envío del documento…');
                await dormir(t.reintentoEnvio);
                rearmar();
            }
        }
        respuestaRecibida = true;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Error al analizar documento' }));
            throw Object.assign(new Error(errorData.detail || `Error ${response.status}`), { status: response.status });
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No se pudo iniciar la lectura del análisis');

        const decoder = new TextDecoder();
        let buffer = '';
        let tramasPerdidas = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const ms = Date.now() - inicio;
            if (!primerByte) primerByte = ms || 1;
            ultimoByte = ms;
            rearmar();   // llegó algo: texto, avance o latido
            if (vigilancia && !espera) dejarDeVigilar();

            buffer += decoder.decode(value, { stream: true });
            const lineas = buffer.split('\n');
            buffer = lineas.pop() || '';
            for (const linea of lineas) {
                if (!linea.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(linea.slice(6));
                    if (data.token) o.eventos.token(data.token);
                    else if (data.progreso) o.eventos.progreso(String(data.progreso));
                    else if (data.documento?.texto) o.eventos.documento(data.documento as DocumentoLeido);
                    else if (data.limite_plan) o.eventos.limitePlan(data.limite_plan as LimitePlan);
                    else if (data.error) { vioFin = true; o.eventos.error(String(data.error)); }
                    if (data.done) vioFin = true;
                } catch (e) {
                    /* UNA TRAMA QUE NO SE PUEDE LEER NO SE TIRA EN SILENCIO
                       (20-sep-2026): que se vea en la consola y se cuente. */
                    tramasPerdidas++;
                    console.error('[analyze-document] trama SSE ilegible',
                        { perdidas: tramasPerdidas, largo: linea.length, error: e });
                }
            }
        }
        if (tramasPerdidas > 0) {
            console.error(`[analyze-document] ${tramasPerdidas} trama(s) perdida(s): `
                + 'el análisis que se ve puede estar incompleto.');
        }
        /* El flujo se cerró sin su final: la red lo cortó. Si el servidor sí
           terminó, su copia está entera. */
        if (!vioFin && copias) {
            o.eventos.aviso(AVISO_CORTADO);
            const fin = deLaCopia(await vigilar());
            if (fin) return fin;
        }
        return { via: 'flujo', terminado: vioFin, redRetuvo: retuvo() };
    } catch (err) {
        if (copias && !vioFin) {
            // El aborto lo pidió la vigilancia: su resultado ya está.
            if (esAborto(err) && espera) {
                const fin = deLaCopia(espera);
                if (fin) return fin;
            } else if (esFalloDeRed(err) && (respuestaRecibida || vigilancia)) {
                // La red cortó a media lectura (o con la petición ya en el servidor).
                o.eventos.aviso(AVISO_CORTADO);
                const fin = deLaCopia(await vigilar());
                if (fin) return fin;
            }
        }
        throw err;
    } finally {
        if (reloj) clearTimeout(reloj);
        clearTimeout(relojAviso);
        dejarDeVigilar();
    }
}
