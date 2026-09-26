/**
 * LA RESPUESTA DEL CHAT, DEL TEXTO QUE LLEGA AL HTML QUE SE PINTA.
 *
 * Vivía dentro de `ChatMessage.tsx`; aquí son funciones puras —ni React ni
 * navegador— para poder medirlas en Node.
 *
 * TIEMPO LINEAL POR CONSTRUCCIÓN (26-sep-2026). Todo esto corre con cada
 * trozo del stream y en cada pintado, sobre texto del modelo, así que una
 * expresión que se vuelva cuadrática con una racha de saltos o de corchetes
 * congela la pestaña. Había varias: `\n*<!--…-->` volvía a recorrer una racha
 * de saltos desde cada uno de ellos (100.000 saltos, 6 s); el enlace
 * `\[([^\]\n]+)\]\(` recorría el renglón desde cada «[» sin cierre (100.000
 * caracteres de «[x», 2 s); `\[[^\]]*,\s*uuid` de la exportación, desde cada
 * «[» (100.000 «[», 9 s). Se
 * siguen las reglas de `@/lib/idsDeCita` —topes, anclas o un escáner con
 * `indexOf`— y cada escáner dice qué expresión sustituye: devuelve lo mismo
 * que ella. `comprobaciones/redos_pintado.mjs` lo mide y lo compara.
 */

import { UUID_CITA, expandirCitasAgrupadas, numerarCitasDelChat, quitarBloques, sinComentarios } from '@/lib/idsDeCita';
import type { CamposCoidh } from '@/lib/coidh';
import type { CamposDoctrina } from '@/lib/doctrina';
import type { CamposVigencia } from '@/lib/vigencia';

const esBlanco = (c: string | undefined) => c !== undefined && /\s/.test(c);
/** Lo que termina un renglón para `.` y `$`. */
const esFinDeRenglon = (c: string | undefined) => c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029';

/** Dónde está el primer bloque `abre…cierra` (el primer `cierra` tras `abre`),
 *  como `t.match(/abre([\s\S]*?)cierra/)`, o null. */
function primerBloque(t: string, abre: string, cierra: string): { inicio: number; dentro: number; cierre: number } | null {
    const a = t.indexOf(abre);
    if (a === -1) return null;
    const c = t.indexOf(cierra, a + abre.length);
    return c === -1 ? null : { inicio: a, dentro: a + abre.length, cierre: c };
}

/**
 * Quita, en una pasada, lo que casaba `\n*abre[\s\S]*?cierra\n*` con la
 * bandera `g` —los saltos de delante o de detrás, según se pida—. Si una
 * apertura no tiene cierre, ninguna de las de después lo tiene. Los saltos de
 * delante sólo llegan hasta donde acabó el bloque anterior, como en la
 * expresión.
 */
function quitarMarcador(t: string, abre: string, cierra: string, saltos: { delante?: boolean; detras?: boolean }): string {
    let out = '';
    let i = 0;
    for (;;) {
        const a = t.indexOf(abre, i);
        if (a === -1) break;
        const c = t.indexOf(cierra, a + abre.length);
        if (c === -1) break;
        let desde = a;
        if (saltos.delante) while (desde > i && t[desde - 1] === '\n') desde--;
        let hasta = c + cierra.length;
        if (saltos.detras) while (t[hasta] === '\n') hasta++;
        out += t.slice(i, desde);
        i = hasta;
    }
    return out + t.slice(i);
}

/**
 * `t.replace(/abre[^paradas]*cierre/g, por)`, con `cierre` entre las
 * `paradas` y `abre` sin ninguna (bandera `g`). Lo de dentro llega hasta la
 * primera parada; si ésa no es el cierre, tampoco casa ninguna apertura de
 * las que hay antes de ella, que llegarían a la misma: se sigue desde ahí.
 */
function quitarHastaLaParada(t: string, abre: RegExp, paradas: string, cierre: string, por = ''): string {
    let out = '';
    let i = 0;
    let desde = 0;
    for (;;) {
        abre.lastIndex = desde;
        const m = abre.exec(t);
        if (!m) break;
        let k = m.index + m[0].length;
        while (k < t.length && !paradas.includes(t[k])) k++;
        if (k === t.length) break;
        if (t[k] === cierre) {
            out += t.slice(i, m.index) + por;
            i = k + 1;
        }
        desde = k + 1;
    }
    return out + t.slice(i);
}

// Filter out document content from user messages (content between markers is hidden)
// For AUDITAR_SENTENCIA, show a compact card with file info
/**
 * Marcadores internos que viajan DENTRO del mensaje del usuario y que jamás
 * deben verse en pantalla: [MODO_FLASH], [MODO_REDACCION_*],
 * [MODO_PRECEDENTES] con sus [CORTE:]/[SALA:]/[CIRCUITO:]/[TRIBUNAL:].
 * En producción se llegó a ver «[MODO_FLASH] ¿qué artículos…» en el historial.
 */
export function limpiarMarcadoresInternos(content: string): string {
    return content.replace(/^(?:\s*\[[A-Z_]+(?::[^\]]*)?\])+\s*/g, '').trim();
}

