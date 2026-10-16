/**
 * LO QUE DEVUELVE EL MODELO, LIMPIO ANTES DE ENTRAR A LA HOJA («Cambiar
 * redacción», 16-oct-2026).
 *
 * El prompt pide «sólo el texto de reemplazo», y un modelo ligero lo cumple casi
 * siempre… salvo cuando no: «Aquí tienes una versión más formal:», el texto
 * entre comillas, una negrita en markdown, un «Nota: conservé la cláusula…» al
 * final. Cualquiera de esas cosas, dentro de un contrato, es una frase que el
 * abogado no escribió y que podría firmar sin verla.
 *
 * LA REGLA DE FONDO ES NO QUITAR TEXTO DEL ESCRITO. «De acuerdo con el artículo
 * 17…», «A continuación se transcribe…» o «Se corrigió el error en la fecha…»
 * son frases jurídicas legítimas que empiezan igual que una cortesía o un
 * comentario. Por eso sólo se quita lo inequívoco —la interjección con su coma
 * («Claro, …»), el rótulo con dos puntos que nombra la versión o la propuesta, el
 * comentario que habla del texto en sí— y nunca lo que el fragmento original
 * ya traía.
 *
 * Texto puro y en tiempo lineal: lo usa la ruta y lo prueba
 * `comprobaciones/redaccion.mjs`.
 */

import { normalizarMarcadores, numerosEn, unicos } from './marcadores';

/* OJO CON `\b`: en JavaScript sólo conoce [A-Za-z0-9_] —también con la bandera
   `u`—, así que para él «ó», «á» o «ñ» no son letras y `corrigi[oó]\b` no casa
   nunca con «corrigió ». Lo encontró la comprobación. Donde una palabra puede
   terminar en acento se usa este «después no viene otra letra». */
const FIN = '(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])';

/** «Claro, aquí tienes…», «Por supuesto.», «Aquí está la versión…». */
const CORTESIA = new RegExp(`^(?:¡?(?:claro|por supuesto|desde luego|perfecto|listo|de acuerdo|con gusto|entendido)[,.!:]|aqu[ií] (?:tienes|tiene|est[aá]|va|te dejo|le dejo|te comparto|le comparto)${FIN}|te (?:comparto|dejo|propongo)${FIN}|le (?:comparto|dejo|propongo)${FIN})`, 'i');

/** El renglón que presenta la versión y termina en dos puntos: «Versión más formal:». */
const PRESENTACION = new RegExp(`^(?:a continuaci[oó]n|[eé]sta es|esta ser[ií]a|propuesta|sugerencia|resultado|texto|versi[oó]n|reescritura|nueva redacci[oó]n|redacci[oó]n|el fragmento|el texto)${FIN}`, 'i');
const NOMBRA_LA_VERSION = new RegExp(`(?:^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:versi[oó]n|propuesta|texto|redacci[oó]n|reescritura|correcci[oó]n|fragmento)${FIN}`, 'i');

/** Lo mismo como rótulo pegado al texto: «Propuesta: El arrendatario…». */
const ROTULO = /^(?:propuesta|sugerencia|texto (?:reescrito|corregido|mejorado|propuesto|revisado)|versi[oó]n (?:mejorada|corregida|reescrita|formal|m[aá]s formal|alternativa|revisada)|nueva redacci[oó]n|redacci[oó]n (?:propuesta|mejorada|sugerida))[ \t]*:[ \t]+(?=\S)/i;

/** El comentario del modelo al final. Los que empiezan con «He…»/«Se…» sólo
 *  cuentan si además hablan del texto mismo («…la ortografía», «…el marcador»):
 *  «He mantenido la posesión del inmueble» es un hecho del escrito. */
