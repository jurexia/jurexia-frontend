/**
 * EL PÁRRAFO DE UNA SENTENCIA, LOCALIZADO EN SU PDF (25-sep-2026).
 *
 * Para la Corte IDH el visor ya no busca un rótulo («Artículo 190») ni la
 * frase más parecida: el backend le dice la PÁGINA donde empieza el párrafo,
 * su NÚMERO y un ANCLA (sus ~15 primeras palabras literales), medidos al
 * trocear el mismo archivo que se abre (`pdf_sha1`). Con eso el trabajo es
 * confirmar, no adivinar:
 *
 *   1. se mira la página dicha y, si no está, ±1 y ±2 (y se deja de buscar en
 *      cuanto aparece);
 *   2. el comienzo es un fragmento que abre renglón y dice exactamente «124.»
 *      —no «124.1», no «1124.», no una remisión a mitad de línea—, y se da por
 *      bueno sólo si en los 600 caracteres siguientes están las palabras del
 *      ancla;
 *   3. el final es el «125.» siguiente, con el mismo cuerpo de letra: las
 *      notas al pie van en 8 pt y también empiezan renglones con «140.» (lo
 *      hay en la pág. 53 de Almonacid).
 *
 * Por qué no basta el número: en la pág. 53 de Almonacid, fuera del ¶124,
 * hay otros tres números de párrafo que abren renglón (125, 126, 127) y uno
 * más en las notas; y en los votos la numeración vuelve a empezar, así que
 * «12.» existe en la sentencia y en cada voto. El ancla es lo que distingue.
 *
 * Funciones puras, sin pdf.js ni React: el visor les pasa el texto de cada
 * página y la prueba en Node (`prueba_visor_coidh.mjs`) las corre sobre los
 * PDF oficiales con los mismos puntos que se escribirán en Qdrant.
 */

/** Un fragmento de texto tal como lo da `page.getTextContent()`. */
export type ItemPdf = {
    str: string;
    hasEOL?: boolean;
    /** [a, b, c, d, x, y]: la y (índice 5) dice en qué renglón está. */
    transform?: number[];
    height?: number;
};

/** Dónde cae cada fragmento dentro del texto plano de la página. */
export type Trozo = { inicio: number; fin: number; indice: number };

export type PlanoPagina = { plano: string; trozos: Trozo[]; items: ItemPdf[] };

/** Un trecho resaltado: de `desde` a `hasta` en el texto plano de una página. */
export type Tramo = { pagina: number; desde: number; hasta: number };

export type Localizacion = {
    /** La página donde empieza el párrafo (la del botón «Ir al párr. N»). */
    pagina: number;
    tramos: Tramo[];
    /** Cómo se fijó el comienzo: por el número o por el ancla (ventanas sin numerar). */
    inicio: 'numero' | 'ancla';
    /** Si el ancla confirmó lo encontrado. Sin ancla, sólo hay número. */
    confirmado: boolean;
    /** Cómo se fijó el final: el número siguiente, el final del texto guardado, o el final de la página. */
    fin: 'siguiente' | 'texto' | 'pagina';
};

