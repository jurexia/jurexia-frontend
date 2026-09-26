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
import { markdownAHtml, separarTarjetas, sinRazonamiento } from './marcado';
import { expandirCitasAgrupadas, quitarBloques, sinComentarioAbiertoAlFinal, sinComentarios } from '@/lib/idsDeCita';
import { type CamposCoidh, camposCoidh, esCoidh, referenciaCoidh } from '@/lib/coidh';
import { type CamposDoctrina, camposDoctrina, esDoctrina, referenciaDoctrina } from '@/lib/doctrina';

/** Una fuente citada. Las de la Corte IDH (`silo: "coidh"`) traen además
 *  caso, párrafo, página y ancla: ver `@/lib/coidh`. Las de doctrina
 *  (`silo: "doctrina"`), obra, autor, página y ancla: ver `@/lib/doctrina`. */
export interface FuenteCita extends CamposCoidh, CamposDoctrina {
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

/** Los metadatos de cita que el servidor manda al final del flujo. Es el
 *  primer grupo de `/<!-- CITATION_META:(\{[\s\S]*?\}) -->/`, buscado con
 *  `indexOf`: la expresión volvía a recorrer el final desde cada apertura sin
 *  cierre, y esto corre sobre cada respuesta del historial. */
export function metaDeCitas(markdown: string): MetaCitas | null {
    const t = markdown || '';
    const ABRE = '<!-- CITATION_META:{';
    const a = t.indexOf(ABRE);
    if (a === -1) return null;
    const b = t.indexOf('} -->', a + ABRE.length);
    if (b === -1) return null;
    try { return JSON.parse(t.slice(a + ABRE.length - 1, b + 1)) as MetaCitas; } catch { return null; }
}

/** Lo que el chat esconde y la hoja tampoco debe enseñar: razonamiento del
 *  modelo (en cualquiera de sus dos marcadores) y bloques de síntesis. */
function sinTrasfondo(markdown: string): string {
    let t = markdown || '';
    /* LAS TARJETAS HTML DEL CHAT NO SON TEXTO DEL ESCRITO (18-sep-2026).
       El chat pega al final «Doctrina consultada» y las fuentes web como HTML
       con clases `fuentes-web`/`fw-*`. En la burbuja se pintan como tarjetas;
       en la hoja, que escapa el HTML, salían crudas —«<div class="fuentes-web">
       <div class="fw-cab">…»— dentro del documento del abogado. Se sacan y se
       vuelven a poner como lista legible de referencias. */
    const { sin, tarjetas } = separarTarjetas(t);
    t = tarjetas ? `${sin}\n\n${tarjetas}` : sin;
    // Con escáneres: `[\s\S]*?` volvía a recorrer el final desde cada
    // apertura sin cierre (ver las reglas en `@/lib/idsDeCita`).
    t = quitarBloques(t, /<!--THINKING_START-->/g, '<!--THINKING_END-->');
    const abierto = t.indexOf('<!--THINKING_START-->');
    if (abierto !== -1) t = t.slice(0, abierto);
    t = quitarBloques(t, /<!--SYNTHESIS:START-->/g, '<!--SYNTHESIS:END-->');
    const sintesis = t.indexOf('<!--SYNTHESIS:START-->');
    if (sintesis !== -1) t = t.slice(0, sintesis);
    return t;
}

/** Cambia cada identificador por una marca numerada por orden de aparición. */
export function marcarCitas(markdown: string): { markdown: string; orden: string[] } {
    const orden: string[] = [];
    // El número de cada identificador en un mapa: `orden.indexOf` por cita
    // era cuadrático en el número de citas distintas.
    const numeros = new Map<string, number>();
    const numero = (uuid: string) => {
        const u = uuid.toLowerCase();
        let n = numeros.get(u);
        if (n === undefined) { orden.push(u); n = orden.length; numeros.set(u, n); }
        return n;
    };
    const marca = (uuid: string) => `⟦cita:${numero(uuid)}:${uuid.toLowerCase()}⟧`;
    // Lo agrupado —«[Doc IDs: a; b]»— se abre en citas singulares ANTES de
    // numerar. Sin esto la hoja enseñaba «[Doc IDs: [25]; [26]]» (26-sep-2026).
    //
    // Y los marcadores, fuera antes de numerar: el paso del uuid suelto contaba
    // también los identificadores del JSON de CITATION_META y PRECEDENTES_META,
    // y el pie de la hoja decía «67 citas» con 33 en el texto. `markdownAHtml`
    // borraba el comentario después, pero `orden` ya los llevaba dentro. El
    // razonamiento se quita primero, con sus marcas, para no dejar su texto.
    // Todo en tiempo lineal: ver las reglas en `@/lib/idsDeCita`.
    let t = sinComentarioAbiertoAlFinal(sinComentarios(expandirCitasAgrupadas(sinRazonamiento(sinTrasfondo(markdown)))));
    // [Doc ID: uuid] — la forma normal
    t = t.replace(new RegExp(`\\[Doc ID:\\s{0,8}(${UUID})\\]`, 'gi'), (_, u) => marca(u));
    // [, uuid] y [nombre, uuid] — formas que el modelo también produce. El
    // nombre no cruza otro «[»: una fila de «[» sin cerrar era cuadrática.
    t = t.replace(new RegExp(`\\[\\s{0,8},\\s{0,8}(${UUID})\\s{0,8}\\]`, 'gi'), (_, u) => marca(u));
    t = t.replace(new RegExp(`\\[[^\\[\\]\\n]{0,2000},\\s{0,8}(${UUID})\\s{0,8}\\]`, 'gi'), (_, u) => marca(u));
    // «Doc uuid» suelto
    t = t.replace(new RegExp(`(^|[^a-f0-9-])Doc\\s{1,8}(${UUID})(?![a-f0-9-])`, 'gi'), (_, pre, u) => pre + marca(u));
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
        ...camposCoidh(s),
        ...camposDoctrina(s),
    };
}

