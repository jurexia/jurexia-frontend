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
