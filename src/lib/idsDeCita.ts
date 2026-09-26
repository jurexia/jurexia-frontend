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
 * TIEMPO LINEAL POR CONSTRUCCIÓN (26-sep-2026). Todo esto corre sobre texto
 * del modelo, con cada trozo del stream y sobre el historial entero, así que
 * una expresión que se vuelva cuadrática con una racha de espacios o de
 * corchetes congela la pestaña. Dos rondas seguidas, un arreglo de regex metió
 * otra super-lineal (en el servidor, `[*_]*+` sin ancla; aquí, la etiqueta
 * `Doc\s*[-_]?\s*` tardaba 2 s con un corchete y 20.000 espacios). Las
 * reglas, para quien toque esto después:
 *
 *   1. Ningún cuantificador sin tope sobre una clase que pueda solaparse con
 *      lo que le sigue o con el inicio del patrón. En etiquetas, adornos y
 *      separadores, topes pequeños ({0,3}, {0,8}…).
 *   2. El contenido de un grupo lleva tope explícito ({1,2000}) y se detiene
 *      en el siguiente corchete o paréntesis: así las zonas que recorre cada
 *      intento no se solapan.
 *   3. Lo que no se deja escribir así se escribe como escáner —`indexOf`,
 *      `lastIndexOf` y un bucle—: los comentarios HTML, el grupo abierto al
 *      final, el que se queda sin cerrar en su renglón, las fichas ya puestas.
 *
 * `comprobaciones/citas_plurales.mjs` lo mide: cada función pública de aquí,
 * las dos limpiezas de marcadores y la numeración del chat y de la hoja, con
 * cadenas de 20k y 100k caracteres de un alfabeto hecho para romperlas.
 *
 * Sin dependencias: lo prueba `comprobaciones/citas_plurales.mjs` en Node.
 */

export const UUID_CITA = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const RX_UUID = new RegExp(UUID_CITA, 'g');
const RX_HAY_UUID = new RegExp(UUID_CITA);
/** «Doc ID», «Doc IDs», «DocID», «Doc-ID», con o sin dos puntos. Los espacios,
 *  con tope y sin saltar de renglón: `\s*[-_]?\s*` sin tope repartía una
 *  racha de espacios entre los dos `\s*` de todas las maneras posibles. */
const ETIQUETA = 'Doc[^\\S\\n]{0,3}[-_]?[^\\S\\n]{0,3}IDs?[^\\S\\n]{0,3}:?';
const RX_ETIQUETA = new RegExp(ETIQUETA, 'gi');
const RX_HAY_ETIQUETA = new RegExp(ETIQUETA, 'i');
const RX_ETIQUETA_AL_INICIO = new RegExp(`^\\s{0,16}${ETIQUETA}`, 'i');
/** Lo que puede separar dos identificadores dentro de un mismo grupo. Una sola
 *  clase con `+` (o una palabra entera): cada carácter se mira una vez. */
const RX_SEPARADORES = /[\s;,/|&+·–—\-[\]]+|\b(?:y|e|and)\b/gi;

/* ═══ ESCÁNERES DE COMENTARIOS Y BLOQUES ═══════════════════════════════════
   `/<!--[\s\S]*?-->/` recorre hasta el final desde CADA apertura sin cierre:
   con muchas «<!--» seguidas es cuadrático. Estos hacen lo mismo con
   `indexOf`: si una apertura no tiene cierre, ninguna de las de después lo
   tiene, y ahí se para. */

/**
 * Quita cada bloque que empieza donde casa `abre` y termina en el primer
 * `cierra` que le sigue: lo mismo que `t.replace(/abre[\s\S]*?cierra/g, '')`.
 * Una apertura sin cierre, y todo lo que venga detrás, se queda.
 * `abre` lleva la bandera `g` (o `y`) y es un literal o casi.
 */
export function quitarBloques(t: string, abre: RegExp, cierra: string): string {
    let out = '';
    let i = 0;
    for (;;) {
        abre.lastIndex = i;
        const m = abre.exec(t);
        if (!m) break;
        const fin = t.indexOf(cierra, m.index + m[0].length);
        if (fin === -1) break;
        out += t.slice(i, m.index);
        i = fin + cierra.length;
    }
    return out + t.slice(i);
}

/** Los trozos de texto y de comentario HTML, alternados —pares: texto;
 *  impares: comentario—, como `t.split(/(<!--[\s\S]*?-->)/)`. */
