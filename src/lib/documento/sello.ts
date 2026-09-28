/**
 * QUÉ DICE LA CABECERA DEL SELLO DE CITAS (26-sep-2026).
 *
 * El sello decía «Citas verificadas», en verde, con un subtítulo que decía lo
 * contrario: «1 cita sin comprobar: el servidor no respondió». Pasaba cuando
 * `/cita` agotaba sus reintentos con una cita que el servidor no había
 * marcado (y con una tesis que el Semanario no dejó comprobar): ni una ni otra
 * contaban como problema, así que el sello se ponía verde. Una cita que nadie
 * pudo comprobar no está verificada, aunque tampoco sea un invento: por eso
 * tiene su propio tono, ni verde ni ámbar.
 *
 * Aparte del componente (`@/components/SelloCitas`, que es de cliente) para
 * que la comprobación la pruebe en Node.
 */

export type TonoSello = 'comprobando' | 'problema' | 'incompleto' | 'verificado';

export interface CuentasSello {
    /** Citas no trazadas al acervo (`/cita` dijo 404, o el servidor sin decir cuáles). */
    noTrazadas: number;
    /** Marcadas por el servidor como fuera del contexto. */
    fueraDeContexto: number;
    /** Fichas que `/cita` no pudo dar ni reintentando. */
    sinComprobar: number;
    /** Fichas que todavía se piden a `/cita`. */
    fichasPendientes: number;
    /** ¿Se están comprobando los registros en el Semanario? */
    comprobandoRegistros: boolean;
    /** Registros que no existen en el Semanario. */
    inventadas: number;
    /** Registros que existen pero con otro rubro. */
    desviadas: number;
    /** Tesis citadas sin registro digital. */
    sinRegistro: number;
    /** Registros que el Semanario no dejó comprobar. */
    registrosSinComprobar: number;
}

export function veredictoDelSello(c: CuentasSello): { tono: TonoSello; titulo: string } {
    if (c.comprobandoRegistros || c.fichasPendientes > 0) return { tono: 'comprobando', titulo: 'Comprobando las citas…' };
    if (c.noTrazadas > 0 || c.fueraDeContexto > 0 || c.inventadas > 0 || c.desviadas > 0 || c.sinRegistro > 0) {
        return { tono: 'problema', titulo: 'Revisa estas citas antes de usarlas' };
    }
    if (c.sinComprobar > 0 || c.registrosSinComprobar > 0) {
        return { tono: 'incompleto', titulo: 'No se pudieron comprobar todas las citas' };
    }
    return { tono: 'verificado', titulo: 'Citas verificadas' };
}

/**
 * Cómo quedó cada registro citado en la prosa.
 *
 * `no_corresponde` es el hallazgo del 8-ago-2026: el registro EXISTE pero la
 * respuesta le atribuyó el rubro de otra tesis. Comprobado con un abogado que
 * reportó «al solicitarle tesis, siempre se equivoca»: de 12 pares revisados,
 * 12 mal emparejados —«TUTELA JUDICIAL EFECTIVA» resultó ser «CHEQUES. SON
 * TÍTULOS PAGADEROS A LA VISTA»—. Es MÁS grave que un número inventado: la
 * cita parece verificable, y un abogado que la copia a un escrito queda
 * expuesto.
 */
export type EstadoRegistro = 'existe' | 'no_existe' | 'no_corresponde' | 'sin_comprobar';

export interface ResultadoRegistro {
    registro: string;
    estado: EstadoRegistro;
    rubroReal?: string;
}

/** Lo que contestó `/api/tesis/[registro]`; `null` si la petición falló. */
export interface RespuestaTesis {
    verificada?: boolean;
    rubro?: string;
    motivo?: string;
}

/**
 * El estado de cada registro, a partir de lo que contestó el proxy. Vivía
 * dentro de `SelloCitas`; aquí lo corre también `comprobaciones/tesis_acervo.mjs`.
 *
 *   · Regla de oro: sólo `motivo: 'no_encontrada'` —el Semanario probó que no
 *     existe— da `no_existe`. Cualquier otro fallo es «sin comprobar».
 *   · El acervo manda: un registro que el backend marcó fuera del contexto
 *     (`fueraDelAcervo`) no es trazable aunque exista.
 *   · Existir no basta: se contrasta el rubro citado con el real.
 *
 * EL RUBRO PRESTADO NO ACUSA (28-sep-2026). Cuando el registro va delante del
 * rubro —el formato judicial que pide el prompt de redacción—, la lectura
 * hacia atrás de `rubrosPorRegistro` puede darle a un registro el rubro de la
 * cita de al lado. Ese error es NUESTRO, no del modelo: si el rubro «citado»
 * es el rubro real de OTRO registro de la misma respuesta, no se acusa. Lo que
 * se pierde es cazar un intercambio de rubros entre dos tesis citadas juntas;
 * lo que se gana es no decirle a un abogado que revise una cita correcta.
 */
export function estadosDeLosRegistros(
    registros: string[],
    respuestas: Record<string, RespuestaTesis | null>,
    o: {
        rubros?: Record<string, string>;
        fueraDelAcervo?: string[];
        corresponde: (citado: string, real: string) => boolean;
    },
): ResultadoRegistro[] {
    const reales: Record<string, string> = {};
    for (const r of registros) {
        const d = respuestas[r];
        if (d?.verificada && d.rubro) reales[r] = d.rubro;
    }
    return registros.map((registro): ResultadoRegistro => {
        const d = respuestas[registro];
        if (!d) return { registro, estado: 'sin_comprobar' };
        if (o.fueraDelAcervo?.includes(registro)) return { registro, estado: 'no_corresponde' };
        if (d.verificada) {
            const real = d.rubro || '';
            const citado = o.rubros?.[registro];
            if (citado && !o.corresponde(citado, real)) {
                const prestado = Object.entries(reales).some(([otro, suyo]) => otro !== registro && o.corresponde(citado, suyo));
                if (!prestado) return { registro, estado: 'no_corresponde', rubroReal: real };
            }
            return { registro, estado: 'existe', rubroReal: real };
        }
        if (d.motivo === 'no_encontrada') return { registro, estado: 'no_existe' };
        return { registro, estado: 'sin_comprobar' };
    });
}
