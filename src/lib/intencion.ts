/* ═══ ¿ESCRITO O CONSULTA? LA ETIQUETA DEL COMPOSITOR (28-sep-2026) ════════
   Sin el interruptor Buscar/Redactar (25-sep-2026), el abogado no sabía qué
   iba a pasar con su mensaje hasta ver la respuesta: «Quiero que me ayudes
   con la demanda» podía llegarle como explicación, y una pregunta sobre la
   demanda, como demanda redactada. Ahora, mientras escribe, una etiqueta
   junto al «Esfuerzo» dice «Escrito» o «Consulta», y con un clic la cambia.

   LA LECTURA LA HACE EL SERVIDOR (`POST /redaccion/intencion`), con el mismo
   detector que decidirá en /chat: sin modelo, sin costo y sin copiar aquí
   expresiones regulares que acabarían separándose de las de allá.

   LO ANUNCIADO ES LO QUE OCURRE. Al enviar viaja la intención en el campo
   `intencion` del request —la elegida por el abogado o, si no tocó nada, la
   lectura de ESE MISMO texto— y el servidor la obedece. Si la lectura no
   alcanzó a llegar (se envió al instante, o el servidor no contestó), no
   viaja nada y decide el detector, que es lo que la etiqueta habría dicho.

   Viaja SÓLO con el mensaje del compositor: se guarda aquí atada al texto
   exacto y `streamChat` la consume una vez, si el último mensaje del abogado
   es ése. Los demás caminos que llaman a `streamChat` —flujos, Toulmin,
   expedientes— no la reciben nunca. */

import { limpiarMarcadores } from '@/lib/documento/marcado';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

export type Intencion = 'redactar' | 'consultar';

/** Lo que el servidor leyó en `texto`: 'pide', 'ajuste', 'acepta' o ''. */
export interface Lectura {
    texto: string;
    intencion: Intencion;
    motivo: string;
}

/* Los topes del endpoint. Un mensaje o una respuesta más largos se mandan
   por la cabeza y la cola: el encargo suele ir al principio («Redacta…») o al
   final («…con base en lo anterior, redacta la demanda»), el rótulo del
   escrito al principio y la oferta de redactar al final. */
const TOPE_MENSAJE = 8000;
const TOPE_ANTERIOR = 16000;

function cabezaYCola(texto: string, tope: number, cabeza: number): string {
    if (texto.length <= tope) return texto;
    const cola = tope - cabeza - 3;
    return `${texto.slice(0, cabeza)}\n…\n${texto.slice(-cola)}`;
}

/** El mensaje como lo recibe el endpoint. */
export function mensajeParaLeer(mensaje: string): string {
    return cabezaYCola((mensaje || '').trim(), TOPE_MENSAJE, 5000);
}

/** La respuesta anterior sin marcadores —el mapa de fuentes puede medir más
 *  que la respuesta— y acotada. Basta para reconocer el retoque de un escrito
 *  y el «sí» a la oferta de redactar. */
export function anteriorParaLeer(texto: string | null | undefined): string {
    return cabezaYCola(limpiarMarcadores(texto || ''), TOPE_ANTERIOR, 12000);
}

/** Pregunta al servidor. `null` si no contesta: la etiqueta no se enseña y
 *  decide el detector de /chat. */
export async function leerIntencion(
    mensaje: string,
    anterior: string,
    signal?: AbortSignal,
): Promise<Lectura | null> {
    const texto = (mensaje || '').trim();
    if (!texto) return null;
    try {
        const r = await fetch(`${API_URL}/redaccion/intencion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                mensaje: mensajeParaLeer(texto),
                ...(anterior ? { anterior } : {}),
            }),
        });
        if (!r.ok) return null;
        const j = await r.json();
        const intencion: Intencion | null = j?.intencion === 'redactar'
            ? 'redactar'
            : j?.intencion === 'consultar' ? 'consultar' : null;
        if (!intencion) return null;
        return { texto, intencion, motivo: typeof j?.motivo === 'string' ? j.motivo : '' };
    } catch {
        return null;
    }
}

/* ── LA INTENCIÓN DEL ENVÍO ───────────────────────────────────────────────
   Una sola, atada al texto exacto que el compositor manda, y con caducidad:
   si ese envío no llega a `streamChat` (el modo básico va por otro lado), la
   intención no puede quedarse esperando a que alguien mande lo mismo. Diez
   minutos cubren la ventana de elegir estado antes de la primera consulta. */
const CADUCIDAD_MS = 10 * 60 * 1000;
let delEnvio: { texto: string; intencion: Intencion; t: number } | null = null;

/** El compositor la fija justo antes de enviar; `null` la borra. */
export function fijarIntencionDelEnvio(texto: string, intencion: Intencion | null): void {
    const limpio = (texto || '').trim();
    delEnvio = limpio && intencion ? { texto: limpio, intencion, t: Date.now() } : null;
}

/** La consume `streamChat`: sólo si el último mensaje del abogado es el que
 *  el compositor mandó. Se consume una vez, salga o no. */
export function intencionParaEnviar(
    mensajes: ReadonlyArray<{ role: string; content: string }>,
): Intencion | undefined {
    const guardada = delEnvio;
    if (!guardada) return undefined;
    const ultimo = [...(mensajes || [])].reverse().find((m) => m.role === 'user');
    if (!ultimo || (ultimo.content || '').trim() !== guardada.texto) return undefined;
    delEnvio = null;
    if (Date.now() - guardada.t > CADUCIDAD_MS) return undefined;
    return guardada.intencion;
}