/** Palabras del escrito, sin marcadores ni identificadores. */
export function palabrasDe(markdown: string): number {
    const t = sinComentarios(sinTrasfondo(markdown))
        .replace(new RegExp(`\\[[^\\[\\]\\n]{0,2000}${UUID}\\s{0,8}\\]`, 'gi'), '')
        .replace(new RegExp(UUID, 'gi'), '')
        .trim();
    return t ? t.split(/\s+/).length : 0;
}

/* ═══ LA REFERENCIA APA, la misma que el DOCX del chat (portada de la burbuja) ═══ */

/** Lo que hace falta para una referencia: lo que traen los marcadores de fuentes, con sus null. */
export type FuenteReferencia = {
    origen?: string | null;
    ref?: string | null;
    silo?: string | null;
    entidad?: string | null;
    instancia?: string | null;
    registro?: string | null;
    tesis_num?: string | null;
    tipo_criterio?: string | null;
} & CamposCoidh & CamposDoctrina;

/** «art. 2o» de «Art. 2o CPEUM (parte 3)»; lo demás («Sección 7 Protocolo Estambul»), sin «(parte N)». */
function lugarDeLaRef(ref: string, sigla?: RegExp): string {
    const limpia = ref.replace(/\s*\(parte \d+\)\s*$/i, '').trim();
    const art = limpia.match(/^art(?:[íi]culo)?\.?\s*(.+)$/i);
    if (!art) return limpia;
    return `art. ${(sigla ? art[1].replace(sigla, '') : art[1]).trim()}`;
}

