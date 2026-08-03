/**
 * El plan de trabajo de una demanda de amparo indirecto.
 *
 * La idea que se toma de Harvey: el abogado describe la tarea, **ve el plan
 * antes de que se ejecute**, lo ajusta y lo aprueba. El trabajo deja de ser una
 * caja negra y el criterio sigue siendo suyo.
 *
 * El plan NO lo inventa el modelo. La demanda de amparo indirecto tiene sus
 * requisitos tasados en el **artículo 108 de la Ley de Amparo**, así que el
 * plan se arma de forma determinista a partir de ellos. Esto no es una
 * preferencia de estilo: el **artículo 114** obliga al órgano a requerir la
 * aclaración cuando se omite cualquiera de esos requisitos, y **si no se
 * subsana en cinco días la demanda se tiene por no presentada**. Un escrito al
 * que le falte una fracción no es un escrito imperfecto: es un escrito que se
 * cae.
 */

export type ClaveVia =
    | 'analisis'
    | 'procedencia'
    | 'autoridades'
    | 'hechos'
    | 'constitucional'
    | 'jurisprudencia'
    | 'conceptos'
    | 'suspension'
    | 'escrito';

export interface PasoPlan {
    clave: ClaveVia;
    titulo: string;
    detalle: string;
    /** Fracción del art. 108 que este paso cubre, si aplica. */
    fraccion?: string;
    /** Qué bases consulta. Vacío si es puro razonamiento. */
    fuentes: string[];
    /** Los obligatorios no se desactivan: sin ellos hay prevención. */
    obligatorio: boolean;
}

export interface DatosAmparo {
    // ── art. 108, fr. I ──
    quejoso: string;
    domicilioQuejoso: string;
    /** Quien promueve en nombre del quejoso, si no es él mismo. */
    promovente: string;

    // ── art. 108, fr. II ──
    terceroInteresado: string;
    /** Si no se conoce, la ley exige manifestarlo bajo protesta de decir verdad. */
    terceroDesconocido: boolean;

    // ── art. 108, fr. III y IV ──
    autoridades: string;
    actoReclamado: string;

    // ── art. 108, fr. V ── el relato que faltaba
    hechos: string;

    // Datos de trámite
    fechaConocimiento: string;
    estado: string;
    urgencia: 'ordinario' | 'sin_plazo';
    pideSuspension: boolean;
    notas: string;
}

export const DATOS_VACIOS: DatosAmparo = {
    quejoso: '',
    domicilioQuejoso: '',
    promovente: '',
    terceroInteresado: '',
    terceroDesconocido: false,
    autoridades: '',
    actoReclamado: '',
    hechos: '',
    fechaConocimiento: '',
    estado: '',
    urgencia: 'ordinario',
    pideSuspension: true,
    notas: '',
};

/** Los ocho requisitos del art. 108, para enseñarle al abogado qué queda cubierto. */
export interface Requisito {
    fraccion: string;
    texto: string;
    /** 'datos' = lo aporta el abogado · 'agente' = lo redacta Iurexia */
    origen: 'datos' | 'agente';
    cubierto: boolean;
    /** Sólo aplica en amparos por invasión de esferas. */
    condicional?: boolean;
}

