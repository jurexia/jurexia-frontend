/**
 * Cliente de POST /toulmin/stream: los argumentos de la parte, con cada cita
 * resuelta contra el acervo en el servidor. Ver `jurexia-api-git/toulmin.py`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

export type ClaseFuente = 'constitucion' | 'tratado' | 'coidh' | 'ley' | 'tesis';

export interface FuenteToulmin {
    id: string;
    clase: ClaseFuente;
    cita: string;
    texto: string;
    fuente?: string;
    articulo?: string;
    registro?: string;
    rubro?: string;
    instancia?: string;
    tipo?: string;
    caso?: string;
    parrafo?: string;
}

export interface ArgumentoToulmin {
    titulo: string;
    afirmacion: string;
    datos: string[];
    garantia: { texto: string; fuentes: string[] };
    respaldo: { fuente: string; como_apoya: string }[];
    calificador: string;
    refutacion: { objecion: string; respuesta: string; fuentes: string[] };
    redaccion: string;
    citadas: string[];
    /** En un recurso: la consideración de la resolución que combate (resuelta por número en el servidor). */
    consideracion?: string;
}

export interface ResultadoToulmin {
    /** «demanda» o «recurso» (los resultados guardados antes del 15-sep no la traen). */
    clase?: ClaseEscrito;
    problemas: string[];
    /** En un recurso, la consideración de la resolución que combate cada problema. */
    consideraciones?: string[];
    /** En un recurso: «particular» o «autoridad». */
    recurrente?: string;
    materia: string;
    argumentos: ArgumentoToulmin[];
    fuentes: Record<string, FuenteToulmin>;
    citadas: string[];
    faltantes: string[];
    avisos: string[];
    conteo: Partial<Record<ClaseFuente, number>>;
}

export type ClaseEscrito = 'demanda' | 'recurso';

export interface PeticionToulmin {
    hechos: string;
    pretension: string;
    clase?: ClaseEscrito;
    /** En un recurso, el que escribió el abogado: «apelación contra sentencia definitiva». */
    tipo?: string;
    /** En un recurso: lo que resolvió la autoridad y sus razones. */
    resolucion?: string;
    estado?: string;
    materia?: string;
}

export type EventoToulmin =
    | { tipo: 'paso'; clave: string; detalle: string }
    | { tipo: 'latido' }
    | { tipo: 'listo'; resultado: ResultadoToulmin }
    | { tipo: 'error'; mensaje: string };

export class ErrorToulmin extends Error {
    constructor(message: string, public status: number) {
        super(message);
    }
}

export async function* toulminStream(
    peticion: PeticionToulmin,
    accessToken: string | undefined,
    signal?: AbortSignal,
): AsyncGenerator<EventoToulmin, void, unknown> {
    const r = await fetch(`${API_URL}/toulmin/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(peticion),
        signal,
    });
    if (!r.ok) {
        let detalle = peticion.clase === 'recurso' ? 'No se pudieron construir los agravios.' : 'No se pudieron construir los argumentos.';
        try {
            const j = await r.json();
            if (typeof j?.detail === 'string') detalle = j.detail;
            // Un 422 trae `detail` como lista: casi siempre, un texto que excede su tope.
            else if (Array.isArray(j?.detail)) {
                const largo = j.detail.find((d: { type?: string }) => /too_long/.test(String(d?.type)));
                detalle = largo
                    ? 'Alguno de los textos es demasiado largo. Acórtalo (pega sólo lo que sostiene lo resuelto) y vuelve a intentarlo.'
                    : 'Revisa los datos del escrito y vuelve a intentarlo.';
            }
        } catch { /* sin cuerpo JSON */ }
        throw new ErrorToulmin(detalle, r.status);
    }
    const lector = r.body?.getReader();
    if (!lector) throw new ErrorToulmin('Sin respuesta del servidor.', 502);
    const dec = new TextDecoder();
    let bufer = '';
    while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        bufer += dec.decode(value, { stream: true });
        let corte = bufer.indexOf('\n\n');
        while (corte !== -1) {
            const bloque = bufer.slice(0, corte);
            bufer = bufer.slice(corte + 2);
            for (const linea of bloque.split('\n')) {
                if (!linea.startsWith('data: ')) continue;
                try {
                    yield JSON.parse(linea.slice(6)) as EventoToulmin;
                } catch { /* línea incompleta: se ignora */ }
            }
            corte = bufer.indexOf('\n\n');
        }
    }
}

/** Enlace a la ficha oficial del Semanario para una tesis. */
export function enlaceSemanario(registro?: string): string | null {
    return registro ? `https://sjf2.scjn.gob.mx/detalle/tesis/${encodeURIComponent(registro)}` : null;
}

/** El argumento como HTML de escrito: título centrado y la redacción en párrafos. */
export function argumentoAHtml(a: ArgumentoToulmin, ordinal?: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const titulo = ordinal ? `${ordinal}. ${a.titulo}` : a.titulo;
    const parrafos = a.redaccion
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
    return `<h3>${esc(titulo)}</h3>${parrafos}`;
}

export const ORDINALES = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO'];

/** Los agravios se rotulan como en el foro: «PRIMER AGRAVIO», «TERCER AGRAVIO». */
export const ORDINALES_AGRAVIO = ['PRIMER AGRAVIO', 'SEGUNDO AGRAVIO', 'TERCER AGRAVIO', 'CUARTO AGRAVIO',
    'QUINTO AGRAVIO', 'SEXTO AGRAVIO', 'SÉPTIMO AGRAVIO', 'OCTAVO AGRAVIO'];

export function rotuloDe(clase: ClaseEscrito | undefined, i: number): string {
    return (clase === 'recurso' ? ORDINALES_AGRAVIO : ORDINALES)[i] ?? String(i + 1);
}
