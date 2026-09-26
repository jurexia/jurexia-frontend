/**
 * LAS CITAS AGRUPADAS SE ABREN UNA POR UNA (26-sep-2026).
 *
 * El modelo cita con `[Doc ID: uuid]`, pero a veces junta varias en un solo
 * corchete. En la consulta de David sobre el control de convencionalidad
 * escribió 31 citas y 5 de ellas eran plurales —«[Doc IDs: da1de55e-…;
 * 2b2dc535-…]», una con cuatro identificadores—: Radilla ¶340 y ¶341, García
 * Rodríguez ¶301, ¶303 y el resolutivo 14, y dos tesis de la Primera Sala. Los
 * siete documentos eran reales y estaban en el contexto, pero:
 *
 *   - la burbuja del chat BORRABA el corchete entero, y con él las citas;
 *   - la hoja del documento enseñaba «[Doc IDs: [25]; [26]]» a la vista, con
 *     la etiqueta interna, el punto y coma y los corchetes de sobra;
 *   - el panel de fuentes las ponía en ámbar como «Cita 25 sin ficha de
 *     origen», sin poder abrir el PDF.
 *
 * Cada pantalla tenía su propia lista de expresiones regulares y cada una
 * cubría una variante distinta. Aquí vive UNA sola función que convierte
 * cualquier forma agrupada o suelta en citas singulares ANTES de numerar, y
 * la usan todos: la burbuja, la hoja, el Word, el registro de fuentes
 * verificadas y la limpieza de marcadores. En el texto sólo queda el número
 * de cada cita —varias seguidas, [25][26]—, nunca «Doc ID», «Doc IDs» ni un
 * «;» suelto entre números.
 *
 * Sin dependencias: lo prueba `comprobaciones/citas_plurales.mjs` en Node.
 */

export const UUID_CITA = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const RX_UUID = new RegExp(UUID_CITA, 'g');
/** «Doc ID», «Doc IDs», «DocID», «Doc-ID», con o sin dos puntos. */
const ETIQUETA = 'Doc\\s*[-_]?\\s*IDs?\\s*:?';
const RX_ETIQUETA = new RegExp(ETIQUETA, 'gi');
const RX_ETIQUETA_AL_INICIO = new RegExp(`^\\s*${ETIQUETA}`, 'i');
/** Lo que puede separar dos identificadores dentro de un mismo grupo. */
const RX_SEPARADORES = /[\s;,/|&+·–—\-[\]]+|\b(?:y|e|and)\b/gi;

/** Los identificadores de un grupo, sin repetir y en su orden, como citas singulares. */
function singulares(ids: string[]): string {
    const vistos = new Set<string>();
    return ids
        .filter((u) => {
            const k = u.toLowerCase();
            if (vistos.has(k)) return false;
            vistos.add(k);
            return true;
        })
        .map((u) => `[Doc ID: ${u}]`)
        .join('');
}

/**
 * Un grupo entre corchetes o paréntesis. Se abre si lleva la etiqueta
 * —«[Doc IDs: a; b]», «(Doc ID: a)»— o si no contiene más que identificadores
 * y separadores —«[a; b]»—. Si no, es prosa que menciona un identificador y
 * se deja para los pasos de siempre.
 */
function expandirGrupo(interior: string, etiquetaEnCualquierSitio: boolean): string | null {
    const ids = interior.match(RX_UUID);
    if (!ids) return null;
    const etiquetado = etiquetaEnCualquierSitio
        ? new RegExp(ETIQUETA, 'i').test(interior)
        : RX_ETIQUETA_AL_INICIO.test(interior);
    if (!etiquetado) {
        const resto = interior.replace(RX_UUID, ' ').replace(RX_ETIQUETA, ' ').replace(RX_SEPARADORES, '');
        if (resto) return null;
    }
    return singulares(ids);
}

/** Una etiqueta seguida de uno o varios identificadores, fuera de corchetes. */
const RX_SERIE_SUELTA = new RegExp(
    `(?<![\\[(]\\s*)\\bDoc\\s*[-_]?\\s*IDs?\\s*:?\\s*${UUID_CITA}`
    + `(?:(?:\\s*(?:[;,/|&+]|\\by\\b|\\band\\b)\\s*|\\s+)(?:Doc\\s*[-_]?\\s*IDs?\\s*:?\\s*)?${UUID_CITA})*`,
    'gi',
);
/** Un grupo con etiqueta que llega al final sin cerrarse (mientras se escribe). */
const RX_GRUPO_ABIERTO = new RegExp(`[\\[(]\\s*(${ETIQUETA}[^\\[\\]()\\n]*)$`, 'i');

function expandirTramo(t: string): string {
    // [Doc IDs: a; b] · [Doc ID: a, b] · [Doc ID: a; Doc ID: b] · [nombre, Doc ID: a] · [a; b]
    t = t.replace(/\[([^[\]\n]{1,2000})\]/g, (m, dentro: string) => expandirGrupo(dentro, true) ?? m);
    // (Doc ID: a) · (Doc IDs: a; b) · (a, b). Aquí la etiqueta tiene que abrir el
    // paréntesis: «(como resolvió la Corte [Doc ID: a], párr. 340)» es prosa.
    t = t.replace(/\(([^()\n]{1,2000})\)/g, (m, dentro: string) => expandirGrupo(dentro, false) ?? m);
    // Doc ID: a; Doc ID: b — sin corchetes
    t = t.replace(RX_SERIE_SUELTA, (m) => singulares(m.match(RX_UUID) || []));
    // «[Doc IDs: a; b…» todavía sin cerrar: lo completo se cita ya y lo demás
    // espera al siguiente trozo, para que la etiqueta no asome ni un instante.
    t = t.replace(RX_GRUPO_ABIERTO, (_, dentro: string) => singulares(dentro.match(RX_UUID) || []));
    return t;
}

