/**
 * El detector de novedad.
 *
 * Decide, para cada acuerdo que devuelve el portal, si es nuevo, si ya se había
 * visto, o si es uno viejo que el juzgado reeditó. De ahí depende la regla 2
 * —«sólo se escribe cuando hay actuación nueva»— y los dos errores posibles
 * cuestan cosas muy distintas:
 *
 *   · No avisar de algo que pasó es el peor: el silencio de Iurexia significa
 *     «no hubo movimiento» y el abogado se fía.
 *   · Avisar de algo que ya sabía molesta, y a la tercera vez deja de leer los
 *     correos — que acaba siendo el mismo fallo por otra vía.
 *
 * POR QUÉ NO BASTA COMPARAR TEXTO. El portal reimprime espacios, renumera la
 * columna «No.» cuando se intercala un acuerdo atrasado, mueve la fecha de
 * publicación y reedita el resumen para corregir un nombre.
 *
 * POR QUÉ JACCARD Y NO SIMHASH. Se probó el simhash y falla justo en el caso
 * que hay que cazar: corregir «Villalejo» por «Villalejos» en un resumen de
 * veinte trigramas mueve media firma, y la reedición se colaba como acuerdo
 * nuevo. Aquí el candidato ya viene acotado al mismo cuaderno y el mismo día
 * —dos o tres, rara vez más—, así que comparar el texto de verdad sale barato y
 * es exacto. El margen es cómodo: dos autos distintos del mismo día rondan 0.02
 * de parecido y una reedición pasa de 0.75.
 */

import { normalizar } from './pjf';

export const UMBRAL_PARECIDO = 0.62;

export type Conocida = {
    id?: string;
    huella_clave: string;
    huella_texto: string;
    cuaderno: string | null;
    fecha_auto: string | null;
    resumen: string;
    version?: number;
};

type Entrante = {
    huella_clave: string;
    huella_texto: string;
    cuaderno: string | null;
    fecha_auto: string | null;
    resumen: string;
    [k: string]: unknown;
};

function trigramas(t: string) {
    const p = normalizar(t).split(' ').filter(Boolean);
    if (p.length < 3) return new Set(p.length ? [p.join(' ')] : []);
    return new Set(p.slice(0, -2).map((_, i) => p.slice(i, i + 3).join(' ')));
}

/** Jaccard sobre trigramas de palabra. 1 idéntico, 0 nada en común. */
export function parecido(a: string, b: string) {
    const ta = trigramas(a), tb = trigramas(b);
    if (!ta.size || !tb.size) return ta.size === tb.size ? 1 : 0;
    let comunes = 0;
    ta.forEach(x => { if (tb.has(x)) comunes++; });
    return comunes / (ta.size + tb.size - comunes);
}

export type Dictamen<T> = {
    nuevas: T[];
    reediciones: (T & { reemplaza_a?: string; version: number; motivo: string })[];
    linea_base: T[];
    ya_vistas: number;
};

export function comparar<T extends Entrante>(
    acuerdos: T[], conocidas: Conocida[], esAlta = false,
): Dictamen<T> {
    const porClave = new Map<string, Conocida>();
    for (const c of conocidas) {
        const previa = porClave.get(c.huella_clave);
        if (!previa || (c.version || 1) > (previa.version || 1)) {
            porClave.set(c.huella_clave, c);
        }
    }

    // Índice del desempate: mismo cuaderno y misma fecha del auto.
    const porDia = new Map<string, Conocida[]>();
    for (const c of conocidas) {
        const k = `${normalizar(c.cuaderno || '')}|${c.fecha_auto}`;
        porDia.set(k, [...(porDia.get(k) || []), c]);
    }

    const nuevas: T[] = [];
    const reediciones: Dictamen<T>['reediciones'] = [];
    let yaVistas = 0;

    for (const a of acuerdos) {
        const previa = porClave.get(a.huella_clave);

        if (previa) {
            if (previa.huella_texto === a.huella_texto) { yaVistas++; continue; }
            reediciones.push({ ...a, reemplaza_a: previa.id,
                version: (previa.version || 1) + 1, motivo: 'texto_cambiado' });
            continue;
        }

        // La identidad no existe. Antes de declararla nueva, el desempate: una
        // reedición que toque los primeros 300 caracteres cambia la huella y,
        // sin esto, se colaría como acuerdo nuevo.
        const candidatas = porDia.get(
            `${normalizar(a.cuaderno || '')}|${a.fecha_auto}`) || [];
        let gemela: Conocida | null = null, mejor = 0;
        for (const c of candidatas) {
            const p = parecido(c.resumen || '', a.resumen || '');
            if (p > mejor) { gemela = c; mejor = p; }
        }

        if (gemela && mejor >= UMBRAL_PARECIDO) {
            reediciones.push({
                ...a,
                // Se conserva la identidad ANTIGUA: si no, la siguiente lectura
                // volvería a verla como nueva.
                huella_clave: gemela.huella_clave,
                reemplaza_a: gemela.id,
                version: (gemela.version || 1) + 1,
                motivo: `cabecera_reeditada(${mejor.toFixed(2)})`,
            });
            continue;
        }

        nuevas.push(a);
    }

    if (esAlta) {
        // Todo el histórico entra marcado y callado. Sin esto, el primer día el
        // abogado recibe años de acuerdos de golpe y se da de baja.
        return { nuevas: [], reediciones: [],
                 linea_base: [...nuevas, ...reediciones as unknown as T[]],
                 ya_vistas: yaVistas };
    }
    return { nuevas, reediciones, linea_base: [], ya_vistas: yaVistas };
}

/**
 * ¿Se manda correo?
 *
 * El tope es una válvula: si un solo expediente genera más de diez actuaciones
 * nuevas en un día, casi siempre es que el detector se equivocó y no que el
 * juzgado tuvo una mañana movida. Antes que mandar un correo con cuarenta
 * acuerdos, se calla y se escala.
 */
export function hayQueAvisar(n: number, tope = 10) {
    if (n === 0) return { avisar: false, motivo: 'sin_novedad' as const };
    if (n > tope) return { avisar: false, motivo: 'demasiadas' as const, escalar: true };
    return { avisar: true, motivo: 'novedad' as const };
}
