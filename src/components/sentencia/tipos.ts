/**
 * El contrato del taller de sentencias.
 *
 * Estos tipos son el reflejo exacto de las fases del pipeline descritas en
 * `IUREXIA-MAC/PLAN-REDACTOR-ADELANTO.md`. Si una fase cambia allí, cambia
 * aquí: la interfaz no debe inventarse estados que el backend no produce.
 */

export type FaseId =
    | 'ficha'        // 0 · determinista: número, partes, fechas, oportunidad
    | 'ratio'        // 1 · qué resolvió la responsable y por qué
    | 'conceptos'    // 2 · síntesis de conceptos de violación o agravios
    | 'problemas'    // 3 · contraste → problemas jurídicos
    | 'busqueda'     // 4 · un RAG por problema
    | 'criterio'     // 5 · ⏸ el secretario decide
    | 'estudio'      // 6 · redacción con su criterio
    | 'ensamblado'   // 7 · relleno de la plantilla .docx
    | 'verificacion';// 8 · comprobaciones antes de entregar

export type EstadoFase = 'pendiente' | 'corriendo' | 'lista' | 'espera' | 'error';

export interface Fase {
    id: FaseId;
    titulo: string;
    /** Una línea que explica qué hace, en la voz del oficio. */
    detalle: string;
    estado: EstadoFase;
    /** Sólo la fase 5 para: es el único punto donde entra el humano. */
    requiereHumano?: boolean;
    segundos?: number;
}

export type TipoAsunto =
    | 'amparo_directo'
    | 'amparo_revision'
    | 'queja'
    | 'reclamacion'
    | 'revision_fiscal'
    | 'inconformidad'
    | 'impedimento'
    | 'conflicto_competencial';

export type RolDocumento = 'acto' | 'conceptos' | 'certificacion' | 'otro';

export interface Documento {
    id: string;
    nombre: string;
    rol: RolDocumento;
    bytes: number;
    paginas?: number;
    /** `ocr` cuando el PDF venía escaneado y hubo que reconocerlo. */
    via?: 'digital' | 'ocr';
    progreso: number;              // 0-100
    estado: 'subiendo' | 'leyendo' | 'listo' | 'error';
}

/** Una tesis o precepto que el pipeline propone para un problema concreto. */
export interface Candidato {
    tipo: 'tesis' | 'norma' | 'convencional';
    /** Registro digital del Semanario. Sin él no se muestra: ver sello de citas. */
    registro?: string;
    rubro: string;
    instancia?: string;
    /** Por qué el pipeline cree que aplica a ESTE problema. */
    porQue: string;
    /** Verificado contra el Semanario. `false` = existe duda, no se ofrece. */
    verificado: boolean;
}

export interface ProblemaJuridico {
    id: string;
    /** Redactado como pregunta, que es como se resuelve. */
    pregunta: string;
    /** Qué resolvió la responsable sobre este punto. */
    resolvio: string;
    /** El concepto o agravio que lo combate. */
    combate: string;
    candidatos: Candidato[];
    /** Si el pipeline advierte un impedimento técnico que llevaría a inoperancia. */
    impedimento?: { motivo: string; explicacion: string };
    /** Lo que el planteamiento tiene A SU FAVOR. Va emparejado con el
     *  impedimento: un cuestionario que sólo pregunta por lo que descalifica
     *  produce un expediente lleno de razones para no entrar. */
    apoyo?: { motivo: string; explicacion: string };
    /** «principal» es aquel del que dependen los demás: si prospera, el
     *  estudio de los otros queda sin materia. */
    jerarquia?: 'principal' | 'accesorio';
    /** Cómo resolvió el acervo esta misma cuestión. No es un pronóstico de lo
     *  que hará este tribunal, y no se escribe en la sentencia. */
    prediccion?: { sentido: string; porcentaje: number; n: number;
                   confianza: string; frase: string };
    /** El criterio que escribe el secretario para este problema. */
    criterio: string;
    sentido?: 'fundado' | 'infundado' | 'inoperante' | 'ineficaz' | 'innecesario';
}

export interface Asunto {
    numero: string;
    tipo: TipoAsunto;
    quejoso: string;
    magistrado: string;
    secretario: string;
    autoridades: string[];
    actoReclamado: string;
    /** Calculada, nunca redactada: días hábiles contra el calendario del PJF. */
    oportunidad?: { notificacion: string; presentacion: string; plazo: number; enTiempo: boolean };
}