/**
 * Convierte toda cita agrupada o suelta en citas singulares `[Doc ID: uuid]`,
 * pegadas una tras otra. Las singulares quedan como estaban. Los comentarios
 * HTML (CITATION_META, PRECEDENTES_META…) no se tocan: su JSON lleva
 * identificadores que no son citas.
 */
export function expandirCitasAgrupadas(texto: string): string {
    if (!texto) return '';
    if (!/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-/.test(texto)) return texto;
    return texto
        .split(/(<!--[\s\S]*?-->)/)
        .map((tramo, i) => (i % 2 === 1 ? tramo : expandirTramo(tramo)))
        .join('');
}

/** Los identificadores citados en un texto, en minúsculas, sin repetir y por orden de aparición.
 *  Incluye los que venían agrupados: el registro de fuentes verificadas de la
 *  conversación (`fijarFuentesVerificadas`) los perdía. */
export function idsCitados(texto: string): string[] {
    const salida: string[] = [];
    // Tan holgado como el patrón que había en la pantalla del chat (30 a 40
    // caracteres de hex y guiones): ninguna cita que antes contara deja de contar.
    const rx = /\[Doc ID:\s*([0-9a-fA-F-]{30,40})\]/gi;
    const limpio = expandirCitasAgrupadas(texto || '').replace(/<!--[\s\S]*?-->/g, '');
    let m: RegExpExecArray | null;
    while ((m = rx.exec(limpio)) !== null) {
        const id = m[1].toLowerCase();
        if (salida.indexOf(id) === -1) salida.push(id);
    }
    return salida;
}

/**
 * LA BURBUJA DEL CHAT: cada cita se vuelve una ficha `<sup class="citation-badge">`
 * con su número por orden de PRIMERA aparición. Antes vivía dentro del
 * componente; aquí la puede probar la comprobación con el texto real.
 */
export function numerarCitasDelChat(texto: string): { content: string; docIdMap: Map<string, number> } {
    const docIdMap = new Map<string, number>();
    let contador = 0;
    const numero = (uuid: string): number => {
        const u = uuid.toLowerCase();
        if (!docIdMap.has(u)) docIdMap.set(u, ++contador);
        return docIdMap.get(u)!;
    };
    const ficha = (uuid: string) => `<sup class="citation-badge" data-doc-id="${uuid.toLowerCase()}">[${numero(uuid)}]</sup>`;
    const U = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

    // PASO 0: lo agrupado se abre en singulares ANTES de numerar.
    let content = expandirCitasAgrupadas(texto || '');

    // PASO 1: las formas válidas.
    // [Doc ID: uuid] — la normal
    content = content.replace(new RegExp(`\\[Doc ID:\\s*(${U})\\]`, 'gi'), (_, uuid) => ficha(uuid));
    // [, uuid] — el modelo a veces pone la coma delante
    content = content.replace(new RegExp(`\\[\\s*,\\s*(${U})\\s*\\]`, 'gi'), (_, uuid) => ficha(uuid));
    // [nombre, uuid]
    content = content.replace(new RegExp(`\\[[^\\]]*,\\s*(${U})\\s*\\]`, 'gi'), (_, uuid) => ficha(uuid));
    // «Doc uuid» suelto
    content = content.replace(new RegExp(`(?<![a-f0-9-])Doc\\s+(${U})(?![a-f0-9-])`, 'gi'), (_, uuid) => ficha(uuid));
    // Un uuid suelto que no esté ya en una ficha
    content = content.replace(
        new RegExp(`(?<!data-doc-id=")(?!\\/document\\/)(${U})(?!")`, 'gi'),
        (m, uuid: string) => (content.includes(`data-doc-id="${uuid.toLowerCase()}"`) ? m : ficha(uuid)),
    );

    // PASO 2: restos, DESPUÉS de haber numerado lo válido.
    // [, <sup>…</sup>] → <sup>…</sup>
    content = content.replace(/\[\s*,?\s*(<sup class="citation-badge"[^<]*<\/sup>)\s*\]/g, '$1');
    // [<sup>…</sup>] → <sup>…</sup>
    content = content.replace(/\[(<sup class="citation-badge"[^<]*<\/sup>)\]/g, '$1');
    // [, [N]]
    content = content.replace(/\[\s*,?\s*\[(\d+)\]\s*\]/g, '<sup class="citation-badge">[$1]</sup>');
    // uuid sin su primer tramo: [-53b4-5b76-b7ea-ef9db1b4ead8]
    content = content.replace(/\[-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\]/gi, '');
    // identificadores cortos o partidos: [Doc ID: 9396d0c8], (Doc ID: xxxxx), [-985d-5043-…]
    content = content.replace(/\[Doc ID:\s*[a-f0-9]{1,35}\]/gi, '');
    content = content.replace(/\(Doc IDs?:\s*[a-f0-9-]+\)/gi, '');
    content = content.replace(/\[-[a-f0-9-]{10,35}\]/gi, '');
    // Grupos con etiqueta que no traían ni un identificador completo —«[Doc IDs: ; ]»—.
    // Los que sí los traían ya se abrieron en el paso 0: aquí no se borra ninguna cita.
    content = content.replace(/\[Doc IDs?:[^\]]*\]/gi, '');
    // La etiqueta suelta que quede, con o sin su identificador partido.
    content = content.replace(/\bDoc\s*IDs?\s*:\s*[a-f0-9-]*/gi, '');

    return { content, docIdMap };
}