/** Sin acentos, sin mayúsculas, sin puntuación y con los espacios colapsados. */
export function normalizar(t: string): string {
    return (t || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        // Tras quitar los diacríticos todo lo que importa es ASCII —la ñ se
        // descompone en n—, así que no hace falta la clase unicode, que además
        // exige un `target` más nuevo del que compila este proyecto.
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Texto plano de una página, con el mapa de qué fragmento es cada letra.
 *
 * LOS FRAGMENTOS SE PEGAN COMO LOS PEGA PDF.JS. pdf.js parte una palabra en
 * dos fragmentos cuando cambia el interletraje: en la supervisión de Gelman
 * (pág. 15) salen «Precisamente los a» + «rtículos», «L» + «ey 18.831» y
 * «pretende» + «n». Unirlos siempre con un espacio —como hace el visor de
 * leyes— dejaba «los a rticulos» y el ancla no aparecía nunca. Los espacios
 * de verdad llegan como fragmentos propios (« ») o con `hasEOL`, así que dos
 * fragmentos seguidos de letra a letra, en el mismo renglón y con el mismo
 * cuerpo, son la misma palabra. Una llamada a nota voladita pegada a la
 * palabra («contexto³²») NO: va más alta y más chica.
 */
export function planoDeItems(items: ItemPdf[]): PlanoPagina {
    let plano = '';
    const trozos: Trozo[] = [];
    let huboEspacio = false;
    let previo: ItemPdf | null = null;
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const crudo = it.str || '';
        const t = normalizar(crudo);
        if (t) {
            const mismoRenglon = Boolean(
                previo && previo.transform && it.transform &&
                Math.abs(previo.transform[5] - it.transform[5]) < 0.5 &&
                Math.abs((previo.height || 0) - (it.height || 0)) < 0.5,
            );
            const pegado = Boolean(
                previo && !huboEspacio && mismoRenglon &&
                /[0-9A-Za-zÀ-ÿ]$/.test(previo.str) && /^[0-9A-Za-zÀ-ÿ]/.test(crudo),
            );
            if (plano && !pegado) plano += ' ';
            trozos.push({ inicio: plano.length, fin: plano.length + t.length, indice: i });
            plano += t;
            previo = it;
            huboEspacio = false;
        }
        if (!t || /\s$/.test(crudo) || it.hasEOL) huboEspacio = true;
    }
    return { plano: plano + ' ', trozos, items };
}

/** «124» → «124»; «124.» → «124»; «82.1» → «82.1»; lo demás, null. */
export function numeroDeParrafo(p: string | number | null | undefined): string | null {
    if (p === null || p === undefined) return null;
    const m = String(p).trim().match(/^(\d{1,4}(?:\.\d{1,3})?)\.?$/);
    return m ? m[1] : null;
}

/** El número que abre el párrafo siguiente: 124 → 125, 82.1 → 82.2. */
export function siguienteNumero(n: string): string {
    const partes = n.split('.');
    partes[partes.length - 1] = String(Number(partes[partes.length - 1]) + 1);
    return partes.join('.');
}

function escaparRx(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function noVacio(it: ItemPdf | undefined): boolean {
    return Boolean(it && (it.str || '').trim());
}

/**
 * ¿El fragmento abre renglón? El número de un párrafo va al margen; una
 * remisión («véase el párrafo 124.») o una llamada a nota van a media línea.
 *
 * Manda `hasEOL` del fragmento anterior. Si no lo trae, hace falta BAJAR de
 * renglón y VOLVER a la izquierda: una llamada a nota voladita también cambia
 * de altura (4.4 puntos en C-71, pág. 24) pero sigue a la derecha, y tomarla
 * por comienzo de renglón hacía creer que ahí empezaban las notas al pie.
 */
function abreRenglon(items: ItemPdf[], i: number): boolean {
    const ti = items[i].transform;
    for (let j = i - 1; j >= 0; j--) {
        const it = items[j];
        if (it.hasEOL) return true;
        if (!noVacio(it)) continue;
        const tj = it.transform;
        if (!ti || !tj) return false;
        const alto = items[i].height || it.height || 0;
        return tj[5] - ti[5] > alto * 0.8 && ti[4] < tj[4];
    }
    return true;
}

type Marca = { indice: number; inicio: number; alto: number };

/** Los fragmentos que abren renglón con exactamente «N.». */
function marcasDe(p: PlanoPagina, numero: string): Marca[] {
    const n = escaparRx(numero);
    // «124.» o «124. La Corte…», pero no «124.1» (un subpárrafo) ni «1124.».
    const conPunto = new RegExp(`^\\s*${n}\\.(?!\\d)`);
    // El número y su punto en fragmentos distintos: en Tibi el «229» va en
    // 10 pt y el punto en 12, y pdf.js los entrega por separado.
    const solo = new RegExp(`^\\s*${n}\\s*$`);
    const salida: Marca[] = [];
    for (const t of p.trozos) {
        const it = p.items[t.indice];
        const s = it.str || '';
        let es = conPunto.test(s);
        if (!es && solo.test(s)) {
            let k = t.indice + 1;
            while (k < p.items.length && !noVacio(p.items[k])) k++;
            es = k < p.items.length && /^\s*\.(?!\d)/.test(p.items[k].str);
        }
        if (es && abreRenglon(p.items, t.indice)) {
            salida.push({ indice: t.indice, inicio: t.inicio, alto: it.height || 0 });
        }
    }
    return salida;
}

/** Palabras del ancla que sirven para confirmar: las cortas no distinguen. */
function clavesDe(ancla: string): string[] {
    const vistas: Record<string, true> = {};
    return normalizar(ancla).split(' ').filter((w) => {
        if (w.length <= 3 || vistas[w]) return false;
        vistas[w] = true;
        return true;
    });
}

/** Cuántas claves aparecen como palabra entera en el trecho. */
function puntaje(trecho: string, claves: string[]): number {
    const t = ` ${trecho} `;
    return claves.filter((w) => t.indexOf(` ${w} `) !== -1).length;
}

/** La primera aparición de las primeras palabras del ancla, de la frase más larga a la más corta. */
function buscarAncla(plano: string, palabras: string[], desde = 0): number {
    for (const largo of [10, 7, 5]) {
        if (palabras.length < largo) continue;
        const i = plano.indexOf(palabras.slice(0, largo).join(' '), desde);
        if (i !== -1) return i;
    }
    return -1;
}

/** El alto de letra del fragmento en esa posición del texto plano. */
function altoEn(p: PlanoPagina, pos: number): number {
    for (const t of p.trozos) {
        if (t.fin > pos) return p.items[t.indice].height || 0;
    }
    return 0;
}

/**
 * Dónde empiezan las notas al pie de la página, a partir de `desde`: el
 * primer fragmento que abre renglón AL MARGEN IZQUIERDO con sólo un número
 * voladito (en Almonacid, «149» a 5 pt frente a un cuerpo de 10). Dentro del
 * texto las llamadas van a media línea; y cuando pdf.js pone la llamada justo
 * después de un fin de renglón («…de 1989³⁵» en Tibi, pág. 39), queda a la
 * derecha, no en el margen, y tampoco se confunde.
 */
function inicioDeNotas(p: PlanoPagina, desde: number, alto: number): number {
    if (!alto) return p.plano.length;
    let margen = Infinity;
    for (const t of p.trozos) {
        const tr = p.items[t.indice].transform;
        if (tr && tr[4] < margen) margen = tr[4];
    }
    for (const t of p.trozos) {
        if (t.inicio < desde) continue;
        const it = p.items[t.indice];
        const h = it.height || 0;
        const x = it.transform ? it.transform[4] : margen;
        if (h > 0 && h < alto * 0.7 && x - margen < 25 && /^\s*\d{1,4}\s*$/.test(it.str) && abreRenglon(p.items, t.indice)) {
            return t.inicio;
        }
    }
    return p.plano.length;
}

/**
 * En una página de continuación, lo primero que aparece es el encabezado o el
 * folio («54», a 8 pt; en otros PDF, «-14-» con la letra del texto). El
 * párrafo sigue en el primer fragmento con el cuerpo de letra del texto que
 * no sea un número suelto.
 */
function inicioDeCuerpo(p: PlanoPagina, alto: number): number {
    for (let k = 0; k < p.trozos.length; k++) {
        const t = p.trozos[k];
        const it = p.items[t.indice];
        const h = it.height || 0;
        if (alto && h < alto * 0.85) continue;
        // El folio con la letra del texto («24» en C-71): el primer número
        // suelto de la página.
        if (k === 0 && /^[\s\-–—]*\d{1,4}[\s\-–—]*$/.test(it.str)) continue;
        return t.inicio;
    }
    return 0;
}

export type Peticion = {
    total: number;
    /** Página del PDF en base 1 donde empieza el párrafo. Sin ella se recorre el documento. */
    pagina?: number | null;
    parrafo?: string | number | null;
    ancla?: string | null;
    /**
     * El texto guardado del párrafo o de la ventana. Sirve para cerrar el
     * resaltado de una ventana sin numerar o de un párrafo sin «N+1.»
     * detrás; si viene recortado, se dice con `textoCompleto: false`.
     */
    texto?: string | null;
    textoCompleto?: boolean;
    /** El texto plano de la página n (base 1). */
    leer: (n: number) => Promise<PlanoPagina>;
};

/** Páginas en el orden en que se miran: la dicha, ±1, ±2. Sin página, todas. */
export function ordenDePaginas(total: number, pagina?: number | null): number[] {
    if (!pagina || pagina < 1) {
        return Array.from({ length: Math.min(total, 500) }, (_, i) => i + 1);
    }
    const base = Math.min(pagina, total);
    return [base, base + 1, base - 1, base + 2, base - 2].filter((n) => n >= 1 && n <= total);
}

export async function localizarParrafo(o: Peticion): Promise<Localizacion | null> {
    const leidas: Record<number, PlanoPagina> = {};
    const leer = async (n: number) => (leidas[n] = leidas[n] || (await o.leer(n)));

    const numero = numeroDeParrafo(o.parrafo);
    const claves = clavesDe(o.ancla || '');
    const palabrasAncla = normalizar(o.ancla || '').split(' ').filter(Boolean);
    // Seis de cada diez claves, y al menos dos; pero un ancla de una sola
    // clave («por unanimidad,», el ¶55 de C-8) no puede exigir dos.
    const umbral = Math.min(claves.length, Math.max(2, Math.ceil(claves.length * 0.6)));
    const largoNumero = numero ? normalizar(numero).length : 0;
    // Las primeras palabras del ancla, que deben venir PEGADAS al número.
    const cabezaAncla = palabrasAncla.slice(0, 4).join(' ');
    // El comienzo del texto guardado, sin la cabecera «[Corte IDH | …]».
    const palabrasTexto = normalizar((o.texto || '').replace(/^\s*\[[^\]]*\]/, ' ')).split(' ').filter(Boolean);

    /**
     * El texto del CUERPO que sigue a una posición: sin las notas al pie y,
     * si la página se acaba, siguiendo en la próxima. En Almonacid el «54.» y
     * el epígrafe «Alegatos del Representante» cierran la pág. 12 y el texto
     * del párrafo empieza en la 13: mirar sólo 600 caracteres de la misma
     * página era mirar las notas.
     */
    const cuerpoTras = async (n: number, desde: number, largo: number): Promise<string> => {
        let salida = '';
        for (let m = n; m <= Math.min(o.total, n + 1) && salida.length < largo; m++) {
            const p = await leer(m);
            const alto = altoEn(p, m === n ? desde : 0) || 0;
            const ini = m === n ? desde : inicioDeCuerpo(p, alto);
            salida += ' ' + p.plano.slice(ini, inicioDeNotas(p, ini, alto));
        }
        return salida.replace(/\s+/g, ' ').trim().slice(0, largo);
    };

    let inicio: { pagina: number; desde: number; tipo: 'numero' | 'ancla'; confirmado: boolean } | null = null;
    const orden = ordenDePaginas(o.total, o.pagina);

    for (let k = 0; k < orden.length && !inicio; k++) {
        const n = orden[k];
        const p = await leer(n);

        // A. «N.» al margen, confirmado por el ancla: o sus primeras palabras
        // vienen pegadas al número, o el cuerpo que sigue trae la mayoría de
        // sus claves.
        let mejor: { marca: Marca; puntos: number } | null = null;
        let marcas: Marca[] = [];
        if (numero) {
            marcas = marcasDe(p, numero);
            for (const m of marcas) {
                const tras = await cuerpoTras(n, m.inicio + largoNumero, 600);
                const pegada = cabezaAncla !== '' && tras.startsWith(cabezaAncla);
                const puntos = pegada ? claves.length + 1 : puntaje(tras, claves);
                if (!mejor || puntos > mejor.puntos) mejor = { marca: m, puntos };
            }
        }
        const confirmado = Boolean(mejor && claves.length > 0 && mejor.puntos >= umbral);

        // B. El ancla misma. Si aparece LEJOS del número confirmado, lo citado
        // es una ventana a media altura de un párrafo largo (C-114 ¶90 va en
        // 62 ventanas y cada una trae su propia ancla y su página): se empieza
        // en la ventana, no en el «90.» de tres páginas atrás.
        //
        // Si el ancla no aparece, se prueba con el comienzo del texto guardado:
        // en 536 de los 16,825 puntos del piloto el ancla NO es el comienzo de
        // su texto (casi todos, ventanas de párrafos partidos), y 8 de los 10
        // que no se encontraban eran de ésos.
        let posAncla = palabrasAncla.length >= 5 ? buscarAncla(p.plano, palabrasAncla) : -1;
        if (posAncla === -1 && palabrasTexto.length >= 7) posAncla = buscarAncla(p.plano, palabrasTexto);

        if (confirmado && mejor) {
            const tras = mejor.marca.inicio + largoNumero;
            if (posAncla !== -1 && posAncla - tras > 40) {
                inicio = { pagina: n, desde: posAncla, tipo: 'ancla', confirmado: true };
            } else {
                inicio = { pagina: n, desde: mejor.marca.inicio, tipo: 'numero', confirmado: true };
            }
        } else if (posAncla !== -1) {
            inicio = { pagina: n, desde: posAncla, tipo: 'ancla', confirmado: true };
        } else if (!claves.length && k === 0 && marcas.length === 1) {
            // Sin ancla con qué confirmar, sólo se acepta un número único en la
            // página dicha; el visor lo avisa para que se coteje a ojo.
            inicio = { pagina: n, desde: marcas[0].inicio, tipo: 'numero', confirmado: false };
        }
    }
    if (!inicio) return null;

    const pInicio = await leer(inicio.pagina);
    const alto = altoEn(pInicio, inicio.desde);
    // Hasta cuatro páginas más: el párrafo más largo del censo que cabe en
    // una unidad ocupa tres.
    const ultima = Math.min(o.total, inicio.pagina + 4);
    type Punto = { pagina: number; hasta: number };
    const antes = (a: Punto, b: Punto) => a.pagina < b.pagina || (a.pagina === b.pagina && a.hasta <= b.hasta);

    /**
     * Cuánto TEXTO DEL CUERPO hay entre dos puntos, sin contar las notas al
     * pie ni el folio de la página siguiente. Entre el final de un párrafo y
     * el «N+1.» que lo sigue sólo caben llamadas a nota («…Americana.149»);
     * si hay más, ese «N+1.» es de otra cosa.
     */
    const cuerpoEntre = async (a: Punto, b: Punto): Promise<number> => {
        let total = 0;
        for (let n = a.pagina; n <= b.pagina; n++) {
            const p = await leer(n);
            const desde = n === a.pagina ? a.hasta : inicioDeCuerpo(p, alto);
            const hasta = n === b.pagina ? b.hasta : inicioDeNotas(p, desde, alto);
            total += Math.max(0, hasta - desde);
        }
        return total;
    };

    // Los «N+1.» que siguen, con el mismo cuerpo de letra que el comienzo:
    // las notas al pie también abren renglón con números («140.» en la
    // pág. 53 de Almonacid) y van en 8 pt frente a 10.
    const siguientes: Punto[] = [];
    if (numero) {
        const sig = siguienteNumero(numero);
        for (let n = inicio.pagina; n <= ultima; n++) {
            const p = await leer(n);
            for (const m of marcasDe(p, sig)) {
                if (n === inicio.pagina && m.inicio <= inicio.desde) continue;
                if (alto && m.alto && m.alto < alto * 0.85) continue;
                siguientes.push({ pagina: n, hasta: m.inicio });
            }
        }
    }

    // El final del texto guardado: sus últimas palabras. Una frase puede
    // repetirse dentro del párrafo («…de las fuerzas armadas de Honduras» sale
    // dos veces en C-5 ¶31), así que de todas sus apariciones se toma la que
    // deja el resaltado más parecido en largo al texto guardado. Si cae en la
    // zona de notas, el texto guardado trae notas pegadas —pasa en PDF viejos
    // con las notas en 9 pt— y no sirve de guía.
    let finTexto: Punto | null = null;
    const cuerpo = normalizar((o.texto || '').replace(/^\s*\[[^\]]*\]/, ' '));
    const palabras = cuerpo.split(' ').filter(Boolean);
    if (o.textoCompleto !== false && palabras.length >= 2) {
        const cola = palabras.slice(-8).join(' ');
        let recorrido = 0;
        let mejorDif = Infinity;
        for (let n = inicio.pagina; n <= ultima; n++) {
            const p = await leer(n);
            const base = n === inicio.pagina ? inicio.desde : 0;
            const notas = inicioDeNotas(p, base, alto);
            for (let i = p.plano.indexOf(cola, base); i !== -1; i = p.plano.indexOf(cola, i + 1)) {
                if (i >= notas) break;
                const dif = Math.abs(recorrido + (i + cola.length - base) - cuerpo.length);
                if (dif < mejorDif) {
                    mejorDif = dif;
                    finTexto = { pagina: n, hasta: i + cola.length };
                }
            }
            // Sólo cuenta el cuerpo: las notas de una página llena pesan más
            // que una ventana entera (Tibi, págs. 38-39).
            recorrido += Math.max(0, notas - base);
            if (recorrido > cuerpo.length * 2 + 400) break;
        }
    }

    let fin: Punto | null = null;
    let tipoFin: Localizacion['fin'] = 'pagina';
    if (finTexto) {
        // El primer «N+1.» que venga DESPUÉS del final del texto y sin cuerpo
        // de por medio. Uno anterior es una lista numerada citada dentro del
        // párrafo (C-31 ¶2 transcribe los resolutivos «3. Decide…»); uno con
        // texto de por medio es de otro segmento —el «9.» de los resolutivos
        // tras el último párrafo, el «9.» del voto siguiente, la lista de
        // víctimas del anexo—.
        for (const s of siguientes) {
            if (!antes(finTexto, s)) continue;
            if ((await cuerpoEntre(finTexto, s)) <= 40) {
                fin = s;
                tipoFin = 'siguiente';
            }
            break;
        }
        if (!fin) {
            fin = finTexto;
            tipoFin = 'texto';
        }
    } else if (siguientes.length && inicio.tipo === 'numero') {
        fin = siguientes[0];
        tipoFin = 'siguiente';
    }
    if (!fin) {
        // Sin texto con qué cerrar ni número siguiente: hasta donde empiezan
        // las notas de la página. Se pinta de más, pero no de menos.
        fin = { pagina: inicio.pagina, hasta: inicioDeNotas(pInicio, inicio.desde, alto) };
        tipoFin = 'pagina';
    }

    // Los tramos, página por página, sin las notas al pie ni el folio de las
    // páginas por las que el párrafo sólo pasa.
    const tramos: Tramo[] = [];
    for (let n = inicio.pagina; n <= fin.pagina; n++) {
        const p = await leer(n);
        const desde = n === inicio.pagina ? inicio.desde : inicioDeCuerpo(p, alto);
        const hasta = n === fin.pagina ? fin.hasta : inicioDeNotas(p, desde, alto);
        if (hasta > desde) tramos.push({ pagina: n, desde, hasta });
    }

    return {
        pagina: inicio.pagina,
        tramos,
        inicio: inicio.tipo,
        confirmado: inicio.confirmado,
        fin: tipoFin,
    };
}