export function requisitos108(d: DatosAmparo): Requisito[] {
    return [
        {
            fraccion: 'I',
            texto: 'Nombre y domicilio de la persona quejosa y de quien promueve en su nombre',
            origen: 'datos',
            cubierto: Boolean(d.quejoso.trim() && d.domicilioQuejoso.trim()),
        },
        {
            fraccion: 'II',
            texto: 'Nombre y domicilio de la persona tercera interesada, o manifestación bajo protesta de que no se conocen',
            origen: 'datos',
            cubierto: d.terceroDesconocido || Boolean(d.terceroInteresado.trim()),
        },
        {
            fraccion: 'III',
            texto: 'Autoridad o autoridades responsables',
            origen: 'datos',
            cubierto: Boolean(d.autoridades.trim()),
        },
        {
            fraccion: 'IV',
            texto: 'La norma general, acto u omisión que de cada autoridad se reclame',
            origen: 'datos',
            cubierto: Boolean(d.actoReclamado.trim()),
        },
        {
            fraccion: 'V',
            texto: 'Bajo protesta de decir verdad, los hechos o abstenciones que constituyan los antecedentes del acto reclamado',
            origen: 'datos',
            cubierto: Boolean(d.hechos.trim()),
        },
        {
            fraccion: 'VI',
            texto: 'Los preceptos que contengan los derechos humanos y garantías cuya violación se reclame',
            origen: 'agente',
            cubierto: true,
        },
        {
            fraccion: 'VII',
            texto: 'Facultad invadida (sólo si el amparo se promueve por invasión de esferas)',
            origen: 'agente',
            cubierto: true,
            condicional: true,
        },
        {
            fraccion: 'VIII',
            texto: 'Los conceptos de violación',
            origen: 'agente',
            cubierto: true,
        },
    ];
}

/** Los que faltan y provocarían la prevención del art. 114. */
export function faltantes108(d: DatosAmparo): Requisito[] {
    return requisitos108(d).filter((r) => r.origen === 'datos' && !r.cubierto);
}

/**
 * El plazo del amparo indirecto.
 *
 * Regla general: quince días (art. 17). Su fracción IV exime del plazo a los
 * actos que importen peligro de privación de la vida, ataques a la libertad
 * personal fuera de procedimiento, incomunicación, deportación, destierro,
 * desaparición forzada o los prohibidos por el artículo 22 constitucional:
 * pueden promoverse **en cualquier tiempo**.
 *
 * Se calcula en días naturales como aviso temprano. NO sustituye el cómputo en
 * días hábiles del órgano: por eso se devuelve una advertencia, no una fecha.
 */
export function avisoDePlazo(datos: DatosAmparo): { tono: 'neutro' | 'atencion' | 'urgente'; texto: string } | null {
    if (datos.urgencia === 'sin_plazo') {
        return {
            tono: 'neutro',
            texto: 'Por el tipo de acto, la demanda puede promoverse en cualquier tiempo (art. 17, fr. IV, Ley de Amparo).',
        };
    }
    if (!datos.fechaConocimiento) return null;

    const desde = new Date(datos.fechaConocimiento + 'T00:00:00');
    if (Number.isNaN(desde.getTime())) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.floor((hoy.getTime() - desde.getTime()) / 86_400_000);
    if (dias < 0) return null;

    if (dias > 21) {
        return {
            tono: 'urgente',
            texto: `Han pasado ${dias} días naturales desde que se conoció el acto. El plazo genérico es de quince días hábiles (art. 17). Verifica el cómputo antes de promover.`,
        };
    }
    if (dias > 10) {
        return {
            tono: 'atencion',
            texto: `Han pasado ${dias} días naturales. El plazo genérico es de quince días hábiles (art. 17): confirma cuántos hábiles quedan.`,
        };
    }
    return {
        tono: 'neutro',
        texto: `Han pasado ${dias} días naturales desde que se conoció el acto. Plazo genérico: quince días hábiles (art. 17).`,
    };
}

