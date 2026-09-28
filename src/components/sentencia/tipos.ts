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
    /** DE QUIÉN ES LA CALIFICACIÓN QUE HAY AHORA: «tuya» (la marcó él),
     *  «motor» (la propuesta), «principal» (la puso el árbol de decisión al
     *  fijar el principal), «distinto» / «propio» (se estudia por su cuenta),
     *  «mayor_beneficio». Y por qué, en una frase que la pantalla enseña. */
    de?: 'tuya' | 'motor' | 'principal' | 'distinto' | 'propio' | 'mayor_beneficio'
        /* Tumbado y recalificado con la premisa del cambio de sentido
           (26-sep-2026). La pantalla no los escribe aquí —viven aparte, en
           `recalificacion.ts`—; el tipo los admite porque /taller/reparto
           puede devolverlos. */
        | 'por_recalificar' | 'recalificada' | '';
    porQue?: string;
    /** El secretario corrigió la pregunta en pantalla (y en el servidor). */
    editada?: boolean;
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

/* ═══════════════════════════════════════════════════════════════════════════
   LA TARJETA «EL PROBLEMA PRINCIPAL Y SU SOLUCIÓN» (28-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   David, tras el AR 631/2025: «una vez que se tienen los problemas jurídicos
   (…) lo más importante es plantearle al secretario cuál es el problema
   principal y cuáles son los secundarios. Y preguntarle cómo resolverías tú
   (…) ¿o quieres resolver en sentido opuesto? dándole la alternativa de
   solución sustentada también».

   Es el reflejo de `GET /taller/tarjeta` (formato 1; contrato_tarjeta.md), que
   arma el servidor SIN llamar a ningún modelo con lo ya calculado: la
   propuesta, el contraste, el árbol de decisión corrido por las dos vías, el
   espejo y la línea de internet. Los nombres son los del servidor, tal cual:
   la lectura tolerante (`tarjetaDe`, api.ts) rellena lo que falte, así que
   aquí nada es opcional salvo lo que el contrato declara nulo. */

/** Cuánto pesa un criterio PARA ESTE TRIBUNAL (un colegiado), calculado por el
 *  servidor: la jurisprudencia de otro colegiado no le obliga (art. 217,
 *  párr. tercero, LA) aunque el acervo la rotule «obligatoria». */
export type FuerzaDelApoyo = 'obliga' | 'orienta' | 'pleno_circuito' | 'precedente_propio' | '';

/** Un criterio con que se aplicaría una vía, HIDRATADO en el servidor contra el
 *  material: el rubro literal, su fuerza y su vigencia. Un registro que no está
 *  en el material no llega como cita (va a `avisos`). Un precepto sin registro
 *  llega con `norma` y lo demás vacío. */
export interface ApoyoDeLaVia {
    registro: string;
    rubro: string;
    instancia: string;
    /** «jurisprudencia» | «aislada» | «precedente». */
    tipo: string;
    fuerza: FuerzaDelApoyo;
    /** Cómo lo dice el servidor («orienta (art. 217, párr. tercero)»). */
    fuerza_texto: string;
    vigencia: string | null;
    de_internet: boolean;
    en_acervo: boolean;
    norma: string | null;
}

/** La suerte de un secundario EN UNA VÍA, según el árbol de decisión.
 *  `previsto` = el árbol lo dejaba por recalificar y lo que se enseña es lo que
 *  el motor escribió para esa vía: no está verificado por el árbol. */
export interface SuerteDelSecundario {
    sentido: string;
    /** «principal» | «arbol» | «motor» | «secretario». */
    de: string;
    por_que: string;
    relacion: string;
    /** «procesal» | «mayor_beneficio_189» | null. */
    guarda: string | null;
    recalificar: boolean;
    previsto: boolean;
}

export interface HechoDeLaCadena { afirma: string; cita: string; fuente: string }

/** Una de las dos vías: cómo sale, con qué, y qué resolutivos se prevén
 *  (`desenlace`, calculado por código con la rama del asunto). */