/** Los índices de los fragmentos que toca un tramo, para pintarlos. */
export function itemsDelTramo(p: PlanoPagina, tramo: Tramo): number[] {
    return p.trozos.filter((t) => t.fin > tramo.desde && t.inicio < tramo.hasta).map((t) => t.indice);
}

/* ═══════════════════════════════════════════════════════════════════════
 * EL PASAJE DE UNA OBRA, SIN NÚMERO DE PÁRRAFO (25-sep-2026).
 *
 * La doctrina (colección `doctrina`, cinco libros de la BJV-UNAM) llega con
 * lo mismo que la Corte IDH salvo el número: la PÁGINA del PDF del capítulo
 * (`pagina_pdf`), un ANCLA (sus ~15 primeras palabras literales) y el texto
 * del trozo. `localizarParrafo` ya sabía empezar por el ancla cuando no hay
 * número —las ventanas de los votos sin numerar—, pero con `indexOf` sobre
 * el texto normalizado, y el texto de estos libros NO se parece al de pdf.js
 * letra por letra:
 *
 *   · el troceador (PyMuPDF) separó sílabas en el libro de Carbonell: «la co
 *     mu ni -\nca ción de ma sas», donde pdf.js da «la comunicación de masas»;
 *   · los trozos empiezan y acaban a media palabra («sticia Internacional»,
 *     «pro-dere»), y los cortes de renglón llevan guion («ju-\ndicialización»);
 *   · el trozo arrastra lo que PyMuPDF leyó alrededor del cuerpo —el folio,
 *     el título corrido, las notas al pie, el colofón de la BJV—, y hay trozos
 *     que son CASI SÓLO notas (Panorámica, pág. 33: una línea de cuerpo y las
 *     notas 121 a 126) o una portada entera.
 *
 * Por eso aquí se compara SIN ESPACIOS: sólo letras y números, en minúsculas y
 * sin acentos (con NFKD, que además deshace las ligaduras «ﬁ»). Una ventana de
 * 48 letras seguidas —nueve o diez palabras— no se repite por azar en cinco
 * páginas, y es inmune a cómo se partieron las palabras.
 *
 *   1. el COMIENZO: ventanas del ancla y, si no aparece, del texto del trozo
 *      (desde varias de sus primeras palabras, para saltar el folio y el
 *      título corrido), en la página dicha y en ±1, ±2; luego se extiende
 *      hacia atrás mientras el texto siga casando;
 *   2. lo que se PINTA, desde ahí: cada fragmento de pdf.js (un renglón, casi
 *      siempre) cuyo texto está DENTRO del texto del trozo. Así se pintan las
 *      notas que son del trozo y no las que no, sin adivinar dónde empiezan;
 *      los fragmentos cortos («121», una versalita suelta) se pintan si están
 *      entre dos que sí; el colofón de la BJV, nunca;
 *   3. el FINAL: tres renglones seguidos que no son del trozo; si la página
 *      se acaba antes, se sigue en la siguiente, saltando su título corrido.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Sólo letras y números, sin acentos ni ligaduras: la forma en que se comparan libro y trozo. */
