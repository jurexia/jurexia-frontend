/* «Estudiar y pensar»: el catálogo de lecciones.

   `lecciones.json` NO se edita a mano. Lo escribe
   `video-nodos/lecturas/catalogo_web.py` a partir de las mismas lecturas que
   producen los PDF (vNN.md) y de `web.json` (el video de YouTube, la fecha de
   publicación, el eje y los capítulos). Así la ficha de la web y el PDF nunca
   dicen cosas distintas: si cambia la lectura, se vuelve a correr el script.

   Sólo se importa desde componentes de servidor: el JSON pesa ~170 KB y no
   tiene por qué viajar al navegador. A los componentes de cliente se les pasa
   únicamente lo que pintan. */

import datos from './lecciones.json';

export type Eje = {
    id: string;
    numero: string;
    titulo: string;
    descripcion: string;
};

export type Semblanza = { nombre: string; fechas: string; campo: string; quien: string; aporte: string };
export type Documento = {
    tipo: string; tipoNombre: string; etiqueta: string; titulo: string;
    extracto: string; traducido: boolean; idioma: string;
};
export type Fuente = { tipo: string; tipoNombre: string; referencia: string; url: string };

export type Leccion = {
    id: string;
    slug: string;
    eje: string;
    publicada: boolean;
    youtube: string;
    /** ISO con zona horaria. Si es futura, el video aún no se estrena. */
    publicado: string;
    tituloVideo: string;
    /** Segundos. */
    duracion: number | null;
    capitulosVideo: { segundo: number; titulo: string }[];
    /** HTML en línea (cursivas). */
    titulo: string;
    tituloPlano: string;
    subtitulo: string;
    corto: string;
    nivel: string;
    actualizado: string;
    claves: string[];
    resumen: string;
    resumenPlano: string;
    ideas: string[];
    secciones: string[];
    anexos: string[];
    semblanzas: Semblanza[];
    documentos: Documento[];
    cronologias: { titulo: string; filas: { anio: string; texto: string }[] }[];
    glosario: { termino: string; definicion: string }[];
    preguntas: string[];
    fuentes: Fuente[];
    lectura: { pdf: string; paginas: number; kb: number; palabras: number; minutos: number };
    portada: string;
    miniatura: string | null;
    miniatura640: string | null;
};

export const CANAL_YOUTUBE: string = datos.canal;
export const EJES: Eje[] = datos.ejes;
/** En el orden del temario: eje por eje, y dentro de cada eje, en el orden de web.json. */
export const LECCIONES: Leccion[] = (datos.lecciones as Leccion[])
    .filter((l) => l.publicada)
    .sort((a, b) => EJES.findIndex((e) => e.id === a.eje) - EJES.findIndex((e) => e.id === b.eje));

export function leccionPorSlug(slug: string): Leccion | undefined {
    return LECCIONES.find((l) => l.slug === slug);
}

export function ejeDe(l: Leccion): Eje {
    return EJES.find((e) => e.id === l.eje)!;
}

export function leccionesDelEje(eje: string): Leccion[] {
    return LECCIONES.filter((l) => l.eje === eje);
}

/** «II.3»: el eje en romanos y el lugar de la lección dentro de él. */
export function numeroDe(l: Leccion): string {
    const eje = ejeDe(l);
    return `${eje.numero}.${leccionesDelEje(l.eje).indexOf(l) + 1}`;
}

export function vecinas(l: Leccion): { anterior: Leccion | null; siguiente: Leccion | null } {
    const i = LECCIONES.indexOf(l);
    return { anterior: LECCIONES[i - 1] ?? null, siguiente: LECCIONES[i + 1] ?? null };
}

/** 155 → «2:35»; 1198 → «19:58». */
export function reloj(segundos: number | null | undefined): string {
    if (segundos == null) return '';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Para schema.org: 155 → «PT2M35S». */
export function duracionISO(segundos: number | null | undefined): string | undefined {
    if (segundos == null) return undefined;
    return `PT${Math.floor(segundos / 60)}M${Math.floor(segundos % 60)}S`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «2026-10-06T17:00:00-06:00» → «6 de octubre de 2026», en la hora de la Ciudad de México. */
export function fechaLarga(iso: string): string {
    const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Totales del temario, para la cabecera. */
export function totales() {
    const segundos = LECCIONES.reduce((s, l) => s + (l.duracion ?? 0), 0);
    return {
        lecciones: LECCIONES.length,
        ejes: EJES.filter((e) => leccionesDelEje(e.id).length > 0).length,
        minutosVideo: Math.round(segundos / 60),
        paginas: LECCIONES.reduce((s, l) => s + l.lectura.paginas, 0),
        fuentes: LECCIONES.reduce((s, l) => s + l.fuentes.length, 0),
        personajes: LECCIONES.reduce((s, l) => s + l.semblanzas.length, 0),
    };
}

/** Sin etiquetas, para atributos y metadatos. */
export function plano(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Orden alfabético en español, sin que las cursivas ni los artículos lo alteren. */
export function clave(html: string): string {
    return plano(html).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^[«"¿¡*]+/, '').toLowerCase();
}
