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
    /** PARA QUÉ SENTIDO SE ESCRIBIÓ LA RAZÓN QUE HAY AHORA EN `criterio`, y si
     *  la escribió el motor o él.
     *
     *  Sin esto no se puede distinguir «este texto lo redactó la máquina para
     *  el sentido anterior» de «esto lo escribí yo». Y esa distinción decide
     *  qué hacer al cambiar de pastilla: lo de la máquina se tira, lo suyo
     *  jamás. Faltaba, y el resultado era que al cambiar de sentido se
     *  conservaba una razón que argumentaba lo contrario —y sobre ella se
     *  construía el estudio—. */
    razonDe?: { sentido: string; delMotor: boolean };
    /* «esencialmente fundado» es el 23% de los agravios en las revisiones que
     * revocan de este circuito, medido sobre su acervo. Prospera igual que el
     * fundado; lo que cambia es que el proyecto acota en qué medida. */
    /* «sin_materia» es el recurso que perdió su objeto por un hecho posterior
     * —el caso frecuente: se recurre la negativa de la suspensión provisional
     * y antes de resolver se dicta la definitiva—. Medido en el circuito: 644
     * expedientes, 434 de ellos quejas. No prospera ni se desestima. */
    /* LAS DIEZ DEL CATÁLOGO, medidas sobre 65,282 agravios del circuito.
     * Ojo con «fundado_insuficiente»: lleva «fundado» en el nombre y NO
     * prospera —12% de apariciones en asuntos favorables, igual que el
     * infundado—. Por eso `prospera` no puede ser un `startsWith`. */
    sentido?: 'fundado' | 'esencialmente_fundado' | 'sustancialmente_fundado'
            | 'parcialmente_fundado' | 'fundado_insuficiente' | 'infundado'
            | 'inoperante' | 'inatendible' | 'ineficaz' | 'sin_materia'
            | 'innecesario';
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