export function palabrasCompactas(t: string | null | undefined): string[] {
    return normalizar((t || '').normalize('NFKD')).split(' ').filter(Boolean);
}

type Compacto = { c: string; pos: number[] };
const compactos = new WeakMap<PlanoPagina, Compacto>();

/** El texto plano de la página sin espacios, con la posición de cada letra en el plano. */
function compactoDe(p: PlanoPagina): Compacto {
    const previo = compactos.get(p);
    if (previo) return previo;
    let c = '';
    const pos: number[] = [];
    for (let i = 0; i < p.plano.length; i++) {
        if (p.plano[i] !== ' ') {
            c += p.plano[i];
            pos.push(i);
        }
    }
    const hecho = { c, pos };
    compactos.set(p, hecho);
    return hecho;
}

/** La ventana que empieza en la palabra k y junta al menos `letras` letras; null si no alcanzan. */
function ventanaDesde(pal: string[], k: number, letras: number): string | null {
    let v = '';
    for (let j = k; j < pal.length && v.length < letras; j++) v += pal[j];
    return v.length >= letras ? v : null;
}

export type PeticionPasaje = {
    total: number;
    /** Página del PDF en base 1 donde está el pasaje. Sin ella se recorre el documento (hasta 500). */
    pagina?: number | null;
    /** Las ~15 primeras palabras literales del cuerpo del trozo. */
    ancla?: string | null;
    /**
     * El texto del trozo, tal como se guardó (con su folio, su título corrido
     * y sus notas). Recortado (`FUENTES_PREVIAS`), se pinta lo que alcanza.
     */
    texto?: string | null;
    leer: (n: number) => Promise<PlanoPagina>;
};