export function partirComentarios(t: string): string[] {
    const trozos: string[] = [];
    let i = 0;
    for (;;) {
        const a = t.indexOf('<!--', i);
        if (a === -1) break;
        const b = t.indexOf('-->', a + 4);
        if (b === -1) break;
        trozos.push(t.slice(i, a), t.slice(a, b + 3));
        i = b + 3;
    }
    trozos.push(t.slice(i));
    return trozos;
}

/** El texto sin comentarios HTML cerrados: `t.replace(/<!--[\s\S]*?-->/g, '')`. */
export function sinComentarios(t: string): string {
    return quitarBloques(t || '', /<!--/g, '-->');
}

/** Los marcadores del servidor cuyo JSON trae identificadores que no son
 *  citas: el mapa de citas, las fuentes que se adelantan mientras llega la
 *  respuesta y los precedentes. */
export const MARCADORES_CON_IDS: readonly string[] = ['CITATION_META', 'FUENTES_PREVIAS', 'PRECEDENTES_META'];

/**
 * Sin el marcador que se quedó abierto al final (el JSON de CITATION_META a
 * medio llegar), y SÓLO si es un marcador nuestro: el comentario sin cerrar
 * tiene que empezar —tras «<!--» y como mucho cuatro blancos— por uno de
 * `nombres`, o ser todavía el principio de uno al final del texto
 * («<!-- CITAT», «<!--»: el stream lo partió ahí). Un «<!--» que el modelo
 * escribió en su texto no es un marcador y se queda, con todo lo que le
 * sigue (26-sep-2026). Antes se cortaba desde cualquier «<!--» huérfano
 * —`/<!--[\s\S]*$/`, `/<!--[^>]*$/`— y la hoja perdía el resto del escrito,
 * citas incluidas.
 *
 * «Sin cerrar» es sin un «-->» detrás, como en `sinComentarios`: sólo pueden
 * estarlo las aperturas posteriores al último «-->», y cada una se mira en
 * tiempo constante. Lineal.
 */
export function sinMarcadorAbiertoAlFinal(t: string, nombres: readonly string[] = MARCADORES_CON_IDS): string {
    const s = t || '';
    const largo = nombres.reduce((m, n) => Math.max(m, n.length), 0) + 8;
    const cierre = s.lastIndexOf('-->');
    for (let p = s.indexOf('<!--', Math.max(0, cierre - 3)); p !== -1; p = s.indexOf('<!--', p + 1)) {
        const resto = s.slice(p + 4, p + 4 + largo);
        const cabeza = resto.replace(/^\s{0,4}/, '');
        const esMarcador = nombres.some((n) => cabeza.startsWith(n) && !/\w/.test(cabeza.charAt(n.length)));
        // Partido por el stream: lo que queda hasta el final es el principio de un nombre.
        const aMedias = p + 4 + resto.length === s.length && nombres.some((n) => n.startsWith(cabeza));
        if (esMarcador || aMedias) return s.slice(0, p);
    }
    return s;
}

/* ═══ LOS GRUPOS ═══════════════════════════════════════════════════════════ */

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

/** ¿No hay en el grupo más que identificadores, etiquetas y separadores? */
function soloIdsYSeparadores(interior: string): boolean {
    return !interior.replace(RX_UUID, ' ').replace(RX_ETIQUETA, ' ').replace(RX_SEPARADORES, '');
}

/** Un renglón que continúa un grupo partido: empieza —tras separadores o
 *  adorno, con tope— por un identificador o por la etiqueta. */
const RX_RENGLON_DE_CITA = new RegExp(`^[\\s;,*_\`·–—-]{0,8}(?:${UUID_CITA}|${ETIQUETA})`, 'i');

/**
 * ¿Es un grupo partido en renglones con la etiqueta en el primero y cuyos
 * renglones siguientes empiezan todos por un identificador o por la
 * etiqueta? «[Doc IDs: a (párr. 340);⏎b (párr. 341)]» sí;
 * «[Doc IDs: a;⏎El párrafo siguiente…]» no: ahí lo que sigue es prosa, y
 * abrirlo se llevaría el renglón entero.
 */
function renglonesDeCita(interior: string, etiquetaAlInicio: boolean): boolean {
    const renglones = interior.split('\n');
    if (!(etiquetaAlInicio ? RX_ETIQUETA_AL_INICIO : RX_HAY_ETIQUETA).test(renglones[0])) return false;
    for (let k = 1; k < renglones.length; k++) {
        const r = renglones[k];
        if (r.trim() && !RX_RENGLON_DE_CITA.test(r)) return false;
    }
    return true;
}