/** Arma el plan según los datos. Determinista: mismos datos, mismo plan. */
export function construirPlan(datos: DatosAmparo): PasoPlan[] {
    const entidad = datos.estado ? `legislación de ${datos.estado}` : 'legislación estatal';

    const plan: PasoPlan[] = [
        {
            clave: 'analisis',
            titulo: 'Analizar el acto reclamado',
            detalle: 'Clasificar el acto, determinar si es de tracto sucesivo o de ejecución instantánea y si proviene de autoridad para efectos del amparo.',
            fraccion: 'IV',
            fuentes: [],
            obligatorio: true,
        },
        {
            clave: 'procedencia',
            titulo: 'Revisar procedencia y plazo',
            detalle:
                datos.urgencia === 'sin_plazo'
                    ? 'Confirmar que el acto encuadra en el art. 17, fr. IV, y revisar las causales de improcedencia del art. 61.'
                    : 'Cómputo del plazo del art. 17 y revisión de las causales de improcedencia del art. 61.',
            fuentes: ['Ley de Amparo'],
            obligatorio: true,
        },
        {
            clave: 'autoridades',
            titulo: 'Precisar autoridades y lo que de cada una se reclama',
            detalle: 'Separar autoridad ordenadora de ejecutora y atribuir a cada una el acto u omisión concreto, como exige la fr. IV.',
            fraccion: 'III y IV',
            fuentes: ['Ley de Amparo', entidad],
            obligatorio: true,
        },
        {
            clave: 'hechos',
            titulo: 'Ordenar los hechos bajo protesta de decir verdad',
            detalle: 'Convertir tu relato en antecedentes numerados y cronológicos, encabezados por la protesta de decir verdad que exige la fracción V. Sin ella el órgano previene.',
            fraccion: 'V',
            fuentes: [],
            obligatorio: true,
        },
        {
            clave: 'constitucional',
            titulo: 'Identificar los derechos violados',
            detalle: 'Localizar los preceptos constitucionales y convencionales que el acto transgrede, incluidos los arts. 103 y 107.',
            fraccion: 'VI',
            fuentes: ['Constitución', 'Bloque de constitucionalidad'],
            obligatorio: true,
        },
        {
            clave: 'jurisprudencia',
            titulo: 'Buscar jurisprudencia aplicable',
            detalle: 'Tesis y jurisprudencia de la SCJN y de Tribunales Colegiados sobre el acto y los derechos en juego. Cada cita se comprueba contra el Semanario.',
            fuentes: ['Jurisprudencia SCJN', 'Precedentes TCC'],
            obligatorio: false,
        },
        {
            clave: 'conceptos',
            titulo: 'Redactar los conceptos de violación',
            detalle: 'Argumentar la transgresión con silogismo completo: premisa normativa, hecho y conclusión, apoyada en los criterios encontrados.',
            fraccion: 'VIII',
            fuentes: [],
            obligatorio: true,
        },
    ];

    if (datos.pideSuspension) {
        plan.push({
            clave: 'suspension',
            titulo: 'Redactar la suspensión',
            detalle: 'Capítulo de suspensión con la apariencia del buen derecho y el peligro en la demora; provisional y definitiva (arts. 125 a 158).',
            fuentes: ['Ley de Amparo'],
            obligatorio: false,
        });
    }

    plan.push({
        clave: 'escrito',
        titulo: 'Armar el escrito con la estructura del art. 108',
        detalle: 'Proemio, tercero interesado, autoridades, acto reclamado, protesta y hechos, preceptos violados, conceptos de violación, pruebas y petitorios. Se revisa fracción por fracción antes de entregar.',
        fraccion: 'I a VIII',
        fuentes: [],
        obligatorio: true,
    });

    return plan;
}

/**
 * Convierte el plan aprobado en la instrucción que recibe el motor.
 *
 * Va por el chat que ya existe: `[MODO_REDACCION_PRO]` es el mismo marcador del
 * botón de Redacción Pro, así que no hace falta tocar el backend.
 *
 * La estructura del escrito se dicta de forma explícita y en el orden del
 * artículo 108. Dejarla al criterio del modelo era el defecto de la primera
 * versión: redactaba bien y aun así podía omitir una fracción.
 */