export type LocalizacionPasaje = Localizacion & {
    /** Los fragmentos que se pintan, por página: no todo lo que hay entre el comienzo y el final es del trozo. */
    porPagina: Record<number, number[]>;
};

/** Cuántas letras debe tener una ventana del comienzo para darla por buena. */
const LETRAS_FIRMES = 48;
/** Una ventana más corta, sólo en la página dicha y sin darla por confirmada. */
const LETRAS_DEBILES = 30;
/** Por debajo de esto un fragmento no dice nada por sí solo: decide su vecindario. */
const LETRAS_FRAGMENTO = 10;
/** El pie que la BJV imprime en cada página: viene en el trozo, pero no es la obra. */
const COLOFON_BJV = /juridicas\.unam\.mx|biblioteca\s+jur[ií]dica\s+virtual|^\s*DR\s*©|ir a la p[aá]gina del libro/i;

export async function localizarPasaje(o: PeticionPasaje): Promise<LocalizacionPasaje | null> {
    const leidas: Record<number, PlanoPagina> = {};
    const leer = async (n: number) => (leidas[n] = leidas[n] || (await o.leer(n)));

    const palAncla = palabrasCompactas(o.ancla);
    const palTexto = palabrasCompactas(o.texto);
    const orden = ordenDePaginas(o.total, o.pagina);

    // Las fuentes del comienzo, en orden de confianza: el ancla desde sus
    // primeras palabras; el texto del trozo desde cualquiera de sus primeras
    // sesenta (el folio y el título corrido ocupan unas diez, y el trozo puede
    // empezar a media palabra).
    const fuentes: { pal: string[]; desdes: number[] }[] = [];
    if (palAncla.length) fuentes.push({ pal: palAncla, desdes: [0, 1, 2, 3, 4, 6] });
    if (palTexto.length) fuentes.push({ pal: palTexto, desdes: Array.from({ length: Math.min(60, palTexto.length) }, (_, i) => i) });

    type Hallazgo = { pagina: number; i: number; pal: string[]; k: number; firme: boolean };
    const buscar = (c: string, letras: number): Omit<Hallazgo, 'pagina' | 'firme'> | null => {
        for (const f of fuentes) {
            for (const k of f.desdes) {
                const v = ventanaDesde(f.pal, k, letras);
                if (!v) break;
                const i = c.indexOf(v);
                if (i !== -1) return { i, pal: f.pal, k };
            }
        }
        return null;
    };

    let hallado: Hallazgo | null = null;
    for (const n of orden) {
        const h = buscar(compactoDe(await leer(n)).c, LETRAS_FIRMES);
        if (h) { hallado = { ...h, pagina: n, firme: true }; break; }
    }
    // Sin ventana larga, una corta y sólo en la página dicha: «de los derechos
    // fundamentales» (26 letras) sale en casi cada página de Carbonell.
    if (!hallado && o.pagina && orden.length) {
        const h = buscar(compactoDe(await leer(orden[0])).c, LETRAS_DEBILES);
        if (h) hallado = { ...h, pagina: orden[0], firme: false };
    }
    if (!hallado) return null;

    // Hacia atrás, palabra por palabra, mientras el texto siga casando: si se
    // halló desde la cuarta palabra del ancla, el pasaje empieza en la primera.
    const pIni = await leer(hallado.pagina);
    const cIni = compactoDe(pIni);
    let iIni = hallado.i;
    for (let j = hallado.k - 1; j >= 0; j--) {
        const w = hallado.pal[j];
        if (iIni >= w.length && cIni.c.slice(iIni - w.length, iIni) === w) iIni -= w.length;
        else break;
    }
    const desde = cIni.pos[iIni];
    const alto = altoEn(pIni, desde);

    // ¿El fragmento es del trozo? Entero dentro del texto; o, en las puntas,
    // el trozo empieza a media línea (su final es el comienzo del texto) o
    // acaba a media línea (su comienzo es el final del texto).
    const T = (palTexto.length ? palTexto : palAncla).join('');
    const cabeza = T.slice(0, 12);
    const cola = T.slice(-12);
    // 'nunca': el colofón, que no se pinta ni aunque quede entre dos renglones del trozo.
    const delTrozo = (str: string): boolean | null | 'nunca' => {
        if (COLOFON_BJV.test(str)) return 'nunca';
        const c = palabrasCompactas(str).join('');
        if (c.length < LETRAS_FRAGMENTO) return null;
        if (T.includes(c)) return true;
        const a = c.indexOf(cabeza);
        if (a !== -1 && T.startsWith(c.slice(a))) return true;
        const z = c.lastIndexOf(cola);
        return z !== -1 && T.endsWith(c.slice(0, z + cola.length));
    };

    const porPagina: Record<number, number[]> = {};
    const tramos: Tramo[] = [];
    let terminado = false;
    for (let n = hallado.pagina; n <= Math.min(o.total, hallado.pagina + 3) && !terminado; n++) {
        const p = await leer(n);
        // Desde el fragmento del comienzo; en las páginas siguientes, desde el
        // cuerpo, sin el título corrido ni el folio.
        const base = n === hallado.pagina ? desde : inicioDeCuerpo(p, alto);
        const trozos = p.trozos.filter((t) => t.fin > base);
        const veredicto = trozos.map((t, k) =>
            n === hallado!.pagina && k === 0 ? true : delTrozo(p.items[t.indice].str));

        // El final: tres fragmentos largos seguidos que no son del trozo. En
        // una página de continuación, si los primeros tres ya no lo son, el
        // trozo acabó en la anterior.
        let corte = trozos.length;
        let ajenos = 0;
        for (let k = 0; k < trozos.length; k++) {
            if (veredicto[k] === true) ajenos = 0;
            else if (veredicto[k] === false && ++ajenos >= 3) { corte = k - 2; terminado = true; break; }
        }
        // Se pinta lo que es del trozo y lo que queda entre dos que lo son.
        const pintar: number[] = [];
        let previo: boolean | 'nunca' | null = null;
        for (let k = 0; k < corte; k++) {
            const v = veredicto[k];
            let pinta = v === true;
            if (v === null || v === false) {
                let siguiente: boolean | 'nunca' | null = null;
                for (let q = k + 1; q < corte && siguiente === null; q++) siguiente = veredicto[q];
                pinta = previo === true && siguiente === true;
            }
            if (v !== null) previo = v;
            if (pinta) pintar.push(k);
        }
        if (!pintar.length) break;
        porPagina[n] = pintar.map((k) => trozos[k].indice);
        tramos.push({ pagina: n, desde: trozos[pintar[0]].inicio, hasta: trozos[pintar[pintar.length - 1]].fin });
    }

    return {
        pagina: hallado.pagina,
        tramos,
        inicio: 'ancla',
        confirmado: hallado.firme,
        fin: terminado ? 'texto' : 'pagina',
        porPagina,
    };
}
