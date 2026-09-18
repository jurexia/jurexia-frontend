/**
 * LAS CITAS DENTRO DEL DOCUMENTO (18-sep-2026).
 *
 * La burbuja del chat convierte cada identificador de documento en una ficha
 * [N] que abre el visor de la fuente. Al llevar la respuesta a la hoja tipo
 * Word, `markdownAHtml` borraba esos identificadores y el escrito perdía sus
 * citas: quedaba un texto que afirmaba sin poder enseñar de dónde.
 *
 * Aquí se hace lo mismo que en la burbuja, pero para la hoja: cada
 * identificador se cambia por una marca «⟦cita:N:uuid⟧» que sobrevive al
 * escapado y a la conversión, y al final se vuelve una ficha no editable con
 * el mismo `data-doc-id`. La numeración es por orden de aparición, como en
 * la burbuja, para que [3] sea la misma fuente en las dos.
 */
import { markdownAHtml } from './marcado';

export interface FuenteCita {
    docId: string;
    origen: string;
    ref: string;
    texto: string;
    pdf_url?: string | null;
    silo?: string;
    entidad?: string | null;
    registro?: string;
    tesis_num?: string;
    tipo_criterio?: string;
    instancia?: string;
    materia?: string;
}

export interface MetaCitas {
    valid: number;
    invalid: number;
    total: number;
    invalid_ids: string[];
    sources?: Record<string, Partial<FuenteCita>>;
}

const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

/** Los metadatos de cita que el servidor manda al final del flujo. */
export function metaDeCitas(markdown: string): MetaCitas | null {
    const m = (markdown || '').match(/<!-- CITATION_META:(\{[\s\S]*?\}) -->/);
    if (!m) return null;
    try { return JSON.parse(m[1]) as MetaCitas; } catch { return null; }
}

/** Lo que el chat esconde y la hoja tampoco debe enseñar: razonamiento del
 *  modelo (en cualquiera de sus dos marcadores) y bloques de síntesis. */
function sinTrasfondo(markdown: string): string {
    let t = markdown || '';
    t = t.replace(/<!--THINKING_START-->[\s\S]*?<!--THINKING_END-->/g, '');
    const abierto = t.indexOf('<!--THINKING_START-->');
    if (abierto !== -1) t = t.slice(0, abierto);
    t = t.replace(/<!--SYNTHESIS:START-->[\s\S]*?<!--SYNTHESIS:END-->/g, '');
    t = t.replace(/<!--SYNTHESIS:START-->[\s\S]*/, '');
    return t;
}

/** Cambia cada identificador por una marca numerada por orden de aparición. */
export function marcarCitas(markdown: string): { markdown: string; orden: string[] } {
    const orden: string[] = [];
    const numero = (uuid: string) => {
        const u = uuid.toLowerCase();
        let i = orden.indexOf(u);
        if (i === -1) { orden.push(u); i = orden.length - 1; }
        return i + 1;
    };
    const marca = (uuid: string) => `⟦cita:${numero(uuid)}:${uuid.toLowerCase()}⟧`;
    let t = sinTrasfondo(markdown);
    // [Doc ID: uuid] — la forma normal
    t = t.replace(new RegExp(`\\[Doc ID:\\s*(${UUID})\\]`, 'gi'), (_, u) => marca(u));
    // [, uuid] y [nombre, uuid] — formas que el modelo también produce
    t = t.replace(new RegExp(`\\[\\s*,\\s*(${UUID})\\s*\\]`, 'gi'), (_, u) => marca(u));
    t = t.replace(new RegExp(`\\[[^\\]\\n]*,\\s*(${UUID})\\s*\\]`, 'gi'), (_, u) => marca(u));
    // «Doc uuid» suelto
    t = t.replace(new RegExp(`(^|[^a-f0-9-])Doc\\s+(${UUID})(?![a-f0-9-])`, 'gi'), (_, pre, u) => pre + marca(u));
    // Un uuid suelto que no esté ya dentro de una marca
    t = t.replace(new RegExp(`(^|[^a-f0-9\\-⟦:])(${UUID})(?![a-f0-9\\-⟧])`, 'gi'), (_, pre, u) => pre + marca(u));
    return { markdown: t, orden };
}

/** Markdown de una respuesta → HTML de la hoja con sus citas como fichas. */
export function htmlDeDocumento(markdown: string): { html: string; orden: string[] } {
    const { markdown: marcado, orden } = marcarCitas(markdown);
    const html = markdownAHtml(marcado).replace(
        /⟦cita:(\d+):([a-f0-9-]+)⟧/g,
        (_, n, uuid) => `<sup class="citation-badge" contenteditable="false" data-doc-id="${uuid}">[${n}]</sup>`,
    );
    return { html, orden };
}

/** La fuente de una ficha, con lo que el servidor sepa de ella. */
export function fuenteDeCita(meta: MetaCitas | null, docId: string): FuenteCita {
    const fuentes = meta?.sources;
    const s = fuentes?.[docId]
        || fuentes?.[docId.toLowerCase()]
        || (fuentes ? Object.entries(fuentes).find(([k]) => k.toLowerCase() === docId.toLowerCase())?.[1] : undefined);
    return {
        docId,
        origen: s?.origen || 'Fuente legal',
        ref: s?.ref || '',
        texto: s?.texto || '',
        pdf_url: s?.pdf_url,
        silo: s?.silo,
        entidad: s?.entidad,
        registro: s?.registro,
        tesis_num: s?.tesis_num,
        tipo_criterio: s?.tipo_criterio,
        instancia: s?.instancia,
        materia: s?.materia,
    };
}

/** Palabras del escrito, sin marcadores ni identificadores. */
export function palabrasDe(markdown: string): number {
    const t = sinTrasfondo(markdown)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(new RegExp(`\\[[^\\]\\n]*${UUID}\\s*\\]`, 'gi'), '')
        .replace(new RegExp(UUID, 'gi'), '')
        .trim();
    return t ? t.split(/\s+/).length : 0;
}