export function instruccionDesdePlan(datos: DatosAmparo, pasos: PasoPlan[]): string {
    const lista = pasos.map((p, i) => `${i + 1}. ${p.titulo}: ${p.detalle}`).join('\n');

    const tercero = datos.terceroDesconocido
        ? 'No se conoce. Debe manifestarse expresamente BAJO PROTESTA DE DECIR VERDAD que se desconocen su nombre y domicilio (art. 108, fr. II).'
        : datos.terceroInteresado || 'No se señaló.';

    return [
        '[MODO_REDACCION_PRO]',
        'Redacta una DEMANDA DE AMPARO INDIRECTO completa, lista para presentarse, conforme al plan aprobado por el abogado.',
        '',
        'DATOS DEL CASO',
        `- Persona quejosa: ${datos.quejoso}`,
        datos.domicilioQuejoso ? `- Domicilio para oír y recibir notificaciones: ${datos.domicilioQuejoso}` : '',
        datos.promovente ? `- Promueve en su nombre: ${datos.promovente} (debe acreditar su representación)` : '',
        `- Persona tercera interesada: ${tercero}`,
        `- Autoridades responsables:\n${datos.autoridades}`,
        `- Acto u omisión reclamado: ${datos.actoReclamado}`,
        '',
        'HECHOS RELATADOS POR LA PARTE QUEJOSA (fr. V) — ordénalos y numéralos sin inventar ninguno:',
        datos.hechos,
        '',
        datos.fechaConocimiento ? `- Fecha en que se conoció el acto: ${datos.fechaConocimiento}` : '',
        datos.estado ? `- Entidad: ${datos.estado}` : '',
        datos.urgencia === 'sin_plazo'
            ? '- Plazo: acto de los previstos en el art. 17, fr. IV — puede promoverse en cualquier tiempo.'
            : '- Plazo: genérico de quince días (art. 17).',
        `- Suspensión: ${datos.pideSuspension ? 'sí se solicita' : 'no se solicita'}`,
        datos.notas ? `- Notas del abogado: ${datos.notas}` : '',
        '',
        'PLAN APROBADO — sigue estos pasos en orden y no omitas ninguno:',
        lista,
        '',
        'ESTRUCTURA OBLIGATORIA DEL ESCRITO — respeta este orden y estos encabezados:',
        '1. PROEMIO. Órgano al que se dirige (Juez de Distrito en turno), nombre de la persona quejosa, domicilio para oír y recibir notificaciones, personalidad de quien promueve, y comparecencia a demandar el amparo y protección de la Justicia Federal.',
        '2. PERSONA TERCERA INTERESADA. Nombre y domicilio; si se desconocen, manifestarlo BAJO PROTESTA DE DECIR VERDAD.',
        '3. AUTORIDADES RESPONSABLES. Una por una, indicando su carácter de ordenadora o ejecutora.',
        '4. ACTO RECLAMADO. Lo que de CADA autoridad se reclama, por separado.',
        '5. BAJO PROTESTA DE DECIR VERDAD, HECHOS Y ABSTENCIONES. Encabeza el capítulo con la fórmula «Bajo protesta de decir verdad, manifiesto que los hechos y abstenciones que constan a la parte quejosa y que constituyen los antecedentes del acto reclamado son los siguientes:» y enumera los hechos con arábigos, en orden cronológico.',
        '6. PRECEPTOS CONSTITUCIONALES Y CONVENCIONALES VIOLADOS. Incluye siempre los artículos 103 y 107 constitucionales.',
        '7. CONCEPTOS DE VIOLACIÓN. Numerados, cada uno con premisa normativa, hecho y conclusión.',
        datos.pideSuspension ? '8. SUSPENSIÓN DEL ACTO RECLAMADO. Provisional y definitiva, con apariencia del buen derecho y peligro en la demora (arts. 125 a 158).' : '',
        '9. PRUEBAS.',
        '10. PETITORIOS.',
        '11. Lugar, fecha y espacio para firma.',
        '',
        'REGLAS INNEGOCIABLES',
        '- La demanda debe cumplir las OCHO fracciones del artículo 108 de la Ley de Amparo. Si falta una, el órgano previene conforme al artículo 114 y, de no subsanarse en cinco días, la demanda se tiene por NO PRESENTADA.',
        '- La protesta de decir verdad del capítulo de hechos es obligatoria y debe aparecer literalmente. La del tercero interesado también, cuando se desconozcan sus datos.',
        '- No inventes hechos, fechas, nombres ni domicilios. Lo que falte va entre corchetes, así: [PENDIENTE: domicilio de la autoridad ejecutora].',
        '- Cada tesis que cites debe llevar su registro digital. Si no tienes certeza de que exista, no la cites.',
        '- Al final, añade un apartado «REVISIÓN DE REQUISITOS (art. 108)» que enumere las ocho fracciones e indique en qué apartado del escrito quedó cubierta cada una.',
    ]
        .filter(Boolean)
        .join('\n');
}