export function filterDocumentContent(content: string): string {
    // Check if this is a sentencia audit message
    if (content.includes('[AUDITAR_SENTENCIA]')) {
        // Extract file name from the header
        const fileNameMatch = content.match(/Archivo:\s*(.+)/);
        const fileName = fileNameMatch ? fileNameMatch[1].trim() : 'Sentencia';

        // Determine file type from extension
        const extension = fileName.split('.').pop()?.toLowerCase() || 'txt';
        const typeLabel = extension === 'pdf' ? 'PDF' :
            extension === 'docx' ? 'DOCX' :
                extension === 'doc' ? 'DOC' : 'TXT';

        // Return a compact card HTML instead of the full text
        return `📄 Documento adjunto: ${fileName} (${typeLabel})`;
    }

    // Remove content between <!-- DOCUMENTO_INICIO --> and <!-- DOCUMENTO_FIN -->
    const filtered = quitarBloques(content, /<!-- DOCUMENTO_INICIO -->/g, '<!-- DOCUMENTO_FIN -->');

    // Remove content between <!-- SENTENCIA_INICIO --> and <!-- SENTENCIA_FIN -->
    const sentenciaFiltered = quitarBloques(filtered, /<!-- SENTENCIA_INICIO -->/g, '<!-- SENTENCIA_FIN -->');

    // Also handle the legacy format
    const legacyFiltered = sentenciaFiltered.replace(/---CONTENIDO DEL DOCUMENTO---[\s\S]*/g, '');

    // Clean up the [AUDITAR_SENTENCIA] header and metadata lines
    const cleanedContent = legacyFiltered
        .replace(/\[AUDITAR_SENTENCIA\]/g, '')
        .replace(/Archivo:.*$/gm, '')
        .replace(/Estado:.*$/gm, '');

    // Clean up any extra whitespace
    return cleanedContent.trim();
}

/** Una fuente tal como llega en `FUENTES_PREVIAS` / `CITATION_META`. Las de
 *  la Corte IDH traen además caso, párrafo, página y ancla (`@/lib/coidh`);
 *  las de doctrina, obra, autor, página y ancla (`@/lib/doctrina`); las
 *  tesis que perdieron vigencia, `vigencia` (`@/lib/vigencia`). */
export type FuenteMarcador = { origen: string; ref: string; texto: string; pdf_url?: string | null; silo?: string; entidad?: string | null; registro?: string | null; tesis_num?: string | null; tipo_criterio?: string | null; instancia?: string | null; materia?: string | null } & CamposCoidh & CamposDoctrina & CamposVigencia;

/** El mapa de citas que el servidor manda al final (`CITATION_META`). */
export type MetaDelServidor = { valid: number; invalid: number; total: number; invalid_ids: string[]; sources?: Record<string, FuenteMarcador> };

export type PrecedenteMeta = { id: string; holding: string; ref: string; origen: string; score: number; silo: string; pdf_url?: string | null };

/** El texto de la respuesta, sin marcadores y con las citas numeradas; lo
 *  que traían los marcadores, aparte. */