export interface ViaDeLaTarjeta {
    sentido: string;
    prospera: boolean | null;
    razon: string;
    efecto: string;
    desenlace: string[];
    desenlace_nota: string | null;
    interpretacion: string | null;
    cadena: { regla: string; hechos: HechoDeLaCadena[]; subsuncion: string; conclusion: string } | null;
    objecion: { de_la_otra_via: string; respuesta: string } | null;
    apoyos: ApoyoDeLaVia[];
    via_protectora: { sentido?: string; posible?: boolean; norma?: string; lectura?: string; limite?: string } | null;
}

export interface PrincipalDeLaTarjeta {
    /** 1-based, el de la lista de la fase 3. */
    numero: number;
    pregunta: string;
    clase: string;
    /** Quién lo hizo principal: «fase3» | «secretario» | «por_omision». */
    jerarquia_de: string;
    por_que_principal: string;
    /** El motor tomó OTRO problema como el que decide: se dice, no se elige en
     *  silencio. */
    discrepa_motor: { numero_motor: number | null; nota: string } | null;
    contraste: { razon_toral: string; la_combate: boolean; sobrevive: boolean; veredicto_previo: string } | null;
    prediccion: { frase: string; n: number } | null;
}

export interface SecundarioDeLaTarjeta {
    numero: number;
    pregunta: string;
    clase: string;
    /** «depende» | «presupone» | «distinto» | «autonoma». */
    relacion: string;
    en_propuesta: SuerteDelSecundario | null;
    en_opuesta: SuerteDelSecundario | null;
}

/** Un problema que no cuelga del principal: se estudia aparte, con su propia
 *  propuesta. */
export interface IndependienteDeLaTarjeta {
    numero: number;
    pregunta: string;
    propuesta: { sentido: string; razon: string; apoyos: ApoyoDeLaVia[] } | null;
}

/** Una sentencia del propio tribunal sobre el principal. Tolera los campos de
 *  la OAJ (nivel, calificación, razón, similitud, neun), que llegan cuando se
 *  mezcle la rama precedentes-oaj. */
export interface FilaDeTuTribunal {
    expediente: string;
    fecha: string;
    sentido: string;
    calificacion: string;
    razon: string;
    similitud: number | null;
    /** «mismo_problema» | «posible» | null. */
    nivel: string | null;
    neun: string;
}

/** Nunca un porcentaje: «claro», «reñido» o «no_alcanza», con sus razones.
 *  Vacío = no se sabe (la tarjeta armada en la pantalla, sin el servidor). */
export type EstadoDeLaTarjeta = 'claro' | 'reñido' | 'no_alcanza' | '';

export interface TarjetaDecision {
    formato: number;
    estado_calculo: 'listo' | 'sin_propuesta' | 'calculando';
    huella: string;
    principal: PrincipalDeLaTarjeta | null;
    vias: { propuesta: ViaDeLaTarjeta | null; opuesta: ViaDeLaTarjeta | null };
    recomendada: 'propuesta' | 'opuesta' | null;
    estado: EstadoDeLaTarjeta;
    estado_por_que: string[];
    secundarios: SecundarioDeLaTarjeta[];
    independientes: IndependienteDeLaTarjeta[];
    que_la_cambiaria: {
        en_contra: string;
        crux: { que: string; si_cambia: string; constancia: string } | null;
        constancias_indispensables: string[];
        limite_protector: string | null;
    } | null;
    tu_tribunal: FilaDeTuTribunal[];
    /** Las pistas NUNCA se citan: sólo lo confirmado en el acervo. */
    linea_corte: { confirmadas: ApoyoDeLaVia[]; pistas: string[] };
    deliberacion: {
        origen: string;
        pregunta_decisiva: string;
        figura: string;
        proposicion_toral: { dice: string; cita: string } | null;
    } | null;
    /** En la vía que revoca: los conceptos que el juez no estudió y que hay que
     *  estudiar al reasumir jurisdicción (art. 93, fr. VI, LA). */
    conceptos_omitidos: { hacen_falta: boolean; por_que: string; tenemos: boolean } | null;
    avisos: string[];
    /** NO viene del servidor. «local» = armada en la pantalla con la propuesta
     *  mientras la del servidor no llega (o si el servidor aún no la sirve):
     *  sin estado, sin fuerza de los apoyos y con la suerte de los secundarios
     *  tal como la previó el motor. */
    origen: 'servidor' | 'local';
}