export function referenciaAPA(f: FuenteReferencia): string {
    const origen = (f.origen || '').trim();
    const ref = (f.ref || '').trim();
    const silo = (f.silo || '').toLowerCase();
    const tipo = (f.tipo_criterio || '').toLowerCase();
    const entidad = (f.entidad || '').trim();
    const instancia = (f.instancia || '').trim();
    const registro = (f.registro || '').trim();
    const tesisNum = (f.tesis_num || '').trim();
    const anio = new Date().getFullYear();
    // LA CORTE IDH, ANTES QUE NADA (25-sep-2026): su cita canónica es la forma
    // en que la propia Corte se cita, con caso, Serie y párrafo.
    if (esCoidh(f)) return referenciaCoidh(f);
    // LA DOCTRINA (25-sep-2026): caía en la regla de las leyes y salía
    // «Miguel Carbonell, «Los derechos…», 2004, art. p. 402. (2026).».
    if (esDoctrina(f)) return referenciaDoctrina(f);
    if (silo.includes('jurisprudencia') || tesisNum || registro) {
        const corte = instancia || 'Suprema Corte de Justicia de la Nación';
        const titulo = origen || ref || 'Tesis sin rubro';
        return `${corte}. (s.f.). ${titulo}.${tesisNum ? ` Tesis ${tesisNum}.` : ''}${registro ? ` Registro digital: ${registro}.` : ''} Semanario Judicial de la Federación.`;
    }
    if (silo.includes('sentencia') || silo.includes('precedente') || silo.includes('holding')) {
        return `${origen || 'Tribunal Colegiado de Circuito'}${ref ? `, Expediente ${ref}` : ''}. Poder Judicial de la Federación.`;
    }
    /* EL BLOQUE DE CONSTITUCIONALIDAD NO ES SÓLO LA CONSTITUCIÓN (25-sep-2026).
       `bloque_constitucional` guarda la CPEUM (355 trozos), pero también 5,212
       trozos de cuadernillos de la Corte IDH, 950 de tratados y 306 de fichas
       de casos y opiniones consultivas (lectura de Qdrant del 25-sep-2026). La
       condición `silo.includes('constitu')` los convertía TODOS en
       «Constitución Política de los Estados Unidos Mexicanos, art. CoIDH,
       Cuadernillo No. 4, Párr. 115». Ahora decide el `tipo` del trozo. */
    if (tipo === 'cuadernillo' || /^cuadernillo/i.test(origen)) {
        // Sin el «párr.»: en los cuadernillos ese número es el de la sentencia
        // citada, y el caso que lo acompaña está corrido al siguiente en el
        // 96.9 % de los trozos comprobables. Se cita el cuadernillo, no el caso.
        const titulo = origen.replace(/[\s:]+$/, '').replace(/\bCoIDH\b/, 'de la Corte Interamericana de Derechos Humanos');
        return `Corte Interamericana de Derechos Humanos. (s.f.). ${titulo || 'Cuadernillo de Jurisprudencia'}. San José, Costa Rica: Corte IDH.`;
    }
    if (tipo === 'sentencia_cidh' || tipo === 'opinion_consultiva' || /^CoIDH,/i.test(origen)) {
        const nombre = origen.replace(/^CoIDH,\s*/i, '').trim();
        return tipo === 'opinion_consultiva' || /^OC-/i.test(nombre)
            ? `Corte IDH. Opinión Consultiva ${nombre}.`
            : `Corte IDH. ${nombre || 'Caso contencioso'}.`;
    }
    if (tipo === 'constitucion' || /CPEUM|Constituci[oó]n Pol[ií]tica de los Estados Unidos Mexicanos/i.test(origen)
        || (silo === 'bloque_constitucional' && !origen)) {
        const lugar = ref ? lugarDeLaRef(ref, /\s*CPEUM\s*$/i) : '';
        return `Constitución Política de los Estados Unidos Mexicanos${lugar ? `, ${lugar}` : ''}. (${anio}). Cámara de Diputados del H. Congreso de la Unión.`;
    }
    if (tipo === 'convencion' || silo.includes('bloque') || /tratado|convenci[oó]n|pacto|protocolo|declaraci[oó]n/i.test(origen)) {
        // «Art. 2 CBdP» ya dice «art.»: antes salía «, art. Art. 2 CBdP».
        const lugar = ref ? lugarDeLaRef(ref) : '';
        const naturaleza = /reglas|principios|manual|protocolo de estambul|declaraci[oó]n/i.test(origen)
            ? 'Instrumento internacional de derechos humanos.'
            : 'Tratado internacional ratificado por México.';
        return `${origen || 'Instrumento internacional'}${lugar ? `, ${lugar}` : ''}. ${naturaleza}`;
    }
    if (silo.includes('federal') || silo.includes('codigo_nacional')) {
        return `${origen}${ref ? `, art. ${ref}` : ''}. (${anio}). Cámara de Diputados del H. Congreso de la Unión.`;
    }
    if (silo.includes('estatal') || silo.startsWith('leyes_')) {
        return `${origen}${ref ? `, art. ${ref}` : ''}. (${anio}).${entidad ? ` Congreso del Estado de ${entidad}.` : ''}`;
    }
    return `${origen || 'Fuente legal'}${ref ? `, art. ${ref}` : ''}. (${anio}).`;
}