/**
 * Un grupo entre corchetes o paréntesis de un solo renglón. Se abre si lleva
 * la etiqueta —«[Doc IDs: a; b]», «(Doc ID: a)»— o si no contiene más que
 * identificadores y separadores —«[a; b]»—. Si no, es prosa que menciona un
 * identificador y se deja para los pasos de siempre. En los paréntesis la
 * etiqueta tiene que abrir el grupo: «(como resolvió la Corte [Doc ID: a],
 * párr. 340)» es prosa.
 */
function expandirGrupo(interior: string, donde: 'cualquiera' | 'inicio'): string | null {
    const ids = interior.match(RX_UUID);
    if (!ids) return null;
    const etiquetado = donde === 'cualquiera' ? RX_HAY_ETIQUETA.test(interior) : RX_ETIQUETA_AL_INICIO.test(interior);
    if (!etiquetado && !soloIdsYSeparadores(interior)) return null;
    return singulares(ids);
}

/**
 * El mismo grupo partido en renglones. Se abre si dentro no hay más que
 * identificadores y separadores, o si lleva la etiqueta en su primer renglón
 * y cada renglón que sigue empieza por un identificador o por la etiqueta
 * (`renglonesDeCita`). Como en el de un renglón, la prosa de dentro
 * —«(párr. 340)»— se va con el grupo.
 *
 * Antes sólo se abría el «puro», y «[Doc IDs: a (párr. 340);⏎b (párr. 341)]»
 * dejaba la etiqueta y los uuid a la vista en el constructor, el Word y las
 * carpetas, «[Doc IDs: [1] (párr. 340);[2]…]» en la hoja y «[[1] …; [2] …]»
 * en el chat.
 */
function expandirGrupoPartido(interior: string, parentesis: boolean): string | null {
    const ids = interior.match(RX_UUID);
    if (!ids) return null;
    if (!soloIdsYSeparadores(interior) && !renglonesDeCita(interior, parentesis)) return null;
    return singulares(ids);
}

/** Sin los pares de corchetes de dentro: «Doc ID: a, véase [nota]» → «Doc ID: a, véase ». */
function sinParesInternos(interior: string): string {
    let fuera = '';
    let hondo = 0;
    for (const c of interior) {
        if (c === '[') hondo++;
        else if (c === ']') hondo--;
        else if (hondo === 0) fuera += c;
    }
    return fuera;
}

/**
 * «[Doc ID: a, véase [nota]]»: un grupo de un renglón con OTRO par de
 * corchetes dentro. Las expresiones de los grupos no cruzan un «[» (es lo que
 * las mantiene lineales), así que éste se quedaba sin abrir: la hoja enseñaba
 * «[Doc ID: [1], véase [nota]]» y el constructor, el Word y las carpetas, el
 * uuid entero con su etiqueta. Se busca con una sola pasada y una pila de dos
 * niveles que se vacía en cada salto de línea; cada grupo mide 2000
 * caracteres como mucho y se mira una vez. Se abre si la etiqueta y algún
 * identificador están FUERA de los pares de dentro —«[Nota: la Corte [Doc ID:
 * a] resolvió…]» es una nota con una cita, no un grupo de citas— o si no hay
 * más que identificadores y separadores.
 */
function expandirCorchetesAnidados(t: string): string {
    if (!t.includes('[')) return t;
    let out = '';
    let desde = 0;
    let abre = -1;          // el «[» de fuera
    let dentro = false;     // dentro de un par interior
    let anidado = false;    // el de fuera lleva algún par dentro
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (abre !== -1 && i - abre > 2000) { abre = -1; dentro = false; }
        if (c === '\n') { abre = -1; dentro = false; continue; }
        if (c === '[') {
            if (abre === -1) { abre = i; anidado = false; } else if (!dentro) { dentro = true; anidado = true; } else { abre = i; dentro = false; anidado = false; }
        } else if (c === ']') {
            if (dentro) { dentro = false; continue; }
            if (abre === -1) continue;
            if (anidado) {
                const interior = t.slice(abre + 1, i);
                const fuera = sinParesInternos(interior);
                const ids = interior.match(RX_UUID);
                if (ids && ((RX_HAY_ETIQUETA.test(fuera) && RX_HAY_UUID.test(fuera)) || soloIdsYSeparadores(interior))) {
                    out += t.slice(desde, abre) + singulares(ids);
                    desde = i + 1;
                }
            }
            abre = -1;
        }
    }
    return out + t.slice(desde);
}

