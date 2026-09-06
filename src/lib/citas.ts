/**
 * Lectura de citas de jurisprudencia mexicana.
 *
 * Vivían dentro de `SelloCitas.tsx`, que es un componente `'use client'`. El
 * circuito de incidencias necesita las mismas funciones desde el servidor para
 * verificar una queja de tesis inventada, y copiar las expresiones regulares
 * habría sido garantizar que las dos copias se separaran con el tiempo.
 *
 * Son funciones puras: ni React ni navegador. `SelloCitas` las reexporta, así
 * que nada de lo que ya las importaba cambia.
 */

/**
 * Citas de tesis SIN registro digital: el punto ciego que costó un cliente.
 *
 * EL CASO. El 4-sep-2026 una respuesta le dio a un abogado cinco tesis con su
 * Época, su Instancia, su Fuente y su rubro —«Tesis: I.3o.C.493 C», «1a./J.
 * 82/2014»— y ninguna existía. El sello no dijo nada, y no por un fallo: por
 * diseño. Sólo comprobaba lo escrito como «Registro digital: NNNNNNN», y esas
 * citas no llevaban ninguno. Peor todavía, sin registros el sello ni siquiera
 * se pintaba, así que la respuesta salió limpia, sin insignia y sin aviso.
 *
 * Una cita sin registro NO se puede comprobar: no hay número que consultar en
 * el Semanario. Y lo que no se puede comprobar hay que decirlo, no callarlo.
 *
 * Se buscan las dos formas en que se numeran las tesis mexicanas:
 *   · Salas y Pleno .... 1a./J. 82/2014 · 2a./J. 8/2020 · P./J. 20/2014
 *   · Colegiados ....... I.3o.C.493 C · VI.2o.C. J/207 · I.11o.C.145 C
 * y se da por buena la que lleve un «Registro digital» a menos de 400
 * caracteres: ésa ya la comprueba el resto del sello.
 */
const PATRON_TESIS = new RegExp(
    '(?:(?:1a|2a|3a|4a|P|PC)\\.?\\s*\\/\\s*J\\.?\\s*\\d{1,4}\\/\\d{4})'
    + '|(?:[IVXLC]{1,7}\\.\\d{0,3}[oa]?\\.[A-ZÁÉÍÓÚ]{1,5}\\.\\s*(?:J\\/)?\\s*\\d{1,4}(?:\\s*[A-Z]{1,3})?)',
    'g');

export function citasSinRegistro(texto: string): string[] {
    const fuera = new Set<string>();
    const patron = new RegExp(PATRON_TESIS.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) {
        const cerca = texto.slice(Math.max(0, m.index - 400), m.index + 400);
        if (!/[Rr]egistro(?:\s+digital)?\s*(?:n[úu]m(?:ero)?\.?)?\s*[:.]?\s*\d{6,8}/.test(cerca)) {
            fuera.add(m[0].replace(/\s+/g, ' ').trim());
        }
    }
    return Array.from(fuera);
}

/**
 * Registros digitales citados en la prosa de una respuesta.
 *
 * Se aceptan las formas en que el modelo los escribe de verdad —medido contra
 * producción—: «Registro digital: 2021472», «registro digital 162822» y
 * «Registro: 2006227». Se exigen 6 u 8 dígitos porque el registro del
 * Semanario está en ese rango; así un número de expediente o un artículo no
 * se cuelan como si fueran tesis.
 */
export function registrosDeLaRespuesta(texto: string): string[] {
    const encontrados = new Set<string>();
    const patron = /[Rr]egistro(?:\s+digital)?\s*(?:n[úu]m(?:ero)?\.?)?\s*[:.]?\s*(\d{6,8})/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) encontrados.add(m[1]);
    return Array.from(encontrados);
}

/**
 * El RUBRO que la respuesta atribuye a cada registro.
 *
 * Se busca hacia atrás desde el número: el rubro es el último texto en
 * mayúsculas que aparece antes de «Registro digital: N», que es como se
 * escriben las citas de tesis. Si no se encuentra ninguno, se devuelve
 * cadena vacía y ese registro sólo se comprueba por existencia.
 */
export function rubrosPorRegistro(texto: string): Record<string, string> {
    const mapa: Record<string, string> = {};
    const patron = /[Rr]egistro(?:\s+digital)?\s*(?:n[úu]m(?:ero)?\.?)?\s*[:.]?\s*(\d{6,8})/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) {
        const antes = texto.slice(Math.max(0, m.index - 700), m.index);
        // Tramos largos en mayúsculas: así se escriben los rubros del Semanario.
        const mays = antes.match(/[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9 ,.;:()«»"'\-\/]{24,}/g);
        if (mays?.length) mapa[m[1]] = mays[mays.length - 1].trim();
    }
    return mapa;
}

/** Normaliza para comparar: sin acentos, sin puntuación, sin dobles espacios. */
function norm(t: string): string {
    return (t || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/).filter(Boolean).join(' ');
}

/**
 * ¿El rubro citado se corresponde con el real?
 *
 * Basta con que las primeras palabras coincidan: el modelo a veces recorta el
 * rubro, y exigir identidad literal marcaría como falso un recorte legítimo.
 * Lo que se persigue es el caso grave —registro real con rubro de OTRA
 * tesis—, y ahí las primeras palabras ya no se parecen en nada.
 */
export function rubroCorresponde(citado: string, real: string): boolean {
    const a = norm(citado), b = norm(real);
    if (!a || !b) return true;                 // sin dato, no se acusa
    const inicio = a.split(' ').slice(0, 5).join(' ');
    if (inicio.length < 12) return true;
    return b.includes(inicio) || a.includes(b.split(' ').slice(0, 5).join(' '));
}