/* ═══ DE DÓNDE VIENE CADA FUENTE, para el hilo (18-sep-2026) ═══
   David: «con los logos de Cámara de Diputados (si se citan leyes federales o
   Constitución), de la CIDH si se citó a la Corte Interamericana, y el de la
   Suprema Corte (porque siempre se citan tesis del Semanario)». El icono es
   el del sitio oficial de cada institución, servido desde /fuentes. */
export interface Institucion {
    clave: 'diputados' | 'scjn' | 'corteidh' | 'congreso' | 'congreso_estatal' | 'tratado' | 'otra';
    nombre: string;
    /** Icono local (public/fuentes/*.png); vacío = sin icono, sólo la inicial. */
    icono: string;
}

const INSTITUCIONES: Record<Institucion['clave'], Institucion> = {
    diputados: { clave: 'diputados', nombre: 'Cámara de Diputados', icono: '/fuentes/diputados.png' },
    scjn: { clave: 'scjn', nombre: 'Suprema Corte de Justicia de la Nación', icono: '/fuentes/scjn.png' },
    corteidh: { clave: 'corteidh', nombre: 'Corte Interamericana de Derechos Humanos', icono: '/fuentes/corteidh.png' },
    congreso: { clave: 'congreso', nombre: 'Congreso de la Unión', icono: '/fuentes/senado.png' },
    congreso_estatal: { clave: 'congreso_estatal', nombre: 'Congreso del Estado', icono: '' },
    tratado: { clave: 'tratado', nombre: 'Tratados internacionales', icono: '/fuentes/senado.png' },
    otra: { clave: 'otra', nombre: 'Otras fuentes', icono: '' },
};

export function institucionDe(f: Partial<FuenteCita>): Institucion {
    const silo = (f.silo || '').toLowerCase();
    const origen = (f.origen || '').toLowerCase();
    const instancia = (f.instancia || '').toLowerCase();
    /* LA CORTE INTERAMERICANA, en todas sus formas: la Convención Americana,
       el Pacto de San José, los cuadernillos de jurisprudencia y los casos
       contenciosos («Caso Radilla Pacheco vs. México»). */
    if (/interamerican|corte ?idh|coidh|pacto de san jos|convenci[oó]n americana|cuadernillo|vs\.? m[eé]xico|serie c no/.test(origen)
        || /interamerican|corte ?idh/.test(instancia) || silo.includes('cidh') || silo.includes('corteidh')
        // `coidh` —la colección de sentencias al párrafo— no contiene «cidh».
        || esCoidh(f)) return INSTITUCIONES.corteidh;
    if (silo.includes('jurisprudencia') || silo.includes('sentencias_ef') || f.tesis_num || f.registro || /semanario|tesis|jurisprudencia/.test(origen)) return INSTITUCIONES.scjn;
    if (silo.includes('constitu') || /cpeum|constituci[oó]n pol[ií]tica/.test(origen)) return INSTITUCIONES.diputados;
    /* La Constitución la publica la Cámara de Diputados; los tratados los
       ratifica el Senado. David pidió los dos logos, y es lo honrado: el
       bloque de constitucionalidad son las dos cosas. */
    if (/tratado|convenci[oó]n|pacto|protocolo|declaraci[oó]n universal/.test(origen)) return INSTITUCIONES.congreso;
    if (silo.includes('bloque')) return INSTITUCIONES.diputados;
    if (silo.includes('federal') || silo.includes('codigo_nacional') || /c[oó]digo nacional|ley (federal|general|de amparo|org[aá]nica)|c[oó]digo .*federal/.test(origen)) return INSTITUCIONES.diputados;
    if (silo.includes('estatal') || silo.startsWith('leyes_')) { const e = (f.entidad || '').trim(); return e ? { ...INSTITUCIONES.congreso_estatal, nombre: `Congreso de ${e}` } : INSTITUCIONES.congreso_estatal; }
    if (silo.includes('sentencia') || silo.includes('precedente') || /tribunal colegiado|circuito/.test(origen)) return INSTITUCIONES.scjn;
    return INSTITUCIONES.otra;
}