/* Los grupos: contenido con tope y que se para en el siguiente corchete (o
   paréntesis), de apertura o de cierre, así que cada carácter pertenece a la
   zona de un solo intento. */
const RX_CORCHETES_RENGLON = /\[([^[\]\n]{1,2000})\]/g;
const RX_PARENTESIS_RENGLON = /\(([^()\n]{1,2000})\)/g;
const RX_CORCHETES = /\[([^[\]]{1,2000})\]/g;
const RX_PARENTESIS = /\(([^()]{1,2000})\)/g;

/** Lo que separa dos identificadores de una serie suelta. Con topes. */
const SEP_SERIE = '(?:\\s{0,4}(?:[;,/|&+]|\\by\\b|\\band\\b)\\s{0,4}|\\s{1,4})';
/** Una etiqueta seguida de uno o varios identificadores, fuera de corchetes:
 *  «Doc ID: a; Doc ID: b». Cada vuelta de la repetición come un uuid entero,
 *  y detrás no hay nada que obligue a desandarla. */
const RX_SERIE_SUELTA = new RegExp(
    `(?<![\\[(]\\s{0,8})\\b${ETIQUETA}\\s{0,4}${UUID_CITA}`
    + `(?:${SEP_SERIE}(?:${ETIQUETA}\\s{0,4})?${UUID_CITA}){0,500}`,
    'gi',
);
/** La etiqueta justo después de un corchete o paréntesis de apertura. */
const RX_ETIQUETA_TRAS_APERTURA = new RegExp(`\\s{0,16}(?=${ETIQUETA})`, 'iy');
const RX_ETIQUETA_TRAS_APERTURA_RENGLON = new RegExp(`[ \\t]{0,16}(?=${ETIQUETA})`, 'iy');
/** El identificador a medio escribir con el que termina un grupo abierto. Mide
 *  60 caracteres como mucho: se busca sólo en la cola. */
const RX_UUID_A_MEDIAS = /[0-9a-fA-F]{1,8}(?:-[0-9a-fA-F]{0,12}){0,4}$/;

/** Una cita singular, como la escriben `singulares` y el modelo. */
const SINGULAR = `\\[\\s{0,4}Doc\\s{0,4}ID\\s{0,4}:\\s{0,4}${UUID_CITA}\\s{0,4}\\]`;
/** «[Doc ID: a]; [Doc ID: b]» — el «;» o la «,» entre dos citas seguidas. */
const RX_SEPARADOR_ENTRE_CITAS = new RegExp(`(${SINGULAR})[ \\t]{0,8}[;,][ \\t]{0,8}(?=${SINGULAR})`, 'gi');

/** El último corchete o paréntesis —de apertura o de cierre— de `t`. */
function ultimoCorchete(t: string): number {
    return Math.max(t.lastIndexOf('['), t.lastIndexOf(']'), t.lastIndexOf('('), t.lastIndexOf(')'));
}

/** `s` sin el identificador a medio escribir (ni los blancos) del final. */
function sinUuidAMedias(s: string): string {
    let fin = s.length;
    while (fin > 0 && /\s/.test(s[fin - 1])) fin--;
    const desde = Math.max(0, fin - 64);
    const m = RX_UUID_A_MEDIAS.exec(s.slice(desde, fin));
    return m ? s.slice(0, desde + m.index) : s;
}

/**
 * «[Doc IDs: a; b…» todavía sin cerrar al final del texto (mientras se
 * escribe): lo completo se cita ya y lo demás espera al siguiente trozo, para
 * que la etiqueta no asome ni un instante. Es el grupo que abre el ÚLTIMO
 * corchete o paréntesis del texto, si tras él viene la etiqueta. Partido en
 * renglones, sólo si lo que sigue son identificadores (o renglones que
 * empiezan por uno): si no, un corchete que nunca se cierra se llevaría los
 * párrafos de después.
 */