export function procesarRespuesta(contenido: string) {
    let content = contenido;

    // Extract thinking content (chain-of-thought from thinking mode)
    let thinking = '';
    const razonamiento = primerBloque(content, '<!--THINKING_START-->', '<!--THINKING_END-->');
    if (razonamiento) {
        thinking = content.slice(razonamiento.dentro, razonamiento.cierre);
        content = (content.slice(0, razonamiento.inicio) + content.slice(razonamiento.cierre + '<!--THINKING_END-->'.length)).trim();
    } else if (content.includes('<!--THINKING_START-->')) {
        // El razonamiento aún está llegando y su marcador de cierre no ha
        // aparecido. Sin esto, el texto del razonamiento —y el marcador—
        // se pintarían crudos en la burbuja mientras dura la espera.
        const inicio = content.indexOf('<!--THINKING_START-->');
        thinking = content.slice(inicio + '<!--THINKING_START-->'.length);
        content = content.slice(0, inicio).trim();
    }

    // Determine if DeepSeek synthesis is happening
    let isSynthesizing = false;
    if (content.includes('<!--SYNTHESIS:START-->')) {
        isSynthesizing = !content.includes('<!--SYNTHESIS:END-->');
        // Clean up synthesis markers AND the "Consultando a los genios..." text that might be inside
        content = quitarBloques(content, /<!--SYNTHESIS:START-->/g, '<!--SYNTHESIS:END-->');
        // Also clean up dangling start markers if it's still streaming
        const colgado = content.indexOf('<!--SYNTHESIS:START-->');
        if (colgado !== -1) content = content.slice(0, colgado);
    }

    // LAS CITAS, NUMERADAS POR ORDEN DE PRIMERA APARICIÓN (26-sep-2026).
    // Antes aquí había dos pasos con sus propias expresiones y el segundo
    // BORRABA los corchetes plurales —«[Doc IDs: a; b]»— con las citas
    // dentro. Ahora vive en `@/lib/idsDeCita`, que primero abre lo agrupado
    // en citas singulares y después numera: [25][26], nunca «Doc IDs».
    const numeradas = numerarCitasDelChat(content);
    content = numeradas.content;
    const docIdMap = numeradas.docIdMap;

    // Remove any "## ⚖️ Análisis Legal" or "## ⚖️ Respuesta Legal" headers completely
    // (These are redundant - the user already knows this is a legal response from Iurexia)
    content = content.replace(/^---\s*$/gm, ''); // Remove standalone dashes
    content = content.replace(/##\s*⚖️?\s*(Análisis|Respuesta) Legal/gi, '');

    // Clean up leading whitespace/newlines left after removing headers
    content = content.replace(/^\s+/, '').trim();

    // Parse and strip <!-- CITATION_META:{...} --> from content
    let citationMeta: MetaDelServidor | null = null;
    const metaMatch = primerBloque(content, '<!-- CITATION_META:{', '} -->');
    if (metaMatch) {
        try {
            citationMeta = JSON.parse(content.slice(metaMatch.dentro - 1, metaMatch.cierre + 1));
        } catch { /* ignore parse errors */ }
        content = quitarMarcador(content, '<!-- CITATION_META:{', '} -->', { delante: true }).trim();
    }

    // LAS FUENTES QUE LLEGAN ANTES DE ESCRIBIR (3-sep-2026).
    //
    // `CITATION_META` viaja al final del stream. Durante los treinta o
    // cuarenta segundos que tarda la respuesta, las citas estaban pintadas
    // pero vacías por dentro: el abogado pulsaba [4] y se abría un panel
    // sin nada. Tenía que esperar a que terminara todo para cotejar la
    // primera línea, que es justo cuando ya no le hace falta.
    //
    // El backend manda ahora `FUENTES_PREVIAS` en cuanto recupera, antes de
    // generar. Sirve de respaldo mientras dura el stream y el mapa final lo
    // sustituye al cerrar, porque ése trae el texto íntegro y los alias de
    // las citas reparadas.
    const previasMatch = primerBloque(content, '<!-- FUENTES_PREVIAS:{', '} -->');
    if (previasMatch) {
        try {
            const previas = JSON.parse(content.slice(previasMatch.dentro - 1, previasMatch.cierre + 1));
            citationMeta = citationMeta
                ? { ...citationMeta, sources: { ...previas, ...(citationMeta.sources || {}) } }
                : { valid: 0, invalid: 0, total: 0, invalid_ids: [], sources: previas };
        } catch { /* si no parsea, se sigue esperando al mapa final */ }
        content = quitarMarcador(content, '<!-- FUENTES_PREVIAS:{', '} -->', { delante: true, detras: true }).trim();
    }

    // La marca de cuenta en pausa se quita aquí para que nunca se vea como
    // texto; quien la pinta es el propio componente, más abajo.
    // Los saltos de delante, desde el primero de la racha (`(?<!\n)`): sin eso
    // la búsqueda empezaba en cada salto y recorría otra vez la racha.
    content = content.replace(/(?<!\n)\n*<!--\s*SUSCRIPCION_SUSPENDIDA\s*-->/g, '').trim();

    // Parse and strip <!-- PRECEDENTES_META:[...] --> from content
    let precedentesMeta: PrecedenteMeta[] | null = null;
    const precMatch = primerBloque(content, '<!-- PRECEDENTES_META:[', '] -->');
    if (precMatch) {
        try {
            precedentesMeta = JSON.parse(content.slice(precMatch.dentro - 1, precMatch.cierre + 1));
        } catch { /* ignore parse errors */ }
        content = quitarMarcador(content, '<!-- PRECEDENTES_META:[', '] -->', { delante: true }).trim();
    }

    // ── Inject precedentes as clickable HTML into response content (before CONCLUSIÓN) ──
    if (precedentesMeta && precedentesMeta.length > 0) {
        const cards: string[] = [];
        for (let pi = 0; pi < precedentesMeta.length; pi++) {
            const prec = precedentesMeta[pi];
            // Clean ref: filter out "Null" parts from "3TCC · AD-892/2022 · Null · 2022"
            // Fallback: if ref is empty, use origen for a readable label
            let rawRef = prec.ref || '';
            if (!rawRef || rawRef === prec.id) {
                // Use origen as fallback — e.g. "TCC_PENAL — 22° Circuito — Penal"
                rawRef = prec.origen || 'Sentencia';
            }
            const cleanRef = rawRef.split(' · ').filter(p => p && p !== 'Null' && p !== 'null').join(' · ');
            // Parse materia from origen
            const materiaMatch = prec.origen?.match(/—\s*([A-ZÁÉÍÓÚ]+)\s*$/);
            const materia = materiaMatch?.[1] || '';
            const holdingPreview = prec.holding
                ? (prec.holding.length > 250 ? prec.holding.slice(0, 250) + '...' : prec.holding)
                : '';
            cards.push(
                '<div class="precedente-card" data-prec-idx="' + pi + '">' +
                '<div class="precedente-ref"><span>' + cleanRef + '</span>' +
                (materia ? '<span class="precedente-materia">' + materia + '</span>' : '') +
                '</div>' +
                (holdingPreview ? '<p class="precedente-holding">"' + holdingPreview.replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"</p>' : '') +
                '<span class="precedente-ver">Ver sentencia completa →</span>' +
                '</div>'
            );
        }

        // Misma gramática que las demás secciones de la respuesta: cabecera
        // de sección con barra dorada, no un h3 con estilos propios.
        const section = '\n\n<hr class="section-divider-light" />\n' +
            cabeceraSeccion('PRECEDENTES SCJN Y DE COLEGIADOS DE CIRCUITO') + '\n' +
            '<p class="precedentes-nota">Los siguientes precedentes de la Suprema Corte y Tribunales Colegiados de Circuito están relacionados con su consulta:</p>\n' +
            cards.join('\n') + '\n';

        // Try to insert before ### CONCLUSIÓN (case-insensitive)
        const conclusionRegex = /\n(#{1,3}\s*(CONCLUSI[ÓO]N|Conclusi[óo]n))/i;
        const conclusionMatch = content.match(conclusionRegex);
        if (conclusionMatch && conclusionMatch.index !== undefined) {
            content = content.slice(0, conclusionMatch.index) + section + content.slice(conclusionMatch.index);
        } else {
            content = content + section;
        }
    }

    return { processedContent: content, docIdMap, thinkingContent: thinking, citationMeta, isSynthesizing, precedentesMeta };
}

/**
 * Cada «[…, uuid]» cambiado por `por(uuid)`: lo que hacía
 * `t.replace(/\[[^\]]*,\s*(uuid)\s*\]/gi, …)`. Esa expresión volvía a recorrer
 * hasta el siguiente «]» desde cada «[» (con «[» repetidos, cuadrático). Aquí
 * se mira cada tramo entre «]» una vez: lo que casa acaba en el «]» del tramo,
 * así que se lee hacia atrás —blancos, el uuid, blancos y la coma— y empieza
 * en la primera «[» del tramo, que tiene que ir antes de la coma.
 */
const RX_UUID_ENTERO = new RegExp(`^${UUID_CITA}$`);
function citaTrasComa(t: string, por: (uuid: string) => string): string {
    let out = '';
    let i = 0;
    let desde = 0;
    for (;;) {
        const a = t.indexOf('[', desde);
        if (a === -1) break;
        const e = t.indexOf(']', a + 1);
        if (e === -1) break;
        desde = e + 1;
        let fin = e;
        while (fin > a + 1 && esBlanco(t[fin - 1])) fin--;
        const u = fin - 36;
        if (u < a + 2 || !RX_UUID_ENTERO.test(t.slice(u, fin))) continue;
        let coma = u;
        while (coma > a + 1 && esBlanco(t[coma - 1])) coma--;
        if (coma - 1 <= a || t[coma - 1] !== ',') continue;
        out += t.slice(i, a) + por(t.slice(u, fin));
        i = e + 1;
    }
    return out + t.slice(i);
}

/** Sin ningún artefacto de las citas: la prosa que va al PDF y al Word. */
export function limpiarParaExportar(raw: string, docIdMap: Map<string, number>): string {
    let clean = raw;

    // 0. El RAZONAMIENTO, antes que los comentarios. El paso 1 borraba los
    // marcadores THINKING_START/END y dejaba su contenido —el análisis
    // interno del modelo, en inglés— delante del escrito; el paso 9, que
    // debía quitarlo, ya no encontraba nada. Un bloque abierto sin cierre
    // se descarta hasta el final.
    clean = clean.replace(/<!--THINKING_START-->[\s\S]*?(?:<!--THINKING_END-->|$)/g, '');
    clean = clean.replace(/<!--thinking-->[\s\S]*?(?:<!--\/thinking-->|$)/g, '');

    // 1. Fuera TODOS los comentarios HTML, no sólo los que se conocían.
    //
    // Antes se listaban uno a uno —CITATION_META, PRECEDENTES_META— y al
    // añadir FUENTES_PREVIAS al stream nadie tocó esta función: el marcador
    // acabó impreso dentro del Word que descarga el abogado, con su JSON a
    // la vista en la primera página. Enumerar marcadores es una lista que
    // se queda corta cada vez que se añade uno; quitarlos todos no.
    clean = sinComentarios(clean);

    // 1b. Lo agrupado —«[Doc IDs: a; b]»— se abre en citas singulares, igual
    // que en la burbuja: si no, el paso 2b lo borraba y el Word perdía esas
    // citas y sus referencias (`@/lib/idsDeCita`).
    clean = expandirCitasAgrupadas(clean);

    // 2. Replace [Doc ID: uuid] with bracketed citation number ⟦N⟧ using docIdMap.
    // Using ⟦⟧ as sentinel so downstream cleanup doesn't strip them.
    const replaceWithCitNum = (uuid: string): string => {
        const num = docIdMap.get(uuid.toLowerCase());
        return num ? `⟦${num}⟧` : '';
    };
    clean = clean.replace(/\[Doc ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/gi, (_, u) => replaceWithCitNum(u));
    // `\[\s*,?\s*` repartía una racha de espacios entre los dos `\s*`: el
    // blanco tras la coma va dentro de su opcional.
    clean = clean.replace(/\[\s*(?:,\s*)?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\]/gi, (_, u) => replaceWithCitNum(u));
    clean = citaTrasComa(clean, replaceWithCitNum);
    clean = clean.replace(/Doc\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (_, u) => replaceWithCitNum(u));
    clean = clean.replace(/\(Doc ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\)/gi, (_, u) => replaceWithCitNum(u));

    // 2b. Remove any remaining Doc ID variants that didn't match a known UUID
    clean = clean.replace(/\[Doc ID:\s*[a-f0-9-]+\]/gi, '');
    // Sin cruzar renglones ni números ya puestos (⟦N⟧): un corchete con
    // etiqueta sin cerrar se llevaba el renglón siguiente y sus citas.
    clean = quitarHastaLaParada(clean, /\[Doc IDs?:/gi, ']\n⟦', ']');

    // 4. Remove standalone Doc uuid references
    clean = clean.replace(/Doc\s+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '');

    // 5. Remove parenthetical (Doc ID: xxx) references
    clean = clean.replace(/\(Doc ID:\s*[a-f0-9-]+\)/gi, '');

    // 6. Remove standalone UUIDs (36-char hex with dashes) that aren't part of URLs
    clean = clean.replace(/(?<![\/a-f0-9])[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\/a-f0-9])/gi, '');

    // 7. Remove partial UUID fragments like [-985d-5043-8e4e-b43aaee99c66]
    clean = clean.replace(/\[-[a-f0-9-]{10,35}\]/gi, '');

    // 8. Remove leftover "Doc ID:" text
    clean = clean.replace(/Doc ID:\s*[a-f0-9-]*/gi, '');

    // 9. Remove <!-- THINKING_START/END --> blocks
    clean = quitarBloques(clean, /<!--THINKING_START-->/g, '<!--THINKING_END-->');

    // 10. Remove <!--PING--> and <!--CACHE:ACTIVE--> markers
    clean = clean.replace(/<!--\s*PING\s*-->/g, '');
    clean = clean.replace(/<!--\s*CACHE:\w+\s*-->/g, '');

    // 11. Remove <!-- SYNTHESIS --> markers
    clean = clean.replace(/<!--SYNTHESIS:\w+-->/g, '');

    // 11b. LAS TARJETAS QUE LLEGAN EN HTML.
    //
    // El backend adjunta al final de la respuesta la tarjeta de doctrina
    // consultada como HTML —doctrina.py, bloque_doctrina_html—. En pantalla
    // se pinta bien, pero el exportador a Word escapa lo que no entiende, y
    // el abogado se encontraba «&lt;/div&gt;&lt;/div&gt;» impreso al final
    // de su demanda. Mismo tipo de fallo que el marcador FUENTES_PREVIAS
    // que ya se coló una vez: algo que el chat entiende y el .docx no.
    //
    // No se borra el bloque —la referencia doctrinal es útil en el
    // documento— sino sus etiquetas: queda el texto, que es lo que el
    // abogado necesita leer.
    clean = clean.replace(/<br\s*\/?>/gi, '\n');
    clean = clean.replace(/<\/(div|p|li)>/gi, '\n');
    clean = quitarHastaLaParada(clean, /<\/?(?:div|span|a|ul|ol|li|p|section|figure)\b/gi, '>', '>', ' ');
    clean = clean.replace(/&#8599;|&nbsp;|&#160;/g, ' ');
    clean = clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // 12. Clean up double spaces and excessive blank lines left by removals
    clean = clean.replace(/  +/g, ' ');
    clean = clean.replace(/\n{3,}/g, '\n\n');
    clean = clean.replace(/\(\s*\)/g, ''); // empty parentheses
    clean = clean.replace(/\[\s*\]/g, '');  // empty brackets

    return clean.trim();
}

/** Lo que se lleva al portapapeles: sin marcadores ni identificadores. */
export function textoParaCopiar(contenido: string): string {
    // Fuera TODOS los comentarios HTML (CITATION_META incluido), con escáner.
    const sinMarcas = sinComentarios(expandirCitasAgrupadas(contenido))
        .replace(/---CONTENIDO DEL DOCUMENTO---[\s\S]*/g, '')
        .replace(/\[AUDITAR_SENTENCIA\]/g, '')
        .replace(/\[Doc\s*ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi, '')
        .replace(/(?<!")([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?!")/gi, '');
    // `\[SCJN_BUSCAR:\s*[^\]]*\]`: hasta el primer «]».
    return quitarBloques(sinMarcas, /\[SCJN_BUSCAR:/g, ']').trim();
}

/**
 * «> *Fuente: …*» → `<p class="fuente-cita">`: lo que hacía
 * `t.replace(/^> \*?Fuente:\s*(.*?)\*?\s*$/gmi, '<p class="fuente-cita">Fuente: $1</p>')`.
 * Con el `(.*?)` perezoso seguido de `\*?\s*$`, cada carácter de una racha de
 * blancos a mitad del renglón volvía a recorrer la racha (cuadrático). Se
 * conserva lo que casaba, rarezas incluidas:
 *   · tras «Fuente:», `\s*` salta TODOS los blancos, saltos incluidos;
 *   · el texto es el resto de ESE renglón sin los blancos del final ni el «*»
 *     que quede delante de ellos;
 *   · la coincidencia se come además los blancos que siguen hasta el último
 *     fin de renglón que haya entre ellos (o hasta el final): «…*⏎⏎Sigue»
 *     queda en «</p>⏎Sigue», con un solo salto.
 */
const RX_FUENTE = /^> \*?Fuente:/gmi;
function parrafosDeFuente(t: string): string {
    let out = '';
    let i = 0;
    RX_FUENTE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RX_FUENTE.exec(t))) {
        let a = m.index + m[0].length;
        while (esBlanco(t[a])) a++;
        let finRenglon = a;
        while (finRenglon < t.length && !esFinDeRenglon(t[finRenglon])) finRenglon++;
        let k = finRenglon;
        while (k > a && esBlanco(t[k - 1])) k--;
        if (k > a && t[k - 1] === '*') k--;
        // Lo que se come después: el «*», los blancos, y se para en el último
        // fin de renglón de esos blancos (o en el final del texto).
        const s0 = t[k] === '*' ? k + 1 : k;
        let j = s0;
        while (esBlanco(t[j])) j++;
        let fin = t.length;
        if (j < t.length) {
            fin = j - 1;
            while (!esFinDeRenglon(t[fin])) fin--;
        }
        out += t.slice(i, m.index) + `<p class="fuente-cita">Fuente: ${t.slice(a, k)}</p>`;
        i = fin;
        RX_FUENTE.lastIndex = fin;
    }
    return out + t.slice(i);
}

/**
 * `[texto](http…)` → enlace: lo que hacía
 * `t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" …>$1</a>')`.
 * Esa expresión recorría hasta el siguiente «]» o salto desde CADA «[» (un
 * renglón de «[x» repetido, 2 s con 100.000 caracteres). Todas las «[» de
 * antes de ese «]» o salto llegan a él: si la primera no casa, ninguna. Y la
 * dirección, `[^\s)]+`, acaba en el mismo blanco o «)» desde cualquier punto
 * de una misma racha: se recuerda hasta dónde se midió.
 */
function enlaces(t: string): string {
    let out = '';
    let i = 0;
    let desde = 0;
    let medidaDesde = -1;
    let medidaHasta = -1;
    for (;;) {
        const a = t.indexOf('[', desde);
        if (a === -1) break;
        let e = a + 1;
        while (e < t.length && t[e] !== ']' && t[e] !== '\n') e++;
        desde = e;
        if (e === a + 1 || t[e] !== ']' || t[e + 1] !== '(') continue;
        const url = e + 2;
        const esquema = t.startsWith('https://', url) ? 8 : t.startsWith('http://', url) ? 7 : 0;
        if (!esquema) continue;
        const u = url + esquema;
        let v: number;
        if (u >= medidaDesde && u <= medidaHasta) v = medidaHasta;
        else {
            v = u;
            while (v < t.length && t[v] !== ')' && !esBlanco(t[v])) v++;
            medidaDesde = u;
            medidaHasta = v;
        }
        if (v === u || t[v] !== ')') continue;
        out += t.slice(i, a) + `<a href="${t.slice(url, v)}" target="_blank" rel="noopener noreferrer" class="enlace-externo">${t.slice(a + 1, e)}</a>`;
        i = v + 1;
        desde = v + 1;
    }
    return out + t.slice(i);
}

/**
 * Simple markdown to HTML converter for legal responses
 */
/** La cabecera de sección de Iurexia: barra dorada, versalitas y dos tonos
 *  partidos en el primer « Y » (como «Iurex» + «ia» en el logo). Es la única
 *  gramática de título de la respuesta: todo «##» pasa por aquí. */
export function cabeceraSeccion(titulo: string): string {
    const t = titulo.trim();
    const yIdx = t.indexOf(' Y ');
    // Los dos tonos van dentro de UN solo hijo del flex: sueltos, cada span
    // era una columna y «MARCO CONSTITUCIONAL Y DERECHOS HUMANOS» se partía
    // en dos bloques lado a lado en vez de fluir como una línea de texto.
    const texto = yIdx !== -1
        ? `<span class="section-primary">${t.slice(0, yIdx)}</span><span class="section-secondary">${t.slice(yIdx)}</span>`
        : `<span class="section-primary">${t}</span>`;
    return `<div class="iurexia-section-header"><span class="section-texto">${texto}</span></div>`;
}

const ORGANIGRAMA_NODOS = 500;
const ORGANIGRAMA_NIVELES = 40;

export function formatMarkdown(text: string): string {
    // STEP 0: Strip any [SCJN_BUSCAR: ...] markers (feature removed)
    // (`\[SCJN_BUSCAR:\s*[^\]]*\]`: hasta el primer «]»)
    let processed = quitarBloques(text, /\[SCJN_BUSCAR:/g, ']');

    // STEP 1: Parse markdown tables BEFORE other transforms
    // Handles BOTH standard pipe tables (|) AND Unicode box-drawing tables (┌─┬─┐ │ ├ └)
    const lines = processed.split('\n');
    const outputLines: string[] = [];
    let i = 0;

    // Helper: detect if a line is part of a Unicode box-drawing table
    const isUnicodeTableLine = (line: string) =>
        /[┌┐└┘├┤┬┴┼─│║═╔╗╚╝╠╣╦╩╬]/.test(line);

    // Helper: detect if line is a box-drawing border (no data)
    const isUnicodeBorder = (line: string) =>
        /^[\s┌┐└┘├┤┬┴┼─═╔╗╚╝╠╣╦╩╬]+$/.test(line.trim());

    // Helper: extract cells from a Unicode table row (│ cell │ cell │)
    const parseUnicodeCells = (row: string): string[] => {
        // Split by │ or ║ and filter empty border pieces
        return row.split(/[│║]/)
            .map(c => c.trim())
            .filter(c => c.length > 0 && !/^[\s─═┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬]+$/.test(c));
    };

    while (i < lines.length) {
        const line = lines[i].trim();

        // === CASE A: Standard Markdown pipe table ===
        if (line.startsWith('|') && line.endsWith('|') && line.split('|').length >= 3) {
            const tableLines: string[] = [];
            while (i < lines.length) {
                const tl = lines[i].trim();
                if (tl.startsWith('|') && tl.includes('|')) {
                    tableLines.push(tl);
                    i++;
                } else {
                    break;
                }
            }

            if (tableLines.length >= 2) {
                const parseCells = (row: string) =>
                    row.split('|').slice(1, -1).map(c => c.trim());

                const headerCells = parseCells(tableLines[0]);
                const isSeparator = /^[\s|:-]+$/.test(tableLines[1]);
                const dataStart = isSeparator ? 2 : 1;

                let tableHtml = '<div class="table-wrapper"><table class="md-table">';
                tableHtml += '<thead><tr>';
                headerCells.forEach(cell => { tableHtml += `<th>${cell}</th>`; });
                tableHtml += '</tr></thead><tbody>';
                for (let r = dataStart; r < tableLines.length; r++) {
                    const cells = parseCells(tableLines[r]);
                    tableHtml += '<tr>';
                    cells.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table></div>';
                outputLines.push(tableHtml);
            } else {
                tableLines.forEach(l => outputLines.push(l));
            }

            // === CASE B: Unicode box-drawing table ===
        } else if (isUnicodeTableLine(line) && (line.includes('│') || line.includes('┌') || line.includes('╔'))) {
            const tableLines: string[] = [];
            while (i < lines.length) {
                const tl = lines[i].trim();
                if (isUnicodeTableLine(tl) || tl === '') {
                    if (tl === '' && tableLines.length > 0) {
                        // Empty line might end the table
                        break;
                    }
                    tableLines.push(tl);
                    i++;
                } else {
                    break;
                }
            }

            // Filter: separate data rows from border rows
            const dataRows = tableLines.filter(l => !isUnicodeBorder(l) && l.includes('│'));

            if (dataRows.length >= 2) {
                let tableHtml = '<div class="table-wrapper"><table class="md-table">';

                // First data row = header
                const headerCells = parseUnicodeCells(dataRows[0]);
                tableHtml += '<thead><tr>';
                headerCells.forEach(cell => { tableHtml += `<th>${cell}</th>`; });
                tableHtml += '</tr></thead><tbody>';

                // Rest = data
                for (let r = 1; r < dataRows.length; r++) {
                    const cells = parseUnicodeCells(dataRows[r]);
                    tableHtml += '<tr>';
                    cells.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table></div>';
                outputLines.push(tableHtml);
            } else {
                // Not enough data rows, push original lines
                tableLines.forEach(l => outputLines.push(l));
            }

            // === CASE C: Orgchart block (:::orgchart ... :::) ===
        } else if (line === ':::orgchart') {
            const blockLines: string[] = [];
            i++; // skip opening :::orgchart
            while (i < lines.length) {
                const bl = lines[i].trim();
                if (bl === ':::') { i++; break; }
                blockLines.push(bl);
                i++;
            }

            // Parse orgchart
            let titulo = '';
            const edges: { parent: string; children: string[] }[] = [];
            const allNodes = new Set<string>();
            const childNodes = new Set<string>();

            for (const bl of blockLines) {
                if (bl.toLowerCase().startsWith('titulo:')) {
                    titulo = bl.substring(bl.indexOf(':') + 1).trim();
                } else if (bl.includes('->')) {
                    const [parentPart, childrenPart] = bl.split('->').map(s => s.trim());
                    const parent = parentPart.replace(/^\[|\]$/g, '').trim();
                    const children = childrenPart.split(',').map(c => c.trim().replace(/^\[|\]$/g, '').trim()).filter(c => c);
                    if (parent && children.length > 0) {
                        edges.push({ parent, children });
                        allNodes.add(parent);
                        children.forEach(c => { allNodes.add(c); childNodes.add(c); });
                    }
                }
            }

            // Build tree HTML
            let html = `<div class="iurexia-orgchart">`;
            if (titulo) html += `<div class="orgchart-title">${titulo}</div>`;
            html += `<div class="orgchart-tree">`;

            // Find roots (nodes that are never children)
            const roots = Array.from(allNodes).filter(n => !childNodes.has(n));
            if (roots.length === 0 && allNodes.size > 0) roots.push(Array.from(allNodes)[0]);

            // Recursive HTML builder. CON TOPE (26-sep-2026): un ciclo —«a ->
            // b», «b -> a»— recursaba hasta reventar la pila, una cadena de
            // miles de niveles también, y los rombos —«a -> b, c», «b -> d»,
            // «c -> d», …— doblaban el árbol en cada nivel. Un nodo que ya
            // está en su propia rama se pinta sin hijos, y pasados
            // ORGANIGRAMA_NODOS nodos u ORGANIGRAMA_NIVELES niveles no se baja
            // más: un organigrama de verdad no llega a ninguno de los dos.
            const hijosDe = new Map<string, string[]>();
            for (const e of edges) if (!hijosDe.has(e.parent)) hijosDe.set(e.parent, e.children);   // el primero, como `edges.find`
            const rama = new Set<string>();
            let quedan = ORGANIGRAMA_NODOS;
            const buildNodeHtml = (nodeName: string, isRoot: boolean): string => {
                quedan--;
                const children = hijosDe.get(nodeName);
                let nodeHtml = `<div class="orgchart-node-group">`;
                nodeHtml += `<div class="orgchart-node${isRoot ? ' root-node' : ''}">${nodeName}</div>`;
                if (children && children.length > 0 && !rama.has(nodeName) && quedan > 0 && rama.size < ORGANIGRAMA_NIVELES) {
                    rama.add(nodeName);
                    nodeHtml += `<div class="orgchart-connector"></div>`;
                    nodeHtml += `<div class="orgchart-level">`;
                    for (const child of children) {
                        if (quedan <= 0) break;
                        nodeHtml += `<div class="orgchart-node-group">`;
                        nodeHtml += `<div class="orgchart-vline"></div>`;
                        nodeHtml += buildNodeHtml(child, false);
                        nodeHtml += `</div>`;
                    }
                    nodeHtml += `</div>`;
                    rama.delete(nodeName);
                }
                nodeHtml += `</div>`;
                return nodeHtml;
            };

            roots.forEach(root => { html += buildNodeHtml(root, true); });
            html += `</div></div>`;
            outputLines.push(html);

            // === CASE D: Processflow block (:::processflow ... :::) ===
        } else if (line === ':::processflow') {
            const blockLines: string[] = [];
            i++; // skip opening :::processflow
            while (i < lines.length) {
                const bl = lines[i].trim();
                if (bl === ':::') { i++; break; }
                blockLines.push(bl);
                i++;
            }

            // Parse process flow
            let titulo = '';
            const steps: { num: string; title: string; desc: string; timing: string }[] = [];

            for (const bl of blockLines) {
                if (bl.toLowerCase().startsWith('titulo:')) {
                    titulo = bl.substring(bl.indexOf(':') + 1).trim();
                } else {
                    // Parse: "1. Title | Description | Timing"
                    const stepMatch = bl.match(/^(\d+)\.\s*(.+)/);
                    if (stepMatch) {
                        const num = stepMatch[1];
                        const parts = stepMatch[2].split('|').map(p => p.trim());
                        steps.push({
                            num,
                            title: parts[0] || '',
                            desc: parts[1] || '',
                            timing: parts[2] || ''
                        });
                    }
                }
            }

            // Build timeline HTML
            let html = `<div class="iurexia-processflow">`;
            if (titulo) html += `<div class="processflow-title">${titulo}</div>`;
            html += `<div class="processflow-timeline">`;

            steps.forEach(step => {
                html += `<div class="processflow-step">`;
                html += `<div class="processflow-circle">${step.num}</div>`;
                html += `<div class="processflow-card">`;
                html += `<div class="processflow-step-title">${step.title}</div>`;
                if (step.desc) html += `<div class="processflow-step-desc">${step.desc}</div>`;
                if (step.timing) html += `<div class="processflow-step-timing">${step.timing}</div>`;
                html += `</div></div>`;
            });

            html += `</div></div>`;
            outputLines.push(html);

        } else {
            outputLines.push(lines[i]);
            i++;
        }
    }

    processed = outputLines.join('\n');

    // STEP 2: Clean up raw UUIDs and Doc ID references
    // Remove [Doc ID: uuid] patterns - they're for internal linking, not display
    processed = processed.replace(/\[Doc\s*ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi, '');
    // Remove bare UUIDs that aren't inside HTML attributes
    // Se excluyen también `/`, `=` y `-`: un UUID dentro de una URL (ruta o
    // parámetro) se estaba borrando y dejaba el enlace roto.
    processed = processed.replace(/(?<!["/=-])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?!["-])/gi, '');
    // Clean up leftover Doc ID labels without UUIDs
    processed = processed.replace(/\[Doc\s*ID:\s*\]/gi, '');
    // Clean up parentheses or brackets that now only contain whitespace
    processed = processed.replace(/\(\s*\)/g, '');
    processed = processed.replace(/\[\s*\]/g, '');

    // STEP 3: Convert separator lines (═══, ─────) to styled HRs
    processed = processed.replace(/^[═]{5,}.*$/gm, '<hr class="section-divider" />');
    processed = processed.replace(/^[─]{5,}.*$/gm, '<hr class="section-divider-light" />');

    // STEP 5: Style "Fuentes citadas" or "FUENTES" headers
    processed = processed.replace(
        /^##\s*(Fuentes\s+citadas|FUENTES\s+CITADAS|Referencias)$/gim,
        '<div class="fuentes-header"><span>$1</span></div>'
    );

    // STEP 6: Style Iurexia main section headers — two-tone color split at " Y "
    processed = processed.replace(
        /^(?:##|###)\s*(RESPUESTA DIRECTA|MARCO CONSTITUCIONAL.*?|FUNDAMENTO LEGAL.*?|LEGISLACI\u00d3N FEDERAL.*?|JURISPRUDENCIA Y TESIS.*?|JURISPRUDENCIA.*?|LEGISLACI\u00d3N ESTATAL.*?|AN\u00c1LISIS INTEGRADO.*?|CONCLUSI\u00d3N.*?|FUERO APLICABLE.*?)$/gim,
        (_, title: string) => cabeceraSeccion(title)
    );

    // ═══════════════════════════════════════════════════════════════════
    // DE LÍNEAS A BLOQUES (17-sep-2026)
    // ═══════════════════════════════════════════════════════════════════
    // Antes, el último paso convertía TODO salto de línea en <br/> después
    // de haber creado cabeceras, citas y listas: el salto que separaba cada
    // bloque del siguiente sobrevivía como una línea vacía de 24px. Medido
    // sobre una respuesta real: 13 <br/> huérfanos y 11 párrafos vacíos; una
    // cita de tres líneas eran tres blockquotes con la barra troceada; las
    // numeradas salían sin <ol>. De ahí los «espacios asimétricos».
    //
    // Ahora: primero los bloques (cabeceras, citas agrupadas, listas
    // agrupadas), y al final el texto se parte por línea en blanco; cada
    // trozo que no es ya HTML se envuelve en <p>, y el salto simple sólo es
    // <br/> DENTRO de un párrafo. Las clases de margen las pone el CSS
    // (`.respuesta`), no el HTML: aquí las de antes no llegaban a aplicarse.
    processed = processed
        // H4 → párrafo en negrita (un cuarto nivel de título sería ruido)
        .replace(/^#### (.*$)/gm, '<p><strong>$1</strong></p>')
        // ### → subtítulo
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        // ## libres → la misma cabecera de sección que las canónicas. Antes
        // salían como h2 de 20px con subrayado negro: cuatro gramáticas de
        // título en un mismo mensaje.
        .replace(/^## (?!.*(?:Respuesta|Análisis) Legal)(.*$)/gm, (_m, t: string) => cabeceraSeccion(t))
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        // Negritas antes que cursivas
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // «> *Fuente: …*» ANTES de la cursiva genérica: iba después y, como el
    // modelo casi siempre escribe la fuente entre asteriscos, la regla no
    // casaba nunca y la fuente caía a la cita marrón.
    processed = parrafosDeFuente(processed)
        // Cursiva: un asterisco pegado al texto, sin cruzar líneas ni comerse
        // los «* » de las viñetas ni los «5*» de una nota
        .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1<em>$2</em>')
        // Código en línea
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    // Enlaces [texto](url). Exige el paréntesis con esquema http(s), así
    // que las referencias sueltas tipo «[1]» siguen intactas.
    processed = enlaces(processed)
        // Citas: las líneas «>» consecutivas son UNA cita (un artículo de tres
        // líneas era tres blockquotes con la barra troceada)
        .replace(/^(?:> ?.*(?:\n|$))+/gm, (bloque: string) => {
            const dentro = bloque.replace(/^> ?/gm, '').trim()
                .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>');
            return dentro ? `<blockquote><p>${dentro}</p></blockquote>\n` : '';
        })
        // Viñetas y numeradas: las líneas consecutivas son una sola lista
        .replace(/^(?:[-*•] .*(?:\n|$))+/gm, (bloque: string) =>
            '<ul>' + bloque.trim().split('\n').map((l) => `<li>${l.replace(/^[-*•] /, '')}</li>`).join('') + '</ul>\n')
        .replace(/^(?:\d+[.)] .*(?:\n|$))+/gm, (bloque: string) =>
            '<ol>' + bloque.trim().split('\n').map((l) => `<li>${l.replace(/^\d+[.)] /, '')}</li>`).join('') + '</ol>\n');

    return processed
        .split(/\n{2,}/)
        .map((bloque) => {
            const t = bloque.trim();
            if (!t) return '';
            // Ya es HTML de bloque: se quitan los saltos entre etiquetas y no
            // se envuelve. Los que empiezan por texto (o por una cita [N]) son
            // un párrafo, con el salto simple como <br/>.
            if (/^<(?:h[1-6]|div|ul|ol|blockquote|hr|table|p|details|section)\b/i.test(t) || t.startsWith('<!--')) {
                // `>\s*\n\s*<`, sin repartir los blancos entre dos `\s*`
                return t.replace(/>(\s*)</g, (m: string, blancos: string) => (blancos.includes('\n') ? '><' : m));
            }
            return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
        })
        .join('');
}