const NOTA = /^\(?\s*(?:nota|notas|observaci[oó]n|observaciones|aclaraci[oó]n)(?: del (?:corrector|redactor))?\s*:/i;
const CAMBIOS = /^(?:cambios(?: realizados| principales| hechos)?|explicaci[oó]n de los cambios|lo que cambi[eé])\s*:/i;
const DESPEDIDA = /^(?:espero que (?:te|le) sirva|si (?:necesitas|necesita|deseas|desea|quieres|requieres|prefieres) (?:otra|alg[uú]n|m[aá]s|que|ajustar|cambiar)|¿(?:deseas|desea|quieres|necesitas|te gustar[ií]a|le gustar[ií]a|prefieres) )/i;
const HABLA_DEL_TEXTO = new RegExp(`^(?:he |se )(?:corregido|corrigi[oó]|corrigieron|cambiado|cambi[oó]|ajustado|ajust[oó]|mantenido|mantuvo|conservado|conserv[oó]|reescrito|eliminado|elimin[oó]|sustituido|acortado|respetado)${FIN}`, 'i');
const TEMA_DEL_TEXTO = new RegExp(`(?:^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:texto|redacci[oó]n|fragmento|marcador|marcadores|ortograf[ií]a|puntuaci[oó]n|versi[oó]n|estilo|acentuaci[oó]n|concordancia)${FIN}`, 'i');

function esComentario(p: string): boolean {
    if (NOTA.test(p) || CAMBIOS.test(p) || DESPEDIDA.test(p)) return true;
    return HABLA_DEL_TEXTO.test(p) && TEMA_DEL_TEXTO.test(p) && p.length <= 320;
}

const PARES: Record<string, string> = { '«': '»', '"': '"', '“': '”', '‘': '’', "'": "'" };

/** Sin blancos al final de cada renglón, sin rachas de espacios ni más de una línea en blanco seguida. */
function ordenarBlancos(t: string): string {
    return t
        .split('\n')
        .map((renglon) => renglon.trimEnd())
        .join('\n')
        .replace(/ {2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** ¿El fragmento original ya empezaba así? Entonces no es cortesía del modelo. */
function empiezaIgual(original: string, renglon: string): boolean {
    const a = original.trim().toLowerCase();
    const b = renglon.trim().toLowerCase();
    const n = Math.min(12, a.length);
    return n > 0 && a.slice(0, n) === b.slice(0, n);
}

/**
 * EL TEXTO DE REEMPLAZO, LIMPIO. Quita, en este orden: los cercos de código,
 * la cortesía o la presentación de arriba, el comentario de abajo (hasta dos),
 * las comillas que envuelven todo, el markdown que el original no tenía y los
 * blancos de sobra; y deja los marcadores en su forma canónica.
 */
export function limpiarSalida(salida: string, original: string): string {
    let t = (salida || '').replace(/\r\n?/g, '\n').trim();
    const orig = original || '';

    // 1. ```texto``` entero.
    if (t.startsWith('```')) {
        const salto = t.indexOf('\n');
        t = salto === -1 ? t.replace(/^`+/, '') : t.slice(salto + 1);
        t = t.replace(/\n?`{3,}\s*$/, '').trim();
    }

    // 2. Arriba: «Claro, aquí tienes la versión más formal:» o «Texto corregido:».
    const renglones = t.split('\n');
    const primero = renglones[0].trim();
    const resto = renglones.slice(1).join('\n').trim();
    const cortesia = CORTESIA.test(primero) && primero.length <= 200;
    const presentacion = /[:：]$/.test(primero) && primero.length <= 160 && PRESENTACION.test(primero) && NOMBRA_LA_VERSION.test(primero);
    if (resto && (cortesia || presentacion) && !empiezaIgual(orig, primero)) {
        t = resto;
    } else if (ROTULO.test(t) && !ROTULO.test(orig.trim())) {
        t = t.replace(ROTULO, '');
    }

    // 3. Abajo: «Nota: conservé la cita…», «¿Deseas otra versión?».
    for (let vuelta = 0; vuelta < 2; vuelta++) {
        const parrafos = t.split(/\n[ \t]*\n/);
        if (parrafos.length < 2) break;
        const ultimo = parrafos[parrafos.length - 1].trim();
        if (!esComentario(ultimo) || orig.indexOf(ultimo.slice(0, 18)) !== -1) break;
        t = parrafos.slice(0, -1).join('\n\n').trim();
    }
    // Los separadores «---» que alguno pone entre la cortesía y el texto.
    if (!/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m.test(orig)) {
        t = t.replace(/^(?:-{3,}|\*{3,}|_{3,})[ \t]*\n/, '').replace(/\n[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/, '').trim();
    }

    // 4. Comillas que envuelven TODO el texto, si el original no empezaba así.
    const abre = t.charAt(0);
    const cierra = PARES[abre];
    if (cierra && t.length > 2 && t.charAt(t.length - 1) === cierra && orig.trim().charAt(0) !== abre) {
        const dentro = t.slice(1, -1);
        if (dentro.indexOf(abre) === -1 && dentro.indexOf(cierra) === -1) t = dentro.trim();
    }

    // 5. El markdown que el original no traía.
    if (orig.indexOf('**') === -1) t = t.replace(/\*\*(?=\S)([^*\n]{1,600}?)\*\*/g, '$1');
    if (orig.indexOf('__') === -1) t = t.replace(/__(?=\S)([^_\n]{1,600}?)__/g, '$1');
    if (orig.indexOf('*') === -1) t = t.replace(/(^|[\s(«"“])\*(?=\S)([^*\n]{1,600}?)\*(?=$|[\s.,;:!?)»"”⟦])/gm, '$1$2');
    if (!/^#/m.test(orig)) t = t.replace(/^#{1,6}[ \t]+/gm, '');
    if (!/^>/m.test(orig)) t = t.replace(/^>[ \t]?/gm, '');

    // 6. Los marcadores, en su forma; los blancos, en su sitio.
    return ordenarBlancos(normalizarMarcadores(t, unicos(numerosEn(orig))));
}

/** El tope de la explicación: el prompt pide 120 palabras; se toleran 150. */
const TOPE_EXPLICACION = 150;

/**
 * LA EXPLICACIÓN, LIMPIA. Sin markdown ni viñetas (se lee en un recuadro
 * pequeño, no en un documento) y, si el modelo se pasó del tope, cortada en el
 * último punto antes de él: una explicación a medias de frase no sirve.
 */
export function limpiarExplicacion(salida: string): string {
    let t = (salida || '').replace(/\r\n?/g, '\n').trim();
    if (t.startsWith('```')) t = t.replace(/^```[^\n]*\n?/, '').replace(/\n?`{3,}\s*$/, '');
    t = t
        .replace(/\*\*(?=\S)([^*\n]{1,600}?)\*\*/g, '$1')
        .replace(/__(?=\S)([^_\n]{1,600}?)__/g, '$1')
        .replace(/^#{1,6}[ \t]+/gm, '')
        .replace(/^[ \t]*(?:[-*•]|\d{1,2}[.)])[ \t]+/gm, '');
    const renglones = t.split('\n');
    const primero = renglones[0].trim();
    if (renglones.length > 1 && (CORTESIA.test(primero) || (/[:：]$/.test(primero) && primero.length <= 120))) {
        t = renglones.slice(1).join('\n');
    }
    t = ordenarBlancos(normalizarMarcadores(t));
    const palabras = t.split(/\s+/);
    if (palabras.length > TOPE_EXPLICACION) {
        const corto = palabras.slice(0, TOPE_EXPLICACION).join(' ');
        const punto = Math.max(corto.lastIndexOf('. '), corto.lastIndexOf('.\n'), corto.endsWith('.') ? corto.length - 1 : -1);
        t = punto > corto.length * 0.5 ? corto.slice(0, punto + 1) : `${corto}…`;
    }
    return t;
}