function abrirGrupoFinal(t: string): string {
    const p = ultimoCorchete(t);
    if (p === -1 || (t[p] !== '[' && t[p] !== '(')) return t;
    RX_ETIQUETA_TRAS_APERTURA.lastIndex = p + 1;
    const m = RX_ETIQUETA_TRAS_APERTURA.exec(t);
    if (!m) return t;
    const dentro = t.slice(p + 1 + m[0].length);
    if (dentro.includes('\n')) {
        const completo = sinUuidAMedias(dentro);
        if (!soloIdsYSeparadores(completo) && !renglonesDeCita(completo, true)) return t;
    }
    return t.slice(0, p) + singulares(dentro.match(RX_UUID) || []);
}

/**
 * El que se quedó sin cerrar en su renglón (el modelo olvidó el «]»): sus
 * citas se abren y la prosa de después se queda donde estaba. Sin esto, la
 * etiqueta asomaba en la hoja y la limpieza del chat se comía la cita. Es el
 * que abre el último corchete o paréntesis de un renglón que no es el último.
 */
function abrirGruposSinCerrar(t: string): string {
    if (!t.includes('\n')) return t;
    const renglones = t.split('\n');
    for (let k = 0; k < renglones.length - 1; k++) {
        const r = renglones[k];
        const p = ultimoCorchete(r);
        if (p === -1 || (r[p] !== '[' && r[p] !== '(')) continue;
        RX_ETIQUETA_TRAS_APERTURA_RENGLON.lastIndex = p + 1;
        const m = RX_ETIQUETA_TRAS_APERTURA_RENGLON.exec(r);
        if (!m) continue;
        const dentro = r.slice(p + 1 + m[0].length);
        const ids = dentro.match(RX_UUID);
        if (ids && soloIdsYSeparadores(dentro)) renglones[k] = r.slice(0, p) + singulares(ids);
    }
    return renglones.join('\n');
}

function expandirTramo(t: string): string {
    // [Doc IDs: a; b] · [Doc ID: a, b] · [Doc ID: a; Doc ID: b] · [nombre, Doc ID: a] · [a; b]
    t = t.replace(RX_CORCHETES_RENGLON, (m, dentro: string) => expandirGrupo(dentro, 'cualquiera') ?? m);
    // (Doc ID: a) · (Doc IDs: a; b) · (a, b)
    t = t.replace(RX_PARENTESIS_RENGLON, (m, dentro: string) => expandirGrupo(dentro, 'inicio') ?? m);
    // [Doc ID: a, véase [nota]] — con otro par de corchetes dentro
    t = expandirCorchetesAnidados(t);
    // El mismo grupo partido por un salto de línea —«[Doc IDs: a;⏎b]»—. Antes
    // perdía sus citas: en la hoja desaparecían las dos y en el chat quedaba
    // «; [2]]». Ver `expandirGrupoPartido`.
    t = t.replace(RX_CORCHETES, (m, dentro: string) => (dentro.includes('\n') ? expandirGrupoPartido(dentro, false) ?? m : m));
    t = t.replace(RX_PARENTESIS, (m, dentro: string) => (dentro.includes('\n') ? expandirGrupoPartido(dentro, true) ?? m : m));
    // Doc ID: a; Doc ID: b — sin corchetes
    t = t.replace(RX_SERIE_SUELTA, (m) => singulares(m.match(RX_UUID) || []));
    t = abrirGrupoFinal(t);
    t = abrirGruposSinCerrar(t);
    // Sólo números seguidos: «[Doc ID: a]; [Doc ID: b]» se veía «[1]; [2]».
    // Si detrás del «;» sigue la prosa, el «;» es de la frase y se queda.
    t = t.replace(RX_SEPARADOR_ENTRE_CITAS, '$1');
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
    return partirComentarios(texto)
        .map((tramo, i) => (i % 2 === 1 ? tramo : expandirTramo(tramo)))
        .join('');
}

/** Los identificadores citados en un texto, en minúsculas, sin repetir y por orden de aparición.
 *  Incluye los que venían agrupados: el registro de fuentes verificadas de la
 *  conversación (`fijarFuentesVerificadas`) los perdía. */
export function idsCitados(texto: string): string[] {
    const salida: string[] = [];
    const vistos = new Set<string>();
    // Tan holgado como el patrón que había en la pantalla del chat (30 a 40
    // caracteres de hex y guiones): ninguna cita que antes contara deja de contar.
    const rx = /\[Doc ID:\s{0,8}([0-9a-fA-F-]{30,40})\]/gi;
    const limpio = sinComentarios(expandirCitasAgrupadas(texto || ''));
    let m: RegExpExecArray | null;
    while ((m = rx.exec(limpio)) !== null) {
        const id = m[1].toLowerCase();
        if (!vistos.has(id)) {
            vistos.add(id);
            salida.push(id);
        }
    }
    return salida;
}