/** Las instituciones consultadas en una respuesta, con SUS fuentes, en orden de peso.
 *  Devuelve los identificadores y no sólo la cuenta: el hilo despliega la lista
 *  de cada institución al oprimir su logo (David, 18-sep-2026). */
export function institucionesDe(
    meta: MetaCitas | null,
    /** Sólo estas fuentes (las citadas en la respuesta). Vacío = todas. */
    soloEstas?: Iterable<string>,
): { institucion: Institucion; fuentes: number; docIds: string[] }[] {
    const filtro = soloEstas ? new Set(Array.from(soloEstas, (x) => x.toLowerCase())) : null;
    const cuenta = new Map<string, { institucion: Institucion; fuentes: number; docIds: string[] }>();
    for (const [clave, f] of Object.entries(meta?.sources || {})) {
        if (filtro && !filtro.has(clave.toLowerCase())) continue;
        const inst = institucionDe(f);
        const grupo = inst.clave === 'congreso_estatal' ? inst.nombre : inst.clave;
        const previo = cuenta.get(grupo);
        if (previo) { previo.fuentes += 1; previo.docIds.push(clave); }
        else cuenta.set(grupo, { institucion: inst, fuentes: 1, docIds: [clave] });
    }
    return Array.from(cuenta.values()).sort((a, b) => b.fuentes - a.fuentes);
}

/* ═══ EL DOSSIER: todas las respuestas de la conversación en una hoja ═══
   David, 18-sep-2026: «en ese documento podrá volver a generar una consulta y
   se irá acumulando». Se convierte todo junto para que la numeración de las
   citas siga de una respuesta a la siguiente; el separador sobrevive al
   escapado y se vuelve una raya entre respuestas. */
export const SEP_DOSSIER = '⟦sep⟧';

export function htmlDeDossier(partes: string[]): { segmentos: string[]; orden: string[] } {
    if (!partes.length) return { segmentos: [], orden: [] };
    /* CADA RESPUESTA SE LIMPIA ANTES DE UNIRLAS. Con el texto ya unido, la
       lista de doctrina de la PRIMERA respuesta se movía al final del dossier
       —detrás de la última— porque `separarTarjetas` la lleva al final de lo
       que recibe. */
    const { html, orden } = htmlDeDocumento(partes.map(sinTrasfondo).join(`\n\n${SEP_DOSSIER}\n\n`));
    const segmentos = html.split(/<p>⟦sep⟧<\/p>/);
    while (segmentos.length < partes.length) segmentos.push('');
    return { segmentos, orden };
}

/** Los metadatos de cita de varias respuestas, unidos. */
export function metaDeDossier(partes: string[]): MetaCitas | null {
    let salida: MetaCitas | null = null;
    for (const parte of partes) {
        const m = metaDeCitas(parte);
        if (!m) continue;
        if (!salida) { salida = { valid: 0, invalid: 0, total: 0, invalid_ids: [], sources: {} }; }
        salida.valid += m.valid || 0;
        salida.invalid += m.invalid || 0;
        salida.total += m.total || 0;
        salida.invalid_ids.push(...(m.invalid_ids || []));
        Object.assign(salida.sources!, m.sources || {});
    }
    if (salida) {
        // Las verificadas se cuentan por fuente distinta: la misma tesis citada
        // en dos respuestas es una fuente, no dos.
        const invalidas = new Set(salida.invalid_ids.map((x) => x.toLowerCase()));
        const claves = Object.keys(salida.sources!).map((k) => k.toLowerCase());
        salida.total = claves.length;
        salida.invalid = claves.filter((k) => invalidas.has(k)).length;
        salida.valid = salida.total - salida.invalid;
    }
    return salida;
}