/** Los identificadores que ya tienen su ficha en el HTML: lo mismo que
 *  preguntar `t.includes('data-doc-id="<uuid>"')` por cada uno, pero
 *  recorriendo el texto una sola vez y no una vez por identificador. */
function fichasYaPuestas(t: string): Set<string> {
    const puestas = new Set<string>();
    const PREFIJO = 'data-doc-id="';
    for (let i = t.indexOf(PREFIJO); i !== -1; i = t.indexOf(PREFIJO, i + 1)) {
        const valor = t.slice(i + PREFIJO.length, i + PREFIJO.length + 37);
        if (valor.length === 37 && valor[36] === '"') puestas.add(valor.slice(0, 36));
    }
    return puestas;
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
    content = content.replace(new RegExp(`\\[Doc ID:\\s{0,8}(${U})\\]`, 'gi'), (_, uuid) => ficha(uuid));
    // [, uuid] — el modelo a veces pone la coma delante
    content = content.replace(new RegExp(`\\[\\s{0,8},\\s{0,8}(${U})\\s{0,8}\\]`, 'gi'), (_, uuid) => ficha(uuid));
    // [nombre, uuid]. El nombre no cruza otro «[»: con `[^\]\n]*`, una fila de
    // «[» sin cerrar se recorría entera desde cada uno (cuadrático).
    content = content.replace(new RegExp(`\\[[^\\[\\]\\n]{0,2000},\\s{0,8}(${U})\\s{0,8}\\]`, 'gi'), (_, uuid) => ficha(uuid));
    // «Doc uuid» suelto
    content = content.replace(new RegExp(`(?<![a-f0-9-])Doc\\s{1,8}(${U})(?![a-f0-9-])`, 'gi'), (_, uuid) => ficha(uuid));
    // Un uuid suelto que no esté ya en una ficha
    const puestas = fichasYaPuestas(content);
    content = content.replace(
        new RegExp(`(?<!data-doc-id=")(?!\\/document\\/)(${U})(?!")`, 'gi'),
        (m, uuid: string) => (puestas.has(uuid.toLowerCase()) ? m : ficha(uuid)),
    );

    // PASO 2: restos, DESPUÉS de haber numerado lo válido.
    // [, <sup>…</sup>] → <sup>…</sup>
    content = content.replace(/\[\s{0,8},?\s{0,8}(<sup class="citation-badge"[^<]{0,200}<\/sup>)\s{0,8}\]/g, '$1');
    // [<sup>…</sup>] → <sup>…</sup>
    content = content.replace(/\[(<sup class="citation-badge"[^<]{0,200}<\/sup>)\]/g, '$1');
    // [, [N]]
    content = content.replace(/\[\s{0,8},?\s{0,8}\[(\d{1,6})\]\s{0,8}\]/g, '<sup class="citation-badge">[$1]</sup>');
    // uuid sin su primer tramo: [-53b4-5b76-b7ea-ef9db1b4ead8]
    content = content.replace(/\[-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\]/gi, '');
    // identificadores cortos o partidos: [Doc ID: 9396d0c8], (Doc ID: xxxxx), [-985d-5043-…]
    content = content.replace(/\[Doc ID:\s{0,8}[a-f0-9]{1,35}\]/gi, '');
    content = content.replace(/\(Doc IDs?:\s{0,8}[a-f0-9-]{1,64}\)/gi, '');
    content = content.replace(/\[-[a-f0-9-]{10,35}\]/gi, '');
    // Grupos con etiqueta que no traían ni un identificador completo —«[Doc IDs: ; ]»—.
    // Los que sí los traían ya se abrieron en el paso 0: aquí no se borra ninguna cita.
    // Sin cruzar renglones: un corchete sin cerrar se llevaba el renglón siguiente.
    // Ni dentro de una ficha ya puesta: su «[1]» cerraba el corchete y la
    // ficha se iba con él (quedaba «; [2]]»). Ni a través de otro «[».
    content = content.replace(/\[Doc IDs?:[^[\]\n<]{0,2000}\]/gi, '');
    // La etiqueta suelta que quede, con o sin su identificador partido.
    content = content.replace(/\bDoc[ \t]{0,8}IDs?[ \t]{0,8}:[ \t]{0,8}[a-f0-9-]{0,64}/gi, '');

    return { content, docIdMap };
}
